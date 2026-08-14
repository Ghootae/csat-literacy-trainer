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

p4 query verifier는 세 번의 독립 qualification 실행에서 정확한 연속 원문 부분문자열이 아닌 `sourceEvidence`를 적어 deterministic evidence contract를 통과하지 못했다. 의미 blocker가 없더라도 이 출력은 fail-closed `incomplete`이며, 결과를 손으로 고치거나 계약을 완화하지 않았다. gold와 title-query의 qualified record는 별도 artifact에 보존했다.

## Candidate production regression

| 문단 | probe | exact | action | 위험 과대통과 | 거짓 모순 | 상태 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| p2 | 6 | 5 | 5 | 0 | 0 | blocked |
| p3 | 6 | 6 | 6 | 0 | 0 | ready |
| p5 | 8 | 8 | 8 | 0 | 0 | ready |

p2의 유일한 불일치는 `기본재산-논항누락`의 human 기대 `partial_relation_preservation`과 실제 `topic_only`다. 둘 다 학생 진행상 미충족이지만, 현재 승인된 비차단 진단 등가는 `topic_only ↔ region_not_evidenced`뿐이다. partial을 포함한 차이는 자동으로 뭉개지 않으므로 p2 manifest는 blocked 상태를 유지한다. 기대 라벨이나 정책은 실행 결과에 맞춰 수정하지 않았다.

첫 p2 회귀 실행 6회는 runner가 기존 result schema의 `logPath`와 `completedAt`을 누락해 저장 직전에 실패했다. 그 뒤 runner에 호출별 JSONL ledger와 fingerprint-bound resume를 추가하고 p2를 다시 실행했다. 따라서 p2의 `query-eval` 실측 호출은 12회지만 qualification proof에 결속된 것은 두 번째 실행 6회다.

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
- p2는 partial/topic 경계의 human oracle 재감사 전에는 promotion하지 않는다.
- p4는 query evidence contract를 만족하는 연속 clean 2회가 없어 promotion하지 않는다.
- 법인 지문은 p2와 p4가 막혀 있으므로 아직 전체 G1~G4 완료가 아니다.
- 일부 문단만 먼저 `content/`로 승격하지 않았고 passage manifest도 만들지 않았다.

## 증거

- candidates: `packages/pipeline/fixtures/candidates/corporate-law-p2/` ~ `corporate-law-p5/`
- qualification: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p2/` ~ `corporate-law-p5/`
- regression fixtures: `packages/pipeline/fixtures/regression/corporate-law-p2.json`, `corporate-law-p3.json`, `corporate-law-p5.json`
- generator CLI: `packages/pipeline/src/cli/content-generate-candidate.ts`
- regression CLI: `packages/pipeline/src/cli/content-candidate-regression.ts`

