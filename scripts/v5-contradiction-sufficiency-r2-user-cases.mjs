// Handoff 2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote: round-2 semi-automatic user review (not run here).
// Same sessions as the round-1 module (kept untouched for its FROZEN hash); U1/V1 are repeated to check stability.
// Expectations are for the judgment record only; they are not asserted. `replies` answer correction questions in order.
const Q = 'gongsun-long-later-mohists-q12';
const C = (id, group, path, rationale, replies = []) => ({ id, group, questionId: Q, choiceId: 'C4', rationale, replies, full: true, path });
const U1 = 'd는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은 옳지 않음.';
const U2 = 'd는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.';
const V = 'd와 e 모두 일반적인 옷을 가리키니까, 4번처럼 속성이 지정되지 않은 말로 속성 있는 대상을 가리키는 문제는 없어. 그래서 4번은 적절하지 않아.';
export const cases = [
  // expect: claimConflicts recorded -> UNKNOWN -> no question, CORRECT_UNVERIFIED final explanation
  C('U1a', 'U', 'U-contradiction-a', U1),
  C('U1b', 'U', 'U-contradiction-b', U1),
  // expect: SUPPORTED -> VERIFIED_CORRECT
  C('U2', 'U', 'U-control', U2),
  // expect: repaired, rationaleSufficient false (label-only reply) -> UNVERIFIED_CORRECT
  C('V1a', 'V', 'V-insufficient-a', V, ['빨간 옷', '문제가 있다고 봐']),
  C('V1b', 'V', 'V-insufficient-b', V, ['빨간 옷', '문제가 있다고 봐']),
  // expect: repaired, rationaleSufficient true with exactly one sufficiencyEvidence quote -> VERIFIED_CORRECT
  C('V2', 'V', 'V-sufficient', V, ['빨간 옷이야. 그러니까 ⓓ의 그냥 옷이랑 ⓔ 빨간 옷은 같은 대상을 가리키는 게 아니네.', '문제가 있다고 봐']),
];
if (cases.length !== 6 || new Set(cases.map(c => c.id)).size !== 6) throw new Error('Case set must be 6 unique sessions');
