import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {CentralAxisDecompositionResultSchema as Base} from '../packages/pipeline/dist/central-axis-decomposition/schema.js';
import {validateCentralAxisDecompositionResult} from '../packages/pipeline/dist/central-axis-decomposition/evaluator.js';
import {buildCentralStoryGatePayload,CentralStoryGateV4ErrorClaimsResultSchema as L1,validateCentralStoryGateResult} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root='docs/experiments/conditional-meta-natural-eight-2026-10-01';
const oldEval='docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29';
const oldGen='docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/requests.json';
const six='docs/experiments/dual-routing-sensitive-six-2026-09-30/frozen-golds.json';
const humanPath='docs/review/natural-eight-human-routing-2026-10-01.json';
const txt=p=>readFileSync(p,'utf8');
const read=p=>JSON.parse(txt(p));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const save=(n,v)=>writeFileSync(`${root}/${n}`,JSON.stringify(v,null,2)+'\n');
const append=(n,v)=>appendFileSync(`${root}/${n}`,JSON.stringify(v)+'\n');
const lines=n=>existsSync(`${root}/${n}`)?txt(`${root}/${n}`).trim().split('\n').filter(Boolean).map(JSON.parse):[];
const Gen=Base.extend({schemaVersion:z.literal('central-axis-meta-openai-v1'),centralAxes:z.array(Base.shape.centralAxes.element.extend({metaAxis:z.string().min(1)})).min(1)});
const Meta=z.object({axes:z.array(z.object({axisId:z.string(),fulfilled:z.boolean(),reason:z.string(),evidenceQuotes:z.array(z.string()),unresolvedMeaning:z.string().nullable()}))});
const template=()=>read(oldGen).find(x=>x.id==='candidate-2').request;
const eligible=r=>r.validated?.axisFeedback.filter(a=>a.status==='UNCLEAR_SERIOUS').map(a=>a.axisId)??[];
function route(l,m){
  if(l==='PASS'||l==='UNCLEAR_OK')return 'SILENT_PASS';
  if(l==='ERROR')return 'ERROR_QUESTION';
  if(l!=='UNCLEAR_SERIOUS'||typeof m!=='boolean')return 'EVALUATION_ERROR';
  return m?'OPTIONAL_REPAIR':'ASK';
}
function paragraph(routes){return ['EVALUATION_ERROR','ERROR_QUESTION','ASK','OPTIONAL_REPAIR','SILENT_PASS'].find(r=>routes.includes(r));}
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
      assert.deepEqual(raw.axisFeedback,validated.axisFeedback,'Validator changed axis feedback');
    }else{
      validated=Meta.parse(raw);const input=JSON.parse(job.request.input);
      assert.deepEqual(validated.axes.map(a=>a.axisId).sort(),input.metaAxes.map(a=>a.id).sort());
      for(const a of validated.axes){
        assert.ok(a.reason.trim());for(const q of a.evidenceQuotes)assert.ok(q.trim()&&input.studentResponse.includes(q),'Non-exact student quote');
        if(a.fulfilled){assert.ok(a.evidenceQuotes.length);assert.equal(a.unresolvedMeaning,null);}else assert.ok(a.unresolvedMeaning?.trim());
      }
    }
  }catch(e){contractError=e.message;validated=null;}
  return {raw,validated,normalizationEvents,contractError};
}
function request(level,input){return {model:'gpt-5.6-terra',instructions:txt(`${root}/${level}-instructions.md`),input,reasoning:{effort:'medium'},max_output_tokens:4000,store:false,text:{format:zodTextFormat(level==='level1'?L1:Meta,level==='level1'?'central_story_gate_result':'meta_axis_evaluation')}};}
function l2job(c,parent){
  const ids=eligible(parent);assert.ok(ids.length);
  const req=request('level2',JSON.stringify({metaAxes:c.axes.filter(a=>ids.includes(a.id)).map(({id,metaAxis})=>({id,metaAxis})),studentResponse:c.response},null,2));
  return {id:`${c.id}-level2-${parent.repeat}`,caseId:c.id,repeat:parent.repeat,level:'level2',parentId:parent.id,parentResultHash:hash(parent),targetAxisIds:ids,request:req,requestHash:hash(req)};
}
function checkSources(){
  const m=read(`${root}/sources.json`);
  for(const s of m.files)assert.equal(hash(txt(s.path)),s.hash,`Source changed: ${s.path}`);
  return m;
}
function checkEvaluation(){
  checkSources();const m=read(`${root}/evaluation-manifest.json`),jobs=read(`${root}/evaluation-requests.json`),cases=read(`${root}/cases.json`);
  assert.equal(hash(jobs),m.requestsHash);assert.equal(hash(cases),m.casesHash);
  for(const l of ['level1','level2'])assert.equal(txt(`${root}/${l}-instructions.md`),txt(`${oldEval}/${l}-instructions.md`));
  assert.equal(jobs.length,24);
  for(const c of cases){const jj=jobs.filter(j=>j.caseId===c.id);assert.equal(jj.length,3);assert.equal(new Set(jj.map(j=>j.requestHash)).size,1);for(const j of jj){assert.equal(hash(j.request),j.requestHash);assert.deepEqual(j.request,request('level1',buildCentralStoryGatePayload(c.level1Input)));}}
  return {jobs,cases};
}
async function call(job,c,stage){
  const start=performance.now();let response=null,apiError=null;
  const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
    assert.deepEqual(JSON.parse(options.body),job.request);
    append(`${stage}-wire.jsonl`,{id:job.id,at:new Date().toISOString(),bodyHash:hash(options.body),body:options.body});
    return globalThis.fetch(url,options);
  }});
  try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
  const {request:unused,...meta}=job;
  const row={...meta,durationMs:Math.round(performance.now()-start),response,apiError,...interpret(response,job,c)};
  append(`${stage}-results.jsonl`,row);
  console.log(JSON.stringify({id:row.id,ms:row.durationMs,axes:row.validated?.centralAxes??row.validated?.axisFeedback?.map(a=>[a.axisId,a.status])??row.validated?.axes,apiError,contractError:row.contractError}));return row;
}
async function pool(jobs,fn,n=2){let cursor=0;await Promise.all(Array.from({length:n},async()=>{while(cursor<jobs.length)await fn(jobs[cursor++]);}));}
function auditRows(stage,jobs,cases=[]){
  const rr=lines(`${stage}-results.jsonl`),ww=lines(`${stage}-wire.jsonl`);
  assert.equal(rr.length,jobs.length);assert.equal(ww.length,jobs.length);
  assert.equal(new Set(rr.map(r=>r.id)).size,jobs.length);assert.equal(new Set(ww.map(r=>r.id)).size,jobs.length);
  for(const j of jobs){const r=rr.find(r=>r.id===j.id),w=ww.find(w=>w.id===j.id);assert.ok(r&&w);assert.equal(hash(w.body),w.bodyHash);assert.deepEqual(JSON.parse(w.body),j.request);assert.equal(r.requestHash,j.requestHash);for(const [k,v] of Object.entries(interpret(r.response,j,cases.find(c=>c.id===j.caseId))))assert.deepEqual(r[k],v);}
  return rr;
}
const phase=process.argv[2];
if(phase==='test'){
  for(const l of ['PASS','UNCLEAR_OK','ERROR'])for(const m of [true,false,undefined])assert.equal(route(l,m),l==='ERROR'?'ERROR_QUESTION':'SILENT_PASS');
  assert.equal(route('UNCLEAR_SERIOUS',true),'OPTIONAL_REPAIR');assert.equal(route('UNCLEAR_SERIOUS',false),'ASK');assert.equal(route('UNCLEAR_SERIOUS',undefined),'EVALUATION_ERROR');
  assert.deepEqual(eligible({validated:{axisFeedback:[{axisId:'AX1',status:'PASS'},{axisId:'AX2',status:'UNCLEAR_SERIOUS'},{axisId:'AX3',status:'ERROR'}]}}),['AX2']);
  assert.deepEqual(eligible({validated:null}),[]);assert.equal(paragraph(['SILENT_PASS','OPTIONAL_REPAIR']),'OPTIONAL_REPAIR');
  const job={level:'level2',request:{input:JSON.stringify({metaAxes:[{id:'AX2'}],studentResponse:'실제 응답'})}};
  const response=q=>({status:'completed',output_text:JSON.stringify({axes:[{axisId:'AX2',fulfilled:true,reason:'근거',evidenceQuotes:[q],unresolvedMeaning:null}]})});
  assert.equal(interpret(response('실제'),job).contractError,null);assert.ok(interpret(response('없는 응답'),job).contractError);
  const human=read(humanPath);assert.ok(human.cases[6].acceptableRoutes.includes('ASK'));assert.ok(human.cases[6].acceptableRoutes.includes('OPTIONAL_REPAIR'));assert.ok(!human.cases[6].acceptableRoutes.includes('SILENT_PASS'));
  console.log('Conditional routing, mixed-axis isolation, exact quotes, human allowed-set tests passed; no API.');
}else if(phase==='prepare'){
  assert.ok(!existsSync(`${root}/sources.json`));const human=read(humanPath),all=read(human.sourceCases),previous=read(six),corp=read(`${oldEval}/frozen-gold.json`);
  const files=[humanPath,human.sourceCases,six,`${oldEval}/frozen-gold.json`,`${oldEval}/cases.json`,oldGen,`${root}/PLAN.md`,...['level1','level2'].map(l=>`${oldEval}/${l}-instructions.md`)];
  const sources=human.cases.map(h=>{const c=all.find(c=>c.id===h.sourceCaseId);assert.ok(c&&c.paragraphId===h.paragraphId);assert.equal(c.turn,1);assert.deepEqual(c.history,[]);const p=`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${h.paragraphId}.json`;files.push(p);const g=read(p),prev=previous.find(g=>g.original.paragraphId===h.paragraphId);return {id:c.id,number:h.number,original:g,sourceCase:c,axes:prev?.axes??(h.paragraphId===corp.paragraphId?corp.axes:null),axisSource:prev?six:h.paragraphId===corp.paragraphId?`${oldEval}/frozen-gold.json`:null};});
  save('human-reference.json',human);save('source-cases.json',sources);save('sources.json',{files:files.map(path=>({path,hash:hash(txt(path))})),sourceCasesHash:hash(sources),humanHash:hash(human)});
  const jobs=sources.filter(s=>!s.axes).map(s=>{const req={...template(),input:JSON.stringify({paragraphId:s.original.paragraphId,centralStory:s.original.centralStory},null,2)};return {id:s.id,paragraphId:s.original.paragraphId,level:'generation',request:req,requestHash:hash(req)};});
  assert.equal(jobs.length,2);save('generation-requests.json',jobs);save('generation-manifest.json',{requestsHash:hash(jobs),calls:2});
  for(const l of ['level1','level2'])writeFileSync(`${root}/${l}-instructions.md`,txt(`${oldEval}/${l}-instructions.md`));
  console.log('Frozen 8 actual responses, latest human reference, 6 reused assets, 2 generation requests.');
}else if(phase==='generate'){
  checkSources();assert.ok(!existsSync(`${root}/generation-started.json`));const jobs=read(`${root}/generation-requests.json`);assert.equal(hash(jobs),read(`${root}/generation-manifest.json`).requestsHash);assert.equal(jobs.length,2);
  save('generation-started.json',{at:new Date().toISOString()});await pool(jobs,j=>call(j,null,'generation'));
}else if(phase==='prepare-evaluation'){
  checkSources();assert.ok(!existsSync(`${root}/evaluation-manifest.json`));const sources=read(`${root}/source-cases.json`);assert.equal(hash(sources),read(`${root}/sources.json`).sourceCasesHash);
  const gen=auditRows('generation',read(`${root}/generation-requests.json`));assert.ok(gen.every(r=>r.validated&&!r.apiError),'Generation failure; do not regenerate automatically');
  const base=read(`${oldEval}/cases.json`)[0].level1Input;
  const cases=sources.map(s=>{const gr=gen.find(g=>g.id===s.id),axes=s.axes??gr.validated.centralAxes,gold={...s.original,centralAxes:axes.map(({id,description})=>({id,description,relationIds:[]})),coreRelations:[],keyMappings:[],supportingConcepts:[]};return {id:s.id,number:s.number,paragraphId:s.original.paragraphId,axes,axisSource:s.axisSource??`${root}/generation-results.jsonl#${s.id}`,generationVerdict:gr?.validated.verdict??'reused',response:s.sourceCase.initialResponse,level1Input:{...base,gold,goldVersion:'conditional-meta-natural-eight-experiment',goldHash:'sha256:'+hash(gold),initialResponse:s.sourceCase.initialResponse}};});
  const jobs=[1,2,3].flatMap(repeat=>cases.map(c=>{const req=request('level1',buildCentralStoryGatePayload(c.level1Input));return {id:`${c.id}-level1-${repeat}`,caseId:c.id,repeat,level:'level1',request:req,requestHash:hash(req)};}));
  save('cases.json',cases);save('evaluation-requests.json',jobs);save('evaluation-manifest.json',{at:new Date().toISOString(),casesHash:hash(cases),requestsHash:hash(jobs),l1Calls:24,l2Maximum:24,concurrency:2,retries:0});checkEvaluation();console.log('Frozen 24 L1 requests and deterministic conditional L2 template; no evaluation calls yet.');
}else if(phase==='evaluate'){
  const {jobs,cases}=checkEvaluation();assert.ok(!existsSync(`${root}/evaluation-started.json`));save('evaluation-started.json',{at:new Date().toISOString()});
  await pool(jobs,async j=>{const c=cases.find(c=>c.id===j.caseId),r=await call(j,c,'evaluation');if(eligible(r).length){const next=l2job(c,r);append('conditional-requests.jsonl',next);await call(next,c,'evaluation');}else append('skipped-level2.jsonl',{parentId:j.id,reason:r.validated?'NO_SERIOUS_AXIS':'L1_INVALID'});});
}else if(phase==='audit'){
  const {jobs,cases}=checkEvaluation(),dynamic=lines('conditional-requests.jsonl'),rr=auditRows('evaluation',[...jobs,...dynamic],cases),gen=auditRows('generation',read(`${root}/generation-requests.json`)),skips=lines('skipped-level2.jsonl');
  const human=read(`${root}/human-reference.json`);assert.equal(hash(human),read(`${root}/sources.json`).humanHash);
  for(const j of jobs){const r=rr.find(r=>r.id===j.id),cc=dynamic.filter(d=>d.parentId===j.id),ss=skips.filter(s=>s.parentId===j.id);if(eligible(r).length){assert.equal(cc.length,1);assert.equal(ss.length,0);assert.deepEqual(cc[0],l2job(cases.find(c=>c.id===j.caseId),r));}else{assert.equal(cc.length,0);assert.equal(ss.length,1);}}
  assert.ok(rr.length<=48);assert.equal(dynamic.length+skips.length,24);
  const pairs=jobs.map(j=>{const c=cases.find(c=>c.id===j.caseId),l1=rr.find(r=>r.id===j.id),l2=rr.find(r=>r.parentId===j.id),h=human.cases.find(h=>h.sourceCaseId===c.id);const axes=c.axes.map(a=>{const v1=l1.validated?.axisFeedback.find(v=>v.axisId===a.id),v2=l2?.validated?.axes.find(v=>v.axisId===a.id);return {axisId:a.id,level1:v1??null,level2:v2??null,route:route(v1?.status,v2?.fulfilled),l1Only:route(v1?.status,false)};});const final=paragraph(axes.map(a=>a.route)),l1Only=paragraph(axes.map(a=>a.l1Only));return {caseId:c.id,number:c.number,repeat:j.repeat,l2Called:!!l2,valid:final!=='EVALUATION_ERROR',axes,route:final,l1Only,acceptableRoutes:h.acceptableRoutes,accepted:h.acceptableRoutes.includes(final),l1OnlyAccepted:h.acceptableRoutes.includes(l1Only),durationMs:l1.durationMs+(l2?.durationMs??0)};});
  const stats=['generation','level1','level2'].map(level=>{const rows=level==='generation'?gen:rr.filter(r=>r.level===level),times=rows.map(r=>r.durationMs).sort((a,b)=>a-b),n=times.length;return {level,calls:n,valid:rows.filter(r=>r.validated&&!r.apiError).length,medianMs:n?(n%2?times[(n-1)/2]:(times[n/2-1]+times[n/2])/2):null,inputTokens:rows.reduce((s,r)=>s+(r.response?.usage?.input_tokens??0),0),cachedTokens:rows.reduce((s,r)=>s+(r.response?.usage?.input_tokens_details?.cached_tokens??0),0),outputTokens:rows.reduce((s,r)=>s+(r.response?.usage?.output_tokens??0),0)};});
  const result={stats,totalCalls:gen.length+rr.length,validPairs:pairs.filter(p=>p.valid).length,accepted:pairs.filter(p=>p.accepted).length,l1OnlyAccepted:pairs.filter(p=>p.l1OnlyAccepted).length,l2RouteChanges:pairs.filter(p=>p.valid&&p.route!==p.l1Only).length,l2Skipped:skips.length,pairs};save('summary.json',result);save('audit.json',{at:new Date().toISOString(),wireMatchesFrozenRequests:true,validationReproduced:true,conditionalSubsetExact:true,humanReferenceUnchanged:true,sourceFilesUnchanged:true,retries:0,totalCalls:result.totalCalls});
  const doc=['# 실제8응답 조건부 메타 판정 — 전체 검토 자료','','사람 기준은 모델에 제공하지 않았다. 질문 문구는 생성하지 않았다.',''];
  for(const c of cases){const h=human.cases.find(h=>h.sourceCaseId===c.id);doc.push(`## ${c.number}. ${c.paragraphId} (${c.id})`,'','### 원문','',c.level1Input.gold.paragraphText,'','### 실제 응답','',c.response,'','### 구체 축 / 메타 축','',`출처: ${c.axisSource}`,'');for(const a of c.axes)doc.push(`- ${a.id}: ${a.description}`,`  - 메타: ${a.metaAxis}`);doc.push('',`사람 허용: ${h.acceptableRoutes.join(' / ')}; 보완 초점: ${h.focus??'별도 명시 없음'}`,'','| 반복 | 축 | L1 | L2 | 최종 경로 |','|---|---|---|---|---|');for(const p of pairs.filter(p=>p.caseId===c.id))for(const a of p.axes)doc.push(`| ${p.repeat} | ${a.axisId} | ${a.level1?.status??'실패'} | ${a.level2?.fulfilled??(a.level1?.status==='UNCLEAR_SERIOUS'?'실패':'미호출')} | ${a.route} |`);for(const r of rr.filter(r=>r.caseId===c.id))doc.push('',`### ${r.id}`,'',`계약 실패: ${r.contractError??'없음'}`,'','```json',JSON.stringify(r.raw,null,2),'```');}
  writeFileSync(`${root}/REVIEW-PACKET.md`,doc.join('\n')+'\n');console.log(JSON.stringify(result,null,2));
}else throw new Error('Unknown phase');
