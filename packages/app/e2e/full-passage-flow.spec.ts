import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import type { EvaluatedResponse, GeneratedQuerySet, Gold, RegionSemanticVerdict } from '@csat/pipeline';
import { expect, test } from '@playwright/test';

import { createLearningServer } from '../src/server/index.js';

interface ParagraphFixture {
  readonly paragraphId: string;
  readonly title: string;
  readonly hypothesis: string;
  readonly firstResponse: string;
  readonly revisedResponse: string | null;
  readonly paragraphTitle: string;
  readonly requiresRevision: boolean;
}

interface FullPassageFixture {
  readonly passageId: string;
  readonly passageTitle: string;
  readonly wholePassageTitle: string;
  readonly paragraphs: readonly ParagraphFixture[];
}

const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'fixtures', 'photosynthesis-full-passage-flow.json'), 'utf8'),
) as FullPassageFixture;

let server: Server;
let sessionRoot: string;
const evaluationCalls: string[] = [];
const apiPort = Number(process.env['CSAT_API_PORT'] ?? 5174);

function fixedEvaluation(
  _gold: Gold,
  queries: GeneratedQuerySet,
  response: string,
): Promise<EvaluatedResponse> {
  evaluationCalls.push(response);
  const title = queries.regions.some((region) => region.regionId === 'title');
  const firstParagraph = fixture.paragraphs[0]!;
  const needsRevision = response === firstParagraph.firstResponse;
  const region = queries.regions[0]!;
  const verdict: RegionSemanticVerdict = needsRevision ? 'topic_only' : 'relation_preserved';

  return Promise.resolve({
    assessments: [{
      regionId: region.regionId,
      label: title ? '문단의 중심 관계' : region.label,
      verdict,
      feedback: needsRevision
        ? '화제는 짚었지만 환경 요인과 광합성 효율의 관계가 빠졌습니다.'
        : '핵심 관계를 담았습니다.',
      propositionEvidence: [],
      _debug: { argumentCoverage: 'none', expressionProfile: 'none' },
    }],
    said: new Map([[region.regionId, [response]]]),
    sentenceIds: new Map([[region.regionId, region.sourceSentenceIds]]),
    rawVerdicts: new Map(
      title
        ? [['qT3', {
            semanticState: 'preserved',
            expressionMode: 'explicit',
            evidence: response,
            viaItem: '1',
            evidenceRole: 'relation',
          }]]
        : [],
    ),
    regions: [],
    propositionEvaluation: { evaluator: 'query', latencyMs: 0, results: [] },
  } as EvaluatedResponse);
}

test.beforeAll(async () => {
  sessionRoot = mkdtempSync(resolve(tmpdir(), 'csat-full-passage-e2e-'));
  process.env['CSAT_SESSION_ROOT'] = sessionRoot;
  server = createLearningServer({
    port: apiPort,
    responseEvaluator: fixedEvaluation,
    warmer: () => Promise.resolve(),
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(apiPort, '127.0.0.1', resolveListen);
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error === undefined ? resolveClose() : reject(error));
  });
  delete process.env['CSAT_SESSION_ROOT'];
  rmSync(sessionRoot, { recursive: true, force: true });
});

test('photosynthesis p1~p6을 완주하고 지문 표제를 저장·복원한다', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/legacy');
  const earlyTitle = await page.request.post(
    `/api/passage-title/${fixture.passageId}/unfinished-passage`,
    { data: { text: fixture.wholePassageTitle } },
  );
  expect(earlyTitle.status()).toBe(409);
  await page.getByRole('button', { name: new RegExp(fixture.paragraphs[0]!.title) }).click();

  for (const [index, paragraph] of fixture.paragraphs.entries()) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(paragraph.title);
    await page.getByRole('textbox').fill(paragraph.hypothesis);
    await page.getByRole('button', { name: '적었어요 — 이제 자세히 읽기' }).click();

    await page.getByLabel('섹션 1').fill(paragraph.firstResponse);
    await page.getByRole('button', { name: '제출', exact: true }).click();

    if (paragraph.requiresRevision) {
      await expect(page.getByText('주제만', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('섹션 1')).toHaveValue(paragraph.firstResponse);
      await expect(page.getByText('주제만', { exact: true })).toBeVisible();
      await page.locator('.region').click();
      await page.getByLabel('섹션 1').fill(paragraph.revisedResponse!);
      await page.getByRole('button', { name: '다시 제출' }).click();
    }

    await expect(page.getByText('관계보존', { exact: true }).first()).toBeVisible();
    await page.getByPlaceholder('각 부분을 하나로 묶어 한 문장으로…').fill(paragraph.paragraphTitle);
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(page.getByText('이 문단을 끝냈습니다.')).toBeVisible();

    if (index < fixture.paragraphs.length - 1) {
      await page.getByRole('button', { name: /다음 문단/ }).click();
    }
  }

  await expect(page.getByRole('heading', { name: '지문 전체를 한 문장으로' })).toBeVisible();
  await page.getByLabel('지문 표제').fill(fixture.wholePassageTitle);
  await page.getByRole('button', { name: '지문 표제 저장' }).click();
  await expect(page.getByText('이 지문을 끝냈습니다.')).toBeVisible();
  await expect(page.getByText(`내가 쓴 표제: “${fixture.wholePassageTitle}”`)).toBeVisible();

  for (const paragraph of fixture.paragraphs) {
    const sessionId = await page.evaluate(
      (paragraphId) => sessionStorage.getItem(`csat.session.${paragraphId}`),
      paragraph.paragraphId,
    );
    expect(sessionId).not.toBeNull();
    const stored = await page.request.get(`/api/session/${sessionId}`);
    const body = (await stored.json()) as { paragraphId: string; titleAttempts: readonly unknown[] };
    expect(body.paragraphId).toBe(paragraph.paragraphId);
    expect(body.titleAttempts).toHaveLength(2);
  }

  const passageSessionId = await page.evaluate(
    (passageId) => sessionStorage.getItem(`csat.passageSession.${passageId}`),
    fixture.passageId,
  );
  expect(passageSessionId).not.toBeNull();
  const progress = await page.request.get(`/api/passage-title/${fixture.passageId}/${passageSessionId}`);
  expect(await progress.json()).toEqual({
    text: fixture.wholePassageTitle,
    completedParagraphIds: fixture.paragraphs.map((paragraph) => paragraph.paragraphId),
  });

  await page.reload();
  await expect(page.getByText('이 지문을 끝냈습니다.')).toBeVisible();
  await expect(page.getByText(`내가 쓴 표제: “${fixture.wholePassageTitle}”`)).toBeVisible();
  expect(evaluationCalls).toHaveLength(13);
});
