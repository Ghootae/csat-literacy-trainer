import { describe, expect, it } from 'vitest';
import {
  answerPayload, answerQuality, branchRows, categoryTally, countCategories, hasPending, sourceLocationName, cardStepName, cardTwists, circledObject, eulReul, focusRationale, layerSentence, newTimer,
  gradeCurvePath, recommendationLines, resultGroup, resultRow, devCategoryText, finishHint, gradeAtFraction, gradeGradient, gradeSentence, solveStats, startTimer, stepTendency, stopTimer, summaryLinkSentence, sumCounts, timerValues, twistTags,
} from './logic.js';
import type { AnswerCategory, ReadingCounts, ResultItem, SummaryCardItem } from './types.js';

const item = (over: Partial<ResultItem> = {}): ResultItem => ({
  questionId: 'q', passageId: 'p', questionNumber: 12, chosenPosition: 2, correct: true, rationale: 'PROVIDED', category: 'SUPPORTED_CORRECT', megastudy: { chosenPercents: [4, 2], correctRate: [70, 80] },
  afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: 1,
  judgment: { status: 'ready', contentAssessment: 'SUPPORTED', boundary: 'NONE' }, twist: null, thoughtDiagnosis: null, evidence: null, summaryLink: null, ...over });

const counts = (over: Partial<Record<AnswerCategory, number>> = {}): Record<AnswerCategory, number> => ({ ...countCategories([]), ...over });
const card = (over: Partial<SummaryCardItem> = {}): SummaryCardItem => ({ questionId: 'q', questionNumber: 12, correct: true, rationale: 'PROVIDED', category: 'SUPPORTED_CORRECT',
  megastudy: { correctRate: [30, 40], chosenPercents: [25, 35] }, judging: false, reviewTarget: false, reviewDone: false, revealed: true, ...over });
