/**
 * 학생 응답 하나를 평가해 **화면에 필요한 것 전부**를 낸다.
 *
 * LLM 호출은 1회(`evaluateQueries`)뿐이고 나머지는 결정적이다. CLI(`adhoc`)와 학습 UI 서버가
 * 같은 배선을 쓰도록 여기로 모았다 — 두 곳에 복사해 두면 한쪽만 고쳐져 판정이 갈린다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  type AssessQuery,
  type AssessRegionMeta,
  type QueryVerdict,
  type RegionAssessment,
  assess,
} from './assessment.js';
import { evalCacheKey } from './eval-cache-key.js';
import type { Gold as PipelineGold } from './gold.js';
import { evalRequestFingerprint, type QueryEval, evaluateQueries, warmEvalPrefix } from './llm/query-eval.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { type EvalSet, type Gold as LibGold, generatedEvalSet, paragraphText } from './query-gen-lib.js';
import { type NormalizedRegion, type RawQueryVerdict, normalizeQueryStates } from './query-normalize.js';

export interface EvaluatedResponse {
  readonly assessments: readonly RegionAssessment[];
  /** 영역 → 학생 응답에서 인용된 조각. 응답↔영역 매핑 표시용 (§4.1.3). */
  readonly said: ReadonlyMap<string, readonly string[]>;
  /** 영역 → 원문 문장 id. 하이라이트 좌표. */
  readonly sentenceIds: ReadonlyMap<string, readonly string[]>;
  /**
   * 질의 id → 원시 판정. **화면에는 쓰지 않는다** — 실험이 개별 질의가 어떻게 나왔는지
   * 봐야 할 때만 쓴다(예: 타이틀의 압축 판별이 반복에서 갈리는지).
   */
  readonly rawVerdicts: ReadonlyMap<string, QueryVerdict>;
  /**
   * 정규화된 영역. 화면은 `assessments`만 쓰지만, 회귀가 `overallCategory`처럼 영역 축을
   * 직접 받는 함수를 부르려면 이게 필요하다 — 없으면 정규화를 테스트가 다시 배선하게 된다.
   */
  readonly regions: readonly NormalizedRegion[];
}

/**
 * 접두부 예열. 학생이 문단을 여는 순간 부르면 첫 제출이 캐시 히트가 된다.
 *
 * **`evaluateResponse`와 같은 파일에 있는 이유가 여기다.** 접두부는 `generatedEvalSet` +
 * `paragraphText`로 만들어지므로, 호출부에서 질의를 따로 조립하면 접두부가 한 글자만 달라도
 * **다른 캐시를 데우고 예열이 통째로 헛일이 된다**(실측 2026-08-10: 예열 write=5621,
 * 실호출 write=5805, read=0). 같은 유도 경로를 쓰는 것이 유일한 보장이다.
 */
export async function warmResponsePrefix(gold: PipelineGold, gen: GeneratedQuerySet): Promise<void> {
  const set: EvalSet = generatedEvalSet('gen', gen);
  await warmEvalPrefix(paragraphText(gold as unknown as LibGold), set.queries, gold.paragraphId);
}

/**
 * @param cacheDir 지정하면 평가 결과를 캐시한다. 같은 응답을 다시 넣으면 호출하지 않는다.
 *   실험 재현과 개발 중 반복 실행에 쓴다. 지정하지 않으면 항상 호출한다.
 */
export async function evaluateResponse(
  gold: PipelineGold,
  gen: GeneratedQuerySet,
  response: string,
  cacheDir?: string,
): Promise<EvaluatedResponse> {
  const set: EvalSet = withPropositions(generatedEvalSet('gen', gen), gold, gen);
  const paraText = paragraphText(gold as unknown as LibGold);
  const qeval = await runEval(paraText, set, response, gold.paragraphId, cacheDir);
  return assembleResponse(gold, gen, qeval);
}

/**
 * 판정 → 화면 산출물. **LLM 이후의 전부이고 결정적이다.**
 *
 * `evaluateResponse`에서 떼어낸 이유는 회귀 때문이다. 실제로 관찰된 판정을 fixture로 박아
 * 두고 이 함수에 그대로 먹이면, API 키도 비용도 없이 **그 판정이 화면에서 어떤 결과가 되는지**를
 * 고정할 수 있다. 붙여 두면 회귀가 배선을 복사하게 되고, 그러면 한쪽만 고쳐져 판정이 갈린다.
 */
