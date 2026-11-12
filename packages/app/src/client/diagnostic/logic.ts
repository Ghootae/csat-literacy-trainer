/**
 * 진단평가 화면의 순수 계산(인계 B (4)·(5)): 문장 만들기, 정렬, 추천 고르기, 시간 누적.
 * 학생에게 보이는 문장은 반말이다(D-0116). 비틂·관계·단계 이름은 wording.ts에서만 온다.
 */
import { BRANCH_CODES, BRANCH_WORDING, OTHER_TWIST_NAME, STEP_CODES, STEP_WORDING, TWIST_CODES, TWIST_WORDING, type BranchCode, type TwistCode } from './wording.js';
import type { AnswerCategory, Confidence, QualityTiers, ReadingCounts, ResultItem, ResultSummaryLink, ResultView, SummaryCardItem, SummaryCardView } from './types.js';

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

// ---------- 범주 집계 ----------

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
// ---------- 지문 결과 화면(D-0218) ----------

/** 문제 버튼 색 무리. 색만으로 구분하지 않도록 `RESULT_GROUP_MARK`의 글자 표시를 함께 보인다. */
export type ResultGroup = 'good' | 'check' | 'wrong';
export function resultGroup(category: AnswerCategory): ResultGroup {
  return category === 'WRONG' ? 'wrong' : category === 'ERROR_CORRECT' ? 'check' : 'good';
}
export const RESULT_GROUP_MARK: Record<ResultGroup, string> = { good: '✓ 정답', check: '! 근거 확인', wrong: '✕ 오답' };
/** 정답률이 이보다 낮은 문제를 맞히면 "어려운 문제" 칭찬을 한다(두 선택과목 평균). */
export const HARD_CORRECT_RATE = 20;
const CATEGORY_NAME: Record<AnswerCategory, string> = { WRONG: '오답', SURE_CORRECT: '확신 정답', UNSURE_CORRECT: '잘 모르겠지만 정답', PENDING: '판정 중', CHECKING: '확인 중',
  UNVERIFIED: '판정 불가 정답', ERROR_CORRECT: '근거 오류 정답', SUPPORTED_CORRECT: '근거 명확 정답', WEAK_CORRECT: '근거 약한 정답' };

const ELIMINATION_PRAISE = '정답이 아닌 선지들을 잘 걸렀어.';
export interface ResultRow { description: string; button: { label: string; enabled: boolean }; analyzing: boolean }
/** 공개한 문항 한 줄의 결과 설명과 검토 버튼. 정답률은 메가스터디 수치, 오답은 같은 선지를 고른 비율이다(두 수치는 `percentPair`로). */
export function resultRow(item: SummaryCardItem, tiers: QualityTiers = 3): ResultRow {
  const rate = `정답률 ${percentPair(item.megastudy.correctRate)}`;
  if (item.category === 'WRONG') {
    const head = `오답(같은 선지를 고른 비율 ${percentPair(item.megastudy.chosenPercents)}).`;
    if (item.judging) return { description: head, button: { label: '분석 중', enabled: false }, analyzing: true };
    if (item.reviewDone) return { description: head, button: { label: '검토 완료했어. 수고했어', enabled: false }, analyzing: false };
    if (!item.reviewTarget) return { description: `${head} 이 문항은 우리가 한 번 더 확인해 볼게.`, button: { label: '확인해 볼게', enabled: false }, analyzing: false };
    return { description: head, button: { label: '아깝지만 정답이 아니야. 다시 검토해 보자.', enabled: true }, analyzing: false };
  }
  const head = `정답(${rate}).`;
  const done = { label: '검토 완료했어. 수고했어', enabled: false };
  const praise = (label: string) => ({ label, enabled: false });
  switch (item.category) {
    case 'SUPPORTED_CORRECT': {
      const hard = (item.megastudy.correctRate[0] + item.megastudy.correctRate[1]) / 2 < HARD_CORRECT_RATE;
      return { description: `${head} 근거도 명확했어.`, button: praise(hard ? '어려운 문제인데 정말 잘했어!' : '잘했어!'), analyzing: false };
    }
    // 최종 카드(`answerQuality`)와 같은 말을 한다. 소거법 정답은 근거를 쓰지 않았으므로 근거를 평가하지 않는다(D-0228 추가).
    case 'WEAK_CORRECT': return { description: `${head} ${item.elimination ? ELIMINATION_PRAISE : tiers === 2 ? '근거가 확인되는 정답이야.' : '근거는 조금 더 다듬을 수 있어.'}`, button: praise('잘했어!'), analyzing: false };
    case 'UNVERIFIED': return { description: `${head} 근거로 풀이를 확인하지는 못했어.`, button: praise('잘했어!'), analyzing: false };
    case 'SURE_CORRECT': return { description: `${head} 확신을 갖고 풀었어.`, button: praise('확신을 갖고 풀었구나. 대단해!'), analyzing: false };
    case 'UNSURE_CORRECT': return { description: `${head} 근거는 없었어.`, button: praise('맞혔어!'), analyzing: false };
    case 'ERROR_CORRECT':
      return { description: `${head} 근거에 문제가 있었어.`, button: item.reviewDone ? done : { label: '근거를 다시 검토해 보자', enabled: item.reviewTarget }, analyzing: false };
    case 'CHECKING': return { description: `${head} 근거는 한 번 더 확인해 볼게.`, button: { label: '확인 중', enabled: false }, analyzing: true };
    default: return { description: `${head} 아직 분석 중이야.`, button: { label: '분석 중', enabled: false }, analyzing: true };
  }
}
/** 개발자 모드(`?dev=1`)에서 줄 끝에 붙이는 내부 범주 표기. */
export const devCategoryText = (category: AnswerCategory, elimination = false): string => `(${category} · ${CATEGORY_NAME[category]}${elimination && category === 'WEAK_CORRECT' ? '-소거법' : ''})`;

