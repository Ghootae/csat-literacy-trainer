// 기호 해석본 자동 파이프라인(중간안·의미 자동 검수) 1단계 검증. 공손룡 12번.
// A. 검수 레이어 검증: 정답이 정해진 해석본(정상·자연 오류·심은 오류)을 독립 재도출 3개와 각각 대조해 잡아내는지 본다.
// B. 고정 짝 2개 × 3회. C. 파이프라인 3회(문항당 최대 3회차).
// 사람 승인 해석본은 파이프라인 입력에 넣지 않는다. A의 채점용 기준과 심은 오류의 원본으로만 쓴다.
// prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import assert from 'node:assert/strict';
import { z } from 'zod/v4';
import { createContext, runPipeline, judgePayload, MAX_ROUNDS, GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION,
  GENERATION_SCHEMA, REDERIVATION_SCHEMA, COMPARISON_SCHEMA, comparisonProblems, markerAgrees } from './lib/marker-gloss-pipeline-v2.mjs';

const DIR = 'docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07';
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const QID = 'gongsun-long-later-mohists-q12';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const hash = (x) => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });

const source = read(`${FIX}/public/${QID}.json`);
const keyFile = read(`${FIX}/${QID}.json`);
const answerKey = { answerChoiceId: keyFile.answerChoiceId, stemPolarity: keyFile.stemPolarity };
const officialExplanation = read('docs/experiments/gongsun-gloss-arms-2026-10-06/source.json').officialExplanation;
const ctx = createContext({ source, answerKey, officialExplanation, questionId: QID });

// ---- A. 검수 레이어 시험 자료 ----
const approved = read(`${FIX}/marker-glosses/${QID}.json`);
const view = (markers) => markers.map((m) => ({ marker: m.marker, referentHere: m.referentHere, speaker: m.speaker, instances: [] }));
const C0 = view(approved.markers);
const mutate = (changes) => C0.map((m) => ({ ...m, ...changes[m.marker] }));
const R = (m) => C0.find((x) => x.marker === m).referentHere;
const instances = (...texts) => texts.map((text) => ({ text }));
const specs = [
  ['C0', 'CORRECT', {}, []],
  ['C1', 'CORRECT', {
    'ⓒ': { referentHere: '특정 속성이 지정되지 않은 옷 일반', instances: instances('갑이 들고 있는 옷', '옷장 안에 있는 많은 옷') },
    'ⓓ': { referentHere: '빨간색 여부 등 특정 속성이 지정되지 않은 옷 일반', instances: instances('갑이 들고 있는 옷', '옷장 안에 있는 많은 옷') },
  }, []],
  ['N1', 'INSTANCE_ERROR', { 'ⓐ': { instances: instances('ⓔ빨간 옷') } }, []],
  ['G1', 'INSTANCE_ERROR', { 'ⓒ': { instances: instances('갑이 필요로 하는 빨간 옷') } }, []],
  ['M1', 'PLANTED', { 'ⓓ': { referentHere: R('ⓔ') }, 'ⓔ': { referentHere: R('ⓓ') } }, ['ⓓ', 'ⓔ']],
  ['M2', 'PLANTED', { 'ⓓ': { speaker: '을' } }, ['ⓓ']],
  ['M3', 'PLANTED', { 'ⓓ': { referentHere: '갑에게 옷이 정말 없다는 것' } }, ['ⓓ']],
  ['M4', 'INSTANCE_ERROR', { 'ⓐ': { instances: instances('옷장 안에 있는 옷') } }, []],
  ['M5', 'PLANTED', { 'ⓐ': { referentHere: '색을 정하지 않은 옷 일반' } }, ['ⓐ']],
  ['M6', 'PLANTED', { 'ⓑ': { referentHere: '색을 정하지 않은 옷 일반' } }, ['ⓑ']],
  ['M7', 'PLANTED', { 'ⓒ': { speaker: '갑' } }, ['ⓒ']],
  ['M8', 'PLANTED_BOUNDARY', { 'ⓓ': { referentHere: '옷장 안에 있는 옷' } }, ['ⓓ']],
];
const TEST_GLOSSES = specs.map(([id, kind, changes, expectedDisagree]) => ({ id, kind, markers: mutate(changes), expectedDisagree,
  expectedInstances: Object.fromEntries(mutate(changes).flatMap((m) => m.instances.map((_, i) => [`${m.marker}-i${i + 1}`, id === 'C1' ? 'VALID' : 'INVALID']))) }));
