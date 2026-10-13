import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import {
  DIALOGUE_EXPERIMENT_ID,
  DialogueSessionEngine,
  JsonlDialogueSessionLogger,
  JsonlDialogueProgressionLogger,
  TwoStageDialogueEvaluator,
  ConditionalMetaDialogueEvaluator,
  type ConditionalMetaGold,
  createParagraphUnderstandingHandoff,
  paragraphEvidenceEvents,
  type DialogueEvaluator,
  type ParagraphUnderstandingHandoff,
  type DialogueStep,
  type ParagraphDiagnosticGold,
} from '@csat/pipeline';

import type {
  DialoguePassageSummary,
  DialogueSessionView,
  DialogueStepView,
  DialogueDeveloperInspection,
  DialogueDeveloperPassage,
  DialogueMode,
} from '../shared/contract.js';
import {
  loadDialogueGold,
  loadConditionalMetaGold,
  loadDialoguePassages,
  type DialoguePassageContent,
  type DialoguePassageParagraph,
} from './content.js';
import type { StudentEvidenceSink } from './student-state.js';

interface ParagraphRuntime {
  readonly metaGold?: ConditionalMetaGold;
  readonly gold: ParagraphDiagnosticGold;
  readonly axisIds: readonly string[];
  busy: boolean;
  studentContinued: boolean;
  engine: DialogueSessionEngine;
  readonly goldRef: { readonly version: string; readonly hash: string };
  initialSubmitted: boolean;
  followUpAnswers: number;
  step: DialogueStep | null;
  outcome: 'ACTIVE' | 'PASS' | 'UNRESOLVED' | 'SKIPPED';
}

interface RuntimeSession {
  readonly mode: DialogueMode;
  readonly developer: boolean;
  readonly sessionId: string;
  readonly passage: DialoguePassageContent;
  readonly paragraphs: Map<number, ParagraphRuntime>;
  currentParagraphIndex: number;
  highestVisitedIndex: number;
  evidenceLogged: boolean;
}

export interface DialogueControllerOptions {
  readonly conditionalEvaluatorFactory?: (assets: ConditionalMetaGold) => DialogueEvaluator;
  readonly evaluator?: DialogueEvaluator;
  readonly passageRoot?: string;
  readonly logDirectory?: string;
  readonly evidenceSink?: StudentEvidenceSink;
  readonly studentId?: string;
}

export class DialogueController {
  private readonly conditionalEvaluatorFactory: (assets: ConditionalMetaGold) => DialogueEvaluator;
  private readonly evaluator: DialogueEvaluator;
  private readonly passages: readonly DialoguePassageContent[];
  private readonly sessions = new Map<string, RuntimeSession>();
  private readonly logDirectory: string;
  private readonly progressionLogger: JsonlDialogueProgressionLogger;
  private readonly evidenceSink: StudentEvidenceSink | null;
  private readonly studentId: string;

  constructor(options: DialogueControllerOptions = {}) {
    this.conditionalEvaluatorFactory = options.conditionalEvaluatorFactory ?? ((assets) => new ConditionalMetaDialogueEvaluator(assets));
    this.evaluator = options.evaluator ?? new TwoStageDialogueEvaluator();
    this.logDirectory = options.logDirectory ?? resolve(process.cwd(), '.omc/logs/dialogue-experiment');
    this.progressionLogger = new JsonlDialogueProgressionLogger(resolve(this.logDirectory, 'progression.jsonl'));
    this.evidenceSink = options.evidenceSink ?? null;
    this.studentId = options.studentId ?? 'local';
    this.passages = options.passageRoot === undefined
      ? loadDialoguePassages()
      : loadDialoguePassages(options.passageRoot);
  }

  listPassages(): readonly DialoguePassageSummary[] {
    return this.passages.map((passage) => {
      const missingGold = passage.paragraphs.some((paragraph) =>
        paragraph.goldPath === null || paragraph.goldReviewStatus === 'awaiting_human_review');
      const available = passage.source.status === 'exact-local-source' && !missingGold;
      return {
        passageId: passage.passageId,
        title: passage.title,
        exam: passage.exam,
        paragraphCount: passage.paragraphs.length,
        available,
        ...(!available
          ? { limitation: passage.source.note ?? '검토된 전체 지문 골드가 아직 없습니다.' }
          : {}),
      };
    });
  }

