import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import type { DialogueCallMetadata, DialogueEvaluationInput } from './evaluator.js';
import {
  OpenAICentralStoryGateEvaluator,
  type CentralStoryGateCall,
  type CentralStoryGateEvaluator,
  type CentralStoryGateResult,
} from './gate.js';
import { loadDiagnosticGold } from './gold.js';
import type {
  SelectiveFeedbackCall,
  SelectiveFeedbackEvaluator,
  SelectiveFeedbackInput,
} from './selective-feedback.js';
import { selectiveStudentFeedback } from './selective-feedback.js';
import { TwoStageDialogueEvaluator, boundaryShowAction } from './two-stage-evaluator.js';
import { ExplicitErrorSchema, StudentRepresentationSnapshotSchema } from './schema.js';

const loaded = loadDiagnosticGold();
const input: DialogueEvaluationInput = {
  gold: loaded.gold,
  goldVersion: loaded.version,
  goldHash: loaded.hash,
  initialResponse: '학생 응답',
  history: [],
  turn: 1,
  questionsAsked: 0,
  maxQuestions: 3,
};

function callMetadata(promptVersion: string, schemaVersion: string): DialogueCallMetadata {
  return {
    provider: 'mock',
    model: 'mock',
    effort: 'none',
    promptVersion,
    schemaVersion,
    goldVersion: loaded.version,
    goldHash: loaded.hash,
    calledAt: '2026-09-09T00:00:00.000Z',
    durationMs: 10,
    usage: { inputTokens: 100, outputTokens: 20 },
  };
}

class FixedGate implements CentralStoryGateEvaluator {
  constructor(private readonly result: CentralStoryGateResult) {}

  async evaluate(): Promise<CentralStoryGateCall> {
    return {
      result: structuredClone(this.result),
      call: {
        ...callMetadata('central-story-gate-prompt-v2', 'central-story-gate-openai-v3'),
        decisionAudit: {
          rawResult: structuredClone(this.result),
          validatedResult: structuredClone(this.result),
          normalizationEvents: [],
        },
      },
    };
  }
}

class RecordingFeedback implements SelectiveFeedbackEvaluator {
  readonly inputs: SelectiveFeedbackInput[] = [];

  async evaluate(value: SelectiveFeedbackInput): Promise<SelectiveFeedbackCall> {
    this.inputs.push(structuredClone(value));
    return {
      result: {
        route: value.route,
        targetAxisId: value.gateDecision.targetAxisId!,
        selectedRelationId: value.selectedDetailedRelation?.id ?? null,
        targetDescription: '확인할 중심 내용',
        studentFeedback: selectiveStudentFeedback(
          value.route,
          value.dialogue.questionsAsked < value.dialogue.maxQuestions,
        ),
        nextQuestion: value.dialogue.questionsAsked >= value.dialogue.maxQuestions
          ? null
          : {
            type: value.route === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC',
            text: '이 관계를 원문을 근거로 설명해 보세요.',
          },
      },
      call: callMetadata(
        'dialogue-selective-feedback-prompt-v2',
        'dialogue-selective-feedback-openai-v2',
      ),
    };
  }
}

