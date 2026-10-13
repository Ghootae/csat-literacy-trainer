import { z } from 'zod/v4';

import type { ParagraphUnderstandingHandoff } from '../learning-session/handoff.js';
import type { ProblemSolvingSession } from '../problem-solving/session.js';

export const STUDENT_EVIDENCE_VERSION = 'student-evidence-v1' as const;
export const STUDENT_PROFILE_VERSION = 'student-profile-v1' as const;
export const PERIODIC_FEEDBACK_VERSION = 'periodic-feedback-v1' as const;

export const StudentStateDimensionSchema = z.enum([
  'CORE_COMPREHENSION',
  'GROUNDED_PROBLEM_SOLVING',
  'REPAIR_RECOVERY',
  'SELF_MONITORING',
]);
export type StudentStateDimension = z.infer<typeof StudentStateDimensionSchema>;

export const EvidenceJudgmentSchema = z.enum(['POSITIVE', 'NEGATIVE', 'INDETERMINATE']);
export const AssistanceLevelSchema = z.enum([
  'INDEPENDENT',
  'DIAGNOSTIC',
  'CORRECTIVE',
  'COACHING',
  'ANSWER_REVEALED',
]);

const EvidenceBaseSchema = z.object({
  schemaVersion: z.literal(STUDENT_EVIDENCE_VERSION),
  eventId: z.string().min(1),
  studentId: z.string().min(1),
  learningSessionId: z.string().min(1),
  context: z.enum(['STUDENT', 'DEVELOPER', 'HISTORICAL_UNKNOWN']),
  observedAt: z.string().datetime(),
  dimension: StudentStateDimensionSchema,
  judgment: EvidenceJudgmentSchema,
  assistance: AssistanceLevelSchema,
  source: z.object({
    kind: z.enum(['PARAGRAPH', 'PROBLEM']),
    passageId: z.string().min(1).nullable(),
    contentId: z.string().min(1),
    evidenceKey: z.string().min(1),
    evaluatorVersion: z.string().min(1),
  }),
});

