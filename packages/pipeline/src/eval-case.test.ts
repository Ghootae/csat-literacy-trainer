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

import type { PropositionEvidenceState } from './assessment.js';
import { overallCategory } from './assessment.js';
import {
  type EvalCase,
  type RecordedProbe,
  isRecorded,
  listEvalCases,
  loadEvalCase,
  queryFileOf,
  recordedEval,
} from './eval-case.js';
import { assembleResponse } from './evaluate-response.js';
import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';

function content(paragraphId: string, queryFile: string): { gold: Gold; queries: GeneratedQuerySet } {
  const read = <T>(f: string): T =>
    JSON.parse(readFileSync(resolve(process.cwd(), 'content', paragraphId, f), 'utf8')) as T;
  return { gold: read<Gold>('gold.json'), queries: read<GeneratedQuerySet>(queryFile) };
}

function replayOf(c: EvalCase) {
  const { gold, queries } = content(c.paragraphId, queryFileOf(c));
  return (p: RecordedProbe) => assembleResponse(gold, queries, recordedEval(p));
}

// 디렉터리의 모든 사례에 걸린다. 사례를 추가하면 등록 없이 자동으로 지켜진다.
describe.each(listEvalCases().map((c) => [c.caseId, c] as const))('관찰 사례 — %s', (_id, c) => {
  const replay = replayOf(c);
  it.each(c.probes.filter(isRecorded).map((p) => [p.id, p] as const))(
    '%s: 얼려 둔 판정이 그날의 영역 판정을 그대로 낸다',
    (_pid, p) => {
      const actual = Object.fromEntries(replay(p).assessments.map((a) => [a.regionId, a.verdict]));
      expect(actual).toEqual(p.recordedRegionVerdicts);
    },
  );
});

const CASE_ID = 'corporate-law-p1-r1-axis-conflation';
const evalCase = loadEvalCase(CASE_ID);
const recorded = evalCase.probes.filter(isRecorded);
const probe = (id: string): RecordedProbe => {
  const p = recorded.find((x) => x.id === id);
  if (p === undefined) throw new Error(`관찰 기록이 있는 probe 없음: ${id}`);
  return p;
};
const replay = replayOf(evalCase);

