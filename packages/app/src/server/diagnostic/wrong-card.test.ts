/**
 * 문항 카드 3층 생성 테스트(인계 docs/handoffs/2026-11-20-wrong-card-3-layer-impl.md). 모델은 부르지 않는다:
 * 코드 검사·입력 만들기는 저장된 실험 입력/출력(docs/experiments/wrong-card-layer1-2026-11-19)과 합성 자료로, 컨트롤러 흐름은 가짜 transport로 돌린다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WRONG_CARD_PROMPT_VERSION, loadWrongCardPrompt } from './content.js';
import { DiagnosticController } from './controller.js';
import { buildWrongCardInput, codeChecks, decideCase, readyCardView, stripLeadingSo, type WrongCardInput, type WrongCardOutput, type WrongCardSource } from './wrong-card.js';
import { MemoryStore, diagnosisFake, feedbackFake, judgeFake, omitted, provided, refusedHabitTransport, set, summaryEvaluator, transportFake, wrongChoice, correctChoice, RATIONALE, type Behavior } from './test-support.js';

const EXPERIMENT = resolve(process.cwd(), 'docs/experiments/wrong-card-layer1-2026-11-19');
const readJson = (path: string): any => JSON.parse(readFileSync(resolve(EXPERIMENT, path), 'utf8'));

describe('지시문', () => {
  it('PROMPT-v1.3.md 전문을 그대로 읽고 버전 상수는 v1.3이다', () => {
    expect(WRONG_CARD_PROMPT_VERSION).toBe('v1.3');
    expect(loadWrongCardPrompt()).toBe(readFileSync(resolve(EXPERIMENT, 'PROMPT-v1.3.md'), 'utf8'));
  });
});

// ---------- 코드 검사 ----------

/** card3(WRONG_PROVIDED)의 저장된 v1.2 출력은 검사를 모두 통과한다. */
const input3 = readJson('inputs/card3.json') as WrongCardInput;
const output3 = (): WrongCardOutput => structuredClone(readJson('runs/v1.2/card3.json').attempts.at(-1).output);
const input4 = readJson('inputs/card4.json') as WrongCardInput;
const output4 = (): WrongCardOutput => structuredClone(readJson('runs/v1.2/card4.json').attempts.at(-1).output);
const failed = (out: WrongCardOutput, input: WrongCardInput) => codeChecks(out, input).filter(c => !c.ok).map(c => c.name);

