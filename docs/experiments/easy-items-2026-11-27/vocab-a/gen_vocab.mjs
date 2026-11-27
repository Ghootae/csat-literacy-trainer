// 어휘 문항 규칙 v1 시험 생성 (2026-11-28). ul-d/gen_ul.mjs 복사, 규칙 파일·의뢰·같은 지문 둘째 문항에 이미 고른 낱말 전달만 다름. deep-item-v5 run.mjs 호출 방식: gpt-6.2-sol, developer 메시지에 규칙, 스트리밍, 재시도 0, usage.json 기록.
// 실행(저장소 루트): node docs/experiments/easy-items-2026-11-27/vocab-a/gen_vocab.mjs S-B [S-A ...]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const DIR = path.dirname(fileURLToPath(import.meta.url)); const EI = path.join(DIR, '..');
const require = createRequire(path.join(process.cwd(), 'package.json'));
let OpenAI;
for (const p of ['openai', path.join(process.cwd(), 'packages/pipeline/node_modules/openai'), path.join(process.cwd(), 'packages/app/node_modules/openai')]) { try { OpenAI = require(p); OpenAI = OpenAI.default ?? OpenAI; break; } catch {} }
if (!OpenAI) throw new Error('openai 패키지를 찾지 못했습니다');
if (!process.env.OPENAI_API_KEY && fs.existsSync('.env')) for (const line of fs.readFileSync('.env', 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const MODEL = 'gpt-6.2-sol', EFFORT = 'medium';
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
const rules = fs.readFileSync(path.join(EI, 'rules-vocab-v1.md'), 'utf8');
const REQ = { 'S-B': ['S', 'B', '한자어 → 고유어', '문맥상 ⓐ～ⓔ와 바꿔 쓰기에 적절하지 않은 것은?', 3, null], 'S-A': ['S', 'A', null, 'ⓐ와 문맥상 의미가 가장 가까운 것은?', 5, 'S-B'], 'N-A': ['N', 'A', null, 'ⓐ와 문맥상 의미가 가장 가까운 것은?', 2, null], 'N-B': ['N', 'B', '고유어 → 한자어', '문맥상 ⓐ～ⓔ와 바꿔 쓰기에 가장 적절한 것은?', 4, 'N-A'] };
for (const name of process.argv.slice(2)) {
  if (!REQ[name]) throw new Error('의뢰 이름 오류 ' + name); const [pk, form, dir, stem, ans, prev] = REQ[name];
  const outDir = path.join(DIR, 'gen', name); if (fs.existsSync(path.join(outDir, 'raw.json'))) throw new Error(name + ' 이미 있음(재시도 금지)');
  fs.mkdirSync(outDir, { recursive: true });
  const passage = fs.readFileSync(path.join(DIR, 'inputs', `${pk}-plain.txt`), 'utf8');
  let userFull = `## 의뢰\n- 꼴: ${form}\n${dir ? `- 방향: ${dir}\n` : ''}- 발문: ${stem}\n- 정답 번호: ${ans}\n\n## 지문\n${passage}`;
  if (prev) { const pp = path.join(DIR, 'gen', prev, 'item.json'); if (!fs.existsSync(pp)) throw new Error('먼저 ' + prev); userFull += '\n\n## 이미 고른 낱말 (다시 고르지 말 것)\n' + JSON.parse(fs.readFileSync(pp, 'utf8')).targets.map(t => t.word).join(', '); }
  fs.writeFileSync(path.join(outDir, 'user-message.txt'), userFull);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, input: [{ role: 'developer', content: rules }, { role: 'user', content: userFull }] }).finalResponse();
  fs.writeFileSync(path.join(outDir, 'raw.json'), JSON.stringify(res, null, 2));
  const text = res.output_text ?? ''; let item = null, err = null;
  try { const m = text.match(/```json\s*([\s\S]*?)```/); item = JSON.parse(m ? m[1] : text); } catch (e) { err = String(e); }
  if (item) { item.request = { name, stem, answerIntended: ans, passage: pk, form }; fs.writeFileSync(path.join(outDir, 'item.json'), JSON.stringify(item, null, 2)); }
  const up = path.join(DIR, 'gen', 'usage.json'); const log = fs.existsSync(up) ? JSON.parse(fs.readFileSync(up, 'utf8')) : [];
  log.push({ stage: name, model: res.model, effort: EFFORT, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage }); fs.writeFileSync(up, JSON.stringify(log, null, 2));
  console.log(`[${name}] 완료 ${Math.round((Date.now() - t0) / 1000)}초`, JSON.stringify(res.usage), err ? 'JSON 파싱 실패: ' + err : 'JSON OK');
}
