// D-0162 supplement 6: freeze the three choice-link runs into one representative run per choice. No model calls, no .env.
// Usage: node scripts/freeze-choice-link.mjs --targets <json> --runs-dir <dir> --out <dir> [--overrides <json>] [--fixed <json>]
// Handoff: docs/handoffs/2026-10-22-choice-link-freeze.md
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadTargets, validateChoiceLink, FIXED_PATH } from './run-choice-link.mjs';

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = o => JSON.stringify(o, null, 2) + '\n';
const uniq = a => [...new Set(a)];
const sortedUniq = a => uniq(a).sort();
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const STEPS = ['TYPE', 'TARGET', 'VALID'];

const twistedParts = c => c.parts.filter(p => p.twisted);
const typeSet = c => sortedUniq(twistedParts(c).map(p => p.twistType));
// FALSE choices: union of twistTargetIds of twisted parts; TRUE choices: union of supportIds.
const targetSet = (c, truth) => sortedUniq(truth === 'FALSE' ? twistedParts(c).flatMap(p => p.twistTargetIds) : c.parts.flatMap(p => p.supportIds));
const refIds = c => c.parts.flatMap(p => [...p.twistTargetIds, ...p.supportIds, ...p.contextIds, ...p.inferenceBasisIds]);

// Violation strings of one run that belong to choice q<n>#<c> (start with "q<n>#<c>" followed by "." or ":").
export const choiceViolations = (validation, qn, cn) => {
  const at = `q${qn}#${cn}`;
  return validation.items.flatMap(i => i.violations).filter(s => s.startsWith(`${at}.`) || s.startsWith(`${at}:`));
};

