import { validateDirectJudgment } from './direct-judgment-experiment.js';
export const AXIS_CONTEXT_ISOLATION_VERSION = 'axis-context-isolation-v1';
export const ISOLATION_CASES = [
  { id: 'D01', sourceCaseId: 'P01-insufficient', targetAxisId: 'AX1', expected: ['UNCLEAR_OK', 'UNCLEAR_SERIOUS'], note: '원래 도파민 압축 나열 실패' },
  { id: 'D02', sourceCaseId: 'P02-insufficient', targetAxisId: 'AX1', expected: ['UNCLEAR_OK', 'UNCLEAR_SERIOUS'], note: '도파민 완결문 나열 대조' },
  { id: 'D03', sourceCaseId: 'P01-sufficient', targetAxisId: 'AX1', expected: ['PASS'], note: '도파민 관계 표현 양성 대조' },
  { id: 'G01', sourceCaseId: 'P04-insufficient', targetAxisId: 'AX2', expected: ['PASS'], note: '공손룡 AX1 부족, AX2 논쟁 표현 충분' },
  { id: 'G02', sourceCaseId: 'P04-sufficient', targetAxisId: 'AX2', expected: ['PASS'], note: '공손룡 AX1 충분, 동일 AX2 논쟁 표현' },
] as const;

/** Preserve the complete student utterance and source. Only narrow the gold axes. */
export function isolateAxisInput(input: string, targetAxisId: string): string {
  const payload = JSON.parse(input);
  const selected = payload.centralAxes.filter((a: { id: string }) => a.id === targetAxisId);
  if (selected.length !== 1) throw new Error('target axis must appear exactly once');
  return JSON.stringify({ ...payload, centralAxes: selected }, null, 2);
}
export function isolationOutcome(raw: unknown, input: string, targetAxisId: string, expected: readonly string[]) {
  try {
    const axes = validateDirectJudgment(raw, JSON.parse(input).centralAxes.map((a: { id: string }) => a.id)).axes;
    const target = axes.find(a => a.axisId === targetAxisId);
    if (!target) throw new Error('target axis missing');
    return { contractValid: true, contractError: null, axes, targetStatus: target.status,
      expectedMatch: expected.includes(target.status) };
  } catch (e) {
    return { contractValid: false, contractError: String(e), axes: null, targetStatus: null, expectedMatch: null };
  }
}
