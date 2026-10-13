import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput, OpenAISourceDirectProblemEvaluator,
  createSourceDirectProblemRequestContent, SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';

const DIR = 'docs/experiments/gongsun-interpretation-modes-2026-10-03';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (p,x) => writeFileSync(p, JSON.stringify(x,null,2)+'\n', {flag:'wx'});
const source = SourceDirectProblemBundleSchema.parse(read('docs/experiments/gongsun-v3-inline-markers-ab-2026-10-03/sources.json').inline);
const fixture = read('docs/experiments/gongsun-marker-input-ab-2026-10-02/cases.json').cases.find(x=>x.id==='G-error');
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md';
const originalPrompt = readFileSync(promptPath,'utf8');
if(hash(originalPrompt)!=='3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff') throw new Error('Original v3 changed');
const targetMarkers = [...new Set(source.choices.find(c=>c.choiceId===fixture.choiceId).text.match(/[ⓐ-ⓩ㉠-㉻]/gu))];
const mapRow = z.object({marker:z.string(),location:z.enum(['PASSAGE','SCENARIO']),text:z.string(),
  clauseQuote:z.string(),localRole:z.string(),interpretation:z.string(),uncertainty:z.string().nullable()}).strict();
const mapSchema = z.object({markerInterpretations:z.array(mapRow)}).strict();
// The actual experimental instructions are Korean; no question-specific meaning is supplied here.
const mapInstruction = `입력 targetMarkers의 각 기호에 대해 원문 해석 표를 작성한다. 표의 각 행은 기호 marker, 소속 location, 표시된 정확한 문자열 text, 인접 절의 정확한 인용 clauseQuote, 문장 속 역할 localRole, 문맥상 의미 interpretation, 해석이 불확실한 경우 uncertainty를 담는다. 불확실하지 않으면 uncertainty는 null이다.
기호의 문자열 범위와 그 표현이 들어 있는 문장 전체의 주장을 구분한다. 문장 속 역할은 원문에 따라 부정·대조·조건·인용 등의 관계를 간결하게 설명한다. 학생이 말한 해석을 원문의 해석으로 복사하지 않는다. 입력 원자료로 확인되는 내용만 쓰고 표시 범위의 의미를 문맥과 무관하게 고정하지 않는다. 해석 표에 학생 정오 판정이나 교정 질문을 쓰지 않는다.`;
const combinedInstruction = originalPrompt.trim()+`\n\n## 실험용 기호 해석 선행 출력\n${mapInstruction}\n먼저 markerInterpretations를 작성하고, 이어서 evaluation에 원래 평가 모드의 출력을 작성한다. 해석 표와 학생이 실제로 말한 주장을 구분하여 비교하고 위 v3 규칙으로 판정한다. 최상위 출력은 markerInterpretations와 evaluation을 가진 객체다.`;
const withMapInstruction = originalPrompt.trim()+`\n\n## 실험용 원문 해석 표 입력\n입력 preparedMarkerInterpretations는 모델이 앞서 만든 원문 해석 표이며 정답표나 학생 발화가 아니다. 이를 학생 주장과 구분하여 비교하되, 표가 원자료와 충돌하면 원자료를 우선한다. 원래 출력 형식과 v3 판정 규칙을 유지한다.`;
const mapInput = {source,targetMarkers}; // No observations, chosen answer, or student rationale.
const fresh = r => submitInitialProblemResponse(createProblemSolvingSession({sessionId:`interpretation-modes-r${r}`,
  questionId:source.questionId,answerChoiceId:source.answerChoiceId}),{initialChoiceId:fixture.choiceId,rationale:fixture.rationale});
const inputFor = session => createSourceDirectProblemEvaluatorInput({session,source,promptVersion:SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  evaluationMode:session.phase==='AWAITING_CORRECT_RATIONALE_ASSESSMENT'?'ASSESS_SELECTION_RATIONALE':'DIAGNOSE_PATH'});
function validateMap(value){
  const parsed=mapSchema.parse(value), rows=parsed.markerInterpretations;
  if(JSON.stringify(rows.map(x=>x.marker).sort())!==JSON.stringify([...targetMarkers].sort()))throw new Error('Missing or duplicate target markers');
  for(const r of rows){
    const a=source.textAnnotations.find(a=>a.marker===r.marker&&a.location===r.location);
    if(!a||r.text!==a.text)throw new Error('Marker text mismatch');
    const original=r.location==='PASSAGE'?source.passage:source.scenario;
    if(!r.clauseQuote||!original.includes(r.clauseQuote)||!r.localRole.trim()||!r.interpretation.trim())throw new Error('Invalid table evidence or empty claim');
  }
  return rows;
}
// Validate the harness without encoding any expected semantic interpretation in API input.
const mockRows=targetMarkers.map(marker=>{const a=source.textAnnotations.find(a=>a.marker===marker);return {marker,location:a.location,text:a.text,
  clauseQuote:a.text,localRole:'offline placeholder',interpretation:'offline placeholder',uncertainty:null};});