/** "다음 지문" 버튼이 꺼져 있을 때 이유 한 줄. 켜져 있으면 null. */
export function finishHint(card: Pick<SummaryCardView, 'canFinish' | 'judging' | 'items'>): string | null {
  if (card.canFinish) return null;
  if (card.judging > 0) return '분석이 끝나면 넘어갈 수 있어.';
  const left = card.items.filter(item => item.reviewTarget && !item.reviewDone).length;
  return left > 0 ? `다시 검토할 문제가 ${left}개 남았어.` : null;
}

/**
 * 등급 띠 그라데이션(D-0219): 9개 등급 확률을 각 등급 칸 가운데의 진하기(최댓값 기준 0.06~1)로 두고,
 * 이웃 가운데 사이를 코사인 곡선으로 이어 꺾임 없이 잇는다. 칸 가운데의 진하기는 그 등급 확률 그대로이고,
 * 곡선은 두 값 사이를 벗어나지 않는다. 첫·끝 칸 가운데 바깥은 그 값으로 평평하다.
 */
export function gradeGradient(probabilities: readonly number[], rgb = '42, 79, 204', steps = 8): string {
  const max = Math.max(...probabilities, 1e-9);
  const alpha = (p: number) => 0.06 + 0.94 * p / max;
  const n = probabilities.length;
  const stop = (a: number, at: number) => `rgba(${rgb}, ${a.toFixed(3)}) ${(at / n * 100).toFixed(2)}%`;
  const stops: string[] = [stop(alpha(probabilities[0]!), 0.5)];
  for (let i = 0; i + 1 < n; i++) {
    const from = alpha(probabilities[i]!); const to = alpha(probabilities[i + 1]!);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps; const w = (1 - Math.cos(Math.PI * t)) / 2;
      stops.push(stop(from + (to - from) * w, i + 0.5 + t));
    }
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
/** 제목 아래 한 줄: "3등급일 확률이 35%로 가장 높아". 반올림한 퍼센트가 최빈 등급과 같은 등급이 더 있으면 함께 쓴다. */
export function gradeSentence(probabilities: readonly number[], mode: number): string {
  const percents = probabilities.map(p => Math.round(p * 100));
  const top = percents[mode - 1]!;
  const tied = percents.flatMap((p, i) => (p === top ? [i + 1] : []));
  if (!tied.includes(mode)) tied.push(mode);
  tied.sort((a, b) => a - b);
  if (tied.length === 1) return `${mode}등급일 확률이 ${top}%로 가장 높아`;
  return `${tied.slice(0, -1).join('등급, ')}등급과 ${tied.at(-1)}등급일 확률이 각각 ${top}%로 가장 높아`;
}
/**
 * 띠 위 확률 곡선(D-0225): 가로는 띠와 같은 등급 축(0~width), 등급 칸 가운데의 높이 = 그 등급 확률(최댓값이 맨 위),
 * 이웃 가운데 사이는 띠 진하기와 같은 코사인 곡선으로 잇는다. SVG path `d`를 낸다(y는 아래로 증가, 바닥 = height).
 */
export function gradeCurvePath(probabilities: readonly number[], width = 900, height = 60, top = 4, steps = 12): string {
  const max = Math.max(...probabilities, 1e-9);
  const n = probabilities.length;
  const y = (p: number) => height - (height - top) * p / max;
  const point = (at: number, value: number) => `${(at / n * width).toFixed(1)},${value.toFixed(1)}`;
  const parts = [`M${point(0.5, y(probabilities[0]!))}`];
  for (let i = 0; i + 1 < n; i++) {
    const from = y(probabilities[i]!); const to = y(probabilities[i + 1]!);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps; const w = (1 - Math.cos(Math.PI * t)) / 2;
      parts.push(`L${point(i + 0.5 + t, from + (to - from) * w)}`);
    }
  }
  return parts.join(' ');
}
/** 띠 위 가로 위치(0~1) → 그 지점이 속한 정수 등급(1~9). */
export function gradeAtFraction(fraction: number): number {
  return Math.min(9, Math.max(1, Math.floor(fraction * 9) + 1));
}

