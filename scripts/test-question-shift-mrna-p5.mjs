import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
const root='docs/experiments/question-shift-mrna-p5-2026-10-02';
const save=(name,data)=>writeFileSync(`${root}/${name}`,JSON.stringify(data,null,2)+'\n');
process.loadEnvFile('.env');
assert.ok(process.env.OPENAI_API_KEY,'API key unavailable');
if(process.argv.includes('--retry-dns-failure')){const e=JSON.parse(readFileSync(`${root}/error.json`,'utf8'));assert.equal(e.message,'Connection error.');assert.ok(!existsSync(`${root}/response.json`));mkdirSync(`${root}/failed-network-attempt`);for(const name of ['started.json','wire.json','error.json'])if(existsSync(`${root}/${name}`))renameSync(`${root}/${name}`,`${root}/failed-network-attempt/${name}`);}
assert.ok(!existsSync(`${root}/started.json`),'Already started; no automatic rerun');
const source='packages/pipeline/fixtures/experiments/dialogue/gold-v2/mrna-vaccine-lipid-nanoparticle-p5.json';
const gold=JSON.parse(readFileSync(source,'utf8'));
const input={paragraphId:gold.paragraphId,paragraphText:gold.paragraphText};
const instructions='문단 원문을 읽고 설명하는 중심 질문이 바뀌는 지점을 기준으로 연속된 의미 덩어리로 나누세요. 각 덩어리에 중심 질문 하나와 그 질문에 답하는 핵심 내용을 한 문장으로 표현한 축 하나를 작성하세요. 축 문장에는 필요한 원인·결과·조건·대응 방향을 보존하세요. 단순한 접속어나 문장 개수가 아니라 실제 설명의 초점 전환으로 경계를 정하세요. 덩어리 수에 목표를 두지 마세요. 같은 전체 과정에 속한다는 이유만으로 서로 다른 중심 질문을 합치지 마세요. 외부 지식이나 원문에 없는 내용을 추가하지 마세요. 각 덩어리의 sourceText는 원문 그대로의 연속 구간이어야 하고, 순서대로 합쳤을 때 원문 전체를 복원해야 합니다. 각주는 관련된 마지막 덩어리에 포함하세요. 긴 추론은 출력하지 마세요.';
const schema=z.object({paragraphId:z.string(),chunks:z.array(z.object({id:z.string(),sourceText:z.string(),centralQuestion:z.string(),axis:z.string()})).min(1)});
const request={model:'gpt-5.6-terra',reasoning:{effort:'medium'},service_tier:'default',store:false,max_output_tokens:5000,instructions,input:JSON.stringify(input),text:{format:zodTextFormat(schema,'question_shift_axes')}};
save('request.json',request);save('input.json',input);save('started.json',{at:new Date().toISOString(),maxCalls:1,maxRetries:0,source});
const client=new OpenAI({maxRetries:0,timeout:90000,fetch:async(url,options)=>{assert.deepEqual(JSON.parse(options.body),request);save('wire.json',{body:options.body});return globalThis.fetch(url,options);}});
try{
 const response=await client.responses.create(request);save('response.json',response);assert.equal(response.status,'completed');const result=schema.parse(JSON.parse(response.output_text));save('result.json',result);
 const normalize=s=>s.replace(/\s+/gu,'');const coverage=normalize(result.chunks.map(c=>c.sourceText).join(''))===normalize(input.paragraphText);save('audit.json',{coverageIgnoringWhitespace:coverage,paragraphIdMatches:result.paragraphId===input.paragraphId,chunks:result.chunks.length,usage:response.usage});
 let md='# mRNA 5문단 중심 질문 전환 테스트\n\n실제 API 1회, gpt-5.6-terra / medium. 원문만 입력. 기존 축·예시·목표 개수 미제공.\n\n';
 for(const c of result.chunks)md+=`## ${c.id}\n\n**중심 질문:** ${c.centralQuestion}\n\n**실제 생성 축:** ${c.axis}\n\n**원문 구간:**\n\n${c.sourceText}\n\n`;
 md+=`원문 범위 복원 검사(공백 제외): ${coverage?'통과':'실패'}. 단일 생성 결과로 반복 안정성·학생 판정 효과는 검증하지 않았습니다.\n`;
 writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify({result,coverage,usage:response.usage}));
}catch(e){save('error.json',{name:e.name,status:e.status??null,message:e.message});throw e;}
