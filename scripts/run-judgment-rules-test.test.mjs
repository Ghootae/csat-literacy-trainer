import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCell, runAll, dryReport, selftest } from './run-judgment-rules-test.mjs';
import { buildSet, loadWorld, cellLabel, MRNA_EVENTS, SET_NAMES } from './judgment-rules-test-cases.mjs';
import { summarizeCells, toMarkdown, matches } from './summarize-judgment-rules-test.mjs';

const world = loadWorld();
const sets = Object.fromEntries(SET_NAMES.map(n => [n, buildSet(n, world)]));
const tmp = () => mkdtempSync(join(tmpdir(), 'jrt-'));
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const cellOf = (setName, id, cond, replicate = 1) => sets[setName].cells.find(c => c.caseDef.id === id && c.cond === cond && c.replicate === replicate);

// 저장된 실제 판정에 판정기가 요구하는 세 칸을 붙여 가짜 ASSESSMENT 응답을 만든다(run-judge-model-explanation.test.mjs의 withClaims와 같은 방식).
function withClaims(raw, choiceText, v510) {
  const refs = raw.errors.length
    ? raw.errors.flatMap(e => e.studentEvidence.map(x => ({ ...x, sourceCheck: 'CONTRADICTED' })))
    : raw.studentEvidence.map(x => ({ ...x, sourceCheck: 'CONSISTENT' }));
  const chars = [...refs[0].quote], half = Math.floor(chars.length / 2);
  const [readingText, groundText] = [chars.slice(0, half).join(''), chars.slice(half).join('')];
  const { readingSummary: _drop, ...rest } = raw;
  return { ...rest, claimConflicts: [], studentClaims: refs.map(e => ({ ...e, claimAsStated: e.quote, sourceBasis: '원문 대조' })),
    choiceReading: { claims: [{ claimId: 'c1', choiceText, studentReading: '학생이 읽은 뜻', relation: 'EXACT', readingQuote: { observationId: refs[0].observationId, quote: readingText }, blanks: [] }] },
    ground: { kind: raw.insufficiencyKind === 'JUDGMENT_METHOD' ? 'JUDGMENT_METHOD' : 'FACT', observationId: refs[0].observationId, quote: groundText, ...(v510 ? { locatedSource: null } : {}) },
    judgment: { verdict: raw.rationaleImpliedVerdict, targetClaimIds: ['c1'], contradiction: '학생이 짚은 지점', holds: raw.contentAssessment !== 'INSUFFICIENT' } };
}
const usage = { input_tokens: 1000, output_tokens: 500 };
// stored = { selection, repair } 저장된 판정, storedIds = 저장 세션의 관찰 ID 순서
function fakeSend({ selection, choiceText, repair = null, storedIds = [], log = [], u = usage }) {
  return async request => {
    const kind = request.text.format.name, v510 = JSON.stringify(request.text.format.schema).includes('LOCATION_ONLY');
    const body = JSON.parse(request.input[0].content[0].text), ids = (body.observations ?? []).map(o => o.observationId);
    log.push({ kind, model: request.model, v510 });
    const out = kind === 'problem_feedback_assessment' ? (body.mode === 'REPAIR' || repair && ids.length > 1 ? repair : withClaims(selection, choiceText, v510)) : assert.fail(`예상 밖 요청: ${kind}`);
    let text = JSON.stringify(out);
    storedIds.forEach((id, i) => { if (ids[i]) text = text.replaceAll(id, ids[i]); });
    return { status: 'completed', output_text: text, usage: u };
  };
}
const participantFake = (q, extra = {}) => {
  const item = world.participant.items[q];
  return fakeSend({ selection: item.session.assessments[0], choiceText: item.session.source.choices.find(c => c.choiceId === item.first.choiceId).text,
    storedIds: [`${q}:select`], ...extra });
};

test('묶음별 칸 수와 selftest(외부 호출 0)', async () => {
  assert.deepEqual(Object.fromEntries(SET_NAMES.map(n => [n, sets[n].cells.length])), { 'v59-t1': 36, 'v59-t2': 5, 'v510-t': 42, 'v510-k': 72, 'v510-r': 9, 'v510-h': 27 });
  assert.equal((await selftest()).externalRequests, 0);
});

test('--dry: 칸 수·추정 비용', () => {
  const { rows, summary } = dryReport(sets['v59-t2']);
  assert.equal(rows.length, 5); assert.equal(summary.calls, 6); assert.ok(summary.estimatedUsd > 0.2 && summary.estimatedUsd < summary.usdCap);
  assert.ok(rows.every(r => r.rationale40.length <= 40));
});

