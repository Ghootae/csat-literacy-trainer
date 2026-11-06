// D-0206 E1: blind review page for the user. 30 generated items (A, A2, B) + 10 exam items, per passage, items shuffled with a fixed seed, no source shown.
// Per item: answer uniqueness (unique / multiple / none), clarity of the wrong choices, suneung-likeness (1-4), memo. No source-guess field.
// Usage: node scripts/build-generation-blind-review.mjs [--dry-run] [--targets <json>] [--runs-dir <dir>] [--out <dir>] [--fixed <json>]
//   real:    reads <runs-dir>/<condition>/<passageId>/items.json, writes <out>/review/USER-REVIEW.html and USER-REVIEW-KEY.json
//   dry-run: fake generated items (nothing generated is read), writes under <out>/dry-run/review/. The real page is built after the generation run.
// Format after scripts/run-examiner-strategy.mjs USER-REVIEW.html: answers stay in the page, [결과 복사] copies the result JSON.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hash } from './run-analysis-map-gongsun.mjs';
import { EXP_DIR, TARGETS_PATH, CONDITIONS, loadGenTargets, slotsOf, exampleItems, exampleDesign } from './run-item-generation.mjs';
import { FIXED_PATH, displayParagraphs, displayPath, realQuestions, generatedQuestions } from './run-item-solve-check.mjs';

export const REVIEW_SEED = 20261107;
const NUMS = '①②③④⑤';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"]/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Annotation markers survive escaping as control characters, then become tags: underlined phrase (marker first) and boxed phrase.
export const reviewWrap = a => a.style === 'box' ? `\u0003${a.text}\u0004` : `\u0001${a.marker ?? ''}${a.text}\u0002`;
const paragraphHtml = s => `<p>${esc(s).replace(/\u0001/gu, '<u>').replace(/\u0002/gu, '</u>').replace(/\u0003/gu, '<span class="box">').replace(/\u0004/gu, '</span>')}</p>`;
const radio = (name, v, label = v) => `<label><input type="radio" name="${name}" value="${esc(v)}"> ${esc(label)}</label>`;
const checks = (name, n) => Array.from({ length: n }, (_, i) => `<label><input type="checkbox" name="${name}" value="${i + 1}"> ${NUMS[i]}</label>`).join(' ');

