// Handoff 2026-10-21-v5-correct-unverified-judgment-method, round 2: M1 only, after adding the explicit-why sentence
// to CORRECT_END_INSTRUCTIONS (user 2026-10-21 "일괄로 승인"). Round-1 module stays untouched for its FROZEN hash.
const Q = 'dopamine-motor-control-q13';
const M1 = '카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음.';
const C = (id, path) => ({ id, group: 'M', questionId: Q, choiceId: 'C2', rationale: M1, replies: [], full: true, path });
export const cases = [C('M1c', 'M-absence-c'), C('M1d', 'M-absence-d')];
if (cases.length !== 2 || new Set(cases.map(c => c.id)).size !== 2) throw new Error('Case set must be 2 unique sessions');
