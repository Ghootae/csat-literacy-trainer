# 모델 x 해설 실험 요약

## 판정 집계 (r1·r2·r3, 기대 판정 일치)

| 사례 | 기대 | L-now | L-lab | L-none | S-now | S-lab | 참고(원래 1회) |
|---|---|---|---|---|---|---|---|
| A-cog14 | SUPPORTED | INSUFFICIENT / EVALUATION_ERROR / INSUFFICIENT (0/3) | UNKNOWN / ERROR / INSUFFICIENT (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT |
| A-horse6 | SUPPORTED | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | SUPPORTED / SUPPORTED / INSUFFICIENT (2/3, 풀림) | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | INSUFFICIENT |
| A-plas10 | SUPPORTED | INSUFFICIENT / INSUFFICIENT / SUPPORTED (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / EVALUATION_ERROR / EVALUATION_ERROR (0/3) | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | SUPPORTED / INSUFFICIENT / INSUFFICIENT (1/3) | INSUFFICIENT |
| A-aud16 | SUPPORTED | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | INSUFFICIENT |
| A-cog16 | SUPPORTED | ERROR / INSUFFICIENT / INSUFFICIENT (0/3) | INSUFFICIENT / ERROR / ERROR (0/3) | ERROR / ERROR / INSUFFICIENT (0/3) | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | ERROR |
| A-horse5 | ERROR | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR |
| A-aud17 | ERROR | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR / ERROR / ERROR (3/3, 풀림) | ERROR |
| B-cog14 | SUPPORTED | INSUFFICIENT / ERROR / ERROR (0/3) | - | - | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | - |  |
| B-horse6 | SUPPORTED | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | - | - | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (0/3) | - |  |
| B-plas10 | SUPPORTED | SUPPORTED / SUPPORTED / SUPPORTED (3/3, 풀림) | - | - | SUPPORTED / INSUFFICIENT / SUPPORTED (2/3, 풀림) | - |  |
| C1-cog14 | INSUFFICIENT | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) |  |
| C1-plas10 | INSUFFICIENT | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT (3/3, 풀림) |  |
| C2-aud16 | INSUFFICIENT | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) |  |
| C2-horse6 | INSUFFICIENT | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) | UNKNOWN / UNKNOWN / UNKNOWN (0/3) |  |

## 조건별 풀림

| 조건 | 기준 사례 4건 중 풀림 | C 반례 중 2회 이상 SUPPORTED |
|---|---|---|
| L-now | 0/4 | 0 () |
| L-lab | 0/4 | 0 () |
| L-none | 0/4 | 0 () |
| S-now | 2/4 | 0 () |
| S-lab | 1/4 | 0 () |

## 오류 질문 (사례 x 조건 x 반복)

- A-aud17 / L-lab / r1
  - 표에서 C와 D의 소리 크기와 차폐 문턱값 사이의 차이는 각각 얼마야?
- A-aud17 / L-lab / r2
  - 표에서 C와 D의 소리 크기와 차폐 문턱값을 확인해 각각의 차이를 계산하면 어떻게 돼?
- A-aud17 / L-lab / r3
  - 표에서 C와 D의 소리 크기와 차폐 문턱값의 차이를 각각 계산하면 어떻게 돼?
- A-aud17 / L-none / r1
  - 표에서 C와 D의 소리 크기와 차폐 문턱값 사이의 차이를 각각 비교하면, 두 차이의 크기는 어떻게 돼?
- A-aud17 / L-none / r2
  - 표에서 C와 D의 소리 크기와 차폐 문턱값의 차이를 각각 계산하면, 어느 쪽의 차이가 더 커?
- A-aud17 / L-none / r3
  - 표에서 C와 D의 소리 크기와 차폐 문턱값의 차이를 각각 계산하면 어느 쪽 차이가 더 커?
- A-aud17 / L-now / r1
  - 표에서 C와 D의 소리 크기와 차폐 문턱값을 각각 비교하면, 두 차이는 어떻게 돼?
- A-aud17 / L-now / r2
  - 표의 C와 D에서 각각 소리 크기와 차폐 문턱값 사이의 차이는 얼마야?
- A-aud17 / L-now / r3
  - 표의 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 쪽은 어디야?
- A-aud17 / S-lab / r1
  - "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했는데, 표시한 표에서 C와 D의 소리 크기에서 차폐 문턱값을 각각 빼면 얼마야?
