import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  adjudicatePrincipleExceptionCoverageV4,
  type PrincipleExceptionEvidenceV4Output,
} from './principle-exception-adjudicator-v4.js';

const paragraphId = 'source123-p1';

function input(): ParagraphGoldAuditInput {
  const text = 'A가 원칙이지만 C에서는 B이고 이를 변경할 수 없다.';
  return {
    sourceId: 'source123', passageId: 'source123',
    passageParagraphs: [{ paragraphId, position: 1, text }],
    targetParagraph: { paragraphId, position: 1, text, textReferencesVisual: false, passageMediaCount: 0 },
    diagnosticGold: {
      paragraphId, paragraphText: text, centralObject: 'A와 B',
      centralStory: text,
      centralAxes: [{ id: 'AX1', description: text, relationIds: ['MR1'] }],
      coreRelations: [{ id: 'MR1', description: text }], keyMappings: [], supportingConcepts: [],
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
        { id: 'P3', description: 'B는 변경할 수 없다.', evidence: '변경할 수 없다' },
      ],
      propositionEdges: [], generationStatus: 'STATIC_VALIDATED', auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

function coverage(targetIds: string[]) {
  return {
    level: 'EXPLICIT_EQUIVALENT' as const, targetIds,
    matchedMeaning: '직접 진술', explanation: '직접 진술한다.',
  };
}

function side(ids: string[]): PrincipleExceptionEvidenceV4Output['principle'] {
  return {
    meaning: '직접 의미', sourceScope: 'TARGET_PARAGRAPH', sourceEvidence: '직접 근거',
    propositionCoverage: coverage(ids),
    centralStoryCoverage: {
      level: 'EXPLICIT_EQUIVALENT', matchedMeaning: '직접 진술', explanation: '직접 진술한다.',
    },
    centralAxisCoverage: coverage(['AX1']), coreRelationCoverage: coverage(['MR1']),
  };
}

function evidence(): PrincipleExceptionEvidenceV4Output {
  return {
    schemaVersion: 'principle-exception-adjudicator-v4', sourceId: 'source123', paragraphId,
    applicability: 'CENTRAL', contrastType: 'RULE_EXCEPTION',
    centralityRationale: '같은 규칙의 원칙과 예외다.', contrastExplanation: 'A 원칙과 C의 B다.',
    propositionAggregation: { principle: 'SINGLE_DIRECT', exception: 'MULTIPLE_DIRECT_UNION' },
    principle: side(['P1']), exception: side(['P2', 'P3']),
  };
}

describe('principle-exception adjudicator v4 topology and proposition union', () => {
  it('accepts a direct union of multiple atomic propositions', () => {
    expect(adjudicatePrincipleExceptionCoverageV4(evidence(), input()).status).toBe('PASS');
  });

  it('routes a model limitation-remedy structure away from rule-exception coverage', () => {
    const candidate = evidence();
    candidate.contrastType = 'MODEL_LIMITATION_REMEDY';
    expect(adjudicatePrincipleExceptionCoverageV4(candidate, input()).status).toBe('NOT_APPLICABLE');
  });

  it('warns when a multiple union does not name multiple propositions', () => {
    const candidate = evidence();
    candidate.exception.propositionCoverage.targetIds = ['P2'];
    const result = adjudicatePrincipleExceptionCoverageV4(candidate, input());
    expect(result.contractWarnings).toHaveLength(1);
    expect(result.productionEligibleForThisCheck).toBe(false);
  });
});

