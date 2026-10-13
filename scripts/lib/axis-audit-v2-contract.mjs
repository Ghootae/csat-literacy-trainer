// 감사기 출력 계약 검사. v2(D-0086)는 일반 문단 최소 2축, v3(D-0088)은 일반 문단의 실질 설명
// 축 기준 최소 2축이다. 의미 타당성은 판정하지 않고, 기계적으로 확인 가능한 구조·인용·최소 축
// 규칙만 검사한다. 위반 목록을 반환하며 빈 배열이면 통과다.
export const ROLES = ['introduction', 'conclusion', 'general'];
export const RELATIONS = ['same-question', 'claim-and-support', 'distinct-questions', 'uncertain'];
export const RELATIONS_V3 = [...RELATIONS, 'connective-absorption'];

// 공백 차이(줄바꿈·연속 공백)만 허용하고 띄어쓰기 자체는 구별한다.
const norm = (s) => String(s ?? '').replace(/\s+/gu, ' ').trim();
const contains = (whole, part) => norm(part).length > 0 && norm(whole).includes(norm(part));

// 확실하지 않은 기능 판정은 일반 문단으로 본다(보수적 기본값).
export function effectiveRole(paragraphFunction) {
  if (!paragraphFunction || paragraphFunction.uncertain) return 'general';
  return paragraphFunction.role;
}