test('1. v5.9 한 칸(경마 5): 칸 파일 필드가 계약대로 나온다', async () => {
  const outDir = tmp(), log = [], state = { spent: 0 };
  const r = await runCell(cellOf('v59-t1', 'A-horse5', 'v5.9-luna'), { send: participantFake('horse-race-reporting-q5', { log }), outDir, state });
  assert.equal(r.status, 'VALID', r.error); assert.equal(r.judge.contentAssessment, 'ERROR'); assert.equal(r.phaseAfterSelection, 'AWAITING_CORRECTION');
  assert.deepEqual(log.map(x => x.kind), ['problem_feedback_assessment']); assert.equal(log[0].v510, false);
  assert.equal(r.model, 'gpt-6-luna'); assert.equal(r.promptVersion, 'problem-feedback-v5.9'); assert.equal(r.judgmentRules, null);
  for (const k of ['set', 'caseId', 'questionId', 'condition', 'replicate', 'choiceId', 'rationaleText', 'status', 'judge', 'modelJudge', 'normalizedNotes', 'errors', 'phaseAfterSelection', 'attempts', 'rawOutput', 'requests'])
    assert.ok(k in r, `필드 없음: ${k}`);
  assert.deepEqual(Object.keys(r.judge), ['contentAssessment', 'insufficiencyKind', 'boundary', 'reason', 'rationaleImpliedVerdict']);
  assert.deepEqual(Object.keys(r.modelJudge), ['contentAssessment', 'insufficiencyKind', 'groundKind', 'locatedSource']);
  assert.ok(Array.isArray(r.normalizedNotes)); assert.deepEqual(Object.keys(r.errors[0]), ['errorId', 'errorType', 'basis', 'description', 'question']);
  assert.equal(r.attempts[0].outcome, 'SUCCESS'); assert.ok(!('repair' in r));
  assert.deepEqual(readJson(`${outDir}/${cellLabel(cellOf('v59-t1', 'A-horse5', 'v5.9-luna'))}.json`).judge, r.judge);
  assert.equal(readFileSync(`${outDir}/requests.jsonl`, 'utf8').trim().split('\n').length, 1); assert.ok(state.spent > 0);
});

test('2. v5.10 칸(의식 13): judgmentRules·기대 필드, 요청 스키마에 LOCATION_ONLY', async () => {
  const outDir = tmp(), log = [];
  const r = await runCell(cellOf('v510-r', 'R-cog13', 'v5.10-sol'), { send: participantFake('consciousness-cognition-q13', { log }), outDir, state: { spent: 0 } });
  assert.equal(r.status, 'VALID', r.error); assert.equal(r.judgmentRules, 'v5.10'); assert.equal(r.promptVersion, 'problem-feedback-v5.10');
  assert.equal(r.expected, 'SUPPORTED'); assert.equal(log[0].v510, true); assert.equal(log[0].model, 'gpt-6.1-sol');
  assert.equal(r.modelJudge.groundKind, 'FACT'); assert.equal(r.modelJudge.locatedSource, null);
});

test('3. H 칸은 hint를 칸 파일에만 기록하고 판정 입력에는 넣지 않는다', async () => {
  const cell = cellOf('v510-h', 'H-cog12-use', 'v5.10-sol'), seen = [];
  const send = async request => { seen.push(request.input[0].content[0].text); throw new Error('boom'); };
  const r = await runCell(cell, { send, outDir: tmp(), state: { spent: 0 } });
  assert.equal(r.hint, cell.caseDef.hint); assert.ok(seen.length && seen.every(t => !t.includes(cell.caseDef.hint)));
  assert.equal(r.status, 'EVALUATION_ERROR'); assert.equal(r.judge, null);
});

test('4. T2 prob-10: 선택 판정 뒤 교정 답을 넣어 luna로 교정 판정 1회, 다음 질문 기록', async () => {
  const rows = readFileSync(MRNA_EVENTS, 'utf8').trim().split('\n').map(JSON.parse);
  const stored = rows.filter(r => r.session.sessionId.startsWith('358e7095')).at(-1).session;
  const cell = cellOf('v59-t2', 'prob-10', 'v5.9-product'), outDir = tmp(), log = [];
  const choiceText = stored.source.choices.find(c => c.choiceId === stored.selections[0].choiceId).text;
  const send = fakeSend({ selection: stored.assessments[0], choiceText, repair: stored.assessments[1], log,
    storedIds: [stored.observations[0].observationId, stored.observations[1].observationId] });
  const r = await runCell(cell, { send, outDir, state: { spent: 0 } });
  assert.equal(r.status, 'VALID', r.error); assert.equal(r.model, 'gpt-6.1-sol'); assert.equal(r.phaseAfterSelection, 'AWAITING_CORRECTION');
  assert.deepEqual(log.map(x => x.model), ['gpt-6.1-sol', 'gpt-6-luna']);
  assert.equal(r.repair.status, 'VALID', r.repair.error); assert.equal(r.repair.answerText, cell.caseDef.repair.answerText);
  assert.equal(r.repair.answerText, stored.observations[1].command.text);
  assert.equal(r.repair.phaseAfter, 'AWAITING_CORRECTION'); assert.ok(r.repair.nextQuestion.length > 0);
  assert.deepEqual(r.repair.errors.map(e => e.errorId), ['E1', 'E2']); assert.equal(r.repair.model, 'gpt-6-luna');
  assert.ok(r.repair.judge.repairs.length === 2);
  // 다른 T2 칸은 교정 판정이 없다.
  const other = await runCell(cellOf('v59-t2', 'prob-5', 'v5.9-product'), { send: async () => { throw new Error('x'); }, outDir: tmp(), state: { spent: 0 } });
  assert.ok(!('repair' in other));
});

