# 인계: 문제 풀이 개발자 화면 공간 정리·자동 스크롤 (UI 메모장 31·32·33·34·35번)

- 날짜: 2026-10-22
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 상태: 완료(사용자 2026-10-22 "오케이. 진행", 모형 확인 뒤 승인. executor 구현, Claude 검토·title 보완)
- 관련: [UI 메모장](../review/v4-dev-ui-feedback-backlog-2026-10-11.md) 31~35번, 사용자 그림
  `docs/review/v4-dev-ui-backlog-35-layout-mockup-2026-10-22.png`, Claude 단순 모형 `docs/handoffs/2026-10-22-v4-dev-ui-layout-economy-mock.png`(1440×860). 이전 입력 영역 설계:
  `docs/handoffs/2026-10-13-v4-dev-composer-stable-layout.md`(높이 고정 원칙은 유지, 줄 구성은 이 문서가 대체).

## 목표

화면: `/problem/dev/v4`(`ProblemFeedbackV4App`). 폭 901px 이상(세 칸이 함께 보이는 화면) 기준이다. 900px 이하(탭 화면)는 깨지지
않게만 한다.

1. **위쪽 띠 축소(35-1).** 지금 위쪽은 제목 줄(kicker + h1) + 문단 이동 줄(`DevPartNav`) + 개발자 안내 문장으로 세 줄이다. 이를
   **한 줄 띠**로 줄인다. 왼쪽: kicker "COGAXIS / PERSONAL LAB"와 짧은 개발자 안내(지금 문장 그대로, 11px 이하, 한 줄 넘치면
   말줄임). 오른쪽: 지금 `workbench-actions`(선택 n / 2, 응답 평가, 학습 맵, 새 테스트) 그대로. 1600×1000에서 띠 높이 ≤ 44px.
2. **지문 칸 머리(35-2).** "전체 지문" 머리를 바꾼다. 1행: 지문 제목(`view.title`, 지금 h1을 여기로 옮김, h1 유지)과 그 옆에 시험 정보
   (`view.exam`, 작은 글씨, 줄바꿈 안 함). 2행: 문단 이동 버튼(`DevPartNav`, `navPassage`가 있을 때만, 버튼 글자 줄바꿈 없음, 넘치면
   가로 스크롤). 제목 옆에 버튼을 두면 1440px 폭에서 버튼 글자가 두 줄로 깨져서 2행으로 내렸다(모형 확인). 머리 높이 ≤ 72px.
   `DevPartNav` 컴포넌트·CSS 파일은 고치지 않고, 렌더링 위치만 옮긴다. 간격·글씨 크기 조정은 `.problem-v4-workbench .dev-part-nav …`로
   `problem-feedback-workbench.css`에서 덮는다.
3. **문제 칸 머리(35-3).** "문제 12"와 발문(`view.question.stem`)을 칸 머리에 함께 둔다(발문은 줄바꿈 허용). "읽고, 오른쪽에서 골라 줘"는 뺀다.
   발문은 머리에 있으므로 스크롤되지 않는다.
4. **보기 고정·선지 단순화(34·35-4).** 문제 칸 본문을 위아래 두 부분으로 나눈다.
   - 보기 상자(`.v4-scenario`, 지금 모양 유지)는 **고정**한다. 선지를 스크롤해도 움직이지 않는다. 보기가 길면 칸 높이의 50%까지만
     차지하고 상자 안에서 스크롤한다. 보기가 없는 문항은 이 부분이 없다.
   - 선지 목록만 스크롤한다. 선지의 테두리 상자를 없애고 "번호 + 글" 텍스트 목록으로 만든다(글씨 14px, 줄 간격 1.7 안팎,
     선지 사이 간격 8px 안팎). 지금 고른 선지(`data-selected=true`)는 테두리 없이 옅은 배경으로만 표시한다. 선지 안 그림(`Media`)은 그대로.
