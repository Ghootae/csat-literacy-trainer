import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { OpenAIAxisRelationDecomposer } from '../packages/pipeline/dist/dialogue-experiment/axis-relation-decomposition.js';

const root = 'docs/experiments/axis-relation-decomposition-2026-09-20';
const phase = process.argv.find(s => s.startsWith('--phase='))?.slice(8) ?? 'prepare';
if (!['prepare', 'run', 'report'].includes(phase)) throw new Error('Unsupported phase');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (f, v) => writeFileSync(`${root}/${f}`, JSON.stringify(v, null, 2) + '\n');
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const sourcePath = 'docs/experiments/axis-meaning-filter-only-2026-09-20/fixtures.json';
const expectations = [
  'AX1 변화의 정치·윤리 출발점과 독립 철학 도착점을 하나의 transition으로 보존. AX2 명실 문제 논쟁, 전문적으로 다룸, 대표성을 분리. 정립된이라는 수식도 삭제하지 않음.',
  'AX1 유전 정보 이용, 바이러스 단백질 합성, 면역 반응 유도, 감염 위험 회피를 모두 보존. 바이러스 자체가 아니어서라는 원인 추가 금지. 병렬 서술을 새로운 인과로 바꾸지 않음. AX2 분해/흡수 한계, 보호/세포 전달 및 문제 해결 목적 보존.',
  '비영리·자산 법인격, 이사회 대행과 통제의 대조, 주요 사항/기본 재산 변경의 허가, 기본 재산 외 자산/목적 사업 재원/제한적 허용을 보존. 수익 활동 전체에 허가 의무를 새로 부여하지 않음.',
  '외부 유입 기능 불가와 뇌내 합성만 신경 전달이라는 대조·한정 보존. 티로신→레보도파→도파민 경로와 산물의 뉴런간 전달 보존. 이번에는 필터가 아니므로 레보도파도 삭제 불가. 장벽·수용체 추가 금지.',
  '생성형 AI 기반 허위·과장 광고→정보 비대칭, 사용 여부 표시 의무화, 적용 확대/정부 개입 범위 논쟁과 정책 흐름 보존. 원문에만 있는 의무 주체 추가 금지.',
  '절대정신 세 형태, 같은 절대 진리/다른 인식 형식, 예술·종교·철학과 직관·표상·사유의 대응 보존. 예술의 객관성/종교의 주관성과 철학적 종합의 귀속·관계 유지.',
  '대표 권한 유무와 전체/개인 구속 범위의 대조 보존. 실제 법률 지식 추가 금지.',
  '점검 중이 아님 AND 80도 초과, 때만이라는 필요조건을 보존. 초과를 이상으로 바꾸거나 충분조건을 추가하지 않음.',
  '온도 상승 감지→냉각 작동→과열 방지, 마지막 냉각 대응이라는 요약 관계도 보존. 삭제하지 않되 중복임을 기록할 수 있음.',
  '덮개의 차광 관계만 추출. 원문은 미입력이고 빛 흡수·내부 입자 인과를 추가하면 실패.',
];
const sources = read(sourcePath);
assert.equal(sources.length, expectations.length);
const fixtures = sources.map((f, i) => ({ id: f.id, kind: f.kind, sourcePath: f.path,
  input: { paragraphId: `bundle-${String(i + 1).padStart(2, '0')}`, centralAxes: f.gold.centralAxes.map(({ id, description }) => ({ id, description })) },
  expectation: expectations[i],
}));
const protectedPaths = ['packages/pipeline/experiments/dialogue/axis-relation-decomposition-prompt-v1.md',
  'packages/pipeline/src/dialogue-experiment/axis-relation-decomposition.ts',
  'packages/pipeline/dist/dialogue-experiment/axis-relation-decomposition.js',
  'packages/pipeline/src/dialogue-experiment/axis-core-filter.ts',
  'packages/pipeline/dist/dialogue-experiment/axis-core-filter.js',
  'scripts/test-axis-relation-decomposition.mjs', sourcePath];
