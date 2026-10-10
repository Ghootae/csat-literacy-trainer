// 순수 함수만 둔다. 블록 문구는 인계 문서에서 그대로 옮겼다.
export const CLAIM_BLOCK = "## 학생 주장 분리 기록\nSELECTION에서 contentAssessment와 errors를 정하기 전에 studentClaims를 기록한다.\n- studentClaims: 이번 선택의 학생 발화에서 학생이 명시한 판단을 의미 단위로 나누어 빠짐없이 적는다. 각 항목은 observationId, 해당 학생 발화에서 정확히 복사한 quote, 학생이 말한 대상·관계 방향·조건·대응 순서를 바꾸지 않고 다시 쓴 claimAsStated, 원문 대조 결과 sourceCheck, 그 근거 sourceBasis를 가진다.\n- claimAsStated에는 평가자가 원문에서 확인한 해석을 넣지 않는다. 학생이 말한 것을 그대로 옮기며, 원문과 다르더라도 고치지 않는다.\n- sourceCheck는 원문과 일치하면 CONSISTENT, 원문과 명시적으로 충돌하면 CONTRADICTED, 원문만으로 판단할 수 없으면 UNDETERMINED다. 각 항목은 독립적으로 판정한다. 다른 항목의 정오나 학생 선택의 정오를 이유로 한 항목의 판정을 바꾸지 않는다.\n- 재구성 가능한 근거에서 내용 오류(errors)는 CONTRADICTED 주장에서만 만든다. CONTRADICTED 주장마다 그 quote를 studentEvidence로 가진 오류가 있어야 하고, 각 오류는 CONTRADICTED 주장 하나 이상에 대응한다. CONTRADICTED 주장이 없으면 contentAssessment는 ERROR가 아니다.\n- reconstructability가 UNKNOWN인 경우의 처리는 위 SELECTION 규칙을 따른다. 이때도 studentClaims는 기록한다.";

export const QUOTE_BLOCK = "## 학생 판단 서술 형식\nreason, reconstructedPath, errors의 description과 question, selectionMismatchQuestion에서 학생의 판단을 서술할 때는 학생 발화의 해당 부분을 큰따옴표로 정확히 인용해 쓰고, 해석본이나 평가자의 표현으로 바꾸어 쓰지 않는다. coaching에서 학생의 판단을 언급할 때도 같다.\n학생 발화와 원문의 관계는 학생 인용과 평가자 판단을 나누어 쓴다. 예: 학생은 \"…\"라고 했고, 이는 원문의 …와 양립한다(또는 어긋난다).\n학생이 말하지 않은 일반화·개념은 평가자 판단 부분에만 쓰고 학생이 말하거나 이해한 것으로 쓰지 않는다.\n이 규칙은 학생 판단을 서술하는 형식에만 적용한다. 의미상 동등한 학생 표현의 인정 기준과 판정 기준은 기존 지시를 따른다.";