export const StudentEvidenceEventSchema = EvidenceBaseSchema.extend({
  observation: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('PARAGRAPH_INITIAL_AXIS'),
      axisId: z.string().min(1),
      initialState: z.enum(['captured', 'partial', 'unknown', 'distorted']),
    }),
    z.object({
      kind: z.literal('PARAGRAPH_RELATION_TRANSITION'),
      relationId: z.string().min(1),
      transition: z.enum(['CORRECTED', 'NEWLY_CONFIRMED', 'PERSISTENT_CONTRADICTION', 'PERSISTENT_UNKNOWN']),
    }),
    z.object({
      kind: z.literal('PROBLEM_INITIAL_GROUNDING'),
      initialChoiceWasCorrect: z.boolean(),
      rationaleAssessment: z.enum(['NOT_PROVIDED', 'NOT_EVALUATED', 'SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
    }),
    z.object({
      kind: z.literal('PROBLEM_REPAIR'),
      resolvedByStudent: z.boolean(),
      resolutionStage: z.enum(['INITIAL', 'SECOND_SELECTION', 'THIRD_SELECTION', 'ANSWER_REVEALED']),
      effectiveRepairPath: z.enum(['DIAGNOSTIC_ONLY', 'CORRECTIVE_ONLY', 'DIAGNOSTIC_THEN_CORRECTIVE', 'ITEM_BOUNDARY', 'DIRECT_COACHING', 'STATIC_ANSWER_EXPLANATION']),
    }),
    z.object({
      kind: z.literal('CONFIDENCE_CALIBRATION'),
      confidence: z.number().min(0).max(100),
      initialChoiceWasCorrect: z.boolean(),
      absoluteError: z.number().min(0).max(1),
      squaredError: z.number().min(0).max(1),
    }),
  ]),
}).superRefine((event, context) => {
  const expected: Record<
    'PARAGRAPH_INITIAL_AXIS' | 'PARAGRAPH_RELATION_TRANSITION' | 'PROBLEM_INITIAL_GROUNDING' | 'PROBLEM_REPAIR' | 'CONFIDENCE_CALIBRATION', {
    dimension: StudentStateDimension;
    sourceKind: 'PARAGRAPH' | 'PROBLEM';
  }> = {
    PARAGRAPH_INITIAL_AXIS: { dimension: 'CORE_COMPREHENSION', sourceKind: 'PARAGRAPH' },
    PARAGRAPH_RELATION_TRANSITION: { dimension: 'REPAIR_RECOVERY', sourceKind: 'PARAGRAPH' },
    PROBLEM_INITIAL_GROUNDING: { dimension: 'GROUNDED_PROBLEM_SOLVING', sourceKind: 'PROBLEM' },
    PROBLEM_REPAIR: { dimension: 'REPAIR_RECOVERY', sourceKind: 'PROBLEM' },
    CONFIDENCE_CALIBRATION: { dimension: 'SELF_MONITORING', sourceKind: 'PROBLEM' },
  };
  const contract = expected[event.observation.kind];
  if (event.dimension !== contract.dimension) {
    context.addIssue({ code: 'custom', path: ['dimension'], message: `${event.observation.kind} 관측의 상태 차원이 올바르지 않습니다.` });
  }
  if (event.source.kind !== contract.sourceKind) {
    context.addIssue({ code: 'custom', path: ['source', 'kind'], message: `${event.observation.kind} 관측의 출처 종류가 올바르지 않습니다.` });
  }
  if (event.observation.kind === 'CONFIDENCE_CALIBRATION') {
    if (event.judgment !== 'INDETERMINATE' || event.assistance !== 'INDEPENDENT') {
      context.addIssue({ code: 'custom', path: ['judgment'], message: '확신도 비교는 이진 상태 판정이나 도움 후 수행으로 기록하지 않습니다.' });
    }
    const actual = event.observation.initialChoiceWasCorrect ? 1 : 0;
    const absoluteError = Math.abs(event.observation.confidence / 100 - actual);
    if (Math.abs(event.observation.absoluteError - absoluteError) > 1e-12 || Math.abs(event.observation.squaredError - absoluteError ** 2) > 1e-12) {
      context.addIssue({ code: 'custom', path: ['observation'], message: '확신도 오차가 원 확신도와 최초 정오에서 계산한 값과 일치하지 않습니다.' });
    }
  }
});
export type StudentEvidenceEvent = z.infer<typeof StudentEvidenceEventSchema>;

function eventId(...parts: readonly string[]) {
  return parts.map((part) => encodeURIComponent(part)).join(':');
}

function paragraphAssistance(
  source: 'initial' | 'diagnostic' | 'corrective' | undefined,
): 'INDEPENDENT' | 'DIAGNOSTIC' | 'CORRECTIVE' {
  if (source === 'diagnostic') return 'DIAGNOSTIC';
  if (source === 'corrective') return 'CORRECTIVE';
  return 'INDEPENDENT';
}

