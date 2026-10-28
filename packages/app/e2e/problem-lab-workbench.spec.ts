import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import type { FeedbackEvaluator } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';

const shots = '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-24-choice-direct';
let server: Server;
const failed = new Set<string>();
const failures = new Map<string, number>();
const port = Number(process.env['CSAT_API_PORT'] ?? 5374);
const questionId = 'information-asymmetry-free-marketplace-q13';
const evaluator: FeedbackEvaluator = { async evaluate(s) {
  const metadata = { provider: 'mock', model: 'fixed', promptVersion: 'problem-feedback-v4', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
  if (s.evaluationMode === 'END_EXPLANATION' && s.observations.some(o => 'rationale' in o.command && o.command.rationale.mode === 'PROVIDED' && o.command.rationale.text.includes('느린 설명'))) await new Promise(resolve => setTimeout(resolve, 9000));
  if (s.evaluationMode === 'END_EXPLANATION') return { metadata, rawOutput: { firstChoice: '동일인의 반복 게시가 여러 시민의 의견으로 오인되면 여론이 왜곡될 수 있어. 원문과 고른 선지를 비교해 봐.', reselection: s.selections.length === 2 ? '다시 고른 선지의 내용도 여론 왜곡의 관계로 확인해 봐.' : null, answer: '실명 확인 의무가 위헌으로 판단됐으므로 이 규정으로 제재받지 않아. 그래서 ⑤번이 정답이야.' } };
  const observation = s.observations.at(-1)!;
  const command = observation.command;
  const text = command.type === 'CORRECT' ? command.text : (command.type === 'SELECT' || command.type === 'RATIONALE') && command.rationale.mode === 'PROVIDED' ? command.rationale.text : '';
  if (text.includes('페이싱')) {
    // 말풍선 운영 규칙 시험 전용: 현재 판정 스키마에 맞는 최소 출력.
    await new Promise(resolve => setTimeout(resolve, 3500));
    const evidence = [{ observationId: observation.observationId, quote: text }];
    const unknownKind = !text.includes('오류');
    return { metadata, rawOutput: { mode: 'SELECTION', boundary: 'NONE', reason: unknownKind ? '확인할 수 없음' : '내용 오류', reconstructability: unknownKind ? 'UNKNOWN' : 'RECONSTRUCTABLE',
      reconstructedPath: unknownKind ? [] : [text], rationaleImpliedVerdict: unknownKind ? 'UNKNOWN' : 'INVALID', contentAssessment: unknownKind ? 'UNKNOWN' : 'ERROR', insufficiencyKind: 'NONE', studentEvidence: evidence,
      sourceEvidence: unknownKind ? [] : [{ location: 'PASSAGE', quote: s.source.passage.slice(0, 30), mediaId: null, visualObservation: null }],
      errors: unknownKind ? [] : [{ errorId: 'E1', errorType: 'CONTENT', description: '관계 오류', studentEvidence: evidence, sourceEvidence: [{ location: 'PASSAGE', quote: s.source.passage.slice(0, 30), mediaId: null, visualObservation: null }], basis: 'STATED', question: '원문과 비교하면 어떻게 달라지나요?' }],
      errorHypothesis: null, selectionMismatchQuestion: null } };
  }
  if (text.includes('느린 판정')) await new Promise(resolve => setTimeout(resolve, 6000));
  if (text.includes('두 번 통신')) {
    const count = failures.get(observation.observationId) ?? 0;
    if (count < 2) { failures.set(observation.observationId, count + 1); throw new Error('mock failure'); }
  } else if (text.includes('통신') && !failed.has(observation.observationId)) { failed.add(observation.observationId); throw new Error('mock failure'); }
  const studentEvidence = [{ observationId: observation.observationId, quote: text }];
  const sourceEvidence = [{ location: 'PASSAGE', quote: s.source.passage.slice(0, 30), mediaId: null, visualObservation: null }];
  if (s.evaluationMode === 'REPAIR') {
    const corrections = s.observations.filter(o => o.command.type === 'CORRECT');
    const noRepair = text.includes('모르겠어요');
    return { metadata, rawOutput: { mode: 'REPAIR', boundary: 'NONE', reason: noRepair ? '수정 확인 불가' : '수정한 관계 확인', reviewedResponse: studentEvidence[0],
      repairs: s.errors.map((e, i) => ({ errorId: e.errorId, status: !noRepair && i < corrections.length ? 'REPAIRED' : 'REMAINING', studentEvidence })),
      newErrors: [], verificationComplete: true, rationaleSufficient: !noRepair, sufficiencyEvidence: noRepair ? [] : studentEvidence, coaching: '동일인의 반복 게시가 여론을 왜곡할 수 있다는 점을 원문과 비교해 보세요.' } };
  }
  const unknown = text.includes('모호');
  const correct = s.selections.at(-1)?.choiceId === s.source.answerChoiceId;
  return { metadata, rawOutput: { mode: 'SELECTION', boundary: text.includes('자료 경계') ? 'MISSING_SOURCE' : 'NONE', reason: unknown ? '근거의 판단 연결을 확인할 수 없습니다.' : '선택 근거를 원문과 비교했습니다.',
    reconstructability: unknown ? 'UNKNOWN' : 'RECONSTRUCTABLE', reconstructedPath: unknown ? [] : [text, '따라서 선택한 선지는 거짓이라고 판단한다.'], rationaleImpliedVerdict: unknown ? 'UNKNOWN' : 'INVALID', contentAssessment: unknown ? 'UNKNOWN' : correct ? 'SUPPORTED' : 'ERROR', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
    errors: correct || unknown ? [] : Array.from({ length: text.includes('두 가지') ? 2 : 1 }, (_, i) => ({ errorId: `E${i + 1}`, errorType: 'CONTENT', description: `${i + 1}번째 관계 오류`, studentEvidence, sourceEvidence, basis: 'STATED', question: `${i + 1}번째 관계를 원문과 비교하면 어떻게 달라지나요?` })),
    errorHypothesis: null, selectionMismatchQuestion: null, coaching: '동일인의 반복 게시가 여러 시민의 의견으로 오인되면 여론 왜곡의 우려를 뒷받침합니다.' } };
} };

test.beforeAll(async () => {
  server = createLearningServer({ developerMode: true, problemFeedbackEvaluator: evaluator, problemFeedbackSave() {}, examinerStrategyLog() {}, warmer: () => Promise.resolve() });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
});
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});
test.afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
async function open(page: Page) {
  await page.goto(`/problem/lab?questionId=${questionId}&returnTo=%2Fdialogue%2Fdev`);
  await expect(page.locator('h1')).toContainText('정보 비대칭');
}
test('옛 주소 /problem/dev/v4는 쿼리를 유지한 채 /problem/lab으로 바뀐다', async ({ page }) => {
  await page.goto(`/problem/dev/v4?questionId=${questionId}&returnTo=%2Fdialogue%2Fdev`);
  await expect(page.locator('h1')).toContainText('정보 비대칭');
  const url = new URL(page.url());
  expect(url.pathname).toBe('/problem/lab');
  expect(url.searchParams.get('questionId')).toBe(questionId);
});
const circled = (n: number) => '①②③④⑤'[n - 1]!;
const radio = (page: Page, n: number) => page.getByRole('radio', { name: `${circled(n)}번 선지`, exact: true });
// 좁은 화면에서는 문제 탭에서 고르고 대화 탭에서 근거를 쓴다.
const isNarrow = (page: Page) => (page.viewportSize()?.width ?? 1600) <= 900;
async function select(page: Page, number: number, text: string) {
  if (isNarrow(page)) await page.getByRole('button', { name: '문제', exact: true }).click();
  await radio(page, number).click();
  if (isNarrow(page)) await page.getByRole('button', { name: '대화', exact: true }).click();
  await page.locator('#lab-response').fill(text);
  await page.getByRole('button', { name: '제출', exact: true }).click();
}

