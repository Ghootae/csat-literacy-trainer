import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAIAxisMeaningFilter } from '../packages/pipeline/dist/dialogue-experiment/axis-meaning-filter.js';
import { ParagraphDiagnosticGoldSchema } from '../packages/pipeline/dist/dialogue-experiment/schema.js';

const root = 'docs/experiments/axis-meaning-filter-only-2026-09-20';
const phase = process.argv.find(s => s.startsWith('--phase='))?.slice(8) ?? 'prepare';
if (!['prepare', 'run', 'report'].includes(phase)) throw new Error('Invalid phase; student evaluation is not supported');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (f, v) => writeFileSync(`${root}/${f}`, JSON.stringify(v, null, 2) + '\n');
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const base = 'packages/pipeline/fixtures/experiments/dialogue/gold-v2';
const originals = [
  ['gongsun-long-later-mohists-p1', '정치·윤리→독립 철학의 변화와 두 주체의 명실 논쟁은 유지. 전문적·대표적·정립된을 별도 필수 요구로 남기지 않음.'],
  ['mrna-vaccine-lipid-nanoparticle-p2', '유전 정보→단백질·면역 및 감염 위험 회피, 분해·흡수 한계→보호·전달 유지. 바이러스 자체가 아니라는 원인은 추가 금지.'],
  ['corporate-law-p2', '비영리·자산 법인격, 이사회 역할·허가 통제, 기본 재산 외/목적 사업 재원이라는 수익 활동 범위 유지.'],
  ['dopamine-motor-control-p1', '외부 도파민과 뇌내 합성의 기능 대조, 합성→신호 전달 유지. 레보도파 중간 단계의 필수 여부는 사전 경계 사례로 분리하여 성공률에 포함하지 않음.'],
  ['information-asymmetry-free-marketplace-p2', '허위·과장 광고→정보 비대칭→표시 의무 및 적용 확대 논쟁의 정책 연결 유지. 원문에만 있는 대상 명칭을 추가 필수화하지 않음.'],
  ['hegel-aesthetics-absolute-spirit-p1', '동일 진리/다른 인식 형식 및 예술·종교·철학과 직관·표상·사유 대응, 객관·주관의 철학적 종합 유지. 각각의 상세 정의를 추가하지 않음.'],
];
const fixtures = originals.map(([id, expectation]) => ({ id, kind: 'existing', path: `${base}/${id}.json`, expectation,
  gold: ParagraphDiagnosticGoldSchema.parse(read(`${base}/${id}.json`)) }));
function synthetic(id, centralObject, paragraphText, description, expectation) {
  fixtures.push({ id, kind: 'synthetic-contrast', path: null, expectation, gold: ParagraphDiagnosticGoldSchema.parse({
    paragraphId: id, paragraphText, centralObject, centralStory: description,
    centralAxes: [{ id: 'AX1', description, relationIds: ['MR1'] }],
    coreRelations: [{ id: 'MR1', description }],
  }) });
}
synthetic('contrast-representative', '대리인의 행동이 다른 사람에게 미치는 효력의 구별',
  '이 가상 제도에서는 대표 권한을 부여받은 사람의 합의만 구성원 전체를 구속한다. 대표 권한이 없는 참여자의 합의는 그 개인만 구속한다.',
  '대표 권한이 있는 참여자의 합의는 구성원 전체를 구속하지만 대표 권한이 없는 참여자의 합의는 개인만 구속한다.',
  '대표 권한의 유무와 전체/개인의 구속 범위 대조를 required로 보존. 대표라는 수식어를 기계적으로 삭제하면 실패.');
synthetic('contrast-condition', '가상 장치의 작동 조건과 예외',
  '이 장치는 온도가 80도를 넘을 때만 작동한다. 단, 점검 중에는 그 온도에서도 작동하지 않는다.',
  '장치는 점검 중이 아니고 온도가 80도를 넘을 때만 작동한다.',
  '점검 제외·80도 초과·때만이라는 제한을 모두 보존. 초과를 이상으로 바꾸지 않음.');
