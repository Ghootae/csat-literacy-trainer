# 인계: 말풍선 운영 규칙 — 생각 중 말풍선 남기기·문장 변주·간격 (메모장 37·39·44, 문단 메모 v4.7-1·2)

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 없음.
- 관련: [문제 메모장](../review/v4-dev-ui-feedback-backlog-2026-10-11.md) 37·39·44번, [문단 메모 v4.7](../review/simple-holistic-dev-ui-feedback-2026-10-16/README.md) 1·2번
- 사용자 승인(2026-10-28): "모두 권고에 동의. 구현 승인"

## 목표

1. (44 재현) 문제 화면 GATE 말풍선 세 개가 실제로 몇 ms 간격으로 나타나는지 측정해 기록한다.
2. (37) 모델 판정을 기다리던 '생각 중' 말풍선이 결과 도착 때 사라지지 않고, 그 자리에 마무리 말풍선("다 살펴봤어." 류)이 남는다. 새로고침해도 남는다(서버 대화 기록에 들어간다).
3. (39) '생각 중' 문장·마무리 문장·문단 통과 칭찬이 문장 세트에서 고른 변주로 나온다. 고르기는 제출 번호(transitionId 등) 해시로 정해서 같은 제출은 늘 같은 문장이다.
4. (44) 순차 말풍선 간격이 앞 말풍선 길이에 비례한다. '동작 줄이기' 설정에서도 간격은 유지한다(점 애니메이션만 끈다).
5. (v4.7-2) 문단 화면(`/dialogue/lab`)에도 2·3·4가 같은 공통 모듈로 적용된다. 문단 화면에는 지금 순차 표시가 없으므로 새로 붙인다.
6. (v4.7-1) 문단 화면의 모든 PRAISE 말풍선이 "코드가 고른 짧은 칭찬 한 문장 + 핵심 내용 상자"가 된다.

## 범위 밖

- 판정·마지막 설명 지시문, 문단 지시문, 스키마, 상태 기계(`packages/pipeline`)는 바꾸지 않는다. 모델 출력 원문(`o.message`)은 기록·서랍에 그대로 남긴다.
- 출제자 전략 말풍선(`strategyBubbles`)의 표시 방식.
- git 쓰기 명령.

## 0단계: 44 재현 (먼저, 결과를 아래 "결과"에 적는다)

- 문제 화면 e2e(모의 판정기, `packages/app/e2e/problem-lab-workbench.spec.ts`의 방식)로 교정 실패 → GATE 말풍선 세 개가 나오는 흐름을 만들고, 말풍선마다 DOM에 나타난 시각을 기록한다. 보통 설정과 `reducedMotion: 'reduce'` 두 조건.
- 기대: 보통 설정 약 800ms 간격, 동작 줄이기 0ms(코드상 `sequenceState`가 reducedMotion이면 한 번에 다 보임). 그 밖의 결과(보통 설정에서도 0ms 등)면 원인을 찾아 적고, 1~4단계 구현 안에서 함께 고친다.
- 측정 시험은 새 간격 규칙을 확인하는 시험으로 바꿔 남긴다.

## 1단계: 공통 모듈

- `packages/app/src/shared/bubble-lines.ts`(새 파일, 서버·클라이언트 공용):
  - 아래 문장 세트를 상수로 둔다. 키 이름은 자유.
  - `pickLine(set: readonly string[], key: string, avoid?: string): string` — key의 안정 해시(예: FNV-1a)로 고른다. `avoid`와 같으면 다음 항목.
- `packages/app/src/client/bubble-pacing.ts`(새 파일): `bubbleDelayMs(previousText: string): number = Math.min(2500, 1200 + 10 * 글자 수)`. 지금 `problem-composer-state.ts`의 `sequenceState`의 800ms와 `instantWaitingDelay`를 이것으로 바꾼다. reducedMotion이어도 간격은 그대로, `showDots`만 false.
- 대기 문장 함수(`waitingText`, `simpleWaitingText`)는 지금 시간 단계(0·6·15·25초)를 그대로 두고, 각 단계에서 세트 중 하나를 `pickLine(세트, 대기 key)`로 고른다. 대기 key는 문제 화면은 `pending.transitionId`, 문단 화면은 대기 중 제출의 transitionId. 단계가 바뀌어도 같은 key를 쓴다.

### 문장 세트 초안 (사용자 검토 뒤 확정, 지금은 이대로 넣는다)

