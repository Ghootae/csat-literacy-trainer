import type { FeedbackV4Message, FeedbackV4Request, FeedbackV4WorkbenchView } from '../shared/problem-feedback-v4.js';

export type WaitingKind = 'ANSWER' | 'CORRECTION' | 'EXPLANATION' | 'UNKNOWN';
export function waitingKind(command: FeedbackV4Request['command'], previous: WaitingKind = 'UNKNOWN'): WaitingKind {
  switch (command.type) {
    case 'SELECT': case 'RATIONALE': return 'ANSWER';
    case 'CORRECT': return 'CORRECTION';
    case 'REQUEST_EXPLANATION': return 'EXPLANATION';
    case 'END_START': return command.accept ? 'EXPLANATION' : 'UNKNOWN';
    case 'RESUME': return previous;
    default: return 'UNKNOWN';
  }
}
export function waitingText(kind: WaitingKind, elapsedMs: number): string {
  if (elapsedMs >= 25000) return '조금 오래 걸리고 있어. 조금만 더 기다려 줘';
  if (kind === 'ANSWER') return elapsedMs >= 15000 ? '어디서 판단이 갈렸는지 살펴보고 있어' : elapsedMs >= 6000 ? '원문이랑 하나씩 맞춰 보고 있어' : '네 근거를 읽고 있어';
  if (kind === 'CORRECTION') return elapsedMs >= 6000 ? '아까 질문이랑 맞춰 보고 있어' : '네 답을 읽고 있어';
  if (kind === 'EXPLANATION') return '설명을 정리하고 있어';
  return '네 답을 살펴보고 있어';
}
export type ButtonId = 'SUBMIT' | 'RESELECT' | 'REQUEST_EXPLANATION' | 'FINISH' | 'RESUME' | 'RETRY' | 'RESTART' | 'RETURN' | 'END_YES' | 'END_NO' | 'UNDERSTOOD_YES' | 'UNDERSTOOD_NO' | 'NEXT';
export interface ComposerLocal {
  choice: string | null; draft: string; omit: boolean; waiting: boolean; pending: boolean; error: string;
  previousView?: FeedbackV4WorkbenchView | null;
  sequence?: { complete: boolean; needsNext: boolean };
  previousButtons?: { id: ButtonId; label: string; disabled: boolean }[];
}
export function composerState(view: FeedbackV4WorkbenchView, local: ComposerLocal) {
  const base = (local.waiting || local.pending) && view.phase === 'AWAITING_EVALUATION' ? local.previousView ?? view : view;
  const selection = base.phase === 'AWAITING_SELECTION' || base.phase === 'AWAITING_RESELECTION';
  const rationale = base.phase === 'AWAITING_RATIONALE';
  const correction = base.phase === 'AWAITING_CORRECTION';
  const locked = local.waiting || local.pending || view.evaluationStatus === 'RETRYABLE_ERROR';
  const writable = !locked && (selection || rationale || correction);
  const canSubmit = writable && (!selection || (local.choice !== null && !(base.phase === 'AWAITING_RESELECTION' && local.choice === base.selectedChoiceId))) && (correction ? !!local.draft.trim() : local.omit || !!local.draft.trim());
  const buttons: { id: ButtonId; label: string; disabled: boolean }[] = [];
  if (selection || rationale || correction) buttons.push({ id: 'SUBMIT', label: correction ? '답변 전송' : rationale ? '근거 전송' : '선택·근거 전송', disabled: !canSubmit });
  if (base.phase === 'AWAITING_POST_REPAIR_CHOICE') for (const id of base.postRepairOptions ?? []) buttons.push({ id, label: id === 'RESELECT' ? '다시 선택' : id === 'FINISH' ? '마치기' : base.postRepairOptions?.includes('RESELECT') ? '코칭 보기' : '설명 보기', disabled: locked });
  if (base.phase === 'AWAITING_END_START') buttons.push({ id: 'END_YES', label: '응', disabled: locked || local.sequence?.complete === false }, { id: 'END_NO', label: '아니', disabled: locked || local.sequence?.complete === false });
  if (base.phase === 'AWAITING_UNDERSTANDING') {
    if (local.sequence?.complete !== false) buttons.push({ id: 'UNDERSTOOD_YES', label: '응', disabled: locked }, { id: 'UNDERSTOOD_NO', label: '아니', disabled: locked });
    else if (local.sequence.needsNext) buttons.push({ id: 'NEXT', label: '다음으로 넘어가기', disabled: locked });
    else buttons.push(...(local.previousButtons ?? [{ id: 'NEXT' as const, label: '다음으로 넘어가기', disabled: true }]).map(b => ({ ...b, disabled: true })));
  }
  if (base.phase === 'COMPLETED') buttons.push({ id: 'RESTART', label: '같은 문제 다시 풀기', disabled: locked }, { id: 'RETURN', label: '학습 맵으로 돌아가기 →', disabled: locked });
  if (local.pending && !local.waiting) buttons.splice(0, buttons.length, { id: 'RETRY', label: '같은 제출 다시 보내기', disabled: false });
  else if (view.evaluationStatus === 'RETRYABLE_ERROR' && !local.pending) buttons.splice(0, buttons.length, { id: 'RESUME', label: '평가 다시 시도', disabled: local.waiting });
  const error = local.error || view.evaluationError;
  const notice = error || (base.phase === 'ITEM_REVIEW' ? '자료 검토가 필요한 문항입니다. 학생의 오류로 처리하지 않습니다.' : correction ? '지금은 번호를 바꾸지 말고 질문에 답해 줘.' : selection && local.omit ? '틀리면 감점돼. 개발 버전에서는 실제로 깎지 않아.' : base.phase === 'AWAITING_RESELECTION' ? '이번이 마지막 선택이야.' : '');
  return {
    notice: { text: notice, kind: error ? 'error' as const : 'info' as const },
    choices: view.question.choices.map(c => {
      const blocked = base.phase === 'AWAITING_RESELECTION' && c.choiceId === base.selectedChoiceId;
      const disabled = !selection || locked || blocked;
      return { choiceId: c.choiceId, position: c.position, disabled, pressed: !blocked && c.choiceId === (selection ? local.choice : base.selectedChoiceId), gray: disabled };
    }),
    input: { disabled: !writable || (!correction && local.omit), label: correction ? '질문에 대한 답변' : rationale ? '선택한 이유' : base.phase === 'AWAITING_RESELECTION' ? '다시 선택한 이유' : '선택한 이유를 적어 줘', placeholder: correction ? '생각이 어떻게 달라졌는지 적어 줘.' : '이 선지를 고른 이유를 적어 줘.' },
    actions: { check: selection ? '정답만 입력' : rationale ? '근거 미제출' : null, checkDisabled: !writable, buttons },
  };
}

/** Restored entries start at messages.length; only newly received entries are paced. */
export function sequenceState(messages: FeedbackV4Message[], revealed: number, reducedMotion = false, released = false) {
  let visibleCount = Math.min(revealed, messages.length);
  const needsNextAt = (index: number) => messages[index - 1]?.sequence === 'SECTION' && messages[index]?.sequence === 'CONNECTOR';
  while (visibleCount < messages.length) {
    const next = messages[visibleCount]!;
    if (!next.sequence || next.sequence === 'INSTANT' || next.sequence === 'CLOSING') { visibleCount++; continue; }
    if (needsNextAt(visibleCount) && !released) break;
    if (!reducedMotion) break;
    visibleCount++; released = false;
  }
  const complete = visibleCount === messages.length;
  const needsNext = !complete && needsNextAt(visibleCount) && !released;
  return { visibleCount, complete, needsNext, delayMs: !complete && !needsNext ? (reducedMotion ? 0 : 800) : null,
    showDots: !reducedMotion && !complete && !needsNext };
}

export function instantWaitingDelay(reducedMotion: boolean): number { return reducedMotion ? 0 : 800; }