// passages: [{ passageId, paragraphs (display text with reviewWrap markers), items: [{ source, slot, realNumber|null, stem, choices: [{ number, text }] }] }]
// Returns { html, key }. The key holds source, slot and exam number per opaque item id; nothing of it enters the page.
export function renderReview(passages) {
  const rnd = mulberry32(REVIEW_SEED), key = {}, plan = [], sections = [];
  passages.forEach((p, pi) => {
    const order = [...p.items];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const cards = order.map((it, k) => {
      const id = `p${pi + 1}-q${k + 1}`, name = n => `${n}_${id}`;
      key[id] = { passageId: p.passageId, source: it.source, slot: it.slot, realNumber: it.realNumber ?? null };
      plan.push({ id, choices: it.choices.length });
      return `<article><h3>문항 ${pi + 1}-${k + 1}</h3><p class="stem">${esc(it.stem)}</p><ol class="ch">${it.choices.map(c => `<li>${NUMS[c.number - 1]} ${esc(c.text)}</li>`).join('')}</ol>`
        + `<div class="j"><p><strong>정답 유일성</strong> ${radio(name('u'), '유일')} ${radio(name('u'), '복수')} ${radio(name('u'), '없음')}<br>`
        + `정답 번호(유일) 또는 정답으로 볼 수 있는 번호들(복수): ${checks(name('un'), it.choices.length)}</p>`
        + `<p><strong>오답 근거 명확성</strong> ${radio(name('w'), '모두 명확')} ${radio(name('w'), '일부 불명확')} ${radio(name('w'), '불명확')}<br>`
        + `불명확한 선지(일부 불명확일 때): ${checks(name('wn'), it.choices.length)}</p>`
        + `<p><strong>수능다움</strong> ${[1, 2, 3, 4].map(v => radio(name('s'), String(v))).join(' ')} <span class="hint">(1 전혀 아님 ~ 4 매우 그럼)</span></p>`
        + `<textarea id="${name('m')}" placeholder="메모(선택)"></textarea></div></article>`;
    }).join('\n');
    sections.push(`<section><h2>지문 ${pi + 1}</h2><div class="passage">${p.paragraphs.map(paragraphHtml).join('')}</div>${cards}</section>`);
  });
  const data = JSON.stringify({ plan }).replace(/</gu, '\\u003c');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>문항 판정</title>`
    + `<style>:root{--bg:#fff;--fg:#1d1d1f;--card:#f5f5f7;--line:#d2d2d7;--accent:#888}@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--fg:#f2f2f7;--card:#2c2c2e;--line:#48484a}}`
    + `body{background:var(--bg);color:var(--fg);font-family:-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:16px;line-height:1.7}`
    + `.passage{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 16px;margin-bottom:16px}.box{border:1px solid var(--fg);padding:0 2px}`
    + `article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:16px}.stem{font-weight:600}.ch{list-style:none;padding-left:0}`
    + `.j{border-top:1px solid var(--line);margin-top:8px;padding-top:8px}.hint{color:var(--accent);font-size:.9em}label{margin-right:8px;white-space:nowrap}`
    + `textarea{width:100%;min-height:48px;box-sizing:border-box;background:var(--bg);color:var(--fg);border:1px solid var(--line)}button{font-size:16px;padding:8px 16px;margin:8px 0}</style></head><body>`
    + `<h1>문항 판정</h1><p>지문마다 문항이 섞여 있습니다. 문항마다 (1) 정답이 하나뿐인지, (2) 오답이 지문의 어디가 틀렸는지 분명한지, (3) 수능 문항다운지(1~4)를 골라 주세요. 선택은 이 브라우저에 저장됩니다. 다 끝나면 [결과 복사]를 눌러 대화창에 붙여 주세요.</p>`
    + `${sections.join('\n')}<h2>전체</h2><textarea id="overall" placeholder="전체 메모(선택)"></textarea><br><button id="copy">결과 복사</button> <span id="msg"></span>`
    + `<script>const D=${data};const SK='generation-blind-review-'+D.plan.map(p=>p.id).join();`
    + `const fields=()=>[...document.querySelectorAll('input,textarea')];`
    + `const save=()=>{try{localStorage.setItem(SK,JSON.stringify(fields().map(e=>e.type==='radio'||e.type==='checkbox'?e.checked:e.value)))}catch(e){}};`
    + `try{const s=JSON.parse(localStorage.getItem(SK)||'null');if(s)fields().forEach((e,i)=>{if(e.type==='radio'||e.type==='checkbox')e.checked=!!s[i];else if(s[i]!=null)e.value=s[i]})}catch(e){}`
    + `document.addEventListener('input',save);document.addEventListener('change',save);`
    + `document.getElementById('copy').onclick=async()=>{const v=n=>document.querySelector('input[name="'+n+'"]:checked')?.value??null;`
    + `const many=n=>[...document.querySelectorAll('input[name="'+n+'"]:checked')].map(e=>Number(e.value));`
    + `const r={items:Object.fromEntries(D.plan.map(p=>[p.id,{uniqueness:v('u_'+p.id),numbers:many('un_'+p.id),wrongClarity:v('w_'+p.id),unclearChoices:many('wn_'+p.id),suneungLike:v('s_'+p.id)===null?null:Number(v('s_'+p.id)),memo:document.getElementById('m_'+p.id).value}])),overall:document.getElementById('overall').value};`
    + `const t=JSON.stringify(r,null,1);try{await navigator.clipboard.writeText(t);document.getElementById('msg').textContent='복사됨'}catch(e){prompt('복사해 주세요',t)}};</script></body></html>\n`;
  return { html, key };
}

export async function main({ dryRun = false, targetsPath = TARGETS_PATH, runsDir = `${EXP_DIR}/runs`, out = EXP_DIR, fixedPath = FIXED_PATH } = {}) {
  const raw = readJson(targetsPath), passages = [];
  for (const t of loadGenTargets(targetsPath)) {
    const rawT = raw.find(x => x.passageId === t.passageId), slots = slotsOf(t), items = [];
    for (const cond of CONDITIONS) {
      let gen;
      if (dryRun) gen = exampleItems(t, cond === 'A' ? null : exampleDesign(cond, t));
      else { const p = `${runsDir}/${cond}/${t.passageId}/items.json`; if (!existsSync(p)) throw new Error(`GENERATED_MISSING: ${p}`); gen = readJson(p); }
      items.push(...generatedQuestions(gen, slots).map(q => ({ source: cond, slot: q.slot, realNumber: null, stem: q.stem, choices: q.choices })));
    }
    const realBySlot = new Map(t.slots.map(s => [s.slot, s.realNumber]));
    items.push(...realQuestions(t, raw, fixedPath).map(q => ({ source: 'REAL', slot: q.slot, realNumber: realBySlot.get(q.slot), stem: q.stem, choices: q.choices })));
    passages.push({ passageId: t.passageId, paragraphs: displayParagraphs(readJson(displayPath(rawT)), reviewWrap), items });
  }
  const { html, key } = renderReview(passages), dir = dryRun ? `${out}/dry-run/review` : `${out}/review`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/USER-REVIEW.html`, html);
  writeFileSync(`${dir}/USER-REVIEW-KEY.json`, JSON.stringify({ seed: REVIEW_SEED, note: '판정 전 열지 않는다.', pageHash: hash(html), key }, null, 2) + '\n');
  return { dryRun, items: Object.keys(key).length, passages: passages.length, dir };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  console.log(JSON.stringify(await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), runsDir: opt('--runs-dir'), out: opt('--out'), fixedPath: opt('--fixed') }), null, 2));
}
