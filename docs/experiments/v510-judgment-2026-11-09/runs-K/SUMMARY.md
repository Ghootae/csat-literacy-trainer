# 요약: v510-k (v5.10 K 확인용)

평가 실패 칸 0개 · 칸 72개 · 실측 비용 $2.783

## 통과 기준

| 기준 | 결과 | 상세 |
|---|---|---|
| K 핵심 5건 중 4건 이상 통과 | 통과 | 5/5: K-aud15-real:true K-cog12-core:true K-cog15-core:true K-horse4-core:true K-st16-core:true |
| K 관대 아닌 문항의 결론만·못 가름 + 관대 문항의 못 가름: 최종 충분 2회 이상 0건 | 통과 | 대상 8건, 충분 2회 이상: 없음 |
| K 관대 문항의 결론만 2건: 서버 최종 충분 2회 이상 | 통과 | K-aud15-restate:3/3 K-horse4-restate:3/3 |
| K 위치만: 경마 4 문장 특정 충분 2회 이상 | 통과 | K-horse4-loc-sentence 3/3 |
| K 위치만: 경마 4 문단만·의식 15 문단만 충분 2회 이상 0건 | 통과 | K-cog15-loc-para:0/3 K-horse4-loc-para:0/3 |

관대 오판(기대 부족인데 서버 최종 충분 2회 이상): 0건 

## 사례별 최종 판정 (r1 / r2 / r3)

| 사례 | 기대 | v5.10-sol | v5.8-sol | 판정기 원판정(주 조건) | 형태 ground.kind | 서버 올림 |
|---|---|---|---|---|---|---|
| K-aud15-nodisc | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT (기대 FACT, 3/3, 관찰만) | 0/3 |
| K-aud15-real | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY | 3/3 |
| K-aud15-restate | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족 / - / - (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED (기대 CONCLUSION_RESTATED, 3/3) | 3/3 |
| K-cog12-core | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / - / - (1/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT (기대 FACT, 3/3) | 0/3 |
| K-cog12-nodisc | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT (기대 FACT, 3/3, 관찰만) | 0/3 |
| K-cog12-restate | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED (기대 CONCLUSION_RESTATED, 3/3) | 0/3 |
| K-cog15-core | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / - / - (1/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT (기대 FACT, 3/3) | 0/3 |
| K-cog15-loc-para | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY (기대 LOCATION_ONLY, 3/3) | 0/3 |
| K-cog15-nodisc | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT (기대 FACT, 3/3, 관찰만) | 0/3 |
| K-cog15-restate | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED (기대 CONCLUSION_RESTATED, 3/3) | 0/3 |
| K-horse4-core | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / - / - (1/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT (기대 FACT, 3/3) | 0/3 |
| K-horse4-loc-para | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY (기대 LOCATION_ONLY, 3/3) | 0/3 |
| K-horse4-loc-sentence | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족 / - / - (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY (기대 LOCATION_ONLY, 3/3) | 3/3 |
| K-horse4-nodisc | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | FACT / FACT / FACT (기대 FACT, 3/3, 관찰만) | 0/3 |
| K-horse4-restate | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 부족 / - / - (0/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED (기대 CONCLUSION_RESTATED, 3/3) | 3/3 |
| K-st16-core | 충분 | 충분 / 충분 / 충분 (3/3 통과) | 충분 / - / - (1/3) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT (기대 FACT, 3/3) | 0/3 |
| K-st16-nodisc | 부족 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (3/3 통과) | 부족(판정 불가) / - / - (1/3) | INSUFFICIENT / UNKNOWN / INSUFFICIENT | FACT / FACT / FACT (기대 FACT, 3/3, 관찰만) | 0/3 |
| K-st16-restate | 부족 | 부족 / 부족 / 부족 (3/3 통과) | 부족 / - / - (1/3) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | CONCLUSION_RESTATED / CONCLUSION_RESTATED / CONCLUSION_RESTATED (기대 CONCLUSION_RESTATED, 3/3) | 0/3 |
