import { describe, expect, it } from 'vitest';

import {
  type EvaluationInput,
  classifyDispute,
  collectBundles,
  jaccard,
  measureAgreement,
  toSentenceVerdicts,
} from './agreement.js';

function ev(goldId: string, slots: EvaluationInput['slots'], target = { kind: '없음', sentences: [] as string[] }) {
  return toSentenceVerdicts({ goldId, slots, firstTarget: target });
}

describe('toSentenceVerdicts', () => {
  it('슬롯 판정을 문장 좌표계로 옮긴다', () => {
    const v = ev('g1', [
      { slotId: 'c1', verdict: '충족', sentences: ['S1', 'S2'] },
      { slotId: 'c2', verdict: '누락', sentences: ['S3'] },
    ]);
    expect(v.bySentence.get('S1')).toBe('충족');
    expect(v.bySentence.get('S3')).toBe('누락');
    expect(v.hasContradiction).toBe(false);
  });

  it('한 문장이 여러 슬롯에 걸리면 가장 심각한 판정을 택한다', () => {
    const v = ev('g1', [
      { slotId: 'c1', verdict: '충족', sentences: ['S1'] },
      { slotId: 'c2', verdict: '모순', sentences: ['S1'] },
    ]);
    expect(v.bySentence.get('S1')).toBe('모순');
    expect(v.hasContradiction).toBe(true);
  });
});

describe('measureAgreement', () => {
  it('슬롯 경계가 달라도 판정이 같으면 완전 일치로 본다', () => {
    // g1은 S1·S2를 한 슬롯으로, g2는 두 슬롯으로 나눴지만 판정은 같다
    const g1 = ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1', 'S2'] }]);
    const g2 = ev('g2', [
      { slotId: 'x', verdict: '충족', sentences: ['S1'] },
      { slotId: 'y', verdict: '충족', sentences: ['S2'] },
    ]);
    const r = measureAgreement('r1', [g1, g2]);

    expect(r.fullAgreement).toBe(true);
    expect(r.sentenceAgreementRate).toBe(1);
    expect(r.disputedSentences).toEqual([]);
  });

  it('판정이 갈린 문장을 집어내고 성격을 분류한다', () => {
    const g1 = ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1', 'S2'] }]);
    const g2 = ev('g2', [
      { slotId: 'x', verdict: '충족', sentences: ['S1'] },
      { slotId: 'y', verdict: '누락', sentences: ['S2'] },
    ]);
    const r = measureAgreement('r1', [g1, g2]);

    expect(r.fullAgreement).toBe(false);
    expect(r.sentenceAgreementRate).toBe(0.5);
    expect(r.disputedSentences).toHaveLength(1);
    expect(r.disputedSentences[0]!.sentence).toBe('S2');
    expect(r.disputedSentences[0]!.verdicts.map((v) => v.verdict)).toEqual(['충족', '누락']);
    // 충족 vs 누락 정면 충돌 — 의미 문제
    expect(r.disputedSentences[0]!.kind).toBe('semantic');
    expect(r.semanticAgreementRate).toBe(0.5);
  });

  it('넓은 슬롯의 부분 vs 좁은 슬롯의 충족을 granularity로 분류한다', () => {
    // g1은 S3~S6을 한 슬롯으로 뭉쳐 '부분', g2는 나눠서 '충족'
    const g1 = ev('g1', [{ slotId: 'wide', verdict: '부분', sentences: ['S3'] }]);
    const g2 = ev('g2', [{ slotId: 'narrow', verdict: '충족', sentences: ['S3'] }]);
    const r = measureAgreement('r1', [g1, g2]);

    expect(r.disputedSentences[0]!.kind).toBe('granularity');
    expect(r.granularityVarianceCount).toBe(1);
    // granularity는 semantic 일치율을 깎지 않는다
    expect(r.semanticAgreementRate).toBe(1);
    expect(r.sentenceAgreementRate).toBe(0);
  });

  it('수정 필요 여부 일치를 잰다', () => {
    const g1 = ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1'] }], {
      kind: '없음',
      sentences: [],
    });
    const g2 = ev('g2', [{ slotId: 'x', verdict: '부분', sentences: ['S1'] }], {
      kind: '누락 보완',
      sentences: ['S1'],
    });
    expect(measureAgreement('r1', [g1, g2]).revisionNeededAgreement).toBe(false);
  });

  it('모순 유무가 갈리면 별도로 표시한다 — Gate A 발동 여부가 달라진다', () => {
    const g1 = ev('g1', [{ slotId: 'a', verdict: '모순', sentences: ['S1'] }]);
    const g2 = ev('g2', [{ slotId: 'x', verdict: '부분', sentences: ['S1'] }]);
    expect(measureAgreement('r1', [g1, g2]).contradictionAgreement).toBe(false);
  });

  it('첫 수정 타겟의 종류와 문장 겹침을 잰다', () => {
    const g1 = ev('g1', [{ slotId: 'a', verdict: '누락', sentences: ['S1'] }], {
      kind: '누락 보완',
      sentences: ['S1', 'S2'],
    });
    const g2 = ev('g2', [{ slotId: 'x', verdict: '누락', sentences: ['S1'] }], {
      kind: '누락 보완',
      sentences: ['S2', 'S3'],
    });
    const r = measureAgreement('r1', [g1, g2]);

    expect(r.firstTargetKindAgreement).toBe(true);
    expect(r.firstTargetOverlap).toBeCloseTo(1 / 3); // {S2} / {S1,S2,S3}
  });

  it('한쪽에만 있는 문장은 누락으로 간주해 비교한다', () => {
    const g1 = ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1', 'S2'] }]);
    const g2 = ev('g2', [{ slotId: 'x', verdict: '충족', sentences: ['S1'] }]);
    const r = measureAgreement('r1', [g1, g2]);
    expect(r.disputedSentences.map((d) => d.sentence)).toEqual(['S2']);
  });
});

