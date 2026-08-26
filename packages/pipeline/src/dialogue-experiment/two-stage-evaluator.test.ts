import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import type {
  DialogueCallMetadata,
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
} from './evaluator.js';
import { loadDialoguePrompt } from './evaluator.js';
import {
  OpenAICentralStoryGateEvaluator,
  loadCentralStoryGatePrompt,
  type CentralStoryGateCall,
  type CentralStoryGateEvaluator,
  type CentralStoryGateResult,
} from './gate.js';
import { loadDiagnosticGold } from './gold.js';
import type { EvaluationResult } from './schema.js';
import { TwoStageDialogueEvaluator } from './two-stage-evaluator.js';

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
    calledAt: '2026-08-25T00:00:00.000Z',
    durationMs: 10,
    usage: { inputTokens: 100, outputTokens: 20 },
  };
}

class FixedGate implements CentralStoryGateEvaluator {
  constructor(private readonly result: CentralStoryGateResult) {}

  async evaluate(): Promise<CentralStoryGateCall> {
    return {
      result: structuredClone(this.result),
      call: callMetadata('central-story-gate-prompt-v1', 'central-story-gate-openai-v1'),
    };
  }
}

class RecordingDiagnostic implements DialogueEvaluator {
  readonly inputs: DialogueEvaluationInput[] = [];

  constructor(private readonly result: EvaluationResult) {}

  async evaluate(value: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    this.inputs.push(structuredClone(value));
    return {
      result: structuredClone(this.result),
      call: callMetadata('dialogue-diagnostic-prompt-v1', 'dialogue-evaluation-openai-v4'),
    };
  }
}

function gateResult(status: 'CAPTURED' | 'UNCLEAR' | 'DISTORTED'): CentralStoryGateResult {
  const targetAxis = loaded.gold.centralAxes[0]!;
  return {
    status,
    effectiveResponse: '학생 응답을 문맥 독립적으로 합성한 내용',
    centralObjectRepresentation: '중심 대상',
    centralStoryRepresentation: '학생이 복원한 중심 이야기',
    expressedClaims: [{ description: '주장', source: 'initial', evidence: '학생 응답' }],
    axisStates: loaded.gold.centralAxes.map((axis, index) => ({
      axisId: axis.id,
      state: index === 0 && status !== 'CAPTURED'
        ? status === 'DISTORTED' ? 'distorted' as const : 'unknown' as const
        : 'captured' as const,
      evidence: index === 0 && status !== 'CAPTURED'
        ? []
        : [{ source: 'initial' as const, evidence: '학생 응답' }],
    })),
    targetAxisId: status === 'CAPTURED' ? null : targetAxis.id,
    decisionSummary: `gate-${status}`,
  };
}

function diagnosticResult(status: 'PASS' | 'UNCLEAR' | 'ERROR'): EvaluationResult {
  const target = loaded.gold.centralAxes[0]!.relationIds[0]!;
  return {
    status,
    snapshot: {
      turn: 1,
      centralObjectRepresentation: '중심 대상',
      centralStoryRepresentation: null,
      expressedClaims: [],
      relationStates: loaded.gold.coreRelations.map((relation, index) => ({
        relationId: relation.id,
        state: index === 0
          ? status === 'ERROR' ? 'contradicted' : status === 'PASS' ? 'explicit' : 'unknown'
          : 'unknown',
        ...(index === 0 && status === 'ERROR'
          ? { source: 'initial' as const, evidence: '잘못된 연결' }
          : index === 0 && status === 'PASS'
            ? { source: 'diagnostic' as const, evidence: '새로 확인한 관계' }
            : {}),
      })),
      explicitErrors: [],
      unresolvedQuestions: [],
    },
    decisionSummary: `diagnostic-${status}`,
    targetIssue: status === 'PASS' ? null : { description: '대상 축', relatedRelationIds: [target] },
    nextQuestion: status === 'PASS' ? null : {
      type: status === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC',
      text: '중심 축을 설명해 보세요.',
    },
    studentFeedback: '조금 더 설명해 보세요.',
  };
}

