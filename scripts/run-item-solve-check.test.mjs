import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONFIGS } from './lib/provider-adapter.mjs';
import { loadGenTargets, slotsOf, exampleItems, exampleDesign } from './run-item-generation.mjs';
import { main, displayParagraphs, shuffledOrder, buildInput, buildRequest, reserveUsd, costUsd, evaluate, MODELS, SOURCES, MODES, SCHEMAS, INSTRUCTIONS, FIXED_PATH } from './run-item-solve-check.mjs';

const PID = 'fixture-passage', SET = 'setx';
const PARAS = ['첫째 문단이다. 법인은 독립된 권리를 가진다. 둘째 문장도 있다.', '둘째 문단이다. 재단 법인은 자산에 법인격이 부여된다.', '셋째 문단이다. 사단 법인은 구성원 단체에 법인격이 부여된다.'];
const map = { passageId: PID, propositions: [{ id: 'P1-1', paragraphId: `${PID}-p1`, text: '명제1' }], nodes: [{ id: 'TOP', kind: 'TOP', paragraphId: null, text: '최상위', childIds: ['P1-1'] }], relations: [{ id: 'R1', fromId: 'P1-1', toId: 'TOP', name: '이름', note: '' }] };
const SLOTS = [{ slot: 1, realNumber: 10, stemPolarity: 'SELECT_INCORRECT', scope: 'PASSAGE_WIDE' }, { slot: 2, realNumber: 11, stemPolarity: 'SELECT_CORRECT', scope: 'CONCEPT' }];
const REAL = { 10: { stem: '실제 윗글에 대한 이해로   적절하지 않은 것은?', answer: 3 }, 11: { stem: '실제 재단 법인을 이해한 내용으로 가장 적절한 것은?', answer: 2 } };
const realChoices = n => [1, 2, 3, 4, 5].map(i => ({ number: i, label: '', text: `실제 ${n}번 문항의  ${i}번 선지` }));

function fixture({ polarity10 = '적절하지 않은' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'solve-')), p = n => join(dir, n), db = p('db');
  for (const d of ['questions', 'passages', 'dialogue']) mkdirSync(join(db, d), { recursive: true });
  writeFileSync(join(db, 'dialogue', `${PID}.json`), JSON.stringify({ passageId: PID, paragraphs: PARAS.map((text, i) => ({ paragraphId: `${PID}-p${i + 1}`, position: i + 1, text })) }));
  writeFileSync(p('map.json'), JSON.stringify(map)); writeFileSync(p('stance.json'), JSON.stringify({ stances: [{ id: 'P1-1', kind: 'AUTHOR', holder: null }] }));
  writeFileSync(p('classify.json'), JSON.stringify({ items: [{ id: 'R1', type: 'CAUSE' }] }));
  const dbq = (number, stem) => ({ number, source_title: '제목', source_tags: [], prompt_blocks: [{ type: 'stem', order: 1, text: stem, elements: [], images: [] }], choices: realChoices(number) });
  writeFileSync(join(db, 'questions', `${SET}.json`), JSON.stringify({ set_id: SET, questions: [dbq(10, REAL[10].stem.replace('적절하지 않은', polarity10)), dbq(11, REAL[11].stem), dbq(12, '윗글에 대한 설명으로 적절한 것은?')] }));
  const at = PARAS[0].indexOf('법인은');
  writeFileSync(join(db, 'passages', `${SET}.json`), JSON.stringify({ sections: [{ paragraphs: PARAS.map((text, i) => ({ paragraph_id: `p${i + 1}`, text,
    annotations: i === 0 ? [{ annotation_id: 'a1', marker: '㉠', start: at, end: at + 3, text: '법인은', style: 'underline' }] : i === 1 ? [{ annotation_id: 'a2', marker: null, start: 0, end: 2, text: '둘째', style: 'box' }] : [] })) }] }));
  writeFileSync(p('answers.json'), JSON.stringify({ questions: [{ question_number: 10, correct_choice: 3 }, { question_number: 11, correct_choice: 2 }, { question_number: 12, correct_choice: 1 }] }));
  writeFileSync(p('fixed.json'), JSON.stringify({ items: [] }));
  writeFileSync(p('targets.json'), JSON.stringify([{ passageId: PID, passagesDir: join(db, 'dialogue'), mapPath: p('map.json'), stancePath: p('stance.json'), classifyPath: p('classify.json'), setId: SET,
    questionsPath: join(db, 'questions', `${SET}.json`), answersPath: p('answers.json'), assetsDir: db, slots: SLOTS }]));
  return { dir, targetsPath: p('targets.json'), fixedPath: p('fixed.json'), out: p('out'), generatedDir: p('gen') };
}
const withFixture = async (fn, opts) => { const f = fixture(opts); try { return await fn(f); } finally { rmSync(f.dir, { recursive: true, force: true }); } };
const common = f => ({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: f.out, generatedDir: f.generatedDir });
const userInput = req => JSON.parse(req.input[0].content[0].text);
const listRequests = dir => readdirSync(dir, { recursive: true }).filter(n => n.endsWith('.request.json')).map(n => [n, JSON.parse(readFileSync(join(dir, n), 'utf8'))]);

