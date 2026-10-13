import { readFileSync, writeFileSync } from 'node:fs';

const root='docs/experiments/v4-light-output-v1-2026-09-22';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const rows=p=>readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const summary=read(`${root}/summary.json`),cases=read(`${root}/cases.json`),sources=read(`${root}/sources.json`),results=rows(`${root}/results.jsonl`);
const disagreements=summary.comparisons.filter(x=>x.comparison.comparable&&!x.comparison.same);
if(disagreements.length!==15)throw new Error(`Expected 15 disagreements, got ${disagreements.length}`);
const needsQuestion=axes=>axes.some(x=>['UNCLEAR_SERIOUS','ERROR'].includes(x.status));
const records=disagreements.map((d,index)=>{
  const c=cases.find(x=>x.id===d.caseId),v4=results.find(x=>x.id===`${d.caseId}-v4`);
  if(!c||!v4||!v4.axes)throw new Error(`Missing V4 source for ${d.caseId}`);
  return {
    reviewOrder:index+1,
    caseId:d.caseId,
    paragraphId:c.paragraphId,
    title:sources[c.paragraphId].title,
    responseStage:c.stratum,
    approvedArm:'v4',
    approvedEffectiveResponse:v4.raw?.effectiveResponse??null,
    approvedAxes:v4.axes.map(({axisId,status,reason})=>({axisId,status,reason})),
    approvedQuestionCandidate:needsQuestion(v4.axes),
    sourceContractValid:v4.contractError===null,
    sourceContractError:v4.contractError,
  };
});
const artifact={
  version:'v4-light-human-adjudication-v1',
  decidedAt:'2026-09-22',
  reviewer:'project-user',
  sourceReviewPacket:'docs/experiments/v4-light-output-v1-2026-09-22/REVIEW-PACKET.md',
  decision:'The project user reviewed all 15 disagreement cases and approved the V4 visible response for each case.',
  rationale:'A written summary is a further filtered expression of an already compressed understanding, so omission in the written answer should not automatically trigger intervention.',
  scope:'Approval covers the V4 effectiveResponse and axis status/reason/question-candidate behavior displayed in the review packet. It does not validate hidden claimLedger/errorClaims or waive contract failures.',
  cases:records,
};
writeFileSync(`${root}/HUMAN-ADJUDICATION.json`,JSON.stringify(artifact,null,2)+'\n');
let md=`# V4-light 불일치 15건 사람 판정\n\n`+
`사용자는 [REVIEW-PACKET.md](./REVIEW-PACKET.md)의 불일치15건을 직접 검토하고, **각 사례에서 V4의 표시 결과를 승인**했다.\n\n`+
`근거는 학생이 문단을 성공적으로 압축해 이해했더라도 실제 작성 요약은 표현 비용 때문에 한 번 더 필터링될 수 있다는 것이다. 따라서 작성 응답의 표면 누락을 곧바로 중요한 이해 공백으로 해석해 질문하지 않는 V4의 완충 정책을 이15건의 사람 기준으로 사용한다.\n\n`+
`승인 범위는 검토 문서에 표시된 V4의 effectiveResponse, 축별 상태·이유, 그 상태에서 계산되는 질문 후보 여부다. 숨은 claimLedger/errorClaims의 정확성이나 계약 유효성을 승인한 것은 아니다. N03은 표시 판정은 승인됐지만 claimLedger 인용 계약 실패가 별도로 남는다.\n\n`+
`| 순서 | 사례 | 문단 | 단계 | 승인 축 상태 | 질문 후보 | 계약 |\n|---:|---|---|---|---|---|---|\n`;
for(const r of records)md+=`| ${r.reviewOrder} | ${r.caseId} | ${r.paragraphId} | ${r.responseStage} | ${r.approvedAxes.map(x=>`${x.axisId}=${x.status}`).join(', ')} | ${r.approvedQuestionCandidate?'있음':'없음'} | ${r.sourceContractValid?'유효':'표시 판정만 승인·숨은 계약 실패'} |\n`;
md+=`\n기계 판독 가능한 축별 이유와 합성 응답은 [HUMAN-ADJUDICATION.json](./HUMAN-ADJUDICATION.json)에 그대로 보존했다.\n`;
writeFileSync(`${root}/HUMAN-ADJUDICATION.md`,md);
console.log(JSON.stringify({cases:records.length,questionCandidates:records.filter(x=>x.approvedQuestionCandidate).length,contractInvalid:records.filter(x=>!x.sourceContractValid).map(x=>x.caseId)},null,2));
