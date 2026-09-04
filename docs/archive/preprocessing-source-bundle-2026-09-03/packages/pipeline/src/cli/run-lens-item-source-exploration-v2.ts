import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from '../problem-solving/source-bundle.js';
import {
  SourceAuditV2Schema,
  SourceBundleV2Schema,
  buildSourceUnitRegistry,
  validateSourceBundleV2AgainstInputs,
  validateSourceUnitRegistryAgainstPacket,
  type SourceBundleV2,
  type SourceUnitRegistry,
} from '../problem-solving/source-bundle-v2.js';
import { createSourceProviderJsonSchema } from '../problem-solving/source-bundle-runtime.js';
import {
  ITEM_SOURCE_PROMPT_V2,
  SOURCE_COMPARE_PROMPT_V2,
  SOURCE_INDEPENDENT_PROMPT_V2,
  SOURCE_V2_MAX_OUTPUT_TOKENS,
  SOURCE_V2_MODEL,
  SOURCE_V2_COST_CALCULATOR_VERSION,
  SOURCE_V2_PRICING_USD_PER_MILLION,
  SOURCE_V2_SERVICE_TIER,
  SourceV2ApiOutputValidationError,
  assertNoSourceV2InputLeak,
  buildComparisonAuditInputV2,
  buildIndependentReadingInputV2,
  buildItemGenerationInputV2,
  compareItemSourceBundleV2,
  estimateSourceV2PreflightCost,
  generateItemSourceBundleV2,
  readItemSourceIndependentlyV2,
  sourceV2CallCostUsd,
  type SourceV2ApiCall,
  type SourceV2CallControl,
} from '../problem-solving/source-bundle-v2-runtime.js';
import {
  classifyLensRatioOrientationV2,
  createLensRatioDirectionContrastV2,
  mediumHighTargetAgreementV2,
  scoreLensItemCoreV2,
  scoreLensMutationAuditV2,
  scoreNormalAuditEligibilityV2,
} from '../problem-solving/source-bundle-v2-experiment.js';

const ARTIFACT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts');
const OUTPUT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/v2-item-exploration');
const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');
const PRIOR_PAID_METADATA_PATH = resolve(
  OUTPUT_ROOT,
  'failures/resp_0337a5f0bfd543a0016a99508c0a7487d0ba974305a089bde0/metadata.json',
);
const APPROVAL_ID_PREFIX = 'lens-item-source-v2-api-run-2026-09-03';
const PLAN_VERSION = 'lens-item-source-v2-paid-plan-v2';
const RUNNER_VERSION = 'lens-item-source-v2-runner-v2';
const MAX_CALLS = 7;
const BUDGET_CEILING_USD = 2;
let activeExecutionRoot: string | null = null;

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

async function validateMedia(packet: SourcePacket): Promise<void> {
  for (const media of packet.media) {
    const bytes = await readFile(resolve(media.localPath));
    if (sha256Bytes(bytes) !== media.contentHash) throw new Error(`${media.mediaId} 이미지 hash 불일치`);
  }
}

