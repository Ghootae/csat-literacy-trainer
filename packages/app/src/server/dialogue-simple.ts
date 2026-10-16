import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import {
  OpenAISimpleEvaluator, SimpleEvaluationError, applySimpleAction, evaluateSimple, expectedAction, initialSimpleState,
  type SimpleDialogueMessage, type SimpleEvaluationInput, type SimpleEvaluationResult, type SimpleEvaluator, type SimpleOutput, type SimpleParagraphState,
} from '@csat/pipeline';
import { appendJsonlLine, loadDialoguePassages, readJsonlLines, type DialoguePassageContent } from './content.js';
import type {
  SimpleDialogueView, SimpleHighlightView, SimpleInspection, SimpleMemoRecord, SimpleStepInspection,
} from '../shared/dialogue-simple.js';

export const SimpleRespondSchema = z.object({
  transitionId: z.string().trim().min(1), paragraphIndex: z.number().int().nonnegative(), text: z.string().trim().min(1),
}).strict();
export const SimpleNavigateSchema = z.object({ paragraphIndex: z.number().int().nonnegative() }).strict();
export const SimpleMemoSchema = z.object({
  paragraphIndex: z.number().int().nonnegative(), stepIndex: z.number().int().nonnegative().nullable(), text: z.string(),
}).strict();

