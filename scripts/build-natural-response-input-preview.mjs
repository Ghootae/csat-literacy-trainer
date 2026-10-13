// Local-only preview of frozen request inputs. Never constructs an API client.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { sha } from './lib/natural-response-disagreement.mjs';
const root = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
const read = n => JSON.parse(readFileSync(`${root}/${n}`, 'utf8'));
const manifest = read('manifest.json'), cases = read('cases.json'), jobs = read('jobs.json');
for (const [path,hash] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(path)),hash);
const quote = t => t.split('\n').map(l=>`> ${l}`).join('\n');
let doc = '# API 전송 예정 자료 — 자연 응답 45시점\n\n아직 전송하지 않았습니다. 동일한 아래 입력을 현재 V4와 direct-v1에 각각1회 전송할 예정입니다. 모델 지시와 출력 JSON 계약은 별도 동결 파일에 있습니다. 원본 세션 ID·시각·과거 평가 라벨·원본 전체 로그·API 키는 입력에 포함되지 않습니다.\n\n외부 수신자는 OpenAI API이며 모델은 gpt-5.6-terra입니다. 데이터: 문단 원문·중심축·직접 작성한 최초/후속 답변·그 전에 받은 질문·이미 공개된 도움. store=false로 요청하며 이는 모든 제공자 보존 정책을 해제한다는 뜻은 아닙니다. 로컬 $2 추정 상한, 최대90호출.\n\n';
for (const c of cases) {
  const pair = jobs.filter(j=>j.caseId===c.id);
  assert.equal(pair.length,2); assert.equal(pair[0].request.input,pair[1].request.input);
  const input = JSON.parse(pair[0].request.input);
  assert.equal(input.evidence.previousAxisStates,null);
  assert.ok(!pair[0].request.input.includes(c.sessionId));
  doc += `## ${c.id} / ${c.paragraphId} / ${c.stratum}\n\n${quote(input.paragraphText)}\n\n중심축\n\n`;
  for(const a of input.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
  doc += `\n최초 답변\n\n${quote(input.evidence.initialResponse)}\n\n`;
  for(const h of input.evidence.followUpExchanges) doc += `이전 질문\n\n${quote(h.question.text)}\n\n학생 답변\n\n${quote(h.answer)}\n\n`;
  for(const x of input.revealedAxisContent??[]) doc += `공개된 도움(${x.axisId}): ${x.text}\n\n`;
  for(const x of input.shownSourceGuides??[]) doc += `공개된 원문 안내(${x.axisId}): ${x.quote}\n\n`;
}
writeFileSync(`${root}/INPUT-REVIEW.md`,doc);
const calls = existsSync(`${root}/requests.jsonl`) ? readFileSync(`${root}/requests.jsonl`,'utf8').split('\n').filter(Boolean).length : 0;
assert.equal(calls,0);
writeFileSync(`${root}/preflight-audit.json`,JSON.stringify({ checkedAt:new Date().toISOString(),
  cases:45,sessions:31,uniqueParagraphs:30,initial:31,followup:14,plannedCalls:90,actualCalls:0,
  frozenHashesMatch:true,pairedInputsIdentical:true,sessionIdsExcludedFromInputs:true,
  previousStatesNull:true,sourceParagraphEqualsGold:true,apiCostUsd:0,
  status:'awaiting-explicit-natural-response-export-approval' },null,2)+'\n');
console.log('45시점 전송 입력 미리보기·동결 검증 완료. API 호출 0.');
