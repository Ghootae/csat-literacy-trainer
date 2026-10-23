// 사용자 이해 용이성 판정 화면(블라인드). 형식이 깨진 출력(조각 불일치)은 뺀다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { markdownToHtml } from '../../../../scripts/run-examiner-strategy.mjs';
const dir = new URL('.', import.meta.url).pathname;
const files = readdirSync(`${dir}outputs`).filter(f => f.endsWith('.json')).sort();
const items = files.map(f => ({ f, o: JSON.parse(readFileSync(`${dir}outputs/${f}`, 'utf8')) }))
  .filter(({ o }) => o.checks?.partsMatch);
let a = 20261024 >>> 0;
const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
const key = {};
const cards = items.map(({ f, o }, i) => {
  const id = String.fromCharCode(65 + i); key[id] = f.replace('.json', '');
  const out = o.output ?? o.parsed;
  const opt = v => `<label><input type="radio" name="g${id}" value="${v}"> ${v}</label>`;
  return `<article><h3>글 ${id}</h3>${markdownToHtml(out.text)}<div class="j">이해 용이성: ${['상', '중', '하'].map(opt).join(' ')}<br><textarea id="m${id}" placeholder="메모(선택)"></textarea></div></article>`;
}).join('\n');
const ids = Object.keys(key);
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>출제자 전략 판정</title>
<style>:root{--bg:#fff;--fg:#1d1d1f;--card:#f5f5f7;--line:#d2d2d7}@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--fg:#f2f2f7;--card:#2c2c2e;--line:#48484a}}
body{background:var(--bg);color:var(--fg);font-family:-apple-system,sans-serif;max-width:1500px;margin:0 auto;padding:16px;line-height:1.7}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}@media (max-width:480px){.grid{grid-template-columns:1fr}}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}.j{border-top:1px solid var(--line);margin-top:8px;padding-top:8px}
textarea{width:100%;min-height:48px;background:var(--bg);color:var(--fg);border:1px solid var(--line)}button{font-size:16px;padding:8px 16px;margin:8px 0}
.q{background:var(--card);border-left:4px solid #888;padding:8px 12px}</style></head><body>
<h1>출제자 전략 글 판정 — 법인 13번 ②</h1>
<p class="q">선지 ②: 갑에게 자산 운용의 권한이 주어진 것은 A를 설립할 당시 개인의 재산을 출연하여 주주들에 의해 법인격이 부여되었기 때문이겠군.</p>
<p>학생이 문제를 다 푼 뒤 [출제자 전략 보기]를 눌렀을 때 보는 글입니다. 글마다 이해 용이성(상·중·하)을 고르고, 가장 좋은 글 하나를 고른 뒤 [결과 복사]를 눌러 대화창에 붙여 주세요. 모델 이름은 가렸습니다.</p>
<div class="grid">${cards}</div>
<h2>가장 좋은 글</h2><p>${ids.map(id => `<label><input type="radio" name="best" value="${id}"> ${id}</label>`).join(' ')}</p>
<textarea id="overall" placeholder="전체 메모(선택)"></textarea><br><button id="copy">결과 복사</button> <span id="msg"></span>
<script>const ids=${JSON.stringify(ids)};document.getElementById('copy').onclick=async()=>{const v=n=>document.querySelector('input[name="'+n+'"]:checked')?.value??null;
const r={trial:'examiner-strategy-trial-1',grades:Object.fromEntries(ids.map(i=>[i,{grade:v('g'+i),memo:document.getElementById('m'+i).value}])),best:v('best'),overall:document.getElementById('overall').value};
const t=JSON.stringify(r,null,1);try{await navigator.clipboard.writeText(t);document.getElementById('msg').textContent='복사됨'}catch(e){prompt('복사해 주세요',t)}};</script></body></html>`;
writeFileSync(`${dir}USER-REVIEW.html`, html);
writeFileSync(`${dir}USER-REVIEW-KEY.json`, JSON.stringify({ note: '판정 전 열지 않는다.', key }, null, 2) + '\n');
console.log(ids.length, 'cards');
