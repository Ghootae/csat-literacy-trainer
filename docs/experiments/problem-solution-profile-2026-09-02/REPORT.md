# 6문항 선지별 proof profile 추출

## 범위

기존 `problem-solving-gold-v2` 6문항을 읽기 전용 입력으로 사용해 선지별 근거·연산·판정 관계를 펼쳤다. 원본 골드와 스키마는 변경하지 않았다.

- 문항: 6개
- 선지: 30개
- 근거 상세 행: 94개
- 압축 다단계 수동 검수 후보: 11개
- 선지 오류 기제 수동 검수 대상: 9개

## 자동 추출과 사람 검수의 경계

자동 추출 필드는 골드에 명시된 ID와 관계만 복사·집계한다. `FOLLOW_CAUSAL_CHAIN`, 주장 의존, 선지 내 복수 추론, 복수 주장 대상 추론은 압축 가능성을 나타내는 신호일 뿐 다단계 구조로 확정하지 않는다. `judgment: FALSE`인 선지의 오류 기제도 자동 추정하지 않는다. 두 항목은 `manual-review.csv`의 빈 검수 열에만 사람이 기록한다. 재실행 시 최신 자동 큐는 `manual-review-queue.csv`에 쓰고, 기존 `manual-review.csv`는 덮어쓰지 않는다.

권장 오류 기제 어휘의 초기 후보는 방향 반전, 대상 교환, 조건 누락, 필요·충분조건 혼동, 범위 확대·축소, 근거 없는 연결, 비교 기준 교환, 계산 관계 오류, 분류 경계 혼동이다. 이 목록은 확정 taxonomy가 아니다.

## 선지별 요약

