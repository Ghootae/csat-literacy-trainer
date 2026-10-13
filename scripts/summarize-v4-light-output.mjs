import { readFileSync, writeFileSync } from 'node:fs';

const ROOT='docs/experiments/v4-light-output-v1-2026-09-22';
const OLD='docs/experiments/natural-response-disagreement-v1-2026-09-21';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const rows=p=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const cases=read(`${ROOT}/cases.json`),sources=read(`${ROOT}/sources.json`),summary=read(`${ROOT}/summary.json`);
const results=rows(`${ROOT}/results.jsonl`),oldResults=rows(`${OLD}/results.jsonl`);
const quote=t=>t.split('\n').map(x=>`> ${x}`).join('\n');
const percent=(a,b)=>((1-b/a)*100).toFixed(1);
const ratio=(a,b)=>(a/b).toFixed(2);
const transition={};
for(const c of summary.comparisons)for(const x of c.comparison.changes??[]){const k=`${x.v4} → ${x.light}`;transition[k]=(transition[k]??0)+1;}

let priorV4Points=0,priorV4Axes=0,priorV4Questions=0;
for(const now of results.filter(x=>x.arm==='v4')){
  const old=oldResults.find(x=>x.arm==='v4'&&x.caseId===now.caseId);
  const dif=(now.axes??[]).filter(x=>old.rawAxes.find(y=>y.axisId===x.axisId)?.status!==x.status);
  if(dif.length){priorV4Points++;priorV4Axes+=dif.length;}
  const q=a=>a.some(x=>['UNCLEAR_SERIOUS','ERROR'].includes(x.status));
  if(q(now.axes??[])!==q(old.rawAxes??[]))priorV4Questions++;
}

