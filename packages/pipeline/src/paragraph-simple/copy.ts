/**
 * 원문 옮겨 적기 결정적 감지(v4.5). 모델 판정이 지문에 따라 흔들려(표면 장력 문단 29/45 GAP 오판) 서버가 먼저 정한다.
 * 기준: 지문의 문장 하나 이상이 학생 응답에 거의 통째로 들어 있고(문장 글자의 90% 이상), 그렇게 옮긴 문장들이 응답의 대부분(80% 이상)이다.
 * 원문 문장을 줄이거나 고쳐 쓴 응답("도파민은 직접 경로를 활성화하고 간접 경로는 억제한다")은 잡지 않는다.
 */
const GRAM = 6;
const normalize = (text: string) => text.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
const gramsOf = (text: string) => {
  const grams = new Set<string>();
  for (let i = 0; i + GRAM <= text.length; i++) grams.add(text.slice(i, i + GRAM));
  return grams;
};
/** text의 글자 중 grams에 속한 GRAM글자 조각으로 덮이는 비율. */
const coverage = (text: string, grams: Set<string>) => {
  const covered = new Array<boolean>(text.length).fill(false);
  for (let i = 0; i + GRAM <= text.length; i++) if (grams.has(text.slice(i, i + GRAM))) covered.fill(true, i, i + GRAM);
  return covered.filter(Boolean).length / Math.max(text.length, 1);
};

export function detectSourceCopy(studentText: string, paragraphs: string[]): boolean {
  const student = normalize(studentText);
  if (student.length < GRAM) return false;
  const studentGrams = gramsOf(student);
  const copied = paragraphs.flatMap(p => p.split(/(?<=[.?!])\s+/)).map(normalize)
    .filter(sentence => sentence.length >= GRAM && coverage(sentence, studentGrams) >= 0.9);
  if (!copied.length) return false;
  return coverage(student, new Set(copied.flatMap(sentence => [...gramsOf(sentence)]))) >= 0.8;
}
