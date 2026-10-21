// Handoff 2026-10-14-v5-selection-mismatch-repair: one-slot mismatch question and truth-based repair. Run once, 3 sessions.
// `reply` is the student's answer to the mismatch question (authored here, sent by Claude).
const M = (id, questionId, choiceId, rationale, reply, source) => ({ id, group: 'M', questionId, choiceId, rationale, reply, source, full: true });
export const cases = [
  // User's own session (2026-10-14): content right, wrong option chosen in a "적절하지 않은 것" item.
  M('M-G', 'gongsun-long-later-mohists-q12', 'C5', '공손룡은 속성이 다르면 다른 명을 써야한다고 주장. e는 빨간 옷을 지칭. c는 일반적인 옷. 따라서 e는 c에 속성이 추가된 경우. 따라서 e는 c라는 명으로 불러선 안된다고 볼 것.', '아, 맞는 설명이네.', '사용자 원문'),
  // Another item: the reasoning shows ④ is appropriate, yet ④ was chosen.
  M('M-I', 'information-asymmetry-free-marketplace-q13', 'C4', '④ 선택. 을이 이름을 바꿔 같은 글을 반복해 올린 게 여러 시민의 의견처럼 보여서 법 제정으로 이어졌다면, 허위·왜곡 정보는 토론으로 교정되기 어렵다는 소수 의견을 뒷받침해요.', '적절한 설명이네요.', '오답·근거 맞음'),
  // Correct option in a "가장 적절한 것" item, but the stated conclusion is the opposite.
  M('M-S', 'surface-tension-laplace-q16', 'C3', '③ 선택. 밀도를 두 배로 하고 노즐 지름을 반으로 줄이면 곱이 그대로라 오네소르게 수도 그대로예요. 그러니 ③은 틀린 설명이에요.', '아, 그럼 ③은 맞는 설명이네요.', '정답·결론 반대'),
];
if (cases.length !== 3 || new Set(cases.map(c => c.id)).size !== 3) throw new Error('Case set must be 3 unique sessions');
