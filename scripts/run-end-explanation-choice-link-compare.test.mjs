import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  CASE_IDS, REGRESSION_DIR, B3_RECHECK_DIR, CHOICE_LINK_DIR, TARGETS_PATH, LINK_APPENDIX, LINK_APPENDIX_CORRECT, KINDS, SOL, LUNA, RATES_BY_MODEL, reserveUsdFor, kindOfInstructions, USER_CASES, LIMITS, MAX_SUPPORT, TWIST_NAMES, MAP_ID_PATTERN,
  findEndRequest, choiceLinkOf, buildChoiceLinks, makeLinkRequest, assignBlind, limitCheck, sessionChoices, prepareCases, main,
} from './run-end-explanation-choice-link-compare.mjs';
import { INCORRECT_END_INSTRUCTIONS, CORRECT_END_INSTRUCTIONS } from '../packages/pipeline/dist/problem-solving/feedback-v5-end-explanation.js';
import { TWIST_KO, FIXED_PATH } from './run-choice-link.mjs';

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const put = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data)); };
const tmp = () => mkdtempSync(join(tmpdir(), 'end-compare-'));
const haveData = existsSync(`${REGRESSION_DIR}/requests`) && existsSync(`${B3_RECHECK_DIR}/requests`) && existsSync(`${CHOICE_LINK_DIR}/runs/ui-v5/frozen`)
  && existsSync(TARGETS_PATH) && readJson(TARGETS_PATH).every(t => existsSync(t.questionsPath) && existsSync(t.answersPath));

const ctx = {
  map: { propositions: [{ id: 'P1-1', text: '명제1' }, { id: 'P1-2', text: '명제2' }, { id: 'P1-3', text: '명제3' }], nodes: [{ id: 'G1', text: '요지1' }, { id: 'C1-1', text: '묶음1' }, { id: 'X1', text: '교차1' }], relations: [{ id: 'R1', note: '관계' }] },
  question: { supplementSegments: [{ id: 'S1', text: '보기 첫 문장' }, { id: 'F1', text: '그림 설명' }] },
  frozenQuestion: { number: 7, extraSegments: [{ id: 'S1a', parentId: 'S1', quote: '보기 앞부분' }], choices: [
    { number: 1, truth: 'FALSE', parts: [
      { twisted: true, twistType: 'CAUSE_SWAP', choiceQuote: '선지 조각', evidenceQuote: '', twistDetail: '원인을 바꿈', supportIds: ['P1-1'] },
      { twisted: true, twistType: 'DEGREE', choiceQuote: '조각2', evidenceQuote: '원문 문장', twistDetail: '정도를 바꿈', supportIds: [] },
      { twisted: false, twistType: null, choiceQuote: '', evidenceQuote: '', twistDetail: '', supportIds: ['P1-2'] }] },
    { number: 2, truth: 'TRUE', parts: [
      { twisted: false, supportIds: ['S1a', 'P1-1', 'R1', 'S1', 'P1-1', 'F1', 'G1', 'X1', 'P1-3'] },
      { twisted: true, supportIds: ['P1-2'] }] },
    { number: 3, truth: 'TRUE', parts: [{ twisted: false, supportIds: ['P1-2', 'C1-1'] }] },
    { number: 4, truth: 'TRUE', parts: [{ twisted: false, supportIds: ['G1'] }] }] },
};

test('FALSE choice: twists with null for empty evidence and Korean kind names', () => {
  assert.deepEqual(choiceLinkOf(1, ctx), { choice: 1, statement: 'FALSE', twists: [
    { choicePart: '선지 조각', sourceText: null, how: '원인을 바꿈', kind: TWIST_KO.CAUSE_SWAP },
    { choicePart: '조각2', sourceText: '원문 문장', how: '정도를 바꿈', kind: TWIST_KO.DEGREE }] });
});

test('TRUE choice: support ids become map/segment text, unknown ids dropped, duplicates removed, at most 4', () => {
  const l = choiceLinkOf(2, ctx);
  assert.equal(l.statement, 'TRUE');
  assert.equal(MAX_SUPPORT, 4);
  assert.deepEqual(l.support, ['보기 앞부분', '명제1', '보기 첫 문장', '그림 설명']);
  assert.deepEqual(choiceLinkOf(3, ctx).support, ['명제2', '묶음1']);
  assert.deepEqual(choiceLinkOf(4, ctx).support, ['요지1']);
});