test('display paragraphs: marker before an underlined phrase, [ ] around a boxed phrase; wrong offsets and overlaps stop', () => {
  const para = (text, annotations) => ({ sections: [{ paragraphs: [{ paragraph_id: 'p', text, annotations }] }] });
  const ann = (start, end, text, extra) => ({ annotation_id: `a${start}`, start, end, text, ...extra });
  assert.deepEqual(displayParagraphs(para('가나다라마바', [ann(0, 2, '가나', { marker: null, style: 'box' }), ann(3, 5, '라마', { marker: '㉠', style: 'underline' })])), ['[가나]다㉠라마바']);
  assert.throws(() => displayParagraphs(para('가나다', [ann(0, 2, '다다', { marker: null, style: 'box' })])), /ANNOTATION_MISMATCH/u);
  assert.throws(() => displayParagraphs(para('가나다라', [ann(0, 3, '가나다', { marker: 'ⓐ', style: 'underline' }), ann(2, 4, '다라', { marker: '㉠', style: 'underline' })])), /ANNOTATION_OVERLAP/u);
});

test('shuffle: fixed per passage, a permutation, independent of source and model', () => {
  const a = shuffledOrder('p1', 5);
  assert.deepEqual(a, shuffledOrder('p1', 5)); assert.deepEqual([...a].sort(), [0, 1, 2, 3, 4]);
  assert.ok(new Set(Array.from({ length: 8 }, (_, i) => shuffledOrder(`p${i}`, 5).join())).size > 1, 'different passages shuffle differently');
});

test('models: three solve models; v4-pro shared through the adapter; cost uses off-peak price for DeepSeek outside peak hours', () => {
  assert.deepEqual(Object.keys(MODELS), ['gpt-6-luna', 'gemini-3.8-flash-medium', 'deepseek-v4-pro-high']);
  assert.equal(CONFIGS['deepseek-v4-pro-high'].model, 'deepseek-v4-pro'); assert.equal(CONFIGS['deepseek-v4-pro-high'].reasoningEffort, 'high');
  assert.deepEqual(CONFIGS['deepseek-v4-pro-high'].prices, { peak: { input: 1.32, cached: 0.044, output: 3.96 }, offPeak: { input: 0.66, cached: 0.022, output: 1.98 } });
  const usage = { input_tokens: 1e6, output_tokens: 1e6 };
  assert.equal(costUsd('deepseek-v4-pro-high', usage, '2026-11-07T12:00:00Z'), 0.66 + 1.98, 'Saturday: off-peak');
  assert.equal(costUsd('deepseek-v4-pro-high', usage, '2026-11-06T02:00:00Z'), 1.32 + 3.96, 'Friday 02 UTC: peak');
  assert.equal(costUsd('gpt-6-luna', usage, '2026-11-06T02:00:00Z'), 0.10 + 0.50);
  assert.equal(costUsd('gemini-3.8-flash-medium', usage, '2026-11-06T02:00:00Z'), 0.75 + 3.75);
});

test('exam baseline: polarity of each slot is checked against the exam stem; stops on mismatch', () => withFixture(async f => {
  await assert.rejects(() => main({ dryRun: true, ...common(f) }), /POLARITY_MISMATCH: fixture-passage slot 1 \(exam 10\): SELECT_CORRECT != SELECT_INCORRECT/u);
}, { polarity10: '적절한' }));

