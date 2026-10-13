import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { validateDirectJudgment } from '../packages/pipeline/dist/dialogue-experiment/direct-judgment-experiment.js';
import { VERSION, CAP_USD, REPEATS, RULE, buildCases, makeDiagnosticJobs, makeBenchmarkGroups,
  summarizeDiagnostic, reservationUsd, usageCost, canReserveGroup, median } from './lib/axis-counterfactual-context.mjs';

const root = 'docs/experiments/axis-counterfactual-context-v1-2026-09-21';
const oldRoot = 'docs/experiments/axis-context-isolation-v1-2026-09-20';
const sourcesPath = 'docs/experiments/axis-direct-judgment-v1-2026-09-20/sources.json';
const fixturesPath = 'packages/pipeline/experiments/dialogue/counterfactual-context-fixtures-v1.json';
const promptPath = 'packages/pipeline/experiments/dialogue/axis-direct-judgment-prompt-v1.md';
const phase = process.argv.find(a => a.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const json = v => JSON.stringify(v, null, 2) + '\n';
const sha = v => createHash('sha256').update(v).digest('hex');
const write = (name, value) => writeFileSync(`${root}/${name}`, json(value));
const append = (name, value) => appendFileSync(`${root}/${name}`, JSON.stringify(value) + '\n');
const rows = name => existsSync(`${root}/${name}`) ? readFileSync(`${root}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const oldManifest = read(`${oldRoot}/manifest.json`);
const sources = read(sourcesPath), fixtures = read(fixturesPath), cases = buildCases(fixtures, sources);
const base = read(`${oldRoot}/request-templates.json`).find(t => t.arm === 'v1').request;
assert.equal(base.instructions, readFileSync(promptPath, 'utf8').trim());
assert.equal(base.model, 'gpt-5.6-terra'); assert.equal(base.service_tier, 'default');
assert.deepEqual(base.reasoning, { effort: 'medium' }); assert.equal(base.store, false); assert.equal(base.max_output_tokens, 4000);
const caseFor = tag => cases.find(c => c.id === tag.caseId);
const requestFor = (c, axisId) => ({ ...structuredClone(base), input: JSON.stringify({ ...c.payload,
  centralAxes: axisId ? c.payload.centralAxes.filter(a => a.id === axisId) : c.payload.centralAxes }, null, 2) });
const templates = cases.flatMap(c => [null, ...c.payload.centralAxes.map(a => a.id)].map(axisId => ({ caseId: c.id, axisId, request: requestFor(c, axisId) })));
const template = tag => templates.find(t => t.caseId === tag.caseId && t.axisId === tag.axisId).request;
const diagnosticJobs = makeDiagnosticJobs(cases), benchmarkGroups = makeBenchmarkGroups(cases);
const maxCalls = diagnosticJobs.length + benchmarkGroups.reduce((n, g) => n + g.jobs.length, 0);
assert.equal(cases.length, 30); assert.equal(diagnosticJobs.length, 180); assert.equal(maxCalls, 276);
for (const c of cases) {
  for (const a of c.payload.centralAxes) {
    const full = requestFor(c, null), single = requestFor(c, a.id);
    assert.deepEqual({ ...full, input: single.input }, single);
    assert.deepEqual(JSON.parse(single.input), { ...JSON.parse(full.input), centralAxes: [a] });
  }
}
const protectedHashes = { ...oldManifest.protectedHashes,
  ...Object.fromEntries(Object.entries(oldManifest.artifactHashes).map(([p, h]) => [`${oldRoot}/${p}`, h])) };
for (const [p, h] of Object.entries(protectedHashes)) assert.equal(sha(readFileSync(p)), h, `Prior source changed: ${p}`);
for (const f of fixtures) {
  const s = sources[f.paragraphId]; assert.equal(sha(readFileSync(s.path)), s.fileHash);
  protectedHashes[s.path] = s.fileHash;
}
for (const p of [sourcesPath, fixturesPath, promptPath, `${oldRoot}/manifest.json`, 'scripts/test-axis-counterfactual-context.mjs',
  'scripts/lib/axis-counterfactual-context.mjs', 'scripts/lib/axis-counterfactual-context.test.mjs', `${root}/PLAN.md`]) protectedHashes[p] = sha(readFileSync(p));
const artifacts = { 'cases.json': json(cases), 'request-templates.json': json(templates), 'diagnostic-jobs.json': json(diagnosticJobs),
  'benchmark-groups.json': json(benchmarkGroups), 'v1-instructions.md': base.instructions + '\n' };
const fingerprint = { protectedHashes, artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([p, v]) => [p, sha(v)])) };
mkdirSync(root, { recursive: true });
if (!existsSync(`${root}/manifest.json`)) {
  assert.equal(phase, 'prepare');
  for (const [p, v] of Object.entries(artifacts)) writeFileSync(`${root}/${p}`, v, { flag: 'wx' });
  writeFileSync(`${root}/manifest.json`, json({ version: VERSION, preparedAt: new Date().toISOString(), ...fingerprint,
    authorization: 'User approved entire staged plan; agent sets local USD2 ceiling. Not production authorization.',
    model: base.model, reasoning: base.reasoning, tier: base.service_tier, localUsdCap: CAP_USD, maxPhysicalCalls: maxCalls,
    diagnosticCalls: 180, conditionalBenchmarkCalls: 96, repeats: REPEATS, diagnosticConcurrency: 1, maximumBenchmarkConcurrency: 3,
    retries: 0, feedbackCalls: 0, benchmarkRule: RULE,
    pricing: { input: 2, cached: .2, cacheWrite: 2.5, output: 12, source: 'https://developers.openai.com/api/docs/pricing' },
  }), { flag: 'wx' });
}
const manifest = read(`${root}/manifest.json`);
assert.deepEqual(fingerprint, { protectedHashes: manifest.protectedHashes, artifactHashes: manifest.artifactHashes }, 'Frozen inputs/code changed');
for (const [p, h] of Object.entries(manifest.artifactHashes)) assert.equal(sha(readFileSync(`${root}/${p}`)), h, p);

function classify(q, record) {
  const c = caseFor(q);
  const tag = { id: q.id, stage: q.stage, caseId: c.id, setId: c.setId, kind: c.kind, context: c.context,
    scope: q.scope, axisId: q.axisId, repeat: q.repeat, groupId: q.groupId ?? null };
  try {
    assert.equal(record?.response?.status, 'completed');
    const raw = JSON.parse(record.response.output_text);
    const axes = validateDirectJudgment(raw, JSON.parse(q.request.input).centralAxes.map(a => a.id)).axes;
    const targetStatus = axes.find(a => a.axisId === c.targetAxisId)?.status ?? null;
    return { ...tag, contractValid: true, contractError: null, axes, targetStatus,
      expectedMatch: targetStatus === null ? null : c.expected.includes(targetStatus) };
  } catch (e) {
    return { ...tag, contractValid: false, contractError: String(e), axes: null, targetStatus: null, expectedMatch: null };
  }
}

function report() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), starts = rows('group-starts.jsonl'), ends = rows('group-ends.jsonl');
  const results = qs.map(q => classify(q, rs.find(r => r.id === q.id)));
  writeFileSync(`${root}/results.jsonl`, results.map(r => JSON.stringify(r)).join('\n') + (results.length ? '\n' : ''));
  const diagnostic = summarizeDiagnostic(results, cases);
  const benchmark = benchmarkGroups.map(g => {
    const end = ends.find(e => e.id === g.id), begin = starts.find(e => e.id === g.id);
    const rr = g.jobs.map(j => results.find(r => r.id === j.id));
    const axes = rr.flatMap(r => r?.axes ?? []).sort((a, b) => a.axisId.localeCompare(b.axisId));
    let contractValid = Boolean(end && rr.every(r => r?.contractValid));
    if (contractValid) {
      try { validateDirectJudgment({ axes }, caseFor(g).payload.centralAxes.map(a => a.id)); } catch { contractValid = false; }
    }
    const raw = g.jobs.map(j => rs.find(r => r.id === j.id));
    return { id: g.id, caseId: g.caseId, mode: g.mode, repeat: g.repeat, started: Boolean(begin), completed: Boolean(end), contractValid,
      wallMs: end?.wallMs ?? null, physicalCalls: raw.filter(Boolean).length, axes,
      estimatedUsd: raw.length && raw.every(r => r?.estimatedCostUsd != null) ? raw.reduce((n, r) => n + r.estimatedCostUsd, 0) : null,
      inputTokens: raw.reduce((n, r) => n + (r?.response?.usage?.input_tokens ?? 0), 0),
      cachedTokens: raw.reduce((n, r) => n + (r?.response?.usage?.input_tokens_details?.cached_tokens ?? 0), 0),
      outputTokens: raw.reduce((n, r) => n + (r?.response?.usage?.output_tokens ?? 0), 0) };
  });
  const benchmarkStats = ['full', 'parallel'].map(mode => {
    const rr = benchmark.filter(g => g.mode === mode && g.completed), times = rr.map(g => g.wallMs).sort((a, b) => a - b);
    return { mode, completedParagraphs: rr.length, contractValid: rr.filter(g => g.contractValid).length,
      medianWallMs: median(times), meanWallMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      p95WallMs: times.length ? times[Math.ceil(times.length * .95) - 1] : null, maximumWallMs: times.at(-1) ?? null,
      estimatedUsd: rr.reduce((n, g) => n + (g.estimatedUsd ?? 0), 0), unknownCostParagraphs: rr.filter(g => g.estimatedUsd == null).length,
      costPerParagraph: rr.length && rr.every(g => g.estimatedUsd != null) ? rr.reduce((n, g) => n + g.estimatedUsd, 0) / rr.length : null,
      inputTokens: rr.reduce((n, g) => n + g.inputTokens, 0), cachedTokens: rr.reduce((n, g) => n + g.cachedTokens, 0),
      outputTokens: rr.reduce((n, g) => n + g.outputTokens, 0) };
  });
  const unknown = qs.filter(q => rs.find(r => r.id === q.id)?.estimatedCostUsd == null);
  const cost = rs.reduce((n, r) => n + (r.estimatedCostUsd ?? 0), 0);
  const summary = { calls: qs.length, responses: rs.length, estimatedUsd: cost, unknownCostCalls: unknown.length,
    localAccountedUsd: cost + unknown.reduce((n, q) => n + q.reserveUsd, 0), diagnostic,
    benchmarkStatus: diagnostic.counts.full.attempted + diagnostic.counts.isolated.attempted !== 180 ? 'DIAGNOSTIC_INCOMPLETE' :
      !diagnostic.benchmarkGate.proceed ? 'SKIPPED_GATE_NOT_MET' : benchmark.every(g => g.completed) ? 'COMPLETED' : 'ELIGIBLE_NOT_COMPLETE',
    benchmarkStats, benchmark };
  write('summary.json', summary);
  let doc = '# 반사실적 축 맥락 대조: 원문·응답·판정\n\n기대값은 에이전트 사전 작성이며 독립 사람 심사 결과가 아니다. 단일 축에도 원문·학생 답 전체를 유지했다.\n\n';
  for (const f of fixtures) {
    const first = cases.find(c => c.setId === f.id);
    doc += `## ${f.id}: ${f.paragraphId}\n\n### 원문\n\n${first.payload.paragraphText}\n\n### 중심축\n\n`;
    for (const a of first.payload.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
    doc += `\n대상 축: ${f.targetAxisId}\n\n범위 사전 검토: ${f.scopeReview}\n\n`;
    for (const c of cases.filter(c => c.setId === f.id)) {
      doc += `### ${c.id}\n\n> ${c.payload.evidence.initialResponse}\n\n대상 축 사전 기대: ${c.expected.join(' / ')}\n\n`;
      for (const scope of ['full', 'isolated']) for (let repeat = 1; repeat <= REPEATS; repeat++) {
        const r = results.find(r => r.stage === 'diagnostic' && r.caseId === c.id && r.scope === scope && r.repeat === repeat);
        doc += `#### ${scope} / ${repeat}회\n\n`;
        if (!r) doc += '미실행\n';
        else if (!r.contractValid) doc += `계약 실패: ${r.contractError}\n`;
        else for (const a of r.axes) doc += `- ${a.axisId} **${a.status}**: ${a.reason}\n`;
        doc += '\n';
      }
    }
  }
  if (benchmark.some(g => g.started)) {
    doc += '\n## 조건부 문단 성능 측정\n\n';
    for (const g of benchmark.filter(g => g.started)) {
      doc += `### ${g.id}\n\n완료 ${g.completed}, 계약 ${g.contractValid}, wall ${g.wallMs}ms, 추정 $${g.estimatedUsd}\n\n`;
      for (const a of g.axes) doc += `- ${a.axisId} **${a.status}**: ${a.reason}\n`;
      doc += '\n';
    }
  }
  writeFileSync(`${root}/REVIEW-PACKET.md`, doc);
  writeFileSync(`${root}/RAW-OUTPUTS.md`, '# API 원출력\n\n' + rs.map(r => `## ${r.id}\n\n\`\`\`json\n${r.response?.output_text ?? JSON.stringify(r.error)}\n\`\`\`\n`).join('\n'));
  return summary;
}

function audit() {
  const s = report(), qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  assert.equal(new Set(qs.map(q => q.id)).size, qs.length); assert.equal(rs.length, qs.length);
  assert.equal(new Set(rs.map(r => r.id)).size, rs.length);
  const expectedJobs = [...diagnosticJobs, ...(s.diagnostic.benchmarkGate.proceed ? benchmarkGroups.flatMap(g => g.jobs) : [])];
  assert.equal(qs.length, expectedJobs.length, 'Incomplete execution');
  qs.forEach((q, i) => { assert.equal(q.id, expectedJobs[i].id); assert.deepEqual(q.request, template(q)); });
  for (const r of rs) assert.equal(r.estimatedCostUsd, r.response ? usageCost(r.response.usage) : null);
  for (const f of fixtures) for (const kind of ['sufficient', 'insufficient']) {
    const cc = cases.filter(c => c.setId === f.id && c.kind === kind);
    assert.equal(new Set(cc.map(c => c.targetText)).size, 1);
    cc.forEach(c => assert.ok(c.payload.evidence.initialResponse.includes(c.targetText)));
  }
  if (s.diagnostic.benchmarkGate.proceed) assert.ok(s.benchmark.every(g => g.completed));
  assert.ok(s.localAccountedUsd <= CAP_USD);
  const out = { checkedAt: new Date().toISOString(), uniqueCalls: qs.length, diagnosticCalls: 180,
    benchmarkCalls: qs.filter(q => q.stage === 'benchmark').length, benchmarkStatus: s.benchmarkStatus,
    frozenFilesVerified: Object.keys(manifest.protectedHashes).length, frozenOrderAndRequests: true,
    v1PromptAndSchemaUnchanged: true, fullStudentResponseRetained: true, onlyGoldAxisListVariesAcrossScopes: true,
    targetUtteranceIdenticalAcrossContexts: true, rawLabelChanges: 0, retries: 0, feedbackCalls: 0,
    estimatedUsd: s.estimatedUsd, unknownCostCalls: s.unknownCostCalls,
    responseModels: [...new Set(rs.map(r => r.response?.model))], responseTiers: [...new Set(rs.map(r => r.response?.service_tier))] };
  write('execution-audit.json', out); return out;
}

if (phase === 'prepare') console.log(JSON.stringify({ version: VERSION, frozen: true, cases: cases.length,
  diagnosticCalls: 180, conditionalBenchmarkCalls: 96, localUsdCap: CAP_USD, apiCalls: 0 }));
else if (phase === 'report') { const s = report(); console.log(JSON.stringify({ ...s, benchmark: undefined }, null, 2)); }
else if (phase === 'audit') console.log(JSON.stringify(audit(), null, 2));
else {
  assert.ok(process.argv.includes('--approved-live')); assert.ok(process.env.OPENAI_API_KEY, 'API key missing');
  assert.ok(!process.env.OPENAI_BASE_URL, 'Custom API endpoint not authorized');
  const lock = `${root}/live.lock`; closeSync(openSync(lock, 'wx'));
  try {
    const oldQ = rows('requests.jsonl'), oldR = rows('responses.jsonl');
    assert.equal(oldQ.length, oldR.length, 'Uncertain old request: review instead of retry');
    assert.ok(oldR.every(r => !r.error), 'Previous transport failure: review required');
    assert.ok(rows('group-starts.jsonl').every(g => rows('group-ends.jsonl').some(e => e.id === g.id)), 'Incomplete group: do not replay');
    let count = oldQ.length, accounted = oldQ.reduce((n, q) => n + (oldR.find(r => r.id === q.id)?.estimatedCostUsd ?? q.reserveUsd), 0);
    const seen = new Set(oldQ.map(q => q.id)); assert.equal(seen.size, count);
    const api = new OpenAI({ maxRetries: 0 });
    async function executeGroup(group) {
      if (group.jobs.every(j => seen.has(j.id))) return true;
      assert.ok(group.jobs.every(j => !seen.has(j.id)), 'Partial group cannot be retried');
      const requests = group.jobs.map(template);
      if (!canReserveGroup(accounted, count, requests, maxCalls)) { console.log('LOCAL_BUDGET_STOP'); return false; }
      const started = performance.now();
      append('group-starts.jsonl', { id: group.id, stage: group.jobs[0].stage, at: new Date().toISOString(), jobs: group.jobs.map(j => j.id) });
      const reservations = requests.map(reservationUsd);
      accounted += reservations.reduce((a, b) => a + b, 0);
      // Reserve and persist every member before dispatch; concurrent calls cannot overspend the group ceiling.
      group.jobs.forEach((job, i) => {
        seen.add(job.id); count++;
        append('requests.jsonl', { ...job, index: count, at: new Date().toISOString(), reserveUsd: reservations[i], request: requests[i] });
      });
      const completed = await Promise.all(group.jobs.map(async (job, i) => {
        const callStart = performance.now(); let response;
        try { response = await api.responses.create(requests[i], { maxRetries: 0, timeout: 60_000 }); }
        catch (e) {
          const record = { ...job, durationMs: Math.round(performance.now() - callStart), estimatedCostUsd: null,
            error: { name: e.name, status: e.status ?? null, code: e.code ?? null } };
          append('responses.jsonl', record); return { failed: true, result: classify({ ...job, request: requests[i] }, record) };
        }
        const estimatedCostUsd = usageCost(response.usage);
        const record = { ...job, durationMs: Math.round(performance.now() - callStart), estimatedCostUsd, response };
        append('responses.jsonl', record);
        if (estimatedCostUsd !== null) accounted += estimatedCostUsd - reservations[i];
        return { failed: estimatedCostUsd !== null && estimatedCostUsd > reservations[i],
          result: classify({ ...job, request: requests[i] }, record) };
      }));
      const axes = completed.flatMap(c => c.result.axes ?? []).sort((a, b) => a.axisId.localeCompare(b.axisId));
      let mergedValid = completed.every(c => c.result.contractValid);
      if (group.jobs[0].stage === 'benchmark' && mergedValid) {
        try { validateDirectJudgment({ axes }, caseFor(group).payload.centralAxes.map(a => a.id)); } catch { mergedValid = false; }
      }
      const wallMs = Math.round(performance.now() - started);
      append('group-ends.jsonl', { id: group.id, at: new Date().toISOString(), wallMs, mergedValid });
      console.log(JSON.stringify({ calls: count, group: group.id, labels: completed.map(c => c.result.targetStatus), wallMs, accounted }));
      return completed.every(c => !c.failed);
    }
    let running = true;
    for (const job of diagnosticJobs) {
      if (!await executeGroup({ id: job.id, caseId: job.caseId, jobs: [job] })) { running = false; break; }
    }
    const s = report(); console.log(JSON.stringify({ benchmarkGate: s.diagnostic.benchmarkGate }));
    if (running && s.diagnostic.benchmarkGate.proceed) {
      for (const group of benchmarkGroups) if (!await executeGroup(group)) break;
    }
  } finally {
    unlinkSync(lock);
    const s = report(); console.log(JSON.stringify({ calls: s.calls, cost: s.estimatedUsd, unknown: s.unknownCostCalls, benchmarkStatus: s.benchmarkStatus }));
  }
}
