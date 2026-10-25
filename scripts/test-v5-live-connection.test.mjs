import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { CELLS, DIR, LIMITS, loadInputs, validateInputs, executeCell, createLedger, checkCell, explanationChecks, summarize, main } from './test-v5-live-connection.mjs';
const data = loadInputs();
const endText = '선택의 근거를 원문과 연결해서 확인해 보세요. 관련 조건을 함께 살펴보면 관계를 이해할 수 있어요.';
function workspace(t) {
  mkdirSync(DIR, { recursive: true });
  const dir = mkdtempSync(`${DIR}/mock-`);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function response(raw) { return { id: 'mock-response', status: 'completed', output_text: JSON.stringify(raw), usage: { input_tokens: 100, output_tokens: 100 } }; }
function mockFor(cell, { sufficient = true, alter } = {}) {
  const requests = [];
  const transport = { async create(request) {
    requests.push(request);
    const p = JSON.parse(request.input[0].content[0].text);
    let raw;
    if (p.endReason) raw = { coaching: endText };
    else {
      const observation = p.observations.at(-1), command = observation.command;
      const quote = command.type === 'CORRECT' ? command.text : command.rationale.text;
      const evidence = [{ observationId: observation.observationId, quote }];
      if (p.mode === 'REPAIR') {
        const failure = ['L1', 'L7', 'L12', 'L15'].includes(cell.id);
        raw = { mode: 'REPAIR', boundary: 'NONE', reason: '모의 교정 판정', reviewedResponse: evidence[0],
          repairs: [...p.initialErrors, ...p.additionalErrors].map(e => ({ errorId: e.errorId,
            status: failure && (cell.id !== 'L7' || e.errorId === 'E2') ? 'REMAINING' : 'REPAIRED', studentEvidence: evidence })),
          newErrors: [], verificationComplete: !failure, rationaleSufficient: sufficient, coaching: endText };
      } else if (['L16', 'L17'].includes(cell.id) && p.selection.selectionNumber === 1) {
        raw = structuredClone(data.recordings[cell.session].call.rawOutput);
        raw.studentClaims = raw.studentEvidence.map(e => ({ ...e, claimAsStated: e.quote, sourceCheck: 'CONTRADICTED', sourceBasis: '모의 원문 비교' }));
      } else {
        const error = ['L4', 'L5'].includes(cell.id), unknown = cell.id === 'L11';
        const sourceEvidence = [{ location: 'PASSAGE', quote: p.source.passage.slice(0, 25), mediaId: null, visualObservation: null }];
        raw = { mode: 'SELECTION', boundary: 'NONE', reason: '모의 선택 판정', reconstructability: unknown ? 'UNKNOWN' : 'RECONSTRUCTABLE',
          reconstructedPath: unknown ? [] : [quote], rationaleImpliedVerdict: unknown ? 'UNKNOWN' : p.targetVerdict,
          contentAssessment: unknown ? 'UNKNOWN' : error ? 'ERROR' : 'SUPPORTED', studentEvidence: evidence, sourceEvidence,
          errors: error ? [{ errorId: 'mock-error', description: '원문 관계 오류', studentEvidence: evidence, sourceEvidence, question: '관계를 다시 확인해 볼까요?' }] : [],
          selectionMismatchQuestion: null, coaching: endText,
          studentClaims: [{ ...evidence[0], claimAsStated: quote, sourceCheck: error ? 'CONTRADICTED' : unknown ? 'UNDETERMINED' : 'CONSISTENT', sourceBasis: '모의 원문 비교' }] };
      }
    }
    return response(alter ? alter(raw, p, requests.length) : raw);
  } };
  return { transport, requests };
}
async function runCell(t, cell, options = {}) {
  const mock = mockFor(cell, options), dir = workspace(t);
  const ledger = createLedger(`${dir}/requests.jsonl`, options.transport ?? mock.transport, options.limits);
  const row = await executeCell(cell, 1, data, ledger, { recordsPath: `${dir}/${cell.id}.records.jsonl` });
  return { row, ledger, ...mock, dir };
}
function allChecks(row) {
  assert.equal(row.status, 'VALID', JSON.stringify(row));
  for (const key of ['path', 'models', 'noOfficialExplanation', 'answerLine', 'publicView']) assert.equal(row.checks[key], true, `${row.id}/${key}`);
  if (row.checks.explanationStatic) assert.ok(Object.values(row.checks.explanationStatic).every(Boolean), JSON.stringify(row.checks));
  assert.deepEqual(row.checks.retries, []);
}

test('prepare validates replay and answer IDs, freezes inputs, and makes zero transport calls', async t => {
  await validateInputs(data);
  const dir = workspace(t);
  const prepared = await main({ dir, transport: { create() { assert.fail('prepare transport called'); } } });
  assert.equal(prepared.externalRequests, 0); assert.equal(prepared.cells, 17);
  const frozen = JSON.parse(readFileSync(`${dir}/FROZEN.json`, 'utf8'));
  assert.ok(frozen.fileHashes['packages/pipeline/src/problem-solving/feedback-end-explanation.ts']);
  assert.deepEqual(await main({ dir }), prepared);
  frozen.repetitions = 3; writeFileSync(`${dir}/FROZEN.json`, JSON.stringify(frozen));
  await assert.rejects(main({ dir }), /FROZEN mismatch/);
});
for (const cell of CELLS) test(`${cell.id}: intended path through production controller and default evaluator`, async t => {
  const { row, ledger, requests, dir } = await runCell(t, cell); allChecks(row);
  assert.deepEqual(requests.map(r => r.model), cell.models);
  assert.ok(requests.every(r => r.reasoning.effort === 'medium' && r.max_output_tokens === 8000));
  const records = readFileSync(`${dir}/${cell.id}.records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  if (cell.replay) {
    assert.equal(records.find(r => r.event === 'EVALUATED').call.metadata.provider, 'mock');
    assert.equal(row.actual.evaluations.filter(e => e.replay).length, 1);
  }
  assert.equal(ledger.rows.filter(r => r.event === 'START').length, cell.models.length);
  if (['L16', 'L17'].includes(cell.id)) assert.equal(row.actual.correctionQuestions.length, 1);
  if (cell.id === 'L7') assert.deepEqual(row.actual.correctionQuestions.map(q => q.errorId), ['E1', 'E2']);
});
for (const id of ['L13', 'L14', 'L17']) test(`${id}: insufficient rationale remains UNVERIFIED_CORRECT`, async t => {
  const { row } = await runCell(t, CELLS.find(c => c.id === id), { sufficient: false });
  allChecks(row); assert.equal(row.actual.result.outcome, 'UNVERIFIED_CORRECT');
});
test('unexpected phase stops the cell before the next button or answer', async t => {
  const { row, requests } = await runCell(t, CELLS[1], { alter(raw) {
    if (raw.mode === 'REPAIR') { raw.repairs.forEach(r => { r.status = 'REMAINING'; }); raw.verificationComplete = false; }
    return raw;
  } });
  assert.equal(row.status, 'PATH_DEVIATION'); assert.equal(row.checks.path, null);
  assert.equal(requests.length, 2); assert.ok(row.deviation.message);
});
test('L16 extra question is a path deviation, with no repair request', async t => {
  const { row, requests } = await runCell(t, CELLS[15], { alter(raw, p) {
    if (p.mode === 'SELECTION') raw.errors.push({ ...structuredClone(raw.errors[0]), errorId: 'extra', question: '다른 관계는 어떤가요?' });
    return raw;
  } });
  assert.equal(row.status, 'PATH_DEVIATION'); assert.equal(requests.length, 1);
});
test('L16 question wording may vary and is preserved verbatim', async t => {
  const question = '원문의 해당 조건을 다시 연결해 볼까요?';
  const { row } = await runCell(t, CELLS[15], { alter(raw, p) {
    if (p.mode === 'SELECTION' && p.selection.selectionNumber === 1) raw.errors[0].question = question;
    return raw;
  } });
  allChecks(row); assert.equal(row.actual.correctionQuestions[0].text, question);
});
test('public checks detect copied official text, identifiers, answer lines and private keys', async t => {
  const { row } = await runCell(t, CELLS[0]);
  const source = data.sources[data.cases.find(c => c.id === 'S2').questionId];
  const changed = structuredClone(row);
  changed.transcript.push({ text: [...source.officialExplanation].slice(0, 20).join('') });
  changed.endExplanation = 'C1을 보면 학생은 맞습니다. 손상된 문자예요.\uFFFD';
  changed.actual.publicView.message = '끝났어요.\n정답은 3번입니다.'; // D-0112 5: a server answer line is now a violation
  changed.actual.publicView.result.answer.explanation = '누출';
  const checks = checkCell(changed, source);
  for (const key of ['noOfficialExplanation', 'answerLine', 'publicView']) assert.equal(checks[key], false);
  assert.ok(Object.values(checks.explanationStatic).every(v => v === false));
  assert.ok(Object.values(explanationChecks('“학생은 맞습니다.”라고 말했지만 원문과 비교해 보세요.')).every(Boolean));
});
test('correct completion rejects an answer number line', async t => {
  const { row } = await runCell(t, CELLS[11]);
  row.actual.publicView.message += '\n정답은 3번입니다.';
  assert.equal(checkCell(row, data.sources[data.cases.find(c => c.id === 'S4').questionId]).answerLine, false);
});
test('request and dollar caps stop before sending or writing START', async t => {
  for (const cap of [{ requests: 0 }, { usd: 0 }]) {
    const limits = structuredClone(LIMITS); Object.assign(limits['gpt-6-luna'], cap);
    const { row, requests, ledger } = await runCell(t, CELLS[0], { limits });
    assert.equal(row.status, 'RUN_LIMIT'); assert.equal(requests.length, 0); assert.equal(ledger.rows.length, 0);
  }
});
test('an unmatched START refuses resume; failures close END and retain reservation', async t => {
  const dir = workspace(t), path = `${dir}/requests.jsonl`;
  writeFileSync(path, JSON.stringify({ event: 'START', requestId: 'orphan' }) + '\n');
  assert.throws(() => createLedger(path, { create() { assert.fail(); } }), /START without END/);
  const failedPath = `${dir}/failed.jsonl`;
  const ledger = createLedger(failedPath, { async create() { throw new Error('offline failure'); } });
  const request = { model: 'gpt-6-luna', max_output_tokens: 8000 };
  await assert.rejects(ledger.send(request, {}, 'test'), /offline failure/);
  assert.deepEqual(ledger.rows.map(r => r.event), ['START', 'END']);
  assert.ok(ledger.account()['gpt-6-luna'].reservedUsd > 0);
  assert.deepEqual(createLedger(failedPath).account(), ledger.account());
});
test('CLAIMS_CONTRACT retry uses the same default model and reports reason', async t => {
  const { row, requests } = await runCell(t, CELLS[10], { alter(raw, p, n) { if (n === 1) delete raw.studentClaims; return raw; } });
  assert.equal(row.status, 'VALID'); assert.equal(row.checks.models, true);
  assert.equal(requests.length, 3); assert.equal(row.checks.retries.length, 1);
  assert.match(row.checks.retries[0].reason, /CLAIMS_CONTRACT/);
});
test('controller RESUME is sent once after evaluator retries fail', async t => {
  let n = 0;
  const mock = mockFor(CELLS[0]);
  const { row } = await runCell(t, CELLS[0], { transport: { async create(r) { if (++n <= 2) throw new Error('mock temporary failure'); return mock.transport.create(r); } } });
  assert.equal(row.status, 'VALID'); assert.equal(row.checks.models, true);
  assert.equal(row.actual.history.filter(h => h.command.type === 'RESUME').length, 1);
});
test('a second evaluation failure ends the cell without further submissions', async t => {
  const { row } = await runCell(t, CELLS[0], { transport: { async create() { throw new Error('mock persistent failure'); } } });
  assert.equal(row.status, 'EVALUATION_ERROR');
  assert.equal(row.actual.history.filter(h => h.command.type === 'RESUME').length, 1);
  assert.equal(row.actual.calls.length, 4);
});
test('summary aggregates states, checks, retries, costs and durations', async t => {
  const { row, ledger } = await runCell(t, CELLS[0]);
  const summary = summarize([row], ledger, null);
  assert.equal(summary.states.VALID, 1); assert.deepEqual(summary.violations, []);
  assert.equal(summary.models['gpt-6-luna'].requests, 1);
  assert.ok(summary.callDurationsMs.REPAIR.max >= 0); assert.ok(summary.submissionDurationsMs.median >= 0);
});
