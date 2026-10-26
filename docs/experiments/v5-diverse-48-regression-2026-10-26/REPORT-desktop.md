# v5.1(`coaching` 제거) 18세션 회귀 — Desktop 보고

- 날짜: 2026-10-26
- 결정: [D-0177](../../../memory/decisions/D-0177-problem-feedback-v51-drop-unused-coaching.md), 순서 [D-0176](../../../memory/decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md)
- 인계: [`docs/handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md`](../../handoffs/2026-10-26-problem-feedback-coaching-field-cleanup.md)
- 실행 승인: 사용자 2026-10-26 "응, 18개로 승인"(48개 대신 역할 균형 18개, 상한 sol 80회·$2, luna 80회·$0.2)

## 1. 실행 조건

| 항목 | 값 |
|---|---|
| 변경 | M1·M3 스키마·지시문에서 `coaching` 제거, M5(COACHING) 제거, 지시문 v5.1, 서버 평가 루프 단일 실행 |
| 함께 섞인 변경 | D-0166("원문에 없음" 근거, `bffc5e4`)은 10-22 회귀 뒤 반영돼 이번이 첫 다세션 확인이다 |
| 사례 | `scripts/v5-diverse-48-regression-cases.mjs`(10-22 이후 무변경) 중 18개: C-CT·A1·B3, D-CP·A3·B1, G-A2·B2·B3, I-CT·A2·A3, M-CP·A2·B1, S-CT·A1·B2. 8개 역할 모두 2회 이상 |
| 실행기 | `scripts/run-v5-live-check.mjs`(고정 목록 v5.1 경로), `V5_LIVE_CHECK_FULL=1`, 순차 |
| 기준(재활용, D-0168) | `../v5-diverse-48-regression-2026-10-22/`. G-B3은 D-0164 수정 뒤 재확인 `../v5-diverse-48-b3-recheck-2026-10-22/`를 기준으로 본다 |
| 후속 학생 답 | 11개 모두 10-22 같은 단계·같은 오류 ID의 답을 재사용(`actions/authored-1.json`, `authored-2.json`, 각 `authoredNote`). 새로 쓴 답 0 |
| 비용 | luna 25회 $0.041, sol 28회 $0.754, 합계 약 $0.80 |

## 2. 측정

비교표: `COMPARISON.md`(스크립트 머리글의 "10-12"는 기준 디렉터리 라벨이며 여기서는 10-22다).

| 항목 | 결과 |
|---|---|
| 종료 | 18/18 COMPLETED, 실행기 위반·상한 도달·평가 오류 종료 0 |
| 역할별 최종 outcome | 8개 역할 모두 10-22와 같음(A2 VERIFIED 3, CT·CP UNVERIFIED 5, 나머지 COACHING_TERMINATED 10) |
| 경로 변화(`changed`) | 1건: G-B3 REPAIR_FAILED → RESELECTION_WRONG(선택 2회) |
| 판정 출력 중 `coaching` 키 | 0 / 판정 시도 36 |
| 시도 종류 | ASSESSMENT 36, END_EXPLANATION 15, CONCLUSION_AUDIT 2, COACHING 0 |
| 검증 재시도 | 4: C-CT luna(근거 부족 아닌 판정에 부족 종류), G-A2·G-B2·G-B3 sol(`CLAIMS_CONTRACT: CONTRADICTED claim has no error`) |
| `claimConflicts` 비어 있지 않은 세션 | 0 |
| 정답 선택에서 SUPPORTED 아님 | 5(CT 3, CP 2) — 모두 소재·사실만 쓴 근거, 10-22와 같은 결과 |
| A2 재선택 | 3/3 SUPPORTED(M-A2 "…지문과 보기에 없어요" 포함) |

## 3. 해석

- **G-B3 변화는 기대한 회복이다.** 10-22 G-B3은 D-0157 겹침 검증에 막혀 잘못된 교정 실패 피드백으로 끝났고, D-0164 수정 뒤 재확인에서 RESELECTION_WRONG으로 돌아왔다. 이번 결과는 재확인과 같다.
- **`coaching` 제거의 목적은 달성됐다.** 출력·시도 모두 `coaching`/COACHING 0이고 경로가 유지됐다.
- **D-0166 흔적:** M-CP 조각이 '⑤가 덧붙인 관계'와 '그 관계가 지문·보기에서 뒷받침되지 않음'으로 나뉘었다(10-22는 '지문상 관계'·'선지의 연결'). D-0166의 조각 규칙대로다. 학생 근거("투석으로 pH를 높이고 에탄올을 제거해요")가 과정 사실만 말해 INSUFFICIENT·MISSING_LINK는 맞다. M-A2 재선택("없어요" 근거)은 SUPPORTED.
- **새 관측(인과 미확인):** 공손룡 sol 첫 판정 3건에서 학생의 결론 문장("②가 틀려요", "③이 틀려요")을 별도 주장으로 적고 CONTRADICTED로 표시한 뒤 오류에 잇지 않아 계약 위반이 났다. 재시도에서 그 인용을 기존 내용 오류 E1의 근거에 더해 통과했다. 10-22 같은 세션 0건. 지운 문단은 결론 문장 기록과 무관해 `coaching` 제거 탓으로 보기 어렵고, D-0166의 "없는 대상을 있다고 하면 CONTRADICTED" 문장이나 sol 표본 흔들림일 수 있다(가설). 경로·질문에는 영향이 없었다.
- 이 표본은 가상 답변이며 실제 학생 검증이 아니다.

## 4. 정정

- 없음.

## 5. 제안

- 나머지 30세션 확대는 하지 않는다(설명되지 않는 경로 변화 0, 사용자와 정한 확대 조건 미충족).
- `CLAIMS_CONTRACT` 재시도는 다음 회귀에서 다시 센다. 늘거나 재시도 소진 실패가 나오면 `studentClaims`에 결론 문장("②가 틀려요")을 넣을지 규칙을 정한다(D-0177 재검토 조건).

## 6. 열린 질문

- 결론 문장을 `studentClaims`에 넣는 것이 맞는가? 넣는다면 오류 대응 규칙에서 제외할지, 넣지 않게 할지.

## 7. 파일

- `CASES.json`, `FROZEN.json`, `cases/*.json`(+`.records.jsonl`), `requests/`, `actions/`, `ledger.jsonl`, `COMPARISON.md`/`.json`
- 코드: `packages/pipeline/src/problem-solving/{feedback.ts,feedback-evaluator.ts,feedback-end-explanation.ts,feedback.test.ts,source-markers.test.ts}`, `packages/app/src/server/{problem-feedback.ts,problem-feedback.test.ts,problem-feedback-http.test.ts}`, `scripts/run-v5-live-check.mjs`, 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md`
