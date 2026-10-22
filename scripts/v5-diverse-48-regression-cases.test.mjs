import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cases } from './v5-diverse-48-regression-cases.mjs';
import { cases as base } from './v5-diverse-48-cases.mjs';

test('exports the 48 base cases unchanged apart from full/group/path/reselect', () => {
  assert.equal(cases.length, 48);
  assert.equal(new Set(cases.map(c => c.id)).size, 48);
  cases.forEach((c, i) => {
    const { full, group, path, reselect, replies, ...rest } = c;
    assert.deepEqual(rest, base[i]);
    assert.equal(full, true); assert.equal(group, c.role); assert.equal(path, c.role);
    assert.equal(replies, undefined);
    assert.equal(reselect !== undefined, c.role === 'B3');
  });
});

test('B3 reselect equals the 2026-10-12 recorded reselect commands', () => {
  const actions = JSON.parse(readFileSync('docs/experiments/v5-diverse-48-2026-10-12/actions/reselect-and-finish.json', 'utf8'));
  const b3 = cases.filter(c => c.role === 'B3');
  assert.equal(b3.length, 6);
  for (const c of b3) {
    const a = actions.find(x => x.id === c.id);
    assert.ok(a, `no recorded action for ${c.id}`);
    assert.equal(a.command.type, 'SELECT');
    assert.equal(a.command.choiceId, c.reselect.choiceId);
    assert.equal(a.command.rationale.text, c.reselect.rationale);
  }
});
