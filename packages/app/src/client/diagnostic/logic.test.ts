import { gradeOfPercentile as serverGrade } from '@csat/pipeline';
import { describe, expect, it } from 'vitest';
import {
  answerQuality, branchRows, gradeOfPercentile, hasPending, sourceLocationName, cardStepName, cardTwists, cellState, circledObject, eulReul, focusRationale, gradeText, layerSentence, newTimer, passageResultSentence,
  rangeBar, recommendationLines, solveStats, startTimer, stepTendency, stopTimer, summaryLinkSentence, sumCounts, timerValues, twistTags, zOfPercentile,
} from './logic.js';
import type { ReadingCounts, ResultItem } from './types.js';

const item = (over: Partial<ResultItem> = {}): ResultItem => ({
  questionId: 'q', passageId: 'p', questionNumber: 12, chosenPosition: 2, correct: true, rationale: 'PROVIDED', megastudy: { chosenPercents: [4, 2], correctRate: [70, 80] },
  afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: 1,
  judgment: { status: 'ready', contentAssessment: 'SUPPORTED', boundary: 'NONE' }, twist: null, thoughtDiagnosis: null, evidence: null, summaryLink: null, ...over });

describe('지문 결과 문장', () => {
  it('기본·근거 문장·괄호(근거 생략·확인 중)를 규칙대로 만든다', () => {
    const card = { total: 5, correct: 4, rationaleDenominator: 4, supported: 3, omitted: 1, checking: 0 };
    expect(passageResultSentence(card)).toBe('이 지문의 5문항 중 4개를 맞혔어. 근거를 쓴 4개 중 3개가 적절했어(1개는 근거 생략).');
    expect(passageResultSentence({ ...card, checking: 2 })).toBe('이 지문의 5문항 중 4개를 맞혔어. 근거를 쓴 4개 중 3개가 적절했어(1개는 근거 생략, 2개는 확인 중이야).');
    expect(passageResultSentence({ ...card, omitted: 0 })).toBe('이 지문의 5문항 중 4개를 맞혔어. 근거를 쓴 4개 중 3개가 적절했어.');
    expect(passageResultSentence({ ...card, omitted: 0, checking: 1 })).toBe('이 지문의 5문항 중 4개를 맞혔어. 근거를 쓴 4개 중 3개가 적절했어(1개는 확인 중이야).');
  });
  it('근거를 쓴 문항이 없으면 근거 문장 없이 괄호가 첫 문장에 붙는다', () => {
    expect(passageResultSentence({ total: 5, correct: 2, rationaleDenominator: 0, supported: 0, omitted: 5, checking: 0 })).toBe('이 지문의 5문항 중 2개를 맞혔어(5개는 근거 생략).');
    expect(passageResultSentence({ total: 5, correct: 2, rationaleDenominator: 0, supported: 0, omitted: 0, checking: 0 })).toBe('이 지문의 5문항 중 2개를 맞혔어.');
  });
});

describe('등급 문구와 위치 막대', () => {
  it('범위면 best~worst등급, 같으면 n등급이다', () => {
    expect(gradeText({ best: 2, worst: 4 })).toBe('2~4등급'); expect(gradeText({ best: 3, worst: 3 })).toBe('3등급');
  });
  it('범위 막대는 0~100으로 자르고 너비는 최소 1이다', () => {
    expect(rangeBar(30, 88)).toEqual({ left: 30, width: 58 }); expect(rangeBar(50, 50)).toEqual({ left: 50, width: 1 }); expect(rangeBar(-5, 120)).toEqual({ left: 0, width: 100 });
  });
  it('백분위 → z', () => {
    expect(zOfPercentile(50)).toBeCloseTo(0, 6); expect(zOfPercentile(84.1345)).toBeCloseTo(1, 2); expect(zOfPercentile(2.2750)).toBeCloseTo(-2, 2);
  });
});

