// 구조 목록 3단계: 1차 유형 묶기 (PLAN.md 15절).
// 실행: 저장소 루트에서  node docs/experiments/structure-catalog/types.mjs            (호출)
//                        node docs/experiments/structure-catalog/types.mjs summary    (TYPES-RUNS.md)
// 환경 변수: RUNS (기본 1,2,3), WHICH (single | paired, 기본 둘 다), FORCE=1, GEN_MODEL, BUDGET_USD (기본 5)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const EX = path.join(DIR, 'extract');
const LB = path.join(DIR, 'labels');
const TY = path.join(DIR, 'types');
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const BUDGET = Number(process.env.BUDGET_USD || 5);
const RATE = { in: 2 / 1e6, out: 10 / 1e6 };
const WAITS = [15000, 45000, 90000];
const RUNS = (process.env.RUNS || '1,2,3').split(',').map(Number);
const WHICH = process.env.WHICH ? [process.env.WHICH] : ['single', 'paired'];
const RANGE = { single: [5, 10], paired: [4, 8] };
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

// ---- 사용량·예산 ----
const usagePath = path.join(TY, '_usage.json');
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

// ---- 입력 만들기 ----
const vocab = readJson(path.join(DIR, 'vocab.json'));
const groupOf = {};
for (const g of vocab.groups) for (const f of g.functions) groupOf[f.name] = g.group;
const vocabText = '# 통일 어휘\n' + vocab.groups.map((g) => `## ${g.group} — ${g.about}\n` + g.functions.map((f) => `- ${f.name}: ${f.definition}`).join('\n')).join('\n') + '\n';

