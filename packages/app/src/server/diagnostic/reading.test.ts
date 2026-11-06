import { describe, expect, it } from 'vitest';
import { unitsForParagraph } from '@csat/pipeline';
// 스크립트(집계 기준 구현)와 대조한다. 스크립트는 .mjs라 타입이 없다.
// @ts-expect-error mjs 스크립트
import { aggregate } from '../../../../../scripts/aggregate-student-fingerprint.mjs';
// @ts-expect-error mjs 스크립트
import { assemble } from '../../../../../scripts/run-analysis-judge-gongsun.mjs';
// @ts-expect-error mjs 스크립트
import { BRANCHES as SCRIPT_BRANCHES } from '../../../../../scripts/run-relation-classify.mjs';
import { loadAnalysisMaps, loadChoiceLinkTargets, loadClassifyTypes, loadDiagnosticSet } from './content.js';
import {
  BRANCH_TYPES, BRANCHES, LAYERS, TWIST_ORDER, addCounts, copyOverlap, countParagraph, emptyCounts, judgedUnitIndex, paragraphLabel, pickTwist, resolveTargetId, summaryLink,
} from './reading.js';

const set = loadDiagnosticSet();
const LABELS = ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS', null] as const;

describe('분류 상수와 분류 자료', () => {
  it('갈래 대응이 스크립트 BRANCHES와 같다', () => {
    expect(Object.entries(BRANCH_TYPES)).toEqual(SCRIPT_BRANCHES);
  });
  it('세트 E 지도 5개의 판정 대상 관계가 모두 classify 파일에 있다', () => {
    for (const passage of set.passages) {
      const maps = loadAnalysisMaps(passage); const classify = loadClassifyTypes(passage);
      expect(classify).toHaveLength(maps.length);
      maps.forEach(({ map }, i) => {
        for (const paragraphId of new Set(map.propositions.map(p => p.paragraphId))) {
          for (const relation of unitsForParagraph(map, paragraphId).relations) expect(classify[i]!.has(relation.id), `${passage.passageId} ${relation.id}`).toBe(true);
        }
      });
    }
  });
});

/** 지도의 모든 문단을 첫 차례 한 번씩 판정한 가짜 자료로 스크립트 aggregate와 새 함수의 층·갈래 칸을 대조한다. */
describe('집계 동치(스크립트 aggregate)', () => {
  for (const seed of [1, 2, 3]) {
    it(`가짜 판정 seed ${seed}: 층·갈래 칸의 (D+P, N, 자체 C)가 같다`, () => {
      let expectedInherited = 0; let expectedCross = 0; let mine = emptyCounts();
      const passages = [];
      for (const passage of set.passages) {
        const maps = loadAnalysisMaps(passage); const classify = loadClassifyTypes(passage);
        for (const [i, { map }] of maps.entries()) {
          const paragraphIds = [...new Set(map.propositions.map(p => p.paragraphId))];
          const rounds = paragraphIds.map(paragraphId => ({ dialogueId: `d-${paragraphId}`, roundIndex: 1, sessionId: 's', source: 'v', paragraphId,
            dialogue: [{ role: 'student', text: '가나다라마바사 아자차카타파하.' }], copiedSource: false }));
          const judgmentRows: unknown[] = []; const judgments = new Map<string, Record<string, { finalLabel: string | null }>>();
          let n = 0;
          for (const paragraphId of paragraphIds) {
            const units = unitsForParagraph(map, paragraphId); const row: Record<string, { finalLabel: string | null }> = {};
            for (const [kind, list] of [['node', units.nodes], ['relation', units.relations]] as const) for (const unit of list) {
              n++;
              // 노드 ✕와 그 노드를 끝으로 하는 관계 ✕가 함께 나오도록 ✕를 넉넉히 둔다.
              const label = LABELS[(n * (seed + 2) + (n % 7) * seed) % LABELS.length]!;
              row[unit.id] = { finalLabel: label };
              judgmentRows.push({ jobId: `d-${paragraphId}|1|${kind}|${unit.id}`, status: 'OK', finalLabel: label, quoteChecks: [] });
            }
            judgments.set(paragraphId, row);
          }
          // 라벨이 null인 단위는 '판정 없음'(스크립트도 같은 방식으로 분모에서 뺀다): 행을 만들지 않는다.
          const rows = (judgmentRows as { finalLabel: string | null }[]).filter(r => r.finalLabel !== null);
          const combined = assemble(rounds, map, rows);
          passages.push({ passageId: `${passage.passageId}-${i}`, map, rounds, judgmentRows: rows, combined, classify: { items: [...classify[i]!].map(([id, type]) => ({ id, type })) } });
          for (const paragraphId of paragraphIds) {
            const typeOf = classify[i]!;
            mine = addCounts(mine, countParagraph(map, paragraphId, judgments.get(paragraphId)!, typeOf));
          }
        }
      }
      const fp = aggregate({ passages, groupBy: 'source' });
      const all = fp.groups.find((g: { key: string }) => g.key === 'ALL').views.first as { layers: Record<string, any>; branches: Record<string, any>; types: Record<string, any> };
      expectedCross = fp.excludedCrossRelations; expectedInherited = Object.values(all.branches).reduce((sum: number, cell: any) => sum + cell.Cinherited, 0);
      expect(expectedCross).toBeGreaterThan(0); expect(expectedInherited).toBeGreaterThan(0);   // 문단을 넘는 관계와 물려받은 오류가 실제로 들어간 자료다
      for (const layer of LAYERS) {
        const c = all.layers[layer];
        expect(mine.layers[layer]).toEqual({ caught: c.D + c.P, total: c.D + c.P + c.A + c.C });
      }
      for (const branch of BRANCHES) {
        const c = all.branches[branch];
        expect(mine.branches[branch]).toEqual({ caught: c.D + c.P, total: c.D + c.P + c.A + c.C, wrong: c.C });
      }
      expect(Object.values(mine.branches).reduce((sum, cell) => sum + cell.total, 0)).toBeGreaterThan(0);
    });
  }
  it('분류에 없는 관계 id가 세지게 되면 던진다', () => {
    const { map } = loadAnalysisMaps(set.passages[1]!)[0]!;
    const paragraphId = map.propositions[0]!.paragraphId;
    expect(() => countParagraph(map, paragraphId, {}, new Map())).toThrow(/classify/u);
  });
});