function dryRunCandidate(packet: SourcePacket, registry: SourceUnitRegistry): SourceBundleV2 {
  const sourceSentence = registry.units.find((unit) => unit.sourceUnitId === 'I1-S5')?.rawText;
  if (sourceSentence === null || sourceSentence === undefined) throw new Error('I1-S5 원문이 없다.');
  return SourceBundleV2Schema.parse({
    bundleVersion: 'problem-source-bundle-v2',
    scope: 'ITEM',
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    offsetFieldsProducedByModel: false,
    itemDirectives: registry.units.filter((unit) => unit.unitRole === 'ITEM_DIRECTIVE').map((unit) => ({
      sourceUnitId: unit.sourceUnitId,
      unitRole: 'ITEM_DIRECTIVE',
      claimExtractionPolicy: 'EXCLUDE',
      questionPolarity: unit.questionPolarity,
    })),
    claims: [
      {
        claimId: 'I1-S5-C1', sourceUnitId: 'I1-S5',
        normalizedClaim: 'distance(P0,optical_axis) = 2 × distance(P1,optical_axis)',
        polarity: 'POSITIVE', modality: 'ASSERTED', qualifiers: [],
        evidenceFragments: [sourceSentence],
      },
      {
        claimId: 'I1-S5-C2', sourceUnitId: 'I1-S5',
        normalizedClaim: 'distance(P0,optical_axis) = 0.5 × distance(P2,optical_axis)',
        polarity: 'POSITIVE', modality: 'ASSERTED', qualifiers: [],
        evidenceFragments: [sourceSentence],
      },
    ],
    entities: [
      ['E_P0', 'P0'], ['E_P1', 'P1'], ['E_P2', 'P2'], ['E_OPTICAL_AXIS', '광축'],
    ].map(([entityId, label]) => ({
      entityId,
      canonicalLabel: label,
      surfaceForms: [label],
      definitionSourceUnitId: 'I1-S5',
      definitionFragment: sourceSentence,
      mergeBasis: 'EXPLICIT_IDENTITY',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    })),
    quantities: [
      ['Q_DISTANCE_P0_AXIS', 'E_P0'],
      ['Q_DISTANCE_P1_AXIS', 'E_P1'],
      ['Q_DISTANCE_P2_AXIS', 'E_P2'],
    ].map(([quantityId, subjectEntityId]) => ({
      quantityId,
      quantityKind: 'DISTANCE',
      subjectEntityId,
      referenceEntityId: 'E_OPTICAL_AXIS',
      qualifiers: [],
    })),
    relations: [
      {
        relationId: 'R1', sourceUnitId: 'I1-S5', relationFamily: 'RATIO',
        claimIds: ['I1-S5-C1'], leftQuantityId: 'Q_DISTANCE_P0_AXIS', operator: '=',
        coefficient: 2, rightQuantityId: 'Q_DISTANCE_P1_AXIS',
        interpretationRule: 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT',
      },
      {
        relationId: 'R2', sourceUnitId: 'I1-S5', relationFamily: 'RATIO',
        claimIds: ['I1-S5-C2'], leftQuantityId: 'Q_DISTANCE_P0_AXIS', operator: '=',
        coefficient: 0.5, rightQuantityId: 'Q_DISTANCE_P2_AXIS',
        interpretationRule: 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT',
      },
    ],
    visualCandidates: [{
      candidateId: 'FIG1-V1', parentFigureUnitId: 'FIG1', candidateType: 'LABEL', label: 'P0',
      region: null, precision: 'EXACT', evidenceDescription: 'dry-run 구조 검사용 시각 후보',
      status: 'CANDIDATE',
    }],
    mediaAssessment: {
      hasMedia: true,
      visualRelevant: true,
      visualRequiredForSourceUnderstanding: false,
      visualRequiredForSolving: 'UNASSESSED',
      reason: '그림은 거리 순서의 보조 확인에 사용하고 정확한 배율은 텍스트에서 읽는다.',
    },
    unresolved: [],
  });
}

interface PlannedCall {
  readonly callNumber: number;
  readonly stage: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: string;
  readonly outputSchema: 'SourceBundleV2' | 'SourceAuditV2';
  readonly maxOutputTokens: number;
  readonly dependsOn: readonly number[];
  readonly inputKind: 'FIXED' | 'DYNAMIC_FROM_PRIOR_OUTPUT';
  readonly projectionInput: unknown;
}