export function paragraphEvidenceEvents(input: {
  readonly studentId: string;
  readonly learningSessionId: string;
  readonly handoff: ParagraphUnderstandingHandoff;
  readonly context?: 'STUDENT' | 'DEVELOPER' | 'HISTORICAL_UNKNOWN';
}): StudentEvidenceEvent[] {
  const events: StudentEvidenceEvent[] = [];
  for (const paragraph of input.handoff.paragraphs) {
    const evaluatorVersion = [
      paragraph.evaluatorRef.runtimeVersion,
      paragraph.evaluatorRef.gatePromptVersion,
      paragraph.evaluatorRef.diagnosticPromptVersion,
    ].join('|');
    const sourceBase = {
      kind: 'PARAGRAPH' as const,
      passageId: input.handoff.passageId,
      contentId: paragraph.paragraphId,
      evaluatorVersion,
    };
    for (const axis of paragraph.trajectory.initialAxisStates) {
      const judgment = axis.state === 'captured'
        ? 'POSITIVE' as const
        : axis.state === 'distorted' ? 'NEGATIVE' as const : 'INDETERMINATE' as const;
      events.push(StudentEvidenceEventSchema.parse({
        schemaVersion: STUDENT_EVIDENCE_VERSION,
        eventId: eventId(input.learningSessionId, paragraph.paragraphId, 'axis', axis.axisId),
        studentId: input.studentId,
        learningSessionId: input.learningSessionId,
        context: input.context ?? 'STUDENT',
        observedAt: input.handoff.generatedAt,
        dimension: 'CORE_COMPREHENSION', judgment, assistance: 'INDEPENDENT',
        source: { ...sourceBase, evidenceKey: `axis:${axis.axisId}` },
        observation: { kind: 'PARAGRAPH_INITIAL_AXIS', axisId: axis.axisId, initialState: axis.state },
      }));
    }
    const finalRelations = new Map(paragraph.currentRepresentation.relationStates.map((relation) => [relation.relationId, relation]));
    const transitions: Array<{
      relationId: string;
      transition: 'CORRECTED' | 'NEWLY_CONFIRMED' | 'PERSISTENT_CONTRADICTION' | 'PERSISTENT_UNKNOWN';
      judgment: 'POSITIVE' | 'NEGATIVE' | 'INDETERMINATE';
    }> = [
      ...paragraph.trajectory.correctedRelationIds.map((relationId) => ({ relationId, transition: 'CORRECTED' as const, judgment: 'POSITIVE' as const })),
      ...paragraph.trajectory.newlyConfirmedRelationIds.map((relationId) => ({ relationId, transition: 'NEWLY_CONFIRMED' as const, judgment: 'POSITIVE' as const })),
      ...paragraph.trajectory.persistentContradictionIds.map((relationId) => ({ relationId, transition: 'PERSISTENT_CONTRADICTION' as const, judgment: 'NEGATIVE' as const })),
    ];
    if (paragraph.dialogue.questionsAnswered > 0) {
      const finalById = new Map(paragraph.currentRepresentation.relationStates.map((relation) => [relation.relationId, relation.state]));
      transitions.push(...paragraph.trajectory.initialRelationStates
        .filter((relation) => relation.state === 'unknown' && finalById.get(relation.relationId) === 'unknown')
        .map((relation) => ({ relationId: relation.relationId, transition: 'PERSISTENT_UNKNOWN' as const, judgment: 'INDETERMINATE' as const })));
    }
    for (const item of transitions) {
      const finalRelation = finalRelations.get(item.relationId);
      const assistance = item.transition === 'PERSISTENT_CONTRADICTION' || item.transition === 'PERSISTENT_UNKNOWN'
        ? paragraph.dialogue.correctiveQuestionCount > 0 ? 'CORRECTIVE' as const
          : paragraph.dialogue.diagnosticQuestionCount > 0 ? 'DIAGNOSTIC' as const : 'INDEPENDENT' as const
        : paragraphAssistance(finalRelation?.source);
      events.push(StudentEvidenceEventSchema.parse({
        schemaVersion: STUDENT_EVIDENCE_VERSION,
        eventId: eventId(input.learningSessionId, paragraph.paragraphId, 'relation', item.relationId, item.transition),
        studentId: input.studentId,
        learningSessionId: input.learningSessionId,
        context: input.context ?? 'STUDENT',
        observedAt: input.handoff.generatedAt,
        dimension: 'REPAIR_RECOVERY', judgment: item.judgment, assistance,
        source: { ...sourceBase, evidenceKey: `relation:${item.relationId}:${item.transition}` },
        observation: { kind: 'PARAGRAPH_RELATION_TRANSITION', relationId: item.relationId, transition: item.transition },
      }));
    }
  }
  return events;
}

type EffectiveRepairPath = Exclude<NonNullable<ProblemSolvingSession['result']>['effectiveRepairPath'], 'NONE'>;

