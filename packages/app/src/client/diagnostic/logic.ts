/**
 * 진단평가 화면의 순수 계산(인계 B (4)·(5)): 문장 만들기, 정렬, 추천 고르기, 시간 누적.
 * 학생에게 보이는 문장은 반말이다(D-0116). 비틂·관계·단계 이름은 wording.ts에서만 온다.
 */
import { BRANCH_CODES, BRANCH_WORDING, OTHER_TWIST_NAME, STEP_CODES, STEP_WORDING, TWIST_CODES, TWIST_WORDING, type BranchCode, type TwistCode } from './wording.js';
import type { AnswerCategory, Confidence, QualityTiers, ReadingCounts, ResultItem, ResultSummaryLink, ResultView, SummaryCardView } from './types.js';

export const CIRCLED = '①②③④⑤';
/** ①~⑤ 뒤에 붙는 조사(일·이·삼·사·오). 을/를. */
const OBJECT_PARTICLE = ['을', '를', '을', '를', '를'];
export const circled = (position: number): string => CIRCLED[position - 1] ?? String(position);
export const circledObject = (position: number): string => `${circled(position)}${OBJECT_PARTICLE[position - 1] ?? '을'}`;

/** 받침이 있으면 을, 없으면 를(한글 아닌 끝글자는 를). */
export function eulReul(word: string): string {
  const last = word.trim().at(-1) ?? '';
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '를';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

// ---------- 지문 끝 중간 화면 ----------

export const JUDGING_TEXT = '근거는 살펴보는 중이야.';
/** 범주별 개수를 표시 단계에 맞춰 센다. 2단계면 범주 1·2를 `accurate` 하나로 합치고 `weak`는 0이다. 분모는 범주 1·2·3만 센다. */
export interface CategoryTally { accurate: number; weak: number; error: number; denominator: number; sure: number; unsure: number; unverified: number; checking: number }
export function categoryTally(counts: Record<AnswerCategory, number>, tiers: QualityTiers): CategoryTally {
  const accurate = tiers === 2 ? counts.SUPPORTED_CORRECT + counts.WEAK_CORRECT : counts.SUPPORTED_CORRECT;
  const weak = tiers === 2 ? 0 : counts.WEAK_CORRECT;
  return { accurate, weak, error: counts.ERROR_CORRECT, denominator: counts.SUPPORTED_CORRECT + counts.WEAK_CORRECT + counts.ERROR_CORRECT,
    sure: counts.SURE_CORRECT, unsure: counts.UNSURE_CORRECT, unverified: counts.UNVERIFIED, checking: counts.CHECKING };
}
export function countCategories(items: readonly { category: AnswerCategory }[]): Record<AnswerCategory, number> {
  const counts: Record<AnswerCategory, number> = { WRONG: 0, SURE_CORRECT: 0, UNSURE_CORRECT: 0, PENDING: 0, CHECKING: 0, UNVERIFIED: 0, ERROR_CORRECT: 0, SUPPORTED_CORRECT: 0, WEAK_CORRECT: 0 };
  for (const item of items) counts[item.category]++;
  return counts;
}
/** 지문 결과 문장. 정답 수를 먼저 말하고, 근거 결과는 판정이 끝난 범주만 센다. 판정 중이면 한 줄을 붙인다. */
export function passageResultSentence(card: Pick<SummaryCardView, 'total' | 'correct' | 'counts' | 'qualityTiers' | 'judging'>): string {
  const t = categoryTally(card.counts, card.qualityTiers);
  const notes = [t.sure > 0 ? `${t.sure}개는 확실하다고 한 정답` : null, t.unsure > 0 ? `${t.unsure}개는 확신 없이 맞힌 정답` : null,
    t.unverified > 0 ? `${t.unverified}개는 근거로 풀이를 확인하지 못했어` : null, t.checking > 0 ? `${t.checking}개는 확인 중이야` : null].filter((x): x is string => x !== null);
  const parts = [`이 지문의 ${card.total}문항 중 ${card.correct}개를 맞혔어`];
  if (t.denominator > 0) parts.push(`근거를 쓴 정답 ${t.denominator}개 중 ${t.accurate}개는 ${card.qualityTiers === 2 ? '근거가 확인되는 정답이야' : '근거도 정확했어'}`);
  if (notes.length > 0) parts[parts.length - 1] += `(${notes.join(', ')})`;
  const sentence = parts.map(part => `${part}.`).join(' ');
  return card.judging > 0 ? `${sentence} ${JUDGING_TEXT}` : sentence;
}

// ---------- ① 내 위치 ----------

/** "{best}~{worst}등급"(같으면 "{n}등급"). */
export function gradeText(grade: { best: number; worst: number }): string {
  return grade.best === grade.worst ? `${grade.best}등급` : `${grade.best}~${grade.worst}등급`;
}
export const POSITION_NOTE = '시간 제한 없이 근거를 쓰며 푼 결과를 수능 응시자 분포에 맞춰 환산해 본 추정치야. 문항 난이도는 메가스터디 이용자 정답률로 정했어.';
/** 백분위 범위를 막대의 왼쪽·너비(%)로 바꾼다. 너비는 최소 1이다. */
export function rangeBar(low: number, high: number): { left: number; width: number } {
  const clamp = (x: number) => Math.min(100, Math.max(0, x));
  const left = clamp(Math.min(low, high));
  return { left, width: Math.max(1, clamp(Math.max(low, high)) - left) };
}
/** 정규분포 역함수(Acklam 근사). 백분위(0~100) → z. 등급 띠·곡선의 가로 위치에 쓴다. */
export function zOfPercentile(percentile: number): number {
  const p = Math.min(0.9999, Math.max(0.0001, percentile / 100));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1); }
  if (p > 1 - 0.02425) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1); }
  const q = p - 0.5; const r = q * q;
  return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}
