import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DiagnosticController, DiagnosticHttpError } from './controller.js';
import { MemoryStore, correctChoice, diagnosisFake, feedbackFake, judgeFake, omitted, provided, set, summaryEvaluator, wrongChoice, type FeedbackFake } from './test-support.js';

const [COG, HORSE] = set.passages as [typeof set.passages[number], typeof set.passages[number]];
const [Q12, Q13, Q14, Q15, Q16] = COG.questionIds as [string, string, string, string, string];
let dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
beforeEach(() => { dirs = []; });

function harness(fb: FeedbackFake = feedbackFake()) {
  const store = new MemoryStore(); const diagnosis = diagnosisFake(); const judge = judgeFake();
  const logs = mkdtempSync(join(tmpdir(), 'diag-dev-')); dirs.push(logs);
  const c = new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: logs,
    diagnosisTransport: diagnosis.transport, judgeTransport: judge.transport });
  return { c, store, fb, diagnosis, judge, id: c.create().participantId };
}
type H = ReturnType<typeof harness>;
async function settle(c: DiagnosticController) {
  for (let i = 0; i < 4; i++) { await c.idle(); await new Promise(resolve => setTimeout(resolve, 5)); }
  await c.idle();
}
const status = (h: H, passageId = COG.passageId) => h.c.devMap(h.id).passages.find(p => p.passageId === passageId)!;
const post = (h: H, q: string, body: unknown) => h.c.submitItem(h.id, q, body);
const skip = (h: H, to: string, passageId = COG.passageId) => h.c.devSkipPassage(h.id, passageId, { to });
const selectionCalls = (h: H, q: string) => h.fb.calls.filter(call => call.questionId === q && call.mode === 'SELECTION').length;
function httpStatus(work: () => unknown): number | null {
  try { work(); } catch (error) { return error instanceof DiagnosticHttpError ? error.status : -1; }
  return null;
}

