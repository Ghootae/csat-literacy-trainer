import { describe, expect, it, vi } from 'vitest';

import type { Gold } from './gold.js';
import type { PropositionCoverageCall } from './llm/proposition-coverage-eval.js';
import {
  coverageIsFulfilled,
  evaluateSemanticFulfillment,
  propositionEvidenceEvaluator,
  targetPropositionView,
  type PropositionCoverage,
} from './proposition-fulfillment.js';

const proposition = {
  id: 'p1',
  text: 'A는 B를 일으킨다.',
  shortForm: 'A→B',
  relation: { from: 'A', to: 'B', kind: '인과' },
  predicate: 'causes',
  argument: 'condition-c',
  standaloneSlotValue: true,
  aspect: 'causal_effect',
  subjectRole: 'cause',
  sourceSentences: ['S1'],
  exceptions: [],
  links: [],
} satisfies Gold['propositions'][number];

function call(coverage: PropositionCoverage): PropositionCoverageCall {
  return {
    output: {
      coverage,
      expressedRelation: 'A가 B를 일으킨다',
      missingElements: [],
      evidence: 'A가 B',
      completionTest: coverage === 'none' ? 'fail' : 'pass',
      rationale: '테스트',
    },
    apiMessageId: `id-${coverage}`,
    model: 'test',
    effort: 'medium',
    maxTokens: 1,
    latencyMs: 1,
    usage: { inputTokens: 1, outputTokens: 1, cacheWriteTokens: 0, cacheReadTokens: 0 },
    rawContent: [],
  };
}

describe('proposition fulfillment runtime boundary', () => {
  it('explicit만 fulfilled이고 partial/none은 미충족이다', () => {
    expect(coverageIsFulfilled('explicit')).toBe(true);
    expect(coverageIsFulfilled('partial')).toBe(false);
    expect(coverageIsFulfilled('none')).toBe(false);
  });

  it('feature flag는 query와 semantic-view 두 경로만 허용한다', () => {
    expect(propositionEvidenceEvaluator(undefined)).toBe('query');
    expect(propositionEvidenceEvaluator('query')).toBe('query');
    expect(propositionEvidenceEvaluator('semantic-view')).toBe('semantic-view');
    expect(() => propositionEvidenceEvaluator('other')).toThrow(/query\|semantic-view/);
  });

  it('runtime model input은 semantic view와 studentResponse뿐이다', async () => {
    const evaluate = vi.fn(async () => call('partial'));
    const run = await evaluateSemanticFulfillment([proposition], '학생 응답', evaluate);
    expect(run.results).toEqual([{ propositionId: 'p1', coverage: 'partial', fulfilled: false }]);
    expect(evaluate).toHaveBeenCalledWith({
      targetProposition: targetPropositionView(proposition),
      studentResponse: '학생 응답',
    });
    const input = evaluate.mock.calls[0]![0];
    expect(Object.keys(input)).toEqual(['targetProposition', 'studentResponse']);
    expect(JSON.stringify(input)).not.toMatch(
      /shortForm|sourceSentences|links|propositionId|paragraphId|expectedCoverage|sameRelationFrame/,
    );
  });
});