type Step = SimpleStepInspection;
interface ParagraphRuntime {
  state: SimpleParagraphState;
  transcript: SimpleDialogueMessage[];
  steps: Step[];
  status: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
}
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
    const p = this.paragraphAt(r, request.paragraphIndex);
    if (p.status === 'PROCESSING') throw new Error('평가 중입니다. 현재 요청 결과를 기다리세요.');
    if (p.state.done) throw new Error('이미 끝난 문단입니다.');
    // 평가 실패로 남은 학생 발화는 새 제출이 대체한다(같은 문장이면 그대로 다시 시도).
    if (p.status === 'RETRYABLE_ERROR') p.transcript.pop();
    p.transcript.push({ role: 'student', text: request.text });
    p.status = 'PROCESSING';
    r.currentIndex = request.paragraphIndex;
    const promise = this.evaluate(r, request.paragraphIndex, p, request.text);
    r.transitions.set(request.transitionId, { fingerprint, promise });
    return promise;
  }

  inspect(sessionId: string, paragraphIndex: number): SimpleInspection {
    const r = this.require(sessionId);
    const p = this.paragraphAt(r, paragraphIndex);
    const { stage, retryUsed, questionsAsked, done, outcome } = p.state;
    return structuredClone({ paragraphIndex, paragraphId: r.passage.paragraphs[paragraphIndex]!.paragraphId,
      state: { stage, retryUsed, questionsAsked, done, outcome }, steps: p.steps, memos: this.memos(r, paragraphIndex) });
  }

  saveMemo(sessionId: string, raw: unknown): SimpleMemoRecord {
    const r = this.require(sessionId);
    const { paragraphIndex, stepIndex, text } = SimpleMemoSchema.parse(raw);
    const p = this.paragraphAt(r, paragraphIndex);
    if (stepIndex !== null && stepIndex >= p.steps.length) throw new Error('존재하지 않는 단계입니다.');
    const record: SimpleMemoRecord = { savedAt: new Date().toISOString(), sessionId, passageId: r.passage.passageId,
      paragraphId: r.passage.paragraphs[paragraphIndex]!.paragraphId, stepIndex, text };
    appendJsonlLine(resolve(this.logDirectory, 'memos.jsonl'), record);
    return record;
  }

  private async evaluate(r: Runtime, index: number, p: ParagraphRuntime, studentText: string): Promise<SimpleDialogueView> {
    const paragraph = r.passage.paragraphs[index]!;
    const input: SimpleEvaluationInput = {
      passage: { title: r.passage.title, paragraphs: r.passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
      targetParagraph: { paragraphId: paragraph.paragraphId, text: paragraph.text },
      stage: p.state.stage, dialogue: structuredClone(p.transcript), targetError: p.state.targetError,
    };
    try {
      const result = await evaluateSimple(this.evaluator, input);
      const next = applySimpleAction(p.state, result.output);
      const step = this.buildStep(p, paragraph.text, studentText, result, next);
      p.steps.push(step); p.state = next; p.transcript.push({ role: 'tutor', text: result.output.message }); p.status = 'IDLE';
      this.log(r, index, p, 'STEP', null, result.validationFailures);
    } catch (error) {
      p.status = 'RETRYABLE_ERROR';
      const failures = error instanceof SimpleEvaluationError ? error.validationFailures : [];
      this.log(r, index, p, 'EVALUATION_FAILED', error instanceof Error ? error.message : String(error), failures);
    }
    return this.view(r);
  }
  private buildStep(p: ParagraphRuntime, paragraphText: string, studentText: string, result: SimpleEvaluationResult, next: SimpleParagraphState): Step {
    const output: SimpleOutput = result.output;
    return { stepIndex: p.steps.length, stage: p.state.stage, studentText, output, expectedAction: expectedAction(p.state.stage, output),
      action: output.action, validationFailures: result.validationFailures, call: result.call, message: output.message,
      highlights: next.revealQuotes.map(q => this.locate(paragraphText, q)).filter((h): h is SimpleHighlightView => h !== null) };
  }
  private locate(text: string, quote: string): SimpleHighlightView | null {
    const start = text.indexOf(quote);
    return start < 0 ? null : { start, end: start + quote.length, text: quote, location: 'PASSAGE' };
  }
  private log(r: Runtime, index: number, p: ParagraphRuntime, event: 'STEP' | 'EVALUATION_FAILED', error: string | null,
    validationFailures: { rawOutput: unknown; problems: string[] }[]) {
    appendJsonlLine(resolve(this.logDirectory, 'sessions.jsonl'), structuredClone({ schemaVersion: 'dialogue-simple-holistic-record-v1',
      savedAt: new Date().toISOString(), event, sessionId: r.sessionId, passageId: r.passage.passageId, paragraphIndex: index,
      paragraphId: r.passage.paragraphs[index]!.paragraphId, state: p.state, transcript: p.transcript,
      step: event === 'STEP' ? p.steps.at(-1) : null, error, validationFailures }));
  }

  /** 같은 키의 마지막 줄이 현재 값이다. */
  private memos(r: Runtime, index: number): SimpleInspection['memos'] {
    const memos: SimpleInspection['memos'] = { paragraph: '', steps: {} };
    const paragraphId = r.passage.paragraphs[index]!.paragraphId;
    for (const m of readJsonlLines<SimpleMemoRecord>(resolve(this.logDirectory, 'memos.jsonl'))) {
      if (m.sessionId !== r.sessionId || m.paragraphId !== paragraphId) continue;
      if (m.stepIndex === null) memos.paragraph = m.text; else memos.steps[m.stepIndex] = m.text;
    }
    return memos;
  }

  private paragraphAt(r: Runtime, index: number): ParagraphRuntime {
    if (index >= r.passage.paragraphs.length) throw new Error('존재하지 않는 문단입니다.');
    let p = r.paragraphs.get(index);
    if (!p) { p = { state: initialSimpleState(), transcript: [], steps: [], status: 'IDLE' }; r.paragraphs.set(index, p); }
    return p;
  }
  private require(id: string): Runtime {
    const r = this.sessions.get(id); if (!r) throw new Error('단순 형식 문단 세션을 찾을 수 없습니다.'); return r;
  }
  /** 판정·이유·원출력은 inspect에서만 준다. */
  private view(r: Runtime): SimpleDialogueView {
    const done = r.passage.paragraphs.map((_, i) => r.paragraphs.get(i)?.state.done === true);
    const p = this.paragraphAt(r, r.currentIndex);
    const allDone = done.every(Boolean);
    return structuredClone({
      sessionId: r.sessionId, passageId: r.passage.passageId, title: r.passage.title, exam: r.passage.exam, currentIndex: r.currentIndex,
      paragraphs: r.passage.paragraphs.map((q, i) => ({ paragraphId: q.paragraphId, position: q.position, text: q.text, done: done[i]! })),
      current: { index: r.currentIndex, messages: p.transcript, done: p.state.done,
        highlights: p.state.done ? p.steps.at(-1)?.highlights ?? [] : [],
        canRespond: !p.state.done && p.status !== 'PROCESSING', evaluationStatus: p.status,
        evaluationError: p.status === 'RETRYABLE_ERROR' ? '피드백을 만들지 못했어. 쓴 내용은 저장돼 있으니 다시 시도해 줘.' : null },
      allDone, problemUrl: allDone && r.passage.problemQuestionId ? `/problem/dev/v4?questionId=${encodeURIComponent(r.passage.problemQuestionId)}` : null,
    });
  }
}
