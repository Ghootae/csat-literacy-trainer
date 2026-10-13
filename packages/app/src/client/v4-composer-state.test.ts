import { describe, expect, it } from 'vitest';
import type { FeedbackV4WorkbenchView } from '../shared/problem-feedback-v4.js';
import { composerState, sequenceState, instantWaitingDelay, waitingKind, waitingText, type ComposerLocal, type WaitingKind } from './v4-composer-state.js';
const view = (phase: FeedbackV4WorkbenchView['phase']): FeedbackV4WorkbenchView => ({
  phase, evaluationStatus: 'IDLE', evaluationError: null, selectedChoiceId: 'C1',
  postRepairOptions: ['RESELECT', 'REQUEST_EXPLANATION'],
  question: { choices: [1, 2, 3, 4, 5].map(position => ({ choiceId: `C${position}`, position, text: '' })) },
} as FeedbackV4WorkbenchView);
const local: ComposerLocal = { choice: 'C2', draft: '근거', omit: false, waiting: false, pending: false, error: '' };
describe('composerState', () => {
  it.each([
    ['AWAITING_SELECTION', true, true, '정답만 입력', ['선택·근거 전송']],
    ['AWAITING_RATIONALE', false, true, '근거 미제출', ['근거 전송']],
    ['AWAITING_CORRECTION', false, true, null, ['답변 전송']],
    ['AWAITING_POST_REPAIR_CHOICE', false, false, null, ['다시 선택', '코칭 보기']],
    ['AWAITING_RESELECTION', true, true, '정답만 입력', ['선택·근거 전송']],
    ['COMPLETED', false, false, null, ['같은 문제 다시 풀기', '학습 맵으로 돌아가기 →']],
    ['ITEM_REVIEW', false, false, null, []],
    ['AWAITING_EVALUATION', false, false, null, []],
  ] as const)('%s has all four rows with the contracted controls', (phase, choices, input, check, labels) => {
    const state = composerState(view(phase), local);
    expect(Object.keys(state)).toEqual(['notice', 'choices', 'input', 'actions']);
    expect(state.choices).toHaveLength(5);
    expect(state.choices[1]?.disabled).toBe(!choices);
    expect(state.input.disabled).toBe(!input);
    expect(state.actions.check).toBe(check);
    expect(state.actions.buttons.map(b => b.label)).toEqual(labels);
    if (phase === 'AWAITING_RATIONALE' || phase === 'AWAITING_CORRECTION') expect(state.choices[0]?.pressed).toBe(true);
  });
  it('blocks the original choice without pressed styling on reselection', () => {
    const state = composerState(view('AWAITING_RESELECTION'), { ...local, choice: null, draft: '' });
    expect(state.choices[0]).toMatchObject({ disabled: true, pressed: false, gray: true });
    expect(state.choices.slice(1).every(c => !c.disabled && !c.pressed)).toBe(true);
    expect(state.actions.buttons[0]?.disabled).toBe(true);
    expect(composerState(view('AWAITING_RESELECTION'), { ...local, choice: 'C1' }).actions.buttons[0]?.disabled).toBe(true);
  });
  it('uses postRepairOptions order for correct sessions', () => {
    const state = composerState({ ...view('AWAITING_POST_REPAIR_CHOICE'), postRepairOptions: ['REQUEST_EXPLANATION', 'FINISH'] }, local);
    expect(state.actions.buttons.map(b => b.label)).toEqual(['설명 보기', '마치기']);
  });
  it.each(['AWAITING_SELECTION', 'AWAITING_RATIONALE', 'AWAITING_CORRECTION', 'AWAITING_POST_REPAIR_CHOICE', 'AWAITING_RESELECTION'] as const)('waiting preserves %s controls while disabling them', phase => {
    const previousView = view(phase);
    const before = composerState(previousView, local);
    for (const pending of [false, true]) {
      const state = composerState({ ...view('AWAITING_EVALUATION'), evaluationStatus: 'PROCESSING' }, { ...local, waiting: true, pending, previousView });
      expect(state.actions.buttons.map(b => b.label)).toEqual(before.actions.buttons.map(b => b.label));
      expect(state.actions.buttons.every(b => b.disabled)).toBe(true);
      expect(state.choices.every(c => c.disabled)).toBe(true);
      expect(state.input.disabled).toBe(true);
      expect(state.actions.check).toBe(before.actions.check);
    }
  });
  it('retryable evaluation error keeps disabled input and puts retry in the action row', () => {
    const state = composerState({ ...view('AWAITING_EVALUATION'), evaluationStatus: 'RETRYABLE_ERROR', evaluationError: '評価失敗' }, local);
    expect(state.notice).toEqual({ text: '評価失敗', kind: 'error' });
    expect(state.input.disabled).toBe(true);
    expect(state.actions.buttons).toEqual([{ id: 'RESUME', label: '평가 다시 시도', disabled: false }]);
  });
  it('failed submission confirmation replaces only the primary actions', () => {
    const state = composerState(view('AWAITING_SELECTION'), { ...local, pending: true, error: '연결 실패' });
    expect(state.notice).toEqual({ text: '연결 실패', kind: 'error' });
    expect(state.input.disabled).toBe(true);
    expect(state.choices.every(c => c.disabled)).toBe(true);
    expect(state.actions.buttons).toEqual([{ id: 'RETRY', label: '같은 제출 다시 보내기', disabled: false }]);
  });
  it('notice follows error, review, correction, omission and reselection priority', () => {
    expect(composerState({ ...view('ITEM_REVIEW'), evaluationError: '서버 오류' }, { ...local, error: '로컬 오류' }).notice.text).toBe('로컬 오류');
    expect(composerState(view('ITEM_REVIEW'), local).notice.text).toBe('자료 검토가 필요한 문항입니다. 학생의 오류로 처리하지 않습니다.');
    expect(composerState(view('AWAITING_CORRECTION'), { ...local, omit: true }).notice.text).toBe('지금은 번호를 바꾸지 말고 질문에 답해 줘.');
    expect(composerState(view('AWAITING_RESELECTION'), local).notice.text).toBe('이번이 마지막 선택이야.');
    for (const phase of ['AWAITING_SELECTION', 'AWAITING_RESELECTION'] as const) expect(composerState(view(phase), { ...local, omit: true }).notice.text).toBe('틀리면 감점돼. 개발 버전에서는 실제로 깎지 않아.');
    expect(composerState(view('AWAITING_SELECTION'), local).notice.text).toBe('');
  });
  it('omission disables text but permits submission; correction requires written text', () => {
    const state = composerState(view('AWAITING_SELECTION'), { ...local, draft: '', omit: true });
    expect(state.input.disabled).toBe(true); expect(state.actions.buttons[0]?.disabled).toBe(false);
    expect(composerState(view('AWAITING_CORRECTION'), { ...local, draft: '', omit: true }).actions.buttons[0]?.disabled).toBe(true);
  });
});
describe('waitingText', () => {
  const times = [0, 5999, 6000, 14999, 15000, 24999, 25000];
  const long = '조금 오래 걸리고 있어. 조금만 더 기다려 줘';
  const expected: Record<WaitingKind, string[]> = {
    ANSWER: ['네 근거를 읽고 있어', '네 근거를 읽고 있어', '원문이랑 하나씩 맞춰 보고 있어', '원문이랑 하나씩 맞춰 보고 있어', '어디서 판단이 갈렸는지 살펴보고 있어', '어디서 판단이 갈렸는지 살펴보고 있어', long],
    CORRECTION: ['네 답을 읽고 있어', '네 답을 읽고 있어', '아까 질문이랑 맞춰 보고 있어', '아까 질문이랑 맞춰 보고 있어', '아까 질문이랑 맞춰 보고 있어', '아까 질문이랑 맞춰 보고 있어', long],
    EXPLANATION: [...Array<string>(6).fill('설명을 정리하고 있어'), long],
    UNKNOWN: [...Array<string>(6).fill('네 답을 살펴보고 있어'), long],
  };
  for (const kind of Object.keys(expected) as WaitingKind[]) it.each(times.map((time, i) => [time, expected[kind][i]] as const))(`${kind} at %ims`, (time, text) => expect(waitingText(kind, time)).toBe(text));
  it('maps commands and reuses the preceding kind only for RESUME', () => {
    expect(waitingKind({ type: 'SELECT', choiceId: 'C1', rationale: { mode: 'OMITTED' } })).toBe('ANSWER');
    expect(waitingKind({ type: 'RATIONALE', rationale: { mode: 'OMITTED' } })).toBe('ANSWER');
    expect(waitingKind({ type: 'CORRECT', errorId: 'E1', text: '답' })).toBe('CORRECTION');
    expect(waitingKind({ type: 'REQUEST_EXPLANATION' })).toBe('EXPLANATION');
    expect(waitingKind({ type: 'RESUME' }, 'ANSWER')).toBe('ANSWER');
    for (const type of ['RESUME', 'RESELECT', 'FINISH'] as const) expect(waitingKind({ type })).toBe('UNKNOWN');
  });
});

