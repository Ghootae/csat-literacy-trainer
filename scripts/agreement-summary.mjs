#!/usr/bin/env node
/**
 * 여러 문단의 재현성 측정 결과를 한 표로 모은다.
 * 우선 지표(모순 유무·수정 필요·첫 수정 종류·대상)를 문단 간 비교한다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CACHE = resolve(process.cwd(), '.omc/agreement');
const files = readdirSync(CACHE).filter((f) => f.endsWith('.agreement.json'));

if (files.length === 0) {
  console.error('측정 결과 없음. scripts/agreement-batch.sh를 먼저 실행하라.');
  process.exit(1);
}

const rows = [];
let totalSemantic = 0;
let totalGranularity = 0;

for (const f of files) {
  const d = JSON.parse(readFileSync(resolve(CACHE, f), 'utf8'));
  const reports = d.reports ?? [];
  const n = reports.length || 1;
  const rate = (pred) => reports.filter(pred).length / n;

  rows.push({
    paragraph: (d.title ?? d.paragraphId).slice(0, 24),
    contradiction: rate((r) => r.contradictionAgreement),
    revision: rate((r) => r.revisionNeededAgreement),
    firstKind: rate((r) => r.firstTargetKindAgreement),
    targetOverlap: reports.reduce((s, r) => s + r.firstTargetOverlap, 0) / n,
    semantic: reports.reduce((s, r) => s + r.semanticAgreementRate, 0) / n,
    semanticBundles: (d.semantic ?? []).length,
    granularityBundles: (d.granularity ?? []).length,
  });
  totalSemantic += (d.semantic ?? []).length;
  totalGranularity += (d.granularity ?? []).length;
}

const pct = (x) => `${(x * 100).toFixed(0)}%`.padStart(5);
console.log('\n문단별 우선 지표 (골드 3회 독립 생성에 대한 판정 일치)\n');
console.log('  문단                       모순유무  수정필요  첫수정종류  첫수정대상  의미일치  sem/gran');
for (const r of rows) {
  console.log(
    `  ${r.paragraph.padEnd(26)} ${pct(r.contradiction)}   ${pct(r.revision)}   ` +
      `${pct(r.firstKind)}     ${pct(r.targetOverlap)}    ${pct(r.semantic)}   ` +
      `${r.semanticBundles}/${r.granularityBundles}`,
  );
}

const avg = (key) => rows.reduce((s, r) => s + r[key], 0) / rows.length;
console.log(`\n  평균 모순 유무 일치:   ${pct(avg('contradiction'))}`);
console.log(`  평균 수정 필요 일치:   ${pct(avg('revision'))}`);
console.log(`  평균 첫 수정 종류 일치: ${pct(avg('firstKind'))}`);
console.log(`  평균 첫 수정 대상 겹침: ${pct(avg('targetOverlap'))}`);
console.log(`  평균 의미 일치율:      ${pct(avg('semantic'))}`);
console.log(`\n  총 semantic ambiguity: ${totalSemantic}건`);
console.log(`  총 granularity variance: ${totalGranularity}건 (별도 기록)`);
