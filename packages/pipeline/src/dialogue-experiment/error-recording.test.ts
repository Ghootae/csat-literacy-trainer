import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import type { DialogueEvaluationInput } from './evaluator.js';
import { CentralStoryGateV4ErrorClaimsResultSchema, CentralStoryGateV4StoredResultSchema,
  OpenAICentralStoryGateEvaluator, validateCentralStoryGateResult } from './gate.js';
import { ErrorClaimSchema, ExplicitErrorSchema, StudentRepresentationSnapshotSchema } from './schema.js';
import { TwoStageDialogueEvaluator } from './two-stage-evaluator.js';
import { buildSelectiveFeedbackPayload, type SelectiveFeedbackInput } from './selective-feedback.js';

const right = 'A는 허가가 필요하다';
const wrong = 'B도 허가가 필요하다';
const input: DialogueEvaluationInput = {
  gold: { paragraphId: 'error-quote', paragraphText: 'A는 허가가 필요하고 B는 보고만 필요하다.',
    centralObject: '절차', centralStory: '허가와 보고 구분',
    centralAxes: [{ id: 'AX1', description: 'A의 허가와 B의 보고를 구분한다.', relationIds: ['MR1'] }],
    coreRelations: [{ id: 'MR1', description: 'A는 허가, B는 보고.' }] },
  goldVersion: 'test', goldHash: 'test', turn: 1, questionsAsked: 0, maxQuestions: 3,
  initialResponse: `${right}. ${wrong}.`, history: [],
};
function wire() {
  return CentralStoryGateV4ErrorClaimsResultSchema.parse({
    status: 'DISTORTED', responseInformationLevel: 'RELATIONAL', effectiveResponse: input.initialResponse,
    centralObjectRepresentation: '허가', centralStoryRepresentation: null,
    claimLedger: [right, wrong].map((evidence) => ({ description: evidence, evidence, source: 'initial',
      responseIndex: 0, state: 'current', revisionEvidence: [] })),
    errorClaims: [{ axisId: 'AX1', claimIndex: 1, description: 'B의 보고를 허가로 오인했다.',
      evidence: wrong, source: 'initial', responseIndex: 0 }],
    axisStates: [{ axisId: 'AX1', state: 'distorted', evidence: [right, wrong].map((evidence) => ({ source: 'initial', evidence })), retractionEvidence: [] }],
    missingAxisEvidence: [], targetAxisId: 'AX1', questionIntent: 'B에 필요한 절차를 확인한다.',
    decisionSummary: 'B에 대한 명시적 오류가 있다.',
    axisFeedback: [{ axisId: 'AX1', status: 'ERROR', revealedText: null, reason: 'B의 절차 오류.' }],
  });
}
function feedbackMock() {
  return vi.fn(async (value: SelectiveFeedbackInput) => ({ result: {
    route: value.route, targetAxisId: 'AX1', selectedRelationId: null, targetDescription: 'B의 절차',
    studentFeedback: '원문과 비교해 봅시다.', nextQuestion: { type: 'CORRECTIVE' as const, text: 'B에는 어떤 절차가 필요한가요?' },
  }, call: { provider: 'mock' as const, model: 'mock', effort: 'none', promptVersion: 'feedback', schemaVersion: 'test',
    goldVersion: 'test', goldHash: 'test', calledAt: '2026-09-19T00:00:00Z', durationMs: 0 } }));
}

