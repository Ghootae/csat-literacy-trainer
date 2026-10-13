import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as runner from './test-answer-path-sol.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, x) => writeFileSync(p, JSON.stringify(x));
const clone = structuredClone;
function mapFor(source) {
  return { questionId: source.questionId, stemPolarity: source.questionId === runner.IDS[0] ? 'NEGATIVE' : 'POSITIVE', answerChoiceId: source.answerChoiceId,
    choices: source.choices.map(c => ({ choiceId: c.choiceId, verdict: c.choiceId === source.answerChoiceId ? 'INAPPROPRIATE' : 'APPROPRIATE', depth: 3, coreElement: 'E5', nodes: [
      { id: 'n1', type: 'READ', operation: 'read', evidence: 'text', dependsOn: [], layer: 1, element: 'E5', outsideVocabulary: null },
      { id: 'n2', type: 'LINK', operation: 'link', evidence: 'text', dependsOn: ['n1'], layer: 2, element: null, outsideVocabulary: 'calculation' },
      { id: 'n3', type: 'APPLY', operation: 'apply', evidence: 'text', dependsOn: ['n2'], layer: 3, element: 'E6', outsideVocabulary: null },
    ] })) };
}
const source = { questionId: 'q', answerChoiceId: 'C1', choices: [{ choiceId: 'C1' }, { choiceId: 'C2' }] };
const wrongCase = { id: 'w', choiceId: 'C2', rationale: '상식적으로 말이 안 되니까 틀렸다.' };
function scoreFor(c, map) {
  const correct = c.choiceId === map.answerChoiceId;
  return { caseId: c.id, selectedChoiceId: c.choiceId, result: correct ? 'CORRECT' : 'WRONG_NO_RATIONALE', depth: correct ? 3 : null, tags: [],
    failedOperation: null, failedNodeId: null, failedElement: null, nodeElement: null, overrideQuote: null, candidates: [], studentQuote: c.rationale, reason: 'test' };
}
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'answer-path-sol-'));
  const raw = read(`${runner.DEFAULT_DIR}/cases.json`);
  // Contamination sentinels in non-allowlisted fields must never reach prepared model inputs.
  raw.cases.forEach(c => c.basis = 'BASIS_SENTINEL'); save(`${dir}/cases.json`, raw);
  save(`${dir}/reference-labels.json`, { labels: 'REFERENCE_LABEL_SENTINEL' });
  runner.prepare({ dir }); return dir;
}
const response = o => ({ id: 'fake', status: 'completed', model: runner.MODEL, usage: { input_tokens: 100, output_tokens: 50 }, output_text: JSON.stringify(o), output: [] });

