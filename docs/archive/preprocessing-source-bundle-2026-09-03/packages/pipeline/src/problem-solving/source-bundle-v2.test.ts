import { describe, expect, it } from 'vitest';

import { SourcePacketSchema } from './source-bundle.js';
import { createSourceProviderJsonSchema } from './source-bundle-runtime.js';
import {
  SOURCE_AUDIT_V2_VERSION,
  SourceBundleV2Schema,
  buildSourceUnitRegistry,
  evaluateProductionEligibility,
  resolveEvidenceFragment,
  splitSentencesWithOffsets,
  validateSourceAuditV2Coverage,
  validateSourceUnitRegistryAgainstPacket,
  type SourceAuditV2,
} from './source-bundle-v2.js';

const HASH = `sha256:${'a'.repeat(64)}`;

function passagePacket() {
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: 'lens-passage',
    sourceId: 'lens',
    questionNumber: null,
    scope: 'PASSAGE',
    documents: [{
      documentId: 'PASSAGE-P1',
      sourceArea: 'PASSAGE_TEXT',
      text: '첫 문장이다. 같은 표현을 포함한다. 마지막 문장이다.',
    }],
    media: [],
    upstreamFrozenBundleHashes: [],
  });
}

function audit(decisions: Array<{
  unitId: string;
  claimIds: string[];
  reviewed?: string[];
  decision?: 'PASS' | 'WARNING' | 'REPAIR_REQUIRED' | 'BLOCKING' | 'UNRESOLVED';
  downstreamImpact?: 'NONE' | 'POSSIBLE' | 'CONFIRMED';
}>): SourceAuditV2 {
  return {
    auditVersion: SOURCE_AUDIT_V2_VERSION,
    auditId: 'audit-1',
    model: 'gpt-5.6-terra',
    effort: 'medium',
    independentOfOtherAudit: true,
    expectedSourceUnitIds: decisions.map((entry) => entry.unitId),
    unitAudits: decisions.map((entry) => ({
      sourceUnitId: entry.unitId,
      candidateClaimIds: entry.claimIds,
      claimsReviewed: entry.reviewed ?? entry.claimIds,
      candidateVisualIds: [],
      visualCandidatesReviewed: [],
      omittedMeaningDetected: false,
      unsupportedMeaningDetected: false,
      omittedVisualMeaningDetected: false,
      unsupportedVisualMeaningDetected: false,
      decision: entry.decision ?? 'PASS',
      downstreamImpact: entry.downstreamImpact ?? 'NONE',
      issues: [],
    })),
  };
}

