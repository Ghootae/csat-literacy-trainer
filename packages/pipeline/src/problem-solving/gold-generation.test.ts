import { describe, expect, it } from 'vitest';

import { loadProblemGoldGenerationPrompt } from './gold-generation.js';

describe('problem gold generation prompt', () => {
  it('방향성 추론 계약과 반대 해석 자기 검사를 포함한다', () => {
    const prompt = loadProblemGoldGenerationPrompt();

    expect(prompt).toContain('premiseRefs');
    expect(prompt).toContain('targetClaimEffect');
    expect(prompt).toContain('targetClaimIds');
    expect(prompt).toContain('SUPPORTS');
    expect(prompt).toContain('CONTRADICTS');
    expect(prompt).toContain('같은 문장을 읽고 대상 주장을 지지한다고도, 반박한다고도 해석할 수 있는가');
    expect(prompt).toContain('보기 사실 전체를 모든 선지에 복사하지 않는다');
    expect(prompt).toContain('공식 해설');
  });
});
