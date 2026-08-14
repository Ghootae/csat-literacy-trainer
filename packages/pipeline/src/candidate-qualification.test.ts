import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  QualificationManifestSchema,
  assertCandidatePromotionGate,
  buildPendingQualificationManifest,
  buildSourceBundle,
  candidateGeneratorFingerprint,
  createQualificationDryRunSummary,
  planCandidateQualification,
  qualificationArtifactHash,
  verifierInputText,
  type CandidateGenerationProvenance,
  type QualificationManifest,
} from './candidate-qualification.js';
import { GOLD_GENERATION_CONFIG, goldGeneratorFingerprint } from './gold-generation-metadata.js';
import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  makeVerificationRecordV2,
  runSemanticQualification,
  type SemanticAssetType,
} from './semantic-qualification.js';
import {
  SEMANTIC_REPORT_SCHEMA_VERSION,
  semanticCandidateHash,
  semanticVerifierFingerprint,
  sha256,
  type SemanticVerificationReport,
} from './semantic-verification.js';
import { assemblePassageSource, sourceTextHash, type PassageSourceFixture } from './source-fixture.js';

const ROOT = process.cwd();
const PARAGRAPH_ID = 'photosynthesis-p4';
const CLEAN: SemanticVerificationReport = { summary: 'clean', issues: [] };

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as T;
}

function candidates() {
  return {
    gold: readJson<Gold>(`content/${PARAGRAPH_ID}/gold.json`),
    query: readJson<GeneratedQuerySet>(`content/${PARAGRAPH_ID}/queries.json`),
    titleQuery: readJson<GeneratedQuerySet>(`content/${PARAGRAPH_ID}/title-queries.json`),
  };
}

function sourceFixture(primaryText?: string, footnoteText = '광호흡은 빛이 있을 때 일어난다.'): PassageSourceFixture {
  const text = primaryText ?? readJson<{ text: string }>(`content/${PARAGRAPH_ID}/passage.json`).text;
  const fixture = {
    schemaVersion: 'passage-source-v1' as const,
    sourceSetId: 'test-source-set',
    passageId: 'test-passage',
    title: '테스트 지문',
    field: '과학',
    exam: { grade: '고3', year: 2026, month: 8, administrator: 'test', questionRange: '1~4' },
    provenance: { localPath: 'ignored/test.json', runtimeDependency: false as const, comparedFields: ['passage'] },
    hashContract: {
      algorithm: 'sha256' as const,
      encoding: 'utf8' as const,
      normalization: 'normalizeGoldSource-v1' as const,
      normalizationRule: 'CRLF를 LF로 바꾸고 양끝 공백만 제거',
      fullSourceAssembly: 'paragraphs-then-footnotes-joined-with-LF' as const,
    },
    fullSourceHash: sourceTextHash('placeholder'),
    paragraphs: [{ id: 'p4', order: 1, text, hash: sourceTextHash(text) }],
    footnotes: [{
      id: 'fn1', order: 1, marker: '*', targetParagraphId: 'p4', targetTerm: '광호흡',
      text: footnoteText,
    }],
  };
  return { ...fixture, fullSourceHash: sourceTextHash(assemblePassageSource(fixture)) };
}

function provenance(assetType: SemanticAssetType): CandidateGenerationProvenance {
  const base = {
    provider: 'anthropic',
    model: 'claude-opus-4-8',
    effort: 'medium',
    promptVersion: `${assetType}-prompt-v1`,
    schemaVersion: `${assetType}-schema-v1`,
    generatedAt: '2026-08-14T00:00:00.000Z',
  };
  return {
    ...base,
    generatorFingerprint: assetType === 'gold'
      ? goldGeneratorFingerprint(GOLD_GENERATION_CONFIG)
      : candidateGeneratorFingerprint(base),
  };
}

function makePlan(mode: 'new' | 'legacy-requalification', fixture = sourceFixture()) {
  const value = candidates();
  return planCandidateQualification({
    paragraphId: PARAGRAPH_ID,
    sourceFixture: fixture,
    sourceParagraphId: 'p4',
    ...value,
    mode,
    regressionProbes: 4,
    ...(mode === 'new' ? {
      generationSidecars: {
        gold: provenance('gold'), query: provenance('query'), 'title-query': provenance('title-query'),
      },
    } : {}),
  });
}

