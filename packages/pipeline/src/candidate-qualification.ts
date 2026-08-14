import { readFileSync } from 'node:fs';

import { z } from 'zod/v4';

import type { Gold } from './gold.js';
import {
  GOLD_GENERATION_CONFIG,
  GoldGenerationMetadataSchema,
  goldGeneratorFingerprint,
  normalizeGoldSource,
} from './gold-generation-metadata.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from './llm/query-gen.js';
import {
  SemanticVerificationRecordV2Schema,
  assertV2QualificationGate,
  parseCompatibleVerificationRecord,
  type SemanticAssetType,
} from './semantic-qualification.js';
import {
  semanticCandidateHash,
  semanticSourceHash,
  sha256,
  validateGoldStructure,
  validateQueryStructure,
} from './semantic-verification.js';
import type { PassageSourceFixture } from './source-fixture.js';
import { assertPassageSourceFixtureIntegrity, PassageSourceFixtureSchema, sourceTextHash } from './source-fixture.js';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const ContextFootnoteSchema = z.object({
  id: z.string().min(1),
  marker: z.string().min(1),
  targetTerm: z.string().min(1),
  text: z.string().min(1),
});

export const SourceBundleSchema = z.object({
  schemaVersion: z.literal('semantic-source-bundle-v1'),
  canonicalizationVersion: z.literal('semantic-source-bundle-canonical-v1'),
  sourceSetId: z.string().min(1),
  sourceParagraphId: z.string().min(1),
  primaryText: z.string().min(1),
  contextOnlyFootnotes: z.array(ContextFootnoteSchema),
  sourceHash: Sha256Schema,
  contextHash: Sha256Schema,
  verifierInputHash: Sha256Schema,
});

export type SourceBundle = z.infer<typeof SourceBundleSchema>;

export const CandidateGenerationProvenanceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  effort: z.string().min(1),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  generatorFingerprint: Sha256Schema,
});

export type CandidateGenerationProvenance = z.infer<typeof CandidateGenerationProvenanceSchema>;

export function candidateGeneratorFingerprint(
  provenance: Pick<CandidateGenerationProvenance, 'provider' | 'model' | 'effort' | 'promptVersion' | 'schemaVersion'>,
): string {
  return sha256(JSON.stringify({
    provider: provenance.provider,
    model: provenance.model,
    effort: provenance.effort,
    promptVersion: provenance.promptVersion,
    schemaVersion: provenance.schemaVersion,
  }));
}

const QualificationAssetLinkSchema = z.object({
  assetType: z.enum(['gold', 'query', 'title-query']),
  verifierKind: z.enum(['gold', 'query', 'title-query']),
  candidatePath: z.string().min(1),
  candidateHash: Sha256Schema,
  qualificationStatus: z.enum(['pending', 'qualified', 'incomplete', 'quarantined']),
  qualificationRecordPath: z.string().min(1).optional(),
  qualificationRecordHash: Sha256Schema.optional(),
  generationProvenance: CandidateGenerationProvenanceSchema.optional(),
});

const RegressionBindingSchema = z.object({
  status: z.enum(['pending', 'passed', 'failed']),
  probeCount: z.number().int().nonnegative(),
  candidateQueryHash: Sha256Schema,
  fixturePath: z.string().min(1).optional(),
  fixtureHash: Sha256Schema.optional(),
  resultPath: z.string().min(1).optional(),
  resultHash: Sha256Schema.optional(),
});

