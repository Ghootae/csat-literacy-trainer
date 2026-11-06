# 인계: SNS 진단평가 화면(인계 B)

- 날짜: 2026-11-06
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 상태: **승인(사용자 "승인", 2026-11-07).** "검토할 판단" J1~J7은 코드 에이전트 추천안에 웹 에이전트 의견(J2·J4·J5·J6·J7)을 반영한 것이다.
- 관련 결정: D-0200(결과 화면 방향), D-0202(지금의 학생용 화면은 바탕으로 쓰지 않음), D-0204(지문 단위·피드백 유지),
  D-0205(결과 한 페이지·샘플 화면), D-0207(위치 보정), D-0208(건너뛰기·문항 검토·근거 요청 문구), D-0209(학생용 표현),
  D-0116(학생 문장 반말), D-0160(관계 집계 규칙), D-0183(개수 표시).
- 설계 원문: `docs/SNS-DIAGNOSTIC-DESIGN-DRAFT-2026-11-06.md` 2-3. 백엔드 계약: `docs/handoffs/2026-11-06-sns-diagnostic-backend.md`(인계 A) (8).
  학생용 표현 확정본: `docs/review/sns-diagnostic-student-wording-draft-2026-11-06.md`.
- 샘플 화면(승인된 배치, D-0205): https://claude.ai/artifact/923cWFBgxxuSS2evZ8SLVX. 배치·순서의 기준이다. 문구는 이 문서가 우선이다
  (샘플은 해요체이고, 갈래를 "강함/보통/약함"으로 쓰고, 단계에 해석 문장을 붙였는데 모두 이 문서에서 바뀜).

## 검토할 판단 (승인 전)

| # | 빈칸 | 추천안 | 이유 |
|---|---|---|---|
| J1 | ③ 층별 패턴 "큰 그림형/나열형" 꼬리표 | 이번에는 꼬리표 없이 층별 개수만: "문단 요지는 9곳 중 7곳, 묶음은 12곳 중 6곳, 세부 내용은 30곳 중 11곳을 잡았어." | 꼬리표를 붙일 규칙이 어느 결정에도 없다. 개수 표현(D-0209)과 유형 단정 금지(D-0200)에 맞다 |
| J2 | ③ "요약과 틀린 문항 연결"(D-0200 기본 제시), 더 보기(틀린 이해 사례·추이) | **연결은 넣는다**(웹 에이전트 제안, 동결본 확인 뒤). 규칙은 (2b). 더 보기는 이번 범위 밖 | 세트 E 선지 연결 동결본의 비틀린 조각 51개 중 47개에 `twistTargetIds`가 있고, id 49개 모두 지도에 있다(의식과 인지는 `가.`/`나.` 접두로 지도 구분). 없는 4개는 `source: NONE`(덧붙이기·서술 방식)이라 연결할 지도 단위가 원래 없다 |
| J3 | ③ 관계를 틀리게 이은 경우(판정 `CONTRADICTS`) | 잡은 개수 옆에 0보다 클 때만 "1곳은 지문과 다르게 이었어"를 붙인다. 자체 오류만 센다(D-0160 5) | D-0160은 판단에 오류율을 먼저 쓰라고 한다. 잡은 개수만 보이면 틀린 이해가 숨는다 |
| J4 | 문항 카드의 "바뀐 내용" 문장(D-0209 6, 생성·손질 전) | 학생용 문장 파일에 그 선지 문장이 없으면 칸을 비운다(비틂 이름 + 한 줄 설명만). 개발용 `twistDetail`은 화면에 내지 않는다. **공개 전 반드시 채운다**(문항 카드의 핵심, 웹 에이전트) | 파일이 채워지면 코드 변경 없이 나온다. 생성은 별도 승인 |
| J5 | 추천 칸(대응표 비어 있음, 설계 초안 4절) | 비틂 문장만: 같은 비틂 2번 이상이면 "자주 걸린 함정: 두 대상의 특징 맞바꾸기(2번)", 1번이면 "이번에 걸린 함정", 오답이 없으면 "어려운 문항으로 더 풀어 보면 좋아". 세트 이름 문장은 대응표(`recommendation-map.json`, 이번에 빈 형식만 만듦)에 항목이 있을 때만. "훈련 서비스 알아보기" 버튼은 넣지 않는다(연결할 주소 없음). **대응표와 "훈련 서비스 알아보기"는 공개 전 반드시 채운다**(SNS 모드의 주목적인 유입과 직결, 웹 에이전트) | 설계 초안 4절 임시 규칙 그대로. 없는 주소로 가는 버튼을 두지 않는다 |
| J6 | ③ 원문 복사 걸러 내기(D-0200 4) | 화면에서는 거르지 않는다. 대신 **복사 정도 값을 계산해 기록만 한다**(규칙은 (2c), 웹 에이전트 제안). 기준은 실제 자료가 쌓인 뒤 정한다 | 런타임 판별 기준이 없다. 값은 외부 전송 없이 계산된다 |
| J7 | D-0209에 없는 새 학생 문장(시작 안내·버튼·정답의 질·위치 설명·단계 경향·확인 중·빈 칸 문구·J2 연결 문장) | 이 문서 (4)·(5)의 문구로 쓴다. 웹 에이전트 의견으로 4곳 고침: 버튼 [근거 생략] → [근거 미제출](D-0208 문구와 같게), 위치 설명 "옮긴 추정이야" → "환산해 본 추정치야", 실패 칸 "이 칸은 만들지 못했어" → "이 부분은 분석하지 못했어", 정답의 질 "정답이지만 근거는 더 볼 곳이 있어" → "정답이야. 근거는 조금 더 다듬을 수 있어" | 확정본은 비틂·관계·단계 이름만 다뤘다 |

