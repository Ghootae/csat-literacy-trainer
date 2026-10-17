# 분석 지도 공손룡 판정 기준 v2 / v3 비교

결과만 기록한다. 해석·평가 문장 없음. 원자료: `stage2-v2/`(v2), `stage2-v3/`(v3), `compare-v2-v3.json`.

집계 정의: 라벨은 `finalLabel`(인용 강등 반영), 미판정 제외. 라벨 상승·하락은 라운드 k≥2에서 직전 라운드 대비 ABSENT<PARTIAL<DIRECT 순서의 변화, ✕가 들어간 변화는 별도 행. 평균 인용 길이는 판정 성공 행의 모든 인용 기준.

## 요약 (v2 | v3)

| 항목 | v2 | v3 |
|---|---|---|
| 판정 수(성공) | 1552 | 1552 |
| 노드 라벨 분포 | DIRECT 331, PARTIAL 374, ABSENT 437, CONTRADICTS 60 | DIRECT 353, PARTIAL 366, ABSENT 418, CONTRADICTS 65 |
| 관계 라벨 분포 | DIRECT 95, PARTIAL 46, ABSENT 192, CONTRADICTS 17 | DIRECT 89, PARTIAL 55, ABSENT 186, CONTRADICTS 20 |
| 원문 복사 대조군 노드 라벨 분포 | DIRECT 132, PARTIAL 16, ABSENT 3, CONTRADICTS 0 | DIRECT 132, PARTIAL 17, ABSENT 2, CONTRADICTS 0 |
| 결합 패턴 수 | 115 (SUBSUMED 96, MISMATCH_RELATION 18, LISTING 1) | 130 (SUBSUMED 113, MISMATCH_RELATION 14, LISTING 3) |
| 인용 강등 | 6 | 4 |
| 무효 인용 / 전체 인용 | 12 / 1064 | 15 / 1096 |
| 평균 인용 길이(글자) | 26.9 | 26.8 |
| 오류 사건 수(NEW / KEPT / LATE) | 19 (18 / 1 / 0) | 17 (16 / 1 / 0) |
| 오류 사건 끝남(RESOLVED / DROPPED) | 3 / 2 | 2 / 1 |
| unlocated(인용 없는 ✕ 판정) | 1 | 2 |
| 라운드 k≥2 라벨 상승 / 하락 | 120 / 22 | 139 / 31 |
| 라운드 k≥2 ✕ 관련 변화 | 44 | 42 |

## 라벨 전이표: 노드 (행 v2, 열 v3, 양쪽 성공 1202건)

| v2 \ v3 | DIRECT | PARTIAL | ABSENT | CONTRADICTS |
|---|---|---|---|---|
| DIRECT | 297 | 33 | 1 | 0 |
| PARTIAL | 55 | 293 | 24 | 2 |
| ABSENT | 1 | 38 | 388 | 10 |
| CONTRADICTS | 0 | 2 | 5 | 53 |

## 라벨 전이표: 관계 (행 v2, 열 v3, 양쪽 성공 350건)

| v2 \ v3 | DIRECT | PARTIAL | ABSENT | CONTRADICTS |
|---|---|---|---|---|
| DIRECT | 80 | 14 | 1 | 0 |
| PARTIAL | 9 | 29 | 6 | 2 |
| ABSENT | 0 | 12 | 178 | 2 |
| CONTRADICTS | 0 | 0 | 1 | 16 |

## 지정 사례표 (v2 라벨(인용) → v3 라벨(인용))

### F1: v4:5f5ba586 p1 라운드 1

| 단위 | v2 → v3 |
|---|---|
| G1 | PARTIAL (명실 문제는 전국시대 이후 철학주제로 정립 / 공손룡과 후기 묵가의 논쟁이 대표) → PARTIAL (철학주제로 정립 / 공손룡과 후기 묵가의 논쟁이 대표) |

### F2: v4:8e2ead22 p1 라운드 1

| 단위 | v2 → v3 |
|---|---|
| G1 | PARTIAL (전국시대 이후에 철학적 주제 정립 / 공손룡과 후기 묵가 사이의 논쟁) → PARTIAL (명실문제는 전국시대 이후에 철학적 주제 정립 / 공손룡과 후기 묵가 사이의 논쟁) |

