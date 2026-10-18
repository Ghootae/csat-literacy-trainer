import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import {
  OpenAISimpleEvaluator, SimpleEvaluationError, applySimpleAction, evaluateSimple, expectedAction, initialSimpleState,
  type SimpleAction, type SimpleEvaluationInput, type SimpleEvaluationResult, type SimpleEvaluator, type SimpleOutput, type SimpleParagraphState,
} from '@csat/pipeline';
import { appendJsonlLine, loadDialoguePassages, readJsonlLines, type DialoguePassageContent } from './content.js';
import type {
  SimpleAttemptInspection, SimpleDialogueView, SimpleHighlightView, SimpleInspection, SimpleMemoRecord, SimpleMessageLabel, SimpleMessageView, SimpleStepInspection,
} from '../shared/dialogue-simple.js';

export const SimpleRespondSchema = z.object({
  transitionId: z.string().trim().min(1), paragraphIndex: z.number().int().nonnegative(), text: z.string().trim().min(1),
}).strict();
export const SimpleNavigateSchema = z.object({ paragraphIndex: z.number().int().nonnegative() }).strict();
export const SimpleNewAttemptSchema = z.object({ paragraphIndex: z.number().int().nonnegative() }).strict();
export const SimpleMemoSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(), attemptNumber: z.number().int().positive().nullable(),
  stepIndex: z.number().int().nonnegative().nullable(), text: z.string(),
}).strict();

type Step = SimpleStepInspection;
interface AttemptRuntime {
  attemptNumber: number;
  state: SimpleParagraphState;
  /** 라벨 포함 대화. 모델 입력에는 role·text만 넣는다. */
  transcript: SimpleMessageView[];
  steps: Step[];
  status: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
  abandoned: boolean;
}
/** 마지막 시도가 현재 시도다. */
interface ParagraphRuntime { attempts: AttemptRuntime[] }
const newAttempt = (attemptNumber: number): AttemptRuntime =>
  ({ attemptNumber, state: initialSimpleState(), transcript: [], steps: [], status: 'IDLE', abandoned: false });
const studentLabel: Record<SimpleParagraphState['stage'], SimpleMessageLabel> =
  { INITIAL: '나의 요약', RETRY: '다시 쓴 요약', AFTER_CORRECTION: '나의 답', AFTER_GAP: '나의 답' };
const tutorLabel: Record<SimpleAction, SimpleMessageLabel> = {
  PRAISE: '피드백', RETRY_PROMPT: '다시 써 보기', CORRECTION_QUESTION: '확인하기', GAP_QUESTION: '생각해 보기',
  CLOSE_GAP: '빠진 내용', CLOSE_NO_RESPONSE: '문단 핵심', CLOSE_ERRORS: '바로잡기',
};
type LogEvent = 'STEP' | 'EVALUATION_FAILED' | 'ATTEMPT_STARTED' | 'ATTEMPT_ABANDONED';
interface Runtime {
  sessionId: string;
  passage: DialoguePassageContent;
  paragraphs: Map<number, ParagraphRuntime>;
  currentIndex: number;
  transitions: Map<string, { fingerprint: string; promise: Promise<SimpleDialogueView> }>;
}

const DEFAULT_LOG_DIRECTORY = '.omc/logs/dialogue-experiment/simple-holistic';

/** 개발자 전용 컨트롤러. 학생 상태 원장에 쓰지 않고, 골드(goldPath)를 읽지 않는다. */
export class SimpleDialogueController {
  private readonly sessions = new Map<string, Runtime>();
  private readonly evaluator: SimpleEvaluator;
  private readonly passages: readonly DialoguePassageContent[];
  private readonly logDirectory: string;
  constructor(options: { evaluator?: SimpleEvaluator; passages?: readonly DialoguePassageContent[]; logDirectory?: string } = {}) {
    this.evaluator = options.evaluator ?? new OpenAISimpleEvaluator();
    this.passages = options.passages ?? loadDialoguePassages();
    this.logDirectory = options.logDirectory ?? resolve(process.cwd(), DEFAULT_LOG_DIRECTORY);
  }

  start(passageId: string): SimpleDialogueView {
    const passage = this.passages.find(p => p.passageId === passageId);
    if (!passage) throw new Error('등록되지 않은 지문입니다.');
    const r: Runtime = { sessionId: randomUUID(), passage, paragraphs: new Map(), currentIndex: 0, transitions: new Map() };
    this.sessions.set(r.sessionId, r);
    return this.view(r);
  }
  get(sessionId: string): SimpleDialogueView { return this.view(this.require(sessionId)); }

