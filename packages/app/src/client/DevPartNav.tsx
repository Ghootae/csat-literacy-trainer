import './dev-part-nav.css';

export function DevPartNav(props: {
  paragraphs: { label: string; done?: boolean; onSelect: () => void }[];
  currentParagraph: number | null;
  problem: { onSelect: () => void } | null;
  currentIsProblem: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  return <nav className="dev-part-nav" aria-label="파트 이동">
    {props.paragraphs.map((p, i) =>
      <button key={i} type="button" disabled={props.disabled} aria-current={i === props.currentParagraph ? 'true' : undefined} onClick={p.onSelect}>{p.label}{p.done ? ' ✓' : ''}</button>)}
    <span className="dev-part-nav-divider" aria-hidden="true" />
    <button type="button" disabled={props.disabled || props.problem === null} aria-current={props.currentIsProblem ? 'true' : undefined}
      onClick={props.problem?.onSelect}>문제</button>
  </nav>;
}
