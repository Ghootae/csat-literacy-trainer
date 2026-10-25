/** 문단 화면 -> 문제 화면 주소. 서버(problemUrl)와 클라이언트(파트 이동 막대)가 같은 문자열을 쓴다. */
export function problemLink(questionId: string, sessionId: string): string {
  return '/problem/lab?' + new URLSearchParams({ questionId, returnTo: `/dialogue/lab?sessionId=${sessionId}` });
}
