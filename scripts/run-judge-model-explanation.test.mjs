import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadInputs, runCell, runAll, buildSchedule, PARTICIPANT } from './run-judge-model-explanation.mjs';
import { summarize, toMarkdown } from './summarize-judge-model-explanation.mjs';
import { buildBlind } from './build-judge-model-explanation-blind.mjs';

const { cases, participant } = loadInputs();
const tmp = () => mkdtempSync(join(tmpdir(), 'jme-'));
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const caseOf = id => cases.find(c => c.id === id);

// 저장된 실제 판정(참가자 기록)에 판정기가 요구하는 세 칸을 붙여 가짜 ASSESSMENT 응답을 만든다(feedback.test.ts의 withClaims와 같은 방식).
function withClaims(raw, choiceText) {
  const refs = raw.errors.length
    ? raw.errors.flatMap(e => e.studentEvidence.map(x => ({ ...x, sourceCheck: 'CONTRADICTED' })))
    : raw.studentEvidence.map(x => ({ ...x, sourceCheck: 'CONSISTENT' }));
  const chars = [...refs[0].quote], half = Math.floor(chars.length / 2);
  const [readingText, groundText] = [chars.slice(0, half).join(''), chars.slice(half).join('')];
  const { readingSummary: _drop, ...rest } = raw;
  return { ...rest, claimConflicts: [], studentClaims: refs.map(e => ({ ...e, claimAsStated: e.quote, sourceBasis: '원문 대조' })),
    choiceReading: { claims: [{ claimId: 'c1', choiceText, studentReading: '학생이 읽은 뜻', relation: 'EXACT', readingQuote: { observationId: refs[0].observationId, quote: readingText }, blanks: [] }] },
    ground: { kind: raw.insufficiencyKind === 'JUDGMENT_METHOD' ? 'JUDGMENT_METHOD' : 'FACT', observationId: refs[0].observationId, quote: groundText },
    judgment: { verdict: raw.rationaleImpliedVerdict, targetClaimIds: ['c1'], contradiction: '학생이 짚은 지점', holds: raw.contentAssessment !== 'INSUFFICIENT' } };
}
const usage = { input_tokens: 1000, output_tokens: 500 };
function fakeSend(questionId, log = [], u = usage) {
  const item = participant.items[questionId], stored = item.session.assessments[0];
  const choiceText = item.session.source.choices.find(c => c.choiceId === item.first.choiceId).text;
  return async request => {
    const kind = request.text.format.name; log.push(kind);
    const out = kind === 'problem_feedback_assessment' ? withClaims(stored, choiceText)
      : kind === 'problem_feedback_end_explanation' ? item.session.endExplanation : assert.fail(`예상 밖 요청: ${kind}`);
    // 저장된 판정의 관찰 ID(참가자 기록)를 이번 칸 세션의 관찰 ID로 바꾼다.
    const observationId = JSON.parse(request.input[0].content[0].text).observations?.[0]?.observationId;
    const text = JSON.stringify(out).replaceAll(`${questionId}:select`, observationId ?? `${questionId}:select`);
    return { status: 'completed', output_text: text, usage: u };
  };
}
const cell = (id, cond, replicate = 1) => ({ caseDef: caseOf(id), cond, replicate });

test('일정 길이 183, 반복 단위 순서', () => {
  const s = buildSchedule(cases);
  assert.equal(s.length, 183);
  assert.ok(s.slice(0, 61).every(x => x.replicate === 1) && s[61].replicate === 2);
});

test('1. A 사례 한 칸: INSUFFICIENT -> AWAITING_END_START -> 마지막 설명 OK, 결과 파일', async () => {
  const outDir = tmp(), log = [], state = { spent: 0 };
  const r = await runCell(cell('A-cog14', 'L-now'), { send: fakeSend('consciousness-cognition-q14', log), outDir, state });
  assert.equal(r.status, 'VALID', r.error); assert.equal(r.judge.contentAssessment, 'INSUFFICIENT');
  assert.equal(r.phaseAfterSelection, 'AWAITING_END_START'); assert.equal(r.endStatus, 'OK');
  assert.ok(r.endExplanation.firstChoice.length); assert.deepEqual(log, ['problem_feedback_assessment', 'problem_feedback_end_explanation']);
  assert.equal(r.model, 'gpt-6-luna'); assert.equal(r.endModel, 'gpt-6-luna'); assert.equal(r.explanationKind, 'now');
  assert.deepEqual(readJson(`${outDir}/A-cog14__L-now__r1.json`).judge, r.judge);
  assert.equal(readFileSync(`${outDir}/requests.jsonl`, 'utf8').trim().split('\n').length, 2);
  assert.ok(state.spent > 0);
});

