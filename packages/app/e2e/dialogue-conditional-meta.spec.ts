import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { ConditionalMetaDialogueEvaluator, type CentralStoryGateResult, type DialogueCallMetadata } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';
let server: Server, logs: string;
let l1Calls = 0, l2Calls = 0;
const port = Number(process.env['CSAT_API_PORT'] ?? 5374);
const metadata: DialogueCallMetadata = { provider: 'mock', model: 'mock', effort: 'none', promptVersion: 'test', schemaVersion: 'test', goldVersion: 'test', goldHash: 'test', calledAt: '2026-10-01T00:00:00Z', durationMs: 1 };
test.beforeAll(async () => {
    logs = mkdtempSync(resolve(tmpdir(), 'conditional-meta-browser-'));
    server = createLearningServer({ developerMode: true, dialogueLogDirectory: logs, warmer: () => Promise.resolve(), conditionalDialogueEvaluatorFactory: assets => new ConditionalMetaDialogueEvaluator(assets, {
            gate: { async evaluate(input) {
                    l1Calls++;
                    const answer = input.history.at(-1)?.answer ?? input.initialResponse;
                    const status = answer.startsWith('선택') || answer.startsWith('미충족') ? 'UNCLEAR_SERIOUS' : answer.startsWith('오류') ? 'ERROR' : 'UNCLEAR_OK';
                    const result: CentralStoryGateResult = { status: status === 'ERROR' ? 'DISTORTED' : 'UNCLEAR', responseInformationLevel: 'RELATIONAL', effectiveResponse: answer, centralObjectRepresentation: null, centralStoryRepresentation: null, expressedClaims: [], missingAxisEvidence: [],
                        axisStates: assets.axes.map(a => ({ axisId: a.id, state: status === 'ERROR' ? 'distorted' : 'partial', evidence: [], retractionEvidence: [] })),
                        axisFeedback: assets.axes.map(a => ({ axisId: a.id, status, reason: '모의 판정', revealedText: status === 'UNCLEAR_OK' ? '확인된 내용' : null })), targetAxisId: assets.axes[0]!.id, questionIntent: '관계 확인', decisionSummary: '모의 L1 판정' };
                    return { result, call: { ...metadata, decisionAudit: { rawResult: result, validatedResult: result, normalizationEvents: [] } } };
                } },
            meta: { async evaluate(input) { l2Calls++; const fulfilled = !input.dialogue.initialResponse.startsWith('미충족'); return { result: { axes: input.metaAxes.map(a => ({ axisId: a.id, fulfilled, reason: '모의 L2', evidenceQuotes: [input.dialogue.initialResponse], unresolvedMeaning: fulfilled ? null : '확인할 관계' })) }, call: metadata }; } },
            feedback: { async evaluate(input) { return { result: { route: input.route, targetAxisId: input.gateDecision.targetAxisId!, selectedRelationId: null, targetDescription: '관계 확인', studentFeedback: '관계를 확인해 봅시다.', nextQuestion: { type: input.route === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC', text: '관계가 어떻게 이어지나요?' } }, call: metadata }; } },
        }) });
    await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready); });
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); rmSync(logs, { recursive: true, force: true }); });
test('실험 모드 선택 → 선택적 보완 → 누적 재판정 → 조용한 통과', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/dialogue/dev');
    await page.getByLabel('판정 모드').selectOption('conditional-meta-v1');
    await page.locator('.dialogue-passage-card').filter({ hasText: '법인' }).getByRole('button', { name: '학습 시작' }).click();
    await expect(page.locator('.developer-notice')).toContainText('구체 인정 L1 + 조건부 L2');
    await expect(page.locator('.inspector-gold')).toContainText('기능적 메타 축');
    await page.locator('#dialogue-response').fill('선택적 보완의 기능적 응답');
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(page.getByRole('button', { name: '보완하기', exact: true })).toBeVisible();
    await expect(page.getByLabel('결합 정책 결과')).toContainText('기본 이해 인정');
    const l1 = l1Calls, l2 = l2Calls;
    await page.screenshot({ path: resolve(tmpdir(), 'csat-conditional-meta-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: '보완하기', exact: true }).click();
    await expect(page.locator('#dialogue-response')).toBeEnabled();
    expect(l1Calls).toBe(l1);
    expect(l2Calls).toBe(l2);
    await page.locator('#dialogue-response').fill('보완 답변');
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(page.getByLabel('결합 정책 결과')).toContainText('L2 미호출');
    await expect(page.getByRole('button', { name: '보완하기', exact: true })).toHaveCount(0);
    await expect(page.locator('.chat-message.student')).toHaveCount(2);
    expect(l1Calls).toBe(l1 + 1);
    expect(l2Calls).toBe(l2);
    await page.reload();
    await expect(page.locator('.developer-notice')).toContainText('구체 인정 L1 + 조건부 L2');
    await page.getByRole('button', { name: '나가기', exact: true }).click();
    await page.getByLabel('판정 모드').selectOption('v4');
    await page.locator('.dialogue-passage-card').filter({ hasText: '법인' }).getByRole('button', { name: '학습 시작' }).click();
    await expect(page.locator('.chat-message.student')).toHaveCount(0);
    await expect(page.locator('.inspector-gold')).not.toContainText('기능적 메타 축');
});
test('미충족·ERROR 질문은 자동 제시, 학생 기본 화면에는 모드 선택이 없다', async ({ page }) => {
    await page.goto('/dialogue');
    await expect(page.getByLabel('판정 모드')).toHaveCount(0);
    await page.goto('/dialogue/dev');
    await page.getByLabel('판정 모드').selectOption('conditional-meta-v1');
    await page.locator('.dialogue-passage-card').filter({ hasText: '도파민' }).getByRole('button', { name: '학습 시작' }).click();
    await page.locator('#dialogue-response').fill('미충족 응답');
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(page.locator('.question-message')).toContainText('관계가 어떻게');
    await page.getByRole('button', { name: '다음 문단', exact: true }).click();
    const before = l2Calls;
    await page.locator('#dialogue-response').fill('오류 응답');
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(page.locator('.question-message')).toContainText('교정');
    expect(l2Calls).toBe(before);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: '검사', exact: true }).click();
    await expect(page.getByLabel('결합 정책 결과')).toContainText('오류 교정 질문');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: resolve(tmpdir(), 'csat-conditional-meta-mobile.png'), fullPage: true });
});
