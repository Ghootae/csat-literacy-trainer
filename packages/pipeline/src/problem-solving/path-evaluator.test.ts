import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProblemQuestionGold } from './gold.js';
import {
  EvaluatorNextActionCandidateSchema,
  ProblemPathDiagnosticOutputSchema,
  createInterventionSignature,
  loadProblemPathDiagnosticPrompt,
  resolveProblemPathEvaluatorIds,
} from './path-evaluator.js';
import {
  createProblemPathEvaluatorInput,
  exhaustedWrongAttemptSupplementalAccess,
  failedCorrectionSupplementalAccess,
  projectProblemPathEvaluatorProviderInput,
  validateProblemPathEvaluatorOutput,
} from './path-evaluator-input.js';
import {
  OpenAIProblemPathEvaluator,
  ProblemPathEvaluatorContractError,
  ProblemPathTransportError,
  type ProblemPathEvaluatorTransport,
} from './path-evaluator-runtime.js';
import {
  applyCorrectRationaleAssessment,
  applyProblemEvaluatorTurn,
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
  submitProblemReselection,
} from './session.js';

const gold = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/mrna-vaccine-lipid-nanoparticle-q19.json',
), 'utf8')) as ProblemQuestionGold;

function fresh() {
  return createProblemSolvingSession({
    sessionId: 'S-EVAL',
    questionId: gold.questionId,
    answerChoiceId: gold.answerChoiceId,
    maxDiagnosticQuestions: 2,
  });
}

function wrongSession() {
  return submitInitialProblemResponse(fresh(), {
    initialChoiceId: 'C2',
    rationale: '속도를 조절하면 투입량이 달라져 균일하지 않을 것 같아요.',
  });
}

function correctRationaleSession() {
  return submitInitialProblemResponse(fresh(), {
    initialChoiceId: 'C5',
    rationale: 'pH가 높아지면 양전하가 더 강해져서 ⑤가 틀립니다.',
  });
}

function reselectedCorrectRationaleSession() {
  const fixture = JSON.parse(readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving/episodes/mrna-q19-c4-completed.json',
  ), 'utf8')) as { turns: unknown[] };
  const initial = submitInitialProblemResponse(fresh(), {
    initialChoiceId: 'C4',
    rationale: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
  });
  const asking = applyProblemEvaluatorTurn(initial, fixture.turns[0]);
  const answered = submitProblemActionResponse(asking, 'pH가 높으면 수소 이온 농도는 낮아집니다.');
  const reselecting = applyProblemEvaluatorTurn(answered, fixture.turns[1]);
  return submitProblemReselection(reselecting, {
    selectedChoiceId: 'C5',
    rationale: 'pH가 높아진 뒤 소수성이 약해진다는 연결이 지문의 관계와 맞지 않습니다.',
  });
}

function answeredCorrectRationaleCorrectionSession() {
  const fixture = JSON.parse(readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving/episodes/mrna-q19-correct-choice-wrong-rationale.json',
  ), 'utf8')) as { turns: unknown[] };
  const awaiting = correctRationaleSession();
  const diagnostic = applyCorrectRationaleAssessment(awaiting, 'CLEAR_ERROR');
  const asking = applyProblemEvaluatorTurn(diagnostic, fixture.turns[0]);
  return submitProblemActionResponse(asking, '그래도 양전하가 더 강해진다고 생각합니다.');
}

function sufficiency(sufficient: boolean) {
  return {
    choiceExplained: { satisfied: sufficient, reason: '선택 설명' },
    interventionPointLocalized: { satisfied: sufficient, reason: '분기 국소화' },
    safeInterventionAvailable: { satisfied: sufficient, reason: '안전한 개입' },
    actionRelevantAlternativesControlled: { satisfied: sufficient, reason: '대안 통제' },
    sufficient,
  };
}

