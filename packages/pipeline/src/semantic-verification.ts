import { createHash } from 'node:crypto';

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import type { Gold } from './gold.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet, type GenRelationEdge } from './llm/query-gen.js';
import { MODEL, getClient, instrumented } from './llm/client.js';
import { PropositionSchema } from './llm/schemas.js';

export const SEMANTIC_VERIFIER_VERSION = 'semantic-verifier-2026-08-14-v1';
export const SEMANTIC_REPAIR_VERSION = 'semantic-repair-2026-08-14-v1';
export const SEMANTIC_WORKFLOW_VERSION = 'semantic-workflow-2026-08-14-v2';
export const SEMANTIC_VERIFICATION_EFFORT = 'medium' as const;

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const SemanticIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(['critical', 'error', 'warning']),
  category: z.enum([
    'missing_core_proposition',
    'unsupported_content',
    'relation_direction',
    'condition_exception_negation_modality',
    'subject_target_role_swap',
    'number_or_comparison',
    'source_reference',
    'semantic_field',
    'composite_overgeneralization',
    'title_scope',
    'slot_core',
    'evaluation_link',
    'query_scope',
    'query_answer',
    'query_acceptance',
    'query_anchor',
  ]),
  goldPath: z.string().min(1).describe('검증 대상 JSON의 RFC 6901 JSON Pointer.'),
  sourceSentenceIds: z.array(z.string()),
  sourceEvidence: z
    .string()
    .describe('원문에서 복사한 연속 부분 문자열. 원문 근거가 없는 추가 내용이면 빈 문자열.'),
  problem: z.string().min(1),
  suggestedAction: z.enum(['remove', 'narrow', 'correct', 'split', 'merge']),
});

export const SemanticVerificationReportSchema = z.object({
  issues: z.array(SemanticIssueSchema),
  summary: z.string(),
});

export type SemanticIssue = z.infer<typeof SemanticIssueSchema>;
export type SemanticVerificationReport = z.infer<typeof SemanticVerificationReportSchema>;

export const SemanticVerificationRecordSchema = z.object({
  status: z.enum(['unverified', 'passed', 'failed', 'blocked']),
  sourceHash: Sha256Schema,
  candidateHash: Sha256Schema,
  verifierFingerprint: Sha256Schema,
  verifiedAt: z.string().datetime(),
  passes: z.number().int().nonnegative(),
  repairCycles: z.number().int().nonnegative(),
  unresolvedCriticalIssues: z.number().int().nonnegative(),
  unresolvedErrors: z.number().int().nonnegative(),
  reportPaths: z.array(z.string()),
});

export type SemanticVerificationRecord = z.infer<typeof SemanticVerificationRecordSchema>;

export const RepairPatchSchema = z.object({
  issueId: z.string(),
  operation: z.enum(['add', 'replace', 'remove']),
  path: z.string().min(1).describe('RFC 6901 JSON Pointer.'),
  replacementJson: z
    .string()
    .describe('add/replace 값의 유효한 JSON. remove이면 빈 문자열.'),
  explanation: z.string(),
});

export const RepairPlanSchema = z.object({ repairs: z.array(RepairPatchSchema) });
export type RepairPlan = z.infer<typeof RepairPlanSchema>;

const GOLD_SYSTEM = `당신은 수능 국어 비문학 골드 의미 지도의 독립 검증자다.
원문과 후보 골드를 항목별로 대조한다. 생성자의 의도나 기존 검수 상태를 추정하지 말고 주어진 두 입력만 사용한다.

반드시 검사할 것:
- 핵심 명제 누락, 원문 밖 내용 추가
- 인과·조건·예외·부정·양태·관계 방향 오류
- 주체·대상·역할 교환, 수치·비교 기준 오류
- proposition의 text/relation/predicate/argument/aspect/subjectRole/sourceSentences 정합성
- composite/title의 과도한 일반화, slot core와 evaluation link의 의미 오류

critical은 학생 판정이나 문단의 핵심 의미를 뒤집는 오류, error는 production 편입 전에 고쳐야 하는 의미 오류,
warning은 의미 계약을 바꾸지 않는 개선점이다. 스타일 선호나 표현 중복만으로 issue를 만들지 마라.
sourceEvidence는 반드시 원문에서 그대로 복사한 연속 부분 문자열이어야 한다. 원문에 없는 추가 내용을 지적할 때만 빈 문자열을 쓴다.
goldPath는 후보 JSON의 정확한 RFC 6901 JSON Pointer로 쓴다.`;

