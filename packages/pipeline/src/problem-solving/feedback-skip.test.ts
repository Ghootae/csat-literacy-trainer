import { describe, expect, it } from 'vitest';
import { applyFeedbackAssessment, createFeedbackSession, feedbackPublicView, submitFeedbackCommand, type FeedbackSession } from './feedback.js';
import { CORRECT_END_INSTRUCTIONS, INCORRECT_END_INSTRUCTIONS } from './feedback-end-explanation.js';
import type { SourceDirectProblemBundle } from './source-direct-evaluator.js';

const source: SourceDirectProblemBundle = {
  schemaVersion: 'source-direct-problem-bundle-v2', questionId: 'Q', questionNumber: 1, passageId: 'P',
  title: '테스트', exam: '테스트', passage: '중복 게시로 여론이 왜곡될 수 있다.', stem: '옳지 않은 것은?',
  stemPolarity: 'SELECT_INCORRECT', scenario: '', media: [],
  choices: [{ choiceId: 'C1', position: 1, text: '우려를 뒷받침한다.' }, { choiceId: 'C2', position: 2, text: '틀린 진술이다.' }],
  answerChoiceId: 'C2', officialExplanation: '정답 해설: 서로 다른 시민의 견해가 아닐 수 있으므로 왜곡이다.',
};
const text = '중복 게시로 여론이 왜곡될 수 있다.';
const selectCommand = (choiceId: string, provided: boolean) =>
  ({ type: 'SELECT', choiceId, rationale: provided ? { mode: 'PROVIDED', text } : { mode: 'OMITTED' } });
function errorAssessment(s: FeedbackSession) {
  const o = s.observations.at(-1)!;
  const studentEvidence = [{ observationId: o.observationId, quote: text }];
  const sourceEvidence = [{ location: 'PASSAGE', quote: source.passage, mediaId: null, visualObservation: null }];
  return { mode: 'SELECTION', boundary: 'NONE', reason: '근거를 재구성', reconstructability: 'RECONSTRUCTABLE', reconstructedPath: [text],
    rationaleImpliedVerdict: s.choiceImpliedVerdict, contentAssessment: 'ERROR', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
    errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '오류', studentEvidence, sourceEvidence, basis: 'STATED', question: '다시 살펴볼까요?' }],
    errorHypothesis: null, selectionMismatchQuestion: null };
}
const start = () => createFeedbackSession('S', source);

describe('SKIP 명령', () => {
  it('근거 요청 단계(오답 근거 생략)에서 건너뛰면 SKIPPED로 끝나고 COACHING_TERMINATED다', () => {
    let s = submitFeedbackCommand(start(), selectCommand('C1', false), 'o1');
    expect(s.phase).toBe('AWAITING_RATIONALE');
    s = submitFeedbackCommand(s, { type: 'SKIP' }, 'o2');
    expect(s.phase).toBe('AWAITING_END_START'); expect(s.pendingEnd).toEqual({ endReason: 'SKIPPED', outcome: 'COACHING_TERMINATED' });
    expect(s.observations.at(-1)?.command).toEqual({ type: 'SKIP' });
  });
  it('교정 질문 단계에서 건너뛰면 활성 오류를 skipped로 표시한다', () => {
    let s = submitFeedbackCommand(start(), selectCommand('C1', true), 'o1');
    s = applyFeedbackAssessment(s, errorAssessment(s));
    expect(s.phase).toBe('AWAITING_CORRECTION');
    s = submitFeedbackCommand(s, { type: 'SKIP' }, 'o2');
    expect(s.pendingEnd).toEqual({ endReason: 'SKIPPED', outcome: 'COACHING_TERMINATED' }); expect(s.errors[0]!.skipped).toBe(true);
    expect(s.phase).toBe('AWAITING_END_START');
  });
  it('다시 고르기 단계에서 건너뛰고, 마지막 선택이 정답이면 UNVERIFIED_CORRECT다', () => {
    // 첫 선택 C2(정답)는 교정 질문으로 가기 어려우므로 오답 → 교정 성공 뒤 다시 고르기 흐름을 만들 수 없는 최소 세션에서 단계만 바꿔 확인한다.
    const s = submitFeedbackCommand(start(), selectCommand('C2', true), 'o1');
    const reselecting: FeedbackSession = { ...structuredClone(s), phase: 'AWAITING_RESELECTION', evaluationMode: null };
    const next = submitFeedbackCommand(reselecting, { type: 'SKIP' }, 'o2');
    expect(next.pendingEnd).toEqual({ endReason: 'SKIPPED', outcome: 'UNVERIFIED_CORRECT' });
  });
  it('허용되지 않은 단계에서는 오류다', () => {
    const fresh = start();
    expect(() => submitFeedbackCommand(fresh, { type: 'SKIP' }, 'o1')).toThrow('지금은 건너뛸 수 없습니다.');
    const evaluating = submitFeedbackCommand(start(), selectCommand('C1', true), 'o1');
    expect(evaluating.phase).toBe('AWAITING_EVALUATION');
    expect(() => submitFeedbackCommand(evaluating, { type: 'SKIP' }, 'o2')).toThrow('지금은 건너뛸 수 없습니다.');
  });
  it('건너뛴 문항은 설명을 거쳐 끝나고 result.skipped가 true다(건너뛰지 않으면 false)', () => {
    let s = submitFeedbackCommand(start(), selectCommand('C1', false), 'o1');
    s = submitFeedbackCommand(s, { type: 'SKIP' }, 'o2');
    s = submitFeedbackCommand(s, { type: 'END_START', accept: false }, 'o3');
    expect(s.phase).toBe('COMPLETED'); expect(s.result?.skipped).toBe(true); expect(s.result?.outcome).toBe('COACHING_TERMINATED');
    expect(feedbackPublicView(s).result?.skipped).toBe(true);
    let plain = submitFeedbackCommand(start(), selectCommand('C1', false), 'p1');
    plain = submitFeedbackCommand(plain, { type: 'RATIONALE', rationale: { mode: 'OMITTED' } }, 'p2');
    plain = submitFeedbackCommand(plain, { type: 'END_START', accept: false }, 'p3');
    expect(plain.result?.skipped).toBe(false);
  });
  it('마지막 설명 지시문에 SKIPPED 정의가 한 문장씩 들어 있다', () => {
    const sentence = 'SKIPPED는 학생이 질문에 답하지 않고 이 문항을 건너뛴 것이다.';
    expect(INCORRECT_END_INSTRUCTIONS.split(sentence)).toHaveLength(2); expect(CORRECT_END_INSTRUCTIONS.split(sentence)).toHaveLength(2);
  });
});
