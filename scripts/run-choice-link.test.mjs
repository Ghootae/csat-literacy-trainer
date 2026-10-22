import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadPassage } from './run-analysis-map-gongsun.mjs';
import { TWIST_TYPES, TWIST_BRANCH, TWIST_KO, typeStability, splitSupplement, supplementSegments, loadQuestion, stemPolarity, isVocabulary, readingGapStats, loadTargets, buildInput, buildRequest, redactImages, validateChoiceLink, exampleOutput, stability, main, summarize, renderReport, OutputSchema, maxOutputTokens } from './run-choice-link.mjs';

const PASSAGE_ID = 'gongsun-long-later-mohists', SET = 'setx', passagesDir = 'packages/pipeline/fixtures/experiments/dialogue/passages';
const { passage } = loadPassage(passagesDir, PASSAGE_ID);
const P1 = passage.paragraphs[0].text, P1Q = P1.slice(0, 10);
const map = {
  passageId: PASSAGE_ID,
  propositions: [{ id: 'P1-1', paragraphId: passage.paragraphs[0].paragraphId, text: '첫 명제' }, { id: 'P2-1', paragraphId: passage.paragraphs[1].paragraphId, text: '둘째 명제' }],
  nodes: [{ id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: passage.paragraphs[0].paragraphId, text: '요지1', childIds: ['P1-1'] }, { id: 'TOP', kind: 'TOP', paragraphId: null, text: '최상위', childIds: ['G1'] }],
  relations: [{ id: 'R1', fromId: 'P2-1', toId: 'P1-1', name: '이름', note: '메모' }],
};
const stance = { stances: [{ id: 'P1-1', kind: 'AUTHOR', holder: null, evidence: 'e', note: '' }, { id: 'P2-1', kind: 'HOLDER', holder: '갑', evidence: 'e', note: '' }] };
const classify = { passageId: PASSAGE_ID, items: [{ id: 'R1', type: 'CAUSE', otherName: '', reason: 'r' }] };
const fixed = { version: 1, items: [{ setId: SET, questionNumber: 11, imageId: 'img_001', transcribedText: null, figureElements: [{ id: 'F1', description: '그림 설명' }] }] };
const PNG = Buffer.from('89504e470d0a1a0a00', 'hex');
const T = '후기 묵가는 이름을 달명이라고 하였다.';

const dbq = (number, stem, choiceTexts, extra = {}) => ({ number, source_title: '제목', source_tags: [], prompt_blocks: [{ type: 'stem', order: 1, text: stem, elements: [], images: [] }, ...(extra.blocks ?? [])],
  choices: choiceTexts.map((text, i) => ({ number: i + 1, label: '', text, elements: [], images: [] })), ...(extra.q ?? {}) });
const imgRef = { image_id: 'img_001', local_path: `assets/${SET}/img_001.png`, mime_type: 'image/png' };
const questions = () => [
  dbq(10, '윗글에 대한 이해로 적절하지 않은 것은?', [T, '둘째 선지', '셋째 선지', '넷째 선지', '다섯째 선지']),
  dbq(11, '<보기>를 이해한 내용으로 적절한 것은?', ['하나', '둘', '셋', '넷', '다섯'], { blocks: [{ type: 'supplement', label: '보기', order: 2, text: '갑: 안녕.\n을: 응.', elements: [], images: [] },
    { type: 'supplement', label: '보기', order: 3, text: '\n', elements: [{ kind: 'image', ...imgRef }], images: [imgRef] }] }),
  dbq(12, '문맥상 ㉠과 바꿔 쓰기에 적절한 것은?', ['a', 'b', 'c', 'd', 'e']),
  dbq(13, '다음 글의 어휘로 알맞은 것은?', ['a', 'b', 'c', 'd', 'e'], { q: { source_tags: ['어휘교체'] } }),
];
const rec = (n, c, withExp = true) => ({ question_number: n, correct_choice: c, official_explanation: withExp ? { detailed_explanation_ko: `요약${n}`, choice_explanations: [1, 2, 3, 4, 5].map(k => ({ choice_number: k, explanation_ko: `해설${n}-${k}` })) } : {} });

function fixture({ answers = [rec(10, 4), rec(11, 2, false)], noImage = false, noClassify = false, noFixed = false, stem10 = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'chlink-')), db = join(dir, 'output');
  for (const d of ['questions', 'passages', `assets/${SET}`]) mkdirSync(join(db, d), { recursive: true });
  writeFileSync(join(db, 'questions', `${SET}.json`), JSON.stringify({ set_id: SET, questions: questions().map(q => stem10 && q.number === 10 ? { ...q, prompt_blocks: [{ ...q.prompt_blocks[0], text: stem10 }] } : q) }));
  writeFileSync(join(db, 'passages', `${SET}.json`), JSON.stringify({ elements: [{ kind: 'paragraph', text: '문단' }, { kind: 'phrase', symbol: '㉠', style: 'underline', text: '밑줄 구간', start: 1, end: 2 }] }));
  if (!noImage) writeFileSync(join(db, 'assets', SET, 'img_001.png'), PNG);
  const answersPath = join(dir, 'answers.json'), mapPath = join(dir, 'map.json'), stancePath = join(dir, 'stance.json'), classifyPath = join(dir, 'classify.json'), targetsPath = join(dir, 'targets.json'), fixedPath = join(dir, 'fixed.json');
  writeFileSync(answersPath, JSON.stringify({ questions: answers }));
  writeFileSync(mapPath, JSON.stringify(map)); writeFileSync(stancePath, JSON.stringify(stance));
  writeFileSync(classifyPath, JSON.stringify(noClassify ? { ...classify, items: [] } : classify)); writeFileSync(fixedPath, JSON.stringify(noFixed ? { items: [] } : fixed));
  writeFileSync(targetsPath, JSON.stringify([{ passageId: PASSAGE_ID, passagesDir, mapPath, stancePath, classifyPath, setId: SET, questionsPath: join(db, 'questions', `${SET}.json`), answersPath, assetsDir: db }]));
  return { dir, db, targetsPath, fixedPath };
}
const load = (f) => loadTargets(f.targetsPath, f.fixedPath)[0];
const freshCtx = () => {
  const f = fixture();
  try { const t = load(f); return { t, ctx: { passageId: PASSAGE_ID, map: t.map, questions: t.questions, paragraphs: t.passage.paragraphs.map(p => p.text) } }; } finally { rmSync(f.dir, { recursive: true, force: true }); }
};
const fresh = () => { const { t, ctx } = freshCtx(); return { t, ctx, out: exampleOutput(PASSAGE_ID, t.questions) }; };
const item = (r, id) => r.items.find(i => i.id === id);

