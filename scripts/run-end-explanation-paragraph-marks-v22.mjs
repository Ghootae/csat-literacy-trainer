// 마지막 설명 레이아웃 v2.2(v2.1 + 두 번째 판정 반영: 두 읽기 선지, 정답 칸 범위, 인용 검사 대체 경로) 12건 × 2회 생성. 입력은 end-explanation-layout-2026-10-28 저장 요청 그대로, 지시문·출력 형식만 바꾼다.
// Usage: node scripts/run-end-explanation-paragraph-marks.mjs [selftest]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';

const BASE = 'docs/experiments/end-explanation-layout-2026-10-28', OUT = 'docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02';
const RUNS = [1, 2];
const CASES = ['KC-r1', 'QP-r1', 'QP-r2', 'XA-r1', 'XS-r1', 'K4-r3', 'K4-r1', 'KF-r1', 'C-CT', 'D-A3', 'S-A1', 'C-B3'];
const RECORDS = id => ['C-CT', 'D-A3', 'S-A1', 'C-B3'].includes(id)
  ? `docs/experiments/v5-diverse-48-regression-2026-10-27-v53-b/cases/${id}.records.jsonl` : `docs/experiments/v53-three-cell-check-2026-10-27-b/cases/${id}.records.jsonl`;
const PRICES = { 'gpt-6.1-sol': { input: 2, output: 10 }, 'gpt-6-luna': { input: 0.1, output: 0.5 } };
const USD_CAP = 0.6;
const hash = x => createHash('sha256').update(x).digest('hex');

const V1_SCREEN = '칸은 화면에서 하나씩 따로 보이고, 학생은 칸마다 버튼을 눌러 넘어간다. 각 칸 앞뒤의 안내 문장과 sectionLeads(칸의 첫 문장)는 화면이 붙인다. 칸은 sectionLeads 바로 다음 문장부터 쓰고, 그 문장이나 선택이 맞았는지를 되풀이하지 않는다. 각 칸은 그 칸만 읽어도 뜻이 통해야 한다. 앞 칸의 설명을 되풀이하지 않는다.';
const V2_SCREEN = `각 칸은 문단 목록으로 쓴다. 화면은 문단을 하나씩 말풍선으로 보이고, 학생은 문단마다 버튼을 눌러 넘어간다. 각 칸 앞뒤의 안내 문장과 sectionLeads(칸의 첫 문장)는 화면이 붙인다. sectionLeads는 그 칸 첫 문단 앞에 붙으므로, 첫 문단은 sectionLeads 바로 다음 문장부터 쓰고 그 문장이나 선택이 맞았는지를 되풀이하지 않는다. 각 칸은 그 칸만 읽어도 뜻이 통해야 한다. 앞 칸의 설명을 되풀이하지 않는다.

[문단과 칠할 곳]
문단 하나에는 요점 하나만 담는다. 요점은 학생이 그 말풍선 하나를 읽고 "이걸 알았다"고 말할 수 있는 한 가지다(예: 선지가 하는 말, 원문의 한 가지 설명, 그 설명을 선지에 대어 본 결과). 칸 전체의 요점이 하나뿐이면 문단도 하나다. 문장마다 문단을 나누지 않는다. 한 문단은 보통 두세 문장에서 다섯 문장 정도이고, 한 칸은 보통 한 문단에서 네 문단이다. type별 순서의 번호는 문단 수가 아니다. 짧은 단계는 앞뒤 단계와 한 문단에 묶는다.
문단마다 mark에 그 문단의 요점이 기대는 원문 한 곳을 적는다. 화면은 그 문단을 보일 때 이 구간을 지문이나 <보기>에서 칠해 학생이 원문 위치를 바로 찾게 한다.
- location은 지문이면 PASSAGE, <보기>면 SCENARIO다. 선지, 학생 말, 공식 해설은 칠하지 않는다.
- quote는 원문이나 <보기>에서 이어진 구간을 한 글자도 바꾸지 않고 그대로 옮긴다. 줄이거나 낱말을 바꾸거나 두 곳을 이어 붙이지 않는다. 앞뒤 따옴표는 붙이지 않는다.
- quote는 그 문단의 요점을 가장 직접 뒷받침하는 구간이다. 길이는 구절 하나에서 문장 하나까지로 한다. 그 구간이 원문에서 한 번만 나오도록 충분히 길게 잡는다.
- 문단이 원문이 아니라 학생 말, 선지의 말, 내 짐작, 앞 내용의 정리에 기대면 mark는 null이다. 칠할 곳을 억지로 찾지 않는다.
- 같은 구간을 여러 문단에서 칠해도 된다.
- mark는 그 문단이 실제로 말한 원문 내용이어야 한다. 학생 말을 인정하는 문단, 선지의 말만 풀이하는 문단, 결론만 말하는 문단은 null이다. 원문 근거 문장이 둘이면 문단도 둘로 나눈다.
- 칸의 결론 문장은 마지막 근거 문단 끝에 붙인다. 결론만으로 문단을 만들지 않는다.

[내용 규칙]
- 원문이 단정한 관계는 단정해서 말한다("~될 수 있어"처럼 흐리지 않는다). answer의 마지막 문단은 선지의 핵심 주장(예: 오네소르게 수가 변하지 않는다)이 맞는지 틀린지를 그대로 말한다.
- 선지를 반박할 때는 선지에 쓰인 말을 작은따옴표로 인용한 뒤, 원문이 그 말과 어디서 다른지 말한다. 선지를 다른 말로 바꿔 놓고 반박하지 않는다. 원문이 말하지 않는 것은 "지문은 …라고 말하지 않아"로 쓴다.
- 처음 고른 선지가 정답일 때만 answer 칸에서 학생이 헷갈린 지점(diagnosis)을 원문으로 바로잡는 문장을 포함한다. 오답을 골랐으면 그 오해는 그 선지 칸에서 끝내고, answer 칸은 정답 선지만 다룬다.
- 선지가 주체나 대상을 생략해 두 가지로 읽히면, 어느 읽기에도 맞는 원문 사실로 쓰고, 선지 판단은 두 읽기 모두에서 성립하는 근거가 맡게 한다. 앞 칸에서 부족하다고 한 학생 근거를 answer 칸의 결정적 반박으로 쓰지 않는다.
- 작은따옴표 안에는 선지나 원문, <보기>의 말을 그대로 옮긴다. 원문 구절을 옮길 때 각주 표시 *는 뺀다.`;
const PARAGRAPH = { type: 'object', additionalProperties: false, required: ['text', 'mark'], properties: {
  text: { type: 'string', minLength: 1 },
  mark: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['location', 'quote'],
    properties: { location: { type: 'string', enum: ['PASSAGE', 'SCENARIO'] }, quote: { type: 'string', minLength: 1 } } }] } } };
