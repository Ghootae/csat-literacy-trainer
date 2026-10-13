import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ConditionalMetaDialogueEvaluator, ConditionalMetaGoldSchema, buildMetaPayload, validateMetaResult } from './conditional-meta.js';
import type { MetaInput } from './conditional-meta.js';
import type { CentralStoryGateResult } from './gate.js';
import type { DialogueCallMetadata, DialogueEvaluationInput } from './evaluator.js';
import type { SelectiveFeedbackInput } from './selective-feedback.js';
import { loadDiagnosticGold } from './gold.js';
import { DialogueSessionEngine } from './session.js';
const loaded = loadDiagnosticGold();
const assets = ConditionalMetaGoldSchema.parse({ schemaVersion: 'conditional-meta-gold-v1', paragraphId: loaded.gold.paragraphId,
    centralStory: loaded.gold.centralStory, sourceGoldHash: 'a'.repeat(64), provenance: 'unit-test',
    axes: ['AX1', 'AX2'].map(id => ({ id, description: `${id} 구체 의미`, metaAxis: `${id} 기능적 의미` })) });
const input: DialogueEvaluationInput = { gold: { ...loaded.gold, centralAxes: assets.axes.map(a => ({ id: a.id, description: a.description, relationIds: [] })), coreRelations: [] },
    goldHash: 'test', goldVersion: 'test', initialResponse: '학생 응답', history: [], turn: 1, questionsAsked: 0, maxQuestions: 3 };
