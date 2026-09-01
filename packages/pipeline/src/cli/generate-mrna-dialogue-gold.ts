import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import { analyzeParagraphWithOpenAI } from '../paragraph-analysis/evaluator.js';
import { decomposeCentralStoryWithOpenAI } from '../central-axis-decomposition/evaluator.js';
import { mapRelationsToFixedAxesWithOpenAI } from '../axis-relation-mapping/evaluator.js';
import {
  AxisRelationMappingInputSchema,
  mergeAxesAndRelationMapping,
} from '../axis-relation-mapping/schema.js';

interface PublicProblemContent {
  readonly passageId: string;
  readonly passage: string;
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sentenceList(text: string): readonly { id: string; text: string }[] {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, index) => ({ id: `S${index + 1}`, text: sentence }));
}

function paragraphTexts(passage: string): string[] {
  const parts = passage.split(/\n\n+/u).map((part) => part.trim()).filter(Boolean);
  const footnote = parts.at(-1);
  if (footnote?.startsWith('* pH:') === true && parts.length >= 2) {
    parts[parts.length - 2] = `${parts[parts.length - 2]}\n${footnote}`;
    parts.pop();
  }
  if (parts.length === 0) throw new Error('지문에 문단이 없다.');
  return parts;
}

const model = option('--model') ?? 'gpt-5.6-sol';
const effort = option('--effort') ?? 'medium';
if (effort !== 'medium' && effort !== 'high') throw new Error(`지원하지 않는 effort: ${effort}`);
if (!process.env['OPENAI_API_KEY']) throw new Error('OPENAI_API_KEY가 필요하다.');
const sourcePath = resolve(
  process.cwd(),
  option('--source') ??
    'packages/pipeline/fixtures/experiments/problem-solving/public/mrna-vaccine-lipid-nanoparticle-q19.json',
);
const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as PublicProblemContent;
const texts = paragraphTexts(source.passage);
const paragraphs = texts.map((text, index) => ({
  paragraphId: `${source.passageId}-p${index + 1}`,
  position: index + 1,
  text,
}));
const runId = new Date().toISOString().replaceAll(':', '-');
const outputDir = resolve(
  option('--output-dir') ?? `.omc/experiments/dialogue-gold/${source.passageId}`,
  runId,
);
mkdirSync(resolve(outputDir, 'candidates'), { recursive: true });
const records: unknown[] = [];

for (const paragraph of paragraphs) {
  process.stdout.write(`ANALYZE ${paragraph.paragraphId}\n`);
  const analysisInput = {
    paragraphId: paragraph.paragraphId,
    paragraphText: paragraph.text,
    sentences: sentenceList(paragraph.text),
    passageParagraphs: paragraphs.map(({ paragraphId, text }) => ({ paragraphId, text })),
    fullPassageAvailable: true,
  };
  const analysis = await analyzeParagraphWithOpenAI(analysisInput, {
    model,
    effort,
    promptVersion: 'paragraph-analysis-prompt-v3.1',
  });
  process.stdout.write(`DECOMPOSE ${paragraph.paragraphId}\n`);
  const decomposition = await decomposeCentralStoryWithOpenAI({
    paragraphId: paragraph.paragraphId,
    centralStory: analysis.result.diagnosticGold.centralStory,
  }, { model, effort });
  let mapping = null;
  let diagnosticGold = null;
  if (decomposition.result.verdict === 'READY') {
    process.stdout.write(`MAP ${paragraph.paragraphId}\n`);
    const mappingInput = AxisRelationMappingInputSchema.parse({
      paragraphId: paragraph.paragraphId,
      centralStory: analysis.result.diagnosticGold.centralStory,
      centralAxes: decomposition.result.centralAxes,
      coreRelations: analysis.result.diagnosticGold.coreRelations,
    });
    mapping = await mapRelationsToFixedAxesWithOpenAI(mappingInput, { model, effort });
    if (mapping.result.verdict === 'READY') {
      diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
        ...analysis.result.diagnosticGold,
        centralAxes: mergeAxesAndRelationMapping(mappingInput, mapping.result),
      });
      writeJson(resolve(outputDir, 'candidates', `${paragraph.paragraphId}.json`), diagnosticGold);
    }
  }
  const verdict = diagnosticGold === null ? 'NEEDS_REVIEW' : 'READY_CANDIDATE';
  const artifact = {
    artifactType: 'dialogue-gold-candidate-v1',
    paragraphId: paragraph.paragraphId,
    position: paragraph.position,
    sourcePath,
    sourceHash: hash(paragraph.text),
    model,
    effort,
    verdict,
    stages: { analysis, decomposition, mapping },
    diagnosticGold,
  };
  writeJson(resolve(outputDir, `${paragraph.paragraphId}.json`), artifact);
  records.push({ paragraphId: paragraph.paragraphId, verdict });
  process.stdout.write(`${verdict} ${paragraph.paragraphId}\n`);
}

writeJson(resolve(outputDir, 'manifest.json'), {
  artifactType: 'dialogue-gold-candidate-manifest-v1',
  generatedAt: new Date().toISOString(),
  sourcePath,
  model,
  effort,
  paragraphCount: paragraphs.length,
  records,
});
process.stdout.write(`결과: ${outputDir}\n`);
if (records.some((record: any) => record.verdict !== 'READY_CANDIDATE')) process.exitCode = 1;
