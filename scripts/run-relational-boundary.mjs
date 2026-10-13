import { readFileSync, writeFileSync, appendFileSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { boundaryOutcome } from '../packages/pipeline/dist/dialogue-experiment/relational-boundary-experiment.js';

const root = 'docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20';
const runnerPath = 'scripts/run-relational-boundary.mjs';
const phase = process.argv.find(x => x.startsWith('--phase='))?.slice(8) ?? 'check';
assert.ok(['check', 'run', 'report', 'audit'].includes(phase));
const sha = x => createHash('sha256').update(x).digest('hex');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const write = (f, v) => writeFileSync(`${root}/${f}`, JSON.stringify(v, null, 2) + '\n');
const append = (f, v) => appendFileSync(`${root}/${f}`, JSON.stringify(v) + '\n');
const rows = f => existsSync(`${root}/${f}`) ? readFileSync(`${root}/${f}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const manifest = read(`${root}/manifest.json`);
for (const [p, h] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
for (const [p, h] of Object.entries(manifest.artifactHashes)) assert.equal(sha(readFileSync(`${root}/${p}`)), h, p);
const cases = read(`${root}/cases.json`), jobs = read(`${root}/jobs.json`), templates = read(`${root}/request-templates.json`);
const template = job => templates.find(t => t.caseId === job.caseId && t.arm === job.arm).request;
const caseFor = job => cases.find(c => c.id === job.caseId);
const reserve = req => ((Buffer.byteLength(JSON.stringify(req)) + 4000) * 2.5 + req.max_output_tokens * 12) / 1e6;
const canStart = (used, reserved, count) => count < 120 && used + reserved <= 1;
const costOf = u => {
  if (!u || !Number.isFinite(u.input_tokens) || !Number.isFinite(u.output_tokens)) return null;
  const cached = u.input_tokens_details?.cached_tokens ?? 0, writes = u.input_tokens_details?.cache_write_tokens ?? 0;
  return (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * .2 + writes * 2.5 + u.output_tokens * 12) / 1e6;
};
const outcome = (r, c) => {
  let raw = null;
  try { if (r?.response?.status === 'completed') raw = JSON.parse(r.response.output_text); } catch { /* Original response preserved. */ }
  return boundaryOutcome(raw, c.payload, c.targetAxisId, c.side);
};
const signature = (axes, binary = false) => axes ? [...axes].sort((a, b) => a.axisId.localeCompare(b.axisId)).map(a => `${a.axisId}:${binary ? a.status === 'PASS' : a.status}`).join('|') : null;
const median = values => { const a = [...values].sort((x, y) => x - y), i = Math.floor(a.length / 2); return a.length ? a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2 : null; };
assert.equal(jobs.length, 120); assert.equal(new Set(jobs.map(j => j.id)).size, 120);
assert.equal(canStart(.96, .05, 0), false); assert.equal(canStart(.9, .05, 120), false);
assert.equal(canStart(.9, .05, 119), true); assert.equal(costOf(null), null);
for (const c of cases) {
  const [a, b] = ['v1', 'candidate'].map(arm => template({ caseId: c.id, arm }));
  const strip = ({ instructions, ...rest }) => rest;
  assert.deepEqual(strip(a), strip(b));
  assert.equal(a.input, JSON.stringify(c.payload, null, 2));
  assert.equal(a.model, 'gpt-5.6-terra'); assert.equal(a.service_tier, 'default');
  assert.equal(a.max_output_tokens, 4000); assert.deepEqual(a.reasoning, { effort: 'medium' });
  assert.equal(a.store, false); assert.ok(Buffer.byteLength(JSON.stringify(a)) < 100_000);
}
function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  const results = qs.map(q => {
    const c = caseFor(q), r = rs.find(r => r.id === q.id);
    return { id: q.id, caseId: q.caseId, arm: q.arm, repeat: q.repeat, side: c.side, pairId: c.pairId,
      category: c.category, targetAxisId: c.targetAxisId, ...outcome(r, c), transportError: r?.error ?? (r ? null : 'NO_RESPONSE_RECORD') };
  });
  // Derived output is rebuildable; requests and raw responses are append-only.
  writeFileSync(`${root}/results.jsonl`, results.map(r => JSON.stringify(r)).join('\n') + (results.length ? '\n' : ''));
  const arms = Object.fromEntries(['v1', 'candidate'].map(arm => {
    const all = results.filter(r => r.arm === arm), valid = all.filter(r => r.contractValid), raw = rs.filter(r => r.arm === arm);
    const side = s => valid.filter(r => r.side === s);
    const stable = binary => cases.filter(c => {
      const rr = valid.filter(r => r.caseId === c.id); return rr.length === 3 && new Set(rr.map(r => signature(r.axes, binary))).size === 1;
    }).length;
    let matchedPairs = 0;
    for (const pairId of new Set(cases.map(c => c.pairId))) for (let repeat = 1; repeat <= 3; repeat++) {
      const rr = valid.filter(r => r.pairId === pairId && r.repeat === repeat);
      if (rr.length === 2 && rr.every(r => !r.overAcceptance && !r.overHolding && !r.unsupportedError && !r.otherAxisRegression)) matchedPairs++;
    }
    return [arm, { attempted: all.length, contractValid: valid.length, contractFailures: all.length - valid.length,
      missing: { valid: side('insufficient').length, pass: side('insufficient').filter(r => r.overAcceptance).length },
      sufficient: { valid: side('sufficient').length, nonPass: side('sufficient').filter(r => r.overHolding).length },
      unsupportedError: valid.filter(r => r.unsupportedError).length, otherAxisRegression: valid.filter(r => r.otherAxisRegression).length,
      allAxesLabelStableCases: stable(false), allAxesPassBoundaryStableCases: stable(true), matchedPairRepeats: matchedPairs,
      medianApiMs: median(raw.filter(r => r.response?.status === 'completed').map(r => r.durationMs)),
      inputTokens: raw.reduce((n, r) => n + (r.response?.usage?.input_tokens ?? 0), 0),
      outputTokens: raw.reduce((n, r) => n + (r.response?.usage?.output_tokens ?? 0), 0),
      estimatedUsd: raw.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0),
    }];
  }));
  const perCase = cases.map(c => ({ caseId: c.id, targetAxisId: c.targetAxisId, ...Object.fromEntries(['v1', 'candidate'].map(arm => {
    const rr = results.filter(r => r.caseId === c.id && r.arm === arm).sort((a, b) => a.repeat - b.repeat);
    return [arm, rr.map(r => ({ repeat: r.repeat, axes: r.axes, contractError: r.contractError }))];
  })) }));
  const unknown = qs.filter(q => rs.find(r => r.id === q.id)?.estimatedCostUsd == null);
  const total = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const summary = { attempted: qs.length, rawResponses: rs.length, complete: qs.length === 120 && rs.length === 120,
    estimatedUsd: total, unknownCostCalls: unknown.length, localAccountedUsd: total + unknown.reduce((n, q) => n + q.reserveUsd, 0), arms, perCase };
  write('summary.json', summary);
  let review = '# 핵심 관계 누락 대조: 원문·학생 응답·실제 판정\n\n실제 질문 생성 없이 최초 판정만 각3회 비교했다. 충분/불충분 표시는 실행 전 에이전트 기대이며 독립 사람 정답이 아니다.\n\n';
  let rawDoc = '# API 원출력 전체\n\n계약 실패도 삭제하지 않으며 JSONL에 전체 API 응답·사용량·시간을 보존한다.\n\n';
  for (const c of cases) {
    review += `## ${c.id} — ${c.category}\n\n### 원문\n\n${c.payload.paragraphText}\n\n### 중심축\n\n`;
    for (const a of c.payload.centralAxes) review += `- ${a.id}: ${a.description}\n`;
    review += `\n### 학생 응답\n\n> ${c.payload.evidence.initialResponse}\n\n사전 기대: ${JSON.stringify(c.expectedAxes)}\n\n`;
    for (const arm of ['v1', 'candidate']) for (let repeat = 1; repeat <= 3; repeat++) {
      const r = results.find(r => r.caseId === c.id && r.arm === arm && r.repeat === repeat), response = rs.find(x => x.id === r?.id);
      review += `#### ${arm} / ${repeat}회\n\n`;
      if (!r) review += '미실행\n\n';
      else if (!r.contractValid) review += `계약 실패: ${r.contractError}\n\n`;
      else for (const a of r.axes) review += `- ${a.axisId} **${a.status}**: ${a.reason}\n`;
      review += '\n';
      rawDoc += `## ${c.id} / ${arm} / ${repeat}\n\n` + '```json\n' + (response?.response?.output_text ?? JSON.stringify(response?.error ?? '미실행')) + '\n```\n\n';
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, review); writeFileSync(`${root}/RAW-OUTPUTS.md`, rawDoc);
  return summary;
}
if (phase === 'check') {
  console.log(JSON.stringify({ frozenInputsVerified: true, capGuardsChecked: true, plannedCalls: jobs.length,
    maxReserveUsd: Math.max(...templates.map(t => reserve(t.request))), apiCalls: 0 }));
} else if (phase === 'report') {
  const s = report(); console.log(JSON.stringify({ ...s, perCase: undefined }, null, 2));
} else if (phase === 'audit') {
  const s = report(), qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  assert.ok(s.complete); assert.equal(new Set(qs.map(q => q.id)).size, 120); assert.equal(new Set(rs.map(r => r.id)).size, 120);
  qs.forEach((q, i) => { assert.equal(q.id, jobs[i].id); assert.deepEqual(q.request, template(q)); });
  for (const r of rs) assert.equal(r.estimatedCostUsd, r.response ? costOf(r.response.usage) : null);
  assert.ok(s.localAccountedUsd <= 1);
  const execution = read(`${root}/execution-manifest.json`);
  assert.equal(execution.runnerHash, sha(readFileSync(runnerPath)));
  assert.equal(execution.preparationManifestHash, sha(readFileSync(`${root}/manifest.json`)));
  const audit = { at: new Date().toISOString(), physicalCalls: qs.length, uniqueCalls: 120, frozenOrderVerified: true,
    requestsIdenticalToFrozenTemplates: true, onlyInstructionsDiffer: true, protectedHashesVerified: true,
    retries: 0, feedbackCalls: 0, labelNormalization: false, estimatedUsd: s.estimatedUsd,
    localAccountedUsd: s.localAccountedUsd, unknownCostCalls: s.unknownCostCalls,
    responseModels: [...new Set(rs.map(r => r.response?.model))], responseTiers: [...new Set(rs.map(r => r.response?.service_tier))] };
  write('execution-audit.json', audit); console.log(JSON.stringify(audit, null, 2));
} else {
  assert.ok(process.argv.includes('--approved-live'), 'Explicit approval flag required');
  assert.ok(process.env.OPENAI_API_KEY, 'API key missing');
  assert.ok(!process.env.OPENAI_BASE_URL, 'Custom API endpoint not approved');
  const lockPath = `${root}/live.lock`; closeSync(openSync(lockPath, 'wx'));
  try {
    const record = { version: manifest.version, authorization: 'User explicitly approved 120 calls and local USD1 cap.',
      capUsd: 1, maxPhysicalCalls: 120, concurrency: 1, retries: 0,
      runnerHash: sha(readFileSync(runnerPath)), preparationManifestHash: sha(readFileSync(`${root}/manifest.json`)) };
    if (!existsSync(`${root}/execution-manifest.json`)) write('execution-manifest.json', { ...record, approvedAt: new Date().toISOString() });
    else for (const [k, v] of Object.entries(record)) assert.deepEqual(read(`${root}/execution-manifest.json`)[k], v);
    const priorQ = rows('requests.jsonl'), priorR = rows('responses.jsonl');
    let accounted = priorQ.reduce((n, q) => n + (priorR.find(r => r.id === q.id)?.estimatedCostUsd ?? q.reserveUsd), 0), calls = priorQ.length;
    assert.equal(new Set(priorQ.map(q => q.id)).size, priorQ.length);
    const api = new OpenAI({ maxRetries: 0 });
    for (const job of jobs) {
      if (priorQ.some(q => q.id === job.id)) continue; // Never resend ambiguous or failed attempts.
      const req = template(job), reserveUsd = reserve(req);
      if (!canStart(accounted, reserveUsd, calls)) { console.log('LOCAL_BUDGET_STOP'); break; }
      calls++; accounted += reserveUsd;
      append('requests.jsonl', { ...job, index: calls, at: new Date().toISOString(), reserveUsd, request: req });
      const started = performance.now(); let response;
      try { response = await api.responses.create(req, { timeout: 60_000, maxRetries: 0 }); }
      catch (e) {
        append('responses.jsonl', { ...job, durationMs: Math.round(performance.now() - started), estimatedCostUsd: null,
          error: { name: e.name, status: e.status ?? null, code: e.code ?? null, message: String(e.message).slice(0, 1000) } });
        console.log(JSON.stringify({ id: job.id, transportFailure: true, accounted })); break;
      }
      const estimatedCostUsd = costOf(response.usage);
      // Save the original API response before parsing or semantic classification.
      append('responses.jsonl', { ...job, durationMs: Math.round(performance.now() - started), estimatedCostUsd, response });
      if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reserveUsd;
      const result = outcome({ response }, caseFor(job));
      console.log(JSON.stringify({ call: calls, id: job.id, labels: result.axes?.map(a => a.status), contractValid: result.contractValid, accounted }));
      if (estimatedCostUsd !== null && estimatedCostUsd > reserveUsd) throw new Error('Cost exceeded reservation; stop for review');
    }
  } finally { unlinkSync(lockPath); const s = report(); console.log(JSON.stringify({ calls: s.attempted, estimatedUsd: s.estimatedUsd, unknown: s.unknownCostCalls })); }
}
