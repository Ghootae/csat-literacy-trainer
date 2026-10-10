// 모델 × 문항별 블라인드 검토 묶음. 전체 코칭을 보존한다. API 호출 없음.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEFAULT_DIR, MODELS } from './test-v5-multi-item-models.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
function shuffle(arr, seed) {
  const a = [...arr]; let s = createHash('sha256').update(seed).digest().readUInt32LE(0);
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function main({ dir = DEFAULT_DIR, out = 'docs/experiments/v5-multi-item-luna-sol-review-2026-10-08' } = {}) {
  const cases = read(`${dir}/cases.json`), questionIds = [...new Set(cases.map(c => c.questionId))];
  const groups = [];
  for (const model of Object.keys(MODELS)) {
    if (!existsSync(`${dir}/${model}`)) throw new Error(`Missing results: ${model}`);
    const cells = readdirSync(`${dir}/${model}`).filter(f => /^[ICDSM]\d+-r[123]\.json$/u.test(f)).sort()
      .map(file => ({ file, cell: read(`${dir}/${model}/${file}`) }));
    for (const questionId of questionIds) {
      const prefix = String.fromCharCode(65 + groups.length), packet = [], key = {};
      const order = shuffle(cells.filter(({ cell }) => cell.questionId === questionId), `multi-item-review-${model}-${questionId}`);
      for (const [i, { file, cell }] of order.entries()) {
        const c = cases.find(c => c.id === cell.id);
        if (!c || c.questionId !== questionId) throw new Error(`Unknown case: ${file}`);
        const id = `${prefix}${String(i + 10).padStart(2, '0')}`;
        key[id] = `${model}:${file.replace('.json', '')}`;
        const a = cell.call?.rawOutput;
        packet.push(cell.status !== 'VALID' || !a ? { id, status: cell.status, error: cell.error } : {
          id, studentResponse: c.rationale, choiceId: c.choiceId, contentAssessment: a.contentAssessment,
          reconstructability: a.reconstructability, phase: cell.after?.phase ?? null, reason: a.reason,
          reconstructedPath: a.reconstructedPath, studentClaims: cell.studentClaims,
          errors: (cell.after?.errors ?? []).map(e => ({ description: e.description, question: e.question })),
          selectionMismatchQuestion: a.selectionMismatchQuestion, coaching: a.coaching,
        });
      }
      groups.push({ prefix, model, questionId, packet, key });
    }
  }
  mkdirSync(out, { recursive: true });
  for (const { prefix, packet, key } of groups) {
    writeFileSync(`${out}/REVIEW-blind-packet-${prefix}.json`, JSON.stringify(packet, null, 1) + '\n');
    writeFileSync(`${out}/REVIEW-blind-key-${prefix}.json`, JSON.stringify(key, null, 1) + '\n');
  }
  return groups.map(({ prefix, model, questionId, packet }) => ({ prefix, model, questionId, cells: packet.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(main()));
