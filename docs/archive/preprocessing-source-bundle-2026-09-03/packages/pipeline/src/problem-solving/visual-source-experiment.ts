import { z } from 'zod/v4';

export const LENS_VISUAL_OBSERVATION_VERSION = 'lens-visual-observation-v1' as const;
export const LENS_VISUAL_AUDIT_VERSION = 'lens-visual-audit-v1' as const;
export const LENS_VISUAL_TEXT_CONTEXT_VERSION = 'lens-visual-text-context-v1' as const;
export const LENS_VISUAL_REFERENCE_VERSION = 'lens-visual-reference-v1' as const;

export const VisualReadingModeSchema = z.enum(['VISUAL_ONLY', 'TEXT_GROUNDED']);
export type VisualReadingMode = z.infer<typeof VisualReadingModeSchema>;

export const VisualObjectTypeSchema = z.enum([
  'POINT_MARK',
  'LINE_SEGMENT_MARK',
  'CIRCULAR_MARK',
  'AXIS_LINE',
  'RAY_LINE',
  'LENS',
  'PLANE_REGION',
  'TEXT_LABEL',
  'OTHER',
  'UNRESOLVED',
]);

export const VisualRelationTypeSchema = z.enum([
  'ON_DRAWN_LINE',
  'SAME_DRAWN_LINE',
  'NOT_ON_SAME_DRAWN_LINE',
  'ARROW_POINTS_TO',
  'INTERSECTS',
  'CONTAINS',
  'OVERLAPS',
  'VISUALLY_FARTHER_FROM',
  'EXACT_DISTANCE_RATIO',
  'PERPENDICULAR_3D',
  'PLANE_ASSIGNMENT',
  'OTHER',
  'UNRESOLVED',
]);

export const VisualAuthoritySchema = z.enum([
  'EXACT_PIXEL_TOPOLOGY',
  'ILLUSTRATIVE',
  'UNRESOLVED',
]);

const CandidateIdSchema = z.string().regex(/^[A-Z][A-Z0-9_-]*$/);

export const VisualLabelCandidateSchema = z.object({
  candidateId: CandidateIdSchema,
  labelText: z.string().min(1),
  linkedObjectId: CandidateIdSchema.nullable(),
  evidenceDescription: z.string().min(1),
  provenance: z.literal('VISUAL_OBSERVATION'),
  status: z.literal('CANDIDATE'),
}).strict();

export const VisualObjectCandidateSchema = z.object({
  candidateId: CandidateIdSchema,
  linkedLabelTexts: z.array(z.string().min(1)),
  objectType: VisualObjectTypeSchema,
  appearanceDescription: z.string().min(1),
  authority: VisualAuthoritySchema,
  provenance: z.literal('VISUAL_OBSERVATION'),
  status: z.literal('CANDIDATE'),
}).strict();

export const VisualRelationCandidateSchema = z.object({
  candidateId: CandidateIdSchema,
  relationType: VisualRelationTypeSchema,
  subjectObjectIds: z.array(CandidateIdSchema).min(1),
  objectObjectIds: z.array(CandidateIdSchema),
  description: z.string().min(1),
  authority: VisualAuthoritySchema,
  scaleDependent: z.boolean(),
  provenance: z.literal('VISUAL_OBSERVATION'),
  status: z.literal('CANDIDATE'),
}).strict();

export const CrossModalInterpretationSchema = z.object({
  interpretationId: CandidateIdSchema,
  visualCandidateIds: z.array(CandidateIdSchema).min(1),
  sourceTextClaimIds: z.array(CandidateIdSchema).min(1),
  statement: z.string().min(1),
  provenance: z.literal('CROSS_MODAL_INTERPRETATION'),
  status: z.literal('CANDIDATE'),
}).strict();

