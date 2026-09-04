import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema } from './gold.js';

export const SOLUTION_PROFILE_ANALYSIS_VERSION = 'solution-profile-analysis-v1' as const;

type ProblemQuestionGold = z.infer<typeof ProblemQuestionGoldSchema>;
type ItemInference = ProblemQuestionGold['itemInferences'][number];

export type EvidenceSourceKind =
  | 'PASSAGE_PROPOSITION'
  | 'PASSAGE_RELATION'
  | 'SCENARIO_FACT'
  | 'VISUAL_ASSERTION'
  | 'ANSWER_KEY'
  | 'UNKNOWN';

export interface ChoiceProofProfileRow {
  readonly analysisVersion: typeof SOLUTION_PROFILE_ANALYSIS_VERSION;
  readonly questionId: string;
  readonly exam: string;
  readonly questionNumber: number;
  readonly goldReviewStatus: ProblemQuestionGold['reviewStatus'];
  readonly stemPolarity: ProblemQuestionGold['stemPolarity'];
  readonly choiceId: string;
  readonly position: number;
  readonly isAnswer: boolean;
  readonly judgment: 'TRUE' | 'FALSE';
  readonly choiceText: string;
  readonly claimIds: readonly string[];
  readonly claimDescriptions: readonly string[];
  readonly claimAssessments: readonly string[];
  readonly claimDecisions: readonly string[];
  readonly claimDecisionBases: readonly string[];
  readonly unlinkedClaimIds: readonly string[];
  readonly choiceEvidenceRefs: readonly string[];
  readonly inferencePremiseRefs: readonly string[];
  readonly allEvidenceRefs: readonly string[];
  readonly evidenceSourceKinds: readonly EvidenceSourceKind[];
  readonly evidenceDescriptions: readonly string[];
  readonly inferenceIds: readonly string[];
  readonly operations: readonly string[];
  readonly conclusions: readonly string[];
  readonly targetClaimEffects: readonly string[];
  readonly groundingKinds: readonly string[];
  readonly necessityKinds: readonly string[];
  readonly compressedMultiStepReview: 'PENDING' | 'NOT_FLAGGED';
  readonly compressedMultiStepSignals: readonly string[];
  readonly errorMechanismReview: 'PENDING' | 'NOT_APPLICABLE';
}

export interface EvidenceDetailRow {
  readonly analysisVersion: typeof SOLUTION_PROFILE_ANALYSIS_VERSION;
  readonly questionId: string;
  readonly choiceId: string;
  readonly position: number;
  readonly evidenceRef: string;
  readonly evidenceSourceKind: EvidenceSourceKind;
  readonly evidenceDescription: string;
  readonly origins: readonly string[];
  readonly claimIds: readonly string[];
  readonly inferenceIds: readonly string[];
}

export interface ManualReviewRow {
  readonly analysisVersion: typeof SOLUTION_PROFILE_ANALYSIS_VERSION;
  readonly reviewId: string;
  readonly reviewType: 'COMPRESSED_MULTI_STEP' | 'ERROR_MECHANISM';
  readonly questionId: string;
  readonly choiceId: string;
  readonly position: number;
  readonly targetIds: readonly string[];
  readonly automaticSignals: readonly string[];
  readonly sourceSummary: string;
  readonly reviewerStatus: '';
  readonly reviewerDecision: '';
  readonly reviewedStructureOrMechanism: '';
  readonly reviewerNotes: '';
}

