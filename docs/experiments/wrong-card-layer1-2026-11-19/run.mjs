/**
 * 오답 카드 1~3층 생성 실험(PROMPT-v1.1). 손 생성 5장(HAND-CARDS.md)과 같은 문항·학생을 모델(sol)로 만든다.
 * 사용(저장소 루트): node --env-file=.env docs/experiments/wrong-card-layer1-2026-11-19/run.mjs [--dry]
 *   v1.2 재실행: ... run.mjs --prompt v1.2 --cards card2,card3,card4   (저장된 inputs/card*.json을 그대로 쓰고 runs/v1.2/에 쓴다)
 * 읽는 파일: PROMPT-v1.1.md(지시문 전체), reading-error-2026-11-18/inputs/<학생>.json, 진단 콘텐츠(문항 묶음·선지 연결·기호 사전·출제자 전략).
 * 쓰는 파일: inputs/<카드>.json(모델 입력), runs/<카드>.json(시도별 원출력·코드 검사 결과·메타데이터).
 * 모델 호출: 카드당 1회, 코드 검사 실패 시 1회만 다시 생성(최대 10회). 검토 모델은 쓰지 않는다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { THOUGHT_DIAGNOSIS_MODEL } from '../../../packages/pipeline/dist/index.js';
import { loadDiagnosticBundle, loadDiagnosticSet, loadChoiceLinkTwists, loadSymbolGloss } from '../../../packages/app/dist/server/diagnostic/content.js';
import { loadExaminerStrategies } from '../../../packages/app/dist/server/examiner-strategy.js';

const dry = process.argv.includes('--dry');
const argOf = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const promptVersion = argOf('--prompt') ?? 'v1.1';   // 지시문 PROMPT-<버전>.md
const onlyCards = argOf('--cards')?.split(',') ?? null;
const reuseInputs = argOf('--prompt') !== null;      // 지시문 버전을 지정하면 저장된 입력을 그대로 쓴다(입력을 다시 만들지 않는다)
const runsPrefix = promptVersion === 'v1.1' ? 'runs' : `runs/${promptVersion}`;
const dir = resolve(process.cwd(), 'docs/experiments/wrong-card-layer1-2026-11-19');
const inputsDir = resolve(process.cwd(), 'docs/experiments/reading-error-2026-11-18/inputs');
mkdirSync(resolve(dir, 'inputs'), { recursive: true }); mkdirSync(resolve(dir, runsPrefix), { recursive: true });
const write = (path, value) => writeFileSync(resolve(dir, path), JSON.stringify(value, null, 2) + '\n');

// HAND-CARDS.md의 5장(카드 번호 순). omitted는 첫 응답에 근거가 없는 카드이고, 고른 선지 번호는 HAND-CARDS.md 카드 2(⑤)를 따른다.
const CARDS = [
  { id: 'card1', student: 'S-23', title: '오디오 신호의 디지털 저장과 지각부호화 압축', number: 16 },
  { id: 'card2', student: 'S-07', title: '의식과 인지 과정에 대한 철학적 논의', number: 14, omitted: true, chosenPosition: 5 },
  { id: 'card3', student: 'S-58', title: '경마식 보도와 선거 방송 토론회', number: 6 },
  { id: 'card4', student: 'S-07', title: '플라스틱의 중합 반응과 물리적 성질', number: 8 },
  { id: 'card5', student: 'S-23', title: '오디오 신호의 디지털 저장과 지각부호화 압축', number: 15 },
];

const set = loadDiagnosticSet();
const strategies = loadExaminerStrategies();
const findQuestion = (title, number) => {
  const found = [];
  for (const passage of set.passages) for (const questionId of passage.questionIds) {
    const bundle = loadDiagnosticBundle(questionId);
    if (bundle.source.questionNumber === number && bundle.source.title === title) found.push({ passage, questionId, bundle });
  }
  if (found.length !== 1) throw new Error(`문항을 하나로 정하지 못함: ${title} ${number}번 (${found.length}개)`);
  return found[0];
};
const polarityOf = (stem) => /않은 것|않는 것/u.test(stem) ? 'SELECT_INCORRECT' : 'SELECT_CORRECT';
const SYMBOL = /[㉠-㉿ⓐ-ⓩ]|\([가-힣]\)/gu;

// ---------- 코드가 정하는 것: case ----------
function decideCase({ correct, omitted, stemPolarity }) {
  if (correct) return 'CORRECT_WEAK';   // 이 실험의 정답 카드는 첫 근거 판정이 ERROR인 것뿐이다
  if (stemPolarity === 'SELECT_INCORRECT') return 'WRONG_TRUE_CHOSEN';
  return omitted ? 'WRONG_OMITTED' : 'WRONG_PROVIDED';
}

function buildInput(card) {
  const { passage, questionId, bundle } = findQuestion(card.title, card.number);
  const content = bundle.content;
  const stemPolarity = polarityOf(content.stem);
  const textAt = (position) => content.choices.find(c => c.position === position)?.text;
  const meta = set.items[questionId];
  const itemName = `${card.title} ${card.number}번`;
  let chosen; let studentRationale; let rationaleJudgment; let correct; let chosenTwists; let answerTwists;
  const answerPosition = meta.answerPosition;
  if (card.omitted) {
    const file = JSON.parse(readFileSync(resolve(inputsDir, `${card.student}.json`), 'utf8'));
    if (!file.wrongWithoutRationale.includes(itemName)) throw new Error(`${card.student}의 근거 없는 오답에 ${itemName}이 없음`);
    chosen = { position: card.chosenPosition, text: textAt(card.chosenPosition) }; correct = chosen.position === answerPosition;
    const twistsOf = loadChoiceLinkTwists(passage.choiceLinkPath);
    chosenTwists = twistsOf(card.number, chosen.position).map(({ twistDetail, choiceQuote, evidenceQuote }) => ({ twistDetail, choiceQuote, evidenceQuote }));
  } else {
    const file = JSON.parse(readFileSync(resolve(inputsDir, `${card.student}.json`), 'utf8'));
    const entry = file.evidenceEntries.find(e => e.item === itemName);
    if (!entry) throw new Error(`${card.student}의 evidenceEntries에 ${itemName}이 없음`);
    if (entry.stem !== content.stem || entry.chosen.text !== textAt(entry.chosen.position)) throw new Error(`입력 자료와 진단 콘텐츠의 발문·선지가 다름: ${itemName}`);
    chosen = entry.chosen; studentRationale = entry.studentRationale; correct = entry.correct; rationaleJudgment = entry.rationaleJudgment;
    chosenTwists = entry.chosenTwists; answerTwists = entry.answerTwists;
  }
  const caseName = decideCase({ correct, omitted: card.omitted === true, stemPolarity });
  const answer = { position: answerPosition, text: textAt(answerPosition) };
  // 적절하지 않은 것 고르기는 학생이 놓친 정답 선지의 비틂, 그 밖의 오답은 고른 선지의 비틂을 준다. 정답 카드는 비틂이 없다.
  const twistFields = caseName === 'WRONG_TRUE_CHOSEN' ? { answerTwists } : caseName === 'CORRECT_WEAK' ? {} : { chosenTwists };
  const strategyChoices = strategies.get(questionId) ?? [];
  const strategyPosition = caseName === 'WRONG_TRUE_CHOSEN' ? answer.position : chosen.position;
  const strategy = caseName === 'CORRECT_WEAK' ? null : strategyChoices.find(s => s.position === strategyPosition);
  // 기호 목록: 발문·선지·학생 근거에 나오는 기호의 위치(지문 안 표시된 곳)와 사전의 최소 풀이.
  const gloss = loadSymbolGloss(passage.passageId);
  const scan = [content.stem, chosen.text, answer.text, studentRationale ?? ''].join('\n');
  const symbols = [...new Set(scan.match(SYMBOL) ?? [])].map(symbol => {
    const anchor = content.textAnnotations.find(a => a.marker === symbol);
    return { symbol, ...(anchor ? { location: anchor.location, anchorText: anchor.text } : {}), ...(gloss[symbol] ? { dictionaryGloss: gloss[symbol] } : {}) };
  });
  const rate = (i) => ({ subjects: meta.megastudy.subjects, choiceRate: [meta.megastudy.choicePercents[0][i - 1], meta.megastudy.choicePercents[1][i - 1]] });
  return {
    case: caseName, item: { title: card.title, number: card.number }, stem: content.stem, stemPolarity,
    chosen, answer, ...(studentRationale === undefined ? {} : { studentRationale }), ...(rationaleJudgment === undefined ? {} : { rationaleJudgment }),
    ...twistFields, passage: content.passage, ...(strategy ? { examinerStrategy: strategy.paragraphs.join('\n\n') } : {}),
    symbols, megastudy: { ...rate(chosen.position), correctRate: meta.megastudy.correctRate },
  };
}

// ---------- 코드 검사(PROMPT-v1.1 "코드 검사") ----------
const FORBIDDEN = ['뒤집기', '비틂', '함정 유형', '조건 축소', '범위', '방향', '긍정·부정', '인과 왜곡', '상식 개입'];
const LAYER_SYMBOL_PAREN = /[㉠-㉿ⓐ-ⓩ]\s*\(|\([가-힣]\)\s*\(/u;
/** v1.2 코드 처리: `conclusion`이 "그래서"로 시작하면 코드가 지운다(화면 칸 이름이 "그래서"). 지운 사실은 기록한다. */
const LEADING_SO = /^\s*그래서[\s,，:：]*/u;
function stripLeadingSo(out) {
  if (typeof out?.pair?.conclusion !== 'string' || !LEADING_SO.test(out.pair.conclusion)) return { out, stripped: false };
  return { out: { ...out, pair: { ...out.pair, conclusion: out.pair.conclusion.replace(LEADING_SO, '') } }, stripped: true, before: out.pair.conclusion };
}
function codeChecks(out, input) {
  const checks = []; const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), ...(ok ? {} : { detail }) });
  const passage = input.passage; const noBold = (s) => String(s ?? '').replaceAll('**', '');
  add('pair.source가 지문에 글자 그대로 있다', typeof out.pair?.source === 'string' && passage.includes(out.pair.source), out.pair?.source);
  add('pair.sourceFocus가 pair.source 안에 있다', typeof out.pair?.sourceFocus === 'string' && typeof out.pair?.source === 'string' && out.pair.source.includes(out.pair.sourceFocus), out.pair?.sourceFocus);
  if (input.case === 'WRONG_TRUE_CHOSEN') add('missedAnswer.source가 지문에 글자 그대로 있다', typeof out.missedAnswer?.source === 'string' && passage.includes(out.missedAnswer.source), out.missedAnswer?.source);
  const base = input.studentRationale ?? input.chosen.text;
  add(input.studentRationale === undefined ? 'pair.top(**제외)이 고른 선지에 글자 그대로 있다' : 'pair.top(**제외)이 학생 근거에 글자 그대로 있다', typeof out.pair?.top === 'string' && base.includes(noBold(out.pair.top)), out.pair?.top);
  const bodies = [out.layer1, out.pair?.top, out.pair?.source, out.pair?.conclusion, out.missedAnswer?.text, out.missedAnswer?.source, out.examinerIntent].map(s => String(s ?? ''));
  const hits = FORBIDDEN.filter(w => bodies.some(b => b.includes(w)));
  add('금지어(규칙 4)가 없다', hits.length === 0, hits.join(', '));
  add('1층이 130자 이내다', typeof out.layer1 === 'string' && out.layer1.length <= 130, `${String(out.layer1 ?? '').length}자`);
  const missing = (out.symbolGlosses ?? []).filter(g => !String(out.layer1 ?? '').includes(g.symbol)).map(g => g.symbol);
  add('symbolGlosses의 기호가 모두 1층에 나온다', Array.isArray(out.symbolGlosses) && missing.length === 0, missing.join(', '));
  const layer23 = [out.pair?.top, out.pair?.source, out.pair?.conclusion, out.missedAnswer?.text, out.missedAnswer?.source, out.examinerIntent].map(s => String(s ?? ''));
  add('2·3층에 "기호(" 형태가 없다', !layer23.some(b => LAYER_SYMBOL_PAREN.test(b)), layer23.filter(b => LAYER_SYMBOL_PAREN.test(b)).join(' | '));
  return checks;
}

