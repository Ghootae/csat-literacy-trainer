import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from '../problem-solving/source-bundle.js';
import {
  SourceAuditV2Schema,
  buildSourceUnitRegistry,
  validateSourceUnitRegistryAgainstPacket,
  type SourceUnitRegistry,
} from '../problem-solving/source-bundle-v2.js';
import { createSourceProviderJsonSchema } from '../problem-solving/source-bundle-runtime.js';
import {
  PassageSourceBundleV2Schema,
  PassageSourceProposalV2Schema,
  PassageUnitRepairV2Schema,
  PassageUnitRepairProposalV2Schema,
  buildPassageAuditChunks,
  validatePassageSourceBundleV2AgainstInputs,
  type PassageSourceBundleV2,
} from '../problem-solving/passage-source-v2.js';
import {
  buildPassageAuditInputV2,
  buildPassageGenerationInputV2,
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
  assertNoSourceV2InputLeak,
  estimateSourceV2PreflightCost,
} from '../problem-solving/source-bundle-v2-runtime.js';

const DEFAULT_ARTIFACT_ROOT = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts',
);
const DEFAULT_OUTPUT_ROOT = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-passage',
);
const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');
const PLAN_VERSION = 'lens-passage-source-v2-dry-run-plan-v1';
const RUNNER_VERSION = 'lens-passage-source-v2-preparation-v1';
const GENERATION_COUNT = 3;
const MAX_UNITS_PER_AUDIT_CHUNK = 10;

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256Bytes(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function syntheticPassageArtifact(
  packet: SourcePacket,
  registry: SourceUnitRegistry,
): PassageSourceBundleV2 {
  const units = registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT');
  return validatePassageSourceBundleV2AgainstInputs({
    sourcePacket: packet,
    registry,
    artifact: {
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
          claimId: `${unit.sourceUnitId}-C1`,
          sourceUnitId: unit.sourceUnitId,
          normalizedClaim: unit.rawText,
          polarity: 'POSITIVE',
          modality: 'ASSERTED',
          qualifiers: [],
          evidenceFragments: [unit.rawText],
        })),
        entities: [],
        quantities: [],
        relations: [],
        visualCandidates: [],
        mediaAssessment: {
          hasMedia: packet.media.length > 0,
          visualRelevant: false,
          visualRequiredForSourceUnderstanding: false,
          visualRequiredForSolving: 'UNASSESSED',
          reason: 'dry-run의 구조와 비용을 계산하기 위한 텍스트 전용 합성 후보다.',
        },
        unresolved: [],
      },
      unitCoverage: units.map((unit) => ({
        sourceUnitId: unit.sourceUnitId,
        claimIds: [`${unit.sourceUnitId}-C1`],
        relationIds: [],
        disposition: 'CLAIMS_EXTRACTED',
        mediaGroundingStatus: packet.media.length === 0 ? 'NOT_APPLICABLE' : 'PENDING',
        reason: 'dry-run 구조 투영용 claim',
      })),
    },
  });
}

interface PlannedCall {
  readonly callNumber: number;
  readonly stage: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: string;
  readonly outputSchema: 'PassageSourceBundleV2' | 'SourceAuditV2';
  readonly maxOutputTokens: number;
  readonly conditional: boolean;
  readonly condition: string | null;
  readonly sourceUnitIds: readonly string[];
  readonly projectionInput: unknown;
}

