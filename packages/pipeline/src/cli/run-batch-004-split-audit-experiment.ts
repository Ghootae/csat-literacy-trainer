import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphPropositionBundleSchema,
  artifactHash,
  validateParagraphGoldAudit,
} from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  ParagraphGoldRepairInputSchema,
  loadParagraphGoldRepairPrompt,
  repairParagraphGoldWithOpenAI,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';
import {
  auditParagraphGoldGlobally,
  auditParagraphGoldLocally,
  loadSplitGlobalAuditPrompt,
  loadSplitLocalAuditPrompt,
  mergeSplitAudits,
  SPLIT_GLOBAL_AUDIT_VERSION,
  SPLIT_LOCAL_AUDIT_VERSION,
  SplitGlobalAuditOutputSchema,
  SplitLocalAuditOutputSchema,
  validateSplitGlobalAudit,
  validateSplitLocalAudit,
  type SplitGlobalAuditOutput,
  type SplitLocalAuditOutput,
} from '../paragraph-analysis/split-audit-runtime.js';

const EXPERIMENT_VERSION = 'batch-004-split-audit-experiment-v1' as const;
const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const SERVICE_TIER = 'default' as const;
const BUDGET_USD = 10;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = { local: 6_000, global: 8_000, repair: 12_000 } as const;
const PRICING = {
  regularInput: 2,
  cachedInput: 0.2,
  cacheWriteInput: 2.5,
  output: 12,
} as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages',
);
const SOURCE_ROOT = resolve(BATCH_ROOT, 'artifacts');
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-split-audit-batch-004-2026-09-04',
);

interface SourceArtifact {
  readonly sourceId: string;
  readonly passageId: string;
  readonly mediaCount: number;
  readonly paragraph: {
    readonly paragraphId: string;
    readonly position: number;
    readonly text: string;
    readonly textReferencesVisual: boolean;
  };
  readonly passageParagraphs: readonly {
    readonly paragraphId: string;
    readonly position: number;
    readonly text: string;
  }[];
}

interface StageArtifact<T> {
  readonly artifactType: string;
  readonly createdAt: string;
  readonly inputHash: string;
  readonly config: Record<string, unknown>;
  readonly result: T;
  readonly metadata: ParagraphGoldApiMetadata | { readonly source: 'CODE' };
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
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? jsonFiles(path) : entry.name.endsWith('.json') ? [path] : [];
  });
}

function paragraphDirectories(): string[] {
  return readdirSync(SOURCE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((source) => {
      const sourcePath = resolve(SOURCE_ROOT, source.name);
      return readdirSync(sourcePath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => resolve(sourcePath, entry.name));
    })
    .sort();
}

function buildInput(directory: string): ParagraphGoldAuditInput {
  const source = readJson(resolve(directory, '00-source.json')) as SourceArtifact;
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: source.sourceId,
    passageId: source.passageId,
    passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId: source.paragraph.paragraphId,
      position: source.paragraph.position,
      text: source.paragraph.text,
      textReferencesVisual: source.paragraph.textReferencesVisual,
      passageMediaCount: source.mediaCount,
    },
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(directory, 'diagnostic-gold-candidate.json')),
    ),
    propositionBundle: ParagraphPropositionBundleSchema.parse(
      readJson(resolve(directory, 'proposition-bundle-candidate.json')),
    ),
  });
}

