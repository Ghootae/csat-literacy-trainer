# Corporate-law p1 legacy requalification

## 범위

- source set: `69bbf88d8937cf14551903ca`, 원문 p1
- candidate: `content/corporate-law-p1/`
- mode: `legacy-requalification`
- verifier: Anthropic `claude-opus-4-8`, effort `medium`
- production regression: Anthropic `claude-opus-4-8`, effort `low`, proposition coverage `off`
- 각주: qualification 입력에서 제외

## Semantic qualification v2

Gold, 영역 query, title-query는 각각 서로 다른 invocation의 clean pass 두 번을 완료했다. blocker와 repair는 0건이다. 세 자산 모두 `qualified`이며 원시 report와 v2 record는 다음 manifest가 결속한다.

- `packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z/qualification-manifest.json`

두 pass에서 반복된 non-blocking warning은 다음과 같다.

- gold: p6이 원문의 일반적인 권리·의무 주체성을 자산 운용 범위로 다소 좁히며 relation kind도 인과처럼 보일 수 있음
- query: 네 relation query의 acceptance criteria에 contradiction 조건이 중복 배치됨
- title-query: qT3가 병렬 핵심축 중 자산 통제 축을 유일한 중심으로 과도하게 강제함

현재 severity 정책에서 warning은 qualification blocker가 아니므로 자산은 수정 없이 통과했다. 이 기록은 warning이 해결됐다는 뜻이 아니다.

## Production-query regression

기존 4프로브를 현재 production query에 결속한 fixture를 API 실행 전에 동결했다.

- fixture: `packages/pipeline/fixtures/regression/corporate-law-p1.json`
- raw log: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z/production-regression.log`
- structured result: `packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z/production-regression-result.json`

결과는 세부 focal 판정 3/4 일치다. `주제만` 프로브가 기대 `topic_only` 대신 `region_not_evidenced`로 판정됐다. 두 상태 모두 보상·진행·Gate A 경로가 같은 비위험 미충족이므로 production action은 4/4 일치한다. 위험 과대통과와 거짓 모순은 0건이다.

명시적 회귀 정책은 `topic_only ↔ region_not_evidenced` 쌍만 `nonblocking_unfulfilled_equivalence` diagnostic mismatch로 허용한다. `partial_relation_preservation`, `relation_preserved`, `contradicted`가 포함된 불일치는 이 규칙으로 통과할 수 없다. 따라서 regression proof는 `passed`, promotion은 `ready`이며 exact agreement 3/4와 diagnostic mismatch 1건은 그대로 보존한다. 모델 결과를 보고 fixture 기대값이나 prompt를 바꾸지 않았다.

## 호출과 지연

- semantic verifier: 6회, repair 0회
- regression evaluator: 4회
- regression API latency 합계: 79,432 ms
- regression token: input 217, output 7,311, cache write 8,238, cache read 24,714

이 결과는 4/4 세부 정확도라는 뜻이 아니다. exact agreement는 3/4이고 production action agreement만 4/4이다.
