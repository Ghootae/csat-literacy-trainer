import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  ProblemQuestionGoldSchema,
  auditProblemGoldWarnings,
  targetClaimEffectForAssessment,
  type ProblemQuestionGold,
} from '../problem-solving/gold.js';
import { injectProblemGoldSourceFidelity } from '../problem-solving/gold-source-fidelity.js';
import {
  ExplanationAuditSchema,
  ExplanationAuditProviderOutputSchema,
  OfficialExplanationReferenceSchema,
  auditExplanationPlacementContract,
  canonicalExplanationReferenceHash,
  validateExplanationAuditAgainstReference,
  type ExplanationAudit,
} from '../problem-solving/explanation-audit.js';
import {
  ExplanationAuditBenchmarkSchema,
  evaluateExplanationAuditBenchmark,
  type ExplanationAuditBenchmarkCase,
  type ExplanationAuditBenchmarkEvaluation,
} from '../problem-solving/explanation-audit-benchmark.js';
import {
  DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
  DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
  createProblemGoldProviderJsonSchema,
} from '../problem-solving/gold-generation-runtime.js';
import { loadProblemGoldGenerationPrompt } from '../problem-solving/gold-generation.js';
import { createProblemPathEvaluatorInput } from '../problem-solving/path-evaluator-input.js';
import { OpenAIProblemPathEvaluator } from '../problem-solving/path-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from '../problem-solving/session.js';

const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-explanation-cycle-corpus-v1.json',
);
const EXPLANATION_BENCHMARK_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-explanation-audit-benchmark-v1.json',
);
const EXPLANATION_PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-generation-prompt-v3-explanation-audit.md',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02',
);
const B_MODEL = DEFAULT_PROBLEM_GOLD_GENERATION_MODEL;
const B_EFFORT = DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT;
const C_MODEL = 'gpt-5.6-sol';
const C_EFFORT = 'high' as const;
const REPEATS = 3;

const CorpusSchema = z.object({
  corpusVersion: z.string(),
  baselineExperimentRoot: z.string(),
  items: z.array(z.object({
    caseId: z.string(),
    role: z.string(),
    explanation: OfficialExplanationReferenceSchema,
  })),
});

const StudentCasesSchema = z.object({
  accurate: z.object({ choiceId: z.string(), rationale: z.string() }),
  negativeAccurate: z.object({ choiceId: z.string(), rationale: z.string() }),
  representativeWrong: z.object({ choiceId: z.string(), rationale: z.string() }),
  lowInformation: z.object({ choiceId: z.string(), rationale: z.string() }),
});

const ProbeDiagnosisSchema = z.object({
  cause: z.enum(['GOLD_DEFECT', 'EVALUATOR_DEFECT', 'MIXED', 'UNCERTAIN']),
  shouldRepairGold: z.boolean(),
  goldIssues: z.array(z.string()),
  evaluatorIssues: z.array(z.string()),
  repairInstructions: z.array(z.string()),
  reason: z.string(),
});

const SemanticAuditSchema = z.object({
  officialAnswerMatches: z.boolean(),
  reverseImportDetected: z.boolean(),
  suspectPassagePropositionIds: z.array(z.string()),
  explanationUsage: z.array(z.object({
    explanationClaimId: z.string(),
    summary: z.string(),
    classification: z.enum([
      'SOURCE_EXPLICIT',
      'SOURCE_DERIVED',
      'ANSWER_KEY_CONSTRAINED',
      'EXTERNAL_KNOWLEDGE',
    ]),
    placement: z.enum(['BASE_GOLD', 'SUPPLEMENTAL', 'EXCLUDED']),
    placementCorrect: z.boolean(),
    relatedIds: z.array(z.string()),
    reason: z.string(),
  })),
  inferenceAudits: z.array(z.object({
    inferenceId: z.string(),
    conclusionDirectional: z.enum(['PASS', 'FAIL']),
    effectConsistency: z.enum(['PASS', 'FAIL']),
    expectedTargetClaimEffect: z.enum([
      'SUPPORTS',
      'CONTRADICTS',
      'DOES_NOT_JUSTIFY',
      'UNRESOLVED',
    ]),
    premiseSufficiency: z.enum(['PASS', 'FAIL', 'UNCERTAIN']),
    premiseMinimality: z.enum(['PASS', 'WARNING', 'FAIL']),
    reason: z.string(),
  })),
  unresolvedRisks: z.array(z.string()),
  recommendedAction: z.enum(['PASS', 'REPAIR_GOLD', 'HUMAN_REVIEW']),
  repairInstructions: z.array(z.string()),
  reason: z.string(),
});

type Corpus = z.infer<typeof CorpusSchema>;
type CorpusItem = Corpus['items'][number];
type StudentCases = z.infer<typeof StudentCasesSchema>;
type ProbeCategory = keyof StudentCases;

interface ValidationResult {
  readonly schemaValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly unknown[];
}

interface ApiMetadata {
  readonly provider: 'openai';
  readonly model: string;
  readonly effort: string;
  readonly stage: string;
  readonly promptVersion: string;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly responseId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly usage: unknown;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function providerSchema(schema: z.ZodType): Record<string, unknown> {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (typeof value !== 'object' || value === null) return value;
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
      key === 'format' ? [] : [[key, normalize(child)]]
    )));
  };
  return normalize(z.toJSONSchema(schema)) as Record<string, unknown>;
}

