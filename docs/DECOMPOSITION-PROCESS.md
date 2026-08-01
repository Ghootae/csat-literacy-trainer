# 평가 엔진의 명제 분해 프로세스

완성 상태: 2026-08-01  
목적: 원문 → 명제 분해 → 영역 구성 → 질의 생성 → 평가 파이프라인의 **첫 번째 단계** 설명

> ⚠️ **예시 데이터는 손으로 구성한 것이다 (미검증).**
> 아래 명실론 문단의 명제 `p1~p11`, 술어·층위·역할 값은 설명을 위해 **사람이 작성한
> 예시**이며 `decompose()`를 실제로 실행한 출력이 아니다. 실행하면 명제 개수와 술어
> 이름이 달라질 수 있다. **구조·원칙·코드 위치 설명은 실제 코드에 근거해 정확하지만,
> 예시 값 자체를 회귀 기준으로 쓰면 안 된다.**
> 실제 출력이 필요하면 `npm run gold1 -- <setId> <문단인덱스>`로 생성해 대체할 것.

---

## 1. 원문 예시

**출처**: 고3 2023년 4월 교육청 모의평가 (명실론 문단)  
**ID**: 69c011fd78128b2a9beddd5e  
**제목**: 공손룡과 후기 묵가의 명실론

### 전체 원문

명(名)과 실(實), 즉 이름과 실재의 상관관계를 다루는 명실(名實)의 문제는 정치, 윤리적인 차원에서만 다루어지다가 전국 시대 중엽 이후에 하나의 독립적인 영역을 가진 철학적 주제로 정립되었다. 이 시기에 이렇게 명실 문제를 전문적으로 다룬 대표적인 사상가와 학파가 공손룡과 후기 묵가(墨家)로, 이들 사이에서는 철학적 논쟁의 국면이 펼쳐졌다.

**명가(名家) 사상가인 공손룡은 '실'이 '물(物)'로부터 파생된 것이라고 하였다. 이때 '물'은 아직 분화되지 않은 상태의 천지 만물을 뜻한다. '실'은 '물'에서 분화된 각각의 개체이고, 이를 지시하는 역할을 하는 것이 '명'이다. 인간이 붙이는 '명'은, 인간과 무관하게 분화되어 있는 '실'들 사이의 다름을 인간의 입장에서 구별하여 확정하고, 인간이 사상과 감정을 주고받게 하는 역할을 한다. 그는 어떤 '실'은 그것을 가리키는 어떤 '명'에 의해서만 유일하게 지시되어야 한다는 것과, 어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다. 공손룡에 따르면 서로 다른 실인 이것[此]과 저것[彼]이 똑같이 '이것'이라는 명으로 지시된다면 서로 구별되지 않게 되고, 그 결과 어떤 사람은 '이것'이라는 명으로 이것이라는 실을, 다른 사람은 '이것'이라는 명으로 저것이라는 실을 지시하는 혼란이 나타나게 된다. 그는 명과 실의 엄격한 일대일 대응 관계를 통해, 명이 그 역할을 할 때 오해나 문제가 생기지 않게 하려 하였다.**

[이어서 후기 묵가의 주장이 이어짐...]

### 분석 대상 문단

위의 **진하게 표시된 부분** (공손룡의 명실론을 설명하는 두 번째 단락)을 분해 대상으로 삼습니다.

---

## 2. 명제 분해 결과 예시

이 문단을 최소 의미 명제로 분해하면 다음과 같습니다.

### 원문 문장 분할 (S1~S5)

```
S1: 명가(名家) 사상가인 공손룡은 '실'이 '물(物)'로부터 파생된 것이라고 하였다.

S2: 이때 '물'은 아직 분화되지 않은 상태의 천지 만물을 뜻한다.
S3: '실'은 '물'에서 분화된 각각의 개체이고, 이를 지시하는 역할을 하는 것이 '명'이다.

S4: 인간이 붙이는 '명'은, 인간과 무관하게 분화되어 있는 '실'들 사이의 다름을 인간의 입장에서 
    구별하여 확정하고, 인간이 사상과 감정을 주고받게 하는 역할을 한다.

S5: 그는 어떤 '실'은 그것을 가리키는 어떤 '명'에 의해서만 유일하게 지시되어야 한다는 것과, 
    어떤 명은 유일하게 어떤 실만을 지시하여야 한다는 것을 주장하였다.

S6: 공손룡에 따르면 서로 다른 실인 이것[此]과 저것[彼]이 똑같이 '이것'이라는 명으로 지시된다면 
    서로 구별되지 않게 되고, 그 결과 어떤 사람은 '이것'이라는 명으로 이것이라는 실을, 다른 사람은 
    '이것'이라는 명으로 저것이라는 실을 지시하는 혼란이 나타나게 된다.

S7: 그는 명과 실의 엄격한 일대일 대응 관계를 통해, 명이 그 역할을 할 때 오해나 문제가 생기지 
    않게 하려 하였다.
```

