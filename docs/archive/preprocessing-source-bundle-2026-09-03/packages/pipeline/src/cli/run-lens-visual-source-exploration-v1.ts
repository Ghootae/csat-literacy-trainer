import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from '../problem-solving/source-bundle.js';
import {
  buildSourceUnitRegistry,
  validateSourceUnitRegistryAgainstPacket,
  type SourceUnitRegistry,
} from '../problem-solving/source-bundle-v2.js';
import { createSourceProviderJsonSchema } from '../problem-solving/source-bundle-runtime.js';
import {
  LENS_VISUAL_REFERENCE_VERSION,
  LENS_VISUAL_TEXT_CONTEXT_VERSION,
  LensVisualAuditSchema,
  LensVisualEvaluationReferenceSchema,
  LensVisualObservationSchema,
  LensVisualTextContextSchema,
  scoreLensVisualObservation,
  type LensVisualAudit,
  type LensVisualEvaluationReference,
  type LensVisualObservation,
  type LensVisualTextContext,
} from '../problem-solving/visual-source-experiment.js';
import {
  LENS_VISUAL_AUDIT_PROMPT,
  LENS_VISUAL_COST_VERSION,
  LENS_VISUAL_GROUNDED_PROMPT,
  LENS_VISUAL_MAX_OUTPUT_TOKENS,
  LENS_VISUAL_MODEL,
  LENS_VISUAL_ONLY_PROMPT,
  LENS_VISUAL_PRICING_USD_PER_MILLION,
  LENS_VISUAL_SERVICE_TIER,
  LensVisualApiOutputValidationError,
  assertLensVisualOnlyIsolation,
  assertNoLensVisualInputLeak,
  auditLensVisualSources,
  buildLensTextGroundedVisualInput,
  buildLensVisualAuditInput,
  buildLensVisualOnlyInput,
  estimateLensVisualPreflightCost,
  lensVisualCallCostUsd,
  readLensVisualSource,
  type LensVisualApiCall,
  type LensVisualCallControl,
  type LensVisualCandidateSet,
} from '../problem-solving/visual-source-runtime.js';

const ARTIFACT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts');
const OUTPUT_ROOT = resolve('docs/experiments/problem-source-bundle-lens-2026-09-03/v2-visual-exploration');
const PRIOR_RESULT_PATH = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/v2-item-exploration/paid-runs/' +
  'c0fcf8e6e613-2026-09-03T111050881Z/result.json',
);
const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');
const APPROVAL_PREFIX = 'lens-visual-source-api-run-2026-09-03';
const PLAN_VERSION = 'lens-visual-source-paid-plan-v1';
const RUNNER_VERSION = 'lens-visual-source-runner-v1';
const MAX_CALLS = 6;
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
  if (packet.media.length !== 1) throw new Error('볼록렌즈 원본 그림은 정확히 하나여야 한다.');
  const media = packet.media[0]!;
  const bytes = await readFile(resolve(media.localPath));
  if (sha256Bytes(bytes) !== media.contentHash) throw new Error('볼록렌즈 이미지 hash가 다르다.');
}

function sourceUnit(registry: SourceUnitRegistry, sourceUnitId: string): string {
  const text = registry.units.find((unit) => unit.sourceUnitId === sourceUnitId)?.rawText;
  if (text === null || text === undefined) throw new Error(`${sourceUnitId} 원문이 없다.`);
  return text;
}

