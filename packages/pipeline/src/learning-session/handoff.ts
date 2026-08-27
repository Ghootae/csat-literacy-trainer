import { z } from 'zod/v4';

import type { DialogueExperimentSession } from '../dialogue-experiment/session.js';
import {
  CentralAxisStateSchema,
  EvidenceSourceSchema,
  RelationStateSchema,
  StudentRepresentationSnapshotSchema,
  emptySnapshot,
} from '../dialogue-experiment/schema.js';

export const PARAGRAPH_UNDERSTANDING_HANDOFF_VERSION =
  'paragraph-understanding-handoff-v1' as const;

const EvidenceSchema = z.object({
  source: EvidenceSourceSchema,
  evidence: z.string().min(1),
});

export const AxisRepresentationSchema = z.object({
  axisId: z.string().min(1),
  state: CentralAxisStateSchema,
  evidence: z.array(EvidenceSchema),
});

export const RelationRepresentationSchema = z.object({
  relationId: z.string().min(1),
  state: RelationStateSchema,
  source: EvidenceSourceSchema.optional(),
  evidence: z.string().min(1).optional(),
}).superRefine((relation, context) => {
  const hasEvidence = relation.source !== undefined && relation.evidence !== undefined;
  if (relation.state === 'unknown' && hasEvidence) {
    context.addIssue({ code: 'custom', message: 'unknown 관계에는 학생 근거를 저장하지 않는다.' });
  }
  if (relation.state !== 'unknown' && !hasEvidence) {
    context.addIssue({ code: 'custom', message: '확인된 관계에는 출처와 학생 근거가 필요하다.' });
  }
});

export const StudentAnswerObservationSchema = z.object({
  questionType: z.enum(['DIAGNOSTIC', 'CORRECTIVE']),
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const ParagraphUnderstandingRecordSchema = z.object({
  paragraphId: z.string().min(1),
  paragraphPosition: z.number().int().positive(),
  goldRef: z.object({
    version: z.string().min(1),
    hash: z.string().min(1),
  }),
  evaluatorRef: z.object({
    runtimeVersion: z.string().min(1),
    gatePromptVersion: z.string().min(1),
    diagnosticPromptVersion: z.string().min(1),
  }),
  dialogue: z.object({
    outcome: z.enum(['PASS', 'UNRESOLVED', 'NOT_ATTEMPTED', 'ABORTED']),
    questionsAnswered: z.number().int().nonnegative(),
    diagnosticQuestionCount: z.number().int().nonnegative(),
    correctiveQuestionCount: z.number().int().nonnegative(),
  }),
  currentRepresentation: z.object({
    effectiveResponse: z.string().min(1).nullable(),
    centralObjectRepresentation: z.string().nullable(),
    centralStoryRepresentation: z.string().nullable(),
    expressedClaims: StudentRepresentationSnapshotSchema.shape.expressedClaims,
    axisStates: z.array(AxisRepresentationSchema),
    relationStates: z.array(RelationRepresentationSchema),
    explicitErrors: StudentRepresentationSnapshotSchema.shape.explicitErrors,
    unresolvedQuestions: z.array(z.string()),
  }),
  trajectory: z.object({
    initialAxisStates: z.array(AxisRepresentationSchema),
    initialRelationStates: z.array(RelationRepresentationSchema),
    correctedRelationIds: z.array(z.string().min(1)),
    persistentContradictionIds: z.array(z.string().min(1)),
    newlyConfirmedRelationIds: z.array(z.string().min(1)),
  }),
  observations: z.object({
    initialResponse: z.string().min(1).nullable(),
    followUpAnswers: z.array(StudentAnswerObservationSchema),
  }),
});

export type ParagraphUnderstandingRecord = z.infer<
  typeof ParagraphUnderstandingRecordSchema
>;

export const ParagraphUnderstandingHandoffSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_UNDERSTANDING_HANDOFF_VERSION),
  passageId: z.string().min(1),
  generatedAt: z.string().datetime(),
  paragraphs: z.array(ParagraphUnderstandingRecordSchema).min(1),
}).superRefine((handoff, context) => {
  const ids = handoff.paragraphs.map((paragraph) => paragraph.paragraphId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['paragraphs'], message: 'paragraphId가 중복됐다.' });
  }
  const positions = handoff.paragraphs.map((paragraph) => paragraph.paragraphPosition);
  if (new Set(positions).size !== positions.length) {
    context.addIssue({ code: 'custom', path: ['paragraphs'], message: '문단 순서가 중복됐다.' });
  }
});

export type ParagraphUnderstandingHandoff = z.infer<
  typeof ParagraphUnderstandingHandoffSchema
>;

