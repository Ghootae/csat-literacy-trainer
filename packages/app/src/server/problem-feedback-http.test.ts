import { afterEach, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FeedbackEvaluator } from '@csat/pipeline';
import { createLearningServer } from './index.js';
import { loadProblemSolvingBundle } from './content.js';
import type { FeedbackView } from '../shared/problem-feedback.js';
import type { FeedbackRecord } from './problem-feedback.js';

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
  if (!server.listening) { resolve(); return; }
  server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
}))); });
async function server(options: Parameters<typeof createLearningServer>[0] = {}) {
  const app = createLearningServer(options); servers.push(app);
  app.listen(0, '127.0.0.1'); await once(app, 'listening');
  return `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
}
const root = '/api/developer/problem-lab/session';
const questionId = 'information-asymmetry-free-marketplace-q13';
async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  if (headers['host']) return new Promise<Response>((resolve, reject) => {
    const req = httpRequest(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers } }, res => {
      const chunks: Buffer[] = []; res.on('data', c => chunks.push(c as Buffer));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks).toString('utf8'), { status: res.statusCode ?? 500 })));
      res.on('error', reject);
    });
    req.on('error', reject); req.end(JSON.stringify(body));
  });
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
describe('headless HTTP integration', () => {
  it('opens only the approved public host with explicit opt-in, including inspection', async () => {
    const enabled = await server({ developerMode: true, problemFeedbackPublic: true, problemFeedbackSave() {} });
    expect((await post(enabled + root, { questionId }, { host: 'other.example.org' })).status).toBe(404);
    const created = await post(enabled + root, { questionId }, { host: 'dialogue.cogaxis.net' });
    expect(created.status).toBe(200);
    const view = await created.json() as FeedbackView;
    expect((await fetch(`${enabled}${root}/${view.sessionId}/inspect`)).status).toBe(200);
    const disabled = await server({ developerMode: false, problemFeedbackPublic: true });
    expect((await post(disabled + root, { questionId }, { host: 'dialogue.cogaxis.net' })).status).toBe(403);
  });
  it('still accepts the old problem-feedback-v4 API prefix (D-0173)', async () => {
    const enabled = await server({ developerMode: true, problemFeedbackSave() {} });
    const created = await post(`${enabled}/api/developer/problem-feedback-v4/session`, { questionId });
    expect(created.status).toBe(200);
    const view = await created.json() as FeedbackView;
    expect((await fetch(`${enabled}/api/developer/problem-feedback-v4/session/${view.sessionId}`)).status).toBe(200);
    expect((await fetch(`${enabled}${root}/${view.sessionId}/inspect`)).status).toBe(200);
  });
  it.each(['CSAT_PROBLEM_LAB_PUBLIC', 'CSAT_PROBLEM_V4_PUBLIC'])('%s opens the approved public host (old name still accepted, D-0173)', async name => {
    vi.stubEnv(name, '1');
    try {
      const enabled = await server({ developerMode: true, problemFeedbackSave() {} });
      expect((await post(enabled + root, { questionId }, { host: 'dialogue.cogaxis.net' })).status).toBe(200);
      expect((await post(enabled + root, { questionId }, { host: 'other.example.org' })).status).toBe(404);
    } finally { vi.unstubAllEnvs(); }
  });
  it('requires developer mode and keeps public developer hosts closed', async () => {
    const disabled = await server({ developerMode: false });
    expect((await post(disabled + root, { questionId })).status).toBe(403);
    const enabled = await server({ developerMode: true, problemFeedbackSave() {} });
    expect((await post(enabled + root, { questionId }, { host: 'dialogue.example.org' })).status).toBe(404);
    expect((await post(enabled + root, { questionId })).status).toBe(200);
    const legacy = await post(enabled + '/api/problem/session', { questionId });
    expect(legacy.status).toBe(200); expect(await legacy.json()).toMatchObject({ phase: 'AWAITING_INITIAL_CHOICE' });
  });
  it('actual Q13 source runs choice → correction → one reselection → completed without exposing key early', async () => {
    const records: FeedbackRecord[] = [];
    const strategyLog: { sessionId: string; questionId: string; position: number; first: boolean }[] = [];
    const evaluator: FeedbackEvaluator = { async evaluate(s) {
      const o = s.observations.at(-1)!;
      const text = o.command.type === 'CORRECT' ? o.command.text : 'rationale' in o.command && o.command.rationale.mode === 'PROVIDED' ? o.command.rationale.text : '';
      const studentEvidence = [{ observationId: o.observationId, quote: text }];
      const sourceEvidence = [{ location: 'PASSAGE', quote: s.source.passage, mediaId: null, visualObservation: null }];
      return { metadata: { provider: 'mock', model: 'fixed', promptVersion: 'problem-feedback-v4', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
        rawOutput: s.evaluationMode === 'REPAIR' ? {
          mode: 'REPAIR', boundary: 'NONE', reason: '교정 응답에서 여론 왜곡 관계 확인',
          reviewedResponse: studentEvidence[0],
          repairs: s.errors.map(e => ({ errorId: e.errorId, status: 'REPAIRED', studentEvidence })), newErrors: [],
          verificationComplete: true, rationaleSufficient: true, sufficiencyEvidence: studentEvidence, coaching: '여론 왜곡과 우려 강화 관계를 확인합니다.',
        } : {
          mode: 'SELECTION', boundary: 'NONE', reason: '근거를 해당 선지 판단으로 재구성',
          reconstructability: 'RECONSTRUCTABLE', reconstructedPath: [text], rationaleImpliedVerdict: s.choiceImpliedVerdict,
          contentAssessment: s.selections.length === 1 ? 'ERROR' : 'SUPPORTED', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
          errors: s.selections.length === 1 ? [{ errorId: 'E1', errorType: 'CONTENT', description: '여론 왜곡의 결과를 소수 의견의 약화로 오해함',
            studentEvidence, sourceEvidence, basis: 'STATED', question: '같은 사람의 반복 게시가 실제 시민들의 의견으로 오인될 수 있을까요?' }] : [],
          errorHypothesis: null, selectionMismatchQuestion: null, coaching: '여론 왜곡의 사례가 소수 의견의 우려를 강화합니다.',
        } };
    } };
    const base = await server({ developerMode: true, problemFeedbackEvaluator: evaluator, problemFeedbackSave(r) { records.push(r); }, examinerStrategyLog(r) { strategyLog.push(r); } });
    let v = await (await post(base + root, { questionId })).json() as FeedbackView;
    const endpoint = base + root + '/' + v.sessionId;
    async function step(command: unknown, transitionId: string) {
      const response = await post(endpoint, { command, transitionId, expectedRevision: v.revision });
      expect(response.status).toBe(200); v = await response.json() as FeedbackView;
      if (v.phase === 'AWAITING_EVALUATION') {
        expect(v.evaluationStatus).toBe('PROCESSING');
        await vi.waitFor(async () => { v = await (await fetch(endpoint)).json() as FeedbackView; expect(v.evaluationStatus).not.toBe('PROCESSING'); });
      }
    }
    await step({ type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text: '실명 없이도 법 제정이 가능하다는 것을 근거로 소수파는 실명 확인을 주장할 수 없음.' } }, 'T1');
    expect(v.phase).toBe('AWAITING_CORRECTION'); expect(JSON.stringify(v)).not.toContain('answerChoiceId');
    // 정답 노출 방지: COMPLETED 전에는 전략 글도 사용 기록도 없다.
    expect(await (await fetch(`${endpoint}/examiner-strategy`)).json()).toEqual({ available: false });
    expect((await post(`${endpoint}/examiner-strategy/view`, { position: 5 })).status).toBe(400);
    expect(records.at(-1)?.session.errors.map(e => e.kind)).toEqual(['CONTENT']);
    await step({ type: 'CORRECT', errorId: v.activeErrorId, text: '동일인이 여러 이름을 쓴 글이 시민의 진정한 의견으로 오인돼 법 제정에 영향을 줬으므로 우려가 강화됩니다.' }, 'T2');
    expect(v.phase).toBe('AWAITING_POST_REPAIR_CHOICE');
    expect(v.postRepairOptions).toEqual(['RESELECT', 'REQUEST_EXPLANATION']);
    await step({ type: 'RESELECT' }, 'choose-reselect');
    expect(v.phase).toBe('AWAITING_RESELECTION'); expect(v.result).toBeNull();
    const { source } = loadProblemSolvingBundle(questionId);
    await step({ type: 'SELECT', choiceId: source.answerChoiceId, rationale: { mode: 'PROVIDED', text: '헌법 재판소가 실명 확인 의무를 위헌으로 판단했으므로 실명 확인을 하지 않은 플랫폼은 이 규정으로 제재받지 않습니다.' } }, 'T3');
    expect(v.result?.outcome).toBe('VERIFIED_CORRECT'); expect(v.selectionCount).toBe(2);
    expect(v.result?.answerRevealed).toBe(false); expect(v.result?.correctionSucceeded).toBe(true);
    expect((await (await fetch(endpoint)).json()) as FeedbackView).toEqual(v);
    expect(records.at(-1)?.session.observations).toHaveLength(4);
    expect(v.phase).toBe('COMPLETED');
    const strategy = await (await fetch(`${endpoint}/examiner-strategy`)).json() as { available: boolean; firstPosition: number; choices: { position: number; paragraphs: string[] }[] };
    expect(strategy).toMatchObject({ available: true, firstPosition: 5 });
    expect(strategy.choices.map(c => c.position)).toEqual([5]); expect(strategy.choices[0]!.paragraphs.length).toBeGreaterThan(1);
    expect((await post(`${endpoint}/examiner-strategy/view`, { position: 1 })).status).toBe(400);
    expect(strategyLog).toEqual([]);
    expect(await (await post(`${endpoint}/examiner-strategy/view`, { position: 5 })).json()).toEqual({ ok: true });
    expect(strategyLog).toMatchObject([{ sessionId: v.sessionId, questionId, position: 5, first: true }]);
  });
});
