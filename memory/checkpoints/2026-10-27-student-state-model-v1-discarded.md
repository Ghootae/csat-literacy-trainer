---
date: 2026-10-27
scope: student-state-model-v1-discarded
base_commit: 0348d5e
---

# 학생 상태 모델 V1 폐기

## 변화

- 사용자 결정으로 학생 상태 모델 V1을 폐기하고 논의에서 제외했다([D-0180](../decisions/D-0180-student-state-model-v1-discarded.md), D-0048 대체).
- Q-0027 닫음. Q-0037은 분석 자료 결합 문제로만 남김.
- `CURRENT_STATE.md`의 학생 상태 모델 절을 한 줄로 줄이고 다음 할 일 4번(남은 승인 항목)을 지웠다.

## 열린 것

- 구현 코드(`packages/pipeline/src/student-state/`, 증거 JSONL, 개발자 리포트 UI, `/progress` 프리뷰)는 그대로 둔다(사용자). 얇은 학생판 범위 설계 때 정리를 함께 본다.
