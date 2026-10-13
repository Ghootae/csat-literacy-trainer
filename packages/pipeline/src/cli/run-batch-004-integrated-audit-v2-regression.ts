import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PARAGRAPH_GOLD_AUDIT_V2_VERSION,
  PARAGRAPH_GOLD_PATCH_REPAIR_VERSION,
  ParagraphGoldAuditV2OutputSchema,
  ParagraphGoldPatchRepairOutputSchema,
  validateParagraphGoldAuditV2,
} from '../paragraph-analysis/audit-v2.js';
import {
  auditParagraphGoldV2WithOpenAI,
  loadParagraphGoldAuditV2Prompt,
  loadParagraphGoldPatchRepairPrompt,
  ParagraphGoldPatchRepairInputSchema,
  repairParagraphGoldByPatchWithOpenAI,
} from '../paragraph-analysis/audit-v2-runtime.js';
import {
  ParagraphPropositionBundleSchema,
  artifactHash,
} from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const VERSION = 'batch-004-integrated-audit-v2-regression-v2' as const;
const MODEL = 'gpt-5.6-terra';
const BUDGET_USD = 10;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = { audit: 10_000, repair: 10_000 } as const;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts',
);
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-integrated-audit-v2-batch004-regression-v2-2026-09-04',
);
const TARGETS = [
  '69c006f178128b2a9bedd2f3-p5',
  '69bffa62fa5063deffe19c88-p4',
  '69bffa62fa5063deffe19c88-p6',
  '69bffa62fa5063deffe19c88-p8',
] as const;

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
  readonly metadata: ParagraphGoldApiMetadata;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sourceDirectory(paragraphId: string): string {
  return resolve(BATCH_ROOT, paragraphId.split('-p')[0]!, paragraphId);
}

