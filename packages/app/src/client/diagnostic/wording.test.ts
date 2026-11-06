import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TWIST_ORDER } from '../../server/diagnostic/reading.js';
import { BRANCH_WORDING, OTHER_TWIST_NAME, STEP_WORDING, TWIST_CODES, TWIST_WORDING } from './wording.js';

const markdown = readFileSync(resolve(process.cwd(), 'docs/review/sns-diagnostic-student-wording-draft-2026-11-06.md'), 'utf8');
const section = (from: string, to: string) => markdown.split(from)[1]!.split(to)[0]!;
const tableRows = (text: string) => text.split('\n').filter(line => line.startsWith('|') && !line.startsWith('|---') && !line.startsWith('| 코드') && !line.startsWith('| 갈래'))
  .map(line => line.trim().replace(/^\||\|$/gu, '').split('|').map(cell => cell.trim()));

describe('학생용 표현 상수 ↔ D-0209 확정본', () => {
  it('비틂 14종: 코드 순서·학생용 이름(★ 표시 제외)·한 줄 설명이 글자 하나까지 같다', () => {
    const rows = tableRows(section('## 1. 비틂 14종', '## 2.'));
    expect(rows).toHaveLength(14);
    expect(TWIST_CODES).toEqual(rows.map(row => row[0]!.replace(/`/gu, '')));
    for (const row of rows) {
      const code = row[0]!.replace(/`/gu, '') as keyof typeof TWIST_WORDING;
      expect(TWIST_WORDING[code]).toEqual({ name: row[1]!.replace(/^★/u, ''), line: row[2] });
    }
  });
  it('서버의 추천 순서 상수가 확정본 표 순서와 같다', () => { expect([...TWIST_ORDER]).toEqual(TWIST_CODES); });
  it('OTHER는 이름 대신 "그 밖의 함정"이고 표에 없다', () => {
    expect(OTHER_TWIST_NAME).toBe('그 밖의 함정'); expect(markdown).toContain('꼬리표는 "그 밖의 함정"'); expect(TWIST_CODES).not.toContain('OTHER' as never);
  });
  it('관계 4갈래: 학생용 이름·한 줄 설명이 같다', () => {
    const rows = tableRows(section('## 2. 관계 4갈래', '## 3.'));
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(BRANCH_WORDING[row[0] as keyof typeof BRANCH_WORDING]).toEqual({ name: row[1], line: row[2] });
  });
  it('무너진 단계 다섯 개: 발문·선지 해석·근거 위치·근거 해석·대조', () => {
    expect(section('## 3. 그대로 쓰는 것', '## 4.')).toContain('발문·선지 해석·근거 위치·근거 해석·대조');
    expect(Object.values(STEP_WORDING)).toEqual(['발문', '선지 해석', '근거 위치', '근거 해석', '대조']);
    expect(Object.keys(STEP_WORDING)).toEqual(['S1_STEM', 'S2_CHOICE', 'S3_LOCATE', 'S4_INTERPRET', 'S5_JUDGE']);
  });
});
