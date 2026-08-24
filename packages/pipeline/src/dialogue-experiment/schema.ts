import { z } from 'zod/v4';

export const DIALOGUE_SCHEMA_VERSION = 'dialogue-evaluation-openai-v4';
export const DIALOGUE_PROMPT_VERSION = 'dialogue-prompt-v6';
export const DIALOGUE_GOLD_VERSION = 'paragraph-diagnostic-gold-v1';

export const ParagraphDiagnosticGoldSchema = z.object({
  paragraphId: z.string().min(1),
  paragraphText: z.string().min(1),
  centralObject: z.string().min(1),
  centralStory: z.string().min(1),
  coreRelations: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    }),
  ).min(1),
  keyMappings: z.array(
    z.object({
      left: z.string().min(1),
      right: z.string().min(1),
    }),
  ).optional(),
  supportingConcepts: z.array(z.string().min(1)).optional(),
});

export type ParagraphDiagnosticGold = z.infer<typeof ParagraphDiagnosticGoldSchema>;

export const EvidenceSourceSchema = z.enum(['initial', 'diagnostic', 'corrective']);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const RelationStateSchema = z.enum([
  'explicit',
  'entailed',
  'contradicted',
  'unknown',
]);
export type RelationState = z.infer<typeof RelationStateSchema>;

export const StudentRepresentationSnapshotSchema = z.object({
  turn: z.number().int().nonnegative(),
  centralObjectRepresentation: z.string().nullable(),
  centralStoryRepresentation: z.string().nullable(),
  expressedClaims: z.array(
    z.object({
      description: z.string().min(1),
      source: EvidenceSourceSchema,
      evidence: z.string().min(1),
    }),
  ),
  relationStates: z.array(
    z.object({
      relationId: z.string().min(1),
      state: RelationStateSchema,
      source: EvidenceSourceSchema.optional(),
      evidence: z.string().optional(),
    }),
  ),
  explicitErrors: z.array(
    z.object({
      description: z.string().min(1),
      relatedRelationIds: z.array(z.string()),
      evidence: z.string().min(1),
    }),
  ),
  unresolvedQuestions: z.array(z.string()),
});

export type StudentRepresentationSnapshot = z.infer<
  typeof StudentRepresentationSnapshotSchema
>;

export const EvaluationStatusSchema = z.enum(['PASS', 'UNCLEAR', 'ERROR']);
export type EvaluationStatus = z.infer<typeof EvaluationStatusSchema>;

export const QuestionTypeSchema = z.enum(['DIAGNOSTIC', 'CORRECTIVE']);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const EvaluationResultOutputSchema = z.object({
  status: EvaluationStatusSchema,
  snapshot: StudentRepresentationSnapshotSchema,
  decisionSummary: z.string().min(1),
  targetIssue: z.object({
    description: z.string().min(1),
    relatedRelationIds: z.array(z.string()),
  }).nullable(),
  nextQuestion: z.object({
    type: QuestionTypeSchema,
    text: z.string().min(1),
  }).nullable(),
  studentFeedback: z.string().min(1),
});

export type EvaluationResult = z.infer<typeof EvaluationResultOutputSchema>;

export const PASS_STUDENT_FEEDBACK = '핵심 논리를 잘 파악했습니다.';

/**
 * 모델이 unknown에 근거 메타데이터를 붙여도 저장 표상에서는 제거한다.
 * 오류 목록은 contradicted 관계에서 파생하고 PASS 피드백은 고정 문구로 제한한다.
 */
function deriveExplicitErrors(
  relationStates: StudentRepresentationSnapshot['relationStates'],
  gold: ParagraphDiagnosticGold,
): StudentRepresentationSnapshot['explicitErrors'] {
  const descriptions = new Map(
    gold.coreRelations.map((relation) => [relation.id, relation.description]),
  );
  return relationStates.flatMap((relation) => {
    if (relation.state !== 'contradicted') return [];
    const description = descriptions.get(relation.relationId);
    if (description === undefined) return [];
    return [{
      description: `다음 핵심 관계와 충돌한다: ${description}`,
      relatedRelationIds: [relation.relationId],
      evidence: relation.evidence ?? '',
    }];
  });
}

