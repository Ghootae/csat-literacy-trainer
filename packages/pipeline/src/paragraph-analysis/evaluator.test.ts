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

  it('loads the central-story-focused v3 prompt without changing v2', () => {
    const v2 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v2');
    const v3 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v3');

    expect(v3).not.toBe(v2);
    expect(v3).toContain('중요한 정보를 최대한 많이 담는 압축 요약');
    expect(v3).toContain('핵심 분류·대조·인과 연결');
    expect(v3).toContain('최소 구조에 일방적으로 맞추지 않는다');
    expect(v2).not.toContain('중요한 정보를 최대한 많이 담는 압축 요약');
  });

  it('loads v3.1 as a separate role-free analysis stage', () => {
    const v3 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v3');
    const v31 = loadParagraphAnalysisPrompt('paragraph-analysis-prompt-v3.1');

    expect(v31).not.toBe(v3);
    expect(v31).toContain('diagnosticRole을 생성하지 않는다');
    expect(v31).toContain('원리 → 적용 사례');
  });

  it('tracks eight reviewed v2 golds and four response levels per paragraph', () => {
    const fixture = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'packages/pipeline/fixtures/experiments/dialogue/eight-paragraph-four-level-v2-2026-08-25.json',
    ), 'utf8')) as {
      readonly paragraphs: readonly {
        readonly paragraphId: string;
        readonly goldPath: string;
        readonly cases: readonly { readonly level: string; readonly expectedStatus: string }[];
      }[];
    };

    expect(fixture.paragraphs).toHaveLength(8);
    const roleFreeApproved = new Set([
      'corporate-law-p2',
      'dopamine-motor-control-p4',
      'hegel-aesthetics-absolute-spirit-p1',
      'information-asymmetry-free-marketplace-p2',
    ]);
    for (const paragraph of fixture.paragraphs) {
      const gold = ParagraphDiagnosticGoldSchema.parse(
        JSON.parse(readFileSync(resolve(process.cwd(), paragraph.goldPath), 'utf8')),
      );
      expect(gold.coreRelations.every((relation) =>
        roleFreeApproved.has(paragraph.paragraphId)
          ? relation.diagnosticRole === undefined
          : relation.diagnosticRole !== undefined,
      )).toBe(true);
      expect(gold.centralAxes.length).toBeGreaterThan(0);
      expect(gold.centralAxes.length).toBeLessThanOrEqual(3);
      expect(paragraph.cases.map((item) => [item.level, item.expectedStatus])).toEqual([
        ['최상', 'PASS'],
        ['중상', 'PASS'],
        ['중간', 'UNCLEAR'],
        ['하위', 'ERROR'],
      ]);
    }
  });
});