describe('② 숫자·단계·함정', () => {
  it('근거 분모에서 review·확인 중(판정 중·실패·boundary)·근거 생략을 뺀다', () => {
    const items = [item(), item({ correct: false }), item({ review: true, correct: false }), item({ rationale: 'OMITTED' }),
      item({ judgment: { status: 'pending', contentAssessment: null, boundary: null } }), item({ judgment: { status: 'ready', contentAssessment: 'UNKNOWN', boundary: 'MISSING_SOURCE' } }),
      item({ judgment: { status: 'ready', contentAssessment: 'INSUFFICIENT', boundary: 'NONE' } })];
    expect(solveStats(items, 16)).toEqual({ correct: 5, total: 16, supported: 1, rationaleDenominator: 3, omitted: 1 });
  });
  it('문항 칸 상태', () => {
    expect(cellState(item())).toBe('correct'); expect(cellState(item({ correct: false }))).toBe('wrong'); expect(cellState(item({ review: true, correct: false }))).toBe('review');
  });
  it('단계 경향: 가장 많은 단계를 잇고, denominator 0이면 숨긴다', () => {
    expect(stepTendency({ denominator: 5, counts: { S4_INTERPRET: 3, S2_CHOICE: 1, NONE: 1 } })?.sentence).toBe('근거를 살펴본 5문항 중 3개가 근거 해석 단계에서 어긋났어.');
    expect(stepTendency({ denominator: 4, counts: { S3_LOCATE: 2, S4_INTERPRET: 2 } })?.sentence).toBe('근거를 살펴본 4문항 중 2개가 근거 위치·근거 해석 단계에서 어긋났어.');
    expect(stepTendency({ denominator: 4, counts: { S3_LOCATE: 2 } })!.bars.map(b => b.name)).toEqual(['발문', '선지 해석', '근거 위치', '근거 해석', '대조']);
    expect(stepTendency({ denominator: 0, counts: {} })).toBeNull(); expect(stepTendency({ denominator: 2, counts: { NONE: 2 } })).toBeNull();
  });
  it('함정 꼬리표: 많은 순, 같으면 표 순서, 그 밖의 함정은 맨 뒤', () => {
    expect(twistTags({ PAIR_SWAP: 2, ADDED_CONTENT: 1, DIRECTION: 1, OTHER: 5, NEGATION: 2 })).toEqual([
      { name: '긍정·부정 뒤집기', count: 2 }, { name: '두 대상의 특징 맞바꾸기', count: 2 }, { name: '방향 뒤집기', count: 1 }, { name: '없는 내용 덧붙이기', count: 1 }, { name: '그 밖의 함정', count: 5 }]);
    expect(twistTags({})).toEqual([]);
  });
  it('카드: 비틂 이름·설명·바뀐 내용, OTHER는 이름만, 개발용 설명은 쓰지 않는다', () => {
    const cards = cardTwists([{ twistType: 'PAIR_SWAP', twistDetail: '개발용', studentText: null }, { twistType: 'OTHER', twistDetail: '개발용', studentText: '바뀐 문장' }]);
    expect(cards[0]).toEqual({ name: '두 대상의 특징 맞바꾸기', line: '지문이 서로 맞세운 두 대상(㉠과 ㉡ 등)에서 한쪽의 특징을 다른 쪽에 붙였어.', changed: null });
    expect(cards[1]).toEqual({ name: '그 밖의 함정', line: null, changed: '바뀐 문장' });
    expect(JSON.stringify(cards)).not.toContain('개발용'); expect(cardTwists(null)).toEqual([]);
  });
  it('어긋난 단계 이름과 정답의 질', () => {
    expect(cardStepName(item({ thoughtDiagnosis: { status: 'ready', firstFailedStep: 'S4_INTERPRET', outcomeType: 'ERROR' } }))).toBe('근거 해석');
    expect(cardStepName(item({ thoughtDiagnosis: { status: 'pending', firstFailedStep: null, outcomeType: null } }))).toBeNull(); expect(cardStepName(item())).toBeNull();
    expect(answerQuality(item())).toBe('근거도 적절했어'); expect(answerQuality(item({ judgment: { status: 'ready', contentAssessment: 'INSUFFICIENT', boundary: 'NONE' } }))).toBe('정답이야. 근거는 조금 더 다듬을 수 있어');
    expect(answerQuality(item({ rationale: 'OMITTED' }))).toBe('근거 생략');
  });
  it('①~⑤ 뒤 조사', () => { expect([1, 2, 3, 4, 5].map(circledObject)).toEqual(['①을', '②를', '③을', '④를', '⑤를']); });
});