const FIXED_PAIRS = [
  { id: 'P1', glossA: mutate({ 'ⓔ': { referentHere: '갑에게 필요한, 빨간색이라는 속성이 지정된 옷의 범위' } }),
    independentB: mutate({ 'ⓔ': { referentHere: '빨간색 속성을 가진 옷' } }),
    expected: { marker: 'ⓔ', verdict: 'SAME', differenceTypes: ['OMITTED_DETAIL', 'NONE'], allAgree: true } },
  { id: 'P2', glossA: mutate({ 'ⓒ': { referentHere: '특정 속성이 지정되지 않은 옷 일반' } }),
    independentB: mutate({ 'ⓒ': { referentHere: '옷장 안에 있는 옷' } }),
    expected: { marker: 'ⓒ', verdict: 'DIFFERENT', differenceTypes: ['SCOPE_CHANGE'], sourceSupports: 'A' } },
];
const DETECT_REDERIVATIONS = [1, 2, 3];
const PIPELINE_RUNS = [1, 2, 3];

const MODEL = 'gpt-5.6-terra';
const SETTINGS = { GENERATE: { effort: 'high', maxOutputTokens: 12000 }, REDERIVE: { effort: 'high', maxOutputTokens: 8000 }, COMPARE: { effort: 'medium', maxOutputTokens: 4000 } };
const MAX_REQUESTS = DETECT_REDERIVATIONS.length * (1 + TEST_GLOSSES.length) + FIXED_PAIRS.length * 3 + PIPELINE_RUNS.length * MAX_ROUNDS * 3;

// ---- 오프라인 자체 점검 ----
if (JSON.stringify(ctx.targets) !== JSON.stringify(['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ'])) throw new Error('Target marker self-test failed');
for (const t of [GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION]) if (/빨간|옷|공손룡|묵가|명실|흰 말/u.test(t)) throw new Error('Item content leaked into instruction');
if (JSON.stringify(ctx.baseInput).includes('referentHere') || JSON.stringify(ctx.baseInput).includes('allowedReadings')) throw new Error('Approved gloss leaked into pipeline input');
// 변경 칸을 독립적인 표와 대조해 불필요한 변경·빠진 변경을 모두 거부한다.
const expectedChanges = {
  C0: [], C1: ['ⓒ.referentHere', 'ⓒ.instances', 'ⓓ.referentHere', 'ⓓ.instances'],
  N1: ['ⓐ.instances'], G1: ['ⓒ.instances'], M1: ['ⓓ.referentHere', 'ⓔ.referentHere'],
  M2: ['ⓓ.speaker'], M3: ['ⓓ.referentHere'], M4: ['ⓐ.instances'], M5: ['ⓐ.referentHere'],
  M6: ['ⓑ.referentHere'], M7: ['ⓒ.speaker'], M8: ['ⓓ.referentHere'],
};
function changedFields(rows) {
  assert.equal(ctx.markerSetOk(rows), true);
  return rows.flatMap((m) => Object.keys(m).filter((k) => JSON.stringify(m[k]) !== JSON.stringify(C0.find((c) => c.marker === m.marker)[k])).map((k) => `${m.marker}.${k}`));
}
for (const g of TEST_GLOSSES) assert.deepEqual(changedFields(g.markers), expectedChanges[g.id]);
for (const p of FIXED_PAIRS) for (const rows of [p.glossA, p.independentB]) assert.deepEqual(changedFields(rows), [`${p.expected.marker}.referentHere`]);
// 승인 해석의 의미 칸이 원자료 입력에 들어가지 않았는지도 확인한다.
for (const m of approved.markers) assert.equal(JSON.stringify(ctx.baseInput).includes(m.referentHere), false);
const probeInput = ctx.comparisonInput(TEST_GLOSSES.find((g) => g.id === 'N1').markers, C0);
const probe = { markers: probeInput.glossA.map((m) => ({ marker: m.marker,
  referent: { verdict: 'SAME', differenceType: 'NONE', reason: '검사' }, speaker: { verdict: 'SAME', reason: '검사' },
  instances: m.instances.map((i) => ({ instanceId: i.instanceId, verdict: 'VALID', kind: 'ENTITY_IN_SOURCE', reason: '검사' })),
  sourceSupports: 'BOTH', sourceBasis: [],
})) };
assert.deepEqual(comparisonProblems(probe, probeInput), []);
for (const corrupt of [
  (x) => { x.markers[0].referent.differenceType = 'SCOPE_CHANGE'; },
  (x) => { x.markers[0].instances = []; },
  (x) => { x.markers[0].instances[0].kind = 'SUBCATEGORY'; },
]) { const bad = structuredClone(probe); corrupt(bad); assert.ok(comparisonProblems(bad, probeInput).length); }

