# 인계: 진단 결과 화면 1단계 구현 (새 생성 없이 만들 수 있는 부분)

- 날짜: 2026-11-17
- 작성: Claude (웹 스레드 "진단평가 최종 결과 분석 설계 논의")
- 실행: CLI 코드 에이전트
- 설계 근거: `docs/handoffs/2026-11-17-diagnostic-result-solve-section-design.md` (아래 "설계 n절"은 이 문서의 절 번호). 샘플 캔버스 https://claude.ai/artifact/9rwTAsAXj5Qto3eTQpe1bP , 전체 이미지 `docs/handoffs/2026-11-17-diagnostic-result-full-sample.png`, 눈금 이미지 `docs/handoffs/2026-11-17-diagnostic-result-position-ticks.png`
- 함께 처리: `docs/handoffs/2026-11-16-diagnostic-result-labels.md` (라벨 인계서). 그 문서의 "미확정" 두 항목은 설계 문서에서 확정됨: 점수 칸 이름 = "처음 고른 답 기준", 독해 패턴 안내 = "처음 쓴 요약 기준이야. 질문과 교정으로 보완한 내용은 넣지 않았어.", 정답률 = "화작 a% · 언매 b%".

## 핵심 원칙 (Ghootae)

학생이 **라벨이 아니라 내용**을 보고 자기 실수를 알 수 있어야 한다. 함정 이름·단계 이름만 있는 표시는 만들지 않는다. 카드는 원문을 다시 보지 않아도 "왜 틀렸는지" 알 수 있게, 선지 구절과 그것을 반박하는 원문 문장을 짝으로 보여 준다.

## 1단계와 2단계의 경계

모델 호출(새 생성)이 필요한 것은 2단계다. 1단계는 이미 저장된 자료(첫 선택·근거, 첫 근거 판정, 선지 연결 frozen 파일, 골드 지도, 메가스터디 수치, 첫 요약 원문)만 쓴다. 2단계 자리는 **비워 두거나 아래 대체 표시**를 쓰고, 나중에 끼워 넣을 수 있게 필드만 열어 둔다.

| 2단계로 미루는 것 | 1단계 대체 |
|---|---|
| 카드 "왜 틀렸을까" 문단(설계 3절 4) | 선지 연결의 `choiceQuote`(선지 구절) ↔ `evidenceQuote`(원문, 굵게) 짝을 그대로 보여 줌. 설명 문장 없음 |
| "이 함정에 걸렸어" 표시(설계 3절 5) | 표시하지 않음 |
| 맨 위 "두 번 이상 나온 실수" 묶음(설계 8절) | "가장 먼저 볼 것" 사례 1개만 (규칙으로 고름, 아래 1) |
| 추천 칸의 실수 기반 문구(설계 9절) | 서비스 안내 한 줄만 |
| ③ 사례의 한 줄 설명(설계 7절 3) | 내 요약 ↔ 지문 두 줄만 |
| 문항별 자기 점검 버튼 문구(설계 11절) | 공통 문구 3개(아래 3-6) |
| 진단 4지문 출제자 전략 글(설계 12절 A) | 글이 있는 문항에만 버튼을 보임. set-e는 아직 없으므로 버튼이 안 보이는 게 정상 |

## 목표 (끝나면 참이어야 하는 것)

화면 순서가 **맨 위 요약 → ① 내 위치 → ② 문제 풀이 → ③ 독해 패턴 → 추천**이다(설계 10절).

### 1. 맨 위 요약 (설계 8절)
- 첫 줄: `처음 고른 답 기준 정답 n / 16 · 근거까지 맞은 정답 n · 추정 n등급`. 등급이 아직 없으면(position pending) 등급 부분만 빼거나 "등급 계산 중".
- "가장 먼저 볼 것" 사례 1개. 고르는 순서: ① 학생 근거가 있는 오답 중 선지 연결 짝(`choiceQuote`·`evidenceQuote`)이 있는 문항 → ② 요약에서 다르게 이은 곳(③의 CONTRADICTS 사례) → ③ 근거가 부족한 정답(`WEAK_CORRECT`/`ERROR_CORRECT`). 같은 순위 안에서는 지문·문항 순서가 앞선 것.
- 사례 상자: 출처 줄("문제 풀이 · 지문 n번" / "요약 · 지문 n문단"), 지문(또는 선지) 문장, "너는 …" 문장(학생 근거 또는 첫 요약), 해당 카드·사례로 가는 링크(같은 페이지 앵커, 카드는 열린 상태로 스크롤).
- 사례가 하나도 없으면(전부 정답·근거 충분 등) 이 칸은 첫 줄만 둔다.
- 2단계에서 묶음이 들어올 자리: 결과 응답에 `summaryGroups: null`을 두고, 화면은 null이면 "가장 먼저 볼 것"으로 대체.

