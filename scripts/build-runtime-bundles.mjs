// Builds judge-input bundles (public question files, runtime reference, passage files) from suneung_db + trainer enrichment records.
// Read-only on inputs; no external requests. Handoff: docs/handoffs/2026-11-05-sns-diagnostic-runtime-bundles.md
// Usage: node scripts/build-runtime-bundles.mjs --config <json> --out <dir> [--db <dir>] [--records <dir>]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DB_ROOT = '/Users/mac/Projects/suneung_db/output';
export const RECORDS_DIR = '/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const bareLabel = label => (label ?? '').replace(/[()\s]/gu, '');

export function stemPolarity(stem) {
  return /적절하지\s*않은|않은\s*것은|틀린/u.test(stem) ? 'SELECT_INCORRECT' : 'SELECT_CORRECT';
}

export function answerChoiceId(correctChoice) {
  const n = Number(correctChoice);
  if (!Number.isInteger(n) || n < 1) throw new Error(`BAD_CORRECT_CHOICE: ${correctChoice}`);
  return `C${n}`;
}

export function officialExplanation(record) {
  const ex = record.official_explanation;
  if (!ex?.available || !ex.detailed_explanation_ko) throw new Error(`NO_EXPLANATION: q${record.question_number}`);
  const answer = Number(record.correct_choice);
  const choice = (ex.choice_explanations ?? []).find(c => Number(c.choice_number) === answer);
  if (!choice?.explanation_ko) throw new Error(`NO_CHOICE_EXPLANATION: q${record.question_number}`);
  return `${ex.detailed_explanation_ko}\n${choice.explanation_ko}`;
}

// Joined passage text (blank-line separated, section label lines for composite passages) with an offset map from DB full_text.
export function buildPassageText(set, sectionConfigs) {
  const multi = set.sections.length > 1;
  const paragraphs = [], notes = [], map = [];
  let text = '';
  for (const sec of [...set.sections].sort((a, b) => a.order - b.order)) {
    const cfg = multi ? sectionConfigs?.find(s => bareLabel(s.label) === bareLabel(sec.label)) : undefined;
    if (multi && !cfg) throw new Error(`SECTION_CONFIG_MISSING: ${sec.label}`);
    if (multi) text += (text ? '\n\n' : '') + sec.label;
    let n = 0;
    for (const para of [...sec.paragraphs].sort((a, b) => a.order - b.order)) {
      text += text ? '\n\n' : '';
      map.push({ dbStart: para.source_range.start, dbEnd: para.source_range.end, outStart: text.length });
      text += para.text;
      if (/^\s*\*/u.test(para.text)) { notes.push(para.text.trim()); continue; }
      n += 1;
      paragraphs.push({ idSuffix: multi ? `${cfg.idPrefix}-p${n}` : `p${n}`, text: para.text });
    }
  }
  return { text, map, paragraphs, notes };
}

function mapOffset(map, dbOffset, isEnd) {
  const m = map.find(x => (isEnd ? dbOffset > x.dbStart && dbOffset <= x.dbEnd : dbOffset >= x.dbStart && dbOffset < x.dbEnd));
  return m ? m.outStart + (dbOffset - m.dbStart) : -1;
}

function annotation(location, marker, style, text, start, end) {
  return { location, marker, style, start, end, text: text.slice(start, end), contextBefore: text.slice(Math.max(0, start - 24), start), contextAfter: text.slice(end, end + 24) };
}