const frozen = { questionId: QID, targets: ctx.targets, model: MODEL, settings: SETTINGS, maxRounds: MAX_ROUNDS, maxRequests: MAX_REQUESTS, estimatedUsdCap: 2.5,
  detect: { rederivations: DETECT_REDERIVATIONS, testGlosses: TEST_GLOSSES.map(({ markers, ...g }) => ({ ...g, markersHash: hash(JSON.stringify(markers)) })) },
  fixedPairs: { repetitions: 3, hash: hash(JSON.stringify(FIXED_PAIRS)) },
  pipelineRuns: PIPELINE_RUNS,
  hashes: { generation: hash(GENERATION_INSTRUCTION), rederivation: hash(REDERIVATION_INSTRUCTION), comparison: hash(COMPARISON_INSTRUCTION),
    schemas: hash(JSON.stringify([GENERATION_SCHEMA, REDERIVATION_SCHEMA, COMPARISON_SCHEMA].map((s) => z.toJSONSchema(s)))),
    input: hash(JSON.stringify(ctx.baseInput)), runner: hash(readFileSync(new URL(import.meta.url))), pipelineLib: hash(readFileSync('scripts/lib/marker-gloss-pipeline-v2.mjs')),
    glossValidator: hash(readFileSync('scripts/lib/marker-gloss-validation.mjs')), quoteValidator: hash(readFileSync('scripts/lib/marker-quote-validation.mjs')) },
  design: [
    'v2: 대상·화자 SAME일 때만 기호 AGREE. INVALID 사례는 사례만 제거하며 재생성 사유가 아니다.',
    '설명 생략과 범위 변경을 구분하고, sourceSupports는 기록만 하며 채택에는 쓰지 않는다.',
    '최대 3회차. 첫 전체 일치 회차, 없으면 코드 통과 중 AGREE 최다·동률 앞 회차를 채택하고 미일치 기호를 제외한다.',
    '검수 12개 × 독립 재도출 3개, 고정 짝 2개 × 3회, 파이프라인 3회. 최대 72요청·추정 상한 2.5달러.',
    '승인 해석본은 검수 시험의 기준에만 쓰며 파이프라인 입력에는 넣지 않는다. 비용은 추정치다.',
  ],
};
mkdirSync(DIR, { recursive: true });
const promptsDoc = { generation: GENERATION_INSTRUCTION, rederivation: REDERIVATION_INSTRUCTION, comparison: COMPARISON_INSTRUCTION,
  schemas: { generation: z.toJSONSchema(GENERATION_SCHEMA), rederivation: z.toJSONSchema(REDERIVATION_SCHEMA), comparison: z.toJSONSchema(COMPARISON_SCHEMA) } };