describe('지문 결과 줄(D-0218)', () => {
  it('문제 버튼 색 무리: 근거 문제없음 · 근거 다시 볼 것 · 오답', () => {
    for (const category of ['SUPPORTED_CORRECT', 'WEAK_CORRECT', 'SURE_CORRECT', 'UNVERIFIED', 'UNSURE_CORRECT', 'PENDING', 'CHECKING'] as const) expect(resultGroup(category)).toBe('good');
    expect(resultGroup('ERROR_CORRECT')).toBe('check'); expect(resultGroup('WRONG')).toBe('wrong');
  });
  it('정답 범주별 설명과 비활성 칭찬, 정답률이 낮으면 어려운 문제 칭찬', () => {
    expect(resultRow(card())).toMatchObject({ description: '정답(정답률 30% · 40%). 근거도 명확했어.', button: { label: '잘했어!', enabled: false } });
    expect(resultRow(card({ megastudy: { correctRate: [12, 18], chosenPercents: [1, 1] } })).button.label).toBe('어려운 문제인데 정말 잘했어!');
    expect(resultRow(card({ category: 'WEAK_CORRECT' })).description).toBe('정답(정답률 30% · 40%). 근거에 문제가 없었어.');
    expect(resultRow(card({ category: 'UNVERIFIED' })).button.label).toBe('잘했어!');
    expect(resultRow(card({ category: 'SURE_CORRECT' }))).toMatchObject({ description: '정답(정답률 30% · 40%). 확신을 갖고 풀었어.', button: { label: '확신을 갖고 풀었구나. 대단해!', enabled: false } });
    expect(resultRow(card({ category: 'UNSURE_CORRECT' }))).toMatchObject({ description: '정답(정답률 30% · 40%). 근거는 없었어.', button: { label: '맞혔어!', enabled: false } });
  });
  it('리뷰 대상은 활성 버튼이고 검토를 마치면 완료 문구로 비활성이 된다', () => {
    expect(resultRow(card({ category: 'ERROR_CORRECT', reviewTarget: true })).button).toEqual({ label: '근거를 다시 검토해 보자', enabled: true });
    expect(resultRow(card({ category: 'ERROR_CORRECT', reviewTarget: true, reviewDone: true })).button).toEqual({ label: '검토 완료했어. 수고했어', enabled: false });
    const wrong = card({ correct: false, category: 'WRONG', reviewTarget: true });
    expect(resultRow(wrong)).toMatchObject({ description: '오답(같은 선지를 고른 비율 25% · 35%).', button: { label: '아깝지만 정답이 아니야. 다시 검토해 보자.', enabled: true } });
    expect(resultRow({ ...wrong, reviewDone: true }).button).toEqual({ label: '검토 완료했어. 수고했어', enabled: false });
  });
  it('판정 중이면 분석 중으로 비활성(오답도 같다), 문항 검토 오답은 비활성이다', () => {
    expect(resultRow(card({ category: 'PENDING' }))).toMatchObject({ description: '정답(정답률 30% · 40%). 아직 분석 중이야.', button: { label: '분석 중', enabled: false }, analyzing: true });
    expect(resultRow(card({ correct: false, category: 'WRONG', reviewTarget: true, judging: true })).button).toEqual({ label: '분석 중', enabled: false });
    expect(resultRow(card({ category: 'CHECKING' })).description).toBe('정답(정답률 30% · 40%). 근거는 한 번 더 확인해 볼게.');
    expect(resultRow(card({ correct: false, category: 'WRONG', reviewTarget: false })).button.enabled).toBe(false);
  });
  it('힌트 흐름 전에는 잘 모르겠지만 정답이 리뷰 대상이 아니다(서버 isReviewTarget)', () => {
    expect(resultRow(card({ category: 'UNSURE_CORRECT' })).button.enabled).toBe(false);
  });
  it('개발자 표기와 다음 지문이 꺼진 이유, 등급 띠 진하기', () => {
    expect(devCategoryText('SUPPORTED_CORRECT')).toBe('(SUPPORTED_CORRECT · 근거 명확 정답)');
    expect(devCategoryText('WEAK_CORRECT', true)).toBe('(WEAK_CORRECT · 근거 약한 정답-소거법)');
    expect(devCategoryText('WRONG', true)).toBe('(WRONG · 오답)');
    const items = [card({ reviewTarget: true }), card({ reviewTarget: true, reviewDone: true })];
    expect(finishHint({ canFinish: false, judging: 0, items })).toBe('다시 검토할 문제가 1개 남았어.');
    expect(finishHint({ canFinish: false, judging: 1, items })).toBe('분석이 끝나면 넘어갈 수 있어.');
    expect(finishHint({ canFinish: true, judging: 0, items })).toBeNull();
    expect(gradeGradient([0, 0.5, 0.25], undefined, 2)).toBe('linear-gradient(to right, rgba(42, 79, 204, 0.060) 16.67%, rgba(42, 79, 204, 0.530) 33.33%, rgba(42, 79, 204, 1.000) 50.00%, rgba(42, 79, 204, 0.765) 66.67%, rgba(42, 79, 204, 0.530) 83.33%)');
    // 등급 칸 가운데(9칸이면 (g-0.5)/9)의 진하기 = 그 등급 확률 / 최댓값
    const probs = [0.02, 0.1, 0.3, 0.4, 0.15, 0.03, 0, 0, 0];
    const at = (pct: string) => gradeGradient(probs).match(new RegExp(`rgba\\(42, 79, 204, ([\\d.]+)\\) ${pct}%`))?.[1];
    expect(at('27.78')).toBe((0.06 + 0.94 * 0.3 / 0.4).toFixed(3));   // 3등급 가운데
    expect(at('38.89')).toBe('1.000');                                // 4등급(최대) 가운데
    expect([0, 0.11, 0.12, 0.5, 0.999, 1].map(gradeAtFraction)).toEqual([1, 1, 2, 5, 9, 9]);
    const nine = (xs: number[]) => [...xs, ...Array(9 - xs.length).fill(0)];
    expect(gradeSentence(nine([0.1, 0.2, 0.35, 0.25, 0.1]), 3)).toBe('3등급일 확률이 35%로 가장 높아');
    expect(gradeSentence(nine([0.1, 0.341, 0.339, 0.22]), 2)).toBe('2등급과 3등급일 확률이 각각 34%로 가장 높아');
    expect(gradeSentence(nine([0.3, 0.3, 0.3, 0.1]), 1)).toBe('1등급, 2등급과 3등급일 확률이 각각 30%로 가장 높아');
  });
});