const QUERY_SYSTEM = `당신은 수능 국어 비문학 보존 질의의 독립 의미 검증자다.
원문, 확정 골드, 후보 질의만 대조한다. 기존 검수 상태나 기대 판정은 주어지지 않으며 추정하지 않는다.

반드시 검사할 것:
- 질문과 expectedAnswer가 원문·골드의 같은 의미를 묻고 답하는지
- sourceSentenceIds/propositionIds/relationEdgeIds가 실제 근거를 가리키는지
- acceptanceCriteria와 contradictionCriteria가 원문 의미를 넘거나 뒤집지 않는지
- scope/relation/argument 역할과 critical 플래그가 질의 의미에 맞는지
- 중요한 골드 의미가 질의 세트에서 빠졌거나 중복·과결합되지 않았는지

critical/error/warning과 sourceEvidence/goldPath 규칙은 골드 검증과 같다. goldPath는 후보 질의 JSON을 기준으로 한다.`;

const REPAIR_SYSTEM = `당신은 독립 verifier가 발견한 critical/error만 최소 수정하는 JSON repairer다.
원문에 없는 의미를 추가하지 말고, 지적되지 않은 경로는 바꾸지 마라. 각 수정은 RFC 6901 JSON Pointer와 JSON 값으로 반환한다.
배열 원소를 수정할 때는 안정성을 위해 해당 원소 전체를 replace하라. 누락 항목은 add, 불필요 항목은 remove를 쓴다.
replacementJson은 JSON.parse 가능한 완전한 JSON 문자열이어야 한다. warning은 수정하지 마라.`;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'semanticVerification')
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

/** ID와 생성 이력은 의미 후보가 아니므로 hash에서 제외한다. */
export function semanticCandidateHash(candidate: Gold | GeneratedQuerySet): string {
  const { paragraphId: _paragraphId, semanticVerification: _verification, ...semantic } = candidate;
  const withoutGeneration = Object.fromEntries(
    Object.entries(semantic).filter(([key]) => key !== 'generationMetadata' && key !== 'log'),
  );
  return sha256(stable(withoutGeneration));
}

export function semanticSourceHash(sourceText: string): string {
  return sha256(sourceText.replace(/\r\n?/g, '\n').trim());
}

export function verifierFingerprint(): string {
  return sha256(stable({
    provider: 'anthropic',
    model: MODEL,
    effort: SEMANTIC_VERIFICATION_EFFORT,
    verifierVersion: SEMANTIC_VERIFIER_VERSION,
    repairVersion: SEMANTIC_REPAIR_VERSION,
    workflowVersion: SEMANTIC_WORKFLOW_VERSION,
  }));
}

export function reportBlockers(report: SemanticVerificationReport): SemanticIssue[] {
  return report.issues.filter((issue) => issue.severity === 'critical' || issue.severity === 'error');
}

export function assertEvidenceContract(sourceText: string, report: SemanticVerificationReport): void {
  for (const issue of report.issues) {
    if (issue.sourceEvidence !== '' && !sourceText.includes(issue.sourceEvidence)) {
      throw new Error(`${issue.id}: sourceEvidence가 원문의 연속 부분 문자열이 아니다`);
    }
  }
}

export function evidenceContractViolations(
  sourceText: string,
  report: SemanticVerificationReport,
): readonly { issueId: string; evidence: string }[] {
  return report.issues
    .filter((issue) => issue.sourceEvidence !== '' && !sourceText.includes(issue.sourceEvidence))
    .map((issue) => ({ issueId: issue.id, evidence: issue.sourceEvidence }));
}

export function goldVerifierInput(sourceText: string, candidate: Gold): {
  sourceText: string;
  candidateGold: Omit<Gold, 'generationMetadata' | 'semanticVerification'>;
} {
  const { generationMetadata: _generation, semanticVerification: _verification, ...candidateGold } = candidate;
  return { sourceText, candidateGold };
}

export function queryVerifierInput(sourceText: string, gold: Gold, candidate: GeneratedQuerySet): {
  sourceText: string;
  gold: Omit<Gold, 'generationMetadata' | 'semanticVerification'>;
  relationEdgeIndex: readonly GenRelationEdge[];
  candidateQueries: Omit<GeneratedQuerySet, 'semanticVerification'>;
} {
  const { generationMetadata: _generation, semanticVerification: _goldVerification, ...cleanGold } = gold;
  const { semanticVerification: _queryVerification, ...candidateQueries } = candidate;
  return {
    sourceText,
    gold: cleanGold,
    relationEdgeIndex: relationEdgeIndex(gold),
    candidateQueries,
  };
}