async function buildDryRunPlan(packet: SourcePacket, registry: SourceUnitRegistry): Promise<{
  readonly calls: PlannedCall[];
  readonly costGuard: unknown;
  readonly approvalPlan: unknown;
  readonly planHash: string;
  readonly approvalId: string;
  readonly priorPaidCostUsd: number;
}> {
  const candidate = validateSourceBundleV2AgainstInputs({
    bundle: dryRunCandidate(packet, registry), sourcePacket: packet, registry,
  });
  const priorPaidMetadataBytes = await readFile(PRIOR_PAID_METADATA_PATH);
  const priorPaidMetadata = JSON.parse(priorPaidMetadataBytes.toString('utf8')) as unknown;
  const priorPaidCostUsd = sourceV2CallCostUsd(priorPaidMetadata);
  const contrast = createLensRatioDirectionContrastV2(candidate);
  const generationInput = buildItemGenerationInputV2({ packet, registry });
  const independentInput = buildIndependentReadingInputV2({ packet, registry });
  const compare = (artifact: SourceBundleV2, auditId: string, effort: 'medium' | 'high') => (
    buildComparisonAuditInputV2({
      packet,
      registry,
      independentReading: candidate,
      candidate: artifact,
      auditId,
      effort,
    })
  );
  const calls: PlannedCall[] = [
    { callNumber: 1, stage: 'ITEM_GENERATE', effort: 'medium', promptVersion: ITEM_SOURCE_PROMPT_V2,
      outputSchema: 'SourceBundleV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_GENERATE,
      dependsOn: [], inputKind: 'FIXED', projectionInput: generationInput },
    { callNumber: 2, stage: 'MEDIUM_INDEPENDENT_READ', effort: 'medium', promptVersion: SOURCE_INDEPENDENT_PROMPT_V2,
      outputSchema: 'SourceBundleV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_INDEPENDENT_READ,
      dependsOn: [], inputKind: 'FIXED', projectionInput: independentInput },
    { callNumber: 3, stage: 'MEDIUM_GENERATED_CANDIDATE_COMPARE', effort: 'medium', promptVersion: SOURCE_COMPARE_PROMPT_V2,
      outputSchema: 'SourceAuditV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_COMPARE, dependsOn: [1, 2],
      inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: compare(candidate, 'AUDIT-MEDIUM-01', 'medium') },
    { callNumber: 4, stage: 'HIGH_INDEPENDENT_READ', effort: 'high', promptVersion: SOURCE_INDEPENDENT_PROMPT_V2,
      outputSchema: 'SourceBundleV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_INDEPENDENT_READ,
      dependsOn: [], inputKind: 'FIXED', projectionInput: independentInput },
    { callNumber: 5, stage: 'HIGH_GENERATED_CANDIDATE_COMPARE', effort: 'high', promptVersion: SOURCE_COMPARE_PROMPT_V2,
      outputSchema: 'SourceAuditV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_COMPARE, dependsOn: [1, 4],
      inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: compare(candidate, 'AUDIT-HIGH-01', 'high') },
    { callNumber: 6, stage: 'MEDIUM_CONTRAST_CANDIDATE_COMPARE', effort: 'medium', promptVersion: SOURCE_COMPARE_PROMPT_V2,
      outputSchema: 'SourceAuditV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_COMPARE, dependsOn: [1, 2],
      inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: compare(contrast.candidate, 'AUDIT-MEDIUM-02', 'medium') },
    { callNumber: 7, stage: 'HIGH_CONTRAST_CANDIDATE_COMPARE', effort: 'high', promptVersion: SOURCE_COMPARE_PROMPT_V2,
      outputSchema: 'SourceAuditV2', maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_COMPARE, dependsOn: [1, 4],
      inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: compare(contrast.candidate, 'AUDIT-HIGH-02', 'high') },
  ];
  if (calls.length !== MAX_CALLS || calls.some((call, index) => call.callNumber !== index + 1)) {
    throw new Error('정상 완주 API 계획은 정확히 7회여야 한다.');
  }
  calls.forEach((call) => assertNoSourceV2InputLeak(call.projectionInput));
  const promptVersions = [ITEM_SOURCE_PROMPT_V2, SOURCE_INDEPENDENT_PROMPT_V2, SOURCE_COMPARE_PROMPT_V2];
  const promptBytes = new Map<string, number>();
  const promptLocks = [];
  for (const promptVersion of promptVersions) {
    const bytes = await readFile(resolve(PROMPT_ROOT, `${promptVersion}.md`));
    promptBytes.set(promptVersion, bytes.length);
    promptLocks.push({ promptVersion, sha256: sha256Bytes(bytes), bytes: bytes.length });
  }
  const projectedPreflights = calls.map((call) => estimateSourceV2PreflightCost({
    input: call.projectionInput,
    promptBytes: promptBytes.get(call.promptVersion) ?? 0,
    imageCount: packet.media.length,
    maxOutputTokens: call.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: 0,
    budgetCeilingUsd: BUDGET_CEILING_USD,
  }));
  const projectedInputTokenCeiling = projectedPreflights.reduce(
    (sum, preflight) => sum + preflight.conservativeInputTokenCeiling,
    0,
  );
  const outputTokenCeiling = calls.reduce((sum, call) => sum + call.maxOutputTokens, 0);
  const projectedPlanningCostUsd = Number(projectedPreflights.reduce(
    (sum, preflight) => sum + preflight.maximumCallCostUsd,
    0,
  ).toFixed(6));
  const projectedExperimentTotalCostUsd = Number((priorPaidCostUsd + projectedPlanningCostUsd).toFixed(6));
  if (projectedExperimentTotalCostUsd > BUDGET_CEILING_USD) {
    throw new Error(`기존 비용을 포함한 예상 비용 ${projectedExperimentTotalCostUsd}가 승인 예산을 넘는다.`);
  }
  const schemaLocks = [
    ['SourceBundleV2', createSourceProviderJsonSchema(SourceBundleV2Schema)],
    ['SourceAuditV2', createSourceProviderJsonSchema(SourceAuditV2Schema)],
  ].map(([name, schema]) => ({ name, sha256: sourceArtifactHash(schema) }));
  const runnerModulePath = fileURLToPath(import.meta.url);
  const runnerModuleRoot = dirname(runnerModulePath);
  const executionArtifactPaths = [
    ['cli', runnerModulePath],
    ['source-bundle-v2-runtime', resolve(runnerModuleRoot, '../problem-solving/source-bundle-v2-runtime.js')],
    ['source-bundle-v2-experiment', resolve(runnerModuleRoot, '../problem-solving/source-bundle-v2-experiment.js')],
    ['source-bundle-v2', resolve(runnerModuleRoot, '../problem-solving/source-bundle-v2.js')],
    ['source-bundle-runtime', resolve(runnerModuleRoot, '../problem-solving/source-bundle-runtime.js')],
    ['source-bundle', resolve(runnerModuleRoot, '../problem-solving/source-bundle.js')],
  ] as const;
  const executionArtifactLocks = await Promise.all(executionArtifactPaths.map(async ([name, path]) => {
    const bytes = await readFile(path);
    return { name, sha256: sha256Bytes(bytes), bytes: bytes.length };
  }));
  const approvalPlan = {
    planVersion: PLAN_VERSION,
    runnerVersion: RUNNER_VERSION,
    executionArtifactLocks,
    model: SOURCE_V2_MODEL,
    serviceTier: SOURCE_V2_SERVICE_TIER,
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    mediaHashes: packet.media.map((media) => ({ mediaId: media.mediaId, contentHash: media.contentHash })),
    promptLocks,
    schemaLocks,
    conditionalCallGraph: calls.map((call) => ({
      callNumber: call.callNumber,
      stage: call.stage,
      effort: call.effort,
      promptVersion: call.promptVersion,
      outputSchema: call.outputSchema,
      maxOutputTokens: call.maxOutputTokens,
      dependsOn: call.dependsOn,
      inputKind: call.inputKind,
    })),
    branchPolicy: {
      generatedNormal: 'AUDIT_GENERATED_THEN_REVERSED_CONTRAST',
      generatedReversed: 'AUDIT_GENERATED_THEN_NORMAL_CONTRAST',
      generatedOther: 'AUDIT_GENERATED_THEN_FIXED_NORMAL_CONTROL',
      semanticFailureDoesNotStopAudits: true,
    },
    costPolicy: {
      costCalculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
      pricingUsdPerMillion: SOURCE_V2_PRICING_USD_PER_MILLION,
      approvalBudgetCeilingUsd: BUDGET_CEILING_USD,
      priorPaidCost: {
        metadataHash: sha256Bytes(priorPaidMetadataBytes),
        costUsd: priorPaidCostUsd,
      },
      maximumCalls: MAX_CALLS,
      automaticRetries: 0,
      preflightRequiredBeforeEveryCall: true,
    },
  };
  const planHash = sourceArtifactHash(approvalPlan);
  const approvalId = `${APPROVAL_ID_PREFIX}:${planHash}`;
  return {
    calls,
    approvalPlan,
    planHash,
    approvalId,
    priorPaidCostUsd,
    costGuard: {
      costCalculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
      pricingUsdPerMillion: SOURCE_V2_PRICING_USD_PER_MILLION,
      inputTokenEstimation: 'ACTUAL_JSON_UTF8_BYTES_PLUS_PROMPT_BYTES_PLUS_10000_PER_IMAGE',
      projectionUsesSyntheticPriorOutputs: true,
      projectedInputTokenCeiling,
      outputTokenCeiling,
      projectedPlanningCostUsd,
      priorPaidCostUsd,
      projectedExperimentTotalCostUsd,
      approvalBudgetCeilingUsd: BUDGET_CEILING_USD,
      maximumCalls: MAX_CALLS,
      automaticRetries: 0,
      preflightUsesActualDynamicInput: true,
    },
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

async function execute(
  packet: SourcePacket,
  registry: SourceUnitRegistry,
  outputRoot: string,
  approvalPlanHash: string,
  priorPaidCostUsd: number,
): Promise<void> {
  const calls: SourceV2ApiCall<unknown>[] = [];
  const remember = async <T>(options: {
    readonly stage: string;
    readonly conditionBranch: string;
    readonly dependencyArtifactHashes: readonly string[];
    readonly run: (control: SourceV2CallControl) => Promise<SourceV2ApiCall<T>>;
  }) => {
    if (calls.length >= MAX_CALLS) throw new Error('승인된 최대 7회를 초과할 수 없다.');
    const cumulativeActualCostUsdBeforeCall = priorPaidCostUsd + calls.reduce(
      (sum, entry) => sum + sourceV2CallCostUsd(entry.metadata),
      0,
    );
    const callNumber = calls.length + 1;
    const callRoot = resolve(
      outputRoot,
      `runs/${String(callNumber).padStart(2, '0')}-${options.stage}`,
    );
    const call = await options.run({
      approvalPlanHash,
      cumulativeActualCostUsdBeforeCall,
      budgetCeilingUsd: BUDGET_CEILING_USD,
      conditionBranch: options.conditionBranch,
      dependencyArtifactHashes: options.dependencyArtifactHashes,
      recordPreflight: (record) => writeJson(resolve(callRoot, 'preflight.json'), record),
    });
    calls.push(call as SourceV2ApiCall<unknown>);
    await persistCall(callRoot, call);
    const cost = calls.reduce((sum, entry) => sum + sourceV2CallCostUsd(entry.metadata), 0);
    if (priorPaidCostUsd + cost > BUDGET_CEILING_USD) {
      throw new Error('기존 호출을 포함한 실제 누적 비용이 $2 안전 상한을 넘었다.');
    }
    return call;
  };

  const generated = await remember({
    stage: 'item-generate', conditionBranch: 'INITIAL_GENERATION', dependencyArtifactHashes: [],
    run: (callControl) => generateItemSourceBundleV2({ packet, registry, callControl }),
  });
  const generatedCore = scoreLensItemCoreV2(generated.parsedOutput);
  const generatedOrientation = classifyLensRatioOrientationV2(generated.parsedOutput);
  let contrastCandidate: SourceBundleV2;
  let contrastManifest: unknown;
  if (generatedOrientation.orientation === 'OTHER') {
    contrastCandidate = validateSourceBundleV2AgainstInputs({
      bundle: dryRunCandidate(packet, registry), sourcePacket: packet, registry,
    });
    contrastManifest = {
      privateControlKind: 'FIXED_NORMAL_CONTROL_AFTER_OTHER_GENERATION',
      generatedArtifactHash: sourceArtifactHash(generated.parsedOutput),
      controlArtifactHash: sourceArtifactHash(contrastCandidate),
      apiCandidateLabel: 'CANDIDATE_A',
      controlKindExposedToApi: false,
    };
  } else {
    const contrast = createLensRatioDirectionContrastV2(generated.parsedOutput);
    contrastCandidate = contrast.candidate;
    contrastManifest = contrast.privateManifest;
  }
  await Promise.all([
    writeJson(resolve(outputRoot, 'quarantined/private-contrast-manifest.json'), contrastManifest),
    writeJson(resolve(outputRoot, 'candidates/generated-candidate.json'), generated.parsedOutput),
    writeJson(resolve(outputRoot, 'candidates/contrast-candidate.json'), contrastCandidate),
  ]);

  const generatedHash = sourceArtifactHash(generated.parsedOutput);
  const contrastHash = sourceArtifactHash(contrastCandidate);
  const branch = `GENERATED_${generatedOrientation.orientation}`;
  const mediumRead = await remember({
    stage: 'medium-independent', conditionBranch: branch, dependencyArtifactHashes: [],
    run: (callControl) => readItemSourceIndependentlyV2({
      packet, registry, effort: 'medium', callControl,
    }),
  });
  const mediumReadHash = sourceArtifactHash(mediumRead.parsedOutput);
  const mediumGeneratedAudit = await remember({
    stage: 'medium-generated-candidate', conditionBranch: branch,
    dependencyArtifactHashes: [generatedHash, mediumReadHash],
    run: (callControl) => compareItemSourceBundleV2({
      packet, registry, independentReading: mediumRead.parsedOutput,
      candidate: generated.parsedOutput, auditId: 'AUDIT-MEDIUM-01', effort: 'medium', callControl,
    }),
  });
  const highRead = await remember({
    stage: 'high-independent', conditionBranch: branch, dependencyArtifactHashes: [],
    run: (callControl) => readItemSourceIndependentlyV2({
      packet, registry, effort: 'high', callControl,
    }),
  });
  const highReadHash = sourceArtifactHash(highRead.parsedOutput);
  const highGeneratedAudit = await remember({
    stage: 'high-generated-candidate', conditionBranch: branch,
    dependencyArtifactHashes: [generatedHash, highReadHash],
    run: (callControl) => compareItemSourceBundleV2({
      packet, registry, independentReading: highRead.parsedOutput,
      candidate: generated.parsedOutput, auditId: 'AUDIT-HIGH-01', effort: 'high', callControl,
    }),
  });
  const mediumContrastAudit = await remember({
    stage: 'medium-contrast-candidate', conditionBranch: branch,
    dependencyArtifactHashes: [generatedHash, contrastHash, mediumReadHash],
    run: (callControl) => compareItemSourceBundleV2({
      packet, registry, independentReading: mediumRead.parsedOutput,
      candidate: contrastCandidate, auditId: 'AUDIT-MEDIUM-02', effort: 'medium', callControl,
    }),
  });
  const highContrastAudit = await remember({
    stage: 'high-contrast-candidate', conditionBranch: branch,
    dependencyArtifactHashes: [generatedHash, contrastHash, highReadHash],
    run: (callControl) => compareItemSourceBundleV2({
      packet, registry, independentReading: highRead.parsedOutput,
      candidate: contrastCandidate, auditId: 'AUDIT-HIGH-02', effort: 'high', callControl,
    }),
  });

  const contrastOrientation = classifyLensRatioOrientationV2(contrastCandidate);
  const auditScore = (audit: SourceV2ApiCall<unknown>, orientation: string) => ({
    orientation,
    eligibility: scoreNormalAuditEligibilityV2(audit.parsedOutput),
    directionRejection: orientation === 'REVERSED'
      ? scoreLensMutationAuditV2(audit.parsedOutput)
      : null,
  });

  const result = {
    status: 'ITEM_SOURCE_EXPLORATION_V2_COMPLETE',
    approvalPlanHash,
    apiCalls: calls.length,
    actualCostUsd: calls.reduce((sum, call) => sum + sourceV2CallCostUsd(call.metadata), 0),
    priorPaidCostUsd,
    experimentCumulativeCostUsd: priorPaidCostUsd + calls.reduce(
      (sum, call) => sum + sourceV2CallCostUsd(call.metadata),
      0,
    ),
    primary: {
      generation: { core: generatedCore, ratioOrientation: generatedOrientation },
      mediumIndependent: scoreLensItemCoreV2(mediumRead.parsedOutput),
      highIndependent: scoreLensItemCoreV2(highRead.parsedOutput),
      generatedCandidate: {
        medium: auditScore(mediumGeneratedAudit, generatedOrientation.orientation),
        high: auditScore(highGeneratedAudit, generatedOrientation.orientation),
      },
      contrastCandidate: {
        orientation: contrastOrientation,
        medium: auditScore(mediumContrastAudit, contrastOrientation.orientation),
        high: auditScore(highContrastAudit, contrastOrientation.orientation),
      },
    },
    secondary: {
      generatedCandidateAgreement: mediumHighTargetAgreementV2(
        mediumGeneratedAudit.parsedOutput, highGeneratedAudit.parsedOutput,
      ),
      contrastCandidateAgreement: mediumHighTargetAgreementV2(
        mediumContrastAudit.parsedOutput, highContrastAudit.parsedOutput,
      ),
    },
    productionEligible: false,
    productionEligibilityReason: 'EXPERIMENT_ONLY',
  };
  await writeJson(resolve(outputRoot, 'result.json'), result);
}

async function main(): Promise<void> {
  const artifactRoot = resolve(option('--artifact-root') ?? ARTIFACT_ROOT);
  const outputRoot = resolve(option('--output-root') ?? OUTPUT_ROOT);
  const packet = SourcePacketSchema.parse(JSON.parse(await readFile(
    resolve(artifactRoot, 'inputs/item-source-packet.json'), 'utf8',
  )));
  const registry = buildSourceUnitRegistry(packet);
  validateSourceUnitRegistryAgainstPacket({ registry, sourcePacket: packet });
  await validateMedia(packet);
  const dryRun = await buildDryRunPlan(packet, registry);
  await Promise.all([
    writeJson(resolve(outputRoot, 'dry-run/execution-plan.json'), {
      status: 'DRY_RUN_NO_API_CALLS',
      planHash: dryRun.planHash,
      approvalPlan: dryRun.approvalPlan,
      calls: dryRun.calls.map(({ projectionInput, ...call }) => ({
        ...call,
        projectionOnly: call.inputKind === 'DYNAMIC_FROM_PRIOR_OUTPUT',
        projectionInputHash: sourceArtifactHash(projectionInput),
        projectionInputBytes: Buffer.byteLength(JSON.stringify(projectionInput), 'utf8'),
        actualRequestHash: null,
        actualRequestHashTiming: 'IMMEDIATELY_BEFORE_EACH_API_CALL',
        imageAttached: packet.media.length > 0,
        serviceTier: SOURCE_V2_SERVICE_TIER,
        store: false,
        previousResponseId: null,
        automaticRetries: 0,
      })),
      costGuard: dryRun.costGuard,
      approval: { required: true, approvalId: dryRun.approvalId },
    }),
    writeJson(resolve(outputRoot, 'dry-run/approval-plan.json'), {
      planHash: dryRun.planHash,
      approvalId: dryRun.approvalId,
      apiKeyIncluded: false,
      approvalPlan: dryRun.approvalPlan,
    }),
    writeJson(resolve(outputRoot, 'dry-run/input-projection-audit.json'), {
      passed: true,
      answerKeyUsed: false,
      officialExplanationUsed: false,
      existingGoldUsed: false,
      contrastKindExposedToApi: false,
      sourcePacketHash: sourceArtifactHash(packet),
      sourceUnitRegistryHash: sourceArtifactHash(registry),
    }),
    writeJson(resolve(outputRoot, 'dry-run/source-unit-registry.json'), registry),
    writeJson(resolve(outputRoot, 'dry-run/structured-output-schemas.json'), {
      SourceBundleV2: createSourceProviderJsonSchema(SourceBundleV2Schema),
      SourceAuditV2: createSourceProviderJsonSchema(SourceAuditV2Schema),
    }),
  ]);
  if (!process.argv.includes('--execute')) {
    process.stdout.write(`${JSON.stringify({
      status: 'DRY_RUN_COMPLETE_NO_API_CALLS',
      outputRoot,
      plannedMaximumCalls: dryRun.calls.length,
      planHash: dryRun.planHash,
      approvalId: dryRun.approvalId,
      costGuard: dryRun.costGuard,
    }, null, 2)}\n`);
    return;
  }
  if (option('--approval-id') !== dryRun.approvalId) {
    throw new Error(`유료 실행에는 현재 계획 해시에 결합된 --approval-id=${dryRun.approvalId}가 필요하다.`);
  }
  const executionId = `${dryRun.planHash.slice('sha256:'.length, 19)}-${new Date().toISOString()
    .replaceAll(':', '').replaceAll('.', '')}`;
  activeExecutionRoot = resolve(outputRoot, 'paid-runs', executionId);
  await execute(packet, registry, activeExecutionRoot, dryRun.planHash, dryRun.priorPaidCostUsd);
}

try {
  await main();
} catch (error) {
  if (error instanceof SourceV2ApiOutputValidationError) {
    const outputRoot = activeExecutionRoot ?? resolve(option('--output-root') ?? OUTPUT_ROOT);
    const failureRoot = resolve(outputRoot, `failures/${error.metadata.responseId}`);
    await mkdir(failureRoot, { recursive: true });
    await Promise.all([
      writeFile(resolve(failureRoot, 'raw-output.txt'), `${error.rawOutputText}\n`, 'utf8'),
      writeJson(resolve(failureRoot, 'metadata.json'), error.metadata),
      writeJson(resolve(failureRoot, 'validation-error.json'), {
        name: error.name,
        message: error.message,
      }),
    ]);
  }
  throw error;
}
