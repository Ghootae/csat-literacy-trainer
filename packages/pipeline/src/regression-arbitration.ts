import { createHash, randomUUID } from 'node:crypto';

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import type { SourceBundle } from './candidate-qualification.js';
import { evaluateProductionRegressionCases } from './candidate-qualification.js';
import { MODEL, getClient, instrumented } from './llm/client.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { generatedEvalSet } from './query-gen-lib.js';
import { type RawQueryVerdict, normalizeQueryStates } from './query-normalize.js';
import {
  ProbeQueryJudgmentSchema,
  type ProbeQualificationRecord,
  assertProbeVerifierReport,
} from './regression-probe-qualification.js';

export const REGRESSION_ARBITER_VERSION = 'regression-arbiter-v1';
export const REGRESSION_ARBITRATION_VERSION = 'regression-arbitration-v1';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const VerdictSchema = z.enum([
  'relation_preserved', 'partial_relation_preservation', 'topic_only', 'contradicted', 'region_not_evidenced',
]);

export const ProductionQueryJudgmentSchema = z.object({
  queryId: z.string().min(1),
  semanticState: z.enum(['preserved', 'not_evidenced', 'contradicted']),
  expressionMode: z.enum(['explicit', 'implicit', 'none']),
  evidenceRole: z.enum(['relation', 'entity_identification', 'scope', 'none']).optional(),
  evidence: z.string(),
});
export type ProductionQueryJudgment = z.infer<typeof ProductionQueryJudgmentSchema>;

export const ArbitrationReportSchema = z.object({
  schemaVersion: z.literal('regression-arbitration-report-v1'),
  judgments: z.array(ProbeQueryJudgmentSchema),
});
export type ArbitrationReport = z.infer<typeof ArbitrationReportSchema>;

