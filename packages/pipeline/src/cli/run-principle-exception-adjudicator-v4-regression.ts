import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION,
  PrincipleExceptionEvidenceV4OutputSchema,
  adjudicatePrincipleExceptionCoverageV4,
  type PrincipleExceptionEvidenceV4Output,
} from '../paragraph-analysis/principle-exception-adjudicator-v4.js';
import {
  extractPrincipleExceptionEvidenceV4WithOpenAI,
  loadPrincipleExceptionAdjudicatorV4Prompt,
} from '../paragraph-analysis/principle-exception-adjudicator-v4-runtime.js';
import { ParagraphPropositionBundleSchema, artifactHash } from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const VERSION = 'principle-exception-adjudicator-v4-targeted-regression-v1' as const;
const MODEL = 'gpt-5.6-terra';
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = 7_000;
const BUDGET_USD = 10;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts');
const OUTPUT_ROOT = resolve(PROJECT_ROOT,
  'docs/experiments/principle-exception-adjudicator-v4-regression-2026-09-04');
const CASES = [
  ...[1, 2, 3].map((repeat) => ({
    caseId: `law-p5-r${repeat}`, paragraphId: '69bffa62fa5063deffe19c88-p5', repeat,
    expectedStatus: 'PASS', expectedContrastType: 'RULE_EXCEPTION',
  })),
  ...[1, 2, 3].map((repeat) => ({
    caseId: `law-p1-r${repeat}`, paragraphId: '69bffa62fa5063deffe19c88-p1', repeat,
    expectedStatus: 'NOT_APPLICABLE', expectedContrastType: 'MODEL_LIMITATION_REMEDY',
  })),
] as const;
type Case = (typeof CASES)[number];

interface SourceArtifact {
  readonly sourceId: string; readonly passageId: string; readonly mediaCount: number;
  readonly paragraph: {
    readonly paragraphId: string; readonly position: number; readonly text: string;
    readonly textReferencesVisual: boolean;
  };
  readonly passageParagraphs: readonly {
    readonly paragraphId: string; readonly position: number; readonly text: string;
  }[];
}

interface StageArtifact {
  readonly artifactType: 'principle-exception-v4-regression-stage-v1';
  readonly createdAt: string; readonly inputHash: string; readonly caseMetadata: Case;
  readonly config: Record<string, unknown>; readonly evidence: PrincipleExceptionEvidenceV4Output;
  readonly adjudication: ReturnType<typeof adjudicatePrincipleExceptionCoverageV4>;
  readonly metadata: ParagraphGoldApiMetadata;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildInput(paragraphId: string): ParagraphGoldAuditInput {
  const passageId = paragraphId.split('-p')[0]!;
  const directory = resolve(BATCH_ROOT, passageId, paragraphId);
  const source = readJson(resolve(directory, '00-source.json')) as SourceArtifact;
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: source.sourceId, passageId: source.passageId, passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId, position: source.paragraph.position, text: source.paragraph.text,
      textReferencesVisual: source.paragraph.textReferencesVisual, passageMediaCount: source.mediaCount,
    },
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(readJson(resolve(directory, 'diagnostic-gold-candidate.json'))),
    propositionBundle: ParagraphPropositionBundleSchema.parse(readJson(resolve(directory, 'proposition-bundle-candidate.json'))),
  });
}

