import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

const MODEL = process.env['PROBLEM_GOLD_CANARY_MODEL'] ?? 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const TIMEOUT_MS = 600_000;
const PROTOCOL = {
  name: 'Selective Evidence Verification Protocol',
  shortName: 'SEVP',
  version: 'v01.01',
} as const;
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-selective-visual-canary-2026-09-04',
);
const APPROVED_PARAGRAPH_MANIFEST = resolve(
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/canary-approved-manifest-v1.json',
);
const ENRICHMENT_ROOT = resolve(
  '/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records',
);

const CASES = [
  {
    caseId: 'lens-q11',
    sourceId: '69fd388386fd308968e0b9f4',
    sourceInputPath: resolve(
      'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts/' +
      'prospective-69fd388386fd308968e0b9f4-q11/source-input.json',
    ),
    expectedImageDecision: 'IMAGE_REQUIRED',
    expectedRelevantMediaIds: ['MEDIA1'],
    expectedAnswer: 3,
  },
  {
    caseId: 'reference-price-q15',
    sourceId: '69c09163fa5063deffe1c180',
    sourceInputPath: resolve(
      'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts/' +
      'prospective-69c09163fa5063deffe1c180-q15/source-input.json',
    ),
    expectedImageDecision: 'IMAGE_NOT_REQUIRED',
    expectedRelevantMediaIds: [],
    expectedAnswer: 4,
  },
  {
    caseId: 'seismic-design-q32',
    sourceId: '69c0961c78128b2a9bee0717',
    sourceInputPath: resolve(
      'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts/' +
      'prospective-69c0961c78128b2a9bee0717-q32/source-input.json',
    ),
    expectedImageDecision: 'IMAGE_REQUIRED',
    expectedRelevantMediaIds: ['MEDIA2'],
    expectedAnswer: 5,
  },
] as const;

type JsonRecord = Record<string, unknown>;

interface ApiMetadata {
  readonly provider: 'openai';
  readonly model: string;
  readonly effort: typeof EFFORT;
  readonly serviceTier: 'default';
  readonly stage: string;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly responseId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly usage: unknown;
}

const EvidenceSchema = z.object({
  sourceArea: z.enum(['PASSAGE', 'SCENARIO', 'CHOICE', 'PARAGRAPH_PROPOSITION', 'VISUAL']),
  locator: z.string().min(1),
  quote: z.string().min(1),
});

const ImageRoutingCaseSchema = z.object({
  caseId: z.string().min(1),
  decision: z.enum(['IMAGE_REQUIRED', 'IMAGE_NOT_REQUIRED', 'UNCERTAIN']),
  relevantMediaIds: z.array(z.string().min(1)),
  requiredVisualFacts: z.array(z.string().min(1)),
  rationale: z.string().min(1),
});

const ImageRoutingOutputSchema = z.object({
  cases: z.array(ImageRoutingCaseSchema).length(CASES.length),
});

type ImageRoutingCase = z.infer<typeof ImageRoutingCaseSchema>;

const VisualExtractionSchema = z.object({
  caseId: z.string().min(1),
  mediaIds: z.array(z.string().min(1)).min(1),
  assertions: z.array(z.object({
    assertionId: z.string().regex(/^VA[1-9][0-9]*$/),
    mediaId: z.string().min(1),
    kind: z.enum(['LABEL', 'POSITION', 'DIRECTION', 'DISTANCE', 'RATIO', 'ORDER', 'SHAPE', 'OTHER']),
    statement: z.string().min(1),
    visualEvidence: z.string().min(1),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })),
  unresolvedQuestions: z.array(z.string().min(1)),
  overallConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sufficientForSolving: z.boolean(),
  summary: z.string().min(1),
});

type VisualExtraction = z.infer<typeof VisualExtractionSchema>;

const SolutionSchema = z.object({
  caseId: z.string().min(1),
  imageDecision: z.enum(['IMAGE_REQUIRED', 'IMAGE_NOT_REQUIRED', 'UNCERTAIN']),
  usedVisualAssertionIds: z.array(z.string().min(1)),
  optionAnalyses: z.array(z.object({
    choiceNumber: z.number().int().min(1).max(5),
    choiceText: z.string().min(1),
    atomicClaims: z.array(z.object({
      claimId: z.string().regex(/^C[1-5]-A[1-9][0-9]*$/),
      statement: z.string().min(1),
      verdict: z.enum(['SUPPORTED', 'CONTRADICTED', 'NOT_JUSTIFIED']),
      evidence: z.array(EvidenceSchema).min(1),
      reasoning: z.string().min(1),
    })).min(1),
    overallVerdict: z.enum(['TRUE', 'FALSE', 'UNRESOLVED']),
    rationale: z.string().min(1),
  })).length(5),
  selectedAnswer: z.object({
    choiceNumber: z.number().int().min(1).max(5),
    stemPolarity: z.enum(['SELECT_TRUE', 'SELECT_FALSE']),
    reasoning: z.string().min(1),
  }),
  unresolvedQuestions: z.array(z.string().min(1)),
  summary: z.string().min(1),
});

type Solution = z.infer<typeof SolutionSchema>;

const AuditSchema = z.object({
  caseId: z.string().min(1),
  verdict: z.enum(['PASS', 'REPAIR_REQUIRED', 'HUMAN_REVIEW']),
  checks: z.object({
    imageRouting: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    visualGrounding: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    atomicCoverage: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    effectClassification: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    answerDerivation: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    explanationBoundary: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
  }),
  issues: z.array(z.object({
    issueId: z.string().regex(/^ISSUE-[1-9][0-9]*$/),
    severity: z.enum(['BLOCKER', 'MAJOR', 'MINOR']),
    category: z.enum([
      'IMAGE_ROUTING',
      'VISUAL_FACT',
      'ATOMIC_DECOMPOSITION',
      'EFFECT_CLASSIFICATION',
      'SOURCE_GROUNDING',
      'ANSWER_DERIVATION',
      'EXPLANATION_LEAKAGE',
      'OTHER',
    ]),
    location: z.string().min(1),
    description: z.string().min(1),
    sourceEvidence: z.array(EvidenceSchema),
    repairInstruction: z.string().min(1),
  })),
  explanationClaims: z.array(z.object({
    claim: z.string().min(1),
    classification: z.enum(['SOURCE_GROUNDED', 'EXPLANATION_ONLY', 'EXTERNAL_OR_UNRESOLVED']),
    disposition: z.enum(['USE_FOR_REPAIR', 'EXCLUDE', 'HUMAN_REVIEW']),
    reason: z.string().min(1),
  })),
  summary: z.string().min(1),
});

type Audit = z.infer<typeof AuditSchema>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function providerSchema(schema: z.ZodType): Record<string, unknown> {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!isRecord(value)) return value;
    const normalized = Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => (
        key === 'format' ? [] : [[key, normalize(child)]]
      )),
    );
    if (normalized['type'] === 'object' && isRecord(normalized['properties'])) {
      const properties = normalized['properties'];
      normalized['required'] = Object.keys(properties);
      normalized['additionalProperties'] = false;
    }
    return normalized;
  };
  return normalize(z.toJSONSchema(schema)) as Record<string, unknown>;
}

