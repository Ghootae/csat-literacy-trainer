import { createHash, randomUUID } from 'node:crypto';

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { generatedEvalSet } from './query-gen-lib.js';
import { type RawQueryVerdict, normalizeQueryStates } from './query-normalize.js';
import { MODEL, getClient, instrumented } from './llm/client.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import type { SourceBundle } from './candidate-qualification.js';

export const PROBE_VERIFIER_VERSION = 'regression-probe-verifier-v3-contradiction-evidence';
export const PROBE_QUALIFICATION_VERSION = 'regression-probe-qualification-v4-contradiction-evidence';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const VerdictSchema = z.enum([
  'relation_preserved',
  'partial_relation_preservation',
  'topic_only',
  'contradicted',
  'region_not_evidenced',
]);

export const ProbeMutationSchema = z.object({
  targetQueryIds: z.array(z.string().min(1)).min(1),
  mutation: z.enum([
    'none',
    'topic_only',
    'omit_relation',
    'omit_argument',
    'omit_condition',
    'reverse_relation',
    'misassign_role',
  ]),
  preservedElements: z.array(z.string()),
  omittedElements: z.array(z.string()),
  contradictedElements: z.array(z.string()),
  expectedCeiling: VerdictSchema,
  rationale: z.string().min(1),
});

export const QualifiedProbeSchema = z.object({
  id: z.string().min(1),
  focal: z.string().min(1).optional(),
  expectFocal: VerdictSchema,
  text: z.string().min(1),
  mutationSpec: ProbeMutationSchema,
});

const ProbeSourceEvidenceRefSchema = z.object({ sourceSegmentId: z.string().regex(/^S[1-9][0-9]*$/) });

const ProbeQueryJudgmentBaseSchema = z.object({
  queryId: z.string().min(1),
  studentEvidence: z.string(),
  sourceEvidenceRefs: z.array(ProbeSourceEvidenceRefSchema),
  rationale: z.string().min(1),
});

export const ProbeQueryJudgmentSchema = z.discriminatedUnion('semanticState', [
  ProbeQueryJudgmentBaseSchema.extend({
    semanticState: z.literal('preserved'),
    expressionMode: z.enum(['explicit', 'implicit']),
    evidenceRole: z.enum(['relation', 'entity_identification', 'scope']),
  }),
  ProbeQueryJudgmentBaseSchema.extend({
    semanticState: z.literal('not_evidenced'),
    expressionMode: z.literal('none'),
    evidenceRole: z.literal('none'),
    studentEvidence: z.literal(''),
    sourceEvidenceRefs: z.array(ProbeSourceEvidenceRefSchema).max(0),
  }),
  ProbeQueryJudgmentBaseSchema.extend({
    semanticState: z.literal('contradicted'),
    expressionMode: z.literal('none'),
    evidenceRole: z.literal('none'),
    studentEvidence: z.string().min(1),
    sourceEvidenceRefs: z.array(ProbeSourceEvidenceRefSchema).min(1),
  }),
]);

export const ProbeVerifierReportSchema = z.object({
  schemaVersion: z.literal('regression-probe-verifier-report-v3-contradiction-evidence'),
  judgments: z.array(ProbeQueryJudgmentSchema),
});
export type ProbeVerifierReport = z.infer<typeof ProbeVerifierReportSchema>;

