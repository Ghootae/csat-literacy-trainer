import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  CandidateDivergenceLayerSchema,
} from './gold.js';
import {
  DiagnosticTargetKindSchema,
  TargetSufficiencySchema,
} from './episode.js';

export const PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION =
  'problem-path-evaluator-output-v2' as const;
export const PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION =
  'path-diagnostic-prompt-v2' as const;

export function loadProblemPathDiagnosticPrompt(): string {
  return readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/experiments/problem-solving/path-diagnostic-prompt-v2.md',
  ), 'utf8').trim();
}

export const PathEpistemicStatusSchema = z.enum([
  'OBSERVED',
  'SUPPORTED_INFERENCE',
  'HYPOTHESIS',
  'UNKNOWN',
]);

export const PathTemporalRoleSchema = z.enum([
  'INITIAL',
  'POST_DIAGNOSTIC',
  'POST_CORRECTION',
  'CURRENT',
]);

export const PathRelationToPriorSchema = z.enum([
  'NEW',
  'CONSISTENT',
  'CONFLICTING',
  'REVISES_PRIOR',
]);

export const TargetErrorAssessmentSchema = z.enum([
  'CLEAR_ERROR',
  'UNCERTAIN',
  'REASONABLE_ALTERNATIVE_INTERPRETATION',
  'GOLD_OR_ITEM_LIMITATION',
  'NO_ERROR_DETECTED',
]);

const QuoteEvidenceSchema = z.object({
  kind: z.literal('QUOTE'),
  observationId: z.string().min(1),
  sourceField: z.enum([
    'rationale',
    'strategy',
    'runnerUp.rationale',
    'rawResponse',
  ]),
  quote: z.string().min(1),
}).strict();

const StructuredValueEvidenceSchema = z.object({
  kind: z.literal('STRUCTURED_VALUE'),
  observationId: z.string().min(1),
  field: z.enum([
    'initialChoiceId',
    'submittedChoiceId',
    'selectedChoiceId',
    'confidence',
    'runnerUp.choiceId',
    'responseType',
  ]),
  value: z.union([z.string(), z.number(), z.null()]),
}).strict();

export const EvaluatorEvidenceSchema = z.discriminatedUnion('kind', [
  QuoteEvidenceSchema,
  StructuredValueEvidenceSchema,
]);

export const EvaluatorEntityIdentitySchema = z.object({
  existingId: z.string().min(1).nullable(),
  localId: z.string().min(1).nullable(),
}).strict().superRefine((identity, context) => {
  if ((identity.existingId === null) === (identity.localId === null)) {
    context.addIssue({
      code: 'custom',
      message: '기존 ID와 호출 로컬 ID 중 정확히 하나만 사용해야 한다.',
    });
  }
});

export function evaluatorEntityRef(
  identity: z.infer<typeof EvaluatorEntityIdentitySchema>,
): string {
  return identity.existingId ?? identity.localId!;
}

export const InterventionTypeSchema = z.enum([
  'CLARIFY_SELECTION_REASON',
  'CLARIFY_OPTION_MEANING',
  'RESTORE_PASSAGE_RELATION',
  'CLARIFY_SCENARIO_FACT',
  'CLARIFY_VISUAL_REPRESENTATION',
  'DISTINGUISH_CONCEPTS',
  'REMAP_CONCEPT_TO_SCENARIO',
  'REAPPLY_CONDITION',
  'REVISE_INFERENCE',
  'CHECK_STEM_POLARITY',
  'CHECK_SELECTION_EXECUTION',
  'EXPLAIN_ITEM_BOUNDARY',
  'REQUEST_RESELECTION',
  'DIRECT_EXPLANATION',
]);

export const InterventionDescriptorSchema = z.object({
  targetKind: DiagnosticTargetKindSchema,
  divergenceLayer: CandidateDivergenceLayerSchema,
  targetRelationRefs: z.array(z.string().min(1)),
  interventionType: InterventionTypeSchema,
}).strict();

export function createInterventionSignature(
  descriptor: z.infer<typeof InterventionDescriptorSchema>,
): string {
  return [
    descriptor.targetKind,
    descriptor.divergenceLayer,
    descriptor.interventionType,
    [...descriptor.targetRelationRefs].sort().join(','),
  ].join('|');
}

