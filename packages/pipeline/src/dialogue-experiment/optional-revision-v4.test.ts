import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import type { DialogueCallMetadata, DialogueEvaluationInput } from './evaluator.js';
import { buildCentralStoryGatePayload, CentralStoryGateV4ResultSchema, OpenAICentralStoryGateEvaluator, validateCentralStoryGateResult, type CentralStoryGateResult } from './gate.js';
import { loadDiagnosticGold } from './gold.js';
import { selectiveStudentFeedback, type SelectiveFeedbackInput } from './selective-feedback.js';
import { DialogueSessionEngine, type DialogueExperimentSession } from './session.js';
import { TwoStageDialogueEvaluator } from './two-stage-evaluator.js';
import type { AxisFeedback } from './schema.js';

const loaded = loadDiagnosticGold();
const input: DialogueEvaluationInput = { gold: loaded.gold, goldVersion: loaded.version, goldHash: loaded.hash, initialResponse: '학생 응답', history: [], turn: 1, questionsAsked: 0, maxQuestions: 3 };
const call: DialogueCallMetadata = { provider: 'mock', model: 'mock', effort: 'none', promptVersion: 'central-story-gate-prompt-v4', schemaVersion: 'central-story-gate-openai-v6', goldVersion: loaded.version, goldHash: loaded.hash, calledAt: '2026-09-19T00:00:00.000Z', durationMs: 1 };

function result(status: AxisFeedback['status']): CentralStoryGateResult {
  const state = status === 'PASS' ? 'captured' : status === 'ERROR' ? 'distorted' : status === 'UNCLEAR_OK' ? 'partial' : 'unknown';
  return CentralStoryGateV4ResultSchema.parse({
    status: status === 'PASS' ? 'CAPTURED' : status === 'ERROR' ? 'DISTORTED' : 'UNCLEAR',
    responseInformationLevel: state === 'unknown' ? 'TOPIC_ONLY' : 'RELATIONAL',
    effectiveResponse: '학생 응답', centralObjectRepresentation: null, centralStoryRepresentation: null,
    expressedClaims: [],
    axisStates: loaded.gold.centralAxes.map((axis) => ({ axisId: axis.id, state, evidence: state === 'unknown' ? [] : [{ source: 'initial', evidence: '학생 응답' }], retractionEvidence: [] })),
    axisFeedback: loaded.gold.centralAxes.map((axis) => ({ axisId: axis.id, status, revealedText: ['PASS', 'UNCLEAR_OK'].includes(status) ? '확인된 의미만' : null, reason: '판정 근거' })),
    missingAxisEvidence: ['partial', 'unknown'].includes(state) ? loaded.gold.centralAxes.map((axis) => ({ axisId: axis.id, axisQuote: axis.description })) : [],
    targetAxisId: status === 'PASS' ? null : loaded.gold.centralAxes[0]!.id,
    questionIntent: status === 'PASS' ? null : '선택한 축의 미확인 의미만 확인', decisionSummary: '확인된 내용과 남은 내용을 구분',
  });
}

function harness(status: AxisFeedback['status'] = 'UNCLEAR_OK') {
  const gate = vi.fn(async (_input: DialogueEvaluationInput) => ({ result: result(status), call }));
  const feedback = vi.fn(async (value: SelectiveFeedbackInput) => ({
    result: { route: value.route, targetAxisId: value.gateDecision.targetAxisId!, selectedRelationId: value.selectedDetailedRelation?.id ?? null, targetDescription: '미확인 내용', studentFeedback: selectiveStudentFeedback(value.route), nextQuestion: { type: value.route === 'ERROR' ? 'CORRECTIVE' as const : 'DIAGNOSTIC' as const, text: '이 관계를 설명해 볼까요?' } },
    call: { ...call, promptVersion: 'dialogue-selective-feedback-prompt-v4' },
  }));
  const evaluator = new TwoStageDialogueEvaluator({ gateEvaluator: { evaluate: gate }, feedbackEvaluator: { evaluate: feedback } });
  const saved: DialogueExperimentSession[] = [];
  const engine = new DialogueSessionEngine({ evaluator, gold: loaded.gold, goldVersion: loaded.version, goldHash: loaded.hash, logger: { save: (value) => { saved.push(structuredClone(value)); } } });
  return { evaluator, engine, gate, feedback, saved };
}