export const GLOSS_BLOCK = "## 기호 해석본 입력\n입력 markerGloss가 있으면, 문항마다 미리 자동으로 생성하고 자동 검수한 기호 해석본이다. 학생 발화가 아니며 원문도 아니다. 사람이 확인하지 않았으므로 원문과 충돌하면 원문을 우선하고 그 사실을 reason에 적는다.\n칸의 뜻:\n- marker, location, markedText: 기호와 그 기호가 붙은 원문 위치·문자열\n- name: 기호가 표시한 표현\n- referentHere: 이 자리에서 그 표현이 가리키는 대상. 괄호 안의 \"그 범위에 드는 원문 속 사례\"는 그 대상의 일부인 원문 속 구체 개체이며 대상 전체가 아니다.\n- speaker: 그 표현을 쓴 사람\n- operator: 그 표현이 들어간 절에 걸린 장치와 원문 구절\n- sourceBasis: 해석의 근거가 된 원문 구절\n사용 규칙:\n- 판정기 전용 자료다. 교정 질문·코칭 등 학생에게 나가는 문장에 해석본 문구를 쓰지 않으며, 해석본의 대응 관계를 바꾸어 말해 드러내거나 학생이 아직 밝히지 않은 정답 관계를 질문의 전제로 넣지 않는다.\n- 원문은 수정하지 않고 이 해석본을 별도 입력으로 붙인다. 원문 근거(sourceEvidence)는 원문에서만 가져오고 해석본 문구를 원문처럼 인용하지 않는다.\n- 어긋남은 표현 차이·생략·추상화 정도의 차이가 아니라, 해석본의 핵심 지시 관계와 함께 성립할 수 없는 학생의 명시적 주장이다. 양립 가능한 읽기는 허용하고, 읽기가 불명확하면 오류로 확정하지 않는다.\n- 학생이 해석본의 모든 항목을 설명해야 하는 것은 아니다. 학생이 실제로 주장한 내용만 해석본과 대조하고, 해석본의 설명을 학생이 말한 것으로 보충하지 않는다.\n- 정답 선택과 근거의 정확성을 분리한다. 정답을 골랐어도 근거가 해석본과 어긋나면 근거 오류다.\n- 이름(name) 층위와 가리키는 대상(referentHere) 층위를 구분한다. 문장 전체의 뜻을 가리키는 대상 자리에 쓰지 않는다.\n적용 관계: 이 해석본은 위 지침의 \"사전에 가공한 명제, 선지 주장 … 없다\"는 자료 경계에 대한 예외로 추가된 입력이다. 학생 주장 분리 기록의 sourceCheck에서 원문 대조는 원문을 이 해석본의 기호 해석과 함께 읽어 판단한다는 뜻이다.";

