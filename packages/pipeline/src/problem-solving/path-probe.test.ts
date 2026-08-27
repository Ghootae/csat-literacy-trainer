import { describe, expect, it } from 'vitest';

import {
  PROBLEM_PATH_PROBE_CASES,
  ProblemPathProbeCaseSchema,
  compareProblemPathProbeVariants,
} from './path-probe.js';

describe('problem path probe contract', () => {
  it('필수 음성 대조 사례를 고유 ID로 고정한다', () => {
    const parsed = PROBLEM_PATH_PROBE_CASES.map((item) =>
      ProblemPathProbeCaseSchema.parse(item));
    expect(parsed.length).toBeGreaterThanOrEqual(10);
    expect(new Set(parsed.map((item) => item.caseId)).size).toBe(parsed.length);
    expect(parsed.map((item) => item.caseId)).toEqual(expect.arrayContaining([
      'mrna-c2-vague',
      'mrna-correct-wrong-rationale',
      'mrna-conflicting-turns',
      'mrna-c2-rational-challenge',
      'mrna-new-error',
      'mrna-irrelevant-long',
    ]));
  });

  it('A/B 핵심 판단이 같고 보조 경로만 다르면 WARNING으로 분류한다', () => {
    const base = {
      mode: 'DIAGNOSE_PATH', activeTarget: 'SELECTED_CHOICE',
      targets: [{
        kind: 'SELECTED_CHOICE', status: 'SUFFICIENT',
        errorAssessment: 'CLEAR_ERROR', sufficiency: { sufficient: true },
        pathSteps: [{ epistemicStatus: 'OBSERVED' }],
        hypotheses: [{ candidateDivergenceLayers: ['SCENARIO_REPRESENTATION'] }],
      }],
      nextActionCandidate: {
        type: 'ASK_CORRECTIVE',
        questionIntent: {
          kind: 'CORRECTIVE', targetRelationRefs: ['OC3-1'],
          interventionStrength: 'INDIRECT',
        },
      },
    };
    const variant = structuredClone(base);
    variant.targets[0]!.hypotheses[0]!.candidateDivergenceLayers = ['CONDITION_APPLICATION'];

    expect(compareProblemPathProbeVariants(base, variant).status).toBe('WARNING');
  });

  it('A/B에서 행동이 달라지면 FAIL로 분류한다', () => {
    const left = {
      mode: 'DIAGNOSE_PATH', activeTarget: 'SELECTED_CHOICE', targets: [],
      nextActionCandidate: { type: 'ASK_DIAGNOSTIC', questionIntent: null },
    };
    const right = structuredClone(left);
    right.nextActionCandidate.type = 'ASK_CORRECTIVE';
    expect(compareProblemPathProbeVariants(left, right).status).toBe('FAIL');
  });
});
