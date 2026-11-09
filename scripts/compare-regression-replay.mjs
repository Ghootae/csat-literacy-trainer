// 회귀 재생 결과(<out>/SUMMARY.json)를 v5.8 회귀 결과와 세션별로 나란히 놓는다. 외부 호출 없음.
// 인계: docs/handoffs/2026-11-09-v59-v510-test-runners.md (v5.9 T3, v5.10 L)
// Usage: node scripts/compare-regression-replay.mjs <out 폴더> [v5.8 SUMMARY.json]  -> <out>/COMPARE-v58.md, stdout JSON
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const V58_SUMMARY = 'docs/experiments/v58-conclusion-2026-10-29/regression/SUMMARY.json';
// v5.7·v5.8 회귀에서 이미 흔들림으로 판정된 세션(설계 초안 T3·L).
export const KNOWN_UNSTABLE = ['C-B3', 'S-A1'];

export function compare(newSummary, v58Summary) {
  const v58 = new Map(v58Summary.sessions.map(s => [s.id, s]));
  const rows = newSummary.sessions.map(s => {
    const old = v58.get(s.id);
    const now = s.status === 'COMPLETED' ? s.outcome : s.status, before = old ? (old.status === 'COMPLETED' ? old.outcome : old.status) : null;
    return { id: s.id, now, v58: before, v56Base: s.baseOutcome ?? null, same: now === before, knownUnstable: KNOWN_UNSTABLE.includes(s.id),
      divergence: s.divergence ?? null, error: s.error ?? null, questionsNew: s.correctionQuestions?.new ?? [] };
  });
  const missing = v58Summary.sessions.map(s => s.id).filter(id => !rows.some(r => r.id === id));
  const differ = rows.filter(r => !r.same);
  return { sessions: rows.length, same: rows.length - differ.length, differ: differ.map(r => r.id),
    differOutsideKnownUnstable: differ.filter(r => !r.knownUnstable).map(r => r.id), missing, usd: newSummary.usd ?? null, rows };
}

export function toMarkdown(c, out) {
  const L = [`# 회귀 재생 비교: ${out} vs v5.8`, '', `세션 ${c.sessions} · v5.8과 같음 ${c.same} · 다름 ${c.differ.length}(${c.differ.join(', ') || '없음'}) · 원래 흔들리던 세션 밖 다름 ${c.differOutsideKnownUnstable.join(', ') || '없음'} · 빠진 세션 ${c.missing.join(', ') || '없음'} · 비용 $${(c.usd ?? 0).toFixed(3)}`, '',
    '| 세션 | 새 결과 | v5.8 | v5.6 기준 | 같음 | 원래 흔들림 | 갈라진 곳 |', '|---|---|---|---|---|---|---|'];
  for (const r of c.rows) L.push(`| ${r.id} | ${r.now} | ${r.v58 ?? '-'} | ${r.v56Base ?? '-'} | ${r.same ? 'O' : 'X'} | ${r.knownUnstable ? 'O' : ''} | ${r.divergence ? `step ${r.divergence.atStep}: ${r.divergence.reason}` : ''} |`);
  const qs = c.rows.flatMap(r => r.questionsNew.map(q => `| ${r.id} | ${String(typeof q === 'string' ? q : q?.question ?? JSON.stringify(q)).replaceAll('|', '\\|')} |`));
  if (qs.length) L.push('', '## 새 교정 질문', '', '| 세션 | 질문 |', '|---|---|', ...qs);
  return L.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const out = process.argv[2];
  if (!out) throw new Error('사용법: compare-regression-replay.mjs <out 폴더> [v5.8 SUMMARY.json]');
  const c = compare(JSON.parse(readFileSync(`${out}/SUMMARY.json`, 'utf8')), JSON.parse(readFileSync(process.argv[3] ?? V58_SUMMARY, 'utf8')));
  writeFileSync(`${out}/COMPARE-v58.md`, toMarkdown(c, out));
  const { rows: _rows, ...brief } = c;
  console.log(JSON.stringify(brief));
}
