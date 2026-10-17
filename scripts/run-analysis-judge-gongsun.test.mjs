import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractDialogues, buildRounds, hasCopiedSource, unitsForParagraph, checkQuotes, combineRound, roundChanges, planJobs, parseJudgePrompt,
  buildJudgeInput, buildJudgeRequest, limitCheck, isConnectionError, endCost, nextConnErrStreak, circuitTripped, reserveUsd, usageCost, assemble, renderReport, MAP_PATH, JUDGE_PROMPT_PATH, EXPECTED, LIMITS, JudgmentSchema } from './run-analysis-judge-gongsun.mjs';
import { loadPassage } from './run-analysis-map-gongsun.mjs';

const { passage } = loadPassage();
const map = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const P1 = passage.paragraphs[0].paragraphId, P1TEXT = passage.paragraphs[0].text;

const v4rec = (o = {}) => ({ sessionId: 's1', paragraphId: P1, initialResponse: '첫 응답', turns: [{ call: { provider: 'openai' }, questionShown: null, studentAnswer: null }], ...o });
const shrec = (sessionId, paragraphId, transcript, event = 'STEP') => ({ event, sessionId, passageId: passage.passageId, paragraphId, transcript });
const S = text => ({ role: 'student', text }), T = text => ({ role: 'tutor', text });

test('extraction: mock and exam-phrase records are excluded; unrelated paragraphs ignored', () => {
  const d = extractDialogues([v4rec(), v4rec({ sessionId: 'm', turns: [{ call: { provider: 'mock' } }] }),
    v4rec({ sessionId: 'x', initialResponse: '중심 관계를 이해했습니다' }), v4rec({ sessionId: 'o', paragraphId: 'other-p1' })], [], passage);
  assert.deepEqual(d.map(x => x.dialogueId), ['v4:s1']);
});
test('V4 rounds: null question/answer turns skipped; trailing tutor turn never included', () => {
  const rec = v4rec({ turns: [{ call: { provider: 'openai' }, questionShown: 'Q1', studentAnswer: 'A1' }, { call: { provider: 'openai' }, questionShown: null, studentAnswer: null },
    { call: { provider: 'openai' }, questionShown: 'Q2', studentAnswer: 'A2' }] });
  const [d] = extractDialogues([rec], [], passage), rounds = buildRounds(d);
  assert.deepEqual(d.turns.map(t => t.text), ['첫 응답', 'Q1', 'A1', 'Q2', 'A2']);
  assert.equal(rounds.length, 3);
  assert.deepEqual(rounds[1].dialogue.map(t => t.text), ['첫 응답', 'Q1', 'A1']);
  assert.equal(rounds[2].dialogue.at(-1).role, 'student');
});
test('simple-format: prefix transcripts dropped, restarted transcripts kept separately, other session separate', () => {
  const a = [S('a'), T('qa')], b = [S('a'), T('qa'), S('b'), T('qb')], restart = [S('z'), T('qz')];
  const recs = [shrec('s', P1, a), shrec('s', P1, b), shrec('s', P1, restart), shrec('s', P1, restart), shrec('t', P1, a), shrec('s', P1, [S('q')], 'ATTEMPT_STARTED')];
  const d = extractDialogues([], recs, passage);
  assert.deepEqual(d.map(x => x.dialogueId), [`sh:s:${P1}:1`, `sh:s:${P1}:2`, `sh:t:${P1}:1`]);
  assert.deepEqual(d[0].turns, b);
  const rounds = buildRounds(d[0]);
  assert.equal(rounds.length, 2); assert.equal(rounds[1].dialogue.length, 3); // trailing tutor turn excluded
});
test('copiedSource: 30+ contiguous chars from the paragraph in a student turn', () => {
  assert.equal(hasCopiedSource([S(P1TEXT.slice(10, 40))], P1TEXT), true);
  assert.equal(hasCopiedSource([S(P1TEXT.slice(10, 39))], P1TEXT), false);
  assert.equal(hasCopiedSource([T(P1TEXT.slice(10, 60))], P1TEXT), false);
});

