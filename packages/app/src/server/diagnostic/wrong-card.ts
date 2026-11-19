/**
 * 결과 ② 문항 카드의 3층 생성(인계 docs/handoffs/2026-11-20-wrong-card-3-layer-impl.md).
 * 입력 만들기·코드 검사·"그래서" 제거·모델 호출·응답 모양을 모은다. 참가자 상태와 백그라운드 작업은 controller.ts가 맡는다.
 * 입력 만들기·코드 검사·"그래서" 제거는 실험 코드(docs/experiments/wrong-card-layer1-2026-11-19/run.mjs)를 옮긴 것이다.
 */
import { z } from 'zod/v4';
import { THOUGHT_DIAGNOSIS_MODEL, type FeedbackTransport } from '@csat/pipeline';
import { READING_HABIT_MAX_OUTPUT_TOKENS, READING_HABIT_TIMEOUT_MS, type HabitCallMetadata } from './reading-habit.js';

export type WrongCardCase = 'WRONG_PROVIDED' | 'WRONG_OMITTED' | 'WRONG_TRUE_CHOSEN' | 'CORRECT_WEAK';

// ---------- 모델 응답 모양 ----------

export const WrongCardOutputSchema = z.object({
  layer1: z.string(),
  symbolGlosses: z.array(z.object({ symbol: z.string(), gloss: z.string() })).default([]),
  pair: z.object({ top: z.string(), source: z.string(), sourceFocus: z.string(), conclusion: z.string() }),
  missedAnswer: z.object({ text: z.string(), source: z.string() }).optional(),
  examinerIntent: z.string(),
  /** 내부 기록용. 응답에 넣지 않는다(저장만). */
  matchesTrap: z.boolean().optional(),
  selfCheckOptions: z.array(z.string()).optional(),
});
export type WrongCardOutput = z.infer<typeof WrongCardOutputSchema>;

// ---------- 입력(run.mjs의 buildInput 출력과 같은 모양) ----------

export interface WrongCardTwist { twistDetail: string; choiceQuote: string; evidenceQuote: string | null }
export interface WrongCardInput {
  case: WrongCardCase;
  item: { title: string; number: number };
  stem: string;
  stemPolarity: 'SELECT_CORRECT' | 'SELECT_INCORRECT';
  chosen: { position: number; text: string };
  answer: { position: number; text: string };
  studentRationale?: string;
  rationaleJudgment?: string;
  chosenTwists?: WrongCardTwist[];
  answerTwists?: WrongCardTwist[];
  passage: string;
  examinerStrategy?: string;
  symbols: { symbol: string; location?: string; anchorText?: string; dictionaryGloss?: string }[];
  megastudy: { subjects: string[]; choiceRate: [number, number]; correctRate: [number, number] };
}

/** 입력 재료. 컨트롤러가 참가자 상태와 문항 묶음에서 모아 준다. */
export interface WrongCardSource {
  title: string; number: number;
  stem: string; scenario: string; passage: string;
  textAnnotations: readonly { marker: string; location: string; text: string }[];
  stemPolarity: 'SELECT_CORRECT' | 'SELECT_INCORRECT';
  chosen: { position: number; text: string }; answer: { position: number; text: string };
  correct: boolean;
  /** 첫 응답의 근거. 근거를 생략했으면 null. */
  firstRationale: string | null;
  /** 첫 선택 판정의 contentAssessment(정답 카드만 쓴다). */
  rationaleJudgment: string | null;
  chosenTwists: readonly { twistDetail: string; choiceQuote: string; evidenceQuote: string }[];
  answerTwists: readonly { twistDetail: string; choiceQuote: string; evidenceQuote: string }[];
  /** 출제자 전략 글(문단 목록). 그 선지 것이 없으면 null. */
  strategyParagraphs: readonly string[] | null;
  symbolGloss: Readonly<Record<string, string>>;
  megastudy: { subjects: readonly string[]; choicePercents: readonly [readonly number[], readonly number[]]; correctRate: readonly [number, number] };
}

const SYMBOL = /[㉠-㉿ⓐ-ⓩ]|\([가-힣]\)/gu;
const toTwist = (t: { twistDetail: string; choiceQuote: string; evidenceQuote: string }): WrongCardTwist => ({ twistDetail: t.twistDetail, choiceQuote: t.choiceQuote, evidenceQuote: t.evidenceQuote === '' ? null : t.evidenceQuote });

/** case는 코드가 정한다. */
export function decideCase({ correct, omitted, stemPolarity }: { correct: boolean; omitted: boolean; stemPolarity: 'SELECT_CORRECT' | 'SELECT_INCORRECT' }): WrongCardCase {
  if (correct) return 'CORRECT_WEAK';
  if (stemPolarity === 'SELECT_INCORRECT') return 'WRONG_TRUE_CHOSEN';
  return omitted ? 'WRONG_OMITTED' : 'WRONG_PROVIDED';
}

