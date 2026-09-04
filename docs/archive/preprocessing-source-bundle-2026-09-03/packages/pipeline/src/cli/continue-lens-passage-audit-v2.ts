import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from '../problem-solving/source-bundle.js';
import {
  SourceAuditV2Schema,
  buildSourceUnitRegistry,
  validateSourceUnitRegistryAgainstPacket,
  type SourceAuditV2,
  type SourceUnitRegistry,
} from '../problem-solving/source-bundle-v2.js';
import { createSourceProviderJsonSchema } from '../problem-solving/source-bundle-runtime.js';
import {
  buildPassageAuditChunks,
  buildPassageEvidenceResolutionReportV2,
  comparePassageCandidatesByUnitV2,
  evaluatePassageBundleStateV2,
  reprojectLegacyPassageOutputV2,
  type LegacyPassageReprojectionV2,
  type PassageAuditChunkV2,
  type PassageSourceBundleV2,
} from '../problem-solving/passage-source-v2.js';
import {
  auditPassageSourceBundleChunkV2,
  buildPassageAuditInputV2,
  passageHighRiskSourceUnitIds,
} from '../problem-solving/passage-source-v2-runtime.js';
import {
  PASSAGE_COMPARE_PROMPT_V2,
  SOURCE_V2_COST_CALCULATOR_VERSION,
  SOURCE_V2_MAX_OUTPUT_TOKENS,
  SOURCE_V2_MODEL,
  SOURCE_V2_PRICING_USD_PER_MILLION,
  SOURCE_V2_SERVICE_TIER,
  SourceV2ApiOutputValidationError,
  assertNoSourceV2InputLeak,
  estimateSourceV2PreflightCost,
  sourceV2CallCostUsd,
  type SourceV2ApiCall,
  type SourceV2CallControl,
} from '../problem-solving/source-bundle-v2-runtime.js';

const ARTIFACT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts');
const OUTPUT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/v2-passage');
const PRIOR_RUN_ROOT = resolve(
  OUTPUT_ROOT,
  'paid-runs/ff15564aef54-2026-09-03T125621816Z',
);
const RAW_OUTPUT_PATHS = [
  resolve(PRIOR_RUN_ROOT, 'runs/01-passage-generate-1/raw-output.txt'),
  resolve(PRIOR_RUN_ROOT, 'runs/02-passage-generate-2/raw-output.txt'),
  resolve(
    PRIOR_RUN_ROOT,
    'failures/resp_0c4a2bffa41a9b5c016a996f031dac87d0a2bf481eda31e2de/raw-output.txt',
  ),
] as const;
const PRIOR_METADATA_PATHS = [
  resolve(PRIOR_RUN_ROOT, 'runs/01-passage-generate-1/metadata.json'),
  resolve(PRIOR_RUN_ROOT, 'runs/02-passage-generate-2/metadata.json'),
  resolve(
    PRIOR_RUN_ROOT,
    'failures/resp_0c4a2bffa41a9b5c016a996f031dac87d0a2bf481eda31e2de/metadata.json',
  ),
] as const;
const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');
const PLAN_VERSION = 'lens-passage-source-v2-existing-output-audit-plan-v1';
const RUNNER_VERSION = 'lens-passage-source-v2-existing-output-audit-runner-v1';
const MEDIUM_CALLS = 4;
const MAX_HIGH_CALLS = 4;
const MAX_CALLS = 8;
const BUDGET_CEILING_USD = 10;
const HIGH_SEMANTIC_ISSUE_CLASSES = new Set([
  'DIRECTION', 'COEFFICIENT', 'EXPONENT', 'NEGATION', 'MODALITY', 'REQUIRED_CONDITION',
  'CAUSE_EFFECT', 'DEFINITION_TARGET', 'ENTITY_IDENTITY', 'SOURCE_LINEAGE',
  'OMITTED_MEANING', 'UNSUPPORTED_MEANING',
]);
let activeExecutionRoot: string | null = null;

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadAndReproject(
  packet: SourcePacket,
  registry: SourceUnitRegistry,
): Promise<{ readonly rawLocks: readonly unknown[]; readonly reprojections: readonly LegacyPassageReprojectionV2[] }> {
  const rawLocks: unknown[] = [];
  const reprojections: LegacyPassageReprojectionV2[] = [];
  for (const [index, path] of RAW_OUTPUT_PATHS.entries()) {
    const bytes = await readFile(path);
    const rawOutput = JSON.parse(bytes.toString('utf8')) as unknown;
    const reprojection = reprojectLegacyPassageOutputV2({ rawOutput, sourcePacket: packet, registry });
    rawLocks.push({ run: index + 1, path, sha256: sha256Bytes(bytes), bytes: bytes.length });
    reprojections.push(reprojection);
  }
  return { rawLocks, reprojections };
}

