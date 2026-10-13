import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { TwoStageDialogueEvaluator, selectiveStudentFeedback, locateSourceGuide,
  type CentralStoryGateResult, type DialogueCallMetadata } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';

let server: Server;
let logs: string;
let fail = false;
const port = Number(process.env['CSAT_API_PORT'] ?? 5274);
const metadata: DialogueCallMetadata = { provider: 'mock', model: 'mock', effort: 'none', promptVersion: 'central-story-gate-prompt-v4', schemaVersion: 'test', goldVersion: 'test', goldHash: 'test', calledAt: '2026-09-20T00:00:00Z', durationMs: 5 };
test.beforeAll(async () => {
  logs = mkdtempSync(resolve(tmpdir(), 'workbench-browser-'));
  writeFileSync(resolve(logs, 'student-evidence.jsonl'), `${JSON.stringify({
    schemaVersion: 'student-evidence-v1', eventId: 'browser-state-1', studentId: 'local', learningSessionId: 'browser-learning', context: 'STUDENT',
    observedAt: '2026-10-01T00:00:00.000Z', dimension: 'CORE_COMPREHENSION', judgment: 'POSITIVE', assistance: 'INDEPENDENT',
    source: { kind: 'PARAGRAPH', passageId: 'browser-passage', contentId: 'browser-p1', evidenceKey: 'axis:AX1', evaluatorVersion: 'browser-v1' },
    observation: { kind: 'PARAGRAPH_INITIAL_AXIS', axisId: 'AX1', initialState: 'captured' },
  })}\n`);
  const evaluator = new TwoStageDialogueEvaluator({ gateEvaluator: { async evaluate(input) {
    if (fail) { fail = false; throw new Error('모의 일시 오류'); }
    const answer = input.history.at(-1)?.answer ?? input.initialResponse;
    const status = answer.startsWith('충분') ? 'PASS' : answer.startsWith('오류') ? 'ERROR' : answer.startsWith('선택') ? 'UNCLEAR_OK' : 'UNCLEAR_SERIOUS';
    const state = status === 'PASS' ? 'captured' : status === 'ERROR' ? 'distorted' : status === 'UNCLEAR_OK' ? 'partial' : 'unknown';
    const result: CentralStoryGateResult = {
      status: status === 'PASS' ? 'CAPTURED' : status === 'ERROR' ? 'DISTORTED' : 'UNCLEAR', responseInformationLevel: 'RELATIONAL',
      effectiveResponse: answer, centralObjectRepresentation: null, centralStoryRepresentation: null, expressedClaims: [],
      axisStates: input.gold.centralAxes.map((a) => ({ axisId: a.id, state, evidence: [], retractionEvidence: [] })),
      axisFeedback: input.gold.centralAxes.map((a) => ({ axisId: a.id, status, revealedText: status === 'PASS' ? '확인된 중심축 내용' : status === 'UNCLEAR_OK' ? answer : null, reason: '모의 판정' })),
      missingAxisEvidence: [], targetAxisId: status === 'PASS' ? null : input.gold.centralAxes[0]!.id,
      questionIntent: status === 'PASS' ? null : '현재 질문 대상', decisionSummary: `현재 응답의 모의 판정: ${answer}`,
    };
    return { result, call: { ...metadata, decisionAudit: { rawResult: result, validatedResult: result, normalizationEvents: [] } } };
  } }, feedbackEvaluator: { async evaluate(input) {
    const quote = input.dialogue.gold.paragraphText.split('. ')[0]!;
    return { result: { route: input.route, targetAxisId: input.gateDecision.targetAxisId!, selectedRelationId: input.selectedDetailedRelation?.id ?? null,
      targetDescription: '원문에서 현재 관계 확인', studentFeedback: selectiveStudentFeedback(input.route),
      nextQuestion: { type: input.route === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC', text: '표시한 부분에서 두 내용은 어떻게 이어지나요?' },
      sourceGuide: locateSourceGuide({ quote, occurrence: 0 }, input) }, call: { ...metadata, promptVersion: 'dialogue-selective-feedback-prompt-v4-guide-v1' } };
  } } });
  server = createLearningServer({ port, developerMode: true, dialogueEvaluator: evaluator, dialogueLogDirectory: logs,
    studentEvidencePath: resolve(logs, 'student-evidence.jsonl'), studentFeedbackEnabled: true, warmer: () => Promise.resolve() });
  await new Promise<void>((ready) => server.listen(port, '127.0.0.1', ready));
});
test.afterAll(async () => { if (server) await new Promise<void>((done) => server.close(() => done())); if (logs) rmSync(logs, { recursive: true, force: true }); });

test('개발자 3단·맵 이동·초안·턴 검사·새 테스트·연결 문항 왕복', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dialogue/dev');
  await page.getByRole('button', { name: '상태 리포트', exact: true }).click();
  const stateDialog = page.getByRole('dialog', { name: '학생 상태 리포트' });
  await expect(stateDialog).toContainText('현재 피드백은 판단 가능한 수행 증거 1건');
  await expect(stateDialog.locator('.student-state-grid article').filter({ hasText: '독립 핵심 이해' })).toContainText('긍정1');
  await expect(stateDialog.locator('.student-state-grid article').filter({ hasText: '독립 핵심 이해' })).toContainText('판단 콘텐츠1');
  await stateDialog.getByRole('button', { name: '개발자 캘리브레이션' }).click();
  await expect(stateDialog).toContainText('아직 설명할 수 있는 학습 증거가 부족합니다.');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '학습 맵', exact: true }).click();
  const mrna = page.locator('.map-passage').filter({ hasText: 'mRNA 백신' });
  await mrna.getByRole('button', { name: '문단 2 미시작' }).click();
  const originalUrl = page.url();
  await expect(page.locator('.workbench-pane:visible')).toHaveCount(3);
  await expect(page.getByRole('complementary', { name: '개발자 검사' })).toContainText('AX1');
  await expect(page.locator('.inspect-pane .current-understanding')).toBeVisible();
  await expect(page.locator('.chat-pane .current-understanding')).toHaveCount(0);
  await page.locator('#dialogue-response').fill('mRNA 백신 작동 방식에 관한 문단이다.');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.source-pane mark')).toHaveCount(1);
  await page.locator('#dialogue-response').fill('작성 중인 보완 답변');
  await page.getByRole('button', { name: '학습 맵', exact: true }).click();
  await mrna.getByRole('button', { name: '문단 4 미시작' }).click();
  await expect(page.locator('.chat-message.student')).toHaveCount(0);
  await page.getByRole('button', { name: '학습 맵', exact: true }).click();
  await mrna.getByRole('button', { name: '문단 2 진행 중' }).click();
  await expect(page).toHaveURL(originalUrl);
  await expect(page.locator('#dialogue-response')).toHaveValue('작성 중인 보완 답변');
  await expect(page.locator('.chat-message.student')).toContainText('mRNA 백신 작동 방식');
  await page.reload();
  await expect(page.locator('#dialogue-response')).toHaveValue('작성 중인 보완 답변');
  await expect(page.locator('.source-pane mark')).toHaveCount(1);
  await page.screenshot({ path: resolve(tmpdir(), 'csat-workbench-desktop.png'), fullPage: true });
  await page.locator('#dialogue-response').fill('충분하게 보완한 답변');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.source-pane mark')).toHaveCount(0);
  await expect(page.locator('.chat-message.student')).toHaveCount(2);
  await page.getByRole('button', { name: '1차 평가 보기' }).click();
  await expect(page.locator('.evaluation-summary')).toContainText('mRNA 백신 작동 방식');
  const student = await page.request.get(`/api/dialogue/session/${new URL(page.url()).searchParams.get('sessionId')}`);
  const studentJson = await student.text();
  expect(studentJson).not.toMatch(/centralAxes|rawResult|decisionSummary|goldHash/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '새 테스트', exact: true }).click();
  await expect(page).not.toHaveURL(originalUrl);
  await expect(page.locator('.chat-message.student')).toHaveCount(0);
  await page.getByRole('button', { name: '학습 맵', exact: true }).click();
  await mrna.getByRole('combobox').selectOption(new URL(originalUrl).searchParams.get('sessionId')!);
  await mrna.getByRole('button', { name: '문단 2 확인 완료' }).click();
  await expect(page.locator('.chat-message.student')).toHaveCount(2);
  await page.getByRole('button', { name: '학습 맵', exact: true }).click();
  await mrna.getByRole('link', { name: '19번 문제' }).click();
  await expect(page).toHaveURL(/\/problem\/dev\/v4\?/);
  await page.getByRole('link', { name: '학습 맵', exact: true }).click();
  await expect(page.locator('.chat-message.student')).toHaveCount(2);
});

