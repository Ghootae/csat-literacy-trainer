# 인계: 재구성 세 칸과 합당 기준, 선지 읽기 오류 (v5.3)

- 작업 이름: **재구성 세 칸 판정 (v5.3)**. 시작 사례: K4(회사법 13번 ②, 근거 "주식회사 법인격의 부여 대상은 단체, not 개인").
- 날짜: 2026-10-27
- 작성: 코드 에이전트
- 실행: 1단계(코드·지시문) executor 하위 에이전트(sonnet). 2단계(실모델 확인·회귀)는 사용자 승인 뒤 코드 에이전트.
- 상태: **설계 확정**(2026-10-27 사용자 "권고대로 네 가지 모두 진행해줘"). 1단계 실행 가능.
- 근거: [보고서 논의 메모](../reports/REPORT-k4-v51-judgment-review-human.md#논의-메모-합의한-설계-방향-2026-10-27-설계안-작성-때-반영),
  [체크포인트](../../memory/checkpoints/2026-10-27-k4-judgment-redesign-discussion.md). 기준 코드는 v5.1(커밋 `95ff15d` 이후 현재 브랜치).
  v5.2 보관분은 `wip/partial-refutation-v52`(커밋 `90dacd2`).
- 관련 결정: D-0161(핵심 관계 조각 — 이번에 대체 제안), D-0157(교정 뒤 근거 확인, 발화 한 곳 규칙 유지), D-0166("원문에 없음" 근거 — 유지),
  D-0177(v5.1). 새 결정 기록은 2단계 뒤.
- 약칭: `PP` = `packages/pipeline/src/problem-solving`, `PA` = `packages/app/src`,
  `P51` = `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md`, `W` = `wip/partial-refutation-v52`.

## 왜 하나

- v5.1 판정기는 K4의 ② "…주주들에 의해 법인격이 부여되었기 때문"을 "주주들이 부여"로만 읽고 받는 쪽(갑)을 읽지 않아 재구성 불가로
  판정했다. 지시문 64-67행("핵심 전제")과 68-70행("상황 일치 시 재구성") 사이 우선순위가 없다.
- v5.2(보관)는 P4("틀린 지점은 선지 문장에 쓰인 주장만")로 K4를 "근거 부족"에 묶었고 실측에서 K4는 한 번도 충족이 나오지 않았다.
- 사용자와 합의한 방향(2026-10-27): 재구성을 **세 칸**(① 선지 이해 ② 근거 ③ 판단)으로 정의하고, 충족은 **합당 기준**(반박 대상이
  선지와 일치한다고 볼 수 있는가, 빈자리 채움 규칙 포함)으로 가른다. 오답 선택에서 학생 말에 드러난 선지 읽기는 새 오류 종류 `READING`으로 교정한다.

## 목표 (끝나면 참)

1. 판정 지시문 `source-direct-problem-feedback-v5.3.md`(새 파일), `promptVersion` = `problem-feedback-v5.3`. `v5.1.md`는 재현용으로 둔다.
2. SELECTION 확장 출력에 세 칸(`choiceReading`·`ground`·`judgment`)이 있고, 재구성 가능 여부와 정답 선택의 충족·부족을 **서버가 세 칸에서 검사**한다.
   `keyRelationCoverage`는 요청 스키마에서 뺀다(D-0161 대체, 4절).
3. 빈자리 채움 규칙(선지 안의 말, 모호한 빈자리는 반박 대상당 1개, 모호하면 학생 말의 단서 필수, 정답 선택에만)을 서버가 검사한다.
4. 오류 종류 `READING`이 `TARGET`·`CONTENT`와 나란히 있고, 첫 오답 선택에서 교정 질문으로, 두 번째 오답 선택에서는 기록만 된다.
5. 교정 뒤 근거 확인(`rationaleSufficient`)이 SELECTION과 같은 기준을 쓴다(발화 한 곳 규칙 유지).
6. 마지막 설명이 v5.2의 E1·E3·E4·E5를 가져오고, E2를 새 칸 기준 경우별 문단으로 바꾼다.
7. 화면 흐름(교정 질문 진입, 종료 이유, 버튼)은 `READING` 추가 외에 바뀌지 않는다.

## 범위 밖

- 오류 가설(INFERRED) 규칙의 조건, 선택 충돌 질문, 두 번째 선택에서 더 묻지 않는 흐름(합의: v5.1 유지).
- 대상 오류(TARGET)·내용 오류(CONTENT)의 판정 규칙(합의: v5.1 유지, 단 3절 (f)의 "대상 미명시 → 선지 대상으로 복원" 명문화만).
- 세션 `version`, 기록 `schemaVersion`, 로그 경로, 학생용 v3 경로(`PA/server/problem-solving.ts`, `PA/client/ProblemApp.tsx`).
- 학습자 진단 집계 스크립트 수정(`READING`이 기록에 남는 것까지만).
- `W` 브랜치 병합. 필요한 부분은 이 문서에 글자로 옮겼다. `git merge`·`cherry-pick` 하지 않는다.
- 외부 API 호출, 커밋, `git stash`, `.env` 열기.

## 1. 세 칸의 정의 (지시문·스키마·서버 공통 계약)

재구성 가능 = 세 칸이 모두 채워짐. 칸이 채워졌는지와 내용이 맞는지는 따로 본다(틀린 근거도 칸은 채운다).

| 칸 | 필드 | 내용 | 채워지는 조건 | 비는 경우 |
|---|---|---|---|---|
| ① 선지 이해 | `choiceReading` | 학생이 선지의 어느 주장을 어떤 뜻으로 읽었나 | 학생 말이 선지의 대상·주장 하나 이상에 닿음 | 선지 대상에 닿지 않음("장학 재단은 비영리 법인이다") |
| ② 근거 | `ground` | 판단에 쓴 사실·이유(학생 말 그대로) | 사실·이유·결론 반복·판단 방식 중 하나가 있음 | 결론·느낌만("②가 틀렸어", "이상해") |
| ③ 판단 | `judgment` | 선지를 참/거짓 중 어느 쪽으로 봤나, 어느 지점에서 | 명시했거나 ②가 ①과 한 방향으로만 이어짐 | 두 방향 모두 가능 |

### 스키마 (확장 출력, `claimConflicts` 다음·판정 칸들 앞)

```
choiceReading: {
  claims: [                          // 선지 문장을 주장 단위로 나눈 것(학생과 무관, 선지로 정함). 1개 이상
    { claimId: "c1"…,                // c1부터
      choiceText: string,            // 선지 문장에서 정확히 복사한 부분 문자열
      studentReading: string,        // 학생이 그 주장을 읽은 뜻(평가자 말). 닿지 않았으면 ""
      relation: "UNTOUCHED" | "EXACT" | "BLANK_FILLED" | "WEAKER" | "STRONGER" | "ADDED" | "REVERSED" | "OTHER_TARGET",
      readingQuote: { observationId, quote } | null,   // 그 읽기가 드러난 학생 발화. UNTOUCHED면 null
      blanks: [ { slot: string,        // 서술어가 요구하는 빈자리(예: "법인격을 받는 쪽")
                  candidates: string[],// 선지 문장 안의 후보 낱말(1개 이상)
                  chosen: string,      // 고른 말(candidates 중 하나)
                  cue: { observationId, quote } | null } ] // 후보가 2개 이상일 때 학생 말의 단서
    } ]
}
ground: {
  kind: "FACT" | "CONCLUSION_RESTATED" | "JUDGMENT_METHOD" | "NONE",
  observationId: string, quote: string                  // NONE이면 둘 다 ""
}
judgment: {
  verdict: "VALID" | "INVALID" | "NONE",
  targetClaimIds: string[],          // 반박·지지 대상 주장(①의 claimId). NONE이면 []
  contradiction: string,             // ③ 반박이 반박 대상의 어느 지점과 모순되는지(지지면 어떻게 따라 나오는지). NONE이면 ""
  holds: boolean                     // 모델 판단: ②가 원문과 맞다는 전제에서 ③의 모순·지지가 성립하는가
}
```

`relation` 뜻(선지 주장 대비 학생 읽기):

| 값 | 뜻 | 예(★는 설명용으로 지어낸 선지) |
|---|---|---|
| EXACT | 선지 글자 그대로(생략 복원만) | K1 "출연 때문이라고 할 수 없음" |
| BLANK_FILLED | 서술어가 요구하는 빈자리를 선지 안의 말로 채움 | K4 "법인격이 갑에게 부여됐다" |
| WEAKER | 선지보다 약하게 읽음 | ★"반드시 스스로 결정" ↔ "스스로 결정할 수 없음" |
| STRONGER | 선지보다 강하게 읽음 | ★"수익을 추구할 수 있다" ↔ "무조건 추구해야" |
| ADDED | 선지에 없는 원인·조건을 보탬 | ★"주가 하락은 배당 보류 때문" ↔ "주주 반대로 보류" |
| REVERSED | 방향을 뒤집어 읽음 | ★"소유권은 출자한 개인에게" ↔ "법인에 귀속" |
| OTHER_TARGET | 다른 대상으로 바꿈 | 주식회사 이야기로 장학 재단 선지 반박 |
| UNTOUCHED | 학생이 이 주장에 닿지 않음 | — |

### 서버 검사 (`PP/feedback-claims.ts` `validateClaims`)

구조:
- `claims[].choiceText`는 고른 선지 문장의 부분 문자열(공백 정규화). `claimId` 중복 금지.
- `readingQuote`·`cue`·`ground.quote`는 해당 observation 안의 부분 문자열(기존 `quote not in observation` 방식).
- `relation=UNTOUCHED` ⇔ `studentReading=""`·`readingQuote=null`·`blanks=[]`.
- `blanks[].candidates`의 각 말과 `chosen`은 선지 문장의 부분 문자열이고 `chosen ∈ candidates`. 빈자리가 있는 주장의 `relation`은 BLANK_FILLED(다른 읽기 차이가 함께 있으면 그 값).
- `judgment.targetClaimIds`는 ①에 있는 `claimId`이고 그 주장은 UNTOUCHED가 아니다. `verdict=NONE` ⇔ `targetClaimIds=[]`·`contradiction=""`.

재구성(claimConflicts가 비었을 때):
- **재구성 가능 ⇔ (UNTOUCHED가 아닌 주장 ≥ 1) ∧ `ground.kind≠NONE` ∧ `judgment.verdict≠NONE`.** 이때 `reconstructability=RECONSTRUCTABLE`,
  `rationaleImpliedVerdict = judgment.verdict`. 아니면 UNKNOWN. 어기면 `fail`(모델 재시도).
- claimConflicts가 있으면 지금처럼 UNKNOWN 우선(세 칸은 기록만).

빈자리 채움(합의 "빈자리 채움 개수"·"단서 조건"·"사전 확률은 정답 선택에만"):
- 반박 대상(`targetClaimIds`) 안에서 후보가 2개 이상인 빈자리(모호한 빈자리)를 센다.
- **정답 선택**: 반박 대상 주장 하나에 모호한 빈자리 ≤ 1. 모호한 빈자리에는 `cue`가 있어야 한다. 하나라도 어기면 그 주장은 "합당하지 않음"(아래 충족 판정에서 근거 부족). `fail`이 아니다.
- **오답 선택**: 모호한 빈자리를 두지 않는다(후보가 2개 이상이면 `fail`). 오답에서는 학생 쪽으로 기울여 읽지 않는다.
- 반박 대상 밖의 빈자리(K4의 '출연' 주어)는 세지 않는다.

정답 선택의 충족(SUPPORTED) — `options.correctChoice`이고 재구성 가능일 때. `contentAssessment`와 다르면 `fail`:

| 조건 | 부정 발문(목표 INVALID) | 긍정 발문(목표 VALID) |
|---|---|---|
| 반박·지지 대상 | `targetClaimIds` 중 하나라도 합당 | **UNTOUCHED가 아닌 주장 = 선지의 모든 주장**, 모두 합당 |
| 합당한 relation | EXACT · BLANK_FILLED(빈자리 규칙 통과) · WEAKER | EXACT · BLANK_FILLED(빈자리 규칙 통과) · STRONGER · ADDED |
| 근거 | `ground.kind=FACT`, 그 인용과 겹치는 studentClaims가 모두 CONSISTENT | 같음 |
| 인용 분리(D-0161 계승) | `ground.quote`와 합당 주장의 `readingQuote`가 겹치지 않음. 단 BLANK_FILLED면 `cue`가 `ground.quote`와 겹치지 않음으로 대신한다 | 같음 |
| 모순·지지 성립 | `judgment.holds=true` | 같음 |

- 모두 만족 → SUPPORTED. ERROR 조건(아래)이 없고 하나라도 어기면 → INSUFFICIENT.
- REVERSED·OTHER_TARGET 읽기는 위 표에서 합당이 아니다. 실제 처리는 3절 (e)·(f)대로 근거가 원문과 어긋나 CONTENT, 또는 TARGET 오류다.

`insufficiencyKind`(값 집합은 그대로 NONE·JUDGMENT_METHOD·MISSING_LINK):
- `ground.kind=JUDGMENT_METHOD` 또는 `CONCLUSION_RESTATED` → JUDGMENT_METHOD(D-0161 "결론 바꿔 말함"은 판단 방식과 유지). 그 밖의 INSUFFICIENT → MISSING_LINK.
- 마지막 설명 경우 나눔용으로 서버가 `insufficiencyCase`를 계산한다(저장하지 않고 마지막 설명 입력에만, 6절):
  `CONCLUSION_ONLY`(CONCLUSION_RESTATED) · `JUDGMENT_METHOD` · `READING_GAP`(합당 실패 원인이 부정 발문은 STRONGER/ADDED, 긍정 발문은 WEAKER) ·
  `BLANK_UNSUPPORTED`(빈자리 규칙 실패) · `PARTIAL_SUPPORT`(긍정 발문에서 UNTOUCHED 주장 있음) · `MISSING_LINK`(그 밖).
  여러 개면 이 순서의 앞쪽.

## 2. 사례 대입 (설계 점검, 실행 시험 기대값)

| 사례 | 학생 근거 | ① | ② | ③ | 결과 |
|---|---|---|---|---|---|
| K4 | "주식회사 법인격의 부여 대상은 단체, not 개인" | c(법인격 부여) BLANK_FILLED, 빈자리 '받는 쪽' 후보 {갑, A}→갑, cue "not 개인" | FACT "법인격의 부여 대상은 단체" | INVALID, holds | **SUPPORTED** |
| KF | "법인격은 단체에 부여됨." | 같은 주장, 모호한 빈자리 cue 없음 | FACT | INVALID | INSUFFICIENT · BLANK_UNSUPPORTED |
| K1 | "…법령 안에서 이사회나 특정 개인에게 주어지는 거라 출연 때문이라고 할 수 없음" | c(권한의 원인) EXACT | FACT | INVALID, holds | SUPPORTED |
| KC | "출연했다고 권한이 생기는 건 아님" | EXACT | CONCLUSION_RESTATED | INVALID | INSUFFICIENT · CONCLUSION_ONLY |
| (오류) | "장학재단이므로 갑 개인에게 권한 못 줌" | 닿음 | FACT, studentClaims CONTRADICTED(<보기>: A는 주식회사) | INVALID | ERROR(CONTENT), 교정 질문 |
| (불가) | "장학 재단은 비영리 법인이다" | 모두 UNTOUCHED | FACT | NONE | UNKNOWN |

KF·KC·K1·K4는 `W`의 사례 모듈(`scripts/v5-any-falsity-point-cases.mjs`)에 근거 문장이 있다. 실행 시험은 픽스처로만 만든다(모델 호출 없음).

## 3. 판정 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.3.md` (새 파일)

`P51`을 복사한 뒤 아래만 바꾼다. 바꿀 문장을 찾지 못하면 멈추고 보고한다. 아래 인용 블록은 넣을 글의 뜻을 정한 초안이다.
실행자는 **문장을 그대로 넣고**, 표현을 고치고 싶으면 멈추고 보고한다.

**(a) 1행 제목**: `v5.1` → `v5.3`.

**(b) 재구성 정의 — 64-70행 두 문단을 대체**("학생이 결론을 쓰지 않았어도," ~ "학생 근거의 오류로 다룬다."):

```
재구성은 세 칸이 모두 채워졌을 때다. ① 선지 이해: 학생 말이 선지의 대상이나 주장 하나 이상에 닿는다. ② 근거: 학생이 판단에 쓴
사실이나 이유가 있다(선지 결론을 바꿔 말한 것, 원문에 있다·없다 같은 판단 방식도 칸을 채운다). ③ 판단: 학생이 선지를 참·거짓
중 어느 쪽으로 봤는지 명시했거나, ②가 ①과 한 방향으로만 이어진다. 세 칸을 choiceReading·ground·judgment에 기록하며,
칸이 채워졌는지와 그 내용이 원문과 맞는지는 따로 본다. 원문과 어긋나는 근거도 칸은 채우고, 그 어긋남은 아래 오류로 다룬다.
선지가 여러 주장을 묶고 있으면 학생이 그중 어느 하나에만 닿아도 ①은 채워진다. 그 주장이 공식 해설이 짚은 지점일 필요는 없다.
```

**(c) 선지 이해와 빈자리 채움 — (b) 바로 뒤에 새 소절 `### 선지 이해와 합당 기준`**:

```
choiceReading.claims에는 선지 문장을 주장 단위(대상·관계·조건·원인·결과)로 나눠, 학생과 상관없이 선지 문장에서 정확히 복사한
부분을 적는다. 주장마다 학생이 그 주장을 어떤 뜻으로 읽었는지와, 선지 글자와 비교한 관계(relation)를 적는다.

빈자리 채움: 선지의 서술어가 요구하는 자리(누가, 누구에게, 무엇을)가 선지 문장에 비어 있고 학생 말이 그 자리를 전제하면, 그
자리를 선지 문장 안의 말로만 채울 수 있다. 빈자리마다 선지 안의 후보 낱말을 모두 적고 고른 말을 적는다. 후보가 하나뿐이면
그 말로 채운다. 후보가 둘 이상이면, 학생이 고른 선지가 정답일 때만 학생이 그 선지를 정답의 근거로 읽었다고 보는 쪽으로
고를 수 있고, 그때 학생 말에 그 읽기의 단서(채운 자리와 맞서는 말, 예: "not 개인")가 있어야 한다. 단서를 cue에 인용한다.
단서가 없으면 고르지 말고 단서 없음으로 둔다. 학생이 고른 선지가 오답이면 후보가 둘 이상인 빈자리를 학생 쪽으로 채우지 않는다.
이 규칙은 앞의 "학생이 밝히지 않은 핵심 관계를 정답·선지에서 가져와 학생의 이해로 인정하지 않는다"의 좁은 예외이며,
선지 이해 칸에만 쓴다. 학생의 근거나 판단을 이 방식으로 채우지 않는다.

relation: 선지 글자 그대로(생략 복원만) EXACT, 빈자리 채움 BLANK_FILLED, 선지보다 약하게 읽음 WEAKER, 강하게 읽음 STRONGER,
선지에 없는 원인·조건을 보탬 ADDED, 방향을 뒤집음 REVERSED, 다른 대상으로 바꿈 OTHER_TARGET, 닿지 않음 UNTOUCHED.
```

**(d) 충족 판단 — 130-134행 문단("공식 해설의 모든 단계나 …" ~ "…이해했다는 증거가 아니다.")을 대체**:

```
공식 해설의 모든 단계를 재현할 필요는 없다. 정답 선택의 충족은 다음 순서로 본다. 1) 반박·지지 대상(judgment.targetClaimIds)이
선지와 일치한다고 볼 수 있는가: EXACT·조건을 지킨 BLANK_FILLED는 일치다. 거짓 선지를 반박할 때 WEAKER는 반박이 선지에도
통하므로 인정하고, STRONGER·ADDED는 반박이 선지에 통하지 않으므로 인정하지 않는다. 참인 선지를 지지할 때는 거꾸로 STRONGER·ADDED는
인정하고 WEAKER는 인정하지 않는다. 2) 근거가 원문과 맞는가: 학생이 원문이나 <보기>의 사실을 말했고(ground.kind=FACT) 그 사실이
원문과 맞아야 한다. 결론을 바꿔 말한 것(CONCLUSION_RESTATED)이나 판단 방식(JUDGMENT_METHOD)은 근거 칸은 채우지만 충족이 아니다.
3) 근거가 반박 대상의 한 지점과 모순되는가(지지면 대상 전체가 따라 나오는가): judgment.contradiction에 그 지점을 좁혀 적고
holds에 성립 여부를 적는다. 거짓 선지는 틀린 지점 하나를 반박하면 충분하다. 참인 선지는 선지의 모든 주장이 지지되어야 한다.
세 단계를 모두 통과하면 SUPPORTED, 하나라도 통과하지 못하면 INSUFFICIENT다. 평가자가 원문에서 올바른 관계를 찾아낼 수
있다는 사실은 학생이 그 관계를 이해했다는 증거가 아니다.
```

**(e) 오답 선택의 선지 읽기 오류 — `### 오류 가설` 앞에 새 소절 `### 선지 읽기 오류`**:

```
학생이 오답을 골랐고, 학생 말에 선지를 읽은 뜻이 직접 드러나며 그 읽기가 선지 글자와 다르면(STRONGER·WEAKER·ADDED·REVERSED,
같은 대상의 내용을 강하게·약하게·덧붙여·빠뜨려·뒤집어 읽음), errorType READING 오류 하나를 만든다. 발문과 상관없다.
studentEvidence는 읽기가 드러난 학생 말(readingQuote), sourceEvidence는 선지 문장(location CHOICE:<choiceId>)이다.
질문은 선지에 쓰인 말과 학생의 읽기를 나란히 놓는 두 갈래 질문이다(예: "선지는 '무제한 가능하다'고 했어, '추구할 수 있다'고만 했어?").
학생이 선지를 어떻게 읽었는지 말하지 않았으면 읽기 오류를 만들지 않고 아래 오류 가설 규칙을 따른다. 다른 대상으로 바꾼 것은
읽기 오류가 아니라 대상 오류다. 정답 선택에서 드러난 읽기 차이는 오류가 아니라 충족 판단에서 다룬다.
두 번째 선택이 오답이고 읽기가 드러나면 같은 형식으로 errors에 기록하되, 질문은 화면에 나오지 않는다.
```

- (e)에 맞춰 `### 오류 가설` 82-84행의 "다음 경우에는 가설을 세우지 않고" 목록에 "학생 말에 선지 읽기가 드러나 READING 오류를 만들었다."를 더한다.

**(f) 대상 오류 명문화 — 284행 끝에 한 문장 추가**:

```
대상을 밝히지 않은 진술은 생략된 주어를 선지 대상으로 복원하는 것이 기본이며, 그 진술은 선지 대상에 대한 주장으로 원문과 대조한다.
```

**(g) `## 학생 주장 분리 기록`**:
- `keyRelationCoverage` 두 항목(278·279행)과 겹침 규칙(280행), SUPPORTED 조건(281행)을 지운다. D-0166의 "덧붙임 선지" 규칙(278행 끝 문장)은
  (d) 뒤에 "선지가 원문과 <보기>에 근거 없는 내용을 덧붙여 틀렸으면, 그 덧붙인 내용이 반박 대상이고 '그 근거가 원문과 <보기>에 없음'이 근거다."로 옮긴다.
- `sourceCheck` 값에 `CHOICE_READING`을 더한다: "학생이 선지가 무슨 말을 하는지 말한 주장(선지 읽기)은 원문과 대조하지 않고 CHOICE_READING이다."
- 285행 오류 대응 규칙에 "READING 오류는 READING이 아닌 relation의 choiceReading 주장(readingQuote)에 대응하고, 오답 선택에서만 만든다"를 더한다.
- 세 칸을 기록하는 순서: claimConflicts → choiceReading → ground → judgment → studentClaims → 판정 칸.

**(h) REPAIR — 201-207행 `rationaleSufficient` 문단 앞부분**: "`rationaleSufficient`는 선지의 참·거짓을 가르는 핵심 관계가 …때만 true다."를
"`rationaleSufficient`는 SELECTION의 충족 판단(선지 이해의 합당 기준·근거·모순 또는 지지)을 처음 근거와 교정 답 전체에 적용해 통과할 때만 true다.
선지 이해는 여러 발화에서 재구성할 수 있지만, 반박·지지 근거와 그 연결은 학생 발화 한 곳에 들어 있어야 한다."로 바꾼다. 뒤 문장(발화 한 곳 인용,
보기 하나 고른 답은 관계가 아님, 오류 발화 인용 금지)은 그대로. "핵심 관계"는 "그 관계"로.