export const LensVisualObservationSchema = z.object({
  observationVersion: z.literal(LENS_VISUAL_OBSERVATION_VERSION),
  observationId: CandidateIdSchema,
  mode: VisualReadingModeSchema,
  mediaId: z.string().min(1),
  mediaHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  textContextHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).nullable(),
  imageWasViewedAsWhole: z.literal(true),
  croppedImageUsed: z.literal(false),
  labels: z.array(VisualLabelCandidateSchema),
  objects: z.array(VisualObjectCandidateSchema),
  visualRelations: z.array(VisualRelationCandidateSchema),
  crossModalInterpretations: z.array(CrossModalInterpretationSchema),
  unresolved: z.array(z.object({
    unresolvedId: CandidateIdSchema,
    description: z.string().min(1),
    status: z.literal('UNRESOLVED'),
  }).strict()),
}).strict().superRefine((observation, context) => {
  if (observation.mode === 'VISUAL_ONLY' && observation.textContextHash !== null) {
    context.addIssue({
      code: 'custom', path: ['textContextHash'],
      message: '순수 시각 판독에는 텍스트 context hash가 없어야 한다.',
    });
  }
  if (observation.mode === 'VISUAL_ONLY' && observation.crossModalInterpretations.length > 0) {
    context.addIssue({
      code: 'custom', path: ['crossModalInterpretations'],
      message: '순수 시각 판독은 교차 양식 해석을 만들 수 없다.',
    });
  }
  if (observation.mode === 'TEXT_GROUNDED' && observation.textContextHash === null) {
    context.addIssue({
      code: 'custom', path: ['textContextHash'],
      message: '텍스트 결합 판독에는 텍스트 context hash가 필요하다.',
    });
  }
  const allIds = [
    ...observation.labels.map((entry) => entry.candidateId),
    ...observation.objects.map((entry) => entry.candidateId),
    ...observation.visualRelations.map((entry) => entry.candidateId),
    ...observation.crossModalInterpretations.map((entry) => entry.interpretationId),
    ...observation.unresolved.map((entry) => entry.unresolvedId),
  ];
  if (new Set(allIds).size !== allIds.length) {
    context.addIssue({ code: 'custom', path: [], message: '후보 ID가 중복된다.' });
  }
  const objectIds = new Set(observation.objects.map((entry) => entry.candidateId));
  for (const [index, label] of observation.labels.entries()) {
    if (label.linkedObjectId !== null && !objectIds.has(label.linkedObjectId)) {
      context.addIssue({
        code: 'custom', path: ['labels', index, 'linkedObjectId'],
        message: '존재하지 않는 시각 객체를 참조한다.',
      });
    }
  }
  for (const [index, relation] of observation.visualRelations.entries()) {
    for (const objectId of [...relation.subjectObjectIds, ...relation.objectObjectIds]) {
      if (!objectIds.has(objectId)) {
        context.addIssue({
          code: 'custom', path: ['visualRelations', index],
          message: `존재하지 않는 시각 객체 ${objectId}를 참조한다.`,
        });
      }
    }
  }
  const visualCandidateIds = new Set([
    ...observation.labels.map((entry) => entry.candidateId),
    ...observation.objects.map((entry) => entry.candidateId),
    ...observation.visualRelations.map((entry) => entry.candidateId),
  ]);
  for (const [index, interpretation] of observation.crossModalInterpretations.entries()) {
    for (const candidateId of interpretation.visualCandidateIds) {
      if (!visualCandidateIds.has(candidateId)) {
        context.addIssue({
          code: 'custom', path: ['crossModalInterpretations', index, 'visualCandidateIds'],
          message: `존재하지 않는 시각 후보 ${candidateId}를 참조한다.`,
        });
      }
    }
  }
});
export type LensVisualObservation = z.infer<typeof LensVisualObservationSchema>;

export const LensVisualTextContextSchema = z.object({
  contextVersion: z.literal(LENS_VISUAL_TEXT_CONTEXT_VERSION),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceUnitRegistryHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  artifactFrozen: z.literal(true),
  usePolicy: z.literal('VISUAL_EXPERIMENT_ONLY'),
  excludes: z.array(z.enum(['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD'])).length(4),
  claims: z.array(z.object({
    claimId: CandidateIdSchema,
    sourceUnitId: z.string().min(1),
    statement: z.string().min(1),
    sourceQuote: z.string().min(1),
    relationFamily: z.enum([
      'DEFINITION', 'TOPOLOGY', 'PERPENDICULARITY', 'SHAPE', 'RATIO', 'LOCATION', 'CONDITION',
    ]),
    reviewBasis: z.literal('EXACT_SOURCE_TEXT_AND_PRIOR_SOURCE_AUDIT'),
  }).strict()).min(1),
}).strict();
export type LensVisualTextContext = z.infer<typeof LensVisualTextContextSchema>;

