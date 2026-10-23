---
date: 2026-10-23
scope: examiner-strategy-feedback-design-and-trials
base_commit: 5d38020
---

# 출제자 전략 피드백: 설계 확정, 지시문 v4까지 시험

## 변화

- [D-0169](../decisions/D-0169-actor-names.md): 실행 주체 명칭을 정했다(호출 모델·코드 에이전트·하위 에이전트·웹 에이전트). AGENTS.md에 "실행 주체 명칭" 절을 추가했다.
- [D-0170](../decisions/D-0170-optional-examiner-strategy-feedback.md): 선택형 출제자 전략 피드백을 정했다.
  - 대상은 동결본 truth FALSE 선지 57개다(처음 61개로 잘못 셈, D-0170 정정).
  - 고정 글로 만든다(호출 모델 생성 → 코드 에이전트 정확성 검토 → 사용자 표본 판정).
  - 세션 종료 뒤 버튼으로 보여 준다.
  - 보완: 결론 문단을 둔다. 함정 의도는 근거 종류를 고정하지 않는다. 호출 모델은 sol, 지시문은 v4다.
- 시험(합계 비용 $0.62):
  - 1차: 3모델, 법인 13번 ②. sol 2/3, DeepSeek 2/3, luna 0/3이 정확성을 통과했다.
  - 2차: 함정 의도 제약 있음·없음, 4선지×2×2. 차이가 작아 open을 기준으로 정했다.
  - 3차: v3.
  - 4차: v4(문단 나누기). 사용자가 품질에 만족했다.
  - 보고: [1차](../../docs/experiments/examiner-strategy-2026-10-23/REPORT-trial-1-human.md), [2~4차](../../docs/experiments/examiner-strategy-2026-10-23/REPORT-trial-2-4-human.md).
- 실행기 `scripts/run-examiner-strategy.mjs`(+테스트 28)를 하위 에이전트가 인계 두 건으로 구현했다.
- 웹 에이전트 검토로 골드 오류가 학생 글로 옮겨지는 것을 확인했다(도파민 13번 ② '흑질에서' 끊기). [Q-0039](../OPEN_QUESTIONS.md)로 열었고, 사용자 결정으로 나중에 한다.

## 다음

1. 골드 검수(Q-0039).
2. 57개 생성 방식을 정하고 전체 생성(승인 필요).
3. 화면 구현(모형 먼저).
