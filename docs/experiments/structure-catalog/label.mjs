// 구조 목록 2단계: 기능 이름 맞추기 (PLAN.md 13절).
// 실행: 저장소 루트에서  node docs/experiments/structure-catalog/label.mjs vocab | relabel | summary
// 환경 변수: GEN_MODEL (기본 gpt-6.1-sol), CONCURRENCY (기본 4), IDS, LIMIT, FORCE=1 (relabel),
//            BUDGET_USD (기본 10, 넘으면 멈춤)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const EX = path.join(DIR, 'extract');
const LB = path.join(DIR, 'labels');
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const BUDGET = Number(process.env.BUDGET_USD || 10);
const RATE = { in: 2 / 1e6, out: 10 / 1e6 };
const WAITS = [15000, 45000, 90000]; // 연결 오류 때 다시 부르는 간격 (최대 4번 호출)
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
let usageLog = [];
let usagePath = null;
let spent = 0;
const costOf = (u) => (u ? (u.input_tokens || 0) * RATE.in + (u.output_tokens || 0) * RATE.out : 0);
function initUsage(p) {
  usagePath = p;
  usageLog = fs.existsSync(p) ? readJson(p) : [];
  spent = usageLog.reduce((s, e) => s + costOf(e.usage), 0);
}
const saveUsage = () => fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));
let stopped = false;

// 한 번 부르기 (연결 오류면 최대 4번까지)
async function callApi(tag, instructions, input, effort) {
  for (let k = 0; k <= WAITS.length; k++) {
    if (stopped) throw new Error('예산 상한으로 중단');
    const t0 = Date.now();
    try {
      const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort }, instructions, input }).finalResponse();
      const seconds = Math.round((Date.now() - t0) / 1000);
      usageLog.push({ tag, try: k + 1, model: res.model, seconds, ts: Date.now(), usage: res.usage });
      spent += costOf(res.usage);
      saveUsage();
      if (spent > BUDGET) { stopped = true; console.error(`예산 상한 $${BUDGET} 초과 (누적 $${spent.toFixed(2)}). 중단합니다.`); }
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

const loadSets = () => fs.readdirSync(EX).filter((f) => /^[0-9a-f]{24}\.json$/.test(f)).sort().map((f) => readJson(path.join(EX, f)));

// ---- vocab ----
function vocabCheck(v) {
  const bad = [];
  if (!v || !Array.isArray(v.groups) || !Array.isArray(v.kinds)) return ['형식 오류'];
  const fns = v.groups.flatMap((g) => g.functions || []);
  const names = fns.map((f) => f.name);
  if (v.groups.length < 5 || v.groups.length > 8) bad.push(`묶음 수 ${v.groups.length} (5~8)`);
  if (fns.length < 25 || fns.length > 40) bad.push(`기능 수 ${fns.length} (25~40)`);
  if (v.kinds.length < 4 || v.kinds.length > 8) bad.push(`글 종류 수 ${v.kinds.length} (4~8)`);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) bad.push(`기능 이름 겹침: ${[...new Set(dup)].join(', ')}`);
  const kn = v.kinds.map((k) => k.name);
  const kd = kn.filter((n, i) => kn.indexOf(n) !== i);
  if (kd.length) bad.push(`글 종류 이름 겹침: ${[...new Set(kd)].join(', ')}`);
  return bad;
}

