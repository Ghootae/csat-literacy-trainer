import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29';
const cases=JSON.parse(readFileSync(`${root}/cases.json`,'utf8'));
const rows=readFileSync(`${root}/results.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
assert.equal(rows.length,48);
const txt=['# 원문·축·응답·48회 판정 검토 패킷','','자동 전사 자료다. 해석과 운영 적용 여부는 REPORT.md를 따른다. 기대값은 사전 가설이며 독립 사람 정답이 아니다.',''];
const golds=[...new Map(cases.map(c=>[c.input.gold.paragraphId,c.input.gold])).values()];
for(const gold of golds){
  txt.push(`## ${gold.paragraphId} 원문`,'',gold.paragraphText,'','### 중심축','');
  for(const a of gold.centralAxes)txt.push(`- ${a.id}: ${a.description}`);
  txt.push('');
  for(const c of cases.filter(c=>c.input.gold.paragraphId===gold.paragraphId)){
    txt.push(`### ${c.id} — ${c.kind==='actual'?'실제 최초 응답':'합성 대조'}`,'',`사전 기대: ${Object.entries(c.expected).map(([k,v])=>`${k} ${v.join(' 또는 ')}`).join('; ')}`,'',`> ${c.response}`,'');
    for(const arm of ['baseline','candidate']){
      txt.push(`#### ${arm==='baseline'?'기존 V4':'구체적 의미 후보'}`,'');
      for(const r of rows.filter(r=>r.caseId===c.id&&r.arm===arm).sort((a,b)=>a.repeat-b.repeat)){
        txt.push(`**${r.repeat}회 (${r.id})**`,'');
        if(r.apiError||r.contractError)txt.push(`실패: ${JSON.stringify({apiError:r.apiError,contractError:r.contractError})}`,'');
        const result=r.validated??r.raw;
        for(const a of result?.axisFeedback??[])txt.push(`- ${a.axisId} **${a.status}** — ${a.reason}`);
        txt.push('',`누락 근거: ${JSON.stringify(result?.missingAxisEvidence??[])}`,'',`질문 의도: ${result?.questionIntent??'없음'}`,'',`합성 응답: ${result?.effectiveResponse??'없음'}`,'',`정규화: ${JSON.stringify(r.normalizationEvents)}`,'');
      }
    }
  }
}
writeFileSync(`${root}/REVIEW-PACKET.md`,txt.join('\n'));
console.log('Wrote complete 48-call review packet.');