// ---------- ① 내 위치 ----------

export const POSITION_NOTE = '시간 제한 없이 근거를 쓰며 푼 결과를 수능 응시자 분포에 맞춰 환산해 본 추정치야. 문항 난이도는 메가스터디 이용자 정답률로 정했어.';

// ---------- ② 문제 풀이 결과 ----------

export interface SolveStats { correct: number; total: number; accurate: number; qualityDenominator: number; sure: number; unsure: number; unverified: number; eliminated: number }
/** 숫자 칸. 근거까지 정확한 정답(2단계면 근거가 확인되는 정답) / 근거를 판정한 정답(범주 1·2·3)과, 분모에 넣지 않는 범주 4·5·`UNVERIFIED`·소거법 정답 개수. 소거법 정답은 근거를 쓰지 않았으므로 분자·분모에서 빼고 따로 센다(D-0228 추가 2). */
export function solveStats(items: readonly ResultItem[], total = 16, tiers: QualityTiers = 3): SolveStats {
  const isEliminated = (item: ResultItem) => item.category === 'WEAK_CORRECT' && item.elimination;
  const t = categoryTally(countCategories(items.filter(item => !isEliminated(item))), tiers);
  return { correct: items.filter(item => item.correct).length, total, accurate: t.accurate, qualityDenominator: t.denominator, sure: t.sure, unsure: t.unsure, unverified: t.unverified,
    eliminated: items.filter(isEliminated).length };
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
export function answerQuality(item: Pick<ResultItem, 'category'> & { elimination?: boolean }, tiers: QualityTiers = 3): string | null {
  if (item.category === 'WEAK_CORRECT' && item.elimination === true) return `정답이야. ${ELIMINATION_PRAISE.replace(/\.$/, '')}`;
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
/** 답 저장 요청의 근거·확신 부분. 근거 미입력 버튼의 확신이 있으면 근거 없음 + 그 확신 값(소거법은 입력창 글을 메모로), 아니면 근거 + null. */
export function answerPayload(confidence: Confidence | null, text: string, eliminationNote: string | null = null): { rationale: { mode: 'OMITTED' } | { mode: 'PROVIDED'; text: string }; confidence: Confidence | null; eliminationNote?: string | null } {
  if (confidence === null) return { rationale: { mode: 'PROVIDED', text }, confidence: null };
  return confidence === 'ELIMINATION' ? { rationale: { mode: 'OMITTED' }, confidence, eliminationNote } : { rationale: { mode: 'OMITTED' }, confidence };
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
  const lines = [count >= 2 ? `자주 고른 오답 선지의 함정: ${name}(${count}번)` : `이번에 고른 오답 선지의 함정: ${name}`];
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

/** 칸 하나라도 분석 중이면 true(결과 화면이 다시 받아 온다). 문항 검토 문항의 판정 칸은 숨겨져 있으므로 보지 않는다. */
export function hasPending(result: ResultView): boolean {
  return result.position.status === 'pending' || result.steps.status === 'pending' || result.reading.some(r => r.status === 'pending')
    || result.items.some(item => item.thoughtDiagnosis?.status === 'pending' || item.summaryLink?.status === 'pending' || (!item.review && item.judgment.status === 'pending'));
}
const SOURCE_LOCATION: Record<string, string> = { PASSAGE: '지문', SCENARIO: '보기', STEM: '발문', CHOICE: '선지' };
/** 원문 인용의 위치 이름. 공식 해설 같은 학생에게 보이지 않을 자리는 null(인용을 내지 않는다). */
export const sourceLocationName = (location: string): string | null => SOURCE_LOCATION[location] ?? null;