test('three panes, persistent draft, multiple corrections, reselection and verified finish', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  await expect(page.locator('.workbench-pane:visible')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '제출', exact: true })).toBeDisabled();
  await radio(page, 1).click();
  await page.locator('#lab-response').fill('두 가지 관계를 잘못 이해했습니다.');
  await page.reload();
  await expect(page.locator('#lab-response')).toHaveValue('두 가지 관계를 잘못 이해했습니다.');
  await expect(radio(page, 1)).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('대화 기록')).toContainText('1번째 관계를 원문과 비교');
  await page.locator('#lab-response').fill('첫 번째 관계를 수정했습니다.');
  await page.getByRole('button', { name: '답변 전송' }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('2번째 관계를 원문과 비교');
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#lab-response').fill('두 번째 관계도 수정했습니다.');
  await page.getByRole('button', { name: '답변 전송' }).click();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'false');
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('수정 확인');
  await expect(page.getByRole('dialog')).toContainText('거짓인 선지');
  await page.screenshot({ path: '/private/tmp/problem-lab-evaluation.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '응답 평가', exact: true })).toBeFocused();
  await select(page, 5, '원문의 관계에 따라 이 선지가 옳지 않습니다.');
  await expect(page.locator('.lab-terminal')).toBeVisible();
  await expect(page.locator('#lab-response')).toBeDisabled();
  await expect(page.locator('.chat-message.student')).toHaveCount(4);
  await expect(page.locator('.lab-answer-reveal')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.chat-message.student')).toHaveCount(4);
  await page.screenshot({ path: '/private/tmp/problem-lab-workbench-desktop.png' });
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('region', { name: '최종 평가' })).toContainText('근거 검증');
});

