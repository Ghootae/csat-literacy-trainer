import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { instructionsFrom } from './run-analysis-map-gongsun.mjs';
import { TWIST_TYPES } from './run-choice-link.mjs';
import { main, loadGenTargets, twistDistribution, frozenFiles, baselineInput, designInputB, writeInput, slotsOf, validateDesign, validateItems,
  exampleDesign, exampleItems, SCHEMAS, PROMPT_PATHS, FROZEN_DIRS, DESIGN_TWIST_TYPES } from './run-item-generation.mjs';

const PID = 'fixture-passage', REAL_STEM = '실제 기출 발문 문장입니다 적절한 것은?', REAL_CHOICE = '실제 기출 선지 문장입니다 하나';
const PARAS = ['첫째 문단이다. 법인은 독립된 권리를 가진다. 둘째 문장도 있다.', '둘째 문단이다. 재단 법인은 자산에 법인격이 부여된다.', '셋째 문단이다. 사단 법인은 구성원 단체에 법인격이 부여된다.'];
const map = { passageId: PID,
  propositions: [{ id: 'P1-1', paragraphId: `${PID}-p1`, text: '명제1', sourceQuote: 'q', role: 'r' }, { id: 'P2-1', paragraphId: `${PID}-p2`, text: '명제2', sourceQuote: 'q', role: 'r' }],
  nodes: [{ id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: `${PID}-p1`, text: '요지', childIds: ['P1-1'] }, { id: 'TOP', kind: 'TOP', paragraphId: null, text: '최상위', childIds: ['G1'] }],
  relations: [{ id: 'R1', fromId: 'P2-1', toId: 'P1-1', name: '이름', note: '메모' }] };
const SLOTS = [{ slot: 1, realNumber: 4710, stemPolarity: 'SELECT_INCORRECT', scope: 'PASSAGE_WIDE' }, { slot: 2, realNumber: 4711, stemPolarity: 'SELECT_CORRECT', scope: 'CONCEPT' }];

function frozenFile(passageId, parts) {
  return { version: 1, passageId, questions: [{ number: 1, stemPolarity: 'SELECT_INCORRECT', extraSegments: [], choices: parts.map((p, i) => ({ number: i + 1, truth: p.truth, parts: [{ twisted: p.twisted, twistType: p.type }] })) }] };
}
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'itemgen-')), passagesDir = join(dir, 'passages');
  mkdirSync(passagesDir);
  writeFileSync(join(passagesDir, `${PID}.json`), JSON.stringify({ passageId: PID, paragraphs: PARAS.map((text, i) => ({ paragraphId: `${PID}-p${i + 1}`, position: i + 1, text })) }));
  const p = n => join(dir, n);
  writeFileSync(p('map.json'), JSON.stringify(map));
  writeFileSync(p('stance.json'), JSON.stringify({ stances: [{ id: 'P1-1', kind: 'AUTHOR', holder: null, evidence: 'e' }, { id: 'P2-1', kind: 'HOLDER', holder: '갑', evidence: 'e' }] }));
  writeFileSync(p('classify.json'), JSON.stringify({ items: [{ id: 'R1', type: 'CAUSE' }] }));
  // Real exam question files exist next to the targets but must never be read by generation.
  writeFileSync(p('real-questions.json'), JSON.stringify({ questions: [{ number: 4710, stem: REAL_STEM, choices: [{ number: 1, text: REAL_CHOICE }] }] }));
  writeFileSync(p('targets.json'), JSON.stringify([{ passageId: PID, passagesDir, mapPath: p('map.json'), stancePath: p('stance.json'), classifyPath: p('classify.json'), setId: 'setx',
    questionsPath: p('real-questions.json'), answersPath: p('real-answers.json'), assetsDir: dir, slots: SLOTS }]));
  mkdirSync(p('frozen'));
  writeFileSync(p('frozen/own.json'), JSON.stringify(frozenFile(PID, [{ truth: 'FALSE', twisted: true, type: 'SCOPE_EXTEND' }, { truth: 'FALSE', twisted: true, type: 'SCOPE_EXTEND' }])));
  writeFileSync(p('frozen/other1.json'), JSON.stringify(frozenFile('other-1', [{ truth: 'FALSE', twisted: true, type: 'NEGATION' }, { truth: 'TRUE', twisted: true, type: 'DEGREE' }, { truth: 'FALSE', twisted: false, type: null },
    { truth: 'FALSE', twisted: true, type: 'NEGATION' }, { truth: 'FALSE', twisted: true, type: 'HOLDER_SWAP' }])));
  writeFileSync(p('frozen/other2.json'), JSON.stringify(frozenFile('other-2', [{ truth: 'FALSE', twisted: true, type: 'HOLDER_SWAP' }])));
  writeFileSync(p('frozen/freeze-summary.json'), JSON.stringify([{ key: 'x' }]));
  writeFileSync(p('frozen/overrides.json'), JSON.stringify({ items: [] }));
  return { dir, targetsPath: p('targets.json'), frozen: ['own', 'other1', 'other2', 'freeze-summary', 'overrides'].map(n => p(`frozen/${n}.json`)), out: p('out') };
}
const withFixture = async fn => { const f = fixture(); try { return await fn(f); } finally { rmSync(f.dir, { recursive: true, force: true }); } };
const target = f => loadGenTargets(f.targetsPath)[0];
const readAll = dir => readdirSync(dir, { recursive: true }).filter(n => n.endsWith('.request.json')).map(n => [n, readFileSync(join(dir, n), 'utf8')]);

