import { readFileSync, writeFileSync } from 'node:fs';

const root = 'docs/experiments/dialogue-v4-sensitive-2026-09-19';
const read = (name) => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));
const data = read('results.json');
const golds = read('golds.json');
const suite = read('cases.json');
const quote = (value) => String(value ?? '(없음)').split('\n').map((line) => `> ${line}`).join('\n');
const labels = { sufficient: '충분한 짧은 요약', minor: '일부 의미 생략', topic: '소재 나열', error: '명시적 오류', 'natural-replay': '실제 과거 발화 재생', 'accepted-compression': '사용자가 수용한 압축', 'context-slot': '질문 문맥 통제', optin: '선택적 보완 요청', 'connected-followup': '실제 생성 질문 뒤 고정 짧은 답' };
const out = ['# V4 민감 문단 시험: 원문·응답·판정·공개 내용·질문', '',
  '- 조건당 단회. 신규 학생 응답은 합성 입력이며 실제 과거 발화 재생은 별도 표시한다.',
  '- 후속 답은 이번에 생성된 질문을 본 뒤 작성한 고정 시험 입력이다. 실제 학생의 수정 효과를 입증하지 않는다.',
  '- 기대 행동 일치는 의미 정확도와 다르다. 해석·문제점은 REPORT.md를 함께 읽는다.',
  `- 모델: ${data.manifest.model}; effort: ${data.manifest.effort}; 물리 호출: ${data.physicalCalls}; 토큰 단가 추정 비용: $${data.observedEstimatedCostUsd.toFixed(6)}.`,
  '- 내부 전체 원출력과 검증 후 출력: results.json / responses.jsonl. 호출 입력: requests.jsonl.', ''];
for (const spec of suite.specs) {
  const gold = golds[spec.gold].gold;
  out.push(`## ${spec.title}`, '', '### 원문', '', quote(gold.paragraphText), '', '### 중심축', '');
  for (const axis of gold.centralAxes) out.push(`- ${axis.id}: ${axis.description}`);
  out.push('');
  for (const row of data.results.filter((r) => r.gold === spec.gold)) {
    out.push(`### ${labels[row.kind] ?? row.kind} — ${row.id}`, '',
      `- 단계: ${row.phase}; 사전 기대: ${row.expected}; 행동 일치: ${row.behavioralMatch === null ? '탐색·수동 검토' : row.behavioralMatch ? '예' : '아니오'}`,
      `- 입력 출처: ${row.source ?? (row.parentId ? `부모 사례 ${row.parentId}` : '합성 시험')}`, '');
    if (row.review) out.push(`시험 맥락: ${row.review}`, '');
    out.push('학생 최초 응답', '', quote(row.input.initialResponse), '');
    for (const [i, exchange] of row.input.history.entries()) {
      out.push(`기존 질문 ${i + 1} (${exchange.question.type})`, '', quote(exchange.question.text), '', '학생 후속 답변', '', quote(exchange.answer), '');
    }
    if (row.error) { out.push(`실행 오류: ${row.error}`, ''); continue; }
    const result = row.result;
    out.push(`판정: **${result.status}**`, '', `- 학생 피드백: ${result.studentFeedback}`,
      `- 내부 요약: ${result.decisionSummary}`, '', '누적 학생 응답', '', quote(result.snapshot.effectiveResponse), '', '축별 박스 내용', '');
    for (const axis of result.snapshot.axisFeedback ?? []) {
      out.push(`- **${axis.axisId} / ${axis.status}**: ${axis.revealedText ?? '(비공개)'}`, `  - 판정 이유: ${axis.reason}`);
    }
    out.push('', '후속 질문', '', result.nextQuestion ? quote(`[${result.nextQuestion.type}] ${result.nextQuestion.text}`) : '없음.', '');
    const audit = row.call?.decisionAudit;
    if (audit) out.push(`- 1차 원판정 / 검증 후: ${audit.rawResult?.status} / ${audit.validatedResult?.status}; 사후 보정: ${(audit.normalizationEvents ?? []).length}건.`, '');
  }
}
out.push('## 실행 버전', '', '```json', JSON.stringify(data.manifest, null, 2), '```', '');
writeFileSync(`${root}/REVIEW-PACKET.md`, out.join('\n'));
console.log(JSON.stringify({ document: `${root}/REVIEW-PACKET.md`, records: data.results.length }));
