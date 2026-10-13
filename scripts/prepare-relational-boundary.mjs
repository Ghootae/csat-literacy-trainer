// Offline only. Creates frozen request bodies; never constructs an API client.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { boundaryPayload, buildBoundaryRequest, RELATIONAL_BOUNDARY_VERSION,
  OLD_RELATION_RULE, NEW_RELATION_RULE, OLD_PASS_RULE, NEW_PASS_RULE,
} from '../packages/pipeline/dist/dialogue-experiment/relational-boundary-experiment.js';

const root = 'docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20';
const priorRoot = 'docs/experiments/axis-direct-judgment-v1-2026-09-20';
const pairPath = 'packages/pipeline/experiments/dialogue/relational-boundary-pairs-v1.json';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const serialize = v => JSON.stringify(v, null, 2) + '\n';
const prior = read(`${priorRoot}/manifest.json`);
const originalSources = read(`${priorRoot}/sources.json`);
const pairs = read(pairPath);
assert.equal(pairs.length, 10); assert.equal(new Set(pairs.map(p => p.id)).size, 10);
assert.equal(pairs[0].insufficient, read(`${priorRoot}/cases.json`).find(c => c.id === 'dopamine-motor-control-p1--core-gap').initial);
for (const [path, hash] of Object.entries(prior.protectedHashes)) {
  assert.equal(sha(readFileSync(path)), hash, `Prior experiment changed: ${path}`);
}
const sourceIds = [...new Set(pairs.flatMap(p => p.sourceParagraphId ? [p.sourceParagraphId] : []))];
const sources = Object.fromEntries(sourceIds.map(id => [id, originalSources[id]]));
for (const s of Object.values(sources)) assert.equal(sha(readFileSync(s.path)), s.fileHash);
const cases = pairs.flatMap(pair => ['insufficient', 'sufficient'].map(side => {
  const payload = boundaryPayload(pair, side, sources);
  return {
    id: `${pair.id}-${side}`, pairId: pair.id, category: pair.category, side, targetAxisId: pair.targetAxisId,
    anchor: pair.anchor ?? null, sourceParagraphId: pair.sourceParagraphId ?? null, payload,
    expectedAxes: Object.fromEntries(payload.centralAxes.map(a => [a.id,
      side === 'insufficient' && a.id === pair.targetAxisId ? ['UNCLEAR_OK', 'UNCLEAR_SERIOUS'] : ['PASS']])),
    expectationNote: pair.note,
  };
}));
const templates = cases.flatMap(c => ['v1', 'candidate'].map(arm => ({
  caseId: c.id, arm, request: { ...buildBoundaryRequest(c.payload, arm), service_tier: 'default' },
})));
for (const c of cases) {
  const [a, b] = templates.filter(t => t.caseId === c.id).map(t => t.request);
  const strip = ({ instructions, ...rest }) => rest;
  assert.deepEqual(strip(a), strip(b));
  assert.equal(sha(a.instructions), prior.instructionHashes.direct);
}
const jobs = [];
for (let repeat = 1; repeat <= 3; repeat++) {
  const offset = (repeat - 1) * 7;
  const ordered = [...cases.slice(offset), ...cases.slice(0, offset)];
  ordered.forEach((c, i) => {
    for (const arm of (i + repeat) % 2 ? ['v1', 'candidate'] : ['candidate', 'v1']) {
      jobs.push({ id: `${c.id}--${arm}--r${repeat}`, caseId: c.id, arm, repeat });
    }
  });
}
assert.equal(jobs.length, 120); assert.equal(new Set(jobs.map(j => j.id)).size, 120);
const base = templates.find(t => t.arm === 'v1').request.instructions;
const candidate = templates.find(t => t.arm === 'candidate').request.instructions;
let review = '# 핵심 관계 누락 대조군: 원문·중심축·두 응답\n\n상태: 실행 전 동결. 학생 응답과 사전 기대는 사용자 예시를 바탕으로 에이전트가 작성했으며 독립 사람 정답표가 아니다. 실모델 결과는 아직 없다.\n\n불충분 답은 대상 축 OK 또는 SERIOUS, 충분 답은 모든 축 PASS가 사전 기대다. 오류 응답을 만든 시험이 아니므로 ERROR는 별도 오진 후보로 기록한다.\n\n';
for (const pair of pairs) {
  const payload = boundaryPayload(pair, 'insufficient', sources);
  review += `## ${pair.id} — ${pair.category}\n\n출처: ${pair.sourceParagraphId ?? '합성 통제 문단(운영 골드 아님)'} / 대상: ${pair.targetAxisId}\n\n### 원문\n\n${payload.paragraphText}\n\n### 중심축\n\n`;
  for (const a of payload.centralAxes) review += `- ${a.id}: ${a.description}\n`;
  review += `\n### 관계 누락 응답\n\n> ${pair.insufficient}\n\n### 관계 표현 응답\n\n> ${pair.sufficient}\n\n검토 취지: ${pair.note}\n\n`;
}
const artifacts = {
  'pairs.json': serialize(pairs), 'cases.json': serialize(cases), 'sources.json': serialize(sources),
  'jobs.json': serialize(jobs), 'request-templates.json': serialize(templates),
  'v1-instructions.md': base + '\n', 'candidate-instructions.md': candidate + '\n', 'FIXTURES.md': review,
  'PROMPT-CHANGE.md': '# 지시 변경 전문\n\n두 문단 교체만 실시. 입력 JSON·출력 스키마·추론 설정 동일.\n\n## 관계 보충 금지\n\n기존:\n\n' + OLD_RELATION_RULE + '\n\n후보:\n\n' + NEW_RELATION_RULE + '\n\n## 충분 응답의 부수적 수식 생략\n\n기존:\n\n' + OLD_PASS_RULE + '\n\n후보:\n\n' + NEW_PASS_RULE + '\n',
};
const ownPaths = [pairPath, 'scripts/prepare-relational-boundary.mjs',
  'packages/pipeline/src/dialogue-experiment/relational-boundary-experiment.ts',
  'packages/pipeline/src/dialogue-experiment/relational-boundary-experiment.test.ts',
  'packages/pipeline/dist/dialogue-experiment/relational-boundary-experiment.js', `${root}/PLAN.md`];
