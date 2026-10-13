// D-0108 재시험: REPAIR 절의 엄격 문단을 '국소 오류만 판정' 문단으로 바꾼 실험 지시문으로 luna를 다시 판정한다.
// 세션 재현·검사·원장은 test-v5-repair.mjs를 그대로 쓴다. 운영 지시문 파일은 바꾸지 않는다.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DEFAULT_DIR, loadInputs, createLedger, evaluateRepair, read, jsonHash } from './test-v5-repair.mjs';

export const OUT_DIR = `${DEFAULT_DIR}/repair-local-gpt-6-luna`;
export const SESSIONS = ['S2', 'M2', 'M4', 'I2', 'S3', 'M6', 'D1', 'C2', 'I1'];
const STRICT = `최신 답변이 짧더라도 직전 질문과 누적 문맥에서 수정한 내용이 명확하면 인정한다. 수정한 관계
전체를 다시 쓰거나 공식 해설을 재현하게 요구하지 않는다. 그러나 단순한 동의나 수정 의사만으로
교정을 확정하지 않으며, 한 부분의 수정으로 다른 확인된 오류까지 해소되었다고 추정하지 않는다.
답변이 질문에 맞는다는 사실만으로 교정을 확정하지 않는다. 그 답변이 질문 문맥에서 해당
errorId의 어떤 잘못된 판단을 실제로 수정했는지 확인한다.`;
export const LOCAL = `교정 판정은 교정 질문이 겨냥한 국소 오류만 본다. 학생의 전체 생각이 바뀌었는지는 판정하지 않는다.
학생은 교정 뒤 다시 선택할지 스스로 정한다.
- 교정 질문이 요구한 판단에 맞게 답했으면 그 오류는 REPAIRED다. 답이 짧거나 질문의 일부 칸만 답해도
  그 답이 학생이 틀렸던 판단을 바로잡으면 REPAIRED다. 오류 기록에 함께 적힌 결론, 질문이 묻지 않은 부분,
  처음 발화를 따로 철회했는지는 따지지 않는다.
- 답하면서 같은 국소 오류를 다시 틀리게 말하면 REMAINING이다.
- 동의·수정 의사만 표현하거나 질문을 되풀이해 판단 내용이 없으면 UNCONFIRMED다.
- 선택 불일치 질문에 학생이 불일치를 인정하면 REPAIRED다. 선택은 다음 단계에서 학생이 다시 한다.
- 답변 속 새 오류는 newErrors에 기록하되, 기존 오류의 판정에는 영향을 주지 않는다.`;
export function localInstructions(methods) {
  if (!methods.includes(STRICT)) throw new Error('Strict REPAIR paragraph not found');
  return methods.replace(STRICT, LOCAL);
}
const LIMITS = { maxRequests: 160, usdCap: 0.4 };

export async function main({ mode = 'run', transport, dir = OUT_DIR } = {}) {
  const base = loadInputs(), instructions = localInstructions(base.prompts.methods);
  const data = { ...base, prompts: { ...base.prompts, methods: instructions } };
  const variants = data.suite.variants.filter(v => SESSIONS.includes(v.session));
  const frozen = { instructionsHash: createHash('sha256').update(instructions).digest('hex'),
    baseFrozen: jsonHash(read(`${DEFAULT_DIR}/FROZEN.json`)), runner: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
    variants: variants.map(v => v.id), repetitions: 3, limits: LIMITS };
  mkdirSync(dir, { recursive: true });
  const frozenPath = `${dir}/FROZEN.json`;
  if (existsSync(frozenPath)) { if (JSON.stringify(read(frozenPath)) !== JSON.stringify(frozen)) throw new Error('FROZEN mismatch'); }
  else writeFileSync(frozenPath, JSON.stringify(frozen, null, 2) + '\n');
  writeFileSync(`${dir}/instructions-local.md`, instructions);
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
