# 인계: 6문항·48세션 회귀 시험 (2026-10-12 사례를 지금 판정 코드로 다시)

- 날짜: 2026-10-22
- 작성: Claude
- 실행: 준비물(사례 모듈·비교 스크립트)은 executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md)).
  실모델 실행·후속 학생 답 작성·판정은 Claude.
- 근거: 사용자 2026-10-21 "설계안 써줘"(외부 학생 검증 전 넓은 회귀 시험 권고, 비용 추정 약 $3).
- 상태: 승인됨(사용자 2026-10-22 "승인": 준비 위임·실모델 실행 48세션, 상한 sol 200회·$5, luna 200회·$0.5)

## 왜 하나

2026-10-12 이후 판정과 흐름이 많이 바뀌었다(D-0117~D-0161). 특히 2026-10-21의 23·24·25·29번 변경(D-0156·D-0157·D-0159·D-0161)은 모두
판정을 엄격하게 하는 쪽이다. 그런데 확인은 문항 3개(도파민 13, 공손룡 12, 회사법 13)로만 했다. 외부 학생 검증이나 학생용 전환 전에
2026-10-12의 6문항·48세션(`docs/experiments/v5-diverse-48-2026-10-12/`)을 지금 코드로 다시 돌려 아래를 확인한다.

1. 지나친 엄격: 바르게 쓴 근거가 "근거 부족"으로 떨어지지 않는가.
2. 진술 모순(`claimConflicts`) 과잉 적용: 모순이 아닌 근거를 판정 불가로 보내지 않는가.
3. 흐름 이상: 멈춤, 검증 재시도 폭증, 실행기 위반, 끝나지 않는 세션이 없는가.
4. 10-12 대비 바뀐 경로가 그 사이 결정으로 설명되는가.

## 범위 밖

- 판정 지시문·코드·UI 변경. 이 시험은 관찰만 한다. 문제가 보이면 결과를 보고하고 별도 설계로 다룬다.
- 같은 입력의 반복 안정성. 48개는 서로 다른 가상 학생 세션이다(10-12와 같음).
- 실제 학생 회복률·학습 효과 측정(후속 답을 Claude가 쓰므로 합성 실행이다).

## 사례

`scripts/v5-diverse-48-cases.mjs`의 48개 그대로(문항 6개 × CT·CP·A1·A2·A3·B1·B2·B3). 최초 근거·역할·의도는 바꾸지 않는다.

| 역할 | 최초 | 후속 행동(실제 분기에 따름) |
|---|---|---|
| CT | 정답·소재만 언급 | 질문이 생기면 내용 없는 답 |
| CP | 정답·관련 사실만 언급 | 질문이 생기면 국소 보완 후 설명 요청 |
| A1 | 오답 A·막연한 근거 | 질문해도 확인 불가 |
| A2 | 오답 A·명시적 오류 | 국소 수정 → [다시 선택] → 정답 + 충분 근거(`specs[].supported`) |
| A3 | 오답 A·복합 오류 | 첫 오류 수정, 다음 오류 유지 |
| B1 | 오답 B·근거 없음 | 근거 요청에도 미제출 |
| B2 | 오답 B·명시적 오류 | 짧게 수정 → 설명 요청 |
| B3 | 오답 B·내용 판단과 선택 충돌 | 불일치 인정 → [다시 선택] → 다른 오답 + 새 오류 근거(`specs[].rewrong`) |

## 준비물 (executor)

### 1. 사례 모듈 `scripts/v5-diverse-48-regression-cases.mjs` (새 파일)

- `scripts/v5-diverse-48-cases.mjs`의 `cases`를 그대로 가져와 `full: true`, `group`(역할), `path`(역할)를 붙인다. 최초 근거·choiceId·intent는 바꾸지 않는다.
- B3에는 `reselect: { choiceId: 'C' + specs[k].wrong[0], rationale: specs[k].rewrong }`를 붙인다(10-12 `actions/reselect-and-finish.json`의 B3 명령과 같은 값인지 시험으로 확인).
- A2는 실행기 `draft()`가 이미 `specs[].supported`로 정답 재선택을 만든다. 모듈에서 따로 넣지 않는다.
- `replies`는 두지 않는다(후속 답은 실행 중 Claude가 실제 질문을 보고 쓴다).
- `cases.length === 48`, id 중복 검사.

### 2. 실행기 `scripts/run-v5-live-check.mjs` (주석 한 줄)

