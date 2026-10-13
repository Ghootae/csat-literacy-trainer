// 기호 해석본 자동 파이프라인(중간안·의미 자동 검수) 1단계 검증. 공손룡 12번.
// A. 검수 레이어 검증: 정답이 정해진 해석본(정상·자연 오류·심은 오류)을 독립 재도출 3개와 각각 대조해 잡아내는지 본다.
// B. 파이프라인 실행 3회: 생성→코드 검사→독립 재도출→대조(문항당 최대 3회차). 채택본은 v5 검증의 반복 r에 쓴다.
// 사람 승인 해석본은 파이프라인 입력에 넣지 않는다. A의 채점용 기준과 심은 오류의 원본으로만 쓴다.
// prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { createContext, runPipeline, judgePayload, MAX_ROUNDS, GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION,
  GENERATION_SCHEMA, REDERIVATION_SCHEMA, COMPARISON_SCHEMA } from './lib/marker-gloss-pipeline.mjs';

const DIR = 'docs/experiments/marker-gloss-pipeline-gongsun-2026-10-07';
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const QID = 'gongsun-long-later-mohists-q12';
const V2 = 'docs/experiments/marker-gloss-generator-v2-gongsun-2026-10-07';
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
const view = (markers) => markers.map((m) => ({ marker: m.marker, referentHere: m.referentHere, speaker: m.speaker }));
const C0 = view(approved.markers);
const mutate = (changes) => C0.map((m) => (changes[m.marker] ? { ...m, ...changes[m.marker] } : m));
const v2mid = (slot) => view(read(`${V2}/middle-slot${slot}.json`).adopted.gloss.markers);
const R = (m) => C0.find((x) => x.marker === m).referentHere;
const TEST_GLOSSES = [
  { id: 'C0', kind: 'CORRECT', note: '승인 해석본의 대상·화자', markers: C0, expectedDisagree: [] },
  { id: 'C1', kind: 'CORRECT', note: 'v2 자동 중간안 slot2(Claude가 정상으로 판단, 사람 검토 아님)', markers: v2mid(2), expectedDisagree: [] },
  { id: 'C2', kind: 'CORRECT', note: 'v2 자동 중간안 slot3(Claude가 정상으로 판단, 사람 검토 아님)', markers: v2mid(3), expectedDisagree: [] },
  { id: 'N1', kind: 'NATURAL_ERROR', note: 'v2 자동 중간안 slot1: ⓐ에 같은 대상인 ⓔ를 사례로 적음', markers: v2mid(1), expectedDisagree: ['ⓐ'] },
  { id: 'M1', kind: 'PLANTED', note: 'ⓓ·ⓔ 대상 뒤바꿈', markers: mutate({ 'ⓓ': { referentHere: R('ⓔ') }, 'ⓔ': { referentHere: R('ⓓ') } }), expectedDisagree: ['ⓓ', 'ⓔ'] },
  { id: 'M2', kind: 'PLANTED', note: 'ⓓ 화자 바꿈', markers: mutate({ 'ⓓ': { speaker: '을' } }), expectedDisagree: ['ⓓ'] },
  { id: 'M3', kind: 'PLANTED', note: 'ⓓ 대상 칸에 문장 뜻', markers: mutate({ 'ⓓ': { referentHere: '갑에게 옷이 정말 없다는 것' } }), expectedDisagree: ['ⓓ'] },
  { id: 'M4', kind: 'PLANTED', note: 'ⓐ에 범위 밖 사례', markers: mutate({ 'ⓐ': { referentHere: `${R('ⓐ')}이며, 옷장 안에 있는 옷들은 그 범위에 드는 사례다.` } }), expectedDisagree: ['ⓐ'] },
  { id: 'M5', kind: 'PLANTED', note: 'ⓐ를 이름의 일반적 뜻으로', markers: mutate({ 'ⓐ': { referentHere: '색을 정하지 않은 옷 일반' } }), expectedDisagree: ['ⓐ'] },
  { id: 'M6', kind: 'PLANTED', note: 'ⓑ 범위를 옷 일반으로 넓힘', markers: mutate({ 'ⓑ': { referentHere: '색을 정하지 않은 옷 일반' } }), expectedDisagree: ['ⓑ'] },
  { id: 'M7', kind: 'PLANTED', note: 'ⓒ 화자 바꿈', markers: mutate({ 'ⓒ': { speaker: '갑' } }), expectedDisagree: ['ⓒ'] },
  { id: 'M8', kind: 'PLANTED_BOUNDARY', note: 'ⓓ를 구체 사례로 좁힘(옷장 안에 있는 옷). 해석본의 대상 칸으로는 범위 축소이나 S5 학생 답과 같은 표현이라 경계 사례로 따로 본다',
    markers: mutate({ 'ⓓ': { referentHere: '옷장 안에 있는 옷' } }), expectedDisagree: ['ⓓ'] },
];
const DETECT_REDERIVATIONS = [1, 2, 3];
const PIPELINE_RUNS = [1, 2, 3];

