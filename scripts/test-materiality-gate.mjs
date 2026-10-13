import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { MaterialityGateExperiment, materialityInstructions } from '../packages/pipeline/dist/dialogue-experiment/materiality-gate-experiment.js';
import { loadCentralStoryGatePrompt } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { hashFilterValue } from '../packages/pipeline/dist/dialogue-experiment/axis-core-filter.js';
const root = 'docs/experiments/single-call-materiality-2026-09-20';
const phase = process.argv.find(s => s.startsWith('--phase='))?.slice(8) ?? 'prepare';
if (!['prepare', 'run', 'report'].includes(phase)) throw new Error('Unsupported phase');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (f, v) => writeFileSync(`${root}/${f}`, JSON.stringify(v, null, 2) + '\n');
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const oldPath = 'docs/experiments/axis-function-filter-six-2026-09-20/cases.json';
const old = read(oldPath);
const goldSources = read('docs/experiments/axis-function-filter-six-2026-09-20/sources.json');
const ids = Object.keys(goldSources);
const cases = ids.map(id => {
  const c = old.find(c => c.paragraphId === id && c.kind === 'sufficient');
  const actual = id === ids[0] ? old.find(c => c.kind === 'natural-followup') : c;
  return { ...actual, id: `${id}--sufficient`, kind: 'sufficient', expectedAxes: Object.fromEntries(goldSources[id].gold.centralAxes.map(a => [a.id, ['PASS']])),
    expectationNote: '중심 설명이 충분한 응답. 부수 수식·원문 전용 설명 누락만으로 미완료/자동 개입하지 않음.' };
});
const core = [
  ['명실 문제는 정치·윤리에서 독립적인 철학 주제가 되었다. 이 시기에 공손룡과 후기 묵가가 있었다.', 'AX2'],
  ['mRNA 주입→바이러스 단백질 합성→면역. 접종 자체 감염 위험은 없음. 나머지는 mRNA의 분해·세포 흡수 문제와 지질 나노 입자에 관한 내용.', 'AX2'],
  ['장학 재단은 비영리, 자산에 법인격. 이사회가 행위를 대신하지만 주요 결정과 기본 재산 변경은 기관 허가 필요. 그 밖의 자산을 어떻게 운용하는지는 모르겠다.', 'AX3'],
  ['외부 도파민, 뇌 속 도파민성 뉴런. 티로신→레보도파→도파민으로 합성되어 뉴런 사이 신호 전달에 쓰임.', 'AX1'],
  ['생성형 AI 허위·과장 광고 때문에 정보 비대칭이 커진다. 정부가 어떻게 대응했고 무엇을 두고 논쟁하는지는 모르겠다.', 'AX1'],
  ['예술·종교·철학은 같은 진리를 다루는 절대정신. 인식 방식은 각각 직관·표상·사유. 예술의 객관성과 종교의 주관성이 나오는데, 철학과 어떻게 연결되는지는 모르겠다.', 'AX2'],
];
ids.forEach((id, i) => cases.push({ id: `${id}--core-gap`, paragraphId: id, kind: 'core-gap', initial: core[i][0], history: [],
  source: 'agent-authored prospective synthetic', targetAxis: core[i][1], expectedAxes: { [core[i][1]]: ['UNCLEAR_SERIOUS'] },
  expectationNote: '다른 내용과 별개로 대상 축의 중심 역할·연결이 미확인. 명시적 오류로 만들지 말고 중요한 공백으로 인식.' }));