export function buildBundles({ passageId, setId, questions, sections }, { dbRoot = DB_ROOT, recordsDir = RECORDS_DIR, outDir }) {
  const passagePath = `${dbRoot}/passages/${setId}.json`;
  const set = read(passagePath), qfile = read(`${dbRoot}/questions/${setId}.json`), records = read(`${recordsDir}/${setId}.json`);
  const issues = [];
  const passage = buildPassageText(set, sections);
  const passageAnnotations = [];
  // paragraph_block symbols such as (가)/(나) are section labels, already present as label lines in the passage text.
  for (const e of set.elements.filter(x => x.symbol && x.kind !== 'paragraph_block')) {
    if (set.full_text.slice(e.start, e.end) !== e.text) { issues.push({ passageId, location: 'PASSAGE', marker: e.symbol, problem: 'DB 범위 문자열이 원문과 다름', text: e.text }); continue; }
    const start = mapOffset(passage.map, e.start, false), end = mapOffset(passage.map, e.end, true);
    if (start < 0 || end < 0 || passage.text.slice(start, end) !== e.text) { issues.push({ passageId, location: 'PASSAGE', marker: e.symbol, problem: '지문 매핑 불일치', text: e.text }); continue; }
    passageAnnotations.push(annotation('PASSAGE', e.symbol, e.style ?? 'label', passage.text, start, end));
  }
  const publics = [], reference = [];
  for (const number of questions) {
    const q = qfile.questions.find(x => x.number === number);
    if (!q) throw new Error(`QUESTION_NOT_FOUND: ${setId} q${number}`);
    const rec = records.questions.find(x => Number(x.question_number) === number);
    if (!rec) throw new Error(`RECORD_NOT_FOUND: ${setId} q${number}`);
    const questionId = `${passageId}-q${number}`;
    const stem = q.prompt_blocks.filter(b => b.type === 'stem').map(b => b.text).join('\n');
    const supplements = q.prompt_blocks.filter(b => b.type === 'supplement');
    const scenario = supplements.map(b => b.text).join('\n');
    const annotations = [...passageAnnotations];
    const media = [];
    let offset = 0;
    supplements.forEach((block, supplementIndex) => {
      for (const e of block.elements.filter(x => x.symbol)) {
        if (block.text.slice(e.start, e.end) !== e.text) { issues.push({ questionId, location: 'SCENARIO', marker: e.symbol, problem: 'DB 범위 문자열이 원문과 다름', text: e.text }); continue; }
        annotations.push(annotation('SCENARIO', e.symbol, e.style ?? 'label', scenario, offset + e.start, offset + e.end));
      }
      for (const img of block.images ?? []) {
        const file = `${questionId}-${img.image_id}${extname(img.local_path)}`;
        mkdirSync(`${outDir}/media`, { recursive: true });
        copyFileSync(`${dbRoot}/${img.local_path}`, `${outDir}/media/${file}`);
        media.push({ mediaId: `MEDIA${media.length + 1}`, url: img.source_url, mimeType: img.mime_type, alt: img.alt_text ?? null, width: img.width, height: img.height, ...(img.sha256 ? { contentHash: img.sha256 } : {}), placement: { scope: 'SCENARIO', supplementIndex } });
      }
      offset += block.text.length + 1;
    });
    for (const b of q.prompt_blocks.filter(x => x.type !== 'supplement')) if ((b.images ?? []).length > 0) issues.push({ questionId, problem: `${b.type} 블록에 이미지가 있어 media로 옮기지 않음` });
    const choices = q.choices.map(c => ({ choiceId: `C${c.number}`, position: c.number, text: c.text }));
    publics.push({ questionId, questionNumber: number, passageId, title: set.exam.title, exam: set.exam.label, passage: passage.text, stem, scenario, media, choices, textAnnotations: annotations });
    reference.push({ schemaVersion: 'source-direct-problem-reference-v1', questionId, stemPolarity: stemPolarity(stem), answerChoiceId: answerChoiceId(rec.correct_choice), officialExplanation: officialExplanation(rec) });
  }
  const passageFile = { schemaVersion: 'dialogue-passage-v1', passageId, title: set.exam.title, exam: set.exam.label, questionRange: set.exam.question_range,
    problemQuestionId: `${passageId}-q${questions[0]}`, source: { status: 'exact-local-source', sourceId: setId, sourcePath: passagePath },
    notes: [...passage.notes, `연결 문항 전체: ${questions.map(n => `${passageId}-q${n}`).join(', ')}`],
    paragraphs: passage.paragraphs.map((p, i) => ({ paragraphId: `${passageId}-${p.idSuffix}`, position: i + 1, text: p.text })) };
  return { publics, reference, passageFile, issues };
}

export function buildAll(entries, opts) {
  const reference = [], issues = [];
  for (const entry of entries) {
    const r = buildBundles(entry, opts);
    for (const p of r.publics) writeJson(`${opts.outDir}/public/${p.questionId}.json`, p);
    writeJson(`${opts.outDir}/passages/${entry.passageId}.json`, r.passageFile);
    reference.push(...r.reference); issues.push(...r.issues);
  }
  writeJson(`${opts.outDir}/runtime-reference.json`, { schemaVersion: 'source-direct-problem-reference-catalog-v1', questions: reference });
  return { questionCount: reference.length, passageCount: entries.length, issues };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const config = opt('--config'), out = opt('--out');
  if (!config || !out) throw new Error('Usage: node scripts/build-runtime-bundles.mjs --config <json> --out <dir>');
  const entries = read(resolve(config));
  const result = buildAll(entries, { outDir: resolve(out), dbRoot: opt('--db') ?? DB_ROOT, recordsDir: opt('--records') ?? RECORDS_DIR });
  console.log(JSON.stringify({ out: basename(resolve(out)), ...result }, null, 2));
  if (result.issues.length > 0) process.exitCode = 2;
}
