import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, write, STEM_TABLE, FORBIDDEN_KEYS, E1_PASSAGES, UI_PASSAGES, KEEP_SYMBOL_ITEMS, directionOf } from './build-structure-judge-bundle.mjs';

const SYMBOLS = /[㉠-㉿ⓐ-ⓩ]/u;
const base = build(), allItems = j => base.judges[j].flatMap(p => p.items.map(i => ({ ...i, passageId: p.passageId })));
const keyOf = id => base.key.key[id];
const find = (passageId, number) => { const id = Object.keys(base.key.key).find(k => k.startsWith(passageId + '#') && base.key.key[k].realNumber === number); return { id, item: allItems('j1').find(i => i.id === id), key: base.key.key[id] }; };
const keysDeep = (v, acc = new Set()) => { if (Array.isArray(v)) v.forEach(x => keysDeep(x, acc)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { acc.add(k); keysDeep(x, acc); } return acc; };

test('without P1: 8 passage files per judge, 31 exam + 20 E1 v3 = 51 items, no vocabulary exam items', () => {
  assert.equal(base.judges.j1.length, 8); assert.equal(base.judges.j2.length, 8);
  assert.equal(allItems('j1').length, 51); assert.equal(allItems('j2').length, 51);
  const ks = Object.values(base.key.key);
  assert.equal(ks.filter(k => k.source === 'EXAM').length, 31); assert.equal(ks.filter(k => k.source === 'E1_V3').length, 20); assert.equal(ks.filter(k => k.source === 'P1').length, 0);
  const examNumbers = Object.fromEntries(Object.entries(STEM_TABLE).map(([p, t]) => [p, Object.values(t).flat().sort((a, b) => a - b)]));
  for (const [p, ns] of Object.entries(examNumbers)) assert.deepEqual(Object.keys(base.key.key).filter(i => i.startsWith(p + '#') && base.key.key[i].source === 'EXAM').map(i => base.key.key[i].realNumber).sort((a, b) => a - b), ns, p);
  for (const vocab of [['surface-tension-laplace', 17], ['plastic-polymerization', 11]]) assert.equal(find(...vocab).id, undefined, `${vocab} is vocabulary`);
  assert.equal(base.solveInputP1.length, 0);
});

test('judge input never carries source, condition, realNumber, slot, itemKey, explanation, truth, dataUrl, stemType, hasBogi or replaced', () => {
  const found = [...keysDeep(base.judges)].filter(k => FORBIDDEN_KEYS.includes(k)); assert.deepEqual(found, []);
  for (const it of allItems('j1')) { assert.deepEqual(Object.keys(it).filter(k => k !== 'passageId').sort(), ['answer', 'bogi', 'choices', 'id', 'images', 'stem']); assert.ok(it.choices.every(c => Object.keys(c).sort().join() === 'number,text')); assert.ok(Number.isInteger(it.answer)); }
  assert.ok(!JSON.stringify(base.judges).includes('dataUrl'));
});

test('image paths point at real files', () => {
  const imgs = allItems('j1').flatMap(i => i.images); assert.ok(imgs.length >= 3);
  for (const p of imgs) { assert.ok(p.startsWith('/'), p); assert.ok(existsSync(p), p); }
  for (const [pid, n] of [['audio-perceptual-coding', 17], ['gongsun-long-later-mohists', 13], ['mrna-vaccine-lipid-nanoparticle', 19]]) assert.ok(find(pid, n).item.images.length > 0, `${pid} ${n}`);
});

test('j1 and j2 hold the same items per passage in a different order', () => {
  for (let i = 0; i < 8; i++) {
    const a = base.judges.j1[i], b = base.judges.j2[i]; assert.equal(a.passageId, b.passageId); assert.deepEqual(a.paragraphs, b.paragraphs);
    assert.deepEqual(a.items.map(x => x.id).sort(), b.items.map(x => x.id).sort(), a.passageId); assert.notEqual(a.items.map(x => x.id).join(), b.items.map(x => x.id).join(), a.passageId);
    assert.deepEqual(a.items.map(x => x.id).sort().map(id => JSON.stringify(a.items.find(x => x.id === id))), b.items.map(x => x.id).sort().map(id => JSON.stringify(b.items.find(x => x.id === id))));
  }
  const again = build(); assert.equal(JSON.stringify(again.judges), JSON.stringify(base.judges), 'deterministic');
});

test('symbols: replaced in the E1 exam items (corporate-law 12, surface-tension 15, plastic 9); developer-screen exam items keep theirs; plastic 10 keeps ㉮㉯ with a key note', () => {
  for (const [p, n] of [['corporate-law', 12], ['surface-tension-laplace', 15], ['plastic-polymerization', 9]]) { const r = find(p, n); assert.equal(r.key.replaced, true, `${p} ${n}`); assert.ok(!SYMBOLS.test(r.item.stem + r.item.choices.map(c => c.text).join(''))); }
  for (const p of E1_PASSAGES) for (const it of allItems('j1').filter(i => i.passageId === p)) {
    const k = keyOf(it.id), kept = KEEP_SYMBOL_ITEMS.includes(`${p}#${k.realNumber}`);
    if (!kept) assert.ok(!SYMBOLS.test(it.stem + it.choices.map(c => c.text).join('')), `${it.id} has a symbol`);
  }
  const plastic10 = find('plastic-polymerization', 10); assert.ok(SYMBOLS.test(plastic10.item.stem) && SYMBOLS.test(plastic10.item.bogi)); assert.ok(plastic10.key.notes.some(n => /SYMBOLS_KEPT/u.test(n)));
  for (const [p, n] of [['gongsun-long-later-mohists', 11], ['dopamine-motor-control', 12], ['information-asymmetry-free-marketplace', 12], ['mrna-vaccine-lipid-nanoparticle', 18]]) { const r = find(p, n); assert.ok(SYMBOLS.test(r.item.stem), `${p} ${n} stem keeps its symbol`); assert.equal(r.key.replaced, false); }
  // the marks the symbols refer to are present in the passage (developer-screen display text) or the <보기>
  const gong = base.judges.j1.find(p => p.passageId === 'gongsun-long-later-mohists'); assert.ok(gong.paragraphs.join('\n').includes('㉠'));
});

test('stem types come from the table and hasBogi agrees with BOGI_APPLY; generated items use scope / P1 rules', () => {
  let bogiExam = 0;
  for (const [k, v] of Object.entries(base.key.key)) {
    assert.ok(['CONTENT_MATCH', 'CONCEPT', 'COMPARE_TWO', 'BOGI_APPLY', 'METHOD'].includes(v.stemType), k);
    if (v.source === 'EXAM') { assert.equal(v.stemType, Object.entries(STEM_TABLE[k.split('#')[0]]).find(([, ns]) => ns.includes(v.realNumber))[0]); assert.equal(v.hasBogi, v.stemType === 'BOGI_APPLY'); if (v.hasBogi) bogiExam++; }
    if (v.source === 'E1_V3') { assert.equal(v.hasBogi, false); assert.ok(['A2', 'B'].includes(v.condition)); assert.ok(['CONTENT_MATCH', 'CONCEPT'].includes(v.stemType)); }
  }
  assert.equal(bogiExam, 10);
  assert.ok(allItems('j1').filter(i => keyOf(i.id).hasBogi).every(i => i.bogi && i.bogi.length > 0)); assert.ok(allItems('j1').filter(i => !keyOf(i.id).hasBogi).every(i => i.bogi === null));
  assert.equal(Object.values(STEM_TABLE).reduce((a, t) => a + Object.values(t).flat().length, 0), 31);
});

test('E1 v3 answers come from design.json and agree with the items; exam answers are numbers 1-5', () => {
  for (const it of allItems('j1')) assert.ok([1, 2, 3, 4, 5].includes(it.answer), it.id);
  assert.equal(UI_PASSAGES.length + E1_PASSAGES.length, 8);
});

test('with P1 (fake runs): 8 more items, solve-input-p1 files carry passage, stem, bogi and choices but no answer; judge items stay clean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
  try {
    for (const p of E1_PASSAGES) {
      mkdirSync(`${dir}/runs/${p}`, { recursive: true });
      for (const k of ['a', 'b']) writeFileSync(`${dir}/runs/${p}/item-${k}.json`, JSON.stringify({ passageId: p, itemKey: k, stem: `예시 발문 ${k} 적절한 것은?`, bogi: k === 'b' ? '예시 보기 문장이다.' : null, answer: 3,
        choices: [1, 2, 3, 4, 5].map(n => ({ number: n, text: `예시 ${k}${n}`, truth: n === 3 ? 'TRUE' : 'FALSE', onSituation: true, fromFact: 'F1', breaksStep: null, twistType: null })) }));
    }
    const r = write(`${dir}/judge`, { includeP1: true, p1Runs: `${dir}/runs` });
    assert.equal(r.judges.j1.reduce((a, p) => a + p.items.length, 0), 59); assert.equal(Object.values(r.key.key).filter(k => k.source === 'P1').length, 8);
    assert.deepEqual(readdirSync(`${dir}/judge/solve-input-p1`).sort(), E1_PASSAGES.map(p => `${p}.json`).sort());
    for (const p of E1_PASSAGES) {
      const s = JSON.parse(readFileSync(`${dir}/judge/solve-input-p1/${p}.json`, 'utf8'));
      assert.deepEqual(Object.keys(s).sort(), ['items', 'paragraphs', 'passageId']); assert.equal(s.items.length, 2);
      for (const it of s.items) { assert.deepEqual(Object.keys(it).sort(), ['bogi', 'choices', 'id', 'stem']); assert.ok(it.choices.every(c => Object.keys(c).sort().join() === 'number,text')); }
      assert.ok(!JSON.stringify(s).includes('answer') && !JSON.stringify(s).includes('truth') && !JSON.stringify(s).includes('onSituation'));
    }
    assert.deepEqual([...keysDeep(r.judges)].filter(k => FORBIDDEN_KEYS.includes(k)), []);
    const p1 = Object.entries(r.key.key).filter(([, k]) => k.source === 'P1'); assert.deepEqual(p1.map(([, k]) => [k.itemKey, k.stemType, k.hasBogi]).sort(), [['a', 'CONCEPT', false], ['a', 'CONCEPT', false], ['a', 'CONCEPT', false], ['a', 'CONCEPT', false], ['b', 'BOGI_APPLY', true], ['b', 'BOGI_APPLY', true], ['b', 'BOGI_APPLY', true], ['b', 'BOGI_APPLY', true]]);
    for (const p of UI_PASSAGES) assert.equal(JSON.stringify(r.judges.j1.find(x => x.passageId === p)), JSON.stringify(base.judges.j1.find(x => x.passageId === p)), `${p} unchanged by P1`);
    // a P1 item missing (not sent) is skipped and reported
    rmSync(`${dir}/runs/corporate-law/item-a.json`);
    assert.deepEqual(build({ includeP1: true, p1Runs: `${dir}/runs` }).p1Missing, ['corporate-law']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('without --include-p1 no P1 file is read (a nonexistent runs dir is fine)', () => assert.equal(Object.values(build({ includeP1: false, p1Runs: '/nonexistent' }).key.key).filter(k => k.source === 'P1').length, 0));

test('stem direction is in the key only: reason/cause stems are REVERSE, others FORWARD (D-0224)', () => {
  assert.equal(directionOf('㉡의 이유를 추론한 내용으로 가장 적절한 것은?'), 'REVERSE');
  assert.equal(directionOf('윗글에서 알 수 있는 내용으로 적절하지 않은 것은?'), 'FORWARD');
  assert.equal(directionOf('액면가가 1,000원인 주식회사가 무상 증자를 실시하는 경우'), 'FORWARD');
  assert.equal(directionOf('㉡의 원인으로 적절한 것은?'), 'REVERSE');
  assert.equal(find('mrna-vaccine-lipid-nanoparticle', 20).key.direction, 'REVERSE');
  assert.equal(find('surface-tension-laplace', 15).key.direction, 'FORWARD');
  assert.ok(Object.values(base.key.key).every(k => ['FORWARD', 'REVERSE'].includes(k.direction)));
  assert.ok(!JSON.stringify(base.judges).includes('"direction"'));
});
