import { describe, expect, it } from 'vitest';

import {
  type CoreRelation,
  type RegionShape,
  alignRegionsToReference,
  coreRelationCovered,
  jaccard,
} from './query-align.js';

const q = (
  id: string,
  props: string[],
  opts: Partial<{ level: 'scope' | 'relation' | 'argument'; edges: string[]; sents: string[] }> = {},
) => ({
  id,
  level: opts.level ?? 'relation',
  sentenceIds: opts.sents ?? [],
  propositionIds: props,
  relationEdgeIds: opts.edges ?? [],
  criticalForRelation: false,
  requiredForFullArgumentCoverage: false,
});

const region = (key: string, sents: string[], props: string[], queries = []): RegionShape => ({
  key,
  label: key,
  sentenceIds: sents,
  propositionIds: props,
  relationEdgeIds: [],
  queries,
});

describe('jaccard', () => {
  it('동일 집합=1, 서로소=0', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(jaccard(['a'], ['b'])).toBe(0);
    expect(jaccard([], [])).toBe(1);
  });
  it('부분 겹침', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
  });
});

describe('alignRegionsToReference — span/명제 겹침 기반', () => {
  const ref = [
    region('classification', ['S1', 'S2'], ['p1', 'p2', 'p3']),
    region('asset', ['S3', 'S4', 'S5'], ['p6', 'p7', 'p9']),
  ];

  it('ID·라벨이 달라도 같은 span·명제를 다루면 정렬된다', () => {
    const gen = [
      region('r_alpha', ['S3', 'S4', 'S5'], ['p6', 'p7', 'p9']),
      region('r_beta', ['S1', 'S2'], ['p1', 'p2']),
    ];
    const al = alignRegionsToReference(gen, ref);
    expect(al.find((a) => a.refKey === 'classification')!.matched!.key).toBe('r_beta');
    expect(al.find((a) => a.refKey === 'asset')!.matched!.key).toBe('r_alpha');
  });

  it('후보는 한 번만 쓰이고, 매칭 없으면 null', () => {
    const gen = [region('only', ['S1', 'S2'], ['p1', 'p2', 'p3'])];
    const al = alignRegionsToReference(gen, ref);
    expect(al.find((a) => a.refKey === 'classification')!.matched!.key).toBe('only');
    expect(al.find((a) => a.refKey === 'asset')!.matched).toBeNull();
  });
});

describe('coreRelationCovered — 앵커 기반 핵심 관계 존재 검사', () => {
  const roleSep: CoreRelation = { id: 'role_sep', label: '역할 분리', propositionIds: ['p6', 'p9'], relationEdgeIds: ['e1'] };

  it('명제 절반 이상 덮으면 커버', () => {
    const hit = coreRelationCovered(roleSep, [q('qX', ['p6', 'p9'], { edges: [] })]);
    expect(hit.covered).toBe(true);
    expect(hit.bestQueryId).toBe('qX');
  });
  it('관계 간선 앵커 일치면 명제 겹침 없어도 커버', () => {
    const hit = coreRelationCovered(roleSep, [q('qE', ['pZ'], { edges: ['e1'] })]);
    expect(hit.covered).toBe(true);
  });
  it('앵커 무관하면 미커버', () => {
    const hit = coreRelationCovered(roleSep, [q('qN', ['p1'], { edges: ['e9'] })]);
    expect(hit.covered).toBe(false);
  });
});
