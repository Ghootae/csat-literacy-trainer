---
date: 2026-10-25
scope: lab-flow-docs-check-items
base_commit: 3ee782c
---

# 작동 순서 문서 6절 '확인 필요' 20건 처리

## 변화

- 두 작동 순서 문서(`docs/PROBLEM-LAB-FLOW-2026-10-24.md`, `docs/PARAGRAPH-LAB-FLOW-2026-10-25.md`)의 6절을 대조 결과 표로 바꿨다. 사용자 승인: "응, 권고대로 진행해".
  - 문제 9건: 해소 4, 사실 기록 2, 수정 1, 남김 2.
  - 문단 11건: 해소 3, 사실 기록 3, 수정 4, 남김 1.
- [D-0175](../decisions/D-0175-paragraph-simple-correction-hint-during-question.md): 2026-10-22 체크포인트에만 있던 교정 질문 힌트 결정을 기록으로 올렸다. D-0140·D-0144에 대체 링크를 달았다.
- 코드 수정 5건([인계·결과 보고](../../docs/handoffs/2026-10-25-lab-flow-check-items.md)):
  - 문제 화면의 선택 횟수가 `maxSelections`를 쓴다.
  - 문단 `problemUrl`이 공용 `problemLink`로 `returnTo`를 붙인다.
  - 단계 기록에 `sourceCopyDetected`를 남긴다.
  - 문단 판정 입력의 `targetError`는 AFTER_CORRECTION에서만 넘긴다. 실행 기록 107단계 중 1건이 이 경로였다.
  - 문단 판정기가 일시적 API 오류(408·409·429·5xx)를 1회 재시도한다. 한도는 검증 재요청과 공유한다.

## 검증

- `npm run build` 통과, `npm run typecheck:client` 통과.
- `npm test`: 1380 통과, 2 실패. 두 실패는 바뀐 파일과 무관하다.
  - `boundary.test.ts`: `server/student-state.ts`의 `node:fs`.
  - `axis-architecture-experiment.test.ts`: 헤겔 fixture 없음.
- 실모델 호출은 하지 않았다.

## 남은 일

- 문제 판정 출력의 `coaching` 필드는 쓰이지 않는데, 검증 실패 시 재요청과 판정 실패를 일으킬 수 있다. 지시문 제목("v3 기반 v4 연결 후보")과 종료 코칭 문단(251-254행)도 현재 동작과 다르다. v5 지시문·스키마가 바뀌는 일이라 48세션 회귀와 함께 별도 과제로 한다.
- 문단 지문 목록 `available`이 골드 상태에 묶여 있다. 골드 없는 지문을 추가할 때 단순 형식 화면의 필터를 따로 둔다.
