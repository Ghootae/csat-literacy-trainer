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
  PassageSourceBundleV2Schema,
  PassageSourceProposalV2Schema,
  PassageUnitRepairV2Schema,
  PassageUnitRepairProposalV2Schema,
  buildPassageAuditChunks,
  buildPassageEvidenceResolutionReportV2,
  comparePassageCandidatesByUnitV2,
  evaluatePassageBundleStateV2,
  type PassageAuditChunkV2,
  type PassageSourceBundleV2,
} from '../problem-solving/passage-source-v2.js';
import {
  auditPassageSourceBundleChunkV2,
  buildPassageAuditInputV2,
  buildPassageGenerationInputV2,
  generatePassageSourceBundleV2,
  passageHighRiskSourceUnitIds,
} from '../problem-solving/passage-source-v2-runtime.js';
import {
  PASSAGE_COMPARE_PROMPT_V2,
  PASSAGE_REPAIR_PROMPT_V2,
  PASSAGE_SOURCE_PROMPT_V2,
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
import { lensVisualCallCostUsd } from '../problem-solving/visual-source-runtime.js';

const ARTIFACT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts');
const OUTPUT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/v2-passage');
const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');
const ITEM_RESULT_PATH = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-item-exploration/paid-runs/' +
  'c0fcf8e6e613-2026-09-03T111050881Z/result.json',
);
const VISUAL_METADATA_PATHS = [
  resolve(
    'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-visual-exploration/paid-runs/' +
    '8b2cdfba4740-2026-09-03T115755077Z/runs/01-visual-only-medium/metadata.json',
  ),
  resolve(
    'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-visual-exploration/paid-runs/' +
    '8b2cdfba4740-2026-09-03T115755077Z/failures/' +
    'resp_0030c5d43a43699b016a9960ed01e887d0af3c2794bdd735ca/metadata.json',
  ),
] as const;
const APPROVAL_ID = 'lens-passage-source-v2-integrated-approval-2026-09-03';
const PLAN_VERSION = 'lens-passage-source-v2-integrated-plan-v1';
const RUNNER_VERSION = 'lens-passage-source-v2-runner-v1';
const GENERATION_COUNT = 3;
const MEDIUM_AUDIT_COUNT = 4;
const MAX_HIGH_AUDIT_COUNT = 4;
const MAX_CALLS = 11;
const AUTOMATIC_REPAIR_CALLS = 0;
const BUDGET_CEILING_USD = 10;
const EXPECTED_SOURCE_UNIT_COUNT = 28;
const EXPECTED_CHUNK_SIZES = [4, 7, 7, 10] as const;
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

async function historicalPaidCost(): Promise<{
  readonly totalUsd: number;
  readonly evidenceLocks: readonly { path: string; sha256: string; costUsd: number }[];
}> {
  const itemBytes = await readFile(ITEM_RESULT_PATH);
  const itemResult = JSON.parse(itemBytes.toString('utf8')) as Record<string, unknown>;
  const itemCost = Number(itemResult['experimentCumulativeCostUsd']);
  if (!Number.isFinite(itemCost) || itemCost < 0) throw new Error('기존 ITEM 누적 비용을 읽을 수 없다.');
  const evidenceLocks: { path: string; sha256: string; costUsd: number }[] = [{
    path: ITEM_RESULT_PATH,
    sha256: sha256Bytes(itemBytes),
    costUsd: itemCost,
  }];
  let totalUsd = itemCost;
  for (const path of VISUAL_METADATA_PATHS) {
    const bytes = await readFile(path);
    const costUsd = lensVisualCallCostUsd(JSON.parse(bytes.toString('utf8')));
    totalUsd += costUsd;
    evidenceLocks.push({ path, sha256: sha256Bytes(bytes), costUsd });
  }
  return { totalUsd: Number(totalUsd.toFixed(9)), evidenceLocks };
}

