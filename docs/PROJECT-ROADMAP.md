# Project roadmap

## 문서 정보

- **목적:** 다음 작업자가 프로젝트의 확인된 현재 상태, 운영 결정, 완료 기준과 바로 이어서 할 한 가지를 빠르게 파악하기 위한 canonical 현황판이다. 상세 실험 결과는 `docs/experiments/`에 둔다.
- **최종 갱신일:** 2026-08-13
- **확인 기준:** 브랜치 `experiment/no-proposition-glyph`, Nietzsche 회귀 구현 HEAD `3ff76134d8eddefdf0d1194062af00f216abf4a5`
- **현재 최우선 작업:** 2단계 — 대표 콘텐츠의 저장·복원·수정·이동·완주 흐름을 검증하는 tracked E2E를 구축한다.
- **현재 운영 결정:** 학생 영역 응답은 Anthropic `claude-opus-4-8`, effort `low`, proposition coverage `off`를 사용한다. 타이틀 평가는 기존 `medium/on`, 골드·질의 생성은 `medium`이며 학생 영역은 환경변수로 `medium/on` 롤백이 가능하다.
- **상태 정의:** `pending`은 시작 전, `in_progress`는 일부 근거나 구현이 있으나 완료 기준 미충족, `blocked`는 외부 결정·자료 없이는 진행 불가, `completed`는 완료 기준과 재현 가능한 증거를 모두 충족한 상태다.

퍼센트 진행률은 사용하지 않는다. “계획”, “정책 결정”, “현재 HEAD의 구현 결과”를 서로 대체해서 읽지 않는다.

## 현재 기준선

### 콘텐츠 자산

G 단계는 다음처럼 판정한다.

- **G1 골드 생성:** 명제·합성 노드·타이틀이 있는 tracked 골드가 존재한다.
- **G2 사람 검수:** 내용과 관계 방향을 사람이 검수했다는 손 오라클·검수 문서·실행 기록이 있다.
- **G3 질의 완료:** 영역 질의와 타이틀 질의가 tracked fixture로 준비되어 있다.
- **G4 표준 회귀 완료:** `packages/pipeline/src/cli/assess.ts`의 표준 프로브와 기대 판정에 포함된다.
- **G5a 앱 연결:** 로딩·제출·피드백 코드가 해당 `content/` 문단을 사용할 수 있다.
- **G5b 완주 검증:** 저장·복원·수정·다음 단락 이동·지문 완료까지 재현하는 tracked E2E 증거가 있다.

| 기준 | 현재 결과 | 근거 |
| --- | --- | --- |
| 고유 지문 | 7 | `content/`, `.omc/agreement/s1_p2.gold-1.json`, `docs/experiments/student-loop-photosynthesis-2026-07-27.md` |
| tracked 골드 단락 | 9 | `content/`의 골드 8개와 `.omc/agreement/s1_p2.gold-1.json` |
| 앱 `content/` 등록 단락 | 8 | `content/`, `packages/app/src/server/content.ts` |
| G1 골드 생성 | 9/9 | 위 tracked 골드 |
| G2 사람 검수 | 8/9 | `packages/pipeline/fixtures/query-oracles/`, `packages/pipeline/fixtures/queries-corporate-law-p0.json`, `docs/experiments/student-loop-nietzsche-2026-08-07.md` |
| G3 질의 완료 | 8/9 | `content/` 아래 각 문단의 tracked `queries.json`과 `title-queries.json` |
| G4 표준 회귀 완료 | 8/9 | `packages/pipeline/src/cli/assess.ts`, `packages/pipeline/fixtures/regression/nietzsche-p1.json` |
| G5a 앱 연결 | 8/9 | `content/`, `packages/app/src/server/content.ts`, `packages/app/src/server/index.ts` |
| G5b 엄격한 tracked E2E 완료 | 0/9 | 저장·복원 단위 테스트는 있으나 전 지문 완주 tracked E2E가 없음: `packages/app/src/server/session.test.ts`, `packages/app/src/server/view.test.ts` |
| 현재 표준 회귀 | 42프로브, 8단락 | 기존 base 12, new 12, n2 15와 Nietzsche production-query guard 3 |
| 엄격한 의미의 완성된 전체 지문 | 0 | 모든 단락 G1~G4와 대표 G5b를 함께 충족한 지문이 없음 |