| 세트 | 문장 |
|---|---|
| 문제 ANSWER 0~6초 | 네 근거를 읽고 있어 / 네가 쓴 이유를 차근차근 읽고 있어 / 네 생각을 따라가 보고 있어 |
| 문제 ANSWER 6~15초 | 원문이랑 하나씩 맞춰 보고 있어 / 네 근거가 원문 어디랑 이어지는지 찾고 있어 / 네 말을 원문에 하나씩 대 보고 있어 |
| 문제 ANSWER 15~25초 | 네 생각이 어떻게 이어지는지 살펴보고 있어 / 근거에서 답까지 어떻게 이어지는지 보고 있어 / 네 근거와 선지를 이어 보고 있어 |
| 교정 답 0~6초 (문제 CORRECTION·문단 AFTER_CORRECTION·AFTER_GAP) | 네 답을 읽고 있어 / 네가 다시 쓴 생각을 읽고 있어 / 네 답을 차근차근 읽고 있어 |
| 문제 CORRECTION·문단 AFTER_CORRECTION 6초~ | 아까 질문이랑 맞춰 보고 있어 / 아까 물어본 내용이랑 견줘 보고 있어 / 네 답이 질문에 맞는지 보고 있어 |
| 문단 AFTER_GAP 6초~ | 물어본 내용이 채워졌는지 보고 있어 / 빠졌던 내용이 들어갔는지 보고 있어 / 물어본 부분을 네 답에서 찾고 있어 |
| 문제 EXPLANATION | 설명을 정리하고 있어 / 어떻게 설명할지 정리하고 있어 / 설명할 내용을 하나씩 모으고 있어 |
| 문제 UNKNOWN | 네 답을 살펴보고 있어 / 네 답을 차근차근 보고 있어 / 네 답을 읽어 보고 있어 |
| 문단 INITIAL·RETRY 0~6초 | 네 요약을 읽고 있어 / 네가 쓴 요약을 차근차근 읽고 있어 / 네 요약을 따라가 보고 있어 |
| 문단 INITIAL·RETRY 6~15초 | 문단이랑 하나씩 맞춰 보고 있어 / 네 요약을 문단에 하나씩 대 보고 있어 / 문단 어디를 담았는지 찾고 있어 |
| 문단 INITIAL·RETRY 15~25초 | 어떤 내용을 잡았는지 정리하고 있어 / 담은 내용과 빠진 내용을 나눠 보고 있어 / 네 요약이 문단 핵심과 어떻게 맞는지 보고 있어 |
| 25초~ (공통) | 조금 오래 걸리고 있어. 조금만 더 기다려 줘 / 생각할 게 좀 많네. 조금만 더 기다려 줘 / 시간이 좀 걸리네. 조금만 더 기다려 줘 |
| 마무리 (공통) | 다 살펴봤어. / 생각이 끝났어. / 정리가 끝났어. |
| 문단 통과 칭찬 | 내가 판단한 문단의 핵심 내용과 모두 일치했어! 잘했어~ / 문단의 핵심을 빠짐없이 잡았어! 잘했어~ / 핵심 내용을 정확하게 잡아냈어! 잘했어~ |

(지금 ANSWER 15초 문장 "어디서 판단이 갈렸는지"는 정답 선택에도 나와 "정답이야!" 직후와 어긋나므로, 정답·오답 모두에 맞는 중립 문장으로 바꿨다.)

## 2단계: 문제 화면 (37·39·44)

- 서버 `packages/app/src/server/problem-feedback.ts`: 학생 제출(SELECT·RATIONALE·CORRECT, 그 RESUME 포함) 뒤 모델 평가가 성공해 코치 말풍선을 붙일 때, 그 말풍선들 **앞에** 마무리 말풍선 한 줄을 붙인다: `{ id: 'done-<transitionId>', role: 'COACH', phase, sequence: 'INSTANT', kind: 'WAIT_DONE', text: pickLine(마무리, transitionId) }`. 평가 실패(RETRYABLE_ERROR)에는 붙이지 않는다.
  - 마지막 설명: 학생이 [응](END_START accept)을 눌렀을 때 설명 생성이 아직 안 끝나 학생이 실제로 기다린 경우에만, 생성이 끝나 설명 말풍선을 붙일 때 그 앞에 같은 마무리 말풍선을 붙인다. 이미 생성돼 있었으면 붙이지 않는다.
  - `FeedbackMessage`(`packages/app/src/shared/problem-feedback.ts`)에 `kind?: 'WAIT_DONE'`을 더한다.
