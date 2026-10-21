// Handoff 2026-10-21-v5-correct-unverified-judgment-method: semi-automatic user review (not run here).
// All cases pick the answer (C2) of the dopamine question; expectations are for the judgment record only and are not asserted.
const Q = 'dopamine-motor-control-q13';
const C = (id, group, path, rationale) => ({ id, group, questionId: Q, choiceId: 'C2', rationale, replies: [], full: true, path });
const M1 = '카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음.';
const M2 = '카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아.';
const L1 = '카르비도파는 말초 조직에서만 작용함.';
const S1 = '카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.';
export const cases = [
  // expect: INSUFFICIENT + JUDGMENT_METHOD; first section does not accept "not in the passage" as a valid reason, gives one principle sentence + what to check
  C('M1a', 'M', 'M-absence-a', M1),
  C('M1b', 'M', 'M-absence-b', M1),
  // expect: INSUFFICIENT + JUDGMENT_METHOD; first section says the judgment must rest on the passage/choices
  C('M2', 'M', 'M-outside-knowledge', M2),
  // expect: INSUFFICIENT + MISSING_LINK; first section follows the existing rule (acknowledge the correct part + the missing link)
  C('L1', 'L', 'L-facts-only', L1),
  // expect: SUPPORTED + NONE -> "근거도 정확해. 잘 풀었어."
  C('S1', 'S', 'S-sufficient', S1),
];
if (cases.length !== 5 || new Set(cases.map(c => c.id)).size !== 5) throw new Error('Case set must be 5 unique sessions');
