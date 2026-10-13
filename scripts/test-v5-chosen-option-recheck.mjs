// D-0112 4항 확인: sol 종료 지시문에 "4) 마지막으로 고른 선지가 왜 답이 아닌지" 추가 뒤, 해당 유형과 대조 유형만 다시 실행한다.
// 실행기·검사는 test-v5-live-connection.mjs를 그대로 쓴다. 운영 코드는 바꾸지 않는다.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CELLS, loadInputs, validateInputs, createLedger, executeCell, summarize } from './test-v5-live-connection.mjs';

export const OUT = 'docs/experiments/v5-chosen-option-recheck-2026-10-11';
// L6·L10·L11: 지난 시험에서 고른 선지 언급이 빠진 유형. L1·L4: 근거가 있는 대조 유형.
export const IDS = ['L6', 'L10', 'L11', 'L1', 'L4'];
const LIMITS = { 'gpt-6.1-sol': { requests: 20, usd: 0.5, input: 2, output: 10 }, 'gpt-6-luna': { requests: 20, usd: 0.05, input: 0.10, output: 0.50 } };

export async function main({ transport } = {}) {
  const data = loadInputs(); await validateInputs(data);
  mkdirSync(OUT, { recursive: true });
  const ledger = createLedger(`${OUT}/requests.jsonl`, transport, LIMITS);
  const rows = [];
  for (const r of [1, 2]) for (const id of IDS) {
    const path = `${OUT}/${id}-r${r}.json`;
    if (existsSync(path)) continue;
    const row = await executeCell(CELLS.find(c => c.id === id), r, data, ledger, { recordsPath: `${OUT}/${id}-r${r}.records.jsonl` });
    writeFileSync(path, JSON.stringify(row, null, 2) + '\n', { flag: 'wx' }); rows.push(row);
    if (ledger.stop) break;
  }
  const summary = summarize(rows, ledger, ledger.stop);
  writeFileSync(`${OUT}/RESULTS.json`, JSON.stringify(summary, null, 2) + '\n');
  return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await main()).slice(0, 2000));
