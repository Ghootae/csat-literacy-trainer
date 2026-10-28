import { describe, expect, it } from 'vitest';
import { bubbleLines, pickLine } from '../shared/bubble-lines.js';
import { simpleWaitingText } from './simple-waiting.js';

const sets = bubbleLines;
describe('simpleWaitingText', () => {
  const times = [0, 5999, 6000, 15000, 25000];
  it.each([
    ['INITIAL', [sets.summaryEarly, sets.summaryEarly, sets.summaryMid, sets.summaryLate, sets.long]],
    ['RETRY', [sets.summaryEarly, sets.summaryEarly, sets.summaryMid, sets.summaryLate, sets.long]],
    ['AFTER_CORRECTION', [sets.correctionEarly, sets.correctionEarly, sets.correctionLate, sets.correctionLate, sets.long]],
    ['AFTER_GAP', [sets.correctionEarly, sets.correctionEarly, sets.gapLate, sets.gapLate, sets.long]],
  ] as const)('%s picks from the stage set by the submission key', (stage, expected) => {
    for (const key of ['T1', 'T2', 'T3']) expect(times.map(t => simpleWaitingText(stage, t, key))).toEqual(expected.map(set => pickLine(set, key)));
  });
});
