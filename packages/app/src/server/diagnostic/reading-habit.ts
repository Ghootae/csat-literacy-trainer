/**
 * 결과 화면 맨 위 요약 = 문장 읽기 습관(인계 docs/handoffs/2026-11-19-reading-habit-summary-impl.md).
 * 지시문 읽기·입력 만들기·모델 호출·보여 주기 전 코드 검사를 모은다. 참가자 상태와 백그라운드 작업은 controller.ts가 맡는다.
 * 입력 만들기·거르기·호출은 실험 코드(docs/experiments/reading-error-2026-11-18/run-one.mjs)를 옮긴 것이다.
 */
import { z } from 'zod/v4';
import { THOUGHT_DIAGNOSIS_MODEL, type FeedbackTransport } from '@csat/pipeline';
import { stemPolarity } from '../examiner-strategy.js';
import type { ChoiceLinkTwist } from './content.js';
import type { DiagnosticParticipant } from './store.js';

export const READING_HABIT_MAX_OUTPUT_TOKENS = 12000;
export const READING_HABIT_TIMEOUT_MS = 180000;

/** 거르기(코드): 사고 진단 errors에 이 태그가 하나라도 있는 근거만 남긴다. 단계는 보지 않는다. */
export const READING_HABIT_TAGS: ReadonlySet<string> = new Set(['CONDITION', 'SCOPE', 'DIRECTION', 'POLARITY', 'REFERENT', 'MAPPING', 'PARAPHRASE_DISTANCE', 'MISREAD_FACT']);

// ---------- 모델 응답 모양 ----------

const Featured = z.object({ item: z.string(), sentence: z.string(), studentQuote: z.string(), sourceForm: z.string(), studentForm: z.string(), changed: z.string(), explanation: z.string() });
const OtherCase = z.object({ item: z.string(), sentence: z.string(), studentQuote: z.string(), changed: z.string() });
export const HabitGenerationSchema = z.discriminatedUnion('result', [
  z.object({ result: z.literal('PATTERN'), strength: z.enum(['TWO', 'THREE_PLUS']), headline: z.string(), featured: Featured, othersLead: z.string().nullable().default(null), otherCases: z.array(OtherCase),
    secondary: z.object({ line: z.string(), items: z.array(z.string()) }).nullable(), nextTime: z.string() }),
  z.object({ result: z.literal('NONE') }),
]);
export type HabitGeneration = z.infer<typeof HabitGenerationSchema>;
export const HabitReviewSchema = z.object({ verdict: z.enum(['PASS', 'FAIL']) });
export type HabitReview = z.infer<typeof HabitReviewSchema>;

export interface HabitCallMetadata { model: string; durationMs: number; inputTokens: number; outputTokens: number }
/** 한 번 부르고 코드펜스를 벗겨 JSON으로 읽은 뒤 모양을 검사한다. 어느 단계든 실패하면 던진다(재시도는 호출자가 정한다). */
export async function askReadingHabit<T>(transport: FeedbackTransport, instructions: string, userText: string, schema: z.ZodType<T>): Promise<{ value: unknown; parsed: T; metadata: HabitCallMetadata }> {
  const started = performance.now();
  const response = await transport.create({ model: THOUGHT_DIAGNOSIS_MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: READING_HABIT_MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: userText }] }] } as never, { timeout: READING_HABIT_TIMEOUT_MS, maxRetries: 0 });
  if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
  const value: unknown = JSON.parse(response.output_text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, ''));
  const parsed = schema.parse(value);
  return { value, parsed, metadata: { model: THOUGHT_DIAGNOSIS_MODEL, durationMs: Math.round(performance.now() - started),
    inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 } };
}
/** 검토 호출에 보내는 글(run-one.mjs와 같다). */
export const reviewUserText = (inputText: string, generation: unknown): string => `## 입력\n${inputText}\n\n## 생성 결과\n${JSON.stringify(generation, null, 2)}`;

