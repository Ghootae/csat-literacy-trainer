# Content asset qualification policy

이 문서는 새 콘텐츠와 generation fingerprint가 없는 legacy 콘텐츠를 production 품질 기준에 편입하는 규칙을 구분한다. 생성 이력과 현행 품질 검증 이력은 서로 대체하지 않는다.

## 신규 생성 자산

신규 자산은 다음 조건을 모두 충족해야 한다.

- tracked source fixture와 결속되어 있고 입력 source hash가 일치한다.
- 현재 generator fingerprint가 존재하며 provider, model, effort, prompt version, schema version과 일치한다.
- 생성 시각, review status, revision history가 기록되어 있다.
- gold, 영역 질의, 타이틀 질의가 현행 semantic verification gate를 통과한다.
- production-query 기반 표준 회귀가 존재한다.

즉 신규 생성 자산의 완료 조건은 source hash와 generator fingerprint가 모두 일치하는 것이다. 생성 metadata가 없는 파일을 신규 생성 자산처럼 보이게 만들지 않는다.

## 기존 legacy 자산의 재승격

기존 legacy 자산은 재생성을 의무화하지 않는다. generation provenance는 `legacy/no-fingerprint`로 보존하고 generator fingerprint, provider, model, effort 또는 생성 시각을 사후 추정하거나 조작하지 않는다. 다음 절차를 모두 통과하면 현행 품질 기준에 재승격할 수 있다.

1. tracked source fixture와 정확한 source hash를 결속한다.
2. 원문과 기존 gold를 독립 semantic verifier로 재검증한다.
3. 동일 후보에 대해 연속 두 번 blocker 0을 확인한다.
4. unresolved `critical`/`error`가 0인지 확인한다.
5. 기존 영역 질의와 타이틀 질의를 현행 verifier로 재검증한다.
6. production-query 기반 표준 회귀에 편입한다.
7. 재승격 시각, verifier fingerprint, 검증 결과 경로, repair 여부와 변경 내역을 requalification/revision history에 기록한다.

재승격 기록은 과거 생성 이력을 대체하지 않는다. 기존 gold가 `generationMetadata`를 갖지 않는다면 그대로 `legacy/no-fingerprint`이며, requalification 기록은 별도의 현행 검증 증거다. source 대조나 verifier에서 중대한 의미 오류가 확인될 때만 재생성을 별도 결정한다.

## 법인 p1 적용 상태

`corporate-law-p1`은 현재 다음 상태다.

- G1: 충족. gold, 합성 노드, 문단 타이틀이 존재한다.
- G2: 재승격 확인 필요. 기존 semantic verification 기록이 있으나 새 tracked source와 연속 두 번 blocker 0 계약을 다시 감사해야 한다.
- G3: 충족. 영역 질의와 타이틀 질의가 존재한다.
- G4: legacy 회귀가 존재하지만 production-query 표준 회귀를 추가해야 한다.
- provenance: `legacy/no-fingerprint`.
- source binding: tracked 원본은 동결됐지만 제품 p1에서 각주 표식 `*`가 빠져 source hash가 다르므로 결속 판단이 남아 있다.

요약하면 `corporate-law-p1`은 G1·G3과 legacy 검증·회귀 자산을 보유하며, G2와 신규 G4 및 tracked source 결속에 대한 재승격이 필요하다.

## 호출량 계획 원칙

신규 p2~p5의 기존 계획 범위 72~82회는 유지하되, 실제 실행 전 probe manifest로 정확한 호출 수를 다시 고정한다. 이 범위는 gold 생성 4회, gold verifier 8회, 예상 repair 0~4회, 영역 질의 생성 4회, 타이틀 질의 생성 4회, 두 질의군 verifier 16회와 회귀 판정 36~42회를 구분한 계획치다.

기존 p1은 위 비용에 섞지 않는다. 기본 재승격 계획은 gold verifier 2회, 영역 질의 verifier 2회, 타이틀 질의 verifier 2회, 현행 4프로브를 출발점으로 한 production-query 회귀 4회다. verifier calibration, 실패 재시도, 추가 repair와 그 second pass는 별도 비용이며 기본 계획에 포함하지 않는다. 기존 p1 전체 재생성도 기본 계획에 포함하지 않는다.

## Semantic qualification v2

기존 `semantic-verification-v1` record는 읽기와 기존 runtime 호환을 위해 유지한다. 그러나 v1의 `passed` 상태만으로 신규 promotion 또는 legacy 재승격을 증명하지 않는다. v2 record는 자산 종류와 verifier 종류를 분리하고 source, candidate, verifier fingerprint에 결속된 실행 이력을 보존한다.