### 명제 분해

| ID | 명제 텍스트 | 술어 (predicate) | 측면 (aspect) | 주체 역할 (subjectRole) | 근거 문장 | 관계 | 학습 슬롯 |
|----|-----------|-----------------|-------------|----------------------|---------|------|--------|
| p1 | 공손룡은 '실'이 '물'로부터 파생된 것이라고 주장했다 | theory_of_derivation | definition | theorist | S1 | 물→실 | true |
| p2 | '물'은 아직 분화되지 않은 천지 만물을 뜻한다 | definition_of_substance | definition | philosopher | S2 | 미분화상태→만물 | false |
| p3 | '실'은 '물'에서 분화된 각각의 개체다 | definition_of_individual_reality | definition | philosopher | S3 | 물→분화→실 | false |
| p4 | '명'은 '실'을 지시하는 역할을 한다 | function_of_name | definition | name_itself | S3 | 명→실 | true |
| p5 | '명'은 '실'들 사이의 다름을 구별·확정한다 | discrimination_function | description | name_itself | S4 | 실차이→명의구별기능 | true |
| p6 | '명'은 인간이 사상과 감정을 주고받게 한다 | communication_function | description | name_itself | S4 | 명→사상감정교환 | true |
| p7 | 어떤 '실'은 유일한 '명'에 의해서만 지시되어야 한다 | one_to_one_correspondence_rule_1 | normative | rule_itself | S5 | 실→유일명 | true |
| p8 | 어떤 '명'은 유일한 '실'만을 지시하여야 한다 | one_to_one_correspondence_rule_2 | normative | rule_itself | S5 | 명→유일실 | true |
| p9 | 서로 다른 실(이것/저것)이 같은 명으로 지시되면 구별되지 않는다 | consequence_of_violation_1 | result | logical | S6 | 명혼동→실구별불가 | true |
| p10 | 그럼 같은 명으로 다른 실을 지시하는 혼란이 생긴다 | consequence_of_violation_2 | result | logical | S6 | 명혼동→실지시혼란 | true |
| p11 | 공손룡은 명-실 일대일 대응으로 오해와 문제를 방지하려 했다 | purpose_of_correspondence | intention | theorist | S7 | 일대일대응→문제방지 | true |

### 명제 상세 예시 (JSON 형식)

```json
{
  "p1": {
    "id": "p1",
    "text": "공손룡은 '실'이 '물'로부터 파생된 것이라고 주장했다",
    "shortForm": "실의 물로부터의 파생",
    "predicate": "theory_of_derivation",
    "argument": "",
    "aspect": "definition",
    "subjectRole": "theorist",
    "sourceSentences": ["S1"],
    "relation": {
      "from": "물(物)",
      "to": "실(實)",
      "kind": "derivation"
    },
    "standaloneSlotValue": true
  },
  
  "p7": {
    "id": "p7",
    "text": "어떤 '실'은 그것을 가리키는 어떤 '명'에 의해서만 유일하게 지시되어야 한다",
    "shortForm": "실은 유일한 명에 의해서만 지시되어야 함 (일대일 대응 규칙 1)",
    "predicate": "one_to_one_correspondence_rule",
    "argument": "entity_to_name_direction",
    "aspect": "normative",
    "subjectRole": "rule_itself",
    "sourceSentences": ["S5"],
    "relation": {
      "from": "특정 실",
      "to": "유일한 명",
      "kind": "should_be_designated_by"
    },
    "standaloneSlotValue": true
  }
}
```

---

## 3. 명제 분해 과정의 세부 논리