async function callStructured<T>(options: {
  readonly stage: string;
  readonly instructions: string;
  readonly input: unknown;
  readonly schema: z.ZodType<T>;
  readonly schemaName: string;
  readonly maxOutputTokens: number;
  readonly imageUrls?: readonly string[];
}): Promise<{ value: T; raw: string; metadata: ApiMetadata }> {
  const client = new OpenAI({ maxRetries: 0, timeout: TIMEOUT_MS });
  const inputText = JSON.stringify(options.input);
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: MODEL,
    service_tier: 'default',
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
    reasoning: { effort: EFFORT },
    max_output_tokens: options.maxOutputTokens,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: options.schemaName,
        strict: true,
        schema: providerSchema(options.schema),
      },
    },
  }, { timeout: TIMEOUT_MS, maxRetries: 0 });
  if (response.status !== 'completed') {
    throw new Error(`${options.stage}: response status=${response.status}`);
  }
  const raw = response.output_text;
  const value = options.schema.parse(JSON.parse(raw));
  return {
    value,
    raw,
    metadata: {
      provider: 'openai',
      model: MODEL,
      effort: EFFORT,
      serviceTier: 'default',
      stage: options.stage,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      inputHash: sha256(inputText),
      outputHash: sha256(raw),
      usage: response.usage,
    },
  };
}

async function loadOrCall<T>(options: {
  readonly directory: string;
  readonly basename: string;
  readonly execute: boolean;
  readonly stage: string;
  readonly instructions: string;
  readonly input: unknown;
  readonly schema: z.ZodType<T>;
  readonly schemaName: string;
  readonly maxOutputTokens: number;
  readonly imageUrls?: readonly string[];
}): Promise<T> {
  const valuePath = resolve(options.directory, `${options.basename}.json`);
  if (await exists(valuePath)) {
    console.log(`[reuse] ${options.stage}`);
    return options.schema.parse(await readJson(valuePath));
  }
  if (!options.execute) throw new Error(`${options.stage}: --execute 없이 새 API 호출을 할 수 없다.`);
  console.log(`[call] ${options.stage}`);
  const result = await callStructured(options);
  await writeJson(valuePath, result.value);
  await writeFile(resolve(options.directory, `${options.basename}-response.txt`), result.raw);
  await writeJson(resolve(options.directory, `${options.basename}-metadata.json`), result.metadata);
  console.log(`[done] ${options.stage} (${result.metadata.durationMs}ms)`);
  return result.value;
}

function sourceWithoutAnswer(sourceInput: unknown): JsonRecord {
  if (!isRecord(sourceInput) || !isRecord(sourceInput['source'])) {
    throw new Error('source-input.json의 source가 유효하지 않다.');
  }
  const source = sourceInput['source'];
  return {
    sourceId: source['sourceId'],
    exam: source['exam'],
    title: source['title'],
    questionNumber: source['questionNumber'],
    passage: source['passage'],
    question: source['question'],
    mediaManifest: Array.isArray(source['media'])
      ? source['media'].map((media) => {
          if (!isRecord(media)) return media;
          return {
            mediaId: media['mediaId'],
            mimeType: media['mimeType'],
            width: media['width'],
            height: media['height'],
            placement: media['placement'],
          };
        })
      : [],
  };
}

function answerKey(sourceInput: unknown): unknown {
  if (!isRecord(sourceInput) || !isRecord(sourceInput['source'])) return null;
  return sourceInput['source']['answerKey'];
}

function mediaRecords(sourceInput: unknown): JsonRecord[] {
  if (!isRecord(sourceInput) || !isRecord(sourceInput['source'])) return [];
  const media = sourceInput['source']['media'];
  return Array.isArray(media) ? media.filter(isRecord) : [];
}

async function loadParagraphBundles(sourceId: string): Promise<unknown[]> {
  const manifest = await readJson(APPROVED_PARAGRAPH_MANIFEST);
  if (!isRecord(manifest) || !Array.isArray(manifest['paragraphs'])) {
    throw new Error('승인 문단 manifest가 유효하지 않다.');
  }
  const entries = manifest['paragraphs'].filter((entry) =>
    isRecord(entry) && entry['sourceId'] === sourceId && entry['productionEligible'] === true,
  );
  const bundles: unknown[] = [];
  for (const entry of entries) {
    if (!isRecord(entry) || !isRecord(entry['approvedPropositionBundle'])) continue;
    const path = entry['approvedPropositionBundle']['path'];
    if (typeof path !== 'string') continue;
    const bundle = await readJson(resolve(path));
    if (!isRecord(bundle)) continue;
    const paragraphId = String(bundle['paragraphId']);
    const propositions = Array.isArray(bundle['propositions'])
      ? bundle['propositions'].map((proposition) => {
          if (!isRecord(proposition)) return proposition;
          return {
            ref: `${paragraphId}#${String(proposition['id'])}`,
            description: proposition['description'],
            evidence: proposition['evidence'],
          };
        })
      : [];
    const propositionEdges = Array.isArray(bundle['propositionEdges'])
      ? bundle['propositionEdges'].map((edge) => {
          if (!isRecord(edge)) return edge;
          return {
            ref: `${paragraphId}#${String(edge['id'])}`,
            fromRefs: Array.isArray(edge['fromPropositionIds'])
              ? edge['fromPropositionIds'].map((id) => `${paragraphId}#${String(id)}`)
              : [],
            toRefs: Array.isArray(edge['toPropositionIds'])
              ? edge['toPropositionIds'].map((id) => `${paragraphId}#${String(id)}`)
              : [],
            type: edge['type'],
            direction: edge['direction'],
            description: edge['description'],
          };
        })
      : [];
    bundles.push({ paragraphId, propositions, propositionEdges });
  }
  if (bundles.length === 0) throw new Error(`${sourceId}: 승인 명제 Bundle을 찾지 못했다.`);
  return bundles;
}

async function loadOfficialExplanation(sourceId: string, questionNumber: number): Promise<unknown> {
  const enrichment = await readJson(resolve(ENRICHMENT_ROOT, `${sourceId}.json`));
  if (!isRecord(enrichment)) {
    throw new Error(`${sourceId}: 상세 해설 레코드가 유효하지 않다.`);
  }
  const questions = enrichment['questions'];
  if (!Array.isArray(questions)) throw new Error(`${sourceId}: 상세 해설 문항 배열이 없다.`);
  const question = questions.find((candidate) =>
    isRecord(candidate) && candidate['question_number'] === questionNumber,
  );
  if (!isRecord(question) || !isRecord(question['official_explanation'])) {
    throw new Error(`${sourceId}-q${questionNumber}: 상세 해설을 찾지 못했다.`);
  }
  return question['official_explanation'];
}

