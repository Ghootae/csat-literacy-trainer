import { describe, expect, it } from 'vitest';
import { appendConclusion, conclusionText, insertSymbol, RATIONALE_SYMBOLS, shiftMarks, toSubmittedText } from './rationale-tools.js';
const sym = (symbol: string) => RATIONALE_SYMBOLS.find(s => s.symbol === symbol)!;
describe('rationale tools', () => {
  it('기호는 커서 자리에 공백을 맞춰 넣는다', () => {
    expect(insertSymbol('광고함제재 대상', 3, 3, sym('→'))).toMatchObject({ text: '광고함 → 제재 대상', cursor: 6 });
    expect(insertSymbol('광고함 ', 4, 4, sym('→'))).toMatchObject({ text: '광고함 → ', cursor: 6 });
    expect(insertSymbol('', 0, 0, sym('ex)'))).toMatchObject({ text: 'ex) ', cursor: 4 });
    expect(insertSymbol('A B', 1, 2, sym('≠'))).toMatchObject({ text: 'A ≠ B', cursor: 4 });
  });
  it('증감 기호는 앞 낱말에 붙인다', () => {
    expect(insertSymbol('도파민', 3, 3, sym('↑')).text).toBe('도파민↑ ');
  });
  it('결론 문장은 발문 방향을 따른다', () => {
    expect(conclusionText('윗글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?', 2)).toBe('따라서 ②번은 옳지 않음');
    expect(conclusionText('윗글의 내용과 일치하지 않는 것은?', 5)).toBe('따라서 ⑤번은 옳지 않음');
    expect(conclusionText('윗글에 대한 이해로 가장 적절한 것은?', 1)).toBe('따라서 ①번은 옳음');
  });
  it('결론은 항상 끝에 붙고, 필요하면 마침표를 넣는다', () => {
    expect(appendConclusion('갑은 광고함 → 제재 대상  ', '따라서 ②번은 옳지 않음')).toBe('갑은 광고함 → 제재 대상. 따라서 ②번은 옳지 않음');
    expect(appendConclusion('제재 대상이다.', '따라서 ②번은 옳지 않음')).toBe('제재 대상이다. 따라서 ②번은 옳지 않음');
    expect(appendConclusion('', '따라서 ②번은 옳지 않음')).toBe('따라서 ②번은 옳지 않음');
    expect(appendConclusion('통과할 수 없음 → ', '따라서 ①번은 옳지 않음')).toBe('통과할 수 없음 → 따라서 ①번은 옳지 않음');
  });
  it('버튼으로 넣은 기호만 제출 때 낱말로 바뀐다', () => {
    const typed = '레보도파->도파민 억제';
    const a = insertSymbol(typed, typed.length, typed.length, sym('→'));
    const b = insertSymbol(a.text + '유입 증가', a.text.length + 5, a.text.length + 5, sym('↔'));
    const marks = [...shiftMarks([a.mark], a.text, b.text), b.mark];
    expect(toSubmittedText(b.text + '추론 안 됨', marks)).toBe('레보도파->도파민 억제 그러므로 유입 증가 그러나 추론 안 됨');
    expect(toSubmittedText('A & B = C', [])).toBe('A & B = C');
  });
  it('앞뒤 글을 고쳐도 표시가 따라가고, 기호를 지우면 표시도 사라진다', () => {
    const a = insertSymbol('도파민', 3, 3, sym('↑'));
    // 타이핑은 한 번에 한 곳씩 바뀐다: 앞에 덧붙이고, 다음에 뒤에 덧붙인다.
    const front = '뇌의 ' + a.text, edited = front + '운동';
    const marks = shiftMarks(shiftMarks([a.mark], a.text, front), front, edited);
    expect(toSubmittedText(edited, marks)).toBe('뇌의 도파민 증가 운동');
    expect(shiftMarks(marks, edited, '뇌의 도파민 운동')).toEqual([]);
  });
  it('→ 바로 뒤의 결론에는 그러므로를 겹쳐 넣지 않는다', () => {
    const a = insertSymbol('통과할 수 없음', 8, 8, sym('→'));
    const text = appendConclusion(a.text, '따라서 ①번은 옳지 않음');
    expect(toSubmittedText(text, shiftMarks([a.mark], a.text, text))).toBe('통과할 수 없음 따라서 ①번은 옳지 않음');
  });
});
