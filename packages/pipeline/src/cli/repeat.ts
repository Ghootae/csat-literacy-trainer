/**
 * 반복 안정성 측정 — **같은 입력을 여러 번 평가해 판정이 갈리는지** 본다.
 *
 *   npm run repeat -- <paragraphId> [반복횟수=5]
 *
 * 캐시를 쓰지 않는다. 캐시를 타면 두 번째부터는 같은 결과가 나와 측정이 무의미해진다.
 *
 * 배경: 3축 실험(2026-07-25)이 `regionSemanticVerdict` 반복 안정성 100%를 보고했으나
 * **법인 문단 하나에 손 질의로 잰 값**이었다. 2026-08-07 학습 UI 서버를 붙이는 중,
 * 캐시 키가 동일한(= 입력이 완전히 같은) 두 호출이 다른 판정을 낸 반례가 나왔다 —
 * q6이 `preserved/relation` ↔ `not_evidenced/none`로 갈려 영역 판정이 부분관계 ↔ 주제만로
 * 바뀌었다. 이 CLI는 그 반례가 예외인지 상시인지 가린다.
 *
 * 결과는 학생 루프의 **단조 유지 도입 여부**를 결정한다(§2.1) — 부당한 강등(학생이 건드리지
 * 않은 영역이 모델 변동으로 내려가는 것)이 실질적이면 화면에서 가려야 한다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateResponse } from '../evaluate-response.js';
import type { Gold } from '../gold.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

interface Probe {
  readonly id: string;
  readonly sections: readonly string[];
}

const PROBES: readonly Probe[] = [
  {
    // 실제로 갈린 응답. 영역 셋이 서로 다른 판정을 받아 경계가 가장 많이 노출된다.
    id: '혼합(주제만·부분·보존)',
    sections: [
      '니체가 보는 삶과 가치의 관계',
      '전통 형이상학은 도덕적 선을 절대적으로 봄',
      '니체는 삶을 수단으로 간주하는 형이상학의 사유에 반대함',
    ],
  },
  {
    id: '화제만',
    sections: [
      '니체가 보는 삶과 가치의 관계',
      '전통 형이상학은 도덕적 선을 절대적으로 봄',
      '니체는 형이상학에 반대함',
    ],
  },
  {
    id: '충실',
    sections: [
      '니체가 본 삶과 가치의 관계: 삶이 가치 평가의 근원',
      '가치 평가 기준: 가치가 삶을 강하게 하는가',
      '전통 형이상학의 문제: 도덕이란 가치를 기준으로 삶을 재단-> 삶을 개선하려는 욕구 부정 -> 삶이 무의미해짐',
      '형이상학에 대한 니체의 비판: 삶을 수단화하는 전도적 입장에 반대',
    ],
  },
];

const SHORT: Record<string, string> = {
  relation_preserved: '보존',
  partial_relation_preservation: '부분',
  topic_only: '주제',
  region_not_evidenced: '미포',
  contradicted: '모순',
};

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

async function main(): Promise<void> {
  const paragraphId = process.argv[2] ?? 'nietzsche-p1';
  const runs = Number(process.argv[3] ?? '5');
  const dir = resolve(process.cwd(), 'content', paragraphId);
  const gold = readJson<Gold>(resolve(dir, 'gold.json'));
  const queries = readJson<GeneratedQuerySet>(resolve(dir, 'queries.json'));

  console.log(`반복 안정성 — ${paragraphId}, 프로브 ${PROBES.length}개 × ${runs}회 (캐시 미사용)\n`);

  let unstableRegions = 0;
  let totalRegions = 0;

  for (const probe of PROBES) {
    const text = probe.sections.join('\n');
    const seen = new Map<string, string[]>(); // regionId → 회차별 판정

    for (let i = 0; i < runs; i++) {
      const { assessments } = await evaluateResponse(gold, queries, text);
      for (const a of assessments) {
        (seen.get(a.regionId) ?? seen.set(a.regionId, []).get(a.regionId)!).push(a.verdict);
      }
      process.stdout.write(`  ${probe.id} ${i + 1}/${runs}\r`);
    }

    console.log(`\n[${probe.id}]`);
    for (const [rid, verdicts] of seen) {
      totalRegions++;
      const uniq = [...new Set(verdicts)];
      const stable = uniq.length === 1;
      if (!stable) unstableRegions++;
      const counts = uniq.map((v) => `${SHORT[v] ?? v}×${verdicts.filter((x) => x === v).length}`);
      console.log(`  ${rid}  ${verdicts.map((v) => SHORT[v] ?? v).join(' ')}   ${stable ? '✓' : `⚠ ${counts.join(' / ')}`}`);
    }
  }

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`영역 판정이 갈린 경우: ${unstableRegions}/${totalRegions}`);
  console.log(
    unstableRegions === 0
      ? '→ 이번 표본에서는 반복 변동 없음. 단조 유지 불필요 근거가 유지된다.'
      : '→ 반복 변동 실재. 학생이 건드리지 않은 영역도 내려갈 수 있다 — 단조 유지 재검토 대상.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
