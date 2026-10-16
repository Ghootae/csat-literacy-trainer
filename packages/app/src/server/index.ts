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
  type DialogueEvaluator,
  type ConditionalMetaGold,
  type SourceDirectProblemEvaluator,
  type FeedbackEvaluator,
  type SimpleEvaluator,
  evaluateResponse,
  propositionEvidenceEvaluator,
  warmResponsePrefix,
} from '@csat/pipeline';

import type {
  AttemptRequest,
  AttemptResponse,
  DialogueResponseRequest,
  DialogueRevisionRequest,
  ProblemActionResponseRequest,
  ProblemInitialSubmissionRequest,
  ProblemRationaleRequest,
  StartProblemRequest,
  PassageTitleRequest,
  PassageTitleResponse,
  RestoreResponse,
  StartDialogueRequest,
  TitleRequest,
  TitleResponse,
} from '../shared/contract.js';
import { DialogueController } from './dialogue.js';
import { ProblemSolvingController } from './problem-solving.js';
import { SimpleDialogueController } from './dialogue-simple.js';
import { ProblemFeedbackV4Controller, type FeedbackV4Record } from './problem-feedback-v4.js';
import {
  findPassageManifestForParagraph,
  listPassages,
  loadContent,
  loadPassageManifest,
  toPassageView,
} from './content.js';
import {
  appendAttempt,
  appendTitleAttempt,
  judgedTitleCount,
  loadPassageSession,
  loadSession,
  markParagraphComplete,
  revisedRegions,
  savePassageTitle,
  JsonlProblemSessionLogger,
} from './session.js';
import { bestOf, isBlocked, toRecord, toRegionViews, viewsFromRecords } from './view.js';
import { restoreTitleView, toTitleView } from './title-view.js';
import { JsonlStudentEvidenceStore } from './student-state.js';

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
  readonly developerMode?: boolean;
  readonly problemFeedbackV4Public?: boolean;
  readonly port?: number;
  readonly budget?: number;
  /** E2E가 실제 API 대신 결정론적 결과를 주입하는 유일한 경계다. */
  readonly responseEvaluator?: ResponseEvaluator;
  readonly warmer?: typeof warmResponsePrefix;
  readonly dialogueEvaluator?: DialogueEvaluator;
  readonly conditionalDialogueEvaluatorFactory?: (assets: ConditionalMetaGold) => DialogueEvaluator;
  readonly dialoguePassageRoot?: string;
  readonly dialogueLogDirectory?: string;
  readonly problemPathEvaluator?: SourceDirectProblemEvaluator;
  readonly problemFeedbackV4Evaluator?: FeedbackEvaluator;
  readonly problemFeedbackV4Save?: (record: FeedbackV4Record) => void;
  readonly dialogueSimpleEvaluator?: SimpleEvaluator;
  readonly dialogueSimpleLogDirectory?: string;
  readonly studentEvidencePath?: string;
  readonly studentFeedbackEnabled?: boolean;
  readonly studentFeedbackPublic?: boolean;
}

/**
 * HTTP 앱을 만들되 listen은 호출자가 결정한다. 운영 진입점은 아래에서 즉시 listen하고,
 * 브라우저 E2E는 같은 라우팅·저장·뷰 조립을 쓰면서 평가기와 포트만 주입한다.
 */