// ---------- 입력 ----------

interface HabitChoice { position: number; text: string }
export interface HabitTwist { twistDetail: string; choiceQuote: string; evidenceQuote: string | null }
export interface HabitEntry {
  item: string; stem: string; scenario?: string; stemPolarity: 'SELECT_CORRECT' | 'SELECT_INCORRECT'; chosen: HabitChoice; correct: boolean; studentRationale: string;
  rationaleJudgment?: string | null; answer?: HabitChoice; chosenIsTrueStatement?: true; answerTwists?: HabitTwist[]; chosenTwists?: HabitTwist[];
  thoughtDiagnosis: { outcomeType: string; steps: unknown; firstFailedStep: string | null; errors: { tag: string; step: string; studentQuote: string }[] };
  symbolGloss?: Record<string, string>;
}
export interface HabitInput {
  evidenceEntries: HabitEntry[];
  excludedEntries: { item: string; tags: string[] }[];
  supportedCorrectRationales: { item: string; studentRationale: string }[];
  wrongWithoutRationale: string[];
  passages: Record<string, string>;
}
export interface HabitRef { questionId: string; passageId: string; questionNumber: number }

type Item = DiagnosticParticipant['items'][string];
export interface HabitContext {
  /** 답한 지문만(푸는 중인 지문 제외), 세트 순서대로. */
  passages: readonly { passageId: string; questionIds: readonly string[]; choiceLinkPath: string }[];
  questionNumber(questionId: string): number;
  answerPosition(questionId: string): number;
  title(passageId: string): string;
  source(questionId: string): { stem: string; scenario: string; passage: string; choices: readonly { choiceId: string; position: number; text: string }[] };
  twists(choiceLinkPath: string, questionNumber: number, position: number): readonly ChoiceLinkTwist[];
  symbolGloss(passageId: string): Readonly<Record<string, string>>;
  isCorrect(item: Item): boolean;
}

const SYMBOL = /[㉠-㉻ⓐ-ⓩ]|\([가-하]\)/gu;
const toTwist = (t: ChoiceLinkTwist): HabitTwist => ({ twistDetail: t.twistDetail, choiceQuote: t.choiceQuote, evidenceQuote: t.evidenceQuote === '' ? null : t.evidenceQuote });

/**
 * 참가자 한 명에서 입력을 만든다(인계 2-2). `pending`이면 입력이 아직 다 모이지 않은 것이라 호출하지 않는다:
 * 사고 진단이 진행 중이거나, 근거를 쓴 문항의 첫 판정이 진행 중이다(곧 사고 진단 대상이 된다).
 */
