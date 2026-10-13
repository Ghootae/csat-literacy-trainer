import type {
  DialogueCallMetadata,
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
} from './evaluator.js';
import {
  OpenAICentralStoryGateEvaluator,
  CentralStoryGateV4StoredResultSchema,
  type CentralStoryGateCall,
  type CentralStoryGateEvaluator,
  type CentralStoryGateResult,
} from './gate.js';
import {
  OpenAISelectiveFeedbackEvaluator,
  selectDialogueFeedbackRoute,
  selectSparseDetailedRelation,
  type SelectiveFeedbackCall,
  type SelectiveFeedbackEvaluator,
  type SelectiveFeedbackRoute,
  type SelectedDetailedRelation,
} from './selective-feedback.js';
import {
  PASS_STUDENT_FEEDBACK,
  type EvaluationResult,
  type StudentRepresentationSnapshot,
} from './schema.js';

export const TWO_STAGE_DIALOGUE_PROMPT_VERSION = 'axis-dialogue-selective-v4';
export const TWO_STAGE_DIALOGUE_SCHEMA_VERSION = 'axis-dialogue-selective-openai-v7';

export interface TwoStageDialogueEvaluatorOptions {
  readonly promptRevision?: 'v3' | 'v3.1' | 'v4';
  readonly gateEvaluator?: CentralStoryGateEvaluator;
  readonly feedbackEvaluator?: SelectiveFeedbackEvaluator;
}

function usage(calls: readonly DialogueCallMetadata[]): NonNullable<DialogueCallMetadata['usage']> {
  return {
    inputTokens: calls.reduce((sum, call) => sum + (call.usage?.inputTokens ?? 0), 0),
    outputTokens: calls.reduce((sum, call) => sum + (call.usage?.outputTokens ?? 0), 0),
    cacheWriteTokens: calls.reduce((sum, call) => sum + (call.usage?.cacheWriteTokens ?? 0), 0),
    cacheReadTokens: calls.reduce((sum, call) => sum + (call.usage?.cacheReadTokens ?? 0), 0),
  };
}

function metadata(
  gate: CentralStoryGateCall,
  feedback: SelectiveFeedbackCall | undefined,
): DialogueCallMetadata {
  const calls = feedback === undefined ? [gate.call] : [gate.call, feedback.call];
  return {
    provider: calls.every((call) => call.provider === 'mock') ? 'mock' : 'openai',
    model: calls.map((call) => call.model).join(' + '),
    effort: calls.map((call) => call.effort).join(' + '),
    promptVersion: gate.call.promptVersion.startsWith('central-story-gate-prompt-v4')
      ? TWO_STAGE_DIALOGUE_PROMPT_VERSION : gate.call.promptVersion === 'central-story-gate-prompt-v3.1'
        ? 'axis-dialogue-selective-v3.1-candidate' : 'axis-dialogue-selective-v3',
    schemaVersion: feedback?.result.sourceGuide !== undefined ? TWO_STAGE_DIALOGUE_SCHEMA_VERSION
      : gate.result.errorClaims !== undefined ? 'axis-dialogue-selective-openai-v6'
      : gate.result.claimLedger === undefined ? 'axis-dialogue-selective-openai-v4' : 'axis-dialogue-selective-openai-v5',
    goldVersion: gate.call.goldVersion,
    goldHash: gate.call.goldHash,
    calledAt: gate.call.calledAt,
    durationMs: calls.reduce((sum, call) => sum + call.durationMs, 0),
    usage: usage(calls),
    decisionAudit: structuredClone(gate.call.decisionAudit ?? {
      rawResult: gate.result, validatedResult: gate.result, normalizationEvents: [],
    }),
    stages: calls.map((call, index) => ({
      stage: index === 0 ? 'central_story_gate' : 'selective_feedback',
      promptVersion: call.promptVersion,
      schemaVersion: call.schemaVersion,
      durationMs: call.durationMs,
      ...(index !== 0 && call.decisionAudit ? { decisionAudit: structuredClone(call.decisionAudit) } : {}),
      ...(call.usage === undefined ? {} : { usage: call.usage }),
    })),
  };
}

