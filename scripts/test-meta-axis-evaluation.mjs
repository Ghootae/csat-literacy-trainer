import {readFileSync, writeFileSync, appendFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {buildCentralStoryGatePayload, CentralStoryGateV4ErrorClaimsResultSchema as Level1Schema, validateCentralStoryGateResult} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root='docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29';
const prior='docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29';
const generation='docs/experiments/meta-axis-generation-corporate-p4-2026-09-29';
const goldPath='packages/pipeline/fixtures/experiments/dialogue/gold-v2/corporate-law-p4.json';
const phase=process.argv[2]??'prepare';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const lines=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const save=(n,v)=>writeFileSync(`${root}/${n}`,JSON.stringify(v,null,2)+'\n');
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const unclear=['UNCLEAR_OK','UNCLEAR_SERIOUS'];
const MetaSchema=z.object({axes:z.array(z.object({axisId:z.string(),fulfilled:z.boolean(),reason:z.string(),evidenceQuotes:z.array(z.string()),unresolvedMeaning:z.string().nullable()}))});

export function route(level1,level2,valid=true){
  if(!valid)return 'EVALUATION_ERROR';
  if(level1==='ERROR')return 'ERROR';
  if(level1==='PASS')return level2?'PASS_BONUS_ELIGIBLE':'LEVEL_DISAGREEMENT';
  assert.ok(unclear.includes(level1));
  return level2?'PASS_BASIC':'QUESTION_CANDIDATE';
}
function interpret(response,level,c){
  let raw=null,validated=null,normalizationEvents=null,contractError=null;
  try{
    assert.equal(response?.status,'completed');raw=JSON.parse(response.output_text);
    if(level==='level1'){
      const v=validateCentralStoryGateResult(Level1Schema.parse(raw),c.level1Input);
      validated=v.result;normalizationEvents=v.normalizationEvents;
      assert.deepEqual(raw.axisFeedback,validated.axisFeedback,'Axis feedback changed by validation');
    }else{
      validated=MetaSchema.parse(raw);assert.deepEqual(validated.axes.map(a=>a.axisId).sort(),['AX1','AX2']);
      for(const a of validated.axes){
        assert.ok(a.reason.trim());
        for(const q of a.evidenceQuotes)assert.ok(q.trim()&&c.response.includes(q),'Non-exact student quote');
        if(a.fulfilled){assert.ok(a.evidenceQuotes.length>0);assert.equal(a.unresolvedMeaning,null);}
        else assert.ok(a.unresolvedMeaning?.trim());
      }
    }
  }catch(e){contractError=e.message;validated=null;}
  return {raw,validated,normalizationEvents,contractError};
}
function preflight(){
  const manifest=read(`${root}/manifest.json`),cases=read(`${root}/cases.json`),jobs=read(`${root}/requests.json`),gold=read(`${root}/frozen-gold.json`);
  for(const [file,key] of [['PLAN.md','planHash'],['level1-instructions.md','level1Hash'],['level2-instructions.md','level2Hash']])assert.equal(hash(readFileSync(`${root}/${file}`,'utf8')),manifest[key]);
  assert.equal(hash(cases),manifest.casesHash);assert.equal(hash(jobs),manifest.requestsHash);assert.equal(hash(gold),manifest.goldHash);
  assert.deepEqual(gold.axes,lines(`${generation}/results.jsonl`).find(r=>r.id==='candidate-2').validated.centralAxes);
  assert.equal(readFileSync(`${root}/level1-instructions.md`,'utf8'),readFileSync(`${prior}/candidate-instructions.md`,'utf8'));
  assert.equal(jobs.length,36);assert.equal(cases.length,6);
  for(const c of cases)for(const level of ['level1','level2']){
    const jj=jobs.filter(j=>j.caseId===c.id&&j.level===level);assert.equal(jj.length,3);assert.equal(new Set(jj.map(j=>j.requestHash)).size,1);
    for(const j of jj){
      assert.equal(hash(j.request),j.requestHash);
      const expected=level==='level1'?buildCentralStoryGatePayload(c.level1Input):JSON.stringify(c.level2Input,null,2);
      assert.equal(j.request.input,expected);assert.equal(j.request.instructions,readFileSync(`${root}/${level}-instructions.md`,'utf8'));
      assert.deepEqual(j.request.text.format,zodTextFormat(level==='level1'?Level1Schema:MetaSchema,level==='level1'?'central_story_gate_result':'meta_axis_evaluation'));
      const p=JSON.parse(expected);
      if(level==='level2'){assert.deepEqual(Object.keys(p).sort(),['metaAxes','studentResponse']);assert.equal(p.studentResponse,c.response);}
      else {assert.ok(p.paragraphText);assert.equal(p.evidence.initialResponse,c.response);assert.ok(!('centralStory'in p));assert.ok(!('metaAxes'in p));}
    }
  }
  return {manifest,cases,jobs,gold};
}
if(phase==='test'){
  for(const l of ['PASS',...unclear,'ERROR'])for(const m of [false,true]){
    const expected=l==='ERROR'?'ERROR':l==='PASS'?(m?'PASS_BONUS_ELIGIBLE':'LEVEL_DISAGREEMENT'):(m?'PASS_BASIC':'QUESTION_CANDIDATE');
    assert.equal(route(l,m),expected);assert.equal(route(l,m,false),'EVALUATION_ERROR');
  }
  const c={response:'첫 문장. 둘째 문장.'};
  const a=(id,q)=>({axisId:id,fulfilled:true,reason:'표현됨',evidenceQuotes:[q],unresolvedMeaning:null});
  const response={status:'completed',output_text:JSON.stringify({axes:[a('AX1','첫 문장'),a('AX2','둘째 문장')]})};
  assert.equal(interpret(response,'level2',c).contractError,null);
  response.output_text=JSON.stringify({axes:[a('AX1','없는 문장'),a('AX2','둘째 문장')]});
  assert.ok(interpret(response,'level2',c).contractError);
  console.log('Routing truth table, invalid-contract exclusion, and exact-quote tests passed. No API calls.');
}else if(phase==='prepare'){
  assert.ok(!existsSync(`${root}/manifest.json`),'Already frozen');
  const original=read(goldPath),axes=lines(`${generation}/results.jsonl`).find(r=>r.id==='candidate-2').validated.centralAxes;
  const actual=read(`${prior}/cases.json`).find(c=>c.id==='P4-C1');
  const ax1='이익 잉여금은 사업 투자나 배당 등에 비교적 자유롭게 쓸 수 있지만, 자본 잉여금은 손실 보전 같은 제한된 용도로만 쓸 수 있다.';
  const ax2='이익 잉여금과 자본 잉여금으로도 누적 손실을 메우지 못하면 자본금을 쓴다. 자본금이 줄면 회사가 존속하기 어려워질 수 있으므로 신중하게 운용해야 한다.';
  const defs=[
    {id:'C1',kind:'actual',label:'기존 실제 최초 응답',response:actual.response,expected:{AX1:{level1:['PASS'],level2:[true]},AX2:{level1:unclear,level2:null}},basis:'Codex 가설; AX2 Level2 탐색'},
    {id:'C2',kind:'synthetic',label:'두 축 충분',response:ax1+' '+ax2,expected:{AX1:{level1:['PASS'],level2:[true]},AX2:{level1:['PASS'],level2:[true]}},basis:'Codex 가설'},
    {id:'C3',kind:'synthetic',label:'차이만 표현·방향 생략',response:'이익 잉여금과 자본 잉여금은 사용할 수 있는 범위가 다르다. '+ax2,expected:{AX1:{level1:unclear,level2:[true]},AX2:{level1:['PASS'],level2:[true]}},basis:'AX1 사용자 승인 기준; AX2 Codex 가설'},
    {id:'C4',kind:'synthetic',label:'위험·신중함만 표현·최후 수단 생략',response:ax1+' 자본금을 줄여 쓰면 회사 존립이 위태로워질 수 있으므로 신중하게 운용해야 한다.',expected:{AX1:{level1:['PASS'],level2:[true]},AX2:{level1:unclear,level2:null}},basis:'Codex 가설; AX2 Level2 탐색'},
    {id:'C5',kind:'synthetic',label:'사용 대조·조건·위험 누락',response:'이익 잉여금은 영업 활동에서 남은 이익이고, 자본 잉여금은 자본 거래에서 얻은 이익이다. 자본금 운용은 신중해야 한다.',expected:{AX1:{level1:unclear,level2:[false]},AX2:{level1:unclear,level2:[false]}},basis:'Codex 가설'},
    {id:'C6',kind:'synthetic',label:'자유도 방향 역전 오류',response:'이익 잉여금과 자본 잉여금은 사용할 수 있는 범위가 다르다. 자본 잉여금이 이익 잉여금보다 용도가 더 자유롭고, 이익 잉여금은 더 제한적으로만 쓴다. '+ax2,expected:{AX1:{level1:['ERROR'],level2:null},AX2:{level1:['PASS'],level2:[true]}},basis:'명시적 오류 구제 금지; Level2 AX1 탐색'},
  ];
  const gold={...original,centralAxes:axes.map(a=>({...original.centralAxes.find(x=>x.id===a.id),description:a.description}))};
  const cases=defs.map(c=>({...c,level1Input:{...actual.input,gold,goldVersion:'meta-axis-candidate-2-experimental',goldHash:'sha256:'+hash(gold),initialResponse:c.response},level2Input:{metaAxes:axes.map(({id,metaAxis})=>({id,metaAxis})),studentResponse:c.response}}));
  writeFileSync(`${root}/level1-instructions.md`,readFileSync(`${prior}/candidate-instructions.md`,'utf8'));
  const jobs=[];
  for(let repeat=1;repeat<=3;repeat++)for(const c of cases)for(const level of repeat===2?['level2','level1']:['level1','level2']){
    const request={model:'gpt-5.6-terra',instructions:readFileSync(`${root}/${level}-instructions.md`,'utf8'),input:level==='level1'?buildCentralStoryGatePayload(c.level1Input):JSON.stringify(c.level2Input,null,2),reasoning:{effort:'medium'},max_output_tokens:4000,store:false,text:{format:zodTextFormat(level==='level1'?Level1Schema:MetaSchema,level==='level1'?'central_story_gate_result':'meta_axis_evaluation')}};
    jobs.push({id:`${c.id}-${level}-${repeat}`,caseId:c.id,level,repeat,request,requestHash:hash(request)});
  }
  const frozen={paragraphId:original.paragraphId,paragraphText:original.paragraphText,axes,source:`${generation}/results.jsonl#candidate-2`};
  save('frozen-gold.json',frozen);save('cases.json',cases);save('requests.json',jobs);
  save('manifest.json',{preparedAt:new Date().toISOString(),casesHash:hash(cases),requestsHash:hash(jobs),goldHash:hash(frozen),operationalGoldHash:hash(readFileSync(goldPath,'utf8')),planHash:hash(readFileSync(`${root}/PLAN.md`,'utf8')),level1Hash:hash(readFileSync(`${root}/level1-instructions.md`,'utf8')),level2Hash:hash(readFileSync(`${root}/level2-instructions.md`,'utf8')),calls:36,repeats:3,concurrency:2,maxRetries:0});
  preflight();console.log('Frozen and verified 36 requests. No API calls.');
}else if(phase==='run'){
  const {jobs,cases}=preflight();assert.ok(process.env.OPENAI_API_KEY);assert.ok(!existsSync(`${root}/started.json`),'No automatic reruns');save('started.json',{at:new Date().toISOString()});
  let cursor=0,wireCount=0;
  async function worker(){while(cursor<jobs.length){
    const job=jobs[cursor++],start=performance.now();let response=null,apiError=null;
    const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
      assert.equal(typeof options.body,'string');assert.deepEqual(JSON.parse(options.body),job.request);assert.ok(++wireCount<=36);
      appendFileSync(`${root}/wire.jsonl`,JSON.stringify({id:job.id,at:new Date().toISOString(),bodyHash:hash(options.body),body:options.body})+'\n');return globalThis.fetch(url,options);
    }});
    try{response=await client.responses.create(job.request);}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
    const r={id:job.id,caseId:job.caseId,level:job.level,repeat:job.repeat,requestHash:job.requestHash,durationMs:Math.round(performance.now()-start),response,apiError,...interpret(response,job.level,cases.find(c=>c.id===job.caseId))};
    appendFileSync(`${root}/results.jsonl`,JSON.stringify(r)+'\n');console.log(JSON.stringify({id:r.id,ms:r.durationMs,axes:r.validated?.axes??r.validated?.axisFeedback,apiError,contractError:r.contractError}));
  }}
  await Promise.all([worker(),worker()]);
}else if(phase==='audit'){
  const {manifest,cases,jobs,gold}=preflight();assert.equal(hash(readFileSync(goldPath,'utf8')),manifest.operationalGoldHash);
  if(!existsSync(`${root}/results.jsonl`)){console.log('Preflight passed; no API results yet.');process.exit(0);}
  const rows=lines(`${root}/results.jsonl`),wires=lines(`${root}/wire.jsonl`);
  assert.equal(rows.length,36);assert.equal(wires.length,36);assert.equal(new Set(rows.map(r=>r.id)).size,36);assert.deepEqual(rows.map(r=>r.id).sort(),wires.map(w=>w.id).sort());
  for(const w of wires){assert.equal(hash(w.body),w.bodyHash);assert.deepEqual(JSON.parse(w.body),jobs.find(j=>j.id===w.id).request);}
  for(const r of rows){assert.equal(r.requestHash,jobs.find(j=>j.id===r.id).requestHash);const v=interpret(r.response,r.level,cases.find(c=>c.id===r.caseId));for(const k of Object.keys(v))assert.deepEqual(r[k],v[k]);}
  const pairs=cases.flatMap(c=>[1,2,3].map(repeat=>{
    const rr=rows.filter(r=>r.caseId===c.id&&r.repeat===repeat),l1=rr.find(r=>r.level==='level1'),l2=rr.find(r=>r.level==='level2');
    const valid=rr.every(r=>!r.apiError&&!r.contractError);
    const axes=gold.axes.map(a=>{const v1=l1.validated?.axisFeedback.find(x=>x.axisId===a.id),v2=l2.validated?.axes.find(x=>x.axisId===a.id);return {axisId:a.id,level1:v1??null,level2:v2??null,route:route(v1?.status,v2?.fulfilled,valid)};});
    return {caseId:c.id,repeat,valid,axes,paragraphPass:valid&&axes.every(a=>a.route.startsWith('PASS_'))};
  }));
  const stats=['level1','level2'].map(level=>{const rr=rows.filter(r=>r.level===level),times=rr.map(r=>r.durationMs).sort((a,b)=>a-b);return {level,calls:rr.length,valid:rr.filter(r=>!r.apiError&&!r.contractError).length,medianMs:(times[8]+times[9])/2,inputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens??0),0),cachedTokens:rr.reduce((s,r)=>s+(r.response?.usage?.input_tokens_details?.cached_tokens??0),0),outputTokens:rr.reduce((s,r)=>s+(r.response?.usage?.output_tokens??0),0)};});
  save('summary.json',{calls:rows.length,valid:rows.filter(r=>!r.apiError&&!r.contractError).length,stats,pairs});
  save('execution-audit.json',{at:new Date().toISOString(),calls:36,valid:rows.filter(r=>!r.apiError&&!r.contractError).length,wireMatchesFrozenRequests:true,repeatRequestsIdentical:true,level1PromptUnchanged:true,selectedCandidate2Unchanged:true,level2SeesOnlyMetaAndResponse:true,validationReproduced:true,operationalGoldUnchanged:true,retries:0,questionCalls:0,jevCalls:0});
  const doc=['# 法인 4문단 두 수준 판정 전체 기록'.replace('法','법'),'','## 원문','',gold.paragraphText,''];
  for(const a of gold.axes)doc.push(`## ${a.id}`,'',`기존 수준 축: ${a.description}`,'',`메타 축: ${a.metaAxis}`,'');
  for(const c of cases){doc.push(`## ${c.id} ${c.label}`,'',`유형: ${c.kind}; 사전 기대 출처: ${c.basis}`,'',c.response,'','| 반복 | 축 | Level1 | Level2 | 종합 |','|---|---|---|---|---|');for(const p of pairs.filter(p=>p.caseId===c.id))for(const a of p.axes)doc.push(`| ${p.repeat} | ${a.axisId} | ${a.level1?.status??'계약실패'} | ${a.level2?.fulfilled??'계약실패'} | ${a.route} |`);for(const r of rows.filter(r=>r.caseId===c.id).sort((a,b)=>a.repeat-b.repeat||a.level.localeCompare(b.level)))doc.push('',`### ${r.id}`,'',`API 오류: ${JSON.stringify(r.apiError)}; 계약 오류: ${r.contractError??'없음'}; 시간: ${r.durationMs}ms`,'','```json',JSON.stringify(r.raw,null,2),'```');doc.push('');}
  writeFileSync(`${root}/REVIEW-PACKET.md`,doc.join('\n'));
  console.log(JSON.stringify({stats,pairs:pairs.map(p=>({caseId:p.caseId,repeat:p.repeat,valid:p.valid,paragraphPass:p.paragraphPass,axes:p.axes.map(a=>[a.axisId,a.level1?.status,a.level2?.fulfilled,a.route])}))},null,2));
}else throw new Error('Unknown phase');
