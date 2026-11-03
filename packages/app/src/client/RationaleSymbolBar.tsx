import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { insertSymbol, RATIONALE_SYMBOLS, shiftMarks, type SymbolMark } from './rationale-tools.js';
import './rationale-symbol-bar.css';

/** 입력창 아래 관계 기호 버튼 줄. 기호 뜻은 마우스를 올리거나 키보드로 고를 때 버튼 줄 오른쪽에 보인다(입력칸이 잘리는 칸이라 떠 있는 풍선 대신). */
// marks: 버튼으로 넣은 기호 자리. 글이 어디서 바뀌든(타이핑, 결론 버튼, 비우기) 여기서 따라 옮기고, 부모는 제출 때 toSubmittedText에 넘긴다.
export function RationaleSymbolBar({ value, onChange, input, marks, disabled, hidden, children }: {
  value: string; onChange: (text: string) => void; input: RefObject<HTMLTextAreaElement | null>; marks: MutableRefObject<SymbolMark[]>;
  disabled: boolean; hidden?: boolean; children?: ReactNode;
}) {
  const [hint, setHint] = useState('');
  const seen = useRef(value);
  if (seen.current !== value) { marks.current = shiftMarks(marks.current, seen.current, value); seen.current = value; }
  const bar = useRef<HTMLDivElement>(null);
  // 화살표 이동: 입력창 끝에서 ↓ → 첫 버튼, 버튼 줄(기호·결론·제출)에서 ←→ 순환, ↑ → 입력창, ↓ → 제출. 제출 버튼은 data-rationale-submit로 찾는다.
  useEffect(() => {
    let caret: number | null = null;
    const onKey = (e: KeyboardEvent) => {
      const box = input.current, row = bar.current, active = document.activeElement;
      // 한글 조합 중 키는 조합 확정에 맡긴다(포커스를 옮기면 마지막 글자가 두 번 들어간다).
      if (!box || !row || e.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const submit = document.querySelector<HTMLButtonElement>('[data-rationale-submit]');
      const buttons = [...row.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'), ...(submit && !submit.disabled ? [submit] : [])];
      if (active === box) {
        if (e.key !== 'ArrowDown') return;
        // 커서가 이미 글 끝이면(마지막 줄에서 한 번 더 ↓) 버튼 줄로 내려간다.
        if (box.selectionStart === box.value.length && box.selectionEnd === box.value.length && buttons[0]) { e.preventDefault(); caret = box.value.length; buttons[0].focus(); }
        return;
      }
      const index = buttons.indexOf(active as HTMLButtonElement);
      if (index < 0) return;
      const move = (to: HTMLElement) => { e.preventDefault(); to.focus(); };
      if (e.key === 'ArrowRight') move(buttons[(index + 1) % buttons.length]!);
      else if (e.key === 'ArrowLeft') move(buttons[(index - 1 + buttons.length) % buttons.length]!);
      else if (e.key === 'ArrowDown' && submit && !submit.disabled) move(submit);
      else if (e.key === 'ArrowUp' && !box.disabled) {
        move(box); const at = Math.min(caret ?? box.selectionStart, box.value.length); box.setSelectionRange(at, at);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [input]);
  return <div ref={bar} className="rationale-tools" aria-label="빠른 입력" style={hidden ? { visibility: 'hidden' } : undefined} onMouseLeave={() => setHint('')}>
    {RATIONALE_SYMBOLS.map(item => <button key={item.symbol} type="button" aria-label={item.meaning} disabled={disabled}
      onMouseEnter={() => setHint(`${item.symbol} ${item.meaning}`)} onFocus={() => setHint(`${item.symbol} ${item.meaning}`)} onBlur={() => setHint('')}
      onClick={() => {
        const box = input.current, text = box?.value ?? value, next = insertSymbol(text, box?.selectionStart ?? text.length, box?.selectionEnd ?? text.length, item);
        marks.current = [...shiftMarks(shiftMarks(marks.current, seen.current, text), text, next.text), next.mark]; seen.current = next.text;
        onChange(next.text); requestAnimationFrame(() => { box?.focus(); box?.setSelectionRange(next.cursor, next.cursor); });
      }}>{item.symbol}</button>)}
    {children && <span onMouseEnter={e => setHint(e.currentTarget.querySelector('button')?.dataset['hint'] ?? '')}>{children}</span>}
    <span className="rationale-hint" aria-live="polite">{hint}</span>
  </div>;
}
