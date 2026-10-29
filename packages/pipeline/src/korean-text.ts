/** Share of Hangul among all letters; 1 when there are no letters (symbols only or empty). */
export function hangulRatio(text: string): number {
  const letters = text.match(/\p{L}/gu);
  if (!letters) return 1;
  return letters.filter(c => /\p{Script=Hangul}/u.test(c)).length / letters.length;
}

/** A Korean rewrite instruction when student-visible text is not mostly Hangul, else null. */
export function nonKoreanProblem(field: string, text: string): string | null {
  const ratio = hangulRatio(text);
  return ratio < 0.5 ? `${field}가 한국어가 아니다(한글 비율 ${ratio.toFixed(2)}). 학생에게 보이는 모든 문장은 한국어로 쓴다.` : null;
}
