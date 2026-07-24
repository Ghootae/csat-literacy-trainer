# 아키텍처 개요

수능국어 비문학 **문단 정독 훈련 앱**. 문단을 위계적 의미지도(골드)로 변환하고, 학생이
핵심 내용을 서술형으로 요약하면 명제 단위로 대조해 피드백한다.

이 문서는 세 계층 — **요구사항(why) → 코드(how) → 측정(does it work)** — 을 연결하고
현재 구현 상태를 반영한다. 상세 결정 근거는 `.omc/plans/consensus-csat-literacy.md`에 있다.

> **상태 (2026-07-24):** 골드 생성 파이프라인과 재현성 측정 하네스 완성. 6개 문단으로
> 재현성 검증 완료 (모순 유무 6/6 일치, 의미 일치율 100%). 학습 UI·저장소·채점 런타임은
> 미착수. K2(임베딩 가중치 측정)는 재현성 측정 이후로 보류 중.

---

## 1. 파이프라인 한눈에

```
원본 데이터 (suneung_db)
   │  adapter.ts
   ▼
Passage { sections[], paragraphs[], images[] }
   │
   │  ── 골드 생성: buildGold() (gold.ts) ────────────────────────
   │
   ├─ decompose    문단 → 최소 의미 명제 (+완전성 검증·재시도)
   ├─ compose      명제 → 위계 (primary 신장 트리 + secondary 후보)
   ├─ verifyLinks  링크 후보 → 반사실 증인으로 평가용 승격/강등
   ├─ normalize    통과노드 제거 · 링크 병합 · discourse 분리 (결정적)
   ├─ selectSlots  슬롯 프론티어 (안티체인 컷 + 흡수)
   └─ slotCores    슬롯별 핵심 사고 관계
   ▼
Gold { slots[], evaluationLinks[], ... }
   │
   │  ── 재현성 측정: agreement.ts ───────────────────────────────
   │
   ├─ generateTestResponses  문단만 보고 5개 품질의 테스트 응답
   ├─ evaluate               응답 × 골드 → 슬롯 판정 + 첫 수정 타겟
   └─ measureAgreement       골드 3회 생성의 판정 일치율 + granularity 분리
   ▼
AgreementReport { 모순유무·수정필요·첫수정 일치, semantic/granularity bundle }
```

LLM은 **의미 사실만** 낸다 (분해·합성·판정). 구조 규칙(통과노드 제거, 슬롯 선정, 링크 승격)은
`normalize.ts`에서 **결정적으로** 적용한다 — 프롬프트에 맡기면 같은 문단에서 실행마다 다른
구조가 나오기 때문이다.

---

## 2. 요구사항 계층 (why)

| 문서 | 역할 |
|---|---|
| `.omc/specs/deep-interview-suneung-korean-literacy-app.md` | 원 요구사항. 9라운드 인터뷰로 확정 (모호도 12%) |
| **`.omc/plans/consensus-csat-literacy.md`** | **마스터 계획.** 설계 결정·지표 우선순위·미해결 항목. 권위 있는 단일 출처 |
| `docs/DATA-SCHEMA.md` | 원본 데이터 구조와 어댑터 규칙 |
| `.omc/plans/autopilot-impl.md` | 폐기됨 (구 데이터셋 기준 초안) |

### 핵심 설계 결정 (계획서에서)

- **위계는 트리가 아니라 DAG.** 한 명제가 두 상위 개념을 동시에 지지하는 구조가 흔하다.
  노드마다 primary 부모 하나를 지정해 신장 트리를 얻고, 보상 회계는 그 위에서만 한다.
- **Gate A는 2단.** 모순 의심(1차)을 문단 원문 맥락으로 재확인(2차)한 뒤에만 강제 교정.
  예외 조항("다만 …")을 정확히 읽은 학생을 모순으로 오판하지 않기 위함.
- **판정 규칙 R1(양끝 노드) / R2(타이틀=슬롯 포괄).** 사용자 확정.
- **측정 없이 상수를 정하지 않는다.** 지연 예산·통과 임계값은 실측 후 결정. K2 보류 이유.

---

## 3. 코드 계층 (how)

### `packages/core` — 순수 도메인 (I/O 없음)

| 파일 | 내용 |
|---|---|
| `domain/passage.ts` | `Passage` / `Section` / `Paragraph`(role: body/footnote/placeholder) / `PassageImage`(앵커) |
| `domain/gold.ts` | `GoldNode`(DAG, primary/secondary), `NodeWeight`(local/global), `GoldMap` |
| `domain/scoring.ts` | 1·2차 판정 타입, `gateATriggered`, R2 반-게이밍 제약 담은 `TitleEvaluation` |
| `weights.ts` | `W(v) = Π w(a)` primary 경로 곱. 조용한 실패 없이 `PrimaryPathError` |
| `validate-gold.ts` | 골드 구조 불변식 검사 (루트 유일성, primary 사이클, 안티체인) |
| `repositories.ts` | `PassageRepository` 등 인터페이스 + `ownerId` 선반영 (웹 전환 가드) |

### `packages/pipeline` — LLM 호출과 결정적 후처리

