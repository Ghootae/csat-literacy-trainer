const dialogueBase = '/dialogue/dev/simple';

/** 첫 로드 URL에서 문단 이동 요청을 읽는다. paragraph는 0부터인 정수만 인정한다. */
export function parseInitialParagraph(search: string): { sessionId: string | null; passageId: string | null; paragraph: number | null } {
  const params = new URLSearchParams(search);
  const raw = params.get('paragraph');
  const paragraph = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  return { sessionId: params.get('sessionId'), passageId: params.get('passageId'), paragraph };
}

export function problemLink(questionId: string, sessionId: string): string {
  return '/problem/lab?' + new URLSearchParams({ questionId, returnTo: `${dialogueBase}?sessionId=${sessionId}` });
}

const returnPattern = /^\/dialogue\/dev(?:\?sessionId=[a-zA-Z0-9-]+|\/simple\?sessionId=[a-zA-Z0-9-]+)?$/;
export function resolveReturnTo(requested: string): string {
  return returnPattern.test(requested) ? requested : '/dialogue/dev';
}

export function paragraphLink(returnTo: string, passageId: string, paragraph: number): string {
  return returnTo.startsWith(`${dialogueBase}?sessionId=`)
    ? `${returnTo}&paragraph=${paragraph}`
    : `${dialogueBase}?` + new URLSearchParams({ passageId, paragraph: String(paragraph) });
}
