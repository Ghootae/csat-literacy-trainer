// 근거 입력창 아래 빠른 입력 버튼: 관계 기호는 커서 위치에, 결론 문장은 글 끝에 넣는다. 사용 여부는 기록하지 않는다.
// 버튼으로 넣은 기호만 제출 때 word로 바뀐다(판정기가 기호를 다르게 읽지 않게). 학생이 직접 친 기호는 그대로 둔다.
export interface RationaleSymbol { symbol: string; meaning: string; tight?: boolean; word?: string }
// tight: 증감 표시는 앞 낱말에 붙여 쓴다(예: "도파민↑").
export const RATIONALE_SYMBOLS: RationaleSymbol[] = [
  { symbol: '→', meaning: '그래서', word: '그러므로' }, { symbol: '↔', meaning: '하지만·반대', word: '그러나' }, { symbol: '&', meaning: '그리고', word: '그리고' },
  { symbol: '=', meaning: '같음' }, { symbol: '≠', meaning: '다름' }, { symbol: '↑', meaning: '증가', tight: true, word: '증가' },
  { symbol: '↓', meaning: '감소', tight: true, word: '감소' }, { symbol: 'ex)', meaning: '예시', word: '예를 들어' },
];

/** 커서(또는 선택 구간) 자리에 기호를 넣고, 앞뒤 공백은 겹치지 않게 맞춘다. 새 커서 위치를 함께 돌려준다. */
export function insertSymbol(text: string, start: number, end: number, item: RationaleSymbol) {
  const before = text.slice(0, start), after = text.slice(end);
  const lead = item.tight || !before || /\s$/u.test(before) ? '' : ' ';
  const tail = /^\s/u.test(after) ? '' : ' ';
  const head = before + lead + item.symbol + tail;
  return { text: head + after, cursor: head.length, mark: { start: before.length + lead.length, symbol: item.symbol } };
}

/** 버튼으로 넣은 기호의 자리. */
export interface SymbolMark { start: number; symbol: string }

/** 글이 바뀌면 바뀐 구간 밖의 표시는 자리를 옮기고, 바뀐 구간에 걸친 표시와 기호가 더는 그 자리에 없는 표시는 버린다. */
export function shiftMarks(marks: SymbolMark[], before: string, after: string): SymbolMark[] {
  if (before === after) return marks;
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const changedEnd = before.length - suffix, delta = after.length - before.length;
  return marks.flatMap(m => m.start + m.symbol.length <= prefix ? [m] : m.start >= changedEnd ? [{ ...m, start: m.start + delta }] : [])
    .filter(m => after.startsWith(m.symbol, m.start));
}

/** 제출할 글: 버튼으로 넣은 기호를 낱말로 바꾼다. → 바로 뒤에 "따라서"가 오면 겹치지 않게 →를 뺀다. */
export function toSubmittedText(text: string, marks: SymbolMark[]) {
  let out = text;
  for (const m of [...marks].sort((a, b) => b.start - a.start)) {
    const item = RATIONALE_SYMBOLS.find(s => s.symbol === m.symbol);
    if (!item?.word || !out.startsWith(m.symbol, m.start)) continue;
    const before = out.slice(0, m.start), rest = out.slice(m.start + m.symbol.length);
    if (m.symbol === '→' && /^\s*따라서/u.test(rest)) { out = before.trimEnd() + ' ' + rest.trimStart(); continue; }
    out = before + (item.tight && before && !/\s$/u.test(before) ? ' ' : '') + item.word + rest;
  }
  return out;
}

/** 발문의 판정 방향과 고른 번호로 결론 문장을 만든다("적절하지 않은 것은?"이면 고른 선지는 옳지 않음). */
export function conclusionText(stem: string, position: number) {
  const negative = /(않은|않는|틀린)\s*것/u.test(stem);
  return `따라서 ${'①②③④⑤'[position - 1]}번은 ${negative ? '옳지 않음' : '옳음'}`;
}

/** 결론 문장은 항상 글 끝에 붙인다. 앞 글이 문장부호나 관계 기호로 끝나지 않으면 마침표를 넣는다. */
export function appendConclusion(text: string, conclusion: string) {
  const body = text.trimEnd();
  if (!body) return conclusion;
  const open = /[.!?。]$/u.test(body) || RATIONALE_SYMBOLS.some(s => body.endsWith(s.symbol));
  return `${body}${open ? '' : '.'} ${conclusion}`;
}