  navigate(sessionId: string, raw: unknown): SimpleDialogueView {
    const r = this.require(sessionId);
    const { paragraphIndex } = SimpleNavigateSchema.parse(raw);
    this.paragraphAt(r, paragraphIndex);
    r.currentIndex = paragraphIndex;
    return this.view(r);
  }

  respond(sessionId: string, raw: unknown): Promise<SimpleDialogueView> {
    const request = SimpleRespondSchema.parse(raw);
    const r = this.require(sessionId);
    const fingerprint = JSON.stringify({ paragraphIndex: request.paragraphIndex, text: request.text });
    const prior = r.transitions.get(request.transitionId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('같은 transitionId에 다른 요청을 사용할 수 없습니다.');
      return prior.promise;
    }
    const p = this.current(this.paragraphAt(r, request.paragraphIndex));
    if (p.status === 'PROCESSING') throw new Error('평가 중입니다. 현재 요청 결과를 기다리세요.');
    if (p.state.done) throw new Error('이미 끝난 문단입니다.');
    // 평가 실패로 남은 학생 발화는 새 제출이 대체한다(같은 문장이면 그대로 다시 시도).
    if (p.status === 'RETRYABLE_ERROR') p.transcript.pop();
    p.transcript.push({ role: 'student', text: request.text, label: studentLabel[p.state.stage] });
    p.status = 'PROCESSING';
    r.currentIndex = request.paragraphIndex;
    const promise = this.evaluate(r, request.paragraphIndex, p, request.text);
    r.transitions.set(request.transitionId, { fingerprint, promise });
    return promise;
  }

  /** 이전 시도는 보존한다. 끝나지 않은 시도는 중단으로 표시한다. */
  startAttempt(sessionId: string, raw: unknown): SimpleDialogueView {
    const r = this.require(sessionId);
    const { paragraphIndex } = SimpleNewAttemptSchema.parse(raw);
    const paragraph = this.paragraphAt(r, paragraphIndex);
    const prev = this.current(paragraph);
    if (prev.status === 'PROCESSING') throw new Error('평가 중입니다. 현재 요청 결과를 기다리세요.');
    if (!prev.transcript.some(m => m.role === 'student')) throw new Error('이미 새 시도입니다.');
    if (!prev.state.done) { prev.abandoned = true; this.log(r, paragraphIndex, prev, 'ATTEMPT_ABANDONED', null, []); }
    const next = newAttempt(prev.attemptNumber + 1);
    paragraph.attempts.push(next);
    r.currentIndex = paragraphIndex;
    this.log(r, paragraphIndex, next, 'ATTEMPT_STARTED', null, []);
    return this.view(r);
  }

  inspect(sessionId: string, paragraphIndex: number): SimpleInspection {
    const r = this.require(sessionId);
    const paragraph = this.paragraphAt(r, paragraphIndex);
    const memos = this.memos(r, paragraphIndex);
    const attempts = paragraph.attempts.map((a): SimpleAttemptInspection => {
      const { stage, retryUsed, questionsAsked, done, outcome } = a.state;
      return { attemptNumber: a.attemptNumber, status: done ? 'DONE' : a.abandoned ? 'ABANDONED' : 'IN_PROGRESS',
        state: { stage, retryUsed, questionsAsked, done, outcome }, messages: a.transcript, steps: a.steps,
        memos: memos.attempts[a.attemptNumber] ?? { attempt: '', steps: {} } };
    });
    return structuredClone({ paragraphIndex, paragraphId: r.passage.paragraphs[paragraphIndex]!.paragraphId,
      currentAttemptNumber: this.current(paragraph).attemptNumber, attempts, memos: { paragraph: memos.paragraph } });
  }

  saveMemo(sessionId: string, raw: unknown): SimpleMemoRecord {
    const r = this.require(sessionId);
    const { paragraphIndex, attemptNumber, stepIndex, text } = SimpleMemoSchema.parse(raw);
    const paragraph = this.paragraphAt(r, paragraphIndex);
    if (attemptNumber === null && stepIndex !== null) throw new Error('단계 메모에는 시도 번호가 필요합니다.');
    const attempt = attemptNumber === null ? null : paragraph.attempts.find(a => a.attemptNumber === attemptNumber);
    if (attempt === undefined) throw new Error('존재하지 않는 시도입니다.');
    if (stepIndex !== null && stepIndex >= attempt!.steps.length) throw new Error('존재하지 않는 단계입니다.');
    const record: SimpleMemoRecord = { savedAt: new Date().toISOString(), sessionId, passageId: r.passage.passageId,
      paragraphId: r.passage.paragraphs[paragraphIndex]!.paragraphId, attemptNumber, stepIndex, text };
    appendJsonlLine(resolve(this.logDirectory, 'memos.jsonl'), record);
    return record;
  }

