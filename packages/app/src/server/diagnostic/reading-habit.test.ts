/**
 * 문장 읽기 습관(맨 위 요약) 테스트. 모델은 부르지 않는다: 저장된 실험 출력(runs/)과 입력 픽스처(inputs-filtered/)로 코드 검사만 재생하고,
 * 컨트롤러 흐름은 가짜 transport로 돌린다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { READING_HABIT_PROMPT_VERSION, loadDiagnosticBundle, loadReadingHabitPrompts } from './content.js';
import { DiagnosticController } from './controller.js';
import {
  HabitGenerationSchema, HabitReviewSchema, checkHabit, type HabitInput, type HabitRef,
} from './reading-habit.js';
import { MemoryStore, diagnosisFake, feedbackFake, habitFake, judgeFake, provided, refusedHabitTransport, set, summaryEvaluator, transportFake, wrongChoice, correctChoice, type Behavior } from './test-support.js';

const EXPERIMENT = resolve(process.cwd(), 'docs/experiments/reading-error-2026-11-18');
const readJson = (path: string): any => JSON.parse(readFileSync(resolve(EXPERIMENT, path), 'utf8'));

// ---------- 지시문 ----------

describe('지시문', () => {
  it('PROMPT-v2.4.1.md를 생성·검토로 나눈다', () => {
    const { generation, review } = loadReadingHabitPrompts();
    expect(READING_HABIT_PROMPT_VERSION).toBe('v2.4.1');
    expect(generation).toContain('(생성)'); expect(review).toContain('(검토)');
    expect(generation).not.toContain('(검토)');
  });
});

// ---------- 코드 검사 재생(저장된 출력, 모델 호출 없음) ----------

const refs = new Map<string, HabitRef>();
for (const passage of set.passages) for (const questionId of passage.questionIds) {
  const source = loadDiagnosticBundle(questionId).source;
  refs.set(`${source.title} ${source.questionNumber}번`, { questionId, passageId: passage.passageId, questionNumber: source.questionNumber });
}
// 보이는 경우와 REVIEW_FAIL은 v2.4 실행 출력(S-58·S-23·S-66 ×3). NONE·S-12는 v2.4를 돌리지 않아 v2.3 출력을 쓴다.
const replay = (student: string, run: number, mutate?: (generation: any) => void, version = 'v2.4') => {
  const input = readJson(`inputs-filtered/${student}-${version}.json`) as HabitInput;
  const generation = readJson(`runs/${student}-${version}-r${run}.gen.json`).output; mutate?.(generation);
  const review = readJson(`runs/${student}-${version}-r${run}.review.json`).output;
  return checkHabit(input, refs, HabitGenerationSchema.parse(generation), HabitReviewSchema.parse(review));
};

describe('보여 주기 전 코드 검사: 저장된 실험 출력 재생(인계 4절)', () => {
  it.each([['S-58', 1], ['S-58', 3], ['S-66', 1], ['S-66', 2], ['S-66', 3], ['S-23', 1], ['S-23', 3]] as const)('%s r%i → 보임', (student, run) => {
    const { shown, hiddenReason } = replay(student, run);
    expect(hiddenReason).toBeNull(); expect(shown).not.toBeNull();
    // 응답에 내부용 값이 없다
    expect(Object.keys(shown!)).toEqual(['headline', 'featured', 'otherCases', 'secondary', 'nextTime']);
    // featured.changed가 화면 응답까지 그대로 넘어간다
    expect(shown!.featured.changed).toBe(readJson(`runs/${student}-v2.4-r${run}.gen.json`).output.featured.changed);
  });
  it.each([['S-23', 2], ['S-58', 2]] as const)('%s r%i → 숨김(REVIEW_FAIL)', (student, run) => {
    expect(replay(student, run)).toEqual({ shown: null, hiddenReason: 'REVIEW_FAIL' });
  });
  it.each([['S-07', 1], ['S-07', 2], ['S-07', 3], ['S-31', 1], ['S-31', 2], ['S-31', 3]] as const)('%s r%i → 숨김(NONE, v2.3 출력)', (student, run) => {
    expect(replay(student, run, undefined, 'v2.3')).toEqual({ shown: null, hiddenReason: 'NONE' });
  });
  it('S-12는 거른 대상이 2개 미만이라 호출 자체가 없다', () => {
    expect(readJson('inputs-filtered/S-12-v2.3.json').evidenceEntries.length).toBeLessThan(2);
    expect(existsSync(resolve(EXPERIMENT, 'runs/S-12-v2.3.none.json'))).toBe(true);
  });
});

describe('보여 주기 전 코드 검사: 한 가지씩 깨뜨리기', () => {
  it('학생 인용을 한 글자 바꾸면 CHECK_4', () => {
    expect(replay('S-58', 1, g => { g.featured.studentQuote = `${g.featured.studentQuote}가`; }).hiddenReason).toBe('CHECK_4');
  });
  it('인용 앞뒤 공백은 정리하고 비교한다', () => {
    expect(replay('S-58', 1, g => { g.featured.studentQuote = `  ${g.featured.studentQuote}  `; }).hiddenReason).toBeNull();
  });
  it('문장이 선지·지문·보기 어디에도 없으면 CHECK_5', () => {
    expect(replay('S-58', 1, g => { g.otherCases[0].sentence = '입력 어디에도 없는 문장이다'; }).hiddenReason).toBe('CHECK_5');
  });
  it('입력에 없는 문항이면 CHECK_3, 사례가 한 문항뿐이어도 CHECK_3', () => {
    expect(replay('S-58', 1, g => { g.featured.item = '없는 지문 1번'; }).hiddenReason).toBe('CHECK_3');
    expect(replay('S-58', 1, g => { g.otherCases = []; }).hiddenReason).toBe('CHECK_3');
  });
  it('strength가 사례 수와 다르면 CHECK_6', () => {
    const generation = readJson('runs/S-58-v2.4-r1.gen.json').output;
    const distinct = new Set([generation.featured.item, ...generation.otherCases.map((c: any) => c.item)]).size;
    expect(replay('S-58', 1, g => { g.strength = distinct >= 3 ? 'TWO' : 'THREE_PLUS'; }).hiddenReason).toBe('CHECK_6');
  });
  it('둘째 습관의 문항이 입력에 없으면 secondary만 버리고 첫째 습관은 보인다', () => {
    const found = replay('S-58', 1, g => { g.secondary = { line: '그리고 …', items: ['없는 지문 1번', '없는 지문 2번'] }; });
    expect(found.hiddenReason).toBeNull(); expect(found.shown!.secondary).toBeNull();
  });
});

// ---------- 컨트롤러 흐름(가짜 transport) ----------

const [COG, HORSE, PLASTIC] = set.passages as [typeof set.passages[number], typeof set.passages[number], typeof set.passages[number]];
const questionNumberOf = (questionId: string) => set.items[questionId]!.questionNumber;
const idOf = (passage: typeof COG, number: number) => passage.questionIds.find(id => questionNumberOf(id) === number)!;

interface World { c: DiagnosticController; store: MemoryStore; habit: ReturnType<typeof habitFake>; id: string }
/** 문항별 사고 진단 오류 태그를 정해 둔 가짜 사고 진단 transport(단계는 태그와 무관하게 S5_JUDGE로 둔다). */
const diagnosisBy = (tagsByQuestion: Record<string, string[]>) => transportFake(request => {
  const input = JSON.parse(request.input[0].content[0].text); const tags = tagsByQuestion[input.source.questionId] ?? [];
  return { caseId: input.student.caseId, outcomeType: 'ERROR', steps: { S1_STEM: 'PASS', S2_CHOICE: 'PASS', S3_LOCATE: 'FAIL', S4_INTERPRET: 'NOT_OBSERVED', S5_JUDGE: 'NOT_OBSERVED' },
    firstFailedStep: 'S3_LOCATE', errors: tags.map(tag => ({ tag, step: 'S5_JUDGE', studentQuote: '인용' })), note: '메모', unjudgeableReason: null, guessed: false };
});
async function settle(c: DiagnosticController) { for (let i = 0; i < 4; i++) { await c.idle(); await new Promise(resolve => setTimeout(resolve, 5)); } await c.idle(); }
async function world(tags: Record<string, string[]>, behaviors: Record<string, Behavior>, habitInit: Parameters<typeof habitFake>[0] = {}): Promise<World> {
  const store = new MemoryStore(); const habit = habitFake(habitInit);
  const fb = feedbackFake({ behavior: q => behaviors[q] ?? (q in tags ? 'ERROR' : 'SUPPORTED') });
  const c = new DiagnosticController({ store, feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-reading-habit-unused'),
    diagnosisTransport: diagnosisBy(tags).transport, judgeTransport: judgeFake().transport, readingHabitTransport: habit.transport, wrongCardTransport: refusedHabitTransport() });
  const id = c.create().participantId;
  // 모든 문항에 근거를 쓰고: 다룰 문항(tags에 있는 것)은 오답, 나머지는 정답(근거가 SUPPORTED이면 사고 진단 대상이 아님).
  for (const passage of [HORSE, PLASTIC]) {
    c.start(id, passage.passageId, { summary: false });
    for (const q of passage.questionIds) c.confirmItem(id, q, provided(q in tags || behaviors[q] === 'BOUNDARY' ? wrongChoice(q) : correctChoice(q)));
    c.answersDone(id, passage.passageId);
  }
  await settle(c);
  return { c, store, habit, id };
}
const inputOf = (request: any): any => JSON.parse(String(request.input[0].content[0].text));

