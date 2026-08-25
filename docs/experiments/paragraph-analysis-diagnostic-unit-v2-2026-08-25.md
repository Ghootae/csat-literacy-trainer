# 문단 분석 v2 진단 단위 실험 — 2026-08-25

## 목적

기존 `paragraph-analysis-prompt-v1`의 core 관계 원자성 규칙을 다음 진단 행동
단위로 바꾼 별도 프롬프트를 시험했다.

> 한 관계 = 한 상태·한 오류·한 질문

관계 수를 목표로 줄이는 실험이 아니다. 학생 응답에서 하나의 관계 상태를 안정적으로
부여하고, 하나의 오류로 지적하고, 비유도적 질문 하나로 확인할 수 있는지를 기준으로
core 관계를 병합하거나 분리한다.

기존 v1은 기본값으로 유지했으며 추적 골드를 변경하지 않았다.

## 설정

- 문단 분석: OpenAI `gpt-5.6-sol`, effort `medium`
- 문단 분석 프롬프트: `paragraph-analysis-prompt-v2`
- 최종 프롬프트 해시:
  `sha256:78e304c2f9d91b0a525526d7cd5db6d78786106aba1018dade82808f9d36a760`
- 학생 응답 평가: OpenAI `gpt-5.6-terra`, effort `medium`
- 평가 프롬프트: `dialogue-prompt-v6`
- 각 학생 응답은 재시도 없이 한 번만 호출했다.

## 프롬프트 변경

core 후보마다 다음 검사를 적용했다.

1. 관계 전체에 `explicit`, `entailed`, `contradicted`, `unknown` 중 상태 하나를
   모순 없이 부여할 수 있는가?
2. 다른 올바른 내용을 함께 오류로 묶지 않고 오류 하나로 지적할 수 있는가?
3. 정답을 노출하지 않는 짧은 질문 하나로 확인하거나 수정하게 할 수 있는가?
4. core 관계 집합이 중심 이야기의 독립적인 의미 가지를 빠짐없이 보존하는가?

네 번째 검사는 1차 실행에서 표면 장력 문단의 압력 차·공기 이동 가지가 supporting으로
내려가 부분 이해 응답이 PASS가 된 뒤 추가했다.

## core 관계 수

| 문단 | v1 자동 분석 | 사람 정제 | v2 최종 |
| --- | ---: | ---: | ---: |
| `corporate-law-p2` | 9 | 3 | 8 |
| `surface-tension-laplace-p2` | 5 | 3 | 4 |
| `information-asymmetry-free-marketplace-p2` | 6 | 4 | 6 |

v2는 사람 정제 수에 맞추지 않았다. 법인 문단의 수익 허용·목적·범위와 정보 비대칭
문단의 정보 제공자·플랫폼 사업자는 서로 다른 상태와 오류를 가질 수 있어 독립 관계로
남았다.

## 판정 회귀

기존 교차 문단 검증의 정확·부분 이해·모호·명시적 오류·복수 오류 15건을 v2 골드와
현재 판정기 v6으로 재실행했다.

| 문단 | 기대 판정 일치 |
| --- | ---: |
| `corporate-law-p2` | 5/5 |
| `surface-tension-laplace-p2` | 5/5 |
| `information-asymmetry-free-marketplace-p2` | 5/5 |
| 합계 | 15/15 |

계약 오류는 없었다. 비통과 12건은 모두 상태에 맞는 target과 질문 유형을 반환했다.

## 사람 검토

- 상태·오류·질문 단위 원칙은 과도한 문장 단위 분해를 줄이는 방향으로 작동했다.
- 중심 이야기 보존 검사가 없으면 독립적인 인과 가지가 supporting으로 내려갈 수 있다.
- 관계 개수는 품질 지표가 아니며, v2가 사람 정제본보다 많은 관계를 유지한 것은 원칙상
  허용된다.
- `information-asymmetry-free-marketplace-p2`의 “정부 개입을 두고 주장이 엇갈린다”는
  관계는 질문 하나로 확인할 실질 내용이 부족하다. 담화적 종합 문장을 core로 둘지
  supporting으로 내릴지 추가 규칙이 필요하다.

## 결론

v2는 판정 회귀 15/15를 통과했지만 바로 기본 프롬프트로 승격하지 않는다. 다음 수정은
관계 수가 아니라, 학생이 원문에서 실질적인 관계·방향을 답할 수 없는 담화적 요약 관계를
core에서 제외하는 규칙으로 한정한다.

## diagnosticRole 후속 수정

목록형 문단에서 core 관계의 단순 누락까지 모두 질문 대상으로 삼는 문제를 줄이기 위해
v2에 다음 두 역할을 추가했다.

- `required`: 미언급 unknown이 실제 UNCLEAR와 진단 질문의 근거가 되는 관계
- `error_only`: 미언급 unknown은 PASS를 막지 않지만 명시적 모순은 ERROR가 되는 관계

후속 판정 실험에는 이 계약만 적용하는 `dialogue-prompt-v7`을 별도로 사용했고, 기존
v1 분석과 v6 판정기는 기본값으로 유지했다.

새 분석에서 만들어진 core 관계는 총 12개였다.

| 문단 | required | error_only | 합계 |
| --- | ---: | ---: | ---: |
| `corporate-law-p2` | 3 | 2 | 5 |
| `surface-tension-laplace-p2` | 2 | 1 | 3 |
| `information-asymmetry-free-marketplace-p2` | 2 | 2 | 4 |
| 합계 | 7 | 5 | 12 |

기존 15건을 새 골드와 v7로 재실행한 결과는 15/15였고 계약 오류는 없었다. 여기에 각
문단별로 `error_only` 관계를 생략한 응답과 같은 관계를 명시적으로 뒤집은 응답을 하나씩
추가했다. 생략 3건은 모두 PASS, 명시 오류 3건은 모두 ERROR였으므로 전체 결과는
21/21, 계약 오류 0건이었다.

비통과 15건의 질문을 사람이 검토한 결과, 모두 target 관계 하나만 다뤘고 질문 자체가
올바른 관계나 방향을 직접 알려 주는 사례는 없었다. 이번 결과는 역할 계약이 의도대로
작동하는 회귀 증거이며 일반적 정확도 검증으로 해석하지 않는다.

## 산출물

- v2 프롬프트:
  `packages/pipeline/experiments/dialogue/paragraph-analysis-prompt-v2.md`
- v2 최종 원시 분석(ignored):
  `.omc/adhoc/paragraph-analysis-diagnostic-unit-v2-iteration2-2026-08-25/`
- v2 판정 회귀(ignored):
  `.omc/adhoc/dialogue-diagnostic-unit-v2-iteration2-2026-08-25/results.json`
- diagnosticRole 원시 분석(ignored):
  `.omc/adhoc/paragraph-analysis-diagnostic-roles-v2-2026-08-25/`
- v7 판정 및 누락·모순 대조 실험(ignored):
  `.omc/adhoc/dialogue-diagnostic-roles-v2-v7-2026-08-25/results.json`
