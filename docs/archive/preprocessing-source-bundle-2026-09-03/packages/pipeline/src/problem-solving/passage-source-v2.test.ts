import { describe, expect, it } from 'vitest';

import { SourcePacketSchema, sourceArtifactHash } from './source-bundle.js';
import { buildSourceUnitRegistry } from './source-bundle-v2.js';
import {
  applyPassageUnitRepairV2,
  buildPassageAuditChunks,
  buildPassageEvidenceResolutionReportV2,
  canonicalizePassageSourceProposalV2,
  comparePassageCandidatesByUnitV2,
  evaluatePassageBundleStateV2,
  projectPassageBundleChunk,
  reprojectLegacyPassageOutputV2,
  validatePassageSourceBundleV2AgainstInputs,
  type PassageSourceBundleV2,
} from './passage-source-v2.js';
import {
  buildPassageAuditInputV2,
  buildPassageGenerationInputV2,
  buildPassageRepairInputV2,
  passageHighRiskSourceUnitIds,
} from './passage-source-v2-runtime.js';

function fixture() {
  const packet = SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: 'passage-v2-test',
    sourceId: 'passage-v2-test',
    questionNumber: 1,
    scope: 'PASSAGE',
    documents: [
      {
        documentId: 'PASSAGE-P1',
        sourceArea: 'PASSAGE_TEXT',
        text: '비점 격차는 거리의 제곱에 비례한다. 빛은 굴절한다.',
      },
      {
        documentId: 'PASSAGE-P2',
        sourceArea: 'PASSAGE_TEXT',
        text: '광축은 렌즈 중심을 지나는 직선이다.',
      },
    ],
    media: [],
    upstreamFrozenBundleHashes: [],
  });
  const registry = buildSourceUnitRegistry(packet);
  const bundle = {
    bundleVersion: 'problem-source-bundle-v2' as const,
    scope: 'PASSAGE' as const,
    sourcePacketHash: sourceArtifactHash(packet),
    sourceUnitRegistryHash: sourceArtifactHash(registry),
    offsetFieldsProducedByModel: false as const,
    itemDirectives: [],
    claims: [
      {
        claimId: 'P1-S1-C1', sourceUnitId: 'P1-S1',
        normalizedClaim: '비점 격차는 거리의 제곱에 비례한다.',
        polarity: 'POSITIVE' as const, modality: 'ASSERTED' as const, qualifiers: [],
        evidenceFragments: ['비점 격차는 거리의 제곱에 비례한다.'],
      },
      {
        claimId: 'P1-S2-C1', sourceUnitId: 'P1-S2', normalizedClaim: '빛은 굴절한다.',
        polarity: 'POSITIVE' as const, modality: 'ASSERTED' as const, qualifiers: [],
        evidenceFragments: ['빛은 굴절한다.'],
      },
      {
        claimId: 'P2-S1-C1', sourceUnitId: 'P2-S1',
        normalizedClaim: '광축은 렌즈 중심을 지나는 직선이다.',
        polarity: 'POSITIVE' as const, modality: 'ASSERTED' as const, qualifiers: [],
        evidenceFragments: ['광축은 렌즈 중심을 지나는 직선이다.'],
      },
    ],
    entities: [
      {
        entityId: 'E_GAP', canonicalLabel: '비점 격차', surfaceForms: ['비점 격차'],
        definitionSourceUnitId: null, definitionFragment: null,
        mergeBasis: 'SINGLE_SURFACE_NO_MERGE' as const,
        status: 'EVIDENCE_GROUNDED_CANDIDATE' as const,
      },
      {
        entityId: 'E_DISTANCE', canonicalLabel: '거리', surfaceForms: ['거리'],
        definitionSourceUnitId: null, definitionFragment: null,
        mergeBasis: 'SINGLE_SURFACE_NO_MERGE' as const,
        status: 'EVIDENCE_GROUNDED_CANDIDATE' as const,
      },
    ],
    quantities: [
      {
        quantityId: 'Q_GAP', quantityKind: 'LENGTH' as const, subjectEntityId: 'E_GAP',
        referenceEntityId: null, qualifiers: [],
      },
      {
        quantityId: 'Q_DISTANCE', quantityKind: 'DISTANCE' as const,
        subjectEntityId: 'E_DISTANCE', referenceEntityId: null, qualifiers: [],
      },
    ],
    relations: [{
      relationId: 'R1', sourceUnitId: 'P1-S1', relationFamily: 'PROPORTIONALITY' as const,
      claimIds: ['P1-S1-C1'], independentQuantityId: 'Q_DISTANCE',
      dependentQuantityId: 'Q_GAP', exponent: 2, polarity: 'POSITIVE' as const,
    }],
    visualCandidates: [],
    mediaAssessment: {
      hasMedia: false, visualRelevant: false, visualRequiredForSourceUnderstanding: false,
      visualRequiredForSolving: 'UNASSESSED' as const, reason: '텍스트 전용 passage다.',
    },
    unresolved: [],
  };
  const artifact: PassageSourceBundleV2 = {
    passageBundleVersion: 'passage-text-source-bundle-v2',
    sourceClaimPolicy: 'EXPLICIT_OR_FAITHFUL_NORMALIZATION_ONLY',
    derivedRelationsIncluded: false,
    offsetOwnership: 'CODE_ONLY',
    mediaGroundingStatus: 'NOT_APPLICABLE',
    bundle,
    unitCoverage: [
      {
        sourceUnitId: 'P1-S1', claimIds: ['P1-S1-C1'], relationIds: ['R1'],
        disposition: 'CLAIMS_EXTRACTED', mediaGroundingStatus: 'NOT_APPLICABLE', reason: '명시 관계',
      },
      {
        sourceUnitId: 'P1-S2', claimIds: ['P1-S2-C1'], relationIds: [],
        disposition: 'CLAIMS_EXTRACTED', mediaGroundingStatus: 'NOT_APPLICABLE', reason: '명시 사실',
      },
      {
        sourceUnitId: 'P2-S1', claimIds: ['P2-S1-C1'], relationIds: [],
        disposition: 'CLAIMS_EXTRACTED', mediaGroundingStatus: 'NOT_APPLICABLE', reason: '명시 정의',
      },
    ],
  };
  return { packet, registry, artifact };
}

