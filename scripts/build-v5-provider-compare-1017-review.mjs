// 공급자 비교 재시험(1017) 블라인드 의미 검토 묶음을 만든다. 로컬 파일만 읽고 API 호출 없음.
// 새 칸 전부와 기준 칸(REVIEW-anchors.json의 옛 칸 경로 목록)을 고정 시드로 섞어 B001… 식별자만 붙인다.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = x => JSON.stringify(x, null, 1) + '\n';

// 시드 고정 셔플(재현 가능)
export function shuffle(arr, seed) {
  const a = [...arr]; let s = createHash('sha256').update(seed).digest().readUInt32LE(0);
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 설정·모델·경로·비용·시간 없이 검토에 필요한 칸 내용만 뽑는다. 없는 필드는 null.
export function reviewCell(cell, response) {
  const a = cell.assessment ?? cell.call?.rawOutput ?? {};
  return { studentResponseType: cell.type, studentResponse: response, status: cell.status ?? null,
    reconstructability: a.reconstructability ?? null, rationaleImpliedVerdict: a.rationaleImpliedVerdict ?? null, contentAssessment: a.contentAssessment ?? null,
    reason: a.reason ?? null, studentClaims: cell.assessmentRaw?.studentClaims ?? cell.studentClaims ?? null,
    errors: (cell.after?.errors ?? []).map(e => ({ description: e.description, question: e.question })), coaching: a.coaching ?? null,
    endExplanation: cell.endExplanation ? { firstChoice: cell.endExplanation.firstChoice, reselection: cell.endExplanation.reselection, answer: cell.endExplanation.answer } : null,
    finalPhase: cell.after?.phase ?? null };
}
export function buildReview({ dir, anchorsPath, seed = 'v5-provider-compare-1017-review', configs }) {
  const { responses } = read(`${dir}/FROZEN.json`);
  const entries = [];
  for (const config of configs) {
    for (const f of readdirSync(`${dir}/${config}`).filter(f => /^[SX]\d-r\d\.json$/u.test(f)).sort()) {
      const cell = read(`${dir}/${config}/${f}`);
      entries.push({ key: { config, label: f.replace('.json', '') }, cell });
    }
  }
  for (const path of read(anchorsPath)) {
    const cell = read(path);
    entries.push({ key: { anchor: path }, cell });
  }
  const order = shuffle(entries, seed);
  const packet = [], key = {};
  order.forEach(({ key: k, cell }, i) => {
    const id = `B${String(i + 1).padStart(3, '0')}`;
    key[id] = k; packet.push({ id, ...reviewCell(cell, responses[cell.type]) });
  });
  mkdirSync(`${dir}/review`, { recursive: true });
  writeFileSync(`${dir}/review/REVIEW-blind-packet.json`, serialize(packet));
  writeFileSync(`${dir}/review/REVIEW-blind-key.json`, serialize(key));
  return { packet, key };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? 'docs/experiments/v5-provider-compare-1017-2026-10-22';
  const { CONFIGS } = await import('./test-v5-provider-compare-1017.mjs');
  const { packet } = buildReview({ dir, anchorsPath: process.argv[3] ?? `${dir}/REVIEW-anchors.json`, configs: Object.keys(CONFIGS) });
  console.log(JSON.stringify({ cells: packet.length }));
}
