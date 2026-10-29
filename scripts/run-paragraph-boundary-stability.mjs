// Re-judges one stored INITIAL summary N times with the live paragraph-simple evaluator (luna, prompt v4.7) to see verdict spread.
// Usage: node --env-file-if-exists=.env scripts/run-paragraph-boundary-stability.mjs --out <dir> [--runs 10]
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadDialoguePassages } from '../packages/app/dist/server/content.js';
import { OpenAISimpleEvaluator, evaluateSimple } from '../packages/pipeline/dist/paragraph-simple/index.js';

const argv = process.argv, opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const out = opt('--out'), runs = Number(opt('--runs') ?? 10);
if (!out) throw new Error('--out required');
mkdirSync(out, { recursive: true });
const ledger = `${out}/runs.jsonl`;
if (existsSync(ledger)) throw new Error('RUN_EXISTS');
const passage = loadDialoguePassages().find(p => p.passageId === 'mrna-vaccine-lipid-nanoparticle');
const paragraph = passage.paragraphs.find(p => p.paragraphId === 'mrna-vaccine-lipid-nanoparticle-p3');
const text = '세포막을 구성하는 인지질은 지방산으로 구성된 꼬리(세포막 구성)와 인산기 머리(외부 수용액 접함)로 구성.-> 친수성 물질이 세포막 투과 차단.';
const input = {
  passage: { title: passage.title, paragraphs: passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
  targetParagraph: { paragraphId: paragraph.paragraphId, text: paragraph.text },
  stage: 'INITIAL', dialogue: [{ role: 'student', text }], coreParts: null, targetError: null, targetGaps: null,
};
const evaluator = new OpenAISimpleEvaluator();
for (let i = 1; i <= runs; i++) {
  try {
    const r = await evaluateSimple(evaluator, structuredClone(input));
    const o = r.output;
    appendFileSync(ledger, JSON.stringify({ run: i, category: o.category, action: o.action, corePartsCovered: o.corePartsCovered,
      coreParts: o.coreParts.map(c => c.description), gaps: o.gaps?.map(g => ({ corePartIndex: g.corePartIndex, description: g.description, question: g.question })),
      message: o.message, call: r.call, validationFailures: r.validationFailures?.length ?? 0 }) + '\n');
    console.log(i, o.category, JSON.stringify(o.corePartsCovered));
  } catch (e) { appendFileSync(ledger, JSON.stringify({ run: i, error: String(e) }) + '\n'); console.log(i, 'ERROR', String(e).slice(0, 120)); }
}
