# CSAT roadmap pause checkpoint — 2026-08-16

## 목적과 중단 이유

이 문서는 기존 CSAT roadmap 구현을 폐기하지 않고 재개 가능한 baseline으로 동결한다. 기존
roadmap implementation이 실패해서 중단한 것이 아니다. 기존의 region-wide 자유응답 판정
구조보다 판정 자의성·비용·과대확장 위험을 구조적으로 줄일 가능성이 있는 새로운
**Target-based diagnostic architecture**가 설계 후보로 등장했다. 새 후보를 충분히 검토하기 전에
기존 구조를 추가 최적화하면 폐기 가능성이 있는 부분에 개발 비용을 투입할 수 있으므로 기존
roadmap을 baseline으로 동결한다.

새 설계의 상태는 **candidate / under design review / not yet adopted**다. 이 문서는 새 설계를
production 결정이나 기존 roadmap 변경으로 기록하지 않는다.

## 정확한 저장소 상태

- 조사일: 2026-08-16 (Asia/Seoul)
- 저장소: `/Users/mac/Projects/csat-literacy-trainer`
- 브랜치: `experiment/no-proposition-glyph`
- 동결한 구현 HEAD: `e28a18f0624ed7c9bfdc2042a99695965ed45d8b`
- tracked working tree: clean
- index/staged: clean
- untracked top-level status entries: 14개
- pause tag: 생성하지 않음. 현재 재개에 필요한 p4 canary 일부가 untracked라 HEAD 하나만으로
  전체 실행 상태를 나타낼 수 없기 때문이다.

### 마지막 관련 커밋

| 커밋 | 역할 |
| --- | --- |
| `e28a18f` | probe candidate 출력 디렉터리 생성 보장 |
| `05d772d` | 생성 probe의 focal/query 참조를 실제 query set ID에 결속 |
| `9eb25d5` | 생성 probe에 focal region을 필수화 |
| `50a0ad5` | expected verdict 없는 regression probe 생성·materialization 경로 |
| `223bf7e` | 법인 passage canary dry-run 계획과 v3 probe record 호환 읽기 |
| `c21b325` | API 없는 regression mismatch arbitration 상태 기계 |
| `e4372f3` | corporate-law p2의 6Q-2 독립 probe oracle 완료 |
| `cec786e` | `contradicted`에 student evidence와 canonical source ref를 강제 |

### untracked/ignored 상태

아래 파일은 삭제·이동·수정·stage하지 않았다. 특히 기존 실험 기록과 빌드 산출물은 roadmap
checkpoint commit 대상으로 간주하지 않는다.

- 현재 중단점과 직접 관련:
  - `packages/pipeline/fixtures/regression-candidates/corporate-law-p4.json`
    - SHA-256 `c6f724887063ee4617df39c41b2ecb2ed77934fa2b6828af6ac6e21a34b993ec`
  - `packages/pipeline/fixtures/probe-qualification/corporate-law-p4/2026-08-16-v1/p1.json`
    - SHA-256 `87f626569f158748f6ce381d4206dc1c8ac802b9584aa7abb09464d57221f506`
  - 같은 디렉터리의 `p2.json`: `c5c14f855f52761f8171372fd388b5d1989101d5b1cc79818621e5b3c0944dbc`
  - 같은 디렉터리의 `p3.json`: `299939b0f249c0c714f7ed7288ac58135ea33ec2b051d4537ae73037c2571b07`
  - 같은 디렉터리의 `p4.json`: `396599520729b7cf7becbf8d3c0fd2df70a3f1a7782633a21c0c45204a0addbd`
  - 같은 디렉터리의 `p5.json`: `2001089ce98da91e2dda49afe5fcfe9f940b172d81b8df83e17821579d158e7d`
  - `.omc/metrics/llm.jsonl`: ignored 호출 계측(약 499 KB). API key나 request envelope가 아니라
    모델·effort·token·latency·오류 계측이며 재개 시 호출 수 감사에 사용한다.
- 기존 probe canary 이력:
  - `packages/pipeline/fixtures/probe-qualification/corporate-law-p2/2026-08-14-v1/`
  - `packages/pipeline/fixtures/probe-qualification/corporate-law-p2/2026-08-14-v2/`
- 기존 proposition coverage/calibration 결과:
  - `.omc/agreement/proposition-coverage-full-proposition-rerun.json`
  - `.omc/agreement/proposition-coverage-initial-calibration-2026-08-11T16-27-13.144Z.json`
  - `.omc/candidate-generation/`
- 운영 평가 기준선의 원시 로그:
  - `docs/experiments/low-nocoverage-{base,new,n2}.log`
  - `docs/experiments/medium-nocoverage-{base,new,n2}.log`
