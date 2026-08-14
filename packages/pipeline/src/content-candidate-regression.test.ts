import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CandidateRegressionFixtureSchema, planCandidateRegression } from './cli/content-candidate-regression.js';
import { QualificationManifestSchema } from './candidate-qualification.js';

const ROOT = process.cwd();
const CASES = [
  ['corporate-law-p2', '2026-08-14T08-54-23-647Z', 6],
  ['corporate-law-p3', '2026-08-14T09-02-06-967Z', 6],
  ['corporate-law-p5', '2026-08-14T09-23-00-722Z', 8],
] as const;

describe('candidate production regression', () => {
  for (const [paragraphId, stamp, count] of CASES) {
    it(`${paragraphId} fixture가 qualified candidate와 ${count}개 probe를 결속한다`, () => {
      const manifestPath = `packages/pipeline/fixtures/semantic-qualification/${paragraphId}/${stamp}/qualification-manifest.json`;
      const fixturePath = `packages/pipeline/fixtures/regression/${paragraphId}.json`;
      const manifest = QualificationManifestSchema.parse(JSON.parse(readFileSync(resolve(ROOT, manifestPath), 'utf8')));
      const fixture = CandidateRegressionFixtureSchema.parse(JSON.parse(readFileSync(resolve(ROOT, fixturePath), 'utf8')));
      expect(fixture.probes).toHaveLength(count);
      expect(fixture.querySet).toBe(manifest.assets.query?.candidatePath);
      expect(fixture.gold).toBe(manifest.assets.gold?.candidatePath);
      const ids = new Set(fixture.probes.map((probe) => probe.id));
      expect(ids.size).toBe(count);
      const plan = planCandidateRegression(['--manifest', manifestPath, '--fixture', fixturePath, '--dry-run']);
      expect(plan.expectedApiCalls).toBe(count);
      expect(plan.logPath.endsWith('production-regression.jsonl')).toBe(true);
      expect(plan.settings).toMatchObject({ provider: 'anthropic', effort: 'low', propositionCoverage: 'off' });
    });
  }
});
