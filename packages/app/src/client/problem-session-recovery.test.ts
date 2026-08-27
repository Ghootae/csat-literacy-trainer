import { describe, expect, it } from 'vitest';

import type { ProblemSessionView } from '../shared/contract.js';
import { recoverProblemMutation } from './problem-session-recovery.js';

function view(phase: ProblemSessionView['phase']): ProblemSessionView {
  return {
    sessionId: 'S1',
    learningSessionId: 'S1',
    phase,
    content: {
      questionId: 'Q1', passageId: 'P1', exam: '시험', title: '제목', passage: '지문',
      stem: '발문', scenario: '보기', image: null, choices: [],
    },
    selectedChoiceId: 'C2',
    action: phase === 'AWAITING_RESPONSE' ? { kind: 'COACHING', text: '설명' } : null,
    reselectionPrompt: phase === 'AWAITING_RESELECTION' ? '다시 선택해 주세요.' : null,
    transcript: [],
    questionBudget: { used: 0, maximum: 2 },
    result: null,
  };
}

describe('problem mutation recovery', () => {
  it('POST 응답이 유실되어도 진행된 서버 스냅샷으로 재선택 상태를 복구한다', async () => {
    const never = new Promise<ProblemSessionView>(() => undefined);
    const recovered = await recoverProblemMutation(
      never,
      view('AWAITING_RESPONSE'),
      async () => view('AWAITING_RESELECTION'),
      { stallMs: 0, pollMs: 0 },
    );

    expect(recovered.phase).toBe('AWAITING_RESELECTION');
    expect(recovered.reselectionPrompt).toBe('다시 선택해 주세요.');
  });

  it('실패 응답 뒤 서버가 진행되지 않았으면 원래 오류를 보존한다', async () => {
    const failure = new Error('터널 응답 실패');
    await expect(recoverProblemMutation(
      Promise.reject(failure),
      view('AWAITING_RESPONSE'),
      async () => view('AWAITING_RESPONSE'),
      { stallMs: 0, pollMs: 0 },
    )).rejects.toBe(failure);
  });
});
