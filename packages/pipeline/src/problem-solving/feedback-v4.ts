import { z } from 'zod/v4';
import { overlaps } from './feedback-v5-claims.js';
import { SourceDirectProblemBundleSchema, type SourceDirectProblemBundle } from './source-direct-evaluator.js';

export const PROBLEM_FEEDBACK_V4 = 'problem-feedback-v4' as const;
const Text = z.string().trim().min(1);
export const FeedbackRationaleSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('PROVIDED'), text: Text }).strict(),
  z.object({ mode: z.literal('OMITTED') }).strict(),
]);
export const FeedbackCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SELECT'), choiceId: Text, rationale: FeedbackRationaleSchema }).strict(),
  z.object({ type: z.literal('RATIONALE'), rationale: FeedbackRationaleSchema }).strict(),
  z.object({ type: z.literal('CORRECT'), errorId: Text, text: Text }).strict(),
  z.object({ type: z.literal('RESELECT') }).strict(),
  z.object({ type: z.literal('REQUEST_EXPLANATION') }).strict(),
  z.object({ type: z.literal('FINISH') }).strict(),
  z.object({ type: z.literal('END_START'), accept: z.boolean() }).strict(),
  z.object({ type: z.literal('UNDERSTOOD'), answer: z.boolean() }).strict(),
]);
export type FeedbackCommand = z.infer<typeof FeedbackCommandSchema>;
export type FeedbackRationale = z.infer<typeof FeedbackRationaleSchema>;
export type FeedbackVerdict = 'VALID' | 'INVALID' | 'UNKNOWN';

const StudentEvidence = z.object({ observationId: Text, quote: Text }).strict();
const SourceEvidence = z.object({
  location: Text,
  quote: Text.nullable(),
  mediaId: Text.nullable(),
  visualObservation: Text.nullable(),
}).strict();
const ErrorSchema = z.object({
  errorId: Text,
  errorType: z.enum(['TARGET', 'CONTENT']),
  description: Text,
  studentEvidence: z.array(StudentEvidence).min(1),
  sourceEvidence: z.array(SourceEvidence).min(1),
  question: Text,
  basis: z.enum(['STATED', 'INFERRED']),
}).strict();
const Boundary = z.enum(['NONE', 'MISSING_SOURCE', 'KEY_CONFLICT']);
export const FeedbackSelectionAssessmentSchema = z.object({
  mode: z.literal('SELECTION'),
  boundary: Boundary,
  reason: Text,
  reconstructability: z.enum(['RECONSTRUCTABLE', 'UNKNOWN']),
  reconstructedPath: z.array(Text),
  // Model-derived conclusion, never a quotation attributed to the student.
  rationaleImpliedVerdict: z.enum(['VALID', 'INVALID', 'UNKNOWN']),
  contentAssessment: z.enum(['SUPPORTED', 'INSUFFICIENT', 'ERROR', 'UNKNOWN']),
  insufficiencyKind: z.enum(['NONE', 'JUDGMENT_METHOD', 'MISSING_LINK']),
  studentEvidence: z.array(StudentEvidence),
  sourceEvidence: z.array(SourceEvidence),
  errors: z.array(ErrorSchema),
  errorHypothesis: Text.nullable(),
  selectionMismatchQuestion: Text.nullable(),
  coaching: Text,
}).strict();
export const FeedbackRepairAssessmentSchema = z.object({
  mode: z.literal('REPAIR'),
  boundary: Boundary,
  reason: Text,
  // Proof of reading the latest submission, not proof that its reasoning is correct.
  reviewedResponse: StudentEvidence,
  repairs: z.array(z.object({
    errorId: Text,
    status: z.enum(['REPAIRED', 'REMAINING', 'UNCONFIRMED']),
    studentEvidence: z.array(StudentEvidence),
  }).strict()),
  // Includes newly introduced errors; these NEVER expand the question queue.
  newErrors: z.array(z.object({
    errorId: Text,
    errorType: z.enum(['TARGET', 'CONTENT']),
    description: Text,
    studentEvidence: z.array(StudentEvidence).min(1),
    sourceEvidence: z.array(SourceEvidence).min(1),
  }).strict()),
  verificationComplete: z.boolean(),
  rationaleSufficient: z.boolean(),
  sufficiencyEvidence: z.array(StudentEvidence),
  coaching: Text,
}).strict();
export type FeedbackSelectionAssessment = z.infer<typeof FeedbackSelectionAssessmentSchema>;
export type FeedbackRepairAssessment = z.infer<typeof FeedbackRepairAssessmentSchema>;
export type FeedbackAssessment = FeedbackSelectionAssessment | FeedbackRepairAssessment;
export interface FeedbackObservation {
  observationId: string;
  command: FeedbackCommand;
  selectionNumber: number;
}
export interface FeedbackError extends z.infer<typeof ErrorSchema> {
  kind: 'CONTENT' | 'SELECTION_EXECUTION';
  asked: boolean;
  skipped: boolean;
  status: 'REMAINING' | 'REPAIRED' | 'UNCONFIRMED';
}
export interface FeedbackResult {
  outcome: 'VERIFIED_CORRECT' | 'UNVERIFIED_CORRECT' | 'COACHING_TERMINATED';
  selectedChoiceId: string;
  choiceCorrect: boolean;
  selectionCount: number;
  rationaleVerified: boolean;
  correctionSucceeded: boolean;
  answerRevealed: boolean;
  resolvedByStudent: boolean;
  selfReportedUnderstanding: 'YES' | 'NO' | null;
  answer: { choiceId: string; position: number; text: string } | null;
}
export interface FeedbackSession {
  version: typeof PROBLEM_FEEDBACK_V4;
  sessionId: string;
  revision: number;
  // Only public views leave the server; this authoritative record contains the key.
  source: SourceDirectProblemBundle;
  choiceImpliedVerdict: 'VALID' | 'INVALID';
  phase: 'AWAITING_SELECTION' | 'AWAITING_RATIONALE' | 'AWAITING_EVALUATION'
    | 'AWAITING_END_START' | 'AWAITING_UNDERSTANDING' | 'AWAITING_CORRECTION' | 'AWAITING_POST_REPAIR_CHOICE' | 'AWAITING_RESELECTION' | 'ITEM_REVIEW' | 'COMPLETED';
  evaluationMode: 'SELECTION' | 'REPAIR' | 'END_EXPLANATION' | null;
  pendingEnd: { endReason: 'REPAIR_FAILED' | 'COACHING_REQUESTED' | 'RESELECTION_WRONG' | 'RATIONALE_UNVERIFIABLE' | 'NO_CORRECTION' | 'CORRECT_UNVERIFIED'; outcome: FeedbackResult['outcome'] } | null;
  endExplanation: z.infer<typeof FeedbackEndExplanationSchema> | null;
  observations: FeedbackObservation[];
  assessments: FeedbackAssessment[];
  selectionComparisons: { observationId: string; choiceImpliedVerdict: 'VALID' | 'INVALID';
    rationaleImpliedVerdict: FeedbackVerdict; selectionRationaleConsistency: 'CONSISTENT' | 'MISMATCH' | 'UNKNOWN' }[];
  selections: { choiceId: string; rationale: FeedbackRationale; penaltyEligible: boolean }[];
  errors: FeedbackError[];
  additionalErrors: (FeedbackRepairAssessment['newErrors'][number] & { status: 'REMAINING' | 'REPAIRED' | 'UNCONFIRMED' })[];
  activeErrorId: string | null;
  correctionSucceeded: boolean;
  message: string;
  result: FeedbackResult | null;
}

