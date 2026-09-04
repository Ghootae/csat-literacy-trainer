import { describe, expect, it } from 'vitest';

import {
  OptionClaimBundleSchema,
  SourceBundleSchema,
  SourcePacketSchema,
  auditOptionClaimBundleAgainstPacket,
  auditSourceBundleAgainstPacket,
  canonicalSourcePacketHash,
  invertRatio,
  normalizeSourceEvidenceSpans,
  sourceArtifactHash,
  sourceBundleSemanticFingerprint,
  type SourceBundle,
  type SourcePacket,
} from './source-bundle.js';
import {
  SOURCE_ARTIFACT_AUDIT_BATCH_VERSION,
  SOURCE_ARTIFACT_AUDIT_VERSION,
  applyLensMutation,
  freezeSourceBundle,
  validateSourceArtifactAuditBatch,
  type SourceArtifactAudit,
} from './source-bundle-audit.js';
import { createSourceProviderJsonSchema } from './source-bundle-runtime.js';

const HASH = `sha256:${'a'.repeat(64)}`;

function packet(scope: 'PASSAGE' | 'ITEM' = 'ITEM'): SourcePacket {
  return SourcePacketSchema.parse({
    packetVersion: 'problem-source-packet-v1',
    packetId: `lens-${scope.toLowerCase()}`,
    sourceId: 'lens',
    questionNumber: scope === 'PASSAGE' ? null : 11,
    scope,
    documents: scope === 'PASSAGE' ? [{
      documentId: 'PASSAGE-P1',
      sourceArea: 'PASSAGE_TEXT',
      text: '물체점이 광축 위에 있을 때 입사 양상은 동일하다. 비점 격차는 광축 거리의 제곱에 비례한다.',
    }] : [{
      documentId: 'ITEM-S1',
      sourceArea: 'SCENARIO_TEXT',
      text: 'P0에서 광축까지의 거리는 P2에서 광축까지의 거리의 절반이다. P4는 광축 위에 있다.',
    }],
    media: scope === 'PASSAGE' ? [] : [{
      mediaId: 'MEDIA1',
      sourceUrl: 'https://example.com/lens.png',
      localPath: 'fixture/lens.png',
      mimeType: 'image/png',
      contentHash: HASH,
      width: 787,
      height: 481,
      sourceArea: 'SCENARIO_VISUAL',
      documentId: 'ITEM-S1',
    }],
    upstreamFrozenBundleHashes: [],
  });
}

function evidence(documentId: string, quote: string, text: string, evidenceId: string) {
  const start = text.indexOf(quote);
  return {
    evidenceId,
    sourceArea: documentId.startsWith('PASSAGE') ? 'PASSAGE_TEXT' : 'SCENARIO_TEXT',
    documentId,
    quote,
    start,
    end: start + quote.length,
    mediaId: null,
    region: null,
  } as const;
}

