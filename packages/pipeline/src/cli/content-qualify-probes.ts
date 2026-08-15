/** Regression probe의 query-level human-free oracle을 두 독립 medium pass로 만든다. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod/v4';

import { buildSourceBundle, qualificationArtifactHash } from '../candidate-qualification.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from '../llm/query-gen.js';
import {
  ProbeQualificationRecordSchema,
  QualifiedProbeSchema,
  probeVerifierFingerprint,
  qualifyProbeFromPasses,
  verifyRegressionProbe,
} from '../regression-probe-qualification.js';
import { semanticCandidateHash } from '../semantic-verification.js';
import { assertPassageSourceFixtureIntegrity } from '../source-fixture.js';

const ROOT = process.cwd();
const FixtureSchema = z.object({
  name: z.string().min(1),
  gold: z.string().min(1),
  querySet: z.string().min(1),
  focal: z.string().min(1),
  probes: z.array(QualifiedProbeSchema).min(1),
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index < 0 ? undefined : argv[index + 1];
}

function required(argv: readonly string[], name: string): string {
  const value = option(argv, name);
  if (value === undefined) throw new Error(`${name} 값이 필요하다`);
  return value;
}

export function planProbeQualification(argv: readonly string[]) {
  const fixturePath = resolve(ROOT, required(argv, '--fixture'));
  const sourceFixturePath = resolve(ROOT, required(argv, '--source-fixture'));
  const sourceParagraphId = required(argv, '--source-paragraph-id');
  const outputDir = resolve(ROOT, required(argv, '--output-dir'));
  const fixture = FixtureSchema.parse(readJson<unknown>(fixturePath));
  const requested = option(argv, '--probe-ids')?.split(',').map((id) => id.trim()).filter(Boolean);
  const probes = requested === undefined
    ? fixture.probes
    : requested.map((id) => {
      const probe = fixture.probes.find((item) => item.id === id);
      if (probe === undefined) throw new Error(`--probe-ids에 없는 probe: ${id}`);
      return probe;
    });
  if (new Set(probes.map((probe) => probe.id)).size !== probes.length) throw new Error('--probe-ids 중복');
  const sourceFixture = assertPassageSourceFixtureIntegrity(readJson<unknown>(sourceFixturePath));
  const bundle = buildSourceBundle(sourceFixture, sourceParagraphId);
  const querySet = GeneratedQuerySetSchema.parse(readJson<unknown>(resolve(ROOT, fixture.querySet))) as GeneratedQuerySet;
  const completed = probes.filter((probe) => existsSync(resolve(outputDir, `${probe.id}.json`))).length;
  const summaryName = probes.length === fixture.probes.length
    ? 'summary.json'
    : `summary-${qualificationArtifactHash(probes.map((probe) => probe.id)).slice(7, 19)}.json`;
  return {
    dryRun: argv.includes('--dry-run'),
    paragraphId: querySet.paragraphId,
    fixturePath,
    sourceFixturePath,
    sourceParagraphId,
    outputDir,
    probeIds: probes.map((probe) => probe.id),
    verifierPassesPerProbe: 2,
    expectedLogicalApiCalls: (probes.length - completed) * 2,
    completedProbeRecords: completed,
    verifierFingerprint: probeVerifierFingerprint(),
    queryCandidateHash: semanticCandidateHash(querySet),
    sourceBundleHash: qualificationArtifactHash(bundle),
    summaryPath: resolve(outputDir, summaryName),
  };
}

export async function runProbeQualificationCli(argv = process.argv.slice(2)): Promise<unknown> {
  const plan = planProbeQualification(argv);
  if (plan.dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return plan;
  }
  if (existsSync(resolve(ROOT, '.env'))) process.loadEnvFile(resolve(ROOT, '.env'));
  if (process.env['ANTHROPIC_API_KEY'] === undefined) throw new Error('ANTHROPIC_API_KEY가 설정되지 않았다');
  mkdirSync(plan.outputDir, { recursive: true });
  const fixture = FixtureSchema.parse(readJson<unknown>(plan.fixturePath));
  const sourceFixture = assertPassageSourceFixtureIntegrity(readJson<unknown>(plan.sourceFixturePath));
  const bundle = buildSourceBundle(sourceFixture, plan.sourceParagraphId);
  const querySet = GeneratedQuerySetSchema.parse(readJson<unknown>(resolve(ROOT, fixture.querySet))) as GeneratedQuerySet;
  const records = [];
  for (const probeId of plan.probeIds) {
    const probe = fixture.probes.find((item) => item.id === probeId)!;
    const path = resolve(plan.outputDir, `${probe.id}.json`);
    if (existsSync(path)) {
      const record = ProbeQualificationRecordSchema.parse(readJson<unknown>(path));
      if (record.verifierFingerprint !== plan.verifierFingerprint
        || record.queryCandidateHash !== plan.queryCandidateHash
        || record.sourceBundleHash !== plan.sourceBundleHash) {
        throw new Error(`${probe.id}: 기존 record fingerprint 불일치`);
      }
      records.push(record);
      console.log(`${probe.id}: 완료 record 재사용 (${record.qualificationOutcome})`);
      continue;
    }
    const input = { paragraphId: querySet.paragraphId, bundle, querySet, studentResponse: probe.text };
    const first = await verifyRegressionProbe(input);
    const second = await verifyRegressionProbe(input);
    const record = qualifyProbeFromPasses({
      paragraphId: querySet.paragraphId,
      probe,
      defaultFocal: fixture.focal,
      querySet,
      queryCandidateHash: plan.queryCandidateHash,
      sourceBundleHash: plan.sourceBundleHash,
      passes: [first, second],
    });
    writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    records.push(record);
    console.log(`${probe.id}: ${record.qualificationOutcome} → ${record.derivedExpectedVerdict ?? 'inconclusive'}`);
    if (record.qualificationOutcome === 'quarantined') {
      throw new Error(`${probe.id}: 독립 pass 불일치로 quarantined`);
    }
  }
  const summary = {
    schemaVersion: 'regression-probe-qualification-summary-v1',
    paragraphId: querySet.paragraphId,
    verifierFingerprint: plan.verifierFingerprint,
    queryCandidateHash: plan.queryCandidateHash,
    sourceBundleHash: plan.sourceBundleHash,
    records: records.map((record) => ({
      probeId: record.probeId,
      qualificationOutcome: record.qualificationOutcome,
      derivedExpectedVerdict: record.derivedExpectedVerdict,
      fixtureExpectedVerdict: record.fixtureExpectedVerdict,
      fixtureAgreement: record.fixtureAgreement,
    })),
    completedAt: new Date().toISOString(),
  };
  writeFileSync(plan.summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return summary;
}

const invoked = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href;
if (import.meta.url === invoked) {
  runProbeQualificationCli().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
