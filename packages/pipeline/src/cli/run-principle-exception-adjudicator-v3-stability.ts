import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import OpenAI from 'openai';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION,
  PrincipleExceptionEvidenceV3OutputSchema,
  adjudicatePrincipleExceptionCoverageV3,
  type PrincipleExceptionAdjudicationV3,
  type PrincipleExceptionEvidenceV3Output,
} from '../paragraph-analysis/principle-exception-adjudicator-v3.js';
import {
  extractPrincipleExceptionEvidenceV3WithOpenAI,
  loadPrincipleExceptionAdjudicatorV3Prompt,
} from '../paragraph-analysis/principle-exception-adjudicator-v3-runtime.js';
import { ParagraphPropositionBundleSchema, artifactHash } from '../paragraph-analysis/production.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from '../paragraph-analysis/production-runtime.js';

const VERSION = 'principle-exception-adjudicator-v3-stability-v1' as const;
const MODEL = 'gpt-5.6-terra';
const MAX_RETRIES = 0;
const MAX_OUTPUT_TOKENS = 7_000;
const BUDGET_USD = 10;
const PRICING = { regularInput: 2, cachedInput: 0.2, cacheWriteInput: 2.5, output: 12 } as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts',
);
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/principle-exception-adjudicator-v3-stability-2026-09-04',
);

const CASES = [
  ...[1, 2, 3].map((repeat) => ({
    caseId: `law-p6-r${repeat}`, paragraphId: '69bffa62fa5063deffe19c88-p6',
    group: 'REPRO_KNOWN_DEFECT', expectedStatus: 'FAIL', repeat,
  })),
  ...[1, 2, 3].map((repeat) => ({
    caseId: `law-p5-r${repeat}`, paragraphId: '69bffa62fa5063deffe19c88-p5',
    group: 'REPRO_POSITIVE', expectedStatus: 'PASS', repeat,
  })),
  ...[1, 2, 3].map((repeat) => ({
    caseId: `law-p7-r${repeat}`, paragraphId: '69bffa62fa5063deffe19c88-p7',
    group: 'REPRO_PASSAGE_SCOPE', expectedStatus: 'OUT_OF_PARAGRAPH_SCOPE', repeat,
  })),
  {
    caseId: 'blind-law-p1', paragraphId: '69bffa62fa5063deffe19c88-p1',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
  {
    caseId: 'blind-law-p4', paragraphId: '69bffa62fa5063deffe19c88-p4',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
  {
    caseId: 'blind-law-p8', paragraphId: '69bffa62fa5063deffe19c88-p8',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
  {
    caseId: 'blind-outlier-p5', paragraphId: '69c006f178128b2a9bedd2f3-p5',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
  {
    caseId: 'blind-liquidity-p2', paragraphId: '69c0ad79fa5063deffe1e90b-p2',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
  {
    caseId: 'blind-liquidity-p4', paragraphId: '69c0ad79fa5063deffe1e90b-p4',
    group: 'BLIND_CONTROL', expectedStatus: 'NOT_APPLICABLE', repeat: 1,
  },
] as const;
type Case = (typeof CASES)[number];

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
  readonly artifactType: 'principle-exception-v3-stability-stage-v1';
  readonly createdAt: string;
  readonly inputHash: string;
  readonly caseMetadata: Case;
  readonly config: Record<string, unknown>;
  readonly evidence: PrincipleExceptionEvidenceV3Output;
  readonly adjudication: PrincipleExceptionAdjudicationV3;
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
    sourceId: source.sourceId, passageId: source.passageId,
    passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId, position: source.paragraph.position, text: source.paragraph.text,
      textReferencesVisual: source.paragraph.textReferencesVisual, passageMediaCount: source.mediaCount,
    },
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(directory, 'diagnostic-gold-candidate.json')),
    ),
    propositionBundle: ParagraphPropositionBundleSchema.parse(
      readJson(resolve(directory, 'proposition-bundle-candidate.json')),
    ),
  });
}

function stagePath(caseId: string): string {
  return resolve(OUTPUT_ROOT, 'artifacts', caseId, '01-adjudication-v3.json');
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
  const prompt = loadPrincipleExceptionAdjudicatorV3Prompt();
  const maxInputTokens = Buffer.byteLength(`${prompt}\n${JSON.stringify(input)}`, 'utf8');
  const maxCurrent = (maxInputTokens * PRICING.cacheWriteInput + MAX_OUTPUT_TOKENS * PRICING.output) / 1_000_000;
  if (usage().costUsd + maxCurrent > BUDGET_USD) {
    throw new Error(`비용 상한 전 중단: 누적 $${usage().costUsd.toFixed(4)}, 현재 최대 $${maxCurrent.toFixed(4)}`);
  }
}

