# 프로젝트 브리핑 (외부 협업 AI용)

> 이 문서는 이 프로젝트를 처음 보는 협업자(예: Codex)가 목적·설계 결론·코드 구조를
> 빠르게 파악하고 **기술 토론에 바로 참여**하도록 쓴 자기완결적 설명서다. 이미 데이터로
> 확정된 결정을 다시 뒤집지 않도록, "무엇이 정해졌고 왜 정해졌는지"에 특히 무게를 둔다.

---

## 0. 한눈에

- **무엇**: 수능 국어 **비문학(독서) 정독(精讀) 훈련 앱**. 학생이 문단을 읽고 **자유롭게 요약**하면,
  그 요약이 문단의 **핵심 의미 관계를 보존했는지**를 자동 판정·피드백한다.
- **핵심 기술 결론(확정)**: 자유형 추상 응답을 평가하는 유일하게 타당·안정적인 채점축은
  **`regionSemanticVerdict`**(미포착 / 주제만 / 관계보존 / 관계오류)다. 세부 논항을 몇 개 담았는지
  (`argumentCoverage`)는 **인간조차 일치하지 않는 구성개념**이라 채점축에서 제외했다.
- **현재 위치**: 평가 코어(질의 생성기 v0 + 평가기 + 최소 판정 구조)가 5개 관계 구조에서
  검증 완료. 다음은 **학생 대면 루프**(슬롯 입력 → 1회 수정 → 표제 추론) 설계.
- **스택**: TypeScript(ESM) 모노레포(npm workspaces), Node 24, vitest, Anthropic SDK,
  구조화 출력(zod v4 + `messages.parse`). 모델 `claude-opus-4-8`.

---

## 1. 프로젝트 목적과 철학

수능 국어 비문학은 **압축된 논리 구조를 빠르고 정확하게 파악**하는 능력을 요구한다. 이 앱은
학생에게 문단을 보여주고 **스스로 핵심을 요약**하게 한 뒤, 그 요약이 문단의 **의미 관계(분류·
인과·역할 분리·조건/예외·문제-해결·주장-근거 등)를 보존했는지**를 평가하는 **느린 정독 훈련**
도구다.

핵심 교육 철학: **좋은 요약은 세부를 버리는 압축이다.** 따라서 "원문 세부를 몇 % 재현했는가"가
아니라 "**문단을 조직하는 핵심 의미 관계를 포착했는가**"를 본다. 이 구분이 프로젝트 전체 설계를
관통한다.

---

## 2. 3계층 작동 원리

```
[1] 골드 의미 지도 생성 (문단당 1회, 오프라인)
    원문 문단 → 안정화된 Semantic Gold Graph
      · propositions(최소 명제): id, text, shortForm, aspect, subjectRole,
        relation{from,to,kind}, sourceSentences, links …
      · evaluationLinks / discourseLinks(관계 간선): role_separation, aspect_shift,
        condition, implements …
      · (composite nodes·slots·title 도 있으나 최신 평가 경로에서는 핵심 아님)
    설계 원칙: "LLM은 의미 사실만 생성, 구조 규칙은 코드가 결정적으로 적용."

[2] 보존 질의(preservation query) 생성 (문단당 1회)
    골드 그래프 → regions + preservationQueries
      · region: 문단의 한 의미 영역 (scope + relation + argument 질의 묶음)
      · query level: scope(어떤 영역인가) / relation(어떻게 조직되는가) / argument(구체 대상·조건)
      · 각 query는 합성 노드가 아니라 **문장 span·명제·관계 간선에 앵커링**

[3] 학생 응답 평가 (런타임, 학생마다)
    학생 자유 요약 + 질의 → LLM이 질의별 보존 여부 판정(raw) →
    코드가 결정적으로 정규화 → region별 regionSemanticVerdict + 명제 evidence + 피드백
```

**중요**: [1]과 [2]는 문단당 한 번 만들어 고정 재사용하는 "분석 산출물"이고, [3]만 학생마다 돈다.

---

