// Re-judges stored INITIAL summaries N times per prompt version (luna) to separate prompt effect from run-to-run spread.
// Usage: node --env-file-if-exists=.env scripts/run-paragraph-initial-stability.mjs --out <dir> [--runs 5]
// Cases: student-sim stage-1 sessions that ended without a question under v4.9 (para-6, para-50, para-51; 50 and 51 share one summary).
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadDialoguePassages } from '../packages/app/dist/server/content.js';
import { OpenAISimpleEvaluator, evaluateSimple, coveredBeforeFromSteps } from '../packages/pipeline/dist/paragraph-simple/index.js';

const argv = process.argv, opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const out = opt('--out'), runs = Number(opt('--runs') ?? 5);
if (!out) throw new Error('--out required');
mkdirSync(out, { recursive: true });
const ledger = `${out}/runs.jsonl`;
if (existsSync(ledger)) throw new Error('RUN_EXISTS');

const CASES = [
  { caseId: 'para-6', paragraph: 1, text: '바이러스가 생물체 단백질을 항원으로 인식해서 항체 만들어 대항함 -> 백신 접종해서 면역 반응 일으키면 감염 미리 대비 가능.' },
  { caseId: 'para-50/51', paragraph: 5, text: '낮은 산도에서 지질과 mRNA 결합 후 산도를 높여 복합체 -> 세포 내 진입. 세포 내부에서 엔도솜이 터져서 mRNA가 방출 -> 바이러스 단백질 합성 & 면역 반응' },
];
const PROMPTS = [
  { version: 'paragraph-simple-holistic-v4.8', path: 'packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md' },
  { version: 'paragraph-simple-holistic-v4.9', path: 'packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.9.md' },
];
const passage = loadDialoguePassages().find(p => p.passageId === 'mrna-vaccine-lipid-nanoparticle');

for (const c of CASES) {
  const paragraph = passage.paragraphs[c.paragraph - 1];
  // Same shape the dialogue service builds for an INITIAL step.
  const input = {
    passage: { title: passage.title, paragraphs: passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
    targetParagraph: { paragraphId: paragraph.paragraphId, text: paragraph.text },
    stage: 'INITIAL', dialogue: [{ role: 'student', text: c.text }], coreParts: null, targetError: null, targetGaps: null,
    coveredBefore: coveredBeforeFromSteps([]),
  };
  for (const p of PROMPTS) {
    const evaluator = new OpenAISimpleEvaluator({ promptPath: p.path, promptVersion: p.version });
    for (let i = 1; i <= runs; i++) {
      try {
        const r = await evaluateSimple(evaluator, structuredClone(input));
        const o = r.output;
        appendFileSync(ledger, JSON.stringify({ caseId: c.caseId, prompt: p.version, run: i, category: o.category, action: o.action,
          corePartsCovered: o.corePartsCovered, coreParts: o.coreParts.map(x => x.description),
          errors: o.errors.map(e => ({ studentQuote: e.studentQuote, correction: e.correction })),
          gaps: o.gaps.map(g => g.question), message: o.message, reason: o.reason, call: r.call, validationFailures: r.validationFailures.length }) + '\n');
        console.log(c.caseId, p.version, i, o.action, JSON.stringify(o.corePartsCovered));
      } catch (e) { appendFileSync(ledger, JSON.stringify({ caseId: c.caseId, prompt: p.version, run: i, error: String(e) }) + '\n'); console.log(c.caseId, p.version, i, 'ERROR', String(e).slice(0, 120)); }
    }
  }
}