export const ProbeQualificationRecordSchema = z.object({
  schemaVersion: z.literal(PROBE_QUALIFICATION_VERSION),
  runId: z.string().min(1),
  paragraphId: z.string().min(1),
  probeId: z.string().min(1),
  focalRegionId: z.string().min(1),
  verifierFingerprint: Sha256Schema,
  queryCandidateHash: Sha256Schema,
  sourceBundleHash: Sha256Schema,
  executionStatus: z.enum(['pending', 'running', 'incomplete', 'failed', 'completed']),
  qualificationOutcome: z.enum(['auto_qualified', 'auto_repaired_qualified', 'quarantined']),
  derivedExpectedVerdict: VerdictSchema.optional(),
  fixtureExpectedVerdict: VerdictSchema,
  fixtureAgreement: z.boolean().optional(),
  passes: z.array(z.object({
    invocationId: z.string().min(1),
    resultReplay: z.literal(false),
    report: ProbeVerifierReportSchema,
  })),
  disagreementReasons: z.array(z.string()),
  completedAt: z.string().datetime(),
});
export type ProbeQualificationRecord = z.infer<typeof ProbeQualificationRecordSchema>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function probeQualificationHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonical(value), 'utf8').digest('hex')}`;
}

export function probeVerifierFingerprint(): string {
  return probeQualificationHash({
    provider: 'anthropic', model: MODEL, effort: 'medium',
    promptVersion: PROBE_VERIFIER_VERSION,
    schemaVersion: 'regression-probe-verifier-report-v3-contradiction-evidence',
    qualificationVersion: PROBE_QUALIFICATION_VERSION,
  });
}

const SYSTEM = `당신은 회귀 probe의 학생 응답을 독립적으로 판정하는 오프라인 검증자다.
각 query를 서로 독립적으로, question·expectedAnswer·acceptanceCriteria·contradictionCriteria에 따라 판정하라.
최종 영역 verdict나 fixture 기대값은 보지 않으며 직접 정하지 않는다.