test('explicit omission → wrong → omitted rationale → coaching, answer reveal and no reselection', async ({ page }) => {
  await open(page); await radio(page, 1).click();
  await page.getByLabel('정답만 입력', { exact: true }).check();
  await expect(page.locator('#lab-response')).toBeDisabled();
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('정답이 아니야.');
  await page.getByLabel('근거 미제출', { exact: true }).check();
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.locator('.lab-answer-reveal')).toContainText('정답 5번');
  // 재선택은 없다: 제출 버튼도 없고, 풀이 단계의 선지는 답으로 고를 수 없다(⑤는 전략 보기용으로만 눌린다).
  await expect(page.getByRole('button', { name: '제출', exact: true })).toHaveCount(0);
  await expect(page.locator('#lab-response')).toBeDisabled();
  await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'true');
  await expect(radio(page, 5)).toHaveAttribute('aria-checked', 'false');
});

test('ambiguous correct can decline end coaching without questions or answer reveal; mobile panes fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await expect(page.locator('.workbench-pane:visible')).toHaveCount(1);
  await page.getByRole('button', { name: '문제', exact: true }).click();
  await expect(page.getByRole('region', { name: '문제와 선지' })).toBeVisible();
  await page.getByRole('button', { name: '대화', exact: true }).click();
  await select(page, 5, '모호한 근거입니다.');
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('알겠어. 이 문제는 여기까지야.');
  await expect(page.locator('.lab-terminal')).toHaveCount(0);
  await expect(page.locator('.lab-answer-reveal')).toHaveCount(0);
  await page.screenshot({ path: '/private/tmp/problem-lab-workbench-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const mobilePane = (await page.locator('.chat-pane').boundingBox())!; const mobileMain = (await page.locator('.lab-primary-actions button').first().boundingBox())!;
  expect(mobileMain.y + mobileMain.height).toBeLessThanOrEqual(mobilePane.y + mobilePane.height - 8);
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('region', { name: '최종 평가' })).toContainText('근거 미검증');
});

test('system failure resumes without adding a student answer or another selection', async ({ page }) => {
  await open(page); await select(page, 1, '통신 오류를 시험하는 근거입니다.');
  await expect(page.getByRole('button', { name: '평가 다시 시도' })).toBeVisible();
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  await page.getByRole('button', { name: '평가 다시 시도' }).click();
  await expect(page.getByRole('button', { name: '답변 전송' })).toBeVisible();
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  await expect(page.locator('.workbench-actions')).toContainText('선택 1 / 2');
});

test('a RESUME that fails again shows the RESUME button again and the next RESUME evaluates', async ({ page }) => {
  await open(page); await select(page, 1, '두 번 통신 오류를 시험하는 근거입니다.');
  await expect(page.getByRole('button', { name: '평가 다시 시도' })).toBeVisible();
  await page.getByRole('button', { name: '평가 다시 시도' }).click();
  await expect(page.getByRole('button', { name: '평가 다시 시도' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: '같은 제출 다시 보내기' })).toHaveCount(0);
  await page.getByRole('button', { name: '평가 다시 시도' }).click();
  await expect(page.getByRole('button', { name: '답변 전송' })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
});

test('failed correction ends with coaching; item boundary is not student failure', async ({ page }) => {
  await open(page); await select(page, 1, '관계가 반대라고 생각합니다.');
  await page.locator('#lab-response').fill('모르겠어요'); await page.getByRole('button', { name: '답변 전송' }).click();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.locator('.lab-answer-reveal')).toBeVisible();
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '새 테스트', exact: true }).click();
  await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'false');
  await select(page, 1, '자료 경계 확인');
  await expect(page.locator('.lab-composer')).toContainText('자료 검토가 필요한 문항');
  await expect(page.locator('.lab-answer-reveal')).toHaveCount(0);
});