describe('요약과 틀린 문항 연결', () => {
  const horse = set.passages[1]!;
  const { map } = loadAnalysisMaps(horse)[0]!;
  const unitIndexes = [judgedUnitIndex(map)];
  const dirs = horse.analysisMaps.map(m => m.mapPath.split('/').at(-2)!);
  const positionOf = (paragraphId: string) => Number(/-p(\d+)$/u.exec(paragraphId)![1]);
  const judged = (label: string) => ({ status: 'OK', finalLabel: label });
  const input = (ids: string[], judgments: Record<string, unknown>, paragraphs = ['horse-race-reporting-p1', 'horse-race-reporting-p2']) => ({
    targetIds: ids, mapDirectories: dirs, unitIndexes, positionOf,
    analysisOf: (paragraphId: string) => paragraphs.includes(paragraphId) ? { judgments } : undefined,
  });
  it('하나라도 CONTRADICTS면 MISREAD, 아니면 하나라도 ABSENT면 MISSED, 모두 잡았으면 CAUGHT이고 문단은 중복 없이 오름차순이다', () => {
    expect(summaryLink(input(['P1-1', 'P2-4'], { 'P1-1': judged('DIRECT'), 'P2-4': judged('CONTRADICTS') }))).toMatchObject({ status: 'ready', kind: 'MISREAD', paragraphs: [1, 2], paragraphLabel: '1·2문단' });
    expect(summaryLink(input(['P2-4', 'P1-1'], { 'P1-1': judged('ABSENT'), 'P2-4': judged('PARTIAL') }))).toMatchObject({ status: 'ready', kind: 'MISSED', paragraphs: [1, 2] });
    expect(summaryLink(input(['P1-1'], { 'P1-1': judged('PARTIAL') }))).toMatchObject({ status: 'ready', kind: 'CAUGHT', paragraphs: [1] });
  });
  it('관계는 양 끝 문단을 모두 쓴다', () => {
    const cross = map.relations.find(r => { const owner = unitIndexes[0]!.get(r.id); return owner && owner.endParagraphIds.length === 2; })!;
    const info = unitIndexes[0]!.get(cross.id)!;
    const result = summaryLink(input([cross.id], { [cross.id]: judged('DIRECT') }, [info.ownerParagraphId]))!;
    expect(result.paragraphs).toEqual(info.endParagraphIds.map(positionOf).sort((a, b) => a - b));
    expect(result.paragraphs.length).toBe(2);
  });
  it('판정 중이면 pending, 실패면 failed, 요약하지 않은 문단·판정하지 않는 단위뿐이면 null이다', () => {
    expect(summaryLink(input(['P1-1'], {}))?.status).toBe('pending');
    expect(summaryLink(input(['P1-1', 'P2-4'], { 'P1-1': judged('DIRECT'), 'P2-4': { status: 'FAILED' } }))?.status).toBe('failed');
    expect(summaryLink(input(['P1-1'], { 'P1-1': judged('DIRECT') }, []))).toBeNull();
    const top = map.nodes.find(n => n.kind === 'TOP' || n.kind === 'CROSS')?.id ?? 'TOP';
    expect(summaryLink(input([top, 'X999'], {}))).toBeNull();
    expect(summaryLink(input([], {}))).toBeNull();
  });
  it('의식과 인지는 id 앞의 가./나.로 (가)·(나) 지도를 고른다', () => {
    const dirsCog = ['consciousness-cognition-ga', 'consciousness-cognition-na'];
    expect(resolveTargetId('가.P2-6', dirsCog)).toEqual({ mapIndex: 0, localId: 'P2-6' });
    expect(resolveTargetId('나.R20', dirsCog)).toEqual({ mapIndex: 1, localId: 'R20' });
    expect(resolveTargetId('P2-6', dirsCog)).toBeNull();
    expect(resolveTargetId('P1-1', ['horse-race-reporting'])).toEqual({ mapIndex: 0, localId: 'P1-1' });
  });
  it('선지 연결 동결본: 적절하지 않은 것 고르기의 정답 선지·적절한 것 고르기의 오답 선지에서 비틂 id를 읽고 source NONE뿐인 선지는 id가 없다', () => {
    const cog = loadChoiceLinkTargets(set.passages[0]!.choiceLinkPath);
    expect(cog(12, 2)).toEqual({ stemPolarity: 'SELECT_CORRECT', ids: ['나.P4-1'] });
    expect(cog(13, 3)).toEqual({ stemPolarity: 'SELECT_INCORRECT', ids: ['가.P4-11'] });
    const audio = loadChoiceLinkTargets(set.passages[3]!.choiceLinkPath);
    expect(audio(14, 3)).toEqual({ stemPolarity: 'SELECT_INCORRECT', ids: [] });
    expect(cog(99, 1)).toBeNull();
  });
});