export function buildWrongCardInput(s: WrongCardSource): WrongCardInput {
  const caseName = decideCase({ correct: s.correct, omitted: s.firstRationale === null, stemPolarity: s.stemPolarity });
  // 적절하지 않은 것 고르기는 학생이 놓친 정답 선지의 비틂, 그 밖의 오답은 고른 선지의 비틂을 준다. 정답 카드는 비틂이 없다.
  const twistFields = caseName === 'WRONG_TRUE_CHOSEN' ? { answerTwists: s.answerTwists.map(toTwist) } : caseName === 'CORRECT_WEAK' ? {} : { chosenTwists: s.chosenTwists.map(toTwist) };
  const scan = [s.stem, s.chosen.text, s.answer.text, s.firstRationale ?? ''].join('\n');
  const symbols = [...new Set(scan.match(SYMBOL) ?? [])].map(symbol => {
    const anchor = s.textAnnotations.find(a => a.marker === symbol);
    return { symbol, ...(anchor ? { location: anchor.location, anchorText: anchor.text } : {}), ...(s.symbolGloss[symbol] ? { dictionaryGloss: s.symbolGloss[symbol] } : {}) };
  });
  const rate = (i: number): [number, number] => [s.megastudy.choicePercents[0][i - 1]!, s.megastudy.choicePercents[1][i - 1]!];
  const strategy = caseName === 'CORRECT_WEAK' ? null : s.strategyParagraphs;
  return {
    case: caseName, item: { title: s.title, number: s.number }, stem: s.stem, stemPolarity: s.stemPolarity,
    chosen: s.chosen, answer: s.answer,
    ...(s.firstRationale === null ? {} : { studentRationale: s.firstRationale }),
    ...(caseName === 'CORRECT_WEAK' && s.rationaleJudgment !== null ? { rationaleJudgment: s.rationaleJudgment } : {}),
    ...twistFields, passage: s.passage, ...(strategy ? { examinerStrategy: strategy.join('\n\n') } : {}),
    symbols, megastudy: { subjects: [...s.megastudy.subjects], choiceRate: rate(s.chosen.position), correctRate: [s.megastudy.correctRate[0], s.megastudy.correctRate[1]] },
  };
}

// ---------- 코드 검사(PROMPT-v1.3 "코드 검사") ----------

const FORBIDDEN = ['뒤집기', '비틂', '함정 유형', '조건 축소', '범위', '방향', '긍정·부정', '인과 왜곡', '상식 개입'];
const LAYER_SYMBOL_PAREN = /[㉠-㉿ⓐ-ⓩ]\s*\(|\([가-힣]\)\s*\(/u;
/** `conclusion`이 "그래서"로 시작하면 코드가 지운다(화면 칸 이름이 "그래서"). 지운 사실은 기록한다. */
const LEADING_SO = /^\s*그래서[\s,，:：]*/u;
export function stripLeadingSo(out: WrongCardOutput): { out: WrongCardOutput; stripped: boolean; before?: string } {
  if (!LEADING_SO.test(out.pair.conclusion)) return { out, stripped: false };
  return { out: { ...out, pair: { ...out.pair, conclusion: out.pair.conclusion.replace(LEADING_SO, '') } }, stripped: true, before: out.pair.conclusion };
}

/** 금지어 중 본문에 나오고, 지문·발문·선지(고른 선지·정답 선지)에 그대로 나오지 않는 것. 거기 그대로 있는 낱말(예: "오차 범위")은 예외다. */
export function forbiddenHits(bodies: readonly string[], input: Pick<WrongCardInput, 'passage' | 'stem' | 'chosen' | 'answer'>): string[] {
  const given = [input.passage, input.stem, input.chosen.text, input.answer.text];
  return FORBIDDEN.filter(w => bodies.some(b => b.includes(w)) && !given.some(g => g.includes(w)));
}

export interface WrongCardCheck { name: string; ok: boolean; detail?: string }
export function codeChecks(out: WrongCardOutput, input: WrongCardInput): WrongCardCheck[] {
  const checks: WrongCardCheck[] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, ...(ok || detail === undefined ? {} : { detail }) });
  const passage = input.passage; const noBold = (s: string) => s.replaceAll('**', '');
  add('pair.source가 지문에 글자 그대로 있다', passage.includes(out.pair.source), out.pair.source);
  add('pair.sourceFocus가 pair.source 안에 있다', out.pair.source.includes(out.pair.sourceFocus), out.pair.sourceFocus);
  if (input.case === 'WRONG_TRUE_CHOSEN') add('missedAnswer.source가 지문에 글자 그대로 있다', out.missedAnswer !== undefined && passage.includes(out.missedAnswer.source), out.missedAnswer?.source);
  const base = input.studentRationale ?? input.chosen.text;
  add(input.studentRationale === undefined ? 'pair.top(**제외)이 고른 선지에 글자 그대로 있다' : 'pair.top(**제외)이 학생 근거에 글자 그대로 있다', base.includes(noBold(out.pair.top)), out.pair.top);
  const bodies = [out.layer1, out.pair.top, out.pair.source, out.pair.conclusion, out.missedAnswer?.text, out.missedAnswer?.source, out.examinerIntent].map(s => s ?? '');
  const hits = forbiddenHits(bodies, input);
  add('금지어(규칙 4)가 없다', hits.length === 0, hits.join(', '));
  add('근거 없는 오답이면 selfCheckOptions가 정확히 3개다', !(input.case !== 'CORRECT_WEAK' && input.studentRationale === undefined) || out.selfCheckOptions?.length === 3, `${out.selfCheckOptions?.length ?? 0}개`);
  add('1층이 130자 이내다', out.layer1.length <= 130, `${out.layer1.length}자`);
  const missing = out.symbolGlosses.filter(g => !out.layer1.includes(g.symbol)).map(g => g.symbol);
  add('symbolGlosses의 기호가 모두 1층에 나온다', missing.length === 0, missing.join(', '));
  const layer23 = [out.pair.top, out.pair.source, out.pair.conclusion, out.missedAnswer?.text, out.missedAnswer?.source, out.examinerIntent].map(s => s ?? '');
  add('2·3층에 "기호(" 형태가 없다', !layer23.some(b => LAYER_SYMBOL_PAREN.test(b)), layer23.filter(b => LAYER_SYMBOL_PAREN.test(b)).join(' | '));
  return checks;
}