test('개발자 선택적 보완은 입력창 크기를 유지하고 피드백·질문·후속 응답을 누적한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dialogue/dev');
  await page.locator('.dialogue-passage-card').filter({ hasText: '공손룡' }).getByRole('button', { name: '학습 시작' }).click();
  await page.locator('#dialogue-response').fill('선택적으로 확인된 중심 의미');
  await page.getByRole('button', { name: '제출', exact: true }).click();

  const input = page.locator('#dialogue-response');
  const chat = page.getByLabel('대화 기록');
  await expect(input).toBeVisible();
  await expect(input).toBeDisabled();
  await expect(chat.getByText('1차 응답', { exact: true })).toBeVisible();
  await expect(chat.getByText(/1차 피드백/)).toBeVisible();
  const feedback = await page.locator('.chat-message.tutor').first().textContent();
  const before = await input.boundingBox();

  await page.getByRole('button', { name: '보완하기', exact: true }).click();
  await expect(input).toBeEnabled();
  await expect(chat.getByText('1차 확인 질문', { exact: true })).toBeVisible();
  await expect(page.locator('.chat-message.tutor').first()).toContainText(feedback ?? '');
  const after = await input.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);

  await input.fill('충분하게 관계를 보완한 답변');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(chat.getByText('2차 응답', { exact: true })).toBeVisible();
  await expect(chat.getByText(/2차 피드백/)).toBeVisible();
  await expect(chat.getByText('1차 응답', { exact: true })).toBeVisible();
  await expect(chat.getByText('1차 확인 질문', { exact: true })).toBeVisible();
});

