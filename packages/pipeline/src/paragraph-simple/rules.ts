import {
  SimpleOutputSchema,
  type SimpleAction, type SimpleError, type SimpleEvaluationInput, type SimpleOutput, type SimpleStage,
} from './schema.js';

/** 행동 표. 프롬프트의 표와 같다. */
export function expectedAction(stage: SimpleStage, output: Pick<SimpleOutput, 'category' | 'targetErrorResolved'>): SimpleAction {
  const { category } = output;
  switch (stage) {
    case 'INITIAL':
    case 'RETRY':
      if (category === 'CAPTURED') return 'PRAISE';
      if (category === 'IRRELEVANT' || category === 'COPY') return stage === 'INITIAL' ? 'RETRY_PROMPT' : 'CLOSE_NO_RESPONSE';
      if (category === 'GAP') return 'GAP_QUESTION';
      if (category === 'ONE_ERROR') return 'CORRECTION_QUESTION';
      return 'CLOSE_ERRORS';
    case 'AFTER_CORRECTION':
      if (output.targetErrorResolved === true && category === 'CAPTURED') return 'PRAISE';
      if (output.targetErrorResolved === true && category === 'GAP') return 'GAP_QUESTION';
      return 'CLOSE_ERRORS';
    case 'AFTER_GAP':
      if (category === 'CAPTURED') return 'PRAISE';
      if (category === 'ONE_ERROR' || category === 'MULTI_ERROR') return 'CLOSE_ERRORS';
      return 'CLOSE_GAP';
  }
}

/** 출력 검증. 문제 목록을 돌려주며, 빈 배열이면 통과다. */
export function validateSimpleOutput(input: SimpleEvaluationInput, output: SimpleOutput): string[] {
  const problems: string[] = [];
  const expected = expectedAction(input.stage, output);
  if (output.action !== expected) problems.push(`action이 행동 표와 다르다: stage=${input.stage}, category=${output.category}, targetErrorResolved=${String(output.targetErrorResolved)} 이면 ${expected}여야 하는데 ${output.action}이다.`);

  const afterClose = output.action === 'CLOSE_ERRORS' && (input.stage === 'AFTER_CORRECTION' || input.stage === 'AFTER_GAP');
  if (afterClose) {
    if (output.errors.length < 1) problems.push('이 단계의 CLOSE_ERRORS는 남은 오류가 errors에 1개 이상 있어야 한다.');
  } else if (output.category === 'ONE_ERROR') {
    if (output.errors.length !== 1) problems.push('ONE_ERROR는 errors가 정확히 1개여야 한다.');
  } else if (output.category === 'MULTI_ERROR') {
    if (output.errors.length < 2) problems.push('MULTI_ERROR는 errors가 2개 이상이어야 한다.');
  } else if (output.errors.length !== 0) problems.push(`${output.category}는 errors가 비어 있어야 한다.`);

  if (output.category === 'GAP' && output.gap === null) problems.push('GAP은 gap이 null이 아니어야 한다.');
  if (output.category !== 'GAP' && output.gap !== null) problems.push('GAP이 아니면 gap은 null이어야 한다.');
  if (input.stage === 'AFTER_CORRECTION' ? output.targetErrorResolved === null : output.targetErrorResolved !== null) {
    problems.push('targetErrorResolved는 AFTER_CORRECTION에서만 true/false이고 그 밖에는 null이어야 한다.');
  }

  const studentTexts = input.dialogue.filter(m => m.role === 'student').map(m => m.text);
  output.errors.forEach((e, i) => {
    if (!studentTexts.some(t => t.includes(e.studentQuote)) || e.studentQuote === '') problems.push(`errors[${i}].studentQuote가 학생 발화의 연속 부분 문자열이 아니다.`);
    if (e.sourceQuote === '' || !input.targetParagraph.text.includes(e.sourceQuote)) problems.push(`errors[${i}].sourceQuote가 대상 문단의 연속 부분 문자열이 아니다.`);
  });
  if (output.gap && (output.gap.sourceQuote === '' || !input.targetParagraph.text.includes(output.gap.sourceQuote))) problems.push('gap.sourceQuote가 대상 문단의 연속 부분 문자열이 아니다.');

  const needsSummary = output.action === 'CLOSE_ERRORS' || output.action === 'CLOSE_NO_RESPONSE';
  if (needsSummary ? !output.coreSummary?.trim() : output.coreSummary !== null) problems.push('coreSummary는 CLOSE_ERRORS·CLOSE_NO_RESPONSE에서만 비어 있지 않은 문자열이고 그 밖에는 null이어야 한다.');
  if (!output.message.trim()) problems.push('message가 비어 있다.');
  return problems;
}

