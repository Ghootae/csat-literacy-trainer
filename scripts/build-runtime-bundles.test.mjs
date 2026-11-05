import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stemPolarity, answerChoiceId, officialExplanation, buildAll } from './build-runtime-bundles.mjs';

test('stemPolarity: incorrect-selecting phrases', () => {
  assert.equal(stemPolarity('이해한 내용으로 적절하지 않은 것은?'), 'SELECT_INCORRECT');
  assert.equal(stemPolarity('알 수 있는 내용으로 옳지 않은 것은?'), 'SELECT_INCORRECT');
  assert.equal(stemPolarity('다음 중 틀린 것은?'), 'SELECT_INCORRECT');
  assert.equal(stemPolarity('가장 적절한 것은?'), 'SELECT_CORRECT');
});

test('answerChoiceId: number or string to C<n>', () => {
  assert.equal(answerChoiceId(5), 'C5');
  assert.equal(answerChoiceId('2'), 'C2');
  assert.throws(() => answerChoiceId('x'), /BAD_CORRECT_CHOICE/);
});

test('officialExplanation: full detailed text, newline, answer choice sentence only', () => {
  const record = { question_number: 1, correct_choice: 2, official_explanation: { available: true, detailed_explanation_ko: '상세 해설.', choice_explanations: [{ choice_number: 1, explanation_ko: '일' }, { choice_number: 2, explanation_ko: '이' }] } };
  assert.equal(officialExplanation(record), '상세 해설.\n이');
});

// Synthetic DB: composite passage (가)(나) with a footnote, one symbol range per section, one supplement with a symbol, a second question without supplement.
const para = (order, text, start) => ({ order, text, source_range: { start, end: start + text.length } });
const ga1 = '가 첫째 문단 밑줄 대상이다.', ga2 = '가 둘째 문단.', na1 = '나 첫째 문단 다른 밑줄이다.', note = '* 주: 풀이.';
const g1s = 0, g2s = ga1.length + 1, n1s = g2s + ga2.length + 1, nns = n1s + na1.length + 1;
const full = [ga1, ga2, na1, note].join('\n');
const dbPassage = {
  exam: { title: '합성 지문', label: '시험 라벨', question_range: '1~3' }, full_text: full, images: [],
  sections: [{ label: '(가)', order: 1, paragraphs: [para(1, ga1, g1s), para(2, ga2, g2s)] }, { label: '(나)', order: 2, paragraphs: [para(1, na1, n1s), para(2, note, nns)] }],
  elements: [{ kind: 'phrase', symbol: 'ⓐ', style: 'underline', start: 8, end: 10, text: full.slice(8, 10) }, { kind: 'phrase', symbol: 'ⓑ', style: 'underline', start: n1s + 8, end: n1s + 10, text: full.slice(n1s + 8, n1s + 10) }, { kind: 'phrase', symbol: null, style: 'box', start: 0, end: 1, text: '가' }],
};
const supplementText = '보기 문장 하나.\n보기 둘째 줄 밑줄.';
const dbQuestions = { questions: [
  { number: 1, prompt_blocks: [{ type: 'stem', text: '적절하지 않은 것은?', elements: [] }, { type: 'supplement', text: supplementText, elements: [{ kind: 'phrase', symbol: '㉠', style: 'underline', start: 17, end: 20, text: supplementText.slice(17, 20) }], images: [{ image_id: 'img_001', local_path: 'assets/set1/img_001.png', source_url: 'https://cdn.example/x.png', sha256: 'abc', mime_type: 'image/png', width: 10, height: 20, alt_text: null }] }],
    choices: [1, 2, 3, 4, 5].map(n => ({ number: n, text: `선지${n}` })) },
  { number: 2, prompt_blocks: [{ type: 'stem', text: '가장 적절한 것은?', elements: [] }], choices: [1, 2, 3, 4, 5].map(n => ({ number: n, text: `선지${n}` })) },
] };
const rec = (n, c) => ({ question_number: String(n), correct_choice: c, official_explanation: { available: true, detailed_explanation_ko: `해설${n}.`, choice_explanations: [1, 2, 3, 4, 5].map(k => ({ choice_number: k, explanation_ko: `선지${k} 해설` })) } });
const records = { questions: [rec(1, '4'), rec(2, 3)] };

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'bundles-'));
  mkdirSync(join(root, 'db/passages'), { recursive: true }); mkdirSync(join(root, 'db/questions'), { recursive: true }); mkdirSync(join(root, 'db/assets/set1'), { recursive: true }); mkdirSync(join(root, 'records'));
  writeFileSync(join(root, 'db/passages/set1.json'), JSON.stringify(dbPassage)); writeFileSync(join(root, 'db/questions/set1.json'), JSON.stringify(dbQuestions));
  writeFileSync(join(root, 'db/assets/set1/img_001.png'), 'png'); writeFileSync(join(root, 'records/set1.json'), JSON.stringify(records));
  const entries = [{ passageId: 'syn', setId: 'set1', questions: [1, 2], sections: [{ label: '가', idPrefix: 'ga' }, { label: '나', idPrefix: 'na' }] }];
  const result = buildAll(entries, { dbRoot: join(root, 'db'), recordsDir: join(root, 'records'), outDir: join(root, 'out') });
  return { root, result, out: join(root, 'out') };
}
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

