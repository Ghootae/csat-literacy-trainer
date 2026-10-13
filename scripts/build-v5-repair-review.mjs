// Offline blind packets. Provenance and the persisted random seed stay in separate keys.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { DEFAULT_DIR, loadInputs, read, runDirectory, studentUtterances, jsonHash } from './test-v5-repair.mjs';
function shuffle(values, seed) {
  const result = [...values]; let state = createHash('sha256').update(seed).digest().readUInt32LE(0);
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function main({ dir = DEFAULT_DIR, out = 'docs/experiments/v5-repair-test-2026-10-10-review', seed } = {}) {
  const data = loadInputs(), frozen = read(`${dir}/FROZEN.json`), frozenHash = jsonHash(frozen);
  const oldKeys = existsSync(out) ? readdirSync(out).filter(n => /^REVIEW-blind-key-[A-Z]\.json$/u.test(n)).map(n => read(`${out}/${n}`)) : [];
  if (oldKeys.length) {
    assert.ok(oldKeys.every(k => k.seed === oldKeys[0].seed), 'Inconsistent review seed');
    if (seed !== undefined) assert.equal(seed, oldKeys[0].seed, 'Review seed changed');
    seed = oldKeys[0].seed;
  }
  seed ??= randomBytes(16).toString('hex');
  const skipped = [];
  const questionIds = shuffle([...new Set(Object.values(data.sessions).map(s => s.source.questionId))], seed);
  const groups = questionIds.map((questionId, index) => {
    const prefix = String.fromCharCode(65 + index), entries = [];
    for (const v of data.suite.variants.filter(v => data.sessions[v.session].source.questionId === questionId)) {
      for (let r = 1; r <= 3; r++) {
        const label = `${v.id}-r${r}`, role = v.correctChoice ? 'repair' : 'coaching';
        const path = `${runDirectory(dir, role)}/${label}.json`;
        assert.ok(existsSync(path), `Missing review cell: ${path}`);
        const cell = read(path);
        assert.equal(cell.frozenHash, frozenHash, `Review cell changed: ${path}`);
        if (cell.status !== 'VALID' || typeof cell.coaching !== 'string') { skipped.push({ path, status: cell.status }); continue; }
        const utterances = v.correctChoice ? studentUtterances(cell.after) : cell.studentUtterances;
        entries.push({ provenance: { path, variant: v.id, replicate: r, model: cell.model },
          content: { studentRationale: utterances[0].text,
            corrections: utterances.slice(1).map(({ question, text }) => ({ question, answer: text })),
            endReason: cell.endReason, coaching: cell.coaching } });
      }
    }
    const packet = [], key = {};
    for (const [i, e] of shuffle(entries, `${seed}:${questionId}`).entries()) {
      const id = `${prefix}${String(i + 1).padStart(3, '0')}`;
      packet.push({ id, ...e.content }); key[id] = e.provenance;
    }
    return { prefix, questionId, packet, key: { seed, questionId, frozenHash, entries: key } };
  });
  // Validate all inputs before writing any packet.
  mkdirSync(out, { recursive: true });
  for (const g of groups) {
    for (const [kind, value] of [['packet', g.packet], ['key', g.key]]) {
      const path = `${out}/REVIEW-blind-${kind}-${g.prefix}.json`, text = JSON.stringify(value, null, 2) + '\n';
      if (existsSync(path)) assert.deepEqual(read(path), value, `Review artifact changed: ${path}`);
      else writeFileSync(path, text, { flag: 'wx' });
    }
  }
  return { packets: groups.map(g => ({ prefix: g.prefix, questionId: g.questionId, cells: g.packet.length })), skipped };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(main()));
