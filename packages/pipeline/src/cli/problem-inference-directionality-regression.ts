import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ProblemQuestionGold } from '../problem-solving/gold.js';
import { createProblemPathEvaluatorInput } from '../problem-solving/path-evaluator-input.js';
import { OpenAIProblemPathEvaluator } from '../problem-solving/path-evaluator-runtime.js';
import {
  ProblemSolvingSessionSchema,
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from '../problem-solving/session.js';

interface CaseDefinition {
  readonly caseId: string;
  readonly questionId: string;
  readonly choiceId: string;
  readonly rationale: string;
  readonly expectedMode: 'ASSESS_SELECTION_RATIONALE' | 'DIAGNOSE_PATH';
  readonly expectedAssessment?: 'SUPPORTED';
  readonly repeats: number;
  readonly exactReselection?: boolean;
}

const fixtureRoot = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving',
);
const questionIds = [
  'mrna-vaccine-lipid-nanoparticle-q19',
  'gongsun-long-later-mohists-q12',
  'corporate-law-q13',
  'information-asymmetry-free-marketplace-q13',
  'surface-tension-laplace-q16',
  'dopamine-motor-control-q13',
] as const;
const goldByQuestionId = new Map<string, ProblemQuestionGold>(questionIds.map((questionId) => [
  questionId,
  JSON.parse(readFileSync(resolve(fixtureRoot, `${questionId}.json`), 'utf8')) as ProblemQuestionGold,
]));

const exactCases: CaseDefinition[] = [
  {
    caseId: 'INFO-L-C5',
    questionId: 'information-asymmetry-free-marketplace-q13',
    choiceId: 'C5',
    rationale: '1번과 3번은 맞는 설명이고, 다수 의견은 실명 확인 미실시 제재를 위헌으로 보았으므로 5번이 틀립니다.',
    expectedMode: 'ASSESS_SELECTION_RATIONALE',
    expectedAssessment: 'SUPPORTED',
    repeats: 10,
    exactReselection: true,
  },
  {
    caseId: 'MOHIST-L-C4',
    questionId: 'gongsun-long-later-mohists-q12',
    choiceId: 'C4',
    rationale: '후기 묵가는 하나의 명이 여러 실을 지시하는 것을 허용하고, 공손룡은 빨간 옷과 옷의 명을 구분합니다. 4번만 두 표현이 같은 대상을 지시한다고 잘못 봅니다.',
    expectedMode: 'ASSESS_SELECTION_RATIONALE',
    expectedAssessment: 'SUPPORTED',
    repeats: 10,
    exactReselection: true,
  },
];

const wrongRationales: Readonly<Record<string, { choiceId: string; rationale: string }>> = {
  'mrna-vaccine-lipid-nanoparticle-q19': {
    choiceId: 'C1', rationale: '에탄올의 pH가 7이면 물처럼 친수성일 것이므로 지질과 섞이지 못한다고 생각했습니다.',
  },
  'gongsun-long-later-mohists-q12': {
    choiceId: 'C3', rationale: '유명은 원래 여러 대상을 가리키므로 한 벌만 가리켜도 계속 유명이라고 생각했습니다.',
  },
  'corporate-law-q13': {
    choiceId: 'C5', rationale: '갑이 원래 출연한 부동산이고 대표 이사에게 운용 권한도 있으므로 절차 없이 기부해도 책임이 없다고 생각했습니다.',
  },
  'information-asymmetry-free-marketplace-q13': {
    choiceId: 'C1', rationale: '플랫폼에 과장 광고가 올라왔으니 플랫폼 A도 표시 의무 위반으로 제재할 수 있다고 생각했습니다.',
  },
  'surface-tension-laplace-q16': {
    choiceId: 'C2', rationale: '첨가제를 넣은 뒤 인쇄가 잘됐으므로 첨가제가 오네소르게 수를 더 크게 만들었다고 생각했습니다.',
  },
  'dopamine-motor-control-q13': {
    choiceId: 'C1', rationale: '도파민이 혈액-뇌 장벽을 통과하지 못하므로 도파민이 되는 레보도파도 통과하지 못한다고 생각했습니다.',
  },
};

