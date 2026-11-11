import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { participantPosition, unitsForParagraph } from '@csat/pipeline';
import { DiagnosticController, DiagnosticHttpError, OMITTED_WRONG_RATIONALE_LINE, isReviewTarget, type DiagnosticControllerOptions } from './controller.js';
import { loadAnalysisMaps, loadDiagnosticPassages } from './content.js';
import { FileDiagnosticStore, type DiagnosticParticipant } from './store.js';
import {
  MemoryStore, correctChoice, diagnosisFake, feedbackFake, judgeFake, omitted, provided, set, summaryEvaluator, transportFake, wrongChoice,
  type Behavior, type FeedbackFake, type TransportFake,
} from './test-support.js';

const [COG, HORSE] = set.passages as [typeof set.passages[number], typeof set.passages[number]];
const [Q12, Q13, Q14, Q15, Q16] = COG.questionIds as [string, string, string, string, string];
let dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
beforeEach(() => { dirs = []; });

interface Harness { c: DiagnosticController; store: MemoryStore; fb: FeedbackFake; diagnosis: TransportFake; judge: TransportFake; id: string }
function harness(behaviors: Record<string, Behavior> = {}, extra: Partial<DiagnosticControllerOptions> = {}, fakes: { fb?: FeedbackFake; diagnosis?: TransportFake; judge?: TransportFake; store?: MemoryStore } = {}): Harness {
  const store = fakes.store ?? new MemoryStore();
  const fb = fakes.fb ?? feedbackFake({ behavior: q => behaviors[q] ?? 'SUPPORTED' });
  const diagnosis = fakes.diagnosis ?? diagnosisFake(); const judge = fakes.judge ?? judgeFake();
  const logs = mkdtempSync(join(tmpdir(), 'diag-summary-')); dirs.push(logs);
  const c = new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: logs,
    diagnosisTransport: diagnosis.transport, judgeTransport: judge.transport, ...extra });
  return { c, store, fb, diagnosis, judge, id: c.create().participantId };
}
/** 백그라운드 작업과 저장이 모두 가라앉을 때까지 기다린다(본 서비스 컨트롤러의 내부 작업 포함). */
async function settle(c: DiagnosticController) {
  for (let i = 0; i < 4; i++) { await c.idle(); await new Promise(resolve => setTimeout(resolve, 5)); }
  await c.idle();
}
/** 지문 결과 응답의 범주별 문항 수. */
const categoryCounts = (card: { items: { category: string }[] }) => card.items.reduce<Record<string, number>>((n, i) => ({ ...n, [i.category]: (n[i.category] ?? 0) + 1 }), {});
const post = (h: Harness, q: string, body: unknown) => h.c.confirmItem(h.id, q, body);
const draft = (h: Harness, q: string, body: unknown) => h.c.submitItem(h.id, q, body);
const selectionCalls = (h: Harness, q: string) => h.fb.calls.filter(call => call.questionId === q && call.mode === 'SELECTION').length;

describe('요약 대화 기록 위치(인계 A (6)-1)', () => {
  it('summaryLogDirectory를 주지 않으면 진단 저장 폴더 아래 summary-logs에 쓴다', async () => {
    const root = mkdtempSync(join(tmpdir(), 'diag-root-')); dirs.push(root);
    const before = process.env['CSAT_DIAGNOSTIC_ROOT'];
    process.env['CSAT_DIAGNOSTIC_ROOT'] = root;
    try {
      const fb = feedbackFake({ behavior: () => 'SUPPORTED' }); const diagnosis = diagnosisFake(); const judge = judgeFake();
      const c = new DiagnosticController({ store: new MemoryStore(), feedbackEvaluator: fb.evaluator, summaryEvaluator, diagnosisTransport: diagnosis.transport, judgeTransport: judge.transport });
      const id = c.create().participantId;
      c.start(id, COG.passageId, { summary: true });
      await c.summaryRespond(id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '이 문단은 동일론과 기능주의를 소개한다.' });
      await settle(c);
      expect(readFileSync(join(root, 'summary-logs', 'sessions.jsonl'), 'utf8')).toContain('동일론과 기능주의');
    } finally {
      if (before === undefined) delete process.env['CSAT_DIAGNOSTIC_ROOT']; else process.env['CSAT_DIAGNOSTIC_ROOT'] = before;
    }
  });
});

/** 요약 없이 지문을 시작해 모든 문항 답을 내고 answers-done까지 보낸다. */
async function answerPassage(h: Harness, passage: typeof COG, answers: Record<string, ReturnType<typeof provided>>) {
  h.c.start(h.id, passage.passageId, { summary: false });
  for (const q of passage.questionIds) post(h, q, answers[q]!);
  return h.c.answersDone(h.id, passage.passageId);
}
/** 5문항 혼합: 정답+근거(Q12), 오답+근거(Q13), 정답+생략(Q14), 오답+생략(Q15), 정답+근거(Q16). */
const mixed = () => ({ [Q12]: provided(correctChoice(Q12)), [Q13]: provided(wrongChoice(Q13)), [Q14]: omitted(correctChoice(Q14)),
  [Q15]: omitted(wrongChoice(Q15)), [Q16]: provided(correctChoice(Q16)) });

/** 한 문항을 끝날 때까지 진행한다(건너뛰기·설명 거절). 본 서비스 명령 순서를 그대로 따른다. */
async function finishItem(h: Harness, q: string) {
  let n = 0;
  for (let guard = 0; guard < 12; guard++) {
    let view = h.c.feedbackView(h.id, q);
    if (view.phase === 'COMPLETED' || view.phase === 'ITEM_REVIEW') return view;
    if (view.phase === 'AWAITING_EVALUATION') { await vi.waitFor(() => expect(h.c.feedbackView(h.id, q).evaluationStatus).not.toBe('PROCESSING')); view = h.c.feedbackView(h.id, q); if (view.evaluationStatus === 'RETRYABLE_ERROR') throw new Error('평가 실패'); continue; }
    const command = view.skippable ? { type: 'SKIP' } : view.phase === 'AWAITING_END_START' ? { type: 'END_START', accept: false } : null;
    if (!command) throw new Error(`처리할 수 없는 단계: ${view.phase}`);
    view = await h.c.feedbackSubmit(h.id, q, { transitionId: `${q}-${++n}`, expectedRevision: view.revision, command });
  }
  throw new Error('끝나지 않았습니다.');
}