const LIST = { type: 'array', minItems: 1, items: PARAGRAPH };
const SCHEMA = { type: 'object', additionalProperties: false, required: ['firstChoice', 'reselection', 'answer'],
  properties: { firstChoice: LIST, reselection: { anyOf: [LIST, { type: 'null' }] }, answer: LIST } };

// 공백 정규화 후 정확히 한 번 나오는지(packages/app/src/shared/quote-locate.ts와 같은 규칙).
const flat = t => t.replace(/\s+/gu, ' ').trim();
const occurrences = (text, quote) => { const h = flat(text), n = flat(quote); return n ? h.split(n).length - 1 : 0; };
function check(output, input) {
  const problems = [];
  const sections = ['firstChoice', 'reselection', 'answer'];
  if ((output.reselection !== null) !== (input.sectionLeads?.reselection != null)) problems.push('reselection 유무가 선택 횟수와 다름');
  for (const key of sections) for (const p of output[key] ?? []) {
    if ((p.text.match(/[가-힣]/gu) ?? []).length < 4) problems.push(`${key}: 한글 4자 미만 문단`);
    if (/\b[CE]\d+\b/u.test(p.text) || p.text.includes('교정 질문')) problems.push(`${key}: 내부 용어`);
  }
  for (const key of ['firstChoice', 'reselection']) {
    const lead = input.sectionLeads?.[key];
    if (lead && output[key]?.[0]?.text.trim().startsWith(lead.trim().slice(0, 12))) problems.push(`${key}: 첫 문장 되풀이`);
  }
  // 문단 속 ‘…’ 인용은 선지·지문·<보기>에 그대로 있어야 한다(각주 * 무시).
  const pool = [input.source.passage, input.source.scenario ?? '', ...input.source.choices.map(c => c.text)].map(t => flat(t.replace(/\*/gu, ''))).join('\n');
  for (const key of sections) for (const p of output[key] ?? []) for (const m of p.text.matchAll(/‘([^’]+)’/gu)) {
    const q = flat(m[1]).replace(/[.,]+$/u, '');
    if (q && !pool.includes(q)) problems.push(`${key}: 인용 ‘${q.slice(0, 30)}’이 선지·원문에 없음`);
  }
  return problems;
}
const markStats = (output, source) => (['firstChoice', 'reselection', 'answer']).flatMap(key => (output[key] ?? []).map((p, i) => ({ key, i,
  location: p.mark?.location ?? null, quote: p.mark?.quote ?? null,
  found: p.mark ? occurrences(p.mark.location === 'PASSAGE' ? source.passage : source.scenario ?? '', p.mark.quote) : null })));

const saved = Object.fromEntries(CASES.map(id => [id, JSON.parse(readFileSync(`${BASE}/requests/${id}.request.json`, 'utf8'))]));
const v1 = saved[CASES[0]].request.instructions;
assert.ok(CASES.every(id => saved[id].request.instructions === v1), 'v1 지시문이 사례마다 같아야 함');
assert.equal(v1.split(V1_SCREEN).length, 2, 'v1 [칸과 화면] 문장을 정확히 한 번 찾아야 함');
const v2 = v1.replace(V1_SCREEN, V2_SCREEN);
const requestFor = id => ({ ...saved[id].request, instructions: v2,
  text: { format: { type: 'json_schema', name: 'problem_feedback_end_explanation_v2', strict: true, schema: SCHEMA } } });
