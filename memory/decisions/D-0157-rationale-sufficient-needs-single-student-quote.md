---
id: D-0157
status: accepted
date: 2026-10-21
scope: problem-feedback-judgment
supersedes: none
---

# 교정 뒤 근거 확인은 핵심 관계를 혼자 담은 학생 발화 하나로만 인정한다 (`sufficiencyEvidence`)

## 결정

사용자 결정(2026-10-21, UI 메모장 24번): Claude 권고에 동의("24번은 권고에 동의"). 2차 보강은 "일괄로 승인".

- REPAIR의 `rationaleSufficient`는 선지의 참·거짓을 가르는 핵심 관계가 학생 발화(처음 근거와 교정 답)에 드러날 때만 true다.
  평가자가 학생이 답한 대상·라벨을 이어 만든 관계는 인정하지 않는다.
- true이면 새 필드 `sufficiencyEvidence`에 그 관계를 혼자 담은 학생 발화 인용을 **정확히 하나** 둔다. false이면 빈 배열이다.
- 서버 검증: 개수(true → 1, false → 0), 학생 발화 안의 인용, 처음 오류(`errors`·`additionalErrors`)의 학생 인용과 겹치지 않음.
- 이 기준은 충분성에만 쓴다. 오류 수정 판정(`repairs`, "말하지 않은 최종 결론을 요구하지 않는다")은 그대로다. 충분성 부족으로 새
  질문을 만들지 않는 규칙도 그대로라 질문 수는 늘지 않는다. 결과 기록(`rationaleVerified`)과 [끝내기] 문구만 달라진다.

## 이유

- 사용자 세션(2026-10-15)에서 교정 답이 "빨간 옷", "지정되지 않은 옷" 라벨뿐인데 판정기가 "누적 답변을 반영하면 … 뒷받침할 수
  있다"며 근거 확인으로 끝냈다([논의 자료](../../docs/review/backlog-24-rationale-verified-criterion-2026-10-21.md)).
- 인용만 요구한 1차 구현은 실모델에서 조각 두 개(처음 오류 주장 포함)를 이어 true로 냈다. 인용 하나·오류 인용 금지를 더한 2차는
  라벨 답 두 번 모두 false, 관계 문장 답은 true였다([1차](../../docs/experiments/v5-contradiction-sufficiency-user-2026-10-21/REVIEW.md),
  [2차](../../docs/experiments/v5-contradiction-sufficiency-r2-user-2026-10-21/REVIEW.md)).

## 한계·재검토 조건

- 양자택일 교정 질문(D-0118)의 답은 대개 라벨이라, 교정 뒤 근거 확인은 학생이 스스로 관계를 덧붙일 때만 나온다. 의도한 결과다.
  결과 기록을 학생 상태 분석에 쓸 때 이 점을 반영한다.
- 한 사례에서만 확인했다. 관계를 두 문장에 나눠 말한 정상 학생이 미확인으로 남는 경우가 보이면 다시 본다.

## 후속

- 2026-10-22 [D-0164](./D-0164-selection-mismatch-quote-allowed-as-sufficiency.md): 선택 충돌 항목의 학생 인용은 오류 인용 금지에서 뺀다.