## 목표

이 작업이 끝나면 다음이 참이다. 모두 외부 전송 없이 가짜 평가기로 확인한다.

1. `/diagnostic` 주소에서 세트 E를 처음부터 결과 화면까지 할 수 있다: 시작 안내 → 지문마다 (요약 선택 → 요약 대화) → 문항 답 입력
   → 지문 끝 중간 화면 → 문항별 피드백 → 다음 지문 → 결과 화면.
2. 결과 화면이 샘플 배치(한 페이지, ① → ② → ③ → 추천)대로 그려지고, 칸마다 `pending`이면 "분석 중", `failed`면 "이 부분은 분석하지 못했어"를 보인다.
3. 학생에게 보이는 모든 문장은 반말이고(D-0116), 비틂·관계·단계 이름은 D-0209 확정본에서만 온다. 코드(`ADDED_CONTENT`, `S4_INTERPRET` 등)는 화면에 나오지 않는다.
4. 새로 고침하거나 서버를 다시 켜도 같은 참가자로 이어 간다(브라우저에는 참가자 id만).
5. 기존 화면(`/problem/lab`, `/dialogue/lab`, `/dialogue/lab/analysis` 등)과 기존 테스트는 그대로다.

## 범위 밖

- **외부 API 호출·외부 전송 금지.** `.env`를 읽지 않는다. 실제 모델로 서버를 띄우지 않는다.
- "바뀐 내용" 학생용 문장 생성(별도 승인 과제). 이번에는 읽는 자리와 빈 파일만.
- J1의 꼬리표, J2의 더 보기(틀린 이해 사례·추이), J6의 복사 거르기, 추천 대응표 내용, 공유·이어 하기 링크, 개인정보 동의 문구 확정(시연용 문구만).
- 판정기·사고 진단·문단 판정 지시문과 모델 배분 변경 금지. 인계 A의 기존 API 응답 필드 의미 변경 금지(필드 추가만 됨).
- D-0202에 따라 `ProblemApp.tsx`·`DialogueApp.tsx`(옛 학생용)를 바탕으로 쓰지 않는다. `ProblemLabApp.tsx`·`SimpleDialogueApp.tsx`의 표시 부분을 떼어 쓴다.
- 파일 삭제 금지. `git add`·`commit`·`stash` 금지. `memory/**`, `AGENTS.md`는 건드리지 않는다.

