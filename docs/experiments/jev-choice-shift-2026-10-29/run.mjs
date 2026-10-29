import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = '/Users/mac/Projects/csat-literacy-problem-solving-mvp';
const DIR = `${ROOT}/docs/experiments/jev-choice-shift-2026-10-29`;
const PREFLIGHT = '/private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/77279e0c-0f6c-41d2-bf58-929f162107f2/scratchpad/preflight-result.json';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const INSTRUCTIONS = '아래 지문과 문항을 읽고, 이 문항의 정답일 가능성이 가장 높은 선지를 고르라.';
const MAX_SENDS = 130;
const SLEEP_MS = 7000;

// ---- 본문 ----
const s19 = JSON.parse(readFileSync(`${ROOT}/docs/experiments/v58-conclusion-2026-10-29/jev/request-sample.json`, 'utf8')).stateA;
const body19 = s19.slice(0, s19.indexOf('[정답]')).trimEnd();
const choices19 = Object.fromEntries([...body19.slice(body19.indexOf('[선지]')).matchAll(/^(\d)\. (.+)$/gm)].map((m) => ['C' + m[1], m[2]]));

const q16 = JSON.parse(readFileSync(`${ROOT}/packages/pipeline/fixtures/experiments/problem-solving/public/surface-tension-laplace-q16.json`, 'utf8'));
const choices16 = Object.fromEntries(q16.choices.map((c) => ['C' + c.position, c.text]));
const body16 = [
  `[지문]\n${q16.passage}`,
  `[〈보기〉]\n${q16.scenario}`,
  ...(q16.media && q16.media.length ? [`[그림 설명]\n${q16.media.map((m) => m.description ?? m.alt ?? '').join('\n')}`] : []),
  `[발문]\n${q16.stem}`,
  `[선지]\n${q16.choices.map((c) => `${c.position}. ${c.text}`).join('\n')}`,
].join('\n\n');

// ---- 조건 (설계 초안 2장 표 원문) ----
const P1a = 'ph 높이면 이온화 지질이 수소이온 덜 받아서 중성됨';
const P1b = P1a + ' -> 전하 없어지니까 소수성은 오히려 강해짐(약해지는 거 x).';
const P1c = P1b + ' 그럼 소수성끼리 인력도 커져서 뭉침.';
const S12b = 'ph 높이면 중성되는 건 지문에 있는데 소수성 약해진다, 더 미세해진다는 말은 지문 어디에도 없음';
const C = (q, id, n, ev) => ({ id: `${q}-${id}`, q, n, ev });
const CONDITIONS = [
  C('q19', '0', null, null),
  C('q19', 'C5', 5, null),
  C('q19', 'S12', 5, S12b + ' -> 5'),
  C('q19', 'S12a', 5, 'ph 높이면 중성되는 건 지문에 있는데'),
  C('q19', 'S12b', 5, S12b),
  C('q19', 'P1', 5, P1c + ' 5는 반대로 말함'),
  C('q19', 'P1a', 5, P1a),
  C('q19', 'P1b', 5, P1b),
  C('q19', 'P1c', 5, P1c),
  C('q19', 'N1', 5, 'ph 높이면 이온화 지질이 중성됨 -> 중성이면 입자끼리 서로 안 밀어내니까 더 크게 뭉침. 더 미세해진다는 5는 틀림'),
  C('q19', 'N2', 5, 'ph 높이면 이온화 지질이 중성됨 -> 전하가 없으니까 극성도 없어짐 -> 그래서 소수성이 강해짐. 5는 소수성 약해진다니까 반대'),
  C('q19', 'AS', 5, '5번이 확실히 틀렸음. 나머지는 다 맞는 말이라 5가 답'),
  C('q19', 'CP', 5, '5번은 pH가 높아지면 소수성이 약해져서 더 미세한 복합체가 생긴다고 했는데 이게 틀린 말임'),
  C('q19', 'C1', 1, null),
  C('q19', 'W1', 1, '에탄올은 물에 잘 섞이니까 친수성임. 근데 1번은 에탄올이 소수성이라고 함 -> x'),
  C('q16', '0', null, null),
  C('q16', 'C3', 3, null),
  C('q16', 'P2', 3, '오네소르게 수는 표면 장력, 밀도, 노즐 지름 곱이 클수록 작다고 했는데 밀도 2배, 지름 반이면 곱이 그대로임. 점도랑 표면 장력도 그대로니까 오네소르게 수 안 변함. 그래서 3 맞음'),
  C('q16', 'P3', 3, '밀도 2배, 지름 반이면 곱이 그대로라 오네소르게 수 안 변함 -> 그래서 위성 잉크 방울도 안 생기고 인쇄 속도도 똑같을 듯 -> 3 맞음'),
  C('q16', 'AS', 3, '3번이 확실히 맞음. 다른 건 다 이상함'),
  C('q16', 'CP', 3, '밀도를 두 배로 높이고 노즐 지름을 반으로 줄이면 오네소르게 수는 변함이 없으니까 3이 맞음'),
  C('q16', 'C5', 5, null),
  C('q16', 'W5', 5, '끈적거리면 점도가 커지니까 오네소르게 수가 적정 범위를 벗어남 -> 범위 벗어나면 인쇄가 불안정해지니까 위성 잉크 방울이 생김 -> 5 맞음'),
];
const EXPECTED_IDS = 'q19-0, q19-C5, q19-S12, q19-S12a, q19-S12b, q19-P1, q19-P1a, q19-P1b, q19-P1c, q19-N1, q19-N2, q19-AS, q19-CP, q19-C1, q19-W1, q16-0, q16-C3, q16-P2, q16-P3, q16-AS, q16-CP, q16-C5, q16-W5';
if (CONDITIONS.map((c) => c.id).join(', ') !== EXPECTED_IDS) throw new Error('condition id mismatch');

