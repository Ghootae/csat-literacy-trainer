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
}

function aggregatePropositionState(verdicts: readonly QueryVerdict[]): PropositionEvidenceState {
  if (verdicts.some((v) => v.semanticState === 'contradicted')) return 'contradicted';
  if (verdicts.some((v) => v.semanticState === 'preserved' && v.expressionMode === 'explicit')) return 'evidenced';
  if (verdicts.some((v) => v.semanticState === 'preserved')) return 'supported_by_abstraction';
  return 'not_evidenced';
}

/**
 * 정규화된 영역 + 질의 판정 → 학생 평가. 핵심 판정은 그대로 통과시키고, 명제 evidence와
 * 피드백을 파생한다. 결정적 — LLM 없음.
 */
export function assess(
  regions: readonly NormalizedRegion[],
  regionMeta: readonly AssessRegionMeta[],
  queries: readonly AssessQuery[],
  verdicts: ReadonlyMap<string, QueryVerdict>,
  propShortForm: ReadonlyMap<string, string> = new Map(),
): RegionAssessment[] {
  const regionById = new Map(regions.map((r) => [r.id, r]));
  return regionMeta.map((meta) => {
    const region = regionById.get(meta.id);
    const verdict: RegionSemanticVerdict = region?.regionSemanticVerdict ?? 'region_not_evidenced';
    const regionQueries = queries.filter((q) => q.regionId === meta.id);

    // 명제 evidence: 골드 명제에 앵커링 (생성기 논항 분해와 무관)
    const propositionEvidence: PropositionEvidence[] = meta.propositionIds.map((pid) => {
      const anchoring = regionQueries.filter((q) => q.propositionIds.includes(pid));
      const vs = anchoring.map((q) => verdicts.get(q.id)).filter((v): v is QueryVerdict => v !== undefined);
      const state = aggregatePropositionState(vs);
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
    const feedback = buildFeedback(verdict, meta, critical, propositionEvidence);

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

/** 설명형 피드백. 포착한 핵심 관계 + 추가로 참고할 세부(감점 아님)를 구체적으로 기술. */
function buildFeedback(
  verdict: RegionSemanticVerdict,
  meta: AssessRegionMeta,
  critical: AssessQuery | undefined,
  evidence: readonly PropositionEvidence[],
): string {
  const relText = critical?.expectedAnswer ?? meta.label;
  const criticalProps = new Set(critical?.propositionIds ?? []);

  switch (verdict) {
    case 'relation_preserved': {
      const extra = evidence
        .filter((e) => (e.state === 'not_evidenced' || e.state === 'supported_by_abstraction') && !criticalProps.has(e.propositionId))
        .map((e) => e.shortForm);
      const base = `핵심 관계 「${relText}」를 잘 포착했습니다.`;
      return extra.length > 0
        ? `${base} 원문에는 ${extra.join(', ')}도 제시됩니다 (참고 — 더 구체적으로 표현할 수 있으나 감점 요소는 아닙니다).`
        : base;
    }
    case 'topic_only':
      return `「${meta.label}」의 화제는 짚었지만, 핵심 관계 「${relText}」가 아직 드러나지 않았습니다. 요소들이 어떻게 연결되는지 관계로 표현해 보세요.`;
    case 'contradicted': {
      const contra = evidence.filter((e) => e.state === 'contradicted').map((e) => e.shortForm);
      const where = contra.length > 0 ? ` (${contra.join(', ')})` : '';
      return `「${meta.label}」에서 관계를 잘못 이해했습니다${where}. 원문의 「${relText}」와 어긋납니다.`;
    }
    default:
      return `「${meta.label}」 부분을 아직 짚지 못했습니다.`;
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
