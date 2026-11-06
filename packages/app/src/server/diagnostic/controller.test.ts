import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { participantPosition, unitsForParagraph } from '@csat/pipeline';
import { DiagnosticController, DiagnosticHttpError, ITEM_REVIEW_LINE, OMITTED_WRONG_RATIONALE_LINE, type DiagnosticControllerOptions } from './controller.js';
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
const post = (h: Harness, q: string, body: unknown) => h.c.submitItem(h.id, q, body);
const selectionCalls = (h: Harness, q: string) => h.fb.calls.filter(call => call.questionId === q && call.mode === 'SELECTION').length;

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
    for (const q of COG.questionIds) expect(post(h, q, answers[q]!)).toEqual({ saved: true });
    expect(selectionCalls(h, Q12)).toBe(0);
    const done = h.c.answersDone(h.id, COG.passageId);
    expect(Object.keys(done)).toEqual(['position']); expect(done.position.answered).toBe(5);
    // 판정이 끝나기 전에는 pending
    expect(h.c.summaryCard(h.id, COG.passageId)).toEqual({ status: 'pending' });
    expect(() => h.c.feedbackView(h.id, Q12)).toThrow(DiagnosticHttpError);
    gate.release(); await settle(h.c);
    const card = h.c.summaryCard(h.id, COG.passageId) as Record<string, any>;
    expect(card).toMatchObject({ status: 'ready', correct: 3, total: 5, supported: 1, rationaleDenominator: 3, omitted: 2, checking: 0 });
    expect(JSON.stringify(card)).not.toContain('answerPosition');
    // 피드백 차례: 이어 주는 말풍선, INSTANT 없음
    expect(h.c.progress(h.id).passages[0]!.status).toBe('FEEDBACK');
    expect(h.c.progress(h.id).current).toEqual({ passageId: COG.passageId, questionId: Q12 });
    expect(() => h.c.feedbackView(h.id, Q13)).toThrow(DiagnosticHttpError);
    const v12 = h.c.feedbackView(h.id, Q12);
    const chosen = '①②③④⑤'[bundleChosenPosition(Q12)];
    expect(v12.transcript[0]!.text).toBe(`첫번째 문항으로 돌아가 볼게. ${chosen}번을 골랐네.`);
    expect(v12.transcript.some(m => m.sequence === 'INSTANT')).toBe(false);
    expect(v12.phase).toBe('COMPLETED'); expect(h.c.progress(h.id).current!.questionId).toBe(Q13);
    const v13 = await finishItem(h, Q13);
    expect(v13.transcript[0]!.text).toContain('두번째 문항으로 돌아가 볼게.'); expect(v13.transcript.some(m => m.sequence === 'INSTANT')).toBe(false);
    for (const q of [Q14, Q15, Q16]) await finishItem(h, q);
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
    await finishItem(h, Q12); await finishItem(h, Q13); await finishItem(h, Q14);
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

  it('ITEM_REVIEW 문항은 고정 문장 뒤 다음 문항으로 가고, boundary 문항은 checking, 오답 + SUPPORTED는 reviewFlag다', async () => {
    const h = harness({ [Q12]: 'BOUNDARY', [Q13]: 'SUPPORTED' });   // Q13은 오답 + SUPPORTED
    await answerPassage(h, COG, mixed()); await settle(h.c);
    const card = h.c.summaryCard(h.id, COG.passageId) as Record<string, any>;
    expect(card).toMatchObject({ status: 'ready', checking: 1, rationaleDenominator: 2, supported: 1, omitted: 2 });   // Q12 확인 중, Q13 분모 포함·적절 아님, Q16 적절
    expect(card.items.find((i: any) => i.questionId === Q12).quality).toBe('CHECKING');
    expect(card.items.find((i: any) => i.questionId === Q13).quality).toBe('NOT_SUPPORTED');
    const stored = h.store.load(h.id)!;
    expect(stored.items[Q12]!.reviewFlag).toBe('BOUNDARY'); expect(stored.items[Q13]!.reviewFlag).toBe('WRONG_SUPPORTED');
    expect(h.store.count('ITEM_REVIEW_FLAGGED')).toBe(2);
    // 문항 검토 문항은 사고 진단을 부르지 않는다(정답 + boundary). Q16(정답 + SUPPORTED)도 0회, 오답(Q13)은 판정 전에 시작해 호출될 수 있다.
    expect(h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId)).not.toContain(Q12);
    const v12 = h.c.feedbackView(h.id, Q12);
    expect(v12.phase).toBe('ITEM_REVIEW'); expect(v12.message).toBe(ITEM_REVIEW_LINE);
    expect(v12.transcript.filter(m => m.phase === 'ITEM_REVIEW').map(m => m.text)).toEqual([ITEM_REVIEW_LINE]);
    expect(h.c.progress(h.id).current!.questionId).toBe(Q13);
    expect(JSON.stringify(v12)).not.toContain('"answer":{');
    // 결과 화면에서도 정답·근거 원문이 없다
    const result = h.c.result(h.id);
    for (const q of [Q12, Q13]) {
      const item = result.items.find(i => i.questionId === q)!;
      expect(item).toMatchObject({ review: true, answerPosition: null, evidence: null, twist: null, thoughtDiagnosis: null });
      expect(typeof item.correct).toBe('boolean'); expect(item.megastudy.chosenPercents).toHaveLength(2);
      expect(JSON.stringify(item.megastudy)).not.toContain('choicePercents');
    }
    expect(result.items.find(i => i.questionId === Q16)).toMatchObject({ review: false });
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
    const card = h.c.summaryCard(h.id, COG.passageId) as Record<string, any>;
    expect(card.items.find((i: any) => i.questionId === Q13).quality).toBe('NOT_SUPPORTED');   // 분모에 들어가고 적절로 세지 않음
    expect(card.rationaleDenominator).toBe(3);
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
  it('실패 → 자동 재시도 2회 → FAILED → checking. 피드백 차례에 RESUME으로 성공하면 READY가 되고 checking에서 빠지며 사고 진단 대상이 다시 정해진다', async () => {
    let allowed = false;
    const fb = feedbackFake({ behavior: q => { if (q === Q16 && !allowed) return 'THROW'; return q === Q16 ? 'INSUFFICIENT' : 'SUPPORTED'; } });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, mixed()); await settle(h.c);
    expect(selectionCalls(h, Q16)).toBe(3);
    expect(h.store.load(h.id)!.items[Q16]!.firstJudgment).toMatchObject({ status: 'FAILED', attempts: 3 });
    expect(h.store.count('JUDGMENT_FAILED')).toBe(3);
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ status: 'ready', checking: 1, rationaleDenominator: 2 });
    // 정답 문항은 판정 최종 실패 시 SUPPORTED가 아닌 것으로 보고 사고 진단을 돌린다.
    expect(h.diagnosis.requests.map(r => JSON.parse(r.input[0].content[0].text).source.questionId)).toContain(Q16);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q16)!.judgment.status).toBe('failed');
    // 피드백 차례까지 간 뒤 RESUME
    for (const q of [Q12, Q13, Q14, Q15]) await finishItem(h, q);
    const stuck = h.c.feedbackView(h.id, Q16);
    expect(stuck.phase).toBe('AWAITING_EVALUATION'); expect(stuck.evaluationStatus).toBe('RETRYABLE_ERROR');
    allowed = true;
    await h.c.feedbackSubmit(h.id, Q16, { transitionId: 'resume', expectedRevision: stuck.revision, command: { type: 'RESUME' } });
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q16]!.firstJudgment).toMatchObject({ status: 'READY', contentAssessment: 'INSUFFICIENT', boundary: 'NONE' });
    expect(h.c.summaryCard(h.id, COG.passageId)).toMatchObject({ checking: 0, rationaleDenominator: 3, supported: 1 });
    expect(h.c.result(h.id).items.find(i => i.questionId === Q16)!.judgment).toMatchObject({ status: 'ready', contentAssessment: 'INSUFFICIENT' });
  });

  it('RESUME으로 정답 문항이 SUPPORTED로 나오면 사고 진단 결과는 결과 화면에서 제외된다', async () => {
    let allowed = false;
    const fb = feedbackFake({ behavior: q => q === Q12 && !allowed ? 'THROW' : 'SUPPORTED' });
    const h = harness({}, {}, { fb });
    await answerPassage(h, COG, { ...mixed(), [Q13]: omitted(wrongChoice(Q13)) }); await settle(h.c);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q12)!.thoughtDiagnosis).toMatchObject({ status: 'ready' });
    const stuck = h.c.feedbackView(h.id, Q12); allowed = true;
    await h.c.feedbackSubmit(h.id, Q12, { transitionId: 'resume', expectedRevision: stuck.revision, command: { type: 'RESUME' } });
    await settle(h.c);
    expect(h.c.result(h.id).items.find(i => i.questionId === Q12)!.thoughtDiagnosis).toBeNull();
    expect(h.c.result(h.id).steps.denominator).toBe(0);
  });
});

