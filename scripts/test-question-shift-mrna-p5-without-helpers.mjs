import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
const baseline='docs/experiments/question-shift-mrna-p5-2026-10-02';
const root='docs/experiments/question-shift-mrna-p5-no-helpers-2026-10-02';
mkdirSync(root,{recursive:true});process.loadEnvFile('.env');
const save=(name,data)=>writeFileSync(`${root}/${name}`,JSON.stringify(data,null,2)+'\n');
assert.ok(!existsSync(`${root}/started.json`),'Already started');
const original=JSON.parse(readFileSync(`${baseline}/request.json`,'utf8'));
const removed=['단순한 접속어나 문장 개수가 아니라 실제 설명의 초점 전환으로 경계를 정하세요.','같은 전체 과정에 속한다는 이유만으로 서로 다른 중심 질문을 합치지 마세요.'];
const request={...original};for(const sentence of removed){assert.ok(request.instructions.includes(sentence));request.instructions=request.instructions.replace(sentence+' ','');}
const {instructions:a,...restA}=original,{instructions:b,...restB}=request;assert.deepEqual(restA,restB);
save('request.json',request);save('change.json',{removed,otherRequestFieldsIdentical:true});save('started.json',{at:new Date().toISOString(),calls:1,maxRetries:0});
const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),request);save('wire.json',{body:options.body});return globalThis.fetch(url,options);}});
try{const response=await client.responses.create(request);save('response.json',response);assert.equal(response.status,'completed');const result=JSON.parse(response.output_text);save('result.json',result);const input=JSON.parse(request.input);const norm=s=>s.replace(/\s+/gu,'');const coverage=norm(result.chunks.map(c=>c.sourceText).join(''))===norm(input.paragraphText);save('audit.json',{coverageIgnoringWhitespace:coverage,usage:response.usage,chunks:result.chunks.length});
let md='# mRNA 5문단 — 두 보조 지시 삭제 재실행\n\n기존 요청에서 아래 두 문장만 삭제했습니다. 입력·모델·추론 설정·출력 스키마는 동일합니다. 실제 API 성공 응답 1회입니다.\n\n'+removed.map(x=>'- '+x).join('\n')+'\n\n## 실제 프롬프트\n\n'+request.instructions+'\n\n## 실제 생성 결과\n\n';for(const c of result.chunks)md+=`### ${c.id}\n\n**중심 질문:** ${c.centralQuestion}\n\n**축:** ${c.axis}\n\n**원문 구간:**\n\n${c.sourceText}\n\n`;md+=`원문 범위 복원(공백 제외): ${coverage?'통과':'실패'}. 단회 비교이므로 보조 지시 삭제의 인과 효과나 반복 안정성을 확정하지 않습니다.\n`;writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify({result,coverage,usage:response.usage}));}catch(e){save('error.json',{message:e.message,status:e.status??null});throw e;}
