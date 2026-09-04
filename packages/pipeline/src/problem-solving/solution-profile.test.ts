import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractSolutionProfiles } from './solution-profile.js';

const fixtureNames = [
  'mrna-vaccine-lipid-nanoparticle-q19.json',
  'gongsun-long-later-mohists-q12.json',
  'corporate-law-q13.json',
  'information-asymmetry-free-marketplace-q13.json',
  'surface-tension-laplace-q16.json',
  'dopamine-motor-control-q13.json',
] as const;

function fixtures(): unknown[] {
  return fixtureNames.map((name) => JSON.parse(readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving',
    name,
  ), 'utf8')) as unknown);
}

describe('problem solution profile extraction', () => {
  it('운영 6문항의 30개 선지를 원본 변경 없이 펼친다', () => {
    const golds = fixtures();
    const before = JSON.stringify(golds);

    const result = extractSolutionProfiles(golds);

    expect(result.choices).toHaveLength(30);
    expect(JSON.stringify(golds)).toBe(before);
    expect(new Set(result.choices.map((row) => row.questionId))).toHaveLength(6);
    expect(result.choices.every((row) => row.allEvidenceRefs.length > 0)).toBe(true);
  });

  it('선지 근거의 출처와 실제 설명을 함께 보존한다', () => {
    const result = extractSolutionProfiles(fixtures());
    const visual = result.evidence.find((row) => (
      row.questionId === 'mrna-vaccine-lipid-nanoparticle-q19' &&
      row.evidenceRef === 'VA3'
    ));

    expect(visual).toEqual(expect.objectContaining({
      evidenceSourceKind: 'VISUAL_ASSERTION',
    }));
    expect(visual?.evidenceDescription.length).toBeGreaterThan(0);
    expect(visual?.origins).toContain('INFERENCE_PREMISE');
  });

  it('압축 다단계 후보와 거짓 선지의 오류 기제만 수동 검수 큐에 넣는다', () => {
    const result = extractSolutionProfiles(fixtures());
    const multiStep = result.manualReview.filter(
      (row) => row.reviewType === 'COMPRESSED_MULTI_STEP',
    );
    const errorMechanisms = result.manualReview.filter(
      (row) => row.reviewType === 'ERROR_MECHANISM',
    );

    expect(multiStep.length).toBeGreaterThan(0);
    expect(multiStep.some((row) => row.automaticSignals.includes(
      'CAUSAL_CHAIN_OPERATION',
    ))).toBe(true);
    expect(errorMechanisms).toHaveLength(9);
    expect(errorMechanisms.every((row) => {
      const choice = result.choices.find((candidate) => (
        candidate.questionId === row.questionId && candidate.choiceId === row.choiceId
      ));
      return choice?.judgment === 'FALSE';
    })).toBe(true);
    expect(result.manualReview.every((row) => (
      row.reviewerDecision === '' &&
      row.reviewedStructureOrMechanism === '' &&
      row.reviewerNotes === ''
    ))).toBe(true);
  });
});