test('학생 2단과 진행 서랍·모바일 전환·실패 후 초안 유지', async ({ page }) => {
  await page.goto('/dialogue');
  await expect(page.getByRole('link', { name: '학습 돌아보기' })).toHaveAttribute('href', '/progress');
  await page.locator('.dialogue-passage-card').filter({ hasText: '도파민' }).getByRole('button', { name: '학습 시작' }).click();
  await expect(page.locator('.workbench-pane:visible')).toHaveCount(2);
  await expect(page.getByRole('complementary', { name: '개발자 검사' })).toHaveCount(0);
  await expect(page.locator('.chat-pane .current-understanding')).toBeVisible();
  fail = true;
  await page.locator('#dialogue-response').fill('주제만 설명한 응답');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('모의 일시 오류');
  await expect(page.locator('#dialogue-response')).toHaveValue('주제만 설명한 응답');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.source-pane mark')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.chat-pane')).toBeVisible();
  await expect(page.locator('.source-pane')).not.toBeVisible();
  await page.getByRole('button', { name: '원문', exact: true }).click();
  await expect(page.locator('.source-pane mark')).toBeVisible();
  await page.screenshot({ path: resolve(tmpdir(), 'csat-workbench-mobile-source.png'), fullPage: true });
  await page.getByRole('button', { name: '대화', exact: true }).click();
  await page.screenshot({ path: resolve(tmpdir(), 'csat-workbench-mobile-chat.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: '다음 문단', exact: true }).click();
  await page.getByRole('button', { name: '학습 진행', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '학습 진행' })).toContainText('넘어감');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('학생 정기 피드백은 학습 맥락의 집계와 불확실성만 보여준다', async ({ page }) => {
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: '나의 읽기 학습 돌아보기' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /현재 피드백은 판단 가능한 수행 증거 1건/ })).toBeVisible();
  const comprehension = page.locator('.student-feedback-grid article').filter({ hasText: '핵심 관계 이해' });
  await expect(comprehension).toContainText('확인된 수행1');
  await expect(comprehension).toContainText('아직 자료가 적어요');
  await expect(comprehension).toContainText('상태 판단 가능 1개');
  await expect(page.getByText('개발자 캘리브레이션')).toHaveCount(0);
  await expect(page.getByText('도움 분포')).toHaveCount(0);

  await page.getByLabel('관측 기간').selectOption('7');
  await expect(comprehension).toContainText('확인된 수행1');
});

