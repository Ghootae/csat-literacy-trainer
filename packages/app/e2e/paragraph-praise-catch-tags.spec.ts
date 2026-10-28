import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { SimpleEvaluator, SimpleOutput } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';
import { loadDialoguePassages } from '../src/server/content.js';

// 문단 PRAISE 상자 제목과 '바로/질문 후 캐치' 꼬리표(질문 후 통과 경우).
const port = Number(process.env['CSAT_API_PORT'] ?? 5374);
const passage = loadDialoguePassages().find(p => p.paragraphs.length > 0 && p.passageId)!;
const quote = passage.paragraphs[0]!.text;
const parts = [{ description: '첫째 핵심', sourceQuote: quote }, { description: '둘째 핵심', sourceQuote: quote }];
const base: SimpleOutput = { category: 'CAPTURED', reason: 'r', coreParts: parts, corePartsCovered: [true, true], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: 'm', corePartSummaries: ['첫째를 잡았다', '둘째를 잡았다'], closingFeedback: null, coreSourceQuote: null };
const gap = { corePartIndex: 1, description: '둘째', sourceQuote: quote, question: '둘째 내용을 다시 볼래?', asksOneThing: true };
const scripted: SimpleOutput[] = [
  { ...base, category: 'GAP', corePartsCovered: [true, false], gaps: [gap], action: 'GAP_QUESTION', message: '하나 확인할게', corePartSummaries: [] },
  { ...base, targetGapReadings: ['읽기'], targetGapsFilled: [true], coreParts: [] },
];
const evaluator: SimpleEvaluator = { async complete() {
  return { rawOutput: scripted.shift()!, metadata: { provider: 'mock', model: 'mock', promptVersion: 'paragraph-simple-holistic-v4.2', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 } };
} };
let server: Server; let logs: string;
test.beforeAll(async () => {
  logs = mkdtempSync(join(tmpdir(), 'paragraph-tags-'));
  server = createLearningServer({ developerMode: true, dialogueSimpleEvaluator: evaluator, dialogueSimpleLogDirectory: logs, warmer: () => Promise.resolve() });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
});
test.afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); rmSync(logs, { recursive: true, force: true }); });

test('paragraph screen: praise box shows its title and per-item catch tags', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dialogue/lab');
  await page.locator('.dialogue-passage-card', { hasText: passage.title }).getByRole('button', { name: '시작', exact: true }).click();
  await page.locator('#simple-response').fill('첫 요약');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  await expect(page.locator('.chat-message.tutor', { hasText: '둘째 내용을 다시 볼래?' })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#simple-response')).toBeEnabled({ timeout: 20000 });
  await page.locator('#simple-response').fill('둘째 답');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  const bubble = page.locator('.chat-message.tutor', { hasText: '잘했어~' });
  await expect(bubble).toHaveCount(1, { timeout: 20000 });
  await expect(bubble.locator('.simple-box-title')).toHaveText('내가 파악한 문단의 핵심 내용');
  await expect(bubble.locator('.simple-bubble-box li')).toHaveText(['첫째를 잡았다(바로 캐치)', '둘째를 잡았다(질문 후 캐치)']);
  await page.screenshot({ path: '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-28-paragraph-praise-catch-tags.png' });
});
