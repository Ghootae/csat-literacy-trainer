// 2026-10-22 B3 recheck after excluding the selection-mismatch item from the sufficiency-quote overlap check
// (regression found in docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md §3; user "1번 수정 진행").
import { cases as all } from './v5-diverse-48-regression-cases.mjs';
export const cases = all.filter(c => c.role === 'B3');
if (cases.length !== 6) throw new Error('Expected the 6 B3 sessions');
