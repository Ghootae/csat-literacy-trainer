import { describe, expect, it } from 'vitest';
import {
  accurateCorrect, annotateSymbols, answerPayload, answerQuality, boldQuotes, branchRows, breakdown, caseEntries, casesOfBranch, categoryTally, circledObject, clip, countCategories, detailLine, devCategoryText, excerptAround,
  finishHint, focusRationale, gradeAtFraction, gradeCurvePath, gradeGradient, gradeSentence, hasPending, layerRows, newTimer, pickFirstLook, resultGroup, resultRow, sourceLocationName, startTimer, stopTimer,
  summaryLinkSentence, sumCounts, timerValues, twistName, twistsForPairs,
} from './logic.js';
import type { AnswerCategory, ReadingCase, ReadingCounts, ResultItem, ResultTwist, ResultView, SummaryCardItem } from './types.js';

const item = (over: Partial<ResultItem> = {}): ResultItem => ({
  questionId: 'q', passageId: 'p', questionNumber: 12, chosenPosition: 2, correct: true, rationale: 'PROVIDED', category: 'SUPPORTED_CORRECT', elimination: false, megastudy: { chosenPercents: [4, 2], correctRate: [70, 80] },
  afterFeedback: { corrected: false, skipped: false }, review: false, answerPosition: 1,
  judgment: { status: 'ready', contentAssessment: 'SUPPORTED', boundary: 'NONE' }, twist: null, thoughtDiagnosis: null, evidence: null, summaryLink: null,
  stem: '발문', chosenText: '고른 선지', answerText: null, stemPolarity: 'SELECT_CORRECT', answerTwist: null, selfCheck: null, strategyAvailable: false, ...over });
const twist = (over: Partial<ResultTwist> = {}): ResultTwist => ({ twistType: 'NEGATION', twistDetail: '개발용', studentText: null, choiceQuote: '구절', evidenceQuote: '원문 문장', ...over });

const counts = (over: Partial<Record<AnswerCategory, number>> = {}): Record<AnswerCategory, number> => ({ ...countCategories([]), ...over });
const card = (over: Partial<SummaryCardItem> = {}): SummaryCardItem => ({ questionId: 'q', questionNumber: 12, correct: true, rationale: 'PROVIDED', category: 'SUPPORTED_CORRECT', elimination: false,
  megastudy: { correctRate: [30, 40], chosenPercents: [25, 35] }, judging: false, reviewTarget: false, reviewDone: false, revealed: true, ...over });
