import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { planPassageCanary } from './passage-canary.js';

const plan = () => planPassageCanary(JSON.parse(readFileSync('packages/pipeline/fixtures/passage-canary/corporate-law.json', 'utf8')) as unknown);

describe('corporate-law passage canary dry-run', () => {
  it('p1~p5와 실제 source/qualification/regression 공백을 계산한다', () => {
    const result = plan();
    expect(result.paragraphCount).toBe(5);
    expect(result.rows.every((row) => row.sourceBinding)).toBe(true);
    expect(result.rows.every((row) => !row.semanticReady)).toBe(true);
    expect(result.rows.find((row) => row.paragraphId === 'corporate-law-p4')?.knownSemanticQualificationCalls).toBe(4);
    expect(result.rows.find((row) => row.paragraphId === 'corporate-law-p2')?.probeOracleReady).toBe(true);
    expect(result.rows.find((row) => row.paragraphId === 'corporate-law-p4')?.regressionFixtureExists).toBe(false);
    expect(result.estimate).toEqual({ knownLogicalApiCalls: 64, hasUnknownCalls: true });
    expect(result.batchReady).toBe(false);
  });

  it('p1/p3/p5의 legacy probe는 mutation spec 없이는 qualified로 보지 않는다', () => {
    const result = plan();
    for (const id of ['corporate-law-p1', 'corporate-law-p3', 'corporate-law-p5']) {
      const row = result.rows.find((item) => item.paragraphId === id)!;
      expect(row.mutationSpecsComplete).toBe(false);
      expect(row.blockers).toContain('probe mutation specification 미완료');
    }
  });
});