test('supplement split: marker lines stay whole, other lines split into sentences, (단, is a segment', () => {
  const segs = splitSupplement('서론이다. 질문인가? 끝!\n\n(가) 첫째. 둘째.\n◦ 항목 하나.\n갑: 안녕. 잘 가.\n(단, 조건이다.)');
  assert.deepEqual(segs.map(s => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']);
  assert.deepEqual(segs.map(s => s.text), ['서론이다.', '질문인가?', '끝!', '(가) 첫째. 둘째.', '◦ 항목 하나.', '갑: 안녕. 잘 가.', '(단, 조건이다.)']);
  assert.deepEqual(splitSupplement('본문이다. (단, 조건이다.)').map(s => s.text), ['본문이다.', '(단, 조건이다.)']);
});
test('fixed file: transcription replaces text, figure elements appended', () => {
  const t = supplementSegments('\n', { transcribedText: '[과제]\n설명이다.', figureElements: [{ id: 'F1', description: '그림' }] });
  assert.deepEqual(t, [{ id: 'S1', kind: 'TEXT', text: '[과제]', marks: [] }, { id: 'S2', kind: 'TEXT', text: '설명이다.', marks: [] }, { id: 'F1', kind: 'FIGURE', text: '그림', marks: [] }]);
  assert.deepEqual(supplementSegments('원문이다.', { transcribedText: null, figureElements: [] }), [{ id: 'S1', kind: 'TEXT', text: '원문이다.', marks: [] }]);
  assert.deepEqual(supplementSegments('원문이다.', { transcribedText: '전사다.' }, [{ symbol: 'ⓐ', text: '원문', start: 0, end: 2 }]).map(x => x.marks), [[]], 'transcription -> marks []');
});
test('load: vocabulary excluded, explanations joined (null when absent), classify types attached, image markers, redaction', () => {
  const f = fixture();
  try {
    const t = load(f), [q10, q11] = t.questions;
    assert.deepEqual(t.questions.map(q => q.number), [10, 11]);
    assert.deepEqual(Object.keys(q10), ['number', 'stem', 'supplementSegments', 'choices', 'answer', 'explanationSummary']);
    assert.equal(q10.explanationSummary, '요약10'); assert.equal(q10.choices[0].explanation, '해설10-1');
    assert.equal(q11.explanationSummary, null); assert.equal(q11.choices[0].explanation, null);
    assert.deepEqual(q11.supplementSegments.map(s => [s.id, s.kind]), [['S1', 'TEXT'], ['S2', 'TEXT'], ['F1', 'FIGURE']]);
    assert.equal(t.map.relations[0].relationType, 'CAUSE');
    assert.deepEqual(q10.choices.map(c => c.truth), ['TRUE', 'TRUE', 'TRUE', 'FALSE', 'TRUE'], 'SELECT_INCORRECT: answer FALSE');
    assert.deepEqual(q11.choices.map(c => c.truth), ['FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE'], 'SELECT_CORRECT: answer TRUE');
    assert.ok(q11.supplementSegments.every(sg => Array.isArray(sg.marks)));
    const input = buildInput(t.passage, t.map, t.stances, t.passageMarks, t.questions), req = buildRequest('x', input, t.images);
    assert.equal(input.map.relations[0].relationType, 'CAUSE');
    assert.equal(req.input[0].content[1].text, '[IMAGE q11 img_001]'); assert.equal(req.input[0].content[2].detail, 'high');
    assert.equal(req.max_output_tokens, 12000); assert.equal(maxOutputTokens(10), 32000);
    const red = JSON.stringify(redactImages(req));
    assert.ok(!red.includes(PNG.toString('base64')));
    assert.ok(red.includes(`<base64 생략, ${PNG.length} bytes, ${createHash('sha256').update(PNG).digest('hex')}>`));
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test('stops: missing answer, missing image, relation missing in classify, unfixed supplement figure', () => {
  const run = (opts, re) => { const f = fixture(opts); try { assert.throws(() => load(f), re); } finally { rmSync(f.dir, { recursive: true, force: true }); } };
  run({ answers: [rec(10, 4)] }, /ANSWER_MISSING: question 11/);
  run({ noImage: true }, /IMAGE_MISSING/);
  run({ noClassify: true }, /CLASSIFY_MISSING/);
  run({ noFixed: true }, /FIGURE_UNFIXED/);
  run({ stem10: '윗글에 대한 설명으로 옳은 것은?' }, /POLARITY_OTHER: question 10/);
});
test('stemPolarity rule', () => {
  assert.equal(stemPolarity('이해로 적절하지 않은 것은?'), 'SELECT_INCORRECT');
  assert.equal(stemPolarity('가장 적절한 것은?'), 'SELECT_CORRECT');
  assert.equal(stemPolarity('옳은 것은?'), 'OTHER');
  assert.equal(stemPolarity('윗글의 내용과 일치하지 않는 것은?'), 'SELECT_INCORRECT');
  assert.equal(stemPolarity('윗글의 내용과 일치하는 것은?'), 'SELECT_CORRECT');
  assert.equal(stemPolarity('<보기>를 바탕으로 이해한 내용으로 적절하지 않은 것은?'), 'SELECT_INCORRECT', 'UI-style stem keeps its v3 polarity');
});
test('stemPolarity regression: UI passage questions keep their v3 polarity (real DB stems)', () => {
  const dir = '/Users/mac/Projects/suneung_db/output/questions';
  if (!existsSync(dir)) return;
  const v3 = stem => stem.includes('적절하지 않은') ? 'SELECT_INCORRECT' : /적절한/u.test(stem) ? 'SELECT_CORRECT' : 'OTHER';
  const targets = JSON.parse(readFileSync('docs/experiments/choice-link-2026-10-22/targets-ui.json', 'utf8'));
  let n = 0;
  for (const t of targets) for (const q of JSON.parse(readFileSync(t.questionsPath, 'utf8')).questions.filter(x => !isVocabulary(x))) {
    const stem = q.prompt_blocks.filter(b => b.type === 'stem').map(b => b.text.trim()).join('\n');
    assert.equal(stemPolarity(stem), v3(stem), `${t.passageId} q${q.number}`); n++;
  }
  assert.equal(n, 24);
});
test('twist constants: 15 types in order, every type has a branch and a Korean name', () => {
  assert.deepEqual(TWIST_TYPES, ['NEGATION', 'DIRECTION', 'SUBSTITUTION', 'CONFLATION', 'CAUSE_SWAP', 'WRONG_REASON', 'CONDITION_SHIFT', 'HOLDER_SWAP', 'PAIR_SWAP', 'ABSOLUTIZE', 'SCOPE_EXTEND', 'DEGREE', 'ADDED_CONTENT', 'ADDED_METHOD', 'OTHER']);
  for (const t of TWIST_TYPES) { assert.ok(TWIST_BRANCH[t] !== undefined, t); assert.ok(TWIST_KO[t], t); }
  assert.deepEqual([TWIST_BRANCH.NEGATION, TWIST_BRANCH.CAUSE_SWAP, TWIST_BRANCH.PAIR_SWAP, TWIST_BRANCH.DEGREE, TWIST_BRANCH.ADDED_METHOD, TWIST_BRANCH.OTHER], [1, 2, 3, 4, 5, '기타']);
});

// Real gongsun q12 supplement block (set 69c011fd78128b2a9beddd5e).
const G12 = '갑: (옷을 하나 들고 옷장을 보면서 한숨을 쉬고) 옷이 없어.\n을: 지금 네가 들고 있는 옷은 뭐니? 옷장 안에 옷이 이렇게 많은데 무슨 옷이 없어?\n갑: 내 말은 옷이 정말 없다는 게 아니라, 빨간 옷이 필요한데 없다는 말이었어.\n을: 아, 그런 뜻이었구나.';
const gel = [[0, 35, null], [29, 30, 'ⓐ'], [36, 84, null], [51, 52, 'ⓑ'], [78, 79, 'ⓒ'], [85, 130, null], [93, 94, 'ⓓ'], [110, 114, 'ⓔ'], [131, 146, null]]
  .map(([start, end, symbol]) => symbol ? { kind: 'phrase', start, end, symbol, style: 'underline', text: G12.slice(start, end) } : { kind: 'paragraph', start, end, text: G12.slice(start, end) });
const g12 = (text, elements) => ({ ...dbq(12, '<보기>의 ⓐ~ⓔ에 대한 설명으로 적절하지 않은 것은?', ['a', 'b', 'c', 'd', 'e'], { blocks: [{ type: 'supplement', label: '보기', order: 2, text, elements, images: [] }] }) });
test('marks: gongsun q12 block maps symbols to segment-local positions (ⓐ S1, ⓑⓒ S2, ⓓⓔ S3)', () => {
  const { question } = loadQuestion(g12(G12, gel), rec(12, 1), '/none', SET, []);
  const segs = question.supplementSegments;
  assert.deepEqual(segs.map(sg => sg.id), ['S1', 'S2', 'S3', 'S4']);
  assert.deepEqual(segs.map(sg => sg.marks.map(m => m.symbol).join('')), ['ⓐ', 'ⓑⓒ', 'ⓓⓔ', '']);
  for (const sg of segs) for (const m of sg.marks) assert.equal(sg.text.slice(m.start, m.end), m.text);
  assert.deepEqual(segs[0].marks, [{ symbol: 'ⓐ', text: '옷', start: 29, end: 30 }]);
  assert.deepEqual(segs[2].marks.map(m => m.text), ['옷', '빨간 옷']);
  // leading whitespace in the block text shifts offsets: trimmed text must still line up
  const shifted = loadQuestion(g12('  ' + G12, gel.map(e => ({ ...e, start: e.start + 2, end: e.end + 2 }))), rec(12, 1), '/none', SET, []);
  assert.deepEqual(shifted.question.supplementSegments.map(sg => sg.marks), segs.map(sg => sg.marks));
});
test('marks: crossing a segment boundary or a wrong offset stops', () => {
  const cross = [...gel.slice(0, 1), { kind: 'phrase', start: 30, end: 40, symbol: 'ⓐ', text: G12.slice(30, 40) }];
  assert.throws(() => loadQuestion(g12(G12, cross), rec(12, 1), '/none', SET, []), /MARK_SPLIT/);
  const wrong = gel.map(e => e.symbol === 'ⓐ' ? { ...e, text: '옷이' } : e);
  assert.throws(() => loadQuestion(g12(G12, wrong), rec(12, 1), '/none', SET, []), /MARK_MISMATCH/);
  const tooEarly = gel.map(e => e.symbol === 'ⓐ' ? { ...e, start: -1 } : e);
  assert.throws(() => loadQuestion(g12('  ' + G12, tooEarly), rec(12, 1), '/none', SET, []), /MARK_OFFSET/);
});
test('marks: second supplement block offsets are relative to the joined text', () => {
  const blocks = [{ type: 'supplement', order: 2, text: '앞 글이다.', elements: [], images: [] },
    { type: 'supplement', order: 3, text: '(가) 뒤 글이다.', elements: [{ kind: 'phrase', start: 6, end: 7, symbol: 'ⓐ', text: '글', style: 'underline' }], images: [] }];
  const { question } = loadQuestion(dbq(12, '적절한 것은?', ['a', 'b', 'c', 'd', 'e'], { blocks }), rec(12, 1), '/none', SET, []);
  assert.deepEqual(question.supplementSegments.map(sg => [sg.id, sg.marks.length]), [['S1', 0], ['S2', 1]]);
  assert.deepEqual(question.supplementSegments[1].marks[0], { symbol: 'ⓐ', text: '글', start: 6, end: 7 });
});

test('example output passes and parses against the schema', () => {
  const { out, ctx } = fresh();
  assert.doesNotThrow(() => OutputSchema.parse(out));
  assert.equal(validateChoiceLink(out, ctx).allPass, true);
});
test('validation 1: question and choice numbers', () => {
  const a = fresh(); a.out.questions.pop();
  assert.equal(item(validateChoiceLink(a.out, a.ctx), 1).pass, false);
  const c = fresh(); c.out.questions[0].choices.pop();
  assert.equal(item(validateChoiceLink(c.out, c.ctx), 1).pass, false);
});
test('validation 2: cover, overlap, gap of 3 hangul fails and 2 passes, whitespace-normalized info', () => {
  const run = parts => { const x = fresh(); x.out.questions[0].choices[0].parts = parts.map(quote => ({ ...x.out.questions[0].choices[0].parts[0], quote, choiceQuote: '', twisted: false, twistType: null, twistDetail: '' })); return item(validateChoiceLink(x.out, x.ctx), 2); };
  assert.equal(run(['후기 묵가는', '이름을 달명이라고 하였다.']).pass, true);
  assert.equal(run(['묵가는 이름을 달명이라고 하였다.']).pass, true, 'leading gap "후기" (2 hangul)');
  assert.equal(run(['후기 묵가는', '달명이라고 하였다.']).pass, false, 'gap "이름을" (3 hangul)');
  assert.equal(run(['후기 묵가는', '을 달명이라고 하였다.']).pass, true, 'gap "이름" (2 hangul)');
  assert.equal(run(['후기 묵가는 이름을', '이름을 달명이라고 하였다.']).pass, false, 'overlap');
  assert.equal(run(['후기 묵가는 이름을']).pass, false, 'trailing gap');
  assert.equal(run(['없는 말']).pass, false);
  const r = run(['후기  묵가는 이름을 달명이라고 하였다.']); assert.equal(r.pass, true); assert.match(r.info[0], /whitespace-normalized/);
});
test('validation 3: extra segments', () => {
  const ok = fresh(); ok.out.questions[1].extraSegments = [{ id: 'S1a', parentId: 'S1', quote: '갑' }];
  assert.equal(item(validateChoiceLink(ok.out, ok.ctx), 3).pass, true);
  for (const e of [{ id: 'S1', parentId: 'S1', quote: '갑' }, { id: 'S1a', parentId: 'S9', quote: '갑' }, { id: 'S1a', parentId: 'S1', quote: '없음' }]) {
    const x = fresh(); x.out.questions[1].extraSegments = [e];
    assert.equal(item(validateChoiceLink(x.out, x.ctx), 3).pass, false);
  }
});
test('validation 4: id existence, source and operation rules', () => {
  const set = mut => { const x = fresh(); const p = x.out.questions[1].choices[0].parts[0]; p.twisted = false; p.twistType = null; p.twistDetail = ''; p.choiceQuote = ''; mut(p); return item(validateChoiceLink(x.out, x.ctx), 4); };
  const ok = p => Object.assign(p, { source: 'PASSAGE', supportIds: ['P1-1'] });
  assert.equal(set(ok).pass, true);
  assert.equal(set(p => Object.assign(p, { source: 'PASSAGE', supportIds: ['P9'] })).pass, false, 'unknown id');
  assert.equal(set(p => Object.assign(p, { source: 'PASSAGE', supportIds: ['S1'] })).pass, false, 'PASSAGE with supplement id');
  assert.equal(set(p => Object.assign(p, { source: 'PASSAGE', supportIds: ['P1-1'], contextIds: ['S1'] })).pass, true, 'v5: PASSAGE may carry supplement contextIds');
  assert.equal(set(p => Object.assign(p, { source: 'PASSAGE', supportIds: ['P1-1'], contextIds: ['S9'] })).pass, false, 'unknown context id');
  assert.equal(set(p => Object.assign(p, { source: 'SUPPLEMENT', supportIds: ['S1'] })).pass, true);
  assert.equal(set(p => Object.assign(p, { source: 'SUPPLEMENT', supportIds: ['S1'], contextIds: ['P1-1'] })).pass, true, 'v5: SUPPLEMENT may carry map contextIds');
  assert.equal(set(p => Object.assign(p, { source: 'SUPPLEMENT', supportIds: ['P1-1'] })).pass, false);
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', supportIds: ['P1-1'] })).pass, false);
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', supportIds: ['P1-1', 'F1'] })).pass, true);
  assert.equal(set(p => Object.assign(p, { source: 'NONE', contextIds: ['G1'] })).pass, true, 'NONE may carry contextIds (map id)');
  assert.equal(set(p => Object.assign(p, { source: 'NONE', contextIds: ['S1'] })).pass, true, 'NONE may carry contextIds (supplement id)');
  assert.equal(set(p => Object.assign(p, { source: 'NONE', contextIds: ['Z9'] })).pass, false, 'NONE contextIds still must exist');
  assert.equal(set(p => Object.assign(p, { source: 'NONE', supportIds: ['G1'] })).pass, false, 'NONE with supportIds');
  assert.equal(set(p => Object.assign(p, { source: 'NONE', inferenceBasisIds: ['G1'] })).pass, false, 'NONE with inferenceBasisIds');
  assert.equal(set(p => Object.assign(p, { source: 'NONE', twistTargetIds: ['G1'] })).pass, false, 'NONE with twistTargetIds');
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', supportIds: ['P1-1', 'S1'], operation: 'APPLY' })).pass, true);
  assert.equal(set(p => Object.assign(p, { source: 'PASSAGE', supportIds: ['P1-1'], operation: 'APPLY' })).pass, false);
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', supportIds: ['P1-1'], contextIds: ['S1'], operation: 'APPLY' })).pass, false, 'APPLY support needs both sides in supportIds');
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', supportIds: ['S1'], contextIds: ['P1-1'], operation: 'APPLY' })).pass, false);
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', twisted: true, twistTargetIds: ['S1'], contextIds: ['P1-1'], operation: 'APPLY' })).pass, true, 'twisted APPLY: targets+context cover both');
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', twisted: true, twistTargetIds: ['S1', 'P1-1'], operation: 'APPLY' })).pass, true);
  assert.equal(set(p => Object.assign(p, { source: 'BOTH', twisted: true, twistTargetIds: ['S1'], supportIds: ['P1-1'], operation: 'APPLY' })).pass, false, 'twisted APPLY ignores supportIds');
  assert.equal(set(p => Object.assign(p, { operation: 'INFER', source: 'PASSAGE', supportIds: ['P1-1'] })).pass, false, 'INFER with source needs inferenceBasisIds');
  assert.equal(set(p => Object.assign(p, { operation: 'INFER' })).pass, true, 'INFER with source NONE is exempt');
  assert.equal(set(p => Object.assign(p, { operation: 'INFER', inferenceBasisIds: ['P1-1'], source: 'PASSAGE' })).pass, true);
});
test('validation 5: twist fields, evidenceQuote in passage/supplement, relationTypeChange, NONE twist, readingGap note', () => {
  const twist = mut => { const x = fresh(); const p = x.out.questions[0].choices[0].parts[0]; Object.assign(p, { twisted: true, source: 'PASSAGE', twistTargetIds: ['R1'], contextIds: ['P1-1'], twistType: 'CAUSE_SWAP', twistDetail: '원인을 바꿈', evidenceQuote: P1Q, choiceQuote: '달명' }); mut(p); return item(validateChoiceLink(x.out, x.ctx), 5); };
  assert.equal(twist(() => {}).pass, true);
  assert.equal(twist(p => { p.evidenceQuote = '지어낸 문장'; }).pass, false);
  assert.equal(twist(p => { p.evidenceQuote = P1Q.replace(/ /u, '  '); }).info?.length > 0, true, 'normalized evidence is info');
  assert.equal(twist(p => { p.twistTargetIds = []; }).pass, false);
  assert.equal(twist(p => { p.twistType = null; }).pass, false, 'twisted without twistType');
  assert.equal(twist(p => { p.twistDetail = ' '; }).pass, false, 'twisted without twistDetail');
  assert.equal(twist(p => { p.choiceQuote = '선지에 없음'; }).pass, false);
  assert.equal(twist(p => { p.supportIds = ['P1-1']; }).pass, false);
  assert.equal(twist(p => { p.relationTypeChange = { original: 'CAUSE', claimed: 'CONTRAST' }; }).pass, true);
  assert.equal(twist(p => { p.relationTypeChange = { original: 'GROUNDS', claimed: 'CONTRAST' }; }).pass, false);
  assert.equal(twist(p => { p.twistTargetIds = ['P1-1']; p.relationTypeChange = { original: 'CAUSE', claimed: 'CONTRAST' }; }).pass, false);
  const none = mut => twist(p => { Object.assign(p, { source: 'NONE', twistTargetIds: [], contextIds: [], evidenceQuote: '' }); mut(p); });
  assert.equal(none(() => {}).pass, true, 'NONE twist needs no evidence');
  assert.equal(none(p => { p.contextIds = ['G1']; }).pass, true, 'NONE twist may carry contextIds');
  assert.equal(none(p => { p.twistTargetIds = ['P1-1']; }).pass, false);
  assert.equal(none(p => { p.evidenceQuote = P1Q; }).pass, false);
  assert.equal(none(p => { p.twistType = null; }).pass, false);
  assert.equal(none(p => { p.choiceQuote = ''; }).pass, false);
  const sup = fresh(); Object.assign(sup.out.questions[1].choices[0].parts[0], { twisted: true, source: 'SUPPLEMENT', twistTargetIds: ['S1'], twistType: 'SUBSTITUTION', twistDetail: 'n', evidenceQuote: '갑: 안녕.', choiceQuote: '하나' });
  assert.equal(item(validateChoiceLink(sup.out, sup.ctx), 5).pass, true, 'supplement evidence');
  const nt = fresh(); Object.assign(nt.out.questions[0].choices[1].parts[0], { source: 'PASSAGE', supportIds: [] });
  assert.equal(item(validateChoiceLink(nt.out, nt.ctx), 5).pass, false, 'not twisted needs supportIds');
  const nt2 = fresh(); nt2.out.questions[0].choices[1].parts[0].twistType = 'OTHER';
  assert.equal(item(validateChoiceLink(nt2.out, nt2.ctx), 5).pass, false);
  const nt3 = fresh(); nt3.out.questions[0].choices[1].parts[0].twistDetail = 'x';
  assert.equal(item(validateChoiceLink(nt3.out, nt3.ctx), 5).pass, false, 'not twisted with twistDetail');
  const gap = (readingGap, note) => { const x = fresh(); Object.assign(x.out.questions[0].choices[1], { readingGap, note }); return item(validateChoiceLink(x.out, x.ctx), 5); };
  assert.equal(gap('IMPLICIT_PREMISE', '').pass, false, 'readingGap without note');
  assert.equal(gap('STRICT_READING', '엄격히 읽음').pass, true);
  assert.equal(gap('NONE', '').pass, true);
});
test('validation 6: input truth drives twisted parts; stemPolarity must match the code rule', () => {
  const v6 = mut => { const x = fresh(); mut(x.out); return item(validateChoiceLink(x.out, x.ctx), 6); };
  assert.equal(v6(() => {}).pass, true);
  assert.equal(v6(o => { o.questions[0].choices[3].parts[0].twisted = false; }).pass, false, 'input FALSE without twisted part');
  assert.match(v6(o => { o.questions[0].choices[3].parts[0].twisted = false; }).violations[0], /input truth FALSE/);
  assert.equal(v6(o => { o.questions[0].choices[0].parts[0].twisted = true; }).pass, false, 'input TRUE with twisted part');
  assert.equal(v6(o => { o.questions[0].stemPolarity = 'SELECT_CORRECT'; }).pass, false, 'polarity != code');
  assert.equal(v6(o => { o.questions[1].stemPolarity = 'OTHER'; }).pass, false);
});
test('review marks: READING_GAP with kind, EXPLANATION_DIFFER, NOTE, NONE_TWIST, NONE_UNTWISTED, MULTI_TWIST', () => {
  const x = fresh(); const q = x.out.questions[0];
  Object.assign(q.choices[3], { readingGap: 'IMPLICIT_PREMISE', note: '전제' }); q.choices[1].explanationAgreement = 'DIFFER'; q.choices[2].note = '메모';
  q.choices[3].parts.push({ ...q.choices[3].parts[0] }); // two twisted NONE parts
  const rev = validateChoiceLink(x.out, x.ctx).review, kinds = rev.map(e => e.kind);
  for (const k of ['READING_GAP', 'EXPLANATION_DIFFER', 'NOTE', 'NONE_TWIST', 'NONE_UNTWISTED', 'MULTI_TWIST', 'TWIST_OTHER']) assert.ok(kinds.includes(k), k);
  assert.deepEqual(rev.find(e => e.kind === 'READING_GAP'), { kind: 'READING_GAP', at: 'q10#4', readingGap: 'IMPLICIT_PREMISE' });
  assert.ok(!kinds.includes('ANSWER_CONFLICT'));
  assert.equal(item(validateChoiceLink(x.out, x.ctx), 5).pass, true, 'untwisted NONE is a review mark, not a violation');
});

const mk = (key, run, mutate) => { const { t } = freshCtx(); const out = exampleOutput(PASSAGE_ID, t.questions); mutate?.(out); return { key, run, passageId: PASSAGE_ID, questions: t.questions, out, validation: null }; };
test('stability across runs: FALSE choices only, twistTargetIds union, intersection of all runs', () => {
  const tgt = (c, ids) => o => { o.questions[c[0]].choices[c[1]].parts[0].twistTargetIds = ids; };
  const both = (...fs) => o => fs.forEach(f => f(o));
  const r1 = mk('k', 1, both(tgt([0, 3], ['G1']), tgt([1, 0], ['P1-1']))), r2 = mk('k', 2, both(tgt([0, 3], ['G1', 'P1-1']), tgt([1, 0], ['G1']))), r3 = mk('k', 3, both(tgt([0, 3], ['P1-1', 'G1']), tgt([1, 0], ['R1'])));
  const st = stability([r1, r2, r3]);
  assert.equal(st.choices, 5, 'q10#4 and q11#1,3,4,5 are FALSE'); assert.equal(st.allSame, 3); assert.equal(st.atLeastTwoSame, 4);
  assert.equal(st.noneOnly, 3, 'q11#3,4,5 empty in every run'); assert.equal(st.changedChoices, 2);
  assert.equal(st.allSameOfChanged, 0); assert.equal(st.atLeastTwoSameOfChanged, 1); assert.equal(st.atLeastTwoSameOfChangedPct, '50.0%'); assert.equal(st.intersectionNonEmptyOfChangedPct, '50.0%');
  assert.equal(st.intersectionNonEmpty, 1); assert.equal(st.intersectionNonEmptyPct, '20.0%'); assert.equal(st.allSamePct, '60.0%');
  assert.deepEqual(st.mismatches.map(m => [m.question, m.choice]), [[10, 4], [11, 1]]);
  assert.deepEqual(st.mismatches[1].runs.map(r => r.targets), [['P1-1'], ['G1'], ['R1']]);
  assert.equal(stability([r1]).choices, 0);
  const merged = mk('k', 1, o => { o.questions[0].choices[3].parts.push({ ...o.questions[0].choices[3].parts[0], twistTargetIds: ['G1'] }); });
  assert.deepEqual(stability([merged, mk('k', 2)]).mismatches[0].runs[0].targets, ['G1']);
  const trueOnly = stability([mk('k', 1, tgt([0, 0], ['G1'])), mk('k', 2)]);
  assert.equal(trueOnly.choices, 5); assert.equal(trueOnly.allSame, 5, 'TRUE choices are not compared');
});
test('readingGap stats: counts per kind and runs with a gap per choice', () => {
  const gap = (c, g) => o => { o.questions[0].choices[c].readingGap = g; };
  const st = readingGapStats([mk('k', 1, gap(0, 'IMPLICIT_PREMISE')), mk('k', 2, gap(0, 'STRICT_READING')), mk('k', 3)]);
  assert.deepEqual(st.byKind, { NONE: 28, IMPLICIT_PREMISE: 1, STRICT_READING: 1 });
  assert.deepEqual(st.perChoice, [{ key: 'k', question: 10, choice: 1, runsWithGap: 2, kinds: ['r1 IMPLICIT_PREMISE', 'r2 STRICT_READING'] }]);
});

const fakeTransport = (usage = { input_tokens: 1000, output_tokens: 500 }, mutate) => ({ calls: 0, async create(req) {
  this.calls++;
  const input = JSON.parse(req.input[0].content[0].text), out = exampleOutput(input.passageId, input.questions);
  mutate?.(out, this.calls);
  return { id: 'resp', model: 'm', status: 'completed', usage, output: [], output_text: JSON.stringify(out) };
} });

test('--runs: r<k> folders, request count, summary and report v3, RUN_EXISTS', async () => {
  const f = fixture();
  try {
    const t = fakeTransport(undefined, (o, n) => { if (n === 3) o.questions[0].choices[3].parts[0].twistTargetIds = ['P1-1']; }), out = join(f.dir, 'out');
    const r = await main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out, transport: t, runs: 3 });
    assert.equal(t.calls, 3); assert.equal(r.requests, 3); assert.equal(r.protectedFilesUnchanged, true);
    for (const k of [1, 2, 3]) for (const n of ['choice-link.raw.json', 'choice-link.json', 'choice-link.validation.json']) assert.ok(existsSync(join(out, PASSAGE_ID, `r${k}`, n)), `r${k}/${n}`);
    const s = JSON.parse(readFileSync(join(out, 'summary.json'), 'utf8'));
    assert.equal(s.requestsParsed, 3); assert.equal(s.questions, 2); assert.equal(s.choices, 10); assert.equal(s.perRun.length, 3);
    assert.equal(s.sourceOperation['NONE|RESTATE'], 30); assert.deepEqual(s.twistTypes.byType, [['OTHER', 15]]); assert.deepEqual(s.twistTypes.byBranch, [['기타', 15]]);
    assert.equal(s.twistTypes.other.count, 15); assert.equal(s.twistTypes.other.details[0], '예시 비틂'); assert.equal(s.typeStability.choices, 5);
    assert.equal(s.stability.mismatches.length, 1);
    const report = readFileSync(join(out, 'REPORT.md'), 'utf8');
    assert.ok(report.includes('회차 간 안정성') && report.includes('예시 비틂') && report.includes('종류 안정성') && report.includes('twistType 빈도') && report.includes('readingGap 분포'));
    await assert.rejects(main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out, transport: fakeTransport() }), /RUN_EXISTS/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test('max-requests counts all runs; usd cap stops; --round re-sends one run into r<k>-rerun', async () => {
  const f = fixture();
  try {
    const t = fakeTransport(), r = await main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'o1'), transport: t, runs: 3, limits: { maxRequests: 2, usdCap: 6 } });
    assert.equal(t.calls, 2); assert.match(r.stop, /max requests/); assert.deepEqual(r.results.map(x => x.requestStatus), ['PARSED', 'PARSED', 'NOT_SENT']);
    const dry = await main({ dryRun: true, targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'dry'), runs: 3, limits: { maxRequests: 2, usdCap: 6 } });
    assert.equal(dry.requests, 3); assert.equal(dry.overMaxRequests, true); assert.equal(dry.externalRequests, 0); assert.equal(dry.exampleAllPass, true);
    assert.deepEqual([dry.perPassage[0].questions, dry.perPassage[0].choices, dry.perPassage[0].supplementSegments, dry.perPassage[0].marks, dry.perPassage[0].images], [2, 10, 3, 0, 1]);
    assert.ok(Math.abs(dry.totalReserveUsd - 3 * dry.perPassage[0].reserveUsdPerRequest) < 1e-12);
    assert.ok(!readFileSync(join(f.dir, 'dry', PASSAGE_ID, 'dry-run.request.json'), 'utf8').includes(PNG.toString('base64')));
    const cap = dry.perPassage[0].reserveUsdPerRequest + 0.01, t2 = fakeTransport({ input_tokens: 0, output_tokens: 12000 });
    const r2 = await main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'o2'), transport: t2, runs: 2, limits: { maxRequests: 18, usdCap: cap } });
    assert.equal(t2.calls, 1); assert.match(r2.stop, /usd cap/);
    const t3 = fakeTransport(), r3 = await main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'o1'), transport: t3, runs: 3, round: 3 });
    assert.equal(t3.calls, 1); assert.equal(r3.results[0].run, 3);
    assert.ok(existsSync(join(f.dir, 'o1', PASSAGE_ID, 'r3-rerun', 'choice-link.json'))); assert.ok(existsSync(join(f.dir, 'o1', 'ledger-rerun-3.jsonl')));
    await assert.rejects(main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'o1'), transport: fakeTransport(), runs: 3, round: 3 }), /RUN_EXISTS/);
    await assert.rejects(main({ targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'o4'), transport: fakeTransport(), runs: 3, round: 4 }), /ROUND/);
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test('summarize and report handle a missing output', () => {
  const ok = mk('k', 1); ok.validation = validateChoiceLink(ok.out, freshCtx().ctx);
  const s = summarize([ok, { key: 'k', run: 2, out: null }]);
  assert.equal(s.requestsParsed, 1);
  assert.ok(renderReport([ok, { key: 'k', run: 2, out: null }], s).includes('결과 없음'));
});

