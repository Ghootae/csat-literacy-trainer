import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { zodTextFormat } from 'openai/helpers/zod';
import { ParagraphAnalysisResultV3Schema } from '../packages/pipeline/dist/paragraph-analysis/schema.js';
import { validateParagraphAnalysisResult } from '../packages/pipeline/dist/paragraph-analysis/evaluator.js';

const root = 'docs/experiments/jev-element-normalization-dopamine-v1-2026-09-23';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (name, data) => writeFileSync(`${root}/${name}.json`, JSON.stringify(data, null, 2)+'\n', {flag:'wx'});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gold = read('packages/pipeline/fixtures/experiments/dialogue/gold-v2/dopamine-motor-control-p1.json');
const passage = read('packages/pipeline/fixtures/experiments/dialogue/passages/dopamine-motor-control.json');
const axis = gold.centralAxes.find(a=>a.id==='AX1');
const analysisInput = {paragraphId:gold.paragraphId, paragraphText:gold.paragraphText,
  sentences:gold.paragraphText.split(/(?<=[.!?])\s+/u).map((text,i)=>({id:`S${i+1}`,text})),
  passageParagraphs:passage.paragraphs.map(({paragraphId,text})=>({paragraphId,text})),fullPassageAvailable:true};
const str = z.string().min(1), refs = z.array(str);
const schema = z.strictObject({paragraphId:str,axisId:str,originalAxisText:str,
  elements:z.array(z.strictObject({id:str,importance:z.enum(['core','optional']),kind:z.enum(['claim','relation']),
    semanticFunction:z.enum(['function','limitation','cause','contrast','sequence','condition','exclusivity','comparison','definition','classification','other']),
    statement:str,arguments:refs,supports:refs,realization:z.enum(['not_applicable','explicit_required','inferable_from_arguments']),
    derivation:z.enum(['direct_source','direct_union','axis_projection']),
    provenance:z.strictObject({propositionIds:refs,edgeIds:refs,analysisRelationIds:refs}),sourceEvidence:refs,
    coverageQuestion:str,importanceReason:str})).min(1),
  collisionQuestion:str,broadQuestion:str,issues:z.array(str)});
mkdirSync(root,{recursive:true});
const phase=process.argv[2]??'prepare';
if(phase==='prepare'){
  save('plan',{model:'gpt-5.6-terra',effort:'medium',maxCalls:2,repeats:1,retries:0,
    analysisMaxOutputTokens:7000,normalizationMaxOutputTokens:4500,authorization:'2026-09-23 사용자 API 정규화 시험 요청',
    sourceStatus:'도파민의 과거 P/E 분석 산출물 미발견. 기존 v3.1 분석으로 새 입력을 만든 뒤 정규화. 과거 산출물 재사용 실험으로 간주하지 않음.',
    goldHash:hash(gold),analysisInputHash:hash(analysisInput)});
  save('analysis-input',analysisInput);
  console.log('prepared'); process.exit(0);
}
assert.ok(['analysis','normalize'].includes(phase));
const plan=read(`${root}/plan.json`);
assert.equal(plan.goldHash,hash(gold));
assert.equal(plan.analysisInputHash,hash(analysisInput));
assert.ok(process.env.OPENAI_API_KEY,'OPENAI_API_KEY missing');
assert.ok(!process.env.OPENAI_BASE_URL,'custom endpoint not allowed');
const api=new OpenAI({maxRetries:0,timeout:60000});
let input, instructions, outputSchema;
if(phase==='analysis'){
  input=analysisInput;
  instructions=readFileSync('packages/pipeline/experiments/dialogue/paragraph-analysis-prompt-v3.1.md','utf8');
  outputSchema=ParagraphAnalysisResultV3Schema;
}else{
  const a=read(`${root}/analysis-result.json`);
  input={paragraphId:gold.paragraphId,paragraphText:gold.paragraphText,approvedAxis:axis,
    originalGoldRelations:gold.coreRelations.filter(r=>axis.relationIds.includes(r.id)),
    analysis:{propositions:a.propositions,propositionEdges:a.propositionEdges,regions:a.regions,
      majorRelations:a.majorRelations,minimumLogic:a.minimumLogic}};
  instructions=readFileSync('packages/pipeline/experiments/dialogue/jev-element-normalization-prompt-v1.md','utf8');
  outputSchema=schema;
  save('normalization-input',input);
}
const request={model:plan.model,instructions,input:JSON.stringify(input),reasoning:{effort:plan.effort},
  max_output_tokens:phase==='analysis'?plan.analysisMaxOutputTokens:plan.normalizationMaxOutputTokens,
  store:false,service_tier:'default',text:{format:zodTextFormat(outputSchema,phase==='analysis'?'paragraph_analysis':'jev_normalization')}};
assert.ok(!existsSync(`${root}/${phase}-request.json`),'request already attempted; inspect saved artifacts before any rerun');
save(`${phase}-request`,request);
const start=performance.now();
try{
  const response=await api.responses.create(request);
  save(`${phase}-response`,{durationMs:Math.round(performance.now()-start),response});
  assert.equal(response.status,'completed');
  const result=outputSchema.parse(JSON.parse(response.output_text));
  if(phase==='analysis')validateParagraphAnalysisResult(result,input);
  else{
    assert.equal(result.paragraphId,gold.paragraphId);assert.equal(result.axisId,axis.id);assert.equal(result.originalAxisText,axis.description);
    const ids=result.elements.map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
    const allowed={propositionIds:new Set(input.analysis.propositions.map(p=>p.id)),edgeIds:new Set(input.analysis.propositionEdges.map(e=>e.id)),analysisRelationIds:new Set(input.analysis.majorRelations.map(r=>r.id))};
    result.elements.forEach((e,i)=>{
      assert.equal(e.id,`N${i+1}`);
      assert.ok(e.sourceEvidence.length>0 && e.sourceEvidence.every(q=>gold.paragraphText.includes(q)),`${e.id} invalid quote`);
      assert.ok(e.provenance.propositionIds.length>0,`${e.id} missing source propositions`);
      for(const [key,list] of Object.entries(e.provenance))assert.ok(list.every(id=>allowed[key].has(id)),`${e.id} invalid ${key}`);
      assert.ok([...e.arguments,...e.supports].every(id=>ids.slice(0,i).includes(id)),`${e.id} cyclic/forward element reference`);
      if(e.kind==='claim'){assert.equal(e.realization,'not_applicable');assert.equal(e.arguments.length,0);}
    });
  }
  save(`${phase}-result`,result);
  console.log(JSON.stringify({phase,status:'validated',durationMs:Math.round(performance.now()-start),usage:response.usage}));
}catch(e){save(`${phase}-error`,{name:e.name,message:e.message});console.error(e.message);process.exitCode=1;}
