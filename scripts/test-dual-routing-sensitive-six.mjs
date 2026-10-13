import {readFileSync,writeFileSync,appendFileSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {CentralAxisDecompositionResultSchema as Base} from '../packages/pipeline/dist/central-axis-decomposition/schema.js';
import {validateCentralAxisDecompositionResult} from '../packages/pipeline/dist/central-axis-decomposition/evaluator.js';
import {buildCentralStoryGatePayload,CentralStoryGateV4ErrorClaimsResultSchema as L1,validateCentralStoryGateResult} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root='docs/experiments/dual-routing-sensitive-six-2026-09-30';
const oldGen='docs/experiments/meta-axis-generation-corporate-p4-2026-09-29';
const oldEval='docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29';
const phase=process.argv[2];
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const text=p=>readFileSync(p,'utf8');
const save=(n,v)=>writeFileSync(`${root}/${n}`,JSON.stringify(v,null,2)+'\n');
const lines=n=>existsSync(`${root}/${n}`)?text(`${root}/${n}`).trim().split('\n').filter(Boolean).map(JSON.parse):[];
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const Gen=Base.extend({schemaVersion:z.literal('central-axis-meta-openai-v1'),centralAxes:z.array(Base.shape.centralAxes.element.extend({metaAxis:z.string().min(1)})).min(1)});
const Meta=z.object({axes:z.array(z.object({axisId:z.string(),fulfilled:z.boolean(),reason:z.string(),evidenceQuotes:z.array(z.string()),unresolvedMeaning:z.string().nullable()}))});
const defs=()=>read(`${root}/case-definitions.json`);
const oldTemplate=()=>read(`${oldGen}/requests.json`).find(j=>j.id==='candidate-2').request;
const expected={sufficient:'전체 조용한 통과',concrete:'전체 조용한 통과',functional:'통과 또는 선택적 보완을 선호하나 생성 메타 범위에 따라 탐색',missing:'핵심 연결 미확인: 질문, 명시 오류로 취급하지 않음',error:'적어도 한 축 ERROR 질문'};
function route(l,m,valid=true){
  if(!valid)return 'EVALUATION_ERROR';
  if(l==='PASS'||l==='UNCLEAR_OK')return 'SILENT_PASS';
  if(l==='ERROR')return 'ERROR_QUESTION';
  assert.equal(l,'UNCLEAR_SERIOUS');return m?'OPTIONAL_REPAIR':'ASK';
}
function interpret(response,job,c){
  let raw=null,validated=null,normalizationEvents=null,contractError=null;
  try{
    assert.equal(response?.status,'completed');raw=JSON.parse(response.output_text);
    if(job.level==='generation'){
      validated=Gen.parse(raw);const {centralAxes,...rest}=validated;
      validateCentralAxisDecompositionResult(Base.parse({...rest,schemaVersion:'central-axis-decomposition-openai-v2',centralAxes:centralAxes.map(({id,description})=>({id,description}))}),JSON.parse(job.request.input));
      assert.deepEqual(centralAxes.map(a=>a.id),centralAxes.map((_,i)=>`AX${i+1}`));
    }else if(job.level==='level1'){
      const v=validateCentralStoryGateResult(L1.parse(raw),c.level1Input);validated=v.result;normalizationEvents=v.normalizationEvents;
      assert.deepEqual(raw.axisFeedback,validated.axisFeedback,'Validation changed axis feedback');
    }else{
      validated=Meta.parse(raw);
      assert.deepEqual(validated.axes.map(a=>a.axisId).sort(),c.level2Input.metaAxes.map(a=>a.id).sort());
      for(const a of validated.axes){
        assert.ok(a.reason.trim());for(const q of a.evidenceQuotes)assert.ok(q.trim()&&c.response.includes(q),'Non-exact student quote');
        if(a.fulfilled){assert.ok(a.evidenceQuotes.length);assert.equal(a.unresolvedMeaning,null);}else assert.ok(a.unresolvedMeaning?.trim());
      }
    }
  }catch(e){contractError=e.message;validated=null;}
  return {raw,validated,normalizationEvents,contractError};
}
function preflight(stage){
  const m=read(`${root}/${stage}-manifest.json`),jobs=read(`${root}/${stage}-requests.json`);
  assert.equal(hash(jobs),m.requestsHash);assert.equal(hash(defs()),m.definitionsHash);assert.equal(hash(text(`${root}/PLAN.md`)),m.planHash);
  for(const s of read(`${root}/source-snapshots.json`))assert.equal(hash(text(s.source)),s.sourceHash,'Operational gold changed');
  const cases=stage==='evaluation'?read(`${root}/cases.json`):[];
  if(stage==='evaluation'){
    assert.equal(hash(cases),m.casesHash);assert.equal(hash(read(`${root}/frozen-golds.json`)),m.goldsHash);
    for(const l of ['level1','level2'])assert.equal(text(`${root}/${l}-instructions.md`),text(`${oldEval}/${l}-instructions.md`));
    for(const c of cases)for(const level of ['level1','level2']){
      const jj=jobs.filter(j=>j.caseId===c.id&&j.level===level);assert.equal(jj.length,3);assert.equal(new Set(jj.map(j=>j.requestHash)).size,1);
      for(const j of jj){const p=JSON.parse(j.request.input);assert.equal(j.request.instructions,text(`${oldEval}/${level}-instructions.md`));
        assert.equal(j.request.input,level==='level1'?buildCentralStoryGatePayload(c.level1Input):JSON.stringify(c.level2Input,null,2));
        if(level==='level2')assert.deepEqual(Object.keys(p).sort(),['metaAxes','studentResponse']);
        else assert.deepEqual(Object.keys(p).sort(),['centralAxes','evidence','paragraphText','revealedAxisContent','turn']);
      }
    }
  }else for(const j of jobs){assert.deepEqual({...j.request,input:oldTemplate().input},oldTemplate());assert.deepEqual(Object.keys(JSON.parse(j.request.input)).sort(),['centralStory','paragraphId']);}
  for(const j of jobs)assert.equal(hash(j.request),j.requestHash);
  assert.equal(jobs.length,m.calls);return {m,jobs,cases};
}
async function run(stage){
  const {m,jobs,cases}=preflight(stage);assert.ok(process.env.OPENAI_API_KEY,'Missing API key');
  assert.ok(!existsSync(`${root}/${stage}-started.json`),'Already started; no automatic paid reruns');
  save(`${stage}-started.json`,{at:new Date().toISOString()});let cursor=0,wireCount=0;
  async function worker(){while(cursor<jobs.length){
    const job=jobs[cursor++],start=performance.now();let response=null,apiError=null;
    const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
      assert.equal(typeof options.body,'string');assert.deepEqual(JSON.parse(options.body),job.request);assert.ok(++wireCount<=m.calls);
      appendFileSync(`${root}/${stage}-wire.jsonl`,JSON.stringify({id:job.id,at:new Date().toISOString(),bodyHash:hash(options.body),body:options.body})+'\n');return globalThis.fetch(url,options);
    }});
    try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
    const {request,...meta}=job;const r={...meta,durationMs:Math.round(performance.now()-start),response,apiError,...interpret(response,job,cases.find(c=>c.id===job.caseId))};
    appendFileSync(`${root}/${stage}-results.jsonl`,JSON.stringify(r)+'\n');
    console.log(JSON.stringify({id:r.id,ms:r.durationMs,axes:r.validated?.centralAxes??r.validated?.axes?.map(a=>[a.axisId,a.fulfilled])??r.validated?.axisFeedback?.map(a=>[a.axisId,a.status]),apiError,contractError:r.contractError}));
  }}await Promise.all(Array.from({length:m.concurrency},worker));
}
function audit(stage){
  const {jobs,cases}=preflight(stage),rows=lines(`${stage}-results.jsonl`),wire=lines(`${stage}-wire.jsonl`);
  assert.equal(rows.length,jobs.length);assert.equal(wire.length,jobs.length);assert.equal(new Set(rows.map(r=>r.id)).size,jobs.length);
  assert.deepEqual(wire.map(w=>w.id).sort(),jobs.map(j=>j.id).sort());
  for(const w of wire){assert.equal(hash(w.body),w.bodyHash);assert.deepEqual(JSON.parse(w.body),jobs.find(j=>j.id===w.id).request);}
  for(const r of rows){const job=jobs.find(j=>j.id===r.id);assert.equal(r.requestHash,job.requestHash);const v=interpret(r.response,job,cases.find(c=>c.id===r.caseId));for(const k of Object.keys(v))assert.deepEqual(r[k],v[k]);}
  save(`${stage}-audit.json`,{at:new Date().toISOString(),calls:rows.length,valid:rows.filter(r=>r.validated&&!r.apiError).length,wireMatchesFrozenRequests:true,validationReproduced:true,retries:0,operationalGoldUnchanged:true});return {rows,cases};
}
if(phase==='test'){
  const table={PASS:['SILENT_PASS','SILENT_PASS'],UNCLEAR_OK:['SILENT_PASS','SILENT_PASS'],UNCLEAR_SERIOUS:['ASK','OPTIONAL_REPAIR'],ERROR:['ERROR_QUESTION','ERROR_QUESTION']};
  for(const [l,rr] of Object.entries(table))for(const [i,m] of [false,true].entries()){assert.equal(route(l,m),rr[i]);assert.equal(route(l,m,false),'EVALUATION_ERROR');}
  const c={response:'표현한 관계',level2Input:{metaAxes:[{id:'AX1'}]}};
  const mock=q=>({status:'completed',output_text:JSON.stringify({axes:[{axisId:'AX1',fulfilled:true,reason:'근거 있음',evidenceQuotes:[q],unresolvedMeaning:null}]})});
  assert.equal(interpret(mock(c.response),{level:'level2'},c).contractError,null);assert.ok(interpret(mock('없는 관계'),{level:'level2'},c).contractError);
  assert.equal(defs().length,6);assert.ok(defs().every(p=>p.responses.length===5&&new Set(p.responses.map(c=>c.kind)).size===5));console.log('Routing, exact quote, and 30-case structure tests passed; no API.');
}else if(phase==='prepare-generation'){
  assert.ok(!existsSync(`${root}/generation-manifest.json`));const sources=defs().map(d=>{const source=`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${d.paragraphId}.json`;return {id:d.id,title:d.title,source,sourceHash:hash(text(source)),gold:read(source)};});
  const jobs=sources.map(s=>{const request={...oldTemplate(),input:JSON.stringify({paragraphId:s.gold.paragraphId,centralStory:s.gold.centralStory},null,2)};return {id:s.id,paragraphId:s.gold.paragraphId,level:'generation',request,requestHash:hash(request)};});
  save('source-snapshots.json',sources);save('generation-requests.json',jobs);writeFileSync(`${root}/generation-instructions.md`,oldTemplate().instructions);
  save('generation-manifest.json',{preparedAt:new Date().toISOString(),calls:6,concurrency:2,requestsHash:hash(jobs),definitionsHash:hash(defs()),planHash:hash(text(`${root}/PLAN.md`)),retries:0,template:`${oldGen}/requests.json#candidate-2`});preflight('generation');console.log('Prepared generation6; frozen30 responses.');
}else if(phase==='preserve-dns-failure'){
  const rr=lines('generation-results.jsonl');assert.equal(rr.length,6);assert.ok(rr.every(r=>r.apiError&&r.response===null));
  for(const n of ['started.json','wire.jsonl','results.jsonl']){const dest=`${root}/generation-dns-failed-${n}`;assert.ok(!existsSync(dest));renameSync(`${root}/generation-${n}`,dest);}
  save('network-recovery.json',{reason:'Default sandbox lookup failed: getaddrinfo ENOTFOUND api.openai.com; all six SDK calls returned connection error without a response.',modelOutputs:0,preservedFailedAttempts:6,subsequentAction:'Retry the same frozen requests with network permission; not a semantic rerun.'});console.log('Preserved failed connection attempts; frozen requests unchanged.');
}else if(phase==='run-generation')await run('generation');
else if(phase==='audit-generation'){audit('generation');console.log('Generation audit passed.');}
else if(phase==='prepare-evaluation'){
  assert.ok(!existsSync(`${root}/evaluation-manifest.json`));const {rows}=audit('generation'),sources=read(`${root}/source-snapshots.json`),cases=[],golds=[];
  const base=read(`${oldEval}/cases.json`)[0].level1Input;
  for(const d of defs()){
    const r=rows.find(r=>r.id===d.id);if(!r.validated||r.apiError)continue;
    const original=sources.find(s=>s.id===d.id).gold,axes=r.validated.centralAxes;
    const gold={...original,centralAxes:axes.map(({id,description})=>({id,description,relationIds:[]})),coreRelations:[],keyMappings:[],supportingConcepts:[]};
    golds.push({id:d.id,title:d.title,original,axes,generationVerdict:r.validated.verdict,generationIssues:r.validated.issues});
    for(const c of d.responses)cases.push({...c,id:`${d.id}-${c.kind}`,paragraphId:d.paragraphId,title:d.title,source:'synthetic-frozen-before-generation',expected:expected[c.kind],expectedBasis:'Codex 사전 가설; 사람 정답 아님',level1Input:{...base,gold,goldVersion:'sensitive-six-regenerated-experiment',goldHash:'sha256:'+hash(gold),initialResponse:c.response},level2Input:{metaAxes:axes.map(({id,metaAxis})=>({id,metaAxis})),studentResponse:c.response}});
  }
  for(const l of ['level1','level2'])writeFileSync(`${root}/${l}-instructions.md`,text(`${oldEval}/${l}-instructions.md`));
  const jobs=[];for(let repeat=1;repeat<=3;repeat++)for(const c of cases)for(const level of repeat===2?['level2','level1']:['level1','level2']){
    const request={model:'gpt-5.6-terra',instructions:text(`${root}/${level}-instructions.md`),input:level==='level1'?buildCentralStoryGatePayload(c.level1Input):JSON.stringify(c.level2Input,null,2),reasoning:{effort:'medium'},max_output_tokens:4000,store:false,text:{format:zodTextFormat(level==='level1'?L1:Meta,level==='level1'?'central_story_gate_result':'meta_axis_evaluation')}};
    jobs.push({id:`${c.id}-${level}-${repeat}`,caseId:c.id,level,repeat,request,requestHash:hash(request)});
  }
  assert.ok(jobs.length<=180);save('cases.json',cases);save('frozen-golds.json',golds);save('evaluation-requests.json',jobs);save('evaluation-manifest.json',{preparedAt:new Date().toISOString(),calls:jobs.length,concurrency:4,requestsHash:hash(jobs),definitionsHash:hash(defs()),planHash:hash(text(`${root}/PLAN.md`)),casesHash:hash(cases),goldsHash:hash(golds),retries:0});preflight('evaluation');console.log(`Prepared ${jobs.length} evaluation requests. No evaluation API calls yet.`);
}else if(phase==='run-evaluation')await run('evaluation');
else if(phase==='audit'){
  audit('generation');const {rows,cases}=audit('evaluation');const golds=read(`${root}/frozen-golds.json`);
  const pairs=cases.flatMap(c=>[1,2,3].map(repeat=>{
    const rr=rows.filter(r=>r.caseId===c.id&&r.repeat===repeat),l1=rr.find(r=>r.level==='level1'),l2=rr.find(r=>r.level==='level2');
    const valid=rr.length===2&&rr.every(r=>r.validated&&!r.apiError);
    const axes=c.level2Input.metaAxes.map(a=>{const v1=l1.validated?.axisFeedback.find(x=>x.axisId===a.id),v2=l2.validated?.axes.find(x=>x.axisId===a.id);return {axisId:a.id,level1:v1??null,level2:v2??null,route:route(v1?.status,v2?.fulfilled,valid),l1Only:route(v1?.status,false,valid)};});
    return {caseId:c.id,kind:c.kind,paragraphId:c.paragraphId,repeat,valid,axes};
  }));
  const stats=['generation','level1','level2'].map(level=>{const rr=level==='generation'?lines('generation-results.jsonl'):rows.filter(r=>r.level===level),times=rr.map(r=>r.durationMs).sort((a,b)=>a-b),n=times.length;return {level,calls:n,valid:rr.filter(r=>r.validated&&!r.apiError).length,medianMs:n%2?times[(n-1)/2]:(times[n/2-1]+times[n/2])/2,inputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens??0),0),cachedTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens_details?.cached_tokens??0),0),outputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.output_tokens??0),0)};});
  const counts={};for(const p of pairs)for(const a of p.axes)counts[a.route]=(counts[a.route]??0)+1;
  save('summary.json',{stats,validPairs:pairs.filter(p=>p.valid).length,routeCounts:counts,pairs});
  const doc=['# 민감 6문단 이중 판정 전체 기록','','원문과 생성 결과, 동결 합성 응답 및 3회 판정을 보존한다. 기대는 Codex 가설이지 사람 승인 정답이 아니다.',''];
  for(const g of golds){doc.push(`## ${g.title}`,'','### 원문','',g.original.paragraphText,'','### 생성 입력 중심 이야기','',g.original.centralStory,'','### 기존 축');for(const a of g.original.centralAxes)doc.push(`- ${a.id}: ${a.description}`);doc.push('','### 새 구체 축·메타 축','',`생성 상태: ${g.generationVerdict}; issues: ${JSON.stringify(g.generationIssues)}`,'');for(const a of g.axes)doc.push(`- ${a.id} 구체: ${a.description}`,`  - 메타: ${a.metaAxis}`);
    for(const c of cases.filter(c=>c.paragraphId===g.original.paragraphId)){doc.push('',`### ${c.id}`,'',c.response,'',`사전 기대(Codex): ${c.expected}`,'','| 반복 | 축 | L1 | L2 | L1만 | 이중 정책 |','|---|---|---|---|---|---|');for(const p of pairs.filter(p=>p.caseId===c.id))for(const a of p.axes)doc.push(`| ${p.repeat} | ${a.axisId} | ${a.level1?.status??'계약실패'} | ${a.level2?.fulfilled??'계약실패'} | ${a.l1Only} | ${a.route} |`);
      for(const r of rows.filter(r=>r.caseId===c.id).sort((a,b)=>a.repeat-b.repeat||a.level.localeCompare(b.level)))doc.push('',`#### ${r.id}`,'',`계약 오류: ${r.contractError??'없음'}; API 오류: ${JSON.stringify(r.apiError)}`,'','```json',JSON.stringify(r.raw,null,2),'```');
    }
  }writeFileSync(`${root}/REVIEW-PACKET.md`,doc.join('\n')+'\n');console.log(JSON.stringify({stats,validPairs:pairs.filter(p=>p.valid).length,routeCounts:counts},null,2));
}else throw new Error('Unknown phase');
