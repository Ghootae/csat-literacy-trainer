import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nodeMasks, iou, compareRuns } from './measure-map-run-agreement.mjs';

const paragraphs = [{ paragraphId: 'p1', text: '가는 나다. 다는 라다.' }, { paragraphId: 'p2', text: '마는 바다.' }];
const prop = (id, paragraphId, q) => ({ id, paragraphId, text: q, sourceQuote: q, role: '' });

const mapA = {
  propositions: [prop('P1', 'p1', '가는 나다.'), prop('P2', 'p1', '다는 라다.'), prop('P3', 'p2', '마는 바다.')],
  nodes: [{ id: 'C1', kind: 'COMPOSITE', childIds: ['P1', 'P2'] }],
  relations: [{ id: 'R1', fromId: 'P1', toId: 'P2' }, { id: 'R2', fromId: 'C1', toId: 'P3' }],
};
// Same spans, different ids; R1 kept, R2 dropped; P1 split into three props.
const mapB = {
  propositions: [prop('Q1', 'p1', '가는'), prop('Q1b', 'p1', '나'), prop('Q1c', 'p1', '다.'), prop('Q2', 'p1', '다는 라다.'), prop('Q3', 'p2', '마는 바다.')],
  nodes: [{ id: 'D1', kind: 'COMPOSITE', childIds: ['Q1', 'Q1b', 'Q1c'] }, { id: 'D2', kind: 'COMPOSITE', childIds: ['D1', 'Q2'] }],
  relations: [{ id: 'S1', fromId: 'D1', toId: 'Q2' }],
};

test('node masks cover descendant spans', () => {
  const { nodes, unlocated } = nodeMasks(mapA, paragraphs);
  assert.deepEqual(unlocated, []);
  assert.equal(iou(nodes.get('C1').mask, nodes.get('P1').mask) > 0, true);
  assert.equal(nodes.get('C1').mask.reduce((a, b) => a + b, 0), '가는 나다.'.length + '다는 라다.'.length);
});

test('whitespace-tolerant sourceQuote location', () => {
  const m = { propositions: [prop('P1', 'p1', '가는  나다.')], nodes: [], relations: [] };
  assert.deepEqual(nodeMasks(m, paragraphs).unlocated, []);
});

test('compareRuns: node agreement, loose relation match, relation type, twist targets', () => {
  const r = compareRuns(mapA, mapB, paragraphs, { twistTargets: ['P1', 'P3', 'NOPE'], typesA: { R1: 'CAUSE' }, typesB: { S1: 'GROUNDS' } });
  assert.equal(r.nodeAgreement[0.5], 1); // P1 matches D1 exactly (any kind)
  assert.equal(r.sameKindAgreement[0.5] < 1, true); // P1 has no same-kind PROP match >= 0.5
  assert.equal(r.relationLoose, 0.5); // R1 kept via D1->Q2, R2 dropped
  assert.deepEqual(r.relationType, { n: 1, same: 0, diffs: ['CAUSE/GROUNDS'] });
  assert.equal(r.twistTargets.n, 2);
  assert.equal(r.twistTargets.missingInA, 1);
  assert.equal(r.twistTargets.preserved, 1);
});
