// svg → png (playwright chromium). 사용: node svg2png.mjs in.svg out.png
import { chromium } from '@playwright/test'; import fs from 'node:fs';
const [i, o] = process.argv.slice(2); const svg = fs.readFileSync(i, 'utf8');
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 560, height: 360 }, deviceScaleFactor: 2 });
await p.setContent(`<body style="margin:0;background:#fff">${svg}</body>`); await p.locator('svg').screenshot({ path: o }); await b.close();
