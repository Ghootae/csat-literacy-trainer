// 구조 목록 4단계: 유형마다 하위 구조 (PLAN.md 17절).
// 실행: 저장소 루트에서  node docs/experiments/structure-catalog/substructures.mjs            (호출)
//                        node docs/experiments/structure-catalog/substructures.mjs summary    (SUBSTRUCTURES.md)
// 환경 변수: TYPES (쉼표로 구분한 유형 코드), CONCURRENCY (기본 4), FORCE=1, GEN_MODEL, BUDGET_USD (기본 5)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const EX = path.join(DIR, 'extract');
const LB = path.join(DIR, 'labels');
const SB = path.join(DIR, 'substructures');
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const BUDGET = Number(process.env.BUDGET_USD || 5);
const RATE = { in: 2 / 1e6, out: 10 / 1e6 };
const WAITS = [15000, 45000, 90000];
const cmd = process.argv[2];

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
  client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
  return client;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const parseJson = (t) => {
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
};

const usagePath = path.join(SB, '_usage.json');
let usageLog = [];
let spent = 0;
let stopped = false;
const costOf = (u) => (u ? (u.input_tokens || 0) * RATE.in + (u.output_tokens || 0) * RATE.out : 0);
const saveUsage = () => fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));

async function callApi(tag, instructions, input) {
  for (let k = 0; k <= WAITS.length; k++) {
    if (stopped) throw new Error('예산 상한으로 중단');
    const t0 = Date.now();
    try {
      const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort: 'high' }, instructions, input }).finalResponse();
      usageLog.push({ tag, try: k + 1, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), ts: Date.now(), usage: res.usage });
      spent += costOf(res.usage);
      saveUsage();
      if (spent > BUDGET) { stopped = true; console.error(`예산 상한 $${BUDGET} 초과 (누적 $${spent.toFixed(2)}). 새 호출을 멈춥니다.`); }
      return res.output_text;
    } catch (e) {
      const msg = String(e.message || e);
      usageLog.push({ tag, try: k + 1, error: msg.slice(0, 200), seconds: Math.round((Date.now() - t0) / 1000), ts: Date.now() });
      saveUsage();
      const transient = /connection|terminated|timed? ?out|ECONN|ETIMEDOUT|socket|fetch failed|network|5\d\d/i.test(msg);
      if (!transient || k === WAITS.length) throw e;
      console.log(`[${tag}] 오류(${msg.slice(0, 60)}), ${WAITS[k] / 1000}초 뒤 다시`);
      await sleep(WAITS[k]);
    }
  }
}

const vocab = readJson(path.join(DIR, 'vocab.json'));
const vocabText = '# 통일 어휘\n' + vocab.groups.map((g) => `## ${g.group} — ${g.about}\n` + g.functions.map((f) => `- ${f.name}: ${f.definition}`).join('\n')).join('\n') + '\n';
const defs = readJson(path.join(DIR, 'types', 'defs.json'));
const finals = readJson(path.join(DIR, 'types', 'final.json'));

function itemText(id) {
  const d = readJson(path.join(EX, `${id}.json`));
  const l = readJson(path.join(LB, `${id}.json`));
  const arr = d.paragraphs.map((p, i) => `${p.p} ${l.paragraphs[i].label}${l.paragraphs[i].label2 ? `(${l.paragraphs[i].label2})` : ''}`).join(' → ');
  const lines = [
    `set_id: ${id}`,
    `목적: ${d.purpose.abstract}`,
    `논리: ${d.logic.abstract}`,
    `중심 물음이 처음 드러나는 곳: ${d.question_first_visible ?? '없음'}`,
    `문단 기능 배열: ${arr}`,
    `구조 특징: ${JSON.stringify(d.features)}`,
    `만나는 곳: ${JSON.stringify(d.meetings ?? [])}`,
    `비워 둔 곳: ${JSON.stringify(d.left_to_reader ?? [])}`,
  ];
  if (d.texts) {
    lines.push(`글들의 관계: ${typeof d.pair_relation === 'string' ? d.pair_relation : JSON.stringify(d.pair_relation)}`);
    for (const k of Object.keys(d.texts)) {
      const seq = d.paragraphs.map((p, i) => [p, l.paragraphs[i].label]).filter(([p]) => String(p.p).replace(/[0-9]+$/, '') === k).map(([p, x]) => `${p.p} ${x}`);
      lines.push(`글 (${k}): 종류: ${l.kinds?.[k] ?? '?'} / 목적: ${d.texts[k].purpose} / 배열: ${seq.join(' → ')}`);
    }
  }
  return lines.join('\n');
}

