import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPassage } from './run-analysis-map-gongsun.mjs';
import { buildInput, buildRequest, validateClassification, exampleClassification, main, summarize, renderReport, TYPES, OutputSchema, LIMITS } from './run-relation-classify.mjs';

const { passage } = loadPassage();
const map = {
  passageId: passage.passageId,
  propositions: [
    { id: 'P1-1', paragraphId: passage.paragraphs[0].paragraphId, text: '첫 명제', sourceQuote: 'q', role: 'r' },
    { id: 'P2-1', paragraphId: passage.paragraphs[1].paragraphId, text: '둘째 명제', sourceQuote: 'q', role: 'r' },
  ],
  nodes: [{ id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: passage.paragraphs[0].paragraphId, text: '요지1', childIds: ['P1-1'] },
    { id: 'TOP', kind: 'TOP', paragraphId: null, text: '최상위', childIds: ['G1'] }],
  relations: [{ id: 'R1', fromId: 'P2-1', toId: 'P1-1', name: '비밀이름', note: '메모' }, { id: 'R2', fromId: 'G1', toId: 'TOP', name: '다른이름', note: '' }],
};
const item = (r, id) => r.items.find(i => i.id === id);
const base = () => exampleClassification(map);

test('input: no relation name, from/to text and kind filled, order preserved, section rule', () => {
  const input = buildInput(passage, map);
  assert.deepEqual(Object.keys(input), ['passageId', 'paragraphs', 'relations']);
  assert.deepEqual(input.relations.map(r => r.id), ['R1', 'R2']);
  assert.deepEqual(input.relations[0], { id: 'R1', from: { id: 'P2-1', kind: 'PROPOSITION', paragraphId: passage.paragraphs[1].paragraphId, text: '둘째 명제' },
    to: { id: 'P1-1', kind: 'PROPOSITION', paragraphId: passage.paragraphs[0].paragraphId, text: '첫 명제' }, note: '메모' });
  assert.equal(input.relations[1].to.kind, 'TOP'); assert.equal(input.relations[1].to.paragraphId, null);
  assert.ok(!JSON.stringify(buildRequest('x', input)).includes('비밀이름'));
  const sec = structuredClone(passage); sec.paragraphs[0].section = '(가)';
  const p = buildInput(sec, map).paragraphs;
  assert.deepEqual(Object.keys(p[0]), ['paragraphId', 'index', 'section', 'text']);
  assert.deepEqual(Object.keys(p[1]), ['paragraphId', 'index', 'text']);
});
test('request: model, medium effort, strict schema with 20 types', () => {
  const req = buildRequest('x', buildInput(passage, map));
  assert.equal(req.model, 'gpt-6.1-sol'); assert.equal(req.reasoning.effort, 'medium'); assert.equal(req.text.format.strict, true);
  assert.equal(TYPES.length, 20);
  assert.doesNotThrow(() => OutputSchema.parse(base()));
});
test('validation: missing, duplicate, unknown id, otherName rule, passageId', () => {
  assert.equal(validateClassification(base(), map).allPass, true);
  const miss = base(); miss.items.pop();
  assert.equal(item(validateClassification(miss, map), 1).pass, false);
  const dup = base(); dup.items[1].id = 'R1';
  const d = item(validateClassification(dup, map), 1); assert.equal(d.pass, false); assert.equal(d.violations.length, 2);
  const unk = base(); unk.items[0].id = 'R9';
  assert.equal(item(validateClassification(unk, map), 1).pass, false);
  const o1 = base(); Object.assign(o1.items[0], { type: 'OTHER', otherName: '' });
  assert.equal(item(validateClassification(o1, map), 3).pass, false);
  const o2 = base(); o2.items[0].otherName = '이름';
  assert.equal(item(validateClassification(o2, map), 3).pass, false);
  const o3 = base(); Object.assign(o3.items[0], { type: 'OTHER', otherName: '이름' });
  assert.equal(validateClassification(o3, map).allPass, true);
  const pid = base(); pid.passageId = 'x';
  assert.equal(item(validateClassification(pid, map), 2).pass, false);
});

const IDS = ['gongsun-long-later-mohists', 'dopamine-motor-control', 'corporate-law'];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'relcls-'));
  const targetsPath = join(dir, 'targets.json'), passagesDir = 'packages/pipeline/fixtures/experiments/dialogue/passages';
  writeFileSync(targetsPath, JSON.stringify(IDS.map(passageId => {
    const mapPath = join(dir, `${passageId}.map.json`);
    writeFileSync(mapPath, JSON.stringify({ ...map, passageId }));
    return { passageId, passagesDir, mapPath };
  })));
  return { dir, targetsPath };
}
const fakeTransport = (types = ['CAUSE', 'OTHER'], usage = { input_tokens: 1000, output_tokens: 500 }) => ({ calls: 0, async create(req) {
  this.calls++;
  const items = [{ id: 'R1', type: types[0], otherName: '', reason: '이유' }, { id: 'R2', type: types[1], otherName: types[1] === 'OTHER' ? '새 이름' : '', reason: '이유' }];
  return { id: 'resp', model: 'm', status: 'completed', usage, output: [], output_text: JSON.stringify({ passageId: req.input[0].content[0].text ? JSON.parse(req.input[0].content[0].text).passageId : '', items }) };
} });

