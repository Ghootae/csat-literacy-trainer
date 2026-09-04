import { describe, expect, it } from 'vitest';

import { SourcePacketSchema, sourceArtifactHash } from './source-bundle.js';
import { createSourceProviderJsonSchema } from './source-bundle-runtime.js';
import {
  LensVisualAuditSchema,
  LensVisualEvaluationReferenceSchema,
  LensVisualObservationSchema,
  LensVisualTextContextSchema,
  scoreLensVisualObservation,
  validateLensVisualAuditCoverage,
  type LensVisualObservation,
} from './visual-source-experiment.js';
import {
  assertLensVisualOnlyIsolation,
  assertNoLensVisualInputLeak,
  buildLensTextGroundedVisualInput,
  buildLensVisualAuditInput,
  buildLensVisualOnlyInput,
  estimateLensVisualPreflightCost,
} from './visual-source-runtime.js';

const HASH = `sha256:${'a'.repeat(64)}`;
const REGISTRY_HASH = `sha256:${'b'.repeat(64)}`;

function packet() {
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: 'lens-item',
    sourceId: 'lens',
    questionNumber: 11,
    scope: 'ITEM',
    documents: [{
      documentId: 'ITEM-S1', sourceArea: 'SCENARIO_TEXT',
      text: 'P4는 광축 위에 있다.',
    }],
    media: [{
      mediaId: 'MEDIA1', sourceUrl: 'https://example.com/lens.png', localPath: 'lens.png',
      mimeType: 'image/png', contentHash: HASH, width: 787, height: 481,
      sourceArea: 'SCENARIO_VISUAL', documentId: 'ITEM-S1',
    }],
    upstreamFrozenBundleHashes: [],
  });
}

function textContext() {
  return LensVisualTextContextSchema.parse({
    contextVersion: 'lens-visual-text-context-v1',
    sourcePacketHash: sourceArtifactHash(packet()),
    sourceUnitRegistryHash: REGISTRY_HASH,
    artifactFrozen: true,
    usePolicy: 'VISUAL_EXPERIMENT_ONLY',
    excludes: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD'],
    claims: [{
      claimId: 'TXT_P4_AXIS', sourceUnitId: 'I1-S1', statement: 'P4는 광축 위에 있다.',
      sourceQuote: 'P4는 광축 위에 있다.', relationFamily: 'TOPOLOGY',
      reviewBasis: 'EXACT_SOURCE_TEXT_AND_PRIOR_SOURCE_AUDIT',
    }],
  });
}

function reference() {
  return LensVisualEvaluationReferenceSchema.parse({
    referenceVersion: 'lens-visual-reference-v1',
    withheldFromAllApiCalls: true,
    mediaHash: HASH,
    requiredLabels: ['P0', 'P1', 'P2', 'P3', 'P4', 'C', 'D', 'E', '광축'],
    criticalFacts: [
      { factId: 'VF_C_SEGMENT', description: 'C 선분' },
      { factId: 'VF_D_SEGMENT', description: 'D 선분' },
      { factId: 'VF_E_CIRCLE', description: 'E 원형' },
      { factId: 'VF_P012_SAME_DRAWN_LINE', description: 'P0 P1 P2 동일 선' },
      { factId: 'VF_P3_NOT_SAME_DRAWN_LINE', description: 'P3 별도 선' },
      { factId: 'VF_P4_ON_OPTICAL_AXIS', description: 'P4 광축 위' },
    ],
    prohibitedVisualAssertions: [
      { ruleId: 'NO_RATIO', relationType: 'EXACT_DISTANCE_RATIO', description: '정확 배율 금지' },
      { ruleId: 'NO_3D', relationType: 'PERPENDICULAR_3D', description: '3D 수직 금지' },
      { ruleId: 'NO_ASSIGN', relationType: 'PLANE_ASSIGNMENT', description: '평면 배정 금지' },
    ],
  });
}

