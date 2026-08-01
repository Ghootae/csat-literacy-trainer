/**
 * 질의 상태 양방향 정규화 (Bidirectional Query-State Normalization).
 *
 * 질의 평가기의 원시 LLM 출력(질의별 semanticState/expressionMode)은 그대로 두고,
 * 그 위에 **결정적 코드**로 상·하위 질의를 서로 일관되게 정규화한다.
 *
 * 왜 단순 하향 게이트(scope 미포착 → 하위 자동 not_evidenced)가 아닌가:
 *   "자산은 법인 소유, 실제 운영은 권한자가 담당"처럼 상위 화제어(scope)를 직접 안 써도
 *   역할 분리 관계·논항을 보존하는 좋은 응답을 탈락시키면 안 된다. 그래서 하위 의미 증거로
 *   상위 scope를 **승격**하는 상향 규칙을 둔다.
 *
 * 영역 판정은 하나의 합친 라벨(explicit_high_resolution 등)이 아니라 **세 축으로 분리**한다:
 *   regionSemanticVerdict  의미 보존 수준 (관계 보존 여부)
 *   argumentCoverage       필수 논항 커버리지 (none/partial/full)
 *   expressionProfile      표현 방식 (explicit/implicit/mixed/none)
 * 표현 방식은 의미 판정의 성공 여부를 바꾸지 않는다. explicit_high_resolution은 세 축에서
 * 파생되는 편의 라벨(displayLabel)로만 남는다.
 */

export type SemanticState = 'preserved' | 'not_evidenced' | 'contradicted';
export type ExpressionMode = 'explicit' | 'implicit' | 'none';

/** 영역 의미 판정 — 표현·논항과 독립적인 의미 보존 수준. */
export type RegionSemanticVerdict =
  | 'region_not_evidenced'
  | 'topic_only'
  | 'partial_relation_preservation'
  | 'relation_preserved'
  | 'contradicted';

/** 필수 논항 커버리지 — 의미 판정과 별개 축. */
export type ArgumentCoverage = 'none' | 'partial' | 'full';

/** 표현 방식 프로필 — 보존된 핵심 질의의 explicit/implicit 집계. 의미 판정을 바꾸지 않는다. */
export type ExpressionProfile = 'explicit' | 'implicit' | 'mixed' | 'none';

/**
 * 학생 증거의 **종류**. semanticState("답을 담았는가")·expressionMode("직접인가 함축인가")와
 * 직교한다 — 질의에 답은 했지만 그 답이 관계 증거는 아닌 경우가 있기 때문이다.
 *
 * 필요해진 이유(N2-e, 2026-08-01): 생성기가 명칭 질의("공간은 몇 개이며 각각 무엇인가")를
 * `level: relation` + critical로 지정하면, 학생이 이름만 나열해도 관계 증거가 있는 것으로
 * 처리됐다. semanticState를 not_evidenced로 낮추는 방식은 쓸 수 없다 — 학생은 그 질의의
 * 답을 실제로 했고, 그 정보는 argumentCoverage가 정당하게 집계해야 한다(원칙 A: 두 축의 독립성).
 * 그래서 "답했는가"와 "관계 증거인가"를 갈라 놓는다.
 *
 * - `relation`              대상에 역할·방향·조건·인과·대조·순서가 배정됨. 대상 개수는 무관하다
 *                           ("엽육 세포에서 CO2를 붙잡아 저장" — 대상 하나여도 관계 증거).
 * - `entity_identification` 대상·개수를 지목했을 뿐 연결이 없음 ("엽육 세포와 유관속초 세포").
 * - `scope`                 화제만 지목.
 * - `none`                  preserved가 아닐 때.
 */
export type EvidenceRole = 'relation' | 'entity_identification' | 'scope' | 'none';

export interface RawQueryVerdict {
  readonly queryId: string;
  readonly semanticState: SemanticState;
  readonly expressionMode: ExpressionMode;
  /**
   * 선택 필드. **없으면 관계 증거로 간주한다** — 이 축이 도입되기 전의 판정 데이터와
   * 기존 테스트가 그대로 동작해야 하므로, 채워졌을 때만 게이트가 좁아진다.
   */
  readonly evidenceRole?: EvidenceRole;
}

