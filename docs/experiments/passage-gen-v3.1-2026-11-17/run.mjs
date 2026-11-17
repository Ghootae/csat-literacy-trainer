// 지문 생성기 v3.1: (구조 고르기 또는 지정) → 설계 → 개요 → 집필 → 점검 → 연결 채우기 → 표현 교정 (사람 개입 없음).
// v3(passage-gen-v3-2026-11-16)와 달라진 점: 규칙 W21 비워 두기 + C11, 연결 채우기·교정에서 정리 재진술 금지. PLAN.md.
// 실행: 저장소 루트에서  node docs/experiments/passage-gen-v3.1-2026-11-17/run.mjs
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지.
// 환경 변수: GEN_MODEL (기본 gpt-6.1-sol), GEN_EFFORT (기본 high), SAMPLES (주제당 생성 수, 기본 2),
//            TOPICS (기본 "T1"), FORCE=1 (캐시 무시), OUT_DIR (기본 out),
//            목표 구조: TARGET (하위 구조 코드, 모든 주제에 적용) > TARGET_SET (기출 set_id; 그 기출의 하위 구조) > 의뢰 조건의 "- 목표 구조: 코드" 줄.
//            셋 다 없으면 v2처럼 0단계에서 후보를 고른다(AVOID, AVOID_FROM 사용 가능).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.env.OUT_DIR || 'out');
fs.mkdirSync(OUT, { recursive: true });

const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const SAMPLES = Number(process.env.SAMPLES || 2);
const TOPICS = (process.env.TOPICS || 'T1').split(',').map((s) => s.trim()).filter(Boolean);

const read = (...p) => fs.readFileSync(path.join(DIR, ...p), 'utf8');
const RULES = read('prompts', 'rules.md');
const P0 = read('prompts', '0-structure.md');
const P1 = read('prompts', '1-design.md');
const P2 = read('prompts', '2-outline.md');
const P3 = read('prompts', '3-write.md');
const P4 = read('prompts', '4-check.md');
const P5 = read('prompts', '5-bridge.md');
const P6 = read('prompts', '6-proofread.md');

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
const bodyLen = (ps) => ps.map((p) => p.replace(/^\[\d+문단\]\s*/, '')).join(' ').length;

// 구조 목록
const CAT_DIR = path.join(DIR, '..', 'structure-catalog');
const CATALOG = fs.readFileSync(path.join(CAT_DIR, 'CATALOG.md'), 'utf8');
const CAT_FILES = ['CATALOG-S1-S3.md', 'CATALOG-S4-S6.md', 'CATALOG-S7-S9.md', 'CATALOG-P.md'].map((f) => fs.readFileSync(path.join(CAT_DIR, f), 'utf8').split('\n'));
const warnings = [];
const warn = (m) => { console.warn(m); warnings.push(m); };

function pullEntry(code) {
  for (const lines of CAT_FILES) {
    const a = lines.findIndex((l) => l.startsWith(`### ${code} `));
    if (a < 0) continue;
    let b = lines.findIndex((l, k) => k > a && (l.startsWith('### ') || l.startsWith('## ')));
    if (b < 0) b = lines.length;
    const body = [];
    for (let k = a; k < b; k++) {
      if (/^- 예시 기출:/.test(lines[k])) { while (k + 1 < b && /^  - /.test(lines[k + 1])) k++; continue; }
      body.push(lines[k]);
    }
    const type = code.split('-')[0];
    const h = lines.findIndex((l) => l.startsWith(`## ${type} `));
    let header = '';
    if (h >= 0) {
      let e = lines.findIndex((l, k) => k > h && l.startsWith('### '));
      if (e < 0) e = lines.length;
      header = lines.slice(h, e).join('\n').trim();
    }
    return { type, header, text: body.join('\n').trim() };
  }
  return null;
}
function pullEntries(codes) {
  const seen = new Set(); const parts = []; const found = [];
  for (const code of codes) {
    const e = pullEntry(code);
    if (!e) { warn(`경고: 구조 목록에서 ${code} 를 찾지 못함`); continue; }
    found.push(code);
    if (!seen.has(e.type)) { seen.add(e.type); parts.push(e.header); }
    parts.push(e.text);
  }
  if (!found.length) throw new Error('후보 코드를 하나도 찾지 못해 멈춥니다.');
  return parts.join('\n\n');
}
// 목표 구조 찾기
function findTarget(commission) {
  if (process.env.TARGET) return { code: process.env.TARGET.trim(), from: 'TARGET' };
  if (process.env.TARGET_SET) {
    const id = process.env.TARGET_SET.trim();
    const sd = path.join(CAT_DIR, 'substructures');
    for (const f of fs.readdirSync(sd).filter((x) => /^[SP]\d\.json$/.test(x))) {
      for (const s of JSON.parse(fs.readFileSync(path.join(sd, f), 'utf8')).substructures) if (s.members.includes(id)) return { code: s.code, from: `TARGET_SET ${id}` };
    }
    throw new Error(`기출 ${id} 는 어느 하위 구조에도 속하지 않습니다(묶이지 않은 지문일 수 있음). TARGET으로 구조를 직접 주세요.`);
  }
  const m = commission.match(/^-\s*목표 구조\s*:\s*([SP]\d+-\d+)/m);
  return m ? { code: m[1], from: '의뢰 조건' } : null;
}
const splitCodes = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const countSentences = (ps) => ps.map((p) => (p.replace(/^\[\d+문단\]\s*/, '').match(/[.?!](?=\s|$)/g) || []).length);
const stat = (ps) => { const c = countSentences(ps); return `${bodyLen(ps)}자, 문장 [${c.join(', ')}] 합 ${c.reduce((a, b) => a + b, 0)}`; };

