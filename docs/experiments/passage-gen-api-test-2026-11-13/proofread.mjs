// 교정 단계 시험: 기존 점검 결과(out/<run>/3-check.md)의 최종 지문에 교정 호출을 한 번씩 붙인다.
// 생성(1~3단계)은 다시 하지 않는다. run.mjs와 REVIEW-blind.md, KEY.md는 건드리지 않는다.
// 실행: 저장소 루트에서  node docs/experiments/passage-gen-api-test-2026-11-13/proofread.mjs
// 환경 변수: GEN_MODEL (기본 gpt-6.1-sol), GEN_EFFORT (기본 high), RUNS (기본 "C-1,C-2,B-1,B-2"), FORCE=1 (캐시 무시)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const RUNS = (process.env.RUNS || 'C-1,C-2,B-1,B-2').split(',').map((s) => s.trim()).filter(Boolean);
const LABEL = { 'C-1': '마', 'C-2': '다', 'B-1': '나', 'B-2': '가' };

const P4 = fs.readFileSync(path.join(DIR, 'prompts', '4-proofread.md'), 'utf8');

let client = null;
function getClient() {
  if (client) return client;
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  let OpenAI;
  for (const p of ['openai', path.join(process.cwd(), 'packages/pipeline/node_modules/openai'), path.join(process.cwd(), 'packages/app/node_modules/openai')]) {
    try { OpenAI = require(p); OpenAI = OpenAI.default ?? OpenAI; break; } catch {}
  }
  if (!OpenAI) throw new Error('openai 패키지를 찾지 못했습니다. 저장소 루트에서 실행하세요.');
  if (!process.env.OPENAI_API_KEY && fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 }); // 재시도하면 중복 과금
  return client;
}

const usagePath = path.join(OUT, 'usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];

async function call(runDir, stage, instructions, input) {
  const cached = path.join(runDir, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${path.basename(runDir)}/${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${path.basename(runDir)}/${stage}] 호출 중 (${MODEL}, ${EFFORT})...`);
  const t0 = Date.now();
  const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, instructions, input }).finalResponse();
  const text = res.output_text;
  fs.writeFileSync(cached, text);
  usageLog.push({ run: path.basename(runDir), stage, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage });
  fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));
  console.log(`[${path.basename(runDir)}/${stage}] 완료 ${Math.round((Date.now() - t0) / 1000)}초`);
  return text;
}

function section(text, title) {
  const i = text.indexOf(`## ${title}`);
  if (i < 0) return '';
  const rest = text.slice(i + title.length + 3);
  const j = rest.search(/\n## /);
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}
const paraList = (text) => text.split('\n').map((l) => l.trim()).filter((l) => /^\[\d+문단\]/.test(l));

async function proofread(run) {
  const runDir = path.join(OUT, run);
  const checkedPath = path.join(runDir, '3-check.md');
  if (!fs.existsSync(checkedPath)) { console.warn(`[${run}] 3-check.md 없음, 건너뜀`); return null; }
  const checked = fs.readFileSync(checkedPath, 'utf8');
  const before = paraList(section(checked, '최종 지문'));
  const table = section(checked, '최종 연결표');
  const out = await call(runDir, '4-proofread', P4, `# 지문\n\n${before.join('\n\n')}\n\n# 연결표\n\n${table}`);
  const after = paraList(section(out, '교정 지문'));
  if (!after.length) console.warn(`[${run}] 경고: 교정 지문을 찾지 못함. 4-proofread.md 형식을 확인하세요.`);
  fs.writeFileSync(path.join(runDir, 'proofread-passage.md'), after.join('\n\n') + '\n');
  return { run, before, after, edits: section(out, '교정 내역'), flags: section(out, '확인 필요') };
}

// 네 지문을 동시에 호출한다 (순서대로 하면 10분 넘게 걸림).
const results = (await Promise.all(RUNS.map(proofread))).filter(Boolean);

let cmp = `# 교정 전후 비교 (${new Date().toISOString().slice(0, 10)})\n\n교정 지시문: prompts/4-proofread.md. 판정 기준: PROOFREAD-PLAN.md. 굵은 글씨 = 밑줄.\n\n`;
for (const r of results) {
  const len = (ps) => ps.map((p) => p.replace(/^\[\d+문단\]\s*/, '')).join(' ').length;
  cmp += `---\n\n## ${LABEL[r.run] ?? ''} (API ${r.run})  길이 ${len(r.before)} → ${len(r.after)}자\n\n`;
  const n = Math.max(r.before.length, r.after.length);
  for (let k = 0; k < n; k++) {
    cmp += `**전** ${r.before[k] ?? '(없음)'}\n\n**후** ${r.after[k] ?? '(없음)'}\n\n`;
  }
  cmp += `### 교정 내역\n\n${r.edits}\n\n### 확인 필요\n\n${r.flags || '(없음)'}\n\n`;
}
fs.writeFileSync(path.join(DIR, 'PROOFREAD-compare.md'), cmp);
console.log('비교: PROOFREAD-compare.md');
