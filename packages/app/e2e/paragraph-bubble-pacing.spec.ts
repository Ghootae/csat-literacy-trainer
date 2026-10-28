import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { SimpleEvaluator, SimpleOutput } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';
import { loadDialoguePassages } from '../src/server/content.js';

// 문단 화면(/dialogue/lab)의 말풍선 운영 규칙: 마무리 말풍선, 칭찬 문장·상자, 순차 표시 간격.
const port = Number(process.env['CSAT_API_PORT'] ?? 5374);
const passage = loadDialoguePassages().find(p => p.paragraphs.length > 0 && p.passageId)!;
const praise: SimpleOutput = { category: 'CAPTURED', reason: 'r', coreParts: [{ description: '문단의 핵심 내용', sourceQuote: passage.paragraphs[0]!.text }], corePartsCovered: [true], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '모델이 쓴 칭찬', corePartSummaries: [], closingFeedback: null, coreSourceQuote: null };
const evaluator: SimpleEvaluator = { async complete() {
  await new Promise(resolve => setTimeout(resolve, 2500));
  return { rawOutput: praise, metadata: { provider: 'mock', model: 'mock', promptVersion: 'paragraph-simple-holistic-v4.2', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 } };
} };
const doneLines = ['다 살펴봤어.', '생각이 끝났어.', '정리가 끝났어.'];
const praiseLines = ['내가 판단한 문단의 핵심 내용과 모두 일치했어! 잘했어~', '문단의 핵심을 빠짐없이 잡았어! 잘했어~', '핵심 내용을 정확하게 잡아냈어! 잘했어~'];
let server: Server; let logs: string;
test.beforeAll(async () => {
  logs = mkdtempSync(join(tmpdir(), 'paragraph-pacing-'));
  server = createLearningServer({ developerMode: true, dialogueSimpleEvaluator: evaluator, dialogueSimpleLogDirectory: logs, warmer: () => Promise.resolve() });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
});
test.afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); rmSync(logs, { recursive: true, force: true }); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});
async function start(page: Page) {
  await page.goto('/dialogue/lab');
  await page.locator('.dialogue-passage-card', { hasText: passage.title }).getByRole('button', { name: '시작', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toBeVisible();
}
async function firstSummary(page: Page) {
  await page.evaluate(() => {
    const seen: Record<string, number> = {};
    (window as unknown as { __seen: Record<string, number> }).__seen = seen;
    const scan = () => document.querySelectorAll('.chat-message.tutor').forEach(el => {
      const text = el.textContent ?? '';
      if (el.classList.contains('simple-wait-done') && !('done' in seen)) seen['done'] = performance.now();
      if (text.includes('잘했어~') && !('praise' in seen)) seen['praise'] = performance.now();
      if (el.classList.contains('simple-waiting') && !el.classList.contains('simple-sequence-waiting') && !('thinking' in seen)) seen['thinking'] = performance.now();
    });
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  });
  await page.locator('#simple-response').fill('이 문단은 핵심 내용을 말한다.');
  await page.getByRole('button', { name: '보내기', exact: true }).click();
  await expect(page.locator('.simple-wait-done')).toHaveCount(1, { timeout: 15000 });
  await expect(page.locator('.chat-message.tutor', { hasText: '잘했어~' })).toHaveCount(1, { timeout: 10000 });
  return page.evaluate(() => (window as unknown as { __seen: Record<string, number> }).__seen);
}
for (const reduced of [false, true]) {
  test(`paragraph screen: closing bubble replaces thinking, praise box follows after the paced gap ${reduced ? '(reduced motion, no dots)' : '(with dots)'}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await start(page);
    const seen = await firstSummary(page);
    expect(seen['thinking']).toBeDefined();
    const gap = seen['praise']! - seen['done']!;
    console.log(`MEASURE paragraph ${reduced ? 'reduced' : 'normal'} done→praise`, Math.round(gap));
    expect(gap).toBeGreaterThanOrEqual(1150);
    await expect(page.locator('.simple-waiting')).toHaveCount(0);
    expect(doneLines).toContain(await page.locator('.simple-wait-done p').textContent());
    const bubble = page.locator('.chat-message.tutor', { hasText: '잘했어~' });
    expect(praiseLines).toContain(await bubble.locator('p').textContent());
    await expect(bubble.locator('.simple-bubble-box li')).toHaveText(['문단의 핵심 내용']);
    await expect(page.getByLabel('대화 기록')).not.toContainText('모델이 쓴 칭찬');
    if (reduced) await expect(page.locator('.simple-sequence-waiting')).toHaveCount(0);
    if (!reduced) await page.screenshot({ path: '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-28-bubble-pacing-paragraph.png' });
    // 새로고침으로 복원된 메시지는 한 번에 보이고 마무리 말풍선도 남아 있다.
    const done = await page.locator('.simple-wait-done p').textContent();
    await page.reload();
    await expect(page.locator('.simple-wait-done p')).toHaveText(done!);
    await expect(page.locator('.chat-message.tutor', { hasText: '잘했어~' })).toHaveCount(1);
    await expect(page.locator('.simple-sequence-waiting')).toHaveCount(0);
  });
}
