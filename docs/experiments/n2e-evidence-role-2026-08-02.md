# N2-e 해결 — 관계 판정을 질의 라벨이 아니라 증거 종류에 건다

- 날짜: 2026-08-02 / 모델: `claude-opus-4-8` (기준선 유지)
- 원시 로그: `docs/experiments/n2e-evidence-role-2026-08-02.log`
- 대조 기준선: `docs/experiments/n2a-v1-remeasure-2026-08-01.md` (v1, evidenceRole 이전)
- 코드: `6aa62ca`
- 오라클·프로브·기대값·생성 fixture: **전부 v1과 동일, 미수정** (단일 변수 비교)

## 문제

원칙 B는 "관계 층위 핵심 질의 중 보존된 것이 0개면 상한 `topic_only`"인데, **층위는
생성기가 붙인 라벨**이다. 생성기가 명칭 질의를 `level: relation` + critical로 지정하면
학생이 이름만 나열해도 관계 증거가 있는 것으로 처리된다.

실측(`photosynthesis-p5-v1-run1.json` 영역 r1):

```
q2  level: relation, criticalForRelation: true
    "C4 식물의 광합성이 이루어지는 공간은 몇 개이며 각각 무엇인가?"
    수용 기준: "순서 없이 두 이름만 언급해도 부분 인정"
학생: "C4 식물의 광합성 / 엽육 세포와 유관속초 세포"   → 부분관계 (기대: 주제만)
```

### 설계 중 발견한 두 가지

**(1) `semanticState`를 낮추는 해법은 쓸 수 없다.** q2의 질문은 "몇 개이며 각각 무엇인가"이고
학생은 실제로 답했다. `not_evidenced`로 낮추면 평가기가 거짓 진술을 하게 되고, 그 정보를
정당하게 집계해야 할 `argumentCoverage`가 함께 망가진다 — **원칙 A(두 축의 독립성) 위반.**

`query-eval` 프롬프트에는 이미 "대상 이름의 나열은 관계가 아니다"가 있었다(`450e750`). 그런데도
뚫린 것은 바로 위의 "**수용 기준을 그대로 따르라**"와 충돌해 생성된 수용 기준이 이겼기 때문이다.
우선순위를 뒤집어 수용 기준을 무시하게 만드는 방식은 위 이유로 채택하지 않았다.

**(2) `relation_preserved` 분기는 가드를 전혀 받지 않고 있었다.**

```ts
if (critical.length > 0 && preservedCount === critical.length) return 'relation_preserved';
// ↑ 여기서 반환되면 원칙 B는 실행조차 안 된다
```

r1은 critical 질의가 q2 **하나뿐**이므로 이름 나열 → `preservedCount === critical.length` →
곧장 `relation_preserved`. 실험에서 `부분관계`로 관측된 것은 `rebucketToOracle`이 gen1 영역들을
오라클 모양으로 합쳐 critical 집합을 키웠기 때문이며, **production 경로에는 완전 과대평가로
열려 있었다.** N2-e의 최악형이 실험 하네스에 가려져 있었다.

## 해법 — `evidenceRole`

"질의에 답했는가"(`semanticState`)와 "그 답이 관계 증거인가"(`evidenceRole`)를 가른다.

```
relation                대상에 역할·방향·조건·인과·대조·순서가 배정됨 (대상 개수 무관)
entity_identification   대상·개수를 지목했을 뿐 연결이 없음
scope                   화제만 지목
none                    preserved가 아닐 때
```

**판별축은 개수가 아니라 역할 배정이다.** 캐시 실측이 근거다 — `한쪽공간만` 프로브
("엽육 세포에서 이산화 탄소를 붙잡아 4탄당의 형태로 저장")는 **대상이 하나인데 관계 증거**이고
기준선 기대값이 `부분관계`다. "한쪽 대상만 언급 → 관계 아님"으로 정의했다면 이 기대값이 깨졌다.

`expressionMode`를 재활용하는 안은 데이터로 기각했다 — 이름 나열도 역할 배정도 `implicit`이
섞여 나오고, E2(병치 보존)가 정의상 `implicit`이라 게이트로 쓰면 검증된 동작이 깨진다.

### 정규화 계층

원칙 B를 **"층위 AND 증거" 연언**으로 좁혔다(대체가 아니다).

```ts
const criticalRelation = critical.filter((id) => region.relationQueries.includes(id));
const relationEvidenceMissing =
  criticalRelation.length > 0 && !criticalRelation.some((id) => isRelationEvidence(id, raw));

if (critical.length > 0 && preservedCount === critical.length && !relationEvidenceMissing) {
  return 'relation_preserved';          // ← 이 분기에도 가드를 걸었다
}
if (preservedCount >= 1 && !relationEvidenceMissing) return 'partial_relation_preservation';
```

- **연언이므로 `argumentQueries`에 있는 q6a는 오늘과 동일하게 동작한다** — 3축 기준선 미변경.
  대체했다면 q6a의 층위 배치가 무의미해져 §7의 미결이 부수적으로 닫혔을 것이다.
- `evidenceRole`이 **없는 판정은 관계 증거로 간주**한다. 채워졌을 때만 게이트가 좁아지는
  단조 축소라 회귀 표면이 좁다.

## 결과

```
과대평가 0건            (v1: 0건 — 유지)
오라클≠기대 1/13        (동일, 기지의 N2-c)
분해 4종 간 불안정 2/13 → 1/13
```

