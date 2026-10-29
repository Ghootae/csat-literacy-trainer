---
id: D-0190
status: accepted
date: 2026-10-29
scope: problem-feedback-prompt
supersedes: none
---

# 문제 판정 기본 지시문을 v5.8로 바꾼다

## 결정

사용자 결정(2026-10-29, "5.8 전환 결정"). 제품 기본 판정 지시문을 `source-direct-problem-feedback-v5.8.md`(`promptVersion: problem-feedback-v5.8`)로 바꾼다(`feedback-evaluator.ts` 기본값, `student-sim.mjs` 안내).

v5.7-2([D-0188](./D-0188-problem-feedback-v57-2-direct-questions.md))와 다른 곳은 세 군데뿐이다.

1. ground.quote: 학생이 든 사실부터 선지와 맞서는 마지막 단계까지의 학생 말(한 구간).
2. holds: ground의 학생 말이 참이라고 할 때의 논리만. 원문 일치는 sourceCheck에서만.
3. sourceCheck: 원문 정의·일반 진술을 한 번 적용한 결과는 원문으로 판단 가능("즉" 정의의 부정 포함, 두 번 이상·원문 밖 상식은 UNDETERMINED).

서버 결론 규칙은 [D-0189](./D-0189-server-never-raises-insufficient.md)를 따른다. v5.7-2는 재현용이다.

## 근거

- [실험 보고](../../docs/experiments/v58-conclusion-2026-10-29/REPORT-human.md): 같은 글 5회 같은 칸·결론, 회귀 18세션 중 17 같음(S-A1은 v5.7에서도 흔들린 세션), 정답 세션 8개 재확인 같음, 오류 수·형식 재시도 변화 없음.
- 시험: `feedback.test.ts`에 v5.7-2 대비 차이 시험 추가, `npm test` 1492 통과(기존 실패 2건만).

## 다시 볼 조건

- 넓은 ground에 덧붙인 원문 밖 단계 때문에 충분한 근거가 INSUFFICIENT가 되는 실제 사례가 나오면 ground 범위를 다시 본다("가장 짧은 구간" 문안은 역효과였다, `-v5.8-draft2.md`).
