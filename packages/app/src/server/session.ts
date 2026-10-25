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

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { RegionRecord } from './view.js';
import type { FeedbackRecord } from './problem-feedback.js';
import type {
  CompletedProblemSessionRecord,
  ProblemSessionLogger,
} from './problem-solving.js';

export class JsonlProblemSessionLogger implements ProblemSessionLogger {
  constructor(readonly path = resolve(
    process.env['CSAT_PROBLEM_SESSION_LOG'] ??
    resolve(process.cwd(), '.omc/logs/problem-solving/sessions.jsonl'),
  )) {}

  save(record: CompletedProblemSessionRecord): void {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(record)}\n`, 'utf8');
  }
}

/** Problem lab headless audit is separate from operational/student evidence records. */
export function appendFeedbackRecord(record: FeedbackRecord): void {
  // 저장 자료 호환을 위해 로그 경로 값 유지(D-0173)
  const file = resolve(process.env['CSAT_PROBLEM_FEEDBACK_LOG'] ?? process.env['CSAT_PROBLEM_FEEDBACK_V4_LOG'] ?? '.omc/logs/problem-feedback-v4/events.jsonl');
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
}

/** 출제자 전략 글 파일을 읽는다. 파일시스템 접근은 이 파일 안에만 둔다(D4 규칙 1). */
export function readExaminerStrategyFile(path: string): string {
  return readFileSync(path, 'utf8');
}

/** 출제자 전략 보기 사용 기록. 문제 풀이 이벤트 기록(events.jsonl)은 세션 전체 스냅샷 형식이라 따로 둔다. */
export function appendExaminerStrategyLog(record: object): void {
  // 저장 자료 호환을 위해 로그 경로 값 유지(D-0173)
  const file = resolve(process.env['CSAT_EXAMINER_STRATEGY_LOG'] ?? '.omc/logs/problem-feedback-v4/examiner-strategy.jsonl');
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
}

/**
 * 호출 시점에 푼다. 운영은 cwd의 `sessions/`를 쓰고, E2E는 `CSAT_SESSION_ROOT`로
 * 임시 디렉터리를 주입해 실제 학생 기록과 서로 오염되지 않게 한다.
 */
function root(): string {
  return process.env['CSAT_SESSION_ROOT'] ?? resolve(process.cwd(), 'sessions');
}

export interface Attempt {
  readonly at: string;
  readonly sections: readonly string[];
  /** 이번 패스에서 고친 영역들. 최초 제출이면 없다. */
  readonly targetRegionIds?: readonly string[];
  /**
   * 그 시점의 영역 내용 전체. 판정값만 남기면 강등을 가릴 때 문구가 어긋난다 —
   * 박스는 ◐인데 문구는 `주제만`용이 붙는다.
   */
  readonly regions: readonly RegionRecord[];
}

/** 타이틀 시도 하나. 초기 가설은 `judged: false`로 저장만 된다. */
export interface TitleAttempt {
  readonly at: string;
  readonly text: string;
  /**
   * 초기 가설이면 거짓. **판정하지 않는 이유**: 점수·진행에 영향을 주지 않기로 했고
   * (초기 답을 일부러 나쁘게 쓸 유인을 없애기 위해), 최종과 나란히 보여주는 데는 원문이면
   * 충분하다. 저장은 해두므로 나중에 일괄로 판정해 진단표를 만들 수 있다.
   */
  readonly judged: boolean;
  readonly verdict?: string;
  readonly compressed?: boolean;
}

/**
 * 한 문단의 기록 전부. 영역 시도와 타이틀 시도가 같은 파일에 남는다.
 *
 * **두 append 함수가 각자 세션을 다시 만든다.** 그래서 `...prev`로 먼저 펼치지 않으면
 * 서로의 필드를 지운다 — 실제로 영역을 제출하는 순간 초기 가설이 날아갔다(2026-08-10).
 * 필드를 새로 추가할 때마다 두 함수를 다 고쳐야 하는 구조이므로, 전개가 유일한 안전장치다.
 */
export interface Session {
  readonly ownerId: string;
  readonly paragraphId: string;
  readonly startedAt: string;
  readonly attempts: readonly Attempt[];
  /** 타이틀 시도. 첫 항목이 초기 가설(미판정)이고, 이후가 최종 타이틀이다. */
  readonly titleAttempts?: readonly TitleAttempt[];
}

export interface PassageSession {
  readonly ownerId: string;
  readonly passageId: string;
  readonly startedAt: string;
  readonly completedParagraphIds: readonly string[];
  readonly text?: string;
  readonly savedAt?: string;
}

function path(ownerId: string, sessionId: string): string {
  return resolve(root(), ownerId, `${sessionId}.json`);
}

function passageTitlePath(ownerId: string, sessionId: string): string {
  return resolve(root(), ownerId, 'passages', `${sessionId}.json`);
}

export function loadSession(ownerId: string, sessionId: string): Session | undefined {
  const p = path(ownerId, sessionId);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Session) : undefined;
}

export function loadPassageSession(
  ownerId: string,
  sessionId: string,
): PassageSession | undefined {
  const p = passageTitlePath(ownerId, sessionId);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as PassageSession) : undefined;
}

export function markParagraphComplete(
  ownerId: string,
  sessionId: string,
  passageId: string,
  paragraphId: string,
  at: string,
): PassageSession {
  const prev = loadPassageSession(ownerId, sessionId);
  const completed = new Set(prev?.completedParagraphIds ?? []);
  completed.add(paragraphId);
  const next: PassageSession = {
    ...prev,
    ownerId,
    passageId,
    startedAt: prev?.startedAt ?? at,
    completedParagraphIds: [...completed],
  };
  const target = passageTitlePath(ownerId, sessionId);
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function savePassageTitle(
  ownerId: string,
  sessionId: string,
  passageId: string,
  text: string,
  at: string,
): PassageSession {
  const prev = loadPassageSession(ownerId, sessionId);
  const next: PassageSession = {
    ...prev,
    ownerId,
    passageId,
    startedAt: prev?.startedAt ?? at,
    completedParagraphIds: prev?.completedParagraphIds ?? [],
    text,
    savedAt: at,
  };
  const target = passageTitlePath(ownerId, sessionId);
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function appendAttempt(
  ownerId: string,
  sessionId: string,
  paragraphId: string,
  attempt: Attempt,
): Session {
  const prev = loadSession(ownerId, sessionId);
  const next: Session = {
    ...prev,
    ownerId,
    paragraphId,
    startedAt: prev?.startedAt ?? attempt.at,
    attempts: [...(prev?.attempts ?? []), attempt],
  };
  mkdirSync(resolve(root(), ownerId), { recursive: true });
  writeFileSync(path(ownerId, sessionId), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** 이미 "다듬기"를 쓴 영역. 영역당 1회이므로 이 집합이 버튼 소진을 결정한다. */
export function revisedRegions(session: Session | undefined): Set<string> {
  const out = new Set<string>();
  for (const a of session?.attempts ?? []) {
    for (const id of a.targetRegionIds ?? []) out.add(id);
  }
  return out;
}

/** 타이틀 시도를 덧붙인다. 영역 시도와 같은 파일에 남는다 — 한 문단의 기록은 하나다. */
export function appendTitleAttempt(
  ownerId: string,
  sessionId: string,
  paragraphId: string,
  attempt: TitleAttempt,
): Session {
  const prev = loadSession(ownerId, sessionId);
  const next: Session = {
    ...prev,
    ownerId,
    paragraphId,
    startedAt: prev?.startedAt ?? attempt.at,
    attempts: prev?.attempts ?? [],
    titleAttempts: [...(prev?.titleAttempts ?? []), attempt],
  };
  mkdirSync(resolve(root(), ownerId), { recursive: true });
  writeFileSync(path(ownerId, sessionId), JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** 채점된 타이틀 시도 수. 타이틀도 다듬기 1회이므로 이 값이 소진을 결정한다. */
export function judgedTitleCount(session: Session | undefined): number {
  return (session?.titleAttempts ?? []).filter((t) => t.judged).length;
}

export function listSessions(ownerId: string): string[] {
  const dir = resolve(root(), ownerId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
