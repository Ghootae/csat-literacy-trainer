import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { DirectJudgmentExperiment, DIRECT_JUDGMENT_PROMPT_PATH, validateDirectJudgment } from '../packages/pipeline/dist/dialogue-experiment/direct-judgment-experiment.js';
import { MaterialityGateExperiment } from '../packages/pipeline/dist/dialogue-experiment/materiality-gate-experiment.js';
import { buildCentralStoryGatePayload } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root = 'docs/experiments/axis-direct-judgment-v1-2026-09-20';
const priorRoot = 'docs/experiments/single-call-materiality-2026-09-20';
const phase = process.argv.find(a => a.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (f, v) => writeFileSync(`${root}/${f}`, JSON.stringify(v, null, 2) + '\n');
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const cases = read(`${priorRoot}/cases.json`), sources = read(`${priorRoot}/sources.json`), prior = read(`${priorRoot}/manifest.json`);
const instructions = { baseline: readFileSync(`${priorRoot}/baseline-instructions.md`, 'utf8').trim(), direct: readFileSync(DIRECT_JUDGMENT_PROMPT_PATH, 'utf8').trim() };
assert.equal(sha(instructions.baseline), prior.instructionHashes.baseline);
const ownPaths = ['scripts/test-axis-direct-judgment.mjs', DIRECT_JUDGMENT_PROMPT_PATH,
  'packages/pipeline/src/dialogue-experiment/direct-judgment-experiment.ts',
  'packages/pipeline/dist/dialogue-experiment/direct-judgment-experiment.js', `${priorRoot}/cases.json`, `${priorRoot}/sources.json`];
for (const [p, h] of Object.entries(prior.protectedHashes)) assert.equal(sha(readFileSync(p)), h, `Prior protected file changed: ${p}`);
for (const s of Object.values(sources)) assert.equal(sha(readFileSync(s.path)), s.fileHash);
const fingerprint = { casesHash: sha(JSON.stringify(cases)), sourcesHash: sha(JSON.stringify(sources)),
  instructionHashes: Object.fromEntries(Object.entries(instructions).map(([k, v]) => [k, sha(v)])),
  protectedHashes: { ...prior.protectedHashes, ...Object.fromEntries(ownPaths.map(p => [p, sha(readFileSync(p))])) } };
const jobs = [];
for (let repeat = 1; repeat <= 3; repeat++) {
  // Rotate case order and alternate within-pair order; do not group arms by execution time.
  const ordered = [...cases.slice((repeat - 1) * 7), ...cases.slice(0, (repeat - 1) * 7)];
  ordered.forEach((c, i) => {
    for (const arm of (i + repeat) % 2 ? ['baseline', 'direct'] : ['direct', 'baseline']) jobs.push({
      id: `${c.id}--${arm}--r${repeat}`, caseId: c.id, repeat, arm,
    });
  });
}
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  assert.equal(phase, 'prepare');
  write('cases.json', cases); write('sources.json', sources); write('jobs.json', jobs);
  for (const [arm, t] of Object.entries(instructions)) writeFileSync(`${root}/${arm}-instructions.md`, t + '\n');
  write('manifest.json', { version: 'axis-direct-judgment-v1', preparedAt: new Date().toISOString(), ...fingerprint,
    jobsHash: sha(JSON.stringify(jobs)), model: 'gpt-5.6-terra', effort: 'medium', serviceTier: 'default',
    cases: 20, repeats: 3, maxPhysicalCalls: 120, maxEstimatedUsd: 2, maxOutputTokens: 4000, concurrency: 2,
    retries: 0, feedbackCalls: 0, counts: { sufficient: 6, coreGap: 6, error: 4, boundary: 4 },
    pricesPerMillion: { input: 2, cachedInput: .2, cacheWrite: 2.5, output: 12 }, pricingSource: 'https://developers.openai.com/api/docs/pricing',
    expectationAuthority: 'Prior frozen agent-authored expectations; boundaries have no fixed truth label.',
    comparison: 'Joint simplification of instructions and output obligations. Not an isolated causal test of JSON, schema, or intermediate reasoning.',
    authorization: 'User approved named experiment and testing; local USD2/120-call limits. Production defaults unchanged.',
  });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) assert.deepEqual(v, manifest[k], `Frozen ${k} changed`);
