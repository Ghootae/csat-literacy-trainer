/**
 * 진단평가 화면의 순수 계산(인계 B (4)·(5)): 문장 만들기, 정렬, 추천 고르기, 시간 누적.
 * 학생에게 보이는 문장은 반말이다(D-0116). 비틂·관계·단계 이름은 wording.ts에서만 온다.
 */
import { BRANCH_CODES, BRANCH_WORDING, OTHER_TWIST_NAME, TWIST_WORDING, type BranchCode, type TwistCode } from './wording.js';
import type { AnswerCategory, Confidence, QualityTiers, ReadingCase, ReadingCounts, ResultItem, ResultSummaryLink, ResultView, SummaryCardItem, SummaryCardView } from './types.js';

export const CIRCLED = '①②③④⑤';
/** ①~⑤ 뒤에 붙는 조사(일·이·삼·사·오). 을/를. */
const OBJECT_PARTICLE = ['을', '를', '을', '를', '를'];
export const circled = (position: number): string => CIRCLED[position - 1] ?? String(position);
export const circledObject = (position: number): string => `${circled(position)}${OBJECT_PARTICLE[position - 1] ?? '을'}`;

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

/** 맨 위 요약의 "근거까지 맞은 정답": 소거법 정답은 근거를 쓰지 않았으므로 세지 않는다(D-0228 추가 2). 2단계 표시면 근거가 확인되는 정답. */
export function accurateCorrect(items: readonly ResultItem[], tiers: QualityTiers = 3): number {
  return categoryTally(countCategories(items.filter(item => !(item.category === 'WEAK_CORRECT' && item.elimination))), tiers).accurate;
}

/** 분해 막대의 칸 하나. `items`가 칸의 너비(문항 수)이고 칸 안에 문항 번호가 들어간다. `gray`는 판정을 확인하지 못한 정답 칸이다. */
export interface BreakdownCell { key: string; label: string; items: ResultItem[]; gray?: boolean }
export interface Breakdown { total: number; correct: number; wrong: number; row2: { correct: BreakdownCell[]; wrong: BreakdownCell[] }; row3: { correct: BreakdownCell[]; wrong: BreakdownCell[] } }
const isEliminationCorrect = (item: ResultItem) => item.category === 'WEAK_CORRECT' && item.elimination;
/** 정답 문항의 3줄째 칸. 판정 중·검토 중·판정 불가는 회색 "확인 중" 칸 하나로 모은다. */
function correctCell(item: ResultItem, tiers: QualityTiers): { key: string; label: string; gray?: boolean } {
  if (item.review || item.category === 'PENDING' || item.category === 'CHECKING' || item.category === 'UNVERIFIED') return { key: 'checking', label: '확인 중', gray: true };
  if (item.category === 'SURE_CORRECT') return { key: 'sure', label: '확실' };
  if (item.category === 'UNSURE_CORRECT') return { key: 'unsure', label: '확신 없이' };
  if (isEliminationCorrect(item)) return { key: 'elimination', label: '소거법' };
  if (tiers === 2) return item.category === 'ERROR_CORRECT' ? { key: 'other', label: '그 밖' } : { key: 'accurate', label: '근거가 확인되는 정답' };
  return item.category === 'SUPPORTED_CORRECT' ? { key: 'accurate', label: '근거까지 정확' } : { key: 'weak', label: '부족·틀린 근거' };
}
const CORRECT_CELL_ORDER = ['accurate', 'weak', 'other', 'sure', 'unsure', 'elimination', 'checking'];
function groupCells(items: readonly ResultItem[], keyOf: (item: ResultItem) => { key: string; label: string; gray?: boolean }, order: readonly string[]): BreakdownCell[] {
  const cells = new Map<string, BreakdownCell>();
  for (const item of items) {
    const { key, label, gray } = keyOf(item);
    const cell = cells.get(key) ?? { key, label, items: [], ...(gray ? { gray } : {}) };
    cell.items.push(item); cells.set(key, cell);
  }
  return [...cells.values()].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}
