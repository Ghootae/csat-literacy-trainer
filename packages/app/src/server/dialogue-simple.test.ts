import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SimpleEvaluationInput, SimpleEvaluator, SimpleOutput } from '@csat/pipeline';
import { SimpleDialogueController } from './dialogue-simple.js';
import type { DialoguePassageContent } from './content.js';
import type { SimpleDialogueView } from '../shared/dialogue-simple.js';
import { problemLink } from '../shared/problem-link.js';

const P1 = '광합성은 빛에너지를 화학에너지로 바꾼다. 이 과정에서 산소가 나온다.';
const P2 = '엽록체에서 광합성이 일어난다.';
const passage: DialoguePassageContent = {
  passageId: 'ps', title: '광합성', exam: '테스트', source: { status: 'exact-local-source' }, problemQuestionId: 'q-1',
  paragraphs: [{ paragraphId: 'p1', position: 1, text: P1, goldPath: 'SECRET/gold.json' }, { paragraphId: 'p2', position: 2, text: P2, goldPath: null }],
};
const metadata = { provider: 'mock' as const, model: 'mock', promptVersion: 'paragraph-simple-holistic-v4.2', durationMs: 1, inputTokens: 1, outputTokens: 1, cachedTokens: 0 };
const parts = [{ description: '에너지 전환', sourceQuote: '빛에너지를 화학에너지로 바꾼다' }, { description: '산소 발생', sourceQuote: '산소가 나온다' }];
const base: SimpleOutput = { category: 'CAPTURED', reason: '이유', coreParts: [], corePartsCovered: [], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '잘 잡았어', corePartSummaries: [], closingFeedback: null, coreSourceQuote: null };
const err = { studentQuote: '빛을 소금으로', correction: '빛에너지가 화학에너지로 바뀐다', sourceQuote: '빛에너지를 화학에너지로 바꾼다', corePartIndex: 0, gapIndex: null, feedback: '' };
const err2 = { studentQuote: '산소를 먹는다', correction: '산소가 나온다', sourceQuote: '산소가 나온다', corePartIndex: 1, gapIndex: null, feedback: '' };
const fb = (e: typeof err, feedback: string) => ({ ...e, feedback });
const gap = { corePartIndex: 1, description: '산소', sourceQuote: '산소가 나온다', question: '이 과정에서 무엇이 생기는지 다시 볼래?', asksOneThing: true };
const gap2 = { corePartIndex: 0, description: '에너지', sourceQuote: '빛에너지를 화학에너지로 바꾼다', question: '무엇이 무엇으로 바뀌는지 말해 볼래?', asksOneThing: true };
const sums = ['에너지가 전환된다', '산소가 나온다'];
const after = { corePartSummaries: sums };
const closeAdd = { corePartSummaries: sums, closingFeedback: '마무리 피드백' };
const out = (patch: Partial<SimpleOutput>): SimpleOutput => ({ ...base, ...patch });

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'simple-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/** 흐름 시나리오는 핵심 부분을 겨냥하지 않으므로, 비워 둔 coreParts·corePartsCovered는 기본 부분과 오류·빈 곳 번호로 일관되게 채운다. 명시한 값은 그대로 둔다. */
const fit = (o: SimpleOutput, input: SimpleEvaluationInput): SimpleOutput => {
  const initial = input.stage === 'INITIAL';
  const coreParts = initial && o.coreParts.length === 0 ? (input.targetParagraph.text === P1 ? parts : [{ description: '핵심', sourceQuote: input.targetParagraph.text }]) : o.coreParts;
  const basis = initial ? coreParts : input.coreParts ?? [];
  const missed = o.category === 'IRRELEVANT' || o.category === 'COPY';
  const corePartsCovered = o.corePartsCovered.length > 0 ? o.corePartsCovered
    : basis.map((_, k) => !(missed || o.errors.some(e => e.corePartIndex === k) || o.gaps.some(g => g.corePartIndex === k)));
  const corePartSummaries = o.corePartSummaries.length > 0 ? basis.map((_, k) => o.corePartSummaries[k] ?? '요약') : o.corePartSummaries;
  return { ...o, coreParts, corePartsCovered, corePartSummaries };
};
function setup(...scripted: (SimpleOutput | Error)[]) {
  const inputs: SimpleEvaluationInput[] = [];
  const evaluator: SimpleEvaluator = { async complete(input) {
    inputs.push(input);
    const next = scripted.shift(); if (!next) throw new Error('script exhausted');
    if (next instanceof Error) throw next;
    return { rawOutput: fit(next, input), metadata };
  } };
  const controller = new SimpleDialogueController({ evaluator, passages: [passage], logDirectory: dir });
  return { controller, inputs, view: controller.start('ps') };
}
let n = 0;
const say = (c: SimpleDialogueController, v: SimpleDialogueView, text: string, paragraphIndex = v.currentIndex) =>
  c.respond(v.sessionId, { transitionId: `t${++n}`, paragraphIndex, text });
