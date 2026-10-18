import { describe, expect, it } from 'vitest';
import { applySimpleAction, checkSimpleOutput as rawCheck, expectedAction, initialSimpleState, type SimpleParagraphState } from './rules.js';
import type { SimpleAction, SimpleCategory, SimpleCorePart, SimpleGap, SimpleEvaluationInput, SimpleOutput, SimpleStage } from './schema.js';

const paragraph = '광합성은 빛에너지를 화학에너지로 바꾼다. 이 과정에서 산소가 나온다.';
const parts: SimpleCorePart[] = [{ description: '에너지 전환', sourceQuote: '빛에너지를 화학에너지로 바꾼다' }, { description: '산소 발생', sourceQuote: '산소가 나온다' }];
const gap = { corePartIndex: 1, description: '산소', sourceQuote: '산소가 나온다', question: '이 과정에서 무엇이 생기는지 다시 볼래?', asksOneThing: true };
const gap2 = { corePartIndex: 0, description: '에너지', sourceQuote: '빛에너지를 화학에너지로 바꾼다', question: '무엇이 무엇으로 바뀌는지 말해 볼래?', asksOneThing: true };
const input = (stage: SimpleStage, student = '광합성은 빛을 화학에너지로 바꾼다', targetGaps: SimpleGap[] | null = stage === 'AFTER_GAP' ? [gap] : null): SimpleEvaluationInput => ({
  passage: { title: '광합성', paragraphs: [{ paragraphId: 'p1', text: paragraph }] },
  targetParagraph: { paragraphId: 'p1', text: paragraph }, stage,
  dialogue: [{ role: 'student', text: student }], coreParts: stage === 'INITIAL' ? null : parts, targetError: null, targetGaps,
});
const err = { studentQuote: '빛을 화학에너지로', correction: '빛에너지가 화학에너지로 바뀐다', sourceQuote: '빛에너지를 화학에너지로 바꾼다', corePartIndex: 0, gapIndex: null, feedback: '' };
const errFb = { ...err, feedback: '빛이 아니라 빛에너지가 바뀌어' };
const errFb1 = { ...errFb, corePartIndex: 1 };
const base: SimpleOutput = { category: 'CAPTURED', reason: '이유', coreParts: parts, corePartsCovered: [true, true], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '잘했어', coreIntro: null, coreSummary: null, missingNote: null, coreSourceQuote: null };
/** 테스트 편의: INITIAL이 아닌 단계에서 기본 coreParts(parts)를 쓴 출력은 빈 배열로 바꿔 검증한다. coreParts·corePartsCovered 자체를 겨냥한 테스트는 rawCheck를 쓴다. */
const checkSimpleOutput = (i: SimpleEvaluationInput, o: SimpleOutput) => rawCheck(i, i.stage !== 'INITIAL' && o.coreParts === parts ? { ...o, coreParts: [] } : o);
const praiseAfter = { coreIntro: '내가 파악한 핵심은 이거야.', coreSummary: '핵심' };

