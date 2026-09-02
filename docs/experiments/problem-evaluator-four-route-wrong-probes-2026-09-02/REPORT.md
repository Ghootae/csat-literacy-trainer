# 4방향 판정기 대표 오답 5문항 검증 보고서

실행일: 2026-09-02

## 목적

골드는 현재 상태로 유지한 채, 버튼 선택과 학생 근거를 분리하고 `선택 정오 × 선지 채택 여부`를 코드가 네 프로필로 라우팅하는 판정기가 대표 오답을 더 안정적으로 진단하는지 확인한다.

검증 범위는 기존 5문항의 `representativeWrong` 한 사례씩이며, 각 문항에서 같은 오답 선택과 같은 근거를 3회 반복한 총 15회다. 정답 근거, 저정보 응답, 전체 60회 프로브는 이번 실행 범위가 아니다.

## 수행 작업

- 코드가 현재 버튼 선택과 골드로 다음 프로필을 결정하도록 했다.
  - `CORRECT_ACCEPTED`
  - `CORRECT_REJECTED`
  - `WRONG_ACCEPTED`
  - `WRONG_REJECTED`
- 모델 입력에 코드 소유 `selectionIntent`, 선지의 `targetClaimEffects`, 근거 역할 분리 정책을 전달했다.
- 학생 근거를 `선지 재기술`, `실제 근거 명제`, `근거에서 판단으로 가는 연결`로 분리해 읽도록 프롬프트를 수정했다. 선지 재기술 자체는 근거로 인정하지 않는다.
- `DOES_NOT_JUSTIFY`를 곧바로 문항 한계로 처리하지 않고, 학생이 근거 없는 비약으로 선지를 채택한 경우에는 `CLEAR_ERROR`로 진단할 수 있게 했다.
- 골드 파일은 읽기 전용으로 사용했고, 호출 시에만 `reviewStatus`를 메모리에서 `human_reviewed`로 복제했다. 사용한 다섯 `c-gold.json`의 해시는 `SUMMARY.json`에 기록했다.
- 기존 5문항의 동일 `representativeWrong` 입력을 `gpt-5.6-terra / medium`으로 문항별 3회 재실행했다.
- 합격 기준은 `SUFFICIENT | CLEAR_ERROR | ASK_CORRECTIVE`이고 행동 대상이 `SELECTED_CHOICE`인 경우로 고정했다.

## 결과

| 문항 | 프로필 | 이전 엄격 재채점 | 수정 후 |
|---|---|---:|---:|
| 수소 생산 | `WRONG_REJECTED` | 3/3 | 3/3 |
| 보증 계약 | `WRONG_ACCEPTED` | 3/3 | 3/3 |
| FTA 원산지 | `WRONG_REJECTED` | 2/3 | 3/3 |
| 확산 모델 | `WRONG_ACCEPTED` | 3/3 | 3/3 |
| 열팽창 구동기 | `WRONG_REJECTED` | 2/3 | 3/3 |
| 합계 |  | **13/15** | **15/15** |

수정 후 15회 모두 `SUFFICIENT | CLEAR_ERROR | ASK_CORRECTIVE`를 반환했다. FTA에서 동일 근거를 한 차례 `GOLD_OR_ITEM_LIMITATION`으로 보던 오판이 사라졌고, 열팽창의 이전 시간 초과도 120초 호출 한도에서 재발하지 않았다.

기존 보고서의 대표 오답 9/15는 당시 `DOES_NOT_JUSTIFY` 선지에 대한 경계 설명을 성공으로 세고 `CLEAR_ERROR`를 실패로 세던 채점 계약의 영향을 받았다. 현재 목적에 맞는 엄격 기준으로 당시 원출력을 다시 채점하면 13/15다. 따라서 이번 개선 폭은 9→15가 아니라 같은 기준에서 13→15로 보는 것이 정확하다.

정적 검증은 타입 검사와 판정기 집중 회귀 47/47이 통과했다. 네 프로필 자체는 단위 계약으로 모두 검증했지만, 이번 실제 모델 호출은 오답 프로필인 `WRONG_ACCEPTED`와 `WRONG_REJECTED`만 검증했다.

기계 집계는 [SUMMARY.json](./SUMMARY.json), 15회 원출력과 호출 메타데이터는 [results.json](./artifacts/results.json)에 보존했다.

## 다음 작업 추천

동일한 5문항의 정답 근거 후속 검증에서 모델 원출력 15/15, 수정 전 런타임 10/15를 확인했고, 이어 자연어 후처리를 제거한 재실행에서 런타임도 15/15가 됐다. 상세 결과는 `docs/experiments/problem-evaluator-four-route-correct-probes-postprocessor-fix-2026-09-02/REPORT.md`에 기록했다.

대표 오답과 정답 근거의 네 프로필 기준선은 각각 15/15로 확보됐다. 다음은 이 기준선에서 전체 골드와 프로필별 최소 골드 입력을 비교하는 실험이다. 다만 이 결과는 ExplanationAudit의 등급 정확도, 해설 역수입, 인간 검토율이나 전체 자동 승인율의 개선을 입증하지는 않는다.
