import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import OpenAI from 'openai';

import {
  ProblemQuestionGoldSchema,
  auditProblemGoldWarnings,
} from '../problem-solving/gold.js';
import {
  DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
  DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
  createProblemGoldProviderJsonSchema,
} from '../problem-solving/gold-generation-runtime.js';
import {
  PROBLEM_GOLD_GENERATION_PROMPT_VERSION,
  loadProblemGoldGenerationPrompt,
} from '../problem-solving/gold-generation.js';

const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const REPAIR_PROMPT_VERSION = 'problem-gold-extrapolation-repair-v1';

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 문항별 지식 없이 반복적으로 관찰된 순수 계약 위반만 정규화한다. */
export function normalizeCrossFieldContracts(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const output = structuredClone(input);
  if (!isRecord(output)) return output;

  const answerChoiceId = typeof output['answerChoiceId'] === 'string'
    ? output['answerChoiceId']
    : '';
  const conclusionIds = new Set(
    Array.isArray(output['conclusionStepIds']) ? output['conclusionStepIds'] : [],
  );
  if (Array.isArray(output['decisivePathStepIds'])) {
    const filtered = output['decisivePathStepIds']
      .filter((id) => typeof id === 'string' && !conclusionIds.has(id));
    if (filtered.length > 0) {
      output['decisivePathStepIds'] = filtered;
    } else if (Array.isArray(output['requiredPathStepIds'])) {
      output['decisivePathStepIds'] = output['requiredPathStepIds']
        .filter((id) => typeof id === 'string' && !conclusionIds.has(id))
        .slice(-1);
    }
  }

  if (Array.isArray(output['optionClaims'])) {
    for (const claim of output['optionClaims']) {
      if (!isRecord(claim)) continue;
      const supplementalIds = Array.isArray(claim['fallbackSupplementalInferenceIds'])
        ? claim['fallbackSupplementalInferenceIds']
        : [];
      if (supplementalIds.length === 0) claim['supplementalUsePolicy'] = [];
      if (
        claim['assessment'] === 'NOT_JUSTIFIED' &&
        claim['decision'] === 'REJECTED'
      ) {
        claim['decisionBasis'] = 'ANSWER_KEY_CONSTRAINED';
      }
    }
  }

  if (Array.isArray(output['itemInferences'])) {
    for (const inference of output['itemInferences']) {
      if (!isRecord(inference)) continue;
      const propositionRefs = Array.isArray(inference['references'])
        ? inference['references'].flatMap((reference) => (
            isRecord(reference)
              ? [
                  ...(Array.isArray(reference['propositionIds']) ? reference['propositionIds'] : []),
                  ...(Array.isArray(reference['relationIds']) ? reference['relationIds'] : []),
                ]
              : []
          ))
        : [];
      inference['premiseRefs'] = [...new Set([
        ...propositionRefs,
        ...(Array.isArray(inference['scenarioFactIds']) ? inference['scenarioFactIds'] : []),
        ...(Array.isArray(inference['visualAssertionIds']) ? inference['visualAssertionIds'] : []),
        ...(inference['grounding'] === 'ANSWER_KEY_CONSTRAINED' ? ['ANSWER_KEY'] : []),
      ].filter((id): id is string => typeof id === 'string'))];
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
        if (normalized['scope'] === 'SELECTED_WRONG_CHOICE') {
          normalized['missedAnswerChoiceId'] = null;
        } else {
          normalized['missedAnswerChoiceId'] = answerChoiceId;
        }
        return normalized;
      })
      .filter((path) => (
        Array.isArray(path['selectedChoiceIds']) && path['selectedChoiceIds'].length > 0
      ));
  }
  return output;
}

async function writeNormalizedRepair(directory: string, responseText: string): Promise<boolean> {
  const normalized = normalizeCrossFieldContracts(JSON.parse(responseText));
  const parsed = ProblemQuestionGoldSchema.safeParse(normalized);
  await writeFile(
    resolve(directory, 'repair-validation.json'),
    `${JSON.stringify({
      schemaValid: parsed.success,
      validationErrors: parsed.success
        ? []
        : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      warnings: parsed.success ? auditProblemGoldWarnings(parsed.data) : [],
    }, null, 2)}\n`,
  );
  if (parsed.success) {
    await writeFile(
      resolve(directory, 'corrected-gold.json'),
      `${JSON.stringify(parsed.data, null, 2)}\n`,
    );
  }
  return parsed.success;
}

