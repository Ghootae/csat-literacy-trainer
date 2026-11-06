import { afterEach, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLearningServer } from '../index.js';
import { DiagnosticController } from './controller.js';
import { MemoryStore, correctChoice, diagnosisFake, feedbackFake, judgeFake, omitted, provided, set, summaryEvaluator, wrongChoice } from './test-support.js';

const servers: Server[] = []; const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    if (!server.listening) { resolve(); return; }
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
async function listen(options: Parameters<typeof createLearningServer>[0]) {
  const app = createLearningServer(options); servers.push(app); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  return `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
}
const call = (base: string, method: 'GET' | 'POST', path: string, body?: unknown) =>
  fetch(base + path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const [COG] = set.passages as [typeof set.passages[number]];
const [Q12, Q13, Q14, Q15, Q16] = COG.questionIds as [string, string, string, string, string];

describe('진단평가 HTTP', () => {
  it('CSAT_DIAGNOSTIC_ENABLED가 없으면 /api/diagnostic/*는 404이고 본 서비스·개발자 API는 그대로다', async () => {
    const base = await listen({ developerMode: true, diagnosticEnabled: false, problemFeedbackSave() {} });
    expect((await call(base, 'POST', '/api/diagnostic/participant')).status).toBe(404);
    expect((await call(base, 'GET', '/api/diagnostic/participant/123e4567-e89b-12d3-a456-426614174000')).status).toBe(404);
    expect((await call(base, 'POST', '/api/developer/problem-lab/session', { questionId: 'information-asymmetry-free-marketplace-q13' })).status).toBe(200);
    expect((await call(base, 'GET', '/api/dialogue/passages')).status).toBe(200);
  });

  it('환경 변수로도 열린다(CSAT_DIAGNOSTIC_ENABLED=1)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diag-env-')); dirs.push(dir);
    const previous = { enabled: process.env['CSAT_DIAGNOSTIC_ENABLED'], root: process.env['CSAT_DIAGNOSTIC_ROOT'] };
    process.env['CSAT_DIAGNOSTIC_ENABLED'] = '1'; process.env['CSAT_DIAGNOSTIC_ROOT'] = dir;
    try {
      const base = await listen({});
      const created = await call(base, 'POST', '/api/diagnostic/participant');
      expect(created.status).toBe(200); expect((await created.json() as { set: { passages: unknown[] } }).set.passages).toHaveLength(4);
    } finally {
      if (previous.enabled === undefined) delete process.env['CSAT_DIAGNOSTIC_ENABLED']; else process.env['CSAT_DIAGNOSTIC_ENABLED'] = previous.enabled;
      if (previous.root === undefined) delete process.env['CSAT_DIAGNOSTIC_ROOT']; else process.env['CSAT_DIAGNOSTIC_ROOT'] = previous.root;
    }
  });

  it('표의 요청이 동작하고, 정오는 숨기며, 피드백 차례가 아니면 409다', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diag-http-')); dirs.push(dir);
    const fb = feedbackFake({ behavior: q => q === Q13 ? 'ERROR' : 'SUPPORTED' });
    const controller = new DiagnosticController({ store: new MemoryStore(), feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: dir,
      diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
    const base = await listen({ diagnosticEnabled: true, diagnosticController: controller });
    const created = await (await call(base, 'POST', '/api/diagnostic/participant')).json() as { participantId: string; set: { passages: { passageId: string; title: string; questionIds: string[] }[] } };
    expect(created.set.passages[0]).toMatchObject({ passageId: COG.passageId, questionIds: COG.questionIds });
    const root = `/api/diagnostic/participant/${created.participantId}`;
    expect((await (await call(base, 'GET', root)).json() as { passages: unknown[] }).passages).toHaveLength(4);
    // 요약 대화
    const started = await (await call(base, 'POST', `${root}/passage/${COG.passageId}/start`, { summary: true })).json() as { sessionId: string };
    expect(started.sessionId).toBeTruthy();
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/start`, { summary: true })).status).toBe(409);
    const responded = await call(base, 'POST', `${root}/passage/${COG.passageId}/summary/respond`, { transitionId: 't1', paragraphIndex: 0, text: '첫 문단 요약이다.' });
    expect(responded.status).toBe(200);
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/summary/navigate`, { paragraphIndex: 1 })).status).toBe(200);
    const finished = await (await call(base, 'POST', `${root}/passage/${COG.passageId}/summary/finish`)).json() as { questions: unknown[] };
    expect(finished.questions).toHaveLength(5);
    // 문항 답: 정오 없음, answers-done 전 덮어쓰기
    const answers = { [Q12]: provided(correctChoice(Q12)), [Q13]: provided(wrongChoice(Q13)), [Q14]: omitted(correctChoice(Q14)), [Q15]: omitted(wrongChoice(Q15)), [Q16]: provided(correctChoice(Q16)) };
    for (const q of COG.questionIds) {
      const saved = await call(base, 'POST', `${root}/item/${q}`, answers[q]);
      expect(saved.status).toBe(200); expect(await saved.json()).toEqual({ saved: true });
    }
    expect((await call(base, 'POST', `${root}/item/${Q12}`, provided(wrongChoice(Q12)))).status).toBe(200);
    expect((await call(base, 'POST', `${root}/item/${Q12}`, { choiceId: 'X' })).status).toBe(400);
    expect((await call(base, 'POST', `${root}/item/${Q12}`, provided(correctChoice(Q12)))).status).toBe(200);
    expect((await call(base, 'GET', `${root}/item/${Q12}/feedback`)).status).toBe(409);
    expect((await call(base, 'GET', `${root}/passage/${COG.passageId}/summary-card`)).status).toBe(409);
    const done = await call(base, 'POST', `${root}/passage/${COG.passageId}/answers-done`);
    expect(done.status).toBe(200); expect(Object.keys(await done.json() as object)).toEqual(['position']);
    expect((await call(base, 'POST', `${root}/item/${Q12}`, provided(wrongChoice(Q12)))).status).toBe(409);
    await controller.idle(); await new Promise(resolve => setTimeout(resolve, 20)); await controller.idle();
    const card = await (await call(base, 'GET', `${root}/passage/${COG.passageId}/summary-card`)).json() as Record<string, unknown>;
    expect(card).toMatchObject({ status: 'ready', correct: 3, total: 5, omitted: 2 });
    // 피드백 차례: 커서 문항만, 정답 원출력은 응답에 없다
    expect((await call(base, 'GET', `${root}/item/${Q13}/feedback`)).status).toBe(409);
    const first = await (await call(base, 'GET', `${root}/item/${Q12}/feedback`)).json() as { phase: string; skippable: boolean };
    expect(first.phase).toBe('COMPLETED'); expect(first.skippable).toBe(false);
    expect((await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'x', expectedRevision: 0, command: { type: 'NOPE' } })).status).toBe(400);
    const second = await (await call(base, 'GET', `${root}/item/${Q13}/feedback`)).json() as { phase: string; revision: number; skippable: boolean };
    expect(second).toMatchObject({ phase: 'AWAITING_CORRECTION', skippable: true });
    const skipped = await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'skip', expectedRevision: second.revision, command: { type: 'SKIP' } });
    expect(skipped.status).toBe(200); expect((await skipped.json() as { phase: string }).phase).toBe('AWAITING_END_START');
    expect((await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'stale', expectedRevision: 0, command: { type: 'END_START', accept: false } })).status).toBe(409);
    const serialized = JSON.stringify(first) + JSON.stringify(second);
    expect(serialized).not.toContain('answerChoiceId'); expect(serialized).not.toContain('officialExplanation'); expect(serialized).not.toContain('assessments');
    // 결과
    const result = await (await call(base, 'GET', `${root}/result`)).json() as { items: { questionId: string; correct: boolean; answerPosition: number | null }[]; position: { status: string } };
    expect(result.position.status).toBe('ready'); expect(result.items).toHaveLength(5);
    expect(result.items.find(i => i.questionId === Q13)).toMatchObject({ correct: false, answerPosition: set.items[Q13]!.answerPosition });
    expect((await call(base, 'GET', '/api/diagnostic/participant/not-a-uuid')).status).toBe(400);
    expect((await call(base, 'GET', '/api/diagnostic/participant/123e4567-e89b-12d3-a456-426614174000')).status).toBe(404);
    expect((await call(base, 'POST', `${root}/passage/unknown/start`, { summary: false })).status).toBe(404);
  });
});
