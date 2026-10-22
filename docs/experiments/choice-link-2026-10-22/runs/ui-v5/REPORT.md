# 선지 연결 결과 (v4)

해석·평가 없음. 원자료는 `<지문>/r<k>/choice-link.json`, 검증은 `choice-link.validation.json`, 요청 기록은 ledger, 실행 설정은 RUN 파일.

## 전체 요약

- 응답 파싱 18/18건, 지문 6, 문항 24, 선지 120(첫 회차 기준), 검증 위반 합계 3, 비틂 조각 207

### 회차별 검증 위반·검토 표시

| 지문 | 회차 | 위반 | 검토 표시 | 전체 통과 |
|---|---:|---:|---:|---|
| gongsun-long-later-mohists | 1 | 0 | 11 | true |
| dopamine-motor-control | 1 | 0 | 14 | true |
| corporate-law | 1 | 0 | 17 | true |
| information-asymmetry-free-marketplace | 1 | 0 | 14 | true |
| surface-tension-laplace | 1 | 0 | 16 | true |
| mrna-vaccine-lipid-nanoparticle | 1 | 0 | 24 | true |
| gongsun-long-later-mohists | 2 | 0 | 11 | true |
| dopamine-motor-control | 2 | 0 | 14 | true |
| corporate-law | 2 | 1 | 19 | false |
| information-asymmetry-free-marketplace | 2 | 0 | 16 | true |
| surface-tension-laplace | 2 | 0 | 12 | true |
| mrna-vaccine-lipid-nanoparticle | 2 | 0 | 29 | true |
| gongsun-long-later-mohists | 3 | 0 | 10 | true |
| dopamine-motor-control | 3 | 0 | 16 | true |
| corporate-law | 3 | 1 | 17 | false |
| information-asymmetry-free-marketplace | 3 | 0 | 11 | true |
| surface-tension-laplace | 3 | 0 | 11 | true |
| mrna-vaccine-lipid-nanoparticle | 3 | 1 | 27 | false |

### 검토 표시 종류

| 종류 | 수 |
|---|---:|
| NOTE | 145 |
| READING_GAP | 55 |
| NONE_TWIST | 51 |
| MULTI_TWIST | 31 |
| EXPLANATION_DIFFER | 7 |

### source × operation 조각 수

| source | operation | 수 |
|---|---|---:|
| PASSAGE | RESTATE | 185 |
| BOTH | APPLY | 150 |
| PASSAGE | INFER | 146 |
| NONE | INFER | 30 |
| SUPPLEMENT | RESTATE | 30 |
| NONE | RESTATE | 21 |
| SUPPLEMENT | INFER | 19 |

### twistType 빈도 (비틂 조각)

| twistType | 이름 | 갈래 | 수 |
|---|---|---|---:|
| NEGATION | 긍정·부정 뒤집기 | 1 | 43 |
| ADDED_CONTENT | 없는 내용 덧붙이기 | 5 | 39 |
| SUBSTITUTION | 요소 바꿔치기 | 1 | 22 |
| ADDED_METHOD | 글에 없는 서술 방식 | 5 | 12 |
| CONDITION_SHIFT | 조건 옮기기 | 2 | 12 |
| DIRECTION | 방향 뒤집기 | 1 | 12 |
| CAUSE_SWAP | 원인·근거 바꿔치기 | 2 | 11 |
| ABSOLUTIZE | 전칭·절대화 | 4 | 10 |
| CONFLATION | 다른 것을 같은 것으로 | 1 | 10 |
| HOLDER_SWAP | 입장 주인 바꾸기 | 3 | 9 |
| SCOPE_EXTEND | 적용 범위 넓히기 | 4 | 9 |
| WRONG_REASON | 맞는 사실을 엉뚱한 이유로 | 2 | 9 |
| PAIR_SWAP | 대비 쌍 뒤바꾸기 | 3 | 6 |
| DEGREE | 정도 바꾸기 | 4 | 3 |

### 갈래별 비틂 조각 수

| 갈래 | 수 |
|---|---:|
| 1 | 87 |
| 5 | 51 |
| 2 | 32 |
| 4 | 22 |
| 3 | 15 |

### OTHER 조각 0건의 twistDetail

- 없음

### readingGap 분포 (선지×회차 건수)

| readingGap | 수 |
|---|---:|
| NONE | 305 |
| IMPLICIT_PREMISE | 40 |
| STRICT_READING | 15 |

### readingGap이 NONE이 아닌 선지 (회차 수)

| 지문 | 문항 | 선지 | 회차 수 | 회차별 |
|---|---:|---:|---:|---|
| dopamine-motor-control | 13 | 3 | 3 | r1 IMPLICIT_PREMISE, r2 STRICT_READING, r3 STRICT_READING |
| dopamine-motor-control | 13 | 5 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| corporate-law | 10 | 1 | 3 | r1 STRICT_READING, r2 STRICT_READING, r3 STRICT_READING |
| corporate-law | 11 | 1 | 3 | r1 STRICT_READING, r2 STRICT_READING, r3 STRICT_READING |
| corporate-law | 11 | 3 | 3 | r1 STRICT_READING, r2 STRICT_READING, r3 STRICT_READING |
| corporate-law | 12 | 3 | 2 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE |
| corporate-law | 13 | 5 | 3 | r1 STRICT_READING, r2 STRICT_READING, r3 IMPLICIT_PREMISE |
| information-asymmetry-free-marketplace | 13 | 4 | 2 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE |
| surface-tension-laplace | 15 | 1 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| surface-tension-laplace | 15 | 3 | 2 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE |
| surface-tension-laplace | 15 | 4 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| surface-tension-laplace | 15 | 5 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| surface-tension-laplace | 16 | 1 | 1 | r1 STRICT_READING |
| mrna-vaccine-lipid-nanoparticle | 18 | 3 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| mrna-vaccine-lipid-nanoparticle | 18 | 4 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| mrna-vaccine-lipid-nanoparticle | 19 | 2 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| mrna-vaccine-lipid-nanoparticle | 19 | 5 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| mrna-vaccine-lipid-nanoparticle | 20 | 2 | 3 | r1 IMPLICIT_PREMISE, r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| information-asymmetry-free-marketplace | 13 | 2 | 2 | r2 IMPLICIT_PREMISE, r3 IMPLICIT_PREMISE |
| information-asymmetry-free-marketplace | 13 | 3 | 1 | r2 IMPLICIT_PREMISE |
| dopamine-motor-control | 11 | 3 | 1 | r3 STRICT_READING |
| corporate-law | 12 | 1 | 1 | r3 IMPLICIT_PREMISE |
| surface-tension-laplace | 16 | 5 | 1 | r3 IMPLICIT_PREMISE |

## 회차 간 안정성 (FALSE 선지 단위: twistTargetIds 합집합)

- 비교한 선지 57, 모든 회차 같음 44 (77.2%), 두 회차 이상 같음 56 (98.2%), 모든 회차 교집합이 비지 않음 38 (66.7%)

- 바뀐 곳이 없는 선지(NONE 비틂만, 모든 회차 합집합이 빈 선지) 8. 나머지 49개 기준: 모든 회차 같음 36 (73.5%), 두 회차 이상 같음 48 (98.0%), 교집합이 비지 않음 38 (77.6%)

| 지문 | 문항 | 선지 | 회차별 대상 id |
|---|---:|---:|---|
| gongsun-long-later-mohists | 12 | 4 | r1: P3-11 / r2: P3-11 / r3: P3-10,S3a,S3b |
| gongsun-long-later-mohists | 13 | 2 | r1: P4-4 / r2: P4-4 / r3: P2-8 |
| dopamine-motor-control | 11 | 5 | r1:  / r2: P2-10 / r3:  |
| dopamine-motor-control | 12 | 5 | r1: P4-5 / r2: P4-6 / r3: P4-6 |
| dopamine-motor-control | 13 | 2 | r1:  / r2: S6b / r3: S6b |
| corporate-law | 11 | 3 | r1: P1-5 / r2: P1-5 / r3: P1-5,P2-16 |
| corporate-law | 12 | 1 | r1: P5-6 / r2: P5-6 / r3: P4-4 |
| information-asymmetry-free-marketplace | 12 | 3 | r1: P4-4 / r2: P4-2,P4-3 / r3: P4-2,P4-3 |
| information-asymmetry-free-marketplace | 12 | 4 | r1: P4-10,P4-11 / r2: P4-10,P4-11 / r3: P4-10 |
| surface-tension-laplace | 15 | 2 | r1: R1 / r2: C1-1 / r3: P1-3 |
| surface-tension-laplace | 16 | 4 | r1: P5-3 / r2: P6-1 / r3: P6-1 |
| mrna-vaccine-lipid-nanoparticle | 20 | 1 | r1: P4-2 / r2: P5-7 / r3: P4-2 |
| mrna-vaccine-lipid-nanoparticle | 20 | 4 | r1: P2-7 / r2:  / r3: P2-7 |

## 종류 안정성 (FALSE 선지 단위: 회차별 twistType 집합)

- 비교한 선지 57, ALL_SAME 42 (73.7%), INTERSECTION 7 (12.3%), TWO_SHARE 7 (12.3%), DISJOINT 1 (1.8%), 다수 종류가 OTHER뿐인 선지 0

