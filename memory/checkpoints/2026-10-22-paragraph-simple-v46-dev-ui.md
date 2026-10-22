---
date: 2026-10-22
scope: paragraph-summary-dialogue-simple
base_commit: 8093f47
---

# 단순 형식 v4.6 마무리 형식 · 개발 화면 파트 이동 막대 · 생각중 말풍선 · 교정 질문 힌트

## 새로 확인된 것

- v4.6 표본 12사례($0.037, [결과](../../docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-19-v4.6-sample/)):
  마무리 피드백이 문단 전체를 보고 "2번 내용"처럼 부분 번호로 가리킨다. 한 사례에 말투 흔들림("~해")이 있었다.
- 개발 서버 재시작 뒤 실제 판정 1회(gpt-6-luna, `paragraph-simple-holistic-v4.6`): 도파민 1문단 오류 요약 → 교정 질문,
  근거 문장 "…혈액-뇌 장벽을 통과할 수 없다."가 힌트로 표시됨(API 응답으로 확인, 브라우저 화면은 미확인).

## 결정된 것

- 사용자: 질문 뒤 마무리를 "전체 피드백 + 부분별 핵심 상자"로("모두 적용", "권고대로"). D-0149의 부분 수정 범위 안이라 새 결정 기록 없음.
- 사용자: 교정 질문(`CORRECTION_QUESTION`)에만 근거 문장을 옅은 미색 힌트로 표시, 빈 곳 질문에는 표시 안 함, 표시 문장 베끼기는 받아들임("권고 동의").

## 변경한 것

- v4.6: 출력에서 `coreIntro`·`coreSummary`·`missingNote` 삭제, `corePartSummaries`·`closingFeedback` 추가, 말풍선 재구성([인계](../../docs/handoffs/2026-10-19-paragraph-simple-v4.6-part-wise-closing.md)).
- 개발 화면 두 곳(`/dialogue/dev/simple`, `/problem/dev/v4`)에 파트 이동 막대([인계](../../docs/handoffs/2026-10-19-dev-part-nav.md)).
- 판정 중 생각중 말풍선(단계·경과 시간별 문구)과 교정 질문 힌트 표시([인계](../../docs/handoffs/2026-10-22-simple-dialogue-waiting-and-correction-hint.md)).
- 시험: 빌드·클라이언트 타입 검사 통과, `packages/app/src` 221 통과·1 실패(기존 boundary node:fs).

## 미해결

- 생각중 말풍선과 힌트 미색(#fffaeb)의 실제 화면 가독성은 사용자 사용으로 확인한다.

## 다음 행동

- 사용 피드백(정보 비대칭 5문단 결과 검토 요청 등)을 보고 부분 수정 후보를 정한다.

## 근거

- `packages/pipeline/src/paragraph-simple/`, `packages/app/src/server/dialogue-simple.ts`, `packages/app/src/client/SimpleDialogueApp.tsx`
