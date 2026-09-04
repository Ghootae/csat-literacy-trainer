# 볼록렌즈 Source Bundle v2 오프라인 개편

## 목적과 실행 범위

이 디렉터리는 중단된 v1 유료 실험의 원시 응답 3개를 변경하지 않고 다시 분석한 결과다. 원문 위치와 문장 경계를 코드가 고정하고, 모델의 서로 다른 claim 분할을 문장별 의미 서명으로 비교하는 v2 계약을 검증한다.

- 이번 단계의 API 호출: **0회**
- 기존 지문·문제 골드 변경: **0건**
- 공식 정답·공식 해설·기존 골드의 Source 분석 사용: **없음**
- v1의 남은 API 계획: **중단 및 v2로 대체**

## 고정 Source Unit

코드가 원자료에서 다음 unit을 생성하고, offset slice·hash·비공백 coverage를 원문과 다시 대조한다.

| 범위 | 고정 unit |
|---|---:|
| 지문 | `PROSE_SENTENCE` 28개 |
| 문항 | `SCENARIO_SENTENCE` 9개 |
| 문항 그림 | `FIGURE` 1개 |

`FIGURE`는 이미지 전체만 고정한다. 그림 안 객체·라벨·영역·관계는 아직 검증되지 않은 후보이며 SourceAudit을 통과하기 전에는 Source Claim으로 승격하지 않는다.

## v1 원시 응답 재매핑

정규화된 중간 JSON이 아니라 각 실행의 `raw-output.txt`를 사용했다. 모델이 쓴 인용문이 원문에 유일하게 정확히 일치할 때만 Source Unit에 자동 연결했다.

| 실행 | claim 수 | exact | non-exact |
|---|---:|---:|---:|
| run 1 | 34 | 34 | 0 |
| run 2 | 39 | 38 | 1 |
| run 3 | 39 | 39 | 0 |
| 합계 | 112 | 111 | 1 |

유일한 non-exact 인용은 임의로 유사 매핑하지 않고 `UNRESOLVED`로 유지했다.

## 문장별 예비 비교 결과

| 분류 | unit 수 | 의미 |
|---|---:|---|
| `SEMANTIC_AGREEMENT` | 13 | 세 실행의 의미 서명 집합이 일치 |
| `STRUCTURAL_VARIANT` | 1 | claim 분할은 다르지만 현재 핵심 의미는 호환 |
| `MEANING_CONFLICT` | 13 | 서명이 달라 독립 재감사가 필요한 후보 |
| `UNRESOLVED` | 1 | exact evidence 연결이 성립하지 않음 |

이 분류는 **확정 오류 판정이 아니다**. 특히 `MEANING_CONFLICT`에는 v1의 relation 표현 방식과 claim 세분화 차이가 포함될 수 있다. v2 medium/high 독립 감사의 검토 대상을 좁히기 위한 예비 분류다.

핵심 문장 `P4-S2`는 세 실행 모두 다음 의미 서명으로 일치했고 코드의 사람 기준 핵심 검사도 통과했다.

```text
E_OFF_AXIS_DISTANCE → E_ASTIGMATIC_GAP
relationFamily = PROPORTIONALITY
exponent = 2
polarity = POSITIVE
```

## 감사와 생산 자격 계약

감사 coverage는 모델이 만든 claim 개수가 아니라 고정 Source Unit을 기준으로 한다.

- 모든 expected Source Unit을 코드 순서대로 정확히 한 번 감사
- 각 unit의 모든 후보 claim을 정확히 한 번 검토
- 범위형 ID 금지
- 누락 의미와 원문에 없는 추가 의미를 별도 표시
- `REPAIR_REQUIRED`와 `BLOCKING`은 수리·재감사 전 생산 입력 금지
- `WARNING`은 비의미적 issue이고 downstream impact가 `NONE`일 때만 조건부 허용
- 방향·계수·지수·부정·양상·필수 조건·인과·정의·entity 동일성·출처 계보 문제는 `WARNING`으로 낮출 수 없음
- `UNRESOLVED`는 다섯 제외 조건과 인간 승인을 모두 충족해야만 예외 검토
- 고위험 unit의 medium/high 감사 결과는 서로 공개하지 않고 별도 조정

`artifactFrozen`은 산출물을 불변 보존했다는 뜻이고, `productionEligible`은 골드 생성 입력으로 사용해도 된다는 뜻이다. 두 상태는 독립적이다.

## 다음 유료 ITEM 탐색

실행 명세만 작성했으며 호출하지 않았다. 계획은 Terra medium/high를 독립 비교하는 총 7회 호출이다.

- 예상 비용: **$0.50~$1.50**
- 승인 예산 상한: **$2.00**
- 정답 키·공식 해설·기존 골드: 사용 안 함
- 정상 비율 두 개의 추출과 역관계 변이 거부를 함께 검사
- 결과는 탐색 산출물이며 자동 생산 승격 금지

유료 실행은 별도의 계획 확인과 승인을 받은 뒤 진행한다.

## 주요 파일

- `source-unit-registry-passage.json`: 지문 고정 unit과 코드 offset
- `source-unit-registry-item.json`: 문항·그림 고정 unit
- `legacy-raw-remap.json` / `.tsv`: v1 원시 claim의 exact-only 재매핑
- `entity-registry.json`: 명시 근거가 있는 지문 내부 entity 후보
- `unit-semantic-comparison.json` / `.tsv`: unit별 세 실행 비교
- `source-audit-v2-contract.json`: 감사 coverage와 독립성 계약
- `production-eligibility-policy.json`: 동결과 생산 자격 정책
- `item-exploration-plan.json`: 7회 유료 탐색 실행 명세
- `v1-termination.json`: v1 중단·대체 기록
- `offline-summary.json`: 이번 오프라인 실행의 핵심 수치와 다음 단계 상태
