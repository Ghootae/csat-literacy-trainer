import { randomUUID } from 'node:crypto';
import { z } from 'zod/v4';
import {
  FeedbackCommandSchema, FeedbackEvaluationError, OpenAIFeedbackEvaluator,
  applyFeedbackAssessment, applyFeedbackEndExplanation, createFeedbackSession, feedbackPublicView, submitFeedbackCommand,
  type FeedbackEvaluationCall, type FeedbackEvaluator, type FeedbackSession, type SourceDirectProblemBundle,
} from '@csat/pipeline';
import { loadProblemSolvingBundle } from './content.js';
import { appendFeedbackV4Record } from './session.js';
import type { FeedbackV4View, FeedbackV4WorkbenchView, FeedbackV4Message, FeedbackV4Inspection } from '../shared/problem-feedback-v4.js';
export type { FeedbackV4Request, FeedbackV4View } from '../shared/problem-feedback-v4.js';

export const FeedbackV4RequestSchema = z.object({
  transitionId: z.string().trim().min(1),
  expectedRevision: z.number().int().nonnegative(),
  command: z.union([FeedbackCommandSchema, z.object({ type: z.literal('RESUME') }).strict()]),
}).strict();
export interface FeedbackV4Record {
  schemaVersion: 'problem-feedback-v4-record-v1';
  savedAt: string;
  evidenceContext: 'DEVELOPER';
  transitionId: string | null;
  event: 'STARTED' | 'SUBMITTED' | 'EVALUATED' | 'EVALUATION_FAILED' | 'END_EXPLANATION_UNUSED';
  session: FeedbackSession;
  call: FeedbackEvaluationCall | null;
  error: string | null;
  transcript?: FeedbackV4Message[];
}
interface Runtime {
  session: FeedbackSession;
  evaluationStatus: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
  busy: boolean;
  endGeneration: Promise<boolean> | null;
  evaluation: Promise<void> | null;
  transcript: FeedbackV4Message[];
  transitions: Map<string, { fingerprint: string; promise: Promise<FeedbackV4View> }>;
}

/** Developer-only controller. No actual points or student-state promotion. */
export class ProblemFeedbackV4Controller {
  private readonly sessions = new Map<string, Runtime>();
  private readonly evaluator: FeedbackEvaluator;
  constructor(private readonly options: {
    evaluator?: FeedbackEvaluator;
    loadSource?: (questionId: string) => SourceDirectProblemBundle;
    save?: (record: FeedbackV4Record) => void;
  } = {}) { this.evaluator = options.evaluator ?? new OpenAIFeedbackEvaluator(); }

  start(questionId: string): FeedbackV4WorkbenchView {
    const source = this.options.loadSource?.(questionId) ?? loadProblemSolvingBundle(questionId).source;
    const session = createFeedbackSession(randomUUID(), source);
    const r: Runtime = { session, evaluationStatus: 'IDLE', busy: false, endGeneration: null, evaluation: null, transitions: new Map(), transcript: [] };
    this.appendCoach(r);
    this.save(r, 'STARTED', null, null, null);
    this.sessions.set(session.sessionId, r);
    return this.view(r);
  }
  get(sessionId: string): FeedbackV4WorkbenchView { return this.view(this.require(sessionId)); }

  inspect(sessionId: string): FeedbackV4Inspection {
    const s = this.require(sessionId).session;
    return structuredClone({ revision: s.revision, choiceImpliedVerdict: s.choiceImpliedVerdict,
      comparisons: s.selectionComparisons,
      assessments: s.assessments.map(a => ({ mode: a.mode, reason: a.reason,
        reconstructedPath: a.mode === 'SELECTION' ? a.reconstructedPath : [],
        verdict: a.mode === 'SELECTION' ? a.rationaleImpliedVerdict : null,
        contentAssessment: a.mode === 'SELECTION' ? a.contentAssessment : null,
        studentEvidence: a.mode === 'SELECTION' ? a.studentEvidence : [a.reviewedResponse],
        repairs: a.mode === 'REPAIR' ? a.repairs.map(({ errorId, status }) => ({ errorId, status })) : [], raw: a })),
      errors: s.errors.map(({ errorId, description, kind, status, asked, skipped }) => ({ errorId, description, kind, status, asked, skipped })),
      additionalErrors: s.additionalErrors.map(({ errorId, description, status }) => ({ errorId, description, status })),
    });
  }

