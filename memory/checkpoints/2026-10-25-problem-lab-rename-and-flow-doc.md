---
date: 2026-10-25
scope: problem-lab-rename-and-flow-doc
base_commit: dc6c295
---

# 개발자 문제 경로 이름 정리와 작동 순서 문서

## 변화

- [D-0173](../decisions/D-0173-problem-lab-version-free-code-names.md): 개발자 문제 화면 주소를 `/problem/lab`으로 바꾸고 코드 이름에서 v4·v5를 뺐다([인계·결과 보고](../../docs/handoffs/2026-10-24-problem-lab-rename.md)).
  - 옛 주소 `/problem/dev/v4`는 쿼리를 유지한 채 새 주소로 넘긴다. 옛 API 접두 `/api/developer/problem-feedback-v4/`와 옛 환경변수(`CSAT_PROBLEM_V4_API_PORT`·`CSAT_PROBLEM_V4_PUBLIC`·`CSAT_PROBLEM_FEEDBACK_V4_LOG`)도 받는다.
  - 저장 값(세션 `version 'problem-feedback-v4'`, `schemaVersion 'problem-feedback-v4-record-v1'`, 로그 경로 `.omc/logs/problem-feedback-v4/`)과 `promptVersion 'problem-feedback-v5'`는 유지했다.
  - 인계에 없던 추가 개명: CSS 클래스 `v4-*`→`lab-*`, sessionStorage 키 `csat.problem.v4.*`→`csat.problem.lab.*`(호환 없음), 모델 응답 스키마 이름 `problem_feedback_v4_*`→`problem_feedback_*`.
  - 검증: build 통과, test 1374/1376(실패 2건은 개명 전과 같은 `boundary.test.ts` D4 규칙 1·`axis-architecture-experiment.test.ts`). e2e(옛 주소 넘김 포함)는 실행하지 않았다. 5175 서버는 개명 전 코드로 돌고 있다.
- 작동 순서 문서 [`docs/PROBLEM-LAB-FLOW-2026-10-24.md`](../../docs/PROBLEM-LAB-FLOW-2026-10-24.md): 모델 호출 5단계(M1 ASSESSMENT/SELECTION, M2 CONCLUSION_AUDIT, M3 ASSESSMENT/REPAIR, M4 END_EXPLANATION, M5 COACHING)와 모델 없는 2단계(N1 코드 전이, N2 출제자 전략)를 단계별 프롬프트·모델·입출력·검증과 `파일:줄` 근거로 정리했다. 하위 에이전트가 작성했고 코드 에이전트가 근거 표본 6곳을 대조해 일치를 확인했다(전수 대조는 안 함).

## 열린 것

- 문서 6절 "확인 필요" 9건(코드와 결정 기록·프롬프트 문구의 어긋남). 사용자 판단 전.
- 5175 서버 재빌드·재시작, e2e 실행.
