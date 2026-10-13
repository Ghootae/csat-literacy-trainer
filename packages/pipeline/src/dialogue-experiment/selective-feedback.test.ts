import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';

import type { DialogueEvaluationInput } from './evaluator.js';
import type { CentralStoryGateResult } from './gate.js';
import { loadDiagnosticGold } from './gold.js';
import {
  OpenAISelectiveFeedbackEvaluator,
  buildSelectiveFeedbackPayload,
  loadSelectiveFeedbackPrompt,
  selectiveStudentFeedback,
  selectDialogueFeedbackRoute,
  selectSparseDetailedRelation,
  validateSelectiveFeedbackOutput,
  locateSourceGuide,
} from './selective-feedback.js';

const loaded = loadDiagnosticGold();
const dialogue: DialogueEvaluationInput = {
  gold: loaded.gold,
  goldVersion: loaded.version,
  goldHash: loaded.hash,
  initialResponse: '주제에 관한 내용이다.',
  history: [],
  turn: 1,
  questionsAsked: 0,
  maxQuestions: 3,
};

function gate(states: readonly ('captured' | 'partial' | 'unknown' | 'distorted')[]): CentralStoryGateResult {
  const status = states.includes('distorted') ? 'DISTORTED' : states.every((state) => state === 'captured')
    ? 'CAPTURED' : 'UNCLEAR';
  return {
    status,
    responseInformationLevel: status === 'CAPTURED' || status === 'DISTORTED'
      ? 'RELATIONAL'
      : states.every((state) => state === 'unknown') ? 'TOPIC_ONLY' : 'RELATIONAL',
    effectiveResponse: dialogue.initialResponse,
    centralObjectRepresentation: '주제',
    centralStoryRepresentation: null,
    expressedClaims: [{ description: '주제 언급', source: 'initial', evidence: '주제' }],
    axisStates: loaded.gold.centralAxes.map((axis, index) => ({
      axisId: axis.id,
      state: states[index] ?? 'unknown',
      evidence: states[index] === 'unknown'
        ? []
        : [{ source: 'initial' as const, evidence: '학생 표현' }],
      retractionEvidence: [],
    })),
    missingAxisEvidence: loaded.gold.centralAxes.flatMap((axis, index) =>
      ['partial', 'unknown'].includes(states[index] ?? 'unknown')
        ? [{ axisId: axis.id, axisQuote: axis.description }] : []),
    targetAxisId: status === 'CAPTURED' ? null : loaded.gold.centralAxes[0]!.id,
    decisionSummary: '판정 근거',
  };
}

