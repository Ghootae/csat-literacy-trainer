---
id: D-0180
status: accepted
date: 2026-10-27
scope: student-state-model
supersedes: D-0048
---

# 학생 상태 모델 V1 폐기: 앞으로 논의에서 제외

## 결정

[D-0048](./D-0048-student-state-model-next-goal.md)로 세운 학생 상태 모델 V1(문단·문제 대화 판정 기록을 증거로 바꿔 핵심 이해·근거 기반 문제 해결·회복·자기 점검 네 차원으로 모으는 모델, [`docs/STUDENT-STATE-MODEL-V1.md`](../../docs/STUDENT-STATE-MODEL-V1.md))을 폐기한다. 학생 사고 패턴 분석 논의에서 제외한다.

- 남은 승인 항목(새 형식 실제 로그, 학생 문구·주기, 공개 노출)은 진행하지 않는다.
- 이 모델에 묶인 질문 Q-0027은 닫는다. Q-0037은 학생 상태 모델 전제를 빼고 분석 자료(문단 분석 지도·선지 연결) 결합 문제로만 남긴다.
- 구현 코드(`packages/pipeline/src/student-state/`, 증거 JSONL 저장, 개발자 리포트 UI, 기본 비활성 `/progress` 프리뷰)는 그대로 둔다(사용자 2026-10-27 "코드는 그대로 두고"). 기본 비활성이라 학생에게 보이지 않는다. 정리는 얇은 학생판 범위 설계 때 함께 본다.

## 근거

- 사용자(2026-10-27): "학생 상태 모델 V1은 폐기 -> 앞으로 논의에서 제외."
- 배경(기록): V1의 문단 증거는 축별 판정과 골드 MR 변화에서 나오는데, 문단 판정을 단순 형식으로 바꾸면서([D-0174](./D-0174-paragraph-simple-v47-operating-candidate.md)) 축·MR이 없어졌다([Q-0037](../OPEN_QUESTIONS.md)). 사고 패턴 분석은 이후 문단 분석 지도([D-0141](./D-0141-paragraph-analysis-map-direction.md))와 문제 쪽 진단(D-0111·D-0119·D-0162)으로 옮겨 갔다.

## 재검토 조건

사용자가 다시 열자고 할 때.
