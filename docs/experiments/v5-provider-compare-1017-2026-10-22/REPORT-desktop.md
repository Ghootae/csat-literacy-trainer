# 공급자 비교 재시험: DeepSeek V4.1 Flash-1017 (Desktop 보고서)

- 날짜: 2026-10-22
- 근거: 사용자 2026-10-22 "V4.1 Flash-1017을 기반으로 같은 내용의 실험을 돌리자. 그 결과를 기존의 제미나이, 솔, 루나 결과와 비교해줘", 코드 기준 A(현재 운영 v5로 다섯 설정 재실행), 판정 방법 가(블라인드 하위 에이전트 + Claude 원문 대조 + 기준 칸).
- 인계: [`docs/handoffs/2026-10-22-v5-provider-compare-1017.md`](../../handoffs/2026-10-22-v5-provider-compare-1017.md)
- 실행기: `scripts/test-v5-provider-compare-1017.mjs`, 검토 묶음: `scripts/build-v5-provider-compare-1017-review.mjs`, 모의 테스트 6/6.

## 1. 실행 조건

| 항목 | 값 |
|---|---|
| 문항 | 공손룡 12번(정답 ④=C4). 학생은 모두 ④를 고름 |
| 입력 | 10-07 실험과 같은 응답 11개(S1~S8, X1~X3) × 3반복, 같은 순서 회전. 입력 해시를 옛 FROZEN과 단언 |
| 판정기 | 현재 운영 v5 `OpenAIFeedbackEvaluator`(지시문 `source-direct-problem-feedback-v5.md`). 10-07 코드는 미커밋으로 덮어써져 재현 불가(현재·`90484c2` 모두 `unexpected baseline instructions`) |
| 흐름 | 최초 선택 판정 → 종료 대기(`AWAITING_END_START`)면 END_START 수락 뒤 종료 설명 생성. 교정 질문 이후 후속 답은 없음 |
| 설정 | `deepseek-flash` low·high(1017), `gemini-3.8-flash` medium, `gpt-6.1-sol` medium, `gpt-6-luna` medium. 모델 고정(라우팅 미사용) |
| 제한 | 요청당 90초, 재시도 1회, 설정별 100회·$1.5 |
| 실행 시각 | 2026-10-22 02:40 UTC 전후, 다섯 설정 병렬. DeepSeek 요청 대부분 피크 시간(low 36/40, high 32/37) |
| 1017 확인 | 응답 `model` 값은 `deepseek-flash`만 나옴. 1017 여부는 DeepSeek 발표(10-17부터 같은 이름으로 제공)에 기댐 |

## 2. 측정

### 2.1 품질(의미 판정 확정값)

| 설정 | 통과 | 오류 놓침 | 지나친 엄격 | 판정기 자신 오독 | 판정 없음 | 설명만 결함 |
|---|---|---|---|---|---|---|
| deepseek-flash-low | 28/33 | 2 (S7-r1·r3) | 1 (S4-r3) | 0 | 0 | 2 |
| deepseek-flash-high | 26/33 | 0 | 1 (S5-r2) | 0 | 1 (S7-r2 시간 초과) | 5 |
| gemini-3.8-flash-medium | 30/33 | 0 | 2 (S5-r2·r3) | 0 | 0 | 1 |
| gpt-6.1-sol-medium | 30/33 | 0 | 2 (S4-r1·r2) | 0 | 0 | 1 |
| gpt-6-luna-medium | 29/33 | 0 | 2 (S5-r2·r3) | 1 (S2-r3) | 0 | 1 |

- 판정 절차: Claude가 165칸 전체 텍스트를 원문과 대조해 먼저 고정([REVIEW-claude.json](review/REVIEW-claude.json), sha256 `496b03d0…`, 비블라인드) → opus 하위 에이전트 3개가 설정 이름을 가린 묶음 3개를 판정([part1](review/REVIEW-blind-judge-part1.json)·[2](review/REVIEW-blind-judge-part2.json)·[3](review/REVIEW-blind-judge-part3.json)) → 불일치 10칸을 원문 대조로 확정([REVIEW-SUMMARY.json](review/REVIEW-SUMMARY.json)).
- 기준 칸: 10-08 GPT 판정이 있는 옛 칸 12개(GPT 실패 8·통과 4)를 섞었다. 블라인드 판정이 GPT와 12/12 일치했다. 판정자가 GPT에서 Claude 계열로 바뀐 영향은 이 범위에서 보이지 않는다.
- 불일치 10칸: Claude가 실패로 본 1칸(DL-S8-r1)은 철회, 블라인드만 실패로 본 9칸은 모두 수용(전부 경미한 설명 결함).
- 자동 검사 일치(판정 필드·경로): DL 30/33, DH 31/33, GM 31/33, SO 31/33, LU 31/33. 의미 판정과 다른 것은 자동 검사가 설명 문장을 보지 않기 때문이다.

### 2.2 지연시간(초)

| 설정 | 최초 판정 중앙 / p90 | 종료 설명 중앙 | 재시도 | 재시도 원인 |
|---|---|---|---|---|
| deepseek-flash-low | 40.7 / 111.7 | 13.8 (3칸) | 4 | 전부 90초 시간 초과 |
| deepseek-flash-high | 50.9 / 126.2 | – | 4 | 전부 시간 초과(1칸은 2회 연속 → 판정 없음) |
| gemini-3.8-flash-medium | 38.5 / 122.2 | 10.4 (2칸) | 4 | 전부 시간 초과 |
| gpt-6.1-sol-medium | 27.2 / 35.8 | 7.3 (2칸) | 0 | – |
| gpt-6-luna-medium | 21.2 / 27.4 | – | 0 | – |