function validateRouting(
  routing: z.infer<typeof ImageRoutingOutputSchema>,
  sources: ReadonlyMap<string, unknown>,
): void {
  const expectedCaseIds = CASES.map((item) => item.caseId).sort();
  const actualCaseIds = routing.cases.map((item) => item.caseId).sort();
  if (JSON.stringify(expectedCaseIds) !== JSON.stringify(actualCaseIds)) {
    throw new Error('이미지 라우팅 결과의 caseId 집합이 입력과 다르다.');
  }
  for (const route of routing.cases) {
    const sourceInput = sources.get(route.caseId);
    const validMediaIds = new Set(
      mediaRecords(sourceInput).map((media) => String(media['mediaId'])),
    );
    if (route.relevantMediaIds.some((mediaId) => !validMediaIds.has(mediaId))) {
      throw new Error(`${route.caseId}: 존재하지 않는 mediaId가 라우팅됐다.`);
    }
    if (route.decision === 'IMAGE_NOT_REQUIRED' && route.relevantMediaIds.length > 0) {
      throw new Error(`${route.caseId}: 이미지 불필요 판정과 mediaIds가 충돌한다.`);
    }
  }
}

function validateSolution(solution: Solution, sourceInput: unknown, visual: VisualExtraction | null): string[] {
  const issues: string[] = [];
  if (!isRecord(sourceInput) || !isRecord(sourceInput['source'])) return ['source input invalid'];
  const question = sourceInput['source']['question'];
  if (!isRecord(question) || !Array.isArray(question['choices'])) return ['question choices invalid'];
  const expectedChoices = question['choices'].filter(isRecord);
  const byNumber = new Map(solution.optionAnalyses.map((option) => [option.choiceNumber, option]));
  for (const expected of expectedChoices) {
    const choiceNumber = Number(expected['choice_number']);
    const actual = byNumber.get(choiceNumber);
    if (actual === undefined) issues.push(`C${choiceNumber}: option analysis missing`);
    else if (actual.choiceText !== expected['text']) issues.push(`C${choiceNumber}: choice text changed`);
  }
  if (new Set(solution.optionAnalyses.map((option) => option.choiceNumber)).size !== 5) {
    issues.push('choice numbers are not unique');
  }
  const claimIds = solution.optionAnalyses.flatMap((option) =>
    option.atomicClaims.map((claim) => claim.claimId),
  );
  if (new Set(claimIds).size !== claimIds.length) issues.push('atomic claim ids are not unique');
  const stem = String(question['stem'] ?? '');
  const negativeStem = /적절하지\s*않|옳지\s*않/.test(stem);
  const expectedPolarity = negativeStem ? 'SELECT_FALSE' : 'SELECT_TRUE';
  if (solution.selectedAnswer.stemPolarity !== expectedPolarity) {
    issues.push(`stem polarity must be ${expectedPolarity}`);
  }
  const selected = byNumber.get(solution.selectedAnswer.choiceNumber);
  const expectedVerdict = negativeStem ? 'FALSE' : 'TRUE';
  if (selected?.overallVerdict !== expectedVerdict) {
    issues.push(`selected answer must have overallVerdict ${expectedVerdict}`);
  }
  const matching = solution.optionAnalyses.filter((option) => option.overallVerdict === expectedVerdict);
  if (matching.length !== 1) issues.push(`stem requires exactly one ${expectedVerdict} option`);
  const validVisualIds = new Set(visual?.assertions.map((assertion) => assertion.assertionId) ?? []);
  if (solution.usedVisualAssertionIds.some((id) => !validVisualIds.has(id))) {
    issues.push('solution references an unknown visual assertion');
  }
  if (solution.imageDecision === 'IMAGE_NOT_REQUIRED' && solution.usedVisualAssertionIds.length > 0) {
    issues.push('text-only solution must not use visual assertions');
  }
  return issues;
}

function option(solution: Solution, number: number): Solution['optionAnalyses'][number] | undefined {
  return solution.optionAnalyses.find((candidate) => candidate.choiceNumber === number);
}

function containsLensVisualRelation(visual: VisualExtraction | null): boolean {
  if (visual === null) return false;
  const text = visual.assertions.map((assertion) => assertion.statement).join(' ');
  return /C/.test(text) && /D/.test(text) && /E/.test(text) && /사이/.test(text);
}

function containsLensDistanceReasoning(solution: Solution): boolean {
  const choice2 = option(solution, 2);
  if (choice2 === undefined) return false;
  const text = [
    choice2.rationale,
    ...choice2.atomicClaims.flatMap((claim) => [claim.statement, claim.reasoning]),
  ].join(' ');
  return /P2/.test(text) && /P0/.test(text) && /(2\s*배|두\s*배|4\s*배|네\s*배)/.test(text);
}

function deterministicChecks(options: {
  readonly caseId: string;
  readonly route: ImageRoutingCase;
  readonly visual: VisualExtraction | null;
  readonly solution: Solution;
  readonly finalAudit: Audit;
}): Record<string, boolean> {
  const definition = CASES.find((item) => item.caseId === options.caseId);
  if (definition === undefined) throw new Error(`${options.caseId}: case definition missing`);
  const checks: Record<string, boolean> = {
    expectedImageDecision: options.route.decision === definition.expectedImageDecision,
    minimalMediaSelection: JSON.stringify([...options.route.relevantMediaIds].sort()) ===
      JSON.stringify([...definition.expectedRelevantMediaIds].sort()),
    expectedAnswer: options.solution.selectedAnswer.choiceNumber === definition.expectedAnswer,
    finalAuditPass: options.finalAudit.verdict === 'PASS',
  };
  if (options.caseId === 'lens-q11') {
    checks['criticalVisualCDERelation'] = containsLensVisualRelation(options.visual);
    checks['criticalTextDistanceReasoning'] = containsLensDistanceReasoning(options.solution);
    checks['choice2True'] = option(options.solution, 2)?.overallVerdict === 'TRUE';
    checks['choice3False'] = option(options.solution, 3)?.overallVerdict === 'FALSE';
  }
  if (options.caseId === 'reference-price-q15') {
    const choice4 = option(options.solution, 4);
    checks['choice4False'] = choice4?.overallVerdict === 'FALSE';
    checks['choice4HasDirectContradiction'] = choice4?.atomicClaims.some(
      (claim) => claim.verdict === 'CONTRADICTED',
    ) ?? false;
    checks['choice4SeparatesClaims'] = (choice4?.atomicClaims.length ?? 0) >= 2;
  }
  if (options.caseId === 'seismic-design-q32') {
    const choice4 = option(options.solution, 4);
    const effects = new Set(choice4?.atomicClaims.map((claim) => claim.verdict) ?? []);
    checks['choice4SeparatesClaims'] = (choice4?.atomicClaims.length ?? 0) >= 2;
    checks['choice4HasContradictedAndNotJustified'] =
      effects.has('CONTRADICTED') && effects.has('NOT_JUSTIFIED');
    checks['choice5True'] = option(options.solution, 5)?.overallVerdict === 'TRUE';
  }
  return checks;
}