5. **피드백 칸 최대화(35-5).** 1·6번으로 생긴 높이를 대화 기록(`.v4-chat-scroll`)이 가져간다. 세 칸 너비 비율은 지금 그대로 둔다.
6. **입력 영역 축소(32·35-6).** 입력 영역(`.v4-composer`)을 **세 줄, 높이 고정**으로 바꾼다. 단계가 바뀌어도 높이는 같다(이전 원칙 유지).
   1. 안내 줄: 한 줄 높이 고정, 비어 있어도 자리 유지. 넘치면 말줄임(…)으로 자르고 전문은 `title`에 둔다. 역할(`status`/`alert`) 유지.
   2. 입력칸: textarea, 두 줄 높이 고정(안에서 스크롤). 라벨(`선택한 이유를 적어 줘` 등)은 화면에서 숨기되 접근성 이름으로 남긴다.
   3. 동작 줄: 왼쪽에 [체크(정답만 입력/근거 미제출)] [선지 번호 버튼 1~5], 오른쪽에 동작 버튼(전송·다시 선택·응/아니 등).
      한 줄 높이 고정. "선지 선택" legend는 화면에서 숨기고 접근성 이름으로 남긴다.
   - **선지 번호 버튼은 고를 수 있는 단계에서만 보인다**(32번 "필요한 때만"): `AWAITING_SELECTION`, `AWAITING_RESELECTION`,
     `AWAITING_RATIONALE`. 그 밖의 단계(교정 질문·교정 뒤 선택·마지막 설명·완료 등)에서는 렌더링하지 않는다. 동작 버튼이 길어도
     (예: "같은 문제 다시 풀기"·"학습 맵으로 돌아가기 →") 줄이 늘지 않게 한다.
   - `v4-composer-state.ts`의 반환 구조·문구는 바꾸지 않는다. 보임 여부는 화면에서 단계로 정한다.
   - 1600×1000에서 입력 영역 높이 ≤ 140px(지금 약 258px).
7. **대화창 자동 스크롤(31).** 대화 기록에 새 내용이 나타나면 맨 아래가 보이게 스크롤한다. 새 내용: 드러난 말풍선(시퀀스 공개 포함),
   전송 확인 중인 학생 말풍선, 기다림 말풍선, 정답 공개 상자, 종료 문장. 또한 내용 크기가 바뀔 때(마크다운·그림 배치 후, 입력 영역·창 크기
   변화) 학생이 맨 아래 근처(80px 이내)에 있었으면 맨 아래를 유지한다. 학생이 위로 올려 읽는 중이면 크기 변화만으로는 끌어내리지 않지만,
   새 말풍선이 나타나면 맨 아래로 간다. 구현 방법(ResizeObserver·MutationObserver 등)은 자유.
8. **칠한 곳 자동 스크롤(33).** 교정 질문과 함께 칠한 곳(`correctionHighlights`)이 생기면, 그 교정 질문 말풍선이 화면에 드러날 때
   첫 칠한 곳을 **그것이 들어 있는 스크롤 영역 안에서** 가운데로 스크롤한다(지문이면 지문 스크롤, 보기면 보기 상자, 선지면 선지 목록).
   페이지 전체(`window`)와 다른 칸은 움직이지 않는다. 지금 `scrollIntoView` 대신 영역 안 `scrollTop` 계산을 쓴다. 900px 이하의
   "지문에서 보기" 버튼 동작(탭 전환 → 스크롤)은 그대로 둔다. 동작 줄이기 설정(`prefers-reduced-motion`)이면 즉시 이동.

## 범위 밖

- 판정·코칭 문구, 서버, `v4-composer-state.ts`의 상태·문구, 평가 서랍.
- 다른 세션 파일: `DevPartNav.tsx`, `dev-part-nav.css`, `dev-part-nav-links.ts`, `SimpleDialogue*`, `simple-dialogue.css`, `simple-waiting.*`.
- 공용 CSS `dialogue-workbench.css`는 고치지 않는다(문단 화면과 공유). 바꿀 모양은 모두 `.problem-v4-workbench` 범위로
  `problem-feedback-workbench.css`에 쓴다.
- `ProblemFeedbackV4App.tsx`에는 다른 세션의 미커밋 수정(`DevPartNav` 연결, `navPassage`, `paragraphLink`)이 있다. 이 부분의 동작은
  그대로 두고 렌더링 위치만 옮긴다. 그 줄들을 지우거나 되돌리지 않는다.
- 900px 이하 탭 화면의 새 배치(깨지지 않게만).

## 손댈 파일과 계약

- `packages/app/src/client/ProblemFeedbackV4App.tsx`: 위쪽 띠, 지문·문제 칸 머리, 보기 고정·선지 목록 분리, 입력 영역 세 줄과 선지 버튼
  단계별 렌더링, 대화창 자동 스크롤(7), 칠한 곳 영역 안 스크롤(8).