- 빌드 산출물: `packages/app/dist-client/`

## Roadmap 진행 상태

```text
완료:
- Roadmap 1: Anthropic low/off 학생 영역 평가 운영 기준 확정.
- Roadmap 2: 기존 검수 단락 마무리와 photosynthesis-p4 대표 tracked E2E.
- Roadmap 3: 골드 생성 provenance/fingerprint 재현성 보완.
- Roadmap 4 및 4.5: 광합성 전체 지문 G1~G4와 semantic qualification 자동화.
- Roadmap 5: 광합성 p1~p6 전체 지문 tracked E2E.
- Roadmap 6A: 법인 지문 선정과 tracked source fixture 동결.
- 6Q-1: canonical source segment ID 기반 evidence 계약.
- 6Q-2 p2 canary: 6 probes의 독립 2-pass oracle 확정.
- 6Q-3 구현: contract preflight와 독립 mismatch arbitration 상태 기계(고정 fixture 검증만 완료).
- 6Q-4 준비: 법인 p1~p5 passage canary dry-run과 호출량 집계.

진행 중이었음:
- Roadmap 6: 두 번째 전체 지문인 법인 p1~p5의 current-contract qualification과 regression proof.
- 6Q-2의 p4 확장: expected verdict 없는 8-probe 후보 생성 후 독립 2-pass qualification.

중단 지점:
- p4 후보 8개는 untracked candidate fixture에 생성됐다.
- p1~p4 probe는 각각 relation_preserved, contradicted, topic_only, contradicted로 auto_qualified.
- p5는 두 pass의 비대상 query r2q1 판정이 달라 quarantined/inconclusive.
- p6~p8은 호출하지 않았다. 완료된 p1~p4는 재실행하지 않는다.
- p4 regression fixture materialization과 low/off production regression은 시작하지 않았다.

아직 시작하지 않음:
- p4 p6~p8 독립 qualification.
- p4 8-probe tracked regression fixture materialization 및 low/off 8-call regression.
- 실제 mismatch에 대한 6Q-3 arbiter canary 실행.
- current canonical evidence 계약으로 p1~p5 semantic 재qualification(기존 dry-run 추산 28 calls).
- p1·p3·p5 legacy regression probe oracle qualification(기존 dry-run 추산 36 calls).
- batch-level fail-closed 경보 검증, 법인 p2~p5 production promotion, passage manifest, 공통 E2E.
- Roadmap 7 실제 학생 파일럿과 Roadmap 8 콘텐츠 확장.
```

Roadmap의 마지막 완결 단계는 **5단계**이고, 현재 상위 단계는 **6단계 in_progress**다.
`docs/PROJECT-ROADMAP.md`의 6단계 결과는 `223bf7e` 시점의 dry-run까지 반영하지만, 이후의
untracked p4 p1~p5 실행 결과는 아직 반영하지 않았다.

## 현재 blocker와 anomaly

### p4 probe p5 — paragraph-wide agreement 불일치

- 학생 응답: `적자가 발생하면 회사는 자본금을 꺼내 손실을 메우게 된다.`
- focal region: `r5`
- focal query `r5q3`: 두 pass 모두 조건이 빠진 동일 relation frame을 `preserved`로 판단했고
  canonical source ref `S6`도 일치했다.
- 유일한 불일치: 비대상 region의 `r2q1`.
  - pass 1: `자본금` 출현을 r2 scope의 `preserved`, source ref `S6`로 인정.
  - pass 2: 자본금의 정의·감액 규칙을 다루지 않았으므로 `not_evidenced`, refs 없음.
- 현행 계약은 문단의 모든 query에 대해 `semanticState + normalized sourceEvidenceRefs`가
  일치해야 하므로 record는 올바르게 `quarantined`다.
- 아직 결정하지 않은 정책: focal regression oracle이 paragraph-wide 모든 query의 완전 일치를
  요구할지, focal region의 모든 query로 verifier 입력과 agreement 범위를 제한할지.
- 결과가 나온 뒤 비대상 차이를 임의로 무시하거나 기존 p5 record를 고쳐서는 안 된다. 계약을
  바꾼다면 prompt/schema/fingerprint를 올리고 새 output directory에서 p5부터 독립 2회 실행한다.

### 기타 남은 안전 조건

- p4 p6~p8은 미실행이며 p4 tracked regression fixture도 없다.
- p1~p5는 current canonical evidence contract에 대한 semantic 재검증이 완료되지 않았다.
- p2~p5 신규 candidate는 아직 `content/`에 승격되지 않았다.
- 공통 E2E 일반화 전 `pending state-model audit before 6C/G5b`가 남아 있다.
- 새 Target-based diagnostic architecture는 위 blocker의 자동 해법이 아니며, 명시적으로 채택되기
  전 기존 roadmap 코드에 섞지 않는다.

