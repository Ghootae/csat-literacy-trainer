import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from './gold.js';
import {
  ProblemPathEvaluationContextSchema,
  deriveProblemPathEvaluationContext,
} from './path-evaluator-input.js';
import {
  SelectedOptionGoldSliceSchema,
  buildSelectedOptionGoldSlice,
  type SelectedOptionGoldSliceAuditManifest,
} from './selected-option-gold-slice.js';

export const SELECTED_OPTION_RATIONALE_INPUT_VERSION =
  'selected-option-rationale-input-v1' as const;

const BaselineFullGoldSchema = ProblemQuestionGoldSchema.omit({
  supplementalExplanationInferences: true,
  representativeWrongPaths: true,
});

const CommonInputShape = {
  inputVersion: z.literal(SELECTED_OPTION_RATIONALE_INPUT_VERSION),
  evaluationContext: ProblemPathEvaluationContextSchema,
  question: z.object({
    stem: z.string().min(1),
    stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
    targetOption: z.object({
      choiceId: z.string().min(1),
      text: z.string().min(1),
    }).strict(),
  }).strict(),
  studentRationale: z.object({
    observationId: z.string().min(1),
    text: z.string().min(1),
  }).strict(),
  sufficiencyPolicy: z.object({
    groundSetScope: z.enum([
      'NON_EXHAUSTIVE_ALLOW_SOURCE_GROUNDED_ALTERNATIVES',
      'EXHAUSTIVE_WITHIN_INCLUDED_SLICE',
    ]),
    compressedCausalChain: z.literal(
      'ALLOW_WHEN_CORE_RELATION_AND_DECISION_CONCLUSION_ARE_EXPLICIT',
    ),
    ancillaryClaims: z.literal('ASSESS_SEPARATELY'),
  }).strict(),
} as const;

const BaselineFullGoldRationaleInputSchema = z.object({
  ...CommonInputShape,
  arm: z.literal('BASELINE_FULL_GOLD'),
  evidenceGold: BaselineFullGoldSchema,
}).strict();

const SelectedOptionSliceRationaleInputSchema = z.object({
  ...CommonInputShape,
  arm: z.literal('SELECTED_OPTION_COMPLETE'),
  evidenceGold: SelectedOptionGoldSliceSchema,
}).strict();

export const SelectedOptionRationaleInputSchema = z.discriminatedUnion('arm', [
  BaselineFullGoldRationaleInputSchema,
  SelectedOptionSliceRationaleInputSchema,
]);

export type SelectedOptionRationaleInput = z.infer<
  typeof SelectedOptionRationaleInputSchema
>;

const RationaleEvidenceFindingSchema = z.object({
  studentQuote: z.string().min(1),
  relationToGold: z.enum(['MATCHES', 'CONFLICTS', 'NOT_ESTABLISHED']),
  decisionRelevance: z.enum(['DECISIVE', 'NON_DECISIVE']),
  sourceRefs: z.array(z.string().min(1)),
}).strict().superRefine((finding, context) => {
  if (finding.relationToGold !== 'NOT_ESTABLISHED' && finding.sourceRefs.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['sourceRefs'],
      message: '일치·충돌 finding에는 근거 ID가 필요하다.',
    });
  }
});

export const SelectedOptionRationaleOutputSchema = z.object({
  outputVersion: z.literal('selected-option-rationale-output-v1'),
  rationaleAssessment: z.enum(['SUPPORTED', 'CONTRADICTED', 'INSUFFICIENT']),
  reason: z.string().min(1),
  evidenceFindings: z.array(RationaleEvidenceFindingSchema).min(1),
}).strict().superRefine((output, context) => {
  const decisiveMatches = output.evidenceFindings.some(
    (finding) => finding.decisionRelevance === 'DECISIVE' && finding.relationToGold === 'MATCHES',
  );
  const decisiveConflicts = output.evidenceFindings.some(
    (finding) => finding.decisionRelevance === 'DECISIVE' && finding.relationToGold === 'CONFLICTS',
  );
  if (output.rationaleAssessment === 'SUPPORTED' && (!decisiveMatches || decisiveConflicts)) {
    context.addIssue({
      code: 'custom',
      path: ['rationaleAssessment'],
      message: 'SUPPORTED에는 결정적 일치가 필요하고 결정적 충돌이 없어야 한다.',
    });
  }
  if (output.rationaleAssessment === 'CONTRADICTED' && !decisiveConflicts) {
    context.addIssue({
      code: 'custom',
      path: ['rationaleAssessment'],
      message: 'CONTRADICTED에는 결정적 충돌이 필요하다.',
    });
  }
  if (
    output.rationaleAssessment === 'INSUFFICIENT' &&
    decisiveConflicts
  ) {
    context.addIssue({
      code: 'custom',
      path: ['rationaleAssessment'],
      message: '결정적 충돌이 있으면 INSUFFICIENT일 수 없다.',
    });
  }
});