assert.equal(sha(JSON.stringify(read(`${root}/cases.json`))), manifest.casesHash);
assert.equal(sha(JSON.stringify(read(`${root}/sources.json`))), manifest.sourcesHash);
assert.equal(sha(JSON.stringify(jobs)), manifest.jobsHash);
function inputFor(c) {
  return { gold: sources[c.paragraphId].gold, goldVersion: 'original-gold-v2', goldHash: sources[c.paragraphId].fileHash,
    initialResponse: c.initial, history: c.history, turn: c.history.length + 1, questionsAsked: c.history.length, maxQuestions: 3 };
}
function commonAxes(raw, arm, c) {
  const axes = arm === 'baseline' ? raw?.axisFeedback?.map(({ axisId, status, reason }) => ({ axisId, status, reason })) : raw?.axes;
  try { return validateDirectJudgment({ axes }, sources[c.paragraphId].gold.centralAxes.map(a => a.id)).axes; }
  catch { return null; }
}
const asks = axes => axes?.some(a => ['UNCLEAR_SERIOUS', 'ERROR'].includes(a.status)) ?? null;
const fullPass = axes => axes?.every(a => a.status === 'PASS') ?? null;
const median = values => { const a = [...values].sort((x, y) => x - y), mid = Math.floor(a.length / 2); return a.length ? a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2 : null; };
function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
  const cost = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const unknown = qs.filter(q => rs.find(r => r.id === q.id)?.estimatedCostUsd == null);
  const arms = Object.fromEntries(['baseline', 'direct'].map(arm => {
    const done = results.filter(r => r.arm === arm), comparable = done.filter(r => r.axes);
    const by = kind => comparable.filter(r => r.kind === kind);
    const target = r => r.axes.find(a => a.axisId === r.targetAxis)?.status;
    return [arm, { attempted: qs.filter(r => r.arm === arm).length, fullContractValid: done.filter(r => !r.error).length,
      comparableRawVerdicts: comparable.length, failures: done.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
      sufficient: { comparable: by('sufficient').length, fullPass: by('sufficient').filter(r => fullPass(r.axes)).length,
        incomplete: by('sufficient').filter(r => !fullPass(r.axes)).length, intervention: by('sufficient').filter(r => asks(r.axes)).length },
      coreGap: { comparable: by('core-gap').length, serious: by('core-gap').filter(r => target(r) === 'UNCLEAR_SERIOUS').length,
        pass: by('core-gap').filter(r => target(r) === 'PASS').length, ok: by('core-gap').filter(r => target(r) === 'UNCLEAR_OK').length,
        error: by('core-gap').filter(r => target(r) === 'ERROR').length },
      errors: { comparable: by('error').length, detected: by('error').filter(r => target(r) === 'ERROR').length },
      medianApiDurationMs: median(rs.filter(r => r.arm === arm && r.response).map(r => r.durationMs)),
      meanOutputTokens: rs.filter(r => r.arm === arm && r.response?.usage).reduce((n, r) => n + r.response.usage.output_tokens, 0) / Math.max(1, rs.filter(r => r.arm === arm && r.response?.usage).length),
    }];
  }));
  const pairs = cases.map(c => ({ caseId: c.id, kind: c.kind, ...Object.fromEntries(['baseline', 'direct'].map(arm => {
    const rr = results.filter(r => r.caseId === c.id && r.arm === arm).sort((a, b) => a.repeat - b.repeat);
    const comparable = rr.filter(r => r.axes);
    const signatures = comparable.map(r => [...r.axes].sort((a, b) => a.axisId.localeCompare(b.axisId)).map(a => `${a.axisId}:${a.status}`).join('|'));
    return [arm, { completed: rr.length, comparable: comparable.length, stableAcrossThree: comparable.length === 3 ? new Set(signatures).size === 1 : null,
      axes: sources[c.paragraphId].gold.centralAxes.map(a => ({ axisId: a.id, statuses: rr.map(r => r.axes?.find(x => x.axisId === a.id)?.status ?? null) })),
      intervention: rr.map(r => asks(r.axes)), fullPass: rr.map(r => fullPass(r.axes)) }];
  })) }));
  const summary = { calls: qs.length, knownEstimatedUsd: cost, unknownCostCalls: unknown.length,
    localAccountedUsd: cost + unknown.reduce((n, q) => n + q.reserveUsd, 0), arms, pairs };
  write('summary.json', summary);
  let doc = '# axis-direct-judgment-v1: 원문·응답·반복 판정\n\n기존 V4 vs 최소 출력 직접 판정. 각3회. 실제 질문 생성 없음. 공통 판정은 검증 전 원출력에서 추출하며 전체 계약 실패를 별도 표시한다.\n\n';
  let rawDoc = '# axis-direct-judgment-v1: 검증 전 원출력\n\n';
  for (const [pid, s] of Object.entries(sources)) {
    doc += `## ${pid}\n\n${s.gold.paragraphText}\n\n`;
    for (const a of s.gold.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
    for (const c of cases.filter(c => c.paragraphId === pid)) {
      doc += `\n### ${c.id}\n\n학생: ${c.initial}\n\n출처: ${c.source}\n\n사전 기대(에이전트 작성): ${JSON.stringify(c.expectedAxes)}\n\n${c.expectationNote}\n\n`;
      for (const h of c.history) doc += `고정 질문: ${h.question.text}\n\n학생 후속 답: ${h.answer}\n\n`;
      for (const arm of ['baseline', 'direct']) for (let repeat = 1; repeat <= 3; repeat++) {
        const r = results.find(r => r.caseId === c.id && r.arm === arm && r.repeat === repeat);
        doc += `#### ${arm} / ${repeat}회\n\n계약: ${r ? r.error ?? '통과' : '미실행'}\n\n`;
        for (const a of r?.axes ?? []) doc += `- ${a.axisId} ${a.status}: ${a.reason}\n`;
        const response = rs.find(x => x.id === r?.id);
        rawDoc += `## ${c.id} / ${arm} / ${repeat}\n\n계약: ${r ? r.error ?? '통과' : '미실행'}\n\n` + '```json\n' + (response?.response?.output_text ?? JSON.stringify(response?.error ?? '미실행')) + '\n```\n\n';
      }
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc); writeFileSync(`${root}/RAW-OUTPUTS.md`, rawDoc);
  return summary;
}
function audit() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), rr = rows('results.jsonl');
  assert.equal(qs.length, 120); assert.equal(rs.length, 120); assert.equal(rr.length, 120);
  assert.equal(new Set(qs.map(q => q.id)).size, 120);
  const labelChanges = [];
  for (const c of cases) for (let repeat = 1; repeat <= 3; repeat++) {
    const pair = ['baseline', 'direct'].map(arm => qs.find(q => q.caseId === c.id && q.repeat === repeat && q.arm === arm));
    assert.equal(pair[0].request.input, pair[1].request.input);
    const strip = ({ instructions: _i, text: _t, ...rest }) => rest;
    assert.deepEqual(strip(pair[0].request), strip(pair[1].request));
    for (const q of pair) {
      assert.equal(sha(q.request.instructions), manifest.instructionHashes[q.arm]);
      assert.equal(q.request.input, buildCentralStoryGatePayload(inputFor(c)));
      const r = rs.find(x => x.id === q.id), result = rr.find(x => x.id === q.id);
      let raw = null; try { raw = JSON.parse(r.response?.output_text); } catch { /* Preserved failed raw. */ }
      assert.deepEqual(result.axes, commonAxes(raw, q.arm, c));
      if (result.baselineCall) {
        assert.equal(result.baselineCall.attempts.length, 1);
        assert.deepEqual(raw, result.baselineCall.decisionAudit.rawResult);
        const a = result.validatedAxes?.map(x => [x.axisId, x.status]), b = result.axes?.map(x => [x.axisId, x.status]);
        if (JSON.stringify(a) !== JSON.stringify(b)) labelChanges.push(q.id);
      }
    }
  }
  const summary = report(); assert.ok(summary.localAccountedUsd <= 2);
  const a = { checkedAt: new Date().toISOString(), calls: qs.length, uniqueCases: cases.length, repeats: 3,
    pairedInputsIdentical: true, differencesLimitedToInstructionsAndOutputSchema: true, frozenHashesMatch: true,
    sourceGoldFilesUnchanged: Object.keys(sources).length, protectedFilesUnchanged: Object.keys(manifest.protectedHashes).length,
    baselineLabelChangesByValidation: labelChanges, retries: 0, feedbackCalls: 0,
    knownEstimatedUsd: summary.knownEstimatedUsd, unknownCostCalls: summary.unknownCostCalls };
  write('execution-audit.json', a); return a;
}
if (phase === 'prepare') { console.log(JSON.stringify({ version: manifest.version, cases: 20, calls: 120, cap: 2, hashes: manifest.instructionHashes })); process.exit(0); }
if (phase === 'report') { const s = report(); console.log(JSON.stringify({ ...s, pairs: undefined })); process.exit(0); }
if (phase === 'audit') { console.log(JSON.stringify(audit())); process.exit(0); }
assert.ok(process.argv.includes('--approved-live'), 'Live approval flag required');
assert.ok(process.env.OPENAI_API_KEY, 'API key unavailable');
const lockPath = `${root}/live.lock`; closeSync(openSync(lockPath, 'wx'));
const priorQ = rows('requests.jsonl'), priorR = rows('responses.jsonl'), priorResults = rows('results.jsonl');
let calls = priorQ.length, accounted = priorQ.reduce((n, q) => n + (priorR.find(r => r.id === q.id)?.estimatedCostUsd ?? q.reserveUsd), 0), stop = false;
const api = new OpenAI({ maxRetries: 0 });
function client(tag, c) {
  return { responses: { parse: async (request, options) => {
    assert.equal(request.instructions, instructions[tag.arm]);
    assert.equal(request.input, buildCentralStoryGatePayload(inputFor(c)));
    assert.equal(request.model, manifest.model); assert.equal(request.max_output_tokens, 4000); assert.equal(request.store, false);
    assert.deepEqual(request.reasoning, { effort: 'medium' }); assert.equal(options.maxRetries, 0);
    const req = { ...request, service_tier: 'default' }, bytes = Buffer.byteLength(JSON.stringify(req)); assert.ok(bytes < 100_000);
    const reserveUsd = ((bytes + 4000) * 2.5 + 4000 * 12) / 1e6;
    if (calls >= 120 || accounted + reserveUsd > 2) { stop = true; throw new Error('LOCAL_BUDGET_STOP'); }
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
  const pending = jobs.filter(j => !priorQ.some(q => q.id === j.id) && !priorResults.some(r => r.id === j.id));
  let cursor = 0;
  await Promise.all([0, 1].map(async () => {
    while (!stop && cursor < pending.length) {
      const tag = pending[cursor++], c = cases.find(c => c.id === tag.caseId), input = inputFor(c);
      let error = null, baselineCall = null, validatedAxes = null;
      try {
        const transport = client(tag, c);
        if (tag.arm === 'baseline') {
          const out = await new MaterialityGateExperiment({ arm: 'baseline', client: transport }).evaluate(input);
          baselineCall = out.call; validatedAxes = out.result.axisFeedback;
        } else validatedAxes = (await new DirectJudgmentExperiment(transport).evaluate(input)).axes;
      } catch (e) { error = String(e); }
      const response = rows('responses.jsonl').find(r => r.id === tag.id);
      let raw = null; try { raw = JSON.parse(response?.response?.output_text); } catch { /* Preserve raw failure. */ }
      const axes = commonAxes(raw, tag.arm, c);
      append('results.jsonl', { ...tag, kind: c.kind, targetAxis: c.targetAxis ?? null, axes, validatedAxes, baselineCall, error });
      console.log(JSON.stringify({ ...tag, axes: axes?.map(a => a.status), error, calls, accounted }));
    }
  }));
} finally { unlinkSync(lockPath); const s = report(); console.log(JSON.stringify({ calls: s.calls, cost: s.knownEstimatedUsd, unknown: s.unknownCostCalls })); }
