import { bubbleLines, pickLine } from '../shared/bubble-lines.js';
import type { SimpleStage } from '../shared/dialogue-simple.js';

/** 판정을 기다리는 동안 튜터 말풍선에 보일 문구. 단계와 경과 시간으로 세트를 정하고, key(대기 중 제출의 transitionId)로 문장을 고른다. */
export function simpleWaitingText(stage: SimpleStage, elapsedMs: number, key: string): string {
  const set = bubbleLines;
  if (elapsedMs >= 25000) return pickLine(set.long, key);
  if (stage === 'AFTER_CORRECTION') return pickLine(elapsedMs >= 6000 ? set.correctionLate : set.correctionEarly, key);
  if (stage === 'AFTER_GAP') return pickLine(elapsedMs >= 6000 ? set.gapLate : set.correctionEarly, key);
  return pickLine(elapsedMs >= 15000 ? set.summaryLate : elapsedMs >= 6000 ? set.summaryMid : set.summaryEarly, key);
}
