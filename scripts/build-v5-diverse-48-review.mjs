import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { cases, specs } from './v5-diverse-48-cases.mjs';
import { DIR } from './run-v5-diverse-48.mjs';
import { explanationChecks } from './test-v5-live-connection.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const states=cases.map(c=>read(`${DIR}/cases/${c.id}.json`));
const reviews=existsSync(`${DIR}/SEMANTIC-REVIEW.json`)?read(`${DIR}/SEMANTIC-REVIEW.json`):{};
const json=x=>'```json\n'+JSON.stringify(x,null,2)+'\n```\n';
const links=s=>`[원자료 JSON](cases/${s.case.id}.json) · [세션 원장](cases/${s.case.id}.records.jsonl)`;
const label=s=>s.view?.result?.outcome??s.view?.phase??'NOT_STARTED';
const summarizeRepair=s=>s.inspection?.assessments.filter(a=>a.mode==='REPAIR').map(a=>({repairs:a.repairs,rationaleSufficient:a.raw.rationaleSufficient,verificationComplete:a.raw.verificationComplete,reason:a.reason}))??[];
let transcripts='# v5 48세션 실제 대화 전체 기록\n\n모든 학생 답변은 Codex가 구성한 가상 응답이다. 피드백은 실제 운영 평가기에서 생성되며, 연결 오류·재시도도 보존했다. 사례 행동 의도와 실제 결과를 구분한다.\n\n';
let overview='# v5 48세션 결과 찾아보기\n\n[전체 대화](TRANSCRIPTS.md) · [최초 입력](INPUT-PREVIEW.md) · [실행 계획](PLAN.md) · [의미 검토](SEMANTIC-REVIEW.json)\n\n';
const sources=read(`${DIR}/sources.json`);
const checks=[];
for(const spec of specs){
  const src=sources[spec.questionId], group=states.filter(s=>s.case.questionId===spec.questionId);
  let detail=`# ${src.title} ${src.questionNumber}번 — 8개 세션\n\n발문: ${src.stem}\n\n정답: ${src.choices.find(c=>c.choiceId===src.answerChoiceId).position}번\n\n`;
  overview+=`## ${src.title}\n\n[문항별 전체 기록](by-question/${spec.key}.md)\n\n| 사례 | 선택 | 구성 의도 | 실제 결과 | 질문 수 | 검토 |\n|---|---|---|---|---|---|\n`;
  for(const s of group){
    const c=s.case, review=reviews[c.id];
    overview+=`| ${c.id} | ${c.choiceId.slice(1)} | ${c.intent} | ${label(s)} | ${s.view?.questionsAsked??0} | ${review?.verdict??'미검토'} |\n`;
    let section=`## ${c.id} — ${c.choiceId.slice(1)}번 선택\n\n구성 의도: ${c.intent}\n\n실제 상태: **${label(s)}**\n\n${links(s)}\n\n`;
    if(review)section+=`의미 검토: **${review.verdict}** — ${review.note}\n\n`;
    if(s.view?.result)section+='결과:\n\n'+json(s.view.result)+'\n';
    section+='### 실제 대화\n\n';
    for(const t of s.view?.transcript??[])section+=`**${t.role==='STUDENT'?'학생':'피드백'}** (${t.phase})\n\n${t.text}\n\n`;
    section+='### 판정 기록\n\n';
    for(const a of s.inspection?.assessments??[]){
      section+=`**${a.mode}** — ${a.contentAssessment??''} / ${a.verdict??''}\n\n${a.reason}\n\n`;
      if(a.reconstructedPath.length)section+='학생 판단 재구성:\n\n'+a.reconstructedPath.map(x=>'- '+x).join('\n')+'\n\n';
      if(a.mode==='REPAIR')section+=json({repairs:a.repairs,verificationComplete:a.raw.verificationComplete,rationaleSufficient:a.raw.rationaleSufficient,newErrors:a.raw.newErrors})+'\n';
    }
    section+='### 제출·재시도 이력\n\n';
    for(const step of s.steps){
      section+=`- ${step.transitionId}: ${step.command.type} → ${step.view.phase}, ${Math.round(step.durationMs??0)}ms${step.authoredNote?' — '+step.authoredNote:''}\n`;
      for(const e of step.evaluations)section+=`  - ${e.kind}: ${e.status}, ${e.call?.metadata.model??'없음'}${e.error?' — '+e.error:''}\n`;
    }
    section+='\n';
    detail+=section;transcripts+=section;
    let choice=c.choiceId;
    const modelIssues=[];
    for(const step of s.steps){
      if(step.command.type==='SELECT')choice=step.command.choiceId;
      for(const e of step.evaluations){
        const expected=e.kind==='REPAIR'?'gpt-6-luna':choice===src.answerChoiceId?'gpt-6-luna':'gpt-6.1-sol';
        if(e.call?.metadata.model!==expected)modelIssues.push({transitionId:step.transitionId,kind:e.kind,expected,actual:e.call?.metadata.model});
      }
    }
    const endRecord=s.steps.flatMap(step=>step.evaluations).filter(e=>e.kind==='END_EXPLANATION'&&e.status==='SUCCESS').at(-1);
    const publicPrivateKey=JSON.stringify(s.view??{}).includes('officialExplanation');
    checks.push({id:c.id,modelIssues,publicPrivateKey,staticExplanation:endRecord?explanationChecks(endRecord.call.rawOutput.coaching):null,
      repair:summarizeRepair(s),terminal:['COMPLETED','ITEM_REVIEW'].includes(s.view?.phase),result:s.view?.result??null});
  }
  mkdirSync(`${DIR}/by-question`,{recursive:true});writeFileSync(`${DIR}/by-question/${spec.key}.md`,detail);
}
writeFileSync(`${DIR}/TRANSCRIPTS.md`,transcripts);writeFileSync(`${DIR}/REVIEW-INDEX.md`,overview);writeFileSync(`${DIR}/AUTOMATIC-CHECKS.json`,JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify({cases:states.length,terminal:checks.filter(c=>c.terminal).length,modelIssues:checks.flatMap(c=>c.modelIssues).length,privateKeyLeaks:checks.filter(c=>c.publicPrivateKey).length}));