describe('한 지문의 흐름', () => {
  it('요약 선택 → 첫 발화 기록·문단 판정 → 답 입력(정오 숨김) → 지문 결과 정리 → 피드백 차례(INSTANT 없음) → 다음 지문', async () => {
    const gate = { release: () => {} }; const blocked = new Promise<void>(resolve => { gate.release = resolve; });
    const fb = feedbackFake({ delay: () => blocked, behavior: q => q === Q13 ? 'ERROR' : q === Q16 ? 'INSUFFICIENT' : 'SUPPORTED' });
    const h = harness({ [Q13]: 'ERROR', [Q16]: 'INSUFFICIENT' }, {}, { fb });
    // 요약 선택
    const summaryView = h.c.start(h.id, COG.passageId, { summary: true }) as { sessionId: string; problemUrl: string | null };
    expect(summaryView.sessionId).toBeTruthy(); expect(summaryView.problemUrl).toBeNull();
    expect(h.c.progress(h.id).passages[0]).toMatchObject({ status: 'SUMMARY', summaryChosen: true });
    // 첫 학생 발화 기록과 문단 판정 시작(그 문단의 단위마다 1회)
    const first = loadDiagnosticPassages().find(p => p.passageId === COG.passageId)!.paragraphs[0]!;
    const view = await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '이 문단은 동일론과 기능주의를 소개한다.' });
    expect(view.current.done).toBe(true);
    await settle(h.c);
    const units = unitsForParagraph(loadAnalysisMaps(COG)[0]!.map, first.paragraphId);
    expect(h.judge.requests).toHaveLength(units.nodes.length + units.relations.length);
    const stored = h.store.load(h.id)!;
    expect(stored.passages[COG.passageId]!.firstTurns[first.paragraphId]).toMatchObject({ text: '이 문단은 동일론과 기능주의를 소개한다.' });
    expect(stored.analysis[first.paragraphId]!.status).toBe('READY');
    expect(Object.keys(stored.analysis[first.paragraphId]!.judgments)).toHaveLength(units.nodes.length + units.relations.length);
    expect(h.store.count('SUMMARY_FIRST_TURN')).toBe(1);
    // 같은 문단의 두 번째 발화는 첫 발화가 아니므로 새 판정을 만들지 않는다(대화가 이미 끝났으므로 다음 문단으로 이동해 확인).
    expect(h.c.summaryNavigate(h.id, COG.passageId, { paragraphIndex: 1 }).currentIndex).toBe(1);
    expect(h.c.summaryFinish(h.id, COG.passageId).questions).toHaveLength(5);
    // 문항 답: 응답에 정오·판정이 없다
    const answers = mixed();
    for (const q of COG.questionIds) expect(post(h, q, answers[q]!)).toEqual({ confirmed: true });
    expect(selectionCalls(h, Q12)).toBe(1);   // 확정 즉시 그 문항 판정이 시작됐다
    const done = h.c.answersDone(h.id, COG.passageId);
    expect(Object.keys(done)).toEqual(['position']); expect(done.position.answered).toBe(5);
    // 판정이 끝나기 전에도 정오는 바로 나오고, 근거 쪽은 판정 중으로 센다. 등급은 공개 전이라 없다
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ status: 'ready', correct: 3, total: 5, judging: 3, allRevealed: false, canFinish: false, position: null });
    gate.release(); await settle(h.c);
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(card).toMatchObject({ status: 'ready', correct: 3, total: 5, judging: 0, canFinish: false });
    expect(categoryCounts(card)).toEqual({ SUPPORTED_CORRECT: 1, WEAK_CORRECT: 1, SURE_CORRECT: 1, WRONG: 2 });
    expect(card.items.filter(i => i.reviewTarget).map(i => i.questionId)).toEqual([Q13, Q15]);
    expect(JSON.stringify(card)).not.toContain('answerPosition'); expect(JSON.stringify(card)).not.toContain('probabilities');
    // 피드백: 순서 없이 리뷰 대상만, 이어 주는 말풍선, INSTANT 없음
    expect(h.c.progress(h.id).passages[0]!.status).toBe('FEEDBACK');
    expect(h.c.progress(h.id).current).toEqual({ passageId: COG.passageId, questionId: null });
    expect(() => h.c.feedbackView(h.id, Q12)).toThrow(DiagnosticHttpError);
    const v13 = await finishItem(h, Q13);
    expect(v13.transcript[0]!.text).toContain(`${set.items[Q13]!.questionNumber}번 문제로 돌아가 볼게.`); expect(v13.transcript.some(m => m.sequence === 'INSTANT')).toBe(false);
    expect(h.c.summaryCard(h.id, COG.passageId).canFinish).toBe(false);
    await finishItem(h, Q15);
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ canFinish: true });
    expect(h.c.finish(h.id, COG.passageId)).toEqual({ status: 'DONE' });
    expect(h.c.progress(h.id).passages[0]!.status).toBe('DONE');
    expect(h.store.count('PASSAGE_DONE')).toBe(1);
    // 다음 지문
    expect(h.c.progress(h.id).current).toEqual({ passageId: HORSE.passageId, questionId: null });
    expect(h.c.start(h.id, HORSE.passageId, { summary: false })).toMatchObject({ questions: expect.any(Array) });
  });

  it('근거 생략 문항은 판정·사고 진단을 부르지 않고, 근거 생략 오답의 근거 요청 문구는 D-0208 3 문구다', async () => {
    const h = harness({ [Q13]: 'ERROR', [Q16]: 'INSUFFICIENT' });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    expect(selectionCalls(h, Q14)).toBe(0); expect(selectionCalls(h, Q15)).toBe(0);
    for (const q of [Q12, Q13, Q16]) expect(selectionCalls(h, q)).toBe(1);
    const diagnosed = h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId).sort();
    expect(diagnosed).toEqual([Q13, Q16].sort());   // 오답(근거 있음)과 SUPPORTED가 아닌 정답만. SUPPORTED 정답(Q12)·생략(Q14·Q15)은 0회
    await finishItem(h, Q13);
    for (const q of [Q12, Q14, Q16]) expect(() => h.c.feedbackView(h.id, q)).toThrow(expect.objectContaining({ status: 409 }));   // 리뷰 대상이 아니다
    const v15 = h.c.feedbackView(h.id, Q15);
    expect(v15.phase).toBe('AWAITING_RATIONALE'); expect(v15.skippable).toBe(true);
    expect(v15.message).toBe(OMITTED_WRONG_RATIONALE_LINE);
    expect(v15.transcript.filter(m => m.role === 'COACH' && m.phase === 'AWAITING_RATIONALE').map(m => m.text)).toEqual([OMITTED_WRONG_RATIONALE_LINE]);
    expect(OMITTED_WRONG_RATIONALE_LINE).toBe('정답이 아니야. 어떻게 판단했는지 적어 주면 같이 볼게. 적기 어려우면 [근거 미제출]을 눌러 줘.');
    const skipped = await h.c.feedbackSubmit(h.id, Q15, { transitionId: 'skip', expectedRevision: v15.revision, command: { type: 'SKIP' } });
    expect(skipped.phase).toBe('AWAITING_END_START'); expect(h.store.count('ITEM_SKIPPED')).toBe(2);   // Q13(교정 질문 단계)과 Q15
    await finishItem(h, Q15);
    const result = h.c.result(h.id);
    expect(result.items.find(i => i.questionId === Q15)!.afterFeedback).toEqual({ corrected: false, skipped: true });
    expect(result.items.find(i => i.questionId === Q13)!.afterFeedback).toEqual({ corrected: false, skipped: true });
    expect(result.items.find(i => i.questionId === Q12)!.afterFeedback.skipped).toBe(false);
  });

  it('ITEM_REVIEW(오답 + SUPPORTED)·boundary 문항은 리뷰 대상이 아니고(검토 화면 없음), boundary 문항은 checking, 오답 + SUPPORTED는 reviewFlag다', async () => {
    const h = harness({ [Q12]: 'BOUNDARY', [Q13]: 'SUPPORTED' });   // Q13은 오답 + SUPPORTED
    await answerPassage(h, COG, mixed()); await settle(h.c);
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(categoryCounts(card)).toMatchObject({ CHECKING: 1, SUPPORTED_CORRECT: 1, SURE_CORRECT: 1, WRONG: 2 });   // Q12 확인 중, Q16 근거 확인
    expect(card.items.find(i => i.questionId === Q12)!.category).toBe('CHECKING');
    expect(card.items.find(i => i.questionId === Q13)!.category).toBe('WRONG');
    // 오답이어도 ITEM_REVIEW로 끝난 문항(Q13)은 학생이 검토할 대상이 아니다. 근거를 생략한 오답(Q15)만 대상이다.
    expect(card.items.filter(i => i.reviewTarget).map(i => i.questionId)).toEqual([Q15]);
    for (const q of [Q12, Q13]) expect(() => h.c.feedbackView(h.id, q)).toThrow(expect.objectContaining({ status: 409 }));
    const stored = h.store.load(h.id)!;
    expect(stored.items[Q12]!.reviewFlag).toBe('BOUNDARY'); expect(stored.items[Q13]!.reviewFlag).toBe('WRONG_SUPPORTED');
    expect(h.store.count('ITEM_REVIEW_FLAGGED')).toBe(2);
    // 문항 검토 문항은 사고 진단을 부르지 않는다(정답 + boundary). Q16(정답 + SUPPORTED)도 0회, 오답(Q13)은 판정 전에 시작해 호출될 수 있다.
    expect(h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId)).not.toContain(Q12);
    expect(h.c.progress(h.id).current!.questionId).toBeNull();
    // 결과 화면에서도 정답·근거 원문이 없다
    const result = h.c.result(h.id);
    for (const q of [Q12, Q13]) {
      const item = result.items.find(i => i.questionId === q)!;
      expect(item).toMatchObject({ review: true, answerPosition: null, evidence: null, twist: null, thoughtDiagnosis: null });
      expect(typeof item.correct).toBe('boolean'); expect(item.megastudy.chosenPercents).toHaveLength(2);
      expect(JSON.stringify(item.megastudy)).not.toContain('choicePercents');
    }
    expect(result.items.find(i => i.questionId === Q16)).toMatchObject({ review: false });
    // 리뷰 대상이 Q15뿐이므로 그것만 마치면 다음 지문으로 갈 수 있다
    await finishItem(h, Q15);
    expect(h.c.summaryCard(h.id, COG.passageId).canFinish).toBe(true);
  });
});