export const ArbitrationRecordSchema = z.object({
  schemaVersion: z.literal(REGRESSION_ARBITRATION_VERSION),
  runId: z.string().min(1),
  paragraphId: z.string().min(1),
  probeId: z.string().min(1),
  executionStatus: z.enum(['pending', 'running', 'incomplete', 'failed', 'completed']),
  qualificationOutcome: z.enum(['auto_qualified', 'auto_repaired_qualified', 'quarantined']),
  arbitrationOutcome: z.enum(['not_required', 'oracle_error_candidate', 'evaluator_error', 'contract_error', 'inconclusive']),
  promotionBlocked: z.boolean(),
  sourceBundleHash: Sha256Schema,
  queryCandidateHash: Sha256Schema,
  oracleRecordHash: Sha256Schema,
  arbiterFingerprint: Sha256Schema,
  oracleVerdict: VerdictSchema,
  evaluatorVerdict: VerdictSchema,
  recommendedVerdict: VerdictSchema.optional(),
  repairCandidate: z.object({
    status: z.literal('pending_independent_revalidation'),
    proposedExpectedVerdict: VerdictSchema,
    applied: z.literal(false),
  }).optional(),
  passes: z.array(z.object({
    invocationId: z.string().min(1), resultReplay: z.literal(false), report: ArbitrationReportSchema,
  })),
  reasons: z.array(z.string()),
  completedAt: z.string().datetime(),
});
export type ArbitrationRecord = z.infer<typeof ArbitrationRecordSchema>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function arbitrationHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonical(value), 'utf8').digest('hex')}`;
}

export function arbiterFingerprint(): string {
  return arbitrationHash({ provider: 'anthropic', model: MODEL, effort: 'medium', promptVersion: REGRESSION_ARBITER_VERSION, schemaVersion: 'regression-arbitration-report-v1' });
}

function normalizeReport(report: ArbitrationReport): unknown {
  return report.judgments.map((judgment) => ({
    queryId: judgment.queryId,
    semanticState: judgment.semanticState,
    sourceEvidenceRefs: [...new Set(judgment.sourceEvidenceRefs.map((ref) => ref.sourceSegmentId))].sort(),
  })).sort((a, b) => a.queryId.localeCompare(b.queryId));
}

function states(value: readonly { queryId: string; semanticState: string }[]): string {
  return canonical(value.map(({ queryId, semanticState }) => ({ queryId, semanticState })).sort((a, b) => a.queryId.localeCompare(b.queryId)));
}

function verdictFromJudgments(querySet: GeneratedQuerySet, judgments: readonly ProductionQueryJudgment[], focal: string) {
  const raw = new Map<string, RawQueryVerdict>(judgments.map((item) => [item.queryId, {
    queryId: item.queryId, semanticState: item.semanticState, expressionMode: item.expressionMode,
    ...(item.evidenceRole === undefined ? {} : { evidenceRole: item.evidenceRole }), evidence: item.evidence,
  }]));
  return normalizeQueryStates(raw, generatedEvalSet('arbitration', querySet).policy)
    .find((region) => region.id === focal)?.regionSemanticVerdict ?? 'region_not_evidenced';
}

function reportAsProduction(report: ArbitrationReport): ProductionQueryJudgment[] {
  return report.judgments.map((item) => ({
    queryId: item.queryId, semanticState: item.semanticState, expressionMode: item.expressionMode,
    evidenceRole: item.evidenceRole, evidence: item.studentEvidence,
  }));
}

export interface ArbitrationInput {
  readonly paragraphId: string;
  readonly probeId: string;
  readonly focalRegionId: string;
  readonly studentResponse: string;
  readonly bundle: SourceBundle;
  readonly sourceBundleHash: string;
  readonly querySet: GeneratedQuerySet;
  readonly queryCandidateHash: string;
  readonly oracle: ProbeQualificationRecord;
  readonly oracleRecordHash: string;
  readonly evaluatorJudgments: readonly ProductionQueryJudgment[];
  readonly evaluatorVerdict: z.infer<typeof VerdictSchema>;
}

/** 명백한 결속·evidence·aggregation 오류는 LLM 호출 전에 contract_error로 끝낸다. */
export function arbitrationPreflight(input: ArbitrationInput): string[] {
  const reasons: string[] = [];
  if (input.oracle.qualificationOutcome !== 'auto_qualified' || input.oracle.derivedExpectedVerdict === undefined) reasons.push('oracle qualification 미완료');
  if (input.oracle.queryCandidateHash !== input.queryCandidateHash) reasons.push('oracle/query candidate hash 불일치');
  if (input.oracle.sourceBundleHash !== input.sourceBundleHash) reasons.push('oracle/source bundle hash 불일치');
  const ids = input.querySet.regions.flatMap((region) => region.queries.map((query) => query.id)).sort();
  const evaluatorIds = input.evaluatorJudgments.map((item) => item.queryId).sort();
  if (new Set(evaluatorIds).size !== evaluatorIds.length || canonical(ids) !== canonical(evaluatorIds)) reasons.push('evaluator query ID 집합 불일치');
  for (const judgment of input.evaluatorJudgments) {
    if (judgment.evidence !== '' && !input.studentResponse.includes(judgment.evidence)) reasons.push(`${judgment.queryId}: evaluator evidence substring 불일치`);
  }
  for (const pass of input.oracle.passes) {
    try {
      assertProbeVerifierReport({ paragraphId: input.paragraphId, bundle: input.bundle, querySet: input.querySet, studentResponse: input.studentResponse }, pass.report);
    } catch (error) {
      reasons.push(`oracle evidence contract: ${error instanceof Error ? error.message : '오류'}`);
    }
  }
  const lastOraclePass = input.oracle.passes.at(-1);
  if (lastOraclePass !== undefined && input.oracle.derivedExpectedVerdict !== undefined
    && verdictFromJudgments(input.querySet, reportAsProduction({ schemaVersion: 'regression-arbitration-report-v1', judgments: lastOraclePass.report.judgments }), input.focalRegionId) !== input.oracle.derivedExpectedVerdict) {
    reasons.push('oracle focal aggregation 불일치');
  }
  if (verdictFromJudgments(input.querySet, input.evaluatorJudgments, input.focalRegionId) !== input.evaluatorVerdict) reasons.push('evaluator focal aggregation 불일치');
  return reasons;
}

export function arbitrationRequired(input: ArbitrationInput): boolean {
  if (input.oracle.derivedExpectedVerdict === undefined) return false;
  const result = evaluateProductionRegressionCases([{ probeId: input.probeId, expectedFocal: input.oracle.derivedExpectedVerdict, actualFocal: input.evaluatorVerdict }]);
  return !result.cases[0]!.actionMatch || result.summary.dangerousOvercredit > 0 || result.summary.falseContradictions > 0;
}

const SYSTEM = `당신은 회귀 불일치의 독립 중재 판정자다. 원문, query 계약과 학생 응답만 보고 각 query를 처음부터 판정한다.
기존 oracle, fixture 기대값, production evaluator 결과는 보지 않는다. 최종 영역 verdict나 어느 쪽이 틀렸는지도 직접 정하지 않는다.
semanticState·expressionMode·evidenceRole 규칙은 query acceptance/contradiction criteria를 따른다.
preserved와 contradicted는 학생 응답의 정확한 연속 substring을 studentEvidence로 반환한다.
contradicted는 반드시 그것이 뒤집는 canonical source segment를 하나 이상 반환한다. not_evidenced는 학생 근거와 source refs를 비운다.
모든 query를 정확히 한 번씩 반환하고 존재하는 source segment ID만 사용하라.`;

export async function runArbiterPass(input: ArbitrationInput): Promise<{ invocationId: string; resultReplay: false; report: ArbitrationReport }> {
  const invocationId = randomUUID();
  const source = input.bundle.segments.map((segment) => `[${segment.sourceSegmentId}] ${segment.text}`).join('\n');
  const queries = input.querySet.regions.flatMap((region) => region.queries.map((query) => ({
    id: query.id, regionId: region.regionId, level: query.level, question: query.question,
    expectedAnswer: query.expectedAnswer, acceptanceCriteria: query.acceptanceCriteria,
    contradictionCriteria: query.contradictionCriteria,
  })));
  const response = await instrumented('regression-arbitrate', 'medium', input.paragraphId, () => getClient().messages.parse({
    model: MODEL, max_tokens: 10000, thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: zodOutputFormat(ArbitrationReportSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `PRIMARY_TEXT_SEGMENTS:\n${source}\n\nQUERIES:\n${JSON.stringify(queries)}\n\nSTUDENT_RESPONSE:\n${input.studentResponse}` }],
  }));
  if (response.parsed_output === null) throw new Error('regression arbiter 구조화 출력 파싱 실패');
  assertProbeVerifierReport({ paragraphId: input.paragraphId, bundle: input.bundle, querySet: input.querySet, studentResponse: input.studentResponse }, {
    schemaVersion: 'regression-probe-verifier-report-v3-contradiction-evidence', judgments: response.parsed_output.judgments,
  });
  return { invocationId, resultReplay: false, report: response.parsed_output };
}

export function arbitrateFromPasses(input: ArbitrationInput, passes: readonly { invocationId: string; resultReplay: false; report: ArbitrationReport }[], now = new Date().toISOString()): ArbitrationRecord {
  const preflight = arbitrationPreflight(input);
  const base = {
    schemaVersion: REGRESSION_ARBITRATION_VERSION, runId: randomUUID(), paragraphId: input.paragraphId,
    probeId: input.probeId, sourceBundleHash: input.sourceBundleHash, queryCandidateHash: input.queryCandidateHash,
    oracleRecordHash: input.oracleRecordHash, arbiterFingerprint: arbiterFingerprint(),
    oracleVerdict: input.oracle.derivedExpectedVerdict ?? input.oracle.fixtureExpectedVerdict,
    evaluatorVerdict: input.evaluatorVerdict, completedAt: now,
  };
  if (preflight.length > 0) return ArbitrationRecordSchema.parse({ ...base, executionStatus: 'completed', qualificationOutcome: 'quarantined', arbitrationOutcome: 'contract_error', promotionBlocked: true, passes: [], reasons: preflight });
  if (!arbitrationRequired(input)) return ArbitrationRecordSchema.parse({ ...base, executionStatus: 'completed', qualificationOutcome: 'auto_qualified', arbitrationOutcome: 'not_required', promotionBlocked: false, passes: [], reasons: ['production action이 동일한 비차단 diagnostic mismatch 또는 exact match'] });
  const reasons: string[] = [];
  if (passes.length !== 2 || new Set(passes.map((pass) => pass.invocationId)).size !== 2) reasons.push('서로 다른 arbiter invocation 두 번이 필요하다');
  if (passes.length === 2 && canonical(normalizeReport(passes[0]!.report)) !== canonical(normalizeReport(passes[1]!.report))) reasons.push('arbiter query state/source refs 불일치');
  if (reasons.length > 0) return ArbitrationRecordSchema.parse({ ...base, executionStatus: 'completed', qualificationOutcome: 'quarantined', arbitrationOutcome: 'inconclusive', promotionBlocked: true, passes, reasons });
  const recommended = reportAsProduction(passes[0]!.report);
  const recommendedVerdict = verdictFromJudgments(input.querySet, recommended, input.focalRegionId);
  const recommendedStates = states(recommended);
  const oracleStates = states(input.oracle.passes.at(-1)!.report.judgments);
  const evaluatorStates = states(input.evaluatorJudgments);
  const outcome = recommendedStates === oracleStates && recommendedStates !== evaluatorStates
    ? 'evaluator_error' as const
    : recommendedStates === evaluatorStates && recommendedStates !== oracleStates
      ? 'oracle_error_candidate' as const
      : 'inconclusive' as const;
  return ArbitrationRecordSchema.parse({
    ...base, executionStatus: 'completed',
    qualificationOutcome: outcome === 'inconclusive' ? 'quarantined' : 'auto_qualified',
    arbitrationOutcome: outcome, promotionBlocked: true, recommendedVerdict, passes,
    ...(outcome === 'oracle_error_candidate' ? { repairCandidate: { status: 'pending_independent_revalidation', proposedExpectedVerdict: recommendedVerdict, applied: false } } : {}),
    reasons: outcome === 'inconclusive' ? ['권고 query states가 oracle과 evaluator 어느 쪽에도 완전히 일치하지 않는다'] : [],
  });
}