## 손댈 파일과 계약

### (1) 학생용 표현 상수 — `packages/app/src/client/diagnostic/wording.ts` (새 파일)

- D-0209 확정본 1절(비틂 14종: 학생용 이름·한 줄 설명), 2절(관계 4갈래: 학생용 이름·한 줄 설명), 3절(단계 다섯 개)을 그대로 옮긴다. 문구를 고치지 않는다.
- 단계 코드 대응: `S1_STEM` 발문, `S2_CHOICE` 선지 해석, `S3_LOCATE` 근거 위치, `S4_INTERPRET` 근거 해석, `S5_JUDGE` 대조.
- 관계 갈래 대응: 내용 → 대상 사이의 관계, 논증 → 주장과 근거, 관점 → 사람·이론 사이의 입장, 흐름 → 글의 흐름. 기타 갈래는 화면에 내지 않는다.
- `OTHER` 비틂: 이름 대신 "그 밖의 함정", 한 줄 설명 없음, 함정 집계·추천에서 뺀다.
- 테스트: 확정본 표의 이름·설명과 상수가 글자 하나까지 같은지(확정본 마크다운을 읽어 대조).

### (2) 결과 자료 보강(백엔드 추가) — `packages/app/src/server/diagnostic/controller.ts`

인계 A의 `result.reading`에는 관계마다 판정 라벨만 있고 갈래가 없다. 화면이 계산하지 않도록 서버가 센다.

- `reading[].paragraphs[]`는 그대로 두고, 지문마다 `counts`를 더한다:
  ```ts
  counts: {
    layers: Record<'요지' | '합성' | '명제', { caught: number; total: number }>,
    branches: Record<'내용' | '논증' | '관점' | '흐름', { caught: number; total: number; wrong: number }>
  }
  ```
- 규칙은 D-0160과 `scripts/aggregate-student-fingerprint.mjs`를 따른다: 첫 차례만, 잡음 = `DIRECT`·`PARTIAL`, 틀림 = `CONTRADICTS` 중 자체 오류만
  (양 끝 노드 중 하나가 같은 차례에서 `CONTRADICTS`면 물려받은 오류라 `wrong`과 `total`에서 뺀다), **문단을 넘는 관계는 세지 않는다**(분모에도 없음).
  층 이름·대응은 스크립트의 `LAYER_OF_KIND`를 따른다.
- 관계 유형: 지도마다 분류 결과 `classify.json`의 `items[].type`, 갈래는 `scripts/run-relation-classify.mjs`의 `BRANCH_OF`.
  분류 파일은 지도와 같은 실험 폴더의 `classify/<지도 폴더>/classify.json`이다(인계 A "초안과 다른 점" 1의 지도 5개):
  세트 E 네 지도는 `docs/experiments/sns-diagnostic-gold-2026-11-05/classify/`, 경마식 보도는 `docs/experiments/analysis-gold-calibration-2026-10-20/classify/horse-race-reporting/`.
  의식과 인지는 (가)·(나) 지도 두 개를 합친다.
- 테스트: 같은 판정 자료를 스크립트 `aggregate`와 새 함수에 넣어 층·갈래 칸의 (D+P, N, 자체 C)가 같은지.
- 결과 화면 전체 합계(요약한 지문 모두)는 화면이 지문별 `counts`를 더해서 낸다.

### (2b) 요약과 틀린 문항 연결(백엔드 추가, J2) — `controller.ts`

