import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {validateAuditV2,auditFlags,ROLES,RELATIONS} from './lib/axis-audit-v2-contract.mjs';

// D-0086: 감사기 v2(최소 2축·관계 중심 병합 기준·병합 기록 계약)를 v1과 같은 자동 병합 결과에 적용한다.
const v1='docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02';
const prior='docs/experiments/axis-candidate-jev-five-passages-2026-10-02';
const root='docs/experiments/axis-audit-v2-min-two-2026-10-06';
mkdirSync(root,{recursive:true});
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(n,x)=>writeFileSync(`${root}/${n}`,JSON.stringify(x,null,2)+'\n');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const items=read(`${prior}/items.json`);
const auditPrompt=`원문과 현재 문단의 전체 L1·L2 축 세트를 감사하고, 필요한 수정을 직접 반영한 최종 축 세트를 출력하세요.
목표는 문단의 핵심 설명을 의미 있게 보존하면서 독립적으로 평가할 필요가 없는 평가 단위를 줄이는 것입니다. 사용자는 FA 회피를 miss보다 우선합니다. 그러나 축 수 감소만으로 FA 감소를 추정하지 마세요. 병합이 서로 다른 핵심 질문의 답을 하나의 필수 요구 묶음으로 확대하는지 점검하세요.
먼저 지문 전체 맥락에서 대상 문단의 기능을 판정하세요. 지문 전체의 화제를 소개하는 도입 문단이면 introduction, 앞의 논의를 정리·마무리하는 정리 문단이면 conclusion, 그 밖의 문단은 general입니다. introduction이나 conclusion은 그 기능이 분명할 때만 고르고 evidenceQuote에 그 기능을 보여 주는 원문 구절을 그대로 인용하세요. 확실하지 않으면 uncertain을 true로 하세요. 이때는 일반 문단으로 처리됩니다.
일반 문단에서 입력 축이 2개 이상이면 최종 축을 2개 이상 유지해야 합니다. 병합과 삭제 모두에 적용됩니다. 축 하나가 맞다고 판단하더라도 2개 이상을 유지하고, 그 의견과 원문 근거를 singleAxisOpinion에 기록하세요.
병합 기준:
- 같은 중심 질문인지는 공통 소재, 같은 대상, 서술이 이어진다는 사실로 판단하지 않습니다. 학생이 무엇의 어떤 관계를 답해야 하는지가 같을 때만 같은 질문입니다.
- 주장과 그 이유·예시·구체화가 같은 관계를 설명한다면 병합하세요. 독립적으로 평가할 필요가 없는 소개·연결·반복은 주변 축에 흡수하거나, 내용이 불필요하면 평가 축에서 삭제하세요. 핵심 설명을 포함한 축 전체를 도입부라는 이유로 삭제하지 마세요.
- 서로 다른 원인·결과·조건·대상의 관계에 답하는 설명은 같은 현상을 다루더라도 별도 축으로 두세요. 여러 질문을 '그리고'나 '~하며'로 이어야만 하나의 중심 질문이 된다면 서로 다른 질문일 가능성이 높습니다.
그 밖의 감사:
- L1의 핵심 의미 누락, 관계·대상·방향·적용 범위의 왜곡, 원문에 없는 추가를 바로잡으세요. 원문의 모든 세부를 필수 평가 항목으로 늘리는 작업은 아닙니다. 최소 요구를 보존하려고 부수 세부까지 L1에 덧붙이지 마세요.
- L2는 L1의 핵심 취지를 한 단계 추상화합니다. L1의 모든 사례·조건·중간 단계·비교 방향을 반복할 필요가 없습니다. L2에서 구체 방향이 생략된 것만으로 오류로 보거나 L1 요구를 다시 넣지 마세요. 그러나 원문에 없는 대비·목적·원인 추가나 명시적인 방향 오류는 수정하세요.
병합한 각 최종 축에는 mergeReview를 작성하세요. 병합하지 않은 축의 mergeReview는 null입니다.
- originalQuestions: 병합한 각 입력 축의 id와 centralQuestion을 입력 그대로 인용하세요.
- originalRequirements: 각 입력 축 L1이 요구하는 최소 핵심 관계(minimalMeaning)와 그 근거가 되는 입력 L1 구절의 정확한 인용(quote). 부수 세부는 넣지 마세요.
- questionRelation: same-question(같은 질문의 반복), claim-and-support(주장과 이유·예시·구체화), distinct-questions(서로 다른 질문), uncertain 중 하나와 설명.
- requirementMapping: 각 입력 축의 최소 요구가 남은 최종 L1 구절을 정확히 인용(finalPhrase)하세요. 부수 세부로 보아 제외했다면 finalPhrase를 null로 하고 excludedReason을 쓰세요. 병합으로 새로 생긴 필수 요구가 있으면 newRequirements에 쓰세요.
- contrastResponse: 병합에 가장 불리한 짧은 학생 응답(입력 축 하나의 질문에만 답한 응답)과, 그 응답이 병합 전과 병합 후의 축을 충족하는지에 대한 예상. 이것은 검토 자료이며 판정이 아닙니다.
원문은 사실 확인에, 전체 지문은 문맥 해석에만 쓰세요. 다른 문단 내용을 대상 문단 축에 추가하지 마세요. 기존 골드나 학생 판정 결과는 입력하지 않았습니다.
허용 작업은 유지·추가 병합·불필요 축 삭제·문구 수정입니다. 축을 새로 분할하거나 추가하지 마세요. 이전 병합을 취소하지 마세요. 문제가 없으면 그대로 유지하세요. 수정 건수를 채우려고 바꾸지 마세요.
최종 axes에는 입력 축 순서를 유지하고 id를 AX1부터 다시 매기세요. 각 최종 축의 fromAxisIds는 대응하는 입력 축 ID입니다. 2개 이상이면 연속된 입력 축이어야 하며 action은 merge입니다. 하나이고 문구가 같으면 keep, 문구를 바꾸면 rewrite입니다. keep은 L1·L2·centralQuestion을 정확히 보존하세요. 각 축의 description과 metaAxis는 각각 한 문장으로 쓰세요.
입력의 각 ID는 최종 axes의 fromAxisIds 또는 deletedAxes 중 정확히 한 번에만 포함하세요. deletedAxes에는 삭제한 ID와 독립 평가가 불필요한 이유를 쓰세요. 모든 수정·병합·삭제에는 원문에 근거한 간결한 이유를 남기세요. 최종 축은 적어도 하나여야 합니다. paragraphReview에는 핵심 변경과 남은 불확실성을 간결하게 쓰세요.`;
const mergeReviewSchema=z.object({
 originalQuestions:z.array(z.object({id:z.string(),centralQuestion:z.string()})).min(2),
 originalRequirements:z.array(z.object({id:z.string(),minimalMeaning:z.string().min(1),quote:z.string().min(1)})).min(2),
 questionRelation:z.object({type:z.enum(RELATIONS),explanation:z.string().min(1)}),
 requirementMapping:z.object({mappings:z.array(z.object({id:z.string(),finalPhrase:z.string().nullable(),excludedReason:z.string().nullable()})).min(2),newRequirements:z.array(z.string())}),
 contrastResponse:z.object({response:z.string().min(1),expectedBeforeMerge:z.string().min(1),expectedAfterMerge:z.string().min(1),rationale:z.string().min(1)}),
});
const auditSchema=z.object({
 paragraphId:z.string(),
 paragraphFunction:z.object({role:z.enum(ROLES),uncertain:z.boolean(),evidenceQuote:z.string(),reason:z.string().min(1)}),
 axes:z.array(z.object({id:z.string(),fromAxisIds:z.array(z.string()).min(1),action:z.enum(['keep','rewrite','merge']),centralQuestion:z.string().min(1),description:z.string().min(1),metaAxis:z.string().min(1),reason:z.string().min(1),mergeReview:mergeReviewSchema.nullable()})).min(1),
 deletedAxes:z.array(z.object({id:z.string(),reason:z.string().min(1)})),
 singleAxisOpinion:z.object({thinksSingleAxis:z.boolean(),reason:z.string()}),
 paragraphReview:z.string(),
});
const context=item=>({paragraphId:item.id,paragraphText:item.body,footnote:item.footnote,passageContext:items.filter(i=>i.passageId===item.passageId).map(i=>({paragraphId:i.id,position:i.position,text:i.paragraphText}))});
const requestFor=(item,axes)=>({model:'gpt-5.6-terra',reasoning:{effort:'medium'},service_tier:'default',store:false,max_output_tokens:12000,instructions:auditPrompt,input:JSON.stringify({...context(item),axes}),text:{format:zodTextFormat(auditSchema,'audit')}});
const contractInput=(item,axes)=>({paragraphId:item.id,paragraphText:item.body,axes});

