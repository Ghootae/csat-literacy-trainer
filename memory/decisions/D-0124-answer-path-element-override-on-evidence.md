---
id: D-0124
status: accepted
date: 2026-10-13
scope: thought-tracker-item-map-answer-path
supersedes: none
---

# 오답 실패 요소: 기본은 노드 요소, 명시적 증거가 있을 때만 덮어쓰기

## 결정 (사용자, 2026-10-13: C안)

- 실패 요소 기본값 = 실패 노드에 붙은 요소.
- 풀이에 다른 요소의 오류가 말로 드러날 때만 그 요소로 바꾼다(예: "말이 안 되니까", "상식적으로" → E9).
- 덮어쓸 때 `failedElement`(새 요소), `nodeElement`(원래 노드 요소), `overrideQuote`(근거 인용)를 남긴다. 실패 노드·종류는 그대로 둔다.
- 덮어쓰기 빈도는 집계해 규칙 효과를 본다.

정의: `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md` "v0.1 개정 규칙 > 채점".

## 근거

- [오답 지표 시험](../checkpoints/2026-10-13-answer-path-wrong-cases-results.md) W8: 학생이 근거를 맞게 찾고도 상식으로 판정을 뒤집었다. 두 회차 모두 APPLY n7을 정확히 잡았으나, 요소는 노드 요소 E6(사례 대응)으로 기록돼 리포트 처방이 빗나간다(실제는 E9). 파일럿 2차 S2도 노드 요소 E5와 선지 핵심 E4가 달랐다.
- 기각한 안: A(노드 요소만, 진단 오류), B(채점자가 매번 요소 판단, 일관성 저하). C는 D-0123과 같은 원리(기본값 고정 + 학생이 실제로 말한 증거 우선).
