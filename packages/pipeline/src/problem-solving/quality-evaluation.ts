import { z } from 'zod/v4';

import type { ProblemVerticalSliceResult } from './vertical-slice.js';

export const DiagnosticQualityFailureCategorySchema = z.enum([
  'GOLD',
  'PATH_RECONSTRUCTION',
  'SUFFICIENCY',
  'QUESTION_GENERATION',
  'SESSION_TRANSITION',
]);

export type DiagnosticQualityFailureCategory = z.infer<
  typeof DiagnosticQualityFailureCategorySchema
>;

export const DiagnosticQualityExpectationSchema = z.object({
  caseId: z.string().min(1),
  targetKind: z.enum(['SELECTED_CHOICE', 'MISSED_ANSWER', 'ANSWER_RATIONALE']),
  expectedDivergenceLayers: z.array(z.string().min(1)).min(1),
  expectChoiceExplained: z.boolean(),
  expectAlternativesControlled: z.boolean(),
  maxNecessaryDiagnosticQuestions: z.number().int().nonnegative(),
  expectedFinalChoiceId: z.string().min(1),
  requiresReselection: z.boolean(),
  goldIssueDetectedByReviewer: z.boolean().default(false),
}).strict();

export type DiagnosticQualityExpectation = z.infer<
  typeof DiagnosticQualityExpectationSchema
>;

const QualityCheckSchema = z.object({
  passed: z.boolean(),
  evidence: z.string().min(1),
}).strict();

export const DiagnosticQualityAssessmentSchema = z.object({
  caseId: z.string().min(1),
  checks: z.object({
    selectionExplainability: QualityCheckSchema,
    firstDivergenceAccuracy: QualityCheckSchema,
    alternativeHypothesesControlled: QualityCheckSchema,
    unnecessaryQuestionsAvoided: QualityCheckSchema,
    answerNotLeaked: QualityCheckSchema,
    sessionTransitionCorrect: QualityCheckSchema,
    reselectionSucceeded: QualityCheckSchema,
  }).strict(),
  counts: z.object({
    evaluatorCalls: z.number().int().nonnegative(),
    diagnosticQuestions: z.number().int().nonnegative(),
    correctiveQuestions: z.number().int().nonnegative(),
    directCoachingActions: z.number().int().nonnegative(),
    itemBoundaryExplanations: z.number().int().nonnegative(),
  }).strict(),
  performance: z.object({
    totalDurationMs: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }).strict(),
  interventionDepth: z.enum([
    'EXTERNALIZATION',
    'DIAGNOSTIC',
    'INDIRECT_CORRECTION',
    'DIRECT_COACHING',
    'ITEM_BOUNDARY_EXPLANATION',
    'UNRESOLVED',
  ]),
  failureCategories: z.array(DiagnosticQualityFailureCategorySchema),
  passed: z.boolean(),
}).strict();

export type DiagnosticQualityAssessment = z.infer<
  typeof DiagnosticQualityAssessmentSchema
>;

export const DiagnosticQualityReportSchema = z.object({
  schemaVersion: z.literal('problem-diagnostic-quality-report-v1'),
  generatedAt: z.string().datetime(),
  assessments: z.array(DiagnosticQualityAssessmentSchema).min(1),
  summary: z.object({
    totalCases: z.number().int().positive(),
    passedCases: z.number().int().nonnegative(),
    passRate: z.number().min(0).max(1),
    averageDiagnosticQuestions: z.number().nonnegative(),
    answerLeakCount: z.number().int().nonnegative(),
    transitionFailureCount: z.number().int().nonnegative(),
    averageDurationMs: z.number().nonnegative(),
    totalInputTokens: z.number().int().nonnegative(),
    totalOutputTokens: z.number().int().nonnegative(),
    failureCounts: z.record(DiagnosticQualityFailureCategorySchema, z.number().int().nonnegative()),
  }).strict(),
  policyRecommendation: z.object({
    maxDiagnosticQuestions: z.number().int().nonnegative(),
    rationale: z.string().min(1),
    interventionOrder: z.tuple([
      z.literal('DIAGNOSTIC_IF_NEEDED'),
      z.literal('INDIRECT_CORRECTION'),
      z.literal('DIRECT_COACHING'),
    ]),
  }).strict(),
  mvpDecision: z.enum(['GO', 'CONDITIONAL_GO', 'NO_GO']),
}).strict();

export type DiagnosticQualityReport = z.infer<typeof DiagnosticQualityReportSchema>;

function answerLeakPattern(choiceId: string): RegExp {
  const position = choiceId.match(/(\d+)$/u)?.[1];
  const circled = position === undefined
    ? ''
    : ({ '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤' } as const)[position as '1'] ?? '';
  const alternatives = ['정답', choiceId];
  if (position !== undefined) alternatives.push(`${position}번`);
  if (circled !== '') alternatives.push(circled);
  return new RegExp(`(?:${alternatives.join('|')})`, 'u');
}

