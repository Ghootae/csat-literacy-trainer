import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION,
  ParagraphGoldAuditV2V4OutputSchema,
  evaluateParagraphGoldAuditV2V4,
  type ParagraphGoldAuditV2V4Evaluation,
  type ParagraphGoldAuditV2V4Output,
} from '../paragraph-analysis/audit-v2-v4.js';
import {
  auditParagraphGoldV2V4WithOpenAI,
  loadParagraphGoldAuditV2V4Prompt,
} from '../paragraph-analysis/audit-v2-v4-runtime.js';
import {
  PARAGRAPH_GOLD_PATCH_REPAIR_VERSION,
  ParagraphGoldPatchRepairOutputSchema,
} from '../paragraph-analysis/audit-v2.js';
import {
  ParagraphGoldPatchRepairInputSchema,
  loadParagraphGoldPatchRepairPrompt,
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

const VERSION = 'batch-004-integrated-audit-v2-v4-experiment-v1' as const;
const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const SERVICE_TIER = 'default' as const;
const BUDGET_USD = 10;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = { audit: 14_000, repair: 10_000 } as const;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts',
);
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-integrated-audit-v2-v4-batch004-2026-09-04',
);

const TARGETS = [
  {
    paragraphId: '69c006f178128b2a9bedd2f3-p5',
    role: 'KNOWN_DEFECT',
    expectedFailedChecks: ['PURPOSE_MEANS_OVERREACH'],
  },
  {
    paragraphId: '69bffa62fa5063deffe19c88-p4',
    role: 'KNOWN_DEFECT',
    expectedFailedChecks: ['UNSUPPORTED_TEMPORAL_QUALIFIER'],
  },
  {
    paragraphId: '69bffa62fa5063deffe19c88-p6',
    role: 'KNOWN_DEFECT',
    expectedFailedChecks: ['PRINCIPLE_EXCEPTION_COVERAGE'],
  },
  {
    paragraphId: '69bffa62fa5063deffe19c88-p8',
    role: 'KNOWN_DEFECT',
    expectedFailedChecks: ['NECESSARY_CONDITION_MODALITY', 'CONDITIONAL_BRANCH_COVERAGE'],
  },
  { paragraphId: '69bffa62fa5063deffe19c88-p1', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
  { paragraphId: '69bffa62fa5063deffe19c88-p5', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
  { paragraphId: '69bffa62fa5063deffe19c88-p7', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
  { paragraphId: '69c006f178128b2a9bedd2f3-p4', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p2', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p4', role: 'NORMAL_CONTROL', expectedFailedChecks: [] },
] as const;

type Target = (typeof TARGETS)[number];

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

interface AuditStageResult {
  readonly rawAudit: ParagraphGoldAuditV2V4Output;
  readonly normalizedAudit: ParagraphGoldAuditV2V4Evaluation['audit'];
  readonly principleExceptionAdjudication: ParagraphGoldAuditV2V4Evaluation['principleExceptionAdjudication'];
  readonly contractErrors: readonly string[];
}

interface StageArtifact<T> {
  readonly artifactType: string;
  readonly createdAt: string;
  readonly inputHash: string;
  readonly targetRole: Target['role'];
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

function allStagePaths(): string[] {
  return TARGETS.flatMap((target) => [
    resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, '01-integrated-audit.json'),
    resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, '02-patch-repair.json'),
    resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, '03-integrated-reaudit.json'),
  ]);
}

function usage(): { readonly responseCount: number; readonly costUsd: number } {
  const unique = new Map<string, number>();
  for (const path of allStagePaths()) {
    if (!existsSync(path)) continue;
    const stage = readJson(path) as StageArtifact<unknown>;
    unique.set(stage.metadata.responseId, cost(stage.metadata));
  }
  return {
    responseCount: unique.size,
    costUsd: [...unique.values()].reduce((sum, value) => sum + value, 0),
  };
}

function assertBudget(input: unknown, prompt: string, maximumOutputTokens: number): void {
  const spent = usage().costUsd;
  // UTF-8 바이트 수를 토큰 수로 간주해 실제보다 큰 보수적 입력 상한을 만든다.
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

function executionPlan(inputs: readonly ParagraphGoldAuditInput[]) {
  const core = {
    version: VERSION,
    purpose: 'integrated audit v2 plus v4 machine adjudication in one API call',
    sourcePolicy: 'BATCH_004_FROZEN_INITIAL_CANDIDATES',
    targets: TARGETS,
    inputs: inputs.map((input) => ({
      paragraphId: input.targetParagraph.paragraphId,
      sourceHash: artifactHash({
        passageParagraphs: input.passageParagraphs,
        targetParagraph: input.targetParagraph,
      }),
      diagnosticGoldHash: artifactHash(input.diagnosticGold),
      propositionBundleHash: artifactHash(input.propositionBundle),
    })),
    workflow: {
      knownDefects: 'integrated audit -> field patch repair if repairable -> integrated reaudit',
      normalControls: 'integrated audit only; never auto-repair controls',
    },
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maximumCalls: 18,
    budgetUsd: BUDGET_USD,
    promptHashes: {
      integratedAudit: artifactHash(loadParagraphGoldAuditV2V4Prompt()),
      patchRepair: artifactHash(loadParagraphGoldPatchRepairPrompt()),
    },
    outputSchemaVersion: PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

function storedEvaluation(
  stage: StageArtifact<AuditStageResult>,
  input: ParagraphGoldAuditInput,
): ParagraphGoldAuditV2V4Evaluation {
  const raw = ParagraphGoldAuditV2V4OutputSchema.parse(stage.result.rawAudit);
  const recalculated = evaluateParagraphGoldAuditV2V4(raw, input);
  if (artifactHash(recalculated) !== artifactHash({
    audit: stage.result.normalizedAudit,
    principleExceptionAdjudication: stage.result.principleExceptionAdjudication,
    contractErrors: stage.result.contractErrors,
  })) throw new Error(`저장 결과와 재계산 결과 불일치: ${input.targetParagraph.paragraphId}`);
  return recalculated;
}

async function runAudit(
  target: Target,
  input: ParagraphGoldAuditInput,
  name: '01-integrated-audit.json' | '03-integrated-reaudit.json',
  client: OpenAI,
): Promise<ParagraphGoldAuditV2V4Evaluation> {
  const path = resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, name);
  const inputHash = artifactHash({ version: PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact<AuditStageResult>;
    if (stage.inputHash !== inputHash) throw new Error(`감사 입력 해시 불일치: ${path}`);
    return storedEvaluation(stage, input);
  }
  assertBudget(input, loadParagraphGoldAuditV2V4Prompt(), MAX_OUTPUT_TOKENS.audit);
  const response = await auditParagraphGoldV2V4WithOpenAI(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS.audit,
    client,
  });
  saveStage(path, {
    artifactType: name === '01-integrated-audit.json'
      ? 'paragraph-gold-integrated-audit-v2-v4-stage-v1'
      : 'paragraph-gold-integrated-reaudit-v2-v4-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    targetRole: target.role,
    config: {
      model: MODEL,
      effort: EFFORT,
      serviceTier: SERVICE_TIER,
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS.audit,
    },
    result: {
      rawAudit: response.rawResult,
      normalizedAudit: response.evaluation.audit,
      principleExceptionAdjudication: response.evaluation.principleExceptionAdjudication,
      contractErrors: response.evaluation.contractErrors,
    },
    metadata: response.metadata,
  });
  return response.evaluation;
}

async function runKnownDefect(
  target: Target,
  input: ParagraphGoldAuditInput,
  client: OpenAI,
): Promise<void> {
  const evaluation = await runAudit(target, input, '01-integrated-audit.json', client);
  const audit = evaluation.audit;
  if (audit?.decision !== 'REPAIR_REQUIRED') return;

  const repairInput = ParagraphGoldPatchRepairInputSchema.parse({ ...input, audit });
  const repairPath = resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, '02-patch-repair.json');
  const repairInputHash = artifactHash({ version: PARAGRAPH_GOLD_PATCH_REPAIR_VERSION, input: repairInput });
  let repairedDiagnostic;
  let repairedBundle;
  if (existsSync(repairPath)) {
    const stage = readJson(repairPath) as StageArtifact<{
      repair: unknown;
      diagnosticGold: unknown;
      propositionBundle: unknown;
    }>;
    if (stage.inputHash !== repairInputHash) throw new Error(`patch 수리 입력 해시 불일치: ${target.paragraphId}`);
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
      targetRole: target.role,
      config: {
        model: MODEL,
        effort: EFFORT,
        serviceTier: SERVICE_TIER,
        maxRetries: MAX_RETRIES,
        maxOutputTokens: MAX_OUTPUT_TOKENS.repair,
      },
      result: {
        repair: repaired.result,
        diagnosticGold: repairedDiagnostic,
        propositionBundle: repairedBundle,
      },
      metadata: repaired.metadata,
    });
  }
  await runAudit(target, ParagraphGoldAuditInputSchema.parse({
    ...input,
    diagnosticGold: repairedDiagnostic,
    propositionBundle: repairedBundle,
  }), '03-integrated-reaudit.json', client);
}

