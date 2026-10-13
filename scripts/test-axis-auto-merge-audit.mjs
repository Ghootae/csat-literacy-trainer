import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';

const prior='docs/experiments/axis-candidate-jev-five-passages-2026-10-02';
const root='docs/experiments/axis-auto-merge-audit-five-passages-2026-10-02';
mkdirSync(root,{recursive:true});
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(n,x)=>writeFileSync(`${root}/${n}`,JSON.stringify(x,null,2)+'\n');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const norm=s=>s.replace(/\s+/gu,'');
const items=read(`${prior}/items.json`),selection=read(`${prior}/selection.json`);
const metaPrompt=read('docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/level2-requests.json')[0].request.instructions;
const mergePrompt='입력의 연속된 원문 구간을 하나의 L1 축으로 합치세요. 병합 여부는 이미 확정되어 있으므로 재심사하거나 분리하지 마세요. 구간이 설명하는 중심 질문과 그 답인 한 문장의 L1을 작성하세요. 독립적인 핵심 내용, 관계의 방향·대상·조건을 보존하면서 중복은 압축하세요. 다른 문단이나 외부 지식으로 내용을 추가하지 마세요.';
const auditPrompt=`원문과 현재 문단의 전체 L1·L2 축 세트를 감사하고, 필요한 수정을 직접 반영한 최종 축 세트를 출력하세요.
목표는 문단의 핵심 설명을 의미 있게 보존하면서 불필요하게 세분된 평가 단위를 줄이는 것입니다. 사용자는 FA 회피를 miss보다 우선합니다. 경계적인 평가 단위를 무리하게 독립 축으로 유지하지 마세요.
다음 작업을 한 번에 수행하세요.
- 같은 중심 질문에 답하는 주장·이유·예시·구체화가 불필요하게 나뉘었다면 인접 축을 추가 병합하세요. 소재가 같다는 이유만으로 서로 다른 핵심 설명을 없애지 마세요.
- 독립적으로 평가할 필요가 없는 소개·연결·반복 축은 주변 축에 필요한 내용을 담아 병합하거나, 내용이 불필요하면 평가 축에서 삭제하세요. 핵심 설명을 포함한 축 전체를 도입부라는 이유로 삭제하지 마세요.
- L1의 핵심 의미 누락, 관계·대상·적용 범위의 왜곡, 원문에 없는 추가를 바로잡으세요. 원문의 모든 세부를 필수 평가 항목으로 늘리는 작업은 아닙니다.
- L2는 L1의 핵심 취지를 한 단계 추상화합니다. L1의 모든 사례·조건·중간 단계·비교 방향을 반복할 필요가 없습니다. L2에서 구체 방향이 생략된 것만으로 오류로 보거나 L1 요구를 다시 넣지 마세요. 그러나 원문에 없는 대비·목적·원인 추가나 명시적인 방향 오류는 수정하세요.
원문은 사실 확인에, 전체 지문은 문맥 해석에만 쓰세요. 다른 문단 내용을 대상 문단 축에 추가하지 마세요. 기존 골드나 학생 판정 결과는 입력하지 않았습니다.
허용 작업은 유지·추가 병합·불필요 축 삭제·문구 수정입니다. 축을 새로 분할하거나 추가하지 마세요. 이전 병합을 취소하지 마세요. 문제가 없으면 그대로 유지하세요. 수정 건수를 채우려고 바꾸지 마세요.
최종 axes에는 입력 축 순서를 유지하고 id를 AX1부터 다시 매기세요. 각 최종 축의 fromAxisIds는 대응하는 입력 축 ID입니다. 2개 이상이면 연속된 입력 축이어야 하며 action은 merge입니다. 하나이고 문구가 같으면 keep, 문구를 바꾸면 rewrite입니다. keep은 L1·L2·centralQuestion을 정확히 보존하세요. 각 축의 description과 metaAxis는 각각 한 문장으로 쓰세요.
입력의 각 ID는 최종 axes의 fromAxisIds 또는 deletedAxes 중 정확히 한 번에만 포함하세요. deletedAxes에는 삭제한 ID와 독립 평가가 불필요한 이유를 쓰세요. 모든 수정·병합·삭제에는 원문에 근거한 간결한 이유를 남기세요. 최종 축은 적어도 하나여야 합니다. paragraphReview에는 핵심 변경과 남은 불확실성을 간결하게 쓰세요.`;
const mergeSchema=z.object({axis:z.string().min(1),centralQuestion:z.string().min(1)});
const metaSchema=z.object({paragraphId:z.string(),axes:z.array(z.object({id:z.string(),metaAxis:z.string().min(1)})).min(1)});
const auditSchema=z.object({paragraphId:z.string(),axes:z.array(z.object({id:z.string(),fromAxisIds:z.array(z.string()).min(1),action:z.enum(['keep','rewrite','merge']),centralQuestion:z.string().min(1),description:z.string().min(1),metaAxis:z.string().min(1),reason:z.string().min(1)})).min(1),deletedAxes:z.array(z.object({id:z.string(),reason:z.string().min(1)})),paragraphReview:z.string()});
function prepare(){
 const inputs=items.map(item=>{
  const old=read(`${prior}/${item.id}--final.json`),sel=selection.results.find(r=>r.paragraphId===item.id);
  const before=old.before;const removed=new Set();
  for(const g of old.detected.groups){const at=g.ids.map(id=>before.findIndex(a=>a.id===id));assert.ok(at.every((n,i)=>n>=0&&(!i||n===at[i-1]+1)));for(const n of at.slice(1))removed.add(n-1);}
  const boundaries=sel.selected.boundaries.filter((_,i)=>!removed.has(i));
  const match=removed.size?sel.candidates.find(c=>JSON.stringify(c.boundaries)===JSON.stringify(boundaries)):sel.selected;
  const groups=[];let current=[];for(let i=0;i<before.length;i++){current.push(before[i]);if(!removed.has(i)){groups.push(current);current=[];}}assert.equal(current.length,0);
  return {paragraphId:item.id,item,before,detected:old.detected,groups,boundaries,match:match?{id:match.id,parts:match.parts}:null,initialCandidate:sel.selected.id,priorFinalCount:old.after.length};
 });
 const files=['items.json','selection.json',...items.flatMap(i=>[`${i.id}--final.json`,`${i.id}--initial-level2-result.json`])].map(n=>`${prior}/${n}`);
 const assets=items.map(i=>`packages/pipeline/fixtures/experiments/dialogue/conditional-meta-v1/${i.id}.json`);
 const manifest={createdAt:new Date().toISOString(),sourceFiles:[...files,...assets].map(path=>({path,sha256:hash(path)})),paragraphs:25,automaticMergeParagraphs:inputs.filter(x=>x.detected.groups.length).length,expectedAfterMergeAxes:inputs.reduce((n,x)=>n+x.groups.length,0),newL1Calls:inputs.filter(x=>!x.match).reduce((n,x)=>n+x.groups.filter(g=>g.length>1).length,0),l2CallMaximum:9,auditCalls:25,model:'gpt-5.6-terra',reasoning:'medium',auditRepeats:1,productionEligible:false};
 if(existsSync(`${root}/manifest.json`)){for(const f of read(`${root}/manifest.json`).sourceFiles)assert.equal(hash(f.path),f.sha256);assert.deepEqual(read(`${root}/inputs.json`),inputs);}else{save('manifest.json',manifest);save('inputs.json',inputs);writeFileSync(`${root}/audit-prompt.md`,auditPrompt+'\n');writeFileSync(`${root}/merge-prompt.md`,mergePrompt+'\n');writeFileSync(`${root}/level2-prompt.md`,metaPrompt+'\n');}
 console.log(JSON.stringify({...manifest,sourceFiles:manifest.sourceFiles.length}));
}
function context(item){return {paragraphId:item.id,paragraphText:item.body,footnote:item.footnote,passageContext:items.filter(i=>i.passageId===item.passageId).map(i=>({paragraphId:i.id,position:i.position,text:i.paragraphText}))};}
async function call(id,stage,instructions,input,schema){
 const name=`${id}--${stage}`,request={model:'gpt-5.6-terra',reasoning:{effort:'medium'},service_tier:'default',store:false,max_output_tokens:6500,instructions,input:JSON.stringify(input),text:{format:zodTextFormat(schema,stage.replaceAll('-','_'))}};
 if(existsSync(`${root}/${name}-request.json`))assert.deepEqual(read(`${root}/${name}-request.json`),request);
 if(existsSync(`${root}/${name}-result.json`))return schema.parse(read(`${root}/${name}-result.json`));
 if(existsSync(`${root}/${name}-response.json`)){const r=read(`${root}/${name}-response.json`);assert.equal(r.status,'completed',name);const out=schema.parse(JSON.parse(r.output_text));save(`${name}-result.json`,out);return out;}
 assert.ok(!existsSync(`${root}/${name}-error.json`),'Explicit error review required: '+name);
 save(`${name}-request.json`,request);
 const client=new OpenAI({maxRetries:0,timeout:180000,fetch:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),request);save(`${name}-wire.json`,{url:String(url),body:options.body});return globalThis.fetch(url,options);}});
 try{const response=await client.responses.create(request);save(`${name}-response.json`,response);assert.equal(response.status,'completed');const result=schema.parse(JSON.parse(response.output_text));save(`${name}-result.json`,result);return result;}catch(e){save(`${name}-error.json`,{message:e.message,status:e.status??null});throw e;}
}
function validateAudit(input,out){
 assert.equal(out.paragraphId,input.paragraphId);assert.deepEqual(out.axes.map(a=>a.id),out.axes.map((_,i)=>'AX'+(i+1)));
 const before=input.afterMerge,ids=before.map(a=>a.id);let previous=-1;
 for(const a of out.axes){const indices=a.fromAxisIds.map(id=>ids.indexOf(id));assert.ok(indices.every((v,i)=>v>=0&&(!i||v===indices[i-1]+1)));assert.ok(indices[0]>previous);previous=indices.at(-1);assert.equal(a.action==='merge',indices.length>1);if(a.action==='keep'){const p=before[indices[0]];for(const k of ['centralQuestion','description','metaAxis'])assert.equal(a[k],p[k]);}}
 const used=[...out.axes.flatMap(a=>a.fromAxisIds),...out.deletedAxes.map(a=>a.id)];assert.deepEqual(used.sort(),[...ids].sort());assert.equal(new Set(used).size,ids.length);
}
async function run(){
 process.loadEnvFile('.env');prepare();const inputs=read(`${root}/inputs.json`);let cursor=0,failed=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<inputs.length){const input=inputs[cursor++],id=input.paragraphId;try{
  if(existsSync(`${root}/${id}--final.json`))continue;
  let merged;
  if(existsSync(`${root}/${id}--merged.json`))merged=read(`${root}/${id}--merged.json`);
  else{
   let axes=[];
   if(input.match)axes=input.match.parts.map((p,i)=>({id:'AX'+(i+1),description:p.axis,centralQuestion:p.centralQuestion,sourceText:p.sourceText}));
   else for(const [i,group] of input.groups.entries()){
    if(group.length===1){axes.push({...group[0],id:'AX'+(i+1)});continue;}
    const sourceText=group.map(a=>a.sourceText).join(' ');const l1=await call(id,'merged-l1-'+(i+1),mergePrompt,{...context(input.item),sourceText,priorAxes:group},mergeSchema);
    axes.push({id:'AX'+(i+1),description:l1.axis,centralQuestion:l1.centralQuestion,sourceText});
   }
   assert.equal(norm(axes.map(a=>a.sourceText).join('')),norm(input.item.body));assert.equal(axes.length,input.groups.length);
   let offset=0;const actualBounds=axes.slice(0,-1).map(a=>offset+=norm(a.sourceText).length);assert.deepEqual(actualBounds,input.boundaries);
   const changes=[];for(const a of axes){const old=input.before.find(p=>norm(p.sourceText)===norm(a.sourceText)&&p.description===a.description);if(old)a.metaAxis=old.metaAxis;else changes.push(a);}
   if(changes.length){const meta=await call(id,'merged-level2',metaPrompt,{...context(input.item),axes:changes.map(({metaAxis,...a})=>a)},metaSchema);assert.equal(meta.paragraphId,id);assert.deepEqual(meta.axes.map(a=>a.id),changes.map(a=>a.id));for(const m of meta.axes)axes.find(a=>a.id===m.id).metaAxis=m.metaAxis;}
   merged={paragraphId:id,afterMerge:axes,method:input.detected.groups.length?(input.match?'existing-boundary-match':'generated-merged-l1'):'unchanged',candidateId:input.match?.id??null,changedL2Ids:changes.map(a=>a.id)};save(`${id}--merged.json`,merged);
   console.log(JSON.stringify({id,stage:'automatic-merge',before:input.before.length,after:axes.length,method:merged.method}));
  }
  const audit=await call(id,'audit',auditPrompt,{...context(input.item),axes:merged.afterMerge},auditSchema);validateAudit(merged,audit);
  const afterAudit=audit.axes.map(a=>({...a,sourceText:a.fromAxisIds.map(x=>merged.afterMerge.find(p=>p.id===x).sourceText).join(' ')}));
  save(`${id}--final.json`,{paragraphId:id,passageId:input.item.passageId,title:input.item.title,position:input.item.position,before:input.before,detected:input.detected,...merged,afterAudit,deletedAxes:audit.deletedAxes.map(a=>({...a,sourceText:merged.afterMerge.find(p=>p.id===a.id).sourceText})),paragraphReview:audit.paragraphReview,productionEligible:false});
  console.log(JSON.stringify({id,stage:'audit',before:merged.afterMerge.length,after:afterAudit.length,merged:audit.axes.filter(a=>a.action==='merge').length,deleted:audit.deletedAxes.length,rewritten:audit.axes.filter(a=>a.action==='rewrite').length}));
 }catch(e){failed++;save(`${id}--pipeline-error.json`,{message:e.message});console.log(JSON.stringify({id,error:e.message}));}}}));
 if(failed)process.exitCode=1;
}
function report(){
 const manifest=read(`${root}/manifest.json`);for(const f of manifest.sourceFiles)assert.equal(hash(f.path),f.sha256);
 const inputs=read(`${root}/inputs.json`),results=inputs.map(x=>read(`${root}/${x.paragraphId}--final.json`));
 for(const r of results)validateAudit(r,{paragraphId:r.paragraphId,axes:r.afterAudit,deletedAxes:r.deletedAxes});
 const calls=readdirSync(root).filter(n=>n.endsWith('-response.json'));for(const name of calls){const prefix=name.slice(0,-'-response.json'.length);const request=read(`${root}/${prefix}-request.json`),wire=read(`${root}/${prefix}-wire.json`);assert.deepEqual(JSON.parse(wire.body),request);assert.equal(read(`${root}/${name}`).status,'completed');}
 const responses=calls.map(n=>read(`${root}/${n}`));
 const sum=(xs,f)=>xs.reduce((n,x)=>n+f(x),0);
 const byPassage=[...new Set(items.map(i=>i.passageId))].map(id=>{const rs=results.filter(r=>r.passageId===id);return {passageId:id,title:items.find(i=>i.passageId===id).passageTitle,before:sum(rs,r=>r.before.length),afterMerge:sum(rs,r=>r.afterMerge.length),afterAudit:sum(rs,r=>r.afterAudit.length),deleted:sum(rs,r=>r.deletedAxes.length)};});
 const summary={paragraphs:results.length,before:sum(results,r=>r.before.length),afterMerge:sum(results,r=>r.afterMerge.length),afterAudit:sum(results,r=>r.afterAudit.length),automaticallyMergedParagraphs:results.filter(r=>r.detected.groups.length).length,existingCandidateParagraphs:results.filter(r=>r.method==='existing-boundary-match').length,generatedMergeParagraphs:results.filter(r=>r.method==='generated-merged-l1').length,auditMergedGroups:sum(results,r=>r.afterAudit.filter(a=>a.action==='merge').length),auditMergedAxesReduction:sum(results,r=>sum(r.afterAudit,a=>a.fromAxisIds.length-1)),auditDeletedAxes:sum(results,r=>r.deletedAxes.length),auditRewrittenAxes:sum(results,r=>r.afterAudit.filter(a=>a.action==='rewrite').length),auditKeptAxes:sum(results,r=>r.afterAudit.filter(a=>a.action==='keep').length),changedByAuditParagraphs:results.filter(r=>r.deletedAxes.length||r.afterAudit.some(a=>a.action!=='keep')).length,openaiCalls:calls.length,usage:{input:sum(responses,r=>r.usage.input_tokens),output:sum(responses,r=>r.usage.output_tokens)},byPassage,originalSourcesAndAssetsUnchanged:true,productionEligible:false};
 save('summary.json',summary);save('experimental-gold.json',{productionEligible:false,paragraphs:results.map(r=>({paragraphId:r.paragraphId,axes:r.afterAudit.map(a=>({id:a.id,description:a.description,metaAxis:a.metaAxis}))}))});
 save('validation.json',{paragraphs:results.length,requestWireMatches:calls.length,originalHashesChecked:manifest.sourceFiles.length,allInputAxesAccounted:true,noSplitOrAddedAxis:true,sourceCoverageAfterAutomaticMerge:true,productionAssetsUnchanged:true});
 let md='# 자동 병합 → L1·L2 재생성 → 전체 축 감사\n\n';
 md+='기존 JEV 선택과 최초 L2·중복 의심 결과를 재사용했다. 의심 그룹은 재확인 없이 병합하고, 기존 후보 경계가 일치하면 선택하며 없으면 병합 L1을 생성했다. 바뀐 L1의 L2만 재생성했다. 전체 25문단을 각 1회 감사하여 추가 병합·삭제·문구 수정을 직접 반영했다. 기존 비교 보고서·사람 의견·기존 골드는 감사기 입력에서 제외했다.\n\n';
 md+='| 지문 | 병합 전 | 자동 병합 후 | 감사 후 |\n|---|---:|---:|---:|\n';for(const r of byPassage)md+=`| ${r.title} | ${r.before} | ${r.afterMerge} | ${r.afterAudit} |\n`;md+=`| **합계** | **${summary.before}** | **${summary.afterMerge}** | **${summary.afterAudit}** |\n\n`;
 md+=`추가 병합 ${summary.auditMergedGroups}그룹(축 ${summary.auditMergedAxesReduction}개 감소), 독립 축 삭제 ${summary.auditDeletedAxes}개, 단일 축 문구 수정 ${summary.auditRewrittenAxes}개. API ${calls.length}회, 입력 ${summary.usage.input}·출력 ${summary.usage.output}토큰. JEV 추가 호출 0. 축 수 감소와 감사기의 설명만으로 의미 품질 향상이나 학생 FA 감소를 확정하지 않는다.\n\n`;
 const printAxes=axes=>axes.map(a=>`- **${a.id} L1:** ${a.description}\n  - **L2:** ${a.metaAxis}\n`).join('');
 for(const r of results){const item=items.find(i=>i.id===r.paragraphId);md+=`## ${item.title}\n\n**원문**\n\n${item.paragraphText}\n\n### 병합 전 (${r.before.length}축)\n\n${printAxes(r.before)}\n### 자동 병합 후 (${r.afterMerge.length}축)\n\n`;
  md+=r.detected.groups.map(g=>`- 의심 그룹 ${g.ids.join('+')}: ${g.reason}\n`).join('')||'의심 그룹 없음.\n';md+=`\n방법: ${r.method}; 후보: ${r.candidateId??'새 병합 L1'}.\n\n${printAxes(r.afterMerge)}\n### 감사 후 (${r.afterAudit.length}축)\n\n${printAxes(r.afterAudit)}\n**감사기의 변경 이유**\n\n`;
  for(const a of r.afterAudit)md+=`- ${a.action} ${a.fromAxisIds.join('+')} → ${a.id}: ${a.reason}\n`;for(const a of r.deletedAxes)md+=`- delete ${a.id}: ${a.reason}\n`;md+=`\n${r.paragraphReview}\n\n`;
 }
 writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary));
}
const phase=process.argv[2];if(phase==='prepare')prepare();else if(phase==='run')await run();else if(phase==='report')report();else throw new Error('prepare | run | report');
