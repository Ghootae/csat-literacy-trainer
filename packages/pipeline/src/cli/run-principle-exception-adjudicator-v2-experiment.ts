import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_V2_VERSION,
  PrincipleExceptionEvidenceV2OutputSchema,
  adjudicatePrincipleExceptionCoverageV2,
  type PrincipleExceptionAdjudicationV2,
  type PrincipleExceptionEvidenceV2Output,
} from '../paragraph-analysis/principle-exception-adjudicator-v2.js';
import {
  extractPrincipleExceptionEvidenceV2WithOpenAI,
  loadPrincipleExceptionAdjudicatorV2Prompt,
} from '../paragraph-analysis/principle-exception-adjudicator-v2-runtime.js';
import { ParagraphPropositionBundleSchema, artifactHash } from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const VERSION = 'principle-exception-adjudicator-v2-five-case-v1' as const;
const MODEL = 'gpt-5.6-terra';
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
  'docs/experiments/principle-exception-adjudicator-v2-five-case-2026-09-04',
);

const TARGETS = [
  { paragraphId: '69bffa62fa5063deffe19c88-p6', role: 'KNOWN_DEFECT', expectedStatus: 'FAIL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p5', role: 'COMPLETE_POSITIVE_CONTROL', expectedStatus: 'PASS' },
  { paragraphId: '69bffa62fa5063deffe19c88-p7', role: 'PASSAGE_CONTEXT_CONTROL', expectedStatus: 'OUT_OF_PARAGRAPH_SCOPE' },
  { paragraphId: '69bffa62fa5063deffe19c88-p4', role: 'PREVIOUSLY_UNEVALUABLE_CONTROL', expectedStatus: 'NOT_APPLICABLE' },
  { paragraphId: '69c006f178128b2a9bedd2f3-p4', role: 'PREVIOUSLY_UNEVALUABLE_CONTROL', expectedStatus: 'NOT_APPLICABLE' },
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
  readonly artifactType: 'principle-exception-adjudication-v2-stage-v1';
  readonly createdAt: string;
  readonly inputHash: string;
  readonly targetRole: Target['role'];
  readonly expectedStatus: Target['expectedStatus'];
  readonly config: Record<string, unknown>;
  readonly evidence: PrincipleExceptionEvidenceV2Output;
  readonly adjudication: PrincipleExceptionAdjudicationV2;
  readonly metadata: ParagraphGoldApiMetadata;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildInput(paragraphId: string): ParagraphGoldAuditInput {
  const passageId = paragraphId.split('-p')[0]!;
  const directory = resolve(BATCH_ROOT, passageId, paragraphId);
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
  return resolve(OUTPUT_ROOT, 'artifacts', paragraphId, '01-adjudication-v2.json');
}

function cost(metadata: ParagraphGoldApiMetadata): number {
  const usage = metadata.usage;
  const regular = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  return (
    regular * PRICING.regularInput + usage.cachedInputTokens * PRICING.cachedInput +
    usage.cacheWriteTokens * PRICING.cacheWriteInput + usage.outputTokens * PRICING.output
  ) / 1_000_000;
}

function usage() {
  const unique = new Map<string, number>();
  for (const target of TARGETS) {
    const path = stagePath(target.paragraphId);
    if (!existsSync(path)) continue;
    const stage = readJson(path) as StageArtifact;
    unique.set(stage.metadata.responseId, cost(stage.metadata));
  }
  return { responseCount: unique.size, costUsd: [...unique.values()].reduce((a, b) => a + b, 0) };
}

function assertBudget(input: unknown): void {
  const prompt = loadPrincipleExceptionAdjudicatorV2Prompt();
  const maximumInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maximumCurrent = (
    maximumInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output
  ) / 1_000_000;
  if (usage().costUsd + maximumCurrent > BUDGET_USD) {
    throw new Error(`비용 상한 전 중단: 누적 $${usage().costUsd.toFixed(4)}, 현재 최대 $${maximumCurrent.toFixed(4)}`);
  }
}

function plan(inputs: readonly ParagraphGoldAuditInput[]) {
  const core = {
    version: VERSION,
    sourcePolicy: 'BATCH_004_FROZEN_INITIAL_CANDIDATES',
    targets: TARGETS,
    inputs: inputs.map((input) => ({
      paragraphId: input.targetParagraph.paragraphId,
      sourceHash: artifactHash({ passageParagraphs: input.passageParagraphs, targetParagraph: input.targetParagraph }),
      diagnosticGoldHash: artifactHash(input.diagnosticGold),
      propositionBundleHash: artifactHash(input.propositionBundle),
    })),
    model: MODEL,
    effort: 'medium',
    serviceTier: 'default',
    maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maximumCalls: TARGETS.length,
    budgetUsd: BUDGET_USD,
    promptHash: artifactHash(loadPrincipleExceptionAdjudicatorV2Prompt()),
    outputSchemaVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_V2_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runTarget(target: Target, input: ParagraphGoldAuditInput, client: OpenAI): Promise<void> {
  const path = stagePath(target.paragraphId);
  const inputHash = artifactHash({ version: PRINCIPLE_EXCEPTION_ADJUDICATOR_V2_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact;
    if (stage.inputHash !== inputHash) throw new Error(`입력 해시 불일치: ${target.paragraphId}`);
    const evidence = PrincipleExceptionEvidenceV2OutputSchema.parse(stage.evidence);
    const recalculated = adjudicatePrincipleExceptionCoverageV2(evidence, input);
    if (artifactHash(recalculated) !== artifactHash(stage.adjudication)) {
      throw new Error(`저장 판정과 재계산 판정 불일치: ${target.paragraphId}`);
    }
    return;
  }
  assertBudget(input);
  const response = await extractPrincipleExceptionEvidenceV2WithOpenAI(input, {
    model: MODEL,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    client,
  });
  const adjudication = adjudicatePrincipleExceptionCoverageV2(response.result, input);
  writeJson(path, {
    artifactType: 'principle-exception-adjudication-v2-stage-v1',
    createdAt: new Date().toISOString(),
    inputHash,
    targetRole: target.role,
    expectedStatus: target.expectedStatus,
    config: {
      model: MODEL,
      effort: 'medium',
      serviceTier: 'default',
      maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    evidence: response.result,
    adjudication,
    metadata: response.metadata,
  } satisfies StageArtifact);
}

function writeSummary(planHash: string): void {
  const records = TARGETS.map((target) => {
    const stage = readJson(stagePath(target.paragraphId)) as StageArtifact;
    return {
      paragraphId: target.paragraphId,
      role: target.role,
      expectedStatus: target.expectedStatus,
      applicability: stage.evidence.applicability,
      principleSourceScope: stage.evidence.principle.sourceScope,
      exceptionSourceScope: stage.evidence.exception.sourceScope,
      actualStatus: stage.adjudication.status,
      matchedExpectation: stage.adjudication.status === target.expectedStatus,
      contractWarnings: stage.adjudication.contractWarnings,
      productionEligibleForThisCheck: stage.adjudication.productionEligibleForThisCheck,
    };
  });
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'principle-exception-adjudicator-v2-five-case-summary-v1',
    createdAt: new Date().toISOString(),
    planHash,
    records,
    metrics: {
      matchedExpectationCount: records.filter((record) => record.matchedExpectation).length,
      targetCount: records.length,
      falseFailCount: records.filter(
        (record) => record.expectedStatus !== 'FAIL' && record.actualStatus === 'FAIL',
      ).length,
      unresolvedCount: records.filter(
        (record) => ['DEFER_TO_SOURCE_FIDELITY', 'UNRESOLVED_SOURCE_SCOPE'].includes(record.actualStatus),
      ).length,
      contractWarningCount: records.reduce((sum, record) => sum + record.contractWarnings.length, 0),
    },
    usage: usage(),
    budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const inputs = TARGETS.map((target) => buildInput(target.paragraphId));
  const executionPlan = plan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { readonly planHash?: string };
    if (existing.planHash !== executionPlan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else {
    writeJson(planPath, { ...executionPlan, createdAt: new Date().toISOString() });
  }
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...executionPlan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, target] of TARGETS.entries()) {
    console.log(`[${index + 1}/${TARGETS.length}] ${target.paragraphId} (${target.role})`);
    await runTarget(target, inputs[index]!, client);
  }
  writeSummary(executionPlan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: executionPlan.planHash, ...usage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