test('units: frozen-map counts match the handoff', () => {
  passage.paragraphs.forEach((p, i) => {
    const u = unitsForParagraph(map, p.paragraphId);
    assert.equal(u.nodes.length, EXPECTED.nodes[i]); assert.equal(u.relations.length, EXPECTED.relations[i]);
  });
});
test('units: composite sourceQuotes = descendant proposition quotes in id order, deduped; X/TOP relations excluded; larger paragraph wins', () => {
  const m = { propositions: [
    { id: 'P1-1', paragraphId: 'x-p1', text: 'a', sourceQuote: 'qa' }, { id: 'P1-2', paragraphId: 'x-p1', text: 'b', sourceQuote: 'qb' },
    { id: 'P2-1', paragraphId: 'x-p2', text: 'c', sourceQuote: 'qa' }, { id: 'P2-2', paragraphId: 'x-p2', text: 'd', sourceQuote: 'qd' }],
  nodes: [{ id: 'C1-1', kind: 'COMPOSITE', paragraphId: 'x-p1', text: 'c1', childIds: ['P1-2', 'P1-1'] },
    { id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: 'x-p1', text: 'g1', childIds: ['C1-1', 'P1-2'].slice(0, 1).concat([]) },
    { id: 'G2', kind: 'PARAGRAPH_GIST', paragraphId: 'x-p2', text: 'g2', childIds: ['P2-1', 'P2-2'] },
    { id: 'X1', kind: 'CROSS', paragraphId: null, text: 'x', childIds: [] }, { id: 'TOP', kind: 'TOP', paragraphId: null, text: 't', childIds: [] }],
  relations: [{ id: 'R1', fromId: 'P1-1', toId: 'P2-2', name: 'n', note: 'note1' }, { id: 'R2', fromId: 'P1-1', toId: 'X1', name: 'n', note: '' }, { id: 'R3', fromId: 'TOP', toId: 'P1-1', name: 'n', note: '' }] };
  const u1 = unitsForParagraph(m, 'x-p1'), u2 = unitsForParagraph(m, 'x-p2');
  assert.deepEqual(u1.nodes.find(n => n.id === 'C1-1').sourceQuotes, ['qa', 'qb']);
  assert.deepEqual(u2.nodes.find(n => n.id === 'G2').sourceQuotes, ['qa', 'qd']);
  assert.deepEqual(u1.nodes.find(n => n.id === 'P1-1').sourceQuotes, ['qa']);
  assert.equal(u1.relations.length, 0); assert.deepEqual(u2.relations.map(r => r.id), ['R1']);
  assert.deepEqual(Object.keys(u2.relations[0]).sort(), ['from', 'fromId', 'id', 'note', 'to', 'toId']);
});

const rnd = dialogue => ({ dialogue });
test('checkQuotes: DIRECT without valid quote is downgraded; valid quote keeps DIRECT', () => {
  const r = rnd([S('명실 문제는 변했다'), T('질문 문장입니다'), S('논쟁이 있었다')]);
  assert.deepEqual([checkQuotes(r, { label: 'DIRECT', quotes: ['명실 문제'] }).finalLabel, checkQuotes(r, { label: 'DIRECT', quotes: ['없는 말'] }).finalLabel], ['DIRECT', 'PARTIAL']);
  const bad = checkQuotes(r, { label: 'DIRECT', quotes: ['없는 말'] });
  assert.equal(bad.quoteDowngrade, true);
  const p = checkQuotes(r, { label: 'PARTIAL', quotes: ['없는 말'] });
  assert.equal(p.finalLabel, 'PARTIAL'); assert.equal(p.noValidQuote, true); assert.equal(p.quoteDowngrade, false);
  assert.equal(checkQuotes(r, { label: 'ABSENT', quotes: [] }).finalLabel, 'ABSENT');
});
test('checkQuotes: tutor-only quote is invalid and flagged; whitespace-normalized match flagged separately', () => {
  const r = rnd([S('명실  문제는   변했다'), T('질문 문장입니다')]);
  const t = checkQuotes(r, { label: 'DIRECT', quotes: ['질문 문장'] });
  assert.equal(t.tutorQuote, true); assert.equal(t.finalLabel, 'PARTIAL'); assert.equal(t.quoteChecks[0].valid, false);
  const w = checkQuotes(r, { label: 'DIRECT', quotes: ['명실 문제는 변했다'] });
  assert.equal(w.quoteChecks[0].valid, false); assert.equal(w.quoteChecks[0].wsNormalizedMatch, true);
});

