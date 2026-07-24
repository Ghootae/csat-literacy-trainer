# Autopilot Implementation Plan: 수능국어 문해력 훈련 앱

Source spec: `.omc/specs/deep-interview-suneung-korean-literacy-app.md` (ambiguity 12%, PASSED)

## 1. Stack & Repository Layout

Node 24.18.0 (via nvm; system node is 20.12.2 which is below Vite 6's floor — pin with `.nvmrc`).
TypeScript monorepo via npm workspaces. Single language across batch pipeline and app keeps the
web transition (Constraint: 로컬 → 웹앱) a deployment change rather than a rewrite.

```
packages/
  core/       도메인 타입, 채점 엔진, 슬롯 선정 알고리즘 — 순수 로직, I/O 없음
  llm/        LLM/임베딩 어댑터 (프로바이더 인터페이스 뒤에 격리)
  pipeline/   골드 생성 배치 CLI + 원본 JSON 어댑터 + 검수 도구
  server/     Fastify HTTP API + 리포지토리 구현
  web/        Vite + React 학습 UI, 위계 시각화, 검수 UI
data/         지문 원본·골드 (gitignore — 저작권)
docs/         RISKS.md, DECISIONS.md
```

### Web-transition guard (Constraint 4)
`packages/core` defines `PassageRepository` / `GoldRepository` / `SessionRepository` as interfaces.
`packages/server` ships `FsPassageRepository` etc. backed by local JSON. Nothing outside
`server/src/repos/` touches the filesystem. Swapping to Postgres later = new impl only.
The web UI talks HTTP from day one, even in local mode — no direct-file shortcuts.

## 2. Resolving the spec's three open technical risks

### Risk 1 — 코어 슬롯 레벨 자동 선정 알고리즘 (was undefined)

Proposal: **greedy frontier cut**. A slot set must be a valid tree *cut* (antichain covering all
leaves — no node and its own ancestor both selected), sized 3–6.

```
frontier ← children(root)                       // root = Title
while |frontier| < 3:  expand the highest-weight node in frontier into its children
while |frontier| > 6:  collapse the lowest-weight sibling group back into its parent
```

Rationale: expanding the *heaviest* node first gives finer granularity where meaning is most
concentrated; collapsing the lightest siblings discards granularity where it matters least.
Deterministic, no tunable constant, terminates (each expand strictly increases the node count,
each collapse strictly decreases it). Degenerate trees (root with 2 leaf children) are handled by
a floor clause: if no node can be expanded, accept |frontier| ≥ 2.

Implemented in `core/src/slots/select-slots.ts` with property tests asserting the antichain
invariant and the size bound.

### Risk 2 — 런타임 지연 허용치 (unmeasured)

Do not guess a budget. Instrument instead: every LLM call goes through `llm/src/instrument.ts`,
which records `{op, model, inputTokens, outputTokens, ms}` to `.omc/metrics/llm.jsonl`.
`npm run report:latency` prints p50/p95 per operation. Working hypothesis to validate, not to
enforce: 채점 왕복 p50 ≤ 8s. UI covers the gap by rendering the hierarchy skeleton immediately and
filling node states as results stream in.

### Risk 3 — 기출 저작권 (deferred to web stage)

`data/` is gitignored. `docs/RISKS.md` records: local single-user use only; any deployment reachable
by a second person requires resolution first. The server has no auth and binds `127.0.0.1` — a
deliberate structural block against accidental exposure.

## 3. Upstream data — 확인 완료 (154건 실측)

전체 분석은 `docs/DATA-SCHEMA.md`, 재현은 `scripts/inspect-data.py`.

원본은 gugeodat.com 수집분 `<product_id>_result.json` 154건. 스키마는 4월~6월 수집분에서
동일하게 유지된다. 어댑터는 설정 주도 범용 매퍼가 아니라 **이 스키마 전용 파서 하나**면
충분하다 — 계획 초안의 `GenericJsonAdapter`는 불필요한 일반화이므로 폐기한다.

**문단 분할이 공짜다.** `passage`는 `\n`으로 문단이 구분된 문자열이므로, 파이프라인의
문단 경계 추정 단계가 통째로 사라진다. LLM 호출이 그만큼 줄어든다.

### 어댑터 규칙 (실측으로 두 번 교정됨)

```
raw record
  → paragraph_block 중 symbol이 "(" 로 시작?  ── yes ─→ 격리: 복합 지문 (48건)
  → split('\n') 에서 "*" 로 시작하는 조각 제거 (각주, 17건에 존재)
  → 남은 조각 수 == kind:"paragraph" 원소 수?  ── no ─→ 격리: 문단 분할 불일치 (1건)
  → Passage { id, title, exam, tags, paragraphs[] }
```

| 분류 | 건수 |
|------|------|
| 복합 지문 ((가)/(나)/(다)) — 격리 | 48 |
| 표 삽입 — 격리 | 1 |
| 각주만 섞임 — `*` 제거로 정상화 | 17 |
| **사용 가능** | **105** |

문단 수 최소 3 / 중앙 5 / 최대 10. 30개 타겟은 105건에서 문단 수 기준으로 선별한다.

### 이 규칙에 담긴 두 개의 함정 (실제 데이터에서만 드러남)

1. `paragraph_block` 존재만으로 복합 지문을 판정하면 **14건을 잘못 버린다.** `[A]`는 복합
   지문이 아니라 단일 지문 안의 박스 처리 구간이다. `symbol`이 `(`로 시작하는지 봐야 한다.
2. 되살린 14건 안에 **표가 줄 단위로 삽입된 레코드**가 숨어 있었다. 무결성 검사가 없으면
   `투표자 선호순위`(8자), `갑 병원 학교 경찰서` 같은 표 행이 문단이 되어 골드 생성에
   들어간다. 조용히 오염되고 검수 단계에서야 발견된다.

**추가 방어선:** 골드 생성 직전 문단 최소 길이(40자) 경고. 표·각주가 섞였는데 개수가
우연히 맞는 레코드를 잡기 위한 것이다.

### 미사용 데이터

`questions`(문항·선택지·`<보기>`·문항 태그)는 `raw`에 보존만 하고 쓰지 않는다.
`passage_elements`의 **오프셋 값은 사용 불가**다 (문자 위치가 아님 — 실측으로 기각).
`kind:"paragraph"` **개수만** 무결성 검사에 쓴다.

## 4. Embedding provider — a genuine fork

`SemanticVector` (ablation comparison) needs embeddings. **Anthropic's API does not provide an
embeddings endpoint.** Two viable paths behind one interface (`llm/src/embeddings/Provider.ts`):

- `VoyageEmbeddingProvider` — Voyage AI (Anthropic's documented embedding partner), needs `VOYAGE_API_KEY`
- `LlmJudgeSimilarityProvider` — no embedding service; asks Claude to rate 0–1 how much meaning the
  ablated variant lost. Slower and less reproducible, but zero extra vendor.

Default to Voyage when the key is present, fall back to the judge otherwise. Both are batch-time
only (Risk 2 is unaffected).

## 5. Reward persistence under deferred progress-tracking (spec note 3)

`SessionRepository` scoped to one `StudySession` (one passage run). `FsSessionRepository` writes
`data/sessions/<id>.json`. This is the minimum that makes 보상 meaningful within a run without
building accounts, history, or 취약점 리포트. Recorded in `docs/DECISIONS.md` as a deliberate
narrowing of the deferral, not a scope expansion.

## 6. Validation harnesses (spec's two quantitative gates)

- `pipeline/src/eval/gold-quality.ts` → 무수정 사용률. Diffs `HumanReviewPass` output against the
  generated map; gate = ≥ 80% of propositions unedited across 30 passages.
- `core/src/eval/scoring-agreement.ts` → 채점 신뢰도. Consumes a labeled fixture of student responses
  with human proposition-match labels; gate = ≥ 90% agreement.

Both are runnable commands, not prose criteria: `npm run eval:gold`, `npm run eval:scoring`.

## 7. Task graph

| # | Task | Depends on | Model |
|---|------|-----------|-------|
| A | Monorepo scaffold, tsconfig, vitest, `.nvmrc`, domain types, repository interfaces | — | sonnet |
| B | 채점 엔진: proposition matching interface, Gate A 모순 감지, `reward = Σ(충족 × 가중치)` — TDD | A | opus |
| C | 슬롯 선정 알고리즘 (greedy frontier cut) + property tests | A | opus |
| D | LLM 어댑터: 명제 분해 / 위계 합성 / ablation / 응답 파싱 / 모순 판정 + 계측 + 임베딩 프로바이더 | A | opus |
| E | 골드 파이프라인 CLI + gugeodat 어댑터(격리 규칙 3종) + 문단 길이 경고 | C, D | sonnet |
| F | 서버 API + FS 리포지토리 | A, B | sonnet |
| G | 웹 UI: 학습 플로우 (슬롯 → 타이틀), 위계 시각화 (공개/위치만/모순 3상태), 재도전 선택 | F | sonnet |
| H | 검수 UI + 두 개의 eval 하네스 | E, G | sonnet |

Parallel waves: **A** → **B, C, D** → **E, F** → **G** → **H**

## 8. Acceptance mapping

Every checkbox in the spec's Acceptance Criteria maps to a test or a runnable command; the
C2 금리 예시 is encoded verbatim as a fixture test in task B.

## 9. Known deviations from spec

스펙이 열어둔 두 항목은 여기서 **해소**한다 (슬롯 선정 알고리즘 §2.1, 임베딩 프로바이더 §4).
하나는 **측정으로 미룬다** (지연 예산 §2.2).

데이터 실측으로 드러난 **스펙과의 차이 3가지**:

1. **문단 수 가정.** 스펙은 "지문 1개 = 문단 4~6개"를 전제했으나 실제 분포는 3~10이고
   105건 중 84건만 범위 안이다. 문단 10개 지문은 세션이 스펙의 20~30분을 넘는다.
   → 30개 선별 시 문단 수를 기준으로 삼아 회피한다. 스펙 수정은 불필요.
2. **복합 지문 48건(전체의 31%)을 포기한다.** 사용자 확정 사항이나, 코퍼스의 3분의 1을
   내려놓는 결정이므로 기록해 둔다. 이후 지원 시 코퍼스가 1.5배가 된다.
3. **`GenericJsonAdapter` 폐기.** 스키마가 확인되어 범용 매퍼가 불필요해졌다.

## 10. Open questions for consensus review

- 슬롯 선정 알고리즘(greedy frontier cut)이 실제 5문단 지문의 위계에서 3~6개의 의미 있는
  슬롯을 만들어내는가 — 코드 이전에 지문 1건으로 손으로 검증할 가치가 있는가?
- ablation 가중치 산출의 실제 호출 비용: 문단당 명제 n개면 재생성 n회 + 임베딩 n+1회.
  105건 × 5문단 × n을 감당 가능한가, 30건으로 먼저 제한할 것인가?
- 임베딩 없이 LLM 판정만으로 ablation 손상도를 매길 때 재현성이 충분한가?