**(i) REPAIR 수정 판정 목록(173행 뒤)에 한 줄**: "- 읽기 오류(errorType READING)는 학생이 선지에 실제로 쓰인 말을 고르거나 그대로 말하면 REPAIRED다."

바꾼 뒤 `diff P51 v5.3.md`가 (a)~(i)뿐이어야 한다.

## 4. 코드

### `PP/feedback-claims.ts`
- `extendedSelectionSchema`: `claimConflicts` 다음에 `choiceReading`·`ground`·`judgment`(1절 스키마, strict, 모든 칸 required, null 허용 칸은 `anyOf`)를 넣고
  `keyRelationCoverage`를 뺀다. `studentClaims.sourceCheck` enum에 `CHOICE_READING`.
- `validateClaims(assessment, observations, options)`: options를 `{ correctChoice: boolean; targetVerdict: 'VALID' | 'INVALID'; choiceText: string }`로 넓히고 1절 검사를 넣는다.
  `keyRelationCoverage` 검사는 지운다. READING 오류 ↔ choiceReading 주장 대응, 정답 선택에 READING 오류 금지.
- `validateClaims` 위 주석 한 줄: `// Three cells decide reconstructability; correct-choice sufficiency is checked from them (supersedes D-0161).`

### `PP/feedback.ts`
- `ErrorSchema`·`newErrors`의 `errorType` enum에 `'READING'`.
- `applyFeedbackAssessment`: 오류 순서 TARGET → READING → CONTENT. `selection-mismatch` 추가 조건 `!TARGET`은 그대로(READING이 있으면 결론이 선지의 다른 읽기를 두고 낸 것이므로
  **mismatch 질문도 붙이지 않는다** — 확정 판단 3).