describe('코드 검사(run.mjs codeChecks 이식)', () => {
  it('통과 사례: 저장된 v1.2 출력(근거 쓴 오답, 적절하지 않은 것 오답)', () => {
    expect(failed(output3(), input3)).toEqual([]);
    expect(failed(output4(), input4)).toEqual([]);
  });
  it('pair.source가 지문과 다르면 실패', () => {
    const out = output3(); out.pair.source = `${out.pair.source}가`;
    expect(failed(out, input3)).toContain('pair.source가 지문에 글자 그대로 있다');
  });
  it('sourceFocus가 source 밖이면 실패', () => {
    const out = output3(); out.pair.sourceFocus = '원문에 없는 구절';
    expect(failed(out, input3)).toContain('pair.sourceFocus가 pair.source 안에 있다');
  });
  it('pair.top(**제외)이 학생 근거와 다르면 실패, 근거 없으면 고른 선지와 비교한다', () => {
    const out = output3(); out.pair.top = '학생이 쓰지 않은 말';
    expect(failed(out, input3)).toContain('pair.top(**제외)이 학생 근거에 글자 그대로 있다');
    const { studentRationale: _omit, ...noRationale } = input3;
    const own = output3(); own.pair.top = noRationale.chosen.text.slice(0, 10);
    expect(failed(own, noRationale as WrongCardInput)).not.toContain('pair.top(**제외)이 고른 선지에 글자 그대로 있다');
    own.pair.top = '선지에 없는 말';
    expect(failed(own, noRationale as WrongCardInput)).toContain('pair.top(**제외)이 고른 선지에 글자 그대로 있다');
  });
  it('금지어가 있으면 실패', () => {
    const out = output3(); out.examinerIntent = `${out.examinerIntent} 긍정·부정 뒤집기`;
    expect(failed(out, input3)).toContain('금지어(규칙 4)가 없다');
  });
  it('금지어가 지문·발문·선지에 그대로 나오는 낱말이면 예외(예: "오차 범위"), 그 밖의 금지어는 여전히 실패', () => {
    // card3의 지문에는 "범위"가 이미 있다(예외), "방향"은 지문·발문·선지 어디에도 없다.
    expect(input3.passage).toContain('범위');
    const exempt = output3(); exempt.examinerIntent = `${exempt.examinerIntent} 오차 범위를 줄여 읽었어.`;
    expect(failed(exempt, input3)).not.toContain('금지어(규칙 4)가 없다');
    const out = output3(); out.examinerIntent = `${out.examinerIntent} 반대 방향으로 읽었어.`;
    expect(failed(out, input3)).toContain('금지어(규칙 4)가 없다');
    expect(failed(out, { ...input3, passage: `${input3.passage} 방향` })).not.toContain('금지어(규칙 4)가 없다');
    expect(failed(out, { ...input3, stem: `${input3.stem} 방향` })).not.toContain('금지어(규칙 4)가 없다');
    expect(failed(out, { ...input3, chosen: { ...input3.chosen, text: `${input3.chosen.text} 방향` } })).not.toContain('금지어(규칙 4)가 없다');
    expect(failed(out, { ...input3, answer: { ...input3.answer, text: `${input3.answer.text} 방향` } })).not.toContain('금지어(규칙 4)가 없다');
    out.examinerIntent = `${out.examinerIntent} 긍정·부정 뒤집기`;
    expect(failed(out, { ...input3, passage: `${input3.passage} 방향` })).toContain('금지어(규칙 4)가 없다');   // 예외는 지문 등에 있는 낱말만
  });
  it('근거 없는 오답이면 case와 상관없이 selfCheckOptions가 정확히 3개여야 한다', () => {
    const checkName = '근거 없는 오답이면 selfCheckOptions가 정확히 3개다';
    const { studentRationale: _a, ...omittedProvidedCase } = input3;   // WRONG_OMITTED
    const { studentRationale: _b, ...omittedTrueChosen } = input4;     // WRONG_TRUE_CHOSEN, 근거 없음
    for (const input of [omittedProvidedCase, omittedTrueChosen] as WrongCardInput[]) {
      const out = input === omittedTrueChosen ? output4() : output3();
      out.pair.top = input.chosen.text;   // pair.top 검사는 이 테스트의 관심사가 아니다
      expect(failed(out, input)).toContain(checkName);                                   // 없음
      out.selfCheckOptions = ['가', '나']; expect(failed(out, input)).toContain(checkName);        // 2개
      out.selfCheckOptions = ['가', '나', '다', '라']; expect(failed(out, input)).toContain(checkName);   // 4개
      out.selfCheckOptions = ['가', '나', '다']; expect(failed(out, input)).not.toContain(checkName);    // 3개
    }
    expect(failed(output3(), input3)).not.toContain(checkName);   // 근거 쓴 오답은 selfCheckOptions가 없어도 된다
    expect(failed(output4(), input4)).not.toContain(checkName);
  });
  it('1층이 131자면 실패, 130자는 통과', () => {
    const out = output3(); out.symbolGlosses = [];
    out.layer1 = 'ㄱ'.repeat(131); expect(failed(out, input3)).toContain('1층이 130자 이내다');
    out.layer1 = 'ㄱ'.repeat(130); expect(failed(out, input3)).not.toContain('1층이 130자 이내다');
  });
  it('1층에 없는 기호 풀이가 있으면 실패', () => {
    const out = output3(); out.symbolGlosses = [{ symbol: '㉣', gloss: '없는 기호' }];
    expect(failed(out, input3)).toContain('symbolGlosses의 기호가 모두 1층에 나온다');
  });
  it('2·3층에 "기호(" 형태가 있으면 실패', () => {
    const out = output3(); out.examinerIntent = `${out.examinerIntent} ⓑ(소수 의견)`;
    expect(failed(out, input3)).toContain('2·3층에 "기호(" 형태가 없다');
  });
  it('WRONG_TRUE_CHOSEN의 missedAnswer.source가 지문과 다르거나 없으면 실패', () => {
    const out = output4(); out.missedAnswer = { text: out.missedAnswer!.text, source: '지문에 없는 문장' };
    expect(failed(out, input4)).toContain('missedAnswer.source가 지문에 글자 그대로 있다');
    delete out.missedAnswer;
    expect(failed(out, input4)).toContain('missedAnswer.source가 지문에 글자 그대로 있다');
  });
  it('conclusion 앞 "그래서"는 지우고 지운 사실을 돌려준다(없으면 그대로)', () => {
    const out = output3(); const original = out.pair.conclusion;
    out.pair.conclusion = `그래서, ${original}`;
    expect(stripLeadingSo(out)).toMatchObject({ stripped: true, before: `그래서, ${original}`, out: { pair: { conclusion: original } } });
    expect(stripLeadingSo(output3())).toMatchObject({ stripped: false });
  });
});

