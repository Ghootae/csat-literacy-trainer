import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import { normalizeGoldSource } from './gold-generation-metadata.js';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const CANONICAL_SOURCE_SEGMENTATION_VERSION = 'canonical-source-segments-v1' as const;

const CanonicalSourceSegmentSchema = z.object({
  sourceSegmentId: z.string().regex(/^S[1-9][0-9]*$/),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  hash: Sha256Schema,
});

const CanonicalSourceSegmentationSchema = z.object({
  segmentationVersion: z.literal(CANONICAL_SOURCE_SEGMENTATION_VERSION),
  primaryTextHash: Sha256Schema,
  segments: z.array(CanonicalSourceSegmentSchema).min(1),
});

const SourceParagraphSchema = z.object({
  id: z.string().regex(/^p[1-9][0-9]*$/),
  order: z.number().int().positive(),
  text: z.string().min(1),
  hash: Sha256Schema,
  semanticSegmentation: CanonicalSourceSegmentationSchema.optional(),
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
export type CanonicalSourceSegment = z.infer<typeof CanonicalSourceSegmentSchema>;
export type CanonicalSourceSegmentation = z.infer<typeof CanonicalSourceSegmentationSchema>;

export function sourceTextHash(text: string): string {
  return `sha256:${createHash('sha256').update(normalizeGoldSource(text), 'utf8').digest('hex')}`;
}

export function exactSourceTextHash(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

export function assertCanonicalSourceSegmentation(
  primaryText: string,
  value: unknown,
): CanonicalSourceSegmentation {
  const segmentation = CanonicalSourceSegmentationSchema.parse(value);
  if (segmentation.primaryTextHash !== exactSourceTextHash(primaryText)) {
    throw new Error('canonical source segmentation primaryTextHash 불일치');
  }
  let expectedStart = 0;
  for (const [index, segment] of segmentation.segments.entries()) {
    if (segment.sourceSegmentId !== `S${index + 1}`) {
      throw new Error(`canonical source segment 순서 불일치: ${segment.sourceSegmentId}`);
    }
    if (segment.startOffset !== expectedStart || segment.endOffset <= segment.startOffset) {
      throw new Error(`${segment.sourceSegmentId}: canonical source segment offset gap/overlap`);
    }
    const sourceSlice = primaryText.slice(segment.startOffset, segment.endOffset);
    if (segment.hash !== exactSourceTextHash(sourceSlice)) {
      throw new Error(`${segment.sourceSegmentId}: canonical source segment hash 불일치`);
    }
    expectedStart = segment.endOffset;
  }
  if (expectedStart !== primaryText.length) {
    throw new Error('canonical source segments가 primaryText 전체를 덮지 않는다');
  }
  const reconstructed = segmentation.segments
    .map((segment) => primaryText.slice(segment.startOffset, segment.endOffset))
    .join('');
  if (reconstructed !== primaryText) {
    throw new Error('canonical source segments 재결합 결과가 primaryText와 다르다');
  }
  return segmentation;
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
  for (const paragraph of fixture.paragraphs) {
    if (paragraph.semanticSegmentation === undefined) continue;
    let semanticText = paragraph.text;
    for (const footnote of fixture.footnotes.filter((item) => item.targetParagraphId === paragraph.id)) {
      semanticText = semanticText.split(`${footnote.targetTerm}${footnote.marker}`).join(footnote.targetTerm);
    }
    assertCanonicalSourceSegmentation(normalizeGoldSource(semanticText), paragraph.semanticSegmentation);
  }
  return fixture;
}
