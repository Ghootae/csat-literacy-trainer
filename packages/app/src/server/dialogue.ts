import { randomUUID } from 'node:crypto';

import {
  CENTRAL_STORY_GATE_PROMPT_VERSION,
  DIALOGUE_EXPERIMENT_ID,
  DialogueSessionEngine,
  TWO_STAGE_DIALOGUE_PROMPT_VERSION,
  TwoStageDialogueEvaluator,
  createParagraphUnderstandingHandoff,
  type DialogueEvaluator,
  type ParagraphUnderstandingHandoff,
  type DialogueStep,
} from '@csat/pipeline';

import type {
  DialoguePassageSummary,
  DialogueSessionView,
} from '../shared/contract.js';
import {
  loadDialogueGold,
  loadDialoguePassages,
  type DialoguePassageContent,
  type DialoguePassageParagraph,
} from './content.js';

interface ParagraphRuntime {
  engine: DialogueSessionEngine;
  readonly goldRef: { readonly version: string; readonly hash: string };
  initialSubmitted: boolean;
  followUpAnswers: number;
  step: DialogueStep | null;
  outcome: 'ACTIVE' | 'PASS' | 'UNRESOLVED';
}

interface RuntimeSession {
  readonly sessionId: string;
  readonly passage: DialoguePassageContent;
  readonly paragraphs: Map<number, ParagraphRuntime>;
  currentParagraphIndex: number;
  highestVisitedIndex: number;
}

export interface DialogueControllerOptions {
  readonly evaluator?: DialogueEvaluator;
  readonly passageRoot?: string;
}

export class DialogueController {
  private readonly evaluator: DialogueEvaluator;
  private readonly passages: readonly DialoguePassageContent[];
  private readonly sessions = new Map<string, RuntimeSession>();

  constructor(options: DialogueControllerOptions = {}) {
    this.evaluator = options.evaluator ?? new TwoStageDialogueEvaluator();
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

  start(passageId: string): DialogueSessionView {
    const passage = this.passages.find((candidate) => candidate.passageId === passageId);
    if (passage === undefined) throw new Error('등록되지 않은 지문입니다.');
    const summary = this.listPassages().find((candidate) => candidate.passageId === passageId)!;
    if (!summary.available) throw new Error(summary.limitation ?? '이 지문은 아직 사용할 수 없습니다.');
    const sessionId = randomUUID();
    const runtime: RuntimeSession = {
      sessionId,
      passage,
      currentParagraphIndex: 0,
      highestVisitedIndex: 0,
      paragraphs: new Map([[0, this.createParagraphRuntime(passage.paragraphs[0]!)]]),
    };
    this.sessions.set(sessionId, runtime);
    return this.view(runtime);
  }

  get(sessionId: string): DialogueSessionView {
    return this.view(this.requireSession(sessionId));
  }

  createProblemHandoff(sessionId: string): {
    readonly questionId: string;
    readonly handoff: ParagraphUnderstandingHandoff;
  } {
    const runtime = this.requireSession(sessionId);
    const view = this.view(runtime);
    if (view.status !== 'COMPLETED') {
      throw new Error('전체 문단을 PASS한 뒤 문제 풀이로 이동할 수 있습니다.');
    }
    const questionId = runtime.passage.problemQuestionId;
    if (questionId === undefined) throw new Error('이 지문에 연결된 문제가 없습니다.');
    return {
      questionId,
      handoff: createParagraphUnderstandingHandoff({
        passageId: runtime.passage.passageId,
        generatedAt: new Date().toISOString(),
        paragraphs: runtime.passage.paragraphs.map((paragraph, index) => {
          const paragraphRuntime = runtime.paragraphs.get(index);
          if (paragraphRuntime === undefined) throw new Error(`${paragraph.paragraphId}: 문단 세션이 없습니다.`);
          const completed = paragraphRuntime.engine.completedSessionSnapshot;
          if (completed?.finalStatus !== 'PASS') throw new Error(`${paragraph.paragraphId}: PASS 기록이 없습니다.`);
          return {
            paragraphId: paragraph.paragraphId,
            paragraphPosition: paragraph.position,
            goldRef: paragraphRuntime.goldRef,
            evaluatorRef: {
              runtimeVersion: DIALOGUE_EXPERIMENT_ID,
              gatePromptVersion: CENTRAL_STORY_GATE_PROMPT_VERSION,
              diagnosticPromptVersion: TWO_STAGE_DIALOGUE_PROMPT_VERSION,
            },
            session: completed,
          };
        }),
      }),
    };
  }

  async respond(sessionId: string, text: string): Promise<DialogueSessionView> {
    const runtime = this.requireSession(sessionId);
    const paragraph = this.currentParagraph(runtime);
    if (paragraph.outcome !== 'ACTIVE') throw new Error('현재 답변을 제출할 수 없는 상태입니다.');
    const answer = text.trim();
    if (answer === '') throw new Error('응답이 비어 있습니다.');

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
    return this.view(runtime);
  }

  advance(sessionId: string): DialogueSessionView {
    const runtime = this.requireSession(sessionId);
    return this.navigate(sessionId, runtime.currentParagraphIndex + 1);
  }

  navigate(sessionId: string, paragraphIndex: number): DialogueSessionView {
    const runtime = this.requireSession(sessionId);
    if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0 || paragraphIndex >= runtime.passage.paragraphs.length) {
      throw new Error('이동할 문단 번호가 범위를 벗어났습니다.');
    }
    runtime.currentParagraphIndex = paragraphIndex;
    runtime.highestVisitedIndex = Math.max(runtime.highestVisitedIndex, paragraphIndex);
    if (!runtime.paragraphs.has(paragraphIndex)) {
      runtime.paragraphs.set(
        paragraphIndex,
        this.createParagraphRuntime(runtime.passage.paragraphs[paragraphIndex]!),
      );
    }
    return this.view(runtime);
  }

