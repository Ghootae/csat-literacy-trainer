import { describe, expect, it } from 'vitest';
import type { FeedbackWorkbenchView } from '../shared/problem-feedback.js';
import { bubbleLines, pickLine } from '../shared/bubble-lines.js';
import { bubbleDelayMs } from './bubble-pacing.js';
import { composerState, sequenceState, waitingKind, waitingText, type ComposerLocal, type WaitingKind } from './problem-composer-state.js';
const view = (phase: FeedbackWorkbenchView['phase']): FeedbackWorkbenchView => ({
  phase, evaluationStatus: 'IDLE', evaluationError: null, selectedChoiceId: 'C1',
  postRepairOptions: ['RESELECT', 'REQUEST_EXPLANATION'],
  question: { choices: [1, 2, 3, 4, 5].map(position => ({ choiceId: `C${position}`, position, text: '' })) },
} as FeedbackWorkbenchView);
const local: ComposerLocal = { choice: 'C2', draft: '근거', omit: false, waiting: false, pending: false, error: '' };
describe('composerState', () => {
  it.each([
    ['AWAITING_SELECTION', true, true, '정답만 입력', ['제출']],
    ['AWAITING_RATIONALE', false, true, '근거 미제출', ['제출']],
    ['AWAITING_CORRECTION', false, true, null, ['답변 전송']],
    ['AWAITING_POST_REPAIR_CHOICE', false, false, null, ['다시 선택', '코칭 보기']],
    ['AWAITING_RESELECTION', true, true, '정답만 입력', ['제출']],
    ['COMPLETED', false, false, null, ['다시 풀기']],
    ['ITEM_REVIEW', false, false, null, []],
    ['AWAITING_EVALUATION', false, false, null, []],
  ] as const)('%s has all four rows with the contracted controls', (phase, choices, input, check, labels) => {
    const state = composerState(view(phase), local);
    expect(Object.keys(state)).toEqual(['status', 'notice', 'choices', 'input', 'actions']);
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
  it('puts restart before the single strategy next button, which stays rightmost and is enabled only while reading', () => {
    const labels = (strategy?: ComposerLocal['strategy'], phase: FeedbackWorkbenchView['phase'] = 'COMPLETED') => composerState(view(phase), { ...local, strategy }).actions.buttons.map(b => b.label);
    expect(labels()).toEqual(['다시 풀기']);
    expect(labels({ stage: 'INTRO', position: null })).toEqual(['다시 풀기', '다음']);
    expect(labels({ stage: 'READING', position: 2 })).toEqual(['다시 풀기', '다음']);
    expect(labels({ stage: 'ENDED', position: 2 })).toEqual(['다시 풀기', '다음']);
    const next = (stage: 'INTRO' | 'READING' | 'ENDED') => composerState(view('COMPLETED'), { ...local, strategy: { stage, position: stage === 'INTRO' ? null : 2 } }).actions.buttons.map(b => [b.id, b.disabled]);
    expect(next('INTRO')).toEqual([['RESTART', false], ['STRATEGY_NEXT', true]]);
    expect(next('READING')).toEqual([['RESTART', false], ['STRATEGY_NEXT', false]]);
    expect(next('ENDED')).toEqual([['RESTART', false], ['STRATEGY_NEXT', true]]);
    expect(labels({ stage: 'READING', position: 2 })).not.toContain('전략 보기');
    expect(labels({ stage: 'INTRO', position: null }, 'AWAITING_SELECTION')).toEqual(['제출']);
    expect(composerState(view('COMPLETED'), local).actions).not.toHaveProperty('strategyChoices');
  });
  it('status line: chosen choice while solving, strategy choice while reading, otherwise empty; notice stays separate', () => {
    expect(composerState(view('AWAITING_SELECTION'), { ...local, choice: null }).status).toEqual({ text: '문제에서 답을 골라 줘', canChange: false });
    expect(composerState(view('AWAITING_SELECTION'), local).status).toEqual({ text: '②번을 골랐어', canChange: true });
    expect(composerState(view('AWAITING_SELECTION'), { ...local, pending: true, waiting: true }).status.canChange).toBe(false);
    expect(composerState(view('COMPLETED'), { ...local, strategy: { stage: 'READING', position: 2 } }).status).toEqual({ text: '② 전략', canChange: false });
    expect(composerState(view('COMPLETED'), { ...local, strategy: { stage: 'ENDED', position: 2 } }).status.text).toBe('');
    expect(composerState(view('COMPLETED'), local).status.text).toBe('');
    expect(composerState(view('AWAITING_CORRECTION'), local).status.text).toBe('');
  });
});
describe('waitingText', () => {
  const times = [0, 5999, 6000, 14999, 15000, 24999, 25000];
  const sets = bubbleLines;
  const expected: Record<WaitingKind, (readonly string[])[]> = {
    ANSWER: [sets.answerEarly, sets.answerEarly, sets.answerMid, sets.answerMid, sets.answerLate, sets.answerLate, sets.long],
    CORRECTION: [sets.correctionEarly, sets.correctionEarly, sets.correctionLate, sets.correctionLate, sets.correctionLate, sets.correctionLate, sets.long],
    EXPLANATION: [...Array<readonly string[]>(6).fill(sets.explanation), sets.long],
    UNKNOWN: [...Array<readonly string[]>(6).fill(sets.unknown), sets.long],
  };
  for (const kind of Object.keys(expected) as WaitingKind[]) it.each(times.map((time, i) => [time, expected[kind][i]!] as const))(`${kind} at %ims picks from its set and is stable per key`, (time, set) => {
    for (const key of ['T1', 'T2', 'T3', 'T4']) {
      expect(set).toContain(waitingText(kind, time, key));
      expect(waitingText(kind, time, key)).toBe(waitingText(kind, time, key));
      expect(waitingText(kind, time, key)).toBe(pickLine(set, key));
    }
  });
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
    expect(sequenceState(coaching, 0)).toMatchObject({ visibleCount: 0, delayMs: 1200, showDots: true });
    expect(sequenceState(coaching, 1)).toMatchObject({ visibleCount: 1, delayMs: bubbleDelayMs('내용') });
    for (const count of [2, 4]) {
      expect(sequenceState(coaching, count)).toMatchObject({ needsNext: true, delayMs: null, showDots: false });
      expect(sequenceState(coaching, count, false, true)).toMatchObject({ visibleCount: count, needsNext: false, delayMs: bubbleDelayMs('내용'), showDots: true });
    }
    expect(sequenceState(coaching, 6)).toMatchObject({ needsNext: false, delayMs: bubbleDelayMs('내용') });
    expect(sequenceState(coaching, 7)).toMatchObject({ complete: true, delayMs: null });
  });
  it('reduced motion keeps the same pacing and boundaries and only drops the dots', () => {
    expect(sequenceState(coaching, 0, true)).toMatchObject({ visibleCount: 0, needsNext: false, showDots: false, delayMs: 1200 });
    expect(sequenceState(coaching, 2, true)).toMatchObject({ visibleCount: 2, needsNext: true, showDots: false, delayMs: null });
    expect(sequenceState(coaching, 2, true, true)).toMatchObject({ visibleCount: 2, needsNext: false, showDots: false, delayMs: bubbleDelayMs('내용') });
  });
  it('restored entries and closing appear immediately', () => {
    expect(sequenceState(coaching, coaching.length)).toMatchObject({ complete: true, visibleCount: 7 });
    expect(sequenceState(messages(['CLOSING']), 0)).toMatchObject({ complete: true, visibleCount: 1 });
    expect(sequenceState(messages(['GATE', 'GATE']), 2, true)).toMatchObject({ complete: true, visibleCount: 2 });
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


it('reveals INSTANT without delay; the next bubble waits for a delay that grows with the previous text', () => {
  const messages = [{ id: 'instant', role: 'COACH' as const, phase: 'AWAITING_EVALUATION' as const, sequence: 'INSTANT' as const, text: '정답이야! 근거도 같이 살펴볼게.' },
    { id: 'gate', role: 'COACH' as const, phase: 'AWAITING_END_START' as const, sequence: 'GATE' as const, text: '정답은 ⑤번이야.' }];
  expect(sequenceState(messages, 0, false, false)).toMatchObject({ visibleCount: 1, delayMs: bubbleDelayMs(messages[0]!.text) });
  expect(sequenceState(messages, 0, true, false).delayMs).toBe(sequenceState(messages, 0, false, false).delayMs);
});
describe('bubbleDelayMs', () => {
  it('is 1200ms for empty or short text and caps at 2500ms', () => {
    expect(bubbleDelayMs('')).toBe(1200);
    expect(bubbleDelayMs('가'.repeat(10))).toBe(1300);
    expect(bubbleDelayMs('가'.repeat(130))).toBe(2500);
    expect(bubbleDelayMs('가'.repeat(1000))).toBe(2500);
  });
});
describe('pickLine', () => {
  const set = ['a', 'b', 'c'];
  it('is stable per key, covers the set across keys, and avoid moves to the next item', () => {
    expect(pickLine(set, 'T1')).toBe(pickLine(set, 'T1'));
    expect(new Set(Array.from({ length: 60 }, (_, i) => pickLine(set, `id-${i}`))).size).toBe(3);
    const picked = pickLine(set, 'T1');
    expect(pickLine(set, 'T1', picked)).toBe(set[(set.indexOf(picked) + 1) % 3]);
    expect(pickLine(set, 'T1', 'zzz')).toBe(picked);
  });
});