describe('행동 표 13줄', () => {
  const rows: [SimpleStage, SimpleCategory, boolean | null, SimpleAction][] = [
    ['INITIAL', 'CAPTURED', null, 'PRAISE'],
    ['INITIAL', 'IRRELEVANT', null, 'RETRY_PROMPT'], ['INITIAL', 'COPY', null, 'RETRY_PROMPT'],
    ['RETRY', 'IRRELEVANT', null, 'CLOSE_NO_RESPONSE'], ['RETRY', 'COPY', null, 'CLOSE_NO_RESPONSE'],
    ['INITIAL', 'GAP', null, 'GAP_QUESTION'], ['RETRY', 'GAP', null, 'GAP_QUESTION'],
    ['INITIAL', 'ONE_ERROR', null, 'CORRECTION_QUESTION'], ['RETRY', 'ONE_ERROR', null, 'CORRECTION_QUESTION'],
    ['INITIAL', 'MULTI_ERROR', null, 'CLOSE_ERRORS'], ['RETRY', 'MULTI_ERROR', null, 'CLOSE_ERRORS'],
    ['RETRY', 'CAPTURED', null, 'PRAISE'],
    ['AFTER_CORRECTION', 'CAPTURED', true, 'PRAISE'],
    ['AFTER_CORRECTION', 'GAP', true, 'GAP_QUESTION'],
    ['AFTER_CORRECTION', 'CAPTURED', false, 'CLOSE_ERRORS'], ['AFTER_CORRECTION', 'GAP', false, 'CLOSE_ERRORS'],
    ['AFTER_CORRECTION', 'ONE_ERROR', true, 'CLOSE_ERRORS'], ['AFTER_CORRECTION', 'IRRELEVANT', true, 'CLOSE_ERRORS'],
    ['AFTER_GAP', 'CAPTURED', null, 'PRAISE'],
    ['AFTER_GAP', 'ONE_ERROR', null, 'CLOSE_ERRORS'], ['AFTER_GAP', 'MULTI_ERROR', null, 'CLOSE_ERRORS'],
    ['AFTER_GAP', 'GAP', null, 'CLOSE_GAP'], ['AFTER_GAP', 'IRRELEVANT', null, 'CLOSE_GAP'], ['AFTER_GAP', 'COPY', null, 'CLOSE_GAP'],
  ];
  it.each(rows)('%s / %s / resolved=%s -> %s', (stage, category, resolved, action) => {
    expect(expectedAction(stage, { category, targetErrorResolved: resolved })).toBe(action);
  });
});

