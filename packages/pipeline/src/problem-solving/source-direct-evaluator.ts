import { z } from 'zod/v4';

import {
  ParagraphUnderstandingHandoffSchema,
  type ParagraphUnderstandingHandoff,
} from '../learning-session/handoff.js';
import {
  CandidateDivergenceLayerSchema,
} from './gold.js';
import {
  DiagnosticTurnSchema,
  type ProblemSolvingNextAction,
} from './episode.js';
import {
  ProblemSolvingSessionSchema,
  applyProblemEvaluatorTurn,
  type ProblemSolvingSession,
} from './session.js';

export const SOURCE_DIRECT_PROBLEM_BUNDLE_VERSION =
  'source-direct-problem-bundle-v2' as const;
export const SOURCE_DIRECT_PROBLEM_REFERENCE_VERSION =
  'source-direct-problem-reference-v1' as const;
export const SOURCE_DIRECT_PROBLEM_EVALUATOR_INPUT_VERSION =
  'source-direct-problem-evaluator-input-v2' as const;
export const SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION =
  'source-direct-problem-evaluator-output-v2' as const;
export const SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION =
  'source-direct-problem-dialogue-prompt-v2' as const;
export const SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION =
  'source-direct-problem-dialogue-prompt-v3' as const;
export const SOURCE_DIRECT_PROBLEM_PROMPT_VERSION =
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION;
/** @deprecated v3는 2026-09-11부터 운영 기본값이다. */
export const SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION =
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION;

export const SourceDirectProblemPromptVersionSchema = z.enum([
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
]);

export type SourceDirectProblemPromptVersion = z.infer<
  typeof SourceDirectProblemPromptVersionSchema
>;

const SourceDirectChoiceSchema = z.object({
  choiceId: z.string().min(1),
  position: z.number().int().positive(),
  text: z.string().min(1),
}).strict();

const SourceDirectMediaPlacementSchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('PASSAGE'),
    elementIndex: z.number().int().nonnegative().optional(),
  }).strict(),
  z.object({
    scope: z.literal('SCENARIO'),
    supplementIndex: z.number().int().nonnegative(),
    elementIndex: z.number().int().nonnegative().optional(),
  }).strict(),
  z.object({
    scope: z.literal('CHOICE'),
    choiceId: z.string().min(1),
    elementIndex: z.number().int().nonnegative().optional(),
  }).strict(),
]);

