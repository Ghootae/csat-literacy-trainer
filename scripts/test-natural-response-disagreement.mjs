import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { DIRECT_JUDGMENT_PROMPT_PATH, DirectJudgmentSchema, validateDirectJudgment } from '../packages/pipeline/dist/dialogue-experiment/direct-judgment-experiment.js';
import { sha, selectRecords, casesFromRecord, compareAxes, reviewSelection, needsQuestion } from './lib/natural-response-disagreement.mjs';
import { reservationUsd, usageCost, median } from './lib/axis-counterfactual-context.mjs';

const ROOT = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
const phase = process.argv.find(x => x.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const write = (name, value) => writeFileSync(`${ROOT}/${name}`, JSON.stringify(value, null, 2) + '\n');
const append = (name, value) => appendFileSync(`${ROOT}/${name}`, JSON.stringify(value) + '\n');
const rows = name => existsSync(`${ROOT}/${name}`) ? readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const inputFor = (c, sources) => ({ gold: sources[c.paragraphId].gold, goldVersion: 'original-gold-v2',
  goldHash: sources[c.paragraphId].fileHash, initialResponse: c.initialResponse, history: c.history,
  turn: c.turn, questionsAsked: c.history.length, maxQuestions: 3,
  // No previous model label; retain only already displayed help, never future turns.
  ...(c.revealedAxisContent.length ? { revealedAxisContent: c.revealedAxisContent } : {}),
  ...(c.shownSourceGuides.length ? { shownSourceGuides: c.shownSourceGuides } : {}) });
const instructions = {
  v4: loadCentralStoryGatePrompt('v4') + '\n\n' + readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md', 'utf8').trim() +
    '\n\n' + readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md', 'utf8').trim(),
  direct: readFileSync(DIRECT_JUDGMENT_PROMPT_PATH, 'utf8').trim(),
};
function requestFor(c, arm, sources) {
  return { model: 'gpt-5.6-terra', instructions: instructions[arm], input: buildCentralStoryGatePayload(inputFor(c, sources)),
    reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 4000, store: false,
    text: { format: arm === 'v4' ? zodTextFormat(CentralStoryGateV4ErrorClaimsResultSchema, 'central_story_gate_result') :
      zodTextFormat(DirectJudgmentSchema, 'axis_direct_judgment') } };
}
if (phase === 'prepare') {
  assert.ok(!existsSync(`${ROOT}/manifest.json`), 'Already frozen; do not overwrite');
  mkdirSync(ROOT, { recursive: true });
  const logPath = '.omc/logs/dialogue-experiment/sessions.jsonl';
  const lines = readFileSync(logPath, 'utf8').trim().split('\n');
  const records = selectRecords(lines);
  const cases = records.flatMap(casesFromRecord).map((c, i) => ({ id: `N${String(i + 1).padStart(2, '0')}`, ...c }));
  assert.equal(cases.length, 45); assert.equal(cases.filter(c => c.stratum === 'initial').length, 31);
  const sources = {};
  for (const pid of new Set(cases.map(c => c.paragraphId))) {
    const path = `packages/pipeline/fixtures/experiments/dialogue/gold-v2/${pid}.json`;
    const passagePath = `packages/pipeline/fixtures/experiments/dialogue/passages/${pid.replace(/-p\d+$/, '')}.json`;
    const gold = read(path), passage = read(passagePath);
    assert.equal(gold.paragraphText, passage.paragraphs.find(p => p.paragraphId === pid).text);
    sources[pid] = { path, fileHash: sha(readFileSync(path)), passagePath, title: passage.title, gold };
  }
  const jobs = cases.flatMap((c, i) => (i % 2 ? ['direct', 'v4'] : ['v4', 'direct']).map(arm =>
    ({ id: `${c.id}-${arm}`, caseId: c.id, arm, request: requestFor(c, arm, sources) })));
  write('records.json', records); write('cases.json', cases); write('sources.json', sources); write('jobs.json', jobs);
  for (const arm of ['v4', 'direct']) writeFileSync(`${ROOT}/${arm}-instructions.md`, instructions[arm] + '\n');
  const protectedPaths = [
    'scripts/test-natural-response-disagreement.mjs', 'scripts/lib/natural-response-disagreement.mjs',
    'scripts/natural-response-disagreement.test.mjs', 'scripts/lib/axis-counterfactual-context.mjs',
    'scripts/build-actual-student-cycle-review.mjs',
    'docs/experiments/user-direct-full-cycle-six-2026-09-11/REVIEW-PACKET.md',
    'docs/review/gongsun-p1-personal-overhold-2026-09-20.md',
    DIRECT_JUDGMENT_PROMPT_PATH,
    ...['central-story-gate-prompt-v4', 'current-claims-recording-v1', 'error-claims-recording-v1'].map(x => `packages/pipeline/experiments/dialogue/${x}.md`),
    ...['gate', 'claim-recording', 'error-recording', 'schema', 'direct-judgment-experiment'].flatMap(x => [
      `packages/pipeline/src/dialogue-experiment/${x}.ts`, `packages/pipeline/dist/dialogue-experiment/${x}.js`]),
    ...Object.values(sources).flatMap(s => [s.path, s.passagePath]),
    ...['records.json', 'cases.json', 'sources.json', 'jobs.json', 'v4-instructions.md', 'direct-instructions.md', 'PLAN.md'].map(x => `${ROOT}/${x}`),
  ];
  write('manifest.json', { version: 'natural-response-disagreement-v1', preparedAt: new Date().toISOString(),
    authorization: 'User approved natural-response disagreement mining. Agent-set USD2 local cap; no production change.',
    sessions: 31, uniqueParagraphs: Object.keys(sources).length, cases: 45, initial: 31, followup: 14,
    repeats: 1, maxCalls: 90, maxEstimatedUsd: 2, concurrency: 2, retries: 0, feedbackCalls: 0,
    sourceLog: logPath, sourceLogHashAtSelection: sha(readFileSync(logPath)), totalLogRows: lines.length,
    excludedLogRows: lines.length - records.length, selection: 'Only two source-confirmed real-use cohorts; all other rows excluded, not assumed synthetic.',
    replay: 'Cold cumulative re-judgment: previousAxisStates=null. Historic questions/help retained. Not a new dialogue or state-transition/retry test.',
    reviewPolicy: 'All raw disagreements and contract failures, plus up to 3 hash-selected agreements per initial/followup stratum. Human labels remain null.',
    protectedHashes: Object.fromEntries([...new Set(protectedPaths)].map(p => [p, sha(readFileSync(p))])),
    instructionHashes: Object.fromEntries(Object.entries(instructions).map(([k,v]) => [k, sha(v)])),
    pricesPerMillion: { input: 2, cachedInput: .2, cacheWrite: 2.5, output: 12 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing' });
}
const manifest = read(`${ROOT}/manifest.json`);
for (const [p, h] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(p)), h, `Frozen file changed: ${p}`);
const cases = read(`${ROOT}/cases.json`), sources = read(`${ROOT}/sources.json`), jobs = read(`${ROOT}/jobs.json`);
for (const j of jobs) assert.deepEqual(j.request, requestFor(cases.find(c => c.id === j.caseId), j.arm, sources));

function interpret(j, response) {
  const c = cases.find(c => c.id === j.caseId), ids = sources[c.paragraphId].gold.centralAxes.map(a => a.id);
  let raw = null, rawAxes = null, validatedAxes = null, validatedResult = null, normalizationEvents = [], contractError = null;
  try {
    assert.equal(response?.status, 'completed', 'API did not complete');
    raw = JSON.parse(response.output_text);
    try { rawAxes = validateDirectJudgment({ axes: j.arm === 'v4' ? raw.axisFeedback?.map(({axisId,status,reason}) => ({axisId,status,reason})) : raw.axes }, ids).axes; } catch { /* Preserve raw even if not comparable. */ }
    if (j.arm === 'v4') {
      const validated = validateCentralStoryGateResult(CentralStoryGateV4ErrorClaimsResultSchema.parse(raw), inputFor(c, sources));
      validatedResult = validated.result; normalizationEvents = validated.normalizationEvents;
      validatedAxes = validatedResult.axisFeedback.map(({axisId,status,reason}) => ({axisId,status,reason}));
    } else { validatedResult = validateDirectJudgment(raw, ids); validatedAxes = validatedResult.axes; }
  } catch (e) { contractError = String(e.message ?? e); }
  return { id: j.id, caseId: j.caseId, arm: j.arm, raw, rawAxes, validatedAxes, validatedResult, normalizationEvents, contractError };
}
function ledger() {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl');
  return { calls: qs.length, knownEstimatedUsd: rs.reduce((n,r) => n + (r.costUsd ?? 0), 0),
    accountedUsd: qs.reduce((n,q) => n + (rs.find(r => r.id === q.id)?.costUsd ?? q.reserveUsd), 0),
    unknownUsage: qs.filter(q => rs.find(r => r.id === q.id)?.costUsd == null).length };
}
const quote = t => t.split('\n').map(l => `> ${l}`).join('\n');
function stimulus(c) {
  const s = sources[c.paragraphId];
  let out = `### ${s.title} / ${c.paragraphId}\n\n${quote(s.gold.paragraphText)}\n\n중심축\n\n`;
  for (const a of s.gold.centralAxes) out += `- ${a.id}: ${a.description}\n`;
  out += `\n학생 최초 응답\n\n${quote(c.initialResponse)}\n\n`;
  for (const [i,h] of c.history.entries()) out += `이전 질문 ${i+1}\n\n${quote(h.question.text)}\n\n학생 답변\n\n${quote(h.answer)}\n\n`;
  if (c.revealedAxisContent.length) out += `이미 화면에 공개된 도움(학생 발화 아님)\n\n${c.revealedAxisContent.map(x => `- ${x.axisId}, ${x.turn}턴: ${x.text}`).join('\n')}\n\n`;
  if (c.shownSourceGuides.length) out += `이미 제공된 원문 안내\n\n${JSON.stringify(c.shownSourceGuides)}\n\n`;
  return out;
}
function report() {
  const results = rows('results.jsonl'), responses = rows('responses.jsonl');
  const comparisons = cases.map(c => {
    const a = results.find(r => r.id === `${c.id}-v4`), b = results.find(r => r.id === `${c.id}-direct`);
    return { caseId: c.id, stratum: c.stratum, cohort: c.cohort,
      raw: compareAxes(a?.rawAxes, b?.rawAxes, c.history.length),
      validated: compareAxes(a?.validatedAxes, b?.validatedAxes, c.history.length),
      contractFailure: !a || !b || !!a.contractError || !!b.contractError };
  });
  const counts = subset => ({ cases: subset.length, rawComparable: subset.filter(x => x.raw.comparable).length,
    rawDisagreements: subset.filter(x => x.raw.comparable && !x.raw.same).length,
    rawAxisInterventionChanges: subset.filter(x => x.raw.axisInterventionChange).length,
    rawParagraphInterventionChanges: subset.filter(x => x.raw.paragraphInterventionChange).length,
    rawErrorBoundaryChanges: subset.filter(x => x.raw.errorBoundaryChange).length,
    validatedComparable: subset.filter(x => x.validated.comparable).length,
    contractFailurePairs: subset.filter(x => x.contractFailure).length });
  const selection = reviewSelection(comparisons, cases);
  const summary = { ...ledger(), counts: counts(comparisons), byStratum: Object.fromEntries(['initial','followup'].map(s => [s, counts(comparisons.filter(x => x.stratum === s))])),
    byCohort: Object.fromEntries([...new Set(cases.map(c=>c.cohort))].map(s=>[s, counts(comparisons.filter(x=>x.cohort===s))])),
    arms: Object.fromEntries(['v4','direct'].map(arm => {
      const rs = results.filter(r => r.arm === arm), api = responses.filter(r => r.arm === arm);
      return [arm, { calls: rs.length, valid: rs.filter(r=>!r.contractError).length,
        rawQuestionCandidate: rs.filter(r=>r.rawAxes && needsQuestion(r.rawAxes)).length,
        rawAllPass: rs.filter(r=>r.rawAxes?.every(a=>a.status==='PASS')).length,
        medianApiMs: median(api.filter(r=>r.response).map(r=>r.durationMs)),
        estimatedUsd: api.reduce((n,r)=>n+(r.costUsd??0),0) }];
    })), selection, comparisons, humanReviewStatus: 'pending; no independently adjudicated correctness labels' };
  write('summary.json', summary);
  const key = selection.blindOrder.map((caseId,i) => ({ reviewId: `R${String(i+1).padStart(2,'0')}`, caseId,
    category: selection.agreement.includes(caseId) ? 'sampled-agreement' : 'disagreement-or-contract',
    comparison: comparisons.find(c=>c.caseId===caseId) }));
  write('review-key.json', key);
  // Never overwrite a filled-in human review form during report/audit regeneration.
  if (!existsSync(`${ROOT}/human-review.json`)) write('human-review.json', key.map(k=>({reviewId:k.reviewId,
    axes: sources[cases.find(c=>c.id===k.caseId).paragraphId].gold.centralAxes.map(a=>({axisId:a.id,
      expectedStatus:null, shouldAsk:null, explicitError:null, reason:null})), reviewer:null })));
  let blind = '# 자연 응답 판정 검토 — 블라인드\n\n모델 판정·불일치 여부는 숨겼습니다. 중심축 기준으로 각 축의 PASS / UNCLEAR_OK / UNCLEAR_SERIOUS / ERROR와 추가 질문 필요성을 먼저 판단해 주세요. 애매하면 경계로 남겨도 됩니다. 후속 답변에는 과거 질문의 도움이 있습니다.\n\n';
  let keyDoc = '# 판정 비교 — 블라인드 검토 후 열기\n\nV4와 direct-v1 원판정/검증 결과입니다. 어느 쪽이 정답인지는 아직 사람 검토 전입니다. SERIOUS/ERROR는 질문 후보이지 강제 진행 차단이 아닙니다.\n\n';
  for (const k of key) {
    const c = cases.find(c=>c.id===k.caseId);
    blind += `## ${k.reviewId}\n\n${stimulus(c)}판단 기록: 축별 상태 / 추가 질문 필요 여부 / 근거\n\n---\n\n`;
    keyDoc += `## ${k.reviewId} / ${k.caseId}\n\n${k.category}\n\n${stimulus(c)}`;
    for (const arm of ['v4','direct']) {
      const r = results.find(x=>x.id===`${c.id}-${arm}`);
      keyDoc += `#### ${arm}\n\n계약: ${r?.contractError ?? '유효'}\n\n`;
      for (const a of r?.rawAxes ?? []) keyDoc += `- ${a.axisId} **${a.status}**: ${a.reason}\n`;
      keyDoc += `\n검증 후: ${r?.validatedAxes ? r.validatedAxes.map(a=>`${a.axisId}=${a.status}`).join(', ') : '계약 실패·최종 판정 없음'}\n\n`;
    }
  }
  writeFileSync(`${ROOT}/BLIND-REVIEW.md`, blind); writeFileSync(`${ROOT}/COMPARISON-KEY.md`, keyDoc);
  writeFileSync(`${ROOT}/ALL-OUTPUTS.md`, '# 전체 45시점의 원문·응답·판정\n\n' + cases.map(c =>
    `## ${c.id}\n\n${stimulus(c)}` + ['v4','direct'].map(arm=> {
      const r = results.find(x=>x.id===`${c.id}-${arm}`);
      return `#### ${arm}\n\n계약: ${r?.contractError ?? '유효'}\n\n` + '```json\n' + JSON.stringify(r?.raw ?? null,null,2) + '\n```\n\n';
    }).join('')).join(''));
  return summary;
}
if (phase === 'run') {
  assert.ok(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY missing');
  const lock = `${ROOT}/live.lock`, fd = openSync(lock, 'wx'); closeSync(fd);
  try {
    const client = new OpenAI({ maxRetries: 0, timeout: 60000 });
    for (const c of cases) {
      const pending = jobs.filter(j=>j.caseId===c.id && !rows('requests.jsonl').some(q=>q.id===j.id));
      if (!pending.length) continue;
      const current = ledger(), reserve = pending.reduce((n,j)=>n+reservationUsd(j.request),0);
      assert.ok(current.calls + pending.length <= manifest.maxCalls && current.accountedUsd + reserve <= manifest.maxEstimatedUsd, 'Local cap stops run before call');
      for (const j of pending) append('requests.jsonl', { ...j, sentAt: new Date().toISOString(), reserveUsd: reservationUsd(j.request) });
      await Promise.all(pending.map(async j => {
        const start = performance.now(); let response = null, transportError = null;
        try { response = await client.responses.create(j.request, { maxRetries: 0, timeout: 60000 }); }
        catch(e) { transportError = { name: e.name, status: e.status ?? null, code: e.code ?? null }; }
        append('responses.jsonl', { id: j.id, caseId: j.caseId, arm: j.arm, durationMs: performance.now()-start,
          response, transportError, costUsd: usageCost(response?.usage) });
        append('results.jsonl', interpret(j, response));
      }));
      console.log(JSON.stringify({ completed: c.id, ...ledger() }));
    }
  } finally { unlinkSync(lock); }
  console.log(JSON.stringify(report().counts));
} else if (phase === 'report') console.log(JSON.stringify(report(), null, 2));
else if (phase === 'audit') {
  const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
  assert.equal(qs.length, 90); assert.equal(rs.length, 90); assert.equal(results.length, 90);
  for (const list of [qs,rs,results]) assert.equal(new Set(list.map(x=>x.id)).size,90);
  for (const c of cases) {
    const pair = ['v4','direct'].map(arm=>qs.find(q=>q.id===`${c.id}-${arm}`));
    const strip = ({instructions:_i,text:_t,...rest})=>rest;
    assert.deepEqual(strip(pair[0].request), strip(pair[1].request));
    assert.equal(JSON.parse(pair[0].request.input).evidence.previousAxisStates,null);
    assert.equal(JSON.parse(pair[0].request.input).evidence.followUpExchanges.length,c.turn-1);
  }
  for (const j of jobs) {
    assert.deepEqual(qs.find(q=>q.id===j.id).request,j.request);
    assert.deepEqual(results.find(r=>r.id===j.id),interpret(j,rs.find(r=>r.id===j.id).response));
  }
  const records = read(`${ROOT}/records.json`);
  const rebuilt = records.flatMap(casesFromRecord).map((c,i)=>({id:`N${String(i+1).padStart(2,'0')}`,...c}));
  assert.deepEqual(cases,rebuilt);
  const s = report(); assert.ok(s.accountedUsd <= 2);
  const labelChanges = results.filter(r=>r.validatedAxes && JSON.stringify(r.rawAxes.map(a=>[a.axisId,a.status])) !== JSON.stringify(r.validatedAxes.map(a=>[a.axisId,a.status]))).map(r=>r.id);
  write('execution-audit.json', { auditedAt:new Date().toISOString(), calls:90, pairedInputsIdentical:true,
    sourceHistoryReconstructed:true, futureAnswersExcluded:true, previousStatesNull:true, frozenHashesMatch:true,
    rawResultsReparsed:true, labelChangesByValidator:labelChanges, retries:0, feedbackCalls:0,
    humanReviewPending:true, ...ledger() });
  console.log(JSON.stringify({ audit:'passed', counts:s.counts, labelChanges }));
} else console.log(JSON.stringify({ prepared:true,cases:cases.length,calls:jobs.length }));