for (const i of [0, 1, 2, 5]) {
  const c = old.find(c => c.paragraphId === ids[i] && c.kind === 'error');
  const axis = ['AX2', 'AX1', 'AX2', '', '', 'AX2'][i];
  cases.push({ ...c, expectedAxes: { [axis]: ['ERROR'] }, targetAxis: axis, expectationNote: '실제 명시적 오류는 누락 심사로 완화하지 않음.' });
}
for (const i of [0, 1, 2, 3]) {
  const c = old.find(c => c.paragraphId === ids[i] && c.kind === 'minor');
  const axis = ['AX1', 'AX1', 'AX3', 'AX2'][i];
  cases.push({ ...c, id: `${ids[i]}--boundary`, kind: 'boundary', targetAxis: axis, expectedAxes: {},
    expectationNote: ['변화 출발점 누락은 경계. AX2 논쟁을 말한 근거는 별도 인정.', '감염 위험 회피 누락. 작동 및 전달 설명은 존재.',
      '대상 자산·목적 제약을 말했으나 제한적으로라는 표현 없음.', '티로신→도파민과 전달은 말했으나 레보도파 중간 단계 없음.'][i] + ' 단일 정답 상태를 동결하지 않으며 변화 방향만 보고.' });
}
assert.equal(cases.length, 20);
const sources = Object.fromEntries(ids.map(id => {
  const p = goldSources[id].path; const gold = read(p); assert.deepEqual(gold, goldSources[id].gold);
  return [id, { path: p, fileHash: sha(readFileSync(p)), gold }];
}));
const pdir = 'packages/pipeline/experiments/dialogue/';
const common = loadCentralStoryGatePrompt('v4') + '\n\n' + readFileSync(pdir + 'current-claims-recording-v1.md', 'utf8').trim() + '\n\n' + readFileSync(pdir + 'error-claims-recording-v1.md', 'utf8').trim();
const instructions = Object.fromEntries(['baseline', 'candidate'].map(arm => [arm, materialityInstructions(common, arm)]));
const protectedPaths = ['gate', 'schema', 'claim-recording', 'error-recording', 'materiality-gate-experiment', 'axis-core-filter'].flatMap(f => [
  `packages/pipeline/src/dialogue-experiment/${f}.ts`, `packages/pipeline/dist/dialogue-experiment/${f}.js`,
]).concat([oldPath, 'scripts/test-materiality-gate.mjs', ...['central-story-gate-prompt-v4.md', 'current-claims-recording-v1.md', 'error-claims-recording-v1.md', 'axis-missing-materiality-prompt-v1.md'].map(f => pdir + f)]);
const fingerprint = { casesHash: sha(JSON.stringify(cases)), sourceHash: sha(JSON.stringify(sources)),
  instructionHashes: Object.fromEntries(Object.entries(instructions).map(([arm, t]) => [arm, sha(t)])),
  protectedHashes: Object.fromEntries(protectedPaths.map(p => [p, sha(readFileSync(p))])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  if (phase !== 'prepare') throw new Error('Prepare first');
  write('cases.json', cases); write('sources.json', sources);
  for (const [arm, t] of Object.entries(instructions)) writeFileSync(`${root}/${arm}-instructions.md`, t + '\n');
  write('manifest.json', { preparedAt: new Date().toISOString(), ...fingerprint, model: 'gpt-5.6-terra', effort: 'medium', serviceTier: 'default',
    cases: 20, repeats: 1, maxPhysicalCalls: 40, maxEstimatedUsd: 2, maxOutputTokens: 4000,
    retries: 0, feedbackCalls: 0, expectedAuthority: 'agent-authored; user approved experiment, not each expected label',
    counts: { sufficient: 6, coreGap: 6, error: 4, boundary: 4 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricesPerMillion: { input: 2, cachedInput: .2, cacheWrite: 2.5, output: 12 },
    authorization: 'User approved single-call candidate implementation and testing. Local USD2 cap; no production promotion.',
  });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) assert.deepEqual(v, manifest[k], `Frozen ${k} changed`);
if (phase === 'prepare') { console.log(JSON.stringify({ cases: 20, expectedCalls: 40, cap: 2, instructionHashes: manifest.instructionHashes })); process.exit(0); }

function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
  const unknown = qs.filter(q => rs.find(r => r.index === q.index)?.estimatedCostUsd == null);
  const known = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0), reserve = unknown.reduce((n, q) => n + q.reserveUsd, 0);
  const state = (r, axis) => r?.result?.axisFeedback.find(a => a.axisId === axis)?.status ?? null;
  const asks = r => r?.result ? r.result.axisFeedback.some(a => ['UNCLEAR_SERIOUS', 'ERROR'].includes(a.status)) : null;
  const median = ns => ns.length ? [...ns].sort((a, b) => a - b)[Math.floor(ns.length / 2)] : null;
  const arms = Object.fromEntries(['baseline', 'candidate'].map(arm => {
    const valid = results.filter(r => r.arm === arm && r.result);
    const by = k => valid.filter(r => r.kind === k);
    return [arm, { valid: valid.length, failures: results.filter(r => r.arm === arm && !r.result).length,
      sufficient: { valid: by('sufficient').length, fullPass: by('sufficient').filter(r => r.result.status === 'CAPTURED').length,
        incomplete: by('sufficient').filter(r => r.result.status !== 'CAPTURED').length, automaticInterventionCandidates: by('sufficient').filter(asks).length },
      coreGap: { valid: by('core-gap').length, targetSerious: by('core-gap').filter(r => state(r, r.targetAxis) === 'UNCLEAR_SERIOUS').length,
        targetPass: by('core-gap').filter(r => state(r, r.targetAxis) === 'PASS').length,
        targetNoIntervention: by('core-gap').filter(r => ['PASS', 'UNCLEAR_OK'].includes(state(r, r.targetAxis))).length },
      errors: { valid: by('error').length, targetError: by('error').filter(r => state(r, r.targetAxis) === 'ERROR').length },
      medianApiDurationMs: median(rs.filter(r => r.arm === arm && r.durationMs != null).map(r => r.durationMs)),
      meanOutputTokens: rs.filter(r => r.arm === arm && r.response?.usage).reduce((n, r) => n + r.response.usage.output_tokens, 0) / Math.max(1, rs.filter(r => r.arm === arm && r.response?.usage).length),
    }];
  }));
  const pairs = cases.map(c => ({ id: c.id, kind: c.kind, ...Object.fromEntries(['baseline', 'candidate'].map(arm => {
    const r = results.find(r => r.caseId === c.id && r.arm === arm);
    return [arm, r?.result ? { status: r.result.status, axes: r.result.axisFeedback, questionIntent: r.result.questionIntent, automaticInterventionCandidate: asks(r) } : { error: r?.error ?? 'not run' }];
  })) }));
  write('summary.json', { calls: qs.length, knownEstimatedUsd: known, unknownCostCalls: unknown.length, reservedUnknownUsd: reserve, localAccountedUsd: known + reserve, arms, pairs });
  let doc = '# 같은 응답: V4 vs 단일 호출 누락 중요도 후보\n\n기대값은 에이전트 작성. 질문 생성은 호출하지 않았으며 자동 개입 여부는 출력 상태로 추정한 후보 여부다.\n\n';
  for (const id of ids) {
    doc += `## ${id}\n\n원문: ${sources[id].gold.paragraphText}\n\n`;
    for (const a of sources[id].gold.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
    for (const c of cases.filter(c => c.paragraphId === id)) {
      doc += `\n### ${c.kind}\n\n응답: ${c.initial}\n\n출처: ${c.source}\n\n기대: ${JSON.stringify(c.expectedAxes)} — ${c.expectationNote}\n\n`;
      for (const h of c.history) doc += `앞선 질문: ${h.question.text}\n\n후속 응답: ${h.answer}\n\n`;
      for (const arm of ['baseline', 'candidate']) {
        const r = results.find(r => r.caseId === c.id && r.arm === arm);
        doc += `#### ${arm}\n\n`;
        if (!r?.result) { doc += `${r?.error ?? '미실행'}\n\n`; continue; }
        doc += `전체: ${r.result.status}\n\n합성 응답: ${r.result.effectiveResponse}\n\n판정 요약: ${r.result.decisionSummary}\n\n`;
        for (const a of r.result.axisFeedback) doc += `- ${a.axisId} ${a.status}: ${a.reason}\n  - 공개: ${a.revealedText ?? '없음'}\n`;
        doc += `\n질문 의도(실제 질문 아님): ${r.result.questionIntent ?? '없음'}\n\n`;
      }
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc);
  console.log(JSON.stringify({ calls: qs.length, knownEstimatedUsd: known, unknownCostCalls: unknown.length, localAccountedUsd: known + reserve, arms }));
}
if (phase === 'report') { report(); process.exit(0); }
if (!process.argv.includes('--approved-live')) throw new Error('Live approval flag required');
if (!process.env.OPENAI_API_KEY) throw new Error('API key unavailable');
const lockPath = `${root}/live.lock`; const lock = openSync(lockPath, 'wx'); closeSync(lock);
const api = new OpenAI({ maxRetries: 0 });
const priorQ = rows('requests.jsonl'), priorR = rows('responses.jsonl');
let calls = priorQ.length, accounted = priorQ.reduce((n, q) => n + (priorR.find(r => r.index === q.index)?.estimatedCostUsd ?? q.reserveUsd), 0);
function client(tag) {
  return { responses: { parse: async (request, options) => {
    assert.equal(request.instructions, instructions[tag.arm]);
    const req = { ...request, service_tier: 'default' }, bytes = Buffer.byteLength(JSON.stringify(req));
    assert.equal(req.model, manifest.model); assert.equal(req.max_output_tokens, 4000); assert.equal(req.store, false); assert.ok(bytes < 100_000);
    const reserveUsd = ((bytes + 4000) * 2.5 + 4000 * 12) / 1e6;
    if (calls >= 40 || accounted + reserveUsd > 2) throw new Error('LOCAL_BUDGET_STOP');
    const index = ++calls; accounted += reserveUsd; const started = performance.now();
    append('requests.jsonl', { index, ...tag, at: new Date().toISOString(), reserveUsd, request: req });
    let response;
    try { response = await api.responses.create(req, options); }
    catch (e) { append('responses.jsonl', { index, ...tag, durationMs: Math.round(performance.now() - started), estimatedCostUsd: null, error: String(e) }); throw e; }
    const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0, writes = u?.input_tokens_details?.cache_write_tokens ?? 0;
    const cost = u ? (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * .2 + writes * 2.5 + u.output_tokens * 12) / 1e6 : null;
    if (cost !== null) accounted += cost - reserveUsd;
    append('responses.jsonl', { index, ...tag, durationMs: Math.round(performance.now() - started), estimatedCostUsd: cost, response });
    return { ...response, output_parsed: response.status === 'completed' && response.output_text ? JSON.parse(response.output_text) : null };
  } } };
}
try {
  const jobs = cases.flatMap((c, i) => (i % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']).map(arm => ({ c, arm, id: `${c.id}--${arm}` })))
    .filter(j => !priorQ.some(q => q.id === j.id) && !rows('results.jsonl').some(r => r.id === j.id));
  let cursor = 0;
  await Promise.all([0, 1].map(async () => {
    while (cursor < jobs.length) {
      const { c, arm, id } = jobs[cursor++]; const gold = sources[c.paragraphId].gold;
      const input = { gold, goldVersion: 'original-gold-v2', goldHash: hashFilterValue(gold), initialResponse: c.initial, history: c.history,
        turn: c.history.length + 1, questionsAsked: c.history.length, maxQuestions: 3 };
      try {
        const out = await new MaterialityGateExperiment({ arm, client: client({ id, caseId: c.id, arm }) }).evaluate(input);
        append('results.jsonl', { ...c, id, caseId: c.id, arm, input, ...out });
        console.log(JSON.stringify({ id, axes: out.result.axisFeedback.map(a => a.status), calls, accounted }));
      } catch (e) { append('results.jsonl', { ...c, id, caseId: c.id, arm, input, error: String(e) }); console.log(JSON.stringify({ id, error: String(e) })); }
    }
  }));
} finally { unlinkSync(lockPath); report(); }
