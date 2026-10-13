import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_VERSION,
  PrincipleExceptionEvidenceOutputSchema,
  adjudicatePrincipleExceptionCoverage,
  type PrincipleExceptionAdjudication,
  type PrincipleExceptionEvidenceOutput,
} from '../paragraph-analysis/principle-exception-adjudicator.js';
import {
  extractPrincipleExceptionEvidenceWithOpenAI,
  loadPrincipleExceptionAdjudicatorPrompt,
} from '../paragraph-analysis/principle-exception-adjudicator-runtime.js';
import {
  ParagraphPropositionBundleSchema,
  artifactHash,
} from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const VERSION = 'principle-exception-adjudicator-batch004-v1' as const;
const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const SERVICE_TIER = 'default' as const;
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = 6_000;
const BUDGET_USD = 10;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts',
);
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/principle-exception-adjudicator-batch004-2026-09-04',
);
const INCIDENT_PATH = resolve(OUTPUT_ROOT, 'execution-incidents.json');

const TARGETS = [
  { paragraphId: '69bffa62fa5063deffe19c88-p6', role: 'KNOWN_DEFECT' },
  { paragraphId: '69bffa62fa5063deffe19c88-p5', role: 'COMPLETE_POSITIVE_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p1', role: 'NORMAL_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p7', role: 'NORMAL_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p4', role: 'NORMAL_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p8', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c006f178128b2a9bedd2f3-p4', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c006f178128b2a9bedd2f3-p5', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p2', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p4', role: 'NORMAL_CONTROL' },
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

interface StageArtifact {
  readonly artifactType: 'principle-exception-adjudication-stage-v1';
  readonly createdAt: string;
  readonly inputHash: string;
  readonly targetRole: Target['role'];
  readonly config: Record<string, unknown>;
  readonly evidence: PrincipleExceptionEvidenceOutput;
  readonly adjudication: PrincipleExceptionAdjudication;
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

function stagePath(paragraphId: string): string {
  return resolve(OUTPUT_ROOT, 'artifacts', paragraphId, '01-adjudication.json');
}

function failedParagraphIds(): ReadonlySet<string> {
  if (!existsSync(INCIDENT_PATH)) return new Set();
  const value = readJson(INCIDENT_PATH) as { readonly incidents?: readonly { readonly paragraphId?: string }[] };
  return new Set((value.incidents ?? []).flatMap((item) => item.paragraphId ? [item.paragraphId] : []));
}

function cost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    regular * PRICING.regularInput + usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput + usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function usage(): { readonly responseCount: number; readonly costUsd: number } {
  const unique = new Map<string, number>();
  for (const target of TARGETS) {
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

function assertBudget(input: unknown): void {
  const spent = usage().costUsd;
  const prompt = loadPrincipleExceptionAdjudicatorPrompt();
  // UTF-8 바이트 수는 실제 토큰 수보다 큰 보수적 입력 상한으로 사용한다.
  const maximumInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maximumCurrent = (
    maximumInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output
  ) / 1_000_000;
  if (spent + maximumCurrent > BUDGET_USD) {
    throw new Error(`비용 상한 전 중단: 누적 $${spent.toFixed(4)}, 현재 최대 $${maximumCurrent.toFixed(4)}`);
  }
}

function executionPlan(inputs: readonly ParagraphGoldAuditInput[]) {
  const core = {
    version: VERSION,
    purpose: 'PRINCIPLE_EXCEPTION_COVERAGE evidence extraction plus code adjudication',
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
    model: MODEL,
    effort: EFFORT,
    serviceTier: SERVICE_TIER,
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maximumCalls: TARGETS.length,
    budgetUsd: BUDGET_USD,
    promptHash: artifactHash(loadPrincipleExceptionAdjudicatorPrompt()),
    outputSchemaVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runTarget(
  target: Target,
  input: ParagraphGoldAuditInput,
  client: OpenAI,
): Promise<void> {
  const path = stagePath(target.paragraphId);
  const inputHash = artifactHash({ version: PRINCIPLE_EXCEPTION_ADJUDICATOR_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact;
    if (stage.inputHash !== inputHash) throw new Error(`입력 해시 불일치: ${path}`);
    const evidence = PrincipleExceptionEvidenceOutputSchema.parse(stage.evidence);
    const recalculated = adjudicatePrincipleExceptionCoverage(evidence, input);
    if (artifactHash(recalculated) !== artifactHash(stage.adjudication)) {
      throw new Error(`저장 판정과 재계산 판정 불일치: ${target.paragraphId}`);
    }
    return;
  }
  assertBudget(input);
  const response = await extractPrincipleExceptionEvidenceWithOpenAI(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    client,
  });
  const adjudication = adjudicatePrincipleExceptionCoverage(response.result, input);
  const stage: StageArtifact = {
    artifactType: 'principle-exception-adjudication-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    targetRole: target.role,
    config: {
      model: MODEL,
      effort: EFFORT,
      serviceTier: SERVICE_TIER,
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    evidence: response.result,
    adjudication,
    metadata: response.metadata,
  };
  writeJson(path, stage);
}

function writeSummary(planHash: string): void {
  const records = TARGETS.filter((target) => existsSync(stagePath(target.paragraphId))).map((target) => {
    const stage = readJson(stagePath(target.paragraphId)) as StageArtifact;
    return {
      paragraphId: target.paragraphId,
      role: target.role,
      applicability: stage.evidence.applicability,
      status: stage.adjudication.status,
      principleMissing: stage.adjudication.principle.missingComponents,
      exceptionMissing: stage.adjudication.exception.missingComponents,
      productionEligibleForThisCheck: stage.adjudication.productionEligibleForThisCheck,
    };
  });
  const known = records.find((record) => record.role === 'KNOWN_DEFECT')!;
  const positive = records.find((record) => record.role === 'COMPLETE_POSITIVE_CONTROL')!;
  const controls = records.filter((record) => record.role !== 'KNOWN_DEFECT');
  const failedIds = failedParagraphIds();
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'principle-exception-adjudicator-experiment-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    records,
    metrics: {
      knownDefectDetected: known.status === 'FAIL',
      knownDefectCentralityDetected: known.applicability === 'CENTRAL',
      completePositiveControlPassed:
        positive.applicability === 'CENTRAL' && positive.status === 'PASS',
      normalControlFalsePositiveCount: controls.filter((record) => record.status === 'FAIL').length,
      normalControlCount: controls.length,
      unevaluableCallCount: failedIds.size,
    },
    successCriteria: {
      knownDefectDetected: true,
      completePositiveControlPassed: true,
      normalControlFalsePositiveCount: 0,
    },
    usage: usage(),
    attemptedCallCount: usage().responseCount + failedIds.size,
    costNote: failedIds.size > 0
      ? '저장 전 로컬 검증에서 중단된 API 응답 비용은 response ID 부재로 합계에서 제외됨'
      : null,
    budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const inputs = TARGETS.map((target) => buildInput(target.paragraphId));
  const plan = executionPlan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { readonly planHash?: string };
    if (existing.planHash !== plan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else {
    writeJson(planPath, { ...plan, createdAt: new Date().toISOString() });
  }
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...plan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  const failedIds = failedParagraphIds();
  for (const [index, target] of TARGETS.entries()) {
    console.log(`[${index + 1}/${TARGETS.length}] ${target.paragraphId} (${target.role})`);
    if (failedIds.has(target.paragraphId)) {
      console.log(`  저장 전 실패 기록으로 재호출하지 않음: ${target.paragraphId}`);
      continue;
    }
    await runTarget(target, inputs[index]!, client);
  }
  writeSummary(plan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: plan.planHash, ...usage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