async function cumulativePaidCostBeforeContinuation(): Promise<{
  readonly cumulativeUsd: number;
  readonly metadataLocks: readonly unknown[];
}> {
  const metadataLocks: unknown[] = [];
  let priorBeforeFirst: number | null = null;
  let newCost = 0;
  for (const [index, path] of PRIOR_METADATA_PATHS.entries()) {
    const bytes = await readFile(path);
    const metadata = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    if (index === 0) {
      priorBeforeFirst = Number((metadata['preflight'] as Record<string, unknown>)
        ['cumulativeActualCostUsdBeforeCall']);
    }
    const costUsd = sourceV2CallCostUsd(metadata);
    newCost += costUsd;
    metadataLocks.push({ path, sha256: sha256Bytes(bytes), costUsd });
  }
  if (priorBeforeFirst === null || !Number.isFinite(priorBeforeFirst)) {
    throw new Error('이전 실행 전 누적 비용을 읽을 수 없다.');
  }
  return {
    cumulativeUsd: Number((priorBeforeFirst + newCost).toFixed(9)),
    metadataLocks,
  };
}

function mediumAuditRequiresHigh(audit: SourceAuditV2, sourceUnitId: string): boolean {
  const unit = audit.unitAudits.find((entry) => entry.sourceUnitId === sourceUnitId);
  if (unit === undefined) return false;
  return ['REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED'].includes(unit.decision) ||
    unit.omittedMeaningDetected || unit.unsupportedMeaningDetected ||
    unit.issues.some((issue) => HIGH_SEMANTIC_ISSUE_CLASSES.has(issue.issueClass));
}

function preMediumHighRiskIds(options: {
  readonly artifacts: readonly PassageSourceBundleV2[];
  readonly comparisons: ReturnType<typeof comparePassageCandidatesByUnitV2>;
}): string[] {
  const ids = new Set(options.comparisons.filter((entry) => entry.requiresHighAudit)
    .map((entry) => entry.sourceUnitId));
  for (const artifact of options.artifacts) {
    for (const id of passageHighRiskSourceUnitIds(artifact)) ids.add(id);
  }
  return [...ids];
}

async function moduleLocks(): Promise<readonly unknown[]> {
  const path = fileURLToPath(import.meta.url);
  const root = dirname(path);
  const entries = [
    ['cli', path],
    ['passage-runtime', resolve(root, '../problem-solving/passage-source-v2-runtime.js')],
    ['passage-contract', resolve(root, '../problem-solving/passage-source-v2.js')],
    ['source-runtime', resolve(root, '../problem-solving/source-bundle-v2-runtime.js')],
    ['source-contract', resolve(root, '../problem-solving/source-bundle-v2.js')],
  ] as const;
  return Promise.all(entries.map(async ([name, file]) => {
    const bytes = await readFile(file);
    return { name, sha256: sha256Bytes(bytes), bytes: bytes.length };
  }));
}

