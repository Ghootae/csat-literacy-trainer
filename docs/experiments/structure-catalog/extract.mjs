// 구조 목록 1단계: 세트별 구조 추출 (PLAN.md 4·5·6·7절).
// 실행: 저장소 루트에서  node docs/experiments/structure-catalog/extract.mjs
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지.
// 환경 변수: IDS (쉼표로 구분한 set_id, 없으면 전체), LIMIT (앞에서 N개만), FORCE=1 (끝난 세트도 다시),
//            GEN_MODEL (기본 gpt-6.1-sol), GEN_EFFORT (기본 high), CONCURRENCY (기본 4),
//            DB (기본 /Users/mac/Projects/suneung_db/output/passages)
// 모델에 넣은 입력 텍스트는 파일로 남기지 않는다(원문이 저장소에 남지 않게). 점검 결과에도 원문 조각을 쓰지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'extract');
fs.mkdirSync(OUT, { recursive: true });

const DB = process.env.DB || '/Users/mac/Projects/suneung_db/output/passages';
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const COPY_N = 15; // 원문과 연속 이만큼 같으면 표시
const INSTRUCTIONS = fs.readFileSync(path.join(DIR, 'prompts', '1-extract.md'), 'utf8');

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
  client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 }); // 재시도하면 중복 과금. 다시 부르는 것은 아래에서 직접 한다
  return client;
}

// ---- 전처리 (PLAN.md 5절) ----
const isCaption = (t) => t.length <= 40 && t.startsWith('<') && t.endsWith('>') && !/[.?!]/.test(t);

function buildInput(p) {
  const labelOf = (s, i) => (p.sections.length === 1 ? '' : (s.label || '').replace(/[()]/g, '') || String(i + 1));
  const ids = []; // 입력에 실린 문단 번호
  const lines = [];
  for (let i = 0; i < p.sections.length; i++) {
    const s = p.sections[i];
    const lab = labelOf(s, i);
    let n = 0;
    for (const q of s.paragraphs) {
      let t = q.text.trim();
      if (t.startsWith('*')) continue; // 낱말 풀이
      if (isCaption(t)) { lines.push('[표·그림 제목]'); continue; }
      // 밑줄·기호 표지(ⓐ, ㉠ 등)는 본문 텍스트에 글자로 들어 있지 않고 annotations 위치 정보로만 있다. 혹시 남아 있으면 지운다.
      for (const a of q.annotations || []) if (a.marker && t.includes(a.marker)) t = t.split(a.marker).join('');
      n += 1;
      const id = `${lab}${n}`;
      ids.push(id);
      lines.push(`[${id}] ${t}${q.image_ids?.length ? ' [그림]' : ''}`);
    }
  }
  const e = p.exam;
  const meta = [
    `set_id: ${p.set_id}`,
    `시험: ${e.label}`,
    `문항 번호: ${e.question_range}`,
    `제목: ${e.title}`,
    `분야: ${e.category ?? '없음'}`,
  ].join('\n');
  return { ids, text: `# 메타\n${meta}\n\n# 본문\n${lines.join('\n\n')}\n`, paired: p.sections.length > 1 };
}

// ---- 자동 점검 (PLAN.md 7절) ----
const norm = (s) => s.replace(/\s+/g, '');
function grams(s) { const t = norm(s); const set = new Set(); for (let i = 0; i + COPY_N <= t.length; i++) set.add(t.slice(i, i + COPY_N)); return set; }
function* strings(o, pth = '') {
  if (typeof o === 'string') yield [pth, o];
  else if (Array.isArray(o)) for (let i = 0; i < o.length; i++) yield* strings(o[i], `${pth}[${i}]`);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) yield* strings(v, pth ? `${pth}.${k}` : k);
}
const FIELDS = ['set_id', 'set', 'field', 'purpose', 'logic', 'question_first_visible', 'paragraphs', 'features', 'meetings', 'left_to_reader', 'texts', 'pair_relation', 'notes'];
const PARA = ['p', 'point', 'function', 'secondary', 'link', 'move', 'science'];
const FEAT = ['opening', 'setup', 'development', 'rules', 'cases', 'ending', 'other'];