### 3.1 프로세스 흐름

```
원문 입력
  ↓
[문장 분할] S1, S2, ..., S7
  ↓
[명제 분해] p1~p11 (최소 의미 단위)
  ↓
[완전성 검증] 모든 문장이 최소 1개 명제에 근거됨?
  ↓ (실패 시 재시도 max 3회)
  ↓ (성공)
Decomposed 객체 반환
  ↓
(다음 단계: compose → 위계 구성)
```

### 3.2 분해 원칙 (코드: `DECOMPOSE_SYSTEM`)

**파일**: `packages/pipeline/src/llm/kernel.ts` (29~94행)

#### 3.2.1 최소 의미 명제 정의

> 더 쪼개면 의미가 성립하지 않는 단위이며, 각각이 **하나의 관계**(시작 개념 → 끝 개념)를 담는다.

**예시**:
- ✅ "공손룡은 '실'이 '물'로부터 파생된 것이라고 주장했다" → `물→파생→실` 하나의 관계
- ❌ "명가 사상가인 공손룡은 명실 문제를 다루었고 그는 주장했다" → 2개 개념 혼합 (분리 필요)

#### 3.2.2 한 문장의 복수 명제 분해

**원칙**: 한 문장이 조건절이나 관계절을 품으면 여러 명제로 쪼갠다.

**예시** (S3):
```
원문: '실'은 '물'에서 분화된 각각의 개체이고, 이를 지시하는 역할을 하는 것이 '명'이다.

분해:
  p3: '실'은 '물'에서 분화된 각각의 개체다
  p4: '명'은 '실'을 지시하는 역할을 한다
```

**코드 위치**: `decompose()` 함수 (156~195행)
- LLM이 `DECOMPOSE_SYSTEM` 프롬프트를 받아 분해 실행
- `DecomposeSchema` (스키마.ts)에 따라 구조화 출력

#### 3.2.3 설명 층위 정규화 (aspect)

**원칙**: 명제를 원문 표현 그대로 두면 독립시켰을 때 원문에 없는 함의가 생긴다.

**예시 (잘못된 것)**:
```
"공손룡은 '명'이 '실'을 지시하는 역할을 한다고 주장했다"
  → 독립시키면 "'명'이 직접 지시한다"로 읽혀 뒤 문장과 모순처럼 들림
```

**수정 (정규화)**:
```
p4: "명의 정의적 역할은 실을 지시하는 것이다"
  → aspect: "definition" (정의 층위로 명확화)
  → 실제 지시 행동과 역할 정의를 분리
```

**적용된 aspect 값** (이 문단):
- `definition`: 개념의 정의 (p1, p2, p3, p4)
- `normative`: 규범적 주장 (p7, p8)
- `result`: 결과/귀결 (p9, p10)
- `intention`: 의도/목표 (p11)

**코드 위치**: `DECOMPOSE_SYSTEM` (45~93행)

#### 3.2.4 술어 규칙 (predicate)

**원칙**: 같은 대상의 서로 다른 역할은 다른 술어로, 같은 규칙의 다른 대상은 같은 술어로.

**예시** (이 문단의 경우):
```
p5, p6: 둘 다 '명'의 기능을 설명하지만
  p5: discrimination_function (차이 구별 기능)
  p6: communication_function (사상감정 교환 기능)
  → 다른 역할이므로 다른 술어

p7, p8: 둘 다 일대일 대응을 설명하지만
  p7: one_to_one_correspondence_rule (argument: "entity_to_name_direction")
  p8: one_to_one_correspondence_rule (argument: "name_to_entity_direction")
  → 같은 규칙, 다른 방향이므로 같은 술어 + argument로 구분
```

**코드 위치**: `DECOMPOSE_SYSTEM` (65~77행)

#### 3.2.5 주체 역할 (subjectRole)

각 명제에서 주체가 무엇인지 명시. 이는 나중에 역할 분리 관계를 파악하는 데 필수.

**이 문단의 역할들**:
- `theorist`: 공손룡 (p1, p11)
- `philosopher`: 추상적 이론가 역할 (p2, p3)
- `name_itself`: 명(名) 자체의 역할 (p4, p5, p6)
- `rule_itself`: 규칙 자체 (p7, p8)
- `logical`: 논리적 귀결 (p9, p10)

