# 자연 응답 V4/direct-v1 비교 완료

- 준비 작업 이후 사용자가 특정 자연 응답의 OpenAI API 전송을 명시적으로 승인했다. 기존 동결45시점×2조건90호출을 그대로 실행했다. 최초31/후속14, 개인 사용자1명·31세션·고유30문단.
- 90/90계약유효, 추정$0.7349302, 재시도0·질문생성0·검증기 라벨변경0. 운영V4/문제V3/골드/UI 변경 없음.
- 14시점17축에서 불일치, 문단 질문 후보는 V4 4→direct11. 변화7시점 모두 direct에서 질문 후보 추가. 전축PASS29→33과 질문 증가가 동시에 나타나므로 단순한 관대화/과개입 감소로 설명하지 않는다.
- API 응답시간 중앙값7.547→1.962초. 출력·기록 의무가 다른 판정 호출의 시간이며 운영 전체 사이클 비교가 아니다.
- 불일치14+최초/후속 일치각3=20건을 블라인드/판정비교 문서로 분리했다. human-review.json 미입력, 다음 단계는 사람 검토. 정확도/학습효과/과개입 개선 미확정.
- 법인2문단의 ERROR 경계1시점은 같은 오류의 축 귀속 차이. 최근 공손룡1문단 후속 답의 양쪽PASS는 이전 상태null 조건이므로 기존 운영 전이 문제 해결을 의미하지 않는다.
- 실행 감사, 원로그31행 해시/내용 및90개 요청 입력 경계 검증 통과. 신규Node5/5·기존관련Vitest34/34 재확인. 프로젝트 메모리 검증 시행.

근거: `docs/experiments/natural-response-disagreement-v1-2026-09-21/AUTHORIZATION.md`, `REPORT.md`, `summary.json`, `execution-audit.json`, `descriptive-analysis.json`, `review-key.json`(같은 디렉터리). 결정 [D-0026](../decisions/D-0026-natural-response-disagreement-mining.md). 보고 생성기 `scripts/summarize-natural-response-disagreement.mjs`; 동결 실행기는 수정하지 않았다.
