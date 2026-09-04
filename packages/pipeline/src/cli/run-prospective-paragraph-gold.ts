import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';
import { Agent, fetch as undiciFetch } from 'undici';

import {
  AxisRelationMappingInputSchema,
  AxisRelationMappingResultSchema,
  AXIS_RELATION_MAPPING_SCHEMA_VERSION,
  mergeAxesAndRelationMapping,
} from '../axis-relation-mapping/schema.js';
import {
  loadAxisRelationMappingPrompt,
  mapRelationsToFixedAxesWithOpenAI,
} from '../axis-relation-mapping/evaluator.js';
import {
  decomposeCentralStoryWithOpenAI,
  loadCentralAxisDecompositionPrompt,
} from '../central-axis-decomposition/evaluator.js';
import {
  CENTRAL_AXIS_DECOMPOSITION_SCHEMA_VERSION,
  CentralAxisDecompositionResultSchema,
} from '../central-axis-decomposition/schema.js';
import {
  DIALOGUE_GOLD_VERSION,
  ParagraphDiagnosticGoldSchema,
} from '../dialogue-experiment/schema.js';
import {
  analyzeParagraphWithOpenAI,
  loadParagraphAnalysisPrompt,
} from '../paragraph-analysis/evaluator.js';
import {
  ParagraphAnalysisResultV3Schema,
  PARAGRAPH_ANALYSIS_SCHEMA_V3_VERSION,
  type ParagraphAnalysisResultV3,
} from '../paragraph-analysis/schema.js';
import {
  ProspectiveParagraphGoldManifestSchema,
  ParagraphGoldAuditOutputSchema,
  PARAGRAPH_GOLD_AUDIT_VERSION,
  PARAGRAPH_GOLD_REPAIR_VERSION,
  PARAGRAPH_PROPOSITION_BUNDLE_VERSION,
  ParagraphGoldRepairOutputSchema,
  ParagraphGoldProductionStatusSchema,
  ParagraphPropositionBundleSchema,
  artifactHash,
  createParagraphPropositionBundle,
  createRepairedParagraphPropositionBundle,
  deriveParagraphGoldProductionStatus,
  sentenceList,
} from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  ParagraphGoldRepairInputSchema,
  PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION,
  auditParagraphGoldWithOpenAI,
  loadParagraphGoldAuditPrompt,
  loadParagraphGoldRepairPrompt,
  repairParagraphGoldWithOpenAI,
} from '../paragraph-analysis/production-runtime.js';

type Mode = 'dry-run' | 'generate' | 'audit' | 'repair' | 'all';
type Effort = 'medium' | 'high';
type Scope = 'all' | 'canary' | 'remaining' | 'batch';

const RUNNER_CONTRACT_VERSION = 'prospective-paragraph-gold-runner-v10' as const;
const REQUEST_TIMEOUT_MS = 15 * 60 * 1_000;
const CANARY_SOURCE_IDS = [
  '69fd388386fd308968e0b9f4', // 볼록 렌즈와 비점 수차
  '69c09163fa5063deffe1c180', // 준거가격과 거래효용
  '69c0961c78128b2a9bee0717', // 지진파와 내진설계
] as const;
const PRICING_USD_PER_MILLION = {
  regularInput: 2,
  cachedInput: 0.2,
  cacheWriteInput: 2.5,
  output: 12,
} as const;
const TOKEN_LIMITS = {
  analysis: 12_000,
  decomposition: 3_000,
  mapping: 2_000,
  audit: 8_000,
  repair: 12_000,
  reaudit: 8_000,
} as const;

interface ApiUsageMetadata {
  readonly responseId: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cachedInputTokens: number;
    readonly cacheWriteTokens: number;
  };
}

interface StageArtifact<T> {
  readonly artifactType: string;
  readonly createdAt: string;
  readonly inputHash: string;
  readonly config: Record<string, unknown>;
  readonly result: T;
  readonly metadata: unknown;
}

interface BatchSelectionManifest {
  readonly artifactType:
    | 'prospective-paragraph-gold-batch-selection-v1'
    | 'prospective-paragraph-gold-batch-selection-v2';
  readonly batchId: string;
  readonly sourceManifestHash: string;
  readonly prerequisiteApprovalManifestPath: string;
  readonly prerequisiteApprovalManifestHash: string;
  readonly prerequisiteProductionEligibleCount?: number;
  readonly passageCount?: number;
  readonly paragraphCount?: number;
  readonly sourceIds: readonly string[];
  readonly paragraphIds: readonly string[];
  readonly selectionPolicy: string;
  readonly visualPolicy: 'TEXT_ONLY_ALL_TARGETS_HAVE_TEXT_REFERENCES_VISUAL_FALSE';
  readonly maximumAutomaticRepairCyclesPerParagraph: 1;
  readonly budgetUsd: number;
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseEffort(value: string | undefined, fallback: Effort): Effort {
  const effort = value ?? fallback;
  if (effort !== 'medium' && effort !== 'high') {
    throw new Error(`지원하지 않는 reasoning effort: ${effort}`);
  }
  return effort;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function jsonFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(path);
  }
  return files;
}

function isApiUsageMetadata(value: unknown): value is ApiUsageMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as Partial<ApiUsageMetadata>;
  const usage = metadata.usage as Partial<ApiUsageMetadata['usage']> | undefined;
  return typeof metadata.responseId === 'string' &&
    typeof usage?.inputTokens === 'number' &&
    typeof usage.outputTokens === 'number' &&
    typeof usage.cachedInputTokens === 'number' &&
    typeof usage.cacheWriteTokens === 'number';
}

