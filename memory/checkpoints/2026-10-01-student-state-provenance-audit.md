# 학생 상태 기존 로그·출처 감사

기존 `.omc` 로그를 읽기 전용으로 감사했다.

- 문제 완료 기록 487개는 모두 `completed-problem-session-record-v1`이며 session ID도 487개로 중복되지 않았다.
- 문단 완료 기록은 1,178개다.
- 문제 기록 중 문단 handoff 요약이 있는 것은 37개다.
- 날짜·문항별 반복 분포상 실험·개발자·직접 사용 기록이 섞여 있으나 기존 계약에는 학생/개발자/실험 행위자 출처가 없다.

따라서 기존 전체 로그를 `local` 학생 프로필로 백필하지 않는다. 새 `student-evidence-v1`에는
`STUDENT`, `DEVELOPER`, `HISTORICAL_UNKNOWN` 맥락을 필수로 저장하고, 프로필 집계는 서로 다른
맥락의 혼합을 거부한다. 기본 조회는 `STUDENT`만, 개발자 조회의 `?context=developer`는
`DEVELOPER`만 반환한다. 실제 학생과 개발자 캘리브레이션의 상호 오염 방지 테스트를 추가했다.