### F3: v4:d1b8b941 p3 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P3-5 | ABSENT → ABSENT |
| P3-10 | ABSENT → ABSENT |

### F4: v4:19b3cc0d p3 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P3-10 | ABSENT → ABSENT |
| R11 | ABSENT → ABSENT |

### F5: sh:54bfce80 p3 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P3-10 | CONTRADICTS (흰말과 말은 가르키는 대상이 다르다.) → CONTRADICTS (흰말과 말은 가르키는 대상이 다르다.) |

### F6: sh:54bfce80 p4 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P4-4 | ABSENT → ABSENT |
| P4-10 | PARTIAL (명이 여러 실을 지시할 수 있다고 봄.) → ABSENT |
| C4-2 | ABSENT → CONTRADICTS (명이 여러 실을 지시할 수 있다고 봄) |
| C4-3 | ABSENT → CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) |
| C4-4 | ABSENT → CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) |
| R17 | ABSENT → CONTRADICTS (명이 여러 실을 지시할 수 있다고 봄.) |
| R18 | ABSENT → CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) |
| R19 | CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) → CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) |

### F7: v4:81557ccb p2 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P2-8 | PARTIAL (인간이 자신의 입장에서 명을 실에 부여) → PARTIAL (명을 실에 부여) |
| P2-9 | ABSENT → PARTIAL (명을 실에 부여) |

### T1: sh:578fc718 p4 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P4-11 | CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장) → CONTRADICTS (명과 실의 일대일 대응 주장) |
| C4-4 | CONTRADICTS (명과 실의 일대일 대응 주장) → CONTRADICTS (명과 실의 일대일 대응 주장) |
| C4-5 | CONTRADICTS (명과 실의 일대일 대응 주장) → CONTRADICTS (명과 실의 일대일 대응 주장) |
| G4 | CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장) → CONTRADICTS (명과 실의 일대일 대응 주장) |

### T2: sh:54bfce80 p4 라운드 2

| 단위 | v2 → v3 |
|---|---|
| P4-4 | CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.) → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.) |
| C4-4 | CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.) → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.) |

### T3: sh:54bfce80 p5 라운드 2

| 단위 | v2 → v3 |
|---|---|
| P5-4 | CONTRADICTS (작은건 달명) → CONTRADICTS (작은건 달명) |
| P5-8 | CONTRADICTS (가장 큰 건 사명) → CONTRADICTS (가장 큰 건 사명) |
| C5-2 | CONTRADICTS (작은건 달명) → CONTRADICTS (작은건 달명) |

### T4: v4:83601960 p2 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P2-5 | CONTRADICTS (사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.) → CONTRADICTS (사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다. [무효]) |
| C2-1 | CONTRADICTS (사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다. [무효]) → CONTRADICTS (사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다. [무효]) |

### T5: sh:578fc718 p5 라운드 2

| 단위 | v2 → v3 |
|---|---|
| P5-6 | CONTRADICTS (유명은 개별) → CONTRADICTS (유명은 개별) |
| P5-8 | CONTRADICTS (사명은 범주 지칭) → CONTRADICTS (사명은 범주 지칭) |

### T6: v4:83601960 p2 라운드 2

| 단위 | v2 → v3 |
|---|---|
| P2-5 | DIRECT (실은 이름을 붙이기 전부터 인간과 무관하게 물에서 나뉘어 있어요.) → DIRECT (실은 이름을 붙이기 전부터 인간과 무관하게 물에서 나뉘어 있어요.) |
| C2-1 | DIRECT (실은 이름을 붙이기 전부터 인간과 무관하게 물에서 나뉘어 있어요. / 명은 그 실을 지시하고) → DIRECT (실은 이름을 붙이기 전부터 인간과 무관하게 물에서 나뉘어 있어요. 명은 그 실을 지시하고) |

### T7: sh:6c177d02 p4 라운드 1

| 단위 | v2 → v3 |
|---|---|
| G4 | CONTRADICTS (흰말은 말이 아니라고 함.) → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.) |

### F8: v4:0929fd23 p3 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P3-5 | CONTRADICTS (흰말은 말이 아니다) → ABSENT |

### F9: sh:6c177d02 p3 라운드 1