describe('원문 복사 정도', () => {
  const paragraph = '심리 철학에서 동일론은 의식이 뇌의 물질적 상태와 동일하다고 본다.';
  it('원문을 그대로 붙이면 1, 겹치지 않으면 0, 5글자보다 짧으면 null이다', () => {
    expect(copyOverlap(paragraph, paragraph)).toMatchObject({ n: 5, ratio: 1 });
    expect(copyOverlap(`  ${paragraph.replace(/ /gu, '  ')}\n`, paragraph)?.ratio).toBe(1);
    expect(copyOverlap('완전히 다른 이야기를 하는 문장입니다 하하하', paragraph)).toEqual({ n: 5, windows: 15, matched: 0, ratio: 0 });
    expect(copyOverlap('짧은 말', paragraph)).toBeNull();
    expect(copyOverlap('다섯글자요', paragraph)).toEqual({ n: 5, windows: 1, matched: 0, ratio: 0 });
  });
  it('일부만 겹치면 비율이 소수 셋째 자리까지다', () => {
    const result = copyOverlap('동일론은 의식이 뇌의 물질적 상태와 같다', paragraph)!;
    expect(result.ratio).toBe(Math.round(result.matched / result.windows * 1000) / 1000);
    expect(result.ratio).toBeGreaterThan(0); expect(result.ratio).toBeLessThan(1);
  });
});

describe('추천 고르기', () => {
  it('OTHER를 빼고 가장 많은 것, 같으면 확정본 표 순서로 앞의 것이다', () => {
    expect(pickTwist({ OTHER: 5, PAIR_SWAP: 2, NEGATION: 2 })).toBe('NEGATION');
    expect(pickTwist({ ADDED_CONTENT: 1, PAIR_SWAP: 3, DIRECTION: 3 })).toBe('DIRECTION');
    expect(pickTwist({ OTHER: 2 })).toBeNull(); expect(pickTwist({})).toBeNull();
    expect(TWIST_ORDER).toHaveLength(14);
  });
});

describe('paragraphLabel', () => {
  const pos = (id: string) => ({ 'a-p2': 2, 'a-p3': 3, 'x-ga-p4': 4, 'x-na-p1': 5, 'x-na-p3': 7 } as Record<string, number>)[id] ?? null;
  it('단일 지문은 문단 번호를 잇고, (가)(나) 지문은 구역 안 번호로 되살린다', () => {
    expect(paragraphLabel(['a-p3', 'a-p2', 'a-p3'], pos)).toBe('2·3문단');
    expect(paragraphLabel(['x-na-p3'], pos)).toBe('(나) 3문단');
    expect(paragraphLabel(['x-na-p1', 'x-ga-p4'], pos)).toBe('(가) 4문단, (나) 1문단');
  });
});
