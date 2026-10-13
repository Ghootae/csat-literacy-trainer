// Human-authored fixed student responses (PLAN.md). No model-generated student text.
import { cases as diverse } from './v5-diverse-48-cases.mjs';

const pick = id => { const c = diverse.find(x => x.id === id); if (!c) throw new Error(`Missing diverse-48 case ${id}`); return c; };
const R = (id, questionId, choiceId, rationale, source) => ({ id, group: 'R', questionId, choiceId, rationale, source, full: false });
export const cases = [
  R('R-I2', 'information-asymmetry-free-marketplace-q13', 'C2', '갑은 인공지능을 이용해 광고를 만들고, 이를 알리지 않았음.', '사용자 사례'),
  R('R-I3', 'information-asymmetry-free-marketplace-q13', 'C3', '을의 주장은 표현의 자유를 규제하자는 입장. 그리고 다수 입장은 표현의 자유를 규제하지 않아야 한다는 입장.', '사용자 사례'),
  R('R-C', 'corporate-law-q13', 'C1', '배당금은 자본 잉여금에서 주는 것이에요.', 'C-A2 결론 삭제'),
  R('R-D', 'dopamine-motor-control-q13', 'C1', '레보도파도 도파민처럼 혈액-뇌 장벽을 못 지나가요.', 'D-A2 결론 삭제'),
  R('R-G', 'gongsun-long-later-mohists-q12', 'C2', '후기 묵가도 하나의 이름은 오직 하나의 대상만 가리켜야 한다고 보았어요.', 'G-A2 결론 삭제'),
  R('R-I1', 'information-asymmetry-free-marketplace-q13', 'C1', '현행 생성물 표시 의무는 광고를 올린 사람뿐 아니라 유통 플랫폼에도 이미 적용돼요.', 'I-A2 결론 삭제'),
  R('R-M', 'mrna-vaccine-lipid-nanoparticle-q19', 'C3', '낮은 pH에서는 이온화 지질이 전기적으로 중성이에요.', 'M-A2 결론 삭제'),
  R('R-S', 'surface-tension-laplace-q16', 'C2', '오네소르게 수가 너무 작아서 잉크가 안 나와요. 첨가제를 넣으면 수가 커져요.', 'S-A2 결론 삭제'),
  ...['C', 'D', 'G', 'I', 'M', 'S'].map(k => { const c = pick(`${k}-A1`);
    return { id: `V-${k}`, group: 'V', questionId: c.questionId, choiceId: c.choiceId, rationale: c.rationale, source: `${k}-A1 그대로`, full: k === 'I' || k === 'S', intent: c.intent }; }),
  ...['I', 'S'].flatMap(k => ['CT', 'CP', 'A2', 'A3', 'B1', 'B2'].map(role => { const c = pick(`${k}-${role}`);
    return { id: `F-${k}-${role}`, group: 'F', questionId: c.questionId, choiceId: c.choiceId, rationale: c.rationale, source: `${k}-${role} 그대로`, full: true, role, intent: c.intent }; })),
];
if (cases.length !== 26 || new Set(cases.map(c => c.id)).size !== 26) throw new Error('Case set must be 26 unique sessions');
