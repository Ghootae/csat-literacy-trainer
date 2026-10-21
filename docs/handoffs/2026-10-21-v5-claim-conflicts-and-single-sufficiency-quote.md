# 인계: 학생 진술 충돌 기록 칸과 충분성 인용 하나 (23·24번 2차)

- 날짜: 2026-10-21
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 선행: [1차 인계](./2026-10-21-v5-self-contradiction-unknown-and-sufficiency-evidence.md)(구현됨, 커밋 안 됨). 이 문서는 그 위에 더한다.
- 상태: 승인됨(사용자 2026-10-21 "일괄로 승인": 설계 수정·위임·재시험)

## 왜 하나

1차 구현 뒤 실모델 반자동 시험(`docs/experiments/v5-contradiction-sufficiency-user-2026-10-21/`, luna 10회) 결과:

- **U1 실패(23번).** 사용자 원문 "d는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은
  옳지 않음."을 판정기가 여전히 RECONSTRUCTABLE/ERROR(E1 ⓔ, E2 뒷문장)로 보고 교정 질문을 했다. 지시문 문단만으로는 판정기가
  학생 진술끼리 비교하지 않았다. 뒷문장을 원문의 ⓓ와 비교했지만, 학생 자신의 앞문장 "d는 일반적인 옷"(= 속성이 지정되지 않은
  말)과는 비교하지 않았다.
