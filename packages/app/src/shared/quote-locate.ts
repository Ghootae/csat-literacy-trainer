/** quote가 text에 공백 정규화 후 정확히 한 번 나올 때만 원문 인덱스(end 제외)를 돌려준다. 공백 연속은 한 칸으로 본다. */
export function locateUniqueQuote(text: string, quote: string): { start: number; end: number } | null {
  const needle = quote.replace(/\s+/gu, ' ').trim();
  if (!needle) return null;
  let flat = ''; const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/\s/u.test(text[i]!)) { if (flat.endsWith(' ')) continue; flat += ' '; } else flat += text[i];
    origin.push(i);
  }
  const at = flat.indexOf(needle);
  if (at < 0 || flat.indexOf(needle, at + 1) >= 0) return null;
  return { start: origin[at]!, end: origin[at + needle.length - 1]! + 1 };
}