const ROUTER_PROMPT = `당신은 수능형 독해 문항의 이미지 필요성 라우터다.
이미지를 실제로 보지 않고 지문, 발문, 보기 텍스트, 선지와 미디어 위치 정보만 분석한다.
정답을 풀지 말고 각 문항에서 이미지 분석이 필요한지만 판정한다.

- IMAGE_REQUIRED: 이미지가 없으면 선지 하나 이상의 참/거짓을 신뢰성 있게 판정할 수 없다.
- IMAGE_NOT_REQUIRED: 모든 선지를 텍스트만으로 판정할 수 있고 이미지가 장식 또는 중복이다.
- UNCERTAIN: 필요 여부 자체를 텍스트만으로 확정할 수 없다. 안전상 이후 이미지 분석 대상으로 간주한다.

선지의 (가), (나), P1, 표·그래프 값, 위치·방향·거리·레이블 대응을 주의 깊게 본다.
미디어가 존재한다는 이유만으로 필요하다고 하지 않는다. 필요한 미디어 ID와 확인할 시각 사실을 최소화한다.
정답 키와 공식 해설은 제공되지 않으며 추측하지 않는다.`;

const VISUAL_PROMPT = `당신은 수능형 문항의 제한적 시각 사실 추출기다.
입력 텍스트가 요청한 시각 정보만 이미지에서 원자 명제로 추출한다.
이미지는 mediaManifest 순서와 동일한 순서로 첨부된다.

- 보이는 위치, 방향, 거리, 비율, 순서, 형태, 레이블 대응만 기록한다.
- 지문 지식이나 정답을 이미지에 투사하지 않는다.
- 텍스트 보기와 이미지가 충돌하거나 판독이 불확실하면 unresolvedQuestions에 남긴다.
- 계산이나 선지 판정은 하지 않는다.
- statement는 이후 풀이기가 독립적으로 사용할 수 있는 완결된 한국어 명제여야 한다.`;

const SOLVER_PROMPT = `당신은 학생 관점에서 수능형 독해 문항을 푸는 독립 풀이기다.
정답 키와 공식 해설은 보지 않는다. 오직 지문, 보기 텍스트, 승인된 문단 명제 Bundle,
그리고 라우팅된 경우 검증 전 후보인 시각 명제를 사용한다.

모든 선지를 빠짐없이 원자 주장으로 분해한다. 한 선지에 서로 다른 논리 효과가 있는 절이 두 개면
반드시 별도 atomicClaims로 나눈다. 각 주장은 다음 중 정확히 하나로 판정한다.

- SUPPORTED: 입력 근거로 주장을 도출할 수 있다.
- CONTRADICTED: 입력 근거로 주장의 부정을 도출할 수 있다.
- NOT_JUSTIFIED: 주장도 부정도 도출할 수 없다.

CONTRADICTED와 NOT_JUSTIFIED는 강도 차이가 아니라 다른 논리 관계다.
비교, 인과, 조건, 부호, 수치 방향을 보존한다. 근거 quote는 입력에서 확인 가능한 짧은 구절로 쓴다.
시각 명제는 별도 VISUAL 근거로 표시한다. 정답은 모든 선지 판정이 끝난 뒤 발문의 긍정/부정 극성에
맞춰 한 개만 선택한다. 불확실성을 정답 키로 메우지 말고 unresolvedQuestions에 남긴다.`;

const AUDITOR_PROMPT = `당신은 생성기와 독립된 수능형 독해 문항 의미 감사기다.
원문, 보기, 승인 문단 명제, 필요한 시각 명제부터 다시 대조하여 후보 풀이 전체를 검사한다.
공식 상세 해설은 오류 탐지용 참고자료일 뿐 학생용 근거가 아니다.

반드시 다음을 검사한다.
1. 텍스트 기반 이미지 라우팅과 선택한 미디어가 충분하고 최소한인가.
2. 시각 명제가 실제 이미지와 텍스트를 과도하게 해석하지 않았는가.
3. 다섯 선지의 모든 독립 절이 원자 주장으로 분해됐는가.
4. SUPPORTED, CONTRADICTED, NOT_JUSTIFIED가 정확히 구분됐는가.
5. 정답이 정답 키를 베낀 것이 아니라 앞선 근거에서 도출되는가.
6. 해설의 주장마다 SOURCE_GROUNDED, EXPLANATION_ONLY, EXTERNAL_OR_UNRESOLVED를 구분했는가.

상세 해설과 후보가 다르면 해설을 자동으로 옳다고 간주하지 않는다. 먼저 지문·보기·그림에서
그 내용을 재검증한다. 지문에서 확인된 내용만 USE_FOR_REPAIR로 지정한다.
후보 Solution 스키마 자체에는 별도의 해설 출처 태그 필드가 없다. 따라서 reasoning, rationale,
summary에 출처 태그가 명시되지 않았다는 이유만으로 오류를 만들지 않는다. 출처 경계 분류는 감사
출력의 explanationClaims에 기록한다. 후보가 공식 해설에만 있는 실질 주장을 학생용 필수 근거로
사용했거나, evidence와 실제 주장의 근거 범위가 맞지 않을 때만 explanationBoundary를 FAIL로 둔다.

복합 인과 선지는 관계 규칙과 사건 발생과 원인 귀속을 구분한다. 예를 들어 어떤 가격 관계가
거래효용 방향이라는 점은 반대 부호의 일반 규칙을 직접 반박할 수 있지만, 특정 인물에게 실제로
거래비효용이 발생하지 않았다는 사건 부정이나 감정의 원인은 별도 근거가 없으면 NOT_JUSTIFIED다.
BLOCKER나 MAJOR 오류가 수리 가능하면 REPAIR_REQUIRED, 근거 충돌·시각 판독 불능처럼 자동 수리가
위험하면 HUMAN_REVIEW, 중대 오류가 없으면 PASS를 반환한다.`;

const REPAIR_PROMPT = `당신은 감사기가 지정한 문제만 고치는 제한적 수리기다.
원문, 보기, 승인 문단 명제와 시각 명제를 근거로 후보 풀이를 수정한다.
상세 해설은 SOURCE_GROUNDED로 확인된 주장만 사용할 수 있다.

- 정답 키에 맞추기 위해 근거를 만들지 않는다.
- EXPLANATION_ONLY 또는 EXTERNAL_OR_UNRESOLVED 정보를 학생용 근거에 넣지 않는다.
- 감사 issue와 정적 검증 오류를 모두 해결한다.
- 한 필드를 고친 뒤 관련 선지 원자 주장, 전체 판정, 정답 도출을 다시 맞춘다.
- 출력은 수정된 Solution 전체다. 자동 수리는 이번 한 번뿐이다.`;

