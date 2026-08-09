/**
 * 학생 응답 평가 — 최소 확정 구조.
 *
 * 인간 이중 라벨링에서 regionSemanticVerdict는 일치도가 높고 argumentCoverage는 낮았다.
 * 따라서:
 *   - **핵심 채점축 = regionSemanticVerdict 하나** (미포착/주제만/관계보존/모순).
 *   - argumentCoverage·expressionProfile은 점수에서 빼고 실험/디버그 필드로만 유지(_debug).
 *   - 명제 단위 evidence는 **점수화하지 않고** 판정 근거·학생 피드백·디버깅에만 쓴다.
 *
 * 명제 evidence는 생성기의 논항 분해(불안정)가 아니라 **프리즈된 골드 명제**(안정)에 앵커링한다.
 * 생성기가 질의를 몇 개로 쪼개든, "학생 응답이 명제 p를 증거하는가"로 환원되어 안정적이다.
 */

import type {
  ArgumentCoverage,
  EvidenceRole,
  ExpressionMode,
  ExpressionProfile,
  NormalizedRegion,
  RegionSemanticVerdict,
  SemanticState,
} from './query-normalize.js';

/**
 * 명제 상태. "not_evidenced"는 "학생이 모른다"가 아니라 **이 짧은 답에서는 확인 불가**라는 뜻.
 * 좋은 추상은 세부를 버리므로, 이 구분이 정독 훈련에서 중요하다.
 */
export type PropositionEvidenceState =
  | 'evidenced' // 직접 진술로 확인됨
  | 'supported_by_abstraction' // 병치·함축으로 뒷받침됨
  | 'not_evidenced' // 이 답에서는 확인 불가 (결손 아님)
  | 'contradicted'; // 어긋나는 주장

export interface PropositionEvidence {
  readonly propositionId: string;
  readonly shortForm: string;
  readonly state: PropositionEvidenceState;
  readonly viaStudentItems: readonly string[];
}

export interface RegionAssessment {
  readonly regionId: string;
  readonly label: string;
  /** 유일 채점축. */
  readonly verdict: RegionSemanticVerdict;
  /** 점수 아님 — 근거·피드백·디버깅용. */
  readonly propositionEvidence: readonly PropositionEvidence[];
  /** 설명형 피드백. */
  readonly feedback: string;
  /** 강등 필드 — 실험 분석용, 채점에 쓰지 않음. */
  readonly _debug: { readonly argumentCoverage: ArgumentCoverage; readonly expressionProfile: ExpressionProfile };
}

// ── assess 입력 (오라클 영역 좌표계에서 구성) ──
export interface AssessQuery {
  readonly id: string;
  readonly regionId: string; // 오라클 영역으로 재버킷팅된 소속
  readonly level: 'scope' | 'relation' | 'argument';
  /**
   * 질의 문장. **미달 영역 힌트에서 쓸 수 있는 유일한 골드 필드다** — 질문 형태라 답을
   * 주지 않는다. `expectedAnswer`는 정답이므로 관계보존 영역에만 쓴다.
   */
  readonly question: string;
  readonly propositionIds: readonly string[];
  readonly expectedAnswer: string;
  readonly critical: boolean;
}
export interface AssessRegionMeta {
  readonly id: string;
  readonly label: string;
  readonly propositionIds: readonly string[];
}
export interface QueryVerdict {
  readonly semanticState: SemanticState;
  readonly expressionMode: ExpressionMode;
  readonly evidence: string;
  readonly viaItem: string;
  /**
   * 증거의 종류. 선택 필드 — **없으면 명제를 뒷받침하는 것으로 본다**(이 축 도입 전
   * 데이터·테스트와의 하위 호환). 채워졌을 때만 `scope` 증거가 걸러진다.
   */
  readonly evidenceRole?: EvidenceRole;
}

/**
 * 피드백에 나열하는 참고 세부의 상한 (N1).
 *
 * 상한이 없으면 명제가 많은 과정형 문단에서 우수 응답에 5~7개가 붙어 결손표처럼 읽힌다 —
 * 잘한 응답일수록 텍스트가 길어지는 역전이라 시각적 보상(수형도 오버레이)과 충돌한다.
 * 잘린 나머지는 사라지지 않고 오버레이의 ○(참고·미확인)로만 표시된다.
 */
const REFERENCE_DETAIL_CAP = 3;