test('twist distribution: target passage own frozen file excluded; only twisted parts of FALSE choices; non-choice-link files skipped', () => withFixture(f => {
  const d = twistDistribution(PID, f.frozen);
  assert.deepEqual(d.sourcePassages, ['other-1', 'other-2']);
  assert.equal(d.totalTwistedParts, 4);
  assert.deepEqual(d.byType, [{ type: 'HOLDER_SWAP', count: 2, ratio: 0.5 }, { type: 'NEGATION', count: 2, ratio: 0.5 }]);
  assert.ok(!d.byType.some(x => x.type === 'SCOPE_EXTEND' || x.type === 'DEGREE'), 'own file and TRUE choices never counted');
  const other = twistDistribution('other-1', f.frozen);
  assert.deepEqual(other.sourcePassages, [PID, 'other-2']); assert.equal(other.excludedPassageId, 'other-1');
}));

test('twist distribution: real frozen files never include the target passage itself, per passage', () => {
  const files = frozenFiles(FROZEN_DIRS), ids = files.map(p => JSON.parse(readFileSync(p, 'utf8'))).filter(x => Array.isArray(x.questions)).map(x => x.passageId);
  for (const t of loadGenTargets()) {
    assert.ok(ids.includes(t.passageId), `${t.passageId} has a frozen file that must be left out`);
    const d = twistDistribution(t.passageId, files);
    assert.ok(!d.sourcePassages.includes(t.passageId)); assert.equal(d.sourcePassages.length, ids.length - 1);
  }
});

test('real targets.json: 4 passages, 10 slots, polarity/scope per handoff, realNumber only in the targets file', () => {
  const ts = loadGenTargets();
  assert.deepEqual(ts.map(t => [t.passageId, t.slots.map(s => `${s.realNumber}:${s.stemPolarity}:${s.scope}`)]), [
    ['corporate-law', ['10:SELECT_INCORRECT:PASSAGE_WIDE', '11:SELECT_CORRECT:CONCEPT', '12:SELECT_INCORRECT:CONCEPT']],
    ['surface-tension-laplace', ['14:SELECT_INCORRECT:PASSAGE_WIDE', '15:SELECT_CORRECT:CONCEPT']],
    ['audio-perceptual-coding', ['14:SELECT_INCORRECT:PASSAGE_WIDE', '15:SELECT_CORRECT:PASSAGE_WIDE', '16:SELECT_CORRECT:CONCEPT']],
    ['plastic-polymerization', ['8:SELECT_INCORRECT:PASSAGE_WIDE', '9:SELECT_INCORRECT:CONCEPT']]]);
  assert.equal(ts.reduce((a, t) => a + t.slots.length, 0), 10);
  for (const t of ts) assert.ok(!JSON.stringify(slotsOf(t)).includes('realNumber'));
});

