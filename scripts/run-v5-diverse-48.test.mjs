import test from 'node:test';
import assert from 'node:assert/strict';
import { ProblemFeedbackV4Controller } from '../packages/app/dist/server/problem-feedback-v4.js';
import { loadProblemSolvingBundle } from '../packages/app/dist/server/content.js';
import { restoreController, semanticView } from './run-v5-diverse-48.mjs';

test('restoration replays an already completed live evaluation without another external call',async()=>{
  const source=loadProblemSolvingBundle('corporate-law-q13').source;
  const call={rawOutput:{coaching:'⑤는 자산의 소유와 절차를 구분해서 읽어야 해요.'},metadata:{provider:'mock',model:'gpt-6.1-sol',promptVersion:'test',durationMs:0,inputTokens:0,outputTokens:0,cachedTokens:0}};
  const original=new ProblemFeedbackV4Controller({loadSource:()=>source,save(){},evaluator:{async evaluate(){return call;}}});
  let v=original.start(source.questionId);
  const steps=[];
  for(const command of [{type:'SELECT',choiceId:'C5',rationale:{mode:'OMITTED'}},{type:'RATIONALE',rationale:{mode:'OMITTED'}}]){
    const transitionId=`o${steps.length+1}`;
    v=await original.submit(v.sessionId,{transitionId,expectedRevision:v.revision,command});
    steps.push({transitionId,command,view:v,evaluations:steps.length? [{status:'SUCCESS',call}]:[]});
  }
  assert.equal(v.phase,'COMPLETED');
  const restored=await restoreController({case:{questionId:source.questionId},steps},source,{async evaluate(){throw new Error('Unexpected external call');}},()=>{throw new Error('Replay wrote a new record');},()=>{throw new Error('Replay wrote a new call');});
  assert.deepEqual(semanticView(restored.view),semanticView(v));
});

test('missing replay evidence fails before any new model request',async()=>{
  const source=loadProblemSolvingBundle('corporate-law-q13').source;
  await assert.rejects(restoreController({case:{questionId:source.questionId},steps:[{transitionId:'o1',command:{type:'SELECT',choiceId:'C5',rationale:{mode:'PROVIDED',text:'그냥 느낌이에요.'}},evaluations:[],view:{}}]},source,{async evaluate(){throw new Error('Unexpected external call');}},()=>{},()=>{}));
});
