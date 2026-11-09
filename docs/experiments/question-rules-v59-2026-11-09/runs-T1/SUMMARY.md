# 요약: v59-t1 (v5.9 T1 질문이 나아지는가)

평가 실패 칸 1개 · 칸 36개 · 실측 비용 $1.245

## 사례별 최종 판정 (r1 / r2 / r3)

| 사례 | 기대 | v5.9-luna | v5.9-sol | v5.8-luna | v5.8-sol | 판정기 원판정(주 조건) | 형태 ground.kind | 서버 올림 |
|---|---|---|---|---|---|---|---|---|
| A-aud17 | - | 오류 / 평가 실패 / 오류 | 오류 / 오류 / 오류 | 오류 / 오류 / 오류 | 오류 / 오류 / 오류 | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| A-cog16 | - | 부족 / 오류 / 부족 | 충분 / 충분 / 충분 | 오류 / 부족 / 부족 | 충분 / 충분 / 충분 | INSUFFICIENT / ERROR / SUPPORTED | FACT / FACT / FACT | 0/3 |
| A-horse5 | - | 오류 / 오류 / 오류 | 오류 / 오류 / 오류 | 오류 / 오류 / 오류 | 오류 / 오류 / 오류 | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| V1-plas10 | - | - | 오류 / 오류 / 오류 | - | 오류 / 오류 / 오류 | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| V2-plas10 | - | - | 오류 / 오류 / 오류 | - | 오류 / 오류 / 오류 | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| V3-aud16 | - | - | 오류 / 오류 / 오류 | - | 오류 / 오류 / 오류 | ERROR / ERROR / ERROR | FACT / FACT / CONCLUSION_RESTATED | 0/3 |

재활용 기준 칸(새로 돌리지 않음): 11-08 실행 `docs/experiments/judge-model-explanation-2026-11-08/runs` 의 파일 r1~r3


## 질문 목록