describe('개발자 건너뛰기(D-0217)', () => {
  it('NOT_STARTED → ANSWERING: 요약을 비우고(devSkipped), 요약을 골랐는지(summaryChosen)는 건드리지 않는다', () => {
    const h = harness();
    expect(skip(h, 'ANSWERING')).toEqual({ status: 'ANSWERING' });
    expect(status(h)).toMatchObject({ status: 'ANSWERING', summaryChosen: null, summarySkipped: true });
    expect(h.store.count('DEV_SKIP')).toBe(1);
    expect(h.store.events.find(e => e.type === 'DEV_SKIP')).toMatchObject({ passageId: COG.passageId, from: 'NOT_STARTED', to: 'ANSWERING' });
    expect(h.c.answerDrafts(h.id, COG.passageId).questions).toHaveLength(5);
  });

  it('SUMMARY → ANSWERING: summaryFinish와 같다(요약을 골랐다는 기록은 그대로)', () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: true });
    skip(h, 'ANSWERING');
    expect(status(h)).toMatchObject({ status: 'ANSWERING', summaryChosen: true, summarySkipped: false });
  });

  it('이미 확정한 문항은 건너뛰기에서 다시 확정·판정하지 않고, 남은 draft만 확정한다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    h.c.confirmItem(h.id, Q12, provided(correctChoice(Q12)));
    post(h, Q13, provided(wrongChoice(Q13)));
    await settle(h.c);
    skip(h, 'FEEDBACK');
    await settle(h.c);
    expect(selectionCalls(h, Q12)).toBe(1); expect(selectionCalls(h, Q13)).toBe(1);
    expect(h.store.events.filter(e => e.type === 'ITEM_CONFIRMED')).toHaveLength(1);
    expect(h.store.events.find(e => e.type === 'ANSWERS_DONE')).toMatchObject({ questionIds: [Q12, Q13] });
  });

  it('일부만 답한 ANSWERING → FEEDBACK: 답 있는 문항만 판정하고 답 없는 문항은 건너뜀으로 둔다', async () => {
    const h = harness(feedbackFake({ behavior: q => q === Q16 ? 'ERROR' : 'SUPPORTED' }));
    h.c.start(h.id, COG.passageId, { summary: false });
    post(h, Q12, provided(correctChoice(Q12))); post(h, Q14, omitted(correctChoice(Q14))); post(h, Q16, provided(wrongChoice(Q16)));
    skip(h, 'FEEDBACK');
    await settle(h.c);
    expect(status(h).status).toBe('FEEDBACK');
    expect(selectionCalls(h, Q12)).toBe(1); expect(selectionCalls(h, Q16)).toBe(1);
    for (const q of [Q13, Q15]) expect(selectionCalls(h, q)).toBe(0);
    const questions = status(h).questions;
    expect(questions.map(q => [q.questionId, q.answered, q.skipped])).toEqual([[Q12, true, false], [Q13, false, true], [Q14, true, false], [Q15, false, true], [Q16, true, false]]);
    expect(h.store.events.find(e => e.type === 'ANSWERS_DONE')).toMatchObject({ questionIds: [Q12, Q14, Q16] });
    // 답 없는 문항의 피드백은 열리지 않는다
    expect(httpStatus(() => h.c.feedbackView(h.id, Q13))).toBe(409);
    // 요약 카드와 결과는 답 있는 문항만 센다
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(card.total).toBe(3); expect(card.items.map(i => i.questionId)).toEqual([Q12, Q14, Q16]);
    expect(card.position).toBeNull();   // 등급은 모든 문항 결과를 공개한 뒤에만 나온다
    const result = h.c.result(h.id);
    expect(result.items.map(i => i.questionId)).toEqual([Q12, Q14, Q16]);
    expect(result.position).toMatchObject({ status: 'ready', answered: 3 });
    // 리뷰 대상은 오답(Q16)뿐이고, 순서와 무관하게 검토할 수 있다
    expect(status(h).questions.map(q => q.reviewTarget)).toEqual([false, false, false, false, true]);
    expect(h.c.feedbackView(h.id, Q16).phase).toBe('AWAITING_CORRECTION');
    expect(httpStatus(() => h.c.feedbackView(h.id, Q12))).toBe(409);
  });

  it('draft가 하나도 없으면 ANSWERING → FEEDBACK가 바로 DONE이고 결과 카드는 0문항이다', () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    skip(h, 'FEEDBACK');
    expect(status(h).status).toBe('DONE');
    expect(status(h).questions.every(q => q.skipped && !q.answered)).toBe(true);
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(card).toMatchObject({ total: 0, correct: 0, position: null }); expect(card.items).toEqual([]);
    expect(h.c.result(h.id).items).toEqual([]);
    expect(h.fb.calls).toHaveLength(0);
  });

  it('→ DONE: 검토하지 않은 리뷰 대상과 답 없는 문항을 건너뜀으로 두고 DONE이다(NOT_STARTED에서도 한 번에)', async () => {
    const h = harness();
    skip(h, 'DONE');
    expect(status(h)).toMatchObject({ status: 'DONE', summarySkipped: true });
    expect(status(h).questions.every(q => q.skipped)).toBe(true);
    const g = harness(feedbackFake({ behavior: q => q === Q12 ? 'ERROR' : 'SUPPORTED' }));
    g.c.start(g.id, COG.passageId, { summary: false });
    post(g, Q12, provided(wrongChoice(Q12))); post(g, Q13, provided(correctChoice(Q13)));
    skip(g, 'FEEDBACK'); await settle(g.c);
    skip(g, 'DONE');
    expect(status(g).status).toBe('DONE');
    expect(status(g).questions.map(q => q.skipped)).toEqual([true, false, true, true, true]);   // Q12는 검토하지 않은 리뷰 대상, Q13은 대상이 아니다
    expect(g.store.count('PASSAGE_DONE')).toBe(1);
    // 지나온 문항은 읽을 수 있다
    expect(g.c.feedbackView(g.id, Q12).questionNumber).toBeGreaterThan(0);
  });

  it('AWAITING_JUDGMENT 지문의 FEEDBACK 건너뛰기는 판정을 기다리지 않고, 판정 중 문항은 대기 보기를 보인다', async () => {
    let release = () => {}; const blocked = new Promise<void>(resolve => { release = resolve; });
    const h = harness(feedbackFake({ delay: () => blocked }));
    h.c.start(h.id, COG.passageId, { summary: false });
    for (const q of COG.questionIds) h.c.confirmItem(h.id, q, provided(q === Q12 ? wrongChoice(q) : correctChoice(q)));
    h.c.answersDone(h.id, COG.passageId);
    expect(status(h).status).toBe('AWAITING_JUDGMENT');
    skip(h, 'FEEDBACK');
    expect(status(h)).toMatchObject({ status: 'FEEDBACK' });
    expect(h.c.feedbackView(h.id, Q12)).toMatchObject({ judgmentPending: true });
    release(); await settle(h.c);
  });

  it('뒤로 건너뛰기는 409다', async () => {
    const h = harness();
    expect(httpStatus(() => skip(h, 'FEEDBACK'.replace('FEEDBACK', 'ANSWERING')))).toBeNull();
    expect(httpStatus(() => skip(h, 'ANSWERING'))).toBe(409);
    h.c.start(h.id, HORSE.passageId, { summary: false });
    post(h, HORSE.questionIds[0]!, provided(correctChoice(HORSE.questionIds[0]!)));
    skip(h, 'FEEDBACK', HORSE.passageId); await settle(h.c);
    expect(httpStatus(() => skip(h, 'ANSWERING', HORSE.passageId))).toBe(409);
    expect(httpStatus(() => skip(h, 'FEEDBACK', HORSE.passageId))).toBe(409);
    skip(h, 'DONE', HORSE.passageId);
    expect(httpStatus(() => skip(h, 'DONE', HORSE.passageId))).toBe(409);
  });
});

