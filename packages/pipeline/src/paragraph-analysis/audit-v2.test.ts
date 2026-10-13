import { describe, expect, it } from 'vitest';

import type { ParagraphGoldAuditInput } from './production-runtime.js';
import {
  applyParagraphGoldPatchRepair,
  validateParagraphGoldAuditV2,
  type ParagraphGoldAuditV2Output,
  type ParagraphGoldPatchRepairOutput,
} from './audit-v2.js';

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
      centralStory: '원칙적으로 A이지만 조건 C에서는 B이다.',
      centralAxes: [{ id: 'AX1', description: '원칙 A와 조건 C의 예외 B', relationIds: ['MR1'] }],
      coreRelations: [{ id: 'MR1', description: '원칙적으로 A이고 조건 C에서는 B이다.' }],
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
        { id: 'P1', description: '원칙적으로 A이다.', evidence: '원칙적으로 A이지만' },
        { id: 'P2', description: '조건 C에서는 B이다.', evidence: '조건 C에서는 B이다' },
      ],
      propositionEdges: [{
        id: 'E1',
        fromPropositionIds: ['P1'],
        toPropositionIds: ['P2'],
        type: '대조',
        direction: '원칙 A와 조건 C의 B가 대조된다.',
        description: '원칙과 조건부 예외를 대조한다.',
      }],
      generationStatus: 'STATIC_VALIDATED',
      auditStatus: 'NOT_AUDITED',
      productionEligible: false,
    },
  };
}

const layerIds = [
  'PROPOSITION_SOURCE_FIDELITY',
  'EDGE_SOURCE_LICENSE',
  'CENTRAL_STORY_SELECTION',
  'DIAGNOSTIC_INTERNAL_COVERAGE',
  'CROSS_LAYER_CONSISTENCY',
] as const;
const regressionIds = [
  'PURPOSE_MEANS_OVERREACH',
  'UNSUPPORTED_TEMPORAL_QUALIFIER',
  'PRINCIPLE_EXCEPTION_COVERAGE',
  'NECESSARY_CONDITION_MODALITY',
  'CONDITIONAL_BRANCH_COVERAGE',
] as const;

function passingAudit(): ParagraphGoldAuditV2Output {
  const check = <T extends string>(checkId: T) => ({
    checkId,
    status: 'PASS' as const,
    questionAnswered: '실제 후보와 원문을 대조해 이상이 없다.',
    sourceEvidence: '원칙적으로 A이지만 조건 C에서는 B이다.',
    checkedTargetIds: ['P1', 'P2', 'E1', 'centralStory', 'AX1', 'MR1'],
    issueIds: [],
  });
  return {
    schemaVersion: 'paragraph-gold-audit-v2',
    sourceId: 'source123',
    paragraphId,
    decision: 'PASS',
    summary: '모든 층위가 계약에 맞는다.',
    reviewedPropositionIds: ['P1', 'P2'],
    reviewedPropositionEdgeIds: ['E1'],
    reviewedCentralAxisIds: ['AX1'],
    reviewedCoreRelationIds: ['MR1'],
    layerChecks: layerIds.map(check),
    regressionChecks: regressionIds.map(check),
    centralStoryMeaningChecks: [{
      meaningId: 'CSM1',
      centralStoryMeaning: '원칙 A와 조건 C의 예외 B',
      sourceSupported: true,
      centralAxisIds: ['AX1'],
      coreRelationIds: ['MR1'],
      status: 'PASS',
      issueIds: [],
    }],
    omittedPropositionMeaningDetected: false,
    unsupportedMeaningDetected: false,
    visualDependencyDetected: false,
    issues: [],
  };
}

