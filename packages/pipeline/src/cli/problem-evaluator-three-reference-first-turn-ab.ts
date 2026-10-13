import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema } from '../problem-solving/gold.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const COST_CAP_USD = 6;
const COST_GUARD_USD = 0.30;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const CONDITIONS = ['RAW_SOURCE', 'CONCISE_GOLD', 'DETAILED_GOLD'] as const;
const PROFILE = process.env['THREE_REFERENCE_PROFILE'] ?? 'five-case';
if (PROFILE !== 'five-case' && PROFILE !== 'low-skill-ten-item') {
  throw new Error(`알 수 없는 THREE_REFERENCE_PROFILE: ${PROFILE}`);
}
const IS_LOW_SKILL_TEN_ITEM = PROFILE === 'low-skill-ten-item';
const ALL_CATEGORIES = [
  'accurate',
  'representativeWrong',
  'lowInformation',
  'correctInsufficient',
  'wrongMediumLow',
  'wrongLow',
] as const;
const CATEGORIES: readonly Category[] = IS_LOW_SKILL_TEN_ITEM
  ? ['correctInsufficient', 'wrongMediumLow', 'wrongLow']
  : ['accurate', 'representativeWrong', 'lowInformation'];
const EXPERIMENT_ROOT = resolve(IS_LOW_SKILL_TEN_ITEM
  ? 'docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06'
  : 'docs/experiments/problem-evaluator-three-reference-ab-2026-09-06');
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const SOURCE_ROOT = resolve(IS_LOW_SKILL_TEN_ITEM
  ? 'docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06/artifacts/source-cases'
  : 'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts');
const STUDENT_CASE_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const FIXTURE_PATH = resolve(IS_LOW_SKILL_TEN_ITEM
  ? 'packages/pipeline/experiments/problem-solving/three-reference-low-skill-ten-case-fixtures-v1.json'
  : 'packages/pipeline/experiments/problem-solving/three-reference-five-case-fixtures-v1.json');
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/three-reference-first-turn-prompt-v1.md',
);

const ConditionSchema = z.enum(CONDITIONS);
type Condition = z.infer<typeof ConditionSchema>;
const CategorySchema = z.enum(ALL_CATEGORIES);
type Category = z.infer<typeof CategorySchema>;
const AssessmentSchema = z.enum([
  'NO_ERROR_DETECTED',
  'CLEAR_ERROR',
  'INSUFFICIENT_EVIDENCE',
  'REASONABLE_ALTERNATIVE_INTERPRETATION',
  'ITEM_OR_EXPLANATION_LIMITATION',
]);
type Assessment = z.infer<typeof AssessmentSchema>;
const ActionSchema = z.enum([
  'COMPLETE',
  'ASK_DIAGNOSTIC',
  'ASK_CORRECTIVE',
  'EXPLAIN_ITEM_BOUNDARY',
]);
type Action = z.infer<typeof ActionSchema>;

const ElementSchema = z.object({
  kind: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  symbol: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  displayMode: z.string().min(1).optional(),
  superscript: z.boolean().optional(),
  mediaIndex: z.number().int().nonnegative().optional(),
  caption: z.string().optional(),
  widthPercent: z.number().optional(),
  align: z.string().optional(),
  float: z.string().optional(),
}).strict();

const ResponseFixtureSchema = z.object({
  choiceId: z.string().regex(/^C[1-9][0-9]*$/),
  rationale: z.string().min(1),
  expectedAssessment: AssessmentSchema,
  expectedAction: ActionSchema,
  expectedFocus: z.string().min(1),
}).strict();

const CaseFixtureSchema = z.object({
  caseId: z.string().min(1),
  sourcePageUrl: z.string().url(),
  officialQuestionPdfUrl: z.string().url().nullable(),
  passageElements: z.array(ElementSchema),
  supplementElements: z.array(z.object({
    supplementIndex: z.number().int().nonnegative(),
    elements: z.array(ElementSchema),
  }).strict()),
  mediaFiles: z.array(z.object({
    path: z.string().min(1),
    mimeType: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    placement: z.string().min(1),
  }).strict()),
  responses: z.record(z.string(), ResponseFixtureSchema),
}).strict();
type CaseFixture = z.infer<typeof CaseFixtureSchema>;

const FixtureFileSchema = z.object({
  fixtureVersion: z.enum([
    'three-reference-five-case-fixtures-v1',
    'three-reference-low-skill-ten-case-fixtures-v1',
  ]),
  sourceMarkingProvenance: z.string().min(1),
  studentResponseProvenance: z.string().min(1),
  cases: z.array(CaseFixtureSchema).min(1),
}).strict();