describe('지문 결과 줄(D-0218)', () => {
  it('문제 버튼 색 무리: 근거 문제없음 · 근거 다시 볼 것 · 오답', () => {
    for (const category of ['SUPPORTED_CORRECT', 'WEAK_CORRECT', 'SURE_CORRECT', 'UNVERIFIED', 'UNSURE_CORRECT', 'PENDING', 'CHECKING'] as const) expect(resultGroup(category)).toBe('good');
    expect(resultGroup('ERROR_CORRECT')).toBe('check'); expect(resultGroup('WRONG')).toBe('wrong');
  });
  it('정답 범주별 설명과 비활성 칭찬, 정답률이 낮으면 어려운 문제 칭찬', () => {
    expect(resultRow(card())).toMatchObject({ description: '정답(정답률 화작 30% · 언매 40%). 근거도 명확했어.', button: { label: '잘했어!', enabled: false } });
    expect(resultRow(card({ megastudy: { correctRate: [12, 18], chosenPercents: [1, 1] } })).button.label).toBe('어려운 문제인데 정말 잘했어!');
    expect(resultRow(card({ category: 'WEAK_CORRECT' })).description).toBe('정답(정답률 화작 30% · 언매 40%). 근거는 조금 더 다듬을 수 있어.');
    expect(resultRow(card({ category: 'WEAK_CORRECT' }), 2).description).toBe('정답(정답률 화작 30% · 언매 40%). 근거가 확인되는 정답이야.');
    expect(resultRow(card({ category: 'UNVERIFIED' })).description).toBe('정답(정답률 화작 30% · 언매 40%). 근거로 풀이를 확인하지는 못했어.');
    for (const tiers of [3, 2] as const) expect(resultRow(card({ category: 'WEAK_CORRECT', elimination: true }), tiers)).toMatchObject({ description: '정답(정답률 화작 30% · 언매 40%). 정답이 아닌 선지들을 잘 걸렀어.', button: { label: '잘했어!', enabled: false } });
    expect(resultRow(card({ category: 'UNVERIFIED' })).button.label).toBe('잘했어!');
    expect(resultRow(card({ category: 'SURE_CORRECT' }))).toMatchObject({ description: '정답(정답률 화작 30% · 언매 40%). 확신을 갖고 풀었어.', button: { label: '확신을 갖고 풀었구나. 대단해!', enabled: false } });
    expect(resultRow(card({ category: 'UNSURE_CORRECT' }))).toMatchObject({ description: '정답(정답률 화작 30% · 언매 40%). 근거는 없었어.', button: { label: '맞혔어!', enabled: false } });
  });
  it('리뷰 대상은 활성 버튼이고 검토를 마치면 완료 문구로 비활성이 된다', () => {
    expect(resultRow(card({ category: 'ERROR_CORRECT', reviewTarget: true })).button).toEqual({ label: '근거를 다시 검토해 보자', enabled: true });
    expect(resultRow(card({ category: 'ERROR_CORRECT', reviewTarget: true, reviewDone: true })).button).toEqual({ label: '검토 완료했어. 수고했어', enabled: false });
    const wrong = card({ correct: false, category: 'WRONG', reviewTarget: true });
    expect(resultRow(wrong)).toMatchObject({ description: '오답(같은 선지를 고른 비율 화작 25% · 언매 35%).', button: { label: '아깝지만 정답이 아니야. 다시 검토해 보자.', enabled: true } });
    expect(resultRow({ ...wrong, reviewDone: true }).button).toEqual({ label: '검토 완료했어. 수고했어', enabled: false });
  });
  it('판정 중이면 분석 중으로 비활성(오답도 같다), 문항 검토 오답은 비활성이다', () => {
    expect(resultRow(card({ category: 'PENDING' }))).toMatchObject({ description: '정답(정답률 화작 30% · 언매 40%). 아직 분석 중이야.', button: { label: '분석 중', enabled: false }, analyzing: true });
    expect(resultRow(card({ correct: false, category: 'WRONG', reviewTarget: true, judging: true })).button).toEqual({ label: '분석 중', enabled: false });
    expect(resultRow(card({ category: 'CHECKING' })).description).toBe('정답(정답률 화작 30% · 언매 40%). 근거는 한 번 더 확인해 볼게.');
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

describe('② 문제 풀이', () => {
  const wrong = (over: Partial<ResultItem> = {}) => item({ correct: false, category: 'WRONG', ...over });
  it('근거까지 맞은 정답: 소거법 정답은 세지 않고, 2단계 표시면 근거가 확인되는 정답', () => {
    const items = [item(), item({ category: 'WEAK_CORRECT' }), item({ category: 'WEAK_CORRECT', elimination: true, rationale: 'OMITTED' }), item({ category: 'ERROR_CORRECT' })];
    expect(accurateCorrect(items, 3)).toBe(1); expect(accurateCorrect(items, 2)).toBe(2);
  });
  it('분해 막대: 줄 1 정답|오답, 줄 2 근거 여부, 줄 3 정답 쪽은 정답의 질·오답 쪽은 문항마다 한 칸', () => {
    const items = [item({ questionId: 'a' }), item({ questionId: 'b', category: 'WEAK_CORRECT' }), item({ questionId: 'c', category: 'ERROR_CORRECT' }),
      item({ questionId: 'd', category: 'SURE_CORRECT', rationale: 'OMITTED' }), item({ questionId: 'e', category: 'UNSURE_CORRECT', rationale: 'OMITTED' }),
      item({ questionId: 'f', category: 'WEAK_CORRECT', elimination: true, rationale: 'OMITTED' }), item({ questionId: 'g', category: 'CHECKING' }), item({ questionId: 'h', category: 'PENDING' }),
      item({ questionId: 'i', category: 'UNVERIFIED' }), wrong({ questionId: 'j' }), wrong({ questionId: 'k', rationale: 'OMITTED' }), wrong({ questionId: 'l', review: true })];
    const bar = breakdown(items, 16);
    expect([bar.total, bar.correct, bar.wrong]).toEqual([16, 9, 3]);
    expect(bar.row2.correct.map(c => [c.label, c.items.length])).toEqual([['근거를 쓴 정답', 6], ['근거 없이 낸 정답', 3]]);
    expect(bar.row2.wrong.map(c => [c.label, c.items.length])).toEqual([['근거 쓰고 틀림', 2], ['근거 없이 틀림', 1]]);
    expect(bar.row3.correct.map(c => [c.label, c.items.map(x => x.questionId).join('')])).toEqual([['근거까지 정확', 'a'], ['부족·틀린 근거', 'bc'], ['확실', 'd'], ['확신 없이', 'e'], ['소거법', 'f'], ['확인 중', 'ghi']]);
    expect(bar.row3.correct.at(-1)!.gray).toBe(true);
    expect(bar.row3.wrong.map(c => c.items.map(x => x.questionId))).toEqual([['j'], ['l'], ['k']]);   // 문항마다 한 칸, 근거 쓴 문항 먼저
  });
  it('분해 막대 3줄째 오답 칸: 근거 쓴 문항 먼저, 근거 없는 문항 다음, 같은 묶음은 문항 번호 순', () => {
    const bar = breakdown([wrong({ questionId: 'a', questionNumber: 3, rationale: 'OMITTED' }), wrong({ questionId: 'b', questionNumber: 9 }),
      wrong({ questionId: 'c', questionNumber: 1, rationale: 'OMITTED' }), wrong({ questionId: 'd', questionNumber: 5 })], 16);
    expect(bar.row3.wrong.map(c => c.items[0]!.questionId)).toEqual(['d', 'b', 'c', 'a']);
    expect(bar.row2.wrong.map(c => c.items.length)).toEqual([2, 2]);   // 2줄째 칸 너비와 같은 순서로 이어진다
  });
  it('분해 막대 2단계 표시: 근거까지 정확·부족·틀린 근거를 "근거가 확인되는 정답 / 그 밖"으로', () => {
    const bar = breakdown([item({ questionId: 'a' }), item({ questionId: 'b', category: 'WEAK_CORRECT' }), item({ questionId: 'c', category: 'ERROR_CORRECT' })], 16, 2);
    expect(bar.row3.correct.map(c => [c.label, c.items.length])).toEqual([['근거가 확인되는 정답', 2], ['그 밖', 1]]);
  });
  it('근거 미입력 버튼을 누르면 저장 요청에 그 버튼의 확신 값이 실리고 글은 무시된다', () => {
    expect(answerPayload('UNSURE', '무시되는 글')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'UNSURE' });
    expect(answerPayload('SURE', '')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'SURE' });
    expect(answerPayload(null, '이유')).toEqual({ rationale: { mode: 'PROVIDED', text: '이유' }, confidence: null });
    expect(answerPayload('ELIMINATION', '', '메모')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'ELIMINATION', eliminationNote: '메모' });
    expect(answerPayload('ELIMINATION', '')).toEqual({ rationale: { mode: 'OMITTED' }, confidence: 'ELIMINATION', eliminationNote: null });
  });
  it('2단계 표시: 범주 1·2는 같은 칸으로 합치고 범주 3은 따로 둔다', () => {
    const tally = (tiers: 3 | 2) => categoryTally(counts({ SUPPORTED_CORRECT: 2, WEAK_CORRECT: 3, ERROR_CORRECT: 1 }), tiers);
    expect(tally(3)).toMatchObject({ accurate: 2, weak: 3, error: 1, denominator: 6 });
    expect(tally(2)).toMatchObject({ accurate: 5, weak: 0, error: 1, denominator: 6 });
    expect(answerQuality(item({ category: 'SUPPORTED_CORRECT' }), 2)).toBe(answerQuality(item({ category: 'WEAK_CORRECT' }), 2));
    expect(answerQuality(item({ category: 'SUPPORTED_CORRECT' }), 3)).not.toBe(answerQuality(item({ category: 'WEAK_CORRECT' }), 3));
  });
  it('정답의 질 문구', () => {
    expect(answerQuality(item())).toBe('근거도 정확했어'); expect(answerQuality(item({ category: 'WEAK_CORRECT' }))).toBe('정답이야. 근거는 조금 더 다듬을 수 있어');
    expect(answerQuality(item({ category: 'ERROR_CORRECT' }))).toBe('정답이지만 근거에 틀린 곳이 있어');
    expect(answerQuality(item({ category: 'SURE_CORRECT' }))).toBe('확실하다고 한 정답이야'); expect(answerQuality(item({ category: 'UNSURE_CORRECT' }))).toBe('확신 없이 맞힌 정답이야');
    expect(answerQuality(item({ category: 'UNVERIFIED' }))).toBe('정답이야. 근거로 풀이를 확인하지는 못했어');
    expect(answerQuality({ category: 'WEAK_CORRECT', elimination: true })).toBe('정답이야. 정답이 아닌 선지들을 잘 걸렀어'); expect(answerQuality({ category: 'WEAK_CORRECT', elimination: true }, 2)).toBe('정답이야. 정답이 아닌 선지들을 잘 걸렀어');
    expect(answerQuality(item({ category: 'PENDING' }))).toBeNull(); expect(answerQuality(item({ category: 'WRONG' }))).toBeNull();
  });
  it('①~⑤ 뒤 조사', () => { expect([1, 2, 3, 4, 5].map(circledObject)).toEqual(['①을', '②를', '③을', '④를', '⑤를']); });
});

describe('카드 글 조각·기호 풀이·함정 짝', () => {
  it('인용 구절을 굵게: 글에 없는 구절은 건너뛰고 겹치는 구절은 합친다', () => {
    expect(boldQuotes('가나다라마바', ['다라'])).toEqual([{ text: '가나', bold: false }, { text: '다라', bold: true }, { text: '마바', bold: false }]);
    expect(boldQuotes('가나다라마바', ['나다', '다라', '없음'])).toEqual([{ text: '가', bold: false }, { text: '나다라', bold: true }, { text: '마바', bold: false }]);
    expect(boldQuotes('가나', [''])).toEqual([{ text: '가나', bold: false }]);
  });
  it('선지 발췌: 구절 앞뒤만 남기고 구절은 굵게, 글에 없으면 구절만', () => {
    expect(excerptAround('앞앞앞 구절 뒤뒤뒤', '구절', 2)).toEqual([{ text: '… 앞 ', bold: false }, { text: '구절', bold: true }, { text: ' 뒤 …', bold: false }]);
    expect(excerptAround('짧은 구절', '구절')).toEqual([{ text: '짧은 ', bold: false }, { text: '구절', bold: true }, { text: '', bold: false }]);
    expect(excerptAround('선지', '다른')).toEqual([{ text: '다른', bold: true }]);
  });
  it('기호 풀이: 처음 나올 때만 괄호로 붙이고, 사전에 없는 기호는 그대로 둔다. 괄호 기호는 대괄호로 붙인다', () => {
    const gloss = { 'ⓑ': '후보 초청 제한이 위헌이라는 소수 의견', '㉠': '경마식 보도', '(가)': '앞 글' };
    const seen = new Set<string>();
    expect(annotateSymbols('ⓑ의 입장과 ㉡, 다시 ⓑ', gloss, seen)).toBe('ⓑ(후보 초청 제한이 위헌이라는 소수 의견)의 입장과 ㉡, 다시 ⓑ');
    expect(annotateSymbols('㉠과 ⓑ', gloss, seen)).toBe('㉠(경마식 보도)과 ⓑ');   // seen을 이어 쓰면 카드 안에서 한 번만
    expect(annotateSymbols('(가)에서 (가)', gloss, new Set())).toBe('(가)[앞 글]에서 (가)');
  });
  it('함정 짝: 적절하지 않은 것 고르기 오답은 정답 선지의 비틂을 쓴다. 이름은 코드가 아니라 학생용 이름', () => {
    const own = [twist()]; const answer = [twist({ twistType: 'ADDED_CONTENT' })];
    expect(twistsForPairs(item({ twist: own, answerTwist: answer }))).toBe(own);
    expect(twistsForPairs(item({ stemPolarity: 'SELECT_INCORRECT', twist: null, answerTwist: answer }))).toBe(answer);
    expect(twistName('PAIR_SWAP')).toBe('두 대상의 특징 맞바꾸기'); expect(twistName('OTHER')).toBe('그 밖의 함정');
  });
  it('긴 글 줄이기', () => { expect(clip('가나다', 5)).toBe('가나다'); expect(clip('가나다라마바', 3)).toBe('가나다…'); });
});

describe('맨 위 요약: 가장 먼저 볼 것(설계 8절)', () => {
  const found = (over: Partial<ReadingCase> = {}): ReadingCase => ({ branch: '내용', kind: 'CONTRADICTS', paragraphId: 'p-p1', paragraphPosition: 1, paragraphLabel: '1문단', relationType: 'CAUSE', studentText: '내 요약', sourceTexts: ['지문'], ...over });
  const reading = (cases: ReadingCase[]): ResultView['reading'] => [{ passageId: 'p', status: 'ready', counts: {} as never, cases }];
  const strong = (over: Partial<ResultItem> = {}) => item({ correct: false, category: 'WRONG', twist: [twist()], evidence: { student: '내 근거', source: [] }, ...over });
  it('① 학생 근거가 있는 오답 중 선지 연결 짝이 있는 문항이 먼저, 같은 순위에서는 앞선 문항', () => {
    const look = pickFirstLook([item({ questionId: 'ok' }), strong({ questionId: 'noevidence', evidence: null }), strong({ questionId: 'nopair', twist: [twist({ evidenceQuote: '' })] }),
      strong({ questionId: 'first' }), strong({ questionId: 'second' })], reading([found()]));
    expect(look).toMatchObject({ kind: 'item', item: { questionId: 'first' } });
  });
  it('적절하지 않은 것 고르기 오답은 정답 선지(answerTwist)의 짝으로 센다', () => {
    const wrongOnes = strong({ questionId: 'sel', stemPolarity: 'SELECT_INCORRECT', twist: null, answerTwist: [twist()] });
    expect(pickFirstLook([wrongOnes], [])).toMatchObject({ kind: 'item', item: { questionId: 'sel' } });
  });
  it('② 짝이 있는 오답이 없으면 요약에서 다르게 이은 곳(빠뜨림은 건너뜀)', () => {
    const look = pickFirstLook([item()], reading([found({ kind: 'MISSING', paragraphPosition: 1 }), found({ paragraphPosition: 2, paragraphId: 'p-p2' })]));
    expect(look).toMatchObject({ kind: 'case', entry: { passageId: 'p', index: 1 } });
  });
  it('③ 그것도 없으면 근거가 부족한 정답(소거법·근거 없는 정답은 제외)', () => {
    const items = [item({ questionId: 'elim', category: 'WEAK_CORRECT', elimination: true, evidence: { student: '메모', source: [] } }), item({ questionId: 'plain' }),
      item({ questionId: 'weak', category: 'WEAK_CORRECT', evidence: { student: '내 근거', source: [{ location: 'PASSAGE', quote: '원문' }] } })];
    expect(pickFirstLook(items, reading([found({ kind: 'MISSING' })]))).toMatchObject({ kind: 'item', item: { questionId: 'weak' } });
  });
  it('사례가 하나도 없으면 null이고, 문항 검토 문항은 쓰지 않는다', () => {
    expect(pickFirstLook([item(), strong({ review: true })], reading([]))).toBeNull();
  });
});

describe('③ 독해 패턴', () => {
  const counts = (over: Partial<ReadingCounts['layers']> = {}): ReadingCounts => ({
    layers: { 요지: { caught: 7, total: 9 }, 합성: { caught: 6, total: 12 }, 명제: { caught: 11, total: 30 }, ...over },
    branches: { 내용: { caught: 6, total: 8, wrong: 1 }, 논증: { caught: 0, total: 0, wrong: 0 }, 관점: { caught: 2, total: 3, wrong: 0 }, 흐름: { caught: 1, total: 2, wrong: 0 } } });
  it('점수 칸은 문단 요지·내용 묶음 둘, 세부(명제)는 참고 한 줄', () => {
    expect(layerRows(counts())).toEqual([{ key: '요지', name: '문단 요지', caught: 7, total: 9 }, { key: '합성', name: '내용 묶음', caught: 6, total: 12 }]);
    expect(detailLine(counts())).toBe('참고 · 요약에 함께 담은 세부 내용 11곳 (지문 전체 30곳). 요약은 세부를 추려 내는 일이라 이 수가 적다고 모자란 건 아니야.');
    expect(detailLine(counts({ 명제: { caught: 0, total: 0 } }))).toBeNull();
  });
  it('갈래 행: 네 갈래 모두 같은 틀("m곳 중 n곳 · k곳 다르게")', () => {
    const rows = branchRows(counts());
    expect(rows.map(r => r.name)).toEqual(['대상 사이의 관계', '주장과 근거', '사람·이론 사이의 입장', '글의 흐름']);
    expect(rows.map(r => r.text)).toEqual(['8곳 중 6곳 · 1곳 다르게', '0곳 중 0곳 · 0곳 다르게', '3곳 중 2곳 · 0곳 다르게', '2곳 중 1곳 · 0곳 다르게']);
  });
  it('갈래 사례: 다르게 이은 곳을 앞에, 같은 종류 안에서는 지문 순서', () => {
    const reading: ResultView['reading'] = [{ passageId: 'a', status: 'ready', counts: {} as never, cases: [
      { branch: '내용', kind: 'MISSING', paragraphId: 'a-p1', paragraphPosition: 1, paragraphLabel: '1문단', relationType: 'CAUSE', studentText: '', sourceTexts: [] },
      { branch: '흐름', kind: 'CONTRADICTS', paragraphId: 'a-p1', paragraphPosition: 1, paragraphLabel: '1문단', relationType: 'BACKGROUND', studentText: '', sourceTexts: [] },
      { branch: '내용', kind: 'CONTRADICTS', paragraphId: 'a-p2', paragraphPosition: 2, paragraphLabel: '2문단', relationType: 'CAUSE', studentText: '', sourceTexts: [] }] },
    { passageId: 'b', status: 'failed', counts: {} as never, cases: [{ branch: '내용', kind: 'CONTRADICTS', paragraphId: 'b-p1', paragraphPosition: 1, paragraphLabel: '1문단', relationType: 'CAUSE', studentText: '', sourceTexts: [] }] }];
    const entries = caseEntries(reading);   // 아직 판정 중이거나 실패한 지문의 사례는 쓰지 않는다
    expect(entries).toHaveLength(3);
    expect(casesOfBranch(entries, '내용').map(e => [e.passageId, e.index])).toEqual([['a', 2], ['a', 0]]);
    expect(casesOfBranch(entries, '논증')).toEqual([]);
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
    const base = { position: { status: 'ready' }, steps: { status: 'ready', counts: {}, denominator: 0 }, twists: { counts: {} }, recommendation: null, reading: [], items: [item()], readingHabit: { status: 'none' } } as never as ResultView;
    expect(hasPending(base)).toBe(false);
    expect(hasPending({ ...base, items: [item({ review: true, correct: false, judgment: { status: 'pending', contentAssessment: null, boundary: null } })] })).toBe(false);
    expect(hasPending({ ...base, items: [item({ judgment: { status: 'pending', contentAssessment: null, boundary: null } })] })).toBe(true);
    expect(hasPending({ ...base, items: [item({ summaryLink: { status: 'pending', kind: 'MISSED', paragraphs: [1], paragraphLabel: '1문단' } })] })).toBe(true);
    expect(hasPending({ ...base, readingHabit: { status: 'pending' } })).toBe(true);
    expect(hasPending({ ...base, reading: [{ passageId: 'p', status: 'pending', counts: {} as never, cases: [] }] })).toBe(true);
    // 사고 진단·단계 집계는 화면에 내지 않으므로 분석 중이어도 다시 받아 오지 않는다
    expect(hasPending({ ...base, steps: { status: 'pending', counts: {}, denominator: 0 } })).toBe(false);
    expect(hasPending({ ...base, items: [item({ thoughtDiagnosis: { status: 'pending', firstFailedStep: null, outcomeType: null } })] })).toBe(false);
  });
  it('원문 인용 위치 이름: 공식 해설은 내지 않는다', () => {
    expect(sourceLocationName('PASSAGE')).toBe('지문'); expect(sourceLocationName('SCENARIO')).toBe('보기'); expect(sourceLocationName('EXPLANATION')).toBeNull();
  });
});
