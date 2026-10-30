---
date: 2026-10-30
scope: paragraph-simple-student-sim-review
base_commit: 012869fe
---

# 체크포인트: `/dialogue/lab` 학생 역할 시뮬레이션 검토 (2026-10-30)

## 새로 확인된 것

- 다른 세션의 코드 에이전트가 화면에서 학생 역할로 5지문·19문단을 판정 v4.8로 실행한 [첫 보고](../../docs/review/dialogue-lab-student-sim-2026-10-30.md)를 원기록과 대조했다. 사실관계는 맞았다.
- 남은 문제는 둘이다. 표면 장력 p2에서는 교정 질문이 이미 맞힌 관계를 묻고 tER=false로 닫았다(v4.8 질문 규칙 1과 교정 뒤 판정의 어긋남이라는 가설). 표면 장력 p6에서는 교정 질문이 "서로 바꾸어 말한 부분"이라고 오류 종류를 밝혔다(규칙 2 위반).
- `CURRENT_STATE.md`·`WORK_TREE.md`의 운영 후보 표기가 v4.7이었으나 실제 실행·코드는 v4.8이다(커밋 `8b05f6dc`).
- 문제 파트 부록(v5.8, 9세션): P1~P3은 기존 설계(D-0187·D-0188·D-0108·D-0057)였다. 문제 쪽 교정 질문은 4사례 모두 학생의 틀린 문장을 겨냥해, 문단 문제 1의 원인(v4.8 질문 규칙 1) 가설을 뒷받침한다.

## 결정된 것

- D-0191: 빈 곳 답에서 질문 전제를 이어받은 답, 원문 정리 수준·요건 일부만 말한 답을 충족으로 치는 현재 판정을 수용한다. v4.9 질문 규칙 6은 유지한다.
- 교정 질문 힌트 강조는 D-0175를 유지한다(사용자 재확인, 새 기록 없음).

## 변경한 것

- 원기록 19개와 실행 도구를 `docs/experiments/student-sim-2026-10-30/`로 옮기고, 사람용·Desktop 반영 보고를 썼다. 첫 보고에는 반영본 안내를 붙였다.
- `CURRENT_STATE.md`·`WORK_TREE.md`의 v4.8 표기와 시뮬레이션 결과 한 줄을 고쳤다.
- 문제 쪽 고정 문구 두 곳(`problem-feedback.ts` `gateNote` CORRECT_UNVERIFIED, 재선택 오답의 INSTANT·RESELECTION_WRONG)을 고쳤다. 단위 테스트 36/36·typecheck·e2e `problem-lab-workbench.spec.ts` 22/22 통과.

## 미해결

- 되묻기·반문 분기(문제 4-2), 다른 문단 근거 주장의 오류 판정(문제 4-3), 요약 칸 잡담·메타 제외(문제 5)는 사용자 판단을 기다린다.

## 다음 행동

- 문제 1·2(a)를 재현하는 고정 사례 묶음을 설계하고 v4.10 범위(givesRelation 정리 포함)를 정한다.

## 근거

- `docs/experiments/student-sim-2026-10-30/REPORT-human.md`, `REPORT-desktop.md`, `logs/`
- `memory/decisions/D-0191-paragraph-gap-answer-lenient-judgment-accepted.md`, `D-0175-paragraph-simple-correction-hint-during-question.md`
