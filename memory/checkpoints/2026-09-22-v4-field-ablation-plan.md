# V4 기록 필드 단계적 제거 1차 계획

- 목적은 V4 판정 결과를 보존하면서 필요 없는 기록 필드를 묶음별로 제거해 비용·지연을 줄이는 것이다.
- 1차 표적은 사람 승인된 V4-light 불일치15건이다.
- 첫 제거 묶음은 `centralObjectRepresentation`과 `centralStoryRepresentation`이다.
- 판정·질문·UI에 연결된 나머지 필드와 V4 지시는 유지한다.
- 사용자 결정으로 현재 V4와 후보를 사례·조건당1회 쌍 비교한다. 규모는15사례×2조건=30호출이다.
- 사용자는 일괄 실행을 승인했다. 같은 사용자 자료 부분집합을 OpenAI gpt-5.6-terra에 store:false로 전송하며 로컬 추정 상한은 USD1, 재시도·질문 생성0이다.
- 운영 코드·UI·서버 변경 없음.

근거: `docs/experiments/v4-output-field-ablation-v1-2026-09-22/PLAN.md`, `memory/decisions/D-0028-v4-output-optimization-human-policy.md`.
