import { test, expect, type Page } from '@playwright/test';
import { ProblemSolvingController } from '../src/server/problem-solving.js';
import type { ProblemDeveloperInspection, ProblemSessionView } from '../src/shared/contract.js';

async function fixture(page: Page, phase: ProblemSessionView['phase'] = 'AWAITING_INITIAL_CHOICE') {
  const started = new ProblemSolvingController().start('mrna-vaccine-lipid-nanoparticle-q19');
  const session: ProblemSessionView = { ...started, phase };
  const inspection: ProblemDeveloperInspection = { session, evaluations: [] };
  let reads = 0;
  await page.route('**/api/**', async route => {
    if (route.request().url().includes('/api/developer/problem-inspect')) {
      reads += 1;
      return route.fulfill({ json: inspection });
    }
    return route.fulfill({ json: session });
  });
  return { session, inspection, reads: () => reads };
}

test('developer drawer is opt-in, keyboard accessible, and preserves the draft', async ({ page }) => {
  const data = await fixture(page);
  await page.goto('/problem?returnTo=%2Fdialogue%2Fdev');
  await page.locator('#problem-rationale-optional').fill('작성 중인 근거');
  expect(data.reads()).toBe(0);
  const trigger = page.getByRole('button', { name: '응답 평가', exact: true });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: '응답 평가', exact: true });
  await expect(drawer).toContainText('최초 선택 대기');
  await expect(drawer).toContainText('저장된 모델 판정이 없습니다');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('#problem-rationale-optional')).toHaveValue('작성 중인 근거');
  await trigger.click();
  await drawer.getByRole('button', { name: '응답 평가 닫기' }).click();
  await expect(drawer).toHaveCount(0);
});

test('student problem screen never shows or requests developer inspection', async ({ page }) => {
  const data = await fixture(page);
  await page.goto('/problem');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: '응답 평가', exact: true })).toHaveCount(0);
  expect(data.reads()).toBe(0);
});

test('shows historical evidence separately from model reconstruction and current progress', async ({ page }) => {
  const data = await fixture(page);
  const first = { mode: 'DIAGNOSE_PATH', assessment: 'CLEAR_ERROR', reason: '관계 방향이 반대입니다.', reconstructedPath: '학생은 원인과 결과를 반대로 연결했다.', learningState: 'PATH_CLARIFIED', divergenceLayer: 'INFERENCE_TRANSFORMATION', nextAction: 'ASK_CORRECTIVE', studentEvidence: [{ observationId: 'O1', quote: '학생이 실제로 말한 근거' }], sourceEvidence: [], promptVersion: 'mock-v3' };
  Object.assign(data.inspection, { evaluations: [first, { ...first, assessment: 'SUPPORTED', reason: '수정된 관계를 확인했습니다.', nextAction: 'REQUEST_RESELECTION' }] });
  await page.goto('/problem/dev');
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toContainText('수정된 관계를 확인했습니다.');
  await drawer.getByRole('button', { name: '1차 · 명시적 오류' }).click();
  await expect(drawer.locator('blockquote')).toContainText('학생이 실제로 말한 근거');
  await expect(drawer).toContainText('학생은 원인과 결과를 반대로 연결했다.');
  await expect(drawer).toContainText('과거 판정은 현재 답변의 판정이 아닙니다.');
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await drawer.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  await drawer.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: '/private/tmp/problem-evaluation-drawer-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await drawer.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: '/private/tmp/problem-evaluation-drawer-desktop.png' });
});

test('processing and API errors are not shown as student reasoning failures', async ({ page }) => {
  const data = await fixture(page, 'PROCESSING');
  await page.goto('/problem/dev');
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('평가 처리 중');
  await page.route('**/api/developer/problem-inspect?*', route => route.fulfill({ status: 403, json: { error: '개발자 API 비활성화' } }));
  await page.getByRole('button', { name: '상태 새로고침' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('개발자 API 비활성화');
  await expect(page.getByRole('dialog').getByRole('region', { name: '현재 진행 상태' })).toHaveCount(0);
  expect(data.reads()).toBeGreaterThan(0);
});

test('correct choice with unverified rationale remains two separate final statuses', async ({ page }) => {
  const data = await fixture(page);
  const controller = new ProblemSolvingController();
  const initial = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
  const completed = await controller.submitInitial(initial.sessionId, { choiceId: 'C5' });
  Object.assign(data.session, completed, { result: { ...completed.result!, rationaleAssessment: 'UNCERTAIN', resolutionOutcome: 'INITIAL_CORRECT_UNVERIFIED' } });
  await page.goto('/problem/dev');
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  const final = page.getByRole('region', { name: '최종 평가' });
  await expect(final).toContainText('최종 선택 정답');
  await expect(final).toContainText('근거 확인 불가 / 불충분');
  await expect(final).not.toContainText('명시적 오류');
});
