import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepare,preflight,run,report,verifyFrozen,validateResponse,normalizedActual,metrics,aggregate,INSTRUCTIONS} from './test-trap-map-jev-four-choice.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const temp=async fn=>{const dir=mkdtempSync(join(tmpdir(),'jev-four-'));try{await fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}};
const fakeResponse=payload=>{const ids=Object.keys(payload.questions.Q1.criteria);return {status:200,text:async()=>JSON.stringify({ok:true,model:'fake',result:{answers:{Q1:{choice:ids[0],probabilities:Object.fromEntries(ids.map((id,i)=>[id,[.4,.3,.2,.1][i]]))}},confidence:{Q1:.1},usage:{inputTokens:1,outputTokens:1,totalTokens:2}}})};};

test('all 60 real payloads exclude answer, explanation and rates, and preserve paired conditions',()=>temp(async dir=>{
  prepare({dir});const {sources,jobs}=verifyFrozen(dir);assert.equal(jobs.length,60);
  for(const j of jobs){const s=sources[j.questionId],p=j.payload,ids=Object.keys(p.questions.Q1.criteria),state=p.state;
    assert.equal(ids.length,4);assert.ok(!ids.includes(s.answerChoiceId));assert.deepEqual(ids,j.criteriaOrder);
    assert.equal(p.questions.Q1.instructions,INSTRUCTIONS);
    assert.ok(!state.includes('[정답 번호]'));assert.ok(!state.includes('[공식 해설]'));
    assert.ok(!state.includes(s.officialExplanation));
    assert.ok(!state.includes(s.choices.find(c=>c.choiceId===s.answerChoiceId).text));
    assert.ok(!/predictedSelectionPercent|choicePercents|correctRate|bySelSubCd/.test(JSON.stringify(p)));
    assert.ok(!state.includes(`${s.answerChoiceId}: {`));
    if(j.condition==='TRAP')assert.ok(state.includes('attractionMechanism'));else assert.ok(!state.includes('[선지별 함정 분석]'));
  }
  for(let i=0;i<jobs.length;i+=2)assert.deepEqual(jobs[i].criteriaOrder,jobs[i+1].criteriaOrder);
}));
test('four-label response validation and gateway confidence',()=>{
  const body={ok:true,result:{answers:{Q1:{choice:'C1',probabilities:{C1:.4,C3:.3,C4:.2,C5:.1}}},confidence:{Q1:.2}}};
  assert.ok(Math.abs(validateResponse(body,['C5','C1','C3','C4']).probabilitySum-1)<1e-12);
  assert.throws(()=>validateResponse(body,['C1','C2','C4','C5']),/labels/);
  body.result.answers.Q1.probabilities.C1=.9;assert.throws(()=>validateResponse(body,['C1','C3','C4','C5']),/sum/);
});
test('conditional actual normalization and hand-calculated metrics',()=>{
  const source={answerChoiceId:'C2',choices:[1,2,3,4,5].map(position=>({position,choiceId:`C${position}`}))};
  const item={bySelSubCd:{NO_TAB:{choicePercents:[5,50,10,15,20]}}};
  const a=normalizedActual(item,'1004',source);assert.deepEqual(a.percents,[10,20,30,40]);assert.equal(a.denominator,50);
  const m=metrics([10,20,30,40],a.percents,['C1','C3','C4','C5']);assert.equal(m.topWrongHit,1);assert.equal(m.distributionMAE,0);assert.equal(m.withinQuestionSpearman,1);assert.equal(aggregate([m]).pooledPearson,1);
  const tie=metrics([25,25,25,25],a.percents,['C1','C3','C4','C5']);assert.equal(tie.topWrongHit,.25);assert.equal(tie.withinQuestionSpearman,null);
});
test('full fake run rechecks an early-returning clock, closes ledger and resumes without calls',()=>temp(async dir=>{
  prepare({dir});let time=0,calls=0;
  const clock={now:()=>time,sleep:async ms=>{time+=ms>1?ms-1:ms;}};
  const fetchImpl=async(url,options)=>{calls++;return fakeResponse(JSON.parse(options.body));};
  await preflight({dir,...clock,fetchImpl});await run({dir,...clock,fetchImpl});assert.equal(calls,61);
  await run({dir,...clock,fetchImpl});assert.equal(calls,61);
  const r=report({dir});assert.equal(r.summary.statuses.VALID,60);assert.ok(r.summary.minimumRequestStartSpacingMs>=7000);
  assert.equal(r.metrics.length,4);assert.ok(r.metrics.every(m=>m.questions===5));
  appendFileSync(`${dir}/requests.jsonl`,JSON.stringify({event:'START',requestId:'dangling'})+'\n');
  await assert.rejects(run({dir,...clock,fetchImpl}),/INCOMPLETE_LEDGER/);assert.equal(calls,61);
}));
test('429 retries once after 60 seconds and records unsuccessful cell',()=>temp(async dir=>{
  prepare({dir});let time=0,calls=0;const sleeps=[];
  const clock={now:()=>time,sleep:async ms=>{time+=ms;sleeps.push(ms);}};
  const fetchImpl=async(url,options)=>{calls++;return calls===2||calls===3?{status:429,text:async()=>'rate limited'}:fakeResponse(JSON.parse(options.body));};
  await preflight({dir,...clock,fetchImpl});await run({dir,...clock,fetchImpl});
  const r=report({dir});assert.equal(calls,62);assert.equal(r.summary.statuses.RATE_LIMITED,1);assert.equal(r.summary.retries,1);assert.ok(sleeps.includes(60000));
  assert.equal(read(`${dir}/RESULTS.json`).conditions.BARE.questions[0].meanPredictions,null);
}));