- 클라이언트 `ProblemLabApp.tsx`: `kind: 'WAIT_DONE'` 말풍선은 '생각 중' 말풍선과 같은 모양(이름표 '피드백', 점 없음)으로 그린다. 결과가 오면 '생각 중' 말풍선이 있던 자리에 마무리 말풍선이 바로 보이고, 그 뒤 말풍선은 새 간격으로 하나씩 나온다.
- 학생 발화(observations)·모델 입력은 대화 기록(transcript)을 쓰지 않음을 확인한다. 쓰는 곳이 있으면 WAIT_DONE을 거르고, 결과에 적는다.

## 3단계: 문단 화면 (v4.7-1·2)

- 서버 `packages/app/src/server/dialogue-simple.ts`:
  - 평가 성공으로 `p.transcript.push(...this.tutorMessages(...))` 할 때 그 앞에 마무리 말풍선(`{ role: 'tutor', label: '피드백', text: pickLine(마무리, 제출 key), kind: 'WAIT_DONE' }`)을 붙인다. `SimpleMessageView`에 `kind?: 'WAIT_DONE'`.
  - PRAISE(모든 단계): `text = pickLine(칭찬, 제출 key)`, `parts` = 질문 뒤면 지금처럼 `o.corePartSummaries`, 첫 요약·다시 쓴 요약이면 `p.state.coreParts.map(c => c.description)`. `o.message`는 화면에 쓰지 않고 step 기록에 그대로 남는다.
- 클라이언트 `SimpleDialogueApp.tsx`: 새로 받은 메시지만 공통 간격으로 하나씩 보인다(새로고침·문단 이동으로 복원된 메시지는 한 번에). 사이에 점 말풍선. WAIT_DONE은 대기 말풍선 모양.
- 서랍(판정·메모)·로그·문단 마무리 판정이 메시지 개수나 순서에 기대는 곳이 있으면 WAIT_DONE을 고려해 고치고 결과에 적는다.

## 완료 조건

- [ ] 0단계 측정 결과를 아래 "결과"에 적었다.
- [ ] 단위 테스트: `pickLine` 안정성·avoid, `bubbleDelayMs` 경계(짧은 글 1200, 긴 글 2500), reducedMotion에서도 간격 유지, 서버가 성공 때만 WAIT_DONE을 붙임(문제·문단), END 설명은 기다린 경우에만, PRAISE 칭찬 문장·상자 출처(첫 요약은 coreParts, 질문 뒤는 corePartSummaries).
- [ ] e2e(격리 포트): 문제 화면은 `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 CSAT_PROBLEM_LAB_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-lab-workbench.spec.ts` 전부 통과. 마무리 말풍선이 결과 뒤 남는 것, 새로고침 뒤에도 남는 것, GATE 간격 ≥1200ms를 확인하는 시험 포함. 문단 화면 e2e가 있으면 같은 방식으로 통과 + 마무리 말풍선·순차 표시 시험.
- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건만(`boundary.test.ts` `node:fs`, `axis-architecture-experiment.test.ts` `.omc/adhoc`).
- [ ] 1600×1000 캡처 두 장: 문제 화면 오답 첫 판정 뒤(마무리 말풍선 보임) `docs/handoffs/2026-10-28-bubble-pacing-problem.png`, 문단 화면 PRAISE 뒤 `docs/handoffs/2026-10-28-bubble-pacing-paragraph.png`.

## 중단·보고 조건

- 마무리 말풍선을 대화 기록에 넣으면 모델 입력이나 판정이 달라지는 경로가 있으면 멈추고 보고한다.

## 결과 (실행 후 작성)

### 0단계 측정 (구현 전 코드, 문제 화면 GATE 세 개: 근거 못 읽음 안내 → 정답 알림 → "같이 볼까?")
- 보통 설정: 817ms, 817ms (코드의 800ms + 렌더 오차). 동작 줄이기: 0ms, 0ms. 기대와 같았고 다른 원인은 없었다.
- 측정에는 모델 판정이 필요 없는 흐름(정답만 입력 → 근거 미제출)을 썼다. 이 작업 트리에서 e2e 모의 판정기가 현재 판정 스키마와 어긋나 14개 기존 시험이 실패하기 때문이다(조정자 안내와 같음, 이번 작업과 무관).
- 구현 뒤 같은 흐름의 간격(모의 판정 `페이싱` 분기, 마무리→안내→정답→질문): 보통 1318/1859/1306ms, 동작 줄이기 1307/1857/1310ms. 문단 화면 마무리→칭찬: 보통 1283ms, 동작 줄이기 1281ms.

