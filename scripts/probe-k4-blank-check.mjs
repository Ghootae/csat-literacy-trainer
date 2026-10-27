// K4 option (나) probe (D-0182; user 2026-10-27 "K4는 (나)로 K4 케이스에만 짧게 실험"): a second call, made only when a correct pick has a
// FACT ground but no sufficiency, asks which unstated slot of the choice's predicates the student's fact refutes. The prompt names no case.
// Usage: node --env-file=.env scripts/probe-k4-blank-check.mjs [--dry-run] --out <dir> [--runs 3]
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import OpenAI from 'openai';
import { createLedger } from './test-v5-live-connection.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const dry = process.argv.includes('--dry-run'), out = arg('--out'), runs = Number(arg('--runs') ?? 3);
assert.ok(out, '--out required');
const MODEL = 'gpt-6-luna';
const sources = JSON.parse(readFileSync('docs/experiments/v53-three-cell-check-2026-10-27-b/sources.json', 'utf8'));
const { cases: all } = await import('./v53-three-cell-cases.mjs');
// K4 is the target; KF (no cue), XB (boundary), XA (ADDED) and XS (STRONGER, another question) must not be rescued by blank filling.
const picked = ['K4', 'KF', 'XB', 'XA', 'XS'].map(id => all.find(c => c.id === id));

export const INSTRUCTIONS = `너는 수능 국어 비문학 문제에서 학생 근거를 검토하는 평가자다. 학생은 정답 선지를 골랐고, 원문과 맞는 사실을 근거로 댔다.
앞선 판정에서는 그 사실이 선지의 어느 주장과 맞닿는지 찾지 못했다. 너는 선지 문장에 드러나지 않은 빈자리를 살펴, 학생의 사실이 그 빈자리를 채운 읽기를 반박하는지 확인한다.

1. 선지 문장의 서술어마다, 그 서술어가 뜻을 이루려면 필요하지만 문장에 직접 쓰이지 않은 자리(누가, 무엇을, 누구에게, 무엇 때문에 등)를 적는다. 문장에 이미 쓰인 자리는 적지 않는다.
2. 각 빈자리의 후보는 선지 문장 안에 실제로 쓰인 낱말만 쓴다. 선지 밖의 말(원문·<보기>의 말 포함)은 후보가 아니다. 후보가 없으면 그 빈자리는 적지 않는다.
3. 학생 근거에 어떤 빈자리를 특정 후보로 채웠다는 단서(그 후보나 그 후보가 속한 부류를 가리키는 말, 그 후보를 부정하는 말)가 있으면 그 학생 말을 cue로 정확히 인용한다. 단서가 없으면 cue는 null이고, 평가자가 짐작해서 채우지 않는다.
4. refuted에는 학생의 사실이 반박하는 빈자리 하나를 적는다. 조건: cue가 있는 빈자리이고, 그 빈자리를 학생이 채운 대로 읽은 선지 주장이 학생의 사실과 모순되며, 그 읽기가 선지 문장의 자연스러운 뜻에 들어 있다. 학생이 선지에 없는 원인·조건을 보태거나 선지보다 강하게 읽어서 생긴 모순은 빈자리 채움이 아니므로 refuted에 적지 않는다. 해당하는 것이 없으면 null.
5. 학생이 말하지 않은 전제나 중간 관계를 보태 연결하지 않는다. 평가자가 원문에서 올바른 관계를 찾을 수 있다는 것은 학생이 그 관계를 말했다는 증거가 아니다.`;

const schema = { type: 'object', additionalProperties: false, required: ['predicates', 'refuted', 'reason'], properties: {
  predicates: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['predicateText', 'blanks'], properties: {
    predicateText: { type: 'string' },
    blanks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['slot', 'candidates', 'cue'], properties: {
      slot: { type: 'string' }, candidates: { type: 'array', items: { type: 'string' } },
      cue: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['quote', 'chosen'], properties: { quote: { type: 'string' }, chosen: { type: 'string' } } }] } } } } } } },
  refuted: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['predicateText', 'slot', 'chosen', 'cue', 'contradiction'],
    properties: { predicateText: { type: 'string' }, slot: { type: 'string' }, chosen: { type: 'string' }, cue: { type: 'string' }, contradiction: { type: 'string' } } }] },
  reason: { type: 'string' } } };