/** 등급 경계의 누적 백분위(아래에서부터). 9등급 0~4, …, 1등급 96~100. */
export const GRADE_EDGES = [0, 4, 11, 23, 40, 60, 77, 89, 96, 100] as const;

// ---------- ② 문제 풀이 결과 ----------

export type CellState = 'correct' | 'wrong' | 'review';
export const cellState = (item: Pick<ResultItem, 'review' | 'correct'>): CellState => item.review ? 'review' : item.correct ? 'correct' : 'wrong';

export interface SolveStats { correct: number; total: number; accurate: number; qualityDenominator: number; sure: number; unsure: number; unverified: number }
/** 숫자 칸. 근거까지 정확한 정답(2단계면 근거가 확인되는 정답) / 근거를 쓴 정답(범주 1·2·3)과, 분모에 넣지 않는 범주 4·5·`UNVERIFIED` 개수. */
export function solveStats(items: readonly ResultItem[], total = 16, tiers: QualityTiers = 3): SolveStats {
  const t = categoryTally(countCategories(items), tiers);
  return { correct: items.filter(item => item.correct).length, total, accurate: t.accurate, qualityDenominator: t.denominator, sure: t.sure, unsure: t.unsure, unverified: t.unverified };
}

export interface StepTendency { sentence: string; bars: { code: string; name: string; count: number; ratio: number }[] }
/** 어긋난 단계(경향). `denominator = 0`이거나 어긋난 단계가 없으면 null(칸을 숨긴다). */
export function stepTendency(steps: Pick<ResultView['steps'], 'counts' | 'denominator'>): StepTendency | null {
  if (steps.denominator <= 0) return null;
  const count = (code: string) => steps.counts[code] ?? 0;
  const max = Math.max(...STEP_CODES.map(count));
  if (max <= 0) return null;
  const names = STEP_CODES.filter(code => count(code) === max).map(code => STEP_WORDING[code]).join('·');
  return { sentence: `근거를 살펴본 ${steps.denominator}문항 중 ${max}개가 ${names} 단계에서 어긋났어.`,
    bars: STEP_CODES.map(code => ({ code, name: STEP_WORDING[code], count: count(code), ratio: count(code) / steps.denominator })) };
}