function observation(mode: 'VISUAL_ONLY' | 'TEXT_GROUNDED', id = 'OBSERVATION'): LensVisualObservation {
  const objectRows = [
    ['P0', 'POINT_MARK'], ['P1', 'POINT_MARK'], ['P2', 'POINT_MARK'], ['P3', 'POINT_MARK'],
    ['P4', 'POINT_MARK'], ['C', 'LINE_SEGMENT_MARK'], ['D', 'LINE_SEGMENT_MARK'],
    ['E', 'CIRCULAR_MARK'], ['광축', 'AXIS_LINE'],
  ] as const;
  const key = (label: string) => label === '광축' ? 'AXIS' : label;
  return LensVisualObservationSchema.parse({
    observationVersion: 'lens-visual-observation-v1',
    observationId: id,
    mode,
    mediaId: 'MEDIA1',
    mediaHash: HASH,
    textContextHash: mode === 'TEXT_GROUNDED' ? sourceArtifactHash(textContext()) : null,
    imageWasViewedAsWhole: true,
    croppedImageUsed: false,
    labels: objectRows.map(([label]) => ({
      candidateId: `LBL_${key(label)}`, labelText: label, linkedObjectId: `OBJ_${key(label)}`,
      evidenceDescription: `${label}를 봄`, provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE',
    })),
    objects: objectRows.map(([label, objectType]) => ({
      candidateId: `OBJ_${key(label)}`, linkedLabelTexts: [label], objectType,
      appearanceDescription: `${label} 객체`, authority: 'EXACT_PIXEL_TOPOLOGY',
      provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE',
    })),
    visualRelations: [
      { candidateId: 'REL_P012', relationType: 'SAME_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P0', 'OBJ_P1', 'OBJ_P2'], objectObjectIds: [],
        description: '같은 선', authority: 'EXACT_PIXEL_TOPOLOGY', scaleDependent: false,
        provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
      { candidateId: 'REL_P3', relationType: 'NOT_ON_SAME_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P3'], objectObjectIds: ['OBJ_P0', 'OBJ_P1', 'OBJ_P2'],
        description: '다른 선', authority: 'EXACT_PIXEL_TOPOLOGY', scaleDependent: false,
        provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
      { candidateId: 'REL_P4', relationType: 'ON_DRAWN_LINE',
        subjectObjectIds: ['OBJ_P4'], objectObjectIds: ['OBJ_AXIS'],
        description: '광축 위', authority: 'EXACT_PIXEL_TOPOLOGY', scaleDependent: false,
        provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE' },
    ],
    crossModalInterpretations: mode === 'TEXT_GROUNDED' ? [{
      interpretationId: 'CROSS_P4', visualCandidateIds: ['REL_P4'],
      sourceTextClaimIds: ['TXT_P4_AXIS'], statement: '두 출처가 P4 위치를 함께 지지',
      provenance: 'CROSS_MODAL_INTERPRETATION', status: 'CANDIDATE',
    }] : [],
    unresolved: [],
  });
}

function audit(candidates: Record<'CANDIDATE_A' | 'CANDIDATE_B' | 'CANDIDATE_C' | 'CANDIDATE_D', LensVisualObservation>) {
  return LensVisualAuditSchema.parse({
    auditVersion: 'lens-visual-audit-v1', auditId: 'AUDIT', model: 'gpt-5.6-terra',
    effort: 'medium', independentOfOtherAudit: true, mediaHash: HASH,
    candidateAudits: Object.entries(candidates).map(([candidateLabel, candidate]) => ({
      candidateLabel,
      declaredMode: candidate.mode,
      expectedLabelCandidateIds: candidate.labels.map((entry) => entry.candidateId),
      labelCandidateIdsReviewed: candidate.labels.map((entry) => entry.candidateId),
      expectedObjectCandidateIds: candidate.objects.map((entry) => entry.candidateId),
      objectCandidateIdsReviewed: candidate.objects.map((entry) => entry.candidateId),
      expectedRelationCandidateIds: candidate.visualRelations.map((entry) => entry.candidateId),
      relationCandidateIdsReviewed: candidate.visualRelations.map((entry) => entry.candidateId),
      expectedInterpretationIds: candidate.crossModalInterpretations.map((entry) => entry.interpretationId),
      interpretationIdsReviewed: candidate.crossModalInterpretations.map((entry) => entry.interpretationId),
      missingCriticalVisualMeaning: false,
      unsupportedVisualMeaningDetected: false,
      textAsVisualLeakageDetected: false,
      scaleOverclaimDetected: false,
      decision: 'PASS',
      issues: [],
    })),
    crossCandidateFindings: [],
    overallDecision: 'PASS',
  });
}

describe('볼록렌즈 전체 그림 시각 전처리 계약', () => {
  it('순수 시각 판독은 텍스트 context와 교차 해석을 구조적으로 거부한다', () => {
    const valid = observation('VISUAL_ONLY');
    expect(valid.crossModalInterpretations).toEqual([]);
    expect(() => LensVisualObservationSchema.parse({
      ...valid,
      textContextHash: REGISTRY_HASH,
    })).toThrow(/텍스트 context hash/);
    expect(() => LensVisualObservationSchema.parse({
      ...valid,
      crossModalInterpretations: [{
        interpretationId: 'CROSS_BAD', visualCandidateIds: ['REL_P4'],
        sourceTextClaimIds: ['TXT_P4_AXIS'], statement: '누출',
        provenance: 'CROSS_MODAL_INTERPRETATION', status: 'CANDIDATE',
      }],
    })).toThrow(/교차 양식/);
  });

  it('제공자 JSON schema는 모든 시각 결과를 CANDIDATE로만 허용한다', () => {
    const schemaText = JSON.stringify(createSourceProviderJsonSchema(LensVisualObservationSchema));
    expect(schemaText).toContain('CANDIDATE');
    expect(schemaText).not.toContain('VERIFIED');
  });

  it('사람 기준표로 라벨·핵심 시각 사실·금지 추론을 코드 채점한다', () => {
    const score = scoreLensVisualObservation({ observation: observation('VISUAL_ONLY'), reference: reference() });
    expect(score).toMatchObject({
      labelRecall: 1,
      labelPrecision: 1,
      criticalFactAccuracy: 1,
      prohibitedAssertionCount: 0,
      corePassed: true,
    });
    const changed = structuredClone(observation('VISUAL_ONLY'));
    changed.visualRelations.push({
      candidateId: 'REL_BAD_RATIO', relationType: 'EXACT_DISTANCE_RATIO',
      subjectObjectIds: ['OBJ_P0'], objectObjectIds: ['OBJ_P2'],
      description: '그림에서 정확히 절반', authority: 'ILLUSTRATIVE', scaleDependent: true,
      provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE',
    });
    const changedScore = scoreLensVisualObservation({ observation: changed, reference: reference() });
    expect(changedScore.prohibitedAssertionCount).toBe(1);
    expect(changedScore.corePassed).toBe(false);

    const missingP4Object = structuredClone(observation('VISUAL_ONLY'));
    missingP4Object.objects = missingP4Object.objects.filter((entry) => entry.candidateId !== 'OBJ_P4');
    missingP4Object.labels = missingP4Object.labels.map((entry) => (
      entry.linkedObjectId === 'OBJ_P4' ? { ...entry, linkedObjectId: null } : entry
    ));
    missingP4Object.visualRelations = missingP4Object.visualRelations.filter(
      (entry) => !entry.subjectObjectIds.includes('OBJ_P4'),
    );
    const missingScore = scoreLensVisualObservation({ observation: missingP4Object, reference: reference() });
    expect(missingScore.criticalFactChecks.find((entry) => entry.id === 'VF_P4_ON_OPTICAL_AXIS')?.passed)
      .toBe(false);

    const unexpectedLabel = structuredClone(observation('VISUAL_ONLY'));
    unexpectedLabel.labels.push({
      candidateId: 'LBL_UNKNOWN', labelText: '없는 라벨', linkedObjectId: null,
      evidenceDescription: '잘못 읽은 라벨', provenance: 'VISUAL_OBSERVATION', status: 'CANDIDATE',
    });
    const unexpectedScore = scoreLensVisualObservation({ observation: unexpectedLabel, reference: reference() });
    expect(unexpectedScore.labelPrecision).toBeLessThan(1);
    expect(unexpectedScore.corePassed).toBe(false);
  });

  it('시각 감사는 네 후보의 label·object·relation·interpretation을 모두 검토해야 한다', () => {
    const candidates = {
      CANDIDATE_A: observation('VISUAL_ONLY', 'OBS_A'),
      CANDIDATE_B: observation('VISUAL_ONLY', 'OBS_B'),
      CANDIDATE_C: observation('TEXT_GROUNDED', 'OBS_C'),
      CANDIDATE_D: observation('TEXT_GROUNDED', 'OBS_D'),
    } as const;
    const valid = audit(candidates);
    expect(validateLensVisualAuditCoverage({ audit: valid, candidates }).candidateAudits).toHaveLength(4);
    const missing = structuredClone(valid);
    missing.candidateAudits[0]!.objectCandidateIdsReviewed.pop();
    expect(() => validateLensVisualAuditCoverage({ audit: missing, candidates })).toThrow(/coverage/);

    expect(() => LensVisualAuditSchema.parse({
      ...valid,
      candidateAudits: valid.candidateAudits.map((entry, index) => index === 0 ? {
        ...entry,
        missingCriticalVisualMeaning: true,
        decision: 'PASS',
      } : entry),
    })).toThrow(/PASS\/WARNING/);
  });

  it('순수 시각 입력에는 텍스트가 없고 결합 입력에만 검증 text context가 있다', () => {
    const visualOnly = buildLensVisualOnlyInput({ packet: packet(), observationId: 'OBS_A' });
    expect(() => assertLensVisualOnlyIsolation(visualOnly)).not.toThrow();
    expect(JSON.stringify(visualOnly)).not.toContain('P4는 광축 위에 있다');
    const grounded = buildLensTextGroundedVisualInput({
      packet: packet(), textContext: textContext(), observationId: 'OBS_C',
    }) as Record<string, unknown>;
    expect(grounded['verifiedTextContext']).toBeDefined();
    expect(() => assertNoLensVisualInputLeak(grounded)).not.toThrow();
  });

  it('감사 입력은 사람 기준표와 medium/high 후보 매핑을 포함하지 않는다', () => {
    const candidates = {
      CANDIDATE_A: observation('VISUAL_ONLY', 'OBS_A'),
      CANDIDATE_B: observation('VISUAL_ONLY', 'OBS_B'),
      CANDIDATE_C: observation('TEXT_GROUNDED', 'OBS_C'),
      CANDIDATE_D: observation('TEXT_GROUNDED', 'OBS_D'),
    } as const;
    const input = buildLensVisualAuditInput({
      packet: packet(), textContext: textContext(), candidates, auditId: 'AUDIT', effort: 'medium',
    });
    const serialized = JSON.stringify(input);
    expect(serialized).not.toContain('withheldFromAllApiCalls');
    expect(serialized).not.toContain('VISUAL_ONLY_MEDIUM');
    expect(() => assertNoLensVisualInputLeak(input)).not.toThrow();
  });

  it('호출 전 비용은 전체 이미지 reserve와 출력 상한을 함께 계산한다', () => {
    const result = estimateLensVisualPreflightCost({
      input: {}, promptBytes: 100, imageCount: 1, maxOutputTokens: 7_000,
      cumulativeActualCostUsdBeforeCall: 0.6, budgetCeilingUsd: 2,
    });
    expect(result.conservativeInputTokenCeiling).toBe(10_102);
    expect(result.maximumCallCostUsd).toBeCloseTo((10_102 * 2.5 + 7_000 * 12) / 1_000_000);
  });
});
