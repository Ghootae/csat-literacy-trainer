---
date: 2026-10-22
scope: paragraph-summary-dialogue-simple
base_commit: 16a446e
---

# 단순 형식 v4.7 — 교정 질문을 열린 질문으로, 내용 없는 "다르다" 답 처리

## 새로 확인된 것

- v4.6 교정 질문 지시("맞는지 다시 보게 한다")가 예/아니오형 질문을 낳았다(v4.5 회귀 39/86, v4.6 기준선 9/19). 사용자 UI 테스트(mRNA 문단 3)에서 "맞지 않아" 답이 알아챔 인정 없이 바로잡기로 끝났고, v4.6 기준선 공손룡에서는 같은 답을 고침으로 판정했다(오경보).
- v4.7(3회 75대화 + 재확인 15대화): 예/아니오형 0/86, "맞지 않아." 고침 오판 0/15·도입 인정 13/15, "잘 모르겠어." 잘못 인정 0/15. 비용 합계 약 $0.31.
- 판단 보류: 정보 비대칭 첫 요약 MULTI_ERROR 4/30(v4.5-new3 0/42). 첫 판정 규칙은 바꾸지 않았다.

## 결정된 것

- 사용자 "진행.": 교정 질문은 학생 말의 해당 부분을 짚고 문단이 어떻게 말하는지 묻는 열린 질문, 내용 없는 "다르다"·"모르겠다"는 고침 아님, 다르다고 알아챈 점은 CLOSE_ERRORS 도입에서 인정. D-0149 부분 수정 범위라 새 결정 기록 없음.

## 변경한 것

- 프롬프트 v4.7, `schema.ts`·`evaluator.ts` 버전, 시뮬레이션 P30·P31 경로와 예/아니오 참고 지표.

## 다음 행동

- 서버는 v4.7로 재시작함(2026-10-22 22:34). v4.7 커밋 승인 대기, mRNA 문제 풀이 피드백 검토 진행 중 — 이어받기: [세션 이어받기](../../docs/handoffs/2026-10-23-session-resume-paragraph-simple.md).

## 근거

- [Desktop 보고](../../docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-22-v4.7-correction/REPORT-v4.7-correction-desktop.md), [인간 보고](../../docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-22-v4.7-correction/REPORT-v4.7-correction-human.md)
