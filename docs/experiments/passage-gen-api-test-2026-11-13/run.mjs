// API로 수능형 지문을 생성한다: 설계 → 집필 → 점검·수정 (3단계, 사람 개입 없음).
// 그다음 웹 파일럿 지문(v1, v4)과 섞어 블라인드 판정지를 만든다.
// 실행: 저장소 루트에서  node docs/experiments/passage-gen-api-test-2026-11-13/run.mjs
// 필요: OPENAI_API_KEY (저장소 .env 또는 셸 환경), 저장소의 openai 패키지.
// 환경 변수: GEN_MODEL (기본 gpt-6.1-sol), GEN_EFFORT (기본 high), SAMPLES (주제당 생성 수, 기본 2),
//            TOPICS (기본 "C,B"), FORCE=1 (캐시 무시), BLIND_ONLY=1 (생성 없이 판정지만 다시 만듦)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PILOT = path.join(DIR, '..', 'passage-gen-pilot-2026-11-13');
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const SAMPLES = Number(process.env.SAMPLES || 2);
const TOPICS = (process.env.TOPICS || 'C,B').split(',').map((s) => s.trim()).filter(Boolean);

const read = (...p) => fs.readFileSync(path.join(DIR, ...p), 'utf8');
const RULES = read('prompts', 'rules.md');
const P1 = read('prompts', '1-design.md');
const P2 = read('prompts', '2-write.md');
const P3 = read('prompts', '3-check.md');

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

const usageLog = fs.existsSync(path.join(OUT, 'usage.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'usage.json'), 'utf8')) : [];

async function call(runDir, stage, instructions, input) {
  const cached = path.join(runDir, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${path.basename(runDir)}/${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${path.basename(runDir)}/${stage}] 호출 중 (${MODEL}, ${EFFORT})...`);
  const t0 = Date.now();
  const res = await getClient().responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, instructions, input }).finalResponse();
  const text = res.output_text;
  fs.writeFileSync(cached, text);
  usageLog.push({ run: path.basename(runDir), stage, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage });
  fs.writeFileSync(path.join(OUT, 'usage.json'), JSON.stringify(usageLog, null, 2));
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
const paragraphs = (text) => text.split('\n').filter((l) => /^\[\d+문단\]/.test(l.trim())).map((l) => l.trim()).join('\n\n');

async function generate(topic, n) {
  const runDir = path.join(OUT, `${topic}-${n}`);
  fs.mkdirSync(runDir, { recursive: true });
  const commission = read('commissions', `${topic}.md`);
  const base = `# 의뢰 조건\n\n${commission}\n\n# 집필 규칙\n\n${RULES}`;
  const design = await call(runDir, '1-design', P1, base);
  const draft = await call(runDir, '2-write', P2, `${base}\n\n# 설계서\n\n${design}`);
  const checked = await call(runDir, '3-check', P3, `${base}\n\n# 설계서\n\n${design}\n\n# 지문과 연결표\n\n${draft}`);
  const final = paragraphs(section(checked, '최종 지문'));
  if (!final) console.warn(`[${topic}-${n}] 경고: 최종 지문을 찾지 못함. 3-check.md 형식을 확인하세요.`);
  fs.writeFileSync(path.join(runDir, 'final-passage.md'), final + '\n');
  return final;
}

function buildBlind(items) {
  // 순서를 섞는다 (Fisher-Yates). 실행할 때마다 달라지며 KEY.md에 기록된다.
  const order = items.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const labels = '가나다라마바사아자차'.split('');
  let review = `# 지문 블라인드 판정 (${new Date().toISOString().slice(0, 10)})\n\n`;
  review += '출처(사람이 다듬은 것 / API 생성)를 가렸습니다. 굵은 글씨 = 밑줄.\n\n';
  review += '각 지문마다 아래 질문에 답해 주세요. 점수는 1(나쁨)~5(좋음).\n\n';
  review += '1. 실제로 쓸 수 있나: 그대로 / 조금 고치면 / 못 씀\n2. 배경 과학과 입장의 연결\n3. 입장의 깊이 (판정 기준이 있나, 피상적인가)\n4. 기존 기출을 흉내 낸 느낌 (5 = 전혀 안 남)\n5. 사실·논리 오류 의심 지점 (있으면 문장 인용)\n6. 종합\n\n마지막에 전체 순위를 적어 주세요.\n\n';
  let key = '# 블라인드 판정 열쇠\n\n| 기호 | 출처 |\n|---|---|\n';
  order.forEach((idx, k) => {
    review += `---\n\n## 지문 ${labels[k]}\n\n${items[idx].text}\n\n**판정**\n- 실제 사용:\n- 연결:\n- 깊이:\n- 기출 흉내 없음:\n- 오류 의심:\n- 종합:\n\n`;
    key += `| ${labels[k]} | ${items[idx].source} |\n`;
  });
  review += '---\n\n## 전체 순위\n\n';
  fs.writeFileSync(path.join(DIR, 'REVIEW-blind.md'), review);
  fs.writeFileSync(path.join(DIR, 'KEY.md'), key);
  console.log('판정지: REVIEW-blind.md / 열쇠: KEY.md (판정 전에 KEY.md는 열지 마세요)');
}

const items = [];
for (const topic of TOPICS) {
  for (let n = 1; n <= SAMPLES; n++) {
    const runDir = path.join(OUT, `${topic}-${n}`);
    let text;
    if (process.env.BLIND_ONLY) {
      const f = path.join(runDir, 'final-passage.md');
      if (!fs.existsSync(f)) continue;
      text = fs.readFileSync(f, 'utf8').trim();
    } else {
      text = await generate(topic, n);
    }
    if (text) items.push({ source: `API ${topic}-${n} (${MODEL}, ${EFFORT})`, text });
  }
}
// 기준 지문: 웹 파일럿 v1, v4 (주제 C)
for (const [file, source] of [['03-passage-C.md', '웹 파일럿 v1 (사람 판정 전)'], ['06-passage-C-v4.md', '웹 파일럿 v4 (사람·Codex 피드백 4회 반영)']]) {
  const f = path.join(PILOT, file);
  if (fs.existsSync(f)) items.push({ source, text: paragraphs(fs.readFileSync(f, 'utf8')) });
  else console.warn(`기준 지문 없음: ${f}`);
}
buildBlind(items);