describe('오답 문항의 사고 진단 시점과 WRONG_SUPPORTED 범위', () => {
  const diagnosed = (h: Harness) => h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId as string);
  it('오답 + boundary 판정 문항은 사고 진단 호출 0회다(오답도 판정 뒤에 대상 여부를 정한다)', async () => {
    const h = harness({ [Q13]: 'BOUNDARY', [Q15]: 'ERROR' });
    await answerPassage(h, COG, { ...mixed(), [Q15]: provided(wrongChoice(Q15)) }); await settle(h.c);
    expect(diagnosed(h)).not.toContain(Q13); expect(diagnosed(h)).toContain(Q15);
    expect(h.store.load(h.id)!.items[Q13]!.thoughtDiagnosis.status).toBe('NONE');
  });
  it('오답 + SUPPORTED + MISMATCH는 reviewFlag가 null이고 결과에서 answerPosition이 보인다', async () => {
    const h = harness({ [Q13]: 'MISMATCH' });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    expect(h.store.load(h.id)!.items[Q13]!.reviewFlag).toBeNull();
    expect(h.store.load(h.id)!.items[Q13]!.session!.phase).toBe('AWAITING_CORRECTION');
    expect(h.c.result(h.id).items.find(i => i.questionId === Q13)).toMatchObject({ review: false, answerPosition: set.items[Q13]!.answerPosition });
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(card.items.find(i => i.questionId === Q13)!.category).toBe('WRONG');
  });
  it('오답 + SUPPORTED + CONSISTENT는 WRONG_SUPPORTED이고 결과에서 숨겨진다', async () => {
    const h = harness({ [Q13]: 'SUPPORTED' });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    const stored = h.store.load(h.id)!.items[Q13]!;
    expect(stored.reviewFlag).toBe('WRONG_SUPPORTED'); expect(stored.session!.phase).toBe('ITEM_REVIEW');
    expect(h.c.result(h.id).items.find(i => i.questionId === Q13)).toMatchObject({ review: true, answerPosition: null, evidence: null });
    expect(diagnosed(h)).not.toContain(Q13);
  });
});

describe('판정 실패와 RESUME', () => {
  it('실패 → 자동 재시도 2회 → FAILED. 오답은 리뷰 대상으로 남아 검토 화면에서 RESUME으로 성공하면 READY가 되고, 정답 문항은 checking이며 리뷰 대상이 아니다', async () => {
    let allowed = false;
    const fb = feedbackFake({ behavior: q => { if (q === Q16) return 'THROW'; if (q === Q13) return allowed ? 'ERROR' : 'THROW'; return 'SUPPORTED'; } });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    expect(selectionCalls(h, Q16)).toBe(3); expect(selectionCalls(h, Q13)).toBe(3);
    expect(h.store.load(h.id)!.items[Q16]!.firstJudgment).toMatchObject({ status: 'FAILED', attempts: 3 });
    expect(h.store.count('JUDGMENT_FAILED')).toBe(6);
    const card = h.c.summaryCard(h.id, COG.passageId);
    expect(card.items.find(i => i.questionId === Q16)).toMatchObject({ category: 'CHECKING', reviewTarget: false, judging: false });
    expect(card.items.find(i => i.questionId === Q13)).toMatchObject({ category: 'WRONG', reviewTarget: true, judging: false });
    expect(() => h.c.feedbackView(h.id, Q16)).toThrow(expect.objectContaining({ status: 409 }));
    // 정답 문항은 판정 최종 실패 시 SUPPORTED가 아닌 것으로 보고 사고 진단을 돌린다.
    expect(h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId)).toContain(Q16);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q16)!.judgment.status).toBe('failed');
    // 오답의 검토 화면에서 RESUME
    const stuck = h.c.feedbackView(h.id, Q13);
    expect(stuck.phase).toBe('AWAITING_EVALUATION'); expect(stuck.evaluationStatus).toBe('RETRYABLE_ERROR');
    allowed = true;
    await h.c.feedbackSubmit(h.id, Q13, { transitionId: 'resume', expectedRevision: stuck.revision, command: { type: 'RESUME' } });
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q13]!.firstJudgment).toMatchObject({ status: 'READY', contentAssessment: 'ERROR', boundary: 'NONE' });
    expect(h.c.result(h.id).items.find(i => i.questionId === Q13)!.judgment).toMatchObject({ status: 'ready', contentAssessment: 'ERROR' });
  });
});

