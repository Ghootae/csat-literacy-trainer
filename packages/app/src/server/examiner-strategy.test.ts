import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeedbackV4WorkbenchView } from '../shared/problem-feedback-v4.js';
import { loadExaminerStrategies, splitParagraphs, stemPolarity, strategyFor } from './examiner-strategy.js';

const real = join(process.cwd(), 'docs/experiments/examiner-strategy-2026-10-23/FINAL.json');
const view = (questionId: string, phase: FeedbackV4WorkbenchView['phase'], selectedPosition: number): FeedbackV4WorkbenchView => ({
  phase, selectedChoiceId: `C${selectedPosition}`, result: { selectedChoiceId: `C${selectedPosition}` },
  question: { questionId, choices: [1, 2, 3, 4, 5].map(position => ({ choiceId: `C${position}`, position, text: '' })) },
} as unknown as FeedbackV4WorkbenchView);
afterEach(() => vi.restoreAllMocks());

describe('examiner strategy loading', () => {
  const map = loadExaminerStrategies(real);
  it('loads all 57 texts and tells targeted choices apart', () => {
    expect([...map.values()].reduce((n, c) => n + c.length, 0)).toBe(57);
    expect(map.get('corporate-law-q13')?.map(c => c.position)).toEqual([2]);
    expect(map.get('corporate-law-q11')?.map(c => c.position)).toEqual([1, 2, 3, 5]);
    expect(map.get('corporate-law-q11')?.some(c => c.position === 4)).toBe(false);
  });
  it('splits paragraphs on blank lines', () => {
    expect(splitParagraphs('가\n\n나\n\n\n다\n')).toEqual(['가', '나', '다']);
    expect(map.get('information-asymmetry-free-marketplace-q13')![0]!.paragraphs.length).toBe(4);
  });
  it('turns the feature off with one warning when the file is missing or malformed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadExaminerStrategies(join(tmpdir(), 'no-such-examiner-strategy.json')).size).toBe(0);
    const dir = mkdtempSync(join(tmpdir(), 'strategy-'));
    writeFileSync(join(dir, 'bad.json'), '{"items":[{"passageId":1}]}');
    const off = loadExaminerStrategies(join(dir, 'bad.json'));
    expect(off.size).toBe(0); expect(warn).toHaveBeenCalledTimes(2);
    expect(strategyFor(view('corporate-law-q13', 'COMPLETED', 2), off)).toEqual({ available: false });
  });
});

describe('strategyFor', () => {
  const map = loadExaminerStrategies(real);
  it('never returns text before COMPLETED', () => {
    expect(strategyFor(view('corporate-law-q13', 'AWAITING_CORRECTION', 2), map)).toEqual({ available: false });
  });
  it('is unavailable for a question without texts', () => {
    expect(strategyFor(view('unknown-q1', 'COMPLETED', 1), map)).toEqual({ available: false });
  });
  it('opens the student last choice when it is in the list', () => {
    expect(strategyFor(view('corporate-law-q11', 'COMPLETED', 3), map)).toMatchObject({ available: true, firstPosition: 3 });
  });
  it('opens the only list entry when the answer chosen on a negative stem is that entry', () => {
    expect(strategyFor(view('corporate-law-q13', 'COMPLETED', 2), map)).toMatchObject({ firstPosition: 2 });
    expect(strategyFor(view('corporate-law-q13', 'COMPLETED', 4), map)).toMatchObject({ firstPosition: 2 });
  });
  it('opens the lowest listed choice when the answer chosen on a positive stem is not listed', () => {
    expect(strategyFor(view('corporate-law-q11', 'COMPLETED', 4), map)).toMatchObject({ firstPosition: 1 });
  });
});

describe('stemPolarity', () => {
  it('tells negative and positive stems apart', () => {
    expect(stemPolarity('윗글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?')).toBe('SELECT_INCORRECT');
    expect(stemPolarity('윗글의 내용과 일치하지 않는 것은?')).toBe('SELECT_INCORRECT');
    expect(stemPolarity('윗글을 바탕으로 <보기>를 이해한 내용으로 가장 적절한 것은?')).toBe('SELECT_CORRECT');
  });
});
