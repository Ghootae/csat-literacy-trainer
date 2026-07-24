/**
 * D0 스모크 테스트 — 커널 + 정규화 파이프라인을 실제 문단 하나에 돌린다.
 *
 *   npm run d0 -- <setId> <bodyParagraphIndex>
 *
 * 파이프라인: 분해 → 합성 → 정규화(통과 노드 제거·링크 병합·discourse 분리) → 슬롯 코어.
 * 정규화 전후 구조를 함께 출력해 무엇이 왜 바뀌었는지 검토할 수 있게 한다.
 */

import { bodyParagraphs } from '@csat/core';

import { loadPassage } from '../adapter.js';
import { compose, decompose, regenerate, slotCores, verifyLinks } from '../llm/kernel.js';
import type { Composed, Decomposed } from '../llm/schemas.js';
import {
  type DraftLink,
  type DraftNode,
  normalizeHierarchy,
  selectSlots,
  traceabilityPropositions,
} from '../normalize.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';

/** 합성 결과를 정규화가 다루는 형태로 옮긴다. */
function toDraft(d: Decomposed, c: Composed): { nodes: DraftNode[]; links: DraftLink[] } {
  const nodes: DraftNode[] = [
    ...c.composites.map(
      (x): DraftNode => ({
        id: x.id,
        kind: x.id === c.titleId ? 'title' : 'composite',
        text: x.text,
        shortForm: x.shortForm,
        childIds: x.childIds,
        introducesRelation: x.introducesRelation,
        subsumedByParent: x.subsumedByParent,
      }),
    ),
    ...d.propositions.map(
      (p): DraftNode => ({
        id: p.id,
        kind: 'proposition',
        text: p.text,
        shortForm: p.shortForm,
        aspect: p.aspect,
        subjectRole: p.subjectRole,
        standaloneSlotValue: p.standaloneSlotValue,
        childIds: [],
      }),
    ),
  ];

  const links: DraftLink[] = [
    ...d.propositions.flatMap((p) =>
      p.links.map((l): DraftLink => ({ fromId: p.id, toId: l.targetId, type: l.type })),
    ),
    ...c.secondaryEdges.map(
      (e): DraftLink => ({
        fromId: e.fromId,
        toId: e.toId,
        type: e.type,
        witness: e.witness,
        evaluationEffect: e.evaluationEffect,
      }),
    ),
  ];

  return { nodes, links };
}

function renderTree(nodes: readonly DraftNode[], id: string, depth = 0): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const node = byId.get(id);
  if (node === undefined) return [];
  const pad = '   '.repeat(depth);
  const line = `${pad}${node.id}  ${node.shortForm}`;
  return [line, ...node.childIds.flatMap((c) => renderTree(nodes, c, depth + 1))];
}

