---
date: 2026-10-14
scope: problem-evaluator-model-routing
base_commit: a2bb3ae
---

# Gemini 4 출시 뒤 가격 재확인과 luna·sol 유지

## 새로 확인된 것

- 공식 가격표(2026-10-14): Gemini 3.8 Flash 0.75·3.75 → 2027-01-01부터 1.50·7.50, Gemini 4 Argon 2.00·10.00 → 2026-12-01부터 4.00·20.00, gpt-6.1-sol 2.00·10.00(인상 예정 없음). 단위는 100만 토큰당 달러(입력·출력).
- 가격표의 Gemini 4 모델은 Argon 하나뿐이고 Flash급은 없다. Argon의 일반 API 공개 여부는 출처마다 엇갈린다.

## 결정된 것

- 판정기 luna·sol 구성 유지, Gemini 재시험 안 함([D-0129](../decisions/D-0129-keep-luna-sol-over-gemini-after-price-check.md)).

## 변경한 것

- 결정 기록만 추가. 코드·실험 변경 없음, 모델 호출 0.

## 미해결

- 없음.

## 다음 행동

- 없음. D-0129 재검토 조건이 생기면 같은 공손룡 33칸 고정 세트로 비교한다.

## 근거

- 2026-10-14 사용자 대화, https://ai.google.dev/gemini-api/docs/pricing, https://developers.openai.com/api/docs/pricing