test('target choices are deduplicated in first, reselection, answer order', () => {
  assert.deepEqual(buildChoiceLinks({ firstChoice: 2, reselection: 1, answer: 1 }, ctx).map(l => l.choice), [2, 1]);
  assert.deepEqual(buildChoiceLinks({ firstChoice: 3, reselection: null, answer: 1 }, ctx).map(l => l.choice), [3, 1]);
  assert.deepEqual(buildChoiceLinks({ firstChoice: 1, reselection: null, answer: 1 }, ctx).map(l => l.choice), [1]);
});

test('sessionChoices reads first and second selection and the answer position', () => {
  const payload = { source: { questionId: 'x-q1', answerChoiceId: 'C3', choices: [{ choiceId: 'C3', position: 3 }] },
    studentUtterances: [{ selectedChoice: 5 }, { text: 'a' }, { selectedChoice: 1 }] };
  assert.deepEqual(sessionChoices(payload), { firstChoice: 5, reselection: 1, answer: 3 });
});

test('LINK request equals BASE except instructions appendix and one payload key', () => {
  const base = { model: 'm', store: false, reasoning: { effort: 'medium' }, max_output_tokens: 8000, instructions: 'ins', text: { format: { name: 'f' } },
    input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ source: { a: 1 }, errors: [] }, null, 2) + '\n' }, { type: 'input_image', image_url: 'https://x/y.png', detail: 'high' }] }] };
  const before = structuredClone(base), links = [{ choice: 1, statement: 'TRUE', support: ['a'] }];
  const link = makeLinkRequest(base, links);
  assert.deepEqual(base, before);
  const strip = r => { const c = structuredClone(r); delete c.instructions; c.input[0].content[0].text = JSON.parse(c.input[0].content[0].text); delete c.input[0].content[0].text.choiceLinks; return c; };
  assert.deepEqual(strip(link), strip(base));
  assert.equal(link.instructions, `ins\n${LINK_APPENDIX}`);
  assert.deepEqual(JSON.parse(link.input[0].content[0].text).choiceLinks, links);
  assert.equal(Object.keys(JSON.parse(link.input[0].content[0].text)).length, 3);
});

