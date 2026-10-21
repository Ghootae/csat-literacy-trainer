// Handoff 2026-10-21-v5-supported-key-relation-coverage, round 2 (user 2026-10-21 "승인"): >= 2 elements with
// non-overlapping quotes for correct SUPPORTED, and outside-knowledge / restated-conclusion -> JUDGMENT_METHOD.
// Round-1 module stays untouched for its FROZEN hash. Expectations are for the judgment record only.
const C = (id, group, questionId, choiceId, path, rationale) => ({ id, group, questionId, choiceId, rationale, replies: [], full: true, path });
const D = 'dopamine-motor-control-q13';
const M2 = '카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아.';
const L1 = '카르비도파는 말초 조직에서만 작용함.';
const S1 = '카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.';
const K1 = '갑이 자산을 운용할 수 있는 건 대표 이사로서 정관이나 법령으로 권한을 받았기 때문이지, 설립할 때 재산을 출연해서가 아니야. 그래서 2번은 적절하지 않아.';
export const cases = [
  // expect: INSUFFICIENT + MISSING_LINK
  C('L1c', 'L', D, 'C2', 'L-facts-only-c', L1), C('L1d', 'L', D, 'C2', 'L-facts-only-d', L1),
  // expect: INSUFFICIENT + JUDGMENT_METHOD
  C('M2c', 'M', D, 'C2', 'M-outside-knowledge-c', M2), C('M2d', 'M', D, 'C2', 'M-outside-knowledge-d', M2),
  // expect: SUPPORTED (controls)
  C('S1c', 'S', D, 'C2', 'S-sufficient-c', S1), C('K1c', 'K', 'corporate-law-q13', 'C2', 'K-sufficient-c', K1),
];
if (cases.length !== 6 || new Set(cases.map(c => c.id)).size !== 6) throw new Error('Case set must be 6 unique sessions');