const fingerprint = {
  protectedHashes: { ...prior.protectedHashes, ...Object.fromEntries(ownPaths.map(p => [p, sha(readFileSync(p))])) },
  artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([p, v]) => [p, sha(v)])),
  instructionHashes: { v1: sha(base), candidate: sha(candidate) },
};
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  for (const [p, content] of Object.entries(artifacts)) {
    assert.ok(!existsSync(`${root}/${p}`), `Refusing to overwrite ${p}`);
    writeFileSync(`${root}/${p}`, content, { flag: 'wx' });
  }
  writeFileSync(`${root}/manifest.json`, serialize({ version: RELATIONAL_BOUNDARY_VERSION,
    preparedAt: new Date().toISOString(), status: 'FROZEN_NOT_RUN_AWAITING_PAID_APPROVAL', ...fingerprint,
    pairs: 10, responses: 20, realSourceParagraphs: sourceIds.length, syntheticPairs: pairs.filter(p => p.synthetic).length,
    model: 'gpt-5.6-terra', effort: 'medium', serviceTier: 'default', maxOutputTokens: 4000,
    repeats: 3, maxPhysicalCalls: 120, proposedLocalUsdCap: 1, retries: 0, feedbackCalls: 0,
    pricesPerMillion: { input: 2, cachedInput: .2, cacheWrite: 2.5, output: 12 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricingCheckedDate: '2026-09-20',
    expectationAuthority: 'Agent-authored from user examples; not an independent human gold standard.',
    authorization: 'Design/preparation only. New paid execution and proposed USD1 cap await explicit approval.',
    comparison: 'Same model/input/schema; only two instruction passages differ. Production V4 unchanged.',
  }), { flag: 'wx' });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) assert.deepEqual(manifest[k], v, `Frozen ${k} changed`);
for (const [p, hash] of Object.entries(manifest.artifactHashes)) assert.equal(sha(readFileSync(`${root}/${p}`)), hash, p);
console.log(JSON.stringify({ status: manifest.status, pairs: pairs.length, cases: cases.length,
  plannedCalls: jobs.length, protectedFiles: Object.keys(fingerprint.protectedHashes).length,
  originalGoldFiles: sourceIds.length, onlyInstructionsDiffer: true, artifactHashesVerified: true,
  paidCallsMadeByThisScript: 0, proposedLocalUsdCap: manifest.proposedLocalUsdCap }, null, 2));
