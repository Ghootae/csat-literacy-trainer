/**
 * SNS 진단평가 API(`/api/diagnostic/*`) 처리. `CSAT_DIAGNOSTIC_ENABLED=1`일 때만 index.ts가 이 처리기를 부른다.
 * 응답에는 정답·판정 원출력·오류 설명을 넣지 않는다(원출력은 저장소에만 있다).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod/v4';
import { DiagnosticHttpError, type DiagnosticController } from './controller.js';

const PREFIX = '/api/diagnostic/';
const PARTICIPANT = /^\/api\/diagnostic\/participant\/([^/]+)(?:\/(.*))?$/u;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' });
  res.end(JSON.stringify(body));
}

export function isDiagnosticPath(pathname: string): boolean { return pathname.startsWith(PREFIX); }

/** 처리했으면 true. 오류는 상태 코드(400·404·409)로 바꿔 응답한다. */
export async function handleDiagnosticRequest(controller: DiagnosticController, req: IncomingMessage, res: ServerResponse,
  pathname: string, readBody: (req: IncomingMessage) => Promise<unknown>,
  /** 개발자 이동 API(D-0217) 사용 여부. 없으면 환경 변수 CSAT_DIAGNOSTIC_DEV=1. */
  dev: boolean = process.env['CSAT_DIAGNOSTIC_DEV'] === '1'): Promise<void> {
  try {
    const body = async (): Promise<unknown> => { try { return await readBody(req); } catch { throw new DiagnosticHttpError(400, '요청 본문이 올바른 JSON이 아닙니다.'); } };
    const method = req.method ?? 'GET';
    if (method === 'POST' && pathname === '/api/diagnostic/participant') return send(res, 200, controller.create());
    const match = PARTICIPANT.exec(pathname);
    if (!match) return send(res, 404, { error: '등록되지 않은 진단평가 API입니다.' });
    const id = match[1]!; const rest = match[2] ?? '';
    if (rest === '' && method === 'GET') return send(res, 200, controller.progress(id));
    if (rest === 'result' && method === 'GET') return send(res, 200, controller.result(id));
    if (dev && rest.startsWith('dev/')) {
      const devRoute = /^dev\/(?:(map)|passage\/([^/]+)\/(summary|answers|skip|reset))$/u.exec(rest);
      if (devRoute) {
        const [, isMap, passageId, passageAction] = devRoute;
        if (method === 'GET' && isMap) return send(res, 200, controller.devMap(id));
        if (method === 'GET' && passageAction === 'summary') {
          const index = Number(new URL(req.url ?? '', 'http://localhost').searchParams.get('paragraph') ?? '0');
          return send(res, 200, controller.devSummary(id, passageId!, Number.isInteger(index) ? index : -1));
        }
        if (method === 'GET' && passageAction === 'answers') return send(res, 200, controller.devAnswers(id, passageId!));
        if (method === 'POST' && passageAction === 'skip') return send(res, 200, controller.devSkipPassage(id, passageId!, await body()));
        if (method === 'POST' && passageAction === 'reset') return send(res, 200, controller.devReset(id, passageId!));
      }
      return send(res, 404, { error: '등록되지 않은 진단평가 API입니다.' });
    }
    const passage = /^passage\/([^/]+)\/(start|answers-done|summary-card|reveal|finish|questions|summary\/(?:respond|navigate|finish))$/u.exec(rest);
    if (passage) {
      const [, passageId, action] = passage as unknown as [string, string, string];
      if (method === 'POST' && action === 'start') return send(res, 200, controller.start(id, passageId, await body()));
      if (method === 'POST' && action === 'summary/respond') return send(res, 200, await controller.summaryRespond(id, passageId, await body()));
      if (method === 'POST' && action === 'summary/navigate') return send(res, 200, controller.summaryNavigate(id, passageId, await body()));
      if (method === 'POST' && action === 'summary/finish') return send(res, 200, controller.summaryFinish(id, passageId));
      if (method === 'POST' && action === 'answers-done') return send(res, 200, controller.answersDone(id, passageId));
      if (method === 'GET' && action === 'questions') return send(res, 200, controller.answerDrafts(id, passageId));
      if (method === 'POST' && action === 'reveal') return send(res, 200, controller.reveal(id, passageId, await body()));
      if (method === 'POST' && action === 'finish') return send(res, 200, controller.finish(id, passageId));
      if (method === 'GET' && action === 'summary-card') return send(res, 200, controller.summaryCard(id, passageId));
    }
    const item = /^item\/([^/]+)(\/feedback|\/confirm)?$/u.exec(rest);
    if (item) {
      const questionId = item[1]!;
      if (method === 'POST' && item[2] === '/confirm') return send(res, 200, controller.confirmItem(id, questionId, await body()));
      if (method === 'POST' && !item[2]) return send(res, 200, controller.submitItem(id, questionId, await body()));
      if (method === 'GET' && item[2] === '/feedback') return send(res, 200, controller.feedbackView(id, questionId));
      if (method === 'POST' && item[2] === '/feedback') return send(res, 200, await controller.feedbackSubmit(id, questionId, await body()));
    }
    return send(res, 404, { error: '등록되지 않은 진단평가 API입니다.' });
  } catch (error) {
    if (error instanceof DiagnosticHttpError) return send(res, error.status, { error: error.message });
    if (error instanceof ZodError) return send(res, 400, { error: '요청 형식이 올바르지 않습니다.' });
    throw error;
  }
}
