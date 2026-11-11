import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sentencesOf } from './run-item-generation.mjs';
import { loadQuestions } from './run-choice-link.mjs';
import { main, loadPilotTargets, filterOpenSlots, dice2, validateRules, validateSituation, validateItem, exampleRules, exampleSituation, exampleItem,
  situationInput, writeInput, SCHEMAS, PROMPT_PATHS } from './run-principle-pilot.mjs';

const PARAS = ['첫째 문단이다. 진자의 주기는 줄 길이의 제곱근에 비례한다. 둘째 문장도 있다.', '둘째 문단이다. 두 기포가 합쳐지는 경우에도 식이 쓰인다. 작은 기포의 압력이 더 크다.', '셋째 문단이다. 사단 법인은 구성원 단체에 법인격이 부여된다.'];
const EXCL = { description: '크기가 다른 두 기포가 접하여 하나로 합쳐지는 경우(2문단)', passageQuotes: ['두 기포가 합쳐지는 경우에도 식이 쓰인다.', '작은 기포의 압력이 더 크다.'] };

function fixture(pids = ['fix-a'], excl = [EXCL]) {
  const dir = mkdtempSync(join(tmpdir(), 'p1-')), passagesDir = join(dir, 'passages');
  mkdirSync(passagesDir);
  for (const pid of pids) writeFileSync(join(passagesDir, `${pid}.json`), JSON.stringify({ passageId: pid, paragraphs: PARAS.map((text, i) => ({ paragraphId: `${pid}-p${i + 1}`, position: i + 1, text })) }));
  const items = [{ itemKey: 'a', form: 'IN_PASSAGE', stemPolarity: 'SELECT_CORRECT', excludedSituations: excl }, { itemKey: 'b', form: 'BOGI', stemPolarity: 'SELECT_INCORRECT', excludedSituations: [] }];
  writeFileSync(join(dir, 'targets.json'), JSON.stringify(pids.map(passageId => ({ passageId, passagesDir, setId: 'setx', questionsPath: 'x', answersPath: 'y', assetsDir: dir, items }))));
  return { dir, targetsPath: join(dir, 'targets.json'), out: join(dir, 'out') };
}
const withFixture = async (fn, ...args) => { const f = fixture(...args); try { return await fn(f); } finally { rmSync(f.dir, { recursive: true, force: true }); } };
const readOut = (f, p) => JSON.parse(readFileSync(`${f.out}/runs/${p}`, 'utf8'));
const target = f => loadPilotTargets(f.targetsPath)[0];

// Fake transport. mode: 'ok' | { rules: fn(t, req) | null, situationA: 'bad' }.
function fakeTransport(f, opts = {}) {
  const targets = new Map(loadPilotTargets(f.targetsPath).map(t => [t.passageId, t]));
  return { calls: [], async create(request) {
    const name = request.text.format.name, input = JSON.parse(request.input[0].content[0].text), t = targets.get(input.passageId); this.calls.push(`${name}${input.item ? `:${input.item.itemKey}` : ''}:${input.passageId}`);
    let body;
    if (name === SCHEMAS.rules.name) body = opts.rules ? opts.rules(t) : exampleRules(t);
    else if (name === SCHEMAS.situation.name) {
      if (opts.badSituationA && input.item.itemKey === 'a') return { id: 'r', model: 'gpt-6.1-sol', status: 'completed', output_text: '{"not":"valid"}', usage: { input_tokens: 1000, output_tokens: 500 } };
      const it = t.items.find(x => x.itemKey === input.item.itemKey);
      body = exampleSituation(t, { rules: input.rules }, it, input.rules.flatMap(r => r.openSlots.map(s => s.id)));
    } else { const it = t.items.find(x => x.itemKey === input.item.itemKey); body = exampleItem(t, input.calculation, it); }
    return { id: 'r', model: 'gpt-6.1-sol', status: 'completed', output_text: JSON.stringify(body), usage: { input_tokens: 1000, output_tokens: 500 } };
  } };
}