const stagePath = (caseId: string) => resolve(OUTPUT_ROOT, 'artifacts', caseId, '01-adjudication-v4.json');
function cost(metadata: ParagraphGoldApiMetadata): number {
  const u = metadata.usage;
  const regular = Math.max(0, u.inputTokens - u.cachedInputTokens - u.cacheWriteTokens);
  return (regular * PRICING.regularInput + u.cachedInputTokens * PRICING.cachedInput +
    u.cacheWriteTokens * PRICING.cacheWriteInput + u.outputTokens * PRICING.output) / 1_000_000;
}
function usage() {
  const responses = new Map<string, number>();
  for (const item of CASES) {
    const path = stagePath(item.caseId);
    if (!existsSync(path)) continue;
    const stage = readJson(path) as StageArtifact;
    responses.set(stage.metadata.responseId, cost(stage.metadata));
  }
  return { responseCount: responses.size, costUsd: [...responses.values()].reduce((a, b) => a + b, 0) };
}
function assertBudget(input: unknown): void {
  const prompt = loadPrincipleExceptionAdjudicatorV4Prompt();
  const maxInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maxCurrent = (maxInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output) / 1_000_000;
  if (usage().costUsd + maxCurrent > BUDGET_USD) throw new Error('비용 상한 전 중단');
}
function plan(inputs: ReadonlyMap<string, ParagraphGoldAuditInput>) {
  const core = {
    version: VERSION, sourcePolicy: 'BATCH_004_FROZEN_INITIAL_CANDIDATES',
    apiInputBlindToExpectations: true, cases: CASES,
    inputs: [...inputs].map(([paragraphId, input]) => ({
      paragraphId,
      sourceHash: artifactHash({ passageParagraphs: input.passageParagraphs, targetParagraph: input.targetParagraph }),
      diagnosticGoldHash: artifactHash(input.diagnosticGold),
      propositionBundleHash: artifactHash(input.propositionBundle),
    })),
    model: MODEL, effort: 'medium', serviceTier: 'default', maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS, maximumCalls: CASES.length, budgetUsd: BUDGET_USD,
    promptHash: artifactHash(loadPrincipleExceptionAdjudicatorV4Prompt()),
    outputSchemaVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runCase(item: Case, input: ParagraphGoldAuditInput, client: OpenAI): Promise<void> {
  const path = stagePath(item.caseId);
  const inputHash = artifactHash({ version: PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION, input });
  if (existsSync(path)) return;
  assertBudget(input);
  const response = await extractPrincipleExceptionEvidenceV4WithOpenAI(input, {
    model: MODEL, maxOutputTokens: MAX_OUTPUT_TOKENS, client,
  });
  const adjudication = adjudicatePrincipleExceptionCoverageV4(response.result, input);
  writeJson(path, {
    artifactType: 'principle-exception-v4-regression-stage-v1', createdAt: new Date().toISOString(),
    inputHash, caseMetadata: item,
    config: { model: MODEL, effort: 'medium', serviceTier: 'default', maxRetries: 0, maxOutputTokens: MAX_OUTPUT_TOKENS },
    evidence: response.result, adjudication, metadata: response.metadata,
  } satisfies StageArtifact);
}

function writeSummary(planHash: string): void {
  const records = CASES.map((item) => {
    const stage = readJson(stagePath(item.caseId)) as StageArtifact;
    return {
      ...item, actualStatus: stage.adjudication.status, actualContrastType: stage.evidence.contrastType,
      principleAggregation: stage.evidence.propositionAggregation.principle,
      exceptionAggregation: stage.evidence.propositionAggregation.exception,
      matchedStatus: stage.adjudication.status === item.expectedStatus,
      matchedContrastType: stage.evidence.contrastType === item.expectedContrastType,
      contractWarnings: stage.adjudication.contractWarnings,
      productionEligibleForThisCheck: stage.adjudication.productionEligibleForThisCheck,
    };
  });
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'principle-exception-adjudicator-v4-regression-summary-v1',
    createdAt: new Date().toISOString(), planHash, records,
    metrics: {
      statusMatches: records.filter((r) => r.matchedStatus).length,
      contrastTypeMatches: records.filter((r) => r.matchedContrastType).length,
      targetCount: records.length,
      p5AllPass: records.filter((r) => r.paragraphId.endsWith('-p5')).every((r) => r.actualStatus === 'PASS'),
      p1AllRouted: records.filter((r) => r.paragraphId.endsWith('-p1')).every(
        (r) => r.actualContrastType === 'MODEL_LIMITATION_REMEDY' && r.actualStatus === 'NOT_APPLICABLE'),
      contractWarningCount: records.reduce((sum, r) => sum + r.contractWarnings.length, 0),
    },
    usage: usage(), budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const ids = [...new Set(CASES.map((item) => item.paragraphId))];
  const inputs = new Map(ids.map((id) => [id, buildInput(id)]));
  const executionPlan = plan(inputs);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const planPath = resolve(OUTPUT_ROOT, 'execution-plan.json');
  if (existsSync(planPath)) {
    const existing = readJson(planPath) as { readonly planHash?: string };
    if (existing.planHash !== executionPlan.planHash) throw new Error('기존 계획 해시와 현재 계획 불일치');
  } else writeJson(planPath, { ...executionPlan, createdAt: new Date().toISOString() });
  if (!process.argv.includes('--execute')) {
    console.log(JSON.stringify({ mode: 'dry-run', ...executionPlan }, null, 2));
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY가 설정되지 않음');
  const client = new OpenAI({ maxRetries: MAX_RETRIES, timeout: 10 * 60 * 1_000 });
  for (const [index, item] of CASES.entries()) {
    console.log(`[${index + 1}/${CASES.length}] ${item.caseId}`);
    await runCase(item, inputs.get(item.paragraphId)!, client);
  }
  writeSummary(executionPlan.planHash);
  console.log(JSON.stringify({ mode: 'complete', planHash: executionPlan.planHash, ...usage() }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});

