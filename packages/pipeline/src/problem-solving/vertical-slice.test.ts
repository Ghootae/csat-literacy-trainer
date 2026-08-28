import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProblemQuestionGold } from './gold.js';
import {
  OpenAIProblemPathEvaluator,
  type ProblemPathEvaluatorTransport,
} from './path-evaluator-runtime.js';
import { runProblemVerticalSlice } from './vertical-slice.js';

const gold = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/mrna-vaccine-lipid-nanoparticle-q19.json',
), 'utf8')) as ProblemQuestionGold;

function enough(sufficient: boolean) {
  return {
    choiceExplained: { satisfied: sufficient, reason: '학생 발화가 선택을 설명한다.' },
    interventionPointLocalized: { satisfied: sufficient, reason: '최초 분기점을 특정했다.' },
    safeInterventionAvailable: { satisfied: sufficient, reason: '국소 개입이 가능하다.' },
    actionRelevantAlternativesControlled: { satisfied: sufficient, reason: '다른 처방이 필요한 대안은 없다.' },
    sufficient,
  };
}

function clearPhErrorOutput() {
  const quote = 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.';
  const evidence = [{
    kind: 'QUOTE' as const,
    observationId: 'O1',
    sourceField: 'rationale' as const,
    quote,
  }];
  return {
    schemaVersion: 'problem-path-evaluator-output-v2' as const,
    mode: 'DIAGNOSE_PATH' as const,
    snapshotMode: 'FULL' as const,
    basedOnObservationIds: ['O1'],
    targets: [{
      kind: 'SELECTED_CHOICE' as const,
      choiceId: 'C4',
      status: 'SUFFICIENT' as const,
      errorAssessment: 'CLEAR_ERROR' as const,
      pathSteps: [{
        identity: { existingId: null, localId: 'LS1' },
        content: '학생은 pH 상승을 수소 이온 농도 상승으로 이해했다.',
        epistemicStatus: 'SUPPORTED_INFERENCE' as const,
        temporalRole: 'INITIAL' as const,
        relationToPrior: 'NEW' as const,
        evidence,
        goldRefs: ['OC4-1', 'MP4'],
      }],
      hypotheses: [{
        identity: { existingId: null, localId: 'LH1' },
        kind: 'STUDENT_ERROR' as const,
        description: 'pH와 수소 이온 농도의 관계를 반대로 이해했다.',
        epistemicStatus: 'SUPPORTED_INFERENCE' as const,
        plausibility: 'ACTIVE' as const,
        candidateDivergenceLayers: ['PASSAGE_REPRESENTATION'] as const,
        intervention: {
          targetKind: 'SELECTED_CHOICE' as const,
          divergenceLayer: 'PASSAGE_REPRESENTATION' as const,
          targetRelationRefs: ['MP4', 'OC4-1'],
          interventionType: 'RESTORE_PASSAGE_RELATION' as const,
        },
        evidence,
        goldRefs: { optionClaimIds: ['OC4-1'], representativeWrongPathIds: ['WP4A'] },
      }],
      sufficiency: enough(true),
    }, {
      kind: 'MISSED_ANSWER' as const,
      choiceId: 'C5',
      status: 'NOT_ASSESSED' as const,
      errorAssessment: null,
      pathSteps: [] as [],
      hypotheses: [] as [],
      sufficiency: null,
    }],
    activeTarget: 'SELECTED_CHOICE' as const,
    diagnosticDecision: {
      target: 'SELECTED_CHOICE' as const,
      reason: 'pH 관계의 명백한 역전을 먼저 교정한다.',
      targetHypothesisRefs: ['LH1'],
      unresolvedStepRefs: [] as [],
    },
    nextActionCandidate: {
      type: 'ASK_CORRECTIVE' as const,
      target: 'SELECTED_CHOICE' as const,
      questionIntent: {
        kind: 'CORRECTIVE' as const,
        purpose: 'pH와 수소 이온 농도의 방향을 다시 확인한다.',
        targetedHypothesisRefs: ['LH1'],
        targetRelationRefs: ['MP4', 'OC4-1'],
        interventionStrength: 'INDIRECT' as const,
      },
      questionText: 'pH가 높아질수록 수소 이온 농도는 높아질까요, 낮아질까요?',
      studentMessage: null,
      supplementalInferenceIds: [] as [],
    },
  };
}

