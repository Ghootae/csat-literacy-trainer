import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FeedbackEvaluationCall, FeedbackEvaluator, FeedbackSession, SourceDirectProblemBundle } from '@csat/pipeline';
import { ProblemFeedbackController, type FeedbackRecord, type FeedbackView } from './problem-feedback.js';
import { appendFeedbackRecord } from './session.js';
import { bubbleLines } from '../shared/bubble-lines.js';

const source: SourceDirectProblemBundle = {
  schemaVersion: 'source-direct-problem-bundle-v2', questionId: 'Q', questionNumber: 1, passageId: 'P',
  title: '테스트', exam: '테스트', passage: '중복 게시로 여론이 왜곡될 수 있다.', stem: '옳지 않은 것은?',
  stemPolarity: 'SELECT_INCORRECT', scenario: '', media: [],
  choices: [{ choiceId: 'C1', position: 1, text: '우려를 뒷받침한다.' }, { choiceId: 'C2', position: 2, text: '틀린 진술이다.' }],
  answerChoiceId: 'C2', officialExplanation: '정답 해설: 서로 다른 시민의 견해가 아닐 수 있으므로 왜곡이다.',
};
const metadata: FeedbackEvaluationCall['metadata'] = { provider: 'mock', model: 'fixed', promptVersion: 'problem-feedback-v4', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
function unknown(s: FeedbackSession): FeedbackEvaluationCall {
  if (s.evaluationMode === 'END_EXPLANATION') return { metadata, rawOutput: { firstChoice: '원문에서 중복 게시와 여론의 관계를 비교해 봐.', reselection: s.selections.length === 2 ? '다시 고른 답도 원문과 비교해 봐.' : null, answer: '정답은 여론 왜곡의 관계로 확인할 수 있어.' } };
  const o = s.observations.at(-1)!;
  return { metadata, rawOutput: { mode: 'SELECTION', boundary: 'NONE', reason: '확인할 수 없음',
    reconstructability: 'UNKNOWN', reconstructedPath: [], rationaleImpliedVerdict: 'UNKNOWN', contentAssessment: 'UNKNOWN', insufficiencyKind: 'NONE',
    studentEvidence: [{ observationId: o.observationId, quote: o.command.type === 'SELECT' && o.command.rationale.mode === 'PROVIDED' ? o.command.rationale.text : '모르겠어요' }],
    sourceEvidence: [], errors: [], errorHypothesis: null, selectionMismatchQuestion: null } };
}
function setup(evaluator: FeedbackEvaluator = { async evaluate(s) { return unknown(s); } }) {
  const records: FeedbackRecord[] = [];
  const controller = new ProblemFeedbackController({ evaluator, loadSource: () => source, save: r => { records.push(r); } });
  const view = controller.start('Q'); return { controller, view, records };
}
const select = { type: 'SELECT', choiceId: 'C1', rationale: { mode: 'PROVIDED', text: '모르겠어요' } } as const;
const request = (v: FeedbackView, command: unknown = select, transitionId = 'T1') => ({ transitionId, expectedRevision: v.revision, command });

async function submitSettled(c: ProblemFeedbackController, id: string, raw: unknown) {
  const accepted = await c.submit(id, raw);
  if (accepted.phase === 'AWAITING_EVALUATION') expect(accepted.evaluationStatus).toBe('PROCESSING');
  return c.settled(id);
}

describe('headless API controller', () => {
  it('saves accepted evidence before evaluation and terminal result once; duplicate requests have no side effects', async () => {
    const { controller: c, view: v, records } = setup();
    const req = request(v); const gate = await submitSettled(c, v.sessionId, req);
    const shown = await submitSettled(c, v.sessionId, request(gate, { type: 'END_START', accept: true }, 'accept'));
    const result = await submitSettled(c, v.sessionId, request(shown, { type: 'UNDERSTOOD', answer: true }, 'understood'));
    expect(result.result?.outcome).toBe('COACHING_TERMINATED'); expect(result.result?.answer?.choiceId).toBe('C2');
    expect(records.map(r => r.event)).toEqual(['STARTED', 'SUBMITTED', 'EVALUATED', 'EVALUATED', 'SUBMITTED', 'SUBMITTED']);
    expect(records.at(-1)?.session.result?.resolvedByStudent).toBe(false);
    expect(records.every(r => r.evidenceContext === 'DEVELOPER')).toBe(true);
    expect((await c.submit(v.sessionId, req)).evaluationStatus).toBe('PROCESSING'); expect(records).toHaveLength(6);
    expect(c.get(v.sessionId).transcript.filter(m => m.role === 'STUDENT')).toHaveLength(1);
    expect(c.inspect(v.sessionId).assessments).toHaveLength(1);
    expect(c.get(v.sessionId)).not.toHaveProperty('assessments');
    expect(records.at(-1)?.transcript).toEqual(c.get(v.sessionId).transcript);
    expect(() => c.submit(v.sessionId, { ...req, command: { ...select, choiceId: 'C2' } })).toThrow(/transitionId/);
  });
  it('coalesces in-flight duplicates and rejects concurrent or stale submissions', async () => {
    let resolveCall!: (call: FeedbackEvaluationCall) => void;
    let input!: FeedbackSession;
    const evaluate = vi.fn((s: FeedbackSession) => { if (s.evaluationMode === 'END_EXPLANATION') return Promise.resolve(unknown(s)); input = s; return new Promise<FeedbackEvaluationCall>(r => { resolveCall = r; }); });
    const { controller: c, view: v } = setup({ evaluate });
    const first = c.submit(v.sessionId, request(v)); const second = c.submit(v.sessionId, request(v));
    expect(first).toBe(second); expect((await first).transcript.slice(-2)).toMatchObject([{ role: 'STUDENT' }, { sequence: 'INSTANT', text: '정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.' }]); expect(evaluate).toHaveBeenCalledTimes(1);
    expect(c.get(v.sessionId).evaluationStatus).toBe('PROCESSING');
    expect(() => c.submit(v.sessionId, request(v, select, 'T2'))).toThrow(/평가 중/);
    const accepted = await first; expect(accepted.evaluationStatus).toBe('PROCESSING'); resolveCall(unknown(input)); await c.settled(v.sessionId);
    expect(() => c.submit(v.sessionId, request(v, select, 'T3'))).toThrow(/오래된/);
  });
  it('contract/network failure preserves observation and permits explicit resume without a new choice', async () => {
    let n = 0;
    const { controller: c, view: v, records } = setup({ async evaluate(s) {
      if (++n === 1) throw new Error('network');
      if (n === 2) return { metadata, rawOutput: { invalid: '정답: C2' } };
      return unknown(s);
    } });
    let next = await submitSettled(c, v.sessionId, request(v));
    expect(next.phase).toBe('AWAITING_EVALUATION'); expect(next.evaluationStatus).toBe('RETRYABLE_ERROR');
    next = await submitSettled(c, v.sessionId, request(next, { type: 'RESUME' }, 'R1'));
    expect(next.evaluationStatus).toBe('RETRYABLE_ERROR'); expect(JSON.stringify(next)).not.toContain('invalid');
    next = await submitSettled(c, v.sessionId, request(next, { type: 'RESUME' }, 'R2'));
    expect(next.phase).toBe('AWAITING_END_START'); expect(next.selectionCount).toBe(1);
    expect(records.at(-1)?.session.observations).toHaveLength(1);
    expect(records.filter(r => r.event === 'EVALUATION_FAILED')).toHaveLength(2);
    expect(records.find(r => r.call?.rawOutput && r.event === 'EVALUATION_FAILED')?.call?.rawOutput).toEqual({ invalid: '정답: C2' });
  });
  it('repeat omission calls only end explanation and never deducts points', async () => {
    const evaluate = vi.fn(async (s: FeedbackSession) => unknown(s)); const { controller: c, view: v } = setup({ evaluate });
    let next = await submitSettled(c, v.sessionId, request(v, { ...select, rationale: { mode: 'OMITTED' } }));
    expect(next.phase).toBe('AWAITING_RATIONALE'); expect(next.penaltyEligibleSelections).toBe(1);
    next = await submitSettled(c, v.sessionId, request(next, { type: 'RATIONALE', rationale: { mode: 'OMITTED' } }, 'T2'));
    expect(next.phase).toBe('AWAITING_END_START'); expect(next.pointsDeducted).toBe(0); expect(evaluate).toHaveBeenCalledTimes(1); expect(evaluate.mock.calls[0]?.[0].evaluationMode).toBe('END_EXPLANATION');
  });
  it('invalid or empty input does not change state or write a submission', () => {
    const { controller: c, view: v, records } = setup();
    expect(() => c.submit(v.sessionId, request(v, { ...select, rationale: { mode: 'PROVIDED', text: ' ' } }))).toThrow();
    expect(() => c.submit(v.sessionId, request(v, { type: 'RESUME' }))).toThrow();
    expect(c.get(v.sessionId)).toEqual(v); expect(records).toHaveLength(1);
  });
  it('persists JSONL with version, raw evaluation, observations and results, isolated from old/student logs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'feedback-test-')); const file = join(dir, 'events.jsonl');
    vi.stubEnv('CSAT_PROBLEM_FEEDBACK_LOG', file);
    try {
      const { controller: c, view: v, records } = setup(); const gate = await submitSettled(c, v.sessionId, request(v));
      await submitSettled(c, v.sessionId, request(gate, { type: 'END_START', accept: false }, 'decline'));
      records.forEach(appendFeedbackRecord);
      const restored = readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      expect(restored).toEqual(records); expect(restored.at(-1).session.result.answerRevealed).toBe(true);
    } finally { vi.unstubAllEnvs(); rmSync(dir, { recursive: true }); }
  });
  it('still reads the old CSAT_PROBLEM_FEEDBACK_V4_LOG env name, new name first (D-0173)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'feedback-test-')); const oldFile = join(dir, 'old.jsonl'); const newFile = join(dir, 'new.jsonl');
    try {
      const { controller: c, view: v, records } = setup(); await submitSettled(c, v.sessionId, request(v));
      vi.stubEnv('CSAT_PROBLEM_FEEDBACK_V4_LOG', oldFile);
      appendFeedbackRecord(records[0]!);
      expect(readFileSync(oldFile, 'utf8').trim().split('\n')).toHaveLength(1);
      vi.stubEnv('CSAT_PROBLEM_FEEDBACK_LOG', newFile);
      appendFeedbackRecord(records[0]!);
      expect(readFileSync(newFile, 'utf8').trim().split('\n')).toHaveLength(1);
      expect(readFileSync(oldFile, 'utf8').trim().split('\n')).toHaveLength(1);
    } finally { vi.unstubAllEnvs(); rmSync(dir, { recursive: true }); }
  });
  it('returned views cannot mutate authoritative state', () => {
    const { controller: c, view: v } = setup(); v.question.choices[0]!.choiceId = 'tampered';
    expect(c.get(v.sessionId).question.choices[0]!.choiceId).toBe('C1');
  });
});