describe(`모순 판정의 파급 — ${CASE_ID}`, () => {

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

// ── 귀속 뒤바꿈이 통과하던 사각지대 (2026-08-11 해결) ──
//
// **아래는 고치기 전의 모습이다.** 얼려 둔 판정을 재생하므로 값이 변하지 않는다 — 지금
// 실행하면 `content/nietzsche-p1/queries.json`의 모순 기준에 귀속이 들어가 이 응답은
// contradicted가 된다(실측 4/4, fixture의 `resolution`).
//
// 그런데도 남겨 두는 이유는, 이게 **무엇을 놓쳤었는지에 대한 유일한 기록**이기 때문이다.
// 특히 마지막 검사 — 채점기가 근거 인용에서 틀린 주어를 떼어냈다는 것 — 이 사각지대의
// 정체이고, 같은 형태의 지문에서 되풀이될 수 있다.
//
// 법인 문단과 방향이 반대였다. 거기서는 분류 기준이 **답변 쪽**에 있어 어긋나게 붙이면 모순이
// 과하게 발동했고, 여기서는 주장의 소유자가 **질문 줄기 쪽**에 있어 어긋나게 붙여도 아무 일도
// 일어나지 않았다. 둘 다 채점기가 아니라 기준이 무엇을 지목하느냐에서 갈렸다.
const NIETZSCHE = 'nietzsche-p1-attribution-swap';
const nz = loadEvalCase(NIETZSCHE);
const nzReplay = replayOf(nz);
const nzProbe = (id: string): RecordedProbe => {
  const p = nz.probes.filter(isRecorded).find((x) => x.id === id);
  if (p === undefined) throw new Error(`관찰 기록이 있는 probe 없음: ${id}`);
  return p;
};

describe(`귀속 사각지대 (수정 전 기록) — ${NIETZSCHE}`, () => {
  it('고치기 전: 귀속을 뒤바꾼 응답이 세 영역 모두 관계보존을 받았다', () => {
    const { assessments } = nzReplay(nzProbe('swapped-attribution'));
    expect(assessments.map((a) => a.verdict)).toEqual([
      'relation_preserved',
      'relation_preserved',
      'relation_preserved',
    ]);
  });

  it('고치기 전: 어느 질의도 모순으로 잡지 않았다', () => {
    const { rawVerdicts } = nzReplay(nzProbe('swapped-attribution'));
    expect([...rawVerdicts.values()].filter((v) => v.semanticState === 'contradicted')).toHaveLength(0);
  });

  // 이게 사각지대의 정체다: 채점기가 근거 인용에서 틀린 주어를 떼어내고 관계만 확인했다.
  // 고친 뒤에는 주어를 포함해 인용한다 — 무엇이 달라졌는지가 여기서 가장 선명하다.
  it('고치기 전: 근거 인용에서 잘못된 귀속이 잘려 나갔다', () => {
    const { rawVerdicts } = nzReplay(nzProbe('swapped-attribution'));
    const cited = [...rawVerdicts.values()].map((v) => v.evidence);
    expect(cited.some((e) => e.includes('삶은 가치의 근원'))).toBe(true);
    expect(cited.some((e) => e.includes('전통 형이상학에 따르면'))).toBe(false);
  });

  it('귀속만 바로잡은 최소 대조쌍이 사례에 남아 있다', () => {
    const minimal = nz.probes.find((p) => p.id === 'correct-attribution-minimal');
    expect(minimal?.response.startsWith('니체에 따르면')).toBe(true);
    expect(nzProbe('swapped-attribution').response.startsWith('전통 형이상학에 따르면')).toBe(true);
  });
});

// ── 타이틀: defer한 축이 기본 판정을 흔들 수 없어야 한다 ──
//
// qT3(추상화 보상)는 판정이 재현되지 않아 defer했다(docs/DECISIONS.md, 2026-08-11).
// 그 상태로 남겨 두는 것이 안전한 이유는 **구조적으로 분리돼 있기 때문**이다 — critical이
// 아니므로 영역 판정에 들어가지 않는다. 그 분리가 깨지면 불안정한 축이 기본 성공을 흔들기
// 시작하므로, 여기서 못을 박는다.
describe('타이틀 — 보상 축은 기본 판정과 분리돼 있다', () => {
  const titleCases = listEvalCases().filter((c) => c.querySet === 'title');

  it('타이틀 사례가 남아 있다', () => {
    expect(titleCases.length).toBeGreaterThan(0);
  });

  it.each(titleCases.map((c) => [c.caseId, c] as const))(
    '%s: qT3는 critical이 아니다',
    (_id, c) => {
      const { queries } = content(c.paragraphId, queryFileOf(c));
      const byId = new Map(queries.regions.flatMap((r) => r.queries).map((q) => [q.id, q]));
      expect(byId.get('qT3')?.criticalForRelation).toBe(false);
      // 통과 기준은 qT2 하나가 진다. 이것이 defer의 전제다.
      expect(byId.get('qT2')?.criticalForRelation).toBe(true);
    },
  );

  it.each(titleCases.map((c) => [c.caseId, c] as const))(
    '%s: qT3를 뒤집어도 영역 판정이 그대로다',
    (_id, c) => {
      const { gold, queries } = content(c.paragraphId, queryFileOf(c));
      const probe = c.probes.filter(isRecorded)[0]!;
      const base = assembleResponse(gold, queries, recordedEval(probe));
      const flipped = assembleResponse(gold, queries, {
        verdicts: probe.recordedVerdicts.map((v) =>
          v.queryId === 'qT3'
            ? { ...v, semanticState: v.semanticState === 'preserved' ? 'not_evidenced' : 'preserved' }
            : v,
        ),
      });
      expect(flipped.assessments.map((a) => a.verdict)).toEqual(base.assessments.map((a) => a.verdict));
    },
  );

  it.each(titleCases.map((c) => [c.caseId, c] as const))(
    '%s: defer한 프로브가 지워지지 않고 남아 있다',
    (_id, c) => {
      const deferred = c.probes.filter((p) => p.deferred === true);
      expect(deferred.length).toBeGreaterThan(0);
      for (const p of deferred) expect(p.deferReason ?? '').not.toBe('');
    },
  );
});

// ── 명제 판정은 영역·타이틀의 입력이 아니다 ──
//
// 명제 상태는 판정의 **하류**다. 영역 판정은 질의 판정만 보고 먼저 계산되고, 명제 evidence는
// 그 뒤에 파생된다. 소비처는 피드백 문장과 화면 오버레이 둘뿐이고 게이트·보상에는 들어가지
// 않는다.
//
// 지금은 구조적으로 참이지만 **그걸 막는 장치가 없다.** 명제 판정을 고치는 작업이 진행 중이라
// (docs/DECISIONS.md 이후 작업), 그 과정에서 경계가 새면 영역·타이틀 판정이 조용히 따라
// 움직인다. 교란으로 못박는다.
describe('명제 판정은 영역·타이틀 판정을 움직일 수 없다', () => {
  const ALL: PropositionEvidenceState[] = [
    'evidenced',
    'supported_by_abstraction',
    'not_evidenced',
    'contradicted',
  ];

  it.each(listEvalCases().map((c) => [c.caseId, c] as const))('%s', (_id, c) => {
    const { gold, queries } = content(c.paragraphId, queryFileOf(c));
    for (const probe of c.probes.filter(isRecorded)) {
      const base = assembleResponse(gold, queries, recordedEval(probe));
      // 명제 상태를 전부 갈아끼워도 영역 판정은 그대로여야 한다.
      for (const state of ALL) {
        const forced = base.assessments.map((a) => ({
          ...a,
          propositionEvidence: a.propositionEvidence.map((e) => ({ ...e, state })),
        }));
        expect(forced.map((a) => a.verdict)).toEqual(base.assessments.map((a) => a.verdict));
      }
      // 그리고 실제로 판정을 만드는 것은 질의 축이다 — 명제는 여기에 나타나지 않는다.
      expect(base.regions.map((r) => r.regionSemanticVerdict)).toEqual(
        base.assessments.map((a) => a.verdict),
      );
    }
  });
});
