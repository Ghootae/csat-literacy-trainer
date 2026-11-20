// 노출 수리 (leak-fix, 2026-11-20): set-pattern-2026-11-18/LEAK-FIX.md 3절 구현. eval-repair.mjs 뒤에 붙인다.
// 〈보기〉가 정답 판정 사실(지시 대상·선후·같음/다름·누구의 입장과 같음)을 대놓고 말하면, 그 문장만 단서(행동·날짜·발화·값)로 바꾼다.
// 단계(문항 파일 하나 = 같은 지문·같은 양식의 문항들, ONLY=V1처럼 버전을 고를 수 있다):
//   l12-find-rewrite (정답·answerIntent를 앎) L1 노출 문장 찾기 → 없으면 '없음'으로 끝. 있으면 L2 그 문장만 단서로 바꾼 대체문과 학생의 추론 한 줄.
//   l3-resolve       (정답 모름, 별도 호출) 고친 문항을 처음부터 풀고 선지별 근거·정답 유일성.
//   판정(서버): 〈보기〉는 서버가 '찾은 문장만' 대체문으로 갈아 끼워 만든다(다른 문장은 한 글자도 안 바뀜). 정답 일치 + 유일 + 〈보기〉 길이 ±20% 안 + 선지·발문 불변 → 채택, 아니면 원본 유지(되돌림).
// 실행(저장소 루트): PASSAGE=<id> IN=<items-final.json> OUT_DIR=<결과 폴더> [ONLY=V1] node docs/experiments/deep-item-v5-2026-11-18/leak-fix.mjs
//   출력: items-leakfix.json(채택본 + 원본 유지본), leakfix-log.md, usage.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const DIR = path.dirname(fileURLToPath(import.meta.url));
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
const MODEL = process.env.GEN_MODEL || 'gpt-6.2-sol'; // 기본 6.2-sol(2026-11-20, REPORT-cell-gen62.md). 6.1은 GEN_MODEL=gpt-6.1-sol
const EFFORT = process.env.GEN_EFFORT || 'high';
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
const PID = process.env.PASSAGE; if (!PID) throw new Error('PASSAGE=<id>');
const IN = process.env.IN; if (!IN) throw new Error('IN=<items-final.json 경로>');
const OUT = process.env.OUT_DIR; if (!OUT) throw new Error('OUT_DIR=<결과 폴더>');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const passage = fs.readFileSync(path.join(DIR, 'passages', PID, 'passage.txt'), 'utf8');
const commonRules = fs.readFileSync(path.join(DIR, 'rules-common.md'), 'utf8');
const usagePath = path.join(OUT, 'usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];
// gpt-6.2 계열은 긴 규칙을 top-level instructions 대신 developer 메시지로 보낸다(캐시용, 2026-11-20). 6.1 동작은 그대로.
const reqBody = (instructions, input) => MODEL.startsWith('gpt-6.2') ? { input: [{ role: 'developer', content: instructions }, ...(Array.isArray(input) ? input : [{ role: 'user', content: input }])] } : { instructions, input };
async function call(stage, instructions, input) {
  const cached = path.join(OUT, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${stage}] 호출 중 (${MODEL}, ${EFFORT})...`);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, ...reqBody(instructions, input) }).finalResponse();
  fs.writeFileSync(cached, res.output_text);
  usageLog.push({ stage, model: res.model, seconds: Math.round((Date.now() - t0) / 1000), usage: res.usage });
  fs.writeFileSync(usagePath, JSON.stringify(usageLog, null, 2));
  console.log(`[${stage}] 완료 ${Math.round((Date.now() - t0) / 1000)}초`);
  return res.output_text;
}
const lastJson = t => { const m = [...t.matchAll(/```json\s*([\s\S]*?)```/g)].pop(); if (!m) throw new Error('JSON 블록 없음'); return JSON.parse(m[1]); };
const COMMON = '한국어로 작업하고 한국어로 출력한다. 이 지문으로 출제된 실제 시험 문항을 기억하더라도 쓰거나 흉내 내지 않는다. 오직 주어진 지문과 자료만 근거로 한다.';
const CIRC = ['①', '②', '③', '④', '⑤'];
const strip = c => c.replace(/^\s*[①②③④⑤]\s*/, '');
const polarity = it => /적절하지\s*않은/.test(it.stem) ? '부정 발문(적절하지 않은 것 = 내용상 거짓인 선지가 정답, 나머지 넷은 내용상 참)' : '긍정 발문(가장 적절한 것 = 내용상 참인 선지가 정답, 나머지 넷은 내용상 거짓)';
const toStr = x => typeof x === 'string' ? x : JSON.stringify(x);
// 〈보기〉를 문장으로 나눈다(마침표·물음표·느낌표 뒤 공백). 표·줄바꿈이 있으면 줄 단위도 문장 경계로 본다.
const splitSentences = bogi => bogi.split(/\n+/).flatMap(line => line.split(/(?<=[.?!])\s+/)).map(s => s.trim()).filter(Boolean);
const numbered = sents => sents.map((s, i) => `(${i + 1}) ${s}`).join('\n');
const itemText = (it, bogiText) => `${it.stem}\n〈보기〉\n${bogiText}\n${it.choices.join('\n')}`;

const src = JSON.parse(fs.readFileSync(IN, 'utf8'));
const targets = src.items.filter(it => !ONLY || ONLY.includes(it.version));
const results = [];
const logLines = [`# leak-fix 로그: ${PID} (${new Date().toISOString().slice(0, 10)}, ${MODEL})`, ''];

for (const it of targets) {
  const sents = splitSentences(it.bogi);
  const keyed = `[${it.version}] 정답 ${CIRC[it.answer - 1]} (${polarity(it)}), 갈래 ${it.kind}
출제 의도(answerIntent): ${toStr(it.answerIntent ?? '')}
선지별 출제 의도(intent): ${toStr(it.intent ?? '')}
가장 강한 경쟁 선지: ${it.rival ?? '미상'}
${it.stem}
〈보기〉 (문장 번호 붙임)
${numbered(sents)}
${it.choices.join('\n')}`;
  const r1 = lastJson(await call(`l12-find-rewrite-${it.version}`, `너는 수능 국어 독서 문항 검토·수리자다. ${COMMON}
〈보기〉가 정답을 판정하는 데 쓰이는 '판정 관계'를 대놓고 적어 학생이 문장을 옮기기만 하면 되는지 찾고, 그런 문장만 고친다.

[L1 노출 찾기]
판정 관계란 정답(과 가장 강한 경쟁 선지)을 가르는 데 쓰이는 사실 중 다음 종류다: 무엇이 무엇을 가리키는지(지시 대상), 무엇이 먼저·이미 일어났는지(선후), 두 대상이 같은지 다른지, 누구의 입장과 같은지.
〈보기〉의 어떤 문장이 이런 관계를 결론 형태로 직접 진술해, 학생이 행동·발화·날짜·값에서 끌어낼 추론 없이 그 문장을 선지에 옮기기만 하면 판정이 끝난다면 '노출'이다.
- 노출이 아닌 것: 판정에 필요하지만 사건·값·발화로 적혀 학생이 한 단계 추론해야 관계를 되찾는 문장, 〈보기〉의 배경·인물 소개, 비판형 발문에서 비판의 전제로 주어진 것.
- 정답·경쟁 선지 판정에 쓰이지 않는 문장은 노출 후보가 아니다.
- 노출 문장은 많아야 2개까지만 고른다(정답을 가장 직접 옮겨 주는 것부터). 없으면 leaks를 빈 배열로 둔다(억지로 찾지 않는다).

[L2 바꾸기] (노출 문장이 있을 때만)
각 노출 문장 하나를, 같은 판정 관계를 학생이 한 단계 추론으로 되찾을 수 있는 '단서' 문장으로 바꾼다.
1. 지우지 않고 단서로 바꾼다. 단서는 행동·날짜·발화·값이다. 학생이 지문 개념을 거쳐 한 단계만 추론하면 그 관계(와 같은 정답)를 되찾을 수 있어야 한다.
2. 그 밖의 조건·값·인물·사건은 하나도 늘리거나 줄이지 않는다. 대체문에 새 인물·새 사건·새 조건을 넣지 않고, 〈보기〉의 다른 문장에 이미 있는 대상과 사건을 그대로 쓴다. 선지·정답 번호·발문은 건드리지 않는다.
3. 억지 퍼즐을 만들지 않는다. 단서는 실제 상황에서 자연스럽게 기록될 정보(일지, 대화, 날짜, 측정값)여야 한다.
4. 정답이 하나로 정해지는 구조를 유지한다. 경쟁 선지가 새로 정답이 될 수 있게 단서를 흐리거나, 정답과 반대 결론이 나오게 바꾸지 않는다.
5. 바꾼 문장 길이는 원문과 비슷하게(±40% 안) 한다.
6. 다른 소재 예(설명용): 〈보기〉에 "택배 B는 A와 같은 물건이다"라는 판정 관계 진술이 있었다면 "택배 B의 송장에는 A와 같은 일련번호가 적혀 있었다"처럼 학생이 '같은 일련번호 → 같은 물건'을 한 단계 추론하게 바꾼다. 이 예의 소재를 결과에 쓰지 않는다.

맨 끝에 JSON 블록(노출 없음이면 leaks와 changes를 빈 배열로): \`\`\`json {"version":"V1","leaks":[{"no":3,"sentence":"원문 그대로","relation":"지시 대상|선후|같음·다름|입장 일치","whyLeaks":"무엇이 판정을 대신 말하는지 한 줄"}],"changes":[{"no":3,"after":"대체문","clue":"단서가 되는 행동·날짜·발화·값","inference":"학생이 거칠 추론 한 줄"}],"summary":"한 줄"} \`\`\``,
    `[지문]\n${passage}\n\n[공통 원칙]\n${commonRules}\n\n[문항]\n${keyed}`));
  const log = { version: it.version, leaks: r1.leaks || [], changes: r1.changes || [] };
  const entry = { ...it, leakfix: { adopted: false, status: '', leaks: log.leaks, changes: log.changes } };
  logLines.push(`## ${it.version}`, '', `정답 ${it.answer}, 발문: ${it.stem}`, '');
  if (!log.leaks.length || !log.changes.length) {
    entry.leakfix.status = '노출 없음(원본 유지)';
    logLines.push(`- L1: 노출 없음 — ${r1.summary || ''}`, '');
    results.push(entry); continue;
  }
  // 서버가 〈보기〉를 직접 조립: 찾은 문장 번호만 대체문으로.
  const byNo = new Map(log.changes.map(c => [Number(c.no), c]));
  const bad = [...byNo.keys()].filter(n => !(n >= 1 && n <= sents.length));
  if (bad.length) { entry.leakfix.status = `되돌림: 문장 번호 오류 ${bad.join(',')}`; results.push(entry); logLines.push(`- ${entry.leakfix.status}`, ''); continue; }
  const newSents = sents.map((s, i) => byNo.has(i + 1) ? byNo.get(i + 1).after.trim() : s);
  const newBogi = it.bogi.includes('\n') ? newSents.join('\n') : newSents.join(' ');
  const ratio = newBogi.length / it.bogi.length;
  logLines.push('- L1 노출 문장:', ...log.leaks.map(l => `  - (${l.no}) ${l.sentence} — [${l.relation}] ${l.whyLeaks}`), '- L2 바꾼 문장:', ...log.changes.map(c => `  - (${c.no}) ${sents[Number(c.no) - 1]}\n    → ${c.after}\n    단서: ${c.clue} / 추론: ${c.inference}`), `- 〈보기〉 길이: ${it.bogi.length}자 → ${newBogi.length}자 (${(ratio * 100 - 100).toFixed(1)}%)`);
  // L3: 정답 모르는 별도 호출이 고친 문항을 처음부터 푼다.
  const patched = { ...it };
  const r3 = lastJson(await call(`l3-resolve-${it.version}`, `너는 수능 국어 만점권 수험생이다. ${COMMON}
문항을 처음 보는 것처럼 푼다. 발문의 극성에 주의한다: 부정 발문이면 정답은 내용상 거짓인 선지 하나이고, 긍정 발문이면 내용상 참인 선지 하나다.
선지마다 판정(참/거짓)과 지문·〈보기〉 근거 한 줄을 적고, 〈보기〉를 읽고 판정하기 위해 거친 추론이 무엇인지 적는다. 정답이 정확히 하나로 정해지는지(valid_answers), 근거가 약해 정해지지 않는 선지(weak)가 있는지도 적는다.
맨 끝에 JSON 블록: \`\`\`json {"version":"${it.version}","answer":3,"choices":[{"n":1,"truth":"참","why":"..."}],"valid_answers":[3],"weak":[],"inferenceNeeded":"〈보기〉에서 지문 개념으로 이어 읽는 데 거친 추론 한 줄"} \`\`\``,
    `[지문]\n${passage}\n\n[문항]\n${itemText(patched, newBogi)}`));
  const va = (r3.valid_answers || []).map(Number);
  const reasons = [];
  if (Number(r3.answer) !== it.answer) reasons.push(`다시 푼 답 ${r3.answer} ≠ 정답 ${it.answer}`);
  if (!(va.length === 1 && va[0] === it.answer)) reasons.push(`정답 유일성 문제: 후보 ${JSON.stringify(va)}`);
  if (Math.abs(ratio - 1) > 0.2) reasons.push(`〈보기〉 길이 변화 ${(ratio * 100 - 100).toFixed(1)}% (±20% 초과)`);
  logLines.push(`- L3 다시 풀기: 답 ${r3.answer}, 후보 ${JSON.stringify(va)}, 약한 선지 ${JSON.stringify(r3.weak || [])}, 거친 추론: ${r3.inferenceNeeded}`);
  if (reasons.length) {
    entry.leakfix.status = `되돌림(원본 유지): ${reasons.join(' / ')}`;
  } else {
    entry.leakfix.adopted = true; entry.leakfix.status = '채택';
    entry.beforeLeakfix = { bogi: it.bogi };
    entry.bogi = newBogi;
  }
  entry.leakfix.resolve = { answer: r3.answer, validAnswers: va, weak: r3.weak || [], inferenceNeeded: r3.inferenceNeeded };
  logLines.push(`- 결과: **${entry.leakfix.status}**`, '');
  results.push(entry);
}
fs.writeFileSync(path.join(OUT, 'items-leakfix.json'), JSON.stringify({ passage: PID, items: results }, null, 2));
fs.writeFileSync(path.join(OUT, 'leakfix-log.md'), logLines.join('\n') + '\n');
console.log('\n' + results.map(r => `${r.version}: ${r.leakfix.status}`).join('\n') + '\n결과: ' + OUT);