| 지문 | 문항 | 선지 | 분류 | 다수 종류 | 회차별 종류 |
|---|---:|---:|---|---|---|
| gongsun-long-later-mohists | 10 | 5 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| gongsun-long-later-mohists | 11 | 1 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| gongsun-long-later-mohists | 11 | 2 | ALL_SAME | ADDED_CONTENT,NEGATION | r1: ADDED_CONTENT,NEGATION / r2: ADDED_CONTENT,NEGATION / r3: ADDED_CONTENT,NEGATION |
| gongsun-long-later-mohists | 11 | 3 | ALL_SAME | CONFLATION | r1: CONFLATION / r2: CONFLATION / r3: CONFLATION |
| gongsun-long-later-mohists | 11 | 5 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| gongsun-long-later-mohists | 12 | 4 | INTERSECTION | CONFLATION | r1: CONFLATION / r2: CONFLATION / r3: CONDITION_SHIFT,CONFLATION |
| gongsun-long-later-mohists | 13 | 1 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| gongsun-long-later-mohists | 13 | 2 | ALL_SAME | HOLDER_SWAP | r1: HOLDER_SWAP / r2: HOLDER_SWAP / r3: HOLDER_SWAP |
| gongsun-long-later-mohists | 13 | 3 | ALL_SAME | HOLDER_SWAP | r1: HOLDER_SWAP / r2: HOLDER_SWAP / r3: HOLDER_SWAP |
| gongsun-long-later-mohists | 13 | 5 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| dopamine-motor-control | 10 | 4 | DISJOINT | ABSOLUTIZE,CONDITION_SHIFT,SCOPE_EXTEND | r1: ABSOLUTIZE / r2: CONDITION_SHIFT / r3: SCOPE_EXTEND |
| dopamine-motor-control | 11 | 1 | ALL_SAME | WRONG_REASON | r1: WRONG_REASON / r2: WRONG_REASON / r3: WRONG_REASON |
| dopamine-motor-control | 11 | 3 | ALL_SAME | WRONG_REASON | r1: WRONG_REASON / r2: WRONG_REASON / r3: WRONG_REASON |
| dopamine-motor-control | 11 | 4 | ALL_SAME | WRONG_REASON | r1: WRONG_REASON / r2: WRONG_REASON / r3: WRONG_REASON |
| dopamine-motor-control | 11 | 5 | TWO_SHARE | ADDED_CONTENT | r1: ADDED_CONTENT / r2: SUBSTITUTION / r3: ADDED_CONTENT |
| dopamine-motor-control | 12 | 1 | ALL_SAME | CONDITION_SHIFT | r1: CONDITION_SHIFT / r2: CONDITION_SHIFT / r3: CONDITION_SHIFT |
| dopamine-motor-control | 12 | 2 | ALL_SAME | PAIR_SWAP | r1: PAIR_SWAP / r2: PAIR_SWAP / r3: PAIR_SWAP |
| dopamine-motor-control | 12 | 4 | ALL_SAME | SCOPE_EXTEND | r1: SCOPE_EXTEND / r2: SCOPE_EXTEND / r3: SCOPE_EXTEND |
| dopamine-motor-control | 12 | 5 | TWO_SHARE | SCOPE_EXTEND | r1: SCOPE_EXTEND / r2: NEGATION / r3: SCOPE_EXTEND |
| dopamine-motor-control | 13 | 2 | INTERSECTION | ADDED_CONTENT | r1: ADDED_CONTENT / r2: ADDED_CONTENT,SCOPE_EXTEND / r3: ADDED_CONTENT,SCOPE_EXTEND |
| corporate-law | 10 | 3 | ALL_SAME | ABSOLUTIZE | r1: ABSOLUTIZE / r2: ABSOLUTIZE / r3: ABSOLUTIZE |
| corporate-law | 11 | 1 | ALL_SAME | ABSOLUTIZE | r1: ABSOLUTIZE / r2: ABSOLUTIZE / r3: ABSOLUTIZE |
| corporate-law | 11 | 2 | ALL_SAME | ABSOLUTIZE | r1: ABSOLUTIZE / r2: ABSOLUTIZE / r3: ABSOLUTIZE |
| corporate-law | 11 | 3 | INTERSECTION | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION,SCOPE_EXTEND |
| corporate-law | 11 | 5 | ALL_SAME | SUBSTITUTION | r1: SUBSTITUTION / r2: SUBSTITUTION / r3: SUBSTITUTION |
| corporate-law | 12 | 1 | ALL_SAME | CONFLATION | r1: CONFLATION / r2: CONFLATION / r3: CONFLATION |
| corporate-law | 13 | 2 | INTERSECTION | ADDED_CONTENT | r1: ADDED_CONTENT,CONFLATION / r2: ADDED_CONTENT,CAUSE_SWAP,SUBSTITUTION / r3: ADDED_CONTENT,CAUSE_SWAP,SUBSTITUTION |
| information-asymmetry-free-marketplace | 10 | 1 | ALL_SAME | ADDED_METHOD | r1: ADDED_METHOD / r2: ADDED_METHOD / r3: ADDED_METHOD |
| information-asymmetry-free-marketplace | 10 | 3 | ALL_SAME | ADDED_METHOD | r1: ADDED_METHOD / r2: ADDED_METHOD / r3: ADDED_METHOD |
| information-asymmetry-free-marketplace | 10 | 4 | ALL_SAME | ADDED_METHOD | r1: ADDED_METHOD / r2: ADDED_METHOD / r3: ADDED_METHOD |
| information-asymmetry-free-marketplace | 10 | 5 | ALL_SAME | ADDED_METHOD | r1: ADDED_METHOD / r2: ADDED_METHOD / r3: ADDED_METHOD |
| information-asymmetry-free-marketplace | 11 | 3 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| information-asymmetry-free-marketplace | 12 | 1 | ALL_SAME | ADDED_CONTENT,NEGATION | r1: ADDED_CONTENT,NEGATION / r2: ADDED_CONTENT,NEGATION / r3: ADDED_CONTENT,NEGATION |
| information-asymmetry-free-marketplace | 12 | 2 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| information-asymmetry-free-marketplace | 12 | 3 | TWO_SHARE | DIRECTION | r1: DIRECTION / r2: DIRECTION / r3: PAIR_SWAP |
| information-asymmetry-free-marketplace | 12 | 4 | INTERSECTION | SUBSTITUTION | r1: CONDITION_SHIFT,SUBSTITUTION / r2: CONDITION_SHIFT,SUBSTITUTION / r3: SUBSTITUTION |
| information-asymmetry-free-marketplace | 13 | 5 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| surface-tension-laplace | 14 | 5 | ALL_SAME | ADDED_CONTENT | r1: ADDED_CONTENT / r2: ADDED_CONTENT / r3: ADDED_CONTENT |
| surface-tension-laplace | 15 | 1 | ALL_SAME | DIRECTION | r1: DIRECTION / r2: DIRECTION / r3: DIRECTION |
| surface-tension-laplace | 15 | 2 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| surface-tension-laplace | 15 | 3 | ALL_SAME | CAUSE_SWAP | r1: CAUSE_SWAP / r2: CAUSE_SWAP / r3: CAUSE_SWAP |
| surface-tension-laplace | 15 | 5 | INTERSECTION | DEGREE | r1: CONDITION_SHIFT,DEGREE / r2: DEGREE / r3: DEGREE |
| surface-tension-laplace | 16 | 1 | TWO_SHARE | NEGATION | r1: CONDITION_SHIFT / r2: NEGATION / r3: NEGATION |
| surface-tension-laplace | 16 | 2 | ALL_SAME | DIRECTION | r1: DIRECTION / r2: DIRECTION / r3: DIRECTION |
| surface-tension-laplace | 16 | 4 | ALL_SAME | NEGATION | r1: NEGATION / r2: NEGATION / r3: NEGATION |
| surface-tension-laplace | 16 | 5 | TWO_SHARE | DIRECTION | r1: DIRECTION / r2: DIRECTION / r3: CONDITION_SHIFT |
| mrna-vaccine-lipid-nanoparticle | 16 | 1 | ALL_SAME | SUBSTITUTION | r1: SUBSTITUTION / r2: SUBSTITUTION / r3: SUBSTITUTION |
| mrna-vaccine-lipid-nanoparticle | 16 | 3 | ALL_SAME | CAUSE_SWAP,SUBSTITUTION | r1: CAUSE_SWAP,SUBSTITUTION / r2: CAUSE_SWAP,SUBSTITUTION / r3: CAUSE_SWAP,SUBSTITUTION |
| mrna-vaccine-lipid-nanoparticle | 16 | 4 | ALL_SAME | ADDED_CONTENT | r1: ADDED_CONTENT / r2: ADDED_CONTENT / r3: ADDED_CONTENT |
| mrna-vaccine-lipid-nanoparticle | 16 | 5 | ALL_SAME | SUBSTITUTION | r1: SUBSTITUTION / r2: SUBSTITUTION / r3: SUBSTITUTION |
| mrna-vaccine-lipid-nanoparticle | 17 | 1 | TWO_SHARE | PAIR_SWAP | r1: SUBSTITUTION / r2: PAIR_SWAP / r3: PAIR_SWAP |
| mrna-vaccine-lipid-nanoparticle | 18 | 5 | ALL_SAME | CAUSE_SWAP | r1: CAUSE_SWAP / r2: CAUSE_SWAP / r3: CAUSE_SWAP |
| mrna-vaccine-lipid-nanoparticle | 19 | 5 | ALL_SAME | ADDED_CONTENT | r1: ADDED_CONTENT / r2: ADDED_CONTENT / r3: ADDED_CONTENT |
| mrna-vaccine-lipid-nanoparticle | 20 | 1 | TWO_SHARE | DIRECTION | r1: NEGATION / r2: DIRECTION / r3: DIRECTION |
| mrna-vaccine-lipid-nanoparticle | 20 | 3 | ALL_SAME | ADDED_CONTENT | r1: ADDED_CONTENT / r2: ADDED_CONTENT / r3: ADDED_CONTENT |
| mrna-vaccine-lipid-nanoparticle | 20 | 4 | INTERSECTION | ADDED_CONTENT | r1: ADDED_CONTENT,CONDITION_SHIFT / r2: ADDED_CONTENT / r3: ADDED_CONTENT,CONDITION_SHIFT |
| mrna-vaccine-lipid-nanoparticle | 20 | 5 | ALL_SAME | ADDED_CONTENT,SUBSTITUTION | r1: ADDED_CONTENT,SUBSTITUTION / r2: ADDED_CONTENT,SUBSTITUTION / r3: ADDED_CONTENT,SUBSTITUTION |

## 비틂 조각 전체 (검토용)

### gongsun-long-later-mohists r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 5 | FALSE | 공손룡과 후기 묵가는 수많은 사물 가운데 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 하였다. | NEGATION | 단일 대상을 지시하는 사명의 인정을 단일 대상에 대한 명명 불가능으로 | P5-8 | 사명은 가리키는 대상이 오직 하나인 명을 말한다. | 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 |
| 11 | 1 | FALSE | 명이 제 역할을 하여 혼란이 나타나지 않게 될 것이다. | NEGATION | 같은 명으로 다른 실을 지시할 때의 혼란 발생을 혼란 방지로 | P2-11 | 그 결과 어떤 사람은 ‘이것’이라는 명으로 이것이라는 실을, 다른 사람은 ‘이것’이라는 명으로 저것이라는 실을 지시하는 혼란이 나타나게 된다. | 혼란이 나타나지 않게 될 것이다 |
| 11 | 2 | FALSE | 학이라는 명은 형체를 가리키는 단어가 아니므로, | ADDED_CONTENT | 학이라는 명이 형체를 가리키지 않는다는 단정 추가 |  |  | 학이라는 명은 형체를 가리키는 단어가 아니므로 |
| 11 | 2 | FALSE | 그 명으로는 이것과 저것이라는 실을 부를 수 없다. | NEGATION | 명의 실 지시 기능을 해당 명으로 실을 부를 수 없음으로 | P2-4 | ‘실’은 ‘물’에서 분화된 각각의 개체이고, 이를 지시하는 역할을 하는 것이 ‘명’이다. | 그 명으로는 이것과 저것이라는 실을 부를 수 없다 |
| 11 | 3 | FALSE | 그 두 학은 동일한 실이 서로 다른 명으로 불린 것이다. | CONFLATION | 서로 다른 두 개체를 동일한 실로 | P4-13 | 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다. | 그 두 학은 동일한 실 |
| 11 | 5 | FALSE | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법이다. | NEGATION | 구분해야 하는 말·흰 말의 용법을 서로 바꾸어도 올바른 용법으로 | P3-12 | 공손룡은 ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다. | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법 |
| 12 | 4 | FALSE | ⓓ라는 명과 ⓔ라는 명이 같은 대상을 지시하고 있으므로, 공손룡은 특정 속성이 지정되지 않은 단어로 특정 속성을 가진 대상을 지시하는 문제가 나타나고 있다고 보겠군. | CONFLATION | 특정 속성의 유무에 따라 다른 실을 지시하는 두 명을 동일 대상 지시로 | P3-11 | ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 | ⓓ라는 명과 ⓔ라는 명이 같은 대상을 지시하고 있으므로 |
| 13 | 1 | FALSE | ㉯: 기표가 서로 같으면 기의도 같아야 한다 | NEGATION | 하나의 명이 다른 실들을 지시할 가능성을 같은 실만 지시해야 함으로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기표가 서로 같으면 기의도 같아야 한다 |
| 13 | 2 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 하나의 실에 여러 명이 대응할 수 있다는 후기 묵가의 입장을 공손룡에게 | P4-4 | 후기 묵가는 어떤 실은 ‘이것’이라는 명에 의해 지시되면서 동시에 ‘저것’이라는 명에 의해서도 지시될 수 있다고 보았다. | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 하나의 실에 여러 명이 대응할 수 있다는 후기 묵가의 입장을 공손룡에게 | P4-4 | 후기 묵가는 어떤 실은 ‘이것’이라는 명에 의해 지시되면서 동시에 ‘저것’이라는 명에 의해서도 지시될 수 있다고 보았다. | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 | HOLDER_SWAP | 하나의 실은 하나의 명으로만 지시되어야 한다는 공손룡의 입장을 후기 묵가에게 | P2-8 | 그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과 | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 |
| 13 | 5 | FALSE | ㉯: 기의가 서로 다르면서 기표가 같을 수는 없다 | NEGATION | 서로 다른 실을 하나의 명으로 지시할 수 있음을 불가능으로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기의가 서로 다르면서 기표가 같을 수는 없다 |

