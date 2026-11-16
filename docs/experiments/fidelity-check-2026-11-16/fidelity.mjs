// 충실도 검사기: 생성 지문이 목표 하위 구조(설계도)대로 쓰였는지 잰다 (README.md).
// 실행: 저장소 루트에서
//   node docs/experiments/fidelity-check-2026-11-16/fidelity.mjs <지문.md> [이름]
//   예) node docs/experiments/fidelity-check-2026-11-16/fidelity.mjs docs/experiments/passage-gen-v2-2026-11-13/out-r3b/C-1/final-passage.md r3b
// 목표 구조: 환경 변수 TARGET(예: S7-2)이 우선, 없으면 지문 옆 structure.txt의 첫 코드, 둘 다 없으면 "가장 가까운 구조"만 낸다.
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지. 겹침 검사에는 suneung_db.
// 환경 변수: GEN_MODEL (기본 gpt-6.1-sol), FORCE=1 (추출·라벨부터 다시), FORCE_COMPARE=1 (비교만 다시),
//            SKIP_COMPARE=1 (비교 호출 없이 코드 결과만), DB (기본 /Users/mac/Projects/suneung_db/output/passages),
//            NO_API=1 (API 호출 없이 이미 있는 결과와 겹침·분량만)
// 단계: A 추출(1-extract.md, high) → B 라벨(2b-relabel.md, medium) → C 배열 대조(코드) → D 비교(compare.md, high) → E 겹침·분량(코드)
// A·B는 목표 구조를 모른다. 목표는 C·D에서만 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseArray, makeGroupOf, align, formatElem, formatPara } from './align.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SC = path.join(DIR, '..', 'structure-catalog');
const DB = process.env.DB || '/Users/mac/Projects/suneung_db/output/passages';
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const RATE = { in: 2 / 1e6, out: 10 / 1e6 }; // label.mjs와 같은 단가
const WAITS = [15000, 45000, 90000];
const COPY_N = 15; // 기출과 연속 이만큼 같으면 겹침
const COMMON_SETS = 3; // 이만큼 많은 세트에 나오는 조각은 흔한 표현으로 본다

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseJson = (t) => {
  if (t == null) return null;
  const s = t.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
};

// ---- 입력 ----
const passagePath = process.argv[2];
if (!passagePath || !fs.existsSync(passagePath)) {
  console.error('사용법: node docs/experiments/fidelity-check-2026-11-16/fidelity.mjs <지문.md> [이름]');
  process.exit(1);
}
const name = process.argv[3] || path.basename(path.dirname(path.resolve(passagePath))) || 'passage';
const OUT = path.join(DIR, 'out', name);
fs.mkdirSync(OUT, { recursive: true });