세부 상태:

- 표준 회귀 밖의 골드 단락은 curve-road `s1_p2` 하나다.
- `nietzsche-p1`은 기존 attribution eval-case의 검수된 3프로브를 production 질의셋 guard로 승격했다: `packages/pipeline/fixtures/regression/nietzsche-p1.json`, `docs/experiments/nietzsche-low-off-standard-2026-08-13.log`.
- curve-road `s1_p2`는 제품으로 승격하지 않고 legacy experiment asset으로 유지한다. G1 생성·합의 실험 증거는 보존하되 G2~G5 대상이나 제품 콘텐츠 수에는 포함하지 않는다: `.omc/agreement/s1_p2.gold-1.json`, `.omc/agreement/s1_p2.gold-2.json`, `.omc/agreement/s1_p2.gold-3.json`, `.omc/agreement/s1_p2.agreement.json`.
- 광합성 원 지문은 6단락이고 현재 p3·p4·p5만 G1~G4를 충족한다: `docs/experiments/student-loop-photosynthesis-2026-07-27.md`, `content/photosynthesis-p3/`, `content/photosynthesis-p4/`, `content/photosynthesis-p5/`.
- `sessions/local/` 실행 기록은 ignored 증거다. 문단별 사용 흔적은 보여 주지만 tracked·재현 가능한 G5b 증거로 세지 않는다.
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
Nietzsche guard 3개를 추가해 42프로브·8단락이다. 새 3프로브의 production 질의셋 `low/off`
실행은 기대 일치 3/3, 과대통과 0, 기준 질의셋 불일치 0/3이었다.

## Decision log

