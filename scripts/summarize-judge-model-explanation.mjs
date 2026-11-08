// 모델 x 해설 실험 요약: 판정 집계표, 기대 판정 일치·풀림, 오류 질문 목록, 비용, 참고값. 외부 호출 없음.
// Usage: node scripts/summarize-judge-model-explanation.mjs [runsDir] [outDir]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DIR, PARTICIPANT, CASES, CONDITIONS, REPLICATES } from './run-judge-model-explanation.mjs';

const ENUM = ['SUPPORTED', 'INSUFFICIENT', 'ERROR', 'UNKNOWN']; // FeedbackSelectionAssessmentSchema.contentAssessment
export const EXPECTED = Object.fromEntries(CASES.map(c => [c.id,
  c.id.startsWith('C') ? 'INSUFFICIENT' : ['A-horse5', 'A-aud17'].includes(c.id) ? 'ERROR' : 'SUPPORTED']));
const BASELINE = ['A-cog14', 'A-horse6', 'A-plas10', 'A-aud16'];
const A_CASES = CASES.filter(c => c.id.startsWith('A-'));

export function summarize(runsDir, participantPath = PARTICIPANT) {
  const cells = readdirSync(runsDir).filter(f => f.endsWith('.json') && f !== 'META.json' && f !== 'SUMMARY.json')
    .map(f => JSON.parse(readFileSync(`${runsDir}/${f}`, 'utf8')));
  const verdict = c => c.status === 'EVALUATION_ERROR' ? 'EVALUATION_ERROR' : c.judge.contentAssessment;
  for (const c of cells) { const v = verdict(c); if (v !== 'EVALUATION_ERROR' && !ENUM.includes(v)) throw new Error(`알 수 없는 contentAssessment: ${v} (${c.caseId} ${c.condition})`); }
  const table = {}, questions = [];
  for (const c of cells) {
    const row = ((table[c.caseId] ??= {})[c.condition] ??= { byReplicate: {}, counts: {}, expected: EXPECTED[c.caseId] });
    row.byReplicate[`r${c.replicate}`] = verdict(c);
    row.counts[verdict(c)] = (row.counts[verdict(c)] ?? 0) + 1;
    if (c.errors?.length) questions.push({ caseId: c.caseId, condition: c.condition, replicate: c.replicate, questions: c.errors.map(e => e.question) });
  }
  for (const byCond of Object.values(table)) for (const row of Object.values(byCond)) {
    const hits = Object.values(row.byReplicate).filter(v => v === row.expected).length;
    row.matchCount = hits; row.resolved = hits >= 2;
  }
  const perCondition = {};
  for (const cond of Object.keys(CONDITIONS)) {
    const get = id => table[id]?.[cond];
    const cReverse = CASES.filter(c => c.id.startsWith('C') && get(c.id)).filter(c => (get(c.id).counts.SUPPORTED ?? 0) >= 2).map(c => c.id);
    perCondition[cond] = {
      baselineResolved: BASELINE.filter(id => get(id)?.resolved).length, baselineTotal: BASELINE.length, baselineResolvedIds: BASELINE.filter(id => get(id)?.resolved),
      cCounterexamplesSupportedAtLeast2: cReverse.length, cCounterexampleIds: cReverse,
    };
  }
  const cost = { byCondition: {}, byModel: {}, total: 0, cells: cells.length, failures: 0 };
  for (const c of cells) {
    const usd = (c.requests ?? []).reduce((n, r) => n + (r.usd ?? 0), 0);
    cost.byCondition[c.condition] = (cost.byCondition[c.condition] ?? 0) + usd;
    for (const r of c.requests ?? []) cost.byModel[r.model] = (cost.byModel[r.model] ?? 0) + (r.usd ?? 0);
    cost.total += usd;
    if (c.status === 'EVALUATION_ERROR' || c.endStatus === 'ERROR') cost.failures++;
  }
  const participant = JSON.parse(readFileSync(participantPath, 'utf8'));
  const reference = Object.fromEntries(A_CASES.map(c => [c.id, participant.items[c.q].session.assessments?.[0]?.contentAssessment ?? null]));
  return { expected: EXPECTED, table, perCondition, questions, cost, reference };
}

export function toMarkdown(s) {
  const L = ['# 모델 x 해설 실험 요약', '', '## 판정 집계 (r1·r2·r3, 기대 판정 일치)', '',
    `| 사례 | 기대 | ${Object.keys(CONDITIONS).join(' | ')} | 참고(원래 1회) |`, `|---|---|${Object.keys(CONDITIONS).map(() => '---').join('|')}|---|`];
  for (const c of CASES) {
    const cell = cond => { const r = s.table[c.id]?.[cond]; return r ? `${REPLICATES.map(n => r.byReplicate[`r${n}`] ?? '-').join(' / ')} (${r.matchCount}/3${r.resolved ? ', 풀림' : ''})` : '-'; };
    L.push(`| ${c.id} | ${s.expected[c.id]} | ${Object.keys(CONDITIONS).map(cell).join(' | ')} | ${s.reference[c.id] ?? ''} |`);
  }
  L.push('', '## 조건별 풀림', '', '| 조건 | 기준 사례 4건 중 풀림 | C 반례 중 2회 이상 SUPPORTED |', '|---|---|---|');
  for (const [k, v] of Object.entries(s.perCondition)) L.push(`| ${k} | ${v.baselineResolved}/${v.baselineTotal} | ${v.cCounterexamplesSupportedAtLeast2} (${v.cCounterexampleIds.join(', ')}) |`);
  L.push('', '## 오류 질문 (사례 x 조건 x 반복)', '');
  for (const q of s.questions) { L.push(`- ${q.caseId} / ${q.condition} / r${q.replicate}`); for (const t of q.questions) L.push(`  - ${t}`); }
  L.push('', '## 비용', '', `- 칸 ${s.cost.cells}, 실패 ${s.cost.failures}, 합계 USD ${s.cost.total.toFixed(4)}`);
  for (const [k, v] of Object.entries(s.cost.byCondition)) L.push(`- 조건 ${k}: USD ${v.toFixed(4)}`);
  for (const [k, v] of Object.entries(s.cost.byModel)) L.push(`- 모델 ${k}: USD ${v.toFixed(4)}`);
  return L.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const runsDir = process.argv[2] ?? `${DIR}/runs`, outDir = process.argv[3] ?? DIR, s = summarize(runsDir);
  writeFileSync(`${outDir}/SUMMARY.json`, JSON.stringify(s, null, 2) + '\n'); writeFileSync(`${outDir}/SUMMARY.md`, toMarkdown(s));
  console.log(JSON.stringify({ summary: 'written', cells: s.cost.cells, total: s.cost.total }));
}
