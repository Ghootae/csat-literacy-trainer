/**
 * 관찰 사례 fixture를 **실제로 채점해서** 목표 판정과 비교한다.
 *
 *   npm run evalcase -- <caseId> [반복횟수]
 *
 * `eval-case.test.ts`는 얼려 둔 판정만 재생하므로 LLM 쪽 변경을 볼 수 없다. 프롬프트를 고친
 * 뒤 그 변경이 **의도한 사례만** 움직였는지 확인하는 것이 이 CLI다.
 *
 * 캐시를 쓰지 않는다. 판정 안정성이 관심사인데 캐시가 첫 결과를 되풀이하면 반복이 무의미하다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadEvalCase } from '../eval-case.js';
import { evaluateResponse } from '../evaluate-response.js';
import type { Gold } from '../gold.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';
import type { RegionSemanticVerdict } from '../query-normalize.js';

const caseId = process.argv[2] ?? 'corporate-law-p1-r1-axis-conflation';
const repeats = Number(process.argv[3] ?? 1);
/** 한 프로브만 반복해서 볼 때. 경계 사례의 변이를 잴 때 나머지까지 부르면 돈만 든다. */
const onlyProbe = process.argv[4];

/** 질의 id에서 영역 id를 뗀다 (`r1q3` → `r1`). 생성 질의의 id 규약이다. */
function rawRegion(queryId: string): string {
  return queryId.replace(/q\d+$/, '');
}

function read<T>(paragraphId: string, file: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'content', paragraphId, file), 'utf8')) as T;
}

async function main(): Promise<void> {
  const c = loadEvalCase(caseId);
  const gold = read<Gold>(c.paragraphId, 'gold.json');
  const queries = read<GeneratedQuerySet>(c.paragraphId, 'queries.json');

  console.log(`사례 ${c.caseId} — ${c.paragraphId} (관찰 ${c.observedAt}), 반복 ${repeats}회\n`);

  let failures = 0;
  for (const probe of c.probes) {
    if (onlyProbe !== undefined && probe.id !== onlyProbe) continue;
    console.log(`── ${probe.id} — ${probe.label}`);
    console.log(`   ${probe.response.replace(/\n/g, '\n   ')}`);

    for (let i = 1; i <= repeats; i += 1) {
      const { assessments, rawVerdicts } = await evaluateResponse(gold, queries, probe.response);
      const actual: Record<string, RegionSemanticVerdict> = Object.fromEntries(
        assessments.map((a) => [a.regionId, a.verdict]),
      );

      const diffs = Object.entries(probe.targetRegionVerdicts).filter(
        ([rid, want]) => actual[rid] !== want,
      );
      const mark = diffs.length === 0 ? '통과' : '불일치';
      if (diffs.length > 0) failures += 1;

      // 지어낸 가드 프로브는 기준선이 없다 — 목표와의 일치만 본다.
      const baseline = probe.recordedRegionVerdicts;
      const moved =
        baseline === undefined
          ? undefined
          : Object.entries(actual)
              .filter(([rid, v]) => baseline[rid] !== v)
              .map(([rid, v]) => `${rid} ${baseline[rid]}→${v}`);

      console.log(
        `   [${i}/${repeats}] ${mark}  ` +
          Object.entries(actual)
            .map(([rid, v]) => `${rid}=${v}`)
            .join(' ') +
          (moved === undefined
            ? '   (기준선 없음 — 가드)'
            : moved.length > 0
              ? `   (기준선 대비: ${moved.join(', ')})`
              : '   (기준선과 동일)'),
      );
      for (const [rid, want] of diffs) {
        console.log(`        ✗ ${rid}: 목표 ${want}, 실제 ${actual[rid] ?? '없음'}`);
        // 어긋난 영역은 질의별로 편다 — 영역 판정만 봐서는 어느 질의가 움직였는지 모른다.
        for (const [qid, v] of rawVerdicts) {
          if (!qid.startsWith(rid)) continue;
          console.log(`           ${qid} ${v.semanticState}/${v.expressionMode}/${v.evidenceRole ?? '-'} "${v.evidence}"`);
        }
      }
      // 모순이 남아 있으면 어느 질의인지 보여준다 — 좁히기 작업의 관심사가 그것이다.
      const contradicted = [...rawVerdicts.entries()].filter(([, v]) => v.semanticState === 'contradicted');
      for (const [qid, v] of contradicted) {
        console.log(`        모순 질의 ${qid} [${v.contradictionKind ?? '모양 없음'}]: "${v.evidence}"`);
        const fb = assessments.find((a) => a.regionId === rawRegion(qid))?.feedback;
        if (fb !== undefined) console.log(`        학생이 받는 문구: ${fb}`);
      }
    }
    console.log();
  }

  console.log(failures === 0 ? '전부 목표와 일치.' : `불일치 ${failures}건.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
