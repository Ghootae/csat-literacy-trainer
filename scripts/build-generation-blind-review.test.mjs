import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderReview, reviewWrap, REVIEW_SEED, main } from './build-generation-blind-review.mjs';
import { displayParagraphs } from './run-item-solve-check.mjs';

const TAG = { A: '가', A2: '나', B: '다', REAL: '라' };
const item = (source, slot) => ({ source, slot, realNumber: source === 'REAL' ? 4141 + slot : null, stem: `${TAG[source]}${slot} 발문 <b>적절한 것은?`, choices: [1, 2, 3, 4, 5].map(n => ({ number: n, text: `${TAG[source]}${slot}-${n} 선지 & 문장` })) });
const passages = () => [{ passageId: 'pa', paragraphs: ['첫째 \u0001㉠밑줄 구간\u0002 문단 <x> \u0003상자\u0004'], items: [item('A', 1), item('A2', 1), item('B', 1), item('REAL', 1)] },
  { passageId: 'pb', paragraphs: ['둘째 지문'], items: [item('A', 1), item('B', 1), item('REAL', 1)] }];

test('page: passage once per passage, markers become <u> and box, text escaped, no source name or exam number anywhere in the page', () => {
  const { html, key } = renderReview(passages());
  assert.equal((html.match(/첫째/gu) ?? []).length, 1); assert.equal((html.match(/둘째 지문/gu) ?? []).length, 1);
  assert.ok(html.includes('<u>㉠밑줄 구간</u>') && html.includes('<span class="box">상자</span>') && html.includes('&lt;x&gt;') && html.includes('&lt;b&gt;'));
  assert.ok(!/\u0001|\u0002|\u0003|\u0004/u.test(html));
  assert.equal(Object.keys(key).length, 7);
  for (const bad of ['REAL', 'A2', '기출', '생성', '출처', 'realNumber', '"source"', '4142']) assert.ok(!html.includes(bad), `page leaks ${bad}`);
  assert.ok(!html.includes('USER-REVIEW-KEY')); assert.ok(!/추측/u.test(html), 'no source-guess field');
});

test('items per passage are shuffled with the fixed seed; ids are opaque; key maps id to source, slot and exam number', () => {
  const a = renderReview(passages()), b = renderReview(passages());
  assert.deepEqual(a.key, b.key); assert.equal(a.html, b.html); assert.equal(REVIEW_SEED, 20261107);
  assert.deepEqual(Object.keys(a.key).filter(k => k.startsWith('p1-')), ['p1-q1', 'p1-q2', 'p1-q3', 'p1-q4']);
  assert.deepEqual(Object.values(a.key).filter(v => v.passageId === 'pa').map(v => v.source).sort(), ['A', 'A2', 'B', 'REAL']);
  assert.deepEqual(Object.values(a.key).find(v => v.source === 'REAL' && v.passageId === 'pa'), { passageId: 'pa', source: 'REAL', slot: 1, realNumber: 4142 });
  assert.deepEqual(Object.values(a.key).find(v => v.source === 'A'), { passageId: 'pa', source: 'A', slot: 1, realNumber: null });
  assert.notDeepEqual(Object.values(a.key).filter(v => v.passageId === 'pa').map(v => v.source), ['A', 'A2', 'B', 'REAL'], 'input order is shuffled');
});

test('form fields per item: uniqueness, wrong-choice clarity, suneung-likeness 1-4, memo; copy button builds the result JSON', () => {
  const { html } = renderReview(passages());
  for (const f of ['u_p1-q1', 'un_p1-q1', 'w_p1-q1', 'wn_p1-q1', 's_p1-q1', 'm_p1-q1']) assert.ok(html.includes(`"${f}"`), f);
  for (const label of ['유일', '복수', '없음', '모두 명확', '일부 불명확', '불명확']) assert.ok(html.includes(`value="${label}"`), label);
  assert.equal((html.match(/name="s_p1-q1"/gu) ?? []).length, 4);
  assert.ok(html.includes('결과 복사') && html.includes('navigator.clipboard.writeText'));
  assert.ok(html.includes('"id":"p1-q1","choices":5'));
});

test('display wrap: displayParagraphs with reviewWrap inserts the control markers', () => {
  const para = { sections: [{ paragraphs: [{ paragraph_id: 'p', text: '가나다라', annotations: [{ annotation_id: 'a', start: 1, end: 3, text: '나다', marker: 'ⓐ', style: 'underline' }] }] }] };
  assert.deepEqual(displayParagraphs(para, reviewWrap), ['가\u0001ⓐ나다\u0002라']);
});

test('dry-run on the real targets: 40 items over 4 passages from fake generated items and the exam baseline; key lists 30 generated + 10 exam', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'review-'));
  try {
    const r = await main({ dryRun: true, out: dir });
    assert.equal(r.items, 40); assert.equal(r.passages, 4);
    const key = JSON.parse(readFileSync(`${dir}/dry-run/review/USER-REVIEW-KEY.json`, 'utf8')).key, vals = Object.values(key);
    assert.equal(vals.filter(v => v.source === 'REAL').length, 10); assert.equal(vals.filter(v => v.source !== 'REAL').length, 30);
    assert.deepEqual(vals.filter(v => v.source === 'REAL').map(v => v.realNumber).sort((a, b) => a - b), [8, 9, 10, 11, 12, 14, 14, 15, 15, 16]);
    const html = readFileSync(`${dir}/dry-run/review/USER-REVIEW.html`, 'utf8');
    assert.ok(!/realNumber|REAL/u.test(html)); assert.ok(html.includes('<u>㉠'), 'exam passage markers shown');
    assert.equal((html.match(/<h2>지문 /gu) ?? []).length, 4);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