- 두 번째 오답 선택(`RESELECTION_WRONG`)은 지금처럼 바로 종료한다. assessment는 `s.assessments`에 남으므로 READING 기록은 거기서 읽는다.
- `validateFeedbackAssessment`: READING 오류는 오답 선택에서만(정답이면 throw). 첫 선택에서만 질문 검사(기존 그대로).
- `validateClaims` 호출부(`PP/feedback-evaluator.ts`)에 `targetVerdict: s.choiceImpliedVerdict`(정답 선택 기준)·선지 문장을 넘긴다. 이 값의 뜻이 코드와 다르면 멈추고 보고.
- 세 칸은 지금 `studentClaims`처럼 판정 뒤 떼어 내되, 마지막 설명에 필요한 요약(`insufficiencyCase`, 학생 읽기 문장, 합당 실패 원인)은
  `FeedbackSelectionAssessmentSchema`에 optional 칸 `readingSummary`로 남긴다: `{ insufficiencyCase: string | null, readings: [{ choiceText, studentReading, relation }] }`.
  옛 기록과 호환되도록 optional.

### `PP/feedback-evaluator.ts`
- 지시문 경로 `…-v5.3.md`, `promptVersion: 'problem-feedback-v5.3'`.

### `PP/feedback-end-explanation.ts` (마지막 설명)
`W`에서 글자 그대로 가져온다(`git show 90dacd2:PP/feedback-end-explanation.ts`로 확인):
- **E1** 두 벌 `answer:` 항목(원문 흐름, 공식 해설 뼈대 금지, 학생이 짚은 지점부터).
- **E5** 두 벌 `answer:` 끝 "바로 앞 문장을 같은 연결어(…)로 시작하지 않는다."
- **E2 대체**: `W`의 `studentChoiceReading` 4단계 문단 대신, 입력 `insufficiencyCase`·`readings`로 경우별 문단을 쓴다.

