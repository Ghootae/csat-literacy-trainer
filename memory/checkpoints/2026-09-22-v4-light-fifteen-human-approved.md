# V4-light 불일치15건의 V4 표시 결과 사람 승인

- 사용자는 이전의 ‘7건 묶음에서 V4 선호’라는 설명을 정정했다.
- 실제 승인 범위는 `docs/experiments/v4-light-output-v1-2026-09-22/REVIEW-PACKET.md`에 실린 불일치15건 각각의 V4 표시 결과다.
- V4 effectiveResponse, 축별 상태·이유, 질문 후보 여부를 사례별 사람 기준으로 동결했다.
- 기계 판독 정답표: `docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.json`
- 사람 검토 설명: `docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.md`
- 승인 근거는 작성 요약이 실제 이해에서 한 번 더 압축·필터링될 수 있어 표면 누락만으로 질문하면 과개입이 된다는 점이다.
- 숨은 claimLedger/errorClaims와 계약 유효성은 승인 범위가 아니다. N03의 표시 판정 승인과 claimLedger 계약 실패를 함께 보존한다.
- 새 API 호출·운영 변경은 없다.

