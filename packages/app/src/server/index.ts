/**
 * 학습 UI 서버.
 *
 * **프로세스 경계의 서버 쪽이다** (계획서 `D4`). 채점 코드와 LLM 키가 여기에만 있고,
 * 클라이언트는 화면에 그릴 것만 받는다.
 *
 *   npm run app:server
 */

import { createServer } from 'node:http';
import { resolve } from 'node:path';

import { evaluateResponse } from '@csat/pipeline';

import type { AttemptRequest, AttemptResponse } from '../shared/contract.js';
import { loadContent, toPassageView } from './content.js';
import { appendAttempt, loadSession, revisedRegions } from './session.js';
import { bestOf, isBlocked, toRecord, toRegionViews } from './view.js';

const PORT = Number(process.env['PORT'] ?? 5174);
const OWNER = 'local'; // D4 — 리포지토리는 처음부터 ownerId를 받는다. 로컬은 고정.
const EVAL_CACHE = resolve(process.cwd(), 'sessions', '.eval-cache');

function json(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  });
  res.end(payload);
}

async function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') return json(res, 204, {});

    // 원문만 보낸다 — 골드도 질의도 포함하지 않는다.
    if (req.method === 'GET' && url.pathname.startsWith('/api/passage/')) {
      const id = url.pathname.slice('/api/passage/'.length);
      return json(res, 200, toPassageView(loadContent(id).passage));
    }

    // 최초 제출과 수정이 같은 경로다. 재평가는 항상 전체이므로 처리가 다르지 않고,
    // `regionId`는 어느 영역을 겨냥했는지 기록하고 "다듬기" 소진을 표시할 뿐이다(§2.1).
    if (req.method === 'POST' && url.pathname.startsWith('/api/attempt/')) {
      const [paragraphId, sessionId] = url.pathname.slice('/api/attempt/'.length).split('/');
      if (paragraphId === undefined || sessionId === undefined) {
        return json(res, 400, { error: 'paragraphId와 sessionId가 필요하다' });
      }
      const body = (await readBody(req)) as AttemptRequest;
      const sections = body.sections.map((s) => s.trim()).filter((s) => s !== '');
      if (sections.length === 0) return json(res, 400, { error: '빈 응답' });

      const { gold, queries } = loadContent(paragraphId);
      const evaluated = await evaluateResponse(gold, queries, sections.join('\n'), EVAL_CACHE);

      // 직전까지의 기록으로 "지금까지의 최고"를 만든다. 이번 결과를 넣기 **전에** 잡아야
      // 겨냥하지 않은 영역의 강등을 가릴 수 있다(§2.1).
      const prior = loadSession(OWNER, sessionId);
      const best = bestOf((prior?.attempts ?? []).map((a) => a.regions));
      const revised = revisedRegions(prior);
      const records = evaluated.assessments.map((a) =>
        toRecord(a, evaluated.said.get(a.regionId) ?? [], revised.has(a.regionId)),
      );

      appendAttempt(OWNER, sessionId, paragraphId, {
        at: new Date().toISOString(),
        sections,
        ...(body.regionId === undefined ? {} : { targetRegionId: body.regionId }),
        regions: records,
      });

      const regions = toRegionViews({
        ...evaluated,
        revised: new Set([...revised, ...(body.regionId === undefined ? [] : [body.regionId])]),
        best,
        ...(body.regionId === undefined ? {} : { targetRegionId: body.regionId }),
      });
      return json(res, 200, { regions, blocked: isBlocked(regions) } satisfies AttemptResponse);
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/session/')) {
      const id = url.pathname.slice('/api/session/'.length);
      return json(res, 200, loadSession(OWNER, id) ?? { attempts: [] });
    }

    json(res, 404, { error: 'not found' });
  })().catch((error: unknown) => {
    console.error(error);
    json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  });
});

server.listen(PORT, () => {
  console.log(`학습 UI 서버 http://localhost:${PORT}`);
});
