// v5.2 검사·수리 (2026-11-19): 코덱스 제안(blind/CODEX-DISCUSSION.md 답변)을 따른 문항 검사와 한 번의 수리.
// 핵심 질문: "〈보기〉의 핵심 관찰을 가렸을 때, 정답과 가장 그럴듯한 다른 선지를 여전히 구별할 수 있는가?"
// 단계(문항 파일 하나 = 같은 지문·같은 양식의 V1·V2):
//   e1-mask        (정답을 앎) 정답과 가장 강한 경쟁 선지를 가르는 〈보기〉 핵심 관찰을 찾아 □로 가린 〈보기〉를 만든다. 대상 이름·단위는 남긴다.
//   e2-masked      (정답 모름, 별도 호출) 가린 판을 풀고, 근거 있게 지울 수 있는 선지만 지운다 → 남은 후보.
//   e3-shortcut    (정답 모름, 별도 호출, 원본) 선지마다 판정이 끝나는 구절, 최소 근거, 지문 한 사실로 판정되는지 직접 해 보기, 경쟁 선지, 정답 유일성.
//   판정(서버): 수리 사유 = 핵심 관찰을 가려도 정답만 남음 / 정답이 지문 한 사실로 판정 / 오답 넷이 모두 지문 한 사실로 지워짐 / 정답이 하나가 아님 / 정답이 가장 긴 선지.
//   e4-repair      (REPAIR=1일 때, 사유가 있는 문항만) 사유만 고치는 최소 수정. 정답 번호·발문·갈래 유지. → e1r~e3r로 다시 검사.
// v5.3(2026-11-19): e3에 bogi_sources·mirror_pair, 정답 거울 짝이면 수리, 정답 〈보기〉 관찰 1개는 경고(보정 3차).
// v5.2 보정 2차(2026-11-19): e3에 steps(추론 단계 수) 추가, 정답 steps≤1이면 수리. 정답 최장·후보 빈 경우는 경고로 내림(기출 12·19번 거짓 경보).
// 실행(저장소 루트): PASSAGE=<id> IN=<items.json 경로> OUT_DIR=<결과 폴더> [REPAIR=1] node docs/experiments/deep-item-v5-2026-11-18/eval-repair.mjs
//   IN 파일 형식: {"items":[{version, kind, stem, bogi, choices[5], answer, ...}]}
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
const MODEL = process.env.GEN_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.GEN_EFFORT || 'high';
const client = new OpenAI({ maxRetries: 0, timeout: 60 * 60 * 1000 });
const PID = process.env.PASSAGE; if (!PID) throw new Error('PASSAGE=<id>');
const IN = process.env.IN; if (!IN) throw new Error('IN=<items.json 경로>');
const OUT = process.env.OUT_DIR; if (!OUT) throw new Error('OUT_DIR=<결과 폴더>');
const REPAIR = process.env.REPAIR === '1';
fs.mkdirSync(OUT, { recursive: true });
const passage = fs.readFileSync(path.join(DIR, 'passages', PID, 'passage.txt'), 'utf8');
const commonRules = fs.readFileSync(path.join(DIR, 'rules-common.md'), 'utf8');
const usagePath = path.join(OUT, 'usage.json');
const usageLog = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : [];
async function call(stage, instructions, input) {
  const cached = path.join(OUT, `${stage}.md`);
  if (fs.existsSync(cached) && !process.env.FORCE) { console.log(`[${stage}] 이미 있음, 건너뜀`); return fs.readFileSync(cached, 'utf8'); }
  console.log(`[${stage}] 호출 중 (${MODEL}, ${EFFORT})...`);
  const t0 = Date.now();
  const res = await client.responses.stream({ model: MODEL, reasoning: { effort: EFFORT }, instructions, input }).finalResponse();
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
const examText = (items, bogiKey = 'bogi') => items.map(it => `[${it.version}] (${polarity(it)})\n${it.stem}\n〈보기〉\n${it[bogiKey]}\n${it.choices.join('\n')}`).join('\n\n');

async function evaluate(items, tag) {
  // e1: 핵심 관찰 가리기 (정답을 앎)
  const keyed = items.map(it => `[${it.version}] 정답 ${CIRC[it.answer - 1]} (${polarity(it)})\n${it.stem}\n〈보기〉\n${it.bogi}\n${it.choices.join('\n')}`).join('\n\n');
  const e1 = lastJson(await call(`e1-mask${tag}`, `너는 수능 국어 독서 문항 검토자다. ${COMMON}
문항마다 다음을 한다.
1. 지문만 부분적으로 이해한 학생이 마지막까지 정답과 고민할 '가장 강한 경쟁 선지'(rival)를 하나 고른다.
2. 정답과 그 경쟁 선지를 가르는 데 쓰이는 〈보기〉의 핵심 관찰(값, 표의 칸, 상태, 사실 문장의 핵심 구절)을 찾는다(keyEvidence, 〈보기〉 원문 그대로).
3. 그 핵심 관찰만 □로 가린 〈보기〉(maskedBogi)를 만든다. 대상 이름(A, B, ㉮ 등), 행·열 이름, 단위, 안내 문장의 틀은 그대로 둔다. 표라면 해당 칸의 값만 □로 바꾼다. 가린 것 외에는 한 글자도 바꾸지 않는다.
4. 핵심 관찰이 〈보기〉에 없고 지문만으로 정답과 경쟁 선지가 갈린다면 keyEvidence를 빈 배열로 두고 maskedBogi는 원문 그대로 둔다.
맨 끝에 JSON 블록: \`\`\`json {"items":[{"version":"V1","rival":2,"keyEvidence":["..."],"maskedBogi":"...","why":"정답과 경쟁 선지를 가르는 관찰 한 줄"}]} \`\`\``,
    `[지문]\n${passage}\n\n[문항]\n${keyed}`));
  const mask = Object.fromEntries(e1.items.map(x => [x.version, x]));
  const masked = items.map(it => ({ ...it, maskedBogi: mask[it.version]?.maskedBogi ?? it.bogi }));
  // e2: 가린 판 풀기 (정답 모름)
  const e2 = lastJson(await call(`e2-masked${tag}`, `너는 수능 국어 만점권 수험생이다. ${COMMON}
〈보기〉의 일부가 □로 가려져 있다. 가린 내용을 짐작하지 말고, 남은 정보와 지문만으로 근거 있게 판정할 수 있는 선지만 판정한다.
문항마다 선지별로: 근거 있게 '정답 아님'으로 지울 수 있으면 "제거"와 근거 한 줄, 가린 정보 없이는 판정할 수 없으면 "남음"과 무엇이 필요한지 한 줄. 발문의 극성(부정/긍정)에 주의한다.
남은 후보가 하나뿐이면 그것이 근거 있게 정답으로 확정되는지도 적는다.
맨 끝에 JSON 블록: \`\`\`json {"items":[{"version":"V1","choices":[{"n":1,"status":"제거","why":"..."}],"surviving":[2,4]}]} \`\`\``,
    `[지문]\n${passage}\n\n[문항]\n${examText(masked, 'maskedBogi')}`));
  // e3: 지름길 검사 (정답 모름, 원본)
  const e3 = lastJson(await call(`e3-shortcut${tag}`, `너는 수능 국어 만점권 수험생이자 검토자다. ${COMMON}
문항을 원본 그대로 풀고, 선지마다 아래를 적는다. 발문의 극성에 주의한다: 부정 발문이면 정답은 내용상 거짓인 선지 하나이고, 긍정 발문이면 내용상 참인 선지 하나다.
- decisive_clause: 이 선지의 판정이 처음으로 끝나는 가장 짧은 구절.
- minimum_evidence: 그 구절을 판정하는 데 꼭 필요한 지문 문장(요약)과 〈보기〉 근거(칸·값·관찰). 〈보기〉 근거가 필요 없으면 bogi를 빈 문자열로 둔다.
- one_fact_shortcut: 지문의 한 사실과 선지 문장만으로(〈보기〉를 보지 않고) 이 선지의 정오를 실제로 판정해 보라. 판정되면 possible=true와 한 줄 증명, 안 되면 possible=false와 부족한 관찰.
- bogi_sources: 이 선지의 정오를 확정하는 데 필요한 〈보기〉의 서로 다른 관찰 수(다른 열·다른 행·다른 문장은 따로 센다, 한 열 안의 값 여러 개는 1). 〈보기〉가 필요 없으면 0.
- steps: 이 선지의 정오를 확정하는 데 필요한 추론 단계 수. 〈보기〉에서 한 번 읽은 값(같은 행을 대상만 바꿔 읽는 것 포함)에 지문 규칙 하나를 바로 적용하면 1. 두 관찰을 비교·연결하거나(예: 두 값의 차이, 변화의 방향), 지문 관계 둘을 이어야 하거나, 〈보기〉 표현을 지문 개념으로 바꿔 읽어야 하면 그 수만큼 더한다.
문항마다 추가로:
- closest_rival: 부분적으로 이해한 학생이 마지막까지 고민할 선지 번호와, 정답과 그것을 가르는 관찰 하나.
- mirror_pair: 같은 대상·같은 비교를 두고 결론만 반대인 두 선지(예: '같다'/'적다', '더 밝다'/'더 어둡다')가 있으면 {"exists":true,"choices":[a,b],"why":"..."}, 없으면 {"exists":false}.
- valid_answers: 자료 전체로 다시 풀었을 때 발문을 충족하는 선지 번호 목록(정확히 하나여야 정상). 근거가 부족한 선지는 weak에 따로 적는다.
- answer: 네가 고른 답.
맨 끝에 JSON 블록: \`\`\`json {"items":[{"version":"V1","answer":3,"choices":[{"n":1,"decisive_clause":"...","minimum_evidence":{"passage":"...","bogi":""},"one_fact_shortcut":{"possible":true,"proof":"..."},"steps":2,"bogi_sources":2}],"closest_rival":{"n":2,"observation":"..."},"mirror_pair":{"exists":false},"valid_answers":[3],"weak":[]}]} \`\`\``,
    `[지문]\n${passage}\n\n[문항]\n${examText(items)}`));
  const r2 = Object.fromEntries(e2.items.map(x => [x.version, x]));
  const r3 = Object.fromEntries(e3.items.map(x => [x.version, x]));
  const diag = {};
  for (const it of items) {
    const m = mask[it.version] || {}, b = r2[it.version] || {}, c = r3[it.version] || {};
    const reasons = [], warnings = [];
    const surv = (b.surviving || []).map(Number);
    const noKey = !m.keyEvidence || !m.keyEvidence.length;
    if (noKey) reasons.push('정답과 경쟁 선지를 가르는 핵심 관찰이 〈보기〉에 없음(지문만으로 갈림)');
    else if (surv.length === 1 && surv[0] === it.answer) reasons.push(`핵심 관찰(${m.keyEvidence.join(' / ')})을 가려도 정답만 남음`);
    const ch = c.choices || [];
    const sc = n => { const x = ch.find(y => Number(y.n) === n); return x && x.one_fact_shortcut?.possible && !(x.minimum_evidence?.bogi || '').trim(); };
    if (sc(it.answer)) reasons.push('정답이 〈보기〉 없이 지문 한 사실로 판정됨');
    const easy = [1, 2, 3, 4, 5].filter(n => n !== it.answer && sc(n));
    const ansC = ch.find(y => Number(y.n) === it.answer);
    const ansSteps = Number(ansC?.steps ?? NaN);
    if (!sc(it.answer) && ansSteps <= 1) reasons.push('정답이 한 단계로 판정됨(〈보기〉 한 번 읽고 지문 규칙 하나 적용)');
    // v5.3 (C18·C19)
    const mp = c.mirror_pair || {};
    const mpc = (mp.choices || []).map(Number);
    if (mp.exists && mpc.includes(it.answer)) reasons.push(`정답이 거울 짝 선지와 나란히 있음(${mpc.join('·')}): ${mp.why || ''}`);
    else if (mp.exists) warnings.push(`거울 짝 선지(${mpc.join('·')})`);
    const ansSrc = Number(ansC?.bogi_sources ?? NaN);
    if (!sc(it.answer) && ansSrc <= 1) warnings.push('정답이 〈보기〉 관찰 하나(한 열·한 문장)로 정해짐'); // 보정 3차: 기출 12·19도 1로 세어져 경고로 내림
    const steps = [1, 2, 3, 4, 5].map(n => Number(ch.find(y => Number(y.n) === n)?.steps ?? NaN));
    if (easy.length === 4) reasons.push('오답 넷이 모두 〈보기〉 없이 지문 한 사실로 지워짐');
    else if (easy.length === 3) warnings.push(`오답 셋이 지문 한 사실로 지워짐(${easy.join(',')})`);
    const va = (c.valid_answers || []).map(Number);
    // 보정 2차: 후보가 비었고 검사 모델의 답이 출제 정답과 같으면(근거 '엄격' 판정) 경고만. 다른 답이 후보에 있거나 둘 이상이면 수리.
    if (va.length === 0 && Number(c.answer) === it.answer) warnings.push(`정답 유일성 경고: 검사 모델이 정답 후보를 비움(답은 ${c.answer}, 근거 약함 ${JSON.stringify(c.weak || [])})`);
    else if (!(va.length === 1 && va[0] === it.answer)) reasons.push(`정답 유일성 문제: 검사 모델의 정답 후보 ${JSON.stringify(va)}, 출제 정답 ${it.answer}`);
    const lens = it.choices.map(x => strip(x).length);
    if (lens[it.answer - 1] === Math.max(...lens) && lens.filter(l => l === lens[it.answer - 1]).length === 1) warnings.push(`정답이 가장 긴 선지(${lens[it.answer - 1]}자)`); // 보정 2차: 기출 12번도 정답 최장 → 경고로 내림
    if (c.closest_rival && m.rival && Number(c.closest_rival.n) !== Number(m.rival)) warnings.push(`경쟁 선지 판단이 다름(출제 쪽 ${m.rival}, 풀이 쪽 ${c.closest_rival.n})`);
    diag[it.version] = { repair: reasons.length > 0, reasons, warnings, rival: m.rival, keyEvidence: m.keyEvidence, surviving: surv, easyChoices: easy, steps, bogiSources: [1,2,3,4,5].map(n => Number(ch.find(y => Number(y.n) === n)?.bogi_sources ?? NaN)), mirrorPair: mp, solverAnswer: c.answer, validAnswers: va, closestRival: c.closest_rival };
  }
  return diag;
}

const src = JSON.parse(fs.readFileSync(IN, 'utf8'));
let items = src.items;
const d0 = await evaluate(items, '');
const report = { passage: PID, in: IN, before: d0 };
if (REPAIR && Object.values(d0).some(x => x.repair)) {
  const target = items.filter(it => d0[it.version].repair);
  const fixText = target.map(it => `[${it.version}] 정답 ${CIRC[it.answer - 1]} (${polarity(it)}), 갈래 ${it.kind}\n${it.stem}\n〈보기〉\n${it.bogi}\n${it.choices.join('\n')}\n수리 사유:\n- ${d0[it.version].reasons.join('\n- ')}\n참고: 핵심 관찰 ${JSON.stringify(d0[it.version].keyEvidence)}, 출제 쪽 경쟁 선지 ${d0[it.version].rival}, 풀이 쪽 경쟁 선지 ${JSON.stringify(d0[it.version].closestRival)}, 지문 한 사실로 지워지는 오답 ${JSON.stringify(d0[it.version].easyChoices)}`).join('\n\n');
  const e4 = lastJson(await call('e4-repair', `너는 수능 국어 독서 출제자다. ${COMMON}
입력 문항에는 검사에서 나온 수리 사유가 붙어 있다. 사유만 고치는 최소 수정을 한다.
지킬 것:
- 정답 번호, 발문(극성), 〈보기〉 갈래, 표의 행·열 구조는 그대로 둔다. 정답이 아닌 선지를 정답으로 바꾸지 않는다.
- 정답은 〈보기〉의 핵심 관찰을 해석해야 정해지게 한다. 지문 한 문장만으로 정답이 정해지면 〈보기〉의 값·관찰을 써야 판정되도록 정답이나 〈보기〉를 고친다.
- (v5.3) 정답과 경쟁 선지가 같은 대상·같은 비교의 반대 결론(거울 짝)이면, 경쟁 선지가 같은 관찰로 다른 판정을 묻게 고친다. 기호는 대상·지점·시료에 붙이고 '~을 ㉠으로 기록했다'는 쓰지 않는다.
- 오답 역할: 가장 강한 경쟁 선지 1개(핵심 관찰까지 맞게 읽은 학생도 지문의 관계 하나를 잘못 적용하면 고를 선지), 중간 2개(각각 〈보기〉의 값·대상·시점을 확인해야 판단), 쉬운 1개(짧은 개념 확인 가능). 다섯 선지 모두에 조건을 덧붙이지 않는다.
- 매력적인 선지에는 '부분적으로 아는 학생이 믿을 이유'와 '끝내 배제할 지문 근거'가 모두 있어야 한다. 정답이 둘이 되면 안 된다.
- 선지가 판정에 필요한 관찰을 스스로 공급해 〈보기〉를 대체하지 않는다. 답을 가르는 유일한 〈보기〉 관찰을 반대 가정으로 덮어쓰지 않는다.
- 정답 선지가 다섯 선지 중 가장 길지 않게 한다.
- 고친 곳은 공통 원칙과 가독성을 지킨다. 사유와 무관한 곳은 고치지 않는다.
출력: 문항마다 수정 표(위치, 원문, 수정문, 사유), 그리고 맨 끝에 JSON 블록 \`\`\`json {"items":[{"version":"V1","stem":"...","bogi":"...","choices":["①...","②...","③...","④...","⑤..."],"answer":3,"roles":["경쟁","중간","정답","쉬움","중간"],"repairNotes":"한 줄"}]} \`\`\``,
    `[지문]\n${passage}\n\n[공통 원칙]\n${commonRules}\n\n[수리할 문항]\n${fixText}`));
  const fixed = Object.fromEntries(e4.items.map(x => [x.version, x]));
  items = items.map(it => {
    const f = fixed[it.version]; if (!f) return it;
    if (Number(f.answer) !== it.answer) console.warn(`[경고] ${it.version}: 수리에서 정답 번호가 바뀜 ${it.answer} → ${f.answer} (원래 번호 유지 안 됨)`);
    return { ...it, stem: f.stem || it.stem, bogi: f.bogi, choices: f.choices.map((c, i) => `${CIRC[i]} ${strip(c)}`), answer: Number(f.answer), roles: f.roles, repairNotes: f.repairNotes, beforeRepair: { bogi: it.bogi, choices: it.choices } };
  });
  report.after = await evaluate(items.filter(it => fixed[it.version]), 'r');
}
fs.writeFileSync(path.join(OUT, 'items-final.json'), JSON.stringify({ passage: PID, items }, null, 2));
fs.writeFileSync(path.join(OUT, 'eval.json'), JSON.stringify(report, null, 2));
const line = (v, d) => `${v}: ${d.repair ? '수리 필요' : '통과'}${d.reasons.length ? ' — ' + d.reasons.join(' / ') : ''}${d.warnings.length ? ' [경고: ' + d.warnings.join(' / ') + ']' : ''} (가린 판 남은 후보 ${JSON.stringify(d.surviving)}, 풀이 답 ${d.solverAnswer})`;
let summary = '[검사]\n' + Object.entries(d0).map(([v, d]) => line(v, d)).join('\n');
if (report.after) summary += '\n[수리 후]\n' + Object.entries(report.after).map(([v, d]) => line(v, d)).join('\n');
fs.writeFileSync(path.join(OUT, 'eval-summary.txt'), summary + '\n');
console.log('\n' + summary + '\n결과: ' + OUT);