describe('Passage Source Bundle v2', () => {
  it('모든 고정 문장을 순서대로 coverage하고 텍스트 전용 계약을 검증한다', () => {
    const { packet, registry, artifact } = fixture();
    expect(validatePassageSourceBundleV2AgainstInputs({
      artifact, sourcePacket: packet, registry,
    })).toEqual(artifact);
    const missing = structuredClone(artifact);
    missing.unitCoverage.splice(1, 1);
    expect(() => validatePassageSourceBundleV2AgainstInputs({
      artifact: missing, sourcePacket: packet, registry,
    })).toThrow(/모든 Passage Source Unit/);

    const falseHumanApproval = structuredClone(artifact);
    falseHumanApproval.bundle.entities[0]!.mergeBasis = 'HUMAN_APPROVAL';
    expect(() => validatePassageSourceBundleV2AgainstInputs({
      artifact: falseHumanApproval, sourcePacket: packet, registry,
    })).toThrow(/인간 승인을 사칭/);
  });

  it('문단 경계를 넘지 않고 최대 10개 unit으로 감사 chunk를 고정한다', () => {
    const { registry } = fixture();
    expect(buildPassageAuditChunks(registry, 1).map((chunk) => chunk.sourceUnitIds)).toEqual([
      ['P1-S1'], ['P1-S2'], ['P2-S1'],
    ]);
    expect(buildPassageAuditChunks(registry).map((chunk) => chunk.sourceUnitIds)).toEqual([
      ['P1-S1', 'P1-S2'], ['P2-S1'],
    ]);
  });

  it('감사 projection은 대상 문단의 claim과 참조 registry만 포함한다', () => {
    const { registry, artifact } = fixture();
    const chunk = buildPassageAuditChunks(registry)[0]!;
    const projection = projectPassageBundleChunk({ artifact, chunk }) as {
      claims: Array<{ sourceUnitId: string }>;
      relations: Array<{ relationId: string }>;
    };
    expect(projection.claims.map((claim) => claim.sourceUnitId)).toEqual(['P1-S1', 'P1-S2']);
    expect(projection.relations.map((relation) => relation.relationId)).toEqual(['R1']);
  });

  it('claim과 entity의 canonical evidence를 코드가 Source Unit에서 붙인다', () => {
    const { packet, registry, artifact } = fixture();
    expect(buildPassageEvidenceResolutionReportV2({
      artifact, sourcePacket: packet, registry,
    })).toMatchObject({
      evidenceOwnership: 'CODE_ONLY',
      allSourceUnitsResolved: true,
      unresolvedSemanticRecordIds: [],
    });
  });

  it('모델 제안에는 인용문이 없고 코드가 Source Unit 전체 문장을 근거로 붙인다', () => {
    const { packet, registry, artifact } = fixture();
    const proposal = structuredClone(artifact) as unknown as {
      bundle: { claims: Array<Record<string, unknown>>; entities: Array<Record<string, unknown>> };
    };
    proposal.bundle.claims.forEach((claim) => delete claim['evidenceFragments']);
    proposal.bundle.entities.forEach((entity) => delete entity['definitionFragment']);
    const canonical = canonicalizePassageSourceProposalV2({ proposal, sourcePacket: packet, registry });
    expect(canonical.bundle.claims[0]?.evidenceFragments).toEqual([
      '비점 격차는 거리의 제곱에 비례한다.',
    ]);
  });

  it('기존의 비정확한 fragment는 버리고 원시 hash를 보존한 채 무료 재투영한다', () => {
    const { packet, registry, artifact } = fixture();
    const legacy = structuredClone(artifact);
    legacy.bundle.claims[0]!.evidenceFragments = ['비점 격차는 거리의 제곱에 비례함'];
    const reprojected = reprojectLegacyPassageOutputV2({
      rawOutput: legacy, sourcePacket: packet, registry,
    });
    expect(reprojected.legacyFragmentDiagnostics[0]).toMatchObject({
      exactWithinSourceUnit: false,
      disposition: 'NON_AUTHORITATIVE_LEGACY_FIELD_DROPPED',
    });
    expect(reprojected.artifact.bundle.claims[0]?.evidenceFragments).toEqual([
      '비점 격차는 거리의 제곱에 비례한다.',
    ]);
  });

  it('생성 입력에서 문항·해설·골드와 이미지 내용을 격리한다', () => {
    const { packet, registry } = fixture();
    const input = buildPassageGenerationInputV2({ packet, registry, generationId: 'GEN1' });
    const serialized = JSON.stringify(input);
    expect(serialized).toContain('OFFICIAL_EXPLANATION');
    expect(serialized).not.toContain('detailed_explanation_ko');
    expect(serialized).not.toContain('correctChoice');
    expect(serialized).toContain('contentIntentionallyWithheld');
  });

  it('문단 감사 입력은 원문과 후보 1개·독립 peer만 포함한다', () => {
    const { packet, registry, artifact } = fixture();
    const chunk = buildPassageAuditChunks(registry)[0]!;
    const input = buildPassageAuditInputV2({
      packet, registry, candidate: artifact, peerReadings: [structuredClone(artifact)], chunk,
      auditId: 'AUDIT1', effort: 'medium',
    }) as { requiredAudit: { expectedSourceUnitIds: string[] }; peerReadingProjections: unknown[] };
    expect(input.requiredAudit.expectedSourceUnitIds).toEqual(chunk.sourceUnitIds);
    expect(input.peerReadingProjections).toHaveLength(1);
  });

  it('부분 수리는 한 unit의 claim·relation만 교체하고 전역 registry를 유지한다', () => {
    const { packet, registry, artifact } = fixture();
    const repair = {
      repairVersion: 'passage-source-unit-repair-v2',
      repairId: 'REPAIR1',
      baseArtifactHash: sourceArtifactHash(artifact),
      targetSourceUnitId: 'P1-S2',
      globalEntityRegistryUnchanged: true,
      globalQuantityRegistryUnchanged: true,
      replacementClaims: [{
        ...artifact.bundle.claims[1]!, normalizedClaim: '빛이 굴절한다.',
      }],
      replacementRelations: [],
      replacementUnresolved: [],
      replacementCoverage: artifact.unitCoverage[1],
    };
    const repaired = applyPassageUnitRepairV2({
      baseArtifact: artifact, repair, sourcePacket: packet, registry,
    });
    expect(repaired.bundle.claims[0]).toEqual(artifact.bundle.claims[0]);
    expect(repaired.bundle.entities).toEqual(artifact.bundle.entities);
    expect(repaired.bundle.claims.find((claim) => claim.sourceUnitId === 'P1-S2')?.normalizedClaim)
      .toBe('빛이 굴절한다.');

    const escaped = structuredClone(repair);
    escaped.replacementClaims[0]!.sourceUnitId = 'P2-S1';
    expect(() => applyPassageUnitRepairV2({
      baseArtifact: artifact, repair: escaped, sourcePacket: packet, registry,
    })).toThrow(/target Source Unit 밖/);
  });

  it('PASS 감사는 자동 수리 대상으로 만들지 않고 고위험 unit을 탐지한다', () => {
    const { packet, registry, artifact } = fixture();
    const passAudit = {
      sourceUnitId: 'P1-S1', candidateClaimIds: ['P1-S1-C1'], claimsReviewed: ['P1-S1-C1'],
      candidateVisualIds: [], visualCandidatesReviewed: [], omittedMeaningDetected: false,
      unsupportedMeaningDetected: false, omittedVisualMeaningDetected: false,
      unsupportedVisualMeaningDetected: false, decision: 'PASS', downstreamImpact: 'NONE', issues: [],
    };
    expect(() => buildPassageRepairInputV2({
      packet, registry, candidate: artifact, unitAudit: passAudit, repairId: 'REPAIR1',
    })).toThrow(/자동 부분 수리/);
    expect(passageHighRiskSourceUnitIds(artifact)).toContain('P1-S1');
  });

  it('전체 JSON이 아니라 unit별 claim과 relation 핵심값으로 후보 차이를 분류한다', () => {
    const { registry, artifact } = fixture();
    const same = structuredClone(artifact);
    const changed = structuredClone(artifact);
    const relation = changed.bundle.relations[0];
    if (relation?.relationFamily !== 'PROPORTIONALITY') throw new Error('fixture relation 오류');
    relation.exponent = 1;
    const comparisons = comparePassageCandidatesByUnitV2({
      artifacts: [artifact, same, changed], registry,
    });
    expect(comparisons.find((entry) => entry.sourceUnitId === 'P1-S1')).toMatchObject({
      classification: 'MEANING_CONFLICT', requiresHighAudit: true,
    });
    expect(comparisons.find((entry) => entry.sourceUnitId === 'P1-S2')).toMatchObject({
      classification: 'EXACT_AGREEMENT', requiresHighAudit: false,
    });
    const relationWordingOnly = structuredClone(artifact);
    relationWordingOnly.bundle.claims[0]!.normalizedClaim = '거리 제곱에 따라 비점 격차가 변한다.';
    expect(comparePassageCandidatesByUnitV2({
      artifacts: [artifact, relationWordingOnly], registry,
    }).find((entry) => entry.sourceUnitId === 'P1-S1')).toMatchObject({
      classification: 'STRUCTURAL_VARIANT', requiresHighAudit: false,
    });
    const wordingOnly = structuredClone(artifact);
    wordingOnly.bundle.claims[1]!.normalizedClaim = '빛이 굴절한다.';
    expect(comparePassageCandidatesByUnitV2({
      artifacts: [artifact, wordingOnly], registry,
    }).find((entry) => entry.sourceUnitId === 'P1-S2')).toMatchObject({
      classification: 'STRUCTURAL_VARIANT', requiresHighAudit: false,
    });
  });

  it('Medium 전체 coverage와 고위험 High 감사 전에는 생산 자격을 주지 않는다', () => {
    const { packet, registry, artifact } = fixture();
    const unitAudit = (sourceUnitId: string, effort: 'medium' | 'high') => ({
      auditVersion: 'problem-source-audit-v2',
      auditId: `${effort}-${sourceUnitId}`,
      model: 'gpt-5.6-terra', effort, independentOfOtherAudit: true,
      expectedSourceUnitIds: [sourceUnitId],
      unitAudits: [{
        sourceUnitId,
        candidateClaimIds: artifact.bundle.claims
          .filter((claim) => claim.sourceUnitId === sourceUnitId).map((claim) => claim.claimId),
        claimsReviewed: artifact.bundle.claims
          .filter((claim) => claim.sourceUnitId === sourceUnitId).map((claim) => claim.claimId),
        candidateVisualIds: [], visualCandidatesReviewed: [], omittedMeaningDetected: false,
        unsupportedMeaningDetected: false, omittedVisualMeaningDetected: false,
        unsupportedVisualMeaningDetected: false, decision: 'PASS', downstreamImpact: 'NONE', issues: [],
      }],
    });
    const mediumAudits = ['P1-S1', 'P1-S2', 'P2-S1'].map((id) => unitAudit(id, 'medium'));
    const evidenceResolutionReport = buildPassageEvidenceResolutionReportV2({
      artifact, sourcePacket: packet, registry,
    });
    expect(() => evaluatePassageBundleStateV2({
      artifact, registry, evidenceResolutionReport, mediumAudits, highAudits: [],
      highRiskSourceUnitIds: ['P1-S1'],
      artifactFrozen: true,
    })).toThrow(/High 감사/);
    expect(evaluatePassageBundleStateV2({
      artifact, registry, evidenceResolutionReport,
      mediumAudits, highAudits: [unitAudit('P1-S1', 'high')],
      highRiskSourceUnitIds: ['P1-S1'], artifactFrozen: true,
    })).toMatchObject({ textBundleStatus: 'PASS', productionEligible: true });
  });
});
