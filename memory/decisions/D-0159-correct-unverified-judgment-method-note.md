---
id: D-0159
status: accepted
date: 2026-10-21
scope: problem-feedback-explanation
supersedes: none
---

# 정답·근거 미확인에서 판단 방식이 부족의 까닭이면 그 방식을 인정하지 않고 까닭을 말한다 (`insufficiencyKind`)

## 결정

방향: UI 메모장 25번(2026-10-19, 사용자가 Claude 권고에 동의). 설계안 승인 2026-10-21 "승인", 보강 "일괄로 승인".

- SELECTION 판정에 `insufficiencyKind`(NONE / JUDGMENT_METHOD / MISSING_LINK)를 둔다. 재구성 가능 + INSUFFICIENT일 때만 NONE이 아니고,
  서버가 검증한다. JUDGMENT_METHOD는 원문과의 관계가 아니라 판단 방식(있음·없음, 같은 단어, 원문 밖 지식)에 기댄 경우,
  MISSING_LINK는 맞는 사실만 쓰고 선지 판정으로의 연결이 빠진 경우다. 판정 결과는 바꾸지 않는다.
- 마지막 설명 입력에 CORRECT_UNVERIFIED일 때만 마지막 선택의 `insufficiencyKind`를 넘긴다.
- JUDGMENT_METHOD이면 그 방식을 맞는 근거처럼 인정하지 않고, 그 방식만으로는 판정하기 어려운 까닭(맞는 선지도 틀렸다고 보게 되는
  까닭)을 원리 한 문장으로 말한 뒤 확인할 것을 말한다. 학생 생각을 틀렸다고 단정하지 않고 다른 선지를 예로 들지 않는다.
  MISSING_LINK·null이면 기존 규칙("맞는 부분 인정 + 빠진 연결").
- 오답 선택 마지막 설명, 칸 첫·끝 고정 문구는 바꾸지 않는다.

## 이유

- 사용자 세션(2026-10-19, `704f449e…`)에서 판정기는 "지문에 없음만으로는 부족"을 알았지만 마지막 설명이 판정 이유를 받지 않아
  "네가 말한 대로 지문에는 …없어"라고 인정했다(UI 메모장 25번 상세).
- 실모델 1차: 인정 제거 2/2, 까닭 빠짐 → 지시문 보강. 2차: 까닭 1/2 분명, 1/2 간접
  ([1차](../../docs/experiments/v5-judgment-method-user-2026-10-21/REVIEW.md), [2차](../../docs/experiments/v5-judgment-method-r2-user-2026-10-21/REVIEW.md)).

## 한계·재검토 조건

- 도파민 13번 "지문에 없음" 한 유형에서만 확인했다. 원문 밖 지식·같은 단어 유형과 MISSING_LINK 경로는 실모델로 확인하지 못했다
  (대조 근거를 첫 판정이 SUPPORTED로 봄, UI 메모장 29번).
- 칸 앞뒤 고정 문구("빠진 연결을 같이 채워 볼게.")가 판단 방식 경우에 어긋나는 점은 사용자 검토에서 지적되면 다룬다.
