/** 말풍선 문장 세트와 고르기. 서버와 클라이언트가 같이 쓴다. 같은 key는 늘 같은 문장을 고른다. */

/** FNV-1a 32비트 해시. */
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** key의 안정 해시로 세트에서 한 문장을 고른다. avoid와 같으면 다음 항목. */
export function pickLine(set: readonly string[], key: string, avoid?: string): string {
  const start = hash(key) % set.length;
  const line = set[start]!;
  return avoid !== undefined && line === avoid ? set[(start + 1) % set.length]! : line;
}

export const bubbleLines = {
  answerEarly: ['네 근거를 읽고 있어', '네가 쓴 이유를 차근차근 읽고 있어', '네 생각을 따라가 보고 있어'],
  answerMid: ['원문이랑 하나씩 맞춰 보고 있어', '네 근거가 원문 어디랑 이어지는지 찾고 있어', '네 말을 원문에 하나씩 대 보고 있어'],
  answerLate: ['네 생각이 어떻게 이어지는지 살펴보고 있어', '근거에서 답까지 어떻게 이어지는지 보고 있어', '네 근거와 선지를 이어 보고 있어'],
  correctionEarly: ['네 답을 읽고 있어', '네가 다시 쓴 생각을 읽고 있어', '네 답을 차근차근 읽고 있어'],
  correctionLate: ['아까 질문이랑 맞춰 보고 있어', '아까 물어본 내용이랑 견줘 보고 있어', '네 답이 질문에 맞는지 보고 있어'],
  gapLate: ['물어본 내용이 채워졌는지 보고 있어', '빠졌던 내용이 들어갔는지 보고 있어', '물어본 부분을 네 답에서 찾고 있어'],
  explanation: ['설명을 정리하고 있어', '어떻게 설명할지 정리하고 있어', '설명할 내용을 하나씩 모으고 있어'],
  unknown: ['네 답을 살펴보고 있어', '네 답을 차근차근 보고 있어', '네 답을 읽어 보고 있어'],
  summaryEarly: ['네 요약을 읽고 있어', '네가 쓴 요약을 차근차근 읽고 있어', '네 요약을 따라가 보고 있어'],
  summaryMid: ['문단이랑 하나씩 맞춰 보고 있어', '네 요약을 문단에 하나씩 대 보고 있어', '문단 어디를 담았는지 찾고 있어'],
  summaryLate: ['어떤 내용을 잡았는지 정리하고 있어', '담은 내용과 빠진 내용을 나눠 보고 있어', '네 요약이 문단 핵심과 어떻게 맞는지 보고 있어'],
  long: ['조금 오래 걸리고 있어. 조금만 더 기다려 줘', '생각할 게 좀 많네. 조금만 더 기다려 줘', '시간이 좀 걸리네. 조금만 더 기다려 줘'],
  done: ['다 살펴봤어.', '생각이 끝났어.', '정리가 끝났어.'],
  praise: ['내가 판단한 문단의 핵심 내용과 모두 일치했어! 잘했어~', '문단의 핵심을 빠짐없이 잡았어! 잘했어~', '핵심 내용을 정확하게 잡아냈어! 잘했어~'],
} as const satisfies Record<string, readonly string[]>;