function buildTextContext(packet: SourcePacket, registry: SourceUnitRegistry): LensVisualTextContext {
  const entries: Array<[string, string, string, LensVisualTextContext['claims'][number]['relationFamily']]> = [
    ['TXT_A_CONTAINS', 'I1-S2', 'A는 광축과 주광선을 포함하는 평면이다.', 'TOPOLOGY'],
    ['TXT_B_PERPENDICULAR_A', 'I1-S2', 'B는 A와 수직인 평면이다.', 'PERPENDICULARITY'],
    ['TXT_B_CONTAINS_RAY', 'I1-S2', 'B는 주광선을 포함하는 평면이다.', 'TOPOLOGY'],
    ['TXT_C_D_SEGMENT_IMAGES', 'I1-S3', 'C와 D는 각각 A와 B 중 한 평면 위에 놓여 선분 형상으로 맺히는 상을 가리킨다.', 'SHAPE'],
    ['TXT_E_CIRCULAR_IMAGE', 'I1-S3', 'E는 원형을 띠는 상을 가리킨다.', 'SHAPE'],
    ['TXT_P0_P3_TRANSVERSE_AXES', 'I1-S4', 'P0, P1, P2, P3는 모두 광축과 수직인 축 위에 있다.', 'TOPOLOGY'],
    ['TXT_P4_ON_AXIS', 'I1-S4', 'P4는 광축 위에 있다.', 'TOPOLOGY'],
    ['TXT_P0_TWO_P1', 'I1-S5', 'P0에서 광축까지의 거리는 P1에서 광축까지의 거리의 두 배이다.', 'RATIO'],
    ['TXT_P0_HALF_P2', 'I1-S5', 'P0에서 광축까지의 거리는 P2에서 광축까지의 거리의 절반이다.', 'RATIO'],
    ['TXT_OBJECT_AT_P0', 'I1-S6', '현재 물체점은 P0에 놓여 있다.', 'LOCATION'],
    ['TXT_LENS_ROTATIONAL', 'I1-S7', '렌즈는 회전 대칭성을 지닌다.', 'CONDITION'],
    ['TXT_IGNORE_OTHER_FACTORS', 'I1-S7', '렌즈의 회전 대칭성 외의 요인은 고려하지 않는다.', 'CONDITION'],
  ];
  return LensVisualTextContextSchema.parse({
    contextVersion: LENS_VISUAL_TEXT_CONTEXT_VERSION,
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    artifactFrozen: true,
    usePolicy: 'VISUAL_EXPERIMENT_ONLY',
    excludes: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD'],
    claims: entries.map(([claimId, sourceUnitId, statement, relationFamily]) => ({
      claimId,
      sourceUnitId,
      statement,
      sourceQuote: sourceUnit(registry, sourceUnitId),
      relationFamily,
      reviewBasis: 'EXACT_SOURCE_TEXT_AND_PRIOR_SOURCE_AUDIT',
    })),
  });
}

function buildEvaluationReference(packet: SourcePacket): LensVisualEvaluationReference {
  const mediaHash = packet.media[0]?.contentHash;
  if (mediaHash === undefined) throw new Error('평가용 media hash가 없다.');
  return LensVisualEvaluationReferenceSchema.parse({
    referenceVersion: LENS_VISUAL_REFERENCE_VERSION,
    withheldFromAllApiCalls: true,
    mediaHash,
    requiredLabels: [
      'P0', 'P1', 'P2', 'P3', 'P4', 'A', 'B', 'C', 'D', 'E', '광축', '주광선', '볼록 렌즈',
    ],
    criticalFacts: [
      { factId: 'VF_C_SEGMENT', description: 'C 화살표가 선분 형태 표식을 가리킨다.' },
      { factId: 'VF_D_SEGMENT', description: 'D 화살표가 선분 형태 표식을 가리킨다.' },
      { factId: 'VF_E_CIRCLE', description: 'E 화살표가 원형 표식을 가리킨다.' },
      { factId: 'VF_P012_SAME_DRAWN_LINE', description: 'P0, P1, P2가 같은 세로선 위에 그려져 있다.' },
      { factId: 'VF_P3_NOT_SAME_DRAWN_LINE', description: 'P3는 P0, P1, P2와 같은 그려진 세로선 위에 있지 않다.' },
      { factId: 'VF_P4_ON_OPTICAL_AXIS', description: 'P4는 광축으로 표시된 선 위에 그려져 있다.' },
    ],
    prohibitedVisualAssertions: [
      { ruleId: 'NO_VISUAL_EXACT_RATIO', relationType: 'EXACT_DISTANCE_RATIO',
        description: '눈금 없는 그림에서 정확한 거리 배율을 확정하지 않는다.' },
      { ruleId: 'NO_VISUAL_3D_PERPENDICULAR', relationType: 'PERPENDICULAR_3D',
        description: '2차원 투영만으로 실제 3차원 수직을 확정하지 않는다.' },
      { ruleId: 'NO_VISUAL_PLANE_ASSIGNMENT', relationType: 'PLANE_ASSIGNMENT',
        description: '그림만으로 C와 D의 A/B 대응을 확정하지 않는다.' },
    ],
  });
}

