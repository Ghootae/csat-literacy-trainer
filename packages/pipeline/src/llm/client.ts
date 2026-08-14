/**
 * LLM 클라이언트와 계측.
 *
 * 모든 호출이 이 모듈을 거친다. 스펙이 런타임 지연 허용치를 "구현 중 실측 후 결정"으로
 * 남겼으므로, 값을 추측하는 대신 전 호출을 기록한다. 배치 비용 견적(지문당 ~80회)도
 * 추정이므로 실측으로 대체해야 한다.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-4-8';

/** Offline generation profiles are intentionally separate from the online student evaluator. */
export const GOLD_GENERATION_EFFORT = 'medium' as const;
export const QUERY_GENERATION_EFFORT = 'medium' as const;
export const TITLE_GENERATION_EFFORT = 'medium' as const;

/** 호출 종류. 계측 집계와 모델/effort 선택의 기준이 된다. */
export type Op =
  | 'decompose'
  | 'compose'
  | 'verify-links'
  | 'regenerate'
  | 'slot-core'
  | 'evaluate'
  | 'test-responses'
  | 'query-eval'
  /** 접두부 예열. 출력 1토큰이라 지연·비용 집계에서 채점과 섞이면 안 된다. */
  | 'query-eval-warm'
  | 'query-gen'
  /** 타이틀 질의 생성. 기존 생성기와 별도 프롬프트라 집계도 나눈다. */
  | 'title-gen'
  /** 기존 질의셋에 모순 기준만 보강. 구조는 건드리지 않으므로 질의 생성과 나눠 센다. */
  | 'contradiction-gen'
  /** 고아 명제에 전용 질의 하나를 붙인다. 명제 단위 커버리지 보강. */
  | 'proposition-query-gen'
  /** 전용 질의가 그 명제를 정확히 묻는지 감사. 검증 세트 확정용, 1회성. */
  | 'dedicated-query-audit'
  /** production 편입 전 원문-골드 의미 대조. 온라인 채점과 독립된 offline 품질 게이트다. */
  | 'gold-semantic-verify'
  /** verifier가 찾은 오류만 최소 수정하는 offline repair 단계다. */
  | 'gold-semantic-repair'
  /** 원문-질의의 근거·정답·수용 기준을 독립적으로 검증한다. */
  | 'query-semantic-verify'
  /** 질의 verifier가 찾은 오류만 최소 수정한다. */
  | 'query-semantic-repair'
  | 'title-semantic-verify'
  | 'title-semantic-repair'
  /** verifier 의미 판단을 고정한 채 잘못된 canonical evidence ID만 한 번 교정한다. */
  | 'semantic-evidence-ref-correct'
  | 'regression-probe-verify'
  | 'regression-arbitrate';

export interface CallMetric {
  readonly ts: string;
  readonly op: Op;
  readonly model: string;
  readonly effort: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /**
   * 프롬프트 캐시 토큰. **캐싱이 실제로 먹었는지 여기서만 알 수 있다.**
   * `cacheRead`가 계속 0이면 접두부가 매번 달라진다는 뜻이므로 무엇이 깨뜨리는지 찾아야 한다.
   * 쓰기는 1.25배, 읽기는 0.1배로 과금된다.
   */
  readonly cacheWriteTokens?: number;
  readonly cacheReadTokens?: number;
  readonly ms: number;
  /** 문단 식별자. 배치 재개와 문단별 비용 집계에 쓴다. */
  readonly paragraphId?: string;
  /** 실패 분류. 성공 호출에는 없다. */
  readonly error?: { readonly status?: number; readonly type: string; readonly retryable: boolean };
}

const METRICS_PATH = resolve(process.cwd(), '.omc/metrics/llm.jsonl');

export function recordMetric(metric: CallMetric): void {
  mkdirSync(dirname(METRICS_PATH), { recursive: true });
  appendFileSync(METRICS_PATH, `${JSON.stringify(metric)}\n`, 'utf8');
}

let client: Anthropic | undefined;

export function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * 호출을 계측으로 감싼다.
 *
 * `usage`를 반환하는 함수만 받는다 — 토큰 수를 기록하지 못하는 호출은 비용 견적에
 * 구멍을 내므로 애초에 이 경로를 지나지 못하게 한다.
 */
const MAX_RETRIES = 4;

/** 재시도 가능 실패의 백오프. 연결 오류·레이트리밋·5xx가 대상. 30초에서 상한. */
export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

/** 0인 캐시 필드는 기록하지 않는다 — 캐싱을 안 쓰는 호출까지 0으로 채우면 로그만 커진다. */
function cacheTokens(usage: Anthropic.Usage): {
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
} {
  const write = usage.cache_creation_input_tokens ?? 0;
  const read = usage.cache_read_input_tokens ?? 0;
  return {
    ...(write === 0 ? {} : { cacheWriteTokens: write }),
    ...(read === 0 ? {} : { cacheReadTokens: read }),
  };
}

export async function instrumented<T extends { usage: Anthropic.Usage }>(
  op: Op,
  effort: string,
  paragraphId: string | undefined,
  call: () => Promise<T>,
  /** 호출이 실제로 쓴 모델. 채점만 다른 모델로 재는 실험이 있으므로 기본값에 기대지 않는다. */
  model: string = MODEL,
): Promise<T> {
  const base = {
    op,
    model,
    effort,
    ...(paragraphId === undefined ? {} : { paragraphId }),
  };

  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    try {
      const response = await call();
      recordMetric({
        ts: new Date().toISOString(),
        ...base,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        ...cacheTokens(response.usage),
        ms: Math.round(performance.now() - started),
      });
      return response;
    } catch (error) {
      const info = classify(error);
      // 실패도 기록한다. 성공만 세면 배치 실패율의 분모가 성공 건수가 되어
      // 계획의 경보 조건(실패율 ≥ 5%)을 계산할 수 없다.
      recordMetric({
        ts: new Date().toISOString(),
        ...base,
        inputTokens: 0,
        outputTokens: 0,
        ms: Math.round(performance.now() - started),
        error: info,
      });

      if (!info.retryable || attempt >= MAX_RETRIES) throw error;

      const wait = backoffMs(attempt);
      console.error(
        `  ↻ ${op} ${info.type} 재시도 ${attempt + 1}/${MAX_RETRIES} (${wait}ms 후)`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/**
 * 실패를 재시도 가능 여부로 분류한다.
 *
 * 배치 재개가 무엇을 다시 시도하고 무엇을 격리할지 결정하는 기준이다. 크레딧 부족이나
 * 스키마 위반 같은 400은 몇 번을 다시 보내도 같은 결과이므로 재시도가 낭비다.
 */
export function classify(error: unknown): NonNullable<CallMetric['error']> {
  if (error instanceof Anthropic.RateLimitError) {
    return { status: error.status, type: 'rate_limit', retryable: true };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return { status: error.status, type: 'server_error', retryable: true };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { type: 'connection', retryable: true };
  }
  if (error instanceof Anthropic.APIError) {
    return { status: error.status, type: error.type ?? 'api_error', retryable: false };
  }
  // 구조화 출력 파싱 실패. 스키마와 응답이 어긋난 것이므로 **재시도 가능**하다 —
  // 같은 프롬프트라도 다음 생성에서는 스키마에 맞는 값이 나올 수 있다. 다만 반복되면
  // 스키마가 실제 출력 분포보다 좁다는 신호이므로 배치가 이 비율을 지켜봐야 한다.
  if (error instanceof Error && error.message.includes('Failed to parse structured output')) {
    return { type: 'schema_mismatch', retryable: true };
  }
  return { type: 'unknown', retryable: false };
}
