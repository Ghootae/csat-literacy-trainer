# V4 출력 최적화의 사람 기준 확정

- 사용자는 자연 응답 경계7건 직접 검토 뒤 실제 운영에는 V4가 더 적합하다고 판단했다.
- 근거는 작성 요약이 학생의 실제 이해에서 한 번 더 압축·필터링된 표현일 수 있다는 점이다.
- V4를 기준선으로 유지하고 기록 필드를 묶음별로 제거한다.
- 다음 후보는 effectiveResponse와 축별 짧은 판정 발판을 유지하며 questionFocus/errorEvidence를 필요한 상태에서만 조건부 출력한다.
- 질문 적절성·과개입·중요 공백 미탐지·명시적 오류 보존을 정확한 상태 일치보다 우선한다.
- 새 프롬프트 구현·API 호출·운영 변경은 아직 하지 않았다.

근거: `docs/review/v4-output-optimization-human-policy-2026-09-22.md`, `memory/decisions/D-0028-v4-output-optimization-human-policy.md`.

