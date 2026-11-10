/**
 * 진단평가 개발자 이동 지도(`/diagnostic?dev=1`, D-0217) 한 번 확인. 가짜 평가기만 쓰고 외부 전송은 없다.
 * 실행: CSAT_API_PORT=5484 PLAYWRIGHT_CLIENT_PORT=5483 npx playwright test packages/app/e2e/diagnostic-dev-navigation.spec.ts
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createLearningServer } from '../src/server/index.js';
import { DiagnosticController } from '../src/server/diagnostic/controller.js';
import { FileDiagnosticStore } from '../src/server/diagnostic/store.js';
import { diagnosisFake, feedbackFake, judgeFake, set, summaryEvaluator } from '../src/server/diagnostic/test-support.js';

const port = Number(process.env['CSAT_API_PORT'] ?? 5384);
const shots = process.env['DIAGNOSTIC_SCREENSHOT_DIR'] ?? resolve(tmpdir(), 'csat-diagnostic-dev-screens');
const HORSE = set.passages[1]!;
let server: Server; let controller: DiagnosticController; let root: string; let previousDev: string | undefined;

test.beforeAll(async () => {
  root = mkdtempSync(resolve(tmpdir(), 'diagnostic-dev-e2e-')); mkdirSync(shots, { recursive: true });
  previousDev = process.env['CSAT_DIAGNOSTIC_DEV']; process.env['CSAT_DIAGNOSTIC_DEV'] = '1';
  const fb = feedbackFake();
  controller = new DiagnosticController({ store: new FileDiagnosticStore(resolve(root, 'diagnostic')), feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: resolve(root, 'summary'),
    diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
  server = createLearningServer({ developerMode: true, diagnosticEnabled: true, diagnosticController: controller, dialogueLogDirectory: resolve(root, 'dialogue'), warmer: () => Promise.resolve(), problemFeedbackSave() {} });
  await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready); });
});
test.afterAll(async () => {
  await new Promise<void>(done => server.close(() => done())); rmSync(root, { recursive: true, force: true });
  if (previousDev === undefined) delete process.env['CSAT_DIAGNOSTIC_DEV']; else process.env['CSAT_DIAGNOSTIC_DEV'] = previousDev;
});

test('지도에서 지문 2 답 입력으로 건너뛰기 → 이전 화면 → 지문 초기화, ?dev=1이 없으면 지도가 없다', async ({ page }) => {
  page.on('dialog', dialog => void dialog.accept());
  await page.goto('/diagnostic?dev=1');
  await page.getByLabel('시연용 화면이야', { exact: false }).check();
  await page.getByRole('button', { name: '시작하기' }).click();
  const map = page.getByLabel('개발자 지도');
  await expect(map).toBeVisible();
  await expect(page.getByRole('button', { name: '문단별로 요약하고 풀기' })).toBeVisible();
  await expect(page.getByTestId(`dev-cell-${HORSE.passageId}:choose`)).toContainText('요약 선택');
  // 지문 2 답 입력으로 건너뛰기(확인 창 없음)
  await page.getByTestId(`dev-cell-${HORSE.passageId}:answer`).click();
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toBeVisible();
  await expect(page.getByTestId('dev-current')).toContainText('답 입력');
  await expect(page.getByTestId(`dev-cell-${HORSE.passageId}:summary`)).toContainText('건너뜀');
  await page.screenshot({ path: resolve(shots, '1-answer-skipped-ahead.png') });
  // 이전 화면
  await page.getByRole('button', { name: '이전 화면' }).click();
  await expect(page.getByTestId('dev-note')).toContainText('요약 단계를 건너뜀');
  await page.screenshot({ path: resolve(shots, '2-previous.png') });
  // 지문 초기화
  await page.getByTestId(`dev-reset-${HORSE.passageId}`).click();
  await expect(page.getByRole('button', { name: '문단별로 요약하고 풀기' })).toBeVisible();
  await expect(page.getByTestId(`dev-cell-${HORSE.passageId}:choose`)).toBeVisible();
  await page.screenshot({ path: resolve(shots, '3-reset.png') });
  // 다음 화면: 요약 선택 → 답 입력(요약 건너뛰기)
  await page.getByRole('button', { name: '다음 화면' }).click();
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toBeVisible();
  // ?dev=1이 없으면 학생 화면 그대로다
  await page.goto('/diagnostic');
  await expect(page.getByLabel('개발자 지도')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '문단별로 요약하고 풀기' })).toBeVisible();
});