/** 오답 쪽 3줄째: 문항마다 한 칸. 2줄째(근거 쓰고 틀림 → 근거 없이 틀림)와 위치가 맞도록 근거 쓴 문항 먼저, 같은 묶음 안에서는 문항 번호 순. */
function wrongRow3(wrong: readonly ResultItem[]): BreakdownCell[] {
  const rank = (item: ResultItem) => item.rationale === 'PROVIDED' ? 0 : 1;
  return [...wrong].sort((a, b) => rank(a) - rank(b) || a.questionNumber - b.questionNumber).map(item => ({ key: item.questionId, label: '', items: [item] }));
}
/** 문제 풀이 분해 막대(설계 2절): 1줄 정답|오답, 2줄 근거 쓴 여부, 3줄 정답 쪽은 정답의 질, 오답 쪽은 문항마다 한 칸. 칸 너비는 문항 수에 비례한다. */
export function breakdown(items: readonly ResultItem[], total: number, tiers: QualityTiers = 3): Breakdown {
  const right = items.filter(item => item.correct); const wrong = items.filter(item => !item.correct);
  const byRationale = (item: ResultItem, correct: boolean) => item.rationale === 'PROVIDED'
    ? { key: 'provided', label: correct ? '근거를 쓴 정답' : '근거 쓰고 틀림' } : { key: 'omitted', label: correct ? '근거 없이 낸 정답' : '근거 없이 틀림' };
  return { total, correct: right.length, wrong: wrong.length,
    row2: { correct: groupCells(right, item => byRationale(item, true), ['provided', 'omitted']), wrong: groupCells(wrong, item => byRationale(item, false), ['provided', 'omitted']) },
    row3: { correct: groupCells(right, item => correctCell(item, tiers), CORRECT_CELL_ORDER), wrong: wrongRow3(wrong) } };
}

// ---------- 카드: 글 조각 ----------

export interface TextSegment { text: string; bold: boolean }
/** 글에서 인용 구절을 찾아 굵게 할 조각으로 나눈다. 글에 없는 구절은 건너뛴다. */
export function boldQuotes(text: string, quotes: readonly string[]): TextSegment[] {
  const ranges = quotes.filter(quote => quote !== '').map(quote => ({ start: text.indexOf(quote), length: quote.length })).filter(range => range.start >= 0)
    .map(range => [range.start, range.start + range.length] as [number, number]).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) { const last = merged.at(-1); if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]); else merged.push([...range]); }
  const segments: TextSegment[] = []; let at = 0;
  for (const [start, end] of merged) { if (start > at) segments.push({ text: text.slice(at, start), bold: false }); segments.push({ text: text.slice(start, end), bold: true }); at = end; }
  if (at < text.length) segments.push({ text: text.slice(at), bold: false });
  return segments.length === 0 ? [{ text, bold: false }] : segments;
}
/** `**굵게**` 표시를 조각으로 나눈다(표시가 짝이 맞지 않으면 남은 글은 그대로 둔다). */
export function parseBold(text: string): TextSegment[] {
  return text.split('**').map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter(segment => segment.text !== '');
}
/** 읽기 습관 상자 출처 줄의 위치 이름: 선지 ③ / 지문 / 〈보기〉. */
export const habitSourceName = (sourceKind: 'CHOICE' | 'PASSAGE' | 'SCENARIO', choicePosition: number | null): string =>
  sourceKind === 'CHOICE' ? `선지 ${circled(choicePosition ?? 0)}` : sourceKind === 'PASSAGE' ? '지문' : '〈보기〉';
/** 선지 전문 가운데 인용 구절 앞뒤 `pad`글자만 남긴 조각("… 구절 …"). 글에 구절이 없으면 구절만 굵게 낸다. */
export function excerptAround(text: string, quote: string, pad = 16): TextSegment[] {
  const start = text.indexOf(quote);
  if (start < 0 || quote === '') return [{ text: quote, bold: true }];
  const end = start + quote.length;
  const before = text.slice(Math.max(0, start - pad), start); const after = text.slice(end, end + pad);
  return [{ text: `${start - pad > 0 ? '… ' : ''}${before}`, bold: false }, { text: quote, bold: true }, { text: `${after}${end + pad < text.length ? ' …' : ''}`, bold: false }];
}

