---
id: D-0177
status: accepted
date: 2026-10-26
scope: problem-feedback-judgment
supersedes: 없음(작동 순서 문서 6절 1·6·7번 남김 과제 처리)
---

# 문제 판정 v5.1: 쓰이지 않는 `coaching` 필드와 M5 재요청을 없앤다

## 결정

- M1(SELECTION)·M3(REPAIR) 판정 스키마와 지시문에서 `coaching`을 없앤다. 그 문자열을 다시 쓰던 M5(`COACHING` kind)와 재요청 분기도 없앤다.
- 학생에게 보이는 종료 설명은 M4(`END_EXPLANATION`)만 쓰고, M4의 손상 문자열 검사(`validateFeedbackCoaching`)는 유지한다.
- 지시문은 새 파일 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md`(v5와 제목·종료 코칭 문단·문장 1개만 다름), `promptVersion: problem-feedback-v5.1`. 옛 `v5.md`는 지난 실험 재현용으로 둔다. 운영 후보 이름은 계속 v5([D-0090](./D-0090-problem-evaluator-v5-naming.md))이고 v5.1은 그 지시문 판 번호다.
- 서버 평가 루프의 돌지 않던 두 번째 반복을 없앴다(동작 동일).

## 근거

- 이 필드는 학생에게 보이지 않으면서 형식 검사에 걸리면 재요청을 일으켰고, 재시도 한도를 넘으면 판정 전체를 실패시켰다. 지시문의 "서버는 모든 정상 코칭 종료에 정답과 해설을 덧붙인다"는 현재 동작과 달랐다([작동 순서 문서](../../docs/PROBLEM-LAB-FLOW-2026-10-24.md) 6절 1·6·7번).
- 사용자: 학생용 전환 순서 1′의 첫 과제로 진행 승인("기록하고 A 진행해", 2026-10-25, [D-0176](./D-0176-student-switch-roadmap-pilot-before-expansion.md)). 회귀는 48개 대신 역할 균형 18개로 승인("응, 18개로 승인", 2026-10-26).
- 구현: [인계](../../docs/handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md). 전체 시험 1385건 중 1383 통과, 실패 2건은 이번 변경과 무관한 기존 실패(`boundary.test.ts`의 `node:fs`, `axis-architecture-experiment.test.ts`의 없는 `.omc/adhoc` 파일).
- 회귀([보고](../../docs/experiments/v5-diverse-48-regression-2026-10-26/REPORT-human.md)): 18세션 역할별 최종 결과가 10-22와 같다. 바뀐 1건(G-B3)은 D-0164 수정 뒤 재확인 결과와 같다. 판정 출력의 `coaching` 0건, COACHING 시도 0건. luna 25회·sol 28회 약 $0.80.

## 다시 볼 조건

- 공손룡 문항 sol 첫 판정에서 학생의 결론 문장("②가 틀려요")을 모순 주장으로 적고 오류에 잇지 않는 계약 위반 재시도가 3건 새로 나왔다(10-22 같은 세션 0건, 모두 재시도로 통과, 경로 변화 없음). 이번 변경과의 인과는 확인하지 않았다. 다음 회귀에서 이 재시도가 늘거나 재시도 소진으로 판정 실패가 나오면 `studentClaims` 규칙(결론 문장을 주장으로 적을지)을 다시 본다.
