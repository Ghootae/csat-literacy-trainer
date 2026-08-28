import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';

import {
  resolveProblemPathEvaluatorIds,
  type DialogueEvaluationCall,
  type DialogueEvaluationInput,
  type DialogueEvaluator,
  type EvaluationResult,
  type ProblemPathDiagnosticOutput,
  type ProblemPathEvaluator,
  type ProblemPathEvaluatorCall,
  type ProblemPathEvaluatorInput,
} from '@csat/pipeline';
import { expect, test } from '@playwright/test';

import { createLearningServer } from '../src/server/index.js';
import type { ProblemSessionView } from '../src/shared/contract.js';

const rawDiagnostic = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/probes/mrna-c2-vague-evaluator-output.json',
), 'utf8')) as ProblemPathDiagnosticOutput;

class FixedDiagnosticEvaluator implements ProblemPathEvaluator {
  calls = 0;
  readonly inputs: ProblemPathEvaluatorInput[] = [];

  evaluate(input: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
    this.calls += 1;
    this.inputs.push(structuredClone(input));
    return Promise.resolve({
      result: resolveProblemPathEvaluatorIds(rawDiagnostic, {
        turnSequence: input.sessionState.evaluationSequence,
      }),
      rawOutput: structuredClone(rawDiagnostic),
      call: {
        provider: 'mock', model: 'fixed', effort: 'none',
        promptVersion: 'path-diagnostic-prompt-v2',
        schemaVersion: 'problem-path-evaluator-output-v2',
        calledAt: '2026-08-27T00:00:00.000Z', durationMs: 1,
        attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    });
  }
}

class PassingDialogueEvaluator implements DialogueEvaluator {
  evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const result: EvaluationResult = {
      status: 'PASS',
      snapshot: {
        turn: input.turn,
        centralObjectRepresentation: input.gold.centralObject,
        centralStoryRepresentation: input.gold.centralStory,
        expressedClaims: [],
        axisStates: input.gold.centralAxes.map((axis) => ({
          axisId: axis.id,
          state: 'captured',
          evidence: [{ source: 'initial', evidence: input.initialResponse }],
        })),
        relationStates: input.gold.coreRelations.map((relation) => ({
          relationId: relation.id,
          state: 'explicit',
          source: 'initial',
          evidence: input.initialResponse,
        })),
        explicitErrors: [],
        unresolvedQuestions: [],
      },
      decisionSummary: '통과',
      targetIssue: null,
      nextQuestion: null,
      studentFeedback: '핵심 관계를 파악했습니다.',
    };
    return Promise.resolve({
      result,
      call: {
        provider: 'mock', model: 'fixed', effort: 'none',
        promptVersion: 'axis-dialogue-v2', schemaVersion: 'axis-dialogue-openai-v1',
        goldVersion: input.goldVersion, goldHash: input.goldHash,
        calledAt: '2026-08-27T00:00:00.000Z', durationMs: 1,
      },
    });
  }
}

let server: Server;
const evaluator = new FixedDiagnosticEvaluator();
const apiPort = Number(process.env['CSAT_API_PORT'] ?? 5174);

test.beforeAll(async () => {
  server = createLearningServer({
    port: apiPort,
    dialogueEvaluator: new PassingDialogueEvaluator(),
    problemPathEvaluator: evaluator,
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
});

test.beforeEach(() => {
  evaluator.calls = 0;
  evaluator.inputs.splice(0);
});

test('5문단 PASS 기록을 유지한 채 19번 판정기로 이어진다', async ({ page }) => {
  await page.goto('/dialogue');
  const card = page.locator('.dialogue-passage-card').filter({ hasText: 'mRNA 백신과 지질 나노 입자' });
  await card.getByRole('button', { name: '시작' }).click();

  for (let position = 1; position <= 5; position += 1) {
    await page.getByRole('textbox').fill(`${position}문단의 중심 관계를 이해했습니다.`);
    await page.getByRole('button', { name: '제출' }).click();
    if (position < 5) await page.getByRole('button', { name: '다음 문단' }).click();
  }
  await expect(page.getByText('전체 지문을 완료했습니다.')).toBeVisible();
  await page.getByRole('button', { name: '이 이해 기록으로 19번 풀기' }).click();
  await expect(page).toHaveURL(/\/problem\?sessionId=/);
  await expect(page.getByRole('heading', { name: /mRNA 백신과 지질 나노 입자/ })).toBeVisible();

  await page.getByText(/^2$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill('속도를 조절하면 균일하지 않을 것 같았습니다.');
  await page.getByRole('button', { name: '선택 제출' }).click();
  await expect(page.getByText('확인 질문', { exact: true })).toBeVisible();

  const input = evaluator.inputs.at(-1);
  expect(input?.paragraphHandoff?.passageId).toBe('mrna-vaccine-lipid-nanoparticle');
  expect(input?.paragraphHandoff?.paragraphs).toHaveLength(5);
  expect(input?.paragraphHandoff?.paragraphs.every((paragraph) => paragraph.dialogue.outcome === 'PASS')).toBe(true);
});

test('mRNA 19번 공개 DTO와 독립 정답 완료 상태를 새로고침 후에도 복원한다', async ({ page }) => {
  await page.goto('/problem');
  await expect(page.getByRole('heading', { name: /mRNA 백신과 지질 나노 입자/ })).toBeVisible();
  await expect(page.getByText('정답입니다.')).not.toBeVisible();

  const sessionId = await page.evaluate(() => sessionStorage.getItem(
    'csat.problem.mrna-vaccine-lipid-nanoparticle-q19',
  ));
  expect(sessionId).not.toBeNull();
  const before = await page.request.get(`/api/problem/session/${sessionId}`);
  const beforeText = await before.text();
  expect(beforeText).not.toContain('answerChoiceId');
  expect(beforeText).not.toContain('optionClaims');
  expect(beforeText).not.toContain('representativeWrongPaths');
  expect(beforeText).not.toContain('diagnosticDecision');

  await page.getByText(/^5$/).click();
  await page.getByRole('button', { name: '선택 제출' }).click();
  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('최종 선택: 5번')).toBeVisible();
  expect(evaluator.calls).toBe(0);

  await page.reload();
  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('교정 수준: INDEPENDENT_CORRECT')).toBeVisible();
});

test('정답 공개 상세 코칭 종료를 학생의 독립 정답으로 표시하지 않는다', async ({ page }) => {
  await page.route(/\/api\/problem\/session\/[^/]+\/initial$/, async (route) => {
    const response = await route.fetch();
    const original = await response.json() as ProblemSessionView;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...original,
        phase: 'COMPLETED',
        result: {
          correct: true,
          finalChoiceId: 'C5',
          outcome: 'DETAILED_COACHING_REQUIRED',
          selectionAttempt: 1,
          rationaleAssessment: 'CLEAR_ERROR',
          answerRevealed: true,
          resolvedByStudent: false,
        },
      } satisfies ProblemSessionView),
    });
  });

  await page.goto('/problem');
  await page.getByText(/^5$/).click();
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('상세 코칭으로 풀이를 마쳤습니다.')).toBeVisible();
  await expect(page.getByText('학생 스스로 해결: 아니요')).toBeVisible();
  await expect(page.getByText('정답 공개: 예')).toBeVisible();
  await expect(page.getByText('정답입니다.')).not.toBeVisible();
});

