import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

import {
  ParagraphGoldAuditIssueSchema,
  type ParagraphGoldAuditOutput,
} from './production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldAuditInput,
  type ParagraphGoldApiMetadata,
} from './production-runtime.js';

export const SPLIT_LOCAL_AUDIT_VERSION = 'paragraph-gold-local-audit-v1' as const;
export const SPLIT_GLOBAL_AUDIT_VERSION = 'paragraph-gold-global-audit-v1' as const;

const LOCAL_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-local-audit-prompt-v1.md',
);
const GLOBAL_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-global-audit-prompt-v1.md',
);

const DecisionSchema = z.enum(['PASS', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED']);
const CheckStatusSchema = z.enum(['PASS', 'FAIL']);

const LocalRuleIdSchema = z.enum([
  'EDGE_EVIDENCE_BEFORE_DIRECTION',
  'QUALIFIER_SCOPE_FIDELITY',
  'UNSUPPORTED_SOURCE_MEANING',
]);
const GlobalRuleIdSchema = z.enum([
  'QUALIFIER_SCOPE_FIDELITY',
  'DIAGNOSTIC_COVERAGE_INVARIANT',
  'UNSUPPORTED_SOURCE_MEANING',
]);

const LocalRuleCheckSchema = z.object({
  ruleId: LocalRuleIdSchema,
  status: CheckStatusSchema,
  checkedTargetIds: z.array(z.string().min(1)),
  issueIds: z.array(z.string().regex(/^ISSUE[1-9][0-9]*$/u)),
  summary: z.string().min(1),
}).strict();

const GlobalRuleCheckSchema = z.object({
  ruleId: GlobalRuleIdSchema,
  status: CheckStatusSchema,
  checkedTargetIds: z.array(z.string().min(1)),
  issueIds: z.array(z.string().regex(/^ISSUE[1-9][0-9]*$/u)),
  summary: z.string().min(1),
}).strict();

export const SplitLocalAuditOutputSchema = z.object({
  schemaVersion: z.literal(SPLIT_LOCAL_AUDIT_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  decision: DecisionSchema,
  summary: z.string().min(1),
  reviewedPropositionIds: z.array(z.string().regex(/^P[1-9][0-9]*$/u)),
  reviewedPropositionEdgeIds: z.array(z.string().regex(/^E[1-9][0-9]*$/u)),
  ruleChecks: z.array(LocalRuleCheckSchema),
  omittedMeaningDetected: z.boolean(),
  unsupportedMeaningDetected: z.boolean(),
  visualDependencyDetected: z.boolean(),
  issues: z.array(ParagraphGoldAuditIssueSchema),
}).strict();
export type SplitLocalAuditOutput = z.infer<typeof SplitLocalAuditOutputSchema>;

const SourceMeaningCheckSchema = z.object({
  meaningId: z.string().regex(/^SM[1-9][0-9]*$/u),
  description: z.string().min(1),
  sourceEvidence: z.string().min(1),
  propositionIds: z.array(z.string().regex(/^P[1-9][0-9]*$/u)),
  centralStoryCovered: z.boolean(),
  centralAxisIds: z.array(z.string().regex(/^AX[1-9][0-9]*$/u)),
  coreRelationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)),
  status: CheckStatusSchema,
  issueIds: z.array(z.string().regex(/^ISSUE[1-9][0-9]*$/u)),
}).strict();

export const SplitGlobalAuditOutputSchema = z.object({
  schemaVersion: z.literal(SPLIT_GLOBAL_AUDIT_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  decision: DecisionSchema,
  summary: z.string().min(1),
  centralStoryReviewed: z.boolean(),
  reviewedPropositionIds: z.array(z.string().regex(/^P[1-9][0-9]*$/u)),
  reviewedCentralAxisIds: z.array(z.string().regex(/^AX[1-9][0-9]*$/u)),
  reviewedCoreRelationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)),
  sourceMeaningChecks: z.array(SourceMeaningCheckSchema).min(1),
  ruleChecks: z.array(GlobalRuleCheckSchema),
  omittedMeaningDetected: z.boolean(),
  unsupportedMeaningDetected: z.boolean(),
  visualDependencyDetected: z.boolean(),
  issues: z.array(ParagraphGoldAuditIssueSchema),
}).strict();
export type SplitGlobalAuditOutput = z.infer<typeof SplitGlobalAuditOutputSchema>;