  start(passageId: string, developer = false, mode: DialogueMode = 'v4'): DialogueSessionView {
    if (mode !== 'v4' && mode !== 'conditional-meta-v1') throw new Error('알 수 없는 평가 모드입니다.');
    if (!developer && mode !== 'v4') throw new Error('실험 모드는 개발자 전용입니다.');
    const passage = this.passages.find((candidate) => candidate.passageId === passageId);
    if (passage === undefined) throw new Error('등록되지 않은 지문입니다.');
    const summary = this.listPassages().find((candidate) => candidate.passageId === passageId)!;
    if (!summary.available) throw new Error(summary.limitation ?? '이 지문은 아직 사용할 수 없습니다.');
    const sessionId = randomUUID();
    const runtime: RuntimeSession = {
      mode,
      developer,
      sessionId,
      passage,
      currentParagraphIndex: 0,
      highestVisitedIndex: 0,
      evidenceLogged: false,
      paragraphs: new Map([[0, this.createParagraphRuntime(passage.paragraphs[0]!, mode)]]),
    };
    this.sessions.set(sessionId, runtime);
    return this.view(runtime);
  }

  get(sessionId: string): DialogueSessionView {
    return this.view(this.requireSession(sessionId));
  }

  developerMap(): readonly DialogueDeveloperPassage[] {
    return this.listPassages().filter((summary) => summary.available).map((summary) => {
      const passage = this.passages.find((p) => p.passageId === summary.passageId)!;
      return { ...summary, paragraphs: passage.paragraphs.map(({ paragraphId, position }) => ({ paragraphId, position })),
        questionIds: passage.problemQuestionId ? [passage.problemQuestionId] : [],
        sessions: [...this.sessions.values()].filter((r) => r.developer && r.passage.passageId === summary.passageId).map((r) => ({
          sessionId: r.sessionId, mode: r.mode, currentParagraphIndex: r.currentParagraphIndex, progress: this.progress(r),
        })).reverse() };
    });
  }

  openDeveloper(passageId: string, paragraphIndex: number, sessionId?: string, fresh = false, mode: DialogueMode = 'v4'): DialogueSessionView {
    if (mode !== 'v4' && mode !== 'conditional-meta-v1') throw new Error('알 수 없는 평가 모드입니다.');
    const passage = this.passages.find((p) => p.passageId === passageId);
    if (!passage || !Number.isInteger(paragraphIndex) || paragraphIndex < 0 || paragraphIndex >= passage.paragraphs.length) throw new Error('이동할 문단이 없습니다.');
    let existing = sessionId && !fresh ? this.requireSession(sessionId) : [...this.sessions.values()].reverse().find((r) => r.developer && r.passage.passageId === passageId && r.mode === mode);
    if (existing && (!existing.developer || existing.passage.passageId !== passageId || existing.mode !== mode)) throw new Error('개발자 테스트 세션의 지문·모드가 일치하지 않습니다.');
    if (fresh) existing = undefined;
    const id = existing?.sessionId ?? this.start(passageId, true, mode).sessionId;
    return this.navigate(id, paragraphIndex);
  }

  inspect(sessionId: string): DialogueDeveloperInspection {
    const runtime = this.requireSession(sessionId);
    const current = this.currentParagraph(runtime);
    const record = current.engine.dialogueRecord;
    return { mode: runtime.mode, ...(current.metaGold ? {metaAxes: current.metaGold.axes.map(({id,metaAxis}) => ({id,metaAxis}))} : {}), gold: structuredClone(current.gold), goldRef: current.goldRef,
      turns: record.turns.map((turn, index) => ({ answer: index === 0 ? record.initialResponse : record.turns[index - 1]!.studentAnswer ?? '',
        evaluation: turn.evaluation,
        ...(turn.evaluationBeforeQuestion ? { evaluationBeforeQuestion: turn.evaluationBeforeQuestion } : {}),
        call: turn.call, ...(turn.questionCall ? { questionCall: turn.questionCall } : {}) })) };
  }

  private progress(runtime: RuntimeSession): NonNullable<DialogueSessionView['progress']> {
    return runtime.passage.paragraphs.map((p, index) => {
      const state = runtime.paragraphs.get(index);
      return { paragraphId: p.paragraphId, position: p.position,
        outcome: state === undefined || (!state.initialSubmitted && !state.studentContinued) ? 'UNSTARTED' : state.outcome,
        studentContinued: state?.studentContinued ?? false };
    });
  }

