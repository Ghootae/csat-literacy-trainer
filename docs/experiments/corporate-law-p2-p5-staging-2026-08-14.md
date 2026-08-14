# Corporate-law p2–p5 candidate staging (2026-08-14)

법인 전체 지문의 신규 문단 p2~p5를 tracked source fixture에서 생성하고, production 편입 전 semantic qualification과 candidate-query 회귀를 실행한 기록이다. 이 문서는 완료 선언이 아니라 현재 staging 상태와 blocker를 보존한다.

## 입력과 설정

- source fixture: `packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json`
- product IDs: `corporate-law-p2` ~ `corporate-law-p5`
- 생성·semantic verifier: Anthropic `claude-opus-4-8`, effort `medium`
- 학생 영역 회귀: Anthropic `claude-opus-4-8`, effort `low`, proposition coverage `off`
- 각주는 생성·qualification 의미 입력에서 제외하고 tracked 원문 provenance에만 보존했다.

source-bound candidate 생성 CLI는 `content/`를 수정하지 않고 gold, query, title-query와 generation provenance를 `packages/pipeline/fixtures/candidates/`에 저장한다. 단계별 골드 cache와 이미 생성된 자산을 재사용하므로 중단 후 완료 단계를 다시 호출하지 않는다.

## Semantic qualification

| 문단 | gold | query | title-query | repair | 결과 |
| --- | --- | --- | --- | --- | --- |
| p2 | clean 2회 | clean 2회 | clean 2회 | 0 | qualified |
| p3 | blocker 후 clean 2회 | clean 2회 | clean 2회 | gold 1회 | qualified |
| p4 | clean 2회 | incomplete | clean 2회 | 0 | blocked |
| p5 | clean 2회 | clean 2회 | clean 2회 | 0 | qualified |

p3 gold의 `evaluationLinks/0/relation`은 원문의 역할 분리를 `realized_by`로 잘못 나타낸 blocker였다. 제한 repair가 해당 경로만 `role_separation`으로 바꾸고 clean streak를 0부터 다시 쌓았다.

p4 query verifier의 과거 invocation 순서는 `invalid → clean → invalid → invalid`였다. 세 번의 qualification 실행이 결국 incomplete였지만 모든 invocation이 연속 실패한 것은 아니다. 각주 제거와 source binding은 정상이며, 의미 blocker가 없더라도 정확한 연속 원문 부분문자열이 아닌 `sourceEvidence`는 fail-closed `incomplete`다. 당시에는 postflight 실패 report가 저장되지 않아 실제 evidence 문자열을 복원할 수 없었다. gold와 title-query의 qualified record는 별도 artifact에 보존했다.

후속 커밋은 파싱된 structured report만 `invalid-pass-N.json`으로 격리 저장하고 경로·hash·invocation·pass·실패 계약·issue key를 v2 run record에 결속했다. invalid report는 clean streak와 qualification proof에 포함되지 않는다. 이 보강 뒤 query qualification을 한 번만 재실행했고 첫 pass에서 다시 incomplete가 되어 추가 호출을 중단했다. 보존된 두 warning은 모두 `...`로 서로 떨어진 원문 구간을 합친 비연속 evidence였다. `i1`은 `자본금은 원칙적으로 감액이 금지된다 ... 이익 잉여금이나 자본 잉여금으로도 손실을 보전할 수 없는 경우에는 자본금을 사용하게 된다`, `i2`는 `손실 보전 등의 제한된 목적으로만 사용될 수 있고 ... 비교적 자유롭게 활용될 수 있다`를 제출했다. `i1` 앞부분에는 원문의 긴 원인 설명을 압축한 재서술도 있다. validator나 각주 문제가 아니라 verifier의 비연속 합성 인용 문제로 분류하며 prompt·schema·query·validator는 이번 배치에서 바꾸지 않았다.

## Candidate production regression

| 문단 | probe | exact | action | 위험 과대통과 | 거짓 모순 | 상태 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| p2 | 6 | 6 | 6 | 0 | 0 | ready |
| p3 | 6 | 6 | 6 | 0 | 0 | ready |
| p5 | 8 | 8 | 8 | 0 | 0 | ready |

