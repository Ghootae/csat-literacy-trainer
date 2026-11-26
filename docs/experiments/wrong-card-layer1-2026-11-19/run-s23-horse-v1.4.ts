/** v1.4 확인: S-23 경마 6번·7번 카드 두 장만 재생성(저장소 루트에서 node --env-file=.env node_modules/.bin/vite-node 이 파일). 카드당 최대 2회, 합 최대 4회. 결과는 runs/v1.4/s23-horse{6,7}.json. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createOpenAiTransport } from '@csat/pipeline';
import { loadDiagnosticBundle, loadDiagnosticSet, loadChoiceLinkTwists, loadSymbolGloss, loadWrongCardPrompt, WRONG_CARD_PROMPT_VERSION } from '../../../packages/app/src/server/diagnostic/content.js';
import { loadExaminerStrategies, stemPolarity } from '../../../packages/app/src/server/examiner-strategy.js';
import { attemptWrongCard, buildWrongCardInput } from '../../../packages/app/src/server/diagnostic/wrong-card.js';

const set = loadDiagnosticSet();
const file = JSON.parse(readFileSync('docs/experiments/reading-error-2026-11-18/inputs/S-23.json', 'utf8'));
const transport = createOpenAiTransport(); const instructions = loadWrongCardPrompt();
const strategies = loadExaminerStrategies();
const dir = 'docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.4';
mkdirSync(dir, { recursive: true });

for (const number of [6, 7]) {
  const entry = file.evidenceEntries.find((e: any) => e.item === `경마식 보도와 선거 방송 토론회 ${number}번`);
  const passage = set.passages.find(p => loadDiagnosticBundle(p.questionIds[0]!).source.title.startsWith('경마식'))!;
  const questionId = passage.questionIds.find(q => loadDiagnosticBundle(q).source.questionNumber === number)!;
  const { content } = loadDiagnosticBundle(questionId); const meta = set.items[questionId]!;
  const textAt = (n: number) => content.choices.find(c => c.position === n)!.text;
  if (textAt(entry.chosen.position) !== entry.chosen.text) throw new Error('선지 불일치');
  const twists = loadChoiceLinkTwists(passage.choiceLinkPath);
  const polarity = stemPolarity(content.stem);
  const strategyAt = (n: number) => strategies.get(questionId)?.find(s => s.position === n)?.paragraphs ?? null;
  const input = buildWrongCardInput({
    title: content.title, number, stem: content.stem, scenario: content.scenario ?? '', passage: content.passage, textAnnotations: content.textAnnotations ?? [],
    stemPolarity: polarity, chosen: { position: entry.chosen.position, text: entry.chosen.text }, answer: { position: meta.answerPosition, text: textAt(meta.answerPosition) },
    correct: false, firstRationale: entry.studentRationale, rationaleJudgment: null,
    chosenTwists: twists(number, entry.chosen.position), answerTwists: twists(number, meta.answerPosition),
    strategyParagraphs: strategyAt(polarity === 'SELECT_INCORRECT' ? meta.answerPosition : entry.chosen.position),
    symbolGloss: loadSymbolGloss(passage.passageId), megastudy: meta.megastudy,
  });
  console.log(`경마 ${number}번`, 'case', input.case, 'questionId', questionId);
  const attempts: any[] = [];
  for (let n = 1; n <= 2; n++) {
    const a = await attemptWrongCard(transport, instructions, input, n); attempts.push(a);
    console.log(`시도 ${n}: ${a.passed ? '통과' : '실패 ' + JSON.stringify(a.checks.filter(c => !c.ok))}`);
    if (a.passed) break;
  }
  writeFileSync(`${dir}/s23-horse${number}.json`, JSON.stringify({ promptVersion: WRONG_CARD_PROMPT_VERSION, note: `S-23 경마 ${number}번 카드만 재생성(입력은 reading-error inputs/S-23.json의 근거 + 진단 콘텐츠)`, case: input.case, questionId, input, finalPassed: attempts.at(-1).passed, attempts }, null, 2) + '\n');
}