function validateGold(value: unknown): ValidationResult {
  const parsed = ProblemQuestionGoldSchema.safeParse(value);
  return {
    schemaValid: parsed.success,
    errors: parsed.success
      ? []
      : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    warnings: parsed.success ? auditProblemGoldWarnings(parsed.data) : [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 문항 지식과 무관한 교차 필드 계약만 기계적으로 정규화한다. */
function normalizeCrossFieldContracts(input: unknown, sourceInput: unknown): unknown {
  if (!isRecord(input)) return input;
  const fidelityInjected = injectProblemGoldSourceFidelity(input, sourceInput);
  if (!isRecord(fidelityInjected)) return fidelityInjected;
  const output = structuredClone(fidelityInjected);
  const answerChoiceId = typeof output['answerChoiceId'] === 'string'
    ? output['answerChoiceId']
    : '';
  const conclusionIds = new Set(
    Array.isArray(output['conclusionStepIds']) ? output['conclusionStepIds'] : [],
  );
  if (Array.isArray(output['decisivePathStepIds'])) {
    const filtered = output['decisivePathStepIds']
      .filter((id) => typeof id === 'string' && !conclusionIds.has(id));
    output['decisivePathStepIds'] = filtered.length > 0
      ? filtered
      : (Array.isArray(output['requiredPathStepIds'])
          ? output['requiredPathStepIds']
            .filter((id) => typeof id === 'string' && !conclusionIds.has(id))
            .slice(-1)
          : []);
  }
  if (Array.isArray(output['optionClaims'])) {
    for (const claim of output['optionClaims']) {
      if (!isRecord(claim)) continue;
      const supplementalIds = Array.isArray(claim['fallbackSupplementalInferenceIds'])
        ? claim['fallbackSupplementalInferenceIds']
        : [];
      if (supplementalIds.length === 0) claim['supplementalUsePolicy'] = [];
      if (claim['assessment'] === 'NOT_JUSTIFIED' && claim['decision'] === 'REJECTED') {
        claim['decisionBasis'] = 'ANSWER_KEY_CONSTRAINED';
      }
    }
  }
  if (Array.isArray(output['representativeWrongPaths'])) {
    output['representativeWrongPaths'] = output['representativeWrongPaths']
      .filter(isRecord)
      .map((path) => {
        const normalized = structuredClone(path);
        normalized['selectedChoiceIds'] = Array.isArray(normalized['selectedChoiceIds'])
          ? normalized['selectedChoiceIds'].filter(
              (id) => typeof id === 'string' && id !== answerChoiceId,
            )
          : [];
        normalized['missedAnswerChoiceId'] = normalized['scope'] === 'SELECTED_WRONG_CHOICE'
          ? null
          : answerChoiceId;
        return normalized;
      })
      .filter((path) => Array.isArray(path['selectedChoiceIds']) && path['selectedChoiceIds'].length > 0);
  }
  if (Array.isArray(output['itemInferences'])) {
    const targetEffects = new Map(
      Array.isArray(output['optionClaims'])
        ? output['optionClaims'].flatMap((claim) => (
            isRecord(claim) && typeof claim['claimId'] === 'string'
              ? [[
                  claim['claimId'],
                  targetClaimEffectForAssessment(claim['assessment']),
                ] as const]
              : []
          ))
        : [],
    );
    for (const inference of output['itemInferences']) {
      if (!isRecord(inference) || !Array.isArray(inference['targetClaimIds'])) continue;
      const effects = new Set(inference['targetClaimIds'].flatMap((claimId) => {
        const effect = typeof claimId === 'string' ? targetEffects.get(claimId) : null;
        return effect === null || effect === undefined ? [] : [effect];
      }));
      if (effects.size === 1) inference['targetClaimEffect'] = [...effects][0];
    }
  }
  return output;
}

async function callStructured<T>(options: {
  readonly model: string;
  readonly effort: 'medium' | 'high';
  readonly stage: string;
  readonly promptVersion: string;
  readonly instructions: string;
  readonly input: unknown;
  readonly schema: z.ZodType<T>;
  readonly schemaName: string;
  readonly maxOutputTokens: number;
  readonly imageUrls?: readonly string[];
  readonly background?: boolean;
}): Promise<{ value: T; raw: string; metadata: ApiMetadata }> {
  const client = new OpenAI({ maxRetries: 0 });
  const inputText = JSON.stringify(options.input);
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  let response = await client.responses.create({
    model: options.model,
    instructions: options.instructions,
    input: options.imageUrls === undefined || options.imageUrls.length === 0
      ? inputText
      : [{
          role: 'user',
          content: [
            { type: 'input_text', text: inputText },
            ...options.imageUrls.map((imageUrl) => ({
              type: 'input_image' as const,
              image_url: imageUrl,
              detail: 'high' as const,
            })),
          ],
        }],
    reasoning: { effort: options.effort },
    max_output_tokens: options.maxOutputTokens,
    store: false,
    background: options.background ?? false,
    text: {
      format: {
        type: 'json_schema',
        name: options.schemaName,
        strict: true,
        schema: providerSchema(options.schema),
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  while (
    options.background === true &&
    (response.status === 'queued' || response.status === 'in_progress')
  ) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
    response = await client.responses.retrieve(response.id);
  }
  if (response.status !== 'completed') {
    throw new Error(`${options.stage}: 백그라운드 응답 실패 status=${response.status}`);
  }
  const raw = response.output_text;
  const value = options.schema.parse(JSON.parse(raw));
  return {
    value,
    raw,
    metadata: {
      provider: 'openai',
      model: options.model,
      effort: options.effort,
      stage: options.stage,
      promptVersion: options.promptVersion,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      inputHash: sha256(inputText),
      outputHash: sha256(raw),
      usage: response.usage,
    },
  };
}

async function callGold(options: {
  readonly stage: string;
  readonly instructions: string;
  readonly input: unknown;
  readonly model?: string;
  readonly effort?: 'medium' | 'high';
  readonly imageUrls?: readonly string[];
  readonly background?: boolean;
}): Promise<{ value: unknown; raw: string; metadata: ApiMetadata }> {
  const schema = createProblemGoldProviderJsonSchema();
  const client = new OpenAI({ maxRetries: 0 });
  const inputText = JSON.stringify(options.input);
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const model = options.model ?? B_MODEL;
  const effort = options.effort ?? B_EFFORT;
  let response = await client.responses.create({
    model,
    instructions: options.instructions,
    input: options.imageUrls === undefined || options.imageUrls.length === 0
      ? inputText
      : [{
          role: 'user',
          content: [
            { type: 'input_text', text: inputText },
            ...options.imageUrls.map((imageUrl) => ({
              type: 'input_image' as const,
              image_url: imageUrl,
              detail: 'high' as const,
            })),
          ],
        }],
    reasoning: { effort },
    max_output_tokens: 30_000,
    store: false,
    background: options.background ?? false,
    text: {
      format: {
        type: 'json_schema',
        name: `problem_gold_${options.stage.toLowerCase().replaceAll('-', '_')}`,
        strict: true,
        schema,
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  while (
    options.background === true &&
    (response.status === 'queued' || response.status === 'in_progress')
  ) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000));
    response = await client.responses.retrieve(response.id);
  }
  if (response.status !== 'completed') {
    throw new Error(`${options.stage}: 백그라운드 응답 실패 status=${response.status}`);
  }
  const raw = response.output_text;
  return {
    value: JSON.parse(raw),
    raw,
    metadata: {
      provider: 'openai',
      model,
      effort,
      stage: options.stage,
      promptVersion: 'problem-gold-generation-prompt-v3-explanation-audit',
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      inputHash: sha256(inputText),
      outputHash: sha256(raw),
      usage: response.usage,
    },
  };
}

async function explanationAwareInstructions(): Promise<string> {
  return [
    loadProblemGoldGenerationPrompt(),
    '',
    await readFile(EXPLANATION_PROMPT_PATH, 'utf8'),
  ].join('\n');
}

function sourceMediaUrls(sourceInput: unknown): string[] {
  if (!isRecord(sourceInput) || !isRecord(sourceInput['source'])) return [];
  const media = sourceInput['source']['media'];
  if (!Array.isArray(media)) return [];
  return media.flatMap((item) => (
    isRecord(item) && typeof item['sourceUrl'] === 'string' ? [item['sourceUrl']] : []
  ));
}

async function runExplanationAudit(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly directory: string;
}): Promise<ExplanationAudit> {
  const auditPath = resolve(options.directory, 'a-explanation-audit.json');
  if (await exists(auditPath)) {
    return validateExplanationAuditAgainstReference(
      await readJson(auditPath),
      options.item.explanation,
    );
  }
  const explanationHash = canonicalExplanationReferenceHash(options.item.explanation);
  const instructions = [
    '당신은 문제 골드 생성 전에 공식 해설 참고자료를 분해하는 독립 감사자다.',
    '해설의 모든 실질 주장을 EC1부터 claim 단위로 분해한다.',
    '각 claim을 SOURCE_EXPLICIT, SOURCE_DERIVED, ANSWER_KEY_CONSTRAINED, EXTERNAL_KNOWLEDGE, UNRESOLVED 중 하나로 분류한다.',
    'SOURCE_EXPLICIT과 SOURCE_DERIVED만 BASE_GOLD에 둘 수 있다. SOURCE_DERIVED는 원문 근거, 명시적 연산, 재구성 설명이 모두 필요하다.',
    '정답 키나 출제 의도가 있어야 확정되는 관계는 ANSWER_KEY_CONSTRAINED이며 기본 골드에 둘 수 없다.',
    '원문 밖 지식은 EXTERNAL_KNOWLEDGE로 분류해 SUPPLEMENTAL, EXCLUDED 또는 HUMAN_REVIEW에 둔다.',
    '해결할 수 없는 전제 공백, 양태 강화, 필요·충분조건 역전은 위험 플래그와 HUMAN_REVIEW로 보낸다.',
    'sourceText와 omittedSegments.sourceText는 해설 원문의 정확한 연속 인용이어야 한다.',
    '해설 문구 자체는 원문 근거가 아니다. sourceEvidence에는 지문·보기·그림·선지·정답 키만 기록한다.',
    '정답 번호 안내 같은 비추론 문구도 EXCLUDED claim으로 분해해 누락 여부를 감사할 수 있게 한다.',
  ].join('\n');
  let previousOutput: unknown = null;
  let validationErrors: readonly string[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const call = await callStructured({
      model: B_MODEL,
      effort: B_EFFORT,
      stage: `A-EXPLANATION-AUDIT-${attempt}`,
      promptVersion: 'problem-gold-explanation-audit-v1',
      instructions,
      input: {
        sourceInput: options.sourceInput,
        officialExplanationReference: options.item.explanation,
        explanationHash,
        previousOutput,
        validationErrors,
        repairPolicy: attempt === 1
          ? '최초 감사를 생성한다.'
          : '직전 출력의 계약 오류만 수정해 전체 감사를 다시 출력한다.',
      },
      schema: ExplanationAuditProviderOutputSchema,
      schemaName: 'problem_gold_explanation_audit',
      maxOutputTokens: 12_000,
      imageUrls: sourceMediaUrls(options.sourceInput),
      background: true,
    });
    await writeFile(
      resolve(options.directory, `a-explanation-audit-attempt-${attempt}-response.json`),
      `${call.raw}\n`,
    );
    await writeJson(
      resolve(options.directory, `a-explanation-audit-attempt-${attempt}-metadata.json`),
      call.metadata,
    );
    previousOutput = call.value;
    try {
      const audit = validateExplanationAuditAgainstReference(
        call.value,
        options.item.explanation,
      );
      await writeJson(
        resolve(options.directory, `a-explanation-audit-attempt-${attempt}-validation.json`),
        { passed: true, errors: [] },
      );
      await writeJson(auditPath, audit);
      return audit;
    } catch (error) {
      validationErrors = error instanceof z.ZodError
        ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        : [error instanceof Error ? error.message : String(error)];
      await writeJson(
        resolve(options.directory, `a-explanation-audit-attempt-${attempt}-validation.json`),
        { passed: false, errors: validationErrors },
      );
    }
  }
  throw new Error(
    `A-EXPLANATION-AUDIT 계약 검증이 3회 실패했다: ${validationErrors.join(' | ')}`,
  );
}

async function runB1(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly directory: string;
  readonly explanationAudit: ExplanationAudit;
}): Promise<unknown> {
  const path = resolve(options.directory, 'b1-first-gold.json');
  if (await exists(path)) return readJson(path);
  const call = await callGold({
    stage: 'B1',
    instructions: await explanationAwareInstructions(),
    input: {
      generationContract: {
        reviewStatus: 'candidate',
        explanationRole: 'REFERENCE_ONLY',
        preserveSourceGrounding: true,
        identifierPolicy: {
          choiceIds: '선지 순서대로 C1, C2, C3, C4, C5',
          paragraphIds: '지문 순서대로 P1부터 부여',
        },
        mediaPolicy: 'source.media의 URL·해시·크기·placement를 정확히 복사한다.',
      },
      sourceInput: options.sourceInput,
      explanationAudit: options.explanationAudit,
    },
    imageUrls: sourceMediaUrls(options.sourceInput),
    background: true,
  });
  // 최초 산출물은 후속 검수보다 먼저 보존한다.
  await writeFile(resolve(options.directory, 'b1-first-response.json'), `${call.raw}\n`);
  await writeJson(resolve(options.directory, 'b1-metadata.json'), call.metadata);
  const gold = normalizeCrossFieldContracts(call.value, options.sourceInput);
  await writeJson(resolve(options.directory, 'b1-validation.json'), validateGold(gold));
  await writeJson(path, gold);
  return gold;
}

async function runB2(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly directory: string;
  readonly initialGold: unknown;
  readonly explanationAudit: ExplanationAudit;
}): Promise<unknown> {
  const finalPath = resolve(options.directory, 'b2-gold.json');
  if (await exists(finalPath)) return readJson(finalPath);
  let gold = options.initialGold;
  const attempts: unknown[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const validation = validateGold(gold);
    attempts.push({ attempt, validation });
    if (validation.schemaValid && validation.warnings.length === 0) break;
    const call = await callGold({
      stage: `B2-${attempt}`,
      instructions: [
        await explanationAwareInstructions(),
        '',
        '## B2 정적 검수 기반 수정',
        '정적 오류와 경고만 최소 수정한다. 정답에 맞추어 원문에 없는 사실을 추가하지 않는다.',
        '공식 해설의 관계는 원문에 다시 근거화할 수 없으면 기본 골드로 승격하지 않는다.',
        '전체 ProblemQuestionGold 객체를 출력한다.',
      ].join('\n'),
      input: {
        sourceInput: options.sourceInput,
        explanationAudit: options.explanationAudit,
        currentGold: gold,
        staticValidation: validation,
      },
      imageUrls: sourceMediaUrls(options.sourceInput),
      background: true,
    });
    gold = normalizeCrossFieldContracts(call.value, options.sourceInput);
    await writeFile(resolve(options.directory, `b2-attempt-${attempt}-response.json`), `${call.raw}\n`);
    await writeJson(resolve(options.directory, `b2-attempt-${attempt}-metadata.json`), call.metadata);
  }
  await writeJson(resolve(options.directory, 'b2-attempts.json'), attempts);
  await writeJson(resolve(options.directory, 'b2-validation.json'), validateGold(gold));
  await writeJson(finalPath, gold);
  return gold;
}

async function evaluateProbe(options: {
  readonly caseId: string;
  readonly gold: ProblemQuestionGold;
  readonly category: ProbeCategory;
  readonly iteration: number;
  readonly response: { choiceId: string; rationale: string };
}): Promise<Record<string, unknown>> {
  const evaluator = new OpenAIProblemPathEvaluator({ effort: 'medium' });
  const session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `${options.caseId}-${options.category}-${options.iteration}`,
    questionId: options.gold.questionId,
    answerChoiceId: options.gold.answerChoiceId,
  }), {
    initialChoiceId: options.response.choiceId,
    rationale: options.response.rationale,
  });
  const evaluationMode = options.response.choiceId === options.gold.answerChoiceId
    ? 'ASSESS_SELECTION_RATIONALE' as const
    : 'DIAGNOSE_PATH' as const;
  try {
    const evaluation = await evaluator.evaluate(createProblemPathEvaluatorInput({
      evaluationMode,
      session,
      gold: options.gold,
    }));
    let passed = false;
    let observed = '';
    if (evaluation.result.mode === 'ASSESS_SELECTION_RATIONALE') {
      observed = evaluation.result.assessment;
      passed = ['accurate', 'negativeAccurate'].includes(options.category) &&
        evaluation.result.assessment === 'SUPPORTED';
    } else {
      const selected = evaluation.result.targets.find((target) => target.kind === 'SELECTED_CHOICE');
      observed = [
        selected?.status ?? 'MISSING',
        selected?.errorAssessment ?? 'NULL',
        evaluation.result.nextActionCandidate.type,
      ].join('|');
      if (options.category === 'representativeWrong') {
        passed = probeResultPassed(
          options.category,
          evaluation.result,
          options.gold,
          options.response.choiceId,
        );
      } else if (options.category === 'lowInformation') {
        passed = selected?.status === 'INSUFFICIENT' &&
          selected.errorAssessment === 'UNCERTAIN' &&
          evaluation.result.nextActionCandidate.type === 'ASK_DIAGNOSTIC';
      }
    }
    return {
      category: options.category,
      iteration: options.iteration,
      choiceId: options.response.choiceId,
      rationale: options.response.rationale,
      passed,
      observed,
      result: evaluation.result,
      call: evaluation.call,
    };
  } catch (error) {
    return {
      category: options.category,
      iteration: options.iteration,
      choiceId: options.response.choiceId,
      rationale: options.response.rationale,
      passed: false,
      observed: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function probeResultPassed(
  category: ProbeCategory,
  resultValue: unknown,
  gold: ProblemQuestionGold,
  choiceId: string,
): boolean {
  if (!isRecord(resultValue)) return false;
  if (category === 'accurate' || category === 'negativeAccurate') {
    return resultValue['mode'] === 'ASSESS_SELECTION_RATIONALE' &&
      resultValue['assessment'] === 'SUPPORTED';
  }
  if (resultValue['mode'] !== 'DIAGNOSE_PATH') return false;
  const targets = Array.isArray(resultValue['targets'])
    ? resultValue['targets'].filter(isRecord)
    : [];
  const selected = targets.find((target) => target['kind'] === 'SELECTED_CHOICE');
  const action = isRecord(resultValue['nextActionCandidate'])
    ? resultValue['nextActionCandidate']
    : {};
  if (category === 'lowInformation') {
    return selected?.['status'] === 'INSUFFICIENT' &&
      selected['errorAssessment'] === 'UNCERTAIN' &&
      action['type'] === 'ASK_DIAGNOSTIC';
  }
  const choiceClaimIds = new Set(
    gold.choices.find((choice) => choice.choiceId === choiceId)?.claimIds ?? [],
  );
  const nonEntailedChoice = gold.itemInferences.some((inference) => (
    inference.targetClaimEffect === 'DOES_NOT_JUSTIFY' &&
    inference.targetClaimIds.some((claimId) => choiceClaimIds.has(claimId))
  ));
  return action['target'] === 'SELECTED_CHOICE' && (
    nonEntailedChoice
      ? selected?.['status'] === 'BOUNDARY_CLARIFICATION_REQUIRED' &&
        selected['errorAssessment'] === 'GOLD_OR_ITEM_LIMITATION' &&
        action['type'] === 'EXPLAIN_ITEM_BOUNDARY'
      : selected?.['errorAssessment'] === 'CLEAR_ERROR'
  );
}

function summarizeProbeResults(
  results: readonly Record<string, unknown>[],
  categories: readonly ProbeCategory[],
): Record<string, unknown> {
  return {
    total: results.length,
    passed: results.filter((result) => result['passed'] === true).length,
    failed: results.filter((result) => result['passed'] !== true).length,
    byCategory: Object.fromEntries(categories.map((category) => {
      const selected = results.filter((result) => result['category'] === category);
      return [category, {
        passed: selected.filter((result) => result['passed'] === true).length,
        total: selected.length,
      }];
    })),
  };
}

function regradeProbeSuite(
  suite: { results: Record<string, unknown>[]; summary: Record<string, unknown> },
  goldValue: unknown,
): { results: Record<string, unknown>[]; summary: Record<string, unknown> } {
  const gold = ProblemQuestionGoldSchema.parse(goldValue);
  const categories = Object.keys(StudentCasesSchema.shape) as ProbeCategory[];
  const results = suite.results.map((result) => {
    const category = result['category'];
    const choiceId = result['choiceId'];
    if (
      typeof category !== 'string' ||
      !categories.includes(category as ProbeCategory) ||
      typeof choiceId !== 'string'
    ) {
      return result;
    }
    return {
      ...result,
      passed: probeResultPassed(
        category as ProbeCategory,
        result['result'],
        gold,
        choiceId,
      ),
    };
  });
  return { results, summary: summarizeProbeResults(results, categories) };
}

async function runProbeSuite(options: {
  readonly caseId: string;
  readonly goldValue: unknown;
  readonly cases: StudentCases;
}): Promise<{ results: Record<string, unknown>[]; summary: Record<string, unknown> }> {
  const parsed = ProblemQuestionGoldSchema.parse(options.goldValue);
  const gold = { ...parsed, reviewStatus: 'human_reviewed' as const };
  const categories = Object.keys(options.cases) as ProbeCategory[];
  const jobs = categories.flatMap((category) => {
    const base = options.cases[category];
    const response = category === 'lowInformation'
      ? { ...base, rationale: `잘 모르겠지만 ${base.choiceId.slice(1)}번 같습니다.` }
      : base;
    return Array.from({ length: REPEATS }, (_, index) => ({
      category,
      iteration: index + 1,
      response,
    }));
  });
  const results: Record<string, unknown>[] = [];
  for (let index = 0; index < jobs.length; index += 4) {
    results.push(...await Promise.all(jobs.slice(index, index + 4).map((job) => (
      evaluateProbe({ caseId: options.caseId, gold, ...job })
    ))));
  }
  const summary = summarizeProbeResults(results, categories);
  return { results, summary };
}

async function runB3(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly directory: string;
  readonly goldValue: unknown;
  readonly cases: StudentCases;
  readonly explanationAudit: ExplanationAudit;
}): Promise<{ gold: unknown; probes: { results: Record<string, unknown>[]; summary: Record<string, unknown> } }> {
  const finalPath = resolve(options.directory, 'b3-gold.json');
  if (await exists(finalPath)) {
    const gold = await readJson(finalPath);
    const probes = regradeProbeSuite(
      z.object({ results: z.array(z.record(z.string(), z.unknown())), summary: z.record(z.string(), z.unknown()) })
        .parse(await readJson(resolve(options.directory, 'b3-probes.json'))),
      gold,
    );
    await writeJson(resolve(options.directory, 'b3-probes.json'), probes);
    return {
      gold,
      probes,
    };
  }
  let gold = options.goldValue;
  let probes = await runProbeSuite({ caseId: options.item.caseId, goldValue: gold, cases: options.cases });
  await writeJson(resolve(options.directory, 'b3-initial-probes.json'), probes);
  const failed = probes.results.filter((result) => result['passed'] !== true);
  if (failed.length > 0) {
    const diagnosis = await callStructured({
      model: B_MODEL,
      effort: B_EFFORT,
      stage: 'B3-DIAGNOSIS',
      promptVersion: 'problem-gold-probe-diagnosis-v1',
      instructions: [
        '학생 응답 프로브 실패가 골드 결함인지 평가기 결함인지 구분한다.',
        '정확한 근거를 인정하지 못한 이유가 source fact 또는 방향성 itemInference 누락이면 GOLD_DEFECT다.',
        '골드가 충분하지만 부정 표현·저정보 문구를 평가기가 오독했다면 EVALUATOR_DEFECT다.',
        '테스트 통과를 위해 지문에 없는 사실을 골드에 넣도록 권하지 않는다.',
      ].join('\n'),
      input: {
        sourceInput: options.sourceInput,
        explanationAudit: options.explanationAudit,
        currentGold: gold,
        studentCases: options.cases,
        failedProbeResults: failed,
      },
      schema: ProbeDiagnosisSchema,
      schemaName: 'problem_gold_probe_diagnosis',
      maxOutputTokens: 6_000,
      imageUrls: sourceMediaUrls(options.sourceInput),
    });
    await writeJson(resolve(options.directory, 'b3-diagnosis.json'), diagnosis.value);
    await writeJson(resolve(options.directory, 'b3-diagnosis-metadata.json'), diagnosis.metadata);
    if (diagnosis.value.shouldRepairGold) {
      const repair = await callGold({
        stage: 'B3-REPAIR',
        instructions: [
          await explanationAwareInstructions(),
          '',
          '## B3 학생 응답 프로브 기반 수정',
          '진단에서 GOLD_DEFECT로 확인된 문제만 최소 수정한다.',
          '평가기 언어 해석 문제를 골드에 거짓 사실을 추가해 우회하지 않는다.',
          '전체 ProblemQuestionGold 객체를 출력한다.',
        ].join('\n'),
        input: {
          sourceInput: options.sourceInput,
          explanationAudit: options.explanationAudit,
          currentGold: gold,
          diagnosis: diagnosis.value,
          failedProbeResults: failed,
        },
        imageUrls: sourceMediaUrls(options.sourceInput),
      });
      gold = normalizeCrossFieldContracts(repair.value, options.sourceInput);
      await writeJson(resolve(options.directory, 'b3-repair-metadata.json'), repair.metadata);
      await writeFile(resolve(options.directory, 'b3-repair-response.json'), `${repair.raw}\n`);
      probes = await runProbeSuite({ caseId: options.item.caseId, goldValue: gold, cases: options.cases });
    }
  }
  await writeJson(resolve(options.directory, 'b3-validation.json'), validateGold(gold));
  await writeJson(resolve(options.directory, 'b3-probes.json'), probes);
  await writeJson(finalPath, gold);
  return { gold, probes };
}

async function semanticAudit(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly gold: unknown;
  readonly validation: ValidationResult;
  readonly probes: { results: Record<string, unknown>[]; summary: Record<string, unknown> };
  readonly stage: string;
  readonly explanationAudit: ExplanationAudit;
}): Promise<{ value: z.infer<typeof SemanticAuditSchema>; metadata: ApiMetadata }> {
  const call = await callStructured({
    model: C_MODEL,
    effort: C_EFFORT,
    stage: options.stage,
    promptVersion: 'problem-gold-agent-semantic-audit-v1',
    instructions: [
      '당신은 독립적인 수능형 문제 골드 의미 감사 에이전트다.',
      '지문·보기·그림·선지와 EBSi 해설 참고자료를 교차 검토하고, 자동 승인 가능한지 판단한다.',
      '해설은 추론을 발견하는 참고자료일 뿐 지문 사실의 근거가 아니다.',
      'explanationUsage에는 ExplanationAudit의 모든 claim을 정확히 한 번씩 포함하고 explanationClaimId로 연결한다.',
      '각 해설 연결을 SOURCE_EXPLICIT, SOURCE_DERIVED, ANSWER_KEY_CONSTRAINED, EXTERNAL_KNOWLEDGE로 분류한다.',
      'SOURCE_DERIVED는 premiseRefs와 operation만으로 결론이 재구성되어야 한다.',
      'SUPPORTS는 승인 근거로 대상 주장을, CONTRADICTS는 대상 주장의 부정을 도출하는 관계다.',
      'DOES_NOT_JUSTIFY는 주장과 부정 모두 도출되지 않지만 선지가 요구하는 주장에는 근거가 부족한 비함의 관계다. 약한 모순으로 취급하지 않는다.',
      '각 inferenceAudit.expectedTargetClaimEffect에 실제 의미상 맞는 효과를 기록하고 결정할 수 없을 때만 UNRESOLVED를 사용한다.',
      '공식 해설의 역수입, 전제 누락·과잉, 선지 양태 강화, conclusion/effect 불일치를 찾는다.',
      '프로브 실패가 평가기 언어 해석 문제라면 골드 수정을 권하지 말고 위험으로 기록한다.',
      '모호하거나 해설만으로도 해결되지 않는 경우 HUMAN_REVIEW를 선택한다.',
    ].join('\n'),
    input: {
      sourceInput: options.sourceInput,
      officialExplanationReference: options.item.explanation,
      explanationAudit: options.explanationAudit,
      candidateGold: options.gold,
      staticValidation: options.validation,
      probeSummary: options.probes.summary,
      failedProbeResults: options.probes.results.filter((result) => result['passed'] !== true),
    },
    schema: SemanticAuditSchema,
    schemaName: 'problem_gold_agent_semantic_audit',
    maxOutputTokens: 12_000,
    imageUrls: sourceMediaUrls(options.sourceInput),
    background: true,
  });
  return { value: call.value, metadata: call.metadata };
}

async function runC(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly directory: string;
  readonly goldValue: unknown;
  readonly probes: { results: Record<string, unknown>[]; summary: Record<string, unknown> };
  readonly cases: StudentCases;
  readonly explanationAudit: ExplanationAudit;
}): Promise<{
  gold: unknown;
  probes: { results: Record<string, unknown>[]; summary: Record<string, unknown> };
  audit: z.infer<typeof SemanticAuditSchema>;
}> {
  const finalPath = resolve(options.directory, 'c-gold.json');
  if (await exists(finalPath)) {
    const gold = await readJson(finalPath);
    const probes = regradeProbeSuite(
      z.object({ results: z.array(z.record(z.string(), z.unknown())), summary: z.record(z.string(), z.unknown()) })
        .parse(await readJson(resolve(options.directory, 'c-probes.json'))),
      gold,
    );
    await writeJson(resolve(options.directory, 'c-probes.json'), probes);
    return {
      gold,
      probes,
      audit: SemanticAuditSchema.parse(await readJson(resolve(options.directory, 'c-final-audit.json'))),
    };
  }
  let gold = options.goldValue;
  let probes = options.probes;
  let auditCall = await semanticAudit({
    item: options.item,
    sourceInput: options.sourceInput,
    gold,
    validation: validateGold(gold),
    probes,
    stage: 'C-AUDIT-1',
    explanationAudit: options.explanationAudit,
  });
  await writeJson(resolve(options.directory, 'c-audit-1.json'), auditCall.value);
  await writeJson(resolve(options.directory, 'c-audit-1-metadata.json'), auditCall.metadata);
  if (auditCall.value.recommendedAction === 'REPAIR_GOLD') {
    const repair = await callGold({
      stage: 'C-REPAIR',
      model: C_MODEL,
      effort: C_EFFORT,
      instructions: [
        await explanationAwareInstructions(),
        '',
        '## C 에이전트 의미 감사 수정',
        '독립 의미 감사에서 지적된 골드 결함만 수정한다.',
        '해설을 지문 명제로 역수입하지 말고, 원문에 근거화할 수 없는 관계는 보충 층에 격리한다.',
        '전체 ProblemQuestionGold 객체를 출력한다.',
      ].join('\n'),
      input: {
        sourceInput: options.sourceInput,
        explanationAudit: options.explanationAudit,
        currentGold: gold,
        semanticAudit: auditCall.value,
      },
      imageUrls: sourceMediaUrls(options.sourceInput),
      background: true,
    });
    const previousGold = gold;
    gold = normalizeCrossFieldContracts(repair.value, options.sourceInput);
    await writeFile(resolve(options.directory, 'c-repair-response.json'), `${repair.raw}\n`);
    await writeJson(resolve(options.directory, 'c-repair-metadata.json'), repair.metadata);
    await writeJson(resolve(options.directory, 'c-repair-normalized.json'), gold);
    const repairValidation = validateGold(gold);
    await writeJson(resolve(options.directory, 'c-repair-validation.json'), repairValidation);
    if (repairValidation.schemaValid) {
      probes = await runProbeSuite({ caseId: options.item.caseId, goldValue: gold, cases: options.cases });
      auditCall = await semanticAudit({
        item: options.item,
        sourceInput: options.sourceInput,
        gold,
        validation: repairValidation,
        probes,
        stage: 'C-AUDIT-2',
        explanationAudit: options.explanationAudit,
      });
      await writeJson(resolve(options.directory, 'c-audit-2.json'), auditCall.value);
      await writeJson(resolve(options.directory, 'c-audit-2-metadata.json'), auditCall.metadata);
    } else {
      gold = previousGold;
      auditCall = {
        ...auditCall,
        value: {
          ...auditCall.value,
          recommendedAction: 'HUMAN_REVIEW',
          unresolvedRisks: [
            ...auditCall.value.unresolvedRisks,
            `C 수정본 계약 검증 실패: ${repairValidation.errors.join(' | ')}`,
          ],
        },
      };
    }
  }
  await writeJson(resolve(options.directory, 'c-validation.json'), validateGold(gold));
  await writeJson(resolve(options.directory, 'c-probes.json'), probes);
  await writeJson(resolve(options.directory, 'c-final-audit.json'), auditCall.value);
  await writeJson(finalPath, gold);
  return { gold, probes, audit: auditCall.value };
}

function qualityGate(options: {
  readonly item: CorpusItem;
  readonly sourceInput: unknown;
  readonly goldValue: unknown;
  readonly probes: { results: Record<string, unknown>[]; summary: Record<string, unknown> };
  readonly audit: z.infer<typeof SemanticAuditSchema>;
  readonly explanationAudit: ExplanationAudit;
  readonly explanationBenchmark: ExplanationAuditBenchmarkCase;
  readonly explanationBenchmarkEvaluation: ExplanationAuditBenchmarkEvaluation;
}): Record<string, unknown> {
  const validation = validateGold(options.goldValue);
  const parsedGold = ProblemQuestionGoldSchema.safeParse(options.goldValue);
  const gradedProbes = regradeProbeSuite(options.probes, options.goldValue);
  const source = isRecord(options.sourceInput) && isRecord(options.sourceInput['source'])
    ? options.sourceInput['source']
    : {};
  const sourceMedia = Array.isArray(source['media']) ? source['media'].filter(isRecord) : [];
  const expectedChoiceIds = parsedGold.success
    ? parsedGold.data.choices.map((_, index) => `C${index + 1}`)
    : [];
  const sourceFidelityIssues: string[] = [];
  if (parsedGold.success) {
    if (JSON.stringify(parsedGold.data.choices.map((choice) => choice.choiceId)) !== JSON.stringify(expectedChoiceIds)) {
      sourceFidelityIssues.push('choiceId가 C1..Cn 표준과 일치하지 않는다.');
    }
    if (parsedGold.data.source.sourceId !== source['sourceId']) {
      sourceFidelityIssues.push('sourceId가 원본과 일치하지 않는다.');
    }
    if (parsedGold.data.source.questionNumber !== source['questionNumber']) {
      sourceFidelityIssues.push('questionNumber가 원본과 일치하지 않는다.');
    }
    for (const expected of sourceMedia) {
      const actual = parsedGold.data.mediaAssets.find((media) => media.mediaId === expected['mediaId']);
      if (
        actual === undefined ||
        actual.sourceUrl !== expected['sourceUrl'] ||
        actual.contentHash !== expected['contentHash'] ||
        actual.width !== expected['width'] ||
        actual.height !== expected['height']
      ) {
        sourceFidelityIssues.push(`미디어 ${String(expected['mediaId'])}의 원본 메타데이터가 일치하지 않는다.`);
      }
    }
  }
  const failedInferenceAudits = options.audit.inferenceAudits.filter((audit) => (
    audit.conclusionDirectional !== 'PASS' ||
    audit.effectConsistency !== 'PASS' ||
    audit.premiseSufficiency !== 'PASS' ||
    audit.premiseMinimality !== 'PASS'
  ));
  const failedExplanationPlacements = options.audit.explanationUsage.filter(
    (usage) => !usage.placementCorrect,
  );
  const explanationUsageIds = options.audit.explanationUsage.map(
    (usage) => usage.explanationClaimId,
  );
  const expectedExplanationUsageIds = options.explanationAudit.claims.map(
    (claim) => claim.claimId,
  );
  const explanationUsageCoverageIssues = [
    ...expectedExplanationUsageIds
      .filter((id) => !explanationUsageIds.includes(id))
      .map((id) => `C 해설 사용 감사에서 ${id}가 누락됐다.`),
    ...explanationUsageIds
      .filter((id) => !expectedExplanationUsageIds.includes(id))
      .map((id) => `C 해설 사용 감사가 존재하지 않는 ${id}를 참조한다.`),
    ...(new Set(explanationUsageIds).size === explanationUsageIds.length
      ? []
      : ['C 해설 사용 감사의 explanationClaimId가 중복된다.']),
  ];
  const explanationPlacementContract = auditExplanationPlacementContract(
    options.explanationAudit,
    options.goldValue,
  );
  const inferenceEffectsById = new Map(
    parsedGold.success
      ? parsedGold.data.itemInferences.map((inference) => [
          inference.inferenceId,
          inference.targetClaimEffect,
        ] as const)
      : [],
  );
  const inferenceEffectResults = options.audit.inferenceAudits.map((audit) => ({
    inferenceId: audit.inferenceId,
    expected: audit.expectedTargetClaimEffect,
    actual: inferenceEffectsById.get(audit.inferenceId) ?? 'MISSING',
    correct: audit.expectedTargetClaimEffect !== 'UNRESOLVED' &&
      inferenceEffectsById.get(audit.inferenceId) === audit.expectedTargetClaimEffect,
  }));
  const comparableInferenceEffects = inferenceEffectResults.filter(
    (result) => result.expected !== 'UNRESOLVED',
  );
  const allowedSupplementalTexts = new Set(
    options.explanationAudit.claims
      .filter((claim) => claim.placement === 'SUPPLEMENTAL')
      .map((claim) => claim.sourceText),
  );
  const supplementalEntries = parsedGold.success
    ? parsedGold.data.supplementalExplanationInferences
    : [];
  const preservedSupplementalEntries = supplementalEntries.filter(
    (entry) => allowedSupplementalTexts.has(entry.sourceText),
  );
  const checks = {
    explanationAuditComplete: options.explanationAudit.coverage === 'COMPLETE',
    explanationAuditPassed: options.explanationAudit.overallDecision === 'PASS',
    explanationUsageCoveragePass: explanationUsageCoverageIssues.length === 0,
    explanationPlacementContractPass: explanationPlacementContract.passed,
    schemaValid: validation.schemaValid,
    noStaticErrors: validation.errors.length === 0,
    noStaticWarnings: validation.warnings.length === 0,
    sourceFidelityPass: sourceFidelityIssues.length === 0,
    allProbesPass: gradedProbes.summary['failed'] === 0,
    officialAnswerMatches: options.audit.officialAnswerMatches,
    noReverseImport: !options.audit.reverseImportDetected,
    allInferencesPass: failedInferenceAudits.length === 0,
    explanationPlacementPass: failedExplanationPlacements.length === 0,
    semanticAgentPass: options.audit.recommendedAction === 'PASS',
    noUnresolvedRisks: options.audit.unresolvedRisks.length === 0,
  };
  const efficacyChecks = {
    explanationBenchmarkHumanReviewed:
      options.explanationBenchmark.reviewStatus === 'human_reviewed',
    explanationClaimCoveragePass:
      options.explanationBenchmarkEvaluation.claimOmissionRate === 0,
    explanationClassificationPass:
      options.explanationBenchmarkEvaluation.classificationAccuracy === 1,
    explanationPlacementBenchmarkPass:
      options.explanationBenchmarkEvaluation.placementAccuracy === 1,
  };
  return {
    caseId: options.item.caseId,
    role: options.item.role,
    checks,
    efficacyChecks,
    autoApproved: Object.values(checks).every(Boolean),
    routing: Object.values(checks).every(Boolean) ? 'AUTO_APPROVED' : 'HUMAN_REVIEW',
    validation,
    probeSummary: gradedProbes.summary,
    cRecommendedAction: options.audit.recommendedAction,
    reverseImportSuspectPassagePropositionIds:
      options.audit.suspectPassagePropositionIds,
    inferenceEffectEvaluation: {
      total: comparableInferenceEffects.length,
      correct: comparableInferenceEffects.filter((result) => result.correct).length,
      accuracy: comparableInferenceEffects.length === 0
        ? null
        : comparableInferenceEffects.filter((result) => result.correct).length /
          comparableInferenceEffects.length,
      unresolved: inferenceEffectResults.length - comparableInferenceEffects.length,
      results: inferenceEffectResults,
    },
    supplementalLineageEvaluation: {
      allowedClaims: allowedSupplementalTexts.size,
      actualEntries: supplementalEntries.length,
      preservedEntries: preservedSupplementalEntries.length,
      preservationRate: supplementalEntries.length === 0
        ? null
        : preservedSupplementalEntries.length / supplementalEntries.length,
    },
    failedInferenceAudits,
    failedExplanationPlacements,
    unresolvedRisks: options.audit.unresolvedRisks,
    explanationAudit: options.explanationAudit,
    explanationPlacementContractIssues: explanationPlacementContract.issues,
    explanationBenchmarkEvaluation: options.explanationBenchmarkEvaluation,
    explanationUsageCoverageIssues,
    sourceFidelityIssues,
  };
}

async function runCase(
  corpus: Corpus,
  item: CorpusItem,
  explanationBenchmark: ExplanationAuditBenchmarkCase,
): Promise<Record<string, unknown>> {
  const directory = resolve(OUTPUT_ROOT, 'artifacts', item.caseId);
  await mkdir(directory, { recursive: true });
  const baselineDirectory = resolve(corpus.baselineExperimentRoot, item.caseId);
  const sourceInput = await readJson(resolve(baselineDirectory, 'source-input.json'));
  const studentCases = StudentCasesSchema.parse(
    await readJson(resolve(baselineDirectory, 'student-response-cases.json')),
  );
  await writeJson(resolve(directory, 'experiment-input.json'), {
    caseId: item.caseId,
    role: item.role,
    sourceInput,
    officialExplanationReference: item.explanation,
    sourceInputHash: sha256(JSON.stringify(sourceInput)),
    explanationHash: sha256(JSON.stringify(item.explanation)),
    baselineStudentCasesHash: sha256(JSON.stringify(studentCases)),
  });

  process.stdout.write(`[A] ${item.caseId}\n`);
  const explanationAudit = await runExplanationAudit({ item, sourceInput, directory });
  const explanationBenchmarkEvaluation = evaluateExplanationAuditBenchmark(
    explanationAudit,
    explanationBenchmark,
  );
  await writeJson(
    resolve(directory, 'a-explanation-audit-benchmark-evaluation.json'),
    explanationBenchmarkEvaluation,
  );
  process.stdout.write(`[B1] ${item.caseId}\n`);
  const b1 = await runB1({ item, sourceInput, directory, explanationAudit });
  process.stdout.write(`[B2] ${item.caseId}\n`);
  const b2 = await runB2({
    item,
    sourceInput,
    directory,
    initialGold: b1,
    explanationAudit,
  });
  process.stdout.write(`[B3] ${item.caseId}\n`);
  const b3 = await runB3({
    item,
    sourceInput,
    directory,
    goldValue: b2,
    cases: studentCases,
    explanationAudit,
  });
  process.stdout.write(`[C] ${item.caseId}\n`);
  const c = await runC({
    item,
    sourceInput,
    directory,
    goldValue: b3.gold,
    probes: b3.probes,
    cases: studentCases,
    explanationAudit,
  });
  const gate: Record<string, unknown> = {
    ...qualityGate({
    item,
    sourceInput,
    goldValue: c.gold,
    probes: c.probes,
    audit: c.audit,
    explanationAudit,
    explanationBenchmark,
    explanationBenchmarkEvaluation,
    }),
    stageOutcomes: {
      b1StructuralPass: validateGold(b1).schemaValid &&
        validateGold(b1).warnings.length === 0,
      b2StructuralPass: validateGold(b2).schemaValid &&
        validateGold(b2).warnings.length === 0,
      b2RepairRequired: !(validateGold(b1).schemaValid &&
        validateGold(b1).warnings.length === 0),
    },
  };
  await writeJson(resolve(directory, 'final-quality-gate.json'), gate);
  process.stdout.write(`[gate] ${item.caseId} ${String(gate['routing'])}\n`);
  return gate;
}

function aggregateEfficacyMetrics(
  gates: readonly Record<string, unknown>[],
): Record<string, unknown> {
  const metrics = {
    explanationAudit: {
      benchmarkClaims: 0,
      matchedClaims: 0,
      omittedClaims: 0,
      classificationCorrect: 0,
      placementCorrect: 0,
    },
    reverseImport: {
      affectedCases: 0,
      failedClaimPlacements: 0,
      suspectPassagePropositions: 0,
    },
    supplementalLineage: {
      allowedClaims: 0,
      actualEntries: 0,
      preservedEntries: 0,
    },
    inferenceEffects: {
      total: 0,
      correct: 0,
      unresolved: 0,
      byExpected: {
        SUPPORTS: { total: 0, correct: 0 },
        CONTRADICTS: { total: 0, correct: 0 },
        DOES_NOT_JUSTIFY: { total: 0, correct: 0 },
      },
    },
    stages: {
      b1StructuralPass: 0,
      b2StructuralPass: 0,
      cActions: { PASS: 0, REPAIR_GOLD: 0, HUMAN_REVIEW: 0 },
    },
    probes: {
      total: 0,
      passed: 0,
      byCategory: Object.fromEntries(
        (Object.keys(StudentCasesSchema.shape) as ProbeCategory[]).map((category) => [
          category,
          { total: 0, passed: 0 },
        ]),
      ) as Record<ProbeCategory, { total: number; passed: number }>,
    },
  };
  for (const gate of gates) {
    const benchmark = gate['explanationBenchmarkEvaluation'];
    if (isRecord(benchmark)) {
      metrics.explanationAudit.benchmarkClaims += Number(benchmark['totalBenchmarkClaims'] ?? 0);
      metrics.explanationAudit.matchedClaims += Number(benchmark['matchedClaims'] ?? 0);
      metrics.explanationAudit.omittedClaims += Number(benchmark['omittedClaims'] ?? 0);
      metrics.explanationAudit.classificationCorrect += Number(benchmark['classificationCorrect'] ?? 0);
      metrics.explanationAudit.placementCorrect += Number(benchmark['placementCorrect'] ?? 0);
    }
    const checks = gate['checks'];
    if (isRecord(checks) && checks['noReverseImport'] === false) {
      metrics.reverseImport.affectedCases += 1;
    }
    const failedPlacements = gate['failedExplanationPlacements'];
    if (Array.isArray(failedPlacements)) {
      metrics.reverseImport.failedClaimPlacements += failedPlacements.length;
    }
    const suspectPropositions = gate['reverseImportSuspectPassagePropositionIds'];
    if (Array.isArray(suspectPropositions)) {
      metrics.reverseImport.suspectPassagePropositions += suspectPropositions.length;
    }
    const supplemental = gate['supplementalLineageEvaluation'];
    if (isRecord(supplemental)) {
      metrics.supplementalLineage.allowedClaims += Number(supplemental['allowedClaims'] ?? 0);
      metrics.supplementalLineage.actualEntries += Number(supplemental['actualEntries'] ?? 0);
      metrics.supplementalLineage.preservedEntries += Number(supplemental['preservedEntries'] ?? 0);
    }
    const effects = gate['inferenceEffectEvaluation'];
    if (isRecord(effects)) {
      metrics.inferenceEffects.total += Number(effects['total'] ?? 0);
      metrics.inferenceEffects.correct += Number(effects['correct'] ?? 0);
      metrics.inferenceEffects.unresolved += Number(effects['unresolved'] ?? 0);
      const results = effects['results'];
      if (Array.isArray(results)) {
        for (const result of results.filter(isRecord)) {
          const expected = result['expected'];
          if (
            expected !== 'SUPPORTS' &&
            expected !== 'CONTRADICTS' &&
            expected !== 'DOES_NOT_JUSTIFY'
          ) continue;
          metrics.inferenceEffects.byExpected[expected].total += 1;
          if (result['correct'] === true) {
            metrics.inferenceEffects.byExpected[expected].correct += 1;
          }
        }
      }
    }
    const stages = gate['stageOutcomes'];
    if (isRecord(stages)) {
      if (stages['b1StructuralPass'] === true) metrics.stages.b1StructuralPass += 1;
      if (stages['b2StructuralPass'] === true) metrics.stages.b2StructuralPass += 1;
    }
    const cAction = gate['cRecommendedAction'];
    if (cAction === 'PASS' || cAction === 'REPAIR_GOLD' || cAction === 'HUMAN_REVIEW') {
      metrics.stages.cActions[cAction] += 1;
    }
    const probes = gate['probeSummary'];
    if (isRecord(probes)) {
      metrics.probes.total += Number(probes['total'] ?? 0);
      metrics.probes.passed += Number(probes['passed'] ?? 0);
      const byCategory = probes['byCategory'];
      if (isRecord(byCategory)) {
        for (const category of Object.keys(StudentCasesSchema.shape) as ProbeCategory[]) {
          const value = byCategory[category];
          if (!isRecord(value)) continue;
          metrics.probes.byCategory[category].total += Number(value['total'] ?? 0);
          metrics.probes.byCategory[category].passed += Number(value['passed'] ?? 0);
        }
      }
    }
  }
  const ratio = (numerator: number, denominator: number): number | null => (
    denominator === 0 ? null : numerator / denominator
  );
  return {
    benchmarkReviewStatus: 'candidate',
    explanationAudit: {
      ...metrics.explanationAudit,
      claimOmissionRate: ratio(
        metrics.explanationAudit.omittedClaims,
        metrics.explanationAudit.benchmarkClaims,
      ),
      classificationAccuracy: ratio(
        metrics.explanationAudit.classificationCorrect,
        metrics.explanationAudit.benchmarkClaims,
      ),
      placementAccuracy: ratio(
        metrics.explanationAudit.placementCorrect,
        metrics.explanationAudit.benchmarkClaims,
      ),
    },
    reverseImport: metrics.reverseImport,
    supplementalLineage: {
      ...metrics.supplementalLineage,
      preservationRate: ratio(
        metrics.supplementalLineage.preservedEntries,
        metrics.supplementalLineage.actualEntries,
      ),
    },
    inferenceEffects: {
      ...metrics.inferenceEffects,
      accuracy: ratio(metrics.inferenceEffects.correct, metrics.inferenceEffects.total),
    },
    stages: { ...metrics.stages, totalCases: gates.length },
    probes: {
      ...metrics.probes,
      passRate: ratio(metrics.probes.passed, metrics.probes.total),
    },
    autoApproval: {
      previous: { approved: 0, total: 5 },
      current: {
        approved: gates.filter((gate) => gate['autoApproved'] === true).length,
        total: gates.length,
      },
    },
  };
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  const benchmark = ExplanationAuditBenchmarkSchema.parse(
    await readJson(EXPLANATION_BENCHMARK_PATH),
  );
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const onlyCase = process.argv.find((argument) => argument.startsWith('--case='))
    ?.slice('--case='.length);
  const selected = onlyCase === undefined
    ? corpus.items
    : corpus.items.filter((item) => item.caseId === onlyCase);
  if (selected.length === 0) throw new Error(`알 수 없는 caseId: ${onlyCase}`);
  const gates: Record<string, unknown>[] = [];
  for (const item of selected) {
    const benchmarkCase = benchmark.cases.find((entry) => entry.caseId === item.caseId);
    if (benchmarkCase === undefined) {
      throw new Error(`ExplanationAudit benchmark 누락: ${item.caseId}`);
    }
    gates.push(await runCase(corpus, item, benchmarkCase));
  }
  const allCompletedGates: Record<string, unknown>[] = [];
  for (const item of corpus.items) {
    const gatePath = resolve(OUTPUT_ROOT, 'artifacts', item.caseId, 'final-quality-gate.json');
    if (await exists(gatePath)) {
      allCompletedGates.push(await readJson(gatePath) as Record<string, unknown>);
    }
  }
  const summary = {
    corpusVersion: corpus.corpusVersion,
    generatedAt: new Date().toISOString(),
    models: { bStages: B_MODEL, bEffort: B_EFFORT, cStage: C_MODEL, cEffort: C_EFFORT },
    total: allCompletedGates.length,
    autoApproved: allCompletedGates.filter((gate) => gate['autoApproved'] === true).length,
    humanReview: allCompletedGates.filter((gate) => gate['autoApproved'] !== true).length,
    efficacyMetrics: aggregateEfficacyMetrics(allCompletedGates),
    gates: allCompletedGates,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'summary.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
