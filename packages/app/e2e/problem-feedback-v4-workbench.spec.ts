import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import type { FeedbackEvaluator } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';

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
  server = createLearningServer({ developerMode: true, problemFeedbackV4Evaluator: evaluator, problemFeedbackV4Save() {}, warmer: () => Promise.resolve() });
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
  await page.goto(`/problem/dev/v4?questionId=${questionId}&returnTo=%2Fdialogue%2Fdev`);
  await expect(page.getByRole('heading', { name: /정보 비대칭/ })).toBeVisible();
}
async function select(page: Page, number: number, text: string) {
  await page.getByRole('button', { name: `${number}번 선택`, exact: true }).click();
  await page.locator('#v4-response').fill(text);
  await page.getByRole('button', { name: '선택·근거 전송' }).click();
}

test('three panes, persistent draft, multiple corrections, reselection and verified finish', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  await expect(page.locator('.workbench-pane:visible')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '선택·근거 전송' })).toBeDisabled();
  await page.getByRole('button', { name: '1번 선택', exact: true }).click();
  await page.locator('#v4-response').fill('두 가지 관계를 잘못 이해했습니다.');
  await page.reload();
  await expect(page.locator('#v4-response')).toHaveValue('두 가지 관계를 잘못 이해했습니다.');
  await expect(page.getByRole('button', { name: '1번 선택', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '선택·근거 전송' }).click();
  await expect(page.getByRole('button', { name: '1번 선택', exact: true })).toBeDisabled();
  await expect(page.getByLabel('대화 기록')).toContainText('1번째 관계를 원문과 비교');
  await page.locator('#v4-response').fill('첫 번째 관계를 수정했습니다.');
  await page.getByRole('button', { name: '답변 전송' }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('2번째 관계를 원문과 비교');
  await expect(page.getByRole('button', { name: '5번 선택', exact: true })).toBeDisabled();
  await page.locator('#v4-response').fill('두 번째 관계도 수정했습니다.');
  await page.getByRole('button', { name: '답변 전송' }).click();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await expect(page.getByRole('button', { name: '5번 선택', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('수정 확인');
  await expect(page.getByRole('dialog')).toContainText('거짓인 선지');
  await page.screenshot({ path: '/private/tmp/problem-v4-evaluation.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '응답 평가', exact: true })).toBeFocused();
  await select(page, 5, '원문의 관계에 따라 이 선지가 옳지 않습니다.');
  await expect(page.locator('.v4-terminal')).toBeVisible();
  await expect(page.locator('#v4-response')).toBeDisabled();
  await expect(page.locator('.chat-message.student')).toHaveCount(4);
  await expect(page.locator('.v4-answer-reveal')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.chat-message.student')).toHaveCount(4);
  await page.screenshot({ path: '/private/tmp/problem-v4-workbench-desktop.png' });
  await page.getByRole('button', { name: '응답 평가', exact: true }).click();
  await expect(page.getByRole('region', { name: '최종 평가' })).toContainText('근거 검증');
});

test('explicit omission → wrong → omitted rationale → coaching, answer reveal and no reselection', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: '1번 선택', exact: true }).click();
  await page.getByLabel('정답만 입력', { exact: true }).check();
  await expect(page.locator('#v4-response')).toBeDisabled();
  await page.getByRole('button', { name: '선택·근거 전송' }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('정답이 아니야.');
  await page.getByLabel('근거 미제출', { exact: true }).check();
  await page.getByRole('button', { name: '근거 전송', exact: true }).click();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.locator('.v4-answer-reveal')).toContainText('정답 5번');
  await expect(page.getByRole('button', { name: '5번 선택', exact: true })).toBeDisabled();
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
  await expect(page.locator('.v4-terminal')).toHaveCount(0);
  await expect(page.locator('.v4-answer-reveal')).toHaveCount(0);
  await page.screenshot({ path: '/private/tmp/problem-v4-workbench-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await page.locator('#v4-response').fill('모르겠어요'); await page.getByRole('button', { name: '답변 전송' }).click();
  await page.getByRole('button', { name: '아니', exact: true }).click();
  await expect(page.locator('.v4-answer-reveal')).toBeVisible();
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '새 테스트', exact: true }).click();
  await expect(page.getByRole('button', { name: '1번 선택', exact: true })).toBeEnabled();
  await select(page, 1, '자료 경계 확인');
  await expect(page.locator('.v4-composer')).toContainText('자료 검토가 필요한 문항');
  await expect(page.locator('.v4-answer-reveal')).toHaveCount(0);
});

test('lost POST response recovers authoritative transcript without duplicate submission', async ({ page }) => {
  await open(page);
  let intercepted = false;
  await page.route('**/api/developer/problem-feedback-v4/session/*', async route => {
    if (route.request().method() === 'POST' && !intercepted) { intercepted = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await select(page, 5, '관계가 명확한 근거입니다.');
  await expect(page.locator('.v4-terminal')).toBeVisible();
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  await expect(page.locator('.workbench-actions')).toContainText('선택 1 / 2');
});


test('composer keeps four rows and identical height through correction, post repair and reselection', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  const composer = page.locator('.v4-composer');
  const heights: number[] = [];
  async function measure() {
    await expect(composer.locator(':scope > *')).toHaveCount(4);
    heights.push((await composer.boundingBox())!.height);
  }
  await measure();
  await select(page, 1, '관계가 반대라고 생각합니다.');
  await expect(page.locator('.v4-highlight').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '지문에서 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '답변 전송', exact: true })).toBeVisible();
  await measure();
  await page.locator('#v4-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await expect(page.locator('.v4-highlight')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 선택', exact: true })).toBeVisible();
  await expect(page.locator('#v4-response')).toBeDisabled(); await measure();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await expect(page.getByRole('button', { name: '5번 선택', exact: true })).toBeEnabled(); await measure();
  await expect(page.getByRole('button', { name: '1번 선택', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '1번 선택', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#v4-response')).toHaveValue('');
  await expect(page.locator('.v4-composer-notice')).toHaveText('이번이 마지막 선택이야.');
  await expect(page.getByLabel('대화 기록')).not.toContainText('이번이 마지막 선택이야.');
  await expect(page.locator('.chat-message.student')).toHaveCount(2);
  expect(heights.every(height => height === heights[0])).toBe(true);
});


test('wrong reselection gates and reveals each section through understanding NO with a fixed composer', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 }); await open(page);
  const heights: number[] = [];
  async function measure() {
    const composer = page.locator('.v4-composer');
    await expect(composer.locator(':scope > *')).toHaveCount(4);
    heights.push((await composer.boundingBox())!.height);
  }
  await measure();
  await select(page, 1, '관계가 반대라고 생각해.');
  await page.locator('#v4-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await page.getByRole('button', { name: '다시 선택', exact: true }).click();
  await select(page, 3, '느린 설명: 다시 고른 답도 맞다고 생각해.');
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeDisabled(); await measure();
  await expect(page.getByLabel('대화 기록')).toContainText('정답은 ⑤번이야.');
  await expect(page.getByLabel('대화 기록')).toContainText('다시 고른 답도 정답이 아니야. 더 묻지 않고 정답을 먼저 알려 줄게.');
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.locator('.v4-waiting')).toContainText('설명을 정리하고 있어'); await measure();
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
  await expect(page.locator('.v4-terminal')).toHaveCount(0);
  await expect(page.locator('.v4-answer-reveal')).toContainText('정답 5번'); await measure();
  await expect(page.locator('.chat-message.student')).toHaveCount(3);
  expect(heights.every(height => height === heights[0])).toBe(true);
});

test('restored sections appear immediately; reduced motion keeps the next boundary without dots', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '모호한 근거야.');
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.locator('.v4-sequence-waiting')).toHaveCount(0);
  await expect(page.getByLabel('대화 기록')).not.toContainText('이해됐어?');
  await page.reload();
  await expect(page.getByLabel('대화 기록')).toContainText('이해됐어?');
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled();
  await expect(page.locator('.v4-sequence-waiting')).toHaveCount(0);
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByLabel('대화 기록')).toContainText('좋아, 이 문제는 여기까지야.');
  await expect(page.locator('.v4-terminal')).toHaveCount(0);
});