const fingerprint = { fixturesHash: sha(JSON.stringify(fixtures)), protectedHashes: Object.fromEntries(protectedPaths.map(p => [p, sha(readFileSync(p))])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  if (phase !== 'prepare') throw new Error('Prepare first');
  write('fixtures.json', fixtures);
  write('manifest.json', { preparedAt: new Date().toISOString(), ...fingerprint, model: 'gpt-5.6-terra', effort: 'medium',
    serviceTier: 'default', maxOutputTokens: 6500, maxPhysicalCalls: 10, maxEstimatedUsd: 1,
    repeats: 1, paragraphCount: 10, axisCount: 16, studentEvaluationCalls: 0, filterCalls: 0,
    expectationAuthority: 'agent-authored before execution; semantic audit, not independent human gold',
    pricesPerMillion: { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricingCheckedOn: '2026-09-20',
    authorization: 'User approved axis-only relation extraction, 10 calls, USD1 local cap; no operational schema migration.',
  });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) assert.deepEqual(v, manifest[k], `Frozen ${k} changed`);
if (phase === 'prepare') { console.log(JSON.stringify({ phase, paragraphs: fixtures.length, capUsd: 1, hash: manifest.fixturesHash })); process.exit(0); }

function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
  const unknown = qs.filter(q => rs.find(r => r.index === q.index)?.estimatedCostUsd == null);
  const known = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const reserve = unknown.reduce((n, r) => n + r.reserveUsd, 0);
  for (const q of qs) {
    const input = JSON.parse(q.request.input);
    assert.deepEqual(input, fixtures.find(f => f.id === q.id).input);
    assert.deepEqual(Object.keys(input).sort(), ['centralAxes', 'paragraphId']);
    assert.equal(q.request.text.format.name, 'axis_relation_decomposition');
  }
  const prior = read('docs/experiments/axis-meaning-filter-only-2026-09-20/manifest.json');
  for (const [p, h] of Object.entries(prior.protectedHashes)) assert.equal(sha(readFileSync(p)), h, `Previous experiment changed: ${p}`);
  for (const f of sources.filter(f => f.path)) assert.deepEqual(read(f.path), f.gold);
  const summary = { calls: qs.length, validExtractions: results.filter(r => r.result).length, failures: results.filter(r => !r.result).length,
    studentEvaluationCalls: 0, filterCalls: 0, knownEstimatedUsd: known, unknownCostCalls: unknown.length,
    reservedUnknownUsd: reserve, localAccountedUsd: known + reserve, frozenHashesMatch: true, originalGoldUnchanged: 6 };
  write('summary.json', summary);
  let doc = '# 軸 관계 추출: 입력과 원출력\n\n원문·중심 대상·학생 응답 미입력. 삭제·필터·중요도 판정 없음. 문법적 modifiers는 중요도 분류가 아니다.\n\n';
  for (const f of fixtures) {
    const r = results.find(r => r.id === f.id);
    doc += `## ${f.id}\n\n자료: ${f.kind}\n\n사전 기대(모델 미전송): ${f.expectation}\n\n`;
    for (const a of f.input.centralAxes) {
      doc += `### ${a.id}\n\n입력: ${a.description}\n\n`;
      const out = r?.result?.axes.find(x => x.axisId === a.id);
      if (!out) { doc += `실패/미실행: ${r?.error ?? '미실행'}\n\n`; continue; }
      for (const e of out.relations) {
        doc += `- **${e.relationId}**: ${e.statement}\n  - 주체: ${e.subjects.join(', ')} / 대상: ${e.objects.join(', ') || '없음'} / 방향: ${e.direction}\n`;
        if (e.transition) doc += `  - 변화: ${e.transition.from} → ${e.transition.to}\n`;
        for (const c of e.conditions) doc += `  - 조건: ${c.text} (근거: ${c.basisQuote})\n`;
        for (const m of e.modifiers) doc += `  - 수식: ${m.text} (근거: ${m.basisQuote})\n`;
        doc += `  - 축 근거: ${e.evidenceQuotes.join(' / ')}\n`;
      }
      for (const u of out.unresolved) doc += `\n해석 보류: ${u.quote} — ${u.issue}\n`;
      doc += '\n';
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc);
  console.log(JSON.stringify(summary));
}
if (phase === 'report') { report(); process.exit(0); }
if (!process.argv.includes('--approved-live')) throw new Error('Live approval flag required');
if (!process.env.OPENAI_API_KEY) throw new Error('API key unavailable');
const lockPath = `${root}/live.lock`; const lock = openSync(lockPath, 'wx'); closeSync(lock);
const api = new OpenAI({ maxRetries: 0 });
const priorQ = rows('requests.jsonl'), priorR = rows('responses.jsonl');
let calls = priorQ.length;
let accounted = priorQ.reduce((n, q) => n + (priorR.find(r => r.index === q.index)?.estimatedCostUsd ?? q.reserveUsd), 0);
function client(id) {
  return { responses: { parse: async (request, options) => {
    const bytes = Buffer.byteLength(JSON.stringify(request));
    assert.equal(request.model, manifest.model); assert.equal(request.max_output_tokens, manifest.maxOutputTokens);
    assert.equal(request.store, false); assert.ok(bytes < 100_000);
    const reserveUsd = ((bytes + 4000) * 2.5 + request.max_output_tokens * 12) / 1e6;
    if (calls >= 10 || accounted + reserveUsd > 1) throw new Error('LOCAL_BUDGET_STOP');
    const index = ++calls; accounted += reserveUsd;
    append('requests.jsonl', { index, id, at: new Date().toISOString(), reserveUsd, request });
    let response;
    try { response = await api.responses.create(request, options); }
    catch (e) { append('responses.jsonl', { index, id, estimatedCostUsd: null, error: String(e) }); throw e; }
    const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0, writes = u?.input_tokens_details?.cache_write_tokens ?? 0;
    const estimatedCostUsd = u ? (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * 0.2 + writes * 2.5 + u.output_tokens * 12) / 1e6 : null;
    if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reserveUsd;
    // Record provider output and usage BEFORE JSON parsing or domain validation can fail.
    append('responses.jsonl', { index, id, at: new Date().toISOString(), estimatedCostUsd, response });
    return { ...response, output_parsed: response.status === 'completed' && response.output_text ? JSON.parse(response.output_text) : null };
  } } };
}
try {
  const jobs = fixtures.filter(f => !priorQ.some(q => q.id === f.id) && !rows('results.jsonl').some(r => r.id === f.id));
  let cursor = 0;
  await Promise.all([0, 1].map(async () => {
    while (cursor < jobs.length) {
      const f = jobs[cursor++];
      try {
        const out = await new OpenAIAxisRelationDecomposer({ client: client(f.id) }).extract(f.input);
        append('results.jsonl', { id: f.id, ...out });
        console.log(JSON.stringify({ id: f.id, relations: out.result.axes.map(a => a.relations.length), accounted }));
      } catch (e) { append('results.jsonl', { id: f.id, error: String(e) }); console.log(JSON.stringify({ id: f.id, error: String(e) })); }
    }
  }));
} finally { unlinkSync(lockPath); report(); }
