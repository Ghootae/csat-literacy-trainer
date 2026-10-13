import { readFileSync, writeFileSync } from 'node:fs';

const root = 'docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18';
const suite = JSON.parse(readFileSync(`${root}/cases.json`, 'utf8'));
const run = JSON.parse(readFileSync(`${root}/results.json`, 'utf8'));
const reviews = JSON.parse(readFileSync(`${root}/question-review.json`, 'utf8'));
const q = text => String(text).split('\n').map(line => `> ${line}`).join('\n');
const label = { sufficient: '충분한 요약', missing: '축 의미 누락', error: '명시적 오류', 'short-followup': '짧은 보완 뒤', 'corrective-followup': '교정·철회 뒤', sparse: '소재만 언급' };
const reviewKey = r => `${r.profile}/${r.caseId}`;
const allRows = [...run.results, ...run.chains];
for (const row of allRows.filter(r => r.result?.nextQuestion)) {
  if (!reviews.items.some(item => item.key === reviewKey(row))) throw new Error(`Missing question review: ${reviewKey(row)}`);
}
const stats = Object.fromEntries(run.manifest.profiles.map(profile => {
  const rows = run.results.filter(r => r.profile === profile);
  const by = field => Object.fromEntries([...new Set(rows.map(r => r[field]))].map(k => {
    const subset = rows.filter(r => r[field] === k);
    return [k, { count: subset.length, matched: subset.filter(r => r.expectedMatched).length }];
  }));
  const qr = reviews.items.filter(r => r.key.startsWith(`${profile}/`));
  return [profile, { total: rows.length, matched: rows.filter(r => r.expectedMatched).length,
    errors: rows.filter(r => r.error).length, condition: by('condition'), group: by('group'),
    questions: qr.length, flaggedQuestions: qr.filter(r => r.flags.length).length,
    scopeFlags: qr.filter(r => r.flags.includes('scope-expansion')).length,
    leadingFlags: qr.filter(r => r.flags.includes('answer-provided')).length,
    quoteFlags: qr.filter(r => r.flags.includes('student-misattribution')).length }];
}));
const responses = readFileSync(`${root}/responses.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const totals = responses.reduce((a, r) => ({ input: a.input + (r.usage?.input_tokens ?? 0),
  cached: a.cached + (r.usage?.input_tokens_details?.cached_tokens ?? 0), output: a.output + (r.usage?.output_tokens ?? 0),
  errors: a.errors + Number(Boolean(r.error)) }), { input: 0, cached: 0, output: 0, errors: 0 });
writeFileSync(`${root}/summary.json`, JSON.stringify({ stats, totals, calls: run.physicalCalls,
  estimatedCostUsd: run.estimatedCostUsd, reviewAuthorship: reviews.authorship }, null, 2));
const lines = ['# V3 / V3.1 — 6문단 원문·합성 응답·피드백 전체 자료', '',
  '실제 학생 세션이 아니라 사전 작성한 32개 입력을 두 버전에 각각 한 번 실행한 비교다.',
  '기대값과 질문 의미 검토는 Codex 작성이다. 독립 사람 검토나 학습 효과 검증으로 해석하지 않는다.',
  '고정 후속 대화는 모델의 최초 판정과 관계없이 입력했다. 마지막 연결 표본만 이번 모델이 생성한 질문을 사용했다.', '',
  `- 실행: ${run.manifest.startedAt} ~ ${run.completedAt}`, `- 호출: ${run.physicalCalls}; 과거 단가 추정 USD ${run.estimatedCostUsd.toFixed(6)}`, '',
  '| 버전 | 사전 기대 라벨 일치 | 질문 | 의미 검토 지적 질문 |', '|---|---:|---:|---:|',
  ...Object.entries(stats).map(([version, s]) => `| ${version} | ${s.matched}/${s.total} | ${s.questions} | ${s.flaggedQuestions} |`), '',
  '라벨 일치는 질문 적절성과 다르다. 아래 질문 검토는 출처·범위·정답 제공 여부를 따로 본 것이다.', ''];
function output(row) {
  if (row.error) return [`호출 오류: ${row.error}`, ''];
  const g = row.call?.decisionAudit?.validatedResult;
  const review = reviews.items.find(item => item.key === reviewKey(row));
  return [`판정: **${row.result.status}**`, '', `피드백: ${row.result.studentFeedback}`, '',
    `판정 요약: ${row.result.decisionSummary}`, '',
    `축 상태: ${g?.axisStates.map(a => `${a.axisId}=${a.state}`).join(', ') ?? ''}`, '',
    `누락 축 인용: ${JSON.stringify(g?.missingAxisEvidence ?? [])}`, '',
    `질문 목적: ${g?.questionIntent ?? '(v3는 별도 필드 없음 / 통과 시 null)'}`, '',
    row.result.nextQuestion ? q(row.result.nextQuestion.text) : '추가 질문 없음.', '',
    ...(review ? [`Codex 검토: ${review.flags.length ? review.flags.join(', ') : '뚜렷한 문제 없음'} — ${review.note}`, ''] : [])];
}
for (const spec of suite.specs) {
  const gold = JSON.parse(readFileSync(`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${spec.gold}.json`, 'utf8'));
  lines.push(`## ${spec.gold}`, '', `- 구조: ${spec.structure}`, `- 군: ${spec.group}`, '', '### 원문', '', q(gold.paragraphText), '', '### 중심축', '',
    ...gold.centralAxes.map(a => `- ${a.id}: ${a.description}`), '');
  for (const c of suite.cases.filter(c => c.gold === spec.gold)) {
    lines.push(`### ${label[c.kind]}`, '', `사전 기대: ${c.expected}`, '', '학생 최초 응답:', '', q(c.initial), '');
    for (const h of c.history) lines.push(`고정 ${h.question.type} 질문:`, '', q(h.question.text), '', '고정 학생 답:', '', q(h.answer), '');
    for (const profile of run.manifest.profiles) {
      const row = run.results.find(r => r.caseId === c.id && r.profile === profile);
      lines.push(`#### ${profile}`, '', ...output(row));
    }
  }
}
lines.push('## 실제 생성 질문에 연결한 후속 턴', '', '답은 사전 작성한 짧은 답변이다. 생성 질문의 범위가 어긋났다면 연결 PASS도 질문 효과의 증거가 아니다.', '');
for (const row of run.chains) {
  lines.push(`### ${row.gold} / ${row.profile}`, '');
  if (row.skipped) { lines.push(`미실행: ${row.skipped} (첫 판정 ${row.firstStatus})`, ''); continue; }
  lines.push('실제 질문:', '', q(row.question?.text ?? ''), '', '학생 답:', '', q(row.answer ?? ''), '', ...output(row));
}
lines.push('## 재현 자료', '', '- cases.json: 사전 고정 입력·기대값', '- manifest.json: 모델·단가 가정·프롬프트/골드 해시',
  '- requests.jsonl / responses.jsonl: 호출별 실제 입력·원출력·사용량', '- results.json: 판정 원출력·검증 결과·질문·후속 경로',
  '- question-review.json: Codex의 질문별 검토 근거', '- REPORT.md: 해석과 한계', '');
writeFileSync(`${root}/REVIEW-PACKET.md`, lines.join('\n'));
console.log(JSON.stringify({ stats, totals, calls: run.physicalCalls, estimatedCostUsd: run.estimatedCostUsd }, null, 2));
