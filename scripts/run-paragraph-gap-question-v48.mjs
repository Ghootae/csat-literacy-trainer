// v4.8 검증(V1 뒤집힘, V2 질문 모양, V3 회귀). gpt-6-luna 고정, 첫 호출 46회(V1 20+V2 10+V3 16), 상한 $0.5.
// Usage: node --env-file-if-exists=.env scripts/run-paragraph-gap-question-v48.mjs [--dry]
import { readFileSync, appendFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { loadDialoguePassages } from '../packages/app/dist/server/content.js';
import { OpenAISimpleEvaluator, evaluateSimple } from '../packages/pipeline/dist/paragraph-simple/index.js';

const OUT = 'docs/experiments/paragraph-gap-question-v48-2026-10-28';
const LOG = '.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl';
const V47_RUNS = 'docs/experiments/paragraph-boundary-stability-2026-10-28/runs.jsonl';
const MODEL = 'gpt-6-luna', CAP_USD = 0.5, EXPECTED_FIRST_CALLS = 46, CONCURRENCY = 4;
const dry = process.argv.includes('--dry');
const ledger = `${OUT}/runs.jsonl`;
if (!dry && existsSync(OUT)) throw new Error('RUN_EXISTS: 결과 폴더가 이미 있다');

const passages = loadDialoguePassages();
const records = readFileSync(LOG, 'utf8').trim().split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
const steps = records.filter(r => r.event === 'STEP');
const passageInput = (passageId, paragraphId) => {
  const passage = passages.find(p => p.passageId === passageId);
  const paragraph = passage.paragraphs.find(p => p.paragraphId === paragraphId);
  return { passage: { title: passage.title, paragraphs: passage.paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })) },
    targetParagraph: { paragraphId, text: paragraph.text } };
};
const toDialogue = transcript => transcript.filter(m => m.kind !== 'WAIT_DONE').map(({ role, text, items, copied }) =>
  ({ role, text: items ? `${text}\n${items.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : text, ...(copied ? { copied } : {}) }));

// ---- V1: 세션 d6bb304e p5 AFTER_CORRECTION
const P5 = 'mrna-vaccine-lipid-nanoparticle-p5';
const s1 = steps.filter(r => r.sessionId.startsWith('d6bb304e') && r.paragraphId === P5);
const initialRec = s1.find(r => r.step.stage === 'INITIAL'), acRec = s1.find(r => r.step.stage === 'AFTER_CORRECTION');
const cut = acRec.transcript.findIndex(m => m.role === 'student' && m.text === acRec.step.studentText);
const v1Base = { ...passageInput('mrna-vaccine-lipid-nanoparticle', P5), stage: 'AFTER_CORRECTION',
  dialogue: toDialogue(acRec.transcript.slice(0, cut + 1)), coreParts: initialRec.state.coreParts, targetError: initialRec.state.targetError, targetGaps: null };
const v1Covered = initialRec.step.output.corePartsCovered;
if (JSON.stringify(v1Covered) !== '[false,true]') throw new Error(`V1 coveredBefore 예상과 다름: ${JSON.stringify(v1Covered)}`);

// ---- V2: 3문단 첫 요약
const v2Text = '세포막을 구성하는 인지질은 지방산으로 구성된 꼬리(세포막 구성)와 인산기 머리(외부 수용액 접함)로 구성.-> 친수성 물질이 세포막 투과 차단.';
const v2Input = { ...passageInput('mrna-vaccine-lipid-nanoparticle', 'mrna-vaccine-lipid-nanoparticle-p3'), stage: 'INITIAL',
  dialogue: [{ role: 'student', text: v2Text }], coreParts: null, targetError: null, targetGaps: null, coveredBefore: null };

// ---- V3: 저장 기록 INITIAL 8개 (지문 4개, CAPTURED 3·GAP 3·ONE_ERROR 2)
const V3_PICKS = [
  ['376db6cc', 'dopamine-motor-control-p3', '직접·간접 경로를 정리한 요약이 저장 판정 CAPTURED'],
  ['b630ebfd', 'information-asymmetry-free-marketplace-p3', '짧은 이론 문단, 부분 1개 CAPTURED'],
  ['6a1601d8', 'gongsun-long-later-mohists-p3', '"흰말은 말이 아니다" 주장 요약 CAPTURED'],
  ['b630ebfd', 'information-asymmetry-free-marketplace-p1', '2번 부분이 빠진 GAP'],
  ['9b1dbb33', 'surface-tension-laplace-p5', '부분 3개, 2개가 빠진 GAP'],
  ['6a1601d8', 'gongsun-long-later-mohists-p5', '용어 나열 요약, 저장 판정 GAP'],
  ['f0a8898e', 'dopamine-motor-control-p2', '수용체 요약에 오류가 있다고 본 ONE_ERROR'],
  ['9b1dbb33', 'surface-tension-laplace-p3', '기포 병합 요약에 오류가 있다고 본 ONE_ERROR'],
];
const v3Cases = V3_PICKS.map(([sid, paragraphId, why]) => {
  const rec = steps.find(r => r.sessionId.startsWith(sid) && r.paragraphId === paragraphId && r.step.stage === 'INITIAL');
  if (!rec) throw new Error(`V3 기록 없음: ${sid} ${paragraphId}`);
  const passageId = paragraphId.replace(/-p\d+$/, '');
  return { caseId: `${sid}/${paragraphId.split('-').pop()}`, passageId, paragraphId, why, studentText: rec.step.studentText,
    stored: rec.step.output.category, storedCovered: rec.step.output.corePartsCovered,
    input: { ...passageInput(passageId, paragraphId), stage: 'INITIAL', dialogue: [{ role: 'student', text: rec.step.studentText }], coreParts: null, targetError: null, targetGaps: null, coveredBefore: null } };
});

// ---- 호출 계획
const plan = [];
for (let i = 1; i <= 10; i++) plan.push({ arm: 'V1-v4.7', caseId: 'd6bb304e/p5', run: i, version: 'v4.7', input: structuredClone(v1Base) });
for (let i = 1; i <= 10; i++) plan.push({ arm: 'V1-v4.8', caseId: 'd6bb304e/p5', run: i, version: 'v4.8', input: { ...structuredClone(v1Base), coveredBefore: v1Covered } });
for (let i = 1; i <= 10; i++) plan.push({ arm: 'V2-v4.8', caseId: 'mrna/p3', run: i, version: 'v4.8', input: structuredClone(v2Input) });
for (const c of v3Cases) for (let i = 1; i <= 2; i++) plan.push({ arm: 'V3-v4.8', caseId: c.caseId, run: i, version: 'v4.8', input: structuredClone(c.input) });
console.log(`계획 첫 호출 수: ${plan.length} (V1 ${plan.filter(p => p.arm.startsWith('V1')).length}, V2 ${plan.filter(p => p.arm.startsWith('V2')).length}, V3 ${plan.filter(p => p.arm.startsWith('V3')).length}), 모델 ${MODEL}, 상한 $${CAP_USD}`);
if (plan.length !== EXPECTED_FIRST_CALLS) throw new Error(`계획 호출 수 ${plan.length} != ${EXPECTED_FIRST_CALLS}`);
if (dry) { console.log('dry run: 전송 없음'); process.exit(0); }

mkdirSync(OUT, { recursive: true });
const ev47 = new OpenAISimpleEvaluator({ model: MODEL });
const ev48 = new OpenAISimpleEvaluator({ model: MODEL, promptPath: 'packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md', promptVersion: 'paragraph-simple-holistic-v4.8' });
const usd = c => (c.inputTokens * 0.10 + c.outputTokens * 0.50) / 1e6;
let spent = 0, sentCalls = 0, stop = false;
const perCall = [];
const estimate = () => perCall.length ? perCall.reduce((a, b) => a + b, 0) / perCall.length : 0.01;

async function runOne(item) {
  const { arm, caseId, run, version, input } = item;
  const head = { arm, case: caseId, run };
  try {
    const r = await evaluateSimple(version === 'v4.8' ? ev48 : ev47, input);
    const o = r.output, cost = usd(r.call);
    spent += cost; perCall.push(cost);
    appendFileSync(ledger, JSON.stringify({ ...head, category: o.category, action: o.action, corePartsCovered: o.corePartsCovered,
      gaps: o.gaps.map(g => ({ corePartIndex: g.corePartIndex, question: g.question })), message: o.message,
      attempts: r.call.attempts, call: r.call, validationFailures: r.validationFailures.length, promptVersion: r.call.promptVersion, costUsd: cost }) + '\n');
    console.log(arm, caseId, run, o.category, JSON.stringify(o.corePartsCovered), `$${spent.toFixed(4)}`);
  } catch (e) {
    const failures = e.validationFailures?.length ?? 0;
    const cost = estimate() * 2; spent += cost;
    appendFileSync(ledger, JSON.stringify({ ...head, error: String(e).slice(0, 400), validationFailures: failures, attempts: 2, costUsdEstimated: cost }) + '\n');
    console.log(arm, caseId, run, 'ERROR', String(e).slice(0, 100));
  }
}
const queue = [...plan];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length && !stop) {
    if (spent + estimate() * CONCURRENCY * 2 > CAP_USD) { stop = true; console.log(`상한 근접($${spent.toFixed(4)}): 중단`); break; }
    sentCalls++;
    await runOne(queue.shift());
  }
}));
console.log(`첫 호출 ${sentCalls}회, 누적 비용 $${spent.toFixed(4)}${stop ? ' (중단됨)' : ''}`);
writeFileSync(`${OUT}/cases.json`, JSON.stringify({ v1: { covered: v1Covered, input: v1Base }, v2: v2Input, v3: v3Cases.map(({ input, ...rest }) => rest) }, null, 2));
