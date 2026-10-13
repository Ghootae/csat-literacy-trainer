import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { AXIS_CONTEXT_ISOLATION_VERSION, ISOLATION_CASES, isolateAxisInput, isolationOutcome } from '../packages/pipeline/dist/dialogue-experiment/axis-context-isolation.js';

const root = 'docs/experiments/axis-context-isolation-v1-2026-09-20';
const priorRoot = 'docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20';
const phase = process.argv.find(a => a.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = v => createHash('sha256').update(v).digest('hex');
const json = v => JSON.stringify(v, null, 2) + '\n';
const write = (f, v) => writeFileSync(`${root}/${f}`, json(v));
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const prior = read(`${priorRoot}/manifest.json`), priorCases = read(`${priorRoot}/cases.json`), priorTemplates = read(`${priorRoot}/request-templates.json`);
const protectedHashes = { ...prior.protectedHashes,
  ...Object.fromEntries(Object.entries(prior.artifactHashes).map(([p, h]) => [`${priorRoot}/${p}`, h])) };
for (const [p, h] of Object.entries(protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
const cases = ISOLATION_CASES.map(s => ({ ...s, payload: priorCases.find(c => c.id === s.sourceCaseId).payload }));
const cells = [{ arm: 'v1', scope: 'full' }, { arm: 'v1', scope: 'isolated' },
  { arm: 'candidate', scope: 'isolated' }, { arm: 'candidate', scope: 'full' }];
const templates = cases.flatMap(c => cells.map(cell => {
  const original = priorTemplates.find(t => t.caseId === c.sourceCaseId && t.arm === cell.arm).request;
  const request = cell.scope === 'full' ? structuredClone(original) : { ...original, input: isolateAxisInput(original.input, c.targetAxisId) };
  return { caseId: c.id, ...cell, request };
}));
const template = tag => templates.find(t => t.caseId === tag.caseId && t.arm === tag.arm && t.scope === tag.scope).request;
const caseFor = tag => cases.find(c => c.id === tag.caseId);
for (const c of cases) for (const arm of ['v1', 'candidate']) {
  const full = template({ caseId: c.id, arm, scope: 'full' }), single = template({ caseId: c.id, arm, scope: 'isolated' });
  assert.equal(sha(full.instructions), prior.instructionHashes[arm]);
  assert.deepEqual({ ...full, input: single.input }, single);
  const payload = JSON.parse(full.input), isolated = JSON.parse(single.input);
  assert.deepEqual({ ...payload, centralAxes: isolated.centralAxes }, isolated);
  assert.equal(isolated.centralAxes.length, 1); assert.equal(isolated.centralAxes[0].id, c.targetAxisId);
  assert.equal(payload.evidence.initialResponse, isolated.evidence.initialResponse);
  assert.equal(full.model, 'gpt-5.6-terra'); assert.equal(full.service_tier, 'default');
  assert.deepEqual(full.reasoning, { effort: 'medium' }); assert.equal(full.max_output_tokens, 4000); assert.equal(full.store, false);
}
const jobs = [];
for (let repeat = 1; repeat <= 3; repeat++) {
  const order = [...cases.slice(repeat - 1), ...cases.slice(0, repeat - 1)];
  order.forEach((c, i) => {
    const start = (i + repeat - 1) % 4;
    for (const cell of [...cells.slice(start), ...cells.slice(0, start)]) jobs.push({
      id: `${c.id}--${cell.arm}--${cell.scope}--r${repeat}`, caseId: c.id, ...cell, repeat,
    });
  });
}
assert.equal(jobs.length, 60); assert.equal(new Set(jobs.map(j => j.id)).size, 60);
const artifacts = { 'cases.json': json(cases), 'request-templates.json': json(templates), 'jobs.json': json(jobs),
  ...Object.fromEntries(['v1', 'candidate'].map(arm => [`${arm}-instructions.md`, templates.find(t => t.arm === arm).request.instructions + '\n'])) };
for (const p of ['scripts/test-axis-context-isolation.mjs', 'packages/pipeline/src/dialogue-experiment/axis-context-isolation.ts',
  'packages/pipeline/dist/dialogue-experiment/axis-context-isolation.js', 'packages/pipeline/src/dialogue-experiment/axis-context-isolation.test.ts', `${root}/PLAN.md`]) protectedHashes[p] = sha(readFileSync(p));
const fingerprint = { protectedHashes, artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([p, v]) => [p, sha(v)])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  assert.equal(phase, 'prepare', 'Freeze before live execution');
  for (const [p, value] of Object.entries(artifacts)) writeFileSync(`${root}/${p}`, value, { flag: 'wx' });
  writeFileSync(`${root}/manifest.json`, json({ version: AXIS_CONTEXT_ISOLATION_VERSION, preparedAt: new Date().toISOString(),
    ...fingerprint, model: 'gpt-5.6-terra', reasoning: 'medium', serviceTier: 'default', repeats: 3, maxPhysicalCalls: 60,
    localUsdCap: 1, concurrency: 1, retries: 0, feedbackCalls: 0, newPromptRules: 0,
    authorization: 'User requested proceeding with fixed-prompt full-vs-single-axis diagnostic. Agent limits scope to 60 calls and local USD1 ceiling.',
    inputChange: 'centralAxes only; source and entire student response preserved',
    pricing: { input: 2, cachedInput: .2, cacheWrite: 2.5, output: 12, source: 'https://developers.openai.com/api/docs/pricing' },
  }), { flag: 'wx' });
}
const manifest = read(`${root}/manifest.json`);
for (const [k, v] of Object.entries(fingerprint)) assert.deepEqual(v, manifest[k], `Frozen ${k} changed`);
for (const [p, h] of Object.entries(manifest.artifactHashes)) assert.equal(sha(readFileSync(`${root}/${p}`)), h, p);
const reserve = request => ((Buffer.byteLength(JSON.stringify(request)) + 4000) * 2.5 + request.max_output_tokens * 12) / 1e6;
const canStart = (cost, reservation, count) => count < 60 && cost + reservation <= 1;
assert.equal(canStart(.96, .05, 0), false); assert.equal(canStart(0, .05, 60), false); assert.equal(canStart(.9, .05, 59), true);
const costOf = usage => {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0, writes = usage.input_tokens_details?.cache_write_tokens ?? 0;
  return (Math.max(0, usage.input_tokens - cached - writes) * 2 + cached * .2 + writes * 2.5 + usage.output_tokens * 12) / 1e6;
};
const classify = (response, tag) => {
  let raw = null;
  try { if (response?.status === 'completed') raw = JSON.parse(response.output_text); } catch { /* Preserve original raw output. */ }
  const c = caseFor(tag);
  return isolationOutcome(raw, template(tag).input, c.targetAxisId, c.expected);
};
const median = values => { const a = [...values].sort((a, b) => a - b), i = Math.floor(a.length / 2); return a.length ? a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2 : null; };
function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  const results = qs.map(q => ({ id: q.id, caseId: q.caseId, arm: q.arm, scope: q.scope, repeat: q.repeat,
    ...classify(rs.find(r => r.id === q.id)?.response, q) }));
  writeFileSync(`${root}/results.jsonl`, results.map(r => JSON.stringify(r)).join('\n') + (results.length ? '\n' : ''));
  const cellStats = cells.map(cell => {
    const rr = results.filter(r => r.arm === cell.arm && r.scope === cell.scope), raw = rs.filter(r => r.arm === cell.arm && r.scope === cell.scope);
    return { ...cell, attempted: rr.length, contractValid: rr.filter(r => r.contractValid).length,
      targetExpectedMatches: rr.filter(r => r.expectedMatch).length,
      targetStableCases: cases.filter(c => { const r = rr.filter(r => r.caseId === c.id && r.contractValid); return r.length === 3 && new Set(r.map(r => r.targetStatus)).size === 1; }).length,
      medianApiMs: median(raw.filter(r => r.response?.status === 'completed').map(r => r.durationMs)),
      inputTokens: raw.reduce((n, r) => n + (r.response?.usage?.input_tokens ?? 0), 0),
      outputTokens: raw.reduce((n, r) => n + (r.response?.usage?.output_tokens ?? 0), 0),
      estimatedUsd: raw.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0) };
  });
  const perCase = cases.map(c => ({ caseId: c.id, targetAxisId: c.targetAxisId, expected: c.expected,
    cells: cells.map(cell => ({ ...cell, statuses: [1, 2, 3].map(repeat => results.find(r => r.caseId === c.id && r.arm === cell.arm && r.scope === cell.scope && r.repeat === repeat)?.targetStatus ?? null) })) }));
  const unknown = qs.filter(q => rs.find(r => r.id === q.id)?.estimatedCostUsd == null), cost = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const summary = { attempted: qs.length, responses: rs.length, complete: qs.length === 60 && rs.length === 60,
    estimatedUsd: cost, unknownCostCalls: unknown.length, localAccountedUsd: cost + unknown.reduce((n, q) => n + q.reserveUsd, 0), cellStats, perCase };
  write('summary.json', summary);
  let doc = '# 중심축 맥락 격리: 원문·전체 응답·실제 판정\n\n같은 원문과 학생 전체 응답을 유지하고 평가 축 목록만 비교했다. target 축 기대만 집계한다. 질문 생성 없음.\n\n';
  let rawDoc = '# 축 격리 진단의 원출력\n\n';
  for (const c of cases) {
    doc += `## ${c.id}: ${c.note}\n\n### 원문\n\n${c.payload.paragraphText}\n\n### 원래 전체 축\n\n`;
    for (const a of c.payload.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
    doc += `\n### 학생 전체 응답 (모든 조건 동일)\n\n> ${c.payload.evidence.initialResponse}\n\n대상축 ${c.targetAxisId} / 사전 기대 ${c.expected.join(' 또는 ')} / 원사례 ${c.sourceCaseId}\n\n`;
    for (const cell of cells) for (let repeat = 1; repeat <= 3; repeat++) {
      const tag = { caseId: c.id, ...cell, repeat };
      const r = results.find(r => Object.entries(tag).every(([k, v]) => r[k] === v)), response = rs.find(x => x.id === r?.id);
      const heading = `${c.id} / ${cell.arm} / ${cell.scope} / ${repeat}회`;
      doc += `#### ${heading}\n\n`;
      if (!r) doc += '미실행\n';
      else if (!r.contractValid) doc += `계약 실패: ${r.contractError}\n`;
      else for (const a of r.axes) doc += `- ${a.axisId} **${a.status}**: ${a.reason}\n`;
      doc += '\n'; rawDoc += `## ${heading}\n\n` + '```json\n' + (response?.response?.output_text ?? JSON.stringify(response?.error ?? '미실행')) + '\n```\n\n';
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc); writeFileSync(`${root}/RAW-OUTPUTS.md`, rawDoc);
  return summary;
}
if (phase === 'prepare') console.log(JSON.stringify({ version: manifest.version, frozen: true, plannedCalls: 60, templateCount: templates.length, localUsdCap: 1, apiCalls: 0 }));
else if (phase === 'report') console.log(JSON.stringify(report(), null, 2));
else if (phase === 'audit') {
  const s = report(), qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  assert.ok(s.complete); assert.equal(new Set(qs.map(q => q.id)).size, 60); assert.equal(new Set(rs.map(r => r.id)).size, 60);
  qs.forEach((q, i) => { assert.equal(q.id, jobs[i].id); assert.deepEqual(q.request, template(q)); });
  for (const r of rs) assert.equal(r.estimatedCostUsd, r.response ? costOf(r.response.usage) : null);
  assert.ok(s.localAccountedUsd <= 1);
  const audit = { at: new Date().toISOString(), physicalCalls: qs.length, uniqueCalls: 60,
    frozenHashesAndOrderVerified: true, requestsMatchFrozenTemplates: true, promptsUnchangedFromPrior: true,
    sourceAndFullStudentResponseIdenticalAcrossScopes: true, onlyCentralAxesChanged: true, outputSchemaUnchanged: true,
    retries: 0, feedbackCalls: 0, labelNormalization: false, estimatedUsd: s.estimatedUsd, unknownCostCalls: s.unknownCostCalls,
    responseModels: [...new Set(rs.map(r => r.response?.model))], responseTiers: [...new Set(rs.map(r => r.response?.service_tier))] };
  write('execution-audit.json', audit); console.log(JSON.stringify(audit, null, 2));
} else {
  assert.ok(process.argv.includes('--approved-live'), 'Approval flag required');
  assert.ok(process.env.OPENAI_API_KEY, 'API key missing'); assert.ok(!process.env.OPENAI_BASE_URL, 'Custom endpoint not approved');
  const lock = `${root}/live.lock`; closeSync(openSync(lock, 'wx'));
  try {
    const oldQ = rows('requests.jsonl'), oldR = rows('responses.jsonl');
    assert.equal(new Set(oldQ.map(q => q.id)).size, oldQ.length);
    let calls = oldQ.length, accounted = oldQ.reduce((n, q) => n + (oldR.find(r => r.id === q.id)?.estimatedCostUsd ?? q.reserveUsd), 0);
    const api = new OpenAI({ maxRetries: 0 });
    for (const job of jobs) {
      if (oldQ.some(q => q.id === job.id)) continue;
      const request = template(job), reserveUsd = reserve(request);
      assert.ok(Buffer.byteLength(JSON.stringify(request)) < 100_000);
      if (!canStart(accounted, reserveUsd, calls)) { console.log('LOCAL_BUDGET_STOP'); break; }
      calls++; accounted += reserveUsd;
      append('requests.jsonl', { ...job, index: calls, at: new Date().toISOString(), reserveUsd, request });
      const started = performance.now(); let response;
      try { response = await api.responses.create(request, { maxRetries: 0, timeout: 60_000 }); }
      catch (e) {
        append('responses.jsonl', { ...job, durationMs: Math.round(performance.now() - started), estimatedCostUsd: null,
          error: { name: e.name, status: e.status ?? null, code: e.code ?? null, message: String(e.message).slice(0, 1000) } });
        console.log(JSON.stringify({ id: job.id, transportFailure: true, accounted })); break;
      }
      const estimatedCostUsd = costOf(response.usage);
      append('responses.jsonl', { ...job, durationMs: Math.round(performance.now() - started), estimatedCostUsd, response });
      if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reserveUsd;
      const result = classify(response, job);
      console.log(JSON.stringify({ call: calls, id: job.id, target: result.targetStatus, contractValid: result.contractValid, accounted }));
      if (estimatedCostUsd !== null && estimatedCostUsd > reserveUsd) throw new Error('Reservation exceeded; stop for review');
    }
  } finally { unlinkSync(lock); const s = report(); console.log(JSON.stringify({ calls: s.attempted, cost: s.estimatedUsd, unknown: s.unknownCostCalls })); }
}
