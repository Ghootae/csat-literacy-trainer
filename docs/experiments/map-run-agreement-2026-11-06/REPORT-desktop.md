# 지도 회차 간 일치 측정 (Desktop 논의용)

- 날짜: 2026-11-06
- 목적: 골드 기반 생성 실험 설계(`docs/handoffs/2026-11-06-gold-based-generation-experiment.md`) E2 역분석 관문(노드 대응 ≥ 85%, 관계 유형 일치 ≥ 80%, 선지 고리 보존 100%)의 달성 가능성 확인. 같은 원문·같은 지시문의 지도 3회차끼리 일치를 천장으로 본다.
- 실행: `node scripts/measure-map-run-agreement.mjs` (시험 `scripts/measure-map-run-agreement.test.mjs` 3/3 통과). 외부 전송 없음. 저장된 지도 회차만 읽음(D-0168).
- 결과 원본: `results.json`(지문별, 회차 쌍 6개마다 값)

## 1. 측정 방법

- 대상: `docs/experiments/**/runs/map-r{1,2,3}.json`이 모두 있는 36지문. 지도 지시문 v2 10지문(calibration-2 2, UI 4, 세트 E 4), v1 26지문. 모델은 모두 `gpt-6.1-sol`. meaning-internalism-externalism·missing-outlier-data·modern-civilization-science-na의 r2는 `rerun-r2/runs/map-r2.json`.
- 노드 구간: 명제는 `sourceQuote`의 원문 위치(정확 일치, 실패 시 공백 무시 일치, 위치 못 찾은 명제 0). 상위 노드(합성·문단 요지·교차·최상위)는 하위 명제 구간의 합.
- 노드 대응: 회차 A 노드마다 회차 B 노드 중 구간 IoU가 가장 높은 것. IoU ≥ 0.5를 대응으로 본다(0.3·0.7도 기록). "종류 무관"과 "같은 종류" 두 가지.
- 관계 재현(느슨): A의 관계(from→to)에 대해 B에 양 끝 IoU가 모두 ≥ 0.5이고 방향이 같은 관계가 있으면 재현. 엄격판(최고 대응 노드끼리 관계)도 기록.
- 관계 유형 일치: 재현된 관계 쌍에서 18유형이 같은 비율. 회차별 분류가 있는 자료는 `relation-classify-2026-10-19/heldout`(v1 지도 6지문, CLASSIFY-PROMPT-v2)뿐이다.
- 선지 고리 보존: 선지 연결 동결본의 `twistTargetIds`(동결 지도 id)가 동결 회차에서 다른 두 회차로 대응되는 비율. 동결 회차는 `frozen-map.json`과 내용이 같은 회차로 찾았다. 대상 7지문: UI 4(choice-link-2026-10-22 ui-v5), 세트 E 오디오·플라스틱, 경마식 보도(세트 E 선지 연결이 calibration 동결 지도를 씀, `sns-diagnostic-gold-2026-11-05/targets.json`). 의식과 인지는 지도가 가·나로 나뉘어 제외.

## 2. 측정

| 지표 | v2 10지문 평균 (최저) | v1 26지문 평균 (최저) | 전체 36 |
|---|---|---|---|
| 노드 대응 IoU≥0.5, 종류 무관 | 97.4% (95%) | 97.3% (94%) | 97.3% |
| 노드 대응 IoU≥0.7 | 91.4% | 91.5% | 91.5% |
| 노드 대응 IoU≥0.5, 같은 종류 | 95.1% | 95.3% | 95.3% |
| 관계 재현, 느슨 | 68.1% (62%) | 67.7% (50%) | 67.8% |
| 관계 재현, 엄격 | 60.2% | 57.5% | 58.3% |
| 관계 유형 일치(재현 쌍) | 자료 없음 | 93.8% (heldout 6지문, 831쌍) | — |

v2 노드 종류별(종류 무관 / 같은 종류): 명제 96.3/95.9, 합성 98.6/91.3, 문단 요지 100/100, 교차 100/96.6, 최상위 100/100.

선지 고리 보존(동결 회차 → 다른 두 회차):

| 지문 | 지시문 | 대상 노드 | 보존 | 놓친 노드(최고 IoU) |
|---|---|---|---|---|
| corporate-law | v2 | 8 | 94% | P5-6(0.44) r3 쪽 |
| information-asymmetry-free-marketplace | v2 | 8 | 88% | P4-3(0.47) ×2 |
| mrna-vaccine-lipid-nanoparticle | v2 | 6 | 83% | P2-7(0.48) ×2 |
| surface-tension-laplace | v2 | 5 | 100% | — |
| audio-perceptual-coding | v2 | 11 | 100% | — |
| plastic-polymerization | v2 | 8 | 88% | P5-6(0.44), P5-12(0.46) |
| horse-race-reporting | v1 | 7 | 86% | P2-4(0.39) ×2 |
| 가중 평균 | | 53 | 91.5% | 9건/106회 |

관계 유형 불일치 상위: APPLICATION↔ELABORATION 8, CAUSE↔OTHER 6, GROUNDS↔PROBLEM_RESPONSE 4, CAUSE/GROUNDS 2, GROUNDS/DEFINITION 2.

## 3. 해석

