import { describe, expect, it } from 'vitest';

import { injectProblemGoldSourceFidelity } from './gold-source-fidelity.js';

describe('problem gold source fidelity injection', () => {
  it('정본 식별자·정답·미디어 메타데이터를 코드로 덮어쓴다', () => {
    const injected = injectProblemGoldSourceFidelity({
      schemaVersion: 'invented',
      source: {
        sourceId: 'wrong',
        exam: 'wrong',
        questionNumber: 99,
        sourceUrl: 'https://invented.example/source',
      },
      choices: [
        { choiceId: 'choice1', position: 9 },
        { choiceId: 'choice2', position: 8 },
      ],
      optionClaims: [{ claimId: 'OC1', choiceId: 'choice1' }],
      answerChoiceId: 'choice1',
      finalAnswerExplanation: { answerChoiceId: 'choice1' },
      representativeWrongPaths: [{
        selectedChoiceIds: ['choice1'],
        missedAnswerChoiceId: 'choice2',
      }],
      mediaAssets: [{
        mediaId: 'wrong-media',
        kind: 'DIAGRAM',
        role: 'INFORMATIONAL',
        sourceUrl: 'https://invented.example/image',
        mimeType: 'image/jpeg',
        contentHash: `sha256:${'0'.repeat(64)}`,
        width: 1,
        height: 1,
        placement: { scope: 'CHOICE' },
        requiredForSolving: true,
        altText: '모델이 판단한 교육적 설명',
      }],
      visualAssertions: [{ id: 'VA1', mediaId: 'wrong-media' }],
    }, {
      source: {
        sourceId: 'source-1',
        exam: '시험',
        questionNumber: 12,
        answerKey: { correctChoice: 2 },
        media: [{
          mediaId: 'MEDIA1',
          sourceUrl: 'https://source.example/image.png',
          mimeType: 'image/png',
          contentHash: `sha256:${'a'.repeat(64)}`,
          width: 640,
          height: 480,
          placement: { scope: 'SCENARIO', supplementIndex: 0 },
        }],
      },
    }) as any;

    expect(injected.schemaVersion).toBe('problem-solving-gold-v2');
    expect(injected.source).toEqual({
      sourceId: 'source-1', exam: '시험', questionNumber: 12,
    });
    expect(injected.choices).toEqual([
      { choiceId: 'C1', position: 1 },
      { choiceId: 'C2', position: 2 },
    ]);
    expect(injected.optionClaims[0].choiceId).toBe('C1');
    expect(injected.answerChoiceId).toBe('C2');
    expect(injected.finalAnswerExplanation.answerChoiceId).toBe('C2');
    expect(injected.representativeWrongPaths[0]).toEqual({
      selectedChoiceIds: ['C1'], missedAnswerChoiceId: 'C2',
    });
    expect(injected.mediaAssets).toEqual([expect.objectContaining({
      mediaId: 'MEDIA1',
      kind: 'DIAGRAM',
      role: 'INFORMATIONAL',
      sourceUrl: 'https://source.example/image.png',
      mimeType: 'image/png',
      contentHash: `sha256:${'a'.repeat(64)}`,
      width: 640,
      height: 480,
      placement: { scope: 'SCENARIO', supplementIndex: 0 },
      requiredForSolving: true,
      altText: '모델이 판단한 교육적 설명',
    })]);
    expect(injected.visualAssertions[0].mediaId).toBe('MEDIA1');
  });

  it('모델이 누락한 미디어의 의미 필드를 발명하지 않는다', () => {
    const injected = injectProblemGoldSourceFidelity({
      mediaAssets: [],
    }, {
      source: {
        media: [{ mediaId: 'MEDIA1', sourceUrl: 'https://source.example/image.png' }],
      },
    }) as any;

    expect(injected.mediaAssets).toEqual([]);
  });
});