test('reduced motion retains both next boundaries in a fresh reselection sequence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '관계가 반대라고 생각해.');
  await page.locator('#v4-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
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
  await expect(page.locator('.v4-sequence-waiting')).toHaveCount(0);
});

test('mobile correction button opens the source tab and scrolls to the highlight', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  await select(page, 1, '관계를 반대로 이해했습니다.');
  const showSource = page.getByRole('button', { name: '지문에서 보기', exact: true });
  await expect(showSource).toBeVisible(); await showSource.click();
  await expect(page.getByRole('button', { name: '지문', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.source-pane .v4-highlight').first()).toBeInViewport();
  await page.getByRole('button', { name: '대화', exact: true }).click();
  await page.locator('#v4-response').fill('중복 게시가 여론을 왜곡할 수 있어.');
  await page.getByRole('button', { name: '답변 전송', exact: true }).click();
  await expect(page.locator('.v4-highlight')).toHaveCount(0);
  await expect(showSource).toHaveCount(0);
});


test('instant verdict precedes waiting; processing reload preserves pending and draft until completion', async ({ page }) => {
  await open(page);
  const height = await page.locator('.v4-composer').evaluate(e => e.getBoundingClientRect().height);
  await select(page, 1, '느린 판정 모호');
  await expect(page.getByLabel('대화 기록')).toContainText('정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.');
  await expect(page.locator('.v4-waiting')).toHaveCount(0);
  await expect(page.locator('.v4-waiting')).toContainText('네 근거를 읽고 있어');
  await page.reload();
  await expect(page.locator('#v4-response')).toHaveValue('느린 판정 모호');
  await expect(page.locator('.chat-message.student')).toHaveCount(1);
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith('csat.problem.v4.pending.')))).toBe(true);
  // The mock judgment takes 6 s; allow polling plus the gate reveal after it finishes.
  await expect(page.getByRole('button', { name: '응', exact: true })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('#v4-response')).toHaveValue('');
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith('csat.problem.v4.pending.')))).toBe(false);
  const coach = await page.locator('.chat-message.tutor').allTextContents();
  expect(coach.findIndex(t => t.includes('네가 쓴 근거만으로는'))).toBeLessThan(coach.findIndex(t => t.includes('정답은 ⑤번이야.')));
  await page.getByRole('button', { name: '응', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음으로 넘어가기', exact: true })).toBeEnabled();
  await expect(page.getByLabel('대화 기록')).toContainText('설명이 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자.');
  expect(await page.locator('.v4-composer').evaluate(e => e.getBoundingClientRect().height)).toBe(height);
});