| 문항 | 선지 | 진위 | 근거 ID | 연산 | 판정 관계 | 수동 검수 |
|---|---:|---|---|---|---|---|
| mrna-vaccine-lipid-nanoparticle-q19 | 1 | TRUE | MP1+MP2+SF2+VA2 | 직접 근거 | OC1-1: SUPPORTED | — |
| mrna-vaccine-lipid-nanoparticle-q19 | 2 | TRUE | SF3+SF5+VA3+VA4 | CHECK_CONDITION | II1: SUPPORTS → OC2-1 | — |
| mrna-vaccine-lipid-nanoparticle-q19 | 3 | TRUE | MP3+MP5+SF1+SF2+SF3 | APPLY_RULE | II2: SUPPORTS → OC3-1 | — |
| mrna-vaccine-lipid-nanoparticle-q19 | 4 | TRUE | MP4+MP5+SF4 | FOLLOW_CAUSAL_CHAIN | II3: SUPPORTS → OC4-1+OC5-1 | 다단계 |
| mrna-vaccine-lipid-nanoparticle-q19 | 5 (정답) | FALSE | MP4+MP5+MP1+MP2+SF4+SF5 | FOLLOW_CAUSAL_CHAIN+CHECK_JUSTIFICATION | II3: SUPPORTS → OC4-1+OC5-1<br>II4: DOES_NOT_JUSTIFY → OC5-2 | 다단계, 오류 기제 |
| gongsun-long-later-mohists-q12 | 1 | TRUE | MP2+MP3+SF1+SF2 | APPLY_RULE | II1: SUPPORTS → OC1-1+OC1-2 | 다단계 |
| gongsun-long-later-mohists-q12 | 2 | TRUE | MP6+SF1+SF4 | APPLY_RULE | II2: SUPPORTS → OC2-1+OC2-2 | 다단계 |
| gongsun-long-later-mohists-q12 | 3 | TRUE | MP7+MP8+SF2 | CLASSIFY | II3: SUPPORTS → OC3-1+OC3-2 | 다단계 |
| gongsun-long-later-mohists-q12 | 4 (정답) | FALSE | MP4+SF4+SF5 | COMPARE | II4: CONTRADICTS → OC4-1 | 다단계, 오류 기제 |
| gongsun-long-later-mohists-q12 | 5 | TRUE | MP4+SF3+SF5 | APPLY_RULE | II5: SUPPORTS → OC5-1+OC5-2 | 다단계 |
| corporate-law-q13 | 1 | TRUE | MP5+SF2 | APPLY_RULE | II1: SUPPORTS → OC1-1 | — |
| corporate-law-q13 | 2 (정답) | FALSE | MP1+MP2+MP3+SF4+SF5 | MAP_CONCEPT | II2: CONTRADICTS → OC2-1 | 오류 기제 |
| corporate-law-q13 | 3 | TRUE | MP6+SF3 | APPLY_RULE | II3: SUPPORTS → OC3-1 | — |
| corporate-law-q13 | 4 | TRUE | MP7+SF2 | FOLLOW_CAUSAL_CHAIN | II4: SUPPORTS → OC4-1 | 다단계 |
| corporate-law-q13 | 5 | TRUE | MP2+SF4+SF5 | CHECK_CONDITION | II5: SUPPORTS → OC5-1 | — |
| information-asymmetry-free-marketplace-q13 | 1 | TRUE | MP1+MP2+SF1+SF2+SF3 | CHECK_CONDITION | II1: SUPPORTS → OC1-1 | — |
| information-asymmetry-free-marketplace-q13 | 2 | TRUE | MP1+MP2+SF1+SF2 | CHECK_CONDITION | II2: SUPPORTS → OC2-1 | — |
| information-asymmetry-free-marketplace-q13 | 3 | TRUE | MP3+SF4 | COMPARE | II3: SUPPORTS → OC3-1 | — |
| information-asymmetry-free-marketplace-q13 | 4 | TRUE | MP4+SF5 | APPLY_RULE | II4: SUPPORTS → OC4-1 | — |
| information-asymmetry-free-marketplace-q13 | 5 (정답) | FALSE | MP5+SF3+SF5 | APPLY_RULE | II5: CONTRADICTS → OC5-1 | 오류 기제 |
| surface-tension-laplace-q16 | 1 | FALSE | MP3+SF1 | APPLY_RULE | II1: CONTRADICTS → OC1-1 | 오류 기제 |
| surface-tension-laplace-q16 | 2 | FALSE | MP1+MP4+SF2+SF3 | FOLLOW_CAUSAL_CHAIN | II2: CONTRADICTS → OC2-1 | 다단계, 오류 기제 |
| surface-tension-laplace-q16 | 3 (정답) | TRUE | MP2 | CALCULATE | II3: SUPPORTS → OC3-1 | — |
| surface-tension-laplace-q16 | 4 | FALSE | MP3+SF1+SF4 | FOLLOW_CAUSAL_CHAIN | II4: CONTRADICTS → OC4-1 | 다단계, 오류 기제 |
| surface-tension-laplace-q16 | 5 | FALSE | MP1+MP4+MP5 | COMPARE | II5: CONTRADICTS → OC5-1 | 오류 기제 |
| dopamine-motor-control-q13 | 1 | TRUE | MP1+SF2 | COMPARE | II1: SUPPORTS → OC1-1 | — |
| dopamine-motor-control-q13 | 2 (정답) | FALSE | MP2+SF3 | MAP_CONCEPT | II2: CONTRADICTS → OC2-1 | 오류 기제 |
| dopamine-motor-control-q13 | 3 | TRUE | MP2+SF4 | MAP_CONCEPT | II3: SUPPORTS → OC3-1 | — |
| dopamine-motor-control-q13 | 4 | TRUE | MP2+SF2+SF3 | FOLLOW_CAUSAL_CHAIN | II4: SUPPORTS → OC4-1 | 다단계 |
| dopamine-motor-control-q13 | 5 | TRUE | MP3+SF1+SF2+SF4 | APPLY_RULE | II5: SUPPORTS → OC5-1 | — |

## 산출물

- `artifacts/choice-proof-profiles.csv`: 선지당 1행의 전체 요약
- `artifacts/evidence-details.csv`: 근거 ID당 1행의 출처·설명·연결 정보
- `artifacts/manual-review-queue.csv`: 재실행할 때마다 갱신되는 자동 검수 큐
- `artifacts/manual-review.csv`: 사람이 판정을 추가하는 작업본(재실행 시 보존)
- `artifacts/manifest.json`: 입력 파일 해시와 행 수 집계

## 해석 제한

이 표는 학생의 실제 풀이 경로가 아니라 문항 골드가 명시한 판정 요구를 기술한다. `itemInference` 하나가 실제로 몇 개의 인지 단계를 압축하는지는 사람 검수 전까지 확정하지 않는다.