function check(out, p, input) {
  const format = [];
  const copy = [];
  if (!out || typeof out !== 'object') return { format: ['JSON 객체가 아님'], copy };
  for (const k of FIELDS) if (!(k in out)) format.push(`칸 없음: ${k}`);
  if (out.set_id !== p.set_id) format.push('set_id 불일치');
  if (!['single', 'paired'].includes(out.set)) format.push('set 값이 single/paired가 아님');
  else if ((out.set === 'paired') !== input.paired) format.push('set이 입력의 단일/(가)(나)와 다름');
  for (const k of ['purpose', 'logic']) for (const kk of ['topic', 'abstract']) if (!out[k]?.[kk]) format.push(`${k}.${kk} 비어 있음`);
  if (!Array.isArray(out.paragraphs)) format.push('paragraphs가 배열이 아님');
  else {
    const got = out.paragraphs.map((x) => String(x?.p));
    if (got.length !== input.ids.length) format.push(`문단 수 ${got.length} ≠ 입력 ${input.ids.length}`);
    const miss = input.ids.filter((i) => !got.includes(i));
    const extra = got.filter((i) => !input.ids.includes(i));
    if (miss.length) format.push(`빠진 문단: ${miss.join(',')}`);
    if (extra.length) format.push(`입력에 없는 문단: ${extra.join(',')}`);
    if (!miss.length && !extra.length && got.join('|') !== input.ids.join('|')) format.push('문단 순서가 입력과 다름');
    out.paragraphs.forEach((x, i) => { for (const k of PARA) if (!(k in (x || {}))) format.push(`paragraphs[${i}].${k} 없음`); if (!x?.function) format.push(`paragraphs[${i}].function 비어 있음`); });
  }
  if (!out.features || typeof out.features !== 'object') format.push('features 없음');
  else for (const k of FEAT) if (!(k in out.features)) format.push(`features.${k} 없음`);
  if (!Array.isArray(out.meetings)) format.push('meetings가 배열이 아님');
  else out.meetings.forEach((m, i) => { if (!Array.isArray(m?.paragraphs) || !m?.shared || !m?.how) format.push(`meetings[${i}] 칸 부족`); else for (const x of m.paragraphs) if (!input.ids.includes(String(x))) format.push(`meetings[${i}]가 없는 문단 ${x}를 가리킴`); });
  if (!Array.isArray(out.left_to_reader)) format.push('left_to_reader가 배열이 아님');
  else out.left_to_reader.forEach((m, i) => { if (!m?.p || !m?.what) format.push(`left_to_reader[${i}] 칸 부족`); else if (!input.ids.includes(String(m.p))) format.push(`left_to_reader[${i}]가 없는 문단 ${m.p}를 가리킴`); });
  if (input.paired && (!out.texts || typeof out.texts !== 'object')) format.push('(가)(나) 세트인데 texts 없음');
  else if (input.paired) for (const [k, v] of Object.entries(out.texts)) if (!v?.kind || !v?.purpose) format.push(`texts.${k}에 kind/purpose 없음`);
  if (input.paired && !out.pair_relation) format.push('(가)(나) 세트인데 pair_relation 없음');
  // 원문 복사: 위치(필드 경로)와 겹친 길이만 적고 원문 조각은 적지 않는다.
  const src = grams(p.sections.flatMap((s) => s.paragraphs.map((q) => q.text)).join('\n'));
  for (const [pth, s] of strings(out)) {
    const t = norm(s); let run = 0, best = 0;
    for (let i = 0; i + COPY_N <= t.length; i++) {
      if (src.has(t.slice(i, i + COPY_N))) { run = run ? run + 1 : COPY_N; best = Math.max(best, run); } else run = 0;
    }
    if (best) copy.push({ path: pth, overlap_chars: best });
  }
  return { format, copy };
}

// ---- 호출 ----
const usagePath = path.join(OUT, '_usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];
const saveUsage = () => fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}

async function callOnce(id, attempt, input) {
  const t0 = Date.now();
  try {
    const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, instructions: INSTRUCTIONS, input }).finalResponse();
    const seconds = Math.round((Date.now() - t0) / 1000);
    usageLog.push({ set_id: id, attempt, model: res.model, seconds, usage: res.usage });
    saveUsage();
    return { text: res.output_text, seconds };
  } catch (e) {
    usageLog.push({ set_id: id, attempt, error: String(e.message || e).slice(0, 200), seconds: Math.round((Date.now() - t0) / 1000) });
    saveUsage();
    return { text: null, error: String(e.message || e) };
  }
}

