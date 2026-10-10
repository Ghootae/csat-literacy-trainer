---
date: 2026-10-02
scope: gongsun-marker-input-ab-preparation
base_commit: uncommitted
---

# 공손룡 기호 보완 후 재검증 준비·전송 승인 대기

사용자는 공손룡12의 기호 범위 수정 후 판정 문제가 해결되는지 테스트하도록 요청했다.
`scripts/test-gongsun-marker-input-ab.mjs`와
`docs/experiments/gongsun-marker-input-ab-2026-10-02/`에 입력·기대값·해시를 고정했다.
기존 시험 입력과 산출물, 제품 코드·UI·서버는 변경하지 않았다.

- 두 조건 모두 승인 후보 해시 `98d36119a84d612fbb0b1a20553a49df2170633e1a78470f632b0b24ee7ec2b2`,
  gpt-5.6-terra/medium과 같은 런타임을 사용한다.
- baseline은 이전 시험 원자료, candidate는 ⓒ 위치 정정과6범위 주석·필드 설명 추가 입력이다.
  baseline이 기존 v4 프롬프트라는 뜻은 아니다. 위치/범위 보완의 개별 효과는 분리하지 않는다.
- G-actual 실제 응답·G-error 대상 역전 응답 각 조건별3회, G-unknown 조건별1회:14최초 평가.
  수정 입력 G-error 첫 반복이 교정에 진입하면 기존 G-repair 답변1경로도 확인한다.
- 기존 사전 기대값을 유지한다. 독립 사람 평가 정확도가 아니다.
  재시도·보조 확인 포함 최대24요청·과거 단가 기준 추정2달러 상한이다.

prepare는 성공했으나 실제 호출은 자동 보안 검토에서 거부됐다. 이전 D-0074 승인은 완료된
시험에 한정되므로 새 전송의 명시적 승인이 필요하다는 사유다. 우회하지 않았고 API 요청0이다.
공손룡 원문·문항·선지·정답·해설·기호 범위와 실제/가상 응답을 api.openai.com으로 보내는
이번 비교의 별도 승인 대기다. 판정 문제 해결 여부는 미확인이다.

근거: 위 스크립트와 동결 디렉터리의 `FROZEN.json`, `cases.json`, `sources.json`,
`RESULTS.json`, 이 턴의 실행 보안 거부 결과.