### 3.3 완전성 검증 (validateCompleteness)

**파일**: `packages/pipeline/src/normalize.ts` (73~100행)

**검증 조건**:
```
모든 원문 문장 S ∈ Sentences에 대해:
  ∃ 명제 P ∈ Propositions : S ∈ P.sourceSentences
```

즉, **원문의 모든 문장이 최소 하나의 명제에 의해 근거로 인용되어야 함**.

**코드**:
```typescript
export function validateCompleteness(
  sentences: readonly { id: string }[],
  propositions: readonly { id: string; sourceSentences: readonly string[] }[],
): readonly CompletenessIssue[] {
  const cited = new Set(propositions.flatMap((p) => p.sourceSentences));
  
  for (const s of sentences) {
    if (!cited.has(s.id)) {
      issues.push({
        code: 'uncovered-sentence',
        message: `${s.id}을 근거로 삼는 명제가 없다 — 이 문장이 통째로 누락됐다`,
      });
    }
  }
}
```

**실패 시 동작**:
- 최대 3회까지 자동 재시도 (decompose 함수 165~192행)
- 각 재시도마다 LLM에 "모든 문장을 빠짐없이 분해하라"고 피드백

### 3.4 명제 속성 채우기 (프롬프트 지시)

**프롬프트에서 요구하는 각 속성**:

```typescript
interface Proposition {
  predicate: string,           // 술어 의미 식별자
  argument: string,            // 술어 공유 명제의 인자 구분
  aspect: string,              // 설명 층위
  subjectRole: string,         // 주체의 역할
  sourceSentences: string[],   // 근거 문장 번호
  
  // 다음은 LLM이 판단해 채움:
  standaloneSlotValue: boolean // 독립 학습 슬롯가치
  relation: {                  // 명제가 담는 관계
    from: string,              // 시작 개념
    to: string,                // 끝 개념
    kind: string               // 관계 종류 (derivation, definition, ...)
  }
}
```

**예**: p7의 relation
```json
{
  "from": "특정 실(實)",
  "to": "유일한 명(名)",
  "kind": "should_be_designated_by"
}
```

---

## 4. 코드 구조 요약

| 단계 | 함수 | 파일 | 역할 |
|-----|------|------|------|
| **입력** | `decompose()` | kernel.ts | 원문 → 명제 배열 (LLM 호출) |
| **스키마** | `DecomposeSchema` | schemas.ts | Zod 출력 스키마 정의 |
| **프롬프트** | `DECOMPOSE_SYSTEM` | kernel.ts | LLM에 지시하는 분해 원칙 |
| **검증** | `validateCompleteness()` | normalize.ts | 문장 커버리지 확인 |
| **재시도** | decompose 루프 | kernel.ts | 실패 시 최대 3회 재시도 |

---

## 5. 다음 단계

명제 분해 완료 후:

1. **compose()** (`packages/pipeline/src/llm/kernel.ts` 197~)
   - 명제들을 위계로 조직
   - 타이틀(최상위)까지 구성
   - primary/secondary 관계 정의

2. **영역 구성** (compose 결과에서)
   - 관련 명제들을 의미 영역으로 그룹화
   - 각 영역에 scope/relation/argument 질의 배정

3. **질의 생성** (`query-gen.ts`)
   - 자동으로 각 영역의 질의 세트 생성
   - 원칙 A~G 적용

4. **평가** (`assessment.ts`)
   - 학생 응답이 질의들을 얼마나 만족하는지 테스트
   - regionSemanticVerdict (5값) 판정

---

## 참고: 명제 vs 영역

| 개념 | 정의 | 개수 |
|-----|------|------|
| **명제** (Proposition) | 하나의 관계를 담는 최소 의미 단위 | 문단당 10~15개 |
| **영역** (Region) | 관련 명제들을 묶은 의미 단위 (타이틀 바로 아래) | 문단당 3~5개 |

이 문단의 경우:
- **명제**: p1~p11 (11개)
- **영역**: 아직 구성 안 함 (다음 단계: compose)

예상 영역:
- 영역1: 공손룡의 기본 이론 (p1~p4)
- 영역2: 일대일 대응 규칙 (p7~p8)
- 영역3: 규칙 위반 시 결과 (p9~p10)