// ---------- 입력 만들기 ----------

const base = (over: Partial<WrongCardSource> = {}): WrongCardSource => ({
  title: '지문', number: 3, stem: '발문 ㉠', scenario: '', passage: '지문 글 ㉠ 표시',
  textAnnotations: [{ marker: '㉠', location: 'PASSAGE', text: '지문 글' }], stemPolarity: 'SELECT_CORRECT',
  chosen: { position: 2, text: '고른 선지' }, answer: { position: 4, text: '정답 선지' }, correct: false, firstRationale: '첫 응답 근거', rationaleJudgment: 'ERROR',
  chosenTwists: [{ twistDetail: '고른 선지 비틂', choiceQuote: '구절', evidenceQuote: '' }], answerTwists: [{ twistDetail: '정답 선지 비틂', choiceQuote: '구절2', evidenceQuote: '원문' }],
  strategyParagraphs: ['전략 1', '전략 2'], symbolGloss: { '㉠': '풀이' },
  megastudy: { subjects: ['화법과작문', '언어와매체'], choicePercents: [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]], correctRate: [40, 50] }, ...over });

describe('입력 만들기', () => {
  it('case 판정 4종: 정답 → CORRECT_WEAK, 적절하지 않은 것 → WRONG_TRUE_CHOSEN, 근거 있음 → WRONG_PROVIDED, 없음 → WRONG_OMITTED', () => {
    expect(decideCase({ correct: true, omitted: false, stemPolarity: 'SELECT_CORRECT' })).toBe('CORRECT_WEAK');
    expect(decideCase({ correct: false, omitted: false, stemPolarity: 'SELECT_INCORRECT' })).toBe('WRONG_TRUE_CHOSEN');
    expect(decideCase({ correct: false, omitted: true, stemPolarity: 'SELECT_INCORRECT' })).toBe('WRONG_TRUE_CHOSEN');
    expect(decideCase({ correct: false, omitted: false, stemPolarity: 'SELECT_CORRECT' })).toBe('WRONG_PROVIDED');
    expect(decideCase({ correct: false, omitted: true, stemPolarity: 'SELECT_CORRECT' })).toBe('WRONG_OMITTED');
  });
  it('WRONG_PROVIDED: 첫 응답 근거와 고른 선지 비틂(evidenceQuote 빈 값은 null), 정답 비틂·판정 없음, 전략·기호·선택률', () => {
    const input = buildWrongCardInput(base());
    expect(input).toMatchObject({ case: 'WRONG_PROVIDED', item: { title: '지문', number: 3 }, studentRationale: '첫 응답 근거', examinerStrategy: '전략 1\n\n전략 2',
      chosenTwists: [{ twistDetail: '고른 선지 비틂', choiceQuote: '구절', evidenceQuote: null }],
      symbols: [{ symbol: '㉠', location: 'PASSAGE', anchorText: '지문 글', dictionaryGloss: '풀이' }], megastudy: { choiceRate: [2, 7], correctRate: [40, 50] } });
    expect(input).not.toHaveProperty('answerTwists'); expect(input).not.toHaveProperty('rationaleJudgment');
  });
  it('WRONG_OMITTED는 studentRationale이 없다', () => {
    const input = buildWrongCardInput(base({ firstRationale: null }));
    expect(input.case).toBe('WRONG_OMITTED'); expect(input).not.toHaveProperty('studentRationale');
    expect(input).toHaveProperty('chosenTwists');
  });
  it('WRONG_TRUE_CHOSEN은 answerTwists(정답 선지 비틂)와 정답 선지의 전략 글을 쓴다', () => {
    const input = buildWrongCardInput(base({ stemPolarity: 'SELECT_INCORRECT', strategyParagraphs: ['정답 선지 전략'] }));
    expect(input.case).toBe('WRONG_TRUE_CHOSEN');
    expect(input).toMatchObject({ answerTwists: [{ twistDetail: '정답 선지 비틂', evidenceQuote: '원문' }], examinerStrategy: '정답 선지 전략' });
    expect(input).not.toHaveProperty('chosenTwists');
  });
  it('CORRECT_WEAK는 rationaleJudgment가 있고 비틂·출제자 전략이 없다', () => {
    const input = buildWrongCardInput(base({ correct: true }));
    expect(input.case).toBe('CORRECT_WEAK'); expect(input.rationaleJudgment).toBe('ERROR');
    expect(input).not.toHaveProperty('chosenTwists'); expect(input).not.toHaveProperty('answerTwists'); expect(input).not.toHaveProperty('examinerStrategy');
  });
  it('저장된 실험 입력과 같은 모양이다(키 순서·구성)', () => {
    const stored = readJson('inputs/card3.json');
    expect(Object.keys(buildWrongCardInput(base())).filter(k => k !== 'examinerStrategy')).toEqual(Object.keys(stored).filter(k => k !== 'examinerStrategy'));
  });
});

