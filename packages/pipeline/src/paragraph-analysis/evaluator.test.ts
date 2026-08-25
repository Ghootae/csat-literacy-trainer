import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import { loadParagraphAnalysisPrompt } from './evaluator.js';

describe('paragraph analysis prompt versions', () => {
  it('keeps v1 as the default baseline', () => {
    expect(loadParagraphAnalysisPrompt()).toBe(
      loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v1'),
    );
  });

  it('loads the diagnostic-unit v2 prompt independently', () => {
    const v1 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v1');
    const v2 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v2');

    expect(v2).not.toBe(v1);
    expect(v2).toContain('한 상태·한 오류·한 질문');
    expect(v2).toContain('진단 행동 단위');
  });

  it('tracks eight reviewed v2 golds and four response levels per paragraph', () => {
    const fixture = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'packages/pipeline/fixtures/experiments/dialogue/eight-paragraph-four-level-v2-2026-08-25.json',
    ), 'utf8')) as {
      readonly paragraphs: readonly {
        readonly goldPath: string;
        readonly cases: readonly { readonly level: string; readonly expectedStatus: string }[];
      }[];
    };

    expect(fixture.paragraphs).toHaveLength(8);
    for (const paragraph of fixture.paragraphs) {
      const gold = ParagraphDiagnosticGoldSchema.parse(
        JSON.parse(readFileSync(resolve(process.cwd(), paragraph.goldPath), 'utf8')),
      );
      expect(gold.coreRelations.every((relation) => relation.diagnosticRole !== undefined)).toBe(true);
      expect(paragraph.cases.map((item) => [item.level, item.expectedStatus])).toEqual([
        ['최상', 'PASS'],
        ['중상', 'PASS'],
        ['중간', 'UNCLEAR'],
        ['하위', 'ERROR'],
      ]);
    }
  });
});
