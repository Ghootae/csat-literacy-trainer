import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nodeMasks } from './measure-map-run-agreement.mjs';
import { classifyMismatch, containment } from './classify-relation-mismatch.mjs';

const paragraphs = [{ paragraphId: 'p1', text: '가가가가. 나나나나. 다다다다. 라라라라.' }];
const prop = (id, q) => ({ id, paragraphId: 'p1', text: q, sourceQuote: q, role: '' });
const props = [prop('P1', '가가가가.'), prop('P2', '나나나나.'), prop('P3', '다다다다.'), prop('P4', '라라라라.')];
const A = { propositions: props, nodes: [], relations: [{ id: 'R1', fromId: 'P1', toId: 'P2' }] };
const masksA = nodeMasks(A, paragraphs).nodes;
const run = (nodes, relations) => { const m = { propositions: props, nodes, relations }; return [m, nodeMasks(m, paragraphs).nodes]; };
const cls = (nodes, relations) => { const [m, n] = run(nodes, relations); return classifyMismatch(A.relations[0], masksA, m, n).cls; };

test('containment', () => {
  assert.equal(containment(Uint8Array.from([1, 1, 0]), Uint8Array.from([1, 1, 1])), 1);
});

test('classes', () => {
  assert.equal(cls([], [{ id: 'S', fromId: 'P1', toId: 'P2' }]), 'REPRODUCED');
  assert.equal(cls([], [{ id: 'S', fromId: 'P2', toId: 'P1' }]), 'REVERSED');
  const big = [{ id: 'C', kind: 'COMPOSITE', childIds: ['P2', 'P3', 'P4'] }];
  assert.equal(cls(big, [{ id: 'S', fromId: 'P1', toId: 'C' }]), 'GRANULARITY');
  assert.equal(cls(big, [{ id: 'S', fromId: 'C', toId: 'P1' }]), 'GRANULARITY_REVERSED');
  assert.equal(cls([], [{ id: 'S', fromId: 'P1', toId: 'P4' }]), 'ONE_END');
  assert.equal(cls([], [{ id: 'S', fromId: 'P3', toId: 'P4' }]), 'NONE');
});