| 단위 | v2 → v3 |
|---|---|
| P3-5 | CONTRADICTS (공손룡은 흰말은 말이 아니다라는 주장을 함.) → ABSENT |

## v2 오류 사건 추적 (v2 사건 19개, v3에 같은 키로 남음 17개)

| 대화 | 라운드 | 학생 구간 | 걸린 단위 v2 라벨 → v3 라벨(인용) | v3에서 |
|---|---|---|---|---|
| v4:83601960-c959-445c-9c2a-b9846fde800f | 1 | 차례 1 「공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.」 | P2-5 CONTRADICTS → CONTRADICTS (사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다. [무효])<br>P2-6 CONTRADICTS → CONTRADICTS (공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.)<br>R5 CONTRADICTS → CONTRADICTS (공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.) | 남음 |
| v4:473e0d45-025b-4a3f-8082-b81c76c827c4 | 1 | 차례 1 「명과 실 일대일 대응 주장->소통의 혼란을 줄일 수 있어.」 | R7 CONTRADICTS → CONTRADICTS (명과 실 일대일 대응 주장->소통의 혼란을 줄일 수 있어.) | 남음 |
| v4:0929fd23-a511-490f-9464-6a617f8e2cd4 | 1 | 차례 1 「흰말은 말이 아니다는 주장의 근거: 말과 흰말이 지칭하는 대상이 다름 -> 명의 용법이 구분되어야 함.」 | P3-5 CONTRADICTS → ABSENT | 사라짐 |
| sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 | 1 | 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 | P4-4 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>P4-11 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>P4-12 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>P4-13 CONTRADICTS → ABSENT<br>C4-2 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>C4-3 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>C4-4 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>C4-5 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>G4 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>R17 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R18 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R19 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>R20 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R21 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장) | 남음 |
| sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 | 2 | 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 | P4-4 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>P4-9 CONTRADICTS → ABSENT<br>P4-10 CONTRADICTS → ABSENT<br>P4-11 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>P4-12 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>C4-3 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>C4-4 CONTRADICTS → CONTRADICTS (명과 실의 일대일 대응 주장)<br>C4-5 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>G4 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R18 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R19 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장)<br>R20 CONTRADICTS → ABSENT<br>R21 CONTRADICTS → CONTRADICTS (후기 묵가: 명과 실의 일대일 대응 주장) | 남음 |
| sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p5:1 | 2 | 차례 2 「유명은 개별,」 | P5-6 CONTRADICTS → CONTRADICTS (유명은 개별)<br>C5-3 CONTRADICTS → CONTRADICTS (유명은 개별)<br>C5-5 CONTRADICTS → CONTRADICTS (유명은 개별, 사명은 범주 지칭)<br>G5 CONTRADICTS → CONTRADICTS (유명은 개별, 사명은 범주 지칭) | 남음 |
| sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p5:1 | 2 | 차례 2 「사명은 범주 지칭」 | P5-8 CONTRADICTS → CONTRADICTS (사명은 범주 지칭)<br>P5-12 CONTRADICTS → PARTIAL (유명은 개별)<br>C5-4 CONTRADICTS → CONTRADICTS (사명은 범주 지칭)<br>C5-5 CONTRADICTS → CONTRADICTS (유명은 개별, 사명은 범주 지칭)<br>G5 CONTRADICTS → CONTRADICTS (유명은 개별, 사명은 범주 지칭) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p3:1 | 1 | 차례 1 「흰말과 말은 가르키는 대상이 다르다.」 | P3-10 CONTRADICTS → CONTRADICTS (흰말과 말은 가르키는 대상이 다르다.) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 | 1 | 차례 1 「묵가는 명이 여러 실을 지시할 수 있다고 봄.」 | R19 CONTRADICTS → CONTRADICTS (묵가는 명이 여러 실을 지시할 수 있다고 봄.) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 | 2 | 차례 2 「한 대상은 여러 이름으로 불릴 수는 없다고 봤어.」 | P4-4 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>P4-9 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>P4-10 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>C4-2 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>C4-3 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>C4-4 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>G4 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>R18 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.)<br>R19 CONTRADICTS → CONTRADICTS (한 대상은 여러 이름으로 불릴 수는 없다고 봤어.) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p5:1 | 2 | 차례 2 「작은건 달명」 | P5-4 CONTRADICTS → CONTRADICTS (작은건 달명)<br>C5-2 CONTRADICTS → CONTRADICTS (작은건 달명)<br>G5 CONTRADICTS → CONTRADICTS (가장 큰 건 사명, 중간은 유명, 작은건 달명) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p5:1 | 2 | 차례 2 「가장 큰 건 사명,」 | P5-8 CONTRADICTS → CONTRADICTS (가장 큰 건 사명)<br>C5-4 CONTRADICTS → CONTRADICTS (가장 큰 건 사명)<br>G5 CONTRADICTS → CONTRADICTS (가장 큰 건 사명, 중간은 유명, 작은건 달명) | 남음 |
| sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p5:1 | 2 | 차례 2 「중간은 유명,」 | G5 CONTRADICTS → CONTRADICTS (가장 큰 건 사명, 중간은 유명, 작은건 달명) | 남음 |
| sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p1:2 | 2 | 차례 2 「철학적 논쟁에서 윤리적 문제로 변화」 | P1-2 CONTRADICTS → PARTIAL (윤리적 문제로 변화)<br>C1-1 CONTRADICTS → CONTRADICTS (철학적 논쟁에서 윤리적 문제로 변화)<br>G1 CONTRADICTS → CONTRADICTS (철학적 논쟁에서 윤리적 문제로 변화)<br>R1 CONTRADICTS → CONTRADICTS (철학적 논쟁에서 윤리적 문제로 변화) | 남음 |
| sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p2:3 | 1 | 차례 1 「실로부터 물이 파생.」 | P2-1 CONTRADICTS → CONTRADICTS (실로부터 물이 파생)<br>P2-3 CONTRADICTS → CONTRADICTS (실로부터 물이 파생)<br>C2-1 CONTRADICTS → CONTRADICTS (실로부터 물이 파생 / 명은 물을 지시해서 소통을 가능하게 함)<br>R4 CONTRADICTS → CONTRADICTS (실로부터 물이 파생) | 남음 |
| sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p2:3 | 1 | 차례 1 「명은 물을 지시해서 소통을 가능하게 함.」 | P2-4 CONTRADICTS → CONTRADICTS (명은 물을 지시해서 소통을 가능하게 함.) | 남음 |
| sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p2:3 | 1 | 차례 1 「공손룡은 명과 물 사이의 관계가 불분명할 수 밖에 없다고 주장함.」 | P2-12 CONTRADICTS → CONTRADICTS (명과 물 사이의 관계가 불분명할 수 밖에 없다고 주장함.)<br>C2-5 CONTRADICTS → CONTRADICTS (공손룡은 명과 물 사이의 관계가 불분명할 수 밖에 없다고 주장함.) | 남음 |
| sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p3:1 | 1 | 차례 1 「공손룡은 흰말은 말이 아니다라는 주장을 함.」 | P3-5 CONTRADICTS → ABSENT | 사라짐 |
| sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p4:1 | 1 | 차례 1 「묵가는 흰말은 말이 아니라고 함.」 | P4-1 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>P4-3 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>P4-7 CONTRADICTS → CONTRADICTS (흰말은 말이 아니라고 함)<br>P4-9 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>C4-1 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>C4-2 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>C4-4 CONTRADICTS → CONTRADICTS (흰말은 말이 아니라고 함.)<br>G4 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.)<br>R16 CONTRADICTS → CONTRADICTS (묵가는 흰말은 말이 아니라고 함.) | 남음 |

