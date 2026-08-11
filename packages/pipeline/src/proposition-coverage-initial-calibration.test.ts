import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { type AssessQuery, type AssessRegionMeta, type QueryVerdict, assess } from './assessment.js';
import type { NormalizedRegion } from './query-normalize.js';

type Coverage = 'explicit' | 'partial' | 'none';
type PartCoverage = 'complete' | 'partial' | 'absent';

interface CoreCase {
  readonly id: string;
  readonly sourceType: 'actual' | 'controlled_probe';
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly response: string;
  readonly shortForm: string;
  readonly expectedCoverage: Coverage;
  readonly startPresent: boolean;
  readonly endPresent: boolean;
  readonly relationPresent: boolean;
  readonly sameRelationFrame: boolean;
  readonly topicOnly: boolean;
  readonly startCoverage: PartCoverage;
  readonly endCoverage: PartCoverage;
  readonly presentParts: readonly string[];
  readonly missingParts: readonly string[];
  readonly completionNote?: string;
  readonly rationale?: string;
}

interface CoreFixture {
  readonly datasetRole: 'initial_calibration_core';
  readonly includeInAgreement: true;
  readonly note: string;
  readonly cases: readonly CoreCase[];
}

interface BoundaryCase {
  readonly id: string;
  readonly sourceType: 'actual';
  readonly paragraphId: string;
  readonly propositionId: string;
  readonly response: string;
  readonly shortForm: string;
  readonly axisExpression: string;
  readonly boundaryType: 'axis_only_mapping';
  readonly includeInAgreement: false;
  readonly rationale: string;
  readonly expectedCoverage?: never;
}

interface BoundaryFixture {
  readonly datasetRole: 'policy_boundary';
  readonly includeInAgreement: false;
  readonly cases: readonly BoundaryCase[];
}

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'packages/pipeline/fixtures', name), 'utf8')) as T;

const core = fixture<CoreFixture>('proposition-coverage-initial-calibration.json');
const boundary = fixture<BoundaryFixture>('proposition-coverage-calibration-boundary.json');

const CONTROLLED_RESPONSES = new Map([
  ['partial-nietzsche-p1-p12-attribution-subject', '삶을 수단화하는 전도된 사유에 반대했다.'],
  [
    'partial-science-p5-p2-manganese',
    'NCM계 리튬 금속 산화물은 코발트 함량을 줄이고 니켈을 혼합한 것이다.',
  ],
  ['partial-disclosure-p3-p1-distribution-market', '공시 의무는 발행 시장에서 발생한다.'],
  [
    'partial-photosynthesis-p5-p15-c4-endpoint',
    'C3 식물의 캘빈 회로는 동일하게 작동한다.',
  ],
] as const);

