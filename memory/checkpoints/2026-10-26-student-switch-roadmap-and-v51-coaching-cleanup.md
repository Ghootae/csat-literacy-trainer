---
date: 2026-10-26
scope: student-switch-roadmap-and-v51-coaching-cleanup
base_commit: 8e47eb5
---

# 학생용 전환 순서 결정과 문제 판정 v5.1(`coaching` 제거)

## 변화

- [D-0176](../decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md): 학생용 전환 순서를 정했다. 6지문으로 개발자 경로 알려진 문제 0건(1′) → 얇은 학생판 준비 → 방식과 무관한 원자료 확대만 먼저 → (섭외 뒤) 실제 학생 확인 → 운영 방식 확정 → 부가 자산 확대 → 정식 전환. 사용자 원안(대량 확대·방식 확정 뒤 개발자 테스트, UI만 수정해 전환)을 코드 에이전트가 검토하고 사용자가 동의했다. 실제 학생 섭외처는 아직 없다.
- [D-0177](../decisions/D-0177-problem-feedback-v51-drop-unused-coaching.md): 1′ 첫 과제. M1·M3 판정의 쓰이지 않는 `coaching` 필드와 M5(COACHING) 재요청을 없애고 지시문을 `source-direct-problem-feedback-v5.1.md`(`promptVersion: problem-feedback-v5.1`)로 바꿨다. 서버 평가 루프의 돌지 않던 두 번째 반복도 정리했다([인계·결과 보고](../../docs/handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md)).
  - 검증: build 통과, test 1383/1385(실패 2건은 이전과 같은 `boundary.test.ts` D4 규칙 1·`axis-architecture-experiment.test.ts`).
  - 회귀: 48개 대신 역할 균형 18세션(사용자 승인). 역할별 최종 결과 10-22와 같음, G-B3만 D-0164 재확인 결과로 바뀜, `coaching`·COACHING 0, 약 $0.80([보고](../../docs/experiments/v5-diverse-48-regression-2026-10-26/REPORT-human.md)). D-0166의 첫 다세션 확인도 겸했다.
  - 새 관측: 공손룡 sol 첫 판정 3건에서 결론 문장을 모순 주장으로 적고 오류에 잇지 않는 계약 위반 재시도(10-22 0건). 경로 영향 없음, 인과 미확인, 다음 회귀에서 다시 센다.
- 작동 순서 문서 [`PROBLEM-LAB-FLOW-2026-10-24.md`](../../docs/PROBLEM-LAB-FLOW-2026-10-24.md) 6절 1·6·7번을 수정 처리로 바꾸고 M5 절을 없앴다. `PP/feedback-evaluator.ts` 행 번호는 정리 전 기준이 섞여 있다(문서 3.1절에 표시).

## 다음

- 커밋 승인. 그 뒤 1′ 나머지: 문제 메모장 30번 논의, 출제자 전략·선지 직접 누르기 화면 사용 메모 반영.
