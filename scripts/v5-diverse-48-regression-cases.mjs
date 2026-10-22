// 2026-10-22 regression: the 48 sessions of 2026-10-12 replayed with the current judgment code (docs/handoffs/2026-10-22-v5-diverse-48-regression.md).
// Initial rationale, choice and intent are unchanged; follow-up replies are authored during the run, so no `replies` here.
import { cases as base, specs } from './v5-diverse-48-cases.mjs';

const spec = Object.fromEntries(specs.map(s => [s.key, s]));
export const cases = base.map(c => {
  const next = { ...c, full: true, group: c.role, path: c.role };
  if (c.role === 'B3') {
    const s = spec[c.id.split('-')[0]];
    next.reselect = { choiceId: `C${s.wrong[0]}`, rationale: s.rewrong };
  }
  return next;
});
if (cases.length !== 48) throw new Error(`Expected 48 cases, got ${cases.length}`);
if (new Set(cases.map(c => c.id)).size !== cases.length) throw new Error('Duplicate case id');
