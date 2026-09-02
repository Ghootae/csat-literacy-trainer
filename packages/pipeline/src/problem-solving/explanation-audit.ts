import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

export const EXPLANATION_AUDIT_VERSION = 'problem-explanation-audit-v1' as const;

export const OfficialExplanationReferenceSchema = z.object({
  publisher: z.string().min(1),
  service: z.string().min(1),
  officiality: z.string().min(1),
  sourceUrl: z.string().url(),
  pdfPages: z.array(z.number().int().positive()).min(1),
  sectionTitle: z.string().min(1),
  text: z.string().min(1),
});

export type OfficialExplanationReference = z.infer<
  typeof OfficialExplanationReferenceSchema
>;

export const ExplanationClaimClassificationSchema = z.enum([
  'SOURCE_EXPLICIT',
  'SOURCE_DERIVED',
  'ANSWER_KEY_CONSTRAINED',
  'EXTERNAL_KNOWLEDGE',
  'UNRESOLVED',
]);

export const ExplanationClaimPlacementSchema = z.enum([
  'BASE_GOLD',
  'SUPPLEMENTAL',
  'EXCLUDED',
  'HUMAN_REVIEW',
]);

const ExplanationSourceEvidenceSchema = z.object({
  sourceArea: z.enum(['PASSAGE', 'SCENARIO', 'VISUAL', 'CHOICE', 'ANSWER_KEY']),
  locator: z.string().min(1),
  quote: z.string().min(1),
});

const ExplanationClaimProviderSchema = z.object({
  claimId: z.string().regex(/^EC[1-9][0-9]*$/),
  sourceText: z.string().min(1),
  normalizedClaim: z.string().min(1),
  claimKind: z.enum([
    'SOURCE_STATEMENT',
    'INFERENCE_BRIDGE',
    'CHOICE_ASSESSMENT',
    'ANSWER_IDENTIFICATION',
  ]),
  classification: ExplanationClaimClassificationSchema,
  sourceEvidence: z.array(ExplanationSourceEvidenceSchema),
  derivationOperation: z.enum([
    'NONE',
    'APPLY_RULE',
    'CHECK_CONDITION',
    'COMPARE',
    'CLASSIFY',
    'MAP_CONCEPT',
    'FOLLOW_CAUSAL_CHAIN',
    'CALCULATE',
    'CHECK_JUSTIFICATION',
  ]),
  derivation: z.string().min(1).nullable(),
  placement: ExplanationClaimPlacementSchema,
  supplementalGroundedness: z.enum(['ENTAILED', 'PLAUSIBLE', 'EXTERNAL']).nullable(),
  riskFlags: z.array(z.enum([
    'NONE',
    'MODALITY_STRENGTHENING',
    'CONDITION_REVERSAL',
    'MISSING_PREMISE',
    'ANSWER_CIRCULARITY',
    'SOURCE_SCOPE_MISMATCH',
    'EXTERNAL_ASSUMPTION',
  ])).min(1),
  reason: z.string().min(1),
});