### 2. ① 내 위치 (설계 6절·13절)
- 지금 구현 유지(단일 등급 + 확률 + 지문별 막대). 범위("2~4등급") 표시는 넣지 않는다.
- `GradeBar`에 등급 경계 9칸 구분선(흰 선)과 막대 아래 눈금, 칸 가운데 등급 이름. 지문별 작은 막대에도 같은 경계선을 넣고, 맨 아래에 1~9 등급 축 한 줄.

### 3. ② 문제 풀이 (설계 2·3절)
3-1. **분해 막대**가 기존 숫자 칸 3개(`diag-stats3`), "어긋난 단계" 막대, "고른 오답 선지의 함정" 태그, 문항별 격자(`diag-cellgrid`)를 **대체**한다.
- 맨 위: "처음 고른 답 기준 정답 N / 16. 코칭 뒤 고쳐 고른 답은 점수에 넣지 않았어."
- 줄 1 정답 | 오답, 줄 2 근거 쓴 정답 / 근거 없이 낸 정답 | 근거 쓰고 틀림 / 근거 없이 틀림, 줄 3 정답 쪽 = 근거까지 정확 / 부족·틀린 근거 / 확실 / 확신 없이 / 소거법(칸 안에 문항 번호), 오답 쪽 = **문항마다 한 칸**. 칸 너비는 문항 수에 비례.
- 판정 중·검토 중·판정 불가 정답은 정답 쪽 회색 칸 하나("확인 중").
- `qualityTiers === 2`이면 줄 3 정답 쪽을 "근거가 확인되는 정답 / 그 밖"으로.
- 맨 아래 칸(문항 번호)을 누르면 그 문항 카드가 열린다. 정답 쪽 칸도 카드를 연다.
- 모바일(390폭): 얇은 비율 막대 하나 + 정답 블록·오답 블록을 세로로 쌓는다. 버튼은 최소 44px. hover로만 보이는 설명 금지.

3-2. **문항 카드**를 다시 짠다. 공통 순서:
1. 제목 `지문 n번 · ⓝ 골랐어` + 정답/오답
2. 발문 한 줄, 고른 선지 전문에서 `choiceQuote`를 굵게
3. 고른 비율·정답률: `화작 a% · 언매 b%` (메가스터디 이용자 기준 주석은 한 번만)
4. **함정 짝**(오답만): 선지 연결 part마다 "선지: … **구절** …" ↔ "원문: **evidenceQuote**". 함정 이름(twistType 문구)은 작은 머리말로만, 단독 표시 금지.
5. 내 근거(있으면). 근거가 있는데 오류 판정 원문 근거(`sourceEvidence`)가 있으면 "원문은 이렇게 말해" 아래 인용.
6. 요약 연결 한 줄(기존 `summaryLinkSentence`를 ③에서 이 자리로 옮김, 설계 7절 4)
7. "문항으로 돌아가 출제자 설명 보기 →": 그 문항의 출제자 전략 글이 있을 때만. lab 모드의 3단(원문·문항·말풍선) 출제자 전략 화면을 재사용해 그 문항으로 이동. 없으면 버튼을 그리지 않는다. "이 문항 다시 보기" 버튼은 만들지 않는다.

3-3. **경우별 차이**
- `SELECT_INCORRECT`(적절하지 않은 것 고르기) 오답: 고른 선지는 맞는 진술이므로 "고른 선지는 지문과 맞는 말이야" + 원문 근거, 이어서 **"네가 놓친 진짜 틀린 선지"** = 정답 선지 전문 + 그 선지의 함정 짝. 서버 `resultItem`의 twist가 지금은 고른 선지 것만 주므로, 정답 선지 twist(`answerTwist`)를 따로 내려준다(`summaryLinkFor`가 이미 같은 분기를 씀).
- 근거 부족 정답: "답은 맞았는데 근거에서 빠진 것" 머리말 + 결정적 원문(`sourceEvidence`).
- 근거 없이 틀림: 함정 짝 + "어디서 헷갈렸는지는 몰라" + 3-6 버튼.
- 검토 중 문항(`review`): 지금처럼 "한 번 더 확인하고 있어".