test('dry-run: 4 sources x 3 models x 2 modes per passage, requests carry no source name, key, exam number; same format and order for every source', () => withFixture(async f => {
  const r = await main({ dryRun: true, ...common(f) });
  assert.equal(r.requests, 24); assert.equal(r.externalRequests, 0);
  const reqs = listRequests(f.out + '/dry-run/solve');
  assert.equal(reqs.length, 24);
  for (const [name, req] of reqs) {
    const s = JSON.stringify(req);
    assert.ok(!/realNumber|"key"|"source"|"A2"|"REAL"/u.test(s), `${name}: no source name or exam number`);
    assert.ok(!/"answer"|"slot"|truth/u.test(JSON.stringify(userInput(req))), `${name}: no answer key or slot in input`);
    for (const k of Object.keys(userInput(req))) assert.ok(['passage', 'questions'].includes(k), name);
    assert.equal(name.includes('NO_PASSAGE'), !('passage' in userInput(req)), name);
  }
  const byName = n => reqs.find(([x]) => x.startsWith(n))[1];
  const real = userInput(byName(`REAL/${PID}/gpt-6-luna.WITH_PASSAGE`)), gen = userInput(byName(`A/${PID}/gpt-6-luna.WITH_PASSAGE`)), b = userInput(byName(`B/${PID}/gpt-6-luna.WITH_PASSAGE`));
  assert.deepEqual(real.passage, gen.passage); assert.deepEqual(gen, b, 'generated sources with the same fake items are identical');
  assert.deepEqual(Object.keys(real.questions[0]), Object.keys(gen.questions[0])); assert.deepEqual(real.questions.map(q => q.questionId), ['Q1', 'Q2']);
  assert.match(real.questions.map(q => q.stem).join('|'), /실제 윗글에 대한 이해로 적절하지 않은 것은\?/u, 'whitespace normalized');
  assert.ok(real.questions[0].choices.every((c, i) => c.startsWith('①②③④⑤'[i] + ' ')));
  assert.match(real.passage.paragraphs[0].text, /㉠법인은/u); assert.match(real.passage.paragraphs[1].text, /^\[둘째\]/u);
  const order = shuffledOrder(PID, 2); assert.equal(real.questions[0].stem.includes(order[0] === 0 ? '윗글에 대한' : '재단 법인'), true);
  const sameOrder = ['gemini-3.8-flash-medium.NO_PASSAGE', 'deepseek-v4-pro-high.WITH_PASSAGE'].map(n => userInput(byName(`REAL/${PID}/${n}`)).questions.map(q => q.stem).join('|'));
  assert.equal(sameOrder[0], sameOrder[1]);
  const luna = byName(`REAL/${PID}/gpt-6-luna.NO_PASSAGE`), gem = byName(`REAL/${PID}/gemini-3.8-flash-medium.NO_PASSAGE`), ds = byName(`REAL/${PID}/deepseek-v4-pro-high.NO_PASSAGE`);
  assert.equal(luna.model, 'gpt-6-luna'); assert.deepEqual(luna.reasoning, { effort: 'medium' }); assert.equal(gem.model, 'gemini-3.8-flash'); assert.equal(ds.model, 'deepseek-v4-pro');
  assert.ok(!('reasoning' in gem) && !('reasoning' in ds));
  assert.ok(r.totalReserveUsd > 0 && r.rows.every(x => x.reserveUsd > 0));
}));

// Fake solver: knows the key of every question text. `wrong` models answer a wrong number; `bad` adds a quote that is not in the passage and marks every choice TRUE.
const KEYS = new Map();
const solver = (modelName, behaviors) => ({ calls: 0, async create(request) {
  const input = userInput(request), withPassage = 'passage' in input, b = behaviors[modelName] ?? {};
  const answers = input.questions.map(q => {
    const known = KEYS.get(q.stem + q.choices.join()), key = known.answer, wrongAnswer = key === 5 ? 1 : key + 1, ans = b.wrong?.(known) ? wrongAnswer : key;
    if (!withPassage) return { questionId: q.questionId, answer: b.noPassageWrong ? wrongAnswer : key };
    return { questionId: q.questionId, answer: ans, choices: [1, 2, 3, 4, 5].map(n => {
      const verdict = b.allTrue ? 'TRUE' : (known.polarity === 'SELECT_INCORRECT') === (n === key) ? 'FALSE' : 'TRUE';
      return { number: n, verdict, evidenceQuote: verdict === 'FALSE' ? (b.fakeQuote ? '지문에 없는 가짜 구절' : '법인은 독립된 권리를 가진다') : '' };
    }) };
  });
  this.calls++;
  return { id: `r${this.calls}`, model: request.model, status: 'completed', output_text: JSON.stringify({ answers }), usage: { input_tokens: 2000, output_tokens: 800 } };
} });