function prepare(){
 const inputs=items.map(item=>({paragraphId:item.id,item,afterMerge:read(`${v1}/${item.id}--merged.json`).afterMerge}));
 const sourceFiles=[`${prior}/items.json`,...items.flatMap(i=>[`${v1}/${i.id}--merged.json`,`${v1}/${i.id}--final.json`])].map(path=>({path,sha256:hash(path)}));
 // 사전 검증: 실제 입력에서 '모두 유지' 출력이 계약을 통과하고, 요청 본문이 결정적으로 만들어지는지 확인한다.
 const keepAll=x=>({paragraphId:x.paragraphId,paragraphFunction:{role:'general',uncertain:false,evidenceQuote:'',reason:'사전 검증'},axes:x.afterMerge.map(a=>({id:a.id,fromAxisIds:[a.id],action:'keep',centralQuestion:a.centralQuestion,description:a.description,metaAxis:a.metaAxis,reason:'유지',mergeReview:null})),deletedAxes:[],singleAxisOpinion:{thinksSingleAxis:false,reason:''},paragraphReview:''});
 for(const x of inputs){assert.deepEqual(validateAuditV2(contractInput(x.item,x.afterMerge),auditSchema.parse(keepAll(x))),[],x.paragraphId);assert.deepEqual(requestFor(x.item,x.afterMerge),requestFor(x.item,x.afterMerge));}
 const collapse=inputs.find(x=>x.afterMerge.length>=2);const bad=keepAll(collapse);bad.axes=[bad.axes[0]];bad.deletedAxes=collapse.afterMerge.slice(1).map(a=>({id:a.id,reason:'사전 검증'}));
 assert.ok(validateAuditV2(contractInput(collapse.item,collapse.afterMerge),bad).some(e=>e.includes('최소 2축')));
 const manifest={sourceFiles,paragraphs:inputs.length,inputAxes:inputs.reduce((n,x)=>n+x.afterMerge.length,0),singleAxisInputs:inputs.filter(x=>x.afterMerge.length===1).map(x=>x.paragraphId),auditCalls:inputs.length,model:'gpt-5.6-terra',reasoning:'medium',maxOutputTokens:12000,retries:0,productionEligible:false};
 if(existsSync(`${root}/manifest.json`)){for(const f of read(`${root}/manifest.json`).sourceFiles)assert.equal(hash(f.path),f.sha256,f.path);assert.deepEqual(read(`${root}/inputs.json`),inputs);}
 else{save('manifest.json',manifest);save('inputs.json',inputs);writeFileSync(`${root}/audit-prompt.md`,auditPrompt+'\n');save('preflight-validation.json',{keepAllContractPassed:inputs.length,deterministicRequests:inputs.length,minimumTwoViolationDetected:collapse.paragraphId,apiCalls:0});}
 console.log(JSON.stringify({...manifest,sourceFiles:sourceFiles.length}));
}
async function call(id,request,schema){
 const name=`${id}--audit`;
 if(existsSync(`${root}/${name}-request.json`))assert.deepEqual(read(`${root}/${name}-request.json`),request);
 if(existsSync(`${root}/${name}-result.json`))return schema.parse(read(`${root}/${name}-result.json`));
 if(existsSync(`${root}/${name}-response.json`)){const r=read(`${root}/${name}-response.json`);assert.equal(r.status,'completed',name);const out=schema.parse(JSON.parse(r.output_text));save(`${name}-result.json`,out);return out;}
 assert.ok(!existsSync(`${root}/${name}-error.json`),'Explicit error review required: '+name);
 save(`${name}-request.json`,request);
 const client=new OpenAI({maxRetries:0,timeout:240000,fetch:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),request);save(`${name}-wire.json`,{url:String(url),body:options.body});return globalThis.fetch(url,options);}});
 try{const response=await client.responses.create(request);save(`${name}-response.json`,response);assert.equal(response.status,'completed');const result=schema.parse(JSON.parse(response.output_text));save(`${name}-result.json`,result);return result;}catch(e){save(`${name}-error.json`,{message:e.message,status:e.status??null});throw e;}
}
async function run(approval){
 // 원문·축을 OpenAI로 보내므로, 이 실험의 전송을 승인한 D-0086 이후 결정 기록을 요구한다.
 assert.ok(/^D-\d{4}$/.test(approval??'')&&Number(approval.slice(2))>86,'run <D-0086 이후 전송 승인 결정 ID> 필요');
 const record=readdirSync('memory/decisions').find(n=>n.startsWith(approval+'-'));
 assert.ok(record,'결정 기록 없음: '+approval);
 const text=readFileSync(`memory/decisions/${record}`,'utf8');
 assert.ok(/^scope:.*axis-audit-v2/mu.test(text)&&text.includes('전송')&&text.includes('승인'),'결정 기록이 이 실험의 전송 승인이 아님: '+record);
 if(!existsSync(`${root}/run-approval.json`))save('run-approval.json',{decision:record,startedAt:new Date().toISOString()});
 process.loadEnvFile('.env');prepare();const inputs=read(`${root}/inputs.json`);let cursor=0,failed=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<inputs.length){const x=inputs[cursor++],id=x.paragraphId;try{
  if(existsSync(`${root}/${id}--final.json`))continue;
  const out=await call(id,requestFor(x.item,x.afterMerge),auditSchema);
  const errors=validateAuditV2(contractInput(x.item,x.afterMerge),out);
  if(errors.length){save(`${id}--contract-error.json`,{errors});throw new Error(errors.join('; '));}
  const afterAudit=out.axes.map(a=>({...a,sourceText:a.fromAxisIds.map(f=>x.afterMerge.find(p=>p.id===f).sourceText).join(' ')}));
  save(`${id}--final.json`,{paragraphId:id,passageId:x.item.passageId,title:x.item.title,position:x.item.position,afterMerge:x.afterMerge,paragraphFunction:out.paragraphFunction,afterAudit,deletedAxes:out.deletedAxes.map(a=>({...a,sourceText:x.afterMerge.find(p=>p.id===a.id).sourceText})),singleAxisOpinion:out.singleAxisOpinion,paragraphReview:out.paragraphReview,flags:auditFlags(contractInput(x.item,x.afterMerge),out),productionEligible:false});
  console.log(JSON.stringify({id,before:x.afterMerge.length,after:out.axes.length,role:out.paragraphFunction.role}));
 }catch(e){failed++;save(`${id}--pipeline-error.json`,{message:e.message});console.log(JSON.stringify({id,error:e.message}));}}}));
 if(failed)process.exitCode=1;
}
function report(){
 const manifest=read(`${root}/manifest.json`);for(const f of manifest.sourceFiles)assert.equal(hash(f.path),f.sha256,f.path);
 const inputs=read(`${root}/inputs.json`);
 // 실패 문단은 기록으로 남기고 성공 문단만 집계한다. 성공 결과는 계약으로 다시 검사한다.
 const failed=inputs.filter(x=>!existsSync(`${root}/${x.paragraphId}--final.json`)).map(x=>({paragraphId:x.paragraphId,errors:['contract-error','error','pipeline-error'].filter(k=>existsSync(`${root}/${x.paragraphId}--${k==='error'?'audit-error':k}.json`)).map(k=>read(`${root}/${x.paragraphId}--${k==='error'?'audit-error':k}.json`))}));
 const results=inputs.filter(x=>existsSync(`${root}/${x.paragraphId}--final.json`)).map(x=>{const r=read(`${root}/${x.paragraphId}--final.json`);
  const out={paragraphId:r.paragraphId,paragraphFunction:r.paragraphFunction,axes:r.afterAudit.map(({sourceText,...a})=>a),deletedAxes:r.deletedAxes.map(({sourceText,...a})=>a),singleAxisOpinion:r.singleAxisOpinion};
  assert.deepEqual(validateAuditV2(contractInput(x.item,x.afterMerge),out),[],r.paragraphId);return r;});
 const calls=readdirSync(root).filter(n=>n.endsWith('-response.json'));for(const name of calls){const p=name.slice(0,-'-response.json'.length);assert.deepEqual(JSON.parse(read(`${root}/${p}-wire.json`).body),read(`${root}/${p}-request.json`));assert.equal(read(`${root}/${name}`).status,'completed',name);}
 const responses=calls.map(n=>read(`${root}/${n}`)),sum=(xs,f)=>xs.reduce((n,x)=>n+f(x),0);
 const v1final=id=>read(`${v1}/${id}--final.json`).afterAudit;
 const summary={paragraphs:inputs.length,succeeded:results.length,failed,afterMerge:sum(results,r=>r.afterMerge.length),v1AfterAudit:sum(results,r=>v1final(r.paragraphId).length),v2AfterAudit:sum(results,r=>r.afterAudit.length),
  roles:Object.fromEntries(ROLES.map(k=>[k,results.filter(r=>r.flags.effectiveRole===k).length])),uncertainRole:results.filter(r=>r.paragraphFunction.uncertain).length,
  singleAxisParagraphs:results.filter(r=>r.afterAudit.length===1).length,singleAxisOpinions:results.filter(r=>r.singleAxisOpinion.thinksSingleAxis).map(r=>r.paragraphId),
  merges:sum(results,r=>r.flags.merges.length),wholeParagraphMerges:sum(results,r=>r.flags.merges.filter(m=>m.wholeParagraphMerge).length),distinctQuestionMerges:sum(results,r=>r.flags.merges.filter(m=>m.questionRelation==='distinct-questions').length),
  deleted:sum(results,r=>r.deletedAxes.length),meanL1Length:Math.round(sum(results,r=>sum(r.afterAudit,a=>a.description.length))/sum(results,r=>r.afterAudit.length)),
  openaiCalls:calls.length,usage:{input:sum(responses,r=>r.usage.input_tokens),output:sum(responses,r=>r.usage.output_tokens)},productionEligible:false};
 save('summary.json',summary);
 let md='# 감사기 v2 — v1과 같은 자동 병합 입력\n\n축 수·길이·검토 신호는 설명 지표다. 의미 품질과 학생 FA 개선을 뜻하지 않는다. 집계는 성공 문단만 대상으로 한다.\n\n';
 if(failed.length){md+='## 실패 문단\n\n';for(const f of failed)md+=`- ${f.paragraphId}: ${JSON.stringify(f.errors)}\n`;md+='\n';}
 const axesMd=axes=>axes.map(a=>`- **${a.id} L1:** ${a.description}\n  - **L2:** ${a.metaAxis}\n`).join('');
 for(const r of results){const item=items.find(i=>i.id===r.paragraphId),old=v1final(r.paragraphId);
  md+=`## ${item.title}\n\n**원문**\n\n${item.paragraphText}\n\n**문단 기능:** ${r.paragraphFunction.role}${r.paragraphFunction.uncertain?' (불확실→general)':''} — ${r.paragraphFunction.reason}\n\n### 자동 병합 후 (${r.afterMerge.length}축)\n\n${axesMd(r.afterMerge)}\n### v1 감사 (${old.length}축)\n\n${axesMd(old)}\n### v2 감사 (${r.afterAudit.length}축)\n\n${axesMd(r.afterAudit)}\n`;
  for(const a of r.afterAudit){md+=`- ${a.action} ${a.fromAxisIds.join('+')} → ${a.id}: ${a.reason}\n`;if(a.mergeReview)md+=`  - 관계: ${a.mergeReview.questionRelation.type} — ${a.mergeReview.questionRelation.explanation}\n  - 대조 응답: ${a.mergeReview.contrastResponse.response} (전: ${a.mergeReview.contrastResponse.expectedBeforeMerge} / 후: ${a.mergeReview.contrastResponse.expectedAfterMerge})\n`;}
  for(const a of r.deletedAxes)md+=`- delete ${a.id}: ${a.reason}\n`;
  if(r.singleAxisOpinion.thinksSingleAxis)md+=`- 1축 의견: ${r.singleAxisOpinion.reason}\n`;
  md+=`\n${r.paragraphReview}\n\n`;}
 writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary));
}
const phase=process.argv[2];if(phase==='prepare')prepare();else if(phase==='run')await run(process.argv[3]);else if(phase==='report')report();else throw new Error('prepare | run <승인 결정 ID> | report');