async function runContractV2(options: {
  readonly execute: boolean;
  readonly routing: z.infer<typeof ImageRoutingOutputSchema>;
  readonly sourceInputs: ReadonlyMap<string, unknown>;
  readonly sourceOnlyInputs: ReadonlyMap<string, JsonRecord>;
  readonly paragraphBundles: ReadonlyMap<string, unknown[]>;
  readonly explanations: ReadonlyMap<string, unknown>;
}): Promise<void> {
  const summaries: JsonRecord[] = [];
  const metadataPaths: string[] = [];
  for (const definition of CASES) {
    const directory = resolve(OUTPUT_ROOT, 'artifacts', definition.caseId);
    const sourceInput = options.sourceInputs.get(definition.caseId);
    const source = options.sourceOnlyInputs.get(definition.caseId);
    const initialRoute = options.routing.cases.find((candidate) =>
      candidate.caseId === definition.caseId);
    if (source === undefined || initialRoute === undefined) {
      throw new Error(`${definition.caseId}: v2 입력이 불완전하다.`);
    }
    let visual: VisualExtraction | null = null;
    const existingVisualPath = resolve(directory, '02-visual-extraction.json');
    if (await exists(existingVisualPath)) {
      visual = VisualExtractionSchema.parse(await readJson(existingVisualPath));
    }
    const initialSolution = SolutionSchema.parse(
      await readJson(resolve(directory, '03-initial-solution.json')),
    );
    const initialStaticIssues = validateSolution(initialSolution, sourceInput, visual);
    const initiallySelectedMedia = mediaRecords(sourceInput).filter((media) =>
      initialRoute.relevantMediaIds.includes(String(media['mediaId'])),
    );
    const firstAuditBasename = '08-first-audit-v2';
    const firstAudit = await loadOrCall({
      directory,
      basename: firstAuditBasename,
      execute: options.execute,
      stage: `${definition.caseId}:FIRST_AUDIT_V2`,
      instructions: AUDITOR_PROMPT,
      input: {
        contractVersion: 'selective-visual-canary-v2',
        caseId: definition.caseId,
        source,
        approvedParagraphPropositionBundles: options.paragraphBundles.get(definition.caseId),
        imageRouting: initialRoute,
        visualExtraction: visual,
        candidateSolution: initialSolution,
        candidateStaticValidationIssues: initialStaticIssues,
        answerKeyForAuditOnly: answerKey(sourceInput),
        officialExplanationForAuditOnly: options.explanations.get(definition.caseId),
        explanationWarning:
          '상세 해설은 independent_paraphrase이며 원문 근거를 대체하지 않는다. 출처 태그의 부재 자체를 오류로 만들지 않는다.',
      },
      schema: AuditSchema,
      schemaName: 'problem_gold_independent_audit_v2',
      maxOutputTokens: 8_000,
      imageUrls: initiallySelectedMedia.map((media) => String(media['sourceUrl'])),
    });
    metadataPaths.push(resolve(directory, `${firstAuditBasename}-metadata.json`));

    let effectiveRoute = initialRoute;
    const visualRecoveryRequired = visual === null && firstAudit.issues.some((issue) =>
      (issue.category === 'IMAGE_ROUTING' || issue.category === 'VISUAL_FACT') &&
      (issue.severity === 'BLOCKER' || issue.severity === 'MAJOR'),
    );
    if (visualRecoveryRequired) {
      const mentionedMediaIds = new Set(firstAudit.issues.flatMap((issue) =>
        issue.sourceEvidence.flatMap((evidence) =>
          evidence.locator.match(/MEDIA[1-9][0-9]*/g) ?? [],
        ),
      ));
      let selectedMedia = mediaRecords(sourceInput).filter((media) =>
        mentionedMediaIds.has(String(media['mediaId'])),
      );
      if (selectedMedia.length === 0) {
        selectedMedia = mediaRecords(sourceInput).filter((media) => {
          const placement = media['placement'];
          return isRecord(placement) && (
            placement['scope'] === 'SCENARIO' || placement['scope'] === 'CHOICE'
          );
        });
      }
      if (selectedMedia.length === 0) selectedMedia = mediaRecords(sourceInput);
      effectiveRoute = {
        caseId: definition.caseId,
        decision: 'IMAGE_REQUIRED',
        relevantMediaIds: selectedMedia.map((media) => String(media['mediaId'])),
        requiredVisualFacts: firstAudit.issues
          .filter((issue) => issue.category === 'IMAGE_ROUTING' || issue.category === 'VISUAL_FACT')
          .map((issue) => issue.repairInstruction),
        rationale: '1차 감사에서 텍스트 라우팅의 누락을 발견하여 이미지 단계로 되돌림.',
      };
      await writeJson(resolve(directory, '08-recovered-routing-v2.json'), effectiveRoute);
      const recoveryBasename = '09-visual-recovery-v2';
      visual = await loadOrCall({
        directory,
        basename: recoveryBasename,
        execute: options.execute,
        stage: `${definition.caseId}:VISUAL_RECOVERY_V2`,
        instructions: VISUAL_PROMPT,
        input: {
          caseId: definition.caseId,
          source,
          requestedVisualFacts: effectiveRoute.requiredVisualFacts,
          mediaManifest: selectedMedia.map((media) => ({
            mediaId: media['mediaId'],
            placement: media['placement'],
            width: media['width'],
            height: media['height'],
          })),
        },
        schema: VisualExtractionSchema,
        schemaName: 'problem_gold_visual_recovery_v2',
        maxOutputTokens: 5_000,
        imageUrls: selectedMedia.map((media) => String(media['sourceUrl'])),
      });
      metadataPaths.push(resolve(directory, `${recoveryBasename}-metadata.json`));
    }

    let finalSolution = initialSolution;
    let repairApplied = false;
    if (firstAudit.verdict === 'REPAIR_REQUIRED' || initialStaticIssues.length > 0 || visualRecoveryRequired) {
      const repairBasename = '10-repaired-solution-v2';
      finalSolution = await loadOrCall({
        directory,
        basename: repairBasename,
        execute: options.execute,
        stage: `${definition.caseId}:REPAIR_V2`,
        instructions: REPAIR_PROMPT,
        input: {
          contractVersion: 'selective-visual-canary-v2',
          caseId: definition.caseId,
          source,
          approvedParagraphPropositionBundles: options.paragraphBundles.get(definition.caseId),
          imageRouting: effectiveRoute,
          visualExtraction: visual,
          candidateSolution: initialSolution,
          candidateStaticValidationIssues: initialStaticIssues,
          audit: firstAudit,
          answerKeyForConsistencyCheckOnly: answerKey(sourceInput),
          officialExplanationForAuditOnly: options.explanations.get(definition.caseId),
          repairableExplanationClaims: firstAudit.explanationClaims.filter(
            (claim) => claim.classification === 'SOURCE_GROUNDED' &&
              claim.disposition === 'USE_FOR_REPAIR',
          ),
          boundaryContract:
            'reasoning 문장에 출처 태그를 붙일 필요는 없다. 각 atomicClaim의 evidence가 실제 근거 범위를 정확히 추적해야 한다.',
        },
        schema: SolutionSchema,
        schemaName: 'problem_gold_repaired_solution_v2',
        maxOutputTokens: 10_000,
      });
      metadataPaths.push(resolve(directory, `${repairBasename}-metadata.json`));
      repairApplied = true;
    } else {
      await writeJson(resolve(directory, '10-repair-skipped-v2.json'), {
        reason: firstAudit.verdict,
      });
    }

    const finalStaticIssues = validateSolution(finalSolution, sourceInput, visual);
    await writeJson(resolve(directory, '10-final-static-validation-v2.json'), {
      passed: finalStaticIssues.length === 0,
      issues: finalStaticIssues,
    });
    const selectedMedia = mediaRecords(sourceInput).filter((media) =>
      effectiveRoute.relevantMediaIds.includes(String(media['mediaId'])),
    );
    const finalAuditBasename = '11-final-reaudit-v2';
    const finalAudit = await loadOrCall({
      directory,
      basename: finalAuditBasename,
      execute: options.execute,
      stage: `${definition.caseId}:FINAL_REAUDIT_V2`,
      instructions: AUDITOR_PROMPT,
      input: {
        contractVersion: 'selective-visual-canary-v2',
        caseId: definition.caseId,
        source,
        approvedParagraphPropositionBundles: options.paragraphBundles.get(definition.caseId),
        imageRouting: effectiveRoute,
        visualExtraction: visual,
        candidateSolution: finalSolution,
        candidateStaticValidationIssues: finalStaticIssues,
        answerKeyForAuditOnly: answerKey(sourceInput),
        officialExplanationForAuditOnly: options.explanations.get(definition.caseId),
        independenceContract:
          '첫 감사의 결론을 보지 말고 최종 후보를 원자료부터 새로 감사한다. 출처 태그 부재 자체는 오류가 아니다.',
      },
      schema: AuditSchema,
      schemaName: 'problem_gold_final_reaudit_v2',
      maxOutputTokens: 8_000,
      imageUrls: selectedMedia.map((media) => String(media['sourceUrl'])),
    });
    metadataPaths.push(resolve(directory, `${finalAuditBasename}-metadata.json`));

    const checks = deterministicChecks({
      caseId: definition.caseId,
      route: effectiveRoute,
      visual,
      solution: finalSolution,
      finalAudit,
    });
    const passed = Object.values(checks).every(Boolean) && finalStaticIssues.length === 0;
    const summary: JsonRecord = {
      caseId: definition.caseId,
      title: source['title'],
      questionNumber: source['questionNumber'],
      initialRoute,
      effectiveRoute,
      visualRecoveryRequired,
      initialAnswer: initialSolution.selectedAnswer.choiceNumber,
      firstAuditVerdict: firstAudit.verdict,
      repairApplied,
      finalAnswer: finalSolution.selectedAnswer.choiceNumber,
      finalAuditVerdict: finalAudit.verdict,
      finalStaticIssues,
      deterministicChecks: checks,
      passed,
    };
    await writeJson(resolve(directory, '12-case-summary-v2.json'), summary);
    summaries.push(summary);
  }

  const metadata = await Promise.all(metadataPaths.filter(async (path) => exists(path)).map(readJson));
  const usage = metadata.filter(isRecord).reduce<{
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  }>((sum, item) => {
    const itemUsage = isRecord(item['usage']) ? item['usage'] : {};
    return {
      inputTokens: sum.inputTokens + Number(itemUsage['input_tokens'] ?? 0),
      outputTokens: sum.outputTokens + Number(itemUsage['output_tokens'] ?? 0),
      cacheReadTokens: sum.cacheReadTokens + Number(
        isRecord(itemUsage['input_tokens_details'])
          ? itemUsage['input_tokens_details']['cached_tokens'] ?? 0
          : 0,
      ),
    };
  }, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  const addedCost = Number((
    Math.max(0, usage.inputTokens - usage.cacheReadTokens) / 1_000_000 * 2 +
    usage.cacheReadTokens / 1_000_000 * 0.2 +
    usage.outputTokens / 1_000_000 * 12
  ).toFixed(6));
  const previous = isRecord(await readJson(resolve(OUTPUT_ROOT, 'SUMMARY.json')))
    ? await readJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'))
    : {};
  const previousRecord = isRecord(previous) ? previous : {};
  const passedCount = summaries.filter((summary) => summary['passed'] === true).length;
  const result = {
    artifactType: 'problem-gold-selective-visual-canary-result-v2',
    protocol: PROTOCOL,
    completedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    contractChanges: [
      '감사에서 이미지 누락 발견 시 이미지 추출 단계로 복귀',
      '풀이 스키마에 없는 출처 태그 자체를 실패 사유로 삼지 않음',
      '복합 인과에서 일반 규칙 모순과 사건 발생·원인 귀속의 근거 부족 분리',
    ],
    previousCompletedApiResponses: Number(previousRecord['completedApiResponses'] ?? 0),
    additionalCompletedApiResponses: metadata.length,
    cumulativeCompletedApiResponses:
      Number(previousRecord['completedApiResponses'] ?? 0) + metadata.length,
    additionalUsage: usage,
    additionalEstimatedCostUsingProjectSnapshot: addedCost,
    cumulativeEstimatedCostUsingProjectSnapshot: Number((
      Number(previousRecord['estimatedCostUsingProjectSnapshot'] ?? 0) + addedCost
    ).toFixed(6)),
    passedCount,
    totalCases: CASES.length,
    overallDecision: passedCount === CASES.length ? 'PASS' : 'REVIEW_REQUIRED',
    cases: summaries,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY-V2.json'), result);
  const rows = summaries.map((summary) => {
    const initialRoute = summary['initialRoute'] as JsonRecord;
    const effectiveRoute = summary['effectiveRoute'] as JsonRecord;
    return `| ${String(summary['title'])} | ${String(initialRoute['decision'])} | ` +
      `${String(effectiveRoute['decision'])} | ${String(summary['firstAuditVerdict'])} | ` +
      `${summary['repairApplied'] === true ? '예' : '아니요'} | ${String(summary['finalAnswer'])} | ` +
      `${String(summary['finalAuditVerdict'])} | ${summary['passed'] === true ? '통과' : '검토 필요'} |`;
  });
  const report = `# SEVP v01.01 선택적 근거 검증 카나리 결과\n\n` +
    `- 추가 API 응답: ${metadata.length}회\n` +
    `- 누적 API 응답: ${String(result.cumulativeCompletedApiResponses)}회\n` +
    `- 프로젝트 가격 스냅샷 기준 추가 추정 비용: $${addedCost}\n` +
    `- 누적 추정 비용: $${String(result.cumulativeEstimatedCostUsingProjectSnapshot)}\n` +
    `- 최종 판정: **${String(result.overallDecision)} (${passedCount}/${CASES.length})**\n\n` +
    `| 문항 | 최초 라우팅 | 최종 라우팅 | 최초 감사 | 수리 | 최종 답 | 최종 감사 | 카나리 |\n` +
    `|---|---|---|---|---|---:|---|---|\n${rows.join('\n')}\n`;
  await writeFile(resolve(OUTPUT_ROOT, 'REPORT-V2.md'), report);
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const contractV2 = process.argv.includes('--contract-v2');
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });

  const sourceInputs = new Map<string, unknown>();
  const sourceOnlyInputs = new Map<string, JsonRecord>();
  const paragraphBundles = new Map<string, unknown[]>();
  const explanations = new Map<string, unknown>();
  for (const definition of CASES) {
    const sourceInput = await readJson(definition.sourceInputPath);
    sourceInputs.set(definition.caseId, sourceInput);
    sourceOnlyInputs.set(definition.caseId, sourceWithoutAnswer(sourceInput));
    paragraphBundles.set(definition.caseId, await loadParagraphBundles(definition.sourceId));
    explanations.set(
      definition.caseId,
      await loadOfficialExplanation(
        definition.sourceId,
        Number(sourceWithoutAnswer(sourceInput)['questionNumber']),
      ),
    );
    await mkdir(resolve(OUTPUT_ROOT, 'artifacts', definition.caseId), { recursive: true });
  }

  const executionPlan = {
    artifactType: 'problem-gold-selective-visual-canary-plan-v1',
    protocol: PROTOCOL,
    createdAt: new Date().toISOString(),
    execute,
    model: MODEL,
    effort: EFFORT,
    serviceTier: 'default',
    timeoutMs: TIMEOUT_MS,
    automaticRetries: 0,
    maximumCompletedApiResponses: 15,
    automaticRepairLimitPerCase: 1,
    generationBlindTo: ['answerKey', 'officialExplanation'],
    explanationPolicy: '감사에서만 참고하고 지문·보기·그림으로 재검증된 주장만 수리에 사용',
    cases: CASES,
    approvedParagraphManifest: APPROVED_PARAGRAPH_MANIFEST,
    contractV2,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'execution-plan.json'), executionPlan);

  const routerInput = {
    contract: {
      imagesNotIncluded: true,
      answerKeyNotIncluded: true,
      officialExplanationNotIncluded: true,
    },
    cases: CASES.map((definition) => ({
      caseId: definition.caseId,
      source: sourceOnlyInputs.get(definition.caseId),
    })),
  };
  const routing = await loadOrCall({
    directory: OUTPUT_ROOT,
    basename: '01-image-routing',
    execute,
    stage: 'IMAGE_ROUTING',
    instructions: ROUTER_PROMPT,
    input: routerInput,
    schema: ImageRoutingOutputSchema,
    schemaName: 'problem_gold_image_routing',
    maxOutputTokens: 4_000,
  });
  validateRouting(routing, sourceInputs);

  if (contractV2) {
    await runContractV2({
      execute,
      routing,
      sourceInputs,
      sourceOnlyInputs,
      paragraphBundles,
      explanations,
    });
    return;
  }

  const caseSummaries: unknown[] = [];
  for (const definition of CASES) {
    const directory = resolve(OUTPUT_ROOT, 'artifacts', definition.caseId);
    const route = routing.cases.find((candidate) => candidate.caseId === definition.caseId);
    if (route === undefined) throw new Error(`${definition.caseId}: routing result missing`);
    const sourceInput = sourceInputs.get(definition.caseId);
    const source = sourceOnlyInputs.get(definition.caseId);
    if (source === undefined) throw new Error(`${definition.caseId}: source missing`);
    await writeJson(resolve(directory, '00-source-without-answer.json'), source);
    await writeJson(resolve(directory, '00-approved-paragraph-bundles.json'), paragraphBundles.get(definition.caseId));
    await writeJson(resolve(directory, '01-image-routing.json'), route);

    let visual: VisualExtraction | null = null;
    if (route.decision !== 'IMAGE_NOT_REQUIRED') {
      const selectedMedia = mediaRecords(sourceInput).filter((media) =>
        route.relevantMediaIds.includes(String(media['mediaId'])),
      );
      if (selectedMedia.length === 0) {
        throw new Error(`${definition.caseId}: 이미지 필요/불확실 판정인데 선택된 미디어가 없다.`);
      }
      visual = await loadOrCall({
        directory,
        basename: '02-visual-extraction',
        execute,
        stage: `${definition.caseId}:VISUAL_EXTRACTION`,
        instructions: VISUAL_PROMPT,
        input: {
          caseId: definition.caseId,
          source,
          requestedVisualFacts: route.requiredVisualFacts,
          mediaManifest: selectedMedia.map((media) => ({
            mediaId: media['mediaId'],
            placement: media['placement'],
            width: media['width'],
            height: media['height'],
          })),
        },
        schema: VisualExtractionSchema,
        schemaName: 'problem_gold_visual_extraction',
        maxOutputTokens: 5_000,
        imageUrls: selectedMedia.map((media) => String(media['sourceUrl'])),
      });
    } else {
      await writeJson(resolve(directory, '02-visual-extraction-skipped.json'), {
        reason: 'IMAGE_NOT_REQUIRED',
      });
    }

    const solverInput = {
      caseId: definition.caseId,
      source,
      approvedParagraphPropositionBundles: paragraphBundles.get(definition.caseId),
      imageRouting: route,
      visualExtraction: visual,
      prohibitedInputs: ['answerKey', 'officialExplanation'],
    };
    const initialSolution = await loadOrCall({
      directory,
      basename: '03-initial-solution',
      execute,
      stage: `${definition.caseId}:INITIAL_SOLUTION`,
      instructions: SOLVER_PROMPT,
      input: solverInput,
      schema: SolutionSchema,
      schemaName: 'problem_gold_student_view_solution',
      maxOutputTokens: 10_000,
    });
    const initialStaticIssues = validateSolution(initialSolution, sourceInput, visual);
    await writeJson(resolve(directory, '03-initial-static-validation.json'), {
      passed: initialStaticIssues.length === 0,
      issues: initialStaticIssues,
    });

    const auditInput = {
      caseId: definition.caseId,
      source,
      approvedParagraphPropositionBundles: paragraphBundles.get(definition.caseId),
      imageRouting: route,
      visualExtraction: visual,
      candidateSolution: initialSolution,
      candidateStaticValidationIssues: initialStaticIssues,
      answerKeyForAuditOnly: answerKey(sourceInput),
      officialExplanationForAuditOnly: explanations.get(definition.caseId),
      explanationWarning:
        '이 상세 해설은 EBSi 배포 자료를 기반으로 만든 independent_paraphrase다. 원문 근거를 대체하지 않는다.',
    };
    const firstAudit = await loadOrCall({
      directory,
      basename: '04-first-audit',
      execute,
      stage: `${definition.caseId}:FIRST_AUDIT`,
      instructions: AUDITOR_PROMPT,
      input: auditInput,
      schema: AuditSchema,
      schemaName: 'problem_gold_independent_audit',
      maxOutputTokens: 8_000,
      imageUrls: visual === null
        ? []
        : mediaRecords(sourceInput)
            .filter((media) => route.relevantMediaIds.includes(String(media['mediaId'])))
            .map((media) => String(media['sourceUrl'])),
    });

    let finalSolution = initialSolution;
    let repairApplied = false;
    if (firstAudit.verdict === 'REPAIR_REQUIRED' || initialStaticIssues.length > 0) {
      finalSolution = await loadOrCall({
        directory,
        basename: '05-repaired-solution',
        execute,
        stage: `${definition.caseId}:REPAIR`,
        instructions: REPAIR_PROMPT,
        input: {
          ...auditInput,
          audit: firstAudit,
          repairableExplanationClaims: firstAudit.explanationClaims.filter(
            (claim) => claim.classification === 'SOURCE_GROUNDED' && claim.disposition === 'USE_FOR_REPAIR',
          ),
        },
        schema: SolutionSchema,
        schemaName: 'problem_gold_repaired_student_view_solution',
        maxOutputTokens: 10_000,
      });
      repairApplied = true;
    } else {
      await writeJson(resolve(directory, '05-repair-skipped.json'), {
        reason: firstAudit.verdict,
      });
    }

    const finalStaticIssues = validateSolution(finalSolution, sourceInput, visual);
    await writeJson(resolve(directory, '05-final-static-validation.json'), {
      passed: finalStaticIssues.length === 0,
      issues: finalStaticIssues,
    });

    const finalAudit = await loadOrCall({
      directory,
      basename: '06-final-reaudit',
      execute,
      stage: `${definition.caseId}:FINAL_REAUDIT`,
      instructions: AUDITOR_PROMPT,
      input: {
        caseId: definition.caseId,
        source,
        approvedParagraphPropositionBundles: paragraphBundles.get(definition.caseId),
        imageRouting: route,
        visualExtraction: visual,
        candidateSolution: finalSolution,
        candidateStaticValidationIssues: finalStaticIssues,
        answerKeyForAuditOnly: answerKey(sourceInput),
        officialExplanationForAuditOnly: explanations.get(definition.caseId),
        explanationWarning:
          '이 상세 해설은 EBSi 배포 자료를 기반으로 만든 independent_paraphrase다. 원문 근거를 대체하지 않는다.',
        independenceContract:
          '첫 감사의 결론을 보지 말고 최종 후보를 원자료부터 새로 감사한다.',
      },
      schema: AuditSchema,
      schemaName: 'problem_gold_final_independent_reaudit',
      maxOutputTokens: 8_000,
      imageUrls: visual === null
        ? []
        : mediaRecords(sourceInput)
            .filter((media) => route.relevantMediaIds.includes(String(media['mediaId'])))
            .map((media) => String(media['sourceUrl'])),
    });

    const checks = deterministicChecks({
      caseId: definition.caseId,
      route,
      visual,
      solution: finalSolution,
      finalAudit,
    });
    const passed = Object.values(checks).every(Boolean) && finalStaticIssues.length === 0;
    const summary = {
      caseId: definition.caseId,
      title: source['title'],
      questionNumber: source['questionNumber'],
      route,
      visualAnalyzed: visual !== null,
      initialAnswer: initialSolution.selectedAnswer.choiceNumber,
      firstAuditVerdict: firstAudit.verdict,
      repairApplied,
      finalAnswer: finalSolution.selectedAnswer.choiceNumber,
      finalAuditVerdict: finalAudit.verdict,
      finalStaticIssues,
      deterministicChecks: checks,
      passed,
    };
    await writeJson(resolve(directory, '07-case-summary.json'), summary);
    caseSummaries.push(summary);
  }

  const metadataFiles: string[] = [];
  for (const definition of CASES) {
    const directory = resolve(OUTPUT_ROOT, 'artifacts', definition.caseId);
    for (const basename of [
      '02-visual-extraction-metadata.json',
      '03-initial-solution-metadata.json',
      '04-first-audit-metadata.json',
      '05-repaired-solution-metadata.json',
      '06-final-reaudit-metadata.json',
    ]) {
      const path = resolve(directory, basename);
      if (await exists(path)) metadataFiles.push(path);
    }
  }
  const routerMetadata = resolve(OUTPUT_ROOT, '01-image-routing-metadata.json');
  if (await exists(routerMetadata)) metadataFiles.unshift(routerMetadata);
  const metadata = await Promise.all(metadataFiles.map((path) => readJson(path)));
  const usage = metadata.filter(isRecord).reduce<{
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  }>((sum, item) => {
    const itemUsage = isRecord(item['usage']) ? item['usage'] : {};
    return {
      inputTokens: sum.inputTokens + Number(itemUsage['input_tokens'] ?? 0),
      outputTokens: sum.outputTokens + Number(itemUsage['output_tokens'] ?? 0),
      cacheReadTokens: sum.cacheReadTokens + Number(
        isRecord(itemUsage['input_tokens_details'])
          ? itemUsage['input_tokens_details']['cached_tokens'] ?? 0
          : 0,
      ),
    };
  }, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  const estimatedCostUsingProjectSnapshot = Number((
    Math.max(0, usage.inputTokens - usage.cacheReadTokens) / 1_000_000 * 2 +
    usage.cacheReadTokens / 1_000_000 * 0.2 +
    usage.outputTokens / 1_000_000 * 12
  ).toFixed(6));
  const passedCount = caseSummaries.filter((summary) =>
    isRecord(summary) && summary['passed'] === true,
  ).length;
  const runSummary = {
    artifactType: 'problem-gold-selective-visual-canary-result-v1',
    protocol: PROTOCOL,
    completedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    completedApiResponses: metadata.length,
    usage,
    pricingSnapshot: {
      date: '2026-09-02',
      inputUsdPerMillion: 2,
      cachedInputUsdPerMillion: 0.2,
      outputUsdPerMillion: 12,
      note: '프로젝트 기존 스냅샷이며 현재 가격을 새로 조회하지 않았다.',
    },
    estimatedCostUsingProjectSnapshot,
    passedCount,
    totalCases: CASES.length,
    overallDecision: passedCount === CASES.length ? 'PASS' : 'REVIEW_REQUIRED',
    cases: caseSummaries,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), runSummary);

  const rows = caseSummaries.filter(isRecord).map((summary) =>
    `| ${String(summary['title'])} | ${String((summary['route'] as JsonRecord)['decision'])} | ` +
    `${String(summary['initialAnswer'])} | ${String(summary['firstAuditVerdict'])} | ` +
    `${summary['repairApplied'] === true ? '예' : '아니요'} | ${String(summary['finalAnswer'])} | ` +
    `${String(summary['finalAuditVerdict'])} | ${summary['passed'] === true ? '통과' : '검토 필요'} |`,
  );
  const report = `# SEVP v01.01 선택적 근거 검증 카나리 최초 계약 결과\n\n` +
    `- 모델: \`${MODEL}\` / ${EFFORT}\n` +
    `- 완료 API 응답: ${metadata.length}회\n` +
    `- 프로젝트 가격 스냅샷 기준 추정 비용: $${estimatedCostUsingProjectSnapshot}\n` +
    `- 최종 판정: **${String(runSummary.overallDecision)} (${passedCount}/${CASES.length})**\n\n` +
    `| 문항 | 이미지 라우팅 | 최초 답 | 최초 감사 | 수리 | 최종 답 | 최종 감사 | 카나리 |\n` +
    `|---|---|---:|---|---|---:|---|---|\n${rows.join('\n')}\n\n` +
    `세부 근거는 각 \`artifacts/<caseId>/\`의 라우팅, 시각 명제, 풀이, 감사, 수리 및 재감사 파일에 보존했다.\n`;
  await writeFile(resolve(OUTPUT_ROOT, 'REPORT.md'), report);
  console.log(JSON.stringify(runSummary, null, 2));
}

main().catch(async (error: unknown) => {
  const serialized = {
    failedAt: new Date().toISOString(),
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  };
  await mkdir(OUTPUT_ROOT, { recursive: true });
  await writeJson(resolve(OUTPUT_ROOT, 'RUN-ERROR.json'), serialized);
  console.error(serialized);
  process.exitCode = 1;
});
