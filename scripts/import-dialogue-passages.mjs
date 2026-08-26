import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const projectRoot = process.cwd();
const legacyDataRoot = '/Users/mac/Projects/csat-literacy-trainer/data';
const outputRoot = resolve(
  projectRoot,
  'packages/pipeline/fixtures/experiments/dialogue/passages',
);

const sources = [
  {
    passageId: 'dopamine-motor-control',
    sourceId: '69c28579d58cf540a9bc25eb',
    paragraphPrefix: 'dopamine-motor-control-p',
  },
  {
    passageId: 'corporate-law',
    sourceId: '69bbf88d8937cf14551903ca',
    paragraphPrefix: 'corporate-law-p',
  },
  {
    passageId: 'surface-tension-laplace',
    sourceId: '6a213ea086fd308968e101df',
    paragraphPrefix: 'surface-tension-laplace-p',
  },
  {
    passageId: 'information-asymmetry-free-marketplace',
    sourceId: '6a213e9386fd308968e100b3',
    paragraphPrefix: 'information-asymmetry-free-marketplace-p',
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function goldPath(paragraphId) {
  const path = resolve(
    projectRoot,
    'packages/pipeline/fixtures/experiments/dialogue/gold-v2',
    `${paragraphId}.json`,
  );
  try {
    readFileSync(path, 'utf8');
    return `packages/pipeline/fixtures/experiments/dialogue/gold-v2/${paragraphId}.json`;
  } catch {
    return null;
  }
}

function writePassage(value) {
  const target = resolve(outputRoot, `${value.passageId}.json`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

for (const source of sources) {
  const sourcePath = resolve(legacyDataRoot, `${source.sourceId}_result.json`);
  const raw = readJson(sourcePath);
  const blocks = raw.passage.split(/\n+/).map((text) => text.trim()).filter(Boolean);
  const texts = blocks.filter((text) => !text.startsWith('*'));
  const notes = blocks.filter((text) => text.startsWith('*'));
  writePassage({
    schemaVersion: 'dialogue-passage-v1',
    passageId: source.passageId,
    title: raw.title,
    exam: raw.exam,
    questionRange: raw.question_range,
    source: {
      status: 'exact-local-source',
      sourceId: source.sourceId,
      sourcePath,
    },
    notes,
    paragraphs: texts.map((text, index) => {
      const paragraphId = `${source.paragraphPrefix}${index + 1}`;
      return {
        paragraphId,
        position: index + 1,
        text,
        goldPath: goldPath(paragraphId),
      };
    }),
  });
}

const hegelGoldPath = resolve(
  projectRoot,
  'packages/pipeline/fixtures/experiments/dialogue/gold-v2/hegel-aesthetics-absolute-spirit-p1.json',
);
const hegelGold = readJson(hegelGoldPath);
writePassage({
  schemaVersion: 'dialogue-passage-v1',
  passageId: 'hegel-aesthetics-absolute-spirit',
  title: '헤겔의 미학과 변증법적 체계',
  exam: '2022학년도 대학수학능력시험 국어',
  questionRange: null,
  source: {
    status: 'incomplete-local-excerpt',
    sourceId: null,
    sourcePath: 'packages/pipeline/fixtures/experiments/dialogue/gold-v2/hegel-aesthetics-absolute-spirit-p1.json',
    note: '현재 저장소에는 첫 문단만 보존되어 있다. 전체 원문 확보 전까지 완전한 지문 실험에 사용하지 않는다.',
  },
  notes: [],
  paragraphs: [
    {
      paragraphId: hegelGold.paragraphId,
      position: 1,
      text: hegelGold.paragraphText,
      goldPath: 'packages/pipeline/fixtures/experiments/dialogue/gold-v2/hegel-aesthetics-absolute-spirit-p1.json',
    },
  ],
});

console.log(`Imported ${sources.length + 1} dialogue passages into ${outputRoot}`);