const quoted = '빛을 소금으로 바꾸고 산소를 먹는다';

describe('흐름 시나리오 8개', () => {
  it('1. 칭찬 종료', async () => {
    const { controller: c, view } = setup(out({}));
    const v = await say(c, view, '빛이 화학에너지가 된다');
    expect(v.current).toMatchObject({ done: true, canRespond: false, highlights: [] });
    expect(v.current.messages.map(m => m.role)).toEqual(['student', 'tutor']);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'CAPTURED', questionsAsked: 0 });
  });
  it('2. 무관 -> 재시도 -> 칭찬', async () => {
    const { controller: c, view, inputs } = setup(out({ category: 'IRRELEVANT', action: 'RETRY_PROMPT', message: '이 문단 얘기를 해 줘' }), out({}));
    const first = await say(c, view, '배고파');
    expect(first.current).toMatchObject({ done: false, canRespond: true, highlights: [] });
    const v = await say(c, first, '빛이 화학에너지가 된다');
    expect(v.current.done).toBe(true);
    expect(inputs.map(i => i.stage)).toEqual(['INITIAL', 'RETRY']);
    expect(inputs[1]!.dialogue.map(m => m.role)).toEqual(['student', 'tutor', 'student']);
    expect(inputs[1]!.dialogue.some(m => m.copied)).toBe(false);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'CAPTURED', retryUsed: true });
  });
  it('3. 무관 -> 재시도 -> 무관 종료(응답 없음으로 넘어감)', async () => {
    const { controller: c, view, inputs } = setup(out({ category: 'COPY', action: 'RETRY_PROMPT' }),
      out({ category: 'COPY', action: 'CLOSE_NO_RESPONSE', corePartSummaries: sums, coreSourceQuote: '산소가 나온다', message: '핵심은 이거야' }));
    const v = await say(c, await say(c, view, P1), P1);
    expect(v.current).toMatchObject({ done: true });
    // 옮겨 적기로 판정된 첫 발화만 다음 판정 입력에서 copied로 표시된다.
    expect(inputs[0]!.dialogue[0]!.copied).toBeUndefined();
    expect(inputs[1]!.dialogue.map(m => m.copied ?? false)).toEqual([true, false, false]);
    expect(v.current.highlights.map(h => h.text)).toEqual(['산소가 나온다']);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'NO_RESPONSE', questionsAsked: 0 });
  });
  it('4. 구멍 -> 해결', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', message: '더 있을까?' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true] }));
    const asked = await say(c, view, '빛이 변한다');
    expect(asked.current).toMatchObject({ done: false, highlights: [] });
    const v = await say(c, asked, '산소도 나와');
    expect(v.current.done).toBe(true);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'CAPTURED', questionsAsked: 1 });
  });
  it('5. 구멍 -> 미해결: 마무리에서만 구절을 미색 표시', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({ category: 'GAP', ...after, targetGapReadings: ['읽기'], targetGapsFilled: [false], action: 'CLOSE_GAP', message: '산소가 빠졌어' }));
    const asked = await say(c, view, '빛이 변한다');
    expect(asked.current.highlights).toEqual([]);
    const v = await say(c, asked, '모르겠어');
    expect(v.current.highlights).toEqual([{ start: P1.indexOf('산소가 나온다'), end: P1.indexOf('산소가 나온다') + 7, text: '산소가 나온다', location: 'PASSAGE' }]);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state.outcome).toBe('GAP_REVEALED');
  });
  it('6. 오류1 -> 교정 -> 구멍 -> 미해결(질문 2회)', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'GAP', gaps: [gap], targetErrorResolved: true, action: 'GAP_QUESTION' }),
      out({ category: 'GAP', ...after, targetGapReadings: ['읽기'], targetGapsFilled: [false], action: 'CLOSE_GAP' }));
    const q1 = await say(c, view, quoted);
    const q2 = await say(c, q1, '화학에너지가 된다');
    expect(q1.current.highlightKind).toBe('HINT'); expect(q2.current).toMatchObject({ highlights: [], highlightKind: null });
    expect(inputs[1]!.stage).toBe('AFTER_CORRECTION'); expect(inputs[1]!.targetError).toEqual(err);
    const v = await say(c, q2, '글쎄');
    expect(inputs[2]!.stage).toBe('AFTER_GAP');
    expect(v.current.highlights).toHaveLength(1);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'GAP_REVEALED', questionsAsked: 2 });
  });
  it('교정 질문 뒤에는 근거 문장 하나를 HINT로, 빈 곳 질문 뒤에는 표시 없이, 마무리 뒤에는 REVEAL로 준다', async () => {
    const e = setup(out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }), out({ category: 'ONE_ERROR', errors: [fb(err, 'f')], targetErrorResolved: false, action: 'CLOSE_ERRORS', ...closeAdd }));
    const asked = await say(e.controller, e.view, quoted);
    expect(asked.current.stage).toBe('AFTER_CORRECTION');
    expect(asked.current.highlightKind).toBe('HINT');
    expect(asked.current.highlights).toHaveLength(1);
    expect(asked.current.highlights[0]!.text).toBe(err.sourceQuote);
    expect((await say(e.controller, asked, '글쎄')).current.highlightKind).toBe('REVEAL');
    const g = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }));
    const gapAsked = await say(g.controller, g.view, '빛이 변한다');
    expect(gapAsked.current).toMatchObject({ stage: 'AFTER_GAP', highlights: [], highlightKind: null });
  });
  it('7. 오류1 -> 교정 실패', async () => {
    const { controller: c, view } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'ONE_ERROR', errors: [fb(err, '바꿔 말하면 안 돼')], targetErrorResolved: false, action: 'CLOSE_ERRORS', ...closeAdd, message: '바로잡기' }));
    const q = await say(c, view, quoted);
    expect(q.current).toMatchObject({ highlightKind: 'HINT', highlights: [expect.objectContaining({ text: err.sourceQuote })] });
    const v = await say(c, q, '그대로야 빛을 소금으로');
    expect(v.current.highlights.map(h => h.text)).toEqual([err.sourceQuote]);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'ERRORS_REVEALED', questionsAsked: 1 });
  });
  it('8. 오류2 즉시 공개(질문 없음)', async () => {
    const { controller: c, view } = setup(out({ category: 'MULTI_ERROR', errors: [fb(err, 'f1'), fb(err2, 'f2')], action: 'CLOSE_ERRORS', ...closeAdd, message: '바로잡기' }));
    const v = await say(c, view, quoted);
    expect(v.current.highlights.map(h => h.text)).toEqual([err.sourceQuote, err2.sourceQuote]);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'ERRORS_REVEALED', questionsAsked: 0 });
  });
});