describe('controller continuation', () => {
  it('failed end explanation resumes only that call and preserves the committed assessment', async () => {
    const modes: unknown[] = []; let endCalls = 0;
    const { controller: c, view: v, records } = setup({ async evaluate(s) {
      modes.push(s.evaluationMode);
      if (s.evaluationMode === 'END_EXPLANATION' && ++endCalls <= 2) throw new Error('end transport failed');
      return unknown(s);
    } });
    const gate = await submitSettled(c, v.sessionId, request(v));
    await vi.waitFor(() => expect(records.at(-1)?.event).toBe('EVALUATION_FAILED'));
    expect(c.get(v.sessionId).evaluationStatus).toBe('IDLE');
    const failed = await submitSettled(c, v.sessionId, request(gate, { type: 'END_START', accept: true }, 'accept'));
    expect(failed.evaluationStatus).toBe('RETRYABLE_ERROR'); expect(failed.result).toBeNull();
    expect(records.map(r => r.event)).toEqual(['STARTED', 'SUBMITTED', 'EVALUATED', 'EVALUATION_FAILED', 'SUBMITTED', 'EVALUATION_FAILED']);
    expect(records.at(-1)?.session.pendingEnd?.endReason).toBe('RATIONALE_UNVERIFIABLE');
    expect(records.at(-1)?.call).toBeNull();
    const done = await submitSettled(c, v.sessionId, request(failed, { type: 'RESUME' }, 'resume'));
    expect(modes).toEqual(['SELECTION', 'END_EXPLANATION', 'END_EXPLANATION', 'END_EXPLANATION']);
    expect(done.phase).toBe('AWAITING_UNDERSTANDING'); expect(c.inspect(v.sessionId).assessments).toHaveLength(1);
    expect(records.at(-1)?.session.observations).toHaveLength(2);
    expect(JSON.stringify(done)).not.toContain('officialExplanation'); expect(done.result).toBeNull();
  });
  for (const correct of [false, true]) for (const action of ['REQUEST_EXPLANATION', 'other'] as const) {
    it(`keeps post repair buttons in observations only, correct=${correct}, action=${action}`, async () => {
      const { controller: c, view: v, records } = setup({ async evaluate(s) {
        if (s.evaluationMode === 'END_EXPLANATION') return unknown(s);
        const observation = s.observations.at(-1)!;
        const text = observation.command.type === 'CORRECT' ? observation.command.text : '모르겠어요';
        const studentEvidence = [{ observationId: observation.observationId, quote: text }];
        const sourceEvidence = [{ location: 'PASSAGE', quote: source.passage, mediaId: null, visualObservation: null }];
        return { metadata, rawOutput: s.evaluationMode === 'REPAIR' ? {
          mode: 'REPAIR', boundary: 'NONE', reason: '수정 확인', reviewedResponse: studentEvidence[0],
          repairs: s.errors.map(e => ({ errorId: e.errorId, status: 'REPAIRED', studentEvidence })), newErrors: [],
          verificationComplete: true, rationaleSufficient: true, sufficiencyEvidence: studentEvidence,
        } : {
          mode: 'SELECTION', boundary: 'NONE', reason: '내용 오류', reconstructability: 'RECONSTRUCTABLE',
          reconstructedPath: [text], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'ERROR', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
          errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '내용 오류', studentEvidence, sourceEvidence, basis: 'STATED', question: '중복 게시가 여론에 어떤 영향을 줄까요?' }],
          errorHypothesis: null, selectionMismatchQuestion: null,
        } };
      } });
      let next = await submitSettled(c, v.sessionId, request(v, { ...select, choiceId: correct ? 'C2' : 'C1' }));
      next = await submitSettled(c, v.sessionId, request(next, { type: 'CORRECT', errorId: 'E1', text: '중복 게시로 여론이 왜곡됩니다.' }, 'repair'));
      expect(next.phase).toBe('AWAITING_POST_REPAIR_CHOICE');
      const type = action === 'REQUEST_EXPLANATION' ? action : correct ? 'FINISH' : 'RESELECT';
      next = await submitSettled(c, v.sessionId, request(next, { type }, 'button'));
      const transcript = c.get(v.sessionId).transcript;
      expect(transcript.filter(m => m.role === 'STUDENT')).toHaveLength(2);
      expect(transcript.filter(m => m.role === 'STUDENT').at(-1)?.text).toBe('중복 게시로 여론이 왜곡됩니다.');
      expect(transcript.some(m => m.role === 'COACH' && m.text.includes('이번이 마지막 선택이야.'))).toBe(false);
      expect(records.at(-1)?.session.observations.at(-1)?.command.type).toBe(type);
      expect(records.at(-1)?.transcript).toEqual(transcript);
      expect(next.phase).toBe(type === 'RESELECT' ? 'AWAITING_RESELECTION' : type === 'REQUEST_EXPLANATION' ? 'AWAITING_UNDERSTANDING' : 'COMPLETED');
      expect(next.transcript.some(m => m.id.endsWith('-unverifiable-connector'))).toBe(false);
    });
  }
});