| insufficiencyCase | 근거 부족 칸에 쓸 것 |
|---|---|
| READING_GAP | `W` 4단계 그대로(학생 읽기 풀어 보이기 → 무리 없으면 인정 → 선지에 쓰인 부분 인용·학생이 보탠/강하게 읽은 부분 짚기 → 원문으로 틀린 지점) |
| CONCLUSION_ONLY | "방향은 맞지만 원문의 어떤 사실 때문인지가 빠졌어" 뒤 answer에서 그 사실을 원문으로 |
| JUDGMENT_METHOD | v5.1 판단 방식 문단 그대로 |
| PARTIAL_SUPPORT | "확인한 부분은 맞아, 선지의 나머지 '…'도 원문으로 확인해야 해" |
| BLANK_UNSUPPORTED | 학생 말이 원문과 맞음을 인정 → "아마 ②를 '…'는 말로 읽은 것 같은데, 그렇다면 바로 그 점에서 ②가 틀린 거야" (KF 합의 문구) |
| MISSING_LINK | v5.1 문단 그대로 |

- 오답 쪽(`INCORRECT_END_INSTRUCTIONS` firstChoice·reselection): "errors에 READING이 있으면 선지에 쓰인 말과 학생 읽기의 차이를 짚는다(두 번째 선택은
  질문 없이 기록된 것이므로 여기서 처음 짚는다)." 입력에 두 번째 선택 assessment의 READING 오류를 `reselectionReadingErrors`로 넣는다.