const v=summary.arms.v4,l=summary.arms.light;
let report=`# V4-light 최소 출력 대조 결과\n\n`+
`## 결론\n\n`+
`V4-light는 현재 V4보다 **API 시간 중앙값 ${percent(v.medianApiMs,l.medianApiMs)}% 감소**, **추정 비용 ${percent(v.estimatedUsd,l.estimatedUsd)}% 감소**를 보였다. 그러나45시점 중15시점(16축)의 상태가 달랐고, V4가 질문하지 않던5시점을 새 질문 후보로 바꿨다. 반대 방향은0건이었다. 따라서 사전에 정한 품질 보존 조건을 통과하지 못했으며, 2단계 전체 흐름 유료 시험과 운영 승격은 진행하지 않는다.\n\n`+
`이번 결과는 “기록 출력을 줄이면 빨라진다”는 성능 가설을 지지하지만, “V4의 판정 품질을 그대로 유지한다”는 가설은 지지하지 않는다. V4-light는 V4의 중간지대인 UNCLEAR_OK를 PASS 또는 SERIOUS로 양극화하는 direct-v1 계열의 성격을 다시 보였다.\n\n`+
`## 실행 범위\n\n`+
`- 출처 검증된 실제 사용자 응답45시점(최초31, 후속14)\n- 현재 V4와 V4-light 각45호출, 쌍 병렬·순서 교대\n- gpt-5.6-terra / medium / default / store:false\n- 질문 생성0, 재시도0, 운영 변경0\n- 총90호출, 추정 비용 **$${summary.knownEstimatedUsd.toFixed(6)}** / 승인 상한 $2\n\n`+
`## 성능과 계약\n\n| 항목 | 현재 V4 | V4-light | 변화 |\n|---|---:|---:|---:|\n`+
`| 호출 | ${v.calls} | ${l.calls} | 동일 |\n| 계약 유효 | ${v.valid}/${v.calls} | ${l.valid}/${l.calls} | light +${l.valid-v.valid} |\n`+
`| API 시간 중앙값 | ${(v.medianApiMs/1000).toFixed(3)}초 | ${(l.medianApiMs/1000).toFixed(3)}초 | ${percent(v.medianApiMs,l.medianApiMs)}% 감소 (${ratio(v.medianApiMs,l.medianApiMs)}배) |\n`+
`| 입력 토큰 합계 | ${v.inputTokens.toLocaleString()} | ${l.inputTokens.toLocaleString()} | ${percent(v.inputTokens,l.inputTokens)}% 감소 |\n`+
`| 출력 토큰 합계 | ${v.outputTokens.toLocaleString()} | ${l.outputTokens.toLocaleString()} | ${percent(v.outputTokens,l.outputTokens)}% 감소 |\n`+
`| 추정 비용 | $${v.estimatedUsd.toFixed(6)} | $${l.estimatedUsd.toFixed(6)} | ${percent(v.estimatedUsd,l.estimatedUsd)}% 감소 (${ratio(v.estimatedUsd,l.estimatedUsd)}배) |\n`+
`| 모든 축 PASS | ${v.allPass} | ${l.allPass} | +${l.allPass-v.allPass} |\n| 질문 후보 | ${v.questionCandidate} | ${l.questionCandidate} | +${l.questionCandidate-v.questionCandidate} |\n\n`+
`현재 V4의 계약 실패2건(N03, N04)은 모두 claimLedger가 학생 답변이 아닌 질문을 근거로 인용한 경우다. raw 축 판정은 보존되어 비교에는 사용했지만 운영 최종 판정으로는 사용할 수 없다. V4-light는 해당 기록 필드가 없어45/45 계약 유효였다. 운영 V4는 계약 실패 시 재시도하므로 이 실험의 V4 시간·비용은 실제 재시도 비용을 포함하지 않는다.\n\n`+
`## 판정 보존\n\n`+
`- 시점 전체 상태 일치: **${summary.same}/45**\n- 불일치: **${summary.disagreements}/45**, 16축\n- 문단 질문 후보 변화: **${summary.interventionChanges}/45**\n- V4 비질문 → light 질문: ${summary.v4NoQuestionToLightQuestion.join(', ')}\n- V4 질문 → light 비질문: 없음\n\n`+
`축 상태 전이는 ${Object.entries(transition).map(([k,n])=>`\`${k}\` ${n}축`).join(', ')}이었다. 즉 light는 OK를 거의 그대로 보존하기보다 한쪽은 PASS, 다른 쪽은 SERIOUS로 결정했다. 사용자는 불일치15건의 검토 문서를 직접 읽고 각 사례에서 V4의 표시 결과를 승인했다. 따라서 이 표본에서는 light의15개 시점 차이를 사람 승인 기준 이탈로, V4 비질문→light 질문5건을 과개입으로 기록한다. 승인은 검토 문서에 표시된 합성 응답·축 상태와 이유·질문 후보에 한정하며 숨은 claimLedger/errorClaims나 계약 유효성을 승인한 것은 아니다.\n\n`+
`같은 V4도 전날 실행과 이번 실행 사이에10시점·11축의 PASS/OK 또는 오류 축 귀속 차이가 있었지만, 질문 후보 여부 차이는0건이었다. 경계 라벨의 실행 변동과 학생 개입 여부의 안정성을 구분해야 한다.\n\n`+
`## 합성 응답\n\n`+
`V4-light는45/45에서 effectiveResponse를 반환했다. 다만 N31과 N36에서는 학생이 말하지 않은 미확인 정답 내용을 “설명하지 않았다”는 형태로 합성 응답에 포함했다. 현재 UI가 effectiveResponse를 학생에게 보여 주므로, 합성 응답은 평가자의 누락 설명이 아니라 학생이 실제로 유지하는 의미만 담는 계약이 별도로 필요하다. 현재 V4도 다른2시점에서 유사한 누락 설명을 포함했으므로 이는 light만의 확정 결함이라기보다 두 후보가 공유하는 잔여 위험이다.\n\n`+
`## 해석\n\n`+
`이번 후보는 출력 JSON만 줄인 순수한 실험이 아니다. 기록 필드의 생성 지시와 구조화 출력 스키마를 함께 제거했기 때문에 입력 토큰도69.6% 줄었다. 따라서 속도 향상을 출력 토큰 감소 하나의 인과 효과로 분해할 수 없다. 확인된 것은 **상세 기록 작업 묶음을 제거하면 훨씬 싸고 빨라지지만, 현재 V4의 개입 경계도 함께 변한다**는 것이다.\n\n`+
`사전 계획의 2단계 진입 조건을 충족하지 못했으므로 오류·철회·부분 수정·새 질문의 유료 전체 흐름은 실행하지 않았다. 운영 V4, UI, 공개 서버는 변경하지 않았다.\n\n`+
`## 다음 판단\n\n`+
`현재 결과만으로 claimLedger·오류 인용 등 모든 기록을 운영에서 제거하는 것은 권하지 않는다. 성능 최적화를 계속한다면 다음 후보는 판정 지시를 다시 쓰지 않고, V4의 개입 경계를 만드는 규칙을 그대로 둔 채 중앙 대상·중심 이야기·정보량·긴 요약처럼 후속 동작에 쓰이지 않는 필드부터 좁게 제거하는 방식이어야 한다. 그것도 새 승인과 동결된 기대 없이 자동 승격하지 않는다.\n\n`+
`전체15개 불일치의 원문·응답·합성 응답·판정은 [REVIEW-PACKET.md](./REVIEW-PACKET.md), 원요청·응답은 JSONL, 실행 무결성은 [execution-audit.json](./execution-audit.json)에 보존했다.\n`;

