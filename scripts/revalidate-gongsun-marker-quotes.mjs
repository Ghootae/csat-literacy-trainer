// 공손룡 해석 방식 시험(2026-10-03)의 보존 원출력 20개를 새 인용 검사로 다시 검사한다.
// 모델 API를 호출하지 않으며 원 실험 파일을 수정하지 않는다. 결과는 새 디렉터리에만 쓴다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { locateQuote, validateClauseQuote } from './lib/marker-quote-validation.mjs';

const SRC = 'docs/experiments/gongsun-interpretation-modes-2026-10-03';
const OUT = 'docs/experiments/gongsun-marker-quote-revalidation-2026-10-06';
const source = JSON.parse(readFileSync(`${SRC}/source.json`, 'utf8'));
// 제품 textSources(source-direct-evaluator.ts)와 같은 출처 구분.
const sources = {
  PASSAGE: source.passage, STEM: source.stem, SCENARIO: source.scenario,
  CHOICE: source.choices.map((c) => c.text).join('\n'), OFFICIAL_EXPLANATION: source.officialExplanation,
};
// 기존 검사: clauseQuote는 validateMap의 완전 부분문자열, 증거 인용은 제품의 공백·인용부호 정규화(태그 미제거).
const IGNORABLE = /[\s"'‘’“”]/u;
const productRecovers = (text, quote) => {
  const norm = (s) => Array.from(s).filter((c) => !IGNORABLE.test(c)).join('');
  const q = norm(quote), t = norm(text), i = t.indexOf(q);
  return q.length >= 8 && i >= 0 && t.indexOf(q, i + 1) < 0;
};

const ends = [`${SRC}/requests.jsonl`, `${SRC}/recovered/requests.jsonl`]
  .flatMap((p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => ({ ledger: p, ...JSON.parse(l) })))
  .filter((x) => x.event === 'END');

const checks = [];
for (const end of ends) {
  const output = JSON.parse(end.outputText);
  for (const row of output.markerInterpretations ?? []) {
    const text = row.location === 'PASSAGE' ? source.passage : source.scenario;
    const result = validateClauseQuote(source, row);
    checks.push({ requestId: end.id, label: end.label, field: `clauseQuote:${row.marker}`,
      oldPass: text.includes(row.clauseQuote), newPass: result.ok, newReason: result.ok ? null : result.reason,
      span: result.ok ? [result.start, result.end] : null });
  }
  const evaluation = output.evaluation ?? output;
  for (const [i, ev] of (evaluation.sourceEvidence ?? []).entries()) {
    if (ev.kind !== 'TEXT') continue;
    const text = sources[ev.source];
    const result = locateQuote(text, ev.quote);
    checks.push({ requestId: end.id, label: end.label, field: `sourceEvidence[${i}]:${ev.source}`,
      oldPass: text.includes(ev.quote) || productRecovers(text, ev.quote), newPass: result.ok,
      newReason: result.ok ? null : result.reason, span: result.ok ? [result.start, result.end] : null });
  }
}

const count = (f) => checks.filter(f).length;
const failedOutputs = (key) => [...new Set(checks.filter((c) => !c[key]).map((c) => c.label))];
const report = {
  purpose: '시험용 삽입 태그 때문에 생긴 인용 계약 실패를 의미 실패와 분리하기 위한 재검사. API 호출 0.',
  checkedOutputs: ends.length,
  checkedQuotes: checks.length,
  oldCheck: { pass: count((c) => c.oldPass), fail: count((c) => !c.oldPass), failedOutputs: failedOutputs('oldPass') },
  newCheck: { pass: count((c) => c.newPass), fail: count((c) => !c.newPass), failedOutputs: failedOutputs('newPass') },
  newlyRejected: checks.filter((c) => c.oldPass && !c.newPass),
  limits: [
    '새 검사는 인용 위치와 기호 구간 포함만 확인한다. 해석·귀속의 의미 정확성은 확인하지 않는다.',
    '제품 평가기 recoverExactSourceQuote는 태그를 제거하지 않는다. 태그 삽입 원문을 쓰는 실험에서는 제품 경로의 sourceEvidence 검사가 여전히 실패할 수 있다.',
  ],
  checks,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/REPORT.json`, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ checkedOutputs: report.checkedOutputs, checkedQuotes: report.checkedQuotes,
  oldCheck: report.oldCheck, newCheck: report.newCheck, newlyRejected: report.newlyRejected.length }, null, 2));
