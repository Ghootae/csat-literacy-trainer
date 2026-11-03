# 교사 시연 진행 방법 (사용자용, 쉬운 판)

같은 프로그램이 **두 벌** 돌아간다. 사용자가 고치며 쓰는 **개발용**과 선생님들이 쓰는 **시연용**이다. 서로 영향을 주지 않는다. 자세한 설명과 손으로 켜는 방법은 [`ops-guide.md`](./ops-guide.md)에 있다.

## 개발용으로 들어갈 때

이 맥에서만 열리는 주소다. 지금까지와 같다.

- 문단 화면: `http://127.0.0.1:5173/dialogue/lab`
- 문제 화면: `http://127.0.0.1:5173/problem/lab`

## 시연 전에 한 번만

1. 튜토리얼 공유 켜기: https://claude.ai/artifact/TCi2UnjiUsisaihjWVuozu 를 열고 Share 메뉴에서 링크 공유를 켠다.
2. 구글 폼이 로그인 없이 응답되는지 확인한다.
3. OpenAI 대시보드 Limits에서 월 사용 한도를 걸어 둔다.

## 시연을 시작할 때

1. 전원 어댑터를 연결한다.
2. 터미널에 붙여 넣는다.
   ```
   /Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh start
   ```
   시연용 서버 3개, 바깥 문(터널), 잠자기 방지를 켜고 스스로 점검한다. 마지막 줄에 "준비 완료"가 나오면 된다.
3. 휴대폰(와이파이 끄고 데이터)으로 `https://dialogue.cogaxis.net/dialogue/lab` 을 열어 지문 목록이 보이고 [시작]이 눌리는지 본다.
4. 선생님들께 튜토리얼 링크와 사용 기간을 보낸다.

## 시연 중에

- 무엇이 켜져 있는지 보려면:
  ```
  /Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh status
  ```
- 선생님이 "안 열린다", "찾을 수 없다"고 연락하면 `demo.sh start`를 다시 실행한다. 꺼진 것만 다시 켠다. 진행 중이던 대화는 사라지니 처음부터 다시 부탁드린다.
- 개발용 화면은 평소처럼 고치고 써도 된다. 선생님 화면은 바뀌지 않는다.
- 맥을 끄거나 재시작하면 선생님 접속도 끊긴다. 다시 켠 뒤 `demo.sh start`.

## 시연이 끝나면

```
/Users/mac/Projects/csat-literacy-problem-solving-mvp/docs/experiments/teacher-tutorial-2026-11-03/demo.sh stop
```

바깥 문을 닫고, 잠자기 방지를 풀고, 시연용 서버를 끈다. 개발용은 건드리지 않는다.

## 끝난 뒤 살펴볼 것

- 설문 응답: 구글 폼.
- 선생님이 쓴 대화 기록: 시연용 폴더 `/Users/mac/Projects/csat-literacy-teacher-demo/.omc/logs/`. 설문 9번에 붙여 넣은 주소로 누구의 기록인지 찾는다. 코드 에이전트에게 "교사 시연 기록 살펴봐"라고 하면 된다.
