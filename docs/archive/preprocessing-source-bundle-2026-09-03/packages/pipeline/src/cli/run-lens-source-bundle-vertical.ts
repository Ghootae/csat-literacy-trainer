import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  SourcePacketSchema,
  auditOptionClaimBundleAgainstPacket,
  auditSourceBundleAgainstPacket,
  canonicalSourcePacketHash,
  sourceArtifactHash,
  type OptionClaimBundle,
  type SourceBundle,
  type SourcePacket,
} from '../problem-solving/source-bundle.js';
import {
  LensMutationKindSchema,
  applyLensMutation,
  freezeOptionClaimBundle,
  freezeSourceBundle,
} from '../problem-solving/source-bundle-audit.js';
import {
  DEFAULT_SOURCE_GENERATION_EFFORT,
  DEFAULT_SOURCE_GENERATION_MODEL,
  SourceApiCallMetadataSchema,
  SourceApiOutputValidationError,
  auditOptionClaimBundle,
  auditSourceBundle,
  auditSourceBundleCandidates,
  compareSourceBundleWithIndependentReading,
  generateOptionClaimBundle,
  generateSourceBundle,
  recoverGeneratedSourceBundle,
  recoverIndependentSourceReading,
  type SourceApiCall,
} from '../problem-solving/source-bundle-runtime.js';

const DEFAULT_MANIFEST = resolve(
  'packages/pipeline/experiments/problem-solving/lens-source-bundle-vertical-v2.json',
);
const DEFAULT_OUTPUT_ROOT = resolve(
  'docs/experiments/problem-source-bundle-lens-2026-09-03/artifacts',
);

const HashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const FileLockSchema = z.object({ path: z.string().min(1), sha256: HashSchema }).strict();
const ManifestSchema = z.object({
  experimentVersion: z.literal('lens-source-bundle-vertical-v2'),
  createdAt: z.string().datetime(),
  caseId: z.string().min(1),
  sourceId: z.string().min(1),
  questionNumber: z.number().int().positive(),
  rawFiles: z.object({
    result: FileLockSchema,
    enrichment: FileLockSchema,
    media: FileLockSchema.extend({
      sourceUrl: z.string().url(),
      mimeType: z.string().regex(/^image\//),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      sourceArea: z.literal('SCENARIO_VISUAL'),
    }).strict(),
  }).strict(),
  models: z.object({
    generation: z.object({
      model: z.literal(DEFAULT_SOURCE_GENERATION_MODEL),
      effort: z.literal(DEFAULT_SOURCE_GENERATION_EFFORT),
    }).strict(),
    auditVariants: z.tuple([
      z.object({
        id: z.literal('terra-medium'),
        model: z.literal('gpt-5.6-terra'),
        effort: z.literal('medium'),
      }).strict(),
      z.object({
        id: z.literal('terra-high'),
        model: z.literal('gpt-5.6-terra'),
        effort: z.literal('high'),
      }).strict(),
    ]),
  }).strict(),
  repetitions: z.object({
    passageGeneration: z.literal(3),
    itemGeneration: z.literal(1),
    optionAtomization: z.literal(1),
    independentReadingPerScopeAndAuditVariant: z.literal(1),
    comparisonPerScopeAndAuditVariant: z.literal(1),
    mutationPerKindAndAuditVariant: z.literal(1),
  }).strict(),
  auditIsolation: z.object({
    useResponsesApi: z.literal(true),
    store: z.literal(false),
    previousResponseId: z.null(),
    independentReadingHidesCandidate: z.literal(true),
    answerKeyFirstAllowedStage: z.literal('POST_SOURCE_C1'),
    officialExplanationFirstAllowedStage: z.literal('EXPLANATION_AUDIT'),
  }).strict(),
  apiExecutionApproval: z.object({
    requiredFlag: z.literal('--execute'),
    requiredApprovalId: z.string().min(1),
  }).strict(),
  mutations: z.array(z.object({
    mutationId: z.string().regex(/^M[1-9][0-9]*$/),
    kind: LensMutationKindSchema,
    scope: z.enum(['PASSAGE', 'ITEM']),
  }).strict()).length(5),
  evaluationReference: z.object({
    withheldFromAllSourceApiCalls: z.literal(true),
    sourceClaims: z.array(z.string().min(1)),
    derivedRelations: z.array(z.string().min(1)),
    itemInferences: z.array(z.string().min(1)),
    expectedChoiceTruth: z.array(z.boolean()).length(5),
    expectedAnswerChoiceId: z.string().regex(/^C[1-5]$/),
  }).strict(),
}).strict();

const QuestionSchema = z.object({
  question_number: z.number().int().positive(),
  stem: z.string(),
  supplements: z.array(z.object({
    label: z.string(),
    text: z.string(),
    image_urls: z.array(z.string().url()).default([]),
  }).passthrough()).default([]),
  choices: z.array(z.object({
    choice_number: z.number().int().positive(),
    text: z.string(),
  }).strict()).min(2),
  image_urls: z.array(z.string().url()).default([]),
}).passthrough();

const ResultSchema = z.object({
  product_id: z.string(),
  passage: z.string(),
  questions: z.array(QuestionSchema),
}).passthrough();

const EnrichmentSchema = z.object({
  schema_version: z.string(),
  product_id: z.string(),
  source: z.object({
    publisher: z.string(),
    service: z.string(),
    document_type: z.string(),
    url: z.string().url(),
    officiality: z.string(),
    officiality_note: z.string(),
  }).passthrough(),
  questions: z.array(z.object({
    question_number: z.number().int().positive(),
    correct_choice: z.number().int().positive(),
    correct_choice_text: z.string(),
    official_explanation: z.object({
      available: z.boolean(),
      source_pdf_page: z.number().int().positive(),
      source_pdf_pages: z.array(z.number().int().positive()),
      section_title: z.string(),
      content_type: z.literal('independent_paraphrase'),
      detailed_explanation_ko: z.string(),
      choice_explanations: z.array(z.object({
        choice_number: z.number().int().positive(),
        selected_as_answer: z.boolean(),
        explanation_ko: z.string(),
      }).strict()),
    }).strict(),
  }).passthrough()),
  generation: z.object({
    content_type: z.literal('independent_paraphrase'),
    source_basis: z.string(),
    model: z.string(),
    prompt_version: z.string(),
    generated_at: z.string().datetime(),
  }).strict(),
}).passthrough();

type Manifest = z.infer<typeof ManifestSchema>;
type Question = z.infer<typeof QuestionSchema>;
type AuditVariant = Manifest['models']['auditVariants'][number];

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function hashBytes(value: Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function readLockedFile(lock: z.infer<typeof FileLockSchema>): Promise<Buffer> {
  const bytes = await readFile(resolve(lock.path));
  const actual = hashBytes(bytes);
  if (actual !== lock.sha256) {
    throw new Error(`${lock.path} 해시 불일치: expected=${lock.sha256}, actual=${actual}`);
  }
  return bytes;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildPassagePacket(manifest: Manifest, passage: string): SourcePacket {
  const paragraphs = passage.split('\n');
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: `${manifest.caseId}-passage`,
    sourceId: manifest.sourceId,
    questionNumber: null,
    scope: 'PASSAGE',
    documents: paragraphs.map((text, index) => ({
      documentId: `PASSAGE-P${index + 1}`,
      sourceArea: 'PASSAGE_TEXT',
      text,
    })),
    media: [],
    upstreamFrozenBundleHashes: [],
  });
}

function buildItemPacket(manifest: Manifest, question: Question): SourcePacket {
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: `${manifest.caseId}-item`,
    sourceId: manifest.sourceId,
    questionNumber: manifest.questionNumber,
    scope: 'ITEM',
    documents: [
      { documentId: 'ITEM-STEM', sourceArea: 'STEM', text: question.stem },
      ...question.supplements.map((supplement, index) => ({
        documentId: `ITEM-S${index + 1}`,
        sourceArea: 'SCENARIO_TEXT' as const,
        text: supplement.text,
      })),
    ],
    media: [{
      mediaId: 'MEDIA1',
      sourceUrl: manifest.rawFiles.media.sourceUrl,
      localPath: manifest.rawFiles.media.path,
      mimeType: manifest.rawFiles.media.mimeType,
      contentHash: manifest.rawFiles.media.sha256,
      width: manifest.rawFiles.media.width,
      height: manifest.rawFiles.media.height,
      sourceArea: manifest.rawFiles.media.sourceArea,
      documentId: 'ITEM-S1',
    }],
    upstreamFrozenBundleHashes: [],
  });
}