export type SelectedOptionRationaleOutput = z.infer<
  typeof SelectedOptionRationaleOutputSchema
>;

export function createSelectedOptionRationaleInput(options: {
  readonly arm: SelectedOptionRationaleInput['arm'];
  readonly gold: ProblemQuestionGold;
  readonly selectedChoiceId: string;
  readonly studentRationale: string;
  readonly observationId?: string;
  readonly experimentAuditId?: string;
}): {
  readonly input: SelectedOptionRationaleInput;
  readonly auditManifest: SelectedOptionGoldSliceAuditManifest | null;
} {
  const gold = ProblemQuestionGoldSchema.parse(options.gold);
  const targetChoice = gold.choices.find((choice) => choice.choiceId === options.selectedChoiceId);
  if (targetChoice === undefined) throw new Error(`선택 선지를 찾을 수 없다: ${options.selectedChoiceId}`);
  const common = {
    inputVersion: SELECTED_OPTION_RATIONALE_INPUT_VERSION,
    evaluationContext: deriveProblemPathEvaluationContext(gold, targetChoice.choiceId),
    question: {
      stem: gold.stem,
      stemPolarity: gold.stemPolarity,
      targetOption: { choiceId: targetChoice.choiceId, text: targetChoice.text },
    },
    studentRationale: {
      observationId: options.observationId ?? 'O1',
      text: options.studentRationale,
    },
    sufficiencyPolicy: {
      groundSetScope: options.arm === 'BASELINE_FULL_GOLD'
        ? 'NON_EXHAUSTIVE_ALLOW_SOURCE_GROUNDED_ALTERNATIVES' as const
        : 'EXHAUSTIVE_WITHIN_INCLUDED_SLICE' as const,
      compressedCausalChain:
        'ALLOW_WHEN_CORE_RELATION_AND_DECISION_CONCLUSION_ARE_EXPLICIT' as const,
      ancillaryClaims: 'ASSESS_SEPARATELY' as const,
    },
  } as const;
  if (options.arm === 'BASELINE_FULL_GOLD') {
    const {
      supplementalExplanationInferences: _withheldSupplementals,
      representativeWrongPaths: _withheldWrongPaths,
      ...baselineGold
    } = gold;
    return {
      input: SelectedOptionRationaleInputSchema.parse({
        ...common,
        arm: 'BASELINE_FULL_GOLD',
        evidenceGold: baselineGold,
      }),
      auditManifest: null,
    };
  }
  const { slice, auditManifest } = buildSelectedOptionGoldSlice({
    gold,
    selectedChoiceId: targetChoice.choiceId,
    ...(options.experimentAuditId === undefined
      ? {}
      : {
          coverageAudit: {
            auditId: options.experimentAuditId,
            mode: 'EXPERIMENT' as const,
          },
        }),
  });
  return {
    input: SelectedOptionRationaleInputSchema.parse({
      ...common,
      arm: 'SELECTED_OPTION_COMPLETE',
      evidenceGold: slice,
    }),
    auditManifest,
  };
}

export function allowedSelectedOptionRationaleRefs(
  inputValue: SelectedOptionRationaleInput,
): Set<string> {
  const input = SelectedOptionRationaleInputSchema.parse(inputValue);
  if (input.arm === 'SELECTED_OPTION_COMPLETE') {
    return new Set(input.evidenceGold.includedManifest.map((item) => item.id));
  }
  const gold = input.evidenceGold;
  return new Set([
    ...gold.choices.map((item) => item.choiceId),
    ...gold.optionClaims.map((item) => item.claimId),
    ...gold.itemInferences.map((item) => item.inferenceId),
    ...gold.passageDetailGold.propositions.map((item) => item.id),
    ...(gold.scenario?.facts.map((item) => item.id) ?? []),
    ...gold.visualAssertions.map((item) => item.id),
    ...gold.mediaAssets.map((item) => item.mediaId),
  ]);
}

export function validateSelectedOptionRationaleOutput(
  outputValue: unknown,
  inputValue: SelectedOptionRationaleInput,
): SelectedOptionRationaleOutput {
  const input = SelectedOptionRationaleInputSchema.parse(inputValue);
  const output = SelectedOptionRationaleOutputSchema.parse(outputValue);
  const allowedRefs = allowedSelectedOptionRationaleRefs(input);
  for (const finding of output.evidenceFindings) {
    if (!input.studentRationale.text.includes(finding.studentQuote)) {
      throw new Error(`학생 원문에 없는 인용: ${finding.studentQuote}`);
    }
    for (const sourceRef of finding.sourceRefs) {
      if (!allowedRefs.has(sourceRef)) throw new Error(`허용되지 않은 골드 참조: ${sourceRef}`);
    }
  }
  return output;
}