## 3. 평가 이론 — **확정된 결론** (여기가 프로젝트의 지적 핵심)

이 절은 여러 차례의 실험과 토론으로 **데이터에 근거해 확정**된 내용이다. 협업 시 재논의보다
이 결론 위에서 쌓는 것이 맞다.

### 3.1 채점축은 `regionSemanticVerdict` 하나

```ts
type RegionSemanticVerdict =
  | 'region_not_evidenced'          // 미포착: 이 영역을 못 짚음
  | 'topic_only'                    // 주제만: 화제는 짚었으나 관계 미보존
  | 'partial_relation_preservation' // 핵심 관계 일부만 보존
  | 'relation_preserved'            // 핵심 관계 보존
  | 'contradicted'                  // 관계를 잘못 이해(뒤집음)
```

- **왜 이것인가**: 자유형 추상 응답은 "정답지"가 없다. 우리가 찾은 것은 "어떻게 정확히 채점하나"가
  아니라 "**무엇을 재는 것이 타당·안정한가**"였다. 답은 **관계 보존 여부** — 거칠어서 **재분해에
  견디는(decomposition-invariant)** 축이다.
- **검증**: 반복 실행·질의 분해 변화·관계 유형 변화에 걸쳐 안정적. 인간 라벨링에서도 일치도가 높음.

### 3.2 `argumentCoverage`는 채점에서 강등 (구성타당도 실패)

```ts
type ArgumentCoverage = 'none' | 'partial' | 'full';   // ← 채점 아님, _debug 필드
```

- "핵심 관계의 구체 요소를 얼마나 담았는가"를 full/partial/none으로 요약하려던 축.
- **문제**: 분모(명제를 몇 개로 자르는가)가 분석자 선택에 의존 → 실행마다 흔들림.
- **결정적 근거**: **인간 이중 라벨링에서 인간끼리도 argumentCoverage 일치도가 낮았다.**
  → 단일 정답이 없는 구성개념. 신뢰도(reliability)를 아무리 높여도 타당도(validity)가 안 생김.
- **결론**: 채점축에서 제거, `_debug` 실험 필드로만 유지. `expressionProfile`(explicit/implicit/
  mixed/none)도 같이 강등.

### 3.3 명제 evidence는 점수가 아니라 근거·피드백·디버깅

```ts
type PropositionEvidenceState =
  | 'evidenced'                 // 직접 진술로 확인
  | 'supported_by_abstraction'  // 병치·함축으로 뒷받침
  | 'not_evidenced'             // 이 짧은 답에서는 "확인 불가" (결손 아님!)
  | 'contradicted';
```

- **골드 명제(프리즈된 안정 기반)에 앵커링**해 파생. 생성기가 질의를 몇 개로 쪼개든 "학생이 명제
  p를 증거했나"로 환원되어 안정적.
- `not_evidenced` = "학생이 모른다"가 **아니라** "이 압축 답에서는 확인 불가". 좋은 추상의 세부
  생략을 결손으로 오인하지 않기 위한 구분. → 점수화하지 않고 **피드백·근거·디버깅**에만 사용.

### 3.4 관통하는 설계 철학 (다른 결정도 여기서 나옴)

1. **불안정한 합성물이 아니라 안정된 기반에 앵커링하라** — 질의는 합성 노드가 아니라 명제/문장
   span에, 커버리지는 생성 질의가 아니라 골드 명제에.
2. **축을 합치지 말고 분리하라** — 의미 보존/논항 커버리지/표현 방식은 별개 축. `explicit_high_
   resolution` 같은 합친 라벨은 **파생 편의 라벨(displayLabel)** 로만 두고 기본 데이터로 쓰지 않음.
3. **재분해 불변성이 "채점 가능"의 기준** — 합리적으로 달리 분해해도 값이 안 바뀌는 축만 점수화.
4. **양방향 정규화** — 하향 게이트(scope 미포착 → 하위 자동 탈락)는 "자산은 법인 소유, 운영은
   권한자" 같은 scope 미표현 우수 응답을 죽인다. 그래서 하위 관계/논항 보존이 상위 scope를
   **승격**하고, 모순도 영역 정렬 증거로 처리한다.
