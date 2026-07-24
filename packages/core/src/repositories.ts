/**
 * 저장소 인터페이스.
 *
 * 파일시스템 접근은 이 인터페이스의 구현체 밖에 존재해서는 안 된다 — 로컬 프로토타입에서
 * 웹앱으로 넘어갈 때 바뀌는 것이 구현체 하나로 국한되도록 하기 위한 경계다.
 *
 * `ownerId`는 로컬 단계에서 항상 `"local"`이고 구현체가 무시한다. 지금 무시되는 인자를
 * 받아두는 것은 공짜지만, 나중에 추가하는 것은 마이그레이션이다.
 */

import type { GoldMap } from './domain/gold.js';
import type { Passage } from './domain/passage.js';
import type { SlotEvaluation, TitleEvaluation } from './domain/scoring.js';

export type OwnerId = string;
export const LOCAL_OWNER: OwnerId = 'local';

export interface PassageRepository {
  get(ownerId: OwnerId, passageId: string): Promise<Passage | null>;
  list(ownerId: OwnerId): Promise<readonly Passage[]>;
  save(ownerId: OwnerId, passage: Passage): Promise<void>;
}

export interface GoldRepository {
  get(ownerId: OwnerId, paragraphId: string): Promise<GoldMap | null>;
  save(ownerId: OwnerId, gold: GoldMap): Promise<void>;
  /** 골드가 이미 있는 문단 id. 배치 재개가 이미 처리한 문단을 건너뛰는 데 쓴다. */
  completedParagraphIds(ownerId: OwnerId, passageId: string): Promise<readonly string[]>;
}

/**
 * 지문 1개 완주 단위의 세션.
 *
 * 스펙은 계정·학습이력·취약점 리포트를 명시적으로 defer했다. 그러나 보상은 어딘가에 쌓여야
 * 의미가 있으므로, 세션 하나의 범위에서만 진행 상태와 누적 보상을 보관한다.
 */
export interface StudySession {
  readonly id: string;
  readonly passageId: string;
  readonly startedAt: string;
  /** 현재 진행 중인 문단의 0-based 인덱스. */
  readonly currentParagraphIndex: number;
  readonly slotEvaluations: readonly SlotEvaluation[];
  readonly titleEvaluations: readonly TitleEvaluation[];
  readonly cumulativeReward: number;
}

export interface SessionRepository {
  get(ownerId: OwnerId, sessionId: string): Promise<StudySession | null>;
  save(ownerId: OwnerId, session: StudySession): Promise<void>;
}