3-4. **기호 풀이**(설계 3절 2): 카드·사례·맨 위 요약 어디서든 ㉠·㉡·(가)·(나)·ⓐ·ⓑ 같은 기호가 처음 나오면 괄호로 최소 내용을 붙인다. 예: ⓑ(후보 초청 제한이 위헌이라는 소수 의견). 1단계는 **지문별 손 작성 사전**으로 한다: `docs/experiments/sns-diagnostic-gold-2026-11-05/symbol-gloss/<passageId>.json` = `{ "ⓑ": "후보 초청 제한이 위헌이라는 소수 의견", ... }`. CLI가 set-e 4지문의 원문·문항에서 기호를 모두 찾아 **초안을 쓰고**, 결과 보고에 표로 붙여 Ghootae 검토를 받는다(내용 판단이므로 초안 표시). 표시 함수는 문자열에서 기호를 찾아 첫 등장에만 풀이를 붙이고, 사전에 없는 기호는 그대로 두되 테스트에서 set-e 기호가 모두 사전에 있는지 확인.

3-5. 없앨 것: `stepTendency`·`twistTags`·`cardStepName` 표시와 "어긋난 단계 · …" 줄, 기존 `recommendationLines`(함정 개수 추천). 서버의 `steps`·`twists.counts` 계산은 지우지 말고 화면에서만 뺀다(분석 자료로 남김). 쓰이지 않게 된 클라이언트 함수와 테스트는 정리.

3-6. **자기 점검 버튼**(근거 없이 틀린 오답 카드, 설계 11절): "어디서 헷갈렸어?" 아래 버튼 3개, 1단계 공통 문구 = "선지 내용을 잘못 이해했어" / "지문 내용을 잘못 기억했어" / "찍었어"(이 문구는 웹 스레드의 임시안. 2단계에서 문항별 문구로 바뀜). 한 번 누르면 선택 표시, 다시 고를 수 있음. 저장: 참가자 문항 상태에 `selfCheck: { choice: string; at: string } | null` 추가, POST 엔드포인트 하나(`/diagnostic/:participantId/items/:questionId/self-check`), 이벤트 기록(`appendEvent`). 결과 응답 `ResultItem.selfCheck`로 되돌려 새로고침 후에도 유지.

### 4. ③ 독해 패턴 (설계 7절, 샘플 "③ 독해 패턴 (PC)")
- 안내: "처음 쓴 요약 기준이야. 질문과 교정으로 보완한 내용은 넣지 않았어." (기존 "첫 요약만" 대체)
- 점수 칸 2개: **문단 요지**(PARAGRAPH_GIST) n / m곳, **내용 묶음**(COMPOSITE) n / m곳. 막대 포함.
- 세부(명제)는 점수 칸 없이 한 줄: "참고 · 요약에 함께 담은 세부 내용 n곳 (지문 전체 m곳). 요약은 세부를 추려 내는 일이라 이 수가 적다고 모자란 건 아니야."
- 관계 4갈래(대상 사이의 관계 / 사람·이론 사이의 입장 / 주장과 근거 / 글의 흐름 — 기존 BRANCH_WORDING 이름 사용)를 **모두 같은 틀**로: 이름+설명, 막대, "m곳 중 n곳 · k곳 다르게". 그 아래 사례 기본 1개(CONTRADICTS 우선, 없으면 빠뜨린 곳 MISSING), 나머지는 "사례 더 보기"로 펼침. 사례가 없으면 "이 갈래는 요약에서 모두 잡았어".
- 사례 상자: 머리말 "다르게 이음 / 빠뜨림 · 지문 이름 n문단 · 관계 유형 이름", "내 요약" = 그 문단의 첫 요약 원문(`passages.firstTurns[paragraphId].text`), "지문" = 관계 양 끝 단위의 골드 원문(관계를 나타내는 연결 표현은 가능하면 굵게; 어렵다면 문장 전체를 그대로). 설명 줄은 2단계.
- 서버: `resultReading`이 갈래별 사례 목록(`cases: { branch, kind: 'CONTRADICTS'|'MISSING', paragraphId, paragraphPosition, relationType, studentText, sourceTexts[] }[]`)을 함께 내려준다. 집계 규칙(`countParagraph`)과 같은 제외 규칙(문단 넘는 관계, 물려받은 CONTRADICTS, 기타 갈래)을 그대로 따른다.
- 요약 ↔ 틀린 문항 연결 줄은 ③에서 지우고 ② 카드로 옮긴다(3-2의 6).