function problemAssistance(path: EffectiveRepairPath) {
  if (path === 'DIAGNOSTIC_ONLY') return 'DIAGNOSTIC' as const;
  if (path === 'CORRECTIVE_ONLY' || path === 'DIAGNOSTIC_THEN_CORRECTIVE') return 'CORRECTIVE' as const;
  if (path === 'DIRECT_COACHING' || path === 'ITEM_BOUNDARY') return 'COACHING' as const;
  if (path === 'STATIC_ANSWER_EXPLANATION') return 'ANSWER_REVEALED' as const;
  throw new Error(`알 수 없는 교정 경로입니다: ${path}`);
}

export function problemEvidenceEvents(input: {
  readonly studentId: string;
  readonly learningSessionId: string;
  readonly passageId?: string | null;
  readonly observedAt: string;
  readonly evaluatorVersion: string;
  readonly context?: 'STUDENT' | 'DEVELOPER' | 'HISTORICAL_UNKNOWN';
  readonly session: ProblemSolvingSession;
}): StudentEvidenceEvent[] {
  const result = input.session.result;
  if (result === null) return [];
  const sourceBase = {
    kind: 'PROBLEM' as const,
    passageId: input.passageId ?? null,
    contentId: input.session.questionId,
    evaluatorVersion: input.evaluatorVersion,
  };
  const groundedJudgment = result.initialChoiceWasCorrect && result.rationaleAssessment === 'SUPPORTED'
    ? 'POSITIVE' as const
    : (!result.initialChoiceWasCorrect || result.rationaleAssessment === 'CLEAR_ERROR')
      ? 'NEGATIVE' as const : 'INDETERMINATE' as const;
  const events: StudentEvidenceEvent[] = [StudentEvidenceEventSchema.parse({
    schemaVersion: STUDENT_EVIDENCE_VERSION,
    eventId: eventId(input.learningSessionId, input.session.questionId, 'grounding'),
    studentId: input.studentId,
    learningSessionId: input.learningSessionId,
    context: input.context ?? 'STUDENT',
    observedAt: input.observedAt,
    dimension: 'GROUNDED_PROBLEM_SOLVING', judgment: groundedJudgment, assistance: 'INDEPENDENT',
    source: { ...sourceBase, evidenceKey: 'initial-grounding' },
    observation: {
      kind: 'PROBLEM_INITIAL_GROUNDING',
      initialChoiceWasCorrect: result.initialChoiceWasCorrect,
      rationaleAssessment: result.rationaleAssessment,
    },
  })];
  if (result.effectiveRepairPath !== 'NONE') {
    events.push(StudentEvidenceEventSchema.parse({
      schemaVersion: STUDENT_EVIDENCE_VERSION,
      eventId: eventId(input.learningSessionId, input.session.questionId, 'repair'),
      studentId: input.studentId,
      learningSessionId: input.learningSessionId,
      context: input.context ?? 'STUDENT',
      observedAt: input.observedAt,
      dimension: 'REPAIR_RECOVERY',
      judgment: result.resolvedByStudent && !result.answerRevealed ? 'POSITIVE' : 'NEGATIVE',
      assistance: problemAssistance(result.effectiveRepairPath),
      source: { ...sourceBase, evidenceKey: 'repair' },
      observation: {
        kind: 'PROBLEM_REPAIR', resolvedByStudent: result.resolvedByStudent,
        resolutionStage: result.resolutionStage, effectiveRepairPath: result.effectiveRepairPath,
      },
    }));
  }
  const initial = input.session.observations.find((observation) => observation.kind === 'INITIAL_SUBMISSION');
  if (initial?.confidence !== null && initial?.confidence !== undefined) {
    const expected = initial.confidence / 100;
    const actual = result.initialChoiceWasCorrect ? 1 : 0;
    const absoluteError = Math.abs(expected - actual);
    events.push(StudentEvidenceEventSchema.parse({
      schemaVersion: STUDENT_EVIDENCE_VERSION,
      eventId: eventId(input.learningSessionId, input.session.questionId, 'confidence'),
      studentId: input.studentId,
      learningSessionId: input.learningSessionId,
      context: input.context ?? 'STUDENT',
      observedAt: input.observedAt,
      dimension: 'SELF_MONITORING', judgment: 'INDETERMINATE', assistance: 'INDEPENDENT',
      source: { ...sourceBase, evidenceKey: 'confidence-calibration' },
      observation: {
        kind: 'CONFIDENCE_CALIBRATION', confidence: initial.confidence,
        initialChoiceWasCorrect: result.initialChoiceWasCorrect,
        absoluteError, squaredError: absoluteError ** 2,
      },
    }));
  }
  return events;
}