async function generate(topic, n) {
  const run = `${topic}-${n}`;
  const runDir = path.join(OUT, run);
  fs.mkdirSync(runDir, { recursive: true });
  const commission = read('commissions', `${topic}.md`);
  const base = `# 의뢰 조건\n\n${commission}\n\n# 집필 규칙\n\n${RULES}`;
  const avoid = splitCodes(process.env.AVOID || '');
  if (process.env.AVOID_FROM) {
    const f = path.join(DIR, process.env.AVOID_FROM, run, 'structure.txt');
    if (fs.existsSync(f)) {
      const m = fs.readFileSync(f, 'utf8').match(/^\s*([A-Z]+\d+(?:-\d+)?)/);
      if (m) avoid.push(m[1]); else warn(`[${run}] 경고: ${f} 에서 코드를 읽지 못함`);
    } else warn(`[${run}] 경고: ${f} 가 없음`);
  }
  const avoidUniq = [...new Set(avoid)];
  const target = findTarget(commission);
  let structure, candidates, design;
  if (target) {
    // 지정 모드: 0단계 호출 없이 그 구조 항목만 설계에 넘긴다
    candidates = [target.code];
    structure = `## 목표 구조 (지정)\n\n${target.code} (출처: ${target.from}). 후보를 고르지 않고 이 구조로 쓴다.\n`;
    fs.writeFileSync(path.join(runDir, '0-structure.md'), structure);
    const entries = pullEntries(candidates);
    design = await call(runDir, '1-design', P1, `${base}\n\n# 목표 구조 (지정됨)\n\n${target.code}. 이 구조로 쓴다. 후보 비교는 하지 않는다.\n\n# 구조 항목\n\n${entries}`);
  } else {
    structure = await call(runDir, '0-structure', P0, `# 의뢰 조건\n\n${commission}\n\n# 구조 목록\n\n${CATALOG}` + (avoidUniq.length ? `\n\n# 피할 구조\n\n${avoidUniq.join(', ')}` : ''));
    const candLine = structure.split('\n').find((l) => /^\s*후보 코드\s*:/.test(l));
    candidates = candLine ? splitCodes(candLine.replace(/^\s*후보 코드\s*:/, '')) : [];
    if (!candidates.length) warn(`[${run}] 경고: 0-structure.md 에서 "후보 코드:" 줄을 읽지 못함`);
    const entries = pullEntries(candidates);
    design = await call(runDir, '1-design', P1, `${base}\n\n# 구조 고르기 결과\n\n${structure}\n\n# 구조 후보 항목\n\n${entries}`);
  }
  const pick = design.match(/고른 구조\s*:\s*(\S+)\s+([^\n]*)/);
  if (target && pick && pick[1] !== target.code) warn(`[${run}] 경고: 지정 구조 ${target.code} 인데 설계서는 ${pick[1]} 를 적음`);
  if (target) fs.writeFileSync(path.join(runDir, 'structure.txt'), `${target.code} ${pick && pick[1] === target.code ? pick[2].trim() : ''}\n`);
  else if (pick) fs.writeFileSync(path.join(runDir, 'structure.txt'), `${pick[1]} ${pick[2].trim()}\n`);
  else warn(`[${run}] 경고: 설계서에서 "고른 구조:" 줄을 읽지 못함`);
  const outline = await call(runDir, '2-outline', P2, `${base}\n\n# 설계서\n\n${design}`);
  const draft = await call(runDir, '3-write', P3, `${base}\n\n# 설계서\n\n${design}\n\n# 개요\n\n${outline}`);
  const checked = await call(runDir, '4-check', P4, `${base}\n\n# 설계서\n\n${design}\n\n# 개요\n\n${outline}\n\n# 지문과 연결표\n\n${draft}`);
  const checkedPs = paraList(section(checked, '최종 지문'));
  if (!checkedPs.length) console.warn(`[${run}] 경고: 점검 후 최종 지문을 찾지 못함. 4-check.md 형식을 확인하세요.`);
  fs.writeFileSync(path.join(runDir, 'after-check.md'), checkedPs.join('\n\n') + '\n');
  const table = section(checked, '최종 연결표');
  const funcTable = section(checked, '문단 기능표');
  const bridged = await call(runDir, '5-bridge', P5, `# 지문\n\n${checkedPs.join('\n\n')}\n\n# 개요\n\n${outline}\n\n# 점검 단계의 문단 기능표\n\n${funcTable}\n\n# 연결표\n\n${table}`);
  const bridgedPs = paraList(section(bridged, '연결 채운 지문'));
  if (!bridgedPs.length) console.warn(`[${run}] 경고: 연결 채운 지문을 찾지 못함. 5-bridge.md 형식을 확인하세요.`);
  fs.writeFileSync(path.join(runDir, 'after-bridge.md'), bridgedPs.join('\n\n') + '\n');
  const lenLine = commission.split('\n').find((l) => l.startsWith('- 분량:')) || '';
  const proofed = await call(runDir, '6-proofread', P6, `# 지문\n\n${bridgedPs.join('\n\n')}\n\n# 연결표\n\n${table}\n\n# 의뢰 조건의 분량\n\n${lenLine}\n\n# 교정 전 분량\n\n글자 수(공백 포함) ${bodyLen(bridgedPs)}자, 문단마다 문장 수 [${countSentences(bridgedPs).join(', ')}], 합계 ${countSentences(bridgedPs).reduce((a, b) => a + b, 0)}문장`);
  const finalPs = paraList(section(proofed, '교정 지문'));
  if (!finalPs.length) console.warn(`[${run}] 경고: 교정 지문을 찾지 못함. 6-proofread.md 형식을 확인하세요.`);
  fs.writeFileSync(path.join(runDir, 'final-passage.md'), finalPs.join('\n\n') + '\n');
  const draftPs = paraList(section(draft, '지문'));
  return {
    run, draftPs, structure, design, candidates, avoid: avoidUniq, picked: pick ? `${pick[1]} ${pick[2].trim()}` : '(읽지 못함)', checkedPs, bridgedPs, finalPs, funcTable,
    added: section(bridged, '채운 내용'), bridgeFlags: section(bridged, '확인 필요'),
    edits: section(proofed, '교정 내역'), keep: section(proofed, '뜻 보존 확인'), flags: section(proofed, '확인 필요'),
  };
}