- 긍정 발문 오답의 오류 가설 없는 종료(합의 (가))에는 "학생 근거의 맞는 부분을 인정한 뒤 선지의 틀린 지점까지 원문으로 잇는다"를 firstChoice 규칙에 더한다.
- **E4** `PP/feedback.ts` `applyFeedbackEndExplanation`의 첫 문장 반복 검사(`W` diff 그대로).

### `PA/server/problem-feedback.ts`
- **E3** CORRECT_UNVERIFIED 첫 안내 분기(`W` diff 그대로): 재구성 가능이면 "네 근거에서 맞는 부분은 살리고, 더 이어야 할 연결을 같이 채워 볼게."

### `scripts/run-v5-live-check.mjs`
- 지시문 고정 목록의 `v5.1.md` → `v5.3.md`, errorType 집계에 READING. 다른 동작 그대로.

### 시험 (`PP/feedback.test.ts` 등)
- 기존 픽스처의 `keyRelationCoverage`를 세 칸으로 바꾼다. 문서 밖 시험 파일 픽스처도 **세 칸으로 바꾸는 것만** 허용, 그 밖이면 멈추고 보고.
- 추가 시험(`validateClaims`·`applyFeedbackAssessment` 직접 호출):
  1. 2절 표 여섯 사례의 기대 결과(재구성·contentAssessment·insufficiencyCase).
  2. 빈자리: 후보가 선지 밖 낱말 → fail. 모호한 빈자리 2개(같은 반박 대상) → INSUFFICIENT(BLANK_UNSUPPORTED). 오답 선택의 모호한 빈자리 → fail.
  3. 부정 발문 WEAKER → SUPPORTED, STRONGER·ADDED → INSUFFICIENT(READING_GAP). 긍정 발문 WEAKER → INSUFFICIENT(READING_GAP), STRONGER·ADDED → SUPPORTED, UNTOUCHED 주장 남음 → PARTIAL_SUPPORT.
  4. 인용 분리: ground.quote와 readingQuote가 겹치면 SUPPORTED 실패. BLANK_FILLED는 cue로 대신.
  5. READING: 오답 첫 선택 → 교정 질문 진입, 순서 TARGET→READING→CONTENT, mismatch 질문 없음. 정답 선택의 READING → throw. 두 번째 오답의 READING → 종료 + assessment에 남음 + 마지막 설명 입력 `reselectionReadingErrors`.
  6. REPAIR 스키마가 newErrors READING을 받는다.
  7. 요청 스키마에 `keyRelationCoverage`가 없고 세 칸이 required.
  8. 마지막 설명 지시문 문자열: E1 "그 문장 순서나 뼈대를 따라 쓰지 않는다", E5 연결어 문장, insufficiencyCase 여섯 값 각각의 문단.
  9. E3·E4는 `W`의 시험(`git show 90dacd2 -- PA/server/problem-feedback.test.ts`, `PP/feedback.test.ts` 해당 부분)을 가져온다.

## 완료 조건

- [ ] `diff P51 v5.3.md`가 3절 (a)~(i)뿐.
- [ ] `grep -n "v5.1" PP/feedback-evaluator.ts scripts/run-v5-live-check.mjs` 0줄. `grep -rn keyRelationCoverage PP --include=*.ts`가 시험 밖 0줄.
- [ ] 4절 추가 시험 모두 통과.
- [ ] `npm run build` 통과 뒤 `npm test` 통과. 실패가 기존 2건(`boundary.test.ts` node:fs, `axis-architecture-experiment.test.ts` `.omc` 파일)뿐이면 이름과 메시지 보고.
- [ ] 외부 API 호출·커밋·`git stash` 없음. 이 문서에 적은 파일과 허용한 픽스처 밖 수정 없음.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 지시문 초안 문장이 기존 문장과 모순되면(특히 21-31행 "복원하지 않는다" 규칙) 고치지 말고 보고한다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.

## 2단계: 실모델 확인과 회귀 (코드 에이전트, 사용자 승인 뒤)

- 사례 준비(코드 에이전트, 전송 없음): 과잉 인정(강하게 읽음·원인 보탬·모호한 빈자리 2개), 긍정 발문 정답(일부/전체 지지), 오답(읽기 오류 부정·긍정 발문,
  대상 오류, 내용 오류, 오류 가설 경로)을 **실제 문항**에서 고른다. 지어낸 선지(★)는 쓰지 않는다. 고른 목록을 승인 요청에 적는다.
- 부정 발문 정답: K4·K1·도파민 DA(충족 기대), KC·KF(근거 부족 기대).
- 회귀: 10-26 18세션(`docs/experiments/v5-diverse-48-regression-2026-10-26/`) v5.1 출력을 기준 조건으로 재활용(D-0168). 새 조건만 생성.
  재활용 근거(같은 사례·모델, 지시문·스키마·마지막 설명만 다름)를 승인 요청에 적는다.
- 사례당 3회, 정답 luna·오답 sol. 정확성은 코드 에이전트(긴 출력 검토는 하위 에이전트 opus), 이해 용이성은 사용자. 비용 대략 $1~2, 보낼 세션 수와 함께 승인.
- 판정 초점: (1) 기대 결과와 일치, (2) 과잉 인정(모호한 빈자리를 단서 없이 채움, WEAKER/STRONGER 오분류), (3) 18세션 결과 변화가 이번 원리로 설명되는가,
  (4) "모호한 빈자리 1개까지"로 떨어진 사례를 따로 기록(합의: 실제로 합당한 읽기였으면 완화).

## 확정한 설계 판단 (2026-10-27 사용자 "권고대로 네 가지 모두 진행해줘")

1. **긍정 발문 정답의 ADDED**(선지에 없는 원인을 보태 지지): 인정(보탠 읽기가 참이면 선지도 따라 나오므로 STRONGER와 같다).
2. **D-0161(`keyRelationCoverage`) 대체**: 세 칸이 같은 일을 한다(원문 사실 인용 필수 = ground FACT, 결론 반복 불인정, 인용 분리 = ground/readingQuote 분리,
   긍정 전체 지지 = UNTOUCHED 없음). 대체한다. 남기면 같은 판단을 두 칸이 따로 내려 서로 어긋날 수 있다.
