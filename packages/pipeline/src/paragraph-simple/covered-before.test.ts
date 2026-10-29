import { describe, expect, it } from 'vitest';
import { checkSimpleOutput, coveredBeforeFromSteps } from './rules.js';
import type { SimpleCorePart, SimpleEvaluationInput, SimpleOutput } from './schema.js';

const paragraph = '광합성은 빛에너지를 화학에너지로 바꾼다. 이 과정에서 산소가 나온다.';
const parts: SimpleCorePart[] = [{ description: '에너지 전환', sourceQuote: '빛에너지를 화학에너지로 바꾼다' }, { description: '산소 발생', sourceQuote: '산소가 나온다' }];
const gapOn = (corePartIndex: number) => ({ corePartIndex, description: '빈 곳', sourceQuote: parts[corePartIndex]!.sourceQuote, question: '이 부분을 다시 볼래?', asksOneThing: true });
const err = { studentQuote: '빛을 화학에너지로', correction: '빛에너지가 바뀐다', sourceQuote: '빛에너지를 화학에너지로 바꾼다', corePartIndex: 0, gapIndex: null, feedback: '빛이 아니라 빛에너지야' };
const input = (coveredBefore?: boolean[] | null): SimpleEvaluationInput => ({
  passage: { title: '광합성', paragraphs: [{ paragraphId: 'p1', text: paragraph }] },
  targetParagraph: { paragraphId: 'p1', text: paragraph }, stage: 'AFTER_CORRECTION',
  dialogue: [{ role: 'student', text: '광합성은 빛을 화학에너지로 바꾼다' }], coreParts: parts, targetError: err, targetGaps: null,
  ...(coveredBefore === undefined ? {} : { coveredBefore }),
});
const gapOut = (covered: boolean[], gapPart: number): SimpleOutput => ({
  category: 'GAP', reason: '이유', coreParts: [], corePartsCovered: covered, errors: [], gaps: [gapOn(gapPart)],
  targetErrorResolved: true, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'GAP_QUESTION',
  message: '확인하고 싶은 게 있어', corePartSummaries: [], closingFeedback: null, coreSourceQuote: null,
});
const closeErrors: SimpleOutput = { ...gapOut([false, true], 0), category: 'ONE_ERROR', errors: [err], gaps: [], targetErrorResolved: false, action: 'CLOSE_ERRORS', corePartSummaries: ['a', 'b'], closingFeedback: '마무리' };
const flipped = (problems: string[]) => problems.filter(p => p.startsWith('coveredBefore['));

describe('coveredBefore 검증', () => {
  it('앞에서 담은 부분이 false로 뒤집히면 거부하고 안 뒤집히면 통과한다', () => {
    const { problems } = checkSimpleOutput(input([true, false]), gapOut([true, false], 1));
    expect(flipped(problems)).toEqual([]);
    expect(flipped(checkSimpleOutput(input([true, true]), gapOut([true, false], 1)).problems)).toHaveLength(1);
  });
  it('그 부분을 가리키는 오류가 있으면 허용한다', () => {
    expect(flipped(checkSimpleOutput(input([true, true]), closeErrors).problems)).toEqual([]);
    expect(flipped(checkSimpleOutput(input([true, true]), { ...closeErrors, errors: [{ ...err, corePartIndex: 1 }] }).problems)).toHaveLength(1);
  });
  it('coveredBefore가 없거나 null이면 규칙이 꺼진다', () => {
    expect(flipped(checkSimpleOutput(input(), gapOut([true, false], 1)).problems)).toEqual([]);
    expect(flipped(checkSimpleOutput(input(null), gapOut([false, false], 0)).problems)).toEqual([]);
  });
});

describe('coveredBeforeFromSteps', () => {
  it('단계가 없으면 null', () => expect(coveredBeforeFromSteps([])).toBeNull());
  it('앞 단계 corePartsCovered의 OR', () => {
    expect(coveredBeforeFromSteps([{ corePartsCovered: [false, true] }, { corePartsCovered: [true, false] }])).toEqual([true, true]);
    expect(coveredBeforeFromSteps([{ corePartsCovered: [false, false] }])).toEqual([false, false]);
  });
});