describe('문항마다 확정(D-0221)', () => {
  it('확정하면 그 문항의 판정이 바로 시작하고(다른 문항은 아직), 응답에 정오·판정이 없다. 임시 저장은 판정을 만들지 않는다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    draft(h, Q12, provided(wrongChoice(Q12)));
    await settle(h.c);
    expect(h.fb.calls).toHaveLength(0);
    expect(post(h, Q12, provided(correctChoice(Q12)))).toEqual({ confirmed: true });
    expect(selectionCalls(h, Q12)).toBe(1); expect(selectionCalls(h, Q13)).toBe(0);
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q12]!.first!.choiceId).toBe(correctChoice(Q12));
    expect(h.store.load(h.id)!.items[Q12]!.firstJudgment.status).toBe('READY');
    expect(h.store.load(h.id)!.items[Q13]!.firstJudgment.status).toBe('NONE');
    expect(h.store.events.filter(e => e.type === 'ITEM_CONFIRMED').map(e => e.questionId)).toEqual([Q12]);
  });
  it('확정한 문항의 재확정·임시 저장은 409이고 첫 응답은 그대로다. 순서를 어긴 확정도 409다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    expect(() => post(h, Q13, provided(correctChoice(Q13)))).toThrow(expect.objectContaining({ status: 409 }));
    post(h, Q12, provided(correctChoice(Q12)));
    expect(() => post(h, Q12, provided(wrongChoice(Q12)))).toThrow(expect.objectContaining({ status: 409 }));
    expect(() => draft(h, Q12, provided(wrongChoice(Q12)))).toThrow(expect.objectContaining({ status: 409 }));
    expect(() => post(h, Q14, provided(correctChoice(Q14)))).toThrow(expect.objectContaining({ status: 409 }));
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q12]!.first!.choiceId).toBe(correctChoice(Q12));
    expect(() => h.c.answersDone(h.id, HORSE.passageId)).toThrow(DiagnosticHttpError);
  });
  it('푸는 중에 판정이 끝나도 지문 상태는 ANSWERING이고, 확정 문항의 정오·위치가 progress·result·answerDrafts 응답에 없다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    post(h, Q12, provided(correctChoice(Q12))); post(h, Q13, provided(wrongChoice(Q13)));
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q12]!.firstJudgment.status).toBe('READY');
    const progress = h.c.progress(h.id);
    expect(progress.passages.find(p => p.passageId === COG.passageId)!.status).toBe('ANSWERING');
    expect(progress.position).toBeNull();
    expect(h.c.result(h.id)).toMatchObject({ position: { status: 'pending' }, items: [] });
    expect(() => h.c.summaryCard(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
    expect(() => h.c.feedbackView(h.id, Q12)).toThrow(expect.objectContaining({ status: 409 }));
    const view = h.c.answerDrafts(h.id, COG.passageId);
    expect(view.confirmed).toEqual({ [Q12]: true, [Q13]: true, [Q14]: false, [Q15]: false, [Q16]: false });
    expect(view.drafts[Q13]).toMatchObject({ choiceId: wrongChoice(Q13) });
    expect(JSON.stringify(view)).not.toMatch(/answerChoiceId|correct|contentAssessment|boundary/u);
  });
  it('answers-done 전에 판정이 모두 끝났으면 answers-done 뒤 바로 FEEDBACK이다(분석 중 없음)', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    const answers = mixed();
    for (const q of COG.questionIds) post(h, q, answers[q]!);
    await settle(h.c);
    const done = h.c.answersDone(h.id, COG.passageId);
    expect(done.position.answered).toBe(5);
    expect(h.c.progress(h.id).passages.find(p => p.passageId === COG.passageId)!.status).toBe('FEEDBACK');
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ judging: 0, total: 5 });
    expect(h.store.events.filter(e => e.type === 'ANSWERS_DONE')).toHaveLength(1);
    expect(h.fb.calls.filter(call => call.mode === 'SELECTION')).toHaveLength(3);   // 근거를 쓴 3문항만, answers-done은 판정을 새로 시작하지 않는다
  });
  it('답하지 않은 문항이 있으면 answers-done은 400이다', () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false }); post(h, Q12, provided(correctChoice(Q12)));
    expect(() => h.c.answersDone(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('근거 생략인데 rationaleMs가 있거나 존재하지 않는 선지는 400이다', () => {
    const h = harness(); h.c.start(h.id, COG.passageId, { summary: false });
    expect(() => post(h, Q12, { ...omitted(correctChoice(Q12)), rationaleMs: 5 })).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => post(h, Q12, provided('C99'))).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe('저장', () => {
  function fileHarness() {
    const dir = mkdtempSync(join(tmpdir(), 'diag-store-')); dirs.push(dir);
    return { dir, store: new FileDiagnosticStore(dir) };
  }
  it('동시 쓰기: 한 지문의 판정 4개와 문단 판정 여러 단위가 거의 동시에 끝나도 저장 파일에 모든 결과가 남는다', async () => {
    const { dir, store } = fileHarness();
    const randomDelay = async () => { await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 8))); };
    const fb = feedbackFake({ delay: randomDelay, behavior: q => q === Q13 ? 'ERROR' : 'SUPPORTED' });
    const c = new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: join(dir, 'summary'),
      diagnosisTransport: diagnosisFake({ delay: randomDelay }).transport, judgeTransport: judgeFake({ delay: randomDelay }).transport });
    const id = c.create().participantId;
    c.start(id, COG.passageId, { summary: true });
    for (const [index, text] of ['첫 문단 요약이다.', '둘째 문단 요약이다.', '셋째 문단 요약이다.'].entries()) {
      await c.summaryRespond(id, COG.passageId, { transitionId: `t${index}`, paragraphIndex: index, text });
    }
    c.summaryFinish(id, COG.passageId);
    for (const q of COG.questionIds) c.confirmItem(id, q, q === Q14 || q === Q15 ? omitted(correctChoice(q)) : provided(q === Q13 ? wrongChoice(q) : correctChoice(q)));
    c.answersDone(id, COG.passageId);
    await settle(c);
    const saved = JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')) as DiagnosticParticipant;
    const maps = loadAnalysisMaps(COG);
    for (const paragraphId of Object.keys(saved.passages[COG.passageId]!.firstTurns).slice(0, 3)) {
      const units = unitsForParagraph(maps[0]!.map, paragraphId);
      expect(saved.analysis[paragraphId]!.status).toBe('READY');
      expect(Object.keys(saved.analysis[paragraphId]!.judgments)).toHaveLength(units.nodes.length + units.relations.length);
    }
    for (const q of [Q12, Q13, Q16]) expect(saved.items[q]!.firstJudgment.status).toBe('READY');
    expect(saved.items[Q13]!.thoughtDiagnosis.status).toBe('READY');
    expect(saved.passages[COG.passageId]!.status).toBe('FEEDBACK');
    expect(readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').every(line => JSON.parse(line).participantId === id)).toBe(true);
  });

  it('서버 재시작 흉내: 새 컨트롤러 + 같은 저장소로 이어 가고, PENDING 판정·사고 진단·문단 판정을 다시 시작하며 결과가 있는 단위는 다시 보내지 않는다', async () => {
    const { dir, store } = fileHarness();
    const hang = () => new Promise<void>(() => {});
    let judgmentsSeen = 0;
    const firstJudge = judgeFake({ delay: async () => { if (++judgmentsSeen > 3) await hang(); } });
    const firstFb = feedbackFake({ delay: hang });
    const first = new DiagnosticController({ store, feedbackEvaluator: firstFb.evaluator, summaryEvaluator, summaryLogDirectory: join(dir, 'summary'),
      diagnosisTransport: diagnosisFake({ delay: hang }).transport, judgeTransport: firstJudge.transport });
    const id = first.create().participantId;
    first.start(id, COG.passageId, { summary: true });
    await first.summaryRespond(id, COG.passageId, { transitionId: 't1', paragraphIndex: 0, text: '첫 문단 요약이다.' });
    first.summaryFinish(id, COG.passageId);
    for (const q of COG.questionIds) first.confirmItem(id, q, q === Q14 ? omitted(correctChoice(q)) : provided(q === Q13 || q === Q15 ? wrongChoice(q) : correctChoice(q)));
    first.answersDone(id, COG.passageId);
    await vi.waitFor(() => {
      const saved = store.load(id)!;
      expect(Object.keys(saved.analysis[Object.keys(saved.analysis)[0]!]!.judgments).length).toBe(3);
      expect(saved.items[Q12]!.firstJudgment.status).toBe('PENDING'); expect(saved.items[Q13]!.thoughtDiagnosis.status).toBe('NONE');   // 판정을 기다리는 중
    });
    const paragraphId = Object.keys(store.load(id)!.analysis)[0]!;
    const units = unitsForParagraph(loadAnalysisMaps(COG)[0]!.map, paragraphId); const total = units.nodes.length + units.relations.length;
    // 새 컨트롤러(첫 컨트롤러의 멈춘 작업은 버려진다)
    const fb = feedbackFake({ behavior: q => q === Q13 || q === Q15 ? 'ERROR' : 'SUPPORTED' }); const diagnosis = diagnosisFake(); const judge = judgeFake();
    const second = new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: join(dir, 'summary'),
      diagnosisTransport: diagnosis.transport, judgeTransport: judge.transport });
    expect(second.progress(id).passages[0]!.status).toBe('AWAITING_JUDGMENT');
    await settle(second);
    expect(judge.requests).toHaveLength(total - 3);                                   // 결과가 없는 단위만 다시 보냄
    const saved = store.load(id)!;
    expect(saved.analysis[paragraphId]).toMatchObject({ status: 'READY' }); expect(Object.keys(saved.analysis[paragraphId]!.judgments)).toHaveLength(total);
    for (const q of [Q12, Q13, Q15, Q16]) expect(saved.items[q]!.firstJudgment.status).toBe('READY');
    expect(fb.calls.filter(call => call.mode === 'SELECTION').map(call => call.questionId).sort()).toEqual([Q12, Q13, Q15, Q16].sort());
    expect(saved.items[Q13]!.thoughtDiagnosis.status).toBe('READY');
    expect(saved.passages[COG.passageId]!.status).toBe('FEEDBACK');
    expect(second.feedbackView(id, Q13).transcript[0]!.text).toContain('돌아가 볼게');   // 세션도 이어 받음
    expect(second.summaryCard(id, COG.passageId)).toMatchObject({ status: 'ready', total: 5 });
  });

  it('participantId는 경로에 쓰기 전에 UUID 형식인지 검사한다', () => {
    const { store } = fileHarness();
    for (const bad of ['../etc/passwd', 'x', '', '..%2f..', '123e4567-e89b-12d3-a456-42661417400g']) {
      expect(() => store.load(bad)).toThrow(); expect(() => store.appendEvent({ type: 'X', participantId: bad })).toThrow();
    }
    expect(() => store.save({ participantId: '../x' } as DiagnosticParticipant)).toThrow();
    expect(store.load('123e4567-e89b-12d3-a456-426614174000')).toBeNull();
    const h = harness();
    expect(() => h.c.progress('../etc/passwd')).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => h.c.progress('123e4567-e89b-12d3-a456-426614174000')).toThrow(expect.objectContaining({ status: 404 }));
  });
});

describe('위치와 결과', () => {
  it('answers-done마다 그때까지 답한 문항의 정오로 위치를 다시 계산한다', async () => {
    const h = harness();
    const first = await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])));
    const expected = participantPosition(COG.questionIds.map(q => ({ seq: String(COG.exam.megastudySeq), questionNumber: set.items[q]!.questionNumber, correct: true })));
    expect(first.position).toEqual(expected);
    await settle(h.c);
    const result = h.c.result(h.id);
    expect(result.position).toMatchObject({ status: 'ready', answered: 5, correct: 5, byPassage: [{ passageId: COG.passageId }] });
    expect(result.items).toHaveLength(5); expect(result.items[0]).toMatchObject({ review: false, answerPosition: set.items[Q12]!.answerPosition, rationale: 'PROVIDED' });
    expect(result.items[0]!.megastudy.correctRate).toEqual(set.items[Q12]!.megastudy.correctRate);
    expect(result.items[0]!.twist).toBeNull();
  });
  it('오답 선지의 함정 꼬리표는 선지 연결 동결본에서 코드로만 돌려준다', async () => {
    const h = harness({ [Q13]: 'ERROR' });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    const result = h.c.result(h.id);
    const wrongItems = result.items.filter(i => !i.correct && i.rationale === 'PROVIDED');
    expect(wrongItems.map(i => i.questionId)).toEqual([Q13]);
    expect(result.steps).toMatchObject({ status: 'ready' }); expect(result.steps.counts).toEqual({ S3_LOCATE: 1 }); expect(result.steps.denominator).toBe(1);
    expect(Object.keys(result.twists.counts).every(k => /^[A-Z_]+$/u.test(k))).toBe(true);
  });
});
/** 정답 선지의 0부터 센 위치(choiceId는 C<위치> 꼴이다). */
function bundleChosenPosition(questionId: string): number {
  return Number(/\d+/u.exec(correctChoice(questionId))![0]) - 1;
}

// ---------- 인계 B: 결과 자료 보강 ----------

