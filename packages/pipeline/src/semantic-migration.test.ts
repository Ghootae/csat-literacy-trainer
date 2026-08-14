import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  assertVerificationGate,
  reportBlockers,
  SemanticVerificationRecordSchema,
  SemanticVerificationReportSchema,
} from './semantic-verification.js';

const ROOT = process.cwd();
const IDS = [
  'corporate-law-p1', 'disclosure-p3', 'humanities-p4', 'nietzsche-p1',
  'photosynthesis-p1', 'photosynthesis-p2', 'photosynthesis-p3',
  'photosynthesis-p4', 'photosynthesis-p5', 'photosynthesis-p6', 'science-p5',
] as const;

function read<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as T;
}

describe('production semantic verification migration', () => {
  it('11개 production 단락의 gold·영역 질의·타이틀 질의가 모두 현재 gate를 통과한다', () => {
    for (const id of IDS) {
      const passage = read<{ text: string }>(`content/${id}/passage.json`);
      const gold = read<Gold>(`content/${id}/gold.json`);
      const queries = read<GeneratedQuerySet>(`content/${id}/queries.json`);
      const titleQueries = read<GeneratedQuerySet>(`content/${id}/title-queries.json`);
      expect(() => assertVerificationGate(passage.text, gold, gold.semanticVerification), `${id}/gold`).not.toThrow();
      expect(() => assertVerificationGate(passage.text, queries, queries.semanticVerification), `${id}/queries`).not.toThrow();
      expect(() => assertVerificationGate(passage.text, titleQueries, titleQueries.semanticVerification), `${id}/title`).not.toThrow();
      const titleById = new Map(titleQueries.regions[0]?.queries.map((query) => [query.id, query]));
      expect(titleById.get('qT1')?.criticalForRelation, `${id}/qT1`).toBe(false);
      expect(titleById.get('qT2')?.criticalForRelation, `${id}/qT2`).toBe(true);
      expect(titleById.get('qT3')?.criticalForRelation, `${id}/qT3`).toBe(false);
    }
  });

  it('승격된 33개 자산은 마지막 두 독립 pass에 blocker가 없고 report가 tracked 경로에 있다', () => {
    for (const id of IDS) {
      for (const file of ['gold.json', 'queries.json', 'title-queries.json']) {
        const asset = read<{ semanticVerification?: unknown }>(`content/${id}/${file}`);
        const record = SemanticVerificationRecordSchema.parse(asset.semanticVerification);
        expect(record.passes, `${id}/${file}`).toBeGreaterThanOrEqual(2);
        const finalTwo = record.reportPaths.slice(-2);
        expect(finalTwo, `${id}/${file}`).toHaveLength(2);
        for (const path of finalTwo) {
          expect(existsSync(resolve(ROOT, path)), path).toBe(true);
          const report = SemanticVerificationReportSchema.parse(read<unknown>(path));
          expect(reportBlockers(report), path).toEqual([]);
        }
      }
    }
  });

  it('migration baseline은 기존 11개 자산의 원본 hash를 보존한다', () => {
    const baseline = read<{ head: string; paragraphs: readonly { id: string }[] }>(
      'packages/pipeline/fixtures/gold-migration/baseline-2026-08-14.json',
    );
    expect(baseline.head).toBe('d3df0afde809a786b699deef620c03981316009e');
    expect(baseline.paragraphs.map((paragraph) => paragraph.id)).toEqual(IDS);
  });
});
