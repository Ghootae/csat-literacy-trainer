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

export function assertPassageSourceFixtureIntegrity(value: unknown): PassageSourceFixture {
  const fixture = PassageSourceFixtureSchema.parse(value);
  const paragraphIds = fixture.paragraphs.map((paragraph) => paragraph.id);
  const footnoteIds = fixture.footnotes.map((footnote) => footnote.id);
  if (new Set(paragraphIds).size !== paragraphIds.length) throw new Error('source fixture paragraph ID 중복');
  if (new Set(footnoteIds).size !== footnoteIds.length) throw new Error('source fixture footnote ID 중복');
  for (const paragraph of fixture.paragraphs) {
    if (paragraph.hash !== sourceTextHash(paragraph.text)) throw new Error(`${paragraph.id}: source paragraph hash 불일치`);
  }
  if (fixture.fullSourceHash !== sourceTextHash(assemblePassageSource(fixture))) {
    throw new Error('source fixture fullSourceHash 불일치');
  }
  for (const footnote of fixture.footnotes) {
    if (!paragraphIds.includes(footnote.targetParagraphId)) {
      throw new Error(`${footnote.id}: source footnote target 문단 없음`);
    }
  }
  return fixture;
}