function diagnoseOutputs(result: ProblemVerticalSliceResult) {
  return result.trace.flatMap((entry) =>
    entry.evaluatorResult.mode === 'DIAGNOSE_PATH' ? [entry.evaluatorResult] : []);
}

function failureCategories(
  expectation: DiagnosticQualityExpectation,
  checks: DiagnosticQualityAssessment['checks'],
): DiagnosticQualityFailureCategory[] {
  const categories = new Set<DiagnosticQualityFailureCategory>();
  if (expectation.goldIssueDetectedByReviewer) categories.add('GOLD');
  if (!checks.selectionExplainability.passed || !checks.firstDivergenceAccuracy.passed) {
    categories.add('PATH_RECONSTRUCTION');
  }
  if (!checks.alternativeHypothesesControlled.passed) categories.add('SUFFICIENCY');
  if (!checks.unnecessaryQuestionsAvoided.passed || !checks.answerNotLeaked.passed) {
    categories.add('QUESTION_GENERATION');
  }
  if (!checks.sessionTransitionCorrect.passed || !checks.reselectionSucceeded.passed) {
    categories.add('SESSION_TRANSITION');
  }
  return [...categories];
}

export function assessProblemDiagnosticQuality(options: {
  readonly expectation: DiagnosticQualityExpectation;
  readonly result: ProblemVerticalSliceResult;
}): DiagnosticQualityAssessment {
  const expectation = DiagnosticQualityExpectationSchema.parse(options.expectation);
  if (expectation.caseId !== options.result.caseId) {
    throw new Error(`품질 기대 사례와 실행 결과가 다르다: ${expectation.caseId} !== ${options.result.caseId}`);
  }
  const outputs = diagnoseOutputs(options.result);
  const firstRelevant = outputs
    .flatMap((output) => output.targets)
    .find((target) => target.kind === expectation.targetKind && target.sufficiency !== null);
  const activeHypotheses = firstRelevant === undefined ||
    firstRelevant.status === 'NOT_ASSESSED' ||
    firstRelevant.status === 'NOT_DIRECTLY_DIAGNOSED'
    ? []
    : firstRelevant.hypotheses.filter((hypothesis) => hypothesis.plausibility === 'ACTIVE');
  const actualLayers = new Set(activeHypotheses.flatMap(
    (hypothesis) => hypothesis.candidateDivergenceLayers,
  ));
  const matchingLayers = expectation.expectedDivergenceLayers.filter((layer) => actualLayers.has(layer as any));
  const actions = outputs.map((output) => output.nextActionCandidate);
  const diagnosticQuestions = actions.filter((action) => action.type === 'ASK_DIAGNOSTIC');
  const correctiveQuestions = actions.filter((action) => action.type === 'ASK_CORRECTIVE');
  const directCoaching = actions.filter((action) =>
    action.type === 'DIRECT_COACHING');
  const boundaryExplanations = actions.filter((action) =>
    action.type === 'EXPLAIN_ITEM_BOUNDARY');
  const questionTexts = actions.flatMap((action) =>
    action.type === 'ASK_DIAGNOSTIC' || action.type === 'ASK_CORRECTIVE'
      ? [action.questionText]
      : []);
  const answerLeak = answerLeakPattern(expectation.expectedFinalChoiceId);
  const reselections = options.result.finalSession.observations.filter(
    (observation) => observation.kind === 'RESELECTION');
  const correctFinal = options.result.completed &&
    options.result.finalSession.result?.correct === true &&
    options.result.finalSession.result.finalChoiceId === expectation.expectedFinalChoiceId;
  const selectionExplained = firstRelevant?.sufficiency?.choiceExplained.satisfied ?? null;
  const alternativesControlled = firstRelevant?.sufficiency?.actionRelevantAlternativesControlled.satisfied ?? null;
  const checks: DiagnosticQualityAssessment['checks'] = {
    selectionExplainability: {
      passed: selectionExplained === expectation.expectChoiceExplained,
      evidence: `선택 설명성 기대=${expectation.expectChoiceExplained}, 실제=${selectionExplained ?? '미평가'}`,
    },
    firstDivergenceAccuracy: {
      passed: matchingLayers.length > 0,
      evidence: matchingLayers.length > 0
        ? `기대 분기층과 일치: ${matchingLayers.join(', ')}`
        : `기대=${expectation.expectedDivergenceLayers.join(', ')} 실제=${[...actualLayers].join(', ') || '없음'}`,
    },
    alternativeHypothesesControlled: {
      passed: alternativesControlled === expectation.expectAlternativesControlled,
      evidence: `대안 통제 기대=${expectation.expectAlternativesControlled}, 실제=${alternativesControlled ?? '미평가'}`,
    },
    unnecessaryQuestionsAvoided: {
      passed: diagnosticQuestions.length <= expectation.maxNecessaryDiagnosticQuestions,
      evidence: `진단 질문 ${diagnosticQuestions.length}회 / 허용 ${expectation.maxNecessaryDiagnosticQuestions}회`,
    },
    answerNotLeaked: {
      passed: questionTexts.every((question) => !answerLeak.test(question)),
      evidence: questionTexts.every((question) => !answerLeak.test(question))
        ? '질문에 정답 번호나 선택 방향이 노출되지 않았다.'
        : '질문에 정답 번호 또는 선택 방향 표현이 포함됐다.',
    },
    sessionTransitionCorrect: {
      passed: correctFinal,
      evidence: `완료=${options.result.completed}, 최종=${options.result.finalSession.result?.finalChoiceId ?? '없음'}`,
    },
    reselectionSucceeded: {
      passed: expectation.requiresReselection
        ? reselections.some((item) => item.selectedChoiceId === expectation.expectedFinalChoiceId)
        : correctFinal,
      evidence: `재선택=${reselections.map((item) => item.selectedChoiceId).join(', ') || '없음'}`,
    },
  };
  const totalDurationMs = options.result.trace.reduce((sum, entry) => sum + entry.call.durationMs, 0);
  const inputTokens = options.result.trace.reduce((sum, entry) => sum + (entry.call.usage?.inputTokens ?? 0), 0);
  const outputTokens = options.result.trace.reduce((sum, entry) => sum + (entry.call.usage?.outputTokens ?? 0), 0);
  const interventionDepth: DiagnosticQualityAssessment['interventionDepth'] = !correctFinal
    ? 'UNRESOLVED'
    : directCoaching.length > 0
      ? 'DIRECT_COACHING'
      : boundaryExplanations.length > 0
        ? 'ITEM_BOUNDARY_EXPLANATION'
      : correctiveQuestions.length > 0
        ? 'INDIRECT_CORRECTION'
        : diagnosticQuestions.length > 0
          ? 'DIAGNOSTIC'
          : 'EXTERNALIZATION';
  const categories = failureCategories(expectation, checks);
  return DiagnosticQualityAssessmentSchema.parse({
    caseId: expectation.caseId,
    checks,
    counts: {
      evaluatorCalls: options.result.trace.length,
      diagnosticQuestions: diagnosticQuestions.length,
      correctiveQuestions: correctiveQuestions.length,
      directCoachingActions: directCoaching.length,
      itemBoundaryExplanations: boundaryExplanations.length,
    },
    performance: { totalDurationMs, inputTokens, outputTokens },
    interventionDepth,
    failureCategories: categories,
    passed: categories.length === 0,
  });
}