describe('판정 입력 계약', () => {
  it('targetError는 AFTER_CORRECTION에서만 상태 값이고, 교정 뒤 빈 곳 질문 단계에서는 null이다', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'GAP', gaps: [gap], targetErrorResolved: true, action: 'GAP_QUESTION' }),
      out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true] }));
    const q = await say(c, view, quoted);
    const g = await say(c, q, '다시 말해 볼게');
    await say(c, g, '산소가 나와');
    expect(inputs.map(i => i.stage)).toEqual(['INITIAL', 'AFTER_CORRECTION', 'AFTER_GAP']);
    expect(inputs[1]!.targetError).not.toBeNull();
    expect(inputs[2]!.targetError).toBeNull();
  });
  it('서버가 정한 sourceCopyDetected를 단계 기록에 남긴다(INITIAL은 값, 그 밖은 null)', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true] }));
    const mid = await say(c, view, '빛이 변한다');
    await say(c, mid, '산소가 나와');
    expect(c.inspect(view.sessionId, 0).attempts[0]!.steps.map(s => s.sourceCopyDetected)).toEqual([false, null]);
    const logged = readFileSync(join(dir, 'sessions.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { event: string; step: { sourceCopyDetected: boolean | null } | null });
    expect(logged.filter(l => l.event === 'STEP').map(l => l.step!.sourceCopyDetected)).toEqual([false, null]);
  });
});

describe('입력·공개 범위', () => {
  it('모델 입력에 골드·축이 없고, 공개 view에 판정·원출력이 없다', async () => {
    const { controller: c, view, inputs } = setup(out({}));
    const v = await say(c, view, '답');
    expect(Object.keys(inputs[0]!).sort()).toEqual(['coreParts', 'dialogue', 'passage', 'sourceCopyDetected', 'stage', 'targetError', 'targetGaps', 'targetParagraph']);
    expect(JSON.stringify(inputs[0])).not.toContain('SECRET');
    expect(JSON.stringify(v)).not.toMatch(/category|reason|SECRET|rawOutput|expectedAction/);
  });
  it('검증 실패는 1회 재요청하고 이력을 단계에 남긴다', async () => {
    const wrong = out({ action: 'CLOSE_GAP' });
    const { controller: c, view, inputs } = setup(wrong, out({}));
    const v = await say(c, view, '답');
    expect(v.current.done).toBe(true);
    expect(inputs[1]!.validationFeedback).toMatch(/행동 표/);
    const step = c.inspect(v.sessionId, 0).attempts[0]!.steps[0]!;
    expect(step).toMatchObject({ stage: 'INITIAL', expectedAction: 'PRAISE', action: 'PRAISE', studentText: '답' });
    expect(step.validationFailures).toHaveLength(1); expect(step.call.attempts).toBe(2);
  });
});

