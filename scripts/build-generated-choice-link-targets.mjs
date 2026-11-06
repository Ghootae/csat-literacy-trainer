// D-0206 E1: turn generated items (runs/<condition>/<passageId>/items.json) into run-choice-link.mjs targets (one targets file per condition, `questionsJson` per passage).
// Usage: node scripts/build-generated-choice-link-targets.mjs [--dry-run] [--targets <json>] [--runs-dir <dir>] [--out <dir>] [--conditions A,A2,B]
//   real:    writes <out>/choice-link/targets-<condition>.json and <out>/choice-link/questions/<condition>/<passageId>.json from the generated items.
//   dry-run: uses fake items (nothing generated is read), writes under <out>/choice-link/dry-run/, then runs run-choice-link.mjs main({ dryRun: true, runs: 1 }) per condition. Sends nothing.
// The real choice-link run is a separate step: node --env-file-if-exists=.env scripts/run-choice-link.mjs --targets <out>/choice-link/targets-<condition>.json --out <dir> --runs 1 (needs its own approval).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { stemPolarity, main as runChoiceLink } from './run-choice-link.mjs';
import { EXP_DIR, TARGETS_PATH, CONDITIONS, loadGenTargets, slotsOf, exampleItems, exampleDesign } from './run-item-generation.mjs';

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const CHOICE_LINK_LIMITS = { maxRequests: 4, usdCap: 4 };

// Generated items of one passage -> questions in loadQuestion's `question` shape. Question number = slot number; truth from polarity and answer.
export function toQuestions(items, slots) {
  return slots.map(s => {
    const it = items.items.find(x => x.slot === s.slot);
    if (!it) throw new Error(`ITEM_MISSING: slot ${s.slot}`);
    if (stemPolarity(it.stem) !== s.stemPolarity) throw new Error(`POLARITY_MISMATCH: slot ${s.slot}: stem ${stemPolarity(it.stem)} != ${s.stemPolarity}`);
    if (!it.choices.some(c => c.number === it.answer)) throw new Error(`ANSWER_MISSING: slot ${s.slot}`);
    return { number: s.slot, stem: it.stem, supplementSegments: [],
      choices: it.choices.map(c => ({ number: c.number, text: c.text, truth: (s.stemPolarity === 'SELECT_INCORRECT') === (c.number === it.answer) ? 'FALSE' : 'TRUE', explanation: null })),
      answer: it.answer, explanationSummary: null };
  });
}

export async function main({ dryRun = false, targetsPath = TARGETS_PATH, runsDir = `${EXP_DIR}/runs`, out = EXP_DIR, conditions = CONDITIONS } = {}) {
  const raw = readJson(targetsPath), targets = loadGenTargets(targetsPath), base = dryRun ? `${out}/choice-link/dry-run` : `${out}/choice-link`;
  const written = [];
  for (const cond of conditions) {
    const entries = [];
    for (const t of targets) {
      let items;
      if (dryRun) items = exampleItems(t, cond === 'A' ? null : exampleDesign(cond, t));
      else { const p = `${runsDir}/${cond}/${t.passageId}/items.json`; if (!existsSync(p)) throw new Error(`GENERATED_MISSING: ${p}`); items = readJson(p); }
      const questionsJson = `${base}/questions/${cond}/${t.passageId}.json`;
      mkdirSync(`${base}/questions/${cond}`, { recursive: true });
      writeFileSync(questionsJson, serialize(toQuestions(items, slotsOf(t))));
      // Same map, stance, classify and passage paths as the original target; questions come from questionsJson (questionsPath only locates the passage display file).
      const { slots, answersPath, assetsDir, ...rest } = raw.find(x => x.passageId === t.passageId);
      entries.push({ ...rest, questionsJson });
    }
    const targetsFile = `${base}/targets-${cond}.json`;
    writeFileSync(targetsFile, serialize(entries)); written.push(targetsFile);
  }
  if (!dryRun) return { dryRun: false, targetsFiles: written };
  const perCondition = [];
  for (const cond of conditions) {
    const r = await runChoiceLink({ dryRun: true, targetsPath: `${base}/targets-${cond}.json`, out: `${base}/${cond}`, runs: 1, limits: CHOICE_LINK_LIMITS });
    perCondition.push({ condition: cond, requests: r.requests, exampleAllPass: r.exampleAllPass, totalReserveUsd: r.totalReserveUsd, overCap: r.overCap, overMaxRequests: r.overMaxRequests,
      perPassage: r.perPassage.map(p => ({ passageId: p.passageId, questions: p.questions, reserveUsd: p.reserveUsdPerRequest })) });
  }
  return { dryRun: true, externalRequests: 0, requests: perCondition.reduce((a, c) => a + c.requests, 0), totalReserveUsd: perCondition.reduce((a, c) => a + c.totalReserveUsd, 0), perCondition };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  console.log(JSON.stringify(await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), runsDir: opt('--runs-dir'), out: opt('--out'), conditions: opt('--conditions')?.split(',') }), null, 2));
}
