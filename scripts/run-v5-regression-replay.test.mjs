import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runReplay, loadBase, dryReport } from './run-v5-regression-replay.mjs';

const BASE = 'docs/experiments/v5-diverse-48-regression-2026-10-28-v56';
const base = loadBase(BASE);
const tmp = () => mkdtempSync(join(tmpdir(), 'v5-replay-'));
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

// 가짜 평가기: 기준 세션이 저장한 판정 호출을 종류별 순서대로 돌려주고, 요청마다 transport를 한 번 지나 비용을 쌓는다.
// opts.mutate(kind, index, call)로 판정 결과를 바꿔 갈라짐을 만든다.
function fakeFactory(id, { cost = 1000, mutate } = {}) {
  const pool = {};
  for (const s of base.cases[id].steps) for (const e of s.evaluations) (pool[e.kind] ??= []).push(e);
  const used = {};
  return transport => ({ async evaluate(session) {
    const kind = session.evaluationMode, i = used[kind] = (used[kind] ?? 0) + 1;
    const e = pool[kind]?.[i - 1];
    assert.ok(e, `기준에 ${kind} #${i} 판정이 없음`);
    await transport.create({ model: 'gpt-6.1-sol', max_output_tokens: 10 }, {});
    const call = structuredClone(e.call);
    return mutate?.(kind, i, call) ?? call;
  } });
}
const send = (cost = 1000) => async () => ({ id: 'r', status: 'completed', output_text: '{}', usage: { input_tokens: cost, output_tokens: 0 } });

test('--dry 입력 읽기: 18세션의 step 수와 첫 명령', () => {
  const rows = dryReport(BASE);
  assert.equal(rows.length, 18);
  assert.ok(rows.every(r => r.steps >= 3 && r.firstCommand === 'SELECT'));
});

test('같은 phase면 기준 명령을 그대로 넣어 끝까지 간다', async () => {
  const out = tmp();
  const s = await runReplay({ base: BASE, out, capUsd: 100, only: 'C-A1' }, { send: send(), makeEvaluator: fakeFactory('C-A1') });
  const c = readJson(`${out}/cases/C-A1.json`);
  assert.equal(c.status, 'COMPLETED');
  assert.deepEqual(c.steps.map(x => x.command.type), base.cases['C-A1'].steps.map(x => x.command.type));
  assert.deepEqual(c.steps.map(x => x.command), base.cases['C-A1'].steps.map(x => x.command));
  assert.equal(s.sessions[0].outcome, base.cases['C-A1'].steps.at(-1).view.result.outcome);
  assert.ok(existsSync(`${out}/cases/C-A1.records.jsonl`));
  assert.ok(readdirSync(`${out}/requests`).some(f => f.endsWith('.request.json')));
  assert.ok(s.usd > 0);
});

function altBase(id, edit) {
  const dir = tmp(), alt = structuredClone(base.cases[id]);
  edit(alt);
  mkdirSync(`${dir}/cases`);
  writeFileSync(`${dir}/SET.txt`, id);
  writeFileSync(`${dir}/sources.json`, JSON.stringify(base.sources));
  writeFileSync(`${dir}/cases/${id}.json`, JSON.stringify(alt));
  return dir;
}

test('CORRECT의 errorId는 현재 화면의 activeErrorId로 바뀐다', async () => {
  const id = 'S-A1', out = tmp();
  const dir = altBase(id, alt => { alt.steps.find(x => x.command.type === 'CORRECT').command.errorId = 'stale-error-id'; });
  await runReplay({ base: dir, out, capUsd: 100 }, { send: send(), makeEvaluator: fakeFactory(id) });
  const c = readJson(`${out}/cases/${id}.json`);
  assert.equal(c.status, 'COMPLETED');
  const correct = c.steps.find(x => x.command.type === 'CORRECT');
  assert.notEqual(correct.command.errorId, 'stale-error-id');
  assert.equal(correct.command.errorId, correct.inReplyTo.activeErrorId);
  assert.equal(correct.command.text, base.cases[id].steps.find(x => x.command.type === 'CORRECT').command.text);
});