### dopamine-motor-control r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 4 | FALSE | 도파민성 뉴런에서 분비된 도파민 중 도파민 수용체에 결합하지 않은 것은 모두 뉴런 밖에서 분해된다. | ABSOLUTIZE | DAT가 없는 뉴런에서 분비된 도파민의 외부 분해를 수용체에 결합하지 않은 도파민 모두의 외부 분해로 | P2-14 | 다만 모든 도파민성 뉴런에 DAT가 있는 것은 아니기 때문에 DAT가 없는 도파민성 뉴런에서 분비된 도파민은 뉴런 밖에서 분해된다. | 도파민 수용체에 결합하지 않은 것은 모두 뉴런 밖에서 분해된다. |
| 11 | 1 | FALSE | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 | WRONG_REASON | 재흡수된 도파민의 내부 분해를 뉴런별 조절 양상 차이의 이유로 | P2-12 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 |
| 11 | 3 | FALSE | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 | WRONG_REASON | D2 수용체의 도파민성 뉴런 위치 가능성을 뉴런별 조절 양상 차이의 이유로 | P2-4 | 이 중 D2 계열 수용체는 시냅스 후 뉴런뿐만 아니라 시냅스 전 뉴런인 도파민성 뉴런에도 위치할 수 있다. | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 |
| 11 | 4 | FALSE | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 | WRONG_REASON | 재흡수 후 소포 저장을 뉴런별 조절 양상 차이의 이유로 | P2-11 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 |
| 11 | 5 | FALSE | 도파민성 뉴런의 DAT 존재 여부에 따라 도파민성 뉴런에서 합성되는 도파민의 양이 달라지기 | ADDED_CONTENT | DAT 유무에 따른 도파민 합성량 변화라는 인과 추가 |  |  | DAT 존재 여부에 따라 도파민성 뉴런에서 합성되는 도파민의 양이 달라지기 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 | CONDITION_SHIFT | 선조체 활성화 시의 경로별 대조를 도파민 분비 시의 결과 대조로 | R28 | 따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 목표하는 운동의 시작을 수월하게 함으로써 운동을 촉진하게 된다. | ㉠은 ㉡과 달리 |
| 12 | 2 | FALSE | ㉡은 ㉠과 달리 선조체 뉴런이 활성화되면 시상으로 가바가 분비되지 않는다. | PAIR_SWAP | 직접 경로의 시상 가바 분비 중단을 간접 경로의 특성으로 | P3-8 | 선조체와 내측 창백핵이 직접 연결되는 직접 경로에서는 선조체 뉴런이 활성화되어 내측 창백핵으로 가바가 분비되면 시상으로 연결된 내측 창백핵 뉴런의 활성이 억제된다. 이로 인해 시상으로 가바가 분비되지 않으면 | ㉡은 ㉠과 달리 |
| 12 | 4 | FALSE | ㉠과 ㉡은 모두 선조체 뉴런이 활성화되면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화된다. | SCOPE_EXTEND | 직접 경로 활성화에 따른 시상 탈억제를 두 경로 모두로 확대 | P3-9 | 이로 인해 시상으로 가바가 분비되지 않으면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화되면서 | ㉠과 ㉡은 모두 |
| 12 | 5 | FALSE | ㉠과 ㉡은 모두 흑질의 도파민성 뉴런에서 분비된 도파민이 각 경로를 이루는 선조체 뉴런 내 신호 전달의 활성을 유도하게 된다. | SCOPE_EXTEND | 도파민의 직접 경로 활성 유도를 간접 경로까지 확대 | P4-5 | 따라서 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 | ㉠과 ㉡은 모두 |
| 13 | 2 | FALSE | 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군. | ADDED_CONTENT | 카르비도파에 흑질 도파민의 작용 기간 연장 기능 추가 |  |  | 흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군. |

### corporate-law r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 3 | FALSE | 주식회사의 자본금과 재단 법인의 기본 재산은 어떠한 경우에도 감액이 금지되어 있다. | ABSOLUTIZE | 자본금의 원칙적 감액 금지와 기본 재산의 허가 조건부 감액을 예외 없는 금지로 | P4-6,P2-13 | 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 어떠한 경우에도 감액이 금지되어 있다. |
| 11 | 1 | FALSE | 기본 재산은 법인의 설립 목적대로만 사용되어야 한다. | ABSOLUTIZE | 허가에 따른 처분·용도 변경 가능성을 배제한 사용 목적의 절대적 고정 | P2-13 | 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 설립 목적대로만 사용되어야 한다. |
| 11 | 2 | FALSE | 법인의 목적 사업을 위한 재원은 개인의 출자에 의해서만 형성될 수 있다. | ABSOLUTIZE | 수익 추구로도 마련하는 목적 사업 재원의 형성 경로를 개인 출자로만 한정 | P2-15 | 기본 재산 외의 자산으로 수익을 추구하는 것이 가능하지만, 이는 영리 목적이 아니라 법인의 목적 사업 재원을 마련하기 위한 것으로 | 개인의 출자에 의해서만 형성될 수 있다. |
| 11 | 3 | FALSE | 자산에 대한 소유권은 인정되지 않지만 | NEGATION | 법인에게 귀속되는 자산 소유권을 불인정으로 | P1-5 | 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다. | 소유권은 인정되지 않지만 |
| 11 | 5 | FALSE | 운용 과정에서의 결정은 사회ㆍ경제 공동체 전체의 판단에 의해 이루어진다. | SUBSTITUTION | 주요 결정의 허가 기관을 관할 기관에서 공동체 전체로 | P2-10 | 주요 사항을 결정할 때는 반드시 관할 기관의 허가를 받아야 한다. | 사회ㆍ경제 공동체 전체의 판단에 의해 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 실행 이후에도 자본금의 총량은 그대로 유지된다. | CONFLATION | 무상 증자 후 자산 총 규모 불변을 자본금 총량 불변으로 | P5-6 | 자산의 총 규모는 변하지 않기 때문에 | 자본금의 총량은 그대로 유지된다. |
| 13 | 2 | FALSE | 주주들에 의해 | ADDED_CONTENT | 주주들이 법인격을 부여한다는 내용 추가 |  |  | 주주들에 의해 |
| 13 | 2 | FALSE | 법인격이 부여되었기 때문이겠군. | CONFLATION | 구성원 단체의 법인격과 개인에게 부여되는 자산 운용 권한을 혼동 | P3-5,P1-7 | 법인격은 주식회사의 구성원 단체에 부여된다. | 법인격이 부여되었기 때문이겠군. |

### information-asymmetry-free-marketplace r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 1 | FALSE | 정보 비대칭 상황의 장단점을 분석하여 제시하고 있다. | ADDED_METHOD | 문제 상황과 대응 논의를 장단점 분석으로 |  |  | 장단점을 분석하여 |
| 10 | 3 | FALSE | 정보 비대칭 상황에 대한 사람들의 인식 변화를 통시적으로 설명하고 있다. | ADDED_METHOD | 상반된 입장 소개를 인식 변화의 통시적 설명으로 |  |  | 사람들의 인식 변화를 통시적으로 설명하고 있다. |
| 10 | 4 | FALSE | 정보 비대칭 상황을 분류하는 기준의 문제점을 사례를 들어 규명하고 있다. | ADDED_METHOD | 정부 개입 논쟁의 사례 제시를 분류 기준의 문제점 규명으로 |  |  | 분류하는 기준의 문제점을 사례를 들어 규명하고 있다. |
| 10 | 5 | FALSE | 정보 비대칭 상황에 대한 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다. | ADDED_METHOD | 기존 이론과 비판론의 대비를 새로운 개념의 재구성으로 |  |  | 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다. |
| 11 | 3 | FALSE | 그 의도가 이용자에 의해 쉽게 파악되므로 | NEGATION | 광고의 의도를 알기 어려움을 쉽게 파악됨으로 | P2-3 | 이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 | 그 의도가 이용자에 의해 쉽게 파악되므로 |
| 12 | 1 | FALSE | ㉠은 가치가 없는 정치적 표현을 정부가 사전에 차단해야 | NEGATION | 정부 개입 금지를 정부의 사전 차단 요구로 | P3-3 | 정부가 개입하면 안 된다. | 정부가 사전에 차단해야 |
| 12 | 1 | FALSE | 그 해악이 사상의 자유 시장에서 해소된다고 본다. | ADDED_CONTENT | 정부의 사전 차단에 따른 해악 해소 기제 추가 |  |  | 그 해악이 사상의 자유 시장에서 해소된다고 본다. |
| 12 | 2 | FALSE | ㉠은 미국 연방 대법원이 명백하고 현존하는 위험한 표현을 보호하는 판결의 근거이고, | NEGATION | 명백하고 현존하는 위험이 없는 표현의 보호를 위험한 표현의 보호로 | P3-4 | 명백하고 현존하는 위험에 해당하지 않는 표현은 기본권으로 보호하고 | 명백하고 현존하는 위험한 표현을 보호하는 |
| 12 | 3 | FALSE | 허위 정보에 비해 진실한 정보가 과잉 공급되는 정보 비대칭에서 비롯된다고 본다. | DIRECTION | 진실한 정보의 과소 공급과 허위 정보의 대량 공급을 진실한 정보의 상대적 과잉 공급으로 | P4-4 | 진실한 정보는 과소 공급되고 허위·왜곡 정보가 대량 공급되는 상황에서는 다양한 의견 간의 경쟁이 이루어질 수 없다. | 허위 정보에 비해 진실한 정보가 과잉 공급되는 |
| 12 | 4 | FALSE | ㉡은 정부가 유해한 정보를 | SUBSTITUTION | 유해 정보의 사전 차단 주체를 플랫폼 사업자에서 정부로 | P4-10 | 유해하거나 불법인 정보를 플랫폼 사업자가 사전에 자율적으로 삭제하거나 차단하고 | 정부가 |
| 12 | 4 | FALSE | 미리 차단 조치해야 | CONDITION_SHIFT | 플랫폼 조치가 미흡할 때의 정부 사후 규제를 정부의 사전 차단으로 | P4-11 | 미흡하면 사후에 정부가 규제해야 한다는 것이다. | 미리 차단 조치해야 |
| 13 | 5 | FALSE | 플랫폼 B가 실명 확인 절차를 거치지 않았다면, ⓑ에 대한 헌법 재판소의 결론에 따라 플랫폼 B는 법적 제재를 받겠군. | NEGATION | 실명 미확인 언론사 제재 규정의 위헌 결정을 그 규정에 따른 제재 가능으로 | P5-3 | 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다. | 플랫폼 B는 법적 제재를 받겠군. |