/**
 * 명제 하나의 증거 상태.
 *
 * **`scope` 역할 증거는 명제를 뒷받침하지 않는다.** `scope`의 정의가 "화제만 지목"이므로
 * 정의상 어떤 명제의 *내용*도 뒷받침할 수 없다. 이 가드가 없으면 화제 이름표만 쓴 응답이
 * scope 질의를 통과시켜 그 질의에 앵커된 명제들이 ◐로 칠해진다 — 영역 판정은 `주제만`인데
 * 오버레이는 부분 포착처럼 보이는 어긋남이 생긴다(실측: 2026-08-05 니체 문단).
 * 판별은 질의의 **층위 라벨이 아니라 `evidenceRole`**로 한다(N2-e).
 *
 * 모순은 역할과 무관하게 그대로 전파한다 — 잘못된 이해를 가리면 안 된다.
 *
 * **판정의 해상도는 질의지 명제가 아니다.** 질의 하나가 명제 여러 개를 앵커링하므로
 * (실측: 67%가 2개 이상), 그 질의가 `explicit`이라 해도 앵커링된 명제를 **각각** 직접
 * 표현했다는 뜻은 아니다. 그래서 앵커 개수로 증거의 구체성을 나눈다:
 *
 *   전용 질의(이 명제 하나만 앵커링)  이 명제에 대한 직접 증거 → 그대로 따른다
 *   광역 질의(여러 명제를 함께 앵커링)  상위 관계만 확인 → **최대 `supported_by_abstraction`**
 *
 * 이게 없으면 학생이 쓰지도 않은 것을 썼다고 표시한다. 실제 사례(2026-08-09 코덱스 테스트):
 * 학생이 "CO2가 RuBP와 결합해 포도당을 만들고"라고만 썼는데 `결합→3탄당 형성`이 `evidenced`로
 * 나왔다. 정작 그 명제 하나만 묻는 전용 질의(`결합으로 처음 생기는 화합물은?`)는
 * `not_evidenced`였는데, 3개를 묶어 묻는 광역 질의의 `explicit`이 그것을 덮었다.
 *
 * `scope` 증거는 화제만 지목한 것이므로 어느 쪽에서도 세지 않는다(원칙 A).
 */
function aggregatePropositionState(
  anchoring: readonly { readonly verdict: QueryVerdict; readonly anchorCount: number }[],
): PropositionEvidenceState {
  if (anchoring.some((a) => a.verdict.semanticState === 'contradicted')) return 'contradicted';

  const supporting = anchoring.filter((a) => a.verdict.evidenceRole !== 'scope');
  const dedicated = supporting.filter((a) => a.anchorCount === 1);

  // 전용 질의가 있으면 그것이 이 명제에 대한 유일한 직접 증거다. 광역 질의가 뒤집지 못한다.
  if (dedicated.length > 0) {
    if (dedicated.some((a) => a.verdict.semanticState === 'preserved' && a.verdict.expressionMode === 'explicit')) {
      return 'evidenced';
    }
    if (dedicated.some((a) => a.verdict.semanticState === 'preserved')) return 'supported_by_abstraction';
    return 'not_evidenced';
  }

  // 광역 질의만 있다 — 상위 관계가 보존됐다는 것까지만 말할 수 있다.
  if (supporting.some((a) => a.verdict.semanticState === 'preserved')) return 'supported_by_abstraction';
  return 'not_evidenced';
}

/**
 * 정규화된 영역 + 질의 판정 → 학생 평가. 핵심 판정은 그대로 통과시키고, 명제 evidence와
 * 피드백을 파생한다. 결정적 — LLM 없음.
 *
 * @param propWeight 명제 id → 전역 가중치 W. 피드백에 어떤 참고 세부를 남길지 고르는 데만
 *   쓴다(채점 아님). 비어 있으면 골드 순서로 자른다 — 질의 보존 파이프라인의 `Gold`에는
 *   아직 가중치가 없어서 기본값이 그 경로다. `weights.ts`의 W를 넘기면 상위부터 남는다.
 */