const SourceChoiceSchema = z.object({
  choice_number: z.number().int().positive(),
  text: z.string().min(1),
}).passthrough();
const SourceQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  stem: z.string().min(1),
  choices: z.array(SourceChoiceSchema).min(2),
  supplements: z.array(z.object({
    label: z.string(),
    text: z.string(),
  }).passthrough()),
}).passthrough();
const ExperimentInputSchema = z.object({
  caseId: z.string().min(1),
  sourceInput: z.object({
    source: z.object({
      sourceId: z.string().min(1),
      exam: z.string().min(1),
      title: z.string().min(1),
      passage: z.string().min(1),
      question: SourceQuestionSchema,
      answerKey: z.object({
        correctChoice: z.number().int().positive(),
        correctChoiceText: z.string().min(1),
      }).passthrough(),
      media: z.array(z.object({
        mediaId: z.string().min(1),
        sourceUrl: z.string().url(),
        mimeType: z.string().min(1),
        contentHash: z.string().optional(),
        placement: z.unknown(),
      }).passthrough()).optional(),
    }).passthrough(),
  }).passthrough(),
  officialExplanationReference: z.object({
    sourceUrl: z.string().url().optional(),
    pdfPages: z.array(z.number().int().positive()).optional(),
    sectionTitle: z.string().optional(),
    text: z.string().min(1),
  }).passthrough(),
}).passthrough();
type SourceInput = z.infer<typeof ExperimentInputSchema>;

const EvaluatorOutputSchema = z.object({
  outputVersion: z.literal('three-reference-first-turn-output-v1'),
  assessment: AssessmentSchema,
  nextAction: ActionSchema,
  pathSufficiency: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
  divergenceLayer: z.enum([
    'PASSAGE_CONTENT_RECALL',
    'SCENARIO_FACT_REPRESENTATION',
    'CONCEPT_RELATION',
    'CONDITION_APPLICATION',
    'INFERENCE_TRANSFORMATION',
    'OPTION_INTERPRETATION',
    'STEM_POLARITY',
    'SELECTION_EXECUTION',
  ]).nullable(),
  reason: z.string().min(1),
  studentEvidence: z.array(z.object({
    quote: z.string().min(1),
    interpretation: z.string().min(1),
  }).strict()).max(3),
  sourceEvidence: z.array(z.object({
    source: z.enum([
      'PASSAGE',
      'QUESTION',
      'SCENARIO',
      'ANSWER_KEY',
      'OFFICIAL_EXPLANATION',
      'REFERENCE_PACKET',
      'IMAGE',
    ]),
    locator: z.string().min(1),
    claim: z.string().min(1),
  }).strict()).max(4),
  interventionQuestion: z.string().min(1).nullable(),
}).strict();
type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

const JudgeOutputSchema = z.object({
  outputVersion: z.literal('feedback-blind-judge-v1'),
  evaluations: z.array(z.object({
    candidateId: z.string().regex(/^K[0-9]{2}$/),
    diagnosisGrounded: z.boolean(),
    questionQuality: z.object({
      relevant: z.boolean(),
      nonLeading: z.boolean(),
      singleFocus: z.boolean(),
    }).strict().nullable(),
    feedbackConcise: z.boolean(),
    overallScore: z.number().int().min(1).max(5),
    note: z.string().min(1),
  }).strict()).length(9),
}).strict();
type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

interface Usage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

interface LoadedCase {
  readonly fixture: CaseFixture;
  readonly source: SourceInput;
  readonly gold: z.infer<typeof ProblemQuestionGoldSchema>;
  readonly imageInputs: readonly {
    type: 'input_image';
    detail: 'high';
    image_url: string;
  }[];
}