function apiCostUsd(metadata: ApiUsageMetadata): number {
  const usage = metadata.usage;
  const regularInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens,
  );
  return (
    regularInputTokens * PRICING_USD_PER_MILLION.regularInput +
    usage.cachedInputTokens * PRICING_USD_PER_MILLION.cachedInput +
    usage.cacheWriteTokens * PRICING_USD_PER_MILLION.cacheWriteInput +
    usage.outputTokens * PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
}

function accumulatedUsage(root: string): {
  readonly responseCount: number;
  readonly costUsd: number;
  readonly responses: readonly { readonly responseId: string; readonly costUsd: number }[];
} {
  const responses = new Map<string, number>();
  for (const path of jsonFiles(resolve(root, 'artifacts'))) {
    const value = readJson(path) as { metadata?: unknown };
    if (isApiUsageMetadata(value.metadata)) {
      responses.set(value.metadata.responseId, apiCostUsd(value.metadata));
    }
  }
  return {
    responseCount: responses.size,
    costUsd: [...responses.values()].reduce((sum, cost) => sum + cost, 0),
    responses: [...responses.entries()].map(([responseId, costUsd]) => ({ responseId, costUsd })),
  };
}

class BudgetExceededError extends Error {}

function assertCallWithinBudget(options: {
  readonly outputRoot: string;
  readonly budgetUsd: number;
  readonly stage: keyof typeof TOKEN_LIMITS;
  readonly input: unknown;
  readonly instructions: string;
}): void {
  const spent = accumulatedUsage(options.outputRoot).costUsd;
  // UTF-8 바이트 수는 한국어 BPE 토큰 수보다 보수적인 입력 상한으로 사용한다.
  const maximumInputTokens = Buffer.byteLength(
    `${options.instructions}\n${JSON.stringify(options.input)}`,
    'utf8',
  );
  const maximumCurrentCallCost = (
    maximumInputTokens * PRICING_USD_PER_MILLION.cacheWriteInput +
    TOKEN_LIMITS[options.stage] * PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
  if (spent + maximumCurrentCallCost > options.budgetUsd) {
    throw new BudgetExceededError(
      `비용 상한 전 중단: 누적 $${spent.toFixed(4)}, ` +
      `${options.stage} 호출 보수적 최대 $${maximumCurrentCallCost.toFixed(4)}, ` +
      `허용 $${options.budgetUsd.toFixed(2)}`,
    );
  }
}

function writeCostSummary(root: string, budgetUsd: number, planHash: string): void {
  const usage = accumulatedUsage(root);
  writeJson(resolve(root, 'cost-summary.json'), {
    artifactType: 'prospective-paragraph-gold-cost-summary-v1',
    updatedAt: new Date().toISOString(),
    planHash,
    budgetUsd,
    pricingUsdPerMillionTokens: PRICING_USD_PER_MILLION,
    ...usage,
  });
}

function loadStage<T>(options: {
  readonly path: string;
  readonly inputHash: string;
  readonly config: Record<string, unknown>;
  readonly parseResult: (value: unknown) => T;
}): StageArtifact<T> | null {
  if (!existsSync(options.path)) return null;
  const raw = readJson(options.path) as Partial<StageArtifact<unknown>>;
  if (
    raw.inputHash !== options.inputHash ||
    artifactHash(raw.config) !== artifactHash(options.config)
  ) {
    throw new Error(`기존 단계 산출물이 현재 입력 또는 설정과 다르다: ${options.path}`);
  }
  return {
    artifactType: String(raw.artifactType),
    createdAt: String(raw.createdAt),
    inputHash: raw.inputHash,
    config: raw.config ?? {},
    result: options.parseResult(raw.result),
    metadata: raw.metadata,
  };
}

function saveStage<T>(options: {
  readonly path: string;
  readonly artifactType: string;
  readonly input: unknown;
  readonly config: Record<string, unknown>;
  readonly result: T;
  readonly metadata: unknown;
}): StageArtifact<T> {
  const artifact = {
    artifactType: options.artifactType,
    createdAt: new Date().toISOString(),
    inputHash: artifactHash(options.input),
    config: options.config,
    result: options.result,
    metadata: options.metadata,
  };
  writeJson(options.path, artifact);
  return artifact;
}

const modeValue = option('--mode') ?? 'dry-run';
if (!['dry-run', 'generate', 'audit', 'repair', 'all'].includes(modeValue)) {
  throw new Error(`지원하지 않는 mode: ${modeValue}`);
}
const mode = modeValue as Mode;
const execute = hasFlag('--execute');
const scopeValue = option('--scope') ?? (mode === 'dry-run' ? 'all' : 'canary');
if (!['all', 'canary', 'remaining', 'batch'].includes(scopeValue)) {
  throw new Error(`지원하지 않는 scope: ${scopeValue}`);
}
const scope = scopeValue as Scope;
if (mode !== 'dry-run' && !execute) {
  throw new Error('유료 API 단계는 --execute를 명시해야 실행된다. 먼저 dry-run을 확인하라.');
}
if (mode !== 'dry-run' && !process.env['OPENAI_API_KEY']) {
  throw new Error('유료 API 실행에는 OPENAI_API_KEY가 필요하다.');
}
if (execute && scope === 'all') {
  throw new Error('유료 실행은 canary 통과 전 전체 범위를 직접 실행할 수 없다.');
}

const manifestPath = resolve(
  process.cwd(),
  option('--manifest') ??
    'packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json',
);
const outputRoot = resolve(
  process.cwd(),
  option('--output-dir') ??
    'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const manifest = ProspectiveParagraphGoldManifestSchema.parse(readJson(manifestPath));
const generationModel = option('--generation-model') ?? 'gpt-5.6-terra';
const generationEffort = parseEffort(option('--generation-effort'), 'medium');
const auditModel = option('--audit-model') ?? 'gpt-5.6-terra';
const auditEffort = parseEffort(option('--audit-effort'), 'medium');
const repairModel = option('--repair-model') ?? auditModel;
const repairEffort = parseEffort(option('--repair-effort'), auditEffort);
const budgetUsd = Number(option('--budget-usd') ?? '30');
const canaryBudgetUsd = 4;
if (!Number.isFinite(budgetUsd) || budgetUsd <= 0 || budgetUsd > 30) {
  throw new Error('승인된 누적 비용 상한은 0달러 초과 30달러 이하다.');
}
const batchManifestOption = option('--batch-manifest');
if (scope === 'batch' && batchManifestOption === undefined) {
  throw new Error('batch 범위에는 --batch-manifest가 필요하다.');
}
if (scope !== 'batch' && batchManifestOption !== undefined) {
  throw new Error('--batch-manifest는 batch 범위에서만 사용할 수 있다.');
}
const batchManifestPath = batchManifestOption === undefined
  ? undefined
  : resolve(process.cwd(), batchManifestOption);
const batchSelection = batchManifestPath === undefined
  ? undefined
  : readJson(batchManifestPath) as BatchSelectionManifest;
if (batchSelection !== undefined) {
  if (
    batchSelection.artifactType !== 'prospective-paragraph-gold-batch-selection-v1' &&
    batchSelection.artifactType !== 'prospective-paragraph-gold-batch-selection-v2'
  ) {
    throw new Error('지원하지 않는 batch manifest 형식이다.');
  }
  if (
    batchSelection.sourceManifestHash !== artifactHash(manifest) ||
    batchSelection.maximumAutomaticRepairCyclesPerParagraph !== 1 ||
    batchSelection.budgetUsd !== budgetUsd
  ) {
    throw new Error('batch manifest의 원천·수리 횟수·비용 계약이 현재 실행과 다르다.');
  }
  const expectedPassageCount = batchSelection.artifactType ===
    'prospective-paragraph-gold-batch-selection-v2'
    ? batchSelection.passageCount
    : batchSelection.sourceIds.length;
  const expectedParagraphCount = batchSelection.artifactType ===
    'prospective-paragraph-gold-batch-selection-v2'
    ? batchSelection.paragraphCount
    : 10;
  if (
    !Number.isInteger(expectedPassageCount) || expectedPassageCount === undefined ||
    expectedPassageCount <= 0 ||
    !Number.isInteger(expectedParagraphCount) || expectedParagraphCount === undefined ||
    expectedParagraphCount <= 0 ||
    batchSelection.sourceIds.length !== expectedPassageCount ||
    batchSelection.sourceIds.length === 0 ||
    new Set(batchSelection.sourceIds).size !== batchSelection.sourceIds.length ||
    batchSelection.paragraphIds.length !== expectedParagraphCount ||
    new Set(batchSelection.paragraphIds).size !== batchSelection.paragraphIds.length
  ) {
    throw new Error('batch의 지문·문단 수 계약이 실제 선택 목록과 다르다.');
  }
  const selectedSourceIds = new Set(batchSelection.sourceIds);
  const selectedParagraphIds = new Set(batchSelection.paragraphIds);
  const selectedPassages = manifest.passages.filter((passage) =>
    selectedSourceIds.has(passage.sourceId));
  if (selectedPassages.length !== batchSelection.sourceIds.length) {
    throw new Error('batch의 지문 ID 일부를 원천 manifest에서 찾지 못했다.');
  }
  const expectedParagraphIds = selectedPassages.flatMap((passage) =>
    passage.paragraphs.map((paragraph) => paragraph.paragraphId));
  if (
    expectedParagraphIds.length !== batchSelection.paragraphIds.length ||
    expectedParagraphIds.some((paragraphId) => !selectedParagraphIds.has(paragraphId))
  ) {
    throw new Error('batch는 선택한 지문의 모든 문단을 빠짐없이 포함해야 한다.');
  }
  if (selectedPassages.some((passage) =>
    passage.paragraphs.some((paragraph) => paragraph.textReferencesVisual))) {
    throw new Error('이번 텍스트 전용 batch에 시각 참조 문단이 포함됐다.');
  }
  if (batchSelection.sourceIds.some((sourceId) =>
    CANARY_SOURCE_IDS.includes(sourceId as (typeof CANARY_SOURCE_IDS)[number]))) {
    throw new Error('이미 승인된 canary 지문을 batch에서 다시 실행할 수 없다.');
  }
  const approvalPath = resolve(process.cwd(), batchSelection.prerequisiteApprovalManifestPath);
  if (!existsSync(approvalPath)) throw new Error('선행 canary 승인 manifest가 없다.');
  const approvalManifest = readJson(approvalPath) as {
    readonly counts?: { readonly total?: unknown; readonly productionEligible?: unknown };
    readonly paragraphs?: readonly { readonly productionEligible?: unknown }[];
  };
  const expectedPrerequisiteCount = batchSelection.prerequisiteProductionEligibleCount ?? 16;
  if (
    artifactHash(approvalManifest) !== batchSelection.prerequisiteApprovalManifestHash ||
    approvalManifest.counts?.total !== expectedPrerequisiteCount ||
    approvalManifest.counts.productionEligible !== expectedPrerequisiteCount ||
    !Array.isArray(approvalManifest.paragraphs) ||
    approvalManifest.paragraphs.some((paragraph) => paragraph.productionEligible !== true) ||
    approvalManifest.paragraphs.some((paragraph) =>
      batchSelection.paragraphIds.includes(String((paragraph as { paragraphId?: unknown }).paragraphId)))
  ) {
    throw new Error('선행 승인 기록이 현재 batch 계약과 일치하지 않는다.');
  }
}
const canaryPassages = manifest.passages.filter((passage) =>
  CANARY_SOURCE_IDS.includes(passage.sourceId as (typeof CANARY_SOURCE_IDS)[number]));
if (canaryPassages.length !== CANARY_SOURCE_IDS.length) {
  throw new Error('승인된 고위험 canary 지문 세트를 manifest에서 모두 찾지 못했다.');
}
const canaryParagraphCount = canaryPassages.reduce(
  (sum, passage) => sum + passage.paragraphCount,
  0,
);
const plannedParagraphCount = scope === 'canary'
  ? canaryParagraphCount
  : scope === 'remaining'
    ? manifest.paragraphCount - canaryParagraphCount
    : scope === 'batch'
      ? batchSelection!.paragraphIds.length
      : manifest.paragraphCount;
const plannedPassageCount = scope === 'canary'
  ? canaryPassages.length
  : scope === 'remaining'
    ? manifest.passageCount - canaryPassages.length
    : scope === 'batch'
      ? batchSelection!.sourceIds.length
      : manifest.passageCount;

const planContract = {
  runnerContractVersion: RUNNER_CONTRACT_VERSION,
  requestedScope: scope,
  outputRoot,
  sourceManifestHash: artifactHash(manifest),
  batchSelection: batchSelection === undefined ? null : {
    path: batchManifestPath,
    hash: artifactHash(batchSelection),
    batchId: batchSelection.batchId,
    sourceIds: batchSelection.sourceIds,
    paragraphIds: batchSelection.paragraphIds,
    prerequisiteApprovalManifestHash: batchSelection.prerequisiteApprovalManifestHash,
  },
  promptHashes: {
    analysis: artifactHash(loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v3.1')),
    decomposition: artifactHash(loadCentralAxisDecompositionPrompt()),
    mapping: artifactHash(loadAxisRelationMappingPrompt()),
    audit: artifactHash(loadParagraphGoldAuditPrompt()),
    repair: artifactHash(loadParagraphGoldRepairPrompt()),
  },
  schemaVersions: {
    analysis: PARAGRAPH_ANALYSIS_SCHEMA_V3_VERSION,
    decomposition: CENTRAL_AXIS_DECOMPOSITION_SCHEMA_VERSION,
    mapping: AXIS_RELATION_MAPPING_SCHEMA_VERSION,
    diagnosticGold: DIALOGUE_GOLD_VERSION,
    propositionBundle: PARAGRAPH_PROPOSITION_BUNDLE_VERSION,
    audit: PARAGRAPH_GOLD_AUDIT_VERSION,
    repair: PARAGRAPH_GOLD_REPAIR_VERSION,
  },
  models: {
    generation: { model: generationModel, effort: generationEffort },
    audit: { model: auditModel, effort: auditEffort },
    repair: { model: repairModel, effort: repairEffort },
  },
  serviceTier: 'default',
  tokenLimits: TOKEN_LIMITS,
  pricingUsdPerMillionTokens: PRICING_USD_PER_MILLION,
  budgetUsd,
  canaryBudgetUsd,
  canarySourceIds: CANARY_SOURCE_IDS,
  automaticApiRetries: 0,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  maximumRepairCyclesPerParagraph: 1,
  visualProcessingDeferred: true,
} as const;
const planHash = artifactHash(planContract);
const openAIClient = execute
  ? new OpenAI({
      maxRetries: 0,
      timeout: REQUEST_TIMEOUT_MS,
      // OpenAI SDK가 참조하는 undici-types와 실제 undici 패키지의 명목 타입이 다르지만,
      // SDK 공식 예시와 같은 Fetch/Dispatcher 런타임 계약이다.
      fetch: undiciFetch as never,
      fetchOptions: {
        dispatcher: new Agent({
          headersTimeout: REQUEST_TIMEOUT_MS,
          bodyTimeout: REQUEST_TIMEOUT_MS,
        }) as never,
      },
    })
  : undefined;

function apiClient(): OpenAI {
  if (openAIClient === undefined) throw new Error('dry-run에서는 API client를 사용할 수 없다.');
  return openAIClient;
}

const executionPlan = {
  artifactType: 'prospective-paragraph-gold-execution-plan-v2',
  createdAt: new Date().toISOString(),
  planHash,
  planContract,
  mode,
  requestedScope: scope,
  liveExecutionRequested: execute,
  sourceManifest: manifestPath,
  sourceManifestHash: artifactHash(manifest),
  outputRoot,
  scope: {
    passageCount: manifest.passageCount,
    paragraphCount: manifest.paragraphCount,
    footnoteCount: manifest.footnoteCount,
    canaryPassageCount: canaryPassages.length,
    canaryParagraphCount,
    remainingPassageCount: manifest.passageCount - canaryPassages.length,
    remainingParagraphCount: manifest.paragraphCount - canaryParagraphCount,
    selectedPassageCount: plannedPassageCount,
    selectedParagraphCount: plannedParagraphCount,
    batchId: batchSelection?.batchId ?? null,
  },
  generation: {
    model: generationModel,
    effort: generationEffort,
    serviceTier: 'default',
    maxOutputTokensByStage: {
      analysis: TOKEN_LIMITS.analysis,
      decomposition: TOKEN_LIMITS.decomposition,
      mapping: TOKEN_LIMITS.mapping,
    },
    callsPerParagraph: 3,
    maximumCalls: plannedParagraphCount * 3,
    promptStages: [
      'paragraph-analysis-prompt-v3.1',
      'central-axis-decomposition-prompt-v2',
      'axis-relation-mapping-prompt-v1',
    ],
  },
  audit: {
    model: auditModel,
    effort: auditEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.audit,
    callsPerGeneratedCandidate: 1,
    maximumCalls: plannedParagraphCount,
  },
  repair: {
    model: repairModel,
    effort: repairEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.repair,
    maxReauditOutputTokens: TOKEN_LIMITS.reaudit,
    maximumCyclesPerParagraph: 1,
    callsPerCycle: 2,
    maximumCalls: plannedParagraphCount * 2,
  },
  callBounds: {
    baseMaximum: plannedParagraphCount * 4,
    withAllParagraphsRepairedMaximum: plannedParagraphCount * 6,
    note: '앞 단계가 NEEDS_REVIEW이면 후속 호출을 보내지 않으므로 실제 호출 수는 더 적을 수 있다.',
  },
  safety: {
    existingGoldMutation: false,
    resumeByInputAndConfigHash: true,
    automaticApiRetries: 0,
    visualProcessingDeferred: true,
    visualDependencyPolicy: 'REVIEW_REQUIRED',
    budgetUsd,
    canaryBudgetUsd,
    preflightCostGuard: true,
    approvedPlanHash: planHash,
  },
};
writeJson(resolve(outputRoot, 'execution-plan.json'), executionPlan);
if (mode === 'dry-run') {
  process.stdout.write([
    'DRY RUN — API 호출 없음',
    `선택 지문: ${plannedPassageCount}개`,
    `선택 분석 문단: ${plannedParagraphCount}개`,
    `고위험 canary: ${canaryPassages.length}개 지문, ${canaryParagraphCount}개 문단`,
    `생성 최대: ${executionPlan.generation.maximumCalls}회`,
    `독립 감사 최대: ${executionPlan.audit.maximumCalls}회`,
    `기본 최대 합계: ${executionPlan.callBounds.baseMaximum}회`,
    `모든 문단이 1회 수리될 때 절대 최대: ${executionPlan.callBounds.withAllParagraphsRepairedMaximum}회`,
    `누적 비용 상한: $${budgetUsd.toFixed(2)} (canary $${canaryBudgetUsd.toFixed(2)})`,
    `계획 해시: ${planHash}`,
    `계획: ${resolve(outputRoot, 'execution-plan.json')}`,
  ].join('\n') + '\n');
  process.exit(0);
}

interface ParagraphContext {
  readonly sourceId: string;
  readonly passageId: string;
  readonly passageHash: string;
  readonly mediaCount: number;
  readonly paragraph: (typeof manifest.passages)[number]['paragraphs'][number];
  readonly passageParagraphs: readonly {
    readonly paragraphId: string;
    readonly position: number;
    readonly text: string;
  }[];
  readonly dir: string;
}

const allContexts: ParagraphContext[] = manifest.passages.flatMap((passage) => {
  const passageParagraphs = passage.paragraphs.map(({ paragraphId, position, text }) => ({
    paragraphId,
    position,
    text,
  }));
  return passage.paragraphs.map((paragraph) => ({
    sourceId: passage.sourceId,
    passageId: passage.passageId,
    passageHash: passage.passageHash,
    mediaCount: passage.mediaCount,
    paragraph,
    passageParagraphs,
    dir: resolve(outputRoot, 'artifacts', passage.sourceId, paragraph.paragraphId),
  }));
});
const canarySourceIdSet = new Set<string>(CANARY_SOURCE_IDS);
const contexts = allContexts.filter((context) =>
  scope === 'all' ||
  (scope === 'canary' && canarySourceIdSet.has(context.sourceId)) ||
  (scope === 'remaining' && !canarySourceIdSet.has(context.sourceId)) ||
  (scope === 'batch' && batchSelection!.paragraphIds.includes(context.paragraph.paragraphId)));
if (contexts.length !== plannedParagraphCount) {
  throw new Error(`선택 문단 수가 계획과 다르다: ${contexts.length}/${plannedParagraphCount}`);
}
const effectiveBudgetUsd = scope === 'canary' ? Math.min(budgetUsd, canaryBudgetUsd) : budgetUsd;

if (execute && scope === 'remaining') {
  const gatePath = resolve(outputRoot, 'canary-gate.json');
  if (!existsSync(gatePath)) throw new Error('canary 통과 기록이 없어 나머지 지문을 실행할 수 없다.');
  const gate = readJson(gatePath) as { decision?: string; planHash?: string };
  if (gate.decision !== 'PASS' || gate.planHash !== planHash) {
    throw new Error('현재 계획 해시로 통과한 canary가 없어 나머지 지문을 실행할 수 없다.');
  }
}

function preflight(
  stage: keyof typeof TOKEN_LIMITS,
  input: unknown,
  instructions: string,
): void {
  assertCallWithinBudget({
    outputRoot,
    budgetUsd: effectiveBudgetUsd,
    stage,
    input,
    instructions,
  });
}

function refreshCostSummary(): void {
  writeCostSummary(outputRoot, budgetUsd, planHash);
}

async function generate(context: ParagraphContext): Promise<void> {
  mkdirSync(context.dir, { recursive: true });
  const sourceSnapshot = {
    sourceId: context.sourceId,
    passageId: context.passageId,
    passageHash: context.passageHash,
    mediaCount: context.mediaCount,
    paragraph: context.paragraph,
    passageParagraphs: context.passageParagraphs,
  };
  writeJson(resolve(context.dir, '00-source.json'), sourceSnapshot);

  const analysisInput = {
    paragraphId: context.paragraph.paragraphId,
    paragraphText: context.paragraph.text,
    sentences: sentenceList(context.paragraph.text),
    passageParagraphs: context.passageParagraphs.map(({ paragraphId, text }) => ({
      paragraphId,
      text,
    })),
    fullPassageAvailable: true,
  };
  const analysisConfig = {
    model: generationModel,
    effort: generationEffort,
    serviceTier: 'default',
    promptVersion: 'paragraph-analysis-prompt-v3.1',
    maxOutputTokens: TOKEN_LIMITS.analysis,
  } as const;
  const analysisPath = resolve(context.dir, '01-analysis.json');
  let analysis = loadStage({
    path: analysisPath,
    inputHash: artifactHash(analysisInput),
    config: analysisConfig,
    parseResult: (value) => ParagraphAnalysisResultV3Schema.parse(value),
  });
  if (analysis === null) {
    preflight(
      'analysis',
      analysisInput,
      loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v3.1'),
    );
    const call = await analyzeParagraphWithOpenAI(
      analysisInput,
      { ...analysisConfig, client: apiClient() },
    );
    analysis = saveStage({
      path: analysisPath,
      artifactType: 'paragraph-analysis-stage-v1',
      input: analysisInput,
      config: analysisConfig,
      result: ParagraphAnalysisResultV3Schema.parse(call.result),
      metadata: call.metadata,
    });
    refreshCostSummary();
  }

  const decompositionInput = {
    paragraphId: context.paragraph.paragraphId,
    centralStory: analysis.result.diagnosticGold.centralStory,
  };
  const decompositionConfig = {
    model: generationModel,
    effort: generationEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.decomposition,
  } as const;
  const decompositionPath = resolve(context.dir, '02-decomposition.json');
  let decomposition = loadStage({
    path: decompositionPath,
    inputHash: artifactHash(decompositionInput),
    config: decompositionConfig,
    parseResult: (value) => CentralAxisDecompositionResultSchema.parse(value),
  });
  if (decomposition === null) {
    preflight('decomposition', decompositionInput, loadCentralAxisDecompositionPrompt());
    const call = await decomposeCentralStoryWithOpenAI(
      decompositionInput,
      { ...decompositionConfig, client: apiClient() },
    );
    decomposition = saveStage({
      path: decompositionPath,
      artifactType: 'central-axis-decomposition-stage-v1',
      input: decompositionInput,
      config: decompositionConfig,
      result: call.result,
      metadata: call.metadata,
    });
    refreshCostSummary();
  }
  if (decomposition.result.verdict !== 'READY') {
    writeJson(resolve(context.dir, 'status.json'), {
      status: 'REVIEW_REQUIRED',
      productionEligible: false,
      reason: '중심 이야기의 중심축을 안정적으로 확정하지 못했다.',
    });
    return;
  }

  const mappingInput = AxisRelationMappingInputSchema.parse({
    paragraphId: context.paragraph.paragraphId,
    centralStory: analysis.result.diagnosticGold.centralStory,
    centralAxes: decomposition.result.centralAxes,
    coreRelations: analysis.result.diagnosticGold.coreRelations,
  });
  const mappingConfig = {
    model: generationModel,
    effort: generationEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.mapping,
  } as const;
  const mappingPath = resolve(context.dir, '03-mapping.json');
  let mapping = loadStage({
    path: mappingPath,
    inputHash: artifactHash(mappingInput),
    config: mappingConfig,
    parseResult: (value) => AxisRelationMappingResultSchema.parse(value),
  });
  if (mapping === null) {
    preflight('mapping', mappingInput, loadAxisRelationMappingPrompt());
    const call = await mapRelationsToFixedAxesWithOpenAI(
      mappingInput,
      { ...mappingConfig, client: apiClient() },
    );
    mapping = saveStage({
      path: mappingPath,
      artifactType: 'axis-relation-mapping-stage-v1',
      input: mappingInput,
      config: mappingConfig,
      result: call.result,
      metadata: call.metadata,
    });
    refreshCostSummary();
  }
  if (mapping.result.verdict !== 'READY') {
    writeJson(resolve(context.dir, 'status.json'), {
      status: 'REVIEW_REQUIRED',
      productionEligible: false,
      reason: '중심축과 핵심 관계의 대응을 안정적으로 확정하지 못했다.',
    });
    return;
  }

  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...analysis.result.diagnosticGold,
    centralAxes: mergeAxesAndRelationMapping(mappingInput, mapping.result),
  });
  const metadata = analysis.metadata as { responseId?: string } | undefined;
  const propositionBundle = createParagraphPropositionBundle({
    sourceId: context.sourceId,
    passageId: context.passageId,
    position: context.paragraph.position,
    passageHash: context.passageHash,
    analysisRunId: metadata?.responseId ?? `cached-${artifactHash(analysis).slice(7, 23)}`,
    analysis: analysis.result as ParagraphAnalysisResultV3,
  });
  writeJson(resolve(context.dir, 'diagnostic-gold-candidate.json'), diagnosticGold);
  writeJson(resolve(context.dir, 'proposition-bundle-candidate.json'), propositionBundle);
  writeJson(resolve(context.dir, 'status.json'), {
    status: 'STATIC_VALIDATED',
    productionEligible: false,
    reason: '세 생성 단계와 코드 검증을 통과했지만 독립 의미 감사 전이다.',
  });
}

function candidate(context: ParagraphContext): {
  readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
  readonly propositionBundle: ReturnType<typeof ParagraphPropositionBundleSchema.parse>;
} | null {
  const diagnosticPath = resolve(context.dir, 'diagnostic-gold-candidate.json');
  const propositionPath = resolve(context.dir, 'proposition-bundle-candidate.json');
  if (!existsSync(diagnosticPath) || !existsSync(propositionPath)) return null;
  return {
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(readJson(diagnosticPath)),
    propositionBundle: ParagraphPropositionBundleSchema.parse(readJson(propositionPath)),
  };
}

function auditInput(context: ParagraphContext, value: NonNullable<ReturnType<typeof candidate>>) {
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: context.sourceId,
    passageId: context.passageId,
    passageParagraphs: context.passageParagraphs,
    targetParagraph: {
      paragraphId: context.paragraph.paragraphId,
      position: context.paragraph.position,
      text: context.paragraph.text,
      textReferencesVisual: context.paragraph.textReferencesVisual,
      passageMediaCount: context.mediaCount,
    },
    diagnosticGold: value.diagnosticGold,
    propositionBundle: value.propositionBundle,
  });
}