// (가)/(나) section sets: two passages merged into one input with "<label>." id prefixes.
function sectionFixture(labels = ['가', '나'], ids = [PASSAGE_ID, 'dopamine-motor-control']) {
  const f = fixture(), targets = JSON.parse(readFileSync(f.targetsPath, 'utf8')), base = targets[0];
  const sections = ids.map((passageId, i) => {
    const m = { ...map, passageId, propositions: map.propositions.map(p => ({ ...p })) }, mapPath = join(f.dir, `map${i}.json`), stancePath = join(f.dir, `stance${i}.json`), classifyPath = join(f.dir, `classify${i}.json`);
    writeFileSync(mapPath, JSON.stringify(m)); writeFileSync(stancePath, JSON.stringify(stance)); writeFileSync(classifyPath, JSON.stringify(classify));
    return { label: labels[i], passageId, passagesDir, mapPath, stancePath, classifyPath };
  });
  const { passageId: _p, mapPath: _m, stancePath: _s, classifyPath: _c, ...rest } = base;
  writeFileSync(f.targetsPath, JSON.stringify([{ ...rest, key: 'set-ab', sections }]));
  return f;
}
test('sections: merged input has section on paragraphs, prefixed ids, relation endpoints and childIds, classify matched before prefixing', () => {
  const f = sectionFixture();
  try {
    const t = load(f), input = buildInput(t.passage, t.map, t.stances, t.passageMarks, t.questions);
    assert.equal(t.key, 'set-ab'); assert.equal(input.passageId, 'set-ab');
    const dopa = loadPassage(passagesDir, 'dopamine-motor-control').passage;
    assert.equal(input.paragraphs.length, passage.paragraphs.length + dopa.paragraphs.length);
    assert.deepEqual([...new Set(input.paragraphs.map(p => p.section))], ['가', '나']);
    assert.equal(input.paragraphs[0].section, '가'); assert.equal(input.paragraphs.at(-1).section, '나');
    assert.deepEqual(input.map.propositions.map(p => p.id), ['가.P1-1', '가.P2-1', '나.P1-1', '나.P2-1']);
    assert.deepEqual(input.map.nodes.map(n => [n.id, n.childIds]), [['가.G1', ['P1-1'].map(x => `가.${x}`)], ['가.TOP', ['가.G1']], ['나.G1', ['나.P1-1']], ['나.TOP', ['나.G1']]]);
    assert.deepEqual(input.map.relations.map(r => [r.id, r.fromId, r.toId, r.relationType]), [['가.R1', '가.P2-1', '가.P1-1', 'CAUSE'], ['나.R1', '나.P2-1', '나.P1-1', 'CAUSE']]);
    assert.deepEqual(input.stances.map(x => x.id), ['가.P1-1', '가.P2-1', '나.P1-1', '나.P2-1']);
    assert.ok(Object.keys(t.protectedFiles).filter(p => /map\d|stance\d|classify\d/.test(p)).length === 6, 'protected files of both sections');
    const ctx = { passageId: t.passageId, map: t.map, questions: t.questions, paragraphs: t.passage.paragraphs.map(p => p.text) };
    assert.equal(t.passageId, 'set-ab'); assert.equal(validateChoiceLink(exampleOutput('set-ab', t.questions), ctx).allPass, true);
    const o = exampleOutput('set-ab', t.questions); Object.assign(o.questions[0].choices[0].parts[0], { source: 'PASSAGE', supportIds: ['나.P1-1'] });
    assert.equal(item(validateChoiceLink(o, ctx), 4).pass, true, 'prefixed ids are valid map ids');
    Object.assign(o.questions[0].choices[0].parts[0], { supportIds: ['P1-1'] });
    assert.equal(item(validateChoiceLink(o, ctx), 4).pass, false, 'unprefixed id no longer exists');
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});
test('sections: duplicate paragraph ids or merged map ids stop; targets without sections are unchanged', () => {
  const dupPara = sectionFixture(['가', '나'], [PASSAGE_ID, PASSAGE_ID]);
  try { assert.throws(() => load(dupPara), /DUPLICATE_PARAGRAPH_ID/); } finally { rmSync(dupPara.dir, { recursive: true, force: true }); }
  const dupMap = sectionFixture(['가', '가']);
  try { assert.throws(() => load(dupMap), /DUPLICATE_MAP_ID/); } finally { rmSync(dupMap.dir, { recursive: true, force: true }); }
  const { t } = freshCtx();
  assert.equal(t.map.propositions[0].id, 'P1-1'); assert.equal(t.passage.paragraphs[0].section, undefined); assert.equal(t.key, PASSAGE_ID);
});
test('sections: dry-run runs end to end on a section target', async () => {
  const f = sectionFixture();
  try {
    const dry = await main({ dryRun: true, targetsPath: f.targetsPath, fixedPath: f.fixedPath, out: join(f.dir, 'dry'), runs: 1, limits: { maxRequests: 3, usdCap: 3 } });
    assert.equal(dry.exampleAllPass, true); assert.equal(dry.externalRequests, 0); assert.equal(dry.perPassage[0].passageId, 'set-ab');
    assert.ok(existsSync(join(f.dir, 'dry', 'set-ab', 'dry-run.request.json')));
  } finally { rmSync(f.dir, { recursive: true, force: true }); }
});

test('typeStability: categories, majority types, OTHER-only majority; empty sets count as same', () => {
  const ty = (c, ...types) => o => { const ch = o.questions[c[0]].choices[c[1]]; ch.parts = types.map(t => ({ ...ch.parts[0], twisted: true, twistType: t, twistDetail: 'd' })); };
  const all = (...fs) => o => fs.forEach(f => f(o));
  // choice A=q10#4, B=q11#1, C=q11#3, D=q11#4; q11#5 untouched (OTHER in every run via the example output)
  const r1 = mk('k', 1, all(ty([0, 3], 'NEGATION'), ty([1, 0], 'DEGREE'), ty([1, 2], 'NEGATION', 'DIRECTION'), ty([1, 3], 'OTHER'))),
    r2 = mk('k', 2, all(ty([0, 3], 'NEGATION'), ty([1, 0], 'DEGREE', 'NEGATION'), ty([1, 2], 'NEGATION'), ty([1, 3], 'SUBSTITUTION'))),
    r3 = mk('k', 3, all(ty([0, 3], 'NEGATION'), ty([1, 0], 'ABSOLUTIZE'), ty([1, 2], 'DIRECTION'), ty([1, 3], 'CONFLATION')));
  const st = typeStability([r1, r2, r3]), by = Object.fromEntries(st.items.map(i => [`${i.question}#${i.choice}`, i]));
  assert.equal(st.choices, 5);
  assert.equal(by['10#4'].category, 'ALL_SAME'); assert.deepEqual(by['10#4'].majority, ['NEGATION']);
  assert.equal(by['11#1'].category, 'TWO_SHARE', 'DEGREE in r1,r2 but no type in all three'); assert.deepEqual(by['11#1'].majority, ['DEGREE']);
  assert.equal(by['11#3'].category, 'TWO_SHARE', 'NEGATION r1,r2 / DIRECTION r1,r3 -> no type in all three'); assert.deepEqual(by['11#3'].majority, ['DIRECTION', 'NEGATION']);
  assert.equal(by['11#4'].category, 'DISJOINT'); assert.deepEqual(by['11#4'].majority, ['CONFLATION', 'OTHER', 'SUBSTITUTION']);
  assert.equal(by['11#5'].category, 'ALL_SAME'); assert.deepEqual(by['11#5'].majority, ['OTHER']);
  assert.equal(st.majorityOnlyOther, 1); assert.deepEqual(st.categories, { ALL_SAME: 2, INTERSECTION: 0, TWO_SHARE: 2, DISJOINT: 1 });
  const inter = typeStability([mk('k', 1, ty([1, 3], 'NEGATION', 'DEGREE')), mk('k', 2, ty([1, 3], 'NEGATION')), mk('k', 3, ty([1, 3], 'NEGATION', 'DIRECTION'))]);
  assert.equal(inter.items.find(i => i.question === 11 && i.choice === 4).category, 'INTERSECTION');
  assert.equal(typeStability([r1]).choices, 0, 'single run: nothing to compare');
  assert.ok(renderReport([r1, r2, r3]).includes('다수 종류가 OTHER뿐인 선지 1'));
});
test('TWIST_OTHER review mark and report listing of OTHER details', () => {
  const x = fresh(); const kinds = validateChoiceLink(x.out, x.ctx).review.filter(e => e.kind === 'TWIST_OTHER');
  assert.equal(kinds.length, 5, 'every FALSE choice of the example output (1 + 4)');
  const y = fresh(); for (const q of y.out.questions) for (const c of q.choices) for (const p of c.parts) if (p.twisted) Object.assign(p, { twistType: 'NEGATION' });
  assert.ok(!validateChoiceLink(y.out, y.ctx).review.some(e => e.kind === 'TWIST_OTHER'));
});
