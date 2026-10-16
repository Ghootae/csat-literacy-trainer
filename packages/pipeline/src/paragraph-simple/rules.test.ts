import { describe, expect, it } from 'vitest';
import { applySimpleAction, checkSimpleOutput, expectedAction, initialSimpleState, type SimpleParagraphState } from './rules.js';
import type { SimpleAction, SimpleCategory, SimpleEvaluationInput, SimpleOutput, SimpleStage } from './schema.js';

const paragraph = '광합성은 빛에너지를 화학에너지로 바꾼다. 이 과정에서 산소가 나온다.';
const input = (stage: SimpleStage, student = '광합성은 빛을 화학에너지로 바꾼다'): SimpleEvaluationInput => ({
  passage: { title: '광합성', paragraphs: [{ paragraphId: 'p1', text: paragraph }] },
  targetParagraph: { paragraphId: 'p1', text: paragraph }, stage,
  dialogue: [{ role: 'student', text: student }], targetError: null,
});
const err = { studentQuote: '빛을 화학에너지로', correction: '빛에너지가 화학에너지로 바뀐다', sourceQuote: '빛에너지를 화학에너지로 바꾼다' };
const base: SimpleOutput = { category: 'CAPTURED', reason: '이유', errors: [], gap: null, targetErrorResolved: null, action: 'PRAISE', message: '잘했어', coreSummary: null };
const gap = { description: '산소', sourceQuote: '산소가 나온다' };

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
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' };
    expect(checkSimpleOutput(input('INITIAL'), one).problems).toEqual([]);
  });
  it('행동 표와 다른 action을 잡는다', () => {
    expect(checkSimpleOutput(input('INITIAL'), { ...base, action: 'CLOSE_GAP' }).problems.join()).toMatch(/행동 표/);
  });
  it('학생 인용·원문 인용·개수·null 규칙 위반을 잡는다', () => {
    const one: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' };
    expect(checkSimpleOutput(input('INITIAL', '전혀 다른 말'), one).problems.join()).toMatch(/studentQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...one, errors: [{ ...err, sourceQuote: '빛에너지를  화학에너지로' }] }).problems.join()).toMatch(/sourceQuote/);
    expect(checkSimpleOutput(input('INITIAL'), { ...one, errors: [] }).problems.join()).toMatch(/정확히 1개/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, gap }).problems.join()).toMatch(/gap은 null/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, category: 'GAP', action: 'GAP_QUESTION' }).problems.join()).toMatch(/gap이 null이 아니어야/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, targetErrorResolved: true }).problems.join()).toMatch(/targetErrorResolved/);
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), base).problems.join()).toMatch(/targetErrorResolved/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, message: ' ' }).problems.join()).toMatch(/message/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, coreSummary: '요약' }).problems.join()).toMatch(/coreSummary/);
    expect(checkSimpleOutput(input('INITIAL'), { ...base, category: 'MULTI_ERROR', errors: [err], action: 'CLOSE_ERRORS', coreSummary: '요약' }).problems.join()).toMatch(/2개 이상/);
  });
  it('마무리 행동은 coreSummary가 필요하고, 교정·구멍 뒤 CLOSE_ERRORS는 오류 1개 이상이면 된다', () => {
    const close: SimpleOutput = { ...base, category: 'ONE_ERROR', errors: [err], action: 'CLOSE_ERRORS', targetErrorResolved: false, coreSummary: null };
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), close).problems.join()).toMatch(/coreSummary/);
    expect(checkSimpleOutput(input('AFTER_CORRECTION'), { ...close, coreSummary: '핵심' }).problems).toEqual([]);
    const afterGap = { ...close, targetErrorResolved: null, coreSummary: '핵심', errors: [err, err] };
    expect(checkSimpleOutput(input('AFTER_GAP'), afterGap).problems).toEqual([]);
    expect(checkSimpleOutput(input('AFTER_GAP'), { ...afterGap, errors: [] }).problems.join()).toMatch(/1개 이상/);
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
    expect(step(retry, { category: 'COPY', action: 'CLOSE_NO_RESPONSE', coreSummary: '핵심' })).toMatchObject({ done: true, outcome: 'NO_RESPONSE', revealQuotes: [] });
  });
  it('질문은 표시 구절을 만들지 않고, 마무리에서만 만든다', () => {
    const g = step(initialSimpleState(), { category: 'GAP', gap, action: 'GAP_QUESTION' });
    expect(g).toMatchObject({ stage: 'AFTER_GAP', questionsAsked: 1, revealQuotes: [], done: false });
    const c = step(initialSimpleState(), { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' });
    expect(c).toMatchObject({ stage: 'AFTER_CORRECTION', questionsAsked: 1, targetError: err, revealQuotes: [], done: false });
    expect(step(g, { category: 'GAP', gap, action: 'CLOSE_GAP' })).toMatchObject({ done: true, outcome: 'GAP_REVEALED', revealQuotes: ['산소가 나온다'] });
    expect(step(c, { category: 'ONE_ERROR', errors: [err, { ...err, sourceQuote: '산소가 나온다' }], action: 'CLOSE_ERRORS', coreSummary: '핵심' }))
      .toMatchObject({ done: true, outcome: 'ERRORS_REVEALED', revealQuotes: [err.sourceQuote, '산소가 나온다'] });
  });
  it('교정 -> 구멍으로 질문 2회가 정상 최대이고, 세 번째 질문은 불변식 위반이다', () => {
    const c = step(initialSimpleState(), { category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' });
    const g = step(c, { category: 'GAP', gap, action: 'GAP_QUESTION', targetErrorResolved: true });
    expect(g.questionsAsked).toBe(2);
    expect(() => step(g, { category: 'GAP', gap, action: 'GAP_QUESTION' })).toThrow(/불변식/);
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
        walk(applySimpleAction(s, out({ category, targetErrorResolved: resolved, action, errors: [err], gap })), depth + 1);
      }
    };
    walk(initialSimpleState(), 0);
  });
  it('끝난 문단에는 적용할 수 없다', () => {
    expect(() => step(step(initialSimpleState(), {}), {})).toThrow();
  });
  it('구멍 질문 뒤 무관한 답으로 끝나면 물었던 빈 곳을 표시한다', () => {
    const g = step(initialSimpleState(), { category: 'GAP', gap, action: 'GAP_QUESTION' });
    expect(step(g, { category: 'IRRELEVANT', action: 'CLOSE_GAP' })).toMatchObject({ done: true, outcome: 'GAP_REVEALED', revealQuotes: [gap.sourceQuote] });
  });
});
