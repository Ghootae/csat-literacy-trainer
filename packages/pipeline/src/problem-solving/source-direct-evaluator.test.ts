import { describe, expect, it } from 'vitest';

import {
  SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION,
  adaptSourceDirectDiagnosticOutput,
  applySourceDirectProblemEvaluatorTurn,
  assertNoStructuredProblemGold,
  createSourceDirectProblemEvaluatorInput,
  validateSourceDirectProblemEvaluatorOutput,
  type SourceDirectDiagnosticOutput,
  type SourceDirectProblemBundle,
} from './source-direct-evaluator.js';
import {
  OpenAISourceDirectProblemEvaluator,
  SourceDirectProblemEvaluatorError,
  createSourceDirectProblemRequestContent,
} from './source-direct-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
} from './session.js';

const source: SourceDirectProblemBundle = {
  schemaVersion: 'source-direct-problem-bundle-v2',
  questionId: 'Q1',
  questionNumber: 1,
  passageId: 'P1',
  title: '원문 직접 테스트',
  exam: '테스트',
  passage: '용액 A와 B의 투입 속도를 조절하면 두 용액의 혼합 비율을 일정하게 유지할 수 있다.',
  stem: '윗글의 내용과 일치하지 않는 것은?',
  stemPolarity: 'SELECT_INCORRECT',
  scenario: '두 용액이 Y자 관에서 합류한다.',
  media: [{
    mediaId: 'MEDIA1',
    url: 'https://example.com/source.png',
    mimeType: 'image/png',
    width: 640,
    height: 480,
    placement: { scope: 'SCENARIO', supplementIndex: 0 },
  }, {
    mediaId: 'MEDIA2',
    url: 'https://example.com/passage.png',
    mimeType: 'image/png',
    width: 320,
    height: 200,
    placement: { scope: 'PASSAGE' },
  }],
  choices: [
    { choiceId: 'C1', position: 1, text: '투입 속도를 조절해 혼합 비율을 일정하게 유지한다.' },
    { choiceId: 'C2', position: 2, text: '투입 속도를 조절하면 혼합 비율이 계속 달라진다.' },
  ],
  answerChoiceId: 'C2',
  officialExplanation: '지문은 속도 조절의 목적을 혼합 비율 유지라고 설명하므로 ②가 일치하지 않는다.',
};

function wrongSession() {
  return submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: 'S1',
    questionId: source.questionId,
    answerChoiceId: source.answerChoiceId,
  }), {
    initialChoiceId: 'C1',
    rationale: '속도를 조절하면 비율이 달라진다고 생각했습니다.',
  });
}

function inputFor(
  session = wrongSession(),
  promptVersion: 'source-direct-problem-dialogue-prompt-v2' | 'source-direct-problem-dialogue-prompt-v3' =
    SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
) {
  return createSourceDirectProblemEvaluatorInput({
    evaluationMode: 'DIAGNOSE_PATH',
    session,
    source,
    promptVersion,
  });
}

function diagnosticOutput(
  input: ReturnType<typeof inputFor>,
  overrides: Partial<SourceDirectDiagnosticOutput> = {},
): SourceDirectDiagnosticOutput {
  return {
    schemaVersion: 'source-direct-problem-evaluator-output-v2',
    mode: 'DIAGNOSE_PATH',
    basedOnObservationIds: input.observations.map((item) => item.observationId),
    assessment: 'INSUFFICIENT_EVIDENCE',
    learningState: 'PATH_UNCLEAR',
    divergenceLayer: null,
    reason: '학생이 속도와 혼합 비율의 관계를 어떻게 이해했는지 불분명하다.',
    reconstructedPath: '속도를 조절한다는 표현을 보고 ①을 선택했으나 관계 해석은 불명확하다.',
    studentEvidence: [{
      observationId: input.observations[0]!.observationId,
      quote: '비율이 달라진다고 생각했습니다.',
    }],
    sourceEvidence: [],
    nextAction: {
      type: 'ASK_DIAGNOSTIC',
      question: '속도 조절과 혼합 비율 사이의 관계를 어떻게 이해했나요?',
      purpose: '학생이 적용한 관계를 확인한다.',
    },
    ...overrides,
  };
}