const ReliabilitySchema = z.enum(['INSUFFICIENT', 'EARLY_PATTERN', 'REPEATED_PATTERN']);
const DimensionSummarySchema = z.object({
  dimension: StudentStateDimensionSchema,
  positive: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  indeterminate: z.number().int().nonnegative(),
  distinctContentCount: z.number().int().nonnegative(),
  determinateDistinctContentCount: z.number().int().nonnegative(),
  reliability: ReliabilitySchema,
  assistanceCounts: z.record(AssistanceLevelSchema, z.number().int().nonnegative()),
});

export const StudentStateProfileSchema = z.object({
  schemaVersion: z.literal(STUDENT_PROFILE_VERSION),
  studentId: z.string().min(1),
  context: z.enum(['STUDENT', 'DEVELOPER', 'HISTORICAL_UNKNOWN']),
  generatedAt: z.string().datetime(),
  requestedWindow: z.object({ from: z.string().datetime(), to: z.string().datetime() }).nullable(),
  evidenceWindow: z.object({ firstObservedAt: z.string().datetime().nullable(), lastObservedAt: z.string().datetime().nullable() }),
  dimensions: z.array(DimensionSummarySchema),
  selfMonitoring: z.object({
    observationCount: z.number().int().nonnegative(),
    distinctContentCount: z.number().int().nonnegative(),
    meanAbsoluteError: z.number().min(0).max(1).nullable(),
    meanSquaredError: z.number().min(0).max(1).nullable(),
    reliability: ReliabilitySchema,
  }),
  limitations: z.array(z.string()),
});
export type StudentStateProfile = z.infer<typeof StudentStateProfileSchema>;

function reliability(count: number, distinctContentCount: number) {
  if (count < 3 || distinctContentCount < 2) return 'INSUFFICIENT' as const;
  if (count < 8 || distinctContentCount < 4) return 'EARLY_PATTERN' as const;
  return 'REPEATED_PATTERN' as const;
}