const norm = s => String(s ?? '').replace(/\s+/g, '');
/** Server acceptance: the refuted slot's chosen word is in the choice, its cue is a quote of the rationale, and it matches a listed blank. */
export function accepted(raw, choiceText, rationale) {
  const r = raw?.refuted; if (!r) return { ok: false, why: 'no refuted slot' };
  if (!norm(choiceText).includes(norm(r.chosen))) return { ok: false, why: 'chosen not in choice' };
  if (!norm(r.cue) || !norm(rationale).includes(norm(r.cue))) return { ok: false, why: 'cue not in rationale' };
  const blank = raw.predicates.flatMap(p => p.blanks).find(b => b.slot === r.slot && b.cue);
  if (!blank) return { ok: false, why: 'refuted slot not a cued blank' };
  if (!blank.candidates.every(c => norm(choiceText).includes(norm(c)))) return { ok: false, why: 'candidate outside choice' };
  return { ok: true, why: '' };
}

const requests = picked.flatMap(c => Array.from({ length: runs }, (_, i) => {
  const s = sources[c.questionId], choice = s.choices.find(x => x.choiceId === c.choiceId);
  const input = { passage: s.passage, scenario: s.scenario, stem: s.stem, choice: { id: c.choiceId, text: choice.text }, studentRationale: c.rationale };
  return { id: `${c.id}-r${i + 1}`, caseId: c.id, choiceText: choice.text, rationale: c.rationale, request: {
    model: MODEL, store: false, reasoning: { effort: 'medium' }, max_output_tokens: 4000, instructions: INSTRUCTIONS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }],
    text: { format: { type: 'json_schema', name: 'blank_check', strict: true, schema } } } };
}));
mkdirSync(`${out}/requests`, { recursive: true });
for (const r of requests) writeFileSync(`${out}/requests/${r.id}.request.json`, JSON.stringify(r.request, null, 2) + '\n');
if (dry) { console.log(JSON.stringify({ requests: requests.length, model: MODEL, out })); process.exit(0); }

const limits = { [MODEL]: { requests: requests.length + 5, usd: 0.2, input: 0.10, output: 0.50 } };
let client;
const ledger = createLedger(`${out}/ledger.jsonl`, { create: (req, opt) => (client ??= new OpenAI({ maxRetries: 0 })).responses.create(req, opt) }, limits);
const rows = [];
for (const r of requests) {
  const p = `${out}/requests/${r.id}.response.json`;
  // A request already sent (ledger END) is never re-sent; one cut off by the output cap is recorded as such.
  const sent = ledger.rows.some(x => x.event === 'END' && x.label === r.id);
  let raw = null, status = 'ok';
  if (existsSync(p)) ({ parsed: raw, status = 'ok' } = JSON.parse(readFileSync(p, 'utf8')));
  else if (sent) status = 'sent, response lost';
  else {
    const res = await ledger.send(r.request, { timeout: 60_000, maxRetries: 0 }, r.id);
    try { raw = JSON.parse(res.output_text); } catch { status = `unparsable (${res.status}, ${res.incomplete_details?.reason ?? 'no reason'})`; }
    writeFileSync(p, JSON.stringify({ parsed: raw, status, response: res }, null, 2) + '\n');
  }
  if (!raw) { rows.push({ id: r.id, caseId: r.caseId, accepted: false, why: status, refuted: null }); console.log(JSON.stringify(rows.at(-1))); continue; }
  const verdict = accepted(raw, r.choiceText, r.rationale);
  rows.push({ id: r.id, caseId: r.caseId, accepted: verdict.ok, why: verdict.why, refuted: raw.refuted });
  console.log(JSON.stringify(rows.at(-1)));
}
writeFileSync(`${out}/RESULTS.json`, JSON.stringify(rows, null, 2) + '\n');
