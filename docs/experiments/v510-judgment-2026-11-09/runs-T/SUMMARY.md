# 요약: v510-t (v5.10 T 고치기용 14건)

평가 실패 칸 0개 · 칸 42개 · 실측 비용 $1.822

## 통과 기준

| 기준 | 결과 | 상세 |
|---|---|---|
| T 고치기 대상(의식 14·경마 6-B) 통과 | 통과 | A-cog14:true B-horse6:true |
| T 기존 통과 사례 7건 계속 통과 | 통과 | A-horse6:true A-plas10:true A-cog16:true A-horse5:true A-aud17:true B-cog14:true B-plas10:true |
| T C 반례 4건 중 최종 충분 2회 이상 0건 | 통과 | 충분 2회 이상: 없음 |

## 사례별 최종 판정 (r1 / r2 / r3)

| 사례 | 기대 | v5.10-sol | v5.8-sol | 판정기 원판정(주 조건) | 형태 ground.kind | 서버 올림 |
|---|---|---|---|---|---|---|
| A-aud16 (관찰만) | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (0/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| A-aud17 | 오류 | 오류 / 오류 / 오류 (3/3 통과) | 오류 / 오류 / 오류 (3/3 통과) | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| A-cog14 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족 / 부족 / 부족 (0/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| A-cog16 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| A-horse5 | 오류 | 오류 / 오류 / 오류 (3/3 통과) | 오류 / 오류 / 오류 (3/3 통과) | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| A-horse6 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / 충분 / 부족 (2/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| A-plas10 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| B-cog14 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| B-horse6 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족 / 부족 / 부족 (0/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| B-plas10 | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / 부족 / 충분 (2/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| C1-cog14 | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / 부족 / 부족 (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED | 0/3 |
| C1-plas10 | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / 부족 / 부족 (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED | 0/3 |
| C2-aud16 | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT | 0/3 |
| C2-horse6 | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT | 0/3 |

재활용 기준 칸(새로 돌리지 않음): 11-08 실행 `docs/experiments/judge-model-explanation-2026-11-08/runs` 의 파일 r1~r3


## 질문 목록

| 사례 | 조건 | 회차 | 구분 | errorType | basis | 글자 수 | 큰따옴표 시작 | "표시한" | 질문 원문 | 재활용 |
|---|---|---|---|---|---|---|---|---|---|---|
| A-aud17 | v5.10-sol | r1 | first | CONTENT | STATED | 79 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 건 어느 쪽이야? |  |
| A-aud17 | v5.10-sol | r2 | first | CONTENT | STATED | 79 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 건 어느 쪽이야? |  |
| A-aud17 | v5.10-sol | r3 | first | CONTENT | STATED | 79 | O | X | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표에서 C와 D 중 소리 크기와 차폐 문턱값의 차이가 더 큰 건 어느 쪽이야? |  |
| A-horse5 | v5.10-sol | r1 | first | CONTENT | STATED | 84 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소가 보도 금지 규정과 언론의 자유에 관해 논의한 쟁점은 뭐야? |  |
| A-horse5 | v5.10-sol | r2 | first | CONTENT | STATED | 77 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? |  |
| A-horse5 | v5.10-sol | r3 | first | CONTENT | STATED | 72 | O | O | "언론의 자유와는 상관이 없음"이라고 했지. 표시한 부분에서 헌법재판소가 국민의 알 권리와 함께 침해 여부를 논의한 자유는 뭐야? |  |
| A-horse5 | v5.8-sol | r1 | first | CONTENT |  | 77 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r1.json |
| A-horse5 | v5.8-sol | r2 | first | CONTENT |  | 77 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했지. 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r2.json |
| A-horse5 | v5.8-sol | r3 | first | CONTENT |  | 78 | O | O | "헌법제판소 논의는 언론의 자유와는 상관이 없음."이라고 했는데, 표시한 부분에서 헌법재판소는 보도 금지 규정이 무엇을 침해하는지 논의했어? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-horse5__S-now__r3.json |
| A-aud17 | v5.8-sol | r1 | first | CONTENT |  | 90 | O | O | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 차폐 문턱값을 각각 빼면, 어느 쪽 차이가 얼마나 더 커? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r1.json |
| A-aud17 | v5.8-sol | r2 | first | CONTENT |  | 76 | O | O | "C에서 실제 크기와 문턱값 사이의 차이가 더 큼"이라고 했지. 표시한 표에서 C와 D의 소리 크기에서 각각 차폐 문턱값을 빼면 얼마야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r2.json |
| A-aud17 | v5.8-sol | r3 | first | CONTENT |  | 38 | X | X | 표에서 C와 D의 소리 크기에서 차폐 문턱값을 뺀 값은 각각 얼마야? | docs/experiments/judge-model-explanation-2026-11-08/runs/A-aud17__S-now__r3.json |
