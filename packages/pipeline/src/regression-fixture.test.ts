import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { RegionSemanticVerdict } from './query-normalize.js';

interface NietzscheRegressionFixture {
  readonly name: string;
  readonly gold: string;
  readonly querySet: string;
  readonly focal: string;
  readonly probes: readonly {
    readonly id: string;
    readonly sourceCaseId: string;
    readonly expectFocal: RegionSemanticVerdict;
    readonly text: string;
  }[];
}

interface SourceEvalCase {
  readonly probes: readonly {
    readonly id: string;
    readonly response: string;
    readonly targetRegionVerdicts: Readonly<Record<string, RegionSemanticVerdict>>;
  }[];
}

const ROOT = process.cwd();
const FIXTURE_PATH = 'packages/pipeline/fixtures/regression/nietzsche-p1.json';
const CORPORATE_FIXTURE_PATH = 'packages/pipeline/fixtures/regression/corporate-law-p1.json';
const SOURCE_PATH = 'packages/pipeline/fixtures/eval-cases/nietzsche-p1-attribution-swap.json';
const fixture = JSON.parse(readFileSync(resolve(ROOT, FIXTURE_PATH), 'utf8')) as NietzscheRegressionFixture;
const source = JSON.parse(readFileSync(resolve(ROOT, SOURCE_PATH), 'utf8')) as SourceEvalCase;

describe('Nietzsche 표준 회귀 fixture', () => {
  it('귀속 오류와 두 올바른 대조군을 정확히 3개 포함한다', () => {
    expect(fixture.probes.map((p) => p.sourceCaseId)).toEqual([
      'swapped-attribution',
      'correct-attribution-minimal',
      'correct-attribution-real',
    ]);
  });

  it('응답과 기대 focal 판정을 검수된 eval-case에서 그대로 승격한다', () => {
    const byId = new Map(source.probes.map((p) => [p.id, p]));
    for (const probe of fixture.probes) {
      const original = byId.get(probe.sourceCaseId);
      expect(original, probe.sourceCaseId).toBeDefined();
      expect(probe.text).toBe(original?.response);
      expect(probe.expectFocal).toBe(original?.targetRegionVerdicts[fixture.focal]);
    }
  });

  it('tracked production 골드·질의셋과 실제 focal 영역을 가리킨다', () => {
    expect(existsSync(resolve(ROOT, fixture.gold))).toBe(true);
    expect(existsSync(resolve(ROOT, fixture.querySet))).toBe(true);
    const querySet = JSON.parse(readFileSync(resolve(ROOT, fixture.querySet), 'utf8')) as {
      readonly regions: readonly { readonly regionId: string }[];
    };
    expect(querySet.regions.some((r) => r.regionId === fixture.focal)).toBe(true);
  });

  it('base 회귀가 fixture를 실제로 로드한다', () => {
    const sourceText = readFileSync(resolve(ROOT, 'packages/pipeline/src/cli/assess.ts'), 'utf8');
    expect(sourceText).toContain(`readJson<Config>(resolve(process.cwd(), '${FIXTURE_PATH}'))`);
  });
});

describe('법인 production-query 표준 회귀 fixture', () => {
  it('현재 production query와 역할 분리 focal에 4프로브를 결속한다', () => {
    const fixture = JSON.parse(readFileSync(resolve(process.cwd(), CORPORATE_FIXTURE_PATH), 'utf8')) as {
      gold: string;
      querySet: string;
      focal: string;
      probes: { id: string; expectFocal: string }[];
    };
    expect(fixture).toMatchObject({
      gold: 'content/corporate-law-p1/gold.json',
      querySet: 'content/corporate-law-p1/queries.json',
      focal: 'r3',
    });
    expect(fixture.probes).toHaveLength(4);
    expect(fixture.probes.map(({ expectFocal }) => expectFocal)).toEqual([
      'relation_preserved', 'topic_only', 'contradicted', 'topic_only',
    ]);
    const sourceText = readFileSync(resolve(ROOT, 'packages/pipeline/src/cli/assess.ts'), 'utf8');
    expect(sourceText).toContain(`readJson<Config>(resolve(process.cwd(), '${CORPORATE_FIXTURE_PATH}'))`);
    expect(sourceText).toContain("'legacy-corporate': [CORPORATE_LEGACY_CONFIG]");
  });
});
