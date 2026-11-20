// 정답 시비 수리 (dispute-fix, 2026-11-20): leak-fix.mjs 뒤, 블라인드 전에 붙인다. 구조는 leak-fix와 같다.
// 근거: set-pattern-2026-11-18/REPORT-cell-gen62.md 6절(6.2 생성분에서 '정답 시비' ㉳가 반복, 다시 풀기 검사는 정답 일치만 봄).
// 단계(문항 파일 하나, ONLY=V1처럼 버전 선택):
//   d1-find    (정답·의도를 앎) 시비 소지 찾기: 비교 기준 없는 "더 ~한", 판정이 갈릴 수 있는 표현, 복수 정답·무정답 가능성. severity high만 '잡힘'.
//              DETECT_ONLY=1 이면 여기서 끝(보정용).
//   d2-rewrite (정답 앎) 잡힌 표현만 최소 수정(선지·〈보기〉의 정확한 부분 문자열 바꾸기). 정답·선지별 참거짓 유지, 새 판정 관계 노출 금지.
//   d3-resolve (정답 모름, 별도 호출) 고친 문항을 처음부터 풀고 정답 유일성 + 남은 시비(high) 표시.
//   판정(서버): 정답 일치 + 유일 + 남은 high 시비 없음 + 〈보기〉 길이 ±20% + 발문 불변 → 채택, 아니면 원본 유지(되돌림).
// 실행(저장소 루트): PASSAGE=<id> IN=<items-leakfix.json> OUT_DIR=<결과 폴더> [ONLY=V1] [DETECT_ONLY=1] [GEN_MODEL=gpt-6.2-sol] node docs/experiments/deep-item-v5-2026-11-18/dispute-fix.mjs
//   출력: items-dispute.json(채택본 + 원본 유지본), dispute-log.md, usage.json
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
const MODEL = process.env.GEN_MODEL || 'gpt-6.2-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
const PID = process.env.PASSAGE; if (!PID) throw new Error('PASSAGE=<id>');
const IN = process.env.IN; if (!IN) throw new Error('IN=<items-leakfix.json 경로>');
const OUT = process.env.OUT_DIR; if (!OUT) throw new Error('OUT_DIR=<결과 폴더>');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const passage = fs.readFileSync(path.join(DIR, 'passages', PID, 'passage.txt'), 'utf8');
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

const itemText = (it, bogiText, choices) => `${it.stem}\n〈보기〉\n${bogiText}\n${choices.join('\n')}`;
const DETECT_ONLY = !!process.env.DETECT_ONLY;
const src = JSON.parse(fs.readFileSync(IN, 'utf8'));
const targets = src.items.filter(it => !ONLY || ONLY.includes(it.version));
const results = [];
const logLines = [`# dispute-fix 로그: ${PID} (${new Date().toISOString().slice(0, 10)}, ${MODEL}${DETECT_ONLY ? ', 찾기만' : ''})`, ''];