function buildOptionsPacket(
  manifest: Manifest,
  question: Question,
  passageFreezeHash: string,
  itemFreezeHash: string,
): SourcePacket {
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: `${manifest.caseId}-options`,
    sourceId: manifest.sourceId,
    questionNumber: manifest.questionNumber,
    scope: 'OPTIONS',
    documents: question.choices.map((choice) => ({
      documentId: `C${choice.choice_number}`,
      sourceArea: 'CHOICE',
      text: choice.text,
    })),
    media: [],
    upstreamFrozenBundleHashes: [passageFreezeHash, itemFreezeHash],
  });
}

async function promptLocks(): Promise<Record<string, { path: string; sha256: string }>> {
  const names = [
    'passage-source-bundle-prompt-v1.md',
    'item-source-bundle-prompt-v1.md',
    'option-claim-bundle-prompt-v1.md',
    'source-bundle-audit-prompt-v1.md',
  ];
  return Object.fromEntries(await Promise.all(names.map(async (name) => {
    const path = resolve('packages/pipeline/experiments/problem-solving', name);
    return [name, { path, sha256: hashBytes(await readFile(path)) }];
  })));
}

function executionPlan(manifest: Manifest, packets: {
  passage: SourcePacket;
  item: SourcePacket;
}): unknown {
  const stages = [
    { stage: 'P1_PASSAGE_GENERATE', calls: 3, role: 'GENERATION', model: manifest.models.generation },
    { stage: 'I1_ITEM_GENERATE', calls: 1, role: 'GENERATION', model: manifest.models.generation },
    { stage: 'O1_OPTIONS_ATOMIZE', calls: 1, role: 'GENERATION', model: manifest.models.generation },
    ...manifest.models.auditVariants.flatMap((audit) => [
      { stage: 'P2A_PASSAGE_INDEPENDENT_READ', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'P2B_PASSAGE_COMPARE_THREE_CANDIDATES', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'I2A_ITEM_INDEPENDENT_READ', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'I2B_ITEM_COMPARE', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'O2A_OPTIONS_INDEPENDENT_ATOMIZE', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'O2B_OPTIONS_COMPARE', calls: 1, role: 'AUDIT', model: audit },
      { stage: 'M_MUTATION_COMPARE', calls: 5, role: 'AUDIT', model: audit },
    ]),
  ];
  return {
    experimentVersion: manifest.experimentVersion,
    mode: 'PREPARE_ONLY',
    apiCalled: false,
    sourcePacketHashes: {
      passage: canonicalSourcePacketHash(packets.passage),
      item: canonicalSourcePacketHash(packets.item),
      options: 'AVAILABLE_AFTER_PASSAGE_AND_ITEM_FREEZE',
    },
    stages,
    totalApiCalls: stages.reduce((sum, stage) => sum + stage.calls, 0),
    generationCalls: stages.filter((stage) => stage.role === 'GENERATION')
      .reduce((sum, stage) => sum + stage.calls, 0),
    auditCalls: stages.filter((stage) => stage.role === 'AUDIT')
      .reduce((sum, stage) => sum + stage.calls, 0),
    callsByAuditVariant: Object.fromEntries(manifest.models.auditVariants.map((audit) => [
      audit.id,
      stages.filter((stage) => stage.role === 'AUDIT' && stage.model.effort === audit.effort)
        .reduce((sum, stage) => sum + stage.calls, 0),
    ])),
    visionCalls: 11,
    stopConditions: [
      '원자료·프롬프트 해시 불일치',
      '정적 quote/media 계약 실패',
      '지문 3회 의미 fingerprint 불일치',
      'medium/high SourceAudit PASS 미달',
      '사람 기준 핵심 Source Claim 불일치',
      '변이 10회 중 REJECT 누락',
    ],
    downstreamAfterSourceFreeze: [
      'A_EXPLANATION_AUDIT',
      'G1_PASSAGE_GOLD_X3',
      'G2_PROBLEM_GOLD_X3',
      'STATIC_GATES_AND_B3',
      'C0_INDEPENDENT_SOLVE',
      'C1_COMPARISON_AUDIT',
      'HUMAN_APPROVAL',
    ],
  };
}

