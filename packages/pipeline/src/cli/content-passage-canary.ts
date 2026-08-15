import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { planPassageCanary } from '../passage-canary.js';

const ROOT = process.cwd();
export function runPassageCanaryCli(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--plan');
  if (index < 0 || argv[index + 1] === undefined) throw new Error('--plan 값이 필요하다');
  if (!argv.includes('--dry-run')) throw new Error('passage canary는 현재 --dry-run만 지원한다');
  const value = JSON.parse(readFileSync(resolve(ROOT, argv[index + 1]!), 'utf8')) as unknown;
  const plan = planPassageCanary(value);
  console.log(JSON.stringify(plan, null, 2));
  return plan;
}

const invoked = process.argv[1] === undefined ? '' : pathToFileURL(resolve(process.argv[1])).href;
if (import.meta.url === invoked) {
  try { runPassageCanaryCli(); } catch (error) { console.error(error); process.exitCode = 1; }
}