const results = [];
for (const topic of TOPICS) for (let n = 1; n <= SAMPLES; n++) results.push(await generate(topic, n));

let cmp = `# 단계별 비교 (${new Date().toISOString().slice(0, 10)})\n\n생성기 v3.1 (${MODEL}, ${EFFORT}). 집필 = 3-write의 지문, 점검 후 = 4-check의 최종 지문, 연결 후 = 5-bridge, 교정 후 = 6-proofread. 굵은 글씨 = 밑줄.\n\n`;
for (const r of results) {
  cmp += `---\n\n## ${r.run}\n\n후보: ${r.candidates.join(', ') || '(없음)'} / 고른 구조: ${r.picked} / 피한 구조: ${r.avoid.join(', ') || '없음'}\n\n길이(공백 포함): 집필 ${stat(r.draftPs)} → 점검 후 ${stat(r.checkedPs)} → 연결 후 ${stat(r.bridgedPs)} → 교정 후 ${stat(r.finalPs)}\n\n`;
  const n = Math.max(r.checkedPs.length, r.bridgedPs.length, r.finalPs.length);
  for (let k = 0; k < n; k++) {
    cmp += `**점검 후** ${r.checkedPs[k] ?? '(없음)'}\n\n**연결 후** ${r.bridgedPs[k] ?? '(없음)'}\n\n**교정 후** ${r.finalPs[k] ?? '(없음)'}\n\n`;
  }
  cmp += `### 점검 단계의 문단 기능표\n\n${r.funcTable || '(없음)'}\n\n`;
  cmp += `### 연결 채우기: 채운 내용\n\n${r.added || '(없음)'}\n\n### 연결 채우기: 확인 필요\n\n${r.bridgeFlags || '(없음)'}\n\n`;
  cmp += `### 구조 고르기\n\n#### 쟁점의 논리\n\n${section(r.structure, '쟁점의 논리') || '(없음)'}\n\n#### 후보\n\n${section(r.structure, '후보') || '(없음)'}\n\n#### 설계서 0절\n\n${section(r.design, '0. 구조 고르기') || '(없음)'}\n\n`;
  cmp += `### 표현 교정: 교정 내역\n\n${r.edits || '(없음)'}\n\n### 표현 교정: 뜻 보존 확인\n\n${r.keep || '(없음)'}\n\n### 표현 교정: 확인 필요\n\n${r.flags || '(없음)'}\n\n`;
}
fs.writeFileSync(path.join(OUT, 'COMPARE.md'), cmp);
console.log(`단계별 비교: ${path.join(path.basename(OUT), 'COMPARE.md')}`);
if (warnings.length) console.log(`경고 ${warnings.length}건:\n${warnings.join('\n')}`);
const rel = path.relative(process.cwd(), OUT);
console.log('\n충실도 검사 명령:');
for (const r of results) console.log(`node docs/experiments/fidelity-check-2026-11-16/fidelity.mjs ${path.join(rel, r.run, 'final-passage.md')} v31-${path.basename(OUT)}-${r.run}`);
