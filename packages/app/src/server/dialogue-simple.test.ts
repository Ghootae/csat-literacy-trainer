import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SimpleEvaluationInput, SimpleEvaluator, SimpleOutput } from '@csat/pipeline';
import { SimpleDialogueController } from './dialogue-simple.js';
import type { DialoguePassageContent } from './content.js';
import type { SimpleDialogueView } from '../shared/dialogue-simple.js';

const P1 = '광합성은 빛에너지를 화학에너지로 바꾼다. 이 과정에서 산소가 나온다.';
const P2 = '엽록체에서 광합성이 일어난다.';
const passage: DialoguePassageContent = {
  passageId: 'ps', title: '광합성', exam: '테스트', source: { status: 'exact-local-source' }, problemQuestionId: 'q-1',
  paragraphs: [{ paragraphId: 'p1', position: 1, text: P1, goldPath: 'SECRET/gold.json' }, { paragraphId: 'p2', position: 2, text: P2, goldPath: null }],
};
const metadata = { provider: 'mock' as const, model: 'mock', promptVersion: 'paragraph-simple-holistic-v1', durationMs: 1, inputTokens: 1, outputTokens: 1, cachedTokens: 0 };
const base: SimpleOutput = { category: 'CAPTURED', reason: '이유', errors: [], gap: null, targetErrorResolved: null, action: 'PRAISE', message: '잘 잡았어', coreSummary: null };
const err = { studentQuote: '빛을 소금으로', correction: '빛에너지가 화학에너지로 바뀐다', sourceQuote: '빛에너지를 화학에너지로 바꾼다' };
const err2 = { studentQuote: '산소를 먹는다', correction: '산소가 나온다', sourceQuote: '산소가 나온다' };
const gap = { description: '산소', sourceQuote: '산소가 나온다' };
const out = (patch: Partial<SimpleOutput>): SimpleOutput => ({ ...base, ...patch });

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'simple-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function setup(...scripted: (SimpleOutput | Error)[]) {
  const inputs: SimpleEvaluationInput[] = [];
  const evaluator: SimpleEvaluator = { async complete(input) {
    inputs.push(input);
    const next = scripted.shift(); if (!next) throw new Error('script exhausted');
    if (next instanceof Error) throw next;
    return { rawOutput: next, metadata };
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
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'CAPTURED', questionsAsked: 0 });
  });
  it('2. 무관 -> 재시도 -> 칭찬', async () => {
    const { controller: c, view, inputs } = setup(out({ category: 'IRRELEVANT', action: 'RETRY_PROMPT', message: '이 문단 얘기를 해 줘' }), out({}));
    const first = await say(c, view, '배고파');
    expect(first.current).toMatchObject({ done: false, canRespond: true, highlights: [] });
    const v = await say(c, first, '빛이 화학에너지가 된다');
    expect(v.current.done).toBe(true);
    expect(inputs.map(i => i.stage)).toEqual(['INITIAL', 'RETRY']);
    expect(inputs[1]!.dialogue.map(m => m.role)).toEqual(['student', 'tutor', 'student']);
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'CAPTURED', retryUsed: true });
  });
  it('3. 무관 -> 재시도 -> 무관 종료(응답 없음으로 넘어감)', async () => {
    const { controller: c, view } = setup(out({ category: 'COPY', action: 'RETRY_PROMPT' }),
      out({ category: 'COPY', action: 'CLOSE_NO_RESPONSE', coreSummary: '빛에너지가 화학에너지가 된다', message: '핵심은 이거야' }));
    const v = await say(c, await say(c, view, P1), P1);
    expect(v.current).toMatchObject({ done: true, highlights: [] });
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'NO_RESPONSE', questionsAsked: 0 });
  });
  it('4. 구멍 -> 해결', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gap, action: 'GAP_QUESTION', message: '더 있을까?' }), out({}));
    const asked = await say(c, view, '빛이 변한다');
    expect(asked.current).toMatchObject({ done: false, highlights: [] });
    const v = await say(c, asked, '산소도 나와');
    expect(v.current.done).toBe(true);
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'CAPTURED', questionsAsked: 1 });
  });
  it('5. 구멍 -> 미해결: 마무리에서만 구절을 미색 표시', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gap, action: 'GAP_QUESTION' }), out({ category: 'GAP', gap, action: 'CLOSE_GAP', message: '산소가 빠졌어' }));
    const asked = await say(c, view, '빛이 변한다');
    expect(asked.current.highlights).toEqual([]);
    const v = await say(c, asked, '모르겠어');
    expect(v.current.highlights).toEqual([{ start: P1.indexOf('산소가 나온다'), end: P1.indexOf('산소가 나온다') + 7, text: '산소가 나온다', location: 'PASSAGE' }]);
    expect(c.inspect(v.sessionId, 0).state.outcome).toBe('GAP_REVEALED');
  });
  it('6. 오류1 -> 교정 -> 구멍 -> 미해결(질문 2회)', async () => {
    const { controller: c, view, inputs } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'GAP', gap, targetErrorResolved: true, action: 'GAP_QUESTION' }),
      out({ category: 'GAP', gap, action: 'CLOSE_GAP' }));
    const q1 = await say(c, view, quoted);
    const q2 = await say(c, q1, '화학에너지가 된다');
    expect(q1.current.highlights).toEqual([]); expect(q2.current.highlights).toEqual([]);
    expect(inputs[1]!.stage).toBe('AFTER_CORRECTION'); expect(inputs[1]!.targetError).toEqual(err);
    const v = await say(c, q2, '글쎄');
    expect(inputs[2]!.stage).toBe('AFTER_GAP');
    expect(v.current.highlights).toHaveLength(1);
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'GAP_REVEALED', questionsAsked: 2 });
  });
  it('7. 오류1 -> 교정 실패', async () => {
    const { controller: c, view } = setup(
      out({ category: 'ONE_ERROR', errors: [err], action: 'CORRECTION_QUESTION' }),
      out({ category: 'ONE_ERROR', errors: [err], targetErrorResolved: false, action: 'CLOSE_ERRORS', coreSummary: '핵심', message: '바로잡기' }));
    const q = await say(c, view, quoted);
    expect(q.current.highlights).toEqual([]);
    const v = await say(c, q, '그대로야 빛을 소금으로');
    expect(v.current.highlights.map(h => h.text)).toEqual([err.sourceQuote]);
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'ERRORS_REVEALED', questionsAsked: 1 });
  });
  it('8. 오류2 즉시 공개(질문 없음)', async () => {
    const { controller: c, view } = setup(out({ category: 'MULTI_ERROR', errors: [err, err2], action: 'CLOSE_ERRORS', coreSummary: '핵심', message: '바로잡기' }));
    const v = await say(c, view, quoted);
    expect(v.current.highlights.map(h => h.text)).toEqual([err.sourceQuote, err2.sourceQuote]);
    expect(c.inspect(v.sessionId, 0).state).toMatchObject({ outcome: 'ERRORS_REVEALED', questionsAsked: 0 });
  });
});

