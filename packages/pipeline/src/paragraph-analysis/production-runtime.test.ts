import { describe, expect, it } from 'vitest';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  ParagraphGoldAuditInputSchema,
  ParagraphGoldRepairInputSchema,
  PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION,
  loadParagraphGoldAuditPrompt,
  loadParagraphGoldRepairPrompt,
} from './production-runtime.js';
import { ParagraphGoldRepairOutputSchema } from './production.js';

const diagnosticGold = {
  paragraphId: 'source1-p1',
  paragraphText: '가이면 나이다.',
  centralObject: '가와 나',
  centralStory: '가는 나의 조건이다.',
  centralAxes: [{ id: 'AX1', description: '조건 관계', relationIds: ['MR1'] }],
  coreRelations: [{ id: 'MR1', description: '가이면 나이다.' }],
};

const propositionBundle = {
  schemaVersion: 'paragraph-proposition-bundle-v1',
  sourceId: 'source1',
  passageId: 'source1',
  paragraphId: 'source1-p1',
  position: 1,
  passageHash: `sha256:${'1'.repeat(64)}`,
  paragraphHash: `sha256:${'2'.repeat(64)}`,
  analysisRunId: 'resp_1',
  analysisSchemaVersion: 'paragraph-analysis-openai-v3',
  analysisPromptVersion: 'paragraph-analysis-prompt-v3.1',
  derivation: 'INITIAL_ANALYSIS',
  parentBundleHash: null,
  repairRunId: null,
  propositions: [{ id: 'P1', description: '가이면 나이다.', evidence: '가이면 나이다.' }],
  propositionEdges: [],
  generationStatus: 'STATIC_VALIDATED',
  auditStatus: 'NOT_AUDITED',
  productionEligible: false,
};

const auditInput = {
  sourceId: 'source1',
  passageId: 'source1',
  passageParagraphs: [{ paragraphId: 'source1-p1', position: 1, text: '가이면 나이다.' }],
  targetParagraph: {
    paragraphId: 'source1-p1',
    position: 1,
    text: '가이면 나이다.',
    textReferencesVisual: false,
    passageMediaCount: 0,
  },
  diagnosticGold,
  propositionBundle,
};

describe('paragraph gold production runtime contracts', () => {
  it('loads independent audit and repair prompts', () => {
    expect(loadParagraphGoldAuditPrompt()).toContain('원문');
    expect(loadParagraphGoldAuditPrompt()).toContain('단순 병렬·나열·순차를 인과로 확대하지 않고');
    expect(loadParagraphGoldAuditPrompt()).toContain('장소 범위');
    expect(loadParagraphGoldRepairPrompt()).toContain('REPAIR_REQUIRED');
    expect(loadParagraphGoldRepairPrompt()).toContain('조건절을 독립적인 가능성·존재 명제로 바꾸지 않는다');
    expect(loadParagraphGoldRepairPrompt()).toContain('수리 후 인접 항목 점검');
    expect(loadParagraphGoldRepairPrompt()).toContain('중심 이야기와 진단 구조의 커버리지를 맞춘다');
    expect(PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION).toBe('paragraph-gold-repair-prompt-v2');
  });

  it('converts the repair schema to a Responses structured-output format', () => {
    expect(() => zodTextFormat(ParagraphGoldRepairOutputSchema, 'repair')).not.toThrow();
  });

  it('accepts a source-consistent audit input', () => {
    expect(ParagraphGoldAuditInputSchema.parse(auditInput).sourceId).toBe('source1');
  });

  it('rejects an audit candidate whose paragraph text changed', () => {
    expect(() => ParagraphGoldAuditInputSchema.parse({
      ...auditInput,
      targetParagraph: { ...auditInput.targetParagraph, text: '변경된 문장' },
    })).toThrow();
  });

  it('allows automatic repair only after REPAIR_REQUIRED', () => {
    const baseAudit = {
      schemaVersion: 'paragraph-gold-audit-v1',
      sourceId: 'source1',
      paragraphId: 'source1-p1',
      summary: '조건 관계를 수정해야 한다.',
      reviewedPropositionIds: ['P1'],
      reviewedPropositionEdgeIds: [],
      reviewedCentralAxisIds: ['AX1'],
      reviewedCoreRelationIds: ['MR1'],
      omittedMeaningDetected: false,
      unsupportedMeaningDetected: true,
      visualDependencyDetected: false,
      issues: [{
        issueId: 'ISSUE1',
        severity: 'REPAIR_REQUIRED',
        category: 'CONDITION_OR_SCOPE',
        targetType: 'CORE_RELATION',
        targetId: 'MR1',
        description: '조건 방향이 잘못됐다.',
        sourceEvidence: '가이면 나이다.',
        suggestedCorrection: '가를 조건으로 둔다.',
      }],
    } as const;
    expect(ParagraphGoldRepairInputSchema.parse({
      ...auditInput,
      audit: { ...baseAudit, decision: 'REPAIR_REQUIRED' },
    }).audit.decision).toBe('REPAIR_REQUIRED');
    expect(() => ParagraphGoldRepairInputSchema.parse({
      ...auditInput,
      audit: { ...baseAudit, decision: 'PASS' },
    })).toThrow();
  });
});
