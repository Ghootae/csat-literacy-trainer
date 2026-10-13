import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';

import {
  SourceDirectProblemBundleSchema,
  createSourceDirectProblemEvaluatorInput,
} from './source-direct-evaluator.js';
import { createSourceDirectProblemRequestContent } from './source-direct-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from './session.js';

const CASE_IDS = [
  '6a2294f386fd308968e10e95-q19',
  '6a22950f86fd308968e11320-q19',
  '69c0186c78128b2a9bede0c8-q25',
  '69c0994b78128b2a9bee0922-q30',
] as const;

const ExperimentSchema = z.object({
  sourceInput: z.object({
    source: z.object({
      exam: z.string().min(1),
      title: z.string().min(1),
      passage: z.string().min(1),
      question: z.object({
        question_number: z.number().int().positive(),
        stem: z.string().min(1),
        supplements: z.array(z.object({
          label: z.string(),
          text: z.string(),
        }).passthrough()),
        choices: z.array(z.object({
          choice_number: z.number().int().positive(),
          text: z.string().min(1),
        }).passthrough()).min(2),
      }).passthrough(),
      answerKey: z.object({ correctChoice: z.number().int().positive() }).passthrough(),
      media: z.array(z.object({
        mediaId: z.string().min(1),
        sourceUrl: z.string().url(),
        mimeType: z.string().regex(/^image\//u),
        contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        placement: z.discriminatedUnion('scope', [
          z.object({
            scope: z.literal('PASSAGE'),
            elementIndex: z.number().int().nonnegative().optional(),
          }).passthrough(),
          z.object({
            scope: z.literal('SCENARIO'),
            supplementIndex: z.number().int().nonnegative(),
            elementIndex: z.number().int().nonnegative().optional(),
          }).passthrough(),
          z.object({
            scope: z.literal('CHOICE'),
            choiceId: z.string().min(1),
            elementIndex: z.number().int().nonnegative().optional(),
          }).passthrough(),
        ]),
      }).passthrough()),
    }).passthrough(),
  }).passthrough(),
  officialExplanationReference: z.object({ text: z.string().min(1) }).passthrough(),
}).passthrough();

function inferStemPolarity(stem: string): 'SELECT_CORRECT' | 'SELECT_INCORRECT' {
  return /적절하지\s*않|옳지\s*않|잘못된|일치하지\s*않/u.test(stem)
    ? 'SELECT_INCORRECT'
    : 'SELECT_CORRECT';
}

describe('실제 다중 이미지 원자료의 source-direct v2 조립', () => {
  it.each(CASE_IDS)('%s의 이미지 두 장과 위치를 손실 없이 요청에 넣는다', (caseId) => {
    const path = resolve(
      process.cwd(),
      'docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06',
      'artifacts/source-cases',
      caseId,
      'experiment-input.json',
    );
    const experiment = ExperimentSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
    const raw = experiment.sourceInput.source;
    const choices = raw.question.choices.map((choice) => ({
      choiceId: `C${choice.choice_number}`,
      position: choice.choice_number,
      text: choice.text,
    }));
    const bundle = SourceDirectProblemBundleSchema.parse({
      schemaVersion: 'source-direct-problem-bundle-v2',
      questionId: caseId,
      questionNumber: raw.question.question_number,
      passageId: caseId.replace(/-q[0-9]+$/u, ''),
      title: raw.title,
      exam: raw.exam,
      passage: raw.passage,
      stem: raw.question.stem,
      stemPolarity: inferStemPolarity(raw.question.stem),
      scenario: raw.question.supplements
        .map((supplement) => `${supplement.label}\n${supplement.text}`.trim())
        .join('\n\n'),
      media: raw.media.map((media) => ({
        mediaId: media.mediaId,
        url: media.sourceUrl,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        contentHash: media.contentHash,
        placement: media.placement,
      })),
      choices,
      answerChoiceId: `C${raw.answerKey.correctChoice}`,
      officialExplanation: experiment.officialExplanationReference.text,
    });
    const wrongChoice = choices.find(
      (choice) => choice.choiceId !== bundle.answerChoiceId,
    )!.choiceId;
    const session = submitInitialProblemResponse(createProblemSolvingSession({
      sessionId: `MULTI-IMAGE-${caseId}`,
      questionId: caseId,
      answerChoiceId: bundle.answerChoiceId,
    }), {
      initialChoiceId: wrongChoice,
      rationale: '이미지의 관계를 보고 선택했다.',
    });
    const input = createSourceDirectProblemEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session,
      source: bundle,
    });
    const content = createSourceDirectProblemRequestContent(input);
    const imageParts = content.filter((part) => part['type'] === 'input_image');
    const markerParts = content.filter((part) =>
      part['type'] === 'input_text' && String(part['text']).startsWith('[SOURCE_MEDIA '));

    expect(bundle.media).toHaveLength(2);
    expect(imageParts.map((part) => part['image_url'])).toEqual(
      bundle.media.map((media) => media.url),
    );
    expect(markerParts.map((part) => part['text'])).toEqual(
      bundle.media.map((media) => expect.stringContaining(media.mediaId)),
    );
    expect(JSON.stringify(input.source.media)).not.toContain('alt');
  });
});