const stateOf = (c) => {
  const body = c.q === 'q19' ? body19 : body16;
  if (c.n == null) return body;
  return `${body}\n\n[학생 풀이]\n학생은 ${c.n}번을 골랐다.` + (c.ev ? `\n근거: ${c.ev}` : '');
};
const orderOf = (r) => Array.from({ length: 5 }, (_, i) => 'C' + ((r - 1 + i) % 5 + 1));
const payloadOf = (c, r) => {
  const choices = c.q === 'q19' ? choices19 : choices16;
  const criteria = {};
  for (const k of orderOf(r)) criteria[k] = choices[k];
  return { state: stateOf(c), questions: { Q1: { type: 'choice', instructions: INSTRUCTIONS, criteria } } };
};

// ---- 사전 점검 해시 확인 + FROZEN ----
const pre = JSON.parse(readFileSync(PREFLIGHT, 'utf8'));
const hash19 = sha(body19);
const preHash = sha(pre.payload.state);
if (hash19 !== preHash) { console.error('STOP: q19 body hash != preflight state hash'); process.exit(2); }
const scriptHash = sha(readFileSync(fileURLToPath(import.meta.url), 'utf8'));
const frozen = {
  instructions: INSTRUCTIONS,
  q19BodySha256: hash19, preflightStateSha256: preHash, q19HashMatchesPreflight: true,
  q16BodySha256: sha(body16), scriptSha256: scriptHash,
  conditions: CONDITIONS.map((c) => ({ id: c.id, choice: c.n, evidence: c.ev })),
};
writeFileSync(`${DIR}/FROZEN.json`, JSON.stringify(frozen, null, 1));

// ---- 요청 목록 ----
const reqs = [];
for (let r = 1; r <= 5; r++) for (const c of CONDITIONS) reqs.push({ conditionId: c.id, replicate: r, criteriaOrder: orderOf(r), payload: payloadOf(c, r) });
writeFileSync(`${DIR}/requests.jsonl`, reqs.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log(`prepared ${reqs.length} requests; q19 hash match; max sends ${MAX_SENDS}`);
if (process.argv.includes('--prepare-only')) process.exit(0);

// ---- 전송 ----
const env = Object.fromEntries(readFileSync(`${ROOT}/.env`, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
const key = env.JEV_API_KEY;
if (!key) { console.error('no key'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RES = `${DIR}/results.jsonl`;
if (existsSync(RES)) { console.error('results.jsonl exists; abort'); process.exit(2); }
let sends = 0, consecFail = 0;
const okKeys = (p) => p && Object.keys(p).sort().join(',') === 'C1,C2,C3,C4,C5';

async function once(req, attempt) {
  sends++;
  const t0 = Date.now();
  let rec = { conditionId: req.conditionId, replicate: req.replicate, attempt, http: null, wallMs: null, latencyMs: null, probabilities: null, choice: null, confidence: null, usage: null, error: null };
  try {
    const res = await fetch('https://jevplayground.com/api/evaluate', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(req.payload) });
    rec.http = res.status; rec.wallMs = Date.now() - t0;
    const text = await res.text();
    let j; try { j = JSON.parse(text); } catch { rec.error = 'non-json: ' + text.slice(0, 200); }
    if (j) {
      const a = j.result?.answers?.Q1;
      rec.latencyMs = j.latencyMs ?? null; rec.probabilities = a?.probabilities ?? null; rec.choice = a?.choice ?? null;
      rec.confidence = j.result?.confidence?.Q1 ?? null; rec.usage = j.result?.usage ?? null;
      if (res.status !== 200) rec.error = `http ${res.status}: ${text.slice(0, 200)}`;
      else if (j.ok !== true) rec.error = 'ok!=true: ' + text.slice(0, 200);
      else if (!okKeys(rec.probabilities)) rec.error = 'bad probability keys';
    }
  } catch (e) { rec.wallMs = Date.now() - t0; rec.error = 'fetch: ' + String(e.message).replace(key, '***'); }
  appendFileSync(RES, JSON.stringify(rec) + '\n');
  return rec;
}

for (const req of reqs) {
  let rec = await once(req, 1);
  if (rec.error) {
    if (sends >= MAX_SENDS) break;
    await sleep(SLEEP_MS);
    rec = await once(req, 2);
  }
  consecFail = rec.error ? consecFail + 1 : 0;
  if (consecFail >= 3) { console.error('STOP: 3 consecutive failures'); break; }
  if (sends >= MAX_SENDS) { console.error('STOP: send cap'); break; }
  console.log(`${req.conditionId} r${req.replicate} sends=${sends} ${rec.error ? 'FAIL ' + rec.error.slice(0, 80) : 'ok ' + rec.choice}`);
  await sleep(SLEEP_MS);
}
console.log(`done sends=${sends}`);
