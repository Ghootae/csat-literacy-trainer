import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PARAGRAPH_GOLD_AUDIT_V2_VERSION,
  ParagraphGoldAuditV2OutputSchema,
  validateParagraphGoldAuditV2,
  type ParagraphGoldAuditV2Output,
} from '../paragraph-analysis/audit-v2.js';
import {
  auditParagraphGoldV2WithOpenAI,
  loadParagraphGoldAuditV2Prompt,
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

const VERSION = 'batch-003-audit-v2-retrospective-v1' as const;
const CHECKPOINT = 'PG-AUDIT-C2' as const;
const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const SERVICE_TIER = 'default' as const;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = 10_000;
const BUDGET_USD = 10;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-003-three-passages',
);
const ARTIFACT_ROOT = resolve(BATCH_ROOT, 'artifacts');
const APPROVED_MANIFEST_PATH = resolve(BATCH_ROOT, 'approved-manifest-v1.json');
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-audit-v2-batch003-retrospective-2026-09-04',
);

interface ApprovedManifest {
  readonly paragraphs: readonly { readonly sourceId: string; readonly paragraphId: string }[];
}

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

interface LegacyAudit {
  readonly decision: 'PASS' | 'REPAIR_REQUIRED' | 'BLOCKING' | 'UNRESOLVED';
  readonly issues: readonly {
    readonly category: string;
    readonly targetType: string;
    readonly targetId: string | null;
    readonly description: string;
  }[];
}

interface LegacyAuditStage {
  readonly result: LegacyAudit;
}

interface StageArtifact {
  readonly artifactType: 'paragraph-gold-audit-v2-retrospective-stage-v1';
  readonly createdAt: string;
  readonly inputHash: string;
  readonly baselineClass: BaselineClass;
  readonly config: Record<string, unknown>;
  readonly result: ParagraphGoldAuditV2Output;
  readonly metadata: ParagraphGoldApiMetadata;
}

type BaselineClass = 'DIRECT_PASS_CONTROL' | 'AUTO_REPAIR_SUCCESS' | 'SEMIAUTOMATIC_REQUIRED';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function paragraphDirectory(sourceId: string, paragraphId: string): string {
  return resolve(ARTIFACT_ROOT, sourceId, paragraphId);
}

function targets(): readonly { readonly sourceId: string; readonly paragraphId: string }[] {
  const manifest = readJson(APPROVED_MANIFEST_PATH) as ApprovedManifest;
  if (manifest.paragraphs.length !== 16) throw new Error('배치003 승인 문단이 16개가 아님');
  return [...manifest.paragraphs]
    .map(({ sourceId, paragraphId }) => ({ sourceId, paragraphId }))
    .sort((left, right) => left.paragraphId.localeCompare(right.paragraphId));
}

