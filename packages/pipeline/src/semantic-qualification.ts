import { randomUUID } from 'node:crypto';

import { z } from 'zod/v4';

import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  RepairPlanSchema,
  SemanticVerificationRecordSchema,
  SemanticVerificationReportSchema,
  applyRepairPlan,
  assertEvidenceContract,
  reportBlockers,
  semanticCandidateHash,
  semanticSourceHash,
  sha256,
  type RepairPlan,
  type SemanticIssue,
  type SemanticVerificationRecord,
  type SemanticVerificationReport,
} from './semantic-verification.js';

export type SemanticAssetType = 'gold' | 'query' | 'title-query';
export type SemanticVerifierKind = SemanticAssetType;
export type QualificationStatus =
  | 'pending'
  | 'verifying'
  | 'clean_streak_1'
  | 'repair_required'
  | 'repairing'
  | 'qualified'
  | 'incomplete'
  | 'quarantined';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const SemanticVerificationRunV2Schema = z.object({
  runId: z.string().min(1),
  invocationId: z.string().min(1),
  verifierKind: z.enum(['gold', 'query', 'title-query']),
  provider: z.string().min(1),
  model: z.string().min(1),
  effort: z.string().min(1),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  resultReplay: z.boolean(),
  promptCacheUsed: z.boolean().optional(),
  verdict: z.enum(['clean', 'blocking', 'incomplete']),
  reportPath: z.string().min(1).optional(),
  reportHash: Sha256Schema.optional(),
  issueCount: z.number().int().nonnegative(),
  blockingIssueCount: z.number().int().nonnegative(),
  repairArtifactPath: z.string().min(1).optional(),
  failureReason: z.string().min(1).optional(),
});

export type SemanticVerificationRunV2 = z.infer<typeof SemanticVerificationRunV2Schema>;

export const SemanticVerificationRecordV2Schema = z.object({
  schemaVersion: z.literal('semantic-verification-record-v2'),
  assetType: z.enum(['gold', 'query', 'title-query']),
  verifierKind: z.enum(['gold', 'query', 'title-query']),
  sourceHash: Sha256Schema,
  candidateHash: Sha256Schema,
  verifierFingerprint: Sha256Schema,
  cleanStreak: z.number().int().min(0).max(2),
  qualificationStatus: z.enum(['pending', 'qualified', 'incomplete', 'quarantined']),
  repairCycles: z.number().int().nonnegative(),
  unresolvedBlockingIssues: z.number().int().nonnegative(),
  runs: z.array(SemanticVerificationRunV2Schema),
  createdAt: z.string().datetime(),
});

export type SemanticVerificationRecordV2 = z.infer<typeof SemanticVerificationRecordV2Schema>;

export type CompatibleSemanticVerificationRecord =
  | { readonly version: 'v1'; readonly record: SemanticVerificationRecord; readonly requiresRequalification: true }
  | { readonly version: 'v2'; readonly record: SemanticVerificationRecordV2; readonly requiresRequalification: false };