다섯 설정을 동시에 돌렸고 DeepSeek은 피크 시간이었다. 공급자 부하에 따라 달라질 수 있다.

### 2.3 비용(33칸, 달러)

| 설정 | 요청 | 입력 토큰(캐시) | 출력 토큰(생각) | 기록 비용 | 비고 |
|---|---|---|---|---|---|
| deepseek-flash-low | 40 | 445k (420k) | 298k (251k) | 0.37 | 피크 단가. 비피크면 약 0.18 |
| deepseek-flash-high | 37 | 419k (398k) | 391k (343k) | 0.48 | 비피크면 약 0.24 |
| gemini-3.8-flash-medium | 39 | 345k (118k) | 186k (142k) | 0.96 | 캐시 할인 미반영. 2027-01-01 단가 2배(D-0129) |
| gpt-6.1-sol-medium | 35 | 381k (340k) | 54k (7k) | 1.31 | 캐시 입력을 입력 단가로 보수 계산(캐시 89%). 실제 청구는 이보다 낮음, 캐시 단가 미확인 |
| gpt-6-luna-medium | 33 | 373k (336k) | 93k (50k) | 0.08 | 같은 보수 계산 |

전체 기록 비용 약 $3.19(사전 점검 5회 별도, 무시할 수준).

## 3. 해석

1. **1017은 9월판의 큰 약점 일부를 고쳤다.** 9월판(10-08, 옛 코드)은 S7 오독을 low 3/3·high 2/2 통과시켰고 low는 X3도 2/3 통과시켰으며, high는 판정기 자신이 ⓓ를 오독하거나 인용을 자르고 정답을 뒤집었다. 1017에서는 X3 오독 통과 0/6, high의 S7 통과 0/2(1칸 판정 없음), 판정기 자신의 ⓓ 오독 0이다. 단 코드와 판정자가 바뀌어 이 차이 전부를 모델 덕으로 볼 수는 없다.
2. **low는 여전히 S7 오독을 놓친다(2/3).** "갑이 가지고 있지 않은 옷"을 UNDETERMINED로 두고 INSUFFICIENT로 보내며, 종료 설명이 오독을 고치지 않고 오히려 학생이 한 연결이 없다고 말한다. 다섯 설정 중 유일한 "오류 놓침"이다.
3. **high는 정확도 문제는 줄었지만 느리고 설명이 거칠다.** 판정 없음 1칸(시간 초과), 경미한 인용·귀속 결함 5칸. p90 126초는 학생 대기로 쓰기 어렵다.
4. **OpenAI·Gemini의 실패는 대부분 "지나친 엄격"이다.** S4(관계만 말함, D-0085로 충분)·S5(허용 해석)를 INSUFFICIENT나 ERROR로 본다. 학생에게 불필요한 질문이나 종료 설명이 가지만 틀린 내용을 가르치지는 않는다. 예외는 luna S2-r3으로, 판정기 자신이 ⓓ를 "빨간 옷이 필요한데 없다는 뜻"으로 오독해 틀린 보기를 정답처럼 담은 질문을 냈다.
5. **운영 라우팅 관점.** 이 33칸은 모두 정답 선택이므로 운영에서는 luna가 맡는 자리다. 이 자리에서 luna는 가장 빠르고 가장 싸다(1017 비피크 low의 절반 이하). 1017이 대체 후보가 될 수 있는 자리는 sol(오답 판정)인데, 이번 시험에는 오답 선택 칸이 없어 그 자리 품질은 측정하지 않았다.

## 4. 정정

- 앞선 대화에서 "DeepSeek V4.1 Flash는 이미 한 번 시험했다"고 한 것은 맞다(9월판). 이번 결과는 1017판이고, 10-08 숫자와는 코드·판정자가 달라 참고 비교만 가능하다.

## 5. 제안

- **채택하지 않음(권고).** 정답 자리는 luna가 품질 비슷·속도·비용 모두 우위. 1017 low는 유일하게 학생 오류를 놓치고, high는 지연이 길다. D-0104·D-0129 구성(정답 luna, 오답 sol)을 유지한다.
- sol 비용이 문제가 되면 그때 1017 high를 오답 선택 다문항(48세션 회귀 사례)으로 시험한다. 그 전에 DeepSeek 데이터 정책 확인(10-08부터 남은 과제)과 시간 초과 대책(요청 제한 시간·비피크 시간대)이 필요하다.
- 공통 과제: 교정 질문의 정답 포함 양자택일(모든 설정), S4·S5 지나친 엄격(OpenAI·Gemini), luna 내부 식별자(C4·SCENARIO) 노출.

## 6. 열린 질문

1. 1017을 sol 자리 후보로 계속 볼지, 여기서 닫을지.
2. sol 실제 청구액(캐시 할인 적용)을 확인할지. 이번 기록은 상한값이다.

## 7. 파일

- 실행 결과: `docs/experiments/v5-provider-compare-1017-2026-10-22/<설정>/` (칸별 JSON, `requests.jsonl`, `RESULTS.json`), `SUMMARY.json`·`SUMMARY.md`, `FROZEN.json`, `preflight-*.json`, `run-*.log`
- 판정: `review/REVIEW-claude.json`, `review/REVIEW-blind-packet*.json`, `review/REVIEW-blind-key.json`, `review/REVIEW-blind-judge-part1~3.json`, `review/REVIEW-SUMMARY.json`, `REVIEW-anchors.json`, `REVIEW-anchors-gpt-verdicts.json`
