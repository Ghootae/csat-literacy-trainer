import type { Server } from 'node:http';

import {
  type DialogueEvaluationCall,
  type DialogueEvaluationInput,
  type DialogueEvaluator,
  type EvaluationResult,
  type SourceDirectProblemEvaluator,
  type SourceDirectProblemEvaluatorCall,
  type SourceDirectProblemEvaluatorInput,
} from '@csat/pipeline';
import { expect, test } from '@playwright/test';

import { createLearningServer } from '../src/server/index.js';
import type { ProblemSessionView } from '../src/shared/contract.js';

function quotedObservation(input: SourceDirectProblemEvaluatorInput) {
  const observation = input.observations.at(-1)!;
  if (observation.kind === 'INITIAL_SUBMISSION') {
    return {
      observationId: observation.observationId,
      quote: observation.rationale ?? observation.strategy ?? observation.runnerUp?.rationale ?? observation.selectedChoiceId,
    };
  }
  return { observationId: observation.observationId, quote: observation.rawResponse };
}

class FixedDiagnosticEvaluator implements SourceDirectProblemEvaluator {
  calls = 0;
  readonly inputs: SourceDirectProblemEvaluatorInput[] = [];
  readonly routes: Array<{ mode: string; model: string }> = [];
  rationaleFailure: 'connection' | 'timeout' | null = null;

  reset(): void {
    this.calls = 0;
    this.inputs.splice(0);
    this.routes.splice(0);
    this.rationaleFailure = null;
  }

  async evaluate(input: SourceDirectProblemEvaluatorInput): Promise<SourceDirectProblemEvaluatorCall> {
    this.calls += 1;
    this.inputs.push(structuredClone(input));
    this.routes.push({ mode: input.evaluationMode, model: 'gpt-5.6-terra' });
    if (input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' && this.rationaleFailure !== null) {
      throw new Error(`mock ${this.rationaleFailure}`);
    }
    const studentEvidence = [quotedObservation(input)];
    const rawOutput = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
      ? {
          schemaVersion: 'source-direct-problem-evaluator-output-v2' as const,
          mode: 'ASSESS_SELECTION_RATIONALE' as const,
          assessment: 'SUPPORTED' as const,
          reason: '학생 근거가 원문 및 공식 해설과 일치한다.',
          studentEvidence,
          sourceEvidence: [{
            kind: 'TEXT' as const,
            source: 'OFFICIAL_EXPLANATION' as const,
            quote: input.source.officialExplanation,
          }],
        }
      : this.diagnosticOutput(input, studentEvidence);
    return {
      result: rawOutput,
      rawOutput,
      call: {
        provider: 'mock', model: 'gpt-5.6-terra', effort: 'medium',
        promptVersion: 'source-direct-problem-dialogue-prompt-v3',
        schemaVersion: 'source-direct-problem-evaluator-output-v2',
        calledAt: '2026-09-08T00:00:00.000Z', durationMs: 1,
        attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    };
  }

  private diagnosticOutput(
    input: SourceDirectProblemEvaluatorInput,
    studentEvidence: ReturnType<typeof quotedObservation>[],
  ) {
    const selectedChoice = input.source.choices.find(
      (choice) => choice.choiceId === input.sessionState.currentChoiceId,
    )!;
    const circledPosition = ['', '①', '②', '③', '④', '⑤'][selectedChoice.position] ??
      `${selectedChoice.position}번`;
    const common = {
      schemaVersion: 'source-direct-problem-evaluator-output-v2' as const,
      mode: 'DIAGNOSE_PATH' as const,
      basedOnObservationIds: input.observations.map((observation) => observation.observationId),
      divergenceLayer: null,
      reconstructedPath: '학생이 현재 선지의 일부 표현을 근거로 선택했다.',
      studentEvidence,
    };
    if (input.sessionState.allowedActionTypes.includes('ASK_DIAGNOSTIC')) {
      return {
        ...common,
        assessment: 'INSUFFICIENT_EVIDENCE' as const,
        learningState: 'PATH_UNCLEAR' as const,
        reason: '학생 근거만으로 판단 관계를 확정할 수 없다.',
        sourceEvidence: [],
        nextAction: {
          type: 'ASK_DIAGNOSTIC' as const,
          question: `${circledPosition}의 설명에서 어떤 부분이 가장 이상하다고 판단했나요?`,
          purpose: '학생이 적용한 판단 관계를 확인한다.',
        },
      };
    }
    if (input.sessionState.allowedActionTypes.includes('ASK_CORRECTIVE')) {
      return {
        ...common,
        assessment: 'CLEAR_ERROR' as const,
        learningState: 'PATH_CLARIFIED' as const,
        divergenceLayer: 'INFERENCE_TRANSFORMATION' as const,
        reason: '현재 선지 판단에 사용한 관계가 원문과 어긋난다.',
        sourceEvidence: [{
          kind: 'TEXT' as const,
          source: 'CHOICE' as const,
          quote: selectedChoice.text,
        }],
        nextAction: {
          type: 'ASK_CORRECTIVE' as const,
          question: `${selectedChoice.position}번 판단에 사용한 관계를 다시 확인해 볼까요?`,
          purpose: '현재 선지 판단의 오류 관계를 바로잡는다.',
        },
      };
    }
    return {
      ...common,
      assessment: 'INSUFFICIENT_EVIDENCE' as const,
      learningState: 'PATH_UNCLEAR' as const,
      reason: '질문 한도 안에서 오류 경로가 확인되지 않았다.',
      sourceEvidence: [{
        kind: 'TEXT' as const,
        source: 'CHOICE' as const,
        quote: selectedChoice.text,
      }],
      nextAction: {
        type: 'DIRECT_COACHING' as const,
        message: `현재 선택한 ${selectedChoice.position}번에서 확인할 관계는 “${selectedChoice.text}”입니다.`,
        reason: input.sessionState.selectionAttempt >= input.sessionState.maxSelectionAttempts
          ? 'FINAL_ATTEMPT' as const
          : 'MAX_DIAGNOSTIC_TURNS' as const,
      },
    };
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
  evaluator.reset();
});

test('루트 진입은 최신 학생용 연결 학습 화면으로 정규화한다', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/dialogue$/);
  await expect(page.getByRole('heading', {
    name: '읽은 내용을 설명하고, 이어서 문제를 풀어보세요.',
  })).toBeVisible();
});

