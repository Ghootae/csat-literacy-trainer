// D-0215 12: marks generated P1 items that reproduce an exam item of the same passage (choice text and situation). No external calls.
// Usage: node scripts/check-exam-overlap.mjs [--targets <json>] [--runs-dir <dir>] [--out <file>]
// Output quality/exam-overlap.json: per generated item the flags and the max-Dice tables. Flags are candidates; the code agent judges from the original text.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadQuestions } from './run-choice-link.mjs';
import { dice2, EXP_DIR, TARGETS_PATH } from './run-principle-pilot.mjs';

export const CHOICE_DICE_MIN = 0.6, SITUATION_DICE_MIN = 0.5;
export const FIXED_PATH = 'docs/experiments/sns-diagnostic-gold-2026-11-05/supplement-fixed.json';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const round3 = n => Math.round(n * 1000) / 1000;
const best = (text, pool) => pool.reduce((b, p) => { const d = dice2(text, p.text); return d > b.dice ? { dice: d, ...p } : b; }, { dice: 0, examNumber: null, where: null, text: null });

// exam: questions of loadQuestions (stem, supplementSegments, choices). gen: the P1 item; situation: its stage 2 output.
export function overlapFor(gen, situation, exam) {
  const choicePool = exam.flatMap(q => q.choices.map(c => ({ examNumber: q.number, where: `choice ${c.number}`, text: c.text })));
  const situationPool = exam.flatMap(q => [{ examNumber: q.number, where: 'stem', text: q.stem },
    ...(q.supplementSegments.some(s => s.kind === 'TEXT') ? [{ examNumber: q.number, where: 'bogi', text: q.supplementSegments.filter(s => s.kind === 'TEXT').map(s => s.text).join(' ') }] : [])]);
  const choiceMax = gen.choices.map(c => { const b = best(c.text, choicePool); return { number: c.number, max: round3(b.dice), examNumber: b.examNumber, examWhere: b.where, examText: b.text }; });
  const situationTexts = [['description', situation.situation.description], ...(situation.situation.bogiText ? [['bogiText', situation.situation.bogiText]] : [])];
  const situationMax = situationTexts.map(([field, text]) => { const b = best(text, situationPool); return { field, max: round3(b.dice), examNumber: b.examNumber, examWhere: b.where, examText: b.text }; });
  const flags = [...choiceMax.filter(c => c.max >= CHOICE_DICE_MIN).map(c => ({ flag: 'CHOICE_OVERLAP', choice: c.number, max: c.max, examNumber: c.examNumber, examWhere: c.examWhere })),
    ...situationMax.filter(s => s.max >= SITUATION_DICE_MIN).map(s => ({ flag: 'SITUATION_OVERLAP', field: s.field, max: s.max, examNumber: s.examNumber, examWhere: s.examWhere }))];
  return { flags, choiceMax, situationMax };
}

export function main({ targetsPath = TARGETS_PATH, runsDir = `${EXP_DIR}/runs`, out = `${EXP_DIR}/quality/exam-overlap.json`, fixedPath = FIXED_PATH } = {}) {
  const fixed = existsSync(fixedPath) ? readJson(fixedPath).items : [], items = [];
  for (const t of readJson(targetsPath)) {
    const exam = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, fixed).questions;
    for (const it of t.items) {
      const itemPath = `${runsDir}/${t.passageId}/item-${it.itemKey}.json`, sitPath = `${runsDir}/${t.passageId}/situation-${it.itemKey}.json`;
      if (!existsSync(itemPath) || !existsSync(sitPath)) { items.push({ passageId: t.passageId, itemKey: it.itemKey, missing: true, flags: [] }); continue; }
      items.push({ passageId: t.passageId, itemKey: it.itemKey, missing: false, examQuestions: exam.map(q => q.number), ...overlapFor(readJson(itemPath), readJson(sitPath), exam) });
    }
  }
  const result = { note: '표시는 후보일 뿐이다. 판정은 원문으로 한다.', thresholds: { choice: CHOICE_DICE_MIN, situation: SITUATION_DICE_MIN }, flagged: items.filter(i => i.flags.length).map(i => `${i.passageId}/${i.itemKey}`), items };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const r = main({ targetsPath: opt('--targets'), runsDir: opt('--runs-dir'), out: opt('--out') });
  console.log(JSON.stringify({ items: r.items.length, missing: r.items.filter(i => i.missing).length, flagged: r.flagged }, null, 2));
}
