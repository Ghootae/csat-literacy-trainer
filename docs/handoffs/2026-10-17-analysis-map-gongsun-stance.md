# 인계: 분석 지도 공손룡 입장 표시(sol 1회)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md`(입장 표시 절)

## 목표

- 동결 지도(`frozen-map.json`)의 명제 55개마다 입장(`kind`, `holder`)이 sol 1회 호출로 표시되어 있고, 코드 검증 결과와 함께 `stance/`에 남아 있다.
- 합성·요지·X·TOP 노드의 입장이 코드 규칙으로 계산되어 있다.
- 사람이 검토할 수 있는 표(`stance/STANCES.md`)가 있다.

## 범위 밖

- v3 판정 지시문 작성·재판정. 입장 확정 뒤 Claude가 별도 인계로 진행한다.
- `frozen-map.json`, `STANCE-PROMPT.md`, `JUDGE-PROMPT*.md`, `MAP-PROMPT.md`, `stage2/`, `stage2-v2/` 변경. 입장은 **별도 파일**에 둔다.
- `packages/**`, `.omc/logs/**`, `memory/**` 변경. 해석·평가 문장.

## 손댈 파일과 계약

새 파일: `scripts/run-analysis-stance-gongsun.mjs`, `scripts/run-analysis-stance-gongsun.test.mjs`. 1단계 스크립트(`scripts/run-analysis-map-gongsun.mjs`)의 지문 로드(`loadPassage`), OpenAI 호출·원장·키 처리 방식을 따른다.

- 지시문: `STANCE-PROMPT.md`의 `## 지시문` 절 본문 그대로. 해시 기록.
- 입력(user content, JSON): `{ passageId, paragraphs: [{ paragraphId, index, text }], propositions: [{ id, paragraphId, text, sourceQuote }] }`. 노드·관계·학생 응답은 넣지 않는다.
- 출력 스키마(zod strict → JSON schema): `{ stances: [{ id: string, kind: 'AUTHOR'|'FIGURE'|'COMMON', holder: string|null, evidence: string, note: string }] }`.
- 호출: `gpt-6.1-sol`, `reasoning.effort: 'medium'`, structured output strict, `max_output_tokens` 16000. 1요청, 상한 $0.5, **재시도 없음**. 단가 sol $2 / $10 per 1M.
- `--dry-run`: 요청 본문만 쓰고 검증기를 고정 예시로 돌린다.

**검증기(순수 함수, 테스트 대상)** — 통과/실패와 위반 목록:
1. 명제 ID 집합과 출력 ID 집합이 정확히 같다(누락·중복·없는 ID 없음).
2. `kind === 'FIGURE'`이면 `holder`가 비어 있지 않은 문자열이고 지문 원문 어딘가에 그대로 나온다. `AUTHOR`·`COMMON`이면 `holder === null`.
3. `evidence`가 그 명제 문단 원문의 연속 부분 문자열이다(실패 시 공백 정규화 일치 여부 별도 표시).
4. `holder` 값 목록(중복 제거)을 보고한다(검증 실패 아님).

**노드 입장 계산 `deriveNodeStances(map, stances)`** (순수 함수): 각 비명제 노드에 대해 그 아래 모든 명제의 `(kind, holder)`를 모은다. 모두 같으면 그 값, 다르면 `{ kind: 'MIXED', holder: null, parts: [{kind, holder, count}] }`.

**산출물** (`docs/experiments/analysis-map-gongsun-2026-10-16/stance/`):
- `stance.raw.json`, `stance.json`(파싱 결과), `validation.json`, `node-stances.json`, `ledger.jsonl`, `RUN.json`(프롬프트·지도·원문·스키마 해시, 설정, 비용).
- `STANCES.md`: 문단별 표 `ID | 명제 | kind | holder | evidence | note`, 그 아래 노드 입장 표 `ID | 노드 문장 | 계산된 입장`. 맨 위에 검증 결과와 holder 목록, kind 개수.

## 완료 조건

- [ ] `node --test scripts/run-analysis-stance-gongsun.test.mjs` 통과(검증기 각 항목 통과·실패 예시, 노드 입장 계산 단일·혼합, dry-run 요청에 학생 응답·노드·관계 없음). 기존 테스트(`run-analysis-judge-gongsun.test.mjs`, `run-analysis-map-gongsun.test.mjs`)도 통과.
- [ ] dry-run 성공, 실제 1요청 완료, 비용 ≤ $0.5, 산출물 전부 존재.
- [ ] 보호 파일 해시 전후 동일(`frozen-map.json`, `STANCE-PROMPT.md`, `JUDGE-PROMPT.md`, `JUDGE-PROMPT-v2.md`, `MAP-PROMPT.md`), `stage2/`·`stage2-v2/`·`packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 2026-10-17 사용자 승인(D-0143 입장 표시 절) — 공손룡 원문과 동결 지도 명제만, sol 1요청, $0.5. 그 밖의 전송이 필요하면 실행 전에 멈춘다.
- 검증 실패가 있어도 재시도하지 않고 결과를 그대로 보고한다.
- 스키마가 strict 모드에서 거부되면 스키마를 바꾸기 전에 멈추고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-stance-gongsun.mjs`, `scripts/run-analysis-stance-gongsun.test.mjs`(신규), `docs/experiments/analysis-map-gongsun-2026-10-16/stance/` 산출물 일체(stance.raw.json, stance.json, validation.json, node-stances.json, ledger.jsonl, RUN.json, STANCES.md, dry-run.request.json, dry-run.validation.json).
- 테스트 결과: 신규 6건 + 기존 judge·map 테스트 포함 40건 전부 통과. dry-run 성공(예시 검증 통과). 실제 1요청 완료, 비용 $0.0612(상한 $0.5), 검증 3항목 전부 통과. holder: 공손룡, 후기 묵가. kind: AUTHOR 10, FIGURE 43, COMMON 2. 보호 파일 5종 해시 전후 동일, stage2/·stage2-v2/ 변경 없음.
- 남은 문제: 없음. 입장 내용의 타당성은 메인 세션 검토 대상.
