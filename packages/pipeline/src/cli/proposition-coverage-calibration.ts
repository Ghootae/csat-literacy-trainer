/**
 * Experimental propositionCoverage calibration runner.
 *
 * Build 후 실행:
 *   node packages/pipeline/dist/cli/proposition-coverage-calibration.js
 *
 * core 24개는 사례별 3회 독립 API 호출한다. boundary 4개는 기본 1회 탐색하되 agreement와
 * 정확도 분모에는 넣지 않는다. production/query evaluator 경로는 import하지 않는다.
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  evaluatePropositionCoverage,
  propositionCoverageConfig,
  type PropositionCoverageCall,
} from '../llm/proposition-coverage-eval.js';
import {
  resolveGoldPropositionView,
  summarizeCalibration,
  type CalibrationObservation,
  type Coverage,
} from '../proposition-coverage-calibration.js';
import type { TargetPropositionView } from '../llm/proposition-coverage-eval.js';

interface CoreCase {
  readonly id: string;
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly response: string;
  readonly shortForm: string;
  readonly expectedCoverage: Coverage;
}

interface BoundaryCase {
  readonly id: string;
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly response: string;
  readonly shortForm: string;
  readonly boundaryType: 'axis_only_mapping';
  readonly includeInAgreement: false;
}

interface Job {
  readonly set: 'core' | 'boundary';
  readonly case: CoreCase | BoundaryCase;
  readonly repeat: number;
}

interface SuccessfulRecord {
  readonly invocationId: string;
  readonly set: 'core' | 'boundary';
  readonly caseId: string;
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly repeat: number;
  readonly shortForm: string;
  readonly targetProposition: TargetPropositionView;
  readonly response: string;
  readonly expectedCoverage?: Coverage;
  readonly evidenceAudit: {
    readonly exactContiguousSubstring: boolean;
    readonly containsEllipsis: boolean;
    readonly status: 'exact' | 'ellipsis' | 'paraphrase_or_noncontiguous';
  };
  readonly call: PropositionCoverageCall;
}

interface FailedRecord {
  readonly invocationId: string;
  readonly set: 'core' | 'boundary';
  readonly caseId: string;
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly repeat: number;
  readonly shortForm: string;
  readonly targetProposition: TargetPropositionView;
  readonly response: string;
  readonly expectedCoverage?: Coverage;
  readonly error: string;
}

type Record_ = SuccessfulRecord | FailedRecord;

const ROOT = process.cwd();
const FIXTURES = resolve(ROOT, 'packages/pipeline/fixtures');
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function positiveInt(name: string, fallback: number): number {
  const raw = option(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name}은 양의 정수여야 한다: ${raw}`);
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

const PRICE: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function estimatedCost(records: readonly SuccessfulRecord[]): number | null {
  let total = 0;
  for (const r of records) {
    const price = PRICE[r.call.model];
    if (price === undefined) return null;
    const u = r.call.usage;
    total +=
      (u.inputTokens * price.input +
        u.outputTokens * price.output +
        u.cacheWriteTokens * price.input * 1.25 +
        u.cacheReadTokens * price.input * 0.1) /
      1_000_000;
  }
  return total;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!;
}

async function main(): Promise<void> {
  const repeats = positiveInt('--repeats', 3);
  const boundaryRepeats = positiveInt('--boundary-repeats', 1);
  const concurrency = positiveInt('--concurrency', 4);
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const outputPath = resolve(
    ROOT,
    option('--output') ?? `.omc/agreement/proposition-coverage-semantic-view-${stamp}.json`,
  );
  const coreFixture = readJson<{ cases: readonly CoreCase[] }>(
    resolve(FIXTURES, 'proposition-coverage-initial-calibration.json'),
  );
  const boundaryFixture = readJson<{ includeInAgreement: false; cases: readonly BoundaryCase[] }>(
    resolve(FIXTURES, 'proposition-coverage-calibration-boundary.json'),
  );
  if (coreFixture.cases.length !== 24) throw new Error(`core가 24개가 아니다: ${coreFixture.cases.length}`);
  if (boundaryFixture.includeInAgreement !== false) throw new Error('boundary가 agreement에서 격리되지 않았다');

  const jobs: Job[] = [
    ...coreFixture.cases.flatMap((c) =>
      Array.from({ length: repeats }, (_, i) => ({ set: 'core' as const, case: c, repeat: i + 1 })),
    ),
    ...boundaryFixture.cases.flatMap((c) =>
      Array.from({ length: boundaryRepeats }, (_, i) => ({ set: 'boundary' as const, case: c, repeat: i + 1 })),
    ),
  ];
  const config = propositionCoverageConfig();
  const records: Record_[] = [];
  const startedAt = new Date().toISOString();
  const wallStarted = performance.now();
  let cursor = 0;

  const snapshot = (complete: boolean) => {
    const successful = records.filter((r): r is SuccessfulRecord => 'call' in r);
    const observations: CalibrationObservation[] = records
      .filter((r) => r.set === 'core')
      .map((r) => ({
        caseId: r.caseId,
        repeat: r.repeat,
        expectedCoverage: r.expectedCoverage!,
        ...('call' in r ? { output: r.call.output } : { error: r.error }),
      }));
    const apiMessageIds = successful.map((r) => r.call.apiMessageId);
    const latencies = successful.map((r) => r.call.latencyMs);
    const usage = successful.reduce(
      (sum, r) => ({
        inputTokens: sum.inputTokens + r.call.usage.inputTokens,
        outputTokens: sum.outputTokens + r.call.usage.outputTokens,
        cacheWriteTokens: sum.cacheWriteTokens + r.call.usage.cacheWriteTokens,
        cacheReadTokens: sum.cacheReadTokens + r.call.usage.cacheReadTokens,
      }),
      { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 },
    );
    const document = {
      name: 'proposition-coverage-semantic-view-calibration-run',
      datasetRole: 'calibration_dev_result',
      complete,
      startedAt,
      updatedAt: new Date().toISOString(),
      config: {
        ...config,
        repeats,
        boundaryRepeats,
        concurrency,
        modelInputFields: ['targetProposition', 'studentResponse'],
        applicationResultCache: false,
        promptCacheControl: false,
      },
      progress: { completed: records.length, total: jobs.length },
      independence: {
        oneEvaluatorCallPerObservation: true,
        uniqueApiMessageIds: new Set(apiMessageIds).size === apiMessageIds.length,
        successfulApiCalls: apiMessageIds.length,
        applicationCacheUsed: false,
        cacheReadTokens: usage.cacheReadTokens,
        cacheWriteTokens: usage.cacheWriteTokens,
      },
      usage: {
        ...usage,
        estimatedCostUsd: estimatedCost(successful),
        wallLatencyMs: Math.round(performance.now() - wallStarted),
        callLatencyMs: {
          average: latencies.length === 0 ? 0 : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
          p50: percentile(latencies, 0.5),
          p95: percentile(latencies, 0.95),
          maximum: latencies.length === 0 ? 0 : Math.max(...latencies),
        },
      },
      ...(observations.length === coreFixture.cases.length * repeats
        ? { coreMetrics: summarizeCalibration(observations) }
        : {}),
      records: [...records].sort(
        (a, b) => a.set.localeCompare(b.set) || a.caseId.localeCompare(b.caseId) || a.repeat - b.repeat,
      ),
    };
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  };

  console.log(
    `proposition coverage calibration — core ${coreFixture.cases.length}×${repeats}, ` +
      `boundary ${boundaryFixture.cases.length}×${boundaryRepeats}`,
  );
  console.log(`model=${config.model} effort=${config.effort} concurrency=${concurrency}`);
  console.log(`output=${outputPath}\n`);

  const worker = async () => {
    for (;;) {
      const index = cursor++;
      const job = jobs[index];
      if (job === undefined) return;
      const invocationId = randomUUID();
      const targetProposition = resolveGoldPropositionView(job.case.paragraphId, job.case.propositionId);
      const local = {
        invocationId,
        set: job.set,
        caseId: job.case.id,
        paragraphId: job.case.paragraphId,
        propositionId: job.case.propositionId,
        repeat: job.repeat,
        shortForm: job.case.shortForm,
        targetProposition,
        response: job.case.response,
        ...('expectedCoverage' in job.case ? { expectedCoverage: job.case.expectedCoverage } : {}),
      };
      try {
        const call = await evaluatePropositionCoverage({
          targetProposition,
          studentResponse: job.case.response,
        });
        const exactContiguousSubstring =
          call.output.evidence === '' || job.case.response.includes(call.output.evidence);
        const containsEllipsis = call.output.evidence.includes('…') || call.output.evidence.includes('...');
        const evidenceAudit = {
          exactContiguousSubstring,
          containsEllipsis,
          status: exactContiguousSubstring
            ? ('exact' as const)
            : containsEllipsis
              ? ('ellipsis' as const)
              : ('paraphrase_or_noncontiguous' as const),
        };
        records.push({ ...local, evidenceAudit, call });
        console.log(
          `[${records.length}/${jobs.length}] ${job.set} ${job.case.id} #${job.repeat} → ${call.output.coverage} ` +
            `(${(call.latencyMs / 1000).toFixed(1)}s)`,
        );
      } catch (error) {
        records.push({ ...local, error: errorMessage(error) });
        console.error(`[${records.length}/${jobs.length}] ${job.set} ${job.case.id} #${job.repeat} → ERROR`);
      }
      snapshot(false);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  snapshot(true);

  const failures = records.filter((r) => 'error' in r);
  const ids = records.filter((r): r is SuccessfulRecord => 'call' in r).map((r) => r.call.apiMessageId);
  if (new Set(ids).size !== ids.length) throw new Error('독립 호출의 API message ID가 중복됐다');
  console.log(`\n완료: ${records.length - failures.length}/${records.length}, 실패 ${failures.length}`);
  console.log(`원시 결과: ${outputPath}`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