function syntheticObservation(options: {
  readonly id: string;
  readonly mode: 'VISUAL_ONLY' | 'TEXT_GROUNDED';
  readonly packet: SourcePacket;
  readonly textContext: LensVisualTextContext;
}): LensVisualObservation {
  const labels = ['P0', 'P1', 'P2', 'P3', 'P4', 'A', 'B', 'C', 'D', 'E', '광축', '주광선', '볼록 렌즈'];
  const key = (label: string) => label.replaceAll(' ', '_').replaceAll('볼록_렌즈', 'LENS')
    .replaceAll('광축', 'AXIS').replaceAll('주광선', 'RAY');
  const objectTypes: Record<string, string> = {
    P0: 'POINT_MARK', P1: 'POINT_MARK', P2: 'POINT_MARK', P3: 'POINT_MARK', P4: 'POINT_MARK',
    A: 'PLANE_REGION', B: 'PLANE_REGION', C: 'LINE_SEGMENT_MARK', D: 'LINE_SEGMENT_MARK',
    E: 'CIRCULAR_MARK', 광축: 'AXIS_LINE', 주광선: 'RAY_LINE', '볼록 렌즈': 'LENS',
  };
  const textContextHash = options.mode === 'TEXT_GROUNDED' ? sourceArtifactHash(options.textContext) : null;
  return LensVisualObservationSchema.parse({
    observationVersion: 'lens-visual-observation-v1',
    observationId: options.id,
    mode: options.mode,
    mediaId: options.packet.media[0]!.mediaId,
    mediaHash: options.packet.media[0]!.contentHash,
    textContextHash,
    imageWasViewedAsWhole: true,
    croppedImageUsed: false,
    labels: labels.map((label) => ({
      candidateId: `LBL_${key(label)}`,
      labelText: label,
      linkedObjectId: `OBJ_${key(label)}`,
      evidenceDescription: `${label} 라벨을 그림에서 확인`,
      provenance: 'VISUAL_OBSERVATION',
      status: 'CANDIDATE',
    })),
    objects: labels.map((label) => ({
      candidateId: `OBJ_${key(label)}`,
      linkedLabelTexts: [label],
      objectType: objectTypes[label],
      appearanceDescription: `${label}에 연결된 시각 객체`,
      authority: 'EXACT_PIXEL_TOPOLOGY',
      provenance: 'VISUAL_OBSERVATION',
      status: 'CANDIDATE',
    })),
    visualRelations: [
      { candidateId: 'REL_P012_SAME', relationType: 'SAME_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P0', 'OBJ_P1', 'OBJ_P2'], objectObjectIds: [],
        description: 'P0, P1, P2가 같은 세로선 위에 그려짐', authority: 'EXACT_PIXEL_TOPOLOGY',
        scaleDependent: false, provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
      { candidateId: 'REL_P3_DIFFERENT', relationType: 'NOT_ON_SAME_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P3'], objectObjectIds: ['OBJ_P0', 'OBJ_P1', 'OBJ_P2'],
        description: 'P3는 P0, P1, P2와 같은 그려진 세로선 위가 아님', authority: 'EXACT_PIXEL_TOPOLOGY',
        scaleDependent: false, provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
      { candidateId: 'REL_P4_AXIS', relationType: 'ON_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P4'], objectObjectIds: ['OBJ_AXIS'],
        description: 'P4가 광축으로 표시된 선 위에 그려짐', authority: 'EXACT_PIXEL_TOPOLOGY',
        scaleDependent: false, provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
    ],
    crossModalInterpretations: options.mode === 'TEXT_GROUNDED' ? [
      { interpretationId: 'X_C_D_IMAGES', visualCandidateIds: ['OBJ_C', 'OBJ_D'],
        sourceTextClaimIds: ['TXT_C_D_SEGMENT_IMAGES'], statement: 'C와 D의 선분 표식은 선분 형상으로 맺힌 상이다.',
        provenance: 'CROSS_MODAL_INTERPRETATION', status: 'CANDIDATE' },
      { interpretationId: 'X_E_IMAGE', visualCandidateIds: ['OBJ_E'],
        sourceTextClaimIds: ['TXT_E_CIRCULAR_IMAGE'], statement: 'E의 원형 표식은 원형을 띠는 상이다.',
        provenance: 'CROSS_MODAL_INTERPRETATION', status: 'CANDIDATE' },
      { interpretationId: 'X_P4_AXIS', visualCandidateIds: ['REL_P4_AXIS'],
        sourceTextClaimIds: ['TXT_P4_ON_AXIS'], statement: '시각 배치와 텍스트 모두 P4가 광축 위임을 지지한다.',
        provenance: 'CROSS_MODAL_INTERPRETATION', status: 'CANDIDATE' },
    ] : [],
    unresolved: [],
  });
}