async function buildPlan(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly reprojections: readonly LegacyPassageReprojectionV2[];
  readonly rawLocks: readonly unknown[];
}) {
  const artifacts = options.reprojections.map((entry) => entry.artifact);
  const candidate = artifacts[0]!;
  const peers = artifacts.slice(1);
  const chunks = buildPassageAuditChunks(options.registry);
  const comparisons = comparePassageCandidatesByUnitV2({ artifacts, registry: options.registry });
  const preMediumRiskIds = preMediumHighRiskIds({ artifacts, comparisons });
  const preselectedHighChunkIds = chunks.filter((chunk) => (
    chunk.sourceUnitIds.some((id) => preMediumRiskIds.includes(id))
  )).map((chunk) => chunk.chunkId);
  const plannedCalls = [
    ...chunks.map((chunk, index) => ({
      callNumber: index + 1,
      stage: `MEDIUM_AUDIT_${chunk.chunkId}`,
      effort: 'medium' as const,
      conditional: false,
      condition: null,
      chunk,
      maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_MEDIUM,
      projectionInput: buildPassageAuditInputV2({
        packet: options.packet, registry: options.registry, candidate, peerReadings: peers,
        chunk, auditId: `AUDIT-MEDIUM-${chunk.chunkId}`, effort: 'medium',
      }),
    })),
    ...chunks.map((chunk, index) => ({
      callNumber: MEDIUM_CALLS + index + 1,
      stage: `HIGH_AUDIT_${chunk.chunkId}`,
      effort: 'high' as const,
      conditional: !preselectedHighChunkIds.includes(chunk.chunkId),
      condition: preselectedHighChunkIds.includes(chunk.chunkId)
        ? '사전 고위험 구조·후보 의미 충돌·UNRESOLVED'
        : 'Medium의 의미 이슈 검출 시에만 추가',
      chunk,
      maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_HIGH,
      projectionInput: buildPassageAuditInputV2({
        packet: options.packet, registry: options.registry, candidate, peerReadings: peers,
        chunk, auditId: `AUDIT-HIGH-${chunk.chunkId}`, effort: 'high',
      }),
    })),
  ];
  plannedCalls.forEach((call) => assertNoSourceV2InputLeak(call.projectionInput));
  const promptBytes = await readFile(resolve(PROMPT_ROOT, `${PASSAGE_COMPARE_PROMPT_V2}.md`));
  const cumulative = await cumulativePaidCostBeforeContinuation();
  const preflights = plannedCalls.map((call) => estimateSourceV2PreflightCost({
    input: call.projectionInput, promptBytes: promptBytes.length, imageCount: 0,
    maxOutputTokens: call.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: cumulative.cumulativeUsd,
    budgetCeilingUsd: BUDGET_CEILING_USD,
  }));
  const minimumNewCostUsd = Number(plannedCalls.reduce((sum, call, index) => (
    sum + (call.conditional ? 0 : preflights[index]!.maximumCallCostUsd)
  ), 0).toFixed(9));
  const maximumNewCostUsd = Number(preflights
    .reduce((sum, entry) => sum + entry.maximumCallCostUsd, 0).toFixed(9));
  if (cumulative.cumulativeUsd + maximumNewCostUsd > BUDGET_CEILING_USD) {
    throw new Error('감사 계획의 최악 누적 비용이 $10 승인 상한을 넘는다.');
  }
  const plan = {
    planVersion: PLAN_VERSION, runnerVersion: RUNNER_VERSION,
    executionEnabledOnlyWithHashBoundApproval: true,
    model: SOURCE_V2_MODEL, serviceTier: SOURCE_V2_SERVICE_TIER,
    store: false, previousResponseId: null, automaticRetries: 0,
    inputPolicy: {
      existingRawGenerationOutputsOnly: true, newGenerationCalls: 0,
      rawOutputLocks: options.rawLocks,
      reprojectionVersion: options.reprojections[0]?.reprojectionVersion,
      reprojectedArtifactHashes: options.reprojections.map((entry) => entry.artifactHash),
      images: false, itemStem: false, scenario: false, options: false,
      answerKey: false, officialExplanation: false, existingGold: false,
    },
    sourcePacketHash: sourceArtifactHash(options.packet),
    sourceUnitRegistryHash: sourceArtifactHash(options.registry),
    executionArtifactLocks: await moduleLocks(),
    promptLock: { promptVersion: PASSAGE_COMPARE_PROMPT_V2, sha256: sha256Bytes(promptBytes) },
    outputSchemaLock: {
      name: 'SourceAuditV2',
      sha256: sourceArtifactHash(createSourceProviderJsonSchema(SourceAuditV2Schema)),
    },
    callGraph: plannedCalls.map(({ projectionInput: _projectionInput, ...call }) => call),
    routing: {
      mediumAllChunks: true, highConditionalMaximumChunks: MAX_HIGH_CALLS,
      preMediumHighRiskSourceUnitIds: preMediumRiskIds,
      preselectedHighAuditChunkIds: preselectedHighChunkIds,
      structuralVariantAloneTriggersHigh: false,
      mediumSemanticIssueCanTriggerHigh: true,
      highDoesNotReceiveMediumOutput: true,
      automaticRepairCalls: 0,
    },
    costPolicy: {
      calculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
      pricingUsdPerMillion: SOURCE_V2_PRICING_USD_PER_MILLION,
      priorCumulativeCost: cumulative,
      totalBudgetCeilingUsd: BUDGET_CEILING_USD,
      minimumCalls: MEDIUM_CALLS + preselectedHighChunkIds.length, maximumCalls: MAX_CALLS,
      maximumNewCostUsd,
    },
  };
  return {
    plan, planHash: sourceArtifactHash(plan), chunks, comparisons, preMediumRiskIds,
    minimumCalls: MEDIUM_CALLS + preselectedHighChunkIds.length,
    plannedCalls, preflights, cumulative, minimumNewCostUsd, maximumNewCostUsd,
  };
}