/**
 * 상위 영역 정책. 미세 질의들을 scope+relation+argument로 묶고, 어느 하위 질의가
 * 관계 보존의 핵심(criticalForRelation)인지, 완전 논항 커버리지의 필수(requiredForFullArgument)인지
 * 지정한다. LLM에 전달되지 않는 순수 후처리 메타데이터다. criticalForRelation은 층위(관계 구조/논항)를
 * 가리지 않는다 — 예: 역할 주체 구별(q6a)은 논항 질의지만 관계 보존의 핵심이다.
 */
export interface RegionPolicy {
  readonly id: string;
  readonly label: string;
  readonly scopeQueries: readonly string[];
  readonly relationQueries: readonly string[];
  readonly argumentQueries: readonly string[];
  readonly criticalForRelation: readonly string[];
  readonly requiredForFullArgument: readonly string[];
}

export type ScopeSource =
  | 'scope_query'
  | 'promoted_relation'
  | 'promoted_argument'
  | 'promoted_contradiction'
  | 'none';

export interface ScopeState {
  readonly semanticState: SemanticState;
  readonly expressionMode: ExpressionMode;
  readonly source: ScopeSource;
}

export interface NormalizedRegion {
  readonly id: string;
  readonly label: string;
  readonly scope: ScopeState;
  /** 정규화 전 scope (scope 질의만 반영, 승격 미적용). raw↔normalized 차이 로깅용. */
  readonly rawScope: ScopeState;
  readonly scopePromoted: boolean;
  readonly relations: readonly RawQueryVerdict[];
  readonly arguments: readonly RawQueryVerdict[];
  readonly contradiction: boolean;
  // ── 세 축 ──
  readonly regionSemanticVerdict: RegionSemanticVerdict;
  readonly argumentCoverage: ArgumentCoverage;
  readonly expressionProfile: ExpressionProfile;
}

const MISSING: RawQueryVerdict = { queryId: '', semanticState: 'not_evidenced', expressionMode: 'none' };

function verdictsFor(ids: readonly string[], raw: ReadonlyMap<string, RawQueryVerdict>): RawQueryVerdict[] {
  return ids.map((id) => raw.get(id) ?? { ...MISSING, queryId: id });
}

function rawScopeState(scopeVerdicts: readonly RawQueryVerdict[]): ScopeState {
  if (scopeVerdicts.length === 0) {
    return { semanticState: 'not_evidenced', expressionMode: 'none', source: 'none' };
  }
  const preserved = scopeVerdicts.find((v) => v.semanticState === 'preserved');
  if (preserved !== undefined) {
    const anyExplicit = scopeVerdicts.some(
      (v) => v.semanticState === 'preserved' && v.expressionMode === 'explicit',
    );
    return { semanticState: 'preserved', expressionMode: anyExplicit ? 'explicit' : 'implicit', source: 'scope_query' };
  }
  if (scopeVerdicts.some((v) => v.semanticState === 'contradicted')) {
    return { semanticState: 'contradicted', expressionMode: 'none', source: 'scope_query' };
  }
  return { semanticState: 'not_evidenced', expressionMode: 'none', source: 'scope_query' };
}

/**
 * 규칙 1·2: 하위 의미 증거로 상위 scope를 정규화한다.
 *   규칙 1  하위 relation/argument 중 하나라도 preserved → scope preserved+implicit로 승격
 *           (scope가 이미 preserved+explicit이면 유지)
 *   규칙 2  하위 relation/argument 중 하나라도 contradicted → scope preserved+implicit로 승격
 *           + region contradiction=true (모순을 scope 미포착으로 처리하지 않는다)
 */