if (existsSync(`${DIR}/FROZEN.json`)) { if (JSON.stringify(read(`${DIR}/FROZEN.json`)) !== JSON.stringify(frozen)) throw new Error('Frozen run changed'); }
else {
  if (process.argv[2] !== 'prepare') throw new Error('Prepare first');
  save(`${DIR}/FROZEN.json`, frozen);
  save(`${DIR}/prompts.json`, promptsDoc);
  save(`${DIR}/input.json`, ctx.baseInput);
  save(`${DIR}/test-glosses.json`, TEST_GLOSSES);
  save(`${DIR}/fixed-pairs.json`, FIXED_PAIRS);
}
if (JSON.stringify(read(`${DIR}/prompts.json`)) !== JSON.stringify(promptsDoc) || JSON.stringify(read(`${DIR}/input.json`)) !== JSON.stringify(ctx.baseInput)
  || JSON.stringify(read(`${DIR}/test-glosses.json`)) !== JSON.stringify(TEST_GLOSSES)
  || JSON.stringify(read(`${DIR}/fixed-pairs.json`)) !== JSON.stringify(FIXED_PAIRS)) throw new Error('Saved artifacts differ from frozen inputs');
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, testGlosses: TEST_GLOSSES.length, fixedPairs: FIXED_PAIRS.length, detectRederivations: DETECT_REDERIVATIONS.length, pipelineRuns: PIPELINE_RUNS.length, maxRequests: MAX_REQUESTS, estimatedUsdCap: frozen.estimatedUsdCap })); process.exit(0); }
if (process.argv[2] !== 'run') throw new Error('Use prepare or run');

// ---- 호출(원장 기록·재개) ----
const ledgerPath = `${DIR}/requests.jsonl`;
const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const log = (x) => { ledger.push(x); appendFileSync(ledgerPath, JSON.stringify(x) + '\n'); };
let client;
async function call(kind, label, instructions, input, schema) {
  let end = ledger.find((x) => x.event === 'END' && x.label === label);
  if (!end) {
    if (ledger.some((x) => x.event === 'START' && x.label === label)) return { stop: `완료 기록 없는 요청: ${label}` };
    const s = SETTINGS[kind];
    const request = { model: MODEL, instructions, input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }],
      reasoning: { effort: s.effort }, max_output_tokens: s.maxOutputTokens, store: false, service_tier: 'default',
      text: { format: { type: 'json_schema', name: `marker_gloss_${kind.toLowerCase()}`, strict: true, schema: z.toJSONSchema(schema) } } };
    const reservedUsd = (Buffer.byteLength(JSON.stringify(request)) * 2 + s.maxOutputTokens * 12) / 1e6;
    const starts = ledger.filter((x) => x.event === 'START').length;
    const spent = ledger.filter((x) => x.event === 'END').reduce((t, x) => t + x.estimatedUsd, 0);
    if (starts >= MAX_REQUESTS || spent + reservedUsd > frozen.estimatedUsdCap) return { stop: 'Budget cap' };
    const id = starts + 1, started = Date.now();
    log({ event: 'START', id, label, kind, at: new Date().toISOString(), reservedUsd, requestHash: hash(JSON.stringify(request)), inputHash: hash(JSON.stringify(input)) });
    let response;
    try { client ??= new OpenAI({ maxRetries: 0 }); response = await client.responses.create(request, { timeout: 240000, maxRetries: 0 }); }
    catch (e) { log({ event: 'ERROR', id, label, error: String(e) }); return { stop: String(e) }; }
    const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0;
    end = { event: 'END', id, label, kind, at: new Date().toISOString(), durationMs: Date.now() - started, model: response.model, responseId: response.id,
      status: response.status, incompleteDetails: response.incomplete_details ?? null, usage: u,
      estimatedUsd: u ? ((u.input_tokens - cached) * 2 + cached * 0.2 + u.output_tokens * 12) / 1e6 : reservedUsd, outputText: response.output_text };
    log(end);
  }
  try {
    if (end.status !== 'completed') throw new Error(`응답 미완료: ${end.status}`);
    const value = schema.parse(JSON.parse(end.outputText));
    if (kind === 'COMPARE') { const problems = comparisonProblems(value, input); if (problems.length) throw new Error(problems.join(', ')); }
    return { ok: true, value };
  } catch (e) { return { ok: false, error: String(e) }; }
}

