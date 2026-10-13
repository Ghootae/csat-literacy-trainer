import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  adjudicatePrincipleExceptionCoverage,
  adjudicatePrincipleExceptionCoverageWithScopeGate,
  validatePrincipleExceptionEvidence,
  type PrincipleExceptionEvidenceOutput,
} from './principle-exception-adjudicator.js';

const paragraphId = 'source123-p1';

function input(): ParagraphGoldAuditInput {
  const text = '원칙적으로 A이지만 조건 C에서는 B이다.';
  return {
    sourceId: 'source123',
    passageId: 'source123',
    passageParagraphs: [{ paragraphId, position: 1, text }],
    targetParagraph: {
      paragraphId,
      position: 1,
      text,
      textReferencesVisual: false,
      passageMediaCount: 0,
    },
    diagnosticGold: {
      paragraphId,
      paragraphText: text,
      centralObject: 'A와 B',
      centralStory: 'A가 원칙이지만 C에서는 B이다.',
      centralAxes: [{ id: 'AX1', description: 'A 원칙과 C의 B', relationIds: ['MR1'] }],
      coreRelations: [{ id: 'MR1', description: 'A가 원칙이고 C에서는 B이다.' }],
      keyMappings: [],
      supportingConcepts: [],
    },
    propositionBundle: {
      schemaVersion: 'paragraph-proposition-bundle-v1',
      sourceId: 'source123',
      passageId: 'source123',
      paragraphId,
      position: 1,
      passageHash: `sha256:${'a'.repeat(64)}`,
      paragraphHash: `sha256:${'b'.repeat(64)}`,
      analysisRunId: 'resp_test',
      analysisSchemaVersion: 'paragraph-analysis-openai-v3',
      analysisPromptVersion: 'paragraph-analysis-prompt-v3.1',
      derivation: 'INITIAL_ANALYSIS',
      parentBundleHash: null,
      repairRunId: null,
      propositions: [
        { id: 'P1', description: 'A가 원칙이다.', evidence: '원칙적으로 A' },
        { id: 'P2', description: 'C에서는 B이다.', evidence: '조건 C에서는 B' },
      ],
      propositionEdges: [],
      generationStatus: 'STATIC_VALIDATED',
      auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

function evidence(): PrincipleExceptionEvidenceOutput {
  return {
    schemaVersion: 'principle-exception-adjudicator-v1',
    sourceId: 'source123',
    paragraphId,
    applicability: 'CENTRAL',
    centralityRationale: '원칙과 조건부 예외가 문단 전체를 조직한다.',
    contrastExplanation: 'A가 일반 원칙이고 C에서는 B가 우선한다.',
    principle: {
      meaning: 'A가 원칙이다.',
      sourceEvidence: '원칙적으로 A',
      propositionIds: ['P1'],
      centralStoryCoverage: 'PRESENT',
      centralStoryMapping: 'A가 원칙',
      centralAxisIds: ['AX1'],
      coreRelationIds: ['MR1'],
      mappingExplanation: 'P1, AX1, MR1이 A 원칙을 보존한다.',
    },
    exception: {
      meaning: 'C에서는 B이다.',
      sourceEvidence: '조건 C에서는 B',
      propositionIds: ['P2'],
      centralStoryCoverage: 'PRESENT',
      centralStoryMapping: 'C에서는 B',
      centralAxisIds: ['AX1'],
      coreRelationIds: ['MR1'],
      mappingExplanation: 'P2, AX1, MR1이 예외를 보존한다.',
    },
  };
}

describe('principle-exception machine adjudicator', () => {
  it('passes only when both sides have complete coverage', () => {
    expect(adjudicatePrincipleExceptionCoverage(evidence(), input()).status).toBe('PASS');
  });

  it('fails mechanically when the principle is absent from centralStory', () => {
    const candidate = evidence();
    candidate.principle.centralStoryCoverage = 'ABSENT';
    candidate.principle.centralStoryMapping = null;
    const result = adjudicatePrincipleExceptionCoverage(candidate, input());
    expect(result.status).toBe('FAIL');
    expect(result.principle.missingComponents).toEqual(['CENTRAL_STORY']);
  });

  it('returns NOT_APPLICABLE without pretending that empty evidence is a failure', () => {
    const candidate = evidence();
    candidate.applicability = 'NOT_APPLICABLE';
    candidate.contrastExplanation = null;
    for (const side of [candidate.principle, candidate.exception]) {
      side.meaning = null;
      side.sourceEvidence = null;
      side.propositionIds = [];
      side.centralStoryCoverage = 'NOT_APPLICABLE';
      side.centralStoryMapping = null;
      side.centralAxisIds = [];
      side.coreRelationIds = [];
      side.mappingExplanation = null;
    }
    expect(adjudicatePrincipleExceptionCoverage(candidate, input()).status).toBe('NOT_APPLICABLE');
  });

  it('allows NOT_CENTRAL to explain the near-boundary contrast without coverage claims', () => {
    const candidate = evidence();
    candidate.applicability = 'NOT_CENTRAL';
    candidate.contrastExplanation = '대비는 있지만 문단의 중심 원칙-예외는 아니다.';
    for (const side of [candidate.principle, candidate.exception]) {
      side.meaning = null;
      side.sourceEvidence = null;
      side.propositionIds = [];
      side.centralStoryCoverage = 'NOT_APPLICABLE';
      side.centralStoryMapping = null;
      side.centralAxisIds = [];
      side.coreRelationIds = [];
      side.mappingExplanation = null;
    }
    expect(adjudicatePrincipleExceptionCoverage(candidate, input()).status).toBe('NOT_APPLICABLE');
  });

  it('treats contrastExplanation as non-authoritative commentary for NOT_APPLICABLE', () => {
    const candidate = evidence();
    candidate.applicability = 'NOT_APPLICABLE';
    candidate.contrastExplanation = '대조 표현은 있으나 원칙-예외 관계는 아니다.';
    for (const side of [candidate.principle, candidate.exception]) {
      side.meaning = null;
      side.sourceEvidence = null;
      side.propositionIds = [];
      side.centralStoryCoverage = 'NOT_APPLICABLE';
      side.centralStoryMapping = null;
      side.centralAxisIds = [];
      side.coreRelationIds = [];
      side.mappingExplanation = null;
    }
    expect(adjudicatePrincipleExceptionCoverage(candidate, input()).status).toBe('NOT_APPLICABLE');
  });

  it('rejects invented candidate IDs before adjudication', () => {
    const candidate = evidence();
    candidate.principle.centralAxisIds = ['AX2'];
    expect(() => validatePrincipleExceptionEvidence(candidate, input())).toThrow(/존재하지 않는/);
  });

  it('keeps a target-grounded diagnostic omission as FAIL', () => {
    const candidate = evidence();
    candidate.principle.centralStoryCoverage = 'ABSENT';
    candidate.principle.centralStoryMapping = null;
    candidate.principle.centralAxisIds = [];
    candidate.principle.coreRelationIds = [];
    const result = adjudicatePrincipleExceptionCoverageWithScopeGate(candidate, input());
    expect(result.status).toBe('FAIL');
    expect(result.requiresSourceFidelityReview).toBe(false);
  });

  it('defers an ungrounded side instead of calling it a diagnostic false negative', () => {
    const candidate = evidence();
    candidate.principle.propositionIds = [];
    candidate.principle.centralStoryCoverage = 'ABSENT';
    candidate.principle.centralStoryMapping = null;
    candidate.principle.centralAxisIds = [];
    candidate.principle.coreRelationIds = [];
    const result = adjudicatePrincipleExceptionCoverageWithScopeGate(candidate, input());
    expect(result.status).toBe('DEFER_TO_SOURCE_FIDELITY');
    expect(result.requiresSourceFidelityReview).toBe(true);
    expect(result.productionEligibleForThisCheck).toBe(false);
  });
});
