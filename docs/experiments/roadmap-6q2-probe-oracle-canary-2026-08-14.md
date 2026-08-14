# Roadmap 6Q-2 probe oracle canary

## 범위

`corporate-law-p2`의 tracked 6-probe fixture에 mutation specification을 붙이고, Anthropic
`claude-opus-4-8` effort `medium` 독립 판정 두 번이 query별 `semanticState`와 canonical
`sourceEvidenceRefs`에 합의할 때만 기존 `normalizeQueryStates()`로 expected focal verdict를
계산하는 자동 oracle을 시험했다. 모델에는 mutation specification과 fixture 기대 verdict를
전달하지 않았다.

## 구현 결과

- API 없는 dry-run은 6 probes × 2 independent passes = 12 logical calls를 고정했다.
- 모델 출력은 학생 응답의 연속 substring과 tracked source segment ID만 근거로 허용한다.
- 최종 verdict는 LLM이 직접 정하지 않고 production query policy와 `normalizeQueryStates()`가
  결정론적으로 계산한다.
- `semanticState`와 source evidence ID가 하나라도 다르면 `quarantined`이며 다음 probe를
  실행하지 않는다.
- 첫 실행에서 부수 진단인 `expressionMode`까지 agreement에 포함한 구현 오류를 발견했다.
  승인된 계약대로 semantic state와 source evidence ID만 비교하도록 고쳤고, 과거 결과는
  덮어쓰지 않았다.
- 두 번째 실행에서 non-preserved state와 표현 축의 모순 조합을 schema가 허용한 결함을
  발견했다. 허용 가능한 상태 조합을 structured-output schema에서 제한하고 새 fingerprint로
  다시 실행했다.

## 최종 v3 canary

| Probe | 결과 | 파생 verdict | 비고 |
| --- | --- | --- | --- |
| 이사회-관계보존 | `auto_qualified` | `relation_preserved` | 두 pass의 state와 source refs 일치 |
| 이사회-주제만 | `auto_qualified` | `topic_only` | 두 pass의 state와 source refs 일치 |
| 이사회-관계오류 | `quarantined` | inconclusive | state는 일치했으나 contradiction evidence refs 불일치 |

격리 probe에서 두 pass는 `r3-scope`와 `r3-rel-approval`을 모두 `contradicted`로 판정하고
`r3-rel-delegation`을 모두 `not_evidenced`로 판정했다. 그러나 첫 pass는 두 contradiction의
원문 근거로 `S5`를 반환했고 두 번째 pass는 빈 `sourceEvidenceRefs`를 반환했다. verdict만
같고 내부 evidence contract가 다르면 자동 oracle로 확정하지 않는 정책에 따라 격리가 맞다.

v3 artifact는
`packages/pipeline/fixtures/probe-qualification/corporate-law-p2/2026-08-14-v3/`에 있다.
v1/v2는 구현 계약을 바로잡기 전 진단 결과이며 기존 파일을 덮어쓰지 않고 로컬에 보존했다.

## 호출과 중단

세 시도 전체에서 성공한 logical verifier call은 13회였다. 연결 실패 HTTP attempt 4회는 기존
retry 정책으로 복구됐다. 성공 호출 합계는 input 75,572 tokens, output 31,611 tokens이다.
격리 시점 이후 나머지 p2 probes, 6Q-3 자동 중재, 6Q-4 passage canary는 실행하지 않았다.

다음 행동은 contradiction 판정에서 source evidence refs가 빈 배열이어도 허용할지, 아니면
원문에 근거가 있는 contradiction은 반드시 source segment를 요구할지 evidence 정책을 하나로
결정하는 것이다. 정책 결정 전에는 같은 probe를 반복 호출하지 않는다.
