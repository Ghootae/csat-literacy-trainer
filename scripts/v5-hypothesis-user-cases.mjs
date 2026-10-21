// Handoff 2026-10-19-v5-error-hypothesis-first: semi-automatic user review on dopamine q13 (user decision 2026-10-19).
// Student text is authored by Claude. `replies` answer correction questions in order; `supplement` answers the
// rationale request after an omitted wrong choice; `reselect` is the final selection after a successful repair.
// `path` is the branch code in the design-applied tree (https://claude.ai/artifact/HQBEuno92vPqCd1voLjXLA).
const Q = 'dopamine-motor-control-q13';
const H = (id, path, choiceId, rationale, more = {}) => ({ id, group: 'H', questionId: Q, choiceId, rationale, replies: [], full: true, path, ...more });
const FIRST = '지문에서 약물로 유입된 도파민은 장벽을 통과할 수 없다고 했음.';
export const cases = [
  H('P1', 'B2c-S-S2-R2c', 'C1', FIRST, { replies: ['레보도파네.'],
    reselect: { choiceId: 'C2', rationale: '카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘.' } }),
  H('P2', 'B2c-F-E2', 'C1', FIRST, { replies: ['도파민이야.'] }),
  H('P3', 'B2c-S-S1', 'C1', FIRST, { replies: ['레보도파.'] }),
  H('P4', 'B2a-E2', 'C1', '장벽 얘기가 좀 이상해요.'),
  H('P5', 'B2c-S-S1 (지금은 B2d)', 'C4', '카르비도파는 말초 조직에서만 작용함.', { replies: ['뇌로 가는 레보도파가 늘어나요.'] }),
  H('P6', 'B2c-S-S2-R4c-E2', 'C1', '레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가요.', { replies: ['레보도파는 통과해요.'],
    reselect: { choiceId: 'C3', rationale: '(다)는 수용체에 결합하니까 도파민 합성에도 영향을 줘요.' } }),
  H('P7', 'B1b?', 'C5', null, { supplement: '도파민성 뉴런이 파괴되는 건 막을 수 없다고 했어요.' }),
  H('P8', 'A2c', 'C2', '카르비도파는 말초 조직에서만 작용해서 흑질에서 합성된 도파민에는 영향을 줄 수 없음.'),
  H('P9', 'A2d-E2', 'C2', '카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음.'),
  H('P10', 'A2b-S-S1', 'C2', '카르비도파는 뇌 안에서 작용하지만, 합성 효소를 억제하니까 작용 기간을 늘리지는 못함.', { replies: ['아, 말초 조직에서만 작용하네요.'] }),
];
if (cases.length !== 10 || new Set(cases.map(c => c.id)).size !== 10) throw new Error('Case set must be 10 unique sessions');
