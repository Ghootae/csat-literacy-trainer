import { describe, expect, it } from 'vitest';
import type { DevMapPassage, DevMapQuestion, DevMapView } from './dev-api.js';
import { buildFlow, neighbor, passageCells, resolveKey } from './dev-flow.js';

const q = (n: number, patch: Partial<DevMapQuestion> = {}): DevMapQuestion => ({ questionId: `q${n}`, questionNumber: n, answered: false, draft: false, firstJudgment: 'NONE', feedbackPhase: null, skipped: false, reviewTarget: true, reviewDone: false, ...patch });
const passage = (id: string, patch: Partial<DevMapPassage> = {}): DevMapPassage => ({ passageId: id, title: id, status: 'NOT_STARTED', summaryChosen: null, summarySkipped: false,
  paragraphs: [{ paragraphId: `${id}-p1`, position: 1, answered: false }, { paragraphId: `${id}-p2`, position: 2, answered: false }], questions: [q(1), q(2)], ...patch });
const states = (cells: ReturnType<typeof passageCells>) => cells.map(c => `${c.label}:${c.status}`);

describe('개발자 지도 칸(D-0217)', () => {
  it('시작 전 지문: 요약 선택 · 답 입력 · 지문 결과 · 문항(리뷰 대상), 요약 칸은 없다', () => {
    expect(states(passageCells(passage('A')))).toEqual(['요약 선택:CURRENT', '답 입력:NOT_YET', '지문 결과:NOT_YET', '1번:NOT_YET', '2번:NOT_YET']);
  });
  it('요약 중: 문단마다 칸, 첫 응답이 있으면 완료', () => {
    const cells = passageCells(passage('A', { status: 'SUMMARY', summaryChosen: true, paragraphs: [{ paragraphId: 'a', position: 1, answered: true }, { paragraphId: 'b', position: 2, answered: false }] }));
    expect(states(cells).slice(0, 2)).toEqual(['문단 1:DONE', '문단 2:CURRENT']);
    expect(cells[0]!.paragraphIndex).toBe(0);
  });
  it('요약을 건너뛰었거나 안 골랐으면 요약 칸 하나가 건너뜀이다', () => {
    expect(states(passageCells(passage('A', { status: 'ANSWERING', summaryChosen: null, summarySkipped: true })))[0]).toBe('요약:SKIPPED');
    expect(states(passageCells(passage('A', { status: 'ANSWERING', summaryChosen: false })))[0]).toBe('요약:SKIPPED');
  });
  it('피드백 중: 검토 마친 문항 완료, 아직인 문항 미진행, 판정 중·실패 표시, 리뷰 대상이 아닌 문항은 칸이 없다', () => {
    const cells = passageCells(passage('A', { status: 'FEEDBACK', summaryChosen: false,
      questions: [q(1, { answered: true, reviewDone: true }), q(2, { answered: true }), q(3, { answered: true, reviewTarget: false }), q(4, { answered: true, firstJudgment: 'PENDING' }),
        q(5, { answered: true, firstJudgment: 'FAILED' }), q(6, { skipped: true })] }));
    expect(states(cells).slice(3)).toEqual(['1번:DONE', '2번:NOT_YET', '4번:JUDGING', '5번:FAILED', '6번:SKIPPED']);
    expect(states(cells)[2]).toBe('지문 결과:DONE');
  });
  it('모두 건너뛴 DONE 지문: 답 입력·지문 결과·문항이 건너뜀', () => {
    const cells = passageCells(passage('A', { status: 'DONE', summaryChosen: null, summarySkipped: true, questions: [q(1, { skipped: true }), q(2, { skipped: true })] }));
    expect(states(cells)).toEqual(['요약:SKIPPED', '답 입력:SKIPPED', '지문 결과:SKIPPED', '1번:SKIPPED', '2번:SKIPPED']);
  });
  it('AWAITING_JUDGMENT: 지문 결과는 판정 중', () => {
    expect(states(passageCells(passage('A', { status: 'AWAITING_JUDGMENT', summaryChosen: false, questions: [q(1, { answered: true, firstJudgment: 'PENDING' }), q(2, { answered: true })] }))))
      .toEqual(['요약:SKIPPED', '답 입력:DONE', '지문 결과:JUDGING', '1번:JUDGING', '2번:NOT_YET']);
  });
});

describe('개발자 흐름 한 줄(D-0217)', () => {
  const map: DevMapView = { passages: [passage('A', { status: 'DONE', summaryChosen: false, questions: [q(1, { answered: true }), q(2, { answered: true })] }), passage('B')], resultAvailable: true };
  const flow = buildFlow(map);
  it('지문 순서대로 칸이 이어지고 맨 끝이 결과다', () => {
    expect(flow.map(c => c.key)).toEqual(['A:summary', 'A:answer', 'A:mid', 'A:q:q1', 'A:q:q2', 'B:choose', 'B:answer', 'B:mid', 'B:q:q1', 'B:q:q2', 'result']);
  });
  it('이전·다음은 한 칸씩이고 양 끝에서는 없다', () => {
    expect(neighbor(flow, 'A:q:q2', 1)?.key).toBe('B:choose');
    expect(neighbor(flow, 'B:choose', 1)?.key).toBe('B:answer');
    expect(neighbor(flow, 'B:choose', -1)?.key).toBe('A:q:q2');
    expect(neighbor(flow, 'A:summary', -1)).toBeNull();
    expect(neighbor(flow, 'result', 1)).toBeNull();
  });
  it('요약 선택이 끝나 사라진 칸은 같은 지문의 첫 칸으로 옮겨 잡는다', () => {
    expect(resolveKey(flow, 'A:choose')).toBe('A:summary');
    expect(resolveKey(flow, 'B:answer')).toBe('B:answer');
  });
});