describe('개발자 읽기 자료(D-0217)', () => {
  it('요약 기록은 상태와 무관하게 읽고, 세션이 없으면 409다', async () => {
    const h = harness();
    expect(httpStatus(() => h.c.devSummary(h.id, COG.passageId, 0))).toBe(409);
    h.c.start(h.id, COG.passageId, { summary: true });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '이 문단은 동일론을 소개한다.' });
    skip(h, 'ANSWERING');
    const view = h.c.devSummary(h.id, COG.passageId, 0);
    expect(view.current.messages.some(m => m.role === 'student' && m.text.includes('동일론'))).toBe(true);
    expect(view.problemUrl).toBeNull();
    expect(httpStatus(() => h.c.devSummary(h.id, COG.passageId, 99))).toBe(400);
    // 서버를 다시 켠 뒤(요약 세션이 메모리에 없음)
    const restarted = new DiagnosticController({ store: h.store, feedbackEvaluator: h.fb.evaluator, summaryEvaluator, summaryLogDirectory: dirs[0]!,
      diagnosisTransport: h.diagnosis.transport, judgeTransport: h.judge.transport });
    expect(httpStatus(() => restarted.devSummary(h.id, COG.passageId, 0))).toBe(409);
    await settle(h.c);
  });

  it('낸 답은 draft도 읽고, 정답은 넣지 않는다', () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    post(h, Q12, provided(wrongChoice(Q12)));
    const data = h.c.devAnswers(h.id, COG.passageId);
    expect(data.answers[Q12]).toMatchObject({ source: 'draft', choiceId: wrongChoice(Q12) });
    expect(data.answers[Q13]).toBeNull();
    expect(JSON.stringify(data)).not.toContain('answerChoiceId');
    skip(h, 'FEEDBACK');
    expect(h.c.devAnswers(h.id, COG.passageId).answers[Q12]).toMatchObject({ source: 'first' });
  });
});