describe('background end explanation and transcript sequencing', () => {
  function deferredEnd() {
    let resolve!: (call: FeedbackEvaluationCall) => void;
    let reject!: (reason: Error) => void;
    let snapshot!: FeedbackSession;
    const evaluate = vi.fn(async (s: FeedbackSession) => {
      if (s.evaluationMode !== 'END_EXPLANATION') return unknown(s);
      snapshot = s;
      return new Promise<FeedbackEvaluationCall>((yes, no) => { resolve = yes; reject = no; });
    });
    return { evaluate, complete: () => resolve(unknown(snapshot)), fail: () => reject(new Error('background failed')) };
  }
  it('returns the gate before generation settles; stored success does not change public revision or call again', async () => {
    const deferred = deferredEnd(); const { controller: c, view: v, records } = setup(deferred);
    const gate = await submitSettled(c, v.sessionId, request(v));
    expect(gate.phase).toBe('AWAITING_END_START'); expect(gate.evaluationStatus).toBe('IDLE');
    expect(gate.transcript.slice(-2).map(m => [m.sequence, m.text])).toEqual([['GATE', '정답은 ②번이야.'], ['GATE', '네 답을 하나씩 같이 볼까?']]);
    deferred.complete(); await vi.waitFor(() => expect(records.at(-1)?.session.endExplanation).not.toBeNull());
    expect(c.get(v.sessionId)).toEqual(gate);
    const shown = await submitSettled(c, v.sessionId, request(gate, { type: 'END_START', accept: true }, 'accept'));
    expect(deferred.evaluate).toHaveBeenCalledTimes(2);
    expect(shown.phase).toBe('AWAITING_UNDERSTANDING');
    expect(records.at(-1)?.session.endExplanation?.firstChoice).toBe('원문에서 중복 게시와 여론의 관계를 비교해 봐.');
    expect(shown.transcript.slice(-5).map(m => [m.sequence, m.text])).toEqual([
      ['CONNECTOR', '네가 고른 ①번부터 볼게.'], ['SECTION', '①은 옳은 내용이야. 옳지 않은 것을 고르는 문제니까 ①은 정답이 아니야. 원문에서 중복 게시와 여론의 관계를 비교해 봐.\n\n설명이 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자.'],
      ['CONNECTOR', '이제 ②번이 정답인 이유를 볼게.'], ['SECTION', '정답은 여론 왜곡의 관계로 확인할 수 있어.'], ['QUESTION', '이해됐어?'],
    ]);
    const done = await submitSettled(c, v.sessionId, request(shown, { type: 'UNDERSTOOD', answer: false }, 'understood'));
    expect(done.result?.selfReportedUnderstanding).toBe('NO');
    expect(done.transcript.at(-1)).toMatchObject({ sequence: 'CLOSING', text: '이 문제는 나중에 다시 볼 수 있게 표시해 둘게.' });
    expect(done.transcript.filter(m => m.role === 'STUDENT')).toHaveLength(1);
    expect(records.at(-1)?.transcript).toEqual(done.transcript);
  });
  it('accept during generation joins the same call and applies to the latest public transition', async () => {
    const deferred = deferredEnd(); const { controller: c, view: v, records } = setup(deferred);
    const gate = await submitSettled(c, v.sessionId, request(v));
    const req = request(gate, { type: 'END_START', accept: true }, 'accept');
    const pending = c.submit(v.sessionId, req);
    expect(c.submit(v.sessionId, req)).toBe(pending);
    expect(c.get(v.sessionId)).toMatchObject({ phase: 'AWAITING_EVALUATION', evaluationStatus: 'PROCESSING', revision: gate.revision + 1 });
    expect((await pending).evaluationStatus).toBe('PROCESSING'); deferred.complete(); const shown = await c.settled(v.sessionId);
    expect(shown).toMatchObject({ phase: 'AWAITING_UNDERSTANDING', revision: gate.revision + 2 });
    expect(deferred.evaluate.mock.calls.filter(([s]) => s.evaluationMode === 'END_EXPLANATION')).toHaveLength(1);
    expect(records.at(-1)?.session.observations.at(-1)?.command).toEqual({ type: 'END_START', accept: true });
    expect(shown.transcript.filter(m => m.sequence === 'QUESTION')).toHaveLength(1);
  });
  it('decline during generation records the late output as unused without any public mutation', async () => {
    const deferred = deferredEnd(); const { controller: c, view: v, records } = setup(deferred);
    const gate = await submitSettled(c, v.sessionId, request(v));
    const done = await submitSettled(c, v.sessionId, request(gate, { type: 'END_START', accept: false }, 'decline'));
    expect(done.transcript.at(-1)).toMatchObject({ sequence: 'CLOSING', text: '알겠어. 이 문제는 여기까지야.' });
    deferred.complete(); await vi.waitFor(() => expect(records.at(-1)?.event).toBe('END_EXPLANATION_UNUSED'));
    expect(c.get(v.sessionId)).toEqual(done);
    expect(records.at(-1)?.session.endExplanation).toBeNull();
    expect(records.at(-1)?.call?.rawOutput).toMatchObject({ firstChoice: expect.any(String), answer: expect.any(String) });
    expect(records.at(-1)?.transcript).toEqual(done.transcript);
  });
  it('failed background generation leaves the gate intact; accept retries and RESUME retries only explanation', async () => {
    const deferred = deferredEnd(); const { controller: c, view: v, records } = setup(deferred);
    const gate = await submitSettled(c, v.sessionId, request(v));
    deferred.fail(); await vi.waitFor(() => expect(records.at(-1)?.event).toBe('EVALUATION_FAILED'));
    expect(c.get(v.sessionId)).toEqual(gate);
    const pending = c.submit(v.sessionId, request(gate, { type: 'END_START', accept: true }, 'accept'));
    expect((await pending).evaluationStatus).toBe('PROCESSING'); deferred.fail(); const failed = await c.settled(v.sessionId);
    expect(failed.evaluationStatus).toBe('RETRYABLE_ERROR');
    const retry = c.submit(v.sessionId, request(failed, { type: 'RESUME' }, 'resume'));
    expect((await retry).evaluationStatus).toBe('PROCESSING'); deferred.complete(); const shown = await c.settled(v.sessionId);
    expect(shown.phase).toBe('AWAITING_UNDERSTANDING');
    expect(deferred.evaluate.mock.calls.map(([s]) => s.evaluationMode)).toEqual(['SELECTION', 'END_EXPLANATION', 'END_EXPLANATION', 'END_EXPLANATION']);
    expect(c.inspect(v.sessionId).assessments).toHaveLength(1);
    expect(records.filter(r => r.event === 'EVALUATION_FAILED')).toHaveLength(2);
  });
  it('generates once per session without blocking another session', async () => {
    const releases: (() => void)[] = [];
    const { controller: c, view: v } = setup({ async evaluate(s) {
      if (s.evaluationMode !== 'END_EXPLANATION') return unknown(s);
      return new Promise(resolve => releases.push(() => resolve(unknown(s))));
    } });
    const second = c.start('Q');
    const gates = await Promise.all([submitSettled(c, v.sessionId, request(v)), submitSettled(c, second.sessionId, request(second))]);
    expect(gates.every(g => g.phase === 'AWAITING_END_START')).toBe(true); expect(releases).toHaveLength(2);
    releases.forEach(release => release());
    await vi.waitFor(() => expect(c.get(second.sessionId).revision).toBe(gates[1]!.revision));
  });
});