function plan(inputs: ReadonlyMap<string, ParagraphGoldAuditInput>) {
  const core = {
    version: VERSION, sourcePolicy: 'BATCH_004_FROZEN_INITIAL_CANDIDATES',
    apiInputBlindToCaseMetadata: true,
    cases: CASES,
    inputs: [...inputs].map(([paragraphId, input]) => ({
      paragraphId,
      sourceHash: artifactHash({ passageParagraphs: input.passageParagraphs, targetParagraph: input.targetParagraph }),
      diagnosticGoldHash: artifactHash(input.diagnosticGold),
      propositionBundleHash: artifactHash(input.propositionBundle),
    })),
    model: MODEL, effort: 'medium', serviceTier: 'default', maxRetries: MAX_RETRIES,
    maxOutputTokens: MAX_OUTPUT_TOKENS, maximumCalls: CASES.length, budgetUsd: BUDGET_USD,
    promptHash: artifactHash(loadPrincipleExceptionAdjudicatorV3Prompt()),
    outputSchemaVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION,
    pricingUsdPerMillionTokens: PRICING,
  };
  return { ...core, planHash: artifactHash(core) };
}

async function runCase(item: Case, input: ParagraphGoldAuditInput, client: OpenAI): Promise<void> {
  const path = stagePath(item.caseId);
  const inputHash = artifactHash({ version: PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION, input });
  if (existsSync(path)) {
    const stage = readJson(path) as StageArtifact;
    if (stage.inputHash !== inputHash) throw new Error(`입력 해시 불일치: ${item.caseId}`);
    const evidence = PrincipleExceptionEvidenceV3OutputSchema.parse(stage.evidence);
    const recalculated = adjudicatePrincipleExceptionCoverageV3(evidence, input);
    if (artifactHash(recalculated) !== artifactHash(stage.adjudication)) {
      throw new Error(`저장 판정과 재계산 판정 불일치: ${item.caseId}`);
    }
    return;
  }
  assertBudget(input);
  // caseId, group, expectedStatus는 의도적으로 API 입력에 넣지 않는다.
  const response = await extractPrincipleExceptionEvidenceV3WithOpenAI(input, {
    model: MODEL, maxOutputTokens: MAX_OUTPUT_TOKENS, client,
  });
  const adjudication = adjudicatePrincipleExceptionCoverageV3(response.result, input);
  writeJson(path, {
    artifactType: 'principle-exception-v3-stability-stage-v1', createdAt: new Date().toISOString(),
    inputHash, caseMetadata: item,
    config: {
      model: MODEL, effort: 'medium', serviceTier: 'default', maxRetries: MAX_RETRIES,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    evidence: response.result, adjudication, metadata: response.metadata,
  } satisfies StageArtifact);
}

function writeSummary(planHash: string): void {
  const records = CASES.map((item) => {
    const stage = readJson(stagePath(item.caseId)) as StageArtifact;
    return {
      ...item, actualStatus: stage.adjudication.status,
      matchedExpectation: stage.adjudication.status === item.expectedStatus,
      principleSourceScope: stage.evidence.principle.sourceScope,
      principleLevels: {
        proposition: stage.evidence.principle.propositionCoverage.level,
        centralStory: stage.evidence.principle.centralStoryCoverage.level,
        centralAxis: stage.evidence.principle.centralAxisCoverage.level,
        coreRelation: stage.evidence.principle.coreRelationCoverage.level,
      },
      exceptionSourceScope: stage.evidence.exception.sourceScope,
      contractWarnings: stage.adjudication.contractWarnings,
      productionEligibleForThisCheck: stage.adjudication.productionEligibleForThisCheck,
    };
  });
  const reproduction = ['REPRO_KNOWN_DEFECT', 'REPRO_POSITIVE', 'REPRO_PASSAGE_SCOPE'].map((group) => {
    const groupRecords = records.filter((record) => record.group === group);
    return {
      group,
      statuses: groupRecords.map((record) => record.actualStatus),
      allExpected: groupRecords.every((record) => record.matchedExpectation),
    };
  });
  const blind = records.filter((record) => record.group === 'BLIND_CONTROL');
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    artifactType: 'principle-exception-adjudicator-v3-stability-summary-v1',
    createdAt: new Date().toISOString(), planHash, records,
    metrics: {
      matchedExpectationCount: records.filter((record) => record.matchedExpectation).length,
      targetCount: records.length,
      reproduction,
      allReproductionGroupsStable: reproduction.every((group) => group.allExpected),
      blindControlExactMatchCount: blind.filter((record) => record.matchedExpectation).length,
      blindControlCount: blind.length,
      blindControlBlockedCount: blind.filter((record) => !record.productionEligibleForThisCheck).length,
      contractWarningCount: records.reduce((sum, record) => sum + record.contractWarnings.length, 0),
    },
    usage: usage(), budgetUsd: BUDGET_USD,
  });
}

async function main(): Promise<void> {
  const uniqueParagraphIds = [...new Set(CASES.map((item) => item.paragraphId))];
  const inputs = new Map(uniqueParagraphIds.map((id) => [id, buildInput(id)]));
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

