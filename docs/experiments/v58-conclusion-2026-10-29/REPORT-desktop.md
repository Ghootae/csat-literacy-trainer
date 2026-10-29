# 문제 판정 v5.8(결론 재계산·정의 한 단계 적용) 실험 (Desktop 논의용)

약어: A1·A2·B는 이번 지시문 변경 단위(아래 실행 조건), P1·N1·N2·P2는 표적 사례(P 정확해야 할 근거, N 부족해야 할 근거), prob-1·prob-11은 학생 역할 시뮬레이션 1단계에서 같은 글을 넣은 두 세션이다.

날짜: 2026-10-29. 실행: 코드 에이전트(메인 세션). 설계 초안: [`docs/review/conclusion-recompute-v58-draft-2026-10-29.md`](../../review/conclusion-recompute-v58-draft-2026-10-29.md). 사용자 승인: "(가), 정의의 부정 포함, 상한 $2".

## 실행 조건

- 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md`(`problem-feedback-v5.8`) = v5.7-2 + 세 군데:
  - A1 충족 2)에 ground.quote 범위 규칙(사실부터 선지와 맞서는 마지막 단계까지 이어진 한 구간).
  - A2 충족 3)에 holds = ground 학생 말이 참이라고 할 때의 논리만, 원문 일치는 sourceCheck에서만.
  - B sourceCheck에 정의·일반 진술 한 번 적용 규칙("즉" 정의의 부정 포함, 두 번 이상·원문 밖 상식은 UNDETERMINED). 예시는 시험 지문과 겹치지 않게 추상화.
- 제품 코드 변경 없음. 계획했던 C(결론 변경 기록 칸)는 철회: 서버 메모가 이미 `attempts[].normalized`에 저장됨.
- 모델: 제품 라우팅(정답 luna, 오답 sol). 비용: 표적 $0.053(호출 25), 회귀 $0.871. 합계 $0.92 / 상한 $2.

## 측정 1: 오프라인(전송 없음)

prob-1·prob-11(1단계 v5.6) 저장 칸에서 ground만 ②까지 넓혀 `settleConclusion`에 넣음.

| 조건 | prob-1 | prob-11 |
|---|---|---|
| 원래 칸 | INSUFFICIENT | SUPPORTED |
| 넓힘, ② UNDETERMINED (holds 무관) | INSUFFICIENT | INSUFFICIENT |
| 넓힘, ② CONSISTENT, holds=true | SUPPORTED | SUPPORTED |
| 넓힘, ② CONSISTENT, holds=false | INSUFFICIENT | INSUFFICIENT |

## 측정 2: 표적 실행 (`targeted/`, q19 정답 ⑤, q16 정답 ③)

| 사례 | 학생 글 요지 | 기대 | 결과 | ground | holds | 핵심 주장 sourceCheck |
|---|---|---|---|---|---|---|
| P1 ×5 | 중성됨 → 전하 없으니 소수성 강해짐 → 인력 커져 뭉침 → 5 반대 | SUPPORTED | **INSUFFICIENT 5/5** | ①~③ 전부(5/5) | true 5/5 | ② UNDETERMINED 5/5, ③ UNDETERMINED 5/5 |
| N1 ×3 | 중성 → 입자끼리 안 밀어내 더 크게 뭉침 (원문 밖 상식) | INSUFFICIENT | INSUFFICIENT 3/3 | 추론까지 | true | UNDETERMINED |
| N2 ×3 | 중성 → 전하 없으니 극성도 없어짐 → 소수성 강해짐 (허점 경계) | INSUFFICIENT | INSUFFICIENT 3/3 | 추론까지 | true | "극성도 없어짐" UNDETERMINED 3/3 |
| P2 ×3 | 표면장력·밀도·지름 곱 규칙 적용 → 오네소르게 수 불변 (q16 ③) | SUPPORTED | SUPPORTED 3/3 | 규칙 적용까지 | true | CONSISTENT |

P1 ② UNDETERMINED의 sourceBasis(5회 공통 취지): "지문은 중성이 된다고 설명하지만, 중성화로 소수성이 강해진다는 관계는 제시하지 않는다." 형식 재시도 0(14 SELECTION 모두 1회).

## 측정 3: 회귀 18세션 (`regression/`, 기준 v5.6(선지 읽기 덧붙임 대 세기) 학생 명령 재생, 비교 v5.7(교정 질문 직접형))

세션 이름은 지문 머리글자(C 회사법, D 도파민, G 공손룡, I 정보 비대칭, M mRNA, S 표면 장력)와 학생 유형(CT·CP 정답, A·B 오답 계열)이다.

- 최종 결과: 17/18 COMPLETED, 모두 v5.6 기준·v5.7과 같은 outcome. S-A1은 DIVERGED(정답 공개로 바로 감, 형식 재시도 1) — v5.7 회귀에서도 같은 지점에서 갈라졌고 반복 실행에서 흔들림으로 판정된 세션(v5.7 3/3 추정 오류 형성, v5.6 2/3).
- 오류(errors) 유형·개수: 첫 SELECTION 기준 18세션 모두 v5.7과 같음. B로 인한 새 CONTENT 오류 0.
- 판정기 원출력 결론이 달라진 세션 2개, 최종 outcome 영향 없음: I-CT(v5.7 원출력 INSUFFICIENT → v5.8 UNKNOWN, 둘 다 reconstructability UNKNOWN), S-CT(v5.7 RECONSTRUCTABLE·INSUFFICIENT → v5.8 UNKNOWN). 둘 다 UNVERIFIED_CORRECT 유지.
- 서버 결론 변경 메모("contentAssessment set to … from the three cells"): 표적·회귀 모두 0.
- 형식 재시도: v5.7과 같은 분포(C-B3·G-B3·S-A1 각 1회).

## 해석

1. A는 의도대로 작동: holds가 14/14 논리 기준으로 일관(prob-1 v5.6의 false 같은 원문 혼입 없음), ground가 추론 단계까지 넓어져 같은 글 → 같은 결론. prob-1/prob-11식 갈림의 원인(원인 1·2)은 해소.
2. B는 P1에 효과 없음. 판정기는 정의가 "극성 **또는** 전하"라는 점에서 '전하 상실 → 친수성 상실'을 한 번 적용으로 보지 않는 것으로 보인다(N2에서 명시적 "극성도 없어짐"을 UNDETERMINED로 둔 것과 일관). 초안 위험 2번(정의 부정의 논리 허점)이 실제로 판정을 갈랐다. 공식 해설("⑤는 근거 없음")과도 일치.
3. 부수 발견: ground가 "마지막 단계까지" 규칙에 따라 ③(인력 커져 뭉침)까지 들어감. 거짓 선지는 한 지점 반박으로 충분한데, ③처럼 덧붙인 단계가 UNDETERMINED면 ②가 맞아도 막힌다. 규칙을 "선지와 맞서는 **첫** 단계까지(가장 짧은 구간)"로 고쳐야 정확한 근거에 곁말을 붙인 학생이 손해를 보지 않는다. 회귀의 SUPPORTED 세션(G-A2·I-A2·M-A2)은 영향 없었다.

## 열린 질문 / 제안

- Q1. P1을 "정확"으로 만들려면 B를 더 넓혀야 한다(정의의 한 갈래만 써도, 원문이 그 대상의 다른 갈래를 말하지 않으면 적용으로 인정). 이는 N2류 허점 추론을 함께 인정할 위험이 있다. 코드 에이전트 권고: 넓히지 않고 A(+범위 수정)만 채택, 사용자 결정(2026-10-29 "정확")은 '극성 또는 전하' 허점을 근거로 재검토 요청.
- Q2. ground 범위 "첫 단계까지" 수정 후 확인 범위: 표적 P1×3·P2×3 + 회귀 정답 세션(CT·CP·A2 계열 9개) 재실행, 예상 $0.4.
- B 문장은 P1에는 효과가 없었으나 회귀에서 부작용도 없었다. 유지 여부는 Q1과 함께 정한다.

## 파일

- 표적: `targeted/run.json`, `targeted/logs/problem-feedback/events.jsonl`
- 회귀: `regression/SUMMARY.json`, `regression/cases/*.json|records.jsonl`, `regression/requests/`
- 비교 기준: `../v57-regression-2026-10-29/`, `../student-sim-2026-10-29/mrna-prob/`

## 추가 측정 4: P1을 sol로 3회 (`sol-p1/`, 사용자 제안 2026-10-29)

- 조건: v5.8 지시문, 판정 모델을 `gpt-6.1-sol`로 고정(`OpenAIFeedbackEvaluator({ model })`, 임시 스크립트, 제품 라우팅 아님). SELECTION 1회씩. 비용 약 $0.17(호출당 입력 13,872·출력 2,731 토큰 ≈ $0.055, 같은 호출 luna ≈ $0.003).

| 회 | 결론(판정기 = 서버) | ② sourceCheck | ground 범위 | holds |
|---|---|---|---|---|
| r1 | SUPPORTED | CONSISTENT ("일반 설명을 이온화 지질에 적용한 것으로 인정") | ①~②(첫 반박 지점까지) | true |
| r2 | SUPPORTED | CONSISTENT ("이 성질을 적용하여 소수성 약화를 부정하는 판단은 원문과 일치") | ①~② | true |
| r3 | INSUFFICIENT | UNDETERMINED ("전하 및 극성과 친수성의 관계를 설명하지만 … 증가로 이어진다고 명시하지 않는다") | ①~③ | true |

- 해석: sol은 B 규칙을 2/3에서 적용했고, 그 2회는 ground를 첫 반박 지점에서 끊었으며 ③의 UNDETERMINED를 "추가 설명"으로 분리했다. r3은 luna와 같은 판단(극성 허점)과 넓은 ground. 판정기·서버 결론 불일치 0/3.
- luna 5회(측정 2)와 비교하면 모델 차이가 결과를 가른다. 다만 3회라 sol의 안정성은 확정할 수 없고, 정답 선택 판정을 sol로 돌리면 이 호출 비용이 약 20배다(D-0104 정답 luna 라우팅의 근거).

## 추가 측정 5: (ㄹ) 확인 — sol 반복·음성 대조 (`sol-check/`, 사용자 승인 "(ㄹ) 확인 실험해보자", 상한 $0.75)

- 조건: 측정 4와 같음(v5.8, 판정 모델 sol 고정). 13회, 비용 $0.666.

| 사례 | 회 | SUPPORTED | 비고 |
|---|---|---|---|
| P1 (측정 4 r1~r3 포함 누계) | 10 | **4/10** (r1·r2·r8·r10) | SUPPORTED 4회는 모두 ground를 ②에서 끊음, INSUFFICIENT 6회는 모두 ③까지 포함(10/10 대응) |
| N1 상식 끼움 | 3 | 0/3 | "입자끼리 안 밀어냄" UNDETERMINED 3/3 |
| N2 허점 경계 | 3 | 0/3 | "극성도 없어짐" UNDETERMINED 3/3, r1은 "정의를 한 번 적용한 결과로 인정할 수 없다" 명시 |

- 판정기·서버 결론 불일치 0/13, 형식 재시도 0.
- P1 INSUFFICIENT 6회의 ② 이유는 luna와 같은 극성 허점("전하 또는 극성을 친수성의 조건으로 제시하지만 … 중성화만으로 극성 여부나 소수성 변화까지 확정할 수 없다").
- 해석: sol은 과잉 인정은 하지 않았으나(음성 0/6), P1에서 4/10으로 갈린다. (ㄹ) 재판정을 붙이면 이 사례는 다시 실행마다 결과가 갈리는 상태가 된다(A로 없앤 문제의 재도입). ground 범위와 결론이 10/10 함께 움직인 것은 원인이 아니라 같은 판단(② 인정 여부)의 두 표현으로 본다.
- 누계 비용(이 작업): 표적 $0.053 + 회귀 $0.871 + sol $0.17 + sol 확인 $0.666 ≈ $1.76.

## 추가 측정 6: JEV 탐색 (`jev/`, D-0036 보류 중의 탐색 실험 — 사용자 "그냥 혹시나 해보는 실험", 전송 승인 "전송")

- 목적(사용자 아이디어, 제품 방향 아님): 근거 작성 중 거의 실시간으로 충분성 신호를 줄 수 있는지.
- 요청: `POST jevplayground.com/api/evaluate`, type choice. state = 지문·〈보기〉·그림 설명·발문·선지·정답 번호(공식 해설 제외) + 학생 글. 사례 8 × 5회 = 40요청, 7초 간격, 반복마다 라벨 순서 교대. 실패 0. 지시문·기준 원문: `jev/request-sample.json`, 응답: `jev/results.jsonl`.
- 지연: 모델 latencyMs 중앙 286ms(최대 469), 왕복 중앙 1.09초.

(a) 근거 충분성 — P(SUFFICIENT) 5회

| 사례 | 값 | 평균 | 판정기 참고 |
|---|---|---|---|
| S12 "지문에 없음" 근거 | .66/.68/.68/.67/.64 | 0.67 | luna·서버 SUPPORTED |
| P1 정의 적용 근거 | .45/.45/.48/.40/.49 | 0.45 | luna 0/5, sol 4/10 SUPPORTED |
| N1 상식 끼움 | .35/.31/.34/.32/.31 | 0.33 | 0/6 |
| N2 허점 경계 | .29/.36/.29/.37/.33 | 0.33 | 0/6 |

(b) 주장 원문 일치 — P(CONSISTENT) / P(UNDETERMINED) 5회 평균

| 주장 | CONSISTENT | UNDETERMINED | CONTRADICTED |
|---|---|---|---|
| "…중성됨" (원문 사실) | 0.99 | 0.01 | 0.00 |
| P1 ② "전하 없어지니까 소수성 강해짐" | 0.28 | 0.61 | 0.10 |
| N2 "전하가 없으니까 극성도 없어짐" | 0.13 | 0.67 | 0.20 |
| N1 "중성이면 안 밀어내 더 크게 뭉침" | 0.09 | 0.79 | 0.11 |

- 해석: 순서는 판정기 결과와 같다(S12 > P1 > N1≈N2). P1이 0.45로 경계에 놓인 것은 sol 4/10과 맞아떨어진다. 반복 안정성이 높다(사례 내 폭 ≤ 0.09). 다만 (a)의 값이 0.29~0.68에 몰려 있어 확실히 충분한 S12도 0.67에 그친다. 절대 임계값을 정하려면 사람 판정 표본으로 보정해야 한다(D-0033의 '신호이지 백분율 아님'과 같은 제약).
- 한계: 한 문항·사례 4개(완성된 글만). 실시간 용도에 필요한 '쓰는 중인 미완성 글'에서의 변화, 다른 문항·정답 경로, 사람 판정과의 일치는 측정하지 않았다. D-0036 재검토 조건(실제 학생 사용 근거)은 여전히 미충족.

## 추가 측정 7: (ㄱ) 확정 뒤 ground "첫 단계까지" 수정 재확인 (사용자 "(ㄱ)으로 하고 첫 단계까지 수정해서 재확인해")

- 지시문: v5.8 ground 규칙을 "선지의 한 지점과 처음으로 맞서는 단계까지, 가장 짧은 구간, 뒤에 덧붙인 단계 제외"로 수정. 수정 전 문안은 `source-direct-problem-feedback-v5.8-draft1.md`(측정 2~6 재현용)로 보존.
- 사례: P1 ×3(luna), P3 ×3 — q16 ③ 정답 근거 뒤에 원문 밖 추측을 덧붙인 글("…오네소르게 수 안 변함 -> 그래서 위성 잉크 방울도 안 생기고 인쇄 속도도 똑같을 듯 -> 3 맞음") — 수정판과 draft1 각 3회. 회귀 정답 세션 8개(C-CT, D-CP, G-A2, I-CT, I-A2, M-CP, M-A2, S-CT) 수정판.
- 비용: 표적 $0.031, 회귀 $0.172.

| 사례 | 판 | 최종 결과 | ground |
|---|---|---|---|
| P1 r1 | 수정판 | INSUFFICIENT | ①~③ (규칙 미준수) |
| P1 r2 | 수정판 | **SUPPORTED** (판정기 INSUFFICIENT → 서버 뒤집음) | **①만** |
| P1 r3 | 수정판 | INSUFFICIENT | ①~③ + "5는 반대로 말함" |
| P3 r1·r2 | 수정판 | SUPPORTED | 첫 단계까지 |
| P3 r3 | 수정판 | **ERROR** (덧붙인 추측을 OFF_TARGET으로 봄) | 첫 단계까지 |
| P3 r1~r3 | draft1 | SUPPORTED 3/3 | 첫 단계까지(덧붙인 추측 제외) |

- 회귀 8세션: 모두 기준과 같은 outcome, 형식 재시도 0.
- 해석: 수정은 역효과. ① "가장 짧은 구간" 문구 때문에 luna가 ground를 ①(사실)에서 끊은 경우가 1/3 생겼고, 이는 prob-11과 같은 서버 뒤집기("근거도 정확해")를 다시 만들었다. ② 넓게 잡는 경우도 2/3 그대로 남았다(규칙 미준수). ③ 수정이 노린 '덧붙인 단계 때문에 손해' 사례(P3)는 draft1에서도 3/3 SUPPORTED라 문제가 실제로 생기지 않았다. 측정 2의 넓은 ground는 결론에 영향이 없는 경우(② 자체가 UNDETERMINED)에만 관찰됐다.
- 제안: 지시문은 draft1로 되돌린다. 근본 방어는 지시문보다 서버 쪽 — 서버가 판정기의 INSUFFICIENT를 SUPPORTED로 올리지 않게(내리기만 허용) 하면 ground 범위가 흔들려도 prob-11 유형은 생기지 않는다. 저장 기록상 서버의 SUPPORTED 쪽 뒤집기는 prob-11과 이번 P1 r2 두 건뿐이고 둘 다 오류였다. D-0182(서버 결론 확정)의 일부 변경이라 사용자 결정 필요.

## 최종 조치 (사용자 "진행", D-0189)

- 지시문: v5.8 = 측정 2~6의 문안(ground "마지막 단계까지")으로 되돌림. 측정 7 문안은 `source-direct-problem-feedback-v5.8-draft2.md`. (측정 7의 `recheck-draft1/run.json`이 가리키던 `-v5.8-draft1.md`는 지금의 v5.8과 같은 문안이라 삭제.) 제품 기본값은 아직 v5.7-2.
- 서버: `settleConclusion`이 판정기 INSUFFICIENT를 SUPPORTED로 올리지 않음(`feedback-claims.ts`, `readingJudgment`에 `cellsSupported` 분리). 저장 기록 재생: 올리기 2건(prob-11 `84ba3f65`, P1-r2 `45255cc1`) → INSUFFICIENT·MISSING_LINK, 나머지 84 판정 변화 없음.
- 시험: `feedback.test.ts` 3d 추가, 낡은 기대 2개 변경, 문제 판정 시험 476 통과, `npm test` 1491 통과(기존 실패 2건만).