const SYMBOL = /[\u3260-\u327b\u24d0-\u24e9]|\([가-하]\)/gu;
/** 글 속 기호(㉠·㉮·ⓐ·(가) 등)가 처음 나올 때 최소 풀이를 붙인다: `ⓑ(후보 초청 제한이 위헌이라는 소수 의견)`, 괄호 기호는 `(가)[…]`. 사전에 없는 기호는 그대로 둔다. `seen`은 한 카드 안에서 이어 쓴다. */
export function annotateSymbols(text: string, gloss: Readonly<Record<string, string>>, seen: Set<string>): string {
  return text.replace(SYMBOL, symbol => {
    const meaning = gloss[symbol];
    if (meaning === undefined || seen.has(symbol)) return symbol;
    seen.add(symbol);
    return symbol.startsWith('(') ? `${symbol}[${meaning}]` : `${symbol}(${meaning})`;
  });
}
/** 기호 풀이를 조각마다 이어서 붙인다(굵게 표시는 그대로). */
export const annotateSegments = (segments: readonly TextSegment[], gloss: Readonly<Record<string, string>>, seen: Set<string>): TextSegment[] =>
  segments.map(segment => ({ ...segment, text: annotateSymbols(segment.text, gloss, seen) }));

/** 오답 카드의 함정 짝에 쓰는 비틂: 적절하지 않은 것 고르기에서 놓친 정답 선지의 것이면 `answerTwist`, 아니면 고른 선지의 `twist`. */
export function twistsForPairs(item: ResultItem): ResultItem['twist'] { return item.stemPolarity === 'SELECT_INCORRECT' ? item.answerTwist : item.twist; }
/** 학생에게 낼 비틂 머리말(작은 글씨 전용: 이름만 단독으로 내지 않는다). */
export const twistName = (twistType: string): string => (twistType in TWIST_WORDING ? TWIST_WORDING[twistType as TwistCode].name : OTHER_TWIST_NAME);
export const hasPair = (twist: { choiceQuote: string; evidenceQuote: string }): boolean => twist.choiceQuote !== '' && twist.evidenceQuote !== '';

/** 긴 글을 `limit`글자에서 줄인다(맨 위 요약 상자용). */
export const clip = (text: string, limit = 120): string => { const chars = Array.from(text.trim()); return chars.length <= limit ? text.trim() : `${chars.slice(0, limit).join('').trimEnd()}…`; };

export const SELF_CHECK_CHOICES = ['선지 내용을 잘못 이해했어', '지문 내용을 잘못 기억했어', '찍었어'] as const;

// ---------- 맨 위 요약: 가장 먼저 볼 것 ----------

export interface CaseEntry { passageId: string; index: number; case: ReadingCase }
export type FirstLook = { kind: 'item'; item: ResultItem } | { kind: 'case'; entry: CaseEntry };
/** 요약에서 모은 사례의 모든 지문 합. 순서는 지문, 문단, 관계 순이다. */
export function caseEntries(reading: ResultView['reading']): CaseEntry[] {
  return reading.filter(r => r.status === 'ready').flatMap(r => r.cases.map((found, index) => ({ passageId: r.passageId, index, case: found })));
}
/**
 * "가장 먼저 볼 것" 하나(설계 8절, 묶음이 없을 때): ① 학생 근거가 있는 오답 중 선지 연결 짝이 있는 문항 → ② 요약에서 다르게 이은 곳
 * → ③ 근거가 부족한 정답. 같은 순위 안에서는 지문·문항 순서가 앞선 것. 하나도 없으면 null.
 */
