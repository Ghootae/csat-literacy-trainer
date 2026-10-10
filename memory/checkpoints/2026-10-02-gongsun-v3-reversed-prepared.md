---
date: 2026-10-02
scope: original-v3-gongsun-reversed-response-test
base_commit: uncommitted
---

# 원래 v3의 공손룡 역전 응답 검증 준비

사용자는 이전 버전을 운영 규칙 변경 전 v3로, 입력을 d=빨간 옷/e=일반적인 옷이라고
뒤집은 G-error 응답으로 명확히 지정했다. 기호 보완 A/B와 같은 수정된 원자료를 유지한다.
`scripts/test-gongsun-v3-reversed-response.mjs`와
`docs/experiments/gongsun-v3-reversed-response-2026-10-02/`의 FROZEN.json/source.json/input-example.json을 준비했다.

- 원본 v3 파일 해시 `3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff`
  일치를 확인했다. 후보를 v3라고 부르거나 v4 출력 계약에 v3 지시를 끼워 넣지 않는다.
- 원래 v3 evaluator·schema·정답 근거 평가→CLEAR_ERROR이면 별도 교정 질문 생성 구조를 쓴다.
- 같은 gpt-5.6-terra/medium, 총3반복·최대6요청·재시도0·과거 단가 추정1달러 상한.
  의미 설명의 d/e 대응과 오류 지적을 검토하며, 분기 필드만으로 성공이라 하지 않는다.
- 입력 기호 범위 보완은 유지하지만 v3/v4의 출력 계약·호출 구조는 다르다.
  프롬프트 문구 하나의 인과 효과를 분리하는 시험은 아니다.

prepare 성공. 실제 실행은 자동 보안 검토에서 별도 v3 외부 전송 명시 승인 부족으로 거부됐다.
우회하지 않았으며 API 요청0, 결과 없음. 공손룡 원문·문항·해설·수정 기호 범위·가상 응답을
api.openai.com에 보내는 최대6요청 시험의 승인을 사용자에게 요청한다.
제품·프롬프트·서버는 변경하지 않았다.

근거: 위 실행 스크립트·동결 파일, 사용자 대상 명료화 답변, 이 턴의 도구 보안 거부 결과.