async function persistCall(path: string, call: SourceV2ApiCall<unknown>): Promise<void> {
  await mkdir(path, { recursive: true });
  await Promise.all([
    writeFile(resolve(path, 'raw-output.txt'), `${call.rawOutputText}\n`, 'utf8'),
    writeJson(resolve(path, 'parsed-output.json'), call.parsedOutput),
    writeJson(resolve(path, 'metadata.json'), call.metadata),
  ]);
}

async function execute(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly reprojections: readonly LegacyPassageReprojectionV2[];
  readonly chunks: readonly PassageAuditChunkV2[];
  readonly preMediumRiskIds: readonly string[];
  readonly planHash: string;
  readonly priorCostUsd: number;
  readonly outputRoot: string;
}): Promise<void> {
  const candidate = options.reprojections[0]!.artifact;
  const peers = options.reprojections.slice(1).map((entry) => entry.artifact);
  const calls: SourceV2ApiCall<unknown>[] = [];
  const actualNewCost = () => calls.reduce((sum, call) => sum + sourceV2CallCostUsd(call.metadata), 0);
  const remember = async (callOptions: {
    readonly stage: string;
    readonly branch: string;
    readonly chunk: PassageAuditChunkV2;
    readonly effort: 'medium' | 'high';
  }): Promise<SourceV2ApiCall<SourceAuditV2>> => {
    if (calls.length >= MAX_CALLS) throw new Error('승인 가능한 최대 8회 호출을 초과했다.');
    const root = resolve(options.outputRoot, `runs/${String(calls.length + 1).padStart(2, '0')}-${callOptions.stage}`);
    const call = await auditPassageSourceBundleChunkV2({
      packet: options.packet, registry: options.registry, candidate, peerReadings: peers,
      chunk: callOptions.chunk,
      auditId: `AUDIT-${callOptions.effort.toUpperCase()}-${callOptions.chunk.chunkId}`,
      effort: callOptions.effort,
      callControl: {
        approvalPlanHash: options.planHash,
        cumulativeActualCostUsdBeforeCall: options.priorCostUsd + actualNewCost(),
        budgetCeilingUsd: BUDGET_CEILING_USD,
        conditionBranch: callOptions.branch,
        dependencyArtifactHashes: options.reprojections.map((entry) => entry.artifactHash),
        recordPreflight: (record) => writeJson(resolve(root, 'preflight.json'), record),
      },
    });
    calls.push(call as SourceV2ApiCall<unknown>);
    await persistCall(root, call);
    return call;
  };
  const mediumAudits: SourceV2ApiCall<SourceAuditV2>[] = [];
  for (const chunk of options.chunks) {
    mediumAudits.push(await remember({
      stage: `medium-${chunk.chunkId}`, branch: 'MEDIUM_ALL_CHUNKS', chunk, effort: 'medium',
    }));
  }
  const highRiskIds = new Set(options.preMediumRiskIds);
  for (const chunk of options.chunks) {
    const audit = mediumAudits.find((call) => (
      call.parsedOutput.expectedSourceUnitIds.join('|') === chunk.sourceUnitIds.join('|')
    ));
    if (audit === undefined) throw new Error(`${chunk.chunkId}의 Medium 감사 결과가 없다.`);
    for (const id of chunk.sourceUnitIds) {
      if (mediumAuditRequiresHigh(audit.parsedOutput, id)) highRiskIds.add(id);
    }
  }
  const highChunks = options.chunks.filter((chunk) => chunk.sourceUnitIds.some((id) => highRiskIds.has(id)));
  const highAudits: SourceV2ApiCall<SourceAuditV2>[] = [];
  for (const chunk of highChunks) {
    highAudits.push(await remember({
      stage: `high-${chunk.chunkId}`, branch: 'HIGH_CONDITIONAL_WITHOUT_MEDIUM_OUTPUT',
      chunk, effort: 'high',
    }));
  }
  const evidence = buildPassageEvidenceResolutionReportV2({
    artifact: candidate, sourcePacket: options.packet, registry: options.registry,
  });
  const state = evaluatePassageBundleStateV2({
    artifact: candidate, registry: options.registry, evidenceResolutionReport: evidence,
    mediumAudits: mediumAudits.map((call) => call.parsedOutput),
    highAudits: highAudits.map((call) => call.parsedOutput),
    highRiskSourceUnitIds: [...highRiskIds], artifactFrozen: true,
  });
  await writeJson(resolve(options.outputRoot, 'result.json'), {
    status: 'PASSAGE_V2_EXISTING_OUTPUT_AUDIT_COMPLETE', planHash: options.planHash,
    calls: calls.length, mediumCalls: mediumAudits.length, highCalls: highAudits.length,
    repairCalls: 0, actualNewCostUsd: actualNewCost(),
    cumulativePaidCostUsd: options.priorCostUsd + actualNewCost(),
    highRiskSourceUnitIds: [...highRiskIds], bundleState: state, existingGoldChanged: false,
  });
}