const FIND = `너는 수능 국어 독서 문항의 이의 제기 심사위원이다. ${COMMON}
주어진 문항(정답 포함)을 보고, 수능 직후 '정답 이의 제기'가 근거 있게 들어올 만한 곳이 있는지 찾는다.

[시비로 보는 것] 성실하고 실력 있는 수험생이, 지문과 〈보기〉만 근거로, 다음 중 하나를 그럴듯하게 주장할 수 있는 경우다.
 (a) 공식 정답이 정답이 아니다(정답 선지의 참·거짓 판정이 표현 해석에 따라 뒤집힌다).
 (b) 다른 선지도 정답이다(오답 선지의 참·거짓이 표현 해석에 따라 뒤집힌다).
 (c) 정답이 없다.
흔한 원인: 비교 기준이 없는 비교 표현("더 ~한", "상대적으로", "높은/낮은"이 무엇에 대한 것인지 불분명), 범위·양화 표현(모두, ~만으로, 충분히, 반드시)의 해석 차이, 지문이 정하지 않은 전제나 바깥 지식에 기대야 판정되는 진술, 지문과 다른 뜻으로 쓰인 용어, 두 가지로 읽히는 〈보기〉의 사실.

[시비가 아닌 것] 추론이 어렵거나 여러 단계라는 것만으로는 시비가 아니다. 지문 개념을 거쳐 한두 단계 추론하면 한쪽으로 정해지는 것, 수능 기출에서 흔히 쓰는 수준의 함축·요약 표현, 문장이 어색하지만 판정이 달라지지 않는 것은 시비가 아니다. 억지로 찾지 않는다.

[반박 시험 — 2차 보정, 2026-11-20] 시비 후보마다, 출제 기관이 이 이의를 기각할 때 쓸 가장 강한 반박을 먼저 쓴다. 반박의 근거: 지문의 정의·설명, 〈보기〉의 다른 사실, 발문, 다른 선지와의 대비, 수능 독서 문항의 통상 독해 관습(선지는 지문의 개념을 그 뜻 그대로 쓴 것으로 읽고, 〈보기〉의 사실은 자연스러운 첫 독해로 읽으며, 문장에 없는 사정을 덧붙여 읽지 않는다).
- 반박이 성립하면(대부분의 성실한 수험생이 해석 1로 읽고, 해석 2는 문장에 없는 사정을 덧붙이거나 지문 개념을 다른 뜻으로 바꿔야 나오는 경우) 그 후보는 low다.
- high는 반박이 실패할 때만이다: 해석 2가 해석 1만큼 자연스럽게 읽히고, 지문·〈보기〉 어디에도 해석 1로 정할 근거가 없으며, 그 해석 차이로 정답 판정이 실제로 바뀐다.
- 확신이 서지 않으면 low로 둔다. 평가원·수능 기출 문항이 흔히 쓰는 수준의 표현은 high가 아니다.
- [3차 보정] high로 두려면 해석 2를 뒷받침하는 문장을 지문이나 〈보기〉에서 그대로 인용할 수 있어야 한다(supportQuote). 인용할 문장 없이 '그렇게 볼 수도 있다'는 가능성만 있으면 low다.
- 선지가 '~라면', '~한 경우'처럼 가정·조건을 명시해 두었으면, 그 가정 자체를 다르게 읽는 것은 시비가 아니다(가정은 문장대로 받아들인다).
- 〈보기〉에 쓰인 낱말(예: 어떤 광고·행위의 성격 규정)은 〈보기〉가 주는 사실로 받아들인다. 그 규정이 사실인지 따지는 것은 시비가 아니다.

[등급] high = 위 반박 시험을 통과하지 못한 시비(출제 기관이 정답을 바꾸거나 복수 정답을 인정해야 할 수준). low = 그 밖의 것.
각 시비에 선지 번호(〈보기〉 문장이면 0), 문제 표현(원문 그대로의 짧은 부분 문자열), 두 해석, 어느 해석이면 판정이 어떻게 바뀌는지, 출제 기관의 반박과 그 반박이 성립하는지 적는다.

맨 끝에 JSON 블록(없으면 빈 배열): \`\`\`json {"version":"V1","disputes":[{"choice":2,"phrase":"원문 부분 문자열","readings":["해석1","해석2"],"effect":"해석2라면 ②도 참이 되어 정답이 둘","rebuttal":"출제 기관의 가장 강한 반박","rebuttalHolds":false,"supportQuote":"해석 2를 뒷받침하는 지문·〈보기〉 문장 그대로(high일 때 필수)","severity":"high"}],"summary":"한 줄"} \`\`\``;