export const EvaluatorPathStepSchema = z.object({
  identity: EvaluatorEntityIdentitySchema,
  content: z.string().min(1),
  epistemicStatus: PathEpistemicStatusSchema,
  temporalRole: PathTemporalRoleSchema,
  relationToPrior: PathRelationToPriorSchema,
  evidence: z.array(EvaluatorEvidenceSchema),
  goldRefs: z.array(z.string().min(1)),
}).strict().superRefine((step, context) => {
  const quoteCount = step.evidence.filter((item) => item.kind === 'QUOTE').length;
  if (step.epistemicStatus === 'UNKNOWN') {
    if (step.evidence.length > 0 || step.goldRefs.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'UNKNOWN 단계에는 학생 근거나 골드 참조를 붙이지 않는다.',
      });
    }
    return;
  }
  if (step.evidence.length === 0) {
    context.addIssue({ code: 'custom', path: ['evidence'], message: '경로 단계에는 관찰 근거가 필요하다.' });
  }
  if (step.epistemicStatus === 'SUPPORTED_INFERENCE' && quoteCount === 0) {
    context.addIssue({
      code: 'custom',
      path: ['evidence'],
      message: '지지된 추론에는 학생 자유 발화의 실제 인용이 필요하다.',
    });
  }
});

export const EvaluatorHypothesisSchema = z.object({
  identity: EvaluatorEntityIdentitySchema,
  kind: z.enum([
    'STUDENT_ERROR',
    'ITEM_INTERPRETATION_AMBIGUITY',
    'RATIONAL_CHALLENGE',
    'INSUFFICIENT_EVIDENCE',
  ]),
  description: z.string().min(1),
  epistemicStatus: z.enum(['SUPPORTED_INFERENCE', 'HYPOTHESIS']),
  plausibility: z.enum(['ACTIVE', 'SECONDARY', 'REJECTED']),
  candidateDivergenceLayers: z.array(CandidateDivergenceLayerSchema),
  intervention: InterventionDescriptorSchema,
  evidence: z.array(EvaluatorEvidenceSchema).min(1),
  goldRefs: z.object({
    optionClaimIds: z.array(z.string().min(1)),
    representativeWrongPathIds: z.array(z.string().min(1)),
  }).strict(),
}).strict().superRefine((hypothesis, context) => {
  if (
    hypothesis.epistemicStatus === 'SUPPORTED_INFERENCE' &&
    !hypothesis.evidence.some((item) => item.kind === 'QUOTE')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['evidence'],
      message: '지지된 가설에는 학생 자유 발화의 실제 인용이 필요하다.',
    });
  }
});

const UnevaluatedTargetSnapshotSchema = z.object({
  kind: DiagnosticTargetKindSchema,
  choiceId: z.string().min(1),
  status: z.enum(['NOT_ASSESSED', 'NOT_DIRECTLY_DIAGNOSED']),
  errorAssessment: z.null(),
  pathSteps: z.array(EvaluatorPathStepSchema).max(0),
  hypotheses: z.array(EvaluatorHypothesisSchema).max(0),
  sufficiency: z.null(),
}).strict();

const EvaluatedTargetSnapshotSchema = z.object({
  kind: DiagnosticTargetKindSchema,
  choiceId: z.string().min(1),
  status: z.enum([
    'INSUFFICIENT',
    'SUFFICIENT',
    'RESOLVED',
    'BOUNDARY_CLARIFICATION_REQUIRED',
  ]),
  errorAssessment: TargetErrorAssessmentSchema,
  pathSteps: z.array(EvaluatorPathStepSchema).min(1),
  hypotheses: z.array(EvaluatorHypothesisSchema),
  sufficiency: TargetSufficiencySchema,
}).strict().superRefine((target, context) => {
  const expectsSufficient = target.status !== 'INSUFFICIENT';
  if (target.sufficiency.sufficient !== expectsSufficient) {
    context.addIssue({
      code: 'custom',
      path: ['sufficiency', 'sufficient'],
      message: '타깃 상태와 충분성 판정이 일치하지 않는다.',
    });
  }
  if (
    target.status === 'BOUNDARY_CLARIFICATION_REQUIRED' &&
    ![
      'REASONABLE_ALTERNATIVE_INTERPRETATION',
      'GOLD_OR_ITEM_LIMITATION',
    ].includes(target.errorAssessment)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['errorAssessment'],
      message: '문항 경계 상태에는 합리적 대안 해석 또는 문항 한계 판정이 필요하다.',
    });
  }
  for (const [index, hypothesis] of target.hypotheses.entries()) {
    if (hypothesis.intervention.targetKind !== target.kind) {
      context.addIssue({
        code: 'custom',
        path: ['hypotheses', index, 'intervention', 'targetKind'],
        message: '가설의 개입 타깃이 진단 타깃과 일치해야 한다.',
      });
    }
  }
});