export function buildHabitInput(p: DiagnosticParticipant, ctx: HabitContext): { pending: boolean; input: HabitInput; refs: Map<string, HabitRef> } {
  const candidates: HabitEntry[] = []; const supported: HabitInput['supportedCorrectRationales'] = []; const omittedWrong: string[] = [];
  const refs = new Map<string, HabitRef>(); const passageOfEntry = new Map<string, string>();
  let pending = false;
  for (const passage of ctx.passages) {
    for (const questionId of passage.questionIds) {
      const item = p.items[questionId]!; const first = item.first;
      if (first === null || item.session === null || item.reviewFlag !== null) continue;
      const name = `${ctx.title(passage.passageId)} ${ctx.questionNumber(questionId)}번`;
      const correct = ctx.isCorrect(item);
      if (first.rationale.mode === 'OMITTED') {
        if (!correct) omittedWrong.push(name);
        continue;
      }
      if (item.thoughtDiagnosis.status === 'PENDING' || item.firstJudgment.status === 'PENDING') pending = true;
      if (correct && item.firstJudgment.contentAssessment === 'SUPPORTED') { supported.push({ item: name, studentRationale: first.rationale.text }); continue; }
      const output = item.thoughtDiagnosis.output as { outcomeType: string; steps: unknown; firstFailedStep: string | null; errors: { tag: string; step: string; studentQuote: string }[] } | null;
      if (item.thoughtDiagnosis.status !== 'READY' || output === null) continue;
      const source = ctx.source(questionId); const number = ctx.questionNumber(questionId);
      const chosenChoice = source.choices.find(c => c.choiceId === first.choiceId)!;
      const chosen = { position: chosenChoice.position, text: chosenChoice.text };
      const entry: HabitEntry = { item: name, stem: source.stem, ...(source.scenario.trim() === '' ? {} : { scenario: source.scenario }), stemPolarity: stemPolarity(source.stem),
        chosen, correct, studentRationale: first.rationale.text, thoughtDiagnosis: { outcomeType: output.outcomeType, steps: output.steps, firstFailedStep: output.firstFailedStep, errors: output.errors } };
      if (correct) entry.rationaleJudgment = item.firstJudgment.contentAssessment;
      else {
        const answerPosition = ctx.answerPosition(questionId);
        entry.answer = { position: answerPosition, text: source.choices.find(c => c.position === answerPosition)!.text };
        if (entry.stemPolarity === 'SELECT_INCORRECT') {
          entry.chosenIsTrueStatement = true;
          entry.answerTwists = ctx.twists(passage.choiceLinkPath, number, answerPosition).map(toTwist);
        } else entry.chosenTwists = ctx.twists(passage.choiceLinkPath, number, chosen.position).map(toTwist);
      }
      const gloss = ctx.symbolGloss(passage.passageId);
      const found = new Set(`${source.stem}\n${source.choices.map(c => c.text).join('\n')}\n${source.scenario}`.match(SYMBOL) ?? []);
      const symbolGloss = Object.fromEntries([...found].filter(symbol => gloss[symbol] !== undefined).map(symbol => [symbol, gloss[symbol]!]));
      if (Object.keys(symbolGloss).length > 0) entry.symbolGloss = symbolGloss;
      candidates.push(entry);
      refs.set(name, { questionId, passageId: passage.passageId, questionNumber: number });
      passageOfEntry.set(name, passage.passageId);
    }
  }
  const isTarget = (entry: HabitEntry) => entry.thoughtDiagnosis.errors.some(e => READING_HABIT_TAGS.has(e.tag));
  const evidenceEntries = candidates.filter(isTarget);
  const excludedEntries = candidates.filter(entry => !isTarget(entry)).map(entry => ({ item: entry.item, tags: entry.thoughtDiagnosis.errors.map(e => e.tag) }));
  const passages: Record<string, string> = {};
  for (const entry of evidenceEntries) {
    const passageId = passageOfEntry.get(entry.item)!;
    passages[ctx.title(passageId)] ??= ctx.source(refs.get(entry.item)!.questionId).passage;
  }
  return { pending, input: { evidenceEntries, excludedEntries, supportedCorrectRationales: supported, wrongWithoutRationale: omittedWrong, passages }, refs };
}

// ---------- 보여 주기 전 코드 검사(인계 2-4) ----------

export type HabitSourceKind = 'CHOICE' | 'PASSAGE' | 'SCENARIO';
export interface ShownHabit {
  headline: string;
  /** 다른 사례 목록 앞 한 문장. 비어 있으면 null(화면은 고정 문구만 쓴다). */
  othersLead: string | null;
  featured: { questionId: string; passageId: string; questionNumber: number; sourceKind: HabitSourceKind; choicePosition: number | null;
    sentence: string; studentQuote: string; sourceForm: string; studentForm: string; changed: string; explanation: string };
  otherCases: { questionId: string; passageId: string; questionNumber: number; sentence: string; studentQuote: string; changed: string }[];
  secondary: { line: string; questionIds: string[] } | null;
  nextTime: string;
}
export type ReadingHabitView = { status: 'pending' | 'failed' | 'none' } | { status: 'ready'; habit: ShownHabit };

