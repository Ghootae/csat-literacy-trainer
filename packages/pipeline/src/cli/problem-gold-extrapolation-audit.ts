import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const AUDIT_MODEL = 'gpt-5.6-terra';
const AUDIT_EFFORT = 'medium' as const;
const AUDIT_PROMPT_VERSION = 'problem-gold-extrapolation-audit-v1';

const AuditSchema = z.object({
  officialAnswerMatches: z.boolean(),
  generatedAnswerChoiceId: z.string(),
  expectedAnswerChoiceId: z.string(),
  passagePropositionAudit: z.object({
    reverseImportDetected: z.boolean(),
    suspectPropositionIds: z.array(z.string()),
    reason: z.string(),
  }),
  itemInferenceAudits: z.array(z.object({
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
    reverseImportDetected: z.boolean(),
    unnecessaryPremiseRefs: z.array(z.string()),
    missingPremiseDescriptions: z.array(z.string()),
    reason: z.string(),
  })),
  overallNeedsHumanCorrection: z.boolean(),
  correctionReasons: z.array(z.string()),
});

function providerSchema(): Record<string, unknown> {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (typeof value !== 'object' || value === null) return value;
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
      key === 'format' ? [] : [[key, normalize(child)]]
    )));
  };
  return normalize(z.toJSONSchema(AuditSchema)) as Record<string, unknown>;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function auditCase(directory: string): Promise<void> {
  const corrected = process.argv.includes('--corrected');
  const sourceText = await readFile(resolve(directory, 'source-input.json'), 'utf8');
  const goldText = await readFile(
    resolve(directory, corrected ? 'corrected-gold.json' : 'first-generation-response.json'),
    'utf8',
  );
  const source = JSON.parse(sourceText) as {
    source: { answerKey: { correctChoice: number } };
  };
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: AUDIT_MODEL,
    instructions: [
      '당신은 수능형 문제 골드의 독립 감사자다.',
      '지문·보기·그림 설명·선지·정답 키와 최초 생성 골드를 비교한다.',
      'conclusionDirectional은 추론 결과가 대상 주장을 지지하거나 반박하는 방향으로 단독 완결되어야 PASS다.',
      'effectConsistency는 conclusion의 실제 의미가 targetClaimEffect 및 대상 option claim의 실제 의미와 맞아야 PASS다.',
      'SUPPORTS는 승인 근거로 대상 주장을, CONTRADICTS는 대상 주장의 부정을 도출할 수 있다는 뜻이다.',
      'DOES_NOT_JUSTIFY는 주장과 부정 모두 도출되지 않지만 선지가 요구하는 주장에는 근거가 부족하다는 독립적인 비함의 관계다. 약한 모순으로 사용하지 않는다.',
      'expectedTargetClaimEffect에는 실제 의미상 맞는 효과를 기록하고 결정할 수 없을 때만 UNRESOLVED를 사용한다.',
      'premiseSufficiency는 premiseRefs의 실제 내용만으로 결론이 성립하는지 본다.',
      'premiseMinimality는 각 전제를 하나씩 제거했을 때 결론이 유지되는지 보고, 불필요 참조가 있으면 WARNING 또는 FAIL로 판정한다.',
      '지문에 없고 안전하게 복원되지 않는 문항 풀이 관계나 외부 지식을 passage proposition으로 등록했으면 reverse import다.',
      '공식 해설 문장은 입력에 없으므로 상상하지 말고, 지문·보기 자체의 근거만 감사한다.',
      'ID와 라벨이 아니라 한국어 문장의 실제 의미를 판정한다.',
    ].join('\n'),
    input: JSON.stringify({
      expectedAnswerChoiceId: `C${source.source.answerKey.correctChoice}`,
      source: JSON.parse(sourceText),
      firstGenerationGold: JSON.parse(goldText),
    }),
    reasoning: { effort: AUDIT_EFFORT },
    max_output_tokens: 12_000,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'problem_gold_extrapolation_audit',
        strict: true,
        schema: providerSchema(),
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  const audit = AuditSchema.parse(JSON.parse(response.output_text));
  await writeFile(
    resolve(directory, corrected ? 'corrected-semantic-audit.json' : 'initial-semantic-audit.json'),
    `${JSON.stringify(audit, null, 2)}\n`,
  );
  await writeFile(
    resolve(
      directory,
      corrected
        ? 'corrected-semantic-audit-metadata.json'
        : 'initial-semantic-audit-metadata.json',
    ),
    `${JSON.stringify({
      provider: 'openai',
      model: AUDIT_MODEL,
      effort: AUDIT_EFFORT,
      promptVersion: AUDIT_PROMPT_VERSION,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      sourceInputHash: sha256(sourceText),
      firstGenerationGoldHash: sha256(goldText),
      usage: response.usage,
    }, null, 2)}\n`,
  );
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const onlyCase = process.argv.find((argument) => argument.startsWith('--case='))
    ?.slice('--case='.length);
  const entries = (await readdir(OUTPUT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(OUTPUT_ROOT, entry.name))
    .filter((directory) => onlyCase === undefined || basename(directory) === onlyCase);
  for (const directory of entries) {
    process.stdout.write(`[audit] ${basename(directory)}\n`);
    await auditCase(directory);
    process.stdout.write(`[audited] ${basename(directory)}\n`);
  }
}

await main();