| 프로브 | 기대 | v1 (evidenceRole 이전) | v1 + evidenceRole |
|---|---|---|---|
| P3 전 7개 | — | 7/7 안정 | **7/7 안정 (변화 없음)** |
| P5 관계보존 | 관계보존 | 관계보존 ×4 | 관계보존 ×4 |
| **P5 주제만** ★ | 주제만 | 주제만 \| **부분관계** \| 주제만 \| 주제만 ⚠ | **주제만 ×4 ✓** |
| P5 조직만 | 주제만 | 미포착 ×4 (오라클≠기대) | 미포착 ×4 (동일) |
| P5 한쪽공간만 | 부분관계 | 부분관계 \| **주제만** \| 부분관계 \| 부분관계 ⚠ | 동일 ⚠ |
| P5 관계오류 | 모순 | 모순 ×4 | 모순 ×4 |
| P5 대조군 | 관계보존 | 관계보존 ×4 | 관계보존 ×4 |

**사전 예측과 대조** (실행 전 기록):

| 예측 | 결과 |
|---|---|
| P5 주제만 gen1: 부분관계 → topic_only | **적중** |
| P5 한쪽공간만: 부분관계 유지 | **적중** (gen1 이상은 별개 원인이라 미변화) |
| P3 전 7개: 변화 없음 | **적중** |
| 위험 — 광범위 과소평가 | **발생 안 함** |

남은 불안정 1건(P5 `한쪽공간만` gen1)은 **N2-e와 다른 원인**이다. gen1만 "두 공간이 몇 개인가"
개괄 영역을 따로 두어 분업 관계를 영역 경계 위로 끌어올렸고, 오라클 `division`으로 재버킷팅될 때
한쪽 공간만 언급한 응답이 관계 증거를 잃는다. 생성기 분해 구조 문제이며 evidenceRole 이전에도
동일했다.

## 분류기 검증 (필수 절차)

새 축이 게이트를 지므로 **분류 정확도를 사람이 확인하지 않으면 안 된다.** 정규화 계층
단위 테스트는 `evidenceRole` 값을 손으로 넣으므로 게이트 논리만 검증하고 분류기는 검증하지 못한다.

도구: `packages/pipeline/scripts/inspect-evidence-role.py`

```
evidenceRole이 붙은 판정 653건
  none                   446      (preserved 아님)
  scope                  108
  relation                87
  entity_identification   12
정합성: preserved가 아닌 판정은 전부 role=none ✓ (위반 0건)
```

`entity_identification` **12건 전수 검사** — 전부 타당하다.

| 질의 | 층위 | 질문 | 학생 증거 |
|---|---|---|---|
| 오라클 `q2` | relation_structure, **critical** | "C4 식물의 광합성은 무엇이 특징인가?" | "엽육 세포와 유관속초 세포" |
| gen `q2`/`r3q3`/`r2q2` | relation, critical | "공간은 몇 개이며 각각 무엇인가?" | "엽육 세포와 유관속초 세포" |
| p5 `r2q2`/`r3q3` | argument | "공간의 **이름**은 무엇인가?" | "엽육 세포에서 CO₂를 PEP와 결합" |
| p3 `r4q3` | argument | "식물의 **범위**는 어느 정도인가?" | "이렇게 광합성하는 대부분의 식물" |
| 오라클 `q6b` | relation_argument | "필요한 환경 **조건은 무엇인가**?" | "CO₂ 농도와 온도가 적정해야" |

주목할 점: 술어를 포함한 조각("…PEP와 결합", "…보내")도 `entity_identification`으로 분류됐는데,
확인해 보니 **그 질의들이 전부 명칭·식별 질의**였다. 즉 분류기는 역할을 *문장이 술어를 포함하는가*가
아니라 **이 질의가 무엇을 묻는가에 비추어** 판정한다. 의도한 의미론이며 오분류가 아니다.

## 결론

**N2-e를 닫는다.**

- 목표 프로브가 `부분관계` → `주제만 ×4`로 교정됐고 다른 12개 프로브는 불변이다.
- 과대평가 0건 유지, 불안정 2/13 → 1/13.
- q6a 층위 배치는 손대지 않았다(연언 좁히기).
- **실험이 가리고 있던 `relation_preserved` 과대평가 구멍을 함께 막았다** — 이쪽이 실제로는
  더 위험했다.
- 분류기 12건 전수 검사 통과.

## 다음

1. **생성기 v2 (미착수)** — 안전장치는 걸렸지만 생성기가 여전히 명칭 질의를 relation+critical로
   만든다. 평가 품질·설명 가능성 문제로 남아 있다. 프롬프트에 "명칭·개수만 묻는 질의는 층위와
   무관하게 critical 금지"를 넣고 `GENERATOR_VERSION`을 v2로 올린 뒤 재측정해야 한다.
2. **P5 gen1 분해 구조** — 남은 불안정 1건. 개괄 영역 분리가 재버킷팅과 어긋난다.
3. **기타 회귀 세트 재측정 미실시** — `assess.ts`의 `CONFIGS`·`NEW_CONFIGS`(법인·공시 등)는
   이번에 돌리지 않았다. 평가 캐시가 전량 무효화됐으므로 이들도 재측정 대상이다.
   특히 **법인 문단은 q6a가 있는 곳**이라 연언 좁히기가 의도대로 q6a를 보존했는지
   실측으로 확인해야 한다. 단위 테스트(E)로는 확인했으나 실제 판정으로는 미확인.