5. **모순 중복 벌점 방지** — 한 학생 주장이 여러 질의를 모순시켜도 하나의 cluster로 묶음.

---

## 4. 자동 질의 생성기 v0 (동결)

- **입력(제한적)**: 원문 문장+ID, 안정화 명제, 명제별 source span, eval/discourse 링크,
  루트 문단 주제. **합성 노드 미입력, 손 질의 오라클 미입력**(데이터 누출 방지).
- **출력**: `GeneratedQuerySet` = regions[] → 각 region의 scope/relation/argument 질의 +
  앵커(propositionIds, relationEdgeIds) + 필수 플래그 + acceptance/contradiction 기준.
- **버전 동결**: `GENERATOR_VERSION='v0'`, `EVAL_SCHEMA_VERSION='query-3axis-v1'`
  (`packages/pipeline/src/llm/query-gen.ts`). 일반화 관찰 중에는 프롬프트 무수정.
- **알려진 성질**:
  - 구조적 재현성 **강함** — 핵심 관계 커버리지 100%(측정된 문단들에서 3회 모두).
  - 기능적으로 의미축(regionSemanticVerdict) 재현 양호, **argumentCoverage는 불안정**(위 3.2 참고).
  - 영역 경계를 실행마다 다르게 나눔(정당한 변이) → 비교 시 **오라클 영역으로 span 재버킷팅**해 흡수.

---

## 5. 검증 현황

**검증된 관계 구조 (5종, 과대평가 0건 위주):**
| 문단 | 관계 구조 |
|---|---|
| 법인 (corporate) | 역할 분리(법적 주체 ↔ 실제 운용자) |
| 과학 NCM (science) | 인과 방향 + 트레이드오프(관점 전환) |
| 인문 묵가 (humanities) | 주장–원리–사례 위계 |
| 공시 (disclosure) | 조건·예외 + 단계적 절차 |
| 광합성 C3/C4 (photosynthesis) | 문제–해결 + 다단계 인과 과정 |

**아직 미검증(이론-잔여 리스크):** 비교·대조, 주장–반론–재반론, 다문장에 걸친 개념 수정.
(캐시 골드에 적합한 지문이 없어 미측정. 확률은 낮게 보나 열려 있음.)

**남은 알려진 이슈(채점 결함 아님):**
1. 인문 경계 사례(Bd1): 원리의 두 극을 **병치만** 했는데 관계보존으로 과대평가 — 단일 지문·단일
   경계. 반복 실패 아님이라 **아직 미수정, 경계로 보존**.
2. focal-scope 경계: 문단 일반 표현이 특정 영역 scope에 안 걸려 주제만↔미포착이 갈릴 수 있음
   (과소평가 방향, 학생 결론 불변).
3. 네트워크·구조화출력 견고성: 배치 중 ENOTFOUND·파싱 실패 발생 → 캐시·재시도로 대응.

---

## 6. 확정 원칙 / 건드리지 말 것 (현재 단계)

- 채점축은 `regionSemanticVerdict` 하나. argumentCoverage·expressionProfile은 `_debug`.
- 명제 evidence는 점수화 금지 — 근거·피드백·디버깅 전용.
- 생성기 v0 프롬프트·스키마 동결(일반화 관찰 중). q4(인문 원리) 수용 기준도 아직 미수정.
- 인간 오라클 검증은 로드맵에서 제외(현실적 어려움으로 사용자가 결정).
- 관계 유형의 **폐쇄형 사전(taxonomy)을 만들지 않는다** — 느슨한 family 힌트까지만.
- **production 미연결**: 자동 생성 질의를 production gold로 저장/슬롯 평가기 교체/점수·보상 연결/
  UI 연결/캐시 골드 수정 **금지**. 모든 산출물은 실험 fixture·로그에만.