## Frozen baseline

### 콘텐츠 생성과 qualification

- gold 생성: `packages/pipeline/src/llm/kernel.ts`,
  `packages/pipeline/src/cli/content-generate-candidate.ts`
- 영역 query 생성: `packages/pipeline/src/llm/query-gen.ts`
- title-query 생성: `packages/pipeline/src/llm/title-gen.ts`
- generator/verifier 기본 provider/model: Anthropic / `claude-opus-4-8`
- 생성·semantic verifier effort: `medium`
- semantic verifier/repair: `packages/pipeline/src/semantic-verification.ts`,
  `packages/pipeline/src/semantic-qualification.ts`,
  `packages/pipeline/src/cli/content-qualify.ts`
- source와 qualification 정책: `docs/CONTENT-ASSET-QUALIFICATION.md`

### 학생 응답 production evaluator

- 경로: `packages/pipeline/src/llm/query-eval.ts` →
  `packages/pipeline/src/evaluate-response.ts` → `packages/pipeline/src/assessment.ts`
- provider/model: Anthropic / `claude-opus-4-8`
- 무설정 기본값: effort `low`, proposition coverage `off`
- 명시적 롤백: `EVAL_EFFORT=medium`, `EVAL_PROPOSITION_COVERAGE=on`
- title evaluator: `TITLE_EVAL_CONFIG`, effort `medium`, proposition coverage `on`
- query raw state: `preserved | not_evidenced | contradicted`
- normalized region verdict:
  `relation_preserved | partial_relation_preservation | topic_only | region_not_evidenced | contradicted`
- 진행 성공은 `relation_preserved`; `contradicted`는 Gate A 강제 교정 대상이다. 나머지 미달은
  수정 가능하며 `packages/app/src/server/view.ts`가 표시·강등·강제 상태를 결정한다.
- proposition coverage는 실험 필드이며 현재 production 집계 경로에서 꺼져 있다.

### 피드백과 UI 소비 경로

- 평가·피드백 조립: `packages/pipeline/src/assessment.ts`,
  `packages/pipeline/src/evaluate-response.ts`
- 제출·세션 저장: `packages/app/src/server/index.ts`, `packages/app/src/server/session.ts`
- 화면 계약: `packages/app/src/server/view.ts`, `packages/app/src/shared/contract.ts`
- 학생 UI: `packages/app/src/client/App.tsx`

### 주요 회귀와 최근 결과

- 운영 결정 기준선: base 12 + new 12 + n2 15 = 39 probes, query 분해 156판정.
  low/off 기대 일치 132/156, 신규 위험 과대통과 0, 기존 공통 위험 과대통과 1,
  focal/raw 거짓 모순 0/1, 불안정 8/39.
- 요약: `docs/experiments/eval-low-off-decision-2026-08-13.md`
- 원시 로그: untracked `docs/experiments/{low,medium}-nocoverage-{base,new,n2}.log`
- 법인 staging: `docs/experiments/corporate-law-p2-p5-staging-2026-08-14.md`
- p2 probe oracle: `docs/experiments/roadmap-6q2-probe-oracle-canary-2026-08-14.md`
- tracked regression fixtures:
  `packages/pipeline/fixtures/regression/`, 특히 `corporate-law-p1.json`, `p2.json`,
  `p3.json`, `p5.json`. p4 fixture는 아직 없다.
- passage canary plan: `packages/pipeline/fixtures/passage-canary/corporate-law.json`

## 환경과 실행 상태

