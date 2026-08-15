import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import { QualificationManifestSchema, buildSourceBundle } from './candidate-qualification.js';
import { QualifiedProbeSchema, parseCompatibleProbeQualificationRecord } from './regression-probe-qualification.js';
import { assertPassageSourceFixtureIntegrity } from './source-fixture.js';

const ROOT = process.cwd();
export const PassageCanaryPlanSchema = z.object({
  schemaVersion: z.literal('passage-canary-plan-v1'), passageId: z.string().min(1), sourceFixture: z.string().min(1),
  paragraphs: z.array(z.object({
    paragraphId: z.string().min(1), sourceParagraphId: z.string().min(1),
    qualificationManifests: z.array(z.string().min(1)).min(1),
    regressionFixture: z.string().min(1).optional(), probeRecords: z.array(z.string().min(1)),
  })).min(1),
});

const RegressionFixtureShape = z.object({ probes: z.array(z.object({ id: z.string().min(1) }).passthrough()).min(1) });
const read = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;

export function planPassageCanary(value: unknown) {
  const config = PassageCanaryPlanSchema.parse(value);
  const source = assertPassageSourceFixtureIntegrity(read(config.sourceFixture));
  const rows = config.paragraphs.map((paragraph) => {
    const bundle = buildSourceBundle(source, paragraph.sourceParagraphId);
    const sourceExists = source.paragraphs.some((item) => item.id === paragraph.sourceParagraphId);
    const manifests = paragraph.qualificationManifests.map((path) => QualificationManifestSchema.parse(read(path)));
    const sourceBindingsAgree = manifests.every((manifest) => manifest.sourceSetId === source.sourceSetId
      && manifest.sourceParagraphId === paragraph.sourceParagraphId
      && manifest.paragraphId === paragraph.paragraphId);
    const semanticAssets = (['gold', 'query', 'titleQuery'] as const).map((assetType) => ({
      assetType,
      qualified: manifests.some((manifest) => manifest.assets[assetType]?.qualificationStatus === 'qualified'),
      currentContractQualified: manifests.some((manifest) => manifest.verifierInputHash === bundle.verifierInputHash
        && manifest.assets[assetType]?.qualificationStatus === 'qualified'),
    }));
    const semanticReady = sourceExists && sourceBindingsAgree && semanticAssets.every((asset) => asset.currentContractQualified);
    const regressionFixtureExists = paragraph.regressionFixture !== undefined && existsSync(resolve(ROOT, paragraph.regressionFixture));
    const fixture = regressionFixtureExists ? RegressionFixtureShape.parse(read(paragraph.regressionFixture!)) : undefined;
    const probeCount = fixture?.probes.length ?? 0;
    const mutationSpecsComplete = fixture !== undefined && fixture.probes.every((probe) => QualifiedProbeSchema.safeParse(probe).success);
    const records = paragraph.probeRecords.map((path) => parseCompatibleProbeQualificationRecord(read(path)).record);
    const qualifiedProbeIds = new Set(records.filter((record) => record.qualificationOutcome === 'auto_qualified').map((record) => record.probeId));
    const probeOracleReady = fixture !== undefined && mutationSpecsComplete
      && fixture.probes.every((probe) => qualifiedProbeIds.has(probe.id));
    const regressionReady = manifests.some((manifest) => manifest.regression.status === 'passed');
    const blockers: string[] = [];
    if (!sourceExists || !sourceBindingsAgree) blockers.push('source binding 불완전');
    for (const asset of semanticAssets) {
      if (!asset.qualified) blockers.push(`${asset.assetType}: semantic qualification 미완료`);
      else if (!asset.currentContractQualified) blockers.push(`${asset.assetType}: current canonical evidence contract 재검증 필요`);
    }
    if (!regressionFixtureExists) blockers.push('regression fixture 없음');
    else if (!mutationSpecsComplete) blockers.push('probe mutation specification 미완료');
    if (!probeOracleReady) blockers.push('qualified probe oracle 미완료');
    if (!regressionReady) blockers.push('production regression proof 미완료');
    return {
      paragraphId: paragraph.paragraphId, sourceParagraphId: paragraph.sourceParagraphId, sourceBinding: sourceExists && sourceBindingsAgree,
      semanticAssets, semanticReady, regressionFixtureExists, probeCount, mutationSpecsComplete,
      qualifiedProbeCount: qualifiedProbeIds.size, probeOracleReady, regressionReady, blockers,
      knownProbeQualificationCalls: regressionFixtureExists ? Math.max(0, probeCount - qualifiedProbeIds.size) * 2 : 0,
      knownSemanticQualificationCalls: semanticAssets.filter((asset) => !asset.currentContractQualified).length * 2,
      knownProductionRegressionCalls: regressionFixtureExists && !regressionReady ? probeCount : 0,
    };
  });
  const knownCalls = rows.reduce((sum, row) => sum + row.knownSemanticQualificationCalls + row.knownProbeQualificationCalls + row.knownProductionRegressionCalls, 0);
  return {
    dryRun: true, passageId: config.passageId, sourceSetId: source.sourceSetId, paragraphCount: rows.length, rows,
    estimate: { knownLogicalApiCalls: knownCalls, hasUnknownCalls: rows.some((row) => !row.regressionFixtureExists) },
    batchReady: rows.every((row) => row.semanticReady && row.probeOracleReady && row.regressionReady),
  };
}