test('full run with fake transports: signals per question, baseline rates, files per (source, passage, model, mode), RUN_EXISTS, protected files', () => withFixture(async f => {
  const t = loadGenTargets(f.targetsPath)[0];
  for (const cond of ['A', 'A2', 'B']) {
    const items = exampleItems(t, cond === 'A' ? null : exampleDesign(cond, t)); mkdirSync(`${f.generatedDir}/${cond}/${PID}`, { recursive: true });
    writeFileSync(`${f.generatedDir}/${cond}/${PID}/items.json`, JSON.stringify(items));
    for (const it of items.items) KEYS.set(it.stem + it.choices.map((c, i) => `${'①②③④⑤'[i]} ${c.text}`).join(), { answer: it.answer, polarity: it.stemPolarity });
  }
  for (const n of [10, 11]) KEYS.set(REAL[n].stem.replace(/\s+/gu, ' ') + realChoices(n).map((c, i) => `${'①②③④⑤'[i]} ${c.text.replace(/\s+/gu, ' ')}`).join(), { answer: REAL[n].answer, polarity: n === 10 ? 'SELECT_INCORRECT' : 'SELECT_CORRECT', exam: n });
  // Exam slot 1 (key 3, SELECT_INCORRECT): luna and gemini answer wrong -> defect candidate; deepseek answers it right. Generated sources: nobody wrong.
  const examSlot1 = k => k.exam === 10;
  const behaviors = { 'gpt-6-luna': { wrong: examSlot1 }, 'gemini-3.8-flash-medium': { fakeQuote: true, wrong: examSlot1 }, 'deepseek-v4-pro-high': { noPassageWrong: true } };
  const transports = Object.fromEntries(Object.keys(MODELS).map(m => [m, solver(m, behaviors)]));
  const r = await main({ ...common(f), transports });
  assert.equal(r.requests, 24); assert.equal(r.stop, null); assert.equal(r.protectedFilesUnchanged, true);
  for (const source of SOURCES) for (const model of Object.keys(MODELS)) for (const mode of MODES)
    for (const ext of ['.raw.json', '.json', '.validation.json']) assert.ok(existsSync(`${f.out}/solve/${source}/${PID}/${model}.${mode}${ext}`), `${source}/${model}.${mode}${ext}`);
  const real = r.summary.bySource.REAL, a = r.summary.bySource.A;
  assert.equal(real.questions, 2);
  assert.deepEqual(real.accuracyWithPassage['gpt-6-luna'], { answered: 2, correct: 1, rate: 0.5 }); assert.deepEqual(real.accuracyWithPassage['deepseek-v4-pro-high'], { answered: 2, correct: 2, rate: 1 });
  assert.deepEqual(real.accuracyNoPassage['deepseek-v4-pro-high'], { answered: 2, correct: 0, rate: 0 }); assert.deepEqual(real.accuracyNoPassage['gpt-6-luna'], { answered: 2, correct: 2, rate: 1 });
  assert.equal(real.signalCounts.SOLVE_MISMATCH_DEFECT_CANDIDATE, 1); assert.equal(real.signalRates.SOLVE_MISMATCH_DEFECT_CANDIDATE, 0.5);
  assert.equal(r.summary.realReliabilityTrigger, false);
  assert.equal(real.signalCounts.NO_PASSAGE_ALL_CORRECT, 0, 'deepseek answers wrong without the passage');
  assert.equal(real.signalCounts.EVIDENCE_NOT_IN_PASSAGE_ANY_MODEL, 2, 'gemini quotes a sentence that is not in the passage');
  assert.equal(a.signalCounts.SOLVE_MISMATCH_DEFECT_CANDIDATE, 0); assert.equal(a.accuracyWithPassage['gemini-3.8-flash-medium'].rate, 1);
  const q1 = r.summary.perQuestion.find(x => x.source === 'REAL' && x.slot === 1);
  assert.deepEqual(q1.signals.SOLVE_MISMATCH, { models: ['gpt-6-luna', 'gemini-3.8-flash-medium'], count: 2, defectCandidate: true });
  assert.deepEqual(q1.signals.EVIDENCE_NOT_IN_PASSAGE.models, ['gemini-3.8-flash-medium']); assert.deepEqual(q1.signals.MULTI_OR_NONE.models, []);
  const run = JSON.parse(readFileSync(`${f.out}/solve/RUN.json`, 'utf8'));
  assert.equal(run.requests, 24); assert.equal(run.retries, 0); assert.equal(run.reasoning['deepseek-v4-pro-high'], 'high'); assert.equal(run.models['deepseek-v4-pro-high'].model, 'deepseek-v4-pro');
  const ledger = readFileSync(`${f.out}/solve/ledger.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(x => x.event === 'START').length, 24); assert.ok(ledger.filter(x => x.event === 'START').every(x => Array.isArray(x.questionOrder)));
  await assert.rejects(() => main({ ...common(f), transports }), /RUN_EXISTS/u);
}));

test('MULTI_OR_NONE: verdict candidates other than exactly one; evidence check ignores whitespace; limits stop the run', () => {
  const questions = [{ slot: 1, stemPolarity: 'SELECT_INCORRECT', key: 2 }, { slot: 2, stemPolarity: 'SELECT_CORRECT', key: 1 }];
  const ch = (verdicts, quote = '근거 구절') => verdicts.map((verdict, i) => ({ number: i + 1, verdict, evidenceQuote: verdict === 'FALSE' ? quote : '' }));
  const parsed = { answers: [{ questionId: 'Q1', answer: 2, choices: ch(['TRUE', 'FALSE', 'TRUE', 'FALSE', 'TRUE']) }, { questionId: 'Q2', answer: 1, choices: ch(['FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE'], '근거  구절') }] };
  const ev = evaluate('WITH_PASSAGE', parsed, [1, 2], questions, ['여기에 근거 구절이 있다'], []);
  assert.deepEqual(ev.bySlot[1], { answer: 2, correct: true, candidates: [2, 4], multiOrNone: true, evidenceNotInPassage: [] });
  assert.deepEqual(ev.bySlot[2], { answer: 1, correct: true, candidates: [], multiOrNone: true, evidenceNotInPassage: [] });
  assert.equal(evaluate('WITH_PASSAGE', parsed, [1, 2], questions, ['다른 글'], []).bySlot[1].evidenceNotInPassage.join(), '2,4');
  assert.deepEqual(evaluate('NO_PASSAGE', { answers: [{ questionId: 'Q1', answer: 3 }] }, [1, 2], questions, [], []), { bySlot: { 1: { answer: 3, correct: false } }, missing: [2] });
  assert.throws(() => evaluate('NO_PASSAGE', { answers: [{ questionId: 'Q9', answer: 3 }] }, [1, 2], questions, [], []), /QUESTION_ID/u);
});

test('limits: max requests and usd cap stop the run before sending', () => withFixture(async f => {
  const t = loadGenTargets(f.targetsPath)[0];
  for (const cond of ['A', 'A2', 'B']) { mkdirSync(`${f.generatedDir}/${cond}/${PID}`, { recursive: true }); writeFileSync(`${f.generatedDir}/${cond}/${PID}/items.json`, JSON.stringify(exampleItems(t))); }
  const sent = [], transports = Object.fromEntries(Object.keys(MODELS).map(m => [m, { async create(req) { sent.push(req.model); return { status: 'completed', output_text: '{"answers":[]}', usage: { input_tokens: 10, output_tokens: 10 } }; } }]));
  const r = await main({ ...common(f), transports, limits: { maxRequests: 3, usdCap: 8 } });
  assert.equal(r.requests, 3); assert.equal(r.stop, 'RUN_LIMIT: max requests'); assert.equal(sent.length, 3);
  assert.equal(r.outcomes.filter(o => o.requestStatus === 'NOT_SENT').length, 21);
}));

test('missing generated items stop a real run before any request; instructions and schemas exist for both modes', () => withFixture(async f => {
  await assert.rejects(() => main({ ...common(f), transports: {} }), /GENERATED_MISSING/u);
  assert.deepEqual(MODES, ['WITH_PASSAGE', 'NO_PASSAGE']); for (const m of MODES) { assert.ok(INSTRUCTIONS[m].length > 100); assert.equal(SCHEMAS[m].json.type, 'object'); }
  assert.ok(FIXED_PATH.endsWith('supplement-fixed.json'));
  const { input } = buildInput('NO_PASSAGE', [], [{ slot: 1, stem: 's', choices: [{ number: 1, text: 't' }], key: 1 }], PID);
  assert.ok(reserveUsd('gpt-6-luna', buildRequest('gpt-6-luna', 'NO_PASSAGE', input)) > 0);
}));

test('real dry-run: 96 requests, exam baseline loads for all 4 passages with polarity matching the slot table', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'solve-real-'));
  try {
    const r = await main({ dryRun: true, out: dir });
    assert.equal(r.requests, 96); assert.equal(r.externalRequests, 0); assert.equal(r.overCap, false); assert.equal(r.overMaxRequests, false);
    assert.equal(r.rows.filter(x => x.source === 'REAL').length, 24);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