test('real targets.json: 4 passages, 8 items, one excluded situation (surface-tension a), no map/stance/slots fields; quotes are passage substrings', () => {
  const raw = JSON.parse(readFileSync('docs/experiments/principle-application-pilot-2026-11-09/targets.json', 'utf8'));
  assert.deepEqual(raw.map(t => t.passageId), ['corporate-law', 'surface-tension-laplace', 'audio-perceptual-coding', 'plastic-polymerization']);
  for (const t of raw) { assert.deepEqual(Object.keys(t), ['passageId', 'passagesDir', 'setId', 'questionsPath', 'answersPath', 'assetsDir', 'items']);
    assert.deepEqual(t.items.map(i => [i.itemKey, i.form, i.stemPolarity]), [['a', 'IN_PASSAGE', 'SELECT_CORRECT'], ['b', 'BOGI', 'SELECT_INCORRECT']]); }
  const excl = raw.flatMap(t => t.items.map(i => [t.passageId, i.itemKey, i.excludedSituations.length])).filter(x => x[2] > 0);
  assert.deepEqual(excl, [['surface-tension-laplace', 'a', 1]]);
  const loaded = loadPilotTargets(); // throws EXCLUDED_QUOTE when a quote is not a passage substring
  assert.equal(loaded.length, 4); assert.equal(loaded.reduce((a, t) => a + t.items.length, 0), 8);
});

test('excluded quote that is not in the passage is rejected', () => withFixture(f => {
  writeFileSync(f.targetsPath, JSON.stringify([{ ...JSON.parse(readFileSync(f.targetsPath, 'utf8'))[0], items: [{ itemKey: 'a', form: 'IN_PASSAGE', stemPolarity: 'SELECT_CORRECT', excludedSituations: [{ description: 'd', passageQuotes: ['지문에 없는 문장이다.'] }] }] }]));
  assert.throws(() => loadPilotTargets(f.targetsPath), /EXCLUDED_QUOTE/u);
}));

test('dice2: same text 1.0 (whitespace ignored), unrelated text low', () => {
  assert.equal(dice2('두 기포가 합쳐진다', '두기포가  합쳐진다'), 1);
  assert.ok(dice2('두 기포가 합쳐지는 경우', '사단 법인의 구성원 단체') < 0.2);
  assert.equal(dice2('', ''), 0);
});

test('open slot filter: a slot quoting an excluded sentence is removed (sentence key), one in another paragraph stays; target similarity also removes', () => withFixture(f => {
  const t = target(f), rules = [{ id: 'R1', ruleQuote: 'q', openSlots: [
    { id: 'R1-S1', target: '전혀 다른 대상', quote: '작은 기포의 압력이 더 크다.', whatToDerive: 'w' },
    { id: 'R1-S2', target: '전혀 다른 대상', quote: '사단 법인은 구성원 단체에 법인격이 부여된다.', whatToDerive: 'w' },
    { id: 'R1-S3', target: '크기가 다른 두 기포가 접하여 하나로 합쳐지는 경우', quote: '진자의 주기는 줄 길이의 제곱근에 비례한다.', whatToDerive: 'w' }] }];
  const r = filterOpenSlots(rules, [EXCL], t.paragraphs);
  assert.deepEqual(r.usableIds, ['R1-S2']);
  assert.deepEqual(r.removed.map(x => x.id), ['R1-S1', 'R1-S3']);
  assert.match(r.removed[0].reason, /SENTENCE_KEY/u); assert.match(r.removed[1].reason, /TARGET_DICE/u);
  assert.deepEqual(filterOpenSlots(rules, [], t.paragraphs).usableIds, ['R1-S1', 'R1-S2', 'R1-S3'], 'no exclusion keeps all');
}));

test('open slot filter on the real surface-tension passage: paragraph 3 sentences removed, other paragraphs kept (fake stage 1 output)', () => {
  const t = loadPilotTargets().find(x => x.passageId === 'surface-tension-laplace'), a = t.items[0], p3 = a.excludedSituations[0].passageQuotes[1], other = t.paragraphs[0].split(/(?<=[.?!])\s+/u)[0];
  const rules = [{ id: 'R1', ruleQuote: 'q', openSlots: [{ id: 'R1-S1', target: '대상1', quote: p3, whatToDerive: 'w' }, { id: 'R1-S2', target: '대상2', quote: other, whatToDerive: 'w' }] }];
  assert.deepEqual(filterOpenSlots(rules, a.excludedSituations, t.paragraphs).usableIds, ['R1-S2']);
});