// ---------- 모델 호출 ----------
const instructions = readFileSync(resolve(dir, `PROMPT-${promptVersion}.md`), 'utf8');
const client = dry ? null : new OpenAI({ maxRetries: 0 });
async function generate(inputText) {
  const started = performance.now();
  const response = await client.responses.create({ model: THOUGHT_DIAGNOSIS_MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: 12000,
    input: [{ role: 'user', content: [{ type: 'input_text', text: inputText }] }] }, { timeout: 180000, maxRetries: 0 });
  if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
  const rawText = response.output_text;
  const raw = rawText.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  let output = null; let parseError = null;
  try { output = JSON.parse(raw); } catch (error) { parseError = String(error.message); }
  return { rawText, output, parseError, metadata: { model: THOUGHT_DIAGNOSIS_MODEL, durationMs: Math.round(performance.now() - started), inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 } };
}

const summary = [];
for (const card of CARDS) {
  if (onlyCards && !onlyCards.includes(card.id)) continue;
  const input = reuseInputs ? JSON.parse(readFileSync(resolve(dir, `inputs/${card.id}.json`), 'utf8')) : buildInput(card);
  if (!reuseInputs) write(`inputs/${card.id}.json`, input);
  console.log(`${card.id} ${card.student} ${card.title} ${card.number}번 → case=${input.case}, 기호 ${input.symbols.map(s => s.symbol).join('') || '없음'}, 전략 ${input.examinerStrategy ? '있음' : '없음'}`);
  if (dry) continue;
  const inputText = JSON.stringify(input, null, 2);
  const attempts = [];
  for (let n = 1; n <= 2; n++) {
    const result = await generate(inputText);
    const post = result.output && promptVersion !== 'v1.1' ? stripLeadingSo(result.output) : { out: result.output, stripped: false };
    const checks = post.out ? codeChecks(post.out, input) : [{ name: 'JSON으로 읽힌다', ok: false, detail: result.parseError }];
    const passed = checks.every(c => c.ok);
    attempts.push({ attempt: n, ...result, ...(post.stripped ? { conclusionStrippedLeadingSo: post.before, output: post.out, rawOutput: result.output } : {}), checks, passed });
    console.log(`  시도 ${n}: 코드 검사 ${passed ? '통과' : '실패 — ' + checks.filter(c => !c.ok).map(c => c.name).join(' / ')}`);
    if (passed) break;
  }
  const final = attempts.at(-1);
  write(`${runsPrefix}/${card.id}.json`, { card, model: THOUGHT_DIAGNOSIS_MODEL, promptVersion, case: input.case, attempts, finalPassed: final.passed, fallbackTo1117: !final.passed });
  summary.push({ id: card.id, attempts: attempts.length, passed: final.passed });
}
if (!dry) console.log(JSON.stringify(summary));
