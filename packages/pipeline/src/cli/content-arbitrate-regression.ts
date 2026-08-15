/** Qualified oracle와 production regression의 action mismatch만 독립 중재한다. */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod/v4';

import { buildSourceBundle, qualificationArtifactHash } from '../candidate-qualification.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import {
  ProductionQueryJudgmentSchema,
  arbitrateFromPasses,
  arbitrationHash,
  arbitrationPreflight,
  arbitrationRequired,
  arbiterFingerprint,
  runArbiterPass,
  type ArbitrationInput,
} from '../regression-arbitration.js';
import { ProbeQualificationRecordSchema } from '../regression-probe-qualification.js';
import { semanticCandidateHash } from '../semantic-verification.js';
import { assertPassageSourceFixtureIntegrity } from '../source-fixture.js';

const ROOT = process.cwd();
const VerdictSchema = z.enum(['relation_preserved', 'partial_relation_preservation', 'topic_only', 'contradicted', 'region_not_evidenced']);
const FixtureSchema = z.object({
  querySet: z.string().min(1), focal: z.string().min(1),
  probes: z.array(z.object({ id: z.string(), focal: z.string().optional(), text: z.string() })),
});
const RegressionResultSchema = z.object({
  diagnostics: z.array(z.object({
    probeId: z.string(), focal: z.string(), actualFocal: VerdictSchema,
    rawVerdicts: z.array(ProductionQueryJudgmentSchema.passthrough()),
  })),
});

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as unknown;
const option = (argv: readonly string[], name: string) => {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
};
const required = (argv: readonly string[], name: string) => {
  const value = option(argv, name);
  if (value === undefined) throw new Error(`${name} 값이 필요하다`);
  return value;
};

function loadInput(argv: readonly string[]): { input: ArbitrationInput; outputPath: string } {
  const fixture = FixtureSchema.parse(read(resolve(ROOT, required(argv, '--fixture'))));
  const probeId = required(argv, '--probe-id');
  const probe = fixture.probes.find((item) => item.id === probeId);
  if (probe === undefined) throw new Error(`fixture에 probe 없음: ${probeId}`);
  const querySet = GeneratedQuerySetSchema.parse(read(resolve(ROOT, fixture.querySet))) as GeneratedQuerySet;
  const sourceFixture = assertPassageSourceFixtureIntegrity(read(resolve(ROOT, required(argv, '--source-fixture'))));
  const bundle = buildSourceBundle(sourceFixture, required(argv, '--source-paragraph-id'));
  const oracle = ProbeQualificationRecordSchema.parse(read(resolve(ROOT, required(argv, '--oracle-record'))));
  const regression = RegressionResultSchema.parse(read(resolve(ROOT, required(argv, '--regression-result'))));
  const diagnostic = regression.diagnostics.find((item) => item.probeId === probeId);
  if (diagnostic === undefined) throw new Error(`regression result에 probe 없음: ${probeId}`);
  return {
    input: {
      paragraphId: querySet.paragraphId, probeId, focalRegionId: probe.focal ?? fixture.focal,
      studentResponse: probe.text, bundle, sourceBundleHash: qualificationArtifactHash(bundle),
      querySet, queryCandidateHash: semanticCandidateHash(querySet), oracle,
      oracleRecordHash: arbitrationHash(oracle), evaluatorJudgments: diagnostic.rawVerdicts,
      evaluatorVerdict: diagnostic.actualFocal,
    },
    outputPath: resolve(ROOT, required(argv, '--output')),
  };
}

export function planRegressionArbitration(argv: readonly string[]) {
  const { input, outputPath } = loadInput(argv);
  const preflightReasons = arbitrationPreflight(input);
  const requiredByPolicy = preflightReasons.length === 0 && arbitrationRequired(input);
  return {
    dryRun: argv.includes('--dry-run'), paragraphId: input.paragraphId, probeId: input.probeId,
    outputPath, outputExists: existsSync(outputPath), arbiterFingerprint: arbiterFingerprint(),
    preflightStatus: preflightReasons.length === 0 ? 'passed' : 'contract_error', preflightReasons,
    arbitrationRequired: requiredByPolicy, expectedLogicalApiCalls: requiredByPolicy ? 2 : 0,
  };
}

export async function runRegressionArbitrationCli(argv = process.argv.slice(2)) {
  const plan = planRegressionArbitration(argv);
  if (plan.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  if (plan.outputExists) throw new Error(`기존 결과를 덮어쓰지 않는다: ${plan.outputPath}`);
  const { input } = loadInput(argv);
  const passes = [];
  if (plan.arbitrationRequired) {
    if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
    if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');
    passes.push(await runArbiterPass(input), await runArbiterPass(input));
  }
  const record = arbitrateFromPasses(input, passes);
  writeFileSync(plan.outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ probeId: record.probeId, outcome: record.arbitrationOutcome, promotionBlocked: record.promotionBlocked }, null, 2));
  return record;
}

const invoked = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href;
if (import.meta.url === invoked) runRegressionArbitrationCli().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