describe('응답 모양', () => {
  it('readyCardView는 matchesTrap을 넣지 않는다', () => {
    const view = readyCardView({ ...output3(), matchesTrap: true });
    expect(view.status).toBe('ready'); expect(JSON.stringify(view)).not.toContain('matchesTrap');
  });
});

// ---------- 컨트롤러 흐름(가짜 transport) ----------

const [, HORSE, PLASTIC] = set.passages as [typeof set.passages[number], typeof set.passages[number], typeof set.passages[number]];
const idOf = (passage: typeof HORSE, number: number) => passage.questionIds.find(id => set.items[id]!.questionNumber === number)!;
async function settle(c: DiagnosticController) { for (let i = 0; i < 4; i++) { await c.idle(); await new Promise(resolve => setTimeout(resolve, 5)); } await c.idle(); }
const inputOf = (request: any): WrongCardInput => JSON.parse(String(request.input[0].content[0].text));

/** 입력에 맞는 유효한 카드 출력(검사를 통과한다). conclusion은 "그래서"로 시작한다. */
const validOutput = (input: WrongCardInput): any => {
  const source = input.passage.slice(0, 40);
  return { layer1: '1층 문장이야.', symbolGlosses: [], matchesTrap: true,
    pair: { top: input.studentRationale ?? input.chosen.text.slice(0, 10), source, sourceFocus: source.slice(0, 5), conclusion: '그래서 결론이야.' },
    ...(input.case === 'WRONG_TRUE_CHOSEN' ? { missedAnswer: { text: '놓친 선지', source } } : {}), examinerIntent: '출제자 의도야.',
    ...(input.case !== 'CORRECT_WEAK' && input.studentRationale === undefined ? { selfCheckOptions: ['하나', '둘', '셋'] } : {}) };
};
const cardFake = (respond: (input: WrongCardInput, index: number) => unknown = validOutput, init: Parameters<typeof transportFake>[1] = {}) =>
  transportFake((request, index) => respond(inputOf(request), index), init);

