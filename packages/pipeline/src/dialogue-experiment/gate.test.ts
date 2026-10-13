import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import type { DialogueEvaluationInput } from './evaluator.js';
import {
  loadCentralStoryGatePrompt,
  CentralStoryGateV31ResultSchema,
  buildCentralStoryGatePayload,
  validateCentralStoryGateResult,
  OpenAICentralStoryGateEvaluator,
  type CentralStoryGateResult,
} from './gate.js';
import { loadDiagnosticGold } from './gold.js';
import type { StudentRepresentationSnapshot } from './schema.js';

const loaded = loadDiagnosticGold();

function baseInput(): DialogueEvaluationInput {
  return {
    gold: loaded.gold,
    goldVersion: loaded.version,
    goldHash: loaded.hash,
    initialResponse: '최초 학생 응답',
    history: [],
    turn: 1,
    questionsAsked: 0,
    maxQuestions: 3,
  };
}

function gateResult(
  states: readonly ('captured' | 'partial' | 'unknown' | 'distorted')[],
  targetAxisId: string | null,
): CentralStoryGateResult {
  const status = states.includes('distorted')
    ? 'DISTORTED'
    : states.every((state) => state === 'captured') ? 'CAPTURED' : 'UNCLEAR';
  return {
    status,
    responseInformationLevel: states.every((state) => state === 'unknown')
      ? 'TOPIC_ONLY'
      : 'RELATIONAL',
    effectiveResponse: '학생이 현재 확정한 누적 의미',
    centralObjectRepresentation: '중심 대상',
    centralStoryRepresentation: status === 'CAPTURED' ? '중심 이야기' : null,
    expressedClaims: [{
      description: '학생 주장',
      source: 'initial',
      evidence: '최초 학생 응답',
    }],
    axisStates: loaded.gold.centralAxes.map((axis, index) => {
      const state = states[index] ?? 'unknown';
      return {
        axisId: axis.id,
        state,
        evidence: state === 'unknown'
          ? []
          : [{ source: 'initial' as const, evidence: '최초 학생 응답' }],
        retractionEvidence: [],
      };
    }),
    missingAxisEvidence: loaded.gold.centralAxes.flatMap((axis, index) =>
      ['partial', 'unknown'].includes(states[index] ?? 'unknown')
        ? [{ axisId: axis.id, axisQuote: axis.description }] : []),
    targetAxisId,
    decisionSummary: '확인된 내용과 미확인 내용을 구분한 판정 요약',
  };
}

function previousSnapshot(
  states: readonly ('captured' | 'partial' | 'unknown' | 'distorted')[],
): StudentRepresentationSnapshot {
  return {
    turn: 1,
    effectiveResponse: '이전 누적 응답',
    centralObjectRepresentation: '중심 대상',
    centralStoryRepresentation: null,
    expressedClaims: [],
    axisStates: loaded.gold.centralAxes.map((axis, index) => {
      const state = states[index] ?? 'unknown';
      return {
        axisId: axis.id,
        state,
        evidence: state === 'unknown'
          ? []
          : [{ source: 'initial' as const, evidence: '이전 학생 주장' }],
        retractionEvidence: [],
      };
    }),
    relationStates: loaded.gold.coreRelations.map((relation) => ({
      relationId: relation.id,
      state: 'unknown' as const,
    })),
    explicitErrors: [],
    unresolvedQuestions: [],
  };
}

async function evaluate(
  raw: CentralStoryGateResult,
  input: DialogueEvaluationInput,
) {
  const parse = vi.fn(async () => ({
    output_parsed: raw,
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    },
  }));
  const evaluator = new OpenAICentralStoryGateEvaluator({
    client: { responses: { parse } } as unknown as OpenAI,
    maxTransportRetries: 0,
    maxContractRetries: 0,
  });
  return evaluator.evaluate(input);
}

