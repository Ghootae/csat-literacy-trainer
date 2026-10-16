---
id: D-0129
status: accepted
date: 2026-10-14
scope: problem-evaluator-model-routing
supersedes: none
---

# Gemini 가격 재확인 뒤 판정기 luna·sol 구성 유지

## 결정

문제 풀이 판정기 모델은 [D-0104](./D-0104-problem-evaluator-model-routing-by-choice.md)의 선택 정오 라우팅을 그대로 쓴다(정답 luna, 오답 sol).
Gemini 4 출시를 계기로 Gemini를 다시 검토했으나 지금은 Gemini 3.8 Flash와 Gemini 4 Argon 모두 재시험하지 않는다.

## 근거

- 사용자 결정(2026-10-14): "그럼 지금 luna·sol 구성 유지하자." 앞서 사용자가 "인상 후를 감안하면 가격적 메릿은 크지 않겠군"이라고 판단했다.
- 2026-10-14 공식 가격표 확인(표준 등급, 100만 토큰당 달러, 출력에 생각 토큰 포함):
  - Gemini 3.8 Flash: 입력 0.75·출력 3.75(2026-12-31까지) → 1.50·7.50(2027-01-01부터). 출처: https://ai.google.dev/gemini-api/docs/pricing
  - Gemini 4 Argon: 2.00·10.00(2026-11-30까지) → 4.00·20.00(2026-12-01부터). 같은 출처. 가격표의 유일한 Gemini 4 모델이며 일반 API 공개 여부는 출처마다 엇갈려 확인하지 못했다.
  - gpt-6.1-sol: 2.00·10.00, 예정된 인상 없음(27.2만 토큰 초과 4.00·15.00). 출처: https://developers.openai.com/api/docs/pricing
- Gemini가 들어갈 수 있는 자리는 sol(오답 판정)뿐이다. luna는 다문항 시험 180칸 0.18달러로 어떤 Gemini보다 싸다([작업 기록](../checkpoints/2026-10-09-v5-multi-item-luna-sol.md)).
- Gemini 3.8 Flash는 공손룡 33칸에서 sol과 같은 32/33이었으나 0.55~0.77달러(칸당 약 0.017~0.023달러)였다([공급자 비교](../checkpoints/2026-10-08-v5-provider-compare-gongsun.md)). 인상 후 칸당 약 0.033~0.047달러로, 다문항 시험 sol 칸당 약 0.015달러(2.74/180)보다 비쌀 가능성이 크다. 두 시험은 문항이 달라 추정이다.
- Gemini 4 Argon은 출시가에서도 sol과 단가가 같고 인상 후 두 배다. 품질 시험은 하지 않았다.

## 폐기한 대안

- Gemini 3.8 Flash를 sol 대신 오답 판정에 쓰기: 정확도 동률, 인상 후 가격 이점 없음.
- Gemini 4 Argon 재시험: 가격 이점이 없고 품질상 필요가 확인되지 않았다.

## 재검토 조건

- sol이 반복해서 틀리는 오답 유형이 확인되어 품질 때문에 다른 모델이 필요할 때
- luna에 가까운 가격의 Gemini Flash급 신모델이 나오거나 Gemini·OpenAI 가격이 바뀔 때
