// graphPlan 서버 확인(2026-11-25, CLI-graphB-code.md 3절). run.mjs(RULES_V=6, KIND=graph)가 부르고 시험 파일도 부른다. API 호출 없음.
// 입력: graphPlan(모델이 graphSpec보다 먼저 쓴 계획), graphSpec, 지문. 출력: {ok, errs}. errs 문구는 run.mjs가 '그래프 계획 오류: …'로 checks에 올린다.
const SHAPE_FROM = ['지문', '보기'];
const ws = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const stripParen = s => String(s ?? '').replace(/\([^)]*\)|（[^）]*）/g, ''); // 괄호 안(단위·부가 설명)을 뗀다
const compact = (s, unit) => { let r = stripParen(s).replace(/\s+/g, ''); const u = String(unit ?? '').replace(/\s+/g, ''); if (u) r = r.split(u).join(''); return r; };

export function checkGraphPlan(graphPlan, graphSpec, passage) {
  const errs = [];
  if (!graphPlan || typeof graphPlan !== 'object' || Array.isArray(graphPlan)) return { ok: false, errs: ['graphPlan이 없음'] };
  const v = graphPlan.variables || {};
  for (const [k, axis] of [['x', graphSpec?.xAxis], ['y', graphSpec?.yAxis]]) {
    const want = compact(v[k], axis?.unit), got = compact(axis?.label, axis?.unit);
    if (!want) errs.push(`variables.${k}가 비어 있음`);
    else if (!got.includes(want)) errs.push(`${k === 'x' ? 'xAxis' : 'yAxis'}.label "${axis?.label ?? ''}"이 variables.${k} "${v[k]}"를 포함하지 않음`);
  }
  const rel = graphPlan.relation;
  if (!Array.isArray(rel) || rel.length < 1 || rel.length > 2) errs.push(`relation이 ${Array.isArray(rel) ? rel.length : 0}개(1~2개여야 함)`);
  else {
    const text = ws(passage);
    rel.forEach((r, i) => { const q = ws(r?.quote); if (!q || !text.includes(q)) errs.push(`relation[${i}].quote가 지문에 그대로 없음`); });
  }
  const planIds = (Array.isArray(graphPlan.series) ? graphPlan.series : []).map(s => s?.id), specIds = (graphSpec?.series || []).map(s => s.id);
  const miss = specIds.filter(id => !planIds.includes(id)), extra = planIds.filter(id => !specIds.includes(id));
  if (miss.length || extra.length) errs.push(`graphPlan.series id가 graphSpec.series id와 다름${miss.length ? ` (graphPlan에 없음: ${miss.join(', ')})` : ''}${extra.length ? ` (graphSpec에 없음: ${extra.join(', ')})` : ''}`);
  (Array.isArray(graphPlan.series) ? graphPlan.series : []).forEach(s => { if (!SHAPE_FROM.includes(s?.shapeFrom)) errs.push(`series ${s?.id} shapeFrom "${s?.shapeFrom ?? ''}"이 지문|보기가 아님`); });
  return { ok: errs.length === 0, errs };
}
