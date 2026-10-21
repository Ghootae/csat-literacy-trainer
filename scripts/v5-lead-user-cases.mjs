// Handoff 2026-10-20-v5-section-lead-verdict-words: semi-automatic user review of the new choice-section lead sentence.
// Dopamine q13 sessions are reused from 2026-10-19 (stem: 적절하지 않은 것은?). The surface-tension q16 sessions (stem: 가장
// 적절한 것은?, opposite polarity) are authored by Claude: S1 states a VALID-direction rationale with a content error, S2 is vague.
import { cases as dopamine } from './v5-hypothesis-user-cases.mjs';
const KEEP = ['P2', 'P4', 'P5', 'P6'];
const S = (id, path, choiceId, rationale, more = {}) => ({ id, group: 'H', questionId: 'surface-tension-laplace-q16', choiceId, rationale, replies: [], full: true, path, ...more });
export const cases = [
  ...dopamine.filter(c => KEEP.includes(c.id)),
  S('S1', 'B2c-S-S1', 'C2', '빨간색 잉크가 끈적해서 안 나왔는데 첨가제를 넣고 잘 인쇄됐으니까, 오네소르게 수가 커져서 적정 범위에 들어간 거야.',
    { replies: ['점도가 작아졌으니 오네소르게 수는 작아졌어요.'] }),
  S('S2', 'B2a-E2', 'C5', '시간이 지나면 잉크가 변하니까 맞는 것 같아요.'),
];
if (cases.length !== 6 || new Set(cases.map(c => c.id)).size !== 6) throw new Error('Case set must be 6 unique sessions');
