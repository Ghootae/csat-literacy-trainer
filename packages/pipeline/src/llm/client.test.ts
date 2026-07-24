/**
 * 재시도 판단과 백오프는 배치 안정성의 핵심이라 결정적으로 검증한다.
 * 실제 네트워크나 sleep 없이, 실패 분류와 백오프 상한만 본다.
 */

import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';

import { backoffMs, classify } from './client.js';

/** SDK 에러 인스턴스를 생성자 없이 만들기 어려워, 최소 형태만 흉내 낸다. */
function apiError(ctor: new (...a: never[]) => Error, status: number, type: string): Error {
  const e = Object.create(ctor.prototype) as Error & { status: number; type: string };
  e.status = status;
  e.type = type;
  return e;
}

describe('classify', () => {
  it('레이트리밋은 재시도 가능', () => {
    const e = apiError(Anthropic.RateLimitError, 429, 'rate_limit_error');
    expect(classify(e)).toMatchObject({ type: 'rate_limit', retryable: true });
  });

  it('5xx는 재시도 가능', () => {
    const e = apiError(Anthropic.InternalServerError, 500, 'api_error');
    expect(classify(e)).toMatchObject({ type: 'server_error', retryable: true });
  });

  it('연결 오류는 재시도 가능', () => {
    const e = Object.create(Anthropic.APIConnectionError.prototype) as Error;
    expect(classify(e)).toMatchObject({ type: 'connection', retryable: true });
  });

  it('4xx(크레딧 부족 등)는 재시도 불가', () => {
    const e = apiError(Anthropic.BadRequestError, 400, 'invalid_request_error');
    expect(classify(e)).toMatchObject({ retryable: false });
  });

  it('구조화 출력 파싱 실패는 재시도 가능', () => {
    expect(classify(new Error('Failed to parse structured output: ...'))).toMatchObject({
      type: 'schema_mismatch',
      retryable: true,
    });
  });

  it('분류 불가는 재시도하지 않는다', () => {
    expect(classify(new Error('무언가'))).toMatchObject({ type: 'unknown', retryable: false });
  });
});

describe('backoffMs', () => {
  it('지수적으로 증가한다', () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
  });

  it('30초에서 상한 — 무한정 늘어나지 않는다', () => {
    expect(backoffMs(10)).toBe(30_000);
    expect(backoffMs(100)).toBe(30_000);
  });
});
