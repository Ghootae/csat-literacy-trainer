# Project roadmap

## 문서 정보

- **목적:** 다음 작업자가 프로젝트의 확인된 현재 상태, 운영 결정, 완료 기준과 바로 이어서 할 한 가지를 빠르게 파악하기 위한 canonical 현황판이다. 상세 실험 결과는 `docs/experiments/`에 둔다.
- **최종 갱신일:** 2026-08-14
- **확인 기준:** 브랜치 `experiment/no-proposition-glyph`, Roadmap 6A 작업 시작 HEAD `f456c1d2225cc087476734e1b4a878ce46ebbd0a`
- **현재 최우선 작업:** 6단계 — 광합성에서 검증한 전체 지문 생산·완주 구조를 다른 분야로 확장한다.
- **현재 운영 결정:** 학생 영역 응답은 Anthropic `claude-opus-4-8`, effort `low`, proposition coverage `off`를 사용한다. 타이틀 평가는 기존 `medium/on`, 골드·질의 생성은 `medium`이며 학생 영역은 환경변수로 `medium/on` 롤백이 가능하다.
- **상태 정의:** `pending`은 시작 전, `in_progress`는 일부 근거나 구현이 있으나 완료 기준 미충족, `blocked`는 외부 결정·자료 없이는 진행 불가, `completed`는 완료 기준과 재현 가능한 증거를 모두 충족한 상태다.

퍼센트 진행률은 사용하지 않는다. “계획”, “정책 결정”, “현재 HEAD의 구현 결과”를 서로 대체해서 읽지 않는다.

## 현재 기준선

### 콘텐츠 자산

G 단계는 다음처럼 판정한다.

- **G1 골드 생성:** 명제·합성 노드·타이틀이 있는 tracked 골드가 존재한다.
- **G2 의미 검증:** 원문과 골드·질의를 독립 AI verifier가 대조하고, 필요한 repair 뒤 두 번 연속 blocker 0을 확인한 tracked 기록이 있다. 실제 인간 검수와 구분한다.
- **G3 질의 완료:** 영역 질의와 타이틀 질의가 tracked fixture로 준비되어 있다.
- **G4 표준 회귀 완료:** `packages/pipeline/src/cli/assess.ts`의 표준 프로브와 기대 판정에 포함된다.
- **G5a 앱 연결:** 로딩·제출·피드백 코드가 해당 `content/` 문단을 사용할 수 있다.
- **G5b 완주 검증:** 저장·복원·수정·다음 단락 이동·지문 완료까지 재현하는 tracked E2E 증거가 있다.

| 기준 | 현재 결과 | 근거 |
| --- | --- | --- |
| 고유 지문 | 7 | `content/`, `.omc/agreement/s1_p2.gold-1.json`, `docs/experiments/student-loop-photosynthesis-2026-07-27.md` |
| tracked 골드 단락 | 12 | `content/`의 골드 11개와 curve-road `.omc/agreement/s1_p2.gold-1.json` |
| 제품 대상 단락 | 11 | `content/`의 실제 `gold.json` 보유 디렉터리; `content/passages/` manifest와 curve-road legacy asset은 제외 |
| 앱 `content/` 등록 단락 | 11 | `content/`, `packages/app/src/server/content.ts` |
| G1 골드 생성 | 12/12 | 위 tracked 골드 |
| G2 의미 검증 | 11/11 제품 단락은 기존 gate를 통과했다. 단, `corporate-law-p1`은 새 legacy 재승격 정의에 따른 source 결속과 검증 기록 감사가 필요하다. | `content/*/semanticVerification`, `packages/pipeline/fixtures/semantic-verification/`, `packages/pipeline/src/semantic-migration.test.ts`, `docs/CONTENT-ASSET-QUALIFICATION.md` |
| G3 질의 완료 | 11/11 제품 단락 | `content/` 아래 각 문단의 tracked `queries.json`과 `title-queries.json` |
| G4 표준 회귀 완료 | 11/11 제품 단락에 legacy/production guard가 있다. 단, `corporate-law-p1`은 비교용 legacy 회귀만 있어 production-query 표준 회귀가 필요하다. | `packages/pipeline/src/cli/assess.ts`, `packages/pipeline/fixtures/regression/`, `docs/CONTENT-ASSET-QUALIFICATION.md` |
| G5a 앱 연결 | 11/11 제품 단락 | `content/`, `packages/app/src/server/content.ts`, `packages/app/src/server/index.ts` |
| G5b 엄격한 tracked E2E 완료 | 6/11 제품 단락 | photosynthesis p1~p6 전체 완주와 지문 표제 저장·복원을 검증한다: `packages/app/e2e/full-passage-flow.spec.ts` |
| 현재 표준 회귀 | 58프로브, 11단락 | 기존 42프로브에 photosynthesis p1 4, p2 6, p6 6 production-query guard 추가 |
| G1~G4를 모두 충족한 전체 지문 | 1 | `photosynthesis`: `content/passages/photosynthesis.json`, `content/photosynthesis-p1/`~`content/photosynthesis-p6/` |
| 엄격한 의미의 완성된 전체 지문 | 1 | `photosynthesis`의 p1~p6이 G1~G4·G5a를 충족하고 전체 지문 G5b가 통과함 |

