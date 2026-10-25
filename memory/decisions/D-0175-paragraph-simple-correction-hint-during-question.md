---
id: D-0175
status: accepted
date: 2026-10-25
scope: paragraph-simple-holistic-dev-mode
supersedes: D-0140 "질문 중 지문 표시 안 함" 항목(교정 질문 한정), D-0144 "질문 중 표시 보류" 항목(교정 질문 한정)
---

# 단순 형식 문단: 교정 질문 중에는 그 오류의 근거 문장 하나를 힌트로 표시한다

## 결정

- 교정 질문(`CORRECTION_QUESTION`)에 학생이 답하기를 기다리는 동안(`stage=AFTER_CORRECTION`, 판정 중 아님) 지문에서 그 오류의 근거 문장(`targetError.sourceQuote`) 하나를 옅은 미색 힌트로 표시한다.
- 빈 곳 질문(`GAP_QUESTION`) 중에는 표시하지 않는다. 이 경우 [D-0140](./D-0140-paragraph-simple-holistic-dev-mode.md)의 "질문 중에는 지문을 표시하지 않는다" 규칙이 그대로 적용된다.
- 학생이 표시된 문장을 베껴 답하는 경우는 받아들인다.
- 판정이 시작되면 힌트를 지우고, 마무리되면 기존 공개 표시로 바꾼다.

## 근거

- 사용자 결정(2026-10-22): 교정 질문에만 근거 문장을 힌트로 표시하고, 빈 곳 질문에는 표시하지 않으며, 표시된 문장을 베껴도 받아들인다("권고 동의"). 출처: [체크포인트](../checkpoints/2026-10-22-paragraph-simple-v46-dev-ui.md) '결정된 것', [인계](../../docs/handoffs/2026-10-22-simple-dialogue-waiting-and-correction-hint.md).
- 구현: `packages/app/src/server/dialogue-simple.ts`의 `view()`(`hint`, `highlightKind: 'HINT'`).
- 이 결정은 당시 체크포인트에만 적혀 있어, accepted 상태의 D-0140·D-0144 문구와 어긋났다. 작동 순서 문서 [6절 7번](../../docs/PARAGRAPH-LAB-FLOW-2026-10-25.md)이 이 차이를 찾아냈고, 2026-10-25에 결정 기록으로 올렸다(사용자 "권고대로 진행해").

## 다시 볼 조건

- 실제 학생 사용에서 교정 답이 힌트 문장을 베끼기만 하고 오류를 고치지 못하는 사례가 많으면 다시 본다.