export function createLearningServer(options: LearningServerOptions = {}): ReturnType<typeof createServer> {
  const port = options.port ?? Number(process.env['PORT'] ?? 5174);
  const developerMode = options.developerMode ?? process.env['CSAT_DEVELOPER_MODE'] === '1';
  const problemFeedbackV4Public = options.problemFeedbackV4Public ?? process.env['CSAT_PROBLEM_V4_PUBLIC'] === '1';
  const studentFeedbackEnabled = options.studentFeedbackEnabled ?? process.env['CSAT_STUDENT_FEEDBACK_ENABLED'] === '1';
  const studentFeedbackPublic = options.studentFeedbackPublic ?? process.env['CSAT_STUDENT_FEEDBACK_PUBLIC'] === '1';
  // 인증 없는 터널 노출 시 API 비용을 직접 제한한다. 캐시 히트는 호출하지 않으므로 세지 않는다.
  const budget = options.budget ?? Number(process.env['EVAL_BUDGET'] ?? 60);
  const evalCache = resolve(process.env['CSAT_SESSION_ROOT'] ?? resolve(process.cwd(), 'sessions'), '.eval-cache');
  const attemptPropositionEvaluator = propositionEvidenceEvaluator(
    process.env['PROPOSITION_EVIDENCE_EVALUATOR'],
  );
  const runEvaluation = options.responseEvaluator ?? evaluateResponse;
  const warm = options.warmer ?? warmResponsePrefix;
  const studentEvidence = new JsonlStudentEvidenceStore(options.studentEvidencePath);
  const dialogue = new DialogueController({
    ...(options.conditionalDialogueEvaluatorFactory === undefined ? {} : { conditionalEvaluatorFactory: options.conditionalDialogueEvaluatorFactory }),
    ...(options.dialogueEvaluator === undefined ? {} : { evaluator: options.dialogueEvaluator }),
    ...(options.dialoguePassageRoot === undefined ? {} : { passageRoot: options.dialoguePassageRoot }),
    ...(options.dialogueLogDirectory === undefined ? {} : { logDirectory: options.dialogueLogDirectory }),
    evidenceSink: studentEvidence,
    studentId: OWNER,
  });
  const problemSolving = new ProblemSolvingController({
    ...(options.problemPathEvaluator === undefined ? {} : { evaluator: options.problemPathEvaluator }),
    logger: new JsonlProblemSessionLogger(),
    evidenceSink: studentEvidence,
    studentId: OWNER,
  });
  const problemFeedbackV4 = new ProblemFeedbackV4Controller({
    ...(options.problemFeedbackV4Evaluator === undefined ? {} : { evaluator: options.problemFeedbackV4Evaluator }),
    ...(options.problemFeedbackV4Save === undefined ? {} : { save: options.problemFeedbackV4Save }),
  });
  const dialogueSimple = new SimpleDialogueController({
    ...(options.dialogueSimpleEvaluator === undefined ? {} : { evaluator: options.dialogueSimpleEvaluator }),
    ...(options.dialogueSimpleLogDirectory === undefined ? {} : { logDirectory: options.dialogueSimpleLogDirectory }),
  });
  let spent = 0;
  const lastWarm = new Map<string, number>();

  const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    const feedbackWindowDays = (): number | null => {
      const days = Number(url.searchParams.get('days') ?? 30);
      return Number.isInteger(days) && days >= 1 && days <= 365 ? days : null;
    };
    const hostname = (() => {
      try { return new URL(`http://${req.headers.host ?? ''}`).hostname; } catch { return ''; }
    })();
    const loopbackRequest = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    const studentFeedbackAvailable = studentFeedbackEnabled && (studentFeedbackPublic || loopbackRequest);

    if (req.method === 'OPTIONS') return json(res, 204, {});

    if (req.method === 'GET' && url.pathname === '/api/capabilities') {
      return json(res, 200, { studentFeedbackEnabled: studentFeedbackAvailable });
    }

    if (req.method === 'GET' && url.pathname === '/api/student-state') {
      if (!studentFeedbackAvailable) return json(res, 404, { error: '학생용 정기 피드백이 아직 활성화되지 않았습니다.' });
      const windowDays = feedbackWindowDays();
      if (windowDays === null) return json(res, 400, { error: '피드백 기간은 1~365일의 정수여야 합니다.' });
      return json(res, 200, studentEvidence.report(OWNER, new Date().toISOString(), 'STUDENT', windowDays));
    }

    if (url.pathname.startsWith('/api/developer/')) {
      if (!developerMode) return json(res, 403, { error: '개발자 API가 비활성화돼 있습니다. 개인 테스트 서버에서 CSAT_DEVELOPER_MODE=1로 실행하세요.' });
      if (url.pathname.startsWith('/api/developer/problem-feedback-v4/')) {
        // Existing public developer tunnels must not automatically expose a new paid evaluator.
        if (!loopbackRequest && !(problemFeedbackV4Public && hostname === 'dialogue.cogaxis.net')) return json(res, 404, { error: '문제 피드백 API가 이 주소에 공개되지 않았습니다.' });
        if (req.method === 'POST' && url.pathname === '/api/developer/problem-feedback-v4/session') {
          const body = await readBody(req) as { questionId?: unknown };
          if (typeof body.questionId !== 'string' || !body.questionId.trim()) return json(res, 400, { error: 'questionId가 필요합니다.' });
          return json(res, 200, problemFeedbackV4.start(body.questionId));
        }
        const match = /^\/api\/developer\/problem-feedback-v4\/session\/([^/]+)$/u.exec(url.pathname);
        const inspection = /^\/api\/developer\/problem-feedback-v4\/session\/([^/]+)\/inspect$/u.exec(url.pathname);
        if (inspection && req.method === 'GET') return json(res, 200, problemFeedbackV4.inspect(inspection[1]!));
        if (match) {
          if (req.method === 'GET') return json(res, 200, problemFeedbackV4.get(match[1]!));
          if (req.method === 'POST') return json(res, 200, await problemFeedbackV4.submit(match[1]!, await readBody(req)));
        }
        return json(res, 404, { error: '등록되지 않은 문제 피드백 API입니다.' });
      }
      if (url.pathname.startsWith('/api/developer/dialogue-simple/')) {
        // 유료 평가기를 새로 노출하므로 문제 피드백 v4와 같은 접근 규칙을 쓴다.
        if (!loopbackRequest && !(problemFeedbackV4Public && hostname === 'dialogue.cogaxis.net')) return json(res, 404, { error: '단순 형식 문단 API가 이 주소에 공개되지 않았습니다.' });
        if (req.method === 'POST' && url.pathname === '/api/developer/dialogue-simple/session') {
          const body = await readBody(req) as { passageId?: unknown };
          if (typeof body.passageId !== 'string' || !body.passageId.trim()) return json(res, 400, { error: 'passageId가 필요합니다.' });
          return json(res, 200, dialogueSimple.start(body.passageId));
        }
        const simple = /^\/api\/developer\/dialogue-simple\/session\/([^/]+)(?:\/(respond|navigate|inspect|memo))?$/u.exec(url.pathname);
        if (simple) {
          const [, id, action] = simple;
          if (req.method === 'GET' && action === undefined) return json(res, 200, dialogueSimple.get(id!));
          if (req.method === 'GET' && action === 'inspect') {
            const raw = url.searchParams.get('paragraphIndex');
            const index = raw === null || raw === '' ? NaN : Number(raw);
            if (!Number.isInteger(index) || index < 0) return json(res, 400, { error: 'paragraphIndex가 필요합니다.' });
            return json(res, 200, dialogueSimple.inspect(id!, index));
          }
          if (req.method === 'POST' && action === 'respond') return json(res, 200, await dialogueSimple.respond(id!, await readBody(req)));
          if (req.method === 'POST' && action === 'navigate') return json(res, 200, dialogueSimple.navigate(id!, await readBody(req)));
          if (req.method === 'POST' && action === 'memo') return json(res, 200, dialogueSimple.saveMemo(id!, await readBody(req)));
        }
        return json(res, 404, { error: '등록되지 않은 단순 형식 문단 API입니다.' });
      }
      if (req.method === 'GET' && url.pathname === '/api/developer/map') return json(res, 200, dialogue.developerMap());
      if (req.method === 'GET' && url.pathname === '/api/developer/problem-inspect') return json(res, 200, problemSolving.inspect(url.searchParams.get('sessionId') ?? ''));
      if (req.method === 'GET' && url.pathname === '/api/developer/inspect') return json(res, 200, dialogue.inspect(url.searchParams.get('sessionId') ?? ''));
      if (req.method === 'GET' && url.pathname === '/api/developer/student-state') {
        const context = url.searchParams.get('context') === 'developer' ? 'DEVELOPER' as const : 'STUDENT' as const;
        if (context === 'STUDENT' && !studentFeedbackAvailable) {
          return json(res, 404, { error: '학생 학습 상태는 현재 요청 범위에서 사용할 수 없습니다.' });
        }
        const windowDays = feedbackWindowDays();
        if (windowDays === null) return json(res, 400, { error: '피드백 기간은 1~365일의 정수여야 합니다.' });
        return json(res, 200, studentEvidence.report(OWNER, new Date().toISOString(), context, windowDays));
      }
      if (req.method === 'POST' && url.pathname === '/api/developer/open') {
        const body = (await readBody(req)) as { passageId: string; paragraphIndex: number; sessionId?: string; fresh?: boolean; mode?: import('../shared/contract.js').DialogueMode };
        return json(res, 200, dialogue.openDeveloper(body.passageId, body.paragraphIndex, body.sessionId, body.fresh === true, body.mode));
      }
      return json(res, 404, { error: '등록되지 않은 개발자 API입니다.' });
    }

    if (req.method === 'GET' && url.pathname === '/api/dialogue/passages') {
      return json(res, 200, dialogue.listPassages());
    }

    if (req.method === 'POST' && url.pathname === '/api/problem/session') {
      const body = (await readBody(req)) as StartProblemRequest;
      return json(res, 200, problemSolving.start(body.questionId));
    }

    if (url.pathname.startsWith('/api/problem/session/')) {
      const rest = url.pathname.slice('/api/problem/session/'.length);
      const [sessionId, action] = rest.split('/');
      if (sessionId === undefined || sessionId === '') {
        return json(res, 400, { error: 'sessionId가 필요합니다.' });
      }
      if (req.method === 'GET' && action === undefined) {
        return json(res, 200, problemSolving.get(sessionId));
      }
      if (req.method === 'POST' && action === 'initial') {
        const body = (await readBody(req)) as ProblemInitialSubmissionRequest;
        return json(res, 200, await problemSolving.submitInitial(sessionId, body));
      }
      if (req.method === 'POST' && action === 'rationale') {
        const body = (await readBody(req)) as ProblemRationaleRequest;
        return json(res, 200, await problemSolving.submitRationale(
          sessionId,
          body.rationale,
          body.transitionId,
        ));
      }
      if (req.method === 'POST' && action === 'respond') {
        const body = (await readBody(req)) as ProblemActionResponseRequest;
        return json(res, 200, await problemSolving.respond(sessionId, body));
      }
      if (req.method === 'POST' && action === 'resume') {
        return json(res, 200, await problemSolving.resume(sessionId));
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/dialogue/session') {
      const body = (await readBody(req)) as StartDialogueRequest;
      return json(res, 200, dialogue.start(body.passageId));
    }

    if (url.pathname.startsWith('/api/dialogue/session/')) {
      const rest = url.pathname.slice('/api/dialogue/session/'.length);
      const [sessionId, action] = rest.split('/');
      if (sessionId === undefined || sessionId === '') {
        return json(res, 400, { error: 'sessionId가 필요합니다.' });
      }
      if (req.method === 'GET' && action === undefined) {
        return json(res, 200, dialogue.get(sessionId));
      }
      if (req.method === 'POST' && action === 'respond') {
        if (spent >= budget) {
          return json(res, 429, { error: `채점 예산을 다 썼습니다 (${budget}회). 서버를 다시 시작하세요.` });
        }
        const body = (await readBody(req)) as DialogueResponseRequest;
        spent += 1;
        console.log(`[${new Date().toISOString()}] 대화 채점 ${spent}/${budget} session=${sessionId}`);
        return json(res, 200, await dialogue.respond(sessionId, body.text));
      }
      if (req.method === 'POST' && action === 'advance') {
        return json(res, 200, dialogue.advance(sessionId));
      }
      if (req.method === 'POST' && action === 'question') {
        if (spent >= budget) return json(res, 429, { error: '채점 예산을 다 썼습니다.' });
        spent += 1;
        return json(res, 200, await dialogue.requestQuestion(sessionId));
      }
      if (req.method === 'POST' && action === 'navigate') {
        const body = (await readBody(req)) as { paragraphIndex: number };
        return json(res, 200, dialogue.navigate(sessionId, body.paragraphIndex));
      }
      if (req.method === 'POST' && action === 'revision') {
        const body = (await readBody(req)) as DialogueRevisionRequest;
        return json(res, 200, dialogue.recordRevision(sessionId, body.text));
      }
      if (req.method === 'POST' && action === 'problem') {
        const linked = dialogue.createProblemHandoff(sessionId);
        return json(res, 200, problemSolving.start(linked.questionId, linked.handoff, sessionId, linked.evidenceContext));
      }
    }

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

    // 지문 전체 표제는 현재 비채점 reflection이다. N3 지문 골드가 생기기 전까지 저장·복원만 한다.
    if (url.pathname.startsWith('/api/passage-title/')) {
      const [passageId, sessionId] = url.pathname.slice('/api/passage-title/'.length).split('/');
      if (passageId === undefined || sessionId === undefined) {
        return json(res, 400, { error: 'passageId와 sessionId가 필요하다' });
      }
      loadPassageManifest(passageId); // 등록된 정본 지문만 저장할 수 있다.

      if (req.method === 'GET') {
        const saved = loadPassageSession(OWNER, sessionId);
        if (saved !== undefined && saved.passageId !== passageId) {
          return json(res, 409, { error: '세션의 지문이 요청과 다르다' });
        }
        return json(res, 200, {
          ...(saved === undefined ? {} : { text: saved.text }),
          completedParagraphIds: saved?.completedParagraphIds ?? [],
        } satisfies PassageTitleResponse);
      }

      if (req.method === 'POST') {
        const body = (await readBody(req)) as PassageTitleRequest;
        const text = body.text.trim();
        if (text === '') return json(res, 400, { error: '빈 표제' });
        const existing = loadPassageSession(OWNER, sessionId);
        if (existing !== undefined && existing.passageId !== passageId) {
          return json(res, 409, { error: '세션의 지문이 요청과 다르다' });
        }
        const completed = new Set(existing?.completedParagraphIds ?? []);
        if (!loadPassageManifest(passageId).paragraphIds.every((id) => completed.has(id))) {
          return json(res, 409, { error: '모든 문단을 마친 뒤 지문 표제를 저장할 수 있다' });
        }
        const saved = savePassageTitle(OWNER, sessionId, passageId, text, new Date().toISOString());
        return json(res, 200, {
          ...(saved.text === undefined ? {} : { text: saved.text }),
          completedParagraphIds: saved.completedParagraphIds,
        } satisfies PassageTitleResponse);
      }
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
      if (!view.canRevise && body.passageSessionId !== undefined) {
        const manifest = findPassageManifestForParagraph(paragraphId);
        if (manifest !== undefined) {
          markParagraphComplete(
            OWNER,
            body.passageSessionId,
            manifest.passageId,
            paragraphId,
            new Date().toISOString(),
          );
        }
      }
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
