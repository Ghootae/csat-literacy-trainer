import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import { currentClaimsFromLedger } from './claim-recording.js';
import { CentralStoryGateV4ClaimsResultSchema, OpenAICentralStoryGateEvaluator, validateCentralStoryGateResult } from './gate.js';
import type { DialogueEvaluationInput } from './evaluator.js';
import { ClaimLedgerEntrySchema, StudentRepresentationSnapshotSchema, type ClaimLedgerEntry } from './schema.js';
import { TwoStageDialogueEvaluator } from './two-stage-evaluator.js';
import { buildSelectiveFeedbackPayload, type SelectiveFeedbackInput } from './selective-feedback.js';

const input: DialogueEvaluationInput = {
  gold: { paragraphId: 'claim-partial-repair', paragraphText: '말과 흰말은 범위와 용법을 구별한다.',
    centralObject: '말과 흰말', centralStory: '범위와 용법 구별',
    centralAxes: [{ id: 'AX1', description: '말과 흰말의 지시 범위와 용법은 다르다.', relationIds: ['MR1'] }],
    coreRelations: [{ id: 'MR1', description: '말과 흰말의 용법은 구분해야 한다.' }] },
  goldVersion: 'test', goldHash: 'test', turn: 2, questionsAsked: 1, maxQuestions: 3,
  initialResponse: '흰말을 구해도 검은 말을 가져와도 된다. 용법을 구분할 필요가 없다.',
  history: [{ question: { type: 'CORRECTIVE', text: '검은 말을 가져올 수 있나요? 용법은 어떻게 되나요?' }, answer: '흰말 달라면 검은 말은 안 돼요.' }],
};
const oldQuote = '흰말을 구해도 검은 말을 가져와도 된다';
const remainingQuote = '용법을 구분할 필요가 없다';
const revision = { source: 'corrective' as const, evidence: input.history[0]!.answer, responseIndex: 1 };
function ledger(): ClaimLedgerEntry[] {
  return [
    { description: '흰말 대신 검은 말도 허용된다', source: 'initial', evidence: oldQuote, responseIndex: 0, state: 'superseded', revisionEvidence: [revision] },
    { description: '용법 구분이 불필요하다', source: 'initial', evidence: remainingQuote, responseIndex: 0, state: 'current', revisionEvidence: [] },
    { description: '흰말 요구에 검은 말은 허용되지 않는다', ...revision, state: 'current', revisionEvidence: [] },
  ];
}
function wire() {
  return CentralStoryGateV4ClaimsResultSchema.parse({
    status: 'DISTORTED', responseInformationLevel: 'RELATIONAL', effectiveResponse: '검은 말은 안 된다고 수정했지만 용법 구분은 불필요하다는 주장이 남았다.',
    centralObjectRepresentation: '말과 흰말', centralStoryRepresentation: null,
    claimLedger: ledger(),
    axisStates: [{ axisId: 'AX1', state: 'distorted', evidence: [{ source: 'initial', evidence: remainingQuote }], retractionEvidence: [] }],
    missingAxisEvidence: [], targetAxisId: 'AX1', questionIntent: '미수정 용법 판단만 확인한다.', decisionSummary: '용법 판단 오류가 남았다.',
    axisFeedback: [{ axisId: 'AX1', status: 'ERROR', revealedText: null, reason: '용법 구분 불필요 주장이 남았다.' }],
  });
}

