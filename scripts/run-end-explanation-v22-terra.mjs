// 마지막 설명 v2.2를 gpt-6.1-terra로 D-A3·S-A1·C-B3 × 2회 생성. 입력·지시문·출력 형식은 v22 실험과 같고 모델만 바꾼다.
// 비교 기준(sol): docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02/responses/{D-A3,S-A1,C-B3}-r{1,2}.json
// 근거: docs/handoffs/2026-11-04-terra-vs-sol-runners.md
// Usage: node --env-file-if-exists=.env scripts/run-end-explanation-v22-terra.mjs [selftest]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';

const V22 = 'docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02', BASE = 'docs/experiments/end-explanation-layout-2026-10-28';
const OUT = 'docs/experiments/terra-vs-sol-2026-11-04/C-end-v22';
const MODEL = 'gpt-6.1-terra', PRICES = { input: 1, cached: 0.05, output: 5 }; // USD per 1M tokens
const RUNS = [1, 2], CASES = ['D-A3', 'S-A1', 'C-B3'];
const RECORDS = id => `docs/experiments/v5-diverse-48-regression-2026-10-27-v53-b/cases/${id}.records.jsonl`;
const USD_CAP = 0.4;
const hash = x => createHash('sha256').update(x).digest('hex');
const costOf = u => ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * PRICES.input
  + (u.input_tokens_details?.cached_tokens ?? 0) * PRICES.cached + u.output_tokens * PRICES.output) / 1e6;

// --- 아래 스키마·검사 함수는 run-end-explanation-paragraph-marks-v22.mjs와 같은 것 ---
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


const v22Meta = JSON.parse(readFileSync(`${V22}/META.json`, 'utf8'));
const v2 = readFileSync(`${V22}/instructions-v2.txt`, 'utf8');
assert.equal(hash(v2), v22Meta.v2Hash, 'v22 지시문 해시가 META와 같아야 함');
const saved = Object.fromEntries(CASES.map(id => [id, JSON.parse(readFileSync(`${BASE}/requests/${id}.request.json`, 'utf8'))]));
const requestFor = id => ({ ...saved[id].request, model: MODEL, instructions: v2,
  text: { format: { type: 'json_schema', name: 'problem_feedback_end_explanation_v2', strict: true, schema: SCHEMA } } });
const inputOf = id => JSON.parse(saved[id].request.input[0].content[0].text);
const stored = (id, run) => JSON.parse(readFileSync(`${V22}/responses/${id}-r${run}.json`, 'utf8'));
// v22 저장 응답이 이 입력에서 나왔는지: 같은 입력으로 검사·칠할 곳 계산을 다시 하면 저장된 값과 같아야 한다.
for (const id of CASES) {
  assert.equal(saved[id].request.model, 'gpt-6.1-sol'); assert.equal(v22Meta.models[id], 'gpt-6.1-sol');
  assert.ok(inputOf(id).source.passage);
  for (const run of RUNS) {
    const s = stored(id, run);
    assert.deepEqual(check(s.output, inputOf(id)), s.attempts.at(-1).problems, `${id}-r${run}: 저장 응답의 검사 결과가 다름`);
    assert.deepEqual(markStats(s.output, inputOf(id).source), s.marks, `${id}-r${run}: 저장 응답의 칠할 곳 결과가 다름`);
  }
}
const sample = requestFor(CASES[0]);
assert.equal(sample.model, MODEL); assert.equal(sample.instructions, v2); assert.deepEqual(sample.input, saved[CASES[0]].request.input);
const meta = { model: MODEL, reasoningEffort: sample.reasoning?.effort ?? null, prices: PRICES, v22Dir: V22, v2Hash: hash(v2), cases: CASES, runs: RUNS,
  usdCap: USD_CAP, maxAttempts: 2, baseline: `${V22}/responses/{D-A3,S-A1,C-B3}-r{1,2}.json (gpt-6.1-sol)` };
if (process.argv[2] === 'selftest') { console.log(JSON.stringify({ selftest: 'passed', externalRequests: 0, ...meta })); process.exit(0); }
mkdirSync(`${OUT}/responses`, { recursive: true });
if (!existsSync(`${OUT}/META.json`)) writeFileSync(`${OUT}/META.json`, JSON.stringify(meta, null, 2) + '\n');

const client = new OpenAI({ maxRetries: 0 });
const ledgerPath = `${OUT}/ledger.jsonl`;
let spent = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
for (const run of RUNS) for (const id of CASES) {
  const path = `${OUT}/responses/${id}-r${run}.json`;
  if (existsSync(path)) continue;
  if (spent >= USD_CAP) { console.log(JSON.stringify({ stop: 'USD_CAP', spent })); break; }
  const request = requestFor(id), input = inputOf(id), attempts = [];
  let output = null;
  for (let attempt = 1; attempt <= 2 && !output; attempt++) {
    const started = performance.now();
    try {
      const res = await client.responses.create(request, { timeout: 90000 });
      const usd = costOf(res.usage);
      spent += usd;
      const parsed = JSON.parse(res.output_text), problems = check(parsed, input);
      attempts.push({ attempt, durationMs: performance.now() - started, usage: res.usage, usd, problems });
      appendFileSync(ledgerPath, JSON.stringify({ id, run, attempt, model: res.model, usage: res.usage, usd, problems }) + '\n');
      if (!problems.length) output = parsed;
      else if (attempt === 2 && problems.every(p => p.includes('이 선지·원문에 없음'))) {
        // v22와 같은 대체 경로: 원문에 없는 ‘…’ 인용의 따옴표만 벗긴다. 글은 그대로.
        const pool = [input.source.passage, input.source.scenario ?? '', ...input.source.choices.map(c => c.text)].map(t => flat(t.replace(/\*/gu, ''))).join('\n');
        const strip = t => t.replace(/‘([^’]+)’/gu, (m, q) => pool.includes(flat(q).replace(/[.,]+$/u, '')) ? m : q);
        for (const key of ['firstChoice', 'reselection', 'answer']) for (const p of parsed[key] ?? []) p.text = strip(p.text);
        attempts.at(-1).fallback = 'QUOTE_STRIPPED'; output = parsed;
      }
    } catch (e) {
      attempts.push({ attempt, durationMs: performance.now() - started, error: String(e).slice(0, 300) });
      appendFileSync(ledgerPath, JSON.stringify({ id, run, attempt, error: String(e).slice(0, 300), usd: 0 }) + '\n');
    }
  }
  const result = { caseId: id, run, model: MODEL, sessionRecords: RECORDS(id), status: output ? 'PARSED' : 'FAILED', attempts, output,
    marks: output ? markStats(output, input.source) : null };
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ id, run, status: result.status, paragraphs: output ? ['firstChoice', 'reselection', 'answer'].map(k => output[k]?.length ?? 0).join('/') : null,
    marks: result.marks?.filter(m => m.quote).map(m => m.found).join(','), spent: spent.toFixed(4) }));
}
console.log(JSON.stringify({ done: true, spent }));
