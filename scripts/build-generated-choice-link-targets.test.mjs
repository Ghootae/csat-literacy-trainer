import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTargets, FIXED_PATH } from './run-choice-link.mjs';
import { loadGenTargets, slotsOf, exampleItems, exampleDesign } from './run-item-generation.mjs';
import { main, toQuestions } from './build-generated-choice-link-targets.mjs';

const PID = 'fixture-passage', SET = 'setx';
const PARAS = ['첫째 문단이다. 법인은 독립된 권리를 가진다.', '둘째 문단이다. 재단 법인은 자산에 법인격이 부여된다.'];
const map = { passageId: PID, propositions: [{ id: 'P1-1', paragraphId: `${PID}-p1`, text: '명제1' }], nodes: [{ id: 'TOP', kind: 'TOP', paragraphId: null, text: '최상위', childIds: ['P1-1'] }], relations: [{ id: 'R1', fromId: 'P1-1', toId: 'TOP', name: '이름', note: '' }] };
const SLOTS = [{ slot: 1, realNumber: 10, stemPolarity: 'SELECT_INCORRECT', scope: 'PASSAGE_WIDE' }, { slot: 2, realNumber: 11, stemPolarity: 'SELECT_CORRECT', scope: 'CONCEPT' }];

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'genlink-')), p = n => join(dir, n), db = p('db');
  for (const d of ['questions', 'passages', 'dialogue']) mkdirSync(join(db, d), { recursive: true });
  writeFileSync(join(db, 'dialogue', `${PID}.json`), JSON.stringify({ passageId: PID, paragraphs: PARAS.map((text, i) => ({ paragraphId: `${PID}-p${i + 1}`, position: i + 1, text })) }));
  writeFileSync(join(db, 'questions', `${SET}.json`), JSON.stringify({ set_id: SET, questions: [] }));
  writeFileSync(join(db, 'passages', `${SET}.json`), JSON.stringify({ elements: [{ kind: 'paragraph', text: '문단' }, { kind: 'phrase', symbol: '㉠', style: 'underline', text: '밑줄 구간', start: 1, end: 2 }] }));
  writeFileSync(p('map.json'), JSON.stringify(map)); writeFileSync(p('stance.json'), JSON.stringify({ stances: [{ id: 'P1-1', kind: 'AUTHOR', holder: null }] }));
  writeFileSync(p('classify.json'), JSON.stringify({ items: [{ id: 'R1', type: 'CAUSE' }] }));
  writeFileSync(p('targets.json'), JSON.stringify([{ passageId: PID, passagesDir: join(db, 'dialogue'), mapPath: p('map.json'), stancePath: p('stance.json'), classifyPath: p('classify.json'), setId: SET,
    questionsPath: join(db, 'questions', `${SET}.json`), answersPath: p('answers.json'), assetsDir: db, slots: SLOTS }]));
  return { dir, targetsPath: p('targets.json'), out: p('out'), runsDir: p('out/runs') };
}
const withFixture = async fn => { const f = fixture(); try { return await fn(f); } finally { rmSync(f.dir, { recursive: true, force: true }); } };
const writeRuns = (f, mutate = () => {}) => {
  const t = loadGenTargets(f.targetsPath)[0];
  for (const cond of ['A', 'A2', 'B']) {
    const items = exampleItems(t, cond === 'A' ? null : exampleDesign(cond, t)); mutate(cond, items);
    mkdirSync(`${f.runsDir}/${cond}/${PID}`, { recursive: true }); writeFileSync(`${f.runsDir}/${cond}/${PID}/items.json`, JSON.stringify(items));
  }
};

