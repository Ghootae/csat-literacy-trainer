// node pstep.mjs start <questionId> | node pstep.mjs <sid> '<commandJSON>'
import fs from 'node:fs'; import crypto from 'node:crypto';
const B = 'http://127.0.0.1:5173/api/developer/problem-lab/session';
const [a, cmd] = process.argv.slice(2);
const j = async (u, o) => { const r = await fetch(u, o); const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t, status: r.status }; } };
let v, sid = a, before = 0;
if (a === 'start') { v = await j(B, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: cmd }) }); sid = v.sessionId; console.log('SESSION', sid); }
else {
  const cur = await j(`${B}/${sid}`); before = cur.transcript.length;
  v = await j(`${B}/${sid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transitionId: crypto.randomUUID(), expectedRevision: cur.revision, command: JSON.parse(cmd) }) });
  if (v.error) { console.log('ERR', v.error); process.exit(1); }
  for (let i = 0; i < 120 && v.evaluationStatus === 'PROCESSING'; i++) { await new Promise(r => setTimeout(r, 1500)); v = await j(`${B}/${sid}`); }
  // background end explanation may still be generating; give it a moment
}
const show = x => typeof x === 'string' ? x : JSON.stringify(x);
for (const m of v.transcript.slice(before)) { if (m.kind === 'WAIT_DONE') continue; console.log(`  [${m.role ?? m.speaker}${m.kind ? '/' + m.kind : ''}] ${show(m.text ?? m.content ?? m)}`); if (m.actions || m.buttons) console.log('     buttons:', show(m.actions ?? m.buttons)); }
console.log(`phase=${v.phase} sel=${v.selectionCount}/${v.maxSelections} activeErr=${v.activeErrorId} status=${v.evaluationStatus} ${v.evaluationError ?? ''}`);
console.log('message:', v.message); if (v.postRepairOptions) console.log('postRepair:', show(v.postRepairOptions)); if (v.result) console.log('result:', show(v.result));
if (v.correctionHighlights?.length) console.log('highlights:', v.correctionHighlights.map(h => h.text).join(' | '));
const ins = await j(`${B}/${sid}/inspect`);
fs.mkdirSync('plogs', { recursive: true }); fs.writeFileSync(`plogs/${sid}.json`, JSON.stringify({ view: v, inspect: ins }, null, 1));