describe('평가 실패와 멱등성', () => {
  it('실패하면 발화를 보존하고 다시 시도할 수 있으며 실패를 로그에 남긴다', async () => {
    const { controller: c, view } = setup(new Error('timeout'), out({}));
    const failed = await say(c, view, '내 답');
    expect(failed.current).toMatchObject({ evaluationStatus: 'RETRYABLE_ERROR', canRespond: true, done: false });
    expect(failed.current.messages).toEqual([{ role: 'student', text: '내 답', label: '나의 요약' }]);
    expect(failed.current.evaluationError).not.toContain('timeout');
    const ok = await say(c, failed, '내 답');
    expect(ok.current.messages.map(m => m.role)).toEqual(['student', 'tutor']);
    expect(ok.current.evaluationStatus).toBe('IDLE');
    const lines = readFileSync(join(dir, 'sessions.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { event: string; error: string | null });
    expect(lines.map(l => l.event)).toEqual(['EVALUATION_FAILED', 'STEP']); expect(lines[0]!.error).toBe('timeout');
  });
  it('같은 transitionId는 한 번만 평가하고, 평가 중 다른 제출은 거부한다', async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    let calls = 0;
    const evaluator: SimpleEvaluator = { async complete(input) { calls++; await gate; return { rawOutput: fit(out({}), input), metadata }; } };
    const c = new SimpleDialogueController({ evaluator, passages: [passage], logDirectory: dir });
    const v = c.start('ps');
    const req = { transitionId: 'same', paragraphIndex: 0, text: '답' };
    const a = c.respond(v.sessionId, req); const b = c.respond(v.sessionId, req);
    expect(a).toBe(b);
    expect(() => c.respond(v.sessionId, { ...req, transitionId: 'other' })).toThrow(/평가 중/);
    expect(() => c.respond(v.sessionId, { ...req, text: '다른 답' })).toThrow(/transitionId/);
    release(); await a; expect(calls).toBe(1);
    expect(() => c.respond(v.sessionId, { ...req, transitionId: 'late' })).toThrow(/끝난/);
  });
  it('단계마다 로그 한 줄을 남긴다', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true] }));
    await say(c, await say(c, view, 'a'), 'b');
    const lines = readFileSync(join(dir, 'sessions.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { step: { stepIndex: number }; sessionId: string });
    expect(lines.map(l => l.step.stepIndex)).toEqual([0, 1]); expect(lines[0]!.sessionId).toBe(view.sessionId);
  });
});

describe('자유 이동과 문제 연결', () => {
  it('완료와 무관하게 문단을 오가고, 모두 끝나면 handoff 없는 문제 주소를 준다', async () => {
    const { controller: c, view } = setup(out({}), out({}));
    expect(view.problemUrl).toBeNull();
    expect(view.problemQuestionId).toBe('q-1');
    const second = c.navigate(view.sessionId, { paragraphIndex: 1 });
    expect(second.current.index).toBe(1);
    expect(c.navigate(view.sessionId, { paragraphIndex: 0 }).currentIndex).toBe(0);
    expect(() => c.navigate(view.sessionId, { paragraphIndex: 2 })).toThrow();
    await say(c, view, '답1', 0);
    const done = await say(c, view, '답2', 1);
    expect(done.allDone).toBe(true); expect(done.paragraphs.map(p => p.done)).toEqual([true, true]);
    expect(done.problemUrl).toBe(problemLink('q-1', done.sessionId));
    expect(done.problemUrl).not.toMatch(/handoff/i);
  });
});