test('phase가 갈라지면 DIVERGED로 멈추고 갈라진 지점을 기록한다; --answers로 이어 간다', async () => {
  const id = 'C-A1';
  // 기준이 기대하는 phase를 바꿔 새 실행(AWAITING_END_START)과 갈라지게 한다.
  const altBaseDir = altBase(id, alt => { alt.steps[1].inReplyTo.phase = 'AWAITING_CORRECTION'; });
  const mk = () => fakeFactory(id);

  const out = tmp();
  await runReplay({ base: altBaseDir, out, capUsd: 100 }, { send: send(), makeEvaluator: mk() });
  const c = readJson(`${out}/cases/${id}.json`);
  assert.equal(c.status, 'DIVERGED');
  assert.equal(c.divergence.atStep, 1);
  assert.equal(c.divergence.current.phase, 'AWAITING_END_START');
  assert.equal(c.divergence.baseInReplyTo.phase, 'AWAITING_CORRECTION');
  assert.equal(readJson(`${out}/SUMMARY.json`).counts.DIVERGED, 1);

  // 같은 out에 이미 있으면 --only 없이는 건너뛴다.
  const again = await runReplay({ base: altBaseDir, out, capUsd: 100 }, { send: send(), makeEvaluator: mk() });
  assert.equal(again.sessions[0].status, 'DIVERGED');

  // --answers: atStep 1에서 END_START를 직접 넣고, 이후 기준 step(phase 불일치)은 다시 갈라지므로 두 번째 답도 준다.
  // 기준 step 위치는 그대로이므로 기준의 [1]번 step(AWAITING_CORRECTION)이 계속 남는다 -> 다음 기준 step으로 넘기려면 기준을 맞춘다.
  const fixed = structuredClone(base.cases[id]); fixed.steps.splice(1, 1); // END_START step을 빼고 답으로 대신한다
  writeFileSync(`${altBaseDir}/cases/${id}.json`, JSON.stringify(fixed));
  const ans = `${out}/answers.json`;
  writeFileSync(ans, JSON.stringify({ [id]: [{ atStep: 1, command: { type: 'END_START', accept: true } }] }));
  await runReplay({ base: altBaseDir, out, capUsd: 100, only: id, answers: ans }, { send: send(), makeEvaluator: fakeFactory(id) });
  const r = readJson(`${out}/cases/${id}.json`);
  assert.equal(r.status, 'COMPLETED');
  assert.equal(r.steps[1].source, 'ANSWER');
  assert.equal(r.steps[1].command.type, 'END_START');
});

test('비용 누적이 상한을 넘으면 새 요청 전에 멈춘다', async () => {
  const out = tmp();
  // sol 입력 $2/1M: 1_000_000 토큰 = $2 한 요청으로 상한 $1.5 초과
  const s = await runReplay({ base: BASE, out, capUsd: 1.5, only: 'C-A1,S-A1' }, { send: send(1_000_000), makeEvaluator: fakeFactory('C-A1') });
  assert.ok(s.stopped?.startsWith('RUN_CAP'), JSON.stringify(s.stopped));
  const requests = readdirSync(`${out}/requests`).filter(f => f.endsWith('.request.json'));
  assert.equal(requests.length, 1, '상한 초과 뒤 새 요청이 나가면 안 된다');
  assert.equal(readJson(`${out}/cases/C-A1.json`).status, 'ERROR');
  assert.ok(!existsSync(`${out}/cases/S-A1.json`), '상한 도달 뒤 다음 세션을 시작하면 안 된다');
});

test('평가 실패(RETRYABLE_ERROR)는 RESUME 1회로 다시 시도하고, 계속 실패하면 ERROR', async () => {
  const flaky = failures => { const inner = fakeFactory('C-A1'); return t => { const ev = inner(t); let n = 0; return { async evaluate(s) { if (n++ < failures) throw new Error('boom'); return ev.evaluate(s); } }; }; };
  let out = tmp();
  await runReplay({ base: BASE, out, capUsd: 100, only: 'C-A1' }, { send: send(), makeEvaluator: flaky(1) });
  let c = readJson(`${out}/cases/C-A1.json`);
  assert.equal(c.status, 'COMPLETED');
  assert.ok(c.steps.some(s => s.command.type === 'RESUME'));
  out = tmp();
  await runReplay({ base: BASE, out, capUsd: 100, only: 'C-A1' }, { send: send(), makeEvaluator: flaky(2) });
  c = readJson(`${out}/cases/C-A1.json`);
  assert.equal(c.status, 'ERROR');
});
