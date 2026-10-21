// Handoff 2026-10-21-v5-supported-key-relation-coverage: semi-automatic user review (not run here).
// Each rationale runs twice (a, b). Expectations are for the judgment record only and are not asserted.
const C = (id, group, questionId, choiceId, path, rationale) => ({ id, group, questionId, choiceId, rationale, replies: [], full: true, path });
const D = 'dopamine-motor-control-q13';
const M2 = '카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아.';
const L1 = '카르비도파는 말초 조직에서만 작용함.';
const B1 = '카르비도파는 뇌에 못 들어가.';
const S1 = '카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.';
const U2 = 'd는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.';
const K1 = '갑이 자산을 운용할 수 있는 건 대표 이사로서 정관이나 법령으로 권한을 받았기 때문이지, 설립할 때 재산을 출연해서가 아니야. 그래서 2번은 적절하지 않아.';
const pair = (id, group, q, choice, path, rationale) => ['a', 'b'].map(x => C(id + x, group, q, choice, `${path}-${x}`, rationale));
export const cases = [
  // expect: INSUFFICIENT + JUDGMENT_METHOD
  ...pair('M2', 'M', D, 'C2', 'M-outside-knowledge', M2),
  // expect: INSUFFICIENT + MISSING_LINK
  ...pair('L1', 'L', D, 'C2', 'L-facts-only', L1),
  // boundary case: user judges
  ...pair('B1', 'B', D, 'C2', 'B-boundary', B1),
  // expect: SUPPORTED (control)
  ...pair('S1', 'S', D, 'C2', 'S-sufficient', S1),
  // expect: SUPPORTED (control)
  ...pair('U2', 'U', 'gongsun-long-later-mohists-q12', 'C4', 'U-sufficient', U2),
  // expect: SUPPORTED (control, different question)
  ...pair('K1', 'K', 'corporate-law-q13', 'C2', 'K-sufficient', K1),
];
if (cases.length !== 12 || new Set(cases.map(c => c.id)).size !== 12) throw new Error('Case set must be 12 unique sessions');
