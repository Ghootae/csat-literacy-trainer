/**
 * SNS 진단평가(/diagnostic) 끝까지 한 번(인계 B). 가짜 평가기·가짜 transport만 쓰고 외부 전송은 없다.
 * 실행: CSAT_API_PORT=5474 PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-flow.spec.ts
 * 화면 사진은 DIAGNOSTIC_SCREENSHOT_DIR(기본: 임시 폴더)에 남긴다.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createLearningServer } from '../src/server/index.js';
import { DiagnosticController } from '../src/server/diagnostic/controller.js';
import { FileDiagnosticStore } from '../src/server/diagnostic/store.js';
import { correctChoice, diagnosisFake, feedbackFake, judgeFake, set, summaryEvaluator, wrongChoice } from '../src/server/diagnostic/test-support.js';

const port = Number(process.env['CSAT_API_PORT'] ?? 5374);
const shots = process.env['DIAGNOSTIC_SCREENSHOT_DIR'] ?? resolve(tmpdir(), 'csat-diagnostic-screens');
let server: Server; let controller: DiagnosticController; let root: string;
const [COG, HORSE, PLASTIC, AUDIO] = set.passages as [typeof set.passages[number], typeof set.passages[number], typeof set.passages[number], typeof set.passages[number]];
const [Q12, Q13, Q14, Q15, Q16] = COG.questionIds as [string, string, string, string, string];
const HORSE_WRONG = HORSE.questionIds[2]!;      // 경마식 보도 6번: 오답 + 근거 오류(비틂 꼬리표)
const PLASTIC_WRONG = PLASTIC.questionIds[1]!;  // 플라스틱 9번: 오답이지만 판정이 SUPPORTED라 문항 검토

test.beforeAll(async () => {
  root = mkdtempSync(resolve(tmpdir(), 'diagnostic-e2e-')); mkdirSync(shots, { recursive: true });
  const fb = feedbackFake({ behavior: q => q === Q13 || q === HORSE_WRONG ? 'ERROR' : 'SUPPORTED' });
  controller = new DiagnosticController({ store: new FileDiagnosticStore(resolve(root, 'diagnostic')), feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: resolve(root, 'summary'),
    diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
  server = createLearningServer({ developerMode: true, diagnosticEnabled: true, diagnosticController: controller, dialogueLogDirectory: resolve(root, 'dialogue'), warmer: () => Promise.resolve(), problemFeedbackSave() {} });
  await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready); });
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); rmSync(root, { recursive: true, force: true }); });

const position = (choiceId: string) => Number(/\d+/u.exec(choiceId)![0]);
const circled = (choiceId: string) => '①②③④⑤'[position(choiceId) - 1]!;
async function answer(page: Page, choiceId: string, rationale: string | null) {
  await page.getByRole('radio', { name: `${circled(choiceId)}번 선지` }).click();
  if (rationale === null) await page.getByRole('button', { name: '근거 미제출' }).click();
  else await page.locator('#diag-rationale').fill(rationale);
}
async function answerPassage(page: Page, picks: { choiceId: string; rationale: string | null }[]) {
  for (const [i, pick] of picks.entries()) {
    await answer(page, pick.choiceId, pick.rationale);
    if (i + 1 < picks.length) await page.getByRole('button', { name: '다음 문항' }).click();
  }
  await page.getByRole('button', { name: '이 지문 답 다 냈어' }).click();
}
const allCorrect = (ids: readonly string[]) => ids.map(q => ({ choiceId: correctChoice(q), rationale: '원문을 읽고 판단한 이유를 적었다.' }));
/** 한 문항의 피드백을 끝내고 다음 버튼을 누른다(건너뛰기·설명 거절을 쓴다). */
async function finishFeedback(page: Page) {
  for (let guard = 0; guard < 60; guard++) {
    const next = page.getByRole('button', { name: /^(다음 문항|다음 지문|결과 보기)$/u });
    if (await next.isVisible()) { await next.click(); return; }
    for (const name of ['이 문항 건너뛰기', '아니']) {
      const button = page.getByRole('button', { name, exact: true });
      if (await button.isVisible() && await button.isEnabled()) { await button.click(); break; }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('피드백이 끝나지 않았다.');
}
async function noCodesOnScreen(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text.match(/[A-Z_]{4,}/gu) ?? []).toEqual([]);
}

test('시작 → 지문 1 요약·답(근거 있음·생략) → 중간 화면 → 피드백·건너뛰기 → 지문 2~4 → 결과, 새로 고침 뒤 이어 가기', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/diagnostic');

  // 시작 안내
  await expect(page.getByRole('heading', { name: '독해력 진단' })).toBeVisible();
  await expect(page.getByText('4지문 16문항 · 시간 제한 없음')).toBeVisible();
  await expect(page.getByText('PC·태블릿에서 하는 걸 권해')).toBeVisible();
  const startButton = page.getByRole('button', { name: '시작하기' });
  await expect(startButton).toBeDisabled();
  await page.getByLabel('시연용 화면이야. 적은 답과 근거는 진단 분석을 위해 저장돼.').check();
  await page.screenshot({ path: resolve(shots, '01-intro-desktop.png'), fullPage: true });
  await startButton.click();

  // 요약 선택 → 요약 대화
  await expect(page.getByRole('button', { name: '요약 없이 풀기' })).toBeVisible();
  await page.getByRole('button', { name: '문단별로 요약하고 풀기' }).click();
  await page.locator('#diag-summary-response').fill('이 문단은 동일론과 기능주의를 소개한다.');
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  await expect(page.getByText('이 문단은 끝났어.')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: resolve(shots, '02-summary-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '요약 마치고 문제 풀기' }).click();

  // 문항 답: 정답+근거, 오답+근거, 정답+생략, 오답+생략, 정답+근거
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toBeDisabled();
  await answer(page, correctChoice(Q12), '첫 문항의 이유를 적었다.');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, wrongChoice(Q13), '둘째 문항의 이유를 적었다.');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await page.screenshot({ path: resolve(shots, '03-answer-desktop.png'), fullPage: true });

  // 새로 고침: 고른 답이 남아 있다
  await expect(page.getByRole('button', { name: '이전 문항' })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('radio', { name: `${circled(correctChoice(Q12))}번 선지` })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#diag-rationale')).toHaveValue('첫 문항의 이유를 적었다.');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await expect(page.getByRole('radio', { name: `${circled(wrongChoice(Q13))}번 선지` })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, correctChoice(Q14), null);
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, wrongChoice(Q15), null);
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, correctChoice(Q16), '다섯째 문항의 이유를 적었다.');
  // 정오는 보이지 않는다
  const answerScreenText = await page.locator('body').innerText();
  expect(answerScreenText).not.toMatch(/오답|정답이야|맞혔어/u);
  await page.getByRole('button', { name: '이 지문 답 다 냈어' }).click();

  // 지문 끝 중간 화면
  await expect(page.getByTestId('passage-result')).toHaveText('이 지문의 5문항 중 3개를 맞혔어. 근거를 쓴 3개 중 2개가 적절했어(2개는 근거 생략).', { timeout: 20_000 });
  await page.screenshot({ path: resolve(shots, '04-mid-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(shots, '05-mid-390.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  // 문항별 피드백(건너뛰기 포함)
  await page.getByRole('button', { name: '피드백 시작' }).click();
  for (let i = 0; i < 5; i++) {
    if (i === 1) await page.screenshot({ path: resolve(shots, '06-feedback-desktop.png'), fullPage: true });
    await finishFeedback(page);
  }
  await noCodesOnScreen(page);

  // 지문 2~4: 요약 없이
  const rest: [typeof COG, { choiceId: string; rationale: string | null }[]][] = [
    [HORSE, HORSE.questionIds.map(q => q === HORSE_WRONG ? { choiceId: wrongChoice(q), rationale: '여섯 번째 문항의 이유를 적었다.' } : { choiceId: correctChoice(q), rationale: '원문을 읽고 적었다.' })],
    [PLASTIC, PLASTIC.questionIds.map(q => q === PLASTIC_WRONG ? { choiceId: wrongChoice(q), rationale: '아홉 번째 문항의 이유를 적었다.' } : { choiceId: correctChoice(q), rationale: '원문을 읽고 적었다.' })],
    [AUDIO, allCorrect(AUDIO.questionIds)],
  ];
  for (const [passage, picks] of rest) {
    await page.getByRole('button', { name: '요약 없이 풀기' }).click();
    await answerPassage(page, picks);
    await expect(page.getByTestId('passage-result')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: '피드백 시작' }).click();
    for (let i = 0; i < passage.questionIds.length; i++) await finishFeedback(page);
  }

  // 결과 화면
  await expect(page.getByRole('heading', { name: '독해력 진단 결과' })).toBeVisible({ timeout: 20_000 });
  for (const name of ['내 위치', '문제 풀이 결과', '독해 패턴', '추천']) await expect(page.getByRole('region', { name })).toBeVisible();
  await expect(page.getByTestId('grade')).toContainText('등급');
  await expect(page.getByRole('region', { name: '독해 패턴' })).toContainText('첫 요약만');
  await expect(page.getByRole('region', { name: '독해 패턴' })).toContainText('곳을 잡았어');
  await expect(page.getByRole('region', { name: '추천' })).toContainText('걸린 함정');
  await expect(page.getByRole('region', { name: '문제 풀이 결과' })).toContainText('근거 생략');
  await page.getByRole('button', { name: /(^| )6번$/u }).click();       // 경마식 보도 6번: 오답 + 비틂
  const card = page.getByRole('article');
  await expect(card).toContainText('오답');
  await expect(card).toContainText('걸린 함정 ·');
  await expect(card).toContainText('이 문항 정답률');
  await page.getByRole('button', { name: /(^| )9번$/u }).click();       // 플라스틱 9번: 문항 검토
  await expect(page.getByRole('article')).toContainText('이 문항은 우리가 한 번 더 확인하고 있어.');
  await expect(page.getByRole('article')).not.toContainText('걸린 함정');
  await page.getByRole('button', { name: /(^| )6번$/u }).click();
  await noCodesOnScreen(page);
  await page.screenshot({ path: resolve(shots, '07-result-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(shots, '08-result-390.png'), fullPage: true });
  const positionBox = await page.getByRole('region', { name: '내 위치' }).boundingBox();
  expect(positionBox!.y + positionBox!.height).toBeLessThanOrEqual(844 + 40);   // ①이 한 화면(390x844)에 들어간다
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // 새로 고침 뒤에도 같은 참가자의 결과
  expect(await page.evaluate(() => window.localStorage.getItem('csat-diagnostic-participant'))).toMatch(/^[0-9a-f-]{36}$/u);
  await page.reload();
  await expect(page.getByRole('heading', { name: '독해력 진단 결과' })).toBeVisible({ timeout: 20_000 });
});

test('기존 경로가 그대로 열린다', async ({ page }) => {
  for (const [path, text] of [['/dialogue/lab', '단순 형식 문단 대화'], ['/problem/lab', '문제 풀이 개발자 테스트'], ['/dialogue/lab/analysis', '']] as const) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    if (text) await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
    else await expect(page.locator('#root')).not.toBeEmpty();
  }
});