function relationStates(
  input: DialogueEvaluationInput,
): StudentRepresentationSnapshot['relationStates'] {
  const previous = new Map(
    (input.previousSnapshot?.relationStates ?? []).map((relation) => [relation.relationId, relation]),
  );
  return input.gold.coreRelations.map((relation) =>
    structuredClone(previous.get(relation.id) ?? {
      relationId: relation.id,
      state: 'unknown' as const,
    })
  );
}

function explicitErrors(
  gate: CentralStoryGateResult,
): StudentRepresentationSnapshot['explicitErrors'] {
  if (gate.errorClaims !== undefined) {
    return gate.errorClaims.map((error) => ({ ...error,
      evidenceScope: 'student_error_quote' as const, relatedRelationIds: [],
    }));
  }
  return gate.axisStates.flatMap((axis) => {
    if (axis.state !== 'distorted') return [];
    // The gate provides axis evidence, not a separately located error quote.
    // Never promote the first (or even the only) axis quote to an error citation.
    return [{
      description: `중심축 ${axis.axisId}의 관계를 학생이 명시적으로 왜곡했다.`,
      relatedRelationIds: [],
      evidence: null,
      evidenceScope: 'axis_context' as const,
      axisId: axis.axisId,
      axisEvidence: structuredClone(axis.evidence),
    }];
  });
}

export function snapshot(
  input: DialogueEvaluationInput,
  gate: CentralStoryGateResult,
  route: SelectiveFeedbackRoute | null,
  unresolvedQuestion: string | null,
): StudentRepresentationSnapshot {
  const capturedAxisIds = gate.axisStates
    .filter((axis) => axis.state === 'captured')
    .map((axis) => axis.axisId);
  const unresolvedAxisIds = gate.axisStates
    .filter((axis) => axis.state !== 'captured')
    .map((axis) => axis.axisId);
  const previousDistorted = new Set(
    (input.previousSnapshot?.axisStates ?? [])
      .filter((axis) => axis.state === 'distorted')
      .map((axis) => axis.axisId),
  );
  const currentDistorted = new Set(
    gate.axisStates.filter((axis) => axis.state === 'distorted').map((axis) => axis.axisId),
  );
  return {
    turn: input.turn,
    effectiveResponse: gate.effectiveResponse,
    ...(gate.axisFeedback === undefined ? {} : { axisFeedback: gate.axisFeedback }),
    diagnosticRoute: route,
    capturedAxisIds,
    unresolvedAxisIds,
    repairTargetRecovered: previousDistorted.size > 0 &&
      [...previousDistorted].every((axisId) => !currentDistorted.has(axisId)),
    summaryComplete: gate.status === 'CAPTURED',
    centralObjectRepresentation: gate.centralObjectRepresentation,
    centralStoryRepresentation: gate.centralStoryRepresentation,
    expressedClaims: gate.expressedClaims,
    ...(gate.claimLedger === undefined ? {} : { claimLedger: structuredClone(gate.claimLedger) }),
    axisStates: gate.axisStates,
    relationStates: relationStates(input),
    explicitErrors: explicitErrors(gate),
    unresolvedQuestions: unresolvedQuestion === null ? [] : [unresolvedQuestion],
  };
}

function passResult(
  input: DialogueEvaluationInput,
  gate: CentralStoryGateResult,
): EvaluationResult {
  return {
    status: 'PASS',
    snapshot: snapshot(input, gate, null, null),
    decisionSummary: gate.decisionSummary,
    targetIssue: null,
    nextQuestion: null,
    studentFeedback: PASS_STUDENT_FEEDBACK,
  };
}

function nonPassResult(
  input: DialogueEvaluationInput,
  gate: CentralStoryGateResult,
  route: SelectiveFeedbackRoute,
  selectedRelation: SelectedDetailedRelation | null,
  feedback: SelectiveFeedbackCall,
): EvaluationResult {
  const status = route === 'ERROR' ? 'ERROR' : 'UNCLEAR';
  return {
    status,
    ...(feedback.result.sourceGuide === undefined ? {} : { sourceGuide: feedback.result.sourceGuide }),
    snapshot: snapshot(input, gate, route, feedback.result.targetDescription),
    decisionSummary: `${gate.decisionSummary} ${feedback.result.targetDescription}`,
    targetIssue: {
      description: feedback.result.targetDescription,
      relatedRelationIds: selectedRelation === null ? [] : [selectedRelation.id],
    },
    nextQuestion: feedback.result.nextQuestion,
    studentFeedback: feedback.result.studentFeedback,
  };
}