test('generation requests carry no exam question text, exam number, or realNumber; real question files are not read', () => withFixture(async f => {
  const t = target(f);
  const inputs = [baselineInput(t), designInputB(t, twistDistribution(PID, f.frozen)), writeInput(t, exampleDesign('A2', t)), writeInput(t, exampleDesign('B', t))];
  for (const x of inputs) { const s = JSON.stringify(x); assert.ok(!/realNumber|4710|4711/u.test(s)); assert.ok(!s.includes(REAL_STEM) && !s.includes(REAL_CHOICE)); }
  assert.deepEqual(baselineInput(t).slots, [{ slot: 1, stemPolarity: 'SELECT_INCORRECT', scope: 'PASSAGE_WIDE' }, { slot: 2, stemPolarity: 'SELECT_CORRECT', scope: 'CONCEPT' }]);
  const r = await main({ dryRun: true, targetsPath: f.targetsPath, out: f.out, frozen: f.frozen });
  assert.equal(r.requests, 5);
  const files = readAll(f.out);
  assert.equal(files.length, 5);
  for (const [name, body] of files) { assert.ok(!/realNumber|4710|4711/u.test(body), name); assert.ok(!body.includes(REAL_STEM) && !body.includes(REAL_CHOICE), name); }
}));

test('A and A2 requests carry no map or twist list; B design carries both; instructions of A and A2 design never name a twist type', () => withFixture(async f => {
  await main({ dryRun: true, targetsPath: f.targetsPath, out: f.out, frozen: f.frozen });
  const read = (cond, stage) => JSON.parse(readFileSync(`${f.out}/dry-run/generation/${cond}/${PID}/${stage}.request.json`, 'utf8'));
  const userJson = req => JSON.parse(req.input[0].content[0].text);
  for (const [cond, stage] of [['A', 'items'], ['A2', 'design'], ['A2', 'items']]) {
    const req = read(cond, stage), input = userJson(req), s = JSON.stringify(req);
    for (const k of ['map', 'propositions', 'nodes', 'relations', 'stances', 'twistDistribution']) assert.ok(!(k in input), `${cond}/${stage} has ${k}`);
    assert.ok(!/twistDistribution|propositions|"relations"/u.test(s), `${cond}/${stage}`);
    for (const type of TWIST_TYPES) assert.ok(!req.instructions.includes(type), `${cond}/${stage} instructions name ${type}`);
  }
  assert.ok(!/설계표|비틂|twist/u.test(read('A', 'items').instructions), 'A instructions mention no design table or twist');
  const b = userJson(read('B', 'design'));
  assert.ok(b.map.propositions.length && b.map.relations[0].relationType === 'CAUSE' && b.stances.length && b.twistDistribution.byType.length);
  assert.deepEqual(b.twistDistribution.byType.map(x => x.type), ['HOLDER_SWAP', 'NEGATION'], 'own twists left out of the B input');
  assert.ok(!JSON.stringify(b.twistDistribution).includes('SCOPE_EXTEND'));
  for (const type of DESIGN_TWIST_TYPES) assert.ok(read('B', 'design').instructions.includes(`\`${type}\``), `B instructions list ${type}`);
  assert.ok(!read('B', 'design').instructions.includes('`OTHER`'));
  assert.ok(read('B', 'items').instructions === read('A2', 'items').instructions, 'write instructions are shared');
  assert.equal(read('A', 'items').model, 'gpt-6.1-sol'); assert.deepEqual(read('A', 'items').reasoning, { effort: 'medium' });
}));

test('instructions load from the prompt files; schemas are strict JSON schemas', () => {
  for (const p of Object.values(PROMPT_PATHS)) assert.ok(instructionsFrom(readFileSync(p, 'utf8')).length > 200, p);
  for (const s of Object.values(SCHEMAS)) assert.equal(s.json.type, 'object');
  const twistEnum = SCHEMAS.designB.json.properties.slots.items.properties.choices.items.properties.twist.anyOf.find(x => x.type === 'object').properties.type.enum;
  assert.deepEqual(twistEnum, DESIGN_TWIST_TYPES); assert.ok(!twistEnum.includes('OTHER')); assert.equal(twistEnum.length, 14);
});