test('학생이 지문을 완료하면 문제를 열지 않아도 상태 리포트가 갱신된다', async ({ page }) => {
  const beforeResponse = await page.request.get('/api/student-state?days=30');
  const before = await beforeResponse.json() as { profile: { dimensions: Array<{ dimension: string; positive: number }> } };
  const beforePositive = before.profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.positive ?? 0;

  await page.goto('/dialogue');
  await page.locator('.dialogue-passage-card').filter({ hasText: '도파민' }).getByRole('button', { name: '학습 시작' }).click();
  const progressText = await page.locator('.workbench-actions span').textContent();
  const paragraphCount = Number(progressText?.match(/\/\s*(\d+)/u)?.[1]);
  expect(paragraphCount).toBeGreaterThan(0);
  for (let paragraph = 1; paragraph <= paragraphCount; paragraph += 1) {
    await page.locator('#dialogue-response').fill(`충분하게 이해한 ${paragraph}문단 응답`);
    await page.getByRole('button', { name: '제출', exact: true }).click();
    if (paragraph < paragraphCount) await page.getByRole('button', { name: '다음 문단', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '13번 문제 풀기' })).toBeVisible();

  const afterResponse = await page.request.get('/api/student-state?days=30');
  const after = await afterResponse.json() as { profile: { dimensions: Array<{ dimension: string; positive: number }> } };
  const afterPositive = after.profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.positive ?? 0;
  expect(afterPositive).toBeGreaterThan(beforePositive);

  await page.goto('/progress');
  await expect(page.locator('.student-feedback-grid article').filter({ hasText: '핵심 관계 이해' }))
    .toContainText(`확인된 수행${afterPositive}`);
});

test('개발자 API는 명시적으로 활성화하지 않으면 지도·골드를 반환하지 않는다', async ({ request }) => {
  const disabled = createLearningServer({ developerMode: false, warmer: () => Promise.resolve(), dialogueLogDirectory: logs });
  await new Promise<void>((ready) => disabled.listen(0, '127.0.0.1', ready));
  try {
    const address = disabled.address() as { port: number };
    for (const path of ['map', 'inspect?sessionId=any', 'student-state']) {
      const res = await request.get(`http://127.0.0.1:${address.port}/api/developer/${path}`);
      expect(res.status()).toBe(403);
      expect(await res.text()).not.toContain('centralAxes');
    }
    const studentFeedback = await request.get(`http://127.0.0.1:${address.port}/api/student-state`);
    expect(studentFeedback.status()).toBe(404);
    expect(await studentFeedback.json()).toEqual({ error: '학생용 정기 피드백이 아직 활성화되지 않았습니다.' });
    const capabilities = await request.get(`http://127.0.0.1:${address.port}/api/capabilities`);
    expect(await capabilities.json()).toEqual({ studentFeedbackEnabled: false });
  } finally { await new Promise<void>((done) => disabled.close(() => done())); }
});

test('학생 피드백 활성화는 기본적으로 공개 Host에 노출되지 않는다', async ({ request }) => {
  const localOnly = createLearningServer({
    developerMode: true,
    studentFeedbackEnabled: true,
    studentEvidencePath: resolve(logs, 'student-evidence.jsonl'),
    warmer: () => Promise.resolve(),
  });
  await new Promise<void>((ready) => localOnly.listen(0, '127.0.0.1', ready));
  try {
    const address = localOnly.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    expect(await (await request.get(`${base}/api/capabilities`)).json()).toEqual({ studentFeedbackEnabled: true });

    const publicCapabilities = await request.get(`${base}/api/capabilities`, { headers: { host: 'dialogue.cogaxis.net' } });
    expect(await publicCapabilities.json()).toEqual({ studentFeedbackEnabled: false });
    const publicReport = await request.get(`${base}/api/student-state`, { headers: { host: 'dialogue.cogaxis.net' } });
    expect(publicReport.status()).toBe(404);
    const publicDeveloperStudentReport = await request.get(`${base}/api/developer/student-state?context=student`, { headers: { host: 'dialogue.cogaxis.net' } });
    expect(publicDeveloperStudentReport.status()).toBe(404);
    const publicDeveloperCalibration = await request.get(`${base}/api/developer/student-state?context=developer`, { headers: { host: 'dialogue.cogaxis.net' } });
    expect(publicDeveloperCalibration.status()).toBe(200);
  } finally { await new Promise<void>((done) => localOnly.close(() => done())); }
});
