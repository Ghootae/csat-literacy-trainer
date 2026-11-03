# 교사 시연 기간 운영 안내 (사용자용)

선생님들이 원격으로 `https://dialogue.cogaxis.net`에 접속하는 기간 동안 맥에서 켜 둘 것과 꺼졌을 때 다시 켜는 방법이다. 결정: 기간을 정해 로컬 서버와 터널을 켜 두고, 인증은 두지 않으며, API 사용 한도를 건다(2026-11-03 사용자 승인). 시연용은 개발용과 나눈다(아래 0절).

## 빠른 사용: 시작 스크립트

```
/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh start   # 서버 3개(꺼진 것만)·터널·잠자기 방지 켜고 점검
/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh status  # 무엇이 켜져 있는지
/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh stop    # 시연 끝: 모두 끔
```

로그는 시연용 폴더 `.omc/run/`에 남는다. 아래 절은 스크립트가 하는 일과 손으로 할 때의 방법이다.

## 0. 개발용과 시연용

| | 개발용(사용자) | 시연용(선생님) |
|---|---|---|
| 폴더 | `/Users/mac/Projects/csat-literacy-problem-solving-mvp` | `/Users/mac/Projects/csat-literacy-teacher-demo`(git worktree, 브랜치 `demo/teacher-2026-11`, 커밋 `7bfb5d44` 고정) |
| 포트 | 화면 5173 · 문단 API 5174 · 문제 API 5175 | 화면 **5273** · 문단 API **5274** · 문제 API **5275** |
| 접속 | 이 맥에서만 `http://127.0.0.1:5173` | 터널 `https://dialogue.cogaxis.net` → 5273 |
| 기록 | 개발용 폴더의 `.omc/logs/` | 시연용 폴더의 `.omc/logs/`(저절로 나뉜다) |

- 개발용을 고치거나 다시 띄워도 선생님 화면은 바뀌지 않는다.
- 시연용 `.env`는 개발용 `.env`를 가리키는 링크다(키를 복사하지 않음).
- 개발용 서버에는 `CSAT_PROBLEM_LAB_PUBLIC=1`을 주지 않는다(바깥 공개는 시연용만).

## 1. 시연용 프로세스 4개

시연용 폴더(`/Users/mac/Projects/csat-literacy-teacher-demo`)에서 터미널 창 4개로 실행한다.

| 순서 | 역할 | 명령 |
|---|---|---|
| 1 | 문단 API(5274) | `CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 PORT=5274 node --env-file=.env packages/app/dist/server/index.js` |
| 2 | 문제 API(5275) | `CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 CSAT_PROBLEM_LAB_API_PORT=5275 node --env-file=.env packages/app/dist/server/problem-feedback-entry.js` |
| 3 | 화면(5273) | `CSAT_API_PORT=5274 CSAT_PROBLEM_LAB_API_PORT=5275 npx vite --config packages/app/vite.config.ts --port 5273 --strictPort` |
| 4 | 터널 | `cloudflared tunnel --url http://127.0.0.1:5273 run csat-dialogue` |

- `CSAT_DEVELOPER_MODE=1`이 빠지면 개발자 API가 403으로 막힌다.
- `CSAT_PROBLEM_LAB_PUBLIC=1`이 빠지면 `dialogue.cogaxis.net`으로 들어온 요청이 404로 막힌다. 2번은 켜질 때 "dialogue.cogaxis.net 개발자 문제 풀이 접근 허용" 줄을 찍는다.
- 3번의 두 포트 변수가 빠지면 시연 화면이 **개발용 API(5174·5175)**로 붙는다. 꼭 넣는다.
- 터널 주소가 `5273`인지 확인한다(예전 안내의 5173이 아니다).
- 2026-11-03에 1~3번을 띄워 두었다(터널은 끔). 맥을 재시작하면 다시 띄워야 한다.

## 2. 시작 전 점검

1. 맥 잠자기 방지: 기간 동안 별도 터미널에서 `caffeinate -dis` 실행(창을 닫으면 해제). 전원 어댑터 연결.
2. 공개 주소 확인: 다른 기기(휴대폰 데이터 등)로 `https://dialogue.cogaxis.net/dialogue/lab` 접속 → 지문 목록이 보이고, 정보 비대칭 [시작]을 눌러 문단 화면이 열리는지.
3. API 사용 한도: OpenAI 대시보드의 Limits에서 월 사용 한도(budget)를 시연 기간 예상치보다 넉넉하게 설정. 참고로 각본 전체 1회는 판정 호출 약 11~13번이다.

## 3. 꺼졌을 때

| 증상(선생님 연락) | 원인 | 조치 |
|---|---|---|
| 접속 자체가 안 됨, Cloudflare 오류(1033 등) | 터널 또는 화면(5273) 꺼짐 | 3번·4번 다시 실행 |
| 화면은 뜨는데 [시작]이 안 됨, "찾을 수 없습니다" | API 서버 꺼짐·재시작 | 1·2번 다시 실행. 진행 중이던 대화는 사라지므로 선생님께 처음부터 다시 부탁(이미 쓴 기록은 남음) |
| "평가 다시 시도" 버튼이 뜸 | 판정 모델 일시 오류 | 선생님이 버튼을 다시 누르면 된다(튜토리얼에 안내) |

## 4. 시연용을 갱신할 때 (선생님 화면에 수정 반영)

개발용에서 고친 커밋을 시연용에 일부러 반영할 때만 한다. 진행 중 대화가 끊기므로 선생님이 쓰지 않을 때 한다.

1. 시연용 폴더에서 `git merge --ff-only <커밋>` 또는 `git reset --hard <커밋>`(시연용 폴더에 따로 고친 것이 없을 때만)
2. 의존성이 바뀌었으면 `npm ci`, 그다음 `npm run build`
3. 1~3번 프로세스 다시 실행

## 5. 기록 위치 (시연 후 살펴보기)

시연용 폴더 기준:

- 문단: `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`
- 문제: `.omc/logs/problem-feedback-v4/events.jsonl`
- 선생님 구분: 설문 9번에 붙여 넣은 주소의 `sessionId`(문제)와 `returnTo` 안 `sessionId`(문단).
- 2026-11-03 설정 확인 때 연 시험 세션(문단·문제 각 1, AI 호출 없음)이 기록에 남았을 수 있다. 학생 응답이 없는 세션이라 구분된다.

## 6. 기간이 끝나면

터널(4번)을 먼저 끄고, 나머지를 끈다. `caffeinate`를 끈다. 시연용 폴더는 기록을 옮긴 뒤 `git worktree remove`로 지울 수 있다.
