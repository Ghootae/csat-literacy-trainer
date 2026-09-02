import { describe, expect, it } from 'vitest';

import {
  EXPLANATION_AUDIT_VERSION,
  ExplanationAuditProviderOutputSchema,
  ExplanationAuditSchema,
  auditExplanationPlacementContract,
  canonicalExplanationReferenceHash,
  createExplanationAuditProviderJsonSchema,
  validateExplanationAuditAgainstReference,
} from './explanation-audit.js';

const reference = {
  publisher: 'EBS',
  service: 'EBSi',
  officiality: '공식 배포 해설',
  sourceUrl: 'https://example.com/explanation.pdf',
  pdfPages: [7],
  sectionTitle: '12. 구체적 사례 적용',
  text: 'A의 전환율이 더 크다. 따라서 A가 더 많은 수소를 생성한다. 정답 ④.',
};

function validAudit() {
  return {
    schemaVersion: EXPLANATION_AUDIT_VERSION,
    explanationHash: canonicalExplanationReferenceHash(reference),
    claims: [
      {
        claimId: 'EC1',
        sourceText: 'A의 전환율이 더 크다.',
        normalizedClaim: 'A의 전환율은 B보다 크다.',
        claimKind: 'SOURCE_STATEMENT',
        classification: 'SOURCE_EXPLICIT',
        sourceEvidence: [{
          sourceArea: 'PASSAGE',
          locator: '3문단',
          quote: 'A의 전환율은 0.9 이상이다.',
        }],
        derivationOperation: 'NONE',
        derivation: null,
        placement: 'BASE_GOLD',
        supplementalGroundedness: null,
        riskFlags: ['NONE'],
        reason: '지문에서 직접 확인된다.',
      },
      {
        claimId: 'EC2',
        sourceText: '따라서 A가 더 많은 수소를 생성한다.',
        normalizedClaim: '같은 공급량에서 A의 수소 생성량이 더 많다.',
        claimKind: 'INFERENCE_BRIDGE',
        classification: 'SOURCE_DERIVED',
        sourceEvidence: [{
          sourceArea: 'PASSAGE',
          locator: '3문단',
          quote: '반응량과 수소 생성량은 몰비로 연결된다.',
        }],
        derivationOperation: 'FOLLOW_CAUSAL_CHAIN',
        derivation: '전환율에서 반응량을 거쳐 수소 생성량을 비교한다.',
        placement: 'SUPPLEMENTAL',
        supplementalGroundedness: 'ENTAILED',
        riskFlags: ['NONE'],
        reason: '도출 가능하지만 필수 기본 경로인지 별도 검토한다.',
      },
      {
        claimId: 'EC3',
        sourceText: '정답 ④.',
        normalizedClaim: '정답은 ④이다.',
        claimKind: 'ANSWER_IDENTIFICATION',
        classification: 'ANSWER_KEY_CONSTRAINED',
        sourceEvidence: [{
          sourceArea: 'ANSWER_KEY',
          locator: '정답 표기',
          quote: '④',
        }],
        derivationOperation: 'NONE',
        derivation: null,
        placement: 'EXCLUDED',
        supplementalGroundedness: null,
        riskFlags: ['NONE'],
        reason: '정답 식별은 생성 근거로 쓰지 않는다.',
      },
    ],
    omittedSegments: [],
    coverage: 'COMPLETE',
    overallDecision: 'PASS',
    unresolvedRisks: [],
    reason: '모든 실질 claim을 분류했다.',
  };
}

describe('ExplanationAudit contract', () => {
  it('해설 claim의 출처 등급과 배치를 분리해 검증한다', () => {
    expect(validateExplanationAuditAgainstReference(validAudit(), reference).claims)
      .toHaveLength(3);
  });

  it('정답 키·외부 지식을 기본 골드에 배치하지 못하게 한다', () => {
    const audit = validAudit();
    audit.claims[2]!.placement = 'BASE_GOLD';

    expect(() => ExplanationAuditSchema.parse(audit)).toThrow(/기본 골드/);
  });

  it('SOURCE_DERIVED에는 원문 근거와 도출 연산을 요구한다', () => {
    const audit = validAudit();
    audit.claims[1]!.derivationOperation = 'NONE';
    audit.claims[1]!.derivation = null;

    expect(() => ExplanationAuditSchema.parse(audit)).toThrow(/연산과 재구성/);
  });

  it('공급자 구조 출력의 교차 필드 오류는 자동 수정 루프까지 전달한다', () => {
    const audit = validAudit();
    audit.claims[2]!.derivationOperation = 'COMPARE';
    audit.claims[2]!.derivation = '정답 번호를 다른 선지와 비교했다.';

    expect(ExplanationAuditProviderOutputSchema.parse(audit)).toEqual(audit);
    expect(() => ExplanationAuditSchema.parse(audit)).toThrow(
      /도출 연산은 SOURCE_DERIVED claim에만 허용/,
    );
  });

  it('실질 내용 누락과 미해결 claim은 자동 통과시키지 않는다', () => {
    const audit = validAudit();
    audit.omittedSegments = [{
      sourceText: '정답 ④.',
      substantive: true,
      reason: '분해 실패',
    }];
    audit.coverage = 'INCOMPLETE';

    expect(() => ExplanationAuditSchema.parse(audit)).toThrow(/사람 검토/);
  });

  it('해설 해시와 원문에 없는 claim 인용을 거부한다', () => {
    const wrongHash = validAudit();
    wrongHash.explanationHash = `sha256:${'0'.repeat(64)}`;
    expect(() => validateExplanationAuditAgainstReference(wrongHash, reference))
      .toThrow(/해설 해시/);

    const inventedQuote = validAudit();
    inventedQuote.claims[0]!.sourceText = '해설에 없는 문장';
    expect(() => validateExplanationAuditAgainstReference(inventedQuote, reference))
      .toThrow(/해설 원문/);
  });

  it('보충 층에는 SUPPLEMENTAL로 허용한 정확한 claim만 넣는다', () => {
    const audit = validAudit();
    expect(auditExplanationPlacementContract(audit, {
      supplementalExplanationInferences: [{
        sourceText: '따라서 A가 더 많은 수소를 생성한다.',
      }],
    })).toEqual({ passed: true, issues: [] });

    const excluded = auditExplanationPlacementContract(audit, {
      supplementalExplanationInferences: [{ sourceText: '정답 ④.' }],
    });
    expect(excluded.passed).toBe(false);
    expect(excluded.issues).toEqual([
      expect.stringContaining('SUPPLEMENTAL 허용 claim'),
    ]);
  });

  it('공급자 JSON Schema의 모든 객체 필드를 required로 고정한다', () => {
    const schema = createExplanationAuditProviderJsonSchema();
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual(Object.keys(
      schema['properties'] as Record<string, unknown>,
    ));
  });
});
