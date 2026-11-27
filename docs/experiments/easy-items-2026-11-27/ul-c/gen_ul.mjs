// 밑줄 이해 규칙 v2 우리 지문 시험 생성 (2026-11-28, 밑줄 위치 생성기가 고름). match-a/gen_match.mjs 복사, 규칙 파일과 같은 지문 neg 선지 전달만 다름. deep-item-v5 run.mjs 호출 방식: gpt-6.2-sol, developer 메시지에 규칙, 스트리밍, 재시도 0, usage.json 기록.
// 실행(저장소 루트): node docs/experiments/easy-items-2026-11-27/ul-c/gen_ul.mjs D-neg [H-pos ...]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const DIR = path.dirname(fileURLToPath(import.meta.url)); const EI = path.join(DIR, '..');
const require = createRequire(path.join(process.cwd(), 'package.json'));
let OpenAI;
for (const p of ['openai', path.join(process.cwd(), 'packages/pipeline/node_modules/openai'), path.join(process.cwd(), 'packages/app/node_modules/openai')]) { try { OpenAI = require(p); OpenAI = OpenAI.default ?? OpenAI; break; } catch {} }
if (!OpenAI) throw new Error('openai 패키지를 찾지 못했습니다');
if (!process.env.OPENAI_API_KEY && fs.existsSync('.env')) for (const line of fs.readFileSync('.env', 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const MODEL = 'gpt-6.2-sol', EFFORT = 'medium';
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
const rules = fs.readFileSync(path.join(EI, 'rules-underline-v2.md'), 'utf8');
const PICK1 = '지문의 핵심 개념·현상·과정 하나를 골라 ㉠으로 정한다(원칙 1).', PICK2 = '지문에서 짝이 되는 두 개념·입장·단계를 골라 ㉠, ㉡으로 정한다(원칙 1).';
const REQ = { 'T-pos': ['T', '㉠에 대해 이해한 내용으로 가장 적절한 것은?', 2, PICK1], 'T-neg': ['T', '㉠에 대한 이해로 적절하지 않은 것은?', 5, null], 'C-pos': ['C', '㉠, ㉡에 대한 이해로 가장 적절한 것은?', 3, PICK2], 'C-neg': ['C', '㉠, ㉡에 대한 이해로 적절하지 않은 것은?', 1, null] };
for (const name of process.argv.slice(2)) {
  if (!REQ[name]) throw new Error('의뢰 이름 오류 ' + name); const [pk, stem, ans, pick] = REQ[name]; if (!REQ[name]) throw new Error('의뢰 이름 오류 ' + name);
  const outDir = path.join(DIR, 'gen', name); if (fs.existsSync(path.join(outDir, 'raw.json'))) throw new Error(name + ' 이미 있음(재시도 금지)');
  fs.mkdirSync(outDir, { recursive: true });
  const passage = fs.readFileSync(path.join(DIR, 'inputs', `passage-${pk}.txt`), 'utf8');
  let target = pick;
  if (!pick) { const pp = path.join(DIR, 'gen', name.replace('-neg', '-pos'), 'item.json'); if (!fs.existsSync(pp)) throw new Error('먼저 ' + name.replace('-neg', '-pos')); target = JSON.parse(fs.readFileSync(pp, 'utf8')).targets.map(t => `${t.mark} = ${t.text}`).join(' / '); }
  const user = `## 의뢰\n- 발문: ${stem}\n- 정답 번호: ${ans}\n- 밑줄 대상: ${target}\n\n## 지문\n${passage}`;
  let userFull = user;
  if (name.endsWith('-neg')) { const negPath = path.join(DIR, 'gen', name.replace('-neg', '-pos'), 'item.json'); if (!fs.existsSync(negPath)) throw new Error('먼저 ' + name.replace('-neg', '-pos') + ' 를 만들어야 함'); const neg = JSON.parse(fs.readFileSync(negPath, 'utf8')); userFull = user + '\n\n## 이미 쓴 선지 (같은 지문의 다른 문항)\n' + neg.choices.map(c => c.text).join('\n'); }
  fs.writeFileSync(path.join(outDir, 'user-message.txt'), userFull);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, input: [{ role: 'developer', content: rules }, { role: 'user', content: userFull }] }).finalResponse();
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify(res, null, 2));
  const text = res.output_text ?? ''; let item = null, err = null;
  try { const m = text.match(/```json\s*([\s\S]*?)```/); item = JSON.parse(m ? m[1] : text); } catch (e) { err = String(e); }
  if (item) { item.request = { name, stem, answerIntended: ans, passage: pk }; fs.writeFileSync(path.join(outDir, 'item.json'), JSON.stringify(item, null, 2)); }
  const up = path.join(DIR, 'gen', 'usage.json'); const log = fs.existsSync(up) ? JSON.parse(fs.readFileSync(up, 'utf8')) : [];
  log.push({ stage: name, model: res.model, effort: EFFORT, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage }); fs.writeFileSync(up, JSON.stringify(log, null, 2));
  console.log(`[${name}] 완료 ${Math.round((Date.now() - t0) / 1000)}초`, JSON.stringify(res.usage), err ? 'JSON 파싱 실패: ' + err : 'JSON OK');
}
