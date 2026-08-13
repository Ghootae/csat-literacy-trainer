import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import type { EvaluatedResponse, GeneratedQuerySet, Gold, RegionSemanticVerdict } from '@csat/pipeline';
import { expect, test } from '@playwright/test';

import { createLearningServer } from '../src/server/index.js';

interface FlowFixture {
  readonly paragraphId: string;
  readonly initialTitle: string;
  readonly firstResponse: string;
  readonly revisedResponse: string;
  readonly finalTitle: string;
  readonly region: {
    readonly regionId: string;
    readonly label: string;
    readonly sentenceIds: readonly string[];
    readonly firstVerdict: RegionSemanticVerdict;
    readonly firstFeedback: string;
    readonly revisedVerdict: RegionSemanticVerdict;
    readonly revisedFeedback: string;
  };
  readonly title: {
    readonly verdict: RegionSemanticVerdict;
    readonly compressed: boolean;
  };
}

const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'fixtures', 'photosynthesis-p4-flow.json'), 'utf8'),
) as FlowFixture;

let server: Server;
let sessionRoot: string;
const evaluationCalls: string[] = [];

function fixedEvaluation(
  _gold: Gold,
  queries: GeneratedQuerySet,
  response: string,
): Promise<EvaluatedResponse> {
  evaluationCalls.push(response);
  const title = queries.regions.some((region) => region.regionId === 'title');
  const revised = response === fixture.revisedResponse;
  const verdict = title
    ? fixture.title.verdict
    : revised
      ? fixture.region.revisedVerdict
      : fixture.region.firstVerdict;
  const feedback = title
    ? '문단의 관계를 한 층 위에서 묶었습니다.'
    : revised
      ? fixture.region.revisedFeedback
      : fixture.region.firstFeedback;
  const regionId = title ? 'title' : fixture.region.regionId;

  return Promise.resolve({
    assessments: [
      {
        regionId,
        label: title ? '문단의 중심 관계' : fixture.region.label,
        verdict,
        feedback,
        propositionEvidence: [],
        _debug: { argumentCoverage: 'none', expressionProfile: 'none' },
      },
    ],
    said: new Map([[regionId, [response]]]),
    sentenceIds: new Map([[regionId, title ? ['S1', 'S2', 'S3', 'S4', 'S5'] : fixture.region.sentenceIds]]),
    rawVerdicts: new Map(
      title
        ? [
            [
              'qT3',
              {
                semanticState: fixture.title.compressed ? 'preserved' : 'not_evidenced',
                expressionMode: 'explicit',
                evidence: response,
                viaItem: '1',
                evidenceRole: 'relation',
              },
            ],
          ]
        : [],
    ),
    regions: [],
    propositionEvaluation: { evaluator: 'query', latencyMs: 0, results: [] },
  } as EvaluatedResponse);
}

test.beforeAll(async () => {
  sessionRoot = mkdtempSync(resolve(tmpdir(), 'csat-app-e2e-'));
  process.env['CSAT_SESSION_ROOT'] = sessionRoot;
  server = createLearningServer({
    port: 5174,
    responseEvaluator: fixedEvaluation,
    warmer: () => Promise.resolve(),
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(5174, '127.0.0.1', resolveListen);
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error === undefined ? resolveClose() : reject(error)));
  });
  delete process.env['CSAT_SESSION_ROOT'];
  rmSync(sessionRoot, { recursive: true, force: true });
});

test('photosynthesis-p4 학습 루프를 저장·복원하고 다음 단락으로 이동한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /C3 식물의 한계와 C4 연구/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('C3 식물의 한계와 C4 연구');

  await page.getByRole('textbox').fill(fixture.initialTitle);
  await page.getByRole('button', { name: '적었어요 — 이제 자세히 읽기' }).click();

  await page.getByLabel('섹션 1').fill(fixture.firstResponse);
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByText('주제만', { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.region.firstFeedback)).toBeVisible();

  // 첫 판정 상태도 재접속으로 복원되며, 복원 자체는 평가기를 다시 호출하지 않는다.
  await page.reload();
  await expect(page.getByLabel('섹션 1')).toHaveValue(fixture.firstResponse);
  await expect(page.getByText('주제만', { exact: true })).toBeVisible();

  await page.locator('.region').click();
  await page.getByLabel('섹션 1').fill(fixture.revisedResponse);
  await page.getByRole('button', { name: '다시 제출' }).click();
  await expect(page.getByText('관계보존', { exact: true })).toBeVisible();
  await expect(page.getByText(fixture.region.revisedFeedback)).toBeVisible();

  await page.getByPlaceholder('각 부분을 하나로 묶어 한 문장으로…').fill(fixture.finalTitle);
  await page.getByRole('button', { name: '제출', exact: true }).click();
  await expect(page.getByText('보상 2단계')).toBeVisible();
  await expect(page.getByText('이 문단을 끝냈습니다.')).toBeVisible();

  const sessionId = await page.evaluate((paragraphId) => sessionStorage.getItem(`csat.session.${paragraphId}`), fixture.paragraphId);
  expect(sessionId).not.toBeNull();
  const stored = await page.request.get(`/api/session/${sessionId}`);
  expect(stored.ok()).toBeTruthy();
  const body = (await stored.json()) as {
    attempts: readonly { sections: readonly string[] }[];
    titleAttempts: readonly { text: string; judged: boolean; compressed?: boolean }[];
  };
  expect(body.attempts).toHaveLength(2);
  expect(body.attempts[1]?.sections).toContain(fixture.revisedResponse);
  expect(body.titleAttempts).toEqual([
    expect.objectContaining({ text: fixture.initialTitle, judged: false }),
    expect.objectContaining({ text: fixture.finalTitle, judged: true, compressed: true }),
  ]);

  await page.reload();
  await expect(page.getByLabel('섹션 1')).toHaveValue(fixture.revisedResponse);
  await expect(page.getByText('재판정 완료')).toBeVisible();
  await expect(page.getByText('보상 2단계')).toBeVisible();
  expect(evaluationCalls).toEqual([fixture.firstResponse, fixture.revisedResponse, fixture.finalTitle]);
  await page.getByRole('button', { name: /다음 문단/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('증권 공시 의무의 조건과 예외');
});