  private stepView(step: DialogueStep['evaluation'], question: string | null, durationMs: number, questionsAnswered: number): DialogueStepView {
    return { status: step.status, feedback: step.studentFeedback, question,
      ...(step.routing ? {policyAccepted: step.routing.accepted} : {}),
      questionType: step.nextQuestion?.type ?? null, questionsAnswered, maxQuestions: 3, durationMs,
      effectiveResponse: step.snapshot.effectiveResponse ?? null,
      sourceGuide: question && step.sourceGuide ? step.sourceGuide : null };
  }

  createProblemHandoff(sessionId: string): {
    readonly questionId: string;
    readonly handoff: ParagraphUnderstandingHandoff;
    readonly evidenceContext: 'STUDENT' | 'DEVELOPER';
  } {
    const runtime = this.requireSession(sessionId);
    const view = this.view(runtime);
    if (view.status !== 'COMPLETED') {
      throw new Error('각 문단을 마치거나 다음으로 진행한 뒤 문제 풀이로 이동할 수 있습니다.');
    }
    const questionId = runtime.passage.problemQuestionId;
    if (questionId === undefined) throw new Error('이 지문에 연결된 문제가 없습니다.');
    const linked = {
      questionId,
      evidenceContext: runtime.developer ? 'DEVELOPER' as const : 'STUDENT' as const,
      handoff: this.createParagraphHandoff(runtime),
    };
    this.persistParagraphEvidenceIfComplete(runtime, linked.handoff);
    return linked;
  }

  async respond(sessionId: string, text: string): Promise<DialogueSessionView> {
    const runtime = this.requireSession(sessionId);
    const paragraph = this.currentParagraph(runtime);
    if (paragraph.busy) throw new Error('현재 응답을 처리 중입니다.');
    if (paragraph.outcome !== 'ACTIVE') throw new Error('현재 답변을 제출할 수 없는 상태입니다.');
    const answer = text.trim();
    if (answer === '') throw new Error('응답이 비어 있습니다.');

    paragraph.busy = true;
    try {
      if (!paragraph.initialSubmitted) {
        paragraph.step = await paragraph.engine.submitInitial(answer);
        paragraph.initialSubmitted = true;
      } else {
        if (paragraph.engine.pendingQuestion === null) throw new Error('답변할 질문이 없습니다.');
        paragraph.step = await paragraph.engine.submitFollowUp(answer);
        paragraph.followUpAnswers += 1;
      }

      if (paragraph.step.finalStatus === 'PASS') {
        paragraph.outcome = 'PASS';
      } else if (paragraph.step.finalStatus === 'UNRESOLVED') {
        paragraph.outcome = 'UNRESOLVED';
      }
      this.persistParagraphEvidenceIfComplete(runtime);
      return this.view(runtime);
    } finally {
      paragraph.busy = false;
    }
  }

  async requestQuestion(sessionId: string): Promise<DialogueSessionView> {
    const runtime = this.requireSession(sessionId);
    const paragraph = this.currentParagraph(runtime);
    if (paragraph.busy) throw new Error('현재 응답을 처리 중입니다.');
    paragraph.busy = true;
    try {
      paragraph.step = await paragraph.engine.requestQuestion();
      return this.view(runtime);
    } finally {
      paragraph.busy = false;
    }
  }

  advance(sessionId: string): DialogueSessionView {
    const runtime = this.requireSession(sessionId);
    const paragraph = this.currentParagraph(runtime);
    if (paragraph.busy) throw new Error('현재 응답을 처리 중입니다.');
    if (paragraph.outcome !== 'PASS' && !paragraph.studentContinued) {
      const completed = paragraph.engine.continueWithoutRevision();
      paragraph.outcome = completed.finalStatus === 'PASS' ? 'PASS' : completed.finalStatus === 'UNRESOLVED' ? 'UNRESOLVED' : 'SKIPPED';
      const progressionLogger = runtime.mode === 'conditional-meta-v1'
        ? new JsonlDialogueProgressionLogger(resolve(this.logDirectory, 'conditional-meta-v1/progression.jsonl'))
        : this.progressionLogger;
      progressionLogger.save({
        sessionId, paragraphSessionId: completed.sessionId, paragraphId: completed.paragraphId,
        action: 'STUDENT_CONTINUED', outcome: paragraph.outcome,
        evaluationStatus: paragraph.step?.evaluation.status ?? null, at: new Date().toISOString(),
      });
      paragraph.studentContinued = true;
    }
    if (runtime.currentParagraphIndex === runtime.passage.paragraphs.length - 1) {
      this.persistParagraphEvidenceIfComplete(runtime);
      return this.view(runtime);
    }
    return this.navigate(sessionId, runtime.currentParagraphIndex + 1);
  }

