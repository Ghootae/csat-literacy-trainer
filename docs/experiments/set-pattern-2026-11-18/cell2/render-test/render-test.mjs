import fs from 'node:fs';
import { validateSpec, renderBoth } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/deep-item-v5-2026-11-18/graph/render.mjs';
import { chromium } from '/Users/mac/Projects/csat-literacy-problem-solving-mvp/node_modules/playwright-core/index.mjs';
const dir = process.argv[2];
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}); const pg = await b.newPage();
for (const n of ['T1','T2','T3']) {
  const spec = JSON.parse(fs.readFileSync(`${dir}/${n}.spec.json`,'utf8'));
  console.log(n, JSON.stringify(validateSpec(spec)));
  const { svg, text } = renderBoth(spec);
  fs.writeFileSync(`${dir}/${n}.svg`, svg); fs.writeFileSync(`${dir}/${n}.txt`, text);
  await pg.setContent(`<body style="margin:0">${svg}</body>`);
  await (await pg.$('svg')).screenshot({ path: `${dir}/${n}.png` });
  console.log(text, '\n');
}
await b.close();