function buildInput(t) {
  const ids = finals.filter((x) => x.type === t.code).map((x) => x.set_id);
  const head = `# 1차 유형\n코드: ${t.code}\n이름: ${t.name}\n하는 일: ${t.does}\n가르는 기준: ${t.criteria}\n\n${vocabText}\n# 이 유형의 지문 ${ids.length}편\n\n`;
  return { ids, text: head + ids.map((id, i) => `## ${i + 1}\n${itemText(id)}`).join('\n\n') + '\n' };
}

function check(out, t, ids) {
  const bad = [];
  if (!out || !Array.isArray(out.substructures)) return ['형식 오류'];
  const others = Array.isArray(out.others) ? out.others : [];
  const seen = {};
  const n = ids.length;
  const subs = out.substructures;
  const [lo, hi] = n <= 5 ? [1, 2] : [2, 5];
  if (subs.length < lo || subs.length > hi) bad.push(`하위 구조 수 ${subs.length} (${lo}~${hi})`);
  for (const s of subs) {
    if (!String(s.code || '').startsWith(t.code)) bad.push(`code ${s.code}가 ${t.code}로 시작하지 않음`);
    const mem = s.members || [];
    if (mem.length < 2) bad.push(`${s.code}: members ${mem.length}편 (2편 이상)`);
    for (const id of mem) seen[id] = (seen[id] || 0) + 1;
    for (const e of s.examples || []) if (!mem.includes(e)) bad.push(`${s.code}: examples ${e}가 members에 없음`);
  }
  for (const o of others) seen[o.set_id] = (seen[o.set_id] || 0) + 1;
  const miss = ids.filter((i) => !seen[i]);
  const dup = Object.entries(seen).filter(([, c]) => c > 1).map(([k]) => k);
  const extra = Object.keys(seen).filter((k) => !ids.includes(k));
  if (miss.length) bad.push(`빠진 set_id ${miss.length}개`);
  if (dup.length) bad.push(`중복 set_id ${dup.length}개`);
  if (extra.length) bad.push(`이 유형에 없는 set_id ${extra.length}개`);
  if (others.length > n * 0.2) bad.push(`others ${others.length}개 (20% 초과)`);
  return bad;
}

async function main() {
  fs.mkdirSync(SB, { recursive: true });
  usageLog = fs.existsSync(usagePath) ? readJson(usagePath) : [];
  spent = usageLog.reduce((s, e) => s + costOf(e.usage), 0);
  const instr = fs.readFileSync(path.join(DIR, 'prompts', '4-substructure.md'), 'utf8');
  let list = defs;
  if (process.env.TYPES) { const s = new Set(process.env.TYPES.split(',').map((x) => x.trim())); list = defs.filter((t) => s.has(t.code)); }
  const todo = list.filter((t) => process.env.FORCE || !fs.existsSync(path.join(SB, `${t.code}.json`)));
  console.log(`유형 ${list.length}개 중 할 것 ${todo.length}개 (동시 ${CONCURRENCY}), 예산 $${BUDGET}, 지금까지 $${spent.toFixed(2)}`);
  const checkPath = path.join(SB, '_check.json');
  const checks = fs.existsSync(checkPath) ? readJson(checkPath) : {};
  const t0 = Date.now();
  let idx = 0;
  async function run(t) {
    const inp = buildInput(t);
    let out = null, bad = ['호출 실패'];
    for (let a = 1; a <= 2; a++) {
      try {
        out = parseJson(await callApi(`${t.code}#${a}`, instr, inp.text));
        bad = check(out, t, inp.ids);
      } catch (e) { bad = [`호출 실패: ${String(e.message || e).slice(0, 80)}`]; if (stopped) break; continue; }
      if (!bad.length) break;
      console.log(`[${t.code}] 점검 걸림 (${a}번째): ${bad.slice(0, 3).join(' / ')}`);
    }
    checks[t.code] = { ok: !bad.length, n: inp.ids.length, problems: bad };
    fs.writeFileSync(checkPath, JSON.stringify(checks, null, 2));
    if (out) fs.writeFileSync(path.join(SB, `${t.code}.json`), JSON.stringify({ _meta: { model: MODEL, effort: 'high', n: inp.ids.length }, ...out }, null, 2));
    console.log(`[${t.code}] ${bad.length ? '점검 걸린 채 저장: ' + bad.join(' / ') : out ? '완료' : '결과 없음'} (누적 $${spent.toFixed(2)})`);
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (idx < todo.length && !stopped) await run(todo[idx++]); }));
  console.log(`끝: ${Math.round((Date.now() - t0) / 1000)}초, 누적 $${spent.toFixed(2)}`);
}

