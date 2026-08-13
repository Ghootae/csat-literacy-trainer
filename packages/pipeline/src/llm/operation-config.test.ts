import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  GOLD_GENERATION_EFFORT,
  QUERY_GENERATION_EFFORT,
  TITLE_GENERATION_EFFORT,
} from './client.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const source = (name: string): string => readFileSync(resolve(DIR, name), 'utf8');

describe('오프라인 생성 프로필', () => {
  it('골드와 영역·타이틀 질의 생성은 medium을 쓴다', () => {
    expect(GOLD_GENERATION_EFFORT).toBe('medium');
    expect(QUERY_GENERATION_EFFORT).toBe('medium');
    expect(TITLE_GENERATION_EFFORT).toBe('medium');
  });

  it('골드 분해·합성과 질의·타이틀 생성 호출이 각 프로필 상수를 실제로 사용한다', () => {
    const kernel = source('kernel.ts');
    const query = source('query-gen.ts');
    const title = source('title-gen.ts');

    expect(kernel.match(/output_config: \{ effort: GOLD_GENERATION_EFFORT/g)).toHaveLength(3);
    expect(query).toContain('output_config: { effort: QUERY_GENERATION_EFFORT');
    expect(title).toContain('output_config: { effort: TITLE_GENERATION_EFFORT');
  });
});
