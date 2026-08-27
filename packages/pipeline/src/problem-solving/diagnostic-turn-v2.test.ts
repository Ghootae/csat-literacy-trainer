import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProblemQuestionGold } from './gold.js';
import {
  adaptProblemPathDiagnosticOutput,
  applyAdaptedProblemEvaluatorTurn,
  migrateDiagnosticTurnV1ToV2,
} from './diagnostic-turn-v2.js';
import { resolveProblemPathEvaluatorIds } from './path-evaluator.js';
import { createProblemPathEvaluatorInput } from './path-evaluator-input.js';
import { createProblemSolvingSession, submitInitialProblemResponse } from './session.js';

const root = resolve(process.cwd(), 'packages/pipeline/fixtures/experiments/problem-solving');
const gold = JSON.parse(readFileSync(
  resolve(root, 'mrna-vaccine-lipid-nanoparticle-q19.json'), 'utf8',
)) as ProblemQuestionGold;
const rawOutput = JSON.parse(readFileSync(
  resolve(root, 'probes/mrna-c2-vague-evaluator-output.json'), 'utf8',
));

function wrongSession() {
  return submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: 'S-ADAPTER', questionId: gold.questionId, answerChoiceId: gold.answerChoiceId,
  }), {
    initialChoiceId: 'C2', rationale: '그냥 이상해 보여요.',
  });
}

describe('diagnostic turn v2 adapter', () => {
  it('UNKNOWN 확인 질문을 가설 발명 없이 DiagnosticTurn으로 변환한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
    const resolved = resolveProblemPathEvaluatorIds(rawOutput, { turnSequence: 1 });
    const adapted = adaptProblemPathDiagnosticOutput({
      evaluatorInput: input, rawOutput, resolvedOutput: resolved,
    });

    expect(adapted.turn.nextAction).toEqual(expect.objectContaining({
      type: 'ASK_DIAGNOSTIC',
      distinguishesHypothesisIds: [],
      resolvesUnknownPathStepIds: ['PS-T1-2'],
    }));
    expect(adapted.turn.targetSnapshots[0]?.hypotheses).toEqual([]);
    expect(adapted.audit.resolvedOutput).toEqual(resolved);
  });

  it('adapter 결과를 세션 엔진이 다시 검증하고 전체 evaluator 감사를 보존한다', () => {
    const session = wrongSession();
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session, gold,
    });
    const resolved = resolveProblemPathEvaluatorIds(rawOutput, { turnSequence: 1 });
    const adapted = adaptProblemPathDiagnosticOutput({
      evaluatorInput: input, rawOutput, resolvedOutput: resolved,
    });
    const applied = applyAdaptedProblemEvaluatorTurn(session, adapted);

    expect(applied.phase).toBe('AWAITING_STUDENT_RESPONSE');
    expect(applied.pendingAction?.type).toBe('ASK_DIAGNOSTIC');
    expect(applied.evaluatorAudits).toHaveLength(1);
  });

  it('합리적 이의는 학생 교정이 아닌 문항 경계 행동으로 변환한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
    const boundary = structuredClone(rawOutput) as any;
    boundary.targets[0].status = 'BOUNDARY_CLARIFICATION_REQUIRED';
    boundary.targets[0].errorAssessment = 'REASONABLE_ALTERNATIVE_INTERPRETATION';
    for (const dimension of [
      'choiceExplained', 'interventionPointLocalized',
      'safeInterventionAvailable', 'actionRelevantAlternativesControlled',
    ]) boundary.targets[0].sufficiency[dimension].satisfied = true;
    boundary.targets[0].sufficiency.sufficient = true;
    boundary.nextActionCandidate = {
      type: 'EXPLAIN_ITEM_BOUNDARY', target: 'SELECTED_CHOICE',
      questionIntent: null, questionText: null,
      studentMessage: '그 해석은 합리적이며 이 문항은 일정 비율의 통제로 해석합니다.',
      supplementalInferenceIds: [],
    };
    const resolved = resolveProblemPathEvaluatorIds(boundary, { turnSequence: 1 });
    const adapted = adaptProblemPathDiagnosticOutput({
      evaluatorInput: input, rawOutput: boundary, resolvedOutput: resolved,
    });

    expect(adapted.turn.nextAction.type).toBe('EXPLAIN_ITEM_BOUNDARY');
  });

  it('재선택은 evaluator의 해결 타깃을 감사에 보존하고 세션 전역 행동으로 정규화한다', () => {
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH', session: wrongSession(), gold,
    });
    const reselection = structuredClone(rawOutput) as any;
    reselection.targets[0].status = 'RESOLVED';
    reselection.targets[0].errorAssessment = 'NO_ERROR_DETECTED';
    for (const dimension of [
      'choiceExplained', 'interventionPointLocalized',
      'safeInterventionAvailable', 'actionRelevantAlternativesControlled',
    ]) reselection.targets[0].sufficiency[dimension].satisfied = true;
    reselection.targets[0].sufficiency.sufficient = true;
    reselection.activeTarget = 'SELECTED_CHOICE';
    reselection.diagnosticDecision.target = 'SELECTED_CHOICE';
    reselection.diagnosticDecision.unresolvedStepRefs = [];
    reselection.nextActionCandidate = {
      type: 'REQUEST_RESELECTION', target: null,
      questionIntent: null, questionText: null,
      studentMessage: '다시 선택해 주세요.', supplementalInferenceIds: [],
    };
    const resolved = resolveProblemPathEvaluatorIds(reselection, { turnSequence: 1 });
    const adapted = adaptProblemPathDiagnosticOutput({
      evaluatorInput: input, rawOutput: reselection, resolvedOutput: resolved,
    });

    expect(adapted.audit.resolvedOutput.activeTarget).toBe('SELECTED_CHOICE');
    expect(adapted.turn.activeTarget).toBeNull();
    expect(adapted.turn.nextAction.type).toBe('REQUEST_RESELECTION');
  });

  it('v1 턴을 새 추론 없이 감사 가능한 v2 봉투로 마이그레이션한다', () => {
    const episode = JSON.parse(readFileSync(
      resolve(root, 'episodes/mrna-q19-c2-ambiguous-speed.json'), 'utf8',
    ));
    const migrated = migrateDiagnosticTurnV1ToV2(episode.turns[0]);

    expect(migrated.audit.source).toBe('LEGACY_V1');
    expect(migrated.audit.resolvedOutput).toBeNull();
    expect(migrated.turn.turnId).toBe('T1');
  });
});
