// Same frozen controller/evaluator and saved-call restoration; at most two independent sessions in flight.
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';
import { createLedger } from './test-v5-live-connection.mjs';
import { DIR, LIMITS, restoreController, summarize } from './run-v5-diverse-48.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const put=(p,x)=>{writeFileSync(p+'.tmp',JSON.stringify(x,null,2)+'\n');renameSync(p+'.tmp',p);};
const script='scripts/run-v5-diverse-48-concurrent.mjs';
function verify(){
  for(const [p,h] of Object.entries(read(`${DIR}/FROZEN.json`).content.hashes))assert.equal(hash(readFileSync(p)),h,p);
  const p=`${DIR}/CONCURRENT-RUNNER.json`,now={scriptHash:hash(readFileSync(script)),concurrency:2,change:'Only execution scheduling; no change to frozen source, cases, model routing, evaluator, restoration or per-session order.'};
  if(existsSync(p))assert.deepEqual(read(p),now);else put(p,now);
}
export async function runConcurrent(path){
  verify();
  const actions=read(path),sources=read(`${DIR}/sources.json`);assert.equal(new Set(actions.map(a=>a.id)).size,actions.length);
  const context=new AsyncLocalStorage();let client;
  const ledger=createLedger(`${DIR}/ledger.jsonl`,{async create(request,options){
    const id=randomUUID(),p=`${DIR}/requests/${id}`;
    put(p+'.request.json',{caseId:context.getStore(),at:new Date().toISOString(),request,options});
    try{const response=await(client??=new OpenAI({maxRetries:0})).responses.create(request,options);put(p+'.response.json',response);return response;}
    catch(e){put(p+'.error.json',{name:e.name,message:e.message,status:e.status??null,at:new Date().toISOString()});throw e;}
  }},LIMITS);
  let next=0;
  const execute=async action=>{
    const p=`${DIR}/cases/${action.id}.json`,state=read(p),actionKey=hash(JSON.stringify({path,action}));
    if(state.steps.some(s=>s.actionKey===actionKey)){console.log(JSON.stringify({id:action.id,skipped:true}));return;}
    assert.ok(!existsSync(p+'.inflight'),`Uncommitted step ${action.id}`);
    const records=[],evaluations=[];
    const live=new OpenAIFeedbackEvaluator({transport:{create:(request,options)=>ledger.send(request,options,action.id)}});
    const {controller,view}=await restoreController(state,sources[state.case.questionId],live,r=>{records.push(r);appendFileSync(`${DIR}/cases/${action.id}.records.jsonl`,JSON.stringify(r)+'\n');},c=>{evaluations.push(c);put(p+'.inflight',{action,evaluations,records});});
    const step={actionKey,transitionId:`o${state.steps.length+1}`,command:action.command,authoredNote:action.authoredNote??null,inReplyTo:{phase:view.phase,message:view.message,activeErrorId:view.activeErrorId},evaluations,at:new Date().toISOString()};
    put(p+'.inflight',{action,step});const started=performance.now();
    const v=await controller.submit(view.sessionId,{transitionId:step.transitionId,expectedRevision:view.revision,command:step.command});
    step.durationMs=performance.now()-started;step.view=v;state.steps.push(step);state.view=v;state.inspection=controller.inspect(v.sessionId);
    if(!state.runtimeSessionIds.includes(v.sessionId))state.runtimeSessionIds.push(v.sessionId);
    put(p,state);renameSync(p+'.inflight',`${DIR}/cases/${action.id}.step-${state.steps.length}.committed.json`);
    console.log(JSON.stringify({id:action.id,phase:v.phase,status:v.evaluationStatus,questions:v.questionsAsked,result:v.result?.outcome??null}));
  };
  const worker=async()=>{while(next<actions.length&&!ledger.stop){const a=actions[next++];await context.run(a.id,()=>execute(a));}};
  await Promise.all([worker(),worker()]);if(ledger.stop)throw new Error(ledger.stop);
  const s=summarize();console.log(JSON.stringify({phases:s.phases,outcomes:s.outcomes,apiRequests:s.apiRequests,estimatedUsd:s.estimatedUsd}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runConcurrent(process.argv[2]);