- 현재 shell process environment에서 `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `EVAL_MODEL`,
  `EVAL_EFFORT`, `EVAL_PROPOSITION_COVERAGE`는 모두 unset이었다.
- 저장소 `.env`에는 `ANTHROPIC_API_KEY`와 `OPENAI_API_KEY` 이름이 존재한다. 값은 이 문서나
  조사 출력에 기록하지 않았다. CLI가 필요할 때 `.env`를 로드한다.
- eval override가 없으므로 frozen production 기본값은 Claude `low/off`다.
- 동결 시점에 앱/Vite/evaluator batch 프로세스는 없었다. 오래 실행 중인 `cloudflared` 프로세스
  두 개가 있었으나 roadmap 작업과 연결됐다고 확인하지 않았고 종료하거나 변경하지 않았다.

## 재개 전에 반드시 읽을 경로

1. `docs/ROADMAP-PAUSE-2026-08-16.md`
2. `docs/PROJECT-ROADMAP.md`
3. `docs/CONTENT-ASSET-QUALIFICATION.md`
4. `docs/experiments/corporate-law-p2-p5-staging-2026-08-14.md`
5. `docs/experiments/roadmap-6q2-probe-oracle-canary-2026-08-14.md`
6. `packages/pipeline/src/regression-probe-qualification.ts`
7. `packages/pipeline/src/regression-probe-generation.ts`
8. `packages/pipeline/src/cli/content-qualify-probes.ts`
9. `packages/pipeline/src/cli/content-materialize-probes.ts`
10. `packages/pipeline/src/regression-arbitration.ts`
11. `packages/pipeline/src/passage-canary.ts`
12. 위 untracked p4 candidate 및 p1~p5 record

## Resume 절차

사용자가 **“기존 로드맵 resume”**라고 명시하면 다음 순서로 재개한다.

1. 이 문서를 읽고 브랜치 `experiment/no-proposition-glyph`, 구현 baseline
   `e28a18f0624ed7c9bfdc2042a99695965ed45d8b`, untracked p4 artifact의 존재와 SHA-256을 현재
   저장소와 비교한다. pause 이후 커밋과 tracked/untracked 차이를 먼저 보고한다.
2. `npm run build`와 `npm test`를 실행해 baseline을 다시 검증한다. API 회귀는 반복하지 않는다.
3. p5 record의 r2q1 불일치가 여전히 blocker인지 확인하고, paragraph-wide agreement 유지 또는
   focal-region-only input/agreement 중 어느 계약을 쓸지 명시적으로 결정한다. 새 Target-based
   architecture는 사용자가 채택하지 않는 한 이 결정에 자동 반영하지 않는다.
4. 계약 변경이 없다면 같은 p5 호출을 반복하지 않는다. 계약을 변경하면 prompt/schema/fingerprint를
   올리고 기존 `2026-08-16-v1`을 보존한 채 새 디렉터리에서 **p5만** 독립 2회 재검증한다.
5. p5가 auto-qualified일 때만 p6~p8을 실행하고, 기존 p1~p4는 재실행하지 않는다. 그 다음 8개
   record를 materialize하여 p4 tracked regression fixture를 만들고 low/off 8-probe regression을
   실행한다. mismatch가 있으면 6Q-3 arbitration을 사용하며 fixture를 즉시 고치지 않는다.
6. 이후 passage canary dry-run이 기록한 current-contract semantic 28 calls와 p1·p3·p5 oracle
   36 calls를 미완료 항목부터 수행하고 batch fail-closed 경보를 확인한다. production promotion과
   passage manifest는 별도 승인 전 실행하지 않는다.

### 재개용 명령과 산출물

현재 p4 qualification 잔여 호출의 범위만 확인하는 dry-run(실제 API 0회):

```bash
node_modules/.bin/vite-node --script \
  packages/pipeline/src/cli/content-qualify-probes.ts \
  --fixture packages/pipeline/fixtures/regression-candidates/corporate-law-p4.json \
  --source-fixture packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json \
  --source-paragraph-id p4 \
  --output-dir packages/pipeline/fixtures/probe-qualification/corporate-law-p4/2026-08-16-v1 \
  --probe-ids p6,p7,p8 \
  --dry-run
```

이 명령의 non-dry-run은 p5 정책이 해결되기 전에 실행하지 않는다. 기존 전체 명령은 p5 record를
재사용하고 p6로 넘어가므로 blocker를 해결한 것으로 오해할 수 있다.

p5 해결 후 materialization 예시:

```bash
node_modules/.bin/vite-node --script \
  packages/pipeline/src/cli/content-materialize-probes.ts \
  --candidate-fixture packages/pipeline/fixtures/regression-candidates/corporate-law-p4.json \
  --record-dir <모든 8개가 auto_qualified인-record-directory> \
  --output packages/pipeline/fixtures/regression/corporate-law-p4.json
```

법인 전체 dry-run(API 0회):

```bash
node_modules/.bin/vite-node --script \
  packages/pipeline/src/cli/content-passage-canary.ts \
  --plan packages/pipeline/fixtures/passage-canary/corporate-law.json \
  --dry-run
```

완료된 API 결과나 record를 처음부터 반복하지 않는다. fingerprint/hash가 다르면 섞지 말고 새
output directory를 사용한다.

## Pause 시점 검증

- `npm run build`: 성공 (`tsc --build`, exit 0)
- `npm test`: 성공 (38 test files, 390 tests passed, exit 0)
- 이 검증에서는 LLM/API 평가나 regression을 호출하지 않았다.
- pause 문서 외 제품 코드·schema·prompt·fixture를 변경하지 않았다.
