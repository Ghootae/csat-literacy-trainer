import { describe, expect, it } from 'vitest';

import type { ParagraphDiagnosticGold } from '../dialogue-experiment/schema.js';
import type { ParagraphAnalysisResultV3 } from './schema.js';
import {
  PARAGRAPH_GOLD_AUDIT_VERSION,
  createParagraphPropositionBundle,
  deriveParagraphGoldProductionStatus,
  paragraphSourceUnit,
  splitPassageParagraphs,
  textHash,
  validateParagraphGoldAudit,
  type ParagraphGoldAuditOutput,
} from './production.js';

const paragraphId = 'source123-p1';
const paragraphText = '원인 A가 발생하면 결과 B가 나타난다.';

function analysis(): ParagraphAnalysisResultV3 {
  return {
    schemaVersion: 'paragraph-analysis-openai-v3',
    paragraphId,
    paragraphText,
    passageContext: {
      summary: 'A와 B의 관계를 설명한다.',
      targetRole: '원인과 결과 제시',
      contextLimitations: [],
    },
    propositions: [
      { id: 'P1', description: '원인 A가 발생한다.', evidence: '원인 A가 발생하면' },
      { id: 'P2', description: '결과 B가 나타난다.', evidence: '결과 B가 나타난다' },
    ],
    propositionEdges: [{
      id: 'E1',
      fromPropositionIds: ['P1'],
      toPropositionIds: ['P2'],
      type: '조건-결과',
      direction: 'P1에서 P2로',
      description: 'A의 발생은 B가 나타나는 조건이다.',
    }],
    centralObject: 'A와 B의 조건 관계',
    centralStory: 'A가 발생하면 B가 나타난다.',
    regions: [{
      id: 'RGN1',
      name: '조건 관계',
      summary: 'A가 B의 조건이다.',
      propositionIds: ['P1', 'P2'],
      contribution: '중심 조건 관계를 구성한다.',
    }],
    majorRelations: [{
      id: 'MR1',
      relatedRegionIds: ['RGN1'],
      relatedObjects: ['A', 'B'],
      description: 'A가 발생하면 B가 나타난다.',
      classification: 'core',
      essentialReason: '문단의 중심 조건 관계다.',
    }],
    conceptBoundaries: [],
    minimumLogic: {
      requiredMeanings: ['A가 B의 조건이라는 방향'],
      omissibleDetails: [],
      unknownIfUnmentionedRelationIds: ['MR1'],
      explicitMisunderstandingConditions: [{
        relationId: 'MR1',
        description: 'B가 A의 조건이라고 뒤집는다.',
      }],
    },
    ambiguities: [],
    diagnosticGold: {
      paragraphId,
      paragraphText,
      centralObject: 'A와 B의 조건 관계',
      centralStory: 'A가 발생하면 B가 나타난다.',
      coreRelations: [{ id: 'MR1', description: 'A가 발생하면 B가 나타난다.' }],
      keyMappings: [{ left: 'A', right: 'B의 조건' }],
      supportingConcepts: [],
    },
  };
}

const diagnosticGold: ParagraphDiagnosticGold = {
  paragraphId,
  paragraphText,
  centralObject: 'A와 B의 조건 관계',
  centralStory: 'A가 발생하면 B가 나타난다.',
  centralAxes: [{
    id: 'AX1',
    description: 'A에서 B로 이어지는 조건 방향',
    relationIds: ['MR1'],
  }],
  coreRelations: [{ id: 'MR1', description: 'A가 발생하면 B가 나타난다.' }],
  keyMappings: [{ left: 'A', right: 'B의 조건' }],
  supportingConcepts: [],
};

function passingAudit(): ParagraphGoldAuditOutput {
  return {
    schemaVersion: PARAGRAPH_GOLD_AUDIT_VERSION,
    sourceId: 'source123',
    paragraphId,
    decision: 'PASS',
    summary: '원문과 의미가 일치한다.',
    reviewedPropositionIds: ['P1', 'P2'],
    reviewedPropositionEdgeIds: ['E1'],
    reviewedCentralAxisIds: ['AX1'],
    reviewedCoreRelationIds: ['MR1'],
    omittedMeaningDetected: false,
    unsupportedMeaningDetected: false,
    visualDependencyDetected: false,
    issues: [],
  };
}