async function vocab() {
  initUsage(path.join(DIR, 'vocab-usage.json'));
  const sets = loadSets();
  const fc = {}, kc = {};
  for (const d of sets) {
    for (const p of d.paragraphs) {
      if (p.function) (fc[p.function] ||= { function: 0, secondary: 0 }).function++;
      if (p.secondary) (fc[p.secondary] ||= { function: 0, secondary: 0 }).secondary++;
    }
    for (const t of Object.values(d.texts || {})) if (t?.kind) kc[t.kind] = (kc[t.kind] || 0) + 1;
  }
  const fl = Object.entries(fc).sort((a, b) => b[1].function + b[1].secondary - a[1].function - a[1].secondary);
  const input = `# 기능 이름 목록 (이름 | function 횟수 | secondary 횟수)\n${fl.map(([n, c]) => `${n} | ${c.function} | ${c.secondary}`).join('\n')}\n\n# 글 종류 목록 (kind | 횟수)\n${Object.entries(kc).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} | ${c}`).join('\n')}\n`;
  const instr = fs.readFileSync(path.join(DIR, 'prompts', '2a-vocab.md'), 'utf8');
  let v = null, bad = [];
  for (let a = 1; a <= 2; a++) {
    console.log(`2a 호출 ${a} (이름 ${fl.length}개, 글 종류 ${Object.keys(kc).length}개)`);
    const t = await callApi(`vocab-${a}`, instr, input, 'high');
    const parsed = parseJson(t);
    const b = vocabCheck(parsed);
    if (parsed) { v = parsed; bad = b; }
    if (parsed && !b.length) break;
    console.log(`점검 걸림: ${b.join(' / ')}`);
  }
  if (!v) throw new Error('어휘 결과를 해석하지 못함');
  v._check = bad;
  fs.writeFileSync(path.join(DIR, 'vocab.json'), JSON.stringify(v, null, 2));
  makeVocabMd(v, fc, kc);
  console.log(bad.length ? `기준을 벗어남(그대로 저장): ${bad.join(' / ')}` : '어휘 점검 통과');
  console.log(`비용 $${spent.toFixed(3)}. vocab.json, VOCAB.md`);
}

function makeVocabMd(v, fc, kc) {
  let m = `# 통일 어휘 (2a 결과)\n\n점검: ${v._check?.length ? '기준을 벗어남 — ' + v._check.join(' / ') : '통과'}\n\n`;
  const fns = v.groups.flatMap((g) => g.functions || []);
  m += `묶음 ${v.groups.length}개, 기능 ${fns.length}개, 글 종류 ${v.kinds.length}개\n\n`;
  for (const g of v.groups) {
    m += `## ${g.group}\n\n${g.about}\n\n| 기능 | 정의 | versus | 대표 이름 |\n|---|---|---|---|\n`;
    for (const f of g.functions) m += `| ${f.name} | ${f.definition} | ${f.versus} | ${(f.examples || []).join(', ')} |\n`;
    m += '\n';
  }
  m += `## 글 종류\n\n| 이름 | 정의 | 대표 kind |\n|---|---|---|\n`;
  for (const k of v.kinds) m += `| ${k.name} | ${k.definition} | ${(k.examples || []).join(', ')} |\n`;
  m += `\n## 넣기 어려운 이름\n\n${(v.hard_to_place || []).join(', ') || '없음'}\n`;
  fs.writeFileSync(path.join(DIR, 'VOCAB.md'), m);
}

// ---- relabel ----
function vocabText(v) {
  let t = '# 통일 어휘\n\n';
  for (const g of v.groups) {
    t += `## 묶음: ${g.group} — ${g.about}\n`;
    for (const f of g.functions) t += `- ${f.name}: ${f.definition} (versus: ${f.versus})\n`;
    t += '\n';
  }
  t += '## 글 종류\n' + v.kinds.map((k) => `- ${k.name}: ${k.definition}`).join('\n') + '\n';
  return t;
}

function setInput(d) {
  const o = {
    set_id: d.set_id,
    purpose: d.purpose?.abstract,
    logic: d.logic?.abstract,
    paragraphs: d.paragraphs.map((p) => ({ p: p.p, point: p.point, function: p.function, secondary: p.secondary, move: p.move })),
  };
  if (d.texts) o.texts = d.texts;
  return JSON.stringify(o, null, 1);
}

function labelCheck(out, d, v) {
  const bad = [];
  if (!out || !Array.isArray(out.paragraphs)) return ['형식 오류: paragraphs 없음'];
  const fn = new Set(v.groups.flatMap((g) => g.functions.map((f) => f.name)));
  const kn = new Set(v.kinds.map((k) => k.name));
  const want = d.paragraphs.map((p) => String(p.p));
  const got = out.paragraphs.map((p) => String(p.p));
  if (want.join('|') !== got.join('|')) bad.push(`문단 번호 불일치 (추출 ${want.length}개, 결과 ${got.length}개)`);
  for (const p of out.paragraphs) {
    if (!fn.has(p.label)) bad.push(`${p.p}: label이 어휘에 없음`);
    if (p.label2 != null && !fn.has(p.label2)) bad.push(`${p.p}: label2가 어휘에 없음`);
    if (p.label2 != null && p.label2 === p.label) bad.push(`${p.p}: label2가 label과 같음`);
  }
  if (d.texts) {
    for (const k of Object.keys(d.texts)) {
      const x = out.kinds?.[k];
      if (!x) bad.push(`kinds.${k} 없음`);
      else if (!kn.has(x)) bad.push(`kinds.${k}가 어휘에 없음`);
    }
  }
  return bad;
}