function bundle(sourcePacket = packet()): SourceBundle {
  const text = sourcePacket.documents[0].text;
  const item = sourcePacket.scope === 'ITEM';
  return SourceBundleSchema.parse({
    bundleVersion: 'problem-source-bundle-v1',
    bundleId: `${sourcePacket.packetId}-bundle`,
    sourcePacketHash: canonicalSourcePacketHash(sourcePacket),
    scope: sourcePacket.scope,
    claims: item ? [
      {
        claimId: 'SC1',
        normalizedClaim: 'distance(P0,optical_axis) = 0.5 × distance(P2,optical_axis)',
        claimType: 'QUANTITATIVE_RELATION',
        modality: 'ASSERTED',
        grounding: 'TEXT_EXPLICIT',
        visualPrecision: 'NOT_APPLICABLE',
        relation: {
          kind: 'RATIO', left: 'distance(P0,optical_axis)', operator: '=', coefficient: 0.5,
          right: 'distance(P2,optical_axis)',
        },
        conditions: [],
        evidence: [evidence('ITEM-S1', 'P0에서 광축까지의 거리는 P2에서 광축까지의 거리의 절반이다.', text, 'E1')],
        riskFlags: ['RATIO_DIRECTION'],
        isDerived: false,
      },
      {
        claimId: 'SC2',
        normalizedClaim: 'P4 is on optical_axis',
        claimType: 'QUALITATIVE_RELATION',
        modality: 'ASSERTED',
        grounding: 'CROSS_MODAL_CORROBORATED',
        visualPrecision: 'TOPOLOGICAL',
        relation: { kind: 'LOCATION', entity: 'P4', relation: 'ON', reference: 'optical_axis' },
        conditions: [],
        evidence: [
          evidence('ITEM-S1', 'P4는 광축 위에 있다.', text, 'E2'),
          {
            evidenceId: 'E3', sourceArea: 'SCENARIO_VISUAL', documentId: null, quote: null,
            start: null, end: null, mediaId: 'MEDIA1', region: [0, 0, 1, 1],
          },
        ],
        riskFlags: ['NONE'],
        isDerived: false,
      },
      {
        claimId: 'SC3',
        normalizedClaim: 'E is between C and D',
        claimType: 'VISUAL_RELATION',
        modality: 'ASSERTED',
        grounding: 'VISUAL_EXPLICIT',
        visualPrecision: 'TOPOLOGICAL',
        relation: { kind: 'TOPOLOGY', entity: 'E', relation: 'BETWEEN', references: ['C', 'D'] },
        conditions: [],
        evidence: [{
          evidenceId: 'E4', sourceArea: 'SCENARIO_VISUAL', documentId: null, quote: null,
          start: null, end: null, mediaId: 'MEDIA1', region: [0, 0, 1, 1],
        }],
        riskFlags: ['NONE'],
        isDerived: false,
      },
    ] : [
      {
        claimId: 'SC1',
        normalizedClaim: 'astigmatic_gap is proportional to distance(object_point,optical_axis)^2',
        claimType: 'QUANTITATIVE_RELATION',
        modality: 'ASSERTED',
        grounding: 'TEXT_EXPLICIT',
        visualPrecision: 'NOT_APPLICABLE',
        relation: {
          kind: 'PROPORTIONALITY', dependent: 'astigmatic_gap',
          independent: 'distance(object_point,optical_axis)', exponent: 2,
        },
        conditions: [],
        evidence: [evidence('PASSAGE-P1', '비점 격차는 광축 거리의 제곱에 비례한다.', text, 'E1')],
        riskFlags: ['NONE'],
        isDerived: false,
      },
      {
        claimId: 'SC2',
        normalizedClaim: 'if object_point is on optical_axis, incidence patterns are identical',
        claimType: 'CONDITION',
        modality: 'CONDITIONAL',
        grounding: 'TEXT_EXPLICIT',
        visualPrecision: 'NOT_APPLICABLE',
        relation: {
          kind: 'CONDITIONAL', condition: 'object_point is on optical_axis',
          consequence: 'incidence patterns are identical',
        },
        conditions: ['object_point is on optical_axis'],
        evidence: [evidence('PASSAGE-P1', '물체점이 광축 위에 있을 때 입사 양상은 동일하다.', text, 'E2')],
        riskFlags: ['CONDITION_SCOPE'],
        isDerived: false,
      },
    ],
    mediaAssessment: item ? {
      hasMedia: true, visualRelevant: true, visualRequiredForSourceUnderstanding: true,
      visualRequiredForSolving: 'UNASSESSED', reason: '객체 대응에 필요하다.',
    } : {
      hasMedia: false, visualRelevant: false, visualRequiredForSourceUnderstanding: false,
      visualRequiredForSolving: 'UNASSESSED', reason: '지문 미디어가 없다.',
    },
    unresolved: [],
  });
}

function passingAudit(candidate: SourceBundle, sourcePacket: SourcePacket): SourceArtifactAudit {
  return {
    auditVersion: SOURCE_ARTIFACT_AUDIT_VERSION,
    artifactHash: sourceArtifactHash(candidate),
    sourcePacketHash: canonicalSourcePacketHash(sourcePacket),
    isolation: {
      sourceOnly: true,
      candidateHiddenDuringIndependentReading: true,
      answerKeyUsed: false,
      officialExplanationUsed: false,
    },
    unitAudits: candidate.claims.map((claim) => ({
      unitId: claim.claimId,
      decision: 'PASS',
      checks: {
        sourceFaithful: true,
        directionPreserved: true,
        conditionPreserved: true,
        modalityPreserved: true,
        visualPrecisionAppropriate: true,
      },
      evidence: [{
        documentId: sourcePacket.documents[0].documentId,
        quote: sourcePacket.documents[0].text.slice(0, 5),
        mediaId: null,
        reason: '원문과 일치한다.',
      }],
      reason: '통과',
    })),
    forcedAlternativeChecks: [],
    conflicts: [],
    overallDecision: 'PASS',
    reason: '모든 claim 통과',
  };
}

