# 구현 인계: 결과 화면 맨 위 요약 = 문장 읽기 습관 (2026-11-19, 웹 스레드)

근거: `docs/experiments/reading-error-2026-11-18/` (PROMPT-v2.3.md, GRADE-v2.3.md). 가상 학생 7명 × 3회에서 생성 7/7이 정답표와 맞았다.
설계 배경: `docs/handoffs/2026-11-17-diagnostic-result-solve-section-design.md` 8절·14절.

## 0. 한 줄 요약

학생이 문제 풀이 근거에서 **문장 하나를 같은 방식으로 두 번 이상 잘못 읽었으면**, 결과 화면 맨 위에 그 습관 하나를 형식(원래 문장 형식 → 네가 읽은 형식)으로 보여 준다. 그렇지 않거나 검토가 통과하지 않으면 지금처럼 "가장 먼저 볼 것" 상자를 보여 준다.

## 1. 확정 사항 (Ghootae)

- 입력은 문제 풀이 근거만. 문단 요약 자료는 넣지 않는다.
- 대상은 문장 하나를 잘못 읽은 근거만. 지문 밖 상식(`OUTSIDE_KNOWLEDGE`)과 입장 주인 착각(`ATTRIBUTION`)은 다루지 않는다.
- 같은 종류가 서로 다른 문항 1개뿐이면 습관을 보이지 않는다.
- 범주 이름은 내부용이다. 학생 화면에는 `kind`, 태그 이름을 쓰지 않는다.
- 말투: 사례 2개면 사실만("…한 곳이 두 번 있었어"), 3개 이상이면 "종합적으로 보면 …경향이 있어", 반례가 있으면 "…한 경우가 여러 번 있었어". 이 말투는 지시문이 만든다.
- 첫째 습관만 자세히. 둘째 습관은 한 줄과 문항 링크. 셋째부터 숨김.
- **(2026-11-19) 검토가 FAIL이면 습관을 숨긴다.** 틀린 습관을 보여 주는 해가 아무것도 안 보여 주는 해보다 크다.

## 2. 서버

### 2-1. 지시문

- `docs/experiments/reading-error-2026-11-18/PROMPT-v2.3.md`를 그대로 읽는다(사고 진단이 `docs/experiments/thought-diagnosis-v01-2026-10-10/prompts.json`을 읽는 방식과 같게). 상수로 경로·버전 `READING_HABIT_PROMPT_VERSION = 'v2.3'`을 둔다.
- 파일을 `\n---\n`로 나눠 앞이 생성, 뒤가 검토다(`run-one.mjs`와 같음). 각 부분에 `(생성)`, `(검토)`가 없으면 시작 시 오류.
- 모델·설정은 실험과 같게: `THOUGHT_DIAGNOSIS_MODEL`(sol), `reasoning.effort: 'medium'`, `max_output_tokens: 12000`, 타임아웃 180초.
- 응답은 코드펜스를 벗기고 JSON 파싱 → zod로 모양 검사(PROMPT-v2.3 출력 필드). 파싱·모양 실패는 최대 `maxAttempts`까지 다시 부른다.

### 2-2. 입력 만들기 (`build.py` + `run-one.mjs` 2단계를 TS로)

참가자 한 명에서 만든다. 답한 지문의 문항만 쓴다. 문항 검토(`reviewFlag !== null`) 문항은 뺀다.

- `evidenceEntries` 후보: `first.rationale.mode === 'PROVIDED'`이고 `thoughtDiagnosis.status === 'READY'`인 문항(= 근거 쓴 오답, 근거가 SUPPORTED가 아닌 정답).
  - `item`: 화면에 쓰는 이름 그대로 `"<지문 제목> <번호>번"`. 서버는 `item → questionId` 표를 따로 들고 있는다.
  - `stem`, `scenario`(빈 문자열이면 넣지 않음), `stemPolarity`, `chosen {position, text}`, `correct`, `studentRationale`(= `first.rationale.text`)
  - 정답이면 `rationaleJudgment` = `firstJudgment.contentAssessment`
  - 오답이면 `answer {position, text}`. `SELECT_INCORRECT`이면 `chosenIsTrueStatement: true`와 `answerTwists`(정답 선지 비틂), 아니면 `chosenTwists`(고른 선지 비틂). 비틂 항목 = `{ twistDetail, choiceQuote, evidenceQuote }` (선지 연결 파일, 이미 `loadTwists`가 읽는 것).
  - `thoughtDiagnosis`: `{ outcomeType, steps, firstFailedStep, errors }`
  - **새로 추가: `symbolGloss`** — 이 문항의 발문·선지·`scenario`에 나오는 기호(㉠, ⓐ, ㉮ 등)만 골라 `symbol-gloss/<passageId>.json`의 뜻을 붙인다. 이유: 플라 10번은 원래 〈보기〉가 그림이라 `scenario` 글에 ㉮·㉯가 없어서, 실험에서 짝 바꿈 사례를 못 잡았다. 지시문은 바꾸지 않는다(입력에 기호 뜻이 있으면 모델이 쓴다).
