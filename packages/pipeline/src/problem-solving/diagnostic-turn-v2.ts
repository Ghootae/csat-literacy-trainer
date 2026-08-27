import { z } from 'zod/v4';

import {
  DiagnosticTurnSchema,
  type ProblemSolvingNextAction,
} from './episode.js';
import {
  PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
  PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
  ProblemPathDiagnosticOutputSchema,
  createInterventionSignature,
  evaluatorEntityRef,
  type EvaluatorTargetSnapshot,
  type ProblemPathDiagnosticOutput,
} from './path-evaluator.js';
import {
  validateProblemPathEvaluatorOutput,
  type ProblemPathEvaluatorInput,
} from './path-evaluator-input.js';
import {
  ProblemSolvingSessionSchema,
  applyProblemEvaluatorTurn,
  type ProblemSolvingSession,
} from './session.js';

export const DIAGNOSTIC_TURN_V2_VERSION = 'diagnostic-turn-v2' as const;

export const DiagnosticTurnV2Schema = z.object({
  schemaVersion: z.literal(DIAGNOSTIC_TURN_V2_VERSION),
  turn: DiagnosticTurnSchema,
  audit: z.discriminatedUnion('source', [
    z.object({
      source: z.literal('LEGACY_V1'),
      rawOutput: z.unknown(),
      resolvedOutput: z.null(),
      promptVersion: z.null(),
      outputSchemaVersion: z.null(),
    }).strict(),
    z.object({
      source: z.literal('EVALUATOR_V1'),
      rawOutput: z.unknown(),
      resolvedOutput: ProblemPathDiagnosticOutputSchema,
      promptVersion: z.literal(PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION),
      outputSchemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
    }).strict(),
  ]),
}).strict();

export type DiagnosticTurnV2 = z.infer<typeof DiagnosticTurnV2Schema>;

export function migrateDiagnosticTurnV1ToV2(turnInput: unknown): DiagnosticTurnV2 {
  const turn = DiagnosticTurnSchema.parse(turnInput);
  return DiagnosticTurnV2Schema.parse({
    schemaVersion: DIAGNOSTIC_TURN_V2_VERSION,
    turn,
    audit: {
      source: 'LEGACY_V1',
      rawOutput: structuredClone(turnInput),
      resolvedOutput: null,
      promptVersion: null,
      outputSchemaVersion: null,
    },
  });
}

function observationIds(target: EvaluatorTargetSnapshot): string[] {
  if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') {
    return [];
  }
  return [...new Set(target.hypotheses.flatMap(
    (hypothesis) => hypothesis.evidence.map((evidence) => evidence.observationId),
  ))];
}

function targetSnapshot(target: EvaluatorTargetSnapshot) {
  if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') {
    return {
      kind: target.kind,
      choiceId: target.choiceId,
      status: target.status,
      reconstructedPath: null,
      hypotheses: [],
      sufficiency: null,
    };
  }
  return {
    kind: target.kind,
    choiceId: target.choiceId,
    status: target.status,
    reconstructedPath: target.pathSteps
      .map((step) => `[${step.epistemicStatus}] ${step.content}`)
      .join(' → '),
    hypotheses: target.hypotheses.map((hypothesis) => ({
      hypothesisId: evaluatorEntityRef(hypothesis.identity),
      kind: hypothesis.kind,
      description: hypothesis.description,
      plausibility: hypothesis.plausibility,
      confidence: null,
      candidateDivergenceLayers: hypothesis.candidateDivergenceLayers,
      interventionSignature: createInterventionSignature(hypothesis.intervention),
      evidenceObservationIds: [...new Set(
        hypothesis.evidence.map((evidence) => evidence.observationId),
      )],
      goldRefs: structuredClone(hypothesis.goldRefs),
    })),
    sufficiency: structuredClone(target.sufficiency),
  };
}