/** 요약 단계를 지나며 모든 문단의 첫 발화를 낸다(문단마다 이동 → 응답). */
async function summarizeAll(h: Harness, passage: typeof COG) {
  const paragraphs = loadDiagnosticPassages().find(p => p.passageId === passage.passageId)!.paragraphs;
  h.c.start(h.id, passage.passageId, { summary: true });
  for (const [i, q] of paragraphs.entries()) {
    h.c.summaryNavigate(h.id, passage.passageId, { paragraphIndex: i });
    await h.c.summaryRespond(h.id, passage.passageId, { transitionId: `t${i}`, paragraphIndex: i, text: `이 문단의 요약 ${q.paragraphId}은 이렇다. 내용을 내 말로 정리했다.` });
  }
  h.c.summaryFinish(h.id, passage.passageId);
}
const constantJudge = (label: string) => transportFake(request => ({ label, quotes: [JSON.parse(request.input[0].content[0].text).dialogue[0].text.slice(0, 3)], reason: '가짜' }));
const choiceId = (position: number) => `C${position}`;

describe('결과: 독해 패턴 개수·요약 연결·추천·학생용 문장 (인계 B)', () => {
  it('reading[].counts: 지문 합계가 문단별 판정 개수와 같고, 모두 DIRECT면 잡음 = 전체이며 틀림 0이다', async () => {
    const h = harness({}, {}, { judge: constantJudge('DIRECT') });
    await summarizeAll(h, COG); await settle(h.c);
    const reading = h.c.result(h.id).reading[0]!;
    expect(reading.status).toBe('ready');
    for (const layer of ['요지', '합성', '명제'] as const) { const c = reading.counts.layers[layer]; expect(c.total).toBeGreaterThan(0); expect(c.caught).toBe(c.total); }
    const branches = Object.values(reading.counts.branches);
    expect(branches.reduce((sum, c) => sum + c.total, 0)).toBeGreaterThan(0);
    for (const c of branches) { expect(c.caught).toBe(c.total); expect(c.wrong).toBe(0); }
    // 판정 개수: 두 지도의 모든 문단 노드 단위 수와 같다
    const maps = loadAnalysisMaps(COG);
    const units = maps.flatMap(({ map }) => [...new Set(map.propositions.map(p => p.paragraphId))].map(id => unitsForParagraph(map, id).nodes.length));
    expect(Object.values(reading.counts.layers).reduce((sum, c) => sum + c.total, 0)).toBe(units.reduce((a, b) => a + b, 0));
  });

  it('summaryLink: 적절한 것 고르기는 고른 선지, 적절하지 않은 것 고르기는 정답 선지의 비틂이 가리키는 문단이고 세 종류가 나온다', async () => {
    const expected = { DIRECT: 'CAUGHT', ABSENT: 'MISSED', CONTRADICTS: 'MISREAD' } as const;
    for (const [label, kind] of Object.entries(expected)) {
      const h = harness({ [Q12]: 'ERROR', [Q13]: 'ERROR', [Q15]: 'ERROR', [Q16]: 'ERROR' }, {}, { judge: constantJudge(label) });
      await summarizeAll(h, COG);
      // Q12(적절한 것 고르기, 정답 1): ②를 골랐다 → ②의 비틂 '나.P4-1' = (나) 4문단 = 지문 8번째 문단
      // Q13(적절하지 않은 것 고르기, 정답 3): ①을 골랐다 → 정답 ③의 비틂 '가.P4-11' = (가) 4문단 = 지문 4번째 문단
      // Q14(적절한 것 고르기, 정답 1): ①(정답)을 골랐다 → 오답이 아니므로 null
      for (const [q, position] of [[Q12, 2], [Q13, 1], [Q14, 1], [Q15, 2], [Q16, 3]] as const) post(h, q, provided(choiceId(position)));
      h.c.answersDone(h.id, COG.passageId); await settle(h.c);
      const items = h.c.result(h.id).items;
      expect(items.find(i => i.questionId === Q12)!.summaryLink).toEqual({ status: 'ready', kind, paragraphs: [8], paragraphLabel: '(나) 4문단' });
      expect(items.find(i => i.questionId === Q13)!.summaryLink).toEqual({ status: 'ready', kind, paragraphs: [4], paragraphLabel: '(가) 4문단' });
      expect(items.find(i => i.questionId === Q14)!.summaryLink).toBeNull();      // 정답
      expect(items.find(i => i.questionId === Q15)!.summaryLink).toBeNull();      // 정답(2번)
      expect(items.find(i => i.questionId === Q16)!.summaryLink).toBeNull();      // 정답(3번)
    }
  });

  it('summaryLink: 요약하지 않은 지문, 문항 검토 문항은 null이고 source NONE뿐인 선지(오디오 14번)도 null이다', async () => {
    const h = harness({ [Q12]: 'ERROR' });
    const noSummary = await answerPassage(h, COG, { [Q12]: provided(choiceId(2)), [Q13]: provided(choiceId(1)), [Q14]: provided(choiceId(2)), [Q15]: provided(choiceId(1)), [Q16]: provided(choiceId(1)) });
    expect(noSummary.position.answered).toBe(5); await settle(h.c);
    expect(h.c.result(h.id).items.every(i => i.summaryLink === null)).toBe(true);
    // 오디오: 요약 후 14번(적절하지 않은 것 고르기, 정답 3, 정답 선지에 비틂 id 없음)을 오답으로
    const AUDIO = set.passages[3]!;
    const [A14, A15, A16, A17] = AUDIO.questionIds as [string, string, string, string];
    const h2 = harness({ [A14]: 'ERROR', [A15]: 'ERROR', [A16]: 'ERROR', [A17]: 'ERROR' }, {}, { judge: constantJudge('DIRECT') });
    await summarizeAll(h2, AUDIO);
    post(h2, A14, provided(choiceId(1))); post(h2, A15, provided(choiceId(1))); post(h2, A16, provided(choiceId(1))); post(h2, A17, provided(choiceId(5)));
    h2.c.answersDone(h2.id, AUDIO.passageId); await settle(h2.c);
    const items = h2.c.result(h2.id).items;
    expect(items.find(i => i.questionId === A14)!.summaryLink).toBeNull();
    expect(items.find(i => i.questionId === A15)!.summaryLink).toMatchObject({ status: 'ready', kind: 'CAUGHT' });
  });

  it('summaryLink: 관련 문단 판정이 아직이면 pending이다', async () => {
    const gate = { release: () => {} }; const blocked = new Promise<void>(resolve => { gate.release = resolve; });
    const judge = transportFake(request => ({ label: 'DIRECT', quotes: [JSON.parse(request.input[0].content[0].text).dialogue[0].text.slice(0, 3)], reason: '가짜' }), { delay: () => blocked });
    const h = harness({ [Q12]: 'ERROR', [Q13]: 'ERROR', [Q15]: 'ERROR', [Q16]: 'ERROR' }, {}, { judge });
    await summarizeAll(h, COG);
    for (const [q, position] of [[Q12, 2], [Q13, 1], [Q14, 1], [Q15, 1], [Q16, 1]] as const) post(h, q, provided(choiceId(position)));
    h.c.answersDone(h.id, COG.passageId); await vi.waitFor(() => expect(h.fb.calls.length).toBeGreaterThan(0));
    const q12 = h.c.result(h.id).items.find(i => i.questionId === Q12);
    expect(q12!.summaryLink).toMatchObject({ status: 'pending' });
    gate.release(); await settle(h.c);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q12)!.summaryLink).toMatchObject({ status: 'ready' });
  });

  it('copyOverlap: 첫 발화를 기록할 때 함께 계산해 저장하고 사건에도 넣지만, 결과에는 내지 않는다. 짧은 발화는 null이다', async () => {
    const h = harness();
    const paragraphs = loadDiagnosticPassages().find(p => p.passageId === COG.passageId)!.paragraphs;
    h.c.start(h.id, COG.passageId, { summary: true });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't0', paragraphIndex: 0, text: paragraphs[0]!.text.slice(0, Math.floor(paragraphs[0]!.text.length / 2)) });
    h.c.summaryNavigate(h.id, COG.passageId, { paragraphIndex: 1 });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't1', paragraphIndex: 1, text: '짧은 말' });
    h.c.summaryNavigate(h.id, COG.passageId, { paragraphIndex: 2 });
    await h.c.summaryRespond(h.id, COG.passageId, { transitionId: 't2', paragraphIndex: 2, text: 'qwertyuiop asdfghjkl zxcvbnm' });
    await settle(h.c);
    const turns = h.store.load(h.id)!.passages[COG.passageId]!.firstTurns;
    expect(turns[paragraphs[0]!.paragraphId]!.copyOverlap).toMatchObject({ n: 5, ratio: 1 });
    expect(turns[paragraphs[1]!.paragraphId]!.copyOverlap).toBeNull();
    expect(turns[paragraphs[2]!.paragraphId]!.copyOverlap).toMatchObject({ n: 5, matched: 0, ratio: 0 });
    const events = h.store.events.filter(e => e.type === 'SUMMARY_FIRST_TURN');
    expect(events.map(e => (e['copyOverlap'] as { ratio: number } | null)?.ratio ?? null)).toEqual([1, null, 0]);
    expect(JSON.stringify(h.c.result(h.id))).not.toContain('copyOverlap');
  });

  it('answerDrafts: ANSWERING에서만 문항과 임시 답(정오 없음)을 돌려주고 고친 답이 마지막 값이다', () => {
    const h = harness();
    expect(() => h.c.answerDrafts(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
    h.c.start(h.id, COG.passageId, { summary: false });
    expect(Object.values(h.c.answerDrafts(h.id, COG.passageId).drafts).every(d => d === null)).toBe(true);
    draft(h, Q12, provided(choiceId(2))); draft(h, Q12, omitted(choiceId(3)));
    const view = h.c.answerDrafts(h.id, COG.passageId);
    expect(view.questions.map(q => q.questionId)).toEqual(COG.questionIds);
    expect(view.drafts[Q12]).toEqual({ choiceId: choiceId(3), rationale: { mode: 'OMITTED' }, confidence: 'SURE' });
    expect(view.drafts[Q13]).toBeNull();
    expect(JSON.stringify(view)).not.toContain('answerChoiceId');
    for (const q of COG.questionIds) post(h, q, provided(correctChoice(q)));
    h.c.answersDone(h.id, COG.passageId);
    expect(() => h.c.answerDrafts(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
  });

  it('recommendation·twist.studentText: 대응표·학생용 문장 파일이 비어 있으면 setNames []·studentText null이고, 채우면 코드 변경 없이 나온다', async () => {
    const answers = { [Q12]: provided(choiceId(2)), [Q13]: provided(choiceId(1)), [Q14]: provided(choiceId(2)), [Q15]: provided(choiceId(1)), [Q16]: provided(choiceId(1)) };
    const empty = harness({ [Q12]: 'ERROR', [Q13]: 'ERROR', [Q14]: 'ERROR', [Q15]: 'ERROR', [Q16]: 'ERROR' });
    await answerPassage(empty, COG, answers); await settle(empty.c);
    const result = empty.c.result(empty.id);
    const twisted = result.items.filter(i => i.twist !== null);
    expect(twisted.length).toBeGreaterThan(0);
    expect(twisted.every(i => i.twist!.every(t => t.studentText === null))).toBe(true);
    const picked = result.recommendation!;
    expect(picked.setNames).toEqual([]);
    expect(picked.twistType).not.toBe('OTHER');
    expect(Math.max(...Object.entries(result.twists.counts).filter(([k]) => k !== 'OTHER').map(([, n]) => n))).toBe(result.twists.counts[picked.twistType]);

    const q12 = result.items.find(i => i.questionId === Q12)!.twist![0]!;
    const filled = harness({ [Q12]: 'ERROR', [Q13]: 'ERROR', [Q14]: 'ERROR', [Q15]: 'ERROR', [Q16]: 'ERROR' }, { recommendationMap: { [picked.twistType]: ['세트 가', '세트 나'] }, twistStudentText: { [`${Q12}:2`]: ['학생용 문장 하나'] } });
    await answerPassage(filled, COG, answers); await settle(filled.c);
    const again = filled.c.result(filled.id);
    expect(again.recommendation).toEqual({ twistType: picked.twistType, setNames: ['세트 가', '세트 나'] });
    expect(again.items.find(i => i.questionId === Q12)!.twist![0]).toEqual({ ...q12, studentText: '학생용 문장 하나' });
    expect(again.items.find(i => i.questionId === Q12)!.twist!.slice(1).every(t => t.studentText === null)).toBe(true);
  });

  it('오답이 없으면 recommendation은 null이다', async () => {
    const h = harness();
    await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))]))); await settle(h.c);
    expect(h.c.result(h.id).recommendation).toBeNull();
  });
});