### 5. 추천
- 함정 개수 기반 추천을 지우고, 서비스 안내 한 줄만: "매 지문 이런 분석을 받으며 훈련할 수 있어." (2단계에서 실수 묶음 기반 문구가 위에 붙음.)

## 범위 밖

- 모델 호출이 필요한 모든 생성(위 2단계 표). 출제자 전략 글 생성(작업 A)도 이 인계와 별개.
- 판정·집계 로직, 등급 계산, 피드백 과정.
- 지문 결과 화면(`Pages.tsx`)은 정답률 라벨 정리만.

## 손댈 파일과 계약

- `packages/app/src/client/diagnostic/ResultView.tsx`: 화면 순서, TopSummary·Position·Solve(분해 막대)·Card·Reading·Recommendation 재구성. 파일이 커지면 `ResultSolve.tsx`·`ResultReading.tsx`로 나눠도 됨.
- `packages/app/src/client/diagnostic/GradeBar.tsx`: 경계선·눈금·축.
- `packages/app/src/client/diagnostic/logic.ts`·`wording.ts`: 분해 막대 계산(순수 함수), "가장 먼저 볼 것" 고르기, 기호 풀이 함수, `percentPair` 화작·언매, 불필요 함수 정리.
- `packages/app/src/client/diagnostic/types.ts`·`api.ts`: `ResultItem`에 `stem`, `chosenText`, `answerText`, `stemPolarity`, `twist`의 part별 `choiceQuote`·`evidenceQuote`, `answerTwist`, `selfCheck`, `strategyAvailable`; `ResultView`에 `summaryGroups: null`, `reading[].cases`, `reading[].counts`의 세부 기준 값.
- `packages/app/src/server/diagnostic/controller.ts`: `resultItem`(위 필드), `resultReading`(cases), 자기 점검 저장. `content.ts`: 선지 연결에서 `choiceQuote`·`evidenceQuote` 로드, 기호 사전 로드. `store.ts`: `selfCheck`. `http.ts`: 엔드포인트.
- `packages/app/src/client/diagnostic/diagnostic.css`: 새 배치, 모바일.
- 테스트: `logic.test.ts`, `wording.test.ts`, `controller.test.ts`, `http.test.ts`, `reading.test.ts`, e2e가 있으면 결과 화면 문자열.
- 새 데이터: `docs/experiments/sns-diagnostic-gold-2026-11-05/symbol-gloss/*.json` (초안, 검토 대상).

## 완료 조건

- [ ] 화면 순서가 맨 위 요약 → ① → ② → ③ → 추천.
- [ ] ②에서 기존 숫자 칸 3개·어긋난 단계·함정 태그·격자가 사라지고 분해 막대가 그 자리에 있다. 오답 쪽은 문항마다 한 칸.
- [ ] 오답 카드에 선지 구절 ↔ 원문 짝이 보이고, 함정 이름만 단독으로 나오는 곳이 없다.
- [ ] `SELECT_INCORRECT` 오답 카드에 "네가 놓친 진짜 틀린 선지"와 그 함정 짝이 보인다(플라스틱 8번으로 확인).
- [ ] 카드·사례에 나오는 set-e 기호가 모두 첫 등장에 풀이가 붙는다(테스트).
- [ ] ③ 점수 칸은 요지·묶음 둘, 세부는 참고 한 줄, 4갈래가 같은 틀 + 사례 1개 + 더 보기.
- [ ] 정답률이 어디서나 "화작 a% · 언매 b%".
- [ ] 자기 점검 버튼 값이 저장되고 새로고침 뒤에도 남는다(테스트).
- [ ] `npm run typecheck` 통과, `npx vitest run` 통과. 알려진 무관 실패 2건(`boundary.test.ts`의 `server/student-state.ts` fs import, `axis-architecture-experiment.test.ts`의 `.omc/adhoc/...json` 부재)은 그대로 둬도 됨.
- [ ] 개발자 모드 시뮬레이션 자료(2026-11-13 전체 시뮬레이션 참가자 등)로 결과 화면을 띄워 PC 1280폭·모바일 390폭 전체 캡처를 `docs/handoffs/2026-11-17-diagnostic-result-impl-phase1-pc.png`, `...-mobile.png`로 저장.