async function relabel() {
  fs.mkdirSync(LB, { recursive: true });
  initUsage(path.join(LB, '_usage.json'));
  const v = readJson(path.join(DIR, 'vocab.json'));
  const instr = fs.readFileSync(path.join(DIR, 'prompts', '2b-relabel.md'), 'utf8') + '\n\n' + vocabText(v);
  let sets = loadSets();
  if (process.env.IDS) { const s = new Set(process.env.IDS.split(',').map((x) => x.trim())); sets = sets.filter((d) => s.has(d.set_id)); }
  if (process.env.LIMIT) sets = sets.slice(0, Number(process.env.LIMIT));
  const checkPath = path.join(LB, '_check.json');
  const checks = fs.existsSync(checkPath) ? readJson(checkPath) : {};
  const todo = sets.filter((d) => process.env.FORCE || !fs.existsSync(path.join(LB, `${d.set_id}.json`)));
  console.log(`대상 ${sets.length}개, 할 것 ${todo.length}개 (동시 ${CONCURRENCY}), 예산 $${BUDGET}, 지금까지 $${spent.toFixed(2)}`);
  const t0 = Date.now();
  let idx = 0, done = 0;
  async function runSet(d) {
    let lastBad = ['호출 실패'], out = null;
    for (let a = 1; a <= 2; a++) {
      let t;
      try { t = await callApi(`${d.set_id}#${a}`, instr, setInput(d), 'medium'); } catch (e) { lastBad = [`호출 실패: ${String(e.message || e).slice(0, 80)}`]; if (stopped) break; continue; }
      out = parseJson(t);
      lastBad = labelCheck(out, d, v);
      if (!lastBad.length) break;
      if (out) fs.writeFileSync(path.join(LB, `${d.set_id}.failed-${a}.json`), JSON.stringify(out, null, 2));
    }
    checks[d.set_id] = { ok: !lastBad.length, problems: lastBad };
    if (!lastBad.length) fs.writeFileSync(path.join(LB, `${d.set_id}.json`), JSON.stringify({ _meta: { set_id: d.set_id, model: MODEL, effort: 'medium' }, ...out }, null, 2));
    fs.writeFileSync(checkPath, JSON.stringify(checks, null, 2));
    done++;
    console.log(`[${done}/${todo.length}] ${d.set_id} ${lastBad.length ? '실패 ' + lastBad[0] : '완료'} (누적 $${spent.toFixed(2)})`);
  }
  async function worker() { while (idx < todo.length && !stopped) await runSet(todo[idx++]); }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const fail = Object.entries(checks).filter(([, c]) => !c.ok).map(([k]) => k);
  console.log(`끝: ${Math.round((Date.now() - t0) / 1000)}초, 실패 ${fail.length}개${fail.length ? ' (' + fail.join(', ') + ')' : ''}, 누적 $${spent.toFixed(2)}`);
}