// combine rules on the real p2 tree (G2 children / relations looked up from the frozen map)
const L = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, { finalLabel: v }]));
const p2 = passage.paragraphs[1].paragraphId, u2 = unitsForParagraph(map, p2);
const allWith = (label, over = {}) => ({ ...Object.fromEntries([...u2.nodes, ...u2.relations].map(x => [x.id, label])), ...over });
const g2 = u2.nodes.find(n => n.kind === 'PARAGRAPH_GIST'), kids = g2.childIds;
test('combine: SUBSUMED / MISMATCH_TOP_ONLY / LISTING / no-pattern / CONTRADICTS', () => {
  const sub = combineRound(map, p2, L(allWith('ABSENT', { [g2.id]: 'DIRECT', [kids[0]]: 'PARTIAL' })));
  assert.equal(sub.nodes[g2.id].pattern, 'SUBSUMED'); assert.equal(sub.nodes[g2.id].caught, 1); assert.equal(sub.nodes[g2.id].children, kids.length);
  assert.equal(combineRound(map, p2, L(allWith('ABSENT', { [g2.id]: 'DIRECT' }))).nodes[g2.id].pattern, 'MISMATCH_TOP_ONLY');
  assert.equal(combineRound(map, p2, L(allWith('ABSENT', { [kids[0]]: 'DIRECT', [kids[1]]: 'PARTIAL' }))).nodes[g2.id].pattern, 'LISTING');
  assert.equal(combineRound(map, p2, L(allWith('ABSENT', { [kids[0]]: 'DIRECT' }))).nodes[g2.id].pattern, null);
  assert.equal(combineRound(map, p2, L(allWith('ABSENT', { [g2.id]: 'PARTIAL' }))).nodes[g2.id].pattern, null);
  const c = combineRound(map, p2, L(allWith('ABSENT', { [g2.id]: 'CONTRADICTS', [kids[0]]: 'DIRECT', [kids[1]]: 'DIRECT' })));
  assert.equal(c.nodes[g2.id].pattern, null); assert.deepEqual(c.contradictions, [g2.id]);
});
test('combine: INCOMPLETE when the node or a child is unjudged', () => {
  assert.equal(combineRound(map, p2, L(allWith('DIRECT', { [g2.id]: null }))).nodes[g2.id].pattern, 'INCOMPLETE');
  assert.equal(combineRound(map, p2, L(allWith('DIRECT', { [kids[0]]: null }))).nodes[g2.id].pattern, 'INCOMPLETE');
});
test('combine: MISMATCH_RELATION only for ABSENT end in this paragraph; cross-paragraph end unchecked', () => {
  const rel = u2.relations.find(r => [r.fromId, r.toId].some(id => unitsForParagraph(map, p2).nodes.every(n => n.id !== id))) ?? u2.relations[0];
  const own = [rel.fromId, rel.toId].filter(id => u2.nodes.some(n => n.id === id));
  const cross = [rel.fromId, rel.toId].filter(id => !own.includes(id));
  const r = combineRound(map, p2, L(allWith('DIRECT', { [own[0]]: 'ABSENT' })));
  assert.equal(r.relations[rel.id].pattern, 'MISMATCH_RELATION'); assert.deepEqual(r.relations[rel.id].crossEndUnchecked, cross);
  const none = combineRound(map, p2, L(allWith('ABSENT', { [rel.id]: 'DIRECT' }))); // own end ABSENT too
  assert.equal(none.relations[rel.id].pattern, 'MISMATCH_RELATION');
  assert.equal(combineRound(map, p2, L(allWith('DIRECT', { [rel.id]: 'ABSENT' }))).relations[rel.id].pattern, null);
});
test('roundChanges lists labels that changed', () => {
  assert.deepEqual(roundChanges(L({ a: 'ABSENT', b: 'DIRECT' }), L({ a: 'PARTIAL', b: 'DIRECT' })), [{ unitId: 'a', from: 'ABSENT', to: 'PARTIAL' }]);
});

