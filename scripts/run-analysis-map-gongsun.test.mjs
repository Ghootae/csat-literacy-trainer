import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPassage, buildInput, buildRequest, instructionsFrom, PROMPT_PATH, validateMap, exampleMap, splitSentences,
  limitCheck, reserveUsd, usageCost, OutputSchema, JSON_SCHEMA, LIMITS } from './run-analysis-map-gongsun.mjs';

const { passage } = loadPassage();
const clone = o => structuredClone(o);
const base = () => exampleMap(passage);
const item = (r, id) => r.items.find(i => i.id === id);

test('source has 5 paragraphs and example map passes all six checks', () => {
  assert.equal(passage.paragraphs.length, 5);
  const r = validateMap(base(), passage);
  assert.equal(r.allPass, true, JSON.stringify(r.items.filter(i => !i.pass)));
  assert.doesNotThrow(() => OutputSchema.parse(base()));
});
test('1 sourceQuote: exact substring; whitespace-only difference is flagged separately', () => {
  const m = base(); m.propositions[0].sourceQuote = m.propositions[0].sourceQuote.replace(' ', '  ');
  const i = item(validateMap(m, passage), 1);
  assert.equal(i.pass, false);
  assert.deepEqual(i.matchesAfterWhitespaceNormalization, ['P1-1']);
  const m2 = base(); m2.propositions[0].sourceQuote = '없는 구절';
  const j = item(validateMap(m2, passage), 1);
  assert.equal(j.pass, false); assert.deepEqual(j.matchesAfterWhitespaceNormalization, []);
});
test('2 sentence coverage: dropping a proposition leaves a sentence uncovered', () => {
  const m = base(); const drop = m.propositions.findIndex(p => p.id === 'P2-2');
  const [removed] = m.propositions.splice(drop, 1);
  m.nodes.find(n => n.id === 'G2').childIds = m.nodes.find(n => n.id === 'G2').childIds.filter(c => c !== removed.id);
  assert.equal(item(validateMap(m, passage), 2).pass, false);
});
test('splitSentences does not split inside a quoted terminator', () => {
  const s = splitSentences('그는 ‘흰 말은 말이 아니다.’라는 주장을 폈다. 다음 문장이다?');
  assert.equal(s.length, 2);
});
test('3 tree: second parent, cycle, and missing parent fail', () => {
  const two = base(); two.nodes.find(n => n.id === 'G2').childIds.push('P1-1');
  assert.equal(item(validateMap(two, passage), 3).pass, false);
  const cyc = base(); cyc.nodes.find(n => n.id === 'G1').childIds.push('TOP');
  assert.equal(item(validateMap(cyc, passage), 3).pass, false);
  const orphan = base(); orphan.nodes.find(n => n.id === 'G1').childIds.pop();
  assert.equal(item(validateMap(orphan, passage), 3).pass, false);
  const twoTops = base(); twoTops.nodes.push({ id: 'TOP', kind: 'TOP', paragraphId: null, text: 'x', childIds: ['G1', 'G2'] });
  assert.equal(item(validateMap(twoTops, passage), 3).pass, false);
});
test('4 paragraph gist: missing gist and misplaced proposition fail', () => {
  const none = base(); none.nodes = none.nodes.filter(n => n.id !== 'G3'); none.nodes.find(n => n.id === 'TOP').childIds = ['G1', 'G2', 'G4', 'G5'];
  assert.equal(item(validateMap(none, passage), 4).pass, false);
  const moved = base(); const g1 = moved.nodes.find(n => n.id === 'G1'), g2 = moved.nodes.find(n => n.id === 'G2');
  g2.childIds.push(g1.childIds.pop());
  assert.equal(item(validateMap(moved, passage), 4).pass, false);
});
test('5 composite needs two or more children', () => {
  const m = base(); m.nodes.find(n => n.id === 'G1').childIds = ['P1-1'];
  assert.equal(item(validateMap(m, passage), 5).pass, false);
});
test('6 id format and references', () => {
  const badId = base(); badId.propositions[0].id = 'X-1';
  assert.equal(item(validateMap(badId, passage), 6).pass, false);
  const dangling = base(); dangling.relations[0].toId = 'P9-9';
  assert.equal(item(validateMap(dangling, passage), 6).pass, false);
  const wrongNum = base(); wrongNum.propositions[0].id = 'P2-9';
  assert.equal(item(validateMap(wrongNum, passage), 6).pass, false);
});
test('limits: 3 requests and 2 USD, unknown cost handled by reservation', () => {
  assert.equal(limitCheck({ requests: 2, spentUsd: 0, reserved: 0.4 }), null);
  assert.match(limitCheck({ requests: 3, spentUsd: 0, reserved: 0.1 }), /max requests/);
  assert.match(limitCheck({ requests: 1, spentUsd: 1.7, reserved: 0.4 }), /usd cap/);
  assert.equal(usageCost({ input_tokens: 1e6, output_tokens: 1e6 }), 12);
  assert.equal(usageCost(null), null);
  assert.equal(LIMITS.maxRequests, 3);
  const req = buildRequest(instructionsFrom(readFileSync(PROMPT_PATH, 'utf8')), buildInput(passage));
  assert.ok(reserveUsd(req) * 3 < LIMITS.usdCap, 'worst-case reservation for three requests fits under cap');
});
test('request body carries only passage id and paragraph text; no gold, axes, or student data', () => {
  const input = buildInput(passage);
  assert.deepEqual(Object.keys(input), ['passageId', 'paragraphs']);
  for (const p of input.paragraphs) assert.deepEqual(Object.keys(p), ['paragraphId', 'index', 'text']);
  const req = buildRequest(instructionsFrom(readFileSync(PROMPT_PATH, 'utf8')), input);
  const body = JSON.stringify(req);
  for (const word of ['goldPath', 'candidateGoldPath', 'centralAxes', 'centralStory', 'student', 'answer', 'rationale']) assert.ok(!body.includes(word), word);
  assert.equal(req.model, 'gpt-6.1-sol'); assert.equal(req.text.format.strict, true);
  assert.ok(JSON_SCHEMA.properties.nodes);
});
test('instructions start at the heading section body, not the preamble mention', () => {
  const ins = instructionsFrom(readFileSync(PROMPT_PATH, 'utf8'));
  assert.ok(ins.startsWith('너는 수능 국어'));
  assert.ok(!ins.includes('아래 `## 지시문` 절'));
});
