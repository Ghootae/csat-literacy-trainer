/**
 * 골드 재현성 측정 — 구조가 아니라 **판정**을 비교한다.
 *
 * 같은 문단으로 골드를 3회 독립 생성하면 슬롯 id도 경계도 달라진다. 구조를 직접 비교하면
 * 항상 "다르다"가 나오지만, 학습자에게 중요한 것은 구조가 아니라 **자기 답이 어떻게
 * 판정되는가**다. 슬롯 경계가 달라도 같은 응답에 같은 판정이 나오면 실질적으로 같은 골드다.
 *
 * 비교 축은 **문장 번호**다. 슬롯 → traceability 명제 → sourceSentences로 환원하면
 * 골드마다 다른 슬롯 id가 공통 좌표계로 옮겨진다.
 */

export type Verdict = '충족' | '부분' | '누락' | '모순';

/** 심각한 순. 한 문장이 여러 슬롯에 걸리면 가장 심각한 판정을 그 문장의 판정으로 삼는다. */
const SEVERITY: Record<Verdict, number> = { 모순: 3, 누락: 2, 부분: 1, 충족: 0 };

export interface SlotEvaluationInput {
  readonly slotId: string;
  readonly verdict: Verdict;
  /** 이 슬롯이 덮는 원문 문장 번호. traceability 명제의 sourceSentences 합집합. */
  readonly sentences: readonly string[];
}

export interface EvaluationInput {
  readonly goldId: string;
  readonly slots: readonly SlotEvaluationInput[];
  readonly firstTarget: {
    readonly kind: string;
    /** 첫 수정 타겟 슬롯이 덮는 문장. 없으면 빈 배열. */
    readonly sentences: readonly string[];
  };
}

/** 골드 하나에 대한 판정을 문장 좌표계로 옮긴 것. */
export interface SentenceVerdicts {
  readonly goldId: string;
  readonly bySentence: ReadonlyMap<string, Verdict>;
  readonly hasContradiction: boolean;
  readonly firstTargetKind: string;
  readonly firstTargetSentences: readonly string[];
}

export function toSentenceVerdicts(input: EvaluationInput): SentenceVerdicts {
  const bySentence = new Map<string, Verdict>();

  for (const slot of input.slots) {
    for (const s of slot.sentences) {
      const existing = bySentence.get(s);
      if (existing === undefined || SEVERITY[slot.verdict] > SEVERITY[existing]) {
        bySentence.set(s, slot.verdict);
      }
    }
  }

  return {
    goldId: input.goldId,
    bySentence,
    hasContradiction: input.slots.some((s) => s.verdict === '모순'),
    firstTargetKind: input.firstTarget.kind,
    firstTargetSentences: [...input.firstTarget.sentences].sort(),
  };
}

/**
 * 판정 불일치의 성격.
 *
 * - `semantic`: 의미 해석이 실제로 갈렸다. 모순 유무가 다르거나, 충족↔누락이 정면 충돌.
 *   ambiguity bundle로 다뤄야 할 진짜 애매성.
 * - `granularity`: 넓은 슬롯이 '부분'으로 희석된 것 vs 좁은 슬롯이 충족·누락으로 확정된 것.
 *   같은 응답을 슬롯 입도만 다르게 재단한 결과이며, 의미 애매성이 아니다.
 */
export type DisputeKind = 'semantic' | 'granularity';

export function classifyDispute(verdicts: readonly Verdict[]): DisputeKind {
  const set = new Set(verdicts);
  if (set.has('모순')) return 'semantic';
  // 부분이 한쪽 끝(충족 또는 누락)과만 붙어 있으면 입도 차이다.
  // 충족과 누락이 동시에 있으면 커버 여부 자체가 갈린 것이라 의미 문제.
  if (set.has('부분') && !(set.has('충족') && set.has('누락'))) return 'granularity';
  return 'semantic';
}

export interface DisputedSentence {
  readonly sentence: string;
  readonly verdicts: readonly { goldId: string; verdict: Verdict }[];
  readonly kind: DisputeKind;
}

export interface AgreementReport {
  readonly responseId: string;
  readonly fullAgreement: boolean;
  readonly disputedSentences: readonly DisputedSentence[];

  // ── 우선 지표: 학습 경험의 골격 ────────────────────────────
  /** 모순 유무 판정이 일치했는가. Gate A 발동 여부. */
  readonly contradictionAgreement: boolean;
  /** 수정이 필요한가(첫 수정 종류가 '없음'인지)의 판정이 일치했는가. */
  readonly revisionNeededAgreement: boolean;
  /** 첫 수정 타겟의 종류(모순 교정/누락 보완/없음)가 일치했는가. */
  readonly firstTargetKindAgreement: boolean;
  /** 첫 수정의 **의미적 대상**(가리키는 문장 집합)이 겹치는 정도 (Jaccard). */
  readonly firstTargetOverlap: number;

