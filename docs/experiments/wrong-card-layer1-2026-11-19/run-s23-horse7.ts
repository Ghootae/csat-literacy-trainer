/** v1.3 확인: S-23 경마 7번 카드만 재생성(저장소 루트에서 node --env-file=.env node_modules/.bin/vite-node 이 파일). 최대 2회 호출, 결과는 runs/v1.3/s23-horse7.json. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createOpenAiTransport } from '@csat/pipeline';
import { loadDiagnosticBundle, loadDiagnosticSet, loadChoiceLinkTwists, loadSymbolGloss, loadWrongCardPrompt, WRONG_CARD_PROMPT_VERSION } from '../../../packages/app/src/server/diagnostic/content.js';
import { loadExaminerStrategies } from '../../../packages/app/src/server/examiner-strategy.js';
import { attemptWrongCard, buildWrongCardInput } from '../../../packages/app/src/server/diagnostic/wrong-card.js';

const set = loadDiagnosticSet();
const file = JSON.parse(readFileSync('docs/experiments/reading-error-2026-11-18/inputs/S-23.json', 'utf8'));
const entry = file.evidenceEntries.find((e: any) => e.item === '경마식 보도와 선거 방송 토론회 7번');
const passage = set.passages.find(p => p.passageId.includes('horse') || loadDiagnosticBundle(p.questionIds[0]!).source.title.startsWith('경마식'))!;
const questionId = passage.questionIds.find(q => loadDiagnosticBundle(q).source.questionNumber === 7)!;
const { content } = loadDiagnosticBundle(questionId); const meta = set.items[questionId]!;
const textAt = (n: number) => content.choices.find(c => c.position === n)!.text;
if (textAt(entry.chosen.position) !== entry.chosen.text) throw new Error('선지 불일치');
const twists = loadChoiceLinkTwists(passage.choiceLinkPath);
const strategies = loadExaminerStrategies();
const input = buildWrongCardInput({
  title: content.title, number: 7, stem: content.stem, scenario: content.scenario ?? '', passage: content.passage, textAnnotations: content.textAnnotations ?? [],
  stemPolarity: 'SELECT_INCORRECT', chosen: { position: entry.chosen.position, text: entry.chosen.text }, answer: { position: meta.answerPosition, text: textAt(meta.answerPosition) },
  correct: false, firstRationale: entry.studentRationale, rationaleJudgment: null,
  chosenTwists: twists(7, entry.chosen.position), answerTwists: twists(7, meta.answerPosition),
  strategyParagraphs: strategies.get(questionId)?.find(s => s.position === meta.answerPosition)?.paragraphs ?? null,
  symbolGloss: loadSymbolGloss(passage.passageId), megastudy: meta.megastudy,
});
console.log('case', input.case, 'questionId', questionId);
const transport = createOpenAiTransport(); const instructions = loadWrongCardPrompt();
const attempts: any[] = [];
for (let n = 1; n <= 2; n++) {
  const a = await attemptWrongCard(transport, instructions, input, n); attempts.push(a);
  console.log(`시도 ${n}: ${a.passed ? '통과' : '실패 ' + JSON.stringify(a.checks.filter(c => !c.ok))}`);
  if (a.passed) break;
}
mkdirSync('docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.3', { recursive: true });
writeFileSync('docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.3/s23-horse7.json', JSON.stringify({ promptVersion: WRONG_CARD_PROMPT_VERSION, note: 'S-23 경마 7번 카드만 재생성(입력은 reading-error inputs/S-23.json의 근거 + 진단 콘텐츠)', case: input.case, questionId, finalPassed: attempts.at(-1).passed, attempts }, null, 2) + '\n');
console.log(JSON.stringify(attempts.at(-1).output, null, 1));
