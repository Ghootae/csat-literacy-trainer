import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  DialogueCallMetadata,
  DialogueEvaluationInput,
  DialogueEvaluator,
  DialogueHistoryEntry,
} from './evaluator.js';
import type {
  EvaluationResult,
  EvaluationStatus,
  ParagraphDiagnosticGold,
  QuestionType,
  StudentRepresentationSnapshot,
} from './schema.js';
import { emptySnapshot, PASS_STUDENT_FEEDBACK } from './schema.js';

export const DIALOGUE_EXPERIMENT_ID = 'free-response-dialogue-v1';
export const DEFAULT_MAX_DIALOGUE_QUESTIONS = 3;
export const DEFAULT_DIALOGUE_LOG_PATH = resolve(
  process.cwd(),
  '.omc/logs/dialogue-experiment/sessions.jsonl',
);

export type DialogueFinalStatus = 'PASS' | 'UNRESOLVED' | 'ABORTED';

export interface DialogueTurnRecord {
  readonly evaluation: EvaluationResult;
  readonly call: DialogueCallMetadata;
  readonly questionShown: string | null;
  studentAnswer: string | null;
}

export interface DialogueExperimentSession {
  readonly experimentId: string;
  readonly sessionId: string;
  readonly paragraphId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly initialResponse: string;
  readonly initialSnapshot: StudentRepresentationSnapshot;
  readonly turns: readonly DialogueTurnRecord[];
  readonly finalStatus: DialogueFinalStatus;
  readonly finalSnapshot: StudentRepresentationSnapshot;
}

export interface DialogueSessionLogger {
  save(session: DialogueExperimentSession): void;
}

export class JsonlDialogueSessionLogger implements DialogueSessionLogger {
  constructor(readonly path: string = DEFAULT_DIALOGUE_LOG_PATH) {}

