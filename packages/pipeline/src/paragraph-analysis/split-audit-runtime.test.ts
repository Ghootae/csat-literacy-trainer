import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  mergeSplitAudits,
  validateSplitGlobalAudit,
  validateSplitLocalAudit,
  type SplitGlobalAuditOutput,
  type SplitLocalAuditOutput,
} from './split-audit-runtime.js';
import { validateParagraphGoldAudit } from './production.js';

const paragraphId = 'source123-p1';

function input(): ParagraphGoldAuditInput {
  const text = '원인 A가 발생하면 결과 B가 나타난다.';
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
      centralObject: 'A와 B의 조건 관계',
      centralStory: 'A가 발생하면 B가 나타난다.',
      centralAxes: [{ id: 'AX1', description: 'A에서 B로', relationIds: ['MR1'] }],
      coreRelations: [{ id: 'MR1', description: 'A가 발생하면 B가 나타난다.' }],
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
        { id: 'P1', description: 'A가 발생한다.', evidence: '원인 A가 발생하면' },
        { id: 'P2', description: 'B가 나타난다.', evidence: '결과 B가 나타난다' },
      ],
      propositionEdges: [{
        id: 'E1',
        fromPropositionIds: ['P1'],
        toPropositionIds: ['P2'],
        type: '조건-결과',
        direction: 'P1에서 P2로',
        description: 'A는 B의 조건이다.',
      }],
      generationStatus: 'STATIC_VALIDATED',
      auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

function local(): SplitLocalAuditOutput {
  return {
    schemaVersion: 'paragraph-gold-local-audit-v1',
    sourceId: 'source123',
    paragraphId,
    decision: 'PASS',
    summary: '개별 명제와 간선이 원문과 일치한다.',
    reviewedPropositionIds: ['P1', 'P2'],
    reviewedPropositionEdgeIds: ['E1'],
    ruleChecks: [
      { ruleId: 'EDGE_EVIDENCE_BEFORE_DIRECTION', status: 'PASS', checkedTargetIds: ['E1'], issueIds: [], summary: '통과' },
      { ruleId: 'QUALIFIER_SCOPE_FIDELITY', status: 'PASS', checkedTargetIds: ['P1', 'P2'], issueIds: [], summary: '통과' },
      { ruleId: 'UNSUPPORTED_SOURCE_MEANING', status: 'PASS', checkedTargetIds: ['P1', 'P2', 'E1'], issueIds: [], summary: '통과' },
    ],
    omittedMeaningDetected: false,
    unsupportedMeaningDetected: false,
    visualDependencyDetected: false,
    issues: [],
  };
}

function global(): SplitGlobalAuditOutput {
  return {
    schemaVersion: 'paragraph-gold-global-audit-v1',
    sourceId: 'source123',
    paragraphId,
    decision: 'PASS',
    summary: '중심 의미가 모든 층위에 보존됐다.',
    centralStoryReviewed: true,
    reviewedPropositionIds: ['P1', 'P2'],
    reviewedCentralAxisIds: ['AX1'],
    reviewedCoreRelationIds: ['MR1'],
    sourceMeaningChecks: [{
      meaningId: 'SM1',
      description: 'A가 발생하면 B가 나타난다.',
      sourceEvidence: '원인 A가 발생하면 결과 B가 나타난다.',
      propositionIds: ['P1', 'P2'],
      centralStoryCovered: true,
      centralAxisIds: ['AX1'],
      coreRelationIds: ['MR1'],
      status: 'PASS',
      issueIds: [],
    }],
    ruleChecks: [
      { ruleId: 'QUALIFIER_SCOPE_FIDELITY', status: 'PASS', checkedTargetIds: ['centralStory', 'AX1', 'MR1'], issueIds: [], summary: '통과' },
      { ruleId: 'DIAGNOSTIC_COVERAGE_INVARIANT', status: 'PASS', checkedTargetIds: ['centralStory', 'AX1', 'MR1'], issueIds: [], summary: '통과' },
      { ruleId: 'UNSUPPORTED_SOURCE_MEANING', status: 'PASS', checkedTargetIds: ['centralStory', 'AX1', 'MR1'], issueIds: [], summary: '통과' },
    ],
    omittedMeaningDetected: false,
    unsupportedMeaningDetected: false,
    visualDependencyDetected: false,
    issues: [],
  };
}

describe('split paragraph gold audit contract', () => {
  it('requires full local and global coverage and merges into the existing audit contract', () => {
    const auditInput = input();
    const localAudit = validateSplitLocalAudit(local(), auditInput);
    const globalAudit = validateSplitGlobalAudit(global(), auditInput);
    const merged = mergeSplitAudits({ input: auditInput, local: localAudit, global: globalAudit });

    expect(validateParagraphGoldAudit({
      audit: merged,
      sourceId: auditInput.sourceId,
      diagnosticGold: auditInput.diagnosticGold,
      propositionBundle: auditInput.propositionBundle,
    }).decision).toBe('PASS');
  });

  it('rejects omitted targets and omitted mandatory rules', () => {
    const auditInput = input();
    expect(() => validateSplitLocalAudit({
      ...local(),
      reviewedPropositionIds: ['P1'],
    }, auditInput)).toThrow(/coverage/);
    expect(() => validateSplitGlobalAudit({
      ...global(),
      ruleChecks: global().ruleChecks.slice(0, 2),
    }, auditInput)).toThrow(/coverage/);
  });
});