test('5. 비용 상한·이어 돌리기', async () => {
  const outDir = tmp(), set = { ...sets['v510-r'], cells: sets['v510-r'].cells.slice(0, 3).filter(c => c.caseDef.id === 'R-cog13') };
  const big = { input_tokens: 1_000_000, output_tokens: 0 }; // sol 입력 USD 2
  const capped = await runAll({ set: { ...set, cells: sets['v510-r'].cells.filter(c => c.caseDef.id === 'R-cog13') }, send: participantFake('consciousness-cognition-q13', { u: big }), outDir, capUsd: 1, concurrency: 1 });
  assert.equal(capped.stopped.stop, 'USD_CAP'); assert.equal(capped.ran, 1);
  assert.equal(readdirSync(outDir).filter(f => f.endsWith('.json')).length, 1);
  const log = [], d2 = tmp(), cells = sets['v510-r'].cells.filter(c => c.caseDef.id === 'R-cog13'), s2 = { ...set, cells };
  assert.equal((await runAll({ set: s2, send: participantFake('consciousness-cognition-q13', { log }), outDir: d2 })).ran, 3);
  const n = log.length;
  assert.equal((await runAll({ set: s2, send: participantFake('consciousness-cognition-q13', { log }), outDir: d2 })).ran, 0); assert.equal(log.length, n);
});

// ---------------------------------------------------------------- 요약
const fakeCell = (caseId, replicate, verdict, extra = {}) => ({ set: 'x', caseId, condition: 'v5.10-sol', replicate, status: 'VALID', judge: { contentAssessment: verdict },
  modelJudge: { contentAssessment: verdict, groundKind: 'FACT' }, normalizedNotes: [], errors: [], requests: [{ usd: 0.05 }], ...extra });
const triple = (caseId, verdicts, extra = {}) => verdicts.map((v, i) => fakeCell(caseId, i + 1, v, extra));

test('6. 요약: 판정 대응(부족 = INSUFFICIENT·UNKNOWN)', () => {
  assert.ok(matches('INSUFFICIENT', 'UNKNOWN') && matches('INSUFFICIENT', 'INSUFFICIENT') && !matches('INSUFFICIENT', 'SUPPORTED'));
  assert.ok(matches('SUPPORTED', 'SUPPORTED') && !matches('SUPPORTED', 'UNKNOWN') && matches('ERROR', 'ERROR') && !matches('ERROR', 'INSUFFICIENT'));
});