function buildInput(paragraphId: string): ParagraphGoldAuditInput {
  const directory = sourceDirectory(paragraphId);
  const source = readJson(resolve(directory, '00-source.json')) as SourceArtifact;
  if (source.paragraph.paragraphId !== paragraphId) throw new Error(`대상 문단 불일치: ${paragraphId}`);
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: source.sourceId,
    passageId: source.passageId,
    passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId,
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

function cost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    regular * PRICING.regularInput + usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput + usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function existingStages(): StageArtifact<unknown>[] {
  const stages: StageArtifact<unknown>[] = [];
  for (const paragraphId of TARGETS) {
    for (const name of ['01-audit-v2.json', '02-patch-repair.json', '03-reaudit-v2.json']) {
      const path = resolve(OUTPUT_ROOT, 'artifacts', paragraphId, name);
      if (existsSync(path)) stages.push(readJson(path) as StageArtifact<unknown>);
    }
  }
  return stages;
}

function usage() {
  const unique = new Map<string, number>();
  for (const stage of existingStages()) unique.set(stage.metadata.responseId, cost(stage.metadata));
  return {
    responseCount: unique.size,
    costUsd: [...unique.values()].reduce((sum, value) => sum + value, 0),
  };
}

function assertBudget(input: unknown, prompt: string, maximumOutputTokens: number): void {
  const spent = usage().costUsd;
  const maximumInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maximumCurrent = (
    maximumInputTokens * PRICING.cacheWriteInput + maximumOutputTokens * PRICING.output
  ) / 1_000_000;
  if (spent + maximumCurrent > BUDGET_USD) {
    throw new Error(`비용 상한 전 중단: 누적 $${spent.toFixed(4)}, 현재 최대 $${maximumCurrent.toFixed(4)}`);
  }
}

function saveStage<T>(path: string, artifact: StageArtifact<T>): void {
  if (existsSync(path)) throw new Error(`stage 덮어쓰기 금지: ${path}`);
  writeJson(path, artifact);
}

function plan(inputs: readonly ParagraphGoldAuditInput[]) {
  const core = {
    version: VERSION,
    sourcePolicy: 'BATCH_004_FROZEN_INITIAL_CANDIDATES',
    targetParagraphIds: TARGETS,
    inputs: inputs.map((input) => ({
      paragraphId: input.targetParagraph.paragraphId,
      sourceHash: artifactHash({
        passageParagraphs: input.passageParagraphs,
        targetParagraph: input.targetParagraph,
      }),
      diagnosticGoldHash: artifactHash(input.diagnosticGold),
      propositionBundleHash: artifactHash(input.propositionBundle),
    })),
    model: MODEL,
    effort: 'medium',
    serviceTier: 'default',
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    budgetUsd: BUDGET_USD,
    maximumCalls: TARGETS.length * 3,
    promptHashes: {
      audit: artifactHash(loadParagraphGoldAuditV2Prompt()),
      patchRepair: artifactHash(loadParagraphGoldPatchRepairPrompt()),
    },
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runAudit(
  input: ParagraphGoldAuditInput,
  name: '01-audit-v2.json' | '03-reaudit-v2.json',
  client: OpenAI,
) {
  const path = resolve(OUTPUT_ROOT, 'artifacts', input.targetParagraph.paragraphId, name);
  const inputHash = artifactHash({ version: PARAGRAPH_GOLD_AUDIT_V2_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact<unknown>;
    if (stage.inputHash !== inputHash) throw new Error(`감사 입력 해시 불일치: ${path}`);
    return validateParagraphGoldAuditV2(ParagraphGoldAuditV2OutputSchema.parse(stage.result), input);
  }
  assertBudget(input, loadParagraphGoldAuditV2Prompt(), MAX_OUTPUT_TOKENS.audit);
  const response = await auditParagraphGoldV2WithOpenAI(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS.audit,
    client,
  });
  saveStage(path, {
    artifactType: name === '01-audit-v2.json' ? 'paragraph-gold-audit-v2-stage-v1' : 'paragraph-gold-reaudit-v2-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    config: { model: MODEL, effort: 'medium', serviceTier: 'default', maxOutputTokens: MAX_OUTPUT_TOKENS.audit },
    result: response.result,
    metadata: response.metadata,
  });
  return response.result;
}

async function runParagraph(input: ParagraphGoldAuditInput, client: OpenAI): Promise<void> {
  const paragraphId = input.targetParagraph.paragraphId;
  const audit = await runAudit(input, '01-audit-v2.json', client);
  if (audit.decision !== 'REPAIR_REQUIRED') return;
  const repairInput = ParagraphGoldPatchRepairInputSchema.parse({ ...input, audit });
  const repairPath = resolve(OUTPUT_ROOT, 'artifacts', paragraphId, '02-patch-repair.json');
  const repairInputHash = artifactHash({ version: PARAGRAPH_GOLD_PATCH_REPAIR_VERSION, input: repairInput });
  let repairedDiagnostic;
  let repairedBundle;
  if (existsSync(repairPath)) {
    const stage = readJson(repairPath) as StageArtifact<{
      repair: unknown;
      diagnosticGold: unknown;
      propositionBundle: unknown;
    }>;
    if (stage.inputHash !== repairInputHash) throw new Error(`patch 수리 입력 해시 불일치: ${paragraphId}`);
    ParagraphGoldPatchRepairOutputSchema.parse(stage.result.repair);
    repairedDiagnostic = ParagraphDiagnosticGoldSchema.parse(stage.result.diagnosticGold);
    repairedBundle = ParagraphPropositionBundleSchema.parse(stage.result.propositionBundle);
  } else {
    assertBudget(repairInput, loadParagraphGoldPatchRepairPrompt(), MAX_OUTPUT_TOKENS.repair);
    const repaired = await repairParagraphGoldByPatchWithOpenAI(repairInput, {
      model: MODEL,
      maxOutputTokens: MAX_OUTPUT_TOKENS.repair,
      client,
    });
    repairedDiagnostic = repaired.diagnosticGold;
    repairedBundle = repaired.propositionBundle;
    saveStage(repairPath, {
      artifactType: 'paragraph-gold-patch-repair-stage-v1',
      createdAt: new Date().toISOString(),
      inputHash: repairInputHash,
      config: { model: MODEL, effort: 'medium', serviceTier: 'default', maxOutputTokens: MAX_OUTPUT_TOKENS.repair },
      result: {
        repair: repaired.result,
        diagnosticGold: repairedDiagnostic,
        propositionBundle: repairedBundle,
      },
      metadata: repaired.metadata,
    });
  }
  await runAudit(ParagraphGoldAuditInputSchema.parse({
    ...input,
    diagnosticGold: repairedDiagnostic,
    propositionBundle: repairedBundle,
  }), '03-reaudit-v2.json', client);
}

function writeSummary(inputs: readonly ParagraphGoldAuditInput[], planHash: string): void {
  const records = inputs.map((input) => {
    const id = input.targetParagraph.paragraphId;
    const root = resolve(OUTPUT_ROOT, 'artifacts', id);
    const initial = readJson(resolve(root, '01-audit-v2.json')) as StageArtifact<{ decision: string; issues: unknown[] }>;
    const finalPath = resolve(root, '03-reaudit-v2.json');
    const final = existsSync(finalPath)
      ? readJson(finalPath) as StageArtifact<{ decision: string; issues: unknown[] }>
      : initial;
    return {
      paragraphId: id,
      initialDecision: initial.result.decision,
      initialIssueCount: initial.result.issues.length,
      patchRepairAttempted: existsSync(resolve(root, '02-patch-repair.json')),
      finalDecision: final.result.decision,
      finalIssueCount: final.result.issues.length,
    };
  });
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'batch-004-integrated-audit-v2-regression-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    records,
    usage: usage(),
    budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const inputs = TARGETS.map(buildInput);
  const executionPlan = plan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { planHash?: string };
    if (existing.planHash !== executionPlan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else writeJson(planPath, { ...executionPlan, createdAt: new Date().toISOString() });
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...executionPlan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, input] of inputs.entries()) {
    console.log(`[${index + 1}/${inputs.length}] ${input.targetParagraph.paragraphId}`);
    await runParagraph(input, client);
  }
  writeSummary(inputs, executionPlan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: executionPlan.planHash, ...usage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