test('오답은 근거를 받은 뒤 내부 스냅샷 없이 확인 질문 하나만 표시한다', async ({ page }) => {
  await page.goto('/problem');
  await page.getByText(/^2$/).click();
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByLabel('왜 이 답을 골랐나요?')).toBeVisible();
  await page.getByLabel('왜 이 답을 골랐나요?').fill('그냥 이상해 보여요.');
  await page.getByRole('button', { name: '근거 제출' }).click();

  await expect(page.getByText('확인 질문', { exact: true })).toBeVisible();
  await expect(page.getByText('②의 설명에서 어떤 부분이 가장 이상하다고 판단했나요?', { exact: true })).toBeVisible();
  await expect(page.getByText('정답입니다.')).not.toBeVisible();
  expect(evaluator.calls).toBe(1);

  const sessionId = await page.evaluate(() => sessionStorage.getItem(
    'csat.problem.mrna-vaccine-lipid-nanoparticle-q19',
  ));
  const response = await page.request.get(`/api/problem/session/${sessionId}`);
  const body = await response.text();
  expect(body).not.toContain('hypotheses');
  expect(body).not.toContain('pathSteps');
  expect(body).not.toContain('answerChoiceId');
});

test('직접 코칭 확인 응답 뒤 새로고침 없이 재선택 선지가 활성화된다', async ({ page }) => {
  let coachingView: ProblemSessionView | null = null;
  let receivedReselectionRationale: string | null = null;
  await page.route(/\/api\/problem\/session\/[^/]+\/initial$/, async (route) => {
    const response = await route.fetch();
    const original = await response.json() as ProblemSessionView;
    coachingView = {
      ...original,
      phase: 'AWAITING_RESPONSE',
      action: { kind: 'COACHING', text: '확인된 관계를 직접 설명했습니다.' },
      reselectionPrompt: null,
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(coachingView),
    });
  });
  await page.route(/\/api\/problem\/session\/[^/]+\/respond$/, async (route) => {
    if (coachingView === null) throw new Error('직접 코칭 화면이 먼저 생성되어야 한다.');
    const body = route.request().postDataJSON() as { type: string; rationale?: string };
    if (body.type === 'RESELECT') {
      receivedReselectionRationale = body.rationale ?? null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...coachingView,
          phase: 'COMPLETED',
          selectedChoiceId: 'C5',
          action: null,
          reselectionPrompt: null,
          result: {
            correct: true,
            finalChoiceId: 'C5',
            outcome: 'RESELECTION_CORRECT_VERIFIED',
            selectionAttempt: 2,
            rationaleAssessment: 'SUPPORTED',
            answerRevealed: false,
            resolvedByStudent: true,
          },
        } satisfies ProblemSessionView),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...coachingView,
        phase: 'AWAITING_RESELECTION',
        action: null,
        reselectionPrompt: '방금 확인한 관계를 반영해 다시 선택해 주세요.',
      } satisfies ProblemSessionView),
    });
  });

  await page.goto('/problem');
  await page.getByText(/^2$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill('명확한 오류가 있어 직접 설명이 필요합니다.');
  await page.getByRole('button', { name: '선택 제출' }).click();
  await expect(page.getByText('확인된 관계를 직접 설명했습니다.')).toBeVisible();

  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByText('방금 확인한 관계를 반영해 다시 선택해 주세요.')).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeEnabled();
  await page.getByText(/^5$/).click();
  await expect(page.getByRole('button', { name: '다시 선택' })).toBeEnabled();
  await page.getByLabel('바꾼 이유 (선택 사항)').fill('pH 변화와 소수성 약화의 연결이 맞지 않습니다.');
  await page.getByRole('button', { name: '다시 선택' }).click();
  await expect(page.getByText('최종 근거 검증: SUPPORTED')).toBeVisible();
  expect(receivedReselectionRationale).toBe('pH 변화와 소수성 약화의 연결이 맞지 않습니다.');
});
