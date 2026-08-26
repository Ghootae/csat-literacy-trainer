import {
  OpenAIDialogueEvaluator,
  type DialogueCallMetadata,
  type DialogueEvaluationCall,
  type DialogueEvaluationInput,
  type DialogueEvaluator,
} from './evaluator.js';
import {
  OpenAICentralStoryGateEvaluator,
  type CentralStoryGateCall,
  type CentralStoryGateEvaluator,
} from './gate.js';
import type { EvaluationResult, RelationState } from './schema.js';
export const TWO_STAGE_DIALOGUE_PROMPT_VERSION = 'axis-dialogue-v2';
export const TWO_STAGE_DIALOGUE_SCHEMA_VERSION = 'axis-dialogue-openai-v1';

export interface TwoStageDialogueEvaluatorOptions {
  readonly gateEvaluator?: CentralStoryGateEvaluator;
  readonly diagnosticEvaluator?: DialogueEvaluator;
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
  diagnostic: DialogueEvaluationCall | undefined,
): DialogueCallMetadata {
  const calls = diagnostic === undefined ? [gate.call] : [gate.call, diagnostic.call];
  return {
    provider: calls.every((call) => call.provider === 'mock') ? 'mock' : 'openai',
    model: calls.map((call) => call.model).join(' + '),
    effort: calls.map((call) => call.effort).join(' + '),
    promptVersion: TWO_STAGE_DIALOGUE_PROMPT_VERSION,
    schemaVersion: TWO_STAGE_DIALOGUE_SCHEMA_VERSION,
    goldVersion: gate.call.goldVersion,
    goldHash: gate.call.goldHash,
    calledAt: gate.call.calledAt,
    durationMs: calls.reduce((sum, call) => sum + call.durationMs, 0),
    usage: usage(calls),
    stages: calls.map((call, index) => ({
      stage: index === 0 ? 'central_story_gate' : 'relation_diagnostic',
      promptVersion: call.promptVersion,
      schemaVersion: call.schemaVersion,
      durationMs: call.durationMs,
      ...(call.usage === undefined ? {} : { usage: call.usage }),
    })),
  };
}

function contradictedRelationIds(result: EvaluationResult): Set<string> {
  return new Set(
    result.snapshot.relationStates
      .filter((relation) => relation.state === 'contradicted')
      .map((relation) => relation.relationId),
  );
}

/**
 * 최종 상태의 우선순위는 코드가 소유한다.
 *
 * 관계 진단에서 명시적 오류가 발견되면 중심축 게이트의 충분성 판정보다
 * ERROR가 우선한다. 오류가 없을 때만 게이트가 PASS/UNCLEAR를 결정한다.
 */
function expectedFinalStatus(
  gateStatus: CentralStoryGateCall['result']['status'],
  relationStates: readonly { readonly state: RelationState }[],
): EvaluationResult['status'] {
  if (relationStates.some((relation) => relation.state === 'contradicted')) return 'ERROR';
  if (gateStatus === 'CAPTURED') return 'PASS';
  if (gateStatus === 'UNCLEAR') return 'UNCLEAR';
  return 'ERROR';
}

export class TwoStageDialogueEvaluator implements DialogueEvaluator {
  private readonly gateEvaluator: CentralStoryGateEvaluator;
  private readonly diagnosticEvaluator: DialogueEvaluator;

  constructor(options: TwoStageDialogueEvaluatorOptions = {}) {
    this.gateEvaluator = options.gateEvaluator ?? new OpenAICentralStoryGateEvaluator();
    this.diagnosticEvaluator = options.diagnosticEvaluator ?? new OpenAIDialogueEvaluator({
      promptVersion: 'dialogue-axis-diagnostic-prompt-v2',
      timeoutMs: 60_000,
      maxTransportRetries: 1,
    });
  }

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const gate = await this.gateEvaluator.evaluate(input);
    const diagnostic = await this.diagnosticEvaluator.evaluate({
      ...input,
      gateDecision: {
        status: gate.result.status,
        decisionSummary: gate.result.decisionSummary,
        effectiveResponse: gate.result.effectiveResponse,
        expressedClaims: gate.result.expressedClaims,
        targetAxisId: gate.result.targetAxisId,
        axisStates: gate.result.axisStates.map(({ axisId, state }) => ({ axisId, state })),
      },
    });
    const contradicted = contradictedRelationIds(diagnostic.result);
    const expected = expectedFinalStatus(
      gate.result.status,
      diagnostic.result.snapshot.relationStates,
    );
    if (diagnostic.result.status !== expected) {
      throw new Error(
        `two-stage dialogue: diagnostic status ${diagnostic.result.status}, expected ${expected}`,
      );
    }
    // 게이트가 고른 미포착 축보다 명시적 오류가 우선한다. ERROR 승격 시에는
    // 교정 대상이 원래 targetAxis가 아닌 다른 축에 속할 수 있다.
    const escalatedToError = contradicted.size > 0 && gate.result.status !== 'DISTORTED';
    if (gate.result.targetAxisId !== null && !escalatedToError) {
      const axis = input.gold.centralAxes.find((item) => item.id === gate.result.targetAxisId);
      if (axis === undefined) {
        throw new Error(`two-stage dialogue: unknown target axis ${gate.result.targetAxisId}`);
      }
      const allowed = new Set(axis.relationIds);
      const targeted = diagnostic.result.targetIssue?.relatedRelationIds ?? [];
      if (targeted.length === 0 || targeted.some((id) => !allowed.has(id))) {
        throw new Error('two-stage dialogue: target relations must belong to the selected axis');
      }
    }
    return {
      result: {
        ...diagnostic.result,
        snapshot: {
          ...diagnostic.result.snapshot,
          effectiveResponse: gate.result.effectiveResponse,
          axisStates: gate.result.axisStates,
        },
      },
      call: metadata(gate, diagnostic),
    };
  }
}