async function prepare(manifest: Manifest, outputRoot: string): Promise<{
  passagePacket: SourcePacket;
  itemPacket: SourcePacket;
  question: Question;
}> {
  const [resultBytes, enrichmentBytes] = await Promise.all([
    readLockedFile(manifest.rawFiles.result),
    readLockedFile(manifest.rawFiles.enrichment),
    readLockedFile(manifest.rawFiles.media),
  ]);
  const result = ResultSchema.parse(JSON.parse(resultBytes.toString('utf8')));
  const enrichment = EnrichmentSchema.parse(JSON.parse(enrichmentBytes.toString('utf8')));
  if (result.product_id !== manifest.sourceId || enrichment.product_id !== manifest.sourceId) {
    throw new Error('manifest sourceId와 원자료 product_id가 다르다.');
  }
  const question = result.questions.find((candidate) => (
    candidate.question_number === manifest.questionNumber
  ));
  const explanationQuestion = enrichment.questions.find((candidate) => (
    candidate.question_number === manifest.questionNumber
  ));
  if (question === undefined || explanationQuestion === undefined) {
    throw new Error('볼록렌즈 대상 문항 또는 해설을 찾지 못했다.');
  }
  if (!question.image_urls.includes(manifest.rawFiles.media.sourceUrl)) {
    throw new Error('manifest 이미지 URL이 대상 문항에 연결되어 있지 않다.');
  }
  const passagePacket = buildPassagePacket(manifest, result.passage);
  const itemPacket = buildItemPacket(manifest, question);
  const packetsJson = JSON.stringify({ passagePacket, itemPacket });
  if (/correct_choice|official_explanation|detailed_explanation|evaluationReference/u.test(packetsJson)) {
    throw new Error('Source packet에 정답·해설·평가 기준이 누출되었다.');
  }
  await Promise.all([
    writeJson(resolve(outputRoot, 'inputs/passage-source-packet.json'), passagePacket),
    writeJson(resolve(outputRoot, 'inputs/item-source-packet.json'), itemPacket),
    writeJson(resolve(outputRoot, 'inputs/raw-file-lock.json'), {
      result: manifest.rawFiles.result,
      enrichment: manifest.rawFiles.enrichment,
      media: manifest.rawFiles.media,
      prompts: await promptLocks(),
    }),
    writeJson(resolve(outputRoot, 'quarantined/explanation-reference.json'), {
      status: 'QUARANTINED_UNTIL_EXPLANATION_AUDIT',
      firstAllowedStage: manifest.auditIsolation.officialExplanationFirstAllowedStage,
      provenance: enrichment.source,
      contentType: explanationQuestion.official_explanation.content_type,
      generatedParaphraseMetadata: enrichment.generation,
      question: explanationQuestion,
    }),
    writeJson(resolve(outputRoot, 'quarantined/evaluation-reference.json'), {
      status: 'WITHHELD_FROM_ALL_SOURCE_API_CALLS',
      ...manifest.evaluationReference,
    }),
    writeJson(resolve(outputRoot, 'execution-plan.json'), executionPlan(manifest, {
      passage: passagePacket,
      item: itemPacket,
    })),
  ]);
  return { passagePacket, itemPacket, question };
}

async function persistCall<T>(directory: string, call: SourceApiCall<T>): Promise<void> {
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, 'raw-output.txt'), `${call.rawOutputText}\n`, 'utf8'),
    writeJson(resolve(directory, 'parsed-output.json'), call.parsedOutput),
    writeJson(resolve(directory, 'normalization.json'), { changes: call.normalizationChanges }),
    writeJson(resolve(directory, 'metadata.json'), call.metadata),
  ]);
}

function normalizeEntityText(value: string): string {
  return value.normalize('NFKC').replaceAll(/[^a-zA-Z0-9가-힣]/g, '').toLowerCase();
}

function includesEntity(value: string, entity: string): boolean {
  return normalizeEntityText(value).includes(normalizeEntityText(entity));
}

function lensBaselineChecks(passage: SourceBundle, item: SourceBundle): Record<string, boolean> {
  const hasRatio = (left: string, coefficient: number, right: string): boolean => (
    item.claims.some((claim) => claim.relation.kind === 'RATIO' &&
      includesEntity(claim.relation.left, left) &&
      claim.relation.coefficient === coefficient &&
      includesEntity(claim.relation.right, right))
  );
  return {
    p0_is_twice_p1: hasRatio('P0', 2, 'P1'),
    p0_is_half_p2: hasRatio('P0', 0.5, 'P2'),
    gap_is_square_proportional: passage.claims.some((claim) => (
      claim.relation.kind === 'PROPORTIONALITY' && claim.relation.exponent === 2
    )),
    p4_is_on_axis: item.claims.some((claim) => (
      claim.relation.kind === 'LOCATION' && includesEntity(claim.relation.entity, 'P4') &&
      claim.relation.relation === 'ON'
    )),
    e_is_between_c_and_d: item.claims.some((claim) => (
      claim.relation.kind === 'TOPOLOGY' && includesEntity(claim.relation.entity, 'E') &&
      claim.relation.relation === 'BETWEEN' &&
      claim.relation.references.some((reference) => includesEntity(reference, 'C')) &&
      claim.relation.references.some((reference) => includesEntity(reference, 'D'))
    )),
  };
}