for (const it of targets) {
  const keyed = `[${it.version}] 정답 ${CIRC[it.answer - 1]} (${polarity(it)})${it.kind ? `, 갈래 ${it.kind}` : ''}
출제 의도(answerIntent): ${toStr(it.answerIntent ?? '없음')}
선지별 출제 의도(intent): ${toStr(it.intent ?? '없음')}
${itemText(it, it.bogi, it.choices)}`;
  const r1 = lastJson(await call(`d1-find-${it.version}`, FIND, `[지문]\n${passage}\n\n[문항]\n${keyed}`));
  const all = r1.disputes || [];
  const high = all.filter(d => d.severity === 'high');
  const entry = { ...it, dispute: { adopted: false, status: '', found: all } };
  logLines.push(`## ${it.version}`, '', `정답 ${it.answer}, 발문: ${it.stem}`, '');
  logLines.push(...(all.length ? all.map(d => `- [${d.severity}] ${d.choice ? CIRC[d.choice - 1] : '〈보기〉'} "${d.phrase}" — ${(d.readings || []).join(' / ')} → ${d.effect}`) : [`- 시비 없음 — ${r1.summary || ''}`]));
  if (!high.length) { entry.dispute.status = all.length ? '잡힘 없음(low만)' : '시비 없음'; logLines.push(`- 결과: ${entry.dispute.status}`, ''); results.push(entry); continue; }
  if (DETECT_ONLY) { entry.dispute.status = `잡힘 ${high.length}건(찾기만)`; logLines.push(`- 결과: **${entry.dispute.status}**`, ''); results.push(entry); continue; }

  const r2 = lastJson(await call(`d2-rewrite-${it.version}`, `너는 수능 국어 독서 문항 수리자다. ${COMMON}
[시비] 목록의 표현만 최소로 고쳐, 시비가 사라지게 한다.
1. 고치는 곳은 해당 선지 또는 〈보기〉의 부분 문자열뿐이다. before는 원문에 정확히 한 번 나오는 부분 문자열이어야 한다. 발문·정답 번호는 그대로 둔다.
2. 모든 선지의 참·거짓(정답 포함)은 출제 의도대로 유지한다. 시비 해석을 막는 방향(비교 기준 밝히기, 범위 좁히기, 지문 용어로 바꾸기)으로 고친다.
3. 정답을 판정하는 관계(지시 대상, 선후, 같음·다름, 누구의 입장과 같음)를 〈보기〉가 결론으로 직접 말하게 만들지 않는다(새 노출 금지). 〈보기〉에 새 인물·새 사건을 넣지 않는다.
4. 고친 뒤에도 문장이 수능 선지답게 간결해야 한다.
맨 끝에 JSON 블록: \`\`\`json {"version":"${it.version}","edits":[{"where":"choice","choice":2,"before":"원문 부분 문자열","after":"고친 문자열","why":"어느 시비를 어떻게 막는지"}],"summary":"한 줄"} \`\`\` (where는 choice 또는 bogi, bogi면 choice는 0)`,
    `[지문]\n${passage}\n\n[문항]\n${keyed}\n\n[시비]\n${JSON.stringify(high, null, 1)}`));
  const edits = r2.edits || [];
  let bogi = it.bogi; const choices = [...it.choices]; const errs = [];
  for (const e of edits) {
    if (e.where === 'bogi' && it.kind === 'graph') errs.push('그래프 갈래의 〈보기〉(읽기 판)는 명세에서 자동 생성되므로 직접 고치지 않음');
    else if (e.where === 'bogi') { if (bogi.split(e.before).length !== 2) errs.push(`〈보기〉에서 "${e.before}"를 정확히 한 번 찾지 못함`); else bogi = bogi.replace(e.before, e.after); }
    else { const i = Number(e.choice) - 1; if (!(i >= 0 && i < 5) || choices[i].split(e.before).length !== 2) errs.push(`선지 ${e.choice}에서 "${e.before}"를 정확히 한 번 찾지 못함`); else choices[i] = choices[i].replace(e.before, e.after); }
  }
  logLines.push('- 고친 곳:', ...edits.map(e => `  - ${e.where === 'bogi' ? '〈보기〉' : CIRC[e.choice - 1]}: "${e.before}" → "${e.after}" (${e.why})`));
  if (!edits.length || errs.length) { entry.dispute.status = `되돌림: ${errs.length ? errs.join(' / ') : '고친 곳 없음'}`; logLines.push(`- 결과: **${entry.dispute.status}**`, ''); results.push(entry); continue; }
  const ratio = bogi.length / it.bogi.length;
  const r3 = lastJson(await call(`d3-resolve-${it.version}`, `너는 수능 국어 만점권 수험생이다. ${COMMON}
문항을 처음 보는 것처럼 푼다. 발문의 극성에 주의한다: 부정 발문이면 정답은 내용상 거짓인 선지 하나이고, 긍정 발문이면 내용상 참인 선지 하나다.
선지마다 판정(참/거짓)과 근거 한 줄을 적고, 정답이 정확히 하나로 정해지는지(valid_answers) 적는다.
또 이의 제기 심사위원의 눈으로, 표현 해석에 따라 판정이 뒤집힐 수 있는 선지가 있으면 disputable에 적는다(high = 근거 있는 이의 제기가 가능, low = 느슨하지만 판정 불변). 추론이 어렵다는 것만으로는 적지 않는다.
맨 끝에 JSON 블록: \`\`\`json {"version":"${it.version}","answer":3,"choices":[{"n":1,"truth":"참","why":"..."}],"valid_answers":[3],"disputable":[{"choice":2,"why":"...","severity":"low"}]} \`\`\``,
    `[지문]\n${passage}\n\n[문항]\n${itemText(it, bogi, choices)}`));
  const va = (r3.valid_answers || []).map(Number);
  const left = (r3.disputable || []).filter(d => d.severity === 'high');
  const reasons = [];
  if (Number(r3.answer) !== it.answer) reasons.push(`다시 푼 답 ${r3.answer} ≠ 정답 ${it.answer}`);
  if (!(va.length === 1 && va[0] === it.answer)) reasons.push(`정답 유일성 문제: 후보 ${JSON.stringify(va)}`);
  if (left.length) reasons.push(`남은 시비(high) ${left.map(d => d.choice).join(',')}`);
  if (Math.abs(ratio - 1) > 0.2) reasons.push(`〈보기〉 길이 변화 ${(ratio * 100 - 100).toFixed(1)}%`);
  logLines.push(`- 다시 풀기: 답 ${r3.answer}, 후보 ${JSON.stringify(va)}, 남은 시비 ${JSON.stringify(r3.disputable || [])}`);
  if (reasons.length) entry.dispute.status = `되돌림(원본 유지): ${reasons.join(' / ')}`;
  else { entry.dispute.adopted = true; entry.dispute.status = '채택'; entry.beforeDispute = { bogi: it.bogi, choices: it.choices }; entry.bogi = bogi; entry.choices = choices; }
  entry.dispute.edits = edits; entry.dispute.resolve = { answer: r3.answer, validAnswers: va, disputable: r3.disputable || [] };
  logLines.push(`- 결과: **${entry.dispute.status}**`, '');
  results.push(entry);
}
fs.writeFileSync(path.join(OUT, 'items-dispute.json'), JSON.stringify({ passage: PID, items: results }, null, 2));
fs.writeFileSync(path.join(OUT, 'dispute-log.md'), logLines.join('\n') + '\n');
console.log('\n' + results.map(r => `${r.version}: ${r.dispute.status}`).join('\n') + '\n결과: ' + OUT);