| 날짜 | 결정 | 현재 HEAD와 증거 |
| --- | --- | --- |
| 2026-08-13 | 학생 영역 응답 평가 provider는 Anthropic, model은 `claude-opus-4-8`, effort는 `low`, proposition coverage는 `off`로 채택한다. `medium/on` 롤백 경로를 유지한다. | `0b582b9`: 무설정 기본값과 롤백, prompt/schema fingerprint 분리를 구현·검증했다. 결과 요약은 `docs/experiments/eval-low-off-decision-2026-08-13.md`, 원시는 위 untracked 로그 6개다. |
| 2026-08-13 | 골드·질의 생성은 Anthropic `claude-opus-4-8`, effort `medium`으로 오프라인 품질을 우선하고 자동 생성 뒤 사람이 검수한다. | `0b582b9`: 골드 분해·합성·재생성과 영역·타이틀 질의 생성을 공통 `medium` 상수로 고정했다. 기존 골드는 생성 fingerprint가 없는 legacy 자산이다. |
| 2026-08-13 | 타이틀 평가는 이번 학생 영역 모델 변경 범위 밖이며 기존 설정을 유지한다. 별도 검증 없이 low로 내리지 않는다. | `0b582b9`: 앱과 title probe가 명시적 `TITLE_EVAL_CONFIG`(`medium/on`)를 전달하며 학생 영역 환경변수와 분리된다. 타이틀 근거는 `docs/experiments/title-compression-2026-08-10.md`다. |
| 2026-08-13 | Luna, Terra, Gemini는 운영 응답 평가기로 채택하지 않고 다른 worktree의 코드를 현재 브랜치에 병합하지 않는다. | 현재 worktree에는 세 모델의 탈락 성능을 설명하는 tracked 실험 문서나 로그가 없다. 따라서 상세 탈락 근거 경로는 확인되지 않은 상태이며 이 문서가 결과를 추정하지 않는다. 해당 근거를 보존하려면 원본 결과를 별도 검증 후 현재 저장소의 `docs/experiments/`에 tracked 문서로 옮겨야 한다. |
| 2026-08-13 | curve-road `s1_p2`는 제품으로 승격하지 않고 legacy experiment asset으로 유지한다. 완전한 원문 지문과 출처를 확보하고 인접 단락까지 제품화할 수 있을 때만 재검토한다. | 현재 자산은 `.omc/agreement/s1_p2.gold-{1,2,3}.json`, `.omc/agreement/s1_p2.agreement.json`, `.omc/agreement/s1_p2.responses.json`뿐이며 `content/` 등록, 사람 검수, 질의, 표준 회귀 및 앱 E2E가 없다. 생성 골드 간 의미 판정은 일치하지만 일부 응답에서 granularity 차이가 남아 있다. |
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
| 상태 | in_progress |
| 목표 | `nietzsche-p1`을 표준 회귀에 편입하고 curve-road `s1_p2`의 처리 방침을 결정하며 대표 콘텐츠 tracked E2E를 구축한다. |
| 완료 기준 | 니체 표준 프로브와 기대 판정이 존재하고, curve-road의 제품 승격 또는 과거 자산 유지 방침이 명시되며, 대표 E2E가 CI 또는 재현 가능한 테스트로 통과한다. |
| 현재 결과 | 앱의 검수된 8문단 모두 표준 회귀에 포함된다. Nietzsche는 귀속 오류 1개와 올바른 최소대조·실제응답 2개를 production 질의셋 guard로 추가했고 `low/off` 실측 3/3을 통과했다. curve-road `s1_p2`는 제품으로 승격하지 않고 legacy experiment asset으로 유지하기로 결정했다. 저장·복원 단위 테스트는 있으나 대표 완주 E2E는 없다. |
| 증거 | 커밋 `3ff7613`; `packages/pipeline/fixtures/regression/nietzsche-p1.json`, `packages/pipeline/src/regression-fixture.test.ts`, `docs/experiments/nietzsche-low-off-standard-2026-08-13.log`, `.omc/agreement/s1_p2.gold-1.json`, `packages/app/src/server/session.test.ts` |
| 남은 작업 | 실제 화면 흐름을 고정하는 tracked E2E가 필요하다. 따라서 2단계 전체는 아직 완료가 아니다. |
| 다음 행동 | 대표 콘텐츠 한 건의 저장·복원·수정·다음 단락 이동을 재현하는 tracked E2E를 추가한다. |

### 3. 골드 생성 재현성 보완

| 항목 | 내용 |
| --- | --- |
| 상태 | pending |
| 목표 | 새 골드에 provider/model, effort, 프롬프트·스키마 버전, 생성 시각, source hash, generator fingerprint, 사람 검수 여부와 수정 이력을 보존한다. |
| 완료 기준 | 새 골드에서 메타데이터가 자동 기록·검증되고 기존 골드는 재생성 없이 `legacy/no-fingerprint`로 식별되며 기존 로더와 앱 호환성이 유지된다. |
| 현재 결과 | `content/`와 `.omc/agreement/`의 legacy 골드에는 충분한 생성 model/fingerprint 메타데이터가 없다. 생성 질의 일부의 `_meta`만 모델·버전을 보존한다. |
| 증거 | `packages/pipeline/src/gold.ts`, `packages/pipeline/src/llm/kernel.ts`, `content/`, `.omc/agreement/`, `packages/pipeline/fixtures/generated-queries/` |
| 남은 작업 | 메타데이터 스키마, 생성 시 자동 기록, legacy 판별, 로더 호환 테스트가 모두 필요하다. 기존 골드는 재생성하지 않는다. |
| 다음 행동 | 하위 호환 가능한 선택형 `generationMetadata` 스키마와 legacy 판별 규칙을 문서로 먼저 정의한다. |

### 4. 첫 번째 전체 지문 완성

