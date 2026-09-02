import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  PROSPECTIVE_GOLD_SAMPLE_VERSION,
  ProspectiveGoldSampleManifestSchema,
  type ProspectiveCoverage,
  type ProspectiveGoldSampleManifest,
  type ProspectiveQuestionDomain,
} from '../problem-solving/prospective-gold-experiment.js';

const DEFAULT_SOURCE_ROOT = '/Users/mac/Projects/csat-literacy-trainer/data';
const DEFAULT_OUTPUT = resolve(
  'packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json',
);
const DEFAULT_SAMPLE_SIZE = 24;
const DEFAULT_SELECTION_SEED = 'prospective-gold-sample-2026-09-03-v1';

const EXCLUDED_QUESTION_KEYS = [
  // 기존 운영 6문항
  '69bbf88d8937cf14551903ca:q13',
  '69c28579d58cf540a9bc25eb:q13',
  '69c011fd78128b2a9beddd5e:q12',
  '6a213e9386fd308968e100b3:q13',
  '69c08f1d78128b2a9bedf236:q19',
  '6a213ea086fd308968e101df:q16',
  // 2026-09-01 외삽 실험 8문항
  '69bbef9a8937cf145518cb13:q8',
  '69bff91378128b2a9bedcdc8:q17',
  '69bbefa4a029f488d9e4e809:q12',
  '69bbf8ec8937cf14551905a1:q15',
  '69bc036a8937cf145519091f:q13',
  '69bffdf378128b2a9bedd0cd:q8',
  '69bc9e5c76ad66e59a724b37:q12',
  '69bffc0178128b2a9bedcfe6:q16',
] as const;

const QuestionSchema = z.object({
  question_number: z.number().int().positive(),
  title: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  stem: z.string(),
  supplements: z.array(z.object({
    label: z.string().default(''),
    text: z.string().default(''),
    elements: z.array(z.record(z.string(), z.unknown())).default([]),
    image_urls: z.array(z.string()).default([]),
  })).default([]),
  choices: z.array(z.object({
    choice_number: z.number().int().positive(),
    text: z.string(),
  })),
  image_urls: z.array(z.string()).default([]),
});

const ResultSchema = z.object({
  product_id: z.string(),
  exam: z.string(),
  title: z.string(),
  passage: z.string(),
  passage_tags: z.array(z.string()).default([]),
  image_urls: z.array(z.string()).default([]),
  questions: z.array(QuestionSchema),
});

const EnrichmentSchema = z.object({
  product_id: z.string(),
  questions: z.array(z.object({
    question_number: z.number().int().positive(),
    correct_choice: z.number().int().positive(),
    correct_choice_text: z.string(),
  })),
});

interface Candidate {
  readonly caseId: string;
  readonly productId: string;
  readonly questionNumber: number;
  readonly exam: string;
  readonly title: string;
  readonly domain: ProspectiveQuestionDomain;
  readonly coverage: readonly ProspectiveCoverage[];
  readonly sourceHash: string;
  readonly resultFile: string;
  readonly enrichmentFile: string;
  readonly stableRank: number;
}

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function stableRank(seed: string, key: string): number {
  return Number.parseInt(createHash('sha256').update(`${seed}:${key}`).digest('hex').slice(0, 12), 16);
}

const SCIENCE_TAG = /과학|물리|화학|생물|의학|공학|기술|수학|기상|천문|컴퓨터|정보/;
const SOCIAL_TAG = /법학|법률|법제|민법|형법|헌법|행정법|계약|소송|경제|사회|정치|행정학|경영|금융|회계|심리학|언론/;
const HUMANITIES_TAG = /인문|철학|윤리|미학|예술|역사|언어|논리|종교|문학/;
const NEGATIVE_STEM = /적절하지\s*않|옳지\s*않|타당하지\s*않|잘못된|일치하지\s*않|알맞지\s*않/;
const CALCULATION = /계산|산출|수치|비율|확률|금액|평균|총합|분담|농도|몰\b|퍼센트|%|배율/;
const MULTI_CONDITION = /복수|두 조건|각각|모두|ㄱ|ㄴ|㉠|㉡|\(가\).+\(나\)|조건|경우/;
const VOCABULARY = /어휘|단어.*의미|문맥상.*바꿔/;