describe('출력 검증', () => {
  it('정상 출력은 통과한다', () => {
    expect(checkSimpleOutput(input('INITIAL'), base).problems).toEqual([]);
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION', corePartsCovered: [false, true] };
    expect(checkSimpleOutput(input('INITIAL'), one).problems).toEqual([]);
  });
  it('restatedSummary는 빈 문자열이어도 통과한다', () => {
    expect(checkSimpleOutput(input('INITIAL'), { ...base, restatedSummary: '' }).problems).toEqual([]);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, restatedSummary: undefined }).output).toBeNull();
  });
  it('행동 표와 다른 action을 잡는다', () => {
    expect(checkSimpleOutput(input('INITIAL'), { ...base, action: 'CLOSE_GAP' }).problems.join()).toMatch(/행동 표/);
  });
  it('학생 인용·원문 인용·개수·null 규칙 위반을 잡는다', () => {
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION', corePartsCovered: [false, true] };
    expect(checkSimpleOutput(input('INITIAL', '전혀 다른 말'), one).problems.join()).toMatch(/studentQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...one, errors: [{ ...err, sourceQuote: '빛에너지를  화학에너지로' }] }).problems.join()).toMatch(/sourceQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...one, errors: [] }).problems.join()).toMatch(/정확히 1개/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, targetErrorResolved: true }).problems.join()).toMatch(/targetErrorResolved/);
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), base).problems.join()).toMatch(/targetErrorResolved/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, message: ' ' }).problems.join()).toMatch(/message/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, coreSummary: '요약' }).problems.join()).toMatch(/coreSummary/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, category: 'MULTI_ERROR', errors: [err], action: 'CLOSE_ERRORS', coreSummary: '요약' }).problems.join()).toMatch(/2개 이상/);
  });
  it('마무리 행동은 coreSummary가 필요하고, 교정·구멍 뒤 CLOSE_ERRORS는 오류 1개 이상이면 된다', () => {
    const close: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [errFb], action: 'CLOSE_ERRORS', targetErrorResolved: false, coreIntro: '내가 보는 핵심은 이래.', coreSummary: null, corePartsCovered: [false, true] };
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), close).problems.join()).toMatch(/coreSummary/);
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), { ...close, coreSummary: '핵심' }).problems).toEqual([]);
    const afterGap = { ...close, targetErrorResolved: null, targetGapReadings: ['읽기'], targetGapsFilled: [false], coreSummary: '핵심', errors: [errFb, errFb1], corePartsCovered: [false, false], missingNote: '빠진 내용' };
    expect(checkSimpleOutput(input('AFTER_GAP'), afterGap).problems).toEqual([]);
    expect(checkSimpleOutput(input('AFTER_GAP'), { ...afterGap, errors: [] }).problems.join()).toMatch(/1개 이상/);
  });
  it('v3: feedback·coreIntro는 CLOSE_ERRORS에서만 채우고, 통과·실패를 가른다', () => {
    const close: SimpleOutput = { ...base, category: 'MULTI_ERROR', errors: [errFb, errFb1], corePartsCovered: [false, false], action: 'CLOSE_ERRORS', coreIntro: '내가 보는 핵심은 이래.', coreSummary: '핵심' };
    expect(checkSimpleOutput(input('INITIAL'), close).problems).toEqual([]);
    expect(checkSimpleOutput(input('INITIAL'), { ...close, errors: [errFb, err] }).problems.join()).toMatch(/errors\[1\]\.feedback/);
    expect(checkSimpleOutput(input('INITIAL'), { ...close, errors: [errFb, { ...errFb1, feedback: ' ' }] }).problems.join()).toMatch(/feedback/);
    expect(checkSimpleOutput(input('INITIAL'), { ...close, coreIntro: null }).problems.join()).toMatch(/coreIntro/);
    expect(checkSimpleOutput(input('INITIAL'), { ...close, coreIntro: '가'.repeat(61) }).problems.join()).toMatch(/coreIntro/);
    expect(checkSimpleOutput(input('INITIAL'), { ...close, coreIntro: '가'.repeat(60) }).problems).toEqual([]);
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [errFb], action: 'CORRECTION_QUESTION', corePartsCovered: [false, true] };
    expect(checkSimpleOutput(input('INITIAL'), one).problems.join()).toMatch(/feedback/);
    expect(checkSimpleOutput(input('INITIAL'), { ...one, errors: [err] }).problems).toEqual([]);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, coreIntro: '도입' }).problems.join()).toMatch(/coreIntro/);
  });
  it('v3: coreSourceQuote는 CLOSE_NO_RESPONSE에서만, 대상 문단의 연속 부분 문자열이어야 한다', () => {
    const none: SimpleOutput = { ...base, corePartsCovered: [false, false], category: 'COPY', action: 'CLOSE_NO_RESPONSE', coreSummary: '핵심', coreSourceQuote: '이 과정에서 산소가 나온다.' };
    expect(checkSimpleOutput(input('RETRY'), none).problems).toEqual([]);
    expect(checkSimpleOutput(input('RETRY'), { ...none, coreSourceQuote: null }).problems.join()).toMatch(/coreSourceQuote/);
    expect(checkSimpleOutput(input('RETRY'), { ...none, coreSourceQuote: '' }).problems.join()).toMatch(/coreSourceQuote/);
    expect(checkSimpleOutput(input('RETRY'), { ...none, coreSourceQuote: '문단에 없는 문장' }).problems.join()).toMatch(/coreSourceQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, coreSourceQuote: '산소가 나온다' }).problems.join()).toMatch(/coreSourceQuote/);
  });
  it('v4: GAP_QUESTION의 gaps는 1~2개, 필드 비어 있지 않음, sourceQuote는 문단 부분 문자열', () => {
    const q: SimpleOutput = { ...base, category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', corePartsCovered: [true, false] };
    expect(checkSimpleOutput(input('INITIAL'), q).problems).toEqual([]);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, corePartsCovered: [false, false], gaps: [gap, gap2] }).problems).toEqual([]);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, gaps: [] }).problems.join()).toMatch(/1개 또는 2개/);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, gaps: [gap, gap, gap] }).problems.join()).toMatch(/1개 또는 2개/);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, gaps: [{ ...gap, question: ' ' }] }).problems.join()).toMatch(/question/);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, gaps: [{ ...gap, description: '' }] }).problems.join()).toMatch(/description/);
    expect(checkSimpleOutput(input('INITIAL'), { ...q, gaps: [{ ...gap, sourceQuote: '없는 문장' }] }).problems.join()).toMatch(/gaps\[0\]\.sourceQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, gaps: [gap] }).problems.join()).toMatch(/gaps는 빈 배열/);
  });
  it('v4: targetGapsFilled는 AFTER_GAP에서만 targetGaps와 같은 길이이고 판정과 일관된다', () => {
    const afterGap = (patch: Partial<SimpleOutput>, gaps = [gap, gap2]) => checkSimpleOutput(input('AFTER_GAP', undefined, gaps), { ...base, ...praiseAfter, targetGapReadings: (patch.targetGapsFilled ?? []).map(() => '읽기'), ...patch }).problems.join();
    expect(afterGap({ targetGapsFilled: [true, true] })).toBe('');
    expect(afterGap({ targetGapsFilled: [true] })).toMatch(/같은 길이/);
    expect(afterGap({ targetGapsFilled: null })).toMatch(/같은 길이/);
    expect(afterGap({ targetGapsFilled: [true, false] })).toMatch(/CAPTURED면/);
    const closeGap: Partial<SimpleOutput> = { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [true, false] };
    expect(afterGap(closeGap)).toBe('');
    expect(afterGap({ ...closeGap, targetGapsFilled: [true, true] })).toMatch(/GAP이면/);
    expect(afterGap({ ...closeGap, category: 'IRRELEVANT', targetGapsFilled: [false, false] })).toBe('');
    expect(afterGap({ ...closeGap, category: 'COPY', targetGapsFilled: [true, false] })).toMatch(/모두 false/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, targetGapsFilled: [true] }).problems.join()).toMatch(/AFTER_GAP에서만/);
  });
  it('v4: 질문 뒤 PRAISE와 CLOSE_GAP은 coreIntro·coreSummary가 필요하고 INITIAL·RETRY PRAISE는 null이다', () => {
    const afterGap = (patch: Partial<SimpleOutput>) => checkSimpleOutput(input('AFTER_GAP'), { ...base, targetGapReadings: ['읽기'], targetGapsFilled: [true], ...patch }).problems.join();
    expect(afterGap(praiseAfter)).toBe('');
    expect(afterGap({ coreSummary: '핵심' })).toMatch(/coreIntro/);
    expect(afterGap({ coreIntro: '도입' })).toMatch(/coreSummary/);
    expect(afterGap({ ...praiseAfter, coreIntro: '가'.repeat(61) })).toMatch(/coreIntro/);
    const corr = (patch: Partial<SimpleOutput>) => checkSimpleOutput(input('AFTER_CORRECTION'), { ...base, targetErrorResolved: true, ...patch }).problems.join();
    expect(corr(praiseAfter)).toBe('');
    expect(corr({})).toMatch(/coreSummary/);
    expect(checkSimpleOutput(input('RETRY'), { ...base, ...praiseAfter }).problems.join()).toMatch(/coreSummary/);
    const closeGap: Partial<SimpleOutput> = { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false] };
    expect(afterGap({ ...closeGap, ...praiseAfter })).toBe('');
    expect(afterGap(closeGap)).toMatch(/coreIntro/);
    expect(afterGap({ ...closeGap, coreIntro: '도입' })).toMatch(/coreSummary/);
  });
  it('v4.1: targetGapReadings·errors[].gapIndex·missingNote 검증', () => {
    const closeErr = (patch: Partial<SimpleOutput>, gaps = [gap, gap2], student = '빛을 화학에너지로') => checkSimpleOutput(input('AFTER_GAP', student, gaps),
      { ...base, category: 'MULTI_ERROR', action: 'CLOSE_ERRORS', coreIntro: '도입', coreSummary: '핵심', targetGapReadings: ['읽기', ''], targetGapsFilled: [false, false],
        errors: [{ ...errFb, gapIndex: 0 }, { ...errFb, corePartIndex: 1, gapIndex: 1 }], corePartsCovered: [false, false], ...patch }).problems.join();
    expect(closeErr({})).toBe('');
    expect(closeErr({ targetGapReadings: ['읽기'] })).toMatch(/targetGapReadings/);
    expect(closeErr({ targetGapReadings: null })).toMatch(/targetGapReadings/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, targetGapReadings: [] }).problems.join()).toMatch(/targetGapReadings/);
    expect(closeErr({ errors: [{ ...errFb, gapIndex: 2 }, { ...errFb, gapIndex: null }], missingNote: '빠짐' })).toMatch(/gapIndex/);
    expect(closeErr({ errors: [{ ...errFb, gapIndex: -1 }, { ...errFb, gapIndex: null }], missingNote: '빠짐' })).toMatch(/gapIndex/);
    expect(closeErr({ targetGapsFilled: [true, false], errors: [{ ...errFb, gapIndex: 0 }, { ...errFb, corePartIndex: 1, gapIndex: 1 }] })).toMatch(/errors\[0\]\.gapIndex.*false/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, category: 'ONE_ERROR', action: 'CORRECTION_QUESTION', errors: [{ ...err, gapIndex: 0 }] }).problems.join()).toMatch(/gapIndex/);
    // 오류도 채움도 아닌 항목이 있으면 missingNote 필수
    const partial = { errors: [errFb, { ...errFb, corePartIndex: 1, gapIndex: 1 }], targetGapsFilled: [false, false] };
    expect(closeErr({ ...partial, missingNote: null })).toMatch(/missingNote/);
    expect(closeErr({ ...partial, missingNote: ' ' })).toMatch(/missingNote/);
    expect(closeErr({ ...partial, missingNote: '첫째 항목이 빠졌어' })).toBe('');
    // 채움 true인 항목은 빠진 것이 아니다
    expect(closeErr({ errors: [errFb, { ...errFb, corePartIndex: 1, gapIndex: 1 }], targetGapsFilled: [true, false], missingNote: '불필요' })).toMatch(/missingNote/);
    expect(closeErr({ errors: [errFb, { ...errFb, corePartIndex: 1, gapIndex: 1 }], targetGapsFilled: [true, false] })).toBe('');
    // 오류 없는(gapIndex null) 오류가 있어도 항목은 여전히 미처리
    expect(closeErr({ errors: [errFb, errFb1], targetGapsFilled: [false, false], missingNote: '둘 다 빠짐' })).toBe('');
  });
  it('v4.1: 시험 3사례의 출력 형태(둘 다 틀림 / 둘째만 틀림 / 첫째 틀림·둘째 모름)가 통과한다', () => {
    const run = (filled: boolean[], errors: SimpleOutput['errors'], missingNote: string | null) => checkSimpleOutput(input('AFTER_GAP', '빛을 화학에너지로\n빛을 화학에너지로', [gap, gap2]),
      { ...base, category: 'MULTI_ERROR', errors, action: 'CLOSE_ERRORS', corePartsCovered: [false, false], targetGapReadings: ['읽기', ''], targetGapsFilled: filled, coreIntro: '도입', coreSummary: '핵심', missingNote }).problems;
    expect(run([false, false], [{ ...errFb, gapIndex: 0 }, { ...errFb, corePartIndex: 1, gapIndex: 1 }], null)).toEqual([]);
    expect(run([true, false], [{ ...errFb, corePartIndex: 1, gapIndex: 1 }, errFb], null)).toEqual([]);
    expect(run([false, false], [{ ...errFb, gapIndex: 0 }, errFb1], '아직 빠진 부분이 있어')).toEqual([]);
  });
  it('v4.2: INITIAL의 coreParts는 1~3개, description·sourceQuote 규칙, 그 밖의 단계는 빈 배열', () => {
    expect(rawCheck(input('INITIAL'), base).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...base, coreParts: [], corePartsCovered: [] }).problems.join()).toMatch(/1~3개/);
    const four = [...parts, ...parts];
    expect(rawCheck(input('INITIAL'), { ...base, coreParts: four, corePartsCovered: [true, true, true, true] }).problems.join()).toMatch(/1~3개/);
    expect(rawCheck(input('INITIAL'), { ...base, coreParts: [{ ...parts[0]!, description: ' ' }, parts[1]!] }).problems.join()).toMatch(/coreParts\[0\]\.description/);
    expect(rawCheck(input('INITIAL'), { ...base, coreParts: [parts[0]!, { ...parts[1]!, sourceQuote: '없는 문장' }] }).problems.join()).toMatch(/coreParts\[1\]\.sourceQuote/);
    expect(rawCheck(input('RETRY'), base).problems.join()).toMatch(/coreParts는 INITIAL에서만/);
    expect(rawCheck(input('RETRY'), { ...base, coreParts: [] }).problems).toEqual([]);
  });
  it('v4.2: corePartsCovered 길이와 CAPTURED/GAP/IRRELEVANT·COPY 일관성', () => {
    expect(rawCheck(input('INITIAL'), { ...base, corePartsCovered: [true] }).problems.join()).toMatch(/같은 길이/);
    expect(rawCheck(input('RETRY'), { ...base, coreParts: [], corePartsCovered: [true] }).problems.join()).toMatch(/같은 길이/);
    expect(rawCheck(input('INITIAL'), { ...base, corePartsCovered: [true, false] }).problems.join()).toMatch(/CAPTURED면/);
    const q: SimpleOutput = { ...base, category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', corePartsCovered: [true, false] };
    expect(rawCheck(input('INITIAL'), { ...q, corePartsCovered: [true, true] }).problems.join()).toMatch(/GAP이면/);
    expect(rawCheck(input('AFTER_CORRECTION'), { ...q, coreParts: [], targetErrorResolved: true }).problems).toEqual([]);
    const irr: SimpleOutput = { ...base, category: 'IRRELEVANT', action: 'RETRY_PROMPT', corePartsCovered: [false, false] };
    expect(rawCheck(input('INITIAL'), irr).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...irr, category: 'COPY', corePartsCovered: [true, false] }).problems.join()).toMatch(/모두 false/);
  });
  it('v4.2: errors[].corePartIndex는 범위 안·중복 없음·그 부분 corePartsCovered=false', () => {
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION', corePartsCovered: [false, true] };
    expect(rawCheck(input('INITIAL'), one).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...one, errors: [{ ...err, corePartIndex: 2 }] }).problems.join()).toMatch(/범위 밖/);
    expect(rawCheck(input('INITIAL'), { ...one, errors: [{ ...err, corePartIndex: -1 }] }).problems.join()).toMatch(/범위 밖/);
    expect(rawCheck(input('INITIAL'), { ...one, errors: [{ ...err, corePartIndex: 1 }] }).problems.join()).toMatch(/corePartsCovered가 false여야/);
    const multi: SimpleOutput = { ...one, category: 'MULTI_ERROR', action: 'CLOSE_ERRORS', corePartsCovered: [false, false], coreIntro: '도입', coreSummary: '핵심', errors: [errFb, errFb1] };
    expect(rawCheck(input('INITIAL'), multi).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...multi, errors: [errFb, errFb] }).problems.join()).toMatch(/겹친다/);
  });
  it('v4.2: GAP_QUESTION의 gaps는 담지 못한 부분과 짝지어지고 개수·asksOneThing이 맞아야 한다', () => {
    const q: SimpleOutput = { ...base, category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', corePartsCovered: [true, false] };
    expect(rawCheck(input('INITIAL'), q).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...q, gaps: [gap2] }).problems.join()).toMatch(/gaps\[0\]\.corePartIndex.*false여야/);
    expect(rawCheck(input('INITIAL'), { ...q, gaps: [{ ...gap, corePartIndex: 5 }] }).problems.join()).toMatch(/범위 밖/);
    expect(rawCheck(input('INITIAL'), { ...q, corePartsCovered: [false, false], gaps: [gap, { ...gap2, corePartIndex: 1 }] }).problems.join()).toMatch(/겹친다/);
    expect(rawCheck(input('INITIAL'), { ...q, corePartsCovered: [false, false] }).problems.join()).toMatch(/맞아야/);
    expect(rawCheck(input('INITIAL'), { ...q, gaps: [{ ...gap, asksOneThing: false }] }).problems.join()).toMatch(/asksOneThing/);
    const three = [...parts, { description: '셋째', sourceQuote: '광합성은' }];
    const t = { ...q, coreParts: three, corePartsCovered: [false, false, false] };
    expect(rawCheck(input('INITIAL'), { ...t, gaps: [gap, gap2] }).problems).toEqual([]);
    expect(rawCheck(input('INITIAL'), { ...t, gaps: [gap] }).problems.join()).toMatch(/맞아야/);
  });
  it('스키마 위반은 문제로 돌려준다', () => {
    const r = checkSimpleOutput(input('INITIAL'), { category: 'X' });
    expect(r.output).toBeNull(); expect(r.problems[0]).toMatch(/스키마/);
  });
});