export function assess(
  regions: readonly NormalizedRegion[],
  regionMeta: readonly AssessRegionMeta[],
  queries: readonly AssessQuery[],
  verdicts: ReadonlyMap<string, QueryVerdict>,
  propShortForm: ReadonlyMap<string, string> = new Map(),
  propWeight: ReadonlyMap<string, number> = new Map(),
): RegionAssessment[] {
  const regionById = new Map(regions.map((r) => [r.id, r]));
  return regionMeta.map((meta) => {
    const region = regionById.get(meta.id);
    const verdict: RegionSemanticVerdict = region?.regionSemanticVerdict ?? 'region_not_evidenced';
    const regionQueries = queries.filter((q) => q.regionId === meta.id);

    // 명제 evidence: 골드 명제에 앵커링 (생성기 논항 분해와 무관)
    const propositionEvidence: PropositionEvidence[] = meta.propositionIds.map((pid) => {
      const anchoring = regionQueries.filter((q) => q.propositionIds.includes(pid));
      // 앵커 개수를 함께 넘긴다 — 증거의 구체성이 여기서 정해진다(위 주석 참조).
      const withCount = anchoring.flatMap((q) => {
        const verdict = verdicts.get(q.id);
        return verdict === undefined ? [] : [{ verdict, anchorCount: q.propositionIds.length }];
      });
      const vs = withCount.map((a) => a.verdict);
      const state = aggregatePropositionState(withCount);
      const via = [
        ...new Set(
          vs
            .filter((v) => v.semanticState !== 'not_evidenced' && v.viaItem !== '')
            .map((v) => v.viaItem),
        ),
      ];
      return { propositionId: pid, shortForm: propShortForm.get(pid) ?? pid, state, viaStudentItems: via };
    });

    const critical = regionQueries.find((q) => q.critical && q.level === 'relation') ?? regionQueries.find((q) => q.critical);

    // 힌트로 되물을 질의. 모순이면 어긋난 질의를, 그 외에는 아직 보존되지 않은 핵심 관계
    // 질의를 고른다. 이미 보존된 질의를 되물으면 학생이 무엇을 더 해야 할지 알 수 없다.
    const state = (q: AssessQuery) => verdicts.get(q.id)?.semanticState;
    const hint =
      verdict === 'contradicted'
        ? (regionQueries.find((q) => state(q) === 'contradicted') ?? critical)
        : (regionQueries.find((q) => q.critical && q.level === 'relation' && state(q) !== 'preserved') ?? critical);

    const feedback = buildFeedback(verdict, meta, critical, propositionEvidence, propWeight, hint?.question ?? '');

    return {
      regionId: meta.id,
      label: meta.label,
      verdict,
      propositionEvidence,
      feedback,
      _debug: {
        argumentCoverage: region?.argumentCoverage ?? 'none',
        expressionProfile: region?.expressionProfile ?? 'none',
      },
    };
  });
}

/**
 * 피드백에 남길 참고 세부를 고른다 — 가중치 상위 {@link REFERENCE_DETAIL_CAP}개까지.
 *
 * 가중치가 없거나 동률이면 골드 순서로 자른다. 정렬은 전부 결정적이어야 한다: 같은 입력에
 * 같은 피드백 문장이 나와야 회귀 로그를 비교할 수 있다.
 */
function topReferenceDetails(
  evidence: readonly PropositionEvidence[],
  criticalProps: ReadonlySet<string>,
  propWeight: ReadonlyMap<string, number>,
): string[] {
  return evidence
    .map((e, goldOrder) => ({ e, goldOrder }))
    .filter(
      // **`not_evidenced`만.** `supported_by_abstraction`은 "직접 썼는지 알 수 없다"이지
      // "없다"가 아니다 — 넣으면 학생이 실제로 쓴 것을 "원문에는 …도 제시됩니다"라고
      // 다시 권하게 된다(2026-08-09 관측).
      ({ e }) => e.state === 'not_evidenced' && !criticalProps.has(e.propositionId),
    )
    .sort((a, b) => {
      const wa = propWeight.get(a.e.propositionId) ?? 0;
      const wb = propWeight.get(b.e.propositionId) ?? 0;
      return wa === wb ? a.goldOrder - b.goldOrder : wb - wa;
    })
    .slice(0, REFERENCE_DETAIL_CAP)
    .map(({ e }) => e.shortForm);
}

/**
 * 받침 유무로 조사를 고른다. `은(는)` 같은 표기는 학생용 문구에 쓰지 않는다.
 * 한글 음절은 0xAC00부터 28개 종성 주기로 배열되므로 나머지가 0이면 받침이 없다.
 */
function particle(word: string, withFinal: string, without: string): string {
  const last = word.at(-1);
  const code = last === undefined ? -1 : last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return withFinal; // 한글이 아니면 보수적으로
  return (code - 0xac00) % 28 === 0 ? without : withFinal;
}

