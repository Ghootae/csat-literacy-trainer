import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ProblemQuestionGold } from '../problem-solving/gold.js';
import {
  OpenAIProblemPathEvaluator,
  type ProblemPathEvaluatorEffort,
} from '../problem-solving/path-evaluator-runtime.js';
import {
  runProblemVerticalSlice,
  ProblemVerticalSliceCaseSchema,
  type ProblemVerticalSliceCase,
} from '../problem-solving/vertical-slice.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const cases: readonly ProblemVerticalSliceCase[] = [{
  caseId: 'mrna-c4-ph-direction',
  initialChoiceId: 'C4',
  rationale: 'pH가 높으면 수소 이온 농도도 높아진다고 생각했습니다.',
  diagnosticAnswers: ['pH가 높을수록 수소 이온 농도가 높아진다는 뜻으로 이해했습니다.'],
  correctiveAnswers: ['pH가 높아질수록 수소 이온 농도는 낮아집니다. 따라서 ④는 맞는 설명입니다.'],
  coachingAcknowledgement: '설명을 확인했습니다.',
  reselectionChoiceId: 'C5',
  maxEvaluatorTurns: 6,
}, {
  caseId: 'mrna-c2-vague',
  initialChoiceId: 'C2',
  rationale: '그냥 이상해 보여요.',
  diagnosticAnswers: ['속도를 계속 바꾼다는 뜻으로 이해했습니다.'],
  correctiveAnswers: ['두 용액이 일정한 비율로 들어가도록 각각의 속도를 맞춘다는 뜻입니다.'],
  coachingAcknowledgement: '문항에서 의도한 해석 경계를 확인했습니다.',
  reselectionChoiceId: 'C5',
  maxEvaluatorTurns: 7,
}, {
  caseId: 'mrna-missed-answer-property-boundary',
  initialChoiceId: 'C2',
  rationale: 'pH가 높아져 중성이 되면 소수성도 약해진다고 생각했습니다.',
  diagnosticAnswers: ['⑤는 중성이 되면 소수성도 약해진다는 설명이라 맞다고 보았습니다.'],
  correctiveAnswers: ['전기적 중성은 전하 상태이고 소수성은 별도 속성이므로, 중성이 된 것만으로 소수성 약화를 결론낼 수 없습니다.'],
  coachingAcknowledgement: '전하 상태와 소수성을 구분해야 한다는 점을 확인했습니다.',
  reselectionChoiceId: 'C5',
  maxEvaluatorTurns: 7,
}, {
  caseId: 'mrna-c3-visual-misread',
  initialChoiceId: 'C3',
  rationale: 'Y자 관에서 두 용액이 만나는 순간 mRNA가 분해되는 그림이라 ③이 틀렸다고 생각했습니다.',
  diagnosticAnswers: ['그림의 합류 지점이 mRNA 분해를 뜻한다고 보았습니다.'],
  correctiveAnswers: ['그림은 두 용액이 합류해 혼합되고 복합체가 형성되는 과정을 나타내며, mRNA 분해는 표시하지 않습니다.'],
  coachingAcknowledgement: '그림의 합류와 mRNA 분해를 구분했습니다.',
  reselectionChoiceId: 'C5',
  maxEvaluatorTurns: 7,
}];

const externalCasesPath = option('--cases');
const availableCases: readonly ProblemVerticalSliceCase[] = externalCasesPath === undefined
  ? cases
  : ((JSON.parse(readFileSync(resolve(process.cwd(), externalCasesPath), 'utf8')) as {
      cases: readonly unknown[];
    }).cases.map((item) => ProblemVerticalSliceCaseSchema.parse(item)));
const selectedId = option('--case') ?? 'all';
const selected = availableCases.filter((item) => selectedId === 'all' || item.caseId === selectedId);
if (selected.length === 0) throw new Error(`알 수 없는 vertical slice case: ${selectedId}`);
if (!process.env['OPENAI_API_KEY']) throw new Error('OPENAI_API_KEY가 필요하다.');

const effortOption = option('--effort');
const allowedEfforts = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
if (effortOption !== undefined && !allowedEfforts.has(effortOption)) {
  throw new Error(`지원하지 않는 effort: ${effortOption}`);
}
const modelOption = option('--model');
const evaluator = new OpenAIProblemPathEvaluator({
  ...(modelOption === undefined ? {} : { model: modelOption }),
  ...(effortOption === undefined ? {} : { effort: effortOption as ProblemPathEvaluatorEffort }),
});
const fixtureRoot = resolve(process.cwd(), 'packages/pipeline/fixtures/experiments/problem-solving');
const goldPath = resolve(
  process.cwd(),
  option('--gold') ?? resolve(fixtureRoot, 'mrna-vaccine-lipid-nanoparticle-q19.json'),
);
const gold = JSON.parse(readFileSync(
  goldPath, 'utf8',
)) as ProblemQuestionGold;
const runId = new Date().toISOString().replaceAll(':', '-');
const outputDir = resolve(option('--output-dir') ?? '.omc/experiments/problem-path-vertical', runId);
mkdirSync(outputDir, { recursive: true });

const records: unknown[] = [];
let failed = false;
for (const testCase of selected) {
  try {
    const result = await runProblemVerticalSlice({ testCase, gold, evaluator });
    const actions = result.trace.flatMap((entry) => entry.evaluatorResult.mode === 'DIAGNOSE_PATH'
      ? [entry.evaluatorResult.nextActionCandidate.type]
      : []);
    const hasReselection = actions.at(-1) === 'REQUEST_RESELECTION';
    const noUnauthorizedSupplemental = result.trace.every((entry) =>
      entry.evaluatorResult.mode !== 'DIAGNOSE_PATH' ||
      entry.evaluatorResult.nextActionCandidate.supplementalInferenceIds.length === 0);
    const noAnswerLeak = result.trace.every((entry) => {
      if (entry.evaluatorResult.mode !== 'DIAGNOSE_PATH') return true;
      const action = entry.evaluatorResult.nextActionCandidate;
      if (action.type !== 'ASK_DIAGNOSTIC' && action.type !== 'ASK_CORRECTIVE') return true;
      return !/(?:정답|⑤|5번|C5)/u.test(action.questionText);
    });
    const passed = result.completed &&
      result.finalSession.result?.correct === true &&
      result.finalSession.result.finalChoiceId === gold.answerChoiceId &&
      hasReselection &&
      noUnauthorizedSupplemental &&
      noAnswerLeak;
    if (!passed) failed = true;
    records.push({
      status: passed ? 'PASS' : 'FAIL',
      assertions: { hasReselection, noUnauthorizedSupplemental, noAnswerLeak },
      result,
    });
    process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${testCase.caseId}: ${result.finalSession.phase}\n`);
  } catch (error) {
    failed = true;
    const failure = {
      status: 'FAIL',
      caseId: testCase.caseId,
      error: error instanceof Error
        ? { name: error.name, message: error.message, parsedOutput: (error as any).parsedOutput ?? null }
        : { name: 'UnknownError', message: String(error), parsedOutput: null },
    };
    records.push(failure);
    process.stdout.write(`FAIL ${testCase.caseId}: ${failure.error.message}\n`);
  }
}

const outputPath = resolve(outputDir, 'results.json');
writeFileSync(outputPath, `${JSON.stringify({
  runId,
  source: { goldPath, casesPath: externalCasesPath ?? null },
  records,
}, null, 2)}\n`);
process.stdout.write(`결과: ${outputPath}\n`);
if (failed) process.exitCode = 1;