- **V1 실패(24번).** 교정 답이 "빨간 옷"(라벨)뿐인데 `rationaleSufficient: true`, `sufficiencyEvidence`=["d와 e 모두 일반적인 옷을
  가리키니까"(처음 근거의 오류 주장), "빨간 옷"]. reason: "…함께 보면 … 핵심 관계가 드러납니다". 판정기가 조각을 잇고 그 조각들을
  인용으로 냈다.
- U2·V2(대조)는 통과.

학생 주장 분리 칸(studentClaims)처럼, 판정기가 해야 할 확인은 출력 칸으로 요구해야 실제로 한다. 그래서 두 가지를 출력·검증으로 옮긴다.

## 목표

1. SELECTION 출력에 학생 진술 충돌 칸 `claimConflicts`를 둔다. 하나라도 있으면 서버가 `reconstructability=UNKNOWN`과 빈 `errors`만
   받는다.
2. REPAIR의 `rationaleSufficient: true`는 **혼자서 핵심 관계를 말하는 학생 발화 인용 하나**로만 인정한다. 서버가 개수(정확히 1)와,
   처음 오류로 잡힌 학생 인용과 겹치지 않음을 검사한다.

## 범위 밖

- 1차 인계의 범위 밖 목록 전부(오류 수정 판정, 질문 형식, 종료 흐름, UI, 25번, 다른 세션 파일).
- `studentClaims`의 기존 항목·순서·검증 규칙. `claimConflicts`는 새 칸으로만 더한다.
- `repairedOutcome`·종료 흐름 코드.

## 손댈 파일과 계약

### 1. SELECTION 확장 스키마·검증 `packages/pipeline/src/problem-solving/feedback-v5-claims.ts`

- `extendedSelectionSchema`에 `claimConflicts`를 더한다.
  - 배열. 항목은 `{ observationId, firstQuote, secondQuote, conflict }`, 모두 string, `additionalProperties: false`, 모두 required.
  - `schema.required`에도 넣는다.
  - **속성 순서:** `claimConflicts`는 생성 순서상 `reconstructability`보다 먼저 나와야 한다. 새 `properties` 객체를 만들 때
    `claimConflicts`를 맨 앞에 두고 기존 속성을 그 뒤에 그대로 이어 붙인다(`studentClaims`는 지금처럼 맨 뒤). 다른 속성의 상대
    순서는 바꾸지 않는다.
- `validateClaims`에 더한다(실패 메시지는 기존처럼 `CLAIMS_CONTRACT: …`).
  - `claimConflicts`가 배열이 아니면 실패. 각 항목 구조(키 4개, 모두 string) 검사.
  - `firstQuote`, `secondQuote`는 각각 같은 `observationId` 학생 발화 안에 있어야 한다(기존 `normalize` 포함 검사와 같은 방식).
    두 quote가 서로 겹치면(기존 `overlaps`) 실패.
  - `claimConflicts`가 비어 있지 않으면 `reconstructability === 'UNKNOWN'`이고 `errors`가 빈 배열이어야 한다. 아니면 실패
    (메시지 예: `claimConflicts requires UNKNOWN and no errors`).
- 이 모듈 머리 주석대로 `scripts/lib/v5-marker-judgment.mjs`가 원본이면, 같은 변경을 그 파일에도 넣을지 확인한다. 그 파일을 쓰는
  실험 스크립트(옛 실험 재현용)의 동작이 바뀌면 안 되므로 **원본 mjs는 건드리지 않는다**. 머리 주석에 "claimConflicts는 TS 쪽에만
  있음(2026-10-21)"을 한 줄 더한다.

### 2. REPAIR 검증 `packages/pipeline/src/problem-solving/feedback-v4.ts`

1차에서 넣은 충분성 검사 세 줄(383~385행 부근)을 다음으로 바꾼다.
- `rationaleSufficient === true`이면 `sufficiencyEvidence.length === 1`이어야 한다. 0개는 기존 메시지, 2개 이상은
  "충분성 인용은 핵심 관계를 혼자 담은 학생 발화 하나여야 합니다. 여러 발화를 이어야 관계가 되면 충분하지 않습니다."
- `false`인데 비어 있지 않으면 기존 메시지 그대로.
- `validateStudentEvidence(s, a.sufficiencyEvidence)` 그대로.
- 새 검사: 인용이 처음 오류(`s.errors`와 `s.additionalErrors`)의 `studentEvidence` 중 어느 것과 겹치면(같은 observationId이고 한
  quote가 다른 quote를 포함, 공백 정규화) 실패. 메시지: "오류로 확인된 학생 발화는 충분성 인용으로 쓸 수 없습니다."
  `overlaps`는 `feedback-v5-claims.ts`에서 export해 재사용해도 되고, 같은 뜻의 작은 함수를 두어도 된다.
- `s.errors`·`s.additionalErrors` 항목에 `studentEvidence`가 없으면 멈추고 보고한다.

### 3. 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`

**(가) `## 학생 주장 분리 기록` 절**, `studentClaims` 항목 설명 바로 뒤에 아래 뜻의 항목을 더한다.

> - claimConflicts: studentClaims의 claimAsStated끼리 비교해, 둘 다 글자 그대로 참일 수 없는 짝을 모두 적는다. 원문과의 일치
>   여부는 보지 않고 학생 진술끼리만 비교한다. 표현이 달라도 뜻이 같은 말(같은 대상을 가리키거나 같은 성질을 말하는 말)은 같은
>   것으로 보고 비교한다. 각 항목은 observationId, 두 진술의 정확한 quote(firstQuote, secondQuote), 둘이 왜 함께 참일 수 없는지
>   쓴 conflict를 가진다. 언어적 생략 복원(지시 대상·주어·서술어)만으로 풀리는 짝은 적지 않는다. 충돌이 없으면 빈 배열이다.
> - claimConflicts가 하나라도 있으면 SELECTION의 모순 규칙대로 reconstructability=UNKNOWN이고 errors는 빈 배열이다.
>   claimConflicts는 reconstructability를 정하기 전에 기록한다.

- 이 절 첫 줄 "SELECTION에서 contentAssessment와 errors를 정하기 전에 studentClaims를 기록한다."는 그대로 둔다.
- SELECTION의 1차 모순 문단 끝에 "충돌한 짝은 `claimConflicts`에 기록한다." 한 문장을 더한다.

**(나) `## REPAIR` 절**, 1차 충분성 문단의 "true이면 그 핵심 관계를 담은 학생 발화를 `sufficiencyEvidence`에 정확히 인용한다."를
아래 뜻으로 바꾼다.

> true이면 그 핵심 관계를 혼자 담은 학생 발화 한 곳을 `sufficiencyEvidence`에 하나만 인용한다. 그 인용만 읽어도 핵심 관계가
> 드러나야 한다. 여러 발화나 조각을 이어야 관계가 되면 false다. 질문이 제시한 대상·라벨 가운데 하나를 고른 답만으로는 관계가
> 드러나지 않는다. 처음 근거에서 오류로 잡힌 학생 발화는 인용하지 않는다.

- `## 근거 기록`의 `sufficiencyEvidence` 줄에 "true이면 항목은 정확히 하나다."를 더한다.

### 4. 시험

- `feedback-v5-claims` 시험(있는 파일, 없으면 `feedback-v4.test.ts` 안): `claimConflicts` 정상(빈 배열), 충돌 있음 + UNKNOWN +
  errors 없음 통과, 충돌 있음 + RECONSTRUCTABLE 거부, 충돌 있음 + errors 있음 거부, quote가 발화에 없음 거부, 두 quote 겹침 거부,
  스키마 속성 순서(`claimConflicts`가 `reconstructability`보다 앞) 단언.
- `feedback-v4.test.ts`: 충분성 인용 2개 거부, 오류 인용과 겹치는 충분성 인용 거부, 정상 1개 통과.
- `studentClaims`를 담은 기존 SELECTION fixture(파이프라인·앱 서버·HTTP·e2e 등, 지금 약 14곳)에 `claimConflicts: []`를 더한다.
  `rationaleSufficient: true` fixture의 `sufficiencyEvidence`가 2개 이상이거나 오류 인용과 겹치면 고친다.
- 지시문 해시·문구 시험이 있으면 새 문구를 반영한다.

### 5. 재시험 사례 `scripts/v5-contradiction-sufficiency-r2-user-cases.mjs` (새 파일)

1차 사례 모듈(`scripts/v5-contradiction-sufficiency-user-cases.mjs`)은 1차 실험의 FROZEN 해시에 묶여 있으니 **고치지 않는다.**
같은 형식으로 새 파일에 6개를 둔다. 모두 `gongsun-long-later-mohists-q12`, `C4`, `full: true`. 실행하지 않는다.

| id | 내용 |
|---|---|
| U1a, U1b | 1차 U1과 같음(반복으로 안정성 확인) |
| U2 | 1차 U2와 같음 |
| V1a, V1b | 1차 V1 근거, replies `['빨간 옷', '문제가 있다고 봐']` |
| V2 | 1차 V2 근거, replies `['빨간 옷이야. 그러니까 ⓓ의 그냥 옷이랑 ⓔ 빨간 옷은 같은 대상을 가리키는 게 아니네.', '문제가 있다고 봐']` |

- 두 번째 reply는 V 근거의 두 번째 오류("…문제는 없어")에 대한 교정 답이다(1차 시험에서 확인).
- `cases.length === 6`과 id 중복 검사를 둔다.

## 완료 조건

- [ ] 확장 스키마에 `claimConflicts`가 `reconstructability`보다 앞에 있고, 검증이 시험으로 확인된다.
- [ ] 충분성 인용 개수·오류 겹침 검증이 시험으로 확인된다.
- [ ] 지시문 (가)·(나) 반영.
- [ ] 기존 fixture가 새 스키마·검증을 통과한다.
- [ ] 새 사례 모듈이 6개를 내보낸다.
- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] `npm test`: 기존 실패 2개(`boundary.test.ts`, axis-architecture) 외 새 실패 없음.
- [ ] e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
      → 기존 실패 1개(`DevPartNav` "문제" 버튼 중복) 외 새 실패 없음.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송 금지. `.env`를 열지 않는다.