function auditStage(paragraphId: string, name: string): StageArtifact<AuditStageResult> | null {
  const path = resolve(OUTPUT_ROOT, 'artifacts', paragraphId, name);
  return existsSync(path) ? readJson(path) as StageArtifact<AuditStageResult> : null;
}

function failedCheckIds(stage: StageArtifact<AuditStageResult>): string[] {
  return stage.result.normalizedAudit?.regressionChecks
    .filter((check) => check.status === 'FAIL')
    .map((check) => check.checkId) ?? [];
}

function writeSummary(planHash: string): void {
  const records = TARGETS.map((target) => {
    const initial = auditStage(target.paragraphId, '01-integrated-audit.json');
    if (initial === null) throw new Error(`초기 감사 산출물 누락: ${target.paragraphId}`);
    const final = auditStage(target.paragraphId, '03-integrated-reaudit.json');
    const initialFailedChecks = failedCheckIds(initial);
    const expectedDetected = target.expectedFailedChecks.every((check) => initialFailedChecks.includes(check));
    const initialAudit = initial.result.normalizedAudit;
    const finalAudit = final?.result.normalizedAudit ?? initialAudit;
    return {
      paragraphId: target.paragraphId,
      role: target.role,
      expectedFailedChecks: target.expectedFailedChecks,
      initialFailedChecks,
      expectedDetected,
      initialContractErrors: initial.result.contractErrors,
      initialDecision: initialAudit?.decision ?? 'CONTRACT_INVALID',
      initialPrincipleExceptionStatus:
        initial.result.principleExceptionAdjudication?.status ?? 'CONTRACT_INVALID',
      patchRepairAttempted: existsSync(resolve(
        OUTPUT_ROOT,
        'artifacts',
        target.paragraphId,
        '02-patch-repair.json',
      )),
      finalContractErrors: final?.result.contractErrors ?? initial.result.contractErrors,
      finalDecision: finalAudit?.decision ?? 'CONTRACT_INVALID',
      normalControlFalsePositive: target.role === 'NORMAL_CONTROL' && initialAudit?.decision !== 'PASS',
    };
  });
  const known = records.filter((record) => record.role === 'KNOWN_DEFECT');
  const controls = records.filter((record) => record.role === 'NORMAL_CONTROL');
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'batch-004-integrated-audit-v2-v4-experiment-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    records,
    metrics: {
      knownDefectParagraphsDetected: known.filter((record) => record.expectedDetected).length,
      knownDefectParagraphCount: known.length,
      knownRegressionChecksDetected: known.reduce(
        (sum, record) => sum + record.expectedFailedChecks.filter(
          (check) => record.initialFailedChecks.includes(check),
        ).length,
        0,
      ),
      knownRegressionCheckCount: known.reduce(
        (sum, record) => sum + record.expectedFailedChecks.length,
        0,
      ),
      repairedKnownDefectsPassing: known.filter(
        (record) => record.patchRepairAttempted && record.finalDecision === 'PASS',
      ).length,
      normalControlFalsePositiveCount: controls.filter(
        (record) => record.normalControlFalsePositive,
      ).length,
      normalControlCount: controls.length,
      contractInvalidCount: records.filter(
        (record) => record.initialDecision === 'CONTRACT_INVALID',
      ).length,
    },
    usage: usage(),
    budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const inputs = TARGETS.map((target) => buildInput(target.paragraphId));
  const plan = executionPlan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { planHash?: string };
    if (existing.planHash !== plan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else writeJson(planPath, { ...plan, createdAt: new Date().toISOString() });

  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...plan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, [target, input]] of TARGETS.map((target, i) => [target, inputs[i]!] as const).entries()) {
    console.log(`[${index + 1}/${TARGETS.length}] ${target.paragraphId} (${target.role})`);
    if (target.role === 'KNOWN_DEFECT') await runKnownDefect(target, input, client);
    else await runAudit(target, input, '01-integrated-audit.json', client);
  }
  writeSummary(plan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: plan.planHash, ...usage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
