import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  PrincipleExceptionEvidenceOutputSchema,
  adjudicatePrincipleExceptionCoverageWithScopeGate,
} from '../paragraph-analysis/principle-exception-adjudicator.js';
import { ParagraphPropositionBundleSchema, artifactHash } from '../paragraph-analysis/production.js';
import { ParagraphGoldAuditInputSchema } from '../paragraph-analysis/production-runtime.js';

const VERSION = 'principle-exception-scope-gate-offline-v1' as const;
const PROJECT_ROOT = process.cwd();
const BATCH_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-004-three-passages/artifacts',
);
const SOURCE_EXPERIMENT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/principle-exception-adjudicator-batch004-2026-09-04',
);
const OUTPUT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/principle-exception-scope-gate-offline-2026-09-04',
);

const TARGETS = [
  { paragraphId: '69bffa62fa5063deffe19c88-p6', role: 'KNOWN_DEFECT' },
  { paragraphId: '69bffa62fa5063deffe19c88-p5', role: 'COMPLETE_POSITIVE_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p1', role: 'NORMAL_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p7', role: 'NORMAL_CONTROL' },
  { paragraphId: '69bffa62fa5063deffe19c88-p8', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c006f178128b2a9bedd2f3-p5', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p2', role: 'NORMAL_CONTROL' },
  { paragraphId: '69c0ad79fa5063deffe1e90b-p4', role: 'NORMAL_CONTROL' },
] as const;

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

interface OriginalStage {
  readonly evidence: unknown;
  readonly adjudication: unknown;
  readonly metadata: { readonly responseId: string };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildInput(paragraphId: string) {
  const passageId = paragraphId.split('-p')[0]!;
  const directory = resolve(BATCH_ROOT, passageId, paragraphId);
  const source = readJson(resolve(directory, '00-source.json')) as SourceArtifact;
  return ParagraphGoldAuditInputSchema.parse({
    sourceId: source.sourceId,
    passageId: source.passageId,
    passageParagraphs: source.passageParagraphs,
    targetParagraph: {
      paragraphId,
      position: source.paragraph.position,
      text: source.paragraph.text,
      textReferencesVisual: source.paragraph.textReferencesVisual,
      passageMediaCount: source.mediaCount,
    },
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(directory, 'diagnostic-gold-candidate.json')),
    ),
    propositionBundle: ParagraphPropositionBundleSchema.parse(
      readJson(resolve(directory, 'proposition-bundle-candidate.json')),
    ),
  });
}

function main(): void {
  const records = TARGETS.map((target) => {
    const input = buildInput(target.paragraphId);
    const sourcePath = resolve(
      SOURCE_EXPERIMENT_ROOT,
      'artifacts',
      target.paragraphId,
      '01-adjudication.json',
    );
    if (!existsSync(sourcePath)) throw new Error(`원시 판정 artifact 없음: ${target.paragraphId}`);
    const sourceStage = readJson(sourcePath) as OriginalStage;
    const evidence = PrincipleExceptionEvidenceOutputSchema.parse(sourceStage.evidence);
    const scopedAdjudication = adjudicatePrincipleExceptionCoverageWithScopeGate(evidence, input);
    const record = {
      artifactType: 'principle-exception-scope-gate-projection-v1',
      createdAt: new Date().toISOString(),
      paragraphId: target.paragraphId,
      role: target.role,
      sourceResponseId: sourceStage.metadata.responseId,
      sourceArtifactHash: artifactHash(sourceStage),
      originalAdjudication: sourceStage.adjudication,
      scopedAdjudication,
    };
    writeJson(resolve(OUTPUT_ROOT, 'artifacts', target.paragraphId, '01-scope-gated.json'), record);
    return {
      paragraphId: target.paragraphId,
      role: target.role,
      status: scopedAdjudication.status,
      requiresSourceFidelityReview: scopedAdjudication.requiresSourceFidelityReview,
      productionEligibleForThisCheck: scopedAdjudication.productionEligibleForThisCheck,
    };
  });

  const known = records.find((record) => record.role === 'KNOWN_DEFECT')!;
  const positive = records.find((record) => record.role === 'COMPLETE_POSITIVE_CONTROL')!;
  const nonDefects = records.filter((record) => record.role !== 'KNOWN_DEFECT');
  const summaryCore = {
    artifactType: 'principle-exception-scope-gate-offline-summary-v1',
    version: VERSION,
    sourceExperimentHash: artifactHash(readJson(resolve(SOURCE_EXPERIMENT_ROOT, 'experiment-summary.json'))),
    apiCalls: 0,
    apiCostUsd: 0,
    records,
    metrics: {
      knownDefectDetected: known.status === 'FAIL',
      completePositiveControlPassed: positive.status === 'PASS',
      diagnosticCoverageFalsePositiveCount: nonDefects.filter((record) => record.status === 'FAIL').length,
      deferredToSourceFidelityCount: records.filter(
        (record) => record.status === 'DEFER_TO_SOURCE_FIDELITY',
      ).length,
    },
  };
  writeJson(resolve(OUTPUT_ROOT, 'experiment-summary.json'), {
    ...summaryCore,
    createdAt: new Date().toISOString(),
    artifactHash: artifactHash(summaryCore),
  });
  console.log(JSON.stringify(summaryCore, null, 2));
}

main();