// ---- summary ----
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
function summary() {
  const fin = Object.fromEntries(finals.map((x) => [x.set_id, x]));
  const checks = fs.existsSync(path.join(SB, '_check.json')) ? readJson(path.join(SB, '_check.json')) : {};
  const label = (id) => {
    const d = readJson(path.join(EX, `${id}.json`));
    const mm = d._meta || {};
    const ag = fin[id]?.agreement;
    return `${id} (${mm.label ?? ''} ${mm.question_range ?? ''}, ${mm.title ?? ''})${ag && ag !== 3 ? ` [세 번 중 ${ag}]` : ''}`;
  };
  let m = '# 4단계 결과: 유형별 하위 구조 (SUBSTRUCTURES)\n\n하위 구조의 내용은 모델 출력을 그대로 옮겼다. 지문 본문과 point는 넣지 않았다. 예시는 시험·문항 번호·제목이다. final.json의 agreement가 3이 아니면 "세 번 중 n"을 붙였다.\n\n';
  m += '| 유형 | 지문 수 | 하위 구조 수 | others | 자동 점검 |\n|---|---|---|---|---|\n';
  const R = {};
  for (const t of defs) {
    const f = path.join(SB, `${t.code}.json`);
    if (fs.existsSync(f)) R[t.code] = readJson(f);
    const c = checks[t.code];
    m += `| ${t.code} ${esc(t.name)} | ${finals.filter((x) => x.type === t.code).length} | ${R[t.code]?.substructures?.length ?? '-'} | ${R[t.code]?.others?.length ?? '-'} | ${c ? (c.ok ? '통과' : '걸림: ' + esc(c.problems.join(' / '))) : '결과 없음'} |\n`;
  }
  m += '\n';
  for (const t of defs) {
    const r = R[t.code];
    m += `# ${t.code} ${t.name} (${finals.filter((x) => x.type === t.code).length}편)\n\n`;
    if (!r) { m += '결과 없음\n\n'; continue; }
    m += `| code | name | array | members | axes |\n|---|---|---|---|---|\n`;
    for (const s of r.substructures) m += `| ${esc(s.code)} | ${esc(s.name)} | ${esc(s.array)} | ${(s.members || []).length} | ${esc(Object.entries(s.axes || {}).map(([k, v]) => `${k}: ${v}`).join('; '))} |\n`;
    m += '\n';
    for (const s of r.substructures) {
      m += `## ${s.code} ${s.name}\n\n- issue_logic: ${s.issue_logic}\n- choose_when: ${s.choose_when}\n- hooks: ${s.hooks}\n- examples:\n${(s.examples || []).map((e) => `  - ${label(e)}`).join('\n')}\n\n`;
    }
    m += `### others\n\n${r.others?.length ? '| set_id | 까닭 |\n|---|---|\n' + r.others.map((o) => `| ${o.set_id} | ${esc(o.reason)} |`).join('\n') : '없음'}\n\n### notes\n\n${r.notes || '없음'}\n\n`;
  }
  const u = fs.existsSync(usagePath) ? readJson(usagePath) : [];
  const ok = u.filter((e) => e.usage), er = u.filter((e) => e.error);
  const i = ok.reduce((s, e) => s + e.usage.input_tokens, 0), o = ok.reduce((s, e) => s + e.usage.output_tokens, 0);
  const rs = ok.reduce((s, e) => s + (e.usage.output_tokens_details?.reasoning_tokens || 0), 0);
  const ts = u.map((e) => e.ts).filter(Boolean);
  m += `# 호출·시간·토큰\n\n- 응답 받은 호출 ${ok.length}번, 오류 ${er.length}번\n- 입력 토큰 ${i}, 출력 토큰 ${o} (추론 ${rs})\n- 비용 $${(i * RATE.in + o * RATE.out).toFixed(3)} (단가 입력 $2/1M, 출력 $10/1M, 캐시 할인 없이)\n- 호출 시간 합 ${ok.reduce((s, e) => s + e.seconds, 0)}초 (동시 ${CONCURRENCY}개), 첫 기록~마지막 기록 ${ts.length ? Math.round((Math.max(...ts) - Math.min(...ts)) / 1000) : 0}초\n`;
  fs.writeFileSync(path.join(DIR, 'SUBSTRUCTURES.md'), m);
  console.log('SUBSTRUCTURES.md 작성');
}

if (cmd === 'summary') summary();
else await main();