test('example outputs parse against the schemas and pass every check (fixture)', () => withFixture(f => {
  const t = target(f), rulesOut = SCHEMAS.rules.zod.parse(exampleRules(t));
  assert.equal(validateRules(rulesOut, t.paragraphs).allPass, true);
  for (const it of t.items) {
    const fl = filterOpenSlots(rulesOut.rules, it.excludedSituations, t.paragraphs), ids = it.form === 'IN_PASSAGE' ? fl.usableIds : [];
    const sit = SCHEMAS.situation.zod.parse(exampleSituation(t, rulesOut, it, ids));
    const ctx = { item: it, rules: rulesOut.rules, usableIds: new Set(ids), removedIds: new Set(fl.removed.map(x => x.id)), sentences: sentencesOf(t.paragraphs), excluded: it.excludedSituations };
    assert.deepEqual(validateSituation(sit, ctx).violations, [], it.itemKey);
    assert.deepEqual(validateItem(SCHEMAS.write.zod.parse(exampleItem(t, sit, it)), { item: it, situation: sit }).violations, [], it.itemKey);
  }
}));

test('stage 1 checks: quotes (whitespace-only passes with info), id formats, counts, open slot count info', () => withFixture(f => {
  const t = target(f), run = mutate => { const o = structuredClone(exampleRules(t)); mutate(o); return validateRules(o, t.paragraphs); };
  const msgs = r => r.violations.join(' | ');
  assert.match(msgs(run(o => { o.rules[0].ruleQuote = '지문에 없는 구절'; })), /QUOTE_NOT_IN_PASSAGE: R1 ruleQuote/u);
  assert.match(msgs(run(o => { o.rules[1].scopeQuote = '없는 범위 구절'; })), /R2 scopeQuote/u);
  assert.match(msgs(run(o => { o.rules[0].statedApplications[0].quote = '없는 구절'; })), /statedApplications\[0\]/u);
  assert.match(msgs(run(o => { o.rules[0].openSlots[0].quote = '없는 구절'; })), /R1-S1 quote/u);
  const ws = run(o => { o.rules[0].ruleQuote = '진자의  주기는 줄 길이의 제곱근에 비례한다.'; });
  assert.equal(ws.allPass, true); assert.ok(ws.info.some(i => /ignoring whitespace/u.test(i)));
  assert.match(msgs(run(o => { o.rules[0].id = 'X1'; })), /ID_FORMAT: rule X1/u);
  assert.match(msgs(run(o => { o.rules[0].openSlots[0].id = 'R2-S1'; })), /ID_FORMAT: open slot R2-S1 of R1/u);
  assert.match(msgs(run(o => { o.rules = []; })), /RULE_COUNT: 0/u);
  assert.match(msgs(run(o => { o.rules[0].variables = []; })), /VARIABLES: R1/u);
  const r = run(() => {}); assert.equal(r.openSlotCount, 2); assert.ok(r.info.some(i => /openSlots: 2/u.test(i)));
}));

