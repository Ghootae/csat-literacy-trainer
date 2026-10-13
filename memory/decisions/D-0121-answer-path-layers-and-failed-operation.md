---
id: D-0121
status: accepted
date: 2026-10-13
scope: thought-tracker-item-map-answer-path
supersedes: D-0119 (깊이 정의·오답 지표 부분만)
---

> 깊이 정의(층수)는 [D-0122](./D-0122-answer-path-depth-node-count.md)로 대체됐다(깊이 = 노드 수).

# 정답 경로: 일렬 고리 → 층, 오답은 끊김 위치 대신 실패 노드 종류

## 결정 (사용자, 2026-10-13: "권고대로 반영")

D-0119의 다음 부분을 대체한다. 나머지(어휘 E1~E10, sol 1회 생성·동결, 정답=전체 성공, 확인 질문 없음, 정답·오답 지표 분리)는 유지한다.

- 깊이: 선형 고리 수 → 의존 관계로 만든 **층수**. 노드 종류 `READ`/`LINK`/`APPLY`, 판정에 필요한 노드만, 최종 대조는 `APPLY`에 포함.
- 오답 지표: 끊김 위치 비율 → 오류가 드러난 **노드 종류와 요소**. 앞선 노드 성공은 보충하지 않고, 정할 수 없으면 미확정.
- 정답에 꼬리표 `GUESS_STATED`·`RATIONALE_ERROR` 추가(성공 집계 불변). 오답 분모(전체·관측·미확정·근거 없음·극성)를 함께 보인다.
- E6 범위 축소, 노드당 요소 0~1개, 어휘 밖 연산은 null+메모.
- 일관성 확인: 같은 풀이 독립 재채점 일치.

정의: [`docs/review/answer-path-element-vocabulary-v0-2026-10-13.md`](../../docs/review/answer-path-element-vocabulary-v0-2026-10-13.md) "v0.1 개정 규칙".

## 근거

- [파일럿 1차](../checkpoints/2026-10-13-answer-path-depth-pilot-v1-results.md): 오답 9개 중 끊김 위치 측정 가능 2개, 그중 I1은 후보 3개로 애매. 같은 종류 연산의 분할이 선지마다 다르고, 병렬 근거의 배열 순서에 따라 S2 비율이 60%↔20%로 바뀔 수 있다.
- Codex 논의(문제·근거만 전달): 확인 질문 없이 실제 최초 끊김은 알 수 없다는 데 Claude와 일치. 층 구조는 Codex 권고, 실패 종류 기록은 Claude 제안을 결합.
