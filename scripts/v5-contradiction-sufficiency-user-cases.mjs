// Handoff 2026-10-21-v5-self-contradiction-unknown-and-sufficiency-evidence: semi-automatic user review (not run here).
// U1/U2: 23번 (self-contradicting rationale -> UNKNOWN vs. no over-application). V1/V2: 24번 (sufficiency needs the student's own key relation).
// Expectations are for the judgment record only; they are not asserted. `replies` answer correction questions in order.
const Q = 'gongsun-long-later-mohists-q12';
const C = (id, group, path, rationale, replies = []) => ({ id, group, questionId: Q, choiceId: 'C4', rationale, replies, full: true, path });
const V_RATIONALE = 'd와 e 모두 일반적인 옷을 가리키니까, 4번처럼 속성이 지정되지 않은 말로 속성 있는 대상을 가리키는 문제는 없어. 그래서 4번은 적절하지 않아.';
export const cases = [
  // expect: UNKNOWN -> no question, CORRECT_UNVERIFIED final explanation
  C('U1', 'U', 'U-contradiction', 'd는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은 옳지 않음.'),
  // expect: SUPPORTED -> VERIFIED_CORRECT
  C('U2', 'U', 'U-control', 'd는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.'),
  // expect: E1(ⓔ) repaired, rationaleSufficient false -> UNVERIFIED_CORRECT
  C('V1', 'V', 'V-insufficient', V_RATIONALE, ['빨간 옷']),
  // expect: repaired, rationaleSufficient true with sufficiencyEvidence quoting the reply -> VERIFIED_CORRECT
  C('V2', 'V', 'V-sufficient', V_RATIONALE, ['빨간 옷이야. 그러니까 ⓓ의 그냥 옷이랑 ⓔ 빨간 옷은 같은 대상을 가리키는 게 아니네.']),
];
if (cases.length !== 4 || new Set(cases.map(c => c.id)).size !== 4) throw new Error('Case set must be 4 unique sessions');