export function aggregateStudentState(input: {
  readonly studentId: string;
  readonly generatedAt: string;
  readonly events: readonly StudentEvidenceEvent[];
  readonly context?: StudentEvidenceEvent['context'];
  readonly requestedWindow?: { readonly from: string; readonly to: string } | null;
}): StudentStateProfile {
  const parsedEvents = input.events.map((event) => StudentEvidenceEventSchema.parse(event));
  const eventsById = new Map<string, StudentEvidenceEvent>();
  for (const event of parsedEvents) {
    const existing = eventsById.get(event.eventId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(event)) {
      throw new Error(`같은 eventId에 서로 다른 학생 상태 증거가 있습니다: ${event.eventId}`);
    }
    eventsById.set(event.eventId, event);
  }
  const events = [...eventsById.values()];
  if (events.some((event) => event.studentId !== input.studentId)) throw new Error('다른 학생의 증거를 같은 프로필에 합칠 수 없습니다.');
  const context = input.context ?? events[0]?.context ?? 'STUDENT';
  if (events.some((event) => event.context !== context)) throw new Error('학생용과 개발자용 증거를 같은 프로필에 합칠 수 없습니다.');
  const dimensions = StudentStateDimensionSchema.options.map((dimension) => {
    const selected = events.filter((event) => event.dimension === dimension);
    const content = new Set(selected.map((event) => `${event.source.kind}:${event.source.contentId}`));
    const determinate = selected.filter((event) => event.judgment !== 'INDETERMINATE');
    const determinateContent = new Set(determinate.map((event) => `${event.source.kind}:${event.source.contentId}`));
    const reliabilityEvidence = dimension === 'SELF_MONITORING' ? selected : determinate;
    const reliabilityContent = dimension === 'SELF_MONITORING' ? content : determinateContent;
    const assistanceCounts = Object.fromEntries(AssistanceLevelSchema.options.map((level) => [level, selected.filter((event) => event.assistance === level).length]));
    return {
      dimension,
      positive: selected.filter((event) => event.judgment === 'POSITIVE').length,
      negative: selected.filter((event) => event.judgment === 'NEGATIVE').length,
      indeterminate: selected.filter((event) => event.judgment === 'INDETERMINATE').length,
      distinctContentCount: content.size,
      determinateDistinctContentCount: determinateContent.size,
      reliability: reliability(reliabilityEvidence.length, reliabilityContent.size),
      assistanceCounts,
    };
  });
  const calibration = events.filter((event) => event.observation.kind === 'CONFIDENCE_CALIBRATION');
  const calibrationContent = new Set(calibration.map((event) => `${event.source.kind}:${event.source.contentId}`));
  const dates = events.map((event) => event.observedAt).sort();
  const mean = (values: readonly number[]) => values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
  return StudentStateProfileSchema.parse({
    schemaVersion: STUDENT_PROFILE_VERSION,
    studentId: input.studentId,
    context,
    generatedAt: input.generatedAt,
    requestedWindow: input.requestedWindow ?? null,
    evidenceWindow: { firstObservedAt: dates[0] ?? null, lastObservedAt: dates.at(-1) ?? null },
    dimensions,
    selfMonitoring: {
      observationCount: calibration.length,
      distinctContentCount: calibrationContent.size,
      meanAbsoluteError: mean(calibration.map((event) => event.observation.kind === 'CONFIDENCE_CALIBRATION' ? event.observation.absoluteError : 0)),
      meanSquaredError: mean(calibration.map((event) => event.observation.kind === 'CONFIDENCE_CALIBRATION' ? event.observation.squaredError : 0)),
      reliability: reliability(calibration.length, calibrationContent.size),
    },
    limitations: [
      '콘텐츠 난이도가 보정되지 않아 차원 간 점수나 절대 능력으로 해석할 수 없습니다.',
      '평가기 출력은 관측 증거이며 학생의 실제 내적 상태를 직접 측정하지 않습니다.',
      '서로 다른 평가기 버전의 증거가 섞일 수 있으므로 원 이벤트의 버전을 함께 검토해야 합니다.',
    ],
  });
}

export const PeriodicFeedbackSchema = z.object({
  schemaVersion: z.literal(PERIODIC_FEEDBACK_VERSION),
  studentId: z.string().min(1),
  generatedAt: z.string().datetime(),
  headline: z.string().min(1),
  strengths: z.array(z.string()),
  focusAreas: z.array(z.string()),
  nextAction: z.string().min(1),
  caveats: z.array(z.string()),
});
export type PeriodicFeedback = z.infer<typeof PeriodicFeedbackSchema>;

const dimensionLabel: Record<StudentStateDimension, string> = {
  CORE_COMPREHENSION: '핵심 관계를 도움 없이 파악하는 수행',
  GROUNDED_PROBLEM_SOLVING: '정답 선택과 근거를 함께 연결하는 수행',
  REPAIR_RECOVERY: '질문과 피드백 뒤 이해를 수정하는 수행',
  SELF_MONITORING: '확신과 실제 수행을 맞추는 자기 점검',
};