const CANDIDATE_PATHS = {
  gold: 'candidate/gold.json',
  query: 'candidate/queries.json',
  'title-query': 'candidate/title-queries.json',
} as const;

describe('source-bound candidate qualification', () => {
  it('본문과 각주 변경을 서로 다른 hash 역할로 결속한다', () => {
    const base = buildSourceBundle(sourceFixture(), 'p4');
    const primaryChanged = buildSourceBundle(sourceFixture(`${base.primaryText} 변경`), 'p4');
    const contextChanged = buildSourceBundle(sourceFixture(base.primaryText, '변경된 설명 각주'), 'p4');

    expect(primaryChanged.rawSourceHash).not.toBe(base.rawSourceHash);
    expect(primaryChanged.qualificationSourceHash).not.toBe(base.qualificationSourceHash);
    expect(primaryChanged.verifierInputHash).not.toBe(base.verifierInputHash);
    expect(contextChanged.rawSourceHash).toBe(base.rawSourceHash);
    expect(contextChanged.qualificationSourceHash).toBe(base.qualificationSourceHash);
    expect(contextChanged.ignoredFootnotesHash).not.toBe(base.ignoredFootnotesHash);
    expect(contextChanged.verifierInputHash).toBe(base.verifierInputHash);
    expect(base.primaryText).not.toContain('광호흡은 빛이 있을 때 일어난다.');
    expect(verifierInputText(base)).not.toContain('광호흡은 빛이 있을 때 일어난다.');
    expect(verifierInputText(base)).toContain('[FOOTNOTES_IGNORED');
  });

  it('tracked source fixture의 저장 hash가 실제 문자열과 다르면 fail-closed한다', () => {
    const fixture = sourceFixture();
    const tampered = {
      ...fixture,
      paragraphs: fixture.paragraphs.map((paragraph) => ({ ...paragraph, text: `${paragraph.text} 변조` })),
    };
    expect(() => buildSourceBundle(tampered, 'p4')).toThrow(/source paragraph hash/);
  });

  it('제외된 각주가 gold에 없다는 사실만으로 deterministic preflight를 실패시키지 않는다', () => {
    const plan = makePlan('legacy-requalification');
    expect(plan.bundle.ignoredFootnotes).toHaveLength(1);
    expect(plan.preflightReasons).toEqual([]);
  });

  it('verifier input 역할 라벨은 source evidence로 인정하지 않는다', async () => {
    const bundle = buildSourceBundle(sourceFixture(), 'p4');
    const execution = await runSemanticQualification({
      assetType: 'gold', verifierKind: 'gold', sourceText: verifierInputText(bundle), initial: { value: 1 },
      evidenceSourceTexts: [bundle.qualificationPrimaryText],
      provider: 'anthropic', model: 'fake', effort: 'medium', promptVersion: 'test',
      reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
      verify: async () => ({
        output: {
          summary: 'label evidence',
          issues: [{
            id: 'w1', severity: 'warning', category: 'source_reference', goldPath: '/nodes/0',
            sourceSentenceIds: [], sourceEvidence: 'PRIMARY_TEXT', problem: 'label', suggestedAction: 'none',
          }],
        },
      }),
      repair: async () => { throw new Error('repair 불필요'); },
      validate: () => undefined,
    });
    expect(execution.status).toBe('incomplete');
  });

  it('신규 자산은 generation provenance를 요구하고 legacy는 명시 경로에서만 보존한다', () => {
    const value = candidates();
    const missing = planCandidateQualification({
      paragraphId: PARAGRAPH_ID, sourceFixture: sourceFixture(), sourceParagraphId: 'p4',
      ...value, mode: 'new', regressionProbes: 4,
    });
    expect(missing.preflightReasons).toEqual(expect.arrayContaining([
      'gold: generation provenance 없음', 'query: generation provenance 없음', 'title-query: generation provenance 없음',
    ]));

    const legacy = makePlan('legacy-requalification');
    const manifest = buildPendingQualificationManifest({
      plan: legacy, paragraphId: PARAGRAPH_ID, sourceFixturePath: 'source.json',
      candidatePaths: CANDIDATE_PATHS, regressionProbes: 4,
    });
    expect(manifest.mode).toBe('legacy-requalification');
    expect(manifest.provenancePreserved).toBe(true);
  });

  it('tracked source binding이 없으면 qualification preflight를 차단한다', () => {
    const value = candidates();
    const plan = planCandidateQualification({
      paragraphId: PARAGRAPH_ID, sourceFixture: sourceFixture(), sourceParagraphId: 'p4',
      ...value, mode: 'legacy-requalification', regressionProbes: 4, sourceFixtureTracked: false,
    });
    expect(plan.preflightReasons).toContain('tracked source binding 없음');
  });

  it('v1 record만 있는 candidate와 regression pending은 promotion을 fail-closed한다', () => {
    const plan = makePlan('legacy-requalification');
    expect(Object.values(plan.existingRecordVersions)).toEqual(['v1', 'v1', 'v1']);
    const manifest = buildPendingQualificationManifest({
      plan, paragraphId: PARAGRAPH_ID, sourceFixturePath: 'source.json',
      candidatePaths: CANDIDATE_PATHS, regressionProbes: 4,
    });
    expect(manifest.promotionBlockers).toEqual(expect.arrayContaining([
      'gold: v2 qualification 필요', 'query: v2 qualification 필요',
      'title-query: v2 qualification 필요', 'production-query regression proof pending',
    ]));
    expect(() => assertCandidatePromotionGate({
      manifest, bundle: plan.bundle, loadJson: () => undefined,
      verifierFingerprints: {
        gold: semanticVerifierFingerprint('gold', 'semantic-source-bundle-v2-footnotes-ignored'),
        query: semanticVerifierFingerprint('query', 'semantic-source-bundle-v2-footnotes-ignored'),
        'title-query': semanticVerifierFingerprint('title-query', 'semantic-source-bundle-v2-footnotes-ignored'),
      },
    })).toThrow(/record binding/);
  });

  it('dry-run projection은 provider를 호출하지 않고 최소·최대 호출 범위를 출력한다', () => {
    const provider = vi.fn();
    const plan = makePlan('legacy-requalification');
    const manifest = buildPendingQualificationManifest({
      plan, paragraphId: PARAGRAPH_ID, sourceFixturePath: 'source.json',
      candidatePaths: CANDIDATE_PATHS, regressionProbes: 4,
    });
    const summary = createQualificationDryRunSummary(PARAGRAPH_ID, plan, manifest);
    expect(provider).not.toHaveBeenCalled();
    expect(summary.estimate.verifier).toEqual({ minimum: 6, maximum: 18 });
    expect(summary.estimate.repair).toEqual({ minimum: 0, maximum: 6 });
    expect(summary.estimate.regression).toBe(4);
    expect(summary.estimate.logicalLlmInvocations).toEqual({ minimum: 10, maximum: 28 });
  });

  it('법인 p1 dry-run은 각주 표식 차이를 무시하고 legacy v1·4 probe를 정확히 보고한다', () => {
    const paragraphId = 'corporate-law-p1';
    const plan = planCandidateQualification({
      paragraphId,
      sourceFixture: readJson<unknown>('packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json'),
      sourceParagraphId: 'p1',
      gold: readJson<unknown>(`content/${paragraphId}/gold.json`),
      query: readJson<unknown>(`content/${paragraphId}/queries.json`),
      titleQuery: readJson<unknown>(`content/${paragraphId}/title-queries.json`),
      mode: 'legacy-requalification',
      regressionProbes: 4,
    });
    const manifest = buildPendingQualificationManifest({
      plan, paragraphId,
      sourceFixturePath: 'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
      candidatePaths: {
        gold: `content/${paragraphId}/gold.json`, query: `content/${paragraphId}/queries.json`,
        'title-query': `content/${paragraphId}/title-queries.json`,
      },
      regressionProbes: 4,
    });
    const summary = createQualificationDryRunSummary(paragraphId, plan, manifest);
    expect(summary.source.ignoredFootnoteCount).toBe(1);
    expect(summary.preflight.reasons.some((reason) => reason.startsWith('tracked source mismatch:'))).toBe(false);
    expect(summary.existingRecordVersions).toEqual({ gold: 'v1', query: 'v1', 'title-query': 'v1' });
    expect(summary.estimate.regression).toBe(4);
    expect(summary.promotionStatus).toBe('blocked');
  });
});