function sitCase(f, itemKey, mutate) {
  const t = target(f), it = t.items.find(x => x.itemKey === itemKey), rulesOut = exampleRules(t), fl = filterOpenSlots(rulesOut.rules, it.excludedSituations, t.paragraphs);
  const sit = structuredClone(exampleSituation(t, rulesOut, it, fl.usableIds)); mutate(sit, rulesOut);
  return validateSituation(sit, { item: it, rules: rulesOut.rules, usableIds: new Set(fl.usableIds), removedIds: new Set(['R9-S9']), sentences: sentencesOf(t.paragraphs), excluded: it.excludedSituations }).violations.join(' | ');
}
test('stage 2 checks: slotRef, bogiText, rule ids and quotes, fact counts, fromSteps, passage copy, excluded situation', () => withFixture(f => {
  assert.equal(sitCase(f, 'a', () => {}), '');
  assert.match(sitCase(f, 'a', s => { s.situation.slotRef = 'R9-S9'; }), /EXCLUDED_SLOT/u);
  assert.match(sitCase(f, 'a', s => { s.situation.slotRef = 'R1-S5'; }), /SLOT_REF: R1-S5 is not a usable/u);
  assert.match(sitCase(f, 'a', s => { s.situation.slotRef = null; }), /SLOT_REF: null/u);
  assert.match(sitCase(f, 'a', s => { s.situation.bogiText = '보기'; }), /BOGI_TEXT: must be null/u);
  assert.match(sitCase(f, 'b', s => { s.situation.slotRef = 'R1-S1'; }), /SLOT_REF: must be null for BOGI/u);
  assert.match(sitCase(f, 'b', s => { s.situation.bogiText = '  '; }), /BOGI_TEXT: empty/u);
  assert.match(sitCase(f, 'a', s => { s.usedRuleIds = ['R7']; }), /RULE_ID: usedRuleIds R7/u);
  assert.match(sitCase(f, 'a', s => { s.usedRuleIds = ['R1', 'R2', 'R1']; }), /USED_RULES: 3/u);
  assert.match(sitCase(f, 'a', s => { s.steps[0].ruleId = 'R7'; }), /RULE_ID: step 1 ruleId R7/u);
  assert.match(sitCase(f, 'a', s => { s.steps[0].ruleQuote = '다른 구절'; }), /RULE_QUOTE: step 1/u);
  assert.equal(sitCase(f, 'a', s => { s.steps[0].ruleQuote = s.steps[0].ruleQuote.replace(' ', '  '); }), '', 'whitespace ignored');
  assert.match(sitCase(f, 'a', s => { s.derivedFacts.pop(); s.derivedFacts.pop(); }), /FACT_COUNT: 1 for SELECT_CORRECT/u);
  assert.match(sitCase(f, 'b', s => { s.derivedFacts.pop(); }), /FACT_COUNT: 3 for SELECT_INCORRECT/u, 'SELECT_INCORRECT needs 4-5');
  assert.equal(sitCase(f, 'a', s => { s.derivedFacts.push({ id: 'F9', text: '예시 결론 9번', fromSteps: [1], ifDifferent: 'x' }, { id: 'F10', text: '예시 결론 10번', fromSteps: [1], ifDifferent: 'x' }); }), '', '5 facts are fine');
  assert.match(sitCase(f, 'a', s => { s.derivedFacts[0].fromSteps = [9]; }), /FROM_STEPS: fact F1 names step 9/u);
  assert.match(sitCase(f, 'a', s => { s.derivedFacts[0].text = PARAS[1].split('. ')[1] + '.'; }), /FACT_COPIES_PASSAGE: fact F1/u);
  assert.match(sitCase(f, 'a', s => { s.situation.description = EXCL.description; }), /EXCLUDED_SITUATION/u);
}));