function relationEdgeIndex(gold: Gold): GenRelationEdge[] {
  return [
    ...gold.evaluationLinks.map((edge, index) => ({
      id: `e${index + 1}`,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      relationProperties: [...edge.relationProperties],
      contrastAxis: edge.contrastAxis,
      kind: 'eval' as const,
    })),
    ...gold.discourseLinks.map((edge, index) => ({
      id: `d${index + 1}`,
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
      relationProperties: [...edge.relationProperties],
      contrastAxis: edge.contrastAxis,
      kind: 'discourse' as const,
    })),
  ];
}

export async function verifyGoldSemantic(
  sourceText: string,
  candidate: Gold,
  paragraphId: string,
): Promise<SemanticVerificationReport> {
  const input = goldVerifierInput(sourceText, candidate);
  const response = await instrumented('gold-semantic-verify', SEMANTIC_VERIFICATION_EFFORT, paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 10000,
      thinking: { type: 'adaptive' },
      output_config: { effort: SEMANTIC_VERIFICATION_EFFORT, format: zodOutputFormat(SemanticVerificationReportSchema) },
      system: GOLD_SYSTEM,
      messages: [{ role: 'user', content: `원문:\n${input.sourceText}\n\n후보 골드 JSON:\n${JSON.stringify(input.candidateGold)}` }],
    }),
  );
  if (response.parsed_output === null) throw new Error('gold semantic verifier 구조화 출력 파싱 실패');
  return response.parsed_output;
}

export async function verifyQuerySemantic(
  sourceText: string,
  gold: Gold,
  candidate: GeneratedQuerySet,
  paragraphId: string,
): Promise<SemanticVerificationReport> {
  const input = queryVerifierInput(sourceText, gold, candidate);
  const response = await instrumented('query-semantic-verify', SEMANTIC_VERIFICATION_EFFORT, paragraphId, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 10000,
      thinking: { type: 'adaptive' },
      output_config: { effort: SEMANTIC_VERIFICATION_EFFORT, format: zodOutputFormat(SemanticVerificationReportSchema) },
      system: QUERY_SYSTEM,
      messages: [{ role: 'user', content: `원문:\n${input.sourceText}\n\n확정 골드 JSON:\n${JSON.stringify(input.gold)}\n\n관계 ID 색인:\n${JSON.stringify(input.relationEdgeIndex)}\n\n후보 질의 JSON:\n${JSON.stringify(input.candidateQueries)}` }],
    }),
  );
  if (response.parsed_output === null) throw new Error('query semantic verifier 구조화 출력 파싱 실패');
  return response.parsed_output;
}

export async function planSemanticRepair(
  kind: 'gold' | 'query',
  sourceText: string,
  candidate: Gold | GeneratedQuerySet,
  issues: readonly SemanticIssue[],
  paragraphId: string,
): Promise<RepairPlan> {
  const response = await instrumented(
    kind === 'gold' ? 'gold-semantic-repair' : 'query-semantic-repair',
    SEMANTIC_VERIFICATION_EFFORT,
    paragraphId,
    () => getClient().messages.parse({
      model: MODEL,
      max_tokens: 10000,
      thinking: { type: 'adaptive' },
      output_config: { effort: SEMANTIC_VERIFICATION_EFFORT, format: zodOutputFormat(RepairPlanSchema) },
      system: REPAIR_SYSTEM,
      messages: [{ role: 'user', content: `대상 종류: ${kind}\n원문:\n${sourceText}\n\n후보 JSON:\n${JSON.stringify(candidate)}\n\n수정할 issue JSON:\n${JSON.stringify(issues)}` }],
    }),
  );
  if (response.parsed_output === null) throw new Error(`${kind} semantic repair 구조화 출력 파싱 실패`);
  return response.parsed_output;
}