export const SourceDirectMediaSchema = z.object({
  mediaId: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().regex(/^image\//u),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u).optional(),
  placement: SourceDirectMediaPlacementSchema,
}).strict();

export type SourceDirectMedia = z.infer<typeof SourceDirectMediaSchema>;

export const SourceDirectProblemReferenceSchema = z.object({
  schemaVersion: z.literal(SOURCE_DIRECT_PROBLEM_REFERENCE_VERSION),
  questionId: z.string().min(1),
  stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
  answerChoiceId: z.string().min(1),
  officialExplanation: z.string().min(1),
}).strict();

export type SourceDirectProblemReference = z.infer<
  typeof SourceDirectProblemReferenceSchema
>;

export const SourceDirectProblemReferenceCatalogSchema = z.object({
  schemaVersion: z.literal('source-direct-problem-reference-catalog-v1'),
  questions: z.array(SourceDirectProblemReferenceSchema).min(1),
}).strict().superRefine((catalog, context) => {
  const questionIds = catalog.questions.map((question) => question.questionId);
  if (new Set(questionIds).size !== questionIds.length) {
    context.addIssue({ code: 'custom', path: ['questions'], message: '원문 직접 문항 참조가 중복됐다.' });
  }
});

/** Printed source spans only; these contain no interpretation or answer rationale. */
export const SourceTextAnnotationSchema = z.object({
  location: z.enum(['PASSAGE', 'SCENARIO']),
  marker: z.string().min(1),
  style: z.enum(['underline', 'box', 'label']),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string().min(1),
  contextBefore: z.string(),
  contextAfter: z.string(),
}).strict();

export const SOURCE_TEXT_ANNOTATION_GUIDE = 'source.textAnnotations는 원자료에 표시된 기호의 문자열 범위이다. location=PASSAGE는 source.passage, SCENARIO는 source.scenario를 기준으로 한다. start는 0부터 센 UTF-16 시작 위치(포함), end는 끝 위치(미포함)이며 text는 그 범위의 정확한 문자열이다. contextBefore/contextAfter는 바로 앞뒤 원문이다. 이는 밑줄·표지 위치 정보이며 기호의 의미 해석이나 정답 근거를 제공하는 것이 아니다.';

export const SourceDirectProblemBundleSchema = z.object({
  schemaVersion: z.literal(SOURCE_DIRECT_PROBLEM_BUNDLE_VERSION),
  questionId: z.string().min(1),
  questionNumber: z.number().int().positive(),
  passageId: z.string().min(1),
  title: z.string().min(1),
  exam: z.string().min(1),
  passage: z.string().min(1),
  stem: z.string().min(1),
  stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
  scenario: z.string(),
  // Optional for historical sessions and frozen experiments created without marker metadata.
  textAnnotations: z.array(SourceTextAnnotationSchema).optional(),
  media: z.array(SourceDirectMediaSchema),
  choices: z.array(SourceDirectChoiceSchema).min(2),
  answerChoiceId: z.string().min(1),
  officialExplanation: z.string().min(1),
}).strict().superRefine((bundle, context) => {
  const annotationKeys = new Set<string>();
  bundle.textAnnotations?.forEach((annotation, index) => {
    const text = annotation.location === 'PASSAGE' ? bundle.passage : bundle.scenario;
    const key = `${annotation.location}:${annotation.marker}`;
    if (annotationKeys.has(key)) {
      context.addIssue({ code: 'custom', path: ['textAnnotations', index], message: '같은 위치 영역의 기호가 중복됐다.' });
    }
    annotationKeys.add(key);
    if (annotation.start >= annotation.end || annotation.end > text.length
      || text.slice(annotation.start, annotation.end) !== annotation.text
      || text.slice(Math.max(0, annotation.start - annotation.contextBefore.length), annotation.start) !== annotation.contextBefore
      || text.slice(annotation.end, annotation.end + annotation.contextAfter.length) !== annotation.contextAfter) {
      context.addIssue({ code: 'custom', path: ['textAnnotations', index], message: '기호 범위 또는 문맥이 해당 원문 문자열과 일치하지 않는다.' });
    }
  });
  const choiceIds = bundle.choices.map((choice) => choice.choiceId);
  if (new Set(choiceIds).size !== choiceIds.length) {
    context.addIssue({ code: 'custom', path: ['choices'], message: '선지 ID가 중복됐다.' });
  }
  if (!choiceIds.includes(bundle.answerChoiceId)) {
    context.addIssue({ code: 'custom', path: ['answerChoiceId'], message: '정답 선지가 원문 선지에 없다.' });
  }
  const mediaIds = bundle.media.map((media) => media.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) {
    context.addIssue({ code: 'custom', path: ['media'], message: '원문 미디어 ID가 중복됐다.' });
  }
  bundle.media.forEach((media, index) => {
    if (media.placement.scope === 'SCENARIO' && media.placement.supplementIndex !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['media', index, 'placement', 'supplementIndex'],
        message: '현재 원문 번들의 보기는 하나이므로 supplementIndex는 0이어야 한다.',
      });
    }
    if (media.placement.scope === 'CHOICE' && !choiceIds.includes(media.placement.choiceId)) {
      context.addIssue({
        code: 'custom',
        path: ['media', index, 'placement', 'choiceId'],
        message: '미디어가 존재하지 않는 선지를 가리킨다.',
      });
    }
  });
});

export type SourceDirectProblemBundle = z.infer<
  typeof SourceDirectProblemBundleSchema
>;

const ProjectedObservationSchema = z.discriminatedUnion('kind', [
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('INITIAL_SUBMISSION'),
    initialChoiceId: z.string().min(1),
    submittedChoiceId: z.string().min(1),
    selectedChoiceId: z.string().min(1),
    confidence: z.number().min(0).max(100).nullable(),
    rationale: z.string().min(1).nullable(),
    strategy: z.string().min(1).nullable(),
    runnerUp: z.object({
      choiceId: z.string().min(1),
      rationale: z.string().min(1),
    }).nullable(),
    temporalRole: z.literal('INITIAL'),
  }).strict(),
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('FOLLOW_UP_RESPONSE'),
    inReplyToTurnId: z.string().min(1),
    responseType: z.enum([
      'DIAGNOSTIC_ANSWER',
      'CORRECTIVE_ANSWER',
      'COACHING_ACKNOWLEDGEMENT',
    ]),
    rawResponse: z.string().min(1),
    temporalRole: z.enum(['POST_DIAGNOSTIC', 'POST_CORRECTION']),
  }).strict(),
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('RESELECTION'),
    inReplyToTurnId: z.string().min(1),
    selectedChoiceId: z.string().min(1),
    rawResponse: z.string().min(1),
    rationaleProvided: z.boolean(),
    temporalRole: z.literal('CURRENT'),
  }).strict(),
]);

const SourceDirectSessionStateSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  phase: z.enum([
    'AWAITING_CORRECT_RATIONALE_ASSESSMENT',
    'AWAITING_EVALUATION',
  ]),
  entryReason: z.enum(['WRONG_CHOICE', 'CORRECT_RATIONALE_REVIEW']).nullable(),
  currentChoiceId: z.string().min(1),
  answerChoiceId: z.string().min(1),
  evaluationSequence: z.number().int().positive(),
  diagnosticQuestionsUsed: z.number().int().nonnegative(),
  maxDiagnosticQuestions: z.number().int().positive(),
  questionsUsedThisAttempt: z.number().int().nonnegative(),
  maxQuestionsPerWrongAttempt: z.number().int().positive(),
  selectionAttempt: z.number().int().positive(),
  maxSelectionAttempts: z.number().int().positive(),
  requiredNextAction: z.enum(['ANY', 'DIRECT_COACHING']),
  allowedActionTypes: z.array(z.enum([
    'ASK_DIAGNOSTIC',
    'ASK_CORRECTIVE',
    'REQUEST_RESELECTION',
    'DIRECT_COACHING',
    'EXPLAIN_ITEM_BOUNDARY',
    'COMPLETE',
  ])).min(1),
}).strict();

const SourceDirectStudentEvidenceSchema = z.object({
  observationId: z.string().min(1),
  quote: z.string().min(1),
}).strict();

const SourceDirectTextEvidenceSchema = z.object({
  kind: z.literal('TEXT'),
  source: z.enum(['PASSAGE', 'STEM', 'SCENARIO', 'CHOICE', 'OFFICIAL_EXPLANATION']),
  quote: z.string().min(1),
}).strict();

const SourceDirectVisualEvidenceSchema = z.object({
  kind: z.literal('VISUAL'),
  mediaId: z.string().min(1),
  description: z.string().min(1),
}).strict();

const SourceDirectSourceEvidenceSchema = z.discriminatedUnion('kind', [
  SourceDirectTextEvidenceSchema,
  SourceDirectVisualEvidenceSchema,
]);

const SourceDirectAssessmentSchema = z.enum([
  'CLEAR_ERROR',
  'INSUFFICIENT_EVIDENCE',
  'NO_ERROR_DETECTED',
  'REASONABLE_ALTERNATIVE_INTERPRETATION',
  'ITEM_OR_EXPLANATION_LIMITATION',
]);

const SourceDirectLearningStateSchema = z.enum([
  'PATH_UNCLEAR',
  'PATH_CLARIFIED',
  'CORRECTED',
  'NO_ERROR_DETECTED',
  'ITEM_BOUNDARY_CLARIFIED',
]);

const SourceDirectNextActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('ASK_DIAGNOSTIC'),
    question: z.string().min(1),
    purpose: z.string().min(1),
  }).strict(),
  z.object({
    type: z.literal('ASK_CORRECTIVE'),
    question: z.string().min(1),
    purpose: z.string().min(1),
  }).strict(),
  z.object({
    type: z.literal('REQUEST_RESELECTION'),
    message: z.string().min(1),
  }).strict(),
  z.object({
    type: z.literal('DIRECT_COACHING'),
    message: z.string().min(1),
    reason: z.enum([
      'MAX_DIAGNOSTIC_TURNS',
      'FAILED_CORRECTION',
      'EXPLANATION_REQUEST',
      'FINAL_ATTEMPT',
    ]),
  }).strict(),
  z.object({
    type: z.literal('EXPLAIN_ITEM_BOUNDARY'),
    message: z.string().min(1),
    purpose: z.string().min(1),
  }).strict(),
  z.object({
    type: z.literal('COMPLETE'),
    message: z.string().min(1),
  }).strict(),
]);

export const SourceDirectDiagnosticOutputSchema = z.object({
  schemaVersion: z.literal(SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION),
  mode: z.literal('DIAGNOSE_PATH'),
  basedOnObservationIds: z.array(z.string().min(1)).min(1),
  assessment: SourceDirectAssessmentSchema,
  learningState: SourceDirectLearningStateSchema,
  divergenceLayer: CandidateDivergenceLayerSchema.nullable(),
  reason: z.string().min(1),
  reconstructedPath: z.string().min(1),
  studentEvidence: z.array(SourceDirectStudentEvidenceSchema).min(1),
  sourceEvidence: z.array(SourceDirectSourceEvidenceSchema),
  nextAction: SourceDirectNextActionSchema,
}).strict();

export type SourceDirectDiagnosticOutput = z.infer<
  typeof SourceDirectDiagnosticOutputSchema
>;

