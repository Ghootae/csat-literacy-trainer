import type { SimpleStage } from '../shared/dialogue-simple.js';

/** 판정을 기다리는 동안 튜터 말풍선에 보일 문구. 단계와 경과 시간에 따라 바뀐다. */
export function simpleWaitingText(stage: SimpleStage, elapsedMs: number): string {
  if (elapsedMs >= 25000) return '조금 오래 걸리고 있어. 조금만 더 기다려 줘';
  if (stage === 'AFTER_CORRECTION') return elapsedMs >= 6000 ? '아까 질문이랑 맞춰 보고 있어' : '네 답을 읽고 있어';
  if (stage === 'AFTER_GAP') return elapsedMs >= 6000 ? '물어본 내용이 채워졌는지 보고 있어' : '네 답을 읽고 있어';
  return elapsedMs >= 15000 ? '어떤 내용을 잡았는지 정리하고 있어' : elapsedMs >= 6000 ? '문단이랑 하나씩 맞춰 보고 있어' : '네 요약을 읽고 있어';
}