test('example outputs parse and pass validation for A2, B, and items', () => withFixture(f => {
  const t = target(f), slots = slotsOf(t), paragraphs = t.passage.paragraphs.map(p => p.text);
  const a2 = SCHEMAS.designA2.zod.parse(exampleDesign('A2', t)), b = SCHEMAS.designB.zod.parse(exampleDesign('B', t));
  assert.deepEqual(validateDesign(a2, 'A2', slots, paragraphs), { allPass: true, violations: [], info: [] });
  assert.equal(validateDesign(b, 'B', slots, paragraphs, t.map).allPass, true);
  for (const d of [null, a2, b]) { const items = SCHEMAS.items.zod.parse(exampleItems(t, d)); assert.deepEqual(validateItems(items, slots, d).violations, []); }
  assert.deepEqual(a2.slots.map(s => s.answer), [3, 3]);
  assert.deepEqual(a2.slots[0].choices.map(c => c.truth), ['TRUE', 'TRUE', 'FALSE', 'TRUE', 'TRUE']);
  assert.deepEqual(a2.slots[1].choices.map(c => c.truth), ['FALSE', 'FALSE', 'TRUE', 'FALSE', 'FALSE']);
}));

test('design validation: polarity/answer, ids, passage substrings (whitespace-only passes with info), twist rules, repeats', () => withFixture(f => {
  const t = target(f), slots = slotsOf(t), paragraphs = t.passage.paragraphs.map(p => p.text);
  const run = (kind, mutate) => { const d = structuredClone(exampleDesign(kind, t)); mutate(d); return validateDesign(d, kind, slots, paragraphs, kind === 'B' ? t.map : null).violations.join(' | '); };
  assert.match(run('B', d => { d.slots[0].answer = 2; }), /slot 1: answer 2 != the FALSE choice 3/u);
  assert.match(run('B', d => { d.slots[0].choices[0].truth = 'FALSE'; d.slots[0].choices[0].twist = { type: 'NEGATION', targetIds: ['P1-1'], change: 'c' }; }), /slot 1: 2 choices with truth FALSE/u);
  assert.match(run('B', d => { d.slots[1].choices[0].truth = 'TRUE'; }), /slot 2: 2 choices with truth TRUE/u);
  assert.match(run('B', d => { d.slots[0].choices[0].basis = ['X9']; }), /basis id X9 not in map/u);
  assert.match(run('B', d => { d.slots[1].choices[0].twist.targetIds = ['ZZ']; }), /twist target id ZZ not in map/u);
  assert.match(run('B', d => { d.slots[1].choices[0].twist.targetIds = []; }), /empty twist targetIds/u);
  assert.match(run('B', d => { d.slots[1].choices.forEach(c => { if (c.twist) c.twist.type = 'NEGATION'; }); }), /twist type NEGATION used 4 times/u);
  assert.match(run('B', d => { d.slots[0].choices[2].twist = null; }), /FALSE choice without twist/u);
  assert.match(run('B', d => { d.slots[0].choices[0].twist = { type: 'NEGATION', targetIds: ['P1-1'], change: 'c' }; }), /TRUE choice with twist/u);
  assert.match(run('B', d => { d.slots[0].concept = '개념'; }), /concept set with scope PASSAGE_WIDE/u);
  assert.match(run('B', d => { d.slots[1].concept = null; }), /concept null with scope CONCEPT/u);
  assert.match(run('B', d => { d.slots[0].choices[0].basis = []; }), /empty basis/u);
  assert.match(run('B', d => { d.slots.pop(); }), /slots 1 != 1,2/u);
  assert.match(run('A2', d => { d.slots[0].choices[0].basis = ['없는 구절입니다']; }), /basis\[0\]: not in passage/u);
  assert.match(run('A2', d => { d.slots[1].choices[0].twist.targetQuote = '가짜 인용'; }), /targetQuote: not in passage/u);
  const spaced = structuredClone(exampleDesign('A2', t)); spaced.slots[0].choices[0].basis = ['첫째  문단이다.   법인은'];
  const v = validateDesign(spaced, 'A2', slots, paragraphs);
  assert.equal(v.allPass, true); assert.match(v.info.join(), /basis\[0\]: matches ignoring whitespace/u);
}));