// ---------- 모델 호출 ----------

export interface WrongCardAttempt {
  attempt: number;
  /** 모델이 낸 JSON 그대로(읽지 못했으면 null). */
  rawOutput: unknown | null;
  /** "그래서"를 지운 뒤의 출력(검사 대상). 읽지 못했으면 null. */
  output: WrongCardOutput | null;
  conclusionStrippedLeadingSo?: string;
  checks: WrongCardCheck[];
  passed: boolean;
  error?: string;
  metadata?: HabitCallMetadata;
}

/** 한 번 부르고 코드펜스를 벗겨 JSON으로 읽고 모양을 검사한 뒤 "그래서"를 지우고 코드 검사한다. 어느 단계든 실패하면 passed=false인 시도를 돌려준다(던지지 않는다). */
export async function attemptWrongCard(transport: FeedbackTransport, instructions: string, input: WrongCardInput, attempt: number): Promise<WrongCardAttempt> {
  const started = performance.now();
  let rawOutput: unknown | null = null; let metadata: HabitCallMetadata | undefined;
  try {
    const response = await transport.create({ model: THOUGHT_DIAGNOSIS_MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: READING_HABIT_MAX_OUTPUT_TOKENS,
      input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input, null, 2) }] }] } as never, { timeout: READING_HABIT_TIMEOUT_MS, maxRetries: 0 });
    metadata = { model: THOUGHT_DIAGNOSIS_MODEL, durationMs: Math.round(performance.now() - started), inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 };
    if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
    rawOutput = JSON.parse(response.output_text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, ''));
    const parsed = WrongCardOutputSchema.parse(rawOutput);
    const post = stripLeadingSo(parsed);
    const checks = codeChecks(post.out, input);
    return { attempt, rawOutput, output: post.out, ...(post.stripped ? { conclusionStrippedLeadingSo: post.before! } : {}), checks, passed: checks.every(c => c.ok), ...(metadata ? { metadata } : {}) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { attempt, rawOutput, output: null, checks: [{ name: 'JSON으로 읽힌다', ok: false, detail: message }], passed: false, error: message, ...(metadata ? { metadata } : {}) };
  }
}

// ---------- 응답 ----------

export type WrongCardView =
  | { status: 'pending' | 'fallback' | 'none' }
  | { status: 'ready'; layer1: string; symbolGlosses: { symbol: string; gloss: string }[]; pair: WrongCardOutput['pair']; missedAnswer?: { text: string; source: string }; examinerIntent: string; selfCheckOptions?: string[] };

/** 저장된 출력에서 응답을 만든다. `matchesTrap`은 저장만 하고 응답에 넣지 않는다. */
export function readyCardView(output: WrongCardOutput): WrongCardView {
  return { status: 'ready', layer1: output.layer1, symbolGlosses: output.symbolGlosses, pair: output.pair,
    ...(output.missedAnswer ? { missedAnswer: output.missedAnswer } : {}), examinerIntent: output.examinerIntent,
    ...(output.selfCheckOptions ? { selfCheckOptions: output.selfCheckOptions } : {}) };
}
