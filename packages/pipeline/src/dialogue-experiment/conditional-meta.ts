import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { zodTextFormat } from 'openai/helpers/zod';
import { recordMetric } from '../llm/client.js';
import type { DialogueEvaluationInput, DialogueEvaluator, DialogueEvaluationCall, DialogueCallMetadata } from './evaluator.js';
import { OpenAICentralStoryGateEvaluator, CentralStoryGateV4StoredResultSchema, type CentralStoryGateEvaluator, type CentralStoryGateCall } from './gate.js';
import { OpenAISelectiveFeedbackEvaluator, type SelectiveFeedbackEvaluator } from './selective-feedback.js';
import { snapshot } from './two-stage-evaluator.js';
import type { EvaluationResult } from './schema.js';
export const CONDITIONAL_META_VERSION = 'conditional-meta-v1';
export const ConditionalMetaGoldSchema = z.object({
    schemaVersion: z.literal('conditional-meta-gold-v1'), paragraphId: z.string().min(1),
    sourceGoldHash: z.string().regex(/^[a-f0-9]{64}$/), centralStory: z.string().min(1), provenance: z.string().min(1),
    axes: z.array(z.object({ id: z.string().min(1), description: z.string().min(1), metaAxis: z.string().min(1) })).min(1),
}).superRefine((v, c) => { if (new Set(v.axes.map(a => a.id)).size !== v.axes.length)
    c.addIssue({ code: 'custom', message: '중복 축 ID' }); });
export type ConditionalMetaGold = z.infer<typeof ConditionalMetaGoldSchema>;
export const MetaResultSchema = z.object({ axes: z.array(z.object({
        axisId: z.string(), fulfilled: z.boolean(), reason: z.string(), evidenceQuotes: z.array(z.string()), unresolvedMeaning: z.string().nullable(),
    })) });
