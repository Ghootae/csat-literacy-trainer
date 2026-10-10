import { instructionsFor as baseInstructions, extendedSelectionSchema, validateClaims, claimSelfCheck } from './v5-marker-judgment.mjs';

export const SUBST_BLOCK = "## 기호 대상 주장의 원문 대입 확인\nstudentClaims 가운데 학생이 원문에 표시된 기호가 무엇을 가리키는지 말한 주장에는, sourceCheck를 정하기 전에 substitution을 기록한다. 그 밖의 주장은 substitution을 null로 둔다.\n- substitutedText: 그 기호가 붙은 원문 문장을 그대로 옮기고, 기호가 표시한 표현 바로 뒤에 학생 표현을 괄호로 넣은 문장. 괄호 안에는 학생 발화의 해당 부분을 그대로 넣는다. 학생이 쓰지 않은 한정·강조(만, 오직, 모든, 전부 등)를 덧붙이거나 학생이 쓴 것을 빼지 않는다.\n- markedTextCheck: 학생 표현이 기호가 표시한 원문 표현이 직접 정하는 내용(속성·조건)과 충돌하지 않는가.\n- contextCheck: 대입한 문장이 그 문장 안에서뿐 아니라 앞뒤 발화·문단의 흐름과 함께 성립하는가.\n- distinctionCheck: 학생 표현으로 읽어도 선택한 선지가 따지는 대상 사이의 구별이 유지되는가.\n- 각 확인은 result(PASS, FAIL, UNCLEAR)와 근거(basis)를 가진다.\n판정 규칙:\n- 셋 중 하나라도 FAIL이면 sourceCheck는 CONTRADICTED다. FAIL은 원문에서 이유가 분명할 때만 쓴다.\n- FAIL이 없고 UNCLEAR가 하나라도 있으면 UNDETERMINED다. 이때 그 주장을 내용 오류로 만들지 않는다.\n- 모두 PASS이면 CONSISTENT다. 학생 표현이 원문·해설의 설명과 표현이나 층위(이름이 일반적으로 정하는 뜻과 이 자리에서 가리키는 대상)가 달라도, 세 확인을 통과하면 오류로 보지 않는다.";

