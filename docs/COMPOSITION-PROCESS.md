# 평가 엔진의 합성(Composition) 프로세스

완성 상태: 2026-08-01  
목적: 명제 분해 결과 → 위계 구조 → 평가 영역으로 준비하는 **두 번째 단계** 설명

> ⚠️ **예시 데이터는 손으로 구성한 것이다 (미검증).**
> 아래 위계 `c1~c5`, primary/secondary 배정, witness 문장은 설명을 위해 **사람이 작성한
> 예시**이며 `compose()`를 실제로 실행한 출력이 아니다. 특히 "이 명제를 지우면 어느 노드가
> 더 훼손되는가"의 판단은 `regenerate()`로 실측하지 않고 서술한 것이다.
> **원칙·프롬프트·코드 위치 설명은 실제 코드에 근거하지만, 예시 위계 자체는 검증되지 않았다.**

---

## 1. 입력: 명제 분해 결과 (p1~p11)

이전 단계에서 분해한 11개 명제:

| ID | 명제 | 술어 | 측면 | 관계 |
|----|------|------|------|------|
| p1 | 공손룡은 '실'이 '물'로부터 파생된 것이라고 주장했다 | theory_of_derivation | definition | 물→실 |
| p2 | '물'은 아직 분화되지 않은 천지 만물을 뜻한다 | definition_of_substance | definition | 미분화상태→만물 |
| p3 | '실'은 '물'에서 분화된 각각의 개체다 | definition_of_individual_reality | definition | 물→분화→실 |
| p4 | '명'은 '실'을 지시하는 역할을 한다 | function_of_name | definition | 명→실 |
| p5 | '명'은 '실'들 사이의 다름을 구별·확정한다 | discrimination_function | description | 실차이→명의구별기능 |
| p6 | '명'은 인간이 사상과 감정을 주고받게 한다 | communication_function | description | 명→사상감정교환 |
| p7 | 어떤 '실'은 유일한 '명'에 의해서만 지시되어야 한다 | one_to_one_correspondence_rule | normative | 실→유일명 |
| p8 | 어떤 '명'은 유일한 '실'만을 지시하여야 한다 | one_to_one_correspondence_rule | normative | 명→유일실 |
| p9 | 서로 다른 실(이것/저것)이 같은 명으로 지시되면 구별되지 않는다 | consequence_of_violation_1 | result | 명혼동→실구별불가 |
| p10 | 그럼 같은 명으로 다른 실을 지시하는 혼란이 생긴다 | consequence_of_violation_2 | result | 명혼동→실지시혼란 |
| p11 | 공손룡은 명-실 일대일 대응으로 오해와 문제를 방지하려 했다 | purpose_of_correspondence | intention | 일대일대응→문제방지 |

---

## 2. 위계 구조 시각화

### 2.1 최종 위계 트리

```
타이틀 (c5): 공손룡의 명실론
│
├─ 1차 합성 노드 (c1) ⭐ primary
│  ├─ p1: 실의 물로부터의 파생
│  ├─ p2: 물의 정의 (미분화 만물)
│  └─ p3: 실의 정의 (분화된 개체)
│
├─ 1차 합성 노드 (c2) ⭐ primary
│  ├─ p4: 명의 기본 역할 (실 지시)
│  ├─ p5: 명의 구별 기능
│  └─ p6: 명의 소통 기능
│
├─ 1차 합성 노드 (c3) ⭐ primary
│  ├─ p7: 일대일 대응 규칙 1 (실→명)
│  └─ p8: 일대일 대응 규칙 2 (명→실)
│
└─ 1차 합성 노드 (c4) ⭐ primary
   ├─ p9: 규칙 위반 시 결과 1 (실 구별 불가)
   ├─ p10: 규칙 위반 시 결과 2 (명 지시 혼란)
   └─ [secondary 간선] ← p11과의 관계
       └─ p11: 규칙의 목적 (문제 방지)
```

### 2.2 상세 노드 정의

#### **타이틀 (c5) - 루트**

```
ID: c5
Kind: title
Text: 공손룡은 명과 실의 일대일 대응을 통해 명이 역할을 할 때 
      오해나 문제가 생기지 않도록 하려는 이론을 주장했다
ShortForm: 공손룡의 명실론 — 일대일 대응을 통한 문제 방지
ChildIds: [c1, c2, c3, c4]
introducesRelation: true  (전체 구조의 인과 관계 도입)
subsumedByParent: false  (루트이므로)
```

#### **c1: 물·실·명의 정의**

```
ID: c1
Kind: composite
Text: 공손룡에 따르면 미분화 상태의 천지 만물(물)에서 분화된 
      각각의 개체(실)를 지시하는 역할을 명이 한다
ShortForm: 물→분화→실→명의 지시 구조
ChildIds: [p1, p2, p3]
introducesRelation: true  (물-실-명의 인과 구조 도입)
subsumedByParent: false

근거:
  Ablation test: p1, p2, p3 중 하나라도 제거하면
                "기본 이론" 개념이 크게 훼손됨
```