interface Answer { question: string; answer: { choiceId: string } & Record<string, unknown>; behavior?: Behavior }
async function world(answers: Answer[], card = cardFake(), diagnosis = diagnosisFake()) {
  const store = new MemoryStore();
  // 판정 동작: 지정이 없으면 오답은 ERROR, 정답은 SUPPORTED(근거가 충분해 카드 대상이 아니다).
  const behaviors = Object.fromEntries(answers.map(a => [a.question, a.behavior ?? (a.answer.choiceId === correctChoice(a.question) ? 'SUPPORTED' : 'ERROR')] as const));
  const fb = feedbackFake({ behavior: q => behaviors[q] ?? 'SUPPORTED' });
  const make = (transport = card.transport) => new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-wrong-card-unused'),
    diagnosisTransport: diagnosis.transport, judgeTransport: judgeFake().transport, readingHabitTransport: refusedHabitTransport(), wrongCardTransport: transport });
  const c = make(); const id = c.create().participantId;
  for (const passage of [HORSE, PLASTIC]) {
    const mine = answers.filter(a => passage.questionIds.includes(a.question));
    if (mine.length === 0) continue;
    c.start(id, passage.passageId, { summary: false });
    // 지문의 모든 문항에 답해야 한다. 다루지 않는 문항은 근거 있는 정답(SUPPORTED)으로 둔다.
    for (const q of passage.questionIds) {
      const a = answers.find(x => x.question === q);
      c.confirmItem(id, q, a ? a.answer : provided(correctChoice(q)));
    }
    c.answersDone(id, passage.passageId);
  }
  await settle(c);
  return { c, store, card, id, make, fb: behaviors };
}
const cardOf = (c: DiagnosticController, id: string, question: string): any => c.result(id).items.find(i => i.questionId === question)!.card;

