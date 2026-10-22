# B3 6세션 재확인 — Desktop 보고 (2026-10-22)

사람용 요약: `REPORT-b3-recheck-human.md`.

## 실행 조건

- 대상: 48세션 회귀(`../v5-diverse-48-regression-2026-10-22/`)의 B3(선택 충돌) 6개. 사례 모듈 `scripts/v5-diverse-48-b3-recheck-cases.mjs`
  (회귀 사례에서 `role === 'B3'`만 고름, 고정 사례 그대로).
- 바뀐 코드: `feedback-v4.ts` REPAIR 검증에서 `SELECTION_EXECUTION` 항목 인용을 겹침 검사에서 뺌([D-0164](../../../memory/decisions/D-0164-selection-mismatch-quote-allowed-as-sufficiency.md)).
- 학생 답: 회귀 시험 `authored-1`과 같은 답(S-B3 "적절하지 않은 설명이에요.", 나머지 "적절한 설명이에요."). `actions/authored-1.json`.
  다시 고르기·마지막 설명·이해 확인은 실행기 `draft()` 고정 규칙.
- 승인: 사용자 2026-10-22 "승인"(재확인), 한도 초과 뒤 "승인"(이어 돌리기). `FROZEN.json` authorization에 둘 다 기록.

## 실행 경과

- 1차 상한 sol 20회·$1, luna 20회·$0.1. 세션당 sol 4회(첫 판정·교정 판정·재선택 판정·마지막 설명)라 24회가 필요했는데 20회로 잡았다(Claude 추정 오류).
- M-B3·S-B3 재선택 판정이 `RUN_LIMIT`으로 막혔다. 막힌 요청은 전송되지 않았다(ledger START 20 = END 20).
- 실행 드라이버(Claude 작성, 스크래치)가 `RETRYABLE_ERROR` → `RESUME`을 끝없이 반복해 두 세션에 단계 약 3,420개·draft 파일 3,420개가 쌓였다.
  모두 지우고 세션을 3단계(RESELECT 뒤)로 되돌렸다(records도 s1~s3 행만 남김). 드라이버에 RUN_LIMIT 시 정지를 넣었다.
- sol 상한을 26회로 올려(FROZEN limits 갱신) 두 세션을 끝냈다.

## 결과

| 세션 | 첫 선택 | 다시 고른 답 | 교정 판정 시도 | rationaleSufficient | sufficiencyEvidence | 종료 이유 |
|---|---|---|---|---|---|---|
| C-B3 | ⑤ | ① | 1회 성공 | false | 없음 | RESELECTION_WRONG |
| D-B3 | ④ | ① | 1회 성공 | false | 없음 | RESELECTION_WRONG |
| G-B3 | ③ | ② | 1회 성공 | true | "ⓑ는 손에 든 한 벌만 가리키므로 유명을 사명으로 쓴 것이에요." | RESELECTION_WRONG |
| I-B3 | ④ | ① | 1회 성공 | true | "이름을 바꿔 반복한 글이 여러 사람의 진정한 의견으로 오인되어 입법으로 …" | RESELECTION_WRONG |
| M-B3 | ④ | ③ | 1회 성공 | true | "pH가 높아지면 수소 이온 농도가 낮아지고 이온화 지질은 중성이 돼요." | RESELECTION_WRONG |
| S-B3 | ⑤ | ② | 1회 성공 | false | 없음 | RESELECTION_WRONG |

- 검증 재시도: 0(모든 평가 첫 시도 성공). 회귀 시험은 6/6 교정 판정에서 "오류로 확인된 학생 발화…" 재시도.
- 회귀 대비: G-B3 REPAIR_FAILED·선택 1회 → RESELECTION_WRONG·선택 2회(10-12와 같은 경로로 복귀). 나머지 5개 종료 이유 같음.
- C·D false 이유(판정기): "이번 답변에는 판단 근거가 제시되지 않아 전체 근거가 충분한지는 확인되지 않는다" 등. 검증 강제가 아닌 판정기 판단.
- 이해 확인 예/아니요는 회귀와 다른 세션이 있다. `draft()`가 목록 순서로 번갈아 고르는 규칙(`answer: i % 2 === 0`)이라 판정과 무관.

## 비용

| 모델 | 요청 | 비용 |
|---|---|---|
| gpt-6.1-sol | 24 | $0.582 |
| gpt-6-luna | 6 | $0.011 |
| 합계 | 30 | 약 $0.59 |

## 해석

- D-0164 수정으로 B3 회귀가 해소됐다. 선택 충돌 인용을 빼도 내용 오류 인용 금지(D-0157 핵심)는 유지된다(단위 시험 기존 항목 통과).
- 충분성 true 3건은 처음 근거 문장 하나를 인용했다. 회귀 시험에서 이 근거들이 막혔던 것이 원인이었음을 뒷받침한다.

## 남은 것

- 실행기 `draft()`의 A2 정답 재선택 키 문제(`id.split('-')[1]`, 회귀 REVIEW 기재)는 아직 고치지 않았다.
- 실행기 자체의 RESUME 반복은 실행기가 아닌 드라이버 쪽에서 막았다. 실행기 `draft()`가 RUN_LIMIT 오류에서 RESUME을 내지 않게 할지는 미정.