/** 원출력을 스키마로 읽고 검증한다. 스키마 위반도 문제 목록으로 돌려준다. */
export function checkSimpleOutput(input: SimpleEvaluationInput, raw: unknown): { output: SimpleOutput | null; problems: string[] } {
  const parsed = SimpleOutputSchema.safeParse(raw);
  if (!parsed.success) return { output: null, problems: [`출력이 스키마와 다르다: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`] };
  return { output: parsed.data, problems: validateSimpleOutput(input, parsed.data) };
}

export type SimpleOutcome = 'CAPTURED' | 'NO_RESPONSE' | 'GAP_REVEALED' | 'ERRORS_REVEALED';
export const MAX_SIMPLE_QUESTIONS = 2;

export interface SimpleParagraphState {
  stage: SimpleStage;
  retryUsed: boolean;
  questionsAsked: number;
  targetError: SimpleError | null;
  /** 구멍 질문에서 물은 빈 곳. 답한 뒤 판정에 gap이 없어도(무관·복사) 마무리 표시에 쓴다. */
  targetGap: NonNullable<SimpleOutput['gap']> | null;
  done: boolean;
  outcome: SimpleOutcome | null;
  /** 마무리 행동(CLOSE_GAP, CLOSE_ERRORS)에서만 채워지는 표시 구절. */
  revealQuotes: string[];
}

export function initialSimpleState(): SimpleParagraphState {
  return { stage: 'INITIAL', retryUsed: false, questionsAsked: 0, targetError: null, targetGap: null, done: false, outcome: null, revealQuotes: [] };
}

/** 검증을 통과한 출력을 문단 상태에 적용한다. 순수 함수. */
export function applySimpleAction(state: SimpleParagraphState, output: SimpleOutput): SimpleParagraphState {
  if (state.done) throw new Error('이미 끝난 문단에는 행동을 적용할 수 없다.');
  const next: SimpleParagraphState = { ...state, revealQuotes: [] };
  switch (output.action) {
    case 'PRAISE': return { ...next, done: true, outcome: 'CAPTURED' };
    case 'RETRY_PROMPT': return { ...next, stage: 'RETRY', retryUsed: true };
    case 'CLOSE_NO_RESPONSE': return { ...next, done: true, outcome: 'NO_RESPONSE' };
    case 'GAP_QUESTION':
    case 'CORRECTION_QUESTION': {
      if (state.questionsAsked >= MAX_SIMPLE_QUESTIONS) throw new Error('불변식 위반: 문단당 질문은 최대 2회다.');
      if (output.action === 'GAP_QUESTION') return { ...next, stage: 'AFTER_GAP', questionsAsked: state.questionsAsked + 1, targetGap: output.gap };
      return { ...next, stage: 'AFTER_CORRECTION', questionsAsked: state.questionsAsked + 1, targetError: output.errors[0] ?? null };
    }
    case 'CLOSE_GAP': return { ...next, done: true, outcome: 'GAP_REVEALED', revealQuotes: [...new Set([output.gap ?? state.targetGap].filter(g => g !== null).map(g => g.sourceQuote))] };
    case 'CLOSE_ERRORS': return { ...next, done: true, outcome: 'ERRORS_REVEALED', revealQuotes: output.errors.map(e => e.sourceQuote) };
  }
}
