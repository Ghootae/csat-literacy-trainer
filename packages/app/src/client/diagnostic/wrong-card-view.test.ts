/** 문항 카드 3층 렌더(고정 출력 사용, 모델 호출 없음): ready면 1·2·3층, fallback·pending·none이면 11/17 카드. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Solve } from './ResultSolve.js';
import { focusSegments, hasPending } from './logic.js';
import type { ResultItem, ResultView as Result, SetInfo, WrongCardView } from './types.js';

const set: SetInfo = { passages: [{ passageId: 'plastic', title: '플라스틱의 중합 반응', questionIds: ['q9'] }] };
const ready: Extract<WrongCardView, { status: 'ready' }> = {
  status: 'ready', layer1: '㉮는 맞게 읽었어. 그런데 ㉯에서 원문과 갈렸어.', symbolGlosses: [{ symbol: '㉮', gloss: '가지를 친 구조의 사슬들' }, { symbol: '㉯', gloss: '직선형 구조의 사슬들' }],
  pair: { top: '㉯는 **조밀하니까 투명할 것** 같음', source: '사슬이 직선형이면 조밀하게 쌓여 결정 영역이 커지므로 불투명해진다.', sourceFocus: '결정 영역이 커지므로 불투명해진다', conclusion: '조밀할수록 투명하지 않아.' },
  examinerIntent: '조밀한 구조가 투명하다고 읽게 만든 선지야.',
};
const wrong = (over: Partial<ResultItem> = {}): ResultItem => ({ questionId: 'q9', passageId: 'plastic', questionNumber: 9, chosenPosition: 2, correct: false, rationale: 'PROVIDED', category: 'WRONG', elimination: false,
  megastudy: { chosenPercents: [14, 11], correctRate: [50, 60] }, afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: 3,
  judgment: { status: 'ready', contentAssessment: 'ERROR', boundary: 'NONE' }, thoughtDiagnosis: null, summaryLink: null,
  twist: [{ twistType: 'SCOPE', twistDetail: '범위', studentText: null, choiceQuote: '선지 구절', evidenceQuote: '원문 구절' }],
  evidence: { student: '학생이 쓴 근거', source: [] }, stem: '발문', chosenText: '선지 구절이 들어 있는 선지', answerText: '정답 선지 문장', stemPolarity: 'SELECT_CORRECT',
  answerTwist: null, selfCheck: null, strategyAvailable: true, card: ready, ...over });
const result = (item: ResultItem): Result => ({ qualityTiers: 3, position: { status: 'pending' }, items: [item], steps: { status: 'ready', counts: {}, denominator: 0 }, twists: { counts: {} },
  recommendation: null, reading: [], readingHabit: { status: 'none' }, symbolGloss: { plastic: { '㉮': '풀이 A', '㉯': '풀이 B' } } });
const render = (item: ResultItem) => renderToStaticMarkup(createElement(Solve, { result: result(item), set, participantId: 'p', open: item.questionId, onToggle: () => {}, onClose: () => {} }));

describe('3층 카드: ready', () => {
  const html = render(wrong());
  it('1층: 한 문장 → 구분선 → 기호 풀이 → 선택률 줄 순서이고, 본문에 기호 괄호 설명을 덧붙이지 않는다', () => {
    expect(html).toContain('data-testid="card-layer1"');
    const at = (text: string) => html.indexOf(text);
    expect(at(ready.layer1)).toBeGreaterThan(-1);
    expect(at('<hr')).toBeGreaterThan(at(ready.layer1));
    expect(at('data-testid="card-symbols"')).toBeGreaterThan(at('<hr'));
    expect(at('가지를 친 구조의 사슬들')).toBeGreaterThan(at('data-testid="card-symbols"'));
    expect(at('data-testid="card-rate"')).toBeGreaterThan(at('직선형 구조의 사슬들'));
    expect(html).toContain('②를 고른 수험생 화작 14% · 언매 11%');
    expect(html).not.toMatch(/[㉮㉯]\(/u); expect(html).not.toContain('풀이 A');   // 사전 풀이(annotateSymbols)는 3층 카드 경로에서 쓰지 않는다
  });
  it('제목 아래에 발문 한 줄과 고른 선지 전문이 작은 글씨로 나온다(비튼 구절 강조 없음)', () => {
    expect(html).toContain('<p class="diag-l0" data-testid="card-stem">발문</p>');
    expect(html).toContain('<p class="diag-l0" data-testid="card-chosen">② 선지 구절이 들어 있는 선지</p>');
    expect(html.indexOf('card-stem')).toBeLessThan(html.indexOf('card-layer1'));
    expect(html.slice(html.indexOf('card-chosen'), html.indexOf('card-layer1'))).not.toContain('<strong');
  });
  it('기호 풀이가 없으면 구분선도 없다', () => {
    expect(render(wrong({ card: { ...ready, symbolGlosses: [] } }))).not.toContain('<hr');
  });
  it('2층: 내 근거(**굵게**) ↓ 원문(핵심 구절만 굵게) ↓ 그래서, 그 아래 정답 선지', () => {
    expect(html).toContain('<span class="diag-l2-label">내 근거</span>'); expect(html).toContain('<strong>조밀하니까 투명할 것</strong>');
    expect(html).not.toContain('**');
    expect(html).toContain('<strong>결정 영역이 커지므로 불투명해진다</strong>');
    expect(html.match(/<strong>결정 영역/gu)).toHaveLength(1);
    expect(html).toContain('<span>사슬이 직선형이면 조밀하게 쌓여 </span>');   // 나머지는 보통 글씨
    expect(html.match(/class="diag-l2-arrow"/gu)).toHaveLength(2);
    expect(html).toContain('<span class="diag-l2-label">그래서</span><p>조밀할수록 투명하지 않아.</p>');
    expect(html).toContain('data-testid="card-answer"'); expect(html).toContain('③ 정답 선지 문장');
    expect(html).not.toContain('data-testid="self-check"'); expect(html).not.toContain('missed-answer');
  });
  it('3층: "자세히 보기"로 접혀 있고(open 없음) 정답률·선택률, 출제자가 노린 것, 출제자 설명 버튼이 들어 있다', () => {
    expect(html).toMatch(/<details class="diag-l3"[^>]*>/u); expect(html).not.toMatch(/<details[^>]* open/u);
    expect(html).toContain('<summary>자세히 보기</summary>');
    expect(html).toContain('다른 수험생은'); expect(html).toContain('화작 50% · 언매 60%'); expect(html).toContain('출제자가 노린 것'); expect(html).toContain(ready.examinerIntent);
    expect(html).toContain('문항으로 돌아가 출제자 설명 보기 →');
    expect(html).not.toContain('네 요약과 연결');
  });
  it('3층: 요약 연결 문장은 있을 때만', () => {
    expect(render(wrong({ summaryLink: { status: 'ready', kind: 'MISSED', paragraphs: [2], paragraphLabel: '2문단' } }))).toContain('네 요약과 연결');
  });
  it('strategyAvailable이 아니면 출제자 설명 버튼이 없다', () => { expect(render(wrong({ strategyAvailable: false }))).not.toContain('출제자 설명 보기'); });
  it('응답에 없는 matchesTrap·범주 이름이 화면에 없다', () => {
    const text = html.replace(/<[^>]+>/gu, ' ');
    for (const word of ['matchesTrap', 'kind', 'SCOPE', '범주', '함정 유형']) expect(text).not.toContain(word);
  });
});

describe('3층 카드: 경우별', () => {
  it('근거 없는 오답: 맨 위 칸 "선지에서 맞는 부분", 질문 줄과 생성된 자기 점검 버튼 3개(고정 문구 없음), 누른 값 표시', () => {
    const omitted = wrong({ rationale: 'OMITTED', evidence: null, card: { ...ready, selfCheckOptions: ['첫째 문구', '둘째 문구', '셋째 문구'] }, selfCheck: { choice: '둘째 문구', at: 'x' } });
    const html = render(omitted);
    expect(html).toContain('<span class="diag-l2-label">선지에서 맞는 부분</span>'); expect(html).not.toContain('<span class="diag-l2-label">내 근거</span>');
    expect(html).toContain('근거를 안 써서 어디서 헷갈렸는지는 몰라. 너는 어땠어?');
    expect(html.match(/class="diag-secondary diag-choice"/gu)).toHaveLength(3);
    for (const text of ['첫째 문구', '둘째 문구', '셋째 문구']) expect(html).toContain(`>${text}</button>`);
    expect(html).not.toContain('선지 내용을 잘못 이해했어');
    expect(html).not.toContain('어디서 헷갈렸는지는 몰라. 어디서 헷갈렸어?');   // 기존 질문 줄은 중복으로 쓰지 않는다
  });
  it('근거 있는 오답이면 자기 점검이 없다', () => { expect(render(wrong())).not.toContain('self-check'); });
  it('정답 카드(CORRECT_WEAK): 선택률 줄과 정답 선지가 없다', () => {
    const html = render(wrong({ correct: true, category: 'WEAK_CORRECT', answerText: null, twist: null }));
    expect(html).toContain('data-testid="card-layer1"'); expect(html).toContain('<span class="diag-l2-label">내 근거</span>');
    expect(html).not.toContain('data-testid="card-rate"'); expect(html).not.toContain('data-testid="card-answer"'); expect(html).not.toContain('self-check');
  });
  it('"적절하지 않은 것" 오답: 정답 선지와 "네가 놓친 진짜 틀린 선지"(문장 + 원문)', () => {
    const html = render(wrong({ stemPolarity: 'SELECT_INCORRECT', card: { ...ready, missedAnswer: { text: '④는 에틸렌이 분해된다고 했어', source: '개시제가 분해된다.' } } }));
    expect(html).toContain('data-testid="missed-answer"'); expect(html).toContain('네가 놓친 진짜 틀린 선지'); expect(html).toContain('④는 에틸렌이 분해된다고 했어'); expect(html).toContain('개시제가 분해된다.');
    expect(html).toContain('data-testid="card-answer"');
  });
  it('모든 기호 풀이는 1층에만: 2·3층 글에는 괄호 설명이 붙지 않는다', () => {
    const html = render(wrong({ card: { ...ready, examinerIntent: '㉯로 바꿨어.' } }));
    expect(html).not.toMatch(/㉯\(/u); expect(html).toContain('㉯로 바꿨어.');
  });
});

describe('3층이 아닌 경우는 11/17 카드', () => {
  it.each(['fallback', 'pending', 'none'] as const)('%s: 기존 카드(고른 선지·내 근거 상자)를 그대로 그린다', status => {
    const html = render(wrong({ card: { status } }));
    expect(html).toContain('data-testid="chosen-choice"'); expect(html).toContain('내 근거'); expect(html).toContain('data-testid="twist-pair"');
    expect(html).not.toContain('data-testid="card-layer1"'); expect(html).not.toContain('<details');
  });
  it('문항 검토 문항은 ready 값이 있어도 검토 문구 카드', () => {
    const html = render(wrong({ review: true }));
    expect(html).toContain('이 문항은 우리가 한 번 더 확인하고 있어.'); expect(html).not.toContain('data-testid="card-layer1"');
  });
});

describe('보조', () => {
  it('focusSegments: 핵심 구절만 굵게, 없으면 통째로 보통 글씨', () => {
    expect(focusSegments('앞 핵심 뒤', '핵심')).toEqual([{ text: '앞 ', bold: false }, { text: '핵심', bold: true }, { text: ' 뒤', bold: false }]);
    expect(focusSegments('앞 핵심', '핵심')).toEqual([{ text: '앞 ', bold: false }, { text: '핵심', bold: true }]);
    expect(focusSegments('통째', '없는 말')).toEqual([{ text: '통째', bold: false }]);
  });
  it('hasPending: 카드가 pending이면 true(다시 받아 온다), fallback·ready는 아니다', () => {
    const base = { ...result(wrong()), position: { status: 'ready' as const, answered: 1, correct: 0, percentile: { mean: 1, low: 1, high: 1 }, grade: { mean: 1, best: 1, worst: 1, probabilities: [1], mode: 1 }, byPassage: [] } };
    expect(hasPending({ ...base, items: [wrong({ card: { status: 'pending' } })] })).toBe(true);
    expect(hasPending({ ...base, items: [wrong({ card: { status: 'fallback' } })] })).toBe(false);
    expect(hasPending(base)).toBe(false);
  });
});
