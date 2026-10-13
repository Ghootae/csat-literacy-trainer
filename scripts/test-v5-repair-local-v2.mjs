// D-0108 재시험 2차: 같은 답변 안에서 원래 오류의 잘못된 판단을 다시 말하면 REMAINING(사용자 결정 2026-10-10, (가)).
// 1차 스크립트(test-v5-repair-local.mjs)는 고정 해시를 지키기 위해 그대로 두고, 지시문·변형만 바꿔 다시 판정한다.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DEFAULT_DIR, loadInputs, createLedger, evaluateRepair, read, jsonHash } from './test-v5-repair.mjs';
import { LOCAL } from './test-v5-repair-local.mjs';

export const OUT_DIR = `${DEFAULT_DIR}/repair-local-v2-gpt-6-luna`;
const STRICT_START = '최신 답변이 짧더라도 직전 질문과 누적 문맥에서 수정한 내용이 명확하면 인정한다.';
const STRICT_END = 'errorId의 어떤 잘못된 판단을 실제로 수정했는지 확인한다.';
export const LOCAL_V2 = LOCAL.replace('- 답하면서 같은 국소 오류를 다시 틀리게 말하면 REMAINING이다.',
  `- 질문 밖의 부분을 말하지 않았다고 감점하지 않는다. 다만 이번 답변에서 원래 오류 기록에 적힌 잘못된 판단을
  다시 말하면(질문이 묻지 않은 부분이어도) REMAINING이다. 학생 머릿속을 추측하는 것이 아니라 이번 답변에 명시된 말을 본다.`);
if (LOCAL_V2 === LOCAL) throw new Error('LOCAL_V2 replacement failed');
export function instructionsV2(methods) {
  const i = methods.indexOf(STRICT_START), j = methods.indexOf(STRICT_END);
  if (i < 0 || j < 0) throw new Error('Strict REPAIR paragraph not found');
  return methods.slice(0, i) + LOCAL_V2 + methods.slice(j + STRICT_END.length);
}
// 1차에서 확인한 기대값 정정과 대조 변형(Claude, 2026-10-10).
const OVERRIDES = { 'M4-6': { statuses: { E1: 'NOT_REPAIRED' }, repairSuccess: false,
  basis: '낮은 pH 칸만 답해 학생이 틀렸던 높은 pH 판단을 건드리지 않음(경계 6번 규칙상 미수정)' } };
const EXTRA = [{ id: 'M4-6b', session: 'M4', type: 'A', boundary: 6, correctChoice: false,
  answers: { E1: '높은 pH에서는 중성이에요.' }, expected: { statuses: { E1: 'REPAIRED' }, newErrors: 'NONE', repairSuccess: true },
  basis: '학생이 틀렸던 높은 pH 칸만 바르게 답함' }];
const PICK = ['I1-A', 'I1-C', 'I1-E', 'I1-F', 'S2-A', 'S2-B', 'S2-C', 'S2-E', 'S2-F', 'D2-A', 'D2-D', 'D2-E', 'C1-A', 'C1-B', 'C1-E',
  'D1-short', 'D1-E', 'M2-6', 'M2-F', 'M4-6', 'M4-G', 'M4-F', 'I2-I', 'I2-F', 'S3-I', 'M6-I', 'M6-F', 'C2-A', 'C2-D', 'C2-H'];
const LIMITS = { maxRequests: 160, usdCap: 0.4 };

export async function main({ mode = 'run', transport, dir = OUT_DIR } = {}) {
  const base = loadInputs(), instructions = instructionsV2(base.prompts.methods);
  const data = { ...base, prompts: { ...base.prompts, methods: instructions } };
  const variants = [...PICK.map(id => {
    const v = structuredClone(data.suite.variants.find(x => x.id === id)); if (!v) throw new Error(`Unknown variant ${id}`);
    const o = OVERRIDES[id]; if (o) Object.assign(v, { basis: o.basis, expected: { ...v.expected, statuses: o.statuses, repairSuccess: o.repairSuccess } });
    return v; }), ...EXTRA];
  const frozen = { instructionsHash: createHash('sha256').update(instructions).digest('hex'),
    baseFrozen: jsonHash(read(`${DEFAULT_DIR}/FROZEN.json`)), runner: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    variants, repetitions: 3, limits: LIMITS };
  mkdirSync(dir, { recursive: true });
  const frozenPath = `${dir}/FROZEN.json`;
  if (existsSync(frozenPath)) { if (JSON.stringify(read(frozenPath)) !== JSON.stringify(frozen)) throw new Error('FROZEN mismatch'); }
  else writeFileSync(frozenPath, JSON.stringify(frozen, null, 2) + '\n');
  writeFileSync(`${dir}/instructions-local-v2.md`, instructions);
  if (mode === 'prepare') return { prepared: true, variants: variants.length, cells: variants.length * 3, externalRequests: 0 };
  const ledger = createLedger(`${dir}/requests.jsonl`, 'repair', transport);
  let stop = null;
  for (const r of [1, 2, 3]) for (const v of variants) {
    const path = `${dir}/${v.id}-r${r}.json`;
    if (existsSync(path)) continue;
    const a = ledger.account();
    if (a.requests >= LIMITS.maxRequests || a.conservativeUsd + a.unknownReservedUsd > LIMITS.usdCap) { stop = 'RUN_LIMIT: local limit'; break; }
    const cell = await evaluateRepair(data, v, r, ledger);
    if (cell.status === 'RUN_LIMIT') { stop = cell.error; break; }
    writeFileSync(path, JSON.stringify(cell, null, 2) + '\n', { flag: 'wx' });
  }
  const rows = variants.flatMap(v => [1, 2, 3].map(r => `${dir}/${v.id}-r${r}.json`)).filter(existsSync).map(read);
  const summary = { ...ledger.account(), stop, cells: rows.length, valid: rows.filter(x => x.status === 'VALID').length,
    expectedMatch: rows.filter(x => x.expectedMatch).length,
    falseRepair: rows.filter(x => x.checks.falseRepair.length).map(x => `${x.id}-r${x.replicate}`),
    mismatches: rows.filter(x => !x.expectedMatch).map(x => ({ cell: `${x.id}-r${x.replicate}`, failures: x.checks.failures })) };
  writeFileSync(`${dir}/RESULTS.json`, JSON.stringify(summary, null, 2) + '\n');
  return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await main({ mode: process.argv[2] ?? 'run' })));
}