async function main(): Promise<void> {
  if (process.argv.includes('--execute')) {
    throw new Error('이번 승인 범위는 dry-run까지다. 유료 실행 경로는 의도적으로 닫혀 있다.');
  }
  const artifactRoot = resolve(option('--artifact-root') ?? DEFAULT_ARTIFACT_ROOT);
  const outputRoot = resolve(option('--output-root') ?? DEFAULT_OUTPUT_ROOT);
  const packet = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/passage-source-packet.json'),
    'utf8',
  )));
  if (packet.scope !== 'PASSAGE') throw new Error('볼록렌즈 PASSAGE packet이 아니다.');
  const registry = buildSourceUnitRegistry(packet);
  validateSourceUnitRegistryAgainstPacket({ registry, sourcePacket: packet });
  const chunks = buildPassageAuditChunks(registry, MAX_UNITS_PER_AUDIT_CHUNK);
  const synthetic = syntheticPassageArtifact(packet, registry);
  const calls: PlannedCall[] = [];
  for (let run = 1; run <= GENERATION_COUNT; run++) {
    calls.push({
      callNumber: calls.length + 1,
      stage: `PASSAGE_GENERATE_${run}`,
      effort: 'medium',
      promptVersion: PASSAGE_SOURCE_PROMPT_V2,
      outputSchema: 'PassageSourceBundleV2',
      maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_GENERATE,
      conditional: false,
      condition: null,
      sourceUnitIds: registry.units.map((unit) => unit.sourceUnitId),
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
        outputSchema: 'SourceAuditV2',
        maxOutputTokens: effort === 'medium'
          ? SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_MEDIUM
          : SOURCE_V2_MAX_OUTPUT_TOKENS.PASSAGE_COMPARE_HIGH,
        conditional: effort === 'high',
        condition: effort === 'high'
          ? '이 chunk에 고위험 의미 서명 또는 생성 후보 간 의미 충돌이 있음'
          : null,
        sourceUnitIds: chunk.sourceUnitIds,
        projectionInput: buildPassageAuditInputV2({
          packet,
          registry,
          candidate: synthetic,
          peerReadings: [structuredClone(synthetic), structuredClone(synthetic)],
          chunk,
          auditId: `DRY-${effort.toUpperCase()}-${chunk.chunkId}`,
          effort,
        }),
      });
    }
  }
  calls.forEach((call) => assertNoSourceV2InputLeak(call.projectionInput));

  const promptVersions = [
    PASSAGE_SOURCE_PROMPT_V2,
    PASSAGE_COMPARE_PROMPT_V2,
    PASSAGE_REPAIR_PROMPT_V2,
  ];
  const promptLocks = [];
  const promptBytes = new Map<string, number>();
  for (const promptVersion of promptVersions) {
    const bytes = await readFile(resolve(PROMPT_ROOT, `${promptVersion}.md`));
    promptLocks.push({ promptVersion, sha256: sha256Bytes(bytes), bytes: bytes.length });
    promptBytes.set(promptVersion, bytes.length);
  }
  const preflights = calls.map((call) => estimateSourceV2PreflightCost({
    input: call.projectionInput,
    promptBytes: promptBytes.get(call.promptVersion) ?? 0,
    imageCount: 0,
    maxOutputTokens: call.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: 0,
    budgetCeilingUsd: Number.MAX_SAFE_INTEGER,
  }));
  const minimumCalls = calls.filter((call) => !call.conditional);
  const maximumCalls = calls;
  const sumCost = (selected: readonly PlannedCall[]) => Number(selected.reduce((sum, call) => {
    const index = calls.indexOf(call);
    return sum + preflights[index]!.maximumCallCostUsd;
  }, 0).toFixed(6));
  const sumOutput = (selected: readonly PlannedCall[]) => selected.reduce(
    (sum, call) => sum + call.maxOutputTokens,
    0,
  );
  const schemaLocks = [
    ['PassageSourceProposalV2', createSourceProviderJsonSchema(PassageSourceProposalV2Schema)],
    ['SourceAuditV2', createSourceProviderJsonSchema(SourceAuditV2Schema)],
    ['PassageUnitRepairProposalV2', createSourceProviderJsonSchema(PassageUnitRepairProposalV2Schema)],
  ].map(([name, schema]) => ({ name, schemaHash: sourceArtifactHash(schema), schema }));
  const approvalCandidate = {
    planVersion: PLAN_VERSION,
    runnerVersion: RUNNER_VERSION,
    paidExecutionEnabled: false,
    model: SOURCE_V2_MODEL,
    serviceTier: SOURCE_V2_SERVICE_TIER,
    automaticRetries: 0,
    store: false,
    previousResponseId: null,
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    sourceUnitCount: registry.units.length,
    auditChunks: chunks,
    promptLocks,
    schemaLocks: schemaLocks.map(({ schema: _schema, ...lock }) => lock),
    callGraph: calls.map(({ projectionInput: _projectionInput, ...call }) => call),
    repairPolicy: {
      automaticRepairCallsInThisPlan: 0,
      implementationPrepared: true,
      unitOnly: true,
      entityAndQuantityRegistryImmutable: true,
      newApprovalRequiredBeforeRepairApiCall: true,
    },
    costPolicy: {
      calculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
      pricingUsdPerMillion: SOURCE_V2_PRICING_USD_PER_MILLION,
      projectionBasis: 'SYNTHETIC_ONE_CLAIM_PER_SOURCE_UNIT',
      actualDynamicPreflightRequired: true,
      approvalBudgetCeilingUsd: null,
    },
  };
  const candidatePlanHash = sourceArtifactHash(approvalCandidate);
  const costProjection = {
    projectionOnlyNotAnApprovalCeiling: true,
    minimumCalls: minimumCalls.length,
    maximumCalls: maximumCalls.length,
    minimumOutputTokenCeiling: sumOutput(minimumCalls),
    maximumOutputTokenCeiling: sumOutput(maximumCalls),
    minimumProjectedCostUsd: sumCost(minimumCalls),
    maximumProjectedCostUsd: sumCost(maximumCalls),
    explanation: [
      '최소는 Medium 생성 3회와 Medium 문단 감사 4회다.',
      '최대는 네 문단 모두 고위험 또는 충돌로 분류되어 High 감사 4회가 추가되는 경우다.',
      '감사 입력은 실제 세 생성 결과에 따라 달라지므로 유료 승인 전 실제 byte 상한을 다시 고정한다.',
      '부분 수리 API는 이 계획에 포함하지 않는다.',
    ],
  };
  const inputProjectionAudit = {
    passed: true,
    sourcePacketScope: packet.scope,
    passageTextIncluded: true,
    imageBytesIncluded: false,
    itemStemIncluded: false,
    scenarioIncluded: false,
    choicesIncluded: false,
    answerKeyIncluded: false,
    officialExplanationIncluded: false,
    existingGoldIncluded: false,
    derivedRelationGenerationAllowed: false,
    sourceUnitCoverageRequired: true,
    auditCoverageBasis: 'FIXED_SOURCE_UNIT',
    mediumAndHighAuditIndependent: true,
  };

  await Promise.all([
    writeJson(resolve(outputRoot, 'dry-run/source-unit-registry.json'), registry),
    writeJson(resolve(outputRoot, 'dry-run/structured-output-schemas.json'), Object.fromEntries(
      schemaLocks.map(({ name, schema }) => [name, schema]),
    )),
    writeJson(resolve(outputRoot, 'dry-run/input-projection-audit.json'), inputProjectionAudit),
    writeJson(resolve(outputRoot, 'dry-run/approval-candidate.json'), {
      status: 'DRAFT_NOT_APPROVED_FOR_PAID_EXECUTION',
      candidatePlanHash,
      approvalId: null,
      approvalCandidate,
      costProjection,
    }),
    writeJson(resolve(outputRoot, 'dry-run/execution-plan.json'), {
      status: 'DRY_RUN_NO_API_CALLS',
      candidatePlanHash,
      calls: calls.map((call, index) => ({
        ...call,
        projectionInput: undefined,
        projectionInputHash: sourceArtifactHash(call.projectionInput),
        projectionInputBytes: Buffer.byteLength(JSON.stringify(call.projectionInput), 'utf8'),
        projectedPreflight: preflights[index],
      })),
      costProjection,
      paidExecutionEnabled: false,
    }),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: 'PASSAGE_SOURCE_V2_DRY_RUN_COMPLETE',
    outputRoot,
    sourceUnitCount: registry.units.length,
    auditChunkCount: chunks.length,
    minimumCalls: minimumCalls.length,
    maximumCalls: maximumCalls.length,
    candidatePlanHash,
    costProjection,
    paidApiCallsMade: 0,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
