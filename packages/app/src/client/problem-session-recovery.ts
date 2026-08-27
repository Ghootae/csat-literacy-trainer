import type { ProblemSessionView } from '../shared/contract.js';

export const PROBLEM_MUTATION_STALL_MS = 15_000;
export const PROBLEM_RECOVERY_POLL_MS = 1_000;

function sessionStateKey(session: ProblemSessionView): string {
  return JSON.stringify({
    phase: session.phase,
    selectedChoiceId: session.selectedChoiceId,
    action: session.action,
    reselectionPrompt: session.reselectionPrompt,
    result: session.result,
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 긴 evaluator POST가 서버에서는 끝났지만 터널 응답이 유실된 경우, GET 스냅샷으로
 * 진행된 상태를 회수한다. POST를 재시도하지 않으므로 같은 학생 행동을 중복 적용하지 않는다.
 */
export async function recoverProblemMutation(
  request: Promise<ProblemSessionView>,
  previous: ProblemSessionView,
  loadCurrent: () => Promise<ProblemSessionView>,
  options: { readonly stallMs?: number; readonly pollMs?: number } = {},
): Promise<ProblemSessionView> {
  const stallMs = options.stallMs ?? PROBLEM_MUTATION_STALL_MS;
  const pollMs = options.pollMs ?? PROBLEM_RECOVERY_POLL_MS;
  const previousKey = sessionStateKey(previous);
  const result = request.then(
    (value) => ({ kind: 'REQUEST' as const, value }),
    (error: unknown) => ({ kind: 'ERROR' as const, error }),
  );
  const first = await Promise.race([
    result,
    wait(stallMs).then(() => ({ kind: 'STALLED' as const })),
  ]);
  if (first.kind === 'REQUEST') return first.value;
  if (first.kind === 'ERROR') {
    const recovered = await loadCurrent().catch(() => null);
    if (recovered !== null && sessionStateKey(recovered) !== previousKey) return recovered;
    throw first.error;
  }

  for (;;) {
    const recovered = await Promise.race([
      result,
      loadCurrent().then(
        (value) => ({ kind: 'RECOVERY' as const, value }),
        () => ({ kind: 'UNCHANGED' as const }),
      ),
    ]);
    if (recovered.kind === 'REQUEST') return recovered.value;
    if (recovered.kind === 'ERROR') {
      const finalSnapshot = await loadCurrent().catch(() => null);
      if (finalSnapshot !== null && sessionStateKey(finalSnapshot) !== previousKey) return finalSnapshot;
      throw recovered.error;
    }
    if (recovered.kind === 'RECOVERY' && sessionStateKey(recovered.value) !== previousKey) {
      return recovered.value;
    }
    await wait(pollMs);
  }
}
