# 체크포인트: v5.8 결론 재계산 실험과 서버 올리기 금지 (2026-10-29)

- 인계 4번(결론 재계산·정의 한 단계 적용)을 실행했다. 설계 초안 `docs/review/conclusion-recompute-v58-draft-2026-10-29.md`, 실험 `docs/experiments/v58-conclusion-2026-10-29/`(보고 측정 1~7), 비용 약 $1.96.
- 결과: ground 넓힘·holds 논리화로 같은 글의 결과 갈림은 사라졌으나, 정의 한 번 적용 규칙은 19번 ⑤에 효과 없음(원문 정의가 "극성 또는 전하"). sol 재판정 4/10. 사용자 (ㄱ) 선택: 연결 부족 수용.
- ground "첫 단계까지" 수정은 prob-11식 서버 뒤집기를 1/3 재발시켜 미채택(`-v5.8-draft2.md`). 대신 서버가 판정기 INSUFFICIENT를 SUPPORTED로 올리지 않게 코드 변경([D-0189](../decisions/D-0189-server-never-raises-insufficient.md)). 이 코드 변경은 현재 기본 지시문 v5.7-2에도 적용된다.
- JEV 근거 충분성 탐색(D-0036 보류 중 예외): [Q-0040](../OPEN_QUESTIONS.md)에 보류로 기록.
- 사용자 결정으로 v5.8을 제품 기본값으로 전환([D-0190](../decisions/D-0190-problem-feedback-v58-default.md)). 남은 일: 개발자 서버 재빌드·화면 확인.
