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

import type { AttemptRequest, AttemptResponse, RestoreResponse } from '../shared/contract.js';
import { listPassages, loadContent, toPassageView } from './content.js';
import { appendAttempt, loadSession, revisedRegions } from './session.js';
import { bestOf, isBlocked, toRecord, toRegionViews, viewsFromRecords } from './view.js';

const PORT = Number(process.env['PORT'] ?? 5174);
const OWNER = 'local'; // D4 — 리포지토리는 처음부터 ownerId를 받는다. 로컬은 고정.
const EVAL_CACHE = resolve(process.cwd(), 'sessions', '.eval-cache');

/**
 * 채점 호출 예산 (서버 기동당).
 *
 * 이 서버는 인증이 없고 `ANTHROPIC_API_KEY`를 들고 있다. 터널로 외부에 노출하면 URL을 아는
 * 누구나 채점을 호출해 크레딧을 태울 수 있다. 인증을 붙이면 클라이언트까지 복잡해지므로,
 * **실질 위험인 비용에 직접 상한을 건다.** 캐시 히트는 API를 부르지 않으므로 세지 않는다.
 */
const BUDGET = Number(process.env['EVAL_BUDGET'] ?? 60);
let spent = 0;

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

    if (req.method === 'GET' && url.pathname === '/api/passages') {
      return json(res, 200, listPassages());
    }

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

      if (spent >= BUDGET) {
        console.warn(`예산 소진 ${spent}/${BUDGET} — 채점 거부`);
        return json(res, 429, { error: `채점 예산을 다 썼습니다 (${BUDGET}회). 서버를 다시 시작하세요.` });
      }
      spent += 1;
      console.log(`[${new Date().toISOString()}] 채점 ${spent}/${BUDGET}  session=${sessionId}  섹션=${sections.length}`);

      const { gold, queries } = loadContent(paragraphId);
      const evaluated = await evaluateResponse(gold, queries, sections.join('\n'), EVAL_CACHE);

      // 직전까지의 기록으로 "지금까지의 최고"를 만든다. 이번 결과를 넣기 **전에** 잡아야
      // 겨냥하지 않은 영역의 강등을 가릴 수 있다(§2.1).
      const prior = loadSession(OWNER, sessionId);
      const best = bestOf((prior?.attempts ?? []).map((a) => a.regions));
      const revised = revisedRegions(prior);
      const targets = new Set(body.regionIds ?? []);
      // **이번 시도의 겨냥까지 포함해 기록한다.** `revised`(직전까지)만으로 만들면 이번에
      // 고친 영역의 정답 공개가 기록에 빠져, 나중에 복원할 때 화면이 그때와 달라진다.
      const attempted = new Set([...revised, ...targets]);
      const records = evaluated.assessments.map((a) =>
        toRecord(a, evaluated.said.get(a.regionId) ?? [], attempted.has(a.regionId)),
      );

      appendAttempt(OWNER, sessionId, paragraphId, {
        at: new Date().toISOString(),
        sections,
        ...(targets.size === 0 ? {} : { targetRegionIds: [...targets] }),
        regions: records,
      });

      const regions = toRegionViews({ ...evaluated, revised: attempted, best, targetRegionIds: targets });
      return json(res, 200, { regions, blocked: isBlocked(regions) } satisfies AttemptResponse);
    }

    // 이어하기. **채점을 부르지 않는다** — 저장된 기록에 제출 때와 같은 표시 규칙을 다시 적용할 뿐이다.
    if (req.method === 'GET' && url.pathname.startsWith('/api/attempt/')) {
      const [paragraphId, sessionId] = url.pathname.slice('/api/attempt/'.length).split('/');
      if (paragraphId === undefined || sessionId === undefined) {
        return json(res, 400, { error: 'paragraphId와 sessionId가 필요하다' });
      }
      const session = loadSession(OWNER, sessionId);
      const attempts = session?.attempts ?? [];
      const last = attempts[attempts.length - 1];
      if (last === undefined) {
        return json(res, 200, { sections: [], regions: [], blocked: false } satisfies RestoreResponse);
      }
      const { queries } = loadContent(paragraphId);
      const sentenceIds = new Map(queries.regions.map((r) => [r.regionId, r.sourceSentenceIds]));
      const regions = viewsFromRecords({
        records: last.regions,
        // 마지막 시도를 뺀 나머지가 그 시점의 "지금까지 최고"다 — 제출 때와 같은 계산.
        best: bestOf(attempts.slice(0, -1).map((a) => a.regions)),
        targetRegionIds: new Set(last.targetRegionIds ?? []),
        revised: revisedRegions(session),
        sentenceIds,
      });
      return json(res, 200, {
        sections: last.sections,
        regions,
        blocked: isBlocked(regions),
      } satisfies RestoreResponse);
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