test('7. 요약 K: 통과·관대 오판·서버 올림·형태 집계', () => {
  const K = (kind, expected, lenient, expectedForm = 'FACT') => ({ kind, expected, lenient, expectedForm });
  const cells = [
    ...triple('K-cog12-core', ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT'], K('core', 'SUPPORTED', false)),
    ...triple('K-cog15-core', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED'], K('core', 'SUPPORTED', false)),
    ...triple('K-horse4-core', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED'], K('core', 'SUPPORTED', true)),
    ...triple('K-st16-core', ['SUPPORTED', 'INSUFFICIENT', 'INSUFFICIENT'], K('core', 'SUPPORTED', false)),
    ...triple('K-aud15-real', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED'], { ...K('real', 'SUPPORTED', true), expectedForm: null }),
    ...triple('K-cog12-restate', ['INSUFFICIENT', 'UNKNOWN', 'SUPPORTED'], K('restate', 'INSUFFICIENT', false, 'CONCLUSION_RESTATED')),
    ...triple('K-cog15-restate', ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT'], K('restate', 'INSUFFICIENT', false, 'CONCLUSION_RESTATED')), // 관대 오판
    ...triple('K-horse4-restate', ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT'], K('restate', 'SUPPORTED', true, 'CONCLUSION_RESTATED')).map(c => ({ ...c, normalizedNotes: ['x', 'contentAssessment raised to SUPPORTED: lenient item (D-0214), RESTATED_WHOLE_CHOICE'] })),
    ...triple('K-aud15-restate', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED'], K('restate', 'SUPPORTED', true, 'CONCLUSION_RESTATED')),
    ...triple('K-horse4-loc-sentence', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED'], K('loc-sentence', 'SUPPORTED', true, 'LOCATION_ONLY')),
    ...triple('K-horse4-loc-para', ['INSUFFICIENT', 'INSUFFICIENT', 'UNKNOWN'], K('loc-para', 'INSUFFICIENT', true, 'LOCATION_ONLY')),
    ...triple('K-cog15-loc-para', ['INSUFFICIENT', 'SUPPORTED', 'INSUFFICIENT'], K('loc-para', 'INSUFFICIENT', false, 'LOCATION_ONLY')),
  ];
  const s = summarizeCells('v510-k', cells), byName = Object.fromEntries(s.criteria.map(c => [c.name.slice(0, 12), c]));
  assert.equal(s.table['K-cog12-core']['v5.10-sol'].matchCount, 2); assert.equal(s.table['K-st16-core']['v5.10-sol'].pass, false);
  assert.equal(s.criteria[0].ok, true, s.criteria[0].detail); // 핵심 4/5
  assert.equal(s.lenientMisjudgments.count, 1); assert.deepEqual(s.lenientMisjudgments.ids, ['K-cog15-restate']);
  assert.equal(s.criteria[1].ok, false); // 비관대 결론만에 충분 2회 이상 1건
  assert.equal(s.criteria[2].ok, true); assert.equal(s.criteria[3].ok, true); assert.equal(s.criteria[4].ok, true);
  assert.equal(s.table['K-cog12-restate']['v5.10-sol'].pass, true); // 부족, 부족(UNKNOWN), 충분 -> 2/3
  assert.deepEqual(s.raised, [{ id: 'K-horse4-restate', raisedCount: 3 }]);
  assert.equal(s.formAgreement.find(f => f.id === 'K-cog12-restate').formMatchCount, 0);
  assert.ok(toMarkdown(s).includes('K-horse4-loc-sentence')); assert.ok(byName);
});

test('8. 요약 T·R·H 통과 기준과 T1 질문 표', () => {
  const T = ids => ids.flatMap(([id, exp, v]) => triple(id, v, { expected: exp }));
  const t = summarizeCells('v510-t', T([['A-cog14', 'SUPPORTED', ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT']], ['B-horse6', 'SUPPORTED', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED']],
    ...['A-horse6', 'A-plas10', 'A-cog16', 'B-cog14', 'B-plas10'].map(id => [id, 'SUPPORTED', ['SUPPORTED', 'SUPPORTED', 'SUPPORTED']]),
    ['A-horse5', 'ERROR', ['ERROR', 'ERROR', 'ERROR']], ['A-aud17', 'ERROR', ['ERROR', 'ERROR', 'SUPPORTED']],
    ['C1-cog14', 'INSUFFICIENT', ['INSUFFICIENT', 'UNKNOWN', 'SUPPORTED']], ['C2-aud16', 'INSUFFICIENT', ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT']]]));
  assert.equal(t.criteria[0].ok, true); assert.equal(t.criteria[1].ok, true); assert.equal(t.criteria[2].ok, false); assert.match(t.criteria[2].detail, /C2-aud16/);
  const r = summarizeCells('v510-r', ['R-a', 'R-b', 'R-c'].flatMap(id => triple(id, ['SUPPORTED', 'SUPPORTED', 'INSUFFICIENT'], { expected: 'SUPPORTED' })));
  assert.equal(r.criteria[0].ok, true);
  const h = summarizeCells('v510-h', [...triple('H-a-wrong', ['SUPPORTED', 'SUPPORTED', 'ERROR'], { expected: 'ERROR' })]);
  assert.equal(h.criteria[1].ok, false);
  const q = fakeCell('A-aud17', 1, 'ERROR', { condition: 'v5.9-sol', errors: [{ errorId: 'E1', errorType: 'CONTENT', basis: 'STATED', description: 'd', question: '표시한 표에서 어느 쪽이 더 커?' }] });
  const q2 = fakeCell('V1-plas10', 1, 'ERROR', { condition: 'v5.9-sol', errors: [{ errorId: 'E1', errorType: 'CONTENT', basis: 'STATED', description: 'd', question: '"사슬이 조밀"이라고 했지. 어느 쪽이야?' }] });
  const t1 = summarizeCells('v59-t1', [q, q2]);
  assert.deepEqual(t1.mechanical.markedInMediaCase, ['A-aud17 v5.9-sol r1']); assert.equal(t1.mechanical.notStartingWithQuote, 1);
  assert.equal(t1.questions.find(x => x.caseId === 'V1-plas10').startsWithQuote, true);
});