/**
 * 간결 중심축 게이트가 모든 판정 권한을 소유한다. 두 번째 단계는 판정을 바꾸지 않고
 * 코드가 선택한 ERROR/TARGETED_GAP/SPARSE_GAP 경로의 질문만 생성한다.
 */
export class TwoStageDialogueEvaluator implements DialogueEvaluator {
  private readonly gateEvaluator: CentralStoryGateEvaluator;
  private readonly feedbackEvaluator: SelectiveFeedbackEvaluator;

  constructor(options: TwoStageDialogueEvaluatorOptions = {}) {
    const promptRevision = options.promptRevision ?? 'v4';
    this.gateEvaluator = options.gateEvaluator ?? new OpenAICentralStoryGateEvaluator({ promptRevision });
    this.feedbackEvaluator = options.feedbackEvaluator ?? new OpenAISelectiveFeedbackEvaluator({ promptRevision });
  }

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const gate = await this.gateEvaluator.evaluate(input);
    const route = selectDialogueFeedbackRoute(gate.result);
    if (route === 'PASS') {
      return { result: passResult(input, gate.result), call: metadata(gate, undefined) };
    }

    if (gate.result.axisFeedback !== undefined &&
      (input.questionsAsked >= input.maxQuestions ||
        gate.result.axisFeedback.every((axis) => axis.status === 'PASS' || axis.status === 'UNCLEAR_OK'))) {
      return {
        result: {
          status: route === 'ERROR' ? 'ERROR' : 'UNCLEAR',
          snapshot: snapshot(input, gate.result, route, null),
          decisionSummary: gate.result.decisionSummary,
          targetIssue: null,
          nextQuestion: null,
          studentFeedback: input.questionsAsked >= input.maxQuestions
            ? '이번 문단의 질문은 여기까지입니다. 다음 문단으로 넘어갈 수 있어요.'
            : '확인된 내용을 표시했어요. 더 보완하거나 다음 문단으로 넘어갈 수 있어요.',
        },
        call: metadata(gate, undefined),
      };
    }

    const selectedRelation = route === 'SPARSE_GAP'
      ? selectSparseDetailedRelation(input.gold, gate.result, input)
      : null;
    const feedback = await this.feedbackEvaluator.evaluate({
      dialogue: input,
      gateDecision: gate.result,
      route,
      selectedDetailedRelation: selectedRelation,
    });
    return {
      result: nonPassResult(input, gate.result, route, selectedRelation, feedback),
      call: metadata(gate, feedback),
    };
  }

  /** Uses the retained gate decision; requesting help must not re-grade the student. */
  async requestQuestion(input: DialogueEvaluationInput, prior: DialogueEvaluationCall): Promise<DialogueEvaluationCall> {
    if (input.questionsAsked >= input.maxQuestions || prior.result.nextQuestion !== null ||
      prior.result.status !== 'UNCLEAR') throw new Error('현재 보완 질문을 요청할 수 없습니다.');
    const gate = CentralStoryGateV4StoredResultSchema.parse(prior.call.decisionAudit?.validatedResult);
    if (!gate.axisFeedback.some((axis) => axis.status === 'UNCLEAR_OK') ||
      gate.axisFeedback.some((axis) => axis.status === 'ERROR' || axis.status === 'UNCLEAR_SERIOUS')) {
      throw new Error('선택적 질문은 UNCLEAR-OK에서만 요청할 수 있습니다.');
    }
    const route = selectDialogueFeedbackRoute(gate);
    if (route === 'PASS' || route === 'ERROR') throw new Error('질문 경로가 올바르지 않습니다.');
    const selected = route === 'SPARSE_GAP' ? selectSparseDetailedRelation(input.gold, gate, input) : null;
    const feedback = await this.feedbackEvaluator.evaluate({ dialogue: input, gateDecision: gate, route, selectedDetailedRelation: selected });
    return { result: nonPassResult(input, gate, route, selected, feedback), call: feedback.call };
  }
}
