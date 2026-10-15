# 2026-10-15 보여 주기 개발자 모드 구현·첫 사용·후속 결정

- [D-0134](../decisions/D-0134-boundary-show-dev-mode-central-object.md) 개발자 모드 `v4-boundary-show` 구현: [인계](../../docs/handoffs/2026-10-15-boundary-show-dev-mode.md) → executor 구현, Claude diff 검토와 `DialogueApp.tsx` 2건 직접 수정(질문 없는 보여 주기에서 마지막 피드백 말풍선 숨김, 질문 수 표시 `maxQuestions`). 신규 테스트 25/25·build 통과, `npm test` 1206 통과·기존 실패 2(`boundary.test.ts`의 `student-state.ts` `node:fs`, `axis-architecture-experiment.test.ts` `.omc/adhoc` 파일 없음). 미커밋.
- 손 연결 자산 `packages/pipeline/fixtures/experiments/dialogue/central-object-axis-spans/manual-v0.json`(공손룡·법인·표면장력 16문단).
- 사용자 첫 사용 피드백 12건을 [메모](../../docs/review/boundary-show-dev-ui-feedback-2026-10-15/README.md)에 기록(그림 7장). 미구현.
- 확인한 동작:
  - 질문 대상 축은 게이트 모델이 하나 고른다(같은 등급이면 ID 순서 아님, `central-story-gate-prompt-v4.md:120-127`).
  - 엉뚱한 응답은 모든 축 unknown→근거 없는 축은 OK 불가(`gate.ts:242-245`)라 전체 SERIOUS→질문. 따로 거르는 코드 없음.
  - 로그 판정 1,985건 중 모든 축 unknown 2회는 둘 다 주제는 맞는 짧은 응답, 무관 응답 0건 → 무관 응답 거르기는 보류(메모 12번).
  - 도파민 p1: "내 요약"이 1차 응답만 보여 줌(명세대로), 도파민은 자산 없음이라 밑줄 없는데 밑줄 안내 문구 고정(메모 11번).
- 새 결정:
  - [D-0135](../decisions/D-0135-boundary-show-error-question-per-axis.md): 질문 상한 = 1차 ERROR 축 수, 오류 축마다 한 번, 실패는 알리고 다음 오류 축, 남은 ERROR·SERIOUS 모두 표시.
  - [D-0136](../decisions/D-0136-boundary-show-banmal-question-feedback.md): 이 모드의 질문·피드백 반말(전용 프롬프트 변형), 괜찮으면 같은 버전 운영(별도 승인).
  - [D-0137](../decisions/D-0137-boundary-show-effective-response-restatement.md): 재구성 응답·"내 요약"은 `effectiveResponse`. 로그상 3인칭 보고체·빠진 내용 언급·수정 경위 언급은 시험에서 관찰.
- 새 열린 질문 [Q-0036](../OPEN_QUESTIONS.md): 축 하나에 한 내용. gold-v2 축 수 1축14·2축15·3축2, 묶임 의심 정보비대칭p2·법인p1·mRNA p1·p5 등. gold-v2 미변경, 법인p1 시험.
- 확정 전(사용자 보류): 안내 문구를 "맞게 잡은 축(PASS/OK)이 하나라도 있으면 칭찬·안심 문장" 규칙으로 나눌지, 축 수별 권고(1축 하이라이트 생략, 3축 현행 유지, 마지막 오류 축 실패 알림 생략).
- 다음: 위 문구 규칙·축 수별 권고 확정 → 피드백 12건과 D-0135~0137을 묶은 개발자 모드 UI v2 인계 → executor 구현. 이 갈래의 미커밋 파일은 목록·메시지 승인 후 커밋.
