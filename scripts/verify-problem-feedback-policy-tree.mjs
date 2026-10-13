import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

// Artifact-only checks: this does not call or change the problem-solving evaluator.
const artifact = resolve('docs/review/problem-feedback-policy-tree-2026-10-01.html');
const output = '/Users/mac/.codex/visualizations/2026/10/01/01a0f600-7beb-74a0-b809-d0f42585e6e6';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage({ viewport: { width: 920, height: 850 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${artifact}`);
  await page.waitForSelector('#trees section');
  const check = await page.evaluate(() => ({
    sections: document.querySelectorAll('#trees section').length,
    leaves: document.querySelectorAll('.leaf').length,
    details: document.querySelectorAll('details').length,
    links: [...document.querySelectorAll('a[href^="#"]')].every((a) => document.querySelector(a.getAttribute('href'))),
    overflow: document.documentElement.scrollWidth > innerWidth,
    coachingLeaves: [...document.querySelectorAll('li[data-kind="coach"]')].every((el) => el.textContent.includes('정답·해설 공개') && el.textContent.includes('재선택 없음')),
  }));
  await page.screenshot({ path: `${output}/policy-tree-desktop.png` });
  await page.locator('#C').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/policy-tree-correction.png` });
  await page.getByRole('button', { name: '가지 접기', exact: true }).click();
  check.collapsed = await page.locator('details[open]').count() === 0;
  await page.getByRole('button', { name: '모두 펼치기', exact: true }).click();
  check.expanded = await page.locator('details[open]').count() === check.details;
  const textDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '텍스트 수형도 저장', exact: true }).click();
  const textPath = resolve('docs/review/problem-feedback-policy-tree-2026-10-01.txt');
  await (await textDownload).saveAs(textPath);
  const text = await readFile(textPath, 'utf8');
  check.textExport = ['A. 최초 선택', 'B. 최초 오답', 'C. 오류별', 'D. 마지막', 'E. 공통', '└─', '새 오류'].every((s) => text.includes(s));
  const htmlDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 저장', exact: true }).click();
  const exportPath = `${output}/problem-feedback-policy-tree-export.html`;
  await (await htmlDownload).saveAs(exportPath);
  await page.goto(`file://${exportPath}`);
  check.exportSections = await page.locator('#trees section').count();
  check.exportLeaves = await page.locator('.leaf').count();
  await page.setViewportSize({ width: 360, height: 820 });
  check.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.screenshot({ path: `${output}/policy-tree-mobile.png` });
  await page.setViewportSize({ width: 320, height: 820 });
  check.smallOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: `${output}/policy-tree-dark.png` });
  await page.getByRole('button', { name: '가지 접기', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  check.printExpands = await page.locator('details[open]').count() === check.details;
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  check.printRestores = await page.locator('details[open]').count() === 0;
  assert.equal(check.sections, 5);
  assert.equal(check.exportSections, 5);
  assert.equal(check.exportLeaves, check.leaves);
  for (const key of ['links', 'coachingLeaves', 'collapsed', 'expanded', 'textExport', 'printExpands', 'printRestores']) assert.equal(check[key], true, key);
  for (const key of ['overflow', 'mobileOverflow', 'smallOverflow']) assert.equal(check[key], false, key);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ check, errors }, null, 2));
} finally {
  await browser.close();
}