세부 상태:

- 표준 회귀 밖의 골드 단락은 curve-road `s1_p2` 하나다.
- `nietzsche-p1`은 기존 attribution eval-case의 검수된 3프로브를 production 질의셋 guard로 승격했다: `packages/pipeline/fixtures/regression/nietzsche-p1.json`, `docs/experiments/nietzsche-low-off-standard-2026-08-13.log`.
- curve-road `s1_p2`는 제품으로 승격하지 않고 legacy experiment asset으로 유지한다. G1 생성·합의 실험 증거는 보존하되 G2~G5 대상이나 제품 콘텐츠 수에는 포함하지 않는다: `.omc/agreement/s1_p2.gold-1.json`, `.omc/agreement/s1_p2.gold-2.json`, `.omc/agreement/s1_p2.gold-3.json`, `.omc/agreement/s1_p2.agreement.json`.
- 광합성 원 지문 6단락은 모두 G1~G4와 G5a를 충족한다. p1·p2·p6의 과거 `reviewed/human_edit` 표시는 Codex agent 작업 이력이며 실제 인간 검수 증거가 아니다. 현재 11개 제품 단락은 별도 semantic verification gate를 통과했다.
- `corporate-law-p1`은 G1·G3과 legacy 검증·회귀 자산을 보유하며, G2와 신규 G4 및 tracked source 결속에 대한 재승격이 필요하다. provenance는 `legacy/no-fingerprint`다.
- `sessions/local/` 실행 기록은 ignored 증거다. 문단별 사용 흔적은 보여 주지만 tracked·재현 가능한 G5b 증거로 세지 않는다.
- `photosynthesis-p4`의 제출→피드백→수정→타이틀→저장·복원→다음 문단 이동은 고정 평가 fixture를 쓰는 tracked Playwright E2E로 검증한다. 이는 대표 단락 안전망이며 전체 지문 완주 G5b로 세지 않는다: `packages/app/e2e/paragraph-flow.spec.ts`, `packages/app/e2e/fixtures/photosynthesis-p4-flow.json`.
- `photosynthesis` p1~p6은 manifest 순서로 완주하고, 서버에 누적된 여섯 문단 완료 기록이 모두 있어야 비채점 지문 표제를 저장할 수 있다. 전체 흐름과 새로고침 복원은 `packages/app/e2e/full-passage-flow.spec.ts`와 `packages/app/e2e/fixtures/photosynthesis-full-passage-flow.json`이 검증한다.
- `packages/app/dist-client/`는 빌드 산출물이므로 자산 수에 포함하지 않는다.

### 평가 기준선

학생 영역 평가의 채택 결과는 39프로브 × 네 질의 분해, 총 156판정에서 기대 일치 132/156이다. 신규 위험 과대통과 0, 기존 공통 위험 과대통과 1, focal/raw 거짓 모순 0/1, 불안정 프로브 8/39다. `medium/off`보다 품질은 낮지만 실제 상호작용 지연을 줄이기 위해 `low/off`를 채택한다.

이 수치의 원시는 현재 **untracked 증거**인 아래 여섯 로그에 있다. 모두 종료 코드 0을 기록하지만, 아직 tracked 결정 보고서로 동결되지 않았다.

- `docs/experiments/low-nocoverage-base.log`
- `docs/experiments/low-nocoverage-new.log`
- `docs/experiments/low-nocoverage-n2.log`
- `docs/experiments/medium-nocoverage-base.log`
- `docs/experiments/medium-nocoverage-new.log`
- `docs/experiments/medium-nocoverage-n2.log`