  // ── 참고 지표: 세부 일치 ───────────────────────────────────
  /** 판정이 일치한 문장 수 / 전체. semantic·granularity 불일치를 모두 포함. */
  readonly sentenceAgreementRate: number;
  /** granularity variance를 제외한 순수 의미 일치율. */
  readonly semanticAgreementRate: number;
  /** 입도 차이로만 갈린 문장 수. */
  readonly granularityVarianceCount: number;
}

export function measureAgreement(
  responseId: string,
  evaluations: readonly SentenceVerdicts[],
): AgreementReport {
  const sentences = [
    ...new Set(evaluations.flatMap((e) => [...e.bySentence.keys()])),
  ].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  const disputed: DisputedSentence[] = [];
  let agreed = 0;
  let granularity = 0;

  for (const s of sentences) {
    const verdicts = evaluations.map((e) => ({
      goldId: e.goldId,
      verdict: e.bySentence.get(s) ?? ('누락' as Verdict),
    }));
    if (new Set(verdicts.map((v) => v.verdict)).size === 1) {
      agreed += 1;
      continue;
    }
    const kind = classifyDispute(verdicts.map((v) => v.verdict));
    if (kind === 'granularity') granularity += 1;
    disputed.push({ sentence: s, verdicts, kind });
  }

  const total = sentences.length;
  const semanticDisputes = disputed.filter((d) => d.kind === 'semantic').length;
  // '수정 필요 여부'는 첫 수정 종류가 '없음'인지로 판단한다.
  const revisionNeeded = evaluations.map((e) => e.firstTargetKind !== '없음');

  return {
    responseId,
    fullAgreement: disputed.length === 0,
    disputedSentences: disputed,
    contradictionAgreement: new Set(evaluations.map((e) => e.hasContradiction)).size === 1,
    revisionNeededAgreement: new Set(revisionNeeded).size === 1,
    firstTargetKindAgreement: new Set(evaluations.map((e) => e.firstTargetKind)).size === 1,
    firstTargetOverlap: jaccard(evaluations.map((e) => e.firstTargetSentences)),
    sentenceAgreementRate: total === 0 ? 1 : agreed / total,
    semanticAgreementRate: total === 0 ? 1 : (total - semanticDisputes) / total,
    granularityVarianceCount: granularity,
  };
}

/** 여러 집합의 교집합 / 합집합. 전부 비어 있으면 1(완전 일치)로 본다. */
export function jaccard(sets: readonly (readonly string[])[]): number {
  if (sets.length === 0) return 1;
  const asSets = sets.map((s) => new Set(s));
  const union = new Set(sets.flat());
  if (union.size === 0) return 1;
  const intersection = [...union].filter((x) => asSets.every((s) => s.has(x)));
  return intersection.length / union.size;
}

/**
 * 판정이 갈린 의미 구간만 모은다.
 *
 * 전체를 복수 골드로 만들지 않고, **실제로 판정이 달라진 구간에만** ambiguity bundle을
 * 만든다는 방침의 산출물이다. 구조가 달라도 판정이 같으면 손댈 필요가 없다.
 */
export interface DisputeCase {
  readonly responseId: string;
  readonly verdicts: readonly { goldId: string; verdict: Verdict }[];
}

export interface Bundle {
  readonly sentence: string;
  readonly cases: readonly DisputeCase[];
}

/**
 * 판정이 갈린 구간을 성격별로 나눠 모은다.
 *
 * `semantic`만 진짜 ambiguity bundle이다 — 복수 골드로 다뤄야 할 의미 애매성.
 * `granularity`는 슬롯 입도 차이로만 갈린 것이라 별도 기록한다. 규칙을 바꾸는 근거가
 * 되지 않도록 둘을 섞지 않는다.
 */
export function collectBundles(reports: readonly AgreementReport[]): {
  semantic: readonly Bundle[];
  granularity: readonly Bundle[];
} {
  const buckets: Record<DisputeKind, Map<string, DisputeCase[]>> = {
    semantic: new Map(),
    granularity: new Map(),
  };

  for (const r of reports) {
    for (const d of r.disputedSentences) {
      const m = buckets[d.kind];
      m.set(d.sentence, [
        ...(m.get(d.sentence) ?? []),
        { responseId: r.responseId, verdicts: d.verdicts },
      ]);
    }
  }

  const toBundles = (m: Map<string, DisputeCase[]>): Bundle[] =>
    [...m.entries()]
      .map(([sentence, cases]) => ({ sentence, cases }))
      .sort((a, b) => a.sentence.localeCompare(b.sentence, 'en', { numeric: true }));

  return { semantic: toBundles(buckets.semantic), granularity: toBundles(buckets.granularity) };
}