function usageSummary(calls: readonly SourceApiCall<unknown>[]): unknown {
  const groups = new Map<string, SourceApiCall<unknown>[]>();
  for (const call of calls) {
    const key = `${call.metadata.model}/${call.metadata.effort}`;
    groups.set(key, [...(groups.get(key) ?? []), call]);
  }
  const summarize = (selected: readonly SourceApiCall<unknown>[]) => {
    const inputTokens = selected.reduce((sum, call) => sum + call.metadata.usage.inputTokens, 0);
    const outputTokens = selected.reduce((sum, call) => sum + call.metadata.usage.outputTokens, 0);
    const cacheReadTokens = selected.reduce(
      (sum, call) => sum + call.metadata.usage.cacheReadTokens,
      0,
    );
    const durationMs = selected.reduce((sum, call) => sum + call.metadata.durationMs, 0);
    const estimatedUsd = (
      (inputTokens - cacheReadTokens) * 2 / 1_000_000 +
      cacheReadTokens * 0.2 / 1_000_000 +
      outputTokens * 12 / 1_000_000
    );
    return {
      calls: selected.length,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      durationMs,
      estimatedUsd,
    };
  };
  return {
    pricingBasis: {
      model: 'gpt-5.6-terra',
      uncachedInputUsdPerMillion: 2,
      cachedInputUsdPerMillion: 0.2,
      outputUsdPerMillion: 12,
    },
    total: summarize(calls),
    byModelAndEffort: Object.fromEntries(
      [...groups.entries()].map(([key, selected]) => [key, summarize(selected)]),
    ),
  };
}

