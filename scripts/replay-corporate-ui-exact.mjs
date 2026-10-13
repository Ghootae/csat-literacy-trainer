import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { CentralStoryGateV4ErrorClaimsResultSchema as Schema, validateCentralStoryGateResult } from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const root='docs/experiments/corporate-ui-exact-replay-2026-09-29';
const prior='docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29';
const phase=process.argv[2]??'prepare';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const write=(name,data)=>writeFileSync(`${root}/${name}`,JSON.stringify(data,null,2)+'\n');
mkdirSync(root,{recursive:true});
if(phase==='prepare'){
  assert.ok(!existsSync(`${root}/manifest.json`),'Already prepared');
  const request=read(`${prior}/reconstructed-ui-request.json`);
  assert.equal(sha(JSON.stringify(request)),read(`${prior}/request-comparison-audit.json`).reconstructedUiRequestHash);
  assert.deepEqual(JSON.parse(request.input).revealedAxisContent,[]);
  const snapshot=read('docs/experiments/question-actionability-corporate-p2-2026-09-29/source-snapshot.json');
  const input={gold:snapshot.gold,goldVersion:snapshot.goldRef.version,goldHash:snapshot.goldRef.hash,initialResponse:snapshot.turns[0].answer,history:[],turn:1,questionsAsked:0,maxQuestions:3,shownSourceGuides:[],revealedAxisContent:[]};
  write('request.json',request);write('evaluation-input.json',input);write('historical-result.json',snapshot.turns[0].call.decisionAudit.rawResult);
  write('manifest.json',{preparedAt:new Date().toISOString(),requestHash:sha(JSON.stringify(request)),inputHash:sha(JSON.stringify(input)),calls:3,sequential:true,maxRetries:0,historicalRequestSaved:false,description:'Repeat the current UI reconstructed request, including empty revealedAxisContent, with no request modifications.'});
  console.log(JSON.stringify({prepared:true,calls:3,requestHash:sha(JSON.stringify(request))}));
}else if(phase==='run'){
  const request=read(`${root}/request.json`),input=read(`${root}/evaluation-input.json`),manifest=read(`${root}/manifest.json`);
  assert.equal(sha(JSON.stringify(request)),manifest.requestHash);assert.equal(sha(JSON.stringify(input)),manifest.inputHash);
  assert.ok(!existsSync(`${root}/started.json`),'Already started; do not replay again automatically');
  assert.ok(process.env.OPENAI_API_KEY);write('started.json',{at:new Date().toISOString()});
  let currentRepeat=0,wireCalls=0;
  const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{
    assert.equal(typeof options.body,'string');assert.deepEqual(JSON.parse(options.body),request);
    assert.ok(++wireCalls<=3);appendFileSync(`${root}/wire.jsonl`,JSON.stringify({repeat:currentRepeat,bodyHash:sha(options.body),body:options.body,sentAt:new Date().toISOString()})+'\n');
    return globalThis.fetch(url,options);
  }});
  for(currentRepeat=1;currentRepeat<=3;currentRepeat++){
    const start=performance.now();let response=null,raw=null,validated=null,apiError=null,contractError=null;
    try{response=await client.responses.create(request);try{assert.equal(response.status,'completed');raw=JSON.parse(response.output_text);validated=validateCentralStoryGateResult(Schema.parse(raw),input).result;}catch(e){contractError=e.message;}}catch(e){apiError={name:e.name,status:e.status??null,message:e.message};}
    const result={repeat:currentRepeat,requestHash:manifest.requestHash,durationMs:Math.round(performance.now()-start),response,raw,validated,apiError,contractError};
    appendFileSync(`${root}/results.jsonl`,JSON.stringify(result)+'\n');
    console.log(JSON.stringify({repeat:currentRepeat,axes:(validated??raw)?.axisFeedback?.map(a=>({axisId:a.axisId,status:a.status,reason:a.reason})),durationMs:result.durationMs,contractError,apiError}));
  }
}else if(phase==='audit'){
  const rows=readFileSync(`${root}/results.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
  const wires=readFileSync(`${root}/wire.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
  const request=read(`${root}/request.json`),input=read(`${root}/evaluation-input.json`),manifest=read(`${root}/manifest.json`),historical=read(`${root}/historical-result.json`);
  assert.equal(rows.length,3);assert.equal(wires.length,3);assert.equal(new Set(wires.map(w=>w.bodyHash)).size,1);
  for(const w of wires){assert.deepEqual(JSON.parse(w.body),request);assert.equal(sha(w.body),w.bodyHash);}
  for(const r of rows){assert.equal(r.requestHash,manifest.requestHash);if(!r.contractError&&!r.apiError)assert.deepEqual(validateCentralStoryGateResult(Schema.parse(r.raw),input).result,r.validated);}
  const valid=rows.filter(r=>!r.contractError&&!r.apiError),axes=r=>r.axisFeedback.map(a=>[a.axisId,a.status]);
  const summary={calls:3,valid:valid.length,requestHash:manifest.requestHash,wireBodyHash:wires[0].bodyHash,allWireBodiesIdentical:true,historicalRequestSaved:false,historicalAxes:axes(historical),allRawTextsIdentical:valid.length===3&&new Set(valid.map(r=>r.response.output_text)).size===1,allAxisStatusesIdentical:valid.length===3&&new Set(valid.map(r=>JSON.stringify(axes(r.raw)))).size===1,rows:rows.map(r=>({repeat:r.repeat,axes:(r.validated??r.raw)?.axisFeedback??null,rawStatusHash:r.raw?sha(JSON.stringify(axes(r.raw))):null,rawTextHash:r.response?sha(r.response.output_text):null,equalsHistoricalRaw:JSON.stringify(r.raw)===JSON.stringify(historical),inputTokens:r.response?.usage?.input_tokens,outputTokens:r.response?.usage?.output_tokens,durationMs:r.durationMs,contractError:r.contractError,apiError:r.apiError}))};
  write('summary.json',summary);console.log(JSON.stringify(summary,null,2));
}else throw new Error('Unknown phase');
