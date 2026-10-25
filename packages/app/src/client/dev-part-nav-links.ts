const dialogueBase = '/dialogue/lab';

/** 첫 로드 URL에서 문단 이동 요청을 읽는다. paragraph는 0부터인 정수만 인정한다. */
export function parseInitialParagraph(search: string): { sessionId: string | null; passageId: string | null; paragraph: number | null } {
  const params = new URLSearchParams(search);
  const raw = params.get('paragraph');
  const paragraph = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  return { sessionId: params.get('sessionId'), passageId: params.get('passageId'), paragraph };
}

export { problemLink } from '../shared/problem-link.js';

// 옛 단순 형식 주소 /dialogue/dev/simple(D-0174)과 축 기반 /dialogue/dev도 돌아갈 곳으로 받는다.
const returnPattern = /^\/dialogue\/(?:lab\?sessionId=[a-zA-Z0-9-]+|dev(?:\?sessionId=[a-zA-Z0-9-]+|\/simple\?sessionId=[a-zA-Z0-9-]+)?)$/;
export function resolveReturnTo(requested: string): string {
  return returnPattern.test(requested) ? requested : dialogueBase;
}

export function paragraphLink(returnTo: string, passageId: string, paragraph: number): string {
  return returnTo.startsWith(`${dialogueBase}?sessionId=`)
    ? `${returnTo}&paragraph=${paragraph}`
    : `${dialogueBase}?` + new URLSearchParams({ passageId, paragraph: String(paragraph) });
}