test('2. 오류 판정 칸: AWAITING_CORRECTION, 마지막 설명 호출 없음, 질문 기록', async () => {
  const outDir = tmp(), log = [];
  const r = await runCell(cell('A-horse5', 'S-now'), { send: fakeSend('horse-race-reporting-q5', log), outDir, state: { spent: 0 } });
  assert.equal(r.judge.contentAssessment, 'ERROR'); assert.equal(r.phaseAfterSelection, 'AWAITING_CORRECTION');
  assert.equal(r.endStatus, 'NONE'); assert.deepEqual(log, ['problem_feedback_assessment']);
  assert.ok(r.errors.length && r.errors[0].question.length > 0); assert.equal(r.model, 'gpt-6.1-sol');
});

test('판정 실패는 EVALUATION_ERROR로 남기고 다음 칸으로', async () => {
  const r = await runCell(cell('A-cog14', 'L-now'), { send: async () => { throw new Error('boom'); }, outDir: tmp(), state: { spent: 0 } });
  assert.equal(r.status, 'EVALUATION_ERROR'); assert.equal(r.judge, null); assert.equal(r.endStatus, 'NONE');
});

test('3. 비용 상한: 넘으면 새 칸을 시작하지 않는다', async () => {
  const outDir = tmp(), big = { input_tokens: 1_000_000, output_tokens: 0 }; // luna 입력 USD 0.1
  const res = await runAll({ cases: [caseOf('A-cog14')], send: fakeSend('consciousness-cognition-q14', [], big), outDir, capUsd: 0.05, concurrency: 1 });
  assert.equal(res.stopped.stop, 'USD_CAP'); assert.equal(res.ran, 1);
  assert.equal(readdirSync(outDir).filter(f => f.endsWith('.json')).length, 1);
});

test('4. 이어 돌리기: 이미 있는 칸은 건너뛴다', async () => {
  const outDir = tmp(), log = [], c = [caseOf('A-cog14')];
  const first = await runAll({ cases: c, send: fakeSend('consciousness-cognition-q14', log), outDir, concurrency: 4 });
  assert.equal(first.ran, 15);
  const n = log.length;
  const again = await runAll({ cases: c, send: fakeSend('consciousness-cognition-q14', log), outDir });
  assert.equal(again.ran, 0); assert.equal(log.length, n);
  // 결과 파일 하나를 지우면 그 칸만 다시 돈다.
  const { unlinkSync } = await import('node:fs'); unlinkSync(`${outDir}/A-cog14__L-lab__r2.json`);
  assert.equal((await runAll({ cases: c, send: fakeSend('consciousness-cognition-q14', log), outDir })).ran, 1);
});

test('5. 요약·블라인드: 표와 묶음이 만들어지고 조건·모델 이름이 새지 않는다', async () => {
  const outDir = tmp();
  await runAll({ cases: [caseOf('A-cog14')], send: fakeSend('consciousness-cognition-q14'), outDir });
  // 오류 판정 칸도 두 조건 이상 만들어 질문 묶음을 시험한다(L-none은 해설이 달라 호출하지 않고 now/lab만).
  for (const cond of ['L-now', 'S-now', 'S-lab'])
    await runCell(cell('A-horse5', cond), { send: fakeSend('horse-race-reporting-q5'), outDir, state: { spent: 0 } });
  const s = summarize(outDir, PARTICIPANT), md = toMarkdown(s);
  assert.equal(s.table['A-cog14']['L-now'].byReplicate.r1, 'INSUFFICIENT');
  assert.equal(s.table['A-cog14']['L-now'].resolved, false); // 기대 SUPPORTED
  assert.equal(s.table['A-horse5']['S-now'].expected, 'ERROR'); assert.equal(s.table['A-horse5']['S-now'].resolved, false); // 1회뿐
  assert.ok(s.questions.some(q => q.caseId === 'A-horse5' && q.questions[0])); assert.ok(s.cost.total > 0 && s.cost.cells === 18);
  assert.ok(s.reference['A-cog14']); assert.match(md, /A-horse5/);
  const b = buildBlind(outDir, PARTICIPANT);
  assert.ok(Object.keys(b.key.questions['A-horse5']).length === 3 && Object.keys(b.key.explanations['A-cog14']).length === 5);
  assert.match(b.questions, /비교 불가/); assert.match(b.explanations, /### A-cog14/);
  for (const text of [b.questions, b.explanations]) assert.doesNotMatch(text, /\b(luna|sol|lab|none|now)\b|\b[LS]-|gpt-/i);
  assert.ok(!/KEY/.test(b.questions + b.explanations));
});