  save(session: DialogueExperimentSession): void {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(session)}\n`, 'utf8');
  }
}

export interface DialogueSessionEngineOptions {
  readonly evaluator: DialogueEvaluator;
  readonly gold: ParagraphDiagnosticGold;
  readonly goldVersion: string;
  readonly goldHash: string;
  readonly maxQuestions?: number;
  readonly logger?: DialogueSessionLogger;
  readonly now?: () => Date;
  readonly sessionId?: () => string;
}

export interface DialogueStep {
  readonly evaluation: EvaluationResult;
  readonly call: DialogueCallMetadata;
  readonly questionShown: string | null;
  readonly terminal: boolean;
  readonly finalStatus: DialogueFinalStatus | null;
}

function cloneSnapshot(
  snapshot: StudentRepresentationSnapshot,
): StudentRepresentationSnapshot {
  return structuredClone(snapshot);
}

export class DialogueSessionEngine {
  readonly paragraphId: string;
  readonly maxQuestions: number;
  private readonly evaluator: DialogueEvaluator;
  private readonly gold: ParagraphDiagnosticGold;
  private readonly goldVersion: string;
  private readonly goldHash: string;
  private readonly logger: DialogueSessionLogger;
  private readonly now: () => Date;
  private readonly id: string;
  private readonly startedAt: string;
  private initialResponse: string | undefined;
  private initialSnapshot: StudentRepresentationSnapshot | undefined;
  private finalSnapshot: StudentRepresentationSnapshot | undefined;
  private readonly turns: DialogueTurnRecord[] = [];
  private finalStatus: DialogueFinalStatus | undefined;
  private completedAt: string | undefined;
  private logged = false;

  constructor(options: DialogueSessionEngineOptions) {
    this.evaluator = options.evaluator;
    this.gold = options.gold;
    this.goldVersion = options.goldVersion;
    this.goldHash = options.goldHash;
    this.maxQuestions = options.maxQuestions ?? DEFAULT_MAX_DIALOGUE_QUESTIONS;
    if (!Number.isInteger(this.maxQuestions) || this.maxQuestions < 0) {
      throw new Error('maxQuestions는 0 이상의 정수여야 합니다.');
    }
    this.logger = options.logger ?? new JsonlDialogueSessionLogger();
    this.now = options.now ?? (() => new Date());
    this.id = options.sessionId?.() ?? randomUUID();
    this.startedAt = this.now().toISOString();
    this.paragraphId = this.gold.paragraphId;
  }

  get isTerminal(): boolean {
    return this.finalStatus !== undefined;
  }

  get pendingQuestion(): { readonly type: QuestionType; readonly text: string } | null {
    const last = this.turns.at(-1);
    if (last?.questionShown === null || last?.studentAnswer !== null) return null;
    const question = last?.evaluation.nextQuestion;
    return question === null || question === undefined ? null : question;
  }

  async submitInitial(response: string): Promise<DialogueStep> {
    if (this.initialResponse !== undefined) throw new Error('최초 응답은 한 번만 제출할 수 있습니다.');
    if (this.isTerminal) throw new Error('종료된 세션입니다.');
    const trimmed = response.trim();
    if (trimmed === '') throw new Error('자유 응답이 비어 있습니다.');
    this.initialResponse = trimmed;
    return this.evaluateCurrentEvidence();
  }

  async submitFollowUp(answer: string): Promise<DialogueStep> {
    if (this.initialResponse === undefined) throw new Error('최초 응답이 아직 없습니다.');
    if (this.isTerminal) throw new Error('종료된 세션입니다.');
    const pending = this.turns.at(-1);
    if (pending?.questionShown === null || pending?.studentAnswer !== null) {
      throw new Error('답변할 후속 질문이 없습니다.');
    }
    const trimmed = answer.trim();
    if (trimmed === '') throw new Error('후속 답변이 비어 있습니다.');
    pending.studentAnswer = trimmed;
    return this.evaluateCurrentEvidence();
  }

  abort(): DialogueExperimentSession {
    if (this.isTerminal) return this.completedSession();
    this.finalStatus = 'ABORTED';
    this.finalSnapshot = cloneSnapshot(
      this.finalSnapshot ?? this.initialSnapshot ?? emptySnapshot(),
    );
    return this.persistCompletedSession();
  }

  private history(): DialogueHistoryEntry[] {
    return this.turns.flatMap((turn) => {
      const question = turn.evaluation.nextQuestion;
      if (question === null || turn.questionShown === null || turn.studentAnswer === null) return [];
      return [{ question, answer: turn.studentAnswer }];
    });
  }

  private async evaluateCurrentEvidence(): Promise<DialogueStep> {
    const history = this.history();
    const turn = this.turns.length + 1;
    const input: DialogueEvaluationInput = {
      gold: this.gold,
      goldVersion: this.goldVersion,
      goldHash: this.goldHash,
      initialResponse: this.initialResponse!,
      history,
      turn,
      questionsAsked: history.length,
      maxQuestions: this.maxQuestions,
    };
    const evaluated = await this.evaluator.evaluate(input);
    const result = evaluated.result;

    if (this.initialSnapshot === undefined) {
      this.initialSnapshot = cloneSnapshot(result.snapshot);
    }
    this.finalSnapshot = cloneSnapshot(result.snapshot);

    const questionShown =
      result.status === 'PASS' || history.length >= this.maxQuestions
        ? null
        : result.nextQuestion?.text ?? null;
    this.turns.push({
      evaluation: result,
      call: evaluated.call,
      questionShown,
      studentAnswer: null,
    });

    if (result.status === 'PASS') {
      this.finalStatus = 'PASS';
      this.persistCompletedSession();
    } else if (history.length >= this.maxQuestions) {
      this.finalStatus = 'UNRESOLVED';
      this.persistCompletedSession();
    }

    return {
      evaluation: result,
      call: evaluated.call,
      questionShown,
      terminal: this.isTerminal,
      finalStatus: this.finalStatus ?? null,
    };
  }

  private completedSession(): DialogueExperimentSession {
    if (
      this.finalStatus === undefined ||
      this.finalSnapshot === undefined
    ) {
      throw new Error('아직 완료되지 않은 세션입니다.');
    }
    return {
      experimentId: DIALOGUE_EXPERIMENT_ID,
      sessionId: this.id,
      paragraphId: this.paragraphId,
      startedAt: this.startedAt,
      completedAt: this.completedAt ??= this.now().toISOString(),
      initialResponse: this.initialResponse ?? '',
      initialSnapshot: cloneSnapshot(this.initialSnapshot ?? emptySnapshot()),
      turns: structuredClone(this.turns),
      finalStatus: this.finalStatus,
      finalSnapshot: cloneSnapshot(this.finalSnapshot),
    };
  }

  private persistCompletedSession(): DialogueExperimentSession {
    const session = this.completedSession();
    if (!this.logged) {
      this.logger.save(session);
      this.logged = true;
    }
    return session;
  }
}

export function feedbackLead(status: EvaluationStatus): string {
  if (status === 'PASS') return '';
  if (status === 'UNCLEAR') return '이 부분을 조금 더 확인해 볼게요.';
  return '이 관계를 원문과 다시 비교해 봅시다.';
}

/** 학생 화면에는 structured output이나 내부 상태명이 아니라 이 두 필드만 노출한다. */
export function formatStudentStep(step: DialogueStep): string {
  if (step.evaluation.status === 'PASS') return PASS_STUDENT_FEEDBACK;
  const lead = step.finalStatus === 'UNRESOLVED' ? '' : feedbackLead(step.evaluation.status);
  const lines = [lead, step.evaluation.studentFeedback]
    .filter((line) => line.trim() !== '');
  if (step.questionShown !== null) lines.push(step.questionShown);
  return lines.join('\n');
}