- `result.items[]`에 `summaryLink: { status: 'pending' | 'ready' | 'failed', kind: 'MISREAD' | 'MISSED' | 'CAUGHT', paragraphs: number[] } | null`을 더한다.
- **대상 문항**: 첫 선택이 오답이고, `review`가 아니고, 그 지문을 요약했을 때. 그 밖은 `null`.
- **볼 지도 단위**(선지 연결 동결본 `choiceLinkPath`, 문항의 `stemPolarity`로 가름):
  - `SELECT_CORRECT`(적절한 것 고르기): 학생이 고른 선지의 `twisted: true` 조각들의 `twistTargetIds`. 학생이 걸린 비틂이다.
  - `SELECT_INCORRECT`(적절하지 않은 것 고르기): 학생이 고른 선지는 맞는 진술이라 비틂이 없다. 대신 **정답 선지**의 `twisted: true` 조각들의
    `twistTargetIds`를 본다. 학생이 알아채지 못한 비틂이다. 세트 E 16문항 중 7문항이 이 경우다.
  - 의식과 인지는 id 앞의 `가.`/`나.`로 (가)·(나) 지도를 고른다.
- 그중 첫 요약 판정이 있는 단위만 쓴다(명제·합성·요지 노드와 판정한 관계. `TOP`·`CROSS`는 판정하지 않으므로 빠짐).
  남는 단위가 없으면 `null`(예: `source: NONE` 조각뿐, 그 문단을 요약하지 않음).
- **판별**(첫 차례 라벨): 하나라도 `CONTRADICTS` → `MISREAD`. 아니면 하나라도 `ABSENT` → `MISSED`. 모두 `DIRECT`·`PARTIAL` → `CAUGHT`.
  관련 문단 판정이 아직이면 `pending`, 실패면 `failed`.
- `paragraphs`: 쓴 단위의 문단 번호(관계는 양 끝 문단), 중복 없이 오름차순.
- 골드·선지 연결은 표시에만 쓴다(D-0002·D-0162). 판정 입력에 넣지 않는다.
- 테스트: 세트 E 실제 동결본으로 `SELECT_CORRECT`·`SELECT_INCORRECT` 문항 하나씩, 가짜 판정 라벨로 세 종류가 다 나오는지, `source: NONE`뿐인 선지는 `null`인지.

### (2c) 원문 복사 정도 기록(백엔드 추가, J6) — `controller.ts`

- 문단의 첫 학생 발화를 `firstTurns`에 기록할 때 `copyOverlap`을 함께 계산해 저장하고, 사건 `SUMMARY_FIRST_TURN`에도 넣는다. 화면과 `result`에는 내지 않는다.
- 계산: 학생 발화와 그 문단 원문에서 공백을 모두 지운 뒤, 학생 발화의 연속 5글자 묶음 중 문단 원문에 그대로 있는 묶음의 비율(0~1, 소수 셋째 자리).
  학생 발화가 5글자보다 짧으면 `null`. `{ n: 5, windows: 묶음 수, matched: 맞은 수, ratio }`로 저장한다.
- 테스트: 원문을 그대로 붙이면 1, 원문과 겹치지 않는 문장이면 0, 짧은 발화는 `null`.

### (3) 답 입력 중 다시 들어오기(백엔드 추가) — `controller.ts`, `http.ts`

- 지금 `progress`는 `ANSWERING` 지문의 임시 답(`draft`)을 돌려주지 않아, 새로 고침하면 고른 답이 화면에서 사라진다.
- `GET …/:id/passage/:passageId/questions` 추가: `{ questions: DiagnosticItemView[], drafts: Record<questionId, { choiceId, rationale } | null> }`.
  `ANSWERING` 상태에서만, 그 밖에는 409. 정오는 넣지 않는다.

### (4) 화면 — `packages/app/src/client/DiagnosticApp.tsx`와 `packages/app/src/client/diagnostic/*` (새 파일), `main.tsx`에 경로 한 줄