function usageCost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens,
  );
  return (
    regular * PRICING.regularInput +
    usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput +
    usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function accumulatedUsage(): { responseCount: number; costUsd: number } {
  const responses = new Map<string, number>();
  for (const path of jsonFiles(resolve(OUTPUT_ROOT, 'artifacts'))) {
    const artifact = readJson(path) as { metadata?: Partial<ParagraphGoldApiMetadata> };
    const metadata = artifact.metadata;
    if (metadata?.provider === 'openai' && typeof metadata.responseId === 'string' && metadata.usage) {
      responses.set(metadata.responseId, usageCost(metadata as ParagraphGoldApiMetadata));
    }
  }
  return {
    responseCount: responses.size,
    costUsd: [...responses.values()].reduce((sum, cost) => sum + cost, 0),
  };
}

function assertWithinBudget(input: unknown, prompt: string, maxOutputTokens: number): void {
  const spent = accumulatedUsage().costUsd;
  const conservativeInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maximumCallCost = (
    conservativeInputTokens * PRICING.cacheWriteInput + maxOutputTokens * PRICING.output
  ) / 1_000_000;
  if (spent + maximumCallCost > BUDGET_USD) {
    throw new Error(
      `호출 전 비용 차단: 누적 $${spent.toFixed(4)}, 현재 최대 $${maximumCallCost.toFixed(4)}, 상한 $${BUDGET_USD}`,
    );
  }
}

function stagePath(paragraphId: string, name: string): string {
  return resolve(OUTPUT_ROOT, 'artifacts', paragraphId, name);
}

function loadStage<T>(path: string, inputHash: string, parse: (value: unknown) => T): T | undefined {
  if (!existsSync(path)) return undefined;
  const artifact = readJson(path) as StageArtifact<unknown>;
  if (artifact.inputHash !== inputHash) {
    throw new Error(`기존 stage의 입력 해시가 다름: ${path}`);
  }
  return parse(artifact.result);
}

function saveStage<T>(options: {
  readonly path: string;
  readonly type: string;
  readonly inputHash: string;
  readonly result: T;
  readonly metadata: StageArtifact<T>['metadata'];
  readonly config: Record<string, unknown>;
}): void {
  writeJson(options.path, {
    artifactType: options.type,
    createdAt: new Date().toISOString(),
    inputHash: options.inputHash,
    config: options.config,
    result: options.result,
    metadata: options.metadata,
  } satisfies StageArtifact<T>);
}

function buildPlan(inputs: readonly ParagraphGoldAuditInput[]) {
  const candidates = inputs.map((input) => ({
    sourceId: input.sourceId,
    paragraphId: input.targetParagraph.paragraphId,
    sourceHash: artifactHash({
      passageParagraphs: input.passageParagraphs,
      targetParagraph: input.targetParagraph,
    }),
    diagnosticGoldHash: artifactHash(input.diagnosticGold),
    propositionBundleHash: artifactHash(input.propositionBundle),
  }));
  const planCore = {
    experimentVersion: EXPERIMENT_VERSION,
    sourceBatchRoot: BATCH_ROOT,
    sourceCandidatePolicy: 'FROZEN_INITIAL_CANDIDATES_ONLY',
    passageCount: new Set(inputs.map((input) => input.sourceId)).size,
    paragraphCount: inputs.length,
    candidates,
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    budgetUsd: BUDGET_USD,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maximumCalls: inputs.length * 5,
    callPolicy: [
      'local audit',
      'global audit',
      'merged REPAIR_REQUIRED only: one repair',
      'repaired candidate local reaudit',
      'repaired candidate global reaudit',
    ],
    promptHashes: {
      local: artifactHash(loadSplitLocalAuditPrompt()),
      global: artifactHash(loadSplitGlobalAuditPrompt()),
      repair: artifactHash(loadParagraphGoldRepairPrompt()),
    },
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...planCore, planHash: artifactHash(planCore) };
}

async function runLocal(
  input: ParagraphGoldAuditInput,
  name: string,
  client: OpenAI,
): Promise<SplitLocalAuditOutput> {
  const inputHash = artifactHash({ version: SPLIT_LOCAL_AUDIT_VERSION, input });
  const path = stagePath(input.targetParagraph.paragraphId, name);
  const cached = loadStage(path, inputHash, (value) =>
    validateSplitLocalAudit(SplitLocalAuditOutputSchema.parse(value), input));
  if (cached) return cached;
  assertWithinBudget(input, loadSplitLocalAuditPrompt(), MAX_OUTPUT_TOKENS.local);
  const response = await auditParagraphGoldLocally(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS.local,
    client,
  });
  saveStage({
    path,
    type: 'paragraph-gold-split-local-audit-stage-v1',
    inputHash,
    result: response.result,
    metadata: response.metadata,
    config: { model: MODEL, effort: EFFORT, serviceTier: SERVICE_TIER, maxOutputTokens: MAX_OUTPUT_TOKENS.local },
  });
  return response.result;
}

