/**
 * 골드 재현성 측정 — 문단 하나를 3회 독립 생성해 **판정 일치율**을 잰다.
 *
 *   npm run agreement -- <setId> <bodyParagraphIndex> [반복수]
 *
 * 구조가 아니라 판정을 비교한다. 테스트 학생 응답은 **문단만 보고** 한 번 만들어 디스크에
 * 캐시하고, 이후 모든 골드가 같은 응답으로 평가받는다 — 골드별로 새로 만들면 각 골드에
 * 유리한 응답이 나와 측정이 무의미해진다.
 *
 * 판정이 갈린 문장만 ambiguity bundle로 모은다. 구조가 달라도 판정이 같으면 손대지 않는다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { bodyParagraphs } from '@csat/core';

import { loadPassage } from '../adapter.js';
import {
  type AgreementReport,
  type EvaluationInput,
  collectBundles,
  measureAgreement,
  toSentenceVerdicts,
} from '../agreement.js';
import { type Gold, buildGold } from '../gold.js';
import { type TestResponses, evaluate, generateTestResponses } from '../llm/evaluate.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const CACHE = resolve(process.cwd(), '.omc/agreement');

/** 테스트 응답은 문단당 한 번만 만들어 고정한다. */
/**
 * 캐시 슬러그. **setId를 반드시 포함해야 한다** — 문단 id는 지문마다 s1_p1, s1_p4로
 * 겹치므로, setId 없이 문단 id만 쓰면 서로 다른 지문의 캐시가 충돌한다. (실제로 광합성과
 * 명실론이 둘 다 s1_p4라 캐시를 공유해, 명실론이 광합성 골드로 잘못 평가된 적이 있다.)
 */
function slug(setId: string, paragraphId: string): string {
  return `${setId}_${paragraphId}`.replace(/[^\w-]/g, '_');
}

async function testResponsesFor(cacheKey: string, paragraphText: string): Promise<TestResponses> {
  const path = resolve(CACHE, `${cacheKey}.responses.json`);
  if (existsSync(path)) {
    console.log(`  테스트 응답: 캐시 재사용 (${path})`);
    return JSON.parse(readFileSync(path, 'utf8')) as TestResponses;
  }

  const generated = await generateTestResponses(paragraphText, cacheKey);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
  console.log(`  테스트 응답: 새로 생성해 고정 (${path})`);
  return generated;
}

function summarize(gold: Gold): string {
  return (
    `슬롯 ${gold.slots.length}개 [${gold.slots.map((s) => `${s.slotId}:${s.sentences.join('+')}`).join(', ')}]` +
    `  명제 ${gold.propositions.length}  평가링크 ${gold.evaluationLinks.length}`
  );
}

