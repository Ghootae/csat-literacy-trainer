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
