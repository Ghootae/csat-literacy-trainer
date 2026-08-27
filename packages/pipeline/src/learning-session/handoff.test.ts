import { describe, expect, it } from 'vitest';

import type { DialogueCallMetadata } from '../dialogue-experiment/evaluator.js';
import type { DialogueExperimentSession } from '../dialogue-experiment/session.js';
import type {
  EvaluationResult,
  StudentRepresentationSnapshot,
} from '../dialogue-experiment/schema.js';
import {
  createParagraphUnderstandingHandoff,
  createParagraphUnderstandingRecord,
} from './handoff.js';

const evaluatorRef = {
  runtimeVersion: 'axis-dialogue-v2',
  gatePromptVersion: 'central-story-gate-prompt-v1',
  diagnosticPromptVersion: 'dialogue-axis-diagnostic-prompt-v2',
} as const;

const call: DialogueCallMetadata = {
  provider: 'mock',
  model: 'mock',
  effort: 'none',
  promptVersion: 'axis-dialogue-v2',
  schemaVersion: 'axis-dialogue-openai-v1',
  goldVersion: 'gold-v2',
  goldHash: 'sha256:test',
  calledAt: '2026-08-26T00:00:00.000Z',
  durationMs: 1,
};

function snapshot(
  turn: number,
  relationState: 'unknown' | 'explicit' | 'contradicted',
  axisState: 'unknown' | 'captured' | 'distorted',
): StudentRepresentationSnapshot {
  return {
    turn,
    effectiveResponse: `학생 누적 응답 ${turn}`,
    centralObjectRepresentation: '도파민 약물',
    centralStoryRepresentation: '약물의 작용 위치와 효과를 구별한다.',
    expressedClaims: [{
      description: '학생 주장',
      source: turn === 1 ? 'initial' : 'corrective',
      evidence: `학생이 직접 쓴 근거 ${turn}`,
    }],
    axisStates: [{
      axisId: 'AX1',
      state: axisState,
      evidence: axisState === 'unknown' ? [] : [{
        source: turn === 1 ? 'initial' : 'corrective',
        evidence: `학생 축 근거 ${turn}`,
      }],
    }],
    relationStates: [{
      relationId: 'MR1',
      state: relationState,
      ...(relationState === 'unknown' ? {} : {
        source: turn === 1 ? 'initial' as const : 'corrective' as const,
        evidence: `학생 관계 근거 ${turn}`,
      }),
    }],
    explicitErrors: relationState === 'contradicted' ? [{
      description: '관계 왜곡',
      relatedRelationIds: ['MR1'],
      evidence: `학생 관계 근거 ${turn}`,
    }] : [],
    unresolvedQuestions: relationState === 'unknown' ? ['관계 확인 필요'] : [],
  };
}

function evaluation(
  status: 'PASS' | 'UNCLEAR' | 'ERROR',
  current: StudentRepresentationSnapshot,
  question: { type: 'DIAGNOSTIC' | 'CORRECTIVE'; text: string } | null,
): EvaluationResult {
  return {
    status,
    snapshot: current,
    decisionSummary: '판정',
    targetIssue: status === 'PASS' ? null : { description: '확인 대상', relatedRelationIds: ['MR1'] },
    nextQuestion: question,
    studentFeedback: '피드백',
  };
}

function completedSession(finalStatus: 'PASS' | 'UNRESOLVED' | 'ABORTED'): DialogueExperimentSession {
  const initial = snapshot(1, 'contradicted', 'distorted');
  const final = finalStatus === 'PASS'
    ? snapshot(2, 'explicit', 'captured')
    : snapshot(2, 'contradicted', 'distorted');
  const correctiveQuestion = '카르비도파는 어디에서만 작용한다고 했나요?';
  return {
    experimentId: 'free-response-dialogue-v1',
    sessionId: `session-${finalStatus}`,
    paragraphId: 'dopamine-motor-control-p1',
    startedAt: '2026-08-26T00:00:00.000Z',
    completedAt: '2026-08-26T00:01:00.000Z',
    initialResponse: '카르비도파는 뇌에서 도파민을 오래 작용시킨다.',
    initialSnapshot: initial,
    turns: [{
      evaluation: evaluation('ERROR', initial, {
        type: 'CORRECTIVE',
        text: correctiveQuestion,
      }),
      call,
      questionShown: correctiveQuestion,
      studentAnswer: '다시 보니 말초에서만 작용한다.',
    }, {
      evaluation: evaluation(finalStatus === 'PASS' ? 'PASS' : 'ERROR', final, null),
      call,
      questionShown: null,
      studentAnswer: null,
    }],
    finalStatus,
    finalSnapshot: final,
  };
}

