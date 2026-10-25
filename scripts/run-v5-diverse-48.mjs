import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { ProblemFeedbackController } from '../packages/app/dist/server/problem-feedback.js';
import { loadProblemSolvingBundle } from '../packages/app/dist/server/content.js';
import { OpenAIFeedbackEvaluator, FeedbackEvaluationError } from '../packages/pipeline/dist/index.js';
import { createLedger, explanationChecks } from './test-v5-live-connection.mjs';
import { cases, specs } from './v5-diverse-48-cases.mjs';

export const DIR = 'docs/experiments/v5-diverse-48-2026-10-12';
const read = p => JSON.parse(readFileSync(p,'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const put = (p,x) => {writeFileSync(p+'.tmp',JSON.stringify(x,null,2)+'\n');renameSync(p+'.tmp',p);};
export const LIMITS = {'gpt-6.1-sol':{requests:160,usd:8,input:2,output:10},'gpt-6-luna':{requests:240,usd:1,input:.10,output:.50}};
const runtimePaths = [
  'packages/app/src/server/problem-feedback.ts','packages/app/dist/server/problem-feedback.js',
  'packages/app/src/server/content.ts','packages/app/dist/server/content.js',
  'packages/pipeline/src/problem-solving/feedback.ts','packages/pipeline/dist/problem-solving/feedback.js',
  'packages/pipeline/src/problem-solving/feedback-evaluator.ts','packages/pipeline/dist/problem-solving/feedback-evaluator.js',
  'packages/pipeline/src/problem-solving/feedback-end-explanation.ts','packages/pipeline/dist/problem-solving/feedback-end-explanation.js',
  'packages/pipeline/src/problem-solving/feedback-claims.ts','packages/pipeline/dist/problem-solving/feedback-claims.js',
  'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md',
  'packages/pipeline/fixtures/experiments/problem-solving/source-direct-runtime-v1.json',
  ...specs.map(s=>`packages/pipeline/fixtures/experiments/problem-solving/public/${s.questionId}.json`),
  'scripts/run-v5-diverse-48.mjs','scripts/v5-diverse-48-cases.mjs','scripts/test-v5-live-connection.mjs',
];
function frozenNow(){return {hashes:Object.fromEntries(runtimePaths.map(p=>[p,hash(readFileSync(p))])),caseHash:hash(JSON.stringify(cases)),limits:LIMITS};}
function verifyFrozen(){assert.deepEqual(read(`${DIR}/FROZEN.json`).content,frozenNow(),'Frozen input or runtime changed');}
export function semanticView(v){const {sessionId,...rest}=v;return rest;}
export async function restoreController(state,source,live,onRecord,onCall){
  let replay = true, queue=[];
  const controller = new ProblemFeedbackController({loadSource:()=>source,
    save:r=>{if(!replay)onRecord(r);}, evaluator:{async evaluate(session){
      if(replay){const c=queue.shift();assert.ok(c,'Replay evaluation missing');if(c.status==='ERROR')throw new FeedbackEvaluationError(c.error,c.call);return structuredClone(c.call);}
      try{const call=await live.evaluate(session);onCall({status:'SUCCESS',kind:session.evaluationMode,call});return call;}
      catch(e){onCall({status:'ERROR',kind:session.evaluationMode,call:e.call??null,error:String(e)});throw e;}
    }}});
  let view=controller.start(state.case.questionId);
  for(const step of state.steps){
    queue=structuredClone(step.evaluations);
    view=await controller.submit(view.sessionId,{transitionId:step.transitionId,expectedRevision:view.revision,command:step.command});
    assert.equal(queue.length,0,'Unused replay evaluation');
    assert.deepEqual(semanticView(view),semanticView(step.view),'Replay changed observed state');
  }
  replay=false;
  return {controller,view};
}
export async function prepare(){
  for(const p of [DIR,`${DIR}/cases`,`${DIR}/requests`,`${DIR}/actions`])mkdirSync(p,{recursive:true});
  assert.equal(cases.length,48);
  const sources=Object.fromEntries(specs.map(s=>[s.questionId,loadProblemSolvingBundle(s.questionId).source]));
  for(const s of specs){const rows=cases.filter(c=>c.questionId===s.questionId);assert.equal(rows.length,8);assert.equal(rows.filter(c=>c.choiceId===sources[s.questionId].answerChoiceId).length,2);for(const n of s.wrong)assert.equal(rows.filter(c=>c.choiceId===`C${n}`).length,3);}
  put(`${DIR}/sources.json`,sources);put(`${DIR}/CASES.json`,cases);
  put(`${DIR}/FROZEN.json`,{at:new Date().toISOString(),content:frozenNow(),authorization:'User: v5, six connected questions, eight distinct sessions per question, full dialogues, direct execution without handoff.'});
  put(`${DIR}/actions/initial.json`,cases.map(c=>({id:c.id,command:{type:'SELECT',choiceId:c.choiceId,rationale:c.rationale===null?{mode:'OMITTED'}:{mode:'PROVIDED',text:c.rationale}},authoredNote:'Frozen initial response'})));
  for(const c of cases){const p=`${DIR}/cases/${c.id}.json`;if(!existsSync(p))put(p,{case:c,steps:[],view:null,inspection:null,runtimeSessionIds:[]});}
  return {cases:cases.length,questions:specs.length,externalCalls:0};
}
export async function runWave(path){
  verifyFrozen();
  const actions=read(path);assert.equal(new Set(actions.map(a=>a.id)).size,actions.length,'Duplicate action in wave');
  const sources=read(`${DIR}/sources.json`);let client,currentLabel;
  const transport={async create(request,options){
    const id=randomUUID(),p=`${DIR}/requests/${id}`;put(p+'.request.json',{caseId:currentLabel,at:new Date().toISOString(),request,options});
    try{const response=await (client??=new OpenAI({maxRetries:0})).responses.create(request,options);put(p+'.response.json',response);return response;}
    catch(e){put(p+'.error.json',{name:e.name,message:e.message,status:e.status??null,at:new Date().toISOString()});throw e;}
  }};
  // Sequential requests preserve case attribution and avoid shared evaluator state.
  const ledger=createLedger(`${DIR}/ledger.jsonl`,transport,LIMITS);
  for(const action of actions){
    const p=`${DIR}/cases/${action.id}.json`;assert.ok(existsSync(p),'Unknown case');const state=read(p);
    const actionKey=hash(JSON.stringify({path,action}));if(state.steps.some(s=>s.actionKey===actionKey)){console.log(JSON.stringify({id:action.id,skipped:true}));continue;}
    if(existsSync(p+'.inflight'))throw new Error(`Uncommitted step: ${action.id}`);
    const records=[],evaluations=[];currentLabel=action.id;
    const live=new OpenAIFeedbackEvaluator({transport:{create:(request,options)=>ledger.send(request,options,action.id)}});
    const {controller,view}=await restoreController(state,sources[state.case.questionId],live,r=>{records.push(r);appendFileSync(`${DIR}/cases/${action.id}.records.jsonl`,JSON.stringify(r)+'\n');},c=>{evaluations.push(c);put(p+'.inflight',{action,evaluations,records});});
    const step={actionKey,transitionId:`o${state.steps.length+1}`,command:action.command,authoredNote:action.authoredNote??null,inReplyTo:{phase:view.phase,message:view.message,activeErrorId:view.activeErrorId},evaluations,at:new Date().toISOString()};
    put(p+'.inflight',{action,step});
    const started=performance.now();
    const next=await controller.submit(view.sessionId,{transitionId:step.transitionId,expectedRevision:view.revision,command:step.command});
    step.durationMs=performance.now()-started;step.view=next;
    state.steps.push(step);state.view=next;state.inspection=controller.inspect(next.sessionId);
    if(!state.runtimeSessionIds.includes(next.sessionId))state.runtimeSessionIds.push(next.sessionId);
    put(p,state);renameSync(p+'.inflight',`${DIR}/cases/${action.id}.step-${state.steps.length}.committed.json`);
    console.log(JSON.stringify({id:action.id,phase:next.phase,status:next.evaluationStatus,questions:next.questionsAsked,result:next.result?.outcome??null,requests:evaluations.reduce((n,e)=>n+(e.call?.metadata.attempts?.length??0),0)}));
    if(ledger.stop)throw new Error(ledger.stop);
  }
  return summarize();
}
export function summarize(){
  const states=cases.map(c=>read(`${DIR}/cases/${c.id}.json`));
  const counts=key=>Object.fromEntries([...new Set(states.map(key))].map(k=>[k,states.filter(s=>key(s)===k).length]));
  const rows=existsSync(`${DIR}/ledger.jsonl`)?readFileSync(`${DIR}/ledger.jsonl`,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
  const ends=rows.filter(r=>r.event==='END');
  const summary={at:new Date().toISOString(),cases:48,phases:counts(s=>s.view?.phase??'NOT_STARTED'),outcomes:counts(s=>s.view?.result?.outcome??'PENDING'),apiRequests:rows.filter(r=>r.event==='START').length,apiErrors:ends.filter(r=>r.status==='ERROR').length,estimatedUsd:ends.reduce((n,r)=>n+(r.costUsd??0),0),costBasis:'Prior repository rates, uncached input; estimates, not billed invoice.',open:states.filter(s=>s.view&&!['COMPLETED','ITEM_REVIEW'].includes(s.view.phase)).map(s=>({id:s.case.id,role:s.case.role,phase:s.view.phase,status:s.view.evaluationStatus,errorId:s.view.activeErrorId,message:s.view.message,errors:s.inspection.errors}))};
  put(`${DIR}/RESULTS.json`,summary);return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const mode=process.argv[2]??'summary';const r=mode==='prepare'?await prepare():mode==='wave'?await runWave(process.argv[3]):summarize();console.log(JSON.stringify(r,null,2));}
