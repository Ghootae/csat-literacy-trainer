// Handoff 2026-10-20-v5-end-explanation-style: semi-automatic user review rerun on the paths that reach the end explanation.
// Reuses the 2026-10-19 dopamine q13 sessions; P7's correction reply is the one Claude authored in that run.
import { cases as all } from './v5-hypothesis-user-cases.mjs';
const KEEP = ['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9', 'P10'];
export const cases = all.filter(c => KEEP.includes(c.id))
  .map(c => c.id === 'P7' ? { ...c, replies: ['진행을 막지 못해도 증상은 완화할 수 있다는 뜻이네.'] } : c);
if (cases.length !== KEEP.length) throw new Error('Case set must be the 8 end-explanation sessions');