| 파일 | 내용 |
|---|---|
| `adapter.ts` | `suneung_db` JSON → `Passage`. role 분류 2필터(각주·자리표시) |
| `llm/client.ts` | Opus 4.8 클라이언트 + 계측(`.omc/metrics/llm.jsonl`) + 재시도(지수 백오프, 실패 분류) |
| `llm/schemas.ts` | 구조화 출력 Zod 스키마. **설계 결정이 필드로 박혀 있다** (aspect/subjectRole/predicate/witness) |
| `llm/kernel.ts` | `decompose` `compose` `regenerate` `verifyLinks` `slotCores`. **프롬프트가 여기** |
| `llm/evaluate.ts` | `evaluate`(응답 판정) `generateTestResponses`(테스트 응답 생성) |
| `normalize.ts` | `validateCompleteness` `normalizeHierarchy` `selectSlots` … **결정적 규칙** |
| `gold.ts` | 파이프라인 전체를 `buildGold()` 하나로. 단계별 캐시 |
| `agreement.ts` | `measureAgreement` `classifyDispute`(semantic/granularity) `collectBundles` |
| `cli/d0-spike.ts` | 단일 문단 파이프라인 시연 CLI (`npm run d0`) |
| `cli/agreement.ts` | 재현성 측정 CLI (`npm run agreement`). setId 포함 캐시 키 |

### 프롬프트에 담긴 설계 판단 (kernel.ts 시스템 상수)

코드로 표현할 수 없는 의미 판단은 프롬프트에 있다:

- **층위 정규화** — "법적 귀속 주체"와 "실제 실행 주체"를 다른 술어로 분리해 모순 오판 방지
- **"다만"을 자동 예외로 읽지 않기** — 대상·역할·층위가 모두 같을 때만 예외
- **술어 통일** — 조건부 매핑 집합은 하나의 술어를 공유하고 대상은 argument로 구분
- **반사실 증인** — 링크를 삭제했을 때 판정이 달라지는 학생 문장을 못 쓰면 평가용 아님

### 결정적 규칙 (normalize.ts)

| 규칙 | 조건 |
|---|---|
| 통과 노드 제거 | 새 관계 미도입 + 부모가 일반화 의미 포함 + 슬롯/링크 endpoint 아님 + 승격 후 자식 2~5개 |
| 링크 병합 | 역방향 동치를 하나로. role_separation을 관계 속성으로 강등 |
| discourse 분리 | witness 없거나, 양 끝이 별도 슬롯에 덮인 비-모순방지 링크 |
| 슬롯 선정 | 안티체인 컷(3~6) → 독립 가치 없는 도입·정의 단독 노드 흡수 → 하한 미달 시 재전개 |

---

## 4. 측정 계층 (does it work)

### 재현성 측정 방법

같은 문단으로 골드를 **3회 독립 생성**하면 슬롯 id·경계가 달라진다. 구조를 직접 비교하면
항상 "다르다"가 나오므로, **동일한 테스트 학생 응답에 대한 판정**을 비교한다. 비교 축은
**문장 번호** (슬롯 → traceability 명제 → sourceSentences로 환원).

### 지표 우선순위 (2026-07-24 확정)

1. **모순 유무** — Gate A 발동 여부. 학습 경험을 근본적으로 가른다
2. **수정 필요 여부** — 첫 수정 종류가 '없음'인지
3. **첫 수정 종류** — 모순 교정 / 누락 보완 / 없음
4. **첫 수정의 의미적 대상** — 문장 집합 겹침
5. (참고) 의미 일치율 — granularity variance 제외

### semantic vs granularity 분리 (`classifyDispute`)

- **semantic** — 모순이 끼거나 충족↔누락 정면 충돌. 복수 골드로 다룰 진짜 애매성
- **granularity** — 부분이 한쪽 끝과만 붙음. 슬롯 입도 결정의 산물이며 규칙 변경 근거 아님

### 측정 결과 (6개 문단, 3개 영역)

| | 결과 |
|---|---|
| 모순 유무 일치 | **6/6 문단 100%** — 전개 구조와 무관하게 Gate A 재현 |
| 의미 일치율 | 평균 100% (semantic ambiguity 통틀어 1건) |
| granularity variance | 누적 26건 — 우선 지표를 흔든 건 1건(상장법인 r1) |

원본: `.omc/agreement/*.agreement.json`, 요약: `node scripts/agreement-summary.mjs`

**미해결:** 넓은 슬롯이 완전 응답에 불필요한 수정을 요구하는 granularity 오염(상장법인 r1).
부분 판정 제거 검토 대상이나 6개 중 1건이라 결정 보류.

---

## 5. 실행 방법

```bash
nvm use 24.18.0                                    # .nvmrc
npm test                                           # 91개 테스트
set -a; . ./.env; set +a                           # ANTHROPIC_API_KEY

npm run d0 -- <setId> <문단인덱스>                  # 단일 문단 파이프라인 시연
npm run agreement -- <setId> <문단> [반복수]        # 재현성 측정
bash scripts/agreement-batch.sh                    # 여러 문단 배치
node scripts/agreement-summary.mjs                 # 문단 간 요약
```

- LLM 호출 계측: `.omc/metrics/llm.jsonl` (op·model·effort·tokens·ms·error)
- 캐시: `.omc/agreement/` — 골드·테스트응답·측정결과. **캐시 키는 setId 포함** (문단 id는
  지문마다 s1_p1로 겹치므로)

---

## 6. 미착수 (계획서 태스크 그래프 기준)

| 태스크 | 상태 |
|---|---|
| K, A, C, D0, B(부분) | ✅ 골드 생성·정규화·측정 완성 |
| **채점 엔진 런타임** | 판정 타입은 있으나 실제 채점 루프 미구현 |
| **학습 UI (G)** | 슬롯 입력·위계 시각화·이미지 앵커 렌더 미착수 |
| **저장소 구현 (F)** | 인터페이스만. FS 구현체 없음 |
| **K2 (임베딩 가중치)** | 재현성 측정 완료 후로 보류 |
| **웹 전환 게이트 (H)** | Tier 2 실제 학생 응답 수집 |