semanticState는 preserved/not_evidenced/contradicted 중 하나다. 생략은 모순이 아니다.
expressionMode와 evidenceRole은 학생 응답에 실제로 표현된 방식만 기록한다.
학생 근거는 studentEvidence에 응답의 정확한 연속 부분 문자열로 인용한다. 근거가 없으면 빈 문자열이다.
원문 근거는 제공된 canonical source segment ID만 sourceEvidenceRefs로 반환한다. 비연속 근거는 ID를 여러 개 쓴다.
contradicted는 학생의 모순 표현과 그것이 뒤집는 원문을 함께 증명해야 하므로 studentEvidence와
sourceEvidenceRefs가 모두 필수다. not_evidenced는 둘 다 비워야 한다.
관련 단어만 등장했거나 목표 관계와 다른 관계를 표현하면 해당 relation query는 not_evidenced다.
모든 query를 정확히 한 번씩 반환하고, 다른 ID를 만들지 마라.`;

export interface VerifyProbeInput {
  readonly paragraphId: string;
  readonly bundle: SourceBundle;
  readonly querySet: GeneratedQuerySet;
  readonly studentResponse: string;
}

export function probeVerifierModelInput(input: VerifyProbeInput) {
  return {
    primaryTextSegments: input.bundle.segments.map((segment) => ({
      sourceSegmentId: segment.sourceSegmentId,
      text: segment.text,
    })),
    queries: input.querySet.regions.flatMap((region) => region.queries.map((query) => ({
      id: query.id,
      level: query.level,
      regionId: region.regionId,
      question: query.question,
      expectedAnswer: query.expectedAnswer,
      acceptanceCriteria: query.acceptanceCriteria,
      contradictionCriteria: query.contradictionCriteria,
    }))),
    studentResponse: input.studentResponse,
  };
}

export function assertProbeVerifierReport(input: VerifyProbeInput, report: ProbeVerifierReport): void {
  const expectedIds = input.querySet.regions.flatMap((region) => region.queries.map((query) => query.id)).sort();
  const actualIds = report.judgments.map((item) => item.queryId).sort();
  if (new Set(actualIds).size !== actualIds.length || canonical(expectedIds) !== canonical(actualIds)) {
    throw new Error('probe verifier query ID 집합이 candidate query와 다르다');
  }
  const sourceIds = new Set(input.bundle.segments.map((segment) => segment.sourceSegmentId));
  for (const judgment of report.judgments) {
    if (judgment.studentEvidence !== '' && !input.studentResponse.includes(judgment.studentEvidence)) {
      throw new Error(`${judgment.queryId}: studentEvidence가 응답의 연속 부분문자열이 아니다`);
    }
    if (judgment.sourceEvidenceRefs.some((ref) => !sourceIds.has(ref.sourceSegmentId))) {
      throw new Error(`${judgment.queryId}: 존재하지 않는 source segment ID`);
    }
    if (judgment.semanticState === 'preserved') {
      if (judgment.studentEvidence === '') {
        throw new Error(`${judgment.queryId}: preserved 판정의 표현/evidence 계약 위반`);
      }
    }
  }
}

export async function verifyRegressionProbe(input: VerifyProbeInput): Promise<{
  invocationId: string;
  resultReplay: false;
  report: ProbeVerifierReport;
}> {
  const invocationId = randomUUID();
  const modelInput = probeVerifierModelInput(input);
  const source = modelInput.primaryTextSegments.map((segment) => `[${segment.sourceSegmentId}] ${segment.text}`).join('\n');
  const response = await instrumented('regression-probe-verify', 'medium', input.paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 10000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(ProbeVerifierReportSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `PRIMARY_TEXT_SEGMENTS:\n${source}\n\nQUERIES:\n${JSON.stringify(modelInput.queries)}\n\nSTUDENT_RESPONSE:\n${modelInput.studentResponse}` }],
    }),
  );
  if (response.parsed_output === null) throw new Error('probe verifier 구조화 출력 파싱 실패');
  assertProbeVerifierReport(input, response.parsed_output);
  return { invocationId, resultReplay: false, report: response.parsed_output };
}

export function deriveProbeVerdict(querySet: GeneratedQuerySet, report: ProbeVerifierReport, focalRegionId: string) {
  const raw = new Map<string, RawQueryVerdict>(report.judgments.map((item) => [item.queryId, {
    queryId: item.queryId,
    semanticState: item.semanticState,
    expressionMode: item.expressionMode,
    evidenceRole: item.evidenceRole,
    evidence: item.studentEvidence,
  }]));
  return normalizeQueryStates(raw, generatedEvalSet('probe-oracle', querySet).policy)
    .find((region) => region.id === focalRegionId)?.regionSemanticVerdict ?? 'region_not_evidenced';
}

function normalizedJudgments(report: ProbeVerifierReport): unknown {
  return report.judgments
    .map((item) => ({
      queryId: item.queryId,
      semanticState: item.semanticState,
      sourceEvidenceRefs: [...new Set(item.sourceEvidenceRefs.map((ref) => ref.sourceSegmentId))].sort(),
    }))
    .sort((a, b) => a.queryId.localeCompare(b.queryId));
}

export function qualifyProbeFromPasses(args: {
  paragraphId: string;
  probe: z.infer<typeof QualifiedProbeSchema>;
  defaultFocal: string;
  querySet: GeneratedQuerySet;
  queryCandidateHash: string;
  sourceBundleHash: string;
  passes: readonly { invocationId: string; resultReplay: false; report: ProbeVerifierReport }[];
  now?: string;
}): ProbeQualificationRecord {
  const focal = args.probe.focal ?? args.defaultFocal;
  const reasons: string[] = [];
  if (args.passes.length !== 2) reasons.push('독립 verifier pass가 정확히 2회가 아니다');
  if (new Set(args.passes.map((pass) => pass.invocationId)).size !== args.passes.length) {
    reasons.push('invocation ID가 중복됐다');
  }
  if (args.passes.length === 2
    && canonical(normalizedJudgments(args.passes[0]!.report)) !== canonical(normalizedJudgments(args.passes[1]!.report))) {
    reasons.push('query별 semanticState/sourceEvidenceRefs가 일치하지 않는다');
  }
  const verdicts = args.passes.map((pass) => deriveProbeVerdict(args.querySet, pass.report, focal));
  if (new Set(verdicts).size > 1) reasons.push('두 pass의 결정론적 focal verdict가 다르다');
  const derived = reasons.length === 0 ? verdicts[0] : undefined;
  return ProbeQualificationRecordSchema.parse({
    schemaVersion: PROBE_QUALIFICATION_VERSION,
    runId: randomUUID(), paragraphId: args.paragraphId, probeId: args.probe.id,
    focalRegionId: focal, verifierFingerprint: probeVerifierFingerprint(),
    queryCandidateHash: args.queryCandidateHash, sourceBundleHash: args.sourceBundleHash,
    executionStatus: 'completed',
    qualificationOutcome: reasons.length === 0 ? 'auto_qualified' : 'quarantined',
    ...(derived === undefined ? {} : { derivedExpectedVerdict: derived, fixtureAgreement: derived === args.probe.expectFocal }),
    fixtureExpectedVerdict: args.probe.expectFocal,
    passes: args.passes,
    disagreementReasons: reasons,
    completedAt: args.now ?? new Date().toISOString(),
  });
}