- 노드 대응은 같은 원문 위 비교이고 명제가 원문 구간에 묶여 있어 거의 자명하게 높다. E2의 생성 지문은 원문이 달라 사상표로 대응을 정하므로, 97%는 상한일 뿐 기대치로 쓰면 안 된다.
- 관계는 같은 원문에서도 약 1/3이 회차마다 바뀐다(느슨 68%). 원 뼈대 관계 전체를 분모로 하는 기준은 원문끼리도 70%를 넘지 못한다. 관계 유형 일치는 재현된 쌍 안에서 재야 하며, 그 천장은 약 94%다(v1 지도·v2 분류 기준. 현행 분류 v3와 v2 지도 조합의 값은 없음).
- 선지 고리 보존 실패 9건은 모두 IoU 0.39~0.48로, 노드가 없는 것이 아니라 명제 분할 크기가 다른 경우다. "100%"는 분할·병합을 대응으로 인정할 때만 성립한다.

## 4. 설계 반영(인계 문서 1차 수정)

- E2 성립 기준 초안을 고침: 노드 대응 ≥ 90%(사상표), 관계 재현 ≥ 같은 지문 원문 회차 간 값 − 10%p, 재현 쌍 유형 일치 ≥ 85%, 선지 고리 보존 100%(분할·병합 인정).
- 권고: 고정 숫자보다 "생성 지문 지도 3회 ↔ 원 뼈대" 일치가 "원문 회차 간" 범위 안에 드는지를 주 기준으로.

## 5. 한계·열린 질문

- 관계 유형 일치의 천장은 v1 지도·v2 분류 자료로만 쟀다. v2 지도·v3 분류로 재려면 원문 지도 r2·r3 분류가 필요하다(외부 전송, 10지문 × 2요청 수준).
- IoU 0.5 문턱은 임의다. 0.3/0.7 값은 `results.json`에 있다.
- 입장 귀속 일치(인물·학파)는 이번에 재지 않았다(회차별 입장 층이 동결 회차에만 있음).

## 6. 파일

- `scripts/measure-map-run-agreement.mjs`, `scripts/measure-map-run-agreement.test.mjs`
- `docs/experiments/map-run-agreement-2026-11-06/results.json`
- `docs/handoffs/2026-11-06-gold-based-generation-experiment.md`(1차 수정)

## 7. 추가: 관계 불일치 표본 분류 (2026-11-06)

- 스크립트: `scripts/classify-relation-mismatch.mjs`(시험 `classify-relation-mismatch.test.mjs`), 결과 `mismatch/counts.json`·`mismatch/sample.json`. v2 10지문, 회차 쌍 6개, 관계 확인 2000회.
- 자동 분류(양 끝 IoU ≥ 0.5를 "같은 자리", 한쪽이 다른 쪽을 0.8 이상 포함하고 IoU ≥ 0.2를 "겹치는 자리"로 봄):

| 자동 분류 | 건수 | 비율 |
|---|---|---|
| REPRODUCED(같은 자리·같은 방향) | 1371 | 68.6% |
| GRANULARITY(같은 방향, 끝 범위 다름) | 253 | 12.7% |
| ONE_END(한쪽 끝만 겹침) | 271 | 13.6% |
| REVERSED(같은 자리, 방향 반대) | 82 | 4.1% |
| GRANULARITY_REVERSED | 20 | 1.0% |
| NONE | 3 | 0.2% |

- 판정: 독립 하위 에이전트(opus)가 층화 표본 51건(분류별 12건, NONE 3건)을 B 지도 원본을 열어 내용으로 판정했다(`mismatch/judgments.json`). 코드 에이전트가 3건을 확인했다(ONE_END-1, REVERSED-9, ONE_END-4). 세 건 모두 판정과 맞았다.

| 자동 분류 | SAME | STRUCTURE | PARTIAL | DIFFERENT |
|---|---|---|---|---|
| REVERSED | 11 | 1 | 0 | 0 |
| GRANULARITY | 11 | 1 | 0 | 0 |
| GRANULARITY_REVERSED | 12 | 0 | 0 | 0 |
| ONE_END | 1 | 8 | 1 | 2 |
| NONE | 0 | 2 | 1 | 0 |

  SAME은 같은 연결이고 방향·범위·이름 표현만 다르다. STRUCTURE는 관계 대신 묶음 구성, 명제 병합, 관계 연쇄로 같은 연결을 표현한 것이다.

- 모집단 추정(분류별 비율을 건수에 곱함): 실질 같은 연결(SAME+STRUCTURE)은 약 96%다. SAME만 세면 약 86%, 진짜 해석 차이(DIFFERENT)는 약 2%(ONE_END 표본 2/12에서 추정, 불확실성 큼), PARTIAL은 약 1%다.
- 기계 지표 보정: 방향 반대와 범위 차이를 재현으로 세면 v2 전체 86.3%, 지문별 81~91%다(최저 플라스틱 81%, 의미 내재론 82%). 표본 SAME 추정 86%와 맞는다.
- 정정: 1~3절의 "관계 재현 68%"는 기계 대응의 하한이다. "관계가 1/3꼴로 바뀐다"는 해석은 틀렸다. 실제 해석 차이는 수 %다.
- 판정 경계(하위 에이전트 보고):
  - 명제 병합(두 명제를 한 명제로 합침)을 STRUCTURE에 넣었다(4건).
  - 최상위 묶음 텍스트로만 진술된 연결 1건은 근거가 약하다.
  - 관계 이름이 달라도 note 내용이 같으면(양보/대조, 적용/예시) SAME으로 봤다.
- 측정기 한계: 같은 자리 대응에서 짝을 잘못 고른 경우가 있었다(REVERSED-2, -9). 이 점은 모집단 추정을 보수 쪽(불일치 과대)으로 기울인다.