async function runGlobal(
  input: ParagraphGoldAuditInput,
  name: string,
  client: OpenAI,
): Promise<SplitGlobalAuditOutput> {
  const inputHash = artifactHash({ version: SPLIT_GLOBAL_AUDIT_VERSION, input });
  const path = stagePath(input.targetParagraph.paragraphId, name);
  const cached = loadStage(path, inputHash, (value) =>
    validateSplitGlobalAudit(SplitGlobalAuditOutputSchema.parse(value), input));
  if (cached) return cached;
  assertWithinBudget(input, loadSplitGlobalAuditPrompt(), MAX_OUTPUT_TOKENS.global);
  const response = await auditParagraphGoldGlobally(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS.global,
    client,
  });
  saveStage({
    path,
    type: 'paragraph-gold-split-global-audit-stage-v1',
    inputHash,
    result: response.result,
    metadata: response.metadata,
    config: { model: MODEL, effort: EFFORT, serviceTier: SERVICE_TIER, maxOutputTokens: MAX_OUTPUT_TOKENS.global },
  });
  return response.result;
}

function saveMerged(
  input: ParagraphGoldAuditInput,
  local: SplitLocalAuditOutput,
  global: SplitGlobalAuditOutput,
  name: string,
) {
  const merged = mergeSplitAudits({ input, local, global });
  validateParagraphGoldAudit({
    audit: merged,
    sourceId: input.sourceId,
    diagnosticGold: input.diagnosticGold,
    propositionBundle: input.propositionBundle,
  });
  saveStage({
    path: stagePath(input.targetParagraph.paragraphId, name),
    type: 'paragraph-gold-split-merged-audit-stage-v1',
    inputHash: artifactHash({ input, local, global }),
    result: merged,
    metadata: { source: 'CODE' },
    config: { mergePolicy: 'BLOCKING > UNRESOLVED > REPAIR_REQUIRED > PASS' },
  });
  return merged;
}

async function runParagraph(input: ParagraphGoldAuditInput, client: OpenAI): Promise<void> {
  const id = input.targetParagraph.paragraphId;
  const local = await runLocal(input, '01-local-audit.json', client);
  const global = await runGlobal(input, '02-global-audit.json', client);
  const merged = saveMerged(input, local, global, '03-merged-audit.json');
  if (merged.decision !== 'REPAIR_REQUIRED') return;

  const repairInput = ParagraphGoldRepairInputSchema.parse({ ...input, audit: merged });
  const repairInputHash = artifactHash({ version: 'paragraph-gold-repair-prompt-v2', input: repairInput });
  const repairPath = stagePath(id, '04-repair.json');
  let repairedDiagnostic;
  let repairedBundle;
  const existingRepair = existsSync(repairPath)
    ? readJson(repairPath) as StageArtifact<{
      diagnosticGold: unknown;
      propositionBundle: unknown;
    }>
    : undefined;
  if (existingRepair) {
    if (existingRepair.inputHash !== repairInputHash) throw new Error(`수리 입력 해시 불일치: ${id}`);
    repairedDiagnostic = ParagraphDiagnosticGoldSchema.parse(existingRepair.result.diagnosticGold);
    repairedBundle = ParagraphPropositionBundleSchema.parse(existingRepair.result.propositionBundle);
  } else {
    assertWithinBudget(repairInput, loadParagraphGoldRepairPrompt(), MAX_OUTPUT_TOKENS.repair);
    const repaired = await repairParagraphGoldWithOpenAI(repairInput, {
      model: MODEL,
      effort: EFFORT,
      maxOutputTokens: MAX_OUTPUT_TOKENS.repair,
      client,
    });
    repairedDiagnostic = repaired.diagnosticGold;
    repairedBundle = repaired.propositionBundle;
    saveStage({
      path: repairPath,
      type: 'paragraph-gold-split-repair-stage-v1',
      inputHash: repairInputHash,
      result: {
        repair: repaired.result,
        diagnosticGold: repairedDiagnostic,
        propositionBundle: repairedBundle,
      },
      metadata: repaired.metadata,
      config: { model: MODEL, effort: EFFORT, serviceTier: SERVICE_TIER, maxOutputTokens: MAX_OUTPUT_TOKENS.repair },
    });
  }

  const repairedInput = ParagraphGoldAuditInputSchema.parse({
    ...input,
    diagnosticGold: repairedDiagnostic,
    propositionBundle: repairedBundle,
  });
  const localReaudit = await runLocal(repairedInput, '05-local-reaudit.json', client);
  const globalReaudit = await runGlobal(repairedInput, '06-global-reaudit.json', client);
  saveMerged(repairedInput, localReaudit, globalReaudit, '07-merged-reaudit.json');
}