function requestReselectionOutput() {
  const firstEvidence = [{
    kind: 'QUOTE' as const,
    observationId: 'O1',
    sourceField: 'rationale' as const,
    quote: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
  }];
  const revisedEvidence = [{
    kind: 'QUOTE' as const,
    observationId: 'O2',
    sourceField: 'rawResponse' as const,
    quote: 'pH가 높아질수록 수소 이온 농도는 낮아집니다.',
  }];
  return {
    schemaVersion: 'problem-path-evaluator-output-v2' as const,
    mode: 'DIAGNOSE_PATH' as const,
    snapshotMode: 'FULL' as const,
    basedOnObservationIds: ['O1', 'O2'],
    targets: [{
      kind: 'SELECTED_CHOICE' as const,
      choiceId: 'C4',
      status: 'RESOLVED' as const,
      errorAssessment: 'NO_ERROR_DETECTED' as const,
      pathSteps: [{
        identity: { existingId: null, localId: 'LS1B' },
        content: '처음에는 pH 관계를 반대로 이해했다.',
        epistemicStatus: 'SUPPORTED_INFERENCE' as const,
        temporalRole: 'INITIAL' as const,
        relationToPrior: 'NEW' as const,
        evidence: firstEvidence,
        goldRefs: ['OC4-1', 'MP4'],
      }, {
        identity: { existingId: null, localId: 'LS2B' },
        content: '교정 후 pH 상승과 수소 이온 농도 감소의 관계를 복원했다.',
        epistemicStatus: 'OBSERVED' as const,
        temporalRole: 'POST_CORRECTION' as const,
        relationToPrior: 'REVISES_PRIOR' as const,
        evidence: revisedEvidence,
        goldRefs: ['OC4-1', 'MP4'],
      }],
      hypotheses: [{
        identity: { existingId: null, localId: 'LH1B' },
        kind: 'STUDENT_ERROR' as const,
        description: '초기 pH 관계 역전은 현재 응답에서 수정되었다.',
        epistemicStatus: 'SUPPORTED_INFERENCE' as const,
        plausibility: 'REJECTED' as const,
        candidateDivergenceLayers: ['PASSAGE_REPRESENTATION'] as const,
        intervention: {
          targetKind: 'SELECTED_CHOICE' as const,
          divergenceLayer: 'PASSAGE_REPRESENTATION' as const,
          targetRelationRefs: ['MP4', 'OC4-1'],
          interventionType: 'RESTORE_PASSAGE_RELATION' as const,
        },
        evidence: revisedEvidence,
        goldRefs: { optionClaimIds: ['OC4-1'], representativeWrongPathIds: ['WP4A'] },
      }],
      sufficiency: enough(true),
    }, {
      kind: 'MISSED_ANSWER' as const,
      choiceId: 'C5',
      status: 'NOT_DIRECTLY_DIAGNOSED' as const,
      errorAssessment: null,
      pathSteps: [] as [],
      hypotheses: [] as [],
      sufficiency: null,
    }],
    activeTarget: null,
    diagnosticDecision: {
      target: null,
      reason: '확인된 최초 오류가 수정되어 재선택할 수 있다.',
      targetHypothesisRefs: [] as [],
      unresolvedStepRefs: [] as [],
    },
    nextActionCandidate: {
      type: 'REQUEST_RESELECTION' as const,
      target: null,
      questionIntent: null,
      questionText: null,
      studentMessage: '수정한 판단을 반영해 다시 선택해 주세요.',
      supplementalInferenceIds: [] as [],
    },
  };
}

describe('problem-solving vertical slice', () => {
  it('실제 evaluator 계약 경계를 거쳐 교정, 재선택, 코드 정오 판정까지 완주한다', async () => {
    const outputs: unknown[] = [clearPhErrorOutput(), requestReselectionOutput()];
    const transport: ProblemPathEvaluatorTransport = {
      async parse() {
        return { outputParsed: outputs.shift(), usage: { inputTokens: 1, outputTokens: 1 } };
      },
    };
    const evaluator = new OpenAIProblemPathEvaluator({
      transport,
      maxTransportRetries: 0,
      metricRecorder: () => undefined,
    });

    const result = await runProblemVerticalSlice({
      gold,
      evaluator,
      testCase: {
        caseId: 'c4-ph-direction',
        initialChoiceId: 'C4',
        rationale: 'pH가 높으면 수소 이온도 많아진다고 생각했습니다.',
        diagnosticAnswers: [],
        correctiveAnswers: ['pH가 높아질수록 수소 이온 농도는 낮아집니다.'],
        coachingAcknowledgement: '이해했습니다.',
        reselectionChoiceId: 'C5',
        maxEvaluatorTurns: 4,
      },
    });

    expect(result.completed).toBe(true);
    expect(result.finalSession.result).toEqual(expect.objectContaining({
      correct: true,
      finalChoiceId: 'C5',
      outcome: 'RESELECTION_CORRECT_UNVERIFIED',
      selectionAttempt: 2,
      rationaleAssessment: 'NOT_PROVIDED',
    }));
    expect(result.trace.map((entry) => entry.evaluatorResult.mode === 'DIAGNOSE_PATH'
      ? entry.evaluatorResult.nextActionCandidate.type
      : entry.evaluatorResult.mode)).toEqual([
      'ASK_CORRECTIVE',
      'REQUEST_RESELECTION',
    ]);
    expect(result.finalSession.observations.map((item) => item.kind)).toEqual([
      'INITIAL_SUBMISSION',
      'FOLLOW_UP_RESPONSE',
      'RESELECTION',
    ]);
    expect(result.finalSession.evaluatorAudits).toHaveLength(2);
    expect(outputs).toHaveLength(0);
  });
});