function unknownStep() {
  return {
    identity: { existingId: null, localId: 'LS-UNKNOWN' },
    content: '학생이 속도 조절을 어떤 의미로 이해했는지 확인되지 않았다.',
    epistemicStatus: 'UNKNOWN' as const,
    temporalRole: 'CURRENT' as const,
    relationToPrior: 'NEW' as const,
    evidence: [],
    goldRefs: [],
  };
}

function diagnosticOutput() {
  return {
    schemaVersion: 'problem-path-evaluator-output-v3' as const,
    mode: 'DIAGNOSE_PATH' as const,
    snapshotMode: 'FULL' as const,
    basedOnObservationIds: ['O1'],
    targets: [
      {
        kind: 'SELECTED_CHOICE' as const,
        choiceId: 'C2',
        status: 'INSUFFICIENT' as const,
        learningState: 'PATH_UNCLEAR' as const,
        errorAssessment: 'UNCERTAIN' as const,
        pathSteps: [
          {
            identity: { existingId: null, localId: 'LS-OBSERVED' },
            content: '학생은 ②를 부적절한 선지로 선택했다.',
            epistemicStatus: 'OBSERVED' as const,
            temporalRole: 'INITIAL' as const,
            relationToPrior: 'NEW' as const,
            evidence: [{
              kind: 'STRUCTURED_VALUE' as const,
              observationId: 'O1',
              field: 'submittedChoiceId' as const,
              value: 'C2',
            }],
            goldRefs: [],
          },
          unknownStep(),
        ],
        hypotheses: [],
        sufficiency: sufficiency(false),
      },
      {
        kind: 'MISSED_ANSWER' as const,
        choiceId: 'C5',
        status: 'NOT_ASSESSED' as const,
        learningState: null,
        errorAssessment: null,
        pathSteps: [] as [],
        hypotheses: [] as [],
        sufficiency: null,
      },
    ],
    activeTarget: 'SELECTED_CHOICE' as const,
    diagnosticDecision: {
      target: 'SELECTED_CHOICE' as const,
      reason: '오독과 합리적 이의를 구별하기 전에 의미를 확인한다.',
      targetHypothesisRefs: [],
      unresolvedStepRefs: ['LS-UNKNOWN'],
    },
    nextActionCandidate: {
      type: 'ASK_DIAGNOSTIC' as const,
      target: 'SELECTED_CHOICE' as const,
      questionIntent: {
        kind: 'DIAGNOSTIC' as const,
        purpose: '속도 조절에 부여한 의미를 확인한다.',
        distinguishesHypothesisRefs: [],
        resolvesUnknownStepRefs: ['LS-UNKNOWN'],
        targetRelationRefs: ['OC2-1'],
        interventionStrength: 'DIAGNOSTIC' as const,
      },
      questionText: '여기서 속도를 조절한다는 말을 어떤 의미로 이해했나요?',
      studentMessage: null,
      supplementalInferenceIds: [] as [],
    },
  };
}