async function runSet(id) {
  const p = JSON.parse(fs.readFileSync(path.join(DB, `${id}.json`), 'utf8'));
  const e = p.exam;
  const input = buildInput(p);
  const dest = path.join(OUT, `${id}.json`);
  if (process.env.DRY) { // 호출 없이 입력 길이와 문단 번호만 본다
    console.log(`[${id}] DRY ${input.text.length}자, 문단 ${input.ids.length}개: ${input.ids.join(' ')} | 표·그림 제목 ${(input.text.match(/\[표·그림 제목\]/g) || []).length}, [그림] ${(input.text.match(/\[그림\]/g) || []).length}`);
    return { id, skipped: true };
  }
  if (fs.existsSync(dest) && !process.env.FORCE) { console.log(`[${id}] 이미 있음, 건너뜀`); return { id, skipped: true }; }
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt++) { // 실패하면 한 번 다시 부른다
    console.log(`[${id}] 호출 ${attempt}회차 (${MODEL}, ${EFFORT}, 문단 ${input.ids.length}개)...`);
    const r = await callOnce(id, attempt, input.text);
    if (r.text == null) { last = { attempt, format: [`API 오류: ${r.error.slice(0, 120)}`], copy: [] }; continue; }
    const out = parseJson(r.text);
    const c = out ? check(out, p, input) : { format: ['JSON 파싱 실패'], copy: [] };
    last = { attempt, ...c };
    if (!c.format.length) {
      const saved = { _meta: { set_id: id, label: e.label, provider: e.provider, grade: e.grade, year: e.year, month: e.month, question_range: e.question_range, title: e.title, category: e.category, sections: p.sections.length, paragraphs: input.ids.length, model: MODEL, effort: EFFORT }, ...out };
      fs.writeFileSync(dest, JSON.stringify(saved, null, 2));
      console.log(`[${id}] 완료 ${r.seconds}초, 복사 의심 ${c.copy.length}건`);
      return { id, ok: true, attempts: attempt };
    }
    console.warn(`[${id}] 형식 점검 실패(${attempt}회차): ${c.format.slice(0, 3).join('; ')}`);
    if (out) fs.writeFileSync(path.join(OUT, `${id}.failed-${attempt}.json`), JSON.stringify(out, null, 2)); // 모델 출력만 저장
  }
  return { id, ok: false, attempts: 2, last };
}

// ---- 실행 ----
const all = fs.readdirSync(DB).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
let ids = process.env.IDS ? process.env.IDS.split(',').map((s) => s.trim()).filter(Boolean) : all;
const unknown = ids.filter((i) => !all.includes(i));
if (unknown.length) { console.error(`DB에 없는 set_id: ${unknown.join(', ')}`); process.exit(1); }
if (process.env.LIMIT) ids = ids.slice(0, Number(process.env.LIMIT));
console.log(`대상 ${ids.length}세트, 동시 ${CONCURRENCY}, 모델 ${MODEL} (${EFFORT})`);

const t0 = Date.now();
const queue = [...ids];
const results = [];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, async () => {
  while (queue.length) results.push(await runSet(queue.shift()));
}));

if (process.env.DRY) process.exit(0);

// 선택한 세트 가운데 결과가 있는 것은 모두 다시 점검해 _check.json에 합친다(건너뛴 세트 포함).
const checkPath = path.join(OUT, '_check.json');
const checkAll = fs.existsSync(checkPath) ? JSON.parse(fs.readFileSync(checkPath, 'utf8')) : {};
for (const id of ids) {
  const f = path.join(OUT, `${id}.json`);
  if (fs.existsSync(f)) {
    const p = JSON.parse(fs.readFileSync(path.join(DB, `${id}.json`), 'utf8'));
    const { _meta, ...out } = JSON.parse(fs.readFileSync(f, 'utf8'));
    const c = check(out, p, buildInput(p));
    const r = results.find((x) => x.id === id);
    checkAll[id] = { status: c.format.length ? 'format_error' : 'ok', attempts: r?.attempts ?? checkAll[id]?.attempts ?? null, format: c.format, copy: c.copy };
  } else {
    const r = results.find((x) => x.id === id);
    checkAll[id] = { status: 'failed', attempts: r?.attempts ?? null, format: r?.last?.format ?? ['결과 없음'], copy: r?.last?.copy ?? [] };
  }
}
fs.writeFileSync(checkPath, JSON.stringify(checkAll, null, 2));
const bad = ids.filter((i) => checkAll[i].status !== 'ok');
const copies = ids.filter((i) => checkAll[i].copy.length);
console.log(`끝: ${Math.round((Date.now() - t0) / 1000)}초. 실패 ${bad.length}개${bad.length ? ` (${bad.join(', ')})` : ''}, 복사 의심이 있는 세트 ${copies.length}개. 점검: extract/_check.json, 토큰: extract/_usage.json`);