export type MetaResult = z.infer<typeof MetaResultSchema>;
export interface MetaInput {
    readonly metaAxes: readonly {
        id: string;
        metaAxis: string;
    }[];
    readonly dialogue: DialogueEvaluationInput;
}
export interface MetaCall {
    readonly result: MetaResult;
    readonly call: DialogueCallMetadata;
}
export interface MetaEvaluator {
    evaluate(input: MetaInput): Promise<MetaCall>;
}
const promptRoot = 'docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29';
export function loadConcreteMeaningInstructions(): string { return readFileSync(resolve(process.cwd(), promptRoot, 'level1-instructions.md'), 'utf8'); }
export function buildMetaPayload(input: MetaInput): string {
    return JSON.stringify({ metaAxes: input.metaAxes, studentResponse: input.dialogue.initialResponse,
        ...(input.dialogue.history.length ? { followUpExchanges: input.dialogue.history.map(({ question, answer }) => ({ question: question.text, answer })) } : {}),
    }, null, 2);
}
export function validateMetaResult(value: unknown, input: MetaInput): MetaResult {
    const result = MetaResultSchema.parse(value), expected = input.metaAxes.map(a => a.id).sort(), actual = result.axes.map(a => a.axisId).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual))
        throw new Error('메타 판정 축 목록 불일치');
    const answers = [input.dialogue.initialResponse, ...input.dialogue.history.map(h => h.answer)];
    for (const a of result.axes) {
        if (!a.reason.trim())
            throw new Error('메타 판정 이유 누락');
        if (a.evidenceQuotes.some(q => !q.trim() || !answers.some(s => s.includes(q))))
            throw new Error('메타 판정 학생 인용 불일치');
        if (a.fulfilled ? !a.evidenceQuotes.length || a.unresolvedMeaning !== null : !a.unresolvedMeaning?.trim())
            throw new Error('메타 판정 근거 계약 불일치');
    }
    return result;
}
export class OpenAIMetaEvaluator implements MetaEvaluator {
    private client: OpenAI | undefined;
    constructor(client?: OpenAI) { this.client = client; }
    async evaluate(input: MetaInput): Promise<MetaCall> {
        const start = performance.now(), calledAt = new Date().toISOString();
        const instructions = readFileSync(resolve(process.cwd(), promptRoot, 'level2-instructions.md'), 'utf8') + (input.dialogue.history.length ? '\n\n## 후속 응답 누적\nstudentResponse는 최초 응답이며 followUpExchanges는 시간순 질문과 답변이다. 후속 답변이 수정·철회한 의미는 최신 상태로 해석한다. 질문은 짧은 답변의 문맥일 뿐 학생이 이해했다는 독립 근거가 아니다. 학생이 실제로 채운 의미만 합성하고, evidenceQuotes는 최초 응답 또는 후속 answer의 정확한 연속 부분 문자열로만 작성한다. 질문·이전 판정·골드로 학생의 빠진 이해를 채우지 않는다.' : '');
        this.client ??= new OpenAI({ maxRetries: 0 });
        const response = await this.client.responses.parse({ model: 'gpt-5.6-terra', instructions, input: buildMetaPayload(input), reasoning: { effort: 'medium' }, max_output_tokens: 4000, store: false, text: { format: zodTextFormat(MetaResultSchema, 'meta_axis_evaluation') } }, { timeout: 60000, maxRetries: 0 });
        const durationMs = Math.round(performance.now() - start), usage = { inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0, cacheReadTokens: response.usage?.input_tokens_details.cached_tokens ?? 0 };
        recordMetric({ ts: calledAt, op: 'dialogue-experiment', model: 'gpt-5.6-terra', effort: 'medium', paragraphId: input.dialogue.gold.paragraphId, ...usage, ms: durationMs });
        if (response.status !== 'completed')
            throw new Error('메타 판정이 완료되지 않았습니다. 다시 제출해 주세요.');
        const result = validateMetaResult(response.output_parsed, input);
        return { result, call: { provider: 'openai', model: 'gpt-5.6-terra', effort: 'medium', promptVersion: input.dialogue.history.length ? 'functional-meta-evaluation-history-v1' : 'functional-meta-evaluation-v1', schemaVersion: 'meta-axis-evaluation-v1', goldVersion: input.dialogue.goldVersion, goldHash: input.dialogue.goldHash, calledAt, durationMs, usage, decisionAudit: { rawResult: response.output_parsed, validatedResult: result, normalizationEvents: [] } } };
    }
}
export type ConditionalRouting = NonNullable<EvaluationResult['routing']>;
export function conditionalRouting(gate: CentralStoryGateCall['result'], meta: MetaResult | null): ConditionalRouting {
    if (!gate.axisFeedback)
        throw new Error('구체 인정 축 판정이 없습니다.');
    const axes = gate.axisFeedback.map(a => {
        const fulfilled = meta?.axes.find(m => m.axisId === a.axisId)?.fulfilled ?? null;
        if (a.status === 'UNCLEAR_SERIOUS' && fulfilled === null)
            throw new Error('SERIOUS 메타 판정이 없습니다.');
        const route = a.status === 'ERROR' ? 'ERROR_QUESTION' : a.status === 'UNCLEAR_SERIOUS' ? (fulfilled ? 'OPTIONAL_REPAIR' : 'ASK') : 'SILENT_PASS';
        return { axisId: a.axisId, route: route as ConditionalRouting['axes'][number]['route'], metaFulfilled: fulfilled };
    });
    return { version: CONDITIONAL_META_VERSION, accepted: axes.every(a => a.route === 'SILENT_PASS' || a.route === 'OPTIONAL_REPAIR'), axes };
}
function mergeCalls(gate: CentralStoryGateCall, meta: MetaCall | undefined, feedback: DialogueCallMetadata | undefined): DialogueCallMetadata {
    const calls = [{ stage: 'central_story_gate' as const, call: gate.call }, ...(meta ? [{ stage: 'conditional_meta' as const, call: meta.call }] : []), ...(feedback ? [{ stage: 'selective_feedback' as const, call: feedback }] : [])];
    return { ...gate.call, promptVersion: 'concrete-meaning-conditional-meta-v1', schemaVersion: 'conditional-meta-dialogue-v1', durationMs: calls.reduce((s, c) => s + c.call.durationMs, 0), usage: { inputTokens: calls.reduce((s, c) => s + (c.call.usage?.inputTokens ?? 0), 0), outputTokens: calls.reduce((s, c) => s + (c.call.usage?.outputTokens ?? 0), 0), cacheReadTokens: calls.reduce((s, c) => s + (c.call.usage?.cacheReadTokens ?? 0), 0) }, stages: calls.map(({ stage, call }) => ({ stage, promptVersion: call.promptVersion, schemaVersion: call.schemaVersion, durationMs: call.durationMs, ...(call.usage ? { usage: call.usage } : {}), ...(call.decisionAudit ? { decisionAudit: call.decisionAudit } : {}) })) };
}
export class ConditionalMetaDialogueEvaluator implements DialogueEvaluator {
    private readonly gate: CentralStoryGateEvaluator;
    private readonly meta: MetaEvaluator;
    private readonly feedback: SelectiveFeedbackEvaluator;
    // Retry a failed L2/question without re-grading an unchanged student response.
    private pending: {
        key: string;
        gate: CentralStoryGateCall;
        meta?: MetaCall;
    } | undefined;
    constructor(private readonly assets: ConditionalMetaGold, options: {
        gate?: CentralStoryGateEvaluator;
        meta?: MetaEvaluator;
        feedback?: SelectiveFeedbackEvaluator;
    } = {}) {
        this.gate = options.gate ?? new OpenAICentralStoryGateEvaluator({ promptRevision: 'v4', model: 'gpt-5.6-terra', effort: 'medium', instructionsOverride: loadConcreteMeaningInstructions(), promptVersionOverride: 'v4-concrete-meaning-v1' });
        this.meta = options.meta ?? new OpenAIMetaEvaluator();
        this.feedback = options.feedback ?? new OpenAISelectiveFeedbackEvaluator({ promptRevision: 'v4', model: 'gpt-5.6-terra', effort: 'medium' });
    }
    async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
        if (input.gold.paragraphId !== this.assets.paragraphId || JSON.stringify(input.gold.centralAxes.map(({ id, description }) => ({ id, description }))) !== JSON.stringify(this.assets.axes.map(({ id, description }) => ({ id, description }))))
            throw new Error('실험 축과 평가 입력이 다릅니다.');
        const key = JSON.stringify(input);
        if (this.pending?.key !== key)
            this.pending = { key, gate: await this.gate.evaluate(input) };
        const retained = this.pending!, gate = retained.gate;
        const ids = gate.result.axisFeedback?.filter(a => a.status === 'UNCLEAR_SERIOUS').map(a => a.axisId) ?? [];
        if (ids.length && !retained.meta)
            retained.meta = await this.meta.evaluate({ metaAxes: this.assets.axes.filter(a => ids.includes(a.id)).map(({ id, metaAxis }) => ({ id, metaAxis })), dialogue: input });
        const routing = conditionalRouting(gate.result, retained.meta?.result ?? null);
        const errors = routing.axes.filter(a => a.route === 'ERROR_QUESTION'), ask = routing.axes.filter(a => a.route === 'ASK'), optional = routing.axes.filter(a => a.route === 'OPTIONAL_REPAIR');
        let result: EvaluationResult, feedbackCall: DialogueCallMetadata | undefined;
        if ((errors.length || ask.length) && input.questionsAsked < input.maxQuestions) {
            const eligible = errors.length ? errors : ask;
            const target = eligible.find(a => a.axisId === gate.result.targetAxisId) ?? eligible[0]!;
            const f = await this.makeQuestion(input, gate.result, routing, target.axisId);
            result = f.result;
            feedbackCall = f.call;
        }
        else {
            const status = routing.accepted ? (optional.length && input.questionsAsked < input.maxQuestions ? 'UNCLEAR' : 'PASS') : errors.length ? 'ERROR' : 'UNCLEAR';
            result = { status, routing, snapshot: snapshot(input, gate.result, null, null), decisionSummary: gate.result.decisionSummary, targetIssue: null, nextQuestion: null,
                studentFeedback: routing.accepted ? (optional.length && input.questionsAsked < input.maxQuestions ? '큰 흐름은 파악했어요. 원하면 한 부분을 더 보완하거나 다음으로 넘어갈 수 있어요.' : '핵심 의미를 잘 파악했어요. 다음으로 넘어가도 좋아요.') : '이번 문단의 질문은 여기까지입니다. 현재 판정을 남기고 다음으로 넘어갈 수 있어요.' };
        }
        const call = mergeCalls(gate, retained.meta, feedbackCall);
        this.pending = undefined;
        return { result, call };
    }
    async requestQuestion(input: DialogueEvaluationInput, prior: DialogueEvaluationCall): Promise<DialogueEvaluationCall> {
        const routing = prior.result.routing;
        if (!routing?.accepted || prior.result.nextQuestion || input.questionsAsked >= input.maxQuestions)
            throw new Error('선택적 보완을 요청할 수 없습니다.');
        const target = routing.axes.find(a => a.route === 'OPTIONAL_REPAIR');
        if (!target)
            throw new Error('선택적 보완 대상이 없습니다.');
        const gate = CentralStoryGateV4StoredResultSchema.parse(prior.call.decisionAudit?.validatedResult);
        return this.makeQuestion(input, gate, routing, target.axisId);
    }
    private async makeQuestion(input: DialogueEvaluationInput, gate: CentralStoryGateCall['result'], routing: ConditionalRouting, targetAxisId: string): Promise<DialogueEvaluationCall> {
        const target = gate.axisFeedback!.find(a => a.axisId === targetAxisId)!;
        const route = target.status === 'ERROR' ? 'ERROR' : 'TARGETED_GAP';
        // A raw L1 preferred target may have been waived by L2. Retarget the question only,
        // leaving the raw judgment/audit intact and avoiding another model selection call.
        const questionGate = { ...gate, targetAxisId, questionIntent: targetAxisId === gate.targetAxisId ? (gate.questionIntent ?? null) : `${targetAxisId}에서 확인할 내용: ${target.reason} 이 축의 미확인 의미 또는 실제 오류만 확인하고 이미 표현한 내용을 다시 요구하지 않는다.` };
        const f = await this.feedback.evaluate({ dialogue: input, gateDecision: questionGate, route, selectedDetailedRelation: null });
        return { result: { status: route === 'ERROR' ? 'ERROR' : 'UNCLEAR', routing, snapshot: snapshot(input, gate, route, f.result.targetDescription), decisionSummary: gate.decisionSummary, targetIssue: { description: f.result.targetDescription, relatedRelationIds: [] }, nextQuestion: f.result.nextQuestion, studentFeedback: f.result.studentFeedback, ...(f.result.sourceGuide === undefined ? {} : { sourceGuide: f.result.sourceGuide }) }, call: f.call };
    }
}
