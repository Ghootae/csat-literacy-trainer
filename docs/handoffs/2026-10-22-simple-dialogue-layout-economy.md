# 인계: 문단 요약 개발자 화면 공간 정리

- 날짜: 2026-10-22
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 상태: 완료(사용자 2026-10-22 "진행", 모형 확인 뒤 승인. executor 구현, Claude 검토)
- 관련: 사용자 요청(2026-10-22) "문단 요약 파트의 레이아웃도 비슷한 방식으로 경제화해줘. 1. 상단 축소 2. 지문 상단: 문제 풀이와 같은 형식
  3. 대화창 부분을 최대화 & 응답 입력 부분은 작게", 사용자 캡처 `docs/review/simple-dialogue-layout-request-2026-10-22.png`.
  Claude 모형 `docs/handoffs/2026-10-22-simple-dialogue-layout-economy-mock.png`(1440×860).
  본보기: 문제 풀이 화면 정리 [인계](./2026-10-22-v4-dev-ui-layout-economy.md)(커밋 `4936892`).

## 목표

화면: `/dialogue/dev/simple`(`SimpleDialogueApp`, 세션 진행 화면). 폭 901px 이상 기준, 900px 이하(탭 화면)는 깨지지 않게만 한다.

1. **위쪽 띠 축소.** 지금 제목 줄(kicker + h1) + 문단 이동 줄(`DevPartNav`) + 개발자 안내 세 줄을 **한 줄 띠**로 줄인다. 왼쪽: kicker
   "COGAXIS / PERSONAL LAB / SIMPLE"와 개발자 안내(지금 문장 그대로, 11px, 넘치면 말줄임, 전문은 `title`). 오른쪽: 지금
   `workbench-actions`(문단 n / N, 단계별 판정·메모, 나가기) 그대로. 1600×1000에서 띠 높이 ≤ 44px.
2. **원문 칸 머리(문제 풀이와 같은 형식).** "원문" 머리를 바꾼다. 1행: 지문 제목(`view.title`, 지금 h1을 옮김, h1 유지, 넘치면 말줄임·전문 `title`)과
   그 옆 시험 정보(`view.exam`, 작은 글씨, 줄바꿈 안 함). 2행: `DevPartNav`(지금과 같은 props, 렌더링 위치만 옮김). 머리 높이 ≤ 72px.
   간격·글씨는 문제 화면과 같게 `.simple-workbench .dev-part-nav …`로 `simple-dialogue.css`에서 덮는다(문제 화면의
   `.problem-v4-workbench .dev-part-nav` 규칙과 같은 값).
3. **대화창 최대화.**
   - "지금까지 내 요약"(`.simple-restated`)은 라벨과 글을 한 줄에 이어 쓰는 작은 상자로 줄인다(위아래 여백 축소, 글씨 13px). 글이 길면 상자
     높이를 4줄 안팎까지만 쓰고 상자 안에서 스크롤한다. 내용·문구는 그대로.
   - 줄인 높이는 대화 기록(`.chat-scroll`)이 가져간다.
4. **응답 입력 작게.** 입력 영역(`.chat-footer`의 `.dialogue-compose`)을 두 줄로 만든다.
   1. textarea: 두 줄 높이 고정(약 52px, 안에서 스크롤). 라벨 "이 문단의 중심 내용과 관계를 설명해 주세요."는 화면에서 숨기되 접근성 이름으로 남긴다.
   2. 아래 줄: 왼쪽 "⌘/Ctrl + Enter" 작은 글씨, 오른쪽 [보내기]/[다시 시도]. 한 줄 높이 고정.
   - 문단 완료 상태(`chat-progress-actions`: "이 문단은 끝났어요." + 다음 문단/문제 풀기)도 같은 높이 안에 들어가게 한 줄로 정리한다.
   - 오류 문장(`.err`)이 있을 때만 그 위에 한 줄 더 나온다(지금 동작 유지).
   - 1600×1000에서 입력 영역 높이 ≤ 110px.
5. 세 칸 너비 비율(1 : 1.12)은 그대로 둔다.

## 범위 밖

- 판정·대화 문구, 서버, 상태 계산, 서랍(`SimpleDialogueDrawer`), 시작 화면(세션 없을 때의 지문 목록), `DevPartNav.tsx`·`dev-part-nav.css`·
  `dev-part-nav-links.ts`.
- 공용 CSS `dialogue-workbench.css`는 고치지 않는다(다른 화면과 공유). 모든 모양은 `.simple-workbench` 범위로 `simple-dialogue.css`에 쓴다.
- 대화창 자동 스크롤 동작(지금 동작 유지).
- 문제 풀이 화면 파일.

## 손댈 파일과 계약

