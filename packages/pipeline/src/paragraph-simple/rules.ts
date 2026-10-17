import {
  SimpleOutputSchema,
  type SimpleAction, type SimpleError, type SimpleGap, type SimpleEvaluationInput, type SimpleOutput, type SimpleStage,
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

  if (input.stage === 'AFTER_CORRECTION' ? output.targetErrorResolved === null : output.targetErrorResolved !== null) {
    problems.push('targetErrorResolved는 AFTER_CORRECTION에서만 true/false이고 그 밖에는 null이어야 한다.');
  }

  const studentTexts = input.dialogue.filter(m => m.role === 'student').map(m => m.text);
  output.errors.forEach((e, i) => {
    if (!studentTexts.some(t => t.includes(e.studentQuote)) || e.studentQuote === '') problems.push(`errors[${i}].studentQuote가 학생 발화의 연속 부분 문자열이 아니다.`);
    if (e.sourceQuote === '' || !input.targetParagraph.text.includes(e.sourceQuote)) problems.push(`errors[${i}].sourceQuote가 대상 문단의 연속 부분 문자열이 아니다.`);
  });
  if (output.action === 'GAP_QUESTION') {
    if (output.gaps.length < 1 || output.gaps.length > 2) problems.push('GAP_QUESTION은 gaps가 1개 또는 2개여야 한다.');
    output.gaps.forEach((g, i) => {
      if (!g.description.trim()) problems.push(`gaps[${i}].description이 비어 있다.`);
      if (!g.question.trim()) problems.push(`gaps[${i}].question이 비어 있다.`);
      if (g.sourceQuote === '' || !input.targetParagraph.text.includes(g.sourceQuote)) problems.push(`gaps[${i}].sourceQuote가 대상 문단의 연속 부분 문자열이 아니다.`);
    });
  } else if (output.gaps.length !== 0) problems.push('GAP_QUESTION이 아니면 gaps는 빈 배열이어야 한다.');
  if (input.stage === 'AFTER_GAP') {
    const filled = output.targetGapsFilled;
    if (filled === null || filled.length !== (input.targetGaps?.length ?? 0)) problems.push('targetGapsFilled는 AFTER_GAP에서 targetGaps와 같은 길이의 배열이어야 한다.');
    else if (output.errors.length === 0 && output.category === 'CAPTURED' && !filled.every(Boolean)) problems.push('CAPTURED면 targetGapsFilled가 모두 true여야 한다.');
    else if (output.errors.length === 0 && output.category === 'GAP' && filled.every(Boolean)) problems.push('GAP이면 targetGapsFilled에 false가 하나 이상 있어야 한다.');
    else if ((output.category === 'IRRELEVANT' || output.category === 'COPY') && filled.some(Boolean)) problems.push(`${output.category}면 targetGapsFilled가 모두 false여야 한다.`);
  } else if (output.targetGapsFilled !== null) problems.push('targetGapsFilled는 AFTER_GAP에서만 배열이고 그 밖에는 null이어야 한다.');
  const n = input.targetGaps?.length ?? 0;
  const afterGap = input.stage === 'AFTER_GAP';
  const readings = output.targetGapReadings;
  if (afterGap ? readings === null || readings.length !== n : readings !== null) problems.push('targetGapReadings는 AFTER_GAP에서 targetGaps와 같은 길이의 배열이고 그 밖에는 null이어야 한다.');
  const filledArr = output.targetGapsFilled ?? [];
  output.errors.forEach((e, i) => {
    if (e.gapIndex === null) return;
    if (!afterGap || e.gapIndex < 0 || e.gapIndex >= n) problems.push(`errors[${i}].gapIndex는 AFTER_GAP에서만 null 또는 0 이상 targetGaps 길이 미만의 정수이고 그 밖에는 null이어야 한다.`);
    else if (filledArr[e.gapIndex] !== false) problems.push(`errors[${i}].gapIndex가 가리키는 항목의 targetGapsFilled가 false여야 한다.`);
  });
  const uncovered = filledArr.some((f, k) => !f && !output.errors.some(e => e.gapIndex === k));
  const needsNote = afterGap && output.action === 'CLOSE_ERRORS' && uncovered;
  if (needsNote ? !output.missingNote?.trim() : output.missingNote !== null) problems.push('missingNote는 AFTER_GAP의 CLOSE_ERRORS에서 오류도 채움도 아닌 항목이 있을 때만 비어 있지 않은 문자열이고 그 밖에는 null이어야 한다.');
  const afterQuestion = input.stage === 'AFTER_CORRECTION' || input.stage === 'AFTER_GAP';
  const praiseAfterQuestion = output.action === 'PRAISE' && afterQuestion;
  const needsSummary = output.action === 'CLOSE_ERRORS' || output.action === 'CLOSE_NO_RESPONSE' || output.action === 'CLOSE_GAP' || praiseAfterQuestion;
  if (needsSummary ? !output.coreSummary?.trim() : output.coreSummary !== null) problems.push('coreSummary는 CLOSE_ERRORS·CLOSE_NO_RESPONSE·CLOSE_GAP·질문 뒤 PRAISE에서만 비어 있지 않은 문자열이고 그 밖에는 null이어야 한다.');
  const closeErrors = output.action === 'CLOSE_ERRORS';
  output.errors.forEach((e, i) => {
    if (closeErrors ? !e.feedback.trim() : e.feedback !== '') problems.push(`errors[${i}].feedback은 CLOSE_ERRORS에서만 비어 있지 않은 문자열이고 그 밖에는 빈 문자열이어야 한다.`);
  });
  const needsIntro = closeErrors || output.action === 'CLOSE_GAP' || praiseAfterQuestion;
  if (needsIntro ? !output.coreIntro?.trim() || output.coreIntro.length > 60 : output.coreIntro !== null) problems.push('coreIntro는 CLOSE_ERRORS·CLOSE_GAP·질문 뒤 PRAISE에서만 비어 있지 않은 60자 이하 문자열이고 그 밖에는 null이어야 한다.');
  const noResponse = output.action === 'CLOSE_NO_RESPONSE';
  if (noResponse ? !output.coreSourceQuote || !input.targetParagraph.text.includes(output.coreSourceQuote) : output.coreSourceQuote !== null) problems.push('coreSourceQuote는 CLOSE_NO_RESPONSE에서만 비어 있지 않은 대상 문단의 연속 부분 문자열이고 그 밖에는 null이어야 한다.');
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
  /** 번호 질문으로 물은 빈 곳 목록. 마무리 표시(못 채운 곳의 근거 문장)에 쓴다. */
  targetGaps: SimpleGap[];
  done: boolean;
  outcome: SimpleOutcome | null;
  /** 마무리 행동(CLOSE_GAP, CLOSE_ERRORS, CLOSE_NO_RESPONSE)에서만 채워지는 표시 구절. */
  revealQuotes: string[];
}

