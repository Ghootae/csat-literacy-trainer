---
id: D-0234
status: accepted
date: 2026-11-15
scope: paragraph-summary-ui
supersedes: none
---

# 오류가 남은 단계의 요약 카드는 "피드백을 반영한 정리"로 표시한다 (Q-0050)

## 결정

사용자 결정(2026-11-15).

1. 방안 B(화면·서버 쪽)를 채택한다. 판정 지시문(v4.8)과 모델 출력은 바꾸지 않는다.
2. 마지막 단계 출력에 `errors`가 남아 있으면 카드 제목을 "피드백을 반영한 정리"로 바꾼다. 틀린 구절(`studentQuote`)은 취소선으로 긋고, `correction`을 아래 목록에 붙인다. 원래 발화는 대화 기록에 그대로 남는다.
3. 오류가 없으면 기존 "지금까지 내 요약"을 쓴다.
4. 방안 A(지시문을 올려 모델이 교정 반영 요약을 쓰게 함)는 B로 부족할 때 검토한다.

## 근거

- `restatedSummary`는 luna가 학생 발화를 합쳐 다시 쓴 값이다(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md`). 학생이 틀리게 쓰면 그대로 옮기는 것이 지시문대로의 동작이다.
- 구현: `packages/app/src/client/RestatedSummary.tsx`, `restatedCorrections` 필드(`packages/app/src/shared/dialogue-simple.ts`, `server/dialogue-simple.ts`). 검증: `server/dialogue-simple.test.ts`, `client/RestatedSummary.test.ts`.
- 한계: 인용이 요약 문장에 정확히 없으면 취소선은 생략되고 교정 목록만 보인다. 실제 화면 확인은 아직 하지 않았다.