export function normalizeFeedbackPolarity(polarity: SourceDirectProblemBundle['stemPolarity']): 'VALID' | 'INVALID' {
  if (polarity === 'SELECT_CORRECT') return 'VALID';
  if (polarity === 'SELECT_INCORRECT') return 'INVALID';
  throw new Error('극성 정규화 불가: 학생 오류가 아닌 문항 검토 대상입니다.');
}
export function feedbackConsistency(choice: 'VALID' | 'INVALID', rationale: FeedbackVerdict) {
  return rationale === 'UNKNOWN' ? 'UNKNOWN' as const : choice === rationale ? 'CONSISTENT' as const : 'MISMATCH' as const;
}
export function createFeedbackSession(sessionId: string, source: SourceDirectProblemBundle): FeedbackSession {
  const parsed = SourceDirectProblemBundleSchema.parse(source);
  if (!sessionId.trim() || [parsed.passage, parsed.stem, parsed.officialExplanation, ...parsed.choices.map(c => c.text)].some(t => !t.trim())) throw new Error('세션 ID 또는 원자료가 누락됐습니다. 학생 오류로 처리하지 않습니다.');
  return {
    version: PROBLEM_FEEDBACK_V4, sessionId, revision: 0, source: parsed,
    choiceImpliedVerdict: normalizeFeedbackPolarity(parsed.stemPolarity),
    phase: 'AWAITING_SELECTION', evaluationMode: null, pendingEnd: null, endExplanation: null, observations: [], assessments: [],
    selections: [], selectionComparisons: [], errors: [], additionalErrors: [], activeErrorId: null, correctionSucceeded: false,
    message: '답을 고르고, 그렇게 판단한 근거를 적어 줘. 근거 없이 답만 내도 돼.', result: null,
  };
}
function selected(s: FeedbackSession) {
  const last = s.selections.at(-1);
  if (!last) throw new Error('선택 기록이 없습니다.');
  return last;
}
function finish(s: FeedbackSession, outcome: FeedbackResult['outcome'], message: string): FeedbackSession {
  const choice = selected(s);
  const reveal = outcome === 'COACHING_TERMINATED';
  const answer = s.source.choices.find(c => c.choiceId === s.source.answerChoiceId)!;
  s.phase = 'COMPLETED'; s.evaluationMode = null; s.pendingEnd = null; s.activeErrorId = null;
  // The end explanation already states the answer; the answer card shows its number (D-0112 5).
  s.message = message;
  s.result = {
    outcome, selectedChoiceId: choice.choiceId, choiceCorrect: choice.choiceId === answer.choiceId,
    selectionCount: s.selections.length, rationaleVerified: outcome === 'VERIFIED_CORRECT',
    correctionSucceeded: s.correctionSucceeded, answerRevealed: reveal,
    resolvedByStudent: !reveal, selfReportedUnderstanding: null,
    answer: reveal ? { choiceId: answer.choiceId, position: answer.position, text: answer.text } : null,
  };
  return s;
}
export class FeedbackCoachingError extends Error {}
export function validateFeedbackCoaching(text: string): string {
  // A corruption guard, not a semantic quality scorer. Scientific Latin/Greek and formulas remain legal.
  if ((text.match(/\p{Script=Hangul}/gu) ?? []).length < 4
    || /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text)
    || /<\|[^>]*\|>|\[(?:im_start|im_end)\]|\b(?:regenerate|valid JSON|output JSON|JSON schema)\b/iu.test(text)
    || [...text].some(c => /\p{Letter}/u.test(c) && !/[\p{Script=Hangul}\p{Script=Latin}\p{Script=Han}\p{Script=Greek}]/u.test(c))) {
    throw new FeedbackCoachingError('공개 코칭에 손상된 문자열 또는 생성 제어 문구가 있습니다. 판정은 유지하고 한국어 코칭만 다시 작성하세요.');
  }
  return text;
}
function unknown(s: FeedbackSession) {
  return selected(s).choiceId === s.source.answerChoiceId
    ? finish(s, 'UNVERIFIED_CORRECT', '정답이야. 근거를 안 적어서 어떻게 풀었는지는 확인하지 않았어.')
    : endExplanation(s, 'RATIONALE_UNVERIFIABLE', 'COACHING_TERMINATED');
}
function evaluate(s: FeedbackSession, mode: 'SELECTION' | 'REPAIR' | 'END_EXPLANATION') {
  s.phase = 'AWAITING_EVALUATION'; s.evaluationMode = mode; s.activeErrorId = null;
  s.message = '네 답을 살펴보고 있어.';
  return s;
}