test('lost POST response recovers authoritative transcript without duplicate submission', async ({ page }) => {
  await open(page);
  let intercepted = false;
  await page.route('**/api/developer/problem-lab/session/*', async route => {
    if (route.request().method() === 'POST' && !intercepted) { intercepted = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await select(page, 5, '관계가 명확한 근거입니다.');
  await expect(page.locator('.lab-terminal')).toBeVisible();
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  await expect(page.locator('.workbench-actions')).toContainText('선택 1 / 2');
});


test('composer keeps three rows and identical height through correction, post repair and reselection', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  const composer = page.locator('.lab-composer');
  const heights: number[] = [];
  async function measure() {
    await expect(composer.locator(':scope > *')).toHaveCount(3);
    heights.push((await composer.boundingBox())!.height);
  }
  await measure();
  await expect(radio(page, 1)).toBeVisible();
  await select(page, 1, '관계가 반대라고 생각합니다.');
  await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.lab-highlight').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '지문에서 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '답변 전송', exact: true })).toBeVisible();
  await measure();
  await page.locator('#lab-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await expect(page.locator('.lab-highlight')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 선택', exact: true })).toBeVisible();
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#lab-response')).toBeDisabled(); await measure();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'false'); await measure();
  await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'true');
  await expect(radio(page, 1)).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#lab-response')).toHaveValue('');
  await expect(page.locator('.lab-composer-notice')).toHaveText('이번이 마지막 선택이야.');
  await expect(page.getByLabel('대화 기록')).not.toContainText('이번이 마지막 선택이야.');
  await expect(page.locator('.chat-message.student')).toHaveCount(2);
  expect(heights.every(height => height === heights[0])).toBe(true);
});


test('wrong reselection gates and reveals each section through understanding NO with a fixed composer', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  const heights: number[] = [];
  async function measure() {
    const composer = page.locator('.lab-composer');
    await expect(composer.locator(':scope > *')).toHaveCount(3);
    heights.push((await composer.boundingBox())!.height);
  }
  await measure();
  await select(page, 1, '관계가 반대라고 생각해.');
  await page.locator('#lab-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await select(page, 3, '느린 설명: 다시 고른 답도 맞다고 생각해.');
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeDisabled(); await measure();
  await expect(page.getByLabel('대화 기록')).toContainText('정답은 ⑤번이야.');
  await expect(page.getByLabel('대화 기록')).toContainText('다시 고른 답도 정답이 아니야. 더 묻지 않고 정답을 먼저 알려 줄게.');
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.locator('.lab-waiting')).toContainText('설명을 정리하고 있어'); await measure();
  await expect(page.getByLabel('대화 기록')).toContainText('처음에 고른 ①번부터 볼게.', { timeout: 15000 });
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled(); await measure();
  await expect(page.getByLabel('대화 기록')).not.toContainText('다음은 다시 고른 ③번이야.');
  await page.getByRole('button', { name: '다음으로 넘어가기', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeDisabled();
  await expect(page.getByLabel('대화 기록')).toContainText('다음은 다시 고른 ③번이야.');
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled(); await measure();
  await expect(page.getByLabel('대화 기록')).not.toContainText('이제 ⑤번이 정답인 이유를 볼게.');
  await page.getByRole('button', { name: '다음으로 넘어가기', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('이제 ⑤번이 정답인 이유를 볼게.');
  await expect(page.getByLabel('대화 기록')).toContainText('이해됐어?'); await measure();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('이 문제는 나중에 다시 볼 수 있게 표시해 둘게.');
  await expect(page.locator('.lab-terminal')).toHaveCount(0);
  await expect(page.locator('.lab-answer-reveal')).toContainText('정답 5번'); await measure();
  await expect(page.locator('.chat-message.student')).toHaveCount(3);
  expect(heights.every(height => height === heights[0])).toBe(true);
});

test('restored sections appear immediately; reduced motion keeps the next boundary without dots', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '모호한 근거야.');
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.locator('.lab-sequence-waiting')).toHaveCount(0);
  await expect(page.getByLabel('대화 기록')).not.toContainText('이해됐어?');
  await page.reload();
  await expect(page.getByLabel('대화 기록')).toContainText('이해됐어?');
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled();
  await expect(page.locator('.lab-sequence-waiting')).toHaveCount(0);
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('좋아, 이 문제는 여기까지야.');
  await expect(page.locator('.lab-terminal')).toHaveCount(0);
});