// ---------- 인계 (나) 1부: 범주·확신 구분·문항별 열기 ----------

describe('범주 표 (D-0213, 인계 (4))', () => {
  const category = (h: Harness, q: string) => (h.c.summaryCard(h.id, COG.passageId).items.find(i => i.questionId === q)!).category;
  it('정답 + 근거: SUPPORTED=1, INSUFFICIENT=2, ERROR=3, INSUFFICIENT+MISMATCH=3(불일치 포함), reconstructability UNKNOWN=UNVERIFIED', async () => {
    const h = harness({ [Q12]: 'SUPPORTED', [Q13]: 'INSUFFICIENT', [Q14]: 'ERROR', [Q15]: 'INSUFFICIENT_MISMATCH', [Q16]: 'UNKNOWN_PATH' });
    await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))]))); await settle(h.c);
    expect([Q12, Q13, Q14, Q15, Q16].map(q => category(h, q))).toEqual(['SUPPORTED_CORRECT', 'WEAK_CORRECT', 'ERROR_CORRECT', 'ERROR_CORRECT', 'UNVERIFIED']);
    const stored = h.store.load(h.id)!.items;
    expect(stored[Q15]!.firstJudgment).toMatchObject({ contentAssessment: 'INSUFFICIENT', consistency: 'MISMATCH', reconstructability: 'RECONSTRUCTABLE' });
    expect(stored[Q16]!.firstJudgment).toMatchObject({ reconstructability: 'UNKNOWN', consistency: expect.anything() });
    expect(h.c.result(h.id).items.map(i => i.category)).toEqual(['SUPPORTED_CORRECT', 'WEAK_CORRECT', 'ERROR_CORRECT', 'ERROR_CORRECT', 'UNVERIFIED']);
  });
  it('오답=WRONG, 근거 생략 정답은 SURE·UNSURE, boundary·최종 실패는 CHECKING', async () => {
    const h = harness({ [Q15]: 'BOUNDARY', [Q16]: 'THROW' });
    await answerPassage(h, COG, { [Q12]: provided(wrongChoice(Q12)), [Q13]: omitted(correctChoice(Q13), 'SURE'), [Q14]: omitted(correctChoice(Q14), 'UNSURE'),
      [Q15]: provided(correctChoice(Q15)), [Q16]: provided(correctChoice(Q16)) });
    await settle(h.c);
    expect([Q12, Q13, Q14, Q15, Q16].map(q => category(h, q))).toEqual(['WRONG', 'SURE_CORRECT', 'UNSURE_CORRECT', 'CHECKING', 'CHECKING']);
    expect(h.store.load(h.id)!.items[Q14]!.first!.confidence).toBe('UNSURE');
    expect(h.store.events.filter(e => e.type === 'ITEM_CONFIRMED' && e.questionId === Q14).map(e => e['confidence'])).toEqual(['UNSURE']);
  });
  it('정답 + 근거 + 판정이 아직이면 PENDING이고 judging에 센다', async () => {
    const gate = { release: () => {} }; const blocked = new Promise<void>(resolve => { gate.release = resolve; });
    const h = harness({}, {}, { fb: feedbackFake({ delay: () => blocked }) });
    await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])));
    expect(category(h, Q12)).toBe('PENDING'); expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ judging: 5, correct: 5 });
    gate.release(); await settle(h.c);
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ judging: 0 });
  });
  it('qualityTiers는 결과 응답에 실리고 범주 값은 설정과 상관없다', async () => {
    const h = harness();
    await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))]))); await settle(h.c);
    expect(h.c.result(h.id).qualityTiers).toBe(3);
  });
});

describe('confidence (인계 (3))', () => {
  it('근거 생략인데 값이 없거나 근거를 썼는데 값이 있으면 400이다', () => {
    const h = harness(); h.c.start(h.id, COG.passageId, { summary: false });
    const { confidence: _confidence, ...noConfidence } = omitted(correctChoice(Q12));
    expect(() => post(h, Q12, noConfidence)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => post(h, Q12, { ...omitted(correctChoice(Q12)), confidence: null })).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => post(h, Q12, { ...provided(correctChoice(Q12)), confidence: 'SURE' })).toThrow(expect.objectContaining({ status: 400 }));
    expect(post(h, Q12, omitted(correctChoice(Q12), 'UNSURE'))).toEqual({ confirmed: true });
    expect(post(h, Q13, { ...provided(correctChoice(Q13)), confidence: undefined })).toEqual({ confirmed: true });
  });
  it('옛 참가자 파일(confidence·reconstructability·consistency 없음)도 오류 없이 불러오고 근거 생략 정답은 SURE로 본다', async () => {
    const store = new MemoryStore();
    const h = harness({}, {}, { store });
    await answerPassage(h, COG, { ...Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])), [Q14]: omitted(correctChoice(Q14), 'UNSURE') });
    await settle(h.c);
    const old = JSON.parse(store.files.get(h.id)!) as DiagnosticParticipant;
    for (const item of Object.values(old.items)) {
      delete (item.first as { confidence?: unknown } | null)?.confidence;
      delete (item.firstJudgment as { reconstructability?: unknown }).reconstructability; delete (item.firstJudgment as { consistency?: unknown }).consistency;
    }
    store.files.set(h.id, JSON.stringify(old));
    const second = new DiagnosticController({ store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: mkdtempSync(join(tmpdir(), 'diag-old-summary-')),
      diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
    const card = second.summaryCard(h.id, COG.passageId);
    expect(card.items.map(i => i.category)).toEqual(['SUPPORTED_CORRECT', 'SUPPORTED_CORRECT', 'SURE_CORRECT', 'SUPPORTED_CORRECT', 'SUPPORTED_CORRECT']);
    await settle(second);
  });
});

