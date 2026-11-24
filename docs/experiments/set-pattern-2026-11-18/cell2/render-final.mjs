// 최종 문항(leakfix)의 graphSpec을 SVG→PNG로. 실행: node render-final.mjs <items-leakfix.json> <out.png> [version=V2]
import fs from 'node:fs';
import { validateSpec, renderBoth } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/deep-item-v5-2026-11-18/graph/render.mjs';
import { chromium } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/node_modules/playwright-core/index.mjs';
const [inp, out, ver = 'V2'] = process.argv.slice(2);
const it = JSON.parse(fs.readFileSync(inp, 'utf8')).items.find(x => x.version === ver);
console.log(out, JSON.stringify(validateSpec(it.graphSpec)));
const { svg, text } = renderBoth(it.graphSpec);
console.log('읽기 판이 bogi와 같음:', it.bogi.trim() === text.trim());
fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }); const pg = await b.newPage();
await pg.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
await (await pg.$('svg')).screenshot({ path: out });
await b.close();
