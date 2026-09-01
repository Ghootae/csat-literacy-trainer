import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProblemQuestionGoldSchema, auditProblemGoldWarnings } from './gold.js';

function fixture(name = 'dopamine-motor-control-q13.json') {
  const path = resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving',
    name,
  );
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('problem-solving gold', () => {
  const sixQuestionFixtures = [
    'mrna-vaccine-lipid-nanoparticle-q19.json',
    'gongsun-long-later-mohists-q12.json',
    'corporate-law-q13.json',
    'information-asymmetry-free-marketplace-q13.json',
    'surface-tension-laplace-q16.json',
    'dopamine-motor-control-q13.json',
  ] as const;

  it('운영 6문항의 모든 itemInference가 완결된 방향성 계약을 만족한다', () => {
    for (const name of sixQuestionFixtures) {
      const gold = ProblemQuestionGoldSchema.parse(fixture(name));
      for (const inference of gold.itemInferences) {
        expect(inference.conclusion.length).toBeGreaterThan(0);
        expect(inference.description).toBe(inference.conclusion);
        expect(inference.premiseRefs.length).toBeGreaterThan(0);
        expect(inference.targetClaimIds.length).toBeGreaterThan(0);
        expect(['SUPPORTS', 'CONTRADICTS']).toContain(inference.targetClaimEffect);
      }
      expect(auditProblemGoldWarnings(gold)).toEqual([]);
    }
  });

  it('결론·효과·전제가 없는 itemInference를 거부한다', () => {
    for (const missingField of ['conclusion', 'targetClaimEffect', 'premiseRefs'] as const) {
      const raw = fixture('information-asymmetry-free-marketplace-q13.json') as any;
      delete raw.itemInferences[0][missingField];
      expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow();
    }
  });

  it('문항 추론 효과와 대상 선지 판정 방향의 모순을 거부한다', () => {
    const raw = fixture('information-asymmetry-free-marketplace-q13.json') as any;
    raw.itemInferences.find((item: any) => item.inferenceId === 'II5').targetClaimEffect = 'SUPPORTS';

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/판정 방향이 모순/);
  });

  it('기존 근거 참조와 premiseRefs가 다르면 거부한다', () => {
    const raw = fixture('information-asymmetry-free-marketplace-q13.json') as any;
    raw.itemInferences[0].premiseRefs = ['MP1'];

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/정확히 일치/);
  });

  it('정답 키 제약 추론만 예약 전제 ANSWER_KEY를 사용할 수 있다', () => {
    const constrained = fixture('information-asymmetry-free-marketplace-q13.json') as any;
    const inference = constrained.itemInferences[0];
    inference.references = [];
    inference.scenarioFactIds = [];
    inference.visualAssertionIds = [];
    inference.premiseRefs = ['ANSWER_KEY'];
    inference.grounding = 'ANSWER_KEY_CONSTRAINED';

    expect(() => ProblemQuestionGoldSchema.parse(constrained)).not.toThrow();

    const sourceGrounded = fixture('information-asymmetry-free-marketplace-q13.json') as any;
    sourceGrounded.itemInferences[0].premiseRefs.push('ANSWER_KEY');
    expect(() => ProblemQuestionGoldSchema.parse(sourceGrounded))
      .toThrow(/출처 기반 문항 추론은 ANSWER_KEY/);
  });

  it('과도한 보기 사실 참조는 파싱을 막지 않고 warning으로 보고한다', () => {
    const raw = fixture('information-asymmetry-free-marketplace-q13.json') as any;
    const inference = raw.itemInferences[0];
    inference.scenarioFactIds = ['SF1', 'SF2', 'SF3', 'SF4'];
    inference.premiseRefs = [
      ...inference.references.flatMap((reference: any) => reference.propositionIds),
      ...inference.scenarioFactIds,
    ];
    const gold = ProblemQuestionGoldSchema.parse(raw);

    expect(auditProblemGoldWarnings(gold)).toContainEqual(expect.objectContaining({
      code: 'EXCESSIVE_SCENARIO_FACT_REFERENCES',
      inferenceId: 'II1',
    }));
  });

  it('실제 보기 적용 문항의 발문 극성, 선지 판단, 참조 경로를 검증한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(fixture());

    expect(gold.reviewStatus).toBe('human_reviewed');
    expect(gold.stemPolarity).toBe('SELECT_INCORRECT');
    expect(gold.answerChoiceId).toBe('C2');
    expect(gold.choices.find((choice) => choice.choiceId === 'C2')?.judgment).toBe('FALSE');
    expect(gold.referencePath).toHaveLength(4);
    expect(gold.decisivePathStepIds).toEqual(['RP3']);
    expect(gold.conclusionStepIds).toEqual(['RP4']);
  });

  it('대표 오답 경로를 정답 선지에 연결하지 못하게 한다', () => {
    const raw = fixture() as Record<string, unknown>;
    const paths = raw['representativeWrongPaths'] as Array<Record<string, unknown>>;
    paths[0]!['selectedChoiceIds'] = ['C2'];

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/대표 오답 경로/);
  });

  it('mRNA 19번의 로컬 출처, 그림 의미, 정답 기준 경로를 보존한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );

    expect(gold.source.sourceId).toBe('69c08f1d78128b2a9bedf236');
    expect(gold.reviewStatus).toBe('human_reviewed');
    expect(gold.answerChoiceId).toBe('C5');
    expect(gold.mediaAssets).toEqual([
      expect.objectContaining({
        mediaId: 'IMG1',
        kind: 'DIAGRAM',
        requiredForSolving: true,
        contentHash: 'sha256:149d2cabd22ed7a0d0b61b9c23c783c2b825acaf4d4ba7bf941ab2397dffeba2',
      }),
    ]);
    expect(gold.visualAssertions.map((assertion) => assertion.id)).toEqual([
      'VA1',
      'VA2',
      'VA3',
      'VA4',
    ]);
    expect(gold.choices.find((choice) => choice.choiceId === 'C2')?.visualAssertionIds)
      .toEqual(['VA3', 'VA4']);
  });

  it('mRNA 19번의 지문 명제를 MP1~MP5로 제한하고 해설 추론을 별도 보존한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );

    expect(gold.passageDetailGold.propositions.map((proposition) => proposition.id))
      .toEqual(['MP1', 'MP2', 'MP3', 'MP4', 'MP5']);
    expect(gold.passageDetailGold.propositions.every(
      (proposition) => proposition.basis === 'PASSAGE_EXPLICIT',
    )).toBe(true);
    expect(gold.supplementalExplanationInferences).toEqual([
      expect.objectContaining({
        inferenceId: 'SI1',
        source: 'OFFICIAL_EXPLANATION',
        necessity: 'SUPPORTING',
        groundedness: 'PLAUSIBLE',
      }),
    ]);
  });

  it('⑤를 주장 사슬로 분해하고 최초 결정적 이탈만 정답 경로에 사용한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );
    const claims = gold.optionClaims.filter((claim) => claim.choiceId === 'C5');
    const decisivePath = gold.referencePath.filter((step) =>
      gold.decisivePathStepIds.includes(step.stepId));

    expect(claims.map(({
      claimId,
      assessment,
      decision,
      decisionBasis,
      decisionCritical,
    }) => ({
      claimId,
      assessment,
      decision,
      decisionBasis,
      decisionCritical,
    }))).toEqual([
      {
        claimId: 'OC5-1', assessment: 'SUPPORTED', decision: 'ACCEPTED',
        decisionBasis: 'SOURCE_GROUNDED', decisionCritical: false,
      },
      {
        claimId: 'OC5-2', assessment: 'NOT_JUSTIFIED', decision: 'REJECTED',
        decisionBasis: 'ANSWER_KEY_CONSTRAINED', decisionCritical: true,
      },
      {
        claimId: 'OC5-3', assessment: 'DEPENDS_ON_REJECTED_CLAIM', decision: 'REJECTED',
        decisionBasis: 'DEPENDENCY', decisionCritical: false,
      },
      {
        claimId: 'OC5-4', assessment: 'NOT_ESTABLISHED', decision: 'UNRESOLVED',
        decisionBasis: 'UNRESOLVED', decisionCritical: false,
      },
    ]);
    expect(gold.requiredPathStepIds).toEqual(['RP1', 'RP2', 'RP3', 'RP4', 'RP5']);
    expect(gold.decisivePathStepIds).toEqual(['RP4']);
    expect(gold.conclusionStepIds).toEqual(['RP5']);
    expect(decisivePath).toHaveLength(1);
    expect(decisivePath[0]?.optionClaimIds).toEqual(['OC5-2']);
    expect(decisivePath.map((step) => step.description).join(' ')).not.toContain(
      '복합체 크기 증가',
    );
  });

  it('기본 골드가 부족할 때만 검토된 보충 해설을 허용한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );
    const claim = gold.optionClaims.find((item) => item.claimId === 'OC5-2');

    expect(claim?.fallbackSupplementalInferenceIds).toEqual(['SI1']);
    expect(claim?.supplementalUsePolicy).toEqual([
      'ON_EXPLANATION_REQUEST',
      'AFTER_FAILED_CORRECTION',
      'DIRECT_COACHING_ONLY',
    ]);
  });

  it('3차 오답 정적 해설은 기본 결정 경로만 사용하고 보충 해설을 포함하지 않는다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );

    expect(gold.finalAnswerExplanation).toMatchObject({
      answerChoiceId: 'C5',
      referencePathStepIds: ['RP2', 'RP3', 'RP4', 'RP5'],
    });
    expect(gold.finalAnswerExplanation.message).toContain('지문과 보기에 근거가 없습니다');
    expect(gold.finalAnswerExplanation.message).not.toContain('소수성이 강');
    expect(gold.finalAnswerExplanation.message).not.toContain('크기가 더 커');
  });

  it('보충 해설 참조와 사용 정책 중 하나만 지정하면 거부한다', () => {
    const raw = fixture('mrna-vaccine-lipid-nanoparticle-q19.json') as Record<string, unknown>;
    const claims = raw['optionClaims'] as Array<Record<string, unknown>>;
    const claim = claims.find((item) => item['claimId'] === 'OC5-2');
    claim!['supplementalUsePolicy'] = [];

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/함께 지정/);
  });

  it('근거 부족인 주장을 출처 근거만으로 기각하지 못하게 한다', () => {
    const raw = fixture('mrna-vaccine-lipid-nanoparticle-q19.json') as Record<string, unknown>;
    const claims = raw['optionClaims'] as Array<Record<string, unknown>>;
    const claim = claims.find((item) => item['claimId'] === 'OC5-2');
    claim!['decisionBasis'] = 'SOURCE_GROUNDED';

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/근거 부족만으로 기각/);
  });

  it('선택한 오답의 원인과 ⑤를 놓친 원인을 서로 다른 후보로 보존한다', () => {
    const gold = ProblemQuestionGoldSchema.parse(
      fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
    );
    const missedAnswerPaths = gold.representativeWrongPaths.filter(
      (path) => path.scope === 'MISSED_ANSWER',
    );

    expect(missedAnswerPaths.map((path) => path.id)).toEqual([
      'WP5A',
      'WP5B',
      'WP5C',
      'WP5D',
    ]);
    expect(missedAnswerPaths.every((path) => path.missedAnswerChoiceId === 'C5'))
      .toBe(true);
    expect(gold.representativeWrongPaths.find((path) => path.id === 'WP5B')
      ?.candidateDivergenceLayers).toEqual(['CONCEPT_BOUNDARY']);
    expect(gold.representativeWrongPaths.filter((path) => path.id.startsWith('WP4'))
      .map((path) => path.id)).toEqual(['WP4A', 'WP4B']);
    expect(gold.reviewNotes).toContainEqual(expect.objectContaining({
      targetType: 'CHOICE',
      targetId: 'C2',
    }));
  });

  it('해설 기반 관계를 지문 명제로 승격하면 거부한다', () => {
    const raw = fixture('mrna-vaccine-lipid-nanoparticle-q19.json') as Record<string, unknown>;
    const detail = raw['passageDetailGold'] as Record<string, unknown>;
    const propositions = detail['propositions'] as Array<Record<string, unknown>>;
    propositions[0]!['basis'] = 'REVIEWED_EXPLANATION';

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow();
  });

  it('존재하지 않는 시각 의미를 선지가 참조하면 거부한다', () => {
    const raw = fixture('mrna-vaccine-lipid-nanoparticle-q19.json') as Record<string, unknown>;
    const choices = raw['choices'] as Array<Record<string, unknown>>;
    choices[0]!['visualAssertionIds'] = ['VA-NOT-FOUND'];

    expect(() => ProblemQuestionGoldSchema.parse(raw)).toThrow(/시각 의미 ID/);
  });
});
