import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema as Schema, validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root='docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29';
const phase=process.argv[2]??'prepare';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const out=(name,value)=>writeFileSync(`${root}/${name}`,JSON.stringify(value,null,2)+'\n');
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const lines=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const unclear=['UNCLEAR_OK','UNCLEAR_SERIOUS'];
function interpret(response,input){
  let raw=null,validated=null,normalizationEvents=null,contractError=null;
  try{assert.equal(response?.status,'completed');raw=JSON.parse(response.output_text);const result=validateCentralStoryGateResult(Schema.parse(raw),input);validated=result.result;normalizationEvents=result.normalizationEvents;}
  catch(e){contractError=e.message;}
  return {raw,validated,normalizationEvents,contractError};
}
function auditPrepared(){
  const jobs=read(`${root}/requests.json`),cases=read(`${root}/cases.json`),manifest=read(`${root}/manifest.json`);
  assert.equal(hash(jobs),manifest.requestsHash);assert.equal(hash(cases),manifest.casesHash);assert.equal(jobs.length,48);
  assert.equal(hash(readFileSync(`${root}/PLAN.md`,'utf8')),manifest.planHash);
  for(const arm of ['baseline','candidate'])assert.equal(hash(readFileSync(`${root}/${arm}-instructions.md`,'utf8')),manifest[`${arm}Hash`]);
  const baseline=readFileSync(`${root}/baseline-instructions.md`,'utf8'),candidate=readFileSync(`${root}/candidate-instructions.md`,'utf8');
  const before=s=>s.slice(0,s.indexOf('## 중심축 판정 원칙')),after=s=>s.slice(s.indexOf('partial/unknown인 모든 축에 대해'));
  assert.equal(before(baseline),before(candidate));assert.equal(after(baseline),after(candidate));
  assert.ok(!/법인|재단|배당|잉여금/.test(candidate.slice(before(candidate).length,candidate.indexOf('partial/unknown인 모든 축에 대해'))));
  for(const c of cases){
    const pair=jobs.filter(j=>j.caseId===c.id&&j.repeat===1);const strip=({instructions,...r})=>r;
    assert.deepEqual(strip(pair[0].request),strip(pair[1].request));
    const payload=JSON.parse(pair[0].request.input);assert.deepEqual(payload.revealedAxisContent,[]);assert.deepEqual(payload.evidence.followUpExchanges,[]);
    assert.ok(!('coreRelations' in payload));
    for(const arm of ['baseline','candidate'])assert.equal(new Set(jobs.filter(j=>j.caseId===c.id&&j.arm===arm).map(j=>j.requestHash)).size,1);
  }
  return {jobs,cases,manifest};
}
if(phase==='prepare'){
  assert.ok(!existsSync(`${root}/manifest.json`),'Already frozen');
  const snapshot=read('docs/experiments/question-actionability-corporate-p2-2026-09-29/source-snapshot.json');
  const prior=read('docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29/cases.json');
  const p4=read('packages/pipeline/fixtures/experiments/dialogue/gold-v2/corporate-law-p4.json');
  const session=lines('.omc/logs/dialogue-experiment/sessions.jsonl').findLast(r=>r.sessionId==='9a93322d-60de-43f9-8c9e-a5470fa2631a');
  assert.equal(session.paragraphId,p4.paragraphId);const actual=session.initialResponse;
  assert.ok(actual.includes('배당금 안됨'));
  const p4defs=[
    {id:'P4-C1',kind:'actual',response:actual,expected:{AX1:['PASS'],AX2:unclear}},
    {id:'P4-C2',kind:'synthetic',response:actual+' 이익 잉여금은 비교적 자유롭게 쓰지만 자본 잉여금은 제한된 용도로만 쓴다. 두 잉여금으로도 손실을 보전하지 못하면 자본금을 쓰며, 자본금 감소는 회사 존립을 위협하므로 신중해야 한다.',expected:{AX1:['PASS'],AX2:['PASS']}},
    {id:'P4-C3',kind:'synthetic',response:'주식회사 자산. 자본금: 주식 발행 조달, 기초자산->감액 금지, 이익 잉여금: 영업 이익, 자본잉여금: 자본거래 이익. 자본금 운용은 매우 신중히.',expected:{AX1:unclear,AX2:unclear}},
    {id:'P4-C4',kind:'synthetic',response:actual.replace('배당금 안됨','배당금 지급도 가능'),expected:{AX1:['ERROR'],AX2:unclear}},
  ];
  const cases=[...prior.map(c=>({...c,id:`P2-${c.id}`,target:'AX3',expected:{AX3:c.expected},input:{...c.input,shownSourceGuides:[],revealedAxisContent:[]}})),...p4defs.map(c=>({...c,target:'AX1',input:{gold:p4,goldVersion:snapshot.goldRef.version,goldHash:'sha256:f93c7b2415884289635a8091eae5b89481b13fd3d23be86d9b3e98b890a3fa8f',initialResponse:c.response,history:[],turn:1,questionsAsked:0,maxQuestions:3,shownSourceGuides:[],revealedAxisContent:[]}}))];
  const base=loadCentralStoryGatePrompt('v4');const start=base.indexOf('## 중심축 판정 원칙'),end=base.indexOf('partial/unknown인 모든 축에 대해');assert.ok(start>0&&end>start);
  const replacement=readFileSync(`${root}/principles.md`,'utf8').trim()+'\n\n';
  const suffix='\n\n'+readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md','utf8').trim()+'\n\n'+readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md','utf8').trim();
  const baseline=base+suffix,candidate=base.slice(0,start)+replacement+base.slice(end)+suffix;
  for(const [arm,text] of Object.entries({baseline,candidate}))writeFileSync(`${root}/${arm}-instructions.md`,text);
  const jobs=[];for(let repeat=1;repeat<=3;repeat++)for(const c of cases)for(const arm of repeat%2?['baseline','candidate']:['candidate','baseline']){
    const request={model:'gpt-5.6-terra',instructions:arm==='baseline'?baseline:candidate,input:buildCentralStoryGatePayload(c.input),reasoning:{effort:'medium'},max_output_tokens:4000,store:false,text:{format:zodTextFormat(Schema,'central_story_gate_result')}};
    jobs.push({id:`${c.id}-${arm}-${repeat}`,caseId:c.id,arm,repeat,request,requestHash:hash(request)});
  }
  out('source-snapshot.json',{p2:snapshot,p4:{gold:p4,session}});out('cases.json',cases);out('requests.json',jobs);
  out('manifest.json',{preparedAt:new Date().toISOString(),casesHash:hash(cases),requestsHash:hash(jobs),baselineHash:hash(baseline),candidateHash:hash(candidate),calls:48,repeats:3,concurrency:2,maxRetries:0,model:'gpt-5.6-terra',effort:'medium',changedRegion:{start,end},planHash:hash(readFileSync(`${root}/PLAN.md`,'utf8'))});
  auditPrepared();console.log('Prepared and audited 48 frozen requests; no API calls.');
}else if(phase==='run'){
  const {jobs,cases}=auditPrepared();assert.ok(process.env.OPENAI_API_KEY);assert.ok(!existsSync(`${root}/started.json`),'Already started; no automatic paid reruns');out('started.json',{at:new Date().toISOString()});
  let cursor=0,wireCount=0;
  async function worker(){
    while(cursor<jobs.length){const job=jobs[cursor++],started=performance.now();let response=null,apiError=null;
      const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
        assert.equal(typeof options.body,'string');assert.deepEqual(JSON.parse(options.body),job.request);assert.ok(++wireCount<=48);
        appendFileSync(`${root}/wire.jsonl`,JSON.stringify({id:job.id,at:new Date().toISOString(),bodyHash:hash(options.body),body:options.body})+'\n');return globalThis.fetch(url,options);
      }});
      try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
      const result={id:job.id,caseId:job.caseId,arm:job.arm,repeat:job.repeat,requestHash:job.requestHash,durationMs:Math.round(performance.now()-started),response,apiError,...interpret(response,cases.find(c=>c.id===job.caseId).input)};
      appendFileSync(`${root}/results.jsonl`,JSON.stringify(result)+'\n');console.log(JSON.stringify({id:job.id,axes:(result.validated??result.raw)?.axisFeedback?.map(a=>[a.axisId,a.status]),ms:result.durationMs,apiError,contractError:result.contractError}));
    }
  }
  await Promise.all([worker(),worker()]);
}else if(phase==='audit'||phase==='summarize'){
  const {jobs,cases}=auditPrepared();if(!existsSync(`${root}/results.jsonl`)){console.log('Frozen request audit passed.');process.exit(0);}
  const rows=lines(`${root}/results.jsonl`),wires=lines(`${root}/wire.jsonl`);
  for(const r of rows){const job=jobs.find(j=>j.id===r.id);assert.equal(r.requestHash,job.requestHash);const recovered=interpret(r.response,cases.find(c=>c.id===r.caseId).input);for(const key of Object.keys(recovered))assert.deepEqual(r[key],recovered[key]);if(r.validated){assert.deepEqual(r.raw.axisFeedback,r.validated.axisFeedback);assert.deepEqual(r.raw.axisStates,r.validated.axisStates);}}
  for(const w of wires){assert.equal(hash(w.body),w.bodyHash);assert.deepEqual(JSON.parse(w.body),jobs.find(j=>j.id===w.id).request);}
  const groups=cases.flatMap(c=>['baseline','candidate'].map(arm=>{const rr=rows.filter(r=>r.caseId===c.id&&r.arm===arm).sort((a,b)=>a.repeat-b.repeat);return {caseId:c.id,kind:c.kind,target:c.target,arm,expected:c.expected,valid:rr.filter(r=>!r.apiError&&!r.contractError).length,outputs:rr.map(r=>({id:r.id,axes:(r.validated??r.raw)?.axisFeedback,missing:(r.validated??r.raw)?.missingAxisEvidence,apiError:r.apiError,contractError:r.contractError})),matching:rr.filter(r=>!r.apiError&&!r.contractError&&Object.entries(c.expected).every(([axis,statuses])=>statuses.includes(r.validated.axisFeedback.find(a=>a.axisId===axis)?.status))).length};}));
  const stats=['baseline','candidate'].map(arm=>{const rr=rows.filter(r=>r.arm===arm),times=rr.map(r=>r.durationMs).sort((a,b)=>a-b);return {arm,calls:rr.length,medianMs:times.length?(times[Math.floor((times.length-1)/2)]+times[Math.ceil((times.length-1)/2)])/2:null,inputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens??0),0),cachedTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens_details?.cached_tokens??0),0),outputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.output_tokens??0),0)};});
  out('summary.json',{calls:rows.length,valid:rows.filter(r=>!r.apiError&&!r.contractError).length,stats,groups});
  if(phase==='audit'){assert.equal(rows.length,48);assert.equal(wires.length,48);assert.equal(new Set(rows.map(r=>r.id)).size,48);assert.deepEqual(wires.map(w=>w.id).sort(),rows.map(r=>r.id).sort());out('execution-audit.json',{at:new Date().toISOString(),calls:48,valid:rows.filter(r=>!r.apiError&&!r.contractError).length,apiFailures:rows.filter(r=>r.apiError).length,contractFailures:rows.filter(r=>r.contractError).map(r=>({id:r.id,error:r.contractError})),pairedInputsIdentical:true,repeatedRequestsIdentical:true,wireMatchesFrozenRequests:true,validationReproduced:true,axisStatusNormalization:0,onlyPrinciplesChanged:true,retries:0,feedbackCalls:0});}
  console.log(JSON.stringify({calls:rows.length,stats,groups:groups.map(({outputs,...g})=>({...g,statuses:outputs.map(o=>o.axes?.map(a=>`${a.axisId}:${a.status}`).join(','))}))},null,2));
}else throw new Error('Unknown phase');