export const ARMS = ['methods', 'methods_subst'];
export const CHECKS = ['markedTextCheck', 'contextCheck', 'distinctionCheck'];
export function instructionsFor(v5, arm) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm: ${arm}`);
  const methods = baseInstructions(v5, 'v5_methods');
  return arm === 'methods' ? methods : methods + '\n\n' + SUBST_BLOCK;
}
export function selectionSchemaFor(base, arm) {
  if (!ARMS.includes(arm)) throw new Error(`Unknown arm: ${arm}`);
  const schema = extendedSelectionSchema(base);
  if (arm === 'methods') return schema;
  const check = { type: 'object', additionalProperties: false, required: ['result', 'basis'],
    properties: { result: { type: 'string', enum: ['PASS', 'FAIL', 'UNCLEAR'] }, basis: { type: 'string' } } };
  const item = schema.properties.studentClaims.items;
  item.required.push('substitution');
  item.properties.substitution = { anyOf: [{ type: 'null' }, {
    type: 'object', additionalProperties: false, required: ['substitutedText', ...CHECKS],
    properties: { substitutedText: { type: 'string' }, ...Object.fromEntries(CHECKS.map(k => [k, structuredClone(check)])) },
  }] };
  return schema;
}
const normalize = text => text.replace(/\s+/gu, ' ').trim();
const sourceNormalize = text => normalize(text.replace(/[‘’“”'"]/gu, ''));
const fail = reason => { throw new Error(`CLAIMS_CONTRACT: ${reason}`); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
// Retain all balanced parenthesis candidates, including an outer pair with inner parentheses.
export function parentheticalSpans(text) {
  const stack = [], spans = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') stack.push(i);
    if (text[i] === ')' && stack.length) {
      const start = stack.pop();
      spans.push({ start, end: i + 1, text: text.slice(start + 1, i) });
    }
  }
  return spans;
}
export function faithfulSpans(claim, source) {
  const text = claim.substitution.substitutedText;
  return parentheticalSpans(text).filter(span => {
    const s = normalize(span.text);
    const removed = sourceNormalize(text.slice(0, span.start) + text.slice(span.end));
    return s && normalize(claim.quote).includes(s) && removed
      && [source.scenario, source.passage].some(original => typeof original === 'string' && sourceNormalize(original).includes(removed));
  });
}
export function validateSubstitutionClaims(assessment, observations, source) {
  // The five-key legacy contract sees a copy; unknown keys remain visible to it.
  const claims = assessment?.studentClaims;
  const plain = Array.isArray(claims) ? claims.map(claim => {
    if (!claim || typeof claim !== 'object') return claim;
    const { substitution: _, ...rest } = claim;
    return rest;
  }) : claims;
  validateClaims({ ...assessment, studentClaims: plain }, observations);
  for (const claim of claims) {
    if (!Object.hasOwn(claim, 'substitution')) fail('SUBSTITUTION_INVALID_STRUCTURE: missing substitution');
    const subst = claim.substitution;
    if (subst === null) continue;
    if (!exactKeys(subst, ['substitutedText', ...CHECKS]) || typeof subst.substitutedText !== 'string'
      || CHECKS.some(k => !exactKeys(subst[k], ['result', 'basis']) || typeof subst[k].basis !== 'string'
        || !['PASS', 'FAIL', 'UNCLEAR'].includes(subst[k].result))) fail('SUBSTITUTION_INVALID_STRUCTURE');
    const results = CHECKS.map(k => subst[k].result);
    const expected = results.includes('FAIL') ? 'CONTRADICTED' : results.includes('UNCLEAR') ? 'UNDETERMINED' : 'CONSISTENT';
    if (claim.sourceCheck !== expected) fail('SUBSTITUTION_SOURCE_CHECK_MISMATCH');
    if (!faithfulSpans(claim, source).length) fail('SUBSTITUTION_NOT_FAITHFUL');
  }
  return claims;
}
export function transformRequest(request, { arm, baseline, instructions, selectionSchema }) {
  if (request.text?.format?.name !== 'problem_feedback_v4_assessment') return request;
  if (request.instructions !== baseline) throw new Error('RUN_LIMIT: unexpected baseline instructions');
  const outgoing = structuredClone(request);
  outgoing.instructions = instructions;
  if (request.text.format.schema.properties?.mode?.const === 'SELECTION') {
    outgoing.text.format.schema = selectionSchemaFor(selectionSchema, arm);
  }
  return outgoing;
}
export function makeSchedule(types) {
  return [1, 2, 3].flatMap(r => [...types.slice(r - 1), ...types.slice(0, r - 1)].flatMap(type => {
    const offset = (r + types.indexOf(type)) % ARMS.length;
    return [...ARMS.slice(offset), ...ARMS.slice(0, offset)].map(arm => ({ r, type, arm }));
  }));
}
export function substitutionDistribution(claims) {
  const distribution = Object.fromEntries(CHECKS.map(k => [k, { PASS: 0, FAIL: 0, UNCLEAR: 0 }]));
  for (const claim of claims ?? []) for (const k of CHECKS) {
    const result = claim?.substitution?.[k]?.result;
    if (Object.hasOwn(distribution[k], result)) distribution[k][result]++;
  }
  return distribution;
}
export function substitutionSelfCheck(source) {
  claimSelfCheck();
  const quote = '옷장에 있는 옷';
  const observations = [{ observationId: 'o1', text: quote }];
  const claim = { observationId: 'o1', quote, claimAsStated: quote, sourceCheck: 'CONSISTENT', sourceBasis: '원문',
    substitution: { substitutedText: 'ⓓ옷(옷장에 있는 옷)이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.',
      ...Object.fromEntries(CHECKS.map(k => [k, { result: 'PASS', basis: '원문' }])) } };
  const valid = { reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'SUPPORTED', errors: [], studentClaims: [claim] };
  validateSubstitutionClaims(valid, observations, source);
  for (const change of [
    a => { a.studentClaims[0].substitution.substitutedText = claim.substitution.substitutedText.replace('(옷장에 있는 옷)', '(옷장에 있는 옷만)'); },
    a => { a.studentClaims[0].substitution.substitutedText += '원문에 없는 문장'; },
    a => { a.studentClaims[0].substitution.contextCheck.result = 'FAIL'; },
    a => {
      a.studentClaims[0].substitution.contextCheck.result = 'UNCLEAR'; a.studentClaims[0].sourceCheck = 'CONTRADICTED';
      a.contentAssessment = 'ERROR'; a.errors = [{ studentEvidence: [{ observationId: 'o1', quote }] }];
    },
  ]) {
    const a = structuredClone(valid); change(a);
    let rejected = false;
    try { validateSubstitutionClaims(a, observations, source); }
    catch (e) { if (!e.message.startsWith('CLAIMS_CONTRACT: SUBSTITUTION_')) throw e; rejected = true; }
    if (!rejected) throw new Error('Substitution self-check accepted invalid example');
  }
}
export function expectedChecks(actual, expected, status) {
  const allowed = expected.contentAssessment;
  const content = allowed.includes(actual.contentAssessment) ? actual.contentAssessment : allowed[0];
  const branch = expected.byContentAssessment?.[content] ?? {
    phase: content === 'SUPPORTED' ? 'COMPLETED' : 'AWAITING_CORRECTION', outcome: content === 'SUPPORTED' ? 'VERIFIED_CORRECT' : null,
  };
  const target = { ...expected, ...branch };
  return Object.fromEntries(Object.keys(actual).map(key => [key, status === 'VALID'
    && (Array.isArray(target[key]) ? target[key].includes(actual[key]) : actual[key] === target[key])]));
}
export function summarizeRows(rows, cases, source) {
  const groupSummary = group => ({ cells: group.length, valid: group.filter(x => x.status === 'VALID').length,
    expectedMatches: group.filter(x => x.expectedMatch).length,
    fieldMatches: Object.fromEntries(['reconstructability', 'rationaleImpliedVerdict', 'contentAssessment', 'phase', 'outcome']
      .map(key => [key, group.filter(x => x.checks[key]).length])) });
  const boundary = new Set(cases.filter(c => c.boundary).map(c => c.type));
  const substRows = rows.filter(x => x.arm === 'methods_subst');
  // Identify the inserted expression by the last source marker before its parenthesis.
  // This is literal reporting only; error-unit correctness remains a semantic review.
  const rate = (type, pattern) => {
    const candidates = substRows.filter(x => x.type === type && x.status === 'VALID').flatMap(x => x.studentClaims ?? [])
      .filter(c => c.substitution).map(c => ({ claim: c, spans: faithfulSpans(c, source)
        .filter(s => /ⓓ[^ⓐ-ⓩ]*$/u.test(c.substitution.substitutedText.slice(0, s.start))) }))
      .filter(c => c.spans.length);
    const numerator = candidates.filter(c => c.spans.some(s => pattern.test(s.text))).length;
    return { numerator, denominator: candidates.length, ratio: candidates.length ? numerator / candidates.length : null };
  };
  return {
    byArm: Object.fromEntries(ARMS.map(arm => {
      const group = rows.filter(x => x.arm === arm);
      return [arm, { nonBoundary: groupSummary(group.filter(x => !boundary.has(x.type))),
        boundary: groupSummary(group.filter(x => boundary.has(x.type))),
        byResponse: Object.fromEntries(cases.map(c => [c.type, { boundary: !!c.boundary, ...groupSummary(group.filter(x => x.type === c.type)) }])) }];
    })),
    substitutionResultsByResponse: Object.fromEntries(cases.map(c => [c.type,
      substitutionDistribution(substRows.filter(x => x.type === c.type && x.status === 'VALID').flatMap(x => x.studentClaims ?? []))])),
    x2DOnlyRate: rate('X2', /만/u), s5DAddedRestrictionRate: rate('S5', /만|오직/u),
    markerIdentification: '최종 VALID 칸에서 충실한 삽입 괄호 직전의 마지막 원문 기호가 ⓓ인 주장을 분모로 집계한다. 의미상 오류 위치는 별도 검토한다.',
    substitutionContractFailures: rows.reduce((n, r) => n + r.claimAttempts.filter(a => a.error?.startsWith('CLAIMS_CONTRACT: SUBSTITUTION_')).length, 0),
    substitutionContractRetries: rows.reduce((n, r) => n + r.claimAttempts.filter((a, i, all) => i > 0 && all[i - 1].error?.startsWith('CLAIMS_CONTRACT: SUBSTITUTION_')).length, 0),
  };
}