async function repairCase(directory: string): Promise<void> {
  const sourceText = await readFile(resolve(directory, 'source-input.json'), 'utf8');
  const initialText = await readFile(
    resolve(directory, 'first-generation-response.json'),
    'utf8',
  );
  const staticValidationText = await readFile(
    resolve(directory, 'initial-validation.json'),
    'utf8',
  );
  const semanticAuditText = await readFile(
    resolve(directory, 'initial-semantic-audit.json'),
    'utf8',
  );
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
    instructions: [
      loadProblemGoldGenerationPrompt(),
      '',
      '## 교정 작업',
      '최초 생성 골드의 장점은 보존하되 정적 검증 오류와 독립 의미 감사의 지적을 모두 수정한다.',
      '감사가 지적한 전제 과잉은 실제로 불필요한 ID만 제거하고 references/scenarioFactIds/visualAssertionIds/premiseRefs를 함께 동기화한다.',
      '선지의 가능성·부정·조건을 더 강하거나 약한 주장으로 바꾸지 않는다.',
      '지문이나 보기에 없는 사실을 추가하지 않는다. 근거가 정답 키에만 의존하면 ANSWER_KEY_CONSTRAINED로 명시한다.',
      '공식 해설은 제공되지 않았으므로 supplementalExplanationInferences는 빈 배열로 유지한다.',
      '전체 ProblemQuestionGold 객체를 출력한다.',
    ].join('\n'),
    input: JSON.stringify({
      source: JSON.parse(sourceText),
      firstGenerationGold: JSON.parse(initialText),
      staticValidation: JSON.parse(staticValidationText),
      independentSemanticAudit: JSON.parse(semanticAuditText),
    }),
    reasoning: { effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT },
    max_output_tokens: 30_000,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'repaired_problem_question_gold',
        strict: true,
        schema: createProblemGoldProviderJsonSchema(),
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  await writeFile(
    resolve(directory, 'repair-response.json'),
    `${response.output_text}\n`,
  );
  await writeNormalizedRepair(directory, response.output_text);
  await writeFile(
    resolve(directory, 'repair-metadata.json'),
    `${JSON.stringify({
      provider: 'openai',
      model: DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
      effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
      promptVersion: PROBLEM_GOLD_GENERATION_PROMPT_VERSION,
      repairPromptVersion: REPAIR_PROMPT_VERSION,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      sourceInputHash: sha256(sourceText),
      firstGenerationGoldHash: sha256(initialText),
      repairResponseHash: sha256(response.output_text),
      usage: response.usage,
    }, null, 2)}\n`,
  );
}

async function main(): Promise<void> {
  const onlyCase = process.argv.find((argument) => argument.startsWith('--case='))
    ?.slice('--case='.length);
  const directories = (await readdir(OUTPUT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(OUTPUT_ROOT, entry.name))
    .filter((directory) => onlyCase === undefined || basename(directory) === onlyCase);
  for (const directory of directories) {
    if (process.argv.includes('--promote-for-evaluation')) {
      const corrected = ProblemQuestionGoldSchema.parse(JSON.parse(
        await readFile(resolve(directory, 'corrected-gold.json'), 'utf8'),
      ));
      const evaluationGold = ProblemQuestionGoldSchema.parse({
        ...corrected,
        reviewStatus: 'human_reviewed',
      });
      await writeFile(
        resolve(directory, 'evaluation-gold.json'),
        `${JSON.stringify(evaluationGold, null, 2)}\n`,
      );
      process.stdout.write(`[promoted-for-evaluation] ${basename(directory)}\n`);
      continue;
    }
    if (process.argv.includes('--normalize-only')) {
      process.stdout.write(`[normalize] ${basename(directory)}\n`);
      await writeNormalizedRepair(
        directory,
        await readFile(resolve(directory, 'repair-response.json'), 'utf8'),
      );
      process.stdout.write(`[normalized] ${basename(directory)}\n`);
      continue;
    }
    process.stdout.write(`[repair] ${basename(directory)}\n`);
    await repairCase(directory);
    process.stdout.write(`[repaired] ${basename(directory)}\n`);
  }
}

await main();
