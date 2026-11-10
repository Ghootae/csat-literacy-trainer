/**
 * SNS 진단평가(/diagnostic) 끝까지 한 번(인계 B, D-0218 지문 결과 화면). 가짜 평가기·가짜 transport만 쓰고 외부 전송은 없다.
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
let server: Server; let controller: DiagnosticController; let root: string; let previousDev: string | undefined;
const [COG, HORSE, PLASTIC, AUDIO] = set.passages as [typeof set.passages[number], typeof set.passages[number], typeof set.passages[number], typeof set.passages[number]];
const [Q12, Q13, Q14, Q15, Q16] = COG.questionIds as [string, string, string, string, string];
const HORSE_WRONG = HORSE.questionIds[2]!;      // 경마식 보도 6번: 오답 + 근거 오류(비틂 꼬리표)
const PLASTIC_WRONG = PLASTIC.questionIds[1]!;  // 플라스틱 9번: 오답이지만 판정이 SUPPORTED라 문항 검토

test.beforeAll(async () => {
  root = mkdtempSync(resolve(tmpdir(), 'diagnostic-e2e-')); mkdirSync(shots, { recursive: true });
  previousDev = process.env['CSAT_DIAGNOSTIC_DEV']; process.env['CSAT_DIAGNOSTIC_DEV'] = '1';   // ?dev=1 확인용(내부 범주 표기·개발자 지도)
  const fb = feedbackFake({ behavior: q => q === Q13 || q === HORSE_WRONG ? 'ERROR' : 'SUPPORTED' });
  controller = new DiagnosticController({ store: new FileDiagnosticStore(resolve(root, 'diagnostic')), feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: resolve(root, 'summary'),
    diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
  server = createLearningServer({ developerMode: true, diagnosticEnabled: true, diagnosticController: controller, dialogueLogDirectory: resolve(root, 'dialogue'), warmer: () => Promise.resolve(), problemFeedbackSave() {} });
  await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', ready); });
});
test.afterAll(async () => {
  await new Promise<void>(done => server.close(() => done())); rmSync(root, { recursive: true, force: true });
  if (previousDev === undefined) delete process.env['CSAT_DIAGNOSTIC_DEV']; else process.env['CSAT_DIAGNOSTIC_DEV'] = previousDev;
});

const position = (choiceId: string) => Number(/\d+/u.exec(choiceId)![0]);
const circled = (choiceId: string) => '①②③④⑤'[position(choiceId) - 1]!;
async function answer(page: Page, choiceId: string, rationale: string | null) {
  await page.getByRole('radio', { name: `${circled(choiceId)}번 선지` }).click();
  if (rationale === null) await page.getByRole('button', { name: '근거 미입력(확실)' }).click();
  else { await page.locator('#diag-rationale').fill(rationale); await page.getByRole('button', { name: '제출', exact: true }).click(); }
}
async function answerPassage(page: Page, picks: { choiceId: string; rationale: string | null }[]) {
  for (const [i, pick] of picks.entries()) {
    await answer(page, pick.choiceId, pick.rationale);
    if (i + 1 < picks.length) await page.getByRole('button', { name: '다음 문항' }).click();
  }
  await page.getByRole('button', { name: '이 지문 답 다 냈어' }).click();
}
const allCorrect = (ids: readonly string[]) => ids.map(q => ({ choiceId: correctChoice(q), rationale: '원문을 읽고 판단한 이유를 적었다.' }));
/** 한 문항의 검토를 끝내고 지문 결과 화면으로 돌아간다(건너뛰기·설명 거절을 쓴다). */
async function finishFeedback(page: Page) {
  for (let guard = 0; guard < 60; guard++) {
    const back = page.getByRole('button', { name: '지문 결과로 돌아가기', exact: true });
    if (await back.isVisible()) { await back.click(); return; }
    for (const name of ['이 문항 건너뛰기', '아니']) {
      const button = page.getByRole('button', { name, exact: true });
      if (await button.isVisible() && await button.isEnabled()) { await button.click(); break; }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('검토가 끝나지 않았다.');
}
/** 지문 결과 화면: 판정이 끝날 때까지 기다린 뒤 모든 결과를 공개하고, 활성인 검토 버튼을 하나씩 끝내고 다음으로 간다. */
async function completePassage(page: Page, count: number) {
  const buttons = page.locator('[data-testid^="qbtn-"]');
  await expect(buttons).toHaveCount(count, { timeout: 20_000 });
  await expect(page.locator('[data-testid^="qbtn-"][data-analyzing="true"]')).toHaveCount(0, { timeout: 20_000 });
  for (let i = 0; i < count; i++) await buttons.nth(i).click();
  await expect(page.getByTestId('grade-text')).toHaveText(/^[1-9]등급$/u);
  for (let guard = 0; guard < 10; guard++) {
    const review = page.locator('.diag-reviewbtn:not([disabled])');
    if (await review.count() === 0) break;
    await review.first().click();
    await finishFeedback(page);
  }
  await page.getByTestId('finish').click();
}
async function noCodesOnScreen(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text.match(/[A-Z_]{4,}/gu) ?? []).toEqual([]);
}

test('시작 → 지문 1 요약·답(근거 있음·생략) → 지문 결과 화면(공개·리뷰 고르기·다음 지문) → 지문 2~4 → 결과, 새로 고침 뒤 이어 가기', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toHaveCount(0);   // 마지막 문항이 아니면 없다
  await expect(page.getByRole('button', { name: '이전 문항' })).toBeDisabled();            // 첫 문항
  await expect(page.getByRole('button', { name: '다음 문항' })).toBeDisabled();            // 제출 전
  for (const name of ['제출', '근거 미입력(확실)', '근거 미입력(잘 모르겠음)']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();   // 선지를 고르기 전
  await expect(page.getByRole('button', { name: '결론', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: `${circled(correctChoice(Q12))}번 선지` }).click();
  await expect(page.getByRole('button', { name: '제출', exact: true })).toBeDisabled();   // 글이 비면 제출 못 한다
  await expect(page.getByRole('button', { name: '근거 미입력(확실)', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '근거 미입력(잘 모르겠음)', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '결론', exact: true }).click();                   // 결론 버튼이 고른 선지 문장을 붙인다
  await expect(page.locator('#diag-rationale')).toHaveValue(/^따라서 ①번은 옳(음|지 않음)$/u);
  await page.locator('#diag-rationale').fill('');
  await page.screenshot({ path: resolve(shots, '03a-answer-before-submit-desktop.png'), fullPage: true });
  await answer(page, correctChoice(Q12), '첫 문항의 이유를 적었다.');
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toHaveCount(0);
  for (const name of ['제출', '근거 미입력(확실)', '근거 미입력(잘 모르겠음)']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();   // 확정한 문항
  await expect(page.getByText('이미 낸 답이야')).toBeVisible();
  await page.screenshot({ path: resolve(shots, '03a2-answer-confirmed-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '다음 문항' }).click();
  await expect(page.getByRole('button', { name: '이전 문항' })).toBeEnabled();             // 제출 전에도 이전 문항은 켜진다
  await expect(page.getByRole('button', { name: '다음 문항' })).toBeDisabled();
  await answer(page, wrongChoice(Q13), '둘째 문항의 이유를 적었다.');
  await page.getByRole('button', { name: '다음 문항' }).click();
  await expect(page.getByRole('button', { name: '다음 문항' })).toBeDisabled();            // 셋째 문항은 아직 제출 전
  await page.screenshot({ path: resolve(shots, '03-answer-desktop.png'), fullPage: true });

  // 이전 문항은 읽기 전용: 낸 답이 보이고 고칠 수 없다. 차례가 아닌 문항 번호 칸은 비활성이다(D-0221)
  const cells = page.getByRole('navigation', { name: '문항 이동' });
  await expect(cells.getByRole('button', { name: '12', exact: true })).toBeEnabled();
  await expect(cells.getByRole('button', { name: '14', exact: true })).toBeEnabled();
  for (const n of ['15', '16']) await expect(cells.getByRole('button', { name: n, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toHaveCount(0);
  await page.getByRole('button', { name: '이전 문항' }).click();
  await expect(page.getByText('이미 낸 답이야')).toBeVisible();
  await expect(page.getByRole('radio', { name: `${circled(wrongChoice(Q13))}번 선지` })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: `${circled(wrongChoice(Q13))}번 선지` })).toBeDisabled();
  await expect(page.locator('#diag-rationale')).toBeDisabled(); await expect(page.locator('#diag-rationale')).toHaveValue('둘째 문항의 이유를 적었다.');
  for (const name of ['제출', '근거 미입력(확실)', '근거 미입력(잘 모르겠음)']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await page.screenshot({ path: resolve(shots, '03b-answer-readonly-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '다음 문항' }).click();   // 확정한 문항에서는 이동만, 지금 차례 문항까지

  // 새로 고침: 지금 차례 문항(14번)에서 이어 가고, 앞 문항은 확정한 답 그대로 읽기 전용이다
  await page.reload();
  await expect(page.getByText('이미 낸 답이야')).toHaveCount(0);
  await expect(page.getByText('문항 3 / 5')).toBeVisible();
  await expect(page.locator('#diag-rationale')).toHaveValue('');
  await page.getByRole('button', { name: '이전 문항' }).click(); await page.getByRole('button', { name: '이전 문항' }).click();
  await expect(page.getByRole('radio', { name: `${circled(correctChoice(Q12))}번 선지` })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#diag-rationale')).toHaveValue('첫 문항의 이유를 적었다.'); await expect(page.locator('#diag-rationale')).toBeDisabled();
  await page.getByRole('button', { name: '다음 문항' }).click(); await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, correctChoice(Q14), null);
  await page.getByRole('button', { name: '다음 문항' }).click();
  await answer(page, wrongChoice(Q15), null);
  await page.getByRole('button', { name: '다음 문항' }).click();
  await expect(page.getByRole('button', { name: '다음 문항' })).toHaveCount(0);             // 마지막 문항에는 "다음 문항"이 없다
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toBeDisabled();   // 제출 전
  await page.screenshot({ path: resolve(shots, '03c-answer-last-before-submit-desktop.png'), fullPage: true });
  await answer(page, correctChoice(Q16), '다섯째 문항의 이유를 적었다.');
  await expect(page.getByRole('button', { name: '이 지문 답 다 냈어' })).toBeEnabled();    // 제출 뒤
  await page.screenshot({ path: resolve(shots, '03d-answer-last-submitted-desktop.png'), fullPage: true });
  // 정오는 보이지 않는다
  const answerScreenText = await page.locator('body').innerText();
  expect(answerScreenText).not.toMatch(/오답|정답이야|맞혔어/u);
  await page.getByRole('button', { name: '이 지문 답 다 냈어' }).click();

  // 지문 결과 화면: 결과는 가려져 있고 문제 버튼 색(글자 표시 포함)만 보인다
  await expect(page.getByTestId('qbtn-12')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-testid^="qbtn-"][data-analyzing="true"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId('qbtn-13')).toHaveAttribute('data-group', 'wrong');
  await expect(page.getByTestId('qbtn-12')).toHaveAttribute('data-group', 'good');
  await expect(page.getByTestId('qbtn-12')).toContainText('✓ 정답'); await expect(page.getByTestId('qbtn-13')).toContainText('✕ 오답');
  for (const n of [12, 13, 14, 15, 16]) await expect(page.getByTestId(`desc-${n}`)).toHaveText('결과는 가려져 있어');
  await expect(page.getByTestId('grade-text')).toHaveText('나의 현재 등급은?');
  await expect(page.getByTestId('finish')).toBeDisabled();
  expect(await page.locator('body').innerText()).not.toMatch(/정답\(|오답\(/u);
  await page.screenshot({ path: resolve(shots, '04-result-hidden-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(shots, '05-result-hidden-390.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  // 문제 버튼을 눌러 하나씩 공개한다
  await page.getByTestId('qbtn-12').click();
  await expect(page.getByTestId('desc-12')).toContainText('정답(정답률');
  await expect(page.getByTestId('desc-12')).toContainText('근거도 명확했어');
  await expect(page.getByTestId('review-12')).toBeDisabled();
  await expect(page.getByTestId('desc-13')).toHaveText('결과는 가려져 있어');
  await expect(page.getByTestId('grade-text')).toHaveText('나의 현재 등급은?');
  await page.screenshot({ path: resolve(shots, '06-one-revealed-desktop.png'), fullPage: true });
  for (const n of [13, 14, 15]) await page.getByTestId(`qbtn-${n}`).click();
  await expect(page.getByTestId('desc-13')).toContainText('오답(같은 선지를 고른 비율');
  await expect(page.getByTestId('review-13')).toBeEnabled(); await expect(page.getByTestId('review-13')).toHaveText('아깝지만 정답이 아니야. 다시 검토해 보자.');
  await expect(page.getByTestId('desc-14')).toContainText('확신을 갖고 풀었어'); await expect(page.getByTestId('review-14')).toBeDisabled();
  await expect(page.getByTestId('review-15')).toBeEnabled();
  await expect(page.getByTestId('desc-16')).toHaveText('결과는 가려져 있어');
  await expect(page.getByTestId('grade-text')).toHaveText('나의 현재 등급은?');   // 한 문항이라도 가려져 있으면 등급은 아직이다
  // 공개 여부는 서버에 남는다: 새로 고침해도 그대로
  await page.reload();
  await expect(page.getByTestId('desc-13')).toContainText('오답(같은 선지를 고른 비율', { timeout: 20_000 });
  await expect(page.getByTestId('desc-16')).toHaveText('결과는 가려져 있어');
  await page.getByTestId('qbtn-16').click();
  await expect(page.getByTestId('grade-text')).toHaveText(/^[1-9]등급$/u);
  await expect(page.getByTestId('grade-sentence')).toHaveText(/^[1-9]등급(.*)일 확률이 (각각 )?\d+%로 가장 높아$/u);
  await expect(page.getByTestId('grade-bar')).toHaveAttribute('aria-label', /등급별 확률: 1등급 \d+%/u);
  await expect(page.getByTestId('grade-bar')).toHaveCSS('background-image', /linear-gradient/u);
  await page.getByTestId('grade-bar').hover({ position: { x: 5, y: 7 } });
  await expect(page.getByTestId('grade-tip')).toHaveText(/^1등급일 확률 \d+%$/u);
  await expect(page.getByTestId('grade-curve')).toBeVisible();
  await noCodesOnScreen(page);   // 학생 화면에는 내부 범주가 없다
  await page.screenshot({ path: resolve(shots, '07-all-revealed-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(shots, '08-all-revealed-390.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 900 });

  // ?dev=1: 내부 범주 표기, 개발자 지도의 문항 칸은 리뷰 대상만
  await page.goto('/diagnostic?dev=1');
  await expect(page.getByLabel('개발자 지도')).toBeVisible();
  await page.getByTestId(`dev-cell-${COG.passageId}:mid`).click();
  await expect(page.getByTestId('desc-12')).toContainText('(SUPPORTED_CORRECT', { timeout: 20_000 });
  await expect(page.getByTestId('desc-13')).toContainText('(WRONG');
  await expect(page.getByTestId(`dev-cell-${COG.passageId}:q:${Q13}`)).toBeVisible(); await expect(page.getByTestId(`dev-cell-${COG.passageId}:q:${Q15}`)).toBeVisible();
  for (const q of [Q12, Q14, Q16]) await expect(page.getByTestId(`dev-cell-${COG.passageId}:q:${q}`)).toHaveCount(0);
  await page.screenshot({ path: resolve(shots, '09-dev-result-desktop.png'), fullPage: true });
  await page.goto('/diagnostic');
  await expect(page.getByTestId('desc-13')).toContainText('오답');
  expect(await page.locator('body').innerText()).not.toContain('(WRONG');

  // 검토: 마치지 않고 돌아가도 되고, 순서는 자유다(15번 먼저)
  await page.getByTestId('review-15').click();
  await expect(page.getByRole('button', { name: '← 결과 목록' })).toBeVisible();
  await page.screenshot({ path: resolve(shots, '10-review-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '← 결과 목록' }).click();
  await expect(page.getByTestId('review-15')).toBeEnabled();
  await expect(page.getByTestId('finish')).toBeDisabled(); await expect(page.getByTestId('finish-hint')).toContainText('다시 검토할 문제가 2개 남았어');
  await page.getByTestId('review-15').click();
  await finishFeedback(page);
  await expect(page.getByTestId('review-15')).toHaveText('검토 완료했어. 수고했어'); await expect(page.getByTestId('review-15')).toBeDisabled();
  await expect(page.getByTestId('finish')).toBeDisabled();
  await page.getByTestId('review-13').click();
  await finishFeedback(page);
  await expect(page.getByTestId('review-13')).toHaveText('검토 완료했어. 수고했어');
  await expect(page.getByTestId('finish')).toBeEnabled();
  await noCodesOnScreen(page);
  await page.screenshot({ path: resolve(shots, '11-reviewed-desktop.png'), fullPage: true });
  await page.getByTestId('finish').click();

  // 지문 2~4: 요약 없이
  const rest: [typeof COG, { choiceId: string; rationale: string | null }[]][] = [
    [HORSE, HORSE.questionIds.map(q => q === HORSE_WRONG ? { choiceId: wrongChoice(q), rationale: '여섯 번째 문항의 이유를 적었다.' } : { choiceId: correctChoice(q), rationale: '원문을 읽고 적었다.' })],
    [PLASTIC, PLASTIC.questionIds.map(q => q === PLASTIC_WRONG ? { choiceId: wrongChoice(q), rationale: '아홉 번째 문항의 이유를 적었다.' } : { choiceId: correctChoice(q), rationale: '원문을 읽고 적었다.' })],
    [AUDIO, allCorrect(AUDIO.questionIds)],
  ];
  for (const [passage, picks] of rest) {
    await page.getByRole('button', { name: '요약 없이 풀기' }).click();
    await answerPassage(page, picks);
    await completePassage(page, passage.questionIds.length);
  }

  // 결과 화면
  await expect(page.getByRole('heading', { name: '독해력 진단 결과' })).toBeVisible({ timeout: 20_000 });
  for (const name of ['내 위치', '문제 풀이 결과', '독해 패턴', '추천']) await expect(page.getByRole('region', { name })).toBeVisible();
  const position = page.getByRole('region', { name: '내 위치' });
  await expect(page.getByTestId('grade')).toHaveText(/^[1-9]등급$/u);
  await expect(page.getByTestId('grade-sentence')).toHaveText(/^[1-9]등급(.*)일 확률이 (각각 )?\d+%로 가장 높아$/u);
  await expect(page.getByTestId('grade-bar')).toHaveCSS('background-image', /linear-gradient/u);
  await page.getByTestId('grade-bar').hover({ position: { x: 5, y: 7 } });
  await expect(page.getByTestId('grade-tip')).toHaveText(/^1등급일 확률 \d+%$/u);
  await expect(page.getByTestId('grade-curve').locator('path')).toHaveAttribute('d', /^M[\d.]+,[\d.]+( L[\d.]+,[\d.]+)+$/u);
  await expect(position).not.toContainText('전국 분포에서의 위치');
  await expect(position.getByTestId('passage-row')).toHaveCount(4);
  await expect(position.getByTestId('passage-row').last()).toContainText(/^지문 1~\d[1-9]등급 · \d+%$/u);
  for (const row of await position.getByTestId('passage-row').all()) {
    await expect(row.getByTestId('grade-bar-small')).toHaveCSS('background-image', /linear-gradient/u);
    await expect(row).toContainText(/[1-9]등급 · \d+%/u);
  }
  await expect(position).not.toContainText(/\d~\d등급/u);   // 등급 범위 표기 없음(전국 비율 "4~11%"는 등급 범위가 아니다)
  const solveCells = page.getByRole('region', { name: '문제 풀이 결과' }).locator('.diag-cell');
  await expect(solveCells).toHaveCount(16);
  await expect(page.getByRole('button', { name: /(^| )6번, ✕ 오답$/u })).toHaveAttribute('data-group', 'wrong');
  await expect(page.getByRole('region', { name: '문제 풀이 결과' }).locator('.diag-cell[data-group="good"]').first()).toHaveCSS('background-color', 'rgb(228, 243, 225)');
  await expect(page.getByRole('region', { name: '독해 패턴' })).toContainText('첫 요약만');
  await expect(page.getByRole('region', { name: '독해 패턴' })).toContainText('곳을 잡았어');
  await expect(page.getByRole('region', { name: '추천' })).toContainText('걸린 함정');
  await expect(page.getByRole('region', { name: '문제 풀이 결과' })).toContainText('근거 없이 낸 정답');
  await page.getByRole('button', { name: /(^| )6번(,|$)/u }).click();       // 경마식 보도 6번: 오답 + 비틂
  const card = page.getByRole('article');
  await expect(card).toContainText('오답');
  await expect(card).toContainText('걸린 함정 ·');
  await expect(card).toContainText('이 문항 정답률');
  await page.getByRole('button', { name: /(^| )9번(,|$)/u }).click();       // 플라스틱 9번: 문항 검토
  await expect(page.getByRole('article')).toContainText('이 문항은 우리가 한 번 더 확인하고 있어.');
  await expect(page.getByRole('article')).not.toContainText('걸린 함정');
  await page.getByRole('button', { name: /(^| )6번(,|$)/u }).click();
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