const ExplanationClaimSchema = ExplanationClaimProviderSchema.superRefine((claim, context) => {
  const issue = (path: (string | number)[], message: string): void => {
    context.addIssue({ code: 'custom', path, message });
  };
  const sourceGrounded = (
    claim.classification === 'SOURCE_EXPLICIT' ||
    claim.classification === 'SOURCE_DERIVED'
  );
  const hasAnswerKeyEvidence = claim.sourceEvidence.some(
    (evidence) => evidence.sourceArea === 'ANSWER_KEY',
  );

  if (new Set(claim.riskFlags).size !== claim.riskFlags.length) {
    issue(['riskFlags'], '위험 플래그가 중복된다.');
  }
  if (claim.riskFlags.includes('NONE') && claim.riskFlags.length !== 1) {
    issue(['riskFlags'], 'NONE은 다른 위험 플래그와 함께 사용할 수 없다.');
  }
  if (sourceGrounded && claim.sourceEvidence.length === 0) {
    issue(['sourceEvidence'], '출처 기반 claim에는 원문 근거가 하나 이상 필요하다.');
  }
  if (sourceGrounded && hasAnswerKeyEvidence) {
    issue(['sourceEvidence'], '출처 기반 claim은 정답 키를 원문 근거로 사용할 수 없다.');
  }
  if (
    claim.classification === 'SOURCE_EXPLICIT' &&
    (claim.derivationOperation !== 'NONE' || claim.derivation !== null)
  ) {
    issue(['derivationOperation'], '원문 명시 claim에는 별도 도출 연산을 둘 수 없다.');
  }
  if (
    claim.classification === 'SOURCE_DERIVED' &&
    (claim.derivationOperation === 'NONE' || claim.derivation === null)
  ) {
    issue(['derivationOperation'], '원문 도출 claim에는 연산과 재구성 설명이 필요하다.');
  }
  if (
    claim.classification !== 'SOURCE_DERIVED' &&
    claim.derivationOperation !== 'NONE'
  ) {
    issue(['derivationOperation'], '도출 연산은 SOURCE_DERIVED claim에만 허용된다.');
  }
  if (
    claim.classification === 'ANSWER_KEY_CONSTRAINED' &&
    !hasAnswerKeyEvidence
  ) {
    issue(['sourceEvidence'], '정답 키 제약 claim에는 ANSWER_KEY 근거가 필요하다.');
  }
  if (
    claim.placement === 'BASE_GOLD' &&
    !sourceGrounded
  ) {
    issue(['placement'], '기본 골드에는 원문 명시·도출 claim만 배치할 수 있다.');
  }
  if (
    claim.classification === 'UNRESOLVED' &&
    claim.placement !== 'HUMAN_REVIEW'
  ) {
    issue(['placement'], '미해결 claim은 사람 검토로 보내야 한다.');
  }
  if (
    (claim.placement === 'SUPPLEMENTAL') !==
    (claim.supplementalGroundedness !== null)
  ) {
    issue(
      ['supplementalGroundedness'],
      '보충 배치와 보충 근거 등급은 함께 지정해야 한다.',
    );
  }
});

export const ExplanationAuditProviderOutputSchema = z.object({
  schemaVersion: z.literal(EXPLANATION_AUDIT_VERSION),
  explanationHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  claims: z.array(ExplanationClaimProviderSchema).min(1),
  omittedSegments: z.array(z.object({
    sourceText: z.string().min(1),
    substantive: z.boolean(),
    reason: z.string().min(1),
  })),
  coverage: z.enum(['COMPLETE', 'INCOMPLETE']),
  overallDecision: z.enum(['PASS', 'HUMAN_REVIEW']),
  unresolvedRisks: z.array(z.string().min(1)),
  reason: z.string().min(1),
});

export const ExplanationAuditOutputSchema = ExplanationAuditProviderOutputSchema.extend({
  claims: z.array(ExplanationClaimSchema).min(1),
});

export const ExplanationAuditSchema = ExplanationAuditOutputSchema.superRefine((audit, context) => {
  const issue = (path: (string | number)[], message: string): void => {
    context.addIssue({ code: 'custom', path, message });
  };
  const claimIds = audit.claims.map((claim) => claim.claimId);
  if (new Set(claimIds).size !== claimIds.length) {
    issue(['claims'], '해설 claim ID가 중복된다.');
  }
  const hasSubstantiveOmission = audit.omittedSegments.some(
    (segment) => segment.substantive,
  );
  if ((audit.coverage === 'INCOMPLETE') !== hasSubstantiveOmission) {
    issue(
      ['coverage'],
      '실질 내용 누락 여부와 coverage가 일치해야 한다.',
    );
  }
  const requiresReview = (
    audit.coverage === 'INCOMPLETE' ||
    audit.claims.some((claim) => claim.placement === 'HUMAN_REVIEW')
  );
  if (requiresReview && audit.overallDecision !== 'HUMAN_REVIEW') {
    issue(
      ['overallDecision'],
      '불완전하거나 미해결인 해설 감사는 사람 검토로 보내야 한다.',
    );
  }
  if (
    (audit.overallDecision === 'HUMAN_REVIEW') !==
    (audit.unresolvedRisks.length > 0)
  ) {
    issue(
      ['unresolvedRisks'],
      '사람 검토 결정과 미해결 위험 목록은 함께 지정해야 한다.',
    );
  }
});

export type ExplanationAudit = z.infer<typeof ExplanationAuditSchema>;