describe('등급 띠 위 확률 곡선', () => {
  it('등급 칸 가운데 높이 = 확률(최댓값이 맨 위), 사이는 두 값 안', () => {
    const probs = [0.02, 0.1, 0.3, 0.4, 0.15, 0.03, 0, 0, 0];
    const points = gradeCurvePath(probs, 900, 60, 4, 4).split(' ').map(part => part.slice(1).split(',').map(Number) as [number, number]);
    expect(points).toHaveLength(1 + 8 * 4);
    const at = (x: number) => points.find(([px]) => Math.abs(px - x) < 0.05)![1];
    expect(at(50)).toBeCloseTo(60 - 56 * 0.02 / 0.4, 1);   // 1등급 가운데
    expect(at(350)).toBeCloseTo(4, 1);                      // 4등급(최대) 가운데 = 맨 위
    expect(at(850)).toBeCloseTo(60, 1);                     // 9등급(0) = 바닥
    for (const [, py] of points) { expect(py).toBeGreaterThanOrEqual(4 - 1e-9); expect(py).toBeLessThanOrEqual(60 + 1e-9); }
  });
});

describe('② 숫자·단계·함정', () => {
  it('정답의 질 분모는 범주 1·2·3만 세고, 범주 4·5·확인 못 함은 개수만 따로 센다(확인 중·판정 중·오답은 어디에도 넣지 않는다)', () => {
    const items = [item(), item({ category: 'WEAK_CORRECT' }), item({ category: 'ERROR_CORRECT' }), item({ category: 'SURE_CORRECT', rationale: 'OMITTED' }),
      item({ category: 'UNSURE_CORRECT', rationale: 'OMITTED' }), item({ category: 'UNVERIFIED' }), item({ category: 'CHECKING' }), item({ category: 'PENDING' }),
      item({ category: 'WRONG', correct: false }), item({ category: 'WRONG', correct: false, review: true })];
    expect(solveStats(items, 16)).toEqual({ correct: 8, total: 16, accurate: 1, qualityDenominator: 3, sure: 1, unsure: 1, unverified: 1 });
    expect(solveStats(items, 16, 2)).toEqual({ correct: 8, total: 16, accurate: 2, qualityDenominator: 3, sure: 1, unsure: 1, unverified: 1 });
  });
  it('2단계 표시: 범주 1·2는 같은 칸으로 합치고 범주 3은 따로 둔다', () => {
    const tally = (tiers: 3 | 2) => categoryTally(counts({ SUPPORTED_CORRECT: 2, WEAK_CORRECT: 3, ERROR_CORRECT: 1 }), tiers);
    expect(tally(3)).toMatchObject({ accurate: 2, weak: 3, error: 1, denominator: 6 });
    expect(tally(2)).toMatchObject({ accurate: 5, weak: 0, error: 1, denominator: 6 });
    expect(answerQuality(item({ category: 'SUPPORTED_CORRECT' }), 2)).toBe(answerQuality(item({ category: 'WEAK_CORRECT' }), 2));
    expect(answerQuality(item({ category: 'SUPPORTED_CORRECT' }), 3)).not.toBe(answerQuality(item({ category: 'WEAK_CORRECT' }), 3));
  });
  it('근거 미입력 버튼을 누르면 저장 요청에 그 버튼의 확신 값이 실리고 글은 무시된다', () => {
    expect(answerPayload('UNSURE', '무시되는 글')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'UNSURE' });
    expect(answerPayload('SURE', '')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'SURE' });
    expect(answerPayload(null, '이유')).toEqual({ rationale: { mode: 'PROVIDED', text: '이유' }, confidence: null });
    expect(answerPayload('ELIMINATION', '', '메모')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'ELIMINATION', eliminationNote: '메모' });
    expect(answerPayload('ELIMINATION', '')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'ELIMINATION', eliminationNote: null });
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
    expect(answerQuality(item())).toBe('근거도 정확했어'); expect(answerQuality(item({ category: 'WEAK_CORRECT' }))).toBe('정답이야. 근거는 조금 더 다듬을 수 있어');
    expect(answerQuality(item({ category: 'ERROR_CORRECT' }))).toBe('정답이지만 근거에 틀린 곳이 있어');
    expect(answerQuality(item({ category: 'SURE_CORRECT' }))).toBe('확실하다고 한 정답이야'); expect(answerQuality(item({ category: 'UNSURE_CORRECT' }))).toBe('확신 없이 맞힌 정답이야');
    expect(answerQuality(item({ category: 'UNVERIFIED' }))).toBe('정답이야. 근거로 풀이를 확인하지는 못했어');
    expect(answerQuality(item({ category: 'PENDING' }))).toBeNull(); expect(answerQuality(item({ category: 'WRONG' }))).toBeNull();
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
