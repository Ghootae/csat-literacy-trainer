/**
 * 타이틀 판정 실측 — **압축 판별이 실제로 되는가**를 잰다.
 *
 *   npm run title -- [반복횟수=3]
 *
 * 배경: 최종 타이틀 단계에서 두 능력을 나눠 보기로 했다.
 *
 *   관계 통합(qT2)    영역들을 하나의 중심 관계로 연결했는가   → 기본 성공 조건
 *   위계적 압축(qT3)  그것을 상위 표상으로 압축했는가          → 보너스
 *
 * 사용자 지적: **"적당한 추상화의 기준은 인간에게도 매번 달라질 수 있다."** 그래서 압축은
 * 게이트가 아니라 보상으로 두기로 했는데, 보상조차 흔들리면 같은 답에 다른 등급이 나온다.
 * 이 CLI가 그 흔들림을 잰다.
 *
 * **압축 판별을 스키마 필드가 아니라 질의(qT3)로 둔 이유**: 스키마를 바꾸면 캐시 지문이
 * 달라져 회귀 3세트를 통째로 다시 재야 한다. 질의로 두면 프롬프트도 스키마도 그대로다.
 *
 * 캐시를 쓰지 않는다 — 반복 변동을 재는 것이 목적이므로 캐시를 타면 측정이 무의미하다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateResponse } from '../evaluate-response.js';
import { TITLE_EVAL_CONFIG } from '../llm/query-eval.js';
import type { Gold } from '../gold.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

interface Probe {
  readonly id: string;
  /** 기대 — `qT2`(관계 통합)와 `qT3`(압축)를 따로 적는다. */
  readonly expect: { readonly relation: boolean; readonly compressed: boolean };
  readonly text: string;
}