export function parseCompatibleVerificationRecord(value: unknown): CompatibleSemanticVerificationRecord {
  const v2 = SemanticVerificationRecordV2Schema.safeParse(value);
  if (v2.success) return { version: 'v2', record: v2.data, requiresRequalification: false };
  return {
    version: 'v1',
    record: SemanticVerificationRecordSchema.parse(value),
    requiresRequalification: true,
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function semanticReportHash(report: SemanticVerificationReport): string {
  return sha256(canonical(report));
}

export function stableSemanticIssueKey(assetType: SemanticAssetType, issue: SemanticIssue): string {
  return sha256(canonical({
    assetType,
    category: issue.category,
    path: issue.goldPath.trim(),
    evidenceHash: sha256(issue.sourceEvidence),
  }));
}

export function issueBlocksProduction(issue: SemanticIssue): boolean {
  return issue.severity === 'critical' || issue.severity === 'error';
}

export interface QualificationVerifierResult {
  readonly output: unknown;
  readonly invocationId?: string;
  readonly resultReplay?: boolean;
  readonly promptCacheUsed?: boolean;
}

export interface RepairDiff {
  readonly issueKey: string;
  readonly path: string;
  readonly operation: 'add' | 'replace' | 'remove';
  readonly before?: unknown;
  readonly after?: unknown;
}

export interface GuardedRepairResult<T> {
  readonly candidate: T;
  readonly plan: RepairPlan;
  readonly diffs: readonly RepairDiff[];
  readonly artifactPath?: string;
}

export interface QualificationExecution<T> {
  readonly runId: string;
  readonly candidate: T;
  readonly status: 'qualified' | 'incomplete' | 'quarantined';
  readonly cleanStreak: number;
  readonly repairCycles: number;
  readonly reports: readonly SemanticVerificationReport[];
  readonly reportPaths: readonly string[];
  readonly runs: readonly SemanticVerificationRunV2[];
  readonly repairs: readonly GuardedRepairResult<T>[];
  readonly stateHistory: readonly QualificationStatus[];
  readonly failureReason?: string;
}

export interface QualificationRunConfig<T> {
  readonly assetType: SemanticAssetType;
  readonly verifierKind: SemanticVerifierKind;
  readonly sourceText: string;
  /** 역할 라벨이 포함된 verifier input과 별개로 evidence가 실제로 속해야 하는 원문 조각. */
  readonly evidenceSourceTexts?: readonly string[];
  readonly initial: T;
  readonly provider: string;
  readonly model: string;
  readonly effort: string;
  readonly promptVersion: string;
  readonly reportSchemaVersion: string;
  readonly maxRepairCycles?: number;
  readonly verify: (candidate: T) => Promise<QualificationVerifierResult>;
  readonly repair: (
    candidate: T,
    blockers: readonly SemanticIssue[],
    repairCycle: number,
  ) => Promise<GuardedRepairResult<T>>;
  readonly validate: (candidate: T) => void;
  readonly persistReport?: (
    report: SemanticVerificationReport,
    pass: number,
    run: { readonly runId: string; readonly invocationId: string },
  ) => string | undefined;
}

/**
 * 의미 판단은 주입된 verifier가 담당한다. 이 함수는 clean streak, repair 상한과
 * malformed/evidence/structure 실패의 fail-closed 전이만 결정한다.
 */
export async function runSemanticQualification<T>(
  config: QualificationRunConfig<T>,
): Promise<QualificationExecution<T>> {
  const workflowRunId = randomUUID();
  const maxRepairCycles = config.maxRepairCycles ?? 2;
  let candidate = structuredClone(config.initial);
  let cleanStreak = 0;
  let repairCycles = 0;
  const reports: SemanticVerificationReport[] = [];
  const reportPaths: string[] = [];
  const runs: SemanticVerificationRunV2[] = [];
  const repairs: GuardedRepairResult<T>[] = [];
  const stateHistory: QualificationStatus[] = ['pending'];

  const finish = (
    status: QualificationExecution<T>['status'],
    failureReason?: string,
  ): QualificationExecution<T> => ({
    runId: workflowRunId,
    candidate,
    status,
    cleanStreak,
    repairCycles,
    reports,
    reportPaths,
    runs,
    repairs,
    stateHistory,
    ...(failureReason === undefined ? {} : { failureReason }),
  });

  try {
    config.validate(candidate);
  } catch (error) {
    stateHistory.push('incomplete');
    return finish('incomplete', error instanceof Error ? error.message : '초기 구조 검증 실패');
  }

  for (let pass = 1; ; pass++) {
    stateHistory.push('verifying');
    const startedAt = new Date().toISOString();
    const localInvocationId = randomUUID();
    let result: QualificationVerifierResult;
    try {
      result = await config.verify(candidate);
    } catch (error) {
      const completedAt = new Date().toISOString();
      runs.push({
        runId: workflowRunId,
        invocationId: localInvocationId,
        verifierKind: config.verifierKind,
        provider: config.provider,
        model: config.model,
        effort: config.effort,
        promptVersion: config.promptVersion,
        schemaVersion: config.reportSchemaVersion,
        startedAt,
        completedAt,
        resultReplay: false,
        verdict: 'incomplete',
        issueCount: 0,
        blockingIssueCount: 0,
        failureReason: error instanceof Error ? error.message : 'verifier 호출 실패',
      });
      stateHistory.push('incomplete');
      return finish('incomplete', runs.at(-1)?.failureReason);
    }

    const invocationId = result.invocationId ?? localInvocationId;
    if (runs.some((run) => run.invocationId === invocationId)) {
      const failureReason = '동일 invocation ID는 독립 verifier pass가 아니다';
      runs.push({
        runId: workflowRunId,
        invocationId,
        verifierKind: config.verifierKind,
        provider: config.provider,
        model: config.model,
        effort: config.effort,
        promptVersion: config.promptVersion,
        schemaVersion: config.reportSchemaVersion,
        startedAt,
        completedAt: new Date().toISOString(),
        resultReplay: result.resultReplay === true,
        ...(result.promptCacheUsed === undefined ? {} : { promptCacheUsed: result.promptCacheUsed }),
        verdict: 'incomplete',
        issueCount: 0,
        blockingIssueCount: 0,
        failureReason,
      });
      cleanStreak = 0;
      stateHistory.push('incomplete');
      return finish('incomplete', failureReason);
    }
    const parsed = SemanticVerificationReportSchema.safeParse(result.output);
    if (!parsed.success || result.resultReplay === true) {
      const failureReason = result.resultReplay === true
        ? 'result replay는 독립 verifier pass가 아니다'
        : 'semantic verifier structured output이 malformed다';
      runs.push({
        runId: workflowRunId,
        invocationId,
        verifierKind: config.verifierKind,
        provider: config.provider,
        model: config.model,
        effort: config.effort,
        promptVersion: config.promptVersion,
        schemaVersion: config.reportSchemaVersion,
        startedAt,
        completedAt: new Date().toISOString(),
        resultReplay: result.resultReplay === true,
        ...(result.promptCacheUsed === undefined ? {} : { promptCacheUsed: result.promptCacheUsed }),
        verdict: 'incomplete',
        issueCount: 0,
        blockingIssueCount: 0,
        failureReason,
      });
      cleanStreak = 0;
      stateHistory.push('incomplete');
      return finish('incomplete', failureReason);
    }

    const report = parsed.data;
    try {
      if (config.evidenceSourceTexts === undefined) {
        assertEvidenceContract(config.sourceText, report);
      } else {
        for (const issue of report.issues) {
          if (issue.sourceEvidence !== ''
            && !config.evidenceSourceTexts.some((source) => source.includes(issue.sourceEvidence))) {
            throw new Error(`${issue.id}: sourceEvidence가 primary/context 원문의 연속 부분 문자열이 아니다`);
          }
        }
      }
      config.validate(candidate);
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'deterministic postflight 실패';
      runs.push({
        runId: workflowRunId,
        invocationId,
        verifierKind: config.verifierKind,
        provider: config.provider,
        model: config.model,
        effort: config.effort,
        promptVersion: config.promptVersion,
        schemaVersion: config.reportSchemaVersion,
        startedAt,
        completedAt: new Date().toISOString(),
        resultReplay: false,
        ...(result.promptCacheUsed === undefined ? {} : { promptCacheUsed: result.promptCacheUsed }),
        verdict: 'incomplete',
        issueCount: report.issues.length,
        blockingIssueCount: reportBlockers(report).length,
        failureReason,
      });
      cleanStreak = 0;
      stateHistory.push('incomplete');
      return finish('incomplete', failureReason);
    }

    reports.push(report);
    const reportPath = config.persistReport?.(report, pass, { runId: workflowRunId, invocationId })
      ?? `memory://${workflowRunId}/${pass}`;
    reportPaths.push(reportPath);
    const blockers = reportBlockers(report);
    const run: SemanticVerificationRunV2 = {
      runId: workflowRunId,
      invocationId,
      verifierKind: config.verifierKind,
      provider: config.provider,
      model: config.model,
      effort: config.effort,
      promptVersion: config.promptVersion,
      schemaVersion: config.reportSchemaVersion,
      startedAt,
      completedAt: new Date().toISOString(),
      resultReplay: false,
      ...(result.promptCacheUsed === undefined ? {} : { promptCacheUsed: result.promptCacheUsed }),
      verdict: blockers.length === 0 ? 'clean' : 'blocking',
      reportPath,
      reportHash: semanticReportHash(report),
      issueCount: report.issues.length,
      blockingIssueCount: blockers.length,
    };
    runs.push(run);

    if (blockers.length === 0) {
      cleanStreak++;
      if (cleanStreak >= 2) {
        stateHistory.push('qualified');
        return finish('qualified');
      }
      stateHistory.push('clean_streak_1');
      continue;
    }

    cleanStreak = 0;
    stateHistory.push('repair_required');
    if (repairCycles >= maxRepairCycles) {
      stateHistory.push('quarantined');
      return finish('quarantined', `repair cycle 상한 ${maxRepairCycles}회 초과`);
    }

    stateHistory.push('repairing');
    try {
      const repaired = await config.repair(candidate, blockers, repairCycles + 1);
      repairCycles++;
      repairs.push(repaired);
      candidate = structuredClone(repaired.candidate);
      runs[runs.length - 1] = {
        ...run,
        ...(repaired.artifactPath === undefined ? {} : { repairArtifactPath: repaired.artifactPath }),
      };
      config.validate(candidate);
    } catch (error) {
      stateHistory.push('incomplete');
      return finish('incomplete', error instanceof Error ? error.message : 'repair 적용 실패');
    }
  }
}

const ALLOWED_REPAIR_ROOTS: Readonly<Record<SemanticAssetType, ReadonlySet<string>>> = {
  gold: new Set(['titleId', 'nodes', 'propositions', 'slots', 'evaluationLinks', 'discourseLinks']),
  query: new Set(['regions']),
  'title-query': new Set(['regions']),
};

const PROTECTED_REPAIR_ROOTS = new Set([
  'paragraphId',
  'sourceBinding',
  'sourceHash',
  'generationMetadata',
  'generatorFingerprint',
  'semanticVerification',
  'revisionHistory',
  'qualification',
  'assetType',
  'verifierKind',
]);

function pointerParts(pointer: string): string[] {
  if (!pointer.startsWith('/')) throw new Error(`잘못된 JSON Pointer: ${pointer}`);
  return pointer.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function pointerValue(root: unknown, pointer: string): { readonly exists: boolean; readonly value?: unknown } {
  let current = root;
  for (const part of pointerParts(pointer)) {
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(part) || Number(part) >= current.length) return { exists: false };
      current = current[Number(part)];
    } else if (current !== null && typeof current === 'object' && Object.hasOwn(current, part)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return { exists: false };
    }
  }
  return { exists: true, value: current };
}

function patchRelatesToIssue(patchPath: string, issuePath: string): boolean {
  if (patchPath === issuePath || patchPath.startsWith(`${issuePath}/`)) return true;
  const patchParts = pointerParts(patchPath);
  const issueParts = pointerParts(issuePath);
  return patchParts.length + 1 === issueParts.length
    && patchParts.every((part, index) => issueParts[index] === part);
}

export function applyGuardedRepairPlan<T extends Gold | GeneratedQuerySet>(args: {
  readonly assetType: SemanticAssetType;
  readonly candidate: T;
  readonly issues: readonly SemanticIssue[];
  readonly plan: unknown;
  readonly repairCycle: number;
  readonly artifactPath?: string;
}): GuardedRepairResult<T> {
  const plan = RepairPlanSchema.parse(args.plan);
  if (plan.repairs.length === 0) throw new Error('blocking issue에 대한 repair patch가 없다');
  if (plan.repairs.length > 8) throw new Error('repair patch가 8개를 초과한다');

  const byReference = new Map<string, SemanticIssue>();
  for (const issue of args.issues) {
    byReference.set(issue.id, issue);
    byReference.set(stableSemanticIssueKey(args.assetType, issue), issue);
  }

  const prepared = plan.repairs.map((patch) => {
    const issue = byReference.get(patch.issueId);
    if (issue === undefined) throw new Error(`${patch.issueId}: 현재 blocker와 연결되지 않은 repair`);
    const parts = pointerParts(patch.path);
    const root = parts[0];
    if (root === undefined || PROTECTED_REPAIR_ROOTS.has(root)) {
      throw new Error(`${patch.path}: 보호 metadata는 repair할 수 없다`);
    }
    if (!ALLOWED_REPAIR_ROOTS[args.assetType].has(root)) {
      throw new Error(`${patch.path}: ${args.assetType} repair allowlist 밖의 경로`);
    }
    if (!patchRelatesToIssue(patch.path, issue.goldPath)) {
      throw new Error(`${patch.path}: issue 경로 ${issue.goldPath}와 무관한 repair`);
    }

    const before = pointerValue(args.candidate, patch.path);
    if (patch.operation !== 'add' && !before.exists) throw new Error(`${patch.path}: 존재하지 않는 경로`);
    if (patch.operation === 'add') {
      const parentPath = patch.path.slice(0, patch.path.lastIndexOf('/')) || '/';
      if (parentPath !== '/' && !pointerValue(args.candidate, parentPath).exists) {
        throw new Error(`${patch.path}: add 부모 경로가 없다`);
      }
    }
    return { patch, issue, before };
  });

  const candidate = applyRepairPlan(args.candidate, plan);
  const diffs: RepairDiff[] = prepared.map(({ patch, issue, before }) => {
    const after = patch.operation === 'remove'
      ? { exists: false as const }
      : patch.operation === 'add' && patch.path.endsWith('/-')
        ? { exists: true as const, value: JSON.parse(patch.replacementJson) as unknown }
        : pointerValue(candidate, patch.path);
    return {
      issueKey: stableSemanticIssueKey(args.assetType, issue),
      path: patch.path,
      operation: patch.operation,
      ...(before.exists ? { before: before.value } : {}),
      ...(after.exists ? { after: after.value } : {}),
    };
  });
  return {
    candidate,
    plan,
    diffs,
    ...(args.artifactPath === undefined ? {} : { artifactPath: args.artifactPath }),
  };
}

export function makeVerificationRecordV2<T extends Gold | GeneratedQuerySet>(args: {
  readonly assetType: SemanticAssetType;
  readonly verifierKind: SemanticVerifierKind;
  readonly sourceText: string;
  readonly candidate: T;
  readonly verifierFingerprint: string;
  readonly execution: QualificationExecution<T>;
  readonly createdAt?: string;
}): SemanticVerificationRecordV2 {
  const last = args.execution.reports.at(-1);
  return SemanticVerificationRecordV2Schema.parse({
    schemaVersion: 'semantic-verification-record-v2',
    assetType: args.assetType,
    verifierKind: args.verifierKind,
    sourceHash: semanticSourceHash(args.sourceText),
    candidateHash: semanticCandidateHash(args.candidate),
    verifierFingerprint: args.verifierFingerprint,
    cleanStreak: Math.min(args.execution.cleanStreak, 2),
    qualificationStatus: args.execution.status,
    repairCycles: args.execution.repairCycles,
    unresolvedBlockingIssues: last === undefined ? 0 : reportBlockers(last).length,
    runs: args.execution.runs,
    createdAt: args.createdAt ?? new Date().toISOString(),
  });
}

export function assertV2QualificationGate(args: {
  readonly record: unknown;
  readonly expectedAssetType: SemanticAssetType;
  readonly expectedVerifierKind: SemanticVerifierKind;
  readonly sourceText: string;
  readonly evidenceSourceTexts?: readonly string[];
  readonly candidate: Gold | GeneratedQuerySet;
  readonly verifierFingerprint: string;
  readonly loadReport: (path: string) => unknown;
}): void {
  const record = SemanticVerificationRecordV2Schema.parse(args.record);
  if (record.assetType !== args.expectedAssetType) throw new Error('semantic qualification asset type 불일치');
  if (record.verifierKind !== args.expectedVerifierKind) throw new Error('semantic qualification verifier kind 불일치');
  if (record.sourceHash !== semanticSourceHash(args.sourceText)) throw new Error('semantic qualification sourceHash 불일치');
  if (record.candidateHash !== semanticCandidateHash(args.candidate)) throw new Error('semantic qualification candidateHash 불일치');
  if (record.verifierFingerprint !== args.verifierFingerprint) throw new Error('semantic qualification verifier fingerprint 불일치');
  if (record.qualificationStatus !== 'qualified' || record.cleanStreak !== 2) {
    throw new Error('semantic qualification clean streak 미완료');
  }
  if (record.unresolvedBlockingIssues !== 0) throw new Error('semantic qualification unresolved blocker 존재');
  const finalTwo = record.runs.slice(-2);
  if (finalTwo.length !== 2 || finalTwo.some((run) => run.verdict !== 'clean')) {
    throw new Error('semantic qualification 마지막 두 pass가 clean이 아니다');
  }
  if (new Set(finalTwo.map((run) => run.runId)).size !== 1) throw new Error('semantic qualification workflow run ID 불일치');
  if (new Set(finalTwo.map((run) => run.invocationId)).size !== 2) throw new Error('독립 verifier invocation이 아니다');
  for (const run of finalTwo) {
    if (run.verifierKind !== args.expectedVerifierKind) throw new Error('run verifier kind 불일치');
    if (run.resultReplay) throw new Error('result replay는 qualification pass가 아니다');
    if (run.reportPath === undefined || run.reportHash === undefined) throw new Error('qualification report binding 없음');
    const report = SemanticVerificationReportSchema.parse(args.loadReport(run.reportPath));
    if (semanticReportHash(report) !== run.reportHash) throw new Error('qualification report hash 불일치');
    if (args.evidenceSourceTexts === undefined) {
      assertEvidenceContract(args.sourceText, report);
    } else {
      for (const issue of report.issues) {
        if (issue.sourceEvidence !== ''
          && !args.evidenceSourceTexts.some((source) => source.includes(issue.sourceEvidence))) {
          throw new Error(`${issue.id}: qualification evidence가 primary/context 원문에 없다`);
        }
      }
    }
    if (reportBlockers(report).length !== 0) throw new Error('qualification report에 blocker 존재');
  }
}