async function main(): Promise<void> {
  const setId = process.argv[2];
  const index = Number(process.argv[3] ?? '0');
  if (setId === undefined) {
    console.error('사용법: npm run d0 -- <setId> [bodyParagraphIndex]');
    process.exit(1);
  }

  const passage = loadPassage(DATASET, setId);
  const body = bodyParagraphs(passage);
  const paragraph = body[index];
  if (paragraph === undefined) {
    console.error(`본문 문단 ${index}가 없다 (총 ${body.length}개)`);
    process.exit(1);
  }

  console.log(`지문: ${passage.title} [${passage.category}]`);
  console.log(`문단: ${paragraph.id} (${paragraph.text.length}자, 본문 ${body.length}개 중 ${index})\n`);
  console.log(paragraph.text);

  // ── 1~2단계: 분해 ────────────────────────────────────────────
  const d = await decompose(paragraph.text, passage.tags, paragraph.id);

  console.log(`\n\n═══ 문장 ${d.sentences.length}개 ═══`);
  for (const s of d.sentences) console.log(`  ${s.id}. ${s.text}`);

  console.log(`\n═══ 명제 ${d.propositions.length}개 ═══`);
  for (const p of d.propositions) {
    console.log(`\n  ${p.id}  [${p.sourceSentences.join(',')}]  ${p.text}`);
    console.log(`      ${p.relation.from} →(${p.relation.kind}) ${p.relation.to}`);
    console.log(`      aspect=${p.aspect}  role=${p.subjectRole}  predicate=${p.predicate}`);
    if (p.exceptions.length > 0) for (const e of p.exceptions) console.log(`      ⚠ exception: ${e}`);
    for (const l of p.links) console.log(`      ⇢ ${l.type} → ${l.targetId}: ${l.rationale}`);
  }
  const totalExceptions = d.propositions.reduce((n, p) => n + p.exceptions.length, 0);
  console.log(`\n  exceptions 총 ${totalExceptions}건`);

  // ── 3단계: 합성 ──────────────────────────────────────────────
  const c = await compose(paragraph.text, d, paragraph.id);
  const draft = toDraft(d, c);

  console.log(`\n═══ 위계 (정규화 전) — 노드 ${draft.nodes.length}개 ═══`);
  for (const line of renderTree(draft.nodes, c.titleId)) console.log(`  ${line}`);
  for (const comp of c.composites) {
    console.log(
      `    ${comp.id}: introducesRelation=${comp.introducesRelation} subsumedByParent=${comp.subsumedByParent}`,
    );
  }
  console.log(`\n  프론티어 (전): [${selectSlots(draft.nodes, c.titleId).slots.join(', ')}]`);
  console.log(`  링크 후보 ${draft.links.length}개:`);
  for (const l of draft.links) console.log(`    ${l.fromId} →(${l.type})→ ${l.toId}`);

  // ── 5.5단계: 링크 후보 심사 ──────────────────────────────────
  const verdicts = await verifyLinks(
    paragraph.text,
    d.propositions.map((p) => ({
      id: p.id,
      text: p.text,
      aspect: p.aspect,
      subjectRole: p.subjectRole,
    })),
    draft.links,
    paragraph.id,
  );

  console.log(`\n═══ 링크 심사 ═══`);
  for (const v of verdicts.verdicts) {
    console.log(`  ${v.fromId}→${v.toId}  ${v.promote ? '✅ 승격' : '➖ 강등'}`);
    if (v.promote) {
      console.log(`      witness: "${v.witness}"`);
      console.log(`      effect: ${v.evaluationEffect}`);
    }
  }

  // 심사 결과를 링크에 반영한다. 승격되지 않은 후보는 witness가 없어 discourse로 밀린다.
  const verified: DraftLink[] = draft.links.map((l) => {
    const v = verdicts.verdicts.find((x) => x.fromId === l.fromId && x.toId === l.toId);
    return v?.promote === true
      ? { ...l, witness: v.witness, evaluationEffect: v.evaluationEffect }
      : { fromId: l.fromId, toId: l.toId, type: l.type };
  });

  // ── 4~7단계: 정규화 ──────────────────────────────────────────
  const preSlots = selectSlots(draft.nodes, c.titleId).slots;
  const norm = normalizeHierarchy(draft.nodes, verified, preSlots);
  const slotLog: string[] = [];
  const { slots, absorbed } = selectSlots(norm.nodes, c.titleId, slotLog);
  const fullLog = [...norm.log, ...slotLog];

  console.log(`\n═══ 정규화 ═══`);
  if (fullLog.length === 0) console.log('  변경 없음');
  for (const line of fullLog) console.log(`  · ${line}`);

  console.log(`\n═══ 위계 (정규화 후) — 노드 ${norm.nodes.length}개 ═══`);
  for (const line of renderTree(norm.nodes, c.titleId)) console.log(`  ${line}`);

  console.log(`\n  evaluation_secondary_links ${norm.evaluationLinks.length}개:`);
  for (const l of norm.evaluationLinks) {
    console.log(`    ${l.source} →(${l.relation})→ ${l.target}  [${l.relationProperties.join(', ')}]`);
    if (l.contrastAxis !== null) console.log(`        contrast_axis: ${l.contrastAxis}`);
    console.log(`        effect: ${l.evaluationEffect}`);
    console.log(`        witness: ${l.witness ?? '(없음)'}`);
  }
  console.log(`\n  discourse_links ${norm.discourseLinks.length}개 (평가 미사용):`);
  for (const l of norm.discourseLinks) console.log(`    ${l.source} →(${l.relation})→ ${l.target}`);

  // ── 8단계: 슬롯 코어 ─────────────────────────────────────────
  const byId = new Map(norm.nodes.map((n) => [n.id, n]));
  const slotSpecs = slots.map((id) => ({
    id,
    shortForm: byId.get(id)?.shortForm ?? id,
    traceability: traceabilityPropositions(norm.nodes, id, absorbed),
  }));

  const cores = await slotCores(
    paragraph.text,
    slotSpecs.map((s) => ({
      id: s.id,
      shortForm: s.shortForm,
      propositions: s.traceability.map((p) => byId.get(p)?.text ?? p),
    })),
    paragraph.id,
  );

  console.log(`\n═══ 슬롯 프론티어 ${slots.length}개 ═══`);
  if (absorbed.size > 0) {
    console.log(`  (흡수됨: ${[...absorbed].map(([a, b]) => `${a}→${b}`).join(', ')})`);
  }
  for (const s of slotSpecs) {
    const core = cores.slots.find((x) => x.slotId === s.id);
    console.log(`\n  ${s.id}  ${s.shortForm}`);
    console.log(`    traceability_propositions: [${s.traceability.join(', ')}]`);
    console.log(`    required_reasoning_core:`);
    for (const r of core?.requiredReasoningCore ?? []) console.log(`      - ${r}`);
  }

  // ── ablation 시연 ────────────────────────────────────────────
  const title = byId.get(c.titleId);
  if (title !== undefined && title.childIds.length > 1) {
    const [dropped, ...rest] = title.childIds;
    const ablated = await regenerate(
      title.text,
      rest.map((id) => byId.get(id)?.text ?? id),
      paragraph.id,
    );
    console.log(`\n═══ ablation 시연: 타이틀에서 ${dropped} 제거 ═══`);
    console.log(`  원본:   ${title.text}`);
    console.log(`  재생성: ${ablated}`);
  }

  const edges = norm.nodes.filter((n) => n.id !== c.titleId).length;
  console.log(`\n═══ 비용 ═══`);
  console.log(`  명제 ${d.propositions.length}개 · primary 간선 ${edges}개`);
  console.log(`  이 문단 전체 ablation = ${edges}회 호출`);
  console.log(`  계측: .omc/metrics/llm.jsonl`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
