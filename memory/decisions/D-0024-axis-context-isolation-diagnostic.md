---
id: D-0024
status: accepted
date: 2026-09-20
scope: paragraph-axis-context-isolation-diagnostic
supersedes: none
---

# 기존 프롬프트 고정·평가 축 범위 격리 진단

사용자가 두 기존 프롬프트 고정·전체 학생 응답 유지라는 수정 제안에 ‘오케이 진행시켜’로 시험을 요청했다. 명칭은 axis-context-isolation-v1이다.

- 도파민3응답·공손룡2응답×v1/기존후보×전체/단일축×3회,60호출로 한정한다.
- 입력의 centralAxes만 줄인다. 원문·학생 답 전체와 출력schema는 유지한다. 공손룡 G01/G02는 AX2 발화가 동일하다.
- 새로운 판정 규칙·인용 필드·질문·운영 전환은 하지 않는다.
- 에이전트가 로컬 비용 상한$1을 설정했다. 사용자 직접 지정 금액이라고 해석하지 않는다.

## 관측

60호출 완료, 추정$0.1405383. 계약60/60 유효·재시도0·질문0.
도파민 원래 응답의 과수용은 두 프롬프트 모두 전체3/3→단일1/3으로 감소하나 잔존했다. 공손룡 G01 후보 AX2는 전체S/O/P→단일P/P/P, v1은 두 범위 모두P/P/P였다. G02와 도파민 충분 답은 모든 조건P/P/P다.

이는 평가 범위 영향 및 후보의 축 간 간섭 가설을 지지하는 탐색적 신호다. 구체적 기제·일반화·완전 해결·운영 축별 호출 채택을 확정한 사용자 결정은 아니다. 운영은 유지한다.

근거: `docs/experiments/axis-context-isolation-v1-2026-09-20/PLAN.md`, `docs/experiments/axis-context-isolation-v1-2026-09-20/REPORT.md`, `docs/experiments/axis-context-isolation-v1-2026-09-20/summary.json`, `docs/experiments/axis-context-isolation-v1-2026-09-20/execution-audit.json`.