- 여러 지문에서 **반복되는 동일 실패 패턴**이 확인될 때만 일반화 가능한 최소 수정 제안.

---

## 7. 저장소 구조

모노레포. `packages/core`(도메인·순수 로직) + `packages/pipeline`(LLM·CLI·실험).

```
packages/core/src/
  domain/gold.ts        골드 도메인 타입 (GoldNode, Proposition, links …)
  domain/passage.ts     지문/문단 도메인 타입
  domain/scoring.ts     점수 관련 타입
  weights.ts            globalWeight, primaryPath (위계 가중치; cycle/dangling 시 throw)
  validate-gold.ts      골드 유효성 검증
  repositories.ts       데이터 접근 인터페이스
  fixtures.test.ts / weights.test.ts

packages/pipeline/src/
  llm/
    client.ts           Anthropic 클라이언트 + 계측 + 재시도/backoff + 실패 분류(classify)
                        MODEL='claude-opus-4-8'. 모든 LLM 호출이 여기를 거침.
    kernel.ts           [골드 생성] decompose/compose/verifyLinks/slotCores 등 커널 단계
    query-eval.ts       [평가기·현행] 보존 질의 평가 (evaluateQueries, QueryVerdictSchema)
    query-gen.ts        [생성기 v0·동결] 자동 보존질의 생성 (generateQuerySet, 버전 상수)
    evaluate.ts         [레거시] 슬롯 중심 평가기 (질의 방식으로 대체됨, 비교용 잔존)
    schemas.ts          공용 zod 스키마
  gold.ts               buildGold: 문단 → 안정화 골드 (서브스텝 캐싱)
  normalize.ts          골드 위계 정규화 (pass-through 제거·링크 병합·슬롯 선정 등, 결정적)
  agreement.ts          골드/판정 재현성 측정 (VERDICT 비교, 의미↔granularity 분리)
  query-normalize.ts    [핵심] raw 질의판정 → 세 축 정규화 + regionSemanticVerdict + displayLabel
                        (양방향 승격 규칙, 재버킷팅 대상 RegionPolicy)
  query-align.ts        구조 정렬(결정적): span/명제 겹침으로 영역 정렬, 핵심관계 커버리지
  query-gen-lib.ts      실험 공유 lib: 골드→생성입력, 오라클/생성→EvalSet, 오라클 재버킷팅, cluster
  assessment.ts         [핵심·최신] 최소 확정 평가 구조: regionSemanticVerdict(점수) +
                        명제 evidence(근거) + 설명형 피드백. 결정적, LLM 무관.
  cli/
    d0-spike.ts         초기 커널 스파이크
    agreement.ts        골드 재현성 실험 (npm run agreement)
    sim.ts              평가 시뮬레이션 (npm run sim)
    query-experiment.ts 법인 문단 3축 평가 실험 (npm run qexp)  ← 동결
    query-gen-experiment.ts 법인 문단 자동생성 재현성 (npm run qgen)  ← 동결
    query-gen-generalize.ts 과학·인문 일반화 (npm run qgen:general)
    assess.ts           [최신] 최소 구조 회귀: 지문×분해4종, 과대평가 점검 (npm run assess)

packages/pipeline/fixtures/
  queries-corporate-law-p0.json         법인 손 질의 오라클(첫 문단)
  query-oracles/*-hand.json             과학·인문·공시·광합성 손 오라클
  generated-queries/*-run{1,2,3}.json   5개 지문 × 3회 자동 생성 결과(실험용)
  gold-*.json                           골드 픽스처(테스트용)

.omc/  (운영 아티팩트; 대부분 gitignore, 일부만 커밋)
  plans/consensus-csat-literacy.md      마스터 계획(합의)
  specs/deep-interview-*.md             요구사항 스펙(9라운드 인터뷰, 모호도 12%)
  agreement/*.gold-{1,2,3}.json         재현성용 3회 골드 + responses + agreement (6문단분)
  state/assess-cache/                   assess 재개 캐시(gitignore)

docs/
  ARCHITECTURE.md       3계층 개요(왜/어떻게/작동하는가)
  DATA-SCHEMA.md        데이터 스키마
  NEXT.md               재개 지점(단계별 진행 로그) ← 가장 최신 상태가 여기
  PROJECT-BRIEFING.md   (이 문서)
  experiments/*.log     각 실험의 정본 로그
```