- 거르기(코드): 후보 중 `errors`에 다음 태그가 하나라도 있는 것만 `evidenceEntries`에 남긴다. 단계는 보지 않는다.
  `CONDITION, SCOPE, DIRECTION, POLARITY, REFERENT, MAPPING, PARAPHRASE_DISTANCE, MISREAD_FACT`
  나머지는 `excludedEntries: [{ item, tags }]`.
- `supportedCorrectRationales`: 근거를 쓴 정답 중 `contentAssessment === 'SUPPORTED'` → `{ item, studentRationale }`
- `wrongWithoutRationale`: 근거 없이 틀린 문항 이름 목록
- `passages`: `evidenceEntries`에 나온 지문만 `{ 제목: 원문 }`
- `student` 필드는 넣지 않는다(참가자 id를 모델에 줄 이유가 없음).

**남은 `evidenceEntries`의 서로 다른 문항이 2개 미만이면 호출하지 않고 `none`.**

### 2-3. 언제 돌리나

- 참가자에 `readingHabit?: { status: JobStatus; inputHash: string | null; generation: unknown | null; review: unknown | null; shown: ShownHabit | null; hiddenReason: string | null }`를 둔다(옛 파일에는 없음 → 없으면 `NONE`).
- `result()`를 부를 때:
  1. 사고 진단 대상 중 `PENDING`이 하나라도 있으면 → `pending`으로 응답만 하고 시작하지 않는다(입력이 아직 다 안 모임).
  2. 입력을 만들고 `jsonHash`로 해시. 저장된 `inputHash`와 같고 `READY`/`FAILED`면 저장본을 쓴다.
  3. 다르면(새 지문을 더 풀었거나 개발자 초기화) 새로 시작: `PENDING` → 생성 → 검토 → 아래 2-4 검사 → `READY`. 호출 실패가 `maxAttempts`를 넘으면 `FAILED`.
- 사건 기록: `READING_HABIT_DONE { inputHash, promptVersion, generation, review, shown, hiddenReason, metadata }`, `READING_HABIT_FAILED { error }`. 숨긴 경우도 원출력을 남긴다(나중에 실제 자료로 판단 검토).
- 비용·시간(실험 실측): 생성+검토 한 쌍 약 $0.05, 한 번 호출 평균 25초·최대 60초. 생성 → 검토가 이어지므로 최대 2분쯤. 결과 화면 폴링 한도(10분) 안이다.

### 2-4. 보여 주기 전 코드 검사 (모두 통과해야 `shown`)

지시문만 믿지 않고 서버에서 다시 확인한다(backlog-23/29 원칙).

1. `review.verdict === 'PASS'` (아니면 `hiddenReason: 'REVIEW_FAIL'`)
2. `generation.result === 'PATTERN'` (`NONE`이면 `hiddenReason: 'NONE'`, 정상)
3. `featured.item`과 모든 `otherCases[].item`이 거른 `evidenceEntries`의 문항이고, 서로 다른 문항이 2개 이상
4. 모든 `studentQuote`가 그 문항 `studentRationale` 안에 그대로 있다(앞뒤 공백 정리만)
5. 모든 `sentence`가 `**`를 빼고 나면 그 문항의 선지 글, 지문 원문, `scenario` 중 하나 안에 그대로 있다. 어디서 찾았는지로 `sourceKind: 'CHOICE' | 'PASSAGE' | 'SCENARIO'`를 정한다.
6. `strength`가 사례 수와 맞다(2개 = `TWO`, 3개 이상 = `THREE_PLUS`)
7. `secondary`가 있으면 그 `items`도 거른 문항 안에 있어야 한다. 아니면 `secondary`만 버린다(첫째 습관은 살림).

3~6 중 하나라도 실패하면 `hiddenReason: 'CHECK_<번호>'`로 숨긴다.

### 2-5. 결과 응답

`summaryGroups: null` 자리를 다음으로 바꾼다.

