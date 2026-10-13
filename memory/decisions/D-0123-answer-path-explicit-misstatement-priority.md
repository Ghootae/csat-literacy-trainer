---
id: D-0123
status: accepted
date: 2026-10-13
scope: thought-tracker-item-map-answer-path
supersedes: none
---

# 오답 채점: 명시적 오진술 우선 귀속

## 결정 (사용자, 2026-10-13)

오답 풀이에 지문·〈보기〉와 어긋나는 사실 진술(과잉 일반화·방향 뒤집기·주체 바꾸기 포함)이 있으면, 그 사실을 확정하는 `READ` 노드의 실패로 기록한다. 그런 진술 없이 읽은 사실은 맞는데 잇거나 적용하는 데서 틀렸을 때만 `LINK`·`APPLY`로 기록한다. 오진술이 여럿이면 판정에 직접 쓰인 것을 고른다.

정의: `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md` "v0.1 개정 규칙 > 채점".

## 근거

- [오답 지표 시험](../checkpoints/2026-10-13-answer-path-wrong-cases-results.md) X6: "범위를 벗어나면 위성 방울이 생긴다"(지문은 하한 미만에서만)를 두고 Claude 라벨 LINK, r1 미확정, r2 READ로 갈렸다. 일관성 목적에 맞게 학생이 실제로 말한 내용에 근거하는 쪽으로 정한다.

## 남은 문제

- 노드 요소와 실제 오류 성격의 불일치(W8: 노드 요소 E6, 실제는 상식 개입 E9)는 미결정.
