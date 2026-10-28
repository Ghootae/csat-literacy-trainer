/** 순차 말풍선 사이 간격. 앞 말풍선이 길수록 읽을 시간을 더 준다. 동작 줄이기 설정에서도 같다. */
export function bubbleDelayMs(previousText: string): number {
  return Math.min(2500, 1200 + 10 * [...previousText].length);
}
