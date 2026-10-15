import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { boundaryShowAction, emptySnapshot, type DialogueEvaluator, type DialogueEvaluationInput, type EvaluationResult } from '@csat/pipeline';
import { DialogueController } from './dialogue.js';

type S = 'PASS' | 'UNCLEAR_OK' | 'UNCLEAR_SERIOUS' | 'ERROR';
const root = mkdtempSync(resolve(tmpdir(), 'boundary-show-controller-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/** 모의 평가기: 호출마다 스크립트된 축 상태를 돌려주고, 모의 V4처럼 boundaryShowAction이 ASK일 때만 질문을 만든다. */
function scripted(script: readonly (readonly S[])[]) {
  const calls: DialogueEvaluationInput[] = [];
  const evaluator: DialogueEvaluator = {
    async evaluate(input) {
      calls.push(input);
      const statuses = script[calls.length - 1]!;
      const axisFeedback = input.gold.centralAxes.map((axis, i) => ({ axisId: axis.id, status: statuses[i] ?? statuses[0]!, reason: '근거', revealedText: null }));
      const action = boundaryShowAction(axisFeedback, input.questionsAsked);
      const ask = action === 'ASK' && input.questionsAsked < input.maxQuestions;
      const result: EvaluationResult = {
        status: axisFeedback.some((a) => a.status === 'ERROR') ? 'ERROR' : action === 'PASS_THROUGH' && axisFeedback.every((a) => a.status === 'PASS') ? 'PASS' : 'UNCLEAR',
        decisionSummary: '모의', studentFeedback: '모의 피드백', targetIssue: null,
        nextQuestion: ask ? { type: 'DIAGNOSTIC', text: '모의 질문' } : null,
        snapshot: { ...emptySnapshot(), turn: input.turn, axisFeedback },
      };
      return { result, call: { provider: 'mock' as const, model: 'mock', effort: 'none' as const, promptVersion: 'mock', schemaVersion: 'mock', goldVersion: input.goldVersion, goldHash: input.goldHash, calledAt: '2026-10-15T00:00:00Z', durationMs: 1 } };
    },
  };
  return { evaluator, calls };
}
const lines = (name: string) => readFileSync(resolve(root, 'v4-boundary-show', name), 'utf8').trim().split('\n');

describe('개발자 경계 보여 주기 모드 (D-0134)', () => {
  it('학생 화면에서는 시작할 수 없고 개발자에게만 열린다', () => {
    const c = new DialogueController({ logDirectory: root });
    expect(() => c.start('corporate-law', false, 'v4-boundary-show')).toThrow('개발자 전용');
    const s = c.openDeveloper('corporate-law', 1, undefined, true, 'v4-boundary-show');
    expect(s.mode).toBe('v4-boundary-show');
    expect(s.canRequestQuestion).toBe(false);
    expect(s.boundaryShow).toBeNull();
  });

  it('SHOW: 질문 없이 maxQuestions 1·canRequestQuestion false·밑줄이 자산 구간과 일치한다', async () => {
    const { evaluator, calls } = scripted([['UNCLEAR_SERIOUS', 'PASS']]);
    const c = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => evaluator });
    const s = c.openDeveloper('gongsun-long-later-mohists', 1, undefined, true, 'v4-boundary-show');
    const shown = await c.respond(s.sessionId, '내 요약');
    expect(calls).toHaveLength(1);
    expect(shown.step?.maxQuestions).toBe(1);
    expect(shown.step?.question).toBeNull();
    expect(shown.canRequestQuestion).toBe(false);
    expect(shown.canRespond).toBe(false);
    const b = shown.boundaryShow!;
    expect(b.action).toBe('SHOW');
    expect(b.initialResponse).toBe('내 요약');
    expect(b.guidance).toBe('GAP');
    expect(b.assetStatus).toBe('OK');
    expect(b.underlines).toHaveLength(1);
    expect(b.centralObject.slice(b.underlines[0]!.start, b.underlines[0]!.end)).toBe('물·실·명의 관계');
    expect(b.underlines[0]!.axisIds).toEqual(['AX1']);
    await expect(c.requestQuestion(s.sessionId)).rejects.toThrow();
  });

  it('같은 구간을 가진 두 축은 밑줄 하나로 합쳐진다(공손룡 p4)', async () => {
    const { evaluator } = scripted([['UNCLEAR_SERIOUS', 'UNCLEAR_SERIOUS'], ['UNCLEAR_SERIOUS', 'PASS']]);
    const c = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => evaluator });
    const s = c.openDeveloper('gongsun-long-later-mohists', 3, undefined, true, 'v4-boundary-show');
    const asked = await c.respond(s.sessionId, '첫 응답');
    expect(asked.step?.question).toBe('모의 질문');
    expect(asked.boundaryShow).toBeNull();
    const done = await c.respond(s.sessionId, '둘째 응답');
    const b = done.boundaryShow!;
    expect(b.action).toBe('SHOW');
    expect(b.initialResponse).toBe('첫 응답');
    expect(b.underlines.map((u) => b.centralObject.slice(u.start, u.end))).toEqual(['다중 명–실 대응']);
    expect(b.underlines[0]!.axisIds).toEqual(['AX1']);
  });

  it('2차 응답에 ERROR가 남으면 guidance가 ERROR이고, 2차 OK만이면 통과한다', async () => {
    const err = scripted([['ERROR'], ['ERROR', 'UNCLEAR_OK']]);
    const c = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => err.evaluator });
    const s = c.openDeveloper('gongsun-long-later-mohists', 1, undefined, true, 'v4-boundary-show');
    await c.respond(s.sessionId, '첫 응답');
    const b = (await c.respond(s.sessionId, '둘째 응답')).boundaryShow!;
    expect(b.action).toBe('SHOW');
    expect(b.guidance).toBe('ERROR');
    const ok = scripted([['UNCLEAR_SERIOUS'], ['PASS', 'UNCLEAR_OK']]);
    const c2 = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => ok.evaluator });
    const s2 = c2.openDeveloper('gongsun-long-later-mohists', 1, undefined, true, 'v4-boundary-show');
    await c2.respond(s2.sessionId, '첫 응답');
    expect((await c2.respond(s2.sessionId, '둘째 응답')).boundaryShow?.action).toBe('PASS_THROUGH');
  });

  it('자산이 없는 문단은 MISSING이고 밑줄 없이 중심 대상만 보여 준다', async () => {
    const { evaluator } = scripted([['UNCLEAR_SERIOUS', 'PASS', 'PASS', 'PASS']]);
    const c = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => evaluator });
    const s = c.openDeveloper('dopamine-motor-control', 0, undefined, true, 'v4-boundary-show');
    const b = (await c.respond(s.sessionId, '요약')).boundaryShow!;
    expect(b.action).toBe('SHOW');
    expect(b.assetStatus).toBe('MISSING');
    expect(b.underlines).toEqual([]);
    expect(b.centralObject.length).toBeGreaterThan(0);
  });

  it('고쳐 쓰기는 판정 호출 없이 한 줄만 기록하고 빈 문자열은 거부한다', async () => {
    const { evaluator, calls } = scripted([['UNCLEAR_SERIOUS', 'PASS']]);
    const c = new DialogueController({ logDirectory: root, boundaryShowEvaluatorFactory: () => evaluator });
    const s = c.openDeveloper('gongsun-long-later-mohists', 1, undefined, true, 'v4-boundary-show');
    await c.respond(s.sessionId, '내 요약');
    expect(() => c.recordRevision(s.sessionId, '  ')).toThrow('비어');
    const revised = c.recordRevision(s.sessionId, ' 고쳐 쓴 요약 ');
    expect(calls).toHaveLength(1);
    expect(revised.boundaryShow?.revision).toBe('고쳐 쓴 요약');
    const logged = lines('revisions.jsonl');
    expect(logged).toHaveLength(1);
    const row = JSON.parse(logged[0]!);
    expect(row).toMatchObject({ sessionId: s.sessionId, paragraphId: 'gongsun-long-later-mohists-p2', initialResponse: '내 요약', revision: '고쳐 쓴 요약', underlinedAxisIds: ['AX1'] });
    expect(typeof row.at).toBe('string');
  });

  it('운영 v4 세션에서는 고쳐 쓰기를 쓸 수 없고 boundaryShow 필드도 없다', () => {
    const c = new DialogueController({ logDirectory: root });
    const s = c.openDeveloper('gongsun-long-later-mohists', 1, undefined, true, 'v4');
    expect('boundaryShow' in s).toBe(false);
    expect(() => c.recordRevision(s.sessionId, '텍스트')).toThrow();
  });
});