p2의 기존 `기본재산-논항누락` 기대는 독립 감사에서 fixture 오류로 판정됐다. 응답은 기본 재산의 정의와 설립 시 정관 기재·등기를 보존하지만, focal critical p12인 `기본 재산 처분·감소 → 관할 기관 허가`의 사건·조건·허가 주체·결과를 전혀 표현하지 않는다. 따라서 critical relation evidence 0 상한에 따라 `topic_only`가 맞다. fixture에는 독립 인간 검수 provenance가 없으므로 기존 값을 human-verified oracle로 간주하지 않는다. 이 한 기대만 `partial_relation_preservation`에서 `topic_only`로 고친 뒤 기존 결과를 복사하지 않고 6개 probe를 새로 호출했으며 exact/action 6/6, 위험 과대통과 0, 거짓 모순 0으로 통과했다. evaluator prompt·query·aggregation·전역 판정 의미는 바꾸지 않았다.

첫 p2 회귀 실행 6회는 runner가 기존 result schema의 `logPath`와 `completedAt`을 누락해 저장 직전에 실패했다. 그 뒤 runner에 호출별 JSONL ledger와 fingerprint-bound resume를 추가하고 p2를 다시 실행했다. 따라서 p2의 `query-eval` 실측 호출은 12회지만 qualification proof에 결속된 것은 두 번째 실행 6회다.

후속 경계 감사 뒤의 세 번째 p2 회귀는 별도 artifact `2026-08-14T11-34-30-000Z`에 6회 독립 호출로 저장했다. 이 실행이 수정된 fixture의 현재 proof이며 과거 결과를 덮어쓰지 않았다. p4 관측 재실행은 `2026-08-14T11-37-37-553Z`에 query verifier 1회만 저장했다. 두 실행 모두 transport retry와 transport 오류는 0이었다.

## 호출 계측

`.omc/metrics/llm.jsonl`의 해당 시간대·paragraph ID 기준이다. 이 파일은 untracked 계측이며 qualification artifact가 정본이다.

| 문단 | 전체 성공 호출 | 생성 | verifier/repair | query-eval | 총 지연 |
| --- | ---: | ---: | ---: | ---: | ---: |
| p2 | 24 | 6 | 6 | 12 | 703,022 ms |
| p3 | 20 | 6 | 8 | 6 | 545,394 ms |
| p4 | 14 | 6 | 8 | 0 | 636,065 ms |
| p5 | 20 | 6 | 6 | 8 | 522,331 ms |

API transport 실패는 0이었다. p4의 incomplete는 API 실패가 아니라 structured verifier evidence의 deterministic postflight 실패다.

## 현재 결론

- p3와 p5는 source-bound semantic qualification과 candidate-query regression을 통과해 promotion-ready다.
- p2는 semantic qualification과 수정된 production-query 회귀 6/6을 통과해 candidate 상태에서 G4 proof를 갖췄다.
- p4는 query evidence contract를 만족하는 연속 clean 2회가 없고 새 실행도 첫 pass invalid여서 promotion하지 않는다. p4 regression은 실행하지 않았다.
- 법인 지문은 p4가 막혀 있으므로 아직 전체 G1~G4 완료가 아니다.
- 일부 문단만 먼저 `content/`로 승격하지 않았고 passage manifest도 만들지 않았다.

## 증거

- candidates: `packages/pipeline/fixtures/candidates/corporate-law-p2/` ~ `corporate-law-p5/`
- qualification: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p2/` ~ `corporate-law-p5/`
- current p2 regression proof: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p2/2026-08-14T11-34-30-000Z/`
- current p4 invalid evidence: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p4/2026-08-14T11-37-37-553Z/query/invalid-pass-1.json`
- regression fixtures: `packages/pipeline/fixtures/regression/corporate-law-p2.json`, `corporate-law-p3.json`, `corporate-law-p5.json`
- generator CLI: `packages/pipeline/src/cli/content-generate-candidate.ts`
- regression CLI: `packages/pipeline/src/cli/content-candidate-regression.ts`
