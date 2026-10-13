import {readFileSync,writeFileSync,appendFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {CentralAxisDecompositionResultSchema as Base} from '../packages/pipeline/dist/central-axis-decomposition/schema.js';
import {validateCentralAxisDecompositionResult} from '../packages/pipeline/dist/central-axis-decomposition/evaluator.js';

const root='docs/experiments/conditional-meta-ui-2026-10-01';
const assets='packages/pipeline/fixtures/experiments/dialogue/conditional-meta-v1';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const lines=p=>existsSync(p)?readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const append=(p,v)=>appendFileSync(p,JSON.stringify(v)+'\n');
const Gen=Base.extend({schemaVersion:z.literal('central-axis-meta-openai-v1'),centralAxes:z.array(Base.shape.centralAxes.element.extend({metaAxis:z.string().min(1)})).min(1)});
const phase=process.argv[2];
function preflight(){const m=read(`${root}/manifest.json`);for(const s of m.sources)assert.equal(hash(readFileSync(s.path,'utf8')),s.hash);const jobs=read(`${root}/requests.json`);assert.equal(hash(jobs),m.requestHash);return {m,jobs};}
if(phase==='prepare'){
  mkdirSync(root,{recursive:true});assert.ok(!existsSync(`${root}/manifest.json`));
  const dir='packages/pipeline/fixtures/experiments/dialogue/passages';
  const passages=readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(`${dir}/${f}`)).filter(p=>p.source.status==='exact-local-source'&&p.paragraphs.every(p=>p.goldPath&&p.goldReviewStatus!=='awaiting_human_review'));
  assert.equal(passages.length,6);
  const oldPath='docs/experiments/conditional-meta-natural-eight-2026-10-01/cases.json',old=read(oldPath);
  const templatePath='docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/requests.json',template=read(templatePath).find(j=>j.id==='candidate-2').request;
  const sources=[oldPath,templatePath].map(path=>({path,hash:hash(readFileSync(path,'utf8'))})),items=[],jobs=[];
  for(const p of passages)for(const q of p.paragraphs){const original=read(q.goldPath),sourceGoldHash=hash(readFileSync(q.goldPath,'utf8'));sources.push({path:q.goldPath,hash:sourceGoldHash});const prior=old.find(c=>c.paragraphId===q.paragraphId);if(prior){assert.equal(prior.level1Input.gold.centralStory,original.centralStory);assert.equal(prior.level1Input.gold.paragraphText,original.paragraphText);}
    items.push({paragraphId:q.paragraphId,passageId:p.passageId,sourceGoldPath:q.goldPath,sourceGoldHash,centralStory:original.centralStory,axes:prior?.axes??null,provenance:prior?.axisSource??`${root}/results.jsonl#${q.paragraphId}`});
    if(!prior){const request={...template,input:JSON.stringify({paragraphId:q.paragraphId,centralStory:original.centralStory},null,2)};jobs.push({id:q.paragraphId,request,requestHash:hash(request)});}
  }
  assert.equal(items.length,30);assert.equal(jobs.length,22);save(`${root}/items.json`,items);save(`${root}/requests.json`,jobs);save(`${root}/manifest.json`,{sources,requestHash:hash(jobs),itemsHash:hash(items),calls:22,reused:8,retries:0,preparedAt:new Date().toISOString()});console.log('Prepared 22 generation calls + 8 reused; original gold unchanged.');
}else if(phase==='generate'){
  const {jobs}=preflight();assert.ok(!existsSync(`${root}/started.json`));save(`${root}/started.json`,{at:new Date().toISOString()});let cursor=0;
  await Promise.all(Array.from({length:2},async()=>{while(cursor<jobs.length){const j=jobs[cursor++],start=performance.now();let response=null,error=null,validated=null;
    const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,o)=>{assert.deepEqual(JSON.parse(o.body),j.request);append(`${root}/wire.jsonl`,{id:j.id,body:o.body,hash:hash(o.body)});return globalThis.fetch(url,o);}});
    try{response=await client.responses.create(j.request);assert.equal(response.status,'completed');validated=Gen.parse(JSON.parse(response.output_text));const {centralAxes,...rest}=validated;validateCentralAxisDecompositionResult(Base.parse({...rest,schemaVersion:'central-axis-decomposition-openai-v2',centralAxes:centralAxes.map(({id,description})=>({id,description}))}),JSON.parse(j.request.input));assert.equal(validated.verdict,'READY');assert.deepEqual(centralAxes.map(a=>a.id),centralAxes.map((_,i)=>`AX${i+1}`));}catch(e){error=e.message;validated=null;}
    const row={id:j.id,requestHash:j.requestHash,response,validated,error,durationMs:Math.round(performance.now()-start)};append(`${root}/results.jsonl`,row);console.log(JSON.stringify({id:j.id,axes:validated?.centralAxes.length,error,ms:row.durationMs}));
  }}));
}else if(phase==='export'){
  const {m,jobs}=preflight(),items=read(`${root}/items.json`),rows=lines(`${root}/results.jsonl`),wire=lines(`${root}/wire.jsonl`);assert.equal(hash(items),m.itemsHash);assert.equal(rows.length,22);assert.equal(wire.length,22);assert.equal(new Set(rows.map(r=>r.id)).size,22);
  for(const j of jobs){const r=rows.find(r=>r.id===j.id),w=wire.find(w=>w.id===j.id);assert.ok(r.validated&&!r.error,`${j.id}: ${r.error}`);assert.equal(w.hash,hash(w.body));assert.deepEqual(JSON.parse(w.body),j.request);assert.equal(r.requestHash,j.requestHash);}
  mkdirSync(assets,{recursive:true});
  for(const s of items){const path=`${assets}/${s.paragraphId}.json`;assert.ok(!existsSync(path));save(path,{schemaVersion:'conditional-meta-gold-v1',paragraphId:s.paragraphId,sourceGoldHash:s.sourceGoldHash,centralStory:s.centralStory,axes:s.axes??rows.find(r=>r.id===s.paragraphId).validated.centralAxes,provenance:s.provenance});}
  save(`${root}/audit.json`,{at:new Date().toISOString(),calls:22,valid:22,reused:8,exported:30,sourceGoldUnchanged:true,wireMatchesRequests:true,retries:0,inputTokens:rows.reduce((s,r)=>s+r.response.usage.input_tokens,0),outputTokens:rows.reduce((s,r)=>s+r.response.usage.output_tokens,0)});console.log('Exported 30 isolated assets; audit passed.');
}else throw new Error('prepare | generate | export');
