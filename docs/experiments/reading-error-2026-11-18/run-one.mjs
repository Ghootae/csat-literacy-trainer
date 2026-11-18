/**
 * 실행 순서 1~4를 학생 한 명에게 적용한다(README "실행 순서").
 * 사용(저장소 루트): node --env-file=.env docs/experiments/reading-error-2026-11-18/run-one.mjs S-58
 * 읽는 파일: inputs/<학생>.json, PROMPT-v2.md, 앱의 문항 묶음·사고 진단 지시문. KEY.md·students.py·codes.json은 읽지 않는다.
 * 쓰는 파일: inputs-filtered/<학생>.json, runs/<학생>.diagnosis.json, runs/<학생>-r1.gen.json, runs/<학생>-r1.review.json
 * 모델 호출: 사고 진단 항목 수만큼 + (대상 문항이 2개 이상이면) 생성 1회 + 검토 1회.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { diagnoseThought, loadThoughtDiagnosisPrompts, THOUGHT_DIAGNOSIS_MODEL } from '../../../packages/pipeline/dist/index.js';
import { loadDiagnosticBundle, loadDiagnosticSet } from '../../../packages/app/dist/server/diagnostic/content.js';

const student = process.argv[2];
if (!/^S-\d+$/u.test(student ?? '')) throw new Error('학생 id 필요(예: S-58)');
const dir = resolve(process.cwd(), 'docs/experiments/reading-error-2026-11-18');
const write = (path, value) => writeFileSync(resolve(dir, path), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
mkdirSync(resolve(dir, 'inputs-filtered'), { recursive: true }); mkdirSync(resolve(dir, 'runs'), { recursive: true });

const input = JSON.parse(readFileSync(resolve(dir, `inputs/${student}.json`), 'utf8'));
const client = new OpenAI({ maxRetries: 0 });
const transport = { create: (request, options) => client.responses.create(request, options) };

// ---------- 1) 사고 진단 (앱의 현재 지시문·모델·요청 그대로) ----------
const set = loadDiagnosticSet();
const byItem = (item) => {
  const number = Number(/(\d+)번$/u.exec(item)?.[1]);
  const found = [];
  for (const passage of set.passages) {
    for (const questionId of passage.questionIds) {
      const bundle = loadDiagnosticBundle(questionId);
      if (bundle.source.questionNumber === number && item.startsWith(bundle.source.title)) found.push({ questionId, bundle });
    }
  }
  if (found.length !== 1) throw new Error(`문항을 하나로 정하지 못함: ${item} (${found.length}개)`);
  return found[0];
};
const savedPath = resolve(dir, `runs/${student}.diagnosis.json`);
let diagnosisLog;
if (existsSync(savedPath)) {
  // 이어 실행: 이미 저장된 사고 진단 원본을 그대로 쓴다(재호출 없음).
  diagnosisLog = JSON.parse(readFileSync(savedPath, 'utf8')).calls;
  for (const entry of input.evidenceEntries) {
    const saved = diagnosisLog.find(c => c.item === entry.item);
    if (!saved) throw new Error(`저장된 진단에 없음: ${entry.item}`);
    const o = saved.output; entry.thoughtDiagnosis = { outcomeType: o.outcomeType, steps: o.steps, firstFailedStep: o.firstFailedStep, errors: o.errors };
  }
  console.log('저장된 사고 진단 재사용');
} else {
  const instructions = loadThoughtDiagnosisPrompts().instructions;
  diagnosisLog = [];
  for (const entry of input.evidenceEntries) {
    const { questionId, bundle } = byItem(entry.item);
    const choice = bundle.source.choices.find(c => c.position === entry.chosen.position);
    if (!choice || choice.text !== entry.chosen.text) throw new Error(`고른 선지가 묶음과 다름: ${entry.item}`);
    const call = await diagnoseThought(transport, bundle.source, { caseId: `${student}:${questionId}`, choiceId: choice.choiceId, rationale: entry.studentRationale }, instructions);
    entry.thoughtDiagnosis = { outcomeType: call.output.outcomeType, steps: call.output.steps, firstFailedStep: call.output.firstFailedStep, errors: call.output.errors };
    diagnosisLog.push({ item: entry.item, questionId, output: call.output, metadata: call.metadata });
    console.log(`진단 완료: ${entry.item} → ${call.output.outcomeType} ${JSON.stringify(call.output.errors.map(e => `${e.step}/${e.tag}`))}`);
  }
  write(`runs/${student}.diagnosis.json`, { student, model: THOUGHT_DIAGNOSIS_MODEL, calls: diagnosisLog });
}

// ---------- 2) 거르기 (코드) ----------
const STEPS = new Set(['S2_CHOICE', 'S4_INTERPRET']);
const TAGS = new Set(['CONDITION', 'SCOPE', 'DIRECTION', 'POLARITY', 'REFERENT', 'MAPPING', 'PARAPHRASE_DISTANCE', 'MISREAD_FACT']);
const isTarget = (entry) => entry.thoughtDiagnosis.errors.some(e => STEPS.has(e.step) && TAGS.has(e.tag));
const kept = input.evidenceEntries.filter(isTarget);
const excludedEntries = input.evidenceEntries.filter(e => !isTarget(e)).map(e => ({ item: e.item, tags: e.thoughtDiagnosis.errors.map(x => x.tag) }));
const filtered = { ...input, evidenceEntries: kept, excludedEntries };
write(`inputs-filtered/${student}.json`, filtered);
console.log(`거르기: 대상 ${kept.length}개, 제외 ${excludedEntries.length}개`);
if (kept.length < 2) { console.log('대상이 2개 미만 → 생성·검토 호출 없이 NONE'); write(`runs/${student}.none.json`, { student, result: 'NONE', reason: `대상 ${kept.length}개(<2)`, excludedEntries }); process.exit(0); }

// ---------- 3) 생성 (sol 1회) ----------
const prompt = readFileSync(resolve(dir, 'PROMPT-v2.md'), 'utf8');
const [generationPrompt, reviewPrompt] = prompt.split(/\n---\n/u);
if (!generationPrompt?.includes('(생성)') || !reviewPrompt?.includes('(검토)')) throw new Error('PROMPT-v2.md를 생성·검토로 나누지 못함');
const ask = async (instructionsText, userText) => {
  const started = performance.now();
  const response = await transport.create({ model: THOUGHT_DIAGNOSIS_MODEL, instructions: instructionsText, reasoning: { effort: 'medium' }, max_output_tokens: 12000,
    input: [{ role: 'user', content: [{ type: 'input_text', text: userText }] }], }, { timeout: 180000, maxRetries: 0 });
  if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
  const raw = response.output_text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  return { value: JSON.parse(raw), rawText: response.output_text,
    metadata: { model: THOUGHT_DIAGNOSIS_MODEL, durationMs: Math.round(performance.now() - started), inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 } };
};
const inputText = JSON.stringify(filtered, null, 2);
const gen = await ask(generationPrompt, inputText);
write(`runs/${student}-r1.gen.json`, { student, run: 1, metadata: gen.metadata, output: gen.value });
console.log(`생성 완료: result=${gen.value.result}`);

// ---------- 4) 검토 (1회) ----------
const review = await ask(reviewPrompt, `## 입력\n${inputText}\n\n## 생성 결과\n${JSON.stringify(gen.value, null, 2)}`);
write(`runs/${student}-r1.review.json`, { student, run: 1, metadata: review.metadata, output: review.value });
console.log(`검토 완료: verdict=${review.value.verdict}`);