### surface-tension-laplace r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 14 | 5 | FALSE | 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할을 한다. | ADDED_CONTENT | 노즐에 작은 잉크 방울을 합치는 기능 추가 |  |  | 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할 |
| 15 | 1 | FALSE | 기포 안의 공기는 큰 기포에서 작은 기포로 이동한다. | DIRECTION | 작은 고압 기포에서 큰 저압 기포로의 이동을 반대로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 큰 기포에서 작은 기포로 |
| 15 | 2 | FALSE | 작은 기포와는 달리, 큰 기포에는 표면 장력이 작용하지 않는다. | NEGATION | 기포의 구형을 만드는 표면 장력의 작용을 큰 기포에서 부정 | R1 | 우리는 물방울, 비눗방울, 기포 등이 구의 형태를 취하고 있는 것을 볼 수 있다. 구형은 동일한 부피에서 표면적이 최소인 형태인데 이는 액체 분자 간의 인력으로 발생하는 표면 장력의 작용 때문이다. | 큰 기포에는 표면 장력이 작용하지 않는다. |
| 15 | 3 | FALSE | 두 기포 내부의 압력이 동일하기 때문이다. | CAUSE_SWAP | 공기 이동의 근거인 압력 차이를 압력의 동일함으로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 두 기포 내부의 압력이 동일하기 때문 |
| 15 | 5 | FALSE | 처음의 두 기포와 달리, | CONDITION_SHIFT | 처음과 합체 후에 공통인 압력 평형 관계를 시점에 따라 다른 것으로 | P1-4 | 액체 방울에서 방울의 외부 압력과 표면 장력으로 인한 압력의 합이 내부 압력과 균형을 이룰 때 방울은 그 크기를 유지한다. | 처음의 두 기포와 달리 |
| 15 | 5 | FALSE | 나중에 생성된 기포의 내부와 외부의 압력 차이는 표면 장력으로 인한 압력보다 크다. | DEGREE | 내외부 압력 차이와 표면 장력에 의한 압력의 같음을 더 큼으로 | P1-4 | 액체 방울에서 방울의 외부 압력과 표면 장력으로 인한 압력의 합이 내부 압력과 균형을 이룰 때 방울은 그 크기를 유지한다. | 표면 장력으로 인한 압력보다 크다. |
| 16 | 1 | FALSE | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리, | CONDITION_SHIFT | 구입 당시 함께 안정적으로 출력된 빨간색만 적정 범위에서 제외 | P6-1 | 일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다. | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리 |
| 16 | 2 | FALSE | 첨가제를 넣어 잉크의 오네소르게 수가 더 커진 것이겠군. | DIRECTION | 적정 범위 초과 상태에서의 수 감소를 수 증가로 | P6-3 | 가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. | 오네소르게 수가 더 커진 |
| 16 | 4 | FALSE | 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났겠군. | NEGATION | 결정 요인 유지에 따른 오네소르게 수의 불변을 적정 범위 이탈로 | P5-3 | 오네소르게 수는 잉크의 점도, 표면 장력, 밀도와 잉크젯 프린터의 노즐 지름에 의해 결정된다. | 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났겠군. |
| 16 | 5 | FALSE | 파란색 잉크가 구입할 당시의 밀도와 표면 장력은 변하지 않았으나 더 끈적거리는 성질로 변하였다면 파란색 위성 잉크 방울이 생성될 수 있겠군. | DIRECTION | 오네소르게 수가 커지는 상황에 수가 작은 경우의 위성 방울 생성을 대응 | P6-4 | 가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다. | 파란색 위성 잉크 방울이 생성될 수 있겠군. |

### mrna-vaccine-lipid-nanoparticle r1

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 16 | 1 | FALSE | 항체로 이용하여 면역 반응을 유도한다. | SUBSTITUTION | 바이러스 단백질의 항원 역할을 항체 역할로 | P1-7 | 생물체는 바이러스 단백질을 항원으로 인식하고 항체를 만들어 대항하거나 | 항체로 이용하여 |
| 16 | 3 | FALSE | 기억 세포의 유전 정보를 암호화한 유전 물질을 이용하기 | SUBSTITUTION | 암호화 대상을 바이러스 단백질에서 기억 세포로 | P2-1 | mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것으로 | 기억 세포의 유전 정보를 암호화한 |
| 16 | 3 | FALSE | 때문에 바이러스 감염으로부터 안전하다. | CAUSE_SWAP | 바이러스가 아니라는 안전성 근거를 기억 세포 정보 이용으로 | R9 | mRNA 백신은 바이러스가 아니기 때문에 인체가 바이러스에 감염될 위험이 없으며 | 때문에 바이러스 감염으로부터 안전하다. |
| 16 | 4 | FALSE | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 | ADDED_CONTENT | mRNA 백신에 세포핵 내 전사 조절 기능 추가 |  |  | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 |
| 16 | 5 | FALSE | 유전 정보가 제거된 바이러스 단백질을 백신으로 주입한다. | SUBSTITUTION | 유전 정보를 암호화한 mRNA 주입을 유전 정보가 제거된 단백질 주입으로 | P2-1 | mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것으로 | 유전 정보가 제거된 바이러스 단백질을 백신으로 주입한다. |
| 17 | 1 | FALSE | 지방산이 세포질에 접하는 형태로 구성된다. | SUBSTITUTION | 세포질 수용액에 접하는 인산기 머리를 지방산 꼬리로 | P3-8 | 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고 | 지방산이 세포질에 접하는 |
| 18 | 5 | FALSE | ⓐ와 결합하면서 ⓓ가 전기적으로 중성이 되기 | CAUSE_SWAP | 높은 pH에서 수소 이온을 적게 받는 중성화 원인을 mRNA 결합으로 | R32 | pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 | ⓐ와 결합하면서 ⓓ가 전기적으로 중성이 |
| 19 | 5 | FALSE | 이온화 지질의 소수성이 약해져 | ADDED_CONTENT | pH 상승에 따른 소수성 약화 기제 추가 |  |  | 이온화 지질의 소수성이 약해져 |
| 19 | 5 | FALSE | 소수성 분자 간의 인력이 감소하므로 | ADDED_CONTENT | pH 상승에 따른 소수성 분자 간 인력 감소 추가 |  |  | 소수성 분자 간의 인력이 감소하므로 |
| 19 | 5 | FALSE | 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군. | ADDED_CONTENT | 인력 감소에 따른 복합체 크기 감소 결과 추가 |  |  | 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군. |
| 20 | 1 | FALSE | mRNA와 지질 나노 입자 사이에 전기적인 반발력이 발생하기 때문이다. | NEGATION | 양이온성 지질과 음전하 대상 사이의 비반발을 mRNA와의 반발 발생으로 | P4-2 | 음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면 음전하를 띤 세포막의 인산기 머리와 서로 반발하지 않기 때문이다. | mRNA와 지질 나노 입자 사이에 전기적인 반발력이 발생하기 |
| 20 | 3 | FALSE | 엔도솜 내부의 산성화에 따라 다시 세포 표면으로 방출되기 때문이다. | ADDED_CONTENT | 산성화된 엔도솜 막의 세포 표면 재방출 과정 추가 |  |  | 다시 세포 표면으로 방출되기 |
| 20 | 4 | FALSE | mRNA가 음이온화되면서 | CONDITION_SHIFT | 원래 지닌 mRNA의 음전하를 엔도솜 산성화에 따른 새 변화로 | P2-7 | 체내에서 불안정할 뿐 아니라 분자의 크기가 크고 음전하를 띠고 있어 | mRNA가 음이온화되면서 |
| 20 | 4 | FALSE | mRNA와 리보솜 사이에 결합력이 발생하기 때문이다. | ADDED_CONTENT | 산성화와 mRNA 음이온화에 따른 리보솜 결합력 발생 기제 추가 |  |  | mRNA와 리보솜 사이에 결합력이 발생하기 |
| 20 | 5 | FALSE | 엔도솜 내부의 pH 변화로 인해 엔도솜 막이 산성화되면서 | SUBSTITUTION | 산성화 대상을 엔도솜 내부에서 엔도솜 막으로 | P5-12 | 세포질에서 엔도솜 내부는 산성화되는데 | 엔도솜 막이 산성화되면서 |
| 20 | 5 | FALSE | 체내 효소에 의한 엔도솜 분해 작용이 나타나기 때문이다. | ADDED_CONTENT | 체내 효소에 의한 엔도솜 분해 기제 추가 |  |  | 체내 효소에 의한 엔도솜 분해 작용이 나타나기 |

### gongsun-long-later-mohists r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 5 | FALSE | 공손룡과 후기 묵가는 수많은 사물 가운데 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 하였다. | NEGATION | 단 하나의 대상을 지시하는 명의 인정을 명명 불가능으로 | P5-8 | 사명은 가리키는 대상이 오직 하나인 명을 말한다. | 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 |
| 11 | 1 | FALSE | 명이 제 역할을 하여 혼란이 나타나지 않게 될 것이다. | NEGATION | 같은 명으로 다른 실을 지시할 때의 혼란 발생을 혼란 없음으로 | P2-11 | 어떤 사람은 ‘이것’이라는 명으로 이것이라는 실을, 다른 사람은 ‘이것’이라는 명으로 저것이라는 실을 지시하는 혼란이 나타나게 된다. | 명이 제 역할을 하여 혼란이 나타나지 않게 |
| 11 | 2 | FALSE | 학이라는 명은 형체를 가리키는 단어가 아니므로, | ADDED_CONTENT | 학이라는 명이 형체를 가리키지 않는다는 분류의 추가 |  |  | 학이라는 명은 형체를 가리키는 단어가 아니므로 |
| 11 | 2 | FALSE | 그 명으로는 이것과 저것이라는 실을 부를 수 없다. | NEGATION | 명의 실 지시 기능을 학이라는 명의 지시 불가능으로 | P2-4 | ‘실’은 ‘물’에서 분화된 각각의 개체이고, 이를 지시하는 역할을 하는 것이 ‘명’이다. | 그 명으로는 이것과 저것이라는 실을 부를 수 없다 |
| 11 | 3 | FALSE | 그 두 학은 동일한 실이 서로 다른 명으로 불린 것이다. | CONFLATION | 서로 다른 두 마리의 학을 동일한 실로 | P4-13 | 이것과 저것, 두 마리의 새가 모두 학이라면 이것과 저것을 모두 ‘학’이라고 부를 수 있다는 예시를 들었다. | 그 두 학은 동일한 실 |
| 11 | 5 | FALSE | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법이다. | NEGATION | 말과 흰 말의 용법 구분 요구를 서로 바꾸어 지시하는 용법의 승인으로 | P3-12 | ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다. | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법 |
| 12 | 4 | FALSE | ⓓ라는 명과 ⓔ라는 명이 같은 대상을 지시하고 있으므로, | CONFLATION | 일반적인 옷과 빨간 옷의 서로 다른 지시 대상을 같은 대상으로 | P3-11 | ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 | ⓓ라는 명과 ⓔ라는 명이 같은 대상을 지시하고 |
| 13 | 1 | FALSE | ㉯: 기표가 서로 같으면 기의도 같아야 한다 | NEGATION | 하나의 명이 서로 다른 실을 지시할 수 있음을 같은 실만 지시해야 함으로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기표가 서로 같으면 기의도 같아야 한다 |
| 13 | 2 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 후기 묵가의 하나의 실에 대한 복수 명 허용을 공손룡의 입장으로 | P4-4 | 후기 묵가는 어떤 실은 ‘이것’이라는 명에 의해 지시되면서 동시에 ‘저것’이라는 명에 의해서도 지시될 수 있다고 보았다. | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 후기 묵가의 하나의 실에 대한 복수 명 허용을 공손룡의 입장으로 | P4-4 | 후기 묵가는 어떤 실은 ‘이것’이라는 명에 의해 지시되면서 동시에 ‘저것’이라는 명에 의해서도 지시될 수 있다고 보았다. | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 | HOLDER_SWAP | 공손룡의 하나의 실에 대한 복수 명 금지를 후기 묵가의 입장으로 | P2-8 | 그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것과 | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 |
| 13 | 5 | FALSE | ㉯: 기의가 서로 다르면서 기표가 같을 수는 없다 | NEGATION | 서로 다른 실에 대한 동일 명의 지시 가능을 지시 불가능으로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기의가 서로 다르면서 기표가 같을 수는 없다 |