describe('개발자 지문 초기화(D-0217)', () => {
  it('초기화하면 NOT_STARTED이고 문항·분석이 비며, 다시 처음부터 할 수 있다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: true });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '이 문단은 동일론을 소개한다.' });
    await settle(h.c);
    skip(h, 'FEEDBACK'); await settle(h.c);
    expect(h.store.load(h.id)!.analysis).not.toEqual({});
    h.c.devReset(h.id, COG.passageId);
    await settle(h.c);
    const saved = h.store.load(h.id)!;
    expect(saved.passages[COG.passageId]).toMatchObject({ status: 'NOT_STARTED', summaryChosen: null, summarySessionId: null, revealed: [] });
    expect(saved.passages[COG.passageId]!.devSkipped).toBeUndefined();
    expect(saved.analysis).toEqual({});
    for (const q of COG.questionIds) expect(saved.items[q]).toMatchObject({ draft: null, first: null, session: null, transcript: [], reviewFlag: null });
    expect(h.store.count('DEV_RESET')).toBe(1);
    expect(h.store.events.some(e => e.type === 'PARTICIPANT_CREATED')).toBe(true);   // 이벤트 기록은 남는다
    h.c.start(h.id, COG.passageId, { summary: false });
    expect(status(h).status).toBe('ANSWERING');
  });

  it('초기화 전에 시작된 판정·진단이 나중에 끝나도 초기화된 문항에 써넣지 않는다', async () => {
    let release = () => {}; const blocked = new Promise<void>(resolve => { release = resolve; });
    const h = harness(feedbackFake({ delay: () => blocked, behavior: () => 'ERROR' }));
    h.c.start(h.id, COG.passageId, { summary: false });
    for (const q of COG.questionIds) h.c.confirmItem(h.id, q, provided(wrongChoice(q)));
    h.c.answersDone(h.id, COG.passageId);
    h.c.devReset(h.id, COG.passageId);
    release(); await settle(h.c);
    const saved = h.store.load(h.id)!;
    for (const q of COG.questionIds) expect(saved.items[q]).toMatchObject({ first: null, session: null, firstJudgment: { status: 'NONE' }, thoughtDiagnosis: { status: 'NONE' } });
    expect(saved.passages[COG.passageId]!.status).toBe('NOT_STARTED');
    expect(h.diagnosis.requests).toHaveLength(0);
    expect(h.store.count('JUDGMENT_DONE')).toBe(0);
    for (const q of COG.questionIds) expect(selectionCalls(h, q)).toBe(1);   // 초기화된 문항의 판정을 다시 시도하지 않는다
    // 초기화된 문항에서 새로 시작한 판정은 정상이다
    h.c.start(h.id, COG.passageId, { summary: false });
    for (const q of COG.questionIds) h.c.confirmItem(h.id, q, provided(correctChoice(q)));
    h.c.answersDone(h.id, COG.passageId); await settle(h.c);
    expect(status(h)).toMatchObject({ status: 'FEEDBACK' });
    expect(status(h).questions.every(q => q.firstJudgment === 'READY')).toBe(true);
  });

  it('초기화 전에 시작된 문단 판정이 나중에 끝나도 새 분석에 써넣지 않는다', async () => {
    let release = () => {}; const blocked = new Promise<void>(resolve => { release = resolve; });
    const h = harness(); (h.judge as { delay: () => Promise<void> }).delay = () => blocked;
    h.c.start(h.id, COG.passageId, { summary: true });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '이 문단은 동일론을 소개한다.' });
    expect(h.store.load(h.id) === null).toBe(false);
    h.c.devReset(h.id, COG.passageId);
    release(); await settle(h.c);
    expect(h.store.load(h.id)!.analysis).toEqual({});
    expect(h.store.count('ANALYSIS_DONE')).toBe(0);
  });
});