- `V5_LIVE_CHECK_LIMITS` 주석의 "narrows"를 "sets"로 고친다. 코드는 이미 기본값보다 큰 값도 받으며(제한 없음), 이번 실행은 기본값
  (sol 60회·$2.5)보다 큰 상한을 쓴다. 동작은 바꾸지 않는다.

### 3. 비교 스크립트 `scripts/compare-v5-diverse-48-regression.mjs` (새 파일, 로컬 파일만 읽음, API 호출 없음)

입력: 10-12 디렉터리(`docs/experiments/v5-diverse-48-2026-10-12/cases/*.json`)와 이번 디렉터리(인자). 출력: 이번 디렉터리에 `COMPARISON.json`과
`COMPARISON.md`.

세션마다 두 실행의 다음 값을 나란히 적는다.
- 최종 `result.outcome`, 종료 이유(`pendingEnd`가 남아 있으면 그 값, 없으면 마지막 상태에서 알 수 있는 것), 선택 횟수, 교정 질문 수.
- 첫 SELECTION 판정의 `reconstructability`, `contentAssessment`, 오류 수(STATED/INFERRED).
- 이번 실행만: `insufficiencyKind`, `claimConflicts` 개수, `keyRelationCoverage`(조각 수·빈 조각 수), 검증 재시도 횟수(attempts 중 실패 수).
- A2의 재선택 판정(두 번째 SELECTION)도 같은 값으로 적는다.
- `changed`: outcome·종료 이유·선택 횟수·질문 수 중 하나라도 다르면 true.

요약 표: 역할별 outcome 분포(10-12 / 이번), `changed` 개수, 검증 재시도 합계, `claimConflicts`가 비어 있지 않은 세션 목록, 정답 선택 SELECTION에서
SUPPORTED가 아닌 세션과 그 빈 조각.

- 10-12 사례 JSON의 필드 구조가 이번과 다르면(예: 판정 원출력 위치) 실제 구조를 읽어 맞춘다. 맞출 수 없는 값은 `null`로 두고 보고한다.
- 시험: 작은 가짜 사례 두 개로 `changed` 계산과 요약 표 생성을 확인한다(node:test, `scripts/compare-v5-diverse-48-regression.test.mjs`).

### 준비물 완료 조건

- [ ] 사례 모듈이 48개를 내보내고, B3 reselect 값이 10-12 기록과 같다는 시험이 통과한다.
- [ ] 비교 스크립트 시험 통과. 10-12 디렉터리만으로 돌려도(이번 디렉터리 자리에 10-12를 넣어) 오류 없이 `changed: 0`이 나온다.
- [ ] 실행기 주석 수정 외 실행기 동작 변경 없음.
- [ ] `npm run build` 통과(실행기가 dist를 해시 고정하므로). 외부 API 호출 없음, 커밋 없음, `git stash` 없음, 다른 세션 파일 무수정.

## 실행 (Claude, 사용자 승인 뒤)

- 디렉터리 `docs/experiments/v5-diverse-48-regression-2026-10-22/`. `prepare`로 해시 고정 → 최초 48개 → `draft` 반복.
- 상한: sol 200회·$5, luna 200회·$0.5(`V5_LIVE_CHECK_LIMITS`). 상한에 닿으면 멈추고 보고한다. 예상은 약 176회·$3(범위 $2.5~4).
- 후속 학생 답(교정 질문 답, CP 보완)은 실행기가 `needsAuthor`로 남긴 것만 Claude가 쓴다. 실제 질문과 원문을 보고 역할 의도에 맞게 쓰며,
  10-12의 같은 사례 답(`actions/correction-*.json`)이 같은 오류를 묻는 질문이면 그 답을 우선 쓴다. 답마다 action 파일에 `authoredNote`
  (질문, 쓴 답, 이유)를 남긴다. 학생 답 생성에 모델을 쓰지 않는다.
- 경로를 강제하지 않는다. 예정과 다른 판정·질문·종료는 그대로 기록하고, 그 상태에서 허용되는 명령만 보낸다.
- 소요 시간: 순차 실행이라 1~1.5시간으로 본다.

## 판정 (Claude, 사용자 검토용)

`REVIEW.md`에 다음을 쓴다.