async function main(): Promise<void> {
  const setId = process.argv[2];
  const index = Number(process.argv[3] ?? '0');
  const runs = Number(process.argv[4] ?? '3');
  if (setId === undefined) {
    console.error('사용법: npm run agreement -- <setId> [bodyParagraphIndex] [반복수]');
    process.exit(1);
  }

  const passage = loadPassage(DATASET, setId);
  const paragraph = bodyParagraphs(passage)[index];
  if (paragraph === undefined) {
    console.error(`본문 문단 ${index}가 없다`);
    process.exit(1);
  }

  const key = slug(setId, paragraph.id);

  console.log(`지문: ${passage.title}`);
  console.log(`문단: ${paragraph.id} (${paragraph.text.length}자)  캐시키: ${key}\n`);

  const responses = await testResponsesFor(key, paragraph.text);
  console.log(`\n═══ 테스트 학생 응답 ${responses.responses.length}개 ═══`);
  for (const r of responses.responses) {
    console.log(`\n  [${r.id}] ${r.kind} — ${r.intent}`);
    console.log(`      ${r.text}`);
  }

  console.log(`\n═══ 골드 ${runs}회 독립 생성 ═══`);
  const golds: Gold[] = [];
  for (let i = 1; i <= runs; i++) {
    // 완성된 골드는 디스크에 캐시한다. 중간에 죽어도 이미 만든 것을 잃지 않는다.
    const goldPath = resolve(CACHE, `${key}.gold-${i}.json`);
    let gold: Gold;
    if (existsSync(goldPath)) {
      gold = JSON.parse(readFileSync(goldPath, 'utf8')) as Gold;
      console.log(`  g${i}: 캐시 재사용 — ${summarize(gold)}`);
    } else {
      // 골드마다 별도 단계 캐시 — 공유하면 세 골드가 같아져 재현성 측정이 무의미해진다.
      // 단계별로 저장되므로 compose 실패 시 decompose는 재사용된다.
      const stepDir = resolve(CACHE, `${key}.gold-${i}.steps`);
      gold = await buildGold(paragraph.text, passage.tags, paragraph.id, stepDir);
      mkdirSync(dirname(goldPath), { recursive: true });
      writeFileSync(goldPath, `${JSON.stringify(gold, null, 2)}\n`, 'utf8');
      console.log(`  g${i}: ${summarize(gold)}`);
    }
    golds.push(gold);
  }

  console.log(`\n═══ 판정 ═══`);
  const reports: AgreementReport[] = [];

  for (const response of responses.responses) {
    const inputs: EvaluationInput[] = [];

    for (const [i, gold] of golds.entries()) {
      const propById = new Map(gold.propositions.map((p) => [p.id, p]));
      const result = await evaluate(
        paragraph.text,
        gold.slots.map((s) => ({
          slotId: s.slotId,
          shortForm: s.shortForm,
          requiredReasoningCore: s.requiredReasoningCore,
          propositions: s.traceabilityPropositions.map((id) => ({
            id,
            text: propById.get(id)?.text ?? id,
            aspect: propById.get(id)?.aspect ?? '',
          })),
        })),
        gold.evaluationLinks.map((l) => ({
          source: l.source,
          target: l.target,
          relation: l.relation,
          contrastAxis: l.contrastAxis,
          evaluationEffect: l.evaluationEffect,
        })),
        response.text,
        paragraph.id,
      );

      const sentencesOf = (slotId: string): readonly string[] =>
        gold.slots.find((s) => s.slotId === slotId)?.sentences ?? [];

      inputs.push({
        goldId: `g${i + 1}`,
        slots: result.slotVerdicts.map((v) => ({
          slotId: v.slotId,
          verdict: v.verdict,
          sentences: sentencesOf(v.slotId),
        })),
        firstTarget: {
          kind: result.firstRevisionTarget.kind,
          sentences: sentencesOf(result.firstRevisionTarget.slotId),
        },
      });

      const verdictLine = result.slotVerdicts
        .map((v) => `${v.slotId}:${v.verdict}`)
        .join(' ');
      console.log(
        `  [${response.id}/${response.kind}] g${i + 1}  ${verdictLine}` +
          `  → 첫 수정: ${result.firstRevisionTarget.kind}` +
          `(${result.firstRevisionTarget.slotId || '-'})`,
      );
    }

    reports.push(measureAgreement(response.id, inputs.map(toSentenceVerdicts)));
  }

  // 우선 지표: 학습 경험의 골격. 단순 문장 일치율보다 이쪽을 먼저 본다.
  console.log(`\n═══ 우선 지표 (학습 골격) ═══`);
  console.log('  응답      모순유무   수정필요   첫수정종류   첫수정대상');
  for (const r of reports) {
    const kind = responses.responses.find((x) => x.id === r.responseId)?.kind ?? '';
    console.log(
      `  ${r.responseId.padEnd(4)} ${kind.padEnd(7)} ` +
        `${(r.contradictionAgreement ? '일치' : '불일치').padEnd(8)}  ` +
        `${(r.revisionNeededAgreement ? '일치' : '불일치').padEnd(8)}  ` +
        `${(r.firstTargetKindAgreement ? '일치' : '불일치').padEnd(10)}  ` +
        `${(r.firstTargetOverlap * 100).toFixed(0).padStart(4)}%`,
    );
  }
  const n = reports.length;
  const count = (f: (r: AgreementReport) => boolean): string => `${reports.filter(f).length}/${n}`;
  console.log(`\n  모순 유무 일치:   ${count((r) => r.contradictionAgreement)}`);
  console.log(`  수정 필요 일치:   ${count((r) => r.revisionNeededAgreement)}`);
  console.log(`  첫 수정 종류 일치: ${count((r) => r.firstTargetKindAgreement)}`);
  const avgOverlap = reports.reduce((s, r) => s + r.firstTargetOverlap, 0) / n;
  console.log(`  첫 수정 대상 평균 겹침: ${(avgOverlap * 100).toFixed(0)}%`);

  // 참고 지표: 세부 일치. semantic과 granularity를 분리한다.
  console.log(`\n═══ 참고 지표 (세부 일치) ═══`);
  console.log('  응답      의미일치   문장일치   입도변이');
  for (const r of reports) {
    const kind = responses.responses.find((x) => x.id === r.responseId)?.kind ?? '';
    console.log(
      `  ${r.responseId.padEnd(4)} ${kind.padEnd(7)} ` +
        `${(r.semanticAgreementRate * 100).toFixed(0).padStart(6)}%   ` +
        `${(r.sentenceAgreementRate * 100).toFixed(0).padStart(6)}%   ` +
        `${String(r.granularityVarianceCount).padStart(4)}건`,
    );
  }
  const avgSem = reports.reduce((s, r) => s + r.semanticAgreementRate, 0) / n;
  const avgAll = reports.reduce((s, r) => s + r.sentenceAgreementRate, 0) / n;
  console.log(`\n  의미 평균 일치율: ${(avgSem * 100).toFixed(1)}%  (granularity 제외)`);
  console.log(`  문장 평균 일치율: ${(avgAll * 100).toFixed(1)}%  (전체)`);

  const { semantic, granularity } = collectBundles(reports);
  const sentenceText = (id: string): string =>
    golds[0]?.sentences.find((s) => s.id === id)?.text ?? '(원문 없음)';
  const printBundles = (title: string, bundles: readonly { sentence: string; cases: readonly { responseId: string; verdicts: readonly { goldId: string; verdict: string }[] }[] }[]): void => {
    console.log(`\n═══ ${title} ${bundles.length}건 ═══`);
    if (bundles.length === 0) console.log('  없음');
    for (const b of bundles) {
      console.log(`\n  ${b.sentence}: ${sentenceText(b.sentence)}`);
      for (const c of b.cases) {
        console.log(`    [${c.responseId}] ${c.verdicts.map((v) => `${v.goldId}=${v.verdict}`).join('  ')}`);
      }
    }
  };
  printBundles('semantic ambiguity bundle', semantic);
  printBundles('granularity variance (별도 기록, 규칙 변경 근거 아님)', granularity);

  const outPath = resolve(CACHE, `${key}.agreement.json`);
  writeFileSync(
    outPath,
    `${JSON.stringify(
      { setId, title: passage.title, paragraphId: paragraph.id, runs, reports, semantic, granularity },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`\n기록: ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