describe('current claim recording', () => {
  it('부분 수정은 바뀐 주장만 현재 목록에서 분리하고 새 주장·미수정 오류는 보존한다', () => {
    const raw = wire(); const saved = structuredClone(raw);
    const validated = validateCentralStoryGateResult(raw, input);
    expect(validated.result.expressedClaims.map((c) => c.evidence)).toEqual([remainingQuote, revision.evidence]);
    expect(validated.result.claimLedger).toEqual(ledger());
    expect(validated.result.status).toBe('DISTORTED');
    expect(validated.result.axisStates).toEqual(raw.axisStates);
    expect(validated.result.effectiveResponse).toBe(raw.effectiveResponse);
    expect(raw).toEqual(saved);
  });

  it('철회 후 모름을 새로운 정답 주장으로 만들지 않는다', () => {
    const answer = '그 말은 취소할게요. 모르겠어요.';
    const revisedInput = { ...input, history: [{ ...input.history[0]!, answer }] };
    const retired: ClaimLedgerEntry = { ...ledger()[0]!, state: 'retracted', revisionEvidence: [{ ...revision, evidence: answer }] };
    expect(currentClaimsFromLedger([retired], revisedInput)).toEqual([]);
  });

  it('네·헷갈림만으로는 코드가 기존 주장을 제거하지 않는다', () => {
    for (const answer of ['네.', '헷갈려요.']) {
      const unchanged = ledger().slice(0, 2).map((c) => ({ ...c, state: 'current' as const, revisionEvidence: [] }));
      expect(currentClaimsFromLedger(unchanged, { ...input, history: [{ ...input.history[0]!, answer }] }))
        .toHaveLength(2);
    }
  });

  it('명확한 수정 여부가 불분명한 모순은 두 current 주장을 임의로 합치지 않는다', () => {
    const ambiguous = ledger().map((c) => ({ ...c, state: 'current' as const, revisionEvidence: [] }));
    expect(currentClaimsFromLedger(ambiguous, input)).toHaveLength(3);
  });

  it('수정 뒤 이전 주장을 다시 말한 경우 최신 발화의 현재 주장은 보존한다', () => {
    const laterInput = { ...input, history: [...input.history, { question: { type: 'DIAGNOSTIC' as const, text: '다시 생각하면?' }, answer: oldQuote }] };
    const records = ledger();
    records.push({ ...records[0]!, source: 'diagnostic', responseIndex: 2, state: 'current', revisionEvidence: [] });
    expect(currentClaimsFromLedger(records, laterInput).at(-1)?.evidence).toBe(oldQuote);
  });

  it.each(['question', 'source', 'earlier', 'missing', 'current-with-revision', 'duplicate'])(
    '잘못된 변경 근거를 거부한다: %s', (kind) => {
      const records = ledger();
      if (kind === 'question') records[0]!.revisionEvidence[0] = { ...revision, evidence: input.history[0]!.question.text };
      if (kind === 'source') records[0]!.revisionEvidence[0] = { ...revision, source: 'diagnostic' };
      if (kind === 'earlier') records[0]!.revisionEvidence[0] = { source: 'initial', responseIndex: 0, evidence: oldQuote };
      if (kind === 'missing') records[0]!.revisionEvidence = [];
      if (kind === 'current-with-revision') records[0]!.state = 'current';
      if (kind === 'duplicate') records.push({ ...records[0]!, state: 'current', revisionEvidence: [] });
      expect(() => currentClaimsFromLedger(records, input)).toThrow();
    },
  );

  it('단순한 문자열 아닌 상태 계약과 과거 snapshot 호환을 유지한다', () => {
    expect(ClaimLedgerEntrySchema.safeParse({ ...ledger()[0], state: 'forgotten' }).success).toBe(false);
  });

  it('OK의 선택적 보완도 저장된 현재 주장과 이력을 재사용하고 재판정하지 않는다', async () => {
    const raw = wire();
    raw.status = 'UNCLEAR';
    raw.axisStates[0]!.state = 'partial';
    raw.axisFeedback[0]!.status = 'UNCLEAR_OK';
    raw.axisFeedback[0]!.revealedText = '확인한 범위만';
    raw.missingAxisEvidence = [{ axisId: 'AX1', axisQuote: input.gold.centralAxes[0]!.description }];
    const parse = vi.fn(async () => ({ output_parsed: raw }));
    const feedback = vi.fn(async (value: SelectiveFeedbackInput) => ({ result: {
      route: value.route, targetAxisId: 'AX1', selectedRelationId: null, targetDescription: '남은 의미',
      studentFeedback: '보완해 볼까요?', nextQuestion: { type: 'DIAGNOSTIC' as const, text: '용법을 설명해 볼까요?' },
    }, call: { provider: 'mock' as const, model: 'mock', effort: 'none', promptVersion: 'feedback', schemaVersion: 'test',
      goldVersion: input.goldVersion, goldHash: input.goldHash, calledAt: '2026-09-19T00:00:00Z', durationMs: 0 } }));
    const evaluator = new TwoStageDialogueEvaluator({
      gateEvaluator: new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', recordErrorEvidence: false, client: { responses: { parse } } as unknown as OpenAI }),
      feedbackEvaluator: { evaluate: feedback },
    });
    const prior = await evaluator.evaluate(input);
    expect(feedback).not.toHaveBeenCalled();
    const next = await evaluator.requestQuestion(input, prior);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(next.result.snapshot.claimLedger).toEqual(raw.claimLedger);
    expect(next.result.snapshot.expressedClaims).toEqual(prior.result.snapshot.expressedClaims);
  });

  it('V4 기본 호출에서 원장 원출력·현재 주장·질문 입력을 분리하고 재시도 감사를 보존한다', async () => {
    const good = wire(); const bad = wire();
    bad.claimLedger[0]!.revisionEvidence[0]!.evidence = input.history[0]!.question.text;
    const parse = vi.fn().mockResolvedValueOnce({ output_parsed: bad }).mockResolvedValueOnce({ output_parsed: good });
    const gateEvaluator = new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', recordErrorEvidence: false, retryDelayMs: 0,
      client: { responses: { parse } } as unknown as OpenAI });
    const feedback = vi.fn(async (value: SelectiveFeedbackInput) => ({ result: {
      route: value.route, targetAxisId: 'AX1', selectedRelationId: null, targetDescription: '남은 용법 판단',
      studentFeedback: '원문과 비교해 봅시다.', nextQuestion: { type: 'CORRECTIVE' as const, text: '두 명의 용법은 어떻게 보아야 하나요?' },
    }, call: { provider: 'mock' as const, model: 'mock', effort: 'none', promptVersion: 'feedback', schemaVersion: 'test',
      goldVersion: input.goldVersion, goldHash: input.goldHash, calledAt: '2026-09-19T00:00:00Z', durationMs: 0 } }));
    const evaluated = await new TwoStageDialogueEvaluator({ gateEvaluator, feedbackEvaluator: { evaluate: feedback } }).evaluate(input);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[0]![0].instructions).toContain('현재 주장과 변경 이력의 기록 계약');
    expect(parse.mock.calls[0]![0].text.format.schema.required).toContain('claimLedger');
    expect(parse.mock.calls[0]![0].text.format.schema.properties).not.toHaveProperty('expressedClaims');
    const evidence = JSON.parse(buildSelectiveFeedbackPayload(feedback.mock.calls[0]![0])).evidence;
    expect(evidence.expressedClaims.map((c: { evidence: string }) => c.evidence)).toEqual([remainingQuote, revision.evidence]);
    expect(evidence.initialResponse).toBe(input.initialResponse);
    expect(evaluated.result.status).toBe('ERROR');
    expect(evaluated.call.promptVersion).toBe('axis-dialogue-selective-v4');
    expect(evaluated.call.schemaVersion).toBe('axis-dialogue-selective-openai-v5');
    expect(evaluated.call.stages?.[0]).toMatchObject({ promptVersion: 'central-story-gate-prompt-v4-claims-v1', schemaVersion: 'central-story-gate-openai-v7' });
    expect(evaluated.call.decisionAudit?.rawResult).toEqual(good);
    expect(evaluated.call.decisionAudit?.contractFailures?.[0]?.rawResult).toEqual(bad);
    expect(StudentRepresentationSnapshotSchema.parse(evaluated.result.snapshot).claimLedger).toEqual(good.claimLedger);
    expect(evaluated.result.snapshot.expressedClaims).toHaveLength(2);
  });
});
