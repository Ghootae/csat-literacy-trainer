import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { choiceHintText, seenStrategyPositions, currentStrategyPosition, initialStrategyState, strategyLeadText, nextStrategyParagraph, openStrategy, remainingStrategyPositions, strategyBubbles, strategyEndText, strategyHighlights, strategyStage } from './examiner-strategy-state.js';

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

describe('strategy highlights', () => {
  const passage = '가나다  라마\n바사. 아자차 가나다 카타.';
  it('matches quotes after whitespace normalization and trailing punctuation, with original positions', () => {
    const [h] = strategyHighlights('봐: ‘라마 바사.’ 이다', passage);
    expect(h).toEqual({ location: 'PASSAGE', start: 5, end: 10, text: '라마\n바사' });
    expect(passage.slice(h!.start, h!.end)).toBe(h!.text);
    expect(strategyHighlights('‘아자차,’', passage).map(x => x.text)).toEqual(['아자차']);
    expect(strategyHighlights('‘라마   바사’', passage).map(x => x.text)).toEqual(['라마\n바사']);
  });
  it('skips quotes found twice or not at all', () => {
    expect(strategyHighlights('‘가나다’ ‘없는 말’ ‘.’', passage)).toEqual([]);
  });
  it('highlights only the unique quote among several', () => {
    expect(strategyHighlights('‘가나다’와 ‘카타’', passage).map(x => x.text)).toEqual(['카타']);
  });
  it('FINAL.json: 239 passage quotes, 198 of them highlighted (41 repeat in the passage)', () => {
    const root = resolve(__dirname, '../../../..');
    const final = JSON.parse(readFileSync(resolve(root, 'docs/experiments/examiner-strategy-2026-10-23/FINAL.json'), 'utf8')) as { items: { passageId: string; question: number; choice: number; text: string }[] };
    const dir = resolve(root, 'docs/experiments/examiner-strategy-2026-10-23/full-v4/requests');
    const files = readdirSync(dir);
    const norm = (v: string) => v.replace(/\s+/gu, ' ');
    let inPassage = 0; let painted = 0;
    for (const item of final.items) {
      const file = files.find(f => f.startsWith(`${item.passageId}-q${item.question}-c${item.choice}__`));
      expect(file, `${item.passageId}-q${item.question}-c${item.choice}`).toBeTruthy();
      const request = JSON.parse(readFileSync(resolve(dir, file!), 'utf8')) as { input: { content: { text: string }[] }[] };
      const passageText = (JSON.parse(request.input[0]!.content[0]!.text) as { passage: string }).passage;
      for (const m of item.text.matchAll(/‘([^’]+)’/gu)) {
        const q = norm(m[1]!).trim().replace(/[.,]+$/u, '').trim();
        if (q && norm(passageText).includes(q)) inPassage++;
      }
      for (const para of item.text.split(/\n{2,}/u)) painted += strategyHighlights(para, passageText).length;
    }
    expect(inPassage).toBe(239);
    expect(painted).toBe(198);
  });
});
