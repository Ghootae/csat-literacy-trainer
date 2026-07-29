import { describe, expect, it } from 'vitest';

import { CACHE_SCHEMA_VERSION, canonicalize, evalCacheKey } from './eval-cache-key.js';

/**
 * 이전 키는 paragraphId + probeText + queries만 썼다. 그래서 시스템 프롬프트나 모델을
 * 바꿔도 과거 평가 결과가 재사용돼 수정 후 검증이 무효가 됐다. 아래는 "평가 결과를 바꿀 수
 * 있는 입력이 바뀌면 반드시 cache miss가 난다"는 계약을 고정한다.
 */
const FINGERPRINT = {
  model: 'claude-opus-4-8',
  systemPrompt: '당신은 학생의 문단 요약이 보존 질의의 답을 담았는지 판정한다.',
  maxTokens: 8000,
  effort: 'high',
  thinking: 'adaptive',
  outputFormat: { type: 'json_schema', schema: { type: 'object', properties: { verdicts: {} } } },
} as const;

const BASE = {
  paragraphId: 's1_p5',
  probeText: 'C4 식물의 광합성\n엽육 세포와 유관속초 세포',
  queries: [
    { id: 'q1', question: '이 부분은 무엇에 관한 것인가?' },
    { id: 'q2', question: '두 공간은 어떻게 역할을 분담하는가?' },
  ],
  requestFingerprint: FINGERPRINT,
};

/** 깊은 복사 — 원본을 건드리지 않고 한 요소만 바꾸기 위해. */
function withFingerprint(patch: Record<string, unknown>) {
  return { ...BASE, requestFingerprint: { ...FINGERPRINT, ...patch } };
}

describe('평가 캐시 키 — 결과를 바꿀 수 있는 입력은 모두 키에 반영된다', () => {
  it('동일 입력·동일 프롬프트·동일 설정 → 동일 키', () => {
    expect(evalCacheKey(BASE)).toBe(evalCacheKey({ ...BASE }));
  });

  it('시스템 프롬프트 한 글자 변경 → 다른 키', () => {
    const changed = withFingerprint({ systemPrompt: `${FINGERPRINT.systemPrompt}.` });
    expect(evalCacheKey(changed)).not.toBe(evalCacheKey(BASE));
  });

  it('모델 변경 → 다른 키', () => {
    expect(evalCacheKey(withFingerprint({ model: 'claude-opus-5' }))).not.toBe(evalCacheKey(BASE));
  });

  it('출력 스키마 변경 → 다른 키', () => {
    const changed = withFingerprint({
      outputFormat: { type: 'json_schema', schema: { type: 'object', properties: { verdicts: {}, note: {} } } },
    });
    expect(evalCacheKey(changed)).not.toBe(evalCacheKey(BASE));
  });

  it('요청 설정(effort) 변경 → 다른 키', () => {
    expect(evalCacheKey(withFingerprint({ effort: 'max' }))).not.toBe(evalCacheKey(BASE));
  });

  it('요청 설정(maxTokens) 변경 → 다른 키', () => {
    expect(evalCacheKey(withFingerprint({ maxTokens: 16000 }))).not.toBe(evalCacheKey(BASE));
  });

  it('프로브 텍스트 변경 → 다른 키', () => {
    expect(evalCacheKey({ ...BASE, probeText: '다른 응답' })).not.toBe(evalCacheKey(BASE));
  });

  it('문단 변경 → 다른 키', () => {
    expect(evalCacheKey({ ...BASE, paragraphId: 's1_p3' })).not.toBe(evalCacheKey(BASE));
  });

  it('질의 내용 변경 → 다른 키', () => {
    const queries = [BASE.queries[0]!, { id: 'q2', question: '두 공간은 각각 무엇인가?' }];
    expect(evalCacheKey({ ...BASE, queries })).not.toBe(evalCacheKey(BASE));
  });

  it('질의 순서 변경 → 다른 키 (순서는 프롬프트 렌더링 순서라 의미가 있다)', () => {
    const reversed = [BASE.queries[1]!, BASE.queries[0]!];
    expect(evalCacheKey({ ...BASE, queries: reversed })).not.toBe(evalCacheKey(BASE));
  });

  it('객체 프로퍼티 삽입 순서는 키에 영향을 주지 않는다 (안정성)', () => {
    const reordered = {
      requestFingerprint: { ...FINGERPRINT },
      queries: BASE.queries,
      probeText: BASE.probeText,
      paragraphId: BASE.paragraphId,
    };
    expect(evalCacheKey(reordered)).toBe(evalCacheKey(BASE));
  });

  it('키에 캐시 구조 버전이 접두사로 붙는다 — 세대 간 파일명이 겹치지 않는다', () => {
    expect(evalCacheKey(BASE)).toMatch(new RegExp(`^v${CACHE_SCHEMA_VERSION}-[0-9a-f]{32}$`));
  });
});

describe('canonicalize — 안정 직렬화', () => {
  it('객체 키는 정렬한다', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('배열 순서는 보존한다', () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it('undefined 프로퍼티는 제외한다 (JSON.stringify 동작과 일치)', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });

  it('중첩 구조에서도 정렬이 적용된다', () => {
    expect(canonicalize({ x: { b: 1, a: 2 } })).toBe(canonicalize({ x: { a: 2, b: 1 } }));
  });
});