  private async evaluate(r: Runtime, index: number, p: AttemptRuntime, studentText: string): Promise<SimpleDialogueView> {
    const paragraph = r.passage.paragraphs[index]!;
    const input: SimpleEvaluationInput = {
      passage: { title: r.passage.title, paragraphs: r.passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
      targetParagraph: { paragraphId: paragraph.paragraphId, text: paragraph.text },
      stage: p.state.stage, dialogue: p.transcript.map(({ role, text, items, copied }) => ({ role, text: items ? `${text}\n${items.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : text, ...(copied ? { copied } : {}) })),
      coreParts: p.state.stage === 'INITIAL' ? null : p.state.coreParts, targetError: p.state.targetError, targetGaps: p.state.stage === 'AFTER_GAP' ? p.state.targetGaps : null,
    };
    try {
      const stage = p.state.stage;
      const result = await evaluateSimple(this.evaluator, input);
      const next = applySimpleAction(p.state, result.output);
      const step = this.buildStep(p, paragraph.text, studentText, result, next);
      p.steps.push(step); p.state = next; p.status = 'IDLE';
      // 원문 옮겨 적기로 판정된 발화는 표시해 두고, 이후 판정 입력에서 학생 이해로 치지 않게 한다.
      if (result.output.category === 'COPY') p.transcript.at(-1)!.copied = true;
      p.transcript.push(...this.tutorMessages(result.output, stage));
      this.log(r, index, p, 'STEP', null, result.validationFailures);
    } catch (error) {
      p.status = 'RETRYABLE_ERROR';
      const failures = error instanceof SimpleEvaluationError ? error.validationFailures : [];
      this.log(r, index, p, 'EVALUATION_FAILED', error instanceof Error ? error.message : String(error), failures);
    }
    return this.view(r);
  }
  /** GAP_QUESTION: 리액션+번호 질문 한 말풍선. 질문 뒤 PRAISE·CLOSE_GAP: 문단 핵심 -> 피드백/빠진 내용. CLOSE_ERRORS: 도입 -> 오류마다 -> (missingNote) 빠진 내용 -> 문단 핵심. CLOSE_NO_RESPONSE: 도입+핵심 상자 한 말풍선. */
  private tutorMessages(o: SimpleOutput, stage: SimpleParagraphState['stage']): SimpleMessageView[] {
    const tutor = (m: Omit<SimpleMessageView, 'role'>): SimpleMessageView => ({ role: 'tutor', ...m });
    const core = () => tutor({ text: o.coreIntro ?? '', box: o.coreSummary ?? '', label: '문단 핵심' });
    if (o.action === 'GAP_QUESTION') return [tutor({ text: o.message, items: o.gaps.map(g => g.question), label: '생각해 보기' })];
    if (o.action === 'PRAISE' && (stage === 'AFTER_CORRECTION' || stage === 'AFTER_GAP')) return [core(), tutor({ text: o.message, label: '피드백' })];
    if (o.action === 'CLOSE_GAP') return [core(), tutor({ text: o.message, label: '빠진 내용' })];
    if (o.action === 'CLOSE_ERRORS') return [tutor({ text: o.message, label: '바로잡기' }),
      ...o.errors.map(e => tutor({ text: e.feedback, quote: e.studentQuote, label: '바로잡기' })),
      ...(o.missingNote ? [tutor({ text: o.missingNote, label: '빠진 내용' })] : []), core()];
    if (o.action === 'CLOSE_NO_RESPONSE') return [tutor({ text: o.message, box: o.coreSummary ?? '', label: '문단 핵심' })];
    return [tutor({ text: o.message, label: tutorLabel[o.action] })];
  }
  private buildStep(p: AttemptRuntime, paragraphText: string, studentText: string, result: SimpleEvaluationResult, next: SimpleParagraphState): Step {
    const output: SimpleOutput = result.output;
    return { stepIndex: p.steps.length, stage: p.state.stage, studentText, output, expectedAction: expectedAction(p.state.stage, output),
      action: output.action, validationFailures: result.validationFailures, call: result.call, message: output.message,
      highlights: next.revealQuotes.map(q => this.locate(paragraphText, q)).filter((h): h is SimpleHighlightView => h !== null) };
  }
  private locate(text: string, quote: string): SimpleHighlightView | null {
    const start = text.indexOf(quote);
    return start < 0 ? null : { start, end: start + quote.length, text: quote, location: 'PASSAGE' };
  }
  private log(r: Runtime, index: number, p: AttemptRuntime, event: LogEvent, error: string | null,
    validationFailures: { rawOutput: unknown; problems: string[] }[]) {
    appendJsonlLine(resolve(this.logDirectory, 'sessions.jsonl'), structuredClone({ schemaVersion: 'dialogue-simple-holistic-record-v2',
      savedAt: new Date().toISOString(), event, sessionId: r.sessionId, passageId: r.passage.passageId, paragraphIndex: index, attemptNumber: p.attemptNumber,
      paragraphId: r.passage.paragraphs[index]!.paragraphId, state: p.state, transcript: p.transcript,
      step: event === 'STEP' ? p.steps.at(-1) : null, error, validationFailures }));
  }

  /** 같은 키의 마지막 줄이 현재 값이다. 옛 줄(attemptNumber 없음)은 stepIndex null=문단, 숫자=시도 1의 단계로 읽는다. */
  private memos(r: Runtime, index: number): { paragraph: string; attempts: Record<number, SimpleAttemptInspection['memos']> } {
    const memos: ReturnType<SimpleDialogueController['memos']> = { paragraph: '', attempts: {} };
    const paragraphId = r.passage.paragraphs[index]!.paragraphId;
    for (const m of readJsonlLines<Omit<SimpleMemoRecord, 'attemptNumber'> & { attemptNumber?: number | null }>(resolve(this.logDirectory, 'memos.jsonl'))) {
      if (m.sessionId !== r.sessionId || m.paragraphId !== paragraphId) continue;
      const attemptNumber = m.attemptNumber === undefined ? (m.stepIndex === null ? null : 1) : m.attemptNumber;
      if (attemptNumber === null) { memos.paragraph = m.text; continue; }
      const entry = memos.attempts[attemptNumber] ??= { attempt: '', steps: {} };
      if (m.stepIndex === null) entry.attempt = m.text; else entry.steps[m.stepIndex] = m.text;
    }
    return memos;
  }

  private paragraphAt(r: Runtime, index: number): ParagraphRuntime {
    if (index >= r.passage.paragraphs.length) throw new Error('존재하지 않는 문단입니다.');
    let p = r.paragraphs.get(index);
    if (!p) { p = { attempts: [newAttempt(1)] }; r.paragraphs.set(index, p); }
    return p;
  }
  private current(p: ParagraphRuntime): AttemptRuntime { return p.attempts.at(-1)!; }
  private require(id: string): Runtime {
    const r = this.sessions.get(id); if (!r) throw new Error('단순 형식 문단 세션을 찾을 수 없습니다.'); return r;
  }
  /** 판정·이유·원출력은 inspect에서만 준다. */
  private view(r: Runtime): SimpleDialogueView {
    const done = r.passage.paragraphs.map((_, i) => r.paragraphs.get(i)?.attempts.some(a => a.state.done) === true);
    const paragraph = this.paragraphAt(r, r.currentIndex);
    const p = this.current(paragraph);
    const allDone = done.every(Boolean);
    return structuredClone({
      sessionId: r.sessionId, passageId: r.passage.passageId, title: r.passage.title, exam: r.passage.exam, currentIndex: r.currentIndex,
      paragraphs: r.passage.paragraphs.map((q, i) => ({ paragraphId: q.paragraphId, position: q.position, text: q.text, done: done[i]! })),
      current: { index: r.currentIndex, messages: p.transcript, done: p.state.done, attemptNumber: p.attemptNumber, attemptCount: paragraph.attempts.length,
        restatedSummary: p.steps.length ? (p.steps.at(-1)!.output as SimpleOutput).restatedSummary : null,
        canStartNewAttempt: p.transcript.some(m => m.role === 'student') && p.status !== 'PROCESSING',
        highlights: p.state.done ? p.steps.at(-1)?.highlights ?? [] : [],
        canRespond: !p.state.done && p.status !== 'PROCESSING', evaluationStatus: p.status,
        evaluationError: p.status === 'RETRYABLE_ERROR' ? '피드백을 만들지 못했어. 쓴 내용은 저장돼 있으니 다시 시도해 줘.' : null },
      allDone, problemUrl: allDone && r.passage.problemQuestionId ? `/problem/dev/v4?questionId=${encodeURIComponent(r.passage.problemQuestionId)}` : null,
    });
  }
}