const MODEL = 'gpt-5.6-terra';
const SETTINGS = { GENERATE: { effort: 'high', maxOutputTokens: 12000 }, REDERIVE: { effort: 'high', maxOutputTokens: 8000 }, COMPARE: { effort: 'medium', maxOutputTokens: 4000 } };
const MAX_REQUESTS = DETECT_REDERIVATIONS.length * (1 + TEST_GLOSSES.length) + PIPELINE_RUNS.length * MAX_ROUNDS * 3;

// ---- 오프라인 자체 점검 ----
if (JSON.stringify(ctx.targets) !== JSON.stringify(['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ'])) throw new Error('Target marker self-test failed');
for (const t of [GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION]) if (/빨간|옷|공손룡|묵가|명실|흰 말/u.test(t)) throw new Error('Item content leaked into instruction');
if (JSON.stringify(ctx.baseInput).includes('referentHere') || JSON.stringify(ctx.baseInput).includes('allowedReadings')) throw new Error('Approved gloss leaked into pipeline input');
for (const g of TEST_GLOSSES) {
  if (!ctx.markerSetOk(g.markers)) throw new Error(`Test gloss ${g.id} marker set`);
  const changed = g.markers.filter((m) => { const c = C0.find((x) => x.marker === m.marker); return c.referentHere !== m.referentHere || c.speaker !== m.speaker; }).map((m) => m.marker);
  if (g.kind.startsWith('PLANTED') && JSON.stringify(changed) !== JSON.stringify(g.expectedDisagree)) throw new Error(`Mutation ${g.id} changes ${changed}`);
  // 심은 오류는 코드 검사(문자열 신호 포함)로는 잡히지 않아야 의미 검수 시험이 된다.
  if (/(부재|없다|없음|않다)$|의 부재/u.test(g.markers.map((m) => m.referentHere).join('\n'))) throw new Error(`Mutation ${g.id} is caught by the code regex`);
}
{ const sample = ctx.comparisonInput(C0, C0);
  if (JSON.stringify(Object.keys(sample.glossA[0])) !== JSON.stringify(['marker', 'referentHere', 'speaker'])) throw new Error('Comparison input fields'); }

