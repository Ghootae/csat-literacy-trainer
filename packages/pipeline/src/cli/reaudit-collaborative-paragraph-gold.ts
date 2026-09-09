import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PARAGRAPH_GOLD_AUDIT_VERSION,
  ParagraphGoldAuditOutputSchema,
  ParagraphPropositionBundleSchema,
  ProspectiveParagraphGoldManifestSchema,
  artifactHash,
  validateParagraphGoldAudit,
  type ParagraphGoldAuditOutput,
} from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  auditParagraphGoldWithOpenAI,
  loadParagraphGoldAuditPrompt,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const POST_REPAIR = process.argv.includes('--post-repair');
const VERSION = POST_REPAIR
  ? 'collaborative-paragraph-gold-post-repair-audit-v1'
  : 'collaborative-paragraph-gold-reaudit-v1';
const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const SERVICE_TIER = 'default' as const;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = 8_000;
const BUDGET_USD = POST_REPAIR ? 1 : 2;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const SOURCE_MANIFEST_PATH = resolve(
  PROJECT_ROOT,
  'packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json',
);
const PRODUCTION_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04',
);
const APPROVAL_MANIFEST_PATHS = [
  resolve(PRODUCTION_ROOT, 'canary-approved-manifest-v1.json'),
  resolve(PRODUCTION_ROOT, 'batches/paragraph-gold-batch-002-next-10/approved-manifest-v1.json'),
  resolve(PRODUCTION_ROOT, 'batches/paragraph-gold-batch-003-three-passages/approved-manifest-v1.json'),
  resolve(PRODUCTION_ROOT, 'batches/paragraph-gold-batch-004-three-passages/approved-manifest-v1.json'),
] as const;
const BASE_OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09',
);
const OUTPUT_ROOT = POST_REPAIR ? resolve(BASE_OUTPUT_ROOT, 'post-repair-audit') : BASE_OUTPUT_ROOT;
const REPAIR_OVERLAY_PATH = resolve(BASE_OUTPUT_ROOT, 'repair-approved-overlay-v1.json');

interface ApprovalEntry {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly approvalLabel: string;
  readonly productionEligible: boolean;
  readonly approvedDiagnosticGold: { readonly path: string; readonly hash: string };
  readonly approvedPropositionBundle: { readonly path: string; readonly hash: string };
}

interface ApprovalManifest {
  readonly batchId: string;
  readonly paragraphs: readonly ApprovalEntry[];
}

interface RepairOverlay {
  readonly paragraphs: readonly (ApprovalEntry & {
    readonly batchId: string;
    readonly disposition: 'REPAIRED' | 'ACCEPTED_UNCHANGED';
  })[];
}

interface Target extends ApprovalEntry {
  readonly batchId: string;
  readonly approvalManifestPath: string;
}

interface StageArtifact {
  readonly artifactType: 'collaborative-paragraph-gold-reaudit-stage-v1';
  readonly createdAt: string;
  readonly inputHash: string;
  readonly config: Record<string, unknown>;
  readonly result: ParagraphGoldAuditOutput;
  readonly metadata: ParagraphGoldApiMetadata;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function projectPath(path: string): string {
  return path.slice(PROJECT_ROOT.length + 1);
}

function targets(): readonly Target[] {
  const values = (POST_REPAIR
    ? (readJson(REPAIR_OVERLAY_PATH) as RepairOverlay).paragraphs
        .filter((entry) => entry.disposition === 'REPAIRED')
        .map((entry) => ({
          ...entry,
          approvalManifestPath: projectPath(REPAIR_OVERLAY_PATH),
        }))
    : APPROVAL_MANIFEST_PATHS.flatMap((path) => {
        const manifest = readJson(path) as ApprovalManifest;
        return manifest.paragraphs
          .filter((entry) => entry.approvalLabel === 'SEMIAUTOMATIC_USER_AGENT_APPROVED')
          .map((entry) => ({
            ...entry,
            batchId: manifest.batchId,
            approvalManifestPath: projectPath(path),
          }));
      }))
    .sort((left, right) => left.paragraphId.localeCompare(right.paragraphId));
  const expected = POST_REPAIR ? 5 : 16;
  if (values.length !== expected) throw new Error(`재감사 대상 수가 ${expected}개가 아님: ${values.length}`);
  if (new Set(values.map((value) => value.paragraphId)).size !== values.length) {
    throw new Error('협업 승인 문단 ID가 중복됨');
  }
  if (values.some((value) => value.productionEligible !== true)) {
    throw new Error('협업 승인 manifest에 productionEligible=false 항목이 있음');
  }
  return values;
}

function buildInput(target: Target): ParagraphGoldAuditInput {
  const manifest = ProspectiveParagraphGoldManifestSchema.parse(readJson(SOURCE_MANIFEST_PATH));
  const passage = manifest.passages.find((value) => value.sourceId === target.sourceId);
  const paragraph = passage?.paragraphs.find((value) => value.paragraphId === target.paragraphId);
  if (passage === undefined || paragraph === undefined) {
    throw new Error(`원천 manifest에서 문단을 찾지 못함: ${target.paragraphId}`);
  }
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(
    readJson(resolve(PROJECT_ROOT, target.approvedDiagnosticGold.path)),
  );
  const propositionBundle = ParagraphPropositionBundleSchema.parse(
    readJson(resolve(PROJECT_ROOT, target.approvedPropositionBundle.path)),
  );
  if (artifactHash(diagnosticGold) !== target.approvedDiagnosticGold.hash) {
    throw new Error(`승인 진단 골드 해시 불일치: ${target.paragraphId}`);
  }
  if (artifactHash(propositionBundle) !== target.approvedPropositionBundle.hash) {
    throw new Error(`승인 명제 Bundle 해시 불일치: ${target.paragraphId}`);
  }
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: passage.sourceId,
    passageId: passage.passageId,
    passageParagraphs: passage.paragraphs.map((value) => ({
      paragraphId: value.paragraphId,
      position: value.position,
      text: value.text,
    })),
    targetParagraph: {
      paragraphId: paragraph.paragraphId,
      position: paragraph.position,
      text: paragraph.text,
      textReferencesVisual: paragraph.textReferencesVisual,
      passageMediaCount: passage.mediaCount,
    },
    diagnosticGold,
    propositionBundle,
  });
}

