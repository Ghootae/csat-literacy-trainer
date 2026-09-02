# 4방향 판정기 정답 근거 5문항 검증 보고서

실행일: 2026-09-02

## 목적

골드를 변경하지 않고 같은 5문항의 기존 `accurate` 정답 선택·근거를 각각 3회 반복해, 실제 발문에 따라 코드 라우팅된 `CORRECT_ACCEPTED`와 `CORRECT_REJECTED`의 판정 성능을 검증한다. 이전에 1/3만 인정된 보증 계약 부정 발문의 정확 근거를 반드시 포함한다.

## 수행 작업

- 기존 5문항의 `student-response-cases.json`에 보존된 `accurate` 선택과 근거를 그대로 사용했다.
- 정발문 3문항은 `CORRECT_ACCEPTED` 9회, 부정발문 2문항은 `CORRECT_REJECTED` 6회로 코드 라우팅했다.
- `gpt-5.6-terra / medium`, 호출 한도 120초로 총 15회를 실행했다.
- 합격 기준은 `stanceConsistency: CONSISTENT`, `groundingAssessment: SUPPORTED`, `assessment: SUPPORTED`를 모두 만족하는 경우로 고정했다.
- 골드는 읽기 전용으로 사용하고, 다섯 `c-gold.json`의 해시를 `SUMMARY.json`에 기록했다.
- 최종 런타임 결과와 모델의 마지막 원출력을 별도로 재채점해 후처리 영향을 분리했다.

## 결과

| 문항 | 프로필 | 이전 런타임 | 현재 런타임 | 현재 모델 원출력 |
|---|---|---:|---:|---:|
| 수소 생산 | `CORRECT_ACCEPTED` | 1/3 | 3/3 | 3/3 |
| 보증 계약 | `CORRECT_REJECTED` | 1/3 | 1/3 | 3/3 |
| FTA 원산지 | `CORRECT_ACCEPTED` | 3/3 | 3/3 | 3/3 |
| 확산 모델 | `CORRECT_REJECTED` | 2/3 | 0/3 | 3/3 |
| 열팽창 구동기 | `CORRECT_ACCEPTED` | 3/3 | 3/3 | 3/3 |
| 합계 |  | **10/15** | **10/15** | **15/15** |

프로필별로 보면 `CORRECT_ACCEPTED`는 런타임과 원출력이 모두 9/9였다. `CORRECT_REJECTED`는 모델 원출력은 6/6이었지만 런타임 최종 결과는 1/6이었다.

실패로 기록된 보증 계약 2회와 확산 모델 3회에서 모델의 마지막 원출력은 모두 다음 구조를 정확히 반환했다.

```text
optionStance: REJECTS_OPTION
requiredStanceForSelection: REJECTS_OPTION
stanceConsistency: CONSISTENT
groundingAssessment: SUPPORTED
assessment: SUPPORTED
```

그러나 의미 모순 방어기의 긍정 정규식이 `적절하`를 제한 없이 찾으면서 `부적절하다` 내부의 `적절하`까지 긍정 태도로 중복 인식했다. 같은 문장의 `부적절`은 거부 태도로도 인식되어 결과가 `CONTRADICTORY`가 됐다. 재시도 뒤의 올바른 마지막 원출력까지 의미 모순으로 거부한 뒤 런타임이 안전 폴백인 `UNCERTAIN`으로 덮었다. 첫 번째 원출력 전문은 현재 호출 감사에 보존되지 않아 그 내용의 정확성까지는 확정할 수 없다.

따라서 이번 결과는 다음처럼 해석해야 한다.

- 4방향 프롬프트와 모델의 정답 근거 이해: 15/15
- 현재 전체 런타임 계약의 사용자 반환 결과: 10/15
- 남은 실패 원인: 골드 또는 모델의 근거 이해가 아니라 의미 모순 후처리 정규식의 위양성

타입 검사와 evaluator 집중 회귀 47/47은 통과했다. 현재 회귀에는 `대상 선지 + 부적절하다`를 올바른 `REJECTS_OPTION` 출력으로 판정한 뒤 의미 모순 방어기까지 통과시키는 결합 사례가 빠져 있다.

기계 집계는 [SUMMARY.json](./SUMMARY.json), 15회 최종 결과·원출력·재시도 메타데이터는 [results.json](./artifacts/results.json)에 보존했다.

## 다음 작업 추천

후속 작업에서 자연어 패턴을 보정하는 대신 태도 정규화기와 의미 모순 재판정기를 최종 판정 경로에서 제거했다. 공급자는 근거 판정과 finding만 반환하고 선택 의미와 최종 라벨은 코드가 파생한다.

보증 계약과 확산 모델의 동일 근거, `부적절하다`, `적절하지 않다`, 사실 명제 내부의 `거절할 수 없다`를 회귀로 고정했다. 동일 15회 재실행에서 런타임 15/15를 확인했다. 상세 결과는 `docs/experiments/problem-evaluator-four-route-correct-probes-postprocessor-fix-2026-09-02/REPORT.md`에 기록했다.
