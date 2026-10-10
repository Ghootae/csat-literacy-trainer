# V4-light 최소 출력 자연 응답 대조 완료

- 명시 승인 범위대로 실제 사용자 자연 응답45시점을 현재 V4와 V4-light에 각1회 전송했다.
- gpt-5.6-terra / medium / default / store:false, 질문 생성·재시도0, 총90호출, 추정 비용 USD1.275944다.
- V4-light는 API 중앙값8.658→3.157초, 비용1.009642→0.266302달러, 입력 토큰69.6%·출력 토큰78.3% 감소했다.
- 축 상태는30/45시점에서 모두 일치했고15시점·16축에서 달랐다. 전이는 OK→PASS9축, OK→SERIOUS7축이다.
- 문단 질문 후보는 V44건, light9건이다. V4 비질문→light 질문5건, 반대0건이다.
- V4 원출력2건은 claimLedger가 질문을 학생 근거로 인용해 계약 실패했다. light는45/45 계약 유효다. raw 축 판정은 비교용으로만 보존했다.
- 사전 진입 조건 미달로 오류·철회·부분 수정·새 질문의 2단계 유료 시험은 실행하지 않았다.
- 운영 V4·UI·공개 서버는 변경하지 않았다.

근거: `docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md`, `REVIEW-PACKET.md`, `summary.json`, `execution-audit.json`, 원요청·원응답 JSONL.