test('items validation: polarity text, answer vs design, concept in stem, circled symbols, duplicate choice text, numbers', () => withFixture(f => {
  const t = target(f), slots = slotsOf(t), design = exampleDesign('B', t);
  const run = (mutate, d = design) => { const it = structuredClone(exampleItems(t, design)); mutate(it); return validateItems(it, slots, d).violations.join(' | '); };
  assert.match(run(it => { it.items[0].stem = '윗글에 대한 이해로 적절한 것은?'; }), /slot 1: stem text polarity SELECT_CORRECT != SELECT_INCORRECT/u);
  assert.match(run(it => { it.items[0].stemPolarity = 'SELECT_CORRECT'; }), /slot 1: stemPolarity SELECT_CORRECT/u);
  assert.match(run(it => { it.items[0].answer = 4; }), /answer 4 != design answer 3/u);
  assert.match(run(it => { it.items[1].stem = '다른 개념에 대한 이해로 적절한 것은?'; }), /stem does not name concept "예시 개념"/u);
  assert.match(run(it => { it.items[0].choices[0].text = '㉠은 ㉡과 다르다.'; }), /circled symbol/u);
  assert.match(run(it => { it.items[0].stem = '㉠에 대한 이해로 적절하지 않은 것은?'; }), /circled symbol/u);
  assert.match(run(it => { it.items[1].choices[4].text = it.items[0].choices[0].text.replace(/\s/gu, ''); }), /same text as slot 1#1/u);
  assert.match(run(it => { it.items[0].choices.pop(); }), /choice numbers 1,2,3,4/u);
  assert.match(run(it => { it.items[0].answer = 6; }), /answer 6 out of range/u);
  assert.match(run(it => { it.items[0].choices[2].text = ' '; }), /empty text/u);
  assert.equal(validateItems(exampleItems(t), slots, null).allPass, true);
  assert.match(run(it => { it.items.pop(); }), /slots 1 != 1,2/u);
}));

// Fake transport: design requests get the example design of their kind, item requests the example items (using the design carried in the request).
const fakeTransport = (t, { failDesign = null, calls = [] } = {}) => ({ calls, async create(request) {
  const name = request.text.format.name, input = JSON.parse(request.input[0].content[0].text);
  calls.push(name);
  let body;
  if (name === SCHEMAS.designA2.name) body = failDesign === 'A2' ? { broken: true } : exampleDesign('A2', t);
  else if (name === SCHEMAS.designB.name) body = failDesign === 'B' ? { broken: true } : exampleDesign('B', t);
  else body = exampleItems(t, input.design ?? null);
  return { id: `r${calls.length}`, model: 'gpt-6.1-sol', status: 'completed', output_text: JSON.stringify(body), usage: { input_tokens: 1000, output_tokens: 500 } };
} });

test('full run with a fake transport: 5 requests, files per condition, RUN and ledger, protected files unchanged, RUN_EXISTS', () => withFixture(async f => {
  const t = target(f), transport = fakeTransport(t);
  const r = await main({ targetsPath: f.targetsPath, out: f.out, frozen: f.frozen, transport, limits: { maxRequests: 20, usdCap: 5 } });
  assert.equal(r.requests, 5); assert.equal(r.stop, null); assert.equal(r.protectedFilesUnchanged, true);
  assert.deepEqual(transport.calls, [SCHEMAS.items.name, SCHEMAS.designA2.name, SCHEMAS.items.name, SCHEMAS.designB.name, SCHEMAS.items.name]);
  const base = `${f.out}/runs`;
  for (const cond of ['A', 'A2', 'B']) for (const file of ['items.json', 'items.raw.json', 'items.validation.json', ...(cond === 'A' ? [] : ['design.json', 'design.raw.json', 'design.validation.json'])])
    assert.ok(existsSync(`${base}/${cond}/${PID}/${file}`), `${cond}/${file}`);
  assert.ok(!existsSync(`${base}/A/${PID}/design.json`));
  for (const cond of ['A', 'A2', 'B']) assert.equal(JSON.parse(readFileSync(`${base}/${cond}/${PID}/items.validation.json`, 'utf8')).validation.allPass, true);
  const run = JSON.parse(readFileSync(`${base}/RUN.json`, 'utf8'));
  assert.equal(run.model, 'gpt-6.1-sol'); assert.equal(run.requests, 5); assert.equal(run.retries, 0);
  assert.deepEqual(Object.keys(run.instructionsHashes), ['A', 'DESIGN_A2', 'DESIGN_B', 'WRITE']); assert.ok(run.inputHashes[`B/${PID}`]);
  const ledger = readFileSync(`${base}/ledger.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(x => x.event === 'START').length, 5); assert.equal(ledger.filter(x => x.event === 'END').length, 5);
  assert.ok(Math.abs(r.totalCostUsd - 5 * (1000 * 2 + 500 * 10) / 1e6) < 1e-9);
  await assert.rejects(() => main({ targetsPath: f.targetsPath, out: f.out, frozen: f.frozen, transport }), /RUN_EXISTS/u);
}));

test('a design that does not parse stops that condition (no write request); limits stop the run; the design is passed to the write request', () => withFixture(async f => {
  const t = target(f), transport = fakeTransport(t, { failDesign: 'B' });
  const r = await main({ targetsPath: f.targetsPath, out: f.out, frozen: f.frozen, transport });
  assert.equal(r.requests, 4); assert.deepEqual(r.outcomes.find(o => o.condition === 'B').requestStatus, 'FORMAT_ERROR');
  assert.ok(!existsSync(`${f.out}/runs/B/${PID}/items.raw.json`));
  const written = JSON.parse(readFileSync(`${f.out}/runs/A2/${PID}/items.json`, 'utf8')); assert.equal(written.items.length, 2);
  const f2 = fixture();
  try {
    const t2 = target(f2), r2 = await main({ targetsPath: f2.targetsPath, out: f2.out, frozen: f2.frozen, transport: fakeTransport(t2), limits: { maxRequests: 2, usdCap: 5 } });
    assert.equal(r2.requests, 2); assert.equal(r2.stop, 'RUN_LIMIT: max requests');
    const f3 = fixture();
    try { const r3 = await main({ targetsPath: f3.targetsPath, out: f3.out, frozen: f3.frozen, transport: fakeTransport(target(f3)), limits: { maxRequests: 20, usdCap: 0.1 } });
      assert.equal(r3.requests, 0); assert.equal(r3.stop, 'RUN_LIMIT: usd cap'); } finally { rmSync(f3.dir, { recursive: true, force: true }); }
  } finally { rmSync(f2.dir, { recursive: true, force: true }); }
}));

test('dry-run on the real targets: 20 requests (A 4, A2 8, B 8), no transport, inputs written, under the default cap', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'itemgen-real-'));
  try {
    const r = await main({ dryRun: true, out: dir });
    assert.equal(r.requests, 20); assert.equal(r.externalRequests, 0); assert.equal(r.overCap, false); assert.equal(r.overMaxRequests, false);
    assert.equal(r.rows.filter(x => x.condition === 'A').length, 4); assert.equal(r.rows.filter(x => x.condition === 'A2').length, 8); assert.equal(r.rows.filter(x => x.condition === 'B').length, 8);
    assert.equal(readdirSync(`${dir}/inputs`).length, 4);
    for (const [name, body] of readAll(dir)) assert.ok(!/realNumber/u.test(body), name);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('B write input resolves map ids to text and twist type names; A2 passes design unchanged', () => {
  const map = { propositions: [{ id: 'P1-1', text: '명제 하나' }], nodes: [{ id: 'C1-1', text: '묶음 하나' }], relations: [] };
  const design = { slots: [{ slot: 1, stemPolarity: 'SELECT_CORRECT', scope: 'PASSAGE_WIDE', concept: null, answer: 1, choices: [
    { number: 1, truth: 'TRUE', basis: ['P1-1'], twist: null },
    { number: 2, truth: 'FALSE', basis: ['C1-1'], twist: { type: 'NEGATION', targetIds: ['P1-1', 'NOPE'], change: '뒤집음' } }] }] };
  const t = { passage: { passageId: 'x', paragraphs: [{ paragraphId: 'x-p1', text: '명제 하나.' }] }, map };
  const b = writeInput(t, design, 'B').design.slots[0].choices;
  assert.deepEqual(b[0].basis, [{ id: 'P1-1', text: '명제 하나' }]);
  assert.equal(b[1].twist.typeName, '긍정·부정 뒤집기');
  assert.deepEqual(b[1].twist.targets, [{ id: 'P1-1', text: '명제 하나' }, { id: 'NOPE', text: null }]);
  assert.equal('targetIds' in b[1].twist, false);
  assert.deepEqual(writeInput(t, design, 'A2').design, { slots: design.slots });
});
