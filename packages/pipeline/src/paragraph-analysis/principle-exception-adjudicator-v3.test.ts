import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  adjudicatePrincipleExceptionCoverageV3,
  type PrincipleExceptionEvidenceV3Output,
} from './principle-exception-adjudicator-v3.js';

const paragraphId = 'source123-p1';

function input(): ParagraphGoldAuditInput {
  const text = 'A가 원칙이지만 C에서는 B이다.';
  return {
    sourceId: 'source123', passageId: 'source123',
    passageParagraphs: [{ paragraphId, position: 1, text }],
    targetParagraph: {
      paragraphId, position: 1, text, textReferencesVisual: false, passageMediaCount: 0,
    },
    diagnosticGold: {
      paragraphId, paragraphText: text, centralObject: 'A와 B',
      centralStory: 'A가 원칙이지만 C에서는 B이다.',
      centralAxes: [{ id: 'AX1', description: 'A 원칙과 C의 예외 B', relationIds: ['MR1'] }],
      coreRelations: [{ id: 'MR1', description: 'A가 원칙이고 C에서는 B이다.' }],
      keyMappings: [], supportingConcepts: [],
    },
    propositionBundle: {
      schemaVersion: 'paragraph-proposition-bundle-v1', sourceId: 'source123', passageId: 'source123',
      paragraphId, position: 1, passageHash: `sha256:${'a'.repeat(64)}`,
      paragraphHash: `sha256:${'b'.repeat(64)}`, analysisRunId: 'resp_test',
      analysisSchemaVersion: 'paragraph-analysis-openai-v3',
      analysisPromptVersion: 'paragraph-analysis-prompt-v3.1', derivation: 'INITIAL_ANALYSIS',
      parentBundleHash: null, repairRunId: null,
      propositions: [
        { id: 'P1', description: 'A가 원칙이다.', evidence: 'A가 원칙' },
        { id: 'P2', description: 'C에서는 B이다.', evidence: 'C에서는 B' },
      ],
      propositionEdges: [], generationStatus: 'STATIC_VALIDATED', auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

function layer(targetIds: string[], matchedMeaning: string) {
  return {
    level: 'EXPLICIT_EQUIVALENT' as const,
    targetIds,
    matchedMeaning,
    explanation: '같은 의미를 직접 진술한다.',
  };
}

function side(role: 'principle' | 'exception'): PrincipleExceptionEvidenceV3Output['principle'] {
  const propositionId = role === 'principle' ? 'P1' : 'P2';
  const meaning = role === 'principle' ? 'A가 원칙이다.' : 'C에서는 B이다.';
  return {
    meaning, sourceScope: 'TARGET_PARAGRAPH', sourceEvidence: meaning,
    propositionCoverage: layer([propositionId], meaning),
    centralStoryCoverage: {
      level: 'EXPLICIT_EQUIVALENT', matchedMeaning: meaning,
      explanation: 'centralStory가 직접 진술한다.',
    },
    centralAxisCoverage: layer(['AX1'], meaning),
    coreRelationCoverage: layer(['MR1'], meaning),
  };
}

function evidence(): PrincipleExceptionEvidenceV3Output {
  return {
    schemaVersion: 'principle-exception-adjudicator-v3', sourceId: 'source123', paragraphId,
    applicability: 'CENTRAL', centralityRationale: '원칙과 예외가 중심이다.',
    contrastExplanation: 'A가 원칙이고 C에서는 B이다.',
    principle: side('principle'), exception: side('exception'),
  };
}

describe('principle-exception adjudicator v3 explicit coverage', () => {
  it('passes only explicit coverage at every diagnostic layer', () => {
    expect(adjudicatePrincipleExceptionCoverageV3(evidence(), input()).status).toBe('PASS');
  });

  it('fails when a diagnostic layer only implies the principle', () => {
    const candidate = evidence();
    candidate.principle.centralStoryCoverage.level = 'IMPLICIT_ONLY';
    candidate.principle.centralStoryCoverage.explanation = '대비를 통해서만 추론된다.';
    const result = adjudicatePrincipleExceptionCoverageV3(candidate, input());
    expect(result.status).toBe('FAIL');
    expect(result.principle.failedLayers).toContain('CENTRAL_STORY');
  });

  it('defers a non-explicit target proposition to source fidelity', () => {
    const candidate = evidence();
    candidate.principle.propositionCoverage.level = 'ABSENT';
    candidate.principle.propositionCoverage.targetIds = [];
    candidate.principle.propositionCoverage.matchedMeaning = null;
    expect(adjudicatePrincipleExceptionCoverageV3(candidate, input()).status)
      .toBe('DEFER_TO_SOURCE_FIDELITY');
  });

  it('places a passage-context side outside paragraph coverage', () => {
    const candidate = evidence();
    candidate.principle.sourceScope = 'PASSAGE_CONTEXT_ONLY';
    expect(adjudicatePrincipleExceptionCoverageV3(candidate, input()).status)
      .toBe('OUT_OF_PARAGRAPH_SCOPE');
  });
});

