import {readFileSync,writeFileSync} from 'node:fs';
const root='docs/experiments/dual-routing-sensitive-six-2026-09-30';
const read=n=>JSON.parse(readFileSync(`${root}/${n}`,'utf8'));
const lines=n=>readFileSync(`${root}/${n}`,'utf8').trim().split('\n').map(JSON.parse);
const {pairs,stats,routeCounts}=read('summary.json'),cases=read('cases.json'),golds=read('frozen-golds.json'),rows=lines('evaluation-results.jsonl');
const count=(arr,key)=>Object.fromEntries([...new Set(arr.map(key))].map(k=>[k,arr.filter(x=>key(x)===k).length]));
const order={SILENT_PASS:0,OPTIONAL_REPAIR:1,ASK:2,ERROR_QUESTION:3,EVALUATION_ERROR:4};
const paragraphRoute=p=>p.axes.reduce((v,a)=>order[a.route]>order[v]?a.route:v,'SILENT_PASS');
const validPairs=pairs.filter(p=>p.valid);
const marginal=validPairs.flatMap(p=>p.axes.filter(a=>a.route!==a.l1Only).map(a=>({caseId:p.caseId,repeat:p.repeat,...a})));
const byKind=Object.fromEntries(['sufficient','concrete','functional','missing','error'].map(kind=>{
  const pp=pairs.filter(p=>p.kind===kind),ll=rows.filter(r=>r.level==='level1'&&cases.find(c=>c.id===r.caseId).kind===kind),lvalid=ll.filter(r=>r.validated);
  return [kind,{pairs:pp.length,validPairs:pp.filter(p=>p.valid).length,paragraphRoutes:count(pp,paragraphRoute),l1Calls:ll.length,l1Valid:lvalid.length,l1AllPassOrOk:lvalid.filter(r=>r.validated.axisFeedback.every(a=>['PASS','UNCLEAR_OK'].includes(a.status))).length,l1HasError:lvalid.filter(r=>r.validated.axisFeedback.some(a=>a.status==='ERROR')).length,l1HasSerious:lvalid.filter(r=>r.validated.axisFeedback.some(a=>a.status==='UNCLEAR_SERIOUS')).length}];
}));
const stability=cases.flatMap(c=>c.level2Input.metaAxes.map(a=>{
  const pp=pairs.filter(p=>p.caseId===c.id).map(p=>p.axes.find(x=>x.axisId===a.id));
  return {caseId:c.id,axisId:a.id,l1:pp.map(p=>p.level1?.status??null),l2:pp.map(p=>p.level2?.fulfilled??null),routes:pp.map(p=>p.route)};
}));
const varying=stability.filter(s=>new Set(s.l1.filter(x=>x!==null)).size>1||new Set(s.l2.filter(x=>x!==null)).size>1);
const mismatch=validPairs.flatMap(p=>p.axes.filter(a=>(a.level1.status==='ERROR'&&a.level2.fulfilled)||(['PASS','UNCLEAR_OK'].includes(a.level1.status)&&!a.level2.fulfilled)).map(a=>({caseId:p.caseId,repeat:p.repeat,axisId:a.axisId,l1:a.level1.status,l2:a.level2.fulfilled,route:a.route})));
const metrics={stats,routeCounts,validPairs:validPairs.length,totalPairs:pairs.length,paragraphRoutes:count(pairs,paragraphRoute),byKind,marginal,stability,varying,mismatch,failures:rows.filter(r=>!r.validated).map(r=>({id:r.id,apiError:r.apiError,contractError:r.contractError})),tokens:stats.reduce((v,s)=>({input:v.input+s.inputTokens,cached:v.cached+s.cachedTokens,output:v.output+s.outputTokens}),{input:0,cached:0,output:0})};
writeFileSync(`${root}/metrics.json`,JSON.stringify(metrics,null,2)+'\n');
const compressed={G1:'명실 문제는 정치·윤리 안의 논의에서 독립 철학 주제로 발전했고 공손룡과 후기 묵가가 이를 두고 논쟁했다.',G3:'색 속성을 지정하는지에 따라 말/흰 말의 지시 범위와 요구 대상이 달라지므로 두 이름의 용법을 구별해야 한다는 공손룡의 주장이다.',M2:'mRNA로 단백질과 면역 반응을 유도하되 바이러스 자체는 넣지 않는다. 불안정하고 세포 진입이 어려운 mRNA를 지질 나노 입자가 보호·전달한다.',D1:'외부 도파민은 뇌에 못 들어가므로 내부 합성분만 작용한다. 티로신→레보도파→도파민 합성 뒤 방출·수용체 결합으로 신호를 전달한다.',I2:'AI 허위 광고에 따른 정보 비대칭에 표시 의무로 대응했고, 그 대상을 정보 제공자·플랫폼까지 넓힐지 논쟁한다.',H1:'예술·종교·철학은 진리는 같고 인식 형식은 다르다. 예술의 객관성과 종교의 주관성을 철학이 종합한다.'};
const functionalOpinion={G1:'변화의 출발점은 생략했지만 철학 주제 정립과 논쟁을 표현했다. 기본 통과가 자연스럽다는 Codex 의견이다.',G3:'속성/색 예시는 없지만 지시 범위 차이→용법 구별의 취지는 있다. 기본 통과가 자연스럽다.',M2:'취지는 전달하지만 분해·세포 진입의 두 문제를 구별하지 않았다. 기본 통과를 선호하되 세부 누락은 내부에 남기는 편이 자연스럽다.',D1:'외부/내부 차이와 합성→전달 취지는 있다. 레보도파·활성화·수용체를 생략한 답의 기본 통과는 합리적 후보지만 구체적으로 모두 표현했다고 기록해서는 안 된다.',I2:'주체 이름이 빠져도 표시 의무와 대상 확대 논쟁을 연결했다. 기본 통과가 자연스럽다.',H1:'같은 내용/다른 방식과 철학의 종합은 표현했다. 기본 통과가 자연스럽지만 객관/주관 귀속까지 확인했다고 기록하지는 않는 편이 좋다.'};
const kindNames={sufficient:'충분 답 의도',concrete:'구체적 간접 표현',functional:'기능 취지 중심',missing:'핵심 연결 누락',error:'명시적 오류'};
const short={PASS:'P',UNCLEAR_OK:'OK',UNCLEAR_SERIOUS:'S',ERROR:'E',SILENT_PASS:'통과',OPTIONAL_REPAIR:'선택보완',ASK:'질문',ERROR_QUESTION:'오류질문',EVALUATION_ERROR:'계약실패'};
const esc=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const doc=['# 민감 6문단 — 응답별 결과표','','P=PASS, OK=UNCLEAR_OK, S=UNCLEAR_SERIOUS, E=ERROR. 각 값은 반복1/2/3 순서다.','L2의 O/X는 기능적 의미 충족/미충족이며 사실 정확성의 별도 보증이 아니다. —는 유효 판정 없음이다.','어느 한 레벨의 계약이 실패하면 주 비교의 해당 쌍은 제외한다. 정상 레벨의 결과는 별도로 보존한다.','모든 응답은 생성 전에 만든 합성이며, 이상적 처리와 현실적 의견은 Codex 의견이다. 사람 정답률이 아니다.',''];
for(const g of golds){const cc=cases.filter(c=>c.paragraphId===g.original.paragraphId);doc.push(`## ${g.title}`,'',`**압축 문단:** ${compressed[g.id]}`,'','### 이번에 사용한 기준','');for(const a of g.axes)doc.push(`- ${a.id} 구체 축: ${a.description}`,`  - 메타 축: ${a.metaAxis}`);
  doc.push('','### 충분하게 설명하는 답의 예','',cc.find(c=>c.kind==='sufficient').response);
  if(g.id==='G3')doc.push('','주의: 위 동결 답의 “흰 말을 구하면 안 된다”는 앞의 노란 말·검은 말을 받아야 할 때 불가능하다는 생략 표현으로 작성했으나 중의적이다. 명료한 답은 “흰 말을 구할 때는 노란 말이나 검은 말을 데려올 수 없다”이다. 모델 평가에는 고친 답을 넣지 않았다.');
  doc.push('','### 학생 응답과 판정','');
  for(const c of cc){const ss=stability.filter(s=>s.caseId===c.id);doc.push(`#### ${c.id}: ${kindNames[c.kind]}`,'',`> ${c.response}`,'','| 축 | L1 (1/2/3) | L2 (1/2/3) | 최종 처리 (1/2/3) |','|---|---|---|---|');for(const s of ss)doc.push(`| ${s.axisId} | ${s.l1.map(x=>short[x]??'—').join(' / ')} | ${s.l2.map(x=>x===null?'—':x?'O':'X').join(' / ')} | ${s.routes.map(x=>short[x]).join(' / ')} |`);
    let opinion=c.kind==='functional'?functionalOpinion[g.id]:c.kind==='missing'?'관계를 말하지 않은 나열이다. 이해를 확인할 질문은 필요하지만 명시적 오류라고 부르지는 않는 편이 맞다.':c.kind==='error'?'글에 반대되는 주장을 실제로 했다. 오류 교정 질문을 반드시 제시하되 답변 없이 진행할 수 있게 한다.':'축의 의미를 직접 또는 다른 표현으로 설명했다. 추가 표현을 요구하지 않고 조용히 통과시키는 편이 맞다.';
    if(c.id==='G3-sufficient')opinion='앞 문장을 이어 읽으면 의도한 범위 차이는 알 수 있으나 생략 문장이 중의적이다. 확정 ERROR보다 중의성 확인 또는 문맥적 인정이 자연스럽다는 의견이다. 깨끗한 충분 답 대조군으로 간주하지 않고 민감도 분석에서 별도 제시한다.';
    doc.push('',`**실행 전 기대:** ${esc(c.expected)}.`,`**현실적 판정 의견:** ${opinion}`,'');
  }
}
writeFileSync(`${root}/CASE-RESULTS.md`,doc.join('\n')+'\n');
console.log(JSON.stringify({...metrics,stability:undefined},null,2));
