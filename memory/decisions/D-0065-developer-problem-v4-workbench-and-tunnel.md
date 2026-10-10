---
id: D-0065
status: accepted
date: 2026-10-02
scope: developer-problem-v4-ui-and-public-tunnel
supersedes: none
---

# 개발자 문제 풀이 v4 UI·기존 터널 연결 승인

## 사용자 결정

- PPT는 배치와 응답·피드백 흐름을 전달하는 와이어프레임이다. 색상·크기·간격을 그대로
  복제하지 않고 현재 문단 요약 UI에 어울리도록 다듬는다.
- 개발자용만 전체 지문 / 문제·선지 / 누적 대화의 3단으로 구현한다. 번호 선택은 대화
  하단 근거 입력창과 함께 배치하고 최초/재선택 시에만 활성화한다.
- 최근 검증한 문제 피드백 v4를 연결하며 개발자 평가 정보는 서랍에서 조회한다.
- 기존 `dialogue.cogaxis.net`에서 v4 직접 테스트를 포함한다. 인증 없는 공개 개발자
  주소라는 설명에 사용자가 ‘포함’, 이어 ‘작업 승인’이라고 명시했다.
- 정답+근거 확인 불가는 기존 미검증 정답 종료를 유지한다. 추가 코칭을 붙이지 않는다.
- 학생용 `/dialogue`·기존 `/problem`과 평가 정책·실제 포인트 차감은 변경하지 않는다.

## 구현 경계

- 새 경로 `/problem/dev/v4`. 개발자 학습 맵 및 문단 완료 후 연결 버튼은 이 경로를 연다.
  이전 v3 직접 경로는 회귀용으로 보존한다.
- v4 API는 서버 developerMode가 필요하다. 외부 Host는 별도
  `CSAT_PROBLEM_V4_PUBLIC=1`과 정확한 `dialogue.cogaxis.net`의 조합에서만 허용한다.
  다른 Host 및 기본 비활성 조건은 차단한다. 이 Host 검사는 인증 수단이 아니다.
- 원래 문단/v3 메모리 세션을 잃지 않도록 v4 API를 별도 loopback 5175에 띄우고 Vite의
  v4 경로 프록시만 분리한다. 5174 문단 API와 그 세션은 재시작하지 않는다.
- 학습 집계에 v4 기록을 자동 편입하지 않는다. 운영 학생용 승격이나 모델 의미 정확도
  재검증 승인으로 확대하지 않는다.

## 근거

- 2026-10-02 사용자 PPT 설명, 디자인 자유 조정 확인, 터널 포함 및 작업 승인.
- `packages/app/src/client/ProblemFeedbackV4App.tsx`
- `packages/app/src/client/FeedbackV4Drawer.tsx`
- `packages/app/src/server/problem-feedback-v4.ts`
- `packages/app/src/server/index.ts`
- `packages/app/vite.config.ts`
- `memory/checkpoints/2026-10-02-developer-problem-v4-ui-live.md`

## 재검토

학생 UI 승격, 인증/비용 제한 강화, 세션 재시작 복원 또는 공개 호스트 추가 시 별도 결정한다.
D-0060·D-0064의 UI 제외/부분 구현 문구는 당시 범위에 대한 이력이며 이번 승인으로 전체
개발자 화면을 연결했다. 학습 분기 정본은 D-0059를 유지한다.
