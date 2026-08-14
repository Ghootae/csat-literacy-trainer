/** candidate query를 content/ 승격 전에 운영 평가 설정으로 회귀한다. */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod/v4';

import {
  ProductionRegressionResultSchema,
  QualificationManifestSchema,
  assertCandidatePromotionGate,
  buildSourceBundle,
  evaluateProductionRegressionCases,
  qualificationArtifactHash,
} from '../candidate-qualification.js';
import { evaluateResponse } from '../evaluate-response.js';
import type { Gold } from '../gold.js';
import { evalRequestFingerprint, resolveQueryEvaluationConfig } from '../llm/query-eval.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import type { RegionSemanticVerdict } from '../query-normalize.js';
import { semanticCandidateHash, semanticVerifierFingerprint } from '../semantic-verification.js';
import { assertPassageSourceFixtureIntegrity } from '../source-fixture.js';

const ROOT = process.cwd();

const VerdictSchema = z.enum([
  'relation_preserved',
  'partial_relation_preservation',
  'topic_only',
  'contradicted',
  'region_not_evidenced',
]);

export const CandidateRegressionFixtureSchema = z.object({
  name: z.string().min(1),
  gold: z.string().min(1),
  querySet: z.string().min(1),
  focal: z.string().min(1),
  probes: z.array(z.object({
    id: z.string().min(1),
    focal: z.string().min(1).optional(),
    expectFocal: VerdictSchema,
    text: z.string().min(1),
  })).min(1),
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
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

export interface CandidateRegressionPlan {
  readonly dryRun: boolean;
  readonly manifestPath: string;
  readonly fixturePath: string;
  readonly resultPath: string;
  readonly logPath: string;
  readonly paragraphId: string;
  readonly probeIds: readonly string[];
  readonly expectedApiCalls: number;
  readonly resultExists: boolean;
  readonly settings: { readonly provider: 'anthropic'; readonly model: string; readonly effort: string; readonly propositionCoverage: 'off' };
  readonly fingerprint: string;
}

export function planCandidateRegression(argv: readonly string[]): CandidateRegressionPlan {
  const dryRun = argv.includes('--dry-run');
  const manifestPath = resolve(ROOT, required(argv, '--manifest'));
  const fixturePath = resolve(ROOT, required(argv, '--fixture'));
  const resultPath = resolve(dirname(manifestPath), 'production-regression-result.json');
  const logPath = resolve(dirname(manifestPath), 'production-regression.jsonl');
  const manifest = QualificationManifestSchema.parse(readJson<unknown>(manifestPath));
  const fixture = CandidateRegressionFixtureSchema.parse(readJson<unknown>(fixturePath));
  const config = { effort: 'low' as const, propositionCoverage: false };
  const resolved = resolveQueryEvaluationConfig(config);
  return {
    dryRun,
    manifestPath,
    fixturePath,
    resultPath,
    logPath,
    paragraphId: manifest.paragraphId,
    probeIds: fixture.probes.map((probe) => probe.id),
    expectedApiCalls: fixture.probes.length,
    resultExists: existsSync(resultPath),
    settings: { provider: 'anthropic', model: resolved.model, effort: resolved.effort, propositionCoverage: 'off' },
    fingerprint: qualificationArtifactHash(evalRequestFingerprint(config)),
  };
}

export async function runCandidateRegressionCli(argv = process.argv.slice(2)): Promise<unknown> {
  const plan = planCandidateRegression(argv);
  if (plan.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  if (plan.resultExists) throw new Error(`기존 결과를 덮어쓰지 않는다: ${plan.resultPath}`);
  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');

  const manifest = QualificationManifestSchema.parse(readJson<unknown>(plan.manifestPath));
  const fixture = CandidateRegressionFixtureSchema.parse(readJson<unknown>(plan.fixturePath));
  const gold = readJson<Gold>(resolve(ROOT, fixture.gold));
  const query = GeneratedQuerySetSchema.parse(readJson<unknown>(resolve(ROOT, fixture.querySet))) as GeneratedQuerySet;
  if (gold.paragraphId !== manifest.paragraphId || query.paragraphId !== manifest.paragraphId) {
    throw new Error('regression fixture paragraphId가 manifest와 다르다');
  }
  const queryHash = semanticCandidateHash(query);
  if (queryHash !== manifest.assets.query?.candidateHash || relative(ROOT, resolve(ROOT, fixture.querySet)) !== manifest.assets.query.candidatePath) {
    throw new Error('regression fixture가 manifest candidate query와 결속되지 않았다');
  }
  const regionIds = new Set(query.regions.map((region) => region.regionId));
  type Diagnostic = {
    probeId: string;
    focal: string;
    expectedFocal: RegionSemanticVerdict;
    actualFocal: RegionSemanticVerdict;
    latencyMs: number;
    fingerprint: string;
    completedAt: string;
    rawVerdicts: unknown[];
  };
  const prior = existsSync(plan.logPath)
    ? readFileSync(plan.logPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as Diagnostic)
    : [];
  if (prior.some((row) => row.fingerprint !== plan.fingerprint)) {
    throw new Error('기존 regression ledger fingerprint가 현재 실행과 다르다');
  }
  const byProbe = new Map(prior.map((row) => [row.probeId, row]));
  const diagnostics: Diagnostic[] = [];
  for (const probe of fixture.probes) {
    const focal = probe.focal ?? fixture.focal;
    if (!regionIds.has(focal)) throw new Error(`${probe.id}: focal region ${focal} 없음`);
    const completed = byProbe.get(probe.id);
    if (completed !== undefined) {
      if (completed.expectedFocal !== probe.expectFocal || completed.focal !== focal) {
        throw new Error(`${probe.id}: 기존 ledger의 기대값 또는 focal이 fixture와 다르다`);
      }
      diagnostics.push(completed);
      console.log(`${probe.id}: 완료 ledger 재사용`);
      continue;
    }
    const started = performance.now();
    const evaluated = await evaluateResponse(gold, query, probe.text, undefined, {
      queryEvaluation: { effort: 'low', propositionCoverage: false },
    });
    const latencyMs = Math.round(performance.now() - started);
    const actual = evaluated.regions.find((region) => region.id === focal)?.regionSemanticVerdict ?? 'region_not_evidenced';
    const diagnostic: Diagnostic = {
      probeId: probe.id,
      focal,
      expectedFocal: probe.expectFocal,
      actualFocal: actual,
      latencyMs,
      fingerprint: plan.fingerprint,
      completedAt: new Date().toISOString(),
      rawVerdicts: [...evaluated.rawVerdicts.entries()].map(([queryId, verdict]) => ({ queryId, ...verdict })),
    };
    diagnostics.push(diagnostic);
    appendFileSync(plan.logPath, `${JSON.stringify(diagnostic)}\n`, 'utf8');
    console.log(`${probe.id}: ${probe.expectFocal} → ${actual} (${latencyMs}ms)`);
  }
  const observed = diagnostics.map(({ probeId, expectedFocal, actualFocal }) => ({ probeId, expectedFocal, actualFocal }));
  const totalLatencyMs = diagnostics.reduce((sum, row) => sum + row.latencyMs, 0);
  const evaluatedCases = evaluateProductionRegressionCases(observed);
  const resultValue = {
    schemaVersion: 'production-query-regression-result-v1' as const,
    paragraphId: manifest.paragraphId,
    candidateQueryHash: queryHash,
    fixturePath: relative(ROOT, plan.fixturePath),
    settings: plan.settings,
    cases: evaluatedCases.cases,
    summary: evaluatedCases.summary,
    metrics: {
      totalLatencyMs,
      meanLatencyMs: Math.round(totalLatencyMs / fixture.probes.length),
      apiCalls: fixture.probes.length,
    },
    logPath: relative(ROOT, plan.logPath),
    completedAt: new Date().toISOString(),
    diagnostics,
  };
  ProductionRegressionResultSchema.parse(resultValue);
  writeFileSync(plan.resultPath, `${JSON.stringify(resultValue, null, 2)}\n`, 'utf8');

  const ready = evaluatedCases.summary.status === 'passed'
    && [manifest.assets.gold, manifest.assets.query, manifest.assets.titleQuery]
      .every((asset) => asset?.qualificationStatus === 'qualified');
  const updated = QualificationManifestSchema.parse({
    ...manifest,
    regression: {
      status: evaluatedCases.summary.status,
      probeCount: fixture.probes.length,
      candidateQueryHash: queryHash,
      fixturePath: relative(ROOT, plan.fixturePath),
      fixtureHash: qualificationArtifactHash(fixture),
      resultPath: relative(ROOT, plan.resultPath),
      resultHash: qualificationArtifactHash(resultValue),
    },
    promotionStatus: ready ? 'ready' : 'blocked',
    promotionBlockers: ready
      ? []
      : [
        ...[manifest.assets.gold, manifest.assets.query, manifest.assets.titleQuery]
          .filter((asset) => asset?.qualificationStatus !== 'qualified')
          .map((asset) => `${asset?.assetType ?? 'asset'}: v2 qualification 미완료`),
        ...(evaluatedCases.summary.status === 'passed' ? [] : ['production-query regression action policy 미통과']),
      ],
  });
  writeFileSync(plan.manifestPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

  if (ready) {
    const fixtureValue = assertPassageSourceFixtureIntegrity(readJson<unknown>(resolve(ROOT, updated.sourceFixturePath)));
    assertCandidatePromotionGate({
      manifest: updated,
      bundle: buildSourceBundle(fixtureValue, updated.sourceParagraphId),
      loadJson: (path) => readJson<unknown>(resolve(ROOT, path)),
      verifierFingerprints: {
        gold: semanticVerifierFingerprint('gold', 'semantic-source-bundle-v2-footnotes-ignored'),
        query: semanticVerifierFingerprint('query', 'semantic-source-bundle-v2-footnotes-ignored'),
        'title-query': semanticVerifierFingerprint('title-query', 'semantic-source-bundle-v2-footnotes-ignored'),
      },
    });
  }
  console.log(JSON.stringify({ ...evaluatedCases.summary, manifestPath: relative(ROOT, plan.manifestPath) }, null, 2));
  return resultValue;
}

const invokedPath = process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  runCandidateRegressionCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