export interface ParagraphUnderstandingRecordInput {
  readonly paragraphId: string;
  readonly paragraphPosition: number;
  readonly goldRef: { readonly version: string; readonly hash: string };
  readonly evaluatorRef: ParagraphUnderstandingRecord['evaluatorRef'];
  readonly session: DialogueExperimentSession | null;
}

function representation(snapshot: ReturnType<typeof emptySnapshot>) {
  return {
    effectiveResponse: snapshot.effectiveResponse ?? null,
    centralObjectRepresentation: snapshot.centralObjectRepresentation,
    centralStoryRepresentation: snapshot.centralStoryRepresentation,
    expressedClaims: structuredClone(snapshot.expressedClaims),
    axisStates: structuredClone(snapshot.axisStates ?? []),
    relationStates: structuredClone(snapshot.relationStates),
    explicitErrors: structuredClone(snapshot.explicitErrors),
    unresolvedQuestions: structuredClone(snapshot.unresolvedQuestions),
  };
}

function relationTransitions(
  initial: ReturnType<typeof emptySnapshot>['relationStates'],
  final: ReturnType<typeof emptySnapshot>['relationStates'],
) {
  const initialById = new Map(initial.map((relation) => [relation.relationId, relation.state]));
  const finalById = new Map(final.map((relation) => [relation.relationId, relation.state]));
  const correctedRelationIds: string[] = [];
  const persistentContradictionIds: string[] = [];
  const newlyConfirmedRelationIds: string[] = [];

  for (const [relationId, finalState] of finalById) {
    const initialState = initialById.get(relationId) ?? 'unknown';
    if (
      initialState === 'contradicted' &&
      (finalState === 'explicit' || finalState === 'entailed')
    ) {
      correctedRelationIds.push(relationId);
    }
    if (initialState === 'contradicted' && finalState === 'contradicted') {
      persistentContradictionIds.push(relationId);
    }
    if (initialState === 'unknown' && (finalState === 'explicit' || finalState === 'entailed')) {
      newlyConfirmedRelationIds.push(relationId);
    }
  }
  return { correctedRelationIds, persistentContradictionIds, newlyConfirmedRelationIds };
}

export function createParagraphUnderstandingRecord(
  input: ParagraphUnderstandingRecordInput,
): ParagraphUnderstandingRecord {
  const session = input.session;
  if (session !== null && session.paragraphId !== input.paragraphId) {
    throw new Error(`handoff paragraphId 불일치: ${session.paragraphId} !== ${input.paragraphId}`);
  }
  const initial = session?.initialSnapshot ?? emptySnapshot();
  const final = session?.finalSnapshot ?? emptySnapshot();
  const answeredTurns = session?.turns.filter(
    (turn) => turn.questionShown !== null && turn.studentAnswer !== null,
  ) ?? [];
  const diagnosticQuestionCount = answeredTurns.filter(
    (turn) => turn.evaluation.nextQuestion?.type === 'DIAGNOSTIC',
  ).length;
  const correctiveQuestionCount = answeredTurns.filter(
    (turn) => turn.evaluation.nextQuestion?.type === 'CORRECTIVE',
  ).length;

  return ParagraphUnderstandingRecordSchema.parse({
    paragraphId: input.paragraphId,
    paragraphPosition: input.paragraphPosition,
    goldRef: input.goldRef,
    evaluatorRef: input.evaluatorRef,
    dialogue: {
      outcome: session?.finalStatus ?? 'NOT_ATTEMPTED',
      questionsAnswered: answeredTurns.length,
      diagnosticQuestionCount,
      correctiveQuestionCount,
    },
    currentRepresentation: representation(final),
    trajectory: {
      initialAxisStates: structuredClone(initial.axisStates ?? []),
      initialRelationStates: structuredClone(initial.relationStates),
      ...relationTransitions(initial.relationStates, final.relationStates),
    },
    observations: {
      initialResponse: session === null || session.initialResponse === ''
        ? null
        : session.initialResponse,
      followUpAnswers: answeredTurns.map((turn) => ({
        questionType: turn.evaluation.nextQuestion!.type,
        question: turn.questionShown!,
        answer: turn.studentAnswer!,
      })),
    },
  });
}

export function createParagraphUnderstandingHandoff(options: {
  readonly passageId: string;
  readonly generatedAt: string;
  readonly paragraphs: readonly ParagraphUnderstandingRecordInput[];
}): ParagraphUnderstandingHandoff {
  return ParagraphUnderstandingHandoffSchema.parse({
    schemaVersion: PARAGRAPH_UNDERSTANDING_HANDOFF_VERSION,
    passageId: options.passageId,
    generatedAt: options.generatedAt,
    paragraphs: options.paragraphs
      .map(createParagraphUnderstandingRecord)
      .sort((left, right) => left.paragraphPosition - right.paragraphPosition),
  });
}
