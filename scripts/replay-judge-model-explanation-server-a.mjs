// 저장된 판정기 응답을 그대로 다시 넣어, 서버 검사만 바뀐 지금 코드(방안 A, feedback-claims.ts readingJudgment)로 다시 판정한다. 외부 호출 없음.
// Usage: npm run build && node scripts/replay-judge-model-explanation-server-a.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { OpenAIFeedbackEvaluator, applyFeedbackAssessment } from '../packages/pipeline/dist/index.js';
import { DIR, loadInputs, buildSchedule, cellLabel, selectedSession } from './run-judge-model-explanation.mjs';

const { cases } = loadInputs();
const rows = [];
for (const cell of buildSchedule(cases)) {
  const label = cellLabel(cell), saved = JSON.parse(readFileSync(`${DIR}/runs/${label}.json`, 'utf8'));
  const queue = saved.requests.filter(r => r.kind !== 'problem_feedback_end_explanation' && 'output_text' in r);
  let used = 0, outOfData = false;
  const transport = { async create(request) {
    const kind = request.text.format.name, i = queue.findIndex((r, k) => k >= used && r.kind === kind);
    if (i < 0) { outOfData = true; throw Object.assign(new Error('RUN_LIMIT: 저장 응답 없음'), {}); }
    used = i + 1; return { output_text: queue[i].output_text, status: 'completed', usage: {} };
  } };
  let status = 'VALID', judge = null, phase = null, error = null;
  try {
    const session = selectedSession(cell), call = await new OpenAIFeedbackEvaluator({ model: saved.model, maxRetries: 1, transport }).evaluate(session);
    judge = call.rawOutput; phase = applyFeedbackAssessment(session, call.rawOutput).phase;
  } catch (e) { status = outOfData ? 'NEEDS_NEW_CALL' : 'EVALUATION_ERROR'; error = String(e).slice(0, 200); }
  rows.push({ label, caseId: saved.caseId, cond: saved.condition, before: saved.status === 'VALID' ? saved.judge.contentAssessment : 'X',
    after: status === 'VALID' ? judge.contentAssessment : status === 'NEEDS_NEW_CALL' ? 'NEW' : 'X', phaseBefore: saved.phaseAfterSelection, phaseAfter: phase, error });
}
writeFileSync(`${DIR}/replay-server-a.json`, JSON.stringify(rows, null, 2) + '\n');
const sym = { SUPPORTED: '충', INSUFFICIENT: '부', ERROR: '오', UNKNOWN: '?', X: 'X', NEW: 'N' };
const ids = [...new Set(rows.map(r => r.caseId))], conds = ['L-now', 'L-lab', 'L-none', 'S-now', 'S-lab'];
console.log('| 사례 | ' + conds.join(' | ') + ' |'); console.log('|---|' + conds.map(() => '---').join('|') + '|');
for (const id of ids) console.log(`| ${id} | ` + conds.map(c => { const r = rows.filter(x => x.caseId === id && x.cond === c);
  return r.length ? r.map(x => sym[x.before]).join('') + '→' + r.map(x => sym[x.after]).join('') : '·'; }).join(' | ') + ' |');
console.log('changed', rows.filter(r => r.before !== r.after).map(r => `${r.label} ${r.before}->${r.after}${r.error ? ' ' + r.error : ''}`).join('\n'));
