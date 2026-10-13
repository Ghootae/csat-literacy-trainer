import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadInputs,buildJobs,shadowInput,checkApproval,PARAMETERS} from './holistic-verdict-shadow-data.mjs';
import {executeJobs,mockCall} from './holistic-verdict-shadow-execution.mjs';
import {report,selectReview,distribution,criterion,reviewDocuments,interpretResponse,metrics} from './holistic-verdict-shadow-report.mjs';
import {sha} from './natural-response-disagreement.mjs';
const bundle=loadInputs(),jobs=buildJobs(bundle);

test('fixed A/B/probe source counts, cumulative dialogue, provenance and model parameters',()=>{
  assert.deepEqual(['A','B','probe'].map(s=>bundle.points.filter(p=>p.source===s).length),[45,27,13]);
  assert.deepEqual(['initial','followup'].map(s=>bundle.points.filter(p=>p.source!=='probe'&&p.stratum===s).length),[45,27]);
  for(const p of bundle.points) {
    assert.equal(p.dialogue.length,1+2*(p.turn-1));
    p.dialogue.forEach((d,i)=>{assert.equal(d.role,i%2===0?'student':'tutor_question');if(i%2)assert.equal(d.note,'대화 맥락, 판정 기준 아님');});
    assert.equal(p.dialogue.some(d=>'effectiveResponse'in d||'revealedText'in d||'axisFeedback'in d),false);
    if(p.source==='B'){assert.ok(p.sourceLine>0&&p.sourceLineHash.length===64);assert.match(p.schemaVersion,/^axis-dialogue-selective-openai-v[67]$/u);}
  }
  for(const job of jobs)assert.deepEqual(Object.fromEntries(PARAMETERS.map(k=>[k,job.request[k]])),bundle.parameters);
});
test('H0/H1 differ exclusively by mechanical referenceInterpretation; schemas/instructions are frozen',()=>{
  assert.deepEqual(buildJobs(bundle),jobs);assert.equal(jobs.filter(j=>j.kind==='shadow').length,170);assert.equal(jobs.filter(j=>j.kind==='v4').length,13);
  for(const p of bundle.points) {
    const source=bundle.sources[p.paragraphId],h0=shadowInput(p,source,'H0'),h1=shadowInput(p,source,'H1');
    assert.equal('referenceInterpretation'in h0,false);assert.equal(h1.referenceInterpretation,source.gold.centralAxes.map(a=>a.description).join(' '));
    delete h1.referenceInterpretation;assert.deepEqual(h0,h1);assert.equal('centralAxes'in h0,false);
  }
  for(const job of jobs.filter(j=>j.kind==='v4')) {
    const template=bundle.aRequests.find(q=>q.id===job.templateId),input=JSON.parse(job.request.input),original=JSON.parse(template.request.input);
    assert.equal(job.request.instructions,template.request.instructions);assert.equal(JSON.stringify(job.request.text.format),JSON.stringify(template.request.text.format));
    input.evidence.initialResponse=original.evidence.initialResponse;assert.deepEqual(input,original);
  }
});
test('run authorization rejects missing/design/nonexistent approvals before writing or API construction',()=>{
  for(const args of [['run'],['run','D-0101'],['run','D-9999']]) {
    const p=spawnSync(process.execPath,['scripts/test-holistic-verdict-shadow.mjs',...args],{encoding:'utf8',env:{...process.env,OPENAI_API_KEY:'offline-test-only'}});
    assert.equal(p.status,1);assert.match(p.stderr,/transfer approval|D-0101|decision not found/u);assert.equal(p.stdout,'');
  }
});
test('approval requires accepted frontmatter, ID >101 and experiment transfer scope',()=>{
  const dir=mkdtempSync(join(tmpdir(),'holistic-approval-'));
  try {
    const path=join(dir,'D-0102-test.md'),write=(status,scope,id='D-0102')=>writeFileSync(path,`---\nid: ${id}\nstatus: ${status}\nscope: ${scope}\n---\n`);
    write('accepted','holistic-verdict-shadow-first-transfer');assert.equal(checkApproval('D-0102',dir).id,'D-0102');
    for(const [status,scope,id] of [['draft','holistic-verdict-shadow-transfer'],['accepted','other-transfer'],['accepted','holistic-verdict-shadow-design'],['accepted','holistic-verdict-shadow-transfer','D-0103']]) {
      write(status,scope,id);assert.throws(()=>checkApproval('D-0102',dir));
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('mock execution orders 170 shadow ->13 V4 -> conditional attribution, no retry of failures',async()=>{
  const ids=[],fake=mockCall(bundle),badId=jobs[0].id;
  const result=await executeJobs(bundle,jobs,async job=>{
    ids.push(job.id);const e=await fake(job);
    if(job.id===badId)e.response.output_text=JSON.stringify({...JSON.parse(e.response.output_text),overall:'resolved'});
    return e;
  },()=>{});
  assert.equal(ids.length,new Set(ids).size);assert.equal(result.jobs.slice(0,170).every(j=>j.kind==='shadow'),true);
  assert.equal(result.jobs.slice(170,183).every(j=>j.kind==='v4'),true);assert.equal(result.jobs.slice(183).every(j=>j.kind==='attribution'),true);
  assert.ok(result.results[0].errors.length);assert.equal(ids.includes(`${badId}-attribution`),false);
  for(const j of result.jobs.filter(j=>j.kind==='attribution')) {
    const parent=result.results.find(r=>r.id===j.id.replace(/-attribution$/u,''));assert.equal(parent.raw.overall,'unresolved');assert.deepEqual(parent.errors,[]);
  }
});
test('full mock report produces artifacts, excludes contract failures, keeps raw/retracted verdicts, and protects blind views',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'holistic-report-'));
  try {
    const executed=await executeJobs(bundle,jobs,mockCall(bundle),()=>{}),out=await report(bundle,executed.jobs,executed.envelopes,dir,{mock:true});
    for(const name of ['summary.json','REVIEW.md','REVIEW-KEY.md','REVIEW-SECOND.md','human-review.json'])assert.ok(readdirSync(dir).includes(name));
    assert.equal(out.summary.apiCalls,0);assert.equal(out.summary.variants.H0.effective.total,85);assert.equal(out.summary.variants.H0.effective.retractions>0,true);
    assert.equal(out.summary.variants.H0.effective.cells['resolved/unresolved']<out.summary.variants.H0.raw.cells['resolved/unresolved'],true);
    const comparisons=JSON.parse(readFileSync(join(dir,'comparisons.json')));
    const original=reviewDocuments(bundle,comparisons);
    // Poison all result and axis objects. Blind documents must remain byte-identical.
    const poisonedBundle=structuredClone(bundle);
    for(const s of Object.values(poisonedBundle.sources))s.gold.centralAxes.forEach(a=>a.description='SECRET_AXIS_DESCRIPTION');
    for(const c of comparisons){c.v4.secret='SECRET_MODEL_OUTPUT';for(const a of ['H0','H1'])c.variants[a].raw.understoodRelations=['SECRET_MODEL_OUTPUT'];}
    const poisoned=reviewDocuments(poisonedBundle,comparisons);
    for(const name of ['REVIEW.md','REVIEW-SECOND.md']){assert.equal(poisoned.files[name],original.files[name]);assert.doesNotMatch(poisoned.files[name],/SECRET_MODEL_OUTPUT|SECRET_AXIS_DESCRIPTION|^출처:|^source:/mu);}
    assert.equal(out.reviews.secondOrder.length,out.reviews.selection.order.length+13);
    const comparable=structuredClone(comparisons);comparable[0].v4.overall='contract-failed';comparable[1].variants.H0.errors=['failure'];
    assert.equal(distribution(comparable,'H0').excluded,2);
    assert.deepEqual(out.summary.variants.H0.criterion.effective.faProbeIds,['T03','T05','T07','T09','T10','T11','T12']);
    assert.equal(out.summary.variants.H0.criterion.effective.clear,true);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('review selects union of valid effective disagreements and at most 5 agreements per cell in hash order',()=>{
  const c=(pointId,v4,h0,h1)=>({pointId,source:'A',v4:{overall:v4},variants:{H0:{effectiveOverall:h0,errors:[]},H1:{effectiveOverall:h1,errors:[]}}});
  const rr=[...Array.from({length:12},(_,i)=>c(`r${i}`,'resolved','resolved','resolved')),
    ...Array.from({length:3},(_,i)=>c(`u${i}`,'unresolved','unresolved','unresolved')),
    c('h0-only','resolved','unresolved','resolved'),c('h1-only','resolved','resolved','unresolved')];
  const s=selectReview(rr);assert.deepEqual(s.mandatory,['h0-only','h1-only']);assert.equal(s.agreement.length,8);
  assert.deepEqual(s.order,[...s.order].sort((a,b)=>sha(a).localeCompare(sha(b))));assert.deepEqual(selectReview([...rr].reverse()).order,s.order);
});
test('incomplete responses and malformed JSON become failures with no final verdict',async()=>{
  for(const response of [{status:'incomplete',output_text:'{}'},{status:'completed',output_text:'not JSON'}]) {
    const r=await interpretResponse(bundle,jobs[0],{response});assert.ok(r.errors.length);
  }
});
test('missing usage/cost/latency stay unknown rather than zero',()=>{
  const r=metrics([{response:{usage:null},durationMs:null,costUsd:null}]);assert.equal(r.usage,null);assert.equal(r.recordedCostUsd,null);assert.equal(r.medianDurationMs,null);assert.equal(r.costUnknown,1);
});
