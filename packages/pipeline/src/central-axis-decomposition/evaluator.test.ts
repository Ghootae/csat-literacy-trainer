import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import {
  decomposeCentralStoryWithOpenAI,
  loadCentralAxisDecompositionPrompt,
  validateCentralAxisDecompositionResult,
} from './evaluator.js';
import type {
  CentralAxisDecompositionInput,
  CentralAxisDecompositionResult,
} from './schema.js';

const input: CentralAxisDecompositionInput = {
  paragraphId: 'p1',
  centralStory: 'A는 B를 일으킨다. C와 D는 서로 대조된다.',
};

function result(): CentralAxisDecompositionResult {
  return {
    schemaVersion: 'central-axis-decomposition-openai-v2',
    paragraphId: 'p1',
    centralStory: input.centralStory,
    verdict: 'READY',
    centralStoryMeanings: [
      { id: 'CSM1', description: 'A에서 B로 이어지는 인과', axisIds: ['AX1'] },
      { id: 'CSM2', description: 'C와 D의 대조', axisIds: ['AX2'] },
    ],
    centralAxes: [
      { id: 'AX1', description: 'A에서 B로 이어지는 인과 구조' },
      { id: 'AX2', description: 'C와 D의 대조 구조' },
    ],
    issues: [],
  };
}

describe('central axis decomposition v2', () => {
  it('uses only centralStory to fix macro axes', () => {
    const prompt = loadCentralAxisDecompositionPrompt();
    expect(prompt).toContain('입력에는 paragraphId와 centralStory만 있다');
    expect(prompt).toContain('인과사슬은 중간 단계가 여럿이어도 한 축');
    expect(prompt).toContain('정책 대응 → 그 정책의 확대·제한·적용 범위');
    expect(prompt).toContain('서로 다른 질문에 답하는 병렬 구조');
    expect(prompt).toContain('정의만 별도 축으로 만들지 않고');
    expect(prompt).toContain('같은 통제 축에 묶는다');
    expect(prompt).toContain('coreRelations');
  });

  it('accepts a lossless READY decomposition', () => {
    expect(validateCentralAxisDecompositionResult(result(), input).centralAxes).toHaveLength(2);
  });

  it('rejects changed stories and uncovered axes', () => {
    expect(() => validateCentralAxisDecompositionResult({
      ...result(),
      centralStory: '다른 이야기',
    }, input)).toThrow(/preserved exactly/);
    const uncovered = result();
    uncovered.centralStoryMeanings[1]!.axisIds = ['AX1'];
    expect(() => validateCentralAxisDecompositionResult(uncovered, input)).toThrow(/uncovered axis/);
  });

  it('does not send core relations to the API', async () => {
    const parse = vi.fn(async () => ({
      id: 'resp_1',
      output_parsed: result(),
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        output_tokens_details: { reasoning_tokens: 3 },
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      },
    }));
    await decomposeCentralStoryWithOpenAI(input, {
      model: 'test',
      effort: 'medium',
      client: { responses: { parse } } as unknown as OpenAI,
    });
    const request = parse.mock.calls[0]?.[0] as { input: string };
    expect(JSON.parse(request.input)).toEqual(input);
    expect(request.input).not.toContain('coreRelations');
  });
});