function syntheticPassageArtifact(
  packet: SourcePacket,
  registry: SourceUnitRegistry,
): PassageSourceBundleV2 {
  const units = registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT');
  return PassageSourceBundleV2Schema.parse({
    passageBundleVersion: 'passage-text-source-bundle-v2',
    sourceClaimPolicy: 'EXPLICIT_OR_FAITHFUL_NORMALIZATION_ONLY',
    derivedRelationsIncluded: false,
    offsetOwnership: 'CODE_ONLY',
    mediaGroundingStatus: packet.media.length === 0 ? 'NOT_APPLICABLE' : 'PENDING',
    bundle: {
      bundleVersion: 'problem-source-bundle-v2',
      scope: 'PASSAGE',
      sourcePacketHash: sourceArtifactHash(packet),
      sourceUnitRegistryHash: sourceArtifactHash(registry),
      offsetFieldsProducedByModel: false,
      itemDirectives: [],
      claims: units.map((unit) => ({
        claimId: `${unit.sourceUnitId}-C1`, sourceUnitId: unit.sourceUnitId,
        normalizedClaim: unit.rawText, polarity: 'POSITIVE', modality: 'ASSERTED',
        qualifiers: [], evidenceFragments: [unit.rawText],
      })),
      entities: [], quantities: [], relations: [], visualCandidates: [],
      mediaAssessment: {
        hasMedia: packet.media.length > 0, visualRelevant: false,
        visualRequiredForSourceUnderstanding: false, visualRequiredForSolving: 'UNASSESSED',
        reason: 'dry-run의 크기와 구조를 확인하기 위한 합성 후보다.',
      },
      unresolved: [],
    },
    unitCoverage: units.map((unit) => ({
      sourceUnitId: unit.sourceUnitId, claimIds: [`${unit.sourceUnitId}-C1`], relationIds: [],
      disposition: 'CLAIMS_EXTRACTED',
      mediaGroundingStatus: packet.media.length === 0 ? 'NOT_APPLICABLE' : 'PENDING',
      reason: 'dry-run 투영용 claim',
    })),
  });
}

interface PlannedCall {
  readonly callNumber: number;
  readonly stage: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: typeof PASSAGE_SOURCE_PROMPT_V2 | typeof PASSAGE_COMPARE_PROMPT_V2;
  readonly maxOutputTokens: number;
  readonly conditional: boolean;
  readonly sourceUnitIds: readonly string[];
  readonly projectionInput: unknown;
}

async function executionArtifactLocks(): Promise<readonly unknown[]> {
  const modulePath = fileURLToPath(import.meta.url);
  const moduleRoot = dirname(modulePath);
  const entries = [
    ['cli', modulePath],
    ['passage-source-v2-runtime', resolve(moduleRoot, '../problem-solving/passage-source-v2-runtime.js')],
    ['passage-source-v2', resolve(moduleRoot, '../problem-solving/passage-source-v2.js')],
    ['source-bundle-v2-runtime', resolve(moduleRoot, '../problem-solving/source-bundle-v2-runtime.js')],
    ['source-bundle-v2', resolve(moduleRoot, '../problem-solving/source-bundle-v2.js')],
    ['source-bundle-runtime', resolve(moduleRoot, '../problem-solving/source-bundle-runtime.js')],
    ['source-bundle', resolve(moduleRoot, '../problem-solving/source-bundle.js')],
  ] as const;
  return Promise.all(entries.map(async ([name, path]) => {
    const bytes = await readFile(path);
    return { name, sha256: sha256Bytes(bytes), bytes: bytes.length };
  }));
}

