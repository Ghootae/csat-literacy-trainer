import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
  DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
} from '../problem-solving/gold-generation-runtime.js';

const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const STUDENT_CASE_PROMPT_VERSION = 'problem-gold-student-case-generation-v1';

const ResponseSchema = z.object({
  accurate: z.object({ choiceId: z.string(), rationale: z.string() }),
  negativeAccurate: z.object({ choiceId: z.string(), rationale: z.string() }),
  representativeWrong: z.object({ choiceId: z.string(), rationale: z.string() }),
  lowInformation: z.object({ choiceId: z.string(), rationale: z.string() }),
});

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function generate(directory: string): Promise<void> {
  const sourceText = await readFile(resolve(directory, 'source-input.json'), 'utf8');
  const goldText = await readFile(resolve(directory, 'corrected-gold.json'), 'utf8');
  const source = JSON.parse(sourceText) as { source: { answerKey: { correctChoice: number } } };
  const gold = JSON.parse(goldText) as { answerChoiceId: string; choices: { choiceId: string }[] };
  const wrongChoiceIds = gold.choices
    .map((choice) => choice.choiceId)
    .filter((choiceId) => choiceId !== gold.answerChoiceId);
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
    instructions: [
      '수능형 비문학 문항의 합성 학생 응답 네 가지를 만든다.',
      'accurate는 정답 선지를 고르고 지문·보기의 결정적 관계를 정확하게 설명한다.',
      'negativeAccurate는 같은 정답을 고르되 “성립하지 않는다/부적절하다/아니다/틀리다” 같은 부정·거부 표현으로 정확한 이유를 설명한다. 학생 자신의 풀이가 틀렸다는 뜻으로 쓰지 않는다.',
      'representativeWrong은 오답 선지 하나를 고르고 실제 학생이 가질 법한 일관된 오개념을 한두 문장으로 설명한다.',
      'lowInformation은 오답 선지를 고르고 구체적 사고 경로를 알 수 없는 짧은 응답을 쓴다.',
      '정답 번호와 선지 ID를 혼동하지 않는다. rationale에는 선택 ID 대신 자연스러운 한국어를 쓴다.',
    ].join('\n'),
    input: JSON.stringify({
      source: JSON.parse(sourceText),
      correctedGold: JSON.parse(goldText),
      constraints: {
        answerChoiceId: `C${source.source.answerKey.correctChoice}`,
        wrongChoiceIds,
      },
    }),
    reasoning: { effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT },
    max_output_tokens: 4_000,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'problem_gold_student_response_cases',
        strict: true,
        schema: z.toJSONSchema(ResponseSchema),
      },
    },
  }, { timeout: 180_000, maxRetries: 0 });
  const cases = ResponseSchema.parse(JSON.parse(response.output_text));
  if (
    cases.accurate.choiceId !== gold.answerChoiceId ||
    cases.negativeAccurate.choiceId !== gold.answerChoiceId ||
    !wrongChoiceIds.includes(cases.representativeWrong.choiceId) ||
    !wrongChoiceIds.includes(cases.lowInformation.choiceId)
  ) {
    throw new Error(`${basename(directory)}: 생성 학생 응답의 선택 ID가 제약과 다르다.`);
  }
  await writeFile(
    resolve(directory, 'student-response-cases.json'),
    `${JSON.stringify(cases, null, 2)}\n`,
  );
  await writeFile(
    resolve(directory, 'student-response-cases-metadata.json'),
    `${JSON.stringify({
      provider: 'openai',
      model: DEFAULT_PROBLEM_GOLD_GENERATION_MODEL,
      effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
      promptVersion: STUDENT_CASE_PROMPT_VERSION,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      sourceInputHash: sha256(sourceText),
      correctedGoldHash: sha256(goldText),
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
    process.stdout.write(`[student-cases] ${basename(directory)}\n`);
    await generate(directory);
    process.stdout.write(`[student-cases-saved] ${basename(directory)}\n`);
  }
}

await main();