function stagePath(paragraphId: string): string {
  return resolve(OUTPUT_ROOT, 'artifacts', paragraphId, '01-independent-reaudit-v1.json');
}

function cost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    regular * PRICING.regularInput + usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput + usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function usage(targetList: readonly Target[]) {
  const responses = new Map<string, number>();
  for (const target of targetList) {
    const path = stagePath(target.paragraphId);
    if (!existsSync(path)) continue;
    const stage = readJson(path) as StageArtifact;
    responses.set(stage.metadata.responseId, cost(stage.metadata));
  }
  return {
    responseCount: responses.size,
    costUsd: [...responses.values()].reduce((sum, value) => sum + value, 0),
    responses: [...responses.entries()].map(([responseId, costUsd]) => ({ responseId, costUsd })),
  };
}

function assertBudget(targetList: readonly Target[], input: ParagraphGoldAuditInput): void {
  const spent = usage(targetList).costUsd;
  const maximumInputTokens = Buffer.byteLength(
    `${loadParagraphGoldAuditPrompt()}\n${JSON.stringify(input)}`,
    'utf8',
  );
  const maximumCurrent = (
    maximumInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output
  ) / 1_000_000;
  if (spent + maximumCurrent > BUDGET_USD) {
    throw new Error(
      `비용 상한 전 중단: 누적 $${spent.toFixed(4)}, ` +
      `현재 호출 보수적 최대 $${maximumCurrent.toFixed(4)}, 허용 $${BUDGET_USD.toFixed(2)}`,
    );
  }
}

