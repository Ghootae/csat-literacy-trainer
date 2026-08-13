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
import { pathToFileURL } from 'node:url';

import {
  TITLE_EVAL_CONFIG,
  type EvaluatedResponse,
  type GeneratedQuerySet,
  type Gold,
  type EvaluateResponseOptions,
  evaluateResponse,
  propositionEvidenceEvaluator,
  warmResponsePrefix,
} from '@csat/pipeline';

import type {
  AttemptRequest,
  AttemptResponse,
  RestoreResponse,
  TitleRequest,
  TitleResponse,
} from '../shared/contract.js';
import { listPassages, loadContent, toPassageView } from './content.js';
import { appendAttempt, appendTitleAttempt, judgedTitleCount, loadSession, revisedRegions } from './session.js';
import { bestOf, isBlocked, toRecord, toRegionViews, viewsFromRecords } from './view.js';
import { restoreTitleView, toTitleView } from './title-view.js';

const OWNER = 'local'; // D4 — 리포지토리는 처음부터 ownerId를 받는다. 로컬은 고정.

/**
 * 최근 예열 시각. **문단을 여는 요청이 중복으로 와도 한 번만 데운다.**
 *
 * 실측(2026-08-09): 문단 하나를 여는데 예열이 2회씩 돌았다. React `StrictMode`가 개발
 * 모드에서 effect를 두 번 실행하기 때문인데, 두 요청이 같은 초에 나가면 **둘 다 쓰기가
 * 된다** — 캐시는 첫 응답이 스트리밍을 시작해야 읽을 수 있으므로 서로를 재사용하지 못한다.
 * 한 세션에서 $0.19가 그대로 버려졌다.
 *
 * 클라이언트 규율에 기대지 않는다. 새로고침·탭 두 개·프리페치 등 중복 경로는 계속 생긴다.
 * 창은 짧게 잡는다(10초) — TTL(5분)에 가깝게 잡으면 만료 직전에 연 학생이 예열을 못 받는다.
 */
const WARM_DEDUPE_MS = 10_000;

/** 모범 타이틀. 골드 타이틀 노드의 `shortForm`이다 — 공개 조건은 `title-view.ts`가 정한다. */
function titleExemplar(paragraphId: string): string {
  const { gold } = loadContent(paragraphId);
  const node = gold.nodes.find((n) => n.id === gold.titleId);
  return node?.shortForm ?? '';
}
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

type ResponseEvaluator = (
  gold: Gold,
  queries: GeneratedQuerySet,
  response: string,
  cacheDir?: string,
  options?: EvaluateResponseOptions,
) => Promise<EvaluatedResponse>;

export interface LearningServerOptions {
  readonly port?: number;
  readonly budget?: number;
  /** E2E가 실제 API 대신 결정론적 결과를 주입하는 유일한 경계다. */
  readonly responseEvaluator?: ResponseEvaluator;
  readonly warmer?: typeof warmResponsePrefix;
}

/**
 * HTTP 앱을 만들되 listen은 호출자가 결정한다. 운영 진입점은 아래에서 즉시 listen하고,
 * 브라우저 E2E는 같은 라우팅·저장·뷰 조립을 쓰면서 평가기와 포트만 주입한다.
 */