describe('jaccard', () => {
  it('완전히 같으면 1', () => {
    expect(jaccard([['S1', 'S2'], ['S2', 'S1']])).toBe(1);
  });

  it('전부 비어 있으면 1로 본다 — 셋 다 고칠 것이 없다는 합의', () => {
    expect(jaccard([[], [], []])).toBe(1);
  });

  it('겹치지 않으면 0', () => {
    expect(jaccard([['S1'], ['S2']])).toBe(0);
  });
});

describe('classifyDispute', () => {
  it('모순이 끼면 semantic', () => {
    expect(classifyDispute(['모순', '누락'])).toBe('semantic');
    expect(classifyDispute(['모순', '부분'])).toBe('semantic');
  });

  it('부분이 한쪽 끝과만 붙으면 granularity', () => {
    expect(classifyDispute(['충족', '부분'])).toBe('granularity');
    expect(classifyDispute(['누락', '부분'])).toBe('granularity');
  });

  it('충족과 누락이 정면 충돌하면 semantic', () => {
    expect(classifyDispute(['충족', '누락'])).toBe('semantic');
    expect(classifyDispute(['충족', '부분', '누락'])).toBe('semantic');
  });
});

describe('collectBundles', () => {
  it('semantic과 granularity를 분리해 모은다', () => {
    const reports = [
      // S2: 충족 vs 누락 → semantic
      measureAgreement('r1', [
        ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1', 'S2'] }]),
        ev('g2', [
          { slotId: 'x', verdict: '충족', sentences: ['S1'] },
          { slotId: 'y', verdict: '누락', sentences: ['S2'] },
        ]),
      ]),
      // S3: 부분 vs 충족 → granularity
      measureAgreement('r2', [
        ev('g1', [{ slotId: 'a', verdict: '부분', sentences: ['S3'] }]),
        ev('g2', [{ slotId: 'x', verdict: '충족', sentences: ['S3'] }]),
      ]),
    ];

    const { semantic, granularity } = collectBundles(reports);
    expect(semantic.map((b) => b.sentence)).toEqual(['S2']);
    expect(granularity.map((b) => b.sentence)).toEqual(['S3']);
  });

  it('전부 일치하면 둘 다 비어 있다', () => {
    const report = measureAgreement('r1', [
      ev('g1', [{ slotId: 'a', verdict: '충족', sentences: ['S1'] }]),
      ev('g2', [{ slotId: 'x', verdict: '충족', sentences: ['S1'] }]),
    ]);
    const { semantic, granularity } = collectBundles([report]);
    expect(semantic).toEqual([]);
    expect(granularity).toEqual([]);
  });
});