describe('problem path evaluator contract', () => {
  it('evaluator의 광범위한 전체 선지 재검사 문구를 거부한다', () => {
    expect(() => EvaluatorNextActionCandidateSchema.parse({
      type: 'REQUEST_RESELECTION',
      target: null,
      questionIntent: null,
      questionText: null,
      studentMessage: '모든 선지를 다시 검토한 뒤 선택하세요.',
      supplementalInferenceIds: [],
    })).toThrow(/전체 선지 재검사/);
  });

  it('버전 고정 프롬프트가 전체 스냅샷과 상태별 행동 계약을 명시한다', () => {
    const prompt = loadProblemPathDiagnosticPrompt();
    expect(prompt).toContain('snapshotMode: FULL');
    expect(prompt).toContain('sufficient: true');
    expect(prompt).toContain('errorAssessment: CLEAR_ERROR');
    expect(prompt).toContain('EXPLAIN_ITEM_BOUNDARY');
    expect(prompt).toContain('existingId');
    expect(prompt).toContain('STRUCTURED_VALUE');
    expect(prompt).toContain('candidateDivergenceLayers`는 오류를 분류하기 위한 후보 라벨');
    expect(prompt).toContain('분류를 더 정밀하게 만들기 위한 질문은 진단 질문이 아니다');
    expect(prompt).toContain('오류 분류의 정밀도만 높이는 `UNKNOWN`은 진단 질문의 근거가 아니다');
  });

  it('미평가 타깃은 오류 평가·경로·가설·충분성을 만들지 않는다', () => {
    const output = diagnosticOutput();
    expect(ProblemPathDiagnosticOutputSchema.parse(output)).toBeTruthy();

    const invalid = structuredClone(output) as any;
    invalid.targets[1].errorAssessment = 'UNCERTAIN';
    expect(() => ProblemPathDiagnosticOutputSchema.parse(invalid)).toThrow();
  });

  it('구체적인 가설을 발명하지 않고 UNKNOWN 하나를 확인하는 진단 질문을 허용한다', () => {
    const parsed = ProblemPathDiagnosticOutputSchema.parse(diagnosticOutput());
    expect(parsed.targets[0]?.hypotheses).toHaveLength(0);
    expect(parsed.nextActionCandidate.type).toBe('ASK_DIAGNOSTIC');
  });

  it('충분하더라도 CLEAR_ERROR가 아니면 교정 질문을 거부한다', () => {
    const output = diagnosticOutput() as any;
    output.targets[0].status = 'SUFFICIENT';
    output.targets[0].learningState = 'PATH_CLARIFIED';
    output.targets[0].errorAssessment = 'REASONABLE_ALTERNATIVE_INTERPRETATION';
    output.targets[0].sufficiency = sufficiency(true);
    output.nextActionCandidate = {
      type: 'ASK_CORRECTIVE',
      target: 'SELECTED_CHOICE',
      questionIntent: {
        kind: 'CORRECTIVE',
        purpose: '학생을 교정한다.',
        targetedHypothesisRefs: ['LH1'],
        targetRelationRefs: ['OC2-1'],
        interventionStrength: 'INDIRECT',
      },
      questionText: '다시 생각해 볼까요?',
      studentMessage: null,
      supplementalInferenceIds: [],
    };
    expect(() => ProblemPathDiagnosticOutputSchema.parse(output)).toThrow(/CLEAR_ERROR|명백한 오류/);
  });

  it('합리적 대안 해석에는 학생 교정과 분리된 문항 경계 설명을 허용한다', () => {
    const output = diagnosticOutput() as any;
    output.targets[0].status = 'BOUNDARY_CLARIFICATION_REQUIRED';
    output.targets[0].learningState = 'ITEM_BOUNDARY_CLARIFIED';
    output.targets[0].errorAssessment = 'REASONABLE_ALTERNATIVE_INTERPRETATION';
    output.targets[0].sufficiency = sufficiency(true);
    output.nextActionCandidate = {
      type: 'EXPLAIN_ITEM_BOUNDARY',
      target: 'SELECTED_CHOICE',
      questionIntent: null,
      questionText: null,
      studentMessage: '그 해석은 합리적이며, 이 문항은 일정 비율을 유지하는 통제로 해석합니다.',
      supplementalInferenceIds: [],
    };
    expect(ProblemPathDiagnosticOutputSchema.parse(output).nextActionCandidate.type)
      .toBe('EXPLAIN_ITEM_BOUNDARY');
  });

  it('재선택 같은 전역 행동은 해결된 활성 타깃의 판단 맥락을 보존할 수 있다', () => {
    const output = diagnosticOutput() as any;
    output.targets[0].status = 'RESOLVED';
    output.targets[0].learningState = 'CORRECTED';
    output.targets[0].errorAssessment = 'NO_ERROR_DETECTED';
    output.targets[0].pathSteps[0].relationToPrior = 'REVISES_PRIOR';
    output.targets[0].sufficiency = sufficiency(true);
    output.diagnosticDecision.unresolvedStepRefs = [];
    output.nextActionCandidate = {
      type: 'REQUEST_RESELECTION',
      target: null,
      questionIntent: null,
      questionText: null,
      studentMessage: '수정한 판단을 반영해 다시 선택해 주세요.',
      supplementalInferenceIds: [],
    };

    expect(ProblemPathDiagnosticOutputSchema.parse(output).activeTarget)
      .toBe('SELECTED_CHOICE');
  });

  it('오답 경로만 파악한 PATH_CLARIFIED 상태에서는 재선택을 거부한다', () => {
    const output = diagnosticOutput() as any;
    output.targets[0].status = 'SUFFICIENT';
    output.targets[0].learningState = 'PATH_CLARIFIED';
    output.targets[0].errorAssessment = 'CLEAR_ERROR';
    output.targets[0].sufficiency = sufficiency(true);
    output.diagnosticDecision.unresolvedStepRefs = [];
    output.nextActionCandidate = {
      type: 'REQUEST_RESELECTION',
      target: null,
      questionIntent: null,
      questionText: null,
      studentMessage: '다시 선택해 주세요.',
      supplementalInferenceIds: [],
    };

    expect(() => ProblemPathDiagnosticOutputSchema.parse(output))
      .toThrow(/경로 파악만으로 재선택/);
  });

  it('기존 ID와 호출 로컬 ID를 동시에 만들지 못한다', () => {
    const output = diagnosticOutput() as any;
    output.targets[0].pathSteps[0].identity = {
      existingId: 'PS-1',
      localId: 'LS-1',
    };
    expect(() => ProblemPathDiagnosticOutputSchema.parse(output)).toThrow(/정확히 하나/);
  });

  it('개입 signature를 통제된 구조에서 안정적으로 만든다', () => {
    const left = createInterventionSignature({
      targetKind: 'SELECTED_CHOICE',
      divergenceLayer: 'CHOICE_INTERPRETATION',
      targetRelationRefs: ['OC2-2', 'OC2-1'],
      interventionType: 'CLARIFY_OPTION_MEANING',
    });
    const right = createInterventionSignature({
      targetKind: 'SELECTED_CHOICE',
      divergenceLayer: 'CHOICE_INTERPRETATION',
      targetRelationRefs: ['OC2-1', 'OC2-2'],
      interventionType: 'CLARIFY_OPTION_MEANING',
    });
    expect(left).toBe(right);
  });

  it('호출 local ID를 코드 소유 영구 ID로 바꾸고 모든 참조를 함께 치환한다', () => {
    const resolved = resolveProblemPathEvaluatorIds(diagnosticOutput(), {
      turnSequence: 1,
    });
    const selected = resolved.targets[0];
    if (selected?.status === 'NOT_ASSESSED' || selected?.status === 'NOT_DIRECTLY_DIAGNOSED') {
      throw new Error('평가 타깃 필요');
    }
    expect(selected?.pathSteps.map((step) => step.identity)).toEqual([
      { existingId: 'PS-T1-1', localId: null },
      { existingId: 'PS-T1-2', localId: null },
    ]);
    expect(resolved.diagnosticDecision.unresolvedStepRefs).toEqual(['PS-T1-2']);
    expect(resolved.nextActionCandidate.type).toBe('ASK_DIAGNOSTIC');
    if (resolved.nextActionCandidate.type === 'ASK_DIAGNOSTIC') {
      expect(resolved.nextActionCandidate.questionIntent.resolvesUnknownStepRefs)
        .toEqual(['PS-T1-2']);
    }
  });
});

