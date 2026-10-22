// Handoff 2026-10-22-v5-absence-rationale-by-falsity-type, round 2 (user 2026-10-22 "진행"): A/B split restated as "is the choice
// refuted by a stated fact". Round 1 failed A-type M1e/G1a (both SUPPORTED); K1 x3 rechecks the K1d wobble. Round-1 module untouched.
import { cases as r1 } from './v5-absence-falsity-type-user-cases.mjs';
const pick = (id, next) => ({ ...r1.find(c => c.id === id), id: next });
export const cases = [
  // expect: INSUFFICIENT + JUDGMENT_METHOD (A type)
  pick('M1e', 'M1f'), pick('G1a', 'G1b'),
  // expect: SUPPORTED (B type)
  pick('N1a', 'N1c'), pick('N2a', 'N2b'),
  // expect: SUPPORTED (D-0161 round 3)
  pick('K1d', 'K1g'), pick('K1d', 'K1h'), pick('K1d', 'K1i'),
];
if (cases.length !== 7 || new Set(cases.map(c => c.id)).size !== 7 || cases.some(c => !c.rationale)) throw new Error('Case set must be 7 unique sessions');