export function assembleResponse(
  gold: PipelineGold,
  gen: GeneratedQuerySet,
  qeval: QueryEval,
): EvaluatedResponse {
  const set: EvalSet = generatedEvalSet('gen', gen);

  const rawMap = new Map(qeval.verdicts.map((v) => [v.queryId, v as RawQueryVerdict]));
  const regions = normalizeQueryStates(rawMap, set.policy);
  const verdicts = new Map<string, QueryVerdict>(
    qeval.verdicts.map((v) => [
      v.queryId,
      {
        semanticState: v.semanticState,
        expressionMode: v.expressionMode,
        evidence: v.evidence,
        viaItem: v.viaItem,
        evidenceRole: v.evidenceRole,
        // 실험 중인 축. 판정에는 아직 안 쓰이고 측정용으로만 흘려보낸다.
        ...(v.propositionCoverage === undefined ? {} : { propositionCoverage: v.propositionCoverage }),
        // 'none'은 "모순이 아니다"라는 뜻이므로 모양으로 넘기지 않는다.
        ...(v.contradictionKind !== undefined && v.contradictionKind !== 'none'
          ? { contradictionKind: v.contradictionKind }
          : {}),
      },
    ]),
  );

  const regionMeta: AssessRegionMeta[] = set.shapes.map((s) => ({
    id: s.key,
    label: s.label,
    propositionIds: s.propositionIds,
  }));

  const shapeById = new Map(set.shapes.flatMap((r) => r.queries).map((q) => [q.id, q]));
  const pqById = new Map(set.queries.map((q) => [q.id, q]));
  const aq: AssessQuery[] = [];
  for (const rp of set.policy) {
    const add = (id: string, level: 'scope' | 'relation' | 'argument') =>
      aq.push({
        id,
        regionId: rp.id,
        level,
        question: pqById.get(id)?.question ?? '',
        propositionIds: shapeById.get(id)?.propositionIds ?? [],
        expectedAnswer: pqById.get(id)?.expectedAnswer ?? '',
        critical: rp.criticalForRelation.includes(id),
      });
    for (const id of rp.scopeQueries) add(id, 'scope');
    for (const id of rp.relationQueries) add(id, 'relation');
    for (const id of rp.argumentQueries) add(id, 'argument');
  }

  const propShort = new Map(gold.propositions.map((p) => [p.id, p.shortForm]));
  const assessments = assess(regions, regionMeta, aq, verdicts, propShort);

  // 인용은 `viaItem`이 아니라 `evidence`를 쓴다 — viaItem은 식별자("1", "첫 문장")라 화면에
  // 그대로 쓰면 무용하다. 같은 섹션의 전체와 부분 인용이 함께 잡히므로 포함되는 것은 접는다.
  const regionOf = new Map(aq.map((q) => [q.id, q.regionId]));
  const collected = new Map<string, Set<string>>();
  for (const v of qeval.verdicts) {
    const rid = regionOf.get(v.queryId);
    if (rid === undefined || v.semanticState === 'not_evidenced' || v.evidence.trim() === '') continue;
    (collected.get(rid) ?? collected.set(rid, new Set()).get(rid)!).add(v.evidence.trim());
  }
  const said = new Map<string, readonly string[]>();
  for (const [rid, set_] of collected) {
    const all = [...set_];
    said.set(rid, all.filter((s) => !all.some((o) => o !== s && o.includes(s))));
  }

  return {
    assessments,
    said,
    sentenceIds: new Map(gen.regions.map((r) => [r.regionId, r.sourceSentenceIds])),
    rawVerdicts: verdicts,
    regions,
  };
}

/**
 * 질의에 앵커 명제 목록을 붙인다. 모델이 명제별 커버리지를 내려면 무엇이 앵커인지 봐야 한다.
 * 채점 경로에서만 필요하다 — `assembleResponse`는 이미 나온 판정을 조립할 뿐이다.
 */
function withPropositions(set: EvalSet, gold: PipelineGold, gen: GeneratedQuerySet): EvalSet {
  const shortForm = new Map(gold.propositions.map((p) => [p.id, p.shortForm]));
  const anchors = new Map(
    gen.regions.flatMap((r) => r.queries.map((q) => [q.id, q.propositionIds] as const)),
  );
  return {
    ...set,
    queries: set.queries.map((q) => ({
      ...q,
      anchorPropositions: (anchors.get(q.id) ?? []).map((id) => ({ id, shortForm: shortForm.get(id) ?? id })),
    })),
  };
}

async function runEval(
  paraText: string,
  set: EvalSet,
  response: string,
  paragraphId: string,
  cacheDir?: string,
): Promise<QueryEval> {
  if (cacheDir === undefined) {
    return evaluateQueries(paraText, set.queries, response, paragraphId);
  }
  mkdirSync(cacheDir, { recursive: true });
  const key = evalCacheKey({
    paragraphId,
    probeText: response,
    queries: set.queries,
    requestFingerprint: evalRequestFingerprint(),
  });
  const path = resolve(cacheDir, `${key}.json`);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as QueryEval;
  const fresh = await evaluateQueries(paraText, set.queries, response, paragraphId);
  writeFileSync(path, JSON.stringify(fresh, null, 2), 'utf8');
  return fresh;
}