### dopamine-motor-control r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 4 | FALSE | 도파민성 뉴런에서 분비된 도파민 중 도파민 수용체에 결합하지 않은 것은 모두 뉴런 밖에서 분해된다. | CONDITION_SHIFT | DAT 없는 뉴런에서 분비된 경우의 세포 밖 분해를 수용체에 결합하지 않은 모든 경우로 | P2-14 | DAT가 없는 도파민성 뉴런에서 분비된 도파민은 뉴런 밖에서 분해된다. | 도파민 수용체에 결합하지 않은 것은 모두 뉴런 밖에서 분해된다. |
| 11 | 1 | FALSE | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 | WRONG_REASON | 재흡수된 도파민의 세포 내 분해를 뉴런별 조절 양상 차이의 이유로 | P2-12 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 |
| 11 | 3 | FALSE | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 | WRONG_REASON | 자가 수용체를 통한 조절 가능성을 뉴런별 조절 양상 차이의 이유로 | P2-4 | 이 중 D2 계열 수용체는 시냅스 후 뉴런뿐만 아니라 시냅스 전 뉴런인 도파민성 뉴런에도 위치할 수 있다. | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 |
| 11 | 4 | FALSE | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 | WRONG_REASON | 재흡수 후 저장이라는 처리 방식을 뉴런별 조절 양상 차이의 이유로 | P2-11 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 |
| 11 | 5 | FALSE | 도파민성 뉴런에서 합성되는 도파민의 양이 달라지기 | SUBSTITUTION | DAT의 분비된 도파민 재흡수 기능을 도파민 합성량 조절 기능으로 | P2-10 | 시냅스 틈으로 분비된 도파민 중 일부는 도파민 수용체에 결합하지 않고 도파민성 뉴런에 위치한 도파민 수송체(DAT)에 의해 도파민성 뉴런으로 재흡수되기도 한다. | 합성되는 도파민의 양이 달라지기 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 흑질의 도파민성 뉴런에서 도파민이 분비되면 대뇌 피질의 운동 영역으로 글루타메이트가 분비된다. | CONDITION_SHIFT | 선조체 활성화 때의 경로별 상반된 결과를 도파민 분비 때의 차이로 | R28 | 따라서 이후 직접 경로와는 상반된 작용이 일어나 운동이 차단된다. | ㉠은 ㉡과 달리 |
| 12 | 2 | FALSE | ㉡은 ㉠과 달리 선조체 뉴런이 활성화되면 시상으로 가바가 분비되지 않는다. | PAIR_SWAP | 직접 경로의 시상으로의 가바 분비 억제를 간접 경로의 특성으로 | P3-8 | 이로 인해 시상으로 가바가 분비되지 않으면 | ㉡은 ㉠과 달리 |
| 12 | 4 | FALSE | ㉠과 ㉡은 모두 선조체 뉴런이 활성화되면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화된다. | SCOPE_EXTEND | 직접 경로의 선조체 활성화에 따른 시상 활성화를 간접 경로까지 확대 | P3-9 | 시상으로 가바가 분비되지 않으면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화되면서 | ㉠과 ㉡은 모두 |
| 12 | 5 | FALSE | ㉠과 ㉡은 모두 흑질의 도파민성 뉴런에서 분비된 도파민이 각 경로를 이루는 선조체 뉴런 내 신호 전달의 활성을 유도하게 된다. | NEGATION | 간접 경로 선조체의 신호 전달 활성 억제를 활성 유도로 | P4-6 | 직접 경로를 활성화하고 간접 경로는 억제하여 | ㉠과 ㉡은 모두 |
| 13 | 2 | FALSE | 흑질에서 | SCOPE_EXTEND | 말초 조직에 한정된 카르비도파의 작용을 뇌의 흑질까지 확대 | S6b | 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함. | 흑질에서 |
| 13 | 2 | FALSE | 합성된 도파민의 작용 기간을 연장할 수 있겠군. | ADDED_CONTENT | 도파민 합성 효소 억제에 이미 합성된 도파민의 작용 기간 연장 기능 추가 |  |  | 합성된 도파민의 작용 기간을 연장할 수 있겠군. |

### corporate-law r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 3 | FALSE | 주식회사의 자본금과 재단 법인의 기본 재산은 어떠한 경우에도 감액이 금지되어 있다. | ABSOLUTIZE | 자본금의 원칙적 감액 금지와 기본 재산의 허가부 감액을 예외 없는 감액 금지로 | P4-6,P2-13 | 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 어떠한 경우에도 감액이 금지되어 있다. |
| 11 | 1 | FALSE | 기본 재산은 법인의 설립 목적대로만 사용되어야 한다. | ABSOLUTIZE | 허가에 따른 기본 재산 용도 변경 가능성을 당초 용도만의 사용으로 제한 | P2-13 | 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 법인의 설립 목적대로만 사용되어야 한다. |
| 11 | 2 | FALSE | 법인의 목적 사업을 위한 재원은 개인의 출자에 의해서만 형성될 수 있다. | ABSOLUTIZE | 자산 운용 수익으로도 마련 가능한 목적 사업 재원을 개인 출자로만 한정 | P2-15 | 기본 재산 외의 자산으로 수익을 추구하는 것이 가능하지만, 이는 영리 목적이 아니라 법인의 목적 사업 재원을 마련하기 위한 것으로 | 개인의 출자에 의해서만 형성될 수 있다. |
| 11 | 3 | FALSE | 자산에 대한 소유권은 인정되지 않지만 | NEGATION | 법인에 귀속되는 자산 소유권을 소유권 불인정으로 | P1-5 | 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다. | 소유권은 인정되지 않지만 |
| 11 | 5 | FALSE | 운용 과정에서의 결정은 사회ㆍ경제 공동체 전체의 판단에 의해 이루어진다. | SUBSTITUTION | 주요 사항의 허가 주체인 관할 기관을 사회ㆍ경제 공동체 전체로 | P2-10 | 주요 사항을 결정할 때는 반드시 관할 기관의 허가를 받아야 한다. | 사회ㆍ경제 공동체 전체의 판단에 의해 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 실행 이후에도 자본금의 총량은 그대로 유지된다. | CONFLATION | 무상 증자 후 자산 총 규모 불변을 자본금 총량 불변으로 | P5-6 | 무상 증자를 실행하면 자산의 구조만 재편되고 자산의 총 규모는 변하지 않기 때문에 | 자본금의 총량은 그대로 유지된다. |
| 13 | 2 | FALSE | A를 설립할 당시 개인의 재산을 출연하여 | CAUSE_SWAP | 정관이나 법령에 의한 운용 권한 부여를 개인 재산 출연에 따른 것으로 | P1-7 | 실제 자산의 운용은 법인의 정관이나 법령에서 권한을 부여한 사람에 의해 이루어진다. | 개인의 재산을 출연하여 |
| 13 | 2 | FALSE | 주주들에 의해 | ADDED_CONTENT | 주주들이 법인격을 부여한다는 주체와 절차 추가 |  |  | 주주들에 의해 |
| 13 | 2 | FALSE | 법인격이 부여되었기 때문이겠군. | SUBSTITUTION | 법인격의 귀속 대상을 구성원 단체에서 갑 개인으로 | P3-5 | 법인격은 주식회사의 구성원 단체에 부여된다. | 법인격이 부여되었기 때문이겠군. |

### information-asymmetry-free-marketplace r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 1 | FALSE | 정보 비대칭 상황의 장단점을 분석하여 제시하고 있다. | ADDED_METHOD | 문제 상황과 대응 입장 설명을 장단점 분석으로 |  |  | 장단점을 분석하여 |
| 10 | 3 | FALSE | 정보 비대칭 상황에 대한 사람들의 인식 변화를 통시적으로 설명하고 있다. | ADDED_METHOD | 상반된 입장 설명을 인식 변화의 통시적 설명으로 |  |  | 사람들의 인식 변화를 통시적으로 설명하고 있다. |
| 10 | 4 | FALSE | 정보 비대칭 상황을 분류하는 기준의 문제점을 사례를 들어 규명하고 있다. | ADDED_METHOD | 대응 입장과 사례 제시를 분류 기준의 문제점 규명으로 |  |  | 분류하는 기준의 문제점을 사례를 들어 규명하고 있다. |
| 10 | 5 | FALSE | 정보 비대칭 상황에 대한 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다. | ADDED_METHOD | 기존 이론과 비판론의 대비를 새로운 개념 재구성으로 |  |  | 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다. |
| 11 | 3 | FALSE | 그 의도가 이용자에 의해 쉽게 파악되므로 | NEGATION | 광고 의도 파악의 어려움을 쉬움으로 | P2-3 | 이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 허위·과장 광고 | 그 의도가 이용자에 의해 쉽게 파악되므로 |
| 12 | 1 | FALSE | ㉠은 가치가 없는 정치적 표현을 정부가 사전에 차단해야 | NEGATION | 표현의 진위·가치 결정에 대한 정부 개입 금지를 사전 차단 요구로 | P3-3 | 어떤 표현의 진위나 가치 여부는 다양한 의견 간의 경쟁을 통해 결정되어야 하며 정부가 개입하면 안 된다. | 정부가 사전에 차단해야 |
| 12 | 1 | FALSE | 그 해악이 사상의 자유 시장에서 해소된다고 본다. | ADDED_CONTENT | 정부 사전 차단에 따른 해악 해소 효과 추가 |  |  | 그 해악이 사상의 자유 시장에서 해소된다고 본다. |
| 12 | 2 | FALSE | ㉠은 미국 연방 대법원이 명백하고 현존하는 위험한 표현을 보호하는 판결의 근거이고, | NEGATION | 명백하고 현존하는 위험에 해당하지 않는 표현을 위험한 표현으로 | P3-4 | 명백하고 현존하는 위험에 해당하지 않는 표현은 기본권으로 보호하고 | 명백하고 현존하는 위험한 표현을 보호하는 |
| 12 | 3 | FALSE | 허위 정보에 비해 진실한 정보가 과잉 공급되는 정보 비대칭에서 비롯된다고 본다. | DIRECTION | 진실한 정보의 과소 공급과 허위 정보의 대량 공급을 진실한 정보의 상대적 과잉 공급으로 | P4-2,P4-3 | 진실한 정보는 과소 공급되고 허위·왜곡 정보가 대량 공급되는 상황 | 허위 정보에 비해 진실한 정보가 과잉 공급되는 |
| 12 | 4 | FALSE | ㉡은 정부가 | SUBSTITUTION | 유해 정보 사전 차단 주체를 플랫폼 사업자에서 정부로 | P4-10 | 유해하거나 불법인 정보를 플랫폼 사업자가 사전에 자율적으로 삭제하거나 차단하고 | 정부가 |
| 12 | 4 | FALSE | 유해한 정보를 미리 차단 조치해야 | CONDITION_SHIFT | 플랫폼 조치가 미흡한 경우의 정부 사후 규제를 정부 사전 차단으로 | P4-11 | 미흡하면 사후에 정부가 규제해야 한다는 것이다. | 미리 차단 조치해야 |
| 13 | 5 | FALSE | ⓑ에 대한 헌법 재판소의 결론에 따라 플랫폼 B는 법적 제재를 받겠군. | NEGATION | 실명 미확인 언론사 제재 규정의 위헌 결정에 따른 제재 불가를 제재 가능으로 | P5-3 | 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다. | 플랫폼 B는 법적 제재를 받겠군. |