const inputOf = id => JSON.parse(saved[id].request.input[0].content[0].text);
for (const id of CASES) { const r = requestFor(id); assert.deepEqual(r.input, saved[id].request.input); assert.ok(inputOf(id).source.passage); }
mkdirSync(OUT, { recursive: true });
const meta = { v1Hash: hash(v1), v2Hash: hash(v2), models: Object.fromEntries(CASES.map(id => [id, saved[id].request.model])), usdCap: USD_CAP, maxAttempts: 2 };
if (process.argv[2] === 'selftest') { writeFileSync(`${OUT}/instructions-v2.txt`, v2); console.log(JSON.stringify({ selftest: 'passed', ...meta })); process.exit(0); }
writeFileSync(`${OUT}/instructions-v2.txt`, v2); writeFileSync(`${OUT}/META.json`, JSON.stringify(meta, null, 2) + '\n');

const client = new OpenAI({ maxRetries: 0 });
let spent = 0;
const results = [];
for (const run of RUNS) for (const id of CASES) {
  const path = `${OUT}/responses/${id}-r${run}.json`;
  if (existsSync(path)) { results.push(JSON.parse(readFileSync(path, 'utf8'))); continue; }
  if (spent >= USD_CAP) { console.log(JSON.stringify({ stop: 'USD_CAP', spent })); break; }
  const request = requestFor(id), input = inputOf(id), attempts = [];
  let output = null;
  for (let attempt = 1; attempt <= 2 && !output; attempt++) {
    const started = performance.now();
    try {
      const res = await client.responses.create(request, { timeout: 90000 });
      const price = PRICES[request.model], usd = (res.usage.input_tokens * price.input + res.usage.output_tokens * price.output) / 1e6;
      spent += usd;
      const parsed = JSON.parse(res.output_text), problems = check(parsed, input);
      attempts.push({ attempt, durationMs: performance.now() - started, usage: res.usage, usd, problems });
      appendFileSync(`${OUT}/ledger.jsonl`, JSON.stringify({ id, run, attempt, model: res.model, usage: res.usage, usd, problems }) + '\n');
      if (!problems.length) output = parsed;
      else if (attempt === 2 && problems.every(p => p.includes('이 선지·원문에 없음'))) {
        // 대체 경로(두 번째 판정 제안 2): 원문에 없는 ‘…’ 인용의 따옴표만 벗긴다. 글은 그대로.
        const pool = [input.source.passage, input.source.scenario ?? '', ...input.source.choices.map(c => c.text)].map(t => flat(t.replace(/\*/gu, ''))).join('\n');
        const strip = t => t.replace(/‘([^’]+)’/gu, (m, q) => pool.includes(flat(q).replace(/[.,]+$/u, '')) ? m : q);
        for (const key of ['firstChoice', 'reselection', 'answer']) for (const p of parsed[key] ?? []) p.text = strip(p.text);
        attempts.at(-1).fallback = 'QUOTE_STRIPPED'; output = parsed;
      }
    } catch (e) {
      attempts.push({ attempt, durationMs: performance.now() - started, error: String(e).slice(0, 300) });
      appendFileSync(`${OUT}/ledger.jsonl`, JSON.stringify({ id, run, attempt, error: String(e).slice(0, 300) }) + '\n');
    }
  }
  const result = { caseId: id, run, model: request.model, sessionRecords: RECORDS(id), status: output ? 'PARSED' : 'FAILED', attempts, output,
    marks: output ? markStats(output, input.source) : null };
  mkdirSync(`${OUT}/responses`, { recursive: true }); writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
  results.push(result);
  console.log(JSON.stringify({ id, run, status: result.status, paragraphs: output ? ['firstChoice', 'reselection', 'answer'].map(k => output[k]?.length ?? 0).join('/') : null,
    marks: result.marks?.filter(m => m.quote).map(m => m.found).join(','), spent: spent.toFixed(4) }));
}
// 미리보기용 자료(D-0193 미리보기 FIXTURE와 같은 모양). originalOutput은 문단을 빈 줄로 이은 글.
const join = ps => ps ? ps.map(p => p.text).join('\n\n') : null;
const fixture = { version: 1, note: '레이아웃 v2.2 모델 생성(문단·칠할 곳 모두 모델), 키는 <사례>-r<회차>', cases: Object.fromEntries(results.filter(r => r.output).map(r => [`${r.caseId}-r${r.run}`, {
  sessionRecords: r.sessionRecords, originalOutput: { firstChoice: join(r.output.firstChoice), reselection: join(r.output.reselection), answer: join(r.output.answer) },
  sections: { firstChoice: r.output.firstChoice, ...(r.output.reselection ? { reselection: r.output.reselection } : {}), answer: r.output.answer } }])) };
writeFileSync(`${OUT}/FIXTURE.json`, JSON.stringify(fixture, null, 2) + '\n');
console.log(JSON.stringify({ done: true, parsed: results.filter(r => r.output).length, spent }));
