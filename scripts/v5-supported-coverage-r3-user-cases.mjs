// Handoff 2026-10-21-v5-supported-key-relation-coverage, round 3 (user 2026-10-21 "k1은 충분이야. 진행"): elements limited to
// what the verdict needs (not every point of the official explanation). K1 x3 for stability; L1, S1, U2 once as checks.
const C = (id, group, questionId, choiceId, path, rationale) => ({ id, group, questionId, choiceId, rationale, replies: [], full: true, path });
const D = 'dopamine-motor-control-q13';
const K1 = '갑이 자산을 운용할 수 있는 건 대표 이사로서 정관이나 법령으로 권한을 받았기 때문이지, 설립할 때 재산을 출연해서가 아니야. 그래서 2번은 적절하지 않아.';
const L1 = '카르비도파는 말초 조직에서만 작용함.';
const S1 = '카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.';
const U2 = 'd는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.';
export const cases = [
  // expect: SUPPORTED (user 2026-10-21: K1 is sufficient)
  ...['d', 'e', 'f'].map(x => C(`K1${x}`, 'K', 'corporate-law-q13', 'C2', `K-sufficient-${x}`, K1)),
  // expect: INSUFFICIENT + MISSING_LINK
  C('L1e', 'L', D, 'C2', 'L-facts-only-e', L1),
  // expect: SUPPORTED
  C('S1d', 'S', D, 'C2', 'S-sufficient-d', S1),
  C('U2c', 'U', 'gongsun-long-later-mohists-q12', 'C4', 'U-sufficient-c', U2),
];
if (cases.length !== 6 || new Set(cases.map(c => c.id)).size !== 6) throw new Error('Case set must be 6 unique sessions');