- 자산과 verifier 종류는 `gold`, `query`, `title-query` 중 하나이며 서로 일치해야 한다.
- qualification은 동일 candidate에 대한 서로 다른 invocation의 clean report 두 개를 요구한다.
- Anthropic prompt cache는 허용하지만 이전 result JSON replay, 같은 invocation ID 또는 run record 복제는 두 번째 pass가 아니다.
- 마지막 두 report artifact를 다시 읽어 hash, blocker 0, evidence 계약과 run history를 직접 검증한다. record의 상태 문자열만 신뢰하지 않는다.
- source, candidate 또는 verifier input contract가 바뀌면 기존 clean streak는 무효다.
- malformed output, timeout, 빈 응답, parse 실패와 deterministic postflight 실패는 clean이 아니라 `incomplete`다.
- `critical`과 `error`는 production blocker이고 `warning`은 non-blocking이다.

상태 전이는 `pending → verifying → clean_streak_1 → verifying → qualified`가 기본 경로다. blocker가 있으면 streak를 0으로 초기화하고 repair가 가능할 때만 `repair_required → repairing`으로 이동한다. repair 이후에도 처음부터 clean 두 번을 다시 쌓는다. 기본 repair 상한은 두 cycle이며 초과하면 fail-closed `quarantined`다.

LLM verifier의 의미 판단과 deterministic 검사는 역할이 다르다. deterministic preflight/postflight는 schema, 중복 ID, node/edge 참조와 source evidence ID가 canonical source segment에 실제로 존재하는지를 검사한다. 기존 v1 report의 문자열 evidence는 호환 읽기 시 정확한 연속 부분문자열 계약을 유지한다. 이 계약을 어긴 verifier report는 의미상 clean처럼 보여도 qualification에 포함하지 않는다.

Repair는 verifier가 지적한 semantic path만 수정할 수 있다. paragraph/source identity, source hash, generation provenance, generator fingerprint, semantic verification metadata, revision history, verifier record, asset/verifier kind는 보호한다. issue ID는 모델이 낸 문자열을 신뢰하지 않고 category, location과 source evidence에서 안정적인 key를 계산한다. 적용된 repair에는 수정 JSON Pointer, before/after, cycle과 artifact 경로를 기록한다.

## Source bundle과 각주 제외 정책

tracked passage source에서 문단별 원본과 qualification 입력을 다음 hash로 구분한다.

- `rawSourceHash`: 각주 표식까지 보존한 원본 `primaryText` hash
- `qualificationSourceHash`: 연결된 `targetTerm + marker`만 제거한 qualification 본문 hash
- `ignoredFootnotesHash`: 제외된 각주 metadata와 본문의 provenance hash
- `verifierInputHash`: 각주 표식과 각주 본문을 제외한 verifier input hash

각주는 학습 대상 명제와 semantic qualification에서 제외한다. tracked fixture의 원문, 각주, 원본 hash는 그대로 보존하지만 verifier에게 각주 본문을 전달하지 않고 gold·query에 각주 내용을 요구하지 않는다. source binding에서는 fixture가 명시한 `targetTerm + marker` 조합만 제거하므로 `정관*`과 `정관`은 같은 qualification 본문이다. 임의의 별표나 일반 본문 차이는 제거하지 않는다.

각주 본문만 바뀌면 `ignoredFootnotesHash`만 바뀌며 qualification streak와 verifier input은 무효화하지 않는다. 본문 의미가 바뀌면 `qualificationSourceHash`와 `verifierInputHash`가 바뀌어 기존 qualification이 무효가 된다. promotion gate는 source set, 문단 ID, `qualificationSourceHash`와 `verifierInputHash`를 직접 확인한다.

### Canonical source evidence (6Q-1)

신규 qualification 입력은 `canonical-source-segments-v1`을 사용한다. 각주 표식과 각주 본문을 제거한 `qualificationPrimaryText`를 최초 한 번 결정론적으로 분할하고, 그 결과를 tracked source fixture에 offset·hash와 함께 고정한다. 실행 때 tokenizer로 다시 분할하지 않는다.

