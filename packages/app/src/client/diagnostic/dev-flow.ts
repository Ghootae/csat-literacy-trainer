/** 개발자 지도의 칸·상태·이전/다음 순서(D-0217). 서버 `dev/map` 자료만으로 정하는 순수 함수라 화면 밖에서 시험한다. */
import type { DevMapPassage, DevMapView } from './dev-api.js';
import type { PassageStatus } from './types.js';

export type CellStatus = 'NOT_YET' | 'CURRENT' | 'DONE' | 'JUDGING' | 'FAILED' | 'SKIPPED';
export const CELL_STATUS_LABEL: Record<CellStatus, string> = { NOT_YET: '미진행', CURRENT: '진행 중', DONE: '완료', JUDGING: '판정 중', FAILED: '판정 실패', SKIPPED: '건너뜀' };
export type CellKind = 'choose' | 'summary' | 'answer' | 'mid' | 'question' | 'result';
export interface Cell {
  key: string; kind: CellKind; passageId: string | null; label: string; status: CellStatus;
  /** summary 칸: 문단 번호(0부터). 요약 칸 하나면 없다. */
  paragraphIndex?: number; questionId?: string;
}

const RANK: Record<PassageStatus, number> = { NOT_STARTED: 0, SUMMARY: 1, ANSWERING: 2, AWAITING_JUDGMENT: 3, FEEDBACK: 4, DONE: 5 };
export const statusRank = (status: PassageStatus): number => RANK[status];
export const resultKey = 'result';

/** 지문 하나의 칸. 요약 선택은 시작 전에만, 요약 칸은 시작한 뒤에만 있다. */
export function passageCells(passage: DevMapPassage): Cell[] {
  const { passageId, status } = passage; const rank = RANK[status];
  const cells: Cell[] = [];
  const cell = (kind: CellKind, suffix: string, label: string, state: CellStatus, extra: Partial<Cell> = {}) =>
    cells.push({ key: `${passageId}:${suffix}`, kind, passageId, label, status: state, ...extra });
  const anyAnswered = passage.questions.some(q => q.answered);
  if (rank === RANK.NOT_STARTED) cell('choose', 'choose', '요약 선택', 'CURRENT');
  else if (passage.summaryChosen === true && !passage.summarySkipped) {
    passage.paragraphs.forEach((paragraph, index) => cell('summary', `summary:${index}`, `문단 ${paragraph.position}`,
      paragraph.answered ? 'DONE' : status === 'SUMMARY' ? 'CURRENT' : 'SKIPPED', { paragraphIndex: index }));
  } else cell('summary', 'summary', '요약', 'SKIPPED');
  cell('answer', 'answer', '답 입력', rank < RANK.ANSWERING ? 'NOT_YET' : status === 'ANSWERING' ? 'CURRENT' : anyAnswered ? 'DONE' : 'SKIPPED');
  cell('mid', 'mid', '지문 결과', rank < RANK.AWAITING_JUDGMENT ? 'NOT_YET' : status === 'AWAITING_JUDGMENT' ? 'JUDGING' : anyAnswered ? 'DONE' : 'SKIPPED');
  // 문항 칸은 리뷰 대상(오답, 근거가 틀린 정답)만 둔다(D-0218). 순서를 강제하지 않으므로 검토 전 칸은 미진행이다.
  passage.questions.filter(q => q.reviewTarget).forEach(q => {
    const state: CellStatus = q.skipped ? 'SKIPPED' : q.firstJudgment === 'FAILED' ? 'FAILED' : q.firstJudgment === 'PENDING' && rank >= RANK.AWAITING_JUDGMENT ? 'JUDGING'
      : q.reviewDone || q.feedbackPhase === 'COMPLETED' ? 'DONE' : 'NOT_YET';
    cell('question', `q:${q.questionId}`, `${q.questionNumber}번`, state, { questionId: q.questionId });
  });
  return cells;
}

/** 전체 흐름 한 줄: 지문 1의 칸들 → 지문 2 … → 결과. */
export function buildFlow(map: DevMapView): Cell[] {
  const cells = map.passages.flatMap(passageCells);
  const allDone = map.passages.every(passage => passage.status === 'DONE');
  cells.push({ key: resultKey, kind: 'result', passageId: null, label: '결과', status: allDone ? 'DONE' : 'NOT_YET' });
  return cells;
}

/** 지금 칸 앞·뒤 칸. 요약 선택이 끝나 칸이 바뀐 경우(`choose` → 요약/답 입력)에는 같은 지문의 첫 칸으로 옮겨 잡는다. */
export function neighbor(flow: readonly Cell[], currentKey: string, step: 1 | -1): Cell | null {
  const index = flow.findIndex(cell => cell.key === currentKey);
  return index < 0 ? null : flow[index + step] ?? null;
}
export function resolveKey(flow: readonly Cell[], currentKey: string): string {
  if (flow.some(cell => cell.key === currentKey)) return currentKey;
  const passageId = currentKey.split(':')[0]!;
  return flow.find(cell => cell.passageId === passageId)?.key ?? currentKey;
}