export const EvaluatorTargetSnapshotSchema = z.union([
  UnevaluatedTargetSnapshotSchema,
  EvaluatedTargetSnapshotSchema,
]);

const DiagnosticQuestionIntentSchema = z.object({
  kind: z.literal('DIAGNOSTIC'),
  purpose: z.string().min(1),
  distinguishesHypothesisRefs: z.array(z.string().min(1)),
  resolvesUnknownStepRefs: z.array(z.string().min(1)),
  targetRelationRefs: z.array(z.string().min(1)),
  interventionStrength: z.literal('DIAGNOSTIC'),
}).strict().superRefine((intent, context) => {
  if (
    intent.distinguishesHypothesisRefs.length === 0 &&
    intent.resolvesUnknownStepRefs.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      message: '진단 질문은 가설을 구별하거나 UNKNOWN 단계 하나를 해소해야 한다.',
    });
  }
});

const CorrectiveQuestionIntentSchema = z.object({
  kind: z.literal('CORRECTIVE'),
  purpose: z.string().min(1),
  targetedHypothesisRefs: z.array(z.string().min(1)).min(1),
  targetRelationRefs: z.array(z.string().min(1)).min(1),
  interventionStrength: z.enum(['INDIRECT', 'DIRECT']),
}).strict();

export const EvaluatorQuestionIntentSchema = z.discriminatedUnion('kind', [
  DiagnosticQuestionIntentSchema,
  CorrectiveQuestionIntentSchema,
]);

const AskDiagnosticCandidateSchema = z.object({
  type: z.literal('ASK_DIAGNOSTIC'),
  target: DiagnosticTargetKindSchema,
  questionIntent: DiagnosticQuestionIntentSchema,
  questionText: z.string().min(1),
  studentMessage: z.null(),
  supplementalInferenceIds: z.array(z.string()).max(0),
}).strict();

const AskCorrectiveCandidateSchema = z.object({
  type: z.literal('ASK_CORRECTIVE'),
  target: DiagnosticTargetKindSchema,
  questionIntent: CorrectiveQuestionIntentSchema,
  questionText: z.string().min(1),
  studentMessage: z.null(),
  supplementalInferenceIds: z.array(z.string()).max(0),
}).strict();

const RequestReselectionCandidateSchema = z.object({
  type: z.literal('REQUEST_RESELECTION'),
  target: z.null(),
  questionIntent: z.null(),
  questionText: z.null(),
  studentMessage: z.string().min(1),
  supplementalInferenceIds: z.array(z.string()).max(0),
}).strict().superRefine((action, context) => {
  if (/(각|모든|전체)\s*선지/.test(action.studentMessage)) {
    context.addIssue({
      code: 'custom',
      path: ['studentMessage'],
      message: '재선택 문구는 전체 선지 재검사를 요구할 수 없다.',
    });
  }
});

const DirectCoachingCandidateSchema = z.object({
  type: z.literal('DIRECT_COACHING'),
  target: DiagnosticTargetKindSchema,
  reason: z.enum([
    'MAX_DIAGNOSTIC_TURNS',
    'FAILED_CORRECTION',
    'EXPLANATION_REQUEST',
  ]),
  questionIntent: z.null(),
  questionText: z.null(),
  studentMessage: z.string().min(1),
  supplementalInferenceIds: z.array(z.string().min(1)),
}).strict();

const ExplainItemBoundaryCandidateSchema = z.object({
  type: z.literal('EXPLAIN_ITEM_BOUNDARY'),
  target: DiagnosticTargetKindSchema,
  questionIntent: z.null(),
  questionText: z.null(),
  studentMessage: z.string().min(1),
  supplementalInferenceIds: z.array(z.string()).max(0),
}).strict();