export function generatePeriodicFeedback(profile: StudentStateProfile): PeriodicFeedback {
  const parsed = StudentStateProfileSchema.parse(profile);
  const strengths: string[] = [];
  const focusAreas: string[] = [];
  let focusNextAction: string | null = null;
  for (const summary of parsed.dimensions.filter((item) => item.dimension !== 'SELF_MONITORING')) {
    const determinate = summary.positive + summary.negative;
    if (summary.reliability === 'INSUFFICIENT' || determinate === 0) continue;
    const label = dimensionLabel[summary.dimension];
    const uncertainty = summary.indeterminate > 0 ? ` 판단을 유보한 증거도 ${summary.indeterminate}건 있습니다.` : '';
    if (summary.positive / determinate >= 0.75) {
      const pattern = summary.reliability === 'REPEATED_PATTERN' ? '반복해서 더 많이 확인됐습니다.' : '현재까지 더 많이 관측된 잠정적 강점 후보입니다.';
      strengths.push(`${label}에서 긍정 증거 ${summary.positive}건, 부정 증거 ${summary.negative}건으로 긍정 증거가 ${pattern}${uncertainty}`);
    } else if (summary.positive / determinate <= 0.5) {
      const pattern = summary.reliability === 'REPEATED_PATTERN' ? '반복 확인된 다음 연습 후보입니다.' : '현재까지의 잠정적 다음 연습 후보입니다.';
      focusAreas.push(`${label}에서 긍정 증거 ${summary.positive}건, 부정 증거 ${summary.negative}건이 관측되어 ${pattern}${uncertainty}`);
      focusNextAction ??= `${label}을 다음 학습에서 도움 없이 한 번 더 확인해 보세요.`;
    }
  }
  if (parsed.selfMonitoring.reliability !== 'INSUFFICIENT' && parsed.selfMonitoring.meanSquaredError !== null) {
    if (parsed.selfMonitoring.meanSquaredError <= 0.15) strengths.push(`확신도와 최초 정오의 차이가 ${parsed.selfMonitoring.observationCount}개 문제에서 비교적 작았습니다.`);
    else if (parsed.selfMonitoring.meanSquaredError >= 0.3) {
      focusAreas.push(`확신도와 최초 정오의 차이가 ${parsed.selfMonitoring.observationCount}개 문제에서 커서, 선택 전 근거를 다시 확인하는 연습이 필요합니다.`);
      focusNextAction ??= '다음 문제에서는 선택 전에 근거를 한 번 더 확인한 뒤 확신도를 기록해 보세요.';
    }
  }
  const nextAction = focusNextAction !== null
    ? focusNextAction
    : strengths.length > 0
      ? '현재 강점이 다른 지문에서도 반복되는지 도움 없이 먼저 답해 보세요.'
      : '아직 반복 자료가 부족합니다. 서로 다른 지문에서 학습을 더 진행해 상태 근거를 쌓아 보세요.';
  const determinateCount = parsed.dimensions.reduce((sum, item) => sum + item.positive + item.negative, 0);
  const calibrationCount = parsed.selfMonitoring.reliability === 'INSUFFICIENT' ? 0 : parsed.selfMonitoring.observationCount;
  const headline = determinateCount > 0 && calibrationCount > 0
    ? `현재 피드백은 판단 가능한 수행 증거 ${determinateCount}건과 확신도 비교 ${calibrationCount}건을 바탕으로 합니다.`
    : determinateCount > 0
      ? `현재 피드백은 판단 가능한 수행 증거 ${determinateCount}건을 바탕으로 합니다.`
      : calibrationCount > 0
        ? `현재 피드백은 확신도 비교 ${calibrationCount}건을 바탕으로 합니다.`
        : '아직 설명할 수 있는 학습 증거가 부족합니다.';
  return PeriodicFeedbackSchema.parse({
    schemaVersion: PERIODIC_FEEDBACK_VERSION,
    studentId: parsed.studentId,
    generatedAt: parsed.generatedAt,
    headline,
    strengths,
    focusAreas,
    nextAction,
    caveats: parsed.limitations,
  });
}