function nextAction(output: ProblemPathDiagnosticOutput): ProblemSolvingNextAction {
  const action = output.nextActionCandidate;
  if (action.type === 'ASK_DIAGNOSTIC') {
    return {
      type: 'ASK_DIAGNOSTIC',
      target: action.target,
      question: action.questionText,
      purpose: action.questionIntent.purpose,
      distinguishesHypothesisIds: action.questionIntent.distinguishesHypothesisRefs,
      resolvesUnknownPathStepIds: action.questionIntent.resolvesUnknownStepRefs,
    };
  }
  if (action.type === 'ASK_CORRECTIVE') {
    return {
      type: 'ASK_CORRECTIVE',
      target: action.target,
      question: action.questionText,
      purpose: action.questionIntent.purpose,
      targetedHypothesisIds: action.questionIntent.targetedHypothesisRefs,
    };
  }
  if (action.type === 'EXPLAIN_ITEM_BOUNDARY') {
    return {
      type: 'EXPLAIN_ITEM_BOUNDARY',
      target: action.target,
      message: action.studentMessage,
      purpose: output.diagnosticDecision.reason,
    };
  }
  if (action.type === 'REQUEST_RESELECTION') {
    return { type: 'REQUEST_RESELECTION', prompt: action.studentMessage };
  }
  if (action.type === 'DIRECT_COACHING') {
    return {
      type: 'DIRECT_COACHING',
      target: action.target,
      message: action.studentMessage,
      coachingReason: action.reason,
      supplementalInferenceIds: action.supplementalInferenceIds,
    };
  }
  return action.type === 'COMPLETE'
    ? { type: 'COMPLETE', summary: action.studentMessage }
    : action satisfies never;
}

export function adaptProblemPathDiagnosticOutput(options: {
  readonly evaluatorInput: ProblemPathEvaluatorInput;
  readonly rawOutput: unknown;
  readonly resolvedOutput: ProblemPathDiagnosticOutput;
}): DiagnosticTurnV2 {
  const validated = validateProblemPathEvaluatorOutput(
    options.resolvedOutput,
    options.evaluatorInput,
    { allowCodeResolvedIds: true },
  );
  if (validated.mode !== 'DIAGNOSE_PATH') {
    throw new Error('adapter는 경로 진단 출력만 변환할 수 있다.');
  }
  const output = ProblemPathDiagnosticOutputSchema.parse(validated);
  const globalAction = output.nextActionCandidate.type === 'REQUEST_RESELECTION' ||
    output.nextActionCandidate.type === 'COMPLETE';
  const active = output.activeTarget === null
    ? undefined
    : output.targets.find((target) => target.kind === output.activeTarget);
  if (
    active !== undefined &&
    active.status !== 'NOT_ASSESSED' &&
    active.status !== 'NOT_DIRECTLY_DIAGNOSED' &&
    observationIds(active).some((id) => !output.basedOnObservationIds.includes(id))
  ) {
    throw new Error('adapter: 활성 가설 근거가 전체 스냅샷 관찰에 포함되지 않았다.');
  }
  const turn = DiagnosticTurnSchema.parse({
    turnId: `T${options.evaluatorInput.sessionState.evaluationSequence}`,
    basedOnObservationIds: output.basedOnObservationIds,
    // evaluator 감사에는 방금 해결한 타깃을 보존하되, 세션의 전역 행동
    // 계약에서는 활성 개입 타깃이 없도록 정규화한다.
    activeTarget: globalAction ? null : output.activeTarget,
    targetSnapshots: output.targets.map(targetSnapshot),
    nextAction: nextAction(output),
  });
  return DiagnosticTurnV2Schema.parse({
    schemaVersion: DIAGNOSTIC_TURN_V2_VERSION,
    turn,
    audit: {
      source: 'EVALUATOR_V1',
      rawOutput: structuredClone(options.rawOutput),
      resolvedOutput: structuredClone(output),
      promptVersion: PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
      outputSchemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
    },
  });
}

export function applyAdaptedProblemEvaluatorTurn(
  sessionInput: ProblemSolvingSession,
  adaptedInput: DiagnosticTurnV2,
): ProblemSolvingSession {
  const session = ProblemSolvingSessionSchema.parse(sessionInput);
  const adapted = DiagnosticTurnV2Schema.parse(adaptedInput);
  const applied = applyProblemEvaluatorTurn(session, adapted.turn);
  return ProblemSolvingSessionSchema.parse({
    ...applied,
    evaluatorAudits: [...session.evaluatorAudits, adapted.audit],
  });
}