validateMap({markerInterpretations:mockRows});
for(const invalid of [[],[...mockRows,mockRows[0]],mockRows.map((r,i)=>i? r:{...r,text:'mismatch'})]){
  let rejected=false;try{validateMap({markerInterpretations:invalid});}catch{rejected=true;}if(!rejected)throw new Error('Map validator self-test failed');
}
if(JSON.stringify(mapInput).includes(fixture.rationale)||'observations' in mapInput||'selectedChoiceId' in mapInput)throw new Error('Student leak into mapping');
const arms=['inline_only','same_call','separate_call'];
const schedule=[1,2,3].flatMap(r=>[...arms.slice(r-1),...arms.slice(0,r-1)].map(arm=>({r,arm})));
const frozen={sourceHash:hash(JSON.stringify(source)),fixture,targetMarkers,schedule,
  promptHashes:{v3:hash(originalPrompt),mapping:hash(mapInstruction),combined:hash(combinedInstruction),withMap:hash(withMapInstruction)},
  schemaHash:hash(JSON.stringify(z.toJSONSchema(mapSchema))),runnerHash:hash(readFileSync(new URL(import.meta.url))),
  runtimeHash:hash(readFileSync('packages/pipeline/dist/problem-solving/source-direct-evaluator-runtime.js')),
  model:'gpt-5.6-terra',effort:'medium',maxRequests:21,estimatedUsdCap:3,maxOutputTokens:8000,maxRetries:0,
  expected:{assessment:'CLEAR_ERROR',action:'ASK_CORRECTIVE',semantic:'d=일반적인 옷/e=빨간 옷. 표·평가 이유·질문에서 원문 해석과 학생의 역전 주장을 구분. 정확한 인용/라벨만으로 의미 통과로 집계하지 않음.'},
  design:'Separate mapping sees full source including provided answer/explanation, but no student response. Both treatment arms reuse the first table in the corrective-question stage. No extra contradiction judge. Expected semantics never sent.'};
