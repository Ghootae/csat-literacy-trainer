---
date: 2026-10-11
scope: v5-end-explanation-chosen-option
base_commit: 0c903b8
---

# 종료 코칭: 마지막으로 고른 선지 설명 추가, 서버 정답 줄 제거

- 사용자 결정 2건을 D-0112 4·5항으로 기록: sol 종료 지시문에 "4) 학생이 마지막으로 고른 선지가 왜 답이 아닌지 원문에 근거해 짚는다(근거가 없어도 생략하지 않음)", 서버 "정답은 N번입니다." 줄 제거.
- 1차 확인 시험에서 입력 버그 발견: 종료 설명 입력에 학생이 고른 선지 번호가 없었다(실험 입력 형식을 그대로 옮긴 인계 문서의 빈틈). 근거 없는 칸은 고른 선지를 알 수 없었다.
  `feedback-v5-end-explanation.ts`에 선택별 `selectedChoice`·`rationaleOmitted`, `finalSelectedChoice`(위치 번호, 내부 ID 아님)를 추가.
- 재확인 10칸: 고른 선지 설명 10/10, 서버 정답 줄 0/10, 원문 오류 0. 비용 합계 약 0.44달러. [요약](../../docs/experiments/v5-chosen-option-recheck-2026-10-11/REVIEW-SUMMARY.json).
- 테스트 342/342, 실행기 테스트 32/32, build 통과.