function classifyDomain(tags: readonly string[], title: string): ProspectiveQuestionDomain | null {
  const text = [...tags, title].join(' ');
  // `사회과학`이 `과학`에도 일치하므로 사회·법·경제 분류를 먼저 적용한다.
  if (SOCIAL_TAG.test(text)) return 'SOCIAL';
  if (SCIENCE_TAG.test(text)) return 'SCIENCE';
  if (HUMANITIES_TAG.test(text)) return 'HUMANITIES';
  return null;
}

function classifyCoverage(options: {
  readonly result: z.infer<typeof ResultSchema>;
  readonly question: z.infer<typeof QuestionSchema>;
  readonly domain: ProspectiveQuestionDomain;
}): ProspectiveCoverage[] {
  const { result, question, domain } = options;
  const questionText = [question.title ?? '', ...question.tags, question.stem,
    ...question.choices.map((choice) => choice.text)].join(' ');
  const scenarioText = question.supplements.map((supplement) =>
    `${supplement.label} ${supplement.text}`).join(' ');
  const visual = result.image_urls.length > 0 || question.image_urls.length > 0 ||
    question.supplements.some((supplement) =>
      supplement.image_urls.length > 0 ||
      supplement.elements.some((element) => element['kind'] === 'image'));
  const scenario = question.supplements.length > 0 || /<보기>|보기/.test(question.stem);
  const coverage: ProspectiveCoverage[] = [
    NEGATIVE_STEM.test(question.stem) ? 'NEGATIVE_STEM' : 'POSITIVE_STEM',
    domain,
  ];
  if (scenario) coverage.push('SCENARIO_APPLICATION');
  if (CALCULATION.test(questionText) || question.choices.some((choice) => /\d/.test(choice.text))) {
    coverage.push('CALCULATION');
  }
  if (visual) coverage.push('VISUAL');
  if (MULTI_CONDITION.test(`${questionText} ${scenarioText}`) || question.supplements.length > 1) {
    coverage.push('MULTI_CONDITION');
  }
  return coverage;
}

async function loadCandidates(sourceRoot: string, seed: string): Promise<Candidate[]> {
  const excluded = new Set<string>(EXCLUDED_QUESTION_KEYS);
  const files = (await readdir(sourceRoot))
    .filter((file) => file.endsWith('_result.json') && file !== 'result.json')
    .sort();
  const candidates: Candidate[] = [];
  for (const file of files) {
    const resultFile = resolve(sourceRoot, file);
    const resultText = await readFile(resultFile, 'utf8');
    const parsed = ResultSchema.safeParse(JSON.parse(resultText));
    if (!parsed.success) continue;
    const result = parsed.data;
    const enrichmentFile = resolve(sourceRoot, 'enrichment/records', `${result.product_id}.json`);
    let enrichmentText: string;
    try {
      enrichmentText = await readFile(enrichmentFile, 'utf8');
    } catch {
      continue;
    }
    const enrichmentParsed = EnrichmentSchema.safeParse(JSON.parse(enrichmentText));
    if (!enrichmentParsed.success) continue;
    const domain = classifyDomain(result.passage_tags, result.title);
    if (domain === null) continue;
    for (const question of result.questions) {
      const key = `${result.product_id}:q${question.question_number}`;
      if (excluded.has(key) || question.choices.length !== 5) continue;
      if (VOCABULARY.test([question.title ?? '', ...question.tags, question.stem].join(' '))) continue;
      const answer = enrichmentParsed.data.questions.find((candidate) =>
        candidate.question_number === question.question_number);
      if (answer === undefined || answer.correct_choice < 1 || answer.correct_choice > 5) continue;
      const coverage = classifyCoverage({ result, question, domain });
      candidates.push({
        caseId: `prospective-${result.product_id}-q${question.question_number}`,
        productId: result.product_id,
        questionNumber: question.question_number,
        exam: result.exam,
        title: `${result.title} ${question.question_number}번`,
        domain,
        coverage,
        sourceHash: sha256(`${resultText}\n${enrichmentText}\nquestion=${question.question_number}`),
        resultFile,
        enrichmentFile,
        stableRank: stableRank(seed, key),
      });
    }
  }
  return candidates;
}