function endExplanation(s: FeedbackSession, endReason: NonNullable<FeedbackSession['pendingEnd']>['endReason'], outcome: FeedbackResult['outcome']) {
  s.pendingEnd = { endReason, outcome };
  if (endReason === 'COACHING_REQUESTED') return evaluate(s, 'END_EXPLANATION');
  s.phase = 'AWAITING_END_START'; s.evaluationMode = null; s.activeErrorId = null;
  const correct = selected(s).choiceId === s.source.answerChoiceId;
  const position = s.source.choices.find(c => c.choiceId === s.source.answerChoiceId)!.position;
  s.message = correct ? '네 근거를 하나씩 같이 볼까?'
    : `정답은 ${'①②③④⑤'[position - 1]}번이야.\n네 답을 하나씩 같이 볼까?`;
  return s;
}
export const FeedbackEndExplanationSchema = z.object({ firstChoice: Text, reselection: Text.nullable(), answer: Text }).strict();
export function applyFeedbackEndExplanation(session: FeedbackSession, raw: unknown): FeedbackSession {
  const explanation = FeedbackEndExplanationSchema.parse(raw);
  if ((session.selections.length === 2) !== (explanation.reselection !== null)) throw new Error('종료 설명의 재선택 칸이 선택 기록과 일치하지 않습니다.');
  for (const text of [explanation.firstChoice, explanation.reselection, explanation.answer]) {
    if (text === null) continue;
    validateFeedbackCoaching(text);
    if (/(^|[^A-Za-z0-9])[CEce][0-9]+(?![0-9])/u.test(text)) throw new Error('종료 설명에 내부 식별자가 있습니다.');
    if (/교정\s*질문/u.test(text)) throw new Error('종료 설명에 내부 용어 "교정 질문"이 있습니다. 대화에서 쓰는 말(예: "아까 내 질문")로 다시 쓰세요.');
  }
  if (session.phase !== 'AWAITING_END_START' && !(session.phase === 'AWAITING_EVALUATION' && session.evaluationMode === 'END_EXPLANATION')) return session;
  const s = structuredClone(session); s.endExplanation = explanation;
  if (s.phase === 'AWAITING_EVALUATION') {
    s.revision++; s.phase = 'AWAITING_UNDERSTANDING'; s.evaluationMode = null; s.message = '이해됐어?';
  }
  return s;
}
function repairedOutcome(s: FeedbackSession) {
  const a = s.assessments.filter(a => a.mode === 'REPAIR').at(-1);
  return a?.rationaleSufficient ? 'VERIFIED_CORRECT' as const : 'UNVERIFIED_CORRECT' as const;
}

