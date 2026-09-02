import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from './gold.js';
import {
  SelectedOptionGoldSliceSchema,
  buildSelectedOptionGoldSlice,
} from './selected-option-gold-slice.js';

function fixture(name: string): ProblemQuestionGold {
  return ProblemQuestionGoldSchema.parse(JSON.parse(readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving',
    name,
  ), 'utf8')));
}

describe('selected option gold slice', () => {
  it('선택 선지의 모든 claim·승인 추론·원문 의존성만 모델 입력에 포함한다', () => {
    const gold = fixture('mrna-vaccine-lipid-nanoparticle-q19.json');
    const { slice, auditManifest } = buildSelectedOptionGoldSlice({
      gold,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'AUDIT-MRNA-C5', mode: 'PRODUCTION' },
    });

    expect(slice.targetClaims.map((claim) => claim.claimId))
      .toEqual(['OC5-1', 'OC5-2', 'OC5-3', 'OC5-4']);
    expect(slice.approvedGrounds.map((inference) => inference.inferenceId))
      .toEqual(['II3', 'II4']);
    expect(slice.decisionRule.sufficientGroundSets).toEqual([{
      setId: 'SGS1',
      operator: 'ALL_OF',
      claimIds: ['OC5-2'],
      inferenceIds: ['II4'],
      decisionRelevance: 'DECISIVE',
    }]);
    expect(slice.decisionRule.derivation)
      .toBe('CONSERVATIVE_FROM_DECISION_CRITICAL_CLAIMS');
    expect(slice.sourceEvidence.find((evidence) => evidence.id === 'MP4'))
      .toMatchObject({
        kind: 'PASSAGE_PROPOSITION',
        sourceExcerpt: gold.passageDetailGold.propositions
          .find((proposition) => proposition.id === 'MP4')!.evidence,
      });

    const serializedSlice = JSON.stringify(slice);
    expect(serializedSlice).not.toContain('representativeWrongPaths');
    expect(serializedSlice).not.toContain('supplementalExplanationInferences');
    expect(serializedSlice).not.toContain('OC1-1');
    expect(serializedSlice).not.toContain('II1');
    expect(auditManifest.excluded).toContainEqual({
      id: 'OC1-1', reason: 'OTHER_OPTION_CLAIM',
    });
    expect(auditManifest.excluded.some((item) => item.reason === 'DIAGNOSTIC_BIAS_RISK'))
      .toBe(true);
    expect(SelectedOptionGoldSliceSchema.parse(slice)).toEqual(slice);
  });

  it('DOES_NOT_JUSTIFY 인증을 출처·그래프·전체 골드 해시와 감사 ID로 고정한다', () => {
    const gold = fixture('mrna-vaccine-lipid-nanoparticle-q19.json');
    const { slice } = buildSelectedOptionGoldSlice({
      gold,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'AUDIT-MRNA-C5', mode: 'PRODUCTION' },
    });

    expect(slice.coverageCertificate).toMatchObject({
      status: 'COMPLETE',
      targetChoiceId: 'C5',
      auditId: 'AUDIT-MRNA-C5',
      auditStatus: 'PRODUCTION_APPROVED',
    });
    expect(slice.coverageCertificate?.sourceEvidenceHash).toMatch(/^sha256:/);
    expect(slice.coverageCertificate?.dependencyGraphHash).toMatch(/^sha256:/);
    expect(slice.coverageCertificate?.fullGoldHash).toMatch(/^sha256:/);
  });

  it('candidate 골드의 운영 인증은 거부하고 명시적 실험 인증만 허용한다', () => {
    const reviewed = fixture('mrna-vaccine-lipid-nanoparticle-q19.json');
    const candidate = { ...reviewed, reviewStatus: 'candidate' as const };

    expect(() => buildSelectedOptionGoldSlice({
      gold: candidate,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'AUDIT-CANDIDATE', mode: 'PRODUCTION' },
    })).toThrow(/human_reviewed/);
    const { slice } = buildSelectedOptionGoldSlice({
      gold: candidate,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'EXPERIMENT-MRNA-C5', mode: 'EXPERIMENT' },
    });
    expect(slice.coverageCertificate?.auditStatus).toBe('EXPERIMENT_ONLY');
  });

  it('DOES_NOT_JUSTIFY에는 암묵적 완전성 선언을 허용하지 않는다', () => {
    const gold = fixture('mrna-vaccine-lipid-nanoparticle-q19.json');
    expect(() => buildSelectedOptionGoldSlice({ gold, selectedChoiceId: 'C5' }))
      .toThrow(/명시적인 coverage audit/);
  });

  it('decisionCritical이 없으면 임의 선택 대신 같은 결정의 모든 근거 보유 claim을 보수적으로 사용한다', () => {
    const gold = fixture('mrna-vaccine-lipid-nanoparticle-q19.json');
    const withoutExplicitCritical = {
      ...gold,
      optionClaims: gold.optionClaims.map((claim) =>
        claim.choiceId === 'C5' ? { ...claim, decisionCritical: false } : claim),
    };
    const { slice } = buildSelectedOptionGoldSlice({
      gold: withoutExplicitCritical,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'AUDIT-FALLBACK', mode: 'PRODUCTION' },
    });
    expect(slice.decisionRule.derivation).toBe('CONSERVATIVE_FROM_ALL_DECIDED_CLAIMS');
    expect(slice.decisionRule.sufficientGroundSets).toEqual([{
      setId: 'SGS1',
      operator: 'ALL_OF',
      claimIds: ['OC5-2'],
      inferenceIds: ['II4'],
      decisionRelevance: 'DECISIVE',
    }]);
  });

  it('참조가 끊긴 골드는 슬라이스 생성 전에 거부한다', () => {
    const raw = structuredClone(fixture('mrna-vaccine-lipid-nanoparticle-q19.json')) as any;
    raw.itemInferences.find((item: any) => item.inferenceId === 'II4').premiseRefs = ['MISSING'];
    expect(() => buildSelectedOptionGoldSlice({
      gold: raw,
      selectedChoiceId: 'C5',
      coverageAudit: { auditId: 'AUDIT-MRNA-C5', mode: 'PRODUCTION' },
    })).toThrow();
  });
});
