// Post-run descriptive reporting only. No API client, prompt changes, or truth labels.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './lib/natural-response-disagreement.mjs';
const root = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
const read = n => JSON.parse(readFileSync(`${root}/${n}`, 'utf8'));
const rows = n => readFileSync(`${root}/${n}`, 'utf8').trim().split('\n').map(JSON.parse);
const summary = read('summary.json'), audit = read('execution-audit.json'), cases = read('cases.json');
const requests = rows('requests.jsonl'), responses = rows('responses.jsonl'), results = rows('results.jsonl');
const records = read('records.json'), manifest = read('manifest.json'), key = read('review-key.json');
assert.equal(audit.calls, 90);
const sourceLines = readFileSync(manifest.sourceLog,'utf8').trim().split('\n');
for (const r of records) {
  assert.equal(sha(sourceLines[r.sourceLine-1]), r.sourceLineHash);
  assert.deepEqual(JSON.parse(sourceLines[r.sourceLine-1]), r.row);
}
for (const q of requests) {
  const payload = JSON.parse(q.request.input);
  assert.ok(Object.keys(payload).every(k=>['paragraphText','centralAxes','evidence','turn','revealedAxisContent','shownSourceGuides','sourceGuideBoundary'].includes(k)));
  assert.deepEqual(Object.keys(payload.evidence).sort(), ['followUpExchanges','initialResponse','previousAxisStates']);
  assert.equal(q.request.store,false); assert.equal(q.request.service_tier,'default');
  assert.equal(q.request.model,'gpt-5.6-terra');
  assert.ok(!q.request.input.includes(cases.find(c=>c.id===q.caseId).sessionId));
}
const changed = summary.comparisons.filter(x=>x.raw.comparable&&!x.raw.same);
const armStats = Object.fromEntries(['v4','direct'].map(arm=>{
  const rr=results.filter(r=>r.arm===arm), api=responses.filter(r=>r.arm===arm);
  const distribution = Object.fromEntries(['PASS','UNCLEAR_OK','UNCLEAR_SERIOUS','ERROR'].map(s=>[s,rr.flatMap(r=>r.rawAxes??[]).filter(a=>a.status===s).length]));
  return [arm,{...summary.arms[arm], distribution,
    inputTokens:api.reduce((n,r)=>n+(r.response?.usage?.input_tokens??0),0),
    outputTokens:api.reduce((n,r)=>n+(r.response?.usage?.output_tokens??0),0),
    contractFailures:rr.filter(r=>r.contractError).map(r=>({id:r.id,error:r.contractError})),
    validatedQuestionCandidates:rr.filter(r=>r.validatedAxes?.some(a=>['ERROR','UNCLEAR_SERIOUS'].includes(a.status))).length }];
}));
const direction = (field, from, to) => summary.comparisons.filter(c=>c[field].comparable&&c[field].v4NeedsQuestion===from&&c[field].directNeedsQuestion===to).map(c=>c.caseId);
const detail = { checkedAt:new Date().toISOString(), actualSourceLinesVerified:records.length,
  inputBoundaryVerified:true, calls:90, rawDisagreementCases:changed.map(x=>x.caseId),
  rawDisagreementAxes:changed.reduce((n,x)=>n+x.raw.changes.length,0),
  rawDisagreementParagraphs:[...new Set(changed.map(x=>cases.find(c=>c.id===x.caseId).paragraphId))],
  rawQuestionRemoved:direction('raw',true,false), rawQuestionAdded:direction('raw',false,true),
  validatedQuestionRemoved:direction('validated',true,false), validatedQuestionAdded:direction('validated',false,true),
  changedButNoQuestionSlot:summary.comparisons.filter(c=>c.raw.paragraphInterventionChange&&!c.raw.questionSlotAvailable).map(c=>c.caseId),
  arms:armStats, humanAdjudication:'pending', productionChange:false };
