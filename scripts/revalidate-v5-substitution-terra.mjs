// terra 원문 대입 시험의 하네스 결함(대입 문장의 기호 문자 ⓓ·ⓔ 누락을 불충실로 거부)을 바로잡아 저장된 원출력을 다시 검사한다. API 호출 없음.
// 사전 규칙: methods_subst 칸마다 저장된 ASSESSMENT 출력을 순서대로 보고, 고친 대입 계약과 운영 검증을 모두 통과하는 첫 출력을 쓴다.
// 고친 점 1: 괄호를 뺀 대입 문장과 원문을 비교할 때 기호 문자(ⓐ-ⓩ, ㉠-㉻)도 지운다. 고친 점 2는 faithfulFixed 주석. 나머지 계약은 그대로다.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  feedbackObservationText } from '../packages/pipeline/dist/index.js';
import { validateClaims } from './lib/v5-marker-judgment.mjs';
import { parentheticalSpans, CHECKS } from './lib/v5-substitution-check.mjs';

const DIR = 'docs/experiments/v5-substitution-check-gongsun-2026-10-07';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const product = read(`${FIX}/public/gongsun-long-later-mohists-q12.json`);
const source = SourceDirectProblemBundleSchema.parse({ ...read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json'),
  passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
const cases = read(`${DIR}/cases.json`);
const caseList = Array.isArray(cases) ? cases : cases.cases;

const normalize = t => t.replace(/\s+/gu, ' ').trim();
const sourceNormalizeFixed = t => normalize(t.replace(/[‘’“”'"]/gu, '').replace(/[ⓐ-ⓩ㉠-㉻]/gu, ''));
// 고친 점 2: 한 주장이 두 기호의 대상을 함께 말하면 대입 문장에 괄호가 두 개 생긴다. 학생 quote의 부분 문자열인 괄호를 모두 지우고 비교한다.
function faithfulFixed(claim) {
  const text = claim.substitution.substitutedText;
  const spans = parentheticalSpans(text).filter(span => normalize(span.text) && normalize(claim.quote).includes(normalize(span.text)));
  if (!spans.length) return false;
  let removed = text;
  for (const span of [...spans].sort((x, y) => y.start - x.start)) removed = removed.slice(0, span.start) + removed.slice(span.end);
  removed = sourceNormalizeFixed(removed);
  return !!removed && [source.scenario, source.passage].some(o => sourceNormalizeFixed(o).includes(removed));
}
function contractFixed(parsed, observations) {
  const claims = parsed.studentClaims;
  validateClaims({ ...parsed, studentClaims: claims.map(({ substitution: _s, ...c }) => c) }, observations);
  for (const c of claims) {
    if (!Object.hasOwn(c, 'substitution')) throw new Error('missing substitution');
    if (c.substitution === null) continue;
    const results = CHECKS.map(k => c.substitution[k].result);
    const expected = results.includes('FAIL') ? 'CONTRADICTED' : results.includes('UNCLEAR') ? 'UNDETERMINED' : 'CONSISTENT';
    if (c.sourceCheck !== expected) throw new Error('SUBSTITUTION_SOURCE_CHECK_MISMATCH');
    if (!faithfulFixed(c)) throw new Error('SUBSTITUTION_NOT_FAITHFUL');
  }
}

const rows = [];
for (const f of readdirSync(DIR).filter(f => /^methods_subst-[SX]\d-r\d\.json$/.test(f)).sort()) {
  const cell = read(`${DIR}/${f}`);
  const c = caseList.find(x => x.type === cell.type);
  const fresh = () => submitFeedbackCommand(createFeedbackSession(f, source),
    { type: 'SELECT', choiceId: c.choiceId ?? 'C4', rationale: { mode: 'PROVIDED', text: c.text } }, 'o1');
  const session = fresh();
  const observations = session.observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) }));
  const attempts = cell.rawOutputs.filter(x => x.kind === 'ASSESSMENT');
  let chosen = null; const tried = [];
  for (const [i, a] of attempts.entries()) {
    try {
      const parsed = JSON.parse(a.response.output_text);
      contractFixed(parsed, observations);
      const { studentClaims, ...assessment } = parsed;
      if (assessment.rationaleImpliedVerdict !== 'INVALID') throw new Error('AUDIT_WOULD_RUN: offline cannot reproduce conclusion audit');
      const after = applyFeedbackAssessment(fresh(), assessment);
      chosen = { attempt: i + 1, assessment, studentClaims, after }; tried.push({ attempt: i + 1, ok: true }); break;
    } catch (e) { tried.push({ attempt: i + 1, ok: false, error: String(e.message ?? e).slice(0, 200) }); }
  }
  const allowed = c.expected.contentAssessment;
  const content = chosen?.assessment.contentAssessment ?? null;
  rows.push({ cell: f.replace('.json', ''), type: cell.type, replicate: cell.replicate, boundary: !!c.boundary,
    original: { status: cell.status, contentAssessment: cell.actual.contentAssessment, expectedMatch: cell.expectedMatch },
    revalidated: chosen ? { attemptUsed: chosen.attempt, contentAssessment: content, phase: chosen.after.phase,
      outcome: chosen.after.result?.outcome ?? null, expectedMatch: allowed.includes(content)
        && chosen.after.phase === (content === 'SUPPORTED' ? 'COMPLETED' : 'AWAITING_CORRECTION'),
      errors: chosen.after.errors.map(e => ({ description: e.description, question: e.question })),
      studentClaims: chosen.studentClaims } : null,
    tried });
}
const changed = rows.filter(r => r.original.status !== 'VALID' || r.revalidated?.attemptUsed !== (r.original.status === 'VALID' ? undefined : null));
const summary = {
  note: '하네스 결함 두 가지(기호 문자 누락 거부, 한 문장 두 괄호 거부)를 고친 오프라인 재검사. 다른 계약은 같다. API 호출 0. 재시도 출력은 첫 출력이 고친 계약에서도 실패할 때만 쓴다.',
  cells: rows.length,
  originalEvaluationErrors: rows.filter(r => r.original.status !== 'VALID').length,
  recovered: rows.filter(r => r.original.status !== 'VALID' && r.revalidated).length,
  stillFailing: rows.filter(r => !r.revalidated).map(r => ({ cell: r.cell, tried: r.tried })),
  firstAttemptUsed: rows.filter(r => r.revalidated?.attemptUsed === 1).length,
  expectedMatchNonBoundary: `${rows.filter(r => !r.boundary && r.revalidated?.expectedMatch).length}/${rows.filter(r => !r.boundary).length}`,
  byResponse: Object.fromEntries([...new Set(rows.map(r => r.type))].sort().map(t => [t, rows.filter(r => r.type === t)
    .sort((a, b) => a.replicate - b.replicate).map(r => r.revalidated ? `${r.revalidated.contentAssessment}(a${r.revalidated.attemptUsed})` : 'FAIL')])),
  rows,
};
writeFileSync(`${DIR}/REVALIDATION-fixed-marker-normalization.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, rows: undefined, changedCount: changed.length }, null, 1));
