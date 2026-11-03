// 교사 시연 튜토리얼 각본을 개발자 화면(/dialogue/lab → /problem/lab)에 그대로 입력하고
// 단계마다 화면을 찍는다. 사용: node docs/experiments/teacher-tutorial-2026-11-03/run-script.mjs <runNo>
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUN = process.argv[2] ?? '1';
// 셋째 인자로 문단 번호 목록(예: 1,5)을 주면 그 문단만 따로 시작해 시험하고 문제로 넘어가지 않는다.
const ONLY = process.argv[3]?.split(',').map(Number);
const BASE = process.env.TUTORIAL_BASE ?? 'http://127.0.0.1:5173';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), `run-${RUN}`);
mkdirSync(OUT, { recursive: true });

const TITLE = '정보 비대칭과 사상의 자유 시장 이론';
// 문단마다 [첫 요약, 질문을 받으면 보낼 답]. 각본에 없는 질문이 오면 마지막 답을 다시 쓰지 않고 기록만 한다.
const PARAGRAPHS = [
  ['정보비대칭->역선택 문제: 정보 적게 가진 주체가 낮은 품질 상품을 비싸게 선택 -> 정부 개입', '정부가 공급자한테 성분이나 효능 같은 정보를 소비자에게 알려 주도록 강제해.'],
  ['생성형 AI로 허위·과장 광고 증가 -> AI 사용 제품·서비스 사업자에게 표시 의무 강제 -> 광고 제공자, 플랫폼에도 의무 부여 주장 -> 사회적 주장에도 개입 여부 논란',
    '생성형 AI 때문에 진짜인지 알기 어려운 허위·과장 광고가 늘었어.'],
  ['사상의 자유시장 이론: 경쟁으로 진위 판단. 정부 개입 안됨. 미국 대법원, 헌법재판소 지지 입장.'],
  ['비판론. 참정보는 적고, 허위 정보 많음 -> 경쟁 안됨 & 여론 왜곡 가능 -> 플랫폼과 정부의 공동 규제 주장'],
  ['실명확인 사건에서 다수 의견은 제재 법률이 합헌이라고 했고, 소수 의견은 허위·왜곡 정보는 토론으로 고치기 어렵다고 봤어.',
    '다시 보니 다수 의견은 그 규정이 위헌이라고 했어.'],
];
const PROBLEM = {
  first: { choice: '②', text: '갑은 인공지능을 사용해서 광고했으니 제재 대상이야. 그래서 ②는 적절하지 않아.' },
  correction: '인공 지능을 활용한 제품이나 서비스를 제공하는 사업자',
  reselect: { choice: '⑤', text: '헌재 다수 의견이 실명 확인 안 한 언론사를 제재하는 규정을 위헌이라고 했으니까 B는 제재를 안 받아.' },
};

const log = [];
const note = (entry) => { log.push({ at: new Date().toISOString(), ...entry }); console.log(JSON.stringify(entry)); };
let shot = 0;
const snap = async (page, name) => { shot += 1; await page.screenshot({ path: resolve(OUT, `${String(shot).padStart(2, '0')}-${name}.png`) }); };

async function waitFor(page, predicate, arg, timeout = 240_000) {
  await page.waitForFunction(predicate, arg, { timeout, polling: 500 });
}

async function chatText(page) {
  return page.locator('.chat-scroll').innerText();
}

async function paragraphStep(page, index) {
  const answers = PARAGRAPHS[index];
  const bubbles = [];
  for (let turn = 0; turn < answers.length + 1; turn += 1) {
    const box = page.locator('#simple-response');
    const done = page.getByText('이 문단은 끝났어요.');
    await waitFor(page, () => !!document.querySelector('.chat-progress-actions') || (() => { const t = document.querySelector('#simple-response'); return t && !t.disabled; })());
    if (await done.isVisible()) break;
    if (turn >= answers.length) { note({ paragraph: index + 1, deviation: '각본보다 질문이 더 옴' }); break; }
    await box.fill(answers[turn]);
    await page.locator('button[data-rationale-submit]').click();
    await waitFor(page, () => { const t = document.querySelector('#simple-response'); return !t || t.disabled; }, undefined, 10_000).catch(() => {});
    await waitFor(page, () => !!document.querySelector('.chat-progress-actions') || (() => { const t = document.querySelector('#simple-response'); return t && !t.disabled && !document.querySelector('.simple-waiting'); })());
    const text = await chatText(page);
    bubbles.push(text);
    await snap(page, `p${index + 1}-t${turn + 1}`);
    if (await page.locator('.chat-notice[role=alert]').isVisible().catch(() => false)) { note({ paragraph: index + 1, error: await page.locator('.chat-notice').innerText() }); break; }
  }
  const finished = await page.getByText('이 문단은 끝났어요.').isVisible();
  note({ paragraph: index + 1, finished, turns: bubbles.length, chat: bubbles.at(-1) });
  return finished;
}

