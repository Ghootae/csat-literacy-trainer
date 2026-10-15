---
id: D-0134
status: accepted
date: 2026-10-15
scope: paragraph-dialogue-boundary-show-dev-trial
supersedes: none
---

# (나″) 사용감 시험: 개발자 모드, 중심 대상 밑줄 보여 주기

## 결정

[D-0133](./D-0133-paragraph-boundary-rule-na-double-prime.md) (나″)의 사용감을 먼저 시험한다. 운영 V4는 그대로 두고 개발자 화면(`/dialogue/dev`) 판정 모드에 새 모드를 추가한다.

### 흐름 (문단당 질문 최대 1회)

| 시점 | V4 축 판정 | 행동 |
|---|---|---|
| 1차 응답 | 모두 PASS | 통과 |
| 1차 응답 | OK만(SERIOUS·ERROR 없음) | 통과(선택 질문 제안 없음) |
| 1차 응답 | SERIOUS 일부(ERROR 없음) | 질문 없이 보여 주기 |
| 1차 응답 | 모든 축 SERIOUS(1축 문단 포함) 또는 ERROR 있음 | 질문 1회(V4 그대로) |
| 2차 응답 | 모두 PASS 또는 OK만 | 통과 |
| 2차 응답 | 그 밖의 모든 경우 | 보여 주기 후 종료 |

### 보여 주기 화면 (친근한 반말, 문제 풀이 화면과 같은 말투)

- "내 요약"(1차 응답)과 제목 "이 문단에서 담아야 할 것" 아래 gold-v2 `centralObject`를 보여 준다. `centralStory`는 모범 답안처럼 읽혀 쓰지 않는다.
- 밑줄: 마지막 판정에서 SERIOUS·ERROR인 축에 연결된 `centralObject` 구간. OK·PASS 축은 밑줄 없음.
- 안내: 누락만이면 "밑줄 친 부분을 원문에서 다시 확인해 봐.", ERROR가 남으면 "밑줄 친 부분, 원문과 다르게 이해한 것 같아. 원문에서 다시 확인해 봐."
- 버튼: [다음 문단]과 선택 [요약 고쳐 쓰기]. 고쳐 쓴 요약은 다시 판정하지 않고 기록만 한다.

### 축↔구간 연결 자산

- 골드는 바꾸지 않는다. 별도 파일 `packages/pipeline/fixtures/experiments/dialogue/central-object-axis-spans/manual-v0.json`에 Claude가 손으로 연결했다(공손룡·법인·표면장력 16문단, gold 파일 sha256 포함). 경계 사례(법인2 AX1 막연·AX2/AX3 경계, 공손룡4 두 축 같은 구간, 표면장력1 AX2, 공손룡2 AX2 기능 부재)는 고치지 않고 시험한다.
- 사용감이 만족스러우면 API로 생성한다. 생성은 골드 생성기와 분리한 별도 호출이며, 입력은 확정 골드의 문단별 중심 대상·축 정보만, 지문 단위로 여러 문단을 한 번에 처리하고 출력·검증은 문단별로, 실패 문단만 단독 재호출한다.

## 근거

- 사용자 명시(2026-10-15): "일단 나\"의 사용감을 먼저 테스트", 별도 호출·지문 단위, "중심 대상으로 확정. 화면 문구는 권고대로", 보여 주기 뒤 [다음 문단]+선택 고쳐 쓰기 "권고대로", "말투는 문제 풀이의 말투와 동일하게 친근한 반말", "2차 응답 후엔 그냥 틀려도 보여주고 끝내도", ERROR 안내 분리 "권고대로. 확정하고 진행".

## 포함하지 않는 것

운영 V4·학생 화면 변경, 골드 수정, 축약본 생성, API 생성 단계, 기존 V4 질문 문구의 말투 변경.

## 후속 (2026-10-15)

"문단당 질문 최대 1회"는 [D-0135](./D-0135-boundary-show-error-question-per-axis.md)로 대체됐다(1차 ERROR 축마다 질문 한 번, 남은 ERROR·SERIOUS 모두 표시). 나머지는 유지한다.
"기존 V4 질문 문구의 말투 변경" 제외는 [D-0136](./D-0136-boundary-show-banmal-question-feedback.md)로 대체됐다(이 모드의 질문·피드백 반말, 운영은 시험 후 별도 승인).
"내 요약"(1차 응답)은 [D-0137](./D-0137-boundary-show-effective-response-restatement.md)로 대체됐다(마지막 판정의 `effectiveResponse`).
