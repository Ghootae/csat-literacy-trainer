# 인계: SNS 진단평가 백엔드(인계 A)

- 날짜: 2026-11-06
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0200-sns-diagnostic-mode-result-screen-direction.md`(방향),
  `D-0201`(세트 E), `D-0202`(지금의 학생용 폐기), `D-0203`(메가스터디 수치 공개), `D-0204`(피드백 유지·지문 단위·첫 응답),
  `D-0205`(사고 진단 대상·로컬 저장·결과 화면), `D-0207`(위치 보정), `D-0208`(건너뛰기·문항 검토·근거 요청 문구·답 고치기·결과의 정답 비공개, 이 인계와 함께 기록).
- 검토: 웹 에이전트 `docs/review/sns-diagnostic-backend-handoff-review-2026-11-06.md`(1~6 모두 반영, 사용자 동의 2026-11-06).
- 설계 원문: `docs/SNS-DIAGNOSTIC-DESIGN-DRAFT-2026-11-06.md` 2-1·2-2. 이 문서와 초안이 다르면 **이 문서**를 따른다
  (아래 "초안과 다른 점").

## 목표

이 작업이 끝나면 다음이 참이다. 모두 외부 전송 없이 가짜 평가기로 확인한다.

1. 세트 E(4지문 16문항)를 지문 단위로 푸는 진단평가 API `/api/diagnostic/*`가 있다. 환경 변수
   `CSAT_DIAGNOSTIC_ENABLED=1`일 때만 열린다. 개발자 모드(`/api/developer/*`)와 분리돼 있다.
2. 한 지문의 흐름이 D-0204대로 돈다: (요약 선택 → 요약 대화) → 문항 답 모두 입력(정오 숨김) → 지문 결과 정리 →
   문항별 피드백(건너뛰기 가능) → 다음 지문.
3. 사고 진단 v0.1과 문단 판정 v3이 파이프라인 모듈로 옮겨져 있고, 옮기기 전 스크립트와 **같은 요청 본문**을 만든다.
4. 위치 추정 모듈이 `calibrate.py`와 같은 수치를 낸다(정답 수 4~16의 표).
5. 참가자 상태는 파일로 저장되고, 서버를 다시 켜도 이어 간다.
6. 본 서비스(`/api/developer/problem-lab/*` 등) 동작과 기존 테스트는 그대로다.

## 범위 밖

- **외부 API 호출·외부 전송 금지.** `.env`를 읽지 않는다. 실제 모델로 서버를 띄우지 않는다. 비용·대기 시간 측정은 별도 승인 과제다.
- 화면(`/diagnostic` 페이지, React 컴포넌트), 학생용 비틂·관계 이름 문장 → 인계 B.
- 판정기 v5 지시문·스키마·모델 배분(정답 luna·오답 sol) 변경 금지. 사고 진단·문단 판정 지시문·스키마도 바꾸지 않고 옮기기만 한다.
- 예외는 마지막 설명 지시문에 `SKIPPED` 정의 한 문장 추가(아래 (3)) 하나다.
- 공용 읽기 함수 `content.ts`의 기존 함수와 `problemQuestionId` 계약은 고치지 않는다(D-0205 3). 새 함수 추가는 된다.
- 기존 fixture(`fixtures/experiments/problem-solving/**`, `dialogue/**`, `sns-diagnostic/**` 기존 파일)와 `docs/experiments/**` 동결 자료는 읽기만 한다.
- 추천 규칙·비틂→추천 세트 대응표 내용, 개인정보·공개 배포용 저장소, 공유·이어 하기 링크.
- 파일 삭제 금지. `git add`·`commit`·`stash` 금지. `memory/**`, `AGENTS.md`는 건드리지 않는다.

## 초안과 다른 점(코드 에이전트 대조, 2026-11-06)

1. 문단 판정 대상 지도는 **5개**다. 경마식 보도 지도가 초안에서 빠졌다. 단위 수(노드 + 관계)는 지도 기준으로 아래와 같다.
   | 지문 | 지도 경로 | 노드 | 관계 |
   |---|---|---|---|
   | audio-perceptual-coding | `docs/experiments/sns-diagnostic-gold-2026-11-05/audio-perceptual-coding/` | 25 | 37 |
   | consciousness-cognition (가) | `.../sns-diagnostic-gold-2026-11-05/consciousness-cognition-ga/` | 21 | 32 |
   | consciousness-cognition (나) | `.../sns-diagnostic-gold-2026-11-05/consciousness-cognition-na/` | 16 | 22 |
   | plastic-polymerization | `.../sns-diagnostic-gold-2026-11-05/plastic-polymerization/` | 28 | 29 |
   | horse-race-reporting | `docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting/` | 21 | 28 |
   각 폴더에 `frozen-map.json`과 `stance/stance-final.json`이 있다. 지도의 `paragraphId`는 세트 E 지문 파일의
   `paragraphId`와 같다(의식과 인지는 `consciousness-cognition-ga-p1`…`-na-p4`).
2. 문항 난이도는 초안 2-2 (1)의 "선택과목 두 정답률 평균"이 아니라 **선택과목마다 따로** 계산한다(D-0207, `calibrate.py`).
3. D-0208 1~3(건너뛰기 종료 사유·문항 검토 문항·근거 요청 문구)은 초안에 없던 내용이다.
4. **판정 시작 시점이 바뀌었다(D-0208 4).** 초안 2-1 (2)·(4)는 "근거를 쓴 문항은 제출 즉시 뒤에서 판정"이었다. 이 문서에서는
   `answers-done` 전까지 답을 고칠 수 있고, 선택 판정은 `answers-done` 때 한꺼번에 시작한다. 첫 응답은 `answers-done` 시점의 답이다.
5. 문항 검토 문항은 결과 화면에서도 정답·근거 원문을 내보내지 않는다(D-0208 5).

## 손댈 파일과 계약

### (1) 세트 목록 파일 — `packages/pipeline/fixtures/experiments/sns-diagnostic/diagnostic-set-e.json` (새 파일)

생성 스크립트 `scripts/build-diagnostic-set.mjs`(새 파일, 외부 전송 없음)로 만든다. 손으로 쓰지 않는다.

```json
{
  "schemaVersion": "sns-diagnostic-set-v1",
  "setId": "set-e",
  "referenceExam": { "megastudySeq": 349, "label": "2026학년도 수능" },
  "passages": [
    { "passageId": "consciousness-cognition", "questionIds": ["consciousness-cognition-q12", "…", "consciousness-cognition-q16"],
      "exam": { "label": "2024학년도 6월 모의평가", "megastudySeq": 311 },
      "analysisMaps": [
        { "mapPath": "docs/experiments/sns-diagnostic-gold-2026-11-05/consciousness-cognition-ga/frozen-map.json",
          "stancePath": "docs/experiments/sns-diagnostic-gold-2026-11-05/consciousness-cognition-ga/stance/stance-final.json",
          "mapSha256": "<계산값>" }
      ],
      "choiceLinkPath": "docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/frozen/consciousness-cognition.json" }
  ],
  "items": {
    "consciousness-cognition-q15": {
      "passageId": "consciousness-cognition", "questionNumber": 15, "answerPosition": 2,
      "megastudy": { "correctRate": [70, 80], "choicePercents": [[4, 70, 9, 11, 5], [2, 80, 6, 8, 3]],
                     "subjects": ["화법과작문", "언어와매체"], "source": "메가스터디 이용자 기준" }
    }
  }
}
```

- 지문 순서는 D-0201 표 순서를 따른다: 의식과 인지 → 경마식 보도 → 플라스틱 → 오디오. 문항 순서는 번호 오름차순.
- `megastudy`의 값은 `docs/experiments/sns-diagnostic-candidates-2026-11-05/candidates.json`의 `items[]`(`correctRate`, `choicePercents`)에서 그대로 옮긴다.
  배열 순서는 [화법과작문, 언어와매체]다.
- `megastudySeq`는 `grade-cuts.json`의 `setEItems`(`311`·`319`·`326`·`345`)와 맞아야 한다. 하나라도 어긋나면 멈추고 보고한다.
- `answerPosition`은 `runtime-reference.json`의 `answerChoiceId`와 맞는지 생성 때 검사한다.
- Rasch 난이도는 이 파일에 넣지 않는다. (5) 모듈이 `megastudy-items.json`에서 실행 때 계산한다(σ를 바꿔 보기 쉽게).

### (2) 세트 E 읽기 — `packages/app/src/server/diagnostic/content.ts` (새 파일)

- `loadDiagnosticSet()`: 위 파일을 zod로 검증해 읽는다.
- `loadDiagnosticBundle(questionId)`: `sns-diagnostic/public/<id>.json` + `sns-diagnostic/runtime-reference.json`으로
  `SourceDirectProblemBundle`을 만든다. 조립 방식은 `content.ts:140` `loadProblemSolvingBundle`과 같고 루트만 다르다.
  가능하면 기존 함수 내부를 루트 인자를 받는 내부 함수로 빼서 공유한다(기존 함수의 동작·시그니처 유지).
- `loadDiagnosticPassages()`: `sns-diagnostic/passages/*.json`을 `loadDialoguePassages(root)`로 읽는다(이미 루트 인자가 있음).
- 이미지: `sns-diagnostic/media/`의 두 이미지가 기존 media 제공 경로로 열리는지 확인한다. 안 열리면 새 경로를 만들지 말고 보고한다.

### (3) 건너뛰기 명령 `SKIP` — `packages/pipeline/src/problem-solving/feedback.ts`, `feedback-end-explanation.ts` (D-0208 1)

- `FeedbackCommandSchema`에 `{ type: 'SKIP' }`를 더한다.
- 받는 단계는 `AWAITING_RATIONALE`·`AWAITING_CORRECTION`·`AWAITING_RESELECTION` 셋뿐이다. 다른 단계면 오류
  (`'지금은 건너뛸 수 없습니다.'`).
- 동작: 관찰 기록을 남기고(`observations.push`, `revision++`), 활성 오류의 `skipped = true`를 표시한 뒤
  `endExplanation(s, 'SKIPPED', outcome)`. outcome은 마지막 선택이 정답이면 `UNVERIFIED_CORRECT`, 아니면 `COACHING_TERMINATED`.
- `pendingEnd.endReason` 타입에 `'SKIPPED'`를 더한다. `problem-feedback.ts`의 `gateNote`는 `SKIPPED`이면 `null`(안내 문장 없음).
- 마지막 설명 지시문(`feedback-end-explanation.ts`)의 endReason 정의 문장들(14행·35행 부근, 두 곳)에 다음 한 문장씩만 더한다:
  `SKIPPED는 학생이 질문에 답하지 않고 이 문항을 건너뛴 것이다.` 다른 문장은 바꾸지 않는다.
- 결과 기록에 건너뜀이 남아야 한다: `FeedbackResult`에 `skipped: boolean`을 더한다(`finish`에서 마지막 관찰이 `SKIP`인지가 아니라,
  관찰 목록에 `SKIP`이 있는지로 정한다). 기존 저장 자료와 호환되게 선택 필드(optional)로 둔다.
- 본 서비스 화면에는 버튼이 없으므로 본 서비스 흐름은 바뀌지 않는다. 기존 `feedback.test.ts`·`problem-feedback*.test.ts`가 그대로 통과해야 한다.

### (4) 사고 진단·문단 판정 모듈 — `packages/pipeline/src/thought-diagnosis/`, `packages/pipeline/src/analysis-judge/` (새 폴더)

**사고 진단 v0.1** (D-0111·D-0115·D-0205 1)

- 지시문: `docs/experiments/thought-diagnosis-v01-2026-10-10/prompts.json`의 `instructions`. 스키마: 같은 폴더 `FROZEN.json`의 `schema`.
  모듈은 이 두 값을 파일에서 읽거나 그대로 복사하되, 테스트에서 해시가 같은지 확인한다.
- 요청 본문: `scripts/test-thought-diagnosis-v0.mjs:61` `requestFor`와 `scripts/test-thought-diagnosis-v01.mjs:50`(이름 `thought_diagnosis_v01`)과 같다.
  모델 `gpt-6.1-sol` 고정, `reasoning.effort: 'medium'`, `max_output_tokens: 6000`. 입력 `student`는 `{ caseId, choiceId, rationale }`이고
  진단평가에서는 `caseId`에 `<participantId>:<questionId>`를 넣는다.
- 출력 검증: v01의 `validateOutput`과 같은 규칙.
- 대상: 첫 응답이 오답이고 근거를 쓴 문항, 그리고 첫 응답이 정답이고 근거를 썼으며 첫 선택 판정의 `contentAssessment`가
  `SUPPORTED`가 아닌 문항. 근거 생략 문항과 `SUPPORTED` 정답은 부르지 않는다.
  - 정답 문항은 첫 선택 판정을 기다린다. 판정이 최종 실패하면 `SUPPORTED`가 아닌 것으로 보고 돌린다.
  - `boundary`가 `NONE`이 아닌 문항(문항 검토)은 돌리지 않는다.
- 호출은 주입 가능한 transport(평가기 인터페이스)로 한다. 테스트는 가짜 transport만 쓴다.

**문단 판정 v3** (D-0143·D-0146·D-0205 2)

- 지시문: `docs/experiments/analysis-map-gongsun-2026-10-16/JUDGE-PROMPT-v3.md`에서 `run-analysis-judge-gongsun.mjs`가 노드용·관계용 지시문을
  만드는 방식 그대로. 요청 본문은 `buildJudgeInput`(stance 포함)·`buildJudgeRequest`(`schemaName: 'analysis_judgment_v3'`)와 같다.
  모델 `gpt-6-luna`.
- 판정 단위: `unitsForParagraph(map, paragraphId)`의 노드·관계마다 1회. 인용 확인(`checkQuotes`)과 묶기(`combineRound`)도 옮긴다.
- 입력 대화: 그 문단 **첫 시도(attempt 1)의 첫 학생 발화까지**의 대화(`role`·`text`만). 첫 발화가 없는 문단(넘어간 문단)은 판정하지 않는다.
- 의식과 인지는 문단 id 접두(`-ga-`/`-na-`)로 지도를 고른다.

**동치 테스트**: 스크립트의 함수를 테스트에서 import해, 같은 입력에 대해 모듈과 스크립트의 요청 본문이 깊은 비교로 같은지 확인한다.
사고 진단은 `sources.json`·`prepared-cases.json`의 사례 3개 이상, 문단 판정은 공손룡 `stage2/rounds.jsonl`의 라운드 2개 이상(노드·관계 둘 다).

### (5) 위치 추정 — `packages/pipeline/src/diagnostic-position/` (새 폴더)

`calibrate.py`를 TypeScript로 옮긴다. 자료는 `docs/experiments/sns-diagnostic-calibration-2026-11-06/megastudy-items.json`·`grade-cuts.json`.

- `itemDifficulty(p, sigma)`: `-logit(p) * sqrt(1 + π·σ²/8)`. 선택과목(`1004` 화작, `1005` 언매)마다 그 과목 정답률로 계산.
- `estimateAbility(responses, sigma)`: responses는 `{ b, correct }[]`(지금까지 답한 문항만). 사전분포 N(0, σ²), 격자 −4~4 401점, EAP 평균과
  누적 0.1·0.9 지점(80% 구간). `calibrate.py`의 `eap`와 같은 격자·같은 경계 규칙.
- `nationalPosition(theta, subject, sigma)`: 기준 시험(seq 349) 45문항 예상 원점수 → 원점수 등급컷 보간(`pct_of_raw`) → 백분위, `grade`.
- `participantPosition(responses)`: 두 과목을 각각 계산하고 백분위를 평균한다(평균·하한·상한 각각). 등급은 평균 백분위로 정한다. σ = 1.
- 반환: `{ answered, correct, percentile: { mean, low, high }, grade: { mean, best, worst }, bySubject }`. 화면에 내보내는 값은 인계 B가 정한다.
- 테스트: 16문항 전부 답하고 정답 수 k = 4…16일 때 `OUTPUT.md` 3절 표의 값(반올림한 정수 백분위와 등급)과 같다.
  `calibrate.py`를 다시 실행해 비교하지 말고 `OUTPUT.md` 값을 기대값으로 쓴다(외부 의존 없음).

### (6) 진단평가 컨트롤러 — `packages/app/src/server/diagnostic/controller.ts` (새 파일)

**참가자 상태**(파일 하나에 통째로 저장)

```ts
interface DiagnosticParticipant {
  schemaVersion: 'sns-diagnostic-participant-v1';
  participantId: string;              // randomUUID()
  setId: 'set-e';
  createdAt: string;
  passages: Record<string, {
    status: 'NOT_STARTED' | 'SUMMARY' | 'ANSWERING' | 'AWAITING_JUDGMENT' | 'FEEDBACK' | 'DONE';
    summaryChosen: boolean | null;
    summarySessionId: string | null;
    firstTurns: Record<string, { text: string; at: string } | null>;  // paragraphId → 첫 시도 첫 발화
    feedbackCursor: number;            // 문항별 피드백 진행 위치
  }>;
  items: Record<string, {
    draft: { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null; savedAt: string } | null;  // answers-done 전 임시 답
    first: { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null; submittedAt: string } | null;
    session: FeedbackSession | null;   // 본 서비스와 같은 풀이 상태
    transcript: FeedbackMessage[];
    firstJudgment: { status: 'NONE' | 'PENDING' | 'READY' | 'FAILED'; attempts: number; contentAssessment: string | null; boundary: string | null };
    thoughtDiagnosis: { status: 'NONE' | 'PENDING' | 'READY' | 'FAILED'; output: unknown | null };
    reviewFlag: 'WRONG_SUPPORTED' | 'BOUNDARY' | null;   // 개발자 검토 목록
  }>;
  analysis: Record<string, { status: 'NONE' | 'PENDING' | 'READY' | 'FAILED'; judgments: Record<string, unknown> }>; // paragraphId 단위, judgments는 단위(노드·관계) id별 결과
}
```

**한 지문의 처리**

1. `start`: `summaryChosen` 기록. 요약을 고르면 세트 E 지문으로 만든 `SimpleDialogueController`(주입: `passages: loadDiagnosticPassages()`,
   `logDirectory`는 진단 저장 폴더 아래)의 세션을 연다. 진단평가에서는 `startAttempt`(새 시도)를 막는다.
2. 요약 대화: 본 서비스 `respond`·`navigate`를 그대로 넘긴다. 문단의 첫 학생 발화가 들어오면 `firstTurns`에 기록하고 문단 판정을 백그라운드로 시작한다.
3. 문항 답 저장(`item`, D-0208 4): 답(선택·근거·시간)을 `draft`로 저장만 한다. 풀이 상태도 만들지 않고 판정도 부르지 않는다.
   `answers-done` 전에는 같은 문항을 다시 내면 `draft`를 덮어쓴다. 고친 횟수는 사건 기록(`ITEM_SUBMITTED`에 `revisionOfDraft`)에만 남긴다.
   `answers-done` 뒤에는 409. 응답에는 정오·판정 결과를 넣지 않는다.
4. `answers-done`: 지문 문항을 모두 냈는지 확인한다(빠지면 400). 그 시점의 `draft`를 `first`로 확정하고, 문항마다
   `createFeedbackSession` 뒤 `submitFeedbackCommand(SELECT)`를 적용한다.
   - 근거를 쓴 문항: 상태가 `AWAITING_EVALUATION`이 되고, 선택 판정(`evaluator.evaluate` → `applyFeedbackAssessment`)을 백그라운드로 돌린다.
     한 지문의 판정들은 동시에 시작한다.
   - 근거 생략 문항: 모델을 부르지 않는다(상태기계가 정답이면 `COMPLETED`, 오답이면 `AWAITING_RATIONALE`로 보낸다).
   - 사고 진단 대상 판정을 시작한다. 오답 문항은 바로, 정답 문항은 첫 선택 판정을 기다린 뒤.
5. `summary-card`: 그 지문의 첫 선택 판정이 모두 `READY`/`FAILED`가 되면 `ready`, 아니면 `pending`. 셈 규칙은 D-0204 6과 D-0208 2:
   | 칸 | 규칙 |
   |---|---|
   | `correct` / `total` | 첫 선택 기준 |
   | `supported` / `rationaleDenominator` | 근거를 쓴 문항 중 판정 `READY`이고 `boundary = NONE`인 것만 분모. `contentAssessment = SUPPORTED`이면서 정답인 것만 적절 |
   | `omitted` | 근거 생략 수 |
   | `checking` | 판정 최종 실패 + `boundary ≠ NONE` 문항 수(분모에서 뺌) |
   | 오답 + `SUPPORTED`(선택–근거 일치, 곧 ITEM_REVIEW인 경우만) | 분모에 넣되 적절로 세지 않고 `reviewFlag = 'WRONG_SUPPORTED'` |
   `boundary ≠ NONE`이면 `reviewFlag = 'BOUNDARY'`. 문장은 만들지 않고 숫자만 돌려준다(문장은 인계 B).
6. 문항별 피드백(`feedback`): 첫 문항부터 차례로. 문항에 들어갈 때 이어 주는 말풍선 하나를 붙인다:
   `"<n>번째 문항으로 돌아가 볼게. <①…⑤>번을 골랐네."`(n은 지문 안 순서, 한글 서수 "첫/두/세/네/다섯").
   - 그 뒤 말풍선은 본 서비스 `ProblemFeedbackController`의 코치 말풍선 규칙과 같다. 단, 제출 즉시 붙는 `INSTANT` 말풍선
     ("정답이야! 근거도 같이 살펴볼게." 등)은 진단평가에서 붙이지 않는다.
   - 명령은 본 서비스 명령 + `SKIP` + `RESUME`(판정 재시도). 요청 모양은 `FeedbackRequestSchema`와 같다(`transitionId`, `expectedRevision`, `command`).
   - **근거 요청 문구(D-0208 3)**: 상태가 `AWAITING_RATIONALE`일 때 화면 말풍선 문구를 다음으로 바꾼다. 상태기계의 `message`는 그대로 둔다:
     `"정답이 아니야. 어떻게 판단했는지 적어 주면 같이 볼게. 적기 어려우면 [근거 미제출]을 눌러 줘."`
   - **문항 검토 문항(D-0208 2)**: 상태가 `ITEM_REVIEW`이면 개발자용 문구 대신 `"이 문항은 우리가 한 번 더 확인해 볼게. 다음 문항으로 넘어갈게."`
     한 줄을 보이고, 그 문항을 끝난 것으로 보고 다음 문항으로 간다. 정답은 공개하지 않는다.
   - 마지막 설명 생성·확인은 본 서비스와 같다(`generateEnd` 방식). 문항이 `COMPLETED`가 되면 커서를 다음 문항으로 옮긴다.
   - 근거 요청 단계에서 받은 근거는 첫 응답이 아니므로 `first`를 바꾸지 않고 분석에 쓰지 않는다.
7. 지문의 모든 문항이 끝나면 `DONE`, 다음 지문으로.

**공통 규칙**

- 본 서비스 컨트롤러의 판정·마지막 설명 처리(`evaluate`, `generateEnd`, `appendCoachMessages`, `gateNote`)를 복사하지 말고 재사용한다.
  재사용하려면 `ProblemFeedbackController` 안의 함수를 모듈 함수로 꺼내야 할 수 있다. 꺼낼 때 본 서비스 동작이 바뀌면 안 된다.
  깔끔하게 꺼낼 수 없으면 멈추고 보고한다.
- 백그라운드 판정 실패: 자동으로 2번까지 다시 시도한다(최대 3회). 그래도 실패하면 `FAILED`. 피드백 차례에 그 문항에서는 본 서비스처럼
  `RESUME`으로 다시 시도할 수 있다.
- **`RESUME`으로 첫 선택 판정이 나중에 성공하면**: 그 판정은 첫 응답에 대한 것이므로 `firstJudgment`를 `READY`로 바꾸고 `checking`에서 뺀다.
  지문 결과 정리를 이미 보였어도 결과 화면(`result`)에는 반영한다. 사고 진단 대상 여부도 그때 다시 정한다(정답 + `SUPPORTED`면 돌리지 않음).
- **동시 쓰기 금지**: 참가자마다 메모리 상태 하나를 기준으로 둔다. 백그라운드 작업(판정·사고 진단·문단 판정 단위마다)은 끝나면 그 메모리 상태에
  결과를 반영하고 저장을 요청한다. 저장은 참가자 단위 직렬 큐로 차례대로 한다. 작업이 저장 파일을 읽어 고쳐 쓰는 방식(읽기 → await → 쓰기)은 쓰지 않는다.
- 서버를 다시 켜면: 참가자 파일을 읽어 이어 간다. `PENDING`인 판정·사고 진단은 다시 시작한다. 문단 판정은 결과가 없는 단위만 다시 보낸다
  (이미 결과가 있는 단위는 다시 보내지 않음).
- 위치 범위: 지문을 `answers-done`할 때마다 그때까지 답한 문항의 정오로 (5)를 다시 계산한다. 판정을 기다리지 않는다.
- 골드·선지 연결 자료는 판정 입력에 넣지 않는다(D-0002·D-0003·D-0162). 결과 자료에만 쓴다.

### (7) 저장 — `packages/app/src/server/diagnostic/store.ts` (새 파일)

- 인터페이스 `DiagnosticStore { load(id): DiagnosticParticipant | null; save(p): void; appendEvent(e): void }`.
- 구현 `FileDiagnosticStore`: 루트는 `CSAT_DIAGNOSTIC_ROOT`, 기본값 `sessions/diagnostic`(이미 git 제외).
  - `<root>/<participantId>.json`: 현재 상태. 임시 파일에 쓴 뒤 rename으로 바꾼다.
  - `<root>/events.jsonl`: 사건 한 줄씩. 사건 종류: `PARTICIPANT_CREATED`, `PASSAGE_STARTED`, `SUMMARY_FIRST_TURN`, `ITEM_SUBMITTED`,
    `ANSWERS_DONE`, `JUDGMENT_DONE`/`JUDGMENT_FAILED`(호출 메타데이터·원출력 포함), `THOUGHT_DIAGNOSIS_DONE`/`_FAILED`,
    `ANALYSIS_DONE`/`_FAILED`, `FEEDBACK_COMMAND`, `ITEM_SKIPPED`, `ITEM_REVIEW_FLAGGED`, `PASSAGE_DONE`.
- `participantId`는 경로에 쓰기 전에 UUID 형식인지 검사한다(경로 조작 방지).

### (8) API — `packages/app/src/server/index.ts`에 등록, 처리는 `diagnostic/http.ts`(새 파일)

`CSAT_DIAGNOSTIC_ENABLED=1`일 때만 등록한다. 기존 라우팅 방식(`url.pathname` 비교)을 따른다.

| 요청 | 몸체 | 응답 |
|---|---|---|
| `POST /api/diagnostic/participant` | 없음 | `{ participantId, set: { passages: [{ passageId, title, questionIds }] } }` |
| `GET /api/diagnostic/participant/:id` | — | 진행 상태(지문별 `status`, 현재 지문·문항, 위치 범위) |
| `POST …/:id/passage/:passageId/start` | `{ summary: boolean }` | 요약 세션 뷰 또는 문항 목록 |
| `POST …/:id/passage/:passageId/summary/respond` | `SimpleRespondSchema` | `SimpleDialogueView` |
| `POST …/:id/passage/:passageId/summary/navigate` | `SimpleNavigateSchema` | `SimpleDialogueView` |
| `POST …/:id/passage/:passageId/summary/finish` | 없음 | 문항 목록 |
| `POST …/:id/item/:questionId` | `{ choiceId, rationale: {mode:'PROVIDED',text}\|{mode:'OMITTED'}, solveMs, rationaleMs }` | `{ saved: true }`(정오 없음). `answers-done` 전까지 덮어쓰기, 뒤에는 409 |
| `POST …/:id/passage/:passageId/answers-done` | 없음 | `{ position }` |
| `GET …/:id/passage/:passageId/summary-card` | — | `{ status: 'pending' }` 또는 `{ status: 'ready', correct, total, supported, rationaleDenominator, omitted, checking, items: [...], position }` |
| `GET …/:id/item/:questionId/feedback` | — | 진단용 문항 뷰(본 서비스 `FeedbackWorkbenchView` + `skippable: boolean`) |
| `POST …/:id/item/:questionId/feedback` | `FeedbackRequestSchema` + `SKIP` | 같은 뷰 |
| `GET …/:id/result` | — | 아래 |

- 시간: 백엔드는 화면이 보낸 값을 그대로 저장한다. 재는 방법은 인계 B가 정한다. 이 문서의 계약은 두 가지다: `solveMs`에는 근거 입력 시간이
  들어가지 않는다. `rationaleMs`는 근거 입력 시간이고 생략이면 `null`이다. 둘 다 0 이상 정수.
- 문항 피드백 요청은 그 지문이 `FEEDBACK` 상태이고 커서가 그 문항일 때만 받는다. 그 밖에는 409.
- 응답에 정답·판정 원출력·오류 설명을 넣지 않는다(`feedbackPublicView`와 같은 원칙). 원출력은 저장소에만 둔다.

**`GET …/result`** (칸마다 `status: 'pending' | 'ready' | 'failed'`)

```ts
{
  position: { status, answered, correct, percentile: { mean, low, high }, grade: { mean, best, worst }, byPassage: [{ passageId, low, high }] },
  items: [{ questionId, passageId, questionNumber, chosenPosition, answerPosition, correct,
            rationale: 'PROVIDED' | 'OMITTED',
            judgment: { status, contentAssessment, boundary },            // 정답의 질
            megastudy: { chosenPercents: [number, number], correctRate: [number, number] },
            twist: { twistType, twistDetail } | null,                    // 고른 선지가 오답일 때 선지 연결 동결본에서
            thoughtDiagnosis: { status, firstFailedStep, outcomeType } | null,
            evidence: { student: string | null, source: { location, quote }[] },   // 판정 sourceEvidence
            afterFeedback: { corrected: boolean, skipped: boolean } }],  // 카드 안 작은 표시용(분석과 분리)
  steps: { status, counts: Record<string, number>, denominator: number },  // 무너진 단계 경향(사고 진단 READY만)
  twists: { counts: Record<string, number> },                            // 걸린 함정 꼬리표
  reading: [{ passageId, status, paragraphs: [{ paragraphId, nodes, relations }] }] // 독해 패턴, 요약한 지문만
}
```

- `twist`는 `choiceLinkPath` 동결본에서 그 문항·그 선지의 `parts[]` 중 `twisted: true`인 것의 `twistType`·`twistDetail`을 쓴다. 여러 개면 모두 배열로.
- `afterFeedback.corrected`는 `session.correctionSucceeded`, `skipped`는 (3)의 `result.skipped`.
- **문항 검토 문항(D-0208 5)**: `reviewFlag`가 있는 문항(`BOUNDARY`·`WRONG_SUPPORTED` 둘 다, 둘 다 `ITEM_REVIEW` 상태)은 `answerPosition`·
  `evidence`·`twist`·`thoughtDiagnosis`를 `null`로 두고 `review: true`를 붙인다. `correct`(첫 선택 기준 정오)와 `megastudy`는 그대로 둔다.
  이 문항의 `megastudy.correctRate`는 그대로 내보내도 정답 위치를 알려 주지 않지만, `choicePercents` 전체는 내보내지 않는다(고른 선지 비율만).
- 학생용 이름(비틂 14종·단계·관계)은 넣지 않는다. 코드만 돌려준다.

## 완료 조건

- [ ] `scripts/build-diagnostic-set.mjs`로 만든 `diagnostic-set-e.json`이 4지문 16문항, 순서·`megastudySeq`·정답 위치 검사를 통과한다.
- [ ] `SKIP`: 허용 세 단계에서 `AWAITING_END_START`로 가고 `pendingEnd.endReason = 'SKIPPED'`, outcome이 정오에 맞는다. 다른 단계에서는 오류.
      `result.skipped = true`. 기존 상태기계 테스트 전부 통과.
- [ ] 사고 진단·문단 판정 동치 테스트(요청 본문 깊은 비교) 통과. 지시문·스키마 해시가 동결 자료와 같다.
- [ ] 위치 추정 테스트: k = 4…16에서 `OUTPUT.md` 3절 표와 같은 값.
- [ ] 컨트롤러 테스트(가짜 평가기, 외부 전송 없음)로 다음을 확인한다.
  - 한 지문 끝까지: 요약 선택 → 첫 발화 기록·문단 판정 시작 → 문항 답(근거 있음·생략 섞음) → 응답에 정오 없음 → `summary-card` pending → ready 숫자 확인 → 피드백 차례 이어 주는 말풍선 → `INSTANT` 말풍선 없음 → 다음 지문.
  - 근거 생략 문항은 판정·사고 진단 호출 0회.
  - 근거 생략 오답의 근거 요청 말풍선이 D-0208 3 문구다.
  - `ITEM_REVIEW` 문항은 고정 문장 뒤 다음 문항으로 가고, `summary-card`에서 `boundary` 문항은 `checking`, 오답 + `SUPPORTED`는 `reviewFlag`.
  - 판정 실패 → 자동 재시도 2회 → `FAILED` → `checking`. 피드백 차례에 `RESUME`으로 성공하면 `firstJudgment = READY`, `result`의 `checking`에서 빠지고 사고 진단 대상이 다시 정해짐.
  - 답 고치기: `answers-done` 전 같은 문항 재제출은 덮어쓰기이고 판정 호출 0회. `answers-done` 때 마지막 답으로 판정이 한꺼번에 시작. 뒤의 재제출은 409.
  - 동시 쓰기: 가짜 평가기가 한 지문의 판정 4개와 문단 판정 여러 단위를 거의 동시에(같은 틱 또는 무작위 지연으로) 끝내도, 저장 파일을 다시 읽었을 때 모든 결과가 남아 있다.
  - 결과 화면: 문항 검토 문항은 `answerPosition`·`evidence`가 `null`이고 `review: true`.
  - 사고 진단 대상: 오답(근거 있음), 비`SUPPORTED` 정답만. `SUPPORTED` 정답·생략·`boundary` 문항은 0회.
  - 서버 재시작 흉내(새 컨트롤러 + 같은 저장소): 이어 가기, `PENDING` 작업 재시작.
  - `participantId` 형식 검사(경로 조작 거부).
- [ ] HTTP 테스트: `CSAT_DIAGNOSTIC_ENABLED`가 없으면 `/api/diagnostic/*`가 404, 있으면 표의 요청이 동작. 피드백 차례가 아닐 때 409.
- [ ] 변경 파일에 TODO·`test.skip`·`.only`·빈 분기 없음.
- [ ] 테스트 명령: `npm run typecheck` 와 `npm test` 전부 통과(실행 출력 요약을 결과 보고에 붙인다).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 특히 멈출 곳:
  - 본 서비스 컨트롤러 함수를 꺼내다가 본 서비스 동작이나 기존 테스트가 바뀌어야 하는 경우.
  - 동치 테스트가 맞지 않는 경우(지시문·스키마를 고쳐 맞추지 말 것).
  - `OUTPUT.md` 수치와 1 이상 차이 나는 경우.
  - `candidates.json`·`megastudy-items.json`·`runtime-reference.json` 사이 정답·정답률이 어긋나는 경우.
  - 세트 E 이미지가 기존 경로로 열리지 않는 경우.

## 다음 과제에 넘길 메모

- 비용·대기 시간 측정(별도 승인)에서 가장 먼저 볼 곳은 문단 판정이다. 4지문을 모두 요약하면 참가자 한 명에 259회로,
  선택 판정(많아야 16회)·사고 진단(많아야 16회)보다 훨씬 많다. 자동 재시도(최대 3회)와 재시작 때 다시 보내기가 이 호출 수를 키울 수 있다.
- `answers-done` 때 판정이 한꺼번에 시작하므로, 지문 결과 정리 대기는 그 지문에서 가장 늦은 판정 시간이다. 측정 항목에 넣는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 새 파일: `scripts/build-diagnostic-set.mjs`, `packages/pipeline/fixtures/experiments/sns-diagnostic/diagnostic-set-e.json`,
    `packages/pipeline/src/{diagnostic-position/position,thought-diagnosis/diagnosis,thought-diagnosis/transport,analysis-judge/judge}.ts`(+ 각 `.test.ts`),
    `packages/pipeline/src/problem-solving/feedback-skip.test.ts`,
    `packages/app/src/server/diagnostic/{content,store,controller,http,test-support}.ts`(+ `content.test.ts`·`controller.test.ts`·`http.test.ts`).
  - 고친 파일: `packages/pipeline/src/problem-solving/feedback.ts`(SKIP·`skipped`·`SKIPPED`), `feedback-end-explanation.ts`(SKIPPED 정의 두 곳),
    `feedback.test.ts`(마지막 설명 지시문 고정 문자열 두 곳에 같은 한 문장), `packages/pipeline/src/index.ts`(내보내기 4줄),
    `packages/app/src/server/problem-feedback.ts`(`gateNote` SKIPPED, 옵션 `withoutInstantBubble`, `adopt()`), `content.ts`(`loadBundleFromRoot` 분리,
    `loadProblemSolvingBundle` 동작·시그니처 그대로), `index.ts`(진단평가 등록), `packages/app/src/boundary.test.ts`(D4 규칙 1 저장소 목록에 `diagnostic/content.ts`·`store.ts` 추가).
- 테스트 결과: `npm run typecheck` 통과(오류 0). `npm test`: 129개 파일 중 127 통과, 1590/1592 테스트 통과(검토 반영 뒤). 실패 2건은 이 작업 이전부터 있던 것이다:
  `packages/app/src/boundary.test.ts`(`server/student-state.ts`가 `node:fs`를 import, 이 작업과 무관), `axis-architecture-experiment.test.ts`(`.omc/adhoc/...` 파일 없음).
  새로 더한 테스트: 위치 16, 사고 진단 4, 문단 판정 5, SKIP 6, 세트·내용 6, 컨트롤러 13, HTTP 3.
- 남은 문제(판단 필요):
  1. 합성 노드 입장: 세트 E 지도 4개의 `stance-final.json`에는 `nodeStances`가 없다(공손룡·경마식 보도에는 있음). 합성 노드 입장은 확정 명제 입장에서
     `deriveNodeStances`로 다시 만들어 쓴다(공손룡·경마식 보도의 내장값과 같음을 테스트로 확인). 의식과 인지 (가)는 `node-stances.json`이 명제 P4-4 수정 전 값이라
     C4-1·C4-3·G4 등이 달라, 확정본에서 다시 만든 값을 쓴다.
  2. 이미지 문항(경마식 보도 q7·오디오 q17)의 `media.contentHash`가 `sha256:` 접두 없이 저장돼 묶음 스키마를 통과하지 못한다. 동결 파일은 고치지 않고 읽을 때 접두를 붙인다
     (로컬 이미지 해시와 같음을 확인). 이미지는 본 서비스 mRNA 묶음처럼 원격 URL이며 로컬 제공 경로는 없다(새 경로 만들지 않음). 동결 파일 정리는 별도 판단.
  3. (검토 반영) 사고 진단 대상은 오답·정답 모두 첫 선택 판정이 READY/FAILED가 된 뒤에 정한다. boundary·reviewFlag 문항과 SUPPORTED 정답은 0회다.
  4. 건너뛴 문항·ITEM_REVIEW·이미 끝난 문항: 커서 문항을 보는 요청(GET/POST)이 끝난 문항을 돌려줄 때 그 응답 뒤에 커서가 다음 문항으로 간다. 지난 문항은 읽기(GET)만 된다.
  5. 요약 대화 세션은 메모리에만 있어 서버를 다시 켜면 같은 지문의 새 요약 세션이 열린다(문단 진행은 처음부터, 첫 발화 기록·문단 판정 결과는 유지).
  6. (검토 반영) `WRONG_SUPPORTED`는 오답 + SUPPORTED + 첫 선택 비교가 CONSISTENT(곧 ITEM_REVIEW)일 때만 붙는다. MISMATCH는 교정 질문 경로이며 표시하지 않는다.
  7. `twist`는 결과에서 배열(`{twistType, twistDetail}[]` 또는 `null`)로 돌려준다. 다른 세션이 같은 작업 폴더의 `memory/decisions/D-0206*`·`scripts/run-item-generation*`를 고치고 있어 건드리지 않았다.
