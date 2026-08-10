/**
 * 관찰된 사례의 **화면 결과**를 고정한다.
 *
 * LLM은 부르지 않는다. 그날 나온 원시 판정을 그대로 넣고, 그것이 영역 판정·피드백·차단으로
 * 어떻게 번역되는지만 본다. 모순 조건을 좁히는 작업이 건드리는 것은 LLM 쪽이므로, 이 회귀는
 * **그 변경의 파급 범위를 재는 자**다 — 여기 값이 같이 움직이면 결정적 층까지 흔든 것이다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { overallCategory } from './assessment.js';
import { type RecordedProbe, isRecorded, loadEvalCase, recordedEval } from './eval-case.js';
import { assembleResponse } from './evaluate-response.js';
import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';

const CASE_ID = 'corporate-law-p1-r1-axis-conflation';
const evalCase = loadEvalCase(CASE_ID);

function content(paragraphId: string): { gold: Gold; queries: GeneratedQuerySet } {
  const read = <T>(f: string): T =>
    JSON.parse(readFileSync(resolve(process.cwd(), 'content', paragraphId, f), 'utf8')) as T;
  return { gold: read<Gold>('gold.json'), queries: read<GeneratedQuerySet>('queries.json') };
}

const { gold, queries } = content(evalCase.paragraphId);
const recorded = evalCase.probes.filter(isRecorded);
const probe = (id: string): RecordedProbe => {
  const p = recorded.find((x) => x.id === id);
  if (p === undefined) throw new Error(`관찰 기록이 있는 probe 없음: ${id}`);
  return p;
};

function replay(p: RecordedProbe) {
  return assembleResponse(gold, queries, recordedEval(p));
}

describe(`관찰 사례 — ${CASE_ID}`, () => {
  it.each(recorded.map((p) => [p.id, p] as const))(
    '%s: 얼려 둔 판정이 그날의 영역 판정을 그대로 낸다',
    (_id, p) => {
      const { assessments } = replay(p);
      const actual = Object.fromEntries(assessments.map((a) => [a.regionId, a.verdict]));
      expect(actual).toEqual(p.recordedRegionVerdicts);
    },
  );

  // ── 아래 셋이 "모순 하나가 제출 전체를 끌어내린다"의 실측이다 ──

  it('압축 응답: r1q3 하나가 모순이라 r1 전체가 모순이 된다', () => {
    const p = probe('compressed');
    const r1q3 = p.recordedVerdicts.find((v) => v.queryId === 'r1q3');
    expect(r1q3?.semanticState).toBe('contradicted');
    // 같은 영역의 나머지는 모순이 아니다 — 하나가 영역을 결정한다.
    expect(
      p.recordedVerdicts.filter((v) => v.queryId.startsWith('r1') && v.semanticState === 'contradicted'),
    ).toHaveLength(1);
    expect(replay(p).assessments.find((a) => a.regionId === 'r1')?.verdict).toBe('contradicted');
  });

  it('압축 응답: 나머지 세 영역이 멀쩡해도 응답 전체가 관계오류가 된다', () => {
    const p = probe('compressed');
    const { regions } = replay(p);
    expect(regions.filter((r) => r.regionSemanticVerdict === 'relation_preserved')).toHaveLength(2);
    expect(overallCategory(regions, evalCase.focalRegionId)).toBe('관계오류');
  });

  // 그날 학생이 본 문구는 "관계 방향이 원문과 어긋납니다"였다 — 뒤집힌 것이 없는데 방향을
  // 찾으라는 말이었다. 얼려 둔 판정에는 모양(contradictionKind)이 없으므로, 이제는 방향을
  // 단정하지 않는 문구가 나와야 한다.
  it('압축 응답: 모양을 모르는 옛 판정에는 방향을 단정하지 않는다', () => {
    const fb = replay(probe('compressed')).assessments.find((a) => a.regionId === 'r1')?.feedback ?? '';
    expect(fb).toContain('어긋');
    expect(fb).not.toContain('방향');
  });

  // 가드 프로브는 실호출(`npm run evalcase`)에서만 검사된다. 여기서 존재만 확인하는 이유는,
  // 조용히 사라지면 모순 조건을 아무리 느슨하게 풀어도 아무것도 실패하지 않기 때문이다.
  it('과잉 완화 가드가 사례에 남아 있다', () => {
    const guard = evalCase.probes.find((p) => p.synthetic === true);
    expect(guard?.targetRegionVerdicts['r1']).toBe('contradicted');
    expect(isRecorded(guard!)).toBe(false);
    expect(recorded.length).toBeGreaterThan(0);
  });

  it('대조군: 두 축을 명시하면 같은 영역이 관계보존이다', () => {
    const p = probe('explicit');
    expect(replay(p).assessments.find((a) => a.regionId === 'r1')?.verdict).toBe('relation_preserved');
    expect(overallCategory(replay(p).regions, evalCase.focalRegionId)).not.toBe('관계오류');
  });
});