async function execute(
  manifest: Manifest,
  outputRoot: string,
  passagePacket: SourcePacket,
  itemPacket: SourcePacket,
  question: Question,
  resumePassageDirectories: Readonly<Record<number, string | undefined>> = {},
  resumePassageAuditIndependentDirectories: Readonly<Record<string, string | undefined>> = {},
): Promise<void> {
  const apiCalls: SourceApiCall<unknown>[] = [];
  const recoveredResponseIds: string[] = [];
  const remember = <T>(call: SourceApiCall<T>): SourceApiCall<T> => {
    apiCalls.push(call as SourceApiCall<unknown>);
    return call;
  };
  const passageBundles: SourceBundle[] = [];
  for (let run = 1; run <= manifest.repetitions.passageGeneration; run++) {
    const resumeDirectory = resumePassageDirectories[run];
    const shouldResume = resumeDirectory !== undefined;
    process.stdout.write(`[P1 ${run}/3] passage ${shouldResume ? 'recovery' : 'generation'}\n`);
    const generated = shouldResume
      ? remember(recoverGeneratedSourceBundle({
          packet: passagePacket,
          rawOutputText: await readFile(resolve(resumeDirectory, 'raw-output.txt'), 'utf8'),
          metadata: SourceApiCallMetadataSchema.parse(JSON.parse(await readFile(
            resolve(resumeDirectory, 'metadata.json'),
            'utf8',
          ))),
          model: manifest.models.generation.model,
          effort: manifest.models.generation.effort,
        }))
      : remember(await generateSourceBundle({
          packet: passagePacket,
          model: manifest.models.generation.model,
          effort: manifest.models.generation.effort,
        }));
    if (shouldResume) recoveredResponseIds.push(generated.metadata.responseId);
    await persistCall(resolve(outputRoot, `runs/passage/${run}/generation`), generated);
    const staticAudit = auditSourceBundleAgainstPacket(generated.parsedOutput, passagePacket);
    await writeJson(resolve(outputRoot, `runs/passage/${run}/static-audit.json`), staticAudit);
    if (!staticAudit.passed) throw new Error(`P1 ${run} 정적 검사 실패`);
    passageBundles.push(generated.parsedOutput);
  }
  if (passageBundles.length !== 3) throw new Error('지문 생성 후보는 정확히 3개여야 한다.');
  const passageCandidates = passageBundles as [SourceBundle, SourceBundle, SourceBundle];
  const passageAudits = new Map<AuditVariant['id'], Awaited<
    ReturnType<typeof auditSourceBundleCandidates>
  >>();
  for (const auditVariant of manifest.models.auditVariants) {
    process.stdout.write(`[P2 ${auditVariant.id}] passage independent + batch comparison\n`);
    const resumeDirectory = resumePassageAuditIndependentDirectories[auditVariant.id];
    const recoveredIndependentReading = resumeDirectory === undefined
      ? undefined
      : recoverIndependentSourceReading({
          packet: passagePacket,
          rawOutputText: await readFile(resolve(resumeDirectory, 'raw-output.txt'), 'utf8'),
          metadata: SourceApiCallMetadataSchema.parse(JSON.parse(await readFile(
            resolve(resumeDirectory, 'metadata.json'),
            'utf8',
          ))),
          model: auditVariant.model,
          effort: auditVariant.effort,
        });
    if (recoveredIndependentReading !== undefined) {
      recoveredResponseIds.push(recoveredIndependentReading.metadata.responseId);
    }
    const audited = await auditSourceBundleCandidates({
      packet: passagePacket,
      candidates: passageCandidates,
      model: auditVariant.model,
      effort: auditVariant.effort,
      ...(recoveredIndependentReading === undefined ? {} : { recoveredIndependentReading }),
      onIndependentReading: (call) => persistCall(
        resolve(outputRoot, `runs/audits/${auditVariant.id}/passage/independent`), call,
      ),
    });
    remember(audited.independentReading);
    remember(audited.comparisonAudit);
    await persistCall(
      resolve(outputRoot, `runs/audits/${auditVariant.id}/passage/comparison`),
      audited.comparisonAudit,
    );
    passageAudits.set(auditVariant.id, audited);
  }
  const frozenPassage = freezeSourceBundle({
    packet: passagePacket,
    generatedBundles: passageCandidates,
    audits: manifest.models.auditVariants.flatMap((variant) => (
      passageAudits.get(variant.id)!.comparisonAudit.parsedOutput.candidateAudits
        .map((entry) => entry.audit)
    )) as [
      Parameters<typeof freezeSourceBundle>[0]['audits'][number],
      ...Parameters<typeof freezeSourceBundle>[0]['audits'][number][],
    ],
    frozenAt: new Date().toISOString(),
  });
  await writeJson(resolve(outputRoot, 'frozen/passage-source-bundle.json'), frozenPassage);

  process.stdout.write('[I1 1/1] item generation\n');
  const generatedItem = remember(await generateSourceBundle({
    packet: itemPacket,
    model: manifest.models.generation.model,
    effort: manifest.models.generation.effort,
  }));
  await persistCall(resolve(outputRoot, 'runs/item/1/generation'), generatedItem);
  const itemStaticAudit = auditSourceBundleAgainstPacket(generatedItem.parsedOutput, itemPacket);
  await writeJson(resolve(outputRoot, 'runs/item/1/static-audit.json'), itemStaticAudit);
  if (!itemStaticAudit.passed) throw new Error('I1 정적 검사 실패');
  const itemAudits = new Map<AuditVariant['id'], Awaited<ReturnType<typeof auditSourceBundle>>>();
  for (const auditVariant of manifest.models.auditVariants) {
    process.stdout.write(`[I2 ${auditVariant.id}] item independent + comparison\n`);
    const audited = await auditSourceBundle({
      packet: itemPacket,
      candidate: generatedItem.parsedOutput,
      model: auditVariant.model,
      effort: auditVariant.effort,
      onIndependentReading: (call) => persistCall(
        resolve(outputRoot, `runs/audits/${auditVariant.id}/item/independent`), call,
      ),
    });
    remember(audited.independentReading);
    remember(audited.comparisonAudit);
    await persistCall(
      resolve(outputRoot, `runs/audits/${auditVariant.id}/item/comparison`),
      audited.comparisonAudit,
    );
    itemAudits.set(auditVariant.id, audited);
  }
  const frozenItem = freezeSourceBundle({
    packet: itemPacket,
    generatedBundles: [generatedItem.parsedOutput],
    audits: manifest.models.auditVariants.map((variant) => (
      itemAudits.get(variant.id)!.comparisonAudit.parsedOutput
    )) as [
      Parameters<typeof freezeSourceBundle>[0]['audits'][number],
      ...Parameters<typeof freezeSourceBundle>[0]['audits'][number][],
    ],
    frozenAt: new Date().toISOString(),
  });
  await writeJson(resolve(outputRoot, 'frozen/item-source-bundle.json'), frozenItem);

  const baselineChecks = lensBaselineChecks(frozenPassage.bundle, frozenItem.bundle);
  await writeJson(resolve(outputRoot, 'evaluation/lens-baseline-check.json'), {
    evaluationReferenceWasWithheldFromApi: true,
    checks: baselineChecks,
    passed: Object.values(baselineChecks).every(Boolean),
  });
  if (!Object.values(baselineChecks).every(Boolean)) {
    throw new Error('사람 기준 핵심 Source Claim과 생성 Bundle이 일치하지 않는다.');
  }

  const optionsPacket = buildOptionsPacket(
    manifest,
    question,
    sourceArtifactHash(frozenPassage),
    sourceArtifactHash(frozenItem),
  );
  await writeJson(resolve(outputRoot, 'inputs/options-source-packet.json'), optionsPacket);
  process.stdout.write('[O1 1/1] option atomization\n');
  const generatedOptions = remember(await generateOptionClaimBundle({
    packet: optionsPacket,
    model: manifest.models.generation.model,
    effort: manifest.models.generation.effort,
  }));
  await persistCall(resolve(outputRoot, 'runs/options/1/generation'), generatedOptions);
  const optionStaticAudit = auditOptionClaimBundleAgainstPacket(
    generatedOptions.parsedOutput,
    optionsPacket,
  );
  await writeJson(resolve(outputRoot, 'runs/options/1/static-audit.json'), optionStaticAudit);
  if (!optionStaticAudit.passed) throw new Error('O1 정적 검사 실패');
  const optionAudits = new Map<
    AuditVariant['id'],
    Awaited<ReturnType<typeof auditOptionClaimBundle>>
  >();
  for (const auditVariant of manifest.models.auditVariants) {
    process.stdout.write(`[O2 ${auditVariant.id}] options independent + comparison\n`);
    const audited = await auditOptionClaimBundle({
      packet: optionsPacket,
      candidate: generatedOptions.parsedOutput,
      model: auditVariant.model,
      effort: auditVariant.effort,
      onIndependentReading: (call) => persistCall(
        resolve(outputRoot, `runs/audits/${auditVariant.id}/options/independent`), call,
      ),
    });
    remember(audited.independentReading);
    remember(audited.comparisonAudit);
    await persistCall(
      resolve(outputRoot, `runs/audits/${auditVariant.id}/options/comparison`),
      audited.comparisonAudit,
    );
    optionAudits.set(auditVariant.id, audited);
  }
  const frozenOptions = freezeOptionClaimBundle({
    packet: optionsPacket,
    generatedBundles: [generatedOptions.parsedOutput],
    audits: manifest.models.auditVariants.map((variant) => (
      optionAudits.get(variant.id)!.comparisonAudit.parsedOutput
    )) as [
      Parameters<typeof freezeOptionClaimBundle>[0]['audits'][number],
      ...Parameters<typeof freezeOptionClaimBundle>[0]['audits'][number][],
    ],
    frozenAt: new Date().toISOString(),
  });
  await writeJson(resolve(outputRoot, 'frozen/option-claim-bundle.json'), frozenOptions);

  const mutationResults: Array<{
    mutationId: string;
    auditVariant: AuditVariant['id'];
    decision: string;
  }> = [];
  for (const mutation of manifest.mutations) {
    const original = mutation.scope === 'PASSAGE' ? frozenPassage.bundle : frozenItem.bundle;
    const packet = mutation.scope === 'PASSAGE' ? passagePacket : itemPacket;
    const mutated = applyLensMutation(original, mutation.kind);
    await writeJson(resolve(outputRoot, `mutations/${mutation.mutationId}/mutated-bundle.json`), mutated);
    for (const auditVariant of manifest.models.auditVariants) {
      process.stdout.write(`[${mutation.mutationId} ${auditVariant.id}] mutation comparison\n`);
      const independentReading = mutation.scope === 'PASSAGE'
        ? passageAudits.get(auditVariant.id)!.independentReading.parsedOutput
        : itemAudits.get(auditVariant.id)!.independentReading.parsedOutput;
      const audited = remember(await compareSourceBundleWithIndependentReading({
        packet,
        candidate: mutated,
        independentReading,
        model: auditVariant.model,
        effort: auditVariant.effort,
      }));
      await persistCall(
        resolve(outputRoot, `mutations/${mutation.mutationId}/${auditVariant.id}`),
        audited,
      );
      mutationResults.push({
        mutationId: mutation.mutationId,
        auditVariant: auditVariant.id,
        decision: audited.parsedOutput.overallDecision,
      });
    }
  }
  const rejected = mutationResults.filter((result) => result.decision === 'REJECT').length;
  const generalAuditDecisions = Object.fromEntries(manifest.models.auditVariants.map((variant) => {
    const passage = passageAudits.get(variant.id)!.comparisonAudit.parsedOutput.candidateAudits
      .map((entry) => entry.audit.overallDecision);
    return [variant.id, {
      passage,
      item: itemAudits.get(variant.id)!.comparisonAudit.parsedOutput.overallDecision,
      options: optionAudits.get(variant.id)!.comparisonAudit.parsedOutput.overallDecision,
    }];
  }));
  const mutationDecisions = Object.fromEntries(manifest.models.auditVariants.map((variant) => [
    variant.id,
    mutationResults.filter((result) => result.auditVariant === variant.id)
      .map(({ mutationId, decision }) => ({ mutationId, decision })),
  ]));
  const expectedApiCalls = 27;
  const summary = {
    experimentVersion: manifest.experimentVersion,
    status: rejected === 10 && apiCalls.length === expectedApiCalls
      ? 'SOURCE_VERTICAL_PASS'
      : 'SOURCE_VERTICAL_FAIL',
    sourceBundlesFrozen: true,
    baselineChecks,
    generalAuditDecisions,
    mutationDecisions,
    mutationRejectCount: rejected,
    mutationAuditCount: mutationResults.length,
    mutationResults,
    apiCallCount: apiCalls.length,
    expectedApiCallCount: expectedApiCalls,
    usage: usageSummary(apiCalls),
    recoveredResponseIds,
    downstreamStatus: 'READY_FOR_SEPARATELY_APPROVED_GOLD_VERTICAL',
  };
  await writeJson(resolve(outputRoot, 'source-vertical-summary.json'), summary);
  if (apiCalls.length !== expectedApiCalls) {
    throw new Error(`API 호출 수 ${apiCalls.length}/${expectedApiCalls}: 계획과 불일치`);
  }
  if (rejected !== 10) throw new Error(`변이 거부 ${rejected}/10: 성공 기준 미달`);
}

