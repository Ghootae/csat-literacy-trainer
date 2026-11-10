// SNS 진단평가 위치 추정(D-0207). docs/experiments/sns-diagnostic-calibration-2026-11-06/calibrate.py를 옮긴 것이다.
// 메가스터디 정답률 → Rasch 난이도 → 정답 수로 능력 θ(EAP, N(0, σ²)) → 기준 시험 예상 원점수 → 등급컷 보간 백분위.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const POSITION_SUBJECTS = ['1004', '1005'] as const;
export type PositionSubject = typeof POSITION_SUBJECTS[number];
export const POSITION_SIGMA = 1;
export const REFERENCE_EXAM_SEQ = '349';
const CALIBRATION_DIR = 'docs/experiments/sns-diagnostic-calibration-2026-11-06';
/** 등급별 누적 상위 비율(%). */
const TOP = [4, 11, 23, 40, 60, 77, 89, 96];

interface ExamItem { correctRate: number; points: number }
export interface PositionData {
  exams: Record<string, { bySubject: Record<string, Record<string, ExamItem>> }>;
  cuts: Record<string, { cuts: Record<string, number[]>; percentile: number[] }>;
}
export interface PositionResponse { seq: string; questionNumber: number; correct: boolean }
export interface PositionRange { mean: number; low: number; high: number }
export interface ParticipantPosition {
  answered: number;
  correct: number;
  percentile: PositionRange;
  /** probabilities: 1~9등급 확률(합 1), mode: 확률 최대 등급(같으면 더 높은 등급 = 작은 숫자). */
  grade: { mean: number; best: number; worst: number; probabilities: number[]; mode: number };
  bySubject: Record<PositionSubject, { percentile: PositionRange }>;
}

