import React, { type ReactNode } from 'react';
import type { FeedbackTextAnnotationView, FeedbackView } from '../shared/problem-feedback.js';

/** Split at every boundary so overlapping source decorations and highlights remain visible. */
export function AnnotatedText({ text, annotations, highlights = [] }: {
  text: string; annotations: readonly FeedbackTextAnnotationView[];
  highlights?: readonly FeedbackView['correctionHighlights'][number][];
}): React.JSX.Element {
  const valid = (a: { start: number; end: number; text: string }) =>
    a.start >= 0 && a.end <= text.length && a.start < a.end && text.slice(a.start, a.end) === a.text;
  const spans = annotations.filter(a => a.style !== 'label' && valid(a));
  const marks = highlights.filter(valid);
  const boundaries = [...new Set([0, text.length, ...spans.flatMap(a => [a.start, a.end]), ...marks.flatMap(a => [a.start, a.end])])].sort((a, b) => a - b);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]!; const end = boundaries[i + 1]!;
    for (const a of spans.filter(a => a.start === start)) {
      if (!text.slice(0, start).trimEnd().endsWith(a.marker) && !a.text.startsWith(a.marker))
        nodes.push(<span className="lab-marker" key={`m${start}-${a.marker}`}>{a.marker}</span>);
    }
    let node: ReactNode = text.slice(start, end);
    for (const a of spans.filter(a => a.start <= start && a.end >= end)) {
      node = a.style === 'box' ? <span className="lab-box">{node}</span> : <u>{node}</u>;
    }
    if (marks.some(a => a.start <= start && a.end >= end)) node = <span className="lab-highlight">{node}</span>;
    nodes.push(<React.Fragment key={start}>{node}</React.Fragment>);
  }
  return <p className="lab-annotated">{nodes}</p>;
}