export function normalizeEvaluationResult(
  value: unknown,
  gold: ParagraphDiagnosticGold,
): EvaluationResult {
  const parsed = EvaluationResultOutputSchema.parse(value);
  const relationStates = parsed.snapshot.relationStates.map((relation) =>
    relation.state === 'unknown'
      ? { relationId: relation.relationId, state: relation.state }
      : relation,
  );
  return {
    ...parsed,
    snapshot: {
      ...parsed.snapshot,
      relationStates,
      // 모델이 반환한 중복 필드는 신뢰하지 않고 관계 판정에서 결정적으로 파생한다.
      explicitErrors: deriveExplicitErrors(relationStates, gold),
    },
    studentFeedback:
      parsed.status === 'PASS' ? PASS_STUDENT_FEEDBACK : parsed.studentFeedback,
  };
}

/** JSON Schema로 표현하기 어려운 턴별 일관성은 파싱 직후 별도로 검증한다. */
export function validateEvaluationResult(
  value: unknown,
  options: {
    readonly canAskQuestion: boolean;
    readonly expectedTurn: number;
    readonly gold: ParagraphDiagnosticGold;
  },
): EvaluationResult {
  let result = normalizeEvaluationResult(value, options.gold);

  if (result.snapshot.turn !== options.expectedTurn) {
    throw new Error(
      `dialogue evaluation: snapshot.turn ${result.snapshot.turn}, expected ${options.expectedTurn}`,
    );
  }

  for (const relation of result.snapshot.relationStates) {
    if (
      relation.state !== 'unknown' &&
      (relation.source === undefined ||
        relation.evidence === undefined ||
        relation.evidence.trim() === '')
    ) {
      throw new Error(
        `dialogue evaluation: ${relation.state} relation requires source and evidence`,
      );
    }
  }

  const contradictedIds = new Set(
    result.snapshot.relationStates
      .filter((relation) => relation.state === 'contradicted')
      .map((relation) => relation.relationId),
  );
  const unknownIds = new Set(
    result.snapshot.relationStates
      .filter((relation) => relation.state === 'unknown')
      .map((relation) => relation.relationId),
  );

  if (result.status === 'PASS') {
    if (contradictedIds.size > 0) {
      throw new Error('dialogue evaluation: PASS must not include contradicted relations');
    }
    if (result.targetIssue !== null || result.nextQuestion !== null) {
      throw new Error('dialogue evaluation: PASS must not include targetIssue or nextQuestion');
    }
    return result;
  }

  if (result.targetIssue === null) {
    throw new Error('dialogue evaluation: non-PASS result requires targetIssue');
  }
  if (result.status === 'ERROR') {
    if (contradictedIds.size === 0) {
      throw new Error('dialogue evaluation: ERROR requires a contradicted relation');
    }
    if (
      result.targetIssue.relatedRelationIds.length === 0 ||
      result.targetIssue.relatedRelationIds.some((id) => !contradictedIds.has(id))
    ) {
      throw new Error('dialogue evaluation: ERROR targetIssue must select contradicted relations');
    }
  } else {
    if (contradictedIds.size > 0) {
      throw new Error('dialogue evaluation: UNCLEAR must not include contradicted relations');
    }
    if (
      result.targetIssue.relatedRelationIds.length !== 1 ||
      !unknownIds.has(result.targetIssue.relatedRelationIds[0]!)
    ) {
      throw new Error('dialogue evaluation: UNCLEAR targetIssue must select exactly one unknown relation');
    }
  }

  if (!options.canAskQuestion) {
    // 질문 예산은 모델 출력보다 코드의 세션 상태가 우선한다.
    result = { ...result, nextQuestion: null };
    return result;
  }

  const expected = result.status === 'UNCLEAR' ? 'DIAGNOSTIC' : 'CORRECTIVE';
  if (result.nextQuestion?.type !== expected || result.nextQuestion.text.trim() === '') {
    throw new Error(`dialogue evaluation: ${result.status} requires a ${expected} question`);
  }
  return result;
}

export function emptySnapshot(): StudentRepresentationSnapshot {
  return {
    turn: 0,
    centralObjectRepresentation: null,
    centralStoryRepresentation: null,
    expressedClaims: [],
    relationStates: [],
    explicitErrors: [],
    unresolvedQuestions: [],
  };
}