describe('problem path evaluator input projection', () => {
  it('오답 선택별 질문 예산을 evaluator에 투영하고 소진 뒤 질문 행동을 제거한다', () => {
    const exhausted = structuredClone(wrongSession());
    exhausted.limits.questionsUsedThisAttempt = 2;
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: exhausted, gold,
    });

    expect(input.sessionState).toEqual(expect.objectContaining({
      questionsUsedThisAttempt: 2,
      maxQuestionsPerWrongAttempt: 2,
    }));
    expect(input.sessionState.allowedActionTypes).toContain('DIRECT_COACHING');
    expect(input.sessionState.allowedActionTypes).not.toContain('ASK_DIAGNOSTIC');
    expect(input.sessionState.allowedActionTypes).not.toContain('ASK_CORRECTIVE');
  });

  it('오답 질문 소진 뒤 정답 선지의 승인된 직접 코칭 보충 해설만 연다', () => {
    expect(exhaustedWrongAttemptSupplementalAccess(gold, ['C2', 'C5'])).toEqual({
      reason: 'MAX_DIAGNOSTIC_TURNS',
      inferenceIds: ['SI1'],
      targetOptionClaimIds: ['OC5-2'],
    });
  });

  it('정답 오류 근거는 첫 교정 질문 뒤 완료 또는 상세 코칭만 허용한다', () => {
    const diagnostic = applyCorrectRationaleAssessment(correctRationaleSession(), 'CLEAR_ERROR');
    const beforeQuestion = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: diagnostic, gold,
    });
    const afterAnswer = answeredCorrectRationaleCorrectionSession();
    const fixture = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'packages/pipeline/fixtures/experiments/problem-solving/episodes/mrna-q19-correct-choice-wrong-rationale.json',
    ), 'utf8')) as { turns: any[] };
    const coachingRequired = applyProblemEvaluatorTurn(afterAnswer, {
      ...structuredClone(fixture.turns[0]),
      turnId: 'T2',
      basedOnObservationIds: ['O1', 'O2'],
      nextAction: {
        type: 'DIRECT_COACHING',
        target: 'ANSWER_RATIONALE',
        message: '교정 실패로 상세 설명이 필요합니다.',
        coachingReason: 'FAILED_CORRECTION',
        supplementalInferenceIds: [],
      },
    });
    const access = failedCorrectionSupplementalAccess(gold, 'C5');
    const afterQuestion = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session: afterAnswer,
      gold,
    });
    const coachingInput = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session: coachingRequired,
      gold,
      ...(access === undefined ? {} : { supplementalAccess: access }),
    });

    expect(beforeQuestion.sessionState.allowedActionTypes).toEqual(['ASK_CORRECTIVE']);
    expect(afterQuestion.sessionState.allowedActionTypes).toEqual(['DIRECT_COACHING', 'COMPLETE']);
    expect(afterQuestion.allowedSupplementalInferences).toEqual([]);
    expect(coachingInput.sessionState.allowedActionTypes).toEqual(['DIRECT_COACHING']);
    expect(access).toEqual({
      reason: 'FAILED_CORRECTION',
      inferenceIds: ['SI1'],
      targetOptionClaimIds: ['OC5-2'],
    });
    expect(coachingInput.allowedSupplementalInferences.map((item) => item.inferenceId))
      .toEqual(['SI1']);
  });

  it('초기 진단 입력에서 보충 해설 필드를 기본 골드로부터 물리적으로 제거한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session: wrongSession(),
      gold,
    });

    expect('supplementalExplanationInferences' in input.basicGold).toBe(false);
    expect(input.allowedSupplementalInferences).toEqual([]);
    expect(input.supplementalAccess).toBeNull();
  });

  it('대표 오답 경로 포함·제외 A/B 입력을 만들 수 있다', () => {
    const included = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
    const excluded = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
      includeRepresentativeWrongPaths: false,
    });

    expect(included.basicGold.representativeWrongPaths.length).toBeGreaterThan(0);
    expect(excluded.basicGold.representativeWrongPaths).toEqual([]);
    expect(excluded.representativeWrongPathsIncluded).toBe(false);
  });

  it('정답 근거 사전 판정에는 보충 해설 접근을 거부한다', () => {
    expect(() => createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE',
      session: correctRationaleSession(),
      gold,
      supplementalAccess: {
        reason: 'EXPLANATION_REQUEST',
        inferenceIds: ['SI1'],
        targetOptionClaimIds: ['OC5-2'],
      },
    })).toThrow(/보충 해설/);
  });

  it('검토된 fallback 정책이 일치할 때만 필요한 SI를 별도 필드로 연다', () => {
    const diagnostic = applyCorrectRationaleAssessment(correctRationaleSession(), 'CLEAR_ERROR');
    const allowed = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session: diagnostic,
      gold,
      supplementalAccess: {
        reason: 'EXPLANATION_REQUEST',
        inferenceIds: ['SI1'],
        targetOptionClaimIds: ['OC5-2'],
      },
    });
    expect(allowed.allowedSupplementalInferences.map((item) => item.inferenceId))
      .toEqual(['SI1']);

    expect(() => createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session: diagnostic,
      gold,
      supplementalAccess: {
        reason: 'EXPLANATION_REQUEST',
        inferenceIds: ['SI1'],
        targetOptionClaimIds: ['OC2-1'],
      },
    })).toThrow(/허용 조건/);
  });

  it('원문과 일치하지 않는 evidence quote를 계약 경계에서 거부한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE',
      session: correctRationaleSession(),
      gold,
    });
    const output = {
      schemaVersion: 'problem-path-evaluator-output-v3',
      mode: 'ASSESS_SELECTION_RATIONALE',
      optionStance: 'REJECTS_OPTION',
      requiredStanceForSelection: 'REJECTS_OPTION',
      stanceConsistency: 'CONSISTENT',
      groundingAssessment: 'CONTRADICTED',
      assessment: 'CLEAR_ERROR',
      reason: 'pH와 전하 방향이 기본 골드와 충돌한다.',
      evidence: [{
        kind: 'QUOTE', observationId: 'O1', sourceField: 'rationale',
        quote: '학생이 실제로 말하지 않은 문장',
      }],
      sourceRefs: ['MP4'],
    };
    expect(() => validateProblemPathEvaluatorOutput(output, input)).toThrow(/원문/);
  });

  it('정답 키와 선지 판정을 제거한 블라인드 근거 입력만 공급자에게 보낸다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE',
      session: correctRationaleSession(),
      gold,
    });
    const providerInput = projectProblemPathEvaluatorProviderInput(input);
    const serialized = JSON.stringify(providerInput);

    expect(providerInput.evaluationMode).toBe('ASSESS_SELECTION_RATIONALE');
    expect(serialized).not.toContain('answerChoiceId');
    expect(serialized).not.toContain('currentChoiceId');
    expect(serialized).not.toContain('questionId');
    expect(serialized).not.toContain('ASSESS_CORRECT_RATIONALE');
    expect(serialized).not.toContain('optionClaims');
    expect(serialized).not.toContain('representativeWrongPaths');
    expect(serialized).not.toContain('judgment');
    expect(serialized).not.toContain('ANSWER_KEY_CONSTRAINED');
    if (providerInput.evaluationMode === 'ASSESS_SELECTION_RATIONALE') {
      expect(providerInput.rationaleReview.targetOptionText).toContain('pH가 높아지면');
      expect(providerInput.rationaleReview.studentRationale.text).toContain('⑤가 틀립니다');
      expect(providerInput.rationaleReview.sourceFacts.map((fact) => fact.ref))
        .toEqual(expect.arrayContaining(['MP1', 'MP4', 'SF4']));
    }
  });

  it('재선택 정답 근거도 선택 ID가 아닌 원문을 블라인드 평가 근거로 투영한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE',
      session: reselectedCorrectRationaleSession(),
      gold,
    });
    const providerInput = projectProblemPathEvaluatorProviderInput(input);

    expect(providerInput.evaluationMode).toBe('ASSESS_SELECTION_RATIONALE');
    if (providerInput.evaluationMode === 'ASSESS_SELECTION_RATIONALE') {
      expect(providerInput.rationaleReview.studentRationale).toEqual(expect.objectContaining({
        sourceField: 'rawResponse',
        text: 'pH가 높아진 뒤 소수성이 약해진다는 연결이 지문의 관계와 맞지 않습니다.',
      }));
    }
    expect(JSON.stringify(providerInput)).not.toContain('answerChoiceId');
  });

  it('부정 발문에서 선택 선지를 맞다고 승인한 근거를 CLEAR_ERROR로 강제한다', () => {
    const session = submitInitialProblemResponse(fresh(), {
      initialChoiceId: 'C5',
      rationale: '소수성 인력이 줄어 복합체가 작아진다는 설명이 맞는 것 같습니다.',
    });
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE', session, gold,
    });
    const output = {
      schemaVersion: 'problem-path-evaluator-output-v3',
      mode: 'ASSESS_SELECTION_RATIONALE',
      optionStance: 'ACCEPTS_OPTION',
      requiredStanceForSelection: 'REJECTS_OPTION',
      stanceConsistency: 'CONFLICT',
      groundingAssessment: 'NOT_ENOUGH_EVIDENCE',
      assessment: 'CLEAR_ERROR',
      reason: '부정 발문에서 선택한 선지를 맞는 설명이라고 승인해 선택과 근거가 충돌한다.',
      evidence: [{
        kind: 'QUOTE', observationId: 'O1', sourceField: 'rationale',
        quote: '설명이 맞는 것 같습니다',
      }],
      sourceRefs: [],
    };

    expect(validateProblemPathEvaluatorOutput(output, input)).toEqual(output);
    expect(() => validateProblemPathEvaluatorOutput({
      ...output,
      assessment: 'SUPPORTED',
    }, input)).toThrow();
  });

  it('전체 스냅샷은 모든 누적 관찰을 기반으로 해야 한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
    const output = diagnosticOutput();
    expect(validateProblemPathEvaluatorOutput(output, input).mode).toBe('DIAGNOSE_PATH');

    const invalid = structuredClone(output) as any;
    invalid.basedOnObservationIds = [];
    expect(() => validateProblemPathEvaluatorOutput(invalid, input)).toThrow();
  });

  it('대표 경로를 제외한 입력에서는 모델이 WP를 근거로 다시 가져올 수 없다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
      includeRepresentativeWrongPaths: false,
    });
    const output = diagnosticOutput() as any;
    output.targets[0].hypotheses = [{
      identity: { existingId: null, localId: 'LH1' },
      kind: 'STUDENT_ERROR',
      description: '대표 경로를 근거로 만든 가설',
      epistemicStatus: 'HYPOTHESIS',
      plausibility: 'ACTIVE',
      candidateDivergenceLayers: ['CHOICE_INTERPRETATION'],
      intervention: {
        targetKind: 'SELECTED_CHOICE',
        divergenceLayer: 'CHOICE_INTERPRETATION',
        targetRelationRefs: ['OC2-1'],
        interventionType: 'CLARIFY_OPTION_MEANING',
      },
      evidence: [{
        kind: 'STRUCTURED_VALUE', observationId: 'O1',
        field: 'submittedChoiceId', value: 'C2',
      }],
      goldRefs: { optionClaimIds: ['OC2-1'], representativeWrongPathIds: ['WP2'] },
    }];
    expect(() => validateProblemPathEvaluatorOutput(output, input)).toThrow(/대표 오답 경로/);
  });
});

