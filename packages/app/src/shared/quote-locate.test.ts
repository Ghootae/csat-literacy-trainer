import { describe, expect, it } from 'vitest';
import { locateUniqueQuote } from './quote-locate.js';

describe('locateUniqueQuote', () => {
  const text = '가나다  라마\n바사. 아자차 가나다 카타.';
  it('finds a quote that appears exactly once, with original indexes after whitespace normalization', () => {
    expect(locateUniqueQuote(text, '라마 바사')).toEqual({ start: 5, end: 10 });
    expect(locateUniqueQuote(text, '  라마   바사 ')).toEqual({ start: 5, end: 10 });
    expect(text.slice(5, 10)).toBe('라마\n바사');
  });
  it('returns null when the quote appears twice, never, or is empty', () => {
    expect(locateUniqueQuote(text, '가나다')).toBeNull();
    expect(locateUniqueQuote(text, '없는 말')).toBeNull();
    expect(locateUniqueQuote(text, '  ')).toBeNull();
  });
  it('works on scenario text the same way', () => {
    expect(locateUniqueQuote('<보기> 갑은  을에게 판다.', '갑은 을에게')).toEqual({ start: 5, end: 12 });
  });
});