3. **READING이 있을 때 선택 충돌 질문 생략**: 대상 오류와 같은 이유(학생 결론은 다른 읽기를 두고 낸 것). 생략한다.
4. **결정 기록 번호**(코드 에이전트가 기록): D-0178은 보관된 v5.2 「부분 반박 근거 판정 (v5.2)」에 남기고(미채택·보관으로 기록), 이 설계는 2단계 뒤 새 번호(D-0180)로. (실제 번호는 D-0182: D-0180·D-0181을 다른 기록이 먼저 씀.)
   지시문 버전은 v5.2가 보관분에 쓰였으므로 v5.3.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 새 파일 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.3.md` (P51 복사 뒤 3절 (a)~(i) 적용)
  - `packages/pipeline/src/problem-solving/feedback-claims.ts`, `feedback.ts`, `feedback-evaluator.ts`, `feedback-end-explanation.ts`
  - `packages/app/src/server/problem-feedback.ts` (E3), `scripts/run-v5-live-check.mjs`
  - 시험: `packages/pipeline/src/problem-solving/feedback.test.ts`, `packages/app/src/server/problem-feedback.test.ts`
- 테스트 결과: `npm run build` 통과. `npm test` 1413 통과, 2 실패(기존 2건만).
  - `packages/app/src/boundary.test.ts` 「다른 서버 파일은 node:fs를 import 하지 않는다」: `expected [ 'server/student-state.ts' ] to deeply equal []`
  - `packages/pipeline/src/cli/axis-architecture-experiment.test.ts` 「reuses the analysis stage but not prior axes or roles」: `ENOENT ... .omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/hegel-aesthetics-absolute-spirit-p1.json`
  - `feedback.test.ts`는 228개 모두 통과(추가 시험 26개).
- 남은 문제(설계 판단 또는 확인이 필요한 곳, 임의로 정한 것은 아래에 밝힘):
  1. 지시문 v5.1 135행("정답 선택에서 이 판단은 `keyRelationCoverage`의 조각별 학생 인용으로 기록한다.")은 (d)가 대체하는 130-134행 밖이라 문서에 처리 지시가 없었다. 요청 스키마에서 이 필드가 빠지므로 지워서 v5.3에 넣었다. 그래서 `diff`는 (a)~(i)에 이 한 줄 삭제가 더해진다.
  2. 지시문 v5.3의 "errors에 TARGET 오류가 있으면 selectionMismatchQuestion은 null이다"(v5.1 286행)는 READING에 확장되지 않았다(문서 (e)·(g)에 지시 없음). 코드는 확정 판단 3대로 READING이 있으면 선택 충돌 질문을 만들지도 요구하지도 않으므로, 지시문과 코드 사이에 작은 어긋남이 있다. 모델이 READING 오류와 함께 질문을 적어도 코드는 무시한다.
  3. 지시문 "재구성 가능한 근거에서 오류는 CONTRADICTED 또는 OFF_TARGET 주장에서만 만든다"(v5.1 285행)와 READING 오류(studentClaims가 아니라 choiceReading에 대응)가 문면상 어긋난다. (g)의 추가 문장으로 READING 대응은 적었지만 앞 문장은 그대로 뒀다.
  4. 세 칸 기록 순서 문장(g)은 그대로 넣었으나, 요청 스키마의 `studentClaims`는 v5.1처럼 판정 칸들 뒤에 있다(기존 시험이 참조 스크립트와 속성 순서를 비교하므로 옮기지 않음). 지시문이 말하는 순서(studentClaims가 판정 칸 앞)와 스키마 순서가 다르다. v5.1부터 있던 어긋남이다.
  5. 문서가 정하지 않아 제가 정한 서버 검사 세부(검토 요망):
     - `judgment.verdict`가 `targetVerdict`와 다른 방향이면 충족/부족 일치 검사를 하지 않는다(v5.1처럼 선택 충돌 흐름이 다룸).
     - `READING` 오류는 `basis=STATED`만 허용. 오답 선택에서 후보 2개 이상 빈자리는 반박 대상 밖이어도 `fail`(문서 "오답 선택: 모호한 빈자리를 두지 않는다" 그대로).
     - 정답 선택의 `insufficiencyKind`도 `ground.kind`에서 계산해 다르면 `fail`(JUDGMENT_METHOD·CONCLUSION_RESTATED는 JUDGMENT_METHOD, 그 밖은 MISSING_LINK).
     - 긍정 발문의 합당 판정은 선지의 모든 주장(UNTOUCHED 없음)이 합당이어야 하고 `targetClaimIds`는 쓰지 않는다. `BLANK_FILLED`의 인용 분리는 cue 기준(cue가 없으면 통과).
     - `ground`와 겹치는 `studentClaims`가 하나도 없는 경우는 "모두 CONSISTENT"가 비어 있는 참으로 통과한다.
  6. 마지막 설명 `CORRECT_UNVERIFIED` 경우별 문단(READING_GAP 외 다섯 경우)과 오답 쪽 READING·긍정 발문 문장의 정확한 표현은 문서가 표의 뜻만 정했으므로 제가 썼다. READING_GAP은 `W`의 4단계 문장을 그대로 옮겼고, JUDGMENT_METHOD·MISSING_LINK는 v5.1 문장을 그대로 썼다. BLANK_UNSUPPORTED는 KF 합의 문구를 넣고 "짐작이라고 밝히고 단정하지 않는다"를 더했다. 표현 검토가 필요하다.
  7. `scripts/run-v5-live-check.mjs`에는 errorType 집계가 없어, 대신 `NO_HIGHLIGHT` 검사의 TARGET 예외에 READING을 함께 넣었다(선지 문장만 근거인 READING 질문이 하이라이트 없이 위반으로 잡히지 않도록).
  8. 요청 스키마 `extendedSelectionSchema`는 세션에 남기는 `readingSummary`(선택 칸)를 모델 요청에서 뺀다(strict 모드는 모든 속성이 required여야 하므로). 마지막 설명 입력에는 `errors[].errorType`을 추가했다.
  9. `packages/app/dist-client/`는 이 작업 전부터 있던 미추적 폴더이며 건드리지 않았다.

## 코드 에이전트 diff 검토 (2026-10-27)

- 실행자 보고 항목 1(135행 `keyRelationCoverage` 문장 삭제), 7(live-check의 NO_HIGHLIGHT 예외에 READING), 8(`readingSummary`는 서버만 씀, 마지막 설명 `errors[]`에 `errorType`) 수용.
- 수정 1: 실행자 보고 항목 5의 "BLANK_FILLED는 cue가 없으면 분리 검사 통과"를 고쳤다. 모호한 빈자리의 cue가 있으면 cue로, 없으면 `readingQuote`로 근거 인용과의 분리를 본다.
- 수정 2: 같은 항목의 "근거와 겹치는 studentClaims가 없으면 통과"를 고쳤다. 겹치는 주장이 하나 이상이고 모두 CONSISTENT여야 충족.
- 수정 3: 지시문 v5.3의 오류 대응 규칙과 선택 충돌 질문 규칙에 READING을 넣었다(항목 2·3). 그래서 `diff P51 v5.3.md`는 (a)~(i)와 이 두 문장 수정이다.
- 유지: 항목 4(스키마에서 studentClaims가 판정 칸 뒤)는 v5.1부터의 어긋남이라 그대로 둔다. 항목 5의 나머지(방향이 다른 judgment는 충족 검사 생략 → 선택 충돌 흐름, READING은 STATED만, insufficiencyKind는 ground에서 계산, 긍정 발문은 모든 주장 합당)는 설계와 맞다.
- 시험 2개 추가(유일 빈자리의 분리, 근거와 겹치는 주장 없음). `feedback.test.ts` 230 통과, 전체 1417 중 1415 통과, 실패 2건은 기존(`boundary.test.ts` node:fs, `axis-architecture-experiment.test.ts` `.omc` 파일).
- 사용자 판정 필요: 마지막 설명의 새 경우별 문단(CONCLUSION_ONLY·PARTIAL_SUPPORT·BLANK_UNSUPPORTED, 오답 쪽 READING·긍정 발문 문장) 표현은 실행자가 썼다. 2단계 실측 원문으로 이해 용이성을 판정받는다.

## 3단계: 서버 결론 확정과 형식 정규화 (v5.3 보강, 2026-10-27)

- 근거: 2단계 실측 [보고](../experiments/v53-three-cell-check-2026-10-27/REPORT-human.md)(형식 실패 사례 14/45·회귀 7/16). 사용자 결정 2026-10-27:
  "권고대로 (가)로 진행해줘"(서버가 결론 확정), "권고대로 ①로 진행해줘"(인용 분리 규칙 제거).
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출·커밋·`git stash` 금지. 재실행(63세션)은 코드 에이전트가 사용자 승인 뒤.
- 지시문 파일 이름·`promptVersion`은 v5.3 그대로 둔다(아직 운영 전, 실패 실행의 지시문은 커밋 `0348d5e`에 남아 있음).

### S1. 정규화 `normalizeCells(assessment, options)` (`PP/feedback-claims.ts`, 새 export)

`validateClaims` 전에 SELECTION 출력에 적용한다. 원본을 바꾸지 않고 새 객체를 돌려주며, 바꾼 항목을 짧은 영어 문장 목록(`notes`)으로 함께 돌려준다.

1. `relation=UNTOUCHED` 주장: `studentReading=""`, `readingQuote=null`, `blanks=[]`로 비운다.
2. `judgment.targetClaimIds`: 중복을 없애고 UNTOUCHED이거나 없는 claimId를 뺀다. `verdict≠NONE`인데 남은 대상이 없으면
   `verdict=NONE`, `contradiction=""`, `holds=false`. `verdict=NONE`이면 `targetClaimIds=[]`, `contradiction=""`.
3. `ground.kind=NONE`: `observationId=""`, `quote=""`.
4. 정답 선택(`options.correctChoice`): `errors`에서 `errorType=READING`을 지운다(읽기는 choiceReading에 남아 충족 판단에 쓰인다).

### S2. 서버 결론 확정 (claimConflicts가 비고 `boundary=NONE`일 때, 정규화 뒤)

`derived = (UNTOUCHED가 아닌 주장 ≥ 1) ∧ ground.kind≠NONE ∧ judgment.verdict≠NONE`.

| 경우 | 처리 |
|---|---|
| derived 참, 모델 RECONSTRUCTABLE | `rationaleImpliedVerdict = judgment.verdict`로 덮어쓴다(지금은 다르면 fail). |
| derived 거짓, 모델 RECONSTRUCTABLE, `errors` 비어 있음 | `reconstructability=UNKNOWN`, `rationaleImpliedVerdict=UNKNOWN`, `contentAssessment=UNKNOWN`, `insufficiencyKind=NONE`, `errorHypothesis=null`, `selectionMismatchQuestion=null` |
| derived 거짓, 모델 RECONSTRUCTABLE, `errors` 있음 | fail(지금처럼 재요청) |
| derived 참, 모델 UNKNOWN, 정답 선택 | `reconstructability=RECONSTRUCTABLE`, `rationaleImpliedVerdict=judgment.verdict`. `contentAssessment`는 아래 줄로 정한다. `reconstructedPath`가 비면 `[judgment.contradiction]`으로 채운다. `studentEvidence`가 비면 `[ground의 {observationId, quote}]`. `sourceEvidence`가 비면 fail |
| derived 참, 모델 UNKNOWN, 오답 선택 | fail(지금처럼). 오류 내용을 서버가 정할 수 없다. |
| 정답 선택, RECONSTRUCTABLE, `judgment.verdict = targetVerdict`, `errors` 비어 있음 | `readingJudgment` 결과로 `contentAssessment`(SUPPORTED/INSUFFICIENT)와 `insufficiencyKind`(SUPPORTED면 NONE)를 덮어쓴다. 모델이 ERROR라고 했어도 errors가 비면 같다. |

- 지금 fail하는 다음 검사는 위 덮어쓰기로 바뀐다: `reconstructability must follow the three cells`(UNKNOWN↔RECONSTRUCTABLE 중 위 표가 처리하는 경우),
  `rationaleImpliedVerdict must equal judgment.verdict`, `SUPPORTED requires…`/`three cells support…`, `insufficiencyKind must be …`.
  그 밖의 구조 검사(인용이 발화에 없음, choiceText가 선지에 없음, 빈자리 구조, READING 오류 대응, CONTRADICTED·OFF_TARGET 대응 등)는 그대로 fail.
- 순서: 정규화 → 확정 → `validateClaims`(남은 구조 검사) → 기존 `validateFeedbackAssessment`. 확정 결과가 `validateFeedbackAssessment`에서 걸리면
  고치지 말고 멈추고 보고한다.

### S3. 인용 분리 규칙 제거 (D-0161 계승분 폐기)

- `readingJudgment`에서 `separated`(readingQuote·cue와 ground 인용의 겹침 검사)를 뺀다. 충족 = ground FACT ∧ ground와 겹치는 studentClaims ≥ 1이고 모두 CONSISTENT ∧ 대상 주장 합당(relation·빈자리 규칙) ∧ `holds`.
- 결론 반복을 막는 일은 `ground.kind`가 맡는다. 지시문 v5.3 158행 문장 뒤에 한 문장을 더한다:
  "학생 말이 선지 주장을 부정하거나 되풀이할 뿐 원문이나 <보기>의 다른 사실을 담지 않으면 ground.kind는 FACT가 아니라 CONCLUSION_RESTATED다."
- `insufficiencyCase` 계산은 그대로(분리 실패를 원인으로 하는 경우는 원래 없음).

### S4. 기록

- 평가기(`PP/feedback-evaluator.ts`)는 정규화·확정으로 바뀐 항목(`notes`)을 그 시도 기록에 `normalized: string[]`로 남긴다(`attempts[]` 항목 타입에 선택 필드 추가). 바뀐 것이 없으면 빈 배열.
- 저장되는 판정(`readingSummary` 포함)은 확정 뒤 값으로 만든다.

### S5. 시험 (`PP/feedback.test.ts`)

- 2단계 실측의 실패 출력을 픽스처로 옮긴다(응답 원문은 `docs/experiments/v53-three-cell-check-2026-10-27/cases/*.json`의 `attempts[].rawOutput`, 회귀는 `../v5-diverse-48-regression-2026-10-27-v53/`). 최소:
  1. UNTOUCHED에 설명 글(회귀 C-CT 1차) → 비워지고 통과, notes 기록.
  2. 대상이 UNTOUCHED뿐(C-CT 2차) → verdict NONE·UNKNOWN으로 확정, 통과.
  3. QF-r2 1차(한 문장 근거, 인용 겹침) → SUPPORTED.
  4. DA-r2 1차 → SUPPORTED.
  5. XA-r1(정답 선택의 READING 오류, ADDED) → READING 지워지고 INSUFFICIENT·READING_GAP.
  6. KC-r1(CONCLUSION_RESTATED) → INSUFFICIENT·CONCLUSION_ONLY 유지.
  7. 오답 선택에서 derived와 모델 재구성이 다르고 errors 있음 → 여전히 fail.
- 1단계의 인용 분리 시험(4절 4번, 분리 관련 두 개)은 새 규칙에 맞게 기대값을 바꾼다. 그 밖의 기존 시험 기대값을 바꿔야 하면 멈추고 보고.

### 완료 조건

- [ ] `npm run build` 통과, `npm test` 실패가 기존 2건(`boundary.test.ts` node:fs, `axis-architecture-experiment.test.ts` `.omc` 파일)뿐.
- [ ] S5 시험 통과. `git diff --stat`이 `PP/feedback-claims.ts`·`PP/feedback-evaluator.ts`·지시문 v5.3·`PP/feedback.test.ts`(필요하면 `PP/feedback.ts` 타입)뿐.
- [ ] 외부 API 호출·커밋·`git stash` 없음.
- 결과 보고는 아래 "3단계 결과 보고" 절에 적는다(변경 파일, 시험 결과, 임의로 정한 것).

## 3단계 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/pipeline/src/problem-solving/feedback-claims.ts`: `normalizeCells`(S1), `settleConclusion`(S2) 새 export, `readingJudgment`에서 인용 분리(`separated`, `Ref`) 제거(S3).
  - `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: 정규화 → 확정 → `validateClaims` → 떼어 내기 순서로 연결, 시도 항목에 선택 필드 `normalized?: string[]`(S4). 저장 판정과 `readingSummary`는 확정 뒤 값.
  - `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.3.md`: 2) 근거 문단 끝에 CONCLUSION_RESTATED 문장 한 줄 추가(S3).
  - `packages/pipeline/src/problem-solving/feedback.test.ts`: S5 시험과 기대값 조정. `feedback.ts`는 수정하지 않음(시도 타입은 평가기 파일에 있음).
- 시험 결과: `npm run build` 통과. `npm test` 1428개 중 1426 통과, 2 실패(기존 2건만).
  - `packages/app/src/boundary.test.ts` 「다른 서버 파일은 node:fs를 import 하지 않는다」: `expected [ 'server/student-state.ts' ] to deeply equal []`
  - `packages/pipeline/src/cli/axis-architecture-experiment.test.ts` 「reuses the analysis stage but not prior axes or roles」: `ENOENT ... .omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/hegel-aesthetics-absolute-spirit-p1.json`
  - `feedback.test.ts` 241개 모두 통과(1단계 후 230 → 241).
- S5 시험: 항목 1~7 모두 추가(`describe('server settles the conclusion from the three cells (v5.3 stage 3)')`). 픽스처는 저장 원문에서 필요한 칸만 줄여 시험 파일에 넣었다(docs를 읽지 않음). 추가로 서버 덮어쓰기(3b: 모델 SUPPORTED·ERROR·verdict 어긋남), 모델 UNKNOWN 재구성(3c), 평가기가 `normalized`를 기록하는지(평가기 통합) 시험.
- 임의로 정하거나 문서와 달랐던 것(검토 요망):
  1. **S5 허용 밖 기존 시험 기대값 변경 2건**(S2/S3의 직접 결과라 최소로만 바꿨다. 되돌리길 원하면 알려 달라).
     - `passes the last choice correctness to the sufficiency check: correct=true`(모델이 SUPPORTED + `holds=false`를 내면 재요청 2회를 기대): S2로 서버가 INSUFFICIENT로 덮어쓰므로 요청 1회 + `normalized` 기록 + 확정 값 확인으로 바꾸고 이름을 「the server settles sufficiency from the cells instead of retrying」로 고쳤다.
     - 「positive stem: every claim … PARTIAL_SUPPORT」의 두 번째 단언: 기대값 `MISSING_LINK`은 그대로 두고, 이전에 인용 분리 실패로 만들던 MISSING_LINK을 `holds=false`로 만들도록 픽스처만 바꿨다.
  2. 인용 분리 시험 세 개(`quote separation`)는 S3대로 「분리 없이 SUPPORTED」로 기대값을 바꿨다(이름도 변경).
  3. S5 5번의 XA-r1은 1차 시도 원문이 `ground.quote` 끝에 마침표가 붙어 발화에 없는 인용이라(구조 검사에서 걸림) **2차 시도 원문**을 줄여 썼다. 2차에는 UNTOUCHED 주장에 "언급하지 않음"이 있어 S1 1·4가 함께 시험된다. S5 1번은 C-CT 1차, 2번은 C-CT 2차 시도.
  4. S1·S2를 `normalizeCells`와 별도 export `settleConclusion(assessment, observations, options)`로 나눴다(S2가 구조 검사를 거친 뒤에만 동작해야 해서 observations를 받는다). 구조가 어긋난 출력(예: 후보가 선지 밖, 오답 선택의 모호한 빈자리)은 S2가 건드리지 않고 `validateClaims`가 기존 메시지로 fail시킨다.
  5. S2에서 문서가 정하지 않은 경우: (가) 정답 선택·모델 UNKNOWN·derived 참이지만 `judgment.verdict ≠ targetVerdict`이거나 `errors`가 비어 있지 않으면 `contentAssessment`는 모델 값 그대로 둔다(→ 이어지는 `validateFeedbackAssessment`가 어긋나면 재요청). (나) derived 참 + 모델 RECONSTRUCTABLE이면 `rationaleImpliedVerdict`만 덮어쓰고 나머지는 4번째 줄 규칙이 맞을 때만 덮어쓴다. (다) UNKNOWN으로 내릴 때 `reconstructedPath`·`studentEvidence`는 비우지 않는다. (라) `holds`는 verdict가 NONE이 될 때만 `false`로 바꾼다.
  6. `validateClaims`의 `reconstructability must follow the three cells`·`rationaleImpliedVerdict must equal …`·`SUPPORTED requires …`·`insufficiencyKind must be …` 검사는 그대로 두었다. 확정 뒤에는 위 표가 처리하지 않는 경우(오답 선택의 불일치 등)에서만 걸린다.
  7. `validateFeedbackAssessment`에서 확정 결과가 걸린 경우는 시험에서 만나지 않았다(멈춤 조건에 해당하는 충돌 없음).
- 지시문 v5.3: 3단계 한 문장 외 변경 없음. 외부 API 호출·커밋·`git stash` 없음.

## 3단계 코드 에이전트 diff 검토 (2026-10-27)

- S1~S4는 설계와 맞다. 실행자가 바꾼 기존 시험 2건(정답 선택의 SUPPORTED+holds=false가 재요청 대신 INSUFFICIENT로 덮어써짐, PARTIAL_SUPPORT 픽스처의 실패 원인 교체)은 (가)에서 바로 따라 나오는 결과라 수용했다.
- 추가 1: 모델이 UNKNOWN이고 세 칸도 비었는데 결론·부족 종류를 남긴 출력(2단계 K4-r2·KF-r2·KF-r3)이 정리되지 않아 `validateFeedbackAssessment`에서 실패했다. `settleConclusion`에서 `rationaleImpliedVerdict=UNKNOWN`·`contentAssessment=UNKNOWN`·`insufficiencyKind=NONE`으로 정리하고 시험 1개를 더했다.
- 오프라인 재생(외부 호출 없음): 2단계에 저장된 판정 시도 93건을 새 검사에 통과시켰다. 예전 실패 52건 중 46건이 통과했고, 남은 6건은 실제 구조 위반이다(인용이 발화에 없음, choiceText가 선지에 없음, CONTRADICTED 대응 누락, 재구성 불일치에 오류 동반). `validateFeedbackAssessment`·결론 감사는 재생하지 않아, 이 수치는 상한이다.
- 재생 결론: QF·DA·K1은 SUPPORTED, XA·XS·KF는 INSUFFICIENT, K4는 SUPPORTED 없음(빈자리 미사용 그대로), KC-r3 1차는 ground를 FACT로 잘못 분류해 SUPPORTED(①의 예상 위험).
- 시험: `feedback.test.ts` 242 통과. 전체 1429 중 1427 통과, 실패 2건은 기존(`boundary.test.ts` node:fs, `axis-architecture-experiment.test.ts` `.omc` 파일).