## v3 새 오류 사건 (v3에만 있는 사건 0개)

없음

## 오류 사건 목록

### v2

- v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 1
  - NEW 차례 1 「공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.」 단위 3개(P2-5, P2-6, R5) 대표 C2-2
- v4:473e0d45-025b-4a3f-8082-b81c76c827c4 라운드 1
  - NEW 차례 1 「명과 실 일대일 대응 주장->소통의 혼란을 줄일 수 있어.」 단위 1개(R7) 대표 C2-5
- v4:0929fd23-a511-490f-9464-6a617f8e2cd4 라운드 1
  - NEW 차례 1 「흰말은 말이 아니다는 주장의 근거: 말과 흰말이 지칭하는 대상이 다름 -> 명의 용법이 구분되어야 함.」 단위 1개(P3-5) 대표 P3-5
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 단위 14개(P4-4, P4-11, P4-12, P4-13, C4-2, C4-3, C4-4, C4-5, G4, R17, R18, R19, R20, R21) 대표 G4
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 라운드 2
  - KEPT 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 단위 13개(P4-4, P4-9, P4-10, P4-11, P4-12, C4-3, C4-4, C4-5, G4, R18, R19, R20, R21) 대표 G4
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p5:1 라운드 2
  - NEW 차례 2 「유명은 개별,」 단위 4개(P5-6, C5-3, C5-5, G5) 대표 G5
  - NEW 차례 2 「사명은 범주 지칭」 단위 5개(P5-8, P5-12, C5-4, C5-5, G5) 대표 G5
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p3:1 라운드 1
  - NEW 차례 1 「흰말과 말은 가르키는 대상이 다르다.」 단위 1개(P3-10) 대표 P3-10
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「묵가는 명이 여러 실을 지시할 수 있다고 봄.」 단위 1개(R19) 대표 C4-4
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 라운드 2
  - NEW 차례 2 「한 대상은 여러 이름으로 불릴 수는 없다고 봤어.」 단위 9개(P4-4, P4-9, P4-10, C4-2, C4-3, C4-4, G4, R18, R19) 대표 G4
  - DROPPED 차례 1 「묵가는 명이 여러 실을 지시할 수 있다고 봄.」 단위 1개(R19) 대표 C4-4 (라운드 1 사건)
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p5:1 라운드 2
  - NEW 차례 2 「작은건 달명」 단위 3개(P5-4, C5-2, G5) 대표 G5
  - NEW 차례 2 「가장 큰 건 사명,」 단위 3개(P5-8, C5-4, G5) 대표 G5
  - NEW 차례 2 「중간은 유명,」 단위 1개(G5) 대표 G5
- sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p1:2 라운드 2
  - NEW 차례 2 「철학적 논쟁에서 윤리적 문제로 변화」 단위 4개(P1-2, C1-1, G1, R1) 대표 G1
- sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p2:3 라운드 1
  - NEW 차례 1 「실로부터 물이 파생.」 단위 4개(P2-1, P2-3, C2-1, R4) 대표 C2-1
  - NEW 차례 1 「명은 물을 지시해서 소통을 가능하게 함.」 단위 1개(P2-4) 대표 P2-4
  - NEW 차례 1 「공손룡은 명과 물 사이의 관계가 불분명할 수 밖에 없다고 주장함.」 단위 2개(P2-12, C2-5) 대표 C2-5
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p3:1 라운드 1
  - NEW 차례 1 「공손룡은 흰말은 말이 아니다라는 주장을 함.」 단위 1개(P3-5) 대표 P3-5
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「묵가는 흰말은 말이 아니라고 함.」 단위 9개(P4-1, P4-3, P4-7, P4-9, C4-1, C4-2, C4-4, G4, R16) 대표 G4
- v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 2
  - RESOLVED 차례 1 「공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.」 단위 3개(P2-5, P2-6, R5) 대표 C2-2 (라운드 1 사건)
- v4:0929fd23-a511-490f-9464-6a617f8e2cd4 라운드 2
  - RESOLVED 차례 1 「흰말은 말이 아니다는 주장의 근거: 말과 흰말이 지칭하는 대상이 다름 -> 명의 용법이 구분되어야 함.」 단위 1개(P3-5) 대표 P3-5 (라운드 1 사건)
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p3:1 라운드 2
  - DROPPED 차례 1 「공손룡은 흰말은 말이 아니다라는 주장을 함.」 단위 1개(P3-5) 대표 P3-5 (라운드 1 사건)
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p4:1 라운드 2
  - RESOLVED 차례 1 「묵가는 흰말은 말이 아니라고 함.」 단위 9개(P4-1, P4-3, P4-7, P4-9, C4-1, C4-2, C4-4, G4, R16) 대표 G4 (라운드 1 사건)

unlocated: v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 1 C2-1

### v3

- v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 1
  - NEW 차례 1 「공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.」 단위 4개(P2-6, C2-2, R5, R6) 대표 C2-2