- `packages/app/src/client/problem-feedback-workbench.css`: 위 배치의 모양. 입력 영역 grid 세 줄 고정 높이.
- `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`:
  - "composer keeps four rows and identical height …" → 세 줄·높이 동일로 고친다. 교정 질문·교정 뒤 선택 단계에서 선지 번호 버튼이
    없고, 다시 고르기 단계에서 있는지 확인을 더한다.
  - 새 시험(1600×1000, 모의 평가기): ① 위쪽 띠 ≤ 44px, 입력 영역 ≤ 140px. ② 선지 목록을 끝까지 스크롤해도 발문·보기 상자의
    `boundingBox().y`가 그대로. ③ 교정 질문 단계에서 버튼을 누르지 않아도 첫 칠한 곳이 화면 안(`toBeInViewport`)에 있고
    `window.scrollY === 0`. ④ 단계마다 대화 기록의 마지막 말풍선이 화면 안에 있다(교정 질문, 교정 뒤, 다시 고른 뒤 마지막 설명 공개 중).
    1280×720에서도 ③④.
  - 기존 시험의 선택자가 바뀐 머리 문구("전체 지문", "읽고, 오른쪽에서 골라 줘")에 기대면 새 구조에 맞게 고친다. 시험의 의도는 바꾸지 않는다.

## 완료 조건

- [ ] 목표 1~8이 1600×1000·1280×720에서 성립한다. 그림(`…layout-mockup….png`)과 같은 배치다.
- [ ] 900px 이하에서 탭 전환·"지문에서 보기"·입력이 동작한다(기존 모바일 시험 통과).
- [ ] `npm run build`, `npm run typecheck:client`(있으면) 통과.
- [ ] `npm test` 통과(기존 실패 2개 외 새 실패 없음).
- [ ] 격리 e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  통과. 기존 실패 1개("ambiguous correct … mobile panes fit", 다른 세션 `DevPartNav`의 "문제" 버튼과 탭 버튼 이름 중복)는 이번
  배치 뒤 통과하거나 같은 원인으로만 실패해야 한다. 다른 원인이면 보고한다.
- [ ] 1600×1000 선택 단계 화면 캡처 한 장을 `docs/handoffs/2026-10-22-v4-dev-ui-layout-economy-after.png`로 남긴다(격리 e2e 서버에서).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 실모델 확인은 하지 않는다.
- 다른 세션 파일을 고쳐야만 할 것 같으면 멈추고 보고한다.
- 띄워 둔 개발 서버(5173·5174·5175)를 끄거나 다시 켜지 않는다. 시험은 격리 포트로만 한다.
- `git add`·커밋·`git stash`를 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/client/ProblemFeedbackV4App.tsx`(위쪽 한 줄 띠, 지문 칸 머리에 제목·시험 정보·`DevPartNav` 이동, 문제 칸 머리에 발문, 보기 고정·선지 목록 분리, 입력 영역 세 줄·선지 번호 버튼 단계별 렌더링, 대화창 자동 스크롤, 칠한 곳 영역 안 `scrollTop` 스크롤), `packages/app/src/client/problem-feedback-workbench.css`, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`. 캡처: `docs/handoffs/2026-10-22-v4-dev-ui-layout-economy-after.png`.
- 테스트 결과: `npm run build` 통과. `npm test` 1349 통과 / 2 실패(기존 실패 2건: boundary.test.ts 의 node:fs 검사와 axis-architecture-experiment 의 .omc 파일 없음, 이번 변경과 무관). 격리 e2e(5383/5384) 15개 모두 통과(새 시험 2개 포함: 1600×1000, 1280×720). 기존 실패로 알려진 "ambiguous correct … mobile panes fit"도 통과(`DevPartNav`가 지문 칸 안으로 옮겨져 모바일 대화 탭에서 "문제" 버튼이 숨겨져 이름 중복이 사라짐). 1600×1000 측정: 띠 ≤44px, 입력 영역 ≤140px, 지문 머리 ≤72px 시험으로 확인.
- 남은 문제: (1) 기존 시험 수정: `open()`이 보이는 h1 대신 `h1` 텍스트 포함으로 확인(모바일 기본 탭이 대화라 지문 칸의 h1이 숨겨짐). 교정 질문·교정 뒤·완료 단계의 선지 번호 버튼 `toBeDisabled` 확인은 버튼이 렌더링되지 않으므로 `toHaveCount(0)`으로 바꿈(의도 동일: 그 단계에서 고를 수 없음). (2) 모바일에서는 h1이 지문 탭에서만 보인다. (3) `DevPartNav`의 가로 스크롤바는 높이 때문에 숨김(`scrollbar-width: none`), 스크롤 자체는 가능. (4) 전체 `npm run typecheck:client`는 별도 스크립트가 없어 `npm run build`(tsc --build)로 대체.
