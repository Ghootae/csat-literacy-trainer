import React, { Fragment, type ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  // Only double asterisks are syntax. Single asterisks stay literal: source footnote marks (e.g. "정관*") are quoted verbatim.
  const pattern = /(?<!\*)\*\*([^*\n]+)\*\*(?!\*)/gu;
  const nodes: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    nodes.push(text.slice(start, match.index));
    nodes.push(<strong key={match.index}>{match[1]}</strong>);
    start = match.index + match[0].length;
  }
  nodes.push(text.slice(start));
  return nodes;
}

export function Markdown({ text }: { text: string }): React.JSX.Element {
  const lines = text.replace(/\r\n/gu, '\n').split('\n');
  const blocks: ReactNode[] = [];
  const list = (line: string) => /^(?:- |\d+\. )(.+)$/u.exec(line);
  for (let i = 0; i < lines.length;) {
    if (!lines[i]!.trim()) { i++; continue; }
    const start = i;
    if (list(lines[i]!)) {
      const ordered = /^\d+\. /u.test(lines[i]!);
      const firstNumber = ordered ? Number.parseInt(lines[i]!, 10) : 1;
      const items: ReactNode[] = [];
      while (i < lines.length && list(lines[i]!) && /^\d+\. /u.test(lines[i]!) === ordered) {
        items.push(<li key={i}>{inline(list(lines[i]!)![1]!)}</li>); i++;
      }
      blocks.push(ordered ? <ol key={start} start={firstNumber}>{items}</ol> : <ul key={start}>{items}</ul>);
    } else {
      const paragraph: ReactNode[] = [];
      while (i < lines.length && lines[i]!.trim() && !list(lines[i]!)) {
        paragraph.push(<Fragment key={i}>{i > start && <br />}{inline(lines[i]!)}</Fragment>); i++;
      }
      blocks.push(<p key={start}>{paragraph}</p>);
    }
  }
  return <div>{blocks}</div>;
}
