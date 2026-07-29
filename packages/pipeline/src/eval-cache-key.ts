/**
 * 평가 결과 캐시 키.
 *
 * 이전 키는 `paragraphId + probeText + queries`만 썼다. 그래서 `query-eval.ts`의 시스템
 * 프롬프트나 모델을 바꿔도 과거 평가 결과가 그대로 재사용됐고, 수정 후 검증이 조용히
 * 무효가 됐다 (실제로 2026-07-29 프롬프트 수정 후 assess 재실행이 이 문제로 새 프롬프트를
 * 전혀 태우지 못했다).
 *
 * 따라서 **평가 결과를 바꿀 수 있는 모든 입력**을 키에 넣는다. 사람이 손으로 올리는 버전
 * 번호가 아니라 실제 API에 전달되는 값(시스템 프롬프트 원문, 출력 스키마, 요청 설정)을
 * 해시해야 한다 — 그래야 프롬프트를 고치는 순간 자동으로 키가 갈린다.
 */

import { createHash } from 'node:crypto';

/**
 * 캐시 **구조** 버전. 직렬화 형식이나 키 구성이 바뀌면 올린다. 파일명 접두사로 쓰이므로
 * 값을 올리면 기존 엔트리는 자연스럽게 miss가 되고, 파일 자체는 디스크에 남아 읽을 수 있다.
 */
export const CACHE_SCHEMA_VERSION = 2;

export interface EvalCacheKeyInputs {
  readonly paragraphId: string;
  /** 학생 응답(프로브) 원문. */
  readonly probeText: string;
  /**
   * 평가에 전달되는 질의 목록. **순서를 보존한다** — 질의는 프롬프트에 배열 순서대로
   * 렌더링되므로 순서가 바뀌면 모델에 전달되는 문자열이 달라진다. 임의로 정렬하지 않는다.
   */
  readonly queries: readonly unknown[];
  /** 실제 API에 전달되는 요청 지문 (모델·시스템 프롬프트·출력 스키마·요청 설정). */
  readonly requestFingerprint: unknown;
}

/**
 * 안정적 직렬화. 객체 키는 정렬해 프로퍼티 삽입 순서에 흔들리지 않게 하고, **배열 순서는
 * 그대로 둔다**(의미가 있으므로). `undefined` 프로퍼티는 제외해 `JSON.stringify`의
 * 생략 동작과 일치시킨다.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

/** 캐시 파일명에 쓰는 키. 구조 버전을 접두사로 달아 세대 간 충돌을 원천 차단한다. */
export function evalCacheKey(inputs: EvalCacheKeyInputs): string {
  const payload = canonicalize({
    cacheSchemaVersion: CACHE_SCHEMA_VERSION,
    paragraphId: inputs.paragraphId,
    probeText: inputs.probeText,
    queries: inputs.queries,
    request: inputs.requestFingerprint,
  });
  const digest = createHash('sha256').update(payload).digest('hex').slice(0, 32);
  return `v${CACHE_SCHEMA_VERSION}-${digest}`;
}