const isTwistCode = (code: string): code is TwistCode => code in TWIST_WORDING;
/** 걸린 함정 꼬리표: 많은 순(같으면 확정본 표 순서), `OTHER`와 표에 없는 코드는 "그 밖의 함정"으로 합쳐 맨 뒤. */
export function twistTags(counts: Record<string, number>): { name: string; count: number }[] {
  const known = TWIST_CODES.map((code, order) => ({ code, order, count: counts[code] ?? 0 })).filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order).map(x => ({ name: TWIST_WORDING[x.code].name, count: x.count }));
  const other = Object.entries(counts).filter(([code]) => !isTwistCode(code)).reduce((sum, [, n]) => sum + n, 0);
  return other > 0 ? [...known, { name: OTHER_TWIST_NAME, count: other }] : known;
}

/** 문항 카드의 걸린 함정. `twist`가 여러 개면 모두. OTHER·표에 없는 코드는 이름만 "그 밖의 함정"이고 한 줄 설명은 없다. 개발용 `twistDetail`은 쓰지 않는다. */
export function cardTwists(twist: ResultItem['twist']): { name: string; line: string | null; changed: string | null }[] {
  return (twist ?? []).map(t => isTwistCode(t.twistType)
    ? { name: TWIST_WORDING[t.twistType].name, line: TWIST_WORDING[t.twistType].line, changed: t.studentText }
    : { name: OTHER_TWIST_NAME, line: null, changed: t.studentText });
}
export function cardStepName(item: ResultItem): string | null {
  const step = item.thoughtDiagnosis?.status === 'ready' ? item.thoughtDiagnosis.firstFailedStep : null;
  return step !== null && step in STEP_WORDING ? STEP_WORDING[step as keyof typeof STEP_WORDING] : null;
}
/** 정답 문항의 질 문구(범주와 표시 단계로 고른다). 판정 중·오답은 null. */
export function answerQuality(item: Pick<ResultItem, 'category'>, tiers: QualityTiers = 3): string | null {
  switch (item.category) {
    case 'SUPPORTED_CORRECT': return tiers === 2 ? '근거가 확인되는 정답이야' : '근거도 정확했어';
    case 'WEAK_CORRECT': return tiers === 2 ? '근거가 확인되는 정답이야' : '정답이야. 근거는 조금 더 다듬을 수 있어';
    case 'ERROR_CORRECT': return '정답이지만 근거에 틀린 곳이 있어';
    case 'SURE_CORRECT': return '확실하다고 한 정답이야';
    case 'UNSURE_CORRECT': return '확신 없이 맞힌 정답이야';
    case 'UNVERIFIED': return '정답이야. 근거로 풀이를 확인하지는 못했어';
    case 'CHECKING': return '확인 중이야';
    default: return null;
  }
}
/** 근거 없는 응답 버튼 둘은 서로 배타적이다: 이미 눌린 버튼을 다시 누르면 꺼지고, 다른 버튼을 누르면 그쪽으로 바뀐다. */
export const toggleConfidence = (current: Confidence | null, pressed: Confidence): Confidence | null => current === pressed ? null : pressed;
/** 답 저장 요청의 근거·확신 부분. 버튼이 눌렸으면 근거 없음 + 그 확신 값, 아니면 근거 + null. */
export function answerPayload(confidence: Confidence | null, text: string): { rationale: { mode: 'OMITTED' } | { mode: 'PROVIDED'; text: string }; confidence: Confidence | null } {
  return confidence === null ? { rationale: { mode: 'PROVIDED', text }, confidence: null } : { rationale: { mode: 'OMITTED' }, confidence };
}
export const percentPair = (pair: readonly [number, number]): string => `${pair[0]}% · ${pair[1]}%`;
export const MEGASTUDY_NOTE = '메가스터디 이용자 기준 · 화법과작문 · 언어와매체';