// 지문 파싱: "[1문단] ..." 줄 또는 빈 줄로 나눈 문단. 굵은 글씨 표시(**)는 지운다.
function parsePassage(md) {
  const text = md.replace(/\r/g, '');
  const tagged = [...text.matchAll(/^\s*\[(\d+)\s*문단\]\s*(.+)$/gm)].map((m) => m[2].trim());
  const paras = tagged.length ? tagged : text.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
  return paras.map((s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());
}
const paras = parsePassage(fs.readFileSync(passagePath, 'utf8'));
if (!paras.length) { console.error('문단을 찾지 못했습니다.'); process.exit(1); }
const ids = paras.map((_, i) => String(i + 1));

// 목표 구조
let target = process.env.TARGET || null;
if (!target) {
  const st = path.join(path.dirname(path.resolve(passagePath)), 'structure.txt');
  if (fs.existsSync(st)) target = (fs.readFileSync(st, 'utf8').match(/[SP]\d-\d/) || [null])[0];
}

// 구조 목록
const vocab = readJson(path.join(SC, 'vocab.json'));
const groupOf = makeGroupOf(vocab);
const defs = readJson(path.join(SC, 'types', 'defs.json'));
const subs = [];
for (const f of fs.readdirSync(path.join(SC, 'substructures')).filter((f) => /^[SP]\d\.json$/.test(f)).sort()) {
  for (const s of readJson(path.join(SC, 'substructures', f)).substructures) subs.push({ ...s, type: f.replace('.json', '') });
}
const tsub = target ? subs.find((s) => s.code === target) : null;
if (target && !tsub) { console.error(`구조 목록에 없는 코드: ${target}`); process.exit(1); }

// ---- API ----
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
const usagePath = path.join(OUT, '_usage.json');
const usage = fs.existsSync(usagePath) ? readJson(usagePath) : [];
const costOf = (u) => (u ? (u.input_tokens || 0) * RATE.in + (u.output_tokens || 0) * RATE.out : 0);
async function call(tag, instructions, input, effort) {
  if (process.env.NO_API) throw new Error('NO_API: 호출하지 않음');
  for (let k = 0; k <= WAITS.length; k++) {
    const t0 = Date.now();
    try {
      const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort }, instructions, input }).finalResponse();
      usage.push({ tag, try: k + 1, model: res.model, effort, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage, usd: +costOf(res.usage).toFixed(4) });
      fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));
      return res.output_text;
    } catch (e) {
      const msg = String(e.message || e);
      usage.push({ tag, try: k + 1, error: msg.slice(0, 200) });
      fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));
      if (!/connection|terminated|timed? ?out|ECONN|ETIMEDOUT|socket|fetch failed|network|5\d\d/i.test(msg) || k === WAITS.length) throw e;
      console.log(`[${tag}] 오류(${msg.slice(0, 60)}), ${WAITS[k] / 1000}초 뒤 다시`);
      await sleep(WAITS[k]);
    }
  }
}

// ---- A 추출 (기출과 같은 지시문, 목표를 알리지 않는다) ----
function extractInput() {
  const meta = [`set_id: gen-${name}`, '시험: 없음(생성 지문)', '문항 번호: 없음', '제목: 없음', '분야: 없음'].join('\n');
  return `# 메타\n${meta}\n\n# 본문\n${paras.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}\n`;
}
function extractCheck(o) {
  const bad = [];
  if (!o || typeof o !== 'object') return ['JSON 객체가 아님'];
  if (!Array.isArray(o.paragraphs)) return ['paragraphs가 배열이 아님'];
  const got = o.paragraphs.map((p) => String(p?.p));
  if (got.join('|') !== ids.join('|')) bad.push(`문단 번호 불일치 (입력 ${ids.length}개, 결과 ${got.length}개)`);
  for (const k of ['purpose', 'logic']) if (!o[k]?.abstract) bad.push(`${k}.abstract 비어 있음`);
  if (!o.features) bad.push('features 없음');
  o.paragraphs.forEach((p, i) => { if (!p?.function) bad.push(`paragraphs[${i}].function 비어 있음`); });
  return bad;
}
async function stepExtract() {
  const f = path.join(OUT, 'extract.json');
  if (fs.existsSync(f) && !process.env.FORCE) return readJson(f);
  const instr = fs.readFileSync(path.join(SC, 'prompts', '1-extract.md'), 'utf8');
  let last = [];
  for (let a = 1; a <= 2; a++) {
    console.log(`A 추출 ${a}회차 (${MODEL}, high, 문단 ${ids.length}개)...`);
    const o = parseJson(await call(`extract#${a}`, instr, extractInput(), 'high'));
    last = o ? extractCheck(o) : ['JSON 파싱 실패'];
    if (!last.length) { fs.writeFileSync(f, JSON.stringify({ _meta: { name, passage: passagePath, model: MODEL, effort: 'high' }, ...o }, null, 2)); return o; }
    console.warn(`형식 점검 실패: ${last.slice(0, 3).join('; ')}`);
  }
  throw new Error(`추출 실패: ${last.join('; ')}`);
}