test('reduced motion retains both next boundaries in a fresh reselection sequence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '관계가 반대라고 생각해.');
  await page.locator('#lab-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await select(page, 3, '다시 고른 답도 맞다고 생각해.');
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.getByLabel('대화 기록')).not.toContainText('다음은 다시 고른 ③번이야.');
  await page.getByRole('button', { name: '다음으로 넘어가기', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('다음은 다시 고른 ③번이야.');
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.getByLabel('대화 기록')).not.toContainText('이해됐어?');
  await page.getByRole('button', { name: '다음으로 넘어가기', exact: true }).click();
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled();
  await expect(page.getByLabel('대화 기록')).toContainText('이해됐어?');
  await expect(page.locator('.lab-sequence-waiting')).toHaveCount(0);
});

test('mobile correction button opens the source tab and scrolls to the highlight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '관계를 반대로 이해했습니다.');
  const showSource = page.getByRole('button', { name: '지문에서 보기', exact: true });
  await expect(showSource).toBeVisible(); await showSource.click();
  await expect(page.getByRole('button', { name: '지문', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.source-pane .lab-highlight').first()).toBeInViewport();
  await page.getByRole('button', { name: '대화', exact: true }).click();
  await page.locator('#lab-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await expect(page.locator('.lab-highlight')).toHaveCount(0);
  await expect(showSource).toHaveCount(0);
});


test('instant verdict precedes waiting; processing reload preserves pending and draft until completion', async ({ page }) => {
  await open(page);
  const height = await page.locator('.lab-composer').evaluate(e => e.getBoundingClientRect().height);
  await select(page, 1, '느린 판정 모호');
  await expect(page.getByLabel('대화 기록')).toContainText('정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.');
  await expect(page.locator('.lab-waiting')).toHaveCount(0);
  await expect(page.locator('.lab-waiting')).toContainText('네 근거를 읽고 있어');
  await page.reload();
  await expect(page.locator('#lab-response')).toHaveValue('느린 판정 모호');
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith('csat.problem.lab.pending.')))).toBe(true);
  // The mock judgment takes 6 s; allow polling plus the gate reveal after it finishes.
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('#lab-response')).toHaveValue('');
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith('csat.problem.lab.pending.')))).toBe(false);
  const coach = await page.locator('.chat-message.tutor').allTextContents();
  expect(coach.findIndex(t => t.includes('네가 쓴 근거만으로는'))).toBeLessThan(coach.findIndex(t => t.includes('정답은 ⑤번이야.')));
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.getByLabel('대화 기록')).toContainText('설명이 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자.');
  expect(await page.locator('.lab-composer').evaluate(e => e.getBoundingClientRect().height)).toBe(height);
});


