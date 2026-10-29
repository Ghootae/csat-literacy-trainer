import { describe, expect, it } from 'vitest';
import { hangulRatio, nonKoreanProblem } from './korean-text.js';

describe('korean-text', () => {
  it('flags Chinese and English sentences', () => {
    expect(nonKoreanProblem('message', '你答出了细胞膜会阻挡亲水物质通过这一点。')).toContain('message가 한국어가 아니다');
    expect(nonKoreanProblem('message', 'You got the point about the membrane.')).not.toBeNull();
  });
  it('passes Korean text with some Latin letters', () => {
    expect(hangulRatio('mRNA 보호-> 세포내 진입')).toBeGreaterThan(0.5);
    expect(nonKoreanProblem('message', 'mRNA 보호-> 세포내 진입')).toBeNull();
    expect(nonKoreanProblem('message', 'pH를 바꿔 mRNA를 세포 안으로 넣는 거야.')).toBeNull();
  });
  it('passes empty and symbol-only text', () => {
    expect(hangulRatio('')).toBe(1);
    expect(nonKoreanProblem('message', '')).toBeNull();
    expect(nonKoreanProblem('message', '->  123 !?')).toBeNull();
  });
});