interface EvaluatorResult {
  readonly jobKey: string;
  readonly condition: Condition;
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly choiceId: string;
  readonly rationale: string;
  readonly expectedAssessment: Assessment;
  readonly observedAssessment: string;
  readonly assessmentPassed: boolean;
  readonly expectedAction: Action;
  readonly observedAction: string;
  readonly actionPassed: boolean;
  readonly contractPassed: boolean;
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly inputBytes: number;
  readonly output?: EvaluatorOutput;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface JudgeResult {
  readonly groupKey: string;
  readonly caseId: string;
  readonly category: Category;
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly candidateMap: Readonly<Record<string, string>>;
  readonly output?: JudgeOutput;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface EvaluatorJob {
  readonly loaded: LoadedCase;
  readonly condition: Condition;
  readonly category: Category;
  readonly iteration: number;
}

function responseFor(fixture: CaseFixture, category: Category) {
  const response = fixture.responses[category];
  if (response === undefined) {
    throw new Error(`${fixture.caseId}: 응답 범주 ${category} 없음`);
  }
  return response;
}

const emptyUsage = (): Usage => ({
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOr<T>(path: string, fallback: T): Promise<T | unknown> {
  try {
    return await readJson(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function costFromUsage(usage: Usage): number {
  return (
    (usage.inputTokens - usage.cachedInputTokens) * PRICE_PER_MILLION.input +
    usage.cachedInputTokens * PRICE_PER_MILLION.cachedInput +
    usage.outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function usageFromResponse(response: {
  readonly usage?: {
    readonly input_tokens?: number;
    readonly input_tokens_details?: { readonly cached_tokens?: number };
    readonly output_tokens?: number;
  } | null;
}): Usage {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

function hashOrder(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function resultCost(results: readonly { readonly usage: Usage }[]): number {
  return results.reduce((sum, result) => sum + costFromUsage(result.usage), 0);
}

function assertBudget(spent: number): void {
  if (spent + COST_GUARD_USD >= COST_CAP_USD) {
    throw new Error(
      `비용 안전 중단: 관측 $${spent.toFixed(4)} + 여유 $${COST_GUARD_USD.toFixed(2)} ` +
      `>= 상한 $${COST_CAP_USD.toFixed(2)}`,
    );
  }
}

function annotatedElements(text: string, elements: readonly z.infer<typeof ElementSchema>[]) {
  return elements.map((element) => {
    if (element.start > element.end || element.end > text.length) {
      throw new Error(`표지 오프셋 범위 오류: ${element.kind} ${element.start}:${element.end}/${text.length}`);
    }
    if (element.kind !== 'image' && element.start === element.end) {
      throw new Error(`빈 텍스트 표지: ${element.kind} ${element.start}:${element.end}`);
    }
    return {
      ...element,
      spanText: text.slice(element.start, element.end),
    };
  });
}

function restoredDisplayText(
  text: string,
  elements: readonly z.infer<typeof ElementSchema>[],
): string {
  const insertions: { readonly at: number; readonly priority: number; readonly text: string }[] = [];
  for (const element of elements) {
    if (element.kind === 'paragraph_block' && element.symbol !== undefined) {
      insertions.push({ at: element.start, priority: 2, text: `${element.symbol}\n` });
      continue;
    }
    if (element.kind === 'image') {
      const imageNumber = (element.mediaIndex ?? 0) + 1;
      insertions.push({
        at: element.start,
        priority: 1,
        text: `\n[원문 이미지 ${imageNumber}${element.caption === undefined ? '' : ` ${element.caption}`}]\n`,
      });
      continue;
    }
    if (element.kind === 'phrase' || element.kind === 'text_style') {
      const style = element.style ?? (element.superscript === true ? 'superscript' : 'marked');
      insertions.push({ at: element.end, priority: 0, text: '⟧' });
      insertions.push({
        at: element.start,
        priority: 2,
        text: `${element.symbol ?? ''}⟦${style}:`,
      });
    }
  }
  let output = text;
  for (const insertion of [...insertions].sort((left, right) =>
    right.at - left.at || left.priority - right.priority
  )) {
    output = `${output.slice(0, insertion.at)}${insertion.text}${output.slice(insertion.at)}`;
  }
  return output;
}

function conciseGold(gold: z.infer<typeof ProblemQuestionGoldSchema>) {
  return {
    stemPolarity: gold.stemPolarity,
    answerChoiceId: gold.answerChoiceId,
    choiceJudgments: gold.choices.map((choice) => ({
      choiceId: choice.choiceId,
      text: choice.text,
      judgment: choice.judgment,
      rationale: choice.rationale,
    })),
    referencePath: gold.referencePath.map((step) => ({
      stepId: step.stepId,
      description: step.description,
    })),
    finalAnswerExplanation: gold.finalAnswerExplanation,
  };
}

function baseInput(loaded: LoadedCase, category: Category) {
  const raw = loaded.source.sourceInput.source;
  const response = responseFor(loaded.fixture, category);
  const selectedNumber = Number(response.choiceId.slice(1));
  const selectedChoice = raw.question.choices.find(
    (choice) => choice.choice_number === selectedNumber,
  );
  if (selectedChoice === undefined) {
    throw new Error(`${loaded.fixture.caseId}: 선택 선지 ${response.choiceId} 없음`);
  }
  const supplementElements = new Map(
    loaded.fixture.supplementElements.map((item) => [item.supplementIndex, item.elements]),
  );
  return {
    task: 'FIRST_TURN_FEEDBACK',
    source: {
      sourceId: raw.sourceId,
      exam: raw.exam,
      title: raw.title,
      provenance: {
        sourcePageUrl: loaded.fixture.sourcePageUrl,
        officialQuestionPdfUrl: loaded.fixture.officialQuestionPdfUrl,
        officialExplanationUrl: loaded.source.officialExplanationReference.sourceUrl ?? null,
        officialExplanationPages: loaded.source.officialExplanationReference.pdfPages ?? [],
      },
      passage: {
        plainText: raw.passage,
        restoredDisplayText: restoredDisplayText(raw.passage, loaded.fixture.passageElements),
        elements: annotatedElements(raw.passage, loaded.fixture.passageElements),
      },
      question: {
        questionNumber: raw.question.question_number,
        stem: raw.question.stem,
        supplements: raw.question.supplements.map((supplement, index) => {
          const elements = supplementElements.get(index) ?? [];
          return {
            label: supplement.label,
            plainText: supplement.text,
            restoredDisplayText: restoredDisplayText(supplement.text, elements),
            elements: annotatedElements(supplement.text, elements),
          };
        }),
        choices: raw.question.choices.map((choice) => ({
          choiceId: `C${choice.choice_number}`,
          text: choice.text,
        })),
      },
      answerKey: {
        correctChoiceId: `C${raw.answerKey.correctChoice}`,
        correctChoiceText: raw.answerKey.correctChoiceText,
      },
      officialExplanation: {
        sectionTitle: loaded.source.officialExplanationReference.sectionTitle ?? null,
        text: loaded.source.officialExplanationReference.text,
      },
      imageManifest: loaded.fixture.mediaFiles.map((media, index) => ({
        imageNumber: index + 1,
        placement: media.placement,
        sha256: media.sha256,
      })),
    },
    studentResponse: {
      selectedChoiceId: response.choiceId,
      selectedChoiceText: selectedChoice.text,
      rationale: response.rationale,
    },
  };
}

function inputForJob(job: EvaluatorJob) {
  const core = baseInput(job.loaded, job.category);
  const referencePacket = job.condition === 'RAW_SOURCE'
    ? null
    : job.condition === 'CONCISE_GOLD'
      ? conciseGold(job.loaded.gold)
      : job.loaded.gold;
  return { ...core, referencePacket };
}

function validateOutput(output: EvaluatorOutput, rationale: string): void {
  const actionByAssessment: Record<Assessment, Action> = {
    NO_ERROR_DETECTED: 'COMPLETE',
    CLEAR_ERROR: 'ASK_CORRECTIVE',
    INSUFFICIENT_EVIDENCE: 'ASK_DIAGNOSTIC',
    REASONABLE_ALTERNATIVE_INTERPRETATION: 'EXPLAIN_ITEM_BOUNDARY',
    ITEM_OR_EXPLANATION_LIMITATION: 'EXPLAIN_ITEM_BOUNDARY',
  };
  if (output.nextAction !== actionByAssessment[output.assessment]) {
    throw new Error('assessment-nextAction 고정 대응 위반');
  }
  const expectedSufficiency = output.assessment === 'INSUFFICIENT_EVIDENCE'
    ? 'INSUFFICIENT'
    : 'SUFFICIENT';
  if (output.pathSufficiency !== expectedSufficiency) {
    throw new Error('assessment-pathSufficiency 고정 대응 위반');
  }
  const needsQuestion = output.nextAction === 'ASK_CORRECTIVE' ||
    output.nextAction === 'ASK_DIAGNOSTIC';
  if (needsQuestion !== (output.interventionQuestion !== null)) {
    throw new Error('nextAction-interventionQuestion null 규칙 위반');
  }
  if (output.assessment === 'NO_ERROR_DETECTED' && output.divergenceLayer !== null) {
    throw new Error('오류 없음 판정에 divergenceLayer 존재');
  }
  if (output.assessment !== 'NO_ERROR_DETECTED' && output.studentEvidence.length === 0) {
    throw new Error('오류/불충분 판정에 학생 근거 기록 없음');
  }
  for (const evidence of output.studentEvidence) {
    if (!rationale.includes(evidence.quote)) {
      throw new Error(`학생 응답에 없는 인용: ${evidence.quote}`);
    }
  }
}

function jobKey(condition: Condition, caseId: string, category: Category, iteration: number) {
  return `${condition}|${caseId}|${category}|${iteration}`;
}

async function runEvaluatorJob(
  client: OpenAI,
  prompt: string,
  job: EvaluatorJob,
): Promise<EvaluatorResult> {
  const key = jobKey(job.condition, job.loaded.fixture.caseId, job.category, job.iteration);
  const responseFixture = responseFor(job.loaded.fixture, job.category);
  const input = inputForJob(job);
  const inputText = JSON.stringify(input);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: inputText },
          ...job.loaded.imageInputs,
        ],
      }],
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_500,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'three_reference_first_turn_output',
          strict: true,
          schema: z.toJSONSchema(EvaluatorOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = EvaluatorOutputSchema.parse(JSON.parse(rawOutput));
    let contractError: string | undefined;
    try {
      validateOutput(output, responseFixture.rationale);
    } catch (error) {
      contractError = error instanceof Error ? error.message : String(error);
    }
    return {
      jobKey: key,
      condition: job.condition,
      caseId: job.loaded.fixture.caseId,
      category: job.category,
      iteration: job.iteration,
      choiceId: responseFixture.choiceId,
      rationale: responseFixture.rationale,
      expectedAssessment: responseFixture.expectedAssessment,
      observedAssessment: output.assessment,
      assessmentPassed: output.assessment === responseFixture.expectedAssessment,
      expectedAction: responseFixture.expectedAction,
      observedAction: output.nextAction,
      actionPassed: output.nextAction === responseFixture.expectedAction,
      contractPassed: contractError === undefined,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      inputBytes: Buffer.byteLength(inputText),
      output,
      rawOutput,
      ...(contractError === undefined ? {} : { error: contractError }),
    };
  } catch (error) {
    return {
      jobKey: key,
      condition: job.condition,
      caseId: job.loaded.fixture.caseId,
      category: job.category,
      iteration: job.iteration,
      choiceId: responseFixture.choiceId,
      rationale: responseFixture.rationale,
      expectedAssessment: responseFixture.expectedAssessment,
      observedAssessment: 'ERROR',
      assessmentPassed: false,
      expectedAction: responseFixture.expectedAction,
      observedAction: 'ERROR',
      actionPassed: false,
      contractPassed: false,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      inputBytes: Buffer.byteLength(inputText),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function judgePrompt(): string {
  return `당신은 수능형 독서 피드백의 블라인드 품질 심사자다. 후보가 어떤 조건에서 생성되었는지는 알 수 없고 추정하지 않는다.\n\n` +
    `각 후보를 독립적으로 평가한다. expectedReference는 사람이 고정한 기대 판정과 핵심 초점이다. ` +
    `diagnosisGrounded는 후보의 판정·이유가 그 초점을 정확히 잡고 원문과 충돌하지 않을 때만 true다. ` +
    `질문이 없으면 questionQuality는 null이다. 질문이 있으면 학생의 실제 오류/불확실성에 관련되는지, ` +
    `정답을 직접 알려 주지 않는지, 한 번에 한 판단만 묻는지를 각각 평가한다. ` +
    `feedbackConcise는 중복 없이 1차 피드백으로 충분히 짧을 때 true다. ` +
    `overallScore는 1(위험/무관)~5(정확하고 바로 사용 가능)다. 후보 사이 상대평가가 아니라 절대평가한다. ` +
    `Structured Output JSON만 출력한다.`;
}

async function runJudgeGroup(
  client: OpenAI,
  loaded: LoadedCase,
  category: Category,
  results: readonly EvaluatorResult[],
): Promise<JudgeResult> {
  const groupKey = `${loaded.fixture.caseId}|${category}`;
  const group = results.filter((result) =>
    result.caseId === loaded.fixture.caseId && result.category === category
  );
  if (group.length !== CONDITIONS.length * REPEATS) {
    throw new Error(`${groupKey}: 심사 후보가 ${group.length}/9개`);
  }
  const shuffled = [...group].sort((left, right) =>
    hashOrder(`${groupKey}|${left.jobKey}`).localeCompare(hashOrder(`${groupKey}|${right.jobKey}`))
  );
  const candidateMap: Record<string, string> = {};
  const candidates = shuffled.map((result, index) => {
    const candidateId = `K${String(index + 1).padStart(2, '0')}`;
    candidateMap[candidateId] = result.jobKey;
    return {
      candidateId,
      assessment: result.output?.assessment ?? 'ERROR',
      nextAction: result.output?.nextAction ?? 'ERROR',
      reason: result.output?.reason ?? result.error ?? 'NO_OUTPUT',
      sourceEvidence: result.output?.sourceEvidence ?? [],
      interventionQuestion: result.output?.interventionQuestion ?? null,
    };
  });
  const fixture = responseFor(loaded.fixture, category);
  const input = {
    source: {
      passage: loaded.source.sourceInput.source.passage,
      question: loaded.source.sourceInput.source.question,
      answerKey: loaded.source.sourceInput.source.answerKey,
      officialExplanation: loaded.source.officialExplanationReference.text,
    },
    studentResponse: {
      choiceId: fixture.choiceId,
      rationale: fixture.rationale,
    },
    expectedReference: {
      assessment: fixture.expectedAssessment,
      nextAction: fixture.expectedAction,
      focus: fixture.expectedFocus,
    },
    candidates,
  };
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: judgePrompt(),
      input: JSON.stringify(input),
      reasoning: { effort: EFFORT },
      max_output_tokens: 3_500,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'feedback_blind_judge',
          strict: true,
          schema: z.toJSONSchema(JudgeOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = JudgeOutputSchema.parse(JSON.parse(rawOutput));
    const expectedIds = Object.keys(candidateMap).sort();
    const actualIds = output.evaluations.map((item) => item.candidateId).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
      throw new Error('블라인드 심사 candidateId 집합 불일치');
    }
    return {
      groupKey,
      caseId: loaded.fixture.caseId,
      category,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      candidateMap,
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      groupKey,
      caseId: loaded.fixture.caseId,
      category,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      candidateMap,
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function judgeLookup(judges: readonly JudgeResult[]): Map<string, JudgeOutput['evaluations'][number]> {
  const lookup = new Map<string, JudgeOutput['evaluations'][number]>();
  for (const judge of judges) {
    if (judge.output === undefined) continue;
    for (const evaluation of judge.output.evaluations) {
      const key = judge.candidateMap[evaluation.candidateId];
      if (key !== undefined) lookup.set(key, evaluation);
    }
  }
  return lookup;
}

function conditionSummary(
  condition: Condition,
  results: readonly EvaluatorResult[],
  judges: readonly JudgeResult[],
) {
  const selected = results.filter((result) => result.condition === condition);
  const lookup = judgeLookup(judges);
  const quality = selected.flatMap((result) => {
    const value = lookup.get(result.jobKey);
    return value === undefined ? [] : [value];
  });
  const questions = quality.flatMap((value) =>
    value.questionQuality === null ? [] : [value.questionQuality]
  );
  const logicalProbes = selected.length === 0 ? [] : selected
    .filter((result) => result.iteration === 1)
    .map((seed) => {
      const rows = selected.filter((result) =>
        result.caseId === seed.caseId && result.category === seed.category
      );
      return {
        caseId: seed.caseId,
        category: seed.category,
        expectedAssessment: seed.expectedAssessment,
        observedAssessments: rows.map((row) => row.observedAssessment),
        expectedAction: seed.expectedAction,
        observedActions: rows.map((row) => row.observedAction),
        stableAssessment: rows.length === REPEATS &&
          new Set(rows.map((row) => row.observedAssessment)).size === 1,
        stableAction: rows.length === REPEATS &&
          new Set(rows.map((row) => row.observedAction)).size === 1,
        questions: rows.map((row) => row.output?.interventionQuestion ?? null),
      };
    });
  return {
    calls: selected.length,
    assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
    actionPassed: selected.filter((result) => result.actionPassed).length,
    contractPassed: selected.filter((result) => result.contractPassed).length,
    stableAssessments: logicalProbes.filter((probe) => probe.stableAssessment).length,
    stableActions: logicalProbes.filter((probe) => probe.stableAction).length,
    logicalProbes: logicalProbes.length,
    averageInputTokens: mean(selected.map((result) => result.usage.inputTokens)),
    averageCachedInputTokens: mean(selected.map((result) => result.usage.cachedInputTokens)),
    averageOutputTokens: mean(selected.map((result) => result.usage.outputTokens)),
    averageDurationMs: mean(selected.map((result) => result.durationMs)),
    observedCostUsd: resultCost(selected),
    blindJudge: {
      judged: quality.length,
      diagnosisGrounded: quality.filter((value) => value.diagnosisGrounded).length,
      feedbackConcise: quality.filter((value) => value.feedbackConcise).length,
      averageOverallScore: mean(quality.map((value) => value.overallScore)),
      questionsJudged: questions.length,
      questionRelevant: questions.filter((value) => value.relevant).length,
      questionNonLeading: questions.filter((value) => value.nonLeading).length,
      questionSingleFocus: questions.filter((value) => value.singleFocus).length,
    },
    probes: logicalProbes,
  };
}

function buildSummary(
  fixtures: z.infer<typeof FixtureFileSchema>,
  results: readonly EvaluatorResult[],
  judges: readonly JudgeResult[],
) {
  const primaryCost = resultCost(results);
  const judgeCost = resultCost(judges);
  return {
    experiment: IS_LOW_SKILL_TEN_ITEM
      ? 'problem-evaluator-three-reference-low-skill-ten-item-v1'
      : 'problem-evaluator-three-reference-first-turn-ab-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    cases: fixtures.cases.map((item) => item.caseId),
    categories: CATEGORIES,
    conditions: CONDITIONS,
    repeatsPerProbe: REPEATS,
    expectedPrimaryCalls: fixtures.cases.length * CATEGORIES.length * CONDITIONS.length * REPEATS,
    observedPrimaryCalls: results.length,
    expectedJudgeCalls: fixtures.cases.length * CATEGORIES.length,
    observedJudgeCalls: judges.length,
    budget: {
      capUsd: COST_CAP_USD,
      guardUsd: COST_GUARD_USD,
      primaryObservedCostUsd: primaryCost,
      judgeObservedCostUsd: judgeCost,
      totalObservedCostUsd: primaryCost + judgeCost,
    },
    priceSnapshot: {
      date: '2026-09-06',
      perMillionTokens: PRICE_PER_MILLION,
    },
    byCondition: Object.fromEntries(CONDITIONS.map((condition) => [
      condition,
      conditionSummary(condition, results, judges),
    ])),
  };
}

function rawReport(summary: ReturnType<typeof buildSummary>): string {
  const rows = CONDITIONS.map((condition) => {
    const item = summary.byCondition[condition]!;
    return `| ${condition} | ${item.assessmentPassed}/${item.calls} | ` +
      `${item.actionPassed}/${item.calls} | ${item.contractPassed}/${item.calls} | ` +
      `${item.stableActions}/${item.logicalProbes} | ${item.blindJudge.averageOverallScore.toFixed(2)} | ` +
      `${item.averageInputTokens.toFixed(0)} | ${item.averageOutputTokens.toFixed(0)} | ` +
      `${(item.averageDurationMs / 1000).toFixed(2)}초 | $${item.observedCostUsd.toFixed(4)} |`;
  });
  return `# ${summary.cases.length}문항·3응답·3조건 1차 피드백 비교 원시 보고서\n\n` +
    `- 모델: \`${summary.model}\`, reasoning effort \`${summary.effort}\`\n` +
    `- 주 판정: ${summary.observedPrimaryCalls}/${summary.expectedPrimaryCalls}회\n` +
    `- 블라인드 품질 심사: ${summary.observedJudgeCalls}/${summary.expectedJudgeCalls}회\n` +
    `- 관측 총비용: $${summary.budget.totalObservedCostUsd.toFixed(4)} / 상한 $${summary.budget.capUsd.toFixed(2)}\n\n` +
    `| 조건 | 판정 일치 | 행동 일치 | 계약 통과 | 행동 안정 프로브 | 품질(5점) | 입력 토큰 | 출력 토큰 | 평균 지연 | 비용 |\n` +
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n`;
}

async function loadCases(fixtures: z.infer<typeof FixtureFileSchema>) {
  const cases: LoadedCase[] = [];
  const integrity: unknown[] = [];
  for (const fixture of fixtures.cases) {
    const source = ExperimentInputSchema.parse(await readJson(resolve(
      SOURCE_ROOT,
      fixture.caseId,
      'experiment-input.json',
    )));
    const gold = ProblemQuestionGoldSchema.parse(await readJson(resolve(
      SOURCE_ROOT,
      fixture.caseId,
      'c-gold.json',
    )));
    const priorResponses = IS_LOW_SKILL_TEN_ITEM ? null : z.record(z.string(), z.object({
      choiceId: z.string(),
      rationale: z.string(),
    }).passthrough()).parse(await readJson(resolve(
      STUDENT_CASE_ROOT,
      fixture.caseId,
      'student-response-cases.json',
    )));
    if (source.caseId !== fixture.caseId || gold.questionId !== fixture.caseId) {
      throw new Error(`${fixture.caseId}: source/gold 식별자 불일치`);
    }
    const passage = source.sourceInput.source.passage;
    const passageElements = annotatedElements(passage, fixture.passageElements);
    const supplements = fixture.supplementElements.map((item) => {
      const supplement = source.sourceInput.source.question.supplements[item.supplementIndex];
      if (supplement === undefined) {
        throw new Error(`${fixture.caseId}: supplement ${item.supplementIndex} 없음`);
      }
      return {
        supplementIndex: item.supplementIndex,
        elements: annotatedElements(supplement.text, item.elements),
      };
    });
    const imageInputs: LoadedCase['imageInputs'][number][] = [];
    const verifiedMedia = [];
    for (const media of fixture.mediaFiles) {
      const bytes = await readFile(resolve(media.path));
      const actualSha256 = createHash('sha256').update(bytes).digest('hex');
      if (actualSha256 !== media.sha256) {
        throw new Error(`${fixture.caseId}: 이미지 해시 불일치 ${media.path}`);
      }
      imageInputs.push({
        type: 'input_image',
        detail: 'high',
        image_url: `data:${media.mimeType};base64,${bytes.toString('base64')}`,
      });
      verifiedMedia.push({ ...media, actualSha256, matched: true });
    }
    for (const category of CATEGORIES) {
      const current = responseFor(fixture, category);
      if (priorResponses !== null) {
        const prior = priorResponses[category];
        if (prior === undefined || prior.choiceId !== current.choiceId ||
          prior.rationale !== current.rationale) {
          throw new Error(`${fixture.caseId}|${category}: 기존 회귀 응답과 불일치`);
        }
      }
    }
    integrity.push({
      caseId: fixture.caseId,
      sourcePageUrl: fixture.sourcePageUrl,
      officialQuestionPdfUrl: fixture.officialQuestionPdfUrl,
      passageLength: passage.length,
      passageElements,
      supplements,
      verifiedMedia,
      responses: Object.keys(fixture.responses).length,
      responsesMatchPriorRegressionFixtures: priorResponses !== null,
      valid: true,
    });
    cases.push({ fixture, source, gold, imageInputs });
  }
  await writeJson(resolve(ARTIFACT_ROOT, 'source-integrity.json'), integrity);
  await mkdir(resolve(ARTIFACT_ROOT, 'concise-golds'), { recursive: true });
  for (const loaded of cases) {
    await writeJson(
      resolve(ARTIFACT_ROOT, 'concise-golds', `${loaded.fixture.caseId}.json`),
      conciseGold(loaded.gold),
    );
  }
  return cases;
}

async function main(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const fixtures = FixtureFileSchema.parse(await readJson(FIXTURE_PATH));
  const expectedFixtureVersion = IS_LOW_SKILL_TEN_ITEM
    ? 'three-reference-low-skill-ten-case-fixtures-v1'
    : 'three-reference-five-case-fixtures-v1';
  const expectedCaseCount = IS_LOW_SKILL_TEN_ITEM ? 10 : 5;
  if (fixtures.fixtureVersion !== expectedFixtureVersion ||
    fixtures.cases.length !== expectedCaseCount) {
    throw new Error(
      `프로필-픽스처 불일치: ${fixtures.fixtureVersion}, ${fixtures.cases.length}문항`,
    );
  }
  for (const fixture of fixtures.cases) {
    const actualCategories = Object.keys(fixture.responses).sort();
    const expectedCategories = [...CATEGORIES].sort();
    if (JSON.stringify(actualCategories) !== JSON.stringify(expectedCategories)) {
      throw new Error(`${fixture.caseId}: 응답 범주 집합 불일치`);
    }
  }
  const prompt = (await readFile(PROMPT_PATH, 'utf8')).trim();
  const loadedCases = await loadCases(fixtures);
  await writeJson(resolve(ARTIFACT_ROOT, 'response-fixtures.json'), {
    fixtureVersion: fixtures.fixtureVersion,
    cases: fixtures.cases.map((item) => ({ caseId: item.caseId, responses: item.responses })),
  });

  if (process.argv.includes('--dry-run')) {
    const inputAudit = loadedCases.flatMap((loaded) => CATEGORIES.flatMap((category) =>
      CONDITIONS.map((condition) => {
        const input = inputForJob({ loaded, category, condition, iteration: 1 });
        return {
          caseId: loaded.fixture.caseId,
          category,
          condition,
          inputBytes: Buffer.byteLength(JSON.stringify(input)),
          images: loaded.imageInputs.length,
        };
      })
    ));
    await writeJson(resolve(ARTIFACT_ROOT, 'dry-run-input-audit.json'), inputAudit);
    process.stdout.write(
      `dry-run complete cases=${loadedCases.length} responses=${loadedCases.length * CATEGORIES.length} ` +
      `primaryJobs=${loadedCases.length * CATEGORIES.length * CONDITIONS.length * REPEATS}\n`,
    );
    return;
  }
  if (process.env['OPENAI_API_KEY'] === undefined) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았다.');
  }

  const client = new OpenAI({ maxRetries: 0 });
  const resume = process.argv.includes('--resume');
  const retryErrors = process.argv.includes('--retry-errors');
  const resultPath = resolve(ARTIFACT_ROOT, 'results.json');
  const resultPartialPath = resolve(ARTIFACT_ROOT, 'results.partial.json');
  const resumedResults = resume
    ? z.array(z.custom<EvaluatorResult>()).parse(await readJsonOr(resultPartialPath, []))
    : [];
  const results = retryErrors
    ? resumedResults.filter((result) => result.observedAction !== 'ERROR')
    : resumedResults;
  const existingKeys = new Set(results.map((result) => result.jobKey));
  const jobs = loadedCases.flatMap((loaded) => CATEGORIES.flatMap((category) =>
    CONDITIONS.flatMap((condition) => Array.from({ length: REPEATS }, (_, index) => ({
      loaded,
      category,
      condition,
      iteration: index + 1,
    })))
  )).sort((left, right) => hashOrder(jobKey(
    left.condition,
    left.loaded.fixture.caseId,
    left.category,
    left.iteration,
  )).localeCompare(hashOrder(jobKey(
    right.condition,
    right.loaded.fixture.caseId,
    right.category,
    right.iteration,
  )))).filter((job) => !existingKeys.has(jobKey(
    job.condition,
    job.loaded.fixture.caseId,
    job.category,
    job.iteration,
  )));
  const expectedPrimaryCalls = loadedCases.length * CATEGORIES.length * CONDITIONS.length * REPEATS;

  for (let index = 0; index < jobs.length; index += CONCURRENCY) {
    assertBudget(resultCost(results));
    const batch = jobs.slice(index, index + CONCURRENCY);
    results.push(...await Promise.all(batch.map((job) => runEvaluatorJob(client, prompt, job))));
    await writeJson(resultPartialPath, results);
    process.stdout.write(
      `primary ${results.length}/${expectedPrimaryCalls} cost=$${resultCost(results).toFixed(4)} errors=` +
      `${results.filter((result) => result.observedAction === 'ERROR').length}\n`,
    );
  }
  await writeJson(resultPath, results);

  const judgePath = resolve(ARTIFACT_ROOT, 'judgments.json');
  const judgePartialPath = resolve(ARTIFACT_ROOT, 'judgments.partial.json');
  const resumedJudges = resume
    ? z.array(z.custom<JudgeResult>()).parse(await readJsonOr(judgePartialPath, []))
    : [];
  const judges = retryErrors
    ? resumedJudges.filter((judge) => judge.output !== undefined)
    : resumedJudges;
  const existingGroups = new Set(judges.map((judge) => judge.groupKey));
  const judgeJobs = loadedCases.flatMap((loaded) => CATEGORIES.map((category) => ({
    loaded,
    category,
  }))).filter((job) => !existingGroups.has(`${job.loaded.fixture.caseId}|${job.category}`));
  const expectedJudgeCalls = loadedCases.length * CATEGORIES.length;
  for (let index = 0; index < judgeJobs.length; index += CONCURRENCY) {
    assertBudget(resultCost(results) + resultCost(judges));
    const batch = judgeJobs.slice(index, index + CONCURRENCY);
    judges.push(...await Promise.all(batch.map((job) =>
      runJudgeGroup(client, job.loaded, job.category, results)
    )));
    await writeJson(judgePartialPath, judges);
    process.stdout.write(
      `judge ${judges.length}/${expectedJudgeCalls} totalCost=$${(resultCost(results) + resultCost(judges)).toFixed(4)} ` +
      `errors=${judges.filter((judge) => judge.output === undefined).length}\n`,
    );
  }
  await writeJson(judgePath, judges);

  const summary = buildSummary(fixtures, results, judges);
  await writeJson(resolve(EXPERIMENT_ROOT, 'SUMMARY.json'), summary);
  await writeFile(resolve(EXPERIMENT_ROOT, 'RAW-REPORT.md'), rawReport(summary));
  process.stdout.write(
    `complete primary=${results.length}/${expectedPrimaryCalls} ` +
    `judges=${judges.length}/${expectedJudgeCalls} ` +
    `cost=$${summary.budget.totalObservedCostUsd.toFixed(4)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