synthetic('contrast-joint-omission', '냉각 장치의 과열 방지 과정',
  '센서는 온도가 올라가면 이를 감지하여 냉각기를 작동시킨다. 냉각은 과열을 막는다. 즉 온도 상승에 냉각으로 대응하는 것이다.',
  '온도 상승을 감지하면 냉각기가 작동해 과열을 막으며, 이는 온도 상승에 대한 냉각 대응이다.',
  '중복 요약절은 덜어낼 수 있으나 최종 축에 상승 감지→냉각 작동→과열 방지 연결을 유지. 공동 삭제로 소재 목록만 남으면 실패.');
synthetic('contrast-source-cause', '가상 덮개의 차광 기능',
  '이 가상 덮개는 내부 입자가 빛을 흡수하기 때문에 빛의 통과를 막는다.',
  '덮개는 빛의 통과를 막는다.',
  '차광 기능 유지. 축에 없는 내부 입자·흡수 원인은 semanticUnits나 최종 축에 추가하지 않음.');

const protectedPaths = ['axis-meaning-filter.ts', 'axis-function-filter.ts', 'axis-core-filter.ts', 'schema.ts'].flatMap(f => [
  `packages/pipeline/src/dialogue-experiment/${f}`, `packages/pipeline/dist/dialogue-experiment/${f.replace('.ts', '.js')}`,
]).concat(['scripts/test-axis-meaning-filter.mjs', 'packages/pipeline/experiments/dialogue/axis-meaning-filter-prompt-v1.md']);
const fingerprint = { fixturesHash: sha(JSON.stringify(fixtures)), protectedHashes: Object.fromEntries(protectedPaths.map(p => [p, sha(readFileSync(p))])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  if (phase !== 'prepare') throw new Error('Prepare first');
  write('fixtures.json', fixtures);
  write('manifest.json', { preparedAt: new Date().toISOString(), ...fingerprint, model: 'gpt-5.6-terra', effort: 'medium',
    serviceTier: 'default', maxOutputTokens: 6500, maxPhysicalCalls: fixtures.length, maxEstimatedUsd: 2,
    repeats: 1, paragraphCount: fixtures.length, axisCount: fixtures.reduce((n, f) => n + f.gold.centralAxes.length, 0),
    studentEvaluationCalls: 0, expectationAuthority: 'agent-authored before execution; not independent human gold',
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricingCheckedOn: '2026-09-20',
    pricesPerMillion: { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 },
    authorization: 'User approved revised second filter implementation and filter-only paid trial. No operational promotion.',
  });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) if (JSON.stringify(v) !== JSON.stringify(manifest[k])) throw new Error(`Frozen ${k} changed`);
if (phase === 'prepare') { console.log(JSON.stringify(manifest)); process.exit(0); }

function report() {
  const requests = rows('requests.jsonl'), responses = rows('responses.jsonl'), results = rows('results.jsonl');
  const unknown = requests.filter(q => responses.find(r => r.index === q.index)?.estimatedCostUsd == null);
  const known = responses.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const reserve = unknown.reduce((n, r) => n + r.reserveUsd, 0);
  const summary = { calls: requests.length, validFilters: results.filter(r => r.result).length, failures: results.filter(r => !r.result).length,
    studentEvaluationCalls: 0, knownEstimatedUsd: known, unknownCostCalls: unknown.length, reservedUnknownUsd: reserve, localAccountedUsd: known + reserve };
  write('summary.json', summary);
  let doc = '# 최소 충분 의미 필터: 원문·원래 축·필터 출력\n\n학생 평가 호출 없음. 사전 기대는 에이전트 작성이며 독립 정답표가 아니다. 자기 점검은 검증 결과가 아니다.\n\n';
  for (const f of fixtures) {
    const r = results.find(r => r.id === f.id);
    doc += `## ${f.id}\n\n자료: ${f.kind}\n\n원문: ${f.gold.paragraphText}\n\n중심 대상: ${f.gold.centralObject}\n\n사전 기대: ${f.expectation}\n\n`;
    if (!r?.result) { doc += `실패 또는 미실행: ${r?.error ?? '미실행'}\n\n`; continue; }
    for (const a of r.result.axes) {
      doc += `### ${a.axisId}\n\n원본: ${a.originalDescription}\n\n필터: ${a.filteredDescription}\n\n기여: ${a.axisContribution}\n\n`;
      for (const u of a.semanticUnits) doc += `- ${u.unitId} **${u.status}**: ${u.meaning}\n  - 축 근거: ${u.basisQuote}\n  - 생략 영향: ${u.omissionImpact}\n`;
      doc += `\n공동 삭제 점검(모델 보고): ${a.jointOmissionCheck}\n\n범위 점검(모델 보고): ${a.scopeCheck}\n\n`;
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc);
  console.log(JSON.stringify(summary));
}
if (phase === 'report') { report(); process.exit(0); }
if (!process.argv.includes('--approved-live')) throw new Error('Explicit live flag required');
if (!process.env.OPENAI_API_KEY) throw new Error('API key unavailable');
const lockPath = `${root}/live.lock`; const lock = openSync(lockPath, 'wx'); closeSync(lock);
const api = new OpenAI({ maxRetries: 0 });
const priorRequests = rows('requests.jsonl'), priorResponses = rows('responses.jsonl');
let calls = priorRequests.length;
let accounted = priorRequests.reduce((n, q) => n + (priorResponses.find(r => r.index === q.index)?.estimatedCostUsd ?? q.reserveUsd), 0);
function client(id) {
  return { responses: { parse: async (request, options) => {
    const bytes = Buffer.byteLength(JSON.stringify(request));
    if (request.model !== manifest.model || request.max_output_tokens !== manifest.maxOutputTokens || request.store !== false || bytes > 100_000) throw new Error('Request contract violation');
    const reserveUsd = ((bytes + 4000) * 2.5 + request.max_output_tokens * 12) / 1e6;
    if (calls >= manifest.maxPhysicalCalls || accounted + reserveUsd > manifest.maxEstimatedUsd) throw new Error('LOCAL_BUDGET_STOP');
    const index = ++calls; accounted += reserveUsd;
    append('requests.jsonl', { index, id, at: new Date().toISOString(), reserveUsd, request });
    try {
      const response = await api.responses.parse(request, options);
      const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0, writes = u?.input_tokens_details?.cache_write_tokens ?? 0;
      const estimatedCostUsd = u ? (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * 0.2 + writes * 2.5 + u.output_tokens * 12) / 1e6 : null;
      if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reserveUsd;
      append('responses.jsonl', { index, id, at: new Date().toISOString(), estimatedCostUsd, response });
      return response;
    } catch (e) { append('responses.jsonl', { index, id, error: String(e), estimatedCostUsd: null }); throw e; }
  } } };
}
try {
  // Never silently replay attempted cases after a crash or semantic/contract failure.
  const jobs = fixtures.filter(f => !priorRequests.some(q => q.id === f.id) && !rows('results.jsonl').some(r => r.id === f.id));
  let cursor = 0;
  await Promise.all([0, 1].map(async () => {
    while (cursor < jobs.length) {
      const f = jobs[cursor++];
      try {
        const out = await new OpenAIAxisMeaningFilter({ client: client(f.id) }).filter(f.gold);
        append('results.jsonl', { id: f.id, ...out });
        console.log(JSON.stringify({ id: f.id, axes: out.result.axes.map(a => a.filteredDescription), accounted }));
      } catch (e) { append('results.jsonl', { id: f.id, error: String(e) }); console.log(JSON.stringify({ id: f.id, error: String(e) })); }
    }
  }));
} finally { unlinkSync(lockPath); report(); }
