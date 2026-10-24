export type StrategyChoices = { position: number; paragraphs: string[] }[];
/** opened의 마지막 항목이 지금 보는 선지다. shown은 그 선지에서 보여 준 문단 수. */
export interface StrategyState { opened: { position: number; shown: number }[] }
export type StrategyStage = 'INTRO' | 'READING' | 'ENDED';
export interface StrategyBubble { key: string; label: string; text: string; end: boolean }

/** 세션 종료 뒤 안내 말풍선. 부정 발문은 틀린 내용의 선지가 정답, 긍정 발문은 오답들이다(사용자 문구, 2026-10-24). */
export const strategyLeadText = (polarity: 'SELECT_INCORRECT' | 'SELECT_CORRECT'): string => polarity === 'SELECT_INCORRECT'
  ? '선지를 누르면 출제자가 어떤 전략으로 정답 선지에 함정을 만들었는지 검토할 수 있어.'
  : '출제자가 어떤 전략으로 오답 선지들에 함정을 만들었는지 검토할 수 있어. 보고 싶은 선지를 문제에서 눌러 봐.';

/** 문제 칸 맨 위 한 줄 안내. solving은 선지를 고를 수 있는 풀이 단계. 그 밖의 단계는 빈 문자열.
 * 전략을 볼 선지가 하나뿐이면(부정 발문) 다른 선지로 바꿀 수 없으므로 읽는 중 안내를 비운다(사용자 2026-10-24). */
export const choiceHintText = (solving: boolean, stage: StrategyStage | null, strategyCount = 2): string => solving ? '선지를 눌러 답을 골라'
  : stage === 'INTRO' ? '틀린 내용을 담은 선지를 누르면 그 선지의 전략을 볼 수 있어'
  : stage === 'READING' ? (strategyCount > 1 ? '다른 선지를 누르면 그 선지 전략으로 바뀌어' : '')
  : stage === 'ENDED' ? '본 선지도 다시 누를 수 있어' : '';

export const initialStrategyState: StrategyState = { opened: [] };
export const circled = (position: number) => '①②③④⑤'[position - 1] ?? String(position);
const lengthOf = (choices: StrategyChoices, position: number) => choices.find(c => c.position === position)?.paragraphs.length ?? 0;

/** 이미 본 선지도 다시 열 수 있고, 그러면 처음 문단부터 새로 시작한다(앞선 말풍선은 그대로 남는다). */
export function openStrategy(state: StrategyState, position: number, choices: StrategyChoices): StrategyState {
  if (!lengthOf(choices, position)) return state;
  return { opened: [...state.opened, { position, shown: 1 }] };
}
export function nextStrategyParagraph(state: StrategyState, choices: StrategyChoices): StrategyState {
  const last = state.opened.at(-1);
  if (!last || last.shown >= lengthOf(choices, last.position)) return state;
  return { opened: [...state.opened.slice(0, -1), { ...last, shown: last.shown + 1 }] };
}
export function strategyStage(state: StrategyState, choices: StrategyChoices): StrategyStage {
  const last = state.opened.at(-1);
  return !last ? 'INTRO' : last.shown >= lengthOf(choices, last.position) ? 'ENDED' : 'READING';
}
/** 전략을 열어 본 선지. 읽는 중인 선지는 '보는 중'이므로 뺀다. */
export const seenStrategyPositions = (state: StrategyState, stage: StrategyStage): number[] => {
  const current = stage === 'READING' ? currentStrategyPosition(state) : null;
  return [...new Set(state.opened.map(o => o.position))].filter(p => p !== current);
};
/** [전략 보기]가 여는 선지: 마지막 선택이 아직 안 본 전략 선지면 그것, 아니면 안 본 것 중 가장 작은 번호, 모두 봤으면 첫 선지. */
export function defaultStrategyPosition(state: StrategyState, choices: StrategyChoices, lastChoice: number | null): number | null {
  const unseen = remainingStrategyPositions(state, choices);
  if (lastChoice !== null && unseen.includes(lastChoice)) return lastChoice;
  return unseen.length ? Math.min(...unseen) : choices[0]?.position ?? null;
}
/** 지금 전략을 보는 선지. 안 보고 있으면 null. */
export const currentStrategyPosition = (state: StrategyState): number | null => state.opened.at(-1)?.position ?? null;
export const remainingStrategyPositions = (state: StrategyState, choices: StrategyChoices): number[] =>
  choices.map(c => c.position).filter(p => !state.opened.some(o => o.position === p));
export const strategyEndText = (position: number, remaining: number[]): string =>
  remaining.length ? `${circled(position)}번 전략은 여기까지야. 다른 선지의 함정도 볼 수 있어.` : `${circled(position)}번 전략은 여기까지야.`;

export function strategyBubbles(state: StrategyState, choices: StrategyChoices): StrategyBubble[] {
  return state.opened.flatMap((opened, index) => {
    const paragraphs = choices.find(c => c.position === opened.position)?.paragraphs ?? [];
    const label = `출제자 전략 · ${circled(opened.position)}`;
    const bubbles: StrategyBubble[] = paragraphs.slice(0, opened.shown).map((text, i) => ({ key: `strategy-${index}-${opened.position}-${i}`, label, text, end: false }));
    if (opened.shown >= paragraphs.length) {
      const remaining = choices.map(c => c.position).filter(p => !state.opened.slice(0, index + 1).some(o => o.position === p));
      bubbles.push({ key: `strategy-${index}-${opened.position}-end`, label: '피드백', text: strategyEndText(opened.position, remaining), end: true });
    }
    return bubbles;
  });
}