export function canonicalExplanationReferenceHash(
  reference: OfficialExplanationReference,
): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(reference)).digest('hex')}`;
}

export function validateExplanationAuditAgainstReference(
  auditValue: unknown,
  referenceValue: unknown,
): ExplanationAudit {
  const reference = OfficialExplanationReferenceSchema.parse(referenceValue);
  const audit = ExplanationAuditSchema.parse(auditValue);
  if (audit.explanationHash !== canonicalExplanationReferenceHash(reference)) {
    throw new Error('ExplanationAudit의 해설 해시가 입력 참고자료와 일치하지 않는다.');
  }

  const assertExcerpt = (value: string, path: string): void => {
    if (!reference.text.includes(value)) {
      throw new Error(`${path}가 해설 원문에 존재하지 않는다.`);
    }
  };
  for (const [index, claim] of audit.claims.entries()) {
    assertExcerpt(claim.sourceText, `claims.${index}.sourceText`);
    for (const [evidenceIndex, evidence] of claim.sourceEvidence.entries()) {
      if (evidence.sourceArea !== 'ANSWER_KEY') continue;
      const correctChoice = evidence.quote.match(/[①②③④⑤]|[1-5]/u);
      if (correctChoice === null) {
        throw new Error(
          `claims.${index}.sourceEvidence.${evidenceIndex}.quote에 정답 식별자가 없다.`,
        );
      }
    }
  }
  for (const [index, segment] of audit.omittedSegments.entries()) {
    assertExcerpt(segment.sourceText, `omittedSegments.${index}.sourceText`);
  }
  return audit;
}

export interface ExplanationPlacementContractResult {
  readonly passed: boolean;
  readonly issues: readonly string[];
}

/**
 * 보충 해설 층은 감사에서 SUPPLEMENTAL로 허용한 정확한 claim 인용만 받을 수 있다.
 * 기본 골드의 의미 역수입 여부는 후속 의미 감사가 담당하고, 이 함수는 코드로
 * 확정할 수 있는 해설 계보 경계만 검사한다.
 */
export function auditExplanationPlacementContract(
  auditValue: unknown,
  goldValue: unknown,
): ExplanationPlacementContractResult {
  const audit = ExplanationAuditSchema.parse(auditValue);
  if (typeof goldValue !== 'object' || goldValue === null || Array.isArray(goldValue)) {
    return { passed: false, issues: ['문제 골드가 객체가 아니다.'] };
  }
  const supplemental = (goldValue as Record<string, unknown>)[
    'supplementalExplanationInferences'
  ];
  if (!Array.isArray(supplemental)) {
    return {
      passed: false,
      issues: ['supplementalExplanationInferences가 배열이 아니다.'],
    };
  }

  const allowedSourceTexts = new Set(
    audit.claims
      .filter((claim) => claim.placement === 'SUPPLEMENTAL')
      .map((claim) => claim.sourceText),
  );
  const issues: string[] = [];
  for (const [index, inference] of supplemental.entries()) {
    if (typeof inference !== 'object' || inference === null || Array.isArray(inference)) {
      issues.push(`supplementalExplanationInferences.${index}가 객체가 아니다.`);
      continue;
    }
    const sourceText = (inference as Record<string, unknown>)['sourceText'];
    if (typeof sourceText !== 'string' || !allowedSourceTexts.has(sourceText)) {
      issues.push(
        `supplementalExplanationInferences.${index}.sourceText가 SUPPLEMENTAL 허용 claim과 일치하지 않는다.`,
      );
    }
  }
  return { passed: issues.length === 0, issues };
}

function normalizeProviderJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeProviderJsonSchema);
  if (typeof value !== 'object' || value === null) return value;
  const normalized = Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
    key === 'format'
      ? []
      : [[key, normalizeProviderJsonSchema(child)]]
  )));
  if (
    normalized['type'] === 'object' &&
    typeof normalized['properties'] === 'object' &&
    normalized['properties'] !== null &&
    !Array.isArray(normalized['properties'])
  ) {
    const properties = normalized['properties'] as Record<string, unknown>;
    const required = new Set(
      Array.isArray(normalized['required']) ? normalized['required'] : [],
    );
    normalized['properties'] = Object.fromEntries(
      Object.entries(properties).filter(([key]) => required.has(key)),
    );
    normalized['required'] = Object.keys(
      normalized['properties'] as Record<string, unknown>,
    );
  }
  return normalized;
}

export function createExplanationAuditProviderJsonSchema(): Record<string, unknown> {
  return normalizeProviderJsonSchema(
    z.toJSONSchema(ExplanationAuditSchema),
  ) as Record<string, unknown>;
}
