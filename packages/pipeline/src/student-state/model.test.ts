import { describe, expect, it } from 'vitest';

import { ParagraphUnderstandingHandoffSchema } from '../learning-session/handoff.js';
import { ProblemSolvingSessionSchema } from '../problem-solving/session.js';
import {
  aggregateStudentState,
  generatePeriodicFeedback,
  paragraphEvidenceEvents,
  problemEvidenceEvents,
  StudentEvidenceEventSchema,
  type StudentEvidenceEvent,
} from './model.js';

const at = '2026-10-01T00:00:00.000Z';

function handoff() {
  return ParagraphUnderstandingHandoffSchema.parse({
    schemaVersion: 'paragraph-understanding-handoff-v1',
    passageId: 'passage-1', generatedAt: at,
    paragraphs: [{
      paragraphId: 'p1', paragraphPosition: 1,
      goldRef: { version: 'gold-v1', hash: 'hash' },
      evaluatorRef: { runtimeVersion: 'runtime-v1', gatePromptVersion: 'gate-v1', diagnosticPromptVersion: 'question-v1' },
      dialogue: { outcome: 'PASS', questionsAnswered: 2, diagnosticQuestionCount: 1, correctiveQuestionCount: 1 },
      currentRepresentation: {
        effectiveResponse: '수정한 요약', diagnosticRoute: null, capturedAxisIds: ['AX1'], unresolvedAxisIds: ['AX2'],
        repairTargetRecovered: true, summaryComplete: false,
        centralObjectRepresentation: null, centralStoryRepresentation: null, expressedClaims: [],
        axisStates: [], explicitErrors: [], unresolvedQuestions: [],
        relationStates: [
          { relationId: 'R1', state: 'explicit', source: 'corrective', evidence: '수정했습니다' },
          { relationId: 'R2', state: 'contradicted', source: 'initial', evidence: '잘못 이해했습니다' },
          { relationId: 'R3', state: 'unknown' },
        ],
      },
      trajectory: {
        initialAxisStates: [
          { axisId: 'AX1', state: 'captured', evidence: [{ source: 'initial', evidence: '핵심 관계' }] },
          { axisId: 'AX2', state: 'partial', evidence: [{ source: 'initial', evidence: '일부 관계' }] },
        ],
        initialRelationStates: [
          { relationId: 'R1', state: 'contradicted', source: 'initial', evidence: '반대로 이해' },
          { relationId: 'R2', state: 'contradicted', source: 'initial', evidence: '계속 잘못 이해' },
          { relationId: 'R3', state: 'unknown' },
        ],
        correctedRelationIds: ['R1'], persistentContradictionIds: ['R2'], newlyConfirmedRelationIds: [],
      },
      observations: { initialResponse: '최초 요약', followUpAnswers: [] },
    }],
  });
}

function completedProblem() {
  return ProblemSolvingSessionSchema.parse({
    schemaVersion: 'problem-solving-session-v10', sessionId: 'problem-session', questionId: 'q1', answerChoiceId: 'C2',
    phase: 'COMPLETED', entryReason: 'WRONG_CHOICE', latestChoiceId: 'C2', initialChoiceId: 'C1',
    rationaleAssessment: 'SUPPORTED', pendingCorrectOutcome: null, selectionAttempt: 2, selectionCount: 2,
    interventionCount: 1, interventionCountForCurrentSelection: 0,
    limits: { maxDiagnosticQuestions: 2, diagnosticQuestionsUsed: 0, maxQuestionsPerWrongAttempt: 2, questionsUsedThisAttempt: 0, maxSelectionAttempts: 3 },
    requiredNextAction: 'ANY', completeAfterCoachingAcknowledgement: false, requestReselectionAfterCoachingAcknowledgement: false,
    pendingAction: null,
    observations: [
      { observationId: 'o1', kind: 'INITIAL_SUBMISSION', initialChoiceId: 'C1', submittedChoiceId: 'C1', confidence: 80, rationale: '최초 근거', strategy: null, runnerUp: null },
      { observationId: 'o2', kind: 'RESELECTION', inReplyToTurnId: 't1', selectedChoiceId: 'C2', rawResponse: 'C2로 수정', rationaleProvided: true },
    ],
    turns: [], rejectedEvaluatorProposals: [], evaluatorAudits: [],
    result: {
      outcome: 'RESELECTION_CORRECT_VERIFIED', finalChoiceId: 'C2', correct: true, initialChoiceWasCorrect: false,
      selectionAttempt: 2, rationaleSubmission: 'PROVIDED', rationaleAssessment: 'SUPPORTED', rationaleNonEvaluationReason: null,
      answerRevealed: false, resolvedByStudent: true, resolutionStage: 'SECOND_SELECTION',
      resolutionOutcome: 'SECOND_SELECTION_CORRECT_VERIFIED', interventionPath: 'CORRECTIVE_ONLY',
      interventionHistory: ['CORRECTIVE_QUESTION'], effectiveRepairPath: 'CORRECTIVE_ONLY',
      answerExplanation: null, answerReveal: null,
    },
  });
}