describe('답 고치기', () => {
  it('answers-done 전 재제출은 덮어쓰기이고 판정 호출 0회. answers-done 때 마지막 답으로 판정이 한꺼번에 시작하고, 뒤의 재제출은 409다', async () => {
    const h = harness();
    h.c.start(h.id, COG.passageId, { summary: false });
    post(h, Q12, provided(wrongChoice(Q12)));
    post(h, Q12, provided(correctChoice(Q12)));
    for (const q of [Q13, Q14, Q15, Q16]) post(h, q, provided(correctChoice(q)));
    await settle(h.c);
    expect(h.fb.calls).toHaveLength(0);
    expect(h.store.events.filter(e => e.type === 'ITEM_SUBMITTED' && e.questionId === Q12).map(e => e.revisionOfDraft)).toEqual([0, 1]);
    expect(() => h.c.answersDone(h.id, HORSE.passageId)).toThrow(DiagnosticHttpError);
    h.c.answersDone(h.id, COG.passageId);
    expect(h.fb.calls.filter(call => call.mode === 'SELECTION')).toHaveLength(5);   // 한꺼번에 시작(동기 구간에서 모두 호출)
    expect(h.store.load(h.id)).not.toBeNull();
    await settle(h.c);
    expect(h.store.load(h.id)!.items[Q12]!.first!.choiceId).toBe(correctChoice(Q12));
    expect(() => post(h, Q12, provided(wrongChoice(Q12)))).toThrow(expect.objectContaining({ status: 409 }));
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
    for (const q of COG.questionIds) c.submitItem(id, q, q === Q14 || q === Q15 ? omitted(correctChoice(q)) : provided(q === Q13 ? wrongChoice(q) : correctChoice(q)));
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
    for (const q of COG.questionIds) first.submitItem(id, q, q === Q14 ? omitted(correctChoice(q)) : provided(q === Q13 || q === Q15 ? wrongChoice(q) : correctChoice(q)));
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
    expect(second.feedbackView(id, Q12).transcript[0]!.text).toContain('돌아가 볼게');   // 세션도 이어 받음
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
    post(h, Q12, provided(choiceId(2))); post(h, Q12, omitted(choiceId(3)));
    const view = h.c.answerDrafts(h.id, COG.passageId);
    expect(view.questions.map(q => q.questionId)).toEqual(COG.questionIds);
    expect(view.drafts[Q12]).toEqual({ choiceId: choiceId(3), rationale: { mode: 'OMITTED' } });
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
