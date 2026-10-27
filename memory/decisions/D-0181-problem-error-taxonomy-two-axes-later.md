---
id: D-0181
status: accepted
date: 2026-10-27
scope: problem-error-taxonomy
supersedes: none
---

# 문제 풀이 오류 분류: 지금은 대응표, 학생 풀이 재검증 때 두 축으로 재구성

## 결정

문제 풀이 쪽 사고 패턴 분석의 세 분류 목록(사고 진단 함정 태그 12종 [D-0111](./D-0111-thought-diagnosis-v0-experiment.md), 정답 경로 요구 요소 E1~E10 [D-0119](./D-0119-answer-path-elements-and-depth.md), 선지 연결 비틂 14종 [D-0162](./D-0162-choice-link-layer-direction.md))을 다음처럼 쓴다. 대응표: [`docs/review/problem-error-taxonomy-crosswalk-2026-10-27.md`](../../docs/review/problem-error-taxonomy-crosswalk-2026-10-27.md).

1. **방향은 두 축 재구성(B안)이다.** 내용 축은 비틂 14종, 과정 축은 읽기 과정 7가지(`POLARITY`·`REFERENT`·`MAPPING`·`SURFACE_MATCH`·`PARAPHRASE_DISTANCE`·`MULTI_STEP`·`OUTSIDE_KNOWLEDGE`)로 하고, 학생 오류 하나를 두 축에 각각 기록한다(해당 없으면 빈칸).
2. **지금은 세 목록을 그대로 두고 대응표로 묶는다(A안).** 사고 진단 가이드 v0.1과 정답 경로 요소 정의는 고치지 않는다.
3. **두 축 적용 시점**: 사고 진단·정답 경로 분석을 실제 학생 풀이로 재검증할 때 가이드를 두 축으로 고치고 그 검증에서 함께 확인한다.

## 근거

- 대응표에서 깔끔한 1:1은 셋뿐이고(입장·방향·조건), 학생 쪽 `MISREAD_FACT`(E10) 한 칸이 비틂 6종을 받는다. 동결본 비튼 조각 69개 중 31개(45%)가 그 6종이다(`docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/FREEZE.md`).
- 함정 태그·요소는 선지 내용 변형과 읽기 과정 실패를 한 목록에 섞고, 비틂은 내용 변형만 다룬다. 두 실패는 동시에 일어날 수 있다.
- 지금 가이드를 고치면 검증할 실제 학생 풀이가 없다.
- 사용자(2026-10-27): "권고대로." (코드 에이전트 권고: 방향은 B, 적용은 학생 자료가 생길 때.)

## 포함하지 않는 것

가이드·지시문 수정, 재채점, 외부 호출. 문단 쪽 관계 18유형(D-0147)은 비틂의 `relationTypeChange`로 이미 이어져 있어 범위 밖이다.

## 재검토 조건

실제 학생 풀이로 사고 진단·정답 경로 분석을 재검증할 때, 또는 대응표의 짝(코드 에이전트 초안, 사례 미검증)이 실제 사례와 어긋날 때.