async function audit(context: ParagraphContext): Promise<void> {
  const value = candidate(context);
  if (value === null) return;
  const input = auditInput(context, value);
  const config = {
    model: auditModel,
    effort: auditEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.audit,
  } as const;
  const path = resolve(context.dir, '04-audit.json');
  let stage = loadStage({
    path,
    inputHash: artifactHash(input),
    config,
    parseResult: (raw) => ParagraphGoldAuditOutputSchema.parse(raw),
  });
  if (stage === null) {
    preflight('audit', input, loadParagraphGoldAuditPrompt());
    const call = await auditParagraphGoldWithOpenAI(input, { ...config, client: apiClient() });
    stage = saveStage({
      path,
      artifactType: 'paragraph-gold-audit-stage-v1',
      input,
      config,
      result: call.result,
      metadata: call.metadata,
    });
    refreshCostSummary();
  }
  const status = deriveParagraphGoldProductionStatus({
    sourceId: context.sourceId,
    ...value,
    audit: stage.result,
  });
  writeJson(resolve(context.dir, 'status.json'), status);
}

async function repair(context: ParagraphContext): Promise<void> {
  const value = candidate(context);
  const auditPath = resolve(context.dir, '04-audit.json');
  const statusPath = resolve(context.dir, 'status.json');
  if (value === null || !existsSync(auditPath) || !existsSync(statusPath)) return;
  const status = ParagraphGoldProductionStatusSchema.safeParse(readJson(statusPath));
  if (!status.success || status.data.status !== 'REPAIR_REQUIRED') return;
  const firstAuditArtifact = readJson(auditPath) as { result?: unknown };
  const firstAudit = ParagraphGoldAuditOutputSchema.parse(firstAuditArtifact.result);
  const input = ParagraphGoldRepairInputSchema.parse({
    ...auditInput(context, value),
    audit: firstAudit,
  });
  const config = {
    model: repairModel,
    effort: repairEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.repair,
    promptVersion: PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION,
    promptHash: artifactHash(loadParagraphGoldRepairPrompt()),
  } as const;
  const repairPath = resolve(context.dir, '05-repair.json');
  let repairStage = loadStage({
    path: repairPath,
    inputHash: artifactHash(input),
    config,
    parseResult: (raw) => ParagraphGoldRepairOutputSchema.parse(raw),
  });
  let repairedDiagnostic;
  let repairedBundle;
  if (repairStage === null) {
    preflight('repair', input, loadParagraphGoldRepairPrompt());
    const call = await repairParagraphGoldWithOpenAI(input, { ...config, client: apiClient() });
    repairStage = saveStage({
      path: repairPath,
      artifactType: 'paragraph-gold-repair-stage-v1',
      input,
      config,
      result: call.result,
      metadata: call.metadata,
    });
    refreshCostSummary();
    repairedDiagnostic = call.diagnosticGold;
    repairedBundle = call.propositionBundle;
  } else {
    if (!isApiUsageMetadata(repairStage.metadata)) {
      throw new Error('기존 1차 수리 응답에 API response ID가 없다.');
    }
    repairedDiagnostic = ParagraphDiagnosticGoldSchema.parse(repairStage.result.diagnosticGold);
    repairedBundle = createRepairedParagraphPropositionBundle({
      original: value.propositionBundle,
      repair: repairStage.result,
      repairRunId: repairStage.metadata.responseId,
    });
  }
  writeJson(resolve(context.dir, 'diagnostic-gold-repaired.json'), repairedDiagnostic);
  writeJson(resolve(context.dir, 'proposition-bundle-repaired.json'), repairedBundle);

  const secondInput = ParagraphGoldAuditInputSchema.parse({
    ...auditInput(context, value),
    diagnosticGold: repairedDiagnostic,
    propositionBundle: repairedBundle,
  });
  const secondConfig = {
    model: auditModel,
    effort: auditEffort,
    serviceTier: 'default',
    maxOutputTokens: TOKEN_LIMITS.reaudit,
  } as const;
  const secondPath = resolve(context.dir, '06-reaudit.json');
  let secondStage = loadStage({
    path: secondPath,
    inputHash: artifactHash(secondInput),
    config: secondConfig,
    parseResult: (raw) => ParagraphGoldAuditOutputSchema.parse(raw),
  });
  if (secondStage === null) {
    preflight('reaudit', secondInput, loadParagraphGoldAuditPrompt());
    const call = await auditParagraphGoldWithOpenAI(
      secondInput,
      { ...secondConfig, client: apiClient() },
    );
    secondStage = saveStage({
      path: secondPath,
      artifactType: 'paragraph-gold-reaudit-stage-v1',
      input: secondInput,
      config: secondConfig,
      result: call.result,
      metadata: call.metadata,
    });
    refreshCostSummary();
  }
  const firstRepairStatus = deriveParagraphGoldProductionStatus({
    sourceId: context.sourceId,
    diagnosticGold: repairedDiagnostic,
    propositionBundle: repairedBundle,
    audit: secondStage.result,
  });
  writeJson(resolve(context.dir, 'status.json'), firstRepairStatus.status === 'REPAIR_REQUIRED'
    ? {
        ...firstRepairStatus,
        status: 'REVIEW_REQUIRED',
        reason: '허용된 1회 자동 수리 후에도 추가 수리가 필요하다.',
        productionEligible: false,
      }
    : firstRepairStatus);
}