let stop = null;
// A. 검수 레이어 시험
const detect = [];
for (const k of DETECT_REDERIVATIONS) {
  if (stop) break;
  const red = await call('REDERIVE', `detect-rederive-${k}`, REDERIVATION_INSTRUCTION, ctx.baseInput, REDERIVATION_SCHEMA);
  if (red.stop) { stop = red.stop; break; }
  if (!red.ok || !ctx.markerSetOk(red.value.markers)) { detect.push({ rederivation: k, contractFailure: red.ok ? 'TARGET_MARKERS_MISMATCH' : red.error }); continue; }
  for (const g of TEST_GLOSSES) {
    const cmp = await call('COMPARE', `detect-compare-${g.id}-${k}`, COMPARISON_INSTRUCTION, ctx.comparisonInput(g.markers, red.value.markers), COMPARISON_SCHEMA);
    if (cmp.stop) { stop = cmp.stop; break; }
    if (!cmp.ok || !ctx.markerSetOk(cmp.value.markers)) { detect.push({ rederivation: k, glossId: g.id, contractFailure: cmp.ok ? 'TARGET_MARKERS_MISMATCH' : cmp.error }); continue; }
    const flagged = cmp.value.markers.filter((m) => !markerAgrees(m)).map((m) => m.marker);
    detect.push({ rederivation: k, glossId: g.id, kind: g.kind, expectedDisagree: g.expectedDisagree, flagged,
      instanceResults: cmp.value.markers.flatMap((m) => m.instances.map((i) => ({ marker: m.marker, instanceId: i.instanceId, expected: g.expectedInstances[i.instanceId], actual: i.verdict, correct: g.expectedInstances[i.instanceId] === i.verdict }))),
      hits: g.expectedDisagree.filter((m) => flagged.includes(m)), falseFlags: flagged.filter((m) => !g.expectedDisagree.includes(m)), comparison: cmp.value });
  }
}
// B. 고정 짝 시험
const fixedPairs = [];
for (const pair of FIXED_PAIRS) {
  for (let repetition = 1; repetition <= 3; repetition += 1) {
    if (stop) break;
    const cmp = await call('COMPARE', `fixed-${pair.id}-${repetition}`, COMPARISON_INSTRUCTION,
      ctx.comparisonInput(pair.glossA, pair.independentB), COMPARISON_SCHEMA);
    if (cmp.stop) { stop = cmp.stop; break; }
    if (!cmp.ok) { fixedPairs.push({ id: pair.id, repetition, contractFailure: cmp.error }); continue; }
    const m = cmp.value.markers.find((row) => row.marker === pair.expected.marker);
    const matches = m.referent.verdict === pair.expected.verdict && pair.expected.differenceTypes.includes(m.referent.differenceType)
      && (!pair.expected.allAgree || cmp.value.markers.every(markerAgrees))
      && (!pair.expected.sourceSupports || m.sourceSupports === pair.expected.sourceSupports);
    fixedPairs.push({ id: pair.id, repetition, matches, comparison: cmp.value });
  }
}
// C. 파이프라인 실행
const runs = [];
for (const r of PIPELINE_RUNS) {
  if (stop) break;
  const file = `${DIR}/pipeline-run${r}.json`;
  if (existsSync(file)) { runs.push(read(file)); continue; }
  const res = await runPipeline(ctx, call, `run${r}`);
  if (res.stop) { stop = res.stop; writeFileSync(`${DIR}/pipeline-run${r}.stopped.json`, JSON.stringify(res, null, 2) + '\n'); break; }
  const out = { run: r, status: res.status, adoptedRound: res.adoptedRound, droppedMarkers: res.droppedMarkers, removedInstances: res.removedInstances, roundsUsed: res.rounds.length,
    keyForcedMarkers: res.adoptedRound ? res.rounds[res.adoptedRound - 1].generation.keyForcedMarkers : [], gloss: res.gloss, judgePayload: judgePayload(res.gloss), rounds: res.rounds };
  save(file, out); runs.push(out);
  console.log(JSON.stringify({ run: r, status: out.status, adoptedRound: out.adoptedRound, dropped: out.droppedMarkers, roundsUsed: out.roundsUsed }));
}
const scored = detect.filter((d) => d.flagged);
const sum = (rows, f) => rows.reduce((t, d) => t + f(d), 0);
const errorRows = scored.filter((d) => d.kind === 'PLANTED');
const summary = {
  requests: ledger.filter((x) => x.event === 'START').length,
  estimatedUsd: ledger.filter((x) => x.event === 'END').reduce((t, x) => t + x.estimatedUsd, 0),
  stop,
  detect: {
    errorMarkerDetection: `${sum(errorRows, (d) => d.hits.length)}/${sum(errorRows, (d) => d.expectedDisagree.length)}`,
    boundaryM8: scored.filter((d) => d.glossId === 'M8').map((d) => ({ rederivation: d.rederivation, flagged: d.flagged })),
    falseFlagsOnCorrectGlosses: `${sum(scored.filter((d) => d.kind === 'CORRECT'), (d) => d.falseFlags.length)}/${sum(scored.filter((d) => d.kind === 'CORRECT'), () => ctx.targets.length)}`,
    falseFlagsOnErrorGlosses: `${sum(errorRows, (d) => d.falseFlags.length)}/${sum(errorRows, (d) => ctx.targets.length - d.expectedDisagree.length)}`,
    falsePositiveRate: `${sum(scored, (d) => d.falseFlags.length)}/${sum(scored, (d) => ctx.targets.length - d.expectedDisagree.length)}`,
    instanceAccuracy: `${sum(scored, (d) => d.instanceResults.filter((i) => i.correct).length)}/${sum(scored, (d) => d.instanceResults.length)}`,
    contractFailures: detect.filter((d) => d.contractFailure).length,
    rows: detect.map(({ comparison: _c, ...d }) => d),
  },
  fixedPairs: { matches: Object.fromEntries(FIXED_PAIRS.map((p) => [p.id, `${fixedPairs.filter((r) => r.id === p.id && r.matches).length}/3`])), rows: fixedPairs },
  contractFailures: detect.filter((d) => d.contractFailure).length + fixedPairs.filter((d) => d.contractFailure).length
    + runs.reduce((n, r) => n + r.rounds.reduce((t, round) => t + ['generation', 'rederivation', 'comparison'].filter((stage) => round[stage]?.contractFailure).length, 0), 0),
  pipeline: runs.map((x) => ({ run: x.run, status: x.status, adoptedRound: x.adoptedRound, roundsUsed: x.roundsUsed, droppedMarkers: x.droppedMarkers, removedInstances: x.removedInstances, keyForcedMarkers: x.keyForcedMarkers })),
};
writeFileSync(`${DIR}/DETECT.json`, JSON.stringify(detect, null, 2) + '\n');
writeFileSync(`${DIR}/RESULTS.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ stop, requests: summary.requests, estimatedUsd: summary.estimatedUsd, detect: { detection: summary.detect.errorMarkerDetection, falseCorrect: summary.detect.falseFlagsOnCorrectGlosses, falseError: summary.detect.falseFlagsOnErrorGlosses }, pipeline: summary.pipeline }));