// runs: [{ k, out, validation }]; truth: 'TRUE' | 'FALSE'; override: null | { run, reason }.
export function selectChoice({ runs, qn, cn, truth, override = null }) {
  const has = runs.map(r => ({ k: r.k, c: r.out.questions.find(q => q.number === qn)?.choices.find(c => c.number === cn), validation: r.validation })).filter(x => x.c);
  if (!has.length) throw new Error(`FREEZE_NO_CHOICE: q${qn}#${cn}`);
  const types = Object.fromEntries(has.map(x => [x.k, truth === 'FALSE' ? typeSet(x.c) : []]));
  const targets = Object.fromEntries(has.map(x => [x.k, targetSet(x.c, truth)]));
  const ks = has.map(x => x.k);
  let cand = [...ks], decidedBy = null, unresolved = false;
  const skippedSteps = [], candidatesAfter = {};
  const apply = (step, next) => {
    if (next.length === 0) { skippedSteps.push(step); candidatesAfter[step] = [...cand]; return; }
    if (next.length === 1 && cand.length > 1 && decidedBy === null) decidedBy = step;
    cand = next; candidatesAfter[step] = [...cand];
  };
  // TYPE
  if (truth === 'FALSE') {
    const keyOf = k => types[k].join('|'), counts = new Map();
    for (const k of cand) counts.set(keyOf(k), (counts.get(keyOf(k)) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max >= 2) {
      const best = keyOf(cand.find(k => counts.get(keyOf(k)) === max)); // earliest run holding a most-common set
      apply('TYPE', cand.filter(k => keyOf(k) === best));
    } else {
      const typeCount = new Map();
      for (const k of cand) for (const t of types[k]) typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
      const repeated = new Set([...typeCount].filter(([, n]) => n >= 2).map(([t]) => t));
      if (repeated.size === 0 && cand.length >= 2) unresolved = true;
      else if (repeated.size > 0) apply('TYPE', cand.filter(k => types[k].some(t => repeated.has(t))));
      else candidatesAfter.TYPE = [...cand];
    }
  }
  if (candidatesAfter.TYPE === undefined) candidatesAfter.TYPE = [...cand];
  // TARGET: the target set shared by the most runs (counted over all runs, >= 2); candidates holding it remain. No shared set passes.
  const tKey = k => targets[k].join('|'), tCounts = new Map();
  for (const k of ks) tCounts.set(tKey(k), (tCounts.get(tKey(k)) ?? 0) + 1);
  const tMax = Math.max(...tCounts.values());
  if (tMax >= 2) {
    const modes = new Set([...tCounts].filter(([, n]) => n === tMax).map(([s]) => s));
    apply('TARGET', cand.filter(k => modes.has(tKey(k))));
  } else candidatesAfter.TARGET = [...cand];
  // VALID
  apply('VALID', cand.filter(k => choiceViolations(has.find(x => x.k === k).validation, qn, cn).length === 0));
  let selected = cand[0], overrideReason = null;
  if (unresolved) { selected = ks[0]; decidedBy = 'TYPE'; }
  else if (decidedBy === null) {
    const allKept = cand.length === ks.length, equal = ks.every(k => sameSet(types[k], types[ks[0]]) && sameSet(targets[k], targets[ks[0]]));
    decidedBy = allKept && ks.length >= 2 && equal ? 'UNANIMOUS' : 'FIRST';
  }
  if (override) {
    const x = has.find(h => h.k === override.run);
    if (!x) throw new Error(`FREEZE_OVERRIDE_NO_CHOICE: q${qn}#${cn} r${override.run}`);
    const bad = choiceViolations(x.validation, qn, cn);
    if (bad.length) throw new Error(`FREEZE_OVERRIDE_VIOLATION: q${qn}#${cn} r${override.run}: ${bad.join('; ')}`);
    selected = override.run; decidedBy = 'OVERRIDE'; overrideReason = override.reason; unresolved = false;
  }
  const sel = has.find(x => x.k === selected);
  const altTargetIds = sortedUniq(has.filter(x => x.k !== selected).flatMap(x => targets[x.k])).filter(id => !targets[selected].includes(id));
  return { selected, run: sel.c, selection: { decidedBy, skippedSteps, candidatesAfter, override: overrideReason, unresolved },
    runTypes: truth === 'FALSE' ? Object.fromEntries(has.map(x => [`r${x.k}`, types[x.k]])) : {}, altTargetIds };
}

// runs: [{ k, out }]; ctx as in validateChoiceLink; overrides: entries for this key.
export function freezeKey({ key, ctx, runs, overrides = [], sourceRunsDir = null, generatedFrom = null }) {
  const withVal = runs.map(r => ({ ...r, validation: validateChoiceLink(r.out, ctx) }));
  const questions = ctx.questions.map(iq => {
    const polarities = new Set(), picked = [];
    const choices = iq.choices.map(ic => {
      const ov = overrides.find(o => o.key === key && o.question === iq.number && o.choice === ic.number) ?? null;
      const r = selectChoice({ runs: withVal, qn: iq.number, cn: ic.number, truth: ic.truth, override: ov });
      picked.push({ k: r.selected, ids: new Set(refIds(r.run)) });
      polarities.add(withVal.find(x => x.k === r.selected).out.questions.find(q => q.number === iq.number).stemPolarity);
      return { ...r.run, truth: ic.truth, selectedRun: r.selected, selection: r.selection, runTypes: r.runTypes, altTargetIds: r.altTargetIds };
    });
    if (polarities.size > 1) throw new Error(`FREEZE_POLARITY_CONFLICT: ${key} q${iq.number} ${[...polarities].join(',')}`);
    // extraSegments of the selected runs that the selected choices reference, merged by id.
    const extras = new Map();
    for (const { k, ids } of picked) {
      for (const e of withVal.find(x => x.k === k).out.questions.find(q => q.number === iq.number).extraSegments) {
        if (!ids.has(e.id)) continue;
        const prev = extras.get(e.id);
        if (prev && (prev.parentId !== e.parentId || prev.quote !== e.quote)) throw new Error(`FREEZE_EXTRA_CONFLICT: ${key} q${iq.number} ${e.id}`);
        if (!prev) extras.set(e.id, e);
      }
    }
    return { number: iq.number, stemPolarity: [...polarities][0], extraSegments: [...extras.values()], choices };
  });
  const frozen = { version: 1, passageId: ctx.passageId, sourceRunsDir, runs: runs.map(r => r.k), generatedFrom, questions };
  return { frozen, validation: validateChoiceLink(frozen, ctx) };
}

export function summarizeFreeze(results) {
  return results.map(({ key, frozen, validation }) => {
    const cs = frozen.questions.flatMap(q => q.choices.map(c => ({ q: q.number, c })));
    const decidedBy = {}, bySelectedRun = {}, twistTypes = {};
    for (const { c } of cs) {
      decidedBy[c.selection.decidedBy] = (decidedBy[c.selection.decidedBy] ?? 0) + 1;
      bySelectedRun[`r${c.selectedRun}`] = (bySelectedRun[`r${c.selectedRun}`] ?? 0) + 1;
      if (c.truth === 'FALSE') for (const p of c.parts) if (p.twisted) twistTypes[p.twistType] = (twistTypes[p.twistType] ?? 0) + 1;
    }
    const at = ({ q, c }) => `q${q}#${c.number}`;
    return { key, passageId: frozen.passageId, choices: cs.length, decidedBy, bySelectedRun,
      overrides: cs.filter(x => x.c.selection.override !== null).map(x => ({ at: at(x), run: x.c.selectedRun, reason: x.c.selection.override })),
      unresolved: cs.filter(x => x.c.selection.unresolved).map(at),
      skipped: cs.filter(x => x.c.selection.skippedSteps.length).map(x => ({ at: at(x), steps: x.c.selection.skippedSteps })),
      violations: validation.items.reduce((n, i) => n + i.violations.length, 0), twistTypes };
  });
}

export function renderFreezeReport(sums) {
  const L = ['# 선지 연결 동결 요약', '', '## 지문별', '', '| 지문 | 선지 수 | decidedBy | 선택 회차 | 동결 검증 위반 |', '|---|---|---|---|---|'];
  const fmt = o => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(', ') || '-';
  for (const s of sums) L.push(`| ${s.key} | ${s.choices} | ${fmt(s.decidedBy)} | ${fmt(s.bySelectedRun)} | ${s.violations} |`);
  L.push(`| 합계 | ${sums.reduce((n, s) => n + s.choices, 0)} | | | ${sums.reduce((n, s) => n + s.violations, 0)} |`, '', '## 덮어쓰기', '');
  const list = rows => { if (!rows.length) L.push('없음'); else for (const r of rows) L.push(`- ${r}`); };
  list(sums.flatMap(s => s.overrides.map(o => `${s.key} ${o.at} -> r${o.run}: ${o.reason}`)));
  L.push('', '## 미결 (UNRESOLVED_TYPE)', '');
  list(sums.flatMap(s => s.unresolved.map(a => `${s.key} ${a}`)));
  L.push('', '## 건너뛴 단계 (skippedSteps)', '');
  list(sums.flatMap(s => s.skipped.map(x => `${s.key} ${x.at}: ${x.steps.join(', ')}`)));
  L.push('', '## FALSE 선지 동결 종류 분포 (twistType별 조각 수)', '', '| 지문 | 분포 |', '|---|---|');
  for (const s of sums) L.push(`| ${s.key} | ${fmt(s.twistTypes)} |`);
  return L.join('\n') + '\n';
}

export function loadRuns(runsDir, key) {
  const dir = `${runsDir}/${key}`;
  return readdirSync(dir).map(n => /^r(\d+)$/.exec(n)).filter(Boolean).map(m => Number(m[1])).sort((a, b) => a - b)
    .filter(k => existsSync(`${dir}/r${k}/choice-link.json`)).map(k => ({ k, out: readJson(`${dir}/r${k}/choice-link.json`) }));
}

export function main({ targetsPath, runsDir, out, overridesPath = null, fixedPath = FIXED_PATH } = {}) {
  if (!targetsPath || !runsDir || !out) throw new Error('USAGE: --targets, --runs-dir and --out are required');
  const overrides = overridesPath ? readJson(overridesPath) : [];
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const t of loadTargets(targetsPath, fixedPath)) {
    const ctx = { passageId: t.passageId, map: t.map, questions: t.questions, paragraphs: t.passage.paragraphs.map(p => p.text) };
    const runs = loadRuns(runsDir, t.key);
    if (!runs.length) throw new Error(`FREEZE_NO_RUNS: ${t.key}`);
    const { frozen, validation } = freezeKey({ key: t.key, ctx, runs, overrides, sourceRunsDir: runsDir, generatedFrom: { targets: targetsPath, overrides: overridesPath } });
    writeFileSync(`${out}/${t.key}.json`, serialize(frozen));
    if (!validation.allPass) writeFileSync(`${out}/${t.key}.validation.json`, serialize(validation));
    results.push({ key: t.key, frozen, validation });
  }
  const sums = summarizeFreeze(results);
  writeFileSync(`${out}/freeze-summary.json`, serialize(sums));
  writeFileSync(`${out}/FREEZE.md`, renderFreezeReport(sums));
  return sums;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const sums = main({ targetsPath: opt('--targets'), runsDir: opt('--runs-dir'), out: opt('--out'), overridesPath: opt('--overrides') ?? null, fixedPath: opt('--fixed') });
  console.log(JSON.stringify(sums.map(s => ({ key: s.key, choices: s.choices, decidedBy: s.decidedBy, unresolved: s.unresolved.length, violations: s.violations })), null, 2));
}