describe('입력·공개 범위', () => {
  it('모델 입력에 골드·축이 없고, 공개 view에 판정·원출력이 없다', async () => {
    const { controller: c, view, inputs } = setup(out({}));
    const v = await say(c, view, '답');
    expect(Object.keys(inputs[0]!).sort()).toEqual(['dialogue', 'passage', 'stage', 'targetError', 'targetParagraph']);
    expect(JSON.stringify(inputs[0])).not.toContain('SECRET');
    expect(JSON.stringify(v)).not.toMatch(/category|reason|SECRET|rawOutput|expectedAction/);
  });
  it('검증 실패는 1회 재요청하고 이력을 단계에 남긴다', async () => {
    const wrong = out({ action: 'CLOSE_GAP' });
    const { controller: c, view, inputs } = setup(wrong, out({}));
    const v = await say(c, view, '답');
    expect(v.current.done).toBe(true);
    expect(inputs[1]!.validationFeedback).toMatch(/행동 표/);
    const step = c.inspect(v.sessionId, 0).steps[0]!;
    expect(step).toMatchObject({ stage: 'INITIAL', expectedAction: 'PRAISE', action: 'PRAISE', studentText: '답' });
    expect(step.validationFailures).toHaveLength(1); expect(step.call.attempts).toBe(2);
  });
});