describe('unverifiable rationale connector', () => {
  it('a reconstructable but insufficient correct rationale is not called unreadable', async () => {
    const { controller: c, view: v } = setup({ async evaluate(s) {
      const call = unknown(s);
      if (s.evaluationMode !== 'SELECTION') return call;
      return { ...call, rawOutput: { ...(call.rawOutput as Record<string, unknown>), reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'INVALID',
        reconstructedPath: ['학생은 같은 시민의 글일 수 있다고 봤다.', '그래서 선지를 적절하지 않다고 판단했다.'], contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'MISSING_LINK',
        sourceEvidence: [{ location: 'PASSAGE', quote: '중복 게시로 여론이 왜곡될 수 있다.', mediaId: null, visualObservation: null }] } };
    } });
    const next = await submitSettled(c, v.sessionId, request(v, { type: 'SELECT', choiceId: 'C2', rationale: { mode: 'PROVIDED', text: '같은 시민의 글일 수 있음' } }));
    expect(next.transcript.filter(m => m.sequence === 'GATE')[0]?.text).toBe('네 근거에서 맞는 부분은 살리고, 더 이어야 할 연결을 같이 채워 볼게.');
  });
  it.each([
    ['provided', 'C1', 'PROVIDED', '네가 쓴 근거만으로는 어떻게 판단했는지 다 알기 어려웠어. 그래서 네 생각을 짐작하지 않고 선지 내용 위주로 볼게.'],
    ['omitted', 'C1', 'OMITTED', '근거를 적지 않아서 어떻게 판단했는지는 알 수 없었어. 선지 내용 위주로 볼게.'],
    ['correct', 'C2', 'PROVIDED', '네 근거만으로는 이 답에 어떻게 이르렀는지 다 보이지는 않았어. 빠진 연결을 같이 채워 볼게.'],
    ['supplement', 'C1', 'OMITTED', '네가 쓴 근거만으로는 어떻게 판단했는지 다 알기 어려웠어. 그래서 네 생각을 짐작하지 않고 선지 내용 위주로 볼게.'],
  ])('%s places the note before the gate and never after acceptance', async (kind, choiceId, mode, text) => {
    const { controller: c, view: v } = setup();
    let next = await submitSettled(c, v.sessionId, request(v, { type: 'SELECT', choiceId, rationale: mode === 'PROVIDED' ? { mode, text: '모르겠어요' } : { mode } }));
    if (mode === 'OMITTED') next = await submitSettled(c, v.sessionId, request(next, { type: 'RATIONALE', rationale: kind === 'supplement' ? { mode: 'PROVIDED', text: '모르겠어요' } : { mode: 'OMITTED' } }, 'supplement'));
    expect(next.transcript.filter(m => m.sequence === 'GATE')[0]?.text).toBe(text);
    if (choiceId === 'C2') expect(next.transcript.some(m => m.text === '정답이야.')).toBe(false);
    next = await submitSettled(c, v.sessionId, request(next, { type: 'END_START', accept: true }, 'accept'));
    const connectors = next.transcript.filter(m => m.sequence === 'CONNECTOR');
    expect(next.transcript.filter(m => m.text === text)).toHaveLength(1);
    expect(connectors.some(m => m.text === text)).toBe(false);
    expect(connectors[0]?.text).toContain('번부터 볼게.');
  });
  it.each([
    ['C1', ['네 답과 근거에 고쳐야 할 부분이 있어서 질문했는데, 방금 답도 정확하지 않았어. 더 묻지 않고 정답을 먼저 알려 줄게.', '정답은 ②번이야.', '네 답을 하나씩 같이 볼까?']],
    ['C2', ['네 근거에 고쳐야 할 부분이 있어서 질문했는데, 방금 답도 정확하지 않았어. 더 묻지 않고 근거를 같이 정리해 볼게.', '네 근거를 하나씩 같이 볼까?']],
  ])('shows correction evidence publicly and removes it after the response; repair failure on %s gets a feedback note', async (choiceId, gates) => {
    const { controller: c, view: v } = setup({ async evaluate(s) {
      if (s.evaluationMode === 'END_EXPLANATION') return unknown(s);
      const o = s.observations.at(-1)!;
      const studentEvidence = [{ observationId: o.observationId, quote: '모르겠어요' }];
      if (s.evaluationMode === 'REPAIR') return { metadata, rawOutput: { mode: 'REPAIR', boundary: 'NONE', reason: '남음', reviewedResponse: studentEvidence[0], repairs: [{ errorId: 'E1', status: 'REMAINING', studentEvidence }], newErrors: [], verificationComplete: true, rationaleSufficient: false, sufficiencyEvidence: [] } };
      const raw = unknown(s).rawOutput as Record<string, unknown>;
      return { metadata, rawOutput: { ...raw, reconstructability: 'RECONSTRUCTABLE', reconstructedPath: ['반대 관계'], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'ERROR', insufficiencyKind: 'NONE', sourceEvidence: [{ location: 'PASSAGE', quote: source.passage, mediaId: null, visualObservation: null }],
        errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '내부 오류 설명', studentEvidence, sourceEvidence: [{ location: 'PASSAGE', quote: source.passage, mediaId: null, visualObservation: null }, { location: 'EXPLANATION', quote: source.officialExplanation, mediaId: null, visualObservation: null }], basis: 'STATED', question: '원문은 어떻게 말해?' }] } };
    } });
    let next = await submitSettled(c, v.sessionId, request(v, { ...select, choiceId }));
    expect(next.correctionHighlights).toEqual([{ location: 'PASSAGE', start: 0, end: source.passage.length, text: source.passage }]);
    expect(JSON.stringify(next)).not.toContain(source.officialExplanation);
    expect(JSON.stringify(next)).not.toContain('내부 오류 설명');
    next = await submitSettled(c, v.sessionId, request(next, { type: 'CORRECT', errorId: 'E1', text: '모르겠어요' }, 'repair'));
    expect(next.correctionHighlights).toEqual([]);
    expect(next.transcript.filter(m => m.sequence === 'GATE').map(m => m.text)).toEqual(gates);
    next = await submitSettled(c, v.sessionId, request(next, { type: 'END_START', accept: true }, 'accept'));
    expect(next.transcript.filter(m => m.sequence === 'CONNECTOR')).toHaveLength(2);
  });
});