describe('Source Unit v2', () => {
  it('문장 경계와 UTF-16 offset을 코드가 안정적으로 확정한다', () => {
    const text = '첫 문장이다.  둘째 문장이다! 마지막인가?';
    const units = splitSentencesWithOffsets(text);
    expect(units.map((unit) => unit.text)).toEqual([
      '첫 문장이다.',
      '둘째 문장이다!',
      '마지막인가?',
    ]);
    for (const unit of units) expect(text.slice(unit.start, unit.end)).toBe(unit.text);
  });

  it('PASSAGE 문장과 ITEM 그림 전체만 고정 Source Unit으로 만든다', () => {
    const passage = buildSourceUnitRegistry(passagePacket());
    expect(passage.units.map((unit) => unit.sourceUnitId)).toEqual(['P1-S1', 'P1-S2', 'P1-S3']);
    const itemPacket = SourcePacketSchema.parse({
      packetVersion: 'problem-source-packet-v1',
      packetId: 'lens-item',
      sourceId: 'lens',
      questionNumber: 11,
      scope: 'ITEM',
      documents: [{ documentId: 'ITEM-S1', sourceArea: 'SCENARIO_TEXT', text: '조건이다.' }],
      media: [{
        mediaId: 'MEDIA1', sourceUrl: 'https://example.com/a.png', localPath: 'a.png',
        mimeType: 'image/png', contentHash: HASH, width: 100, height: 100,
        sourceArea: 'SCENARIO_VISUAL', documentId: 'ITEM-S1',
      }],
      upstreamFrozenBundleHashes: [],
    });
    const item = buildSourceUnitRegistry(itemPacket);
    expect(item.units.map((unit) => [unit.sourceUnitId, unit.unitType, unit.status])).toEqual([
      ['I0-S1', 'SCENARIO_SENTENCE', 'FIXED'],
      ['FIG1', 'FIGURE', 'FIXED'],
    ]);
    expect(validateSourceUnitRegistryAgainstPacket({ registry: item, sourcePacket: itemPacket }))
      .toEqual(item);
  });

  it('발문은 과학 claim에서 제외하고 부정 선택 극성을 코드로 고정한다', () => {
    const packet = SourcePacketSchema.parse({
      packetVersion: 'problem-source-packet-v1',
      packetId: 'lens-item-directive', sourceId: 'lens', questionNumber: 11, scope: 'ITEM',
      documents: [{
        documentId: 'ITEM-STEM', sourceArea: 'STEM',
        text: '<보기>는 학습 자료이다. 적절하지 않은 것은?',
      }],
      media: [], upstreamFrozenBundleHashes: [],
    });
    const registry = buildSourceUnitRegistry(packet);
    expect(registry.units.map((unit) => ({
      id: unit.sourceUnitId,
      role: unit.unitRole,
      policy: unit.claimExtractionPolicy,
      polarity: unit.questionPolarity,
    }))).toEqual([
      { id: 'I0-S1', role: 'ITEM_DIRECTIVE', policy: 'EXCLUDE', polarity: null },
      { id: 'I0-S2', role: 'ITEM_DIRECTIVE', policy: 'EXCLUDE', polarity: 'SELECT_INCORRECT' },
    ]);
  });

  it('원문 offset·hash·비공백 coverage가 바뀐 registry를 거부한다', () => {
    const packet = passagePacket();
    const registry = buildSourceUnitRegistry(packet);
    expect(validateSourceUnitRegistryAgainstPacket({ registry, sourcePacket: packet })).toEqual(registry);
    const changed = structuredClone(registry);
    changed.units[1]!.documentStart! += 1;
    expect(() => validateSourceUnitRegistryAgainstPacket({ registry: changed, sourcePacket: packet }))
      .toThrow(/보존되지 않은 원문|offset slice/);
  });

  it('LLM claim 계약에는 offset 필드가 없고 추가하면 거부한다', () => {
    const valid = {
      bundleVersion: 'problem-source-bundle-v2',
      scope: 'PASSAGE',
      sourcePacketHash: HASH,
      sourceUnitRegistryHash: HASH,
      offsetFieldsProducedByModel: false,
      itemDirectives: [],
      claims: [{
        claimId: 'P1-S1-C1', sourceUnitId: 'P1-S1', normalizedClaim: '첫 문장이다.',
        polarity: 'POSITIVE', modality: 'ASSERTED', qualifiers: [], evidenceFragments: ['첫 문장이다'],
      }],
      entities: [],
      quantities: [],
      relations: [],
      visualCandidates: [],
      mediaAssessment: {
        hasMedia: false,
        visualRelevant: false,
        visualRequiredForSourceUnderstanding: false,
        visualRequiredForSolving: 'UNASSESSED',
        reason: '그림이 없다.',
      },
      unresolved: [],
    };
    expect(SourceBundleV2Schema.parse(valid).claims).toHaveLength(1);
    expect(() => SourceBundleV2Schema.parse({
      ...valid,
      claims: [{ ...valid.claims[0], start: 0, end: 6 }],
    })).toThrow();
  });

  it('제공자용 생성 스키마에서도 entity VERIFIED를 선택할 수 없다', () => {
    const providerSchemaText = JSON.stringify(createSourceProviderJsonSchema(SourceBundleV2Schema));
    expect(providerSchemaText).toContain('EVIDENCE_GROUNDED_CANDIDATE');
    expect(providerSchemaText).not.toContain('VERIFIED');
    const valid = {
      bundleVersion: 'problem-source-bundle-v2', scope: 'PASSAGE',
      sourcePacketHash: HASH, sourceUnitRegistryHash: HASH, offsetFieldsProducedByModel: false,
      itemDirectives: [], claims: [], quantities: [], relations: [], visualCandidates: [],
      mediaAssessment: {
        hasMedia: false, visualRelevant: false, visualRequiredForSourceUnderstanding: false,
        visualRequiredForSolving: 'UNASSESSED', reason: '그림이 없다.',
      },
      unresolved: [],
    };
    expect(() => SourceBundleV2Schema.parse({
      ...valid,
      entities: [{
        entityId: 'E_TEST', canonicalLabel: '테스트', surfaceForms: ['테스트'],
        definitionSourceUnitId: null, definitionFragment: null,
        mergeBasis: 'HUMAN_APPROVAL', status: 'VERIFIED',
      }],
    })).toThrow();
  });

  it('근거는 유일 exact만 자동 연결하고 비정확·중복은 확정하지 않는다', () => {
    const packet = passagePacket();
    const registry = buildSourceUnitRegistry(packet);
    expect(resolveEvidenceFragment({
      evidenceId: 'E1', documentId: 'PASSAGE-P1', quote: '첫 문장이다', registry, sourcePacket: packet,
    })).toMatchObject({ status: 'EXACT_UNIQUE', sourceUnitIds: ['P1-S1'] });
    expect(resolveEvidenceFragment({
      evidenceId: 'E2', documentId: 'PASSAGE-P1', quote: '없는 문장', registry, sourcePacket: packet,
    })).toMatchObject({ status: 'NON_EXACT', sourceUnitIds: [] });
    const repeatedPacket = SourcePacketSchema.parse({
      ...packet,
      documents: [{ ...packet.documents[0], text: '반복이다. 반복이다.' }],
    });
    expect(resolveEvidenceFragment({
      evidenceId: 'E3', documentId: 'PASSAGE-P1', quote: '반복이다',
      registry: buildSourceUnitRegistry(repeatedPacket), sourcePacket: repeatedPacket,
    })).toMatchObject({ status: 'EXACT_AMBIGUOUS' });
  });
});

