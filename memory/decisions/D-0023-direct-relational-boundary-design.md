---
id: D-0023
status: accepted
date: 2026-09-20
scope: paragraph-direct-relational-boundary-experiment
supersedes: none
---

# 직접 판정의 관계 누락 경계 실험 설계

사용자가 제시한 후속 설계와 ‘계속 진행’ 요청에 따라 실험 자료·후보·오프라인 검증을 준비한다. D-0022의 v1은 운영 승격하지 않고 비교 기준선으로 보존한다.

- 입력·모델·추론·tier·출력 스키마를 유지하고 관계 보충 금지와 부수적 수식 생략 허용의 지시 두 부분만 교체한다.
- 10쌍·20응답·각 버전3회, 예정120호출. 관계 누락 PASS와 충분 답 nonPASS를 각각 본다.
- 의미 분해·graph·required/optional·정확 인용·추가 판정 API·질문·UI·운영 V4 수정은 하지 않는다.
- 기대값은 실행 전 동결하며 계약 실패와 의미 실패를 구별한다. 결과를 보고 개별 사례 규칙을 덧붙이는 루프를 피한다.
- **새 유료 실행 및 제안한 로컬 $1 상한은 승인 대기**다. 과거 유료 승인을 새 실행에 재사용하지 않는다.

준비 결과: 신규12테스트 포함 문단 대화200테스트·build 통과. 원본 골드3개 및 관련30파일 해시 확인. 실모델 새 호출0이며 의미 개선 여부는 미확정이다. 기존 운영 정책을 대체하지 않는다.

근거: `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/PLAN.md`, `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/PREPARATION-REPORT.md`, `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/manifest.json`.

## 후속 승인과 완료

사용자가 준비 결과의120호출·로컬$1상한 제안에 ‘승인’으로 응답했다. 위 승인 대기는 준비 시점의 이력이며 현재 대기 상태가 아니다. 동결 자료는 수정하지 않고 별도 execution-manifest에 승인과 실행기 해시를 남겼다.

120호출 완료, 사용량 기반 추정$0.320198, 계약120/120 유효·재시도0·질문0. 누락 PASS5/30→3/30, 충분 전체 축 PASS30/30 유지, 누락 ERROR2→0. 그러나 도파민 원래 누락 PASS3/3은 그대로이며 공손룡 P04의 이미 설명한 논쟁 축을 전문성·대표성 누락으로 OK 처리한 후보2/3이 새로 관측됐다. 반복 전체 축 라벨 일치는18/20으로 동일했다.

에이전트 해석은 ‘부분 개선이 있으나 핵심 목표 미달·C 퇴행 신호’다. direct 계열 전체를 폐기하는 사용자 결정은 아니며, 운영 미승격·사례별 규칙 추가 및 대규모 자동 재시험 없음이라는 실험 범위를 유지한다.

근거: `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/REPORT.md`, `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/summary.json`, `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/execution-audit.json`.
