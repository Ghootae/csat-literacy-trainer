// Offline answer-path B experiment. Keys: Node --env-file-if-exists only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { accounting, usageCosts } from './test-trap-map-v0.mjs';

export const DEFAULT_DIR = 'docs/experiments/answer-path-sol-e2e-2026-10-13';
export const IDS = ['information-asymmetry-free-marketplace-q13', 'surface-tension-laplace-q16'];
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const GUIDE = 'docs/review/answer-path-element-vocabulary-v0-2026-10-13.md';
const PILOT = 'docs/experiments/answer-path-depth-pilot-v2-2026-10-13/item-maps';
export const MODEL = 'gpt-6.1-sol';
export const LIMITS = { map: 6, run: 120, usd: 5 };
const ELEMENTS = Array.from({ length: 10 }, (_, i) => `E${i + 1}`);
const TYPES = ['READ', 'LINK', 'APPLY'];
const element = z.enum(ELEMENTS).nullable();
const nodeSchema = z.strictObject({ id: z.string(), type: z.enum(TYPES), operation: z.string(), evidence: z.string(),
  dependsOn: z.array(z.string()), layer: z.number().int().min(1), element, outsideVocabulary: z.string().nullable() });
export const MapSchema = z.strictObject({ questionId: z.string(), stemPolarity: z.enum(['POSITIVE', 'NEGATIVE']), answerChoiceId: z.string(),
  choices: z.array(z.strictObject({ choiceId: z.string(), verdict: z.enum(['APPROPRIATE', 'INAPPROPRIATE']),
    nodes: z.array(nodeSchema), depth: z.number().int().min(1), coreElement: element })) });
export const ScoreSchema = z.strictObject({ caseId: z.string(), selectedChoiceId: z.string(),
  result: z.enum(['CORRECT', 'WRONG', 'WRONG_NO_RATIONALE', 'POLARITY_FAILURE']), depth: z.number().int().min(1).nullable(),
  tags: z.array(z.enum(['GUESS_STATED', 'RATIONALE_ERROR'])), failedOperation: z.enum([...TYPES, 'UNDETERMINED']).nullable(),
  failedNodeId: z.string().nullable(), failedElement: element, nodeElement: element, overrideQuote: z.string().nullable(),
  candidates: z.array(z.strictObject({ nodeId: z.string(), type: z.enum(TYPES), element, reason: z.string() })),
  studentQuote: z.string().nullable(), reason: z.string() });