function gateResult(
  status: 'CAPTURED' | 'UNCLEAR' | 'DISTORTED',
  states?: readonly ('captured' | 'partial' | 'unknown' | 'distorted')[],
): CentralStoryGateResult {
  const targetAxis = loaded.gold.centralAxes[0]!;
  const defaultStates = loaded.gold.centralAxes.map((_, index) =>
    index === 0 && status !== 'CAPTURED'
      ? status === 'DISTORTED' ? 'distorted' as const : 'unknown' as const
      : 'captured' as const
  );
  const axisStates = loaded.gold.centralAxes.map((axis, index) => {
    const state = states?.[index] ?? defaultStates[index] ?? 'captured';
    return {
      axisId: axis.id,
      state,
      evidence: state === 'unknown'
        ? []
        : [{ source: 'initial' as const, evidence: '학생 응답' }],
      retractionEvidence: [],
    };
  });
  return {
    status,
    responseInformationLevel: status === 'CAPTURED' || status === 'DISTORTED'
      ? 'RELATIONAL'
      : axisStates.every((axis) => axis.state === 'unknown') ? 'TOPIC_ONLY' : 'RELATIONAL',
    effectiveResponse: '학생 응답을 문맥 독립적으로 합성한 내용',
    centralObjectRepresentation: '중심 대상',
    centralStoryRepresentation: status === 'CAPTURED' ? '복원한 중심 이야기' : null,
    expressedClaims: [{ description: '주장', source: 'initial', evidence: '학생 응답' }],
    axisStates,
    missingAxisEvidence: axisStates.flatMap((axis) =>
      axis.state === 'partial' || axis.state === 'unknown'
        ? [{ axisId: axis.axisId, axisQuote: loaded.gold.centralAxes.find((item) => item.id === axis.axisId)!.description }]
        : []),
    targetAxisId: status === 'CAPTURED' ? null : targetAxis.id,
    decisionSummary: `gate-${status}`,
  };
}

