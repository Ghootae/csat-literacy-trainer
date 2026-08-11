import { describe, expect, it } from 'vitest';

import {
  PROPOSITION_COVERAGE_SYSTEM,
  PropositionCoverageResultSchema,
  propositionCoverageUserPrompt,
} from './proposition-coverage-eval.js';

describe('experimental proposition coverage evaluator', () => {
  it('모델 user prompt에는 targetProposition과 학생 응답만 들어간다', () => {
    const targetProposition = {
      text: 'A는 B를 일으킨다.',
      relation: { from: 'A', to: 'B', kind: '인과' },
      predicate: 'causes',
      argument: '',
      aspect: 'causal_effect',
      subjectRole: 'cause',
    };
    const prompt = propositionCoverageUserPrompt({
      targetProposition,
      studentResponse: '학생이 쓴 문장',
    });
    expect(prompt).toBe(
      `목표 명제:\n${JSON.stringify(targetProposition, null, 2)}\n\n학생 응답:\n학생이 쓴 문장`,
    );
    for (const forbidden of [
      'shortForm',
      'expectedCoverage',
      'paragraphId',
      'propositionId',
      'startPresent',
      'sameRelationFrame',
      'completionNote',
      'presentParts',
      'sourceSentences',
      'links',
      'query',
      'acceptanceCriteria',
      'human rationale',
    ]) {
      expect(prompt).not.toContain(forbidden);
    }
  });

  it('프롬프트는 completion test와 response-only 규칙을 명시한다', () => {
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('오직 학생 응답 자체');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('기존 관계를 유지');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('새로운 관계를 추가');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('text의 구체적인 명제 의미를 우선');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('나열 순서에서 첫 번째·두 번째 역할을 추론하지 마라');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('주장 귀속');
    expect(PROPOSITION_COVERAGE_SYSTEM).toContain('핵심 관계의 진리조건');
    expect(PROPOSITION_COVERAGE_SYSTEM).not.toContain('법인격 부여 대상');
    expect(PROPOSITION_COVERAGE_SYSTEM).not.toContain('C3 식물의 캘빈 회로는 동일하게 작동한다');
  });

  it('structured output의 최소 필드를 강제한다', () => {
    expect(
      PropositionCoverageResultSchema.parse({
        coverage: 'partial',
        expressedRelation: 'A가 B에 작용한다',
        missingElements: ['조건 C'],
        evidence: 'A가 B에 작용',
        completionTest: 'pass',
        rationale: '조건만 빠졌다',
      }),
    ).toEqual({
      coverage: 'partial',
      expressedRelation: 'A가 B에 작용한다',
      missingElements: ['조건 C'],
      evidence: 'A가 B에 작용',
      completionTest: 'pass',
      rationale: '조건만 빠졌다',
    });
  });
});