  private requireSession(sessionId: string): RuntimeSession {
    const runtime = this.sessions.get(sessionId);
    if (runtime === undefined) throw new Error('세션을 찾을 수 없습니다. 서버를 다시 시작했다면 새로 시작하세요.');
    return runtime;
  }

  private createParagraphRuntime(paragraph: DialoguePassageParagraph): ParagraphRuntime {
    if (paragraph.goldPath === null) throw new Error(`${paragraph.paragraphId}: 골드가 없습니다.`);
    const { gold, goldHash } = loadDialogueGold(paragraph.goldPath);
    const goldVersion = 'paragraph-diagnostic-gold-v2-reviewed-candidate';
    return {
      engine: new DialogueSessionEngine({
      evaluator: this.evaluator,
      gold,
      goldVersion,
      goldHash,
      maxQuestions: 3,
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

  private view(runtime: RuntimeSession): DialogueSessionView {
    const paragraphRuntime = this.currentParagraph(runtime);
    const step = paragraphRuntime.step;
    const allPassed = runtime.paragraphs.size === runtime.passage.paragraphs.length &&
      [...runtime.paragraphs.values()].every((paragraph) => paragraph.outcome === 'PASS');
    const status: DialogueSessionView['status'] = allPassed
      ? 'COMPLETED'
      : paragraphRuntime.outcome === 'PASS'
        ? 'AWAITING_NEXT'
        : paragraphRuntime.outcome === 'UNRESOLVED'
          ? 'UNRESOLVED'
          : 'ACTIVE';
    return {
      sessionId: runtime.sessionId,
      passageId: runtime.passage.passageId,
      title: runtime.passage.title,
      exam: runtime.passage.exam,
      status,
      currentParagraphIndex: runtime.currentParagraphIndex,
      paragraphCount: runtime.passage.paragraphs.length,
      visibleParagraphs: runtime.passage.paragraphs
        .slice(0, runtime.highestVisitedIndex + 1)
        .map((paragraph, index) => ({
          paragraphId: paragraph.paragraphId,
          position: paragraph.position,
          text: paragraph.text,
          state: index === runtime.currentParagraphIndex ? 'CURRENT' : 'COMPLETED',
        })),
      step: step === null ? null : {
        status: step.evaluation.status,
        feedback: step.evaluation.studentFeedback,
        question: step.questionShown,
        questionType: step.evaluation.nextQuestion?.type ?? null,
        questionsAnswered: paragraphRuntime.followUpAnswers,
        maxQuestions: paragraphRuntime.engine.maxQuestions,
        durationMs: step.call.durationMs,
      },
      nextProblemQuestionId: allPassed ? runtime.passage.problemQuestionId ?? null : null,
    };
  }
}