function pointerParts(pointer: string): string[] {
  if (!pointer.startsWith('/')) throw new Error(`잘못된 JSON Pointer: ${pointer}`);
  return pointer.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function applyRepairPlan<T>(candidate: T, plan: RepairPlan): T {
  const copy = structuredClone(candidate) as unknown;
  for (const patch of plan.repairs) {
    const parts = pointerParts(patch.path);
    let parent = copy as Record<string, unknown> | unknown[];
    for (const part of parts.slice(0, -1)) {
      const next = Array.isArray(parent) ? parent[Number(part)] : parent[part];
      if (next === null || typeof next !== 'object') throw new Error(`${patch.path}: 부모 경로 없음`);
      parent = next as Record<string, unknown> | unknown[];
    }
    const key = parts.at(-1);
    if (key === undefined) throw new Error('루트 교체는 허용하지 않는다');
    if (patch.operation === 'remove') {
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
      continue;
    }
    const value = JSON.parse(patch.replacementJson) as unknown;
    if (Array.isArray(parent)) {
      if (patch.operation === 'add' && key === '-') parent.push(value);
      else if (patch.operation === 'add') parent.splice(Number(key), 0, value);
      else parent[Number(key)] = value;
    } else {
      parent[key] = value;
    }
  }
  return copy as T;
}

export function validateGoldStructure(gold: Gold): void {
  if (gold.titleId.length === 0 || gold.nodes.length === 0 || gold.sentences.length === 0) {
    throw new Error(`${gold.paragraphId}: 빈 title/nodes/sentences`);
  }
  for (const proposition of gold.propositions) PropositionSchema.parse(proposition);
  const sentenceIds = new Set(gold.sentences.map((sentence) => sentence.id));
  for (const proposition of gold.propositions) {
    for (const sentenceId of proposition.sourceSentences) {
      if (!sentenceIds.has(sentenceId)) throw new Error(`${gold.paragraphId}/${proposition.id}: 없는 문장 ${sentenceId}`);
    }
  }
}

export function validateQueryStructure(gold: Gold, queries: GeneratedQuerySet): void {
  GeneratedQuerySetSchema.parse(queries);
  const sentenceIds = new Set(gold.sentences.map((sentence) => sentence.id));
  const propositionIds = new Set(gold.propositions.map((proposition) => proposition.id));
  const edgeIds = new Set(relationEdgeIndex(gold).map((edge) => edge.id));
  for (const region of queries.regions) {
    for (const id of region.sourceSentenceIds) if (!sentenceIds.has(id)) throw new Error(`${queries.paragraphId}/${region.regionId}: 없는 문장 ${id}`);
    for (const id of region.propositionIds) if (!propositionIds.has(id)) throw new Error(`${queries.paragraphId}/${region.regionId}: 없는 명제 ${id}`);
    for (const id of region.relationEdgeIds) if (!edgeIds.has(id)) throw new Error(`${queries.paragraphId}/${region.regionId}: 없는 관계 ${id}`);
    for (const query of region.queries) {
      for (const id of query.sourceSentenceIds) if (!sentenceIds.has(id)) throw new Error(`${queries.paragraphId}/${query.id}: 없는 문장 ${id}`);
      for (const id of query.propositionIds) if (!propositionIds.has(id)) throw new Error(`${queries.paragraphId}/${query.id}: 없는 명제 ${id}`);
      for (const id of query.relationEdgeIds) if (!edgeIds.has(id)) throw new Error(`${queries.paragraphId}/${query.id}: 없는 관계 ${id}`);
    }
  }
}

export function makeVerificationRecord(args: {
  sourceText: string;
  candidate: Gold | GeneratedQuerySet;
  reports: readonly SemanticVerificationReport[];
  repairCycles: number;
  reportPaths: readonly string[];
  verifiedAt?: string;
}): SemanticVerificationRecord {
  const final = args.reports.at(-1);
  if (final === undefined) throw new Error('검증 report가 없다');
  const unresolved = reportBlockers(final);
  return SemanticVerificationRecordSchema.parse({
    status: unresolved.length === 0 ? 'passed' : 'failed',
    sourceHash: semanticSourceHash(args.sourceText),
    candidateHash: semanticCandidateHash(args.candidate),
    verifierFingerprint: verifierFingerprint(),
    verifiedAt: args.verifiedAt ?? new Date().toISOString(),
    passes: args.reports.length,
    repairCycles: args.repairCycles,
    unresolvedCriticalIssues: unresolved.filter((issue) => issue.severity === 'critical').length,
    unresolvedErrors: unresolved.filter((issue) => issue.severity === 'error').length,
    reportPaths: [...args.reportPaths],
  });
}

export function assertVerificationGate(
  sourceText: string,
  candidate: Gold | GeneratedQuerySet,
  record: unknown,
): void {
  const parsed = SemanticVerificationRecordSchema.parse(record);
  if (parsed.status !== 'passed') throw new Error(`semantic verification status=${parsed.status}`);
  if (parsed.sourceHash !== semanticSourceHash(sourceText)) throw new Error('semantic verification sourceHash 불일치');
  if (parsed.candidateHash !== semanticCandidateHash(candidate)) throw new Error('semantic verification candidateHash 불일치');
  if (parsed.verifierFingerprint !== verifierFingerprint()) throw new Error('semantic verifier fingerprint가 현재 계약과 다르다');
  if (parsed.unresolvedCriticalIssues !== 0 || parsed.unresolvedErrors !== 0) {
    throw new Error('해결되지 않은 semantic issue가 있다');
  }
}
