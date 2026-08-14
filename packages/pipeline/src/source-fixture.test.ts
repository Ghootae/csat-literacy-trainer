import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildSourceBundle, verifierInputText } from './candidate-qualification.js';
import {
  assertCanonicalSourceSegmentation,
  assertPassageSourceFixtureIntegrity,
  type PassageSourceFixture,
} from './source-fixture.js';

const SOURCE_PATH = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
);

function corporateLawSource(): PassageSourceFixture {
  return assertPassageSourceFixtureIntegrity(JSON.parse(readFileSync(SOURCE_PATH, 'utf8')));
}

describe('canonical tracked source segments', () => {
  it('법인 p1~p5 segment가 각주 표식 없는 primaryText 전체를 gap/overlap 없이 재구성한다', () => {
    const fixture = corporateLawSource();
    for (const paragraph of fixture.paragraphs) {
      const bundle = buildSourceBundle(fixture, paragraph.id);
      expect(bundle.segments.map((segment) => segment.text).join('')).toBe(bundle.qualificationPrimaryText);
      expect(bundle.segments.map((segment) => segment.sourceSegmentId)).toEqual(
        bundle.segments.map((_, index) => `S${index + 1}`),
      );
      expect(verifierInputText(bundle)).not.toContain('*');
      expect(verifierInputText(bundle)).not.toContain('액면가:');
      expect(verifierInputText(bundle)).not.toContain('정관:');
    }
  });

  it('법인 p4는 고정된 S1~S7을 사용하고 액면가 각주 표식은 segment에 없다', () => {
    const bundle = buildSourceBundle(corporateLawSource(), 'p4');
    expect(bundle.segmentationVersion).toBe('canonical-source-segments-v1');
    expect(bundle.segments).toHaveLength(7);
    expect(bundle.segments[1]?.text).toContain('주식의 액면가를 곱한 금액');
    expect(bundle.segments[1]?.text).not.toContain('액면가*');
    expect(bundle.segments[2]?.sourceSegmentId).toBe('S3');
    expect(bundle.segments[5]?.sourceSegmentId).toBe('S6');
  });

  it('offset gap, hash 변조와 primaryText 불일치를 fail-closed한다', () => {
    const bundle = buildSourceBundle(corporateLawSource(), 'p4');
    const segmentation = {
      segmentationVersion: bundle.segmentationVersion,
      primaryTextHash: corporateLawSource().paragraphs.find((item) => item.id === 'p4')!
        .semanticSegmentation!.primaryTextHash,
      segments: bundle.segments.map(({ text: _text, ...segment }) => segment),
    };
    expect(() => assertCanonicalSourceSegmentation(bundle.qualificationPrimaryText, {
      ...segmentation,
      segments: segmentation.segments.map((segment, index) =>
        index === 1 ? { ...segment, startOffset: segment.startOffset + 1 } : segment),
    })).toThrow(/gap\/overlap/);
    expect(() => assertCanonicalSourceSegmentation(bundle.qualificationPrimaryText, {
      ...segmentation,
      segments: segmentation.segments.map((segment, index) =>
        index === 0 ? { ...segment, hash: `sha256:${'0'.repeat(64)}` } : segment),
    })).toThrow(/hash 불일치/);
    expect(() => assertCanonicalSourceSegmentation(`${bundle.qualificationPrimaryText}변조`, segmentation))
      .toThrow(/primaryTextHash/);
  });
});