async function problemFlow(page) {
  const header = () => page.locator('.chat-pane header small').innerText();
  const enabledButtons = () => page.locator('.lab-primary-actions button:not([disabled])').allInnerTexts();
  const waitIdle = () => waitFor(page, () => {
    const buttons = [...document.querySelectorAll('.lab-primary-actions button')];
    const t = document.querySelector('#lab-response');
    return !document.querySelector('.lab-sequence-waiting') && (buttons.some(b => !b.disabled) || (t && !t.disabled));
  });
  const pick = async (circled) => page.locator(`li[aria-label="${circled}번 선지"]`).click();
  const send = async (text, label) => {
    await page.locator('#lab-response').fill(text);
    await page.locator('.lab-primary-actions button', { hasText: label }).click();
  };

  await waitIdle();
  await snap(page, 'q-start');
  await pick(PROBLEM.first.choice);
  await send(PROBLEM.first.text, '제출');
  const script = ['correction', 'reselect'];
  for (let guard = 0; guard < 20; guard += 1) {
    await page.waitForTimeout(800);
    await waitIdle();
    const phase = await header();
    const buttons = await enabledButtons();
    await snap(page, `q-${guard + 1}`);
    note({ problem: guard + 1, phase, buttons });
    if (phase === '풀이 완료') break;
    if (phase === '질문에 답하기') {
      if (script[0] !== 'correction') { note({ deviation: '각본에 없는 교정 질문' }); break; }
      script.shift(); await send(PROBLEM.correction, '답변 전송'); continue;
    }
    if (phase === '다시 고르기') {
      if (script[0] !== 'reselect') { note({ deviation: '각본보다 먼저 다시 고르기' }); }
      script.shift(); await pick(PROBLEM.reselect.choice); await send(PROBLEM.reselect.text, '제출'); continue;
    }
    if (buttons.includes('다시 선택')) { await page.locator('.lab-primary-actions button', { hasText: '다시 선택' }).click(); continue; }
    const next = buttons.find(b => b === '다음으로 넘어가기' || b === '응');
    if (next) { await page.locator('.lab-primary-actions button:not([disabled])', { hasText: next }).first().click(); continue; }
    note({ deviation: '처리할 수 없는 상태', phase, buttons }); break;
  }
  note({ problemChat: await page.locator('.lab-chat-scroll').innerText() });
}

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
try {
  await page.goto(`${BASE}/dialogue/lab`);
  await snap(page, 'start');
  if (ONLY) {
    for (const n of ONLY) {
      await page.goto(`${BASE}/dialogue/lab`);
      await page.locator('article.dialogue-passage-card', { hasText: TITLE }).getByRole('button', { name: `문단 ${n}`, exact: true }).click();
      await page.waitForFunction(() => location.search.includes('sessionId='), undefined, { timeout: 30_000 });
      note({ paragraphSession: new URL(page.url()).searchParams.get('sessionId'), only: n });
      await paragraphStep(page, n - 1);
    }
    throw 'ONLY_DONE';
  }
  await page.locator('article.dialogue-passage-card', { hasText: TITLE }).getByRole('button', { name: '시작' }).click();
  await page.waitForFunction(() => location.search.includes('sessionId='), undefined, { timeout: 30_000 });
  note({ paragraphSession: new URL(page.url()).searchParams.get('sessionId') });
  for (let i = 0; i < PARAGRAPHS.length; i += 1) {
    const finished = await paragraphStep(page, i);
    if (!finished) { note({ stop: `문단 ${i + 1}이 끝나지 않음` }); break; }
    if (i < PARAGRAPHS.length - 1) {
      await page.getByRole('button', { name: '다음 문단' }).click();
      await waitFor(page, () => !document.querySelector('.chat-progress-actions'), undefined, 30_000);
    }
  }
  if (await page.getByRole('button', { name: '문제 풀기' }).isVisible()) {
    await snap(page, 'to-problem');
    await page.getByRole('button', { name: '문제 풀기' }).click();
    await page.waitForURL(/\/problem\/lab/);
    await page.waitForFunction(() => location.search.includes('sessionId='), undefined, { timeout: 30_000 }).catch(() => {});
    note({ problemUrl: page.url() });
    await problemFlow(page);
  }
} catch (error) {
  if (error !== 'ONLY_DONE') {
  note({ fatal: String(error) });
  await snap(page, 'fatal').catch(() => {});
  }
} finally {
  writeFileSync(resolve(OUT, 'log.json'), JSON.stringify(log, null, 2));
  await browser.close();
}