- 경로: `window.location.pathname === '/diagnostic'`이면 `<DiagnosticApp />`. 다른 경로 분기는 바꾸지 않는다.
- API 호출은 `diagnostic/api.ts` 하나에 모은다(`problem-feedback-api.ts` 방식).
- 참가자 id: `localStorage`의 `csat-diagnostic-participant`에 둔다. 읽기·쓰기 모두 try/catch로 감싸고, 실패하면 새 참가자로 시작한다.
  있으면 `GET participant/:id`로 이어 가고, 404면 지우고 새로 시작한다.

**화면 단계와 문구**(학생 문장은 모두 반말)

| 단계 | 보이는 것 | API |
|---|---|---|
| 시작 안내 | "독해력 진단", 4지문 16문항, 시간 제한 없음, "PC·태블릿에서 하는 걸 권해", 시연용 동의 칸("시연용 화면이야. 적은 답과 근거는 진단 분석을 위해 저장돼.") + [시작하기] | `POST participant` |
| 요약 선택 | 지문 제목, [문단별로 요약하고 풀기] / [요약 없이 풀기] | `POST passage/:id/start` |
| 요약 대화 | `SimpleDialogueApp`의 대화 표시를 떼어 씀. 문단 이동 가능, [요약 마치고 문제 풀기] | `summary/respond`·`navigate`·`finish` |
| 문항 답 입력 | 지문 + 문항 하나씩(`ProblemLabApp`의 지문·문항·선지·이미지·근거 입력 칸을 떼어 씀), 근거 칸 아래 [근거 미제출](근거 생략, D-0208 문구의 버튼 이름과 같게). 문항 사이 이동 가능, 답은 고칠 수 있음. 정오는 보이지 않음. 마지막에 [이 지문 답 다 냈어] | `POST item/:qid`, `answers-done` |
| 지문 끝 중간 화면 | 샘플 `Passage.dc.html` 배치: 지문 결과 문장, 문항 칸, 이 지문까지의 위치 범위, [피드백 시작] | `GET summary-card`(pending이면 2초마다 다시) |
| 문항별 피드백 | `ProblemLabApp`의 말풍선·명령 버튼을 떼어 씀. `skippable`이면 [이 문항 건너뛰기](명령 `SKIP`) | `GET/POST item/:qid/feedback` |
| 결과 화면 | 아래 (5) | `GET result`(칸 하나라도 pending이면 3초마다 다시, 최대 10분) |

**지문 결과 문장**(`summary-card`의 숫자로 만듦)

- 기본: "이 지문의 {total}문항 중 {correct}개를 맞혔어."
- 근거를 쓴 문항이 있으면: " 근거를 쓴 {rationaleDenominator}개 중 {supported}개가 적절했어."
- `omitted > 0`이면 괄호로 "({omitted}개는 근거 생략)", `checking > 0`이면 "({checking}개는 확인 중이야)". 둘 다면 쉼표로 잇는다.
- 예: "이 지문의 5문항 중 4개를 맞혔어. 근거를 쓴 4개 중 3개가 적절했어(1개는 근거 생략)."

**시간 재기**(인계 A 계약: `solveMs`에 근거 입력 시간 없음, `rationaleMs`는 생략이면 `null`)

- 문항이 화면에 보이는 동안만 잰다(다른 문항으로 가거나 탭이 숨으면 멈춤, `visibilitychange`).
- 근거 칸에 포커스가 있는 동안은 `rationaleMs`에, 나머지는 `solveMs`에 더한다. 같은 문항을 다시 열면 이어서 더한다.
- [근거 미제출]을 고르면 `rationaleMs = null`. 둘 다 0 이상 정수로 보낸다.

### (5) 결과 화면 — `packages/app/src/client/diagnostic/ResultView.tsx` (새 파일)

샘플 `Main.dc.html`의 배치와 순서를 따른다. 한 페이지, 탭 없음. 휴대폰 폭(390px)에서 ①이 한 화면에 들어간다.