describe('source-direct problem evaluator contract', () => {
  it('완전한 원문·이미지·정답·공식 해설을 전달하되 구조화 문제 골드는 포함하지 않는다', () => {
    const input = inputFor();
    const serialized = JSON.stringify(input);

    expect(input.source).toEqual(source);
    expect(input.source.media.map((media) => media.mediaId)).toEqual(['MEDIA1', 'MEDIA2']);
    expect(input.sessionState.answerChoiceId).toBe('C2');
    for (const forbidden of [
      'optionClaims', 'itemInferences', 'referencePath', 'sufficientGroundSets',
      'representativeWrongPaths', 'supplementalExplanationInferences', 'goldRefs',
    ]) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
    expect(() => assertNoStructuredProblemGold(input)).not.toThrow();
  });

  it('복수 이미지를 ID·원자료 위치 표지와 일대일 순서로 요청에 넣는다', () => {
    const content = createSourceDirectProblemRequestContent(inputFor());

    expect(content.slice(1)).toEqual([
      { type: 'input_text', text: '[SOURCE_MEDIA MEDIA1 | SCENARIO[0]]' },
      {
        type: 'input_image',
        image_url: 'https://example.com/source.png',
        detail: 'high',
      },
      { type: 'input_text', text: '[SOURCE_MEDIA MEDIA2 | PASSAGE]' },
      {
        type: 'input_image',
        image_url: 'https://example.com/passage.png',
        detail: 'high',
      },
    ]);
    expect(String(content[0]?.['text'])).not.toContain('Y자 관 모식도');
    expect(String(content[0]?.['text'])).not.toContain('https://example.com/source.png');
  });

  it('운영 기본값은 v3이며 필요하면 과거 v2를 명시할 수 있다', () => {
    expect(inputFor().promptVersion).toBe('source-direct-problem-dialogue-prompt-v3');
    expect(inputFor(wrongSession(), SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION).promptVersion)
      .toBe('source-direct-problem-dialogue-prompt-v2');
  });

  it('선택한 v3 프롬프트 전문과 버전을 호출·감사 메타데이터에 보존한다', async () => {
    const input = inputFor(wrongSession(), SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION);
    let seenInstructions = '';
    const evaluator = new OpenAISourceDirectProblemEvaluator({
      promptVersion: SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION,
      maxRetries: 0,
      transport: {
        async parse(options) {
          seenInstructions = options.instructions;
          return { outputParsed: diagnosticOutput(input) };
        },
      },
    });

    const call = await evaluator.evaluate(input);
    const adapted = adaptSourceDirectDiagnosticOutput({
      evaluatorInput: input,
      rawOutput: call.rawOutput,
      output: call.result as SourceDirectDiagnosticOutput,
    });

    expect(seenInstructions).toContain('# source-direct-problem-dialogue-prompt-v3');
    expect(seenInstructions).toContain('확인되지 않은 판단 내용은');
    expect(call.call.promptVersion).toBe(SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION);
    expect(adapted.audit.promptVersion).toBe(SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION);
  });

  it('입력과 evaluator의 프롬프트 버전이 다르면 호출 전에 거부한다', async () => {
    const evaluator = new OpenAISourceDirectProblemEvaluator({
      promptVersion: SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION,
      transport: {
        async parse() {
          throw new Error('호출되면 안 된다.');
        },
      },
    });

    await expect(evaluator.evaluate(inputFor(
      wrongSession(),
      SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION,
    ))).rejects.toThrow(/프롬프트 버전 불일치/);
  });

  it('중복 이미지 ID와 존재하지 않는 원자료 위치를 거부한다', () => {
    const duplicated = structuredClone(source);
    duplicated.media[1] = { ...duplicated.media[1]!, mediaId: 'MEDIA1' };
    const invalidChoice = structuredClone(source);
    invalidChoice.media[1] = {
      ...invalidChoice.media[1]!,
      placement: { scope: 'CHOICE', choiceId: 'C9' },
    };
    const invalidScenario = structuredClone(source);
    invalidScenario.media[0] = {
      ...invalidScenario.media[0]!,
      placement: { scope: 'SCENARIO', supplementIndex: 1 },
    };

    expect(() => createSourceDirectProblemEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), source: duplicated,
    })).toThrow(/미디어 ID가 중복/);
    expect(() => createSourceDirectProblemEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), source: invalidChoice,
    })).toThrow(/존재하지 않는 선지/);
    expect(() => createSourceDirectProblemEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), source: invalidScenario,
    })).toThrow(/supplementIndex는 0/);
  });

  it('중첩된 구조화 문제 골드 필드가 런타임 경계에 들어오면 거부한다', () => {
    expect(() => assertNoStructuredProblemGold({
      source,
      hidden: { optionClaims: [] },
    })).toThrow(/구조화 문제 골드/);
  });

  it('모호한 근거는 진단 질문으로 투영하고 학생 응답 경계에서 멈춘다', () => {
    const session = wrongSession();
    const input = inputFor(session);
    const output = diagnosticOutput(input);
    const adapted = adaptSourceDirectDiagnosticOutput({
      evaluatorInput: input,
      rawOutput: output,
      output,
    });
    const asking = applySourceDirectProblemEvaluatorTurn(session, adapted);

    expect(asking.phase).toBe('AWAITING_STUDENT_RESPONSE');
    expect(asking.pendingAction).toEqual(expect.objectContaining({
      type: 'ASK_DIAGNOSTIC',
      question: '속도 조절과 혼합 비율 사이의 관계를 어떻게 이해했나요?',
    }));
  });

  it('경로만 명확해진 상태에서는 학생이 실제로 수정하기 전 재선택을 허용하지 않는다', () => {
    const input = inputFor();
    const output = diagnosticOutput(input, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      divergenceLayer: 'INFERENCE_TRANSFORMATION',
      sourceEvidence: [{ kind: 'TEXT', source: 'PASSAGE', quote: '혼합 비율을 일정하게 유지' }],
      nextAction: { type: 'REQUEST_RESELECTION', message: '다시 선택해 주세요.' },
    });

    expect(() => validateSourceDirectProblemEvaluatorOutput(output, input))
      .toThrow(/판정과 다음 행동/);
  });

  it('교정 질문에 대한 실제 수정 응답 뒤에만 재선택으로 이동한다', () => {
    const session = wrongSession();
    const firstInput = inputFor(session);
    const correction = diagnosticOutput(firstInput, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      divergenceLayer: 'INFERENCE_TRANSFORMATION',
      sourceEvidence: [{ kind: 'TEXT', source: 'PASSAGE', quote: '혼합 비율을 일정하게 유지' }],
      nextAction: {
        type: 'ASK_CORRECTIVE',
        question: '지문에서 속도 조절의 목적은 비율 변화인가요, 비율 유지인가요?',
        purpose: '반대로 적용한 관계를 교정한다.',
      },
    });
    const asking = applySourceDirectProblemEvaluatorTurn(session,
      adaptSourceDirectDiagnosticOutput({ evaluatorInput: firstInput, rawOutput: correction, output: correction }));
    const answered = submitProblemActionResponse(asking, '비율을 일정하게 유지하는 것입니다.');
    const secondInput = inputFor(answered);
    const corrected = diagnosticOutput(secondInput, {
      assessment: 'NO_ERROR_DETECTED',
      learningState: 'CORRECTED',
      divergenceLayer: null,
      reconstructedPath: '학생이 속도 조절의 목적을 혼합 비율 유지로 바로잡았다.',
      studentEvidence: [{
        observationId: secondInput.observations.at(-1)!.observationId,
        quote: '비율을 일정하게 유지',
      }],
      sourceEvidence: [{ kind: 'TEXT', source: 'PASSAGE', quote: '혼합 비율을 일정하게 유지' }],
      nextAction: { type: 'REQUEST_RESELECTION', message: '수정한 관계를 반영해 다시 선택해 주세요.' },
    });
    const reselecting = applySourceDirectProblemEvaluatorTurn(answered,
      adaptSourceDirectDiagnosticOutput({ evaluatorInput: secondInput, rawOutput: corrected, output: corrected }));

    expect(reselecting.phase).toBe('AWAITING_RESELECTION');
    expect(reselecting.pendingAction?.type).toBe('REQUEST_RESELECTION');
  });

  it('두 번째 질문 답변에서 수정되면 새 질문은 막고 재선택은 허용한다', () => {
    const firstInput = inputFor();
    const firstQuestion = diagnosticOutput(firstInput);
    const firstAsking = applySourceDirectProblemEvaluatorTurn(wrongSession(),
      adaptSourceDirectDiagnosticOutput({
        evaluatorInput: firstInput,
        rawOutput: firstQuestion,
        output: firstQuestion,
      }));
    const firstAnswer = submitProblemActionResponse(firstAsking, '속도를 바꾸면 비율도 달라진다고 봤습니다.');
    const secondInput = inputFor(firstAnswer);
    const secondQuestion = diagnosticOutput(secondInput, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      divergenceLayer: 'INFERENCE_TRANSFORMATION',
      studentEvidence: [{
        observationId: secondInput.observations.at(-1)!.observationId,
        quote: '비율도 달라진다고 봤습니다.',
      }],
      sourceEvidence: [{ kind: 'TEXT', source: 'PASSAGE', quote: '혼합 비율을 일정하게 유지' }],
      nextAction: {
        type: 'ASK_CORRECTIVE',
        question: '속도 조절의 목적이 비율 변화인지 비율 유지인지 다시 확인할까요?',
        purpose: '반대로 적용한 관계를 교정한다.',
      },
    });
    const secondAsking = applySourceDirectProblemEvaluatorTurn(firstAnswer,
      adaptSourceDirectDiagnosticOutput({
        evaluatorInput: secondInput,
        rawOutput: secondQuestion,
        output: secondQuestion,
      }));
    const correctedAnswer = submitProblemActionResponse(
      secondAsking,
      '제가 반대로 이해했습니다. 속도 조절의 목적은 혼합 비율을 일정하게 유지하는 것입니다.',
    );
    const finalInput = inputFor(correctedAnswer);

    expect(finalInput.sessionState.questionsUsedThisAttempt).toBe(2);
    expect(finalInput.sessionState.allowedActionTypes).toEqual([
      'REQUEST_RESELECTION',
      'DIRECT_COACHING',
      'EXPLAIN_ITEM_BOUNDARY',
    ]);
    expect(finalInput.sessionState.allowedActionTypes).not.toContain('ASK_DIAGNOSTIC');
    expect(finalInput.sessionState.allowedActionTypes).not.toContain('ASK_CORRECTIVE');
  });

  it('학생·원문에 존재하지 않는 인용은 거부한다', () => {
    const input = inputFor();
    const inventedStudentQuote = diagnosticOutput(input, {
      studentEvidence: [{ observationId: 'O1', quote: '학생이 말하지 않은 문장' }],
    });
    const inventedSourceQuote = diagnosticOutput(input, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      sourceEvidence: [{ kind: 'TEXT', source: 'PASSAGE', quote: '원문에 없는 관계' }],
      nextAction: {
        type: 'ASK_CORRECTIVE',
        question: '관계를 다시 확인할까요?',
        purpose: '오류를 교정한다.',
      },
    });

    expect(() => validateSourceDirectProblemEvaluatorOutput(inventedStudentQuote, input))
      .toThrow(/학생 원문과 일치하지 않는 인용/);
    expect(() => validateSourceDirectProblemEvaluatorOutput(inventedSourceQuote, input))
      .toThrow(/원문 자료와 일치하지 않는 인용/);
  });

  it('의미가 같은 유일한 인용의 공백·인용부호만 원문 문자열로 복원한다', () => {
    const input = inputFor();
    const passage = input.source.passage + " 빛을 감지하는 '포토트로핀'은 그늘진 쪽으로 옥신을 수송한다.";
    const sourceWithQuote = { ...input.source, passage };
    const adjustedInput = { ...input, source: sourceWithQuote };
    const output = diagnosticOutput(adjustedInput, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      divergenceLayer: 'PASSAGE_REPRESENTATION',
      sourceEvidence: [{
        kind: 'TEXT',
        source: 'PASSAGE',
        quote: '빛을 감지하는 포토트로핀은 그늘진 쪽으로 옥신을 수송한다.',
      }],
      nextAction: {
        type: 'ASK_CORRECTIVE',
        question: '옥신의 수송 방향을 다시 확인할까요?',
        purpose: '반대로 이해한 수송 방향을 교정한다.',
      },
    });

    const validated = validateSourceDirectProblemEvaluatorOutput(output, adjustedInput);

    expect(validated.sourceEvidence).toEqual([{
      kind: 'TEXT',
      source: 'PASSAGE',
      quote: "빛을 감지하는 '포토트로핀'은 그늘진 쪽으로 옥신을 수송한다.",
    }]);
  });

  it('존재하는 이미지 근거만 허용한다', () => {
    const input = inputFor();
    const valid = diagnosticOutput(input, {
      assessment: 'CLEAR_ERROR',
      learningState: 'PATH_CLARIFIED',
      divergenceLayer: 'VISUAL_REPRESENTATION',
      sourceEvidence: [{
        kind: 'VISUAL',
        mediaId: 'MEDIA2',
        description: '지문 그림의 두 항목 사이에 화살표가 있다.',
      }],
      nextAction: {
        type: 'ASK_CORRECTIVE',
        question: '화살표의 방향을 다시 확인해 볼까요?',
        purpose: '시각 자료의 관계 방향을 교정한다.',
      },
    });
    const invented = {
      ...valid,
      sourceEvidence: [{
        kind: 'VISUAL' as const,
        mediaId: 'MEDIA9',
        description: '존재하지 않는 이미지다.',
      }],
    };

    expect(() => validateSourceDirectProblemEvaluatorOutput(valid, input)).not.toThrow();
    expect(() => validateSourceDirectProblemEvaluatorOutput(invented, input))
      .toThrow(/존재하지 않는 시각 근거/);
  });

  it('계약 검증 실패로 응답을 버려도 과금 사용량과 출력 상한을 보존한다', async () => {
    const input = inputFor();
    let seenMaxOutputTokens = 0;
    const evaluator = new OpenAISourceDirectProblemEvaluator({
      maxRetries: 0,
      maxOutputTokens: 1_234,
      transport: {
        async parse(options) {
          seenMaxOutputTokens = options.maxOutputTokens;
          return {
            outputParsed: diagnosticOutput(input, { basedOnObservationIds: ['NOT-AN-OBSERVATION'] }),
            usage: { inputTokens: 321, outputTokens: 45, cacheReadTokens: 100 },
          };
        },
      },
    });

    try {
      await evaluator.evaluate(input);
      throw new Error('계약 실패가 발생해야 한다.');
    } catch (error) {
      expect(error).toBeInstanceOf(SourceDirectProblemEvaluatorError);
      const failure = error as SourceDirectProblemEvaluatorError;
      expect(failure.call.usage).toEqual({
        inputTokens: 321,
        outputTokens: 45,
        cacheReadTokens: 100,
      });
      expect(failure.rawOutput).toEqual(expect.objectContaining({
        basedOnObservationIds: ['NOT-AN-OBSERVATION'],
      }));
      expect(failure.call.attempts.at(-1)?.errorType).toBe('contract_validation');
    }
    expect(seenMaxOutputTokens).toBe(1_234);
  });
});