describe('student-controlled paragraph v4', () => {
  it.each(['PASS', 'UNCLEAR_OK', 'UNCLEAR_SERIOUS', 'ERROR'] as const)('%s has a valid complete per-axis contract', (status) => {
    expect(validateCentralStoryGateResult(result(status), input).result.axisFeedback?.[0]?.status).toBe(status);
  });

  it('rejects missing axes, leaked hidden content, and ungrounded visible content', () => {
    const missing = result('PASS'); missing.axisFeedback!.pop();
    expect(() => validateCentralStoryGateResult(missing, input)).toThrow(/every axis/);
    const leaked = result('ERROR'); leaked.axisFeedback![0]!.revealedText = '정답';
    expect(() => validateCentralStoryGateResult(leaked, input)).toThrow(/Only evidenced/);
    const ungrounded = result('UNCLEAR_OK'); ungrounded.axisStates[0]!.evidence = [];
    expect(() => validateCentralStoryGateResult(ungrounded, input)).toThrow(/Only evidenced/);
  });

  it('requires the selected target to prioritize serious gaps over OK', () => {
    const mixed = result('UNCLEAR_OK');
    const last = mixed.axisFeedback!.at(-1)!;
    last.status = 'UNCLEAR_SERIOUS'; last.revealedText = null;
    expect(() => validateCentralStoryGateResult(mixed, input)).toThrow(/Target priority/);
    mixed.targetAxisId = last.axisId;
    expect(validateCentralStoryGateResult(mixed, input).result.targetAxisId).toBe(last.axisId);
  });

  it('v4 parses structured output and records its exact prompt/schema without an API call', async () => {
    const parse = vi.fn(async () => ({ output_parsed: result('UNCLEAR_OK') }));
    const evaluator = new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', recordClaimLifecycle: false, client: { responses: { parse } } as unknown as OpenAI });
    const evaluated = await evaluator.evaluate(input);
    expect(evaluated.call).toMatchObject({ promptVersion: 'central-story-gate-prompt-v4', schemaVersion: 'central-story-gate-openai-v6' });
    expect(evaluated.call.decisionAudit?.rawResult).toHaveProperty('axisFeedback');
  });

  it('OK asks nothing automatically; opt-in uses the saved gate and calls only feedback', async () => {
    const h = harness();
    const first = await h.engine.submitInitial('학생 응답');
    expect(first).toMatchObject({ questionShown: null, terminal: false });
    const originalFeedback = first.evaluation.studentFeedback;
    expect(h.engine.canRequestQuestion).toBe(true);
    expect(h.feedback).not.toHaveBeenCalled();
    await h.engine.requestQuestion();
    expect(h.gate).toHaveBeenCalledTimes(1);
    expect(h.feedback).toHaveBeenCalledTimes(1);
    expect(h.engine.canRequestQuestion).toBe(false);
    expect(h.engine.dialogueRecord.turns[0]?.evaluationBeforeQuestion?.studentFeedback).toBe(originalFeedback);
    await expect(h.engine.requestQuestion()).rejects.toThrow();
    const completed = h.engine.continueWithoutRevision();
    expect(completed.turns).toHaveLength(1);
    expect(completed.turns[0]).toMatchObject({ studentAnswer: null, questionCall: { promptVersion: 'dialogue-selective-feedback-prompt-v4' } });
    expect(completed.finalStatus).toBe('SKIPPED');
    expect(completed.finalSnapshot.summaryComplete).toBe(false);
  });

  it.each(['UNCLEAR_SERIOUS', 'ERROR'] as const)('%s automatically asks, but skipping preserves the actual judgement', async (status) => {
    const h = harness(status);
    await h.engine.submitInitial('학생 응답');
    expect(h.feedback).toHaveBeenCalledTimes(1);
    expect(h.engine.pendingQuestion?.type).toBe(status === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC');
    expect(h.engine.canRequestQuestion).toBe(false);
    const completed = h.engine.continueWithoutRevision();
    expect(completed.finalStatus).toBe('SKIPPED');
    expect(completed.finalSnapshot.axisFeedback?.every((axis) => axis.status === status)).toBe(true);
    expect(h.saved).toHaveLength(1);
    h.engine.continueWithoutRevision();
    expect(h.saved).toHaveLength(1);
  });

  it('PASS calls no feedback and cannot become SKIPPED', async () => {
    const h = harness('PASS');
    await h.engine.submitInitial('학생 응답');
    expect(h.feedback).not.toHaveBeenCalled();
    expect(h.engine.continueWithoutRevision().finalStatus).toBe('PASS');
  });

  it('three opt-in questions share the existing budget and preserve answers and disclosures separately', async () => {
    const h = harness();
    await h.engine.submitInitial('학생 응답');
    for (let i = 0; i < 3; i++) {
      await h.engine.requestQuestion();
      await h.engine.submitFollowUp(`짧은 보완 ${i}`);
    }
    expect(h.engine.canRequestQuestion).toBe(false);
    expect(h.feedback).toHaveBeenCalledTimes(3);
    expect(h.gate).toHaveBeenCalledTimes(4);
    const final = h.engine.completedSessionSnapshot!;
    expect(final.finalStatus).toBe('UNRESOLVED');
    expect(final.turns).toHaveLength(4);
    expect(final.turns.slice(0, 3).map((turn) => turn.studentAnswer)).toEqual(['짧은 보완 0', '짧은 보완 1', '짧은 보완 2']);
    const payload = JSON.parse(buildCentralStoryGatePayload(h.gate.mock.calls.at(-1)![0]));
    expect(payload.revealedAxisContent.length).toBeGreaterThan(0);
    expect(payload.evidence.initialResponse).toBe('학생 응답');
    expect(payload.evidence.followUpExchanges).toHaveLength(3);
    expect(payload.evidence).not.toHaveProperty('revealedAxisContent');
  });

  it('failed initial, opt-in, and follow-up requests are retryable without consuming an answer', async () => {
    const h = harness();
    h.gate.mockRejectedValueOnce(new Error('一時障害'));
    await expect(h.engine.submitInitial('학생 응답')).rejects.toThrow();
    await h.engine.submitInitial('학생 응답');
    h.feedback.mockRejectedValueOnce(new Error('一時障害'));
    await expect(h.engine.requestQuestion()).rejects.toThrow();
    expect(h.engine.canRequestQuestion).toBe(true);
    await h.engine.requestQuestion();
    h.gate.mockRejectedValueOnce(new Error('一時障害'));
    await expect(h.engine.submitFollowUp('같은 보완')).rejects.toThrow();
    expect(h.engine.pendingQuestion).not.toBeNull();
    await h.engine.submitFollowUp('같은 보완');
    const completed = h.engine.continueWithoutRevision();
    expect(completed.turns).toHaveLength(2);
    expect(completed.turns[0]?.studentAnswer).toBe('같은 보완');
  });
});
