import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT='docs/experiments/v4-output-field-ablation-v1-2026-09-22';
const SOURCE='docs/experiments/v4-light-output-v1-2026-09-22';
const phase=process.argv.find(x=>x.startsWith('--phase='))?.slice(8)??'prepare';
assert.ok(['prepare','run','report','audit'].includes(phase));
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(name,value)=>writeFileSync(`${ROOT}/${name}`,JSON.stringify(value,null,2)+'\n');
const append=(name,value)=>appendFileSync(`${ROOT}/${name}`,JSON.stringify(value)+'\n');
const rows=name=>existsSync(`${ROOT}/${name}`)?readFileSync(`${ROOT}/${name}`,'utf8').split('\n').filter(Boolean).map(JSON.parse):[];
const sha=value=>createHash('sha256').update(value).digest('hex');
const median=xs=>{const ys=[...xs].sort((a,b)=>a-b);return ys.length?(ys[Math.floor((ys.length-1)/2)]+ys[Math.ceil((ys.length-1)/2)])/2:null;};
const usageCost=usage=>usage?((usage.input_tokens??0)*2+(usage.output_tokens??0)*12)/1_000_000:null;
const reservationUsd=req=>(Math.ceil(JSON.stringify(req).length/3)*2+(req.max_output_tokens??4000)*12)/1_000_000;
const needsQuestion=axes=>axes.some(a=>['UNCLEAR_SERIOUS','ERROR'].includes(a.status));

const basePrompt=loadCentralStoryGatePrompt('v4');
const removedLines=[
  '- centralObjectRepresentation: 학생이 표현한 중심 대상. 확인할 수 없으면 null',
  '- centralStoryRepresentation: 학생의 누적 중심 이야기 표상. 충분히 복원되지 않았으면 null일 수 있다.',
];
let ablatedPrompt=basePrompt;
for(const line of removedLines){assert.equal(ablatedPrompt.split(line).length,2,`Expected exactly one prompt line: ${line}`);ablatedPrompt=ablatedPrompt.replace(`${line}\n`,'');}
assert.equal(basePrompt.length-ablatedPrompt.length,removedLines.reduce((n,x)=>n+x.length+1,0));
const claims=readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md','utf8').trim();
const errors=readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md','utf8').trim();
const instructions={v4:`${basePrompt}\n\n${claims}\n\n${errors}`,candidate:`${ablatedPrompt}\n\n${claims}\n\n${errors}`};
const CandidateSchema=CentralStoryGateV4ErrorClaimsResultSchema.omit({centralObjectRepresentation:true,centralStoryRepresentation:true});

const allCases=read(`${SOURCE}/cases.json`),sources=read(`${SOURCE}/sources.json`),human=read(`${SOURCE}/HUMAN-ADJUDICATION.json`);
const cases=human.cases.map(h=>allCases.find(c=>c.id===h.caseId));
assert.equal(cases.length,15);assert.ok(cases.every(Boolean));
const inputFor=c=>({gold:sources[c.paragraphId].gold,goldVersion:'original-gold-v2',goldHash:sources[c.paragraphId].fileHash,
  initialResponse:c.initialResponse,history:c.history,turn:c.turn,questionsAsked:c.history.length,maxQuestions:3,
  ...(c.revealedAxisContent.length?{revealedAxisContent:c.revealedAxisContent}:{}),
  ...(c.shownSourceGuides.length?{shownSourceGuides:c.shownSourceGuides}:{}),});
function requestFor(c,arm){return{model:'gpt-5.6-terra',instructions:instructions[arm],input:buildCentralStoryGatePayload(inputFor(c)),
  reasoning:{effort:'medium'},service_tier:'default',max_output_tokens:4000,store:false,
  text:{format:zodTextFormat(arm==='v4'?CentralStoryGateV4ErrorClaimsResultSchema:CandidateSchema,'central_story_gate_result')}};}
function axesOf(result){return result.axisFeedback.map(({axisId,status,reason})=>({axisId,status,reason}));}
function humanFor(id){return human.cases.find(x=>x.caseId===id);}