async function buildPlan(packet: SourcePacket, registry: SourceUnitRegistry) {
  const chunks = buildPassageAuditChunks(registry);
  const synthetic = syntheticPassageArtifact(packet, registry);
  const calls: PlannedCall[] = [];
  for (let run = 1; run <= GENERATION_COUNT; run++) {
    calls.push({
      callNumber: calls.length + 1, stage: `PASSAGE_GENERATE_${run}`, effort: 'medium',
      promptVersion: PASSAGE_SOURCE_PROMPT_V2,
      maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_GENERATE,
      conditional: false, sourceUnitIds: registry.units.map((unit) => unit.sourceUnitId),
      projectionInput: buildPassageGenerationInputV2({
        packet, registry, generationId: `PASSAGE-GEN-${run}`,
      }),
    });
  }
  for (const effort of ['medium', 'high'] as const) {
    for (const chunk of chunks) {
      calls.push({
        callNumber: calls.length + 1,
        stage: `${effort.toUpperCase()}_AUDIT_${chunk.chunkId}`,
        effort,
        promptVersion: PASSAGE_COMPARE_PROMPT_V2,
        maxOutputTokens: effort === 'medium'
          ? SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_MEDIUM
          : SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_HIGH,
        conditional: effort === 'high', sourceUnitIds: chunk.sourceUnitIds,
        projectionInput: buildPassageAuditInputV2({
          packet, registry, candidate: synthetic,
          peerReadings: [structuredClone(synthetic), structuredClone(synthetic)],
          chunk, auditId: `DRY-${effort.toUpperCase()}-${chunk.chunkId}`, effort,
        }),
      });
    }
  }
  calls.forEach((call) => assertNoSourceV2InputLeak(call.projectionInput));
  const promptVersions = [PASSAGE_SOURCE_PROMPT_V2, PASSAGE_COMPARE_PROMPT_V2, PASSAGE_REPAIR_PROMPT_V2];
  const promptLocks = [];
  const promptBytes = new Map<string, number>();
  for (const promptVersion of promptVersions) {
    const bytes = await readFile(resolve(PROMPT_ROOT, `${promptVersion}.md`));
    promptBytes.set(promptVersion, bytes.length);
    promptLocks.push({ promptVersion, sha256: sha256Bytes(bytes), bytes: bytes.length });
  }
  const historical = await historicalPaidCost();
  const preflights = calls.map((call) => estimateSourceV2PreflightCost({
    input: call.projectionInput, promptBytes: promptBytes.get(call.promptVersion) ?? 0,
    imageCount: 0, maxOutputTokens: call.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: historical.totalUsd,
    budgetCeilingUsd: BUDGET_CEILING_USD,
  }));
  const minimumCalls = calls.filter((call) => !call.conditional);
  const maximumProjectedNewCostUsd = Number(preflights.reduce(
    (sum, preflight) => sum + preflight.maximumCallCostUsd, 0,
  ).toFixed(9));
  const minimumProjectedNewCostUsd = Number(minimumCalls.reduce((sum, call) => {
    const index = calls.indexOf(call);
    return sum + preflights[index]!.maximumCallCostUsd;
  }, 0).toFixed(9));
  if (historical.totalUsd + maximumProjectedNewCostUsd > BUDGET_CEILING_USD) {
    throw new Error('dry-run 최악 비용이 승인된 누적 $10 상한을 넘는다.');
  }
  const schemaLocks = [
    ['PassageSourceProposalV2', createSourceProviderJsonSchema(PassageSourceProposalV2Schema)],
    ['SourceAuditV2', createSourceProviderJsonSchema(SourceAuditV2Schema)],
    ['PassageUnitRepairProposalV2', createSourceProviderJsonSchema(PassageUnitRepairProposalV2Schema)],
  ].map(([name, schema]) => ({ name, sha256: sourceArtifactHash(schema) }));
  const approvalEnvelope = {
    approvalKind: 'BOUNDED_INTEGRATED_APPROVAL', approvalId: APPROVAL_ID,
    target: 'CONVEX_LENS_PASSAGE_SOURCE_BUNDLE_V2',
    sequence: ['IMPLEMENT_SETTINGS', 'DRY_RUN_GATE', 'PAID_EXECUTION_IF_GATE_PASSES'],
    model: SOURCE_V2_MODEL, generationEffort: 'medium', auditEfforts: ['medium', 'high'],
    serviceTier: SOURCE_V2_SERVICE_TIER, store: false, previousResponseId: null,
    automaticRetries: 0, generationCalls: 3, mediumAuditCalls: 4,
    maximumHighAuditCalls: 4, maximumTotalCalls: MAX_CALLS, automaticRepairCalls: 0,
    maxOutputTokens: {
      generation: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_GENERATE,
      mediumAudit: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_MEDIUM,
      highAudit: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_HIGH,
      repairOutsidePaidPlan: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_REPAIR,
    },
    historicalAndNewCumulativeBudgetCeilingUsd: BUDGET_CEILING_USD,
    excludes: ['IMAGES', 'ITEM_STEM', 'SCENARIO', 'OPTIONS', 'ANSWER_KEY',
      'OFFICIAL_EXPLANATIONS', 'EXISTING_GOLD'],
  };
  const plan = {
    planVersion: PLAN_VERSION, runnerVersion: RUNNER_VERSION,
    approvalEnvelope, executionArtifactLocks: await executionArtifactLocks(),
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    sourceUnitCount: registry.units.length, chunks, promptLocks, schemaLocks,
    historicalCost: historical,
    callGraph: calls.map(({ projectionInput: _projectionInput, ...call }) => call),
    routingPolicy: {
      candidate: 'FIRST_OF_THREE_GENERATIONS',
      peerReadings: 'SECOND_AND_THIRD_GENERATIONS',
      mediumAudit: 'ALL_FOUR_PARAGRAPH_CHUNKS',
      highAudit: 'CHUNKS_WITH_HIGH_RISK_SIGNATURE_OR_CANDIDATE_CONFLICT',
      mediumAndHighIndependent: true,
      semanticFailureDoesNotStopRemainingAudits: true,
      automaticRepairCalls: AUTOMATIC_REPAIR_CALLS,
    },
    costPolicy: {
      calculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
      pricingUsdPerMillion: SOURCE_V2_PRICING_USD_PER_MILLION,
      actualDynamicPreflightBeforeEveryCall: true,
      budgetCeilingUsd: BUDGET_CEILING_USD,
    },
  };
  const planHash = sourceArtifactHash(plan);
  return {
    plan, planHash, calls, chunks, preflights, historical,
    costProjection: {
      minimumCalls: minimumCalls.length, maximumCalls: calls.length,
      minimumProjectedNewCostUsd, maximumProjectedNewCostUsd,
      historicalPaidCostUsd: historical.totalUsd,
      minimumProjectedCumulativeUsd: historical.totalUsd + minimumProjectedNewCostUsd,
      maximumProjectedCumulativeUsd: historical.totalUsd + maximumProjectedNewCostUsd,
      budgetCeilingUsd: BUDGET_CEILING_USD,
    },
  };
}

