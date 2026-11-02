import { locateUniqueQuote } from './quote-locate.js';

export interface EndParagraph { text: string; mark: { location: 'PASSAGE' | 'SCENARIO'; quote: string } | null }
export interface EndHighlight { location: 'PASSAGE' | 'SCENARIO'; start: number; end: number; text: string }
/** 결론만 있는 짧은 마지막 문단은 앞 문단에 붙인다(2026-10-31 사용자 판정). */
export const SHORT_LAST_PARAGRAPH = 40;

/** 원문 구간을 그 구간이 든 문장 전체로 넓힌다. 문장 끝은 공백·줄바꿈·글 끝이 뒤따르는 . ? ! 이다(0.1 같은 소수점은 끝이 아님). */
export function expandToSentence(text: string, start: number, end: number): { start: number; end: number } {
  const isEnd = (i: number) => /[.?!]/u.test(text[i]!) && (i + 1 === text.length || /\s/u.test(text[i + 1]!));
  let s = start;
  while (s > 0 && text[s - 1] !== '\n' && !isEnd(s - 1)) s--;
  while (s < start && /\s/u.test(text[s]!)) s++;
  let e = end;
  while (e < text.length && text[e - 1] !== '\n' && !(e > start && isEnd(e - 1))) e++;
  while (e > start && /\s/u.test(text[e - 1]!)) e--;
  return { start: s, end: e };
}

/**
 * 한 칸의 문단을 화면용으로 정리한다. ① 마지막 문단이 짧으면 앞 문단에 합치고(칠할 곳은 앞 문단 것),
 * ② 칠할 곳을 원문에서 정확히 한 번 찾아 문장 경계까지 넓히고, ③ 같은 칸에서 이미 칠한 곳과 겹치면 지운다(2026-11-02 판정: 떨어진 문단 사이 중복도).
 */
export function arrangeEndParagraphs(paragraphs: EndParagraph[], source: { passage: string; scenario?: string | null }): { text: string; highlights: EndHighlight[] }[] {
  const merged = paragraphs.map(p => ({ ...p }));
  if (merged.length > 1 && merged.at(-1)!.text.trim().length < SHORT_LAST_PARAGRAPH) {
    const last = merged.pop()!;
    merged[merged.length - 1] = { ...merged.at(-1)!, text: `${merged.at(-1)!.text.trim()} ${last.text.trim()}` };
  }
  const shown: EndHighlight[] = [];
  return merged.map(p => {
    const text = p.mark ? (p.mark.location === 'PASSAGE' ? source.passage : source.scenario ?? '') : '';
    const at = p.mark ? locateUniqueQuote(text, p.mark.quote) : null;
    const span = at ? expandToSentence(text, at.start, at.end) : null;
    const highlight = span && p.mark ? { location: p.mark.location, ...span, text: text.slice(span.start, span.end) } : null;
    const repeated = !!highlight && shown.some(h => h.location === highlight.location && highlight.start < h.end && h.start < highlight.end);
    if (highlight && !repeated) shown.push(highlight);
    return { text: p.text, highlights: highlight && !repeated ? [highlight] : [] };
  });
}
