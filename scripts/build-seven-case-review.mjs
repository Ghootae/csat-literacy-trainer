// Local presentation of existing evidence only; no API calls or new judgments.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = 'docs/experiments/natural-response-disagreement-v1-2026-09-21';
const output = 'docs/review/natural-response-seven-review-2026-09-22.md';
const read = name => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));
const cases = read('cases.json'), sources = read('sources.json'), summary = read('summary.json');
const results = readFileSync(`${root}/results.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const key = read('review-key.json');
const ids = ['N03', 'N08', 'N14', 'N17', 'N27', 'N36', 'N38'];
assert.deepEqual(read('descriptive-analysis.json').rawQuestionAdded, ids);
assert.ok(!existsSync(output), 'Preserve existing reviewer notes; do not overwrite');
const shortNames = ['공손룡과 후기 묵가 · 3문단', '도파민 · 1문단', '법인 · 1문단', '법인 · 2문단',
  '정보 비대칭과 사상의 자유 시장 · 5문단', 'mRNA 백신 · 1문단', 'mRNA 백신 · 2문단'];
const quote = text => String(text).split('\n').map(line => `> ${line}`).join('\n');
let doc = `# 추가 질문 여부가 달라진 7건 — 직접 검토 문서

작성일: 2026-09-22 · 비교 실행일: 2026-09-21

이 문서는 **V4는 자동 질문하지 않고, direct-v1은 질문 대상으로 판단한 7건**을 묶었습니다. 원문·중심축·학생 입력·모델 판정 이유는 기존 실험 자료에서 그대로 가져왔습니다. 학생의 오타와 표현은 고치지 않았고, 에이전트의 사후 의견이나 추천 판정은 넣지 않았습니다.

## 읽는 방법

각 사례는 **원문단 → 중심축 → 실제 응답과 이전 대화 → 두 판정기의 결과 → 나의 판단** 순서입니다.

- 최초 응답 사례: 그 응답만을 평가한 시점입니다.
- 후속 응답 사례: 최초 응답과 이미 받은 질문·답변을 함께 읽어 주세요. 이후에 작성한 답변은 포함하지 않았습니다.
- 비교 실험에서 새 질문은 생성하지 않았습니다. 아래 이전 질문은 실제 사용 당시 받은 질문이며, 이번 direct-v1이 만든 질문이 아닙니다.
- 두 판정기는 같은 누적 발화를 받았지만 이전 AI 축 상태는 받지 않았습니다. 따라서 기존 운영의 상태 유지·재시도 전체를 재현한 결과는 아닙니다.
- 평가 결과는 모두 출력 계약을 통과했고, 코드 검증 전후의 축 상태는 같습니다.

판정 용어: **PASS** = 중심 설명 확인, **UNCLEAR_OK** = 일부 미확인·자동 질문 없음, **UNCLEAR_SERIOUS** = 중요한 공백으로 판단·질문 대상, **ERROR** = 명시적 오류로 판단·질문 대상. 어느 상태에서도 학생은 다음으로 진행할 수 있습니다.

검토 질문: **지금 이 응답에 자동으로 한 번 더 묻는 것이 필요한가, 아니면 미확인이 조금 남더라도 여기서 넘어가는 편이 나은가?**

기록용 선택지(운영 규칙 변경이 아닌 검토 보조):

- NO_QUESTION: 지금은 자동 질문 없이 진행하는 편이 낫다. 완벽한 설명이라고 확정하는 뜻은 아니다.
- QUESTION_WORTHWHILE: 중요한 공백이 있어 지금 추가 확인하는 편이 낫다.
- BORDERLINE: 어느 쪽이 나은지 명확하지 않다.

## 사례 목록

| 번호 | 문단 | 평가 시점 | 사례 ID / 기존 검토 ID | 질문 여부가 갈린 축 |
|---|---|---|---|---|
`;
for (const [i,id] of ids.entries()) {
  const c = cases.find(c => c.id === id), x = summary.comparisons.find(x => x.caseId === id);
  assert.equal(x.validated.v4NeedsQuestion, false); assert.equal(x.validated.directNeedsQuestion, true);
  doc += `| ${i+1} | ${shortNames[i]} | ${c.turn === 1 ? '최초 응답' : `후속 ${c.turn-1}회 답변 후`} | ${id} / ${key.find(k => k.caseId === id).reviewId} | ${x.raw.changes.filter(a => a.v4 === 'UNCLEAR_OK' && a.direct === 'UNCLEAR_SERIOUS').map(a => a.axisId).join(', ')} |\n`;
}
for (const [i,id] of ids.entries()) {
  const c = cases.find(c => c.id === id), s = sources[c.paragraphId];
  const pair = ['v4','direct'].map(arm => results.find(r => r.id === `${id}-${arm}`));
  for (const r of pair) {
    assert.equal(r.contractError, null);
    assert.deepEqual(r.rawAxes.map(a=>[a.axisId,a.status]),r.validatedAxes.map(a=>[a.axisId,a.status]));
  }
  doc += `\n---\n\n## ${i+1}. ${shortNames[i]}\n\n사례 **${id}** · 기존 검토 **${key.find(k=>k.caseId===id).reviewId}** · ${c.turn===1?'최초 응답 직후':'최초 응답 + 후속 답변까지 누적한 시점'}\n\n### 원문단\n\n${quote(s.gold.paragraphText)}\n\n### 평가 기준: 중심축\n\n`;
  for (const a of s.gold.centralAxes) doc += `**${a.id}**\n\n${quote(a.description)}\n\n`;
  doc += `### 실제 학생 응답\n\n**최초 응답**\n\n${quote(c.initialResponse)}\n\n`;
  if (!c.history.length) doc += '이 평가 시점 이전의 후속 질문·답변은 없습니다.\n\n';
  for (const [j,h] of c.history.entries()) doc += `**이전에 받은 질문 ${j+1} — ${h.question.type === 'CORRECTIVE' ? '교정' : '진단'}**\n\n${quote(h.question.text)}\n\n**학생의 후속 답변 ${j+1}**\n\n${quote(h.answer)}\n\n`;
  for (const a of c.revealedAxisContent) doc += `이미 공개된 도움(${a.axisId}, ${a.turn}턴; 학생 발화 아님)\n\n${quote(a.text)}\n\n`;
  for (const a of c.shownSourceGuides) doc += `이미 제공된 원문 안내(${a.axisId})\n\n${quote(a.quote)}\n\n`;
  doc += '### 평가 결과 비교\n\n| 중심축 | V4 | direct-v1 |\n|---|---|---|\n';
  for (const a of s.gold.centralAxes) doc += `| ${a.id} | ${pair[0].rawAxes.find(x=>x.axisId===a.id).status} | ${pair[1].rawAxes.find(x=>x.axisId===a.id).status} |\n`;
  doc += '\n**이 시점의 문단 행동: V4는 자동 질문 없음 / direct-v1은 추가 질문 대상.**\n\n';
  for (const [j,r] of pair.entries()) {
    doc += `#### ${j===0?'V4':'direct-v1'} — 판정 이유 원문\n\n`;
    for (const a of r.rawAxes) doc += `**${a.axisId} · ${a.status}**\n\n${quote(a.reason)}\n\n`;
  }
  doc += `### 나의 판단\n\n- 추가 질문 여부: ____________________\n- 이유: ____________________\n- 질문한다면 무엇을 확인할 것인가: ____________________\n- 현재 남아 있는 명시적 오류: 있음 / 없음 / 판단 유보\n- 오류가 있다면 해당 표현과 축: ____________________\n\n`;
}
doc += `---\n\n## 검토 결과를 대화창에 남기는 방법\n\n예: “1번 NO_QUESTION — 이유… / 2번 QUESTION_WORTHWHILE — 확인할 내용…”처럼 번호로 말씀하셔도 됩니다. 위 빈칸에는 어떤 판단도 미리 입력하지 않았습니다.\n\n## 자료 출처와 범위\n\n- 동결 원문·축: \\sources.json\\의 각 문단 골드\n- 실제 응답·과거 질문: \\cases.json\\의 해당 시점 이전 발화\n- 평가 결과: \\results.jsonl\\의 V4/direct 원판정 및 검증 후 결과\n- 선택 기준: \\descriptive-analysis.json\\의 rawQuestionAdded 7건\n\n모두 [자연 응답 비교 실험](../experiments/natural-response-disagreement-v1-2026-09-21/REPORT.md)의 자료입니다. [20건 전체 검토](../experiments/natural-response-disagreement-v1-2026-09-21/BLIND-REVIEW.md)에는 다른 불일치와 일치 표본도 있습니다. 이 문서는 7건의 집중 검토용이며 전체 모델 정확도 평가 자료는 아닙니다. 추가 API 호출이나 평가 재실행은 하지 않았습니다.\n`;
doc = doc.replaceAll('\\sources.json\\','`sources.json`').replaceAll('\\cases.json\\','`cases.json`')
  .replaceAll('\\results.jsonl\\','`results.jsonl`').replaceAll('\\descriptive-analysis.json\\','`descriptive-analysis.json`');
writeFileSync(output, doc);
// Verify every raw stimulus and reason survived presentation without paraphrasing.
const check = readFileSync(output,'utf8');
for (const id of ids) {
  const c=cases.find(c=>c.id===id), s=sources[c.paragraphId];
  for(const text of [s.gold.paragraphText,c.initialResponse,...s.gold.centralAxes.map(a=>a.description),
    ...c.history.flatMap(h=>[h.question.text,h.answer]),
    ...results.filter(r=>r.caseId===id).flatMap(r=>r.rawAxes.map(a=>a.reason))]) assert.ok(check.includes(quote(text)));
}
assert.equal((check.match(/^## \d+\./gm)||[]).length,7);
assert.equal((check.match(/^### 나의 판단/gm)||[]).length,7);
console.log(JSON.stringify({output,cases:7,verbatimSourceAndAnswersAndReasons:true,newApiCalls:0}));