// ---------- ③ 독해 패턴 ----------

export function sumCounts(readings: readonly { counts: ReadingCounts }[]): ReadingCounts {
  const sum: ReadingCounts = { layers: { 요지: { caught: 0, total: 0 }, 합성: { caught: 0, total: 0 }, 명제: { caught: 0, total: 0 } },
    branches: { 내용: { caught: 0, total: 0, wrong: 0 }, 논증: { caught: 0, total: 0, wrong: 0 }, 관점: { caught: 0, total: 0, wrong: 0 }, 흐름: { caught: 0, total: 0, wrong: 0 } } };
  for (const { counts } of readings) {
    for (const key of ['요지', '합성', '명제'] as const) { sum.layers[key].caught += counts.layers[key].caught; sum.layers[key].total += counts.layers[key].total; }
    for (const key of BRANCH_CODES) { sum.branches[key].caught += counts.branches[key].caught; sum.branches[key].total += counts.branches[key].total; sum.branches[key].wrong += counts.branches[key].wrong; }
  }
  return sum;
}
/** "문단 요지는 9곳 중 7곳, 묶음은 12곳 중 6곳, 세부 내용은 30곳 중 11곳을 잡았어." 분모가 0인 층은 뺀다. 모두 0이면 null. */
export function layerSentence(counts: ReadingCounts): string | null {
  const parts = ([['요지', '문단 요지는'], ['합성', '묶음은'], ['명제', '세부 내용은']] as const).filter(([key]) => counts.layers[key].total > 0)
    .map(([key, label]) => `${label} ${counts.layers[key].total}곳 중 ${counts.layers[key].caught}곳`);
  return parts.length === 0 ? null : `${parts.join(', ')}을 잡았어.`;
}
export interface BranchRow { code: BranchCode; name: string; line: string; caught: number; total: number; text: string; wrongText: string | null }
/** 관계 4갈래 행. `total = 0`인 갈래는 숨긴다. `wrong > 0`일 때만 틀리게 이은 곳을 붙인다. */
export function branchRows(counts: ReadingCounts): BranchRow[] {
  return BRANCH_CODES.filter(code => counts.branches[code].total > 0).map(code => {
    const { caught, total, wrong } = counts.branches[code];
    return { code, name: BRANCH_WORDING[code].name, line: BRANCH_WORDING[code].line, caught, total, text: `${total}곳 중 ${caught}곳을 잡았어`,
      wrongText: wrong > 0 ? `${wrong}곳은 지문과 다르게 이었어` : null };
  });
}
export const PENDING_TEXT = '분석 중';
export const FAILED_TEXT = '이 부분은 분석하지 못했어';
/** 요약과 틀린 문항 연결 문장. 지도 단위의 글은 쓰지 않고 문단 표시(서버 `paragraphLabel`, 예: "2·3문단", "(나) 3문단")만 쓴다. */
export function summaryLinkSentence(link: ResultSummaryLink, passageTitle: string, questionNumber: number): string {
  if (link.status === 'pending') return PENDING_TEXT;
  if (link.status === 'failed') return FAILED_TEXT;
  const head = `${passageTitle} ${questionNumber}번에서 확인해야 했던 ${link.paragraphLabel} 내용은`;
  if (link.kind === 'MISSED') return `${head} 요약에서 빠졌던 곳이야.`;
  if (link.kind === 'MISREAD') return `${head} 요약에서도 지문과 다르게 이해했던 곳이야.`;
  return `${head} 요약에서 잡았는데 문항에서는 틀렸어. 선지를 읽고 지문과 대조하는 쪽을 살펴볼 만해.`;
}

// ---------- 추천 ----------