### surface-tension-laplace r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 14 | 5 | FALSE | 잉크젯 프린터에서 노즐은 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할을 한다. | ADDED_CONTENT | 노즐에 작은 잉크 방울을 합쳐 큰 방울로 만드는 기능 추가 |  |  | 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할 |
| 15 | 1 | FALSE | 기포 안의 공기는 큰 기포에서 작은 기포로 이동한다. | DIRECTION | 작은 고압 기포에서 큰 저압 기포로의 이동을 반대 방향으로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 큰 기포에서 작은 기포로 이동한다 |
| 15 | 2 | FALSE | 작은 기포와는 달리, 큰 기포에는 표면 장력이 작용하지 않는다. | NEGATION | 기포에 작용하는 표면 장력을 큰 기포에서는 작용하지 않는 것으로 | C1-1 | 우리는 물방울, 비눗방울, 기포 등이 구의 형태를 취하고 있는 것을 볼 수 있다. 구형은 동일한 부피에서 표면적이 최소인 형태인데 이는 액체 분자 간의 인력으로 발생하는 표면 장력의 작용 때문이다. | 큰 기포에는 표면 장력이 작용하지 않는다 |
| 15 | 3 | FALSE | 두 기포 내부의 압력이 동일하기 때문이다. | CAUSE_SWAP | 압력 차이로 인한 공기 이동을 압력의 동일성 때문으로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 두 기포 내부의 압력이 동일하기 때문이다 |
| 15 | 5 | FALSE | 처음의 두 기포와 달리, 나중에 생성된 기포의 내부와 외부의 압력 차이는 표면 장력으로 인한 압력보다 크다. | DEGREE | 합체 후에도 성립하는 압력의 같음을 더 큼으로 | P1-4 | 액체 방울에서 방울의 외부 압력과 표면 장력으로 인한 압력의 합이 내부 압력과 균형을 이룰 때 방울은 그 크기를 유지한다. | 처음의 두 기포와 달리, 나중에 생성된 기포의 내부와 외부의 압력 차이는 표면 장력으로 인한 압력보다 크다 |
| 16 | 1 | FALSE | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리, | NEGATION | 안정적으로 출력된 빨간색 잉크의 적정 범위 충족을 불충족으로 | P6-1 | 일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다. | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리 |
| 16 | 2 | FALSE | 첨가제를 넣어 잉크의 오네소르게 수가 더 커진 것이겠군. | DIRECTION | 미분사 상태에서 적정 범위로의 오네소르게 수 감소를 증가로 | P6-3 | 가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. | 오네소르게 수가 더 커진 |
| 16 | 4 | FALSE | 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났겠군. | NEGATION | 변화 없는 파란색 잉크의 적정 범위 유지를 범위 이탈로 | P6-1 | 일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다. | 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났겠군 |
| 16 | 5 | FALSE | 구입 후 다섯 달이 지났을 때, 파란색 잉크가 구입할 당시의 밀도와 표면 장력은 변하지 않았으나 더 끈적거리는 성질로 변하였다면 파란색 위성 잉크 방울이 생성될 수 있겠군. | DIRECTION | 오네소르게 수가 커지는 상황에 작을 때의 위성 방울 발생을 연결 | P6-4 | 가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다. | 파란색 위성 잉크 방울이 생성될 수 있겠군 |

### mrna-vaccine-lipid-nanoparticle r2

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 16 | 1 | FALSE | 항체로 이용하여 면역 반응을 유도한다. | SUBSTITUTION | 바이러스 단백질의 역할을 항원에서 항체로 | P1-7 | 생물체는 바이러스 단백질을 항원으로 인식하고 항체를 만들어 대항하거나 | 항체로 |
| 16 | 3 | FALSE | 기억 세포의 유전 정보를 암호화한 | SUBSTITUTION | 암호화 대상을 바이러스 단백질에서 기억 세포로 | P2-1 | 바이러스 단백질의 유전 정보를 암호화한 mRNA | 기억 세포의 유전 정보를 |
| 16 | 3 | FALSE | 유전 물질을 이용하기 때문에 바이러스 감염으로부터 안전하다. | CAUSE_SWAP | 감염 위험이 없는 근거를 바이러스가 아님에서 특정 유전 물질 이용으로 | R9 | mRNA 백신은 바이러스가 아니기 때문에 인체가 바이러스에 감염될 위험이 없으며 | 유전 물질을 이용하기 때문에 |
| 16 | 4 | FALSE | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 | ADDED_CONTENT | 백신의 세포핵 내 전사 조절 기능 추가 |  |  | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 |
| 16 | 5 | FALSE | 유전 정보가 제거된 바이러스 단백질을 백신으로 주입한다. | SUBSTITUTION | 접종 물질을 유전 정보를 암호화한 mRNA에서 유전 정보가 제거된 단백질로 | P2-1 | mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것으로 | 유전 정보가 제거된 바이러스 단백질을 |
| 17 | 1 | FALSE | 지방산이 세포질에 접하는 형태로 구성된다. | PAIR_SWAP | 세포질 수용액에 접하는 부위를 친수성 머리에서 소수성 지방산 꼬리로 | P3-8 | 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고 | 지방산이 세포질에 접하는 |
| 18 | 5 | FALSE | ⓐ와 결합하면서 ⓓ가 전기적으로 중성이 되기 때문에 | CAUSE_SWAP | 중성화 원인을 높은 pH에서의 적은 수소 이온 수용에서 mRNA 결합으로 | R32 | pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 | ⓐ와 결합하면서 |
| 19 | 5 | FALSE | 이온화 지질의 소수성이 약해져 | ADDED_CONTENT | pH 상승에 따른 소수성 약화 관계 추가 |  |  | 이온화 지질의 소수성이 약해져 |
| 19 | 5 | FALSE | 소수성 분자 간의 인력이 감소하므로 | ADDED_CONTENT | pH 상승에 따른 소수성 분자 간 인력 감소 관계 추가 |  |  | 소수성 분자 간의 인력이 감소하므로 |
| 19 | 5 | FALSE | 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군. | ADDED_CONTENT | 인력 감소에 따른 복합체 크기 미세화 관계 추가 |  |  | 더욱 미세한 크기의 |
| 20 | 1 | FALSE | mRNA와 지질 나노 입자 사이에 전기적인 반발력이 발생하기 때문이다. | DIRECTION | 낮은 pH에서의 mRNA와 이온화 지질 간 결합을 전기적 반발로 | P5-7 | 낮은 pH에서 mRNA와 이온화 지질을 결합시킨 뒤 | 전기적인 반발력이 발생하기 |
| 20 | 3 | FALSE | 다시 세포 표면으로 방출되기 때문이다. | ADDED_CONTENT | 산성화된 엔도솜 막의 세포 표면 재방출 과정 추가 |  |  | 다시 세포 표면으로 방출되기 |
| 20 | 4 | FALSE | mRNA가 음이온화되면서 | ADDED_CONTENT | 엔도솜 산성화에 따른 mRNA의 음이온화 과정 추가 |  |  | mRNA가 음이온화되면서 |
| 20 | 4 | FALSE | mRNA와 리보솜 사이에 결합력이 발생하기 때문이다. | ADDED_CONTENT | 산성화와 mRNA 음이온화에 따른 리보솜 결합력 발생 기제 추가 |  |  | mRNA와 리보솜 사이에 결합력이 발생하기 |
| 20 | 5 | FALSE | 엔도솜 막이 산성화되면서 | SUBSTITUTION | 산성화되는 대상을 엔도솜 내부에서 엔도솜 막으로 | P5-12 | 세포질에서 엔도솜 내부는 산성화되는데 | 엔도솜 막이 산성화되면서 |
| 20 | 5 | FALSE | 체내 효소에 의한 엔도솜 분해 작용이 나타나기 때문이다. | ADDED_CONTENT | 체내 효소에 의한 엔도솜 분해 기제 추가 |  |  | 체내 효소에 의한 엔도솜 분해 작용 |

### gongsun-long-later-mohists r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 5 | FALSE | 공손룡과 후기 묵가는 수많은 사물 가운데 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 하였다. | NEGATION | 단일 대상을 지시하는 이름의 인정을 명명 불가능으로 | P5-8 | 사명은 가리키는 대상이 오직 하나인 명을 말한다. | 오직 하나만 있는 대상에는 이름을 붙일 수 없다고 |
| 11 | 1 | FALSE | 명이 제 역할을 하여 혼란이 나타나지 않게 될 것이다. | NEGATION | 동일 명으로 다른 실을 지시할 때의 혼란 발생을 혼란 방지로 | P2-11 | 다른 사람은 ‘이것’이라는 명으로 저것이라는 실을 지시하는 혼란이 나타나게 된다. | 명이 제 역할을 하여 혼란이 나타나지 않게 |
| 11 | 2 | FALSE | 학이라는 명은 형체를 가리키는 단어가 아니므로, | ADDED_CONTENT | 학이라는 명이 형체를 가리키지 않는다는 내용 추가 |  |  | 학이라는 명은 형체를 가리키는 단어가 아니므로 |
| 11 | 2 | FALSE | 그 명으로는 이것과 저것이라는 실을 부를 수 없다. | NEGATION | 명의 실 지시 역할을 학이라는 명의 지시 불가능으로 | P2-4 | 이를 지시하는 역할을 하는 것이 ‘명’이다. | 그 명으로는 이것과 저것이라는 실을 부를 수 없다. |
| 11 | 3 | FALSE | 그 두 학은 동일한 실이 서로 다른 명으로 불린 것이다. | CONFLATION | 서로 다른 두 학을 동일한 실로 | P4-13 | 이것과 저것, 두 마리의 새가 모두 학이라면 | 동일한 실 |
| 11 | 5 | FALSE | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법이다. | NEGATION | 구분해야 할 두 명의 용법을 올바른 교차 명명으로 | P3-12 | ‘말’이라는 명과 ‘흰 말’이라는 명은 지시하는 실이 다르므로 그 용법을 구분해야 한다고 하였다. | 말[馬]이라는 실을 ‘흰 말’이라는 명으로 부르는 것과 같은 올바른 용법 |
| 12 | 4 | FALSE | ⓓ라는 명과 ⓔ라는 명이 같은 대상을 지시하고 있으므로, | CONFLATION | 일반적인 옷과 필요한 빨간 옷의 지시 대상을 동일시 | S3a,S3b | 내 말은 옷이 정말 없다는 게 아니라, 빨간 옷이 필요한데 없다는 말이었어. | 같은 대상을 지시하고 |
| 12 | 4 | FALSE | 공손룡은 특정 속성이 지정되지 않은 단어로 특정 속성을 가진 대상을 지시하는 문제가 나타나고 있다고 보겠군. | CONDITION_SHIFT | 일반명으로 특정 속성 대상을 지시하는 상황을 서로 다른 대상을 구별한 발화에 적용 | P3-10 | 특정 속성이 지정되지 않은 ‘말’이라는 단어로 흰 말처럼 특정 속성을 가진 말[馬]을 지시하는 것 | 특정 속성이 지정되지 않은 단어로 특정 속성을 가진 대상을 지시하는 문제가 나타나고 |
| 13 | 1 | FALSE | ㉯: 기표가 서로 같으면 기의도 같아야 한다 | NEGATION | 하나의 명이 다른 실들을 지시할 가능성을 동일 실 지시 의무로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기표가 서로 같으면 기의도 같아야 한다 |
| 13 | 2 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 후기 묵가의 한 실에 대한 복수 명 허용을 공손룡의 입장으로 | P2-8 | 그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것 | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 | HOLDER_SWAP | 후기 묵가의 복수 명 지시 허용을 공손룡의 입장으로 | P2-8 | 그는 어떤 ‘실’은 그것을 가리키는 어떤 ‘명’에 의해서만 유일하게 지시되어야 한다는 것 | ㉮: 기표가 서로 달라도 기의는 같을 수 있다 |
| 13 | 3 | FALSE | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 | HOLDER_SWAP | 공손룡의 한 실에 대한 단일 명 원칙을 후기 묵가의 입장으로 | P4-4 | 후기 묵가는 어떤 실은 ‘이것’이라는 명에 의해 지시되면서 동시에 ‘저것’이라는 명에 의해서도 지시될 수 있다고 보았다. | ㉯: 기표가 서로 다르면서 기의가 같을 수는 없다 |
| 13 | 5 | FALSE | ㉯: 기의가 서로 다르면서 기표가 같을 수는 없다 | NEGATION | 서로 다른 실에 대한 동일 명의 지시 가능을 불가능으로 | P4-12 | 하나의 명이 서로 다른 사물을 지시할 수 있다고 하면서 | 기의가 서로 다르면서 기표가 같을 수는 없다 |

