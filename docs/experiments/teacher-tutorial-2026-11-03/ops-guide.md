# 교사 시연 기간 운영 안내 (사용자용)

선생님들이 원격으로 `https://dialogue.cogaxis.net`에 접속하는 기간 동안 맥에서 켜 둘 것과 꺼졌을 때 다시 켜는 방법이다. 결정: 기간을 정해 로컬 서버와 터널을 켜 두고, 인증은 두지 않으며, API 사용 한도를 건다(2026-11-03 사용자 승인).

## 1. 켜 둘 프로세스 4개

저장소 루트(`/Users/mac/Projects/csat-literacy-problem-solving-mvp`)에서 터미널 창 4개로 실행한다.

| 순서 | 역할 | 명령 |
|---|---|---|
| 1 | 화면(vite, 5173) | `npm run app:client` |
| 2 | 문단 API(5174) | `CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 node --env-file=.env packages/app/dist/server/index.js` |
| 3 | 문제 API(5175) | `CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_LAB_PUBLIC=1 node --env-file=.env packages/app/dist/server/problem-feedback-entry.js` |
| 4 | 터널 | `cloudflared tunnel --url http://127.0.0.1:5173 run csat-dialogue` |

- `CSAT_DEVELOPER_MODE=1`이 빠지면 개발자 API가 403으로 막힌다.
- `CSAT_PROBLEM_LAB_PUBLIC=1`이 빠지면 `dialogue.cogaxis.net`으로 들어온 요청이 404로 막힌다(로컬에서는 열린다). 원격 시연에는 2·3번 모두 필요하다. 3번은 켜질 때 "dialogue.cogaxis.net 개발자 문제 풀이 접근 허용" 줄을 찍는다.
- 코드를 바꿨다면 2·3번 전에 `npm run build`.

## 2. 시작 전 점검

1. 맥 잠자기 방지: 기간 동안 별도 터미널에서 `caffeinate -dis` 실행(창을 닫으면 해제). 전원 어댑터 연결.
2. 공개 주소 확인: 다른 기기(휴대폰 데이터 등)로 `https://dialogue.cogaxis.net/dialogue/lab` 접속 → 지문 목록이 보이고, 정보 비대칭 [시작]을 눌러 문단 화면이 열리는지.
3. API 사용 한도: OpenAI 대시보드의 Limits에서 월 사용 한도(budget)를 시연 기간 예상치보다 넉넉하게 설정. 참고로 각본 전체 1회는 판정 호출 약 11~13번이다.

## 3. 꺼졌을 때

| 증상(선생님 연락) | 원인 | 조치 |
|---|---|---|
| 접속 자체가 안 됨, Cloudflare 오류(1033 등) | 터널 또는 vite 꺼짐 | 1번·4번 다시 실행 |
| 화면은 뜨는데 [시작]이 안 됨, "찾을 수 없습니다" | API 서버 꺼짐·재시작 | 2·3번 다시 실행. 진행 중이던 대화는 사라지므로 선생님께 처음부터 다시 부탁(이미 쓴 기록은 남음) |
| "평가 다시 시도" 버튼이 뜸 | 판정 모델 일시 오류 | 선생님이 버튼을 다시 누르면 된다(튜토리얼에 안내) |

## 4. 기록 위치 (시연 후 살펴보기)

- 문단: `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`
- 문제: `.omc/logs/problem-feedback-v4/events.jsonl`
- 선생님 구분: 설문 9번에 붙여 넣은 주소의 `sessionId`(문제)와 `returnTo` 안 `sessionId`(문단).

## 5. 기간이 끝나면

터널(4번)을 먼저 끄고, 나머지를 끈다. `caffeinate`를 끈다.
