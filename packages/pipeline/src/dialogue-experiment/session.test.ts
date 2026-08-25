import { describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';

import {
  formatDebugEvaluation,
  parseDialogueCliArgs,
  resolveDialogueParagraphIds,
} from './cli.js';
import type {
  DialogueCallMetadata,
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
} from './evaluator.js';
import {
  DEFAULT_DIALOGUE_OPENAI_MODEL,
  DialogueEvaluationContractError,
  OpenAIDialogueEvaluator,
  loadDialoguePrompt,
} from './evaluator.js';
import {
  DOPAMINE_PARAGRAPH_IDS,
  DOPAMINE_PASSAGE_ID,
  loadDiagnosticGold,
} from './gold.js';
import {
  DialogueSessionEngine,
  formatStudentStep,
  type DialogueExperimentSession,
  type DialogueSessionLogger,
} from './session.js';
import {
  DIALOGUE_PROMPT_VERSION,
  DIALOGUE_SCHEMA_VERSION,
  type EvaluationResult,
  type EvaluationStatus,
  type QuestionType,
  type StudentRepresentationSnapshot,
  normalizeEvaluationResult,
  PASS_STUDENT_FEEDBACK,
  validateEvaluationResult,
} from './schema.js';

const loaded = loadDiagnosticGold();

function snapshot(
  turn: number,
  source: 'initial' | 'diagnostic' | 'corrective' = 'initial',
): StudentRepresentationSnapshot {
  return {
    turn,
    centralObjectRepresentation: '절대정신의 세 형태',
    centralStoryRepresentation: `turn-${turn}`,
    expressedClaims: [{ description: '관계 설명', source, evidence: `evidence-${turn}` }],
    relationStates: [
      { relationId: 'R1', state: 'explicit', source, evidence: `evidence-${turn}` },
      { relationId: 'R2', state: turn === 1 ? 'unknown' : 'explicit', ...(turn === 1 ? {} : { source, evidence: `evidence-${turn}` }) },
    ],
    explicitErrors: [],
    unresolvedQuestions: turn === 1 ? ['R2 확인 필요'] : [],
  };
}

function evaluation(
  status: EvaluationStatus,
  turn: number,
  options: {
    readonly questionType?: QuestionType;
    readonly source?: 'initial' | 'diagnostic' | 'corrective';
    readonly noQuestion?: boolean;
  } = {},
): EvaluationResult {
  const questionType =
    options.questionType ?? (status === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC');
  const currentSnapshot = snapshot(turn, options.source);
  if (status === 'ERROR') {
    currentSnapshot.relationStates[1] = {
      relationId: 'R2',
      state: 'contradicted',
      source: options.source ?? 'initial',
      evidence: `error-evidence-${turn}`,
    };
  }
  return {
    status,
    snapshot: currentSnapshot,
    decisionSummary: `decision-${turn}`,
    targetIssue: status === 'PASS' ? null : { description: '확인할 관계', relatedRelationIds: ['R2'] },
    nextQuestion:
      status === 'PASS' || options.noQuestion === true
        ? null
        : { type: questionType, text: `question-${turn}` },
    studentFeedback: `feedback-${turn}`,
  };
}

const MOCK_CALL: DialogueCallMetadata = {
  provider: 'mock',
  model: 'mock-model',
  effort: 'none',
  promptVersion: DIALOGUE_PROMPT_VERSION,
  schemaVersion: DIALOGUE_SCHEMA_VERSION,
  goldVersion: loaded.version,
  goldHash: loaded.hash,
  calledAt: '2026-08-21T00:00:00.000Z',
  durationMs: 1,
};

class QueueEvaluator implements DialogueEvaluator {
  readonly inputs: DialogueEvaluationInput[] = [];

  constructor(private readonly queue: readonly (DialogueEvaluationCall | Error)[]) {}

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    this.inputs.push(structuredClone(input));
    const item = this.queue[this.inputs.length - 1];
    if (item === undefined) throw new Error('mock result 부족');
    if (item instanceof Error) throw item;
    return structuredClone(item);
  }
}

class MemoryLogger implements DialogueSessionLogger {
  readonly sessions: DialogueExperimentSession[] = [];

  save(session: DialogueExperimentSession): void {
    this.sessions.push(structuredClone(session));
  }
}

function call(result: EvaluationResult): DialogueEvaluationCall {
  return { result, call: MOCK_CALL };
}

function engineFor(queue: readonly (DialogueEvaluationCall | Error)[]) {
  const evaluator = new QueueEvaluator(queue);
  const logger = new MemoryLogger();
  const engine = new DialogueSessionEngine({
    evaluator,
    logger,
    gold: loaded.gold,
    goldVersion: loaded.version,
    goldHash: loaded.hash,
    now: () => new Date('2026-08-21T00:00:00.000Z'),
    sessionId: () => 'session-test',
  });
  return { engine, evaluator, logger };
}

describe('dialogue experiment orchestration', () => {
  it('최초 응답이 PASS이면 질문 없이 종료한다', async () => {
    const { engine, evaluator, logger } = engineFor([call(evaluation('PASS', 1))]);

    const step = await engine.submitInitial('세 형식과 철학의 종합을 설명했다.');

    expect(step).toMatchObject({ terminal: true, finalStatus: 'PASS', questionShown: null });
    expect(evaluator.inputs).toHaveLength(1);
    expect(logger.sessions[0]?.finalStatus).toBe('PASS');
  });

  it('최초 응답이 UNCLEAR이면 진단 질문을 생성한다', async () => {
    const { engine } = engineFor([call(evaluation('UNCLEAR', 1))]);

    const step = await engine.submitInitial('예술과 종교와 철학 이야기다.');

    expect(step).toMatchObject({ terminal: false, questionShown: 'question-1' });
    expect(step.evaluation.nextQuestion?.type).toBe('DIAGNOSTIC');
  });

  it('최초 응답이 ERROR이면 교정 질문을 생성한다', async () => {
    const { engine } = engineFor([
      call(evaluation('ERROR', 1, { questionType: 'CORRECTIVE' })),
    ]);

    const step = await engine.submitInitial('철학은 직관이다.');

    expect(step.evaluation.nextQuestion?.type).toBe('CORRECTIVE');
    expect(step.questionShown).toBe('question-1');
  });

  it('진단 답변 후 PASS로 종료하고 diagnostic 출처를 보존한다', async () => {
    const { engine, logger } = engineFor([
      call(evaluation('UNCLEAR', 1)),
      call(evaluation('PASS', 2, { source: 'diagnostic' })),
    ]);

    await engine.submitInitial('세 가지를 말한다.');
    const step = await engine.submitFollowUp('철학에서 두 성격을 종합한다.');

    expect(step.finalStatus).toBe('PASS');
    expect(logger.sessions[0]?.finalSnapshot.expressedClaims[0]?.source).toBe('diagnostic');
  });

  it('교정 답변 후 PASS로 종료하고 corrective 출처를 보존한다', async () => {
    const { engine, logger } = engineFor([
      call(evaluation('ERROR', 1, { questionType: 'CORRECTIVE' })),
      call(evaluation('PASS', 2, { source: 'corrective' })),
    ]);

    await engine.submitInitial('철학이 직관이다.');
    await engine.submitFollowUp('다시 보니 철학에는 사유가 대응한다.');

    expect(logger.sessions[0]?.finalStatus).toBe('PASS');
    expect(logger.sessions[0]?.finalSnapshot.expressedClaims[0]?.source).toBe('corrective');
  });

  it('첫 교정 뒤 남은 불명확성에는 진단 질문 하나를 생성한다', async () => {
    const { engine } = engineFor([
      call(evaluation('ERROR', 1, { questionType: 'CORRECTIVE' })),
      call(evaluation('UNCLEAR', 2, { questionType: 'DIAGNOSTIC', source: 'corrective' })),
    ]);

    await engine.submitInitial('철학이 직관이다.');
    const step = await engine.submitFollowUp('철학은 사유에 해당한다.');

    expect(step.evaluation.status).toBe('UNCLEAR');
    expect(step.evaluation.nextQuestion?.type).toBe('DIAGNOSTIC');
    expect(step.questionShown).toBe('question-2');
  });

  it('후속 평가에 최초 응답과 이전 문답 전체를 전달한다', async () => {
    const { engine, evaluator } = engineFor([
      call(evaluation('UNCLEAR', 1)),
      call(evaluation('UNCLEAR', 2)),
      call(evaluation('PASS', 3, { source: 'diagnostic' })),
    ]);

    await engine.submitInitial('최초 응답');
    await engine.submitFollowUp('첫 답변');
    await engine.submitFollowUp('둘째 답변');

    expect(evaluator.inputs[2]).toMatchObject({
      initialResponse: '최초 응답',
      questionsAsked: 2,
      history: [
        { question: { text: 'question-1' }, answer: '첫 답변' },
        { question: { text: 'question-2' }, answer: '둘째 답변' },
      ],
    });
    expect(evaluator.inputs).toHaveLength(3);
  });

  it('질문은 세 번을 넘지 않고 최대 질문 뒤 미해결로 종료한다', async () => {
    const { engine, logger } = engineFor([
      call(evaluation('UNCLEAR', 1)),
      call(evaluation('ERROR', 2, { questionType: 'CORRECTIVE' })),
      call(evaluation('UNCLEAR', 3)),
      call(evaluation('UNCLEAR', 4, { noQuestion: true })),
    ]);

    await engine.submitInitial('짧은 응답');
    await engine.submitFollowUp('첫 답변');
    await engine.submitFollowUp('둘째 답변');
    const final = await engine.submitFollowUp('셋째 답변');

    expect(final).toMatchObject({ terminal: true, finalStatus: 'UNRESOLVED', questionShown: null });
    expect(logger.sessions[0]?.turns.filter((turn) => turn.questionShown !== null)).toHaveLength(3);
  });

  it('최초 스냅샷을 후속 턴에서 덮어쓰지 않는다', async () => {
    const first = evaluation('UNCLEAR', 1);
    const second = evaluation('PASS', 2, { source: 'diagnostic' });
    const { engine, logger } = engineFor([call(first), call(second)]);

    await engine.submitInitial('최초 응답');
    await engine.submitFollowUp('후속 답변');

    const session = logger.sessions[0]!;
    expect(session.initialSnapshot.centralStoryRepresentation).toBe('turn-1');
    expect(session.finalSnapshot.centralStoryRepresentation).toBe('turn-2');
    expect(first.snapshot.centralStoryRepresentation).toBe('turn-1');
  });

  it('기본 출력에는 내부 상태·JSON·decisionSummary가 없고 debug에서만 보인다', () => {
    const step = {
      evaluation: evaluation('UNCLEAR', 1),
      call: MOCK_CALL,
      questionShown: 'question-1',
      terminal: false,
      finalStatus: null,
    } as const;

    const student = formatStudentStep(step);
    expect(student).toContain('feedback-1');
    expect(student).toContain('question-1');
    expect(student).not.toMatch(/UNCLEAR|decision-1|\{|"snapshot"/);

    const debug = formatDebugEvaluation(step.evaluation);
    expect(debug).toContain('[debug]');
    expect(debug).toContain('"status": "UNCLEAR"');
    expect(parseDialogueCliArgs(['--debug']).debug).toBe(true);
  });

  it('unknown 관계에서는 source와 evidence를 제거한다', () => {
    const raw = evaluation('UNCLEAR', 1);
    raw.snapshot.relationStates[1] = {
      relationId: 'R2',
      state: 'unknown',
      source: 'initial',
      evidence: '언급 없음',
    };

    const normalized = normalizeEvaluationResult(raw, loaded.gold);

    expect(normalized.snapshot.relationStates[1]).toEqual({
      relationId: 'R2',
      state: 'unknown',
    });
  });

  it('직접 표현과 합리적 도출을 explicit과 entailed로 구분해 보존한다', () => {
    const raw = evaluation('PASS', 2);
    raw.snapshot.relationStates = [
      { relationId: 'R1', state: 'explicit', source: 'initial', evidence: '직접 표현' },
      {
        relationId: 'R2',
        state: 'entailed',
        source: 'initial',
        evidence: '여러 표현을 결합한 근거',
      },
    ];

    const normalized = normalizeEvaluationResult(raw, loaded.gold);

    expect(normalized.snapshot.relationStates.map((relation) => relation.state)).toEqual([
      'explicit',
      'entailed',
    ]);
  });

  it('explicitErrors는 모델 값을 버리고 contradicted 관계 전체에서 파생한다', () => {
    const raw = evaluation('ERROR', 1, { questionType: 'CORRECTIVE' });
    raw.snapshot.relationStates[0] = {
      relationId: 'R1',
      state: 'contradicted',
      source: 'initial',
      evidence: 'R1을 뒤집은 표현',
    };
    raw.snapshot.explicitErrors = [{
      description: '모델이 임의로 만든 중복 오류',
      relatedRelationIds: ['R2'],
      evidence: '신뢰하지 않을 값',
    }];

    const normalized = normalizeEvaluationResult(raw, loaded.gold);

    expect(normalized.snapshot.explicitErrors).toHaveLength(2);
    expect(normalized.snapshot.explicitErrors.map((error) => error.relatedRelationIds)).toEqual([
      ['R1'],
      ['R2'],
    ]);
    expect(normalized.snapshot.explicitErrors).not.toContainEqual(
      expect.objectContaining({ description: '모델이 임의로 만든 중복 오류' }),
    );
  });

  it('질문 예산이 소진되면 모델이 만든 질문도 코드에서 제거한다', () => {
    const raw = evaluation('UNCLEAR', 4);
    raw.snapshot.relationStates[1] = { relationId: 'R2', state: 'unknown' };
    const result = validateEvaluationResult(raw, {
      canAskQuestion: false,
      expectedTurn: 4,
      gold: loaded.gold,
    });

    expect(result.targetIssue).not.toBeNull();
    expect(result.nextQuestion).toBeNull();
  });

  it('UNCLEAR targetIssue는 unknown 관계 하나만 선택해야 한다', () => {
    const valid = validateEvaluationResult(evaluation('UNCLEAR', 1), {
      canAskQuestion: true,
      expectedTurn: 1,
      gold: loaded.gold,
    });
    expect(valid.targetIssue?.relatedRelationIds).toEqual(['R2']);

    const nonUnknownTarget = evaluation('UNCLEAR', 1);
    nonUnknownTarget.targetIssue = {
      description: '이미 확인된 관계',
      relatedRelationIds: ['R1'],
    };
    expect(() =>
      validateEvaluationResult(nonUnknownTarget, {
        canAskQuestion: true,
        expectedTurn: 1,
        gold: loaded.gold,
      }),
    ).toThrow(/exactly one unknown relation/);

    const multipleTargets = evaluation('UNCLEAR', 1);
    multipleTargets.targetIssue = {
      description: '여러 관계',
      relatedRelationIds: ['R1', 'R2'],
    };
    expect(() =>
      validateEvaluationResult(multipleTargets, {
        canAskQuestion: true,
        expectedTurn: 1,
        gold: loaded.gold,
      }),
    ).toThrow(/exactly one unknown relation/);
  });

  it('ERROR targetIssue는 contradicted 관계만 선택해야 한다', () => {
    const raw = evaluation('ERROR', 1, { questionType: 'CORRECTIVE' });
    raw.targetIssue = { description: '오류가 아닌 관계', relatedRelationIds: ['R1'] };

    expect(() =>
      validateEvaluationResult(raw, {
        canAskQuestion: true,
        expectedTurn: 1,
        gold: loaded.gold,
      }),
    ).toThrow(/select contradicted relations/);
  });

  it('v7은 error_only 미언급을 질문하지 않고 PASS로 허용한다', () => {
    const gold = {
      ...loaded.gold,
      coreRelations: loaded.gold.coreRelations.map((relation, index) => ({
        ...relation,
        diagnosticRole: index === 0 ? 'required' as const : 'error_only' as const,
      })),
    };

    const result = validateEvaluationResult(evaluation('PASS', 1), {
      canAskQuestion: true,
      expectedTurn: 1,
      gold,
      enforceDiagnosticRoles: true,
    });

    expect(result.status).toBe('PASS');
    expect(result.snapshot.relationStates[1]?.state).toBe('unknown');
  });

  it('v7은 required 미언급만 UNCLEAR 대상으로 허용한다', () => {
    const gold = {
      ...loaded.gold,
      coreRelations: loaded.gold.coreRelations.map((relation, index) => ({
        ...relation,
        diagnosticRole: index === 0 ? 'required' as const : 'error_only' as const,
      })),
    };

    expect(() => validateEvaluationResult(evaluation('UNCLEAR', 1), {
      canAskQuestion: true,
      expectedTurn: 1,
      gold,
      enforceDiagnosticRoles: true,
    })).toThrow(/must select a required relation/);

    const requiredUnknown = evaluation('UNCLEAR', 1);
    requiredUnknown.snapshot.relationStates = [
      { relationId: 'R1', state: 'unknown' },
      { relationId: 'R2', state: 'explicit', source: 'initial', evidence: 'R2 설명' },
    ];
    requiredUnknown.targetIssue = { description: 'R1 확인', relatedRelationIds: ['R1'] };
    expect(validateEvaluationResult(requiredUnknown, {
      canAskQuestion: true,
      expectedTurn: 1,
      gold,
      enforceDiagnosticRoles: true,
    }).status).toBe('UNCLEAR');
  });

  it('v7은 error_only의 명시적 모순을 ERROR로 유지한다', () => {
    const gold = {
      ...loaded.gold,
      coreRelations: loaded.gold.coreRelations.map((relation, index) => ({
        ...relation,
        diagnosticRole: index === 0 ? 'required' as const : 'error_only' as const,
      })),
    };

    expect(validateEvaluationResult(evaluation('ERROR', 1, {
      questionType: 'CORRECTIVE',
    }), {
      canAskQuestion: true,
      expectedTurn: 1,
      gold,
      enforceDiagnosticRoles: true,
    }).status).toBe('ERROR');
  });

  it('v6을 기본으로 유지하면서 v7 프롬프트를 별도로 로드한다', () => {
    expect(loadDialoguePrompt()).toBe(loadDialoguePrompt('dialogue-prompt-v6'));
    expect(loadDialoguePrompt('dialogue-prompt-v7')).toContain('error_only');
  });

  it('PASS 화면에는 개선 제안 없이 고정된 통과 피드백만 표시한다', () => {
    const result = evaluation('PASS', 1);
    result.studentFeedback = '잘했습니다. 더 완전하게 쓰려면 세부를 보완하세요.';
    const text = formatStudentStep({
      evaluation: result,
      call: MOCK_CALL,
      questionShown: null,
      terminal: true,
      finalStatus: 'PASS',
    });

    expect(text).toBe(PASS_STUDENT_FEEDBACK);
    expect(text).not.toMatch(/더 완전|보완|개선/);
  });

  it('잘못된 structured output을 거부하고 안전하게 ABORTED로 기록할 수 있다', async () => {
    expect(() =>
      validateEvaluationResult(
        { ...evaluation('PASS', 1), nextQuestion: { type: 'DIAGNOSTIC', text: '잘못된 질문' } },
        { canAskQuestion: true, expectedTurn: 1, gold: loaded.gold },
      ),
    ).toThrow(/PASS must not include/);

    const { engine, logger } = engineFor([new Error('malformed structured output')]);
    await expect(engine.submitInitial('응답')).rejects.toThrow('malformed');
    const aborted = engine.abort();
    expect(aborted.finalStatus).toBe('ABORTED');
    expect(logger.sessions[0]?.finalStatus).toBe('ABORTED');
  });

  it('사용자가 중단하면 API 호출 없이 ABORTED로 한 번 기록한다', () => {
    const { engine, evaluator, logger } = engineFor([]);

    engine.abort();
    engine.abort();

    expect(evaluator.inputs).toHaveLength(0);
    expect(logger.sessions).toHaveLength(1);
    expect(logger.sessions[0]).toMatchObject({ finalStatus: 'ABORTED', initialResponse: '' });
  });

  it('최소 진단 골드에는 상세 명제·간선·영역을 포함하지 않는다', () => {
    expect(Object.keys(loaded.gold).sort()).toEqual([
      'centralObject',
      'centralStory',
      'coreRelations',
      'keyMappings',
      'paragraphId',
      'paragraphText',
      'supportingConcepts',
    ]);
    expect(JSON.stringify(loaded.gold)).not.toMatch(/propositions|edges|regions/);
  });

  it('도파민 전체 지문은 네 문단을 원문 순서로 해석한다', () => {
    const options = parseDialogueCliArgs(['--passage', DOPAMINE_PASSAGE_ID]);

    expect(resolveDialogueParagraphIds(options)).toEqual(DOPAMINE_PARAGRAPH_IDS);
    expect(DOPAMINE_PARAGRAPH_IDS.map((id) => loadDiagnosticGold(id).gold.paragraphId)).toEqual(
      DOPAMINE_PARAGRAPH_IDS,
    );
  });

  it('도파민 네 문단의 최소 골드는 상세 분석 구조를 포함하지 않는다', () => {
    for (const paragraphId of DOPAMINE_PARAGRAPH_IDS) {
      const gold = loadDiagnosticGold(paragraphId).gold;
      expect(gold.paragraphText.length).toBeGreaterThan(0);
      expect(gold.centralObject.length).toBeGreaterThan(0);
      expect(gold.centralStory.length).toBeGreaterThan(0);
      expect(gold.coreRelations.length).toBeGreaterThan(0);
      expect(JSON.stringify(gold)).not.toMatch(/propositions|edges|regions/);
    }
  });

  it('--paragraph와 --passage를 동시에 지정하지 못하게 한다', () => {
    expect(() =>
      parseDialogueCliArgs([
        '--paragraph',
        'dopamine-motor-control-p1',
        '--passage',
        DOPAMINE_PASSAGE_ID,
      ]),
    ).toThrow(/함께 사용할 수 없습니다/);
  });

  it('각 학생 입력은 evaluator 호출 정확히 한 번만 유발한다', async () => {
    const { engine, evaluator } = engineFor([
      call(evaluation('UNCLEAR', 1)),
      call(evaluation('PASS', 2, { source: 'diagnostic' })),
    ]);
    const spy = vi.spyOn(evaluator, 'evaluate');

    await engine.submitInitial('최초');
    expect(spy).toHaveBeenCalledTimes(1);
    await engine.submitFollowUp('후속');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('OpenAI evaluator는 SDK 재시도를 끄고 호출별 timeout을 전달한다', async () => {
    const error = Object.create(OpenAI.APIConnectionError.prototype) as Error;
    const parse = vi.fn(async () => Promise.reject(error));
    const client = { responses: { parse } } as unknown as OpenAI;
    const evaluator = new OpenAIDialogueEvaluator({
      client,
      timeoutMs: 60_000,
      maxTransportRetries: 0,
    });

    await expect(evaluator.evaluate({
      gold: loaded.gold,
      goldVersion: loaded.version,
      goldHash: loaded.hash,
      initialResponse: '학생 응답',
      history: [],
      turn: 1,
      questionsAsked: 0,
      maxQuestions: 3,
    })).rejects.toBe(error);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]?.[1]).toEqual({ timeout: 60_000, maxRetries: 0 });
    expect(evaluator.model).toBe(DEFAULT_DIALOGUE_OPENAI_MODEL);
  });

  it('재시도 가능한 전송 실패를 한 번 기록한 뒤 성공 결과를 반환한다', async () => {
    const error = Object.create(OpenAI.APIConnectionError.prototype) as Error;
    const pass = evaluation('PASS', 1);
    const { explicitErrors: _ignored, ...snapshotWithoutErrors } = pass.snapshot;
    const parse = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        output_parsed: { ...pass, snapshot: snapshotWithoutErrors },
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        },
      });
    const client = { responses: { parse } } as unknown as OpenAI;
    const evaluator = new OpenAIDialogueEvaluator({
      client,
      maxTransportRetries: 1,
      retryDelayMs: 0,
    });

    const evaluated = await evaluator.evaluate({
      gold: loaded.gold,
      goldVersion: loaded.version,
      goldHash: loaded.hash,
      initialResponse: '학생 응답',
      history: [],
      turn: 1,
      questionsAsked: 0,
      maxQuestions: 3,
    });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(evaluated.result.status).toBe('PASS');
    expect(evaluated.call.attempts).toMatchObject([
      { attempt: 1, outcome: 'error', error: { type: 'connection', retryable: true } },
      { attempt: 2, outcome: 'success' },
    ]);
  });

  it('OpenAI 출력에는 오류 목록을 요구하지 않고 contradicted 관계에서 파생한다', async () => {
    const parse = vi.fn(async () => ({
      output_parsed: {
        status: 'ERROR',
        snapshot: {
          turn: 1,
          centralObjectRepresentation: '절대정신의 세 형태',
          centralStoryRepresentation: null,
          expressedClaims: [],
          relationStates: [
            {
              relationId: 'R1',
              state: 'explicit',
              source: 'initial',
              evidence: '세 형태를 직접 표현',
            },
            {
              relationId: 'R2',
              state: 'contradicted',
              source: 'initial',
              evidence: '종합 방향을 반대로 표현',
            },
          ],
          unresolvedQuestions: [],
        },
        decisionSummary: 'R2가 명시적으로 뒤집혔다.',
        targetIssue: { description: 'R2 교정', relatedRelationIds: ['R2'] },
        nextQuestion: { type: 'CORRECTIVE', text: '관계 방향을 다시 설명해 보세요.' },
        studentFeedback: '이 관계를 다시 확인해 보세요.',
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        input_tokens_details: { cached_tokens: 20, cache_write_tokens: 30 },
      },
    }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const evaluator = new OpenAIDialogueEvaluator({ client });

    const evaluated = await evaluator.evaluate({
      gold: loaded.gold,
      goldVersion: loaded.version,
      goldHash: loaded.hash,
      initialResponse: '학생 응답',
      history: [],
      turn: 1,
      questionsAsked: 0,
      maxQuestions: 3,
    });

    expect(evaluated.result.snapshot.explicitErrors).toEqual([
      expect.objectContaining({
        relatedRelationIds: ['R2'],
        evidence: '종합 방향을 반대로 표현',
      }),
    ]);
    expect(evaluated.call.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheWriteTokens: 30,
      cacheReadTokens: 20,
    });
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('OpenAI 의미 계약 위반은 parsed output을 보존한 전용 오류로 거부한다', async () => {
    const outputParsed = {
      status: 'UNCLEAR' as const,
      snapshot: {
        turn: 1,
        centralObjectRepresentation: '절대정신의 세 형태',
        centralStoryRepresentation: null,
        expressedClaims: [],
        relationStates: [
          {
            relationId: 'R1',
            state: 'explicit' as const,
            source: 'initial' as const,
            evidence: '세 형태를 직접 표현',
          },
          {
            relationId: 'R2',
            state: 'unknown' as const,
            source: null,
            evidence: null,
          },
        ],
        unresolvedQuestions: ['R2 확인 필요'],
      },
      decisionSummary: 'R2는 아직 확인되지 않았다.',
      targetIssue: null,
      nextQuestion: { type: 'DIAGNOSTIC' as const, text: 'R2를 설명해 보세요.' },
      studentFeedback: '이 관계를 조금 더 설명해 보세요.',
    };
    const parse = vi.fn(async () => ({
      output_parsed: outputParsed,
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        input_tokens_details: { cached_tokens: 0 },
      },
    }));
    const client = { responses: { parse } } as unknown as OpenAI;
    const evaluator = new OpenAIDialogueEvaluator({ client });

    let caught: unknown;
    try {
      await evaluator.evaluate({
        gold: loaded.gold,
        goldVersion: loaded.version,
        goldHash: loaded.hash,
        initialResponse: '학생 응답',
        history: [],
        turn: 1,
        questionsAsked: 0,
        maxQuestions: 3,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DialogueEvaluationContractError);
    expect(caught).toMatchObject({
      message: 'dialogue evaluation: non-PASS result requires targetIssue',
      parsedOutput: outputParsed,
    });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
