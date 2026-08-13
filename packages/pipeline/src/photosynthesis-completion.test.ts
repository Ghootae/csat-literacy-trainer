import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GoldGenerationMetadataSchema } from './gold-generation-metadata.js';
import { GeneratedQuerySetSchema } from './llm/query-gen.js';
import { validateTitleQuerySet } from './llm/title-gen.js';

const ROOT = process.cwd();
const PARAGRAPHS = [1, 2, 3, 4, 5, 6].map((n) => `photosynthesis-p${n}`);
const NEW_PARAGRAPHS = ['photosynthesis-p1', 'photosynthesis-p2', 'photosynthesis-p6'] as const;

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
}

describe('광합성 전체 지문 G1~G4 자산', () => {
  it('tracked 지문 manifest가 p1~p6의 정본 순서를 고정한다', () => {
    const manifest = readJson('content/passages/photosynthesis.json') as {
      passageId: string;
      sourceSetId: string;
      paragraphIds: readonly string[];
    };
    expect(manifest).toMatchObject({
      passageId: 'photosynthesis',
      sourceSetId: '69bce4ece23376a28e12cb7c',
      paragraphIds: PARAGRAPHS,
    });
  });

  it('p1~p6 모두 앱 콘텐츠 4종을 갖는다', () => {
    for (const id of PARAGRAPHS) {
      for (const file of ['passage.json', 'gold.json', 'queries.json', 'title-queries.json']) {
        expect(existsSync(resolve(ROOT, 'content', id, file)), `${id}/${file}`).toBe(true);
      }
    }
  });

  it('새 골드 3개는 생성 provenance와 사람 검수를 보존한다', () => {
    for (const id of NEW_PARAGRAPHS) {
      const gold = readJson(`content/${id}/gold.json`) as { generationMetadata?: unknown };
      const metadata = GoldGenerationMetadataSchema.parse(gold.generationMetadata);
      expect(metadata).toMatchObject({
        provider: 'anthropic',
        model: 'claude-opus-4-8',
        effort: 'medium',
        review: { status: 'reviewed' },
      });
    }
  });

  it('새 영역 질의는 검수된 생성 fixture와 production 파일이 일치한다', () => {
    for (const id of NEW_PARAGRAPHS) {
      const generated = readJson(
        `packages/pipeline/fixtures/generated-queries/${id}-v1-run1.json`,
      ) as { _meta?: { review?: { status?: string } }; paragraphId?: string; regions?: unknown };
      expect(generated._meta?.review?.status, id).toBe('reviewed');
      const production = GeneratedQuerySetSchema.parse(readJson(`content/${id}/queries.json`));
      expect(production).toEqual({ paragraphId: generated.paragraphId, regions: generated.regions });
    }
  });

  it('새 타이틀 질의는 3질의 구조 검사를 통과한다', () => {
    for (const id of NEW_PARAGRAPHS) {
      const set = GeneratedQuerySetSchema.parse(readJson(`content/${id}/title-queries.json`));
      expect(validateTitleQuerySet(set), id).toEqual([]);
    }
  });

  it('p1·p2·p6 표준 회귀 fixture는 총 16개의 사람 기대 판정을 고정한다', () => {
    const counts = NEW_PARAGRAPHS.map((id) => {
      const fixture = readJson(`packages/pipeline/fixtures/regression/${id}.json`) as {
        gold: string;
        querySet: string;
        probes: readonly { expectFocal: string }[];
      };
      expect(existsSync(resolve(ROOT, fixture.gold))).toBe(true);
      expect(existsSync(resolve(ROOT, fixture.querySet))).toBe(true);
      for (const probe of fixture.probes) {
        expect([
          'relation_preserved',
          'partial_relation_preservation',
          'topic_only',
          'region_not_evidenced',
          'contradicted',
        ]).toContain(probe.expectFocal);
      }
      return fixture.probes.length;
    });
    expect(counts).toEqual([4, 6, 6]);
  });
});
