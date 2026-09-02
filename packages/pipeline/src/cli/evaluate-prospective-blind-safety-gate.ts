import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  ProspectiveSafetyObservationSchema,
  evaluateProspectiveBlindSafetyGate,
} from '../problem-solving/prospective-gold-experiment.js';

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function main(): Promise<void> {
  const inputPath = option('--input');
  if (inputPath === undefined) throw new Error('--input=<observations.json>이 필요하다.');
  const outputPath = resolve(option('--output') ??
    'docs/experiments/problem-gold-prospective-blind-2026-09-03/prospective-blind/safety-gate.json');
  const observations = ProspectiveSafetyObservationSchema.array().parse(
    JSON.parse(await readFile(resolve(inputPath), 'utf8')),
  );
  const gate = evaluateProspectiveBlindSafetyGate(observations);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(gate, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
  if (!gate.passed) process.exitCode = 1;
}

await main();