실험 설계와 이전 기준선은 `docs/experiments/HANDOFF-low-nocoverage-regression.md`와 `docs/experiments/effort-medium-2026-08-09.md`에 있다. 전자는 실행 전 37프로브 상태의 인계 문서이므로 최종 39프로브 수치의 원시 근거를 대신하지 않는다.

39프로브 수치는 `low/off` 채택 당시의 비교 기준선으로 보존한다. 현재 표준 suite는 2026-08-13
Nietzsche guard 3개와 photosynthesis p1·p2·p6 guard 16개를 추가해 58프로브·11단락이다.
새 광합성 16프로브의 production 질의셋 `low/off` 실행은 기대 일치 16/16, 과대통과 0,
기준 질의셋 불일치 0/16이었다.

## Decision log

| 날짜 | 결정 | 현재 HEAD와 증거 |
| --- | --- | --- |
| 2026-08-13 | 학생 영역 응답 평가 provider는 Anthropic, model은 `claude-opus-4-8`, effort는 `low`, proposition coverage는 `off`로 채택한다. `medium/on` 롤백 경로를 유지한다. | `0b582b9`: 무설정 기본값과 롤백, prompt/schema fingerprint 분리를 구현·검증했다. 결과 요약은 `docs/experiments/eval-low-off-decision-2026-08-13.md`, 원시는 위 untracked 로그 6개다. |
| 2026-08-13 | 골드·질의 생성은 Anthropic `claude-opus-4-8`, effort `medium`으로 오프라인 품질을 우선하고 자동 생성 뒤 사람이 검수한다. | `0b582b9`: 골드 분해·합성·재생성과 영역·타이틀 질의 생성을 공통 `medium` 상수로 고정했다. 기존 골드는 생성 fingerprint가 없는 legacy 자산이다. |
| 2026-08-13 | 타이틀 평가는 이번 학생 영역 모델 변경 범위 밖이며 기존 설정을 유지한다. 별도 검증 없이 low로 내리지 않는다. | `0b582b9`: 앱과 title probe가 명시적 `TITLE_EVAL_CONFIG`(`medium/on`)를 전달하며 학생 영역 환경변수와 분리된다. 타이틀 근거는 `docs/experiments/title-compression-2026-08-10.md`다. |
| 2026-08-13 | Luna, Terra, Gemini는 운영 응답 평가기로 채택하지 않고 다른 worktree의 코드를 현재 브랜치에 병합하지 않는다. | 현재 worktree에는 세 모델의 탈락 성능을 설명하는 tracked 실험 문서나 로그가 없다. 따라서 상세 탈락 근거 경로는 확인되지 않은 상태이며 이 문서가 결과를 추정하지 않는다. 해당 근거를 보존하려면 원본 결과를 별도 검증 후 현재 저장소의 `docs/experiments/`에 tracked 문서로 옮겨야 한다. |
| 2026-08-13 | curve-road `s1_p2`는 제품으로 승격하지 않고 legacy experiment asset으로 유지한다. 완전한 원문 지문과 출처를 확보하고 인접 단락까지 제품화할 수 있을 때만 재검토한다. | 현재 자산은 `.omc/agreement/s1_p2.gold-{1,2,3}.json`, `.omc/agreement/s1_p2.agreement.json`, `.omc/agreement/s1_p2.responses.json`뿐이며 `content/` 등록, 사람 검수, 질의, 표준 회귀 및 앱 E2E가 없다. 생성 골드 간 의미 판정은 일치하지만 일부 응답에서 granularity 차이가 남아 있다. |
| 2026-08-14 | 콘텐츠 품질 gate에서 사람 검수를 필수 규칙으로 두지 않는다. 원문과 gold·영역 질의·타이틀 질의를 독립 AI verifier가 검증하고, repair 뒤 같은 후보의 두 연속 pass에 blocker가 없어야 production 편입한다. | 파이프라인 `03cfc5f`, `2d29013`, `57dc9ba`, `1fa3858`, `45262f4`; baseline `packages/pipeline/fixtures/gold-migration/baseline-2026-08-14.json`; raw 결과 `packages/pipeline/fixtures/semantic-verification/`. 기존 `reviewed/human_edit`는 삭제하지 않고 legacy agent 기록으로 교정한다. |
| 2026-08-14 | 지문 전체 표제는 지문 층위 의미 골드(N3)가 생기기 전까지 채점하지 않는다. p1~p6 완료 뒤 작성·저장·복원하는 reflection으로만 제공하며 문단 타이틀 evaluator를 재사용하지 않는다. | `48068d7`; `packages/app/src/server/index.ts`, `packages/app/src/server/session.ts`, `packages/app/e2e/full-passage-flow.spec.ts` |
| 2026-08-14 | 두 번째 전체 지문은 법학 분야의 `법인의 종류와 자산 운용의 법적 통제`로 확정한다. 공시 의무는 차선, 후기 묵가는 이후 철학 후보로 유지하고 NCM은 p2 삽화 문제 해결 전 후순위로 둔다. | `docs/experiments/roadmap-6a-passage-selection-2026-08-14.md`, `packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json` |
| 2026-08-14 | 신규 자산은 source hash와 generator fingerprint가 일치해야 한다. legacy 자산은 `legacy/no-fingerprint`를 보존하고 tracked source 결속, 현행 semantic verification과 production-query 회귀로 재승격한다. 과거 generation metadata를 추정하지 않는다. | `docs/CONTENT-ASSET-QUALIFICATION.md` |
| 2026-08-14 | 기존 v1 semantic verification은 runtime 호환용으로 유지하되 신규 promotion 증거로 자동 승격하지 않는다. 신규·legacy candidate는 source bundle에 결속된 v2 clean pass 두 번과 candidate query regression proof를 통과해야 한다. | `packages/pipeline/src/semantic-qualification.ts`, `packages/pipeline/src/candidate-qualification.ts`, `docs/CONTENT-ASSET-QUALIFICATION.md` |
| 2026-08-14 | 각주는 학습 명제와 semantic qualification에서 제외한다. raw fixture와 hash는 보존하되 연결된 각주 표식과 각주 본문은 verifier 입력 및 source-binding 의미 비교에서 제외한다. | `packages/pipeline/src/candidate-qualification.ts`, `docs/CONTENT-ASSET-QUALIFICATION.md` |
| 2026-08-14 | production regression에서 `topic_only ↔ region_not_evidenced`만 보상·진행·Gate A가 같은 비차단 diagnostic mismatch로 허용한다. exact agreement는 별도 기록하며 partial·preserved·contradicted가 포함된 불일치는 계속 차단한다. | `packages/pipeline/src/candidate-qualification.ts`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z/production-regression-result.json` |
| 2026-08-09 | 기존 학생 평가 기본 effort를 high에서 medium으로 낮췄다. | `docs/experiments/effort-medium-2026-08-09.md`. 이 결정은 2026-08-13의 low/off 결정으로 대체됐고 `0b582b9`에서 코드 기본값에도 반영됐다. |

과거 결정을 바꿀 때 위 행을 삭제하지 않고 새 행에 이유와 증거를 추가한다.

## 로드맵

### 1. Anthropic low/off 운영 기준 확정

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | 학생 영역 평가 기본값을 `low/off`로 확정하고, 골드·질의 생성은 `medium`, 타이틀 평가는 기존 설정을 유지하며 명시적 `medium/on` 롤백을 제공한다. |
| 완료 기준 | 기본값과 호출 경로 분리가 코드·테스트로 증명되고 설정 fingerprint가 분리된다. typecheck/test/build가 통과하며 결정 문서·커밋과 39프로브 근거가 tracked 상태로 연결된다. |
| 현재 결과 | 무설정 학생 영역은 `low/off`, 환경변수 롤백은 `medium/on`이다. 타이틀 평가는 명시적 `medium/on`, 골드·영역·타이틀 질의 생성은 `medium`이다. resolved 설정과 prompt/schema가 fingerprint를 분리한다. typecheck, 284개 전체 Vitest, build가 통과했다. |
| 증거 | 구현 커밋 `0b582b9`; `packages/pipeline/src/llm/query-eval.ts`, `packages/pipeline/src/llm/query-eval-config.test.ts`, `packages/pipeline/src/llm/operation-config.test.ts`, `packages/app/src/boundary.test.ts`, `docs/experiments/eval-low-off-decision-2026-08-13.md` |
| 남은 작업 | 없음. 실제 학생 사용에서 운영 결정을 다시 여는 조건은 별도 파일럿 단계에서 정한다. |
| 다음 행동 | 2단계의 `nietzsche-p1` 표준 회귀 편입으로 이동한다. |

### 2. 기존 8개 검수 단락 마무리

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | `nietzsche-p1`을 표준 회귀에 편입하고 curve-road `s1_p2`의 처리 방침을 결정하며 대표 콘텐츠 tracked E2E를 구축한다. |
| 완료 기준 | 니체 표준 프로브와 기대 판정이 존재하고, curve-road의 제품 승격 또는 과거 자산 유지 방침이 명시되며, 대표 E2E가 CI 또는 재현 가능한 테스트로 통과한다. |
| 현재 결과 | 앱의 검수된 8문단 모두 표준 회귀에 포함된다. Nietzsche guard는 `low/off` 실측 3/3을 통과했다. curve-road `s1_p2`는 legacy experiment asset으로 유지한다. `photosynthesis-p4`의 topic-only 응답→피드백→수정→관계보존→타이틀 보상→두 차례 복원→다음 문단 이동을 고정 evaluator와 임시 세션 저장소로 재현하는 Playwright E2E가 통과했다. |
| 증거 | 커밋 `3ff7613`, `7cf6d75`, `0a8115e`; `packages/pipeline/fixtures/regression/nietzsche-p1.json`, `docs/experiments/nietzsche-low-off-standard-2026-08-13.log`, `packages/app/e2e/paragraph-flow.spec.ts`, `packages/app/e2e/fixtures/photosynthesis-p4-flow.json`, `playwright.config.ts` |
| 남은 작업 | 없음. 전체 지문 완주 E2E는 별도 5단계의 완료 기준이다. |
| 다음 행동 | 3단계의 선택형 골드 생성 메타데이터 스키마와 legacy 판별 규칙을 문서로 정의한다. |

### 3. 골드 생성 재현성 보완

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | 새 골드에 provider/model, effort, 프롬프트·스키마 버전, 생성 시각, source hash, generator fingerprint, 검수 상태와 수정 이력을 보존한다. |
| 완료 기준 | 새 골드에서 메타데이터가 자동 기록·검증되고 기존 골드는 재생성 없이 `legacy/no-fingerprint`로 식별되며 기존 로더와 앱 호환성이 유지된다. 신규 생성 자산은 source hash와 generator fingerprint가 일치해야 한다. 기존 legacy 자산은 `legacy/no-fingerprint`를 보존하되 tracked source 결속과 현행 semantic verification 및 production regression gate를 통과해야 한다. |
| 현재 결과 | `buildGold()`가 새 골드에 provider/model/effort, prompt/schema version, 생성 시각, 정규화 원문 SHA-256, 생성기 fingerprint, 미검수 상태와 빈 수정 이력을 자동 기록하고 runtime schema로 검증한다. metadata가 없는 기존 content 골드 8개는 정상 `legacy/no-fingerprint`, 새 광합성 골드 3개는 `recorded`·`reviewed`로 식별된다. 전체 Vitest 302개, build와 대표 앱 E2E가 통과했다. |
| 증거 | 커밋 `1f26300`; `docs/GOLD-GENERATION-METADATA.md`, `packages/pipeline/src/gold-generation-metadata.ts`, `packages/pipeline/src/gold-generation-metadata.test.ts`, `packages/pipeline/src/gold.ts`, `packages/pipeline/src/cli/content-import.ts` |
| 남은 작업 | 없음. 향후 프롬프트나 의미 스키마 변경 시 version 상수를 함께 올리고, 실제 사람 검수와 AI 검증 이력을 혼동하지 않는다. |
| 다음 행동 | 5단계의 p1~p6 전체 지문 E2E 상태 전이를 설계한다. |

### 4. 첫 번째 전체 지문 완성

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | photosynthesis 전체 6단락 중 미완인 p1·p2·p6의 골드, 의미 검증, 영역·타이틀 질의와 회귀 프로브를 만든다. |
| 완료 기준 | 6단락 모두 G1~G4를 충족하고 앱에서 p1부터 p6까지 일관된 순서로 로드된다. 일반 단락은 핵심 프로브 3~4개, 새 관계 구조·경계는 6~8개를 둔다. |
| 현재 결과 | p1·p2·p6을 원본 세트의 정확한 문장 경계로 생성했다. 세 문단 모두 영역·타이틀 질의와 표준 회귀 fixture가 있으며 새 16프로브는 `low/off`에서 16/16 기대 일치, 위험 과대통과 0이었다. 이후 정식 AI semantic verifier로 다시 검증했다. |
| 증거 | 구현 커밋 `48ff00d`; `content/passages/photosynthesis.json`, `content/photosynthesis-p1/`~`content/photosynthesis-p6/`, `packages/pipeline/fixtures/regression/photosynthesis-p1.json`, `packages/pipeline/fixtures/regression/photosynthesis-p2.json`, `packages/pipeline/fixtures/regression/photosynthesis-p6.json`, `packages/pipeline/src/photosynthesis-completion.test.ts`, `packages/app/src/server/content.test.ts`, `docs/experiments/photosynthesis-full-passage-2026-08-13.md` |
| 남은 작업 | 없음. p1~p6 전체 완주와 마지막 지문 표제 전환은 5단계 범위다. |
| 다음 행동 | p1 제출부터 p6 완료와 지문 표제 진입까지 결정론적 E2E 상태 전이 표를 작성한다. |

### 4.5. AI semantic verification 및 legacy migration

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | 원문과 gold·영역 질의·타이틀 질의를 독립 검증하고, 오류가 있으면 최소 repair 후 새 pass로 재검증하며, 통과 전 production 편입을 차단한다. |
| 완료 기준 | verifier 입력이 생성 review와 분리되고, 원시 issue·repair·evidence 준수 결과가 보존되며, 같은 후보가 두 번 연속 blocker 0이어야 한다. source/candidate hash와 현재 fingerprint가 맞고 unresolved critical/error가 0인 자산만 import·title promotion할 수 있다. 기존 11개 production 단락을 모두 마이그레이션한다. |
| 현재 결과 | 11개 단락의 gold·영역 질의·타이틀 질의 총 33개가 현재 gate를 통과했다. gold repair는 photosynthesis-p6의 역접 대조 링크와 science-p5의 근거 없는 교차 원소 링크 2건, title repair는 corporate-law-p1과 disclosure-p3 2건이었다. 영역 질의 repair는 최종 채택본에서 0건이다. p6 회귀는 6/6, 위험 과대평가 0이었다. science-p5는 위험 과대평가 0이며 low/off 기존 경계 변이 1/4가 재현됐다. |
| 증거 | `packages/pipeline/src/semantic-verification.ts`, `packages/pipeline/src/cli/semantic-migrate.ts`, `packages/pipeline/src/semantic-migration.test.ts`, `packages/pipeline/fixtures/gold-migration/baseline-2026-08-14.json`, `packages/pipeline/fixtures/semantic-verification/`, `docs/experiments/photosynthesis-p6-semantic-migration-regression-2026-08-14.log`, `docs/experiments/science-p5-semantic-migration-regression-2026-08-14-rerun.log` |
| 남은 작업 | 없음. 기존 review 필드는 역사 기록일 뿐 production 품질 gate가 아니다. |
| 다음 행동 | 5단계의 p1~p6 전체 지문 E2E 상태 전이 표를 작성한다. |

### 5. 광합성 전체 지문 E2E

| 항목 | 내용 |
| --- | --- |
| 상태 | completed |
| 목표 | p1 제출 → 피드백 → 수정 → 타이틀 → 저장 → 재접속·복원 → 다음 단락 이동 → p6 완료 → 지문 표제 흐름을 검증한다. |
| 완료 기준 | 전체 흐름의 tracked E2E가 존재하고 세션 저장·복원과 상태 누적, 마지막 단락 이후 지문 표제 진입을 확인하며 API 의존성을 통제한 반복 실행이 가능하다. |
| 현재 결과 | manifest 메타데이터로 p1~p6 내부 이동을 제한하고 passage session의 `completedParagraphIds`에 완료를 누적한다. 여섯 문단 완료 전 지문 표제 저장은 409로 거부한다. 고정 evaluator E2E가 p1 미달→수정, 각 문단 타이틀, p1~p6 이동, 문단별 저장, 지문 표제 저장과 새로고침 복원을 재현한다. 지문 표제는 N3 골드가 없어 비채점 reflection으로 유지한다. 문단 세션과 passage session 사이 상태 정본 문제는 다른 지문으로 일반화하기 전에 별도 감사한다. |
| 증거 | 구현 커밋 `48068d7`; `content/passages/photosynthesis.json`, `packages/app/e2e/full-passage-flow.spec.ts`, `packages/app/e2e/fixtures/photosynthesis-full-passage-flow.json`, `packages/app/src/server/content.ts`, `packages/app/src/server/session.ts`, `packages/app/src/server/index.ts` |
| 남은 작업 | 없음. 지문 전체 표제 의미 채점은 N3 골드 설계 없이는 이 단계에 포함하지 않는다. |
| 다음 행동 | 6단계 후보 지문 각각의 원 지문 ID와 전체 단락 수를 manifest 후보 표로 정리한다. |

### 6. 분야별 전체 지문 확장

| 항목 | 내용 |
| --- | --- |
| 상태 | in_progress |
| 목표 | 광합성(과학), 법인(법학), 후기 묵가(철학), 공시 의무(경제·법), NCM 전지(기술), 니체(인문) 순으로 확장해 전체 지문 5개를 우선 완성한다. |
| 완료 기준 | 각 지문의 모든 단락이 G1~G4를 충족하고 분야·관계 구조가 편중되지 않으며 대표 지문은 G5b까지 검증된다. 신규 생성 자산은 source hash와 generator fingerprint가 일치해야 한다. legacy 자산은 `legacy/no-fingerprint`를 보존하되 tracked source 결속, 현행 semantic verification 및 production-query 회귀 gate를 통과해야 한다. |
| 현재 결과 | 6A에서 두 번째 전체 지문을 법인으로 확정하고 source set `69bbf88d8937cf14551903ca`의 본문 5문단과 각주 2개를 tracked fixture로 동결했다. p1은 legacy v2 재승격과 4-probe action 회귀를 통과했지만 세부 판정은 3/4이며 `topic_only ↔ region_not_evidenced` diagnostic mismatch 1건이 proof에 남아 있다. 신규 p2~p5는 tracked source에서 current generator provenance로 candidate gold·query·title-query를 생성했다. p2·p3·p5는 세 자산 semantic qualification을 통과했고, p3은 gold 관계 오류 1건을 제한 repair한 뒤 clean 2회를 다시 쌓았다. p2의 잘못된 partial 기대를 focal critical p12 미보존 근거로 topic_only로 바로잡고 독립 6회 회귀를 다시 실행해 exact/action 6/6, 위험 과대통과·거짓 모순 0으로 G4 proof를 확보했다. p3 6/6과 p5 8/8도 promotion-ready다. p4는 gold·title-query가 qualified됐지만 query verifier가 비연속 원문 구간을 `...`로 합친 evidence를 다시 반환해 첫 pass에서 fail-closed incomplete가 됐다. invalid report는 새 격리 artifact에 보존됐고 p4 regression은 실행하지 않았다. 어떤 신규 문단도 아직 `content/`로 승격하지 않았다. |
| 증거 | `packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json`, `packages/pipeline/fixtures/candidates/corporate-law-p2/`, `packages/pipeline/fixtures/candidates/corporate-law-p3/`, `packages/pipeline/fixtures/candidates/corporate-law-p4/`, `packages/pipeline/fixtures/candidates/corporate-law-p5/`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p1/2026-08-14T07-56-01-245Z/`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p2/`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p3/`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p4/`, `packages/pipeline/fixtures/semantic-qualification/corporate-law-p5/`, `packages/pipeline/fixtures/regression/corporate-law-p1.json`, `packages/pipeline/fixtures/regression/corporate-law-p2.json`, `packages/pipeline/fixtures/regression/corporate-law-p3.json`, `packages/pipeline/fixtures/regression/corporate-law-p5.json`, `docs/experiments/corporate-law-p1-legacy-requalification-2026-08-14.md`, `docs/experiments/corporate-law-p2-p5-staging-2026-08-14.md` |
| 남은 작업 | p4 query verifier의 비연속 evidence 문제를 별도 정책·prompt 변경 범위 감사 후 해결하고 valid clean 2회와 8-probe production regression을 확보해야 한다. 그 뒤 네 신규 문단을 함께 promotion하고 법인 passage manifest·G5b를 만든다. p1의 세부 3/4 diagnostic mismatch와 신규 자산의 non-blocking warning은 계속 추적한다. 공통 E2E harness 일반화 전 `pending state-model audit before 6C/G5b`도 해결해야 한다. |
| 다음 행동 | p4 invalid report의 두 비연속 evidence를 기준으로 query verifier prompt를 자산별이 아닌 일반 계약 수준에서 최소 수정할지 영향 범위를 감사한다. |

### 7. 실제 학생 파일럿

| 항목 | 내용 |
| --- | --- |
| 상태 | pending |
| 목표 | 합성 응답이 아닌 실제 학생 응답으로 판정과 UX를 검증한다. |
| 완료 기준 | 아직 확정하지 않는다. 첫 전체 지문과 G5b가 준비된 뒤 표본·중단·통과 기준을 구체화한다. |
| 현재 결과 | 학생 역할 또는 코덱스 테스트 세션은 있으나 실제 학생 코호트 자료는 없다. 기록 항목은 최초·수정 응답, 교사·시스템 판정, 과대·과소평가, 수정 성공, 대기시간, 포기·이탈, 저장·복원 문제다. |
| 증거 | `docs/experiments/student-loop-nietzsche-2026-08-07.md`, `packages/pipeline/fixtures/eval-cases/` |
| 남은 작업 | 개인정보·동의, 교사 라벨링, 지연 및 이탈 기록 방식과 완료 기준을 전체 지문 완성 후 확정해야 한다. |
| 다음 행동 | 첫 전체 지문 G5b 완료 후 파일럿 기록 스키마 초안을 작성한다. |

### 8. 콘텐츠 10개에서 30개 지문으로 확장

| 항목 | 내용 |
| --- | --- |
| 상태 | pending |
| 목표 | 전체 지문 5개 → 학생 파일럿 → 전체 지문 10개 → 품질 재검토 → 전체 지문 30개 순으로 확장한다. |
| 완료 기준 | 각 관문에서 앞 단계의 품질·UX 문제를 반영하고 승인된 생성·검수·회귀·E2E 계약으로 다음 배치를 진행한다. |
| 현재 결과 | 엄격히 완성된 전체 지문은 광합성 1개다. 대량 생성에 앞서 전체 지문 4개 추가 완성과 학생 파일럿이 필요하다. |
| 증거 | `docs/PROJECT-BRIEFING.md`, 이 문서의 3~7단계 |
| 남은 작업 | 첫 5개 지문과 파일럿 근거가 없다. 처음부터 30개를 만들면 생성·검수 규칙 변경 시 대량 재작업이 발생하고, 골드 품질·학생 UX·분야별 실패를 늦게 발견한다. |
| 다음 행동 | 7단계 파일럿 결과가 나온 뒤 10지문 확장 여부를 한 번 결정한다. |

## 문서 유지 규칙

1. 모든 작업자는 작업 시작 전에 이 문서를 읽는다.
2. 작업 시작 시 현재 단계와 완료 기준을 확인한다.
3. 작업 종료 시 확인된 사실만 갱신한다.
4. 테스트 통과나 증거 파일 없이 `completed`로 표시하지 않는다.
5. 예상·권고·가설을 완료 결과처럼 기록하지 않는다.
6. 상태 변경에는 날짜, HEAD 또는 커밋, 근거 경로를 남긴다.
7. 상세 로그를 본문에 복사하지 않고 경로와 핵심 결과만 기록한다.
8. 기존 결정을 변경할 때는 과거 기록을 삭제하지 않고 Decision log에 변경 이유를 추가한다.
9. 실패한 실험도 의사결정에 영향을 줬다면 실험 문서 경로를 남긴다.
10. untracked 파일은 증거로 표시할 수 있지만 tracked·재현 가능 증거와 구분한다.

## 알려진 증거 공백

- 최종 39프로브 `low/off`·`medium/off` 핵심 결과는 `docs/experiments/eval-low-off-decision-2026-08-13.md`에 tracked 상태로 동결됐다. 원시 출력 여섯 파일은 계속 untracked 증거다.
- Luna·Terra·Gemini의 탈락 근거는 현재 HEAD에 없다. 다른 worktree의 내용을 이 문서에서 추정하거나 혼합하지 않았다.
- legacy 골드는 생성 model·effort·prompt/schema version·source hash·fingerprint·사람 검수 이력을 한 레코드로 보존하지 않는다.
- ignored `sessions/local/`은 사용 흔적이지 반복 가능한 G5b 테스트가 아니다.