describe('Source Bundle contracts', () => {
  it('PASSAGE·ITEM·OPTIONS 입력에서 역할 밖 자료를 차단한다', () => {
    expect(() => SourcePacketSchema.parse({ ...packet('PASSAGE'), answerKey: { correctChoice: 3 } }))
      .toThrow();
    expect(() => SourcePacketSchema.parse({
      ...packet('PASSAGE'),
      documents: [{ documentId: 'C1', sourceArea: 'CHOICE', text: '선지' }],
    })).toThrow(/허용되지 않는/);
    expect(() => SourcePacketSchema.parse({ ...packet(), officialExplanation: '해설' })).toThrow();
  });

  it('유일한 원문 quote의 잘못된 위치만 기계적으로 정규화한다', () => {
    const sourcePacket = packet();
    const original = bundle(sourcePacket);
    const broken = structuredClone(original);
    broken.claims[0].evidence[0].start = 0;
    broken.claims[0].evidence[0].end = 1;
    const normalized = normalizeSourceEvidenceSpans({ bundle: broken, packet: sourcePacket });
    expect(normalized.changes).toHaveLength(1);
    expect(auditSourceBundleAgainstPacket(normalized.bundle, sourcePacket)).toEqual({
      passed: true,
      issues: [],
    });
  });

  it('비율 역변환은 좌우를 바꾸고 계수의 역수를 취한다', () => {
    expect(invertRatio({
      kind: 'RATIO', left: 'd(P0)', operator: '=', coefficient: 0.5, right: 'd(P2)',
    })).toEqual({
      kind: 'RATIO', left: 'd(P2)', operator: '=', coefficient: 2, right: 'd(P0)',
    });
  });

  it('Source Claim에 파생 관계를 직접 넣지 못한다', () => {
    const raw = structuredClone(bundle());
    raw.claims[0].isDerived = true as false;
    expect(() => SourceBundleSchema.parse(raw)).toThrow();
  });

  it('3회 의미 fingerprint와 3회 독립 감사 통과 뒤에만 동결한다', () => {
    const sourcePacket = packet();
    const candidate = bundle(sourcePacket);
    const audit = passingAudit(candidate, sourcePacket);
    const frozen = freezeSourceBundle({
      packet: sourcePacket,
      generatedBundles: [candidate, structuredClone(candidate), structuredClone(candidate)],
      audits: [audit, structuredClone(audit), structuredClone(audit)],
      frozenAt: '2026-09-03T00:00:00.000Z',
    });
    expect(frozen.semanticFingerprint).toBe(sourceBundleSemanticFingerprint(candidate));
    const changed = structuredClone(candidate);
    const firstRelation = changed.claims[0].relation;
    if (firstRelation.kind !== 'RATIO') throw new Error('테스트 fixture 오류');
    changed.claims[0].relation = { ...firstRelation, coefficient: 2 };
    expect(() => freezeSourceBundle({
      packet: sourcePacket,
      generatedBundles: [candidate, candidate, changed],
      audits: [audit, audit, { ...audit, artifactHash: sourceArtifactHash(changed) }],
      frozenAt: '2026-09-03T00:00:00.000Z',
    })).toThrow(/fingerprint/);
  });

  it('1회 생성 후보도 medium/high 감사 두 건이 모두 통과하면 동결한다', () => {
    const sourcePacket = packet();
    const candidate = bundle(sourcePacket);
    const audit = passingAudit(candidate, sourcePacket);
    const frozen = freezeSourceBundle({
      packet: sourcePacket,
      generatedBundles: [candidate],
      audits: [audit, structuredClone(audit)],
      frozenAt: '2026-09-03T00:00:00.000Z',
    });
    expect(frozen.acceptedGenerationHashes).toHaveLength(1);
    expect(frozen.acceptedAuditHashes).toHaveLength(2);
  });

  it('한 번의 배치 비교가 지문 후보 세 개를 정확히 덮는지 검증한다', () => {
    const sourcePacket = packet('PASSAGE');
    const candidates = [
      bundle(sourcePacket),
      bundle(sourcePacket),
      bundle(sourcePacket),
    ] as const;
    const batch = {
      batchVersion: SOURCE_ARTIFACT_AUDIT_BATCH_VERSION,
      sourcePacketHash: canonicalSourcePacketHash(sourcePacket),
      candidateAudits: candidates.map((candidate, index) => ({
        candidateId: `RUN${index + 1}`,
        artifactHash: sourceArtifactHash(candidate),
        audit: passingAudit(candidate, sourcePacket),
      })),
    };
    expect(validateSourceArtifactAuditBatch({ batch, candidates, sourcePacket }))
      .toMatchObject({ batchVersion: SOURCE_ARTIFACT_AUDIT_BATCH_VERSION });
    const missing = structuredClone(batch);
    missing.candidateAudits.pop();
    expect(() => validateSourceArtifactAuditBatch({ batch: missing, candidates, sourcePacket }))
      .toThrow(/모든 후보/);
  });

  it('다섯 가지 렌즈 변이를 서로 다른 artifact hash로 만든다', () => {
    const itemBundle = bundle();
    const passageBundle = bundle(packet('PASSAGE'));
    const mutations = [
      applyLensMutation(itemBundle, 'RATIO_DIRECTION_REVERSAL'),
      applyLensMutation(itemBundle, 'P4_AXIS_LOCATION_REVERSAL'),
      applyLensMutation(passageBundle, 'SQUARE_TO_LINEAR'),
      applyLensMutation(itemBundle, 'E_BETWEEN_TO_OUTSIDE'),
      applyLensMutation(passageBundle, 'CONDITION_DELETION'),
    ];
    expect(new Set(mutations.map(sourceArtifactHash))).toHaveLength(5);
  });
});

