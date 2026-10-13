import { describe, expect, it } from 'vitest';

import {
  listPassages,
  loadContent,
  loadPassageManifest,
  loadProblemSolvingBundle,
  loadDialoguePassages,
} from './content.js';

describe('연결 문항의 원자료 기호 메타데이터', () => {
  it('6문항의 공개 콘텐츠와 서버 판정 번들 모두 검증된 범위를 보존한다', () => {
    const ids = loadDialoguePassages().flatMap(p => p.problemQuestionId ? [p.problemQuestionId] : []);
    expect(ids).toHaveLength(6);
    let count = 0;
    for (const id of ids) {
      const { content, source } = loadProblemSolvingBundle(id);
      expect(source.textAnnotations).toEqual(content.textAnnotations);
      count += source.textAnnotations!.length;
      for (const a of source.textAnnotations!) {
        expect((a.location === 'PASSAGE' ? source.passage : source.scenario).slice(a.start, a.end)).toBe(a.text);
      }
    }
    expect(count).toBe(29);
  });
});

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
  it('공개 원문과 서버 전용 원문 직접 참조가 일치하고 판정 정보는 공개 콘텐츠에 없다', () => {
    const { content, source } = loadProblemSolvingBundle('mrna-vaccine-lipid-nanoparticle-q19');
    expect(content.questionId).toBe(source.questionId);
    expect(content.passageId).toBe(source.passageId);
    expect(content.choices.map((choice) => choice.choiceId)).toEqual(
      source.choices.map((choice) => choice.choiceId),
    );
    expect(content.media).toEqual([expect.objectContaining({
      mediaId: 'MEDIA1',
      alt: expect.stringContaining('Y자 미세관'),
      placement: { scope: 'SCENARIO', supplementIndex: 0 },
    })]);
    expect(source.media).toEqual([expect.objectContaining({
      mediaId: 'MEDIA1',
      placement: { scope: 'SCENARIO', supplementIndex: 0 },
    })]);
    expect(JSON.stringify(source.media)).not.toContain('alt');
    const serialized = JSON.stringify(content);
    expect(serialized).not.toContain('answerChoiceId');
    expect(serialized).not.toContain('judgment');
    expect(serialized).not.toContain('optionClaims');
  });
});

describe('공손룡과 후기 묵가 12번 공개 문제 콘텐츠', () => {
  it('원문 직접 참조와 공개 콘텐츠를 문제 ID로 함께 로드한다', () => {
    const { content, source } = loadProblemSolvingBundle('gongsun-long-later-mohists-q12');
    expect(content).toMatchObject({
      questionId: 'gongsun-long-later-mohists-q12',
      questionNumber: 12,
      passageId: 'gongsun-long-later-mohists',
      media: [],
    });
    expect(source.schemaVersion).toBe('source-direct-problem-bundle-v2');
    expect(source.answerChoiceId).toBe('C4');
    expect(content.choices.map((choice) => choice.text)).toEqual(
      source.choices.map((choice) => choice.text),
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

  it.each(cases)('%s 공개 콘텐츠와 원문 직접 참조가 일치한다', (questionId, questionNumber, answerChoiceId) => {
    const { content, source } = loadProblemSolvingBundle(questionId);
    expect(content.questionNumber).toBe(questionNumber);
    expect(source.answerChoiceId).toBe(answerChoiceId);
    expect(source.officialExplanation.length).toBeGreaterThan(0);
    expect(content.choices.map((choice) => choice.text)).toEqual(
      source.choices.map((choice) => choice.text),
    );
    expect(JSON.stringify(content)).not.toContain('answerChoiceId');
    const serializedSource = JSON.stringify(source);
    expect(serializedSource).not.toContain('optionClaims');
    expect(serializedSource).not.toContain('itemInferences');
    expect(serializedSource).not.toContain('referencePath');
  });
});