const PROBES: Readonly<Record<string, readonly Probe[]>> = {
  'nietzsche-p1': [
    {
      // **qT2 기대는 보존이다.** 문장이 셋으로 나뉘었어도 대립 관계 자체는 들어 있고,
      // qT2 수용 기준이 "표현 형식은 묻지 않는다"이기 때문이다. 조직이 나열이라는 것은
      // qT3가 잡는다 — 두 질의의 분업이 여기서 드러난다.
      id: '나열-관계있음',
      expect: { relation: true, compressed: false },
      text: '삶은 가치의 근원이다. 형이상학은 도덕적 선을 제시한다. 니체는 형이상학에 반대한다.',
    },
    {
      // 위와 대비: 사실만 늘어놓고 대립이 없다 → qT2도 미보존.
      id: '나열-관계없음',
      expect: { relation: false, compressed: false },
      text: '니체는 삶을 논했다. 전통 형이상학에는 도덕적 선이 있다. 본능적 욕망이 언급된다.',
    },
    {
      id: '연결(접속으로 이음)',
      expect: { relation: true, compressed: false },
      text: '니체는 삶이 가치의 근원이라 보고, 전통 형이상학은 도덕적 선으로 삶을 재단하며, 니체는 그 전도된 사유에 반대한다',
    },
    {
      id: '압축(상위 표상)',
      expect: { relation: true, compressed: true },
      text: '삶을 초월적 가치의 수단으로 전도한 전통 형이상학에 대한 니체의 비판',
    },
    {
      id: '과대추상',
      expect: { relation: false, compressed: false },
      text: '니체의 철학',
    },
    {
      // **qT3 기대는 보존이다.** qT3는 조직만 보므로 내용이 틀려도 압축 형태면 보존이다.
      // 그래서 보상은 `관계보존`일 때만 계산한다 — 모순 응답에 압축 보상이 붙으면 안 된다.
      id: '모순',
      expect: { relation: false, compressed: true },
      text: '니체는 도덕적 선을 기준으로 삶을 재단해야 한다고 보았다',
    },
    {
      // ★ 경계: 주절 하나 + 근거 종속. 압축인가 연결인가 — 사람도 갈릴 수 있는 자리다.
      id: '경계(주절+근거종속)',
      expect: { relation: true, compressed: true },
      text: '삶을 수단화하는 형이상학에 니체가 반대하는데, 삶이 가치의 근원이기 때문이다',
    },
    {
      // ── 아래 4개: 중심 서술을 바꾼 변형. 생성 질의가 수용 기준에 **특정 중심 서술을
      // 예로 적으므로**('니체가 ~에 반대한다'), 다른 표현을 쓴 학생을 막지 않는지 본다.
      id: '변형-명사중심(비판)',
      expect: { relation: true, compressed: true },
      text: '삶이 가치의 근원임을 근거로 한 니체의 전통 형이상학 비판',
    },
    {
      id: '변형-이유중심',
      expect: { relation: true, compressed: true },
      text: '삶을 수단으로 전도한 전통 형이상학을 니체가 거부한 이유',
    },
    {
      id: '변형-도치',
      expect: { relation: true, compressed: true },
      text: '삶을 목적에서 수단으로 떨어뜨린 전통 형이상학, 니체는 이를 받아들이지 않았다',
    },
    {
      id: '변형-콜론',
      expect: { relation: true, compressed: true },
      text: '니체가 형이상학에 맞선 지점: 삶은 수단이 아니라 그 자체로 목적이다',
    },
  ],
  'photosynthesis-p5': [
    {
      // 인과 방향(분업 → 농축 → 효율)이 없어 qT2도 미보존이다. 니체의 `나열-관계있음`과
      // 짝을 이룬다 — 같은 "나열"이라도 관계 유무가 다르면 qT2가 갈린다.
      id: '나열-관계없음',
      expect: { relation: false, compressed: false },
      text: 'C4 식물은 두 공간에서 광합성을 한다. 엽육 세포에서 4탄당을 만든다. 유관속초 세포에서 포도당을 만든다. 효율이 높다.',
    },
    {
      id: '나열-관계있음',
      expect: { relation: true, compressed: false },
      text: 'C4 식물은 두 공간에 광합성을 나눈다. 그렇게 이산화 탄소를 농축한다. 그래서 C3보다 효율이 높다.',
    },
    {
      id: '연결(접속으로 이음)',
      expect: { relation: true, compressed: false },
      text: 'C4 식물은 엽육 세포에서 4탄당을 만들고, 이를 유관속초 세포로 보내 분해해 이산화 탄소를 농축하며, 그 결과 C3보다 광합성 효율이 높다',
    },
    {
      id: '압축(상위 표상)',
      expect: { relation: true, compressed: true },
      text: '두 공간 분업으로 이산화 탄소를 농축해 높은 광합성 효율을 얻는 C4 식물',
    },
    {
      id: '과대추상',
      expect: { relation: false, compressed: false },
      text: 'C4 식물의 광합성',
    },
    {
      id: '모순',
      expect: { relation: false, compressed: true },
      text: 'C4 식물은 농축의 결과로 두 공간에 광합성을 나누게 되어 C3보다 효율이 낮다',
    },
    {
      id: '경계(주절+수단종속)',
      expect: { relation: true, compressed: true },
      text: '두 공간에 광합성을 나눠 이산화 탄소를 농축함으로써 C4 식물이 높은 효율을 얻는다',
    },
    {
      id: '변형-명사중심(효율)',
      expect: { relation: true, compressed: true },
      text: '두 공간 분업과 이산화 탄소 농축이 만들어낸 C4 식물의 높은 광합성 효율',
    },
    {
      id: '변형-이유중심',
      expect: { relation: true, compressed: true },
      text: 'C4 식물의 광합성이 C3보다 효율적인 까닭',
    },
    {
      // ★ "길이는 기준이 아니다"를 시험한다. 짧지만 두 명사구가 **대등하게** 병렬이라
      // 중심 서술이 없다 → 압축이 아니어야 한다.
      id: '변형-명사구병렬(짧음)',
      expect: { relation: true, compressed: false },
      text: '엽육과 유관속초로 나뉜 광합성, 그리고 그 결과인 높은 효율',
    },
    {
      id: '변형-도치',
      expect: { relation: true, compressed: true },
      text: '두 공간에 나뉜 광합성으로 이산화 탄소를 농축하는 방식, 그것이 C4의 높은 효율을 만든다',
    },
  ],
};

