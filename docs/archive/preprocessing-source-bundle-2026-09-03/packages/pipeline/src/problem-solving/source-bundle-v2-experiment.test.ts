import { describe, expect, it } from 'vitest';

import { SourcePacketSchema, sourceArtifactHash } from './source-bundle.js';
import {
  SourceAuditV2Schema,
  SourceBundleV2Schema,
  buildSourceUnitRegistry,
  validateSourceBundleV2AgainstInputs,
  type SourceAuditV2,
  type SourceBundleV2,
  type SourceUnitRegistry,
} from './source-bundle-v2.js';
import {
  assertNoSourceV2InputLeak,
  buildComparisonAuditInputV2,
  buildIndependentReadingInputV2,
  buildItemGenerationInputV2,
  estimateSourceV2PreflightCost,
  sourceV2CallCostUsd,
} from './source-bundle-v2-runtime.js';
import {
  classifyLensRatioOrientationV2,
  createLensRatioDirectionContrastV2,
  createLensRatioDirectionMutationV2,
  scoreLensItemCoreV2,
  scoreLensMutationAuditV2,
  scoreNormalAuditEligibilityV2,
} from './source-bundle-v2-experiment.js';

const MEDIA_HASH = `sha256:${'b'.repeat(64)}`;

function fixture(): {
  packet: ReturnType<typeof SourcePacketSchema.parse>;
  registry: SourceUnitRegistry;
  bundle: SourceBundleV2;
} {
  const packet = SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1', packetId: 'lens-item', sourceId: 'lens',
    questionNumber: 11, scope: 'ITEM', upstreamFrozenBundleHashes: [],
    documents: [
      { documentId: 'ITEM-STEM', sourceArea: 'STEM', text: '학습 자료이다. 적절하지 않은 것은?' },
      {
        documentId: 'ITEM-S1', sourceArea: 'SCENARIO_TEXT',
        text: [
          '첫 조건이다.', '둘째 조건이다.', '셋째 조건이다.', '넷째 조건이다.',
          'P0에서 광축까지의 거리는 P1에서 광축까지의 거리의 두 배이고, P2에서 광축까지의 거리의 절반이다.',
        ].join(' '),
      },
    ],
    media: [{
      mediaId: 'MEDIA1', sourceUrl: 'https://example.com/lens.png', localPath: 'lens.png',
      mimeType: 'image/png', contentHash: MEDIA_HASH, width: 100, height: 100,
      sourceArea: 'SCENARIO_VISUAL', documentId: 'ITEM-S1',
    }],
  });
  const registry = buildSourceUnitRegistry(packet);
  const sentence = registry.units.find((unit) => unit.sourceUnitId === 'I1-S5')!.rawText!;
  const bundle = SourceBundleV2Schema.parse({
    bundleVersion: 'problem-source-bundle-v2', scope: 'ITEM',
    sourcePacketHash: sourceArtifactHash(packet), sourceUnitRegistryHash: sourceArtifactHash(registry),
    offsetFieldsProducedByModel: false,
    itemDirectives: registry.units.filter((unit) => unit.unitRole === 'ITEM_DIRECTIVE').map((unit) => ({
      sourceUnitId: unit.sourceUnitId, unitRole: 'ITEM_DIRECTIVE',
      claimExtractionPolicy: 'EXCLUDE', questionPolarity: unit.questionPolarity,
    })),
    claims: [
      { claimId: 'I1-S5-C1', sourceUnitId: 'I1-S5', normalizedClaim: 'P0 = 2 × P1',
        polarity: 'POSITIVE', modality: 'ASSERTED', qualifiers: [], evidenceFragments: [sentence] },
      { claimId: 'I1-S5-C2', sourceUnitId: 'I1-S5', normalizedClaim: 'P0 = 0.5 × P2',
        polarity: 'POSITIVE', modality: 'ASSERTED', qualifiers: [], evidenceFragments: [sentence] },
    ],
    entities: [
      ['E_P0', 'P0'], ['E_P1', 'P1'], ['E_P2', 'P2'], ['E_AXIS', '광축'],
    ].map(([entityId, label]) => ({
      entityId, canonicalLabel: label, surfaceForms: [label],
      definitionSourceUnitId: 'I1-S5', definitionFragment: sentence,
      mergeBasis: 'EXPLICIT_IDENTITY', status: 'EVIDENCE_GROUNDED_CANDIDATE',
    })),
    quantities: [
      ['Q_P0_AXIS', 'E_P0'], ['Q_P1_AXIS', 'E_P1'], ['Q_P2_AXIS', 'E_P2'],
    ].map(([quantityId, subjectEntityId]) => ({
      quantityId, quantityKind: 'DISTANCE', subjectEntityId,
      referenceEntityId: 'E_AXIS', qualifiers: [],
    })),
    relations: [
      { relationId: 'R1', sourceUnitId: 'I1-S5', relationFamily: 'RATIO',
        claimIds: ['I1-S5-C1'], leftQuantityId: 'Q_P0_AXIS', operator: '=', coefficient: 2,
        rightQuantityId: 'Q_P1_AXIS', interpretationRule: 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT' },
      { relationId: 'R2', sourceUnitId: 'I1-S5', relationFamily: 'RATIO',
        claimIds: ['I1-S5-C2'], leftQuantityId: 'Q_P0_AXIS', operator: '=', coefficient: 0.5,
        rightQuantityId: 'Q_P2_AXIS', interpretationRule: 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT' },
    ],
    visualCandidates: [{
      candidateId: 'FIG1-V1', parentFigureUnitId: 'FIG1', candidateType: 'LABEL', label: 'P0',
      region: null, precision: 'EXACT', evidenceDescription: 'P0 라벨', status: 'CANDIDATE',
    }],
    mediaAssessment: {
      hasMedia: true, visualRelevant: true, visualRequiredForSourceUnderstanding: false,
      visualRequiredForSolving: 'UNASSESSED', reason: '순서 확인용',
    },
    unresolved: [],
  });
  validateSourceBundleV2AgainstInputs({ bundle, sourcePacket: packet, registry });
  return { packet, registry, bundle };
}

function audit(registry: SourceUnitRegistry, options: {
  id: string;
  decision: SourceAuditV2['unitAudits'][number]['decision'];
  direction?: boolean;
}): SourceAuditV2 {
  return SourceAuditV2Schema.parse({
    auditVersion: 'problem-source-audit-v2', auditId: options.id,
    model: 'gpt-5.6-terra', effort: 'medium', independentOfOtherAudit: true,
    expectedSourceUnitIds: registry.units.map((unit) => unit.sourceUnitId),
    unitAudits: registry.units.map((unit) => ({
      sourceUnitId: unit.sourceUnitId,
      candidateClaimIds: unit.sourceUnitId === 'I1-S5' ? ['I1-S5-C1', 'I1-S5-C2'] : [],
      claimsReviewed: unit.sourceUnitId === 'I1-S5' ? ['I1-S5-C1', 'I1-S5-C2'] : [],
      candidateVisualIds: unit.sourceUnitId === 'FIG1' ? ['FIG1-V1'] : [],
      visualCandidatesReviewed: unit.sourceUnitId === 'FIG1' ? ['FIG1-V1'] : [],
      omittedMeaningDetected: false, unsupportedMeaningDetected: false,
      omittedVisualMeaningDetected: false, unsupportedVisualMeaningDetected: false,
      decision: unit.sourceUnitId === 'I1-S5' ? options.decision : 'PASS',
      downstreamImpact: unit.sourceUnitId === 'I1-S5' && options.decision !== 'PASS' ? 'CONFIRMED' : 'NONE',
      issues: unit.sourceUnitId === 'I1-S5' && options.direction ? [{
        issueCode: 'RATIO_REVERSED', issueClass: 'DIRECTION', description: '비율 방향 반전',
        affectedClaimIds: ['I1-S5-C2'], affectedVisualCandidateIds: [],
      }] : [],
    })),
  });
}

describe('볼록렌즈 ITEM Source Bundle v2', () => {
  it('좌변·계수·우변 계약으로 두 비율을 기계적으로 판정한다', () => {
    const { bundle } = fixture();
    expect(scoreLensItemCoreV2(bundle)).toMatchObject({ passed: true });
  });

  it('역관계 변이는 정상 relation 하나만 반대로 만들고 API용 이름에는 오류를 노출하지 않는다', () => {
    const { bundle } = fixture();
    const mutation = createLensRatioDirectionMutationV2(bundle);
    expect(mutation.privateManifest).toMatchObject({
      privateMutationKind: 'RATIO_DIRECTION_REVERSAL',
      apiCandidateLabel: 'CANDIDATE_A',
      mutationKindExposedToApi: false,
    });
    expect(scoreLensItemCoreV2(mutation.candidate).passed).toBe(false);
  });

  it('생성 결과가 역방향이면 대조 후보를 정상 방향으로 되돌린다', () => {
    const { bundle } = fixture();
    const reversed = createLensRatioDirectionMutationV2(bundle).candidate;
    expect(classifyLensRatioOrientationV2(reversed).orientation).toBe('REVERSED');
    const contrast = createLensRatioDirectionContrastV2(reversed);
    expect(contrast.privateManifest).toMatchObject({
      privateMutationKind: 'RATIO_DIRECTION_CORRECTION',
      sourceOrientation: 'REVERSED',
      contrastOrientation: 'NORMAL',
      apiCandidateLabel: 'CANDIDATE_A',
      mutationKindExposedToApi: false,
    });
    expect(classifyLensRatioOrientationV2(contrast.candidate).orientation).toBe('NORMAL');
    expect(scoreLensItemCoreV2(contrast.candidate).passed).toBe(true);
  });

  it('호출 전 비용은 캐시 쓰기 최고 단가와 출력 토큰 상한을 함께 계산한다', () => {
    const result = estimateSourceV2PreflightCost({
      input: {}, promptBytes: 0, imageCount: 0, maxOutputTokens: 1_000,
      cumulativeActualCostUsdBeforeCall: 0.5, budgetCeilingUsd: 2,
    });
    expect(result.conservativeInputTokenCeiling).toBe(2);
    expect(result.maximumCallCostUsd).toBeCloseTo((2 * 2.5 + 1_000 * 12) / 1_000_000);
    expect(result.projectedCumulativeCeilingUsd).toBeCloseTo(0.5 + result.maximumCallCostUsd);
  });

  it('실제 비용도 캐시 읽기·쓰기·일반 입력을 분리해 계산한다', () => {
    const cost = sourceV2CallCostUsd({
      provider: 'openai', requestedModel: 'gpt-5.6-terra', responseModel: 'gpt-5.6-terra',
      effort: 'medium', promptVersion: 'item-source-bundle-prompt-v2', inputHash: MEDIA_HASH,
      calledAt: '2026-09-03T00:00:00.000Z', durationMs: 1, responseId: 'response-1',
      requestHash: MEDIA_HASH, store: false, previousResponseId: null, automaticRetries: 0,
      serviceTierRequested: 'default', serviceTierReturned: 'default', maxOutputTokens: 1_000,
      derivation: {
        approvalPlanHash: MEDIA_HASH, conditionBranch: 'TEST', dependencyArtifactHashes: [],
      },
      preflight: {
        costCalculatorVersion: 'source-v2-cost-v2-cache-write-aware',
        cumulativeActualCostUsdBeforeCall: 0, conservativeInputTokenCeiling: 100,
        maximumCallCostUsd: 0.1, projectedCumulativeCeilingUsd: 0.1, budgetCeilingUsd: 2,
      },
      usage: { inputTokens: 100, outputTokens: 10, cacheReadTokens: 20, cacheWriteTokens: 30 },
    });
    expect(cost).toBeCloseTo((50 * 2 + 20 * 0.2 + 30 * 2.5 + 10 * 12) / 1_000_000);
  });

  it('생성·독립 판독 입력에 정답·해설·후보가 누출되지 않는다', () => {
    const { packet, registry } = fixture();
    const generation = buildItemGenerationInputV2({ packet, registry });
    const independent = buildIndependentReadingInputV2({ packet, registry });
    expect(() => assertNoSourceV2InputLeak(generation)).not.toThrow();
    expect(independent).toMatchObject({ candidateArtifact: 'INTENTIONALLY_HIDDEN' });
    expect(() => assertNoSourceV2InputLeak({ answer_key: 3 })).toThrow(/금지된 정보/);
  });

  it('정상·변이 비교 입력은 같은 중립 후보명을 사용하고 visual coverage를 명시한다', () => {
    const { packet, registry, bundle } = fixture();
    const mutation = createLensRatioDirectionMutationV2(bundle);
    const build = (candidate: SourceBundleV2, id: string) => buildComparisonAuditInputV2({
      packet, registry, independentReading: bundle, candidate, auditId: id, effort: 'medium',
    }) as Record<string, unknown>;
    const normal = build(bundle, 'AUDIT-MEDIUM-01');
    const changed = build(mutation.candidate, 'AUDIT-MEDIUM-02');
    expect(normal['candidateLabel']).toBe('CANDIDATE_A');
    expect(changed['candidateLabel']).toBe('CANDIDATE_A');
    expect(JSON.stringify(changed)).not.toContain('RATIO_DIRECTION_REVERSAL');
    expect(() => assertNoSourceV2InputLeak({ note: 'RATIO_DIRECTION_REVERSAL' }))
      .toThrow(/변이 종류/);
    expect(changed['requiredAudit']).toMatchObject({
      expectedVisualsByUnit: { FIG1: ['FIG1-V1'] },
    });
  });

  it('변이의 의미 검출과 생산 차단을 서로 다른 지표로 채점한다', () => {
    const { registry } = fixture();
    expect(scoreLensMutationAuditV2(audit(registry, {
      id: 'DIRECTION', decision: 'REPAIR_REQUIRED', direction: true,
    }))).toMatchObject({ meaningDetectionSucceeded: true, safetyBlockSucceeded: true });
    expect(scoreLensMutationAuditV2(audit(registry, {
      id: 'UNRESOLVED', decision: 'UNRESOLVED', direction: false,
    }))).toMatchObject({ meaningDetectionSucceeded: false, safetyBlockSucceeded: true });
  });

  it('정상 감사가 통과해도 실험 artifact는 생산에 승격하지 않는다', () => {
    const { registry } = fixture();
    expect(scoreNormalAuditEligibilityV2(audit(registry, { id: 'PASS', decision: 'PASS' })))
      .toEqual({
        wouldBeProductionEligible: true,
        productionEligible: false,
        reason: 'EXPERIMENT_ONLY',
      });
  });
});