function repairAudit(): ParagraphGoldAuditV2Output {
  const audit = passingAudit();
  const issue = {
    issueId: 'ISSUE1',
    severity: 'REPAIR_REQUIRED' as const,
    category: 'MODALITY' as const,
    targetType: 'PROPOSITION' as const,
    targetId: 'P2',
    description: 'P2의 조건 범위가 약화됐다.',
    sourceEvidence: '조건 C에서는 B이다.',
    suggestedCorrection: '조건 C에서는 B라고 고친다.',
  };
  return {
    ...audit,
    decision: 'REPAIR_REQUIRED',
    summary: issue.description,
    layerChecks: audit.layerChecks.map((check) => check.checkId === 'PROPOSITION_SOURCE_FIDELITY'
      ? { ...check, status: 'FAIL' as const, issueIds: ['ISSUE1'] }
      : check),
    regressionChecks: audit.regressionChecks.map((check) => check.checkId === 'NECESSARY_CONDITION_MODALITY'
      ? { ...check, status: 'FAIL' as const, issueIds: ['ISSUE1'] }
      : check),
    issues: [issue],
  };
}

function emptyPatchFields() {
  return {
    textValue: null,
    propositionValue: null,
    propositionEdgeValue: null,
    centralAxisValue: null,
    coreRelationValue: null,
    keyMappingsValue: [],
    supportingConceptsValue: [],
  };
}

describe('paragraph gold audit v2 and field patch repair', () => {
  it('enforces exact layer/regression coverage and centralStory-to-diagnostic lineage', () => {
    const candidate = input();
    expect(validateParagraphGoldAuditV2(passingAudit(), candidate).decision).toBe('PASS');
    expect(() => validateParagraphGoldAuditV2({
      ...passingAudit(),
      regressionChecks: passingAudit().regressionChecks.slice(0, 4),
    }, candidate)).toThrow(/coverage/);
    expect(() => validateParagraphGoldAuditV2({
      ...passingAudit(),
      centralStoryMeaningChecks: [{
        ...passingAudit().centralStoryMeaningChecks[0]!,
        centralAxisIds: [],
      }],
    }, candidate)).toThrow(/무손실 연결/);
  });

  it('applies only the declared field patch and preserves unrelated fields', () => {
    const candidate = input();
    const audit = repairAudit();
    const repair: ParagraphGoldPatchRepairOutput = {
      schemaVersion: 'paragraph-gold-patch-repair-v1',
      sourceId: candidate.sourceId,
      paragraphId,
      summary: 'P2의 조건 범위만 복원했다.',
      patches: [{
        patchId: 'PATCH1',
        resolvedIssueIds: ['ISSUE1'],
        operation: 'REPLACE_PROPOSITION',
        targetId: 'P2',
        reason: '조건 범위 복원',
        ...emptyPatchFields(),
        propositionValue: {
          id: 'P2',
          description: '조건 C에서만 B이다.',
          evidence: '조건 C에서는 B이다',
        },
      }],
    };
    const result = applyParagraphGoldPatchRepair({
      input: candidate,
      audit,
      repair,
      repairRunId: 'resp_patch',
    });
    expect(result.propositionBundle.propositions[1]?.description).toBe('조건 C에서만 B이다.');
    expect(result.propositionBundle.propositionEdges).toEqual(candidate.propositionBundle.propositionEdges);
    expect(result.diagnosticGold).toEqual(candidate.diagnosticGold);
  });

  it('accepts the audit input portion after a repair input is separated', () => {
    const candidate = input();
    const extended = { ...candidate, audit: repairAudit() };
    const { audit: _audit, ...auditInput } = extended;
    expect(auditInput).not.toHaveProperty('audit');
    expect(auditInput.targetParagraph.paragraphId).toBe(paragraphId);
  });

  it('rejects a patch that does not cover every repair issue', () => {
    const candidate = input();
    const repair: ParagraphGoldPatchRepairOutput = {
      schemaVersion: 'paragraph-gold-patch-repair-v1',
      sourceId: candidate.sourceId,
      paragraphId,
      summary: '잘못된 issue 참조',
      patches: [{
        patchId: 'PATCH1',
        resolvedIssueIds: ['ISSUE2'],
        operation: 'REMOVE_PROPOSITION_EDGE',
        targetId: 'E1',
        reason: '테스트',
        ...emptyPatchFields(),
      }],
    };
    expect(() => applyParagraphGoldPatchRepair({
      input: candidate,
      audit: repairAudit(),
      repair,
      repairRunId: 'resp_patch',
    })).toThrow(/issue coverage/);
  });
});