| 항목 | 내용 |
| --- | --- |
| 상태 | in_progress |
| 목표 | photosynthesis 전체 6단락 중 미완인 p1·p2·p6의 골드, 사람 검수, 영역·타이틀 질의와 회귀 프로브를 만든다. |
| 완료 기준 | 6단락 모두 G1~G4를 충족하고 앱에서 p1부터 p6까지 일관된 순서로 로드된다. 일반 단락은 핵심 프로브 3~4개, 새 관계 구조·경계는 6~8개를 둔다. |
| 현재 결과 | 원 지문은 6단락이며 p3·p4·p5만 G1~G4 및 앱 등록 상태다. p1·p2·p6의 제품 fixture는 없다. 현재 앱 `order`는 전체 지문 내 p순서가 아니라 전역 난도 순서다. |
| 증거 | `docs/experiments/student-loop-photosynthesis-2026-07-27.md`, `content/photosynthesis-p3/`, `content/photosynthesis-p4/`, `content/photosynthesis-p5/`, `packages/pipeline/fixtures/query-oracles/photosynthesis-p3-hand.json`, `packages/pipeline/fixtures/query-oracles/photosynthesis-p4-hand.json`, `packages/pipeline/fixtures/query-oracles/photosynthesis-p5-hand.json` |
| 남은 작업 | p1·p2·p6의 G1~G4 자산과 지문/단락 계층 및 로딩 순서를 구현해야 한다. |
| 다음 행동 | tracked 원문에서 photosynthesis p1·p2·p6의 정확한 문장 경계를 확정한다. |

### 5. 광합성 전체 지문 E2E

| 항목 | 내용 |
| --- | --- |
| 상태 | pending |
| 목표 | p1 제출 → 피드백 → 수정 → 타이틀 → 저장 → 재접속·복원 → 다음 단락 이동 → p6 완료 → 지문 표제 흐름을 검증한다. |
| 완료 기준 | 전체 흐름의 tracked E2E가 존재하고 세션 저장·복원과 상태 누적, 마지막 단락 이후 지문 표제 진입을 확인하며 API 의존성을 통제한 반복 실행이 가능하다. |
| 현재 결과 | 단일 문단 제출·복원·다음 문단 UI와 단위 테스트는 있으나 지문 계층, p1~p6 연속 흐름, 지문 표제 단계와 tracked E2E가 없다. |
| 증거 | `packages/app/src/client/App.tsx`, `packages/app/src/server/index.ts`, `packages/app/src/server/session.test.ts`, `packages/app/src/server/view.test.ts` |
| 남은 작업 | 4단계 완료 뒤 결정론적 evaluator 대역을 사용한 전체 브라우저 E2E와 지문 표제 전환이 필요하다. |
| 다음 행동 | 4단계 완료 후 사용할 p1~p6 E2E 시나리오의 상태 전이 표를 작성한다. |

### 6. 분야별 전체 지문 확장

| 항목 | 내용 |
| --- | --- |
| 상태 | pending |
| 목표 | 광합성(과학), 법인(법학), 후기 묵가(철학), 공시 의무(경제·법), NCM 전지(기술), 니체(인문) 순으로 확장해 전체 지문 5개를 우선 완성한다. |
| 완료 기준 | 각 지문의 모든 단락이 G1~G4를 충족하고 분야·관계 구조가 편중되지 않으며 대표 지문은 G5b까지 검증된다. |
| 현재 결과 | 각 분야의 대표 단락은 있으나 모든 단락이 갖춰진 전체 지문은 없다. 원 지문 전체 단락 수를 보존한 공통 manifest도 없다. |
| 증거 | `content/`, `packages/pipeline/src/cli/content-import.ts`, `docs/PROJECT-BRIEFING.md` |
| 남은 작업 | 지문 단위 source manifest와 완성 순서, 분야·관계 구조 표본 기준을 정하고 각 지문의 누락 단락을 생산해야 한다. |
| 다음 행동 | 6개 후보 각각의 원 지문 ID와 전체 단락 수를 tracked manifest 후보 표로 정리한다. |

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
| 현재 결과 | 엄격히 완성된 전체 지문은 0개다. 대량 생성에 앞서 골드 metadata, 첫 전체 지문, E2E와 학생 파일럿이 필요하다. |
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