function assertDryRunGates(plan: Awaited<ReturnType<typeof buildPlan>>): void {
  const sizes = plan.chunks.map((chunk) => chunk.sourceUnitIds.length);
  const unconditional = plan.calls.filter((call) => !call.conditional);
  const high = plan.calls.filter((call) => call.effort === 'high');
  if (plan.plan.approvalEnvelope.automaticRepairCalls !== 0 || AUTOMATIC_REPAIR_CALLS !== 0) {
    throw new Error('자동 수리 호출은 승인 범위 밖이다.');
  }
  if (plan.plan.sourceUnitCount !== EXPECTED_SOURCE_UNIT_COUNT ||
    JSON.stringify(sizes) !== JSON.stringify(EXPECTED_CHUNK_SIZES)) {
    throw new Error('고정 Source Unit 또는 문단 chunk가 승인 계획과 다르다.');
  }
  if (plan.calls.length !== MAX_CALLS || unconditional.length !== GENERATION_COUNT + MEDIUM_AUDIT_COUNT ||
    high.length !== MAX_HIGH_AUDIT_COUNT) {
    throw new Error('호출 그래프가 승인된 최소 7회·최대 11회 구조와 다르다.');
  }
  if (plan.costProjection.maximumProjectedCumulativeUsd > BUDGET_CEILING_USD) {
    throw new Error('최악 비용 투영이 승인된 누적 $10 상한을 넘는다.');
  }
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
  readonly chunks: readonly PassageAuditChunkV2[];
  readonly outputRoot: string;
  readonly planHash: string;
  readonly priorPaidCostUsd: number;
}): Promise<void> {
  const completedCalls: SourceV2ApiCall<unknown>[] = [];
  const callCost = () => completedCalls.reduce((sum, call) => sum + sourceV2CallCostUsd(call.metadata), 0);
  const remember = async <T>(callOptions: {
    readonly stage: string;
    readonly branch: string;
    readonly dependencies: readonly string[];
    readonly run: (control: SourceV2CallControl) => Promise<SourceV2ApiCall<T>>;
  }): Promise<SourceV2ApiCall<T>> => {
    if (completedCalls.length >= MAX_CALLS) throw new Error('승인된 최대 11회를 초과할 수 없다.');
    const callNumber = completedCalls.length + 1;
    const root = resolve(options.outputRoot, `runs/${String(callNumber).padStart(2, '0')}-${callOptions.stage}`);
    const call = await callOptions.run({
      approvalPlanHash: options.planHash,
      cumulativeActualCostUsdBeforeCall: options.priorPaidCostUsd + callCost(),
      budgetCeilingUsd: BUDGET_CEILING_USD,
      conditionBranch: callOptions.branch,
      dependencyArtifactHashes: callOptions.dependencies,
      recordPreflight: (record) => writeJson(resolve(root, 'preflight.json'), record),
    });
    completedCalls.push(call as SourceV2ApiCall<unknown>);
    await persistCall(root, call as SourceV2ApiCall<unknown>);
    if (options.priorPaidCostUsd + callCost() > BUDGET_CEILING_USD) {
      throw new Error('실제 누적 비용이 승인된 $10 상한을 넘었다.');
    }
    process.stdout.write(`${JSON.stringify({
      progress: 'API_CALL_COMPLETE', callNumber, stage: callOptions.stage,
      callCostUsd: sourceV2CallCostUsd(call.metadata),
      cumulativePaidCostUsd: options.priorPaidCostUsd + callCost(),
    })}\n`);
    return call;
  };

  const generations: SourceV2ApiCall<PassageSourceBundleV2>[] = [];
  for (let run = 1; run <= GENERATION_COUNT; run++) {
    generations.push(await remember({
      stage: `passage-generate-${run}`, branch: 'THREE_INDEPENDENT_GENERATIONS', dependencies: [],
      run: (callControl) => generatePassageSourceBundleV2({
        packet: options.packet, registry: options.registry,
        generationId: `PASSAGE-GEN-${run}`, callControl,
      }),
    }));
  }
  const artifacts = generations.map((call) => call.parsedOutput);
  const candidate = artifacts[0]!;
  const peers = artifacts.slice(1);
  const comparisons = comparePassageCandidatesByUnitV2({ artifacts, registry: options.registry });
  const highRiskIds = new Set<string>(comparisons.filter((entry) => entry.requiresHighAudit)
    .map((entry) => entry.sourceUnitId));
  for (const artifact of artifacts) {
    for (const id of passageHighRiskSourceUnitIds(artifact)) highRiskIds.add(id);
  }
  const highChunks = options.chunks.filter((chunk) => (
    chunk.sourceUnitIds.some((id) => highRiskIds.has(id))
  ));
  if (highChunks.length > MAX_HIGH_AUDIT_COUNT) throw new Error('High 감사 chunk가 승인 상한을 넘었다.');
  await Promise.all([
    writeJson(resolve(options.outputRoot, 'candidates/candidate-a.json'), candidate),
    writeJson(resolve(options.outputRoot, 'candidates/peer-b.json'), peers[0]),
    writeJson(resolve(options.outputRoot, 'candidates/peer-c.json'), peers[1]),
    writeJson(resolve(options.outputRoot, 'candidate-comparison.json'), comparisons),
    writeJson(resolve(options.outputRoot, 'risk-routing.json'), {
      highRiskSourceUnitIds: [...highRiskIds], selectedHighAuditChunkIds: highChunks.map((chunk) => chunk.chunkId),
      maximumHighAuditCalls: MAX_HIGH_AUDIT_COUNT,
    }),
  ]);
  const candidateHash = sourceArtifactHash(candidate);
  const peerHashes = peers.map(sourceArtifactHash);
  const mediumAudits: SourceV2ApiCall<SourceAuditV2>[] = [];
  for (const chunk of options.chunks) {
    mediumAudits.push(await remember({
      stage: `medium-${chunk.chunkId}`, branch: 'MEDIUM_ALL_CHUNKS',
      dependencies: [candidateHash, ...peerHashes],
      run: (callControl) => auditPassageSourceBundleChunkV2({
        packet: options.packet, registry: options.registry, candidate, peerReadings: peers,
        chunk, auditId: `AUDIT-MEDIUM-${chunk.chunkId}`, effort: 'medium', callControl,
      }),
    }));
  }
  const highAudits: SourceV2ApiCall<SourceAuditV2>[] = [];
  for (const chunk of highChunks) {
    highAudits.push(await remember({
      stage: `high-${chunk.chunkId}`, branch: 'HIGH_RISK_OR_CONFLICT_CHUNKS_ONLY',
      dependencies: [candidateHash, ...peerHashes],
      run: (callControl) => auditPassageSourceBundleChunkV2({
        packet: options.packet, registry: options.registry, candidate, peerReadings: peers,
        chunk, auditId: `AUDIT-HIGH-${chunk.chunkId}`, effort: 'high', callControl,
      }),
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
  const unitDecisionCounts = [...mediumAudits, ...highAudits]
    .flatMap((call) => call.parsedOutput.unitAudits)
    .reduce<Record<string, number>>((counts, unit) => {
      counts[unit.decision] = (counts[unit.decision] ?? 0) + 1;
      return counts;
    }, {});
  const result = {
    status: 'PASSAGE_SOURCE_BUNDLE_V2_EXPERIMENT_COMPLETE',
    approvalPlanHash: options.planHash,
    apiCalls: completedCalls.length,
    generationCalls: generations.length,
    mediumAuditCalls: mediumAudits.length,
    highAuditCalls: highAudits.length,
    automaticRepairCalls: 0,
    actualNewCostUsd: callCost(), priorPaidCostUsd: options.priorPaidCostUsd,
    cumulativePaidCostUsd: options.priorPaidCostUsd + callCost(),
    candidateArtifactHash: candidateHash, evidenceResolution: evidence,
    candidateComparisonSummary: Object.fromEntries(
      ['EXACT_AGREEMENT', 'STRUCTURAL_VARIANT', 'MEANING_CONFLICT', 'UNRESOLVED'].map((kind) => [
        kind, comparisons.filter((entry) => entry.classification === kind).length,
      ]),
    ),
    highRiskSourceUnitIds: [...highRiskIds], unitDecisionCounts,
    bundleState: state,
    existingGoldChanged: false,
  };
  await Promise.all([
    writeJson(resolve(options.outputRoot, 'evidence-resolution.json'), evidence),
    writeJson(resolve(options.outputRoot, 'bundle-state.json'), state),
    writeJson(resolve(options.outputRoot, 'result.json'), result),
  ]);
}

async function main(): Promise<void> {
  const artifactRoot = resolve(option('--artifact-root') ?? ARTIFACT_ROOT);
  const outputRoot = resolve(option('--output-root') ?? OUTPUT_ROOT);
  const packet = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/passage-source-packet.json'), 'utf8',
  )));
  if (packet.scope !== 'PASSAGE') throw new Error('볼록렌즈 PASSAGE packet이 아니다.');
  const registry = buildSourceUnitRegistry(packet);
  validateSourceUnitRegistryAgainstPacket({ registry, sourcePacket: packet });
  const first = await buildPlan(packet, registry);
  const second = await buildPlan(packet, registry);
  if (first.planHash !== second.planHash) throw new Error('동일 입력의 dry-run 계획 해시가 재현되지 않는다.');
  assertDryRunGates(first);
  await Promise.all([
    writeJson(resolve(outputRoot, 'dry-run/source-unit-registry.json'), registry),
    writeJson(resolve(outputRoot, 'dry-run/approval-plan.json'), {
      status: 'INTEGRATED_APPROVAL_ENVELOPE_LOCKED', planHash: first.planHash,
      approvalId: APPROVAL_ID, approvalPlan: first.plan,
    }),
    writeJson(resolve(outputRoot, 'dry-run/execution-plan.json'), {
      status: 'DRY_RUN_GATES_PASSED_NO_API_CALLS', planHash: first.planHash,
      calls: first.calls.map((call, index) => ({
        ...call, projectionInput: undefined,
        projectionInputHash: sourceArtifactHash(call.projectionInput),
        projectionInputBytes: Buffer.byteLength(JSON.stringify(call.projectionInput), 'utf8'),
        projectedPreflight: first.preflights[index],
      })),
      costProjection: first.costProjection,
    }),
    writeJson(resolve(outputRoot, 'dry-run/input-projection-audit.json'), {
      passed: true, passageTextIncluded: true, imageBytesIncluded: false,
      itemStemIncluded: false, scenarioIncluded: false, choicesIncluded: false,
      answerKeyIncluded: false, officialExplanationIncluded: false, existingGoldIncluded: false,
      derivedRelationGenerationAllowed: false, planHashReproducible: true,
      sourceUnitCount: registry.units.length,
      chunkSizes: first.chunks.map((chunk) => chunk.sourceUnitIds.length),
    }),
    writeJson(resolve(outputRoot, 'dry-run/structured-output-schemas.json'), {
      PassageSourceProposalV2: createSourceProviderJsonSchema(PassageSourceProposalV2Schema),
      SourceAuditV2: createSourceProviderJsonSchema(SourceAuditV2Schema),
      PassageUnitRepairProposalV2: createSourceProviderJsonSchema(PassageUnitRepairProposalV2Schema),
    }),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: 'PASSAGE_SOURCE_V2_DRY_RUN_GATE_PASSED', planHash: first.planHash,
    sourceUnitCount: registry.units.length, auditChunkCount: first.chunks.length,
    minimumCalls: GENERATION_COUNT + MEDIUM_AUDIT_COUNT, maximumCalls: MAX_CALLS,
    costProjection: first.costProjection, paidApiCallsMade: 0,
  }, null, 2)}\n`);
  if (!process.argv.includes('--execute')) return;
  if (option('--approval-id') !== APPROVAL_ID) {
    throw new Error(`통합 승인 실행에는 --approval-id=${APPROVAL_ID}가 필요하다.`);
  }
  const executionId = `${first.planHash.slice('sha256:'.length, 19)}-${new Date().toISOString()
    .replaceAll(':', '').replaceAll('.', '')}`;
  activeExecutionRoot = resolve(outputRoot, 'paid-runs', executionId);
  await writeJson(resolve(activeExecutionRoot, 'approved-plan.json'), {
    approvalId: APPROVAL_ID, planHash: first.planHash, approvalPlan: first.plan,
    dryRunGatePassed: true,
  });
  await execute({
    packet, registry, chunks: first.chunks, outputRoot: activeExecutionRoot,
    planHash: first.planHash, priorPaidCostUsd: first.historical.totalUsd,
  });
}

try {
  await main();
} catch (error) {
  if (error instanceof SourceV2ApiOutputValidationError) {
    const root = activeExecutionRoot ?? resolve(option('--output-root') ?? OUTPUT_ROOT);
    const failureRoot = resolve(root, `failures/${error.metadata.responseId}`);
    await mkdir(failureRoot, { recursive: true });
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
