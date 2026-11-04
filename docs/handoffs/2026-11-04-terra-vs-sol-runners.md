# 인계: gpt-6.1-terra 대 sol 비교 실행기

- 날짜: 2026-11-04
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0104-problem-evaluator-model-routing-by-choice.md`, `D-0107-session-model-routing-repair-reselect-coaching.md`, `D-0168-reuse-existing-data-in-comparison-experiments.md`, `D-0192-keep-luna-sol-over-deepseek-pro.md`

## 목표

오답 세션에서 sol(`gpt-6.1-sol`)이 맡는 호출(선택 판정·결론 확인·마지막 설명)을 `gpt-6.1-terra`로 바꿨을 때를 저장된 sol 기록과
비교하기 위한 **실행기 네 개(A~D)를 준비**한다. 이 작업에서 외부 API 호출은 하지 않는다. 실행은 코드 에이전트가 사용자 승인 뒤에 한다.

출력 폴더: `docs/experiments/terra-vs-sol-2026-11-04/` (하위 `A-replay/`, `B-p1/`, `C-end-v22/`, `D-marker/`).

terra 단가(USD/1M 토큰): input 1, cached 0.05, output 5. reasoning effort는 sol 기준과 같은 `medium`.

### A. 세션 재생 (판정·교정 질문)

- 대상: `scripts/run-v5-regression-replay.mjs`에 옵션 두 개를 더한다.
  - `--incorrect-model <model>`: 주면, 판정 세션의 `evaluationMode !== 'REPAIR'`이고 마지막 선택(`session.selections.at(-1).choiceId`)이
    `session.source.answerChoiceId`와 다를 때만 그 모델로 판정하는 평가기를 쓴다. 나머지(정답 선택, REPAIR)는 지금 기본 라우팅(luna) 그대로.
    구현은 스크립트 안의 래퍼로 한다(평가기 두 개를 만들고 세션마다 고름). `packages/` 제품 코드는 바꾸지 않는다.
  - `--end-layout <layout-v1|layout-v2|v5.3>`: `OpenAIFeedbackEvaluator`의 `endLayout`으로 넘긴다. 안 주면 지금과 같다.
  - `RATES`에 `'gpt-6.1-terra': { input: 1, output: 5 }`를 더한다(이 파일의 기존 계산식은 cached를 따로 세지 않으므로 그대로 둔다).
- 실행 명령(코드 에이전트가 승인 뒤 실행; 이번 작업에서는 `--dry`와 단위 시험만):
  `--base docs/experiments/v5-diverse-48-regression-2026-10-28-v56 --out docs/experiments/terra-vs-sol-2026-11-04/A-replay`
  `--prompt packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md --prompt-version problem-feedback-v5.8`
  `--incorrect-model gpt-6.1-terra --end-layout layout-v1 --cap-usd 1.2`
  `--only C-A1,C-B3,D-A3,D-B1,G-A2,G-B2,G-B3,I-A2,I-A3,M-A2,M-B1,S-A1,S-B2`
- 비교 기준(재활용): `docs/experiments/v58-conclusion-2026-10-29/regression/` (같은 v5.8 지시문, 마지막 설명 layout v1, 오답 쪽 sol).

### B. 19번 ⑤ 어려운 판정 (P1 ×10, N1 ×3, N2 ×3)

- 새 파일 `scripts/run-v58-terra-p1.mjs`를 `scripts/run-v58-deepseek-p1.mjs`를 본떠 만든다.
  - 입력·SCHEDULE·지시문 확인(selftest assert)은 그대로. 공급자는 OpenAI(`openai` 패키지, `OpenAIFeedbackEvaluator`에 transport 주입),
    모델 `gpt-6.1-terra`. **그림 대체(FIGURE_TEXT)는 하지 않는다**(sol 기준과 입력이 같아야 함; 그림 이미지 그대로).
  - 출력 `docs/experiments/terra-vs-sol-2026-11-04/B-p1/`: `META.json`(모델·지시문 해시·원자료 해시·기준 경로), 회차별 기록,
    `requests.jsonl`(요청별 usage·usd·지연). 상한 `USD_CAP = 0.8`. 이어 실행 시 끝난 회차는 건너뛴다(deepseek 스크립트와 같은 방식).
- 비교 기준(재활용): `v58-conclusion-2026-10-29/sol-p1/r1~r3`, `sol-check/P1-r4~r10, N1-r1~r3, N2-r1~r3`.

### C. 마지막 설명 v2.2 (D-A3·S-A1·C-B3 × 2회)

- 새 파일 `scripts/run-end-explanation-v22-terra.mjs`를 `scripts/run-end-explanation-paragraph-marks-v22.mjs`를 본떠 만든다.
  - 사례는 sol로 만든 세 개(D-A3, S-A1, C-B3)만, 회차 1·2. 입력·지시문·출력 형식은 v22 실험과 **같게** 한다.
    지시문은 `docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02/instructions-v2.txt`와 해시가 같은지 assert.
    입력은 v22 스크립트와 같은 경로로 만들고, v22 저장 응답(`responses/<사례>-r<회차>.json`)이 기록한 입력과 같은지 확인할 수 있으면 assert한다.
  - 모델만 `gpt-6.1-terra`. 출력 `docs/experiments/terra-vs-sol-2026-11-04/C-end-v22/responses/`, 원장, `META.json`. 상한 `USD_CAP = 0.4`.
  - 인용 검사·칠할 곳 검사는 v22 스크립트와 같은 함수로 결과에 기록한다.
- 비교 기준(재활용): `end-explanation-paragraph-marks-v22-2026-11-02/responses/{D-A3,S-A1,C-B3}-r{1,2}.json` (sol).

### D. S2·G2 기호 조건 (공손룡 12번 ④, ⓓ·ⓔ)

- `scripts/run-luna-marker-misread-repro.mjs`를 본떠 새 파일 `scripts/run-marker-terra-sol.mjs`를 만든다(원본은 그대로 둔다).
  - 인자 `<gpt-6.1-terra|gpt-6.1-sol>`. 모델별 PRICES: terra {1, 0.05, 5}, sol {2, 0.2, 10}. SCHEDULE은 S2·G2 각 5회.
  - 출력 `docs/experiments/terra-vs-sol-2026-11-04/D-marker/<모델>/`. 상한: terra 0.3, sol 0.5.
  - 판정은 모델을 강제로 지정한다(이 선택은 정답이라 제품에서는 luna 경로임을 META에 적는다).
- 비교 기준: 재활용 불가(v5.8 sol 기록 없음). sol도 새로 돌린다. 참고 자료: `luna-marker-misread-count-2026-11-03/repro-v58/`(luna).

## 범위 밖

- 외부 API 호출(실제 실행). selftest·`--dry`·mock transport 시험만 한다.
- `packages/` 제품 코드, 지시문 파일, 기존 실험 폴더의 파일 수정.
- 결과 해석·보고서 작성(코드 에이전트가 한다).

## 손댈 파일과 계약

- `scripts/run-v5-regression-replay.mjs`: 옵션 두 개·terra 단가 추가. 옵션을 안 주면 기존 동작과 같아야 한다.
- `scripts/run-v5-regression-replay.test.mjs`: `--incorrect-model` 라우팅 시험(오답 선택→지정 모델, 정답 선택·REPAIR→기본 모델),
  `--end-layout` 전달 시험을 mock으로 추가.
- 새 파일: `scripts/run-v58-terra-p1.mjs`, `scripts/run-end-explanation-v22-terra.mjs`, `scripts/run-marker-terra-sol.mjs`.
  각각 외부 호출 없이 끝나는 `selftest` 인자를 둔다.

## 완료 조건

- [ ] `npm run build` 성공(실행기가 `dist`를 읽으므로)
- [ ] `node --test scripts/run-v5-regression-replay.test.mjs` 통과
- [ ] `node scripts/run-v5-regression-replay.mjs --base docs/experiments/v5-diverse-48-regression-2026-10-28-v56 --dry` 정상 출력
- [ ] `node scripts/run-v58-terra-p1.mjs selftest`, `node scripts/run-end-explanation-v22-terra.mjs selftest`,
      `node scripts/run-marker-terra-sol.mjs gpt-6.1-terra selftest`, `... gpt-6.1-sol selftest` 모두 passed, 외부 요청 0
- [ ] 결과 보고에 각 실행기의 예상 요청 수와 실행 명령을 적는다

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- C에서 v22 입력을 같은 모양으로 재현할 수 없으면(예: 저장 요청 경로가 없음) 멈추고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-v5-regression-replay.mjs`(옵션 2개, `makeRoutedEvaluator` 추가, terra 단가), `scripts/run-v5-regression-replay.test.mjs`(라우팅·layout 전달 시험 1건), 새 파일 `scripts/run-v58-terra-p1.mjs`, `scripts/run-end-explanation-v22-terra.mjs`, `scripts/run-marker-terra-sol.mjs`
- 테스트 결과: `npm run build` 성공; `node --test scripts/run-v5-regression-replay.test.mjs` 7 통과/0 실패; replay `--dry` 정상(18세션); 세 새 실행기 selftest(`run-marker-terra-sol.mjs`는 terra·sol 각각) 모두 passed, 외부 요청 0.
- 남은 문제: 없음. 실행(외부 호출)은 하지 않았다. 참고: C 실행기는 v22 저장 입력 대신 저장 응답의 검사·칠할 곳 결과를 같은 입력으로 재계산해 일치함을 selftest에서 assert한다(v22 응답에 입력 자체는 기록돼 있지 않음).