describe('prospective paragraph gold production contract', () => {
  it('attaches footnotes to the previous prose paragraph', () => {
    const paragraphs = splitPassageParagraphs([
      '첫 번째 본문이다.',
      '두 번째 본문이다.',
      '* 용어: 각주 설명.',
      '* 다른 용어: 두 번째 각주.',
    ].join('\n'));

    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]).toMatchObject({
      position: 2,
      text: '두 번째 본문이다.\n* 용어: 각주 설명.\n* 다른 용어: 두 번째 각주.',
      sourceLineStart: 2,
      sourceLineEnd: 4,
      attachedFootnoteCount: 2,
    });
    expect(paragraphSourceUnit({ sourceId: 'source123', paragraph: paragraphs[1]! }))
      .toMatchObject({ paragraphId: 'source123-p2', attachedFootnoteCount: 2 });
  });

  it('distinguishes a table reference from ordinary words beginning with 표', () => {
    const [surface] = splitPassageParagraphs('물체 표면에 상이 맺힌다.');
    const [table] = splitPassageParagraphs('다음 표를 참고한다.');
    expect(paragraphSourceUnit({ sourceId: 'source123', paragraph: surface! })
      .textReferencesVisual).toBe(false);
    expect(paragraphSourceUnit({ sourceId: 'source123', paragraph: table! })
      .textReferencesVisual).toBe(true);
  });

  it('promotes the existing v3.1 propositions into a separate immutable bundle', () => {
    const bundle = createParagraphPropositionBundle({
      sourceId: 'source123',
      passageId: 'source123-passage',
      position: 1,
      passageHash: textHash(paragraphText),
      analysisRunId: 'resp_test',
      analysis: analysis(),
    });

    expect(bundle.propositions.map((proposition) => proposition.id)).toEqual(['P1', 'P2']);
    expect(bundle.propositionEdges.map((edge) => edge.id)).toEqual(['E1']);
    expect(bundle).toMatchObject({
      analysisPromptVersion: 'paragraph-analysis-prompt-v3.1',
      generationStatus: 'STATIC_VALIDATED',
      auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    });
  });

  it('requires complete audit coverage before production eligibility', () => {
    const bundle = createParagraphPropositionBundle({
      sourceId: 'source123',
      passageId: 'source123-passage',
      position: 1,
      passageHash: textHash(paragraphText),
      analysisRunId: 'resp_test',
      analysis: analysis(),
    });
    const incomplete = { ...passingAudit(), reviewedPropositionIds: ['P1'] };

    expect(() => validateParagraphGoldAudit({
      audit: incomplete,
      sourceId: 'source123',
      diagnosticGold,
      propositionBundle: bundle,
    })).toThrow(/coverage/);

    expect(deriveParagraphGoldProductionStatus({
      sourceId: 'source123',
      diagnosticGold,
      propositionBundle: bundle,
      audit: passingAudit(),
    })).toMatchObject({
      status: 'AGENT_AUDITED',
      productionEligible: true,
    });
  });

  it('does not allow PASS when source meaning or visual dependence remains unresolved', () => {
    const bundle = createParagraphPropositionBundle({
      sourceId: 'source123',
      passageId: 'source123-passage',
      position: 1,
      passageHash: textHash(paragraphText),
      analysisRunId: 'resp_test',
      analysis: analysis(),
    });

    expect(() => validateParagraphGoldAudit({
      audit: { ...passingAudit(), omittedMeaningDetected: true },
      sourceId: 'source123',
      diagnosticGold,
      propositionBundle: bundle,
    })).toThrow(/PASS/);
    expect(() => validateParagraphGoldAudit({
      audit: { ...passingAudit(), visualDependencyDetected: true },
      sourceId: 'source123',
      diagnosticGold,
      propositionBundle: bundle,
    })).toThrow(/PASS/);
  });
});