describe('problem path evaluator runtime boundary', () => {
  function evaluatorInput() {
    return createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
  }

  it('검증된 전체 스냅샷의 local ID를 확정하고 호출 메타데이터를 반환한다', async () => {
    const transport: ProblemPathEvaluatorTransport = {
      async parse() {
        return {
          outputParsed: diagnosticOutput(),
          usage: { inputTokens: 120, outputTokens: 80 },
        };
      },
    };
    const evaluator = new OpenAIProblemPathEvaluator({
      transport,
      metricRecorder: () => undefined,
      now: () => new Date('2026-08-27T00:00:00.000Z'),
    });

    const call = await evaluator.evaluate(evaluatorInput());

    expect(call.call).toEqual(expect.objectContaining({
      promptVersion: 'path-diagnostic-prompt-v3',
      schemaVersion: 'problem-path-evaluator-output-v3',
      usage: { inputTokens: 120, outputTokens: 80 },
    }));
    expect(call.rawOutput).toEqual(diagnosticOutput());
    expect(call.result.mode).toBe('DIAGNOSE_PATH');
    if (call.result.mode === 'DIAGNOSE_PATH') {
      const target = call.result.targets[0];
      if (target?.status === 'INSUFFICIENT') {
        expect(target.pathSteps[0]?.identity).toEqual({
          existingId: 'PS-T1-1', localId: null,
        });
      }
    }
  });

  it('실제 transport 경계에서도 블라인드 근거 projection만 직렬화한다', async () => {
    let transportedInput = '';
    const transport: ProblemPathEvaluatorTransport = {
      async parse(options) {
        transportedInput = options.input;
        return {
          outputParsed: {
            schemaVersion: 'problem-path-evaluator-output-v3',
            mode: 'ASSESS_SELECTION_RATIONALE',
            optionStance: 'REJECTS_OPTION',
            requiredStanceForSelection: 'REJECTS_OPTION',
            stanceConsistency: 'CONSISTENT',
            groundingAssessment: 'CONTRADICTED',
            assessment: 'CLEAR_ERROR',
            reason: 'pH와 양전하의 방향을 반대로 설명했다.',
            evidence: [{
              kind: 'QUOTE', observationId: 'O1', sourceField: 'rationale',
              quote: '양전하가 더 강해져서',
            }],
            sourceRefs: ['MP4'],
          },
        };
      },
    };
    const evaluator = new OpenAIProblemPathEvaluator({
      transport,
      metricRecorder: () => undefined,
    });
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'ASSESS_SELECTION_RATIONALE',
      session: correctRationaleSession(),
      gold,
    });

    await evaluator.evaluate(input);

    expect(transportedInput).not.toContain('answerChoiceId');
    expect(transportedInput).not.toContain('currentChoiceId');
    expect(transportedInput).not.toContain('optionClaims');
    expect(transportedInput).not.toContain('judgment');
    expect(JSON.parse(transportedInput)).toEqual(
      projectProblemPathEvaluatorProviderInput(input),
    );
  });

  it('계약 오류는 원출력을 보존하고 재시도하지 않는다', async () => {
    let calls = 0;
    const invalid = diagnosticOutput() as any;
    invalid.targets[0].pathSteps[0].evidence[0].value = 'C3';
    const transport: ProblemPathEvaluatorTransport = {
      async parse() {
        calls += 1;
        return { outputParsed: invalid };
      },
    };
    const evaluator = new OpenAIProblemPathEvaluator({
      transport,
      maxTransportRetries: 2,
      retryDelayMs: 0,
      metricRecorder: () => undefined,
    });

    const error = await evaluator.evaluate(evaluatorInput()).catch((caught) => caught);
    expect(error).toBeInstanceOf(ProblemPathEvaluatorContractError);
    expect(error.parsedOutput).toEqual(invalid);
    expect(calls).toBe(1);
  });

  it('명시적으로 재시도 가능한 전송 실패만 제한적으로 다시 호출한다', async () => {
    let calls = 0;
    const transport: ProblemPathEvaluatorTransport = {
      async parse() {
        calls += 1;
        if (calls === 1) {
          throw new ProblemPathTransportError({
            errorType: 'connection', retryable: true,
          });
        }
        return { outputParsed: diagnosticOutput() };
      },
    };
    const evaluator = new OpenAIProblemPathEvaluator({
      transport,
      maxTransportRetries: 1,
      retryDelayMs: 0,
      metricRecorder: () => undefined,
    });

    await expect(evaluator.evaluate(evaluatorInput())).resolves.toBeTruthy();
    expect(calls).toBe(2);
  });
});