test('문제 전용 목록에서 6개 문항을 선택해 바로 연다', async ({ page }) => {
  await page.goto('/problems');

  await expect(page.getByRole('heading', { name: '풀 문제를 선택해 주세요.' })).toBeVisible();
  const catalog = page.getByRole('region', { name: '풀 수 있는 문제' });
  await expect(catalog.getByRole('link')).toHaveCount(6);
  await expect(page.getByText('문단 대화 없이 6개 문제 중 하나를 선택해 바로 시작합니다.')).toBeVisible();

  await catalog.getByRole('link', { name: /공손룡과 후기 묵가의 명실론/ }).click();
  await expect(page).toHaveURL(/\/problem\?questionId=gongsun-long-later-mohists-q12/);
  await expect(page.getByRole('heading', { name: /공손룡과 후기 묵가의 명실론 · 12번/ })).toBeVisible();
  await expect(page.getByRole('link', { name: '문제 목록' })).toHaveAttribute('href', '/problems');
});

test('5문단 PASS 기록을 유지한 채 19번 판정기로 이어진다', async ({ page }) => {
  await page.goto('/dialogue');
  const card = page.locator('.dialogue-passage-card').filter({ hasText: 'mRNA 백신과 지질 나노 입자' });
  await card.getByRole('button', { name: '학습 시작' }).click();

  for (let position = 1; position <= 5; position += 1) {
    await page.getByRole('textbox').fill(`${position}문단의 중심 관계를 이해했습니다.`);
    await page.getByRole('button', { name: '제출' }).click();
    if (position < 5) await page.getByRole('button', { name: '다음 문단' }).click();
  }
  await expect(page.getByText('문단 학습을 마쳤습니다.')).toBeVisible();
  await page.getByRole('button', { name: '19번 문제 풀기' }).click();
  await expect(page).toHaveURL(/\/problem\?sessionId=/);
  await expect(page.getByRole('heading', { name: /mRNA 백신과 지질 나노 입자/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Y자 미세관/ })).toBeVisible();

  await page.getByText(/^2$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill('속도를 조절하면 균일하지 않을 것 같았습니다.');
  await page.getByRole('button', { name: '선택 제출' }).click();
  await expect(page.getByText('확인 질문', { exact: true })).toBeVisible();

  const input = evaluator.inputs.at(-1);
  expect(input?.paragraphHandoff?.passageId).toBe('mrna-vaccine-lipid-nanoparticle');
  expect(input?.paragraphHandoff?.paragraphs).toHaveLength(5);
  expect(input?.paragraphHandoff?.paragraphs.every((paragraph) => paragraph.dialogue.outcome === 'PASS')).toBe(true);
  expect(input?.source.media).toEqual([expect.objectContaining({
    mediaId: 'MEDIA1',
    placement: { scope: 'SCENARIO', supplementIndex: 0 },
  })]);
  expect(JSON.stringify(input?.source.media)).not.toContain('Y자 미세관');
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
  await expect(page.getByText('최종 결과: INITIAL_CORRECT')).toBeVisible();
  await expect(page.getByText('상세 결과 유형: INDEPENDENT_CORRECT')).toBeVisible();
});

test('정답 근거는 원문 직접 판정하고 SUPPORTED 결과를 검증 정답으로 종료한다', async ({ page }) => {
  await page.goto('/problem');
  await page.getByText(/^5$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill(
    '⑤의 소수성 약화와 입자 크기 감소 연결은 지문에서 제시되지 않았습니다.',
  );
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('최종 결과: INITIAL_CORRECT_VERIFIED')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: SUPPORTED')).toBeVisible();
  expect(evaluator.routes).toEqual([
    { mode: 'ASSESS_SELECTION_RATIONALE', model: 'gpt-5.6-terra' },
  ]);
});

test('원문 직접 근거 판정의 연결 오류는 질문 없이 미검증 정답으로 안전 종료한다', async ({ page }) => {
  evaluator.rationaleFailure = 'connection';
  await page.goto('/problem');
  await page.getByText(/^5$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill(
    '⑤의 소수성 약화와 입자 크기 감소 연결은 지문에서 제시되지 않았습니다.',
  );
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('최종 결과: INITIAL_CORRECT_UNVERIFIED')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: UNCERTAIN')).toBeVisible();
  expect(evaluator.routes).toEqual([
    { mode: 'ASSESS_SELECTION_RATIONALE', model: 'gpt-5.6-terra' },
  ]);
});

test('원문 직접 근거 판정의 시간 초과는 미검증 정답으로 종료한다', async ({ page }) => {
  evaluator.rationaleFailure = 'timeout';
  await page.goto('/problem');
  await page.getByText(/^5$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill(
    '⑤의 소수성 약화와 입자 크기 감소 연결은 지문에서 제시되지 않았습니다.',
  );
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('최종 결과: INITIAL_CORRECT_UNVERIFIED')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: UNCERTAIN')).toBeVisible();
  expect(evaluator.routes).toEqual([
    { mode: 'ASSESS_SELECTION_RATIONALE', model: 'gpt-5.6-terra' },
  ]);
});

test('원문 직접 근거 판정 실패 시 확인 질문을 새로 만들지 않는다', async ({ page }) => {
  evaluator.rationaleFailure = 'connection';
  await page.goto('/problem');
  await page.getByText(/^5$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill(
    '⑤의 소수성 약화와 입자 크기 감소 연결은 지문에서 제시되지 않았습니다.',
  );
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('최종 결과: INITIAL_CORRECT_UNVERIFIED')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: UNCERTAIN')).toBeVisible();
  await expect(page.getByText('확인 질문', { exact: true })).not.toBeVisible();
  expect(evaluator.routes).toEqual([
    { mode: 'ASSESS_SELECTION_RATIONALE', model: 'gpt-5.6-terra' },
  ]);
});

test('묵가 지문 5문단 PASS 뒤 12번으로 연결하고 문제별 세션을 분리한다', async ({ page }) => {
  await page.goto('/dialogue');
  const card = page.locator('.dialogue-passage-card').filter({ hasText: '공손룡과 후기 묵가의 명실론' });
  await card.getByRole('button', { name: '학습 시작' }).click();

  for (let position = 1; position <= 5; position += 1) {
    await page.getByRole('textbox').fill(`${position}문단의 중심 관계를 이해했습니다.`);
    await page.getByRole('button', { name: '제출' }).click();
    if (position < 5) await page.getByRole('button', { name: '다음 문단' }).click();
  }
  await page.getByRole('button', { name: '12번 문제 풀기' }).click();
  await expect(page).toHaveURL(/\/problem\?sessionId=/);
  await expect(page.getByRole('heading', { name: /공손룡과 후기 묵가의 명실론 · 12번/ })).toBeVisible();
  await expect(page.getByText(/ⓐ옷이 없어/)).toBeVisible();

  const mohistsSessionId = await page.evaluate(() => sessionStorage.getItem(
    'csat.problem.gongsun-long-later-mohists-q12',
  ));
  expect(mohistsSessionId).not.toBeNull();

  await page.getByText(/^4$/).click();
  await page.getByRole('button', { name: '선택 제출' }).click();
  await expect(page.getByText('정답입니다.')).toBeVisible();
  await expect(page.getByText('최종 선택: 4번')).toBeVisible();
});

test('questionId 라우팅으로 묵가 12번을 직접 열고 새로 풀어도 같은 문항을 유지한다', async ({ page }) => {
  await page.goto('/problem?questionId=gongsun-long-later-mohists-q12');
  await expect(page.getByRole('heading', { name: /공손룡과 후기 묵가의 명실론 · 12번/ })).toBeVisible();
  await page.getByRole('button', { name: '새로 풀기' }).click();
  await expect(page.getByRole('heading', { name: /공손룡과 후기 묵가의 명실론 · 12번/ })).toBeVisible();
  await expect(page.getByText('mRNA 백신과 지질 나노 입자')).not.toBeVisible();
});

for (const problem of [
  { questionId: 'corporate-law-q13', title: '법인의 종류와 자산 운용의 법적 통제', number: 13, answer: 2 },
  { questionId: 'information-asymmetry-free-marketplace-q13', title: '정보 비대칭과 사상의 자유 시장 이론', number: 13, answer: 5 },
  { questionId: 'surface-tension-laplace-q16', title: '표면 장력과 라플라스 식', number: 16, answer: 3 },
  { questionId: 'dopamine-motor-control-q13', title: '도파민의 합성, 수용체, 수의적 운동 조절', number: 13, answer: 2 },
]) {
  test(`${problem.title} ${problem.number}번을 직접 열어 독립 정답으로 종료한다`, async ({ page }) => {
    await page.goto(`/problem?questionId=${problem.questionId}`);
    await expect(page.getByRole('heading', { name: new RegExp(`${problem.title} · ${problem.number}번`) })).toBeVisible();
    await page.getByText(new RegExp(`^${problem.answer}$`)).click();
    await page.getByRole('button', { name: '선택 제출' }).click();
    await expect(page.getByText('정답입니다.')).toBeVisible();
    await expect(page.getByText(`최종 선택: ${problem.answer}번`)).toBeVisible();
  });
}

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
          correct: false,
          finalChoiceId: 'C2',
          outcome: 'DETAILED_COACHING_REQUIRED',
          selectionAttempt: 3,
          rationaleSubmission: 'PROVIDED',
          rationaleAssessment: 'NOT_EVALUATED',
          rationaleNonEvaluationReason: 'FINAL_ATTEMPT_STATIC_TERMINATION',
          answerRevealed: true,
          resolvedByStudent: false,
          resolutionStage: 'ANSWER_REVEALED',
          resolutionOutcome: 'ANSWER_REVEALED',
          interventionPath: 'STATIC_ANSWER_EXPLANATION',
          interventionHistory: ['CORRECTIVE_QUESTION', 'STATIC_ANSWER_EXPLANATION'],
          effectiveRepairPath: 'STATIC_ANSWER_EXPLANATION',
          answerExplanation: '정답은 ⑤입니다.',
          answerReveal: {
            answerChoiceId: 'C5',
            lastChoiceId: 'C2',
            lastChoiceExplanation: '②는 두 용액의 투입량과 혼합 비율을 일정하게 통제하는 설명입니다.',
            correctChoiceExplanation: '⑤의 소수성 약화와 크기 감소 연결은 지문과 보기에서 정당화되지 않습니다.',
            groundingSummary: '지문은 pH 상승에 따른 이온화 지질의 중성화만 제시합니다.',
          },
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
  await expect(page.getByText('최종 결과: ANSWER_REVEALED')).toBeVisible();
  await expect(page.getByText('최종 근거: 제출됨')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: 최종 시도 정적 종결로 별도 평가하지 않음')).toBeVisible();
  await expect(page.getByText('최종 유효 교정 경로: STATIC_ANSWER_EXPLANATION')).toBeVisible();
  await expect(page.getByText('전체 개입 이력: CORRECTIVE_QUESTION → STATIC_ANSWER_EXPLANATION')).toBeVisible();
  await expect(page.getByText(/^정답 5번$/)).toBeVisible();
  await expect(page.getByText(/마지막 선택이 아닌 이유.*②는 두 용액의 투입량과 혼합 비율/)).toBeVisible();
  await expect(page.getByText(/정답 선지의 이유.*⑤의 소수성 약화와 크기 감소 연결/)).toBeVisible();
  await expect(page.getByText(/지문·보기 근거.*pH 상승에 따른 이온화 지질의 중성화/)).toBeVisible();
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

test('질문 2/2 소진 뒤 원문 직접 코칭을 거쳐 복구 없이 재선택한다', async ({ page }) => {
  await page.goto('/problem');
  await page.getByText(/^2$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill('어느 관계가 문제인지 잘 모르겠습니다.');
  await page.getByRole('button', { name: '선택 제출' }).click();

  await expect(page.getByText('확인 질문', { exact: true })).toBeVisible();
  await page.getByRole('textbox').last().fill('첫 질문에도 잘 모르겠습니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();
  await expect(page.getByText('이번 선택 질문 2/2')).toBeVisible();

  await page.getByRole('textbox').last().fill('두 번째 질문에도 잘 모르겠습니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();
  await expect(page.locator('.problem-action > p').filter({
    hasText: '현재 선택한 2번에서 확인할 관계',
  })).toBeVisible();
  await expect(page.getByText('이번 선택 개입 3회')).toBeVisible();
  await expect(page.getByText('정답 공개: 예')).not.toBeVisible();
  expect(evaluator.calls).toBe(3);

  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('button', { name: '다시 선택' })).toBeVisible();
  await expect(page.getByText('선택 1/3')).toBeVisible();
  await expect(page.getByText('진행을 다시 시작할 수 있습니다')).not.toBeVisible();
  expect(evaluator.calls).toBe(3);
});

test('세 번째 선택도 오답일 때만 정적 정답 공개로 종료한다', async ({ page }) => {
  await page.goto('/problem');
  await page.getByText(/^2$/).click();
  await page.getByLabel('선택 근거 (선택 사항)').fill('②가 틀렸다고 생각했습니다.');
  await page.getByRole('button', { name: '선택 제출' }).click();

  await page.getByRole('textbox').last().fill('첫 질문에도 ②가 틀렸다고 생각합니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();
  await page.getByRole('textbox').last().fill('두 번째 질문에도 판단을 바꾸지 않겠습니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();
  await expect(page.getByText('정답 공개: 예')).not.toBeVisible();

  await page.getByRole('button', { name: '확인' }).click();
  await page.getByText(/^3$/).click();
  await page.getByLabel('바꾼 이유 (선택 사항)').fill('③의 그림 관계가 맞지 않는다고 생각했습니다.');
  await page.getByRole('button', { name: '다시 선택' }).click();
  await expect(page.getByText('정답 공개: 예')).not.toBeVisible();
  await page.getByRole('textbox').last().fill('첫 교정 질문에도 ③을 유지하겠습니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();
  await page.getByRole('textbox').last().fill('두 번째 교정 질문에도 ③을 유지하겠습니다.');
  await page.getByRole('button', { name: '답변 제출' }).click();

  await page.getByRole('button', { name: '확인' }).click();
  await page.getByText(/^4$/).click();
  await page.getByLabel('바꾼 이유 (선택 사항)').fill('④의 pH 관계가 틀렸다고 생각했습니다.');
  await page.getByRole('button', { name: '다시 선택' }).click();

  await expect(page.getByText('상세 코칭으로 풀이를 마쳤습니다.')).toBeVisible();
  await expect(page.getByText('정답 공개: 예')).toBeVisible();
  await expect(page.getByText('최종 결과: ANSWER_REVEALED')).toBeVisible();
  await expect(page.getByText('학생 스스로 해결: 아니요')).toBeVisible();
  await expect(page.getByText(/^정답 5번$/)).toBeVisible();
  expect(evaluator.routes.map((route) => route.model)).toEqual([
    'gpt-5.6-terra',
    'gpt-5.6-terra',
    'gpt-5.6-terra',
    'gpt-5.6-terra',
    'gpt-5.6-terra',
    'gpt-5.6-terra',
  ]);
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
            rationaleSubmission: 'PROVIDED',
            rationaleAssessment: 'SUPPORTED',
            rationaleNonEvaluationReason: null,
            answerRevealed: false,
            resolvedByStudent: true,
            resolutionStage: 'SECOND_SELECTION',
            resolutionOutcome: 'SECOND_SELECTION_CORRECT_VERIFIED',
            interventionPath: 'DIRECT_COACHING',
            interventionHistory: ['DIRECT_COACHING'],
            effectiveRepairPath: 'DIRECT_COACHING',
            answerExplanation: null,
            answerReveal: null,
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
  await expect(page.getByText('최종 결과: SECOND_SELECTION_CORRECT_VERIFIED')).toBeVisible();
  await expect(page.getByText('최종 근거 검증: SUPPORTED')).toBeVisible();
  expect(receivedReselectionRationale).toBe('pH 변화와 소수성 약화의 연결이 맞지 않습니다.');
});

test('evaluator 오류 상태를 저장된 근거에서 자동 재개한다', async ({ page }) => {
  let recoverableView: ProblemSessionView | null = null;
  let resumeCalls = 0;
  await page.route(/\/api\/problem\/session\/[^/]+\/rationale$/, async (route) => {
    const response = await route.fetch();
    const original = await response.json() as ProblemSessionView;
    recoverableView = original;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...original,
        phase: 'EVALUATION_ERROR',
        action: null,
        evaluation: {
          status: 'RETRYABLE_ERROR',
          message: '일시적으로 판정을 완료하지 못했습니다.',
        },
      } satisfies ProblemSessionView),
    });
  });
  await page.route(/\/api\/problem\/session\/[^/]+\/resume$/, async (route) => {
    resumeCalls += 1;
    if (recoverableView === null) throw new Error('복구할 evaluator 결과가 필요하다.');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(recoverableView),
    });
  });

  await page.goto('/problem');
  await page.getByText(/^2$/).click();
  await page.getByRole('button', { name: '선택 제출' }).click();
  await page.getByLabel('왜 이 답을 골랐나요?').fill('그냥 이상해 보여요.');
  await page.getByRole('button', { name: '근거 제출' }).click();

  await expect(page.getByText('확인 질문', { exact: true })).toBeVisible();
  expect(resumeCalls).toBe(1);
});
