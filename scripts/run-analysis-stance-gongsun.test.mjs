import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPassage, instructionsFrom } from './run-analysis-map-gongsun.mjs';
import { buildInput, buildRequest, validateStances, deriveNodeStances, exampleStances, OutputSchema, MAP_PATH, PROMPT_PATH } from './run-analysis-stance-gongsun.mjs';

const { passage } = loadPassage();
const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const base = () => exampleStances(map);
const item = (r, id) => r.items.find(i => i.id === id);

test('example passes all checks and the schema', () => {
  const r = validateStances(base(), map, passage);
  assert.equal(r.allPass, true, JSON.stringify(r.items.filter(i => !i.pass)));
  assert.deepEqual(r.holders, []);
  assert.doesNotThrow(() => OutputSchema.parse(base()));
});
test('1 id set: missing, duplicate and unknown ids fail', () => {
  const miss = base(); miss.stances.pop();
  assert.equal(item(validateStances(miss, map, passage), 1).pass, false);
  const dup = base(); dup.stances.push({ ...dup.stances[0] });
  assert.equal(item(validateStances(dup, map, passage), 1).pass, false);
  const unk = base(); unk.stances[0].id = 'P9-9';
  assert.equal(item(validateStances(unk, map, passage), 1).pass, false);
});
test('2 kind/holder: FIGURE needs a holder found in the passage; others need null', () => {
  const ok = base(); Object.assign(ok.stances[0], { kind: 'FIGURE', holder: '공손룡' });
  const r = validateStances(ok, map, passage);
  assert.equal(item(r, 2).pass, true); assert.deepEqual(r.holders, ['공손룡']);
  const none = base(); Object.assign(none.stances[0], { kind: 'FIGURE', holder: null });
  assert.equal(item(validateStances(none, map, passage), 2).pass, false);
  const invented = base(); Object.assign(invented.stances[0], { kind: 'FIGURE', holder: '없는사람' });
  assert.equal(item(validateStances(invented, map, passage), 2).pass, false);
  const author = base(); author.stances[0].holder = '공손룡';
  assert.equal(item(validateStances(author, map, passage), 2).pass, false);
});
test('3 evidence: exact substring; whitespace-only difference flagged separately', () => {
  const m = base(); const q = m.stances[0].evidence; m.stances[0].evidence = q.replace(' ', '  ');
  const i = item(validateStances(m, map, passage), 3);
  assert.equal(i.pass, false); assert.deepEqual(i.matchesAfterWhitespaceNormalization, ['P1-1']);
  const bad = base(); bad.stances[0].evidence = '없는 구절';
  const j = item(validateStances(bad, map, passage), 3);
  assert.equal(j.pass, false); assert.deepEqual(j.matchesAfterWhitespaceNormalization, []);
});
test('node stances: uniform below -> that value; mixed -> MIXED with parts', () => {
  const s = base();
  const ns = deriveNodeStances(map, s.stances);
  assert.deepEqual(ns.TOP, { kind: 'AUTHOR', holder: null });
  Object.assign(s.stances[0], { kind: 'FIGURE', holder: '공손룡' });
  const ns2 = deriveNodeStances(map, s.stances);
  assert.equal(ns2.TOP.kind, 'MIXED');
  assert.deepEqual(ns2.TOP.parts.map(p => p.count).reduce((a, b) => a + b), map.propositions.length);
  assert.ok(ns2.TOP.parts.some(p => p.kind === 'FIGURE' && p.holder === '공손룡' && p.count === 1));
  const ns3 = deriveNodeStances(map, s.stances.map(x => ({ ...x, kind: 'FIGURE', holder: '공손룡' })));
  assert.deepEqual(ns3.TOP, { kind: 'FIGURE', holder: '공손룡' });
});
test('dry-run request has propositions and paragraphs only (no nodes, relations, students)', () => {
  const instructions = instructionsFrom(readFileSync(PROMPT_PATH, 'utf8'));
  const input = buildInput(passage, map), req = buildRequest(instructions, input);
  assert.deepEqual(Object.keys(input), ['passageId', 'paragraphs', 'propositions']);
  assert.deepEqual(Object.keys(input.propositions[0]), ['id', 'paragraphId', 'text', 'sourceQuote']);
  assert.equal(input.propositions.length, 55);
  const body = JSON.stringify(req);
  for (const w of ['childIds', 'relations', 'PARAGRAPH_GIST', 'studentResponse', 'student']) assert.ok(!body.includes(w), w);
  assert.equal(req.model, 'gpt-6.1-sol'); assert.equal(req.reasoning.effort, 'medium'); assert.equal(req.max_output_tokens, 16000);
  assert.equal(req.text.format.strict, true);
});
