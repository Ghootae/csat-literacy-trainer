// Reselection-section live check (docs/experiments/v5-reselection-sections-2026-10-14/PLAN.md).
// Human-authored fixed student responses. No model-generated student text.
import { cases as diverse, specs } from './v5-diverse-48-cases.mjs';

const pick = id => { const c = diverse.find(x => x.id === id); if (!c) throw new Error(`Missing diverse-48 case ${id}`); return c; };
// P3: correct choice, but the rationale states one fact that contradicts the source. Checked against the passage.
export const P3 = {
  C: '②가 적절하지 않아요. 법인격은 갑 개인에게 부여되고, 갑의 권한은 정관에서 나오는 것이니까요.',
  D: '②가 적절하지 않아요. 카르비도파는 혈액-뇌 장벽을 통과해 뇌 안에서 레보도파가 도파민으로 바뀌는 것을 막으니까, 도파민의 작용 기간을 늘린다는 설명은 틀려요.',
  G: "④가 적절하지 않아요. ⓓ의 '옷'은 빨간 옷만 가리키고 ⓔ의 '빨간 옷'은 일반적인 옷을 가리키니까, 둘이 같은 대상을 지시한다는 전제가 틀려요.",
  I: '⑤가 적절하지 않아요. 소수 의견이 실명 확인 규정을 위헌이라고 했으니 플랫폼 B는 제재를 받지 않아요.',
  M: '⑤가 적절하지 않아요. 투석을 하면 pH가 낮아져서 이온화 지질이 양전하를 띠니까, 소수성이 약해진다는 설명은 맞지 않아요.',
  S: '③이 맞아요. 밀도를 두 배로 하고 노즐 지름을 반으로 하면 둘의 곱은 그대로예요. 점도가 클수록 오네소르게 수는 작아지는데 점도도 그대로니까 수는 변함없어요.',
};
export const cases = specs.flatMap(s => {
  const k = s.key, B2 = pick(`${k}-B2`), A2 = pick(`${k}-A2`), CT = pick(`${k}-CT`);
  const base = { questionId: s.questionId, group: 'S', full: true, role: 'RESELECT' };
  return [
    { ...base, id: `P1-${k}`, path: 'RESELECTION_WRONG', choiceId: B2.choiceId, rationale: B2.rationale, source: `${k}-B2 → ${k} rewrong`,
      reselect: { choiceId: `C${s.wrong[0]}`, rationale: s.rewrong } },
    { ...base, id: `P2-${k}`, path: 'CORRECT_UNVERIFIED', choiceId: A2.choiceId, rationale: A2.rationale, source: `${k}-A2 → ${k}-CT`,
      reselect: { choiceId: CT.choiceId, rationale: CT.rationale } },
    { ...base, id: `P3-${k}`, path: 'NO_CORRECTION', choiceId: A2.choiceId, rationale: A2.rationale, source: `${k}-A2 → P3 새 문장`,
      reselect: { choiceId: `C${s.answer}`, rationale: P3[k] } },
  ];
});
if (cases.length !== 18 || new Set(cases.map(c => c.id)).size !== 18) throw new Error('Case set must be 18 unique sessions');