export const LensVisualEvaluationReferenceSchema = z.object({
  referenceVersion: z.literal(LENS_VISUAL_REFERENCE_VERSION),
  withheldFromAllApiCalls: z.literal(true),
  mediaHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  requiredLabels: z.array(z.string().min(1)).min(1),
  criticalFacts: z.array(z.object({
    factId: CandidateIdSchema,
    description: z.string().min(1),
  }).strict()).length(6),
  prohibitedVisualAssertions: z.array(z.object({
    ruleId: CandidateIdSchema,
    relationType: z.enum(['EXACT_DISTANCE_RATIO', 'PERPENDICULAR_3D', 'PLANE_ASSIGNMENT']),
    description: z.string().min(1),
  }).strict()).length(3),
}).strict();
export type LensVisualEvaluationReference = z.infer<typeof LensVisualEvaluationReferenceSchema>;

const CheckSchema = z.object({
  id: z.string().min(1),
  passed: z.boolean(),
  matchingCandidateIds: z.array(z.string().min(1)),
}).strict();

export const LensVisualScoreSchema = z.object({
  observationId: z.string().min(1),
  mode: VisualReadingModeSchema,
  labelChecks: z.array(CheckSchema),
  criticalFactChecks: z.array(CheckSchema).length(6),
  prohibitedAssertionChecks: z.array(CheckSchema).length(3),
  labelRecall: z.number().min(0).max(1),
  labelPrecision: z.number().min(0).max(1),
  unexpectedLabelCandidateIds: z.array(z.string().min(1)),
  criticalFactAccuracy: z.number().min(0).max(1),
  prohibitedAssertionCount: z.number().int().nonnegative(),
  corePassed: z.boolean(),
}).strict();
export type LensVisualScore = z.infer<typeof LensVisualScoreSchema>;

function normalizeLabel(value: string): string {
  return value
    .normalize('NFKC')
    .replaceAll(/\s+/gu, '')
    .replaceAll('₀', '0').replaceAll('₁', '1').replaceAll('₂', '2')
    .replaceAll('₃', '3').replaceAll('₄', '4')
    .toLowerCase();
}

function objectIdsForLabel(observation: LensVisualObservation, label: string): string[] {
  const normalized = normalizeLabel(label);
  return observation.objects.filter((object) => (
    object.linkedLabelTexts.some((candidate) => normalizeLabel(candidate) === normalized)
  )).map((object) => object.candidateId);
}

function relationMatches(
  observation: LensVisualObservation,
  relationType: z.infer<typeof VisualRelationTypeSchema>,
  subjectLabels: readonly string[],
  objectLabels: readonly string[] = [],
): string[] {
  const subjectMatches = subjectLabels.map((label) => objectIdsForLabel(observation, label));
  const objectMatches = objectLabels.map((label) => objectIdsForLabel(observation, label));
  if (subjectMatches.some((ids) => ids.length === 0) || objectMatches.some((ids) => ids.length === 0)) {
    return [];
  }
  const subjectIds = new Set(subjectMatches.flat());
  const objectIds = new Set(objectMatches.flat());
  return observation.visualRelations.filter((relation) => {
    if (relation.relationType !== relationType) return false;
    const actualSubjects = new Set(relation.subjectObjectIds);
    const actualObjects = new Set(relation.objectObjectIds);
    return actualSubjects.size === subjectIds.size && actualObjects.size === objectIds.size &&
      [...subjectIds].every((id) => actualSubjects.has(id)) &&
      [...objectIds].every((id) => actualObjects.has(id));
  }).map((relation) => relation.candidateId);
}

