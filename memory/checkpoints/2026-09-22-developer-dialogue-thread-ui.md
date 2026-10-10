# 개발자 3단 대화 스레드 UI 구현

- 날짜: 2026-09-22 KST
- `/dialogue/dev`에서 현재 이해 모듈을 가운데 상단에서 오른쪽 검사 패널의 최상단으로 이동했다. 오른쪽은 현재 이해, 골드, 평가 자료를 하나의 독립 스크롤에서 보여 준다.
- 개발자 대화에는 `1차 응답`, `1차 피드백`, `1차 확인 질문`, `2차 응답`, `2차 피드백`처럼 진행 단계를 표시한다.
- `UNCLEAR_OK` 뒤에도 입력창을 같은 위치·크기로 남겨 비활성화하고, `보완하기` 질문 생성 뒤 같은 입력창을 활성화한다.
- 선택적 질문 생성 전에 이미 제시한 판정·피드백을 `evaluationBeforeQuestion`으로 보존해 질문 생성 뒤에도 대화에서 사라지지 않게 했다.
- 학생용 `/dialogue`는 2단 배치와 기존 표현을 유지했다.
- 검증: 전체 TypeScript build와 client typecheck 통과, 관련 Vitest 22/22 통과, 개발자/학생 브라우저 회귀 4/4 통과.
- 수정 빌드로 앱을 재시작했고 `https://dialogue.cogaxis.net/dialogue/dev` 및 `/api/dialogue/passages` HTTP 200을 확인했다.

관련 결정: [`D-0032`](../decisions/D-0032-developer-dialogue-thread-ui.md), [`D-0031`](../decisions/D-0031-developer-ui-url-only.md).