describe('평가 실패와 멱등성', () => {
  it('실패하면 발화를 보존하고 다시 시도할 수 있으며 실패를 로그에 남긴다', async () => {
    const { controller: c, view } = setup(new Error('timeout'), out({}));
    const failed = await say(c, view, '내 답');
    expect(failed.current).toMatchObject({ evaluationStatus: 'RETRYABLE_ERROR', canRespond: true, done: false });
    expect(failed.current.messages).toEqual([{ role: 'student', text: '내 답' }]);
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
    const evaluator: SimpleEvaluator = { async complete() { calls++; await gate; return { rawOutput: out({}), metadata }; } };
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
    const { controller: c, view } = setup(out({ category: 'GAP', gap, action: 'GAP_QUESTION' }), out({}));
    await say(c, await say(c, view, 'a'), 'b');
    const lines = readFileSync(join(dir, 'sessions.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { step: { stepIndex: number }; sessionId: string });
    expect(lines.map(l => l.step.stepIndex)).toEqual([0, 1]); expect(lines[0]!.sessionId).toBe(view.sessionId);
  });
});

describe('자유 이동과 문제 연결', () => {
  it('완료와 무관하게 문단을 오가고, 모두 끝나면 handoff 없는 문제 주소를 준다', async () => {
    const { controller: c, view } = setup(out({}), out({}));
    expect(view.problemUrl).toBeNull();
    const second = c.navigate(view.sessionId, { paragraphIndex: 1 });
    expect(second.current.index).toBe(1);
    expect(c.navigate(view.sessionId, { paragraphIndex: 0 }).currentIndex).toBe(0);
    expect(() => c.navigate(view.sessionId, { paragraphIndex: 2 })).toThrow();
    await say(c, view, '답1', 0);
    const done = await say(c, view, '답2', 1);
    expect(done.allDone).toBe(true); expect(done.paragraphs.map(p => p.done)).toEqual([true, true]);
    expect(done.problemUrl).toBe('/problem/dev/v4?questionId=q-1');
    expect(done.problemUrl).not.toMatch(/handoff/i);
  });
});

describe('메모', () => {
  it('단계 메모와 문단 메모를 구분해 저장하고, 수정은 추가만 하며 마지막 값이 현재 값이다', async () => {
    const { controller: c, view } = setup(out({ category: 'GAP', gap, action: 'GAP_QUESTION' }), out({}));
    const v = await say(c, await say(c, view, 'a'), 'b');
    const save = (stepIndex: number | null, text: string) => c.saveMemo(v.sessionId, { paragraphIndex: 0, stepIndex, text });
    save(0, '첫 인상'); save(1, '둘째'); save(null, '문단 전체'); save(0, '첫 인상 수정');
    expect(c.inspect(v.sessionId, 0).memos).toEqual({ paragraph: '문단 전체', steps: { 0: '첫 인상 수정', 1: '둘째' } });
    expect(c.inspect(v.sessionId, 1).memos).toEqual({ paragraph: '', steps: {} });
    const lines = readFileSync(join(dir, 'memos.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l) as { stepIndex: number | null; text: string });
    expect(lines).toHaveLength(4); expect(lines.map(l => l.text)).toEqual(['첫 인상', '둘째', '문단 전체', '첫 인상 수정']);
    expect(lines[2]).toMatchObject({ stepIndex: null, sessionId: v.sessionId, passageId: 'ps', paragraphId: 'p1' });
    expect(() => save(5, 'x')).toThrow(/단계/);
  });
});