#### **c2: 명의 기능**

```
ID: c2
Kind: composite
Text: 명은 실들 사이의 다름을 구별·확정하고 
      인간이 사상과 감정을 주고받게 하는 역할을 한다
ShortForm: 명의 이중 기능 (구별 + 소통)
ChildIds: [p4, p5, p6]
introducesRelation: false  (기능들의 병렬 나열, 새 관계 미도입)
subsumedByParent: false

근거:
  p4의 포괄적 표현("명은 역할을 한다")이 
  p5, p6의 구체적 사례를 이미 포함하므로
  introducesRelation은 false
```

#### **c3: 일대일 대응 규칙**

```
ID: c3
Kind: composite
Text: 공손룡은 어떤 실은 유일한 명에 의해서만 지시되어야 하고,
      어떤 명은 유일한 실만을 지시하여야 한다고 주장했다
ShortForm: 명-실의 엄격한 일대일 대응 원칙
ChildIds: [p7, p8]
introducesRelation: true  (규범적 조건 도입)
subsumedByParent: false

근거:
  p7, p8은 기능 설명(c2)을 넘어 규범적 요구를 도입
  기능과 규칙의 계층 분리
```

#### **c4: 규칙 위반 시 결과**

```
ID: c4
Kind: composite
Text: 만약 서로 다른 실이 같은 명으로 지시된다면
      실을 구별할 수 없고 명 지시에 혼란이 생긴다
ShortForm: 일대일 대응 규칙 위반의 귀결
ChildIds: [p9, p10]
introducesRelation: true  (조건-결과 관계 도입)
subsumedByParent: false

근거:
  p9, p10은 c3의 규칙이 왜 필요한지 정당화하는 사실
  하지만 c3에 이미 포함되지 않은 새로운 논증 구조
```

---

## 3. Primary 부모 지정의 원리와 근거

### 3.1 원칙: 의미 기여도 (Ablation Weight)

**코드 위치**: `packages/pipeline/src/llm/kernel.ts` (105~107행)

```typescript
primary 부모 지정:
- 그 노드가 **가장 크게 기여하는** 상위 개념을 primary로 정한다.
- 분류상 자명한 소속이 아니라,
  그 노드를 지웠을 때 어느 상위 노드가 더 크게 훼손되는지를 기준으로 판단하라.
```

### 3.2 각 명제의 Primary 부모 결정 과정

#### **p1의 Primary: c1**

```
명제: "공손룡은 '실'이 '물'로부터 파생된 것이라고 주장했다"

가능한 상위 후보:
  a) c1 (물·실·명의 정의): p1을 제거하면 "물의 출발점"이 불명확
                          → 심각한 훼손 ⭐ PRIMARY
  b) c5 (타이틀): p1을 제거해도 전체 이론 구조는 여전히 성립
                 → 경미한 훼손

선택 근거:
  - p1은 c1의 "출발점" 역할
  - c1의 첫 단계 없이는 c2(명의 기능)도 그 배경을 잃음
```

#### **p5의 Primary: c2**

```
명제: "명은 '실'들 사이의 다름을 구별·확정한다"

가능한 상위 후보:
  a) c2 (명의 기능): p5를 제거하면 명의 "구별 기능"이 사라짐
                     → 심각한 훼손 ⭐ PRIMARY
  b) c1 (기본 이론): p5는 이미 p4("명은 지시하는 역할")로 커버됨
                     → 경미한 훼손

선택 근거:
  - p5는 c2의 핵심 기능 중 하나
  - c2는 명의 역할을 설명하는 노드인데, 
    구별 기능이 없으면 명의 역할이 부분적으로만 설명됨
```

#### **p11의 Primary: c4? c5?**

```
명제: "공손룡은 명-실 일대일 대응으로 오해와 문제를 방지하려 했다"

가능한 상위 후보:
  a) c4 (규칙 위반 결과): p11은 c3 규칙의 "목적"
                         그런데 c4는 "결과"를 다룸
                         → 어느 정도 훼손
  b) c5 (타이틀): p11은 전체 이론의 최종 의도
                  p11 제거 시 "왜 이 이론이 필요한가"의 답이 명확해짐
                  → 약간의 훼손 ⭐ SECONDARY 고려

결정:
  공식 구조: p11의 primary = c4
  사유: c4는 "문제 상황"을 설명하고,
       p11은 "그 문제를 해결하려는 목적"이므로
       직접적 기여도는 c4에 더 높음
  
  하지만 p11은 c5와도 secondary 간선을 가질 수 있음
  (아래 secondary 섹션 참조)
```