const metadata: DialogueCallMetadata = { provider: 'mock', model: 'mock', effort: 'none', promptVersion: 'test', schemaVersion: 'test', goldVersion: 'test', goldHash: 'test', calledAt: '2026-10-01T00:00:00Z', durationMs: 1 };
type Status = 'PASS' | 'UNCLEAR_OK' | 'UNCLEAR_SERIOUS' | 'ERROR';
function decision(statuses: Status[]): CentralStoryGateResult {
    const axisFeedback = statuses.map((status, i) => ({ axisId: `AX${i + 1}`, status, reason: `${status} 이유`, revealedText: status === 'PASS' || status === 'UNCLEAR_OK' ? '확인된 의미' : null }));
    const target = axisFeedback.find(a => a.status === 'ERROR') ?? axisFeedback.find(a => a.status === 'UNCLEAR_SERIOUS');
    return { status: statuses.includes('ERROR') ? 'DISTORTED' : statuses.includes('UNCLEAR_SERIOUS') || statuses.includes('UNCLEAR_OK') ? 'UNCLEAR' : 'CAPTURED',
        responseInformationLevel: 'RELATIONAL', effectiveResponse: '학생 응답', centralObjectRepresentation: '대상', centralStoryRepresentation: null,
        expressedClaims: [{ description: '학생 주장', source: 'initial', evidence: '학생 응답' }],
        axisStates: axisFeedback.map(a => ({ axisId: a.axisId, state: a.status === 'ERROR' ? 'distorted' : a.status === 'PASS' ? 'captured' : 'partial', evidence: [{ source: 'initial', evidence: '학생 응답' }], retractionEvidence: [] })),
        missingAxisEvidence: [], targetAxisId: target?.axisId ?? null, questionIntent: target ? '미확인 관계를 확인한다.' : null,
        decisionSummary: '원래 L1 판정', axisFeedback };
}
function harness(statuses: Status[], fulfilled = true) {
    const raw = decision(statuses);
    const gate = { evaluate: vi.fn(async () => ({ result: raw, call: { ...metadata, decisionAudit: { rawResult: raw, validatedResult: raw, normalizationEvents: [] } } })) };
    const meta = { evaluate: vi.fn(async (m: MetaInput) => ({ result: { axes: m.metaAxes.map(a => ({ axisId: a.id, fulfilled, reason: '기능적 의미 판정', evidenceQuotes: fulfilled ? ['학생 응답'] : [], unresolvedMeaning: fulfilled ? null : '관계 불명확' })) }, call: metadata })) };
    const feedback = { evaluate: vi.fn(async (f: SelectiveFeedbackInput) => ({ result: { route: f.route, targetAxisId: f.gateDecision.targetAxisId!, selectedRelationId: null, targetDescription: '확인할 관계', studentFeedback: '이 관계를 확인해 봅시다.', nextQuestion: { type: f.route === 'ERROR' ? 'CORRECTIVE' as const : 'DIAGNOSTIC' as const, text: '관계를 설명해 주세요.' } }, call: metadata })) };
    return { raw, gate, meta, feedback, evaluator: new ConditionalMetaDialogueEvaluator(assets, { gate, meta, feedback }) };
}
function engine(evaluator: ConditionalMetaDialogueEvaluator) {
    return new DialogueSessionEngine({ evaluator, gold: input.gold, goldVersion: 'test', goldHash: 'test', logger: { save() { } } });
}
describe('구체 인정 L1 + 조건부 L2', () => {
    it.each<Status>(['PASS', 'UNCLEAR_OK'])('%s는 L2·질문 없이 통과하고 보완 버튼도 없다', async (status) => {
        const h = harness([status, 'PASS']), session = engine(h.evaluator);
        const result = await session.submitInitial('학생 응답');
        expect(result.evaluation.status).toBe('PASS');
        expect(result.terminal).toBe(true);
        expect(session.canRequestQuestion).toBe(false);
        expect(h.meta.evaluate).not.toHaveBeenCalled();
        expect(h.feedback.evaluate).not.toHaveBeenCalled();
        expect(result.evaluation.snapshot.axisFeedback?.[0]?.status).toBe(status);
    });
    it('ERROR는 L2 없이 교정 질문을 제시하고 넘어가도 오류 원판정이 남는다', async () => {
        const h = harness(['ERROR', 'PASS']), session = engine(h.evaluator);
        const first = await session.submitInitial('학생 응답');
        expect(first.evaluation.nextQuestion?.type).toBe('CORRECTIVE');
        expect(h.meta.evaluate).not.toHaveBeenCalled();
        expect(session.continueWithoutRevision().finalStatus).toBe('SKIPPED');
        expect(session.dialogueRecord.turns[0]?.evaluation.snapshot.axisFeedback?.[0]?.status).toBe('ERROR');
    });
    it('SERIOUS만 묶어 L2 한 번, 충족이면 선택적 보완이며 원판정은 보존한다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'UNCLEAR_OK']), session = engine(h.evaluator);
        const result = await session.submitInitial('학생 응답');
        expect(h.meta.evaluate.mock.calls[0]?.[0].metaAxes.map(a => a.id)).toEqual(['AX1']);
        expect(result.evaluation.routing?.accepted).toBe(true);
        expect(session.canRequestQuestion).toBe(true);
        expect(result.evaluation.nextQuestion).toBeNull();
        expect(h.feedback.evaluate).not.toHaveBeenCalled();
        const completed = session.continueWithoutRevision();
        expect(completed.finalStatus).toBe('PASS');
        expect(completed.finalSnapshot.axisFeedback?.[0]?.status).toBe('UNCLEAR_SERIOUS');
    });
    it('선택적 보완은 저장된 판정을 재사용하고 후속 답변을 누적해 재판정한다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'PASS']), session = engine(h.evaluator);
        await session.submitInitial('학생 응답');
        await session.requestQuestion();
        expect(h.gate.evaluate).toHaveBeenCalledTimes(1);
        expect(h.meta.evaluate).toHaveBeenCalledTimes(1);
        expect(h.feedback.evaluate).toHaveBeenCalledTimes(1);
        await session.submitFollowUp('앞의 말을 수정합니다.');
        expect(h.gate.evaluate).toHaveBeenCalledTimes(2);
        expect(h.meta.evaluate).toHaveBeenCalledTimes(2);
        const payload = JSON.parse(buildMetaPayload(h.meta.evaluate.mock.calls[1]![0]));
        expect(payload.followUpExchanges).toEqual([{ question: '관계를 설명해 주세요.', answer: '앞의 말을 수정합니다.' }]);
        expect(session.dialogueRecord.turns[0]?.evaluationBeforeQuestion?.routing?.accepted).toBe(true);
    });
    it('L2 미충족은 필수 제시, 여러 SERIOUS도 한 번만 호출한다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'UNCLEAR_SERIOUS'], false);
        const { result } = await h.evaluator.evaluate(input);
        expect(h.meta.evaluate).toHaveBeenCalledTimes(1);
        expect(h.meta.evaluate.mock.calls[0]![0].metaAxes).toHaveLength(2);
        expect(result.routing?.accepted).toBe(false);
        expect(result.nextQuestion?.type).toBe('DIAGNOSTIC');
    });
    it('L2가 원래 표적을 완화하면 다른 ASK 축에만 질문한다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'UNCLEAR_SERIOUS']);
        h.meta.evaluate.mockImplementation(async (m) => ({ result: { axes: m.metaAxes.map(a => ({ axisId: a.id, fulfilled: a.id === 'AX1', reason: '판정', evidenceQuotes: ['학생 응답'], unresolvedMeaning: a.id === 'AX1' ? null : '미확인' })) }, call: metadata }));
        const result = await h.evaluator.evaluate(input);
        expect(h.feedback.evaluate.mock.calls[0]![0].gateDecision.targetAxisId).toBe('AX2');
        expect(result.call.decisionAudit?.validatedResult).toEqual(h.raw);
    });
    it('L2 실패 후 같은 입력 재시도는 L1을 다시 호출하지 않는다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'PASS']);
        h.meta.evaluate.mockRejectedValueOnce(new Error('인용 실패'));
        await expect(h.evaluator.evaluate(input)).rejects.toThrow('인용 실패');
        await h.evaluator.evaluate(input);
        expect(h.gate.evaluate).toHaveBeenCalledTimes(1);
        expect(h.meta.evaluate).toHaveBeenCalledTimes(2);
    });
    it('질문 생성 실패 후 같은 입력 재시도는 L1·L2를 재사용한다', async () => {
        const h = harness(['UNCLEAR_SERIOUS', 'PASS'], false);
        h.feedback.evaluate.mockRejectedValueOnce(new Error('질문 실패'));
        await expect(h.evaluator.evaluate(input)).rejects.toThrow('질문 실패');
        await h.evaluator.evaluate(input);
        expect(h.gate.evaluate).toHaveBeenCalledTimes(1);
        expect(h.meta.evaluate).toHaveBeenCalledTimes(1);
        expect(h.feedback.evaluate).toHaveBeenCalledTimes(2);
    });
    it('학생 인용만 허용하고 누락/중복 축을 거부한다', () => {
        const m: MetaInput = { metaAxes: [{ id: 'AX1', metaAxis: '메타' }], dialogue: input };
        const row = { axisId: 'AX1', fulfilled: true, reason: '판정', evidenceQuotes: ['학생 응답'], unresolvedMeaning: null };
        expect(validateMetaResult({ axes: [row] }, m).axes).toHaveLength(1);
        expect(() => validateMetaResult({ axes: [{ ...row, evidenceQuotes: ['골드에서 가져온 말'] }] }, m)).toThrow('인용');
        expect(() => validateMetaResult({ axes: [row, row] }, m)).toThrow('축 목록');
        expect(() => validateMetaResult({ axes: [] }, m)).toThrow('축 목록');
    });
    it('L1 지시는 기존 실험과 동일하며 추가 보상은 생성하지 않는다', async () => {
        const { loadConcreteMeaningInstructions } = await import('./conditional-meta.js');
        expect(loadConcreteMeaningInstructions()).toBe(readFileSync('docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/level1-instructions.md', 'utf8'));
        const h = harness(['PASS', 'PASS']);
        expect(JSON.stringify((await h.evaluator.evaluate(input)).result)).not.toContain('reward');
    });
});