1. **자동 점검:** 모든 세션 종료 여부, 실행기 위반, 검증 재시도 합계, 비용.
2. **지나친 엄격:** 정답 선택 SELECTION에서 SUPPORTED가 아닌 세션 전부(CT·CP 12개 + A2 재선택 6개 + 그 밖). 각각 근거·빈 조각·부족
   종류를 보이고 Claude 판단(맞음 / 지나침)을 단다. A2 재선택 6개는 10-12에 모두 근거 확인이었으므로 특히 본다. M-A2의 `supported`("…그
   연결은 지문과 보기에 없어요")는 "지문에 없음" 유형이라 25번 규칙으로 바뀔 수 있다. 사용자 판정 대상으로 표시한다.
3. **진술 모순:** `claimConflicts`가 비어 있지 않은 세션 전부와 Claude 판단.
4. **바뀐 경로:** `changed` 세션마다 바뀐 이유를 그 사이 결정(D-0150 오류 가설, D-0130 대상 오류 우선, D-0154 안내 문장, D-0156~D-0161 등)으로
   설명할 수 있는지. 설명되지 않는 변화는 따로 모은다.
5. **사용자에게 물을 것:** 판정이 갈리는 세션만, 대화 원문을 같은 응답에서 바로 앞에 보여 준 뒤 묻는다.

## 중단·보고 조건

- 실행기 위반·재생 불일치·상한 도달·같은 사례의 연속 평가 오류(재개 2회 실패)면 멈추고 보고한다.
- 준비물에서 이 문서와 코드가 충돌하면 executor는 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- `.env`를 열지 않는다. 키를 출력하지 않는다.

## 결과 보고 (실행 후 작성)

### 준비물 (executor, 2026-10-22)

변경 파일(커밋 없음):
- `scripts/v5-diverse-48-regression-cases.mjs` (새): 48개 사례. `full: true`, `group`/`path` = 역할, B3에 `reselect`. 48개·id 중복 검사 내장.
- `scripts/v5-diverse-48-regression-cases.test.mjs` (새): 기본 사례 불변, B3 reselect가 `actions/reselect-and-finish.json`의 C-B3 등 6개 명령과 같음.
- `scripts/compare-v5-diverse-48-regression.mjs` (새): `node scripts/compare-v5-diverse-48-regression.mjs <이번 디렉터리> [10-12 디렉터리] [출력 디렉터리]`. 출력 기본값은 이번 디렉터리의 `COMPARISON.json`·`COMPARISON.md`.
- `scripts/compare-v5-diverse-48-regression.test.mjs` (새): 가짜 사례로 `changed`·요약 표·파일 출력.
- `scripts/run-v5-live-check.mjs:27`: 주석 "narrows" -> "sets". 동작 변경 없음.

시험·검증:
- `node --test` 두 새 파일: 5개 통과, 실패 0.
- `import(...regression-cases.mjs)` 사례 수 48.
- 10-12 디렉터리를 두 자리에 넣어 실행(출력은 스크래치 디렉터리): 48세션, `changed: 0`, 오류 없음. 10-12 디렉터리는 수정되지 않음.
- `npm run build` 통과(tsc 오류 없음). 외부 API 호출 없음.

필드 매핑(10-12 구조와 달라 `null`인 값):
- 10-12 판정에는 `insufficiencyKind`, `claimConflicts`, `keyRelationCoverage`, 오류의 `basis`(STATED/INFERRED)가 없다. 10-12 쪽은 모두 `null`. 이번 실행은 값이 있다.
- 오류 수(`errors`)는 항상 기록하고, `stated`/`inferred`는 모든 오류에 `basis`가 있을 때만 채운다(없으면 `null`).
- `claimConflicts`·`keyRelationCoverage`는 `call.rawOutput`에서 제거되므로 마지막 성공 attempt의 `rawOutput`에서 읽는다.
- 종료 이유는 공개 view에 없어 `cases/<id>.records.jsonl`의 마지막 `session.pendingEnd.endReason`을 읽고, 없으면 `phase:<마지막 phase>`.
- 첫 판정·재선택 판정은 `evaluations[].kind === 'SELECTION'`이고 `status === 'SUCCESS'`인 것을 순서대로 두 개(10-12 구조에는 step의 `inspection`이 없어 evaluations를 읽음).
- 검증 재시도 = 최종 성공한 평가 안의 실패 attempt 수. 연결 오류로 끝난 평가는 `evaluationErrors`에 따로 센다. 10-12 쪽 재시도 값은 `null`(이번 실행만 합산).

### 실행 (Claude)

- 48세션 완료, 147회 약 $1.98. 판정 기록: `docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md`.
- 실행기 `draft()`의 A2 재선택 키 버그(`C-A2` 형식 id)로 A2 재선택 명령 6개를 직접 넣음(동일 내용).
- 발견: B3 교정 판정이 D-0157 겹침 검증에 막힘(G-B3 잘못된 교정 실패 피드백). S-A3 진술 모순 판정 사용자 판정 대상.
