import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'docs/experiments/single-call-materiality-2026-09-20';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const rows = f => readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').map(JSON.parse);
const sha = v => createHash('sha256').update(v).digest('hex');
const m = read(`${root}/manifest.json`), cases = read(`${root}/cases.json`), sources = read(`${root}/sources.json`);
const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
assert.equal(sha(JSON.stringify(cases)), m.casesHash); assert.equal(sha(JSON.stringify(sources)), m.sourceHash);
for (const [p, h] of Object.entries(m.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
assert.equal(qs.length, 40); assert.equal(rs.length, 40); assert.equal(results.length, 40);
assert.equal(new Set(qs.map(q => q.id)).size, 40);
const differences = [], normalizations = [], failures = [];
let rawDoc = '# V4와 단일 호출 후보: 검증 전 원출력\n\n정확 인용·상태 검증 실패도 제외하지 않고 원출력을 보존한다. 기대값은 에이전트 작성이며 학생 효과를 평가한 자료가 아니다.\n\n';
for (const c of cases) {
  const pairQ = ['baseline', 'candidate'].map(arm => qs.find(q => q.caseId === c.id && q.arm === arm));
  assert.equal(pairQ[0].request.input, pairQ[1].request.input);
  const strip = q => { const { instructions, ...rest } = q.request; return rest; };
  assert.deepEqual(strip(pairQ[0]), strip(pairQ[1]));
  rawDoc += `## ${c.id}\n\n응답: ${c.initial}\n\n`;
  for (const h of c.history) rawDoc += `고정 질문: ${h.question.text}\n\n고정 후속 답: ${h.answer}\n\n`;
  for (const q of pairQ) {
    assert.equal(sha(q.request.instructions), m.instructionHashes[q.arm]);
    assert.equal(q.request.store, false); assert.equal(q.request.text.format.name, 'central_story_gate_result');
    const r = rs.find(r => r.id === q.id), result = results.find(r => r.id === q.id);
    const raw = r.response?.output_text ? JSON.parse(r.response.output_text) : null;
    if (result.result) {
      assert.deepEqual(raw, result.call.decisionAudit.rawResult);
      assert.equal(result.call.attempts.length, 1);
      if (result.call.decisionAudit.normalizationEvents.length) normalizations.push({ id: q.id, events: result.call.decisionAudit.normalizationEvents });
      if (JSON.stringify(raw?.axisFeedback) !== JSON.stringify(result.result.axisFeedback)) differences.push(q.id);
    } else failures.push({ id: q.id, error: result.error, rawStatus: raw?.status, rawAxes: raw?.axisFeedback });
    rawDoc += `### ${q.arm}\n\n검증: ${result.result ? '계약 통과' : result.error}\n\n`;
    rawDoc += '```json\n' + JSON.stringify(raw ?? { error: r.error }, null, 2) + '\n```\n\n';
  }
}
for (const s of Object.values(sources)) assert.equal(sha(readFileSync(s.path)), s.fileHash);
const prior = read('docs/experiments/axis-function-filter-six-2026-09-20/manifest.json');
for (const [p, h] of Object.entries(prior.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
const cost = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
const unknown = qs.filter(q => rs.find(r => r.id === q.id)?.estimatedCostUsd == null);
const accounted = cost + unknown.reduce((n, q) => n + q.reserveUsd, 0);
assert.ok(accounted <= 2);
const audit = { checkedAt: new Date().toISOString(), calls: 40, uniqueCases: 20, pairedInputsAndSchemasIdentical: true,
  onlyInstructionsDiffer: true, frozenHashesMatch: true, originalGoldFilesUnchanged: 6,
  priorProtectedFilesUnchanged: Object.keys(prior.protectedHashes).length, feedbackCalls: 0, retries: 0,
  knownEstimatedUsd: cost, unknownCostCalls: unknown.length, localAccountedUsd: accounted,
  axisFeedbackChangedByValidation: differences, normalizations, failures };
writeFileSync(`${root}/execution-audit.json`, JSON.stringify(audit, null, 2) + '\n');
writeFileSync(`${root}/RAW-OUTPUTS.md`, rawDoc);
console.log(JSON.stringify(audit));