if(phase==='prepare'){
  assert.ok(!existsSync(`${ROOT}/manifest.json`),'Already frozen; do not overwrite');mkdirSync(ROOT,{recursive:true});
  const jobs=cases.flatMap((c,i)=>(i%2?['candidate','v4']:['v4','candidate']).map(arm=>({id:`${c.id}-${arm}`,caseId:c.id,arm,request:requestFor(c,arm)})));
  write('cases.json',cases);write('sources.json',sources);write('human-reference.json',human);write('jobs.json',jobs);
  writeFileSync(`${ROOT}/v4-instructions.md`,instructions.v4+'\n');writeFileSync(`${ROOT}/candidate-instructions.md`,instructions.candidate+'\n');
  const paths=['scripts/test-v4-output-field-ablation.mjs',`${ROOT}/PLAN.md`,`${ROOT}/cases.json`,`${ROOT}/sources.json`,`${ROOT}/human-reference.json`,`${ROOT}/jobs.json`,`${ROOT}/v4-instructions.md`,`${ROOT}/candidate-instructions.md`,
    'packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md','packages/pipeline/experiments/dialogue/current-claims-recording-v1.md','packages/pipeline/experiments/dialogue/error-claims-recording-v1.md'];
  write('manifest.json',{version:'v4-output-field-ablation-v1',preparedAt:new Date().toISOString(),authorization:'User approved one call per condition for all 15 human-adjudicated cases.',
    source:SOURCE,cases:15,repeats:1,arms:['v4','candidate'],maxCalls:30,maxEstimatedUsd:1,retries:0,feedbackCalls:0,concurrency:2,
    model:'gpt-5.6-terra',effort:'medium',serviceTier:'default',store:false,removedFields:['centralObjectRepresentation','centralStoryRepresentation'],
    removedPromptLines:removedLines,instructionHashes:{v4:sha(instructions.v4),candidate:sha(instructions.candidate)},protectedHashes:Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]))});
}
const manifest=read(`${ROOT}/manifest.json`);
for(const[p,h]of Object.entries(manifest.protectedHashes))assert.equal(sha(readFileSync(p)),h,`Frozen file changed: ${p}`);
const jobs=read(`${ROOT}/jobs.json`);
for(const j of jobs)assert.deepEqual(j.request,requestFor(cases.find(c=>c.id===j.caseId),j.arm));
function interpret(job,response){let raw=null,validated=null,contractError=null;const c=cases.find(x=>x.id===job.caseId);
  try{assert.equal(response?.status,'completed','API did not complete');raw=JSON.parse(response.output_text);
    if(job.arm==='v4')validated=validateCentralStoryGateResult(CentralStoryGateV4ErrorClaimsResultSchema.parse(raw),inputFor(c)).result;
    else{const parsed=CandidateSchema.parse(raw);validated=validateCentralStoryGateResult({...parsed,centralObjectRepresentation:null,centralStoryRepresentation:null},inputFor(c)).result;}
  }catch(e){contractError=String(e?.message??e);}
  const comparable=validated??(raw?{...raw,centralObjectRepresentation:null,centralStoryRepresentation:null}:null);
  return{id:job.id,caseId:job.caseId,arm:job.arm,raw,validated,axes:comparable?.axisFeedback?axesOf(comparable):null,effectiveResponse:comparable?.effectiveResponse??null,contractError};}
function ledger(){const qs=rows('requests.jsonl'),rs=rows('responses.jsonl');return{calls:qs.length,knownEstimatedUsd:rs.reduce((n,r)=>n+(r.costUsd??0),0),accountedUsd:qs.reduce((n,q)=>n+(rs.find(r=>r.id===q.id)?.costUsd??q.reserveUsd),0)};}
function compareAxes(a,b){if(!a||!b)return{comparable:false};const changes=a.flatMap(x=>{const y=b.find(z=>z.axisId===x.axisId);return y?.status===x.status?[]:[{axisId:x.axisId,v4:x.status,candidate:y?.status??null}];});return{comparable:true,same:changes.length===0,changes,v4Question:needsQuestion(a),candidateQuestion:needsQuestion(b)};}
function humanMatch(id,axes){const h=humanFor(id);if(!axes)return null;const changes=h.approvedAxes.flatMap(x=>{const y=axes.find(z=>z.axisId===x.axisId);return y?.status===x.status?[]:[{axisId:x.axisId,approved:x.status,actual:y?.status??null}];});return{same:changes.length===0,changes,approvedQuestion:h.approvedQuestionCandidate,actualQuestion:needsQuestion(axes),questionSame:h.approvedQuestionCandidate===needsQuestion(axes)};}
function summarize(){const results=rows('results.jsonl'),responses=rows('responses.jsonl');const comparisons=cases.map(c=>{const v=results.find(x=>x.id===`${c.id}-v4`),a=results.find(x=>x.id===`${c.id}-candidate`);return{caseId:c.id,pair:compareAxes(v?.axes,a?.axes),v4Human:humanMatch(c.id,v?.axes),candidateHuman:humanMatch(c.id,a?.axes),v4ContractError:v?.contractError,candidateContractError:a?.contractError};});
  const armStats=Object.fromEntries(['v4','candidate'].map(arm=>{const rr=results.filter(x=>x.arm===arm),api=responses.filter(x=>x.arm===arm);return[arm,{calls:rr.length,valid:rr.filter(x=>!x.contractError).length,humanAxisMatch:comparisons.filter(x=>(arm==='v4'?x.v4Human:x.candidateHuman)?.same).length,humanQuestionMatch:comparisons.filter(x=>(arm==='v4'?x.v4Human:x.candidateHuman)?.questionSame).length,questionCandidates:rr.filter(x=>x.axes&&needsQuestion(x.axes)).length,medianApiMs:median(api.filter(x=>x.response).map(x=>x.durationMs)),inputTokens:api.reduce((n,x)=>n+(x.response?.usage?.input_tokens??0),0),outputTokens:api.reduce((n,x)=>n+(x.response?.usage?.output_tokens??0),0),estimatedUsd:api.reduce((n,x)=>n+(x.costUsd??0),0)}];}));
  const summary={...ledger(),armStats,pairExact:comparisons.filter(x=>x.pair.same).length,pairQuestionSame:comparisons.filter(x=>x.pair.comparable&&x.pair.v4Question===x.pair.candidateQuestion).length,comparisons};write('summary.json',summary);return summary;}