function executionPlan(targetList: readonly Target[], inputs: readonly ParagraphGoldAuditInput[]) {
  const core = {
    version: VERSION,
    purpose: POST_REPAIR
      ? 'independently audit the five approved 2026-09-09 repair artifacts'
      : 'independently reaudit the 16 collaboratively repaired and user-approved paragraph gold pairs',
    sourcePolicy: POST_REPAIR
      ? 'REPAIR_APPROVED_OVERLAY_REPAIRED_ARTIFACTS_ONLY'
      : 'FINAL_APPROVED_MANIFEST_ARTIFACTS_ONLY',
    mutationPolicy: 'AUDIT_ONLY_NO_GOLD_MUTATION_NO_AUTOMATIC_REPAIR',
    targetCount: targetList.length,
    targets: targetList.map((target, index) => ({
      batchId: target.batchId,
      sourceId: target.sourceId,
      paragraphId: target.paragraphId,
      approvalManifestPath: target.approvalManifestPath,
      diagnosticGoldPath: target.approvedDiagnosticGold.path,
      diagnosticGoldHash: target.approvedDiagnosticGold.hash,
      propositionBundlePath: target.approvedPropositionBundle.path,
      propositionBundleHash: target.approvedPropositionBundle.hash,
      auditInputHash: artifactHash(inputs[index]!),
    })),
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    exactMaximumCalls: targetList.length,
    budgetUsd: BUDGET_USD,
    pricingContract: 'project-historical-accounting-2026-09-04',
    pricingUsdPerMillionTokens: PRICING,
    promptVersion: 'paragraph-gold-audit-prompt-v1',
    promptHash: artifactHash(loadParagraphGoldAuditPrompt()),
    outputSchemaVersion: PARAGRAPH_GOLD_AUDIT_VERSION,
    sourceManifestPath: projectPath(SOURCE_MANIFEST_PATH),
    sourceManifestHash: artifactHash(
      ProspectiveParagraphGoldManifestSchema.parse(readJson(SOURCE_MANIFEST_PATH)),
    ),
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runTarget(
  targetList: readonly Target[],
  target: Target,
  input: ParagraphGoldAuditInput,
  client: OpenAI,
): Promise<void> {
  const path = stagePath(target.paragraphId);
  const config = {
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    promptVersion: 'paragraph-gold-audit-prompt-v1',
    promptHash: artifactHash(loadParagraphGoldAuditPrompt()),
  };
  const inputHash = artifactHash({ version: VERSION, input, config });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact;
    if (stage.inputHash !== inputHash || artifactHash(stage.config) !== artifactHash(config)) {
      throw new Error(`기존 재감사 산출물의 입력 또는 설정 불일치: ${target.paragraphId}`);
    }
    validateParagraphGoldAudit({
      audit: ParagraphGoldAuditOutputSchema.parse(stage.result),
      sourceId: input.sourceId,
      diagnosticGold: input.diagnosticGold,
      propositionBundle: input.propositionBundle,
    });
    return;
  }
  assertBudget(targetList, input);
  const response = await auditParagraphGoldWithOpenAI(input, {
    model: MODEL,
    effort: EFFORT,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    client,
  });
  writeJson(path, {
    artifactType: 'collaborative-paragraph-gold-reaudit-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    config,
    result: response.result,
    metadata: response.metadata,
  } satisfies StageArtifact);
}

function writeSummary(targetList: readonly Target[], planHash: string): void {
  const records = targetList.map((target) => {
    const stage = readJson(stagePath(target.paragraphId)) as StageArtifact;
    return {
      batchId: target.batchId,
      sourceId: target.sourceId,
      paragraphId: target.paragraphId,
      priorApprovalLabel: target.approvalLabel,
      diagnosticGoldHash: target.approvedDiagnosticGold.hash,
      propositionBundleHash: target.approvedPropositionBundle.hash,
      decision: stage.result.decision,
      independentlyReaudited: true,
      independentAuditPassed: stage.result.decision === 'PASS',
      summary: stage.result.summary,
      issues: stage.result.issues,
      auditArtifactPath: projectPath(stagePath(target.paragraphId)),
      auditArtifactHash: artifactHash(stage),
    };
  });
  const decisionCounts = Object.fromEntries(
    ['PASS', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED'].map((decision) => [
      decision,
      records.filter((record) => record.decision === decision).length,
    ]),
  );
  writeJson(resolve(OUTPUT_ROOT, 'reaudit-summary.json'), {
    artifactType: POST_REPAIR
      ? 'collaborative-paragraph-gold-post-repair-audit-summary-v1'
      : 'collaborative-paragraph-gold-reaudit-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    targetCount: records.length,
    decisionCounts,
    allPassed: records.every((record) => record.independentAuditPassed),
    records,
    usage: usage(targetList),
    budgetUsd: BUDGET_USD,
    interpretation: {
      pass: POST_REPAIR
        ? '2026-09-09 제한 수리본이 현재 독립 감사 v1을 통과함'
        : '협업 수정본이 현재 독립 감사 v1을 통과함',
      nonPass: POST_REPAIR
        ? '수리 승인을 삭제하지 않지만 추가 수동 판정이 필요함'
        : '기존 사용자 승인을 삭제하지 않지만 독립 감사 완료 자산으로 승격하지 않음',
    },
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
    if (existing.planHash !== plan.planHash) throw new Error('기존 실행 계획과 현재 계획 해시 불일치');
  } else {
    writeJson(planPath, { ...plan, createdAt: new Date().toISOString() });
  }

  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...plan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, target] of targetList.entries()) {
    console.log(`[${index + 1}/${targetList.length}] ${target.paragraphId}`);
    await runTarget(targetList, target, inputs[index]!, client);
  }
  writeSummary(targetList, plan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: plan.planHash, ...usage(targetList) }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