describe('student state evidence', () => {
  it('문단의 최초 이해와 관계 교정을 원판정 손실 없이 분리한다', () => {
    const events = paragraphEvidenceEvents({ studentId: 'student', learningSessionId: 'learning', handoff: handoff() });
    expect(events.map((event) => [event.dimension, event.judgment, event.assistance])).toEqual([
      ['CORE_COMPREHENSION', 'POSITIVE', 'INDEPENDENT'],
      ['CORE_COMPREHENSION', 'INDETERMINATE', 'INDEPENDENT'],
      ['REPAIR_RECOVERY', 'POSITIVE', 'CORRECTIVE'],
      ['REPAIR_RECOVERY', 'NEGATIVE', 'CORRECTIVE'],
      ['REPAIR_RECOVERY', 'INDETERMINATE', 'CORRECTIVE'],
    ]);
    expect(events[1]!.observation).toMatchObject({ kind: 'PARAGRAPH_INITIAL_AXIS', initialState: 'partial' });
    expect(events[4]!.observation).toMatchObject({ kind: 'PARAGRAPH_RELATION_TRANSITION', transition: 'PERSISTENT_UNKNOWN' });
  });

  it('문제의 최초 근거, 회복, 확신도 오차를 별도 증거로 만든다', () => {
    const events = problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'learning', passageId: 'passage-1', observedAt: at,
      evaluatorVersion: 'problem-v3', session: completedProblem(),
    });
    expect(events.map((event) => [event.dimension, event.judgment, event.assistance])).toEqual([
      ['GROUNDED_PROBLEM_SOLVING', 'NEGATIVE', 'INDEPENDENT'],
      ['REPAIR_RECOVERY', 'POSITIVE', 'CORRECTIVE'],
      ['SELF_MONITORING', 'INDETERMINATE', 'INDEPENDENT'],
    ]);
    expect(events[2]!.observation).toMatchObject({ kind: 'CONFIDENCE_CALIBRATION', absoluteError: 0.8 });
    expect(events[2]!.observation.kind === 'CONFIDENCE_CALIBRATION' && events[2]!.observation.squaredError).toBeCloseTo(0.64);
  });

  it('문제 최초 선택과 근거의 모든 판정 경계를 구별한다', () => {
    const cases: Array<{
      initialChoiceWasCorrect: boolean;
      rationaleAssessment: 'NOT_PROVIDED' | 'NOT_EVALUATED' | 'SUPPORTED' | 'UNCERTAIN' | 'CLEAR_ERROR';
      expected: 'POSITIVE' | 'NEGATIVE' | 'INDETERMINATE';
    }> = [
      { initialChoiceWasCorrect: true, rationaleAssessment: 'SUPPORTED', expected: 'POSITIVE' },
      { initialChoiceWasCorrect: true, rationaleAssessment: 'UNCERTAIN', expected: 'INDETERMINATE' },
      { initialChoiceWasCorrect: true, rationaleAssessment: 'NOT_PROVIDED', expected: 'INDETERMINATE' },
      { initialChoiceWasCorrect: true, rationaleAssessment: 'NOT_EVALUATED', expected: 'INDETERMINATE' },
      { initialChoiceWasCorrect: true, rationaleAssessment: 'CLEAR_ERROR', expected: 'NEGATIVE' },
      { initialChoiceWasCorrect: false, rationaleAssessment: 'SUPPORTED', expected: 'NEGATIVE' },
    ];
    for (const item of cases) {
      const session = structuredClone(completedProblem());
      Object.assign(session.result!, item);
      const grounding = problemEvidenceEvents({
        studentId: 'student', learningSessionId: `learning-${item.initialChoiceWasCorrect}-${item.rationaleAssessment}`,
        observedAt: at, evaluatorVersion: 'problem-v3', session,
      }).find((event) => event.dimension === 'GROUNDED_PROBLEM_SOLVING');
      expect(grounding?.judgment).toBe(item.expected);
    }
  });

  it('문제 교정 경로를 도움 수준과 해결 결과로 분리한다', () => {
    const cases = [
      ['DIAGNOSTIC_ONLY', 'DIAGNOSTIC'],
      ['CORRECTIVE_ONLY', 'CORRECTIVE'],
      ['DIAGNOSTIC_THEN_CORRECTIVE', 'CORRECTIVE'],
      ['ITEM_BOUNDARY', 'COACHING'],
      ['DIRECT_COACHING', 'COACHING'],
      ['STATIC_ANSWER_EXPLANATION', 'ANSWER_REVEALED'],
    ] as const;
    for (const [effectiveRepairPath, expectedAssistance] of cases) {
      const session = structuredClone(completedProblem());
      Object.assign(session.result!, { effectiveRepairPath, interventionPath: effectiveRepairPath });
      const repair = problemEvidenceEvents({
        studentId: 'student', learningSessionId: `repair-${effectiveRepairPath}`,
        observedAt: at, evaluatorVersion: 'problem-v3', session,
      }).find((event) => event.dimension === 'REPAIR_RECOVERY');
      expect(repair).toMatchObject({ judgment: 'POSITIVE', assistance: expectedAssistance });
    }

    const revealed = structuredClone(completedProblem());
    Object.assign(revealed.result!, {
      effectiveRepairPath: 'STATIC_ANSWER_EXPLANATION', interventionPath: 'STATIC_ANSWER_EXPLANATION',
      resolvedByStudent: false, answerRevealed: true, resolutionStage: 'ANSWER_REVEALED',
    });
    expect(problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'answer-revealed', observedAt: at,
      evaluatorVersion: 'problem-v3', session: revealed,
    }).find((event) => event.dimension === 'REPAIR_RECOVERY')).toMatchObject({
      judgment: 'NEGATIVE', assistance: 'ANSWER_REVEALED',
    });
  });

  it('선택하지 않은 확신도와 미완료 결과를 증거로 만들지 않는다', () => {
    const noConfidence = structuredClone(completedProblem());
    const initial = noConfidence.observations.find((observation) => observation.kind === 'INITIAL_SUBMISSION');
    if (initial?.kind === 'INITIAL_SUBMISSION') initial.confidence = null;
    expect(problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'no-confidence', observedAt: at,
      evaluatorVersion: 'problem-v3', session: noConfidence,
    }).some((event) => event.dimension === 'SELF_MONITORING')).toBe(false);

    const unfinished = structuredClone(completedProblem());
    unfinished.result = null;
    expect(problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'unfinished', observedAt: at,
      evaluatorVersion: 'problem-v3', session: unfinished,
    })).toEqual([]);
  });

  it('관측 종류와 차원·출처·계산값이 어긋난 손상 증거를 거부한다', () => {
    const confidence = problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'confidence-contract', observedAt: at,
      evaluatorVersion: 'problem-v3', session: completedProblem(),
    }).find((event) => event.observation.kind === 'CONFIDENCE_CALIBRATION')!;
    expect(() => StudentEvidenceEventSchema.parse({ ...confidence, dimension: 'CORE_COMPREHENSION' })).toThrow(/상태 차원/);
    expect(() => StudentEvidenceEventSchema.parse({ ...confidence, source: { ...confidence.source, kind: 'PARAGRAPH' } })).toThrow(/출처 종류/);
    expect(() => StudentEvidenceEventSchema.parse({
      ...confidence,
      observation: { ...confidence.observation, absoluteError: 0.1, squaredError: 0.01 },
    })).toThrow(/확신도 오차/);
  });

  it('반복 증거만 강점·연습 피드백으로 승격하고 자료 부족은 단정하지 않는다', () => {
    const base = paragraphEvidenceEvents({ studentId: 'student', learningSessionId: 'learning', handoff: handoff() })[0]!;
    const events: StudentEvidenceEvent[] = Array.from({ length: 8 }, (_, index) => ({
      ...structuredClone(base), eventId: `e${index}`, learningSessionId: `l${index}`,
      source: { ...base.source, contentId: `p${index}` }, judgment: index < 7 ? 'POSITIVE' : 'NEGATIVE',
    }));
    const profile = aggregateStudentState({ studentId: 'student', generatedAt: at, events });
    expect(profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')).toMatchObject({
      positive: 7, negative: 1, reliability: 'REPEATED_PATTERN', distinctContentCount: 8, determinateDistinctContentCount: 8,
    });
    const feedback = generatePeriodicFeedback(profile);
    expect(feedback.strengths[0]).toContain('긍정 증거 7건');
    expect(feedback.strengths[0]).toContain('반복해서 더 많이 확인');
    expect(feedback.caveats).toContain('콘텐츠 난이도가 보정되지 않아 차원 간 점수나 절대 능력으로 해석할 수 없습니다.');

    const thinProfile = aggregateStudentState({ studentId: 'student', generatedAt: at, events: events.slice(0, 1) });
    const thinFeedback = generatePeriodicFeedback(thinProfile);
    expect(thinFeedback.strengths).toEqual([]);
    expect(thinFeedback.focusAreas).toEqual([]);
    expect(thinFeedback.headline).toContain('판단 가능한 수행 증거 1건');

    const duplicateProfile = aggregateStudentState({ studentId: 'student', generatedAt: at, events: [events[0]!, events[0]!] });
    expect(duplicateProfile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')?.positive).toBe(1);
    expect(() => aggregateStudentState({
      studentId: 'student', generatedAt: at,
      events: [events[0]!, { ...events[0]!, judgment: 'NEGATIVE' }],
    })).toThrow(/같은 eventId/);
    expect(() => aggregateStudentState({
      studentId: 'student', generatedAt: at,
      events: [events[0]!, { ...events[1]!, context: 'DEVELOPER' }],
    })).toThrow(/학생용과 개발자용/);
  });

  it('판단 유보의 양이 확정 패턴의 신뢰도를 부풀리지 않는다', () => {
    const base = paragraphEvidenceEvents({ studentId: 'student', learningSessionId: 'learning', handoff: handoff() })[0]!;
    const events: StudentEvidenceEvent[] = Array.from({ length: 8 }, (_, index) => ({
      ...structuredClone(base), eventId: `uncertain-${index}`, learningSessionId: `uncertain-learning-${index}`,
      source: { ...base.source, contentId: `uncertain-content-${index}` },
      judgment: index === 0 ? 'POSITIVE' : 'INDETERMINATE',
    }));
    const profile = aggregateStudentState({ studentId: 'student', generatedAt: at, events });
    expect(profile.dimensions.find((item) => item.dimension === 'CORE_COMPREHENSION')).toMatchObject({
      positive: 1, negative: 0, indeterminate: 7, distinctContentCount: 8,
      determinateDistinctContentCount: 1, reliability: 'INSUFFICIENT',
    });
    expect(generatePeriodicFeedback(profile).strengths).toEqual([]);
  });

  it('확신도 비교만 충분한 프로필의 헤드라인과 자기 점검 피드백이 모순되지 않는다', () => {
    const confidence = problemEvidenceEvents({
      studentId: 'student', learningSessionId: 'confidence-base', observedAt: at,
      evaluatorVersion: 'problem-v3', session: completedProblem(),
    }).find((event) => event.observation.kind === 'CONFIDENCE_CALIBRATION')!;
    const events: StudentEvidenceEvent[] = Array.from({ length: 3 }, (_, index) => ({
      ...structuredClone(confidence), eventId: `confidence-${index}`, learningSessionId: `confidence-learning-${index}`,
      source: { ...confidence.source, contentId: `confidence-question-${index}` },
      observation: {
        kind: 'CONFIDENCE_CALIBRATION' as const,
        confidence: 20, initialChoiceWasCorrect: false, absoluteError: 0.2, squaredError: 0.04,
      },
    }));
    const profile = aggregateStudentState({ studentId: 'student', generatedAt: at, events });
    const feedback = generatePeriodicFeedback(profile);
    expect(profile.selfMonitoring).toMatchObject({ observationCount: 3, distinctContentCount: 3, reliability: 'EARLY_PATTERN' });
    expect(feedback.headline).toBe('현재 피드백은 확신도 비교 3건을 바탕으로 합니다.');
    expect(feedback.strengths).toContain('확신도와 최초 정오의 차이가 3개 문제에서 비교적 작았습니다.');
    expect(feedback.headline).not.toContain('부족');

    const overconfident = events.map((event) => ({
      ...structuredClone(event),
      observation: {
        kind: 'CONFIDENCE_CALIBRATION' as const,
        confidence: 80, initialChoiceWasCorrect: false, absoluteError: 0.8, squaredError: 0.64,
      },
    }));
    const overconfidentFeedback = generatePeriodicFeedback(aggregateStudentState({
      studentId: 'student', generatedAt: at, events: overconfident,
    }));
    expect(overconfidentFeedback.focusAreas[0]).toContain('선택 전 근거를 다시 확인');
    expect(overconfidentFeedback.nextAction).toBe('다음 문제에서는 선택 전에 근거를 한 번 더 확인한 뒤 확신도를 기록해 보세요.');
    expect(overconfidentFeedback.nextAction).not.toBe(overconfidentFeedback.focusAreas[0]);
  });
});
