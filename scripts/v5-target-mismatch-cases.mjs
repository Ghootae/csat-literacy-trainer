// Handoff 2026-10-14-v5-choice-target-mismatch: students who judge a different target than the chosen option's.
// T-*: target swapped (symbol, position, actor, stage or object). The stated facts are true of the swapped target.
// K-*: controls with the right target and a contradicted claim (diverse-48 A2); OFF_TARGET must not appear.
import { cases as diverse } from './v5-diverse-48-cases.mjs';

const pick = id => { const c = diverse.find(x => x.id === id); if (!c) throw new Error(`Missing diverse-48 case ${id}`); return c; };
const T = (id, questionId, choiceId, rationale, swap, full = false) => ({ id, group: 'T', questionId, choiceId, rationale, source: swap, full });
export const cases = [
  // User's own session (2026-10-14): ② compares ⓐ·ⓓ; the student compared ⓐ·ⓔ. Run through correction.
  T('T-G', 'gongsun-long-later-mohists-q12', 'C2', 'a는 찾고 있는 빨간옷, e는 빨간옷을 지시-> 하나의 명이 두가지 실을 지시하는 경우. 따라서 후기 묵가를 뒷받침', '기호 ⓓ→ⓔ (사용자 원문)', true),
  // ⑤ is about 갑's donation; the student judged the board's postponement.
  T('T-C', 'corporate-law-q13', 'C5', '⑤가 틀렸어요. 이사회가 영업 이익 분배를 보류한 건 재원이 부족해서였지, 법적 책임과는 상관없어요.', '행위자 갑의 기부→이사회의 보류'),
  // ④ is about (나) with (가); the student judged (다).
  T('T-D', 'dopamine-motor-control-q13', 'C4', '④가 틀려요. (다)는 도파민 수용체에 결합할 뿐 레보도파 합성에는 영향을 주지 않으니까 뇌로 가는 레보도파 양은 늘지 않아요.', '기호 (나)→(다)'),
  // ③ is about the majority opinion on ⓑ; the student judged the minority opinion.
  T('T-I', 'information-asymmetry-free-marketplace-q13', 'C3', '③이 틀려요. 소수 의견은 허위·왜곡 정보는 토론으로 교정되기 어렵다고 봤으니 을의 주장과 맞아요.', '입장 다수 의견→소수 의견'),
  // ④ is about the dialysis stage; the student judged the mixing stage.
  T('T-M', 'mrna-vaccine-lipid-nanoparticle-q19', 'C4', '④가 틀려요. 산성 용액과 섞이는 단계에서는 이온화 지질이 양전하를 띠니까 중성이 아니에요.', '단계 투석→혼합'),
  // ④ is about the blue ink after two months; the student judged the red ink.
  T('T-S', 'surface-tension-laplace-q16', 'C4', '④가 맞아요. 두 달 뒤 빨간색 잉크가 더 끈적해져서 노즐에서 나오지 않았으니 적정 범위를 벗어난 거예요.', '대상 파란색→빨간색 잉크'),
  ...['C', 'D', 'G', 'I', 'M', 'S'].map(k => { const c = pick(`${k}-A2`);
    return { id: `K-${k}`, group: 'K', questionId: c.questionId, choiceId: c.choiceId, rationale: c.rationale, source: `${k}-A2 그대로`, full: false }; }),
];
if (cases.length !== 12 || new Set(cases.map(c => c.id)).size !== 12) throw new Error('Case set must be 12 unique sessions');
