import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import { normalizeGoldSource } from './gold-generation-metadata.js';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const SourceParagraphSchema = z.object({
  id: z.string().regex(/^p[1-9][0-9]*$/),
  order: z.number().int().positive(),
  text: z.string().min(1),
  hash: Sha256Schema,
});

const SourceFootnoteSchema = z.object({
  id: z.string().regex(/^fn[1-9][0-9]*$/),
  order: z.number().int().positive(),
  marker: z.string().min(1),
  targetParagraphId: z.string().regex(/^p[1-9][0-9]*$/),
  targetTerm: z.string().min(1),
  text: z.string().min(1),
});

export const PassageSourceFixtureSchema = z.object({
  schemaVersion: z.literal('passage-source-v1'),
  sourceSetId: z.string().min(1),
  passageId: z.string().min(1),
  title: z.string().min(1),
  field: z.string().min(1),
  exam: z.object({
    grade: z.string().min(1),
    year: z.number().int().positive(),
    month: z.number().int().min(1).max(12),
    administrator: z.string().min(1),
    questionRange: z.string().min(1),
  }),
  provenance: z.object({
    localPath: z.string().min(1),
    runtimeDependency: z.literal(false),
    comparedFields: z.array(z.string().min(1)).min(1),
  }),
  hashContract: z.object({
    algorithm: z.literal('sha256'),
    encoding: z.literal('utf8'),
    normalization: z.literal('normalizeGoldSource-v1'),
    normalizationRule: z.string().min(1),
    fullSourceAssembly: z.literal('paragraphs-then-footnotes-joined-with-LF'),
  }),
  fullSourceHash: Sha256Schema,
  paragraphs: z.array(SourceParagraphSchema).min(1),
  footnotes: z.array(SourceFootnoteSchema),
});

export type PassageSourceFixture = z.infer<typeof PassageSourceFixtureSchema>;

export function sourceTextHash(text: string): string {
  return `sha256:${createHash('sha256').update(normalizeGoldSource(text), 'utf8').digest('hex')}`;
}

export function assemblePassageSource(fixture: PassageSourceFixture): string {
  return [...fixture.paragraphs, ...fixture.footnotes].map((item) => item.text).join('\n');
}