interface PlannedCall {
  readonly callNumber: number;
  readonly stage: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: typeof LENS_VISUAL_ONLY_PROMPT |
    typeof LENS_VISUAL_GROUNDED_PROMPT |
    typeof LENS_VISUAL_AUDIT_PROMPT;
  readonly outputSchema: 'LensVisualObservation' | 'LensVisualAudit';
  readonly maxOutputTokens: number;
  readonly dependsOn: readonly number[];
  readonly inputKind: 'FIXED' | 'DYNAMIC_FROM_PRIOR_OUTPUT';
  readonly projectionInput: unknown;
}

async function buildDryRun(packet: SourcePacket, registry: SourceUnitRegistry): Promise<{
  readonly textContext: LensVisualTextContext;
  readonly reference: LensVisualEvaluationReference;
  readonly calls: PlannedCall[];
  readonly planHash: string;
  readonly approvalId: string;
  readonly approvalPlan: unknown;
  readonly costGuard: unknown;
  readonly priorPaidCostUsd: number;
}> {
  const textContext = buildTextContext(packet, registry);
  const reference = buildEvaluationReference(packet);
  const syntheticCandidates: LensVisualCandidateSet = {
    CANDIDATE_A: syntheticObservation({ id: 'VISUAL_MEDIUM', mode: 'VISUAL_ONLY', packet, textContext }),
    CANDIDATE_B: syntheticObservation({ id: 'VISUAL_HIGH', mode: 'VISUAL_ONLY', packet, textContext }),
    CANDIDATE_C: syntheticObservation({ id: 'GROUNDED_MEDIUM', mode: 'TEXT_GROUNDED', packet, textContext }),
    CANDIDATE_D: syntheticObservation({ id: 'GROUNDED_HIGH', mode: 'TEXT_GROUNDED', packet, textContext }),
  };
  for (const candidate of Object.values(syntheticCandidates)) {
    if (!scoreLensVisualObservation({ observation: candidate, reference }).corePassed) {
      throw new Error('dry-run 합성 후보가 채점 계약을 충족하지 않는다.');
    }
  }
  const visualMedium = buildLensVisualOnlyInput({ packet, observationId: 'VISUAL_MEDIUM' });
  const visualHigh = buildLensVisualOnlyInput({ packet, observationId: 'VISUAL_HIGH' });
  const groundedMedium = buildLensTextGroundedVisualInput({
    packet, textContext, observationId: 'GROUNDED_MEDIUM',
  });
  const groundedHigh = buildLensTextGroundedVisualInput({
    packet, textContext, observationId: 'GROUNDED_HIGH',
  });
  const auditMedium = buildLensVisualAuditInput({
    packet, textContext, candidates: syntheticCandidates, auditId: 'VISUAL_AUDIT_MEDIUM', effort: 'medium',
  });
  const auditHigh = buildLensVisualAuditInput({
    packet, textContext, candidates: syntheticCandidates, auditId: 'VISUAL_AUDIT_HIGH', effort: 'high',
  });
  const calls: PlannedCall[] = [
    { callNumber: 1, stage: 'VISUAL_ONLY_MEDIUM', effort: 'medium', promptVersion: LENS_VISUAL_ONLY_PROMPT,
      outputSchema: 'LensVisualObservation', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.VISUAL_ONLY,
      dependsOn: [], inputKind: 'FIXED', projectionInput: visualMedium },
    { callNumber: 2, stage: 'VISUAL_ONLY_HIGH', effort: 'high', promptVersion: LENS_VISUAL_ONLY_PROMPT,
      outputSchema: 'LensVisualObservation', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.VISUAL_ONLY,
      dependsOn: [], inputKind: 'FIXED', projectionInput: visualHigh },
    { callNumber: 3, stage: 'TEXT_GROUNDED_MEDIUM', effort: 'medium', promptVersion: LENS_VISUAL_GROUNDED_PROMPT,
      outputSchema: 'LensVisualObservation', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.TEXT_GROUNDED,
      dependsOn: [], inputKind: 'FIXED', projectionInput: groundedMedium },
    { callNumber: 4, stage: 'TEXT_GROUNDED_HIGH', effort: 'high', promptVersion: LENS_VISUAL_GROUNDED_PROMPT,
      outputSchema: 'LensVisualObservation', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.TEXT_GROUNDED,
      dependsOn: [], inputKind: 'FIXED', projectionInput: groundedHigh },
    { callNumber: 5, stage: 'VISUAL_AUDIT_MEDIUM', effort: 'medium', promptVersion: LENS_VISUAL_AUDIT_PROMPT,
      outputSchema: 'LensVisualAudit', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.AUDIT,
      dependsOn: [1, 2, 3, 4], inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: auditMedium },
    { callNumber: 6, stage: 'VISUAL_AUDIT_HIGH', effort: 'high', promptVersion: LENS_VISUAL_AUDIT_PROMPT,
      outputSchema: 'LensVisualAudit', maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.AUDIT,
      dependsOn: [1, 2, 3, 4], inputKind: 'DYNAMIC_FROM_PRIOR_OUTPUT', projectionInput: auditHigh },
  ];
  if (calls.length !== MAX_CALLS) throw new Error('시각 탐색은 정확히 6회 계획이어야 한다.');
  assertLensVisualOnlyIsolation(visualMedium);
  assertLensVisualOnlyIsolation(visualHigh);
  calls.forEach((call) => assertNoLensVisualInputLeak(call.projectionInput));
  if (JSON.stringify(calls.map((call) => call.projectionInput)).includes('withheldFromAllApiCalls')) {
    throw new Error('사람 평가 기준표가 API projection에 누출됐다.');
  }

  const promptVersions = [LENS_VISUAL_ONLY_PROMPT, LENS_VISUAL_GROUNDED_PROMPT, LENS_VISUAL_AUDIT_PROMPT];
  const promptLocks = await Promise.all(promptVersions.map(async (promptVersion) => {
    const bytes = await readFile(resolve(PROMPT_ROOT, `${promptVersion}.md`));
    return { promptVersion, sha256: sha256Bytes(bytes), bytes: bytes.length };
  }));
  const promptBytes = new Map(promptLocks.map((entry) => [entry.promptVersion, entry.bytes]));
  const projectedPreflights = calls.map((call) => estimateLensVisualPreflightCost({
    input: call.projectionInput,
    promptBytes: promptBytes.get(call.promptVersion) ?? 0,
    imageCount: 1,
    maxOutputTokens: call.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: 0,
    budgetCeilingUsd: BUDGET_CEILING_USD,
  }));
  const priorResult = JSON.parse(await readFile(PRIOR_RESULT_PATH, 'utf8')) as Record<string, unknown>;
  const priorPaidCostUsd = Number(priorResult['experimentCumulativeCostUsd']);
  if (!Number.isFinite(priorPaidCostUsd) || priorPaidCostUsd < 0) {
    throw new Error('이전 볼록렌즈 실험 누적비용을 읽을 수 없다.');
  }
  const projectedPlanningCostUsd = Number(projectedPreflights.reduce(
    (sum, entry) => sum + entry.maximumCallCostUsd,
    0,
  ).toFixed(6));
  const projectedExperimentTotalCostUsd = Number((priorPaidCostUsd + projectedPlanningCostUsd).toFixed(6));
  if (projectedExperimentTotalCostUsd > BUDGET_CEILING_USD) {
    throw new Error('기존 비용을 포함한 시각 실험 예상비용이 $2를 넘는다.');
  }
  const schemaLocks = [
    ['LensVisualObservation', createSourceProviderJsonSchema(LensVisualObservationSchema)],
    ['LensVisualAudit', createSourceProviderJsonSchema(LensVisualAuditSchema)],
  ].map(([name, schema]) => ({ name, sha256: sourceArtifactHash(schema) }));
  const runnerPath = fileURLToPath(import.meta.url);
  const runnerRoot = dirname(runnerPath);
  const executionArtifactPaths = [
    ['cli', runnerPath],
    ['visual-source-runtime', resolve(runnerRoot, '../problem-solving/visual-source-runtime.js')],
    ['visual-source-experiment', resolve(runnerRoot, '../problem-solving/visual-source-experiment.js')],
    ['source-bundle-runtime', resolve(runnerRoot, '../problem-solving/source-bundle-runtime.js')],
    ['source-bundle', resolve(runnerRoot, '../problem-solving/source-bundle.js')],
  ] as const;
  const executionArtifactLocks = await Promise.all(executionArtifactPaths.map(async ([name, path]) => {
    const bytes = await readFile(path);
    return { name, sha256: sha256Bytes(bytes), bytes: bytes.length };
  }));
  const approvalPlan = {
    planVersion: PLAN_VERSION,
    runnerVersion: RUNNER_VERSION,
    executionArtifactLocks,
    model: LENS_VISUAL_MODEL,
    serviceTier: LENS_VISUAL_SERVICE_TIER,
    mediaHash: packet.media[0]!.contentHash,
    textContextHash: sourceArtifactHash(textContext),
    humanReferenceHash: sourceArtifactHash(reference),
    humanReferenceWithheldFromApi: true,
    promptLocks,
    schemaLocks,
    callGraph: calls.map((call) => ({
      callNumber: call.callNumber,
      stage: call.stage,
      effort: call.effort,
      promptVersion: call.promptVersion,
      outputSchema: call.outputSchema,
      maxOutputTokens: call.maxOutputTokens,
      dependsOn: call.dependsOn,
      inputKind: call.inputKind,
    })),
    inputPolicy: {
      cropsUsed: false,
      wholeImageAttachedToEveryCall: true,
      visualOnlyCallsExcludeText: true,
      groundedCallsExcludeOptionsAnswerExplanationAndGold: true,
      auditsHideModelEffortMapping: true,
      mediumAndHighAuditsIndependent: true,
    },
    costPolicy: {
      costCalculatorVersion: LENS_VISUAL_COST_VERSION,
      pricingUsdPerMillion: LENS_VISUAL_PRICING_USD_PER_MILLION,
      approvalBudgetCeilingUsd: BUDGET_CEILING_USD,
      priorPaidCostUsd,
      maximumCalls: MAX_CALLS,
      automaticRetries: 0,
      preflightRequiredBeforeEveryCall: true,
    },
  };
  const planHash = sourceArtifactHash(approvalPlan);
  return {
    textContext,
    reference,
    calls,
    planHash,
    approvalId: `${APPROVAL_PREFIX}:${planHash}`,
    approvalPlan,
    priorPaidCostUsd,
    costGuard: {
      costCalculatorVersion: LENS_VISUAL_COST_VERSION,
      projectedInputTokenCeiling: projectedPreflights.reduce(
        (sum, entry) => sum + entry.conservativeInputTokenCeiling,
        0,
      ),
      outputTokenCeiling: calls.reduce((sum, call) => sum + call.maxOutputTokens, 0),
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

async function persistCall(path: string, call: LensVisualApiCall<unknown>): Promise<void> {
  await mkdir(path, { recursive: true });
  await Promise.all([
    writeFile(resolve(path, 'raw-output.txt'), `${call.rawOutputText}\n`, 'utf8'),
    writeJson(resolve(path, 'parsed-output.json'), call.parsedOutput),
    writeJson(resolve(path, 'metadata.json'), call.metadata),
  ]);
}

async function execute(options: {
  readonly packet: SourcePacket;
  readonly textContext: LensVisualTextContext;
  readonly reference: LensVisualEvaluationReference;
  readonly outputRoot: string;
  readonly approvalPlanHash: string;
  readonly priorPaidCostUsd: number;
}): Promise<void> {
  const calls: LensVisualApiCall<unknown>[] = [];
  const remember = async <T>(stage: string, dependencyHashes: readonly string[], run: (
    control: LensVisualCallControl,
  ) => Promise<LensVisualApiCall<T>>): Promise<LensVisualApiCall<T>> => {
    if (calls.length >= MAX_CALLS) throw new Error('승인된 최대 6회를 초과할 수 없다.');
    const cumulativeActualCostUsdBeforeCall = options.priorPaidCostUsd + calls.reduce(
      (sum, call) => sum + lensVisualCallCostUsd(call.metadata),
      0,
    );
    const callNumber = calls.length + 1;
    const callRoot = resolve(options.outputRoot, `runs/${String(callNumber).padStart(2, '0')}-${stage}`);
    const call = await run({
      approvalPlanHash: options.approvalPlanHash,
      cumulativeActualCostUsdBeforeCall,
      budgetCeilingUsd: BUDGET_CEILING_USD,
      stage,
      dependencyArtifactHashes: [...dependencyHashes],
      recordPreflight: (record) => writeJson(resolve(callRoot, 'preflight.json'), record),
    });
    calls.push(call as LensVisualApiCall<unknown>);
    await persistCall(callRoot, call);
    return call;
  };
  const visualMedium = await remember('visual-only-medium', [], (callControl) => readLensVisualSource({
    packet: options.packet, mode: 'VISUAL_ONLY', effort: 'medium', observationId: 'VISUAL_MEDIUM', callControl,
  }));
  const visualHigh = await remember('visual-only-high', [], (callControl) => readLensVisualSource({
    packet: options.packet, mode: 'VISUAL_ONLY', effort: 'high', observationId: 'VISUAL_HIGH', callControl,
  }));
  const groundedMedium = await remember('text-grounded-medium', [], (callControl) => readLensVisualSource({
    packet: options.packet, mode: 'TEXT_GROUNDED', textContext: options.textContext,
    effort: 'medium', observationId: 'GROUNDED_MEDIUM', callControl,
  }));
  const groundedHigh = await remember('text-grounded-high', [], (callControl) => readLensVisualSource({
    packet: options.packet, mode: 'TEXT_GROUNDED', textContext: options.textContext,
    effort: 'high', observationId: 'GROUNDED_HIGH', callControl,
  }));
  const candidates: LensVisualCandidateSet = {
    CANDIDATE_A: visualMedium.parsedOutput,
    CANDIDATE_B: visualHigh.parsedOutput,
    CANDIDATE_C: groundedMedium.parsedOutput,
    CANDIDATE_D: groundedHigh.parsedOutput,
  };
  const candidateHashes = Object.values(candidates).map((candidate) => sourceArtifactHash(candidate));
  await Promise.all([
    writeJson(resolve(options.outputRoot, 'candidates/candidate-a.json'), candidates.CANDIDATE_A),
    writeJson(resolve(options.outputRoot, 'candidates/candidate-b.json'), candidates.CANDIDATE_B),
    writeJson(resolve(options.outputRoot, 'candidates/candidate-c.json'), candidates.CANDIDATE_C),
    writeJson(resolve(options.outputRoot, 'candidates/candidate-d.json'), candidates.CANDIDATE_D),
    writeJson(resolve(options.outputRoot, 'quarantined/private-candidate-mapping.json'), {
      CANDIDATE_A: 'VISUAL_ONLY_MEDIUM',
      CANDIDATE_B: 'VISUAL_ONLY_HIGH',
      CANDIDATE_C: 'TEXT_GROUNDED_MEDIUM',
      CANDIDATE_D: 'TEXT_GROUNDED_HIGH',
      exposedToAuditApi: false,
    }),
  ]);
  const auditMedium = await remember('visual-audit-medium', candidateHashes, (callControl) => (
    auditLensVisualSources({
      packet: options.packet, textContext: options.textContext, candidates,
      auditId: 'VISUAL_AUDIT_MEDIUM', effort: 'medium', callControl,
    })
  ));
  const auditHigh = await remember('visual-audit-high', candidateHashes, (callControl) => (
    auditLensVisualSources({
      packet: options.packet, textContext: options.textContext, candidates,
      auditId: 'VISUAL_AUDIT_HIGH', effort: 'high', callControl,
    })
  ));
  const scores = Object.fromEntries(Object.entries(candidates).map(([label, candidate]) => [
    label,
    scoreLensVisualObservation({ observation: candidate, reference: options.reference }),
  ]));
  const auditDecision = (audit: LensVisualAudit) => Object.fromEntries(
    audit.candidateAudits.map((entry) => [entry.candidateLabel, entry.decision]),
  );
  const actualCostUsd = calls.reduce((sum, call) => sum + lensVisualCallCostUsd(call.metadata), 0);
  await writeJson(resolve(options.outputRoot, 'result.json'), {
    status: 'LENS_VISUAL_SOURCE_EXPLORATION_COMPLETE',
    approvalPlanHash: options.approvalPlanHash,
    apiCalls: calls.length,
    actualCostUsd,
    priorPaidCostUsd: options.priorPaidCostUsd,
    experimentCumulativeCostUsd: options.priorPaidCostUsd + actualCostUsd,
    scores,
    audits: {
      medium: { overallDecision: auditMedium.parsedOutput.overallDecision,
        candidateDecisions: auditDecision(auditMedium.parsedOutput) },
      high: { overallDecision: auditHigh.parsedOutput.overallDecision,
        candidateDecisions: auditDecision(auditHigh.parsedOutput) },
    },
    visualOnlyStatus: scores['CANDIDATE_A']?.corePassed && scores['CANDIDATE_B']?.corePassed
      ? 'PASS' : 'REVIEW_REQUIRED',
    textGroundedVisualStatus: scores['CANDIDATE_C']?.corePassed && scores['CANDIDATE_D']?.corePassed
      ? 'PASS' : 'REVIEW_REQUIRED',
    productionEligible: false,
    productionEligibilityReason: 'EXPERIMENT_ONLY',
  });
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
  const dryRun = await buildDryRun(packet, registry);
  await Promise.all([
    writeJson(resolve(outputRoot, 'dry-run/execution-plan.json'), {
      status: 'DRY_RUN_NO_API_CALLS',
      planHash: dryRun.planHash,
      calls: dryRun.calls.map(({ projectionInput, ...call }) => ({
        ...call,
        projectionOnly: call.inputKind === 'DYNAMIC_FROM_PRIOR_OUTPUT',
        projectionInputHash: sourceArtifactHash(projectionInput),
        projectionInputBytes: Buffer.byteLength(JSON.stringify(projectionInput), 'utf8'),
        actualRequestHash: null,
        actualRequestHashTiming: 'IMMEDIATELY_BEFORE_EACH_API_CALL',
        wholeImageAttached: true,
        croppedImageAttached: false,
        serviceTier: LENS_VISUAL_SERVICE_TIER,
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
    writeJson(resolve(outputRoot, 'dry-run/verified-text-context.json'), dryRun.textContext),
    writeJson(resolve(outputRoot, 'dry-run/structured-output-schemas.json'), {
      LensVisualObservation: createSourceProviderJsonSchema(LensVisualObservationSchema),
      LensVisualAudit: createSourceProviderJsonSchema(LensVisualAuditSchema),
    }),
    writeJson(resolve(outputRoot, 'dry-run/input-projection-audit.json'), {
      passed: true,
      visualOnlyTextUsed: false,
      cropsUsed: false,
      optionsUsed: false,
      answerKeyUsed: false,
      officialExplanationUsed: false,
      existingGoldUsed: false,
      humanReferenceUsedByApi: false,
      candidateEffortMappingExposedToAuditApi: false,
      mediaHash: packet.media[0]!.contentHash,
      textContextHash: sourceArtifactHash(dryRun.textContext),
    }),
    writeJson(resolve(outputRoot, 'quarantined/evaluation-reference.json'), dryRun.reference),
    writeJson(resolve(outputRoot, 'quarantined/reference-isolation.json'), {
      referenceHash: sourceArtifactHash(dryRun.reference),
      withheldFromAllApiCalls: true,
      usedOnlyByLocalScorerAfterApiCalls: true,
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
    throw new Error(`유료 실행에는 현재 계획의 --approval-id=${dryRun.approvalId}가 필요하다.`);
  }
  const executionId = `${dryRun.planHash.slice('sha256:'.length, 19)}-${new Date().toISOString()
    .replaceAll(':', '').replaceAll('.', '')}`;
  activeExecutionRoot = resolve(outputRoot, 'paid-runs', executionId);
  await execute({
    packet,
    textContext: dryRun.textContext,
    reference: dryRun.reference,
    outputRoot: activeExecutionRoot,
    approvalPlanHash: dryRun.planHash,
    priorPaidCostUsd: dryRun.priorPaidCostUsd,
  });
}

try {
  await main();
} catch (error) {
  if (error instanceof LensVisualApiOutputValidationError) {
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
