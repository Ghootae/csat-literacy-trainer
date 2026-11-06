# 체크포인트: SNS 진단평가 백엔드(인계 A) 작성·구현·검토

- 날짜: 2026-11-06
- 인계 문서: `docs/handoffs/2026-11-06-sns-diagnostic-backend.md`(결과 보고 칸에 변경 파일·테스트 수치).
- 결정: [D-0208](../decisions/D-0208-sns-diagnostic-skip-item-review-rationale-prompt.md). 1~3은 코드 대조에서 찾은 빈칸에 대한 사용자 선택,
  4~5는 웹 에이전트 검토(`docs/review/sns-diagnostic-backend-handoff-review-2026-11-06.md`)에 대한 사용자 동의.

## 바뀐 것

- 세트 목록 `packages/pipeline/fixtures/experiments/sns-diagnostic/diagnostic-set-e.json`(생성 `scripts/build-diagnostic-set.mjs`).
- `SKIP` 명령·`SKIPPED` 종료 사유(`packages/pipeline/src/problem-solving/feedback.ts`), 마지막 설명 지시문 정의 한 문장 추가.
- 사고 진단 v0.1·문단 판정 v3 모듈(`packages/pipeline/src/thought-diagnosis/`, `analysis-judge/`): 스크립트와 요청 본문 동치 테스트 통과.
- 위치 추정 모듈(`packages/pipeline/src/diagnostic-position/`): `OUTPUT.md` 3절 표와 일치.
- 진단 컨트롤러·저장·API(`packages/app/src/server/diagnostic/`), `CSAT_DIAGNOSTIC_ENABLED=1`일 때만 등록.

## 검토에서 고친 것(코드 에이전트 diff 검토)

- 오답의 사고 진단도 첫 선택 판정 뒤에 대상 여부를 정한다(문항 검토 문항 호출 0회).
- `WRONG_SUPPORTED` 표시는 오답 + `SUPPORTED` + 선택–근거 일치(곧 `ITEM_REVIEW`)만. 불일치는 교정 질문으로 가는 정상 경로.

## 구현 중 처리(승인)

- 세트 E 확정 입장 파일에 합성 노드 입장이 없어 확정 명제 입장에서 다시 계산. 의식과 인지 (가)의 옛 `node-stances.json`은 P4-4 덮어쓰기 전 값.
- 이미지 문항 두 개(경마식 q7·오디오 q17)의 `contentHash`에 `sha256:` 접두가 없어 읽을 때만 보정.
- 서버 재시작 때 요약 대화 세션은 새로 열림(첫 발화 기록·문단 판정 결과는 유지).

## 시험

- `npm run typecheck` 통과. `npm test` 1590/1592, 실패 2건은 기존(`boundary.test.ts`의 `student-state.ts` `node:fs`, `axis-architecture-experiment.test.ts`의 `.omc/adhoc` 없음).
- 외부 전송 없음.
