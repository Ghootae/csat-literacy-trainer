import { describe, expect, it } from 'vitest';

import type { ProblemVerticalSliceResult } from './vertical-slice.js';
import {
  assessProblemDiagnosticQuality,
  createProblemDiagnosticQualityReport,
} from './quality-evaluation.js';

function result(options: {
  question?: string;
  layer?: string;
  completed?: boolean;
  finalChoiceId?: string;
  alternativesControlled?: boolean;
} = {}): ProblemVerticalSliceResult {
  const finalChoiceId = options.finalChoiceId ?? 'C5';
  return {
    caseId: 'case-1',
    completed: options.completed ?? true,
    finalSession: {
      phase: options.completed === false ? 'AWAITING_EVALUATION' : 'COMPLETED',
      observations: [{ kind: 'RESELECTION', selectedChoiceId: finalChoiceId }],
      result: options.completed === false
        ? null
        : { correct: finalChoiceId === 'C5', finalChoiceId, outcome: 'DIAGNOSTIC_CORRECTION' },
    },
    trace: [{
      call: { durationMs: 1200, usage: { inputTokens: 100, outputTokens: 20 } },
      evaluatorResult: {
        mode: 'DIAGNOSE_PATH',
        targets: [{
          kind: 'MISSED_ANSWER',
          status: 'SUFFICIENT',
          sufficiency: {
            choiceExplained: { satisfied: true, reason: '설명됨' },
            interventionPointLocalized: { satisfied: true, reason: '국소화' },
            safeInterventionAvailable: { satisfied: true, reason: '개입 가능' },
            actionRelevantAlternativesControlled: {
              satisfied: options.alternativesControlled ?? true,
              reason: '대안 통제',
            },
            sufficient: true,
          },
          hypotheses: [{
            plausibility: 'ACTIVE',
            candidateDivergenceLayers: [options.layer ?? 'CONCEPT_BOUNDARY'],
          }],
        }],
        nextActionCandidate: {
          type: 'ASK_CORRECTIVE',
          questionText: options.question ?? '전하 상태와 소수성은 같은 속성인가요?',
        },
      },
    }],
  } as unknown as ProblemVerticalSliceResult;
}

const expectation = {
  caseId: 'case-1',
  targetKind: 'MISSED_ANSWER' as const,
  expectedDivergenceLayers: ['CONCEPT_BOUNDARY'],
  expectChoiceExplained: true,
  expectAlternativesControlled: true,
  maxNecessaryDiagnosticQuestions: 0,
  expectedFinalChoiceId: 'C5',
  requiresReselection: true,
  goldIssueDetectedByReviewer: false,
};

describe('문제 진단 품질 평가', () => {
  it('선택 설명·최초 분기·질문·상태 전이를 함께 통과시킨다', () => {
    const assessed = assessProblemDiagnosticQuality({ expectation, result: result() });
    expect(assessed.passed).toBe(true);
    expect(assessed.failureCategories).toEqual([]);
    expect(assessed.interventionDepth).toBe('INDIRECT_CORRECTION');
    expect(assessed.performance).toEqual({
      totalDurationMs: 1200,
      inputTokens: 100,
      outputTokens: 20,
    });
  });

  it('경로·충분성·질문·상태 실패를 서로 다른 범주로 분류한다', () => {
    const assessed = assessProblemDiagnosticQuality({
      expectation,
      result: result({
        question: '정답은 ⑤ 아닌가요?',
        layer: 'PASSAGE_REPRESENTATION',
        completed: false,
        finalChoiceId: 'C2',
        alternativesControlled: false,
      }),
    });
    expect(assessed.failureCategories).toEqual([
      'PATH_RECONSTRUCTION',
      'SUFFICIENCY',
      'QUESTION_GENERATION',
      'SESSION_TRANSITION',
    ]);
  });

  it('누출과 전이 실패가 없고 전 사례가 통과하면 GO를 권고한다', () => {
    const assessment = assessProblemDiagnosticQuality({ expectation, result: result() });
    const report = createProblemDiagnosticQualityReport({
      generatedAt: '2026-08-27T00:00:00.000Z',
      assessments: [assessment],
    });
    expect(report.mvpDecision).toBe('GO');
    expect(report.policyRecommendation.maxDiagnosticQuestions).toBe(1);
  });
});
