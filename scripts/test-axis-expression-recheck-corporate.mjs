import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema as Schema, validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root = 'docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29';
const source = 'docs/experiments/question-actionability-corporate-p2-2026-09-29/source-snapshot.json';
const phase = process.argv[2] ?? 'prepare';
const read = name => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));
const write = (name,value) => writeFileSync(`${root}/${name}`, JSON.stringify(value,null,2)+'\n');
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const median = xs => {const s=[...xs].sort((a,b)=>a-b); return s.length?(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2:null;};
mkdirSync(root,{recursive:true});
function interpret(job,response,cases) {
  let raw=null, validated=null, normalizationEvents=null, contractError=null;
  try { assert.equal(response?.status,'completed');raw=JSON.parse(response.output_text); const result=validateCentralStoryGateResult(Schema.parse(raw),cases.find(c=>c.id===job.caseId).input); validated=result.result;normalizationEvents=result.normalizationEvents; }
  catch(error){contractError=error.message;}
  return {raw,validated,normalizationEvents,contractError};
}
if(phase==='prepare') {
  assert.ok(!existsSync(`${root}/manifest.json`),'Already frozen');
  const snapshot=JSON.parse(readFileSync(source,'utf8'));
  assert.equal(snapshot.gold.paragraphId,'corporate-law-p2');
  const original=snapshot.turns[0].answer;
  const ax3='기본재산 외 자산으로 수익 추구 가능하나 영리가 아닌 목적 사업 재원 마련 용도. 관리, 보고 필요.';
  assert.ok(original.endsWith(ax3));
  const prefix=original.slice(0,-ax3.length);
  const definitions=[
    {id:'C1',kind:'actual',response:original,expected:['PASS']},
    {id:'C2',kind:'synthetic',response:original+' 수익 활동은 제한된 범위에서만 가능하다.',expected:['PASS']},
    {id:'C3',kind:'synthetic',response:prefix+'기본재산 외 자산으로 수익 추구 가능.',expected:['UNCLEAR_OK','UNCLEAR_SERIOUS']},
    {id:'C4',kind:'synthetic',response:original+' 다만 기본재산 외 자산의 수익 활동 범위에는 아무 제한이 없다.',expected:['ERROR']},
  ];
  const cases=definitions.map(c=>({...c,input:{gold:snapshot.gold,goldVersion:snapshot.goldRef.version,goldHash:snapshot.goldRef.hash,initialResponse:c.response,history:[],turn:1,questionsAsked:0,maxQuestions:3}}));
  const baseline=loadCentralStoryGatePrompt('v4')+'\n\n'+readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md','utf8').trim()+'\n\n'+readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md','utf8').trim();
  const candidate=baseline+'\n\n'+readFileSync(`${root}/recheck-instructions.md`,'utf8').trim();
  writeFileSync(`${root}/baseline-instructions.md`,baseline);writeFileSync(`${root}/candidate-instructions.md`,candidate);
  const model=snapshot.turns[0].call.model, effort=snapshot.turns[0].call.effort;
  const jobs=[];
  for(let repeat=1;repeat<=3;repeat++)for(const c of cases)for(const arm of repeat%2?['baseline','candidate']:['candidate','baseline']){
    const request={model,instructions:arm==='baseline'?baseline:candidate,input:buildCentralStoryGatePayload(c.input),reasoning:{effort},max_output_tokens:4000,store:false,text:{format:zodTextFormat(Schema,'central_story_gate_result')}};
    jobs.push({id:`${c.id}-${arm}-${repeat}`,caseId:c.id,arm,repeat,request,requestHash:hash(request)});
  }
  write('cases.json',cases);write('requests.json',jobs);
  write('manifest.json',{preparedAt:new Date().toISOString(),source,sourceHash:hash(readFileSync(source,'utf8')),casesHash:hash(cases),requestsHash:hash(jobs),baselineHash:hash(baseline),candidateHash:hash(candidate),calls:24,repeats:3,model,effort,concurrency:2,maxRetries:0});
  console.log(JSON.stringify({prepared:true,calls:jobs.length,model,effort}));
}else if(phase==='run') {
  const jobs=read('requests.json'),cases=read('cases.json'),manifest=read('manifest.json');
  assert.equal(hash(jobs),manifest.requestsHash);assert.equal(hash(cases),manifest.casesHash);assert.equal(jobs.length,24);
  assert.ok(!existsSync(`${root}/started.json`),'Run already started; no automatic paid reruns');
  assert.ok(process.env.OPENAI_API_KEY,'API key missing');write('started.json',{startedAt:new Date().toISOString()});
  const client=new OpenAI({maxRetries:0,timeout:90000});let cursor=0;
  async function worker(){while(cursor<jobs.length){const job=jobs[cursor++];const start=performance.now(),calledAt=new Date().toISOString();let response=null,apiError=null;
    appendFileSync(`${root}/sent.jsonl`,JSON.stringify({id:job.id,calledAt,requestHash:job.requestHash})+'\n');
    try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
    const result={id:job.id,caseId:job.caseId,arm:job.arm,repeat:job.repeat,calledAt,durationMs:Math.round(performance.now()-start),requestHash:job.requestHash,apiError,response,...interpret(job,response,cases)};
    appendFileSync(`${root}/results.jsonl`,JSON.stringify(result)+'\n');
    console.log(JSON.stringify({id:job.id,ax3:(result.validated??result.raw)?.axisFeedback?.find(a=>a.axisId==='AX3')?.status??null,ms:result.durationMs,contractError:result.contractError,apiError}));
  }}
  await Promise.all([worker(),worker()]);
}else if(phase==='summarize'||phase==='audit') {
  const jobs=read('requests.json'),cases=read('cases.json'),manifest=read('manifest.json');
  assert.equal(hash(jobs),manifest.requestsHash);assert.equal(hash(cases),manifest.casesHash);
  assert.equal(hash(readFileSync(`${root}/baseline-instructions.md`,'utf8')),manifest.baselineHash);assert.equal(hash(readFileSync(`${root}/candidate-instructions.md`,'utf8')),manifest.candidateHash);
  for(const c of cases){const pair=jobs.filter(j=>j.caseId===c.id&&j.repeat===1);const strip=({instructions,...rest})=>rest;assert.deepEqual(strip(pair[0].request),strip(pair[1].request));assert.equal(JSON.parse(pair[0].request.input).evidence.followUpExchanges.length,0);}
  if(!existsSync(`${root}/results.jsonl`)){console.log(JSON.stringify({preparedAudit:'passed',calls:jobs.length}));process.exit(0);}
  const rows=readFileSync(`${root}/results.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
  for(const row of rows){const job=jobs.find(j=>j.id===row.id);assert.equal(row.requestHash,job.requestHash);const recovered=interpret(job,row.response,cases);for(const key of Object.keys(recovered))assert.deepEqual(row[key],recovered[key]);}
  const groups=cases.flatMap(c=>['baseline','candidate'].map(arm=>{const rr=rows.filter(r=>r.caseId===c.id&&r.arm===arm);return {caseId:c.id,arm,expected:c.expected,valid:rr.filter(r=>!r.contractError&&!r.apiError).length,outputs:rr.map(r=>({id:r.id,ax3:(r.validated??r.raw)?.axisFeedback?.find(a=>a.axisId==='AX3')??null,axes:(r.validated??r.raw)?.axisFeedback??null,missing:(r.validated??r.raw)?.missingAxisEvidence??null,contractError:r.contractError,apiError:r.apiError})),matching:rr.filter(r=>!r.contractError&&!r.apiError&&c.expected.includes(r.validated.axisFeedback.find(a=>a.axisId==='AX3').status)).length};}));
  const stats=['baseline','candidate'].map(arm=>{const rr=rows.filter(r=>r.arm===arm);return {arm,calls:rr.length,medianMs:median(rr.map(r=>r.durationMs)),inputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens??0),0),cachedTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens_details?.cached_tokens??0),0),outputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.output_tokens??0),0)};});
  write('summary.json',{calls:rows.length,valid:rows.filter(r=>!r.contractError&&!r.apiError).length,stats,groups});
  if(phase==='audit'){assert.equal(rows.length,24);assert.equal(new Set(rows.map(r=>r.id)).size,24);const sent=readFileSync(`${root}/sent.jsonl`,'utf8').trim().split('\n').map(JSON.parse);assert.equal(sent.length,24);assert.deepEqual(sent.map(r=>r.id).sort(),rows.map(r=>r.id).sort());write('execution-audit.json',{auditedAt:new Date().toISOString(),calls:24,pairedInputsIdentical:true,frozenHashesMatch:true,rawValidationReproduced:true,retries:0,feedbackCalls:0});}
  console.log(JSON.stringify({calls:rows.length,stats,groups},null,2));
}else throw new Error('Unknown phase');
