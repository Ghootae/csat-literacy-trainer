import type { ProblemQuestionGold } from './gold.js';
import {
  adaptProblemPathDiagnosticOutput,
  applyAdaptedProblemEvaluatorTurn,
  type DiagnosticTurnV2,
} from './diagnostic-turn-v2.js';
import { createProblemPathEvaluatorInput } from './path-evaluator-input.js';
import type {
  ProblemPathDiagnosticOutput,
  ProblemPathEvaluatorOutput,
} from './path-evaluator.js';
import type {
  ProblemPathEvaluator,
  ProblemPathEvaluatorCallMetadata,
} from './path-evaluator-runtime.js';
import {
  applyCorrectRationaleAssessment,
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
  submitProblemReselection,
  type ProblemSolvingSession,
} from './session.js';

export interface ProblemVerticalSliceCase {
  readonly caseId: string;
  readonly initialChoiceId: string;
  readonly rationale: string;
  readonly diagnosticAnswers: readonly string[];
  readonly correctiveAnswers: readonly string[];
  readonly coachingAcknowledgement: string;
  readonly reselectionChoiceId: string;
  readonly maxEvaluatorTurns: number;
  readonly includeRepresentativeWrongPaths?: boolean | undefined;
}

export const ProblemVerticalSliceCaseSchema = z.object({
  caseId: z.string().min(1),
  initialChoiceId: z.string().min(1),
  rationale: z.string().min(1),
  diagnosticAnswers: z.array(z.string().min(1)),
  correctiveAnswers: z.array(z.string().min(1)),
  coachingAcknowledgement: z.string().min(1),
  reselectionChoiceId: z.string().min(1),
  maxEvaluatorTurns: z.number().int().positive(),
  includeRepresentativeWrongPaths: z.boolean().optional(),
}).strict();

export interface ProblemVerticalSliceTraceEntry {
  readonly sequence: number;
  readonly evaluatorResult: ProblemPathEvaluatorOutput;
  readonly rawOutput: unknown;
  readonly call: ProblemPathEvaluatorCallMetadata;
  readonly adaptedTurn: DiagnosticTurnV2 | null;
  readonly studentResponse: string | null;
  readonly sessionPhaseAfter: ProblemSolvingSession['phase'];
}

export interface ProblemVerticalSliceResult {
  readonly caseId: string;
  readonly completed: boolean;
  readonly finalSession: ProblemSolvingSession;
  readonly trace: readonly ProblemVerticalSliceTraceEntry[];
}

export async function runProblemVerticalSlice(options: {
  readonly testCase: ProblemVerticalSliceCase;
  readonly gold: ProblemQuestionGold;
  readonly evaluator: ProblemPathEvaluator;
}): Promise<ProblemVerticalSliceResult> {
  const testCase = options.testCase;
  let session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `vertical-${testCase.caseId}`,
    questionId: options.gold.questionId,
    answerChoiceId: options.gold.answerChoiceId,
  }), {
    initialChoiceId: testCase.initialChoiceId,
    rationale: testCase.rationale,
  });
  let previousDiagnosticState: ProblemPathDiagnosticOutput | null = null;
  let diagnosticAnswerIndex = 0;
  let correctiveAnswerIndex = 0;
  const trace: ProblemVerticalSliceTraceEntry[] = [];

  for (let sequence = 1; sequence <= testCase.maxEvaluatorTurns; sequence += 1) {
    if (session.phase === 'COMPLETED') break;
    const mode = session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
      ? 'ASSESS_SELECTION_RATIONALE' as const
      : 'DIAGNOSE_PATH' as const;
    if (session.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT' && session.phase !== 'AWAITING_EVALUATION') {
      throw new Error(`수직 슬라이스가 evaluator를 호출할 수 없는 상태다: ${session.phase}`);
    }
    const input = createProblemPathEvaluatorInput({
      evaluationMode: mode,
      session,
      gold: options.gold,
      previousDiagnosticState,
      includeRepresentativeWrongPaths: testCase.includeRepresentativeWrongPaths ?? true,
    });
    const evaluated = await options.evaluator.evaluate(input);
    if (evaluated.result.mode === 'ASSESS_SELECTION_RATIONALE') {
      session = applyCorrectRationaleAssessment(session, evaluated.result.assessment);
      trace.push({
        sequence,
        evaluatorResult: evaluated.result,
        rawOutput: evaluated.rawOutput,
        call: evaluated.call,
        adaptedTurn: null,
        studentResponse: null,
        sessionPhaseAfter: session.phase,
      });
      continue;
    }

    previousDiagnosticState = evaluated.result;
    const adapted = adaptProblemPathDiagnosticOutput({
      evaluatorInput: input,
      rawOutput: evaluated.rawOutput,
      resolvedOutput: evaluated.result,
    });
    session = applyAdaptedProblemEvaluatorTurn(session, adapted);
    let studentResponse: string | null = null;
    const action = session.pendingAction;
    if (session.phase === 'AWAITING_STUDENT_RESPONSE' && action !== null) {
      if (action.type === 'ASK_DIAGNOSTIC') {
        studentResponse = testCase.diagnosticAnswers[diagnosticAnswerIndex++] ?? null;
      } else if (action.type === 'ASK_CORRECTIVE') {
        studentResponse = testCase.correctiveAnswers[correctiveAnswerIndex++] ?? null;
      } else if (
        action.type === 'DIRECT_COACHING' ||
        action.type === 'EXPLAIN_ITEM_BOUNDARY'
      ) {
        studentResponse = testCase.coachingAcknowledgement;
      }
      if (studentResponse === null) {
        throw new Error(`학생 시뮬레이션 응답이 부족하다: ${action.type}`);
      }
      session = submitProblemActionResponse(session, studentResponse);
    } else if (session.phase === 'AWAITING_RESELECTION') {
      studentResponse = testCase.reselectionChoiceId;
      session = submitProblemReselection(session, {
        selectedChoiceId: testCase.reselectionChoiceId,
      });
    }
    trace.push({
      sequence,
      evaluatorResult: evaluated.result,
      rawOutput: evaluated.rawOutput,
      call: evaluated.call,
      adaptedTurn: adapted,
      studentResponse,
      sessionPhaseAfter: session.phase,
    });
  }

  return {
    caseId: testCase.caseId,
    completed: session.phase === 'COMPLETED',
    finalSession: session,
    trace,
  };
}
import { z } from 'zod/v4';