test('buildAll: reference entries, polarity and answer conversion', () => {
  const { root, out, result } = setup();
  try {
    assert.deepEqual(result, { questionCount: 2, passageCount: 1, issues: [] });
    const ref = readJson(join(out, 'runtime-reference.json'));
    assert.equal(ref.schemaVersion, 'source-direct-problem-reference-catalog-v1');
    assert.deepEqual(ref.questions.map(q => [q.questionId, q.stemPolarity, q.answerChoiceId]), [['syn-q1', 'SELECT_INCORRECT', 'C4'], ['syn-q2', 'SELECT_CORRECT', 'C3']]);
    assert.equal(ref.questions[0].officialExplanation, '해설1.\n선지4 해설');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('buildAll: every annotation range equals its source string (passage and scenario)', () => {
  const { root, out } = setup();
  try {
    const q1 = readJson(join(out, 'public/syn-q1.json'));
    assert.deepEqual(q1.choices[0], { choiceId: 'C1', position: 1, text: '선지1' });
    assert.equal(q1.textAnnotations.length, 3);
    for (const a of q1.textAnnotations) {
      const source = a.location === 'PASSAGE' ? q1.passage : q1.scenario;
      assert.equal(source.slice(a.start, a.end), a.text);
      assert.equal(source.slice(a.start - a.contextBefore.length, a.start), a.contextBefore);
    }
    assert.deepEqual(q1.textAnnotations.map(a => [a.marker, a.text]), [['ⓐ', ga1.slice(8, 10)], ['ⓑ', na1.slice(8, 10)], ['㉠', supplementText.slice(17, 20)]]);
    assert.equal(q1.scenario, supplementText);
    assert.equal(readJson(join(out, 'public/syn-q2.json')).scenario, '');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('buildAll: media uses source_url and sha256, file copied locally', () => {
  const { root, out } = setup();
  try {
    const q1 = readJson(join(out, 'public/syn-q1.json'));
    assert.deepEqual(q1.media, [{ mediaId: 'MEDIA1', url: 'https://cdn.example/x.png', mimeType: 'image/png', alt: null, width: 10, height: 20, contentHash: 'abc', placement: { scope: 'SCENARIO', supplementIndex: 0 } }]);
    assert.ok(existsSync(join(out, 'media/syn-q1-img_001.png')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('buildAll: composite passage keeps section prefixes in paragraph ids and footnotes in notes', () => {
  const { root, out } = setup();
  try {
    const p = readJson(join(out, 'passages/syn.json'));
    assert.equal(p.schemaVersion, 'dialogue-passage-v1');
    assert.equal(p.problemQuestionId, 'syn-q1');
    assert.deepEqual(p.paragraphs.map(x => [x.paragraphId, x.position]), [['syn-ga-p1', 1], ['syn-ga-p2', 2], ['syn-na-p1', 3]]);
    assert.deepEqual(p.notes, [note, '연결 문항 전체: syn-q1, syn-q2']);
    assert.deepEqual(p.source, { status: 'exact-local-source', sourceId: 'set1', sourcePath: join(root, 'db/passages/set1.json') });
    assert.equal(readJson(join(out, 'public/syn-q1.json')).passage, ['(가)', ga1, ga2, '(나)', na1, note].join('\n\n'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('buildAll: DB range that does not match source text is reported, not fixed', () => {
  const { root } = setup();
  try {
    const bad = structuredClone(dbPassage); bad.elements[0].text = '틀림';
    writeFileSync(join(root, 'db/passages/set1.json'), JSON.stringify(bad));
    const entries = [{ passageId: 'syn', setId: 'set1', questions: [2], sections: [{ label: '가', idPrefix: 'ga' }, { label: '나', idPrefix: 'na' }] }];
    const r = buildAll(entries, { dbRoot: join(root, 'db'), recordsDir: join(root, 'records'), outDir: join(root, 'out2') });
    assert.equal(r.issues.length, 1);
    assert.equal(r.issues[0].marker, 'ⓐ');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