function assertExact(actual: readonly string[], expected: readonly string[], label: string): void {
  if (new Set(actual).size !== actual.length) throw new Error(`${label}: 중복 ID`);
  const actualSet = new Set(actual);
  if (actual.length !== expected.length || expected.some((id) => !actualSet.has(id))) {
    throw new Error(`${label}: coverage 불완전`);
  }
}

function assertRuleChecks(
  checks: readonly { readonly ruleId: string; readonly status: 'PASS' | 'FAIL'; readonly issueIds: readonly string[] }[],
  expected: readonly string[],
  issues: readonly { readonly issueId: string }[],
  label: string,
): void {
  assertExact(checks.map((check) => check.ruleId), expected, `${label} 규칙`);
  const issueIds = new Set(issues.map((issue) => issue.issueId));
  const referenced = new Set(checks.flatMap((check) => check.issueIds));
  for (const check of checks) {
    if ((check.status === 'FAIL') !== (check.issueIds.length > 0)) {
      throw new Error(`${label}: ${check.ruleId}의 상태와 issueIds 불일치`);
    }
    if (check.issueIds.some((issueId) => !issueIds.has(issueId))) {
      throw new Error(`${label}: 존재하지 않는 issue 참조`);
    }
  }
  if (issues.some((issue) => !referenced.has(issue.issueId))) {
    throw new Error(`${label}: 규칙에 연결되지 않은 issue`);
  }
}

function assertDecision(options: {
  readonly decision: z.infer<typeof DecisionSchema>;
  readonly issues: readonly z.infer<typeof ParagraphGoldAuditIssueSchema>[];
  readonly omittedMeaningDetected: boolean;
  readonly unsupportedMeaningDetected: boolean;
  readonly visualDependencyDetected: boolean;
  readonly checksHaveFailure: boolean;
  readonly label: string;
}): void {
  const hasRepair = options.issues.some((issue) => issue.severity === 'REPAIR_REQUIRED');
  const hasBlocking = options.issues.some((issue) => issue.severity === 'BLOCKING');
  if (options.decision === 'PASS' && (
    options.issues.length > 0 || options.omittedMeaningDetected ||
    options.unsupportedMeaningDetected || options.visualDependencyDetected ||
    options.checksHaveFailure
  )) throw new Error(`${options.label}: 결함이 있는 PASS`);
  if (options.decision === 'REPAIR_REQUIRED' && (!hasRepair || hasBlocking)) {
    throw new Error(`${options.label}: REPAIR_REQUIRED 판정 불일치`);
  }
  if (options.decision === 'BLOCKING' && !hasBlocking) {
    throw new Error(`${options.label}: BLOCKING issue 없음`);
  }
  if (options.decision !== 'PASS' && options.issues.length === 0) {
    throw new Error(`${options.label}: 미통과 issue 없음`);
  }
}

export function validateSplitLocalAudit(
  value: SplitLocalAuditOutput,
  inputValue: ParagraphGoldAuditInput,
): SplitLocalAuditOutput {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = SplitLocalAuditOutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('Local audit: 원천 ID 불일치');
  }
  assertExact(output.reviewedPropositionIds, input.propositionBundle.propositions.map((item) => item.id), 'Local 명제');
  assertExact(output.reviewedPropositionEdgeIds, input.propositionBundle.propositionEdges.map((item) => item.id), 'Local 간선');
  assertRuleChecks(
    output.ruleChecks,
    LocalRuleIdSchema.options,
    output.issues,
    'Local audit',
  );
  if (output.issues.some((issue) =>
    !['PROPOSITION', 'PROPOSITION_EDGE', 'BUNDLE'].includes(issue.targetType))) {
    throw new Error('Local audit: 역할 범위를 벗어난 issue targetType');
  }
  assertDecision({
    ...output,
    checksHaveFailure: output.ruleChecks.some((check) => check.status === 'FAIL'),
    label: 'Local audit',
  });
  return output;
}

