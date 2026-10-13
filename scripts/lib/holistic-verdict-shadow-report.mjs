import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { attributionJob, A_ROOT, read } from './holistic-verdict-shadow-data.mjs';
import { sha } from './natural-response-disagreement.mjs';
import { validateShadow, validateAttribution, shouldAttribute, summarizeV4, effectiveShadow, reviewFlag } from './holistic-verdict-shadow-contract.mjs';

export async function interpretResponse(bundle, job, envelope) {
  const point=bundle.points.find(p=>p.pointId===job.pointId),gold=bundle.sources[point.paragraphId].gold;
  let raw=null, errors=[],validated=null,normalizationEvents=[];
  try {
    assert.equal(envelope?.response?.status,'completed','response not completed');
    const response=envelope.response;
    const output=response.output_text ?? response.output?.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
    raw=JSON.parse(output);
    if(job.kind==='shadow') errors=validateShadow(raw,point.dialogue);
    else if(job.kind==='attribution') {
      const input=JSON.parse(job.request.input);
      errors=validateAttribution(raw,gold.centralAxes,input.unconfirmed);
    } else {
      // Exactly the A result-validation path. No current two-stage evaluator is loaded.
      const {CentralStoryGateV4ErrorClaimsResultSchema,validateCentralStoryGateResult}=await import('../../packages/pipeline/dist/dialogue-experiment/gate.js');
      const {validateDirectJudgment}=await import('../../packages/pipeline/dist/dialogue-experiment/direct-judgment-experiment.js');
      validateDirectJudgment({axes:raw.axisFeedback?.map(({axisId,status,reason})=>({axisId,status,reason}))},gold.centralAxes.map(a=>a.id));
      const input=JSON.parse(job.request.input);
      const result=validateCentralStoryGateResult(CentralStoryGateV4ErrorClaimsResultSchema.parse(raw),{
        gold,goldHash:bundle.sources[point.paragraphId].goldHash,goldVersion:'original-gold-v2',
        initialResponse:input.evidence.initialResponse,history:[],turn:1,questionsAsked:0,maxQuestions:3});
      validated=result.result; normalizationEvents=result.normalizationEvents;
    }
  } catch(error) {errors=[error.message];}
  return {id:job.id,pointId:job.pointId,arm:job.arm,kind:job.kind,raw,errors,validated,normalizationEvents};
}
export const v4FromResult = result => {
  const axes=result?.validated?.axisFeedback?.map(({axisId,status,reason})=>({axisId,status,reason})) ?? null;
  return {overall:summarizeV4(axes,result?.errors.length ? result.errors.join('\n') : result ? null : 'missing response'),
    axes:axes??[],errorClaims:result?.validated?.errorClaims??[],contractError:result?.errors??['missing response']};
};
export function comparePoint(point, v4, results) {
  return {pointId:point.pointId,source:point.source,stratum:point.stratum,sessionId:point.sessionId,turn:point.turn,v4,
    variants:Object.fromEntries(['H0','H1'].map(arm=>{
      const result=results.find(r=>r.id===`${point.pointId}-${arm}`);
      const errors=result?.errors??['missing response'],raw=result?.raw??null;
      const effective=effectiveShadow(raw,errors,v4.overall);
      const attribution=results.find(r=>r.id===`${point.pointId}-${arm}-attribution`)??null;
      return [arm,{...effective,raw,errors,attribution,rawCell:errors.length||v4.overall==='contract-failed'?null:`${v4.overall}/${effective.rawOverall}`,effectiveCell:errors.length||v4.overall==='contract-failed'?null:`${v4.overall}/${effective.effectiveOverall}`,reviewFlag:reviewFlag({...v4,axes:v4.axes??[]},raw,errors,point.dialogue)}];
    }))};
}
export function distribution(comparisons, arm, field='effectiveOverall') {
  const cells={'resolved/resolved':0,'resolved/unresolved':0,'unresolved/resolved':0,'unresolved/unresolved':0};
  let excluded=0;
  for(const c of comparisons) {
    const v=c.variants[arm], key=`${c.v4.overall}/${v[field]}`;
    if(c.v4.overall==='contract-failed'||v.errors.length||!(key in cells))excluded++;
    else cells[key]++;
  }
  return {total:comparisons.length,comparable:comparisons.length-excluded,excluded,cells,
    retractions:comparisons.filter(c=>c.variants[arm].retracted).length,
    shadowContractFailures:comparisons.filter(c=>c.variants[arm].errors.length).length,
    v4ContractFailures:comparisons.filter(c=>c.v4.overall==='contract-failed').length};
}
const disagrees = c => c.v4.overall!=='contract-failed' && ['H0','H1'].some(a=>!c.variants[a].errors.length&&c.variants[a].effectiveOverall!==c.v4.overall);
export function selectReview(comparisons) {
  const real=comparisons.filter(c=>c.source!=='probe');
  const mandatory=real.filter(disagrees).map(c=>c.pointId),agreement=[];
  for(const status of ['resolved','unresolved']) agreement.push(...real.filter(c=>c.v4.overall===status && ['H0','H1'].every(a=>
    !c.variants[a].errors.length&&c.variants[a].effectiveOverall===status)).map(c=>c.pointId)
    .sort((a,b)=>sha(a).localeCompare(sha(b))).slice(0,5));
  const order=[...mandatory,...agreement].sort((a,b)=>sha(a).localeCompare(sha(b)));
  return {mandatory,agreement,order};
}
export function criterion(probeComparisons, probes, arm, field='effectiveOverall') {
  const fa=probes.filter(p=>p.human.verdict==='충분'&&!p.human.questionWorthy).map(p=>p.pointId);
  const errorIds=probes.filter(p=>p.human.verdict==='오류').map(p=>p.pointId);
  assert.deepEqual(fa,['T03','T05','T07','T09','T10','T11','T12']);assert.deepEqual(errorIds,['T01','T06','T13']);
  const faReduced=fa.filter(id=>{const c=probeComparisons.find(c=>c.pointId===id);return c?.v4.overall==='unresolved'&&
    !c.variants[arm].errors.length&&c.variants[arm][field]==='resolved';});
  const errorsCaught=errorIds.filter(id=>{const c=probeComparisons.find(c=>c.pointId===id);return c&&!c.variants[arm].errors.length&&c.variants[arm][field]==='unresolved';});
  return {faProbeIds:fa,errorProbeIds:errorIds,faReducedIds:faReduced,faReducedCount:faReduced.length,
    errorsCaughtIds:errorsCaught,allErrorsCaught:errorsCaught.length===errorIds.length,clear:faReduced.length>=4&&errorsCaught.length===errorIds.length};
}
const median = values => {const a=[...values].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length ? a.length%2?a[i]:(a[i-1]+a[i])/2:null;};
export function estimateCost(usage, prices) {
  const input=usage?.input_tokens??usage?.inputTokens,output=usage?.output_tokens??usage?.outputTokens;
  if(!Number.isFinite(input)||!Number.isFinite(output))return null;
  const cached=usage.input_tokens_details?.cached_tokens??usage.cacheReadTokens??0,writes=usage.input_tokens_details?.cache_write_tokens??usage.cacheWriteTokens??0;
  return (Math.max(0,input-cached-writes)*prices.input+cached*prices.cachedInput+writes*prices.cacheWrite+output*prices.output)/1e6;
}
export function metrics(records, prices=null) {
  const usage=r=>r.response?.usage ?? r.usage ?? null;
  const normalized=r=>{const u=usage(r);return u ? {inputTokens:u.input_tokens??u.inputTokens??0,outputTokens:u.output_tokens??u.outputTokens??0,
    cacheReadTokens:u.input_tokens_details?.cached_tokens??u.cacheReadTokens??0,cacheWriteTokens:u.input_tokens_details?.cache_write_tokens??u.cacheWriteTokens??0}:null;};
  const usages=records.map(normalized).filter(Boolean), costs=records.map(r=>r.costUsd).filter(Number.isFinite),duration=records.map(r=>r.durationMs).filter(Number.isFinite);
  const estimates=prices?records.map(r=>estimateCost(usage(r),prices)).filter(Number.isFinite):[];
  return {estimatedCostUsd:estimates.length?estimates.reduce((s,x)=>s+x,0):null,estimatedCostKnown:estimates.length,
    recordedCalls:records.length,usageKnown:usages.length,usageUnknown:records.length-usages.length,
    usage:usages.length?Object.fromEntries(['inputTokens','outputTokens','cacheReadTokens','cacheWriteTokens'].map(k=>[k,usages.reduce((s,u)=>s+u[k],0)])):null,
    costKnown:costs.length,costUnknown:records.length-costs.length,recordedCostUsd:costs.length?costs.reduce((s,c)=>s+c,0):null,
    durationKnown:duration.length,medianDurationMs:median(duration),totalDurationMs:duration.length?duration.reduce((s,x)=>s+x,0):null};
}
export function baselineMetrics(bundle,prices) {
  return Object.fromEntries(['A','B'].map(source=>{
    const calls=bundle.points.filter(p=>p.source===source).flatMap(p=>p.v4.recordedCalls);
    return [source,{recorded:metrics(calls,prices),byStage:source==='B'?Object.fromEntries([...new Set(calls.flatMap(c=>c.stages??[]).map(s=>s.stage))]
      .map(stage=>[stage,metrics(calls.flatMap(c=>c.stages??[]).filter(s=>s.stage===stage),prices)])):{},
      note:source==='A'?'보존된 V4 판정 1차 호출. 비용은 당시 기록값이다.':'운영 기록의 전체 호출과 단계별 사용량. 비용 미기록은 null이며 0으로 대체하지 않는다.'}];
  }));
}
export function buildSummary(bundle, comparisons, envelopes, mock) {
  const prices=read(`${A_ROOT}/manifest.json`).pricesPerMillion;
  const subsets={realInitial:comparisons.filter(c=>c.source!=='probe'&&c.stratum==='initial'),realFollowup:comparisons.filter(c=>c.source!=='probe'&&c.stratum==='followup'),
    probe:comparisons.filter(c=>c.source==='probe'),A:comparisons.filter(c=>c.source==='A'),B:comparisons.filter(c=>c.source==='B')};
  const variants=Object.fromEntries(['H0','H1'].map(arm=>{
    const shifts=[],pairs=[];
    for(const sessionId of new Set(bundle.points.filter(p=>p.source!=='probe').map(p=>p.sessionId))) {
      const seq=comparisons.filter(c=>c.sessionId===sessionId).sort((a,b)=>a.turn-b.turn);
      for(let i=1;i<seq.length;i++) {
        const before=seq[i-1].variants[arm],after=seq[i].variants[arm];
        if(before.errors.length||after.errors.length||!before.raw.brokenRelation||!after.raw.brokenRelation)continue;
        const pair={sessionId,fromPointId:seq[i-1].pointId,toPointId:seq[i].pointId,
          before:before.raw.brokenRelation.description,after:after.raw.brokenRelation.description};pairs.push(pair);
        if(pair.before!==pair.after)shifts.push(pair);
      }
    }
    return [arm,{effective:distribution(comparisons,arm),raw:distribution(comparisons,arm,'rawOverall'),
      bySet:Object.fromEntries(Object.entries(subsets).map(([name,rows])=>[name,{effective:distribution(rows,arm),raw:distribution(rows,arm,'rawOverall')}])),
      kinds:Object.fromEntries(['missing','incorrect','inter-axis-relation'].map(kind=>[kind,comparisons.filter(c=>!c.variants[arm].errors.length&&c.variants[arm].raw.brokenRelation?.kind===kind).length])),
      attributionContractFailures:comparisons.filter(c=>c.variants[arm].attribution?.errors.length).length,
      reviewFlags:comparisons.filter(c=>c.variants[arm].reviewFlag).map(c=>c.pointId),
      criterion:{effective:criterion(subsets.probe,bundle.probes,arm),raw:criterion(subsets.probe,bundle.probes,arm,'rawOverall')},
      criterionDrift:{eligibleConsecutivePairs:pairs.length,changedDescriptions:shifts.length,rate:pairs.length?shifts.length/pairs.length:null,
        shifts,note:'깨진 관계가 두 연속 시점 모두에 있는 경우의 문자열 변화. 의미 판단은 사람 검토 대상이다.'}}];
  }));
  const probeAgreement=subsets.probe.map(c=>{
    const human=bundle.probes.find(p=>p.pointId===c.pointId).human;
    const verdict=(overall,incorrect)=>overall==='contract-failed'?null:overall==='resolved'?'충분':incorrect?'오류':'미확인';
    const v4Verdict=verdict(c.v4.overall,c.v4.axes?.some(a=>a.status==='ERROR'));
    return {pointId:c.pointId,human,v4:c.v4,v4Match:{verdict:v4Verdict===human.verdict,questionWorthy:c.v4.overall==='contract-failed'?null:(c.v4.overall==='unresolved')===human.questionWorthy},
      variants:Object.fromEntries(['H0','H1'].map(arm=>{const v=c.variants[arm];return [arm,{...v,
        humanMatch:{rawVerdict:v.errors.length?null:verdict(v.rawOverall,v.raw.brokenRelation?.kind==='incorrect')===human.verdict,
          effectiveVerdict:v.errors.length?null:verdict(v.effectiveOverall,v.raw.brokenRelation?.kind==='incorrect')===human.verdict,
          rawQuestionWorthy:v.errors.length?null:v.raw.questionWorthy===human.questionWorthy,
          effectiveQuestionWorthy:v.errors.length?null:(v.retracted?false:v.raw.questionWorthy)===human.questionWorthy}}];}))};
  });
  return {contractFailures:{shadow:Object.fromEntries(['H0','H1'].map(a=>[a,comparisons.filter(c=>c.variants[a].errors.length).map(c=>c.pointId)])),
      v4:comparisons.filter(c=>c.v4.overall==='contract-failed').map(c=>c.pointId),attribution:comparisons.flatMap(c=>['H0','H1'].flatMap(a=>c.variants[a].attribution?.errors.length?[c.variants[a].attribution.id]:[]))},
    mock,apiCalls:mock?0:envelopes.length,counts:{A:45,B:27,probe:13,realInitial:45,realFollowup:27},variants,probeAgreement,
    referenceInterpretations:Object.fromEntries(Object.entries(bundle.sources).map(([pid,s])=>[pid,s.gold.centralAxes.map(a=>a.description).join(' ')])),
    usageLatencyCost:{shadow:Object.fromEntries(['H0','H1'].map(arm=>[arm,metrics(envelopes.filter(e=>e.kind==='shadow'&&e.arm===arm),prices)])),
      probeV4:metrics(envelopes.filter(e=>e.kind==='v4'),prices),attribution:metrics(envelopes.filter(e=>e.kind==='attribution'),prices),recordedV4:baselineMetrics(bundle,prices),
      costBasis:{pricesPerMillion:prices,source:`${A_ROOT}/manifest.json`,note:'당시 A 실험 단가로 계산한 추정치이며 현재 단가는 확인하지 않았다. recordedCostUsd는 실제 보존된 당시 비용 추정값이다.'}},
    limits:'응답자는 골드와 지문에 익숙한 개발자 1인이다. 공손룡은 실데이터 72시점 중 28시점이다. 실제 학생으로 일반화하지 않는다. 후속은 진단용, 탐침은 별도 사례다.',
    humanReviewPending:true,secondPhasePending:true};
}
const quote = text=>text.split('\n').map(l=>`> ${l}`).join('\n');
export function blindStimulus(point, source) {
  return `${quote(source.gold.paragraphText)}\n\n`+point.dialogue.map(d=>`${d.role==='student'?'학생 발화':'질문 (대화 맥락, 판정 기준 아님)'}\n\n${quote(d.text)}\n\n`).join('')+
    '- 판정: 충분 / 미확인 / 오류\n- 오류 인용:\n- 질문 필요: 예 / 아니오\n- 메모:\n\n';
}
export function reviewDocuments(bundle,comparisons) {
  const selection=selectReview(comparisons),byId=new Map(bundle.points.map(p=>[p.pointId,p]));
  const second=[...selection.order,...bundle.probes.map(p=>p.pointId)].sort((a,b)=>sha(`second:${a}`).localeCompare(sha(`second:${b}`)));
  const makeBlind=(order,prefix)=>'# 판정 묶음\n\n'+order.map((id,i)=>`## ${prefix}${String(i+1).padStart(3,'0')}\n\n`+
    blindStimulus(byId.get(id),bundle.sources[byId.get(id).paragraphId])).join('---\n\n');
  const blind=makeBlind(selection.order,'R'),secondBlind=makeBlind(second,'S');
  const key='# 판정 대조표\n\n'+selection.order.map((id,i)=>`## R${String(i+1).padStart(3,'0')} / ${id}\n\n`+
    '```json\n'+JSON.stringify(comparisons.find(c=>c.pointId===id),null,2)+'\n```\n\n').join('');
  const empty=(ids,prefix)=>ids.map((pointId,i)=>({reviewId:`${prefix}${String(i+1).padStart(3,'0')}`,pointId,verdict:null,errorQuote:null,questionWorthy:null,memo:null}));
  // Structural isolation: blind documents are rendered only from source paragraph + raw dialogue + empty fields.
  assert.equal(blind,makeBlind(selection.order,'R'));assert.equal(secondBlind,makeBlind(second,'S'));
  for(const doc of [blind,secondBlind]) assert.doesNotMatch(doc,/^source:|^출처:|^axisAttribution:|^overall:|^## .*A-N\d|^## .*B-[0-9a-f]/mu);
  return {selection,secondOrder:second,files:{'REVIEW.md':blind,'REVIEW-KEY.md':key,'REVIEW-SECOND.md':secondBlind},
    humanReview:{first:empty(selection.order,'R'),second:empty(second,'S')},blindValidation:{sourceOnlyRendering:true,noResultFields:true,noSourceLabels:true}};
}
export async function report(bundle,jobs,envelopes,directory,{mock=false}={}) {
  assert.equal(new Set(envelopes.map(e=>e.id)).size,envelopes.length,'duplicate response IDs');
  const results=[];
  for(const e of envelopes) {
    const job=jobs.find(j=>j.id===e.id);assert.ok(job,`unknown response: ${e.id}`);
    const result=await interpretResponse(bundle,job,e);
    if(job.kind==='attribution') {
      const parent=results.find(r=>r.id===`${job.pointId}-${job.arm}`),point=bundle.points.find(p=>p.pointId===job.pointId);
      if(!parent||!shouldAttribute(parent.raw,parent.errors))result.errors.push('attribution without a valid unresolved shadow');
      else {try {assert.deepEqual(job,attributionJob(bundle,point,job.arm,parent.raw));}catch{result.errors.push('attribution request differs from parent shadow');}}
    }
    results.push(result);
  }
  const comparisons=bundle.points.map(p=>comparePoint(p,p.v4??v4FromResult(results.find(r=>r.id===`${p.pointId}-V4`)),results));
  const summary=buildSummary(bundle,comparisons,envelopes,mock),reviews=reviewDocuments(bundle,comparisons);
  summary.reviewSelection=reviews.selection;summary.blindValidation=reviews.blindValidation;
  mkdirSync(directory,{recursive:true});
  const write=(name,value)=>writeFileSync(`${directory}/${name}`,JSON.stringify(value,null,2)+'\n');
  write('summary.json',summary);write('comparisons.json',comparisons);write('results.json',results);write('human-review.json',reviews.humanReview);
  for(const [name,text] of Object.entries(reviews.files))writeFileSync(`${directory}/${name}`,text);
  return {summary,results,reviews};
}
