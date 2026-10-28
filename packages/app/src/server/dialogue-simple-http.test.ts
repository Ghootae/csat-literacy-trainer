import { afterEach, describe, expect, it } from 'vitest';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SimpleEvaluator, SimpleOutput } from '@csat/pipeline';
import { createLearningServer } from './index.js';
import { loadDialoguePassages } from './content.js';
import type { SimpleDialogueView, SimpleInspection } from '../shared/dialogue-simple.js';

const servers: Server[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => {
    if (!server.listening) { resolve(); return; }
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  })));
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const passage = loadDialoguePassages().find(p => p.paragraphs.length > 0)!;
const root = '/api/developer/dialogue-simple/session';
const praise: SimpleOutput = { category: 'CAPTURED', reason: 'r', coreParts: [{ description: '핵심', sourceQuote: passage.paragraphs[0]!.text }], corePartsCovered: [true], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '잘 잡았어', corePartSummaries: [], closingFeedback: null, coreSourceQuote: null };
const evaluator: SimpleEvaluator = { async complete() {
  return { rawOutput: praise, metadata: { provider: 'mock', model: 'mock', promptVersion: 'paragraph-simple-holistic-v4.2', durationMs: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0 } };
} };
async function server(options: Parameters<typeof createLearningServer>[0] = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'simple-http-')); dirs.push(dir);
  const app = createLearningServer({ developerMode: true, dialogueSimpleEvaluator: evaluator, dialogueSimpleLogDirectory: dir, ...options });
  servers.push(app); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  return { base: `http://127.0.0.1:${(app.address() as AddressInfo).port}`, dir };
}
function send(url: string, method: 'GET' | 'POST', body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<Response>((resolve, reject) => {
    const req = httpRequest(url, { method, headers: { 'content-type': 'application/json', ...headers } }, res => {
      const chunks: Buffer[] = []; res.on('data', c => chunks.push(c as Buffer));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks).toString('utf8'), { status: res.statusCode ?? 500 })));
      res.on('error', reject);
    });
    req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

describe('dialogue-simple HTTP', () => {
  it('접근 규칙: 개발자 모드 필요, loopback 허용, 비공개 host 404, 공개 플래그가 켜진 dialogue.cogaxis.net만 허용', async () => {
    const off = await server({ developerMode: false });
    expect((await send(off.base + root, 'POST', { passageId: passage.passageId })).status).toBe(403);
    const closed = await server();
    expect((await send(closed.base + root, 'POST', { passageId: passage.passageId })).status).toBe(200);
    expect((await send(closed.base + root, 'POST', { passageId: passage.passageId }, { host: 'dialogue.example.org' })).status).toBe(404);
    expect((await send(closed.base + root, 'POST', { passageId: passage.passageId }, { host: 'dialogue.cogaxis.net' })).status).toBe(404);
    expect((await send(closed.base + root + '/x/inspect?paragraphIndex=0', 'GET', undefined, { host: 'other.example.org' })).status).toBe(404);
    const open = await server({ problemFeedbackPublic: true });
    expect((await send(open.base + root, 'POST', { passageId: passage.passageId }, { host: 'dialogue.cogaxis.net' })).status).toBe(200);
    expect((await send(open.base + root, 'POST', { passageId: passage.passageId }, { host: 'other.example.org' })).status).toBe(404);
  });

  it('세션 시작 -> 응답 -> 이동 -> 조회 -> inspect -> 메모, 학생 상태 원장에는 쓰지 않는다', async () => {
    const ledgerDir = mkdtempSync(join(tmpdir(), 'simple-ledger-')); dirs.push(ledgerDir);
    const studentEvidencePath = join(ledgerDir, 'evidence.jsonl');
    const { base, dir } = await server({ studentEvidencePath });
    const created = await (await send(base + root, 'POST', { passageId: passage.passageId })).json() as SimpleDialogueView;
    expect(created.paragraphs).toHaveLength(passage.paragraphs.length);
    expect(JSON.stringify(created)).not.toContain('goldPath');
    const responded = await send(`${base}${root}/${created.sessionId}/respond`, 'POST', { transitionId: 'a', paragraphIndex: 0, text: '내 요약' });
    expect(responded.status).toBe(200);
    const view = await responded.json() as SimpleDialogueView;
    expect(view.current).toMatchObject({ done: true, evaluationStatus: 'IDLE' });
    expect(view.current.messages.at(-1)).toMatchObject({ role: 'tutor', text: expect.stringMatching(/잘했어~$/), label: '피드백' });
    const last = passage.paragraphs.length - 1;
    const nav = await (await send(`${base}${root}/${created.sessionId}/navigate`, 'POST', { paragraphIndex: last })).json() as SimpleDialogueView;
    expect(nav.currentIndex).toBe(last);
    expect(((await (await send(`${base}${root}/${created.sessionId}`, 'GET')).json()) as SimpleDialogueView).currentIndex).toBe(last);
    const inspect = await (await send(`${base}${root}/${created.sessionId}/inspect?paragraphIndex=0`, 'GET')).json() as SimpleInspection;
    expect(inspect.attempts[0]!.steps[0]).toMatchObject({ action: 'PRAISE', expectedAction: 'PRAISE', studentText: '내 요약' });
    const memo = await send(`${base}${root}/${created.sessionId}/memo`, 'POST', { paragraphIndex: 0, attemptNumber: 1, stepIndex: 0, text: '인상' });
    expect(memo.status).toBe(200);
    await send(`${base}${root}/${created.sessionId}/memo`, 'POST', { paragraphIndex: 0, attemptNumber: null, stepIndex: null, text: '문단 인상' });
    const again = await (await send(`${base}${root}/${created.sessionId}/inspect?paragraphIndex=0`, 'GET')).json() as SimpleInspection;
    expect(again.memos).toEqual({ paragraph: '문단 인상' }); expect(again.attempts[0]!.memos.steps).toEqual({ 0: '인상' });
    expect(readFileSync(join(dir, 'memos.jsonl'), 'utf8').trim().split('\n')).toHaveLength(2);
    expect(existsSync(join(dir, 'sessions.jsonl'))).toBe(true);
    expect(existsSync(studentEvidencePath)).toBe(false);
    const second = await send(`${base}${root}/${created.sessionId}/attempt`, 'POST', { paragraphIndex: 0 });
    expect(second.status).toBe(200);
    expect(((await second.json()) as SimpleDialogueView).current).toMatchObject({ attemptNumber: 2, messages: [], restatedSummary: null });
    expect((await send(`${base}${root}/${created.sessionId}/attempt`, 'POST', { paragraphIndex: 0 })).status).toBeGreaterThanOrEqual(400);
    expect((await send(`${base}${root}/${created.sessionId}/attempt`, 'POST', { paragraphIndex: 0 }, { host: 'other.example.org' })).status).toBe(404);
    expect((await send(`${base}${root}/${created.sessionId}/inspect`, 'GET')).status).toBe(400);
    expect((await send(`${base}${root}/${created.sessionId}/unknown`, 'POST', {})).status).toBe(404);
  });
});