export function validateSplitGlobalAudit(
  value: SplitGlobalAuditOutput,
  inputValue: ParagraphGoldAuditInput,
): SplitGlobalAuditOutput {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = SplitGlobalAuditOutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('Global audit: 원천 ID 불일치');
  }
  if (!output.centralStoryReviewed) throw new Error('Global audit: centralStory 미검토');
  assertExact(output.reviewedPropositionIds, input.propositionBundle.propositions.map((item) => item.id), 'Global 명제');
  assertExact(output.reviewedCentralAxisIds, input.diagnosticGold.centralAxes.map((item) => item.id), 'Global 축');
  assertExact(output.reviewedCoreRelationIds, input.diagnosticGold.coreRelations.map((item) => item.id), 'Global 핵심 관계');
  assertRuleChecks(
    output.ruleChecks,
    GlobalRuleIdSchema.options,
    output.issues,
    'Global audit',
  );
  const propositionIds = new Set(input.propositionBundle.propositions.map((item) => item.id));
  const axisIds = new Set(input.diagnosticGold.centralAxes.map((item) => item.id));
  const relationIds = new Set(input.diagnosticGold.coreRelations.map((item) => item.id));
  const issueIds = new Set(output.issues.map((issue) => issue.issueId));
  const meaningIssueIds = new Set<string>();
  for (const meaning of output.sourceMeaningChecks) {
    if (meaning.propositionIds.some((id) => !propositionIds.has(id)) ||
        meaning.centralAxisIds.some((id) => !axisIds.has(id)) ||
        meaning.coreRelationIds.some((id) => !relationIds.has(id))) {
      throw new Error(`Global audit: ${meaning.meaningId}의 존재하지 않는 참조`);
    }
    if ((meaning.status === 'FAIL') !== (meaning.issueIds.length > 0)) {
      throw new Error(`Global audit: ${meaning.meaningId} 상태 불일치`);
    }
    if (meaning.issueIds.some((issueId) => !issueIds.has(issueId))) {
      throw new Error(`Global audit: ${meaning.meaningId}의 존재하지 않는 issue 참조`);
    }
    meaning.issueIds.forEach((issueId) => meaningIssueIds.add(issueId));
  }
  if (output.issues.some((issue) =>
    !['PROPOSITION', 'CENTRAL_STORY', 'CENTRAL_AXIS', 'CORE_RELATION', 'BUNDLE']
      .includes(issue.targetType))) {
    throw new Error('Global audit: 역할 범위를 벗어난 issue targetType');
  }
  if (output.sourceMeaningChecks.some((meaning) => meaning.status === 'FAIL') &&
      output.issues.every((issue) => !meaningIssueIds.has(issue.issueId))) {
    throw new Error('Global audit: FAIL 중심 의미와 연결된 issue 없음');
  }
  assertDecision({
    ...output,
    checksHaveFailure: output.ruleChecks.some((check) => check.status === 'FAIL') ||
      output.sourceMeaningChecks.some((check) => check.status === 'FAIL'),
    label: 'Global audit',
  });
  return output;
}

export function loadSplitLocalAuditPrompt(): string {
  return readFileSync(LOCAL_PROMPT_PATH, 'utf8').trim();
}

export function loadSplitGlobalAuditPrompt(): string {
  return readFileSync(GLOBAL_PROMPT_PATH, 'utf8').trim();
}