describe('메모', () => {
  it('단계·시도·문단 메모를 구분해 저장하고, 수정은 추가만 하며 마지막 값이 현재 값이다', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true] }));
    const v = await say(c, await say(c, view, 'a'), 'b');
    const save = (attemptNumber: number | null, stepIndex: number | null, text: string) => c.saveMemo(v.sessionId, { paragraphIndex: 0, attemptNumber, stepIndex, text });
    save(1, 0, '첫 인상'); save(1, 1, '둘째'); save(null, null, '문단 전체'); save(1, 0, '첫 인상 수정'); save(1, null, '시도 인상');
    const m = c.inspect(v.sessionId, 0);
    expect(m.memos).toEqual({ paragraph: '문단 전체' });
    expect(m.attempts[0]!.memos).toEqual({ attempt: '시도 인상', steps: { 0: '첫 인상 수정', 1: '둘째' } });
    expect(c.inspect(v.sessionId, 1).memos).toEqual({ paragraph: '' });
    const lines = readFileSync(join(dir, 'memos.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { attemptNumber: number | null; stepIndex: number | null; text: string });
    expect(lines).toHaveLength(5); expect(lines.map(l => l.text)).toEqual(['첫 인상', '둘째', '문단 전체', '첫 인상 수정', '시도 인상']);
    expect(lines[2]).toMatchObject({ attemptNumber: null, stepIndex: null, sessionId: v.sessionId, passageId: 'ps', paragraphId: 'p1' });
    expect(lines[4]).toMatchObject({ attemptNumber: 1, stepIndex: null });
    expect(() => save(1, 5, 'x')).toThrow(/단계/);
    expect(() => save(2, null, 'x')).toThrow(/시도/);
    expect(() => save(null, 0, 'x')).toThrow(/시도 번호/);
  });
  it('attemptNumber 필드가 없는 옛 줄은 null 단계=문단, 숫자 단계=시도 1의 단계로 읽는다', async () => {
    const { controller: c, view } = setup(out({}));
    const v = await say(c, view, 'a');
    const old = (stepIndex: number | null, text: string) => JSON.stringify({ savedAt: 'x', sessionId: v.sessionId, passageId: 'ps', paragraphId: 'p1', stepIndex, text });
    writeFileSync(join(dir, 'memos.jsonl'), [old(null, '옛 문단'), old(0, '옛 단계')].join('\n') + '\n');
    const m = c.inspect(v.sessionId, 0);
    expect(m.memos.paragraph).toBe('옛 문단'); expect(m.attempts[0]!.memos).toEqual({ attempt: '', steps: { 0: '옛 단계' } });
  });
});