export const SourceDirectRationaleOutputSchema = z.object({
  schemaVersion: z.literal(SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION),
  mode: z.literal('ASSESS_SELECTION_RATIONALE'),
  assessment: z.enum(['SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
  reason: z.string().min(1),
  studentEvidence: z.array(SourceDirectStudentEvidenceSchema).min(1),
  sourceEvidence: z.array(SourceDirectSourceEvidenceSchema),
}).strict();

export type SourceDirectRationaleOutput = z.infer<
  typeof SourceDirectRationaleOutputSchema
>;

export const SourceDirectProblemEvaluatorOutputSchema = z.discriminatedUnion('mode', [
  SourceDirectDiagnosticOutputSchema,
  SourceDirectRationaleOutputSchema,
]);

export type SourceDirectProblemEvaluatorOutput = z.infer<
  typeof SourceDirectProblemEvaluatorOutputSchema
>;

export const SourceDirectProblemEvaluatorInputSchema = z.object({
  schemaVersion: z.literal(SOURCE_DIRECT_PROBLEM_EVALUATOR_INPUT_VERSION),
  promptVersion: SourceDirectProblemPromptVersionSchema,
  evaluationMode: z.enum(['ASSESS_SELECTION_RATIONALE', 'DIAGNOSE_PATH']),
  source: SourceDirectProblemBundleSchema,
  sessionState: SourceDirectSessionStateSchema,
  observations: z.array(ProjectedObservationSchema).min(1),
  paragraphHandoff: ParagraphUnderstandingHandoffSchema.nullable(),
  previousDiagnosticState: SourceDirectDiagnosticOutputSchema.nullable(),
}).strict().superRefine((input, context) => {
  if (input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' &&
      input.sessionState.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT') {
    context.addIssue({ code: 'custom', path: ['sessionState', 'phase'], message: '정답 근거 평가 단계가 아니다.' });
  }
  if (input.evaluationMode === 'DIAGNOSE_PATH' &&
      input.sessionState.phase !== 'AWAITING_EVALUATION') {
    context.addIssue({ code: 'custom', path: ['sessionState', 'phase'], message: '경로 진단 단계가 아니다.' });
  }
  if (input.source.questionId !== input.sessionState.questionId ||
      input.source.answerChoiceId !== input.sessionState.answerChoiceId) {
    context.addIssue({ code: 'custom', path: ['source'], message: '원문 자료와 세션의 문항·정답이 일치하지 않는다.' });
  }
  if (input.paragraphHandoff !== null && input.paragraphHandoff.passageId !== input.source.passageId) {
    context.addIssue({ code: 'custom', path: ['paragraphHandoff'], message: '문단 handoff와 원문 자료의 지문이 일치하지 않는다.' });
  }
});

export type SourceDirectProblemEvaluatorInput = z.infer<
  typeof SourceDirectProblemEvaluatorInputSchema
>;

const FORBIDDEN_RUNTIME_KEYS = new Set([
  'passageDetailGold',
  'optionClaims',
  'itemInferences',
  'referencePath',
  'sufficientGroundSets',
  'representativeWrongPaths',
  'supplementalExplanationInferences',
  'requiredPathStepIds',
  'decisivePathStepIds',
  'conclusionStepIds',
  'goldRefs',
]);

/** 학생용 런타임 요청에 구조화 문제 골드가 섞이는 회귀를 코드 경계에서 차단한다. */
export function assertNoStructuredProblemGold(value: unknown): void {
  const visit = (current: unknown, path: string): void => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (typeof current !== 'object' || current === null) return;
    for (const [key, child] of Object.entries(current)) {
      if (FORBIDDEN_RUNTIME_KEYS.has(key)) {
        throw new Error(`원문 직접 런타임에 구조화 문제 골드가 포함됐다: ${path}.${key}`);
      }
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, '$');
}

function allowedActions(session: ProblemSolvingSession): SourceDirectProblemEvaluatorInput['sessionState']['allowedActionTypes'] {
  if (session.requiredNextAction === 'DIRECT_COACHING') return ['DIRECT_COACHING'];
  if (session.entryReason === 'CORRECT_RATIONALE_REVIEW') {
    const correctiveQuestionsUsed = session.turns.filter(
      (turn) => turn.nextAction.type === 'ASK_CORRECTIVE' &&
        turn.nextAction.target === 'ANSWER_RATIONALE',
    ).length;
    return correctiveQuestionsUsed === 0
      ? ['ASK_CORRECTIVE', 'COMPLETE']
      : ['DIRECT_COACHING', 'COMPLETE'];
  }
  if (session.limits.questionsUsedThisAttempt >= session.limits.maxQuestionsPerWrongAttempt) {
    // 마지막으로 허용된 질문의 답변에서 실제 수정이 일어났을 수 있다.
    // 새 질문은 막되, 수정 확인 후 재선택과 미수정 시 코칭은 모두 열어 둔다.
    return ['REQUEST_RESELECTION', 'DIRECT_COACHING', 'EXPLAIN_ITEM_BOUNDARY'];
  }
  const actions: SourceDirectProblemEvaluatorInput['sessionState']['allowedActionTypes'] = [
    'ASK_CORRECTIVE',
    'REQUEST_RESELECTION',
    'EXPLAIN_ITEM_BOUNDARY',
  ];
  if (session.limits.diagnosticQuestionsUsed < session.limits.maxDiagnosticQuestions) {
    actions.unshift('ASK_DIAGNOSTIC');
  }
  return actions;
}

function projectObservations(session: ProblemSolvingSession): SourceDirectProblemEvaluatorInput['observations'] {
  return session.observations.map((observation) => {
    if (observation.kind === 'INITIAL_SUBMISSION') {
      return {
        ...structuredClone(observation),
        selectedChoiceId: observation.submittedChoiceId,
        temporalRole: 'INITIAL' as const,
      };
    }
    if (observation.kind === 'RESELECTION') {
      return { ...structuredClone(observation), temporalRole: 'CURRENT' as const };
    }
    return {
      ...structuredClone(observation),
      temporalRole: observation.responseType === 'DIAGNOSTIC_ANSWER'
        ? 'POST_DIAGNOSTIC' as const
        : 'POST_CORRECTION' as const,
    };
  });
}

export function createSourceDirectProblemEvaluatorInput(options: {
  readonly evaluationMode: SourceDirectProblemEvaluatorInput['evaluationMode'];
  readonly session: ProblemSolvingSession;
  readonly source: SourceDirectProblemBundle;
  readonly paragraphHandoff?: ParagraphUnderstandingHandoff | null;
  readonly previousDiagnosticState?: SourceDirectDiagnosticOutput | null;
  readonly promptVersion?: SourceDirectProblemPromptVersion;
}): SourceDirectProblemEvaluatorInput {
  const session = ProblemSolvingSessionSchema.parse(options.session);
  const source = SourceDirectProblemBundleSchema.parse(options.source);
  if (session.latestChoiceId === null) throw new Error('평가할 현재 선택이 없다.');
  const input = SourceDirectProblemEvaluatorInputSchema.parse({
    schemaVersion: SOURCE_DIRECT_PROBLEM_EVALUATOR_INPUT_VERSION,
    promptVersion: options.promptVersion ?? SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
    evaluationMode: options.evaluationMode,
    source,
    sessionState: {
      sessionId: session.sessionId,
      questionId: session.questionId,
      phase: session.phase,
      entryReason: session.entryReason,
      currentChoiceId: session.latestChoiceId,
      answerChoiceId: session.answerChoiceId,
      evaluationSequence: session.turns.length + 1,
      diagnosticQuestionsUsed: session.limits.diagnosticQuestionsUsed,
      maxDiagnosticQuestions: session.limits.maxDiagnosticQuestions,
      questionsUsedThisAttempt: session.limits.questionsUsedThisAttempt,
      maxQuestionsPerWrongAttempt: session.limits.maxQuestionsPerWrongAttempt,
      selectionAttempt: session.selectionAttempt,
      maxSelectionAttempts: session.limits.maxSelectionAttempts,
      requiredNextAction: session.requiredNextAction,
      allowedActionTypes: allowedActions(session),
    },
    observations: projectObservations(session),
    paragraphHandoff: options.paragraphHandoff ?? null,
    previousDiagnosticState: options.previousDiagnosticState ?? null,
  });
  assertNoStructuredProblemGold(input);
  return input;
}

function observationText(observation: SourceDirectProblemEvaluatorInput['observations'][number]): string {
  if (observation.kind === 'INITIAL_SUBMISSION') {
    return [
      observation.rationale,
      observation.strategy,
      observation.runnerUp?.rationale,
    ].filter((item): item is string => item !== null && item !== undefined).join('\n');
  }
  return observation.rawResponse;
}

function textSources(input: SourceDirectProblemEvaluatorInput) {
  return {
    PASSAGE: input.source.passage,
    STEM: input.source.stem,
    SCENARIO: input.source.scenario,
    CHOICE: input.source.choices.map((choice) => choice.text).join('\n'),
    OFFICIAL_EXPLANATION: input.source.officialExplanation,
  } as const;
}

const QUOTE_MATCH_IGNORABLE = /[\s"'‘’“”]/u;

/** 인용 내용은 그대로 두고 공백·인용부호 차이만 원문의 유일한 정확 문자열로 복원한다. */
function recoverExactSourceQuote(source: string, quote: string): string | null {
  let normalizedSource = '';
  const sourceOffsets: number[] = [];
  for (let offset = 0; offset < source.length;) {
    const codePoint = source.codePointAt(offset)!;
    const character = String.fromCodePoint(codePoint);
    if (!QUOTE_MATCH_IGNORABLE.test(character)) {
      normalizedSource += character;
      sourceOffsets.push(offset);
    }
    offset += character.length;
  }
  const normalizedQuote = Array.from(quote)
    .filter((character) => !QUOTE_MATCH_IGNORABLE.test(character))
    .join('');
  if (normalizedQuote.length < 8) return null;
  const first = normalizedSource.indexOf(normalizedQuote);
  if (first < 0 || normalizedSource.indexOf(normalizedQuote, first + 1) >= 0) return null;
  const start = sourceOffsets[first];
  const lastOffset = sourceOffsets[first + normalizedQuote.length - 1];
  if (start === undefined || lastOffset === undefined) return null;
  const lastCharacter = String.fromCodePoint(source.codePointAt(lastOffset)!);
  return source.slice(start, lastOffset + lastCharacter.length);
}

function normalizeSourceEvidence(
  output: SourceDirectProblemEvaluatorOutput,
  input: SourceDirectProblemEvaluatorInput,
): SourceDirectProblemEvaluatorOutput {
  const sources = textSources(input);
  return {
    ...output,
    sourceEvidence: output.sourceEvidence.map((evidence) => {
      if (evidence.kind === 'VISUAL' || sources[evidence.source].includes(evidence.quote)) {
        return evidence;
      }
      const recovered = recoverExactSourceQuote(sources[evidence.source], evidence.quote);
      return recovered === null ? evidence : { ...evidence, quote: recovered };
    }),
  };
}

function validateEvidence(
  output: SourceDirectProblemEvaluatorOutput,
  input: SourceDirectProblemEvaluatorInput,
): void {
  const observations = new Map(input.observations.map((item) => [item.observationId, item]));
  for (const evidence of output.studentEvidence) {
    const observation = observations.get(evidence.observationId);
    if (observation === undefined || !observationText(observation).includes(evidence.quote)) {
      throw new Error(`학생 원문과 일치하지 않는 인용: ${evidence.observationId}`);
    }
  }
  const sourceText = textSources(input);
  const mediaIds = new Set(input.source.media.map((media) => media.mediaId));
  for (const evidence of output.sourceEvidence) {
    if (evidence.kind === 'VISUAL') {
      if (!mediaIds.has(evidence.mediaId)) {
        throw new Error(`원문 자료에 존재하지 않는 시각 근거: ${evidence.mediaId}`);
      }
      continue;
    }
    if (!sourceText[evidence.source].includes(evidence.quote)) {
      throw new Error(`원문 자료와 일치하지 않는 인용: ${evidence.source}`);
    }
  }
}

export function validateSourceDirectProblemEvaluatorOutput(
  outputValue: unknown,
  inputValue: SourceDirectProblemEvaluatorInput,
): SourceDirectProblemEvaluatorOutput {
  const input = SourceDirectProblemEvaluatorInputSchema.parse(inputValue);
  assertNoStructuredProblemGold(input);
  const output = normalizeSourceEvidence(
    SourceDirectProblemEvaluatorOutputSchema.parse(outputValue),
    input,
  );
  if (output.mode !== input.evaluationMode) throw new Error('원문 직접 evaluator의 입력·출력 모드가 다르다.');
  validateEvidence(output, input);
  if (output.mode === 'ASSESS_SELECTION_RATIONALE') {
    if (output.assessment === 'CLEAR_ERROR' && output.sourceEvidence.length === 0) {
      throw new Error('명백한 정답 근거 오류에는 원문 근거가 필요하다.');
    }
    return output;
  }

  const expectedObservationIds = new Set(input.observations.map((item) => item.observationId));
  if (output.basedOnObservationIds.length !== expectedObservationIds.size ||
      output.basedOnObservationIds.some((id) => !expectedObservationIds.has(id))) {
    throw new Error('원문 직접 진단은 모든 누적 학생 관찰을 근거로 해야 한다.');
  }
  if (!input.sessionState.allowedActionTypes.includes(output.nextAction.type)) {
    throw new Error(`현재 상태에서 허용되지 않는 다음 행동: ${output.nextAction.type}`);
  }
  const expectedByAction: Partial<Record<SourceDirectDiagnosticOutput['nextAction']['type'], {
    assessment: SourceDirectDiagnosticOutput['assessment'];
    learningState: SourceDirectDiagnosticOutput['learningState'];
  }>> = {
    ASK_DIAGNOSTIC: { assessment: 'INSUFFICIENT_EVIDENCE', learningState: 'PATH_UNCLEAR' },
    ASK_CORRECTIVE: { assessment: 'CLEAR_ERROR', learningState: 'PATH_CLARIFIED' },
    REQUEST_RESELECTION: { assessment: 'NO_ERROR_DETECTED', learningState: 'CORRECTED' },
    EXPLAIN_ITEM_BOUNDARY: {
      assessment: output.assessment,
      learningState: 'ITEM_BOUNDARY_CLARIFIED',
    },
    COMPLETE: { assessment: 'NO_ERROR_DETECTED', learningState: 'CORRECTED' },
  };
  const expected = expectedByAction[output.nextAction.type];
  if (expected !== undefined &&
      (output.assessment !== expected.assessment || output.learningState !== expected.learningState)) {
    throw new Error('원문 직접 판정과 다음 행동의 상태가 일치하지 않는다.');
  }
  if (output.nextAction.type === 'EXPLAIN_ITEM_BOUNDARY' &&
      !['REASONABLE_ALTERNATIVE_INTERPRETATION', 'ITEM_OR_EXPLANATION_LIMITATION'].includes(output.assessment)) {
    throw new Error('문항 경계 행동에는 합리적 대안 또는 자료 한계 판정이 필요하다.');
  }
  if (output.nextAction.type === 'REQUEST_RESELECTION' &&
      !input.observations.some((item) => item.kind === 'FOLLOW_UP_RESPONSE')) {
    throw new Error('학생의 후속 수정 관찰 없이 재선택을 허용할 수 없다.');
  }
  if (output.nextAction.type === 'COMPLETE' &&
      input.sessionState.currentChoiceId !== input.sessionState.answerChoiceId) {
    throw new Error('현재 선택이 오답이면 완료할 수 없다.');
  }
  if ((output.assessment === 'CLEAR_ERROR' || output.nextAction.type === 'DIRECT_COACHING') &&
      output.sourceEvidence.length === 0) {
    throw new Error('교정 또는 코칭에는 원문 근거가 필요하다.');
  }
  return output;
}

function sufficiency(sufficient: boolean, reason: string) {
  const dimension = { satisfied: sufficient, reason };
  return {
    choiceExplained: dimension,
    interventionPointLocalized: dimension,
    safeInterventionAvailable: dimension,
    actionRelevantAlternativesControlled: dimension,
    sufficient,
  };
}

function nextAction(
  output: SourceDirectDiagnosticOutput,
  options: { readonly hypothesisId: string; readonly unknownStepId: string },
): ProblemSolvingNextAction {
  const action = output.nextAction;
  if (action.type === 'ASK_DIAGNOSTIC') {
    return {
      type: 'ASK_DIAGNOSTIC',
      target: 'SELECTED_CHOICE',
      question: action.question,
      purpose: action.purpose,
      distinguishesHypothesisIds: [],
      resolvesUnknownPathStepIds: [options.unknownStepId],
    };
  }
  if (action.type === 'ASK_CORRECTIVE') {
    return {
      type: 'ASK_CORRECTIVE',
      target: 'SELECTED_CHOICE',
      question: action.question,
      purpose: action.purpose,
      targetedHypothesisIds: [options.hypothesisId],
    };
  }
  if (action.type === 'REQUEST_RESELECTION') {
    return { type: 'REQUEST_RESELECTION', prompt: action.message };
  }
  if (action.type === 'DIRECT_COACHING') {
    return {
      type: 'DIRECT_COACHING',
      target: 'SELECTED_CHOICE',
      message: action.message,
      coachingReason: action.reason,
      supplementalInferenceIds: [],
    };
  }
  if (action.type === 'EXPLAIN_ITEM_BOUNDARY') {
    return {
      type: 'EXPLAIN_ITEM_BOUNDARY',
      target: 'SELECTED_CHOICE',
      message: action.message,
      purpose: action.purpose,
    };
  }
  return { type: 'COMPLETE', summary: action.message };
}

/** 원문 직접 출력의 의미 판정만 기존의 결정론적 세션 상태 기계에 투영한다. */
export function adaptSourceDirectDiagnosticOutput(options: {
  readonly evaluatorInput: SourceDirectProblemEvaluatorInput;
  readonly rawOutput: unknown;
  readonly output: SourceDirectDiagnosticOutput;
}) {
  const input = SourceDirectProblemEvaluatorInputSchema.parse(options.evaluatorInput);
  const output = validateSourceDirectProblemEvaluatorOutput(options.output, input);
  if (output.mode !== 'DIAGNOSE_PATH') throw new Error('경로 진단 출력만 세션 턴으로 변환할 수 있다.');
  const sequence = input.sessionState.evaluationSequence;
  const targetKind = input.sessionState.entryReason === 'CORRECT_RATIONALE_REVIEW'
    ? 'ANSWER_RATIONALE' as const
    : 'SELECTED_CHOICE' as const;
  const hypothesisId = `SD-H-T${sequence}`;
  const unknownStepId = `SD-U-T${sequence}`;
  const isSufficient = output.learningState !== 'PATH_UNCLEAR';
  const status = output.learningState === 'PATH_UNCLEAR'
    ? 'INSUFFICIENT' as const
    : output.learningState === 'PATH_CLARIFIED'
      ? 'SUFFICIENT' as const
      : output.learningState === 'ITEM_BOUNDARY_CLARIFIED'
        ? 'BOUNDARY_CLARIFICATION_REQUIRED' as const
        : 'RESOLVED' as const;
  const hypotheses = output.assessment === 'CLEAR_ERROR'
    ? [{
        hypothesisId,
        kind: 'STUDENT_ERROR' as const,
        description: output.reason,
        plausibility: 'ACTIVE' as const,
        confidence: null,
        candidateDivergenceLayers: [output.divergenceLayer ?? 'CHOICE_INTERPRETATION' as const],
        interventionSignature: `SOURCE_DIRECT|${output.divergenceLayer ?? 'CHOICE_INTERPRETATION'}|${targetKind}`,
        evidenceObservationIds: [...new Set(output.studentEvidence.map((item) => item.observationId))],
        goldRefs: { optionClaimIds: [], representativeWrongPathIds: [] },
      }]
    : [];
  const target = {
    kind: targetKind,
    choiceId: targetKind === 'ANSWER_RATIONALE'
      ? input.sessionState.answerChoiceId
      : input.sessionState.currentChoiceId,
    status,
    learningState: output.learningState,
    reconstructedPath: output.reconstructedPath,
    hypotheses,
    sufficiency: sufficiency(isSufficient, output.reason),
  };
  const action = nextAction(output, { hypothesisId, unknownStepId });
  const actionWithTarget = targetKind === 'ANSWER_RATIONALE' &&
    (action.type === 'ASK_CORRECTIVE' || action.type === 'DIRECT_COACHING')
    ? { ...action, target: 'ANSWER_RATIONALE' as const }
    : action;
  const globalAction = actionWithTarget.type === 'REQUEST_RESELECTION' ||
    actionWithTarget.type === 'COMPLETE';
  const turn = DiagnosticTurnSchema.parse({
    turnId: `SD-T${sequence}`,
    basedOnObservationIds: output.basedOnObservationIds,
    activeTarget: globalAction ? null : targetKind,
    targetSnapshots: targetKind === 'SELECTED_CHOICE'
      ? [target, {
          kind: 'MISSED_ANSWER',
          choiceId: input.sessionState.answerChoiceId,
          status: 'NOT_DIRECTLY_DIAGNOSED',
          learningState: null,
          reconstructedPath: null,
          hypotheses: [],
          sufficiency: null,
        }]
      : [target],
    nextAction: actionWithTarget,
  });
  return {
    turn,
    audit: {
      source: 'SOURCE_DIRECT_V2' as const,
      promptVersion: input.promptVersion,
      rawOutput: structuredClone(options.rawOutput),
      validatedOutput: structuredClone(output),
    },
  };
}

export function applySourceDirectProblemEvaluatorTurn(
  sessionInput: ProblemSolvingSession,
  adapted: ReturnType<typeof adaptSourceDirectDiagnosticOutput>,
): ProblemSolvingSession {
  const session = ProblemSolvingSessionSchema.parse(sessionInput);
  const firstApplied = applyProblemEvaluatorTurn(session, adapted.turn);
  // 기존 상태 머신은 `DIRECT_COACHING`을 두 단계(결정 → 문구 생성)로 처리했다.
  // source-direct evaluator의 단일 출력은 두 역할을 함께 수행하므로, 같은 검증된
  // 턴을 내부적으로 한 번 더 적용해 추가 모델 호출 없이 학생 공개 경계까지 진행한다.
  const applied = adapted.turn.nextAction.type === 'DIRECT_COACHING' &&
    firstApplied.phase === 'AWAITING_EVALUATION' &&
    firstApplied.requiredNextAction === 'DIRECT_COACHING'
    ? applyProblemEvaluatorTurn(firstApplied, adapted.turn)
    : firstApplied;
  return ProblemSolvingSessionSchema.parse({
    ...applied,
    evaluatorAudits: [...session.evaluatorAudits, adapted.audit],
  });
}