export function normalizeQueryStates(
  raw: ReadonlyMap<string, RawQueryVerdict>,
  policy: readonly RegionPolicy[],
): NormalizedRegion[] {
  return policy.map((region) => {
    const scopeVerdicts = verdictsFor(region.scopeQueries, raw);
    const relations = verdictsFor(region.relationQueries, raw);
    const args = verdictsFor(region.argumentQueries, raw);

    const rawScope = rawScopeState(scopeVerdicts);
    const sub = [...relations, ...args];
    const anySubPreserved = sub.some((v) => v.semanticState === 'preserved');
    const anySubContradicted = sub.some((v) => v.semanticState === 'contradicted');
    const scopeContradicted = scopeVerdicts.some((v) => v.semanticState === 'contradicted');
    const contradiction = anySubContradicted || scopeContradicted;

    let scope = rawScope;
    const alreadyExplicit = rawScope.semanticState === 'preserved' && rawScope.expressionMode === 'explicit';
    if (!alreadyExplicit) {
      if (anySubContradicted) {
        scope = { semanticState: 'preserved', expressionMode: 'implicit', source: 'promoted_contradiction' };
      } else if (anySubPreserved) {
        const source: ScopeSource = relations.some((v) => v.semanticState === 'preserved')
          ? 'promoted_relation'
          : 'promoted_argument';
        scope = { semanticState: 'preserved', expressionMode: 'implicit', source };
      }
    }
    const scopePromoted = scope.source !== rawScope.source;

    const regionSemanticVerdict = deriveSemanticVerdict(region, raw, scope, contradiction);
    const argumentCoverage = deriveArgumentCoverage(region, raw);
    const expressionProfile = deriveExpressionProfile(region, raw);

    return {
      id: region.id,
      label: region.label,
      scope,
      rawScope,
      scopePromoted,
      relations,
      arguments: args,
      contradiction,
      regionSemanticVerdict,
      argumentCoverage,
      expressionProfile,
    };
  });
}

function isPreserved(id: string, raw: ReadonlyMap<string, RawQueryVerdict>): boolean {
  return raw.get(id)?.semanticState === 'preserved';
}

/**
 * 보존됐고, 그 증거가 **관계 증거**인가. 원칙 B의 판정 단위다.
 *
 * `evidenceRole`이 없는 판정은 관계 증거로 본다 — 이 축 도입 전의 데이터·테스트가 그대로
 * 동작해야 하므로, 채워졌을 때만 게이트가 좁아진다(단조 축소).
 */
function isRelationEvidence(id: string, raw: ReadonlyMap<string, RawQueryVerdict>): boolean {
  const v = raw.get(id);
  if (v?.semanticState !== 'preserved') return false;
  return v.evidenceRole === undefined || v.evidenceRole === 'relation';
}

/**
 * 규칙 3~6의 의미 축. 표현·논항과 분리된 의미 보존 수준만 판정한다.
 *   모순     하위/scope에 contradicted → contradicted
 *   핵심 관계 모두 preserved            → relation_preserved
 *   핵심 관계 일부 preserved            → partial_relation_preservation (단, 아래 원칙 B)
 *   scope만 preserved                  → topic_only
 *   어디에도 증거 없음                  → region_not_evidenced
 *
 * **원칙 A — 두 축의 독립성.** regionSemanticVerdict는 "핵심 관계를 얼마나 보존했는가",
 * argumentCoverage는 "관계에 참여하는 대상·논항을 얼마나 정확히 지목했는가"를 나타낸다.
 * 논항을 전부 맞혔다고 관계를 이해한 것은 아니므로 `topic_only + argumentCoverage=full`이
 * 정상적으로 가능해야 한다.
 *
 * **원칙 B — 관계 증거가 없으면 부분관계로 승격하지 않는다.** 영역에 관계 층위 핵심 질의가
 * 하나 이상 있는데 그중 보존된 것이 0개라면, 논항 층위 핵심 질의가 모두 보존됐더라도
 * 상한은 topic_only다. 대상 이름을 빠짐없이 지목한 것은 argumentCoverage가 담당한다.
 *
 * 이 가드는 실측(2026-07-29 N2 실험)에서 나왔다: 생성기가 명칭 확인 질의
 * ("첫 번째 공간은 무엇인가?")를 criticalForRelation으로 지정하자, 대상 이름만 나열한
 * 응답이 핵심 질의 2개를 충족해 partial_relation_preservation으로 올라갔다.
 *
 * 관계 층위 핵심 질의가 **애초에 없는** 영역(논항 핵심만으로 관계를 정의한 영역)에는
 * 가드가 적용되지 않는다 — 그런 영역에서는 논항 보존이 유일한 관계 증거이기 때문이다.
 */
