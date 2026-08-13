import { describe, expect, it } from 'vitest';

import { listPassages, loadContent } from './content.js';

describe('광합성 전체 지문 앱 등록', () => {
  it('p1~p6을 빠짐없이 원문 순서로 제공한다', () => {
    const ids = listPassages()
      .map((passage) => passage.paragraphId)
      .filter((id) => id.startsWith('photosynthesis-p'));
    expect(ids).toEqual([
      'photosynthesis-p1',
      'photosynthesis-p2',
      'photosynthesis-p3',
      'photosynthesis-p4',
      'photosynthesis-p5',
      'photosynthesis-p6',
    ]);
  });

  it('각 문단이 골드·영역 질의·타이틀 질의까지 로드된다', () => {
    for (let n = 1; n <= 6; n++) {
      const content = loadContent(`photosynthesis-p${n}`);
      expect(content.gold.slots.length).toBeGreaterThan(0);
      expect(content.queries.regions.length).toBeGreaterThan(0);
      expect(content.titleQueries?.regions).toHaveLength(1);
    }
  });
});
