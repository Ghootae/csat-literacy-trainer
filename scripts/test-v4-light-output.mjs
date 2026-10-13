import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT = 'docs/experiments/v4-light-output-v1-2026-09-22';
const SOURCE = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
const phase = process.argv.find(x => x.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const write = (name, value) => writeFileSync(`${ROOT}/${name}`, JSON.stringify(value, null, 2) + '\n');
const append = (name, value) => appendFileSync(`${ROOT}/${name}`, JSON.stringify(value) + '\n');
const rows = name => existsSync(`${ROOT}/${name}`) ? readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const sha = value => createHash('sha256').update(value).digest('hex');
const median = xs => { const ys = [...xs].sort((a,b)=>a-b); return ys.length ? (ys[Math.floor((ys.length-1)/2)] + ys[Math.ceil((ys.length-1)/2)])/2 : null; };
const usageCost = usage => usage ? ((usage.input_tokens ?? 0) * 2 + (usage.output_tokens ?? 0) * 12) / 1_000_000 : null;
const reservationUsd = req => {
  const inputChars = JSON.stringify(req).length;
  return (Math.ceil(inputChars / 3) * 2 + (req.max_output_tokens ?? 4000) * 12) / 1_000_000;
};
const LightSchema = z.object({
  effectiveResponse: z.string().min(1),
  axes: z.array(z.object({
    axisId: z.string(),
    status: z.enum(['PASS','UNCLEAR_OK','UNCLEAR_SERIOUS','ERROR']),
    reason: z.string().min(1),
  }).strict()),
}).strict();
const v4Instructions = loadCentralStoryGatePrompt('v4') + '\n\n' +
  readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md','utf8').trim() + '\n\n' +
  readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md','utf8').trim();
const lightInstructions = readFileSync('packages/pipeline/experiments/dialogue/v4-light-judgment-prompt-v1.md','utf8').trim();
const instructions = { v4: v4Instructions, light: lightInstructions };
const inputFor = (c, sources) => ({
  gold: sources[c.paragraphId].gold,
  goldVersion: 'original-gold-v2',
  goldHash: sources[c.paragraphId].fileHash,
  initialResponse: c.initialResponse,
  history: c.history,
  turn: c.turn,
  questionsAsked: c.history.length,
  maxQuestions: 3,
  ...(c.revealedAxisContent.length ? { revealedAxisContent: c.revealedAxisContent } : {}),
  ...(c.shownSourceGuides.length ? { shownSourceGuides: c.shownSourceGuides } : {}),
});
function validateLight(raw, ids) {
  const result = LightSchema.parse(raw);
  const found = result.axes.map(a=>a.axisId);
  if (found.length !== ids.length || new Set(found).size !== ids.length || found.some(id=>!ids.includes(id))) {
    throw new Error('V4-light must return every axis exactly once');
  }
  return result;
}
function requestFor(c, arm, sources) {
  return {
    model: 'gpt-5.6-terra', instructions: instructions[arm], input: buildCentralStoryGatePayload(inputFor(c,sources)),
    reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 4000, store: false,
    text: { format: arm === 'v4' ? zodTextFormat(CentralStoryGateV4ErrorClaimsResultSchema,'central_story_gate_result') :
      zodTextFormat(LightSchema,'v4_light_judgment') },
  };
}
function comparableAxes(raw, arm) {
  if (!raw) return null;
  return arm === 'v4' ? raw.axisFeedback?.map(({axisId,status,reason})=>({axisId,status,reason})) ?? null : raw.axes;
}
const needsQuestion = axes => axes.some(a=>['UNCLEAR_SERIOUS','ERROR'].includes(a.status));
function compare(v4, light) {
  if (!v4 || !light) return { comparable:false };
  assert.deepEqual(v4.map(x=>x.axisId).sort(),light.map(x=>x.axisId).sort());
  const changes = v4.flatMap(a=>{ const b=light.find(x=>x.axisId===a.axisId); return b.status===a.status?[]:[{axisId:a.axisId,v4:a.status,light:b.status}]; });
  return { comparable:true, same:changes.length===0, changes, v4NeedsQuestion:needsQuestion(v4), lightNeedsQuestion:needsQuestion(light),
    paragraphInterventionChange:needsQuestion(v4)!==needsQuestion(light) };
}

if (phase === 'prepare') {
  assert.ok(!existsSync(`${ROOT}/manifest.json`),'Already frozen; do not overwrite');
  mkdirSync(ROOT,{recursive:true});
  const cases = read(`${SOURCE}/cases.json`), sources = read(`${SOURCE}/sources.json`);
  assert.equal(cases.length,45);
  const jobs = cases.flatMap((c,i)=>(i%2?['light','v4']:['v4','light']).map(arm=>({
    id:`${c.id}-${arm}`, caseId:c.id, arm, request:requestFor(c,arm,sources),
  })));
  write('cases.json',cases); write('sources.json',sources); write('jobs.json',jobs);
  writeFileSync(`${ROOT}/v4-instructions.md`,v4Instructions+'\n');
  writeFileSync(`${ROOT}/light-instructions.md`,lightInstructions+'\n');
  const protectedPaths = [
    'scripts/test-v4-light-output.mjs','packages/pipeline/experiments/dialogue/v4-light-judgment-prompt-v1.md',
    'packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md',
    'packages/pipeline/experiments/dialogue/current-claims-recording-v1.md',
    'packages/pipeline/experiments/dialogue/error-claims-recording-v1.md',
    `${ROOT}/PLAN.md`,`${ROOT}/cases.json`,`${ROOT}/sources.json`,`${ROOT}/jobs.json`,
    `${ROOT}/v4-instructions.md`,`${ROOT}/light-instructions.md`,
  ];
  write('manifest.json',{
    version:'v4-light-output-v1', preparedAt:new Date().toISOString(), authorization:'User approved the full V4-light test sequence.',
    sourceExperiment:SOURCE, sourceManifestHash:sha(readFileSync(`${SOURCE}/manifest.json`)), cases:45, initial:31, followup:14,
    arms:['v4','light'], calls:90, maxCalls:90, maxEstimatedUsd:2, concurrency:2, retries:0, feedbackCalls:0,
    model:'gpt-5.6-terra', effort:'medium', serviceTier:'default', maxOutputTokens:4000,
    protectedHashes:Object.fromEntries(protectedPaths.map(p=>[p,sha(readFileSync(p))])),
    instructionHashes:{v4:sha(v4Instructions),light:sha(lightInstructions)},
  });
}
const manifest = read(`${ROOT}/manifest.json`);
for (const [p,h] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(p)),h,`Frozen file changed: ${p}`);
const cases = read(`${ROOT}/cases.json`), sources = read(`${ROOT}/sources.json`), jobs = read(`${ROOT}/jobs.json`);
for (const j of jobs) assert.deepEqual(j.request,requestFor(cases.find(c=>c.id===j.caseId),j.arm,sources));
function interpret(job,response) {
  let raw=null, validated=null, contractError=null;
  const c=cases.find(x=>x.id===job.caseId), ids=sources[c.paragraphId].gold.centralAxes.map(a=>a.id);
  try {
    assert.equal(response?.status,'completed','API did not complete'); raw=JSON.parse(response.output_text);
    if (job.arm==='v4') validated=validateCentralStoryGateResult(CentralStoryGateV4ErrorClaimsResultSchema.parse(raw),inputFor(c,sources)).result;
    else validated=validateLight(raw,ids);
  } catch(e) { contractError=String(e?.message??e); }
  const axes=validated ? comparableAxes(validated,job.arm) : comparableAxes(raw,job.arm);
  return { id:job.id,caseId:job.caseId,arm:job.arm,raw,validated,axes,contractError };
}
function ledger() {
  const qs=rows('requests.jsonl'),rs=rows('responses.jsonl');
  return { calls:qs.length,knownEstimatedUsd:rs.reduce((n,r)=>n+(r.costUsd??0),0),
    accountedUsd:qs.reduce((n,q)=>n+(rs.find(r=>r.id===q.id)?.costUsd??q.reserveUsd),0) };
}
function summarize() {
  const results=rows('results.jsonl'),responses=rows('responses.jsonl');
  const comparisons=cases.map(c=>{
    const a=results.find(r=>r.id===`${c.id}-v4`),b=results.find(r=>r.id===`${c.id}-light`);
    return {caseId:c.id,stratum:c.stratum,paragraphId:c.paragraphId,comparison:compare(a?.axes,b?.axes),contractFailure:!!a?.contractError||!!b?.contractError};
  });
  const arms=Object.fromEntries(['v4','light'].map(arm=>{
    const rr=results.filter(r=>r.arm===arm),api=responses.filter(r=>r.arm===arm);
    return [arm,{calls:rr.length,valid:rr.filter(r=>!r.contractError).length,allPass:rr.filter(r=>r.axes?.every(a=>a.status==='PASS')).length,
      questionCandidate:rr.filter(r=>r.axes&&needsQuestion(r.axes)).length,medianApiMs:median(api.filter(r=>r.response).map(r=>r.durationMs)),
      inputTokens:api.reduce((n,r)=>n+(r.response?.usage?.input_tokens??0),0),outputTokens:api.reduce((n,r)=>n+(r.response?.usage?.output_tokens??0),0),
      estimatedUsd:api.reduce((n,r)=>n+(r.costUsd??0),0)}];
  }));
  const summary={...ledger(),arms,cases:45,comparable:comparisons.filter(x=>x.comparison.comparable).length,
    same:comparisons.filter(x=>x.comparison.same).length,disagreements:comparisons.filter(x=>x.comparison.comparable&&!x.comparison.same).length,
    interventionChanges:comparisons.filter(x=>x.comparison.paragraphInterventionChange).length,
    v4NoQuestionToLightQuestion:comparisons.filter(x=>!x.comparison.v4NeedsQuestion&&x.comparison.lightNeedsQuestion).map(x=>x.caseId),
    v4QuestionToLightNoQuestion:comparisons.filter(x=>x.comparison.v4NeedsQuestion&&!x.comparison.lightNeedsQuestion).map(x=>x.caseId),
    contractFailures:comparisons.filter(x=>x.contractFailure).map(x=>x.caseId),comparisons};
  write('summary.json',summary); return summary;
}
if (phase==='run') {
  assert.ok(process.env.OPENAI_API_KEY,'OPENAI_API_KEY missing');
  const lock=`${ROOT}/live.lock`,fd=openSync(lock,'wx');closeSync(fd);
  try {
    const client=new OpenAI({maxRetries:0,timeout:60000});
    for (const c of cases) {
      const pending=jobs.filter(j=>j.caseId===c.id&&!rows('requests.jsonl').some(q=>q.id===j.id));
      if(!pending.length)continue;
      const l=ledger(),reserve=pending.reduce((n,j)=>n+reservationUsd(j.request),0);
      assert.ok(l.calls+pending.length<=manifest.maxCalls&&l.accountedUsd+reserve<=manifest.maxEstimatedUsd,'Local cap stops run');
      for(const j of pending)append('requests.jsonl',{...j,sentAt:new Date().toISOString(),reserveUsd:reservationUsd(j.request)});
      await Promise.all(pending.map(async j=>{
        const start=performance.now();let response=null,transportError=null;
        try{response=await client.responses.create(j.request,{maxRetries:0,timeout:60000});}catch(e){transportError={name:e.name,status:e.status??null,code:e.code??null};}
        append('responses.jsonl',{id:j.id,caseId:j.caseId,arm:j.arm,durationMs:performance.now()-start,response,transportError,costUsd:usageCost(response?.usage)});
        append('results.jsonl',interpret(j,response));
      }));
      console.log(JSON.stringify({completed:c.id,...ledger()}));
    }
  } finally { unlinkSync(lock); }
  console.log(JSON.stringify(summarize(),null,2));
} else if(phase==='report') console.log(JSON.stringify(summarize(),null,2));
else if(phase==='audit') {
  const qs=rows('requests.jsonl'),rs=rows('responses.jsonl'),results=rows('results.jsonl');
  assert.equal(qs.length,90);assert.equal(rs.length,90);assert.equal(results.length,90);
  for(const list of [qs,rs,results])assert.equal(new Set(list.map(x=>x.id)).size,90);
  for(const c of cases){const pair=['v4','light'].map(arm=>qs.find(q=>q.id===`${c.id}-${arm}`));const strip=({instructions:_i,text:_t,...rest})=>rest;assert.deepEqual(strip(pair[0].request),strip(pair[1].request));}
  for(const j of jobs){assert.deepEqual(qs.find(q=>q.id===j.id).request,j.request);assert.deepEqual(results.find(r=>r.id===j.id),interpret(j,rs.find(r=>r.id===j.id).response));}
  const summary=summarize();assert.ok(summary.accountedUsd<=manifest.maxEstimatedUsd);
  write('execution-audit.json',{auditedAt:new Date().toISOString(),calls:90,pairedInputsIdentical:true,frozenHashesMatch:true,retries:0,feedbackCalls:0,...ledger()});
  console.log(JSON.stringify({audit:'passed',same:summary.same,disagreements:summary.disagreements,interventionChanges:summary.interventionChanges}));
} else console.log(JSON.stringify({prepared:true,cases:cases.length,jobs:jobs.length}));