- `packages/app/src/client/SimpleDialogueApp.tsx`: 위쪽 띠, 원문 칸 머리(제목·시험 정보·`DevPartNav`), 요약 상자·입력 영역 구조. 동작(이동·전송·
  새 시도·단축키·임시 저장)은 바꾸지 않는다.
- `packages/app/src/client/simple-dialogue.css`: 위 배치의 모양.
- 시험: 이 화면 전용 e2e가 없다. 새로 만들지 않는다. 대신 아래 완료 조건의 캡처·측정으로 확인한다. 기존 단위·e2e 시험이 바뀐 마크업에 기대면 의도를
  유지한 채 고친다.

## 완료 조건

- [ ] 목표 1~5가 1600×1000·1280×720에서 성립하고 모형(`…-mock.png`)과 같은 배치다.
- [ ] 900px 이하에서 원문/대화 탭 전환과 입력이 동작한다.
- [ ] `npm run build` 통과, `npm test` 통과(기존 실패 2개 외 새 실패 없음: `boundary.test.ts` student-state node:fs, axis-architecture .omc 파일).
- [ ] 격리 e2e 전체 묶음(`PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test`)에서 이번 변경으로 새로 실패하는 시험이 없다
  (실행 전후 결과를 비교해 보고).
- [ ] 화면 확인: 격리 서버 또는 띄워 둔 개발 서버(5173)에서 **이미 있는 세션을 여는 것만으로**(새 응답 전송 없음, 모델 호출 없음) 1600×1000 캡처를
  `docs/handoffs/2026-10-22-simple-dialogue-layout-economy-after.png`로 남기고, 띠·원문 머리·입력 영역 높이를 측정해 결과 보고에 적는다.
  띄워 둔 서버를 쓸 경우 세션 id는 `.omc/logs/` 아래 문단 대화 기록에서 대화가 있는 것을 고른다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·모델 호출이 필요해지면 실행 전 멈춘다.
- 손댈 파일에 다른 세션의 커밋되지 않은 수정이 생겨 있으면 멈추고 보고한다(시작 시 `git status`로 확인).
- 띄워 둔 개발 서버(5173·5174·5175)를 끄거나 다시 켜지 않는다.
- `git add`·커밋·`git stash`를 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/client/SimpleDialogueApp.tsx`(위쪽 띠에 kicker+개발자 안내 한 줄, 원문 칸 머리에 제목 h1·시험 정보·DevPartNav 이동,
  textarea 라벨에 `simple-sr-only` 클래스), `packages/app/src/client/simple-dialogue.css`(띠·원문 머리·DevPartNav 덮어쓰기는 문제 화면과 같은 값, 요약 상자 한 줄화·88px 상한 내부 스크롤,
  입력 영역 52px + 28px 두 줄, 완료 상태 한 줄, 900px 이하 안내문 줄바꿈). 이 밖의 파일은 손대지 않음. 시작 시 두 파일에 미커밋 변경 없음 확인.
- 테스트 결과: `npm run build` 통과. `npm test` 1349 통과 / 2 실패(기존 2개: boundary.test.ts, axis-architecture .omc 파일, 새 실패 없음).
  e2e 전체(격리 5383/5384): 변경 전 52 통과·1 실패, 변경 후 52 통과·1 실패. 실패는 동일한 기존 시험 1개(`dialogue-workbench.spec.ts:171` 학생 정기 피드백, 이번 변경과 무관).
  화면 측정(1600×1000 / 1280×720): 띠 39px / 39px(≤44), 원문 머리 65.8px / 65.8px(≤72), 입력 영역(`.dialogue-compose`) 86px / 86px(footer 103px, ≤110),
  요약 상자 최대 88px(4줄 안팎, 안에서 스크롤), 대화 기록 650px / 370px, 열 비율 727:815(1:1.12) 유지. 800px에서 가로 스크롤 없음, 원문/대화 탭 전환·입력창 존재 확인.
  캡처: `docs/handoffs/2026-10-22-simple-dialogue-layout-economy-after.png`.
- 남은 문제: (1) 이 서버는 세션을 메모리에만 두어 띄워 둔 서버(5173)에 기존 세션이 없었다. 그래서 별도 서버(5383/5384, 시험 후 종료)에서 모델 호출 없는 `startSimple`로
  새 세션만 열었고, 캡처의 "지금까지 내 요약" 긴 글은 DOM 텍스트를 임의로 바꿔 넣은 것이다. 대화 말풍선이 쌓인 모습과 문단 완료 상태(`chat-progress-actions`)·오류 문장 줄은
  모델 응답이 필요해 화면으로 확인하지 못했고 CSS만 작성했다(사용자 눈 확인 필요). (2) 대화 칸 머리(`생각을 나누는 공간`)는 요청 범위 밖이라 56px 그대로다.
