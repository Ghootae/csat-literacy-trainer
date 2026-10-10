# 반사실적 축 맥락 대조 완료

- 날짜:2026-09-21 KST. 기준 커밋:`58f9c93`. 기존 dirty worktree 유지.
- 사용자 일괄 승인에 따라 direct-v1 고정·5문단·target 충분/불충분·비대상3맥락·전체/단일·3회=180호출 완료.
- 추정$0.4884107, 계약180/180·전송 실패0·재시도0·질문0.
- 충분target PASS는 두 범위45/45. 관계 누락 PASS는 전체3/45→단일0/45이며 도파민+A맥락에만 발생했다. 공손룡의 충분 축 보류는 이번 v1 비교에서0이다.
- 반복 대상 라벨은 두 범위 모두30/30응답에서3회 일치. 맥락별 차이와 동일 입력 반복 안정성을 구분했다.
- 사전 조건인 맥락 범위 감소2문단에 미달(1문단)하여 병렬 문단 성능96호출은 SKIPPED_GATE_NOT_MET. 비용·지연을 실제 측정한 것처럼 기록하지 않는다.
- 도파민 축 간 공유 의미가 있어 A/B/C의 차이를 순수한 무관 맥락 간섭으로 단정하지 않는다. 같은 A전체 응답에서 축 목록만 바뀐 대조는 범위 영향 신호다.
- 신규 실행기·동결 fixture·Node 테스트11개 추가.11/11·기존 문단 대화208/208·build 및61파일 보호 감사 통과.
- 운영 V4/문제V3·골드·프롬프트·UI·서비스는 미변경. 다음 행동은 원판정 검토와 후속 범위 판단이며 자동 유료 재시험 없음.

출처: `docs/experiments/axis-counterfactual-context-v1-2026-09-21/REPORT.md`, `docs/experiments/axis-counterfactual-context-v1-2026-09-21/REVIEW-PACKET.md`, `docs/experiments/axis-counterfactual-context-v1-2026-09-21/execution-audit.json`, `memory/decisions/D-0025-counterfactual-context-and-conditional-benchmark.md`.
