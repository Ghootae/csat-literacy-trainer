# 요약: v510-h (v5.10 H 힌트 뒤 근거)

평가 실패 칸 0개 · 칸 27개 · 실측 비용 $1.231

## 통과 기준

| 기준 | 결과 | 상세 |
|---|---|---|
| H 사용자 기대 판정 통과(9건) | 미달 | H-cog12-copy:3/3 H-cog12-use:3/3 H-cog12-wrong:3/3 H-cog15-copy:3/3 H-cog15-use:3/3 H-cog15-wrong:0/3 H-horse4-copy:3/3 H-horse4-use:3/3 H-horse4-wrong:0/3 |
| H 관대 오판(여전히 틀림이 최종 충분 2회 이상) 0건 | 통과 | 없음 |

## 사례별 최종 판정 (r1 / r2 / r3)

| 사례 | 기대 | v5.10-sol | 판정기 원판정(주 조건) | 형태 ground.kind | 서버 올림 |
|---|---|---|---|---|---|
| H-cog12-copy | 부족 | 부족 / 부족 / 부족 (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY | 0/3 |
| H-cog12-use | 충분 | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| H-cog12-wrong | 오류 | 오류 / 오류 / 오류 (3/3 통과) | ERROR / ERROR / ERROR | FACT / FACT / FACT | 0/3 |
| H-cog15-copy | 부족 | 부족 / 부족 / 부족 (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY | 0/3 |
| H-cog15-use | 충분 | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| H-cog15-wrong | 오류 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (0/3) | UNKNOWN / UNKNOWN / UNKNOWN | FACT / FACT / FACT | 0/3 |
| H-horse4-copy | 충분 | 충분 / 충분 / 충분 (3/3 통과) | INSUFFICIENT / INSUFFICIENT / INSUFFICIENT | LOCATION_ONLY / LOCATION_ONLY / LOCATION_ONLY (기대 LOCATION_ONLY, 3/3) | 3/3 |
| H-horse4-use | 충분 | 충분 / 충분 / 충분 (3/3 통과) | SUPPORTED / SUPPORTED / SUPPORTED | FACT / FACT / FACT | 0/3 |
| H-horse4-wrong | 오류 | 부족(판정 불가) / 부족(판정 불가) / 부족(판정 불가) (0/3) | UNKNOWN / UNKNOWN / UNKNOWN | FACT / FACT / FACT | 0/3 |

## 질문 목록

| 사례 | 조건 | 회차 | 구분 | errorType | basis | 글자 수 | 큰따옴표 시작 | "표시한" | 질문 원문 | 재활용 |
|---|---|---|---|---|---|---|---|---|---|---|
| H-cog12-wrong | v5.10-sol | r1 | first | CONTENT | STATED | 78 | O | O | "설은 함수적 역할이 같으면 의식도 같다고 했음."이라고 했지. 표시한 중국어 방 사례에서 함수적 역할이 같은 두 쪽의 의식은 어떤 관계야? |  |
| H-cog12-wrong | v5.10-sol | r2 | first | CONTENT | STATED | 85 | O | O | "설은 함수적 역할이 같으면 의식도 같다고 했음."이라고 했지. 표시한 부분에서 함수적 역할이 같은 방 안의 사람과 중국어 사용자의 의식은 어떤 관계야? |  |
| H-cog12-wrong | v5.10-sol | r3 | first | CONTENT | STATED | 92 | O | O | "설은 함수적 역할이 같으면 의식도 같다고 했음."이라고 했지. 표시한 중국어 방 사례에서, 함수적 역할이 같은 방 안의 사람과 중국어 사용자의 의식은 어떤 관계야? |  |