**① 내 위치**(`result.position`)
- 큰 글씨 "{grade.best}~{grade.worst}등급"(같으면 "{n}등급"), 작은 글씨 "수능 기준 환산 추정".
- 등급 띠(1~9) 위에 범위 막대(`percentile.low`~`high`). 분포 곡선은 정규분포 모양 SVG 하나(장식, `aria-hidden`).
- "지문을 풀수록 좁아진 범위": `byPassage` 지문마다 막대 하나.
- 설명 한 줄: "시간 제한 없이 근거를 쓰며 푼 결과를 수능 응시자 분포에 맞춰 환산해 본 추정치야. 문항 난이도는 메가스터디 이용자 정답률로 정했어."
- [문제 더 풀고 범위 좁히기]는 넣지 않는다(연결할 세트 없음, J5와 같은 이유).

**② 문제 풀이 결과**
- 숫자 3개: 정답 {맞힌 수}/{16}, 적절한 근거 {SUPPORTED 정답 수}/근거 쓴 {분모}, 근거 생략 {n}문항. `review` 문항과 확인 중 문항은 근거 분모에서 뺀다(인계 A 규칙과 같음).
- 어긋난 단계(경향): `steps.denominator > 0`이면 "근거를 살펴본 {denominator}문항 중 {가장 많은 단계 수}개가 {단계 이름} 단계에서 어긋났어." 와 단계 다섯 개 막대(개수).
  같은 수가 둘 이상이면 이름을 "근거 위치·근거 해석"처럼 잇는다. 해석 문장(샘플의 "원문은 찾았는데…")은 쓰지 않는다. `denominator = 0`이면 칸을 숨긴다.
- 걸린 함정: `twists.counts`를 많은 순으로 꼬리표(학생용 이름 + 횟수). `OTHER`는 "그 밖의 함정"으로 맨 뒤.
- 문항별 칸: 지문별로 문항 번호 칸. 정답은 채운 칸, 오답은 테두리 칸, `review`는 점선 칸("확인 중"). 누르면 아래 카드가 펼쳐진다.
- 문항 카드(펼침):
  | 칸 | 보이는 것 |
  |---|---|
  | 제목 | "{지문 제목} {번호}번 · {①~⑤}을/를 골랐어" + 정답/오답 표시 |
  | 정답의 질(정답일 때) | `SUPPORTED` "근거도 적절했어", 그 밖 "정답이야. 근거는 조금 더 다듬을 수 있어", 근거 생략 "근거 생략" |
  | 같은 선지 비율 | "{①}을 고른 비율 {a}% · {b}%", "이 문항 정답률 {c}% · {d}%", 작은 글씨 "메가스터디 이용자 기준 · 화법과작문 · 언어와매체" |
  | 걸린 함정(오답) | "걸린 함정 · {학생용 이름}" + 한 줄 설명 + (J4) 바뀐 내용 문장이 있으면 그 문장. `twist`가 여러 개면 모두 |
  | 어긋난 단계 | `thoughtDiagnosis.firstFailedStep`이 있으면 "어긋난 단계 · {단계 이름}" |
  | 내 근거와 원문 | `evidence.student`와 `evidence.source[]`(위치 + 인용)를 나란히 |
  | 피드백 뒤 표시 | `afterFeedback.corrected` "피드백으로 고쳤어", `skipped` "건너뜀" (작게, 분석 칸과 떨어뜨림) |
- `review: true` 문항 카드: 제목과 "이 문항은 우리가 한 번 더 확인하고 있어." 한 줄, 같은 선지 비율만. 정답 위치·함정·근거는 보이지 않는다(D-0208 5).