describe('explicit error quote recording', () => {
  it('축 첫 근거가 옳아도 지정된 오류만 snapshot·2차 입력·원출력에 보존한다', async () => {
    const raw = wire(); const before = structuredClone(raw);
    const parse = vi.fn().mockResolvedValue({ output_parsed: raw });
    const feedback = feedbackMock();
    const result = await new TwoStageDialogueEvaluator({
      gateEvaluator: new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', client: { responses: { parse } } as unknown as OpenAI }),
      feedbackEvaluator: { evaluate: feedback },
    }).evaluate(input);
    const errors = StudentRepresentationSnapshotSchema.parse(result.result.snapshot).explicitErrors;
    expect(errors).toEqual([{ ...raw.errorClaims[0], evidenceScope: 'student_error_quote', relatedRelationIds: [] }]);
    expect(errors[0]!.evidence).toBe(wrong);
    expect(result.result.status).toBe('ERROR');
    expect(JSON.parse(buildSelectiveFeedbackPayload(feedback.mock.calls[0]![0])).decision.explicitErrors).toEqual(raw.errorClaims);
    expect(result.call.decisionAudit?.rawResult).toEqual(before);
    expect(result.call.schemaVersion).toBe('axis-dialogue-selective-openai-v6');
    expect(result.call.stages?.[0]).toMatchObject({ promptVersion: 'central-story-gate-prompt-v4-claims-v2', schemaVersion: 'central-story-gate-openai-v8' });
    expect(parse.mock.calls[0]![0].text.format.schema.required).toContain('errorClaims');
    expect(parse.mock.calls[0]![0].instructions).toContain('오류 구절의 별도 지정');
    expect(CentralStoryGateV4StoredResultSchema.parse(result.call.decisionAudit?.validatedResult).errorClaims).toEqual(raw.errorClaims);
    errors[0]!.description = 'copy changed';
    expect(raw).toEqual(before);
  });

  it.each(['missing', 'axis', 'claim', 'quote', 'source', 'index', 'duplicate', 'retired'])(
    '잘못된 오류 근거를 계약 오류로 차단한다: %s', (kind) => {
      const raw = wire();
      if (kind === 'missing') raw.errorClaims = [];
      if (kind === 'axis') raw.errorClaims[0]!.axisId = 'AX9';
      if (kind === 'claim') raw.errorClaims[0]!.claimIndex = 20;
      if (kind === 'quote') raw.errorClaims[0]!.evidence = 'B에는 어떤 절차가 필요한가요?';
      if (kind === 'source') raw.errorClaims[0]!.source = 'corrective';
      if (kind === 'index') raw.errorClaims[0]!.responseIndex = 1;
      if (kind === 'duplicate') raw.errorClaims.push({ ...raw.errorClaims[0]! });
      if (kind === 'retired') {
        raw.claimLedger[1]!.state = 'retracted';
        raw.claimLedger[1]!.revisionEvidence = [{ source: 'corrective', responseIndex: 1, evidence: '취소합니다' }];
      }
      const testInput = kind === 'retired' ? { ...input, history: [{ question: { type: 'CORRECTIVE' as const, text: '다시 볼까요?' }, answer: '취소합니다' }] } : input;
      expect(() => validateCentralStoryGateResult(raw, testInput)).toThrow();
    },
  );

  it('부분 수정 뒤 옛 오류는 빼고 남은 오류만 인용하며 짧은 새 오류도 출처를 보존한다', () => {
    const raw = wire();
    const answer = 'B는 보고예요. A도 보고만.';
    raw.claimLedger[1]!.state = 'superseded';
    raw.claimLedger[1]!.revisionEvidence = [{ source: 'corrective', responseIndex: 1, evidence: 'B는 보고예요' }];
    raw.claimLedger.push({ description: 'A도 보고만 하면 된다', source: 'corrective', responseIndex: 1,
      evidence: 'A도 보고만', state: 'current', revisionEvidence: [] });
    raw.errorClaims = [{ ...raw.errorClaims[0]!, claimIndex: 2, source: 'corrective', responseIndex: 1,
      evidence: 'A도 보고만', description: 'A의 허가를 보고로 바꿨다.' }];
    const testInput = { ...input, history: [{ question: { type: 'CORRECTIVE' as const, text: 'B의 절차는?' }, answer }] };
    expect(validateCentralStoryGateResult(raw, testInput).result.errorClaims).toEqual(raw.errorClaims);
    raw.errorClaims[0] = { ...wire().errorClaims[0]! };
    expect(() => validateCentralStoryGateResult(raw, testInput)).toThrow(/current claim/);
  });

  it('PASS에는 오류 목록이 비어 있어야 하며 여러 오류는 첫 하나로 축소하지 않는다', () => {
    const raw = wire();
    raw.errorClaims.push({ ...raw.errorClaims[0]!, claimIndex: 0, evidence: right });
    // Meaning is model-supplied: structural validation intentionally does not grade the quote.
    expect(validateCentralStoryGateResult(raw, input).result.errorClaims).toHaveLength(2);
    raw.status = 'CAPTURED'; raw.targetAxisId = null; raw.questionIntent = null;
    raw.axisStates[0]!.state = 'captured'; raw.axisFeedback[0]!.status = 'PASS'; raw.axisFeedback[0]!.revealedText = '허가·보고 구분';
    expect(() => validateCentralStoryGateResult(raw, input)).toThrow(/distorted/);
    raw.errorClaims = [];
    expect(validateCentralStoryGateResult(raw, input).result.status).toBe('CAPTURED');
  });

  it('계약 실패를 한번 재시도하고 원출력·학생 응답을 보존하며 실패 시 질문기를 부르지 않는다', async () => {
    const good = wire(); const bad = wire(); bad.errorClaims[0]!.evidence = right;
    const parse = vi.fn().mockResolvedValueOnce({ output_parsed: bad }).mockResolvedValueOnce({ output_parsed: good });
    const evaluator = new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', retryDelayMs: 0,
      client: { responses: { parse } } as unknown as OpenAI });
    const result = await evaluator.evaluate(input);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.call.decisionAudit?.contractFailures?.[0]?.rawResult).toEqual(bad);
    const retry = JSON.parse(parse.mock.calls[1]![0].input);
    expect(retry.evidence.initialResponse).toBe(input.initialResponse);
    expect(retry.contractCorrection.previousInvalidOutput).toEqual(bad);
    parse.mockReset().mockResolvedValue({ output_parsed: bad });
    const feedback = feedbackMock();
    await expect(new TwoStageDialogueEvaluator({ gateEvaluator: evaluator, feedbackEvaluator: { evaluate: feedback } }).evaluate(input)).rejects.toMatchObject({ parsedOutput: bad });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(feedback).not.toHaveBeenCalled();
  });

  it('신규 인용 출처를 legacy branch로 조용히 제거하지 않고 과거 기록은 호환한다', () => {
    const error = { ...wire().errorClaims[0]!, evidenceScope: 'student_error_quote', relatedRelationIds: [] };
    expect(ExplicitErrorSchema.parse(error)).toEqual(error);
    expect(ExplicitErrorSchema.safeParse({ ...error, source: 'question' }).success).toBe(false);
    expect(ErrorClaimSchema.safeParse({ ...error, claimIndex: -1 }).success).toBe(false);
    expect(ExplicitErrorSchema.parse({ description: 'legacy', evidence: 'legacy quote', relatedRelationIds: [] }).evidence).toBe('legacy quote');
  });
});
