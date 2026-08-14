import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assemblePassageSource,
  PassageSourceFixtureSchema,
  sourceTextHash,
} from './source-fixture.js';

const FIXTURE_PATH = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
);

function loadFixture() {
  return PassageSourceFixtureSchema.parse(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')));
}

describe('법인 tracked source fixture', () => {
  it('출처 metadata와 source set ID를 고정한다', () => {
    expect(loadFixture()).toMatchObject({
      sourceSetId: '69bbf88d8937cf14551903ca',
      title: '법인의 종류와 자산 운용의 법적 통제',
      field: '법학',
      exam: {
        grade: '고3',
        year: 2025,
        month: 10,
        administrator: '교육청',
        questionRange: '10~13',
      },
      provenance: { runtimeDependency: false },
    });
  });

  it('본문 p1~p5와 각주 2개를 서로 분리하고 순서를 고정한다', () => {
    const fixture = loadFixture();
    expect(fixture.paragraphs.map(({ id, order }) => ({ id, order }))).toEqual(
      [1, 2, 3, 4, 5].map((order) => ({ id: `p${order}`, order })),
    );
    expect(new Set(fixture.paragraphs.map(({ id }) => id)).size).toBe(5);
    expect(fixture.footnotes).toHaveLength(2);
    expect(fixture.footnotes.map(({ targetParagraphId, targetTerm }) => ({ targetParagraphId, targetTerm }))).toEqual([
      { targetParagraphId: 'p1', targetTerm: '정관' },
      { targetParagraphId: 'p4', targetTerm: '액면가' },
    ]);
    for (const footnote of fixture.footnotes) {
      expect(fixture.paragraphs.some(({ text }) => text.includes(footnote.text))).toBe(false);
    }
  });

  it('문단별 hash와 전체 source hash를 fixture 문자열만으로 재계산한다', () => {
    const fixture = loadFixture();
    expect(fixture.hashContract).toMatchObject({
      algorithm: 'sha256',
      encoding: 'utf8',
      normalization: 'normalizeGoldSource-v1',
      fullSourceAssembly: 'paragraphs-then-footnotes-joined-with-LF',
    });
    for (const paragraph of fixture.paragraphs) {
      expect(paragraph.hash, paragraph.id).toBe(sourceTextHash(paragraph.text));
    }
    expect(fixture.fullSourceHash).toBe(sourceTextHash(assemblePassageSource(fixture)));
  });
});
