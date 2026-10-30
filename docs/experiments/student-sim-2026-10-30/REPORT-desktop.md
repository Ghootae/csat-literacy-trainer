# `/dialogue/lab` 학생 역할 시뮬레이션 — 검토 반영본 (Desktop 논의용, 2026-10-30)

## 실행 조건 (측정)

- 실행: 코드 에이전트(다른 세션)가 Playwright로 시스템 Chrome(headless)을 몰아 `http://127.0.0.1:5173/dialogue/lab`의 입력칸에 학생 답을 쓰고 [보내기]를 눌렀다. 세션 시작·문단 이동은 개발자 API `/api/developer/dialogue-simple/…`로 했다. 실행 도구는 [`step.mjs`](./step.mjs).
- 판정: `gpt-6-luna`, `promptVersion: paragraph-simple-holistic-v4.8`(모든 단계의 `call` 기록). 지시문 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md`(`evaluator.ts:76` 기본값, 채택 커밋 `8b05f6dc`).
- 지문 5편, 문단 19개, 판정 호출 약 30회, 응답 4~22초, 평가 실패 0.
- 원기록: [`logs/`](./logs/) — `<sessionId>-p<문단 index>.json`, 각각 `view`(화면 상태)와 `inspect`(단계별 판정 원출력·호출 기록). 원래 위치는 다른 세션의 임시 scratchpad였고 2026-10-30에 여기로 옮겼다.
- 학생 답은 코드 에이전트가 유형별로 지어낸 가상 답이며, 문단마다 1회 실행(반복 없음)이다.

## 세션·문단별 판정 경로 (원기록에서 다시 뽑음)

| 세션 | 문단 | 경로 |
|---|---|---|
| A 도파민 `6501c9e3` | p1 | CAPTURED/PRAISE |
| | p2 | GAP/GAP_QUESTION > GAP/CLOSE_GAP |
| | p3 | ONE_ERROR/CORRECTION_QUESTION > CAPTURED/PRAISE |
| | p4 | COPY/RETRY_PROMPT > IRRELEVANT/CLOSE_NO_RESPONSE |
| B 정보 비대칭 `69b92121` | p1 | CAPTURED/PRAISE |
| | p2 | GAP/GAP_QUESTION > CAPTURED/PRAISE |
| | p3 | ONE_ERROR/CORRECTION_QUESTION > ONE_ERROR/CLOSE_ERRORS |
| | p4 | GAP/GAP_QUESTION > GAP/CLOSE_GAP |
| | p5 | MULTI_ERROR/CLOSE_ERRORS |
| C 표면 장력 `6b65079f` | p1 | GAP/GAP_QUESTION > CAPTURED/PRAISE |
| | p2 | ONE_ERROR/CORRECTION_QUESTION > ONE_ERROR/CLOSE_ERRORS |
| | p3 | CAPTURED/PRAISE |
| | p4 | CAPTURED/PRAISE |
| | p5 | GAP/GAP_QUESTION > CAPTURED/PRAISE |
| | p6 | ONE_ERROR/CORRECTION_QUESTION > CAPTURED/PRAISE |
| D 법인 `24a1f8de` | p1 | CAPTURED/PRAISE |
| | p2 | IRRELEVANT/RETRY_PROMPT > GAP/GAP_QUESTION > ONE_ERROR/CLOSE_ERRORS |
| E mRNA `cbd571d8` | p1 | ONE_ERROR/CORRECTION_QUESTION > ONE_ERROR/CLOSE_ERRORS |
| | p2 | ONE_ERROR/CORRECTION_QUESTION > GAP/GAP_QUESTION > CAPTURED/PRAISE |

첫 보고의 `sid_c`·`sid_d`·`sid_e`는 각각 `6b65079f`·`24a1f8de`·`cbd571d8`이다. 첫 보고의 학생 입력·튜터 문구 표는 [첫 보고](../../review/dialogue-lab-student-sim-2026-10-30.md) 3절에 있고, 메인 세션이 표면 장력 p2·p6, 도파민 p3, 정보 비대칭 p2·p4, mRNA p1을 원기록과 대조해 일치를 확인했다.

## 정정 (첫 보고 대비)

1. **문제 2(b) 힌트 강조**: 결함이 아니라 [D-0175](../../../memory/decisions/D-0175-paragraph-simple-correction-hint-during-question.md)의 설계다. `dialogue-simple.ts`의 `view()`가 `stage=AFTER_CORRECTION`이고 판정 중이 아닐 때 `targetError.sourceQuote` 문장 전체를 HINT로 칠한다. D-0175는 "학생이 표시된 문장을 베껴 답하는 경우는 받아들인다"고 적는다. 사용자 재확인(2026-10-30).
2. **문제 3**: 사용자 판정으로 문제 아님([D-0191](../../../memory/decisions/D-0191-paragraph-gap-answer-lenient-judgment-accepted.md)).
   - 정보 비대칭 p2 2번의 '범위'는 원문에 없고 판정기가 핵심 description에 덧붙인 말이다. 원문의 정리 문장은 "이렇듯 온라인 정보 비대칭 상황에 대한 정부 개입에 관하여 엇갈리는 주장이 대두되고 있다."
   - 메인 세션이 처음에 "학생이 범위 쟁점을 찬반으로 바꿔 말했다"고 본 것도 과한 해석이었다.
3. **문제 6**: "미확인"이 아니라 설계다. v4.8 지시문 110행 `gaps` 최대 2개("셋이면 가장 크게 빈 둘"), `rules.ts:92-94`가 `gaps.length === min(2, falseCount)`를 검증한다. `MAX_SIMPLE_QUESTIONS=2`(`rules.ts:161`)는 질문 차례 수이며 별개다.
4. **문제 1 원인**: 질문은 오류 지점을 가리켰다("표면 장력을 높인다고 한 부분을 다시 생각해 보자"). 그 뒤 학생이 이미 맞힌 관계(계면 활성제↔폐포 확장)를 물었다. 원인 후보는 v4.8 질문 규칙 1("세부를 콕 찍지 않는다")과 AFTER_CORRECTION 판정(특정 오류의 해소 여부) 사이의 어긋남이다. 가설이며 다문항 재현 전이다.
5. **문제 2(a)와 2(b) 분리**: 2(a)는 규칙 2 위반(모델 출력 문제), 2(b)는 설계다.
6. **문제 5 딴소리 분류**: "요즘 AI 광고 진짜 많던데 나도 속은 적 있음"은 문단 주제와 이어져 있어, v4.8 IRRELEVANT 정의("대상 문단과 관계없는 말")에 비추면 GAP도 변호할 수 있다. 중요도를 중간에서 낮음으로 내린다.
7. **문제 4(b) 근거 보강**: mRNA 2문단 "바이러스를 배양하여 접종하는 기존의 백신과 달리 mRNA 백신은 바이러스가 아니기 때문에 인체가 바이러스에 감염될 위험이 없으며"는 기존 백신의 감염 위험을 함축한다. 같은 실행의 표면 장력 p3(다른 문단 근거 추론 → 오류 아님)와 판정이 엇갈린다.
8. **메모리 불일치**: `memory/CURRENT_STATE.md`·`WORK_TREE.md`가 운영 후보를 v4.7로 적고 있었다. 실제는 v4.8(커밋 `8b05f6dc`, 인계 `docs/handoffs/2026-10-28-paragraph-v48-adoption.md`)이며, 이번 작업에서 고쳤다.

## 사용자 결정 (2026-10-30)

- 힌트 강조: "기존 규칙 그대로 두기. 웹앱이 너무 깐깐하게 굴었음." → D-0175 유지, 새 기록 없음.
- 질문 전제 힌트·관대 판정: "과도하게 힌트를 주는 것도 문제 없다고 봄." 범위는 이번 사례에 한정하고 v4.9 질문 규칙 6은 유지한다(메인 세션 권고 채택). 관대 판정 (가) 정보 비대칭 p2 2번, (나) 법인 p2도 "문제 아님으로 정리해." → D-0191.

## 남은 문제 (해석·제안)

| 번호 | 내용 | 상태 | 제안 |
|---|---|---|---|
| 1 | 교정 질문이 이미 맞힌 관계를 묻고 tER=false로 닫음 (표면 장력 p2) | 미해결 | 교정 질문은 틀린 관계를 답해야 답이 되게 묻는다(규칙 1의 예외). 다문항 재현 먼저 |
| 2(a) | 교정 질문이 오류 종류를 밝힘("서로 바꾸어 말한 부분", 표면 장력 p6) | 미해결 | 규칙 2에 "오류의 종류를 밝히지 않는다" 추가 |
| 4-1 | 학생이 말하지 않은 대상을 "이"로 가리키는 질문 (정보 비대칭 p4) | 판단 필요 | 질문 규칙에 추가(권고) |
| 4-2 | 되묻기·반문 분기 없음 (정보 비대칭 p4, mRNA p1) | 판단 필요 | 기록만 하고 실제 학생 기록에서 되풀이되면 다룸(권고) |
| 4-3 | 다른 문단 원문과 맞는 주장의 오류 판정 (mRNA p1 대 표면 장력 p3) | 판단 필요 | D-0133(문단 경계 규칙 (나″)) 읽은 뒤 논의 |
| 5 | `restatedSummary`에 잡담·메타 설명 (정보 비대칭 p2·p3, mRNA p1) | 판단 필요 | 잡담·되묻기·메타 제외, 바로잡히지 않은 오류는 학생 말 보존으로 남김(권고) |
| 6 | 묻지 않은 핵심을 공개 문구에서 구별 | 낮음 | 선택 |
| 7·8 | '모르겠어요' 실마리, "답을 알 수 없어", 고정 칭찬 문구, 말투 혼재 | 낮음 | 문구 정리 |

## 열린 질문

- 문제 1의 어긋남이 다른 지문에서도 되풀이되는가? 1회 실행 1사례라 판정 흔들림과 구별이 안 된다.
- v4.10 범위: 문제 1·2(a) 규칙, givesRelation 정리(D-0186), 문제 4-1을 한 번에 묶을지.

## 파일

- 첫 보고: `docs/review/dialogue-lab-student-sim-2026-10-30.md`
- 이 반영본: `docs/experiments/student-sim-2026-10-30/REPORT-human.md`, `REPORT-desktop.md`
- 원기록: `docs/experiments/student-sim-2026-10-30/logs/*.json`(19개), 실행 도구 `step.mjs`
- 관련 결정: D-0175, D-0186, D-0187, D-0191(신규); 앞선 시뮬레이션 `docs/experiments/student-sim-2026-10-29/`


---

## 문제 파트 (`/problem/lab`)

### 실행 조건 (측정)

- 판정 `problem-feedback-v5.8`, 모델 기록 `gpt-6-luna`. 제출은 화면과 같은 API(`/api/developer/problem-lab/session/:id`)를 [`problem/pstep.mjs`](./problem/pstep.mjs)로 보냈다. 한 세션만 headless Chrome으로 화면을 확인했다. 오답 자리의 sol 라우팅은 확인하지 않았다(첫 보고 기재).
- 원기록: [`problem/logs/`](./problem/logs/) 9개(`view`·`inspect`).

| 세션 | 문항·유형 | 학생 발화(앞부분) | 마지막 단계 |
|---|---|---|---|
| `d08d9514` | 도파민 q13, 상위권 정답 | 2번, "카르비도파는 혈액-뇌 장벽을 못 넘어서…" | COMPLETED |
| `0e8531ae` | 도파민, 정답·약한 근거 | 2번, "제일 이상해 보여서…" | AWAITING_UNDERSTANDING |
| `206a362f` | 도파민, 오답·두 오해 | 4번 → "말초 조직" → "늘어나?" → 5번 | AWAITING_UNDERSTANDING |
| `81c79fc6` | 정보 비대칭 q13, 선택–근거 모순 | 3번 → "잘못 골랐다" → 5번 | COMPLETED |
| `aa9b8af7` | 표면 장력 q16, 찍기 | 2번, "모르겠어요 그냥 찍었어요" | AWAITING_END_START |
| `9924082b` | 표면 장력, 방향 오해 → 모르겠어 | 5번 → "모르겠어" | AWAITING_END_START |
| `79e322b8` | 표면 장력, 고치고 새 의문 | 5번 → "커지네. 근데…" | AWAITING_POST_REPAIR_CHOICE(재선택 전 중단) |
| `57ed2b56` | 표면 장력, 정답·근거 방향 둘 다 틀림 | 3번 → "작아져" → "커져" | AWAITING_POST_REPAIR_CHOICE |
| `d858bfdb` | 표면 장력, 정답·한 단어 근거 | 3번, "곱이 같아서" | AWAITING_END_START |

### 판정 (해석)

| 첫 보고 | 판정 | 근거 |
|---|---|---|
| P1 한 단어 답·칠한 문장에 답 (높음) | 설계 | D-0188 직접 질문(사실 하나), D-0187 표시 유지·추측 답 REPAIRED 유지. 부록 제안 (3)은 D-0187이 기각한 안 |
| P2 새 의문 무시 (중간) | 설계 | D-0108 국소 오류만, 작동 순서 문서 199행 새 오류 기록만. `79e322b8`은 재선택 전 중단이라 결과 미확인 |
| P3 '모르겠어요' 즉시 공개 (중간) | 설계 | D-0057(사용자 동의 2026-10-01), D-0059. 교정 답 '모르겠어'는 REPAIR_FAILED 경로(작동 순서 문서 160행) |
| P4 근거 미확인 정답 문구 (낮음) | 문구 수정 | 동작은 D-0182 수용. `gateNote` CORRECT_UNVERIFIED 두 문구 |
| P5 재선택 오답 문구 (낮음) | 문구 수정 | INSTANT가 재선택(`selections.length === 2`) 오답이면 "다시 고른 답도 정답이 아니야. 어떻게 생각했는지 읽어 볼게.", RESELECTION_WRONG 게이트는 근거가 있으면 "더 묻지 않고 정답을 먼저 알려 줄게."만 |

### 코드 변경과 검증

- `packages/app/src/server/problem-feedback.ts`: 위 문구 3곳.
- `packages/app/src/server/problem-feedback.test.ts`: 기대 문구 3곳. `npx vitest run packages/app/src/server/problem-feedback.test.ts` 36/36 통과, `npm run typecheck` 통과.
- `packages/app/e2e/problem-lab-workbench.spec.ts`: 재선택 오답 기대 문구를 두 말풍선으로 나눴다. e2e 22/22 통과. 사용자 개발 서버(5173·5175)를 피하려고 `PLAYWRIGHT_CLIENT_PORT=5473 CSAT_API_PORT=5374 CSAT_PROBLEM_LAB_API_PORT=5374`로 별도 화면 서버를 띄웠다. 이 테스트는 `docs/handoffs/`의 기존 스크린샷 6개를 덮어써서 원래대로 되돌렸다.

### 문단 문제 1과의 연결 (가설)

문제 쪽 교정 질문은 4사례 모두 학생의 틀린 문장을 인용하고 그 사실을 직접 물었다(엇나감 0). 문단 v4.8 질문 규칙 1("세부를 콕 찍지 않는다")이 문단 문제 1의 원인이라는 가설과 맞는다. 다만 다문항 재현 전이다.