const frozen = { questionId: QID, targets: ctx.targets, model: MODEL, settings: SETTINGS, maxRounds: MAX_ROUNDS, maxRequests: MAX_REQUESTS, estimatedUsdCap: 2.0,
  detect: { rederivations: DETECT_REDERIVATIONS, testGlosses: TEST_GLOSSES.map(({ markers, ...g }) => ({ ...g, markersHash: hash(JSON.stringify(markers)) })) },
  pipelineRuns: PIPELINE_RUNS,
  hashes: { generation: hash(GENERATION_INSTRUCTION), rederivation: hash(REDERIVATION_INSTRUCTION), comparison: hash(COMPARISON_INSTRUCTION),
    schemas: hash(JSON.stringify([GENERATION_SCHEMA, REDERIVATION_SCHEMA, COMPARISON_SCHEMA].map((s) => z.toJSONSchema(s)))),
    input: hash(JSON.stringify(ctx.baseInput)), runner: hash(readFileSync(new URL(import.meta.url))), pipelineLib: hash(readFileSync('scripts/lib/marker-gloss-pipeline.mjs')),
    glossValidator: hash(readFileSync('scripts/lib/marker-gloss-validation.mjs')), quoteValidator: hash(readFileSync('scripts/lib/marker-quote-validation.mjs')) },
  design: [
    '2026-10-07 사용자 결정: v5 = v5 운영 규칙 + 사람 승인 없는 자동 해석본(중간안) + v3에서 만든 판정 방법. 자동 해석본 생성 뒤 의미 자동 검수 레이어를 둔다.',
    '검수 방식: 독립 재도출(생성본을 보지 않고 같은 입력으로 기호별 대상·화자만 정함, 같은 OpenAI 모델) → 기호별 대조(AGREE/DISAGREE). 생성기·재도출·대조 지시에는 문항 내용이 없다.',
    '파이프라인 규칙(사전 고정): 문항당 최대 3회차. 코드 검사 실패도 한 회차로 센다. 불일치·실패 시 다음 회차에서 생성과 재도출을 모두 새로 하고, 생성기에는 어긋난 기호 이름과 "어느 쪽이 맞는지 정해지지 않았다"는 안내만 준다(재도출 내용은 주지 않는다).',
    '채택 규칙(사전 고정): 모든 기호 AGREE인 첫 회차 채택. 없으면 코드 검사 통과 회차 중 AGREE가 가장 많은 회차(같으면 앞 회차)를 쓰고 DISAGREE 기호만 뺀다. 코드 검사 통과 회차가 없으면 해석본 없음(GENERATION_FAILED)으로 판정하고 실패를 기록한다.',
    'A 검수 레이어 시험: 정상 3(C0 승인본 대상·화자, C1·C2 v2 자동 중간안), 자연 오류 1(N1), 심은 오류 8(M1~M8, M8은 경계 사례)을 독립 재도출 3개와 각각 대조한다. 심은 오류는 코드 검사로 잡히지 않음을 사전 확인했다.',
    'A 지표: 오류 기호 검출률(기대 DISAGREE 기호가 DISAGREE인 비율), 오탐률(기대 AGREE 기호가 DISAGREE인 비율), 대조 출력 계약 실패. M8은 따로 보고한다. C1·C2·N1의 기대값은 Claude 판단이며 사람 검토가 아니다.',
    'B 파이프라인 3회 실행의 채택 상태(ALL_AGREED/PARTIAL/NONE_AGREED/GENERATION_FAILED), 회차 수, 뺀 기호, keyForcedOnly 기호, 요청 수를 보고한다. 채택본의 의미는 Claude·GPT가 따로 검토한다.',
    '비용 상한은 추정치다. 실제 청구액과 다를 수 있다.',
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
}
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, testGlosses: TEST_GLOSSES.length, detectRederivations: DETECT_REDERIVATIONS.length, pipelineRuns: PIPELINE_RUNS.length, maxRequests: MAX_REQUESTS, estimatedUsdCap: frozen.estimatedUsdCap })); process.exit(0); }
if (process.argv[2] !== 'run') throw new Error('Use prepare or run');
if (JSON.stringify(read(`${DIR}/prompts.json`)) !== JSON.stringify(promptsDoc) || JSON.stringify(read(`${DIR}/input.json`)) !== JSON.stringify(ctx.baseInput)
  || JSON.stringify(read(`${DIR}/test-glosses.json`)) !== JSON.stringify(TEST_GLOSSES)) throw new Error('Saved prompts/input/test glosses differ from what would be sent');

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
    return { ok: true, value: schema.parse(JSON.parse(end.outputText)) };
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
    const flagged = cmp.value.markers.filter((m) => m.verdict === 'DISAGREE').map((m) => m.marker);
    detect.push({ rederivation: k, glossId: g.id, kind: g.kind, expectedDisagree: g.expectedDisagree, flagged,
      hits: g.expectedDisagree.filter((m) => flagged.includes(m)), falseFlags: flagged.filter((m) => !g.expectedDisagree.includes(m)), comparison: cmp.value });
  }
}
// B. 파이프라인 실행
const runs = [];
for (const r of PIPELINE_RUNS) {
  if (stop) break;
  const file = `${DIR}/pipeline-run${r}.json`;
  if (existsSync(file)) { runs.push(read(file)); continue; }
  const res = await runPipeline(ctx, call, `run${r}`);
  if (res.stop) { stop = res.stop; writeFileSync(`${DIR}/pipeline-run${r}.stopped.json`, JSON.stringify(res, null, 2) + '\n'); break; }
  const out = { run: r, status: res.status, adoptedRound: res.adoptedRound, droppedMarkers: res.droppedMarkers, roundsUsed: res.rounds.length,
    keyForcedMarkers: res.adoptedRound ? res.rounds[res.adoptedRound - 1].generation.keyForcedMarkers : [], gloss: res.gloss, judgePayload: judgePayload(res.gloss), rounds: res.rounds };
  save(file, out); runs.push(out);
  console.log(JSON.stringify({ run: r, status: out.status, adoptedRound: out.adoptedRound, dropped: out.droppedMarkers, roundsUsed: out.roundsUsed }));
}
const scored = detect.filter((d) => d.flagged);
const sum = (rows, f) => rows.reduce((t, d) => t + f(d), 0);
const errorRows = scored.filter((d) => d.kind === 'PLANTED' || d.kind === 'NATURAL_ERROR');
const summary = {
  requests: ledger.filter((x) => x.event === 'START').length,
  estimatedUsd: ledger.filter((x) => x.event === 'END').reduce((t, x) => t + x.estimatedUsd, 0),
  stop,
  detect: {
    errorMarkerDetection: `${sum(errorRows, (d) => d.hits.length)}/${sum(errorRows, (d) => d.expectedDisagree.length)}`,
    boundaryM8: scored.filter((d) => d.glossId === 'M8').map((d) => ({ rederivation: d.rederivation, flagged: d.flagged })),
    falseFlagsOnCorrectGlosses: `${sum(scored.filter((d) => d.kind === 'CORRECT'), (d) => d.falseFlags.length)}/${sum(scored.filter((d) => d.kind === 'CORRECT'), () => ctx.targets.length)}`,
    falseFlagsOnErrorGlosses: `${sum(errorRows, (d) => d.falseFlags.length)}/${sum(errorRows, (d) => ctx.targets.length - d.expectedDisagree.length)}`,
    contractFailures: detect.filter((d) => d.contractFailure).length,
    rows: detect.map(({ comparison: _c, ...d }) => d),
  },
  pipeline: runs.map((x) => ({ run: x.run, status: x.status, adoptedRound: x.adoptedRound, roundsUsed: x.roundsUsed, droppedMarkers: x.droppedMarkers, keyForcedMarkers: x.keyForcedMarkers })),
};
writeFileSync(`${DIR}/DETECT.json`, JSON.stringify(detect, null, 2) + '\n');
writeFileSync(`${DIR}/RESULTS.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ stop, requests: summary.requests, estimatedUsd: summary.estimatedUsd, detect: { detection: summary.detect.errorMarkerDetection, falseCorrect: summary.detect.falseFlagsOnCorrectGlosses, falseError: summary.detect.falseFlagsOnErrorGlosses }, pipeline: summary.pipeline }));