export function initialSimpleState(): SimpleParagraphState {
  return { stage: 'INITIAL', retryUsed: false, questionsAsked: 0, targetError: null, targetGaps: [], done: false, outcome: null, revealQuotes: [] };
}

/** 검증을 통과한 출력을 문단 상태에 적용한다. 순수 함수. */
export function applySimpleAction(state: SimpleParagraphState, output: SimpleOutput): SimpleParagraphState {
  if (state.done) throw new Error('이미 끝난 문단에는 행동을 적용할 수 없다.');
  const next: SimpleParagraphState = { ...state, revealQuotes: [] };
  switch (output.action) {
    case 'PRAISE': return { ...next, done: true, outcome: 'CAPTURED' };
    case 'RETRY_PROMPT': return { ...next, stage: 'RETRY', retryUsed: true };
    case 'CLOSE_NO_RESPONSE': return { ...next, done: true, outcome: 'NO_RESPONSE', revealQuotes: output.coreSourceQuote ? [output.coreSourceQuote] : [] };
    case 'GAP_QUESTION':
    case 'CORRECTION_QUESTION': {
      if (state.questionsAsked >= MAX_SIMPLE_QUESTIONS) throw new Error('불변식 위반: 문단당 질문은 최대 2회다.');
      if (output.action === 'GAP_QUESTION') return { ...next, stage: 'AFTER_GAP', questionsAsked: state.questionsAsked + 1, targetGaps: output.gaps };
      return { ...next, stage: 'AFTER_CORRECTION', questionsAsked: state.questionsAsked + 1, targetError: output.errors[0] ?? null };
    }
    case 'CLOSE_GAP': return { ...next, done: true, outcome: 'GAP_REVEALED', revealQuotes: [...new Set(state.targetGaps.filter((_, i) => output.targetGapsFilled?.[i] !== true).map(g => g.sourceQuote))] };
    case 'CLOSE_ERRORS': {
      const uncovered = state.stage === 'AFTER_GAP' ? state.targetGaps.filter((_, k) => output.targetGapsFilled?.[k] === false && !output.errors.some(e => e.gapIndex === k)).map(g => g.sourceQuote) : [];
      return { ...next, done: true, outcome: 'ERRORS_REVEALED', revealQuotes: [...new Set([...output.errors.map(e => e.sourceQuote), ...uncovered])] };
    }
  }
}
