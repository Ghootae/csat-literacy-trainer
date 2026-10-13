import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {CentralAxisDecompositionResultSchema as Base,CentralAxisDecompositionInputSchema} from '../packages/pipeline/dist/central-axis-decomposition/schema.js';
import {loadCentralAxisDecompositionPrompt,validateCentralAxisDecompositionResult} from '../packages/pipeline/dist/central-axis-decomposition/evaluator.js';

const root='docs/experiments/meta-axis-generation-corporate-p4-2026-09-29';
const source='packages/pipeline/fixtures/experiments/dialogue/gold-v2/corporate-law-p4.json';
const phase=process.argv[2]??'prepare';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(name,x)=>writeFileSync(`${root}/${name}`,JSON.stringify(x,null,2)+'\n');
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const lines=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const Candidate=Base.extend({schemaVersion:z.literal('central-axis-meta-openai-v1'),centralAxes:z.array(Base.shape.centralAxes.element.extend({metaAxis:z.string().min(1)})).min(1)});
const schema=arm=>arm==='baseline'?Base:Candidate;
function interpret(response,arm,input){
  let raw=null,validated=null,contractError=null;
  try{
    assert.equal(response?.status,'completed');raw=JSON.parse(response.output_text);validated=schema(arm).parse(raw);
    const projection={...validated,schemaVersion:'central-axis-decomposition-openai-v2',centralAxes:validated.centralAxes.map(({id,description})=>({id,description}))};
    validateCentralAxisDecompositionResult(Base.parse(projection),input);
    assert.deepEqual(validated.centralAxes.map(a=>a.id),validated.centralAxes.map((a,i)=>`AX${i+1}`));
    if(arm==='candidate')assert.ok(validated.centralAxes.every(a=>a.metaAxis.trim().length>0));
  }catch(e){validated=null;contractError=e.message;}
  return {raw,validated,contractError};
}
function auditPrepared(){
  const jobs=read(`${root}/requests.json`),m=read(`${root}/manifest.json`),input=read(`${root}/input.json`);
  assert.equal(hash(jobs),m.requestsHash);assert.equal(hash(input),m.inputHash);assert.equal(jobs.length,6);
  assert.deepEqual(Object.keys(input).sort(),['centralStory','paragraphId']);
  assert.equal(hash(readFileSync(`${root}/PLAN.md`,'utf8')),m.planHash);
  for(const arm of ['baseline','candidate']){
    assert.equal(hash(readFileSync(`${root}/${arm}-instructions.md`,'utf8')),m[`${arm}Hash`]);
    const jj=jobs.filter(j=>j.arm===arm);assert.equal(new Set(jj.map(j=>j.requestHash)).size,1);
    for(const j of jj){assert.equal(j.request.input,JSON.stringify(input,null,2));assert.deepEqual(j.request.text.format,zodTextFormat(schema(arm),'central_axis_decomposition_result'));}
  }
  const strip=({instructions,text,...rest})=>rest;assert.deepEqual(strip(jobs[0].request),strip(jobs[1].request));
  return {jobs,m,input};
}
if(phase==='prepare'){
  assert.ok(!existsSync(`${root}/manifest.json`),'Already frozen');
  const gold=read(source),input=CentralAxisDecompositionInputSchema.parse({paragraphId:gold.paragraphId,centralStory:gold.centralStory});
  const baseline=loadCentralAxisDecompositionPrompt(),addition=readFileSync(`${root}/meta-axis-addition.md`,'utf8').trim();
  assert.ok(!/잉여금|자본금|배당|법인/.test(addition));
  const candidate=baseline+'\n\n'+addition;
  for(const [arm,text] of Object.entries({baseline,candidate}))writeFileSync(`${root}/${arm}-instructions.md`,text);
  const jobs=[];for(let repeat=1;repeat<=3;repeat++)for(const arm of repeat===2?['candidate','baseline']:['baseline','candidate']){
    const request={model:'gpt-5.6-terra',service_tier:'default',instructions:arm==='baseline'?baseline:candidate,input:JSON.stringify(input,null,2),reasoning:{effort:'medium'},max_output_tokens:5000,store:false,text:{format:zodTextFormat(schema(arm),'central_axis_decomposition_result')}};
    jobs.push({id:`${arm}-${repeat}`,arm,repeat,request,requestHash:hash(request)});
  }
  save('source-snapshot.json',{source,gold});save('input.json',input);save('requests.json',jobs);
  save('manifest.json',{preparedAt:new Date().toISOString(),source,sourceHash:hash(readFileSync(source,'utf8')),inputHash:hash(input),requestsHash:hash(jobs),baselineHash:hash(baseline),candidateHash:hash(candidate),planHash:hash(readFileSync(`${root}/PLAN.md`,'utf8')),calls:6,repeats:3,model:'gpt-5.6-terra',effort:'medium',maxRetries:0,stage:'central-axis-decomposition-only',studentEvaluationCalls:0});
  auditPrepared();console.log('Prepared 6 requests; original axes and meta examples excluded from input.');
}else if(phase==='run'){
  const {jobs,input}=auditPrepared();assert.ok(process.env.OPENAI_API_KEY);assert.ok(!existsSync(`${root}/started.json`),'No automatic paid reruns');save('started.json',{at:new Date().toISOString()});
  let wireCount=0;
  for(const job of jobs){const start=performance.now();let response=null,apiError=null;
    const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
      assert.equal(typeof options.body,'string');assert.deepEqual(JSON.parse(options.body),job.request);assert.ok(++wireCount<=6);
      appendFileSync(`${root}/wire.jsonl`,JSON.stringify({id:job.id,at:new Date().toISOString(),bodyHash:hash(options.body),body:options.body})+'\n');return globalThis.fetch(url,options);
    }});
    try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
    const row={id:job.id,arm:job.arm,repeat:job.repeat,requestHash:job.requestHash,durationMs:Math.round(performance.now()-start),response,apiError,...interpret(response,job.arm,input)};
    appendFileSync(`${root}/results.jsonl`,JSON.stringify(row)+'\n');console.log(JSON.stringify({id:row.id,ms:row.durationMs,axes:row.validated?.centralAxes,verdict:row.validated?.verdict,apiError,contractError:row.contractError}));
  }
}else if(phase==='audit'){
  const {jobs,input,m}=auditPrepared();assert.equal(hash(readFileSync(source,'utf8')),m.sourceHash,'Operational gold changed');
  if(!existsSync(`${root}/results.jsonl`)){console.log('Preflight passed; no calls.');process.exit(0);}
  const rows=lines(`${root}/results.jsonl`),wire=lines(`${root}/wire.jsonl`);assert.equal(rows.length,6);assert.equal(wire.length,6);assert.equal(new Set(rows.map(r=>r.id)).size,6);
  for(const w of wire){assert.equal(hash(w.body),w.bodyHash);assert.deepEqual(JSON.parse(w.body),jobs.find(j=>j.id===w.id).request);}
  assert.deepEqual(wire.map(w=>w.id).sort(),rows.map(r=>r.id).sort());
  for(const r of rows){assert.equal(r.requestHash,jobs.find(j=>j.id===r.id).requestHash);const v=interpret(r.response,r.arm,input);for(const k of Object.keys(v))assert.deepEqual(r[k],v[k]);}
  const summary={calls:6,valid:rows.filter(r=>!r.apiError&&!r.contractError).length,rows:rows.map(r=>({id:r.id,verdict:r.validated?.verdict??null,axes:r.validated?.centralAxes??null,durationMs:r.durationMs,usage:r.response?.usage??null,apiError:r.apiError,contractError:r.contractError}))};
  save('summary.json',summary);save('execution-audit.json',{at:new Date().toISOString(),calls:6,valid:summary.valid,frozenRequestsMatchWire:true,inputFields:['paragraphId','centralStory'],sameInputBothArms:true,changedRequestFields:['instructions','text.format'],retries:0,studentEvaluationCalls:0,operationalGoldUnchanged:true});
  const review=['# 법인 4문단 축·메타 축 생성 전체 출력','','입력 중심 이야기:','',input.centralStory,''];
  for(const r of rows){review.push(`## ${r.id}`,'',`시간: ${r.durationMs}ms; 형식 오류: ${r.contractError??'없음'}; API 오류: ${JSON.stringify(r.apiError)}`,'','```json',JSON.stringify(r.raw,null,2),'```','');}
  writeFileSync(`${root}/RAW-OUTPUTS.md`,review.join('\n'));console.log(JSON.stringify(summary,null,2));
}else throw new Error('Unknown phase');