// ---- summary ----
const REVERSE = ['69bbf88d8937cf14551903ca', '6a213ea086fd308968e101df', '6a213e9386fd308968e100b3', '69c01e63fa5063deffe1b596'];
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function summary() {
  const v = readJson(path.join(DIR, 'vocab.json'));
  const sets = loadSets();
  const L = {};
  for (const d of sets) { const f = path.join(LB, `${d.set_id}.json`); if (fs.existsSync(f)) L[d.set_id] = readJson(f); }
  const ids = sets.filter((d) => L[d.set_id]);
  const fnGroup = {};
  for (const g of v.groups) for (const f of g.functions) fnGroup[f.name] = { g: g.group, f };
  const cnt = {}, cnt2 = {}, from = {};
  const misfit = [];
  let nPar = 0, n2 = 0, nOld2 = 0;
  const byFirst = {};
  const stats = { single: { first: {}, last: {}, pairs: {} }, paired: { first: {}, last: {}, pairs: {} } };
  const seq = {};
  for (const d of ids) {
    const lab = L[d.set_id];
    const paired = !!d.texts;
    const S = stats[paired ? 'paired' : 'single'];
    const byText = {};
    d.paragraphs.forEach((p, i) => {
      const l = lab.paragraphs[i];
      nPar++;
      inc(cnt, l.label);
      if (l.label2) { inc(cnt2, l.label2); n2++; }
      if (p.secondary) nOld2++;
      (from[l.label] ||= {}); inc(from[l.label], p.function);
      (byFirst[p.function] ||= {}); inc(byFirst[p.function], l.label);
      if (l.misfit) misfit.push([d.set_id, p.p, l.label, l.misfit]);
      const key = paired ? String(p.p).replace(/[0-9]+$/, '') : '_';
      (byText[key] ||= []).push(l.label);
    });
    seq[d.set_id] = byText;
    for (const arr of Object.values(byText)) {
      inc(S.first, arr[0]); inc(S.last, arr[arr.length - 1]);
      for (let i = 0; i + 1 < arr.length; i++) inc(S.pairs, `${arr[i]} → ${arr[i + 1]}`);
    }
  }
  let m = `# 2단계 결과: 통일 기능 이름 (LABELS)\n\n통계만 적는다. 지문 내용은 옮기지 않는다. 어휘 정의는 VOCAB.md.\n\n`;
  m += `대상 ${ids.length}/${sets.length}세트, 문단 ${nPar}개. 어휘 점검: ${v._check?.length ? '기준 벗어남 — ' + v._check.join(' / ') : '통과'}\n\n`;
  const fails = fs.existsSync(path.join(LB, '_check.json')) ? Object.entries(readJson(path.join(LB, '_check.json'))).filter(([, c]) => !c.ok) : [];
  if (fails.length) m += `점검에 계속 걸려 결과가 없는 세트 ${fails.length}개: ${fails.map(([k, c]) => `${k} (${c.problems[0]})`).join('; ')}\n\n`;

  m += `## 1. 어휘 표\n\n| 묶음 | 기능 | 정의 | versus | label | label2 | 처음 이름 상위 5 (수) |\n|---|---|---|---|---|---|---|\n`;
  for (const g of v.groups) for (const f of g.functions) {
    const fr = top(from[f.name] || {}, 5).map(([n, c]) => `${n} ${c}`).join(', ');
    m += `| ${esc(g.group)} | ${esc(f.name)} | ${esc(f.definition)} | ${esc(f.versus)} | ${cnt[f.name] || 0} | ${cnt2[f.name] || 0} | ${esc(fr)} |\n`;
  }

  m += `\n## 2. 기준을 넘은 것\n\n`;
  const over = Object.entries(cnt).filter(([, c]) => c / nPar > 0.15);
  m += `- 문단의 15%를 넘게 쓰인 기능: ${over.length ? over.map(([n, c]) => `${n} ${c} (${(100 * c / nPar).toFixed(1)}%)`).join(', ') : '없음'}\n`;
  const allF = Object.keys(fnGroup);
  const few = allF.filter((n) => (cnt[n] || 0) < 3);
  m += `- label로 3번 미만 쓰인 기능: ${few.length ? few.map((n) => `${n} ${cnt[n] || 0}`).join(', ') : '없음'}\n`;
  const outside = Object.keys(cnt).filter((n) => !fnGroup[n]);
  if (outside.length) m += `- 어휘에 없는 label: ${outside.join(', ')}\n`;

  m += `\n## 3. misfit\n\n${misfit.length}개 / ${nPar} (${(100 * misfit.length / nPar).toFixed(1)}%). 기준 5% 이하: ${misfit.length / nPar <= 0.05 ? '충족' : '넘음'}\n\n`;
  if (misfit.length) { m += `| set_id | p | label | misfit |\n|---|---|---|---|\n`; for (const x of misfit) m += `| ${x[0]} | ${x[1]} | ${esc(x[2])} | ${esc(x[3])} |\n`; }

  m += `\n## 4. label2\n\n붙은 문단 ${n2}/${nPar} (${(100 * n2 / nPar).toFixed(1)}%). 1단계 secondary: ${nOld2}/${nPar} (${(100 * nOld2 / nPar).toFixed(1)}%)\n`;

  m += `\n## 5. 같은 처음 이름이 서로 다른 기능으로 간 경우\n\n3번 이상 쓰인 처음 이름(function) 중 두 기능 이상으로 갈린 것 상위 20개.\n\n| 처음 이름 | 쓰인 수 | 간 기능 (수) |\n|---|---|---|\n`;
  const split = Object.entries(byFirst).map(([n, o]) => [n, Object.values(o).reduce((a, b) => a + b, 0), o]).filter(([, t, o]) => t >= 3 && Object.keys(o).length >= 2).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [n, t, o] of split) m += `| ${esc(n)} | ${t} | ${top(o, 20).map(([k, c]) => `${k} ${c}`).join(', ')} |\n`;
  m += `\n3번 이상 쓰인 처음 이름 중 갈린 것의 전체 수: ${Object.entries(byFirst).filter(([, o]) => Object.values(o).reduce((a, b) => a + b, 0) >= 3 && Object.keys(o).length >= 2).length} / ${Object.entries(byFirst).filter(([, o]) => Object.values(o).reduce((a, b) => a + b, 0) >= 3).length}\n`;

  m += `\n## 6. 글 종류\n\n| 이름 | 정의 | 글 수 |\n|---|---|---|\n`;
  const kc = {};
  for (const d of ids) if (d.texts) for (const k of Object.keys(d.texts)) inc(kc, L[d.set_id].kinds?.[k]);
  for (const k of v.kinds) m += `| ${esc(k.name)} | ${esc(k.definition)} | ${kc[k.name] || 0} |\n`;
  m += `\n(가)(나) 계열 글 합계 ${Object.values(kc).reduce((a, b) => a + b, 0)}개\n`;

  m += `\n## 7. 배열 통계\n`;
  for (const [key, title] of [['single', '단일 지문'], ['paired', '(가)(나) 계열의 글 (글마다 따로)']]) {
    const S = stats[key];
    const n = Object.values(S.first).reduce((a, b) => a + b, 0);
    m += `\n### ${title} (${n}개 글)\n\n- 첫 문단 기능: ${top(S.first, 40).map(([k, c]) => `${k} ${c}`).join(', ')}\n- 끝 문단 기능: ${top(S.last, 40).map(([k, c]) => `${k} ${c}`).join(', ')}\n\n이어지는 두 기능 상위 25\n\n| 앞 → 뒤 | 수 |\n|---|---|\n`;
    for (const [k, c] of top(S.pairs, 25)) m += `| ${esc(k)} | ${c} |\n`;
  }

  m += `\n## 8. 역분해 4지문 기능 배열\n\n`;
  for (const id of REVERSE) {
    const d = sets.find((x) => x.set_id === id);
    if (!d || !L[id]) { m += `- ${id}: 결과 없음\n`; continue; }
    const parts = d.paragraphs.map((p, i) => `${p.p} ${L[id].paragraphs[i].label}${L[id].paragraphs[i].label2 ? `(+${L[id].paragraphs[i].label2})` : ''}`);
    m += `- ${id}${d.texts ? ' (가)(나)' : ''}: ${parts.join(' → ')}\n`;
  }

  const u1 = fs.existsSync(path.join(LB, '_usage.json')) ? readJson(path.join(LB, '_usage.json')) : [];
  const u0 = fs.existsSync(path.join(DIR, 'vocab-usage.json')) ? readJson(path.join(DIR, 'vocab-usage.json')) : [];
  const sum = (arr) => {
    const ok = arr.filter((e) => e.usage);
    const er = arr.filter((e) => e.error);
    const i = ok.reduce((s, e) => s + e.usage.input_tokens, 0), o = ok.reduce((s, e) => s + e.usage.output_tokens, 0);
    const c = ok.reduce((s, e) => s + (e.usage.input_tokens_details?.cached_tokens || 0), 0);
    const r = ok.reduce((s, e) => s + (e.usage.output_tokens_details?.reasoning_tokens || 0), 0);
    return { calls: ok.length, errors: er.length, i, o, c, r, cost: i * RATE.in + o * RATE.out, ts: arr.map((e) => e.ts).filter(Boolean), sec: ok.reduce((s, e) => s + e.seconds, 0) };
  };
  const a = sum(u0), b = sum(u1);
  const allTs = [...a.ts, ...b.ts];
  m += `\n## 9. 호출·시간·토큰\n\n| 구분 | 응답 받은 호출 | 오류 | 입력 토큰 (캐시) | 출력 토큰 (추론) | 비용(캐시 할인 없이) |\n|---|---|---|---|---|---|\n`;
  m += `| 2a 어휘 | ${a.calls} | ${a.errors} | ${a.i} (${a.c}) | ${a.o} (${a.r}) | $${a.cost.toFixed(3)} |\n`;
  m += `| 2b 다시 붙이기 | ${b.calls} | ${b.errors} | ${b.i} (${b.c}) | ${b.o} (${b.r}) | $${b.cost.toFixed(3)} |\n`;
  m += `| 합계 | ${a.calls + b.calls} | ${a.errors + b.errors} | ${a.i + b.i} (${a.c + b.c}) | ${a.o + b.o} (${a.r + b.r}) | $${(a.cost + b.cost).toFixed(3)} |\n\n`;
  m += `- 2b 호출 시간 합 ${b.sec}초 (동시 ${CONCURRENCY}개), 기록된 첫 호출~마지막 호출 사이 ${allTs.length ? Math.round((Math.max(...allTs) - Math.min(...allTs)) / 1000) : 0}초(중간에 멈춘 시간 포함). 오류는 응답을 못 받은 호출이라 토큰이 기록되지 않는다.\n`;
  fs.writeFileSync(path.join(DIR, 'LABELS.md'), m);
  console.log(`LABELS.md 작성 (${ids.length}세트)`);
}

if (cmd === 'vocab') await vocab();
else if (cmd === 'relabel') await relabel();
else if (cmd === 'summary') summary();
else { console.error('사용법: node label.mjs vocab | relabel | summary'); process.exit(1); }