test('toQuestions: slot number as question number, truth from polarity and answer, loadQuestion shape, polarity and answer checks', () => withFixture(f => {
  const t = loadGenTargets(f.targetsPath)[0], items = exampleItems(t), qs = toQuestions(items, slotsOf(t));
  assert.deepEqual(Object.keys(qs[0]), ['number', 'stem', 'supplementSegments', 'choices', 'answer', 'explanationSummary']);
  assert.deepEqual(qs.map(q => q.number), [1, 2]); assert.deepEqual(qs[0].supplementSegments, []); assert.equal(qs[0].explanationSummary, null);
  assert.deepEqual(qs[0].choices.map(c => c.truth), ['TRUE', 'TRUE', 'FALSE', 'TRUE', 'TRUE'], 'SELECT_INCORRECT: answer 3 is FALSE');
  assert.deepEqual(qs[1].choices.map(c => c.truth), ['FALSE', 'FALSE', 'TRUE', 'FALSE', 'FALSE'], 'SELECT_CORRECT: answer 3 is TRUE');
  assert.deepEqual(Object.keys(qs[0].choices[0]), ['number', 'text', 'truth', 'explanation']); assert.equal(qs[0].choices[0].explanation, null);
  const bad = structuredClone(items); bad.items[0].stem = '윗글에 대한 이해로 적절한 것은?';
  assert.throws(() => toQuestions(bad, slotsOf(t)), /POLARITY_MISMATCH: slot 1/u);
  const noAnswer = structuredClone(items); noAnswer.items[1].answer = 9;
  assert.throws(() => toQuestions(noAnswer, slotsOf(t)), /ANSWER_MISSING: slot 2/u);
  assert.throws(() => toQuestions({ items: [items.items[0]] }, slotsOf(t)), /ITEM_MISSING: slot 2/u);
}));

test('real build: one targets file per condition, same map/stance/classify paths, no answer record, run-choice-link loads it', () => withFixture(async f => {
  writeRuns(f);
  const r = await main({ targetsPath: f.targetsPath, runsDir: f.runsDir, out: f.out });
  assert.deepEqual(r.targetsFiles, ['A', 'A2', 'B'].map(c => `${f.out}/choice-link/targets-${c}.json`));
  const orig = JSON.parse(readFileSync(f.targetsPath, 'utf8'))[0];
  for (const c of ['A', 'A2', 'B']) {
    const [entry] = JSON.parse(readFileSync(`${f.out}/choice-link/targets-${c}.json`, 'utf8'));
    for (const k of ['passageId', 'passagesDir', 'mapPath', 'stancePath', 'classifyPath', 'setId', 'questionsPath']) assert.equal(entry[k], orig[k], k);
    assert.equal(entry.questionsJson, `${f.out}/choice-link/questions/${c}/${PID}.json`); assert.ok(!('answersPath' in entry) && !('assetsDir' in entry) && !('slots' in entry));
    const t = loadTargets(`${f.out}/choice-link/targets-${c}.json`, FIXED_PATH)[0];
    assert.deepEqual(t.questions.map(q => q.number), [1, 2]); assert.deepEqual(t.images, []); assert.ok(entry.questionsJson in t.protectedFiles);
    assert.equal(t.questions[0].choices.filter(x => x.truth === 'FALSE').length, 1);
  }
}));

test('real build stops when a generated file is missing or its stem polarity differs from the slot', () => withFixture(async f => {
  await assert.rejects(() => main({ targetsPath: f.targetsPath, runsDir: f.runsDir, out: f.out }), /GENERATED_MISSING/u);
  writeRuns(f, (cond, items) => { if (cond === 'B') items.items[0].stem = '윗글에 대한 이해로 적절한 것은?'; });
  await assert.rejects(() => main({ targetsPath: f.targetsPath, runsDir: f.runsDir, out: f.out }), /POLARITY_MISMATCH: slot 1/u);
}));

test('dry-run on the fixture: fake items, choice-link dry-run requests (1 per passage per condition), nothing under the real folder', () => withFixture(async f => {
  const r = await main({ dryRun: true, targetsPath: f.targetsPath, out: f.out });
  assert.equal(r.requests, 3); assert.equal(r.externalRequests, 0); assert.ok(r.perCondition.every(c => c.exampleAllPass && !c.overCap && !c.overMaxRequests));
  for (const c of ['A', 'A2', 'B']) assert.ok(existsSync(`${f.out}/choice-link/dry-run/${c}/${PID}/dry-run.request.json`));
  assert.ok(!existsSync(`${f.out}/choice-link/targets-A.json`));
  const req = JSON.parse(readFileSync(`${f.out}/choice-link/dry-run/A/${PID}/dry-run.request.json`, 'utf8'));
  assert.equal(JSON.parse(req.input[0].content[0].text).questions.length, 2);
}));

test('dry-run on the real targets: 12 requests (4 passages x 3 conditions), example outputs validate', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'genlink-real-'));
  try {
    const r = await main({ dryRun: true, out: dir });
    assert.equal(r.requests, 12); assert.equal(r.externalRequests, 0); assert.ok(r.perCondition.every(c => c.requests === 4 && c.exampleAllPass && !c.overCap && !c.overMaxRequests));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