- A-aud17 / S-lab / r2
  - "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D의 소리 크기에서 각각 차폐 문턱값을 빼면, 어느 소리의 차이가 얼마나 더 커?
- A-aud17 / S-lab / r3
  - "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D의 소리 크기에서 각각 차폐 문턱값을 빼면 어느 쪽 차이가 얼마나 더 커?
- A-aud17 / S-now / r1
  - "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 차폐 문턱값을 각각 빼면, 어느 쪽 차이가 얼마나 더 커?
- A-aud17 / S-now / r2
  - "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 각각 차폐 문턱값을 빼면 얼마야?
- A-aud17 / S-now / r3
  - 표에서 C와 D의 소리 크기에서 차폐 문턱값을 뺀 값은 각각 얼마야?
- A-cog14 / L-lab / r2
  - “인지 후”라고 썼는데, (나)에서 지각이 일어난 이후 비로소 무엇이 확정된다고 했어?
- A-cog16 / L-lab / r2
  - 표시한 부분에서 파생적 상태는 주체의 해석에 의존해 어떤 방식으로 의미를 나타내는 상태야?
- A-cog16 / L-lab / r3
  - ‘의미로 전환되는 상태’라고 했는데, 표시한 부분에서 파생적 상태는 의미를 어떻게 나타내?
- A-cog16 / L-none / r1
  - 표시한 부분에서 파생적 상태는 무엇에 의존해서 의미를 나타내?
- A-cog16 / L-none / r2
  - 표시한 부분에서 파생적 상태는 의미를 어떻게 나타내?
- A-cog16 / L-now / r1
  - “파생적 상태는 해석에 의존해 의미로 전환되는 상태”라고 했는데, 표시한 부분에서 파생적 상태는 어떤 상태라고 정의돼 있어?
- A-horse5 / L-lab / r1
  - 표시한 부분에서 헌법재판소는 무엇이 국민의 알 권리와 언론의 자유를 침해하는지 판단했어?
- A-horse5 / L-lab / r2
  - 표시한 부분에서 헌법재판소는 여론조사 결과 보도 규정과 언론의 자유에 대해 무엇을 판단했어?
- A-horse5 / L-lab / r3
  - 표시한 부분에서 헌법재판소가 판단한 규정의 문제에는 언론의 자유가 어떻게 언급돼?
- A-horse5 / L-none / r1
  - “헌법제판소 논의는 언론의 자유와는 상관이 없음.”이라고 했지. 표시한 부분에서 헌법재판소가 다룬 쟁점은 무엇이었어?
- A-horse5 / L-none / r2
  - 표시한 부분에서 헌법재판소가 합헌 결정을 내린 쟁점은 무엇이었어?
- A-horse5 / L-none / r3
  - 표시한 부분에서 규정이 국민의 알 권리와 언론의 자유를 침해하는지에 대해 헌법재판소가 무엇을 했어?
- A-horse5 / L-now / r1
  - 표시한 부분에서 헌법재판소가 다룬 쟁점은 무엇이었어?
- A-horse5 / L-now / r2
  - 표시한 부분에서 헌법재판소가 판단한 쟁점에 언론의 자유가 어떻게 언급됐는지 말해 봐.
- A-horse5 / L-now / r3
  - 네가 말한 “언론의 자유와는 상관이 없음”과 달리, 표시한 부분에서 헌법재판소가 판단한 쟁점은 무엇이야?
- A-horse5 / S-lab / r1
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 판단했어?
- A-horse5 / S-lab / r2
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 어떤 권리들을 침해하는지 판단했어?
- A-horse5 / S-lab / r3
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 판단했어?
- A-horse5 / S-now / r1
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어?
- A-horse5 / S-now / r2
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어?
- A-horse5 / S-now / r3
  - "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했는데, 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어?
- B-cog14 / L-now / r2
  - 표시한 부분에서 주체와 대상은 무엇이 일어난 뒤에 비로소 확정된다고 했어?
- B-cog14 / L-now / r3
  - 표시한 (나)에서 주체와 대상은 무엇이 일어난 이후에 비로소 확정된다고 했어?

## 비용

- 칸 183, 실패 3, 합계 USD 4.4142
- 조건 L-lab: USD 0.1343
- 조건 L-none: USD 0.1556
- 조건 L-now: USD 0.1787
- 조건 S-lab: USD 1.7409
- 조건 S-now: USD 2.2046
- 모델 gpt-6-luna: USD 0.4687
- 모델 gpt-6.1-sol: USD 3.9455