async function main(): Promise<void> {
  const artifactRoot = resolve(option('--artifact-root') ?? ARTIFACT_ROOT);
  const outputRoot = resolve(option('--output-root') ?? OUTPUT_ROOT);
  const packet = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/passage-source-packet.json'), 'utf8',
  )));
  const registry = buildSourceUnitRegistry(packet);
  validateSourceUnitRegistryAgainstPacket({ registry, sourcePacket: packet });
  const loaded = await loadAndReproject(packet, registry);
  const first = await buildPlan({ packet, registry, ...loaded });
  const second = await buildPlan({ packet, registry, ...loaded });
  if (first.planHash !== second.planHash) throw new Error('감사 계획 해시가 재현되지 않는다.');
  const dryRoot = resolve(outputRoot, 'continuation-dry-run');
  await Promise.all([
    ...loaded.reprojections.map((entry, index) => writeJson(
      resolve(outputRoot, `reprojected/run-${index + 1}.json`), entry,
    )),
    writeJson(resolve(outputRoot, 'reprojected/candidate-comparison.json'), first.comparisons),
    writeJson(resolve(dryRoot, 'approval-plan.json'), {
      status: 'AWAITING_SEPARATE_PAID_EXECUTION_APPROVAL',
      planHash: first.planHash,
      approvalId: `lens-passage-v2-audit:${first.planHash}`,
      plan: first.plan,
    }),
    writeJson(resolve(dryRoot, 'execution-plan.json'), {
      status: 'DRY_RUN_ONLY_NO_API_CALLS', planHash: first.planHash,
      calls: first.plannedCalls.map((call, index) => ({
        ...call, projectionInput: undefined,
        projectionInputHash: sourceArtifactHash(call.projectionInput),
        projectionInputBytes: Buffer.byteLength(JSON.stringify(call.projectionInput), 'utf8'),
        projectedPreflight: first.preflights[index],
      })),
      minimumCalls: first.minimumCalls, maximumCalls: MAX_CALLS,
      minimumProjectedNewCostUsd: first.minimumNewCostUsd,
      maximumProjectedNewCostUsd: first.maximumNewCostUsd,
      priorCumulativeCostUsd: first.cumulative.cumulativeUsd,
      maximumProjectedCumulativeUsd: first.cumulative.cumulativeUsd + first.maximumNewCostUsd,
      budgetCeilingUsd: BUDGET_CEILING_USD,
    }),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: 'PASSAGE_V2_REPROJECTION_AND_AUDIT_DRY_RUN_COMPLETE',
    planHash: first.planHash, paidApiCallsMade: 0,
    reprojectedCandidates: loaded.reprojections.length,
    legacyNonExactFragments: loaded.reprojections.flatMap((entry) => (
      entry.legacyFragmentDiagnostics.filter((diagnostic) => !diagnostic.exactWithinSourceUnit)
    )).length,
    comparisonSummary: Object.fromEntries(
      ['EXACT_AGREEMENT', 'STRUCTURAL_VARIANT', 'MEANING_CONFLICT', 'UNRESOLVED'].map((kind) => [
        kind, first.comparisons.filter((entry) => entry.classification === kind).length,
      ]),
    ),
    preMediumHighRiskSourceUnitIds: first.preMediumRiskIds,
    minimumCalls: first.minimumCalls, maximumCalls: MAX_CALLS,
    priorCumulativeCostUsd: first.cumulative.cumulativeUsd,
    minimumProjectedNewCostUsd: first.minimumNewCostUsd,
    maximumProjectedNewCostUsd: first.maximumNewCostUsd,
    maximumProjectedCumulativeUsd: first.cumulative.cumulativeUsd + first.maximumNewCostUsd,
  }, null, 2)}\n`);
  if (!process.argv.includes('--execute')) return;
  const requiredApproval = `lens-passage-v2-audit:${first.planHash}`;
  if (option('--approval-id') !== requiredApproval) {
    throw new Error(`유료 실행에는 현재 계획 해시에 결합된 --approval-id=${requiredApproval}가 필요하다.`);
  }
  activeExecutionRoot = resolve(
    outputRoot,
    `audit-paid-runs/${first.planHash.slice('sha256:'.length, 19)}-${new Date().toISOString()
      .replaceAll(':', '').replaceAll('.', '')}`,
  );
  await writeJson(resolve(activeExecutionRoot, 'approved-plan.json'), {
    approvalId: requiredApproval, planHash: first.planHash, plan: first.plan,
  });
  await execute({
    packet, registry, reprojections: loaded.reprojections, chunks: first.chunks,
    preMediumRiskIds: first.preMediumRiskIds, planHash: first.planHash,
    priorCostUsd: first.cumulative.cumulativeUsd, outputRoot: activeExecutionRoot,
  });
}

try {
  await main();
} catch (error) {
  if (error instanceof SourceV2ApiOutputValidationError) {
    const root = activeExecutionRoot ?? resolve(option('--output-root') ?? OUTPUT_ROOT);
    const failureRoot = resolve(root, `failures/${error.metadata.responseId}`);
    await Promise.all([
      writeFile(resolve(failureRoot, 'raw-output.txt'), `${error.rawOutputText}\n`, 'utf8'),
      writeJson(resolve(failureRoot, 'metadata.json'), error.metadata),
      writeJson(resolve(failureRoot, 'validation-error.json'), {
        name: error.name, message: error.message,
        chargedCallCostUsd: sourceV2CallCostUsd(error.metadata),
      }),
    ]);
  }
  throw error;
}
