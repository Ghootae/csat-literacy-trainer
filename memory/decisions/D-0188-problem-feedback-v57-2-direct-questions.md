---
id: D-0188
status: accepted
date: 2026-10-29
scope: problem-correction-question
supersedes: none
---

# 문제 판정 지시문 v5.7-2: 내용 오류 교정 질문은 답을 주지 않는 직접 질문

## 결정

사용자 결정(2026-10-29, "채택"). 제품 기본 판정 지시문을 `source-direct-problem-feedback-v5.7-2.md`(`promptVersion: problem-feedback-v5.7-2`)로 바꾼다. v5.6([D-0185](./D-0185-judge-reading-added-vs-stronger-v56.md))의 판정 규칙은 그대로 두고, 교정 질문 규칙만 바꾼다.

1. 원문의 답 표현(학생이 고쳐야 할 바로 그 사실)은 질문에 넣지 않는다.
2. 내용 오류(CONTENT)와 추정 오류(INFERRED)는 짧은 직접 질문으로 묻는다. 두 갈래 질문("A야, B야?")은 대상 오류(TARGET)와 선지 읽기 오류(READING)에만 쓴다.
3. 직접 질문은 답이 사실 하나가 되게 묻는다. 판단 방법이나 설명 방식("~ 여부를 어떻게 판단해야 할까")은 묻지 않고, 한 질문에 사실 하나만 묻는다. (v5.7-1)
4. 예/아니오로 답할 수 있는 질문은 쓰지 않는다. (v5.7-2)

v5.7과 v5.7-1은 재현용이다. 지문 표시와 추측 답 처리는 [D-0187](./D-0187-keep-highlight-and-guess-repair.md)을 따른다.

## 근거

- [회귀 보고](../../docs/experiments/v57-regression-2026-10-29/REPORT-human.md):
  - v5.7 18세션 중 16세션은 결과가 같았다. 갈라진 2세션(C-B3, S-A1)은 반복해 보니 흔들림이었다.
  - 답 보기 질문은 6/6에서 0/6이 됐다([재실행 보고](../../docs/experiments/student-sim-2026-10-29/REPORT-v49-v57-human.md)).
- 사용자 판정: 질문 품질이 전반적으로 나아졌다. D-A3는 "not clear, but acceptable", I-A2는 "might be problematic"이었고, 이 둘을 v5.7-1·v5.7-2로 고쳤다. 확인한 7세션의 결과는 같았다.

## 다시 볼 조건

- 실제 학생 기록에서 한 단계 돌아가는 직접 질문(예: D-A3 "어디로 흡수돼?")에 학생이 막히는 일이 반복되면 재검토한다.
- 새 질문에 맞춘 답(낱말이나 위치만 답한 경우)이 고침으로 인정되지 않는 사례가 나오면 교정 판정 규칙을 재검토한다.
