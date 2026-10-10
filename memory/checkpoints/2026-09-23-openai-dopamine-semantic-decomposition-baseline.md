# OpenAI 도파민 AX1 의미 요소 분해 기준선

- 사용자 승인으로 원문+승인 AX1만 OpenAI API에 보내고 동결 기대는 숨긴 채3회 분해했다.
- `gpt-5.6-terra`, medium, Structured Outputs, 재시도0. 세 출력 모두 schema·원문 인용 검증을
  통과했고 요소 수는3·2·2, 총 추정 비용은$0.0417138이었다.
- C1 외부 도파민 limitation과 C2 내부 합성 도파민 function은 core claim으로3/3 일치했다.
- C3 contrast는0/3 정확 일치했다. 한 번은 배타 한정 관계를 `other`·`explicit_required`로 만들고
  두 번은 별도 관계 요소를 생성하지 않았다.
- O1 BBB optional cause는0/3 별도 생성됐다. 두 번은 생략됐고 한 번은 C1 core에 흡수됐다.
- 현재 프롬프트의 자동 파생 자산 생성은 미승격이다. claim/relation 계층 강제와 optional 지원
  관계의 별도 탐색이 후속 후보이며 JEV Playground 평가는 아직 실행하지 않았다.
- 근거: `docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/OPENAI-DECOMPOSITION-REPORT.md`.