### 3.3 재구성 함수 (regenerate)

명제를 제거했을 때 부모를 재구성해 훼손도를 측정:

**코드 위치**: `packages/pipeline/src/llm/kernel.ts` (232~)

```typescript
export async function regenerate(
  paragraphText: string,
  composed: Composed,
  parentId: string,
  removedChildId: string,
): Promise<string>
```

**프롬프트** (`REGENERATE_SYSTEM`, 139~146행):
```
어떤 상위 노드가 여러 하위 요소를 아울러 성립한다.
그중 **일부만 주어졌을 때**, 주어진 것들만으로 
이 상위 노드가 무엇을 말할 수 있는지 한 문장으로 재구성하라.

- 주어지지 않은 내용을 복원하거나 추론해 넣지 마라.
- 남은 요소들로 말할 수 있는 범위가 좁아졌다면, 좁아진 그대로 진술하라.
```

**예시 (p1 제거 후 c1 재구성)**:

```
원본 c1: "미분화 만물(물)에서 분화된 개체(실)를 지시하는 명의 역할"

p1 제거 후: "분화된 개체(실)를 지시하는 명의 역할"
            (물의 개념이 사라짐, 출발점 불명확)

훼손 정도: **높음** → p1은 c1의 primary 자식이 맞다
```

---

## 4. Secondary 간선과 Witness

### 4.1 원칙: 평가 영향도 (Evaluation Effect)

**코드 위치**: `packages/pipeline/src/llm/kernel.ts` (118~135행)

```typescript
secondary 간선 — **개수를 목표로 삼지 마라. 0개가 정답인 문단이 많다.**

만들기 전에 **반사실 검사**를 하라:
이 간선을 삭제했을 때 판정이 달라지는 
**구체적인 학생 문장**을 쓸 수 있는가?
```

### 4.2 이 문단의 Secondary 간선

#### **간선 1: c3 (규칙) ← → c4 (결과) [양방향]**

```
관계 타입: rule_justification (규칙-정당화)

간선 구조:
  c3 ──rule_justification→ c4
  (c4가 c3 규칙의 정당화 역할)

Witness (판정이 달라지는 학생 문장):
  "명과 실이 다대다로 대응될 수 있다면, 
   같은 명으로 다른 실을 지시할 때 혼란이 생긴다"

  이 문장은:
  - c3만 알면: "다대다가 가능하다"는 것만 파악 (규칙 해석 오류)
  - c4를 알면: "혼란이 생긴다"는 결과까지 이해 (올바른 이해)
  
  간선이 없으면 → topic_only (규칙만 포착)
  간선이 있으면 → relation_preserved (규칙-결과 관계 이해)

필요성: ✅ 필수
```

#### **간선 2: c4 (결과) ← → c5 (목적) [선택적]**

```
관계 타입: purpose_driven (목적-동인)

간선 구조:
  c4 ──consequence_of_lack→ p11
  (p11의 목적이 c4의 결과를 막기 위함)

Witness:
  "명과 실의 관계가 명확하지 않으면 의사소통이 어려워지므로,
   공손룡은 일대일 대응을 주장했다"

  이 문장은:
  - c4 없이: "일대일 대응을 주장했다"만 알 수 있음
            (규칙의 동기가 불명확)
  - c4 있으면: "문제를 해결하기 위해"라는 인과 관계 파악
            (이론의 정당성 이해)

필요성: ✅ 학생의 종합 이해를 평가하려면 필요
```

### 4.3 Secondary 제외된 간선 (불필요)

#### **×  p4 (명의 기본 역할) ← → p5 (명의 구별 기능)**

```
왜 간선이 불필요한가:

반사실 검사:
  이 간선을 지우면 판정이 달라지는 학생 문장?
  
  → 찾을 수 없음
  
이유:
  p4와 p5는 이미 같은 상위 노드 c2에 속해있고,
  c2의 규범이 "명의 기능들의 종합"이므로,
  p4를 포함하면서 p5를 빼도
  명의 부분적 기능만 포착 → topic_only
  
  c2 차원에서 이미 "기능 불충분"이 잡힌다.
  별도 간선은 중복이다.

결론: ✗ 불필요
```

---

## 5. 합성의 세부 과정 (코드)

### 5.1 합성 함수 호출

**파일**: `packages/pipeline/src/llm/kernel.ts` (197~229행)

```typescript
export async function compose(
  paragraphText: string,
  decomposed: Decomposed,
  paragraphId?: string,
): Promise<Composed>
```

**입력**:
- `paragraphText`: 원문 전체
- `decomposed`: 명제 분해 결과 (p1~p11 + 관계)

**처리 과정**:

1. **입력 구성** (204~213행)
   ```typescript
   const list = decomposed.propositions
     .map((p) => 
       `${p.id}: ${p.text}\n` +
       `    관계: ${p.relation.from} →(${p.relation.kind}) ${p.relation.to}\n` +
       `    층위: ${p.aspect} / 역할: ${p.subjectRole} / 술어: ${p.predicate}`
     )
   ```
   → 명제 정보를 LLM이 이해하기 좋은 형태로 정렬

2. **LLM 호출** (215~226행)
   ```typescript
   const response = await getClient().messages.parse({
     model: MODEL,
     max_tokens: 16000,
     thinking: { type: 'adaptive' },
     output_config: { effort: 'high', format: zodOutputFormat(ComposeSchema) },
     system: COMPOSE_SYSTEM,
     messages: [
       { role: 'user', content: 
         `원문 문단:\n${paragraphText}\n\n최소 명제:\n${list}` }
     ],
   })
   ```

3. **출력** (`ComposeSchema`에 따라):
   ```typescript
   {
     composites: [
       { id: 'c1', text: '...', childIds: ['p1', 'p2', 'p3'], 
         introducesRelation: true, ... },
       { id: 'c2', ... },
       ...
     ],
     titleId: 'c5',
     secondaryEdges: [
       { fromId: 'c3', toId: 'c4', type: 'rule_justification', 
         witness: '...' },
       ...
     ]
   }
   ```

### 5.2 프롬프트 (COMPOSE_SYSTEM)

**파일**: `packages/pipeline/src/llm/kernel.ts` (96~137행)

**핵심 지시**:

```
각 노드는 **primary 부모를 정확히 하나** 갖는다.
위계의 루트가 타이틀이며, 문단 전체의 핵심을 한 문장으로 담는다.
중간 합성 노드는 2~5개의 자식을 아우른다.

primary 부모 지정:
- 그 노드를 지웠을 때 어느 상위 노드가 더 크게 훼손되는지를 기준

각 합성 노드에 두 판단을 함께 낸다:
- introducesRelation: 이 노드가 자식들을 넘어서는 새 관계를 도입하는가?
- subsumedByParent: 상위 노드가 이미 이 노드의 일반화 의미를 포함하는가?

secondary 간선:
- 이 간선을 삭제했을 때 판정이 달라지는 구체적인 학생 문장을 쓸 수 있는가?
- 못 쓰면 만들지 마라.
```

---

## 6. 다음 단계

합성 완료 후:

### **3단계: 영역 구성** 
- c1, c2, c3, c4 각각이 하나의 **의미 영역**이 됨
- 각 영역에 scope/relation/argument 질의를 배정

### **4단계: 질의 생성** (query-gen.ts)
- 각 영역의 질의 세트 자동 생성
- 원칙 A~G 적용

### **5단계: 평가** (assessment.ts)
- 학생 응답이 질의들을 만족하는지 검사
- regionSemanticVerdict (5값) 판정

---

## 7. 구조 검증 규칙

### 7.1 Primary 구조 검증

```
✅ 모든 명제는 정확히 하나의 primary 부모를 가져야 함
✅ 모든 합성 노드의 자식은 2개 이상 5개 이하여야 함
✅ 타이틀(루트)은 모든 명제와 합성 노드의 조상이어야 함
✅ 부모-자식 관계는 트리 구조 (순환 금지)
```

### 7.2 Secondary 구조 검증

```
✅ 두 노드가 서로 다른 primary 가지에 있어야 함
✅ primary 경로의 단순 단축이 아니어야 함
✅ witness가 명시되어야 함
✅ 양방향 관계는 하나만 (역방향 중복 금지)
```

---

## 8. 코드 구조 요약

| 단계 | 함수 | 파일 | 역할 |
|-----|------|------|------|
| **입력** | decompose() 결과 | gold.ts | 명제 배열 |
| **합성** | compose() | kernel.ts | 위계 구조 생성 (LLM) |
| **프롬프트** | COMPOSE_SYSTEM | kernel.ts | LLM 지시 |
| **검증** | regenerate() | kernel.ts | 의미 기여도 측정 |
| **스키마** | ComposeSchema | schemas.ts | 출력 형식 정의 |

---

## 9. 명제 vs 합성 노드 vs 영역

| 개념 | 정의 | 개수 | 역할 |
|-----|------|------|------|
| **명제** | 하나의 관계를 담는 최소 단위 | 11개 | 원자적 주장 |
| **합성 노드** (c1~c5) | 명제들을 의미별로 묶은 중간 계층 | 5개 | 위계 구조 구성 |
| **영역** | 타이틀 바로 아래 합성 노드들 | 4개 (c1~c4) | 평가 단위 |

```
타이틀 (c5)
  ├─ 영역1 (c1) → 질의 세트
  ├─ 영역2 (c2) → 질의 세트
  ├─ 영역3 (c3) → 질의 세트
  └─ 영역4 (c4) → 질의 세트
```
