# 모든 문단 판정에서 학생의 진행 선택 허용

## 이번 delta

- 사용자 명시 결정으로 UNCLEAR-SERIOUS와 ERROR도 질문에 응답하지 않고 다음 문단으로
  진행할 수 있도록 설계를 변경했다. 기존 검토안의 필수 수정 구상은 철회한다.
- `memory/decisions/D-0011-paragraph-student-controlled-progression.md`에 결정과
  미구현 상태를 기록했다. 판정과 진행을 구분하며 건너뛰기를 PASS로 취급하지 않는다.
- 근거: `docs/review/paragraph-optional-revision-proposal-2026-09-19.md`의 후속 사용자 결정.
- 코드·프롬프트·UI·서버·문제 풀이 정책은 변경하지 않았다. 유료 API 호출 없음.