describe('소거법 버튼 (D-0228)', () => {
  it('소거법 정답은 판정 없이 WEAK_CORRECT, 리뷰 대상 아님(피드백 409), 메모와 elimination 표시가 남는다', async () => {
    const h = harness();
    await answerPassage(h, COG, { ...Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])), [Q14]: omitted(correctChoice(Q14), 'ELIMINATION', '1번 아니고 3번 아님') });
    await settle(h.c);
    expect(selectionCalls(h, Q14)).toBe(0);
    const items = h.c.summaryCard(h.id, COG.passageId).items;
    const card = items.find(i => i.questionId === Q14)!;
    expect(card).toMatchObject({ category: 'WEAK_CORRECT', reviewTarget: false, elimination: true, judging: false });
    expect(items.filter(i => i.elimination)).toHaveLength(1);
    expect(() => h.c.feedbackView(h.id, Q14)).toThrow(expect.objectContaining({ status: 409 }));
    expect(h.store.load(h.id)!.items[Q14]!.first).toMatchObject({ confidence: 'ELIMINATION', eliminationNote: '1번 아니고 3번 아님' });
    expect(h.store.events.filter(e => e.type === 'ITEM_CONFIRMED' && e.questionId === Q14).map(e => e['eliminationNote'])).toEqual(['1번 아니고 3번 아님']);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q14)).toMatchObject({ category: 'WEAK_CORRECT', elimination: true });
    expect(h.c.devAnswers(h.id, COG.passageId).answers[Q14]).toMatchObject({ elimination: true, eliminationNote: '1번 아니고 3번 아님' });
  });
  it('소거법 오답은 WRONG이고 근거 요청 단계로 간다', async () => {
    const h = harness();
    await answerPassage(h, COG, { ...Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])), [Q15]: omitted(wrongChoice(Q15), 'ELIMINATION') });
    await settle(h.c);
    expect(h.c.summaryCard(h.id, COG.passageId).items.find(i => i.questionId === Q15)).toMatchObject({ category: 'WRONG', reviewTarget: true, elimination: true });
    expect(h.c.feedbackView(h.id, Q15).phase).toBe('AWAITING_RATIONALE');
    expect(selectionCalls(h, Q15)).toBe(0);
  });
  it('eliminationNote는 ELIMINATION일 때만 허용하고(아니면 400), 메모 없이도 된다', async () => {
    const h = harness(); h.c.start(h.id, COG.passageId, { summary: false });
    for (const bad of [omitted(correctChoice(Q12), 'SURE', '메모'), omitted(correctChoice(Q12), 'UNSURE', '메모'), { ...provided(correctChoice(Q12)), eliminationNote: '메모' }])
      expect(() => post(h, Q12, bad as never)).toThrow(expect.objectContaining({ status: 400 }));
    expect(post(h, Q12, omitted(correctChoice(Q12), 'ELIMINATION'))).toEqual({ confirmed: true });
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q12]!.first!.eliminationNote ?? null).toBeNull();
  });
  it('옛 저장 파일(eliminationNote 없음)은 elimination=false로 읽힌다', async () => {
    const h = harness();
    await answerPassage(h, COG, { ...Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])), [Q14]: omitted(correctChoice(Q14), 'UNSURE') });
    await settle(h.c);
    expect(h.c.summaryCard(h.id, COG.passageId).items.every(i => !i.elimination)).toBe(true);
    expect(h.c.devAnswers(h.id, COG.passageId).answers[Q14]).toMatchObject({ eliminationNote: null, elimination: false });
  });
});

describe('문항별 피드백 열기 (인계 (7))', () => {
  /** 문항별로 평가 호출을 붙잡아 두는 가짜 평가기. */
  function gatedFake(behaviors: (q: string, index: number) => Behavior, holdAfter: Record<string, number> = {}) {
    const inner = feedbackFake({ behavior: behaviors });
    const gates: Record<string, { release: () => void; promise: Promise<void> }> = {};
    const seen = new Map<string, number>();
    const gateOf = (q: string) => (gates[q] ??= (() => { let release = () => {}; const promise = new Promise<void>(resolve => { release = resolve; }); return { release, promise }; })());
    const fb: FeedbackFake = { ...inner, evaluator: { async evaluate(s) {
      const q = s.source.questionId; const n = (seen.get(q) ?? 0) + 1; seen.set(q, n);
      if (n > (holdAfter[q] ?? 0) && q in holdAfter) await gateOf(q).promise;
      return inner.evaluator.evaluate(s);
    } } };
    return { fb, release: (q: string) => gateOf(q).release(), entered: (q: string) => seen.get(q) ?? 0 };
  }
  const allCorrect = () => Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))]));

  /** Q13을 오답(근거 있음)으로 낸다. 나머지는 정답 + 근거. */
  const q13Wrong = () => ({ ...allCorrect(), [Q13]: provided(wrongChoice(Q13)) });

  it('오답 문항의 판정이 아직이면 읽기는 대기 보기·쓰기는 409·다음 지문은 막히고, 판정이 끝나면 열린다. 정답 문항은 검토 대상이 아니다', async () => {
    const { fb, release } = gatedFake(q => q === Q13 ? 'ERROR' : 'SUPPORTED', { [Q13]: 0 });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, q13Wrong());
    await vi.waitFor(() => expect(h.c.progress(h.id).passages[0]!.status).toBe('FEEDBACK'));
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ judging: 1, canFinish: false });
    expect(h.c.summaryCard(h.id, COG.passageId).items.find(i => i.questionId === Q13)).toMatchObject({ reviewTarget: true, judging: true });
    expect(h.c.progress(h.id).current).toEqual({ passageId: COG.passageId, questionId: null });
    const waiting = h.c.feedbackView(h.id, Q13);
    expect(waiting).toMatchObject({ judgmentPending: true, evaluationStatus: 'PROCESSING' });
    await expect(h.c.feedbackSubmit(h.id, Q13, { transitionId: 'x', expectedRevision: waiting.revision, command: { type: 'SKIP' } })).rejects.toMatchObject({ status: 409 });
    expect(() => h.c.finish(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
    release(Q13); await settle(h.c);
    const opened = h.c.feedbackView(h.id, Q13);
    expect(opened.judgmentPending).toBeUndefined(); expect(opened.phase).toBe('AWAITING_CORRECTION');
    expect(() => h.c.feedbackView(h.id, Q12)).toThrow(expect.objectContaining({ status: 409 }));
  });

  it('오답 문항의 판정 재시도가 도는 동안 학생 명령(RESUME 포함)이 끼어들지 않는다', async () => {
    const { fb, release, entered } = gatedFake((q, index) => q === Q13 ? (index === 0 ? 'THROW' : 'ERROR') : 'SUPPORTED', { [Q13]: 1 });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, q13Wrong());
    await vi.waitFor(() => expect(entered(Q13)).toBe(2));   // 자동 재시도가 평가 호출에서 잡힌 상태
    const waiting = h.c.feedbackView(h.id, Q13);
    expect(waiting.judgmentPending).toBe(true);
    await expect(h.c.feedbackSubmit(h.id, Q13, { transitionId: 'r', expectedRevision: waiting.revision, command: { type: 'RESUME' } })).rejects.toMatchObject({ status: 409 });
    expect(entered(Q13)).toBe(2);
    release(Q13); await settle(h.c);
    expect(h.store.load(h.id)!.items[Q13]!.firstJudgment.status).toBe('READY');
    expect(h.c.feedbackView(h.id, Q13).judgmentPending).toBeUndefined();
  });

  it('근거를 생략한 오답은 판정 없이 바로 검토가 열리고, 다른 문항 판정이 진행 중이어도 상관없다', async () => {
    const { fb } = gatedFake(() => 'SUPPORTED', { [Q13]: 0, [Q14]: 0, [Q15]: 0, [Q16]: 0 });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, { ...allCorrect(), [Q12]: omitted(wrongChoice(Q12)) });
    expect(h.c.progress(h.id).passages[0]!.status).toBe('FEEDBACK');
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ judging: 4 });
    expect(h.c.summaryCard(h.id, COG.passageId).items.find(i => i.questionId === Q12)).toMatchObject({ reviewTarget: true, judging: false });
    expect(h.c.feedbackView(h.id, Q12).phase).toBe('AWAITING_RATIONALE');
  });
});