  submit(sessionId: string, raw: unknown): Promise<FeedbackV4View> {
    const request = FeedbackV4RequestSchema.parse(raw);
    const r = this.require(sessionId);
    const fingerprint = JSON.stringify({ expectedRevision: request.expectedRevision, command: request.command });
    const prior = r.transitions.get(request.transitionId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('같은 transitionId에 다른 요청을 사용할 수 없습니다.');
      return prior.promise;
    }
    if (r.busy) throw new Error('평가 중입니다. 현재 요청 결과를 기다리세요.');
    if (request.expectedRevision !== r.session.revision) throw new Error('오래된 상태의 제출입니다. 현재 세션을 다시 조회하세요.');
    let next: FeedbackSession;
    if (request.command.type === 'RESUME') {
      if (r.session.phase !== 'AWAITING_EVALUATION' || r.evaluationStatus !== 'RETRYABLE_ERROR') throw new Error('재시도할 평가가 없습니다.');
      next = r.session;
    } else {
      next = submitFeedbackCommand(r.session, request.command, request.transitionId);
      const command = request.command;
      const transcript = [...r.transcript];
      if (command.type === 'SELECT' || command.type === 'RATIONALE' || command.type === 'CORRECT') {
        const text = command.type === 'CORRECT' ? command.text
          : `${command.type === 'SELECT' ? `${next.source.choices.find(c => c.choiceId === command.choiceId)!.position}번 선택\n` : ''}${command.rationale.mode === 'PROVIDED' ? command.rationale.text : '근거 미제출'}`;
        transcript.push({ id: `student-${request.transitionId}`, role: 'STUDENT', text, phase: r.session.phase });
      }
      if (command.type === 'SELECT' && command.rationale.mode === 'PROVIDED' && next.phase === 'AWAITING_EVALUATION') {
        transcript.push({ id: `instant-${request.transitionId}`, role: 'COACH', phase: next.phase, sequence: 'INSTANT',
          text: command.choiceId === next.source.answerChoiceId ? '정답이야! 근거도 같이 살펴볼게.' : '정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.' });
      }
      // Persist accepted observation BEFORE a model call. A failed call never consumes it twice.
      const submitted = { ...r, session: next, transcript };
      this.appendCoach(submitted);
      this.save(submitted, 'SUBMITTED', request.transitionId, null, null);
      r.transcript = submitted.transcript;
    }
    r.session = next;
    r.evaluationStatus = next.phase === 'AWAITING_EVALUATION' ? 'PROCESSING' : 'IDLE';
    const promise = Promise.resolve(this.view(r));
    r.transitions.set(request.transitionId, { fingerprint, promise });
    if (next.phase === 'AWAITING_EVALUATION') {
      r.busy = true;
      r.evaluation = this.evaluate(r, request.transitionId)
        .then(() => {})
        .catch(() => { r.evaluationStatus = 'RETRYABLE_ERROR'; })
        .finally(() => { r.busy = false; r.evaluation = null; });
    } else if (next.phase === 'AWAITING_END_START') this.generateEnd(r, request.transitionId);
    return promise;
  }
  /** Internal test helper; gate explanation generation remains independent. */
  async settled(sessionId: string): Promise<FeedbackV4WorkbenchView> {
    const r = this.require(sessionId);
    await r.evaluation;
    return this.view(r);
  }
  private async evaluate(r: Runtime, transitionId: string): Promise<FeedbackV4View> {
    if (r.session.phase === 'AWAITING_END_START') { this.generateEnd(r, transitionId); return this.view(r); }
    if (r.session.phase !== 'AWAITING_EVALUATION') return this.view(r);
    r.evaluationStatus = 'PROCESSING';
    for (let evaluation = 0; evaluation < 2 && r.session.phase === 'AWAITING_EVALUATION'; evaluation++) {
      if (r.session.evaluationMode === 'END_EXPLANATION') {
        const success = await this.generateEnd(r, transitionId);
        r.evaluationStatus = success ? 'IDLE' : 'RETRYABLE_ERROR';
        break;
      }
      let call: FeedbackEvaluationCall | null = null;
      try {
        // Isolated snapshot protects authoritative state from transports and test doubles.
        call = await this.evaluator.evaluate(structuredClone(r.session));
        const next = applyFeedbackAssessment(r.session, call.rawOutput);
        const evaluated = { ...r, session: next, transcript: [...r.transcript] };
        this.appendCoach(evaluated);
        this.save(evaluated, 'EVALUATED', transitionId, call, null);
        r.transcript = evaluated.transcript;
        r.session = next; r.evaluationStatus = next.phase === 'AWAITING_EVALUATION' ? 'PROCESSING' : 'IDLE';
        if (next.phase === 'AWAITING_END_START') { this.generateEnd(r, transitionId); break; }
      } catch (error) {
        r.evaluationStatus = 'RETRYABLE_ERROR';
        if (error instanceof FeedbackEvaluationError) call = error.call;
        this.save(r, 'EVALUATION_FAILED', transitionId, call, error instanceof Error ? error.message : String(error));
        break;
      }
    }
    return this.view(r);
  }
  private generateEnd(r: Runtime, transitionId: string): Promise<boolean> {
    if (r.endGeneration) return r.endGeneration;
    const snapshot = structuredClone(r.session);
    snapshot.phase = 'AWAITING_EVALUATION'; snapshot.evaluationMode = 'END_EXPLANATION';
    const promise = (async () => {
      let call: FeedbackEvaluationCall | null = null;
      try {
        call = await this.evaluator.evaluate(snapshot);
        // Validation uses the generation snapshot even if the student has already declined.
        applyFeedbackEndExplanation(snapshot, call.rawOutput);
        if (r.session.phase === 'COMPLETED') {
          this.save(r, 'END_EXPLANATION_UNUSED', transitionId, call, null); return true;
        }
        const next = applyFeedbackEndExplanation(r.session, call.rawOutput);
        const evaluated = { ...r, session: next, transcript: [...r.transcript] };
        this.appendCoach(evaluated);
        this.save(evaluated, 'EVALUATED', transitionId, call, null);
        r.session = next; r.transcript = evaluated.transcript;
        if (next.phase === 'AWAITING_UNDERSTANDING') r.evaluationStatus = 'IDLE';
        return true;
      } catch (error) {
        if (error instanceof FeedbackEvaluationError) call = error.call;
        this.save(r, 'EVALUATION_FAILED', transitionId, call, error instanceof Error ? error.message : String(error));
        return false;
      }
    })()
      // A background ledger failure must never surface as an unhandled rejection; the student retries via [응] / RESUME.
      .catch(() => false)
      .finally(() => { if (r.endGeneration === promise) r.endGeneration = null; });
    r.endGeneration = promise;
    return promise;
  }
  private save(r: Runtime, event: FeedbackV4Record['event'], transitionId: string | null, call: FeedbackEvaluationCall | null, error: string | null) {
    (this.options.save ?? appendFeedbackV4Record)(structuredClone({ schemaVersion: 'problem-feedback-v4-record-v1',
      savedAt: new Date().toISOString(), evidenceContext: 'DEVELOPER', transitionId, event, session: r.session, transcript: r.transcript, call, error }));
  }
  private require(id: string) {
    const r = this.sessions.get(id); if (!r) throw new Error('문제 피드백 v4 세션을 찾을 수 없습니다.'); return r;
  }
  private appendCoach(r: Runtime): void {
    if (r.session.phase === 'AWAITING_EVALUATION' || r.session.phase === 'AWAITING_RESELECTION') return;
    const s = r.session;
    const id = `coach-${s.revision}`;
    const add = (suffix: string, text: string, sequence?: FeedbackV4Message['sequence']) => {
      const messageId = id + suffix;
      if (!r.transcript.some(m => m.id === messageId)) r.transcript.push({ id: messageId, role: 'COACH', text, phase: s.phase, ...(sequence ? { sequence } : {}) });
    };
    const number = (choiceId: string) => '①②③④⑤'[s.source.choices.find(c => c.choiceId === choiceId)!.position - 1];
    if (s.phase === 'AWAITING_END_START') {
      // Background storage preserves revision, so these IDs also prevent duplicate gates.
      const correct = s.selections.at(-1)!.choiceId === s.source.answerChoiceId;
      const reason = s.pendingEnd?.endReason;
      const supplement = s.observations.findLast(o => o.selectionNumber === s.selections.length && o.command.type === 'RATIONALE');
      const rationale = supplement?.command.type === 'RATIONALE' ? supplement.command.rationale.mode : s.selections.at(-1)!.rationale.mode;
      const note = reason === 'RATIONALE_UNVERIFIABLE'
        ? rationale === 'PROVIDED'
          ? '네가 쓴 근거만으로는 어떻게 판단했는지 다 알기 어려웠어. 그래서 네 생각을 짐작하지 않고 선지 내용 위주로 볼게.'
          : '근거를 적지 않아서 어떻게 판단했는지는 알 수 없었어. 선지 내용 위주로 볼게.'
        : reason === 'CORRECT_UNVERIFIED'
          ? '네 근거만으로는 이 답에 어떻게 이르렀는지 다 보이지는 않았어. 빠진 연결을 같이 채워 볼게.'
          : null;
      if (note) add('-unverifiable-gate', note, 'GATE');
      if (!correct) add('-gate-1', `정답은 ${number(s.source.answerChoiceId)}번이야.`, 'GATE');
      add('-gate-2', correct ? '네 근거를 하나씩 같이 볼까?' : '네 답을 하나씩 같이 볼까?', 'GATE');
    } else if (s.phase === 'AWAITING_UNDERSTANDING' && s.endExplanation) {
      add('-first-connector', `${s.selections.length === 1 ? '네가 고른' : '처음에 고른'} ${number(s.selections[0]!.choiceId)}번부터 볼게.`, 'CONNECTOR');
      add('-first-section', s.endExplanation.firstChoice + '\n\n설명이 이해됐으면 다음 설명으로 넘어가 보자.', 'SECTION');
      if (s.selections.length === 2) {
        add('-reselection-connector', `다음은 다시 고른 ${number(s.selections[1]!.choiceId)}번이야.`, 'CONNECTOR');
        add('-reselection-section', s.endExplanation.reselection! + '\n\n설명이 이해됐으면 다음 설명으로 넘어가 보자.', 'SECTION');
      }
      add('-answer-connector', `이제 ${number(s.source.answerChoiceId)}번이 정답인 이유를 볼게.`, 'CONNECTOR');
      add('-answer-section', s.endExplanation.answer, 'SECTION');
      add('-question', '이해됐어?', 'QUESTION');
    } else {
      const closing = s.phase === 'COMPLETED' && ['END_START', 'UNDERSTOOD'].includes(s.observations.at(-1)?.command.type ?? '');
      add('', s.message, closing ? 'CLOSING' : undefined);
    }
  }

  private view(r: Runtime): FeedbackV4WorkbenchView {
    return structuredClone({ ...feedbackPublicView(r.session), evaluationStatus: r.evaluationStatus,
      title: r.session.source.title, exam: r.session.source.exam, questionNumber: r.session.source.questionNumber,
      selectedChoiceId: r.session.selections.at(-1)?.choiceId ?? null, transcript: r.transcript,
      // Raw errors can contain source/key material and are kept only in the internal audit log.
      evaluationError: r.evaluationStatus === 'RETRYABLE_ERROR' ? '피드백을 만들지 못했어. 제출한 내용은 저장돼 있으니 다시 시도해 줘.' : null });
  }
}
