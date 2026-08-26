import { describe, expect, it } from 'vitest';

import { loadCentralAxesPrompt, validateCentralAxesResult } from './evaluator.js';
import type { CentralAxesInput, CentralAxesResult } from './schema.js';

const input: CentralAxesInput = {
  paragraphId: 'p1',
  centralObject: '원칙과 적용',
  centralStory: '원칙은 A를 낳는다. 그 원칙은 B와 C에 적용된다.',
  coreRelations: [
    { id: 'MR1', description: '원칙은 A를 낳는다.' },
    { id: 'MR2', description: '원칙은 B에 적용된다.' },
    { id: 'MR3', description: '원칙은 C에 적용된다.' },
  ],
};

function readyResult(): CentralAxesResult {
  return {
    schemaVersion: 'central-axes-openai-v1',
    paragraphId: 'p1',
    centralStory: input.centralStory,
    verdict: 'READY',
    centralStoryMeanings: [
      { id: 'CSM1', description: '원칙은 A를 낳는다.', axisIds: ['AX1'] },
      { id: 'CSM2', description: '원칙은 B와 C에 적용된다.', axisIds: ['AX2'] },
    ],
    centralAxes: [
      { id: 'AX1', description: '원칙과 A의 관계', relationIds: ['MR1'] },
      { id: 'AX2', description: '원칙의 B와 C 적용', relationIds: ['MR2', 'MR3'] },
    ],
    unmappedCoreRelationIds: [],
    issues: [],
  };
}

describe('central axes API stage', () => {
  it('loads a lossless-partition prompt that does not re-evaluate importance', () => {
    const prompt = loadCentralAxesPrompt();
    expect(prompt).toContain('중요도를 판단하거나 centralStory를 수정하는 단계가 아니다');
    expect(prompt).toContain('축 전체의 의미적 합은 centralStory와 같아야 한다');
  });

  it('accepts a complete READY partition', () => {
    expect(validateCentralAxesResult(readyResult(), input).verdict).toBe('READY');
  });

  it('rejects a changed centralStory', () => {
    const result = { ...readyResult(), centralStory: '축 단계가 다시 쓴 이야기' };
    expect(() => validateCentralAxesResult(result, input)).toThrow(/preserved exactly/);
  });

  it('rejects READY when a core relation is neither mapped nor declared', () => {
    const result = readyResult();
    result.centralAxes[1]!.relationIds = ['MR2'];
    expect(() => validateCentralAxesResult(result, input)).toThrow(/MR3/);
  });

  it('allows an explained NEEDS_REVIEW result', () => {
    const result = readyResult();
    result.verdict = 'NEEDS_REVIEW';
    result.centralAxes[1]!.relationIds = ['MR2'];
    result.unmappedCoreRelationIds = ['MR3'];
    result.issues = [{
      code: 'CORE_RELATION_OUTSIDE_STORY',
      description: 'MR3은 중심 이야기와 연결하기 어렵다.',
      relatedRelationIds: ['MR3'],
    }];
    expect(validateCentralAxesResult(result, input).verdict).toBe('NEEDS_REVIEW');
  });
});