export const RECOMMEND_FALLBACK = '어려운 문항으로 더 풀어 보면 좋아';
/** 추천 칸의 문장들. 비틂 문장만 있고, 세트 이름 문장은 대응표에 항목이 있을 때만 붙는다. */
export function recommendationLines(recommendation: ResultView['recommendation'], twistCounts: Record<string, number>): string[] {
  if (recommendation === null || !isTwistCode(recommendation.twistType)) return [RECOMMEND_FALLBACK];
  const name = TWIST_WORDING[recommendation.twistType].name; const count = twistCounts[recommendation.twistType] ?? 0;
  const lines = [count >= 2 ? `자주 걸린 함정: ${name}(${count}번)` : `이번에 걸린 함정: ${name}`];
  if (recommendation.setNames.length > 0) lines.push(`비슷한 구조의 지문으로 ${recommendation.setNames.join(', ')}${eulReul(recommendation.setNames.at(-1)!)} 풀어 보면 좋아.`);
  return lines;
}

// ---------- 문항 풀이 시간(인계 A 계약: solveMs에 근거 입력 시간 없음) ----------

export interface ItemTimer { solveMs: number; rationaleMs: number; since: number | null; inRationale: boolean }
export const newTimer = (): ItemTimer => ({ solveMs: 0, rationaleMs: 0, since: null, inRationale: false });
function flush(timer: ItemTimer, now: number): ItemTimer {
  if (timer.since === null) return timer;
  const elapsed = Math.max(0, now - timer.since);
  return timer.inRationale ? { ...timer, rationaleMs: timer.rationaleMs + elapsed, since: now } : { ...timer, solveMs: timer.solveMs + elapsed, since: now };
}
/** 문항이 화면에 보이기 시작할 때(다른 문항에서 돌아오거나 탭이 다시 보일 때). 이미 재는 중이면 그대로. */
export const startTimer = (timer: ItemTimer, now: number): ItemTimer => timer.since === null ? { ...timer, since: now } : timer;
/** 다른 문항으로 가거나 탭이 숨을 때. 지금까지를 더하고 멈춘다. */
export const stopTimer = (timer: ItemTimer, now: number): ItemTimer => ({ ...flush(timer, now), since: null });
/** 근거 칸에 포커스가 들어가거나 나올 때. 그 앞까지는 이전 칸에 더한다. */
export const focusRationale = (timer: ItemTimer, focused: boolean, now: number): ItemTimer => ({ ...flush(timer, now), inRationale: focused });
/** 서버로 보낼 값(0 이상 정수). 근거를 생략하면 rationaleMs는 null이다. */
export function timerValues(timer: ItemTimer, now: number, omitted: boolean): { solveMs: number; rationaleMs: number | null } {
  const t = flush(timer, now);
  return { solveMs: Math.max(0, Math.round(t.solveMs)), rationaleMs: omitted ? null : Math.max(0, Math.round(t.rationaleMs)) };
}

// ---------- 결과 화면 보조 ----------

/** 등급별 누적 상위 비율(%). 서버 위치 계산(`gradeOfPercentile`)과 같다. */
const TOP = [4, 11, 23, 40, 60, 77, 89, 96];
export function gradeOfPercentile(percentile: number): number {
  const index = TOP.findIndex(limit => 100 - percentile <= limit);
  return index < 0 ? 9 : index + 1;
}
/** 칸 하나라도 분석 중이면 true(결과 화면이 다시 받아 온다). 문항 검토 문항의 판정 칸은 숨겨져 있으므로 보지 않는다. */
export function hasPending(result: ResultView): boolean {
  return result.position.status === 'pending' || result.steps.status === 'pending' || result.reading.some(r => r.status === 'pending')
    || result.items.some(item => item.thoughtDiagnosis?.status === 'pending' || item.summaryLink?.status === 'pending' || (!item.review && item.judgment.status === 'pending'));
}
const SOURCE_LOCATION: Record<string, string> = { PASSAGE: '지문', SCENARIO: '보기', STEM: '발문', CHOICE: '선지' };
/** 원문 인용의 위치 이름. 공식 해설 같은 학생에게 보이지 않을 자리는 null(인용을 내지 않는다). */
export const sourceLocationName = (location: string): string | null => SOURCE_LOCATION[location] ?? null;
