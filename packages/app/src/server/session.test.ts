/**
 * 세션 저장. **두 append 함수가 서로의 필드를 지우지 않는지**가 핵심이다 —
 * 실제로 영역 제출이 초기 가설을 날린 적이 있다(2026-08-10).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  appendAttempt,
  appendTitleAttempt,
  judgedTitleCount,
  loadPassageSession,
  loadSession,
  markParagraphComplete,
  savePassageTitle,
} from './session.js';

const cwd = process.cwd();
let dir: string;

beforeAll(() => {
  dir = mkdtempSync(resolve(tmpdir(), 'csat-session-'));
  process.chdir(dir);
});
afterAll(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

const attempt = { at: '2026-08-10T00:00:00Z', sections: ['요약'], regions: [] };

describe('세션 — 영역과 타이틀이 한 파일에 남는다', () => {
  it('★ 영역 제출이 초기 가설을 지우지 않는다', () => {
    appendTitleAttempt('o', 's1', 'p', { at: 'T0', text: '첫 짐작', judged: false });
    appendAttempt('o', 's1', 'p', attempt);
    const s = loadSession('o', 's1');
    expect(s?.titleAttempts).toHaveLength(1);
    expect(s?.titleAttempts?.[0]?.text).toBe('첫 짐작');
    expect(s?.attempts).toHaveLength(1);
  });

  it('★ 타이틀 제출이 영역 기록을 지우지 않는다', () => {
    appendAttempt('o', 's2', 'p', attempt);
    appendTitleAttempt('o', 's2', 'p', { at: 'T1', text: '최종', judged: true, verdict: 'relation_preserved' });
    const s = loadSession('o', 's2');
    expect(s?.attempts).toHaveLength(1);
    expect(s?.titleAttempts).toHaveLength(1);
  });

  it('초기 가설은 다듬기 소진에 세지 않는다', () => {
    appendTitleAttempt('o', 's3', 'p', { at: 'T0', text: '짐작', judged: false });
    expect(judgedTitleCount(loadSession('o', 's3'))).toBe(0);
    appendTitleAttempt('o', 's3', 'p', { at: 'T1', text: '최종', judged: true, verdict: 'topic_only' });
    expect(judgedTitleCount(loadSession('o', 's3'))).toBe(1);
  });
});

describe('지문 표제 세션', () => {
  it('문단 세션과 분리해 저장하고 다시 불러온다', () => {
    appendAttempt('o', 'paragraph-session', 'photosynthesis-p6', attempt);
    markParagraphComplete('o', 'passage-session', 'photosynthesis', 'photosynthesis-p6', 'T1');
    savePassageTitle('o', 'passage-session', 'photosynthesis', '광합성의 환경 적응 전략', 'T2');

    expect(loadSession('o', 'paragraph-session')?.paragraphId).toBe('photosynthesis-p6');
    expect(loadPassageSession('o', 'passage-session')).toEqual({
      ownerId: 'o',
      passageId: 'photosynthesis',
      startedAt: 'T1',
      completedParagraphIds: ['photosynthesis-p6'],
      text: '광합성의 환경 적응 전략',
      savedAt: 'T2',
    });
  });

  it('수정 저장해도 최초 시작 시각은 유지한다', () => {
    savePassageTitle('o', 'passage-revision', 'photosynthesis', '첫 표제', 'T0');
    savePassageTitle('o', 'passage-revision', 'photosynthesis', '수정 표제', 'T1');
    expect(loadPassageSession('o', 'passage-revision')).toEqual(
      expect.objectContaining({ startedAt: 'T0', savedAt: 'T1', text: '수정 표제' }),
    );
  });

  it('완료한 문단을 중복 없이 누적한다', () => {
    markParagraphComplete('o', 'passage-progress', 'photosynthesis', 'photosynthesis-p1', 'T0');
    markParagraphComplete('o', 'passage-progress', 'photosynthesis', 'photosynthesis-p1', 'T1');
    markParagraphComplete('o', 'passage-progress', 'photosynthesis', 'photosynthesis-p2', 'T2');
    expect(loadPassageSession('o', 'passage-progress')?.completedParagraphIds).toEqual([
      'photosynthesis-p1',
      'photosynthesis-p2',
    ]);
  });
});
