---
id: D-0156
status: accepted
date: 2026-10-21
scope: problem-feedback-judgment
supersedes: none
---

# 한 제출 안의 학생 진술이 서로 모순되면 판정 불가로 둔다 (`claimConflicts`)

## 결정

사용자 결정(2026-10-21, UI 메모장 23번): "학생의 말 안에서 모순이 발생하는 경우니, 과도한 해석을 하지 말고(과도한 해석을 하게
되면 불필요한 질문이 생길 수 있음) 판정 불가로."

- SELECTION 판정기는 학생 진술을 글자 그대로 읽어 서로 모순되면, 보태 읽지도 원문과 비교해 오류로 잡지도 않고
  `reconstructability=UNKNOWN`으로 둔다. 언어적 생략 복원만으로 풀리는 짝, 교정 답이 앞선 주장을 바꾸는 것은 모순이 아니다.
- 판정 출력 확장 스키마에 `claimConflicts`(observationId, firstQuote, secondQuote, conflict)를 `reconstructability`보다 먼저 둔다.
  표현이 달라도 뜻이 같은 말은 같은 것으로 보고 비교한다.
- 서버 검증: 하나라도 있으면 `UNKNOWN`이고 `errors`가 비어야 한다. quote는 학생 발화 안에 있고 서로 겹치지 않아야 한다.
- 흐름 코드는 그대로다(정답 선택이면 CORRECT_UNVERIFIED 마지막 설명).

## 이유

- 사용자 세션(2026-10-15) 근거 "d는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은 옳지
  않음."에서 판정기가 뒷문장을 오류로 잡아 이미 쓴 내용을 다시 물었다([논의 자료](../../docs/review/backlog-23-gongsun-q12-ellipsis-case-2026-10-21.md)).
- 지시문 문단만 둔 1차 구현은 실모델에서 실패했다([1차 판정](../../docs/experiments/v5-contradiction-sufficiency-user-2026-10-21/REVIEW.md)).
  출력 칸으로 요구한 2차 구현은 U1 두 번·대조 U2 모두 기대대로였다([2차 판정](../../docs/experiments/v5-contradiction-sufficiency-r2-user-2026-10-21/REVIEW.md)).

## 한계·재검토 조건

- 공손룡 12번 ④ 한 사례에서만 확인했다. 정상 근거를 모순으로 잘못 보는 과잉 적용이 다른 문항에서 보이면 다시 본다.
- `scripts/lib/v5-marker-judgment.mjs`(옛 실험 원본)에는 넣지 않았다.
