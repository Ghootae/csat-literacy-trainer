// Handoff 2026-10-22-v5-absence-rationale-by-falsity-type (user 2026-10-22 "승인"): an "absent from the source" rationale is the key
// relation when the choice is wrong for an unsupported addition (B type), an error when the named content is present, and stays
// JUDGMENT_METHOD when the choice relates present objects wrongly (A type). D-0161 round-3 cases rerun unchanged as regression.
import { cases as r3 } from './v5-supported-coverage-r3-user-cases.mjs';
const C = (id, group, questionId, choiceId, path, rationale, full = true) => ({ id, group, questionId, choiceId, rationale, replies: [], full, path });
const M = 'mrna-vaccine-lipid-nanoparticle-q19', D = 'dopamine-motor-control-q13';
const N1 = 'ph가 높아지면 소수성이 약해진다는 근거가 없음. 그러므로 5번이 적절하지 않음.';
const N2 = '소수성이 약해진다거나 복합체가 더 작아진다는 내용은 지문과 보기 어디에도 없어요. 그래서 5번은 적절하지 않아요.';
const E1 = '보기에는 투석으로 pH를 높인다는 내용이 없어요. 그러니 5번은 적절하지 않아요.';
const E2 = '카르비도파가 효소의 작용을 억제한다는 내용은 지문과 보기에 없어요. 그래서 2번은 적절하지 않아요.';
const M1 = '카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음.';
const G1 = 'ⓓ와 ⓔ가 같은 대상을 가리킨다는 내용은 보기에 없어요. 그래서 4번은 적절하지 않아요.';
export const cases = [
  // expect: SUPPORTED (B type), no "pH -> neutral" element
  C('N1a', 'N', M, 'C5', 'N-absence-b-a', N1), C('N1b', 'N', M, 'C5', 'N-absence-b-b', N1), C('N2a', 'N', M, 'C5', 'N-absence-b-variant', N2),
  // expect: ERROR, STATED on the false absence claim (first judgment only)
  C('E1a', 'E', M, 'C5', 'E-present-claimed-absent', E1, false), C('E2a', 'E', D, 'C2', 'E-present-claimed-absent', E2, false),
  // expect: INSUFFICIENT + JUDGMENT_METHOD (A type)
  C('M1e', 'A', D, 'C2', 'A-absence-relation', M1), C('G1a', 'A', 'gongsun-long-later-mohists-q12', 'C4', 'A-absence-relation', G1),
  // regression: D-0161 round 3 as before
  ...r3,
];
if (cases.length !== 13 || new Set(cases.map(c => c.id)).size !== 13) throw new Error('Case set must be 13 unique sessions');
