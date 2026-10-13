#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ROOT, read, jsonLines, loadInputs, buildJobs, attributionJob, checkApproval } from './lib/holistic-verdict-shadow-data.mjs';
import { sha } from './lib/natural-response-disagreement.mjs';
import { validateShadow, validateAttribution } from './lib/holistic-verdict-shadow-contract.mjs';
import { executeJobs, mockCall } from './lib/holistic-verdict-shadow-execution.mjs';
import { report } from './lib/holistic-verdict-shadow-report.mjs';

const write=(dir,name,value)=>writeFileSync(`${dir}/${name}`,JSON.stringify(value,null,2)+'\n');
const writeLines=(dir,name,rows)=>writeFileSync(`${dir}/${name}`,rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
const estimate=request=>{
  const characters=[request.instructions,request.input,JSON.stringify(request.text.format)].reduce((s,t)=>s+[...t].length,0);
  return {characters,estimatedInputTokens:Math.ceil(characters/2)};
};
function mockViolations(bundle) {
  const point=bundle.points[0],quote=point.dialogue[0].text;
  const good={overall:'unresolved',understoodRelations:[],brokenRelation:{description:'모의 공백',studentQuote:quote,kind:'incorrect'},
    unconfirmed:['미확인'],questionWorthy:true,question:'어떤 관계인가요?',confidence:'high'};
  const cases=[['인용 불일치',{...good,brokenRelation:{...good.brokenRelation,studentQuote:'학생이 말하지 않은 인용'}}],
    ['resolved인데 brokenRelation이 있음',{...good,overall:'resolved',questionWorthy:false,question:null}],
    ['incorrect인데 인용이 null',{...good,brokenRelation:{...good.brokenRelation,studentQuote:null}}]];
  const results=cases.map(([name,value])=>({name,errors:validateShadow(value,point.dialogue)}));
  const axes=bundle.sources[point.paragraphId].gold.centralAxes;
  const attr={axisAttribution:[axes[0].id],unconfirmedAttribution:[[]],reason:'모의 귀속'};
  results.push({name:'축 id 오류',errors:validateAttribution({...attr,axisAttribution:['INVALID']},axes,good.unconfirmed)},
    {name:'길이 불일치',errors:validateAttribution({...attr,unconfirmedAttribution:[]},axes,good.unconfirmed)});
  assert.ok(results.every(r=>r.errors.length),'mock violation not detected');
  assert.deepEqual(validateShadow(good,point.dialogue),[]);assert.deepEqual(validateAttribution(attr,axes,good.unconfirmed),[]);
  return results;
}
export async function prepare() {
  const bundle=loadInputs(),jobs=buildJobs(bundle);
  if(existsSync(`${ROOT}/manifest.json`))assert.deepEqual(read(`${ROOT}/manifest.json`).fixedInputHashes,bundle.hashes,'frozen input changed since prepare');
  mkdirSync(`${ROOT}/mock`,{recursive:true});
  const manifest={version:'holistic-verdict-shadow-v1',fixedInputHashes:bundle.hashes,parameters:bundle.parameters,
    selectedB:bundle.points.filter(p=>p.source==='B').map(p=>({pointId:p.pointId,sourceLine:p.sourceLine,sourceLineHash:p.sourceLineHash,schemaVersion:p.schemaVersion})),
    counts:{A:45,B:27,probe:13},retries:0,maximumCalls:353,apiCalls:0,
    instructionHashes:{shadow:sha(bundle.instructions),attribution:sha(bundle.attributionInstructions)}};
  write(ROOT,'manifest.json',manifest);write(ROOT,'points.json',bundle.points);write(ROOT,'sources.json',bundle.sources);
  write(ROOT,'probe-human.json',bundle.probes.map(({pointId,paragraphId,human})=>({pointId,paragraphId,...human})));
  writeLines(ROOT,'requests.jsonl',jobs);
  const violations=mockViolations(bundle);write(`${ROOT}/mock`,'contract-violations.json',violations);
  const executed=await executeJobs(bundle,jobs,mockCall(bundle),()=>{});
  assert.ok(executed.results.every(r=>r.errors.length===0),'normal mock response failed contract');
  writeLines(`${ROOT}/mock`,'requests.jsonl',executed.jobs);writeLines(`${ROOT}/mock`,'responses.jsonl',executed.envelopes);
  const mock=await report(bundle,executed.jobs,executed.envelopes,`${ROOT}/mock`,{mock:true});
  const estimates=jobs.map(j=>({id:j.id,kind:j.kind,...estimate(j.request)}));
  const emptyBroken={brokenRelation:{description:'',studentQuote:null,kind:'missing'},unconfirmed:[]};
  const attributionEstimates=bundle.points.flatMap(p=>['H0','H1'].map(arm=>({id:`${p.pointId}-${arm}-attribution`,
    kind:'attribution',...estimate(attributionJob(bundle,p,arm,emptyBroken).request)})));
  const total=list=>({requests:list.length,characters:list.reduce((s,x)=>s+x.characters,0),estimatedInputTokens:list.reduce((s,x)=>s+x.estimatedInputTokens,0)});
  const preflight={apiCalls:0,points:{A:45,B:27,probe:13,total:85,realInitial:45,realFollowup:27,probeInitial:13},
    requests:{shadow:170,probeV4:13,prepared:183,attributionMaximum:170,maximumCalls:353},
    inputTokens:{method:'instructions + input + text.format의 Unicode 문자 수를 2로 나누고 요청별 올림. 토크나이저 사용 없음. API 메시지 오버헤드 제외.',
      fixed:total(estimates),shadow:total(estimates.filter(e=>e.kind==='shadow')),probeV4:total(estimates.filter(e=>e.kind==='v4')),
      attributionStructuralOnly:total(attributionEstimates),
      attributionNote:'축 귀속은 빈 brokenRelation 설명·null 인용·빈 unconfirmed로 추정한 구조분이다. 실제 그림자 출력 문자열에 따른 추가 입력은 미포함이며 상한이 아니다.',
      details:estimates,attributionDetails:attributionEstimates},
    validation:{probeHashesMatch:true,goldHashesMatch:true,aCaseOrderMatch:true,modelParametersMatch:true,h0h1OnlyReferenceDiffers:true,
      probeV4TemplatePreserved:true,mockViolationChecks:violations.length,mockReportComplete:true,blindReview:mock.reviews.blindValidation},
    mock:{responses:executed.envelopes.length,attributionCalls:executed.jobs.filter(j=>j.kind==='attribution').length,
      reviewPoints:mock.reviews.selection.order.length,secondReviewPoints:mock.reviews.secondOrder.length},
    remaining:'실제 API 실행과 평가 품질 검증, 사람 판정, 2차 반복 검증은 미실행이다.'};
  write(ROOT,'preflight-validation.json',preflight);return preflight;
}
function assertFrozen(bundle,jobs) {
  const manifest=read(`${ROOT}/manifest.json`);
  assert.deepEqual(manifest.fixedInputHashes,bundle.hashes,'frozen input changed');
  assert.deepEqual(jsonLines(`${ROOT}/requests.jsonl`),jobs,'prepared requests changed');
  assert.deepEqual(read(`${ROOT}/points.json`),bundle.points,'prepared points changed');
  assert.deepEqual(read(`${ROOT}/sources.json`),bundle.sources,'prepared sources changed');
  assert.deepEqual(read(`${ROOT}/probe-human.json`),bundle.probes.map(({pointId,paragraphId,human})=>({pointId,paragraphId,...human})),'probe human judgments changed');
}
export async function main(argv=process.argv.slice(2)) {
  const [command,id,...extra]=argv;assert.ok(['prepare','run','report'].includes(command),'usage: prepare | run <approval decision ID> | report');
  assert.equal(extra.length,0,'unexpected arguments');
  if(command==='prepare') {assert.equal(id,undefined);const p=await prepare();console.log(JSON.stringify({prepared:true,apiCalls:0,points:p.points,requests:p.requests,inputTokens:p.inputTokens.fixed}));return;}
  // Authorize before loading inputs, writing files, importing a network client, or testing API credentials.
  const approval=command==='run'?checkApproval(id):null;
  if(command==='report')assert.equal(id,undefined);
  const bundle=loadInputs(),jobs=buildJobs(bundle);assertFrozen(bundle,jobs);
  if(command==='report') {
    assert.ok(existsSync(`${ROOT}/responses.jsonl`),'No live responses. The prepare mock report is under mock/.');
    const dynamic=jsonLines(`${ROOT}/attribution-requests.jsonl`);
    const r=await report(bundle,[...jobs,...dynamic],jsonLines(`${ROOT}/responses.jsonl`),ROOT);
    console.log(JSON.stringify({reported:true,counts:r.summary.counts}));return;
  }
  assert.ok(!existsSync(`${ROOT}/responses.jsonl`)&&!existsSync(`${ROOT}/attribution-requests.jsonl`)&&!existsSync(`${ROOT}/sent-requests.jsonl`),'existing execution records: run will not overwrite or repeat calls');
  assert.ok(process.env.OPENAI_API_KEY,'OPENAI_API_KEY missing');
  const lock=`${ROOT}/live.lock`,fd=openSync(lock,'wx');closeSync(fd);
  try {
    const {default:OpenAI}=await import('openai');const client=new OpenAI({maxRetries:0,timeout:60000});
    write(ROOT,'execution-approval.json',approval);
    const result=await executeJobs(bundle,jobs,async job=>{
      let response=null,transportError=null;const start=performance.now();
      appendFileSync(`${ROOT}/sent-requests.jsonl`,JSON.stringify({...job,approvalId:approval.id,sentAt:new Date().toISOString()})+'\n');
      try {response=await client.responses.create(job.request,{maxRetries:0,timeout:60000});}
      catch(error){transportError={name:error.name,status:error.status??null,code:error.code??null};}
      return {id:job.id,pointId:job.pointId,kind:job.kind,arm:job.arm,response,transportError,durationMs:performance.now()-start,costUsd:null};
    },(job,envelope)=>{
      if(job.kind==='attribution')appendFileSync(`${ROOT}/attribution-requests.jsonl`,JSON.stringify(job)+'\n');
      appendFileSync(`${ROOT}/responses.jsonl`,JSON.stringify(envelope)+'\n');
    });
    const r=await report(bundle,result.jobs,result.envelopes,ROOT);console.log(JSON.stringify({apiCalls:result.envelopes.length,counts:r.summary.counts}));
  } finally {unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{
  console.error(JSON.stringify({error:error.message}));process.exitCode=1;
});
