import { describe, expect, it } from 'vitest';

import { loadProblemGoldGenerationPrompt } from './gold-generation.js';
import { createProblemGoldProviderJsonSchema } from './gold-generation-runtime.js';

describe('problem gold generation prompt', () => {
  it('방향성 추론 계약과 반대 해석 자기 검사를 포함한다', () => {
    const prompt = loadProblemGoldGenerationPrompt();

    expect(prompt).toContain('premiseRefs');
    expect(prompt).toContain('targetClaimEffect');
    expect(prompt).toContain('targetClaimIds');
    expect(prompt).toContain('SUPPORTS');
    expect(prompt).toContain('CONTRADICTS');
    expect(prompt).toContain('DOES_NOT_JUSTIFY');
    expect(prompt).toContain('대상 주장도 그 부정도 도출할 수 없지만');
    expect(prompt).toContain('같은 문장을 읽고 대상 주장을 지지한다고도, 반박한다고도 해석할 수 있는가');
    expect(prompt).toContain('보기 사실 전체를 모든 선지에 복사하지 않는다');
    expect(prompt).toContain('공식 해설');
  });

  it('공급자용 strict schema에서 미지원 format과 선택 속성을 제거한다', () => {
    const schema = createProblemGoldProviderJsonSchema();
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value !== 'object' || value === null) return;
      const record = value as Record<string, unknown>;
      expect(record).not.toHaveProperty('format');
      if (
        record['type'] === 'object' &&
        typeof record['properties'] === 'object' &&
        record['properties'] !== null
      ) {
        expect(record['required']).toEqual(Object.keys(
          record['properties'] as Record<string, unknown>,
        ));
      }
      Object.values(record).forEach(visit);
    };

    visit(schema);
  });
});