let cached: { root: string; data: PositionData } | undefined;
export function loadPositionData(root = process.cwd()): PositionData {
  if (cached?.root === root) return cached.data;
  const read = (name: string) => JSON.parse(readFileSync(resolve(root, CALIBRATION_DIR, name), 'utf8')) as Record<string, any>;
  const data: PositionData = { exams: read('megastudy-items.json')['exams'], cuts: read('grade-cuts.json')['exams'] };
  cached = { root, data };
  return data;
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
export function itemDifficulty(p: number, sigma: number): number {
  return -Math.log(p / (1 - p)) * Math.sqrt(1 + Math.PI * sigma ** 2 / 8);
}
function examItems(data: PositionData, seq: string, subject: string): ExamItem[] {
  const items = data.exams[seq]?.bySubject[subject];
  if (!items) throw new Error(`기준 자료가 없습니다: ${seq}/${subject}`);
  return Object.values(items);
}
/** 문항의 선택과목별 난이도. correctRate는 퍼센트 단위로 저장돼 있다. */
export function itemDifficultyFor(data: PositionData, seq: string, questionNumber: number, subject: string, sigma = POSITION_SIGMA): number {
  const item = data.exams[seq]?.bySubject[subject]?.[String(questionNumber)];
  if (!item) throw new Error(`메가스터디 자료가 없습니다: ${seq}/${questionNumber}/${subject}`);
  return itemDifficulty(item.correctRate / 100, sigma);
}

const GRID = Array.from({ length: 401 }, (_, j) => -4 + 8 * j / 400);
/** 사전분포 N(0, σ²), 격자 -4~4 401점의 사후 가중치(합 1). */
function abilityPosterior(responses: { b: number; correct: boolean }[], sigma: number): number[] {
  const lp = GRID.map(t => -t * t / (2 * sigma * sigma)
    + responses.reduce((sum, { b, correct }) => sum + Math.log(correct ? logistic(t - b) : 1 - logistic(t - b)), 0));
  const m = Math.max(...lp);
  const w = lp.map(x => Math.exp(x - m));
  const s = w.reduce((a, x) => a + x, 0);
  return w.map(x => x / s);
}

/** 평균과 누적 0.1·0.9 지점(80% 구간). */
export function estimateAbility(responses: { b: number; correct: boolean }[], sigma: number): { mean: number; low: number; high: number } {
  const w = abilityPosterior(responses, sigma);
  const mean = GRID.reduce((a, g, i) => a + g * w[i]!, 0);
  let cdf = 0; let low: number | null = null; let high: number | null = null;
  GRID.forEach((g, i) => {
    cdf += w[i]!;
    if (low === null && cdf >= 0.1) low = g;
    if (high === null && cdf >= 0.9) high = g;
  });
  return { mean, low: low!, high: high! };
}

function percentOfRaw(data: PositionData, raw: number, seq: string, subject: string): number {
  const c = data.cuts[seq];
  if (!c) throw new Error(`등급컷 자료가 없습니다: ${seq}`);
  const pts: [number, number][] = [[100, 100], ...(c.cuts[subject] ?? []).map((cut, i): [number, number] => [cut, c.percentile[i]!]), [0, 0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [r1, p1] = pts[i]!; const [r2, p2] = pts[i + 1]!;
    if (r2 <= raw && raw <= r1) return r1 === r2 ? p1 : p2 + (p1 - p2) * (raw - r2) / (r1 - r2);
  }
  return 0;
}
export function gradeOfPercentile(percentile: number): number {
  const top = 100 - percentile;
  const g = TOP.findIndex(c => top <= c);
  return g < 0 ? 9 : g + 1;
}
/** 기준 시험 45문항 예상 원점수 → 원점수 등급컷 보간으로 전국 백분위. */
export function nationalPosition(theta: number, subject: PositionSubject, sigma = POSITION_SIGMA, data = loadPositionData()): number {
  const raw = examItems(data, REFERENCE_EXAM_SEQ, subject)
    .reduce((sum, it) => sum + it.points * logistic(theta - itemDifficulty(it.correctRate / 100, sigma)), 0);
  return percentOfRaw(data, raw, REFERENCE_EXAM_SEQ, subject);
}

/** 선택과목 하나의 사후분포 격자 점마다 능력값 → 전국 백분위 → 등급을 매기고 가중치를 더한 등급 분포(1~9등급, 합 1). */
function gradeProbabilities(posterior: number[], subject: PositionSubject, data: PositionData): number[] {
  const probabilities = new Array<number>(9).fill(0);
  GRID.forEach((theta, i) => {
    if (posterior[i]! < 1e-12) return;
    probabilities[gradeOfPercentile(nationalPosition(theta, subject, POSITION_SIGMA, data)) - 1]! += posterior[i]!;
  });
  return probabilities;
}

/** 지금까지 답한 문항의 정오로 두 선택과목을 각각 계산하고 백분위를 평균한다. σ = 1. */
export function participantPosition(responses: PositionResponse[], data = loadPositionData()): ParticipantPosition {
  const bySubject = {} as ParticipantPosition['bySubject'];
  const probabilities = new Array<number>(9).fill(0);
  for (const subject of POSITION_SUBJECTS) {
    const scored = responses.map(r => ({ b: itemDifficultyFor(data, r.seq, r.questionNumber, subject), correct: r.correct }));
    const theta = estimateAbility(scored, POSITION_SIGMA);
    // 두 선택과목의 등급 분포는 산술 평균한다(백분위를 두 과목 평균하는 것과 같은 취지, D-0218).
    gradeProbabilities(abilityPosterior(scored, POSITION_SIGMA), subject, data).forEach((x, i) => { probabilities[i]! += x / POSITION_SUBJECTS.length; });
    bySubject[subject] = { percentile: {
      mean: nationalPosition(theta.mean, subject, POSITION_SIGMA, data),
      low: nationalPosition(theta.low, subject, POSITION_SIGMA, data),
      high: nationalPosition(theta.high, subject, POSITION_SIGMA, data) } };
  }
  const avg = (key: keyof PositionRange) => POSITION_SUBJECTS.reduce((a, s) => a + bySubject[s].percentile[key], 0) / POSITION_SUBJECTS.length;
  const percentile = { mean: avg('mean'), low: avg('low'), high: avg('high') };
  return { answered: responses.length, correct: responses.filter(r => r.correct).length, percentile,
    grade: { mean: gradeOfPercentile(percentile.mean), best: gradeOfPercentile(percentile.high), worst: gradeOfPercentile(percentile.low),
      probabilities, mode: probabilities.reduce((best, x, i) => x > probabilities[best]! ? i : best, 0) + 1 }, bySubject };
}
