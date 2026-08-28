import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  applyCorrectRationaleAssessment,
  applyProblemEvaluatorTurn,
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
  submitProblemReselection,
} from './session.js';

const episodeDir = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/episodes',
);

function fixture(name: string) {
  return JSON.parse(readFileSync(resolve(episodeDir, name), 'utf8')) as {
    turns: unknown[];
  };
}

function fresh(maxDiagnosticQuestions = 2) {
  return createProblemSolvingSession({
    sessionId: 'S1',
    questionId: 'mrna-vaccine-lipid-nanoparticle-q19',
    answerChoiceId: 'C5',
    maxDiagnosticQuestions,
  });
}

function wrongSession(maxDiagnosticQuestions = 2) {
  return submitInitialProblemResponse(fresh(maxDiagnosticQuestions), {
    initialChoiceId: 'C2',
    rationale: '속도를 조절하면 투입량이 달라져 균일하지 않을 것 같아요.',
  });
}

describe('pure problem solving session', () => {
  it('근거 없는 최초 정답을 독립 정답으로 종료한다', () => {
    const session = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C5',
    });

    expect(session.phase).toBe('COMPLETED');
    expect(session.result).toEqual(expect.objectContaining({
      outcome: 'INDEPENDENT_CORRECT',
      correct: true,
      selectionAttempt: 1,
      rationaleAssessment: 'NOT_PROVIDED',
    }));
  });

  it('타당한 정답 근거는 평가 후 근거와 함께 종료한다', () => {
    const awaiting = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C5',
      rationale: 'pH 상승 뒤 소수성이 약해진다는 연결이 지문에서 정당화되지 않습니다.',
    });
    const completed = applyCorrectRationaleAssessment(awaiting, 'SUPPORTED');

    expect(awaiting.phase).toBe('AWAITING_CORRECT_RATIONALE_ASSESSMENT');
    expect(completed.result?.outcome).toBe('SUPPORTED_RATIONALE_CORRECT');
    expect(completed.observations[0]).toEqual(expect.objectContaining({
      rationale: 'pH 상승 뒤 소수성이 약해진다는 연결이 지문에서 정당화되지 않습니다.',
    }));
  });

  it('불확실한 정답 근거는 오류로 확정하거나 진단을 시작하지 않는다', () => {
    const awaiting = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C5',
      rationale: '그냥 ⑤가 가장 이상해 보였습니다.',
    });
    const completed = applyCorrectRationaleAssessment(awaiting, 'UNCERTAIN');

    expect(completed.phase).toBe('COMPLETED');
    expect(completed.result?.outcome).toBe('UNVERIFIED_RATIONALE_CORRECT');
    expect(completed.turns).toHaveLength(0);
  });

  it('명백히 잘못된 정답 근거는 ANSWER_RATIONALE 진단으로 진입한다', () => {
    const awaiting = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C5',
      rationale: 'pH가 높아지면 양전하가 더 강해져서 ⑤가 틀립니다.',
    });
    const diagnostic = applyCorrectRationaleAssessment(awaiting, 'CLEAR_ERROR');
    const turn = fixture('mrna-q19-correct-choice-wrong-rationale.json').turns[0];
    const asking = applyProblemEvaluatorTurn(diagnostic, turn);

    expect(diagnostic.entryReason).toBe('CORRECT_RATIONALE_REVIEW');
    expect(asking.turns[0]?.targetSnapshots).toHaveLength(1);
    expect(asking.turns[0]?.targetSnapshots[0]?.kind).toBe('ANSWER_RATIONALE');
    expect(asking.phase).toBe('AWAITING_STUDENT_RESPONSE');
  });

  it('오답에는 선택 근거를 필수로 요구한다', () => {
    expect(() => submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C2',
    })).toThrow(/선택 근거/);
  });

  it('근거 작성 중 정답으로 바꾼 선택을 외현화 교정으로 기록한다', () => {
    const awaiting = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C2',
      submittedChoiceId: 'C5',
      rationale: '이유를 쓰다 보니 ②가 아니라 ⑤가 부적절하다는 것을 확인했습니다.',
    });
    const completed = applyCorrectRationaleAssessment(awaiting, 'SUPPORTED');

    expect(completed.result).toEqual(expect.objectContaining({
      outcome: 'EXTERNALIZATION_CORRECTION',
      initialChoiceWasCorrect: false,
      finalChoiceId: 'C5',
    }));
  });

  it('진단 질문에 대한 학생 원문을 보존하고 같은 질문에 두 번 답하지 못하게 한다', () => {
    const turn = fixture('mrna-q19-c2-ambiguous-speed.json').turns[0];
    const asking = applyProblemEvaluatorTurn(wrongSession(), turn);
    const answered = submitProblemActionResponse(
      asking,
      '속도를 계속 바꾼다는 뜻으로 이해했습니다.',
    );

    expect(answered.observations.at(-1)).toEqual(expect.objectContaining({
      rawResponse: '속도를 계속 바꾼다는 뜻으로 이해했습니다.',
      responseType: 'DIAGNOSTIC_ANSWER',
    }));
    expect(() => submitProblemActionResponse(
      answered,
      '두 번째 답변',
    )).toThrow(/현재 상태/);
  });

  it('진단 질문 예산이 모델 제안보다 우선하고 다음 행동을 직접 코칭으로 제한한다', () => {
    const firstTurn = fixture('mrna-q19-c2-ambiguous-speed.json').turns[0];
    const asking = applyProblemEvaluatorTurn(wrongSession(1), firstTurn);
    const answered = submitProblemActionResponse(asking, '속도를 계속 바꾸는 뜻이었습니다.');
    const secondProposal = structuredClone(firstTurn) as Record<string, unknown>;
    secondProposal['turnId'] = 'T2';
    const constrained = applyProblemEvaluatorTurn(answered, secondProposal);

    expect(constrained.phase).toBe('AWAITING_EVALUATION');
    expect(constrained.requiredNextAction).toBe('DIRECT_COACHING');
    expect(constrained.rejectedEvaluatorProposals).toEqual([
      expect.objectContaining({ reason: 'DIAGNOSTIC_BUDGET_EXHAUSTED' }),
    ]);
    expect(() => applyProblemEvaluatorTurn(constrained, {
      ...secondProposal,
      turnId: 'T3',
    })).toThrow(/직접 코칭만/);
  });

  it('직접 코칭 이후 재선택과 종료까지 상태를 진행한다', () => {
    const firstTurn = fixture('mrna-q19-c2-ambiguous-speed.json').turns[0];
    const asking = applyProblemEvaluatorTurn(wrongSession(1), firstTurn);
    const answered = submitProblemActionResponse(asking, '두 용액 속도를 다르게 맞춘다는 뜻입니다.');
    const secondProposal = structuredClone(firstTurn) as Record<string, unknown>;
    secondProposal['turnId'] = 'T2';
    const constrained = applyProblemEvaluatorTurn(answered, secondProposal);
    const coachingTurn = structuredClone(
      fixture('mrna-q19-c2-rational-challenge.json').turns[1],
    ) as Record<string, unknown>;
    coachingTurn['turnId'] = 'T3';
    const coaching = applyProblemEvaluatorTurn(constrained, coachingTurn);
    const acknowledged = submitProblemActionResponse(coaching, '출제 의도를 이해했습니다.');
    const reselectionTurn = structuredClone(coachingTurn) as Record<string, unknown>;
    reselectionTurn['turnId'] = 'T4';
    reselectionTurn['activeTarget'] = null;
    reselectionTurn['nextAction'] = {
      type: 'REQUEST_RESELECTION',
      prompt: '출제 의도를 반영해 다시 선택해 주세요.',
    };
    const reselecting = applyProblemEvaluatorTurn(acknowledged, reselectionTurn);
    const completed = submitProblemReselection(reselecting, { selectedChoiceId: 'C5' });

    expect(completed.result).toEqual(expect.objectContaining({
      outcome: 'RESELECTION_CORRECT_UNVERIFIED',
      selectionAttempt: 2,
      rationaleAssessment: 'NOT_PROVIDED',
    }));
    expect(completed.phase).toBe('COMPLETED');
  });

  it('진단 질문 뒤 교정 질문으로 수정된 경로를 별도 결과로 기록한다', () => {
    const diagnosticTurn = fixture('mrna-q19-c2-ambiguous-speed.json').turns[0];
    const diagnosed = applyProblemEvaluatorTurn(wrongSession(), diagnosticTurn);
    const diagnosticAnswer = submitProblemActionResponse(
      diagnosed,
      '속도를 계속 바꾼다는 뜻으로 이해했습니다.',
    );
    const correctiveTurn = structuredClone(
      fixture('mrna-q19-c2-rational-challenge.json').turns[1],
    ) as any;
    correctiveTurn.turnId = 'T2';
    correctiveTurn.targetSnapshots[0].status = 'SUFFICIENT';
    correctiveTurn.targetSnapshots[0].hypotheses[0].kind = 'STUDENT_ERROR';
    correctiveTurn.nextAction = {
      type: 'ASK_CORRECTIVE',
      target: 'SELECTED_CHOICE',
      question: '속도를 조절한다는 표현을 일정한 비율 유지와 연결하면 판단이 달라지나요?',
      purpose: '선지의 통제 의미를 다시 연결한다.',
      targetedHypothesisIds: ['H-S2'],
    };
    const correcting = applyProblemEvaluatorTurn(diagnosticAnswer, correctiveTurn);
    const corrected = submitProblemActionResponse(
      correcting,
      '두 용액이 일정 비율로 들어가도록 통제한다는 뜻입니다.',
    );
    const reselectionTurn = structuredClone(correctiveTurn);
    reselectionTurn.turnId = 'T3';
    reselectionTurn.activeTarget = null;
    reselectionTurn.basedOnObservationIds = ['O1', 'O2', 'O3'];
    reselectionTurn.nextAction = {
      type: 'REQUEST_RESELECTION',
      prompt: '방금 확인한 투입 비율의 통제 관계를 반영해 다시 선택해 주세요.',
    };
    const reselecting = applyProblemEvaluatorTurn(corrected, reselectionTurn);
    const completed = submitProblemReselection(reselecting, { selectedChoiceId: 'C5' });

    expect(completed.result?.outcome).toBe('RESELECTION_CORRECT_UNVERIFIED');
  });

  it('표시된 질문이나 코칭 없이 학생 답변을 제출할 수 없다', () => {
    expect(() => submitProblemActionResponse(
      wrongSession(),
      '답변할 질문이 없는 상태의 입력',
    )).toThrow(/현재 상태/);
  });

  it('교정 후 재선택의 정오를 코드가 판정해 종료한다', () => {
    const correctiveTurn = fixture('mrna-q19-c4-completed.json').turns[0];
    const initial = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C4',
      rationale: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
    });
    const asking = applyProblemEvaluatorTurn(initial, correctiveTurn);
    const answered = submitProblemActionResponse(asking, 'pH가 높으면 수소 이온은 감소합니다.');
    const reselectionTurn = fixture('mrna-q19-c4-completed.json').turns[1];
    const reselecting = applyProblemEvaluatorTurn(answered, reselectionTurn);
    const completed = submitProblemReselection(reselecting, { selectedChoiceId: 'C5' });

    expect(completed.phase).toBe('COMPLETED');
    expect(completed.result).toEqual(expect.objectContaining({
      finalChoiceId: 'C5',
      correct: true,
      outcome: 'RESELECTION_CORRECT_UNVERIFIED',
      selectionAttempt: 2,
      rationaleAssessment: 'NOT_PROVIDED',
    }));
  });

  it('재선택 정답에 근거를 쓰면 블라인드 평가를 기다리고 검증된 정답으로 종료한다', () => {
    const correctiveTurn = fixture('mrna-q19-c4-completed.json').turns[0];
    const initial = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C4',
      rationale: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
    });
    const asking = applyProblemEvaluatorTurn(initial, correctiveTurn);
    const answered = submitProblemActionResponse(asking, 'pH가 높으면 수소 이온은 감소합니다.');
    const reselectionTurn = fixture('mrna-q19-c4-completed.json').turns[1];
    const reselecting = applyProblemEvaluatorTurn(answered, reselectionTurn);
    const awaitingAssessment = submitProblemReselection(reselecting, {
      selectedChoiceId: 'C5',
      rationale: 'pH 상승 뒤 소수성이 약해진다는 연결은 지문의 관계와 맞지 않습니다.',
    });
    const completed = applyCorrectRationaleAssessment(awaitingAssessment, 'SUPPORTED');

    expect(awaitingAssessment.phase).toBe('AWAITING_CORRECT_RATIONALE_ASSESSMENT');
    expect(awaitingAssessment.observations.at(-1)).toEqual(expect.objectContaining({
      kind: 'RESELECTION',
      selectedChoiceId: 'C5',
      rawResponse: 'pH 상승 뒤 소수성이 약해진다는 연결은 지문의 관계와 맞지 않습니다.',
    }));
    expect(completed.result).toEqual(expect.objectContaining({
      outcome: 'RESELECTION_CORRECT_VERIFIED',
      selectionAttempt: 2,
      rationaleAssessment: 'SUPPORTED',
    }));
  });

  it('재선택 정답 근거가 명백히 틀리면 정답만으로 종료하지 않고 근거 진단으로 진입한다', () => {
    const correctiveTurn = fixture('mrna-q19-c4-completed.json').turns[0];
    const initial = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C4',
      rationale: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
    });
    const asking = applyProblemEvaluatorTurn(initial, correctiveTurn);
    const answered = submitProblemActionResponse(asking, '관계를 다시 확인했습니다.');
    const reselectionTurn = fixture('mrna-q19-c4-completed.json').turns[1];
    const reselecting = applyProblemEvaluatorTurn(answered, reselectionTurn);
    const awaitingAssessment = submitProblemReselection(reselecting, {
      selectedChoiceId: 'C5',
      rationale: 'pH가 높아지면 양전하가 더 강해지기 때문에 ⑤가 틀립니다.',
    });
    const diagnostic = applyCorrectRationaleAssessment(awaitingAssessment, 'CLEAR_ERROR');

    expect(diagnostic.phase).toBe('AWAITING_EVALUATION');
    expect(diagnostic.entryReason).toBe('CORRECT_RATIONALE_REVIEW');
    expect(diagnostic.selectionAttempt).toBe(2);
    expect(diagnostic.result).toBeNull();
  });

  it('재오답이면 새 선택을 기준으로 다시 평가를 기다린다', () => {
    const correctiveTurn = fixture('mrna-q19-c4-completed.json').turns[0];
    const initial = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C4',
      rationale: 'pH가 높으면 수소 이온도 많아집니다.',
    });
    const asking = applyProblemEvaluatorTurn(initial, correctiveTurn);
    const answered = submitProblemActionResponse(asking, '관계를 다시 확인했습니다.');
    const reselectionTurn = fixture('mrna-q19-c4-completed.json').turns[1];
    const reselecting = applyProblemEvaluatorTurn(answered, reselectionTurn);
    const wrongAgain = submitProblemReselection(reselecting, {
      selectedChoiceId: 'C3',
      rationale: '그림에서 두 물질이 합쳐지는 위치가 분해 지점처럼 보였습니다.',
    });

    expect(wrongAgain.phase).toBe('AWAITING_EVALUATION');
    expect(wrongAgain.latestChoiceId).toBe('C3');
    expect(wrongAgain.result).toBeNull();
    expect(wrongAgain.observations.at(-1)).toEqual(expect.objectContaining({
      rawResponse: '그림에서 두 물질이 합쳐지는 위치가 분해 지점처럼 보였습니다.',
    }));
  });

  it('재선택한 오답에는 새로운 선택 근거를 요구한다', () => {
    const correctiveTurn = fixture('mrna-q19-c4-completed.json').turns[0];
    const initial = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C4',
      rationale: 'pH가 높으면 수소 이온도 많아집니다.',
    });
    const asking = applyProblemEvaluatorTurn(initial, correctiveTurn);
    const answered = submitProblemActionResponse(asking, '관계를 다시 확인했습니다.');
    const reselecting = applyProblemEvaluatorTurn(
      answered,
      fixture('mrna-q19-c4-completed.json').turns[1],
    );

    expect(() => submitProblemReselection(reselecting, { selectedChoiceId: 'C3' }))
      .toThrow(/새로운 선택 근거/);
  });

  it('현재 선택이 오답이면 evaluator의 COMPLETE 제안을 거부한다', () => {
    const wrong = wrongSession();
    const baseTurn = fixture('mrna-q19-c2-ambiguous-speed.json').turns[0] as Record<string, unknown>;
    const completeTurn = {
      ...baseTurn,
      nextAction: { type: 'COMPLETE', summary: '종료' },
      activeTarget: null,
    };

    expect(() => applyProblemEvaluatorTurn(wrong, completeTurn)).toThrow(/오답이면 COMPLETE/);
  });

  it('완료된 세션은 변경하지 못한다', () => {
    const completed = submitInitialProblemResponse(fresh(), { initialChoiceId: 'C5' });

    expect(() => submitInitialProblemResponse(completed, {
      initialChoiceId: 'C5',
    })).toThrow(/완료된 세션/);
  });
});