describe('candidate promotion gate', () => {
  it('서로 결속된 v2 qualification과 regression proof가 있는 legacy candidate만 허용한다', async () => {
    const plan = makePlan('legacy-requalification');
    const sourceText = verifierInputText(plan.bundle);
    const candidateByType = {
      gold: plan.candidates.gold,
      query: plan.candidates.query,
      'title-query': plan.candidates.titleQuery,
    } as const;
    const store = new Map<string, unknown>([
      [CANDIDATE_PATHS.gold, candidateByType.gold],
      [CANDIDATE_PATHS.query, candidateByType.query],
      [CANDIDATE_PATHS['title-query'], candidateByType['title-query']],
      ['regression.json', { probes: ['p1', 'p2', 'p3', 'p4'] }],
      ['result.json', { passed: true }],
    ]);
    const assets: Record<string, unknown> = {};
    const fingerprints = {
      gold: semanticVerifierFingerprint('gold', 'semantic-source-bundle-v2-footnotes-ignored'),
      query: semanticVerifierFingerprint('query', 'semantic-source-bundle-v2-footnotes-ignored'),
      'title-query': semanticVerifierFingerprint('title-query', 'semantic-source-bundle-v2-footnotes-ignored'),
    } as const;

    for (const assetType of ['gold', 'query', 'title-query'] as const) {
      const candidate = candidateByType[assetType];
      const reportPaths: string[] = [];
      const execution = await runSemanticQualification<Gold | GeneratedQuerySet>({
        assetType, verifierKind: assetType, sourceText, initial: candidate,
        provider: 'anthropic', model: 'fake', effort: 'medium', promptVersion: 'test',
        reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
        verify: vi.fn()
          .mockResolvedValueOnce({ output: CLEAN, invocationId: `${assetType}-1` })
          .mockResolvedValueOnce({ output: CLEAN, invocationId: `${assetType}-2` }),
        repair: async () => { throw new Error('repair 불필요'); },
        validate: () => undefined,
        persistReport: (report, pass) => {
          const path = `reports/${assetType}-${pass}.json`;
          store.set(path, report);
          reportPaths.push(path);
          return path;
        },
      });
      expect(reportPaths).toHaveLength(2);
      const record = makeVerificationRecordV2({
        assetType, verifierKind: assetType, sourceText, candidate,
        verifierFingerprint: fingerprints[assetType], execution,
        createdAt: '2026-08-14T00:00:00.000Z',
      });
      const recordPath = `records/${assetType}.json`;
      store.set(recordPath, record);
      const key = assetType === 'title-query' ? 'titleQuery' : assetType;
      assets[key] = {
        assetType, verifierKind: assetType, candidatePath: CANDIDATE_PATHS[assetType],
        candidateHash: semanticCandidateHash(candidate), qualificationStatus: 'qualified',
        qualificationRecordPath: recordPath, qualificationRecordHash: qualificationArtifactHash(record),
      };
    }

    const manifest: QualificationManifest = QualificationManifestSchema.parse({
      schemaVersion: 'semantic-qualification-manifest-v2', paragraphId: PARAGRAPH_ID,
      mode: 'legacy-requalification', sourceFixturePath: 'source.json',
      sourceSetId: plan.bundle.sourceSetId, sourceParagraphId: plan.bundle.sourceParagraphId,
      rawSourceHash: plan.bundle.rawSourceHash,
      qualificationSourceHash: plan.bundle.qualificationSourceHash,
      ignoredFootnotesHash: plan.bundle.ignoredFootnotesHash,
      verifierInputHash: plan.bundle.verifierInputHash,
      preflight: { status: 'passed', reasons: [] }, assets,
      regression: {
        status: 'passed', probeCount: 4, candidateQueryHash: semanticCandidateHash(plan.candidates.query),
        fixturePath: 'regression.json', fixtureHash: qualificationArtifactHash(store.get('regression.json')),
        resultPath: 'result.json', resultHash: qualificationArtifactHash(store.get('result.json')),
      },
      provenancePreserved: true,
      requalificationHistory: [{ at: '2026-08-14T00:00:00.000Z', note: 'legacy provenance preserved' }],
      promotionStatus: 'ready', promotionBlockers: [], createdAt: '2026-08-14T00:00:00.000Z',
    });

    expect(() => assertCandidatePromotionGate({
      manifest, bundle: plan.bundle, loadJson: (path) => store.get(path), verifierFingerprints: fingerprints,
    })).not.toThrow();
    expect(() => assertCandidatePromotionGate({
      manifest: { ...manifest, qualificationSourceHash: sha256('changed') },
      bundle: plan.bundle, loadJson: (path) => store.get(path), verifierFingerprints: fingerprints,
    })).toThrow(/source bundle hash/);
  });
});