describe('v2: 라벨·재구성 요약', () => {
  it('학생 3종 라벨과 튜터 행동별 라벨을 붙이고, 모델 입력 dialogue에는 라벨이 없다', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'COPY', action: 'RETRY_PROMPT' }),
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'GAP', gaps: [gap], targetErrorResolved: true, action: 'GAP_QUESTION' }),
      out({ category: 'GAP', ...after, targetGapReadings: ['읽기'], targetGapsFilled: [false], action: 'CLOSE_GAP' }));
    let v = await say(c, view, P1);
    v = await say(c, v, quoted); v = await say(c, v, '고쳤어'); v = await say(c, v, '글쎄');
    expect(v.current.messages.map(m => m.label)).toEqual(['나의 요약', '다시 써 보기', '다시 쓴 요약', '확인하기', '나의 답', '생각해 보기', '나의 답', '빠진 내용']);
    // 라벨은 넣지 않는다. 옮겨 적기로 판정된 발화에만 copied가 붙는다.
    for (const i of inputs) for (const m of i.dialogue) expect(Object.keys(m).filter(k => k !== 'copied').sort()).toEqual(['role', 'text']);
  });
  it('PRAISE·CLOSE_NO_RESPONSE 라벨, CLOSE_ERRORS는 바로잡기·문단 핵심 두 말풍선', async () => {
    const a = setup(out({}));
    expect((await say(a.controller, a.view, 'x')).current.messages.map(m => m.label)).toEqual(['나의 요약', '피드백']);
    const b = setup(out({ category: 'COPY', action: 'RETRY_PROMPT' }), out({ category: 'COPY', action: 'CLOSE_NO_RESPONSE', corePartSummaries: sums, coreSourceQuote: '산소가 나온다', message: '핵심은 이거야' }));
    expect((await say(b.controller, await say(b.controller, b.view, P1), P1)).current.messages.map(m => m.label)).toEqual(['나의 요약', '다시 써 보기', '다시 쓴 요약', '문단 핵심']);
  });
  it('v4.6: CLOSE_ERRORS는 도입 -> 오류마다(quote) -> 마무리 피드백+부분 상자(parts) 말풍선 4개', async () => {
    const d = setup(out({ category: 'MULTI_ERROR', errors: [fb(err, '바로잡기1'), fb(err2, '바로잡기2')], action: 'CLOSE_ERRORS', ...closeAdd, message: '하나씩 볼게' }));
    const v = await say(d.controller, d.view, quoted);
    expect(v.current.messages.slice(1)).toEqual([
      { role: 'tutor', text: '하나씩 볼게', label: '바로잡기' },
      { role: 'tutor', text: '바로잡기1', quote: err.studentQuote, label: '바로잡기' },
      { role: 'tutor', text: '바로잡기2', quote: err2.studentQuote, label: '바로잡기' },
      { role: 'tutor', text: '마무리 피드백', parts: sums, label: '바로잡기' }]);
    expect(v.current.messages).toHaveLength(5);
  });
  it('v4.6: AFTER_GAP CLOSE_ERRORS도 도입 -> 오류 -> 마무리 피드백+부분 상자이고, 오류 문장과 다뤄지지 않은 항목 문장을 함께 표시한다', async () => {
    const closeErr = (patch: Partial<SimpleOutput>) => out({ category: 'ONE_ERROR', errors: [{ ...fb(err2, '바로잡기1'), gapIndex: 0 }], action: 'CLOSE_ERRORS', ...closeAdd, message: '하나씩 볼게',
      targetGapReadings: ['읽기', ''], targetGapsFilled: [false, false], ...patch });
    const run = async (final: SimpleOutput) => { const d = setup(out({ category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION' }), final); return say(d.controller, await say(d.controller, d.view, 'a'), quoted); };
    const one = await run(closeErr({}));
    expect(one.current.messages.slice(-3)).toEqual([
      { role: 'tutor', text: '하나씩 볼게', label: '바로잡기' },
      { role: 'tutor', text: '바로잡기1', quote: err2.studentQuote, label: '바로잡기' },
      { role: 'tutor', text: '마무리 피드백', parts: sums, label: '바로잡기' }]);
    expect(one.current.highlights.map(h => h.text)).toEqual([gap.sourceQuote, gap2.sourceQuote]);
    const two = await run(closeErr({ errors: [{ ...fb(err2, '바로잡기1'), gapIndex: 0 }, { ...fb(err, '바로잡기2'), gapIndex: 1 }] }));
    expect(two.current.messages.slice(-4).map(m => m.label)).toEqual(['바로잡기', '바로잡기', '바로잡기', '바로잡기']);
    expect(two.current.highlights.map(h => h.text)).toEqual([err2.sourceQuote, err.sourceQuote]);
  });
  it('v4.6: CLOSE_NO_RESPONSE는 말풍선 하나(parts)이고 근거 문장을 지문에 표시한다', async () => {
    const b = setup(out({ category: 'COPY', action: 'RETRY_PROMPT' }), out({ category: 'COPY', action: 'CLOSE_NO_RESPONSE', corePartSummaries: sums, coreSourceQuote: '산소가 나온다', message: '대신 정리해 줄게' }));
    const v = await say(b.controller, await say(b.controller, b.view, P1), P1);
    expect(v.current.messages.slice(-1)).toEqual([{ role: 'tutor', text: '대신 정리해 줄게', parts: sums, label: '문단 핵심' }]);
    expect(v.current.messages).toHaveLength(4);
    expect(v.current.highlights).toEqual([{ start: P1.indexOf('산소가 나온다'), end: P1.indexOf('산소가 나온다') + 7, text: '산소가 나온다', location: 'PASSAGE' }]);
  });
  it('v4: AFTER_GAP 입력에만 targetGaps를 넘기고, 모델 입력 dialogue에는 quote·parts·items 키가 없다', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'MULTI_ERROR', errors: [fb(err, 'f1'), fb(err2, 'f2')], action: 'CLOSE_ERRORS', ...closeAdd, message: 'm' }));
    await say(c, view, quoted);
    expect(inputs[0]!.targetGaps).toBeNull();
    const g = setup(out({ category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION', message: '두 가지 확인할게' }), out({ category: 'GAP', ...after, targetGapReadings: ['읽기', '읽기'], targetGapsFilled: [true, false], action: 'CLOSE_GAP' }));
    await say(g.controller, await say(g.controller, g.view, 'a'), 'b');
    expect(g.inputs.map(i => i.targetGaps)).toEqual([null, [gap, gap2]]);
    const e = setup(out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }), out({ category: 'ONE_ERROR', errors: [fb(err, 'f')], targetErrorResolved: false, action: 'CLOSE_ERRORS', ...closeAdd }),
      out({ category: 'COPY', action: 'RETRY_PROMPT' }));
    const q = await say(e.controller, e.view, quoted); await say(e.controller, q, '그대로');
    expect(e.inputs.map(i => i.targetGaps)).toEqual([null, null]);
    const f = setup(out({ category: 'MULTI_ERROR', errors: [fb(err, 'f1'), fb(err2, 'f2')], action: 'CLOSE_ERRORS', ...closeAdd }));
    const done = await say(f.controller, f.view, quoted);
    expect(done.current.messages.some(m => m.quote !== undefined && m.parts === undefined)).toBe(true);
    for (const i of [...f.inputs, ...g.inputs, ...e.inputs]) for (const m of i.dialogue) expect(Object.keys(m).sort()).toEqual(['role', 'text']);
  });
  it('v4.2: INITIAL 입력 coreParts는 null이고, 이후 단계 입력에는 INITIAL 출력의 coreParts가 그대로 들어가며, 새 시도 INITIAL에서 다시 null이다', async () => {
    const mine = [{ description: '핵심 하나', sourceQuote: '산소가 나온다' }];
    const { controller: c, view, inputs } = setup(
      out({ coreParts: mine, corePartsCovered: [false], category: 'GAP', gaps: [{ ...gap, corePartIndex: 0 }], action: 'GAP_QUESTION' }),
      out({ ...after, corePartsCovered: [true], targetGapReadings: ['읽기'], targetGapsFilled: [true] }),
      out({ coreParts: mine, corePartsCovered: [true] }));
    const asked = await say(c, view, 'a');
    const done = await say(c, asked, 'b');
    expect(inputs.map(i => i.coreParts)).toEqual([null, mine]);
    expect(inputs.map(i => i.stage)).toEqual(['INITIAL', 'AFTER_GAP']);
    await say(c, c.startAttempt(done.sessionId, { paragraphIndex: 0 }), 'c');
    expect(inputs.map(i => i.coreParts)).toEqual([null, mine, null]);
    expect(inputs[2]!.stage).toBe('INITIAL');
  });
  it('v4: GAP_QUESTION은 한 말풍선(text+items)이고 모델 입력 dialogue에는 번호 질문이 텍스트로 들어간다', async () => {
    const { controller: c, view, inputs } = setup(out({ category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION', message: '두 가지 확인할게' }), out({ ...after, targetGapReadings: ['읽기', '읽기'], targetGapsFilled: [true, true] }));
    const asked = await say(c, view, 'a');
    expect(asked.current.messages.slice(1)).toEqual([{ role: 'tutor', text: '두 가지 확인할게', items: [gap.question, gap2.question], label: '생각해 보기' }]);
    await say(c, asked, 'b');
    expect(inputs[1]!.dialogue[1]).toEqual({ role: 'tutor', text: `두 가지 확인할게\n1. ${gap.question}\n2. ${gap2.question}` });
    expect(inputs[1]!.stage).toBe('AFTER_GAP');
  });
  it('v4.6: 질문 뒤 PRAISE는 피드백+부분 상자 한 말풍선, INITIAL PRAISE는 상자 없는 하나', async () => {
    const a = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true], message: '잘 채웠어' }));
    const v = await say(a.controller, await say(a.controller, a.view, 'a'), 'b');
    expect(v.current.messages.slice(-1)).toEqual([{ role: 'tutor', text: '잘 채웠어', parts: sums, label: '피드백' }]);
    const b = setup(out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }), out({ targetErrorResolved: true, ...after, message: '고쳤네' }));
    const w = await say(b.controller, await say(b.controller, b.view, quoted), '고침');
    expect(w.current.messages.slice(-1)).toEqual([{ role: 'tutor', text: '고쳤네', parts: sums, label: '피드백' }]);
    const c = setup(out({}));
    expect((await say(c.controller, c.view, 'x')).current.messages.slice(1)).toEqual([{ role: 'tutor', text: '잘 잡았어', label: '피드백' }]);
  });
  it('v4.6: CLOSE_GAP은 빠진 내용+부분 상자 한 말풍선이고 못 채운 빈 곳의 근거 문장만 표시한다', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap, gap2], action: 'GAP_QUESTION' }),
      out({ category: 'GAP', ...after, targetGapReadings: ['읽기', '읽기'], targetGapsFilled: [true, false], action: 'CLOSE_GAP', message: '아직 빠진 부분이 있어' }));
    const v = await say(c, await say(c, view, 'a'), 'b');
    expect(v.current.messages.slice(-1)).toEqual([{ role: 'tutor', text: '아직 빠진 부분이 있어', parts: sums, label: '빠진 내용' }]);
    expect(v.current.highlights.map(h => h.text)).toEqual([gap2.sourceQuote]);
  });
  it('v4: 고침 + 구멍 -> GAP_QUESTION(번호 목록) -> AFTER_GAP 판정', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'GAP', gaps: [gap, gap2], targetErrorResolved: true, action: 'GAP_QUESTION', message: '확인할 게 둘 있어' }),
      out({ ...after, targetGapReadings: ['읽기', '읽기'], targetGapsFilled: [true, true] }));
    const q2 = await say(c, await say(c, view, quoted), '화학에너지가 돼');
    expect(q2.current.messages.at(-1)).toMatchObject({ items: [gap.question, gap2.question], label: '생각해 보기' });
    const v = await say(c, q2, '산소도 나오고 에너지가 바뀌어');
    expect(inputs.map(i => i.stage)).toEqual(['INITIAL', 'AFTER_CORRECTION', 'AFTER_GAP']);
    expect(inputs[2]!.targetGaps).toEqual([gap, gap2]);
    expect(v.current.done).toBe(true);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.state).toMatchObject({ outcome: 'CAPTURED', questionsAsked: 2 });
  });
  it('restatedSummary는 판정 전 null이고 판정할 때마다 마지막 단계 값으로 갱신된다(빈 문자열 허용)', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION', restatedSummary: '빛이 변한다' }), out({ ...after, targetGapReadings: ['읽기'], targetGapsFilled: [true], restatedSummary: '' }));
    expect(view.current.restatedSummary).toBeNull();
    const q = await say(c, view, 'a');
    expect(q.current.restatedSummary).toBe('빛이 변한다');
    expect((await say(c, q, 'b')).current.restatedSummary).toBe('');
  });
});