async function runForContext(
  stage: 'GENERATE' | 'AUDIT' | 'REPAIR',
  context: ParagraphContext,
  operation: (value: ParagraphContext) => Promise<void>,
): Promise<void> {
  try {
    await operation(context);
  } catch (error) {
    if (error instanceof BudgetExceededError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    writeJson(resolve(context.dir, `${stage.toLowerCase()}-failure.json`), {
      artifactType: 'prospective-paragraph-gold-stage-failure-v1',
      createdAt: new Date().toISOString(),
      stage,
      planHash,
      paragraphId: context.paragraph.paragraphId,
      message,
    });
    writeJson(resolve(context.dir, 'status.json'), {
      status: 'REVIEW_REQUIRED',
      productionEligible: false,
      reason: `${stage} 단계가 자동 완료되지 않았다: ${message}`,
    });
  }
}

if (mode === 'generate' || mode === 'all') {
  for (const [index, context] of contexts.entries()) {
    process.stdout.write(`GENERATE ${index + 1}/${contexts.length} ${context.paragraph.paragraphId}\n`);
    await runForContext('GENERATE', context, generate);
  }
}
if (mode === 'audit' || mode === 'all') {
  for (const [index, context] of contexts.entries()) {
    process.stdout.write(`AUDIT ${index + 1}/${contexts.length} ${context.paragraph.paragraphId}\n`);
    await runForContext('AUDIT', context, audit);
  }
}
if (mode === 'repair' || mode === 'all') {
  for (const [index, context] of contexts.entries()) {
    process.stdout.write(`REPAIR ${index + 1}/${contexts.length} ${context.paragraph.paragraphId}\n`);
    await runForContext('REPAIR', context, repair);
  }
}

function statusCounts(targets: readonly ParagraphContext[]) {
  const counts = { AGENT_AUDITED: 0, REPAIR_REQUIRED: 0, REVIEW_REQUIRED: 0, OTHER: 0 };
  for (const context of targets) {
    const path = resolve(context.dir, 'status.json');
    if (!existsSync(path)) {
      counts.OTHER += 1;
      continue;
    }
    const value = readJson(path) as { status?: string };
    if (value.status === 'AGENT_AUDITED') counts.AGENT_AUDITED += 1;
    else if (value.status === 'REPAIR_REQUIRED') counts.REPAIR_REQUIRED += 1;
    else if (value.status === 'REVIEW_REQUIRED') counts.REVIEW_REQUIRED += 1;
    else counts.OTHER += 1;
  }
  return counts;
}
const counts = statusCounts(contexts);
const allCounts = statusCounts(allContexts);
refreshCostSummary();
writeJson(resolve(outputRoot, 'run-summary.json'), {
  artifactType: 'prospective-paragraph-gold-run-summary-v2',
  createdAt: new Date().toISOString(),
  planHash,
  mode,
  scope,
  batchId: batchSelection?.batchId ?? null,
  batchSelectionHash: batchSelection === undefined ? null : artifactHash(batchSelection),
  paragraphCount: contexts.length,
  statusCounts: counts,
  allParagraphStatusCounts: allCounts,
  accumulatedUsage: accumulatedUsage(outputRoot),
});

if (mode === 'all' && scope === 'canary') {
  const reasons: string[] = [];
  if (counts.AGENT_AUDITED !== contexts.length) {
    reasons.push(`AGENT_AUDITED ${counts.AGENT_AUDITED}/${contexts.length}`);
  }
  const usage = accumulatedUsage(outputRoot);
  if (usage.costUsd > canaryBudgetUsd) {
    reasons.push(`canary 비용 $${usage.costUsd.toFixed(4)} > $${canaryBudgetUsd.toFixed(2)}`);
  }
  writeJson(resolve(outputRoot, 'canary-gate.json'), {
    artifactType: 'prospective-paragraph-gold-canary-gate-v1',
    evaluatedAt: new Date().toISOString(),
    planHash,
    decision: reasons.length === 0 ? 'PASS' : 'STOP',
    paragraphCount: contexts.length,
    statusCounts: counts,
    accumulatedCostUsd: usage.costUsd,
    reasons,
  });
}
process.stdout.write(`완료: ${outputRoot}\n`);