const CompleteCandidateSchema = z.object({
  type: z.literal('COMPLETE'),
  target: z.null(),
  questionIntent: z.null(),
  questionText: z.null(),
  studentMessage: z.string().min(1),
  supplementalInferenceIds: z.array(z.string()).max(0),
}).strict();

export const EvaluatorNextActionCandidateSchema = z.discriminatedUnion('type', [
  AskDiagnosticCandidateSchema,
  AskCorrectiveCandidateSchema,
  RequestReselectionCandidateSchema,
  DirectCoachingCandidateSchema,
  ExplainItemBoundaryCandidateSchema,
  CompleteCandidateSchema,
]);

export const DiagnosticDecisionSchema = z.object({
  target: DiagnosticTargetKindSchema.nullable(),
  reason: z.string().min(1),
  targetHypothesisRefs: z.array(z.string().min(1)),
  unresolvedStepRefs: z.array(z.string().min(1)),
}).strict();

export const ProblemPathDiagnosticOutputSchema = z.object({
  schemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
  mode: z.literal('DIAGNOSE_PATH'),
  snapshotMode: z.literal('FULL'),
  basedOnObservationIds: z.array(z.string().min(1)).min(1),
  targets: z.array(EvaluatorTargetSnapshotSchema).min(1).max(2),
  activeTarget: DiagnosticTargetKindSchema.nullable(),
  diagnosticDecision: DiagnosticDecisionSchema,
  nextActionCandidate: EvaluatorNextActionCandidateSchema,
}).strict().superRefine((output, context) => {
  const targetKinds = output.targets.map((target) => target.kind);
  if (new Set(targetKinds).size !== targetKinds.length) {
    context.addIssue({ code: 'custom', path: ['targets'], message: '진단 타깃이 중복됐다.' });
  }

  const stepRefs = new Set<string>();
  const hypothesisRefs = new Set<string>();
  const stepsByTarget = new Map<string, Map<string, z.infer<typeof EvaluatorPathStepSchema>>>();
  const hypothesesByTarget = new Map<string, Set<string>>();
  for (const [targetIndex, target] of output.targets.entries()) {
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') continue;
    const targetSteps = new Map<string, z.infer<typeof EvaluatorPathStepSchema>>();
    const targetHypotheses = new Set<string>();
    for (const [stepIndex, step] of target.pathSteps.entries()) {
      const ref = evaluatorEntityRef(step.identity);
      if (stepRefs.has(ref)) {
        context.addIssue({ code: 'custom', path: ['targets', targetIndex, 'pathSteps', stepIndex], message: '경로 단계 참조가 중복됐다.' });
      }
      stepRefs.add(ref);
      targetSteps.set(ref, step);
    }
    for (const [hypothesisIndex, hypothesis] of target.hypotheses.entries()) {
      const ref = evaluatorEntityRef(hypothesis.identity);
      if (hypothesisRefs.has(ref)) {
        context.addIssue({ code: 'custom', path: ['targets', targetIndex, 'hypotheses', hypothesisIndex], message: '가설 참조가 중복됐다.' });
      }
      hypothesisRefs.add(ref);
      targetHypotheses.add(ref);
    }
    stepsByTarget.set(target.kind, targetSteps);
    hypothesesByTarget.set(target.kind, targetHypotheses);
  }

  const action = output.nextActionCandidate;
  const actionTarget = action.target;
  // 재선택·완료는 특정 타깃에 대한 개입이 아니라 세션 전체 행동이다.
  // 이때도 방금 해결한 타깃을 activeTarget/diagnosticDecision에 남겨
  // 전체 스냅샷의 판단 맥락을 보존할 수 있다.
  if (actionTarget !== null && actionTarget !== output.activeTarget) {
    context.addIssue({
      code: 'custom',
      path: ['activeTarget'],
      message: '활성 타깃과 다음 행동 타깃이 일치해야 한다.',
    });
  }
  if (output.diagnosticDecision.target !== output.activeTarget) {
    context.addIssue({
      code: 'custom',
      path: ['diagnosticDecision', 'target'],
      message: '진단 판단과 활성 타깃이 일치해야 한다.',
    });
  }

  const active = output.activeTarget === null
    ? undefined
    : output.targets.find((target) => target.kind === output.activeTarget);
  if (output.activeTarget !== null && active === undefined) {
    context.addIssue({ code: 'custom', path: ['activeTarget'], message: '활성 타깃이 스냅샷에 없다.' });
    return;
  }

  if (action.type === 'ASK_DIAGNOSTIC') {
    if (active?.status !== 'INSUFFICIENT') {
      context.addIssue({ code: 'custom', path: ['nextActionCandidate'], message: '진단 질문은 불충분한 타깃에만 허용된다.' });
    }
    const activeHypotheses = hypothesesByTarget.get(action.target) ?? new Set();
    const activeSteps = stepsByTarget.get(action.target) ?? new Map();
    for (const ref of action.questionIntent.distinguishesHypothesisRefs) {
      if (!activeHypotheses.has(ref)) context.addIssue({ code: 'custom', path: ['nextActionCandidate', 'questionIntent'], message: `활성 타깃에 존재하지 않는 가설 참조: ${ref}` });
    }
    for (const ref of action.questionIntent.resolvesUnknownStepRefs) {
      if (activeSteps.get(ref)?.epistemicStatus !== 'UNKNOWN') context.addIssue({ code: 'custom', path: ['nextActionCandidate', 'questionIntent'], message: `활성 타깃의 UNKNOWN이 아닌 경로 단계 참조: ${ref}` });
    }
  }
  if (action.type === 'ASK_CORRECTIVE') {
    if (
      active === undefined ||
      active.status !== 'SUFFICIENT' ||
      active.errorAssessment !== 'CLEAR_ERROR'
    ) {
      context.addIssue({ code: 'custom', path: ['nextActionCandidate'], message: '교정 질문은 충분하고 명백한 오류인 타깃에만 허용된다.' });
    }
    const activeHypotheses = hypothesesByTarget.get(action.target) ?? new Set();
    for (const ref of action.questionIntent.targetedHypothesisRefs) {
      if (!activeHypotheses.has(ref)) context.addIssue({ code: 'custom', path: ['nextActionCandidate', 'questionIntent'], message: `활성 타깃에 존재하지 않는 가설 참조: ${ref}` });
    }
  }
  if (action.type === 'EXPLAIN_ITEM_BOUNDARY') {
    if (
      active === undefined ||
      !active.sufficiency?.sufficient ||
      ![
        'REASONABLE_ALTERNATIVE_INTERPRETATION',
        'GOLD_OR_ITEM_LIMITATION',
      ].includes(active.errorAssessment ?? '')
    ) {
      context.addIssue({ code: 'custom', path: ['nextActionCandidate'], message: '문항 경계 설명에는 충분한 합리적 대안 또는 문항 한계 판정이 필요하다.' });
    }
  }
  if (action.type === 'COMPLETE') {
    const evaluated = output.targets.filter(
      (target): target is z.infer<typeof EvaluatedTargetSnapshotSchema> =>
        target.status !== 'NOT_ASSESSED' && target.status !== 'NOT_DIRECTLY_DIAGNOSED',
    );
    if (
      evaluated.length === 0 ||
      evaluated.some((target) => !target.sufficiency.sufficient || target.errorAssessment !== 'NO_ERROR_DETECTED')
    ) {
      context.addIssue({ code: 'custom', path: ['nextActionCandidate'], message: '완료 후보에는 충분하고 오류가 검출되지 않은 평가 타깃이 필요하다.' });
    }
  }

  for (const ref of output.diagnosticDecision.targetHypothesisRefs) {
    const activeHypotheses = output.activeTarget === null
      ? new Set<string>()
      : hypothesesByTarget.get(output.activeTarget) ?? new Set<string>();
    if (!activeHypotheses.has(ref)) context.addIssue({ code: 'custom', path: ['diagnosticDecision'], message: `활성 타깃에 존재하지 않는 가설 참조: ${ref}` });
  }
  for (const ref of output.diagnosticDecision.unresolvedStepRefs) {
    const activeSteps = output.activeTarget === null
      ? new Map<string, z.infer<typeof EvaluatorPathStepSchema>>()
      : stepsByTarget.get(output.activeTarget) ?? new Map<string, z.infer<typeof EvaluatorPathStepSchema>>();
    if (activeSteps.get(ref)?.epistemicStatus !== 'UNKNOWN') context.addIssue({ code: 'custom', path: ['diagnosticDecision'], message: `활성 타깃의 UNKNOWN이 아닌 경로 단계 참조: ${ref}` });
  }
});