describe('instant acceptance contract', () => {
  it.each(['C2', 'C1'])('announces the verdict on the first selection and on reselection %s, never on correction or buttons', async reselected => {
    let calls = 0;
    const { controller: c, view: v } = setup({ async evaluate(s) {
      calls++;
      if (s.evaluationMode === 'END_EXPLANATION') return unknown(s);
      const observation = s.observations.at(-1)!;
      const text = observation.command.type === 'CORRECT' ? observation.command.text : '모르겠어요';
      const studentEvidence = [{ observationId: observation.observationId, quote: text }];
      const sourceEvidence = [{ location: 'PASSAGE', quote: source.passage, mediaId: null, visualObservation: null }];
      if (s.evaluationMode === 'REPAIR') return { metadata, rawOutput: { mode: 'REPAIR', boundary: 'NONE', reason: '수정 확인', reviewedResponse: studentEvidence[0],
        repairs: s.errors.map(e => ({ errorId: e.errorId, status: 'REPAIRED', studentEvidence })), newErrors: [], verificationComplete: true, rationaleSufficient: true, sufficiencyEvidence: studentEvidence } };
      if (s.selections.length === 2) return unknown(s);
      return { metadata, rawOutput: { mode: 'SELECTION', boundary: 'NONE', reason: '내용 오류', reconstructability: 'RECONSTRUCTABLE',
        reconstructedPath: [text], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'ERROR', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
        errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '내용 오류', studentEvidence, sourceEvidence, basis: 'STATED', question: '원문은 어떻게 말해?' }],
        errorHypothesis: null, selectionMismatchQuestion: null } };
    } });
    const instants = () => c.get(v.sessionId).transcript.filter(m => m.sequence === 'INSTANT' && !m.kind).map(m => m.text);
    const first = await c.submit(v.sessionId, request(v, { ...select, choiceId: 'C1' }));
    expect(first.evaluationStatus).toBe('PROCESSING');
    expect(first.transcript.at(-1)).toMatchObject({ sequence: 'INSTANT', text: '정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.' });
    // The same transitionId returns the accepted view and never evaluates twice.
    expect(await c.submit(v.sessionId, request(v, { ...select, choiceId: 'C1' }))).toEqual(first);
    let next = await c.settled(v.sessionId);
    expect(calls).toBe(1);
    expect(next.phase).toBe('AWAITING_CORRECTION');
    next = await submitSettled(c, v.sessionId, request(next, { type: 'CORRECT', errorId: 'E1', text: '중복 게시로 여론이 왜곡돼.' }, 'repair'));
    expect(next.phase).toBe('AWAITING_POST_REPAIR_CHOICE');
    next = await submitSettled(c, v.sessionId, request(next, { type: 'RESELECT' }, 'button'));
    expect(instants()).toHaveLength(1);
    const reselect = await c.submit(v.sessionId, request(next, { ...select, choiceId: reselected }, 'reselect'));
    expect(reselect.transcript.at(-1)).toMatchObject({ sequence: 'INSTANT',
      text: reselected === 'C2' ? '정답이야! 근거도 같이 살펴볼게.' : '정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.' });
    await c.settled(v.sessionId);
    expect(instants()).toHaveLength(2);
  });
  it('omission and rationale supplementation do not add an instant entry', async () => {
    const { controller: c, view: v } = setup();
    const omitted = await c.submit(v.sessionId, request(v, { ...select, rationale: { mode: 'OMITTED' } }));
    expect(omitted.transcript.some(m => m.sequence === 'INSTANT')).toBe(false);
    const supplemented = await c.submit(v.sessionId, request(omitted, { type: 'RATIONALE', rationale: select.rationale }, 'supplement'));
    expect(supplemented.transcript.some(m => m.sequence === 'INSTANT')).toBe(false);
    await c.settled(v.sessionId);
  });
  it('handles evaluation and failure-ledger rejection and permits RESUME', async () => {
    let fail = true;
    const c = new ProblemFeedbackController({ loadSource: () => source,
      evaluator: { async evaluate(s) { if (fail) throw new Error('transport'); return unknown(s); } },
      save(record) { if (record.event === 'EVALUATION_FAILED') throw new Error('ledger'); },
    });
    const v = c.start('Q');
    expect((await c.submit(v.sessionId, request(v))).evaluationStatus).toBe('PROCESSING');
    const failed = await c.settled(v.sessionId);
    expect(failed.evaluationStatus).toBe('RETRYABLE_ERROR');
    fail = false;
    expect((await c.submit(v.sessionId, request(failed, { type: 'RESUME' }, 'resume'))).evaluationStatus).toBe('PROCESSING');
    expect((await c.settled(v.sessionId)).phase).toBe('AWAITING_END_START');
  });
});

