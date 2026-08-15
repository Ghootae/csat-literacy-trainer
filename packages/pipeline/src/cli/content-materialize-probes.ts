import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod/v4';

import { ProbeCandidateSchema, ProbeQualificationRecordSchema } from '../regression-probe-qualification.js';

const FixtureSchema = z.object({ name: z.string(), gold: z.string(), querySet: z.string(), focal: z.string(), probes: z.array(ProbeCandidateSchema) });
const ROOT = process.cwd();
const option = (argv: readonly string[], name: string) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const required = (argv: readonly string[], name: string) => { const v = option(argv, name); if (v === undefined) throw new Error(`${name} 값이 필요하다`); return v; };
const read = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;

export function materializeQualifiedProbeFixture(args: { candidate: unknown; loadRecord: (probeId: string) => unknown }) {
  const fixture = FixtureSchema.parse(args.candidate);
  return {
    ...fixture,
    probes: fixture.probes.map((probe) => {
      const record = ProbeQualificationRecordSchema.parse(args.loadRecord(probe.id));
      if (record.qualificationOutcome !== 'auto_qualified' || record.derivedExpectedVerdict === undefined) throw new Error(`${probe.id}: qualified oracle 없음`);
      return { ...probe, expectFocal: record.derivedExpectedVerdict, mutationSpec: { ...probe.mutationSpec, expectedCeiling: record.derivedExpectedVerdict } };
    }),
  };
}

export function runMaterializeProbeCli(argv = process.argv.slice(2)) {
  const output = resolve(ROOT, required(argv, '--output'));
  if (existsSync(output)) throw new Error(`기존 결과를 덮어쓰지 않는다: ${output}`);
  const recordDir = resolve(ROOT, required(argv, '--record-dir'));
  const result = materializeQualifiedProbeFixture({ candidate: read(required(argv, '--candidate-fixture')), loadRecord: (id) => read(resolve(recordDir, `${id}.json`)) });
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return result;
}

const invoked = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href;
if (import.meta.url === invoked) { try { runMaterializeProbeCli(); } catch (error) { console.error(error); process.exitCode = 1; } }
