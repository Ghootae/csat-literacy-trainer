import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type DialogueEvaluator, type DialogueEvaluationInput, type EvaluationResult } from '@csat/pipeline';
import { DialogueController } from './dialogue.js';
const root = mkdtempSync(resolve(tmpdir(), 'conditional-meta-controller-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
function evaluate(input: DialogueEvaluationInput) {
    const result: EvaluationResult = { status: 'UNCLEAR', decisionSummary: '원래 L1 SERIOUS', studentFeedback: '큰 흐름은 파악했어요.', nextQuestion: null, targetIssue: null,
        snapshot: { ...emptySnapshot(), turn: input.turn, axisFeedback: input.gold.centralAxes.map(a => ({ axisId: a.id, status: 'UNCLEAR_SERIOUS', reason: '부분 정보', revealedText: null })) },
        routing: { version: 'conditional-meta-v1', accepted: true, axes: input.gold.centralAxes.map(a => ({ axisId: a.id, route: 'OPTIONAL_REPAIR', metaFulfilled: true })) } };
    return { result, call: { provider: 'mock' as const, model: 'mock', effort: 'none' as const, promptVersion: 'mock', schemaVersion: 'mock', goldVersion: input.goldVersion, goldHash: input.goldHash, calledAt: '2026-10-01T00:00:00Z', durationMs: 1 } };
}
describe('개발자 조건부 메타 모드', () => {
    it('30문단의 동결 축 자산과 원본 해시를 전부 검증해 로딩한다', () => {
        const factory = vi.fn(() => ({ evaluate: async (input: DialogueEvaluationInput) => evaluate(input) }));
        const c = new DialogueController({ logDirectory: root, conditionalEvaluatorFactory: factory });
        let count = 0;
        for (const p of c.listPassages().filter(p => p.available)) {
            const s = c.start(p.passageId, true, 'conditional-meta-v1');
            for (let i = 0; i < p.paragraphCount; i++) {
                c.navigate(s.sessionId, i);
                const inspected = c.inspect(s.sessionId);
                expect(inspected.metaAxes?.length).toBe(inspected.gold.centralAxes.length);
                expect(inspected.gold.coreRelations).toEqual([]);
                expect(inspected.goldRef.version).toBe('conditional-meta-gold-v1');
                count++;
            }
        }
        expect(count).toBe(30);
        expect(factory).toHaveBeenCalledTimes(30);
    });
    it('기본 학생 V4 유지·개발자 모드별 세션 분리·실험 모드 고정', () => {
        const c = new DialogueController({ logDirectory: root });
        const old = c.openDeveloper('corporate-law', 0);
        const experiment = c.openDeveloper('corporate-law', 0, undefined, false, 'conditional-meta-v1');
        expect(old.mode).toBe('v4');
        expect(experiment.mode).toBe('conditional-meta-v1');
        expect(old.sessionId).not.toBe(experiment.sessionId);
        expect(c.openDeveloper('corporate-law', 0).sessionId).toBe(old.sessionId);
        expect(c.openDeveloper('corporate-law', 0, undefined, false, 'conditional-meta-v1').sessionId).toBe(experiment.sessionId);
        expect(() => c.openDeveloper('corporate-law', 0, old.sessionId, false, 'conditional-meta-v1')).toThrow('모드');
        expect(() => c.start('corporate-law', false, 'conditional-meta-v1')).toThrow('개발자 전용');
        expect(c.start('corporate-law').mode).toBe('v4');
        expect(c.inspect(old.sessionId).metaAxes).toBeUndefined();
    });
    it('선택적 보완·후속 질문·정책 통과를 저장하고 L1은 바꾸지 않는다', async () => {
        const calls: DialogueEvaluationInput[] = [];
        const evaluator: DialogueEvaluator = { async evaluate(input) { calls.push(input); return evaluate(input); }, async requestQuestion(input, prior) { return { ...prior, result: { ...prior.result, nextQuestion: { type: 'DIAGNOSTIC', text: '어떤 관계인가요?' } } }; } };
        const c = new DialogueController({ logDirectory: root, conditionalEvaluatorFactory: () => evaluator });
        const s = c.openDeveloper('corporate-law', 1, undefined, true, 'conditional-meta-v1');
        const first = await c.respond(s.sessionId, '처음 응답');
        expect(first.canRequestQuestion).toBe(true);
        expect(first.step?.policyAccepted).toBe(true);
        const asked = await c.requestQuestion(s.sessionId);
        expect(asked.step?.question).toBe('어떤 관계인가요?');
        expect(calls).toHaveLength(1);
        await c.respond(s.sessionId, '보완 답변');
        expect(calls[1]?.history[0]?.answer).toBe('보완 답변');
        c.advance(s.sessionId);
        const returned = c.navigate(s.sessionId, 1);
        expect(returned.currentOutcome).toBe('PASS');
        expect(returned.axisBoxes?.[0]?.status).toBe('UNCLEAR_SERIOUS');
        expect(returned.axisBoxes?.[0]?.policyRoute).toBe('OPTIONAL_REPAIR');
        const rows = readFileSync(resolve(root, 'conditional-meta-v1/sessions.jsonl'), 'utf8').trim().split('\n').map(s => JSON.parse(s));
        expect(rows.at(-1).finalStatus).toBe('PASS');
        expect(rows.at(-1).finalSnapshot.axisFeedback[0].status).toBe('UNCLEAR_SERIOUS');
    });
    it('모든 문단에서 기본 이해 인정 후 진행하면 문제 풀이 handoff도 유지된다', async () => {
        const c = new DialogueController({ logDirectory: root, conditionalEvaluatorFactory: () => ({ evaluate: async (input) => evaluate(input) }) });
        const s = c.start('corporate-law', true, 'conditional-meta-v1');
        for (let i = 0; i < 5; i++) {
            await c.respond(s.sessionId, '학생 응답');
            c.advance(s.sessionId);
        }
        expect(c.get(s.sessionId).status).toBe('COMPLETED');
        expect(c.createProblemHandoff(s.sessionId).questionId).toBe('corporate-law-q13');
    });
});
