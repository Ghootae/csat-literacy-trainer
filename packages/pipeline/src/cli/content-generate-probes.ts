import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildSourceBundle } from '../candidate-qualification.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import { generateProbeCandidates } from '../regression-probe-generation.js';
import { assertPassageSourceFixtureIntegrity } from '../source-fixture.js';

const ROOT = process.cwd();
const option = (argv: readonly string[], name: string) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const required = (argv: readonly string[], name: string) => { const v = option(argv, name); if (v === undefined) throw new Error(`${name} 값이 필요하다`); return v; };
const read = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;

export function planProbeGeneration(argv: readonly string[]) {
  const querySetPath = required(argv, '--query-set');
  const querySet = GeneratedQuerySetSchema.parse(read(querySetPath)) as GeneratedQuerySet;
  const count = Number(required(argv, '--count'));
  if (!Number.isInteger(count) || count < 1) throw new Error('--count는 양의 정수여야 한다');
  return { dryRun: argv.includes('--dry-run'), paragraphId: querySet.paragraphId, querySetPath, count, expectedLogicalApiCalls: 1, outputPath: resolve(ROOT, required(argv, '--output')) };
}

export async function runProbeGenerationCli(argv = process.argv.slice(2)) {
  const plan = planProbeGeneration(argv);
  if (plan.dryRun) { console.log(JSON.stringify(plan, null, 2)); return plan; }
  if (existsSync(plan.outputPath)) throw new Error(`기존 결과를 덮어쓰지 않는다: ${plan.outputPath}`);
  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');
  const source = assertPassageSourceFixtureIntegrity(read(required(argv, '--source-fixture')));
  const bundle = buildSourceBundle(source, required(argv, '--source-paragraph-id'));
  const querySet = GeneratedQuerySetSchema.parse(read(plan.querySetPath)) as GeneratedQuerySet;
  const generated = await generateProbeCandidates({ paragraphId: plan.paragraphId, bundle, querySet, count: plan.count });
  const fixture = { name: required(argv, '--name'), gold: required(argv, '--gold'), querySet: plan.querySetPath, focal: required(argv, '--default-focal'), probes: generated.probes };
  mkdirSync(dirname(plan.outputPath), { recursive: true });
  writeFileSync(plan.outputPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  return fixture;
}

const invoked = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href;
if (import.meta.url === invoked) runProbeGenerationCli().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
