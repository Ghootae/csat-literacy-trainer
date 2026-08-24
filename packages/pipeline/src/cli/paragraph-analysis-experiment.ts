import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  analyzeParagraphWithOpenAI,
  loadParagraphAnalysisPrompt,
  type ParagraphAnalysisEffort,
  type ParagraphAnalysisInput,
} from '../paragraph-analysis/evaluator.js';
import {
  PARAGRAPH_ANALYSIS_PROMPT_VERSION,
  PARAGRAPH_ANALYSIS_SCHEMA_VERSION,
} from '../paragraph-analysis/schema.js';

interface SourceParagraph {
  readonly paragraphId: string;
  readonly text: string;
  readonly sentences: readonly { readonly id: string; readonly text: string }[];
}

const LEGACY_ROOT = '/Users/mac/Projects/csat-literacy-trainer';
const OUTPUT_ROOT = resolve(
  process.cwd(),
  '.omc/adhoc/paragraph-analysis-openai-comparison-2026-08-21',
);

const CASES = [
  {
    paragraphId: 'corporate-law-p1',
    passagePath: `${LEGACY_ROOT}/content/corporate-law-p1/passage.json`,
    references: [
      `${LEGACY_ROOT}/content/corporate-law-p1/gold.json`,
      `${LEGACY_ROOT}/content/corporate-law-p1/queries.json`,
      `${LEGACY_ROOT}/content/corporate-law-p1/title-queries.json`,
      `${LEGACY_ROOT}/packages/pipeline/fixtures/regression/corporate-law-p1.json`,
    ],
  },
  {
    paragraphId: 'science-p5',
    passagePath: `${LEGACY_ROOT}/content/science-p5/passage.json`,
    references: [
      `${LEGACY_ROOT}/packages/pipeline/fixtures/query-oracles/science-p5-hand.json`,
      `${LEGACY_ROOT}/.omc/agreement/69bffacbfa5063deffe19cc6_s1_p5.gold-1.json`,
    ],
  },
  {
    paragraphId: 'humanities-p4',
    passagePath: `${LEGACY_ROOT}/content/humanities-p4/passage.json`,
    references: [
      `${LEGACY_ROOT}/packages/pipeline/fixtures/query-oracles/humanities-p4-hand.json`,
      `${LEGACY_ROOT}/.omc/agreement/69c011fd78128b2a9beddd5e_s1_p4.gold-1.json`,
    ],
  },
] as const;

const CONFIGS: readonly {
  readonly key: string;
  readonly model: string;
  readonly effort: ParagraphAnalysisEffort;
}[] = [
  { key: 'sol-medium', model: 'gpt-5.6-sol', effort: 'medium' },
  { key: 'terra-high', model: 'gpt-5.6-terra', effort: 'high' },
  { key: 'terra-medium', model: 'gpt-5.6-terra', effort: 'medium' },
];

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function saveJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  if (process.env['OPENAI_API_KEY'] === undefined) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const promptHash = hash(loadParagraphAnalysisPrompt());
  const completed: unknown[] = [];

  for (const testCase of CASES) {
    const source = readJson<SourceParagraph>(testCase.passagePath);
    if (source.paragraphId !== testCase.paragraphId) {
      throw new Error(`${testCase.passagePath}: paragraphId 불일치`);
    }
    const input: ParagraphAnalysisInput = {
      paragraphId: source.paragraphId,
      paragraphText: source.text,
      sentences: source.sentences,
      passageParagraphs: [{ paragraphId: source.paragraphId, text: source.text }],
      fullPassageAvailable: false,
    };

    for (const config of CONFIGS) {
      const outputPath = resolve(OUTPUT_ROOT, `${testCase.paragraphId}--${config.key}.json`);
      if (existsSync(outputPath)) {
        console.log(`건너뜀 ${testCase.paragraphId} ${config.key}: 결과 존재`);
        completed.push(readJson<unknown>(outputPath));
        continue;
      }

      console.log(`호출 시작 ${testCase.paragraphId} ${config.model}/${config.effort}`);
      const calledAt = new Date().toISOString();
      const call = await analyzeParagraphWithOpenAI(input, config);
      const artifact = {
        experimentId: 'paragraph-analysis-openai-model-comparison-2026-08-21',
        calledAt,
        source: {
          passagePath: testCase.passagePath,
          referencePathsExcludedFromPrompt: testCase.references,
          inputHash: hash(JSON.stringify(input)),
          fullPassageAvailable: false,
        },
        promptHash,
        ...call.metadata,
        result: call.result,
      };
      saveJson(outputPath, artifact);
      completed.push(artifact);
      console.log(
        `완료 ${testCase.paragraphId} ${config.key}: ` +
        `${call.metadata.durationMs}ms, in=${call.metadata.usage.inputTokens}, ` +
        `out=${call.metadata.usage.outputTokens}`,
      );
    }
  }

  saveJson(resolve(OUTPUT_ROOT, 'manifest.json'), {
    experimentId: 'paragraph-analysis-openai-model-comparison-2026-08-21',
    generatedAt: new Date().toISOString(),
    provider: 'openai',
    promptVersion: PARAGRAPH_ANALYSIS_PROMPT_VERSION,
    schemaVersion: PARAGRAPH_ANALYSIS_SCHEMA_VERSION,
    promptHash,
    callCount: completed.length,
    configurations: CONFIGS,
    paragraphs: CASES.map((item) => item.paragraphId),
    artifacts: CASES.flatMap((testCase) =>
      CONFIGS.map((config) => `${testCase.paragraphId}--${config.key}.json`),
    ),
  });
  console.log(`결과 위치 ${OUTPUT_ROOT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
