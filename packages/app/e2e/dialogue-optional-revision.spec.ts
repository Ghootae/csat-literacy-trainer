import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { TwoStageDialogueEvaluator, selectiveStudentFeedback, type CentralStoryGateResult, type DialogueCallMetadata } from '@csat/pipeline';
import { createLearningServer } from '../src/server/index.js';

let server: Server;
let logDirectory: string;
let gateCalls = 0;
let feedbackCalls = 0;
let failGate = false;
let failFeedback = false;
const apiPort = Number(process.env['CSAT_API_PORT'] ?? 5274);
const metadata: DialogueCallMetadata = { provider: 'mock', model: 'mock', effort: 'none', promptVersion: 'central-story-gate-prompt-v4', schemaVersion: 'central-story-gate-openai-v6', goldVersion: 'test', goldHash: 'test', calledAt: '2026-09-19T00:00:00.000Z', durationMs: 1 };

test.beforeAll(async () => {
  logDirectory = mkdtempSync(resolve(tmpdir(), 'dialogue-v4-browser-'));
  const evaluator = new TwoStageDialogueEvaluator({
    gateEvaluator: { async evaluate(input) {
      gateCalls++;
      if (failGate) { failGate = false; throw new Error('테스트용 일시 오류'); }
      const answer = input.history.at(-1)?.answer ?? input.initialResponse;
      const status = answer.startsWith('충분') ? 'PASS' : answer.startsWith('오류') ? 'ERROR' : answer.startsWith('주제') ? 'UNCLEAR_SERIOUS' : 'UNCLEAR_OK';
      const state = status === 'PASS' ? 'captured' : status === 'ERROR' ? 'distorted' : status === 'UNCLEAR_SERIOUS' ? 'unknown' : 'partial';
      const result: CentralStoryGateResult = {
        status: status === 'PASS' ? 'CAPTURED' : status === 'ERROR' ? 'DISTORTED' : 'UNCLEAR',
        responseInformationLevel: state === 'unknown' ? 'TOPIC_ONLY' : 'RELATIONAL',
        effectiveResponse: answer, centralObjectRepresentation: null, centralStoryRepresentation: null, expressedClaims: [],
        axisStates: input.gold.centralAxes.map((axis) => ({ axisId: axis.id, state, evidence: state === 'unknown' ? [] : [{ source: input.history.length ? 'diagnostic' : 'initial', evidence: answer }], retractionEvidence: [] })),
        axisFeedback: input.gold.centralAxes.map((axis) => ({ axisId: axis.id, status, revealedText: status === 'PASS' ? '확인된 중심축 전체 내용' : status === 'UNCLEAR_OK' ? '응답에서 확인된 부분만 공개' : null, reason: '테스트 판정' })),
        missingAxisEvidence: state === 'partial' || state === 'unknown' ? input.gold.centralAxes.map((axis) => ({ axisId: axis.id, axisQuote: axis.description })) : [],
        targetAxisId: status === 'PASS' ? null : input.gold.centralAxes[0]!.id,
        questionIntent: status === 'PASS' ? null : '미확인 의미를 확인', decisionSummary: '테스트 판정',
      };
      return { result, call: metadata };
    } },
    feedbackEvaluator: { async evaluate(input) {
      feedbackCalls++;
      if (failFeedback) { failFeedback = false; throw new Error('질문 생성 일시 오류'); }
      return {
        result: { route: input.route, targetAxisId: input.gateDecision.targetAxisId!, selectedRelationId: input.selectedDetailedRelation?.id ?? null, targetDescription: '미확인 의미', studentFeedback: selectiveStudentFeedback(input.route), nextQuestion: { type: input.route === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC', text: '두 내용이 어떻게 이어지는지 설명해 볼까요?' } },
        call: { ...metadata, promptVersion: 'dialogue-selective-feedback-prompt-v4' },
      };
    } },
  });
  server = createLearningServer({ port: apiPort, dialogueEvaluator: evaluator, dialogueLogDirectory: logDirectory, warmer: () => Promise.resolve() });
  await new Promise<void>((resolveReady) => server.listen(apiPort, '127.0.0.1', resolveReady));
});

test.afterAll(async () => {
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  rmSync(logDirectory, { recursive: true, force: true });
});

test.beforeEach(() => { gateCalls = 0; feedbackCalls = 0; failGate = false; failFeedback = false; });

test('축 공개·선택적 보완·오류 건너뛰기부터 연결 문항까지', async ({ page }) => {
  await page.goto('/dialogue');
  await page.locator('.dialogue-passage-card').filter({ hasText: '도파민' }).getByRole('button', { name: '학습 시작' }).click();
  await expect(page.locator('.dialogue-axis-box').first()).toContainText('응답 전');
  await page.locator('#dialogue-response').fill('관계 일부를 설명했어요');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByRole('button', { name: '더 보완하기' })).toBeVisible();
  await expect(page.locator('#dialogue-response')).toHaveCount(0);
  await expect(page.locator('.axis-unclear_ok').first()).toContainText('응답에서 확인된 부분만 공개');
  await expect(page.getByRole('region', { name: '누적 응답' })).toContainText('관계 일부를 설명했어요');
  expect(feedbackCalls).toBe(0);
  await page.getByRole('button', { name: '더 보완하기' }).click();
  await expect(page.locator('.dialogue-question')).toHaveCount(1);
  expect(gateCalls).toBe(1);
  expect(feedbackCalls).toBe(1);
  await page.locator('#dialogue-response').fill('충분하게 보완했어요');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.axis-pass').first()).toContainText('확인된 중심축 전체 내용');
  await page.getByRole('button', { name: '다음 문단', exact: true }).click();
  await page.locator('#dialogue-response').fill('주제만 언급');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.axis-unclear_serious').first()).toContainText('아직 공개되지 않은');
  await expect(page.locator('.dialogue-question')).toHaveCount(1);
  await page.getByRole('button', { name: '다음 문단', exact: true }).click();
  await page.locator('#dialogue-response').fill('오류가 있는 내 설명');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.locator('.axis-error').first()).toContainText('원문과 다시 비교해요');
  await page.screenshot({ path: resolve(tmpdir(), 'dialogue-v4-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '다음 문단', exact: true }).click();
  await page.getByRole('button', { name: '문단 학습 마치기' }).click();
  await expect(page.getByRole('button', { name: '13번 문제 풀기' })).toBeVisible();
  const records = readFileSync(resolve(logDirectory, 'sessions.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  expect(records.map((record) => record.finalStatus)).toEqual(['PASS', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
  expect(records[2].finalSnapshot.axisFeedback[0].status).toBe('ERROR');
  expect(records[2].initialResponse).toBe('오류가 있는 내 설명');
  expect(records[0].turns[0].questionCall.promptVersion).toBe('dialogue-selective-feedback-prompt-v4');
  await page.getByRole('button', { name: '13번 문제 풀기' }).click();
  await expect(page).toHaveURL(/\/problem\?sessionId=/);
});

test('모바일·재접속 표시와 실패 후 초안·보완 재시도', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dialogue');
  await page.locator('.dialogue-passage-card').filter({ hasText: '도파민' }).getByRole('button', { name: '학습 시작' }).click();
  failGate = true;
  await page.locator('#dialogue-response').fill('짧은 원래 응답');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('테스트용 일시 오류');
  await expect(page.locator('#dialogue-response')).toHaveValue('짧은 원래 응답');
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByRole('button', { name: '더 보완하기' })).toBeVisible();
  await page.reload();
  await page.locator('.current-understanding > summary').click();
  await expect(page.getByRole('region', { name: '누적 응답' })).toContainText('짧은 원래 응답');
  await page.locator('.current-understanding > summary').click();
  failFeedback = true;
  await page.getByRole('button', { name: '더 보완하기' }).click();
  await expect(page.getByRole('alert')).toContainText('질문 생성 일시 오류');
  await expect(page.getByRole('button', { name: '더 보완하기' })).toBeEnabled();
  await page.getByRole('button', { name: '더 보완하기' }).click();
  await expect(page.locator('.dialogue-question')).toHaveCount(1);
  expect(gateCalls).toBe(2);
  await page.screenshot({ path: resolve(tmpdir(), 'dialogue-v4-mobile.png'), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