function load() {
  const out = { single: [], paired: [] };
  for (const f of fs.readdirSync(EX).filter((x) => /^[0-9a-f]{24}\.json$/.test(x)).sort()) {
    const d = readJson(path.join(EX, f));
    const l = readJson(path.join(LB, f));
    out[d.set === 'paired' ? 'paired' : 'single'].push({ d, l });
  }
  return out;
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, seed) { const a = [...arr], r = mulberry(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function itemText(which, { d, l }) {
  const labs = l.paragraphs.map((p) => p.label);
  if (which === 'single') {
    return [`set_id: ${d.set_id}`, `목적: ${d.purpose.abstract}`, `논리: ${d.logic.abstract}`, `기능 배열: ${labs.join(' → ')}`, `묶음 배열: ${labs.map((x) => groupOf[x]).join(' → ')}`].join('\n');
  }
  const lines = [`set_id: ${d.set_id}`, `목적: ${d.purpose.abstract}`, `논리: ${d.logic.abstract}`, `관계: ${typeof d.pair_relation === 'string' ? d.pair_relation : JSON.stringify(d.pair_relation)}`];
  for (const k of Object.keys(d.texts || {})) {
    const seq = d.paragraphs.map((p, i) => [p, l.paragraphs[i].label]).filter(([p]) => String(p.p).replace(/[0-9]+$/, '') === k).map(([, x]) => x);
    lines.push(`글 (${k}): 종류: ${l.kinds?.[k] ?? '?'} / 목적: ${d.texts[k].purpose} / 기능 배열: ${seq.join(' → ')}`);
  }
  return lines.join('\n');
}

function buildInput(which, items, seed) {
  const order = shuffle(items, seed);
  const label = which === 'single' ? `단일 지문 ${items.length}편` : `(가)(나) 세트 ${items.length}개`;
  return { ids: order.map((x) => x.d.set_id), text: `${vocabText}\n# 묶을 자료: ${label}\n\n${order.map((x, i) => `## ${i + 1}\n${itemText(which, x)}`).join('\n\n')}\n` };
}

function check(out, which, ids) {
  const bad = [];
  if (!out || !Array.isArray(out.types) || !Array.isArray(out.assignments)) return ['형식 오류'];
  const unas = Array.isArray(out.unassigned) ? out.unassigned : [];
  const codes = new Set(out.types.map((t) => t.code));
  const seen = {};
  for (const a of out.assignments) { seen[a.set_id] = (seen[a.set_id] || 0) + 1; if (!codes.has(a.type)) bad.push(`${a.set_id}: type ${a.type}이 types에 없음`); }
  for (const u of unas) seen[u.set_id] = (seen[u.set_id] || 0) + 1;
  const miss = ids.filter((i) => !seen[i]);
  const dup = Object.entries(seen).filter(([, c]) => c > 1).map(([k]) => k);
  const extra = Object.keys(seen).filter((k) => !ids.includes(k));
  if (miss.length) bad.push(`빠진 set_id ${miss.length}개`);
  if (dup.length) bad.push(`중복 set_id ${dup.length}개`);
  if (extra.length) bad.push(`입력에 없는 set_id ${extra.length}개`);
  const [lo, hi] = RANGE[which];
  if (out.types.length < lo || out.types.length > hi) bad.push(`유형 수 ${out.types.length} (${lo}~${hi})`);
  if (unas.length > ids.length * 0.1) bad.push(`unassigned ${unas.length}개 (10% 초과)`);
  return bad;
}

async function main() {
  fs.mkdirSync(TY, { recursive: true });
  usageLog = fs.existsSync(usagePath) ? readJson(usagePath) : [];
  spent = usageLog.reduce((s, e) => s + costOf(e.usage), 0);
  const instr = fs.readFileSync(path.join(DIR, 'prompts', '3-types.md'), 'utf8');
  const data = load();
  console.log(`단일 ${data.single.length}, (가)(나) ${data.paired.length}. 실행 ${WHICH.join(',')} × 회차 ${RUNS.join(',')}, 예산 $${BUDGET}`);
  const jobs = [];
  for (const w of WHICH) for (const r of RUNS) jobs.push({ w, r });
  const checkPath = path.join(TY, '_check.json');
  const checks = fs.existsSync(checkPath) ? readJson(checkPath) : {};
  const t0 = Date.now();
  await Promise.all(jobs.map(async ({ w, r }) => {
    const name = `${w}-run${r}`;
    const file = path.join(TY, `${name}.json`);
    if (fs.existsSync(file) && !process.env.FORCE) { console.log(`[${name}] 이미 있음, 건너뜀`); return; }
    const inp = buildInput(w, data[w], r);
    let out = null, bad = ['호출 실패'];
    for (let a = 1; a <= 2; a++) {
      try {
        const t = await callApi(`${name}#${a}`, instr, inp.text);
        out = parseJson(t);
        bad = check(out, w, inp.ids);
      } catch (e) { bad = [`호출 실패: ${String(e.message || e).slice(0, 80)}`]; if (stopped) break; continue; }
      if (!bad.length) break;
      console.log(`[${name}] 점검 걸림 (${a}번째): ${bad.slice(0, 3).join(' / ')}`);
    }
    checks[name] = { ok: !bad.length, problems: bad };
    fs.writeFileSync(checkPath, JSON.stringify(checks, null, 2));
    if (out) fs.writeFileSync(file, JSON.stringify({ _meta: { which: w, run: r, seed: r, model: MODEL, effort: 'high', n: inp.ids.length, order_first5: inp.ids.slice(0, 5) }, ...out }, null, 2));
    console.log(`[${name}] ${bad.length ? '점검 걸린 채 저장: ' + bad.join(' / ') : out ? '완료' : '결과 없음'} (누적 $${spent.toFixed(2)})`);
  }));
  console.log(`끝: ${Math.round((Date.now() - t0) / 1000)}초, 누적 $${spent.toFixed(2)}`);
}

// ---- summary ----
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const comb2 = (n) => (n * (n - 1)) / 2;
function ari(a, b) {
  const ids = Object.keys(a);
  const tab = {}, ra = {}, rb = {};
  for (const i of ids) { const x = a[i], y = b[i]; (tab[x] ||= {}); tab[x][y] = (tab[x][y] || 0) + 1; ra[x] = (ra[x] || 0) + 1; rb[y] = (rb[y] || 0) + 1; }
  let sij = 0; for (const x in tab) for (const y in tab[x]) sij += comb2(tab[x][y]);
  const sa = Object.values(ra).reduce((s, v) => s + comb2(v), 0), sb = Object.values(rb).reduce((s, v) => s + comb2(v), 0);
  const exp = (sa * sb) / comb2(ids.length), mx = (sa + sb) / 2;
  return mx === exp ? 1 : (sij - exp) / (mx - exp);
}
const jac = (A, B) => { const a = new Set(A), b = new Set(B); let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 1; };

function summary() {
  const data = load();
  const meta = {};
  for (const w of WHICH) for (const { d } of data[w]) meta[d.set_id] = d;
  const pilot = [...new Set((fs.readFileSync(path.join(DIR, 'PILOT.md'), 'utf8').match(/\b[0-9a-f]{24}\b/g) || []))];
  const REVERSE = ['69bbf88d8937cf14551903ca', '6a213ea086fd308968e101df', '6a213e9386fd308968e100b3', '69c01e63fa5063deffe1b596'];
  const checks = fs.existsSync(path.join(TY, '_check.json')) ? readJson(path.join(TY, '_check.json')) : {};
  let m = '# 3단계 결과: 1차 유형 묶기 세 번 (TYPES-RUNS)\n\n통계와 유형 정의만 적는다. 지문 내용은 옮기지 않는다. 같은 입력을 지문 순서만 바꿔(seed 1·2·3) 세 번씩 불렀다.\n\n';
  for (const w of ['single', 'paired']) {
    const title = w === 'single' ? '단일 지문' : '(가)(나) 세트';
    const R = {};
    for (const r of [1, 2, 3]) { const f = path.join(TY, `${w}-run${r}.json`); if (fs.existsSync(f)) R[r] = readJson(f); }
    const runs = Object.keys(R).map(Number);
    m += `# ${title} (${data[w].length}개)\n\n`;
    if (!runs.length) { m += '결과 없음\n\n'; continue; }
    // 묶음: set_id → 유형 code (unassigned → 'U')
    const G = {};
    for (const r of runs) {
      G[r] = {};
      for (const a of R[r].assignments || []) G[r][a.set_id] = a.type;
      for (const u of R[r].unassigned || []) G[r][u.set_id] = 'U';
    }
    m += `## 실행마다 유형\n\n`;
    for (const r of runs) {
      const c = checks[`${w}-run${r}`];
      m += `### 실행 ${r}\n\n자동 점검: ${c ? (c.ok ? '통과' : '걸림 — ' + c.problems.join(' / ')) : '기록 없음'}. 유형 ${R[r].types.length}개, unassigned ${(R[r].unassigned || []).length}개\n\n`;
      m += `| code | name | definition | criteria | signature | 지문 수 | fit 약 |\n|---|---|---|---|---|---|---|\n`;
      for (const t of R[r].types) {
        const as = (R[r].assignments || []).filter((a) => a.type === t.code);
        m += `| ${esc(t.code)} | ${esc(t.name)} | ${esc(t.definition)} | ${esc(t.criteria)} | ${esc((t.signature || []).join(' // '))} | ${as.length} | ${as.filter((a) => a.fit === '약').length} |\n`;
      }
      m += `\nunassigned: ${(R[r].unassigned || []).length ? '\n\n| set_id | 까닭 |\n|---|---|\n' + R[r].unassigned.map((u) => `| ${u.set_id} | ${esc(u.reason)} |`).join('\n') : '없음'}\n\nnotes: ${esc(R[r].notes) || '없음'}\n\n`;
    }
    // 일치도
    m += `## 일치도 (ARI, unassigned는 하나의 무리)\n\n| 쌍 | ARI |\n|---|---|\n`;
    for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
      const ids = Object.keys(G[runs[i]]).filter((x) => x in G[runs[j]]);
      const a = {}, b = {}; for (const x of ids) { a[x] = G[runs[i]][x]; b[x] = G[runs[j]][x]; }
      m += `| ${runs[i]}-${runs[j]} | ${ari(a, b).toFixed(3)} |\n`;
    }
    // 짝짓기
    const base = runs[0];
    const members = (r, code) => Object.entries(G[r]).filter(([, c]) => c === code).map(([k]) => k);
    m += `\n## 유형 짝짓기 (실행 ${base}의 유형 → 다른 실행에서 구성원이 가장 많이 겹치는 유형, Jaccard)\n\n| 실행 ${base} 유형 | 수 | ${runs.slice(1).map((r) => `실행 ${r}`).join(' | ')} |\n|---|---|${runs.slice(1).map(() => '---').join('|')}|\n`;
    for (const t of R[base].types) {
      const mem = members(base, t.code);
      const cols = runs.slice(1).map((r) => {
        let best = null, bj = -1;
        for (const u of R[r].types) { const j = jac(mem, members(r, u.code)); if (j > bj) { bj = j; best = u; } }
        return best ? `${best.code} ${esc(best.name)} (${members(r, best.code).length}) J=${bj.toFixed(2)}` : '-';
      });
      m += `| ${t.code} ${esc(t.name)} | ${mem.length} | ${cols.join(' | ')} |\n`;
    }
    // 흔들린 지문
    const clusterOf = (r, id) => Object.entries(G[r]).filter(([k, c]) => c === G[r][id] && k !== id).map(([k]) => k);
    const wob = Object.keys(G[base]).map((id) => {
      const pairs = []; for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) pairs.push(jac(clusterOf(runs[i], id), clusterOf(runs[j], id)));
      return { id, s: pairs.reduce((a, b) => a + b, 0) / pairs.length };
    }).sort((a, b) => a.s - b.s);
    m += `\n## 흔들린 지문 (같은 유형에 든 다른 지문들의 Jaccard 평균, 낮은 순 20개)\n\n| set_id | 평균 | ${runs.map((r) => `실행 ${r}`).join(' | ')} |\n|---|---|${runs.map(() => '---').join('|')}|\n`;
    for (const x of wob.slice(0, 20)) m += `| ${x.id} | ${x.s.toFixed(2)} | ${runs.map((r) => G[r][x.id] ?? '-').join(' | ')} |\n`;
    m += `\n전체 평균 ${(wob.reduce((a, b) => a + b.s, 0) / wob.length).toFixed(3)}, 0.5 미만 ${wob.filter((x) => x.s < 0.5).length}개\n`;
    // 분포
    m += `\n## 실행 ${base} 기준 유형별 분포\n\n| 유형 | 수 | field | 출처 | 학년 |\n|---|---|---|---|---|\n`;
    const dist = (ids, fn) => { const o = {}; for (const id of ids) for (const v of [].concat(fn(meta[id]))) o[v] = (o[v] || 0) + 1; return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${c}`).join(', '); };
    const codes = [...R[base].types.map((t) => t.code), ...(R[base].unassigned?.length ? ['U'] : [])];
    for (const c of codes) {
      const ids = members(base, c);
      const nm = c === 'U' ? 'unassigned' : R[base].types.find((t) => t.code === c).name;
      m += `| ${c} ${esc(nm)} | ${ids.length} | ${esc(dist(ids, (d) => (d.field || '없음').split(',').map((x) => x.trim()).filter(Boolean)))} | ${esc(dist(ids, (d) => d._meta?.provider || 'unknown'))} | ${esc(dist(ids, (d) => String(d._meta?.grade ?? '?')))} |\n`;
    }
    // 특정 지문
    const pick = (ids) => ids.filter((id) => id in G[base]);
    const nameOf = (r, code) => (code === 'U' ? 'unassigned' : R[r].types.find((t) => t.code === code)?.name ?? '?');
    for (const [ttl, ids] of [['역분해 4지문', pick(REVERSE)], ['시험 실행 10편', pick(pilot)]]) {
      m += `\n## ${ttl}이 들어간 유형 (${title})\n\n`;
      if (!ids.length) { m += '이 갈래에 해당하는 지문 없음\n'; continue; }
      m += `| set_id | ${runs.map((r) => `실행 ${r}`).join(' | ')} |\n|---|${runs.map(() => '---').join('|')}|\n`;
      for (const id of ids) m += `| ${id} | ${runs.map((r) => `${G[r][id]} ${esc(nameOf(r, G[r][id]))}`).join(' | ')} |\n`;
    }
    m += '\n';
  }
  const u = fs.existsSync(usagePath) ? readJson(usagePath) : [];
  const ok = u.filter((e) => e.usage), er = u.filter((e) => e.error);
  const i = ok.reduce((s, e) => s + e.usage.input_tokens, 0), o = ok.reduce((s, e) => s + e.usage.output_tokens, 0);
  const rs = ok.reduce((s, e) => s + (e.usage.output_tokens_details?.reasoning_tokens || 0), 0);
  const ts = u.map((e) => e.ts).filter(Boolean);
  m += `# 호출·시간·토큰\n\n- 응답 받은 호출 ${ok.length}번, 오류 ${er.length}번\n- 입력 토큰 ${i}, 출력 토큰 ${o} (추론 ${rs})\n- 비용 $${(i * RATE.in + o * RATE.out).toFixed(3)} (단가 입력 $2/1M, 출력 $10/1M, 캐시 할인 없이)\n- 호출 시간 합 ${ok.reduce((s, e) => s + e.seconds, 0)}초, 첫 기록~마지막 기록 ${ts.length ? Math.round((Math.max(...ts) - Math.min(...ts)) / 1000) : 0}초\n`;
  fs.writeFileSync(path.join(DIR, 'TYPES-RUNS.md'), m);
  console.log('TYPES-RUNS.md 작성');
}

if (cmd === 'summary') summary();
else await main();
