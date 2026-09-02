import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from './gold.js';
import { normalizeProblemGoldCrossFieldContracts } from './gold-cross-field-normalization.js';
import {
  ProspectiveGoldSampleManifestSchema,
  approveGoldForProspectiveBlindExperiment,
  artifactHash,
  createPendingProspectiveGoldReview,
  deriveSufficientGroundSetCandidates,
  evaluateProspectiveBlindSafetyGate,
  summarizeGoldProduction,
} from './prospective-gold-experiment.js';

function goldFixture(): ProblemQuestionGold {
  const raw = JSON.parse(readFileSync(resolve(
    'packages/pipeline/fixtures/experiments/problem-solving/mrna-vaccine-lipid-nanoparticle-q19.json',
  ), 'utf8')) as unknown;
  return ProblemQuestionGoldSchema.parse({
    ...(raw as Record<string, unknown>),
    reviewStatus: 'candidate',
    sufficientGroundSets: undefined,
  });
}

describe('prospective gold experiment contract', () => {
  it('반복되는 순수 교차 필드 오류는 원문을 보존한 채 정적으로 정규화한다', () => {
    const gold = goldFixture();
    const conclusionStepId = gold.conclusionStepIds[0]!;
    const raw = {
      ...gold,
      decisivePathStepIds: [conclusionStepId],
      representativeWrongPaths: gold.representativeWrongPaths.map((path, index) =>
        index === 0
          ? { ...path, scope: 'SELECTED_WRONG_CHOICE', missedAnswerChoiceId: gold.answerChoiceId }
          : path),
    };

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow();
    const normalized = normalizeProblemGoldCrossFieldContracts(raw);

    expect(ProblemQuestionGoldSchema.parse(normalized.value)).toBeDefined();
    expect(normalized.changes).toContain('SEPARATE_DECISIVE_AND_CONCLUSION_STEPS');
    expect(normalized.changes).toContain('ALIGN_WRONG_PATH_MISSED_ANSWER');
    expect((normalized.value as ProblemQuestionGold).representativeWrongPaths[0]
      ?.missedAnswerChoiceId).toBeNull();
  });

  it('20~30문항, 한 지문 한 문항, 전체 유형 범위를 표본 계약으로 강제한다', () => {
    const items = Array.from({ length: 20 }, (_, index) => {
      const domain = (['HUMANITIES', 'SOCIAL', 'SCIENCE'] as const)[index % 3]!;
      const coverage = [
        index % 2 === 0 ? 'POSITIVE_STEM' as const : 'NEGATIVE_STEM' as const,
        domain,
        ...(index < 6 ? ['SCENARIO_APPLICATION' as const] : []),
        ...(index < 3 ? ['CALCULATION' as const] : []),
        ...(index >= 3 && index < 6 ? ['VISUAL' as const] : []),
        ...(index >= 6 && index < 12 ? ['MULTI_CONDITION' as const] : []),
      ];
      return {
        caseId: `case-${index}`,
        productId: `product-${index}`,
        questionNumber: index + 1,
        exam: '시험',
        title: `제목 ${index}`,
        domain,
        coverage,
        sourceHash: `sha256:${'a'.repeat(64)}`,
        resultFile: `/source/product-${index}_result.json`,
        enrichmentFile: `/source/enrichment/records/product-${index}.json`,
      };
    });
    const manifest = {
      manifestVersion: 'problem-gold-prospective-sample-v1',
      createdAt: '2026-09-03T00:00:00.000Z',
      sourceRoot: '/source',
      selectionSeed: 'seed',
      selectionPolicy: {
        minimumSize: 20,
        maximumSize: 30,
        maximumQuestionsPerProduct: 1,
        excludedQuestionKeys: [],
        minimumCoverageCounts: {
          POSITIVE_STEM: 8,
          NEGATIVE_STEM: 8,
          HUMANITIES: 6,
          SOCIAL: 6,
          SCIENCE: 6,
          SCENARIO_APPLICATION: 6,
          CALCULATION: 3,
          VISUAL: 3,
          MULTI_CONDITION: 6,
        },
        requiredTargetClaimEffects: ['CONTRADICTS', 'DOES_NOT_JUSTIFY'],
      },
      items,
    };

    expect(ProspectiveGoldSampleManifestSchema.parse(manifest).items).toHaveLength(20);
    expect(() => ProspectiveGoldSampleManifestSchema.parse({
      ...manifest, items: items.slice(0, 19),
    })).toThrow();
    expect(() => ProspectiveGoldSampleManifestSchema.parse({
      ...manifest,
      items: items.map((item) => ({
        ...item, coverage: item.coverage.filter((value) => value !== 'VISUAL'),
      })),
    })).toThrow(/VISUAL/);
  });

  it('AI 추론 그래프의 충분 경로는 사람 승인 전 별도 candidate로만 만든다', () => {
    const candidates = deriveSufficientGroundSetCandidates(goldFixture());

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.reviewStatus === 'candidate')).toBe(true);
    expect(candidates.every((candidate) =>
      candidate.origin === 'AI_INFERENCE_GRAPH_DERIVED')).toBe(true);
  });

  it('대기 중 검수나 검수 뒤 변경된 후보는 블라인드 실험 골드로 승격하지 않는다', () => {
    const gold = goldFixture();
    const candidates = deriveSufficientGroundSetCandidates(gold);
    const pending = createPendingProspectiveGoldReview({ caseId: 'case-1', gold, candidates });

    expect(() => approveGoldForProspectiveBlindExperiment({
      gold, candidates, review: pending,
    })).toThrow(/APPROVED/);

    const approved = {
      ...pending,
      status: 'APPROVED' as const,
      reviewerId: 'reviewer-1',
      reviewedAt: '2026-09-03T01:00:00.000Z',
      approvedCandidateIds: [candidates[0]!.candidateId],
    };
    expect(approveGoldForProspectiveBlindExperiment({
      gold, candidates, review: approved,
    })).toMatchObject({
      reviewStatus: 'human_reviewed',
      sufficientGroundSets: [{ reviewStatus: 'human_reviewed' }],
    });
    expect(() => approveGoldForProspectiveBlindExperiment({
      gold,
      candidates: [{ ...candidates[0]!, conclusion: '검수 뒤 바뀐 결론' }, ...candidates.slice(1)],
      review: approved,
    })).toThrow(/승인 해시/);
  });

  it('prospective blind 안전 게이트는 7개 위해 행동 모두 0건일 때만 통과한다', () => {
    const safe = {
      caseId: 'case-1', responseId: 'response-1',
      correctAnswerReversed: false,
      unnecessaryQuestionAfterCorrectAnswer: false,
      inventedUnstatedMisconception: false,
      irrelevantSourceUsed: false,
      answerOrOtherChoiceLeaked: false,
      duplicateFallbackCall: false,
      unsafeTermination: false,
    };

    expect(evaluateProspectiveBlindSafetyGate([safe])).toMatchObject({ passed: true });
    expect(evaluateProspectiveBlindSafetyGate([
      { ...safe, answerOrOtherChoiceLeaked: true },
    ])).toMatchObject({
      passed: false,
      violations: { answerOrOtherChoiceLeaked: 1 },
    });
    expect(evaluateProspectiveBlindSafetyGate([])).toMatchObject({ passed: false });
  });

  it('골드 생성 비용·수정량·고위험 문항 비율을 집계한다', () => {
    const summary = summarizeGoldProduction([
      {
        caseId: 'case-1', generationCalls: 1, generationDurationMs: 1_000,
        inputTokens: 100, cacheReadTokens: 20, outputTokens: 50, estimatedCostUsd: 0.1,
        rawSchemaValid: false, schemaValid: true, automaticNormalizationCount: 2,
        reviewStatus: 'APPROVED', reviewMinutes: 10,
        modifiedFieldCount: 2, modifiedInferenceCount: 1, riskLevel: 'HIGH',
      },
      {
        caseId: 'case-2', generationCalls: 1, generationDurationMs: 2_000,
        inputTokens: 200, cacheReadTokens: 30, outputTokens: 80, estimatedCostUsd: 0.2,
        rawSchemaValid: false, schemaValid: false, automaticNormalizationCount: 1,
        reviewStatus: 'PENDING', reviewMinutes: 0,
        modifiedFieldCount: 0, modifiedInferenceCount: 0, riskLevel: 'LOW',
      },
    ]);

    expect(summary).toMatchObject({
      itemCount: 2, totalGenerationCalls: 2, totalDurationMs: 3_000,
      totalInputTokens: 300, totalCacheReadTokens: 50,
      totalOutputTokens: 130, totalEstimatedCostUsd: 0.3,
      schemaValidCount: 1, rawSchemaValidCount: 0, totalAutomaticNormalizations: 3,
      approvedCount: 1, totalReviewMinutes: 10,
      modifiedItemCount: 1, highRiskItemCount: 1, highRiskRatio: 0.5,
    });
    expect(artifactHash(summary)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