describe('③ 독해 패턴', () => {
  const counts = (over: Partial<ReadingCounts['layers']> = {}): ReadingCounts => ({
    layers: { 요지: { caught: 7, total: 9 }, 합성: { caught: 6, total: 12 }, 명제: { caught: 11, total: 30 }, ...over },
    branches: { 내용: { caught: 6, total: 8, wrong: 1 }, 논증: { caught: 0, total: 0, wrong: 0 }, 관점: { caught: 2, total: 3, wrong: 0 }, 흐름: { caught: 1, total: 2, wrong: 0 } } });
  it('층 문장', () => {
    expect(layerSentence(counts())).toBe('문단 요지는 9곳 중 7곳, 묶음은 12곳 중 6곳, 세부 내용은 30곳 중 11곳을 잡았어.');
    expect(layerSentence(counts({ 합성: { caught: 0, total: 0 } }))).toBe('문단 요지는 9곳 중 7곳, 세부 내용은 30곳 중 11곳을 잡았어.');
    expect(layerSentence(counts({ 요지: { caught: 0, total: 0 }, 합성: { caught: 0, total: 0 }, 명제: { caught: 0, total: 0 } }))).toBeNull();
  });
  it('갈래 행: total 0은 숨기고 wrong > 0일 때만 틀리게 이은 곳을 붙인다', () => {
    const rows = branchRows(counts());
    expect(rows.map(r => r.name)).toEqual(['대상 사이의 관계', '사람·이론 사이의 입장', '글의 흐름']);
    expect(rows[0]).toMatchObject({ text: '8곳 중 6곳을 잡았어', wrongText: '1곳은 지문과 다르게 이었어' }); expect(rows[1]!.wrongText).toBeNull();
  });
  it('지문별 개수를 더한다', () => {
    const sum = sumCounts([{ counts: counts() }, { counts: counts() }]);
    expect(sum.layers.요지).toEqual({ caught: 14, total: 18 }); expect(sum.branches.내용).toEqual({ caught: 12, total: 16, wrong: 2 });
  });
  it('요약과 틀린 문항 연결 문장 세 종류와 분석 중·실패', () => {
    const link = (kind: 'MISSED' | 'MISREAD' | 'CAUGHT', status: 'ready' | 'pending' | 'failed' = 'ready') => ({ status, kind, paragraphs: [7], paragraphLabel: '(나) 3문단' });
    expect(summaryLinkSentence(link('MISSED'), '의식과 인지', 15)).toBe('의식과 인지 15번에서 확인해야 했던 (나) 3문단 내용은 요약에서 빠졌던 곳이야.');
    expect(summaryLinkSentence(link('MISREAD'), '의식과 인지', 15)).toBe('의식과 인지 15번에서 확인해야 했던 (나) 3문단 내용은 요약에서도 지문과 다르게 이해했던 곳이야.');
    expect(summaryLinkSentence(link('CAUGHT'), '플라스틱', 9)).toBe('플라스틱 9번에서 확인해야 했던 (나) 3문단 내용은 요약에서 잡았는데 문항에서는 틀렸어. 선지를 읽고 지문과 대조하는 쪽을 살펴볼 만해.');
    expect(summaryLinkSentence(link('CAUGHT', 'pending'), 'x', 1)).toBe('분석 중'); expect(summaryLinkSentence(link('CAUGHT', 'failed'), 'x', 1)).toBe('이 부분은 분석하지 못했어');
  });
});

