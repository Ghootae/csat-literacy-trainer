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
const HORSE_ID = set.passages[1]!.passageId;
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

  it('표의 요청이 동작하고, 정오는 숨기며, 리뷰 대상이 아니면 409이고, 공개·다음 지문이 동작한다', async () => {
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
    // 새로 고침 뒤 이어 가기: 문항과 임시 답(정오 없음)
    const resumed = await call(base, 'GET', `${root}/passage/${COG.passageId}/questions`);
    expect(resumed.status).toBe(200);
    const resumedBody = await resumed.json() as { questions: unknown[]; drafts: Record<string, { choiceId: string } | null> };
    expect(resumedBody.questions).toHaveLength(5); expect(resumedBody.drafts[Q12]).toEqual({ choiceId: correctChoice(Q12), rationale: { mode: 'PROVIDED', text: provided(correctChoice(Q12)).rationale.text }, confidence: null });
    expect(JSON.stringify(resumedBody)).not.toContain('answerChoiceId');
    expect((await call(base, 'GET', `${root}/passage/${HORSE_ID}/questions`)).status).toBe(409);
    expect((await call(base, 'GET', `${root}/item/${Q12}/feedback`)).status).toBe(409);
    expect((await call(base, 'GET', `${root}/passage/${COG.passageId}/summary-card`)).status).toBe(409);
    const done = await call(base, 'POST', `${root}/passage/${COG.passageId}/answers-done`);
    expect(done.status).toBe(200); expect(Object.keys(await done.json() as object)).toEqual(['position']);
    expect((await call(base, 'GET', `${root}/passage/${COG.passageId}/questions`)).status).toBe(409);
    expect((await call(base, 'POST', `${root}/item/${Q12}`, provided(wrongChoice(Q12)))).status).toBe(409);
    await controller.idle(); await new Promise(resolve => setTimeout(resolve, 20)); await controller.idle();
    const card = await (await call(base, 'GET', `${root}/passage/${COG.passageId}/summary-card`)).json() as Record<string, unknown>;
    expect(card).toMatchObject({ status: 'ready', correct: 3, total: 5, judging: 0, allRevealed: false, canFinish: false, position: null });
    expect(JSON.stringify(card)).not.toContain('probabilities');
    // 피드백: 리뷰 대상(오답)만, 정답 원출력은 응답에 없다
    expect((await call(base, 'GET', `${root}/item/${Q12}/feedback`)).status).toBe(409);
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/finish`)).status).toBe(409);
    const first = await (await call(base, 'GET', `${root}/item/${Q15}/feedback`)).json() as { phase: string; skippable: boolean };
    expect(first).toMatchObject({ phase: 'AWAITING_RATIONALE', skippable: true });
    expect((await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'x', expectedRevision: 0, command: { type: 'NOPE' } })).status).toBe(400);
    const second = await (await call(base, 'GET', `${root}/item/${Q13}/feedback`)).json() as { phase: string; revision: number; skippable: boolean };
    expect(second).toMatchObject({ phase: 'AWAITING_CORRECTION', skippable: true });
    const skipped = await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'skip', expectedRevision: second.revision, command: { type: 'SKIP' } });
    expect(skipped.status).toBe(200); expect((await skipped.json() as { phase: string }).phase).toBe('AWAITING_END_START');
    expect((await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'stale', expectedRevision: 0, command: { type: 'END_START', accept: false } })).status).toBe(409);
    // 공개: 모두 공개하면 등급이 온다. 잘못된 본문은 400
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/reveal`, {})).status).toBe(400);
    let revealed: { allRevealed: boolean; position: { grade: { mode: number; probabilities: number[] } } | null } | null = null;
    for (const q of COG.questionIds) revealed = await (await call(base, 'POST', `${root}/passage/${COG.passageId}/reveal`, { questionId: q })).json() as typeof revealed;
    expect(revealed!.allRevealed).toBe(true); expect(revealed!.position!.grade.probabilities).toHaveLength(9);
    // 다음 지문: Q13은 교정 질문 단계, Q15는 근거 요청 단계라 둘 다 건너뛰어 끝낸다
    const fifteen = await (await call(base, 'GET', `${root}/item/${Q15}/feedback`)).json() as { revision: number };
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/finish`)).status).toBe(409);
    const skip15 = await (await call(base, 'POST', `${root}/item/${Q15}/feedback`, { transitionId: 'q15-skip', expectedRevision: fifteen.revision, command: { type: 'SKIP' } })).json() as { revision: number };
    const end15 = await (await call(base, 'POST', `${root}/item/${Q15}/feedback`, { transitionId: 'q15-end', expectedRevision: skip15.revision, command: { type: 'END_START', accept: false } })).json() as { phase: string };
    expect(end15.phase).toBe('COMPLETED');
    const thirteen = await (await call(base, 'GET', `${root}/item/${Q13}/feedback`)).json() as { revision: number };
    const end13 = await (await call(base, 'POST', `${root}/item/${Q13}/feedback`, { transitionId: 'q13-end', expectedRevision: thirteen.revision, command: { type: 'END_START', accept: false } })).json() as { phase: string };
    expect(end13.phase).toBe('COMPLETED');
    expect(await (await call(base, 'POST', `${root}/passage/${COG.passageId}/finish`)).json()).toEqual({ status: 'DONE' });
    expect((await call(base, 'POST', `${root}/passage/${COG.passageId}/finish`)).status).toBe(409);
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
  it('개발자 이동 API(dev/*)는 CSAT_DIAGNOSTIC_DEV=1이 없으면 404이고, 있으면 표대로 동작한다(D-0217)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diag-http-dev-')); dirs.push(dir);
    const fb = feedbackFake();
    const controller = new DiagnosticController({ store: new MemoryStore(), feedbackEvaluator: fb.evaluator, summaryEvaluator, summaryLogDirectory: dir,
      diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport });
    const base = await listen({ diagnosticEnabled: true, diagnosticController: controller });
    const created = await (await call(base, 'POST', '/api/diagnostic/participant')).json() as { participantId: string };
    const root = `/api/diagnostic/participant/${created.participantId}`;
    const previous = process.env['CSAT_DIAGNOSTIC_DEV'];
    try {
      delete process.env['CSAT_DIAGNOSTIC_DEV'];
      for (const [method, path] of [['GET', 'dev/map'], ['GET', `dev/passage/${COG.passageId}/summary`], ['GET', `dev/passage/${COG.passageId}/answers`],
        ['POST', `dev/passage/${COG.passageId}/skip`], ['POST', `dev/passage/${COG.passageId}/reset`]] as const) {
        expect((await call(base, method, `${root}/${path}`, method === 'POST' ? { to: 'ANSWERING' } : undefined)).status).toBe(404);
      }
      process.env['CSAT_DIAGNOSTIC_DEV'] = '1';
      const map = await (await call(base, 'GET', `${root}/dev/map`)).json() as { passages: { passageId: string; status: string; questions: unknown[] }[]; resultAvailable: boolean };
      expect(map.passages).toHaveLength(4); expect(map.passages[0]).toMatchObject({ passageId: COG.passageId, status: 'NOT_STARTED' }); expect(map.resultAvailable).toBe(false);
      expect(JSON.stringify(map)).not.toContain('answerChoiceId');
      expect((await call(base, 'GET', `${root}/dev/passage/${COG.passageId}/summary`)).status).toBe(409);
      expect(await (await call(base, 'POST', `${root}/dev/passage/${COG.passageId}/skip`, { to: 'ANSWERING' })).json()).toEqual({ status: 'ANSWERING' });
      expect((await call(base, 'POST', `${root}/dev/passage/${COG.passageId}/skip`, { to: 'ANSWERING' })).status).toBe(409);
      expect((await call(base, 'POST', `${root}/dev/passage/${COG.passageId}/skip`, { to: 'NOPE' })).status).toBe(400);
      await call(base, 'POST', `${root}/item/${Q12}`, provided(correctChoice(Q12)));
      const answers = await (await call(base, 'GET', `${root}/dev/passage/${COG.passageId}/answers`)).json() as { answers: Record<string, { source: string } | null> };
      expect(answers.answers[Q12]).toMatchObject({ source: 'draft' }); expect(answers.answers[Q13]).toBeNull();
      expect((await call(base, 'POST', `${root}/dev/passage/${COG.passageId}/skip`, { to: 'FEEDBACK' })).status).toBe(200);
      expect((await call(base, 'POST', `${root}/dev/item/${Q12}/skip-to`)).status).toBe(404);   // 순서 강제가 없어져 이 API는 없다(D-0218)
      expect(await (await call(base, 'POST', `${root}/dev/passage/${COG.passageId}/reset`)).json()).toEqual({ status: 'NOT_STARTED' });
      expect((await call(base, 'GET', `${root}/dev/nothing`)).status).toBe(404);
      await controller.idle();
    } finally {
      if (previous === undefined) delete process.env['CSAT_DIAGNOSTIC_DEV']; else process.env['CSAT_DIAGNOSTIC_DEV'] = previous;
    }
  });
});
