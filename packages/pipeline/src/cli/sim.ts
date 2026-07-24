/**
 * 학습 인터랙션 시뮬레이션 — 슬롯 하나에 대한 학생 답을 실제 evaluate 엔진으로 판정한다.
 *
 *   npm run sim -- <slotId> "<학생 답>"
 *   npm run sim -- --slots            # 슬롯 목록만 출력
 *
 * 실제 앱의 슬롯 단위 흐름을 재현한다: 학생이 코어 슬롯 하나를 요약하면, 명제 단위로
 * 대조해 충족/부분/누락/모순을 판정하고 그에 맞는 피드백을 낸다.
 *
 * 골드는 캐시된 g1(.omc/agreement/s1_p1.gold-1.json)을 쓴다. 문단은 법인 지문.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadPassage } from '../adapter.js';
import type { Gold } from '../gold.js';
import { evaluate } from '../llm/evaluate.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const GOLD_PATH = resolve(process.cwd(), '.omc/agreement/s1_p1.gold-1.json');
const SET_ID = '69bbf88d8937cf14551903ca';
const PARAGRAPH_INDEX = 0;

async function main(): Promise<void> {
  const gold = JSON.parse(readFileSync(GOLD_PATH, 'utf8')) as Gold;
  const paragraph = loadPassage(DATASET, SET_ID).sections[0]!.paragraphs[PARAGRAPH_INDEX]!;

  if (process.argv[2] === '--slots') {
    console.log('코어 슬롯:\n');
    for (const s of gold.slots) {
      console.log(`  [${s.slotId}] ${s.shortForm}  (문장 ${s.sentences.join('+')})`);
    }
    return;
  }

  const slotId = process.argv[2];
  const studentText = process.argv[3];
  if (slotId === undefined || studentText === undefined) {
    console.error('사용법: npm run sim -- <slotId> "<학생 답>"   또는   npm run sim -- --slots');
    process.exit(1);
  }

  const slot = gold.slots.find((s) => s.slotId === slotId);
  if (slot === undefined) {
    console.error(`슬롯 ${slotId} 없음. 목록: ${gold.slots.map((s) => s.slotId).join(', ')}`);
    process.exit(1);
  }

  const propById = new Map(gold.propositions.map((p) => [p.id, p]));

  console.log(`\n▸ 슬롯 [${slot.slotId}] ${slot.shortForm}`);
  console.log(`▸ 학생 답: "${studentText}"\n`);

  // 이 슬롯 하나만 평가한다. 역할 분리 링크는 함께 넘겨 모순 오판을 막는다.
  const result = await evaluate(
    paragraph.text,
    [
      {
        slotId: slot.slotId,
        shortForm: slot.shortForm,
        requiredReasoningCore: slot.requiredReasoningCore,
        propositions: slot.traceabilityPropositions.map((id) => ({
          id,
          text: propById.get(id)?.text ?? id,
          aspect: propById.get(id)?.aspect ?? '',
        })),
      },
    ],
    gold.evaluationLinks.map((l) => ({
      source: l.source,
      target: l.target,
      relation: l.relation,
      contrastAxis: l.contrastAxis,
      evaluationEffect: l.evaluationEffect,
    })),
    studentText,
    paragraph.id,
  );

  const v = result.slotVerdicts.find((x) => x.slotId === slot.slotId) ?? result.slotVerdicts[0]!;

  const badge = { 충족: '✅ 충족', 부분: '◐ 부분 충족', 누락: '○ 누락', 모순: '⚠ 모순' }[v.verdict];
  console.log(`━━━ 판정: ${badge} ━━━\n`);

  if (v.coveredCore.length > 0) {
    console.log('담아낸 사고 관계:');
    for (const c of v.coveredCore) console.log(`  ✓ ${c}`);
  }

  if (v.verdict === '모순') {
    // Gate A: 강제 교정. 무엇이 모순인지 지적하되 정답은 주지 않는다.
    console.log('\n⚠ 이 부분은 문단과 어긋납니다. 다음으로 넘어가기 전에 다시 확인하세요:');
    console.log(`  → ${v.contradiction}`);
    console.log(`\n  [${result.firstRevisionTarget.kind}] ${result.firstRevisionTarget.what}`);
  } else if (v.missingCore.length > 0) {
    // 누락·부분: 무엇이 빠졌는지 위치만, 방향만. 답은 감춘다.
    console.log('\n아직 담기지 않은 것 (직접 찾아보세요):');
    for (const c of v.missingCore) console.log(`  · ${c}`);
    if (result.firstRevisionTarget.kind !== '없음') {
      console.log(`\n  다음에 고쳐볼 것: ${result.firstRevisionTarget.what}`);
    }
    console.log('\n  선택: [더 채워보기] 또는 [다음 슬롯으로]');
  } else {
    // 충족: 간략화된 정답 공개 + 통과.
    console.log('\n핵심을 모두 담았습니다. 이 슬롯의 정리:');
    const gp = gold.slots.find((s) => s.slotId === slot.slotId);
    console.log(`  「${gp?.shortForm}」`);
    console.log('\n  ✅ 통과 — 다음 슬롯으로.');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