describe('selective two-stage dialogue evaluator', () => {
  it('CAPTURED 판정은 게이트가 확정하고 피드백 호출 없이 PASS한다', async () => {
    const feedback = new RecordingFeedback();
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('CAPTURED')),
      feedbackEvaluator: feedback,
    });

    const evaluated = await evaluator.evaluate(input);

    expect(evaluated.result.status).toBe('PASS');
    expect(evaluated.result.snapshot.axisStates).toEqual(gateResult('CAPTURED').axisStates);
    expect(evaluated.result.snapshot.relationStates).toHaveLength(loaded.gold.coreRelations.length);
    expect(evaluated.result.snapshot.relationStates.every((item) => item.state === 'unknown')).toBe(true);
    expect(feedback.inputs).toHaveLength(0);
    expect(evaluated.call.stages?.map((stage) => stage.stage)).toEqual(['central_story_gate']);
    expect(evaluated.call.decisionAudit).toEqual(expect.objectContaining({
      rawResult: gateResult('CAPTURED'),
      validatedResult: gateResult('CAPTURED'),
      normalizationEvents: [],
    }));
  });

  it('일부 축을 포착한 UNCLEAR는 TARGETED_GAP으로 보내고 상세 관계를 전달하지 않는다', async () => {
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const feedback = new RecordingFeedback();
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('UNCLEAR', states)),
      feedbackEvaluator: feedback,
    });

    const evaluated = await evaluator.evaluate(input);

    expect(evaluated.result.status).toBe('UNCLEAR');
    expect(feedback.inputs[0]?.route).toBe('TARGETED_GAP');
    expect(feedback.inputs[0]?.selectedDetailedRelation).toBeNull();
    expect(evaluated.result.targetIssue?.relatedRelationIds).toEqual([]);
    expect(evaluated.call.stages?.map((stage) => stage.stage)).toEqual([
      'central_story_gate',
      'selective_feedback',
    ]);
  });

  it('포착된 축 없이 여러 축이 unknown이면 SPARSE_GAP으로 상세 관계 하나만 선택한다', async () => {
    const feedback = new RecordingFeedback();
    const states = loaded.gold.centralAxes.map(() => 'unknown' as const);
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('UNCLEAR', states)),
      feedbackEvaluator: feedback,
    });

    const evaluated = await evaluator.evaluate(input);
    const selected = feedback.inputs[0]?.selectedDetailedRelation;

    expect(feedback.inputs[0]?.route).toBe('SPARSE_GAP');
    expect(selected).not.toBeNull();
    expect(evaluated.result.targetIssue?.relatedRelationIds).toEqual([selected?.id]);
  });

  it('DISTORTED는 상세 관계 판정 없이 ERROR 교정 경로로 고정한다', async () => {
    const feedback = new RecordingFeedback();
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('DISTORTED')),
      feedbackEvaluator: feedback,
    });

    const evaluated = await evaluator.evaluate(input);

    expect(evaluated.result.status).toBe('ERROR');
    expect(feedback.inputs[0]?.route).toBe('ERROR');
    expect(feedback.inputs[0]?.selectedDetailedRelation).toBeNull();
    expect(evaluated.result.nextQuestion?.type).toBe('CORRECTIVE');
    expect(evaluated.result.snapshot.explicitErrors).toHaveLength(1);
  });

  it.each([
    ['correct-first', [
      { source: 'initial' as const, evidence: 'mRNA 주입→바이러스 단백질 합성→면역' },
      { source: 'initial' as const, evidence: '백신 접종 자체로 바이러스에 감염될 위험이 있다' },
    ]],
    ['error-first', [
      { source: 'initial' as const, evidence: '백신 접종 자체로 바이러스에 감염될 위험이 있다' },
      { source: 'corrective' as const, evidence: 'mRNA 주입→바이러스 단백질 합성→면역' },
    ]],
    ['single-quote', [{ source: 'initial' as const, evidence: '학생 응답' }]],
    ['no-quote', []],
  ] as const)('오류 축 근거를 임의의 오류 인용으로 승격하지 않는다: %s', async (_, evidence) => {
    // Reproduces the mixed correct/incorrect axis evidence observed in the mRNA live trial.
    const decision = gateResult('DISTORTED');
    decision.axisStates[0]!.evidence = structuredClone([...evidence]);
    const original = structuredClone(decision);
    const feedback = new RecordingFeedback();
    const evaluated = await new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(decision), feedbackEvaluator: feedback,
    }).evaluate(input);

    expect(evaluated.result.snapshot.explicitErrors).toEqual([{
      description: `중심축 ${decision.axisStates[0]!.axisId}의 관계를 학생이 명시적으로 왜곡했다.`,
      relatedRelationIds: [],
      evidence: null,
      evidenceScope: 'axis_context',
      axisId: decision.axisStates[0]!.axisId,
      axisEvidence: evidence,
    }]);
    expect(StudentRepresentationSnapshotSchema.parse(evaluated.result.snapshot))
      .toEqual(evaluated.result.snapshot);
    expect(evaluated.result.status).toBe('ERROR');
    expect(evaluated.result.nextQuestion?.type).toBe('CORRECTIVE');
    expect(feedback.inputs[0]?.gateDecision).toEqual(original);
    expect(evaluated.call.decisionAudit?.rawResult).toEqual(original);
    expect(evaluated.result.snapshot.axisStates).toEqual(original.axisStates);
    expect(evaluated.call.schemaVersion).toBe('axis-dialogue-selective-openai-v4');
    expect(decision).toEqual(original);
    const stored = evaluated.result.snapshot.explicitErrors[0]!;
    if ('axisEvidence' in stored && stored.axisEvidence.length > 0) {
      stored.axisEvidence[0]!.evidence = 'changed stored context';
      expect(evaluated.result.snapshot.axisStates).toEqual(original.axisStates);
      expect(feedback.inputs[0]?.gateDecision).toEqual(original);
    }
  });

  it('기존 오류 인용은 호환되며 미지정 인용에는 축 문맥 표기가 필요하다', () => {
    const legacy = { description: '오류', relatedRelationIds: ['MR1'], evidence: '직접 인용' };
    expect(ExplicitErrorSchema.parse(legacy)).toEqual(legacy);
    expect(ExplicitErrorSchema.safeParse({ ...legacy, evidence: null }).success).toBe(false);
    expect(ExplicitErrorSchema.safeParse({ ...legacy, evidence: '' }).success).toBe(false);
  });

  it.each(['CAPTURED', 'UNCLEAR'] as const)('%s에는 축 오류 기록을 만들지 않는다', async (status) => {
    const evaluated = await new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult(status)),
      feedbackEvaluator: new RecordingFeedback(),
    }).evaluate(input);
    expect(evaluated.result.snapshot.explicitErrors).toEqual([]);
  });

  it('질문 기회를 모두 쓴 비통과 응답에는 종료 피드백과 null 질문을 반환한다', async () => {
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const feedback = new RecordingFeedback();
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('UNCLEAR', states)),
      feedbackEvaluator: feedback,
    });

    const evaluated = await evaluator.evaluate({ ...input, questionsAsked: 3, maxQuestions: 3 });

    expect(evaluated.result.nextQuestion).toBeNull();
    expect(evaluated.result.studentFeedback).toBe(
      '이번 답변만으로는 문단의 핵심 이해를 충분히 확인하지 못했습니다.',
    );
  });

  it('중심 이야기 게이트 API 입력에는 centralAxes만 있고 coreRelations는 포함되지 않는다', async () => {
    const parse = vi.fn(async () => ({
      output_parsed: gateResult('CAPTURED'),
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      },
    }));
    const evaluator = new OpenAICentralStoryGateEvaluator({
      client: { responses: { parse } } as unknown as OpenAI,
      maxTransportRetries: 0,
    });

    await evaluator.evaluate(input);

    const request = parse.mock.calls[0]?.[0] as { input: string };
    const sent = JSON.parse(request.input) as Record<string, unknown>;
    expect(sent).not.toHaveProperty('centralStory');
    expect(sent).toHaveProperty('centralAxes', loaded.gold.centralAxes.map(({ id, description }) => ({ id, description })));
    expect(JSON.stringify(sent)).not.toMatch(/coreRelations|diagnosticRole|keyMappings/);
  });

  it('마지막 답변의 새 근거 없이 이전 partial 축을 captured로 승격하지 않는다', async () => {
    const retryStates = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const parse = vi.fn()
      .mockResolvedValueOnce({
        output_parsed: gateResult('CAPTURED'),
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      })
      .mockResolvedValueOnce({
        output_parsed: gateResult('UNCLEAR', retryStates),
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      });
    const evaluator = new OpenAICentralStoryGateEvaluator({
      client: { responses: { parse } } as unknown as OpenAI,
      maxTransportRetries: 0,
      maxContractRetries: 1,
      retryDelayMs: 0,
    });
    const previousSnapshot = {
      turn: 1,
      effectiveResponse: '이전 합성 응답',
      centralObjectRepresentation: null,
      centralStoryRepresentation: null,
      expressedClaims: [],
      axisStates: loaded.gold.centralAxes.map((axis, index) => ({
        axisId: axis.id,
        state: index === 0 ? 'partial' as const : 'captured' as const,
        evidence: [{ source: 'initial' as const, evidence: '최초 응답의 근거' }],
      })),
      relationStates: loaded.gold.coreRelations.map((relation) => ({
        relationId: relation.id,
        state: 'unknown' as const,
      })),
      explicitErrors: [],
      unresolvedQuestions: [],
    };

    const evaluated = await evaluator.evaluate({
      ...input,
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'DIAGNOSTIC', text: '다른 축을 설명해 보세요.' },
        answer: '다른 축에 대한 답변',
      }],
      previousSnapshot,
    });

    expect(evaluated.result.status).toBe('UNCLEAR');
    expect(evaluated.result.axisStates[0]?.state).toBe('partial');
    expect(evaluated.result.targetAxisId).toBe(loaded.gold.centralAxes[0]!.id);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(evaluated.call.decisionAudit?.contractFailures).toHaveLength(1);
  });
  describe('경계 보여 주기 (D-0134)', () => {
    type S = 'PASS' | 'UNCLEAR_OK' | 'UNCLEAR_SERIOUS' | 'ERROR';
    const fb = (...statuses: S[]) => statuses.map((status) => ({ status }));
    it('boundaryShowAction은 표의 모든 행과 경계를 따른다', () => {
      expect(boundaryShowAction(fb('PASS', 'PASS'), 0)).toBe('PASS_THROUGH');
      expect(boundaryShowAction(fb('PASS', 'UNCLEAR_OK'), 0)).toBe('PASS_THROUGH');
      expect(boundaryShowAction(fb('UNCLEAR_OK'), 0)).toBe('PASS_THROUGH');
      expect(boundaryShowAction(fb('PASS', 'UNCLEAR_SERIOUS'), 0)).toBe('SHOW');
      expect(boundaryShowAction(fb('UNCLEAR_OK', 'UNCLEAR_SERIOUS'), 0)).toBe('SHOW');
      expect(boundaryShowAction(fb('UNCLEAR_SERIOUS', 'UNCLEAR_SERIOUS'), 0)).toBe('ASK');
      expect(boundaryShowAction(fb('UNCLEAR_SERIOUS'), 0)).toBe('ASK');
      expect(boundaryShowAction(fb('ERROR', 'PASS'), 0)).toBe('ASK');
      expect(boundaryShowAction(fb('ERROR', 'UNCLEAR_SERIOUS'), 0)).toBe('ASK');
      expect(boundaryShowAction(fb('PASS', 'PASS'), 1)).toBe('PASS_THROUGH');
      expect(boundaryShowAction(fb('PASS', 'UNCLEAR_OK'), 1)).toBe('PASS_THROUGH');
      expect(boundaryShowAction(fb('ERROR', 'PASS'), 1)).toBe('SHOW');
      expect(boundaryShowAction(fb('UNCLEAR_SERIOUS'), 1)).toBe('SHOW');
      expect(boundaryShowAction(fb('UNCLEAR_SERIOUS', 'UNCLEAR_SERIOUS'), 2)).toBe('SHOW');
    });

    function gateWith(statuses: readonly S[]): CentralStoryGateResult {
      const base = gateResult('UNCLEAR', loaded.gold.centralAxes.map(() => 'partial' as const));
      return { ...base, axisFeedback: loaded.gold.centralAxes.map((axis, index) => ({
        axisId: axis.id, status: statuses[index] ?? 'PASS', reason: '근거', revealedText: null,
      })) };
    }
    const oneSerious = (): S[] => ['UNCLEAR_SERIOUS', ...loaded.gold.centralAxes.slice(1).map(() => 'PASS' as const)];

    it('boundaryShow 1차 SERIOUS 일부는 피드백 평가기를 호출하지 않고 질문 없이 반환한다', async () => {
      const feedback = new RecordingFeedback();
      const evaluator = new TwoStageDialogueEvaluator({
        gateEvaluator: new FixedGate(gateWith(oneSerious())), feedbackEvaluator: feedback, boundaryShow: true,
      });
      const evaluated = await evaluator.evaluate({ ...input, maxQuestions: 1 });
      expect(feedback.inputs).toHaveLength(0);
      expect(evaluated.result.nextQuestion).toBeNull();
      expect(evaluated.result.status).toBe('UNCLEAR');
    });

    it('boundaryShow 미지정이면 같은 입력에서 기존처럼 질문을 만든다', async () => {
      const feedback = new RecordingFeedback();
      const evaluator = new TwoStageDialogueEvaluator({
        gateEvaluator: new FixedGate(gateWith(oneSerious())), feedbackEvaluator: feedback,
      });
      const evaluated = await evaluator.evaluate({ ...input, maxQuestions: 1 });
      expect(feedback.inputs).toHaveLength(1);
      expect(evaluated.result.nextQuestion).not.toBeNull();
    });

    it('boundaryShow라도 모든 축 SERIOUS이면 V4처럼 질문 1회를 만든다', async () => {
      const feedback = new RecordingFeedback();
      const evaluator = new TwoStageDialogueEvaluator({
        gateEvaluator: new FixedGate(gateWith(loaded.gold.centralAxes.map(() => 'UNCLEAR_SERIOUS' as const))),
        feedbackEvaluator: feedback, boundaryShow: true,
      });
      const evaluated = await evaluator.evaluate({ ...input, maxQuestions: 1 });
      expect(feedback.inputs).toHaveLength(1);
      expect(evaluated.result.nextQuestion).not.toBeNull();
    });
  });
});