describe('selective dialogue feedback boundary', () => {
  it('현재 SERIOUS 질문에만 원문 일치 구간을 안내하며 중복 문구의 출현 위치를 구분한다', () => {
    const decision = { ...gate(loaded.gold.centralAxes.map(() => 'unknown')), questionIntent: '확인',
      axisFeedback: loaded.gold.centralAxes.map((a) => ({ axisId: a.id, status: 'UNCLEAR_SERIOUS' as const, revealedText: null, reason: '확인' })) };
    const input = { dialogue: { ...dialogue, gold: { ...dialogue.gold, paragraphText: '같은 말. 다른 말. 같은 말.' } }, gateDecision: decision, route: 'TARGETED_GAP' as const, selectedDetailedRelation: null };
    const guide = locateSourceGuide({ quote: '같은 말.', occurrence: 1 }, input)!;
    expect(guide).toMatchObject({ start: 12, end: 17, quote: '같은 말.' });
    expect(input.dialogue.gold.paragraphText.slice(guide.start, guide.end)).toBe(guide.quote);
    expect(locateSourceGuide({ quote: '없는 말', occurrence: 0 }, input)).toBeNull();
    expect(locateSourceGuide({ quote: '같은 말.', occurrence: 9 }, input)).toBeNull();
    expect(locateSourceGuide({ quote: '같은 말.', occurrence: -1 }, input)).toBeNull();
    expect(locateSourceGuide({ quote: '같은 말.', occurrence: 0 }, { ...input, route: 'ERROR' })).toBeNull();
    expect(locateSourceGuide({ quote: '같은 말.', occurrence: 0 }, { ...input, dialogue: { ...input.dialogue, questionsAsked: 3 } })).toBeNull();
    for (const status of ['PASS', 'UNCLEAR_OK', 'ERROR'] as const) {
      expect(locateSourceGuide({ quote: '같은 말.', occurrence: 0 }, { ...input, gateDecision: { ...decision,
        axisFeedback: decision.axisFeedback.map((a) => ({ ...a, status })) } })).toBeNull();
    }
  });

  it('V4 원문 안내 계약은 추가 호출 없이 원문 출처를 검증하고 무효 안내 원출력을 남긴다', async () => {
    const decision = { ...gate(loaded.gold.centralAxes.map(() => 'unknown')), questionIntent: '현재 축 확인',
      axisFeedback: loaded.gold.centralAxes.map((a) => ({ axisId: a.id, status: 'UNCLEAR_SERIOUS' as const, revealedText: null, reason: '확인' })) };
    const output = { route: 'TARGETED_GAP', targetAxisId: decision.targetAxisId, selectedRelationId: null,
      targetDescription: '현재 축', studentFeedback: selectiveStudentFeedback('TARGETED_GAP'),
      nextQuestion: { type: 'DIAGNOSTIC', text: '어떤 관계인가요?' }, sourceQuote: { quote: '원문에 없는 인용입니다', occurrence: 0 } };
    const parse = vi.fn().mockResolvedValue({ output_parsed: output });
    const result = await new OpenAISelectiveFeedbackEvaluator({ promptRevision: 'v4', client: { responses: { parse } } as unknown as OpenAI })
      .evaluate({ dialogue, gateDecision: decision, route: 'TARGETED_GAP', selectedDetailedRelation: null });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.result.sourceGuide).toBeNull();
    expect(result.result.nextQuestion).toEqual(output.nextQuestion);
    expect(result.call.decisionAudit?.rawResult).toEqual(output);
    expect(result.call.promptVersion).toBe('dialogue-selective-feedback-prompt-v4-guide-v1');
    expect(parse.mock.calls[0]![0].text.format.schema.required).toContain('sourceQuote');
  });
  it('v3.1의 확인 목적은 재작성 없이 2차 입력으로 전달한다', () => {
    const decision = { ...gate(loaded.gold.centralAxes.map(() => 'partial')), questionIntent: '결과의 특징만 확인하며 이유는 요구하지 않는다.' };
    const payload = JSON.parse(buildSelectiveFeedbackPayload({ dialogue, gateDecision: decision, route: 'TARGETED_GAP', selectedDetailedRelation: null }));
    expect(payload.decision.questionIntent).toBe(decision.questionIntent);
    expect(loadSelectiveFeedbackPrompt('v3.1')).toContain('별도의 확인 목적을 다시 선정하지 않는다');
  });

  it('V2 프롬프트는 질문 초점 제공과 정답 제공을 구분하고 모호한 요청을 금지한다', () => {
    const prompt = loadSelectiveFeedbackPrompt();

    expect(prompt).toContain('확인할 대상, 비교할 조건, 본문 위치 또는 사례는 지정할 수 있다');
    expect(prompt).toContain('두 대상을 함께 언급했다는 이유만으로 정답 제공으로 보지 않는다');
    expect(prompt).toContain('확인 목적이 불분명한 요청은 피한다');
    expect(prompt).toContain('이번 답변만으로는 문단의 핵심 이해를 충분히 확인하지 못했습니다');
  });

  it('부분 포착과 단일 unknown은 TARGETED_GAP, 전부 unknown은 SPARSE_GAP이다', () => {
    const partial = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const singleUnknown = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'unknown' as const : 'captured' as const
    );
    const allUnknown = loaded.gold.centralAxes.map(() => 'unknown' as const);

    expect(selectDialogueFeedbackRoute(gate(partial))).toBe('TARGETED_GAP');
    expect(selectDialogueFeedbackRoute(gate(singleUnknown))).toBe('TARGETED_GAP');
    expect(selectDialogueFeedbackRoute(gate(allUnknown))).toBe('SPARSE_GAP');
  });

  it('TARGETED_GAP payload에는 coreRelations와 상세 관계 설명이 전혀 없다', () => {
    const states = loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    );
    const payload = buildSelectiveFeedbackPayload({
      dialogue,
      gateDecision: gate(states),
      route: 'TARGETED_GAP',
      selectedDetailedRelation: null,
    });

    expect(payload).not.toContain('coreRelations');
    expect(JSON.parse(payload).conciseGold).not.toHaveProperty('centralStory');
    expect(JSON.parse(payload).decision.missingAxisEvidence).toEqual(gate(states).missingAxisEvidence);
    expect(payload).not.toContain('diagnosticRole');
    for (const relation of loaded.gold.coreRelations) {
      expect(payload).not.toContain(relation.description);
    }
  });

  it('SPARSE_GAP payload에는 선택한 상세 관계 하나만 들어간다', () => {
    const decision = gate(loaded.gold.centralAxes.map(() => 'unknown' as const));
    const selected = selectSparseDetailedRelation(loaded.gold, decision, dialogue);
    const payload = buildSelectiveFeedbackPayload({
      dialogue,
      gateDecision: decision,
      route: 'SPARSE_GAP',
      selectedDetailedRelation: selected,
    });

    expect(payload).toContain(selected.description);
    for (const relation of loaded.gold.coreRelations.filter((item) => item.id !== selected.id)) {
      expect(payload).not.toContain(relation.description);
    }
  });

  it('이미 질문한 관계를 피하고 같은 축의 다음 관계를 선택한다', () => {
    const decision = gate(loaded.gold.centralAxes.map(() => 'unknown' as const));
    const first = selectSparseDetailedRelation(loaded.gold, decision, dialogue);
    const second = selectSparseDetailedRelation(loaded.gold, decision, {
      ...dialogue,
      history: [{
        question: { type: 'DIAGNOSTIC', text: '첫 질문' },
        answer: '첫 답변',
        targetRelationIds: [first.id],
      }],
    });
    const targetAxis = loaded.gold.centralAxes[0]!;

    if (targetAxis.relationIds.length > 1) expect(second.id).not.toBe(first.id);
  });

  it('모델이 라우트나 선택 관계를 바꾸면 계약 위반으로 거부한다', async () => {
    const decision = gate(loaded.gold.centralAxes.map(() => 'unknown' as const));
    const selected = selectSparseDetailedRelation(loaded.gold, decision, dialogue);
    const parse = vi.fn(async () => ({
      output_parsed: {
        route: 'TARGETED_GAP',
        targetAxisId: decision.targetAxisId,
        selectedRelationId: null,
        targetDescription: '임의 변경',
        studentFeedback: selectiveStudentFeedback('SPARSE_GAP'),
        nextQuestion: { type: 'DIAGNOSTIC', text: '설명해 보세요.' },
      },
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
      },
    }));
    const evaluator = new OpenAISelectiveFeedbackEvaluator({
      client: { responses: { parse } } as unknown as OpenAI,
      maxTransportRetries: 0,
    });

    await expect(evaluator.evaluate({
      dialogue,
      gateDecision: decision,
      route: 'SPARSE_GAP',
      selectedDetailedRelation: selected,
    })).rejects.toThrow(/route/);
  });

  it('질문 한도가 끝나면 종료 피드백과 null 질문만 허용한다', () => {
    const decision = gate(loaded.gold.centralAxes.map((_, index) =>
      index === 0 ? 'partial' as const : 'captured' as const
    ));
    const exhausted = { ...dialogue, questionsAsked: 3, maxQuestions: 3 };
    const value = {
      route: 'TARGETED_GAP' as const,
      targetAxisId: decision.targetAxisId!,
      selectedRelationId: null,
      targetDescription: '아직 확인하지 못한 핵심 연결',
      studentFeedback: selectiveStudentFeedback('TARGETED_GAP', false),
      nextQuestion: null,
    };

    expect(validateSelectiveFeedbackOutput(value, {
      dialogue: exhausted,
      gateDecision: decision,
      route: 'TARGETED_GAP',
      selectedDetailedRelation: null,
    })).toEqual(value);

    expect(() => validateSelectiveFeedbackOutput({
      ...value,
      nextQuestion: { type: 'DIAGNOSTIC', text: '질문하면 안 됩니다.' },
    }, {
      dialogue: exhausted,
      gateDecision: decision,
      route: 'TARGETED_GAP',
      selectedDetailedRelation: null,
    })).toThrow(/nextQuestion null/);
  });

  it('SPARSE_GAP은 선택된 상세 관계 없이 호출할 수 없다', () => {
    const decision = gate(loaded.gold.centralAxes.map(() => 'unknown' as const));

    expect(() => buildSelectiveFeedbackPayload({
      dialogue,
      gateDecision: decision,
      route: 'SPARSE_GAP',
      selectedDetailedRelation: null,
    })).toThrow(/requires one selected detailed relation/);
  });
});