describe('two-stage dialogue evaluator', () => {
  it('질문은 증거가 아니라 생략 답변 해석 문맥으로 쓰고 합성 응답을 두 단계가 공유한다', () => {
    const gatePrompt = loadCentralStoryGatePrompt();
    const diagnosticPrompt = loadDialoguePrompt('dialogue-axis-diagnostic-prompt-v1');

    expect(gatePrompt).toContain('effectiveResponse');
    expect(gatePrompt).toContain('담화 문맥');
    expect(gatePrompt).toContain('질문 문구를 evidence로 인용하지 않는다');
    expect(diagnosticPrompt).toContain('gateDecision.effectiveResponse');
    expect(diagnosticPrompt).toContain('원시 문답을 서로 독립된 답변처럼 다시 분리해 해석하지 않는다');
  });

  it('게이트가 CAPTURED이면 판정을 고정하고 관계 표상 갱신 단계를 거쳐 PASS한다', async () => {
    const diagnostic = new RecordingDiagnostic(diagnosticResult('PASS'));
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('CAPTURED')),
      diagnosticEvaluator: diagnostic,
    });

    const evaluated = await evaluator.evaluate(input);

    expect(evaluated.result.status).toBe('PASS');
    expect(evaluated.result.snapshot.axisStates).toEqual(gateResult('CAPTURED').axisStates);
    expect(evaluated.result.snapshot.relationStates[0]?.state).toBe('explicit');
    expect(diagnostic.inputs).toHaveLength(1);
    expect(evaluated.call.stages?.map((stage) => stage.stage)).toEqual([
      'central_story_gate',
      'relation_diagnostic',
    ]);
  });

  it('UNCLEAR일 때만 관계 진단을 호출하고 게이트 판정을 전달한다', async () => {
    const diagnostic = new RecordingDiagnostic(diagnosticResult('UNCLEAR'));
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('UNCLEAR')),
      diagnosticEvaluator: diagnostic,
    });

    const evaluated = await evaluator.evaluate(input);

    expect(evaluated.result.status).toBe('UNCLEAR');
    expect(diagnostic.inputs[0]?.gateDecision).toEqual({
      status: 'UNCLEAR',
      decisionSummary: 'gate-UNCLEAR',
      effectiveResponse: '학생 응답을 문맥 독립적으로 합성한 내용',
      expressedClaims: [{ description: '주장', source: 'initial', evidence: '학생 응답' }],
      targetAxisId: loaded.gold.centralAxes[0]!.id,
      axisStates: loaded.gold.centralAxes.map((axis, index) => ({
        axisId: axis.id,
        state: index === 0 ? 'unknown' : 'captured',
      })),
    });
    expect(evaluated.result.snapshot.effectiveResponse).toBe(
      '학생 응답을 문맥 독립적으로 합성한 내용',
    );
    expect(evaluated.call.stages?.map((stage) => stage.stage)).toEqual([
      'central_story_gate',
      'relation_diagnostic',
    ]);
  });

  it('관계 진단기가 1단계 판정을 변경하면 거부한다', async () => {
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new FixedGate(gateResult('DISTORTED')),
      diagnosticEvaluator: new RecordingDiagnostic(diagnosticResult('UNCLEAR')),
    });

    await expect(evaluator.evaluate(input)).rejects.toThrow(/expected ERROR/);
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
    expect(sent).toHaveProperty('centralStory', loaded.gold.centralStory);
    expect(sent).toHaveProperty('centralAxes', loaded.gold.centralAxes);
    expect(JSON.stringify(sent)).not.toMatch(/coreRelations|diagnosticRole|keyMappings/);
  });

  it('마지막 답변의 새 근거 없이 이전 partial 축을 captured로 승격하지 않는다', async () => {
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
    const previousSnapshot = {
      ...diagnosticResult('UNCLEAR').snapshot,
      axisStates: loaded.gold.centralAxes.map((axis, index) => ({
        axisId: axis.id,
        state: index === 0 ? 'partial' as const : 'captured' as const,
        evidence: [{ source: 'initial' as const, evidence: '최초 응답의 근거' }],
      })),
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
  });
});
