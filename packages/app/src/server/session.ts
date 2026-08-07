/**
 * 세션 기록 리포지토리.
 *
 * **이 UI의 진짜 산출물이다.** 관찰 대상 3건(부당한 강등 / 힌트가 문답 훈련을 유발하는가 /
 * 관계 서술어가 있는데 `주제만`)은 실제 학생 응답 없이는 판단할 수 없다.
 *
 * `attempts`가 **배열인 것이 요구사항**이다 — v1→v2→v3의 판정 변화를 봐야 "부당한 강등"을
 * 가릴 수 있는데, 최종 상태만 남기면 그 정보가 사라진다.
 *
 * 파일시스템 접근은 여기 안에만 있다(`D4` 규칙 1). `ownerId`는 처음부터 받되 로컬은 "local".
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RegionRecord } from './view.js';

const ROOT = resolve(process.cwd(), 'sessions');

export interface Attempt {
  readonly at: string;
  readonly sections: readonly string[];
  /** 수정이면 겨냥한 영역. 최초 제출이면 없다. */
  readonly targetRegionId?: string;
  /**
   * 그 시점의 영역 내용 전체. 판정값만 남기면 강등을 가릴 때 문구가 어긋난다 —
   * 박스는 ◐인데 문구는 `주제만`용이 붙는다.
   */
  readonly regions: readonly RegionRecord[];
}

export interface Session {
  readonly ownerId: string;
  readonly paragraphId: string;
  readonly startedAt: string;
  readonly attempts: readonly Attempt[];
}

function path(ownerId: string, sessionId: string): string {
  return resolve(ROOT, ownerId, `${sessionId}.json`);
}

export function loadSession(ownerId: string, sessionId: string): Session | undefined {
  const p = path(ownerId, sessionId);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Session) : undefined;
}

export function appendAttempt(
  ownerId: string,
  sessionId: string,
  paragraphId: string,
  attempt: Attempt,
): Session {
  const prev = loadSession(ownerId, sessionId);
  const next: Session = {
    ownerId,
    paragraphId,
    startedAt: prev?.startedAt ?? attempt.at,
    attempts: [...(prev?.attempts ?? []), attempt],
  };
  mkdirSync(resolve(ROOT, ownerId), { recursive: true });
  writeFileSync(path(ownerId, sessionId), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** 이미 "다듬기"를 쓴 영역. 영역당 1회이므로 이 집합이 버튼 소진을 결정한다. */
export function revisedRegions(session: Session | undefined): Set<string> {
  const out = new Set<string>();
  for (const a of session?.attempts ?? []) {
    if (a.targetRegionId !== undefined) out.add(a.targetRegionId);
  }
  return out;
}

export function listSessions(ownerId: string): string[] {
  const dir = resolve(ROOT, ownerId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
