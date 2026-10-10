---
date: 2026-09-20
scope: direct-relational-boundary-live-comparison
base_commit: 58f9c93
---

# 관계 누락 대조 시험120호출 완료

## 이번 delta

- 사용자 승인 뒤 동결10쌍·20응답×2조건×3회를 실행했다. 로컬$1상한 안에서 추정$0.320198, 비용 미상0.
- 요청·API 원응답 전체·원라벨·집계·사례별 이유·실행 감사를 보존했다. 모든 요청이 동결 템플릿과 일치, 계약120/120 유효, 자동 재시도·질문 생성0.
- 누락 PASS5/30→3/30, 충분 답 전체 축 PASS30/30 유지, 누락 ERROR2→0. 다른 충분한 축 보류0→2.
- 도파민 원래 누락 답은 양쪽3/3 PASS로 핵심 실패 유지. 후보는 공손룡 P04의 이미 말한 논쟁 축을 전문성·대표성 누락 때문에2/3 OK로 남겼다. OK는 추가 질문 발생과 구별한다.
- 반복 라벨 일치18/20 동일, API 중앙값1.8775→2.069초. 작은 통제 세트에서의 관측이며 이전 실험 일치율과 직접 섞지 않는다.
- build·문단 대화200테스트 재검증 통과, 기존 골드·운영 V4·문제V3·UI 변경 없음.

## 해석·미해결

에이전트는 C 퇴행 신호를 포함한 개선 목표 미달로 해석했다. direct 계열 전체의 폐기 결정이나 구조화의 필요성을 확정한 결과는 아니다. 새로운 예외 규칙이나 전체 회귀를 자동 진행하지 않았다.

## 다음 행동

도파민 P01과 공손룡 P04의 원문·학생 응답·판정 이유를 사용자와 검토한다. Q-0020은 열린 상태다.

## 근거

- `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/REPORT.md`
- `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/REVIEW-PACKET.md`
- `docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20/execution-audit.json`
- `scripts/run-relational-boundary.mjs`