**③ 독해 패턴**(요약한 지문이 있을 때만. 없으면 "요약을 고른 지문이 없어서 이 칸은 비어 있어.")
- 머리말: "요약한 지문 {n}개({제목들}) 기준 · 첫 요약만".
- 층(J1): "문단 요지는 {total}곳 중 {caught}곳, 묶음은 …, 세부 내용은 …을 잡았어." (`요지`·`합성`·`명제` → 문단 요지·묶음·세부 내용)
- 관계 4갈래: 갈래마다 학생용 이름, 한 줄 설명(작게), "{total}곳 중 {caught}곳을 잡았어" 막대(개수). J3: `wrong > 0`이면 "{wrong}곳은 지문과 다르게 이었어". `total = 0`인 갈래는 숨긴다.
- 요약과 틀린 문항(J2, `summaryLink`가 있는 오답 문항마다 한 줄, 문항 순서대로):
  - `MISSED`: "{지문 제목} {번호}번에서 확인해야 했던 내용({k}문단)은 요약에서 빠졌던 곳이야."
  - `MISREAD`: "{지문 제목} {번호}번에서 확인해야 했던 내용({k}문단)은 요약에서도 지문과 다르게 이해했던 곳이야."
  - `CAUGHT`: "{지문 제목} {번호}번에서 확인해야 했던 내용({k}문단)은 요약에서 잡았는데 문항에서는 틀렸어. 선지를 읽고 지문과 대조하는 쪽을 살펴볼 만해."
  - 지도 단위의 글(명제 문장)은 보이지 않는다. 개발용 문장이라서다. 문단 번호만 쓴다.
  - 대상 문항이 없으면 이 칸을 숨긴다.
- 강함/보통/약함 같은 평가어는 쓰지 않는다(D-0209 3).

**추천**(J5)
- 함정 집계에서 `OTHER`를 뺀 가장 많은 비틂 하나로 문장을 고른다. 같은 수면 확정본 표 순서로 앞의 것.
- 대응표 `packages/pipeline/fixtures/experiments/sns-diagnostic/recommendation-map.json`(새 파일, 빈 형식 `{ "schemaVersion": "sns-recommendation-map-v1", "byTwist": {} }`)에
  그 비틂 항목이 있으면 "비슷한 구조의 지문으로 {세트 이름}을 풀어 보면 좋아."를 덧붙인다. 대응표 읽기는 서버 `result`에 `recommendation: { twistType, setNames: string[] } | null`로 더한다.

### (6) 학생용 "바뀐 내용" 문장 파일 — 읽기만 (J4)

- 경로: `packages/pipeline/fixtures/experiments/sns-diagnostic/twist-student-text.json`(새 파일, 이번에는 빈 형식).
  `{ "schemaVersion": "sns-twist-student-text-v1", "items": { "<questionId>:<choicePosition>": ["<문장>", …] } }`.
- 서버 `result.items[].twist[]`에 `studentText: string | null`을 더한다(같은 문항·선지의 n번째 비틂 조각 ↔ 배열 n번째). 없으면 `null`.

## 완료 조건

- [ ] `npm run typecheck` 오류 0.
- [ ] `npm test`: 기존 실패 2건(`boundary.test.ts`의 `student-state.ts`, `axis-architecture-experiment.test.ts`) 말고 실패 없음.
- [ ] (1) 상수 ↔ 확정본 대조 테스트 통과.
- [ ] (2) 집계 동치 테스트: 스크립트 `aggregate`와 층·갈래 칸이 같다(세트 E 지도 하나 이상, 문단을 넘는 관계·물려받은 오류가 들어간 가짜 판정 포함).
- [ ] (2b)·(2c)·(3)·(5)·(6) 서버 추가 필드 테스트(가짜 평가기).
- [ ] 화면 순수 계산(지문 결과 문장, 등급 문구, 단계 경향 문장, 함정 정렬, 추천 고르기, 시간 누적)을 `.ts` 함수로 떼고 단위 테스트한다.
- [ ] 가짜 평가기로 서버를 띄워(`CSAT_DIAGNOSTIC_ENABLED=1`, 외부 전송 없는 테스트 지원 `test-support.ts` 방식) Playwright로 한 번 끝까지:
      시작 → 지문 1 요약 선택·대화 → 문항 답(근거 있음·생략 섞음) → 정오 안 보임 → 중간 화면 → 피드백·건너뛰기 → 지문 2~4 요약 없이 → 결과 화면에 ①②③·추천이 보임.
      새로 고침 뒤 이어 가기 한 번. 화면 글자에 영문 대문자 코드(`[A-Z_]{4,}`)가 없음을 확인. 데스크톱 폭과 390px 폭 화면 사진을 남긴다.