- offset은 UTF-16 string index 기준의 `startOffset` 포함, `endOffset` 제외 범위다.
- segment는 `S1`부터 연속하며 gap·overlap 없이 `qualificationPrimaryText` 전체를 덮어야 한다.
- 각 segment hash는 offset으로 얻은 정확한 문자열의 UTF-8 SHA-256이다.
- 모든 segment를 순서대로 재결합한 결과와 primary text가 정확히 같아야 한다.
- verifier는 원문을 복사하지 않고 `sourceEvidenceRefs: [{ sourceSegmentId }]`만 반환한다.
- 비연속 근거는 여러 ID로 표현하며 코드는 ID에서 정확한 원문을 복원한다.
- 존재하지 않거나 중복된 ID는 clean pass가 될 수 없다.

ID 오류에는 의미 report 전체를 다시 생성하지 않고 source evidence ID만 반환하는 제한 교정을 한 번 허용한다. 교정 schema에는 issue ID와 evidence refs만 존재하므로 severity, category, 대상 경로, 문제 설명과 수정 방향은 바뀔 수 없다. issue 집합이 달라지거나 교정 ID가 여전히 유효하지 않으면 `incomplete`로 격리한다. correction invocation은 원 verifier invocation과 달라야 한다. prompt cache는 허용하지만 result replay는 독립 pass가 아니다.

이 변경은 verifier input/report fingerprint를 바꾼다. 기존 v1 문자열 evidence artifact와 기존 runtime 콘텐츠는 그대로 읽을 수 있지만, 신규 promotion proof로 자동 승격하지 않는다. 기존 production 자산은 일괄 무효화하지 않고 candidate 승격 시 점진적으로 새 계약으로 재검증한다.

## Candidate staging과 promotion

신규 자산과 legacy 자산 모두 production `content/`에 먼저 복사하지 않는다.

```text
candidate 준비
→ tracked source deterministic preflight
→ gold/query/title-query semantic qualification v2
→ candidate query 기반 production regression
→ qualification manifest 완성
→ promotion gate 재검증
→ content/ promotion
```

qualification manifest는 candidate와 source bundle identity, 세 자산의 v2 record, 신규/legacy mode, preflight, regression binding, promotion blocker를 연결한다. promotion gate는 단순 `ready` 값을 믿지 않고 candidate와 record artifact hash, v2 report history, regression proof를 다시 확인한다. regression proof가 아직 없으면 candidate는 명시적으로 pending이며 promotion이 차단된다. 현재 CLI는 candidate qualification과 pending manifest 생성까지 담당하고 production import나 regression 실행은 하지 않는다.

신규 mode는 세 자산의 generation provenance와 gold의 현재 generator fingerprint를 요구한다. legacy mode는 반드시 `--legacy-requalification`으로 선택하며 `legacy/no-fingerprint`를 보존하고 requalification history를 요구한다. legacy를 신규 mode로 묵시적으로 통과시키지 않는다. 기존 runtime loader에는 전역 hard block을 걸지 않아 현재 콘텐츠 로딩은 유지한다.

## CLI와 dry-run

빌드된 pipeline CLI는 다음처럼 candidate 하나를 계획한다.

```bash
npm run content:qualify -- \
  --candidate-dir content/corporate-law-p1 \
  --source-fixture packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json \
  --paragraph-id corporate-law-p1 \
  --source-paragraph-id p1 \
  --asset-type all \
  --regression-probes 4 \
  --legacy-requalification \
  --dry-run
```

`--dry-run`은 API key나 provider client를 읽지 않고 파일도 쓰지 않는다. 자산별 clean verifier 최소 2회, 최대 repair 2 cycle과 clean streak 재구축 경로를 구분해 verifier·repair·regression의 논리 호출 범위를 출력한다. HTTP 최대치는 각 논리 호출에 기존 retry 상한 4회를 더한 5 attempts로 별도 표시한다. prompt cache는 허용하지만 result replay는 clean pass로 인정하지 않는다.

`corporate-law-p1`은 제외된 연결 각주 1개를 보고하며, 제품 문자열의 각주 표식 누락은 source mismatch로 처리하지 않는다. 2026-08-14 실제 legacy v2 qualification에서 gold/query/title-query는 각각 독립 clean 2회, blocker·repair 0으로 qualified됐다. production query 4프로브는 production action 4/4이나 세부 focal 판정은 3/4이다. `topic_only ↔ region_not_evidenced`만 비차단 미충족 diagnostic mismatch로 허용하는 명시적 정책을 적용해 regression과 promotion gate를 통과했다. 기대값과 prompt는 바꾸지 않았으며 exact mismatch는 proof에 남아 있다. 상세 근거는 `docs/experiments/corporate-law-p1-legacy-requalification-2026-08-14.md`에 있다.