test('full flow with fake transport writes artifacts and report; RUN_EXISTS on rerun', async () => {
  const { dir, targetsPath } = fixture();
  try {
    const t = fakeTransport(), out = join(dir, 'out');
    const r = await main({ targetsPath, out, transport: t });
    assert.equal(t.calls, 3); assert.equal(r.requests, 3); assert.equal(r.promptUnchanged, true); assert.equal(r.protectedFilesUnchanged, true);
    assert.ok(Math.abs(r.totalCostUsd - 3 * (1000 * 2 + 500 * 10) / 1e6) < 1e-12);
    assert.deepEqual(r.results.map(x => [x.validationAllPass, x.other]), [[true, 1], [true, 1], [true, 1]]);
    const pdir = join(out, IDS[0]);
    for (const f of ['classify.raw.json', 'classify.json', 'classify.validation.json']) assert.ok(existsSync(join(pdir, f)), f);
    for (const f of ['ledger.jsonl', 'RUN.json', 'REPORT.md', 'summary.json']) assert.ok(existsSync(join(out, f)), f);
    const report = readFileSync(join(out, 'REPORT.md'), 'utf8');
    assert.ok(report.includes('비밀이름') && report.includes('새 이름') && report.includes('인과·작용'));
    assert.equal(JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8')).other, 3);
    await assert.rejects(main({ targetsPath, out, transport: fakeTransport() }), /RUN_EXISTS/);
    const dupPath = join(dir, 'dup.json'), ts = JSON.parse(readFileSync(targetsPath, 'utf8'));
    writeFileSync(dupPath, JSON.stringify([ts[0], ts[0]]));
    await assert.rejects(main({ targetsPath: dupPath, out: join(dir, 'o3'), transport: fakeTransport() }), /DUPLICATE_TARGET/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('usd cap stops before sending a request that would reach the cap', async () => {
  const { dir, targetsPath } = fixture();
  try {
    const t = fakeTransport(['CAUSE', 'OTHER'], { input_tokens: 0, output_tokens: 10000 }), out = join(dir, 'out');
    const dry = await main({ dryRun: true, targetsPath, out: join(dir, 'dry') });
    const cap = Math.max(...dry.perPassage.map(p => p.reserveUsd)) + 0.05;
    const r = await main({ targetsPath, out, transport: t, limits: { maxRequests: 16, usdCap: cap } });
    assert.equal(t.calls, 1); assert.match(r.stop, /usd cap/);
    assert.deepEqual(r.results.map(x => x.requestStatus), ['PARSED', 'NOT_SENT', 'NOT_SENT']);
    const r2 = await main({ targetsPath, out: join(dir, 'out2'), transport: fakeTransport(), limits: { maxRequests: 2, usdCap: 2 } });
    assert.equal(r2.requests, 2); assert.match(r2.stop, /max requests/);
    assert.equal(LIMITS.maxRequests, 16); assert.equal(LIMITS.usdCap, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('dry-run sends nothing and reports per-passage relations and reserve', async () => {
  const { dir, targetsPath } = fixture();
  try {
    const r = await main({ dryRun: true, targetsPath, out: join(dir, 'dry'), transport: { create() { throw new Error('must not call'); } } });
    assert.equal(r.externalRequests, 0); assert.equal(r.exampleAllPass, true); assert.equal(r.perPassage[0].relations, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('summarize and report handle a missing classification', () => {
  const ok = { passageId: 'a', map, passage, classification: base() }, bad = { passageId: 'b', map, passage, classification: null };
  const s = summarize([ok, bad]);
  assert.equal(s.relations, 2); assert.equal(s.perPassage.length, 1); assert.equal(s.topNames[0].total, 1);
  assert.ok(renderReport([ok, bad], s).includes('분류 결과 없음'));
});

test('key: same passageId twice splits folders by key, duplicate check by key, keyless request body unchanged', async () => {
  const { dir, targetsPath } = fixture();
  try {
    const ts = JSON.parse(readFileSync(targetsPath, 'utf8')), t0 = ts[0];
    const keyed = join(dir, 'keyed.json');
    writeFileSync(keyed, JSON.stringify([{ ...t0, key: `${t0.passageId}-r1` }, { ...t0, key: `${t0.passageId}-r2` }]));
    const out = join(dir, 'kout'), tr = fakeTransport();
    const r = await main({ targetsPath: keyed, out, transport: tr });
    assert.equal(tr.calls, 2); assert.deepEqual(r.results.map(x => x.key), [`${t0.passageId}-r1`, `${t0.passageId}-r2`]);
    for (const k of ['r1', 'r2']) assert.ok(existsSync(join(out, `${t0.passageId}-${k}`, 'classify.json')));
    const run = JSON.parse(readFileSync(join(out, 'RUN.json'), 'utf8'));
    assert.deepEqual(Object.keys(run.inputs), [`${t0.passageId}-r1`, `${t0.passageId}-r2`]); assert.equal(run.inputs[`${t0.passageId}-r1`].passageId, t0.passageId);
    const sum = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'));
    assert.deepEqual(sum.perPassage.map(p => [p.key, p.passageId]), [[`${t0.passageId}-r1`, t0.passageId], [`${t0.passageId}-r2`, t0.passageId]]);
    const dup = join(dir, 'dupkey.json');
    writeFileSync(dup, JSON.stringify([{ ...t0, key: 'k' }, { ...t0, key: 'k' }]));
    await assert.rejects(main({ targetsPath: dup, out: join(dir, 'o4'), transport: fakeTransport() }), /DUPLICATE_TARGET/);
    // keyless: request body equals the one built directly from the passage and map
    const dry = join(dir, 'drykeyless');
    await main({ dryRun: true, targetsPath, out: dry });
    const { passage: p0 } = loadPassage(t0.passagesDir, t0.passageId);
    const instructions = (await import('./run-analysis-map-gongsun.mjs')).instructionsFrom(readFileSync('docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT.md', 'utf8'));
    const expected = JSON.stringify(buildRequest(instructions, buildInput(p0, JSON.parse(readFileSync(t0.mapPath, 'utf8')))), null, 2) + '\n';
    assert.equal(readFileSync(join(dry, t0.passageId, 'dry-run.request.json'), 'utf8'), expected);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