function itemCase(f, itemKey, mutate) {
  const t = target(f), it = t.items.find(x => x.itemKey === itemKey), rulesOut = exampleRules(t), fl = filterOpenSlots(rulesOut.rules, it.excludedSituations, t.paragraphs);
  const sit = exampleSituation(t, rulesOut, it, fl.usableIds), item = structuredClone(exampleItem(t, sit, it)); mutate(item);
  return validateItem(item, { item: it, situation: sit });
}
test('stage 3 checks: polarity, TRUE/FALSE fields, twist variety, stem negation and end, bogi, length giveaway; onSituation is info only', () => withFixture(f => {
  const m = (k, fn) => itemCase(f, k, fn).violations.join(' | ');
  assert.equal(m('a', () => {}), ''); assert.equal(m('b', () => {}), '');
  assert.match(m('a', i => { i.choices[0].number = 7; }), /CHOICE_NUMBERS/u);
  assert.match(m('a', i => { i.answer = 2; }), /POLARITY: answer 2 != the TRUE choice 3/u);
  assert.match(m('a', i => { i.choices[0].truth = 'TRUE'; i.choices[0].fromFact = 'F1'; i.choices[0].breaksStep = null; i.choices[0].twistType = null; }), /POLARITY: 2 choices with truth TRUE/u);
  assert.match(m('b', i => { i.choices[0].truth = 'FALSE'; i.choices[0].fromFact = null; i.choices[0].breaksStep = 1; i.choices[0].twistType = 'SCOPE'; }), /POLARITY: 2 choices with truth FALSE/u);
  assert.match(m('a', i => { i.choices[2].fromFact = 'F99'; }), /FROM_FACT: #3 F99/u);
  assert.match(m('a', i => { i.choices[2].twistType = 'SCOPE'; }), /TRUE_TWIST: #3/u);
  assert.match(m('a', i => { i.choices[0].breaksStep = 9; }), /BREAKS_STEP: #1 9/u);
  assert.match(m('a', i => { i.choices[0].twistType = null; }), /TWIST_TYPE: #1/u);
  assert.match(m('a', i => { i.choices[0].fromFact = 'F1'; }), /FALSE_FROM_FACT: #1/u);
  assert.match(m('a', i => { for (const c of i.choices) if (c.truth === 'FALSE') c.twistType = 'SCOPE'; }), /TWIST_VARIETY/u);
  assert.equal(m('b', i => { i.choices[0].onSituation = false; i.choices[1].onSituation = false; }), '', 'onSituation below 4 is not a violation');
  assert.ok(itemCase(f, 'b', i => { i.choices[0].onSituation = false; i.choices[1].onSituation = false; }).info.some(x => /onSituation below 4/u.test(x)));
  assert.match(m('a', i => { i.stem = '윗글을 바탕으로 않은 것이 아닌 것으로 가장 적절한 것은?'; }), /STEM_NEGATION/u);
  assert.match(m('a', i => { i.stem = '윗글을 바탕으로 이해한 내용으로 적절한 것은'; }), /STEM_END/u);
  assert.match(m('b', i => { i.stem = '윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?'; }), /STEM_END/u);
  assert.match(m('b', i => { i.bogi += ' '; }), /BOGI_TEXT: differs/u);
  assert.match(m('a', i => { i.bogi = '보기'; }), /BOGI_TEXT: must be null/u);
  assert.match(m('a', i => { i.choices[2].text += ' 더 길게 쓴 정답 선지'; }), /FORM_GIVEAWAY_LENGTH/u);
  assert.equal(m('a', i => { i.choices[2].text += ' 더 길다'; i.choices[0].text += ' 더 길다'; }), '', 'a tie for longest passes');
}));

test('full run with a fake transport: 5 requests, files per stage, RUN and ledger, RUN_EXISTS', () => withFixture(async f => {
  const transport = fakeTransport(f), r = await main({ targetsPath: f.targetsPath, out: f.out, transport });
  assert.equal(r.requests, 5); assert.equal(r.stop, null); assert.equal(r.protectedFilesUnchanged, true);
  assert.deepEqual(transport.calls, ['p1_rules_v1:fix-a', 'p1_situation_v1:a:fix-a', 'p1_item_v1:a:fix-a', 'p1_situation_v1:b:fix-a', 'p1_item_v1:b:fix-a']);
  for (const n of ['rules', 'situation-a', 'item-a', 'situation-b', 'item-b']) for (const ext of ['raw.json', 'json', 'validation.json']) assert.ok(existsSync(`${f.out}/runs/fix-a/${n}.${ext}`), `${n}.${ext}`);
  const run = readOut(f, 'RUN.json');
  assert.equal(run.model, 'gpt-6.1-sol'); assert.equal(run.requests, 5); assert.equal(run.retries, 0); assert.ok(run.instructionsHashes.RULES && run.schemaHashes.rules && run.inputHashes['rules/fix-a']);
  assert.equal(readFileSync(`${f.out}/runs/ledger.jsonl`, 'utf8').trim().split('\n').length, 10);
  assert.equal(readOut(f, 'fix-a/situation-a.validation.json').validation.allPass, true);
  assert.ok(readOut(f, 'fix-a/situation-a.validation.json').validation.info.some(i => /removed open slot/u.test(i)) === false, 'example slots are not in the excluded paragraph');
  await assert.rejects(() => main({ targetsPath: f.targetsPath, out: f.out, transport }), /RUN_EXISTS/u);
}));

test('the situation request for item a carries only usable open slots; b carries the rules unchanged', () => withFixture(async f => {
  const rulesWithExcludedSlot = t => { const o = exampleRules(t); o.rules[0].openSlots.push({ id: 'R1-S2', target: '두 기포 합체', quote: '작은 기포의 압력이 더 크다.', whatToDerive: 'w' }); return o; };
  const seen = {}, base = fakeTransport(f, { rules: rulesWithExcludedSlot });
  const transport = { calls: base.calls, create: async req => { const inp = JSON.parse(req.input[0].content[0].text); if (inp.item) seen[inp.item.itemKey] = inp.rules.flatMap(r => r.openSlots.map(s => s.id)); return base.create(req); } };
  await main({ targetsPath: f.targetsPath, out: f.out, transport });
  assert.deepEqual(seen.a, ['R1-S1', 'R2-S1']); assert.deepEqual(seen.b, ['R1-S1', 'R1-S2', 'R2-S1']);
  assert.ok(readOut(f, 'fix-a/situation-a.validation.json').validation.info.some(i => /removed open slot R1-S2: SENTENCE_KEY/u.test(i)));
}));

test('gate (D-0227): two passages with no usable open slot stop every a item before stage 2 while b items go on; one such passage skips only its a item', async () => {
  const empty = t => { const o = exampleRules(t); for (const r of o.rules) r.openSlots = []; return o; };
  await withFixture(async f => {
    const transport = fakeTransport(f, { rules: empty }), r = await main({ targetsPath: f.targetsPath, out: f.out, transport });
    assert.equal(r.requests, 2 + 2 + 2); assert.equal(r.stop, null); assert.equal(r.gateStopped, true);
    assert.ok(!transport.calls.some(c => /^p1_(situation_v1|item_v1):a:/u.test(c)));
    for (const p of ['fix-a', 'fix-b']) { assert.ok(transport.calls.includes(`p1_situation_v1:b:${p}`)); assert.ok(transport.calls.includes(`p1_item_v1:b:${p}`)); }
    assert.equal(readOut(f, 'RUN.json').stop, null); assert.deepEqual(readOut(f, 'RUN.json').gate, { passagesWithoutOpenSlot: ['fix-a', 'fix-b'], inPassageBlocked: true });
    assert.equal(readOut(f, 'fix-a/situation-a.validation.json').requestStatus, 'NOT_SENT'); assert.match(readOut(f, 'fix-a/situation-a.validation.json').error, /GATE: openSlots/u);
  }, ['fix-a', 'fix-b']);
  await withFixture(async f => {
    const transport = fakeTransport(f, { rules: t => t.passageId === 'fix-a' ? empty(t) : exampleRules(t) }), r = await main({ targetsPath: f.targetsPath, out: f.out, transport });
    assert.equal(r.stop, null); assert.equal(r.requests, 2 + 2 + 4);
    assert.ok(!transport.calls.includes('p1_situation_v1:a:fix-a')); assert.ok(transport.calls.includes('p1_situation_v1:b:fix-a')); assert.ok(transport.calls.includes('p1_item_v1:b:fix-a'));
    assert.match(readOut(f, 'fix-a/situation-a.validation.json').error, /NO_OPEN_SLOT/u);
    assert.ok(!existsSync(`${f.out}/runs/fix-a/situation-a.raw.json`));
  }, ['fix-a', 'fix-b']);
});

test('a situation that does not parse: its write request is not sent; the other item goes on', () => withFixture(async f => {
  const transport = fakeTransport(f, { badSituationA: true }), r = await main({ targetsPath: f.targetsPath, out: f.out, transport });
  assert.equal(r.requests, 4); assert.ok(!transport.calls.some(c => c.startsWith('p1_item_v1:a')));
  assert.equal(readOut(f, 'fix-a/situation-a.validation.json').requestStatus, 'FORMAT_ERROR');
  assert.equal(readOut(f, 'fix-a/item-a.validation.json').requestStatus, 'NOT_SENT');
  assert.equal(readOut(f, 'fix-a/item-b.validation.json').requestStatus, 'PARSED');
  assert.ok(!existsSync(`${f.out}/runs/fix-a/situation-a.json`));
}));

test('a rules response that does not parse: no stage 2 or 3 for that passage', () => withFixture(async f => {
  const base = fakeTransport(f), transport = { calls: base.calls, create: async req => req.text.format.name === 'p1_rules_v1' ? { id: 'r', status: 'completed', output_text: 'nope', usage: { input_tokens: 1, output_tokens: 1 } } : base.create(req) };
  const r = await main({ targetsPath: f.targetsPath, out: f.out, transport });
  assert.equal(r.requests, 1); assert.equal(readOut(f, 'fix-a/situation-a.validation.json').error, 'RULES_FAILED');
}));

test('limits: max requests stops the run and records STOP', () => withFixture(async f => {
  const r = await main({ targetsPath: f.targetsPath, out: f.out, transport: fakeTransport(f), limits: { maxRequests: 2, usdCap: 5 } });
  assert.equal(r.requests, 2); assert.equal(r.stop, 'RUN_LIMIT: max requests');
  assert.ok(readFileSync(`${f.out}/runs/ledger.jsonl`, 'utf8').includes('"event":"STOP"'));
}));

test('dry-run on the real targets: 20 requests (rules 4, situation 8, write 8) under the cap; every example output passes its checks', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'p1-dry-'));
  try {
    const r = await main({ dryRun: true, out: dir });
    assert.equal(r.requests, 20); assert.equal(r.externalRequests, 0); assert.equal(r.overCap, false); assert.equal(r.overMaxRequests, false);
    assert.deepEqual(Object.fromEntries(Object.entries(r.byStage).map(([k, v]) => [k, v.requests])), { rules: 4, situation: 8, write: 8 });
    assert.equal(r.exampleChecksPass, true); assert.deepEqual(r.skipped, []);
    const files = readdirSync(dir, { recursive: true }).filter(n => n.endsWith('.request.json'));
    assert.equal(files.length, 20);
    // Requests carry no exam text, no exam number, no gold map; the surface-tension a exclusion description is the one allowed exception.
    const texts = files.map(n => readFileSync(join(dir, n), 'utf8'));
    for (const s of texts) { assert.ok(!/realNumber|mapPath|"propositions"|"relations"|"stances"|"slots"|questionsPath|answersPath/u.test(s)); }
    const norm = s => s.replace(/\s+/gu, '');
    const targets = JSON.parse(readFileSync('docs/experiments/principle-application-pilot-2026-11-09/targets.json', 'utf8')), all = texts.map(s => norm(JSON.stringify(JSON.parse(s).input))).join('\n');
    const instr = texts.map(s => norm(JSON.parse(s).instructions)).join('\n');
    let checked = 0;
    for (const t of targets) {
      if (!existsSync(t.questionsPath)) continue;
      const set = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, JSON.parse(readFileSync('docs/experiments/sns-diagnostic-gold-2026-11-05/supplement-fixed.json', 'utf8')).items);
      for (const q of set.questions) for (const piece of [q.stem, ...q.choices.map(c => c.text)]) if (norm(JSON.stringify(piece)).length >= 20) { checked++; assert.ok(!all.includes(norm(JSON.stringify(piece)).slice(1, -1)), `${t.passageId} #${q.number} text in a request`); assert.ok(!instr.includes(norm(piece))); }
    }
    assert.ok(checked > 0 || !existsSync(targets[0].questionsPath), 'exam texts were checked when the files exist');
    const withExcl = texts.filter(s => s.includes('크기가 다른 두 기포가 접하여 하나로 합쳐지는 경우(3문단)'));
    assert.deepEqual(withExcl.length, 1, 'only the surface-tension situation request carries the exclusion'); assert.match(withExcl[0], /"itemKey": "a"|itemKey\\": \\"a/u);
    assert.deepEqual(readdirSync(`${dir}/dry-run`).sort(), ['audio-perceptual-coding', 'corporate-law', 'plastic-polymerization', 'surface-tension-laplace']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('request inputs: situation input has rules + item info; write input has the calculation and no rules', () => withFixture(f => {
  const t = target(f), rulesOut = exampleRules(t), a = t.items[0], sit = exampleSituation(t, rulesOut, a, ['R1-S1']);
  const si = situationInput(t, rulesOut, a), wi = writeInput(t, sit, a);
  assert.deepEqual(Object.keys(si), ['passageId', 'paragraphs', 'rules', 'item']); assert.deepEqual(Object.keys(si.item), ['itemKey', 'form', 'stemPolarity', 'excludedSituations']);
  assert.deepEqual(Object.keys(wi), ['passageId', 'paragraphs', 'calculation', 'item']); assert.deepEqual(Object.keys(wi.item), ['itemKey', 'form', 'stemPolarity']);
  assert.ok(!('rules' in wi) && !('excludedSituations' in wi.item));
}));

test('prompt files are loaded unchanged (no edits by this script): instructions load from each', () => {
  for (const p of Object.values(PROMPT_PATHS)) assert.ok(readFileSync(p, 'utf8').includes('## 지시문'));
});

test('runsName writes a separate run folder and leaves runs/ alone (D-0227)', () => withFixture(async f => {
  const transport = fakeTransport(f, {}), r = await main({ targetsPath: f.targetsPath, out: f.out, transport, runsName: 'runs-v2' });
  assert.equal(r.stop, null); assert.ok(existsSync(`${f.out}/runs-v2/RUN.json`)); assert.ok(!existsSync(`${f.out}/runs/RUN.json`));
}));

test('the RULES prompt in use is v2 with the cross-rule open slot sentence', () => {
  assert.match(PROMPT_PATHS.RULES, /RULES-PROMPT-v2\.md$/u);
  assert.match(readFileSync(PROMPT_PATHS.RULES, 'utf8'), /다른 규칙의 `statedApplications`에 들어 있어도/u);
});

test('reuse-from (D-0227): parsed outputs of an earlier run with the same request are taken without sending; failed ones are sent; a changed request refuses', () => withFixture(async f => {
  const t1 = fakeTransport(f, {}); await main({ targetsPath: f.targetsPath, out: f.out, transport: t1, runsName: 'first' });
  for (const p of ['fix-a/item-a', 'fix-a/situation-b', 'fix-a/item-b']) { const base = `${f.out}/first/${p}`; for (const ext of ['.json', '.raw.json']) if (existsSync(base + ext)) rmSync(base + ext); }
  const t2 = fakeTransport(f, {}), r = await main({ targetsPath: f.targetsPath, out: f.out, transport: t2, runsName: 'second', reuseFrom: `${f.out}/first` });
  assert.deepEqual(t2.calls.sort(), ['p1_item_v1:a:fix-a', 'p1_item_v1:b:fix-a', 'p1_situation_v1:b:fix-a'].sort());
  assert.equal(r.requests, 3); assert.equal(r.outcomes.filter(o => o.requestStatus === 'REUSED').length, t1.calls.length - 3);
  const v = JSON.parse(readFileSync(`${f.out}/second/fix-a/rules.validation.json`, 'utf8')); assert.equal(v.requestStatus, 'REUSED');
  const dry = await main({ dryRun: true, targetsPath: f.targetsPath, out: f.out, runsName: 'second-dry', reuseFrom: `${f.out}/first` });
  assert.equal(dry.requests, 3);
  const lines = readFileSync(`${f.out}/first/ledger.jsonl`, 'utf8').replace(/"requestHash":"[0-9a-f]+"/u, '"requestHash":"changed"');
  writeFileSync(`${f.out}/first/ledger.jsonl`, lines);
  await assert.rejects(main({ targetsPath: f.targetsPath, out: f.out, transport: fakeTransport(f, {}), runsName: 'third', reuseFrom: `${f.out}/first` }), /REUSE_MISMATCH/u);
}));