- v4:473e0d45-025b-4a3f-8082-b81c76c827c4 라운드 1
  - NEW 차례 1 「명과 실 일대일 대응 주장->소통의 혼란을 줄일 수 있어.」 단위 1개(R7) 대표 C2-5
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 단위 15개(P4-4, P4-9, P4-10, P4-11, P4-12, C4-2, C4-3, C4-4, C4-5, G4, R17, R18, R19, R20, R21) 대표 G4
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p4:1 라운드 2
  - KEPT 차례 1 「후기 묵가: 명과 실의 일대일 대응 주장」 단위 12개(P4-4, P4-11, P4-12, P4-13, C4-2, C4-3, C4-4, C4-5, G4, R18, R19, R21) 대표 G4
- sh:578fc718-8ca0-45d5-9bf7-b19e8d1b4835:gongsun-long-later-mohists-p5:1 라운드 2
  - NEW 차례 2 「유명은 개별,」 단위 4개(P5-6, C5-3, C5-5, G5) 대표 G5
  - NEW 차례 2 「사명은 범주 지칭」 단위 5개(P5-8, P5-10, C5-4, C5-5, G5) 대표 G5
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p3:1 라운드 1
  - NEW 차례 1 「흰말과 말은 가르키는 대상이 다르다.」 단위 1개(P3-10) 대표 P3-10
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「묵가는 명이 여러 실을 지시할 수 있다고 봄.」 단위 6개(C4-2, C4-3, C4-4, R17, R18, R19) 대표 C4-4
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p4:1 라운드 2
  - NEW 차례 2 「한 대상은 여러 이름으로 불릴 수는 없다고 봤어.」 단위 10개(P4-4, P4-7, P4-9, P4-10, C4-2, C4-3, C4-4, G4, R18, R19) 대표 G4
  - DROPPED 차례 1 「묵가는 명이 여러 실을 지시할 수 있다고 봄.」 단위 6개(C4-2, C4-3, C4-4, R17, R18, R19) 대표 C4-4 (라운드 1 사건)
- sh:54bfce80-3a6d-47fe-8688-72a454bf5514:gongsun-long-later-mohists-p5:1 라운드 2
  - NEW 차례 2 「작은건 달명」 단위 3개(P5-4, C5-2, G5) 대표 G5
  - NEW 차례 2 「가장 큰 건 사명,」 단위 3개(P5-8, C5-4, G5) 대표 G5
  - NEW 차례 2 「중간은 유명,」 단위 1개(G5) 대표 G5
- sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p1:2 라운드 2
  - NEW 차례 2 「철학적 논쟁에서 윤리적 문제로 변화」 단위 3개(C1-1, G1, R1) 대표 G1
- sh:9c79492d-3d31-4ef5-aabc-956df04b9108:gongsun-long-later-mohists-p2:3 라운드 1
  - NEW 차례 1 「실로부터 물이 파생.」 단위 4개(P2-1, P2-3, C2-1, R4) 대표 C2-1
  - NEW 차례 1 「명은 물을 지시해서 소통을 가능하게 함.」 단위 2개(P2-4, C2-1) 대표 C2-1
  - NEW 차례 1 「공손룡은 명과 물 사이의 관계가 불분명할 수 밖에 없다고 주장함.」 단위 4개(P2-12, C2-5, G2, R5) 대표 G2
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p4:1 라운드 1
  - NEW 차례 1 「묵가는 흰말은 말이 아니라고 함.」 단위 10개(P4-1, P4-3, P4-5, P4-7, P4-9, C4-1, C4-2, C4-4, G4, R16) 대표 G4
- v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 2
  - RESOLVED 차례 1 「공손룡은 사람들이 이름을 붙이기 때문에 원래 하나인 물이 서로 다른 실로 나뉜다고 봤다.」 단위 4개(P2-6, C2-2, R5, R6) 대표 C2-2 (라운드 1 사건)
- sh:6c177d02-545c-49a7-b426-d43dbe67b31c:gongsun-long-later-mohists-p4:1 라운드 2
  - RESOLVED 차례 1 「묵가는 흰말은 말이 아니라고 함.」 단위 10개(P4-1, P4-3, P4-5, P4-7, P4-9, C4-1, C4-2, C4-4, G4, R16) 대표 G4 (라운드 1 사건)

unlocated: v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 1 P2-5; v4:83601960-c959-445c-9c2a-b9846fde800f 라운드 1 C2-1