  navigate(sessionId: string, paragraphIndex: number): DialogueSessionView {
    const runtime = this.requireSession(sessionId);
    if (this.currentParagraph(runtime).busy) throw new Error('현재 응답을 처리 중입니다.');
    if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0 || paragraphIndex >= runtime.passage.paragraphs.length) {
      throw new Error('이동할 문단 번호가 범위를 벗어났습니다.');
    }
    runtime.currentParagraphIndex = paragraphIndex;
    runtime.highestVisitedIndex = Math.max(runtime.highestVisitedIndex, paragraphIndex);
    if (!runtime.paragraphs.has(paragraphIndex)) {
      runtime.paragraphs.set(
        paragraphIndex,
        this.createParagraphRuntime(runtime.passage.paragraphs[paragraphIndex]!, runtime.mode),
      );
    }
    return this.view(runtime);
  }

  private requireSession(sessionId: string): RuntimeSession {
    const runtime = this.sessions.get(sessionId);
    if (runtime === undefined) throw new Error('세션을 찾을 수 없습니다. 서버를 다시 시작했다면 새로 시작하세요.');
    return runtime;
  }

  private createParagraphRuntime(paragraph: DialoguePassageParagraph, mode: DialogueMode): ParagraphRuntime {
    if (paragraph.goldPath === null) throw new Error(`${paragraph.paragraphId}: 골드가 없습니다.`);
    const loaded = loadDialogueGold(paragraph.goldPath);
    let gold = loaded.gold, goldHash = loaded.goldHash;
    let metaGold: ConditionalMetaGold | undefined;
    if (mode === 'conditional-meta-v1') {
      ({ gold, goldHash, metaGold } = loadConditionalMetaGold(loaded));
    }
    const goldVersion = metaGold ? 'conditional-meta-gold-v1' : 'paragraph-diagnostic-gold-v2-reviewed-candidate';
    return {
      gold,
      ...(metaGold ? {metaGold} : {}),
      axisIds: gold.centralAxes.map((axis) => axis.id),
      busy: false,
      studentContinued: false,
      engine: new DialogueSessionEngine({
        evaluator: metaGold ? this.conditionalEvaluatorFactory(metaGold) : this.evaluator,
        gold,
        goldVersion,
        goldHash,
        maxQuestions: 3,
        logger: new JsonlDialogueSessionLogger(resolve(this.logDirectory, metaGold ? 'conditional-meta-v1/sessions.jsonl' : 'sessions.jsonl')),
      }),
      goldRef: { version: goldVersion, hash: goldHash },
      initialSubmitted: false,
      followUpAnswers: 0,
      step: null,
      outcome: 'ACTIVE',
    };
  }

  private currentParagraph(runtime: RuntimeSession): ParagraphRuntime {
    const paragraph = runtime.paragraphs.get(runtime.currentParagraphIndex);
    if (paragraph === undefined) throw new Error('현재 문단 상태를 찾을 수 없습니다.');
    return paragraph;
  }

  private createParagraphHandoff(runtime: RuntimeSession): ParagraphUnderstandingHandoff {
    return createParagraphUnderstandingHandoff({
      passageId: runtime.passage.passageId,
      generatedAt: new Date().toISOString(),
      paragraphs: runtime.passage.paragraphs.map((paragraph, index) => {
        const paragraphRuntime = runtime.paragraphs.get(index);
        if (paragraphRuntime === undefined) throw new Error(`${paragraph.paragraphId}: 문단 세션이 없습니다.`);
        const completed = paragraphRuntime.engine.completedSessionSnapshot;
        if (completed === null) throw new Error(`${paragraph.paragraphId}: 종료 기록이 없습니다.`);
        return {
          paragraphId: paragraph.paragraphId,
          paragraphPosition: paragraph.position,
          goldRef: paragraphRuntime.goldRef,
          evaluatorRef: {
            runtimeVersion: DIALOGUE_EXPERIMENT_ID,
            gatePromptVersion: completed.turns.at(-1)?.call.stages?.find((stage) => stage.stage === 'central_story_gate')?.promptVersion ?? completed.turns.at(-1)?.call.promptVersion ?? 'not-evaluated',
            diagnosticPromptVersion: completed.turns.at(-1)?.call.promptVersion ?? 'not-evaluated',
          },
          session: completed,
          ...(paragraphRuntime.studentContinued ? { progression: 'STUDENT_CONTINUED' as const } : {}),
        };
      }),
    });
  }

  private persistParagraphEvidenceIfComplete(runtime: RuntimeSession, handoff?: ParagraphUnderstandingHandoff): void {
    if (runtime.evidenceLogged || this.evidenceSink === null || this.view(runtime).status !== 'COMPLETED') return;
    this.evidenceSink.save(paragraphEvidenceEvents({
      studentId: this.studentId,
      learningSessionId: runtime.sessionId,
      handoff: handoff ?? this.createParagraphHandoff(runtime),
      context: runtime.developer ? 'DEVELOPER' : 'STUDENT',
    }));
    runtime.evidenceLogged = true;
  }

  private view(runtime: RuntimeSession): DialogueSessionView {
    const paragraphRuntime = this.currentParagraph(runtime);
    const step = paragraphRuntime.step;
    const record = paragraphRuntime.engine.dialogueRecord;
    const allFinished = runtime.paragraphs.size === runtime.passage.paragraphs.length &&
      [...runtime.paragraphs.values()].every((paragraph) => paragraph.outcome === 'PASS' || paragraph.studentContinued);
    const status: DialogueSessionView['status'] = allFinished
      ? 'COMPLETED'
      : paragraphRuntime.outcome === 'PASS'
        ? 'AWAITING_NEXT'
        : paragraphRuntime.outcome === 'UNRESOLVED'
          ? 'UNRESOLVED'
          : 'ACTIVE';
    return {
      mode: runtime.mode,
      sessionId: runtime.sessionId,
      passageId: runtime.passage.passageId,
      title: runtime.passage.title,
      exam: runtime.passage.exam,
      status,
      currentParagraphIndex: runtime.currentParagraphIndex,
      paragraphCount: runtime.passage.paragraphs.length,
      progress: this.progress(runtime),
      transcript: record.turns.map((turn, index) => ({
        answer: index === 0 ? record.initialResponse : record.turns[index - 1]!.studentAnswer ?? '',
        step: this.stepView(turn.evaluation, turn.questionShown, turn.call.durationMs, index),
        ...(turn.evaluationBeforeQuestion ? {
          feedbackStep: this.stepView(turn.evaluationBeforeQuestion, null, turn.call.durationMs, index),
        } : {}),
      })),
      axisBoxes: paragraphRuntime.axisIds.map((axisId) => {
        const axis = step?.evaluation.snapshot.axisFeedback?.find((item) => item.axisId === axisId);
        const policyRoute = step?.evaluation.routing?.axes.find((a)=>a.axisId===axisId)?.route;
        return { axisId, status: axis?.status ?? 'PENDING', revealedText: axis?.revealedText ?? null, ...(policyRoute ? {policyRoute} : {}) };
      }),
      canRequestQuestion: paragraphRuntime.engine.canRequestQuestion,
      canRespond: paragraphRuntime.outcome === 'ACTIVE' &&
        (!paragraphRuntime.initialSubmitted || paragraphRuntime.engine.pendingQuestion !== null),
      currentOutcome: paragraphRuntime.outcome,
      studentContinued: paragraphRuntime.studentContinued,
      visibleParagraphs: runtime.passage.paragraphs
        .slice(0, runtime.highestVisitedIndex + 1)
        .map((paragraph, index) => ({
          paragraphId: paragraph.paragraphId,
          position: paragraph.position,
          text: paragraph.text,
          state: index === runtime.currentParagraphIndex ? 'CURRENT' : 'COMPLETED',
        })),
      step: step === null ? null : this.stepView(step.evaluation, step.questionShown, step.call.durationMs, paragraphRuntime.followUpAnswers),
      nextProblemQuestionId: allFinished ? runtime.passage.problemQuestionId ?? null : null,
    };
  }
}