export function scoreLensVisualObservation(options: {
  readonly observation: unknown;
  readonly reference: unknown;
}): LensVisualScore {
  const observation = LensVisualObservationSchema.parse(options.observation);
  const reference = LensVisualEvaluationReferenceSchema.parse(options.reference);
  if (observation.mediaHash !== reference.mediaHash) throw new Error('시각 평가 media hash가 다르다.');
  const labelChecks = reference.requiredLabels.map((label) => {
    const matchingCandidateIds = observation.labels.filter(
      (candidate) => normalizeLabel(candidate.labelText) === normalizeLabel(label),
    ).map((candidate) => candidate.candidateId);
    return { id: `LABEL:${label}`, passed: matchingCandidateIds.length >= 1, matchingCandidateIds };
  });
  const shape = (factId: string, label: string, objectType: z.infer<typeof VisualObjectTypeSchema>) => {
    const matchingCandidateIds = observation.objects.filter((object) => (
      object.objectType === objectType &&
      object.linkedLabelTexts.some((candidate) => normalizeLabel(candidate) === normalizeLabel(label))
    )).map((object) => object.candidateId);
    return { id: factId, passed: matchingCandidateIds.length >= 1, matchingCandidateIds };
  };
  const criticalFactChecks = [
    shape('VF_C_SEGMENT', 'C', 'LINE_SEGMENT_MARK'),
    shape('VF_D_SEGMENT', 'D', 'LINE_SEGMENT_MARK'),
    shape('VF_E_CIRCLE', 'E', 'CIRCULAR_MARK'),
    {
      id: 'VF_P012_SAME_DRAWN_LINE',
      matchingCandidateIds: relationMatches(observation, 'SAME_DRAWN_LINE', ['P0', 'P1', 'P2']),
    },
    {
      id: 'VF_P3_NOT_SAME_DRAWN_LINE',
      matchingCandidateIds: relationMatches(
        observation, 'NOT_ON_SAME_DRAWN_LINE', ['P3'], ['P0', 'P1', 'P2'],
      ),
    },
    {
      id: 'VF_P4_ON_OPTICAL_AXIS',
      matchingCandidateIds: relationMatches(observation, 'ON_DRAWN_LINE', ['P4'], ['광축']),
    },
  ].map((check) => ({ ...check, passed: check.matchingCandidateIds.length >= 1 }));
  const prohibitedAssertionChecks = reference.prohibitedVisualAssertions.map((rule) => {
    const matchingCandidateIds = observation.visualRelations.filter(
      (relation) => relation.relationType === rule.relationType,
    ).map((relation) => relation.candidateId);
    return { id: rule.ruleId, passed: matchingCandidateIds.length === 0, matchingCandidateIds };
  });
  const labelRecall = labelChecks.filter((check) => check.passed).length / labelChecks.length;
  const expectedLabels = new Set(reference.requiredLabels.map(normalizeLabel));
  const unexpectedLabelCandidateIds = observation.labels.filter(
    (candidate) => !expectedLabels.has(normalizeLabel(candidate.labelText)),
  ).map((candidate) => candidate.candidateId);
  const labelPrecision = observation.labels.length === 0
    ? 0
    : (observation.labels.length - unexpectedLabelCandidateIds.length) / observation.labels.length;
  const criticalFactAccuracy = criticalFactChecks.filter((check) => check.passed).length /
    criticalFactChecks.length;
  const prohibitedAssertionCount = prohibitedAssertionChecks.reduce(
    (sum, check) => sum + check.matchingCandidateIds.length,
    0,
  );
  return LensVisualScoreSchema.parse({
    observationId: observation.observationId,
    mode: observation.mode,
    labelChecks,
    criticalFactChecks,
    prohibitedAssertionChecks,
    labelRecall,
    labelPrecision,
    unexpectedLabelCandidateIds,
    criticalFactAccuracy,
    prohibitedAssertionCount,
    corePassed: labelRecall === 1 && labelPrecision === 1 && criticalFactAccuracy === 1 &&
      prohibitedAssertionCount === 0,
  });
}

export const VisualAuditDecisionSchema = z.enum([
  'PASS', 'WARNING', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED',
]);

const VisualAuditIssueSchema = z.object({
  issueId: CandidateIdSchema,
  issueClass: z.enum([
    'MISSING_LABEL',
    'MISSING_VISUAL_FACT',
    'UNSUPPORTED_VISUAL_FACT',
    'TEXT_AS_VISUAL_LEAKAGE',
    'SCALE_OVERCLAIM',
    'PROVENANCE_ERROR',
    'OTHER',
  ]),
  description: z.string().min(1),
  affectedCandidateIds: z.array(CandidateIdSchema),
}).strict();

