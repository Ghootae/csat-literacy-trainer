/**
 * effort 스윕 — **낮은 effort가 같은 판정을 내는가**를 잰다.
 *
 *   npm run effort -- <paragraphId> [effort,effort,...]
 *
 * 배경: 접두부 캐싱을 넣은 뒤 채점 비용의 95%가 출력 토큰이고, 지연도 출력에 거의
 * 선형이다(약 12ms/토큰). 즉 **effort 하나가 비용과 지연을 동시에 정한다.** 낮추면
 * 둘 다 내려가지만 판정이 바뀔 수 있으므로, 바꾸기 전에 일치도를 재는 것이 순서다.
 *
 * 기준선은 `high`(운영값)다. 각 effort의 판정을 기준선과 **영역 단위로** 비교한다 —
 * 학생에게 보이는 것이 영역 판정이기 때문이다.
 *
 * 캐시를 쓰지 않는다. 다만 **반복 변동과 effort 차이는 이 CLI로 구분되지 않는다** —
 * 같은 effort를 두 번 돌려도 2/9는 갈리는 것이 이미 측정됐다(2026-08-08). 그러므로
 * 여기서 나온 불일치는 상한이지 effort 탓의 확정치가 아니다. 차이가 작으면 `npm run repeat`의
 * 변동폭과 비교해 판단해야 한다.
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

/** `repeat.ts`와 같은 프로브. 경계 응답이 섞여 있어야 effort 차이가 드러난다. */
const PROBES: readonly Probe[] = [
  {
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

/**
 * $/1M 단가. **모델마다 다르므로 하드코딩하면 안 된다** — opus 단가로 sonnet 토큰을 곱해
 * 비용을 부풀린 적이 있다. 캐시 읽기는 입력의 0.1배.
 */
const PRICE: Record<string, { in: number; out: number }> = {
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 3, out: 15 }, // 도입가 $2/$10은 2026-08-31까지 — 여기선 정가로 본다
  'claude-haiku-4-5': { in: 1, out: 5 },
};

interface Run {
  readonly verdicts: Map<string, string>;
  readonly outputTokens: number;
  readonly ms: number;
}

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/** 이 프로세스가 방금 남긴 query-eval 계측을 되읽어 토큰·지연을 얻는다. */
function lastMetric(): { outputTokens: number; ms: number } {
  const path = resolve(process.cwd(), '.omc/metrics/llm.jsonl');
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const r = JSON.parse(lines[i]!) as {
      op: string;
      outputTokens: number;
      ms: number;
      error?: unknown;
    };
    if (r.op === 'query-eval' && r.error === undefined) return { outputTokens: r.outputTokens, ms: r.ms };
  }
  throw new Error('query-eval 계측을 찾지 못했다');
}

async function runProbe(gold: Gold, queries: GeneratedQuerySet, text: string): Promise<Run> {
  const { assessments } = await evaluateResponse(gold, queries, text);
  const { outputTokens, ms } = lastMetric();
  return {
    verdicts: new Map(assessments.map((a) => [a.regionId, a.verdict])),
    outputTokens,
    ms,
  };
}

async function main(): Promise<void> {
  const paragraphId = process.argv[2] ?? 'nietzsche-p1';
  const efforts = (process.argv[3] ?? 'high,medium').split(',');
  const dir = resolve(process.cwd(), 'content', paragraphId);
  const gold = readJson<Gold>(resolve(dir, 'gold.json'));
  const queries = readJson<GeneratedQuerySet>(resolve(dir, 'queries.json'));

  const [baseline] = efforts;
  if (baseline === undefined) throw new Error('effort를 하나 이상 지정해야 한다');

  console.log(`effort 스윕 — ${paragraphId}, 프로브 ${PROBES.length}개 × ${efforts.length}단계`);
  console.log(`모델: ${process.env['EVAL_MODEL'] ?? 'claude-opus-4-8'}`);
  console.log(`기준선: ${baseline} (운영값)  ·  캐시 미사용\n`);

  // effort → 프로브 → 결과
  const results = new Map<string, Map<string, Run>>();

  for (const effort of efforts) {
    process.env['EVAL_EFFORT'] = effort;
    const byProbe = new Map<string, Run>();
    for (const probe of PROBES) {
      process.stdout.write(`  ${effort} · ${probe.id}\r`);
      byProbe.set(probe.id, await runProbe(gold, queries, probe.sections.join('\n')));
    }
    results.set(effort, byProbe);
  }
  process.stdout.write(' '.repeat(60) + '\r');

  // ── 판정 비교 ──
  const base = results.get(baseline)!;
  for (const probe of PROBES) {
    console.log(`[${probe.id}]`);
    const regionIds = [...base.get(probe.id)!.verdicts.keys()];
    const head = efforts.map((e) => e.padStart(6)).join(' ');
    console.log(`  ${'영역'.padEnd(6)} ${head}`);
    for (const rid of regionIds) {
      const cells = efforts.map((e) => {
        const v = results.get(e)!.get(probe.id)!.verdicts.get(rid) ?? '?';
        const s = SHORT[v] ?? v;
        const differs = e !== baseline && v !== base.get(probe.id)!.verdicts.get(rid);
        return (differs ? `${s}*` : s).padStart(6);
      });
      console.log(`  ${rid.padEnd(6)} ${cells.join(' ')}`);
    }
    console.log('');
  }

  // ── 요약 ──
  console.log('─'.repeat(64));
  console.log(`${'effort'.padEnd(8)} ${'불일치'.padStart(8)} ${'출력토큰'.padStart(9)} ${'지연'.padStart(8)} ${'채점1건'.padStart(9)}`);
  for (const effort of efforts) {
    const runs = results.get(effort)!;
    let diff = 0;
    let total = 0;
    for (const probe of PROBES) {
      for (const [rid, v] of runs.get(probe.id)!.verdicts) {
        total++;
        if (v !== base.get(probe.id)!.verdicts.get(rid)) diff++;
      }
    }
    const all = PROBES.map((p) => runs.get(p.id)!);
    const tok = Math.round(all.reduce((s, r) => s + r.outputTokens, 0) / all.length);
    const ms = Math.round(all.reduce((s, r) => s + r.ms, 0) / all.length);
    // 캐시 읽기 상태 기준 (접두부 7,236토큰 × 0.1배 + 미캐시 84토큰)
    const model = process.env['EVAL_MODEL'] ?? 'claude-opus-4-8';
    const p = PRICE[model];
    if (p === undefined) throw new Error(`단가를 모르는 모델: ${model}`);
    const cost = (84 * p.in + 7236 * p.in * 0.1 + tok * p.out) / 1e6;
    const label = effort === baseline ? `${effort}(기준)` : effort;
    console.log(
      `${label.padEnd(8)} ${(effort === baseline ? '—' : `${diff}/${total}`).padStart(8)} ` +
        `${tok.toString().padStart(9)} ${`${(ms / 1000).toFixed(1)}s`.padStart(8)} ${`$${cost.toFixed(4)}`.padStart(9)}`,
    );
  }
  console.log(
    '\n* 표시는 기준선과 다른 판정. **반복 변동(같은 effort로도 2/9가 갈림)과 구분되지 않으므로**\n' +
      '  불일치가 작으면 `npm run repeat`의 변동폭과 비교해 판단해야 한다.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