export function pickFirstLook(items: readonly ResultItem[], reading: ResultView['reading']): FirstLook | null {
  const checked = items.filter(item => !item.review);
  const wrong = checked.find(item => !item.correct && item.evidence?.student != null && (twistsForPairs(item) ?? []).some(hasPair));
  if (wrong) return { kind: 'item', item: wrong };
  const misread = caseEntries(reading).find(entry => entry.case.kind === 'CONTRADICTS');
  if (misread) return { kind: 'case', entry: misread };
  const weak = checked.find(item => item.correct && !isEliminationCorrect(item) && (item.category === 'WEAK_CORRECT' || item.category === 'ERROR_CORRECT') && item.evidence?.student != null);
  return weak ? { kind: 'item', item: weak } : null;
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
export const percentPair = (pair: readonly [number, number]): string => `화작 ${pair[0]}% · 언매 ${pair[1]}%`;
export const MEGASTUDY_NOTE = '메가스터디 이용자 기준';

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
export interface LayerRow { key: '요지' | '합성'; name: string; caught: number; total: number }
/** 점수 칸 둘: 문단 요지와 내용 묶음. 세부 내용(명제)은 점수 칸이 아니라 `detailLine`으로 낮춘다(설계 7절). */
export function layerRows(counts: ReadingCounts): LayerRow[] {
  return ([['요지', '문단 요지'], ['합성', '내용 묶음']] as const).map(([key, name]) => ({ key, name, caught: counts.layers[key].caught, total: counts.layers[key].total }));
}
/** "참고 · 요약에 함께 담은 세부 내용 n곳 (지문 전체 m곳). …" 판단한 세부가 없으면 null. */
export function detailLine(counts: ReadingCounts): string | null {
  const { caught, total } = counts.layers.명제;
  return total === 0 ? null : `참고 · 요약에 함께 담은 세부 내용 ${caught}곳 (지문 전체 ${total}곳). 요약은 세부를 추려 내는 일이라 이 수가 적다고 모자란 건 아니야.`;
}
export interface BranchRow { code: BranchCode; name: string; line: string; caught: number; total: number; wrong: number; text: string }
/** 관계 4갈래 행. 네 갈래 모두 같은 틀로 "m곳 중 n곳 · k곳 다르게"를 낸다. */
export function branchRows(counts: ReadingCounts): BranchRow[] {
  return BRANCH_CODES.map(code => {
    const { caught, total, wrong } = counts.branches[code];
    return { code, name: BRANCH_WORDING[code].name, line: BRANCH_WORDING[code].line, caught, total, wrong, text: `${total}곳 중 ${caught}곳 · ${wrong}곳 다르게` };
  });
}
/** 한 갈래의 사례: 다르게 이은 곳(CONTRADICTS)을 앞에, 같은 종류 안에서는 지문·문단 순서를 그대로. */
export function casesOfBranch(entries: readonly CaseEntry[], code: BranchCode): CaseEntry[] {
  const own = entries.filter(entry => entry.case.branch === code);
  return [...own.filter(entry => entry.case.kind === 'CONTRADICTS'), ...own.filter(entry => entry.case.kind !== 'CONTRADICTS')];
}
export const caseAnchor = (entry: CaseEntry): string => `diag-case-${entry.passageId}-${entry.index}`;
/** 사례 상자 머리말: "다르게 이음 · 지문 이름 (나) 3문단 · 대상 사이의 관계". 관계 유형 이름은 갈래 이름을 쓴다(유형별 학생용 이름은 아직 없다). */
export const caseHeading = (found: ReadingCase, passageTitle: string): string =>
  `${found.kind === 'CONTRADICTS' ? '다르게 이음' : '빠뜨림'} · ${passageTitle} ${found.paragraphLabel} · ${BRANCH_WORDING[found.branch].name}`;
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

/** 추천 칸: 실수 묶음 기반 문구는 2단계에서 위에 붙는다. 지금은 서비스 안내 한 줄뿐이다. */
export const SERVICE_NOTE = '매 지문 이런 분석을 받으며 훈련할 수 있어.';

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

/** 화면에 보이는 칸 하나라도 분석 중이면 true(결과 화면이 다시 받아 온다). 문항 검토 문항의 판정 칸은 숨겨져 있으므로 보지 않는다. 사고 진단·단계 집계는 화면에 내지 않으므로 보지 않는다. */
export function hasPending(result: ResultView): boolean {
  return result.position.status === 'pending' || result.readingHabit.status === 'pending' || result.reading.some(r => r.status === 'pending')
    || result.items.some(item => item.summaryLink?.status === 'pending' || (!item.review && item.judgment.status === 'pending'));
}
const SOURCE_LOCATION: Record<string, string> = { PASSAGE: '지문', SCENARIO: '보기', STEM: '발문', CHOICE: '선지' };
/** 원문 인용의 위치 이름. 공식 해설 같은 학생에게 보이지 않을 자리는 null(인용을 내지 않는다). */
export const sourceLocationName = (location: string): string | null => SOURCE_LOCATION[location] ?? null;