/** No submit event means no transition. Omission is an explicit, validated event. */
export function submitFeedbackCommand(session: FeedbackSession, raw: unknown, observationId: string): FeedbackSession {
  const command = FeedbackCommandSchema.parse(raw);
  if (!observationId.trim() || session.observations.some(o => o.observationId === observationId)) throw new Error('관찰 ID가 비었거나 중복입니다.');
  const s = structuredClone(session);
  if (command.type === 'END_START' || command.type === 'UNDERSTOOD') {
    const expected = command.type === 'END_START' ? 'AWAITING_END_START' : 'AWAITING_UNDERSTANDING';
    if (s.phase !== expected || !s.pendingEnd) throw new Error('종료 설명 확인 대기 상태가 아닙니다.');
    s.observations.push({ observationId, command, selectionNumber: s.selections.length }); s.revision++;
    const outcome = s.pendingEnd.outcome;
    if (command.type === 'UNDERSTOOD') {
      finish(s, outcome, command.answer ? '좋아, 이 문제는 여기까지야.' : '이 문제는 나중에 다시 볼 수 있게 표시해 둘게.');
      s.result!.selfReportedUnderstanding = command.answer ? 'YES' : 'NO'; return s;
    }
    if (!command.accept) return finish(s, outcome, '알겠어. 이 문제는 여기까지야.');
    if (!s.endExplanation) return evaluate(s, 'END_EXPLANATION');
    s.phase = 'AWAITING_UNDERSTANDING'; s.evaluationMode = null; s.message = '이해됐어?'; return s;
  }
  if (command.type === 'SELECT') {
    if (!['AWAITING_SELECTION', 'AWAITING_RESELECTION'].includes(s.phase) || s.selections.length >= 2) throw new Error('지금은 선택을 제출할 수 없습니다.');
    if (!s.source.choices.some(c => c.choiceId === command.choiceId)) throw new Error('존재하지 않는 선지입니다.');
    const correct = command.choiceId === s.source.answerChoiceId;
    s.selections.push({ choiceId: command.choiceId, rationale: command.rationale, penaltyEligible: !correct && command.rationale.mode === 'OMITTED' });
    s.observations.push({ observationId, command, selectionNumber: s.selections.length }); s.revision++;
    // No new rationale request on the final choice. Provided text is still checked for item-boundary exceptions.
    if (!correct && s.selections.length === 2 && command.rationale.mode === 'OMITTED') return endExplanation(s, 'RESELECTION_WRONG', 'COACHING_TERMINATED');
    if (command.rationale.mode === 'OMITTED') {
      if (correct) return unknown(s);
      s.phase = 'AWAITING_RATIONALE'; s.evaluationMode = null;
      s.message = '정답이 아니야. 근거 없이 고른 오답은 감점돼(개발 버전에서는 실제로 깎지 않아). 어떻게 판단했는지 적어 주거나, [근거 미제출]을 눌러 줘.';
      return s;
    }
    return evaluate(s, 'SELECTION');
  }
  if (command.type === 'RATIONALE') {
    if (s.phase !== 'AWAITING_RATIONALE') throw new Error('근거 보완 요청 상태가 아닙니다.');
    s.observations.push({ observationId, command, selectionNumber: s.selections.length }); s.revision++;
    if (command.rationale.mode === 'OMITTED') return unknown(s);
    return evaluate(s, 'SELECTION');
  }
  if (command.type === 'RESELECT' || command.type === 'REQUEST_EXPLANATION' || command.type === 'FINISH') {
    const correct = selected(s).choiceId === s.source.answerChoiceId;
    if (s.phase !== 'AWAITING_POST_REPAIR_CHOICE' || (correct && command.type === 'RESELECT') || (!correct && command.type === 'FINISH')) throw new Error('허용되지 않은 교정 후 명령입니다.');
    s.observations.push({ observationId, command, selectionNumber: s.selections.length }); s.revision++;
    if (command.type === 'REQUEST_EXPLANATION') return endExplanation(s, 'COACHING_REQUESTED', correct ? repairedOutcome(s) : 'COACHING_TERMINATED');
    if (command.type === 'FINISH') return finish(s, repairedOutcome(s), repairedOutcome(s) === 'VERIFIED_CORRECT'
      ? '잘 고쳤어. 근거도 정확해.' : '잘 고쳤어. 다만 근거가 충분한지는 확인하지 못했어.');
    s.phase = 'AWAITING_RESELECTION'; s.message = '답과 근거를 한 번 더 내 줘. 이번이 마지막 선택이야.';
    return s;
  }
  if (s.phase !== 'AWAITING_CORRECTION' || command.errorId !== s.activeErrorId) throw new Error('현재 교정 질문에 대한 응답이 아닙니다.');
  s.observations.push({ observationId, command, selectionNumber: s.selections.length }); s.revision++;
  return evaluate(s, 'REPAIR');
}