describe('v2: 새 시도', () => {
  const newAttempt = (c: SimpleDialogueController, v: SimpleDialogueView, paragraphIndex = v.currentIndex) => c.startAttempt(v.sessionId, { paragraphIndex });
  const logLines = () => readFileSync(join(dir, 'sessions.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { schemaVersion: string; event: string; attemptNumber: number });
  it('완료 후 새 시도: 이전 시도 보존, 새 시도는 빈 상태이고 문단 done은 유지된다', async () => {
    const { controller: c, view } = setup(out({ restatedSummary: '첫 시도 요약' }), out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }));
    const done = await say(c, view, '답');
    expect(done.current).toMatchObject({ attemptNumber: 1, attemptCount: 1, canStartNewAttempt: true });
    const v = newAttempt(c, done);
    expect(v.current).toMatchObject({ attemptNumber: 2, attemptCount: 2, done: false, canRespond: true, messages: [], restatedSummary: null, canStartNewAttempt: false, highlights: [] });
    expect(v.paragraphs[0]!.done).toBe(true);
    await say(c, v, '두 번째');
    const ins = c.inspect(v.sessionId, 0);
    expect(ins.currentAttemptNumber).toBe(2);
    expect(ins.attempts.map(a => a.status)).toEqual(['DONE', 'IN_PROGRESS']);
    expect(ins.attempts[0]!.messages.map(m => m.text)).toEqual(['답', '잘 잡았어']);
    expect(ins.attempts[0]!.steps[0]!.studentText).toBe('답');
    expect(logLines().map(l => [l.event, l.attemptNumber])).toEqual([['STEP', 1], ['ATTEMPT_STARTED', 2], ['STEP', 2]]);
    expect(logLines().every(l => l.schemaVersion === 'dialogue-simple-holistic-record-v2')).toBe(true);
  });
  it('진행 중 새 시도는 이전 시도를 중단으로 기록하고, 모든 문단에 완료된 시도가 있어야 allDone이다', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gaps: [gap], action: 'GAP_QUESTION' }), out({}), out({}));
    const mid = await say(c, view, 'a');
    expect(mid.current.canStartNewAttempt).toBe(true);
    const v = newAttempt(c, mid);
    expect(c.inspect(v.sessionId, 0).attempts.map(a => a.status)).toEqual(['ABANDONED', 'IN_PROGRESS']);
    expect(v.paragraphs[0]!.done).toBe(false);
    expect(logLines().map(l => [l.event, l.attemptNumber])).toEqual([['STEP', 1], ['ATTEMPT_ABANDONED', 1], ['ATTEMPT_STARTED', 2]]);
    await say(c, v, 'b'); expect((await say(c, c.navigate(v.sessionId, { paragraphIndex: 1 }), 'c', 1)).allDone).toBe(true);
    expect(c.get(v.sessionId).problemUrl).toBe(problemLink('q-1', v.sessionId));
  });
  it('학생 발화가 없는 빈 시도와 평가 중에는 거부한다', async () => {
    const { controller: c, view } = setup(out({}));
    expect(() => newAttempt(c, view)).toThrow(/이미 새 시도/);
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const evaluator: SimpleEvaluator = { async complete(input) { await gate; return { rawOutput: fit(out({}), input), metadata }; } };
    const c2 = new SimpleDialogueController({ evaluator, passages: [passage], logDirectory: dir });
    const v = c2.start('ps');
    const pending = c2.respond(v.sessionId, { transitionId: 'p', paragraphIndex: 0, text: '답' });
    expect(c2.get(v.sessionId).current.canStartNewAttempt).toBe(false);
    expect(() => newAttempt(c2, v)).toThrow(/평가 중/);
    release(); await pending;
  });
  it('평가 실패 상태에서도 새 시도를 시작할 수 있고, 끝난 시도에는 respond가 거부된다', async () => {
    const { controller: c, view } = setup(new Error('timeout'), out({}));
    const failed = await say(c, view, '답');
    expect(failed.current.canStartNewAttempt).toBe(true);
    const v = newAttempt(c, failed);
    expect(c.inspect(v.sessionId, 0).attempts[0]!.status).toBe('ABANDONED');
    const done = await say(c, v, '새 답');
    expect(done.current.attemptNumber).toBe(2);
    expect(() => say(c, done, '또')).toThrow(/끝난/);
  });
});
