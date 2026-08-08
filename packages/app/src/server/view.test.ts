import type { RegionAssessment } from '@csat/pipeline';
import { describe, expect, it } from 'vitest';

import type { Verdict } from '../shared/contract.js';
import { type RegionRecord, bestOf, isBlocked, toRecord, toRegionViews } from './view.js';

const ANSWER = '법인 소유 vs 사람 운용의 역할 분리';

function assessment(regionId: string, verdict: Verdict, feedback = `${verdict} 문구`): RegionAssessment {
  return {
    regionId,
    label: ANSWER,
    verdict,
    feedback,
    propositionEvidence: [{ propositionId: 'p1', shortForm: '명제1', state: 'evidenced', viaStudentItems: [] }],
    _debug: { argumentCoverage: 'none', expressionProfile: 'none' },
  };
}

function views(opts: {
  verdict: Verdict;
  best?: RegionRecord;
  targeted?: boolean;
  revised?: boolean;
  feedback?: string;
}) {
  return toRegionViews({
    assessments: [assessment('r1', opts.verdict, opts.feedback)],
    said: new Map([['r1', ['내가 쓴 것']]]),
    sentenceIds: new Map([['r1', ['S1', 'S2']]]),
    revised: new Set(opts.revised === true ? ['r1'] : []),
    ...(opts.best === undefined ? {} : { best: new Map([['r1', opts.best]]) }),
    ...(opts.targeted === true ? { targetRegionIds: new Set(['r1']) } : {}),
  })[0]!;
}

const partial: RegionRecord = {
  regionId: 'r1',
  verdict: 'partial_relation_preservation',
  feedback: '관계의 한 축은 잡았어요',
  said: ['이전에 쓴 것'],
};

/**
 * §2.1 (2026-08-08 개정). 같은 입력에도 영역 판정이 갈리는 것이 측정됐으므로(2/9),
 * 학생이 건드리지 않은 영역의 강등은 설명할 수 없는 강등이 된다.
 */
describe('표시 규칙 — 겨냥한 영역만 정직하게', () => {
  it('겨냥한 영역은 강등을 그대로 보여준다', () => {
    const v = views({ verdict: 'topic_only', best: partial, targeted: true });
    expect(v.verdict).toBe('topic_only');
  });

  it('겨냥하지 않은 영역은 강등을 가린다 — 이전 최고를 유지', () => {
    const v = views({ verdict: 'topic_only', best: partial });
    expect(v.verdict).toBe('partial_relation_preservation');
  });

  it('가릴 때 문구도 그 시점 것으로 바뀐다 (박스와 텍스트가 따로 놀지 않게)', () => {
    const v = views({ verdict: 'topic_only', best: partial, feedback: '화제는 짚었어요' });
    expect(v.feedback).toBe('관계의 한 축은 잡았어요');
    expect(v.said).toEqual(['이전에 쓴 것']);
  });

  it('상승은 겨냥 여부와 무관하게 그대로 반영한다', () => {
    const v = views({ verdict: 'relation_preserved', best: partial });
    expect(v.verdict).toBe('relation_preserved');
  });

  it('best가 없으면 현재 판정을 쓴다', () => {
    expect(views({ verdict: 'topic_only' }).verdict).toBe('topic_only');
  });

  it('★ 모순은 겨냥하지 않아도 표시한다 — 가리면 하드 게이트가 조용히 실패한다', () => {
    const v = views({ verdict: 'contradicted', best: partial });
    expect(v.verdict).toBe('contradicted');
    expect(v.forced).toBe(true);
    expect(isBlocked([v])).toBe(true);
  });
});

describe('골드 차단 — 공개 조건은 둘뿐', () => {
  it('미달 + 미시도 → label·propositions를 아예 담지 않는다', () => {
    const v = views({ verdict: 'topic_only' });
    expect(v.revealed).toBe(false);
    expect('label' in v).toBe(false);
    expect('propositions' in v).toBe(false);
  });

  it('미달 + 시도함 → 간략 정답만. 명제는 담지 않는다', () => {
    const v = views({ verdict: 'topic_only', revised: true });
    expect(v.label).toBe(ANSWER);
    expect('propositions' in v).toBe(false);
  });

  it('관계보존 → 정답과 명제를 함께 공개한다', () => {
    const v = views({ verdict: 'relation_preserved' });
    expect(v.label).toBe(ANSWER);
    expect(v.propositions).toHaveLength(1);
  });

  it('시도한 영역은 "다듬기"가 사라진다 (영역당 1회)', () => {
    expect(views({ verdict: 'topic_only' }).canRevise).toBe(true);
    expect(views({ verdict: 'topic_only', revised: true }).canRevise).toBe(false);
    expect(views({ verdict: 'relation_preserved' }).canRevise).toBe(false);
  });
});

describe('bestOf — 영역별 최고 기록', () => {
  it('여러 시도 중 가장 높은 판정을 남긴다', () => {
    const best = bestOf([
      [toRecord(assessment('r1', 'topic_only'), [], false)],
      [toRecord(assessment('r1', 'relation_preserved'), [], false)],
      [toRecord(assessment('r1', 'region_not_evidenced'), [], false)],
    ]);
    expect(best.get('r1')?.verdict).toBe('relation_preserved');
  });

  it('모순은 사다리 밖이라 어떤 도달 수준보다 낮게 친다', () => {
    const best = bestOf([
      [toRecord(assessment('r1', 'contradicted'), [], false)],
      [toRecord(assessment('r1', 'region_not_evidenced'), [], false)],
    ]);
    expect(best.get('r1')?.verdict).toBe('region_not_evidenced');
  });
});
