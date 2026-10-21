import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importPassage } from './import-suneung-passage.mjs';

const exam = { title: '제목', label: '시험 라벨', question_range: '1~3' };
const para = (order, text) => ({ order, text });
const fixtures = {
  single: { exam, images: [], sections: [{ label: null, order: 1, paragraphs: [para(2, '둘째 문단'), para(1, '첫째 ⓐ 문단')] }] },
  multifn: { exam, images: [], sections: [{ label: '(가)', order: 1, paragraphs: [para(1, '가1'), para(2, '* 가주: 풀이.'), para(3, '가2')] }, { label: '(나)', order: 2, paragraphs: [para(1, '나1'), para(2, '* 나주: 풀이.')] }] },
  multi: { exam, images: [], sections: [{ label: '(나)', order: 2, paragraphs: [para(1, '나1')] }, { label: '(가)', order: 1, paragraphs: [para(1, '가1'), para(2, '가2')] }] },
  img: { exam, images: [{ image_id: 'x' }], sections: [{ label: null, order: 1, paragraphs: [para(1, 'a')] }] },
  nolabel: { exam, images: [], sections: [{ label: null, order: 1, paragraphs: [para(1, 'a')] }, { label: '(나)', order: 2, paragraphs: [para(1, 'b')] }] },
};
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'imp-'));
  for (const [k, v] of Object.entries(fixtures)) writeFileSync(join(dir, `${k}.json`), JSON.stringify(v));
  return dir;
};
const run = (dir, k, outDir = join(dir, 'out')) => importPassage({ setId: k, passageId: `t-${k}`, outDir, dbDir: dir });

test('single section: ordered paragraphs, no section key, text untouched', () => {
  const dir = setup();
  try {
    const r = run(dir, 'single'), p = JSON.parse(readFileSync(r.file, 'utf8'));
    assert.deepEqual(Object.keys(p), ['schemaVersion', 'passageId', 'title', 'exam', 'questionRange', 'source', 'notes', 'paragraphs']);
    assert.equal(p.schemaVersion, 'dialogue-passage-v1'); assert.deepEqual(p.notes, []);
    assert.deepEqual(p.paragraphs, [{ paragraphId: 't-single-p1', position: 1, text: '첫째 ⓐ 문단' }, { paragraphId: 't-single-p2', position: 2, text: '둘째 문단' }]);
    assert.equal(p.source.status, 'suneung-db'); assert.equal(p.source.sourceId, 'single'); assert.match(p.source.sourceFileHash, /^[0-9a-f]{64}$/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('multi section: continuous positions in section order, section labels', () => {
  const dir = setup();
  try {
    const p = JSON.parse(readFileSync(run(dir, 'multi').file, 'utf8'));
    assert.deepEqual(p.paragraphs.map(x => [x.position, x.section, x.text]), [[1, '(가)', '가1'], [2, '(가)', '가2'], [3, '(나)', '나1']]);
    assert.deepEqual(Object.keys(p.paragraphs[0]), ['paragraphId', 'position', 'section', 'text']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('image set and unlabeled multi-section set are rejected', () => {
  const dir = setup();
  try {
    assert.throws(() => run(dir, 'img'), /HAS_IMAGES/);
    assert.throws(() => run(dir, 'nolabel'), /SECTION_LABEL_MISSING/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('existing output is never overwritten', () => {
  const dir = setup();
  try { run(dir, 'single'); assert.throws(() => run(dir, 'single'), /EEXIST/); } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('footnote paragraphs ("* term: gloss") become notes and do not take a position', () => {
  const dir = mkdtempSync(join(tmpdir(), 'imp-'));
  try {
    writeFileSync(join(dir, 'fn.json'), JSON.stringify({ exam, images: [], sections: [{ label: null, order: 1, paragraphs: [para(1, '본문 하나'), para(2, '* 세수: 정부의 수입.'), para(3, '본문 둘')] }] }));
    const p = JSON.parse(readFileSync(run(dir, 'fn').file, 'utf8'));
    assert.deepEqual(p.notes, ['* 세수: 정부의 수입.']);
    assert.deepEqual(p.paragraphs.map(x => [x.position, x.text]), [[1, '본문 하나'], [2, '본문 둘']]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('section option: only that section, renumbered, own notes, title and composite', () => {
  const dir = setup();
  try {
    const p = JSON.parse(readFileSync(importPassage({ setId: 'multifn', passageId: 't-nb', outDir: join(dir, 'out'), dbDir: dir, section: '(나)', pairPassageId: 't-ga' }).file, 'utf8'));
    assert.deepEqual(p.paragraphs, [{ paragraphId: 't-nb-p1', position: 1, text: '나1' }]);
    assert.deepEqual(p.notes, ['* 나주: 풀이.']);
    assert.equal(p.title, '제목 (나)');
    assert.deepEqual(p.composite, { setId: 'multifn', section: '(나)', pairPassageId: 't-ga' });
    const g = JSON.parse(readFileSync(importPassage({ setId: 'multifn', passageId: 't-ga', outDir: join(dir, 'out'), dbDir: dir, section: '(가)' }).file, 'utf8'));
    assert.deepEqual(g.paragraphs.map(x => [x.paragraphId, x.position, x.text]), [['t-ga-p1', 1, '가1'], ['t-ga-p2', 2, '가2']]);
    assert.deepEqual(g.notes, ['* 가주: 풀이.']); assert.equal(g.composite.pairPassageId, null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('section option errors: single-section set and unknown label', () => {
  const dir = setup();
  try {
    assert.throws(() => importPassage({ setId: 'single', passageId: 't-x', outDir: join(dir, 'out'), dbDir: dir, section: '(가)' }), /SECTION_NOT_COMPOSITE/);
    assert.throws(() => importPassage({ setId: 'multi', passageId: 't-y', outDir: join(dir, 'out'), dbDir: dir, section: '(다)' }), /SECTION_NOT_FOUND/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('without section option the output is unchanged (no composite key, original title)', () => {
  const dir = setup();
  try {
    const p = JSON.parse(readFileSync(run(dir, 'multi').file, 'utf8'));
    assert.equal(p.title, '제목'); assert.equal('composite' in p, false);
    assert.deepEqual(Object.keys(p), ['schemaVersion', 'passageId', 'title', 'exam', 'questionRange', 'source', 'notes', 'paragraphs']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