export function createLearningServer(options: LearningServerOptions = {}): ReturnType<typeof createServer> {
  const port = options.port ?? Number(process.env['PORT'] ?? 5174);
  // 인증 없는 터널 노출 시 API 비용을 직접 제한한다. 캐시 히트는 호출하지 않으므로 세지 않는다.
  const budget = options.budget ?? Number(process.env['EVAL_BUDGET'] ?? 60);
  const evalCache = resolve(process.env['CSAT_SESSION_ROOT'] ?? resolve(process.cwd(), 'sessions'), '.eval-cache');
  const attemptPropositionEvaluator = propositionEvidenceEvaluator(
    process.env['PROPOSITION_EVIDENCE_EVALUATOR'],
  );
  const runEvaluation = options.responseEvaluator ?? evaluateResponse;
  const warm = options.warmer ?? warmResponsePrefix;
  let spent = 0;
  const lastWarm = new Map<string, number>();

  const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (req.method === 'OPTIONS') return json(res, 204, {});

    if (req.method === 'GET' && url.pathname === '/api/passages') {
      return json(res, 200, listPassages());
    }

    // 원문만 보낸다 — 골드도 질의도 포함하지 않는다.
    if (req.method === 'GET' && url.pathname.startsWith('/api/passage/')) {
      const id = url.pathname.slice('/api/passage/'.length);
      const content = loadContent(id);
      // **응답을 보낸 뒤 예열한다.** 학생이 문단을 읽고 요약을 쓰기까지 수십 초가 걸리므로
      // 그 사이에 접두부 캐시가 채워진다 — 첫 제출이 미스라서 가장 느리던 문제가 사라진다.
      // 예산에 세지 않는다: 출력 1토큰이고, 어차피 첫 제출에서 낼 쓰기 비용을 앞당길 뿐이다.
      const view = toPassageView(content.passage);
      json(res, 200, view);
      const now = Date.now();
      if (now - (lastWarm.get(id) ?? 0) > WARM_DEDUPE_MS) {
        lastWarm.set(id, now);
        void warm(content.gold, content.queries);
      }
      return;
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

      if (spent >= budget) {
        console.warn(`예산 소진 ${spent}/${budget} — 채점 거부`);
        return json(res, 429, { error: `채점 예산을 다 썼습니다 (${budget}회). 서버를 다시 시작하세요.` });
      }
      spent += 1;
      console.log(`[${new Date().toISOString()}] 채점 ${spent}/${budget}  session=${sessionId}  섹션=${sections.length}`);

      const { gold, queries } = loadContent(paragraphId);
      const evaluated = await runEvaluation(gold, queries, sections.join('\n'), evalCache, {
        propositionEvidenceEvaluator: attemptPropositionEvaluator,
      });
      console.log(
        `[proposition] evaluator=${evaluated.propositionEvaluation.evaluator} ` +
          `latency=${evaluated.propositionEvaluation.latencyMs}ms`,
      );

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

    // 타이틀. 1단계(초기 가설)는 저장만 하고, 최종 타이틀만 채점한다.
    if (req.method === 'POST' && url.pathname.startsWith('/api/title/')) {
      const [paragraphId, sessionId] = url.pathname.slice('/api/title/'.length).split('/');
      if (paragraphId === undefined || sessionId === undefined) {
        return json(res, 400, { error: 'paragraphId와 sessionId가 필요하다' });
      }
      const body = (await readBody(req)) as TitleRequest;
      const text = body.text.trim();
      if (text === '') return json(res, 400, { error: '빈 응답' });

      // **초기 가설은 채점하지 않는다.** 점수·진행에 영향이 없으므로 LLM을 태울 이유가 없고,
      // 최종과 나란히 보여주는 데는 원문이면 충분하다. 저장은 해두므로 나중에 일괄 판정할 수 있다.
      if (body.hypothesisOnly === true) {
        appendTitleAttempt(OWNER, sessionId, paragraphId, {
          at: new Date().toISOString(),
          text,
          judged: false,
        });
        return json(res, 200, {} satisfies TitleResponse);
      }

      const content = loadContent(paragraphId);
      if (content.titleQueries === undefined) {
        return json(res, 400, { error: '이 문단에는 타이틀 질의가 없습니다' });
      }
      if (spent >= budget) {
        console.warn(`예산 소진 ${spent}/${budget} — 타이틀 채점 거부`);
        return json(res, 429, { error: `채점 예산을 다 썼습니다 (${budget}회).` });
      }
      spent += 1;
      console.log(`[${new Date().toISOString()}] 타이틀 ${spent}/${budget}  session=${sessionId}`);

      const prior = loadSession(OWNER, sessionId);
      const attempted = judgedTitleCount(prior) > 0;
      // Title evaluation deliberately stays on the existing query-only path.
      const evaluated = await runEvaluation(content.gold, content.titleQueries, text, evalCache, {
        queryEvaluation: TITLE_EVAL_CONFIG,
      });
      const assessment = evaluated.assessments[0];
      if (assessment === undefined) return json(res, 500, { error: '타이틀 판정 없음' });

      const view = toTitleView({
        assessment,
        compressedRaw: evaluated.rawVerdicts.get('qT3')?.semanticState === 'preserved',
        attempted,
        exemplar: titleExemplar(paragraphId),
      });
      appendTitleAttempt(OWNER, sessionId, paragraphId, {
        at: new Date().toISOString(),
        text,
        judged: true,
        verdict: view.verdict,
        compressed: view.compressed,
      });
      return json(res, 200, { title: view } satisfies TitleResponse);
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
        return json(res, 200, {
          sections: [],
          regions: [],
          rejudgedRegionIds: [],
          blocked: false,
        } satisfies RestoreResponse);
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
      // 타이틀 상태도 함께 되살린다 — 안 그러면 문단을 옮겼다 돌아올 때 타이틀만 사라진다.
      // **채점을 다시 부르지 않는다**: 저장된 판정값으로 화면 계약을 재구성한다.
      const titles = session?.titleAttempts ?? [];
      const initial = titles.find((t) => !t.judged);
      const lastJudged = [...titles].reverse().find((t) => t.judged);
      const judgedCount = titles.filter((t) => t.judged).length;

      return json(res, 200, {
        sections: last.sections,
        regions,
        rejudgedRegionIds: last.targetRegionIds ?? [],
        blocked: isBlocked(regions),
        ...(initial === undefined ? {} : { initialTitle: initial.text }),
        ...(lastJudged === undefined ? {} : { finalTitle: lastJudged.text }),
        ...(lastJudged === undefined
          ? {}
          : {
              title: restoreTitleView(
                lastJudged.verdict,
                lastJudged.compressed === true,
                judgedCount > 1,
                titleExemplar(paragraphId),
              ),
            }),
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

  return server;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const port = Number(process.env['PORT'] ?? 5174);
  createLearningServer({ port }).listen(port, () => {
    console.log(`학습 UI 서버 http://localhost:${port}`);
  });
}
