# 인계: v5 판정 다른 공급자 모델 비교(Gemini 3.8 Flash, DeepSeek V4.1 Flash) — 공손룡 12번 준비

- 날짜: 2026-10-07
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0093-v5-composition-auto-gloss-pipeline.md`, `memory/decisions/D-0092-claude-codex-work-division.md`
- 사용자 결정(2026-10-07): 모델은 `gemini-3.8-flash`(reasoning_effort medium), `deepseek-flash`(가격표상 DeepSeek-V4.1-Flash, reasoning_effort low와 high 둘 다). 조건은 v5 + 판정 방법(대입 확인 없음). 응답 11개 × 3반복. 지연 시간·형식 오류·재시도·공식 단가 비용을 지표로 한다.
- 바탕 구현: `scripts/test-v5-substitution-check-models.mjs`(methods 조건), `scripts/lib/v5-marker-judgment.mjs`, `scripts/lib/v5-substitution-check.mjs`

## 목표

- `scripts/test-v5-provider-compare-gongsun.mjs`(`prepare | preflight | run <config>`)와 공급자 연결 모듈을 만든다.
- `prepare`는 API 호출 없이 동결 파일을 만들고 두 번 실행해도 같다.
- 가짜 전송으로 run 경로 전체(형식 오류 재시도, 원장 재개)가 동작한다.
- **이번 작업에서 외부 API 호출은 0회다.** `preflight`와 `run`은 구현만 하고 실행하지 않는다.

## 범위 밖

- 실제 preflight·run 실행, 모든 외부 호출(`.env` 사용 금지).
- `packages/**`, 기존 `scripts/**`(새 파일만), 기존 `docs/experiments/*`(새 폴더만), `memory/` 수정. 커밋.

## 손댈 파일과 계약

### 새 파일

- `scripts/lib/provider-adapter.mjs`(순수 함수 + 주입한 fetch), `scripts/lib/provider-adapter.test.mjs`
- `scripts/test-v5-provider-compare-gongsun.mjs`
- `docs/experiments/v5-provider-compare-gongsun-2026-10-07/`(FROZEN.json, prompts.json, source.json, cases.json) 그리고 실행 시 설정별 하위 폴더 `<config>/`

### 1. 설정(config) 3개

| config | 공급자 | 모델 | 추론 설정 | 출력 형식 요청 |
|---|---|---|---|---|
| `gemini-3.8-flash-medium` | Google, OpenAI 호환 `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, 키 `GEMINI_API_KEY` | `gemini-3.8-flash` | `reasoning_effort: "medium"` | `response_format: { type: "json_schema", json_schema: { name, schema, strict: true } }`(스키마는 2절 변환본) |
| `deepseek-flash-low` | DeepSeek `https://api.deepseek.com/chat/completions`, 키 `DEEPSEEK_API_KEY` | `deepseek-flash` | `thinking: { type: "enabled" }`, `reasoning_effort: "low"` | `response_format: { type: "json_object" }` |
| `deepseek-flash-high` | 같음 | 같음 | `reasoning_effort: "high"` | 같음 |

출력 토큰 상한: Gemini `max_tokens` 16000, DeepSeek `max_tokens` 32000.

### 2. 요청 변환(운영 평가기의 Responses 요청 → Chat Completions)

운영 `OpenAIFeedbackEvaluator`를 그대로 쓰고 `transport.create(request, options)`만 바꾼다(2단계 스크립트와 같은 방식).
ASSESSMENT 요청은 먼저 2단계와 같이 지시를 v5 + CLAIM_BLOCK + QUOTE_BLOCK으로, 스키마를 `extendedSelectionSchema`로 바꾼 뒤 변환한다. CONCLUSION_AUDIT·COACHING 요청은 지시·스키마는 그대로 두고 변환만 한다.

- messages: `[{ role: "system", content: <instructions> }, { role: "user", content: <input의 input_text를 순서대로 줄바꿈 2개로 이은 문자열> }]`. `input_image`가 있으면 오류(이 문항에는 이미지가 없다).
- DeepSeek: system 끝에 다음을 덧붙인다(문구 그대로). `\n\n## 출력 형식\n아래 JSON Schema를 따르는 JSON 객체 하나만 출력한다. 코드 블록 표시나 설명을 붙이지 않는다.\n` + `JSON.stringify(schema)`.
- Gemini 스키마 변환(`toGeminiSchema`): `$schema` 제거, `const: x` → `enum: [x]`. 그 밖의 키워드는 그대로 둔다. 변환 규칙과 변환 전후 해시를 FROZEN에 기록한다.
- timeout은 평가기 options를 따른다. 공급자 SDK를 새로 설치하지 않고 `fetch`를 쓴다(주입 가능하게 해서 테스트한다).

### 3. 응답 변환(Chat Completions → 평가기가 기대하는 Responses 모양)

- `output_text`: `choices[0].message.content`. 앞뒤 공백과 ```json … ``` 코드 블록 표시만 제거한다(그 밖의 수정 금지).
- `status`: `finish_reason`이 `stop`이면 `completed`, `length`면 `incomplete`, 그 밖은 원문 값을 그대로.
- `model`, `id`: 응답 값 그대로(실제 응답 모델 버전 기록용).
- `usage`: `{ input_tokens: prompt_tokens, input_tokens_details: { cached_tokens }, output_tokens: completion_tokens, output_tokens_details: { reasoning_tokens } }`.
  cached_tokens는 DeepSeek `prompt_cache_hit_tokens`, Gemini `prompt_tokens_details.cached_tokens`(없으면 0). reasoning_tokens는 `completion_tokens_details.reasoning_tokens`(없으면 null).
- 원 응답의 `usage` 객체 전체와 HTTP 상태를 원장 END에 `rawUsage`로 함께 남긴다. DeepSeek `reasoning_content`는 저장하지 않는다(길이만 기록).
- HTTP 오류는 상태 코드와 본문 앞 300자를 담아 던진다. 400대(429 제외)는 `RUN_LIMIT:` 접두어를 붙여 재시도하지 않게 한다.

### 4. 비용(공식 단가, 2026-10-07 사용자 제공·DeepSeek 가격표)

| config | 입력 | 캐시 적중 입력 | 출력 |
|---|---|---|---|
| gemini-3.8-flash | $0.75/1M | $0.75/1M(할인 미확인, 보수적으로 같게) | $3.75/1M |
| deepseek-flash | $0.30/1M(피크 기준) | $0.006/1M | $1.20/1M(피크 기준) |

- DeepSeek 공식 가격표(https://api-docs.deepseek.com/quick_start/pricing, 2026-10-07 확인) 전체: deepseek-flash 캐시 적중 입력 비피크 $0.003 / 피크 $0.006, 캐시 미적중 입력 비피크 $0.15 / 피크 $0.30, 출력 비피크 $0.60 / 피크 $1.20 (모두 1M 토큰당). "비피크 단가는 피크의 절반" (Claude 보완).
- 상한 판단은 위 보수 단가로 한다. 결과 보고에는 요청 시각(UTC)으로 DeepSeek 피크/비피크를 나눈 실제 단가 비용도 함께 계산한다(피크: 월~금 01:00–04:00, 06:00–10:00 UTC).
- 출력 비용은 `completion_tokens`로 계산하되, reasoning_tokens가 completion_tokens에 포함되는지 확인할 수 없으면 `costIfReasoningSeparate`(completion + reasoning)도 함께 보고한다.
- 설정별 요청 상한 80, 비용 상한 $1.5.

### 5. 일정·칸·지표

- 응답 S1~S8(`docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json`)과 X1~X3(`scripts/test-v5-substitution-check-gongsun.mjs`의 문구), 선택 C4, 기대값은 `docs/experiments/v5-substitution-check-gongsun-2026-10-07/cases.json`과 같다.
- 설정마다 11응답 × 3반복 = 33칸. 반복마다 응답 순서 회전. 설정은 `run <config>`로 하나씩 실행한다.
- 칸 기록은 2단계 스크립트와 같은 항목에 더해: 칸 전체 소요 시간(ms), 요청별 duration, 형식 오류(JSON 파싱 실패·운영 스키마 검증 실패·주장 계약 실패를 구분), 재시도 수, 실제 응답 모델명.
- RESULTS.json: 기대 일치(경계 X1·X2 별도), 칸 소요 시간 중앙값·90% 값, 요청 지연 중앙값, 형식 오류 종류별 수, 평가 오류 수, 토큰 합계, 비용(보수·실제).

### 6. preflight

`preflight <config>`: 문항 내용 없이 아주 작은 요청 1회(지시 "다음 JSON Schema에 맞춰 답한다", 입력 "2와 3을 더한 값을 answer에 넣어라", 스키마 `{type:"object",properties:{answer:{type:"integer"}},required:["answer"],additionalProperties:false}`)를 보내
상태, finish_reason, usage 원문, 응답 모델명, 파싱 결과를 `preflight-<config>.json`에 저장한다. 실제 실행은 사용자 승인 후 Claude가 한다.

### 7. 자체 점검(prepare)

- 지시 블록이 2단계와 같다(`instructionsFor(v5,'v5_methods')` 해시 일치).
- 변환 함수 단위 테스트: 메시지 조립, DeepSeek 스키마 덧붙임, `toGeminiSchema`(`$schema` 제거, const→enum), 코드 블록 제거, finish_reason 매핑, usage 매핑(두 공급자 예시), 400 오류의 RUN_LIMIT 처리.
- 같은 칸 위치에서 세 설정의 운영 입력(feedbackRequestContent)이 같다.

## 완료 조건

- [ ] `node --test scripts/lib/provider-adapter.test.mjs` 통과, `node --test scripts/lib/*.test.mjs` 전체 통과.
- [ ] `prepare` 두 번 통과(같은 FROZEN).
- [ ] 가짜 fetch로 세 설정 run 경로 확인: 한 칸은 첫 응답을 코드 블록 감싼 JSON으로, 한 칸은 첫 응답을 스키마 위반으로 주어 재시도 후 통과. 두 번째 run 새 요청 0. 임시 파일 삭제.
- [ ] 보호 대상 파일 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 예: 운영 평가기가 transport 응답 모양을 위와 다르게 기대하는 경우.
- 외부 API 호출이 필요해지면 실행 전 멈춘다.

## 결과 보고 (실행 후 작성)

- 이전 실행: 비피크 단가 누락으로 구현 전 중단(Codex 보고). Claude가 4절에 단가를 보완함.
- 실행 완료: 2026-10-08 KST. 외부 API 호출 0회. 실제 preflight/run 미실행, `.env` 미열람, `--env-file` 미사용. git add/commit/stash 미실행.
- 변경 파일:
  - 새 파일: `scripts/lib/provider-adapter.mjs`, `scripts/lib/provider-adapter.test.mjs`, `scripts/test-v5-provider-compare-gongsun.mjs`.
  - 새 동결 파일: `docs/experiments/v5-provider-compare-gongsun-2026-10-07/` 아래 `FROZEN.json`, `prompts.json`, `source.json`, `cases.json`.
  - 기존 파일 수정: 이 인계 문서의 결과 보고 절만 작성.
- 구현: 세 설정의 요청·응답 변환, HTTP 오류·타임아웃 처리, 피크/비피크 비용 및 reasoning 별도 과금 가정, 요청/비용 상한, 원장 재개, 형식 오류 구분, 지연 시간·모델명·토큰 집계를 구현했다. DeepSeek reasoning_content는 길이만 보존한다.
- 테스트 결과:
  - `node --test scripts/lib/provider-adapter.test.mjs`: 15/15 통과, 실패 0.
  - `node --test scripts/lib/*.test.mjs`: 151/151 통과, 실패 0(신규 15개 포함).
  - `git diff --check`: 통과.
  - `node scripts/validate-memory.mjs`: 통과(당시 결정 100개, 체크포인트 189개). memory 수정 없음.
- prepare 2회:
  - `node scripts/test-v5-provider-compare-gongsun.mjs prepare` 두 번 모두 자체 점검 통과. 설정당 33칸, 설정 3개.
  - 두 번 모두 같은 FROZEN JSON 해시: `a76fe726f8670f7c535736bb931cbe61f421753dd8413b3706d1c9edaf7be80d`.
  - v5_methods 지시 해시, 변환 스키마 전후 해시, 세 설정 운영 입력 동일성 확인. 외부 요청 각 0회.
- 가짜 모델 run 결과:
  - Gemini medium / DeepSeek low / DeepSeek high 각각 33/33칸 VALID, 가짜 fetch 34회, 스키마 오류 1회·재시도 1회·최종 평가 오류 0회.
  - 첫 칸의 코드 블록 JSON은 재시도 없이 통과. 다음 칸의 첫 응답은 운영 스키마 위반 후 재시도 통과.
  - 세 설정 모두 두 번째 run 새 요청 0회. END 없는 원장 재개 차단 확인.
  - 별도 JSON 파싱·주장 계약 실패 주입: 각 1회 구분, 재시도 2회 후 평가 오류 0회, 35회 요청 토큰 모두 집계.
  - HTTP 400 재시도 금지, 요청 80회/비용 $1.5 상한에서 fetch 0회, UTC 피크 경계 및 비피크 절반 단가 확인.
  - 가짜 응답은 경로 검증용 SUPPORTED 고정 출력이므로 의미 정확도를 뜻하지 않는다(설정별 비경계 기대 일치 15/27, 경계 6/6).
  - 테스트용 임시 디렉터리는 finally에서 삭제하고 삭제 여부를 검증했다. 실제 실험 폴더에는 동결 파일 4개만 있다.
- 보호 대상 점검: 이 작업의 쓰기 명령은 위 허용 파일만 대상으로 했다. 다만 저장소 전체 보호 파일 해시는 시작 시 7,423개에서 종료 점검 시 7,449개로 달라졌다. 작업 중 별도 `central-story-two-stage-v3` 실험 산출물, 관련 결정·체크포인트, `memory/CURRENT_STATE.md`, `memory/INDEX.md`, `memory/DECISIONS.md` 등의 갱신이 관측됐다. 이 파일들은 수정하거나 되돌리지 않았다. 따라서 저장소 전체의 시작/종료 불변 검증은 동시 변경 때문에 성립하지 않는다.
- 남은 문제: 구현·테스트 실패는 없다. 실제 공급자의 모델 지원·응답 형식·지연·과금은 외부 호출 금지로 미검증이며, 실제 preflight/run은 Claude의 후속 작업이다. 보호 대상 전체 불변 조건은 위 동시 변경을 분리해 검토해야 한다.