describe('SourceAudit v2 coverage와 생산 자격', () => {
  it('모든 unit과 claim을 정확히 한 번씩 검토해야 통과한다', () => {
    const candidate = audit([
      { unitId: 'P1-S1', claimIds: ['P1-S1-C1', 'P1-S1-C2'] },
      { unitId: 'P1-S2', claimIds: ['P1-S2-C1'] },
    ]);
    expect(validateSourceAuditV2Coverage({
      audit: candidate,
      expectedClaimsByUnit: {
        'P1-S1': ['P1-S1-C1', 'P1-S1-C2'],
        'P1-S2': ['P1-S2-C1'],
      },
    }).unitAudits).toHaveLength(2);
  });

  it('범위형 ID와 claim 누락을 거부한다', () => {
    const range = audit([{ unitId: 'P1-S1', claimIds: ['P1-S1-C1', 'P1-S1-C2'], reviewed: ['C1-C2'] }]);
    expect(() => validateSourceAuditV2Coverage({
      audit: range,
      expectedClaimsByUnit: { 'P1-S1': ['P1-S1-C1', 'P1-S1-C2'] },
    })).toThrow(/범위형/);
    const missing = audit([{ unitId: 'P1-S1', claimIds: ['P1-S1-C1', 'P1-S1-C2'], reviewed: ['P1-S1-C1'] }]);
    expect(() => validateSourceAuditV2Coverage({
      audit: missing,
      expectedClaimsByUnit: { 'P1-S1': ['P1-S1-C1', 'P1-S1-C2'] },
    })).toThrow(/정확히 한 번/);
  });

  it('FIG unit의 모든 시각 후보도 정확히 한 번씩 검토해야 한다', () => {
    const candidate = audit([{ unitId: 'FIG1', claimIds: [] }]);
    candidate.unitAudits[0]!.candidateVisualIds = ['FIG1-V1', 'FIG1-V2'];
    candidate.unitAudits[0]!.visualCandidatesReviewed = ['FIG1-V1'];
    expect(() => validateSourceAuditV2Coverage({
      audit: candidate,
      expectedClaimsByUnit: { FIG1: [] },
      expectedVisualsByUnit: { FIG1: ['FIG1-V1', 'FIG1-V2'] },
    })).toThrow(/모든 시각 후보/);
  });

  it('REPAIR_REQUIRED와 BLOCKING은 frozen artifact도 생산 입력으로 쓰지 못한다', () => {
    for (const decision of ['REPAIR_REQUIRED', 'BLOCKING'] as const) {
      const result = evaluateProductionEligibility({
        artifactFrozen: true,
        unitAudits: audit([{ unitId: 'P1-S1', claimIds: [], decision }]).unitAudits,
      });
      expect(result.artifactFrozen).toBe(true);
      expect(result.productionEligible).toBe(false);
    }
  });

  it('WARNING은 downstreamImpact NONE일 때만 생산 가능하다', () => {
    const safe = evaluateProductionEligibility({
      artifactFrozen: true,
      unitAudits: audit([{
        unitId: 'P1-S1', claimIds: [], decision: 'WARNING', downstreamImpact: 'NONE',
      }]).unitAudits,
    });
    const unsafe = evaluateProductionEligibility({
      artifactFrozen: true,
      unitAudits: audit([{
        unitId: 'P1-S1', claimIds: [], decision: 'WARNING', downstreamImpact: 'POSSIBLE',
      }]).unitAudits,
    });
    expect(safe.productionEligible).toBe(true);
    expect(unsafe.productionEligible).toBe(false);
  });

  it('방향 같은 의미 오류는 downstreamImpact NONE이어도 WARNING 우회가 불가능하다', () => {
    const warning = audit([{
      unitId: 'P1-S1', claimIds: [], decision: 'WARNING', downstreamImpact: 'NONE',
    }]).unitAudits[0]!;
    warning.issues.push({
      issueCode: 'REVERSED_RATIO',
      issueClass: 'DIRECTION',
      description: '비율 방향이 반대다.',
      affectedClaimIds: [],
      affectedVisualCandidateIds: [],
    });
    expect(evaluateProductionEligibility({
      artifactFrozen: true,
      unitAudits: [warning],
    }).productionEligible).toBe(false);
  });

  it('UNRESOLVED는 모든 제외 조건과 인간 승인이 있어야 예외 자격을 얻는다', () => {
    const unresolved = audit([{
      unitId: 'P1-S1', claimIds: [], decision: 'UNRESOLVED', downstreamImpact: 'POSSIBLE',
    }]).unitAudits;
    expect(evaluateProductionEligibility({ artifactFrozen: true, unitAudits: unresolved })
      .productionEligible).toBe(false);
    expect(evaluateProductionEligibility({
      artifactFrozen: true,
      unitAudits: unresolved,
      unresolvedExclusions: [{
        sourceUnitId: 'P1-S1',
        sourceMeaningNonDecisive: true,
        passageGoldImpactNone: true,
        allLinkedItemImpactNone: true,
        coverageReasonRecorded: true,
        humanApproved: true,
      }],
    }).productionEligible).toBe(true);
  });
});