const FIX_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/title-queries');

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/** ✓ 기대와 일치, ✗ 불일치. */
function mark(actual: boolean, expected: boolean): string {
  return actual === expected ? (actual ? 'O' : '·') : actual ? 'O*' : '·*';
}

async function main(): Promise<void> {
  const runs = Number(process.argv[2] ?? '3');
  // 질의 출처. `hand`는 손 오라클, `gen1`은 생성기 산출물 — 같은 프로브로 돌려 비교한다.
  const source = process.argv[3] ?? 'hand';
  console.log(`타이틀 판정 실측 — 질의 ${source}, 반복 ${runs}회, 캐시 미사용\n`);
  console.log('  O = 보존   · = 미보존   * = 기대와 다름\n');

  let unstable = 0;
  let total = 0;
  let mismatch = 0;

  for (const [paragraphId, probes] of Object.entries(PROBES)) {
    const gold = readJson<Gold>(resolve(process.cwd(), 'content', paragraphId, 'gold.json'));
    const queries = readJson<GeneratedQuerySet>(resolve(FIX_DIR, `${paragraphId}-${source}.json`));

    console.log(`━━ ${paragraphId}`);
    console.log(`   ${'프로브'.padEnd(22)} ${'qT2 관계통합'.padEnd(14)} ${'qT3 압축'.padEnd(14)} 영역판정`);

    for (const probe of probes) {
      const rel: boolean[] = [];
      const comp: boolean[] = [];
      const verdicts: string[] = [];
      for (let i = 0; i < runs; i++) {
        process.stderr.write(`   ${probe.id} ${i + 1}/${runs}\r`);
        const { assessments, rawVerdicts } = await evaluateResponse(gold, queries, probe.text, undefined, {
          queryEvaluation: TITLE_EVAL_CONFIG,
        });
        rel.push(rawVerdicts.get('qT2')?.semanticState === 'preserved');
        comp.push(rawVerdicts.get('qT3')?.semanticState === 'preserved');
        verdicts.push(assessments[0]?.verdict ?? '?');
      }
      process.stderr.write(`${' '.repeat(60)}\r`);

      const relCells = rel.map((v) => mark(v, probe.expect.relation)).join(' ');
      const compCells = comp.map((v) => mark(v, probe.expect.compressed)).join(' ');
      const relStable = new Set(rel).size === 1;
      const compStable = new Set(comp).size === 1;
      total += 2;
      if (!relStable) unstable++;
      if (!compStable) unstable++;
      if (rel.some((v) => v !== probe.expect.relation)) mismatch++;
      if (comp.some((v) => v !== probe.expect.compressed)) mismatch++;

      console.log(
        `   ${probe.id.padEnd(22)} ${relCells.padEnd(14)}${relStable ? ' ' : '⚠'} ` +
          `${compCells.padEnd(14)}${compStable ? ' ' : '⚠'} ${SHORT[verdicts[0] ?? ''] ?? verdicts[0]}`,
      );
    }
    console.log('');
  }

  console.log('─'.repeat(70));
  console.log(`반복에서 갈린 판정: ${unstable}/${total}`);
  console.log(`기대와 다른 판정:   ${mismatch}/${total}`);
  // 결론을 여기서 내리지 않는다 — 흔들림의 **크기와 위치**가 판단 재료이고, 게이트로 쓸지
  // 보상으로 쓸지는 이미 정해져 있다(보상, 2026-08-10). 여기서는 사실만 보고한다.
  console.log(
    unstable === 0
      ? '\n→ 이 표본에서는 흔들리지 않았다.'
      : `\n→ ${unstable}건이 반복에서 갈렸다. 어느 프로브인지(⚠)를 보고 경계인지 명확한 사례인지 가른다.`,
  );
  console.log('   압축은 게이트가 아니라 보상이므로, 흔들려도 학생의 진행을 막지 않는다.');
}

const SHORT: Record<string, string> = {
  relation_preserved: '관계보존',
  partial_relation_preservation: '부분관계',
  topic_only: '주제만',
  region_not_evidenced: '미포착',
  contradicted: '모순',
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
