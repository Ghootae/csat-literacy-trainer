import { describe, expect, it } from 'vitest';

import {
  loadAxisRelationMappingPrompt,
  validateAxisRelationMappingResult,
} from './evaluator.js';
import {
  mergeAxesAndRelationMapping,
  type AxisRelationMappingInput,
  type AxisRelationMappingResult,
} from './schema.js';

const input: AxisRelationMappingInput = {
  paragraphId: 'p1',
  centralStory: 'A는 B를 일으키고, C는 D와 대조된다.',
  centralAxes: [
    { id: 'AX1', description: 'A에서 B로 이어지는 인과 구조' },
    { id: 'AX2', description: 'C와 D의 대조 구조' },
  ],
  coreRelations: [
    { id: 'MR1', description: 'A는 B의 원인이다.' },
    { id: 'MR2', description: 'C와 D는 대조된다.' },
  ],
};

function result(): AxisRelationMappingResult {
  return {
    schemaVersion: 'axis-relation-mapping-openai-v1',
    paragraphId: 'p1',
    verdict: 'READY',
    axisMappings: [
      { axisId: 'AX1', relationIds: ['MR1'] },
      { axisId: 'AX2', relationIds: ['MR2'] },
    ],
    unmappedCoreRelationIds: [],
    issues: [],
  };
}

describe('fixed-axis relation mapping', () => {
  it('forbids changing axes and removes question roles', () => {
    const prompt = loadAxisRelationMappingPrompt();
    expect(prompt).toContain('수정·분할·병합하거나 새 축을 만들지 않는다');
    expect(prompt).toContain('관계 하나가 질문 하나를 뜻하지 않는다');
    expect(prompt).toContain('required/error_only');
  });

  it('maps every fixed axis and relation', () => {
    const validated = validateAxisRelationMappingResult(result(), input);
    expect(mergeAxesAndRelationMapping(input, validated)).toEqual([
      { ...input.centralAxes[0], relationIds: ['MR1'] },
      { ...input.centralAxes[1], relationIds: ['MR2'] },
    ]);
  });

  it('rejects missing fixed axes and unmapped READY relations', () => {
    expect(() => validateAxisRelationMappingResult({
      ...result(),
      axisMappings: [{ axisId: 'AX1', relationIds: ['MR1'] }],
    }, input)).toThrow(/every fixed input axis/);
    expect(() => validateAxisRelationMappingResult({
      ...result(),
      axisMappings: [
        { axisId: 'AX1', relationIds: ['MR1'] },
        { axisId: 'AX2', relationIds: [] },
      ],
    }, input)).toThrow(/MR2/);
  });
});
