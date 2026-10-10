# 학생 상태 모델 V1 코어 1단계

학생 상태 모델의 첫 코드 계약을 구현했다.

- `packages/pipeline/src/student-state/model.ts`: 문단 handoff와 완료 문제 세션을 공통 증거 이벤트로 변환하고, 학생별 프로필과 정기 피드백을 결정론적으로 생성한다.
- 차원은 독립 핵심 이해, 근거 기반 문제 해결, 교정·회복, 자기 점검 네 가지다.
- 부분 이해·미평가·미제출은 부정이 아닌 불확정으로 보존한다.
- 도움 수준과 성공 여부, 원 콘텐츠·평가기 버전, 확신도 원값을 분리한다.
- 중복 event ID의 동일 증거는 한 번만 집계하고 충돌 증거는 실패시킨다.
- `docs/STUDENT-STATE-MODEL-V1.md`에 불변식·신뢰도·피드백 휴리스틱·금지 해석을 기록했다.

검증:

- 신규 단위 테스트 3/3 통과
- 전체 TypeScript typecheck와 클라이언트 typecheck 통과
- 전체 Vitest 921개 중 920개 통과. 실패 1개는 `.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/hegel-aesthetics-absolute-spirit-p1.json` 부재로 인한 기존 환경 의존 실패이며 새 학생 상태 코드와 무관하다.

아직 완료되지 않은 범위는 실제 앱 세션의 증거 영속화, 프로필 조회 API, 개발자 리포트 UI,
실제 로그 감사와 학생용 피드백 승인이다.
