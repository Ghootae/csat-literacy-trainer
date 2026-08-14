import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  QualificationManifestSchema,
  assertCandidatePromotionGate,
  buildSourceBundle,
} from './candidate-qualification.js';
import { SemanticVerificationRecordV2Schema } from './semantic-qualification.js';
import { semanticVerifierFingerprint } from './semantic-verification.js';

const ROOT = process.cwd();
const ARTIFACT = 'packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

describe('corporate-law-p1 legacy v2 requalification evidence', () => {
  it('세 자산이 독립 clean 2회로 qualified되고 regression 불일치가 promotion을 차단한다', () => {
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
    expect(manifest.regression).toMatchObject({ status: 'failed', probeCount: 4 });
    expect(manifest.promotionStatus).toBe('blocked');

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
    })).toThrow(/regression proof/);
  });
});
