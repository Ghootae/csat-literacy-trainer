# 인계: 분석 지도 공손룡 2단계(하향 판정, 구현 로직 확인)

- 날짜: 2026-10-16
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md`(2단계 절), 방향 `D-0141`

## 목표

판정이 정확한지가 아니라 **흐름 전체가 끝까지 도는지**를 확인한다: 응답 추출 → 라운드 구성 → 노드·관계 판정(luna, 1회) → 코드 결합 규칙 → 대화·세션별 기록.

- 기존 로그의 공손룡 대화가 라운드 단위로 추출되어 있고, 사람이 검토할 수 있다.
- 각 라운드에서 그 문단의 노드와 관계가 하나씩 판정되어 있다.
- 코드 결합 규칙의 결과(포섭·불일치·나열형·모순·인용 강등)가 라운드마다 남아 있고, 문단 나무 위에 표시된 보고서(`REPORT.md`)가 있다.

## 범위 밖

- 판정 정확도 평가, 반복 일치율, sol 판정, 노드 묶음 판정 비교. 이후 단계다.
- 지도 수정. `frozen-map.json`은 읽기 전용이다(해시 `58b6e811…ae29`, `FROZEN.md`).
- `JUDGE-PROMPT.md` 지시문 수정. 문제가 보이면 멈추고 보고한다.
- 웹앱·서버·운영 코드(`packages/**`) 변경. 로그 파일(`.omc/logs/**`) 변경.
- 해석·평가 문장. 보고서는 결과만 담는다.

## 손댈 파일과 계약

실험 폴더: `docs/experiments/analysis-map-gongsun-2026-10-16/`. 산출물은 그 아래 `stage2/`.

새 파일: `scripts/run-analysis-judge-gongsun.mjs`, `scripts/run-analysis-judge-gongsun.test.mjs`. 1단계 스크립트(`scripts/run-analysis-map-gongsun.mjs`)의 OpenAI 호출·원장·키 처리 방식을 따른다. 아래 순수 함수는 내보내서 테스트한다.

### 1. 응답 추출 `extractDialogues()`

**V4 로그** `.omc/logs/dialogue-experiment/sessions.jsonl`
- `paragraphId`가 `gongsun-long-later-mohists-`로 시작하는 레코드만.
- 제외: `turns[0].call.provider === 'mock'` 이거나 `initialResponse`에 "중심 관계를 이해했습니다"가 있는 레코드. (현재 162건 중 27건이 남는다. 다르면 멈추고 보고.)
- 대화 단위 = 레코드 하나. `dialogueId = 'v4:' + sessionId`.
- 학생 차례: `initialResponse`, 이어서 `turns[i]`에서 `questionShown`과 `studentAnswer`가 둘 다 null이 아닌 것마다 교사 `questionShown` → 학생 `studentAnswer`.

**단순 형식 로그** `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`
- `passageId === 'gongsun-long-later-mohists'`이고 `event === 'STEP'`인 레코드의 `transcript`.
- `(sessionId, paragraphId)`마다, 다른 transcript의 앞부분(prefix, 차례 단위로 role·text 동일)이 아닌 transcript만 대화 단위로 남긴다(재시도로 transcript가 새로 시작된 경우 각각 따로 남는다). `dialogueId = 'sh:' + sessionId + ':' + paragraphId + ':' + 순번`.
- `sessionId`가 같은 단순 형식 대화는 같은 학생으로 보고 세션 누적에 쓴다. V4 레코드는 레코드마다 세션이 달라 누적하지 않는다.

**라운드 구성**(두 로그 공통, D-0143 A안)
- 라운드 k = 대화 처음부터 k번째 학생 차례까지, 그 사이 교사 차례 포함. 마지막 학생 차례 뒤의 교사 차례는 넣지 않는다.
- 모델 재작성 없이 `{ role, text }` 배열 그대로 쓴다.

**원문 복사 표시** 학생 차례 어디든 문단 원문과 같은 30자 이상 연속 구간이 있으면 그 대화에 `copiedSource: true`. 제외하지 않고 표시만 한다(전부 충족이 나와야 하는 대조군 역할).

산출: `stage2/rounds.jsonl`(라운드마다 `{ dialogueId, source, sessionId, paragraphId, roundIndex, dialogue, copiedSource }`).

### 2. 판정 단위 배정 `unitsForParagraph(map, paragraphId)`

- 노드: 그 문단의 명제 전부 + `paragraphId`가 그 문단인 `COMPOSITE`·`PARAGRAPH_GIST` 노드.
  - 명제의 `sourceQuotes` = `[sourceQuote]`.
  - 합성·요지 노드의 `sourceQuotes` = 그 노드 아래 모든 명제의 `sourceQuote`를 명제 ID 순서로, 중복 제거.
  - 다른 노드의 문장·판정·위계는 넣지 않는다(D-0143 ①).
- 관계: 양 끝이 모두 `P`·`C`·`G` 노드인 관계만(X·TOP이 끝에 붙은 R2·R3·R27 제외). 두 끝의 문단 번호 중 **큰 쪽** 문단에 배정한다. 관계 끝의 `text`·`sourceQuotes`는 노드와 같은 규칙. 관계 `name`은 넣지 않고 `note`만 넣는다.
- 기대 개수(frozen-map 기준): 노드 8/18/17/19/19, 관계 1/5/7/6/5. 다르면 멈추고 보고.

### 3. 판정 호출

- 지시문: `JUDGE-PROMPT.md`의 해당 절 본문 그대로. 파일 해시 기록.
- 입력: 지시문 각 절의 입력 형식 JSON. 학생 발화 외 로그 정보(교사 판정, 골드, 상태)는 넣지 않는다.
- 모델 `gpt-6-luna`, `reasoning.effort: 'medium'`, structured output(JSON schema strict, 스키마는 `JUDGE-PROMPT.md` 출력 절), `max_output_tokens: 2000`.
- 단가 $0.10 / $0.50 per 1M(기존 스크립트 값). 상한 **2,000요청, $1**. 닿으면 멈춘다.
- 동시 8개, 타임아웃 60초, **재시도 없음**. 실패는 기록하고 넘어간다. `--resume`은 실패·누락 판정만 다시 보낸다(같은 상한 안, 원장 누적).
- `--dry-run`: API 없이 `rounds.jsonl`과 요청 본문 예시 몇 개, 요청 총수·예상 비용을 쓴다.

### 4. 인용 검사 `checkQuotes(round, judgment)` (코드)

- 각 인용이 그 라운드의 **학생 차례 중 하나**의 연속 부분 문자열인지 본다(공백 그대로 비교, 실패하면 공백 정규화 후 일치 여부를 따로 표시).
- `finalLabel`:
  - `DIRECT`인데 유효 인용이 하나도 없으면 → `PARTIAL`로 강등, `quoteDowngrade: true`.
  - `PARTIAL`·`CONTRADICTS`인데 유효 인용이 없으면 → 라벨 유지, `noValidQuote: true`.
  - 교사 차례에만 있는 인용은 무효로 치고 `tutorQuote: true`.
- 호출 실패는 `finalLabel: null`(미판정).

### 5. 결합 규칙 `combineRound(map, paragraphId, judgments)` (코드, `finalLabel` 사용)

용어: 상위 "충족" = `DIRECT`. 하위 "잡음" = `DIRECT` 또는 `PARTIAL`.

합성·요지 노드 N마다(자식 n개, 잡은 자식 k개):

| N 라벨 | 자식 | 패턴 |
|---|---|---|
| `DIRECT` | k ≥ 1 | `SUBSUMED` 포섭 (k/n 기록) |
| `DIRECT` | k = 0 | `MISMATCH_TOP_ONLY` 불일치(사람 검토) |
| `ABSENT` | k ≥ 2 | `LISTING` 나열형 |
| `PARTIAL`, 또는 `ABSENT`이고 k ≤ 1 | – | 패턴 없음 |
| `CONTRADICTS` | – | 패턴 없음(모순 목록에만) |

- 자식 또는 N이 미판정이면 그 N은 `INCOMPLETE`.
- 관계 R마다: R이 `DIRECT`·`PARTIAL`인데 **이 문단에 속한** 끝 노드가 `ABSENT`면 `MISMATCH_RELATION`. 다른 문단에 속한 끝은 이 대화에서 판정하지 않으므로 검사하지 않는다(`crossEndUnchecked` 기록).
- 모순 목록: `CONTRADICTS`인 노드·관계 전부.
- 라운드 변화: 라운드 k ≥ 2이면 직전 라운드 대비 `finalLabel`이 바뀐 단위 목록(`from → to`).

### 6. 산출물 (`stage2/`)

- `rounds.jsonl`, `judgments.jsonl`(호출마다: dialogueId, roundIndex, unitKind, unitId, 원라벨, quotes, reason, 인용 검사 결과, finalLabel, 토큰, 상태), `combined.json`(라운드마다 결합 결과), `ledger.jsonl`, `RUN.json`(프롬프트·지도·스크립트 해시, 설정, 총비용, 요청 수).
- `REPORT.md`:
  - 맨 위 요약표: 대화 수(출처별, 원문 복사 수), 라운드 수, 판정 수, 라벨 분포(노드·관계 따로), 패턴별 개수, 인용 강등·교사 인용·무효 인용 수, 실패 수.
  - 대화마다, 라운드마다: 학생 발화(교사 질문 포함), 그 문단 나무를 들여쓰기 목록으로 그리고 노드마다 표시(● DIRECT, ◐ PARTIAL, ○ ABSENT, ✕ CONTRADICTS, ? 미판정)와 패턴 꼬리표, 관계 목록과 표시, 모순 목록, 직전 라운드 대비 변화.
  - 단순 형식 세션마다 누적표: 문단 × (마지막 라운드의 G 라벨, 패턴 개수, 모순 수).
  - 해석·평가 문장 없음.

### 7. 테스트 `scripts/run-analysis-judge-gongsun.test.mjs`

- 추출: 시험 문구·mock 제외, V4 라운드 구성(질문·답 null 차례 건너뜀), 단순 형식 prefix 제거, 마지막 교사 차례 제외, 원문 복사 표시.
- 단위 배정: 합성 노드 sourceQuotes 계산, 관계 문단 배정(큰 쪽), X·TOP 관계 제외, frozen-map 기대 개수.
- 인용 검사: 강등, 교사 인용 무효, 공백 정규화 표시.
- 결합: 표의 각 줄, INCOMPLETE, MISMATCH_RELATION, 다른 문단 끝 미검사, 라운드 변화.
- 상한 계산, dry-run 요청 본문에 교사 판정·골드·상태가 없음.

## 완료 조건

- [ ] `node --test scripts/run-analysis-judge-gongsun.test.mjs` 통과, `node --test scripts/run-analysis-map-gongsun.test.mjs` 여전히 통과
- [ ] dry-run 성공: 대화 수·라운드 수·요청 총수·예상 비용을 결과 보고에 적음
- [ ] 실제 실행 완료(실패 포함), 요청 2,000 이하·$1 이하, 산출물 전부 존재
- [ ] 보호 파일 불변: `frozen-map.json`, `JUDGE-PROMPT.md`, `MAP-PROMPT.md` 해시 전후 동일, `packages/**`·`.omc/logs/**` 변경 없음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 사용자가 2026-10-16에 승인한 범위(D-0143 2단계 절) 안에서만 보낸다. 그 밖의 전송·모델·요청 수가 필요하면 실행 전에 멈춘다.
- 추출 개수(V4 27건)나 단위 기대 개수가 다르면 멈춘다.
- 스키마가 OpenAI strict 모드에서 거부되면 스키마를 바꾸기 전에 멈추고 오류를 보고한다.
- dry-run 예상 요청 수가 2,000을 넘으면 실제 실행 전에 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-judge-gongsun.mjs`, `scripts/run-analysis-judge-gongsun.test.mjs`(신규), `docs/experiments/analysis-map-gongsun-2026-10-16/stage2/`(신규: rounds.jsonl, judgments.jsonl, combined.json, ledger.jsonl, RUN.json, REPORT.md, dry-run.requests-sample.json), 이 절. 보호 파일(frozen-map.json, JUDGE-PROMPT.md, MAP-PROMPT.md) 해시 전후 동일, packages/**·.omc/logs/** 변경 없음.
- 테스트 결과: `node --test scripts/run-analysis-judge-gongsun.test.mjs scripts/run-analysis-map-gongsun.test.mjs` 26개 통과, 실패 0.
- dry-run: 대화 47(V4 27, 단순 형식 20), 원문 복사 8, 라운드 77, 요청 1,552, 예상 비용 약 $0.88(상한 기준 예약 합 $2.07). 단위 기대 개수·V4 27건 일치.
- 실제 실행: **미완료.** 요청 1,259건, 정상 판정 593건(노드 458, 관계 135), 실제 청구 비용 약 $0.112. 14:22:36 이후 연결 오류(Connection error 658, 타임아웃 8)가 이어져 666건이 실패했고, 실패 건을 예약액($0.89)으로 계산한 탓에 누적이 $0.9998이 되어 비용 상한에서 멈췄다. 미전송 959건.
- 남은 문제: (1) `--resume`으로 이어 가려면 실패 666 + 누락 959 = 1,625건이 필요하나 요청 상한(2,000)의 남은 몫은 741건이고, 원장 비용도 $0.9998이라 현재 회계로는 재개 불가. (2) 연결 오류를 예약액으로 계산할지(현재), 실제 청구 0으로 볼지, 상한·재개 정책은 설계 판단이라 임의로 바꾸지 않았다. (3) REPORT.md는 부분 결과(노드 UNJUDGED 519, 관계 147, INCOMPLETE 242)로 생성되어 있다.

### 재개 (2026-10-17, Claude)

- 사용자 승인 뒤 스크립트 수정: 연결 오류는 비용 $0(타임아웃은 예약액), 요청 상한 2,300(시도 기준), 연결 오류 10회 연속 시 중단(`isConnectionError`, `endCost`, `nextConnErrStreak`, `circuitTripped`, 테스트 2개 추가, 28/28 통과).
- `--resume`: 959건 재전송, 실패 0. 누적 요청 2,218, 실제 비용 $0.2916, 판정 1,552 전부 OK, 보호 파일 불변. `REPORT.md`·`combined.json` 재생성.
