---
date: 2026-10-27
scope: paragraph-analysis-ui
base_commit: 4b035cd
---

# 문단 분석 화면 1단계 구현

## 새로 확인된 것

- 화면 설계 확정([D-0183](../decisions/D-0183-paragraph-analysis-ui-tree-and-relation-graphs.md)): 왼쪽 지문 수형도(마지막 차례, 밝기 3단계, CROSS·TOP 계산값, 완료 테두리), 오른쪽 관계 유형 그래프(첫 차례, 갈래 막대 개수·18유형 펼침·오류율 추이·틀린 관계 목록).
- 1단계 구현([인계](../../docs/handoffs/2026-10-27-paragraph-analysis-view-stage1.md)): 개발자 주소 `/dialogue/lab/analysis`, API `GET /api/developer/dialogue-analysis/view`(개발자 모드+loopback). 자료는 `scripts/build-analysis-view.mjs`가 만든 `docs/experiments/analysis-view-2026-10-27/view-data.json`. 외부 전송 없음.
- 실제 자료: 지문 6(판정 있는 지문은 공손룡·도파민), 세션 53(공손룡 31·도파민 22), 다섯 문단을 모두 마친 세션은 공손룡 2·도파민 0. 그래프 숫자는 53세션 모두 `docs/experiments/student-fingerprint-2026-10-21/by-session/fingerprint.json`과 일치.
- 테스트: 새 scripts 9건 통과, 기존 scripts 포함 83건 통과, vitest 새 10건 통과, typecheck 통과. `npm test` 1437 통과·2 실패. 실패 2건(`boundary.test.ts`의 `server/student-state.ts` `node:fs`, `axis-architecture-experiment.test.ts`의 `.omc/adhoc` 파일 없음)은 이번 변경과 무관하게 이미 있던 실패다.
- 파일 읽기는 `server/analysis-view.ts`로 분리하고 `boundary.test.ts`의 리포지토리 허용 목록에 넣었다.
- 캡처: `docs/experiments/analysis-view-2026-10-27/*.png`. 완료 세션도 관계 칸이 대부분 "아직 적음"이다(표본 부족, D-0160 예상대로).

## 미해결

- 기존 자료는 세션마다 지문 하나라 추이 그래프 점이 항상 하나다.
- 사용자 직접 화면 확인 전이다.

## 다음 행동

- 사용자가 화면을 보고 가독성·보상 효과를 판단한다. 그 뒤 2단계(요약 완료 직후 판정, 시간·비용 측정 승인) 설계.
