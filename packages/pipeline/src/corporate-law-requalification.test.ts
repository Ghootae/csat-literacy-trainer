import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  QualificationManifestSchema,
  assertCandidatePromotionGate,
  buildSourceBundle,
  verifierInputText,
} from './candidate-qualification.js';
import { SemanticVerificationRecordV2Schema, assertV2QualificationGate } from './semantic-qualification.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { semanticVerifierFingerprint } from './semantic-verification.js';

const ROOT = process.cwd();
const ARTIFACT = 'packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z';
const P4_CANARY = 'packages/pipeline/fixtures/semantic-qualification/corporate-law-p4/2026-08-14T12-43-32-295Z';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

describe('corporate-law-p1 legacy v2 requalification evidence', () => {
  it('세 자산과 action-equivalent regression proof가 promotion gate를 통과한다', () => {
    const manifest = QualificationManifestSchema.parse(readJson(`${ARTIFACT}/qualification-manifest.json`));
    for (const kind of ['gold', 'query', 'title-query'] as const) {
      const record = SemanticVerificationRecordV2Schema.parse(readJson(`${ARTIFACT}/${kind}/record-v2.json`));
      expect(record).toMatchObject({
        assetType: kind,
        verifierKind: kind,
        cleanStreak: 2,
        qualificationStatus: 'qualified',
        repairCycles: 0,
        unresolvedBlockingIssues: 0,
      });
      expect(new Set(record.runs.slice(-2).map((run) => run.invocationId)).size).toBe(2);
    }
    expect(manifest.regression).toMatchObject({ status: 'passed', probeCount: 4 });
    expect(manifest.promotionStatus).toBe('ready');

    const source = readJson('packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json');
    const bundle = buildSourceBundle(source, 'p1');
    expect(() => assertCandidatePromotionGate({
      manifest,
      bundle,
      loadJson: readJson,
      verifierFingerprints: {
        gold: semanticVerifierFingerprint('gold', 'semantic-source-bundle-v2-footnotes-ignored'),
        query: semanticVerifierFingerprint('query', 'semantic-source-bundle-v2-footnotes-ignored'),
        'title-query': semanticVerifierFingerprint('title-query', 'semantic-source-bundle-v2-footnotes-ignored'),
      },
    })).not.toThrow();
  });
});

describe('corporate-law-p4 canonical segment evidence canary', () => {
  it('repair 후 마지막 두 ID-evidence pass가 서로 다른 invocation으로 qualified된다', () => {
    const source = readJson('packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json');
    const bundle = buildSourceBundle(source, 'p4');
    const record = SemanticVerificationRecordV2Schema.parse(readJson(`${P4_CANARY}/query/record-v2.json`));
    const candidate = readJson(`${P4_CANARY}/query/candidate.json`) as GeneratedQuerySet;
    expect(record).toMatchObject({
      assetType: 'query', verifierKind: 'query', qualificationStatus: 'qualified',
      cleanStreak: 2, repairCycles: 1, unresolvedBlockingIssues: 0,
    });
    expect(record.runs.some((run) => run.failureContract !== undefined)).toBe(false);
    expect(() => assertV2QualificationGate({
      record,
      expectedAssetType: 'query',
      expectedVerifierKind: 'query',
      sourceText: verifierInputText(bundle),
      evidenceSourceTexts: [bundle.qualificationPrimaryText],
      evidenceSegments: bundle.segments,
      candidate,
      verifierFingerprint: semanticVerifierFingerprint('query', 'canonical-source-segments-v1'),
      loadReport: readJson,
    })).not.toThrow();
  });
});