export interface SolutionProfileExtraction {
  readonly choices: readonly ChoiceProofProfileRow[];
  readonly evidence: readonly EvidenceDetailRow[];
  readonly manualReview: readonly ManualReviewRow[];
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function choiceEvidenceRefs(
  choice: ProblemQuestionGold['choices'][number],
): string[] {
  return unique([
    ...choice.requiredReferences.flatMap((reference) => [
      ...reference.propositionIds,
      ...reference.relationIds,
    ]),
    ...choice.scenarioFactIds,
    ...choice.visualAssertionIds,
  ]);
}

function claimEvidenceRefs(
  claim: ProblemQuestionGold['optionClaims'][number],
): string[] {
  return unique([
    ...claim.references.flatMap((reference) => [
      ...reference.propositionIds,
      ...reference.relationIds,
    ]),
    ...claim.scenarioFactIds,
    ...claim.visualAssertionIds,
  ]);
}

function evidenceResolver(gold: ProblemQuestionGold): Map<
  string,
  { readonly kind: EvidenceSourceKind; readonly description: string }
> {
  const resolved = new Map<
    string,
    { readonly kind: EvidenceSourceKind; readonly description: string }
  >();
  for (const proposition of gold.passageDetailGold.propositions) {
    resolved.set(proposition.id, {
      kind: 'PASSAGE_PROPOSITION',
      description: proposition.description,
    });
  }
  for (const reference of [
    ...gold.choices.flatMap((choice) => choice.requiredReferences),
    ...gold.optionClaims.flatMap((claim) => claim.references),
    ...gold.itemInferences.flatMap((inference) => inference.references),
  ]) {
    for (const relationId of reference.relationIds) {
      if (!resolved.has(relationId)) {
        resolved.set(relationId, {
          kind: 'PASSAGE_RELATION',
          description: `${reference.paragraphId}의 관계 ${relationId} (별도 관계 설명 없음)`,
        });
      }
    }
  }
  for (const fact of gold.scenario?.facts ?? []) {
    resolved.set(fact.id, {
      kind: 'SCENARIO_FACT',
      description: fact.description,
    });
  }
  for (const assertion of gold.visualAssertions) {
    resolved.set(assertion.id, {
      kind: 'VISUAL_ASSERTION',
      description: assertion.description,
    });
  }
  resolved.set('ANSWER_KEY', {
    kind: 'ANSWER_KEY',
    description: '정답 키 제약',
  });
  return resolved;
}

function multiStepSignals(
  claims: readonly ProblemQuestionGold['optionClaims'][number][],
  inferences: readonly ItemInference[],
): string[] {
  const signals: string[] = [];
  if (inferences.some((inference) => inference.operation === 'FOLLOW_CAUSAL_CHAIN')) {
    signals.push('CAUSAL_CHAIN_OPERATION');
  }
  if (claims.some((claim) => claim.dependsOnClaimIds.length > 0)) {
    signals.push('CLAIM_DEPENDENCY');
  }
  if (inferences.length > 1) signals.push('MULTIPLE_INFERENCES_FOR_CHOICE');
  if (inferences.some((inference) => inference.targetClaimIds.length > 1)) {
    signals.push('MULTI_TARGET_INFERENCE');
  }
  return signals;
}

function relatedInferences(
  claims: readonly ProblemQuestionGold['optionClaims'][number][],
  inferenceById: ReadonlyMap<string, ItemInference>,
): ItemInference[] {
  return unique(claims.flatMap((claim) => claim.itemInferenceIds))
    .map((id) => inferenceById.get(id))
    .filter((inference): inference is ItemInference => inference !== undefined);
}

export function extractSolutionProfiles(
  rawGolds: readonly unknown[],
): SolutionProfileExtraction {
  const choices: ChoiceProofProfileRow[] = [];
  const evidence: EvidenceDetailRow[] = [];
  const manualReview: ManualReviewRow[] = [];

  for (const rawGold of rawGolds) {
    const gold = ProblemQuestionGoldSchema.parse(rawGold);
    const claimById = new Map(gold.optionClaims.map((claim) => [claim.claimId, claim]));
    const inferenceById = new Map(
      gold.itemInferences.map((inference) => [inference.inferenceId, inference]),
    );
    const resolvedEvidence = evidenceResolver(gold);

    for (const choice of [...gold.choices].sort((a, b) => a.position - b.position)) {
      const claims = choice.claimIds
        .map((claimId) => claimById.get(claimId))
        .filter((claim): claim is ProblemQuestionGold['optionClaims'][number] => (
          claim !== undefined
        ))
        .sort((a, b) => a.order - b.order);
      const inferences = relatedInferences(claims, inferenceById);
      const directChoiceRefs = choiceEvidenceRefs(choice);
      const directClaimRefs = unique(claims.flatMap(claimEvidenceRefs));
      const inferencePremiseRefs = unique(inferences.flatMap((item) => item.premiseRefs));
      const allEvidenceRefs = unique([
        ...directChoiceRefs,
        ...directClaimRefs,
        ...inferencePremiseRefs,
      ]);
      const signals = multiStepSignals(claims, inferences);
      const unlinkedClaimIds = claims
        .filter((claim) => claim.itemInferenceIds.length === 0)
        .map((claim) => claim.claimId);

      choices.push({
        analysisVersion: SOLUTION_PROFILE_ANALYSIS_VERSION,
        questionId: gold.questionId,
        exam: gold.source.exam,
        questionNumber: gold.source.questionNumber,
        goldReviewStatus: gold.reviewStatus,
        stemPolarity: gold.stemPolarity,
        choiceId: choice.choiceId,
        position: choice.position,
        isAnswer: choice.choiceId === gold.answerChoiceId,
        judgment: choice.judgment,
        choiceText: choice.text,
        claimIds: claims.map((claim) => claim.claimId),
        claimDescriptions: claims.map((claim) => `${claim.claimId}: ${claim.description}`),
        claimAssessments: claims.map((claim) => `${claim.claimId}: ${claim.assessment}`),
        claimDecisions: claims.map((claim) => `${claim.claimId}: ${claim.decision}`),
        claimDecisionBases: claims.map((claim) => `${claim.claimId}: ${claim.decisionBasis}`),
        unlinkedClaimIds,
        choiceEvidenceRefs: directChoiceRefs,
        inferencePremiseRefs,
        allEvidenceRefs,
        evidenceSourceKinds: unique(allEvidenceRefs.map((reference) => (
          resolvedEvidence.get(reference)?.kind ?? 'UNKNOWN'
        ))),
        evidenceDescriptions: allEvidenceRefs.map((reference) => (
          `${reference}: ${resolvedEvidence.get(reference)?.description ?? '설명 없음'}`
        )),
        inferenceIds: inferences.map((inference) => inference.inferenceId),
        operations: unique(inferences.map((inference) => inference.operation)),
        conclusions: inferences.map((inference) => (
          `${inference.inferenceId}: ${inference.conclusion}`
        )),
        targetClaimEffects: inferences.map((inference) => (
          `${inference.inferenceId}: ${inference.targetClaimEffect} → ${inference.targetClaimIds.join('+')}`
        )),
        groundingKinds: unique(inferences.map((inference) => inference.grounding)),
        necessityKinds: unique(inferences.map((inference) => inference.necessity)),
        compressedMultiStepReview: signals.length > 0 ? 'PENDING' : 'NOT_FLAGGED',
        compressedMultiStepSignals: signals,
        errorMechanismReview: choice.judgment === 'FALSE' ? 'PENDING' : 'NOT_APPLICABLE',
      });

      for (const evidenceRef of allEvidenceRefs) {
        const linkedClaims = claims.filter((claim) => (
          claimEvidenceRefs(claim).includes(evidenceRef)
        ));
        const linkedInferences = inferences.filter((inference) => (
          inference.premiseRefs.includes(evidenceRef)
        ));
        const origins = unique([
          ...(directChoiceRefs.includes(evidenceRef) ? ['CHOICE_REQUIRED'] : []),
          ...(linkedClaims.length > 0 ? ['OPTION_CLAIM'] : []),
          ...(linkedInferences.length > 0 ? ['INFERENCE_PREMISE'] : []),
        ]);
        evidence.push({
          analysisVersion: SOLUTION_PROFILE_ANALYSIS_VERSION,
          questionId: gold.questionId,
          choiceId: choice.choiceId,
          position: choice.position,
          evidenceRef,
          evidenceSourceKind: resolvedEvidence.get(evidenceRef)?.kind ?? 'UNKNOWN',
          evidenceDescription: resolvedEvidence.get(evidenceRef)?.description ?? '설명 없음',
          origins,
          claimIds: linkedClaims.map((claim) => claim.claimId),
          inferenceIds: linkedInferences.map((inference) => inference.inferenceId),
        });
      }

      if (signals.length > 0) {
        manualReview.push({
          analysisVersion: SOLUTION_PROFILE_ANALYSIS_VERSION,
          reviewId: `${gold.questionId}-${choice.choiceId}-MULTI_STEP`,
          reviewType: 'COMPRESSED_MULTI_STEP',
          questionId: gold.questionId,
          choiceId: choice.choiceId,
          position: choice.position,
          targetIds: inferences.map((inference) => inference.inferenceId),
          automaticSignals: signals,
          sourceSummary: [
            `연산: ${unique(inferences.map((inference) => inference.operation)).join(', ')}`,
            `결론: ${inferences.map((inference) => inference.conclusion).join(' / ')}`,
          ].join(' | '),
          reviewerStatus: '',
          reviewerDecision: '',
          reviewedStructureOrMechanism: '',
          reviewerNotes: '',
        });
      }
      if (choice.judgment === 'FALSE') {
        manualReview.push({
          analysisVersion: SOLUTION_PROFILE_ANALYSIS_VERSION,
          reviewId: `${gold.questionId}-${choice.choiceId}-ERROR_MECHANISM`,
          reviewType: 'ERROR_MECHANISM',
          questionId: gold.questionId,
          choiceId: choice.choiceId,
          position: choice.position,
          targetIds: choice.claimIds,
          automaticSignals: [],
          sourceSummary: [
            `선지: ${choice.text}`,
            `판정: ${claims.map((claim) => `${claim.claimId}=${claim.assessment}`).join(', ')}`,
            `효과: ${inferences.map((inference) => inference.targetClaimEffect).join(', ')}`,
          ].join(' | '),
          reviewerStatus: '',
          reviewerDecision: '',
          reviewedStructureOrMechanism: '',
          reviewerNotes: '',
        });
      }
    }
  }

  return { choices, evidence, manualReview };
}
