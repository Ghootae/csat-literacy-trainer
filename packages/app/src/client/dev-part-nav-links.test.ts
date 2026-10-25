import { describe, expect, it } from 'vitest';
import { paragraphLink, parseInitialParagraph, problemLink, resolveReturnTo } from './dev-part-nav-links.js';

describe('dev part nav links', () => {
  it('parses paragraph only as a non-negative integer', () => {
    expect(parseInitialParagraph('?sessionId=a&paragraph=2')).toEqual({ sessionId: 'a', passageId: null, paragraph: 2 });
    expect(parseInitialParagraph('?passageId=p&paragraph=0').paragraph).toBe(0);
    expect(parseInitialParagraph('?passageId=p&paragraph=-1').paragraph).toBeNull();
    expect(parseInitialParagraph('?passageId=p&paragraph=x').paragraph).toBeNull();
    expect(parseInitialParagraph('?sessionId=a').paragraph).toBeNull();
  });
  it('builds the problem link with a session returnTo', () => {
    const url = new URL(problemLink('q-1', 's-1'), 'http://x');
    expect(url.pathname).toBe('/problem/lab');
    expect(url.searchParams.get('questionId')).toBe('q-1');
    expect(url.searchParams.get('returnTo')).toBe('/dialogue/dev/simple?sessionId=s-1');
  });
  it('accepts the simple session returnTo and keeps the old forms', () => {
    expect(resolveReturnTo('/dialogue/dev/simple?sessionId=ab-12')).toBe('/dialogue/dev/simple?sessionId=ab-12');
    expect(resolveReturnTo('/dialogue/dev?sessionId=ab-12')).toBe('/dialogue/dev?sessionId=ab-12');
    expect(resolveReturnTo('/dialogue/dev')).toBe('/dialogue/dev');
    expect(resolveReturnTo('https://evil.example')).toBe('/dialogue/dev');
    expect(resolveReturnTo('/dialogue/dev/simple?sessionId=a&x=1')).toBe('/dialogue/dev');
  });
  it('builds paragraph links from a session or a passage', () => {
    expect(paragraphLink('/dialogue/dev/simple?sessionId=s-1', 'p', 3)).toBe('/dialogue/dev/simple?sessionId=s-1&paragraph=3');
    expect(paragraphLink('/dialogue/dev', 'p', 3)).toBe('/dialogue/dev/simple?passageId=p&paragraph=3');
  });
});
