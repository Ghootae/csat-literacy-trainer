// Handoff 2026-10-14-v5-section-lead-sentence: one session per lead-sentence row, run once to confirm it works.
import { cases as reselection } from './v5-reselection-cases.mjs';

const pick = id => { const c = reselection.find(x => x.id === id); if (!c) throw new Error(`Missing reselection case ${id}`); return c; };
export const cases = [
  // Wrong "적절하지 않은 것" choice with agreeing rationale, then a correct reselection (the P3-G case itself).
  { ...pick('P3-G'), id: 'L-G' },
  // Wrong "적절한 것" choice with agreeing rationale, wrong again on reselection.
  { ...pick('P1-S'), id: 'L-S' },
  // ③ particles (이/은/을), then a correct reselection with a vague rationale.
  { ...pick('P2-M'), id: 'L-M' },
  // Wrong choice with no rationale: only the outcome is stated.
  { id: 'L-I0', group: 'L', questionId: 'information-asymmetry-free-marketplace-q13', choiceId: 'C4', rationale: null, source: '근거 미제출', full: true },
];
if (cases.length !== 4 || new Set(cases.map(c => c.id)).size !== 4) throw new Error('Case set must be 4 unique sessions');
