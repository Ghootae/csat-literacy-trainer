import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Read-only audit by default. --patch emits an apply_patch document; it never writes fixtures.
const db = resolve(process.argv.find(x => x.startsWith('--db='))?.slice(5) ?? '/Users/mac/Projects/suneung_db/output');
const root = 'packages/pipeline/fixtures/experiments';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const normalize = text => {
  const chars = [], positions = [];
  for (let i = 0; i < text.length; i++) {
    if (/[\s‘’“”'"ⓐ-ⓩ㉠-㉻]/u.test(text[i])) continue;
    chars.push(text[i]); positions.push(i);
  }
  return { text: chars.join(''), positions };
};
function project(raw, target, start, end, text) {
  if (raw.slice(start, end) !== text) throw new Error(`DB 범위 불일치: ${text}`);
  const n = normalize(raw), t = normalize(target);
  const a = n.positions.findIndex(x => x >= start), b = n.positions.findIndex(x => x >= end);
  const stop = b < 0 ? n.text.length : b;
  for (const margin of [8, 20, 40, 80]) {
    const left = Math.max(0, a - margin), right = Math.min(n.text.length, stop + margin);
    const context = n.text.slice(left, right);
    const found = t.text.indexOf(context);
    if (found < 0 || t.text.indexOf(context, found + 1) !== -1) continue;
    const mappedStart = t.positions[found + a - left], mappedEnd = t.positions[found + stop - left - 1] + 1;
    if (normalize(target.slice(mappedStart, mappedEnd)).text !== normalize(text).text) throw new Error('매핑 내용 불일치');
    return { start: mappedStart, end: mappedEnd, text: target.slice(mappedStart, mappedEnd) };
  }
  throw new Error(`문맥으로 유일하게 매핑할 수 없음: ${text}`);
}
const rows = [], patches = [];
const linked = readdirSync(`${root}/dialogue/passages`).filter(f => f.endsWith('.json'))
  .map(f => read(`${root}/dialogue/passages/${f}`)).filter(x => x.problemQuestionId);
for (const linkedPassage of linked) {
  const id = linkedPassage.problemQuestionId;
  // Only the source ID is read from historical metadata, never semantic gold.
  const sourceId = read(`${root}/problem-solving/${id}.json`).source.sourceId;
  const path = `${root}/problem-solving/public/${id}.json`, before = readFileSync(path, 'utf8'), content = JSON.parse(before);
  const passagePath = `${db}/passages/${sourceId}.json`, questionPath = `${db}/questions/${sourceId}.json`;
  const passage = read(passagePath), question = read(questionPath).questions.find(q => q.number === content.questionNumber);
  if (!question) throw new Error(`문항 없음: ${id}`);
  const supplements = question.prompt_blocks.filter(b => b.type === 'supplement');
  if (supplements.length !== 1) throw new Error(`보기 수 검토 필요: ${id}`);
  const supplement = supplements[0];
  const changes = [];
  if (id === 'gongsun-long-later-mohists-q12') {
    const corrected = content.scenario.replace('옷장 안에 ⓒ옷이 이렇게 많은데 무슨 옷이 없어?', '옷장 안에 옷이 이렇게 많은데 무슨 ⓒ옷이 없어?');
    if (corrected !== content.scenario) changes.push('ⓒ를 새 DB의 무슨 옷이 없어 위치로 복원');
    content.scenario = corrected;
  }
  const annotations = [], audit = [];
  function collect(location, raw, elements, target) {
    for (const e of elements) {
      if (!e.symbol) continue;
      const span = project(raw, target, e.start, e.end, e.text);
      annotations.push({ location, marker: e.symbol, style: e.style ?? 'label', ...span,
        contextBefore: target.slice(Math.max(0, span.start - 24), span.start), contextAfter: target.slice(span.end, span.end + 24) });
      audit.push({ location, marker: e.symbol, sourceStart: e.start, sourceEnd: e.end, sourceText: e.text,
        sourceContext: raw.slice(Math.max(0, e.start - 24), e.end + 24), ...span });
    }
  }
  collect('PASSAGE', passage.full_text, passage.elements, content.passage);
  collect('SCENARIO', supplement.text, supplement.elements, content.scenario);
  // Explicit paragraph labels in the source text, not inferred referents (e.g. the three drug entries).
  for (const e of supplement.elements.filter(e => e.kind === 'paragraph')) {
    const match = /^(\([가-힣]\))\s+/u.exec(e.text);
    if (!match) continue;
    const start = e.start + match[0].length;
    const text = supplement.text.slice(start, e.end);
    const span = project(supplement.text, content.scenario, start, e.end, text);
    annotations.push({ location: 'SCENARIO', marker: match[1], style: 'label', ...span,
      contextBefore: content.scenario.slice(Math.max(0, span.start - 24), span.start), contextAfter: content.scenario.slice(span.end, span.end + 24) });
    audit.push({ location: 'SCENARIO', marker: match[1], sourceStart: start, sourceEnd: e.end, sourceText: text, ...span });
  }
  content.textAnnotations = annotations;
  rows.push({ questionId: id, sourceId, sourceFiles: { passage: { path: `passages/${sourceId}.json`, sha256: sha(passagePath) },
    question: { path: `questions/${sourceId}.json`, sha256: sha(questionPath) } },
    inlineCorrections: changes, annotations: audit });
  const after = JSON.stringify(content, null, 2) + '\n';
  if (after !== before) patches.push(`*** Update File: ${path}\n@@\n${before.trimEnd().split('\n').map(x => '-' + x).join('\n')}\n${after.trimEnd().split('\n').map(x => '+' + x).join('\n')}`);
}
const report = { scope: 'UI-linked questions; passage and scenario markers only', dbRoot: db,
  questionCount: rows.length, annotationCount: rows.reduce((n, r) => n + r.annotations.length, 0), rows };
if (process.argv.includes('--patch')) {
  const auditPath = 'docs/experiments/problem-source-markers-2026-10-02/audit.json';
  patches.push(`*** Add File: ${auditPath}\n${(JSON.stringify(report, null, 2) + '\n').trimEnd().split('\n').map(x => '+' + x).join('\n')}`);
  console.log('*** Begin Patch\n' + patches.join('\n') + '\n*** End Patch');
} else console.log(JSON.stringify(report, null, 2));
