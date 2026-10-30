import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`http://127.0.0.1:5173/problem/lab?questionId=surface-tension-laplace-q16&sessionId=${process.argv[2]}`);
await p.waitForTimeout(8000);
await p.screenshot({ path: 'problem-lab.png' });
console.log((await p.locator('body').innerText()).slice(-900));
await b.close();