for (const size of [{ width: 1600, height: 1000 }, { width: 1280, height: 720 }]) {
  test(`layout economy, pinned stem and scenario, in-region highlight scroll and bottom-following chat at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size); await open(page);
    const big = size.width === 1600;
    if (big) {
      expect((await page.locator('.workbench-header').boundingBox())!.height).toBeLessThanOrEqual(44);
      expect((await page.locator('.lab-composer').boundingBox())!.height).toBeLessThanOrEqual(140);
      expect((await page.locator('.source-head').boundingBox())!.height).toBeLessThanOrEqual(72);
    }
    if (big) await page.screenshot({ path: '/private/tmp/problem-lab-layout-economy.png' });
    const pane = (await page.locator('.chat-pane').boundingBox())!;
    const main = (await page.locator('.lab-primary-actions button').first().boundingBox())!;
    // 주 버튼이 대화 칸 안에 완전히 들어가고 아래에 여백이 남는다.
    expect(main.y + main.height).toBeLessThanOrEqual(pane.y + pane.height - 8);
    expect(main.x + main.width).toBeLessThanOrEqual(pane.x + pane.width - 8);
    const list = page.locator('.lab-choices-scroll');
    const stem = page.locator('.question-head h3');
    const scenario = page.locator('.lab-scenario');
    const before = { stem: (await stem.boundingBox())!.y, scenario: (await scenario.count()) ? (await scenario.boundingBox())!.y : null };
    await list.evaluate(e => { e.scrollTop = e.scrollHeight; });
    expect((await stem.boundingBox())!.y).toBe(before.stem);
    if (before.scenario !== null) expect((await scenario.boundingBox())!.y).toBe(before.scenario);
    await list.evaluate(e => { e.scrollTop = 0; });
    const last = page.locator('.chat-message').last();
    await expect(last).toBeInViewport();
    await select(page, 1, '관계가 반대라고 생각합니다.');
    await expect(page.getByLabel('대화 기록')).toContainText('1번째 관계를 원문과 비교');
    await expect(page.locator('.source-pane .lab-highlight, .question-pane .lab-highlight').first()).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('.chat-message').last()).toBeInViewport();
    await expect(radio(page, 1)).toHaveAttribute('aria-disabled', 'true');
    await page.locator('#lab-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
    await page.getByRole('button', { name: '답변 전송', exact: true }).click();
    await expect(page.getByRole('button', { name: '다시 선택', exact: true })).toBeVisible();
    await expect(page.locator('.chat-message').last()).toBeInViewport();
    await page.getByRole('button', { name: '다시 선택', exact: true }).click();
    await select(page, 3, '다시 고른 답도 맞다고 생각해.');
    await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled();
    await expect(page.locator('.chat-message').last()).toBeInViewport();
    await page.getByRole('button', { name: '응', exact: true }).click();
    await expect(page.locator('.chat-message').last()).toBeInViewport();
  });
}

test('choice list is a radio group: keyboard selection, disabled while locked', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  await expect(page.getByRole('radiogroup', { name: '선지' })).toBeVisible();
  await expect(page.locator('.lab-choice-hint')).toHaveText('선지를 눌러 답을 골라');
  await expect(page.locator('.lab-composer-notice')).toContainText('문제에서 답을 골라 줘');
  await radio(page, 1).focus();
  await page.keyboard.press('ArrowDown');
  await expect(radio(page, 2)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(radio(page, 2)).toHaveAttribute('aria-checked', 'true');
  await expect(radio(page, 2)).toContainText('고름');
  await expect(page.locator('#lab-response')).not.toBeFocused();
  await expect(page.locator('.lab-composer-notice')).toContainText('②번을 골랐어');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(radio(page, 3)).toHaveAttribute('aria-checked', 'true');
  await expect(radio(page, 2)).toHaveAttribute('aria-checked', 'false');
});

test('narrow screen: choosing stays on the problem tab and the change link returns to it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await page.getByRole('button', { name: '문제', exact: true }).click();
  await radio(page, 1).click();
  await expect(page.getByRole('button', { name: '문제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '대화', exact: true }).click();
  await expect(page.locator('.lab-composer-notice')).toContainText('①번을 골랐어');
  await page.getByRole('button', { name: '문제에서 바꾸기', exact: true }).click();
  await expect(page.getByRole('button', { name: '문제', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: '문제와 선지' })).toBeVisible();
});

test('direct choice flow on the negative-stem question: only the answer has a strategy, buttons keep their place, no number or return buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  const composer = page.locator('.lab-composer');
  const chat = page.getByLabel('대화 기록');
  await expect(chat).toContainText('문제에서 답을 고르고, 그렇게 판단한 근거를 적어 줘. 근거 없이 답만 내도 돼.');
  await expect(composer.getByRole('button', { name: /번 선택/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /학습 맵으로 돌아가기/ })).toHaveCount(0);
  await expect(composer.getByRole('button', { name: '정답만 입력' })).toHaveCount(0);
  // 가운데(③)를 눌러 고르고 제출한다. 정답 ⑤가 아니라 오답이다.
  await radio(page, 3).click();
  await page.locator('#lab-response').fill('이 선지가 가장 그럴듯해서 골랐어.');
  await page.screenshot({ path: `${shots}-after-1.png`, animations: 'disabled' });
  await page.getByLabel('정답만 입력', { exact: true }).check();
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(chat).toContainText('정답이 아니야.');
  await page.getByLabel('근거 미제출', { exact: true }).check();
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.locator('.lab-answer-reveal')).toContainText('정답 5번');
  await expect(chat).toContainText('선지를 누르면 출제자가 어떤 전략으로 정답 선지에 함정을 만들었는지 검토할 수 있어.');
  await expect(page.locator('.lab-choice-hint')).toHaveText('틀린 내용을 담은 선지를 누르면 그 선지의 전략을 볼 수 있어');
  // 끝난 뒤에는 정답 ⑤만 누를 수 있다.
  for (const n of [1, 2, 3, 4]) { await expect(radio(page, n)).toHaveAttribute('aria-disabled', 'true'); await expect(radio(page, n)).toHaveAttribute('data-dim', 'true'); }
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'false');
  await expect(composer.getByRole('button', { name: /번 선택/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /학습 맵으로 돌아가기/ })).toHaveCount(0);
  const main = composer.locator('.lab-primary-actions button').last();
  await expect(main).toHaveText('다음');
  await expect(main).toBeDisabled();
  await expect(composer.getByRole('button', { name: '전략 보기' })).toHaveCount(0);
  await expect(composer.locator('.lab-primary-actions button')).toHaveText(['다시 풀기', '다음']);
  await expect(composer.getByRole('button', { name: '다시 풀기', exact: true })).toBeVisible();
  await expect(page.locator('.source-pane .lab-highlight')).toHaveCount(0);
  const boxes = [(await main.boundingBox())!];
  await page.screenshot({ path: `${shots}-after-2.png`, animations: 'disabled' });
  await page.screenshot({ path: '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-28-strategy-entry-before-choice.png', animations: 'disabled' });
  await radio(page, 5).click();
  await expect(chat.locator('small', { hasText: '출제자 전략 · ⑤' })).toHaveCount(1);
  await expect(main).toHaveText('다음');
  await expect(main).toBeEnabled();
  // 첫 문단의 인용은 모두 <보기>에 있으므로 지문에는 칠한 곳이 없다.
  await expect(page.locator('.source-pane .lab-highlight')).toHaveCount(0);
  await expect(page.locator('.lab-choice-hint')).toHaveText('');
  await expect(radio(page, 5)).toHaveAttribute('data-selected', 'true');
  await expect(radio(page, 5)).toContainText('전략 보는 중');
  await expect(page.locator('.lab-composer-notice')).toContainText('⑤ 전략');
  boxes.push((await main.boundingBox())!);
  await page.screenshot({ path: `${shots}-after-3.png`, animations: 'disabled' });
  // 셋째 문단 말풍선: 지문에 한 번 나오는 인용이 지문 칸에서 칠해진다.
  await main.click(); await main.click();
  await expect(chat).toContainText('눈이 머물면');
  const marked = page.locator('.source-pane .lab-highlight');
  await expect(marked).toHaveCount(1);
  expect((await marked.innerText()).replace(/\s+/g, ' ')).toBe('실명 확인 조치를 하지 않은 인터넷 언론사를 제재하는 법률 규정');
  expect(await chat.innerText()).toContain((await marked.innerText()).replace(/\s+/g, ' '));
  await page.screenshot({ path: '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-28-strategy-highlight.png', animations: 'disabled' });
  // 인용이 없는 마지막 문단에서는 칠한 곳이 지워진다.
  await main.click();
  await expect(chat).toContainText('⑤번 전략은 여기까지야.');
  await expect(marked).toHaveCount(0);
  await expect(chat).not.toContainText('다른 선지의 함정도 볼 수 있어.');
  await expect(main).toHaveText('다음');
  await expect(main).toBeDisabled();
  await expect(page.locator('.lab-choice-hint')).toHaveText('본 선지도 다시 누를 수 있어');
  await expect(radio(page, 5)).toContainText('봤음');
  await expect(radio(page, 5)).toHaveAttribute('aria-disabled', 'false');
  boxes.push((await main.boundingBox())!);
  for (const box of boxes) expect(box).toEqual(boxes[0]);
  await page.screenshot({ path: `${shots}-after-4.png`, animations: 'disabled' });
  // 끝 말풍선 뒤에도 ⑤를 다시 누르면 처음 문단부터 다시 보인다.
  await radio(page, 5).click();
  await expect(main).toHaveText('다음');
  await expect(chat.locator('small', { hasText: '출제자 전략 · ⑤' })).not.toHaveCount(1);
  await page.reload();
  await expect(chat).toContainText('선지를 누르면 출제자가 어떤 전략으로 정답 선지에 함정을 만들었는지 검토할 수 있어.');
  await expect(main).toHaveText('다음');
  await expect(main).toBeDisabled();
  await expect(chat.locator('small', { hasText: '출제자 전략' })).toHaveCount(0);
});

// 말풍선 운영 규칙: 마무리 말풍선이 남고, 순차 말풍선 간격은 앞 말풍선 길이에 비례하며 동작 줄이기에서도 유지된다.
const GATE_KEYS = ['다 살펴봤어', '근거만으로는', '정답은 ⑤번이야.', '하나씩 같이 볼까?'];
const doneLines = ['다 살펴봤어.', '생각이 끝났어.', '정리가 끝났어.'];
async function watchBubbles(page: Page) {
  await page.evaluate(() => {
    const seen: Record<string, number> = {};
    (window as unknown as { __seen: Record<string, number> }).__seen = seen;
    const scan = () => document.querySelectorAll('.chat-message.tutor').forEach(el => {
      const text = el.textContent ?? '';
      for (const key of ['다 살펴봤어', '생각이 끝났어', '정리가 끝났어', '근거만으로는', '정답은 ⑤번이야.', '하나씩 같이 볼까?']) if (text.includes(key) && !(key in seen)) seen[key] = performance.now();
    });
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}
async function bubbleGaps(page: Page) {
  const seen = await page.evaluate(() => (window as unknown as { __seen: Record<string, number> }).__seen);
  const done = Math.min(...doneLines.map(l => seen[l.replace('.', '')] ?? Infinity));
  const at = [done, seen['근거만으로는']!, seen['정답은 ⑤번이야.']!, seen['하나씩 같이 볼까?']!];
  return at.slice(1).map((t, i) => t - at[i]!);
}
for (const reduced of [false, true]) {
  test(`gate bubbles are at least 1200ms apart ${reduced ? 'under reduced motion (no dots)' : 'with dots'}`, async ({ page }) => {
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page); await watchBubbles(page);
    await select(page, 1, '페이싱 모호한 근거야.');
    await expect(page.getByLabel('대화 기록')).toContainText('하나씩 같이 볼까?', { timeout: 15000 });
    const gaps = await bubbleGaps(page);
    console.log(`MEASURE ${reduced ? 'reduced' : 'normal'} done→note→answer→ask`, JSON.stringify(gaps.map(Math.round)));
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(1150);
    // 점 말풍선은 동작 줄이기에서만 없다.
    if (reduced) await expect(page.locator('.lab-sequence-waiting')).toHaveCount(0);
  });
}
test('the thinking bubble gives way to a closing bubble that stays, also after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  await select(page, 1, '페이싱 오류 관계가 반대야.');
  await expect(page.locator('.lab-waiting')).toContainText(/.+/);
  const waitingText = await page.locator('.lab-waiting p').first().textContent();
  expect(['네 근거를 읽고 있어', '네가 쓴 이유를 차근차근 읽고 있어', '네 생각을 따라가 보고 있어'].some(t => waitingText!.startsWith(t))).toBe(true);
  const done = page.locator('.chat-message.lab-wait-done');
  await expect(done).toHaveCount(1, { timeout: 15000 });
  expect(doneLines).toContain(await done.locator('p').textContent());
  await expect(page.locator('.lab-waiting')).toHaveCount(0);
  await expect(page.getByLabel('대화 기록')).toContainText('원문과 비교하면 어떻게 달라지나요?', { timeout: 10000 });
  await page.screenshot({ path: '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/handoffs/2026-10-28-bubble-pacing-problem.png' });
  const text = await done.locator('p').textContent();
  await page.reload();
  await expect(page.locator('.chat-message.lab-wait-done')).toHaveCount(1);
  await expect(page.locator('.chat-message.lab-wait-done p')).toHaveText(text!);
});
