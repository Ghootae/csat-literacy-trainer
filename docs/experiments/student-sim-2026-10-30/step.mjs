// usage: node step.mjs start <passageId> [paragraph]  |  node step.mjs say <sessionId> <paragraph> <text>  |  node step.mjs next <sessionId> <paragraph>
import { chromium } from 'playwright';
import fs from 'node:fs';
const B = 'http://127.0.0.1:5173';
const [mode, a, b, ...rest] = process.argv.slice(2);
const api = async (p, opt) => (await fetch(B + p, opt)).json();
const post = (p, body) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
let sid = a, para = Number(b ?? 0);
if (mode === 'start') { const s = await post('/api/developer/dialogue-simple/session', { passageId: a }); sid = s.sessionId; if (para > 0) await post(`/api/developer/dialogue-simple/session/${sid}/navigate`, { paragraphIndex: para }); console.log('SESSION', sid); }
if (mode === 'next') await post(`/api/developer/dialogue-simple/session/${sid}/navigate`, { paragraphIndex: para });
if (mode === 'say') {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true }); const page = await browser.newPage();
  await page.goto(`${B}/dialogue/lab?sessionId=${sid}&paragraph=${para}`);
  const ta = page.locator('#simple-response'); await ta.waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('#simple-response')?.disabled, null, { timeout: 30000 });
  await ta.fill(rest.join(' '));
  await page.getByRole('button', { name: /^(보내기|다시 시도)$/ }).click();
  await page.waitForFunction(() => { const t = document.querySelector('#simple-response'); const done = document.querySelector('.chat-progress-actions'); return (done || (t && !t.disabled)) && !document.querySelector('.simple-waiting'); }, null, { timeout: 180000 });
  await page.waitForTimeout(500);
  await browser.close();
}
const v = await api(`/api/developer/dialogue-simple/session/${sid}`);
const c = v.current;
console.log(`P${c.index + 1} attempt ${c.attemptNumber} stage=${c.stage} done=${c.done} status=${c.evaluationStatus} ${c.evaluationError ?? ''}`);
console.log('restated:', c.restatedSummary);
for (const m of c.messages) { if (m.kind === "WAIT_DONE") continue; console.log(`  [${m.role}/${m.label ?? ""}] ${m.text}`); [...(m.items ?? []), ...(m.parts ?? []).map(p => "핵심: " + (typeof p === "string" ? p : JSON.stringify(p)))].forEach((it, i) => console.log(`      (${i + 1}) ${typeof it === "string" ? it : JSON.stringify(it)}`)); }
console.log('highlights:', JSON.stringify(c.highlights));
const ins = await api(`/api/developer/dialogue-simple/session/${sid}/inspect?paragraphIndex=${c.index}`);
fs.mkdirSync('logs', { recursive: true }); fs.writeFileSync(`logs/${sid}-p${c.index}.json`, JSON.stringify({ view: v, inspect: ins }, null, 1));
const att = (ins.attempts ?? [ins]).at(-1); const steps = att?.steps ?? ins.steps ?? [];
const s = steps.at(-1);
if (s) { const o = s.output ?? {}; console.log('JUDGE:', JSON.stringify({ cat: o.category, action: s.action, covered: o.corePartsCovered, errors: o.errors, gaps: o.gaps, tER: o.targetErrorResolved, tGF: o.targetGapsFilled, tGR: o.targetGapReadings, reason: o.reason, modelMsg: o.message, copy: s.sourceCopyDetected, vf: s.validationFailures, ms: s.call?.durationMs })); }