export const LensVisualAuditSchema = z.object({
  auditVersion: z.literal(LENS_VISUAL_AUDIT_VERSION),
  auditId: CandidateIdSchema,
  model: z.literal('gpt-5.6-terra'),
  effort: z.enum(['medium', 'high']),
  independentOfOtherAudit: z.literal(true),
  mediaHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  candidateAudits: z.array(z.object({
    candidateLabel: z.enum(['CANDIDATE_A', 'CANDIDATE_B', 'CANDIDATE_C', 'CANDIDATE_D']),
    declaredMode: VisualReadingModeSchema,
    expectedLabelCandidateIds: z.array(CandidateIdSchema),
    labelCandidateIdsReviewed: z.array(CandidateIdSchema),
    expectedObjectCandidateIds: z.array(CandidateIdSchema),
    objectCandidateIdsReviewed: z.array(CandidateIdSchema),
    expectedRelationCandidateIds: z.array(CandidateIdSchema),
    relationCandidateIdsReviewed: z.array(CandidateIdSchema),
    expectedInterpretationIds: z.array(CandidateIdSchema),
    interpretationIdsReviewed: z.array(CandidateIdSchema),
    missingCriticalVisualMeaning: z.boolean(),
    unsupportedVisualMeaningDetected: z.boolean(),
    textAsVisualLeakageDetected: z.boolean(),
    scaleOverclaimDetected: z.boolean(),
    decision: VisualAuditDecisionSchema,
    issues: z.array(VisualAuditIssueSchema),
  }).strict()).length(4),
  crossCandidateFindings: z.array(z.object({
    findingId: CandidateIdSchema,
    description: z.string().min(1),
    affectedCandidateLabels: z.array(
      z.enum(['CANDIDATE_A', 'CANDIDATE_B', 'CANDIDATE_C', 'CANDIDATE_D']),
    ).min(1),
  }).strict()),
  overallDecision: VisualAuditDecisionSchema,
}).strict().superRefine((audit, context) => {
  const ranks: Record<z.infer<typeof VisualAuditDecisionSchema>, number> = {
    PASS: 0,
    WARNING: 1,
    REPAIR_REQUIRED: 2,
    UNRESOLVED: 3,
    BLOCKING: 4,
  };
  for (const [index, candidate] of audit.candidateAudits.entries()) {
    const hasMeaningIssue = candidate.missingCriticalVisualMeaning ||
      candidate.unsupportedVisualMeaningDetected || candidate.textAsVisualLeakageDetected ||
      candidate.scaleOverclaimDetected;
    if ((candidate.decision === 'PASS' || candidate.decision === 'WARNING') && (
      hasMeaningIssue || candidate.issues.length > 0
    )) {
      context.addIssue({
        code: 'custom', path: ['candidateAudits', index, 'decision'],
        message: '의미 오류나 중요 누락이 있는 후보는 PASS/WARNING일 수 없다.',
      });
    }
  }
  const expectedOverall = audit.candidateAudits.reduce(
    (current, candidate) => ranks[candidate.decision] > ranks[current] ? candidate.decision : current,
    'PASS' as z.infer<typeof VisualAuditDecisionSchema>,
  );
  if (audit.overallDecision !== expectedOverall) {
    context.addIssue({
      code: 'custom', path: ['overallDecision'],
      message: `overallDecision은 후보 중 가장 심각한 ${expectedOverall}이어야 한다.`,
    });
  }
});
export type LensVisualAudit = z.infer<typeof LensVisualAuditSchema>;

function sameIds(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    [...actual].sort().join('|') === [...expected].sort().join('|');
}

export function validateLensVisualAuditCoverage(options: {
  readonly audit: unknown;
  readonly candidates: Readonly<Record<'CANDIDATE_A' | 'CANDIDATE_B' | 'CANDIDATE_C' | 'CANDIDATE_D', unknown>>;
}): LensVisualAudit {
  const audit = LensVisualAuditSchema.parse(options.audit);
  const labels = audit.candidateAudits.map((entry) => entry.candidateLabel);
  if (new Set(labels).size !== 4) throw new Error('감사는 네 후보를 정확히 한 번씩 다뤄야 한다.');
  for (const candidateAudit of audit.candidateAudits) {
    const candidate = LensVisualObservationSchema.parse(options.candidates[candidateAudit.candidateLabel]);
    if (candidateAudit.declaredMode !== candidate.mode) {
      throw new Error(`${candidateAudit.candidateLabel} mode가 후보와 다르다.`);
    }
    const checks: Array<[string, readonly string[], readonly string[], readonly string[]]> = [
      ['label', candidate.labels.map((entry) => entry.candidateId),
        candidateAudit.expectedLabelCandidateIds, candidateAudit.labelCandidateIdsReviewed],
      ['object', candidate.objects.map((entry) => entry.candidateId),
        candidateAudit.expectedObjectCandidateIds, candidateAudit.objectCandidateIdsReviewed],
      ['relation', candidate.visualRelations.map((entry) => entry.candidateId),
        candidateAudit.expectedRelationCandidateIds, candidateAudit.relationCandidateIdsReviewed],
      ['interpretation', candidate.crossModalInterpretations.map((entry) => entry.interpretationId),
        candidateAudit.expectedInterpretationIds, candidateAudit.interpretationIdsReviewed],
    ];
    for (const [kind, actual, expected, reviewed] of checks) {
      if (!sameIds(actual, expected) || !sameIds(expected, reviewed)) {
        throw new Error(`${candidateAudit.candidateLabel}의 ${kind} coverage가 정확하지 않다.`);
      }
    }
  }
  return audit;
}