/** 설명형 피드백. 포착한 핵심 관계 + 추가로 참고할 세부(감점 아님)를 구체적으로 기술. */
function buildFeedback(
  verdict: RegionSemanticVerdict,
  meta: AssessRegionMeta,
  critical: AssessQuery | undefined,
  evidence: readonly PropositionEvidence[],
  propWeight: ReadonlyMap<string, number>,
  hintQuestion: string,
): string {
  // 기대 답은 대개 마침표로 끝나는데 「」로 감싸 이어붙이면 "…비롯된다.」를 잘 포착했습니다."가
  // 되어 문장 부호가 겹쳐 읽힌다. 인용 안에서는 끝 마침표를 뗀다.
  const relText = (critical?.expectedAnswer ?? meta.label).replace(/[.。]\s*$/, '');
  const criticalProps = new Set(critical?.propositionIds ?? []);

  // 미달 영역에서 되물을 질문. 없으면 그 절을 통째로 생략한다.
  const ask = hintQuestion === '' ? '' : ` "${hintQuestion}"`;

  switch (verdict) {
    // 성공 영역만 정답을 공개한다 (§4.1.3).
    case 'relation_preserved': {
      const extra = topReferenceDetails(evidence, criticalProps, propWeight);

      // 핵심 관계에 속하면서 **나타나지 않은** 중간 단계. 기대 답을 그대로 인용하고
      // "잘 포착했습니다"라고만 하면, 학생이 쓰지 않은 중간 산물까지 표현한 것처럼 읽힌다
      // (2026-08-09 코덱스 테스트: 3탄당을 안 썼는데 3탄당이 든 문장을 포착했다고 했다).
      // 압축은 허용되지만(원칙 F) 압축했다는 사실은 숨기지 않는다.
      //
      // **`not_evidenced`만 넣는다.** `supported_by_abstraction`은 "직접 썼는지 알 수 없다"이지
      // "안 썼다"가 아니다 — 그것까지 "직접 쓰지 않았다"고 하면 반대 방향으로 과장하게 된다.
      const compressed = evidence
        .filter(
          (e) =>
            criticalProps.has(e.propositionId) &&
            e.state === 'not_evidenced' &&
            // shortForm이 없으면 `propositionId`로 대체돼 있다. "p7은(는) 직접 쓰지 않았지만"은
            // 학생에게 아무 뜻이 없으므로 문구에서 뺀다.
            e.shortForm !== e.propositionId,
        )
        .slice(0, REFERENCE_DETAIL_CAP)
        .map((e) => e.shortForm);

      const base =
        compressed.length > 0
          ? `핵심 관계 「${relText}」의 구조를 보존했습니다. ${compressed.join(', ')}${particle(compressed[compressed.length - 1] ?? '', '은', '는')} 직접 쓰지 않았지만, 관계가 이어지는 방향은 살아 있습니다.`
          : `핵심 관계 「${relText}」를 잘 포착했습니다.`;

      return extra.length > 0
        ? `${base} 원문에는 ${extra.join(', ')}도 제시됩니다 (참고 — 더 구체적으로 표현할 수 있으나 감점 요소는 아닙니다).`
        : base;
    }

    // ── 아래는 전부 미달 영역: 정답·영역 label·명제 shortForm을 노출하지 않는다 ──

    case 'partial_relation_preservation':
      return ask === ''
        ? '관계의 한 축은 잡았어요. 나머지 축도 함께 드러나도록 다듬어 보세요.'
        : `관계의 한 축은 잡았어요.${ask}도 함께 드러나도록 다듬어 보세요.`;

    case 'topic_only':
      return ask === ''
        ? '화제는 짚었어요. 요소들이 어떻게 연결되는지 관계로 표현해 보세요.'
        : `화제는 짚었어요.${ask}에 답해 보세요.`;

    case 'contradicted':
      return ask === ''
        ? '관계 방향이 원문과 어긋납니다. 하이라이트된 문장에서 무엇이 무엇의 목적이고 수단인지 다시 확인해 보세요.'
        : `관계 방향이 원문과 어긋납니다. 하이라이트된 문장에서${ask}를 다시 확인해 보세요.`;

    default:
      // region_not_evidenced — 요약에 나타나지 않았으므로 인정할 것이 없다. 위치만 가리킨다.
      return '이 부분은 요약에 나타나지 않았어요. 하이라이트된 문장을 다시 읽어 보세요.';
  }
}

/** 응답 전체의 교육 범주 (핵심축 파생). focal 영역 기준 + 전역 규칙. */
export function overallCategory(regions: readonly NormalizedRegion[], focalId: string): string {
  if (regions.some((r) => r.regionSemanticVerdict === 'contradicted')) return '관계오류';
  if (regions.every((r) => r.regionSemanticVerdict === 'region_not_evidenced')) return '공허';
  const s = regions.find((r) => r.id === focalId)?.regionSemanticVerdict;
  if (s === 'relation_preserved') return '관계보존';
  if (s === 'topic_only') return '주제만';
  if (s === 'partial_relation_preservation') return '부분';
  return '기타';
}