## 중단·보고 조건

- 외부 API·모델 호출이 필요해지면 멈춘다(이 인계는 호출 0회).
- 설계 문서와 코드·결정 기록이 충돌하거나, 위 자료가 저장돼 있지 않아 대체 표시도 못 하는 칸이 생기면 멈추고 무엇이 없는지 보고한다. 설계를 임의로 바꾸지 않는다.
- 선지 연결 frozen 파일에 `choiceQuote`/`evidenceQuote`가 비어 있는 오답 선지가 있으면 목록을 보고하고, 그 카드는 원문 근거(`sourceEvidence`)로 대체한다.

## 커밋

테스트가 통과하면 `experiment/problem-solving-mvp`에 커밋·푸시한다. 이 인계서와 함께 아직 커밋되지 않은 설계 문서 변경(8~13절), 이미지 두 장도 같이 커밋한다.

## 결과 보고 (실행 후 작성)

실행: executor 하위 에이전트(sonnet), 검토: 코드 에이전트(diff·테스트 재실행·캡처 확인). 모델·외부 API 호출 0회.

- 변경 파일:
  - 서버(`packages/app/src/server/diagnostic/`): `controller.ts`, `content.ts`, `store.ts`, `http.ts`, `reading.ts` + 테스트 `controller.test.ts`, `content.test.ts`, `http.test.ts`, `reading.test.ts`
  - 클라이언트(`packages/app/src/client/diagnostic/`): 새 파일 `ResultShared.tsx`, `ResultSolve.tsx`, `ResultReading.tsx`; 고친 파일 `ResultView.tsx`, `GradeBar.tsx`, `logic.ts`, `types.ts`, `api.ts`, `Containers.tsx`, `Pages.tsx`, `diagnostic.css`; 테스트 `logic.test.ts`
  - e2e: `packages/app/e2e/diagnostic-flow.spec.ts`(결과 화면 문자열·순서)
  - 새 데이터: `docs/experiments/sns-diagnostic-gold-2026-11-05/symbol-gloss/*.json` 4개(초안)
- 테스트 결과:
  - `npm run typecheck` 통과, `npm run typecheck:client` 통과
  - `npx vitest run`: 1754 통과 / 2 실패(알려진 무관 실패 2건: `boundary.test.ts`, `axis-architecture-experiment.test.ts`)
  - `npx playwright test packages/app/e2e/diagnostic-flow.spec.ts` 2 통과(executor 실행; 첫 실행의 ③ 문구 검사 실패는 문구 수정 뒤 통과)
- 캡처: `docs/handoffs/2026-11-17-diagnostic-result-impl-phase1-pc.png`(1280폭), `...-mobile.png`(390폭, 가로 스크롤 없음). 자료는 2026-11-13 전체 시뮬레이션 세션 `a5a1f4b3-…`, 플라스틱 8번 카드(적절하지 않은 것 고르기 오답)를 열어 둔 상태.
- 기호 풀이 초안 표 (지문, 기호, 풀이) — **내용 판단이므로 Ghootae 검토 필요**:

