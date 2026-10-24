import { describe, expect, it } from 'vitest';
import { choiceHintText, defaultStrategyPosition, seenStrategyPositions, currentStrategyPosition, initialStrategyState, strategyLeadText, nextStrategyParagraph, openStrategy, remainingStrategyPositions, strategyBubbles, strategyEndText, strategyStage } from './examiner-strategy-state.js';

const choices = [{ position: 2, paragraphs: ['a', 'b'] }, { position: 4, paragraphs: ['c'] }];
describe('examiner strategy state', () => {
  it('starts at the intro with nothing highlighted', () => {
    expect(strategyStage(initialStrategyState, choices)).toBe('INTRO');
    expect(currentStrategyPosition(initialStrategyState)).toBeNull();
    expect(strategyBubbles(initialStrategyState, choices)).toEqual([]);
  });
  it('shows the first paragraph at once and one more per next', () => {
    let s = openStrategy(initialStrategyState, 2, choices);
    expect(strategyStage(s, choices)).toBe('READING');
    expect(strategyBubbles(s, choices).map(b => [b.label, b.text])).toEqual([['출제자 전략 · ②', 'a']]);
    s = nextStrategyParagraph(s, choices);
    expect(strategyStage(s, choices)).toBe('ENDED');
    expect(strategyBubbles(s, choices).map(b => b.text)).toEqual(['a', 'b', '②번 전략은 여기까지야. 다른 선지의 함정도 볼 수 있어.']);
    expect(nextStrategyParagraph(s, choices)).toBe(s);
  });
  it('uses the short end text when nothing is left, and a one-paragraph choice ends at once', () => {
    expect(strategyEndText(4, [])).toBe('④번 전략은 여기까지야.');
    const s = openStrategy(nextStrategyParagraph(openStrategy(initialStrategyState, 2, choices), choices), 4, choices);
    expect(strategyStage(s, choices)).toBe('ENDED');
    expect(remainingStrategyPositions(s, choices)).toEqual([]);
    expect(strategyBubbles(s, choices).map(b => b.text).slice(-2)).toEqual(['c', '④번 전략은 여기까지야.']);
  });
  it('keeps earlier end bubbles and moves the highlight to the newest choice', () => {
    const s = openStrategy(nextStrategyParagraph(openStrategy(initialStrategyState, 2, choices), choices), 4, choices);
    expect(currentStrategyPosition(s)).toBe(4);
    expect(strategyBubbles(s, choices).filter(b => b.end).map(b => b.text)).toEqual(['②번 전략은 여기까지야. 다른 선지의 함정도 볼 수 있어.', '④번 전략은 여기까지야.']);
  });
  it('reopens a seen choice from its first paragraph and keeps the earlier bubbles', () => {
    const done = nextStrategyParagraph(openStrategy(initialStrategyState, 2, choices), choices);
    const again = openStrategy(done, 2, choices);
    expect(strategyStage(again, choices)).toBe('READING');
    expect(currentStrategyPosition(again)).toBe(2);
    const bubbles = strategyBubbles(again, choices);
    expect(bubbles.map(b => b.text)).toEqual(['a', 'b', '②번 전략은 여기까지야. 다른 선지의 함정도 볼 수 있어.', 'a']);
    expect(new Set(bubbles.map(b => b.key)).size).toBe(bubbles.length);
    expect(remainingStrategyPositions(again, choices)).toEqual([4]);
  });
  it('marks seen choices but not the one being read', () => {
    const reading = openStrategy(openStrategy(nextStrategyParagraph(openStrategy(initialStrategyState, 2, choices), choices), 4, choices), 2, choices);
    expect(seenStrategyPositions(reading, 'READING')).toEqual([4]);
    expect(seenStrategyPositions(nextStrategyParagraph(reading, choices), 'ENDED')).toEqual([2, 4]);
    expect(seenStrategyPositions(initialStrategyState, 'INTRO')).toEqual([]);
  });
  it('default choice: last selection if unseen, else lowest unseen, else the first', () => {
    const three = [{ position: 1, paragraphs: ['x'] }, { position: 3, paragraphs: ['y'] }, { position: 4, paragraphs: ['z'] }];
    expect(defaultStrategyPosition(initialStrategyState, three, 4)).toBe(4);
    expect(defaultStrategyPosition(initialStrategyState, three, 2)).toBe(1);
    expect(defaultStrategyPosition(initialStrategyState, three, null)).toBe(1);
    const seenOne = openStrategy(initialStrategyState, 4, three);
    expect(defaultStrategyPosition(seenOne, three, 4)).toBe(1);
    const all = openStrategy(openStrategy(seenOne, 1, three), 3, three);
    expect(defaultStrategyPosition(all, three, 4)).toBe(1);
    expect(defaultStrategyPosition(initialStrategyState, [], 2)).toBeNull();
  });
  it('lists only choices not yet opened and ignores positions without text', () => {
    expect(remainingStrategyPositions(openStrategy(initialStrategyState, 2, choices), choices)).toEqual([4]);
    expect(openStrategy(initialStrategyState, 5, choices)).toBe(initialStrategyState);
  });
});

describe('strategyLeadText', () => {
  it('names the answer choice for negative stems and the wrong choices for positive stems', () => {
    expect(strategyLeadText('SELECT_INCORRECT')).toBe('선지를 누르면 출제자가 어떤 전략으로 정답 선지에 함정을 만들었는지 검토할 수 있어.');
    expect(strategyLeadText('SELECT_CORRECT')).toBe('출제자가 어떤 전략으로 오답 선지들에 함정을 만들었는지 검토할 수 있어. 보고 싶은 선지를 문제에서 눌러 봐.');
  });
});

describe('choiceHintText', () => {
  it('gives one line per stage and nothing elsewhere', () => {
    expect(choiceHintText(true, null)).toBe('선지를 눌러 답을 골라');
    expect(choiceHintText(false, 'INTRO')).toBe('틀린 내용을 담은 선지를 누르면 그 선지의 전략을 볼 수 있어');
    expect(choiceHintText(false, 'READING')).toBe('다른 선지를 누르면 그 선지 전략으로 바뀌어');
    expect(choiceHintText(false, 'READING', 1)).toBe('');
    expect(choiceHintText(false, 'ENDED')).toBe('본 선지도 다시 누를 수 있어');
    expect(choiceHintText(false, null)).toBe('');
  });
});