describe('proposition coverage initial calibration core — 구조', () => {
  it('final acceptance set이 아닌 24개 initial calibration core다', () => {
    expect(core.datasetRole).toBe('initial_calibration_core');
    expect(core.note).toContain('final acceptance set이 아니며');
    expect(core.includeInAgreement).toBe(true);
    expect(core.cases).toHaveLength(24);
  });

  it('explicit / partial / none이 각각 8개다', () => {
    const count = (coverage: Coverage) =>
      core.cases.filter((c) => c.expectedCoverage === coverage).length;
    expect({ explicit: count('explicit'), partial: count('partial'), none: count('none') }).toEqual({
      explicit: 8,
      partial: 8,
      none: 8,
    });
  });

  it('case ID는 중복되지 않고 필수 문자열과 R1 구조를 가진다', () => {
    expect(new Set(core.cases.map((c) => c.id)).size).toBe(core.cases.length);
    for (const c of core.cases) {
      expect(c.id.trim()).not.toBe('');
      expect(c.response.trim()).not.toBe('');
      expect(c.shortForm.trim()).not.toBe('');
      expect(['actual', 'controlled_probe']).toContain(c.sourceType);
      expect(['complete', 'partial', 'absent']).toContain(c.startCoverage);
      expect(['complete', 'partial', 'absent']).toContain(c.endCoverage);
      expect(c.completionNote ?? c.rationale ?? '').not.toBe('');
    }
  });

  it('모든 shortForm은 현재 paragraph gold와 일치한다', () => {
    const goldByParagraph = new Map<string, Map<string, string>>();
    for (const c of [...core.cases, ...boundary.cases]) {
      let propositions = goldByParagraph.get(c.paragraphId);
      if (propositions === undefined) {
        const gold = JSON.parse(
          readFileSync(resolve(process.cwd(), 'content', c.paragraphId, 'gold.json'), 'utf8'),
        ) as { propositions: readonly { id: string; shortForm: string }[] };
        propositions = new Map(gold.propositions.map((p) => [p.id, p.shortForm]));
        goldByParagraph.set(c.paragraphId, propositions);
      }
      expect(propositions.get(c.propositionId), c.id).toBe(c.shortForm);
    }
  });

  it('partial 8개는 같은 관계 프레임이며 topic-only가 아니다', () => {
    const partial = core.cases.filter((c) => c.expectedCoverage === 'partial');
    expect(partial).toHaveLength(8);
    for (const c of partial) {
      expect(c.sameRelationFrame, c.id).toBe(true);
      expect(c.topicOnly, c.id).toBe(false);
      expect(c.completionNote?.trim(), c.id).not.toBe('');
      expect(c.missingParts.length, c.id).toBeGreaterThan(0);
    }
  });

  it('controlled probe 4개는 승인된 정확한 응답 문구를 쓴다', () => {
    const controlled = core.cases.filter((c) => c.sourceType === 'controlled_probe');
    expect(controlled).toHaveLength(4);
    expect(new Set(controlled.map((c) => c.id))).toEqual(new Set(CONTROLLED_RESPONSES.keys()));
    for (const [id, response] of CONTROLLED_RESPONSES) {
      expect(controlled.find((c) => c.id === id)?.response).toBe(response);
    }
  });

  it('복합 endpoint/논항 probe는 부분 coverage와 구성 요소를 보존한다', () => {
    const expected = new Map([
      [
        'partial-science-p5-p2-manganese',
        { present: ['코발트 감소', '니켈 혼합'], missing: ['망가니즈 혼합'] },
      ],
      [
        'partial-disclosure-p3-p1-distribution-market',
        { present: ['발행 시장'], missing: ['유통 시장'] },
      ],
      [
        'partial-photosynthesis-p5-p15-c4-endpoint',
        {
          present: ['C3 식물의 캘빈 회로', '동일하게 작동'],
          missing: ['C4 식물의 캘빈 회로 비교 endpoint'],
        },
      ],
    ] as const);
    for (const [id, parts] of expected) {
      const c = core.cases.find((x) => x.id === id);
      expect(c?.endCoverage, id).toBe('partial');
      expect(c?.presentParts, id).toEqual(parts.present);
      expect(c?.missingParts, id).toEqual(parts.missing);
    }
  });
});

describe('axis-only mapping boundary — core와 agreement에서 격리', () => {
  it('정책 경계 4개는 expectedCoverage 없이 분리돼 있다', () => {
    expect(boundary.datasetRole).toBe('policy_boundary');
    expect(boundary.includeInAgreement).toBe(false);
    expect(boundary.cases).toHaveLength(4);
    for (const c of boundary.cases) {
      expect(c.boundaryType).toBe('axis_only_mapping');
      expect(c.includeInAgreement).toBe(false);
      expect('expectedCoverage' in c).toBe(false);
    }
  });

  it('agreement 대상으로 조립해도 boundary case는 분모에 들어가지 않는다', () => {
    const sources = [core, boundary];
    const agreementCases = sources.flatMap((f) => (f.includeInAgreement ? f.cases : []));
    expect(agreementCases).toHaveLength(24);
    expect(agreementCases.some((c) => c.id.startsWith('boundary-'))).toBe(false);
  });
});

describe('initial calibration fixture는 production 집계를 바꾸지 않는다', () => {
  const region: NormalizedRegion = {
    id: 'r',
    label: '영역',
    scope: { semanticState: 'preserved', expressionMode: 'explicit', source: 'scope_query' },
    rawScope: { semanticState: 'preserved', expressionMode: 'explicit', source: 'scope_query' },
    scopePromoted: false,
    relations: [],
    arguments: [],
    contradiction: false,
    regionSemanticVerdict: 'relation_preserved',
    argumentCoverage: 'partial',
    expressionProfile: 'explicit',
  };
  const meta: AssessRegionMeta = { id: 'r', label: '영역', propositionIds: ['p'] };
  const query: AssessQuery = {
    id: 'q',
    regionId: 'r',
    level: 'relation',
    question: '관계는 무엇인가?',
    propositionIds: ['p'],
    expectedAnswer: '관계',
    critical: true,
  };
  const verdict: QueryVerdict = {
    semanticState: 'preserved',
    expressionMode: 'explicit',
    evidence: '응답',
    viaItem: '항목',
    evidenceRole: 'relation',
  };

  it('propositionCoverage를 바꿔도 기존 assessment 결과가 동일하다', () => {
    const explicit = { ...verdict, propositionCoverage: [{ propositionId: 'p', coverage: 'explicit' as const }] };
    const none = { ...verdict, propositionCoverage: [{ propositionId: 'p', coverage: 'none' as const }] };
    const run = (v: QueryVerdict) => assess([region], [meta], [query], new Map([['q', v]]));
    expect(run(explicit)).toEqual(run(none));
  });
});