// ---- B 라벨 (label.mjs relabel과 같은 입력) ----
function vocabText(v) {
  let t = '# 통일 어휘\n\n';
  for (const g of v.groups) {
    t += `## 묶음: ${g.group} — ${g.about}\n`;
    for (const fn of g.functions) t += `- ${fn.name}: ${fn.definition} (versus: ${fn.versus})\n`;
    t += '\n';
  }
  return t + '## 글 종류\n' + v.kinds.map((k) => `- ${k.name}: ${k.definition}`).join('\n') + '\n';
}
async function stepLabel(ex) {
  const f = path.join(OUT, 'labels.json');
  if (fs.existsSync(f) && !process.env.FORCE) return readJson(f);
  const instr = fs.readFileSync(path.join(SC, 'prompts', '2b-relabel.md'), 'utf8') + '\n\n' + vocabText(vocab);
  const input = JSON.stringify({ set_id: `gen-${name}`, purpose: ex.purpose?.abstract, logic: ex.logic?.abstract, paragraphs: ex.paragraphs.map((p) => ({ p: p.p, point: p.point, function: p.function, secondary: p.secondary, move: p.move })) }, null, 1);
  const fn = new Set(vocab.groups.flatMap((g) => g.functions.map((x) => x.name)));
  let last = [];
  for (let a = 1; a <= 2; a++) {
    console.log(`B 라벨 ${a}회차 (medium)...`);
    const o = parseJson(await call(`label#${a}`, instr, input, 'medium'));
    last = [];
    if (!o || !Array.isArray(o.paragraphs)) last.push('형식 오류');
    else {
      if (o.paragraphs.map((p) => String(p.p)).join('|') !== ids.join('|')) last.push('문단 번호 불일치');
      for (const p of o.paragraphs) {
        if (!fn.has(p.label)) last.push(`${p.p}: label이 어휘에 없음`);
        if (p.label2 != null && (!fn.has(p.label2) || p.label2 === p.label)) last.push(`${p.p}: label2 오류`);
      }
    }
    if (!last.length) { fs.writeFileSync(f, JSON.stringify({ _meta: { name, model: MODEL, effort: 'medium' }, ...o }, null, 2)); return o; }
    console.warn(`라벨 점검 실패: ${last.slice(0, 3).join('; ')}`);
  }
  throw new Error(`라벨 실패: ${last.join('; ')}`);
}

// ---- C 배열 대조 (코드) ----
function stepAlign(lb) {
  const P = lb.paragraphs.map((p) => ({ label: p.label, label2: p.label2 }));
  const singles = subs.filter((s) => s.type.startsWith('S')); // (가)(나) 배열은 표기가 제각각이라 코드 대조에서 뺀다
  const ranked = singles.map((s) => ({ code: s.code, name: s.name, members: s.members.length, ...align(P, parseArray(s.array), groupOf) })).sort((a, b) => b.norm - a.norm);
  const res = { labels: P.map(formatPara), nearest: ranked.slice(0, 5).map((r) => ({ code: r.code, name: r.name, members: r.members, norm: +r.norm.toFixed(3), matched: r.matched })) };
  if (tsub && tsub.type.startsWith('S')) {
    const elems = parseArray(tsub.array);
    const a = align(P, elems, groupOf);
    res.target = {
      code: tsub.code, array: tsub.array, norm: +a.norm.toFixed(3),
      rank: ranked.findIndex((r) => r.code === tsub.code) + 1, of: ranked.length,
      steps: a.steps.map((s) => ({ type: s.type, paragraph: s.p != null ? ids[s.p] : null, label: s.p != null ? formatPara(P[s.p]) : null, element: s.e != null ? formatElem(elems[s.e]) : null, sim: s.sim ?? null })),
      counts: a.steps.reduce((o, s) => ((o[s.type] = (o[s.type] || 0) + 1), o), {}),
    };
  }
  fs.writeFileSync(path.join(OUT, 'align.json'), JSON.stringify(res, null, 2));
  return res;
}