**두 세대 주의**: 초기(골드 생성: kernel/gold/normalize/agreement, 슬롯 평가: evaluate.ts)와
현행(질의 기반 평가: query-eval/query-gen/query-normalize/assessment)이 공존한다. 최신 평가 코어는
**query-eval → query-normalize → assessment** 경로다. evaluate.ts(슬롯)는 레거시.

- 규모: 소스 ~7.2k LOC(테스트 제외), 단위 테스트 **122개 통과**(9개 파일).
- 데이터셋 원본: `/Users/mac/Projects/suneung_db/output` (독서 지문; `SUNEUNG_DB` 환경변수로 지정).

---

## 8. 실행 방법

```bash
nvm use            # Node 24 (.nvmrc)
npm install
npm run build      # tsc --build (dist/ 생성)
npm test           # vitest, 122 tests

# LLM 실험은 API 키 필요:
set -a; . ./.env; set +a           # ANTHROPIC_API_KEY 로드
npm run assess                     # 최신 최소 구조 회귀 (지문×분해)
npm run qgen:general               # 과학·인문 일반화
npm run agreement                  # 골드 재현성
```

npm 스크립트: `build typecheck test test:watch inspect:data d0 agreement sim qexp qgen qgen:general assess`.

---

## 9. 현재 위치와 다음 단계

- **완료**: 평가 코어 확정 및 5개 관계 구조 일반화 검증. 과대평가 0건(신규 2지문), 안정 11/12.
- **판단**: 가장 어려운 **이론적/인식론적 사고(무엇을 재는 것이 타당·안정한가)는 지났다.** 남은 건
  실행적·반복적 난도(교육 UX, 엔지니어링/운영, 규모 품질).
- **다음**: **학생 대면 루프** 설계 — 스펙의 2단계 상호작용
  (① 코어 슬롯 자유 입력 → 1회 수정 기회, ② 표제(제목) 추론). 느린 정독 의도 유지.
- **권고 순서(사용자와 합의)**: 기존 6지문으로 루프를 먼저 확정 → 서빙 산출물 계약 동결 →
  10~15지문 층화 표본으로 골드 품질 게이트(명제 80% 무수정) 확인 → 나머지 배치 분석(마지막).
  "계약이 얼지 않은 상태에서 150지문을 미리 분석하면 스키마 변경 시 전부 재작업" 리스크 회피.

**정량 검증 게이트(프로젝트 기준):** 채점 신뢰도 90% 일치, 골드 자동생성 명제 80% 무수정 사용.

---

## 10. Codex에게 특히 유용한 토론 지점 (열린 질문)

1. **학생 대면 루프 설계** — 답을 흘리지 않으면서 가르치는 피드백, 수정 횟수/시점, 표제 추론
   단계화, "느린 정독" 유도 장치. (이론-난도 아니라 교육/UX 설계-난도, 반복 개선 가능.)
2. **focal-scope 집계** — region별 판정을 응답 전체 판정/점수로 어떻게 롤업할지. 문단 층위 scope
   판정을 별도로 둘지.
3. **미검증 관계 구조**(비교·대조 등)를 표본에 끼워 이론-잔여 리스크를 닫는 방법.
4. **보상·진행 표시**의 최소 요건(스펙이 progress-tracking을 defer, 세션 내 임시 저장 결정).
5. **웹앱 전환 대비** 구조(로컬 파일시스템 강결합 회피)와 저작권.

> 토론 규칙 제안: 위 §3(확정 결론)과 §6(원칙)은 **데이터로 정해진 것**이므로, 뒤집으려면 새 증거를
> 제시하는 방식으로. 그 위에서 §10을 함께 밀어붙이는 것이 생산적이다.