export function createProblemDiagnosticQualityReport(options: {
  readonly generatedAt: string;
  readonly assessments: readonly DiagnosticQualityAssessment[];
}): DiagnosticQualityReport {
  const assessments = options.assessments.map((item) => DiagnosticQualityAssessmentSchema.parse(item));
  if (assessments.length === 0) throw new Error('품질 보고서에는 한 개 이상의 사례가 필요하다.');
  const total = assessments.length;
  const failureCounts = Object.fromEntries(
    DiagnosticQualityFailureCategorySchema.options.map((category) => [
      category,
      assessments.filter((item) => item.failureCategories.includes(category)).length,
    ]),
  );
  const passedCases = assessments.filter((item) => item.passed).length;
  const answerLeakCount = assessments.filter((item) => !item.checks.answerNotLeaked.passed).length;
  const transitionFailureCount = assessments.filter(
    (item) => !item.checks.sessionTransitionCorrect.passed,
  ).length;
  const observedMax = Math.max(...assessments.map((item) => item.counts.diagnosticQuestions));
  const maxDiagnosticQuestions = Math.max(1, Math.min(2, observedMax + 1));
  const passRate = passedCases / total;
  const mvpDecision = answerLeakCount > 0 || transitionFailureCount > 0
    ? 'NO_GO'
    : passRate === 1
      ? 'GO'
      : passRate >= 0.8
        ? 'CONDITIONAL_GO'
        : 'NO_GO';
  return DiagnosticQualityReportSchema.parse({
    schemaVersion: 'problem-diagnostic-quality-report-v1',
    generatedAt: options.generatedAt,
    assessments,
    summary: {
      totalCases: total,
      passedCases,
      passRate,
      averageDiagnosticQuestions: assessments.reduce(
        (sum, item) => sum + item.counts.diagnosticQuestions,
        0,
      ) / total,
      answerLeakCount,
      transitionFailureCount,
      averageDurationMs: assessments.reduce(
        (sum, item) => sum + item.performance.totalDurationMs,
        0,
      ) / total,
      totalInputTokens: assessments.reduce((sum, item) => sum + item.performance.inputTokens, 0),
      totalOutputTokens: assessments.reduce((sum, item) => sum + item.performance.outputTokens, 0),
      failureCounts,
    },
    policyRecommendation: {
      maxDiagnosticQuestions,
      rationale: `관찰된 최대 진단 질문은 ${observedMax}회였다. 모호한 응답의 추가 확인 여유를 포함하되 과잉 질문을 막기 위해 상한을 ${maxDiagnosticQuestions}회로 유지한다.`,
      interventionOrder: [
        'DIAGNOSTIC_IF_NEEDED',
        'INDIRECT_CORRECTION',
        'DIRECT_COACHING',
      ],
    },
    mvpDecision,
  });
}
