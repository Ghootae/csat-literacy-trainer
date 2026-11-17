/** 결과 화면 여러 칸이 함께 쓰는 작은 조각. */
import { FAILED_TEXT, PENDING_TEXT, type TextSegment } from './logic.js';
import type { ResultView as Result } from './types.js';

export type Box = 'pending' | 'ready' | 'failed';
export function Notice({ status }: { status: Exclude<Box, 'ready'> }) { return <p className="diag-muted" role="status">{status === 'pending' ? PENDING_TEXT : FAILED_TEXT}</p>; }
/** 굵게 표시할 구절이 섞인 글. */
export function Segs({ segments }: { segments: readonly TextSegment[] }) {
  return <>{segments.map((segment, i) => segment.bold ? <strong key={i}>{segment.text}</strong> : <span key={i}>{segment.text}</span>)}</>;
}
export const passageTitles = (set: { passages: { passageId: string; title: string }[] }): Record<string, string> => Object.fromEntries(set.passages.map(p => [p.passageId, p.title]));
export const glossOf = (result: Result, passageId: string): Readonly<Record<string, string>> => result.symbolGloss[passageId] ?? {};