writeFileSync(`${root}/descriptive-analysis.json`,JSON.stringify(detail,null,2)+'\n');
const f = n=>n.toFixed(3);
const label = id=>key.find(k=>k.caseId===id)?.reviewId??id;
const list = ids=>ids.length?ids.map(id=>`${label(id)} (${id})`).join(', '):'없음';
let doc = `# 자연 응답 V4 ↔ direct-v1 비교 결과\n\n## 요약\n\n출처가 확인된 사용자1인의 실제 입력45시점(최초31/후속14)을 두 판정기로 각각1회 재판정했다.90호출 완료, 추정 비용 **$${summary.knownEstimatedUsd.toFixed(7)}**, 비용 불명 호출${summary.unknownUsage}건. 운영 V4·문제V3·골드·UI는 변경하지 않았다.\n\n`;
doc += `45시점 중 축 상태가 하나라도 다른 경우는 **${changed.length}건**(${detail.rawDisagreementAxes}축, 고유${detail.rawDisagreementParagraphs.length}문단)이다. 문단의 자동 질문 후보 여부가 달라진 것은 **${summary.counts.rawParagraphInterventionChanges}건**이다. 이 수치는 모델 간 차이이지 어느 판정기의 정답률이나 개선율이 아니다.\n\n`;
doc += `## 실행과 판정 집계\n\n| 항목 | 현재 V4 | direct-v1 |\n|---|---:|---:|\n`;
for(const [title,get] of [
  ['호출 수',s=>s.calls],['계약 유효',s=>s.valid],['모든 축 PASS인 시점(원판정)',s=>s.rawAllPass],
  ['SERIOUS/ERROR가 있는 시점(원판정)',s=>s.rawQuestionCandidate],
  ['SERIOUS/ERROR가 있는 시점(검증 유효)',s=>s.validatedQuestionCandidates],
  ['API 응답 시간 중앙값(초)',s=>f(s.medianApiMs/1000)],['추정 비용(달러)',s=>s.estimatedUsd.toFixed(7)],
  ['입력 토큰 합계',s=>s.inputTokens],['출력 토큰 합계',s=>s.outputTokens]]) {
  doc+=`| ${title} | ${get(armStats.v4)} | ${get(armStats.direct)} |\n`;
}
doc+='\n질문 후보는 SERIOUS/ERROR가 적어도 한 축에 있다는 뜻이다. 실제 질문 생성은0회이며 학생에게 진행을 강제하지 않는다. PASS↔OK는 공개·완료 표시 차이지 자동 질문의 증감이 아니다. 계약 실패가 있다면 해당 원판정은 운영 최종 판정으로 사용할 수 없다.\n\n';
doc+=`이번 실행에서는 모든 축 PASS도 ${armStats.v4.rawAllPass}→${armStats.direct.rawAllPass}로 늘었지만 질문 후보도 ${armStats.v4.rawQuestionCandidate}→${armStats.direct.rawQuestionCandidate}로 늘었다. PASS는 아니지만 자동 질문하지 않는 시점은 ${45-armStats.v4.rawAllPass-armStats.v4.rawQuestionCandidate}→${45-armStats.direct.rawAllPass-armStats.direct.rawQuestionCandidate}로 줄었다. 즉 direct를 단순히 더 관대한 판정기라고 설명할 수 없다. OK로 남겨 두는 중간 판단이 적어진 양상이며, 이 중 무엇이 적절한지는 아직 미판정이다.\n\n`;
doc+='| 응답 구분 | 시점 수 | 축 상태 불일치 시점 | 문단 질문 후보 변화 | 계약 실패 쌍 |\n|---|---:|---:|---:|---:|\n';
for(const [stratum,name] of [['initial','최초'],['followup','후속']]){
  const s=summary.byStratum[stratum];doc+=`| ${name} | ${s.cases} | ${s.rawDisagreements} | ${s.rawParagraphInterventionChanges} | ${s.contractFailurePairs} |\n`;
}
doc+=`\n## 사람 검토 우선순위\n\n- V4 질문 후보 → direct 비질문: ${list(detail.rawQuestionRemoved)}\n- V4 비질문 → direct 질문 후보: ${list(detail.rawQuestionAdded)}\n- 위 차이 중 질문 기회 소진 시점: ${list(detail.changedButNoQuestionSlot)}\n- ERROR 경계 차이가 있는 시점: ${summary.counts.rawErrorBoundaryChanges}건\n\n`;
doc+='모델 설명을 보기 전 [블라인드 검토 문서](./BLIND-REVIEW.md)에서 원문·축·실제 답변을 먼저 읽는 것을 권한다. 이후 [판정 비교표](./COMPARISON-KEY.md)를 열면 된다.\n\n';
doc+=`모든 불일치/계약 실패 ${summary.selection.mandatory.length}건과 일치 표본 ${summary.selection.agreement.length}건(최초/후속 각 최대3건)을 합쳐 **${summary.selection.blindOrder.length}건**을 섞어 두었다. 일치 표본도 검토해 두 모델이 함께 틀리는 경우를 확인한다. 각 축의 상태·추가 질문 필요성·명시적 오류 여부와 이유를 human-review.json에 기록할 수 있다. 사람 판정은 아직 전부 미입력이다.\n\n`;
doc+='## 불일치 목록\n\n| 검토 ID | 시점 | 문단 | 단계 | 축 상태 변화 (V4 → direct) | 문단 질문 후보 변화 |\n|---|---|---|---|---|---|\n';
for(const x of changed){const c=cases.find(c=>c.id===x.caseId);doc+=`| ${label(x.caseId)} | ${x.caseId} | ${c.paragraphId} | ${c.stratum==='initial'?'최초':`후속${c.turn-1}`} | ${x.raw.changes.map(a=>`${a.axisId}: ${a.v4} → ${a.direct}`).join('; ')} | ${x.raw.paragraphInterventionChange?(x.raw.v4NeedsQuestion?'있음 → 없음':'없음 → 있음'):'동일'} |\n`;}
doc+=`\n## 기록과 검증\n\n- 원요청·원응답·검증 후 결과를 각각 requests.jsonl, responses.jsonl, results.jsonl에 보존했다.\n- 실행 감사: [execution-audit.json](./execution-audit.json). 동결 파일,90개 고유 요청, 조건 간 동일 입력, 미래 발화 배제, 재시도0, 비용 상한을 검사했다.\n- 별도 사후 검증은 원로그31행의 해시/내용과 요청 입력 경계를 대조했다: [descriptive-analysis.json](./descriptive-analysis.json).\n- 검증기가 축 라벨을 바꾼 호출: ${audit.labelChangesByValidator.length}건. 계약 실패는 ${summary.counts.contractFailurePairs}쌍이며 실패를 PASS로 대체하지 않았다.\n- 전체45시점 원문·응답·원판정: [ALL-OUTPUTS.md](./ALL-OUTPUTS.md).\n- 설정: gpt-5.6-terra / medium / default, 최대출력4000, 각 조건1회, 같은 시점 두 호출 병렬.\n- 비용은 응답 usage와 [OpenAI 공식 단가](https://developers.openai.com/api/docs/pricing)로 계산한 추정치다. 입력2/캐시0.2/캐시쓰기2.5/출력12달러(백만 토큰당). API 전체 계정 청구액은 아니다.\n\n`;
doc+='## 해석의 한계와 다음 단계\n\n이번 자료로 확인한 것은 자연 응답에서 두 판정기가 갈리는 위치다. direct가 더 빠르더라도 제거한 기록·피드백 기능까지 포함한 운영 품질이 동등하다는 뜻은 아니다. 질문 후보 감소 역시 불필요한 질문을 제거한 것인지 중요한 공백을 놓친 것인지 사람 검토 전에는 구분할 수 없다.\n\n기존30문단43시점은 당시 V2 질문을 받은 사용자 입력이고 최근 공손룡1문단2시점은 V4 사용 입력이다. 각 시점까지의 실제 대화는 보존하되 previousAxisStates=null로 독립 재판정했으므로, 운영의 상태 유지·계약 재시도·연속 질문 흐름은 검증하지 않았다. 외부 학생 자료가 아니며 각1회여서 반복 안정성이나 전체 정확도를 추정하지 않는다.\n\n다음 단계는 선택된 사례를 사람이 검토해 과개입/과수용/허용 가능한 경계를 구분하는 것이다. 그 전에는 프롬프트 추가 수정이나 운영 승격을 하지 않는다.\n';
doc+='\n## 개별 차이를 읽을 때의 주의점\n\n- 최근 공손룡1문단 최초 답(N44/R14)은 V4 두 축 OK, direct 두 축 PASS다. 전문성·대표성에 대한 보류를 direct가 없앤 사례지만 두 모델 모두 자동 질문하지 않는다. 이 개선 후보를 질문 감소로 세면 안 된다.\n- 같은 세션의 후속 답(N45)은 이번 재판정에서 두 모델 모두 두 축 PASS다. 과거 운영에서 AX2가 남았던 문제를 수정했다는 증거는 아니다. 이번 입력에는 이전 축 상태가 없어 상태 전이 계약도 발동하지 않는다.\n- 법인2문단 최초 답(N16/R06)의 ERROR 경계 차이는 오류 발견 유무가 아니라 오류를 어느 축에 귀속시켰는지의 차이다. 두 모델 모두 수익 활동에 기관 허가가 필요하다는 학생 주장을 오류로 보았지만 V4는 AX2, direct는 AX3에 ERROR를 붙였다. 전체 ERROR 탐지 건수만으로 이 차이를 놓칠 수 있다.\n- 질문 후보가 추가된7시점은 모두 V4의 OK와 direct의 SERIOUS 경계 차이다. 모델들이 같은 누락을 지적해도 개입 필요성 판단은 다를 수 있다. 사람 검토 전에는 이를7건의 과개입 또는7건의 누락 교정 성공으로 세지 않는다.\n';
writeFileSync(`${root}/REPORT.md`,doc);
console.log(JSON.stringify({report:`${root}/REPORT.md`,detail},null,2));