function resolvedIdentity(id: string): z.infer<typeof EvaluatorEntityIdentitySchema> {
  return { existingId: id, localId: null };
}

/**
 * 한 호출 안의 local ID를 코드 소유 영구 ID로 원자 변환한다. 이전 existing ID는 보존한다.
 * 반환값만 저장하며 원본 LLM 출력은 감사 로그에 별도로 보존한다.
 */
export function resolveProblemPathEvaluatorIds(
  outputInput: ProblemPathDiagnosticOutput,
  options: { readonly turnSequence: number },
): ProblemPathDiagnosticOutput {
  const output = ProblemPathDiagnosticOutputSchema.parse(outputInput);
  const used = new Set<string>();
  for (const target of output.targets) {
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') continue;
    for (const step of target.pathSteps) {
      if (step.identity.existingId !== null) used.add(step.identity.existingId);
    }
    for (const hypothesis of target.hypotheses) {
      if (hypothesis.identity.existingId !== null) used.add(hypothesis.identity.existingId);
    }
  }
  const mapping = new Map<string, string>();
  let stepIndex = 0;
  let hypothesisIndex = 0;
  function permanent(localId: string, kind: 'STEP' | 'HYPOTHESIS'): string {
    const existing = mapping.get(localId);
    if (existing !== undefined) return existing;
    let candidate: string;
    do {
      const index = kind === 'STEP' ? ++stepIndex : ++hypothesisIndex;
      candidate = kind === 'STEP'
        ? `PS-T${options.turnSequence}-${index}`
        : `PH-T${options.turnSequence}-${index}`;
    } while (used.has(candidate));
    used.add(candidate);
    mapping.set(localId, candidate);
    return candidate;
  }
  function ref(value: string): string {
    return mapping.get(value) ?? value;
  }

  const targets = output.targets.map((target) => {
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') {
      return structuredClone(target);
    }
    return {
      ...structuredClone(target),
      pathSteps: target.pathSteps.map((step) => {
        const id = step.identity.existingId ?? permanent(step.identity.localId!, 'STEP');
        return { ...structuredClone(step), identity: resolvedIdentity(id) };
      }),
      hypotheses: target.hypotheses.map((hypothesis) => {
        const id = hypothesis.identity.existingId ?? permanent(
          hypothesis.identity.localId!,
          'HYPOTHESIS',
        );
        return { ...structuredClone(hypothesis), identity: resolvedIdentity(id) };
      }),
    };
  });

  // 모든 local ID의 영구 ID를 먼저 생성한 뒤 교차 참조를 치환한다.
  for (const target of output.targets) {
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') continue;
    for (const step of target.pathSteps) {
      if (step.identity.localId !== null) permanent(step.identity.localId, 'STEP');
    }
    for (const hypothesis of target.hypotheses) {
      if (hypothesis.identity.localId !== null) permanent(hypothesis.identity.localId, 'HYPOTHESIS');
    }
  }

  const action = structuredClone(output.nextActionCandidate);
  if (action.type === 'ASK_DIAGNOSTIC') {
    action.questionIntent.distinguishesHypothesisRefs =
      action.questionIntent.distinguishesHypothesisRefs.map(ref);
    action.questionIntent.resolvesUnknownStepRefs =
      action.questionIntent.resolvesUnknownStepRefs.map(ref);
  } else if (action.type === 'ASK_CORRECTIVE') {
    action.questionIntent.targetedHypothesisRefs =
      action.questionIntent.targetedHypothesisRefs.map(ref);
  }

  return ProblemPathDiagnosticOutputSchema.parse({
    ...structuredClone(output),
    targets,
    diagnosticDecision: {
      ...structuredClone(output.diagnosticDecision),
      targetHypothesisRefs: output.diagnosticDecision.targetHypothesisRefs.map(ref),
      unresolvedStepRefs: output.diagnosticDecision.unresolvedStepRefs.map(ref),
    },
    nextActionCandidate: action,
  });
}