- 커밋하지 않는다. `git stash`를 쓰지 않는다. 다른 세션 파일을 건드리지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/feedback-v5-claims.ts`(스키마에 `claimConflicts`를 맨 앞·required로 추가, `validateClaims` 검증 추가, `overlaps` export, 머리 주석 한 줄), `packages/pipeline/src/problem-solving/feedback-v4.ts`(충분성 인용 정확히 1개, 오류 인용과 겹침 거부), `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`(SELECTION 후처리에서 `claimConflicts`도 `studentClaims`처럼 떼어냄. 인계 목록 밖이나 rawOutput 일치에 필요해 최소 변경), `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`((가) claimConflicts 항목·모순 문단 한 문장, (나) 충분성 문단, 근거 기록 한 줄), `packages/pipeline/src/problem-solving/feedback-v4.test.ts`(withClaims·claims 시험 fixture에 `claimConflicts: []`, 원본 mjs 대조 시험은 TS 쪽 `claimConflicts`만 빼고 비교, 지시문 복원 시험 반영, 새 시험), `scripts/v5-contradiction-sufficiency-r2-user-cases.mjs`(새 파일, 6개 사례). 원본 `scripts/lib/v5-marker-judgment.mjs`와 1차 사례 모듈은 건드리지 않음.
- 테스트 결과: `npm run build`·`typecheck:client` 통과. `npm test` 1332 통과, 2 실패(기존: boundary.test.ts, axis-architecture). e2e 12 통과 1 실패(`:112`, 기존 DevPartNav "문제" 버튼 중복). 사례 모듈 length 6. 새 시험: claimConflicts 정상·UNKNOWN 통과·RECONSTRUCTABLE 거부·errors 동반 거부·비배열·구조·발화 밖 quote·겹침·속성 순서, 충분성 인용 2개 거부·오류 겹침 거부·정상 1개 통과.
- 남은 문제: 없음. 앱 서버·HTTP·e2e fixture는 SELECTION에 `studentClaims`를 넣지 않고(평가자 응답 모의) 충분성 인용이 1개이며 오류 인용과 겹치지 않아 수정 불필요. 실모델 호출·커밋은 하지 않음.