```ts
readingHabit:
  | { status: 'pending' | 'failed' | 'none' }        // none = 대상 부족, NONE, 숨김 모두
  | { status: 'ready'; habit: {
      headline: string;
      featured: { questionId: string; passageId: string; questionNumber: number; sourceKind: 'CHOICE'|'PASSAGE'|'SCENARIO';
                  choicePosition: number | null; sentence: string; studentQuote: string; sourceForm: string; studentForm: string; explanation: string };
      otherCases: { questionId: string; passageId: string; questionNumber: number; sentence: string; studentQuote: string; changed: string }[];
      secondary: { line: string; questionIds: string[] } | null;
      nextTime: string } }
```

- `kind`, `perEntry`, `counterCheck`, `rejected`, 검토 결과, `hiddenReason`은 응답에 넣지 않는다(내부용, 사건 기록에만).
- `choicePosition`은 `sourceKind === 'CHOICE'`일 때 그 선지 번호(고른 선지 또는 SELECT_INCORRECT면 놓친 정답 선지).
- `hasPending`에 `readingHabit.status === 'pending'`을 더한다.

## 3. 화면 (`ResultView.tsx` `TopSummary`)

- 숫자 줄은 그대로.
- `readingHabit.status === 'ready'` → 아래 **읽기 습관 상자**. "가장 먼저 볼 것"은 보이지 않는다.
- `pending` → 숫자 줄 아래 회색 한 줄 "문장 읽기 습관을 살펴보는 중이야." (상자 자리 비움)
- `none`·`failed` → 지금의 "가장 먼저 볼 것" 그대로.

읽기 습관 상자 (Ghootae 승인 모양, KEY.md "좋은 출력 예"):

```
[headline, 굵게]

<지문 제목> 6번 · 선지 ③              ← sourceKind에 따라 "선지 ③" / "지문" / "〈보기〉"
"…sentence…"
네 근거  "…studentQuote…"

  원래 문장   A는 B를 하는 가장 좋은 C이다      ← sourceForm
  네가 읽은 것  A에서 B를 할 수 있다            ← studentForm

explanation (2~3문장)

같은 방식으로 읽은 곳
· <지문 제목> 5번 — sentence(바뀐 말 **굵게**) · changed   [카드 보기 →]
· …

(secondary 있으면) 그 밖에: secondary.line  [5번] [9번]

다음에: nextTime
```

- 기호 풀이는 기존 `annotateSymbols`(지문별 `symbolGloss`)를 sentence·studentQuote·explanation에 그대로 쓴다.
- `**굵게**`는 기존 `Segs`로 굵게 표시. 학생 근거는 굵게 하지 않는다.
- 문항 링크는 기존 "카드 보기" 동작(`onShowCard(questionId)`)을 쓴다.
- 모바일: 원래 문장/네가 읽은 것 두 줄 표는 세로로 쌓는다(라벨 위, 내용 아래).
- `kind`·태그 이름·"습관 유형" 같은 범주 이름을 화면에 쓰지 않는다.

## 4. 테스트

- 입력 만들기: 가짜 참가자 → (a) 거르기가 태그만 보고 단계는 안 봄, (b) `OUTSIDE_KNOWLEDGE`·`ATTRIBUTION`만 있는 문항 제외, (c) 문항 검토 문항 제외, (d) 플라 10번에 `symbolGloss` ㉮·㉯가 붙음, (e) 대상 1개면 호출 0회로 `none`.
- 코드 검사: 저장된 실험 출력으로 재생 테스트(모델 호출 없음). `docs/experiments/reading-error-2026-11-18/runs/*-v2.3-r*.gen.json`·`.review.json`과 `inputs-filtered/*-v2.3.json`을 픽스처로 써서 2-4 검사만 돌린다. 기대:
  - S-58 r1~r3, S-66 r1~r3, S-23 r1·r3 → 보임
  - S-23 r2 → 숨김(`REVIEW_FAIL`, 저장된 검토는 고치기 전 지시문으로 돌린 것)
  - S-44 r1~r3 → 숨김(`REVIEW_FAIL`) / S-07·S-31 → 숨김(`NONE`) / S-12 → 호출 없음
- 인용 하나를 한 글자 바꾸면 `CHECK_4`로 숨김.
- 같은 입력으로 `result()`를 두 번 불러도 호출은 한 번(`inputHash`).
- 화면: ready/pending/none 세 상태 렌더, 범주 이름이 화면 글에 없음.

## 5. 이번에 하지 않는 것

- 문단 요약 자료를 넣은 종합 분석(나중에 따로).
- 습관에 맞춘 추천(추천 칸은 그대로).
- 지시문 수정. 실제 학생 자료가 쌓이면 숨김 비율·검토 FAIL 사례를 보고 다시 판단.