// ---------- D-0218: 지문 결과 화면(공개·리뷰 대상·다음 지문) ----------

describe('지문 결과 화면 (D-0218)', () => {
  it('리뷰 대상은 오답과 근거가 틀린 정답이고, 잘 모르겠지만 정답은 아직 아니다', () => {
    for (const category of ['WRONG', 'ERROR_CORRECT'] as const) expect(isReviewTarget(category)).toBe(true);
    for (const category of ['SUPPORTED_CORRECT', 'WEAK_CORRECT', 'SURE_CORRECT', 'UNSURE_CORRECT', 'UNVERIFIED', 'PENDING', 'CHECKING'] as const) expect(isReviewTarget(category)).toBe(false);
  });

  /** Q12 근거 오류 정답, Q13 오답(ERROR), Q14 잘 모르겠지만 정답, Q15 오답 생략, Q16 정답 + 근거(SUPPORTED). */
  async function reviewHarness(extra: Partial<DiagnosticControllerOptions> = {}, store?: MemoryStore) {
    const h = harness({ [Q12]: 'ERROR', [Q13]: 'ERROR' }, extra, store ? { store } : {});
    await answerPassage(h, COG, { ...mixed(), [Q14]: omitted(correctChoice(Q14), 'UNSURE') }); await settle(h.c);
    return h;
  }

  it('범주별 리뷰 대상: 근거 오류 정답·오답만 대상이고, 잘 모르겠지만 정답과 SUPPORTED 정답은 아니다', async () => {
    const h = await reviewHarness();
    const items = h.c.summaryCard(h.id, COG.passageId).items;
    expect(items.map(i => [i.category, i.reviewTarget, i.reviewDone])).toEqual([
      ['ERROR_CORRECT', true, false], ['WRONG', true, false], ['UNSURE_CORRECT', false, false], ['WRONG', true, false], ['SUPPORTED_CORRECT', false, false]]);
    expect(items[0]!.megastudy).toEqual({ correctRate: set.items[Q12]!.megastudy.correctRate, chosenPercents: expect.any(Array) });
  });

  it('검토 순서는 자유다: 뒤 문항을 먼저 검토해도 되고, 건너뛰기도 검토 완료다. 대상이 아닌 문항은 읽기·쓰기 모두 409다', async () => {
    const h = await reviewHarness();
    await finishItem(h, Q15);   // 근거 생략 오답을 먼저(건너뛰기로 끝남)
    expect(h.store.count('ITEM_SKIPPED')).toBe(1);
    let items = h.c.summaryCard(h.id, COG.passageId).items;
    expect(items.map(i => i.reviewDone)).toEqual([false, false, false, true, false]);
    for (const q of [Q14, Q16]) {
      expect(() => h.c.feedbackView(h.id, q)).toThrow(expect.objectContaining({ status: 409 }));
      await expect(h.c.feedbackSubmit(h.id, q, { transitionId: 'x', expectedRevision: 0, command: { type: 'SKIP' } })).rejects.toMatchObject({ status: 409 });
    }
    await finishItem(h, Q13); await finishItem(h, Q12);
    items = h.c.summaryCard(h.id, COG.passageId).items;
    expect(items.map(i => i.reviewDone)).toEqual([true, true, false, true, false]);
    expect(h.c.summaryCard(h.id, COG.passageId).canFinish).toBe(true);
  });

  it('공개: 서버에 남고(다른 컨트롤러로 이어 가도 유지) 되돌리지 않으며, 모두 공개하기 전에는 등급·확률이 응답에 없다', async () => {
    const store = new MemoryStore();
    const h = await reviewHarness({}, store);
    expect(h.c.summaryCard(h.id, COG.passageId).items.every(i => !i.revealed)).toBe(true);
    const first = h.c.reveal(h.id, COG.passageId, { questionId: Q12 });
    h.c.reveal(h.id, COG.passageId, { questionId: Q12 });   // 같은 문항 다시: 중복 기록 없음
    expect(h.store.count('ITEM_REVEALED')).toBe(1);
    expect(first.items.map(i => i.revealed)).toEqual([true, false, false, false, false]);
    for (const q of [Q13, Q14, Q15]) h.c.reveal(h.id, COG.passageId, { questionId: q });
    const nearly = h.c.summaryCard(h.id, COG.passageId);
    expect(nearly).toMatchObject({ allRevealed: false, position: null });
    for (const text of [JSON.stringify(nearly), JSON.stringify(h.c.reveal(h.id, COG.passageId, { questionId: Q15 }))]) { expect(text).not.toContain('probabilities'); expect(text).not.toContain('"mode"'); }
    // 저장 파일에서 이어 가기
    await settle(h.c);
    const second = new DiagnosticController({ store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: mkdtempSync(join(tmpdir(), 'diag-reveal-')),
      diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
    expect(second.summaryCard(h.id, COG.passageId).items.map(i => i.revealed)).toEqual([true, true, true, true, false]);
    const started = performance.now();
    const all = second.reveal(h.id, COG.passageId, { questionId: Q16 });   // 등급 확률 계산을 포함한 응답
    const ms = performance.now() - started;
    expect(ms).toBeLessThan(500); console.info(`reveal(등급 확률 포함) ${ms.toFixed(1)}ms`);
    expect(all.allRevealed).toBe(true);
    const grade = all.position!.grade;
    expect(grade.probabilities).toHaveLength(9); expect(grade.probabilities.reduce((a, x) => a + x, 0)).toBeCloseTo(1, 9);
    expect(grade.probabilities[grade.mode - 1]).toBe(Math.max(...grade.probabilities));
    expect(all.position).toMatchObject({ answered: 5, correct: 3 });
    await settle(second);
  });

  it('공개 요청 검사: 다른 지문의 문항은 400, 답 없는 문항·시작 전 지문은 409, 본문이 틀리면 400', async () => {
    const h = await reviewHarness();
    expect(() => h.c.reveal(h.id, COG.passageId, { questionId: HORSE.questionIds[0] })).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => h.c.reveal(h.id, COG.passageId, {})).toThrow();
    expect(() => h.c.reveal(h.id, HORSE.passageId, { questionId: HORSE.questionIds[0] })).toThrow(expect.objectContaining({ status: 409 }));
  });

  it('옛 참가자 파일(revealed·feedbackCursor 없음)도 불러오고 공개 목록은 비어 있다', async () => {
    const store = new MemoryStore();
    const h = await reviewHarness({}, store);
    const old = JSON.parse(store.files.get(h.id)!) as DiagnosticParticipant;
    for (const state of Object.values(old.passages)) { delete state.revealed; state.feedbackCursor = 0; }
    store.files.set(h.id, JSON.stringify(old));
    const second = new DiagnosticController({ store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: mkdtempSync(join(tmpdir(), 'diag-old-')),
      diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
    expect(second.summaryCard(h.id, COG.passageId)).toMatchObject({ allRevealed: false, position: null });
    expect(second.summaryCard(h.id, COG.passageId).items.every(i => !i.revealed)).toBe(true);
    await settle(second);
  });

  it('다음 지문: 리뷰 대상을 모두 검토해야 하고 아니면 409, 끝나면 DONE이며 한 번 더 누르면 409다', async () => {
    const h = await reviewHarness();
    expect(() => h.c.finish(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
    await finishItem(h, Q12); await finishItem(h, Q13);
    expect(() => h.c.finish(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));   // Q15가 남았다
    await finishItem(h, Q15);
    expect(h.c.finish(h.id, COG.passageId)).toEqual({ status: 'DONE' });
    expect(h.store.count('PASSAGE_DONE')).toBe(1);
    expect(() => h.c.finish(h.id, COG.passageId)).toThrow(expect.objectContaining({ status: 409 }));
    await settle(h.c);
  });

  it('리뷰 대상이 없으면 판정이 모두 끝나는 즉시 다음 지문으로 갈 수 있고, 공개 여부와 상관없다', async () => {
    const h = harness({ [Q12]: 'SUPPORTED' });
    await answerPassage(h, COG, Object.fromEntries(COG.questionIds.map(q => [q, provided(correctChoice(q))])));
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ canFinish: false, judging: 5 });
    await settle(h.c);
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ canFinish: true, allRevealed: false });
    expect(h.c.finish(h.id, COG.passageId)).toEqual({ status: 'DONE' });
  });
});
