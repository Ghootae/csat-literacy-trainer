/** 맨 위 요약의 세 상태(ready·pending·none/failed) 렌더와 학생 화면에 범주 이름이 없는지. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ResultView } from './ResultView.js';
import { hasPending, parseBold } from './logic.js';
import type { ReadingHabit, ReadingHabitView, ResultItem, ResultView as Result, SetInfo } from './types.js';

const set: SetInfo = { passages: [{ passageId: 'plastic', title: '플라스틱의 중합 반응', questionIds: ['q9', 'q10'] }] };
const wrongItem = { questionId: 'q9', passageId: 'plastic', questionNumber: 9, chosenPosition: 2, correct: false, rationale: 'PROVIDED', category: 'WRONG', elimination: false,
  megastudy: { chosenPercents: [10, 10], correctRate: [50, 50] }, afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: 3,
  judgment: { status: 'ready', contentAssessment: 'ERROR', boundary: 'NONE' }, thoughtDiagnosis: null, summaryLink: null,
  twist: [{ twistType: 'SCOPE', twistDetail: '범위', studentText: null, choiceQuote: '선지 구절', evidenceQuote: '원문 구절' }],
  evidence: { student: '학생이 쓴 근거', source: [] }, stem: '발문', chosenText: '선지 구절이 들어 있는 선지', answerText: '정답', stemPolarity: 'SELECT_CORRECT',
  answerTwist: null, selfCheck: null, strategyAvailable: false, answerViewable: false, card: { status: 'none' } } as ResultItem;
const habit: ReadingHabit = {
  headline: '종합적으로 보면, 너는 문장의 범위를 정하는 말을 빼고 읽는 경향이 있어.',
  featured: { questionId: 'q10', passageId: 'plastic', questionNumber: 10, sourceKind: 'CHOICE', choicePosition: 2, sentence: '㉮보다 ㉯로 이루어진 소재가 적합하겠군.',
    studentQuote: '㉯가 조밀하니까 투명할 것 같음', sourceForm: 'A보다 B가 적합하다', studentForm: 'B가 투명하다', changed: '보다 → 가', explanation: '비교하는 말이 빠지면 뜻이 달라져.' },
  otherCases: [{ questionId: 'q9', passageId: 'plastic', questionNumber: 9, sentence: '사슬 **끝에** 있다', studentQuote: '양쪽 끝이라고 함', changed: "'끝에'를 '양쪽 끝'으로 바꿈" }],
  secondary: { line: '그리고 순서를 거꾸로 읽은 곳도 두 번 있었어.', questionIds: ['q9'] },
  nextTime: '비교하는 말에 동그라미를 쳐 봐.',
};
const result = (readingHabit: ReadingHabitView): Result => ({
  qualityTiers: 3, position: { status: 'pending' }, items: [wrongItem], steps: { status: 'ready', counts: {}, denominator: 0 }, twists: { counts: {} }, recommendation: null,
  reading: [], readingHabit, symbolGloss: { plastic: { '㉮': '가지를 친 구조의 사슬들', '㉯': '직선형 구조의 사슬들' } },
});
const render = (readingHabit: ReadingHabitView) => renderToStaticMarkup(createElement(ResultView, { result: result(readingHabit), set, participantId: 'p' }));

describe('맨 위 요약의 읽기 습관 상자', () => {
  it('ready: 습관 상자를 보이고 "가장 먼저 볼 것"은 숨긴다', () => {
    const html = render({ status: 'ready', habit });
    expect(html).toContain('data-testid="reading-habit"');
    expect(html).not.toContain('data-testid="first-look"'); expect(html).not.toContain('가장 먼저 볼 것');
    expect(html).toContain(habit.headline);
    expect(html).toContain('플라스틱의 중합 반응 10번 · 선지 ②');
    expect(html).toContain('원래 문장'); expect(html).toContain('네가 읽은 것'); expect(html).toContain('같은 방식으로 읽은 곳'); expect(html).toContain('다음에:');
    // 기호 풀이는 처음 나올 때만 붙는다. 바뀐 말은 굵게.
    expect(html).toContain('㉮(가지를 친 구조의 사슬들)보다 ㉯(직선형 구조의 사슬들)로'); expect(html).toContain('<strong>끝에</strong>');
    expect(html).toContain('그 밖에: 그리고 순서를 거꾸로 읽은 곳도 두 번 있었어.'); expect(html).toContain('9번');
    expect(html).toContain('카드 보기 →');
  });
  it('원래 문장의 굵은 말은 강조하고, 네가 읽은 것은 강조 없이. 뺀 말·바꿔 읽은 말 한 줄', () => {
    const bolded: ReadingHabit = { ...habit, featured: { ...habit.featured, sentence: '㉮보다 **㉯로** 이루어진 소재', sourceForm: 'A보다 **B가** 적합하다', changed: '비교하는 말' } };
    const html = render({ status: 'ready', habit: bolded });
    expect(html).toContain('<strong>㉯'); expect(html).toContain('<strong>B가</strong>');
    expect(html).not.toContain('**'); expect(html).toContain('<dt>네가 읽은 것</dt><dd>B가 투명하다</dd>');
    expect(html).toContain('네가 뺀 말: 비교하는 말');
    expect(render({ status: 'ready', habit })).toContain('네가 바꿔 읽은 말: 보다 → 가');
  });
  it('sourceKind에 따라 선지 번호·지문·〈보기〉로 쓴다', () => {
    const at = (sourceKind: 'PASSAGE' | 'SCENARIO') => render({ status: 'ready', habit: { ...habit, featured: { ...habit.featured, sourceKind, choicePosition: null } } });
    expect(at('PASSAGE')).toContain('10번 · 지문'); expect(at('SCENARIO')).toContain('10번 · 〈보기〉');
  });
  it('pending: 숫자 줄 아래 대기 한 줄만, 상자도 "가장 먼저 볼 것"도 없다', () => {
    const html = render({ status: 'pending' });
    expect(html).toContain('문장 읽기 습관을 살펴보는 중이야.');
    expect(html).not.toContain('data-testid="reading-habit"'); expect(html).not.toContain('data-testid="first-look"');
  });
  it.each(['none', 'failed'] as const)('%s: 지금의 "가장 먼저 볼 것"을 그대로 보인다', status => {
    const html = render({ status });
    expect(html).toContain('data-testid="first-look"'); expect(html).toContain('가장 먼저 볼 것');
    expect(html).not.toContain('data-testid="reading-habit"'); expect(html).not.toContain('살펴보는 중');
  });
  it('학생 화면 글에 범주 이름·태그 이름이 없다', () => {
    const html = render({ status: 'ready', habit });
    const text = html.replace(/<[^>]+>/gu, ' ');
    for (const word of ['kind', 'CONDITION', 'SCOPE', 'DIRECTION', 'POLARITY', 'REFERENT', 'MAPPING', 'PARAPHRASE_DISTANCE', 'MISREAD_FACT', '습관 유형', '범주']) expect(text).not.toContain(word);
  });
  it('hasPending은 읽기 습관이 pending일 때도 true다', () => {
    expect(hasPending({ ...result({ status: 'pending' }), position: { status: 'ready', answered: 1, correct: 1, percentile: { mean: 1, low: 1, high: 1 }, grade: { mean: 1, best: 1, worst: 1, probabilities: [1], mode: 1 }, byPassage: [] }, items: [] })).toBe(true);
    expect(hasPending({ ...result({ status: 'none' }), position: { status: 'ready', answered: 1, correct: 1, percentile: { mean: 1, low: 1, high: 1 }, grade: { mean: 1, best: 1, worst: 1, probabilities: [1], mode: 1 }, byPassage: [] }, items: [] })).toBe(false);
  });
  it('parseBold: **표시를 굵은 조각으로 나눈다', () => {
    expect(parseBold('앞 **굵게** 뒤')).toEqual([{ text: '앞 ', bold: false }, { text: '굵게', bold: true }, { text: ' 뒤', bold: false }]);
    expect(parseBold('표시 없음')).toEqual([{ text: '표시 없음', bold: false }]);
  });
});
