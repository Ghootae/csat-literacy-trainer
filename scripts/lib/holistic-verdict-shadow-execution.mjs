import assert from 'node:assert/strict';
import { attributionJob } from './holistic-verdict-shadow-data.mjs';
import { shouldAttribute } from './holistic-verdict-shadow-contract.mjs';
import { interpretResponse } from './holistic-verdict-shadow-report.mjs';

// The caller supplies transport and persistence. No network client is constructed here.
export async function executeJobs(bundle, fixedJobs, call, record) {
  const jobs=[...fixedJobs],envelopes=[],results=[];
  async function execute(job) {
    assert.ok(envelopes.length<353,'maximum call count exceeded');
    const envelope=await call(job); assert.equal(envelope.id,job.id);
    await record(job,envelope); envelopes.push(envelope);
    const result=await interpretResponse(bundle,job,envelope); results.push(result);return result;
  }
  for(const kind of ['shadow','v4'])for(const job of fixedJobs.filter(j=>j.kind===kind))await execute(job);
  for(const result of results.filter(r=>r.kind==='shadow')) if(shouldAttribute(result.raw,result.errors)) {
    const point=bundle.points.find(p=>p.pointId===result.pointId),job=attributionJob(bundle,point,result.arm,result.raw);
    jobs.push(job);await execute(job);
  }
  return {jobs,envelopes,results};
}
export function mockShadow(point,arm,index,probe) {
  let unresolved,kind='missing',studentQuote=point.dialogue.find(d=>d.role==='student').text;
  if(probe) { unresolved=probe.human.verdict!=='충분';kind=probe.human.verdict==='오류'?'incorrect':'missing'; }
  else {
    unresolved=point.v4.overall==='unresolved' ? (arm==='H0'?index%2===0:index%3===0) : index%(arm==='H0'?7:11)===0;
    if(index%7===0)studentQuote=null;
    if(index%3===0)kind='inter-axis-relation';
  }
  return {overall:unresolved?'unresolved':'resolved',understoodRelations:['모의 정상 관계'],
    brokenRelation:unresolved?{description:`모의 공백 ${point.turn}`,studentQuote,kind}:null,
    unconfirmed:unresolved?['모의 미확인 의미']:[],questionWorthy:unresolved,question:unresolved?'관계를 설명해 줄 수 있나요?':null,confidence:'medium'};
}
export function mockV4(point,gold) {
  // Intentionally synthetic labels; this exercises the A validator, not evaluator quality.
  const text=point.dialogue[0].text,evidence={source:'initial',evidence:text};
  return {status:'UNCLEAR',responseInformationLevel:'RELATIONAL',effectiveResponse:text,
    centralObjectRepresentation:null,centralStoryRepresentation:null,
    axisStates:gold.centralAxes.map(a=>({axisId:a.id,state:'partial',evidence:[evidence],retractionEvidence:[]})),
    missingAxisEvidence:gold.centralAxes.map(a=>({axisId:a.id,axisQuote:a.description})),targetAxisId:gold.centralAxes[0].id,
    decisionSummary:'모의 정상 V4 판정',questionIntent:'모의 공백 확인',
    axisFeedback:gold.centralAxes.map(a=>({axisId:a.id,status:'UNCLEAR_SERIOUS',revealedText:null,reason:'모의 정상 축 상태'})),
    claimLedger:[{description:'모의 학생 주장',...evidence,responseIndex:0,state:'current',revisionEvidence:[]}],errorClaims:[]};
}
export function mockCall(bundle) {
  return async job=>{
    const point=bundle.points.find(p=>p.pointId===job.pointId),source=bundle.sources[point.paragraphId];
    let raw;
    if(job.kind==='shadow')raw=mockShadow(point,job.arm,bundle.points.indexOf(point),bundle.probes.find(p=>p.pointId===point.pointId));
    else if(job.kind==='v4')raw=mockV4(point,source.gold);
    else {const input=JSON.parse(job.request.input);raw={axisAttribution:[source.gold.centralAxes[0].id],
      unconfirmedAttribution:input.unconfirmed.map(()=>[]),reason:'모의 정상 귀속'};}
    return {id:job.id,pointId:job.pointId,kind:job.kind,arm:job.arm,mock:true,durationMs:null,costUsd:null,
      response:{status:'completed',output_text:JSON.stringify(raw),usage:null}};
  };
}