### 바뀐 파일
- 새 파일: `packages/app/src/shared/bubble-lines.ts`(문장 세트 + `pickLine`, FNV-1a), `packages/app/src/client/bubble-pacing.ts`(`bubbleDelayMs`), `packages/app/e2e/paragraph-bubble-pacing.spec.ts`(문단 화면 e2e)
- 문제 화면: `shared/problem-feedback.ts`(`kind?: 'WAIT_DONE'`), `server/problem-feedback.ts`(마무리 말풍선), `client/problem-composer-state.ts`(`waitingText(kind, ms, key)`, `sequenceState` 간격, `instantWaitingDelay` 삭제), `client/ProblemLabApp.tsx`
- 문단 화면: `shared/dialogue-simple.ts`(`kind`), `server/dialogue-simple.ts`(마무리·칭찬·모델 입력 거르기), `client/simple-waiting.ts`(key 인자), `client/SimpleDialogueApp.tsx`(순차 표시), `client/SimpleDialogueDrawer.tsx`(마무리 말풍선 클래스)
- 시험: `client/problem-composer-state.test.ts`, `client/simple-waiting.test.ts`, `server/problem-feedback.test.ts`, `server/dialogue-simple.test.ts`, `server/dialogue-simple-http.test.ts`, `e2e/problem-lab-workbench.spec.ts`
- 로그 분석 스크립트 한 줄: `scripts/run-analysis-judge-gongsun.mjs`(transcript에서 `kind` 있는 말풍선 제외)

### 테스트 결과
- `npm run build` 통과. `npm test`(vitest): 1461 통과 / 2 실패 = 기존 실패 2건뿐(`boundary.test.ts` node:fs, `axis-architecture-experiment.test.ts`). 새로 더한 단위 시험: `pickLine` 안정성·avoid·분포, `bubbleDelayMs` 경계(1200/1300/2500), 동작 줄이기에서도 간격 유지, 문제 서버 마무리(성공만·실패 없음·RESUME·END 기다림/안 기다림), 문단 서버(마무리 위치·모델 입력 제외·실패 없음·같은 key 같은 문장·PRAISE 상자 출처).
- e2e 문제 화면(5393/5394): 22개 중 8 통과, 14 실패. 실패 14개는 조정자가 지정한 기존 실패와 정확히 같은 목록이고, 새로 더한 3개(간격 보통·동작 줄이기, 마무리 말풍선이 남고 새로고침 뒤에도 남음)와 419행 포함 나머지는 전부 통과. 14개의 실패 이유가 바뀌었는지는 개별로 확인하지 않았다(모의 판정이 어차피 안 끝나는 지점에서 같이 멈춤).
- e2e 문단 화면(5395/5396) 새 spec 2개 통과(보통·동작 줄이기).
- 캡처: `docs/handoffs/2026-10-28-bubble-pacing-problem.png`, `docs/handoffs/2026-10-28-bubble-pacing-paragraph.png` (1600×1000)

### 문서와 달리 판단한 점
- 문단 서버의 모델 입력 `dialogue`는 `p.transcript`에서 만들어지므로 마무리 말풍선이 들어가면 입력이 달라진다. 중단 조건에 해당하는 경로지만 입력 조립 한 곳에서 `kind: 'WAIT_DONE'`을 거르면 입력이 이전과 같아서(시험으로 확인) 멈추지 않고 진행했다. 문제 화면은 transcript가 모델 입력·판정에 쓰이지 않음을 확인했다(세션 상태와 분리, 저장 기록에만 실림).
- 문제 화면 WAIT_DONE의 `sequence`는 문서대로 `INSTANT`다. 그래서 `INSTANT`로 마지막 즉시 판정 말풍선을 찾는 곳(클라이언트 `instant`, 시험의 `instants()`)에서 `kind`가 있는 것은 제외했다.
- END 설명 마무리 말풍선의 id는 `done-end-<transitionId>`다(`done-<transitionId>`는 같은 transitionId로 시작한 첫 판정과 겹치기 때문).
- 마무리 말풍선은 코치 말풍선이 실제로 붙을 때만 붙인다(재선택 대기·평가 계속 중 단계에는 없음).
- 문단 화면은 순차 표시 중 입력창·보내기·"이 문단은 끝났어요" 영역을 비활성/숨김으로 둔다(다 보일 때까지).
- 같은 이유로 `sequenceState`의 동작 줄이기 분기(한 번에 다 보임)를 없애고 점만 끈다. 이에 따라 기존 단위 시험 3개의 기대를 새 규칙으로 바꿨다.
- 로그 분석 스크립트(`run-analysis-judge-gongsun.mjs`)는 transcript를 그대로 읽으므로 마무리 말풍선이 대화로 섞이지 않게 한 줄 거르기를 더했다. 다른 로그 읽는 스크립트(`build-actual-student-cycle-review.mjs` 등)는 확인하지 않았다.