test('seeded blind assignment is reproducible, mixed, and seed dependent', () => {
  const a = assignBlind(CASE_IDS, 20261023), b = assignBlind(CASE_IDS, 20261023), c = assignBlind(CASE_IDS, 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const xs = Object.values(a).map(v => v.X);
  assert.ok(xs.includes('BASE') && xs.includes('LINK'));
  assert.ok(Object.values(a).every(v => v.X !== v.Y));
  assert.equal(CASE_IDS.length, 42);
  assert.deepEqual(CASE_IDS.slice(0, 7), ['C-A1', 'C-A3', 'C-B1', 'C-B2', 'C-B3', 'C-CT', 'C-CP']);
});

test('limit check: request count and reserved usd, per model', () => {
  assert.equal(LIMITS.maxRequests, 84);
  assert.equal(limitCheck({ requests: 0, spentUsd: 0, reserved: 0.1 }), null);
  assert.match(limitCheck({ requests: LIMITS.maxRequests, spentUsd: 0, reserved: 0 }), /max requests/u);
  assert.match(limitCheck({ requests: 1, spentUsd: 0.45, reserved: 0.1, model: LUNA }), /usd cap \(gpt-6-luna\)/u);
  assert.equal(limitCheck({ requests: 1, spentUsd: 0.4, reserved: 0.1, model: LUNA }), null);
  assert.equal(limitCheck({ requests: 1, spentUsd: 3.9, reserved: 0.1, model: SOL }), null);
  assert.match(limitCheck({ requests: 1, spentUsd: 0.5, reserved: 0.1, model: LUNA }, { maxRequests: 9, usdCap: 0.55 }), /usd cap/u);
  assert.match(limitCheck({ requests: 1, spentUsd: 3.95, reserved: 0.1 }), /usd cap/u);
  assert.equal(limitCheck({ requests: 1, spentUsd: 3.9, reserved: 0.1 }), null);
  assert.match(limitCheck({ requests: 2, spentUsd: 0, reserved: 0 }, { maxRequests: 2, usdCap: 4 }), /max requests/u);
});

test('name and id exposure patterns', () => {
  assert.equal(TWIST_NAMES.length, 14);
  assert.ok(MAP_ID_PATTERN.test('P1-2를 보면') && MAP_ID_PATTERN.test('TOP') && !MAP_ID_PATTERN.test('정답'));
});

test('end-explanation kinds: instructions constants differ, appendix is chosen per kind, rates per model', () => {
  assert.notEqual(INCORRECT_END_INSTRUCTIONS, CORRECT_END_INSTRUCTIONS);
  assert.equal(kindOfInstructions(INCORRECT_END_INSTRUCTIONS), 'INCORRECT');
  assert.equal(kindOfInstructions(CORRECT_END_INSTRUCTIONS), 'CORRECT');
  assert.equal(kindOfInstructions('다른'), null);
  assert.equal(KINDS.INCORRECT.appendix, LINK_APPENDIX);
  assert.equal(KINDS.CORRECT.appendix, LINK_APPENDIX_CORRECT);
  const base = { model: LUNA, instructions: 'ins', max_output_tokens: 1000, input: [{ role: 'user', content: [{ type: 'input_text', text: '{"a":1}\n' }] }] };
  assert.equal(makeLinkRequest(base, [], LINK_APPENDIX_CORRECT).instructions, `ins\n${LINK_APPENDIX_CORRECT}`);
  assert.ok(reserveUsdFor(base) < reserveUsdFor({ ...base, model: SOL }) / 10);
  assert.deepEqual(RATES_BY_MODEL[LUNA], { input: 0.10, output: 0.50 });
  assert.ok(USER_CASES.includes('G-CT') && !USER_CASES.includes('G-B2'));
});

// ---- tests that read the real experiment folders (skipped when absent) ----

const mkRoot = (caseId, mutate) => {
  const root = tmp(), found = findEndRequest(caseId);
  const stored = structuredClone(found.stored); mutate?.(stored);
  put(`${root}/${REGRESSION_DIR}/requests/${caseId}-1.request.json`, stored);
  return root;
};

test('exactly one end-explanation request per session is required', { skip: !haveData }, () => {
  const root = tmp(), found = findEndRequest('C-A1');
  put(`${root}/${REGRESSION_DIR}/requests/C-A1-1.request.json`, found.stored);
  put(`${root}/${REGRESSION_DIR}/requests/C-A1-2.request.json`, found.stored);
  assert.throws(() => findEndRequest('C-A1', root), /END_REQUEST_COUNT/u);
  const root0 = tmp(), other = structuredClone(found.stored); other.request.instructions = '다른 지시문';
  put(`${root0}/${REGRESSION_DIR}/requests/C-A1-1.request.json`, other);
  assert.throws(() => findEndRequest('C-A1', root0), /END_REQUEST_COUNT/u);
  assert.equal(findEndRequest('C-A1', mkRoot('C-A1')).stored.caseId, found.stored.caseId);
});

test('B3 sessions are read from the recheck folder', { skip: !haveData }, () => {
  assert.match(findEndRequest('C-B3').requestPath, new RegExp(B3_RECHECK_DIR, 'u'));
  assert.match(findEndRequest('C-A1').requestPath, new RegExp(REGRESSION_DIR, 'u'));
});

test('CT/CP sessions are read as correct-ending with luna; unknown model or instructions throw', { skip: !haveData }, () => {
  const found = findEndRequest('C-CT');
  assert.equal(kindOfInstructions(found.stored.request.instructions), 'CORRECT');
  assert.equal(found.stored.request.model, LUNA);
  const root = mkRoot('C-CT', s => { s.request.model = 'gpt-other'; });
  for (const p of [FIXED_PATH, TARGETS_PATH]) put(`${root}/${p}`, readFileSync(p, 'utf8'));
  assert.throws(() => prepareCases({ root, caseIds: ['C-CT'] }), /MODEL_MISMATCH/u);
});

test('stored instructions that differ from the current constant throw', { skip: !haveData }, () => {
  const root = mkRoot('C-A1', s => { s.request.instructions = s.request.instructions.replace('친근한 반말', '정중한 말투'); });
  for (const p of [FIXED_PATH, TARGETS_PATH]) put(`${root}/${p}`, readFileSync(p, 'utf8'));
  assert.throws(() => prepareCases({ root, caseIds: ['C-A1'] }), /INSTRUCTIONS_MISMATCH/u);
});

test('real 42-session dry-run: 84 requests, instructions match by kind, BASE untouched, LINK adds one key', { skip: !haveData }, async () => {
  const out = join(tmp(), 'dry-run');
  const r = await main({ dryRun: true, out });
  assert.equal(r.sessions, 42);
  assert.equal(r.requests, 84);
  assert.equal(r.byModel[SOL].requests, 60);
  assert.equal(r.byModel[LUNA].requests, 24);
  assert.equal(r.externalRequests, 0);
  assert.equal(r.instructionsMatchCurrent, true);
  const cases = readJson(`${out}/CASES.json`);
  assert.equal(cases.length, 42);
  let total = 0;
  for (const c of cases) {
    const base = readJson(`${out}/sessions/${c.caseId}/BASE.request.json`), link = readJson(`${out}/sessions/${c.caseId}/LINK.request.json`);
    const correct = /-(?:CT|CP)$/u.test(c.caseId), K = correct ? KINDS.CORRECT : KINDS.INCORRECT;
    assert.equal(c.kind, correct ? 'CORRECT' : 'INCORRECT');
    assert.equal(c.model, correct ? LUNA : SOL);
    assert.equal(base.request.model, c.model);
    assert.equal(base.request.instructions, K.instructions);
    assert.equal(link.request.instructions, `${K.instructions}\n${K.appendix}`);
    const bp = JSON.parse(base.request.input[0].content[0].text), lp = JSON.parse(link.request.input[0].content[0].text);
    assert.deepEqual({ ...lp, choiceLinks: undefined }, { ...bp, choiceLinks: undefined });
    assert.deepEqual(lp.choiceLinks, c.choiceLinks);
    assert.equal(bp.choiceLinks, undefined);
    total += reserveUsdFor(base.request) + reserveUsdFor(link.request);
  }
  assert.ok(Math.abs(total - r.totalReserveUsd) < 1e-9);
  assert.equal(existsSync(`${out}/BLIND-PAIRS.md`), false);
});

test('mock run: blind files hide condition names and choiceLinks; KEY and CHECKS are written', { skip: !haveData }, async () => {
  const out = join(tmp(), 'mock'), caseIds = ['C-A3', 'S-B2'];
  let n = 0;
  const transport = { async create(request) {
    n++;
    const text = JSON.stringify({ firstChoice: `처음 선지 설명 ${n}`, reselection: null, answer: `정답 설명 ${n}` });
    return { id: `resp_${n}`, status: 'completed', model: request.model, output: [], output_text: text, usage: { input_tokens: 1000, output_tokens: 500 } };
  } };
  const r = await main({ out, transport, caseIds });
  assert.equal(n, 4);
  assert.equal(r.parsed, 4);
  assert.equal(r.stop, null);
  for (const f of ['BLIND-PAIRS.md', 'USER-PAIRS.md']) {
    const text = readFileSync(`${out}/${f}`, 'utf8');
    assert.ok(!/BASE|LINK|choiceLinks|twists/u.test(text), `${f} leaks condition or choiceLinks`);
    assert.match(text, /설명 X/u);
  }
  assert.match(readFileSync(`${out}/USER-PAIRS.md`, 'utf8'), /판정표/u);
  const key = readJson(`${out}/KEY.json`);
  assert.deepEqual(key.assignment['02'].caseId, 'C-A3');
  const checks = readJson(`${out}/CHECKS.json`).checks;
  assert.equal(checks['C-A3'].LINK.firstChoice.noTwistNames, true);
  assert.equal(checks['C-A3'].BASE.reselection, null);
  const ledger = readFileSync(`${out}/ledger.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(e => e.event === 'START').length, 4);
  assert.equal(ledger.filter(e => e.event === 'END').length, 4);
  assert.ok(existsSync(`${out}/sessions/C-A3/ORIGINAL.json`) && existsSync(`${out}/sessions/S-B2/LINK.json`));
});

test('mock run stops at the request cap and at the usd cap', { skip: !haveData }, async () => {
  const transport = { async create(request) { return { id: 'r', status: 'completed', model: request.model, output: [], output_text: JSON.stringify({ firstChoice: 'a', reselection: null, answer: 'b' }), usage: { input_tokens: 100, output_tokens: 100 } }; } };
  const r1 = await main({ out: join(tmp(), 'cap1'), transport, caseIds: ['C-A3', 'S-B2'], limits: { maxRequests: 1, usdCap: 4 } });
  assert.equal(r1.externalRequests, 1);
  assert.match(r1.stop, /max requests/u);
  const r2 = await main({ out: join(tmp(), 'cap2'), transport, caseIds: ['C-A3', 'S-B2'], limits: { maxRequests: 60, usdCap: 0.001 } });
  assert.equal(r2.externalRequests, 0);
  assert.match(r2.stop, /usd cap/u);
});