### dopamine-motor-control r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 4 | FALSE | 모두 뉴런 밖에서 분해된다. | SCOPE_EXTEND | DAT가 없는 뉴런의 분비물에 한정된 세포 밖 분해를 수용체 미결합 도파민 전체로 확대 | P2-14 | DAT가 없는 도파민성 뉴런에서 분비된 도파민은 뉴런 밖에서 분해된다. | 모두 뉴런 밖에서 분해된다. |
| 11 | 1 | FALSE | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 | WRONG_REASON | 재흡수된 도파민의 세포 내 분해 사실을 뉴런별 조절 양상 차이의 이유로 연결 | P2-12 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민 분해 효소가 도파민성 뉴런 내부에 있기 |
| 11 | 3 | FALSE | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 | WRONG_REASON | 자가 수용체의 위치 가능성을 뉴런별 조절 양상 차이의 충분한 이유로 연결 | P2-4 | 이 중 D2 계열 수용체는 시냅스 후 뉴런뿐만 아니라 시냅스 전 뉴런인 도파민성 뉴런에도 위치할 수 있다. | D1 계열 수용체와 달리 D2 계열 수용체는 도파민성 뉴런에도 위치할 수 있기 |
| 11 | 4 | FALSE | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 | WRONG_REASON | 재흡수 후 저장 사실을 뉴런별 조절 양상 차이의 이유로 연결 | P2-11 | 재흡수된 도파민은 시냅스 소포에 저장되었다가 재사용되거나, 도파민 분해 효소에 의해 뉴런 안에서 분해된다. | 도파민성 뉴런으로 재흡수된 도파민 중 일부는 분해되지 않고 시냅스 소포에 저장되기 |
| 11 | 5 | FALSE | 도파민성 뉴런에서 합성되는 도파민의 양이 달라지기 | ADDED_CONTENT | DAT 유무에 따른 도파민 합성량 차이라는 인과 추가 |  |  | 도파민성 뉴런에서 합성되는 도파민의 양이 달라지기 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 | CONDITION_SHIFT | 선조체 활성화 시 두 경로의 상반된 결과를 도파민 분비 시에도 유지 | R28 | 따라서 이후 직접 경로와는 상반된 작용이 일어나 운동이 차단된다. | ㉠은 ㉡과 달리 |
| 12 | 2 | FALSE | ㉡은 ㉠과 달리 선조체 뉴런이 활성화되면 시상으로 가바가 분비되지 않는다. | PAIR_SWAP | 직접 경로의 시상 가바 분비 중단을 간접 경로의 특성으로 교체 | P3-8 | 이로 인해 시상으로 가바가 분비되지 않으면 | ㉡은 ㉠과 달리 |
| 12 | 4 | FALSE | ㉠과 ㉡은 모두 선조체 뉴런이 활성화되면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화된다. | SCOPE_EXTEND | 직접 경로의 선조체 활성화에 따른 시상 탈억제를 두 경로 모두로 확대 | P3-9 | 이로 인해 시상으로 가바가 분비되지 않으면 시상의 글루타메이트성 뉴런이 억제 상태에서 벗어나 활성화되면서 | ㉠과 ㉡은 모두 |
| 12 | 5 | FALSE | ㉠과 ㉡은 모두 흑질의 도파민성 뉴런에서 분비된 도파민이 각 경로를 이루는 선조체 뉴런 내 신호 전달의 활성을 유도하게 된다. | SCOPE_EXTEND | 직접 경로의 도파민에 의한 활성 유도를 간접 경로까지 확대 | P4-6 | 흑질의 도파민성 뉴런에서 분비된 도파민은 직접 경로를 활성화하고 간접 경로는 억제하여 | ㉠과 ㉡은 모두 |
| 13 | 2 | FALSE | 흑질에서 | SCOPE_EXTEND | 말초 조직에 한정된 약물 작용 범위를 뇌의 흑질까지 확대 | S6b | 혈액-뇌 장벽을 통과하지 못하여 말초 조직에서만 작용함. | 흑질에서 |
| 13 | 2 | FALSE | 합성된 도파민의 작용 기간을 연장할 수 있겠군. | ADDED_CONTENT | 도파민 합성 효소 억제에 이미 합성된 도파민의 작용 기간 연장 기능 추가 |  |  | 합성된 도파민의 작용 기간을 연장할 수 있겠군. |

### corporate-law r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 3 | FALSE | 주식회사의 자본금과 재단 법인의 기본 재산은 어떠한 경우에도 감액이 금지되어 있다. | ABSOLUTIZE | 원칙적 감액 금지와 허가를 조건으로 한 감액을 예외 없는 감액 금지로 | P4-6,P2-13 | 특히 법인의 목적 사업 수행을 위한 자산인 기본 재산은 재단을 설립할 때 정관에 기재해 등기해야 하고, 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 어떠한 경우에도 감액이 금지되어 있다 |
| 11 | 1 | FALSE | 기본 재산은 법인의 설립 목적대로만 사용되어야 한다. | ABSOLUTIZE | 허가를 통한 처분·용도 변경 가능성을 배제한 용도 고정으로 | P2-13 | 이를 처분하거나 용도를 변경하여 액수를 줄이려면 반드시 관할 기관의 허가가 필요하다. | 법인의 설립 목적대로만 사용되어야 한다 |
| 11 | 2 | FALSE | 법인의 목적 사업을 위한 재원은 개인의 출자에 의해서만 형성될 수 있다. | ABSOLUTIZE | 수익 추구로도 마련하는 목적 사업 재원을 개인 출자에 의한 형성으로만 한정 | P2-15 | 기본 재산 외의 자산으로 수익을 추구하는 것이 가능하지만, 이는 영리 목적이 아니라 법인의 목적 사업 재원을 마련하기 위한 것으로 | 개인의 출자에 의해서만 형성될 수 있다 |
| 11 | 3 | FALSE | 자산에 대한 소유권은 인정되지 않지만 | NEGATION | 법인에 귀속되는 자산 소유권을 불인정으로 | P1-5 | 자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다. | 소유권은 인정되지 않지만 |
| 11 | 3 | FALSE | 자산을 절차에 따라 자유롭게 운용하는 것은 가능하다. | SCOPE_EXTEND | 목적과 범위가 제한된 자산 운용을 절차 준수 아래의 자유로운 운용으로 확대 | P2-16 | 일정 범위 내에서만 이루어져야 하고 | 절차에 따라 자유롭게 운용하는 것은 가능하다 |
| 11 | 5 | FALSE | 운용 과정에서의 결정은 사회ㆍ경제 공동체 전체의 판단에 의해 이루어진다. | SUBSTITUTION | 주요 사항에 대한 관할 기관의 허가를 공동체 전체의 판단으로 | P2-10 | 주요 사항을 결정할 때는 반드시 관할 기관의 허가를 받아야 한다. | 사회ㆍ경제 공동체 전체의 판단에 의해 이루어진다 |
| 12 | 1 | FALSE | ㉠은 ㉡과 달리 실행 이후에도 자본금의 총량은 그대로 유지된다. | CONFLATION | 무상 증자 시 자산 총 규모 불변을 자본금 총량 불변으로 혼동 | P4-4 | 자본금은 주식을 발행하여 조달된 자금으로, 발행된 총 주식 수에 주식의 액면가를 곱한 금액이다. | ㉠은 ㉡과 달리 실행 이후에도 자본금의 총량은 그대로 유지된다 |
| 13 | 2 | FALSE | A를 설립할 당시 개인의 재산을 출연하여 | CAUSE_SWAP | 정관·법령에 따른 자산 운용 권한 부여를 설립 당시 개인 재산 출연에 따른 것으로 | P1-7 | 실제 자산의 운용은 법인의 정관*이나 법령에서 권한을 부여한 사람에 의해 이루어진다. | A를 설립할 당시 개인의 재산을 출연하여 |
| 13 | 2 | FALSE | 주주들에 의해 | ADDED_CONTENT | 법인격 부여 주체로 주주들을 추가 |  |  | 주주들에 의해 |
| 13 | 2 | FALSE | 법인격이 부여되었기 때문이겠군. | SUBSTITUTION | 구성원 단체에 부여되는 법인격을 대표 이사 갑 개인에게 부여되는 것으로 | P3-5 | 법인격은 주식회사의 구성원 단체에 부여된다. | 법인격이 부여되었기 때문이겠군 |