const generalCases: CaseDefinition[] = questionIds.flatMap((questionId) => {
  const gold = goldByQuestionId.get(questionId)!;
  const answer = gold.choices.find((choice) => choice.choiceId === gold.answerChoiceId)!;
  const wrong = wrongRationales[questionId]!;
  return [
    {
      caseId: `${questionId}-CORRECT`,
      questionId,
      choiceId: gold.answerChoiceId,
      rationale: answer.rationale,
      expectedMode: 'ASSESS_SELECTION_RATIONALE' as const,
      expectedAssessment: 'SUPPORTED' as const,
      repeats: 3,
    },
    {
      caseId: `${questionId}-WRONG`,
      questionId,
      choiceId: wrong.choiceId,
      rationale: wrong.rationale,
      expectedMode: 'DIAGNOSE_PATH' as const,
      repeats: 3,
    },
  ];
});

function sessionFor(definition: CaseDefinition, iteration: number) {
  const gold = goldByQuestionId.get(definition.questionId)!;
  const initial = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `${definition.caseId}-${iteration}`,
    questionId: gold.questionId,
    answerChoiceId: gold.answerChoiceId,
  }), {
    initialChoiceId: definition.choiceId,
    rationale: definition.rationale,
  });
  if (!definition.exactReselection) return initial;
  return ProblemSolvingSessionSchema.parse({
    ...initial,
    initialChoiceId: definition.choiceId === 'C5' ? 'C1' : 'C2',
    selectionAttempt: 3,
    selectionCount: 3,
    pendingCorrectOutcome: 'RESELECTION_CORRECT_VERIFIED',
    observations: [{
      observationId: 'O5',
      kind: 'RESELECTION',
      inReplyToTurnId: 'T2',
      selectedChoiceId: definition.choiceId,
      rawResponse: definition.rationale,
      rationaleProvided: true,
    }],
  });
}

const jobs = [...exactCases, ...generalCases].flatMap((definition) =>
  Array.from({ length: definition.repeats }, (_, index) => ({
    definition,
    iteration: index + 1,
  })));
const evaluator = new OpenAIProblemPathEvaluator({ effort: 'medium' });

async function runJob(job: (typeof jobs)[number]) {
  const { definition, iteration } = job;
  const gold = goldByQuestionId.get(definition.questionId)!;
  const session = sessionFor(definition, iteration);
  const evaluationMode = session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
    ? 'ASSESS_SELECTION_RATIONALE' as const
    : 'DIAGNOSE_PATH' as const;
  const input = createProblemPathEvaluatorInput({ evaluationMode, session, gold });
  try {
    const evaluated = await evaluator.evaluate(input);
    const modePassed = evaluated.result.mode === definition.expectedMode;
    const assessmentPassed = definition.expectedAssessment === undefined ||
      (
        evaluated.result.mode === 'ASSESS_SELECTION_RATIONALE' &&
        evaluated.result.assessment === definition.expectedAssessment
      );
    return {
      caseId: definition.caseId,
      questionId: definition.questionId,
      iteration,
      passed: modePassed && assessmentPassed,
      expectedMode: definition.expectedMode,
      expectedAssessment: definition.expectedAssessment ?? null,
      result: evaluated.result,
      rawOutput: evaluated.rawOutput,
      call: evaluated.call,
    };
  } catch (error) {
    return {
      caseId: definition.caseId,
      questionId: definition.questionId,
      iteration,
      passed: false,
      expectedMode: definition.expectedMode,
      expectedAssessment: definition.expectedAssessment ?? null,
      error: error instanceof Error
        ? { name: error.name, message: error.message, parsedOutput: (error as any).parsedOutput ?? null }
        : { name: 'UnknownError', message: String(error), parsedOutput: null },
    };
  }
}

const results: Awaited<ReturnType<typeof runJob>>[] = [];
const concurrency = 6;
for (let index = 0; index < jobs.length; index += concurrency) {
  const batch = await Promise.all(jobs.slice(index, index + concurrency).map(runJob));
  results.push(...batch);
  process.stdout.write(`progress ${results.length}/${jobs.length}\n`);
}

const runId = new Date().toISOString().replaceAll(':', '-');
const outputDir = resolve('.omc/experiments/problem-inference-directionality', runId);
mkdirSync(outputDir, { recursive: true });
const byCase = Object.fromEntries([...new Set(results.map((result) => result.caseId))].map((caseId) => {
  const caseResults = results.filter((result) => result.caseId === caseId);
  return [caseId, {
    passed: caseResults.filter((result) => result.passed).length,
    total: caseResults.length,
    failures: caseResults.filter((result) => !result.passed).map((result) => result.iteration),
  }];
}));
const summary = {
  runId,
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  byCase,
};
writeFileSync(resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(resolve(outputDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`results: ${outputDir}\n`);
