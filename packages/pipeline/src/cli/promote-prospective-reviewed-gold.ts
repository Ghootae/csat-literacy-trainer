import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ProblemQuestionGoldSchema } from '../problem-solving/gold.js';
import {
  GoldProductionMeasurementSchema,
  ProspectiveGoldReviewSchema,
  ProspectiveGoldSampleManifestSchema,
  SufficientGroundSetCandidateSchema,
  approveGoldForProspectiveBlindExperiment,
} from '../problem-solving/prospective-gold-experiment.js';

const DEFAULT_MANIFEST = resolve(
  'packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json',
);
const DEFAULT_OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production',
);

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const manifestPath = resolve(option('--manifest') ?? DEFAULT_MANIFEST);
  const outputRoot = resolve(option('--output-root') ?? DEFAULT_OUTPUT_ROOT);
  const manifest = ProspectiveGoldSampleManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')),
  );
  const results: Array<{
    caseId: string;
    status: 'MISSING_CANDIDATE' | 'PENDING' | 'REJECTED' | 'APPROVED';
    approvedSetCount?: number;
  }> = [];
  for (const item of manifest.items) {
    const directory = resolve(outputRoot, 'artifacts', item.caseId);
    const goldPath = resolve(directory, 'candidate-gold.json');
    const candidatesPath = resolve(directory, 'sufficient-ground-candidates.json');
    const reviewPath = resolve(directory, 'human-review.json');
    if (!await exists(goldPath) || !await exists(candidatesPath) || !await exists(reviewPath)) {
      results.push({ caseId: item.caseId, status: 'MISSING_CANDIDATE' });
      continue;
    }
    const gold = ProblemQuestionGoldSchema.parse(JSON.parse(await readFile(goldPath, 'utf8')));
    const candidates = SufficientGroundSetCandidateSchema.array().parse(
      JSON.parse(await readFile(candidatesPath, 'utf8')),
    );
    const review = ProspectiveGoldReviewSchema.parse(JSON.parse(await readFile(reviewPath, 'utf8')));
    if (review.status !== 'APPROVED') {
      results.push({ caseId: item.caseId, status: review.status });
      continue;
    }
    const approved = approveGoldForProspectiveBlindExperiment({ gold, candidates, review });
    await writeFile(
      resolve(directory, 'approved-blind-gold.json'),
      `${JSON.stringify(approved, null, 2)}\n`,
    );
    const measurementPath = resolve(directory, 'production-measurement.json');
    if (await exists(measurementPath)) {
      const measurement = GoldProductionMeasurementSchema.parse(
        JSON.parse(await readFile(measurementPath, 'utf8')),
      );
      await writeFile(measurementPath, `${JSON.stringify({
        ...measurement,
        reviewStatus: 'APPROVED',
        reviewMinutes: review.modification.reviewMinutes,
        modifiedFieldCount: review.modification.modifiedFieldCount,
        modifiedInferenceCount: review.modification.modifiedInferenceCount,
        riskLevel: review.risk.level,
      }, null, 2)}\n`);
    }
    results.push({
      caseId: item.caseId,
      status: 'APPROVED',
      approvedSetCount: approved.sufficientGroundSets?.length ?? 0,
    });
  }
  const summary = {
    manifestVersion: manifest.manifestVersion,
    candidateCount: results.filter((result) => result.status !== 'MISSING_CANDIDATE').length,
    missingCandidateCount: results.filter((result) => result.status === 'MISSING_CANDIDATE').length,
    pendingCount: results.filter((result) => result.status === 'PENDING').length,
    rejectedCount: results.filter((result) => result.status === 'REJECTED').length,
    approvedCount: results.filter((result) => result.status === 'APPROVED').length,
    results,
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(resolve(outputRoot, 'approval-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
