/**
 * tracked source fixture에서 production 편입 전 candidate 세 자산을 생성한다.
 *
 * 각 단계 산출물을 즉시 저장하고 이미 존재하는 단계는 재사용하므로, 중단 후 같은 명령으로
 * 안전하게 재개할 수 있다. 이 명령은 content/를 수정하거나 qualification을 실행하지 않는다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildSourceBundle, candidateGeneratorFingerprint, type CandidateGenerationProvenance } from '../candidate-qualification.js';
import { type Gold, buildGold } from '../gold.js';
import { GoldGenerationMetadataSchema } from '../gold-generation-metadata.js';
import {
  MODEL,
  QUERY_GENERATION_EFFORT,
  TITLE_GENERATION_EFFORT,
} from '../llm/client.js';
import {
  EVAL_SCHEMA_VERSION,
  GENERATOR_VERSION,
  GeneratedQuerySetSchema,
  generateQuerySet,
  type GeneratedQuerySet,
} from '../llm/query-gen.js';
import {
  TITLE_GENERATOR_VERSION,
  generateTitleQuerySet,
  validateTitleQuerySet,
} from '../llm/title-gen.js';
import { buildGeneratorInput, type Gold as QueryGeneratorGold } from '../query-gen-lib.js';
import { assertPassageSourceFixtureIntegrity } from '../source-fixture.js';

const ROOT = process.cwd();
const DEFAULT_CANDIDATE_ROOT = 'packages/pipeline/fixtures/candidates';

interface GenerationSidecars {
  readonly gold?: CandidateGenerationProvenance;
  readonly query?: CandidateGenerationProvenance;
  readonly titleQuery?: CandidateGenerationProvenance;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function required(argv: readonly string[], name: string): string {
  const value = option(argv, name);
  if (value === undefined) throw new Error(`${name} 값이 필요하다`);
  return value;
}

function provenance(args: Omit<CandidateGenerationProvenance, 'generatorFingerprint'>): CandidateGenerationProvenance {
  return {
    ...args,
    generatorFingerprint: candidateGeneratorFingerprint(args),
  };
}

function goldProvenance(gold: Gold): CandidateGenerationProvenance {
  const value = GoldGenerationMetadataSchema.parse(gold.generationMetadata);
  return {
    provider: value.provider,
    model: value.model,
    effort: value.effort,
    promptVersion: value.promptVersion,
    schemaVersion: value.schemaVersion,
    generatedAt: value.generatedAt,
    generatorFingerprint: value.generatorFingerprint,
  };
}

export interface CandidateGenerationPlan {
  readonly dryRun: boolean;
  readonly paragraphId: string;
  readonly sourceParagraphId: string;
  readonly sourceFixturePath: string;
  readonly candidateDir: string;
  readonly qualificationSourceHash: string;
  readonly stages: readonly {
    readonly asset: 'gold' | 'query' | 'title-query';
    readonly status: 'pending' | 'existing';
    readonly logicalApiCallsIfPending: number;
  }[];
  readonly pendingLogicalApiCalls: number;
}

export function planCandidateGeneration(argv: readonly string[]): CandidateGenerationPlan {
  const dryRun = argv.includes('--dry-run');
  const sourceFixturePath = resolve(ROOT, required(argv, '--source-fixture'));
  const sourceParagraphId = required(argv, '--source-paragraph-id');
  const paragraphId = required(argv, '--paragraph-id');
  const candidateDir = resolve(
    ROOT,
    option(argv, '--candidate-dir') ?? `${DEFAULT_CANDIDATE_ROOT}/${paragraphId}`,
  );
  const fixture = assertPassageSourceFixtureIntegrity(readJson<unknown>(sourceFixturePath));
  const bundle = buildSourceBundle(fixture, sourceParagraphId);
  const paths = {
    gold: resolve(candidateDir, 'gold.json'),
    query: resolve(candidateDir, 'queries.json'),
    'title-query': resolve(candidateDir, 'title-queries.json'),
  } as const;
  const stages = ([
    ['gold', 4],
    ['query', 1],
    ['title-query', 1],
  ] as const).map(([asset, logicalApiCallsIfPending]) => ({
    asset,
    status: existsSync(paths[asset]) ? 'existing' as const : 'pending' as const,
    logicalApiCallsIfPending,
  }));
  return {
    dryRun,
    paragraphId,
    sourceParagraphId,
    sourceFixturePath,
    candidateDir,
    qualificationSourceHash: bundle.qualificationSourceHash,
    stages,
    pendingLogicalApiCalls: stages.reduce(
      (sum, stage) => sum + (stage.status === 'pending' ? stage.logicalApiCallsIfPending : 0),
      0,
    ),
  };
}

export async function runContentGenerateCandidateCli(argv = process.argv.slice(2)): Promise<CandidateGenerationPlan> {
  const plan = planCandidateGeneration(argv);
  if (plan.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }

  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');

  const fixture = assertPassageSourceFixtureIntegrity(readJson<unknown>(plan.sourceFixturePath));
  const source = buildSourceBundle(fixture, plan.sourceParagraphId).qualificationPrimaryText;
  const goldPath = resolve(plan.candidateDir, 'gold.json');
  const queryPath = resolve(plan.candidateDir, 'queries.json');
  const titlePath = resolve(plan.candidateDir, 'title-queries.json');
  const provenancePath = resolve(plan.candidateDir, 'generation-provenance.json');
  let sidecars = existsSync(provenancePath) ? readJson<GenerationSidecars>(provenancePath) : {};

  let gold: Gold;
  if (existsSync(goldPath)) {
    gold = readJson<Gold>(goldPath);
    console.log(`${plan.paragraphId}: gold 재사용`);
  } else {
    gold = await buildGold(
      source,
      [fixture.field],
      plan.paragraphId,
      resolve(ROOT, `.omc/candidate-generation/${plan.paragraphId}/gold-steps`),
    );
    writeJson(goldPath, gold);
    sidecars = { ...sidecars, gold: goldProvenance(gold) };
    writeJson(provenancePath, sidecars);
    console.log(`${plan.paragraphId}: gold 생성 완료`);
  }

  let query: GeneratedQuerySet;
  if (existsSync(queryPath)) {
    query = GeneratedQuerySetSchema.parse(readJson<unknown>(queryPath));
    if (sidecars.query === undefined) throw new Error('기존 query candidate의 generation provenance가 없다');
    console.log(`${plan.paragraphId}: query 재사용`);
  } else {
    const generatedAt = new Date().toISOString();
    query = await generateQuerySet({
      ...buildGeneratorInput(gold as unknown as QueryGeneratorGold),
      paragraphId: plan.paragraphId,
    });
    const queryProvenance = provenance({
      provider: 'anthropic',
      model: MODEL,
      effort: QUERY_GENERATION_EFFORT,
      promptVersion: `query-generator-${GENERATOR_VERSION}`,
      schemaVersion: EVAL_SCHEMA_VERSION,
      generatedAt,
    });
    writeJson(queryPath, {
      _meta: { kind: 'generated', generatorVersion: GENERATOR_VERSION, ...queryProvenance },
      ...query,
      paragraphId: plan.paragraphId,
    });
    sidecars = { ...sidecars, query: queryProvenance };
    writeJson(provenancePath, sidecars);
    console.log(`${plan.paragraphId}: query 생성 완료`);
  }

  if (existsSync(titlePath)) {
    GeneratedQuerySetSchema.parse(readJson<unknown>(titlePath));
    if (sidecars.titleQuery === undefined) throw new Error('기존 title-query candidate의 generation provenance가 없다');
    console.log(`${plan.paragraphId}: title-query 재사용`);
  } else {
    const byId = new Map(gold.nodes.map((node) => [node.id, node]));
    const title = byId.get(gold.titleId);
    if (title === undefined) throw new Error(`타이틀 노드 ${gold.titleId} 없음`);
    const generatedAt = new Date().toISOString();
    const titleQuery = await generateTitleQuerySet({
      paragraphId: plan.paragraphId,
      titleShortForm: title.shortForm ?? title.text,
      sentences: gold.sentences,
      slots: gold.slots.map((slot) => ({
        id: slot.slotId,
        shortForm: byId.get(slot.slotId)?.shortForm ?? slot.shortForm,
      })),
    });
    const problems = validateTitleQuerySet(titleQuery);
    if (problems.length > 0) throw new Error(`title-query 구조 검사 실패: ${problems.join(', ')}`);
    const titleProvenance = provenance({
      provider: 'anthropic',
      model: MODEL,
      effort: TITLE_GENERATION_EFFORT,
      promptVersion: `title-query-generator-${TITLE_GENERATOR_VERSION}`,
      schemaVersion: EVAL_SCHEMA_VERSION,
      generatedAt,
    });
    writeJson(titlePath, {
      _meta: { kind: 'generated', generatorVersion: TITLE_GENERATOR_VERSION, ...titleProvenance },
      ...titleQuery,
      paragraphId: plan.paragraphId,
    });
    sidecars = { ...sidecars, titleQuery: titleProvenance };
    writeJson(provenancePath, sidecars);
    console.log(`${plan.paragraphId}: title-query 생성 완료`);
  }

  console.log(JSON.stringify(planCandidateGeneration(argv), null, 2));
  return planCandidateGeneration(argv);
}

const invokedPath = process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  runContentGenerateCandidateCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
