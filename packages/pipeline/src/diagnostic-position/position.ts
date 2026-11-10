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
  /** probabilities: 1~9등급 확률(합 1), mode: 확률 최대 등급(같으면 더 높은 등급 = 작은 숫자).
   *  density: 실수 등급 축 [1, 10)을 등급마다 GRADE_DENSITY_BINS칸으로 나눈 확률(합 1, 매끄럽게 편 값, D-0219). */
  grade: { mean: number; best: number; worst: number; probabilities: number[]; mode: number; density: number[] };
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
function abilityPosterior(responses: { b: number; correct: boolean }[], sigma: number, grid: readonly number[] = GRID): number[] {
  const lp = grid.map(t => -t * t / (2 * sigma * sigma)
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
/** 기준 시험 45문항 예상 원점수(능력값의 매끄러운 함수). */
export function nationalRaw(theta: number, subject: PositionSubject, sigma = POSITION_SIGMA, data = loadPositionData()): number {
  return examItems(data, REFERENCE_EXAM_SEQ, subject)
    .reduce((sum, it) => sum + it.points * logistic(theta - itemDifficulty(it.correctRate / 100, sigma)), 0);
}
/** 기준 시험 45문항 예상 원점수 → 원점수 등급컷 보간으로 전국 백분위. */
export function nationalPosition(theta: number, subject: PositionSubject, sigma = POSITION_SIGMA, data = loadPositionData()): number {
  return percentOfRaw(data, nationalRaw(theta, subject, sigma, data), REFERENCE_EXAM_SEQ, subject);
}

/** 실수 등급 한 칸을 나누는 칸 수(띠 그라데이션용, D-0219). */
export const GRADE_DENSITY_BINS = 10;

/** 단조 3차 보간(PCHIP, Fritsch–Carlson). x는 오름차순. 점을 그대로 지나고 단조성과 1차 미분 연속을 지킨다. */
export function pchip(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const n = xs.length; const h: number[] = []; const delta: number[] = [];
  for (let i = 0; i + 1 < n; i++) { h.push(xs[i + 1]! - xs[i]!); delta.push((ys[i + 1]! - ys[i]!) / h[i]!); }
  const m = new Array<number>(n).fill(0);
  m[0] = delta[0]!; m[n - 1] = delta[n - 2]!;
  for (let i = 1; i + 1 < n; i++) {
    if (delta[i - 1]! * delta[i]! <= 0) { m[i] = 0; continue; }
    const w1 = 2 * h[i]! + h[i - 1]!; const w2 = h[i]! + 2 * h[i - 1]!;
    m[i] = (w1 + w2) / (w1 / delta[i - 1]! + w2 / delta[i]!);   // 가중 조화 평균
  }
  return (x: number) => {
    const clamped = Math.min(xs[n - 1]!, Math.max(xs[0]!, x));
    let i = 0; while (i + 2 < n && clamped > xs[i + 1]!) i++;
    const t = (clamped - xs[i]!) / h[i]!; const t2 = t * t; const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * h[i]! * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * h[i]! * m[i + 1]!;
  };
}
const gradeCurves = new Map<string, (raw: number) => number>();
/** 원점수 → 실수 등급 [1, 10). 원점수 등급컷을 정수 등급 경계(100점 = 1.0, 1등급컷 = 2.0, …, 8등급컷 = 9.0, 0점 = 10.0)로 두고
 *  단조 3차 보간으로 잇는다. 직선 보간은 등급마다 원점수 폭이 달라 경계에서 띠 진하기가 꺾였다(D-0219 정정). */
export function continuousGradeOfRaw(raw: number, subject: PositionSubject, data = loadPositionData()): number {
  const key = `${REFERENCE_EXAM_SEQ}/${subject}`;
  let curve = gradeCurves.get(key);
  if (!curve) {
    const cuts = data.cuts[REFERENCE_EXAM_SEQ]?.cuts[subject];
    if (!cuts || cuts.length !== 8) throw new Error(`등급컷 자료가 없습니다: ${key}`);
    curve = pchip([0, ...[...cuts].reverse(), 100], [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    gradeCurves.set(key, curve);
  }
  return Math.min(10 - 1e-9, Math.max(1, curve(raw)));
}

/** 등급 축 계산용 촘촘한 능력값 격자(-4~4, 4001점). 401점 격자는 1등급 쪽에서 등급 칸보다 성글었다. */
const FINE_GRID = Array.from({ length: 4001 }, (_, j) => -4 + 8 * j / 4000);
/** 선택과목 하나: 촘촘한 격자의 사후분포를 실수 등급 칸(등급마다 GRADE_DENSITY_BINS칸)과 정수 등급으로 모은다. */
function gradeAxis(scored: { b: number; correct: boolean }[], subject: PositionSubject, data: PositionData): { bins: number[]; probabilities: number[] } {
  const posterior = abilityPosterior(scored, POSITION_SIGMA, FINE_GRID);
  const bins = new Array<number>(9 * GRADE_DENSITY_BINS).fill(0); const probabilities = new Array<number>(9).fill(0);
  FINE_GRID.forEach((theta, i) => {
    if (posterior[i]! < 1e-14) return;
    const c = continuousGradeOfRaw(nationalRaw(theta, subject, POSITION_SIGMA, data), subject, data);
    bins[Math.min(bins.length - 1, Math.floor((c - 1) * GRADE_DENSITY_BINS))]! += posterior[i]!;
    probabilities[Math.min(8, Math.floor(c) - 1)]! += posterior[i]!;
  });
  return { bins, probabilities };
}
/** 칸 경계에서 생기는 잔물결만 가볍게 편다(가우스 커널 σ = 1칸). 합은 1로 다시 맞춘다. */
function smoothDensity(bins: number[], sigma = 1): number[] {
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: 2 * radius + 1 }, (_, k) => Math.exp(-((k - radius) ** 2) / (2 * sigma * sigma)));
  const out = bins.map((_, i) => {
    let sum = 0; let weight = 0;
    kernel.forEach((w, k) => { const j = i + k - radius; if (j >= 0 && j < bins.length) { sum += bins[j]! * w; weight += w; } });
    return sum / weight;
  });
  const total = out.reduce((a, x) => a + x, 0);
  return total > 0 ? out.map(x => x / total) : out;
}


/** 지금까지 답한 문항의 정오로 두 선택과목을 각각 계산하고 백분위를 평균한다. σ = 1. */
export function participantPosition(responses: PositionResponse[], data = loadPositionData()): ParticipantPosition {
  const bySubject = {} as ParticipantPosition['bySubject'];
  const probabilities = new Array<number>(9).fill(0);
  const rawDensity = new Array<number>(9 * GRADE_DENSITY_BINS).fill(0);
  for (const subject of POSITION_SUBJECTS) {
    const scored = responses.map(r => ({ b: itemDifficultyFor(data, r.seq, r.questionNumber, subject), correct: r.correct }));
    const theta = estimateAbility(scored, POSITION_SIGMA);
    // 두 선택과목의 등급 분포는 산술 평균한다(백분위를 두 과목 평균하는 것과 같은 취지, D-0218).
    const axis = gradeAxis(scored, subject, data);
    axis.probabilities.forEach((x, i) => { probabilities[i]! += x / POSITION_SUBJECTS.length; });
    axis.bins.forEach((x, i) => { rawDensity[i]! += x / POSITION_SUBJECTS.length; });
    bySubject[subject] = { percentile: {
      mean: nationalPosition(theta.mean, subject, POSITION_SIGMA, data),
      low: nationalPosition(theta.low, subject, POSITION_SIGMA, data),
      high: nationalPosition(theta.high, subject, POSITION_SIGMA, data) } };
  }
  const avg = (key: keyof PositionRange) => POSITION_SUBJECTS.reduce((a, s) => a + bySubject[s].percentile[key], 0) / POSITION_SUBJECTS.length;
  const percentile = { mean: avg('mean'), low: avg('low'), high: avg('high') };
  return { answered: responses.length, correct: responses.filter(r => r.correct).length, percentile,
    grade: { mean: gradeOfPercentile(percentile.mean), best: gradeOfPercentile(percentile.high), worst: gradeOfPercentile(percentile.low),
      probabilities, mode: probabilities.reduce((best, x, i) => x > probabilities[best]! ? i : best, 0) + 1, density: smoothDensity(rawDensity) }, bySubject };
}