const COVERAGE_TARGETS: Record<ProspectiveCoverage, number> = {
  POSITIVE_STEM: 12,
  NEGATIVE_STEM: 12,
  HUMANITIES: 8,
  SOCIAL: 8,
  SCIENCE: 8,
  SCENARIO_APPLICATION: 8,
  CALCULATION: 4,
  VISUAL: 4,
  MULTI_CONDITION: 8,
};

function selectCandidates(candidates: readonly Candidate[], sampleSize: number): Candidate[] {
  if (sampleSize !== 24) {
    throw new Error('v1 층화 표본은 분야×발문 6개 셀에서 각 4문항을 뽑으므로 size=24만 허용한다.');
  }
  const selected: Candidate[] = [];
  const usedProducts = new Set<string>();
  const counts = Object.fromEntries(Object.keys(COVERAGE_TARGETS).map((key) => [key, 0])) as
    Record<ProspectiveCoverage, number>;
  const cells = [
    ['SCIENCE', 'NEGATIVE_STEM'], ['SCIENCE', 'POSITIVE_STEM'],
    ['SOCIAL', 'NEGATIVE_STEM'], ['SOCIAL', 'POSITIVE_STEM'],
    ['HUMANITIES', 'NEGATIVE_STEM'], ['HUMANITIES', 'POSITIVE_STEM'],
  ] as const;
  for (const [domain, polarity] of cells) {
    for (let index = 0; index < 4; index += 1) {
      const pool = candidates.filter((candidate) =>
        candidate.domain === domain &&
        candidate.coverage.includes(polarity) &&
        !usedProducts.has(candidate.productId));
      const ranked = [...pool].sort((left, right) => {
        const score = (candidate: Candidate): number => candidate.coverage.reduce((sum, coverage) => {
          const deficit = Math.max(0, COVERAGE_TARGETS[coverage] - counts[coverage]);
          const weight = coverage === 'VISUAL'
            ? 1_000
            : coverage === 'CALCULATION'
              ? 800
              : coverage === 'SCENARIO_APPLICATION'
                ? 300
                : coverage === 'MULTI_CONDITION'
                  ? 250
                  : 10;
          return sum + deficit * weight;
        }, 0);
        return score(right) - score(left) || left.stableRank - right.stableRank;
      });
      const choice = ranked[0];
      if (choice === undefined) throw new Error(`${domain}/${polarity} 표본 후보가 부족하다.`);
      selected.push(choice);
      usedProducts.add(choice.productId);
      for (const coverage of choice.coverage) counts[coverage] += 1;
    }
  }
  return selected;
}

async function main(): Promise<void> {
  const sourceRoot = resolve(option('--source-root') ?? DEFAULT_SOURCE_ROOT);
  const output = resolve(option('--output') ?? DEFAULT_OUTPUT);
  const seed = option('--seed') ?? DEFAULT_SELECTION_SEED;
  const sampleSize = Number(option('--size') ?? DEFAULT_SAMPLE_SIZE);
  const createdAt = option('--created-at') ?? new Date().toISOString();
  const candidates = await loadCandidates(sourceRoot, seed);
  const selected = selectCandidates(candidates, sampleSize);
  const manifest: ProspectiveGoldSampleManifest = ProspectiveGoldSampleManifestSchema.parse({
    manifestVersion: PROSPECTIVE_GOLD_SAMPLE_VERSION,
    createdAt,
    sourceRoot,
    selectionSeed: seed,
    selectionPolicy: {
      minimumSize: 20,
      maximumSize: 30,
      maximumQuestionsPerProduct: 1,
      excludedQuestionKeys: [...EXCLUDED_QUESTION_KEYS],
      minimumCoverageCounts: COVERAGE_TARGETS,
      requiredTargetClaimEffects: ['CONTRADICTS', 'DOES_NOT_JUSTIFY'],
    },
    items: selected.map(({ stableRank: _stableRank, ...item }) => item),
  });
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
  const coverageCounts = Object.fromEntries(Object.keys(COVERAGE_TARGETS).map((coverage) => [
    coverage,
    manifest.items.filter((item) => item.coverage.includes(coverage as ProspectiveCoverage)).length,
  ]));
  process.stdout.write(`${JSON.stringify({
    output,
    availableCandidateCount: candidates.length,
    selectedCount: manifest.items.length,
    coverageCounts,
  }, null, 2)}\n`);
}

await main();