// 원문 문장 수. 문장 끝 부호 뒤에 공백·닫는 따옴표·괄호·끝이 오는 경우를 센다.
// 끝 부호 없이 남은 텍스트도 한 문장으로 센다(문장 하나 반을 한 문장으로 보지 않도록).
export const sentenceCount = (text) => {
  const t = norm(text);
  const ends = [...t.matchAll(/[.?!](?:["'”’)\]*]*)(?=\s|$)/gu)];
  const tail = ends.length ? t.slice(ends.at(-1).index + ends.at(-1)[0].length).trim() : t;
  return ends.length + (tail ? 1 : 0);
};

export function validateAuditV2({ paragraphId, paragraphText, axes: input }, out, { substantiveRule = false } = {}) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (out.paragraphId !== paragraphId) fail(`paragraphId 불일치: ${out.paragraphId}`);
  if (substantiveRule && !Array.isArray(out.connectiveAxes)) { fail('connectiveAxes 없음'); out = { ...out, connectiveAxes: [] }; }
  const connectiveIds = new Set(substantiveRule ? out.connectiveAxes.map((c) => c.id) : []);
  const ids = input.map((a) => a.id);
  const byId = new Map(input.map((a) => [a.id, a]));

  out.axes.forEach((a, i) => { if (a.id !== `AX${i + 1}`) fail(`최종 ID 순서 오류: ${a.id}`); });
  let previous = -1;
  for (const a of out.axes) {
    const at = a.fromAxisIds.map((id) => ids.indexOf(id));
    if (!at.length || at.some((n, i) => n < 0 || (i && n !== at[i - 1] + 1))) { fail(`${a.id}: fromAxisIds가 연속된 입력 축이 아님`); continue; }
    if (at[0] <= previous) fail(`${a.id}: 입력 축 순서 역전`);
    previous = at.at(-1);
    if ((a.action === 'merge') !== (at.length > 1)) fail(`${a.id}: action과 병합 축 수 불일치`);
    if (a.action === 'keep') {
      const p = byId.get(a.fromAxisIds[0]);
      for (const k of ['centralQuestion', 'description', 'metaAxis']) if (a[k] !== p[k]) fail(`${a.id}: keep인데 ${k} 변경`);
    }
    if (a.action === 'merge') errors.push(...validateMergeReview(a, byId, substantiveRule ? RELATIONS_V3 : RELATIONS, connectiveIds));
    else if (a.mergeReview !== null) fail(`${a.id}: 병합이 아닌 축에 mergeReview가 있음`);
  }
  const used = [...out.axes.flatMap((a) => a.fromAxisIds), ...out.deletedAxes.map((a) => a.id)];
  if (used.length !== ids.length || new Set(used).size !== ids.length || !ids.every((id) => used.includes(id))) fail('입력 축이 정확히 한 번씩 처리되지 않음');
  if (!out.axes.length) fail('최종 축 없음');

  const pf = out.paragraphFunction;
  if (!ROLES.includes(pf.role)) fail(`문단 기능 값 오류: ${pf.role}`);
  if (effectiveRole(pf) !== 'general' && !contains(paragraphText, pf.evidenceQuote)) fail('도입·정리 판정 근거가 원문 인용이 아님');
  if (substantiveRule) {
    // 원문 한 문장만 담은 소개·연결 축은 실질 설명 수에서 뺀다(D-0088).
    const seen = new Set();
    for (const c of out.connectiveAxes) {
      const axis = byId.get(c.id);
      if (!axis) { fail(`소개·연결 축 ID 없음: ${c.id}`); continue; }
      if (seen.has(c.id)) fail(`소개·연결 축 중복: ${c.id}`);
      seen.add(c.id);
      if (sentenceCount(axis.sourceText) !== 1) fail(`${c.id}: 소개·연결 축은 원문 한 문장이어야 함`);
      if (!contains(axis.sourceText, c.evidenceQuote)) fail(`${c.id}: 소개·연결 근거가 해당 축 원문 인용이 아님`);
      if (!norm(c.reason)) fail(`${c.id}: 소개·연결 판단 이유 없음`);
    }
    // 소개·연결 축만으로 된 최종 축은 실질 설명 수에 넣지 않는다.
    const substantive = input.length - seen.size;
    const finalSubstantive = out.axes.filter((a) => a.fromAxisIds.some((id) => !seen.has(id))).length;
    if (effectiveRole(pf) === 'general' && substantive >= 2 && finalSubstantive < 2) fail('일반 문단의 실질 설명 축이 2개 이상인데 최종 실질 설명 축이 2개 미만(최소 2축 규칙)');
  } else if (effectiveRole(pf) === 'general' && input.length >= 2 && out.axes.length < 2) fail('일반 문단의 최종 축이 2개 미만(최소 2축 규칙)');
  if (out.singleAxisOpinion.thinksSingleAxis && !norm(out.singleAxisOpinion.reason)) fail('1축 의견의 근거 없음');
  return errors;
}

function validateMergeReview(a, byId, relations, connectiveIds = new Set()) {
  const errors = [];
  const fail = (message) => errors.push(`${a.id}: ${message}`);
  const r = a.mergeReview;
  if (!r) return [`${a.id}: 병합 축에 mergeReview 없음`];
  const same = (list) => list.length === a.fromAxisIds.length && list.every((x, i) => x.id === a.fromAxisIds[i]);
  if (!same(r.originalQuestions)) fail('originalQuestions ID가 fromAxisIds와 다름');
  for (const q of r.originalQuestions) if (byId.get(q.id)?.centralQuestion !== q.centralQuestion) fail(`${q.id} centralQuestion 정확 인용 아님`);
  if (!same(r.originalRequirements)) fail('originalRequirements ID가 fromAxisIds와 다름');
  for (const q of r.originalRequirements) if (!contains(byId.get(q.id)?.description, q.quote)) fail(`${q.id} 요구 근거가 원 L1 인용이 아님`);
  if (!relations.includes(r.questionRelation.type)) fail(`질문 관계 값 오류: ${r.questionRelation.type}`);
  if (r.questionRelation.type === 'connective-absorption' && !a.fromAxisIds.some((id) => connectiveIds.has(id))) fail('connective-absorption인데 소개·연결 축이 병합에 없음');
  if (!same(r.requirementMapping.mappings)) fail('requirementMapping ID가 fromAxisIds와 다름');
  for (const m of r.requirementMapping.mappings) {
    if (m.finalPhrase === null) { if (!norm(m.excludedReason)) fail(`${m.id} 제외 이유 없음`); }
    else {
      if (!contains(a.description, m.finalPhrase)) fail(`${m.id} 대응 구절이 최종 L1에 없음`);
      if (m.excludedReason !== null) fail(`${m.id} 대응 구절과 제외 이유가 함께 있음`);
    }
  }
  if (r.requirementMapping.newRequirements.some((x) => !norm(x))) fail('빈 newRequirements 항목');
  if (!norm(r.contrastResponse.response)) fail('대조 응답 없음');
  return errors;
}

// 검토 표시용 신호. 오류 판정이나 병합 취소 근거가 아니다.
export function auditFlags({ axes: input }, out) {
  return {
    role: out.paragraphFunction.role,
    effectiveRole: effectiveRole(out.paragraphFunction),
    inputAxes: input.length,
    finalAxes: out.axes.length,
    merges: out.axes.filter((a) => a.action === 'merge').map((a) => ({
      id: a.id,
      mergedAxisCount: a.fromAxisIds.length,
      // 삭제와 병합을 함께 써서 문단이 축 하나로 줄어든 경우도 포함한다.
      wholeParagraphMerge: out.axes.length === 1,
      questionRelation: a.mergeReview?.questionRelation.type ?? null,
      excludedRequirements: a.mergeReview?.requirementMapping.mappings.filter((m) => m.finalPhrase === null).map((m) => m.id) ?? [],
      newRequirements: a.mergeReview?.requirementMapping.newRequirements.length ?? 0,
    })),
    deleted: out.deletedAxes.length,
    connectiveAxes: out.connectiveAxes?.map((c) => c.id) ?? [],
    substantiveInputAxes: input.length - (out.connectiveAxes?.length ?? 0),
    // 입력 축 대부분을 소개·연결로 표시한 경우. 검토 우선 신호다.
    mostlyConnective: input.length >= 2 && (out.connectiveAxes?.length ?? 0) >= input.length - 1,
    singleAxisOpinion: out.singleAxisOpinion.thinksSingleAxis,
    l1Lengths: out.axes.map((a) => a.description.length),
  };
}
