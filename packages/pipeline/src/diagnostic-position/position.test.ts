import { describe, expect, it } from 'vitest';
import { estimateAbility, gradeOfPercentile, itemDifficulty, participantPosition, type PositionResponse } from './position.js';

// 세트 E 16문항(grade-cuts.json setEItems). 기대값은 OUTPUT.md 3절 표다(calibrate.py를 다시 실행하지 않는다).
const SET_E: [string, number][] = [
  ...[12, 13, 14, 15, 16].map((n): [string, number] => ['311', n]),
  ...[4, 5, 6, 7].map((n): [string, number] => ['319', n]),
  ...[8, 9, 10].map((n): [string, number] => ['326', n]),
  ...[14, 15, 16, 17].map((n): [string, number] => ['345', n]),
];
// [정답 수, 화작, 언매, 평균, 평균 등급, 범위 하한, 범위 상한, 상한 등급(best), 하한 등급(worst)]
const TABLE: number[][] = [
  [4, 31, 34, 32, 6, 16, 52, 5, 7], [5, 38, 41, 40, 6, 22, 59, 5, 7], [6, 45, 49, 47, 5, 28, 66, 4, 6],
  [7, 52, 56, 54, 5, 35, 73, 4, 6], [8, 59, 63, 61, 4, 42, 79, 3, 5], [9, 66, 71, 68, 4, 49, 84, 3, 5],
  [10, 73, 77, 75, 4, 56, 88, 3, 5], [11, 79, 83, 81, 3, 64, 92, 2, 4], [12, 83, 89, 86, 3, 71, 95, 2, 4],
  [13, 88, 93, 90, 2, 78, 96, 1, 3], [14, 92, 96, 94, 2, 84, 97, 1, 3], [15, 95, 97, 96, 1, 89, 98, 1, 3],
  [16, 97, 98, 97, 1, 93, 99, 1, 2],
];
const responsesFor = (k: number): PositionResponse[] => SET_E.map(([seq, questionNumber], i) => ({ seq, questionNumber, correct: i < k }));

describe('participantPosition (OUTPUT.md 3절 표)', () => {
  it.each(TABLE)('정답 수 %i', (k, jakJ, unmae, mean, grade, low, high, best, worst) => {
    const p = participantPosition(responsesFor(k!));
    expect(p.answered).toBe(16); expect(p.correct).toBe(k);
    expect(Math.round(p.bySubject['1004'].percentile.mean)).toBe(jakJ);
    expect(Math.round(p.bySubject['1005'].percentile.mean)).toBe(unmae);
    expect(Math.round(p.percentile.mean)).toBe(mean); expect(p.grade.mean).toBe(grade);
    expect(Math.round(p.percentile.low)).toBe(low); expect(Math.round(p.percentile.high)).toBe(high);
    expect(p.grade.best).toBe(best); expect(p.grade.worst).toBe(worst);
  });
  it('정답 위치와 무관하게 정답 수가 같으면 같은 위치다(Rasch 충분통계량)', () => {
    const forward = participantPosition(responsesFor(10));
    const reversed = participantPosition(responsesFor(10).map((r, i, all) => ({ ...r, correct: all.length - 1 - i < 10 })));
    expect(reversed.percentile.mean).toBeCloseTo(forward.percentile.mean, 6);
  });
  it('일부만 답해도 계산하고 답이 없으면 사전분포 위치를 낸다', () => {
    const partial = participantPosition(responsesFor(5).slice(0, 5));
    expect(partial.answered).toBe(5); expect(partial.percentile.low).toBeLessThan(partial.percentile.high);
    expect(participantPosition([]).answered).toBe(0);
  });
  it('난이도와 등급 보조 함수', () => {
    expect(itemDifficulty(0.5, 1)).toBeCloseTo(0, 12);
    expect(itemDifficulty(0.8, 1)).toBeLessThan(0);
    expect(gradeOfPercentile(96)).toBe(1); expect(gradeOfPercentile(95.9)).toBe(2); expect(gradeOfPercentile(3)).toBe(9);
    const theta = estimateAbility([{ b: 0, correct: true }], 1);
    expect(theta.mean).toBeGreaterThan(0); expect(theta.low).toBeLessThan(theta.high);
  });
});