async function main(): Promise<void> {
  const manifestPath = resolve(option('--manifest') ?? DEFAULT_MANIFEST);
  const outputRoot = resolve(option('--output-root') ?? DEFAULT_OUTPUT_ROOT);
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  const prepared = await prepare(manifest, outputRoot);
  const shouldExecute = process.argv.includes('--execute');
  if (!shouldExecute) {
    process.stdout.write(`${JSON.stringify({
      status: 'PREPARED_NO_API_CALLS',
      outputRoot,
      passagePacketHash: canonicalSourcePacketHash(prepared.passagePacket),
      itemPacketHash: canonicalSourcePacketHash(prepared.itemPacket),
    }, null, 2)}\n`);
    return;
  }
  const approvalId = option('--approval-id');
  if (approvalId !== manifest.apiExecutionApproval.requiredApprovalId) {
    throw new Error(
      `유료 API 실행에는 --approval-id=${manifest.apiExecutionApproval.requiredApprovalId}가 필요하다.`,
    );
  }
  await execute(
    manifest,
    outputRoot,
    prepared.passagePacket,
    prepared.itemPacket,
    prepared.question,
    {
      1: option('--resume-passage-run1'),
      2: option('--resume-passage-run2'),
      3: option('--resume-passage-run3'),
    },
    {
      'terra-medium': option('--resume-passage-audit-independent-terra-medium'),
      'terra-high': option('--resume-passage-audit-independent-terra-high'),
    },
  );
}

try {
  await main();
} catch (error) {
  if (error instanceof SourceApiOutputValidationError) {
    const outputRoot = resolve(option('--output-root') ?? DEFAULT_OUTPUT_ROOT);
    const failureDirectory = resolve(
      outputRoot,
      'failures',
      `${error.metadata.promptVersion}-${error.metadata.responseId}`,
    );
    await mkdir(failureDirectory, { recursive: true });
    await Promise.all([
      writeFile(resolve(failureDirectory, 'raw-output.txt'), `${error.rawOutputText}\n`, 'utf8'),
      writeJson(resolve(failureDirectory, 'metadata.json'), error.metadata),
      writeJson(resolve(failureDirectory, 'validation-error.json'), {
        name: error.name,
        message: error.message,
      }),
    ]);
  }
  throw error;
}
