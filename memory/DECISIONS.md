# 결정 색인

현재 효력이 있는 결정과 의도적으로 보류·폐기한 선택을 찾는 색인이다. 상세 근거와 재검토
조건은 각 레코드에 있다.

| ID | 상태 | 범위 | 결정 |
|---|---|---|---|
| [`D-0001`](./decisions/D-0001-semantic-relation-verdict.md) | accepted | 문단 평가 | 핵심 의미 관계 보존을 기본 채점축으로 사용 |
| [`D-0002`](./decisions/D-0002-problem-source-direct-runtime.md) | accepted | 문제 풀이 | 전체 런타임을 원문 직접 방식으로 운영 |
| [`D-0003`](./decisions/D-0003-problem-gold-offline-only.md) | accepted | 문제 골드 | 구조화 문제 골드를 오프라인 자산으로 제한 |
| [`D-0004`](./decisions/D-0004-paragraph-selective-dialogue-v2.md) | accepted | 문단 대화 | 간결 판정과 선택적 상세 진단을 결합 |
| [`D-0005`](./decisions/D-0005-paragraph-gold-audit-baseline.md) | accepted | 문단 골드 | 단일 감사 v1 생산 기준선을 유지 |
| [`D-0006`](./decisions/D-0006-title-abstraction-reward-deferred.md) | accepted | 표제 평가 | 추상화 보상 판정을 보류 |

## 상태 의미

- `proposed`: 검토 중이며 정본 설계가 아님
- `accepted`: 현재 효력이 있음
- `rejected`: 검토했으나 채택하지 않음
- `superseded`: 더 최신 결정이 대체함
- `deprecated`: 역사적 호환 때문에 남아 있으나 새 작업에 적용하지 않음
| [`D-0092`](./decisions/D-0092-claude-codex-work-division.md) | accepted | 클로드·코덱스 업무 분장 | 클로드=주 사고 파트너, 코덱스=명시 시 보조 논의·확정 설계 실행. 인계 문서·중단 보고·diff 검토 |