// ---- D 비교 (목표가 있을 때만) ----
async function stepCompare(ex, lb, al) {
  const f = path.join(OUT, 'compare.json');
  if (fs.existsSync(f) && !process.env.FORCE && !process.env.FORCE_COMPARE) return readJson(f);
  const tdef = defs.find((d) => d.code === tsub.type);
  const plan = {
    purpose: ex.purpose?.abstract, logic: ex.logic?.abstract, question_first_visible: ex.question_first_visible,
    paragraphs: ex.paragraphs.map((p, i) => ({ p: p.p, point: p.point, move: p.move, label: lb.paragraphs[i]?.label, label2: lb.paragraphs[i]?.label2 })),
    features: ex.features, meetings: ex.meetings, left_to_reader: ex.left_to_reader,
  };
  const { members, examples, type, ...tpub } = tsub; // 소속 기출 id는 넘기지 않는다
  const input = [
    '# 1차 유형 목록', defs.map((d) => `- ${d.code} ${d.name}: ${d.does}`).join('\n'),
    '\n# 목표', `1차 유형: ${tdef.code} ${tdef.name}\n하는 일: ${tdef.does}\n가르는 기준: ${tdef.criteria}`,
    `하위 구조:\n${JSON.stringify(tpub, null, 1)}`,
    '\n# 평면도', JSON.stringify(plan, null, 1),
    '\n# 코드 대조 (참고용)', al.target ? al.target.steps.map((s) => `${s.type}: 문단 ${s.paragraph ?? '-'} ${s.label ?? ''} ↔ ${s.element ?? '-'}`).join('\n') : '(배열 표기가 달라 코드 대조 없음)',
  ].join('\n');
  const instr = fs.readFileSync(path.join(DIR, 'prompts', 'compare.md'), 'utf8');
  for (let a = 1; a <= 2; a++) {
    console.log(`D 비교 ${a}회차 (high, 목표 ${tsub.code})...`);
    const o = parseJson(await call(`compare#${a}`, instr, input, 'high'));
    if (o && o.verdict && Array.isArray(o.elements)) { fs.writeFileSync(f, JSON.stringify({ _meta: { name, target: tsub.code, model: MODEL, effort: 'high' }, ...o }, null, 2)); return o; }
    console.warn('비교 결과 형식 오류');
  }
  throw new Error('비교 실패');
}

// ---- E 겹침과 분량 (코드) ----
const norm = (s) => s.replace(/\s+/g, '');
function stepOverlap() {
  if (!fs.existsSync(DB)) return { skipped: `기출 폴더 없음: ${DB}` };
  const index = new Map(); // 15자 조각 → set_id 집합
  let nSets = 0;
  for (const fn of fs.readdirSync(DB).filter((x) => x.endsWith('.json'))) {
    const p = readJson(path.join(DB, fn));
    nSets++;
    const t = (p.sections || []).flatMap((s) => (s.paragraphs || []).map((q) => norm(q.text || ''))).join('¶'); // 문단 경계를 넘는 조각은 만들지 않는다
    for (let i = 0; i + COPY_N <= t.length; i++) {
      const g = t.slice(i, i + COPY_N);
      let s = index.get(g);
      if (!s) index.set(g, (s = new Set()));
      s.add(p.set_id || fn.replace('.json', ''));
    }
  }
  const hits = [];
  paras.forEach((para, pi) => {
    // 공백을 뺀 위치 ↔ 원래 위치 대응
    const map = []; let t = '';
    for (let i = 0; i < para.length; i++) if (!/\s/.test(para[i])) { map.push(i); t += para[i]; }
    let i = 0;
    while (i + COPY_N <= t.length) {
      const s0 = index.get(t.slice(i, i + COPY_N));
      if (!s0) { i++; continue; }
      let j = i + 1, sets = new Set(s0);
      while (j + COPY_N <= t.length && index.get(t.slice(j, j + COPY_N))) { for (const x of index.get(t.slice(j, j + COPY_N))) sets.add(x); j++; }
      const end = j - 1 + COPY_N; // t[i, end)
      hits.push({ paragraph: ids[pi], chars: end - i, text: para.slice(map[i], map[end - 1] + 1), sets: [...sets].slice(0, 5), n_sets: sets.size, common: s0.size >= COMMON_SETS });
      i = end;
    }
  });
  return { sets: nSets, min_chars: COPY_N, hits };
}
function stats() {
  const sent = (s) => s.split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
  const per = paras.map((p) => sent(p).length);
  const all = paras.flatMap(sent);
  const chars = paras.join('\n').length, charsNoSpace = norm(paras.join('')).length;
  return { paragraphs: paras.length, chars, chars_no_space: charsNoSpace, sentences: all.length, per_paragraph: per, avg_sentence_chars: +(all.reduce((a, s) => a + s.length, 0) / all.length).toFixed(1) };
}