describe('문단 상태 기계', () => {
  const out = (patch: Partial<SimpleOutput>): SimpleOutput => ({ ...base, ...patch });
  const step = (s: SimpleParagraphState, patch: Partial<SimpleOutput>) => applySimpleAction(s, out(patch));
  it('PRAISE / CLOSE_NO_RESPONSE / RETRY_PROMPT', () => {
    expect(step(initialSimpleState(), {})).toMatchObject({ done: true, outcome: 'CAPTURED', revealQuotes: [] });
    const retry = step(initialSimpleState(), { category: 'COPY', action: 'RETRY_PROMPT' });
    expect(retry).toMatchObject({ done: false, stage: 'RETRY', retryUsed: true, questionsAsked: 0 });
    expect(step(retry, { category: 'COPY', action: 'CLOSE_NO_RESPONSE', coreSummary: '핵심', coreSourceQuote: '산소가 나온다' })).toMatchObject({ done: true, outcome: 'NO_RESPONSE', revealQuotes: ['산소가 나온다'] });
    expect(step(retry, { category: 'COPY', action: 'CLOSE_NO_RESPONSE', coreSummary: '핵심' })).toMatchObject({ outcome: 'NO_RESPONSE', revealQuotes: [] });
  });
  it('질문은 표시 구절을 만들지 않고, 마무리에서만 만든다', () => {
    const g = step(initialSimpleState(), { category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' });
    expect(g).toMatchObject({ stage: 'AFTER_GAP', questionsAsked: 1, targetGaps: [gap], revealQuotes: [], done: false });
    const c = step(initialSimpleState(), { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' });
    expect(c).toMatchObject({ stage: 'AFTER_CORRECTION', questionsAsked: 1, targetError: err, revealQuotes: [], done: false });
    expect(step(g, { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false] })).toMatchObject({ done: true, outcome: 'GAP_REVEALED', revealQuotes: ['산소가 나온다'] });
    expect(step(c, { category: 'ONE_ERROR', errors: [err, { ...err, sourceQuote: '산소가 나온다' }], action: 'CLOSE_ERRORS', coreSummary: '핵심' }))
      .toMatchObject({ done: true, outcome: 'ERRORS_REVEALED', revealQuotes: [err.sourceQuote, '산소가 나온다'] });
  });
  it('교정 -> 구멍으로 질문 2회가 정상 최대이고, 세 번째 질문은 불변식 위반이다', () => {
    const c = step(initialSimpleState(), { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' });
    const g = step(c, { category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', targetErrorResolved: true });
    expect(g.questionsAsked).toBe(2);
    expect(() => step(g, { category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' })).toThrow(/불변식/);
    expect(() => step(g, { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' })).toThrow(/불변식/);
  });
  it('정상 흐름(행동 표를 따르는 모든 경로)에서는 질문이 2회를 넘지 않는다', () => {
    const categories: SimpleCategory[] = ['CAPTURED', 'GAP', 'ONE_ERROR', 'MULTI_ERROR', 'IRRELEVANT', 'COPY'];
    const walk = (s: SimpleParagraphState, depth: number): void => {
      expect(s.questionsAsked).toBeLessThanOrEqual(2);
      if (s.done) return;
      expect(depth).toBeLessThan(8);
      for (const category of categories) for (const resolved of s.stage === 'AFTER_CORRECTION' ? [true, false] : [null]) {
        const action = expectedAction(s.stage, { category, targetErrorResolved: resolved });
        walk(applySimpleAction(s, out({ category, targetErrorResolved: resolved, action, errors: [err], gaps: [gap], targetGapsFilled: s.stage === 'AFTER_GAP' ? [false] : null })), depth + 1);
      }
    };
    walk(initialSimpleState(), 0);
  });
  it('AFTER_GAP CLOSE_ERRORS는 오류 근거 문장 + 오류도 채움도 아닌 항목의 근거 문장을 표시한다(중복 제거)', () => {
    const g = step(initialSimpleState(), { category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION' });
    const close = (patch: Partial<SimpleOutput>) => step(g, { category: 'ONE_ERROR', action: 'CLOSE_ERRORS', coreSummary: '핵심', ...patch }).revealQuotes;
    const e0 = { ...err, sourceQuote: gap.sourceQuote, gapIndex: 0 };
    expect(close({ errors: [e0], targetGapsFilled: [false, false] })).toEqual([gap.sourceQuote, gap2.sourceQuote]);
    expect(close({ errors: [e0], targetGapsFilled: [false, true] })).toEqual([gap.sourceQuote]);
    expect(close({ errors: [e0, { ...err, gapIndex: 1 }], targetGapsFilled: [false, false] })).toEqual([gap.sourceQuote, err.sourceQuote]);
    expect(close({ errors: [{ ...err, sourceQuote: gap.sourceQuote }], targetGapsFilled: [true, false] })).toEqual([gap.sourceQuote, gap2.sourceQuote]);
    // AFTER_GAP이 아니면 오류 근거 문장만
    const c = step(initialSimpleState(), { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' });
    expect(step(c, { category: 'ONE_ERROR', errors: [err], action: 'CLOSE_ERRORS', coreSummary: '핵심' }).revealQuotes).toEqual([err.sourceQuote]);
  });
  it('v4.2: coreParts는 INITIAL 출력으로 저장되고 이후 단계에서는 유지된다', () => {
    expect(initialSimpleState().coreParts).toEqual([]);
    const g = step(initialSimpleState(), { category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', corePartsCovered: [true, false] });
    expect(g.coreParts).toEqual(parts);
    const closed = step(g, { category: 'GAP', action: 'CLOSE_GAP', coreParts: [], targetGapsFilled: [false] });
    expect(closed.coreParts).toEqual(parts);
    const retry = step(initialSimpleState(), { category: 'COPY', action: 'RETRY_PROMPT', corePartsCovered: [false, false] });
    expect(retry.coreParts).toEqual(parts);
    expect(step(retry, { category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', coreParts: [] }).coreParts).toEqual(parts);
  });
  it('끝난 문단에는 적용할 수 없다', () => {
    expect(() => step(step(initialSimpleState(), {}), {})).toThrow();
  });
  it('CLOSE_GAP은 못 채운 빈 곳의 근거 문장만 표시하고(중복 제거), 무관·복사는 모두 표시한다', () => {
    const g = step(initialSimpleState(), { category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION' });
    expect(step(g, { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [true, false] })).toMatchObject({ done: true, outcome: 'GAP_REVEALED', revealQuotes: [gap2.sourceQuote] });
    expect(step(g, { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false, false] }).revealQuotes).toEqual([gap.sourceQuote, gap2.sourceQuote]);
    expect(step(g, { category: 'IRRELEVANT', action: 'CLOSE_GAP', targetGapsFilled: [false, false] }).revealQuotes).toEqual([gap.sourceQuote, gap2.sourceQuote]);
    const dup = step(initialSimpleState(), { category: 'GAP', gaps: [gap, { ...gap2, sourceQuote: gap.sourceQuote }], action: 'GAP_QUESTION' });
    expect(step(dup, { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: [false, false] }).revealQuotes).toEqual([gap.sourceQuote]);
    expect(step(g, { category: 'GAP', action: 'CLOSE_GAP', targetGapsFilled: null }).revealQuotes).toEqual([gap.sourceQuote, gap2.sourceQuote]);
  });
});
