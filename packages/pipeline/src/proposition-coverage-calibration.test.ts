import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PropositionCoverageResult } from './llm/proposition-coverage-eval.js';
import {
  resolveGoldPropositionView,
  summarizeCalibration,
  type CalibrationObservation,
  type Coverage,
} from './proposition-coverage-calibration.js';

const output = (coverage: Coverage): PropositionCoverageResult => ({
  coverage,
  expressedRelation: '관계',
  missingElements: [],
  evidence: '근거',
  completionTest: coverage === 'none' ? 'fail' : 'pass',
  rationale: '이유',
});

const rows = (caseId: string, expectedCoverage: Coverage, predictions: readonly Coverage[]) =>
  predictions.map(
    (prediction, i): CalibrationObservation => ({
      caseId,
      repeat: i + 1,
      expectedCoverage,
      output: output(prediction),
    }),
  );

describe('proposition coverage calibration metrics', () => {
  const summary = summarizeCalibration([
    ...rows('explicit-case', 'explicit', ['explicit', 'partial', 'explicit']),
    ...rows('partial-case', 'partial', ['explicit', 'partial', 'none']),
    ...rows('none-case', 'none', ['none', 'partial', 'none']),
  ]);

  it('실행별·전체·다수결 정확도를 계산한다', () => {
    expect(summary.runAccuracy.map((r) => [r.correct, r.total])).toEqual([
      [2, 3],
      [1, 3],
      [2, 3],
    ]);
    expect(summary.overall).toMatchObject({ correct: 5, total: 9 });
    expect(summary.majority).toMatchObject({ correct: 2, total: 3 });
  });

  it('confusion matrix와 라벨 recall을 계산한다', () => {
    expect(summary.confusionMatrix).toEqual({
      explicit: { explicit: 2, partial: 1, none: 0 },
      partial: { explicit: 1, partial: 1, none: 1 },
      none: { explicit: 0, partial: 1, none: 2 },
    });
    expect(summary.recall).toEqual({ explicit: 2 / 3, partial: 1 / 3, none: 2 / 3 });
  });

  it('불안정·과대평가·과소평가를 분리한다', () => {
    expect(summary.fullyStableCases).toBe(0);
    expect(summary.unstableCaseIds).toEqual(['explicit-case', 'none-case', 'partial-case']);
    expect(summary.overestimation).toEqual([
      { caseId: 'partial-case', repeat: 1, from: 'partial', to: 'explicit' },
      { caseId: 'none-case', repeat: 2, from: 'none', to: 'partial' },
    ]);
    expect(summary.underestimation).toEqual([
      { caseId: 'explicit-case', repeat: 2, from: 'explicit', to: 'partial' },
      { caseId: 'partial-case', repeat: 3, from: 'partial', to: 'none' },
    ]);
  });
});

describe('calibration target proposition 해석', () => {
  it('core 24개 모두 현재 gold semantic proposition view와 정확히 조인된다', () => {
    const fixture = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'packages/pipeline/fixtures/proposition-coverage-initial-calibration.json'),
        'utf8',
      ),
    ) as {
      cases: readonly { paragraphId: string; propositionId: string; shortForm: string }[];
    };
    expect(fixture.cases).toHaveLength(24);
    for (const c of fixture.cases) {
      const gold = JSON.parse(
        readFileSync(resolve(process.cwd(), 'content', c.paragraphId, 'gold.json'), 'utf8'),
      ) as { propositions: readonly Record<string, unknown>[] };
      const proposition = gold.propositions.find((p) => p['id'] === c.propositionId)!;
      const view = resolveGoldPropositionView(c.paragraphId, c.propositionId);
      expect(view, `${c.paragraphId}/${c.propositionId}`).toEqual({
        text: proposition['text'],
        relation: proposition['relation'],
        predicate: proposition['predicate'],
        argument: proposition['argument'],
        aspect: proposition['aspect'],
        subjectRole: proposition['subjectRole'],
      });
      expect(Object.keys(view)).toEqual([
        'text',
        'relation',
        'predicate',
        'argument',
        'aspect',
        'subjectRole',
      ]);
      expect(view.text, `${c.paragraphId}/${c.propositionId}`).not.toBe(c.shortForm);
    }
  });

  it('ordinal·조건·귀속을 구별하는 기존 gold 구조 필드를 손실하지 않는다', () => {
    expect(resolveGoldPropositionView('photosynthesis-p5', 'p3')).toMatchObject({
      argument: 'first',
      relation: { from: '첫 번째 공간', to: '엽육 세포' },
    });
    expect(resolveGoldPropositionView('photosynthesis-p5', 'p11')).toMatchObject({
      argument: 'second',
      relation: { from: '두 번째 공간', to: '유관속초 세포' },
    });
    expect(resolveGoldPropositionView('corporate-law-p1', 'p7')).toMatchObject({
      relation: { from: '개인 출자로 형성된 법인 자산' },
      aspect: 'legal_attribution',
    });
    expect(resolveGoldPropositionView('nietzsche-p1', 'p12')).toMatchObject({
      subjectRole: 'nietzschean_view',
    });
  });
});
