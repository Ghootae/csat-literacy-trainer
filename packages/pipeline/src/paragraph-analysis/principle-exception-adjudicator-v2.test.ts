import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  adjudicatePrincipleExceptionCoverageV2,
  type PrincipleExceptionEvidenceV2Output,
} from './principle-exception-adjudicator-v2.js';

const paragraphId = 'source123-p1';

function input(): ParagraphGoldAuditInput {
  const text = 'A가 원칙이지만 C에서는 B이다.';
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
      centralAxes: [{ id: 'AX1', description: 'A 원칙과 C의 예외 B', relationIds: ['MR1'] }],
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
        { id: 'P1', description: 'A가 원칙이다.', evidence: 'A가 원칙' },
        { id: 'P2', description: 'C에서는 B이다.', evidence: 'C에서는 B' },
      ],
      propositionEdges: [],
      generationStatus: 'STATIC_VALIDATED',
      auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

function side(overrides: Partial<PrincipleExceptionEvidenceV2Output['principle']> = {}) {
  return {
    meaning: 'A가 원칙이다.',
    sourceScope: 'TARGET_PARAGRAPH' as const,
    sourceEvidence: 'A가 원칙',
    propositionIds: ['P1'],
    centralStoryCoverage: 'PRESENT' as const,
    centralStoryMapping: 'A가 원칙',
    centralAxisIds: ['AX1'],
    coreRelationIds: ['MR1'],
    mappingExplanation: '후보가 의미를 보존한다.',
    ...overrides,
  };
}

function evidence(): PrincipleExceptionEvidenceV2Output {
  return {
    schemaVersion: 'principle-exception-adjudicator-v2',
    sourceId: 'source123',
    paragraphId,
    applicability: 'CENTRAL',
    centralityRationale: '원칙과 예외가 중심이다.',
    contrastExplanation: 'A가 원칙이고 C에서는 B이다.',
    principle: side(),
    exception: side({
      meaning: 'C에서는 B이다.',
      sourceEvidence: 'C에서는 B',
      propositionIds: ['P2'],
      centralStoryMapping: 'C에서는 B',
    }),
  };
}

describe('principle-exception adjudicator v2 source scope', () => {
  it('passes complete target-paragraph coverage', () => {
    expect(adjudicatePrincipleExceptionCoverageV2(evidence(), input()).status).toBe('PASS');
  });

  it('keeps a target-paragraph diagnostic omission as FAIL', () => {
    const candidate = evidence();
    candidate.principle.centralStoryCoverage = 'ABSENT';
    candidate.principle.centralStoryMapping = null;
    candidate.principle.centralAxisIds = [];
    candidate.principle.coreRelationIds = [];
    expect(adjudicatePrincipleExceptionCoverageV2(candidate, input()).status).toBe('FAIL');
  });

  it('classifies a passage-context principle as outside paragraph coverage', () => {
    const candidate = evidence();
    candidate.principle.sourceScope = 'PASSAGE_CONTEXT_ONLY';
    candidate.principle.propositionIds = [];
    candidate.principle.centralStoryCoverage = 'NOT_APPLICABLE';
    candidate.principle.centralStoryMapping = null;
    candidate.principle.centralAxisIds = [];
    candidate.principle.coreRelationIds = [];
    const result = adjudicatePrincipleExceptionCoverageV2(candidate, input());
    expect(result.status).toBe('OUT_OF_PARAGRAPH_SCOPE');
    expect(result.requiresSourceFidelityReview).toBe(false);
    expect(result.productionEligibleForThisCheck).toBe(true);
  });

  it('defers a target meaning with no proposition to source fidelity', () => {
    const candidate = evidence();
    candidate.principle.propositionIds = [];
    const result = adjudicatePrincipleExceptionCoverageV2(candidate, input());
    expect(result.status).toBe('DEFER_TO_SOURCE_FIDELITY');
    expect(result.requiresSourceFidelityReview).toBe(true);
  });

  it('blocks an unresolved source scope', () => {
    const candidate = evidence();
    candidate.principle.sourceScope = 'UNRESOLVED';
    expect(adjudicatePrincipleExceptionCoverageV2(candidate, input()).status)
      .toBe('UNRESOLVED_SOURCE_SCOPE');
  });
});

