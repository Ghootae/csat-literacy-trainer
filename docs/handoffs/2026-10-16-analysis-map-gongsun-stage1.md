# 인계: 분석 지도 공손룡 1단계(지도 생성 3회)

- 날짜: 2026-10-16
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md` (방향: `D-0141`)

## 목표

- 공손룡과 후기 묵가 지문(`gongsun-long-later-mohists`, 5문단)으로 sol이 위계 분석 지도를 **3회** 생성하고, 원출력·검증 결과·비용이 실험 폴더에 남아 있다.
- 각 지도의 구조 검증 결과를 기계적으로 확인할 수 있다(아래 검증 항목). 검증에 실패한 지도도 지우지 않고 실패 내용과 함께 보존한다.
- Claude가 세 지도를 비교할 수 있도록 사람이 읽는 요약(`MAPS.md`)이 있다.

## 범위 밖

- 2단계(학생 응답 하향 판정) 구현·실행. 응답 데이터 추출도 하지 않는다.
- 지도 비교 해석, 동결 선택. Claude·사용자가 한다.
- 웹앱·서버·운영 코드(`packages/app/src/**`, `packages/pipeline/src/**`) 변경.
- `MAP-PROMPT.md` 지시문 수정. 문제가 보이면 멈추고 보고한다.

## 손댈 파일과 계약

실험 폴더: `docs/experiments/analysis-map-gongsun-2026-10-16/`

- `MAP-PROMPT.md` (Claude 작성, 읽기 전용): `## 지시문` 절 본문을 instructions로 그대로 쓴다. 파일 해시를 실행 기록에 남긴다.
- `scripts/run-analysis-map-gongsun.mjs` (새 파일)
  - 지문 원문: `packages/app/src/server/content.ts`의 `loadDialoguePassages()`가 읽는 것과 같은 원천에서 공손룡 지문 5문단을 읽는다. 원문 해시를 기록한다. 지문을 찾는 경로는 코드를 따라가 확인한다.
  - 입력(user content): 지문 ID와 문단별 `{ paragraphId, index, text }`만. 골드·축·학생 응답은 넣지 않는다.
  - 호출: 기존 실험 스크립트(`scripts/test-thought-diagnosis-v0.mjs`)와 같은 방식으로 OpenAI Responses API를 쓴다. 키는 `node --env-file-if-exists`로만 읽는다. 모델 `gpt-6.1-sol`, `reasoning.effort: 'medium'`, structured output(JSON schema strict), `max_output_tokens`는 지도 크기를 고려해 정하되 결과 보고에 값을 적는다.
  - 상한: 3요청, 2달러. 단가는 기존 스크립트 값(sol 입력 $2 / 출력 $10 per 1M)을 쓴다. 상한에 닿으면 멈춘다. **재시도 없음**(형식 오류·HTTP 오류도 기록만 하고 다음 회차로 간다).
  - `--dry-run`: API 없이 요청 본문을 파일로 쓰고 검증기를 고정 예시로 돌린다.
- 출력 스키마(zod → JSON schema):
  ```
  { passageId,
    propositions: [{ id, paragraphId, text, sourceQuote, role }],
    nodes: [{ id, kind: 'COMPOSITE'|'PARAGRAPH_GIST'|'CROSS'|'TOP', paragraphId: string|null, text, childIds: string[] }],
    parentOf 없음(나무는 childIds로만 표현),
    relations: [{ id, fromId, toId, name, note }] }
  ```
  ID 규칙은 `MAP-PROMPT.md` 출력 절을 따른다.
- 검증기(순수 함수, 테스트 대상). 각 항목 통과/실패와 위반 목록을 낸다.
  1. `sourceQuote`가 해당 문단 원문의 연속 부분 문자열이다(공백 정규화 없이 그대로 비교. 실패 시 공백만 정규화했을 때 일치하는지 별도로 표시).
  2. 문장 덮개: 문단 원문을 문장으로 나눴을 때(마침표·물음표·느낌표 기준, 스크립트에 규칙 명시) 모든 문장이 어떤 `sourceQuote`와 겹친다.
  3. 나무 구조: 모든 명제·노드(TOP 제외)는 정확히 하나의 부모를 가진다. 순환 없음. 루트는 `TOP` 하나.
  4. 문단 요지: 문단마다 `PARAGRAPH_GIST` 정확히 하나. 그 문단의 명제는 모두 그 요지 노드 아래에 있다.
  5. 합성 노드의 자식은 둘 이상이다.
  6. ID 형식·참조 무결성: 모든 `childIds`·`fromId`·`toId`가 존재한다. ID가 규칙과 맞다.
- 산출물(실험 폴더 안):
  - `runs/map-r{1..3}.raw.json` (원응답), `runs/map-r{1..3}.json` (파싱 결과, 파싱 실패 시 없음)
  - `runs/map-r{1..3}.validation.json`
  - `ledger.jsonl` (요청별 시각·모델·토큰·비용·상태)
  - `RUN.json` (프롬프트 해시, 원문 해시, 스키마 해시, 설정, 총비용)
  - `MAPS.md`: 회차마다 통계(명제 수, 합성 노드 수, 문단별 층 깊이, 관계 수·관계 이름 빈도, 역할 이름 빈도, 검증 결과)와 나무를 들여쓰기 목록으로 그린 것(노드 ID + 문장). 해석·평가 문장은 쓰지 않는다.
- `scripts/run-analysis-map-gongsun.test.mjs` (새 파일): 검증기 6항목 각각의 통과·실패 예시, 상한 계산, dry-run 요청 본문에 학생 응답·골드가 없음을 확인.

## 완료 조건

- [ ] `node --test scripts/run-analysis-map-gongsun.test.mjs` 통과
- [ ] dry-run 실행 성공, 요청 본문 확인
- [ ] 실제 실행 3요청 완료(실패 포함), 총비용 2달러 이하, 산출물 전부 존재
- [ ] 보호 파일 불변: `MAP-PROMPT.md` 해시가 실행 전후 같다. `packages/**` 변경 없음(`git status`로 확인)

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 사용자가 2026-10-16에 **공손룡 지문 원문만** OpenAI(`gpt-6.1-sol`)로 3요청·2달러 상한 안에서 보내는 것을 승인했다(D-0143). 그 밖의 전송·모델·요청 수가 필요하면 실행 전에 멈춘다.
- 지문 원천을 찾지 못하거나 문단 수가 5가 아니면 멈춘다.
- 스키마가 OpenAI strict 모드에서 거부되면 스키마를 바꾸기 전에 멈추고 오류를 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-map-gongsun.mjs`, `scripts/run-analysis-map-gongsun.test.mjs`(새 파일), `docs/experiments/analysis-map-gongsun-2026-10-16/{runs/map-r{1..3}.raw.json, map-r{1..3}.json, map-r{1..3}.validation.json, ledger.jsonl, RUN.json, MAPS.md}`, 이 문서의 결과 절. `packages/**`와 `MAP-PROMPT.md`는 변경하지 않음(프롬프트 해시 실행 전후 동일 f4df9cca...).
- 테스트 결과: `node --test scripts/run-analysis-map-gongsun.test.mjs` 11개 통과, 실패 0. dry-run 성공(요청 본문은 지문 ID와 문단 `{paragraphId,index,text}`만, 예시 지도 검증 6항목 통과). dry-run 산출 파일은 실제 실행 전에 삭제함.
- 실행 결과(gpt-6.1-sol, medium, max_output_tokens 32000, 재시도 없음):
  - r1: 완료, 파싱 성공, 검증 6항목 전부 통과, 입력 2547 / 출력 11607(추론 861) 토큰, $0.1212. 명제 55, COMPOSITE 20.
  - r2: 완료, 파싱 성공, 검증 전부 통과, 입력 2547 / 출력 11698(추론 1034), $0.1221. 명제 52, COMPOSITE 19.
  - r3: 완료, 파싱 성공, 검증 전부 통과, 입력 2547 / 출력 11310(추론 516), $0.1182. 명제 55, COMPOSITE 21.
  - 총 3요청, $0.3614(상한 $2). 세 회차 모두 CROSS 2, 문단 요지 5, TOP 1.
- 남은 문제: 없음. 지도 비교·해석은 범위 밖. 인계 문서와 다르게 한 점: 없음(스크립트 위치는 저장소 `scripts/`, 실험 산출물은 실험 폴더). 결정 번호는 D-0143으로 갱신된 것을 따름. 캐시 입력 토큰도 전체 입력 단가로 계산(보수적).