export const ARMS = ['v5', 'v5_methods', 'v5_methods_gloss'];
export function instructionsFor(v5, arm) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm: ${arm}`);
  if (arm === 'v5') return v5;
  const methods = v5 + '\n\n' + CLAIM_BLOCK + '\n\n' + QUOTE_BLOCK;
  return arm === 'v5_methods' ? methods : methods + '\n\n' + GLOSS_BLOCK;
}
export function extendedSelectionSchema(base) {
  const schema = structuredClone(base);
  schema.properties.studentClaims = { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis']
      .map(k => [k, k === 'sourceCheck' ? { type: 'string', enum: ['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED'] } : { type: 'string' }])),
    required: ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'],
  } };
  schema.required = [...schema.required, 'studentClaims'];
  return schema;
}
const normalize = text => text.replace(/\s+/gu, ' ').trim();
const overlaps = (a, b) => a.observationId === b.observationId && normalize(a.quote) && normalize(b.quote)
  && (normalize(a.quote).includes(normalize(b.quote)) || normalize(b.quote).includes(normalize(a.quote)));
export function validateClaims(assessment, observations) {
  const fail = reason => { throw new Error(`CLAIMS_CONTRACT: ${reason}`); };
  const claims = assessment?.studentClaims;
  if (!Array.isArray(claims) || !claims.length) fail('studentClaims must be nonempty');
  const keys = ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'];
  for (const claim of claims) {
    if (!claim || Object.keys(claim).length !== keys.length || keys.some(k => typeof claim[k] !== 'string')
      || !['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED'].includes(claim.sourceCheck)) fail('invalid claim structure');
    const text = observations.find(o => o.observationId === claim.observationId)?.text;
    if (typeof text !== 'string' || !normalize(claim.quote) || !normalize(text).includes(normalize(claim.quote))) fail('quote not in observation');
  }
  if (assessment.reconstructability === 'RECONSTRUCTABLE') {
    const contradicted = claims.filter(c => c.sourceCheck === 'CONTRADICTED');
    const errors = assessment.errors;
    if (!Array.isArray(errors)) fail('errors must be an array');
    const matches = (error, claim) => Array.isArray(error?.studentEvidence)
      && error.studentEvidence.some(e => typeof e?.quote === 'string' && overlaps(e, claim));
    for (const claim of contradicted) if (!errors.some(e => matches(e, claim))) fail('CONTRADICTED claim has no error');
    for (const error of errors) if (!contradicted.some(c => matches(error, c))) fail('error has no CONTRADICTED claim');
    if (!contradicted.length && assessment.contentAssessment === 'ERROR') fail('ERROR without CONTRADICTED claim');
  }
  return claims;
}
export function assertJudgePayload(payload) {
  const forbidden = ['choiceReadings', 'answerKey', 'keyForcedOnly', 'instances'];
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.includes(key)) throw new Error(`Forbidden judgePayload key: ${key}`);
      visit(child);
    }
  };
  visit(payload);
}
export function transformRequest(request, { arm, baseline, instructions, selectionSchema, markerGloss }) {
  if (request.text?.format?.name !== 'problem_feedback_v4_assessment') return request;
  if (request.instructions !== baseline) throw new Error('RUN_LIMIT: unexpected baseline instructions');
  const outgoing = structuredClone(request);
  outgoing.instructions = instructions;
  if (arm !== 'v5' && request.text.format.schema.properties?.mode?.const === 'SELECTION') {
    outgoing.text.format.schema = extendedSelectionSchema(selectionSchema);
  }
  if (arm === 'v5_methods_gloss') {
    assertJudgePayload(markerGloss);
    const content = outgoing.input.flatMap(item => item.content ?? []);
    const first = content.find(item => item.type === 'input_text');
    if (!first) throw new Error('RUN_LIMIT: missing assessment input_text');
    first.text = JSON.stringify({ ...JSON.parse(first.text), markerGloss });
  }
  return outgoing;
}
export function glossVerbatimInStudentText(assessment, payload) {
  const texts = [...(assessment?.errors ?? []).map(e => e.question), assessment?.selectionMismatchQuestion, assessment?.coaching]
    .filter(t => typeof t === 'string');
  // 정확한 연속 문자열만 검사한다. 공백·인용 변형이나 의미상 누출은 별도 검토 대상이다.
  const strings = new Set();
  for (const marker of payload?.markers ?? []) {
    const chars = [...marker.referentHere];
    for (let start = 0; start <= chars.length - 6; start++) {
      for (const text of texts) {
        let end = start + 6;
        if (!text.includes(chars.slice(start, end).join(''))) continue;
        while (end < chars.length && text.includes(chars.slice(start, end + 1).join(''))) end++;
        strings.add(chars.slice(start, end).join(''));
      }
    }
  }
  const maximal = [...strings].filter(s => ![...strings].some(other => other !== s && other.includes(s))).sort();
  return { detected: maximal.length > 0, strings: maximal };
}
export function makeSchedule(types) {
  return [1, 2, 3].flatMap(r => [...types.slice(r - 1), ...types.slice(0, r - 1)].flatMap(type => {
    const offset = (r + types.indexOf(type)) % ARMS.length;
    return [...ARMS.slice(offset), ...ARMS.slice(0, offset)].map(arm => ({ r, type, arm }));
  }));
}
export function claimSelfCheck() {
  const observations = [{ observationId: 'o1', text: '대상이 서로 다르다' }];
  const claim = { observationId: 'o1', quote: '서로 다르다', claimAsStated: '서로 다르다', sourceCheck: 'CONSISTENT', sourceBasis: '원문' };
  const valid = { reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'SUPPORTED', errors: [], studentClaims: [claim] };
  validateClaims(valid, observations);
  const invalid = [
    { ...valid, studentClaims: [{ ...claim, quote: '없는 발화' }] },
    { ...valid, studentClaims: [{ ...claim, sourceCheck: 'CONTRADICTED' }] },
    { ...valid, errors: [{ studentEvidence: [{ observationId: 'o1', quote: claim.quote }] }] },
    { ...valid, contentAssessment: 'ERROR' },
  ];
  for (const a of invalid) {
    let rejected = false;
    try { validateClaims(a, observations); } catch (e) { if (!e.message.startsWith('CLAIMS_CONTRACT:')) throw e; rejected = true; }
    if (!rejected) throw new Error('Claim self-check accepted invalid example');
  }
}