function input(session: DialogueExperimentSession | null, position = 1) {
  return {
    paragraphId: 'dopamine-motor-control-p1',
    paragraphPosition: position,
    goldRef: { version: 'gold-v2', hash: 'sha256:test' },
    evaluatorRef,
    session,
  };
}

describe('paragraph understanding handoff', () => {
  it('PASS 세션에서 관찰과 최종 표상, 교정 궤적을 분리해 만든다', () => {
    const record = createParagraphUnderstandingRecord(input(completedSession('PASS')));

    expect(record.dialogue).toEqual({
      outcome: 'PASS',
      questionsAnswered: 1,
      diagnosticQuestionCount: 0,
      correctiveQuestionCount: 1,
    });
    expect(record.trajectory.correctedRelationIds).toEqual(['MR1']);
    expect(record.trajectory.persistentContradictionIds).toEqual([]);
    expect(record.currentRepresentation.relationStates[0]?.state).toBe('explicit');
    expect(record.observations.followUpAnswers[0]).toMatchObject({
      questionType: 'CORRECTIVE',
      answer: '다시 보니 말초에서만 작용한다.',
    });
  });

  it('질문 문장을 학생의 evidence나 expressed claim으로 새로 승격하지 않는다', () => {
    const record = createParagraphUnderstandingRecord(input(completedSession('PASS')));
    const question = record.observations.followUpAnswers[0]!.question;
    const evidence = JSON.stringify({
      claims: record.currentRepresentation.expressedClaims,
      axes: record.currentRepresentation.axisStates,
      relations: record.currentRepresentation.relationStates,
    });

    expect(evidence).not.toContain(question);
  });

  it('미해결 세션의 지속 모순과 미시도 문단의 빈 표상을 구별한다', () => {
    const unresolved = createParagraphUnderstandingRecord(input(completedSession('UNRESOLVED')));
    const notAttempted = createParagraphUnderstandingRecord(input(null));

    expect(unresolved.dialogue.outcome).toBe('UNRESOLVED');
    expect(unresolved.trajectory.persistentContradictionIds).toEqual(['MR1']);
    expect(notAttempted.dialogue.outcome).toBe('NOT_ATTEMPTED');
    expect(notAttempted.observations.initialResponse).toBeNull();
    expect(notAttempted.currentRepresentation.relationStates).toEqual([]);
  });

  it('이전 모순이 단지 unknown이 된 경우에는 교정으로 과장하지 않는다', () => {
    const session = completedSession('UNRESOLVED');
    const unknownFinal = snapshot(2, 'unknown', 'unknown');
    const record = createParagraphUnderstandingRecord(input({
      ...session,
      finalSnapshot: unknownFinal,
    }));

    expect(record.trajectory.correctedRelationIds).toEqual([]);
    expect(record.trajectory.persistentContradictionIds).toEqual([]);
  });

  it('문단 순서로 정렬된 지문 handoff를 만든다', () => {
    const handoff = createParagraphUnderstandingHandoff({
      passageId: 'dopamine-motor-control',
      generatedAt: '2026-08-26T00:02:00.000Z',
      paragraphs: [
        { ...input(null, 2), paragraphId: 'dopamine-motor-control-p2' },
        input(completedSession('PASS'), 1),
      ],
    });

    expect(handoff.paragraphs.map((paragraph) => paragraph.paragraphPosition)).toEqual([1, 2]);
    expect(handoff.schemaVersion).toBe('paragraph-understanding-handoff-v1');
  });
});