describe('central story gate validation and audit', () => {
  it('v3.1 opt-in은 목적 필드를 파싱·보존하고 별도 버전을 기록한다', async () => {
    const raw = { ...gateResult(loaded.gold.centralAxes.map(() => 'partial'), loaded.gold.centralAxes[0]!.id), questionIntent: '대상 축의 누락 의미만 확인한다.' };
    const parse = vi.fn(async () => ({ output_parsed: raw }));
    const evaluator = new OpenAICentralStoryGateEvaluator({ promptRevision: 'v3.1', client: { responses: { parse } } as unknown as OpenAI });
    const call = await evaluator.evaluate(baseInput());
    expect(call.result.questionIntent).toBe(raw.questionIntent);
    expect(call.call.promptVersion).toBe('central-story-gate-prompt-v3.1');
    expect(call.call.schemaVersion).toBe('central-story-gate-openai-v5');
    expect(call.call.decisionAudit?.rawResult).toHaveProperty('questionIntent', raw.questionIntent);
    expect(new OpenAICentralStoryGateEvaluator().promptRevision).toBe('v3');
  });

  it('v3.1 후보는 질문 목적을 필수 전달하고 PASS이면 null이어야 한다', () => {
    const raw = gateResult(loaded.gold.centralAxes.map(() => 'partial'), loaded.gold.centralAxes[0]!.id);
    expect(() => CentralStoryGateV31ResultSchema.parse(raw)).toThrow();
    const candidate = CentralStoryGateV31ResultSchema.parse({ ...raw, questionIntent: '미확인 의미만 확인하며 추가 원인은 요구하지 않는다.' });
    expect(validateCentralStoryGateResult(candidate, baseInput()).result.questionIntent).toBe(candidate.questionIntent);
    expect(() => validateCentralStoryGateResult({ ...candidate, questionIntent: null }, baseInput())).toThrow(/questionIntent/);
    const passed = gateResult(loaded.gold.centralAxes.map(() => 'captured'), null);
    expect(() => validateCentralStoryGateResult({ ...passed, questionIntent: '추가 질문' }, baseInput())).toThrow(/questionIntent/);
  });

  it('v3.1의 일반 규칙은 표현 생략과 내용 누락을 구별하고 학생 관계를 보존한다', () => {
    const prompt = loadCentralStoryGatePrompt('v3.1');
    expect(prompt).toContain('표현이 다르거나 압축됐다는 것과 내용 자체가 빠졌다는 것을 구별한다');
    expect(prompt).toContain('잘못된 원인 연결을 삭제하지 않는다');
    expect(prompt).toContain('questionIntent');
  });

  it('판정 입력에서 중심 이야기, 상세 관계, 관계 ID를 제외한다', () => {
    const value = JSON.parse(buildCentralStoryGatePayload(baseInput()));
    expect(value).not.toHaveProperty('centralStory');
    expect(value).not.toHaveProperty('coreRelations');
    expect(value.centralAxes).toEqual(loaded.gold.centralAxes.map(({ id, description }) => ({ id, description })));
  });

  it('축 표현 대신 원문 문장을 누락 근거로 쓰거나 출처를 생략하면 계약 오류다', () => {
    const raw = gateResult(loaded.gold.centralAxes.map(() => 'partial'), loaded.gold.centralAxes[0]!.id);
    raw.missingAxisEvidence[0]!.axisQuote = '축에는 없는 추가 원인을 설명해야 한다';
    expect(() => validateCentralStoryGateResult(raw, baseInput())).toThrow(/missingAxisEvidence/);
    raw.missingAxisEvidence = [];
    expect(() => validateCentralStoryGateResult(raw, baseInput())).toThrow(/missingAxisEvidence/);
  });

  it('정확한 축 인용은 검증하되 원문에 없는 의미 판단을 코드가 대신하지 않는다', () => {
    const raw = gateResult(loaded.gold.centralAxes.map(() => 'partial'), loaded.gold.centralAxes[0]!.id);
    expect(validateCentralStoryGateResult(raw, baseInput()).result.missingAxisEvidence).toEqual(raw.missingAxisEvidence);
  });

  it('V2 프롬프트는 축 설명을 정답 문장이 아닌 참조로 사용하고 단순 나열을 관계화하지 않는다', () => {
    const prompt = loadCentralStoryGatePrompt();

    expect(prompt).toContain('학생이 그대로 재현해야 하는 정답 문장이 아니다');
    expect(prompt).toContain('포함된 모든 절과 수식어를 자동으로 필수 요구하지 않는다');
    expect(prompt).toContain('단순 나열만으로 관계를 부여하지 않는다');
    expect(prompt).toContain('retractionEvidence');
    expect(prompt).toContain('contractCorrection');
  });

  it('명시적 철회 근거가 있으면 distorted를 unknown으로 변경할 수 있다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'unknown' as const : 'captured' as const
    );
    const raw = gateResult(states, firstAxis.id);
    raw.axisStates[0]!.retractionEvidence = [{
      source: 'corrective',
      evidence: '앞의 말은 취소할게요. 잘 모르겠습니다.',
    }];

    const call = await evaluate(raw, {
      ...baseInput(),
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'CORRECTIVE', text: '앞의 설명을 다시 확인해 보세요.' },
        answer: '앞의 말은 취소할게요. 잘 모르겠습니다.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'distorted' as const : 'captured' as const
      )),
    });

    expect(call.result.axisStates[0]?.state).toBe('unknown');
    expect(call.result.status).toBe('UNCLEAR');
    expect(call.call.decisionAudit?.rawResult).toEqual(raw);
    expect(call.call.decisionAudit?.validatedResult).toEqual(call.result);
  });

  it('직접 근거를 감싼 인용부호는 학생 문장 일치 검사에서 무시한다', async () => {
    const states = loaded.gold.centralAxes.map(() => 'captured' as const);
    const raw = gateResult(states, null);
    raw.axisStates[0]!.evidence = [{
      source: 'corrective',
      evidence: '“관계를 올바르게 고쳤습니다.”',
    }];

    const call = await evaluate(raw, {
      ...baseInput(),
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'CORRECTIVE', text: '앞의 설명을 다시 확인해 보세요.' },
        answer: '관계를 올바르게 고쳤습니다.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'distorted' as const : 'captured' as const
      )),
    });

    expect(call.result.axisStates[0]?.state).toBe('captured');
    expect(call.call.decisionAudit?.normalizationEvents).toEqual([]);
  });

  it('철회나 새 이해 근거가 없으면 상태를 조용히 복원하지 않고 계약 오류로 처리한다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'unknown' as const : 'captured' as const
    );
    const raw = gateResult(states, firstAxis.id);
    await expect(evaluate(raw, {
      ...baseInput(),
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'CORRECTIVE', text: '앞의 설명을 다시 확인해 보세요.' },
        answer: '아직 헷갈립니다.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'distorted' as const : 'captured' as const
      )),
    })).rejects.toMatchObject({
      name: 'CentralStoryGateContractError',
      message: expect.stringContaining(`axisStates.${firstAxis.id}.state changed`),
    });
  });

  it('과거 후속 답변의 근거를 이번 턴의 새 근거로 재사용하면 계약 오류로 처리한다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'captured' as const : 'captured' as const
    );
    const raw = gateResult(states, null);
    raw.axisStates[0]!.evidence = [{
      source: 'diagnostic',
      evidence: '이전 턴에서 설명한 관계',
    }];

    await expect(evaluate(raw, {
      ...baseInput(),
      turn: 3,
      questionsAsked: 2,
      history: [{
        question: { type: 'DIAGNOSTIC', text: '첫 번째 축을 설명해 보세요.' },
        answer: '이전 턴에서 설명한 관계',
      }, {
        question: { type: 'DIAGNOSTIC', text: '다른 축을 설명해 보세요.' },
        answer: '이번에는 다른 축만 설명합니다.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'partial' as const : 'captured' as const
      )),
    })).rejects.toMatchObject({
      name: 'CentralStoryGateContractError',
      message: expect.stringContaining(`axisStates.${firstAxis.id}.state changed`),
    });
  });

  it('공손룡 후속 답변의 누적 의미를 축 근거에 다시 기록하면 CAPTURED를 보존한다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const invalid = gateResult(loaded.gold.centralAxes.map(() => 'captured' as const), null);
    invalid.axisStates[0]!.evidence = [{
      source: 'initial',
      evidence: '말과 흰말의 지시 대상이 다름',
    }];
    const corrected = structuredClone(invalid);
    corrected.axisStates[0]!.evidence.push({
      source: 'diagnostic',
      evidence: '말: 모든말 / 흰말: 오직 흰말 -> 지시 대상이 다름.',
    });
    const parse = vi.fn()
      .mockResolvedValueOnce({
        output_parsed: invalid,
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      })
      .mockResolvedValueOnce({
        output_parsed: corrected,
        usage: {
          input_tokens: 110,
          output_tokens: 22,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      });
    const evaluator = new OpenAICentralStoryGateEvaluator({
      client: { responses: { parse } } as unknown as OpenAI,
      maxTransportRetries: 0,
      maxContractRetries: 1,
      retryDelayMs: 0,
    });
    const input = {
      ...baseInput(),
      initialResponse: '말과 흰말의 지시 대상이 다름 -> 구분 필요 주장.',
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'DIAGNOSTIC' as const, text: '요구할 수 있는 말의 범위를 설명해 보세요.' },
        answer: '말: 모든말 / 흰말: 오직 흰말 -> 지시 대상이 다름.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'partial' as const : 'captured' as const
      )),
    };

    const call = await evaluator.evaluate(input);

    expect(call.result.status).toBe('CAPTURED');
    expect(call.result.axisStates[0]?.state).toBe('captured');
    expect(parse).toHaveBeenCalledTimes(2);
    const retryRequest = parse.mock.calls[1]?.[0] as { input: string };
    expect(JSON.parse(retryRequest.input)).toEqual(expect.objectContaining({
      contractCorrection: expect.objectContaining({
        validationError: expect.stringContaining(`axisStates.${firstAxis.id}.state changed`),
      }),
    }));
    expect(call.call.attempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        outcome: 'error',
        error: expect.objectContaining({ type: 'contract_validation', retryable: true }),
      }),
      expect.objectContaining({ attempt: 2, outcome: 'success' }),
    ]);
    expect(call.call.decisionAudit?.contractFailures).toEqual([
      expect.objectContaining({ attempt: 1, rawResult: invalid }),
    ]);
  });

  it('재시도에서도 최신 근거가 없으면 비대상 축을 승격하지 않는다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const invalid = gateResult(loaded.gold.centralAxes.map(() => 'captured' as const), null);
    const correctedStates = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const corrected = gateResult(correctedStates, firstAxis.id);
    const parse = vi.fn()
      .mockResolvedValueOnce({
        output_parsed: invalid,
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      })
      .mockResolvedValueOnce({
        output_parsed: corrected,
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

    const call = await evaluator.evaluate({
      ...baseInput(),
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'DIAGNOSTIC', text: '다른 축을 설명해 보세요.' },
        answer: '이번에는 다른 축만 설명합니다.',
      }],
      previousSnapshot: previousSnapshot(correctedStates),
    });

    expect(call.result.status).toBe('UNCLEAR');
    expect(call.result.axisStates[0]?.state).toBe('partial');
    expect(call.result.targetAxisId).toBe(firstAxis.id);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('distorted가 없으면 unknown이 있어도 모델이 고른 partial 축을 보존한다', async () => {
    const [partialAxis, unknownAxis] = loaded.gold.centralAxes;
    expect(partialAxis).toBeDefined();
    expect(unknownAxis).toBeDefined();
    const raw = gateResult(['partial', 'unknown'], partialAxis!.id);

    const call = await evaluate(raw, baseInput());

    expect(call.result.targetAxisId).toBe(partialAxis!.id);
    expect(call.call.decisionAudit?.normalizationEvents).toEqual([]);
  });

  it('captured 축을 질문 대상으로 고르면 유효한 미해결 축으로 보정하고 기록한다', async () => {
    const [capturedAxis, unknownAxis] = loaded.gold.centralAxes;
    expect(capturedAxis).toBeDefined();
    expect(unknownAxis).toBeDefined();
    const raw = gateResult(['captured', 'unknown'], capturedAxis!.id);

    const call = await evaluate(raw, baseInput());

    expect(call.result.targetAxisId).toBe(unknownAxis!.id);
    expect(call.call.decisionAudit?.normalizationEvents).toEqual([
      expect.objectContaining({
        field: 'targetAxisId',
        before: capturedAxis!.id,
        after: unknownAxis!.id,
      }),
    ]);
  });

  it('철회만으로 distorted를 captured로 승격하면 계약 오류로 처리한다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const states = loaded.gold.centralAxes.map(() => 'captured' as const);
    const raw = gateResult(states, null);
    raw.axisStates[0]!.evidence = [{ source: 'initial', evidence: '이전의 틀린 주장' }];
    raw.axisStates[0]!.retractionEvidence = [{
      source: 'corrective',
      evidence: '앞의 말은 취소하겠습니다.',
    }];

    await expect(evaluate(raw, {
      ...baseInput(),
      turn: 2,
      questionsAsked: 1,
      history: [{
        question: { type: 'CORRECTIVE', text: '앞의 설명을 다시 확인해 보세요.' },
        answer: '앞의 말은 취소하겠습니다.',
      }],
      previousSnapshot: previousSnapshot(loaded.gold.centralAxes.map((_, index) =>
        index === 0 ? 'distorted' as const : 'captured' as const
      )),
    })).rejects.toMatchObject({
      name: 'CentralStoryGateContractError',
      message: expect.stringContaining(`axisStates.${firstAxis.id}.state changed`),
    });
  });

  it('최초 응답으로 잘못 표기된 철회 근거는 제거하고 감사 로그에 남긴다', async () => {
    const firstAxis = loaded.gold.centralAxes[0]!;
    const raw = gateResult(['partial', 'captured'], firstAxis.id);
    raw.axisStates[0]!.retractionEvidence = [{
      source: 'initial',
      evidence: '최초 학생 응답',
    }];

    const call = await evaluate(raw, baseInput());

    expect(call.result.axisStates[0]?.retractionEvidence).toEqual([]);
    expect(call.call.decisionAudit?.normalizationEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        field: `axisStates.${firstAxis.id}.retractionEvidence`,
        before: raw.axisStates[0]!.retractionEvidence,
        after: [],
      }),
    ]));
  });
});
