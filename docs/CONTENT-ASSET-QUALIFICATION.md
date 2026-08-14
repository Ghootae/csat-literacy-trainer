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