// ---- 보고서 ----
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
function report({ al, cmp, ov, st, lb }) {
  let m = `# 충실도 검사: ${name}\n\n- 지문: ${passagePath}\n- 목표 구조: ${tsub ? `${tsub.code} ${tsub.name}` : '없음 (가장 가까운 구조만)'}\n- 모델: ${MODEL}\n`;
  const spent = usage.reduce((a, u) => a + (u.usd || 0), 0);
  m += `- 비용: $${spent.toFixed(3)} (이 폴더의 누적)\n\n`;
  if (cmp) {
    m += `## 판정: ${cmp.verdict}\n\n${cmp.summary}\n\n### 배열 요소\n\n| 요소 | 문단 | 판정 | 까닭 |\n|---|---|---|---|\n`;
    for (const e of cmp.elements || []) m += `| ${esc(e.element)} | ${esc((e.paragraphs || []).join(', '))} | ${esc(e.status)} | ${esc(e.why)} |\n`;
    m += `\n### 덧붙음\n\n`;
    if (!(cmp.additions || []).length) m += '없음\n';
    else { m += '| 문단 | 하는 일 | 짜임을 바꾸는가 | 까닭 |\n|---|---|---|---|\n'; for (const a of cmp.additions) m += `| ${esc((a.paragraphs || []).join(', '))} | ${esc(a.what)} | ${a.changes_structure ? '예' : '아니요'} | ${esc(a.why)} |\n`; }
    m += `\n### 축\n\n| 축 | 목표 | 판정 | 생성 지문 |\n|---|---|---|---|\n`;
    for (const x of cmp.axes || []) m += `| ${esc(x.axis)} | ${esc(x.target)} | ${esc(x.status)} | ${esc(x.actual)} |\n`;
    m += `\n- 만나는 곳·비워 둔 곳: ${cmp.hooks?.status ?? '-'} — ${esc(cmp.hooks?.why)}\n`;
    if (cmp.resembles_other_type) m += `- 다른 유형을 닮은 곳: ${esc(cmp.resembles_other_type.code)} (문단 ${esc((cmp.resembles_other_type.paragraphs || []).join(', '))}) — ${esc(cmp.resembles_other_type.why)}\n`;
    if (cmp.notes) m += `- 메모: ${esc(cmp.notes)}\n`;
    m += '\n';
  }
  m += `## 코드 대조 (라벨 글자만 본 참고 결과)\n\n문단 라벨: ${al.labels.map((l, i) => `${i + 1} ${l}`).join(' / ')}\n\n`;
  if (al.target) {
    m += `목표 ${al.target.code} 정렬 점수 ${al.target.norm} (단일 하위 구조 ${al.target.of}개 중 ${al.target.rank}위)\n\n| 판정 | 문단 | 라벨 | 목표 요소 |\n|---|---|---|---|\n`;
    for (const s of al.target.steps) m += `| ${s.type} | ${s.paragraph ?? '-'} | ${esc(s.label ?? '-')} | ${esc(s.element ?? '-')} |\n`;
    m += '\n';
  }
  m += `가장 가까운 구조 (코드):\n\n| 순위 | 코드 | 이름 | 소속 기출 | 점수 |\n|---|---|---|---|---|\n`;
  al.nearest.forEach((r, i) => { m += `| ${i + 1} | ${r.code} | ${r.name} | ${r.members}편 | ${r.norm} |\n`; });
  m += `\n점수는 정렬 점수를 요소 수와 문단 수 중 큰 값으로 나눈 것이다. 기출 92편으로 시험하면 자기 하위 구조가 1위인 경우 55편, 3위 안 74편이었다(README.md).\n\n`;
  m += `## 기출과 겹침 (연속 ${COPY_N}자 이상, 공백 무시)\n\n`;
  if (ov.skipped) m += `건너뜀: ${ov.skipped}\n\n`;
  else {
    const real = ov.hits.filter((h) => !h.common);
    m += `기출 ${ov.sets}세트와 대조. 겹침 ${ov.hits.length}곳 (흔한 표현 ${ov.hits.length - real.length}곳 제외하면 ${real.length}곳).\n\n`;
    if (ov.hits.length) { m += '| 문단 | 길이 | 겹친 부분 | 기출 세트 수 | 흔한 표현 |\n|---|---|---|---|---|\n'; for (const h of ov.hits) m += `| ${h.paragraph} | ${h.chars} | ${esc(h.text)} | ${h.n_sets} | ${h.common ? '예' : ''} |\n`; m += '\n'; }
  }
  const flags = [];
  if (st.chars > 2639) flags.push(`글자 ${st.chars} > 기출 최대 2,639`); else if (st.chars > 2159) flags.push(`글자 ${st.chars} > 기출 90% 2,159`);
  if (st.sentences > 36) flags.push(`문장 ${st.sentences} > 기출 최대 36`);
  if (Math.max(...st.per_paragraph) > 14) flags.push(`문단당 문장 ${Math.max(...st.per_paragraph)} > 기출 최대 14`);
  if (st.per_paragraph.length > 2 && new Set(st.per_paragraph).size === 1) flags.push(`모든 문단이 ${st.per_paragraph[0]}문장으로 같음`);
  m += `## 분량\n\n문단 ${st.paragraphs}, 글자 ${st.chars} (공백 빼면 ${st.chars_no_space}), 문장 ${st.sentences}, 문단별 문장 ${st.per_paragraph.join('/')}, 평균 문장 길이 ${st.avg_sentence_chars}자.\n기출 단일 108편: 글자 중앙 1,674 / 90% 2,159 / 최대 2,639, 문장 중앙 25 / 최대 36, 문단당 문장 중앙 5 / 최대 14, 평균 문장 길이 67.6자 (구조 목록 4.1절 수치, 글자 수 세는 법은 그쪽 기준).\n\n`;
  m += flags.length ? `**기출 범위 밖**: ${flags.join(' / ')}\n\n` : '기출 범위 안.\n\n';
  m += `## 이 검사가 재지 못하는 것\n\n문장의 질, 사실의 정확성, 문항을 낼 여지. 추출·라벨·비교 모두 모델 판단이라 틀릴 수 있다. 처음 몇 편은 사람이 결과를 확인한다.\n`;
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), m);
}

