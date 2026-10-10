// 공급자 비교 시험(공손룡 12번) 블라인드 의미 검토용 묶음을 만든다. API 호출 없음.
// 설정마다 33칸을 섞은 무작위 id로 내보내고, id→칸 대응표는 따로 저장한다.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const D = 'docs/experiments/v5-provider-compare-gongsun-2026-10-07';
const OUT = 'docs/experiments/v5-provider-compare-review-2026-10-08';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const cases = read(`${D}/cases.json`);
const caseList = Array.isArray(cases) ? cases : cases.cases;
const CONFIGS = { G: 'gemini-3.8-flash-medium', K: 'deepseek-flash-low', H: 'deepseek-flash-high' };

// 시드 고정 셔플(재현 가능)
function shuffle(arr, seed) {
  const a = [...arr]; let s = createHash('sha256').update(seed).digest().readUInt32LE(0);
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
for (const [prefix, config] of Object.entries(CONFIGS)) {
  const files = readdirSync(`${D}/${config}`).filter(f => /^[SX]\d-r\d\.json$/.test(f)).sort();
  const order = shuffle(files, `provider-review-${config}`);
  const packet = []; const key = {};
  order.forEach((f, i) => {
    const cell = read(`${D}/${config}/${f}`);
    const c = caseList.find(x => x.type === cell.type);
    const id = `${prefix}${String(i + 10).padStart(2, '0')}`;
    key[id] = `${config}:${f.replace('.json', '')}`;
    const a = cell.call?.rawOutput ?? null;
    packet.push(cell.status !== 'VALID' || !a ? { id, studentResponse: c.text, status: cell.status, error: cell.error } : {
      id, studentResponse: c.text, contentAssessment: a.contentAssessment, reconstructability: a.reconstructability,
      phase: cell.after?.phase ?? null, reason: a.reason, reconstructedPath: a.reconstructedPath, studentClaims: cell.studentClaims,
      errors: (cell.after?.errors ?? []).map(e => ({ description: e.description, question: e.question })),
      selectionMismatchQuestion: a.selectionMismatchQuestion, coaching: a.coaching,
    });
  });
  writeFileSync(`${OUT}/REVIEW-blind-packet-${prefix}.json`, JSON.stringify(packet, null, 1) + '\n');
  writeFileSync(`${OUT}/REVIEW-blind-key-${prefix}.json`, JSON.stringify(key, null, 1) + '\n');
  console.log(prefix, config, packet.length);
}