export const SelectionRationaleEvaluationOutputSchema = z.object({
  schemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
  mode: z.literal('ASSESS_SELECTION_RATIONALE'),
  optionStance: z.enum(['ACCEPTS_OPTION', 'REJECTS_OPTION', 'UNCLEAR']),
  requiredStanceForSelection: z.enum(['ACCEPTS_OPTION', 'REJECTS_OPTION']),
  stanceConsistency: z.enum(['CONSISTENT', 'CONFLICT', 'UNCLEAR']),
  groundingAssessment: z.enum(['SUPPORTED', 'CONTRADICTED', 'NOT_ENOUGH_EVIDENCE']),
  assessment: z.enum(['SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
  reason: z.string().min(1),
  evidence: z.array(EvaluatorEvidenceSchema).min(1),
  sourceRefs: z.array(z.string().min(1)),
}).strict().superRefine((output, context) => {
  if (!output.evidence.some((item) => item.kind === 'QUOTE')) {
    context.addIssue({ code: 'custom', path: ['evidence'], message: '정답 근거 판정에는 학생 근거 원문 인용이 필요하다.' });
  }
  const expectedConsistency = output.optionStance === 'UNCLEAR'
    ? 'UNCLEAR'
    : output.optionStance === output.requiredStanceForSelection
      ? 'CONSISTENT'
      : 'CONFLICT';
  if (output.stanceConsistency !== expectedConsistency) {
    context.addIssue({ code: 'custom', path: ['stanceConsistency'], message: '선지에 대한 학생 태도와 선택에 필요한 태도의 일관성 판정이 맞지 않는다.' });
  }
  const clearError = output.stanceConsistency === 'CONFLICT' ||
    output.groundingAssessment === 'CONTRADICTED';
  if (clearError && output.assessment !== 'CLEAR_ERROR') {
    context.addIssue({ code: 'custom', path: ['assessment'], message: '태도 충돌 또는 근거 사실 충돌은 CLEAR_ERROR여야 한다.' });
  }
  if (!clearError && output.assessment === 'CLEAR_ERROR') {
    context.addIssue({ code: 'custom', path: ['assessment'], message: 'CLEAR_ERROR에는 태도 충돌 또는 근거 사실 충돌이 필요하다.' });
  }
  if (
    output.assessment === 'SUPPORTED' &&
    (
      output.stanceConsistency !== 'CONSISTENT' ||
      output.groundingAssessment !== 'SUPPORTED'
    )
  ) {
    context.addIssue({ code: 'custom', path: ['assessment'], message: 'SUPPORTED에는 일관된 태도와 지지된 근거가 모두 필요하다.' });
  }
  if (
    output.assessment === 'UNCERTAIN' &&
    output.stanceConsistency === 'CONSISTENT' &&
    output.groundingAssessment === 'SUPPORTED'
  ) {
    context.addIssue({ code: 'custom', path: ['assessment'], message: '태도와 근거가 모두 확인되면 UNCERTAIN일 수 없다.' });
  }
  if (output.groundingAssessment === 'CONTRADICTED' && output.sourceRefs.length === 0) {
    context.addIssue({ code: 'custom', path: ['sourceRefs'], message: '사실 충돌 판정에는 충돌하는 출처 참조가 필요하다.' });
  }
});

export const ProblemPathEvaluatorOutputSchema = z.discriminatedUnion('mode', [
  SelectionRationaleEvaluationOutputSchema,
  ProblemPathDiagnosticOutputSchema,
]);

export type EvaluatorEvidence = z.infer<typeof EvaluatorEvidenceSchema>;
export type EvaluatorTargetSnapshot = z.infer<typeof EvaluatorTargetSnapshotSchema>;
export type ProblemPathDiagnosticOutput = z.infer<typeof ProblemPathDiagnosticOutputSchema>;
export type SelectionRationaleEvaluationOutput = z.infer<
  typeof SelectionRationaleEvaluationOutputSchema
>;
export type ProblemPathEvaluatorOutput = z.infer<typeof ProblemPathEvaluatorOutputSchema>;