// ---- 실행 ----
console.log(`지문 ${passagePath}: 문단 ${paras.length}개, 목표 ${target || '없음'} → ${OUT}`);
const st = stats();
const ov = stepOverlap();
fs.writeFileSync(path.join(OUT, 'overlap.json'), JSON.stringify({ ...ov, stats: st }, null, 2));
let ex, lb;
try { ex = await stepExtract(); lb = await stepLabel(ex); }
catch (e) {
  if (!process.env.NO_API) throw e;
  console.log('NO_API: 추출·라벨이 없어 겹침과 분량만 냈습니다.');
  console.log(JSON.stringify({ stats: st, overlap_hits: ov.hits?.length ?? ov.skipped }, null, 1));
  process.exit(0);
}
const al = stepAlign(lb);
let cmp = null;
if (tsub && !process.env.SKIP_COMPARE) cmp = await stepCompare(ex, lb, al);
report({ al, cmp, ov, st, lb });
const spent = usage.reduce((a, u) => a + (u.usd || 0), 0);
console.log(`끝. 판정 ${cmp?.verdict ?? '-'}, 가장 가까운 구조 ${al.nearest[0].code}, 겹침 ${ov.hits ? ov.hits.filter((h) => !h.common).length : '-'}곳, 누적 비용 $${spent.toFixed(3)}. ${path.join(OUT, 'REPORT.md')}`);