export function feedbackSourceTexts(source: SourceDirectProblemBundle): Record<string, string> {
  return {
    PASSAGE: source.passage, STEM: source.stem, SCENARIO: source.scenario,
    EXPLANATION: source.officialExplanation,
    ...Object.fromEntries(source.choices.map(c => [`CHOICE:${c.choiceId}`, c.text])),
  };
}
export function feedbackObservationText(o: FeedbackObservation) {
  return o.command.type === 'CORRECT' ? o.command.text : 'rationale' in o.command && o.command.rationale.mode === 'PROVIDED' ? o.command.rationale.text : '';
}
function validateStudentEvidence(s: FeedbackSession, refs: z.infer<typeof StudentEvidence>[], repairsOnly = false) {
  for (const ref of refs) {
    const o = s.observations.find(o => o.observationId === ref.observationId);
    if (!o || (repairsOnly && o.command.type !== 'CORRECT')
      || (s.evaluationMode === 'SELECTION' && (o.selectionNumber !== s.selections.length || o.command.type === 'CORRECT'))
      || !feedbackObservationText(o).includes(ref.quote)) throw new Error('학생 근거 인용이 실제 관찰과 일치하지 않습니다.');
  }
}
function validateSourceEvidence(s: FeedbackSession, refs: z.infer<typeof SourceEvidence>[]) {
  const texts = feedbackSourceTexts(s.source);
  for (const ref of refs) {
    if (ref.mediaId !== null) {
      const media = s.source.media.find(m => m.mediaId === ref.mediaId);
      const location = media?.placement.scope === 'CHOICE' ? `CHOICE:${media.placement.choiceId}` : media?.placement.scope;
      if (!media || ref.location !== location || !ref.visualObservation || ref.quote !== null) throw new Error('시각 자료 근거가 원자료와 일치하지 않습니다.');
    } else {
      const original = texts[ref.location];
      if (ref.quote && original && !original.includes(ref.quote)) ref.quote = recoverFeedbackSourceQuote(original, ref.quote) ?? ref.quote;
      if (!ref.quote || ref.visualObservation !== null || !original?.includes(ref.quote)) {
        throw new Error(`원문 근거 인용이 일치하지 않습니다: ${ref.location}, quote=${JSON.stringify(ref.quote)}. 해당 위치의 원문을 그대로 인용하세요. 별표·숫자·부정어·수식 기호를 생략하지 마세요.`);
      }
    }
  }
}
/** Adapted from v3 quote recovery: only whitespace/quotation marks, unique match, >=8 code points. */
export function recoverFeedbackSourceQuote(source: string, quote: string): string | null {
  const ignorable = /[\s"'‘’“”]/u;
  const chars: string[] = []; const starts: number[] = []; const ends: number[] = [];
  let offset = 0;
  for (const char of source) {
    if (!ignorable.test(char)) { chars.push(char); starts.push(offset); ends.push(offset + char.length); }
    offset += char.length;
  }
  const wanted = [...quote].filter(c => !ignorable.test(c));
  if (wanted.length < 8) return null;
  const matches: number[] = [];
  for (let i = 0; i <= chars.length - wanted.length; i++) {
    if (wanted.every((c, j) => c === chars[i + j])) matches.push(i);
  }
  if (matches.length !== 1) return null;
  const start = matches[0]!;
  return source.slice(starts[start], ends[start + wanted.length - 1]);
}
function validateQuestion(s: FeedbackSession, question: string) {
  const answer = s.source.choices.find(c => c.choiceId === s.source.answerChoiceId)!;
  // Deterministic guard for explicit leaks. Implicit semantic hints still require model evaluation.
  // Once the student has chosen the answer (already told "정답이야!"), quoting its number reveals nothing.
  const chosen = s.selections.at(-1)?.choiceId === answer.choiceId;
  if (/정답\s*(?:은|는|이|:|=)/u.test(question) || question.includes(answer.choiceId)
      || (!chosen && (question.includes(`${answer.position}번`) || question.includes('①②③④⑤'[answer.position - 1] ?? '\0')))
      || question.includes(answer.text)) throw new Error('교정 질문에 미공개 정답이 포함됐습니다.');
}
export function validateFeedbackAssessment(s: FeedbackSession, raw: unknown): FeedbackAssessment {
  if (s.phase !== 'AWAITING_EVALUATION' || s.evaluationMode === 'END_EXPLANATION') throw new Error('평가 대기 상태가 아닙니다.');
  const a = s.evaluationMode === 'SELECTION' ? FeedbackSelectionAssessmentSchema.parse(raw) : FeedbackRepairAssessmentSchema.parse(raw);
  if (a.mode === 'SELECTION') {
    validateStudentEvidence(s, a.studentEvidence); validateSourceEvidence(s, a.sourceEvidence);
    if (new Set(a.errors.map(e => e.errorId)).size !== a.errors.length || a.errors.some(e => e.errorId === 'selection-mismatch')) throw new Error('오류 ID 중복 또는 예약 ID입니다.');
    for (const e of a.errors) { validateStudentEvidence(s, e.studentEvidence); validateSourceEvidence(s, e.sourceEvidence); }
    if (a.boundary !== 'NONE') return a;
    const insufficient = a.reconstructability === 'RECONSTRUCTABLE' && a.contentAssessment === 'INSUFFICIENT';
    if (insufficient && a.insufficiencyKind === 'NONE') throw new Error('근거 부족 판정에는 부족의 종류(판단 방식 / 연결 빠짐)가 필요합니다.');
    if (!insufficient && a.insufficiencyKind !== 'NONE') throw new Error('근거 부족이 아닌 판정에는 부족의 종류를 둘 수 없습니다.');
    const inferred = a.errors.filter(e => e.basis === 'INFERRED');
    if (inferred.length > 1) throw new Error('추정 오류는 하나까지만 허용됩니다.');
    if (inferred.length) {
      if (!a.errorHypothesis?.trim() || a.errors.some(e => e.basis === 'STATED') || selected(s).choiceId === s.source.answerChoiceId
        || s.selections.length !== 1 || a.rationaleImpliedVerdict !== s.choiceImpliedVerdict) throw new Error('추정 오류의 조건(가설, 오답 첫 선택, 결론 일치, 명시 오류 없음)을 어겼습니다.');
    } else if (a.errorHypothesis !== null) throw new Error('추정 오류 없이 오류 가설을 쓸 수 없습니다.');
    if (a.reconstructability === 'UNKNOWN') {
      if (a.rationaleImpliedVerdict !== 'UNKNOWN' || a.contentAssessment === 'SUPPORTED') throw new Error('확인 불가 근거에 결론 또는 타당성을 보충할 수 없습니다.');
      return a; // Global gate wins over local errors, including local questions.
    }
    if (a.rationaleImpliedVerdict === 'UNKNOWN' || !a.reconstructedPath.length || !a.studentEvidence.length || !a.sourceEvidence.length) throw new Error('재구성 가능한 판정의 근거가 부족합니다.');
    if ((a.contentAssessment === 'ERROR') !== (a.errors.length > 0)) throw new Error('내용 오류 판정과 오류 목록이 불일치합니다.');
    // A target error means the conclusion was reached on another target, so the selection comparison is skipped.
    const mismatch = feedbackConsistency(s.choiceImpliedVerdict, a.rationaleImpliedVerdict) === 'MISMATCH' && !a.errors.some(e => e.errorType === 'TARGET');
    if (mismatch && s.selections.length === 1 && !a.selectionMismatchQuestion) throw new Error('선택–근거 충돌 질문이 누락됐습니다.');
    // Only questions that can actually be shown are checked; final selections never ask.
    if (s.selections.length === 1) {
      for (const e of a.errors) validateQuestion(s, e.question);
      if (mismatch) validateQuestion(s, a.selectionMismatchQuestion!);
    }
  } else {
    if (a.boundary !== 'NONE') return a;
    const latest = s.observations.at(-1);
    if (latest?.command.type !== 'CORRECT' || a.reviewedResponse.observationId !== latest.observationId) throw new Error('최신 학생 교정 응답의 reviewedResponse ID가 일치하지 않습니다.');
    validateStudentEvidence(s, [a.reviewedResponse], true);
    const expected = [...s.errors, ...s.additionalErrors].map(e => e.errorId);
    if (a.repairs.length !== expected.length || new Set(a.repairs.map(r => r.errorId)).size !== expected.length || a.repairs.some(r => !expected.includes(r.errorId))) throw new Error('전체 최초 오류의 누적 수정 판정이 필요합니다.');
    for (const repair of a.repairs) {
      validateStudentEvidence(s, repair.studentEvidence, repair.status === 'REPAIRED');
      if (repair.status === 'REPAIRED' && !repair.studentEvidence.length) throw new Error('실제 수정 근거 없이 교정 성공으로 판정할 수 없습니다.');
      if (repair.status === 'REPAIRED' && repair.studentEvidence.every(e => /^(네|예|응|알겠습니다|알겠어요|맞아요|이해했어요|모르겠어요|찍었어요)[.!?\s]*$/u.test(e.quote))) throw new Error('동의 또는 확인 불가 발화만으로 실제 수정을 인정할 수 없습니다.');
    }
    if (a.rationaleSufficient && !a.sufficiencyEvidence.length) throw new Error('충분성 판정에는 핵심 관계를 담은 학생 발화 인용이 필요합니다.');
    if (a.rationaleSufficient && a.sufficiencyEvidence.length > 1) throw new Error('충분성 인용은 핵심 관계를 혼자 담은 학생 발화 하나여야 합니다. 여러 발화를 이어야 관계가 되면 충분하지 않습니다.');
    if (!a.rationaleSufficient && a.sufficiencyEvidence.length) throw new Error('충분하지 않은 근거에는 충분성 인용을 둘 수 없습니다.');
    validateStudentEvidence(s, a.sufficiencyEvidence);
    const flagged = [...s.errors, ...s.additionalErrors].flatMap(e => e.studentEvidence);
    if (a.sufficiencyEvidence.some(q => flagged.some(f => overlaps(q, f)))) throw new Error('오류로 확인된 학생 발화는 충분성 인용으로 쓸 수 없습니다.');
    if (new Set(a.newErrors.map(e => e.errorId)).size !== a.newErrors.length || a.newErrors.some(e => expected.includes(e.errorId))) throw new Error('새 오류 ID는 기존 오류와 중복할 수 없습니다.');
    for (const e of a.newErrors) { validateStudentEvidence(s, e.studentEvidence, true); validateSourceEvidence(s, e.sourceEvidence); }
  }
  return a;
}

function nextCorrection(s: FeedbackSession) {
  for (const e of s.errors) {
    if (e.asked || e.skipped) continue;
    if (e.status === 'REPAIRED') { e.skipped = true; continue; }
    e.asked = true; s.activeErrorId = e.errorId; s.phase = 'AWAITING_CORRECTION';
    s.evaluationMode = null; s.message = e.question; return true;
  }
  return false;
}

/** Policy, ordering, queue size and termination are controlled by code, not model actions. */
export function applyFeedbackAssessment(session: FeedbackSession, raw: unknown): FeedbackSession {
  const a = validateFeedbackAssessment(session, raw);
  const s = structuredClone(session); s.assessments.push(a); s.revision++;
  s.evaluationMode = null;
  if (a.boundary !== 'NONE') {
    s.phase = 'ITEM_REVIEW'; s.activeErrorId = null;
    s.message = '원자료 또는 정답 기준을 확인해야 합니다. 학생 오류로 기록하거나 정답을 공개하지 않습니다.';
    return s;
  }
  if (a.mode === 'SELECTION') {
    s.selectionComparisons.push({ observationId: s.observations.at(-1)!.observationId,
      choiceImpliedVerdict: s.choiceImpliedVerdict, rationaleImpliedVerdict: a.rationaleImpliedVerdict,
      selectionRationaleConsistency: feedbackConsistency(s.choiceImpliedVerdict, a.rationaleImpliedVerdict) });
    if (a.reconstructability === 'UNKNOWN') return selected(s).choiceId === s.source.answerChoiceId
      ? endExplanation(s, 'CORRECT_UNVERIFIED', 'UNVERIFIED_CORRECT') : unknown(s);
    const consistency = feedbackConsistency(s.choiceImpliedVerdict, a.rationaleImpliedVerdict);
    const correct = selected(s).choiceId === s.source.answerChoiceId;
    if (!correct && a.contentAssessment === 'SUPPORTED' && consistency === 'CONSISTENT') {
      s.phase = 'ITEM_REVIEW'; s.message = '타당한 근거와 정답 기준의 충돌을 검토해야 합니다.'; return s;
    }
    if (!correct && s.selections.length === 2) return endExplanation(s, 'RESELECTION_WRONG', 'COACHING_TERMINATED');
    const mapped: FeedbackError[] = a.errors.map(e => ({ ...e, kind: 'CONTENT', asked: false, skipped: false, status: 'REMAINING' }));
    const errors = [...mapped.filter(e => e.errorType === 'TARGET'), ...mapped.filter(e => e.errorType !== 'TARGET')];
    if (consistency === 'MISMATCH' && !errors.some(e => e.errorType === 'TARGET')) errors.push({
      errorId: 'selection-mismatch', errorType: 'CONTENT', description: '선택이 뜻하는 판정과 근거에서 도출되는 판정이 다릅니다.',
      kind: 'SELECTION_EXECUTION', basis: 'STATED', question: a.selectionMismatchQuestion!,
      studentEvidence: a.studentEvidence, sourceEvidence: a.sourceEvidence, asked: false, skipped: false, status: 'REMAINING',
    });
    if (errors.length) {
      if (s.selections.length === 2) return endExplanation(s, 'NO_CORRECTION', 'UNVERIFIED_CORRECT');
      s.errors = errors; nextCorrection(s); return s;
    }
    if (!correct) return unknown(s);
    if (a.contentAssessment !== 'SUPPORTED') return endExplanation(s, 'CORRECT_UNVERIFIED', 'UNVERIFIED_CORRECT');
    return finish(s, 'VERIFIED_CORRECT', '근거도 정확해. 잘 풀었어.');
  }
  // Recompute cumulatively; a later response can repair an earlier failed target.
  for (const e of [...s.errors, ...s.additionalErrors]) e.status = a.repairs.find(r => r.errorId === e.errorId)!.status;
  s.additionalErrors.push(...a.newErrors.map(e => ({ ...e, status: 'REMAINING' as const })));
  if (nextCorrection(s)) return s;
  const success = a.verificationComplete && s.errors.every(e => e.status === 'REPAIRED');
  if (!success) return endExplanation(s, 'REPAIR_FAILED', selected(s).choiceId === s.source.answerChoiceId ? 'UNVERIFIED_CORRECT' : 'COACHING_TERMINATED');
  s.correctionSucceeded = true;
  s.phase = 'AWAITING_POST_REPAIR_CHOICE';
  const position = s.source.choices.find(c => c.choiceId === selected(s).choiceId)!.position;
  // A new error in the correction answer means "네 근거대로면" can no longer be asserted.
  const selectionMismatchOnly = s.errors.length === 1 && s.errors[0]!.errorId === 'selection-mismatch' && !s.additionalErrors.length;
  const [obj, , topic] = numeralParticles(position);
  const inferredOnly = s.errors.length === 1 && s.errors[0]!.basis === 'INFERRED' && !s.additionalErrors.length;
  s.message = selected(s).choiceId === s.source.answerChoiceId
    ? '근거의 핵심 오류를 잘 고쳤어. 처음 근거에서 어디가 잘못됐는지 정리한 설명을 볼래?'
    : inferredOnly
    ? `맞아, 거기가 ${'①②③④⑤'[position - 1]}${obj} 판단하는 열쇠야. 그걸 생각하면서 다시 골라 볼래?`
    : selectionMismatchOnly
    ? s.choiceImpliedVerdict === 'INVALID'
      ? `네 근거대로면 ${'①②③④⑤'[position - 1]}${topic} 적절한 설명이야. 이 문제는 적절하지 않은 것을 고르는 문제니까, 다시 골라 볼래?`
      : `네 근거대로면 ${'①②③④⑤'[position - 1]}${topic} 적절하지 않은 설명이야. 이 문제는 적절한 것을 고르는 문제니까, 다시 골라 볼래?`
    : `핵심 오류를 잘 고쳤어. 처음에 ${'①②③④⑤'[position - 1]}번을 고르게 된 생각 중 어디가 잘못됐는지 알 것 같으면 다시 골라 볼래?`;
  return s;
}

/** Deliberately excludes source key, internal assessments, planned questions and error descriptions. */
export function feedbackPublicView(s: FeedbackSession) {
  const correctionHighlights: { location: 'PASSAGE' | 'SCENARIO'; start: number; end: number; text: string }[] = [];
  if (s.phase === 'AWAITING_CORRECTION') {
    for (const evidence of s.errors.find(e => e.errorId === s.activeErrorId)?.sourceEvidence ?? []) {
      if ((evidence.location !== 'PASSAGE' && evidence.location !== 'SCENARIO') || !evidence.quote || evidence.mediaId || evidence.visualObservation) continue;
      const text = evidence.quote;
      const start = (evidence.location === 'PASSAGE' ? s.source.passage : s.source.scenario).indexOf(text);
      if (start >= 0) correctionHighlights.push({ location: evidence.location, start, end: start + text.length, text });
    }
  }
  return {
    version: s.version, sessionId: s.sessionId, revision: s.revision, phase: s.phase,
    question: { questionId: s.source.questionId, passageText: s.source.passage, stem: s.source.stem,
      scenarioText: s.source.scenario, choices: s.source.choices, media: s.source.media,
      // Marker positions only (source decoration, not key material); context strings stay server-side.
      textAnnotations: (s.source.textAnnotations ?? []).map(({ location, marker, style, start, end, text }) => ({ location, marker, style, start, end, text })) },
    correctionHighlights,
    message: s.message, activeErrorId: s.activeErrorId, selectionCount: s.selections.length,
    maxSelections: 2, questionsAsked: s.errors.filter(e => e.asked).length,
    questionTargets: s.errors.length, penaltyEligibleSelections: s.selections.filter(c => c.penaltyEligible).length,
    pointsDeducted: 0, result: s.result,
    postRepairOptions: s.phase === 'AWAITING_POST_REPAIR_CHOICE'
      ? selected(s).choiceId === s.source.answerChoiceId
        ? ['REQUEST_EXPLANATION', 'FINISH'] as ('RESELECT' | 'REQUEST_EXPLANATION' | 'FINISH')[]
        : ['RESELECT', 'REQUEST_EXPLANATION'] as ('RESELECT' | 'REQUEST_EXPLANATION' | 'FINISH')[]
      : null,
  };
}

/** Particles follow the spoken numeral: 일·삼 end in a consonant, 이·사·오 do not. Returns [object, subject, topic]. */
export function numeralParticles(position: number): [string, string, string] {
  return position === 1 || position === 3 ? ['을', '이', '은'] : ['를', '가', '는'];
}