| 사례 | 조건 | 회차 | 구분 | errorType | basis | 글자 수 | 큰따옴표 시작 | "표시한" | 질문 원문 | 재활용 |
|---|---|---|---|---|---|---|---|---|---|---|
| A-aud17 | v5.9-luna | r1 | first | CONTENT | STATED | 63 | O | X | “C에서 실제 크기와 문턱값 사이의 차이가 더 큼”이라고 했지. 표에서 C와 D 중 어느 쪽의 그 차이가 더 커? |  |
| A-aud17 | v5.9-luna | r1 | first | CONTENT | STATED | 84 | O | X | “C에서 실제 크기와 문턱값 사이의 차이가 더 큼 -> 더 많은 비트 할당”이라고 했지. 표에서 C와 D 중 어느 소리 크기에 더 많은 비트가 할당돼? |  |
| A-aud17 | v5.9-luna | r3 | first | CONTENT | STATED | 77 | O | X | “C에서 실제 크기와 문턱값 사이의 차이가 더 큼”이라고 했지. 표에서 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 쪽은 어디야? |  |
| A-aud17 | v5.9-sol | r1 | first | CONTENT | STATED | 72 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 소리 크기와 차폐 문턱값의 차이가 더 큰 건 C야, D야? |  |
| A-aud17 | v5.9-sol | r2 | first | CONTENT | STATED | 81 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 소리는 어느 쪽이야? |  |
| A-aud17 | v5.9-sol | r3 | first | CONTENT | STATED | 81 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 소리 크기와 차폐 문턱값의 차이를 비교하면 C와 D 중 어느 쪽이 더 커? |  |
| A-cog16 | v5.9-luna | r2 | first | CONTENT | STATED | 53 | O | O | “의미로 전환되는 상태”라고 했지. 표시한 부분에서 파생적 상태의 의미는 무엇에 의존해 나타나? |  |
| A-horse5 | v5.9-luna | r1 | first | CONTENT | STATED | 71 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소는 이 규정이 무엇을 침해하는지 다뤘어? |  |
| A-horse5 | v5.9-luna | r2 | first | CONTENT | STATED | 72 | O | O | "언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소는 규정이 언론의 자유를 침해하는지에 관해 무엇을 판단했어? |  |
| A-horse5 | v5.9-luna | r3 | first | CONTENT | STATED | 69 | O | O | "언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소가 해당 규정과 언론의 자유에 관해 다룬 쟁점은 뭐야? |  |
| A-horse5 | v5.9-sol | r1 | first | CONTENT | STATED | 61 | O | O | "언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소가 침해 여부를 논의한 두 가지는 뭐야? |  |
| A-horse5 | v5.9-sol | r2 | first | CONTENT | STATED | 66 | O | O | "언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? |  |
| A-horse5 | v5.9-sol | r3 | first | CONTENT | STATED | 78 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 국민의 알 권리와 함께 침해 여부가 논의된 자유는 무엇이야? |  |
| V1-plas10 | v5.8-sol | r1 | first | CONTENT | STATED | 73 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 <보기>에서 ㉮와 ㉯의 사슬은 조밀하게 배열되는 정도가 어떻게 달라? |  |
| V1-plas10 | v5.8-sol | r2 | first | CONTENT | STATED | 63 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 <보기>에서 ㉮와 ㉯의 사슬은 각각 어떻게 배열돼? |  |
| V1-plas10 | v5.8-sol | r3 | first | CONTENT | STATED | 73 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 <보기>에서 ㉮와 ㉯의 사슬은 조밀하게 배열되는 정도가 어떻게 달라? |  |
| V1-plas10 | v5.9-sol | r1 | first | CONTENT | STATED | 70 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 부분에서 사슬이 더 조밀하게 배열될 수 있는 쪽은 ㉮야, ㉯야? |  |
| V1-plas10 | v5.9-sol | r1 | first | CONTENT | STATED | 60 | O | O | "결정 영역이 많으니"라고 했지. 표시한 결정 영역의 뜻을 적용하면 결정 영역이 더 많은 쪽은 ㉮야, ㉯야? |  |
| V1-plas10 | v5.9-sol | r2 | first | CONTENT | STATED | 72 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 부분에서 ㉮와 ㉯ 중 어느 쪽 사슬이 더 조밀하게 배열될 수 있어? |  |
| V1-plas10 | v5.9-sol | r2 | first | CONTENT | STATED | 63 | O | O | "결정 영역이 많으니"라고 했지. 표시한 결정 영역의 뜻에 따르면 ㉮와 ㉯ 중 어느 쪽에 결정 영역이 더 많겠어? |  |
| V1-plas10 | v5.9-sol | r3 | first | CONTENT | STATED | 70 | O | O | "㉮가 ㉯보다 사슬이 더 조밀하게 배열돼서"라고 했지. 표시한 부분에서 사슬이 더 조밀하게 배열될 수 있는 쪽은 ㉮야, ㉯야? |  |
| V1-plas10 | v5.9-sol | r3 | first | CONTENT | STATED | 67 | O | O | "결정 영역이 많으니"라고 했지. 표시한 결정 영역의 뜻과 <보기>를 연결하면, 결정 영역이 더 많은 쪽은 ㉮야, ㉯야? |  |
| V2-plas10 | v5.8-sol | r1 | first | CONTENT | STATED | 71 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 플라스틱의 유연성은 어떻게 변해? |  |
| V2-plas10 | v5.8-sol | r2 | first | CONTENT | STATED | 72 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 플라스틱의 유연성은 어떻게 달라져? |  |
| V2-plas10 | v5.8-sol | r3 | first | CONTENT | STATED | 72 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 플라스틱의 유연성은 어떻게 달라져? |  |
| V2-plas10 | v5.9-sol | r1 | first | CONTENT | STATED | 65 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 유연성은 어떻게 변해? |  |
| V2-plas10 | v5.9-sol | r2 | first | CONTENT | STATED | 65 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 유연성은 어떻게 변해? |  |
| V2-plas10 | v5.9-sol | r3 | first | CONTENT | STATED | 65 | O | O | "결정 영역이 많을수록 유연성이 높아지니까"라고 했지. 표시한 부분에서 결정 영역이 많아질수록 유연성은 어떻게 변해? |  |
| V3-aud16 | v5.8-sol | r1 | first | CONTENT | STATED | 32 | X | O | 표시한 부분에서 저음과 고음의 임계대역 폭은 어떻게 달라? |  |
| V3-aud16 | v5.8-sol | r2 | first | CONTENT | STATED | 64 | O | O | "임계대역의 폭은 저음에서 고음보다 넓으니까"라고 했지. 표시한 부분에서 저음과 고음의 임계대역 폭은 어떻게 달라? |  |
| V3-aud16 | v5.8-sol | r3 | first | CONTENT | STATED | 65 | O | O | "임계대역의 폭은 저음에서 고음보다 넓으니까"라고 했지. 표시한 부분에서 고음의 임계대역 폭은 저음과 비교하면 어때? |  |
| V3-aud16 | v5.9-sol | r1 | first | CONTENT | STATED | 62 | O | X | "임계대역의 폭은 저음에서 고음보다 넓으니까"라고 했지. 저음과 고음 중 임계대역이 더 넓은 쪽은 어느 쪽이야? |  |
| V3-aud16 | v5.9-sol | r2 | first | CONTENT | STATED | 71 | O | O | "임계대역의 폭은 저음에서 고음보다 넓으니까"라고 했지. 표시한 부분에서 저음과 고음 중 임계대역이 더 넓은 쪽은 어느 쪽이야? |  |
| V3-aud16 | v5.9-sol | r3 | first | CONTENT | STATED | 71 | O | O | "임계대역의 폭은 저음에서 고음보다 넓으니까"라고 했지. 표시한 부분에서 저음과 고음 중 임계대역이 더 넓은 쪽은 어느 쪽이야? |  |
| A-cog16 | v5.8-luna | r1 | first | CONTENT |  | 69 | O | O | “파생적 상태는 해석에 의존해 의미로 전환되는 상태”라고 했는데, 표시한 부분에서 파생적 상태는 어떤 상태라고 정의돼 있어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-cog16__L-now__r1.json |
| A-horse5 | v5.8-luna | r1 | first | CONTENT |  | 29 | X | O | 표시한 부분에서 헌법재판소가 다룬 쟁점은 무엇이었어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__L-now__r1.json |
| A-horse5 | v5.8-luna | r2 | first | CONTENT |  | 47 | X | O | 표시한 부분에서 헌법재판소가 판단한 쟁점에 언론의 자유가 어떻게 언급됐는지 말해 봐. | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__L-now__r2.json |
| A-horse5 | v5.8-luna | r3 | first | CONTENT |  | 58 | X | O | 네가 말한 “언론의 자유와는 상관이 없음”과 달리, 표시한 부분에서 헌법재판소가 판단한 쟁점은 무엇이야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__L-now__r3.json |
| A-horse5 | v5.8-sol | r1 | first | CONTENT |  | 77 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r1.json |
| A-horse5 | v5.8-sol | r2 | first | CONTENT |  | 77 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r2.json |
| A-horse5 | v5.8-sol | r3 | first | CONTENT |  | 78 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했는데, 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r3.json |
| A-aud17 | v5.8-luna | r1 | first | CONTENT |  | 46 | X | X | 표에서 C와 D의 소리 크기와 차폐 문턱값을 각각 비교하면, 두 차이는 어떻게 돼? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__L-now__r1.json |
| A-aud17 | v5.8-luna | r2 | first | CONTENT |  | 39 | X | X | 표의 C와 D에서 각각 소리 크기와 차폐 문턱값 사이의 차이는 얼마야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__L-now__r2.json |
| A-aud17 | v5.8-luna | r3 | first | CONTENT |  | 40 | X | X | 표의 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 쪽은 어디야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__L-now__r3.json |
| A-aud17 | v5.8-sol | r1 | first | CONTENT |  | 90 | O | O | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 차폐 문턱값을 각각 빼면, 어느 쪽 차이가 얼마나 더 커? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r1.json |
| A-aud17 | v5.8-sol | r2 | first | CONTENT |  | 76 | O | O | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 각각 차폐 문턱값을 빼면 얼마야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r2.json |
| A-aud17 | v5.8-sol | r3 | first | CONTENT |  | 38 | X | X | 표에서 C와 D의 소리 크기에서 차폐 문턱값을 뺀 값은 각각 얼마야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r3.json |

기계 검사: 그림·표 근거 사례(A-aud17)에 "표시한" 포함 2건 A-aud17 v5.8-sol r1, A-aud17 v5.8-sol r2; CONTENT 첫 질문 중 큰따옴표로 시작하지 않는 것 8건. 방향만 묻는지·보기 출처 위반·답 보기 여부는 판정하지 않는다(메인 세션·사용자 몫)