if(phase==='run'){
  assert.ok(process.env.OPENAI_API_KEY,'OPENAI_API_KEY missing');const lock=`${ROOT}/live.lock`,fd=openSync(lock,'wx');closeSync(fd);
  try{const client=new OpenAI({maxRetries:0,timeout:60000});for(const c of cases){const pending=jobs.filter(j=>j.caseId===c.id&&!rows('requests.jsonl').some(q=>q.id===j.id));if(!pending.length)continue;const l=ledger(),reserve=pending.reduce((n,j)=>n+reservationUsd(j.request),0);assert.ok(l.calls+pending.length<=manifest.maxCalls&&l.accountedUsd+reserve<=manifest.maxEstimatedUsd,'Local cap stops run');for(const j of pending)append('requests.jsonl',{...j,sentAt:new Date().toISOString(),reserveUsd:reservationUsd(j.request)});await Promise.all(pending.map(async j=>{const start=performance.now();let response=null,transportError=null;try{response=await client.responses.create(j.request,{maxRetries:0,timeout:60000});}catch(e){transportError={name:e.name,status:e.status??null,code:e.code??null};}append('responses.jsonl',{id:j.id,caseId:j.caseId,arm:j.arm,durationMs:performance.now()-start,response,transportError,costUsd:usageCost(response?.usage)});append('results.jsonl',interpret(j,response));}));console.log(JSON.stringify({completed:c.id,...ledger()}));}}finally{unlinkSync(lock);}console.log(JSON.stringify(summarize(),null,2));
}else if(phase==='report')console.log(JSON.stringify(summarize(),null,2));
else if(phase==='audit'){const qs=rows('requests.jsonl'),rs=rows('responses.jsonl'),rr=rows('results.jsonl');assert.equal(qs.length,30);assert.equal(rs.length,30);assert.equal(rr.length,30);for(const list of[qs,rs,rr])assert.equal(new Set(list.map(x=>x.id)).size,30);for(const c of cases){const pair=['v4','candidate'].map(arm=>qs.find(q=>q.id===`${c.id}-${arm}`));const strip=({instructions:_i,text:_t,...rest})=>rest;assert.deepEqual(strip(pair[0].request),strip(pair[1].request));}for(const j of jobs){assert.deepEqual(qs.find(q=>q.id===j.id).request,j.request);assert.deepEqual(rr.find(x=>x.id===j.id),interpret(j,rs.find(x=>x.id===j.id).response));}const s=summarize();assert.ok(s.accountedUsd<=manifest.maxEstimatedUsd);write('execution-audit.json',{auditedAt:new Date().toISOString(),calls:30,pairedInputsIdentical:true,onlyTwoPromptLinesAndSchemaFieldsRemoved:true,frozenHashesMatch:true,retries:0,feedbackCalls:0,...ledger()});console.log(JSON.stringify({audit:'passed',pairExact:s.pairExact,pairQuestionSame:s.pairQuestionSame}));
}else console.log(JSON.stringify({prepared:true,cases:cases.length,jobs:jobs.length,removedLines}));