describe('입력 만들기와 호출(가짜 transport)', () => {
  const H6 = idOf(HORSE, 6); const H5 = idOf(HORSE, 5); const P10 = idOf(PLASTIC, 10); const P9 = idOf(PLASTIC, 9);
  const tags = { [H6]: ['CONDITION'], [H5]: ['OUTSIDE_KNOWLEDGE', 'ATTRIBUTION'], [P10]: ['DIRECTION'], [P9]: ['MULTI_STEP'] };

  it('(a)~(d) 거르기는 태그만 보고 단계는 안 본다, 상식·입장 착각만 있는 문항은 제외, 문항 검토 문항은 뺀다, 기호 풀이가 붙는다', async () => {
    const w = await world({ ...tags, [idOf(HORSE, 7)]: ['MAPPING'] }, { [idOf(HORSE, 7)]: 'BOUNDARY' });
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'pending' });   // 이 호출이 작업을 시작한다
    await settle(w.c);
    const requests = w.habit.requests;
    expect(requests).toHaveLength(2);   // 생성 + 검토
    const input = inputOf(requests[0]);
    expect(Object.keys(input)).not.toContain('student');
    const kept = input.evidenceEntries.map((e: any) => e.item);
    expect(kept).toEqual(expect.arrayContaining(['경마식 보도와 선거 방송 토론회 6번', '플라스틱의 중합 반응과 물리적 성질 10번']));
    expect(kept).toHaveLength(2);   // (a) 단계가 S5_JUDGE여도 남는다
    expect(input.excludedEntries.map((e: any) => e.item).sort()).toEqual(['경마식 보도와 선거 방송 토론회 5번', '플라스틱의 중합 반응과 물리적 성질 9번'].sort());   // (b)
    expect(input.excludedEntries.find((e: any) => e.item.endsWith('5번')).tags).toEqual(['OUTSIDE_KNOWLEDGE', 'ATTRIBUTION']);
    expect(JSON.stringify(input)).not.toContain('토론회 7번');   // (c) 문항 검토 문항은 어디에도 없다
    const plastic10 = input.evidenceEntries.find((e: any) => e.item.endsWith('10번'));
    expect(plastic10.symbolGloss).toMatchObject({ '㉮': expect.stringContaining('가지'), '㉯': expect.stringContaining('직선') });   // (d)
    expect(Object.keys(plastic10.symbolGloss).sort()).toEqual(['㉮', '㉯']);
    expect(plastic10).toMatchObject({ correct: false, stemPolarity: 'SELECT_CORRECT', chosen: { position: expect.any(Number) }, answer: { position: expect.any(Number) } });
    expect(plastic10.scenario).toContain('폴리에틸렌');
    expect(Object.keys(input.passages).sort()).toEqual(['경마식 보도와 선거 방송 토론회', '플라스틱의 중합 반응과 물리적 성질']);
    expect(requests[0].instructions).toContain('(생성)'); expect(requests[1].instructions).toContain('(검토)');
    expect(requests[1].input[0].content[0].text).toContain('## 생성 결과');
  });

  it('(e) 거른 대상이 1개면 호출 0회로 none', async () => {
    const w = await world({ [H6]: ['CONDITION'], [P10]: ['MULTI_STEP'] }, {});
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'none' });
    await settle(w.c);
    expect(w.habit.requests).toHaveLength(0);
  });

  it('사고 진단이 아직 진행 중이면 pending이고 시작하지 않는다', async () => {
    const store = new MemoryStore(); const habit = habitFake(); let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const diagnosis = diagnosisBy(tags); diagnosis.delay = () => gate;
    const c = new DiagnosticController({ store, feedbackEvaluator: feedbackFake({ behavior: () => 'ERROR' }).evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-reading-habit-unused'),
      diagnosisTransport: diagnosis.transport, judgeTransport: judgeFake().transport, readingHabitTransport: habit.transport, wrongCardTransport: refusedHabitTransport() });
    const id = c.create().participantId;
    c.start(id, HORSE.passageId, { summary: false });
    for (const q of HORSE.questionIds) c.confirmItem(id, q, provided(wrongChoice(q)));
    c.answersDone(id, HORSE.passageId);
    for (let i = 0; i < 3; i++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(c.result(id).readingHabit).toEqual({ status: 'pending' });
    expect(habit.requests).toHaveLength(0);
    release(); await settle(c);
  });

  it('같은 입력으로 result()를 여러 번 불러도 호출은 한 번(생성 1 + 검토 1)', async () => {
    const w = await world(tags, {});
    w.c.result(w.id); w.c.result(w.id); await settle(w.c); w.c.result(w.id); w.c.result(w.id); await settle(w.c);
    expect(w.habit.requests).toHaveLength(2);
    expect(w.store.count('READING_HABIT_DONE')).toBe(1);
  });

  it('숨긴 경우도 원출력을 사건에 남기고, 응답은 none이다', async () => {
    const w = await world(tags, {});
    w.c.result(w.id); await settle(w.c);
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'none' });
    const done = w.store.events.find(e => e.type === 'READING_HABIT_DONE') as any;
    expect(done).toMatchObject({ promptVersion: 'v2.4.1', hiddenReason: 'NONE', shown: null, generation: { result: 'NONE' }, review: { verdict: 'PASS' }, inputHash: expect.any(String) });
    expect(done.metadata).toMatchObject({ generation: { model: 'gpt-6.1-sol' }, review: { model: 'gpt-6.1-sol' } });
    expect(w.store.load(w.id)!.readingHabit).toMatchObject({ status: 'READY', hiddenReason: 'NONE', shown: null });
  });

  it('보임: 검사를 통과하면 ready 응답 모양이고 내부용 값은 없다', async () => {
    const probe = await world(tags, {});
    probe.c.result(probe.id); await settle(probe.c);
    const input = inputOf(probe.habit.requests[0]);
    const [a, b] = input.evidenceEntries as { item: string; studentRationale: string; chosen: { text: string; position: number } }[];
    const generation = { perEntry: [], result: 'PATTERN', kind: 'CONDITION', strength: 'TWO', headline: '이번 진단에서 조건을 빼고 읽은 곳이 두 번 있었어.',
      featured: { item: a!.item, sentence: a!.chosen.text.slice(0, 8), studentQuote: a!.studentRationale, sourceForm: 'A는 C일 때 B', studentForm: 'A는 B', changed: 'C일 때', explanation: '설명이야.' },
      otherCases: [{ item: b!.item, sentence: `**${b!.chosen.text.slice(0, 6)}**`, studentQuote: b!.studentRationale, changed: '조건을 버림' }],
      secondary: null, nextTime: '다음에 밑줄을 그어.', counterCheck: '', rejected: [] };
    const w = await world(tags, {}, { generation });
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'pending' });
    await settle(w.c);
    const view = w.c.result(w.id).readingHabit as any;
    expect(view.status).toBe('ready');
    expect(view.habit.featured).toMatchObject({ sourceKind: 'CHOICE', choicePosition: a!.chosen.position, questionNumber: expect.any(Number), questionId: expect.any(String), passageId: expect.any(String) });
    expect(view.habit.otherCases[0]).toMatchObject({ sentence: `**${b!.chosen.text.slice(0, 6)}**`, changed: '조건을 버림' });
    expect(view.habit.secondary).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/kind|perEntry|counterCheck|rejected|hiddenReason|verdict/u);
    // 옛 응답 모양 자리(summaryGroups)는 없다
    expect(w.c.result(w.id)).not.toHaveProperty('summaryGroups');
  });

  it('호출이 maxAttempts를 넘어 실패하면 failed이고 같은 입력으로는 다시 부르지 않는다', async () => {
    const w = await world(tags, {}, { fail: () => true });
    w.c.result(w.id); await settle(w.c);
    expect(w.habit.requests).toHaveLength(3);
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'failed' });
    await settle(w.c);
    expect(w.habit.requests).toHaveLength(3);
    expect(w.store.count('READING_HABIT_FAILED')).toBe(1);
  });

  it('FAILED로 저장된 참가자를 서버를 다시 켜 불러오면 result()가 새로 호출을 시작한다(켜져 있는 동안은 유지)', async () => {
    const w = await world(tags, {}, { fail: () => true });
    w.c.result(w.id); await settle(w.c);
    expect(JSON.parse(w.store.files.get(w.id)!).readingHabit.status).toBe('FAILED');
    // 같은 서버가 켜져 있는 동안은 폴링해도 다시 부르지 않는다
    w.c.result(w.id); w.c.result(w.id); await settle(w.c);
    expect(w.habit.requests).toHaveLength(3);
    // 서버를 다시 켠다(고쳐진 transport): 저장된 FAILED를 비우고 다음 result()가 새로 시작한다
    const habit = habitFake();
    const second = new DiagnosticController({ store: w.store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-reading-habit-unused'),
      diagnosisTransport: diagnosisBy(tags).transport, judgeTransport: judgeFake().transport, readingHabitTransport: habit.transport, wrongCardTransport: refusedHabitTransport() });
    expect(habit.requests).toHaveLength(0);
    expect(second.result(w.id).readingHabit).toEqual({ status: 'pending' });
    await settle(second);
    expect(habit.requests.length).toBeGreaterThan(0);
    expect(JSON.parse(w.store.files.get(w.id)!).readingHabit.status).toBe('READY');   // 기본 가짜 출력은 보이지 않는 결과(none)일 수 있다. 중요한 건 FAILED가 풀렸다는 것
    expect(['ready', 'none']).toContain(second.result(w.id).readingHabit.status);
  });

  it('모양이 틀린 응답도 다시 부른다(PATTERN인데 headline이 없으면 실패로 센다)', async () => {
    const w = await world(tags, {}, { generation: { result: 'PATTERN', strength: 'TWO' } });
    w.c.result(w.id); await settle(w.c);
    expect(w.habit.requests).toHaveLength(3);
    expect(w.c.result(w.id).readingHabit).toEqual({ status: 'failed' });
  });

  it('옛 참가자 파일(readingHabit 없음)을 읽고, 새 컨트롤러가 이어서 저장본을 쓴다', async () => {
    const w = await world(tags, {});
    w.c.result(w.id); await settle(w.c);
    const stored = JSON.parse(w.store.files.get(w.id)!); expect(stored.readingHabit.status).toBe('READY');
    // 저장본으로 이어 가기: 호출 없이 같은 응답
    const habit = habitFake();
    const second = new DiagnosticController({ store: w.store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-reading-habit-unused'),
      diagnosisTransport: diagnosisBy(tags).transport, judgeTransport: judgeFake().transport, readingHabitTransport: habit.transport, wrongCardTransport: refusedHabitTransport() });
    expect(second.result(w.id).readingHabit).toEqual({ status: 'none' });
    expect(habit.requests).toHaveLength(0);
    // 옛 파일: readingHabit 필드 없음 → 입력이 모이면 새로 시작(없다고 깨지지 않는다)
    delete stored.readingHabit; w.store.files.set(w.id, JSON.stringify(stored));
    const third = new DiagnosticController({ store: w.store, feedbackEvaluator: feedbackFake().evaluator, summaryEvaluator, summaryLogDirectory: resolve(process.cwd(), 'sessions/test-reading-habit-unused'),
      diagnosisTransport: diagnosisBy(tags).transport, judgeTransport: judgeFake().transport, readingHabitTransport: habit.transport, wrongCardTransport: refusedHabitTransport() });
    expect(third.result(w.id).readingHabit).toEqual({ status: 'pending' });
    await settle(third);
    expect(habit.requests).toHaveLength(2);
  });
});