describe('Option claim boundary', () => {
  it('정답과 진릿값 없이 원문 선지만 보존한다', () => {
    const sourcePacket = SourcePacketSchema.parse({
      packetVersion: 'problem-source-packet-v1',
      packetId: 'lens-options',
      sourceId: 'lens',
      questionNumber: 11,
      scope: 'OPTIONS',
      documents: [
        { documentId: 'C1', sourceArea: 'CHOICE', text: 'E는 더 뚜렷하겠군.' },
        { documentId: 'C2', sourceArea: 'CHOICE', text: '거리는 4배가 되겠군.' },
      ],
      media: [],
      upstreamFrozenBundleHashes: [HASH, `sha256:${'b'.repeat(64)}`],
    });
    const optionBundle = OptionClaimBundleSchema.parse({
      bundleVersion: 'problem-option-claim-bundle-v1',
      bundleId: 'lens-options-bundle',
      sourcePacketHash: canonicalSourcePacketHash(sourcePacket),
      upstreamFrozenBundleHashes: sourcePacket.upstreamFrozenBundleHashes,
      choices: [
        {
          choiceId: 'C1', rawText: 'E는 더 뚜렷하겠군.',
          claims: [{
            claimId: 'OC1-1', atomicClaim: 'E는 더 뚜렷하다.', polarity: 'POSITIVE',
            condition: null, quantifier: null, relation: { kind: 'NONE' }, sourceQuote: 'E는 더 뚜렷하겠군.',
          }],
        },
        {
          choiceId: 'C2', rawText: '거리는 4배가 되겠군.',
          claims: [{
            claimId: 'OC2-1', atomicClaim: '거리는 4배이다.', polarity: 'POSITIVE',
            condition: null, quantifier: '4배', relation: { kind: 'NONE' }, sourceQuote: '거리는 4배가 되겠군.',
          }],
        },
      ],
      truthJudgmentsIncluded: false,
      answerKeyUsed: false,
    });
    expect(auditOptionClaimBundleAgainstPacket(optionBundle, sourcePacket)).toEqual({
      passed: true, issues: [],
    });
    expect(() => OptionClaimBundleSchema.parse({ ...optionBundle, answerChoiceId: 'C3' })).toThrow();
  });

  it('OpenAI strict output용 schema에서 format과 선택 속성을 제거한다', () => {
    const schema = createSourceProviderJsonSchema(SourceBundleSchema);
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (typeof value !== 'object' || value === null) return;
      const record = value as Record<string, unknown>;
      expect(record).not.toHaveProperty('format');
      expect(record).not.toHaveProperty('prefixItems');
      if (record['type'] === 'array') expect(record).toHaveProperty('items');
      if (record['type'] === 'object' && record['properties'] !== undefined) {
        expect(record['required']).toEqual(Object.keys(record['properties'] as object));
      }
      Object.values(record).forEach(visit);
    };
    visit(schema);
  });
});