const diffs=summary.comparisons.filter(x=>!x.comparison.same);
let review='# V4 ↔ V4-light 불일치 15시점 검토 자료\n\n모델 설명은 정답표가 아니다. 원문과 실제 학생 발화를 먼저 보고, 추가 질문이 필요한지를 판단한 뒤 두 판정을 비교한다.\n\n';
for(const [i,d] of diffs.entries()){
  const c=cases.find(x=>x.id===d.caseId),s=sources[c.paragraphId];
  const vr=results.find(x=>x.id===`${c.id}-v4`),lr=results.find(x=>x.id===`${c.id}-light`);
  review+=`## ${i+1}. ${c.id} — ${s.title} / ${c.paragraphId} / ${c.stratum}\n\n### 원문\n\n${quote(s.gold.paragraphText)}\n\n### 중심축\n\n`;
  for(const a of s.gold.centralAxes)review+=`- ${a.id}: ${a.description}\n`;
  review+=`\n### 실제 대화\n\n학생 최초 응답\n\n${quote(c.initialResponse)}\n\n`;
  for(const [j,h] of c.history.entries())review+=`질문 ${j+1}\n\n${quote(h.question.text)}\n\n학생 답변 ${j+1}\n\n${quote(h.answer)}\n\n`;
  for(const [label,r] of [['현재 V4',vr],['V4-light',lr]]){
    review+=`### ${label}\n\n계약: ${r.contractError??'유효'}\n\neffectiveResponse\n\n${quote(r.raw?.effectiveResponse??'없음')}\n\n`;
    for(const a of r.axes??[])review+=`- **${a.axisId} ${a.status}** — ${a.reason}\n`;
    review+='\n';
  }
  review+=`질문 후보: V4 ${d.comparison.v4NeedsQuestion?'있음':'없음'} / light ${d.comparison.lightNeedsQuestion?'있음':'없음'}\n\n---\n\n`;
}
writeFileSync(`${ROOT}/REPORT.md`,report);
writeFileSync(`${ROOT}/REVIEW-PACKET.md`,review);
console.log(JSON.stringify({report:true,reviewCases:diffs.length,priorV4Points,priorV4Axes,priorV4Questions,transition},null,2));
