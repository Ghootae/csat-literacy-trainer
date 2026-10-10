// v5-substitution-check.mjs의 대입 계약 하네스 결함 두 가지를 고친 판(terra 실행에서 발견, 2026-10-07).
// 1) 괄호를 뺀 대입 문장과 원문을 비교할 때 기호 문자(ⓐ-ⓩ, ㉠-㉻)도 지운다(판정기가 기호 문자를 빠뜨려도 대입 충실도와 무관).
// 2) 한 주장이 두 기호의 대상을 함께 말해 괄호가 여러 개면, 학생 quote의 부분 문자열인 괄호를 모두 지우고 비교한다.
// 나머지 계약(판정 규칙 일치, 괄호 안은 학생 quote의 부분 문자열, 기존 주장 계약)은 그대로다.
export * from './v5-substitution-check.mjs';
import { parentheticalSpans, CHECKS } from './v5-substitution-check.mjs';
import { validateClaims } from './v5-marker-judgment.mjs';

const normalize = text => text.replace(/\s+/gu, ' ').trim();
const sourceNormalize = text => normalize(text.replace(/[‘’“”'"]/gu, '').replace(/[ⓐ-ⓩ㉠-㉻]/gu, ''));
const fail = reason => { throw new Error(`CLAIMS_CONTRACT: ${reason}`); };
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));

export function faithfulSpans(claim, source) {
  const text = claim.substitution.substitutedText;
  const spans = parentheticalSpans(text).filter(span => normalize(span.text) && normalize(claim.quote).includes(normalize(span.text)));
  if (!spans.length) return [];
  let removed = text;
  for (const span of [...spans].sort((x, y) => y.start - x.start)) removed = removed.slice(0, span.start) + removed.slice(span.end);
  removed = sourceNormalize(removed);
  return removed && [source.scenario, source.passage].some(o => typeof o === 'string' && sourceNormalize(o).includes(removed)) ? spans : [];
}
export function validateSubstitutionClaims(assessment, observations, source) {
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