| 지문 | 기호 | 풀이 |
|---|---|---|
| 의식과 인지 | (가) | 기능주의와 확장 인지 이론을 다룬 글 |
| 의식과 인지 | (나) | 지각을 다룬 글 |
| 의식과 인지 | ㉮ | 학생 정리의 첫째 빈칸, 설의 비판에서 서로 같지 않다고 한 두 대상 |
| 의식과 인지 | ㉯ | 학생 정리의 둘째 빈칸, 지각을 주장하는 입장이 지각을 무엇이라고 보는지 |
| 의식과 인지 | ㉠ | 확장된 인지 과정은 인지 주체의 것일 때에만 성립할 수 있다는 주장 |
| 의식과 인지 | ㉡ | 지각과 감각은 서로 구분되지 않는다는 주장 |
| 의식과 인지 | ⓐ~ⓔ | 밑줄 친 '본다' / '일어나는' / '따르면' / '알아보기' / '만지는' |
| 경마식 보도 | ㉠ | 경마식 보도 |
| 경마식 보도 | ㉡ | 공직선거법의 선거 방송 토론회 규정, 초청 대상을 한정한 규정 |
| 경마식 보도 | ㉮ | 공직선거법 |
| 경마식 보도 | ㉯ | 선거방송심의에 관한 특별규정 |
| 경마식 보도 | ㉰ | 선거여론조사보도준칙 |
| 경마식 보도 | ⓐ | 초청 대상 제한은 합리적이라는 다수 의견 |
| 경마식 보도 | ⓑ | 후보 초청 제한이 위헌이라는 소수 의견 |
| 플라스틱 | ㉠ | 에틸렌 분자들이 사슬을 이뤄 폴리에틸렌이 되는 중합 과정 |
| 플라스틱 | ㉮ | 가지를 친 구조의 사슬들 |
| 플라스틱 | ㉯ | 직선형 구조의 사슬들 |
| 플라스틱 | ⓐ | 밑줄 친 '접할' |
| 오디오 | (없음) | 기호 없음(`{}`) |

  - 판단 필요: ㉮·㉯(의식과 인지)는 빈칸 기호라 정답 내용을 알려 주지 않도록 일부러 모호하게 씀. 한 단어 밑줄(ⓐ~ⓔ 등)은 어느 문항에도 안 나와 화면에 안 보임. 표시 형식은 `ⓑ(풀이)`, 괄호 기호는 `(가)[풀이]`.
- 비어 있던 선지 연결 목록(`choiceQuote`는 있고 `evidenceQuote`만 빔, 모두 "없는 내용 덧붙임" 비틂이라 원문이 없는 것이 정상. 카드는 선지 구절만, 원문 줄 생략):
  - 오디오 14번 ③ `ADDED_METHOD`(정답 선지): "각각 압축의 변수라고 언급한 점"
  - 오디오 16번 ③ `ADDED_CONTENT`: "므로"
  - 의식과 인지 14번 ② `ADDED_CONTENT`: "세계를 구성하는"
  - 의식과 인지 15번 ① `ADDED_CONTENT`: "감각과 지각 모두 물질세계에서 이루어지기 때문에"
- 남은 문제(인계서와 달리 한 점 포함):
  - 자기 점검 엔드포인트: 인계서의 `/diagnostic/:participantId/items/:questionId/self-check` 대신 기존 라우팅에 맞춰 `POST /api/diagnostic/participant/:id/item/:questionId/self-check`. 근거 없이 틀린 문항에만 받고(아니면 409), 값은 마지막 것만 남으며 사건 `SELF_CHECK`는 누를 때마다 기록.
  - ③ 사례 머리말의 "관계 유형 이름": 유형별 학생용 한국어 이름이 자료에 없어 갈래 이름을 씀(`relationType` 코드는 데이터로만 내려감). 유형별 이름이 필요하면 결정 필요.
  - 사례 필드에 `paragraphLabel`(예: "(나) 3문단")을 더함((가)(나) 지문에서 `paragraphPosition`만으로 모호).
  - 해당 건수 0인 갈래도 같은 틀로 표시("이번 요약에서는 판단할 곳이 없었어.").
  - "출제자 설명 보기" 링크는 `/problem/lab?questionId=…`로 가며 진단 참가자 풀이 기록을 잇지는 않음. set-e는 전략 글이 없어 버튼이 안 보이는 게 정상이고, 버튼이 실제로 나오는 화면 경로는 확인 못 함(서버 `strategyAvailable`만 테스트). 2단계에서 다시 볼 것.
  - 서버의 `steps`·`twists.counts`·`recommendation` 계산은 남겼고 화면에서만 뺌. 안 쓰게 된 클라이언트 함수·테스트·CSS 정리.
  - 라벨 인계서(`2026-11-16-diagnostic-result-labels.md`)와 `TEMPLATE.md`의 기존 미커밋 수정은 이 커밋에 넣지 않음.
