import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  PROSPECTIVE_PARAGRAPH_GOLD_MANIFEST_VERSION,
  ProspectiveParagraphGoldManifestSchema,
  paragraphSourceUnit,
  splitPassageParagraphs,
  textHash,
} from '../paragraph-analysis/production.js';

interface ProblemSampleManifest {
  readonly items: readonly {
    readonly caseId: string;
    readonly productId: string;
    readonly questionNumber: number;
    readonly exam: string;
    readonly title: string;
    readonly sourceHash: string;
    readonly resultFile: string;
    readonly enrichmentFile: string;
  }[];
}

interface RawPassage {
  readonly product_id: string;
  readonly exam: string;
  readonly title: string;
  readonly passage: string;
  readonly image_urls?: readonly string[];
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hashText(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

const sourceManifestPath = resolve(
  process.cwd(),
  option('--source') ??
    'packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json',
);
const outputPath = resolve(
  process.cwd(),
  option('--output') ??
    'packages/pipeline/experiments/dialogue/prospective-paragraph-gold-manifest-v1.json',
);
const problemArtifactsRoot = resolve(
  process.cwd(),
  option('--problem-artifacts-root') ??
    'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts',
);

const sourceManifestText = readFileSync(sourceManifestPath, 'utf8');
const sourceManifest = JSON.parse(sourceManifestText) as ProblemSampleManifest;
if (sourceManifest.items.length !== 24) {
  throw new Error(`예상한 문제 표본은 24개지만 실제로는 ${sourceManifest.items.length}개다.`);
}

const seenSourceIds = new Set<string>();
const passages = sourceManifest.items.map((item) => {
  if (seenSourceIds.has(item.productId)) {
    throw new Error(`24문항 표본에 같은 지문이 두 번 포함됐다: ${item.productId}`);
  }
  seenSourceIds.add(item.productId);

  const resultText = readFileSync(item.resultFile, 'utf8');
  const enrichmentText = readFileSync(item.enrichmentFile, 'utf8');
  const problemSourceSnapshotFile = resolve(problemArtifactsRoot, item.caseId, 'source-input.json');
  const problemSourceSnapshotText = readFileSync(problemSourceSnapshotFile, 'utf8');
  const problemSourceSnapshot = JSON.parse(problemSourceSnapshotText) as {
    readonly sample?: { readonly sourceHash?: string };
    readonly source?: {
      readonly sourceId?: string;
      readonly questionNumber?: number;
      readonly passage?: string;
    };
  };

  const result = JSON.parse(resultText) as RawPassage;
  if (result.product_id !== item.productId) {
    throw new Error(`resultFile의 product_id가 표본과 다르다: ${item.caseId}`);
  }
  if (typeof result.passage !== 'string' || result.passage.trim() === '') {
    throw new Error(`지문 원문이 비어 있다: ${item.caseId}`);
  }
  if (
    problemSourceSnapshot.sample?.sourceHash !== item.sourceHash ||
    problemSourceSnapshot.source?.sourceId !== item.productId ||
    problemSourceSnapshot.source?.questionNumber !== item.questionNumber ||
    problemSourceSnapshot.source?.passage !== result.passage
  ) {
    throw new Error(`문제 생산 당시 스냅샷과 현재 지문 원문이 다르다: ${item.caseId}`);
  }
  const split = splitPassageParagraphs(result.passage);
  const paragraphUnits = split.map((paragraph) => paragraphSourceUnit({
    sourceId: item.productId,
    paragraph,
  }));
  return {
    sourceId: item.productId,
    passageId: item.productId,
    exam: result.exam,
    title: result.title,
    sampleQuestionNumber: item.questionNumber,
    sampleSourceHash: item.sourceHash,
    problemSourceSnapshotFile,
    problemSourceSnapshotHash: hashText(problemSourceSnapshotText),
    resultFile: item.resultFile,
    resultFileHash: hashText(resultText),
    enrichmentFile: item.enrichmentFile,
    enrichmentFileHash: hashText(enrichmentText),
    passageHash: textHash(result.passage),
    mediaCount: result.image_urls?.length ?? 0,
    paragraphCount: paragraphUnits.length,
    footnoteCount: paragraphUnits.reduce(
      (sum, paragraph) => sum + paragraph.attachedFootnoteCount,
      0,
    ),
    paragraphs: paragraphUnits,
  };
});

const manifest = ProspectiveParagraphGoldManifestSchema.parse({
  manifestVersion: PROSPECTIVE_PARAGRAPH_GOLD_MANIFEST_VERSION,
  createdAt: new Date().toISOString(),
  sourceSampleManifest: sourceManifestPath,
  sourceSampleManifestHash: hashText(sourceManifestText),
  passageCount: passages.length,
  paragraphCount: passages.reduce((sum, passage) => sum + passage.paragraphCount, 0),
  footnoteCount: passages.reduce((sum, passage) => sum + passage.footnoteCount, 0),
  passages,
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write([
  `manifest: ${outputPath}`,
  `지문: ${manifest.passageCount}개`,
  `분석 문단: ${manifest.paragraphCount}개`,
  `앞 문단에 연결한 각주: ${manifest.footnoteCount}개`,
].join('\n') + '\n');