function apiMetadata(options: {
  readonly response: Awaited<ReturnType<OpenAI['responses']['parse']>>;
  readonly model: string;
  readonly promptVersion: string;
  readonly durationMs: number;
}): ParagraphGoldApiMetadata {
  const usage = options.response.usage;
  return {
    provider: 'openai',
    model: options.model,
    effort: 'medium',
    serviceTier: 'default',
    promptVersion: options.promptVersion,
    responseId: options.response.id,
    durationMs: options.durationMs,
    usage: {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
      cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
      cacheWriteTokens: usage?.input_tokens_details.cache_write_tokens ?? 0,
    },
  };
}

export async function auditParagraphGoldLocally(
  inputValue: ParagraphGoldAuditInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
): Promise<{ readonly result: SplitLocalAuditOutput; readonly metadata: ParagraphGoldApiMetadata }> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadSplitLocalAuditPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: { format: zodTextFormat(SplitLocalAuditOutputSchema, 'paragraph_gold_local_audit') },
  });
  if (response.output_parsed === null) throw new Error('Local audit structured output parsing failed');
  return {
    result: validateSplitLocalAudit(response.output_parsed, input),
    metadata: apiMetadata({
      response,
      model: config.model,
      promptVersion: SPLIT_LOCAL_AUDIT_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}

export async function auditParagraphGoldGlobally(
  inputValue: ParagraphGoldAuditInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
): Promise<{ readonly result: SplitGlobalAuditOutput; readonly metadata: ParagraphGoldApiMetadata }> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadSplitGlobalAuditPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: { format: zodTextFormat(SplitGlobalAuditOutputSchema, 'paragraph_gold_global_audit') },
  });
  if (response.output_parsed === null) throw new Error('Global audit structured output parsing failed');
  return {
    result: validateSplitGlobalAudit(response.output_parsed, input),
    metadata: apiMetadata({
      response,
      model: config.model,
      promptVersion: SPLIT_GLOBAL_AUDIT_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}

export function mergeSplitAudits(options: {
  readonly input: ParagraphGoldAuditInput;
  readonly local: SplitLocalAuditOutput;
  readonly global: SplitGlobalAuditOutput;
}): ParagraphGoldAuditOutput {
  const issues = [...options.local.issues, ...options.global.issues].map((issue, index) => ({
    ...issue,
    issueId: `ISSUE${index + 1}`,
  }));
  const hasBlocking = issues.some((issue) => issue.severity === 'BLOCKING');
  const hasRepair = issues.some((issue) => issue.severity === 'REPAIR_REQUIRED');
  const hasUnresolved = options.local.decision === 'UNRESOLVED' || options.global.decision === 'UNRESOLVED';
  const decision: ParagraphGoldAuditOutput['decision'] = hasBlocking
    ? 'BLOCKING'
    : hasUnresolved
      ? 'UNRESOLVED'
      : hasRepair
        ? 'REPAIR_REQUIRED'
        : 'PASS';
  return {
    schemaVersion: 'paragraph-gold-audit-v1',
    sourceId: options.input.sourceId,
    paragraphId: options.input.targetParagraph.paragraphId,
    decision,
    summary: `Local: ${options.local.summary} Global: ${options.global.summary}`,
    reviewedPropositionIds: options.input.propositionBundle.propositions.map((item) => item.id),
    reviewedPropositionEdgeIds: options.input.propositionBundle.propositionEdges.map((item) => item.id),
    reviewedCentralAxisIds: options.input.diagnosticGold.centralAxes.map((item) => item.id),
    reviewedCoreRelationIds: options.input.diagnosticGold.coreRelations.map((item) => item.id),
    omittedMeaningDetected: options.local.omittedMeaningDetected || options.global.omittedMeaningDetected,
    unsupportedMeaningDetected: options.local.unsupportedMeaningDetected || options.global.unsupportedMeaningDetected,
    visualDependencyDetected: options.local.visualDependencyDetected || options.global.visualDependencyDetected,
    issues,
  };
}