describe('추천', () => {
  it('2번 이상이면 자주 걸린 함정, 1번이면 이번에 걸린 함정, 세트 이름은 대응표가 있을 때만', () => {
    expect(recommendationLines({ twistType: 'PAIR_SWAP', setNames: [] }, { PAIR_SWAP: 2 })).toEqual(['자주 걸린 함정: 두 대상의 특징 맞바꾸기(2번)']);
    expect(recommendationLines({ twistType: 'PAIR_SWAP', setNames: [] }, { PAIR_SWAP: 1 })).toEqual(['이번에 걸린 함정: 두 대상의 특징 맞바꾸기']);
    expect(recommendationLines({ twistType: 'DIRECTION', setNames: ['세트 가', '세트 나'] }, { DIRECTION: 1 })).toEqual(['이번에 걸린 함정: 방향 뒤집기', '비슷한 구조의 지문으로 세트 가, 세트 나를 풀어 보면 좋아.']);
    expect(recommendationLines({ twistType: 'DIRECTION', setNames: ['세트 감'] }, { DIRECTION: 1 })[1]).toBe('비슷한 구조의 지문으로 세트 감을 풀어 보면 좋아.');
  });
  it('오답이 없으면 어려운 문항으로 더 풀어 보라고 한다', () => { expect(recommendationLines(null, {})).toEqual(['어려운 문항으로 더 풀어 보면 좋아']); });
  it('받침에 따라 을/를', () => { expect([eulReul('세트 가'), eulReul('세트 감'), eulReul('A')]).toEqual(['를', '을', '를']); });
});

describe('시간 누적', () => {
  it('근거 칸 포커스 동안은 rationaleMs, 나머지는 solveMs. 멈춘 동안은 더하지 않고 다시 열면 이어서 더한다', () => {
    let t = startTimer(newTimer(), 1000);
    t = focusRationale(t, true, 4000);        // 풀이 3000
    t = focusRationale(t, false, 9000);       // 근거 5000
    t = stopTimer(t, 10000);                  // 풀이 +1000
    expect(timerValues(t, 50000, false)).toEqual({ solveMs: 4000, rationaleMs: 5000 });   // 멈춘 동안은 늘지 않는다
    t = startTimer(t, 60000);
    expect(timerValues(t, 62000, false)).toEqual({ solveMs: 6000, rationaleMs: 5000 });
  });
  it('근거 미제출이면 rationaleMs는 null이고 값은 0 이상 정수다', () => {
    const t = stopTimer(startTimer(newTimer(), 0), 1234.6);
    expect(timerValues(t, 9999, true)).toEqual({ solveMs: 1235, rationaleMs: null });
    expect(timerValues(newTimer(), 5, false)).toEqual({ solveMs: 0, rationaleMs: 0 });
    expect(timerValues(startTimer(newTimer(), 100), 50, false).solveMs).toBe(0);
  });
});

describe('결과 화면 보조', () => {
  it('백분위 → 등급은 서버 규칙(누적 상위 4·11·23·40·60·77·89·96%)과 같다', () => {
    const samples = [99, 96, 95.9, 89, 77.5, 60, 40.1, 23, 11, 4, 0];
    expect(samples.map(gradeOfPercentile)).toEqual([1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(samples.map(gradeOfPercentile)).toEqual(samples.map(serverGrade));
  });
  it('분석 중인 칸이 하나라도 있으면 true이고, 문항 검토 문항의 숨겨진 판정은 보지 않는다', () => {
    const base = { position: { status: 'ready' }, steps: { status: 'ready', counts: {}, denominator: 0 }, twists: { counts: {} }, recommendation: null, reading: [], items: [item()] } as never as import('./types.js').ResultView;
    expect(hasPending(base)).toBe(false);
    expect(hasPending({ ...base, items: [item({ review: true, correct: false, judgment: { status: 'pending', contentAssessment: null, boundary: null } })] })).toBe(false);
    expect(hasPending({ ...base, items: [item({ judgment: { status: 'pending', contentAssessment: null, boundary: null } })] })).toBe(true);
    expect(hasPending({ ...base, items: [item({ summaryLink: { status: 'pending', kind: 'MISSED', paragraphs: [1], paragraphLabel: '1문단' } })] })).toBe(true);
    expect(hasPending({ ...base, reading: [{ passageId: 'p', status: 'pending', counts: {} as never }] })).toBe(true);
    expect(hasPending({ ...base, steps: { status: 'pending', counts: {}, denominator: 0 } })).toBe(true);
  });
  it('원문 인용 위치 이름: 공식 해설은 내지 않는다', () => {
    expect(sourceLocationName('PASSAGE')).toBe('지문'); expect(sourceLocationName('SCENARIO')).toBe('보기'); expect(sourceLocationName('EXPLANATION')).toBeNull();
  });
});
