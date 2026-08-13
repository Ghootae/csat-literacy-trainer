/**
 * 골드 생성 파이프라인 — 문단 하나를 완성된 골드로.
 *
 *   1. 명제 분해 (완전성 검증 + 재시도)
 *   2. 합성 (primary 지정 + secondary 후보)
 *   3. 링크 후보 심사 (반사실 증인)
 *   4~7. 정규화 (통과 노드 제거 · 링크 병합 · discourse 분리)
 *   8. 슬롯 선정 + 핵심 사고 관계
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { compose, decompose, slotCores, verifyLinks } from './llm/kernel.js';
import type { Composed, Decomposed, LinkVerdicts, SlotCores } from './llm/schemas.js';
import { createGoldGenerationMetadata, type GoldGenerationMetadata } from './gold-generation-metadata.js';
import type { SemanticVerificationRecord } from './semantic-verification.js';
import {
  type DraftLink,
  type DraftNode,
  type MergedLink,
  normalizeHierarchy,
  selectSlots,
  traceabilityPropositions,
} from './normalize.js';

export interface GoldSlot {
  readonly slotId: string;
  readonly shortForm: string;
  readonly requiredReasoningCore: readonly string[];
  readonly traceabilityPropositions: readonly string[];
  /** 이 슬롯이 덮는 원문 문장. 골드 간 판정 비교의 공통 좌표계다. */
  readonly sentences: readonly string[];
}

export interface Gold {
  readonly paragraphId: string;
  readonly titleId: string;
  readonly nodes: readonly DraftNode[];
  readonly propositions: Decomposed['propositions'];
  readonly sentences: Decomposed['sentences'];
  readonly slots: readonly GoldSlot[];
  readonly evaluationLinks: readonly MergedLink[];
  readonly discourseLinks: readonly MergedLink[];
  readonly log: readonly string[];
  /** 새 생성물에만 기록한다. 없는 기존 골드는 `legacy/no-fingerprint`로 정상 로드한다. */
  readonly generationMetadata?: GoldGenerationMetadata;
  /** production 편입 전 원문과 독립 대조한 결과. 생성 review 기록과 별개다. */
  readonly semanticVerification?: SemanticVerificationRecord;
}

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
      (e): DraftLink => ({ fromId: e.fromId, toId: e.toId, type: e.type }),
    ),
  ];

  return { nodes, links };
}

/**
 * 하위 단계 산출물을 파일에 캐시한다. LLM 호출이 40~50초씩 걸려 그 사이 연결이 끊기면
 * 골드 전체를 잃는데, 단계별로 저장하면 실패한 단계부터 재개할 수 있다.
 * `cacheDir`이 없으면 캐시 없이 매번 새로 만든다 (테스트·1회성 실행용).
 */
async function cachedStep<T>(
  cacheDir: string | undefined,
  key: string,
  produce: () => Promise<T>,
): Promise<T> {
  if (cacheDir === undefined) return produce();

  const path = `${cacheDir}/${key}.json`;
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as T;

  const result = await produce();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(result)}\n`, 'utf8');
  return result;
}

export async function buildGold(
  paragraphText: string,
  tags: readonly string[],
  paragraphId: string,
  cacheDir?: string,
): Promise<Gold> {
  const d = await cachedStep(cacheDir, 'decompose', () =>
    decompose(paragraphText, tags, paragraphId),
  );
  const c = await cachedStep(cacheDir, 'compose', () => compose(paragraphText, d, paragraphId));
  const draft = toDraft(d, c);

  // 분해와 합성이 낸 링크는 후보일 뿐이다. 반사실 증인을 만들 수 있는 것만 평가용이 된다.
  const verdicts = await cachedStep(cacheDir, 'verify', () =>
    verifyLinks(
      paragraphText,
      d.propositions.map((p) => ({
        id: p.id,
        text: p.text,
        aspect: p.aspect,
        subjectRole: p.subjectRole,
      })),
      draft.links,
      paragraphId,
    ),
  ) satisfies LinkVerdicts;

  const verified: DraftLink[] = draft.links.map((l) => {
    const v = verdicts.verdicts.find((x) => x.fromId === l.fromId && x.toId === l.toId);
    return v?.promote === true
      ? { ...l, witness: v.witness, evaluationEffect: v.evaluationEffect }
      : { fromId: l.fromId, toId: l.toId, type: l.type };
  });

  const preSlots = selectSlots(draft.nodes, c.titleId).slots;
  const norm = normalizeHierarchy(draft.nodes, verified, preSlots);
  const slotLog: string[] = [];
  const { slots: slotIds, absorbed } = selectSlots(norm.nodes, c.titleId, slotLog);

  const byId = new Map(norm.nodes.map((n) => [n.id, n]));
  const propById = new Map(d.propositions.map((p) => [p.id, p]));
  const traceability = new Map(
    slotIds.map((id) => [id, traceabilityPropositions(norm.nodes, id, absorbed)]),
  );

  const cores = await cachedStep(cacheDir, 'slot-cores', () =>
    slotCores(
      paragraphText,
      slotIds.map((id) => ({
        id,
        shortForm: byId.get(id)?.shortForm ?? id,
        propositions: (traceability.get(id) ?? []).map((p) => propById.get(p)?.text ?? p),
      })),
      paragraphId,
    ),
  ) satisfies SlotCores;

  const slots: GoldSlot[] = slotIds.map((id) => {
    const props = traceability.get(id) ?? [];
    return {
      slotId: id,
      shortForm: byId.get(id)?.shortForm ?? id,
      requiredReasoningCore: cores.slots.find((s) => s.slotId === id)?.requiredReasoningCore ?? [],
      traceabilityPropositions: props,
      sentences: [
        ...new Set(props.flatMap((p) => propById.get(p)?.sourceSentences ?? [])),
      ].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
    };
  });

  return {
    paragraphId,
    titleId: c.titleId,
    nodes: norm.nodes,
    propositions: d.propositions,
    sentences: d.sentences,
    slots,
    evaluationLinks: norm.evaluationLinks,
    discourseLinks: norm.discourseLinks,
    log: [...norm.log, ...slotLog],
    generationMetadata: createGoldGenerationMetadata(paragraphText),
  };
}
