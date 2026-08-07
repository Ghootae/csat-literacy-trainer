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
import { EVAL_REQUEST_FINGERPRINT, type QueryEval, evaluateQueries } from './llm/query-eval.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import { type EvalSet, type Gold as LibGold, generatedEvalSet, paragraphText } from './query-gen-lib.js';
import { type RawQueryVerdict, normalizeQueryStates } from './query-normalize.js';

export interface EvaluatedResponse {
  readonly assessments: readonly RegionAssessment[];
  /** 영역 → 학생 응답에서 인용된 조각. 응답↔영역 매핑 표시용 (§4.1.3). */
  readonly said: ReadonlyMap<string, readonly string[]>;
  /** 영역 → 원문 문장 id. 하이라이트 좌표. */
  readonly sentenceIds: ReadonlyMap<string, readonly string[]>;
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
  const set: EvalSet = generatedEvalSet('gen', gen);
  const paraText = paragraphText(gold as unknown as LibGold);
  const qeval = await runEval(paraText, set, response, gold.paragraphId, cacheDir);

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
    requestFingerprint: EVAL_REQUEST_FINGERPRINT,
  });
  const path = resolve(cacheDir, `${key}.json`);
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as QueryEval;
  const fresh = await evaluateQueries(paraText, set.queries, response, paragraphId);
  writeFileSync(path, JSON.stringify(fresh, null, 2), 'utf8');
  return fresh;
}