describe('컨트롤러 흐름: 결과의 items[].card', () => {
  const H6 = idOf(HORSE, 6); const H5 = idOf(HORSE, 5); const P8 = idOf(PLASTIC, 8);

  it('성공 → pending 뒤 ready, 호출 1회, 응답에 matchesTrap 없음·"그래서" 제거, 저장본에는 matchesTrap이 있다', async () => {
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }]);
    expect(cardOf(w.c, w.id, H6)).toEqual({ status: 'pending' });
    await settle(w.c);
    expect(w.card.requests).toHaveLength(1);
    expect(w.card.requests[0].instructions).toBe(loadWrongCardPrompt());
    const view = cardOf(w.c, w.id, H6);
    expect(view).toMatchObject({ status: 'ready', layer1: '1층 문장이야.', pair: { conclusion: '결론이야.' }, examinerIntent: '출제자 의도야.' });
    expect(JSON.stringify(w.c.result(w.id))).not.toContain('matchesTrap');
    const stored = w.store.load(w.id)!.items[H6]!.wrongCard!;
    expect(stored).toMatchObject({ status: 'ready', attempts: 1, promptVersion: 'v1.3', output: { matchesTrap: true } });
    const done = w.store.events.find(e => e.type === 'WRONG_CARD_DONE') as any;
    expect(done).toMatchObject({ questionId: H6, case: 'WRONG_PROVIDED', status: 'ready', promptVersion: 'v1.3', attempts: [{ attempt: 1, passed: true, failedChecks: [], conclusionStrippedLeadingSo: '그래서 결론이야.', metadata: { model: 'gpt-6.1-sol' } }] });
  });

  it('1회 검사 실패 후 재생성 성공 → ready, 호출 2회(실패 항목이 사건에 남는다)', async () => {
    const card = cardFake((input, index) => index === 0 ? { ...validOutput(input), layer1: 'ㄱ'.repeat(131) } : validOutput(input));
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }], card);
    w.c.result(w.id); await settle(w.c);
    expect(card.requests).toHaveLength(2);
    expect(cardOf(w.c, w.id, H6).status).toBe('ready');
    const done = w.store.events.find(e => e.type === 'WRONG_CARD_DONE') as any;
    expect(done.attempts.map((a: any) => a.passed)).toEqual([false, true]);
    expect(done.attempts[0].failedChecks).toEqual([{ name: '1층이 130자 이내다', ok: false, detail: '131자' }]);
  });

  it('JSON이 아닌 응답도 1회 다시 생성한다', async () => {
    const store = transportFake((request, index) => index === 0 ? 'JSON 객체 아님' : validOutput(inputOf(request)));
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }], store);
    w.c.result(w.id); await settle(w.c);
    expect(store.requests).toHaveLength(2); expect(cardOf(w.c, w.id, H6).status).toBe('ready');
  });

  it('연속 실패 → fallback, 호출 2회, 응답에 모델 출력 없음(저장에도 출력 없음, 원출력은 사건에만)', async () => {
    const card = cardFake(input => ({ ...validOutput(input), pair: { ...validOutput(input).pair, source: '지문에 없는 문장' } }));
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }], card);
    w.c.result(w.id); await settle(w.c);
    expect(card.requests).toHaveLength(2);
    expect(cardOf(w.c, w.id, H6)).toEqual({ status: 'fallback' });
    expect(w.store.load(w.id)!.items[H6]!.wrongCard).toMatchObject({ status: 'fallback', attempts: 2, output: null });
    const done = w.store.events.find(e => e.type === 'WRONG_CARD_DONE') as any;
    expect(done).toMatchObject({ status: 'fallback', attempts: [{ passed: false, rawOutput: { layer1: '1층 문장이야.' } }, { passed: false }] });
    await settle(w.c); expect(card.requests).toHaveLength(2);   // 같은 입력으로는 다시 부르지 않는다
  });

  it('transport 오류도 1회 다시 생성하고, 계속 실패하면 fallback', async () => {
    const card = cardFake(validOutput, { fail: () => true });
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }], card);
    w.c.result(w.id); await settle(w.c);
    expect(card.requests).toHaveLength(2); expect(cardOf(w.c, w.id, H6)).toEqual({ status: 'fallback' });
  });

  it('같은 입력으로 result()를 여러 번, 새 컨트롤러로 이어서 불러도 재호출이 없다', async () => {
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }]);
    w.c.result(w.id); w.c.result(w.id); await settle(w.c); w.c.result(w.id); await settle(w.c);
    expect(w.card.requests).toHaveLength(1); expect(w.store.count('WRONG_CARD_DONE')).toBe(1);
    const other = cardFake(); const second = w.make(other.transport);
    expect(cardOf(second, w.id, H6).status).toBe('ready');
    await settle(second); expect(other.requests).toHaveLength(0);
  });

  it('옛 참가자 파일(wrongCard 없음)도 읽히고, 입력이 모이면 새로 시작한다', async () => {
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }]);
    w.c.result(w.id); await settle(w.c);
    const stored = JSON.parse(w.store.files.get(w.id)!); expect(stored.items[H6].wrongCard.status).toBe('ready');
    delete stored.items[H6].wrongCard; w.store.files.set(w.id, JSON.stringify(stored));
    const other = cardFake(); const second = w.make(other.transport);
    expect(cardOf(second, w.id, H6)).toEqual({ status: 'pending' });
    await settle(second); expect(other.requests).toHaveLength(1);
    expect(cardOf(second, w.id, H6).status).toBe('ready');
  });

  it('서버를 다시 켠 뒤 pending으로 저장된 카드는 비우고 다시 시작한다', async () => {
    const gate = new Promise<void>(() => {});
    const w = await world([{ question: H6, answer: provided(wrongChoice(H6)) }], cardFake(validOutput, { delay: () => gate }));
    w.c.result(w.id);
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(JSON.parse(w.store.files.get(w.id)!).items[H6].wrongCard.status).toBe('pending');
    const other = cardFake(); const second = w.make(other.transport);
    expect(cardOf(second, w.id, H6)).toEqual({ status: 'pending' });
    await settle(second); expect(other.requests).toHaveLength(1);
    expect(cardOf(second, w.id, H6).status).toBe('ready');
  });

  it('case 4종이 서버 입력으로 간다: 근거 있음/없음/적절하지 않은 것/정답, 근거는 첫 응답만', async () => {
    const H4 = idOf(HORSE, 4); const H7 = idOf(HORSE, 7);
    const w = await world([
      { question: H6, answer: provided(wrongChoice(H6)) },
      { question: H4, answer: omitted(wrongChoice(H4)) },
      { question: P8, answer: provided(wrongChoice(P8)) },
      { question: H7, answer: provided(correctChoice(H7)), behavior: 'INSUFFICIENT' },
    ]);
    w.c.result(w.id); await settle(w.c);
    const inputs = new Map(w.card.requests.map(r => { const input = inputOf(r); return [`${input.item.number}`, input] as const; }));
    expect(w.card.requests).toHaveLength(4);
    const n = (q: string) => String(set.items[q]!.questionNumber);
    expect(inputs.get(n(H6))).toMatchObject({ case: 'WRONG_PROVIDED', studentRationale: RATIONALE }); expect(inputs.get(n(H6))).toHaveProperty('chosenTwists');
    expect(inputs.get(n(H4))!.case).toBe('WRONG_OMITTED'); expect(inputs.get(n(H4))).not.toHaveProperty('studentRationale');
    expect(inputs.get(n(P8))).toMatchObject({ case: 'WRONG_TRUE_CHOSEN', stemPolarity: 'SELECT_INCORRECT' }); expect(inputs.get(n(P8))).toHaveProperty('answerTwists'); expect(inputs.get(n(P8))).not.toHaveProperty('chosenTwists');
    expect(inputs.get(n(H7))).toMatchObject({ case: 'CORRECT_WEAK', rationaleJudgment: 'INSUFFICIENT' });
    expect(inputs.get(n(H7))).not.toHaveProperty('chosenTwists'); expect(inputs.get(n(H7))).not.toHaveProperty('examinerStrategy');
    // 응답: 근거 없는 오답은 생성된 자기 점검 문구, 적절하지 않은 것 오답은 missedAnswer
    expect(cardOf(w.c, w.id, H4).selfCheckOptions).toEqual(['하나', '둘', '셋']);
    expect(cardOf(w.c, w.id, P8).missedAnswer).toMatchObject({ text: '놓친 선지' });
    expect(cardOf(w.c, w.id, H6)).not.toHaveProperty('selfCheckOptions');
  });

  it('문항 검토(reviewFlag)·경계 문항, 근거가 충분한 정답, 근거 없는 정답은 대상이 아니다(호출 없음, none)', async () => {
    const H7 = idOf(HORSE, 7);
    const w = await world([
      { question: H6, answer: provided(wrongChoice(H6)), behavior: 'SUPPORTED' },   // 오답 + SUPPORTED + 일치 → 문항 검토
      { question: H7, answer: provided(wrongChoice(H7)), behavior: 'BOUNDARY' },
      { question: H5, answer: omitted(correctChoice(H5)) },
    ]);
    w.c.result(w.id); await settle(w.c);
    expect(w.card.requests).toHaveLength(0);
    for (const q of [H6, H7, H5]) expect(cardOf(w.c, w.id, q)).toEqual({ status: 'none' });
    expect(cardOf(w.c, w.id, HORSE.questionIds.find(q => ![H5, H6, H7].includes(q))!)).toEqual({ status: 'none' });   // 근거가 SUPPORTED인 정답
  });

  it('첫 판정·사고 진단이 끝나기 전에는 시작하지 않고 pending이다', async () => {
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    const diagnosis = diagnosisFake(); diagnosis.delay = () => gate;
    const store = new MemoryStore(); const card = cardFake();
    const c = new DiagnosticController({ store, feedbackEvaluator: feedbackFake({ behavior: () => 'ERROR' }).evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-wrong-card-unused'),
      diagnosisTransport: diagnosis.transport, judgeTransport: judgeFake().transport, readingHabitTransport: refusedHabitTransport(), wrongCardTransport: card.transport });
    const id = c.create().participantId;
    c.start(id, HORSE.passageId, { summary: false });
    for (const q of HORSE.questionIds) c.confirmItem(id, q, provided(wrongChoice(q)));
    c.answersDone(id, HORSE.passageId);
    for (let i = 0; i < 3; i++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(cardOf(c, id, H6)).toEqual({ status: 'pending' });
    expect(card.requests).toHaveLength(0);
    release(); await settle(c);
    c.result(id); await settle(c);
    expect(card.requests).toHaveLength(HORSE.questionIds.length);
  });
});
