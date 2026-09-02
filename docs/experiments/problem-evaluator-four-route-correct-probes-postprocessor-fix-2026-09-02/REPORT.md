# 선택 근거 후처리 제거 및 정답 근거 15회 재검증 보고서

실행일: 2026-09-02

## 목적

정확한 모델 판정을 자연어 정규식이 다시 해석해 `UNCERTAIN`으로 덮던 후처리 위양성을 제거한다. 골드와 입력량은 유지한 채, 같은 5문항의 동일 `accurate` 정답 근거를 문항별 3회 재실행해 모델 원출력뿐 아니라 런타임 반환까지 15/15인지 검증한다.

## 수행 작업

- 선택 근거 공급자 출력에서 `optionStance`, `requiredStanceForSelection`, `stanceConsistency`, `groundingAssessment`, 최종 `assessment` 생성을 제거했다.
- 공급자는 `rationaleAssessment: SUPPORTED | CONTRADICTED | INSUFFICIENT`와 `evidenceFindings`만 반환한다.
- 각 finding은 정확한 학생 원문 인용, `MATCHES | CONFLICTS | NOT_ESTABLISHED`, 사용한 승인 골드 참조를 구조화한다.
- 발문 극성과 정답 키로 선택 정오, 선택 의도, 선택 선지의 `ACCEPTED/REJECTED` 및 4방향 프로필을 코드가 파생한다.
- 런타임은 공급자의 `rationaleAssessment`에서 공개 호환 라벨을 코드로 파생한다. 자연어 태도 정규화, 자연어 의미 모순 검사, 의미 모순 재시도와 `UNCERTAIN` 폴백을 최종 판정 경로에서 제거했다.
- 결정적 계약 검증은 실제 학생 원문 인용, 허용된 source ref, finding과 근거 판정의 구조 일치, 코드 소유 태도·최종 라벨 조합만 검사한다.
- `부적절하다`, `적절하지 않다`, 사실 명제 내부의 `거절할 수 없다`가 태도로 재판정되지 않는 회귀를 추가했다.
- 이전 10/15 산출물은 보존하고 새 디렉터리에 동일 정답 근거 15회 결과를 기록했다.

## 결과

| 문항 | 프로필 | 수정 전 런타임 | 수정 후 런타임 |
|---|---|---:|---:|
| 수소 생산 | `CORRECT_ACCEPTED` | 3/3 | 3/3 |
| 보증 계약 | `CORRECT_REJECTED` | 1/3 | 3/3 |
| FTA 원산지 | `CORRECT_ACCEPTED` | 3/3 | 3/3 |
| 확산 모델 | `CORRECT_REJECTED` | 0/3 | 3/3 |
| 열팽창 구동기 | `CORRECT_ACCEPTED` | 3/3 | 3/3 |
| 합계 |  | **10/15** | **15/15** |

프로필별 결과는 `CORRECT_ACCEPTED` 9/9, `CORRECT_REJECTED` 6/6이다. 보증 계약과 확산 모델의 기존 위양성이 모두 사라졌다.

15회 모두 새 공급자 형식인 `rationaleAssessment + evidenceFindings`를 반환했고, 공개 런타임 결과는 `CONSISTENT + SUPPORTED + SUPPORTED`로 파생됐다. 오류, 시간 초과, 다중 호출, 의미 모순 재시도와 폴백은 모두 0건이었다. 각 사례는 한 번의 모델 호출만 사용했다.

검증 결과:

- 타입 검사 통과
- evaluator 집중 회귀 48/48 통과
- `git diff --check` 통과
- 전체 회귀 635/636 통과
- 유일한 전체 회귀 실패는 기존부터 누락된 Hegel `.omc` 실험 산출물 의존 테스트

기계 집계는 [SUMMARY.json](./SUMMARY.json), 15회 공개 결과·새 공급자 원출력·호출 메타데이터는 [results.json](./artifacts/results.json)에 보존했다.

## 다음 작업 추천

후처리 버그가 제거되어 4방향 판정기의 운영 기준선을 정답 근거 15/15와 대표 오답 15/15로 고정할 수 있다. 다음은 이 기준선에서 전체 골드 입력과 프로필별 최소 골드 입력을 A/B 비교하는 실험이 적절하다.

입력 축소 실험 전에는 자동 파생 가능 문항을 명시하는 `itemDecisionMode` 계약을 먼저 정의해야 한다. 단일 정답이며 선지를 독립적으로 채택·기각할 수 있는 문항만 `BINARY_SINGLE_ANSWER`로 허용하고, 상대적 최선·복합·다중 정답 문항은 별도 계약으로 분리하는 것이 안전하다.