describe('end sequence controls and pacing', () => {
  const messages = (kinds: ('GATE' | 'CONNECTOR' | 'SECTION' | 'QUESTION' | 'CLOSING')[]) => kinds.map((sequence, i) => ({ id: String(i), role: 'COACH' as const, text: '내용', phase: 'AWAITING_UNDERSTANDING' as const, sequence }));
  const coaching = messages(['CONNECTOR', 'SECTION', 'CONNECTOR', 'SECTION', 'CONNECTOR', 'SECTION', 'QUESTION']);
  it('paces every connector and section, pauses after choices, automatically asks after answer', () => {
    expect(sequenceState(coaching, 0)).toMatchObject({ visibleCount: 0, delayMs: 800, showDots: true });
    expect(sequenceState(coaching, 1)).toMatchObject({ visibleCount: 1, delayMs: 800 });
    for (const count of [2, 4]) {
      expect(sequenceState(coaching, count)).toMatchObject({ needsNext: true, delayMs: null, showDots: false });
      expect(sequenceState(coaching, count, false, true)).toMatchObject({ visibleCount: count, needsNext: false, delayMs: 800, showDots: true });
    }
    expect(sequenceState(coaching, 6)).toMatchObject({ needsNext: false, delayMs: 800 });
    expect(sequenceState(coaching, 7)).toMatchObject({ complete: true, delayMs: null });
  });
  it('reduced motion skips delay and dots while retaining both next boundaries', () => {
    expect(sequenceState(coaching, 0, true)).toMatchObject({ visibleCount: 2, needsNext: true, showDots: false, delayMs: null });
    expect(sequenceState(coaching, 2, true, true)).toMatchObject({ visibleCount: 4, needsNext: true, showDots: false });
    expect(sequenceState(coaching, 4, true, true)).toMatchObject({ visibleCount: 7, complete: true, showDots: false });
  });
  it('restored entries and closing appear immediately', () => {
    expect(sequenceState(coaching, coaching.length)).toMatchObject({ complete: true, visibleCount: 7 });
    expect(sequenceState(messages(['CLOSING']), 0)).toMatchObject({ complete: true, visibleCount: 1 });
    expect(sequenceState(messages(['GATE', 'GATE']), 0, true)).toMatchObject({ complete: true, visibleCount: 2 });
  });
  it.each([false, true])('gate buttons wait for both bubbles, complete=%s', complete => {
    const state = composerState(view('AWAITING_END_START'), { ...local, sequence: { complete, needsNext: false } });
    expect(state.actions.buttons.map(b => [b.id, b.label, b.disabled])).toEqual([['END_YES', '응', !complete], ['END_NO', '아니', !complete]]);
    expect(state.choices.every(c => c.disabled)).toBe(true); expect(state.input.disabled).toBe(true); expect(state.actions.check).toBeNull();
  });
  it('next is enabled only at a choice boundary; automatic pacing keeps prior buttons disabled', () => {
    const next = composerState(view('AWAITING_UNDERSTANDING'), { ...local, sequence: { complete: false, needsNext: true } });
    expect(next.actions.buttons).toEqual([{ id: 'NEXT', label: '다음으로 넘어가기', disabled: false }]);
    const automatic = composerState(view('AWAITING_UNDERSTANDING'), { ...local, sequence: { complete: false, needsNext: false }, previousButtons: next.actions.buttons });
    expect(automatic.actions.buttons).toEqual([{ id: 'NEXT', label: '다음으로 넘어가기', disabled: true }]);
    const question = composerState(view('AWAITING_UNDERSTANDING'), { ...local, sequence: { complete: true, needsNext: false } });
    expect(question.actions.buttons.map(b => [b.id, b.label, b.disabled])).toEqual([['UNDERSTOOD_YES', '응', false], ['UNDERSTOOD_NO', '아니', false]]);
    expect(question.input.disabled).toBe(true); expect(question.choices.every(c => c.disabled)).toBe(true);
  });
  it('accepting the gate waits for explanation while retaining disabled yes/no controls', () => {
    expect(waitingKind({ type: 'END_START', accept: true })).toBe('EXPLANATION');
    const before = view('AWAITING_END_START');
    const state = composerState({ ...view('AWAITING_EVALUATION'), evaluationStatus: 'PROCESSING' }, { ...local, waiting: true, previousView: before });
    expect(state.actions.buttons.map(b => [b.label, b.disabled])).toEqual([['응', true], ['아니', true]]);
  });
});


it('reveals INSTANT without delay and delays waiting by 800ms unless motion is reduced', () => {
  const messages = [{ id: 'instant', role: 'COACH' as const, phase: 'AWAITING_EVALUATION' as const, sequence: 'INSTANT' as const, text: '정답이야! 근거도 같이 살펴볼게.' }];
  expect(sequenceState(messages, 0, false, false).visibleCount).toBe(1);
  expect(instantWaitingDelay(false)).toBe(800);
  expect(instantWaitingDelay(true)).toBe(0);
});