export const QualificationManifestSchema = z.object({
  schemaVersion: z.literal('semantic-qualification-manifest-v1'),
  paragraphId: z.string().min(1),
  mode: z.enum(['new', 'legacy-requalification']),
  sourceFixturePath: z.string().min(1),
  sourceSetId: z.string().min(1),
  sourceParagraphId: z.string().min(1),
  sourceHash: Sha256Schema,
  contextHash: Sha256Schema,
  verifierInputHash: Sha256Schema,
  preflight: z.object({
    status: z.enum(['passed', 'blocked']),
    reasons: z.array(z.string()),
  }),
  assets: z.object({
    gold: QualificationAssetLinkSchema.optional(),
    query: QualificationAssetLinkSchema.optional(),
    titleQuery: QualificationAssetLinkSchema.optional(),
  }),
  regression: RegressionBindingSchema,
  provenancePreserved: z.boolean(),
  requalificationHistory: z.array(z.object({
    at: z.string().datetime(),
    note: z.string().min(1),
  })),
  promotionStatus: z.enum(['blocked', 'ready']),
  promotionBlockers: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export type QualificationManifest = z.infer<typeof QualificationManifestSchema>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function qualificationArtifactHash(value: unknown): string {
  return sha256(canonical(value));
}

function canonicalContext(footnotes: SourceBundle['contextOnlyFootnotes']): string {
  return canonical({ role: 'contextOnlyFootnotes', items: footnotes });
}

export function verifierInputText(bundle: Pick<SourceBundle, 'primaryText' | 'contextOnlyFootnotes'>): string {
  const context = bundle.contextOnlyFootnotes.length === 0
    ? '(없음)'
    : bundle.contextOnlyFootnotes.map((footnote) => `${footnote.id}: ${footnote.text}`).join('\n');
  return [
    '[PRIMARY_TEXT — 의미 명제의 유일한 본문]',
    bundle.primaryText,
    '',
    '[CONTEXT_ONLY_FOOTNOTES — 용어 해석 문맥이며 그 자체를 필수 명제로 요구하지 않음]',
    context,
  ].join('\n');
}

export function buildSourceBundle(fixtureValue: unknown, sourceParagraphId: string): SourceBundle {
  const fixture = assertPassageSourceFixtureIntegrity(fixtureValue);
  const paragraph = fixture.paragraphs.find((item) => item.id === sourceParagraphId);
  if (paragraph === undefined) throw new Error(`${sourceParagraphId}: source fixture 문단 없음`);
  const contextOnlyFootnotes = fixture.footnotes
    .filter((footnote) => footnote.targetParagraphId === sourceParagraphId)
    .map(({ id, marker, targetTerm, text }) => ({ id, marker, targetTerm, text }));
  const partial = {
    schemaVersion: 'semantic-source-bundle-v1' as const,
    canonicalizationVersion: 'semantic-source-bundle-canonical-v1' as const,
    sourceSetId: fixture.sourceSetId,
    sourceParagraphId,
    primaryText: paragraph.text,
    contextOnlyFootnotes,
    sourceHash: sourceTextHash(paragraph.text),
    contextHash: sha256(canonicalContext(contextOnlyFootnotes)),
  };
  return SourceBundleSchema.parse({
    ...partial,
    verifierInputHash: semanticSourceHash(verifierInputText(partial)),
  });
}

export function readSourceFixture(path: string): PassageSourceFixture {
  return PassageSourceFixtureSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export interface CandidateSet {
  readonly gold: Gold;
  readonly query: GeneratedQuerySet;
  readonly titleQuery: GeneratedQuerySet;
  readonly rawGold: Record<string, unknown>;
  readonly rawQuery: Record<string, unknown>;
  readonly rawTitleQuery: Record<string, unknown>;
}

export function parseCandidateSet(args: {
  readonly paragraphId: string;
  readonly gold: unknown;
  readonly query: unknown;
  readonly titleQuery: unknown;
}): CandidateSet {
  if (args.gold === null || typeof args.gold !== 'object') throw new Error('gold candidate가 객체가 아니다');
  if (args.query === null || typeof args.query !== 'object') throw new Error('query candidate가 객체가 아니다');
  if (args.titleQuery === null || typeof args.titleQuery !== 'object') throw new Error('title-query candidate가 객체가 아니다');
  const rawGold = args.gold as Record<string, unknown>;
  const rawQuery = args.query as Record<string, unknown>;
  const rawTitleQuery = args.titleQuery as Record<string, unknown>;
  const gold = rawGold as unknown as Gold;
  const query = GeneratedQuerySetSchema.parse(rawQuery) as GeneratedQuerySet;
  const titleQuery = GeneratedQuerySetSchema.parse(rawTitleQuery) as GeneratedQuerySet;
  if (gold.paragraphId !== args.paragraphId) throw new Error(`gold paragraphId 불일치: ${gold.paragraphId}`);
  if (query.paragraphId !== args.paragraphId) throw new Error(`query paragraphId 불일치: ${query.paragraphId}`);
  if (titleQuery.paragraphId !== args.paragraphId) throw new Error(`title-query paragraphId 불일치: ${titleQuery.paragraphId}`);
  return { gold, query, titleQuery, rawGold, rawQuery, rawTitleQuery };
}

export function candidateSourceText(gold: Gold): string {
  return gold.sentences.map((sentence) => sentence.text).join(' ');
}

function extractGenerationProvenance(
  assetType: SemanticAssetType,
  raw: Record<string, unknown>,
  sidecar?: CandidateGenerationProvenance,
): CandidateGenerationProvenance | undefined {
  if (sidecar !== undefined) return CandidateGenerationProvenanceSchema.parse(sidecar);
  if (assetType !== 'gold' || raw['generationMetadata'] === undefined) return undefined;
  const metadata = GoldGenerationMetadataSchema.parse(raw['generationMetadata']);
  return CandidateGenerationProvenanceSchema.parse({
    provider: metadata.provider,
    model: metadata.model,
    effort: metadata.effort,
    promptVersion: metadata.promptVersion,
    schemaVersion: metadata.schemaVersion,
    generatedAt: metadata.generatedAt,
    generatorFingerprint: metadata.generatorFingerprint,
  });
}

export interface QualificationCallEstimate {
  readonly selectedAssets: number;
  readonly verifier: { readonly minimum: number; readonly maximum: number };
  readonly repair: { readonly minimum: number; readonly maximum: number };
  readonly regression: number;
  readonly logicalLlmInvocations: { readonly minimum: number; readonly maximum: number };
  readonly httpAttemptsIncludingRetries: { readonly minimum: number; readonly maximum: number };
  readonly maxRetriesPerLogicalInvocation: number;
}

export function qualificationCallEstimate(selectedAssets: number, regressionProbes: number): QualificationCallEstimate {
  const verifierMinimum = selectedAssets * 2;
  // clean1→blocker→repair를 두 cycle 반복한 뒤 clean2를 쌓는 최장 성공 경로는 asset당 verifier 6회다.
  const verifierMaximum = selectedAssets * 6;
  const repairMaximum = selectedAssets * 2;
  const minimum = verifierMinimum + regressionProbes;
  const maximum = verifierMaximum + repairMaximum + regressionProbes;
  return {
    selectedAssets,
    verifier: { minimum: verifierMinimum, maximum: verifierMaximum },
    repair: { minimum: 0, maximum: repairMaximum },
    regression: regressionProbes,
    logicalLlmInvocations: { minimum, maximum },
    httpAttemptsIncludingRetries: { minimum, maximum: maximum * 5 },
    maxRetriesPerLogicalInvocation: 4,
  };
}

export interface QualificationPlan {
  readonly bundle: SourceBundle;
  readonly candidates: CandidateSet;
  readonly mode: 'new' | 'legacy-requalification';
  readonly preflightReasons: readonly string[];
  readonly generation: Readonly<Record<SemanticAssetType, CandidateGenerationProvenance | undefined>>;
  readonly existingRecordVersions: Readonly<Record<SemanticAssetType, 'missing' | 'v1' | 'v2'>>;
  readonly estimate: QualificationCallEstimate;
}

export interface QualificationDryRunSummary {
  readonly dryRun: true;
  readonly paragraphId: string;
  readonly mode: QualificationPlan['mode'];
  readonly source: {
    readonly sourceSetId: string;
    readonly sourceParagraphId: string;
    readonly sourceHash: string;
    readonly contextHash: string;
    readonly verifierInputHash: string;
    readonly contextOnlyFootnoteCount: number;
  };
  readonly existingRecordVersions: QualificationPlan['existingRecordVersions'];
  readonly preflight: QualificationManifest['preflight'];
  readonly estimate: QualificationCallEstimate;
  readonly promotionStatus: QualificationManifest['promotionStatus'];
  readonly promotionBlockers: readonly string[];
}

/** API client나 환경 변수를 참조하지 않는 dry-run 전용 projection이다. */
export function createQualificationDryRunSummary(
  paragraphId: string,
  plan: QualificationPlan,
  manifest: QualificationManifest,
): QualificationDryRunSummary {
  return {
    dryRun: true,
    paragraphId,
    mode: plan.mode,
    source: {
      sourceSetId: plan.bundle.sourceSetId,
      sourceParagraphId: plan.bundle.sourceParagraphId,
      sourceHash: plan.bundle.sourceHash,
      contextHash: plan.bundle.contextHash,
      verifierInputHash: plan.bundle.verifierInputHash,
      contextOnlyFootnoteCount: plan.bundle.contextOnlyFootnotes.length,
    },
    existingRecordVersions: plan.existingRecordVersions,
    preflight: manifest.preflight,
    estimate: plan.estimate,
    promotionStatus: manifest.promotionStatus,
    promotionBlockers: manifest.promotionBlockers,
  };
}

export function planCandidateQualification(args: {
  readonly paragraphId: string;
  readonly sourceFixture: unknown;
  readonly sourceParagraphId: string;
  readonly gold: unknown;
  readonly query: unknown;
  readonly titleQuery: unknown;
  readonly mode: 'new' | 'legacy-requalification';
  readonly selectedAssetTypes?: readonly SemanticAssetType[];
  readonly regressionProbes: number;
  readonly generationSidecars?: Partial<Record<SemanticAssetType, CandidateGenerationProvenance>>;
  readonly sourceFixtureTracked?: boolean;
}): QualificationPlan {
  const bundle = buildSourceBundle(args.sourceFixture, args.sourceParagraphId);
  const candidates = parseCandidateSet({
    paragraphId: args.paragraphId,
    gold: args.gold,
    query: args.query,
    titleQuery: args.titleQuery,
  });
  const preflightReasons: string[] = [];
  if (args.sourceFixtureTracked === false) preflightReasons.push('tracked source binding 없음');
  try { validateGoldStructure(candidates.gold); } catch (error) {
    preflightReasons.push(error instanceof Error ? error.message : 'gold 구조 검사 실패');
  }
  try { validateQueryStructure(candidates.gold, candidates.query); } catch (error) {
    preflightReasons.push(error instanceof Error ? error.message : 'query 구조 검사 실패');
  }
  try { validateQueryStructure(candidates.gold, candidates.titleQuery); } catch (error) {
    preflightReasons.push(error instanceof Error ? error.message : 'title-query 구조 검사 실패');
  }
  const titleQueries = candidates.titleQuery.regions[0]?.queries ?? [];
  if (candidates.titleQuery.regions.length !== 1 || titleQueries.length !== 3
    || ['qT1', 'qT2', 'qT3'].some((id) => !titleQueries.some((query) => query.id === id))) {
    preflightReasons.push('title-query 구조 검사 실패: 1개 영역과 qT1~qT3가 필요하다');
  }
  const candidateText = candidateSourceText(candidates.gold);
  if (normalizeGoldSource(candidateText) !== normalizeGoldSource(bundle.primaryText)) {
    preflightReasons.push(`tracked source mismatch: candidate=${sourceTextHash(candidateText)} fixture=${bundle.sourceHash}`);
  }

  const rawByType: Record<SemanticAssetType, Record<string, unknown>> = {
    gold: candidates.rawGold,
    query: candidates.rawQuery,
    'title-query': candidates.rawTitleQuery,
  };
  const generation = Object.fromEntries(
    (['gold', 'query', 'title-query'] as const).map((assetType) => [
      assetType,
      extractGenerationProvenance(assetType, rawByType[assetType], args.generationSidecars?.[assetType]),
    ]),
  ) as Record<SemanticAssetType, CandidateGenerationProvenance | undefined>;
  if (args.mode === 'new') {
    for (const assetType of ['gold', 'query', 'title-query'] as const) {
      const provenance = generation[assetType];
      if (provenance === undefined) preflightReasons.push(`${assetType}: generation provenance 없음`);
      if (provenance !== undefined && provenance.generatorFingerprint !== candidateGeneratorFingerprint(provenance)) {
        preflightReasons.push(`${assetType}: generation provenance fingerprint 불일치`);
      }
      if (assetType === 'gold' && provenance !== undefined
        && provenance.generatorFingerprint !== goldGeneratorFingerprint(GOLD_GENERATION_CONFIG)) {
        preflightReasons.push('gold: 현재 generator fingerprint 불일치');
      }
    }
  }

  const existingRecordVersions = Object.fromEntries(
    (['gold', 'query', 'title-query'] as const).map((assetType) => {
      const value = rawByType[assetType]['semanticVerification'];
      if (value === undefined) return [assetType, 'missing'];
      try {
        return [assetType, parseCompatibleVerificationRecord(value).version];
      } catch {
        return [assetType, 'missing'];
      }
    }),
  ) as Record<SemanticAssetType, 'missing' | 'v1' | 'v2'>;
  const selected = args.selectedAssetTypes ?? ['gold', 'query', 'title-query'];
  return {
    bundle,
    candidates,
    mode: args.mode,
    preflightReasons,
    generation,
    existingRecordVersions,
    estimate: qualificationCallEstimate(selected.length, args.regressionProbes),
  };
}

export function buildPendingQualificationManifest(args: {
  readonly plan: QualificationPlan;
  readonly paragraphId: string;
  readonly sourceFixturePath: string;
  readonly candidatePaths: Readonly<Record<SemanticAssetType, string>>;
  readonly regressionProbes: number;
  readonly regressionFixturePath?: string;
  readonly createdAt?: string;
}): QualificationManifest {
  const candidateByType = {
    gold: args.plan.candidates.gold,
    query: args.plan.candidates.query,
    'title-query': args.plan.candidates.titleQuery,
  } as const;
  const assets = Object.fromEntries((['gold', 'query', 'title-query'] as const).map((assetType) => {
    const key = assetType === 'title-query' ? 'titleQuery' : assetType;
    return [key, {
      assetType,
      verifierKind: assetType,
      candidatePath: args.candidatePaths[assetType],
      candidateHash: semanticCandidateHash(candidateByType[assetType]),
      qualificationStatus: 'pending',
      ...(args.plan.generation[assetType] === undefined ? {} : { generationProvenance: args.plan.generation[assetType] }),
    }];
  }));
  const blockers = [
    ...args.plan.preflightReasons,
    ...(['gold', 'query', 'title-query'] as const)
      .filter((assetType) => args.plan.existingRecordVersions[assetType] !== 'v2')
      .map((assetType) => `${assetType}: v2 qualification 필요`),
    'production-query regression proof pending',
  ];
  return QualificationManifestSchema.parse({
    schemaVersion: 'semantic-qualification-manifest-v1',
    paragraphId: args.paragraphId,
    mode: args.plan.mode,
    sourceFixturePath: args.sourceFixturePath,
    sourceSetId: args.plan.bundle.sourceSetId,
    sourceParagraphId: args.plan.bundle.sourceParagraphId,
    sourceHash: args.plan.bundle.sourceHash,
    contextHash: args.plan.bundle.contextHash,
    verifierInputHash: args.plan.bundle.verifierInputHash,
    preflight: { status: args.plan.preflightReasons.length === 0 ? 'passed' : 'blocked', reasons: args.plan.preflightReasons },
    assets,
    regression: {
      status: 'pending',
      probeCount: args.regressionProbes,
      candidateQueryHash: semanticCandidateHash(args.plan.candidates.query),
      ...(args.regressionFixturePath === undefined ? {} : { fixturePath: args.regressionFixturePath }),
    },
    provenancePreserved: args.plan.mode === 'legacy-requalification',
    requalificationHistory: [],
    promotionStatus: 'blocked',
    promotionBlockers: blockers,
    createdAt: args.createdAt ?? new Date().toISOString(),
  });
}

export function assertCandidatePromotionGate(args: {
  readonly manifest: unknown;
  readonly bundle: SourceBundle;
  readonly loadJson: (path: string) => unknown;
  readonly verifierFingerprints: Readonly<Record<SemanticAssetType, string>>;
}): void {
  const manifest = QualificationManifestSchema.parse(args.manifest);
  if (manifest.sourceHash !== args.bundle.sourceHash
    || manifest.contextHash !== args.bundle.contextHash
    || manifest.verifierInputHash !== args.bundle.verifierInputHash) {
    throw new Error('qualification source bundle hash 불일치');
  }
  if (manifest.preflight.status !== 'passed' || manifest.preflight.reasons.length !== 0) {
    throw new Error('qualification deterministic preflight 미통과');
  }
  const links = [manifest.assets.gold, manifest.assets.query, manifest.assets.titleQuery];
  if (links.some((link) => link === undefined)) throw new Error('qualification asset link 누락');
  const sourceInput = verifierInputText(args.bundle);
  for (const link of links) {
    if (link === undefined || link.qualificationRecordPath === undefined || link.qualificationRecordHash === undefined) {
      throw new Error('qualification v2 record binding 없음');
    }
    const loadedCandidate = args.loadJson(link.candidatePath);
    const candidate = link.assetType === 'gold'
      ? loadedCandidate as Gold
      : GeneratedQuerySetSchema.parse(loadedCandidate) as GeneratedQuerySet;
    if (semanticCandidateHash(candidate) !== link.candidateHash) throw new Error(`${link.assetType}: candidate hash 불일치`);
    const recordValue = args.loadJson(link.qualificationRecordPath);
    if (qualificationArtifactHash(recordValue) !== link.qualificationRecordHash) throw new Error(`${link.assetType}: qualification record hash 불일치`);
    const record = SemanticVerificationRecordV2Schema.parse(recordValue);
    assertV2QualificationGate({
      record,
      expectedAssetType: link.assetType,
      expectedVerifierKind: link.verifierKind,
      sourceText: sourceInput,
      evidenceSourceTexts: [args.bundle.primaryText, ...args.bundle.contextOnlyFootnotes.map((footnote) => footnote.text)],
      candidate,
      verifierFingerprint: args.verifierFingerprints[link.assetType],
      loadReport: args.loadJson,
    });
    if (manifest.mode === 'new' && link.generationProvenance === undefined) {
      throw new Error(`${link.assetType}: 신규 generation provenance 없음`);
    }
    if (manifest.mode === 'new' && link.generationProvenance !== undefined
      && link.generationProvenance.generatorFingerprint !== candidateGeneratorFingerprint(link.generationProvenance)) {
      throw new Error(`${link.assetType}: 신규 generation provenance fingerprint 불일치`);
    }
  }
  if (manifest.mode === 'legacy-requalification') {
    if (!manifest.provenancePreserved || manifest.requalificationHistory.length === 0) {
      throw new Error('legacy requalification history 없음');
    }
  }
  if (manifest.regression.status !== 'passed'
    || manifest.regression.fixturePath === undefined
    || manifest.regression.fixtureHash === undefined
    || manifest.regression.resultPath === undefined
    || manifest.regression.resultHash === undefined) {
    throw new Error('production-query regression proof 미완료');
  }
  const regressionFixture = args.loadJson(manifest.regression.fixturePath);
  const regressionResult = args.loadJson(manifest.regression.resultPath);
  if (qualificationArtifactHash(regressionFixture) !== manifest.regression.fixtureHash
    || qualificationArtifactHash(regressionResult) !== manifest.regression.resultHash) {
    throw new Error('production-query regression artifact hash 불일치');
  }
  if (manifest.regression.candidateQueryHash !== manifest.assets.query?.candidateHash) {
    throw new Error('regression candidate query hash 불일치');
  }
  if (manifest.promotionStatus !== 'ready' || manifest.promotionBlockers.length !== 0) {
    throw new Error('candidate promotion readiness 미완료');
  }
}
