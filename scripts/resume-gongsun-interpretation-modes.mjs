import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {SourceDirectProblemBundleSchema,createProblemSolvingSession,submitInitialProblemResponse,
  applyCorrectRationaleAssessment,createSourceDirectProblemEvaluatorInput,createSourceDirectProblemRequestContent,
  validateSourceDirectProblemEvaluatorOutput,OpenAISourceDirectProblemEvaluator,SourceDirectRationaleOutputSchema,
  SourceDirectDiagnosticOutputSchema,SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION} from '../packages/pipeline/dist/index.js';

// Recover only markup omitted from otherwise verbatim quotes. Never change semantic claims or reroll assessments.
const DIR='docs/experiments/gongsun-interpretation-modes-2026-10-03',REC=`${DIR}/recovered`;
const read=p=>JSON.parse(readFileSync(p,'utf8')),hash=x=>createHash('sha256').update(x).digest('hex');
const save=(p,x)=>writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const frozen=read(`${DIR}/FROZEN.json`),source=SourceDirectProblemBundleSchema.parse(read(`${DIR}/source.json`));
const prompts=read(`${DIR}/prompts.json`),baseLedger=readFileSync(`${DIR}/requests.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
const tags=source.textAnnotations.flatMap(a=>[`〈${a.marker}〉`,`〈/${a.marker}〉`]);
function project(text){let plain='',positions=[];for(let i=0;i<text.length;){const tag=tags.find(t=>text.startsWith(t,i));
  if(tag){i+=tag.length;continue;}plain+=text[i];positions.push(i++);}return {plain,positions};}
function restore(quote,text){
  if(text.includes(quote))return quote;
  const {plain,positions}=project(text),q=project(quote).plain,start=plain.indexOf(q);
  if(!q||start<0||plain.indexOf(q,start+1)!==-1)throw new Error('Quote not uniquely restorable by markup only');
  const restored=text.slice(positions[start],positions[start+q.length-1]+1);
  if(project(restored).plain!==q)throw new Error('Quote words changed');return restored;
}
function normalize(raw){const output=structuredClone(raw),changes=[];
  for(const row of output.markerInterpretations??[]){const text=row.location==='PASSAGE'?source.passage:source.scenario;
    const quote=restore(row.clauseQuote,text);if(quote!==row.clauseQuote)changes.push({field:`${row.marker}.clauseQuote`,before:row.clauseQuote,after:quote});row.clauseQuote=quote;}
  const evaluation=output.evaluation??output;
  for(const row of evaluation.sourceEvidence??[]){if(row.kind!=='TEXT'||!['PASSAGE','SCENARIO'].includes(row.source))continue;
    const text=row.source==='PASSAGE'?source.passage:source.scenario,quote=restore(row.quote,text);
    if(quote!==row.quote)changes.push({field:'sourceEvidence.quote',before:row.quote,after:quote});row.quote=quote;}
  return {output,changes};
}
const fresh=r=>submitInitialProblemResponse(createProblemSolvingSession({sessionId:`interpretation-modes-r${r}`,
  questionId:source.questionId,answerChoiceId:source.answerChoiceId}),{initialChoiceId:frozen.fixture.choiceId,rationale:frozen.fixture.rationale});
const inputFor=session=>createSourceDirectProblemEvaluatorInput({session,source,promptVersion:SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  evaluationMode:session.phase==='AWAITING_CORRECT_RATIONALE_ASSESSMENT'?'ASSESS_SELECTION_RATIONALE':'DIAGNOSE_PATH'});
function checkRows(rows){if(JSON.stringify(rows.map(r=>r.marker).sort())!==JSON.stringify([...frozen.targetMarkers].sort()))throw new Error('Markers mismatch');
  for(const r of rows){const a=source.textAnnotations.find(a=>a.marker===r.marker&&a.location===r.location);
    if(!a||a.text!==r.text||!r.localRole?.trim()||!r.interpretation?.trim())throw new Error('Invalid mapping');
    if(!(r.location==='PASSAGE'?source.passage:source.scenario).includes(r.clauseQuote))throw new Error('Invalid quote');}}
const recovery=[];
for(const {arm,r} of frozen.schedule){
  if(arm==='inline_only')continue;
  const old=read(`${DIR}/${arm}-r${r}.json`);if(!old.steps.some(s=>s.error))continue;
  const stage=arm==='same_call'?'assessment':'mapping',label=`${arm}-r${r}-${stage}`;
  const entry=baseLedger.find(e=>e.event==='END'&&e.label===label);if(!entry)throw new Error('No existing output');
  const {output,changes}=normalize(JSON.parse(entry.outputText));checkRows(output.markerInterpretations);
  if(stage==='assessment')validateSourceDirectProblemEvaluatorOutput(output.evaluation,inputFor(fresh(r)));
  recovery.push({arm,r,stage,originalRequestId:entry.id,output,changes});
}
let invalidRejected=false;try{restore('원문에 존재하지 않는 내용',source.scenario);}catch{invalidRejected=true;}
if(!invalidRejected||recovery.length!==5)throw new Error('Recovery self-check failed');
mkdirSync(REC,{recursive:true});
const plan={runnerHash:hash(readFileSync(new URL(import.meta.url))),frozenHash:hash(readFileSync(`${DIR}/FROZEN.json`)),
  originalLedgerHash:hash(readFileSync(`${DIR}/requests.jsonl`)),recovery,
  policy:'Restore only omitted inline markup in uniquely matched verbatim quotes; preserve raw outputs and all semantic claims. Same prompts/schema, no model reroll of initial tables/assessments. Shared cap 21 requests/$3.'};
if(existsSync(`${REC}/PLAN.json`)){if(JSON.stringify(read(`${REC}/PLAN.json`))!==JSON.stringify(plan))throw new Error('Recovery plan changed');}
else{if(process.argv[2]!=='prepare')throw new Error('Prepare first');save(`${REC}/PLAN.json`,plan);}
if(process.argv[2]==='prepare'){console.log(JSON.stringify({recoveredWithoutCalls:recovery.map(x=>({arm:x.arm,r:x.r,fields:x.changes.length})),semanticClaimsChanged:false,negativeQuoteTest:'passed'}));process.exit(0);}
if(process.argv[2]!=='run')throw new Error('Use prepare or run');
const ledgerPath=`${REC}/requests.jsonl`,ledger=existsSync(ledgerPath)?readFileSync(ledgerPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const log=x=>{ledger.push(x);appendFileSync(ledgerPath,JSON.stringify(x)+'\n');};
const account=()=>{const all=[...baseLedger,...ledger],starts=all.filter(x=>x.event==='START');return {requests:starts.length,
  estimatedUsd:all.filter(x=>x.event==='END').reduce((s,x)=>s+x.estimatedUsd,0),
  reservedUsd:starts.filter(s=>!all.some(x=>x.event==='END'&&x.id===s.id)).reduce((s,x)=>s+x.reservedUsd,0)};};
let client;
for(const item of recovery){
  const {arm,r}=item,file=`${REC}/${arm}-r${r}.json`;if(existsSync(file))continue;
  const rows=item.output.markerInterpretations,steps=[];let session=fresh(r),stage;
  if(arm==='same_call'){
    steps.push({stage:'assessment',reusedOriginalOutput:true,originalRequestId:item.originalRequestId,result:item.output.evaluation});
    session=applyCorrectRationaleAssessment(session,item.output.evaluation.assessment);
  }else steps.push({stage:'mapping',reusedOriginalOutput:true,originalRequestId:item.originalRequestId,markerInterpretations:rows});
  for(stage of (arm==='same_call'?['question']:['assessment','question'])){
    const label=`${arm}-r${r}-${stage}`;
    const evaluator=new OpenAISourceDirectProblemEvaluator({model:frozen.model,effort:'medium',maxRetries:0,maxOutputTokens:8000,
      timeoutMs:60000,promptVersion:SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,transport:{async parse(o){
        const input={...JSON.parse(createSourceDirectProblemRequestContent(o.input)[0].text),targetMarkers:frozen.targetMarkers,preparedMarkerInterpretations:rows};
        const schema=o.input.evaluationMode==='ASSESS_SELECTION_RATIONALE'?SourceDirectRationaleOutputSchema:SourceDirectDiagnosticOutputSchema;
        const request={model:frozen.model,instructions:prompts.withMapInstruction,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(input)}]}],
          reasoning:{effort:'medium'},max_output_tokens:8000,store:false,service_tier:'default',text:{format:{type:'json_schema',name:'source_direct_marker_experiment',strict:true,schema:z.toJSONSchema(schema)}}};
        const a=account(),bytes=Buffer.byteLength(JSON.stringify(request)),reservedUsd=(bytes*2+96000)/1e6;
        if(a.requests>=21||a.estimatedUsd+a.reservedUsd+reservedUsd>3||bytes>220000)throw new Error('Shared cap reached');
        const id=a.requests+1,started=Date.now();
        log({event:'START',id,label,at:new Date().toISOString(),reservedUsd,instructionHash:hash(prompts.withMapInstruction),input});
        try{
          client??=new OpenAI({maxRetries:0});const response=await client.responses.create(request,{timeout:60000,maxRetries:0});
          const u=response.usage,cached=u?.input_tokens_details?.cached_tokens??0;
          const estimatedUsd=u?((u.input_tokens-cached)*2+cached*0.2+u.output_tokens*12)/1e6:reservedUsd;
          log({event:'END',id,label,at:new Date().toISOString(),durationMs:Date.now()-started,model:response.model,usage:u,estimatedUsd,outputText:response.output_text});
          const normalized=normalize(JSON.parse(response.output_text));
          if(normalized.changes.length)log({event:'QUOTE_RESTORED',id,label,changes:normalized.changes});
          return {outputParsed:normalized.output,usage:u?{inputTokens:u.input_tokens,outputTokens:u.output_tokens,cacheReadTokens:cached}:undefined};
        }catch(e){log({event:'ERROR',id,label,error:String(e)});throw e;}
      }}});
    try{
      const call=await evaluator.evaluate(inputFor(session));steps.push({stage,call});
      console.log(JSON.stringify({label,result:call.result,account:account()}));
      if(stage==='assessment'&&call.result.assessment==='CLEAR_ERROR')session=applyCorrectRationaleAssessment(session,'CLEAR_ERROR');else break;
    }catch(e){steps.push({stage,error:String(e)});console.log(JSON.stringify({label,error:String(e)}));break;}
  }
  save(file,{arm,replicate:r,markerInterpretations:rows,quoteRecovery:item.changes,steps});
}
save(`${REC}/RESULTS.json`,{...account(),originalStructuralFailures:5,initialOutputsReused:5,
  runs:frozen.schedule.map(({arm,r})=>{const path=existsSync(`${REC}/${arm}-r${r}.json`)?`${REC}/${arm}-r${r}.json`:`${DIR}/${arm}-r${r}.json`;
    const x=read(path);return {arm,replicate:r,path,stages:x.steps.map(s=>({stage:s.stage,assessment:(s.call?.result??s.result)?.assessment,action:(s.call?.result??s.result)?.nextAction?.type,error:s.error}))};})});
console.log(JSON.stringify(account()));