mkdirSync(DIR,{recursive:true});
if(existsSync(`${DIR}/FROZEN.json`)){if(JSON.stringify(read(`${DIR}/FROZEN.json`))!==JSON.stringify(frozen))throw new Error('Frozen run changed');}
else{
  if(process.argv[2]!=='prepare')throw new Error('Prepare first');
  save(`${DIR}/FROZEN.json`,frozen);save(`${DIR}/source.json`,source);save(`${DIR}/mapping-input.json`,mapInput);
  save(`${DIR}/prompts.json`,{originalPrompt,mapInstruction,combinedInstruction,withMapInstruction});
  save(`${DIR}/input-example.json`,inputFor(fresh(1)));
}
if(process.argv[2]==='prepare'){console.log(JSON.stringify({prepared:true,schedule,targetMarkers,validationSelfTests:'passed',studentBlindMapping:true,maxRequests:21,estimatedUsdCap:3}));process.exit(0);}
if(process.argv[2]!=='run')throw new Error('Use prepare or run');
const ledgerPath=`${DIR}/requests.jsonl`, ledger=existsSync(ledgerPath)?readFileSync(ledgerPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const log=x=>{ledger.push(x);appendFileSync(ledgerPath,JSON.stringify(x)+'\n');};
const account=()=>{const starts=ledger.filter(x=>x.event==='START');return {requests:starts.length,
  estimatedUsd:ledger.filter(x=>x.event==='END').reduce((s,x)=>s+x.estimatedUsd,0),
  reservedUsd:starts.filter(s=>!ledger.some(x=>x.event==='END'&&x.id===s.id)).reduce((s,x)=>s+x.reservedUsd,0)};};
let client;
async function callApi(label,instructions,input,schema){
  const request={model:frozen.model,instructions,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(input)}]}],
    reasoning:{effort:'medium'},max_output_tokens:8000,store:false,service_tier:'default',
    text:{format:{type:'json_schema',name:'source_direct_marker_experiment',strict:true,schema:z.toJSONSchema(schema)}}};
  const a=account(),bytes=Buffer.byteLength(JSON.stringify(request)),reservedUsd=(bytes*2+8000*12)/1e6;
  if(a.requests>=21||a.estimatedUsd+a.reservedUsd+reservedUsd>3||bytes>220000)throw new Error('Budget/size cap');
  const id=a.requests+1,started=Date.now();
  log({event:'START',id,label,at:new Date().toISOString(),reservedUsd,requestHash:hash(JSON.stringify(request)),instructionHash:hash(instructions),input});
  try{
    client??=new OpenAI({maxRetries:0});
    const response=await client.responses.create(request,{timeout:60000,maxRetries:0});
    const u=response.usage,cached=u?.input_tokens_details?.cached_tokens??0;
    const estimatedUsd=u?((u.input_tokens-cached)*2+cached*0.2+u.output_tokens*12)/1e6:reservedUsd;
    log({event:'END',id,label,at:new Date().toISOString(),durationMs:Date.now()-started,model:response.model,usage:u,estimatedUsd,estimatedAtReservation:!u,outputText:response.output_text});
    return {output:JSON.parse(response.output_text),usage:u?{inputTokens:u.input_tokens,outputTokens:u.output_tokens,cacheReadTokens:cached}:undefined};
  }catch(e){log({event:'ERROR',id,label,error:String(e)});throw e;}
}
for(const {r,arm} of schedule){
  const file=`${DIR}/${arm}-r${r}.json`;if(existsSync(file))continue;
  const steps=[];let rows=null,session=fresh(r),stage='mapping',label=`${arm}-r${r}-mapping`;
  try{
    if(arm==='separate_call'){
      const result=await callApi(label,mapInstruction,mapInput,mapSchema);
      rows=validateMap(result.output);steps.push({stage:'mapping',output:result.output});
      console.log(JSON.stringify({label,rows,account:account()}));
    }
    for(stage of ['assessment','question']){
      label=`${arm}-r${r}-${stage}`;
      const evaluator=new OpenAISourceDirectProblemEvaluator({model:frozen.model,effort:'medium',maxRetries:0,maxOutputTokens:8000,
        timeoutMs:60000,promptVersion:SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,transport:{async parse(o){
          if(o.instructions!==originalPrompt.trim())throw new Error('v3 mismatch');
          let schema=o.input.evaluationMode==='ASSESS_SELECTION_RATIONALE'?SourceDirectRationaleOutputSchema:SourceDirectDiagnosticOutputSchema;
          let input=JSON.parse(createSourceDirectProblemRequestContent(o.input)[0].text),instructions=originalPrompt.trim();
          if(arm==='same_call'&&stage==='assessment'){
            instructions=combinedInstruction;input={...input,targetMarkers};
            schema=z.object({markerInterpretations:z.array(mapRow),evaluation:schema}).strict();
          }else if(arm!=='inline_only'){
            instructions=withMapInstruction;input={...input,targetMarkers,preparedMarkerInterpretations:rows};
          }
          const response=await callApi(label,instructions,input,schema);
          let outputParsed=response.output;
          if(arm==='same_call'&&stage==='assessment'){
            rows=validateMap({markerInterpretations:outputParsed.markerInterpretations});
            outputParsed=outputParsed.evaluation;
          }
          return {outputParsed,usage:response.usage};
        }}});
      const input=inputFor(session),call=await evaluator.evaluate(input);
      steps.push({stage,input,markerInterpretations:rows,call});
      console.log(JSON.stringify({label,rows,result:call.result,account:account()}));
      if(stage==='assessment'&&call.result.assessment==='CLEAR_ERROR')session=applyCorrectRationaleAssessment(session,'CLEAR_ERROR');else break;
    }
  }catch(e){steps.push({stage,error:String(e)});console.log(JSON.stringify({label,error:String(e)}));}
  save(file,{arm,replicate:r,steps});
}
save(`${DIR}/RESULTS.json`,{...account(),runs:schedule.map(({arm,r})=>{const x=read(`${DIR}/${arm}-r${r}.json`);return {arm,replicate:r,
  stages:x.steps.map(s=>({stage:s.stage,assessment:s.call?.result?.assessment,action:s.call?.result?.nextAction?.type,error:s.error}))};}),
  semanticReview:'Manual source/output review required; labels alone are not semantic success.'});
console.log(JSON.stringify(account()));