### information-asymmetry-free-marketplace r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 10 | 1 | FALSE | 정보 비대칭 상황의 장단점을 분석하여 제시하고 있다. | ADDED_METHOD | 정보 비대칭의 장단점 분석이라는 없는 서술 방식 추가 |  |  | 장단점을 분석하여 제시하고 있다 |
| 10 | 3 | FALSE | 정보 비대칭 상황에 대한 사람들의 인식 변화를 통시적으로 설명하고 있다. | ADDED_METHOD | 사람들의 인식 변화에 대한 통시적 설명 추가 |  |  | 사람들의 인식 변화를 통시적으로 설명하고 있다 |
| 10 | 4 | FALSE | 정보 비대칭 상황을 분류하는 기준의 문제점을 사례를 들어 규명하고 있다. | ADDED_METHOD | 분류 기준의 문제점을 사례로 규명하는 서술 방식 추가 |  |  | 분류하는 기준의 문제점을 사례를 들어 규명하고 있다 |
| 10 | 5 | FALSE | 정보 비대칭 상황에 대한 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다. | ADDED_METHOD | 기존 개념을 종합하여 새 개념을 구성하는 서술 방식 추가 |  |  | 다양한 개념을 종합하여 새로운 개념으로 재구성하고 있다 |
| 11 | 3 | FALSE | 온라인에 유통되는 허위 광고는 그 의도가 이용자에 의해 쉽게 파악되므로 | NEGATION | 허위 광고의 의도 파악 어려움을 쉬움으로 | P2-3 | 이용자가 정보의 진위나 의도, 편향 등의 여부를 알기 어려운 허위·과장 광고 | 그 의도가 이용자에 의해 쉽게 파악되므로 |
| 12 | 1 | FALSE | ㉠은 가치가 없는 정치적 표현을 정부가 사전에 차단해야 | NEGATION | 정부 개입 금지를 정부의 사전 차단 필요로 | P3-3 | 어떤 표현의 진위나 가치 여부는 다양한 의견 간의 경쟁을 통해 결정되어야 하며 정부가 개입하면 안 된다. | 정부가 사전에 차단해야 |
| 12 | 1 | FALSE | 그 해악이 사상의 자유 시장에서 해소된다고 본다. | ADDED_CONTENT | 정부의 사전 차단을 통한 해악 해소 기제 추가 |  |  | 그 해악이 사상의 자유 시장에서 해소된다고 본다 |
| 12 | 2 | FALSE | ㉠은 미국 연방 대법원이 명백하고 현존하는 위험한 표현을 보호하는 판결의 근거이고, | NEGATION | 명백하고 현존하는 위험이 아닌 표현의 보호를 위험한 표현의 보호로 | P3-4 | 명백하고 현존하는 위험에 해당하지 않는 표현은 기본권으로 보호하고 | 명백하고 현존하는 위험한 표현을 보호하는 |
| 12 | 3 | FALSE | 허위 정보에 비해 진실한 정보가 과잉 공급되는 정보 비대칭에서 비롯된다고 본다. | PAIR_SWAP | 진실 정보 과소·허위 정보 대량 공급을 진실 정보의 상대적 과잉 공급으로 | P4-2,P4-3 | 진실한 정보는 과소 공급되고 허위·왜곡 정보가 대량 공급되는 상황 | 허위 정보에 비해 진실한 정보가 과잉 공급되는 |
| 12 | 4 | FALSE | ㉡은 정부가 유해한 정보를 미리 차단 조치해야 | SUBSTITUTION | 유해 정보 사전 차단 주체를 플랫폼 사업자에서 정부로 | P4-10 | 유해하거나 불법인 정보를 플랫폼 사업자가 사전에 자율적으로 삭제하거나 차단하고 | 정부가 유해한 정보를 미리 차단 조치해야 |
| 13 | 5 | FALSE | 플랫폼 B가 실명 확인 절차를 거치지 않았다면, ⓑ에 대한 헌법 재판소의 결론에 따라 플랫폼 B는 법적 제재를 받겠군. | NEGATION | 실명 미확인 언론사 제재 규정의 위헌 결정을 제재 가능으로 | P5-3 | 헌법 재판소 '다수 의견'은 해당 규정이 위헌이라고 결정하였다. | 헌법 재판소의 결론에 따라 플랫폼 B는 법적 제재를 받겠군 |

### surface-tension-laplace r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 14 | 5 | FALSE | 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할을 한다. | ADDED_CONTENT | 노즐에 작은 잉크 방울을 합치는 기능 추가 |  |  | 작은 잉크 방울을 합쳐 큰 잉크 방울로 만드는 역할 |
| 15 | 1 | FALSE | 기포 안의 공기는 큰 기포에서 작은 기포로 이동한다. | DIRECTION | 작은 기포에서 큰 기포로의 이동을 반대 방향으로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 큰 기포에서 작은 기포로 이동한다 |
| 15 | 2 | FALSE | 작은 기포와는 달리, 큰 기포에는 표면 장력이 작용하지 않는다. | NEGATION | 큰 기포에도 작용하는 표면 장력을 작용하지 않는 것으로 | P1-3 | 우리는 물방울, 비눗방울, 기포 등이 구의 형태를 취하고 있는 것을 볼 수 있다. 구형은 동일한 부피에서 표면적이 최소인 형태인데 이는 액체 분자 간의 인력으로 발생하는 표면 장력의 작용 때문이다. | 큰 기포에는 표면 장력이 작용하지 않는다 |
| 15 | 3 | FALSE | 두 기포 내부의 압력이 동일하기 때문이다. | CAUSE_SWAP | 공기 이동의 원인인 압력 차이를 압력 동일성으로 | P2-3 | 공기가 압력이 높은 곳에서 낮은 곳으로 이동하기 때문이다. | 두 기포 내부의 압력이 동일하기 때문이다 |
| 15 | 5 | FALSE | 처음의 두 기포와 달리, 나중에 생성된 기포의 내부와 외부의 압력 차이는 표면 장력으로 인한 압력보다 크다. | DEGREE | 표면 장력에 의한 압력과 같은 압력 차이를 더 큰 값으로 | P1-4 | 액체 방울에서 방울의 외부 압력과 표면 장력으로 인한 압력의 합이 내부 압력과 균형을 이룰 때 방울은 그 크기를 유지한다. | 내부와 외부의 압력 차이는 표면 장력으로 인한 압력보다 크다 |
| 16 | 1 | FALSE | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리, | NEGATION | 빨간색 잉크도 적정 범위에 있었음을 범위 밖인 것으로 | P6-1 | 일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다. | 구입 당시의 빨간색 잉크의 오네소르게 수와 달리 |
| 16 | 2 | FALSE | 첨가제를 넣어 잉크의 오네소르게 수가 더 커진 것이겠군. | DIRECTION | 과도한 오네소르게 수의 감소를 증가로 | P6-3 | 가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다. | 오네소르게 수가 더 커진 |
| 16 | 4 | FALSE | 구입 당시와 달리, 두 달이 지난 후 파란색 잉크의 오네소르게 수는 인쇄의 적정 범위를 벗어났겠군. | NEGATION | 변화 없는 파란색 잉크의 적정 범위 유지를 범위 이탈로 | P6-1 | 일반적으로 오네소르게 수의 범위가 대략 0.1에서 1.0 사이이면 안정적인 인쇄가 가능하다. | 인쇄의 적정 범위를 벗어났겠군 |
| 16 | 5 | FALSE | 파란색 위성 잉크 방울이 생성될 수 있겠군. | CONDITION_SHIFT | 적정 범위 미만에서의 위성 방울 생성을 적정 상태에서 점도가 증가한 상황으로 | P6-4 | 이와 반대의 경우, 수많은 위성 잉크 방울이 생겨 원치 않는 오염이 발생한다. | 파란색 위성 잉크 방울이 생성될 수 있겠군 |

### mrna-vaccine-lipid-nanoparticle r3

| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |
|---:|---:|---|---|---|---|---|---|---|
| 16 | 1 | FALSE | 항체로 이용하여 | SUBSTITUTION | 바이러스 단백질의 면역학적 역할을 항원에서 항체로 | P1-7 | 생물체는 바이러스 단백질을 항원으로 인식하고 항체를 만들어 대항하거나 | 항체로 |
| 16 | 3 | FALSE | 기억 세포의 유전 정보를 암호화한 유전 물질을 이용하기 때문에 | SUBSTITUTION | 암호화 대상을 바이러스 단백질에서 기억 세포로 | P2-1 | mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것으로 | 기억 세포의 유전 정보를 암호화한 |
| 16 | 3 | FALSE | 바이러스 감염으로부터 안전하다. | CAUSE_SWAP | 감염 위험이 없는 근거를 바이러스가 아님에서 기억 세포 유전 정보 이용으로 | R9 | mRNA 백신은 바이러스가 아니기 때문에 인체가 바이러스에 감염될 위험이 없으며 | 기억 세포의 유전 정보를 암호화한 유전 물질을 이용하기 때문에 바이러스 감염으로부터 안전하다. |
| 16 | 4 | FALSE | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 | ADDED_CONTENT | mRNA 백신의 세포핵 내 전사 조절 기제 추가 |  |  | 세포핵 안에서 유전 정보가 전사되는 과정을 조절하여 |
| 16 | 5 | FALSE | 유전 정보가 제거된 바이러스 단백질을 백신으로 주입한다. | SUBSTITUTION | 접종 물질을 유전 정보를 암호화한 mRNA에서 유전 정보가 제거된 바이러스 단백질로 | P2-1 | mRNA 백신은 바이러스 단백질의 유전 정보를 암호화한 mRNA를 접종하는 것으로 | 유전 정보가 제거된 바이러스 단백질을 백신으로 주입한다. |
| 17 | 1 | FALSE | 지방산이 세포질에 접하는 형태로 구성된다. | PAIR_SWAP | 세포질 수용액에 접하는 부위를 친수성 머리에서 소수성 지방산 꼬리로 | P3-8 | 인지질의 친수성 머리는 세포 외부나 세포질의 수용액에 접하고 소수성 꼬리는 소수성 분자 간의 인력으로 인해 서로 몰려 있는 상태로 | 지방산이 세포질에 접하는 |
| 18 | 5 | FALSE | ⓐ와 결합하면서 ⓓ가 전기적으로 중성이 되기 때문에 | CAUSE_SWAP | 중성화 원인을 높은 pH에서의 수소 이온 수용 감소에서 mRNA와의 결합으로 | R32 | pH가 높은 용액에서는 수소 이온을 적게 받아들여 이온화 지질이 전기적으로 중성이 되므로 | ⓐ와 결합하면서 ⓓ가 전기적으로 중성이 |
| 19 | 5 | FALSE | pH가 높아지면 이온화 지질의 소수성이 약해져 | ADDED_CONTENT | pH 상승에 따른 소수성 약화 관계 추가 |  |  | pH가 높아지면 이온화 지질의 소수성이 약해져 |
| 19 | 5 | FALSE | 소수성 분자 간의 인력이 감소하므로 | ADDED_CONTENT | pH 상승 과정에서 소수성 분자 간 인력이 감소한다는 연결 추가 |  |  | 소수성 분자 간의 인력이 감소하므로 |
| 19 | 5 | FALSE | 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군. | ADDED_CONTENT | 인력 감소에 따른 복합체 크기 미세화 관계 추가 |  |  | 더욱 미세한 크기의 mRNA-지질 나노 입자 복합체가 형성되겠군. |
| 20 | 1 | FALSE | mRNA와 지질 나노 입자 사이에 전기적인 반발력이 발생하기 때문이다. | DIRECTION | 음전하 mRNA와 양이온화 지질 사이의 인력을 반발력으로 | P4-2 | 음전하를 띤 mRNA가 양이온성 지질로 둘러싸이면 음전하를 띤 세포막의 인산기 머리와 서로 반발하지 않기 때문이다. | mRNA와 지질 나노 입자 사이에 전기적인 반발력이 발생 |
| 20 | 3 | FALSE | 엔도솜 내부의 산성화에 따라 다시 세포 표면으로 방출되기 때문이다. | ADDED_CONTENT | 산성화에 따른 엔도솜 막의 세포 표면 재방출 과정 추가 |  |  | 다시 세포 표면으로 방출되기 |
| 20 | 4 | FALSE | 엔도솜 내부가 산성화됨에 따라 mRNA가 음이온화되면서 | CONDITION_SHIFT | 원래 제시된 mRNA의 음전하를 엔도솜 산성화로 생기는 속성으로 | P2-7 | 분자의 크기가 크고 음전하를 띠고 있어 | 엔도솜 내부가 산성화됨에 따라 mRNA가 음이온화되면서 |
| 20 | 4 | FALSE | mRNA와 리보솜 사이에 결합력이 발생하기 때문이다. | ADDED_CONTENT | 산성화에 따른 mRNA 음이온화를 리보솜 결합력 발생 원인으로 추가 |  |  | mRNA와 리보솜 사이에 결합력이 발생하기 |
| 20 | 5 | FALSE | 엔도솜 내부의 pH 변화로 인해 엔도솜 막이 산성화되면서 | SUBSTITUTION | 산성화 대상을 엔도솜 내부에서 엔도솜 막으로 | P5-12 | 세포질에서 엔도솜 내부는 산성화되는데 | 엔도솜 막이 산성화되면서 |
| 20 | 5 | FALSE | 체내 효소에 의한 엔도솜 분해 작용이 나타나기 때문이다. | ADDED_CONTENT | 산성화 후 체내 효소가 엔도솜을 분해하는 기제 추가 |  |  | 체내 효소에 의한 엔도솜 분해 작용 |