const plain = (sentence: string): string => sentence.replaceAll('**', '').trim();
/** 문장이 그 문항의 선지 글(고른 선지·정답 선지), 지문 원문, scenario 중 어디에 그대로 있는지. 앞에서부터 처음 맞는 곳. */
function locateSentence(entry: HabitEntry, input: HabitInput, title: string, sentence: string): { kind: HabitSourceKind; choicePosition: number | null } | null {
  if (sentence === '') return null;
  const choice = [entry.chosen, entry.answer].find(c => c !== undefined && c.text.includes(sentence));
  if (choice) return { kind: 'CHOICE', choicePosition: choice.position };
  if ((input.passages[title] ?? '').includes(sentence)) return { kind: 'PASSAGE', choicePosition: null };
  if ((entry.scenario ?? '').includes(sentence)) return { kind: 'SCENARIO', choicePosition: null };
  return null;
}

/**
 * 생성·검토 결과를 입력과 다시 맞춰 본다. 모두 통과해야 `shown`이다.
 * hiddenReason: REVIEW_FAIL(1), NONE(2, 정상), CHECK_3 ~ CHECK_6. 7(secondary)은 실패해도 secondary만 버린다.
 */
export function checkHabit(input: HabitInput, refs: ReadonlyMap<string, HabitRef>, generation: HabitGeneration, review: HabitReview): { shown: ShownHabit | null; hiddenReason: string | null } {
  const hide = (hiddenReason: string) => ({ shown: null, hiddenReason });
  if (review.verdict !== 'PASS') return hide('REVIEW_FAIL');
  if (generation.result !== 'PATTERN') return hide('NONE');
  const entries = new Map(input.evidenceEntries.map(entry => [entry.item, entry]));
  const cases = [generation.featured, ...generation.otherCases];
  const titleOf = (item: string) => item.replace(/\s\d+번$/u, '');
  // 3
  if (!cases.every(c => entries.has(c.item)) || new Set(cases.map(c => c.item)).size < 2) return hide('CHECK_3');
  // 4
  if (!cases.every(c => { const quote = c.studentQuote.trim(); return quote !== '' && entries.get(c.item)!.studentRationale.includes(quote); })) return hide('CHECK_4');
  // 5
  const located = cases.map(c => locateSentence(entries.get(c.item)!, input, titleOf(c.item), plain(c.sentence)));
  if (located.some(found => found === null)) return hide('CHECK_5');
  // 6
  const distinct = new Set(cases.map(c => c.item)).size;
  if (generation.strength !== (distinct >= 3 ? 'THREE_PLUS' : 'TWO')) return hide('CHECK_6');
  // 7
  const secondary = generation.secondary !== null && generation.secondary.items.every(item => entries.has(item))
    ? { line: generation.secondary.line, questionIds: [...new Set(generation.secondary.items.map(item => refs.get(item)!.questionId))] } : null;
  const featured = generation.featured; const featuredRef = refs.get(featured.item)!; const featuredAt = located[0]!;
  return { hiddenReason: null, shown: {
    headline: generation.headline,
    othersLead: generation.othersLead !== null && generation.othersLead.trim() !== '' && generation.othersLead.trim().toUpperCase() !== 'NONE' ? generation.othersLead.trim() : null,
    featured: { ...featuredRef, sourceKind: featuredAt.kind, choicePosition: featuredAt.choicePosition, sentence: featured.sentence.trim(), studentQuote: featured.studentQuote.trim(),
      sourceForm: featured.sourceForm, studentForm: featured.studentForm, changed: featured.changed, explanation: featured.explanation },
    otherCases: generation.otherCases.map(c => ({ ...refs.get(c.item)!, sentence: c.sentence.trim(), studentQuote: c.studentQuote.trim(), changed: c.changed })),
    secondary, nextTime: generation.nextTime } };
}