- [ ] 기존 경로(`/problem/lab`, `/dialogue/lab`, `/dialogue/lab/analysis`)가 그대로 열린다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 특히 멈출 곳:
  - `ProblemLabApp`·`SimpleDialogueApp`의 표시 부분을 떼어 내다가 기존 화면 동작이 바뀌어야 하는 경우.
  - (2) 집계가 스크립트와 맞지 않는 경우(스크립트를 고쳐 맞추지 말 것).
  - 세트 E 분류 파일에 지도 관계 id가 빠진 경우.
  - 학생용 문구가 확정본에 없는데 필요해진 경우(새 문구를 지어내지 말고 목록으로 보고).

## 공개 전 할 일(이번 범위 밖, 잊지 않도록)

- J4: 세트 E "바뀐 내용" 학생용 문장 43선지(조각 51개) 생성·사람 손질 → `twist-student-text.json`. 생성은 외부 전송 별도 승인.
- J5: 비틂 → 추천 세트 대응표 내용(사람이 고름), "훈련 서비스 알아보기" 연결 주소.
- J6: 쌓인 `copyOverlap` 값으로 복사 판별 기준 정하기.
- 개인정보(설계 초안 4절 3), 공유·이어 하기 링크.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 서버: `packages/app/src/server/diagnostic/{controller,content,http,store}.ts`(수정), `reading.ts`(새, 층·갈래 개수·요약 연결·복사 정도·추천 고르기), 테스트 `reading.test.ts`(새)·`controller.test.ts`·`http.test.ts`(추가).
  - 자료: `packages/pipeline/fixtures/experiments/sns-diagnostic/{recommendation-map,twist-student-text}.json`(빈 형식).
  - 화면: `packages/app/src/client/DiagnosticApp.tsx`, `main.tsx`(경로 한 줄), `client/diagnostic/*`(wording·logic·api·types·Pages·SummaryDialogue·AnswerScreen·FeedbackScreen·QuestionPanes·ResultView·diagnostic.css, wording.test·logic.test).
  - e2e: `packages/app/e2e/diagnostic-flow.spec.ts`.
- 테스트 결과: `npm run typecheck` 오류 0. `npm test` 1641 통과·2 실패(기존 2건: `boundary.test.ts`의 `student-state.ts`, `axis-architecture-experiment.test.ts`). Playwright(가짜 평가기) 2개 통과: 끝까지 한 번 + 기존 경로(`/dialogue/lab`, `/problem/lab`, `/dialogue/lab/analysis`) 열림.
  화면 사진: `/private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/eec49826-b351-4bbb-a3d4-8bfc863b2bab/scratchpad/diagnostic-screens/` (01~08, 데스크톱·390px).
- 남은 문제:
  - 인계에 없던 학생용 문구(필요해서 씀, 확인 요망): 지문 n/N, 이전 문항·다음 문항·접기·다음 지문·결과 보기·다음 문단 버튼, "이 지문까지의 위치", "이번에 걸린 함정: {이름}", "채운 칸은 정답, 테두리 칸은 오답, 점선 칸은 확인 중이야…", 요약 화면의 "이 문단은 끝났어."·"이 문단의 중심 내용과 관계를 자기 말로 써 봐."·"내 생각을 적어 봐…"·"내 답"·"문항 이동", 탭 이름 "답".
  - 서버 `progress`에 `set`(지문 제목·문항 id) 필드 추가(필드 추가만).
  - 요약 대화는 서버 재시작 뒤 이어 가면 대화 내용은 새 세션(첫 발화 기록은 유지).
  - e2e는 요약을 첫 문단만 해서 요약 연결 문장은 단위·서버 테스트로만 확인.