export const SCHEMAS = { map: z.toJSONSchema(MapSchema), run: z.toJSONSchema(ScoreSchema) };
const hash = v => createHash('sha256').update(v).digest('hex');
const jhash = v => hash(JSON.stringify(v));
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v, flag = 'wx') => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', { flag });
const ledgerAt = dir => existsSync(`${dir}/requests.jsonl`) ? readFileSync(`${dir}/requests.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const fileHash = p => hash(readFileSync(p));
const noDuplicate = a => assert.equal(new Set(a).size, a.length, 'DUPLICATE');

export function rulesFromGuide(guide) {
  const start = guide.indexOf('## 어휘\n'), end = guide.indexOf('## 추론 깊이', start);
  const revised = guide.indexOf('## v0.1 개정 규칙 (D-0121)\n');
  assert.ok(start >= 0 && end > start && revised > end, 'GUIDE_SECTIONS');
  return guide.slice(start, end) + guide.slice(revised);
}
export function promptsFromGuide(guide) {
  const rules = rulesFromGuide(guide);
  return {
    map: `수능 국어 문항 지도를 처음부터 생성한다. 문항 원문과 정답 키만 사용하고 학생 풀이를 예상하지 않는다. 모든 선지를 포함한다. 출력 스키마에 따라 JSON만 반환한다. depth는 각 선지의 READ+LINK+APPLY 노드 수다. coreElement는 핵심 요소 하나(어휘 밖이면 null)다. 층은 dependsOn으로 계산한다.\n\n${rules}`,
    run: `동결된 sol 문항 지도와 원문으로 학생 풀이 하나를 독립 채점한다. 출력 스키마에 따라 JSON만 반환한다. 지도는 변경하지 않는다. caseId와 selectedChoiceId는 입력 그대로다. CORRECT의 depth는 정답 선지의 노드 수, 다른 결과의 depth는 null이다. CORRECT 실패 필드와 nodeElement·overrideQuote는 모두 null이다. WRONG_NO_RATIONALE 실패 필드도 모두 null이다. POLARITY_FAILURE는 failedElement E1, 다른 실패 필드 null이다. WRONG 미확정은 failedOperation UNDETERMINED, failedNodeId·failedElement null, candidates에 후보를 남긴다. 확정 WRONG은 선택 선지의 노드 ID·종류·요소를 사용한다. 덮어쓰지 않으면 nodeElement와 overrideQuote는 null이다. 덮어쓰면 nodeElement는 원래 노드 요소, overrideQuote는 풀이 원문 인용이다. tags는 CORRECT에만 쓰고 중복 없이 출력한다. studentQuote는 판단에 쓴 풀이의 부분 문자열 그대로, 없으면 null이다. 후보는 UNDETERMINED에만 남긴다.\n\n${rules}`,
  };
}

export function validateMap(value, source) {
  const m = MapSchema.parse(value);
  assert.equal(m.questionId, source.questionId, 'MAP_ID');
  assert.equal(m.answerChoiceId, source.answerChoiceId, 'MAP_ANSWER');
  assert.deepEqual(m.choices.map(c => c.choiceId).sort(), source.choices.map(c => c.choiceId).sort(), 'MAP_CHOICES');
  for (const c of m.choices) {
    assert.ok(c.nodes.length, 'EMPTY_NODES'); noDuplicate(c.nodes.map(n => n.id));
    assert.equal(c.depth, c.nodes.length, 'MAP_DEPTH_NODE_COUNT');
    const index = new Map(c.nodes.map(n => [n.id, n])), layers = new Map(), visiting = new Set();
    function layer(id) {
      assert.ok(index.has(id), 'UNKNOWN_DEPENDENCY');
      if (layers.has(id)) return layers.get(id);
      assert.ok(!visiting.has(id), 'CYCLE'); visiting.add(id);
      const n = index.get(id); noDuplicate(n.dependsOn);
      const expected = n.dependsOn.length ? Math.max(...n.dependsOn.map(layer)) + 1 : 1;
      assert.equal(n.layer, expected, 'LAYER'); visiting.delete(id); layers.set(id, expected); return expected;
    }
    for (const n of c.nodes) {
      layer(n.id);
      assert.equal(n.outsideVocabulary !== null, n.element === null, 'OUTSIDE_VOCABULARY');
      if (n.element === null) assert.ok(n.outsideVocabulary.trim(), 'OUTSIDE_MEMO');
    }
    const applies = c.nodes.filter(n => n.type === 'APPLY');
    assert.equal(applies.length, 1, 'APPLY_COUNT');
    assert.ok(c.nodes.every(n => n === applies[0] || n.layer < applies[0].layer), 'APPLY_TOP');
    const ancestors = new Set();
    function collect(id) { if (ancestors.has(id)) return; ancestors.add(id); index.get(id).dependsOn.forEach(collect); }
    collect(applies[0].id); assert.equal(ancestors.size, c.nodes.length, 'DISCONNECTED_NODE');
  }
  return m;
}
export function validateScore(value, c, map) {
  const o = ScoreSchema.parse(value);
  assert.equal(o.caseId, c.id, 'CASE_ID'); assert.equal(o.selectedChoiceId, c.choiceId, 'CHOICE_ID'); noDuplicate(o.tags);
  assert.equal(o.result === 'CORRECT', c.choiceId === map.answerChoiceId, 'RESULT_CHOICE');
  const selected = map.choices.find(x => x.choiceId === c.choiceId);
  const answer = map.choices.find(x => x.choiceId === map.answerChoiceId);
  assert.equal(o.depth, o.result === 'CORRECT' ? answer.nodes.length : null, 'SCORE_DEPTH');
  if (o.result !== 'CORRECT') assert.deepEqual(o.tags, [], 'WRONG_TAGS');
  const node = id => { const n = selected.nodes.find(n => n.id === id); assert.ok(n, 'FAILED_NODE'); return n; };
  if (o.result === 'WRONG' && o.failedOperation !== 'UNDETERMINED') {
    assert.ok(TYPES.includes(o.failedOperation), 'WRONG_OPERATION');
    const n = node(o.failedNodeId); assert.equal(o.failedOperation, n.type, 'FAILED_TYPE');
    if (o.overrideQuote !== null) {
      assert.ok(o.overrideQuote.length, 'OVERRIDE_QUOTE'); assert.equal(o.nodeElement, n.element, 'NODE_ELEMENT');
      assert.notEqual(o.failedElement, n.element, 'OVERRIDE_UNCHANGED'); assert.ok(o.failedElement !== null, 'OVERRIDE_ELEMENT');
    } else {
      assert.equal(o.nodeElement, null, 'NO_OVERRIDE_NODE_ELEMENT'); assert.equal(o.failedElement, n.element, 'FAILED_ELEMENT');
    }
    assert.deepEqual(o.candidates, [], 'CONFIRMED_CANDIDATES');
  } else {
    assert.equal(o.failedNodeId, null, 'NULL_FAILED_NODE'); assert.equal(o.nodeElement, null, 'NULL_NODE_ELEMENT');
    assert.equal(o.overrideQuote, null, 'NULL_OVERRIDE');
    assert.equal(o.failedElement, o.result === 'POLARITY_FAILURE' ? 'E1' : null, 'NULL_FAILED_ELEMENT');
    assert.equal(o.failedOperation, o.result === 'WRONG' ? 'UNDETERMINED' : null, 'NULL_OPERATION');
    if (o.result === 'WRONG') {
      assert.ok(o.candidates.length > 0, 'UNDETERMINED_CANDIDATES');
      for (const cand of o.candidates) { const n = node(cand.nodeId); assert.equal(cand.type, n.type); assert.equal(cand.element, n.element); }
    } else assert.deepEqual(o.candidates, [], 'NULL_CANDIDATES');
  }
  return o;
}
export function quoteChecks(o, rationale) {
  return ['studentQuote', 'overrideQuote'].filter(k => o[k] !== null).map(field => ({ field, exact: o[field].length > 0 && rationale.includes(o[field]) }));
}

export function prepare({ dir = DEFAULT_DIR } = {}) {
  mkdirSync(dir, { recursive: true });
  const casesPath = `${dir}/cases.json`, raw = read(casesPath).cases;
  assert.equal(raw.length, 35); noDuplicate(raw.map(c => c.id));
  const cases = raw.map(({ id, questionId, choiceId, rationale }) => ({ id, questionId, choiceId, rationale }));
  const sources = {}, inputHashes = { [casesPath]: fileHash(casesPath), [GUIDE]: fileHash(GUIDE) };
  const answerKeyHashes = {};
  for (const id of IDS) {
    const pub = `${FIX}/public/${id}.json`, priv = `${FIX}/${id}.json`;
    // Project ONLY answerChoiceId from private fixture. No other private field is used or persisted.
    const answerChoiceId = read(priv).answerChoiceId;
    sources[id] = { ...read(pub), answerChoiceId };
    inputHashes[pub] = fileHash(pub); answerKeyHashes[id] = jhash(answerChoiceId);
  }
  for (const c of cases) assert.ok(sources[c.questionId]?.choices.some(x => x.choiceId === c.choiceId), 'CASE_SOURCE');
  const prompts = promptsFromGuide(readFileSync(GUIDE, 'utf8'));
  const artifacts = { 'prepared-cases.json': cases, 'sources.json': sources, 'prompts.json': prompts, 'schemas.json': SCHEMAS };
  const frozen = { version: 'answer-path-sol-e2e-v1', model: MODEL, reasoningEffort: 'medium', limits: LIMITS,
    maxOutputTokens: { map: 10000, run: 3500 }, formatRetries: 2, timeoutMs: 90000,
    prices: { inputPerMillion: 2, outputPerMillion: 10, source: 'test-trap-map-v0.mjs user-supplied prices; cached input charged in full; estimate' },
    inputHashes, answerKeyHashes, artifactHashes: Object.fromEntries(Object.entries(artifacts).map(([k, v]) => [k, jhash(v)])),
    runnerHash: fileHash(new URL(import.meta.url)), dependencyHash: fileHash('scripts/test-trap-map-v0.mjs'),
    schedule: [1, 2, 3].flatMap(replicate => cases.map(c => ({ caseId: c.id, replicate }))),
    majority: 'Fieldwise 2-of-3 for result, failedOperation, failedElement, tags set; no pair = NO_MAJORITY; invalid/missing = NO_OUTPUT; denominators retained',
    referenceAccess: 'reference-labels and Codex maps read only in report; excluded from frozen model inputs' };
  artifacts['FROZEN.json'] = frozen;
  for (const [name, v] of Object.entries(artifacts)) {
    const p = `${dir}/${name}`;
    if (existsSync(p)) assert.deepEqual(read(p), v, `FROZEN_CHANGED: ${name}`); else save(p, v);
  }
  return { prepared: true, cases: cases.length, externalRequests: 0, frozenHash: jhash(frozen) };
}
export function verifyFrozen(dir) {
  const frozen = read(`${dir}/FROZEN.json`);
  assert.equal(frozen.runnerHash, fileHash(new URL(import.meta.url)), 'RUNNER_CHANGED');
  assert.equal(frozen.dependencyHash, fileHash('scripts/test-trap-map-v0.mjs'), 'DEPENDENCY_CHANGED');
  for (const [p, h] of Object.entries(frozen.inputHashes)) assert.equal(fileHash(p), h, `INPUT_CHANGED: ${p}`);
  for (const id of IDS) assert.equal(jhash(read(`${FIX}/${id}.json`).answerChoiceId), frozen.answerKeyHashes[id], 'ANSWER_CHANGED');
  for (const [name, h] of Object.entries(frozen.artifactHashes)) assert.equal(jhash(read(`${dir}/${name}`)), h, `ARTIFACT_CHANGED: ${name}`);
  return { frozen, cases: read(`${dir}/prepared-cases.json`), sources: read(`${dir}/sources.json`), prompts: read(`${dir}/prompts.json`) };
}
export function verifyMaps(dir, sources) {
  const manifest = read(`${dir}/sol-maps/FROZEN.json`), maps = {};
  assert.equal(manifest.frozenHash, jhash(read(`${dir}/FROZEN.json`)), 'MAP_CONTRACT');
  for (const id of IDS) {
    const p = `${dir}/sol-maps/${id}.json`; assert.equal(fileHash(p), manifest.hashes[id], 'MAP_CHANGED');
    maps[id] = validateMap(read(p), sources[id]);
  }
  return { maps, mapHash: jhash(manifest) };
}
export function requestFor(phase, source, prompts, frozen, c = null, map = null) {
  const data = phase === 'map' ? { question: source } : { question: source, map, student: { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale } };
  const content = [{ type: 'input_text', text: JSON.stringify(data) }];
  for (const media of source.media ?? []) content.push({ type: 'input_image', image_url: media.url, detail: 'high' });
  return { model: MODEL, reasoning: { effort: 'medium' }, instructions: prompts[phase], max_output_tokens: frozen.maxOutputTokens[phase],
    input: [{ role: 'user', content }], text: { format: { type: 'json_schema', name: `answer_path_${phase}`, strict: true, schema: SCHEMAS[phase] } } };
}
export function budgetCheck(ledger, phase, request, limits = LIMITS) {
  const a = accounting(ledger);
  const phaseRequests = ledger.filter(e => e.event === 'START' && e.phase === phase).length;
  const reservedUsd = (Buffer.byteLength(JSON.stringify(request)) * 2 + request.max_output_tokens * 10) / 1e6;
  assert.ok(phaseRequests < limits[phase], `RUN_LIMIT: ${phase} request cap`);
  assert.ok(a.conservativeUsd + a.unknownReservedUsd + reservedUsd <= limits.usd, 'RUN_LIMIT: total USD cap');
  return reservedUsd;
}

async function execute({ phase, dir, transport, onProgress = () => {} }) {
  const { frozen, cases, sources, prompts } = verifyFrozen(dir), frozenHash = jhash(frozen);
  let maps, mapHash;
  if (phase === 'map' && existsSync(`${dir}/sol-maps/FROZEN.json`)) {
    verifyMaps(dir, sources);
    const ledger = ledgerAt(dir);
    return { phase, completed: 2, planned: 2, stop: null, ...accounting(ledger), phaseRequests: ledger.filter(e => e.event === 'START' && e.phase === phase).length };
  }
  if (phase === 'run') ({ maps, mapHash } = verifyMaps(dir, sources));
  mkdirSync(`${dir}/${phase === 'map' ? 'sol-maps' : 'runs'}`, { recursive: true });
  mkdirSync(`${dir}/attempts`, { recursive: true });
  const ledger = ledgerAt(dir);
  assert.ok(!ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId)), 'INCOMPLETE_LEDGER: resume refused');
  const record = e => { appendFileSync(`${dir}/requests.jsonl`, JSON.stringify(e) + '\n'); ledger.push(e); };
  const cells = phase === 'map' ? IDS.map(questionId => ({ questionId, label: questionId })) : frozen.schedule.map(cell => ({ ...cell, label: `${cell.caseId}-r${cell.replicate}` }));
  let client, stop = null;
  for (const cell of cells) {
    const path = `${dir}/${phase === 'map' ? 'sol-maps' : 'runs'}/${cell.label}.json`;
    const c = phase === 'run' ? cases.find(c => c.id === cell.caseId) : null;
    const source = sources[c?.questionId ?? cell.questionId];
    if (existsSync(path)) {
      if (phase === 'map') validateMap(read(path), source);
      else { const row = read(path); assert.equal(row.frozenHash, frozenHash); assert.equal(row.mapHash, mapHash); assert.equal(row.replicate, cell.replicate);
        assert.equal(row.caseId, c.id); if (row.status === 'VALID') validateScore(row.output, c, maps[c.questionId]); else { stop = `PRIOR_FAILURE: ${cell.label}`; break; } }
      continue;
    }
    const prior = ledger.filter(e => e.event === 'START' && e.phase === phase && e.label === cell.label);
    assert.ok(!prior.length, `MISSING_CELL_WITH_PRIOR_REQUESTS: ${cell.label}; resume refused`);
    const request = requestFor(phase, source, prompts, frozen, c, maps?.[c?.questionId]);
    const row = { ...cell, phase, model: MODEL, frozenHash, ...(phase === 'run' ? { mapHash } : {}), status: null, output: null, attempts: [], citations: [] };
    for (let attempt = 1; attempt <= 3; attempt++) {
      let reservedUsd;
      try { reservedUsd = budgetCheck(ledger, phase, request); } catch (error) { stop = error.message; break; }
      const requestId = `${phase}-${cell.label}-${accounting(ledger).requests + 1}`, started = performance.now();
      record({ event: 'START', requestId, phase, label: cell.label, attempt, reservedUsd, frozenHash, mapHash: mapHash ?? null,
        requestedAtUtc: new Date().toISOString(), requestHash: jhash(request) });
      let response;
      try {
        const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
        response = await sender.create(request, { timeout: frozen.timeoutMs });
      } catch (error) {
        // Do not log SDK errors or headers: preserve only safe status and class, never credentials.
        const details = { requestId, phase, label: cell.label, attempt, durationMs: performance.now() - started,
          errorName: error.name ?? 'Error', httpStatus: error.status ?? null, costs: null, usage: null, status: 'API_ERROR' };
        record({ event: 'END', ...details }); row.attempts.push(details); row.status = 'API_ERROR'; stop = `API_ERROR: ${details.errorName} HTTP ${details.httpStatus}`; break;
      }
      save(`${dir}/attempts/${requestId}.json`, response);
      record({ event: 'END', requestId, phase, label: cell.label, attempt, durationMs: performance.now() - started,
        responseId: response.id, model: response.model, status: response.status, usage: response.usage ?? null,
        costs: usageCosts(response.usage, MODEL), responsePath: `attempts/${requestId}.json` });
      const attemptRow = { requestId, status: 'VALID' }; row.attempts.push(attemptRow);
      if (response.output?.some(o => o.content?.some(x => x.type === 'refusal'))) { row.status = attemptRow.status = 'POLICY_REFUSAL'; stop = 'POLICY_REFUSAL'; break; }
      try {
        assert.equal(response.status, 'completed', 'RESPONSE_INCOMPLETE');
        const parsed = JSON.parse(response.output_text);
        row.output = phase === 'map' ? validateMap(parsed, source) : validateScore(parsed, c, maps[c.questionId]);
        if (phase === 'run') row.citations = quoteChecks(row.output, c.rationale);
        row.status = 'VALID'; break;
      } catch (error) { row.status = attemptRow.status = 'FORMAT_ERROR'; attemptRow.error = error.message; }
    }
    if (row.status === 'VALID') save(path, phase === 'map' ? row.output : row);
    else { save(`${dir}/attempts/${phase}-${cell.label}-failure.json`, row); stop ??= `FORMAT_ERROR: ${cell.label}`; }
    onProgress({ phase, label: cell.label, status: row.status, ...accounting(ledger) });
    if (stop) break;
  }
  if (phase === 'map' && !stop) {
    const manifest = { frozenHash, hashes: Object.fromEntries(IDS.map(id => [id, fileHash(`${dir}/sol-maps/${id}.json`)])) };
    const p = `${dir}/sol-maps/FROZEN.json`;
    if (existsSync(p)) assert.deepEqual(read(p), manifest, 'MAP_FREEZE_CHANGED'); else save(p, manifest);
    verifyMaps(dir, sources);
  }
  const completed = cells.filter(c => existsSync(`${dir}/${phase === 'map' ? 'sol-maps' : 'runs'}/${c.label}.json`)).length;
  const summary = { phase, completed, planned: cells.length, stop, ...accounting(ledger), phaseRequests: ledger.filter(e => e.event === 'START' && e.phase === phase).length };
  save(`${dir}/${phase}-summary.json`, summary, 'w'); return summary;
}
export const generateMaps = opts => execute({ phase: 'map', dir: DEFAULT_DIR, ...opts });
export const run = opts => execute({ phase: 'run', dir: DEFAULT_DIR, ...opts });

const signature = o => o ? JSON.stringify([o.result, o.failedOperation, o.failedElement, [...o.tags].sort()]) : 'NO_OUTPUT';
export function majority(triple) {
  const result = {};
  for (const field of ['result', 'failedOperation', 'failedElement', 'tags']) {
    const values = triple.map(o => o ? JSON.stringify(field === 'tags' ? [...o.tags].sort() : o[field]) : JSON.stringify('NO_OUTPUT'));
    const winner = values.find(v => values.filter(x => x === v).length >= 2);
    result[field] = winner === undefined ? 'NO_MAJORITY' : JSON.parse(winner);
  }
  return result;
}
const rate = (n, d) => ({ matched: n, denominator: d, rate: d ? n / d : null });
export function metrics(labels, outputs) {
  assert.equal(labels.length, outputs.length);
  const calc = (filter, equal) => { const indexes = labels.map((l, i) => i).filter(i => filter(labels[i])); return rate(indexes.filter(i => equal(labels[i], outputs[i])).length, indexes.length); };
  return {
    result: calc(() => true, (l, o) => l.result === o?.result),
    failedOperation: calc(l => [...TYPES, 'UNDETERMINED'].includes(l.failedOperation), (l, o) => l.failedOperation === o?.failedOperation),
    failedElement: calc(l => l.failedElement !== null, (l, o) => l.failedElement === o?.failedElement),
    tags: calc(l => l.result === 'CORRECT', (l, o) => Array.isArray(o?.tags) && JSON.stringify([...l.tags].sort()) === JSON.stringify([...o.tags].sort())),
    overclassification: calc(l => l.result === 'WRONG_NO_RATIONALE' || l.failedOperation === 'UNDETERMINED', (l, o) => TYPES.includes(o?.failedOperation)),
  };
}
const cell = v => String(v ?? '—').replace(/\|/gu, '\\|').replace(/\r?\n/gu, '<br>');
const table = (headers, rows) => `| ${headers.map(cell).join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map(r => `| ${r.map(cell).join(' | ')} |`).join('\n')}\n\n`;
const fraction = v => `${v.matched}/${v.denominator} (${v.rate === null ? 'N/A' : (100 * v.rate).toFixed(1) + '%'})`;
const display = o => o ? `${o.result}; ${o.failedOperation ?? '—'}; ${o.failedElement ?? '—'}; ${Array.isArray(o.tags) ? o.tags.join(', ') || '—' : o.tags}` : 'NO_OUTPUT';
export function report({ dir = DEFAULT_DIR, pilotDir = PILOT } = {}) {
  const { frozen, cases, sources } = verifyFrozen(dir), { maps, mapHash } = verifyMaps(dir, sources);
  // Report-only access. Neither references nor Codex maps enter any API request.
  const refPath = `${dir}/reference-labels.json`, reference = read(refPath).labels;
  assert.equal(reference.length, cases.length); noDuplicate(reference.map(l => l.caseId));
  const labels = cases.map(c => { const l = reference.find(l => l.caseId === c.id); assert.ok(l, 'REFERENCE_ID'); return l; });
  const rows = cases.map(c => [1, 2, 3].map(replicate => {
    const p = `${dir}/runs/${c.id}-r${replicate}.json`;
    if (!existsSync(p)) return null;
    const row = read(p); assert.equal(row.frozenHash, jhash(frozen)); assert.equal(row.mapHash, mapHash); assert.equal(row.replicate, replicate); assert.equal(row.caseId, c.id);
    if (row.status === 'VALID') { validateScore(row.output, c, maps[c.questionId]); assert.deepEqual(row.citations, quoteChecks(row.output, c.rationale)); }
    return row;
  }));
  const triples = rows.map(t => t.map(r => r?.status === 'VALID' ? r.output : null)), voted = triples.map(majority);
  const ledger = ledgerAt(dir), a = accounting(ledger), overrides = [], quoteMismatches = [];
  rows.forEach((triple, i) => triple.forEach((r, j) => {
    if (r?.output?.overrideQuote !== null && r?.output?.overrideQuote !== undefined) overrides.push({ caseId: cases[i].id, replicate: j + 1, failedElement: r.output.failedElement, nodeElement: r.output.nodeElement, overrideQuote: r.output.overrideQuote });
    for (const q of r?.citations ?? []) if (!q.exact) quoteMismatches.push({ caseId: cases[i].id, replicate: j + 1, field: q.field });
  }));
  const mapSummary = IDS.flatMap(id => {
    const codex = read(`${pilotDir}/${id}.json`);
    return maps[id].choices.map(c => ({ questionId: id, choiceId: c.choiceId, nodes: c.nodes.length,
      types: Object.fromEntries(TYPES.map(t => [t, c.nodes.filter(n => n.type === t).length])), coreElement: c.coreElement,
      codexNodes: codex.choices.find(x => x.choiceId === c.choiceId).nodes.length,
      outsideVocabulary: c.nodes.filter(n => n.element === null).map(n => ({ id: n.id, operation: n.operation, memo: n.outsideVocabulary })) }));
  });
  const results = { frozenHash: jhash(frozen), mapHash, referenceHash: fileHash(refPath),
    pilotHashes: Object.fromEntries(IDS.map(id => [id, fileHash(`${pilotDir}/${id}.json`)])),
    model: MODEL, cases: cases.length, plannedCells: 105, completedCells: rows.flat().filter(r => r?.status === 'VALID').length,
    repeats: [0, 1, 2].map(i => ({ replicate: i + 1, ...metrics(labels, triples.map(t => t[i])) })), majority: metrics(labels, voted),
    consistency: rate(triples.filter(t => t.every(Boolean) && new Set(t.map(signature)).size === 1).length, cases.length),
    inconsistentCaseIds: cases.filter((c, i) => !triples[i].every(Boolean) || new Set(triples[i].map(signature)).size !== 1).map(c => c.id),
    majorityOutputs: cases.map((c, i) => ({ caseId: c.id, ...voted[i] })), overrides, quoteMismatches, mapSummary,
    accounting: { ...a, mapRequests: ledger.filter(e => e.event === 'START' && e.phase === 'map').length,
      scoringRequests: ledger.filter(e => e.event === 'START' && e.phase === 'run').length,
      formatRetries: ledger.filter(e => e.event === 'START' && e.attempt > 1).length,
      inputTokens: ledger.reduce((s, e) => s + (e.usage?.input_tokens ?? 0), 0), outputTokens: ledger.reduce((s, e) => s + (e.usage?.output_tokens ?? 0), 0) } };
  save(`${dir}/RESULTS.json`, results, 'w');
  let md = '# 정답 경로 sol 종단 검증\n\n';
  md += `sol이 두 지도를 생성·동결하고 같은 sol이 ${cases.length}개 풀이를 3회씩 채점했다. 유효 출력 ${results.completedCells}/105.\n\n`;
  md += table(['집계', '결과', '실패 종류', '실패 요소', '정답 꼬리표', '과잉 분류'], [...results.repeats.map(r => [`${r.replicate}회`, r]), ['다수결', results.majority]].map(([name, r]) => [name, ...['result', 'failedOperation', 'failedElement', 'tags', 'overclassification'].map(k => fraction(r[k]))]));
  md += `3회 일관성: ${fraction(results.consistency)}. 불일치 사례: ${results.inconsistentCaseIds.join(', ') || '없음'}.\n\n다수결은 필드별 2/3 이상으로 계산한다. 꼬리표는 집합으로 비교한다. 세 값이 모두 다르면 NO_MAJORITY로 남기며 분모에서 빼지 않는다. 노드 번호는 기준과 비교하지 않는다.\n\n`;
  md += '## 지도 요약\n\n';
  md += table(['문항', '선지', 'sol 노드 수', 'READ/LINK/APPLY', '핵심 요소', 'Codex 노드 수'], mapSummary.map(m => [m.questionId, m.choiceId, m.nodes, TYPES.map(t => m.types[t]).join('/'), m.coreElement, m.codexNodes]));
  md += '어휘 밖 노드:\n\n' + table(['문항', '선지', '노드', '연산', '메모'], mapSummary.flatMap(m => m.outsideVocabulary.map(n => [m.questionId, m.choiceId, n.id, n.operation, n.memo])));
  md += '## 덮어쓰기·인용\n\n';
  md += `덮어쓰기 ${overrides.length}회 / ${new Set(overrides.map(o => o.caseId)).size}사례. 기준상 덮어쓰기는 W8 하나이며 아래 표는 실제 관측값이다. 인용 부분 문자열 불일치는 ${quoteMismatches.length}회(검증 재시도 사유로 쓰지 않음).\n\n`;
  md += table(['사례', '반복', '노드 요소', '실패 요소', '근거 인용'], overrides.map(o => [o.caseId, o.replicate, o.nodeElement, o.failedElement, o.overrideQuote]));
  md += table(['사례', '반복', '불일치 인용 필드'], quoteMismatches.map(o => [o.caseId, o.replicate, o.field]));
  md += '## 실행·상한\n\n' + table(['항목', '관측', '상한'], [
    ['지도 요청', results.accounting.mapRequests, 6], ['채점 요청', results.accounting.scoringRequests, 120],
    ['비용 추정 USD (캐시 할인 없음)', a.conservativeUsd.toFixed(7), 5], ['사용량 미확정 예약 USD', a.unknownReservedUsd.toFixed(7), '합계 상한 포함'],
    ['형식 재시도', results.accounting.formatRetries, '요청 상한 내'], ['입력/출력 토큰', `${results.accounting.inputTokens}/${results.accounting.outputTokens}`, '—']]);
  md += `모델 ${MODEL}, reasoning medium. 단가는 기존 실행기의 사용자 제공값(입력 $2/백만, 출력 $10/백만)을 재사용한 추정이며 현재 가격 확인은 하지 않았다. 요청 전 최대 출력과 입력 바이트 기반 예약으로 합계 상한을 적용했다.\n\n원응답·형식 실패·복구 이력: attempts/ 및 requests.jsonl. 계약: FROZEN.json, 지도 동결: sol-maps/FROZEN.json. 기준 라벨과 Codex 지도는 report에서만 읽었다.\n\n`;
  md += '## 읽는 법·남은 문제\n\n정답은 규칙에 따라 근거와 무관하게 모든 노드·요소 성공으로 센다. 찍어 맞힌 정답도 포함되어 성공이 부풀려질 수 있다. 이 시험은 두 문항·가상 풀이의 기준 일치와 반복 일관성을 측정하며 실제 학생 효과나 일반화 검증은 아니다. 지도는 동결 뒤 수정하지 않았고, 지도 분할·요소 차이와 채점 차이가 함께 반영된다. 정답 선지 노드 수가 깊이이며 실제 사고 단계 수를 뜻하지 않는다. 채점 단독 A안·다른 모델은 실행하지 않았다.\n\n';
  const differences = cases.map((c, i) => ({ c, l: labels[i], o: voted[i] })).filter(({ l, o }) => signature(l) !== signature(o));
  md += table(['기준과 다수결이 다른 사례', '기준 result/종류/요소/tags', 'sol 다수결'], differences.map(({ c, l, o }) => [c.id, display(l), display(o)]));
  saveText(`${dir}/REPORT.md`, md);
  let review = '# 사례별 기준·sol 출력 비교\n\n노드 ID는 비교 지표가 아니다. 원응답은 runs/와 attempts/에 보존했다.\n\n';
  cases.forEach((c, i) => {
    review += `## ${c.id} · ${c.questionId} · ${c.choiceId}\n\n${c.rationale}\n\n`;
    review += table(['기준', '1회', '2회', '3회', '필드별 다수결'], [[display(labels[i]), ...triples[i].map(display), display(voted[i])]]);
    review += table(['반복', '실패 노드', '깊이', 'nodeElement', 'overrideQuote', '학생 인용', '이유'], triples[i].map((o, j) => [j + 1, o?.failedNodeId, o?.depth, o?.nodeElement, o?.overrideQuote, o?.studentQuote, o?.reason]));
  });
  saveText(`${dir}/REVIEW.md`, review);
  return { reported: true, completedCells: results.completedCells, majority: results.majority, consistency: results.consistency, accounting: results.accounting };
}
function saveText(p, text) { writeFileSync(p, text); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const mode = process.argv[2], progress = p => console.log(JSON.stringify(p));
    const result = mode === 'prepare' ? prepare() : mode === 'map' ? await generateMaps({ onProgress: progress }) : mode === 'run' ? await run({ onProgress: progress }) : mode === 'report' ? report() : null;
    assert.ok(result, 'Usage: prepare | map | run | report'); console.log(JSON.stringify(result));
    if (result.stop || (mode === 'report' && result.completedCells !== 105)) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