function writeSummary(inputs: readonly ParagraphGoldAuditInput[], planHash: string): void {
  const records = inputs.map((input) => {
    const id = input.targetParagraph.paragraphId;
    const initial = readJson(stagePath(id, '03-merged-audit.json')) as StageArtifact<{ decision: string }>;
    const finalPath = stagePath(id, '07-merged-reaudit.json');
    const final = existsSync(finalPath)
      ? readJson(finalPath) as StageArtifact<{ decision: string }>
      : initial;
    const oldAudit = readJson(resolve(SOURCE_ROOT, input.sourceId, id, '04-audit.json')) as
      StageArtifact<{ decision: string }>;
    return {
      sourceId: input.sourceId,
      paragraphId: id,
      baselineInitialDecision: oldAudit.result.decision,
      splitInitialDecision: initial.result.decision,
      repairAttempted: existsSync(stagePath(id, '04-repair.json')),
      splitFinalDecision: final.result.decision,
    };
  });
  const usage = accumulatedUsage();
  const countBy = (key: 'baselineInitialDecision' | 'splitInitialDecision' | 'splitFinalDecision') =>
    records.reduce<Record<string, number>>((counts, record) => {
      counts[record[key]] = (counts[record[key]] ?? 0) + 1;
      return counts;
    }, {});
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'paragraph-gold-split-audit-experiment-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    paragraphCount: records.length,
    baselineInitialDecisionCounts: countBy('baselineInitialDecision'),
    splitInitialDecisionCounts: countBy('splitInitialDecision'),
    splitFinalDecisionCounts: countBy('splitFinalDecision'),
    repairAttemptCount: records.filter((record) => record.repairAttempted).length,
    usage,
    budgetUsd: BUDGET_USD,
    records,
  });
  writeJson(resolve(OUTPUT_ROOT, 'cost-summary.json'), {
    artifactType: 'paragraph-gold-split-audit-cost-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    ...usage,
    budgetUsd: BUDGET_USD,
    pricingUsdPerMillionTokens: PRICING,
  });
}

async function main(): Promise<void> {
  if (!existsSync(SOURCE_ROOT)) throw new Error(`배치004 원본 없음: ${SOURCE_ROOT}`);
  const inputs = paragraphDirectories().map(buildInput);
  if (inputs.length !== 18 || new Set(inputs.map((input) => input.sourceId)).size !== 3) {
    throw new Error(`배치004 범위 불일치: ${inputs.length}문단`);
  }
  const plan = buildPlan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { planHash?: string };
    if (existing.planHash !== plan.planHash) throw new Error('기존 실행 계획 해시와 현재 계획이 다름');
  } else {
    writeJson(planPath, { ...plan, createdAt: new Date().toISOString() });
  }
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...plan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, input] of inputs.entries()) {
    console.log(`[${index + 1}/${inputs.length}] ${input.targetParagraph.paragraphId}`);
    await runParagraph(input, client);
  }
  writeSummary(inputs, plan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: plan.planHash, ...accumulatedUsage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
