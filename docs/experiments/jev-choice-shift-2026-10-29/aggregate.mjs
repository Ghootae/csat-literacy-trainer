import { readFileSync, writeFileSync } from 'node:fs';
const DIR = '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/jev-choice-shift-2026-10-29';
const frozen = JSON.parse(readFileSync(`${DIR}/FROZEN.json`, 'utf8'));
const rows = readFileSync(`${DIR}/results.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const ANS = { q19: 5, q16: 3 };
const clamp = (p) => Math.min(0.999, Math.max(0.001, p));
const logit = (p) => Math.log(clamp(p) / (1 - clamp(p)));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const f = (x, d = 3) => (x == null || Number.isNaN(x) ? 'NA' : x.toFixed(d));

// 조건·반복별 마지막 성공 응답
const ok = {};
for (const r of rows) if (!r.error) ok[`${r.conditionId}|${r.replicate}`] = r;
const failed = rows.filter((r) => r.error);

const stats = {};
for (const c of frozen.conditions) {
  const q = c.id.slice(0, 3);
  const target = c.choice ?? ANS[q];
  const reps = [1, 2, 3, 4, 5].map((n) => ok[`${c.id}|${n}`]).filter(Boolean);
  const P = reps.map((r) => r.probabilities['C' + target]);
  const L = P.map(logit);
  const dist = ['C1', 'C2', 'C3', 'C4', 'C5'].map((k) => mean(reps.map((r) => r.probabilities[k])));
  stats[c.id] = { target, n: reps.length, P, meanP: mean(P), meanLogit: mean(L), spread: L.length ? Math.max(...L) - Math.min(...L) : NaN, dist, ceil: P.filter((p) => p >= 0.99).length };
}

const BASE = { 'q19-S12': 'q19-C5', 'q19-S12a': 'q19-C5', 'q19-S12b': 'q19-C5', 'q19-P1': 'q19-C5', 'q19-P1a': 'q19-C5', 'q19-P1b': 'q19-C5', 'q19-P1c': 'q19-C5', 'q19-N1': 'q19-C5', 'q19-N2': 'q19-C5', 'q19-AS': 'q19-C5', 'q19-CP': 'q19-C5', 'q19-W1': 'q19-C1', 'q16-P2': 'q16-C3', 'q16-P3': 'q16-C3', 'q16-AS': 'q16-C3', 'q16-CP': 'q16-C3', 'q16-W5': 'q16-C5' };
const delta = Object.entries(BASE).map(([id, b]) => ({ id, base: b, d: stats[id].meanLogit - stats[b].meanLogit, spreadCond: stats[id].spread, spreadBase: stats[b].spread }));

// 선택 효과: '선택만' - 학생 정보 없음(같은 선지 P)
const zeroP = (q, k) => {
  const reps = [1, 2, 3, 4, 5].map((n) => ok[`${q}-0|${n}`]).filter(Boolean);
  return reps.map((r) => r.probabilities['C' + k]);
};
const sel = [['q19-C5', 'q19', 5], ['q19-C1', 'q19', 1], ['q16-C3', 'q16', 3], ['q16-C5', 'q16', 5]].map(([id, q, k]) => {
  const z = zeroP(q, k).map(logit);
  const z0 = mean(z);
  return { id, k, meanLogit: stats[id].meanLogit, zeroMeanP: mean(zeroP(q, k)), zeroMeanLogit: z0, effect: stats[id].meanLogit - z0, zeroSpread: Math.max(...z) - Math.min(...z) };
});

const all = rows;
const usage = all.reduce((a, r) => ({ i: a.i + (r.usage?.inputTokens ?? 0), o: a.o + (r.usage?.outputTokens ?? 0), t: a.t + (r.usage?.totalTokens ?? 0) }), { i: 0, o: 0, t: 0 });
const lat = all.filter((r) => r.latencyMs != null).map((r) => r.latencyMs).sort((a, b) => a - b);
const median = lat.length ? (lat.length % 2 ? lat[(lat.length - 1) / 2] : (lat[lat.length / 2 - 1] + lat[lat.length / 2]) / 2) : null;
const summary = { totalSends: rows.length, failures: failed.length, retried: rows.filter((r) => r.attempt === 2).length, validCells: Object.keys(ok).length, tokens: usage, medianLatencyMs: median };
writeFileSync(`${DIR}/AGGREGATE.json`, JSON.stringify({ summary, stats, delta, selectionEffect: sel, failed: failed.map((r) => ({ c: r.conditionId, r: r.replicate, a: r.attempt, e: r.error })) }, null, 1));

let md = `# 집계 (해석 없음)\n\n`;
md += `## 전송 요약\n\n- 총 전송 ${summary.totalSends}, 실패 응답 ${summary.failures}, 재시도 전송 ${summary.retried}, 유효 셀 ${summary.validCells}/115\n- 토큰: 입력 ${usage.i}, 출력 ${usage.o}, 합계 ${usage.t}\n- latencyMs 중앙값: ${median}\n`;
if (failed.length) md += `- 실패 목록:\n` + failed.map((r) => `  - ${r.conditionId} r${r.replicate} 시도${r.attempt}: ${r.error}`).join('\n') + '\n';
md += `\n## 조건별 대상 선지 P (0.99 이상 회차 수 = 천장)\n\n| 조건 | 대상 | n | 5회 P | 평균 P | 평균 logit | logit 폭 | P≥0.99 회차 |\n|---|---|---|---|---|---|---|---|\n`;
for (const c of frozen.conditions) { const s = stats[c.id]; md += `| ${c.id} | C${s.target} | ${s.n} | ${s.P.map((p) => f(p, 2)).join(', ')} | ${f(s.meanP)} | ${f(s.meanLogit)} | ${f(s.spread)} | ${s.ceil}${s.ceil ? ' (천장)' : ''} |\n`; }
md += `\n## Δ 표 (근거 조건 평균 logit − 같은 선택의 '선택만' 평균 logit)\n\n| 근거 조건 | 기준(선택만) | Δ logit | 조건 logit 폭 | 기준 logit 폭 |\n|---|---|---|---|---|\n`;
for (const d of delta) md += `| ${d.id} | ${d.base} | ${f(d.d)} | ${f(d.spreadCond)} | ${f(d.spreadBase)} |\n`;
md += `\n## 선택 효과 ('선택만' − 학생 정보 없음, 같은 선지 기준)\n\n| 조건 | 선지 | 선택만 평균 logit | 정보 없음 평균 P | 정보 없음 평균 logit | 선택 효과 logit | 정보 없음 logit 폭 |\n|---|---|---|---|---|---|---|\n`;
for (const s of sel) md += `| ${s.id} | C${s.k} | ${f(s.meanLogit)} | ${f(s.zeroMeanP)} | ${f(s.zeroMeanLogit)} | ${f(s.effect)} | ${f(s.zeroSpread)} |\n`;
md += `\n## 조건별 5선지 평균 분포\n\n| 조건 | C1 | C2 | C3 | C4 | C5 |\n|---|---|---|---|---|---|\n`;
for (const c of frozen.conditions) md += `| ${c.id} | ${stats[c.id].dist.map((x) => f(x, 3)).join(' | ')} |\n`;
writeFileSync(`${DIR}/AGGREGATE.md`, md);
console.log(md);