function deriveSemanticVerdict(
  region: RegionPolicy,
  raw: ReadonlyMap<string, RawQueryVerdict>,
  scope: ScopeState,
  contradiction: boolean,
): RegionSemanticVerdict {
  if (contradiction) return 'contradicted';
  const critical = region.criticalForRelation;
  const preservedCount = critical.filter((id) => isPreserved(id, raw)).length;

  // 원칙 B — 관계 층위 핵심 질의가 있는데 **진짜 관계 증거**가 하나도 없으면 승격하지 않는다.
  // 층위(relationQueries)와 증거 종류(evidenceRole)를 **둘 다** 요구하는 연언이다.
  const criticalRelation = critical.filter((id) => region.relationQueries.includes(id));
  const relationEvidenceMissing =
    criticalRelation.length > 0 && !criticalRelation.some((id) => isRelationEvidence(id, raw));

  // relation_preserved도 같은 가드를 받는다. 이 분기를 열어두면 관계 층위 critical 질의가
  // 명칭 질의 하나뿐인 영역에서 이름만 나열한 응답이 preservedCount === critical.length를
  // 만족해 곧장 관계보존으로 올라간다 (N2-e 최악형).
  if (critical.length > 0 && preservedCount === critical.length && !relationEvidenceMissing) {
    return 'relation_preserved';
  }

  if (preservedCount >= 1 && !relationEvidenceMissing) return 'partial_relation_preservation';
  if (scope.semanticState === 'preserved') return 'topic_only';
  return 'region_not_evidenced';
}

/** 필수 논항 커버리지 축. 의미 판정과 독립. */
function deriveArgumentCoverage(region: RegionPolicy, raw: ReadonlyMap<string, RawQueryVerdict>): ArgumentCoverage {
  const req = region.requiredForFullArgument;
  if (req.length === 0) return 'none';
  const preserved = req.filter((id) => isPreserved(id, raw)).length;
  if (preserved === 0) return 'none';
  if (preserved === req.length) return 'full';
  return 'partial';
}

/**
 * 표현 프로필 축. **관계가 어떻게 표현됐는가**를 집계한다 — 보존된 관계 구조 질의
 * (relationQueries)의 expressionMode 기준. 논항을 얼마나 명시했는지는 argumentCoverage가
 * 담당하므로 여기 섞지 않는다: 병치로 관계를 나타낸 압축 추상(E2)은 논항을 정확히 짚어도
 * 표현은 implicit이어야 한다. 의미 판정을 바꾸지 않는다.
 */
function deriveExpressionProfile(region: RegionPolicy, raw: ReadonlyMap<string, RawQueryVerdict>): ExpressionProfile {
  const modes = region.relationQueries
    .map((id) => raw.get(id))
    .filter((v): v is RawQueryVerdict => v !== undefined && v.semanticState === 'preserved')
    .map((v) => v.expressionMode);
  if (modes.length === 0) return 'none';
  const anyExplicit = modes.includes('explicit');
  const anyImplicit = modes.includes('implicit');
  if (anyExplicit && anyImplicit) return 'mixed';
  if (anyExplicit) return 'explicit';
  return 'implicit';
}

/**
 * 세 축에서 파생하는 편의 표시 라벨. 기본 데이터가 아니라 UI/리포트용이다.
 * explicit_high_resolution은 relation_preserved + full + explicit일 때만 붙는다 —
 * 암묵 병치(E2)는 관계를 보존해도 고해상도 명시 응답으로 오분류되지 않는다.
 */
export function displayLabel(region: NormalizedRegion): string {
  const { regionSemanticVerdict: sem, argumentCoverage: cov, expressionProfile: expr } = region;
  if (sem === 'contradicted') return 'region_contradicted';
  if (sem === 'relation_preserved') {
    if (cov === 'full' && expr === 'explicit') return 'explicit_high_resolution';
    return 'relation_preserving_abstraction';
  }
  if (sem === 'partial_relation_preservation') return 'partial_relation_preservation';
  if (sem === 'topic_only') return 'topic_only';
  return 'region_not_evidenced';
}
