import { describe, expect, it } from 'vitest';

import {
  listPassages,
  loadContent,
  loadPassageManifest,
  loadProblemSolvingBundle,
} from './content.js';

describe('광합성 전체 지문 앱 등록', () => {
  it('p1~p6을 빠짐없이 원문 순서로 제공한다', () => {
    const paragraphs = listPassages().filter((passage) => passage.passageId === 'photosynthesis');
    expect(paragraphs.map((passage) => passage.paragraphId)).toEqual([
      'photosynthesis-p1',
      'photosynthesis-p2',
      'photosynthesis-p3',
      'photosynthesis-p4',
      'photosynthesis-p5',
      'photosynthesis-p6',
    ]);
    expect(paragraphs.map((passage) => passage.passageIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(paragraphs.every((passage) => passage.passageLength === 6)).toBe(true);
    expect(paragraphs.every((passage) => passage.passageTitle === '식물의 광합성 효율과 C3, C4 식물')).toBe(true);
  });

  it('manifest가 지문 ID와 정본 문단 순서를 제공한다', () => {
    expect(loadPassageManifest('photosynthesis').paragraphIds).toEqual([
      'photosynthesis-p1',
      'photosynthesis-p2',
      'photosynthesis-p3',
      'photosynthesis-p4',
      'photosynthesis-p5',
      'photosynthesis-p6',
    ]);
  });

  it('각 문단이 골드·영역 질의·타이틀 질의까지 로드된다', () => {
    for (let n = 1; n <= 6; n++) {
      const content = loadContent(`photosynthesis-p${n}`);
      expect(content.gold.slots.length).toBeGreaterThan(0);
      expect(content.queries.regions.length).toBeGreaterThan(0);
      expect(content.titleQueries?.regions).toHaveLength(1);
    }
  });
});

describe('mRNA 19번 공개 문제 콘텐츠', () => {
  it('공개 원문·선지와 승인 골드의 식별자가 일치하고 판정 정보는 공개 콘텐츠에 없다', () => {
    const { content, gold } = loadProblemSolvingBundle('mrna-vaccine-lipid-nanoparticle-q19');
    expect(content.questionId).toBe(gold.questionId);
    expect(content.passageId).toBe(gold.passageId);
    expect(content.choices.map((choice) => choice.choiceId)).toEqual(
      gold.choices.map((choice) => choice.choiceId),
    );
    const serialized = JSON.stringify(content);
    expect(serialized).not.toContain('answerChoiceId');
    expect(serialized).not.toContain('judgment');
    expect(serialized).not.toContain('optionClaims');
  });
});

describe('공손룡과 후기 묵가 12번 공개 문제 콘텐츠', () => {
  it('승인 골드와 공개 콘텐츠를 문제 ID로 함께 로드한다', () => {
    const { content, gold } = loadProblemSolvingBundle('gongsun-long-later-mohists-q12');
    expect(content).toMatchObject({
      questionId: 'gongsun-long-later-mohists-q12',
      questionNumber: 12,
      passageId: 'gongsun-long-later-mohists',
      image: null,
    });
    expect(gold.reviewStatus).toBe('human_reviewed');
    expect(gold.answerChoiceId).toBe('C4');
    expect(content.choices.map((choice) => choice.text)).toEqual(
      gold.choices.map((choice) => choice.text),
    );
  });

  it('경로 형태가 아닌 문제 ID는 파일시스템 조회 전에 거부한다', () => {
    expect(() => loadProblemSolvingBundle('../gongsun-long-later-mohists-q12'))
      .toThrow(/등록되지 않은 문제/);
  });
});

describe('확장 적용형 문제 콘텐츠', () => {
  const cases = [
    ['corporate-law-q13', 13, 'C2'],
    ['information-asymmetry-free-marketplace-q13', 13, 'C5'],
    ['surface-tension-laplace-q16', 16, 'C3'],
    ['dopamine-motor-control-q13', 13, 'C2'],
  ] as const;

  it.each(cases)('%s 공개 콘텐츠와 승인 골드가 일치한다', (questionId, questionNumber, answerChoiceId) => {
    const { content, gold } = loadProblemSolvingBundle(questionId);
    expect(content.questionNumber).toBe(questionNumber);
    expect(gold.reviewStatus).toBe('human_reviewed');
    expect(gold.answerChoiceId).toBe(answerChoiceId);
    expect(content.choices.map((choice) => choice.text)).toEqual(
      gold.choices.map((choice) => choice.text),
    );
    expect(JSON.stringify(content)).not.toContain('answerChoiceId');
    const answerClaim = gold.optionClaims.find((claim) => claim.choiceId === answerChoiceId);
    expect(answerClaim?.decisionCritical).toBe(true);
    expect(answerClaim?.assessment).toBe(
      gold.stemPolarity === 'SELECT_CORRECT' ? 'SUPPORTED' : 'CONTRADICTED',
    );
  });
});