test('guide sections are verbatim and superseded sections are excluded', () => {
  const guide = readFileSync('docs/review/answer-path-element-vocabulary-v0-2026-10-13.md', 'utf8');
  const rules = runner.rulesFromGuide(guide);
  assert.ok(rules.startsWith('## 어휘\n'));
  assert.ok(rules.includes(guide.slice(guide.indexOf('## v0.1 개정 규칙 (D-0121)\n'))));
  assert.ok(!rules.includes('## 추론 깊이(사슬 길이)'));
  for (const prompt of Object.values(runner.promptsFromGuide(guide))) assert.ok(prompt.endsWith(rules));
});
test('map layers, dependencies, cycles, single top APPLY, depth and vocabulary', () => {
  const map = mapFor(source); runner.validateMap(map, source);
  const mutations = [
    m => m.choices[0].nodes[1].layer = 1,
    m => m.choices[0].nodes[0].dependsOn = ['n3'],
    m => m.choices[0].nodes[1].dependsOn = ['missing'],
    m => m.choices[0].nodes[1].type = 'APPLY',
    m => m.choices[0].nodes[2].type = 'LINK',
    m => m.choices[0].nodes[2].dependsOn = ['n1'],
    m => m.choices[0].depth = 2,
    m => m.choices[0].nodes[0].element = 'E11',
    m => m.choices[0].nodes[0].outsideVocabulary = 'extra',
    m => m.choices[0].nodes[1].outsideVocabulary = null,
    m => m.choices[0].nodes[0].dependsOn = ['n1'],
    m => m.choices.push(clone(m.choices[0])),
  ];
  for (const mutate of mutations) { const m = clone(map); mutate(m); assert.throws(() => runner.validateMap(m, source)); }
});
test('score null rules and overrides follow selected map node', () => {
  const map = mapFor(source), c = wrongCase;
  const base = scoreFor(c, map); runner.validateScore(base, c, map);
  const confirmed = { ...base, result: 'WRONG', failedOperation: 'READ', failedNodeId: 'n1', failedElement: 'E5' };
  runner.validateScore(confirmed, c, map);
  const overridden = { ...confirmed, failedElement: 'E9', nodeElement: 'E5', overrideQuote: '상식적으로' };
  runner.validateScore(overridden, c, map);
  const undetermined = { ...base, result: 'WRONG', failedOperation: 'UNDETERMINED', candidates: [{ nodeId: 'n1', type: 'READ', element: 'E5', reason: 'ambiguous' }] };
  runner.validateScore(undetermined, c, map);
  runner.validateScore({ ...base, result: 'POLARITY_FAILURE', failedElement: 'E1' }, c, map);
  const goodCase = { ...c, choiceId: 'C1' }, correct = scoreFor(goodCase, map); runner.validateScore(correct, goodCase, map);
  for (const invalid of [
    { ...base, failedElement: 'E5' }, { ...base, tags: ['GUESS_STATED'] }, { ...base, depth: 3 },
    { ...confirmed, failedElement: 'E9' }, { ...confirmed, failedNodeId: 'absent' }, { ...confirmed, failedOperation: 'LINK' },
    { ...overridden, nodeElement: null }, { ...overridden, overrideQuote: '' }, { ...undetermined, candidates: [] },
    { ...correct, failedNodeId: 'n1' }, { ...correct, depth: 2 }, { ...confirmed, unexpected: true },
  ]) assert.throws(() => runner.validateScore(invalid, invalid.result === 'CORRECT' ? goodCase : c, map));
  const mismatched = { ...overridden, overrideQuote: 'not in rationale' };
  runner.validateScore(mismatched, c, map); // Citation mismatch is metric only.
  assert.deepEqual(runner.quoteChecks(mismatched, c.rationale).find(q => q.field === 'overrideQuote'), { field: 'overrideQuote', exact: false });
});
test('fieldwise majority, ties, tags sets and hand-calculated metrics', () => {
  const labels = [
    { result: 'CORRECT', failedOperation: null, failedElement: null, tags: ['RATIONALE_ERROR', 'GUESS_STATED'] },
    { result: 'WRONG', failedOperation: 'READ', failedElement: 'E5', tags: [] },
    { result: 'WRONG_NO_RATIONALE', failedOperation: null, failedElement: null, tags: [] },
    { result: 'WRONG', failedOperation: 'UNDETERMINED', failedElement: null, tags: [] },
  ];
  const outputs = [clone(labels[0]), clone(labels[1]), { ...labels[2], result: 'WRONG', failedOperation: 'APPLY', failedElement: 'E6' }, clone(labels[3])];
  const m = runner.metrics(labels, outputs);
  assert.deepEqual(m.result, { matched: 3, denominator: 4, rate: 0.75 });
  assert.deepEqual(m.failedOperation, { matched: 2, denominator: 2, rate: 1 });
  assert.deepEqual(m.failedElement, { matched: 1, denominator: 1, rate: 1 });
  assert.deepEqual(m.overclassification, { matched: 1, denominator: 2, rate: 0.5 });
  assert.deepEqual(m.tags, { matched: 1, denominator: 1, rate: 1 });
  assert.deepEqual(runner.majority([labels[0], { ...labels[0], tags: [...labels[0].tags].reverse() }, null]), { ...labels[0], tags: ['GUESS_STATED', 'RATIONALE_ERROR'] });
  assert.equal(runner.majority([labels[0], labels[1], labels[2]]).result, 'NO_MAJORITY');
  assert.equal(runner.majority([null, null, labels[1]]).result, 'NO_OUTPUT');
});
test('request and combined USD limits include unresolved reservations', () => {
  const request = { max_output_tokens: 3500 };
  assert.ok(runner.budgetCheck([], 'run', request) > 0);
  const starts = Array.from({ length: 6 }, (_, i) => ({ event: 'START', phase: 'map', requestId: String(i), reservedUsd: 0.01 }));
  assert.throws(() => runner.budgetCheck(starts, 'map', request), /request cap/);
  assert.throws(() => runner.budgetCheck(Array.from({ length: 120 }, (_, i) => ({ event: 'START', phase: 'run', requestId: String(i), reservedUsd: 0 })), 'run', request), /request cap/);
  assert.throws(() => runner.budgetCheck([{ event: 'START', phase: 'map', requestId: 'unknown', reservedUsd: 4.99 }], 'run', request), /USD cap/);
  assert.throws(() => runner.budgetCheck([{ event: 'END', costs: { conservativeUsd: 4.99 } }], 'run', request), /USD cap/);
});
test('fake transport: prepare -> map -> run -> report, no reference/basis/Codex leakage, frozen reuse', async () => {
  const dir = setup();
  try {
    assert.equal(runner.prepare({ dir }).externalRequests, 0);
    let calls = 0;
    const transport = { create: async request => {
      calls++;
      assert.equal(request.model, runner.MODEL); assert.equal(request.reasoning.effort, 'medium');
      const serialized = JSON.stringify(request);
      for (const marker of ['BASIS_SENTINEL', 'REFERENCE_LABEL_SENTINEL', 'CODEX_MAP_SENTINEL', 'referencePath', 'basis']) assert.ok(!serialized.includes(marker), marker);
      const data = JSON.parse(request.input[0].content[0].text);
      if (!data.student) { assert.equal(Object.keys(data).length, 1); return response(mapFor(data.question)); }
      assert.deepEqual(Object.keys(data.student).sort(), ['caseId', 'choiceId', 'rationale']);
      return response(scoreFor({ id: data.student.caseId, choiceId: data.student.choiceId, rationale: data.student.rationale }, data.map));
    } };
    assert.equal((await runner.generateMaps({ dir, transport })).completed, 2);
    const freeze = readFileSync(`${dir}/sol-maps/FROZEN.json`, 'utf8');
    await runner.generateMaps({ dir, transport }); assert.equal(calls, 2);
    assert.equal((await runner.run({ dir, transport })).completed, 105); assert.equal(calls, 107);
    await runner.run({ dir, transport }); assert.equal(calls, 107);
    const cases = read(`${dir}/prepared-cases.json`), sources = read(`${dir}/sources.json`);
    save(`${dir}/reference-labels.json`, { labels: cases.map(c => scoreFor(c, mapFor(sources[c.questionId]))) });
    const pilotDir = `${dir}/codex`; mkdirSync(pilotDir);
    for (const id of runner.IDS) save(`${pilotDir}/${id}.json`, { ...mapFor(sources[id]), sentinel: 'CODEX_MAP_SENTINEL' });
    const result = runner.report({ dir, pilotDir });
    assert.equal(result.completedCells, 105); assert.equal(result.majority.result.rate, 1); assert.equal(result.consistency.rate, 1);
    assert.equal(readFileSync(`${dir}/sol-maps/FROZEN.json`, 'utf8'), freeze);
    for (const name of ['REPORT.md', 'REVIEW.md', 'RESULTS.json']) assert.ok(readFileSync(`${dir}/${name}`).length > 100);
    rmSync(`${dir}/sol-maps/${runner.IDS[0]}.json`);
    await assert.rejects(runner.generateMaps({ dir, transport })); assert.equal(calls, 107);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('format failures retry at most twice, all raw attempts retained', async () => {
  const dir = setup();
  try {
    let calls = 0;
    const transport = { create: async request => { calls++; const { question } = JSON.parse(request.input[0].content[0].text); return response(calls <= 2 ? {} : mapFor(question)); } };
    const result = await runner.generateMaps({ dir, transport });
    assert.equal(result.completed, 2); assert.equal(calls, 4);
    const ledger = readFileSync(`${dir}/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(ledger.filter(e => e.event === 'START').length, 4);
    const raw = read(`${dir}/attempts/map-${runner.IDS[0]}-1.json`); assert.equal(raw.output_text, '{}');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('API errors stop without retry and unresolved usage is reserved', async () => {
  const dir = setup();
  try {
    let calls = 0;
    const result = await runner.generateMaps({ dir, transport: { create: async () => { calls++; throw Object.assign(new Error('do not expose headers'), { status: 503 }); } } });
    assert.equal(calls, 1); assert.match(result.stop, /API_ERROR/); assert.ok(result.unknownReservedUsd > 0);
    assert.ok(!readFileSync(`${dir}/requests.jsonl`, 'utf8').includes('do not expose headers'));
    await assert.rejects(runner.generateMaps({ dir, transport: { create: async () => assert.fail('no request') } }), /PRIOR_REQUESTS/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