test('limits: request cap, usd cap, and cost arithmetic', () => {
  assert.equal(limitCheck({ requests: LIMITS.maxRequests, spentUsd: 0, reserved: 0 }), 'RUN_LIMIT: max requests');
  assert.equal(limitCheck({ requests: 0, spentUsd: 0.999, reserved: 0.002 }), 'RUN_LIMIT: usd cap');
  assert.equal(limitCheck({ requests: 5, spentUsd: 0.5, reserved: 0.01 }), null);
  assert.ok(Math.abs(usageCost({ input_tokens: 1e6, output_tokens: 1e6 }) - 0.6) < 1e-9);
});
test('requests: instructions are the prompt sections verbatim; dry-run body carries only dialogue text and the target (no tutor judgment, gold, state)', () => {
  const md = readFileSync(JUDGE_PROMPT_PATH, 'utf8'), pr = parseJudgePrompt(md);
  assert.ok(pr.node.startsWith('너는') && pr.node.includes('입력 형식(JSON)') && !pr.node.includes('## '));
  assert.ok(pr.relation.startsWith('너는') && pr.relation.includes('relation.note'));
  const rounds = [{ dialogueId: 'd', source: 'v4', sessionId: 's', paragraphId: p2, roundIndex: 1, dialogue: [{ role: 'student', text: '답', evaluation: 'LEAK', state: 'LEAK' }] }];
  const jobs = planJobs(rounds, map);
  assert.equal(jobs.length, u2.nodes.length + u2.relations.length);
  for (const j of jobs) {
    const body = JSON.stringify(buildJudgeRequest(pr[j.unitKind], buildJudgeInput(j.round, j.unitKind, j.unit)));
    assert.ok(!/LEAK|evaluation|gold|snapshot|state/u.test(body.replace(/response_format|strict/gu, '')));
    const req = buildJudgeRequest(pr[j.unitKind], buildJudgeInput(j.round, j.unitKind, j.unit));
    assert.equal(req.model, 'gpt-6-luna'); assert.equal(req.max_output_tokens, 2000); assert.ok(reserveUsd(req) > 0);
  }
  assert.doesNotThrow(() => JudgmentSchema.parse({ label: 'ABSENT', quotes: [], reason: 'r' }));
});
test('assemble + report: failed/missing judgments are unjudged and flow into INCOMPLETE without crashing', () => {
  const dialogues = [{ dialogueId: 'd', source: 'v4', sessionId: 's', paragraphId: p2, turns: [S('a')], copiedSource: false }];
  const rounds = buildRounds(dialogues[0]);
  const rows = [{ jobId: `d|1|node|${g2.id}`, dialogueId: 'd', roundIndex: 1, unitKind: 'node', unitId: g2.id, status: 'OK', finalLabel: 'DIRECT', quoteChecks: [] },
    { jobId: `d|1|node|${kids[0]}`, dialogueId: 'd', roundIndex: 1, unitKind: 'node', unitId: kids[0], status: 'FAILED', finalLabel: null }];
  const combined = assemble(rounds, map, rows);
  assert.equal(combined[0].nodes[g2.id].pattern, 'INCOMPLETE');
  const md = renderReport({ rounds, dialogues, map, judgmentRows: rows, combined, run: { requests: 2, totalCostUsd: 0 } });
  assert.ok(md.includes('## 요약') && md.includes('● ' + g2.id) && md.includes('? '));
});

test('connection errors cost 0, timeouts keep reserved cost', () => {
  assert.equal(isConnectionError('Error: Connection error.'), true);
  assert.equal(isConnectionError('Error: Request timed out.'), false);
  assert.equal(isConnectionError(null), false);
  assert.equal(endCost({ costUsd: null, error: 'Error: Connection error.', reservedUsd: 0.001 }), 0);
  assert.equal(endCost({ costUsd: null, error: 'Error: Request timed out.', reservedUsd: 0.001 }), 0.001);
  assert.equal(endCost({ costUsd: 0.0002, error: null, reservedUsd: 0.001 }), 0.0002);
});

test('circuit breaker trips after 10 consecutive connection errors, resets on other outcomes', () => {
  let streak = 0;
  for (let i = 0; i < 9; i++) streak = nextConnErrStreak(streak, 'Error: Connection error.');
  assert.equal(circuitTripped(streak), false);
  assert.equal(nextConnErrStreak(streak, 'Error: Request timed out.'), 0);
  assert.equal(nextConnErrStreak(streak, null), 0);
  streak = nextConnErrStreak(streak, 'Error: Connection error.');
  assert.equal(circuitTripped(streak), true);
});