describe('wait-done bubble', () => {
  const doneOf = (v: FeedbackView) => v.transcript.filter(m => m.kind === 'WAIT_DONE');
  it('a successful evaluation puts one WAIT_DONE bubble right before the coach bubbles; the same transition keeps the same line', async () => {
    const { controller: c, view: v } = setup();
    const gate = await submitSettled(c, v.sessionId, request(v, select, 'T-done'));
    const done = doneOf(gate);
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ id: 'done-T-done', role: 'COACH', sequence: 'INSTANT', kind: 'WAIT_DONE' });
    expect(bubbleLines.done).toContain(done[0]!.text);
    const index = gate.transcript.findIndex(m => m.kind === 'WAIT_DONE');
    expect(gate.transcript[index - 1]).toMatchObject({ id: 'instant-T-done' });
    expect(gate.transcript.slice(index + 1).every(m => m.sequence === 'GATE')).toBe(true);
    const other = setup(); const gate2 = await submitSettled(other.controller, other.view.sessionId, request(other.view, select, 'T-done'));
    expect(doneOf(gate2)[0]!.text).toBe(done[0]!.text);
  });
  it('a failed evaluation adds no WAIT_DONE bubble, and RESUME success adds exactly one', async () => {
    let fail = true;
    const { controller: c, view: v } = setup({ async evaluate(s) { if (fail) throw new Error('mock'); return unknown(s); } });
    const failed = await submitSettled(c, v.sessionId, request(v, select, 'T-fail'));
    expect(failed.evaluationStatus).toBe('RETRYABLE_ERROR'); expect(doneOf(failed)).toHaveLength(0);
    fail = false;
    const resumed = await submitSettled(c, v.sessionId, request(failed, { type: 'RESUME' }, 'T-resume'));
    expect(doneOf(resumed).map(m => m.id)).toEqual(['done-T-resume']);
  });
  it('end explanation: WAIT_DONE only when the student actually waited for generation', async () => {
    const waited = deferredEndController();
    const gate = await submitSettled(waited.c, waited.v.sessionId, request(waited.v));
    const pending = waited.c.submit(waited.v.sessionId, request(gate, { type: 'END_START', accept: true }, 'accept'));
    await pending; waited.deferred.complete();
    const shown = await waited.c.settled(waited.v.sessionId);
    const dones = doneOf(shown).filter(m => m.id.startsWith('done-end-'));
    expect(dones).toHaveLength(1);
    const index = shown.transcript.indexOf(dones[0]!);
    expect(shown.transcript[index + 1]).toMatchObject({ sequence: 'CONNECTOR' });
    const early = deferredEndController();
    const gate2 = await submitSettled(early.c, early.v.sessionId, request(early.v));
    early.deferred.complete(); await vi.waitFor(() => expect(early.records.at(-1)?.session.endExplanation).not.toBeNull());
    const shown2 = await submitSettled(early.c, early.v.sessionId, request(gate2, { type: 'END_START', accept: true }, 'accept'));
    expect(shown2.phase).toBe('AWAITING_UNDERSTANDING');
    expect(doneOf(shown2).filter(m => m.id.startsWith('done-end-'))).toHaveLength(0);
  });
});
function deferredEndController() {
  let resolve!: (call: FeedbackEvaluationCall) => void;
  let snapshot!: FeedbackSession;
  const deferred = { evaluate: async (s: FeedbackSession): Promise<FeedbackEvaluationCall> => {
    if (s.evaluationMode !== 'END_EXPLANATION') return unknown(s);
    snapshot = s;
    return new Promise<FeedbackEvaluationCall>(yes => { resolve = yes; });
  }, complete: () => resolve(unknown(snapshot)) };
  const { controller: c, view: v, records } = setup(deferred);
  return { c, v, records, deferred };
}
