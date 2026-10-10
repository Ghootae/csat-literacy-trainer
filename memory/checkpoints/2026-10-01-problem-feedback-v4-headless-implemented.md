---
date: 2026-10-01
scope: problem-feedback-v4-headless-implementation
base_commit: uncommitted
---

# 문제 피드백 통합 정책의 헤드리스 구현

## 이번 변경

- 사용자 명시적 구현 승인으로 D-0059를 v4 코어·평가기·프롬프트·서버/API·저장 계약으로 구현했다.
  별도 로컬 개발자 API이며 UI와 기존 v3 진입점은 전환하지 않았다.
- 극성 정규화와 코드 일관성 비교, 전체 UNKNOWN 우선, 최대 두 선택, 최초 오류별 한 번 질문,
  누적 실제 수정 확인, 새 오류의 질문 미추가·추적, 이미 수정된 질문 생략, 종료 코칭의 정답 공개를 구현했다.
- 새 오류는 별도 목록으로 보존하며 뒤 평가에서 누락해 성공으로 바꿀 수 없다. 교정 단계는 과거
  선택과 수정된 근거를 비교하지 않는다. 입력 부재·명시적 미제출·평가 실패·문항 검토를 분리했다.
- 제출 전이 중복 방지, revision 검증, 기본 한 번 자동 재시도와 수동 재개, JSONL 감사 기록을 추가했다.
  평가기 오류를 학생 UNKNOWN으로 바꾸지 않으며 잘못된 인용이나 내부 출력은 공개 뷰에 내보내지 않는다.

## 검증

- 새 테스트 64개: 코어/평가기 55, 컨트롤러/저장 7, HTTP 2. 실제 정보 비대칭 13번 원문을 읽는
  HTTP 흐름도 모델 판정은 고정 응답이다. 유료 호출 0회.
- build 및 클라이언트 타입 검사 통과. 전체 테스트 992개 중 990 통과, 기존 별도 범위 2 실패:
  `packages/app/src/boundary.test.ts`의 `server/student-state.ts` 저장소 경계와
  `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`의 기존 `.omc/adhoc` fixture 누락.
- HTTP 포트 사용은 샌드박스에서 EPERM이 발생해 허용된 임시 loopback 서버로 검증했다.
  운영 서버 재시작이나 배포는 하지 않았다. 실제 차감과 학생 집계 편입도 하지 않았다.

## 남은 범위

실모델 의미 정확성·암시적 정답 힌트·교정 확인의 과수용은 mock 테스트로 해결됐다고 주장하지
않는다. 서버 재시작 후 세션 자동 복원은 기존 운영과 마찬가지로 범위 밖이다. 다음은 별도 실행
범위와 비용 한도를 정한 실모델 회귀 및 사람 검토다. UI 연결과 운영 전환은 후속 승인 대상이다.

## 근거

- `docs/PROBLEM-FEEDBACK-V4-IMPLEMENTATION-2026-10-01.md`
- `memory/decisions/D-0060-problem-feedback-v4-headless-implementation.md`
- `packages/pipeline/src/problem-solving/feedback-v4.test.ts`
- `packages/app/src/server/problem-feedback-v4.test.ts`
- `packages/app/src/server/problem-feedback-v4-http.test.ts`