function buildInput(target: { readonly sourceId: string; readonly paragraphId: string }): ParagraphGoldAuditInput {
  const directory = paragraphDirectory(target.sourceId, target.paragraphId);
  const source = readJson(resolve(directory, '00-source.json')) as SourceArtifact;
  if (source.sourceId !== target.sourceId || source.paragraph.paragraphId !== target.paragraphId) {
    throw new Error(`원천 ID 불일치: ${target.paragraphId}`);
  }
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: source.sourceId,
    passageId: source.passageId,
    passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId: target.paragraphId,
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

function legacyAudit(target: { readonly sourceId: string; readonly paragraphId: string }): LegacyAudit {
  const path = resolve(paragraphDirectory(target.sourceId, target.paragraphId), '04-audit.json');
  return (readJson(path) as LegacyAuditStage).result;
}

function baselineClass(target: { readonly sourceId: string; readonly paragraphId: string }): BaselineClass {
  const directory = paragraphDirectory(target.sourceId, target.paragraphId);
  if (legacyAudit(target).decision === 'PASS') return 'DIRECT_PASS_CONTROL';
  const reauditPath = resolve(directory, '06-reaudit.json');
  if (!existsSync(reauditPath)) throw new Error(`기존 재감사 누락: ${target.paragraphId}`);
  const reaudit = (readJson(reauditPath) as LegacyAuditStage).result;
  return reaudit.decision === 'PASS' ? 'AUTO_REPAIR_SUCCESS' : 'SEMIAUTOMATIC_REQUIRED';
}

function stagePath(paragraphId: string): string {
  return resolve(OUTPUT_ROOT, 'artifacts', paragraphId, '01-audit-v2.json');
}

function cost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    regular * PRICING.regularInput + usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput + usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function usage(targetList: readonly { readonly paragraphId: string }[]) {
  const unique = new Map<string, number>();
  for (const target of targetList) {
    const path = stagePath(target.paragraphId);
    if (!existsSync(path)) continue;
    const stage = readJson(path) as StageArtifact;
    unique.set(stage.metadata.responseId, cost(stage.metadata));
  }
  return {
    responseCount: unique.size,
    costUsd: [...unique.values()].reduce((sum, value) => sum + value, 0),
  };
}

function assertBudget(
  targetList: readonly { readonly paragraphId: string }[],
  input: ParagraphGoldAuditInput,
): void {
  const spent = usage(targetList).costUsd;
  const prompt = loadParagraphGoldAuditV2Prompt();
  const maximumInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maximumCurrent = (
    maximumInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output
  ) / 1_000_000;
  if (spent + maximumCurrent > BUDGET_USD) {
    throw new Error(`비용 상한 전 중단: 누적 $${spent.toFixed(4)}, 현재 최대 $${maximumCurrent.toFixed(4)}`);
  }
}

function executionPlan(
  targetList: readonly { readonly sourceId: string; readonly paragraphId: string }[],
  inputs: readonly ParagraphGoldAuditInput[],
) {
  const core = {
    version: VERSION,
    checkpoint: CHECKPOINT,
    purpose: 'compare pre-adjudicator integrated audit v2 with the original batch003 first audit',
    sourcePolicy: 'BATCH_003_FROZEN_INITIAL_CANDIDATES',
    comparisonPolicy: 'AUDIT_ONLY_NO_REPAIR_NO_REAUDIT',
    targets: targetList.map((target, index) => ({
      ...target,
      baselineClass: baselineClass(target),
      sourceHash: artifactHash({
        passageParagraphs: inputs[index]!.passageParagraphs,
        targetParagraph: inputs[index]!.targetParagraph,
      }),
      diagnosticGoldHash: artifactHash(inputs[index]!.diagnosticGold),
      propositionBundleHash: artifactHash(inputs[index]!.propositionBundle),
      legacyAuditHash: artifactHash(legacyAudit(target)),
    })),
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    exactCalls: 16,
    budgetUsd: BUDGET_USD,
    promptHash: artifactHash(loadParagraphGoldAuditV2Prompt()),
    outputSchemaVersion: PARAGRAPH_GOLD_AUDIT_V2_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runTarget(
  targetList: readonly { readonly paragraphId: string }[],
  target: { readonly sourceId: string; readonly paragraphId: string },
  input: ParagraphGoldAuditInput,
  client: OpenAI,
): Promise<void> {
  const path = stagePath(target.paragraphId);
  const inputHash = artifactHash({ version: PARAGRAPH_GOLD_AUDIT_V2_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact;
    if (stage.inputHash !== inputHash) throw new Error(`감사 입력 해시 불일치: ${target.paragraphId}`);
    validateParagraphGoldAuditV2(ParagraphGoldAuditV2OutputSchema.parse(stage.result), input);
    return;
  }
  assertBudget(targetList, input);
  const response = await auditParagraphGoldV2WithOpenAI(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    client,
  });
  writeJson(path, {
    artifactType: 'paragraph-gold-audit-v2-retrospective-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    baselineClass: baselineClass(target),
    config: {
      model: MODEL,
      effort: EFFORT,
      serviceTier: SERVICE_TIER,
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    result: response.result,
    metadata: response.metadata,
  } satisfies StageArtifact);
}

function writeSummary(targetList: readonly { readonly sourceId: string; readonly paragraphId: string }[], planHash: string): void {
  const records = targetList.map((target) => {
    const stage = readJson(stagePath(target.paragraphId)) as StageArtifact;
    const old = legacyAudit(target);
    const expectedRepair = stage.baselineClass !== 'DIRECT_PASS_CONTROL';
    const v2Repair = stage.result.decision !== 'PASS';
    return {
      paragraphId: target.paragraphId,
      baselineClass: stage.baselineClass,
      legacyDecision: old.decision,
      legacyIssueCount: old.issues.length,
      legacyIssues: old.issues,
      auditV2Decision: stage.result.decision,
      auditV2IssueCount: stage.result.issues.length,
      auditV2Issues: stage.result.issues,
      routingMatchesApprovedHistory: expectedRepair === v2Repair,
      directPassFalsePositive: stage.baselineClass === 'DIRECT_PASS_CONTROL' && v2Repair,
      missedRepairCandidate: expectedRepair && !v2Repair,
    };
  });
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'batch-003-audit-v2-retrospective-summary-v1',
    createdAt: new Date().toISOString(),
    checkpoint: CHECKPOINT,
    planHash,
    records,
    metrics: {
      routingMatches: records.filter((record) => record.routingMatchesApprovedHistory).length,
      paragraphCount: records.length,
      directPassControlsPassing: records.filter(
        (record) => record.baselineClass === 'DIRECT_PASS_CONTROL' && record.auditV2Decision === 'PASS',
      ).length,
      directPassControlCount: records.filter(
        (record) => record.baselineClass === 'DIRECT_PASS_CONTROL',
      ).length,
      repairCandidatesDetected: records.filter(
        (record) => record.baselineClass !== 'DIRECT_PASS_CONTROL' && record.auditV2Decision !== 'PASS',
      ).length,
      repairCandidateCount: records.filter(
        (record) => record.baselineClass !== 'DIRECT_PASS_CONTROL',
      ).length,
      semiautomaticCandidatesDetected: records.filter(
        (record) => record.baselineClass === 'SEMIAUTOMATIC_REQUIRED' && record.auditV2Decision !== 'PASS',
      ).length,
      semiautomaticCandidateCount: records.filter(
        (record) => record.baselineClass === 'SEMIAUTOMATIC_REQUIRED',
      ).length,
    },
    issueLevelInterpretation: {
      status: 'PENDING_SEMANTIC_COMPARISON',
      note: 'PGC-008~PGC-012 및 PGC-014~PGC-015의 7개 최초 결함과 v2 issue를 별도 대조한다. PGC-013은 기존 수리가 만든 회귀라 최초 후보 감사 평가에서 제외한다.',
    },
    usage: usage(targetList),
    budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const targetList = targets();
  const inputs = targetList.map(buildInput);
  const plan = executionPlan(targetList, inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { readonly planHash?: string };
    if (existing.planHash !== plan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else writeJson(planPath, { ...plan, createdAt: new Date().toISOString() });

  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...plan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, target] of targetList.entries()) {
    console.log(`[${index + 1}/${targetList.length}] ${target.paragraphId} (${baselineClass(target)})`);
    await runTarget(targetList, target, inputs[index]!, client);
  }
  writeSummary(targetList, plan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: plan.planHash, ...usage(targetList) }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
