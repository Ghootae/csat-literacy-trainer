---
date: 2026-10-25
scope: paragraph-simple-v47-operating-candidate
base_commit: 2b0d2a1
---

# 문단 요약 운영 후보 단순 형식 v4.7 확정과 작동 순서 문서

## 변화

- [D-0174](../decisions/D-0174-paragraph-simple-v47-operating-candidate.md): 근본 검토(D-0138)를 끝내고 단순 형식 v4.7(luna)을 문단 요약 운영 후보로 확정했다. 학생용 `/dialogue`(V4)는 그대로다.
- 코드: 개발자 주소 `/dialogue/dev/simple` → `/dialogue/lab`(옛 주소 넘김, `returnTo`로 계속 허용, 잘못된 `returnTo` 기본값 `/dialogue/lab`), `PARAGRAPH_SIMPLE_DEFAULT_MODEL` terra → luna. 고친 파일: `main.tsx`, `SimpleDialogueApp.tsx`, `dev-part-nav-links(.test).ts`, `paragraph-simple/evaluator.ts`. build·client 타입 검사 통과, test 1374/1376(기존 실패 2건 그대로).
- 작동 순서 문서 [`docs/PARAGRAPH-LAB-FLOW-2026-10-25.md`](../../docs/PARAGRAPH-LAB-FLOW-2026-10-25.md): 모델 호출 하나를 단계 S1 INITIAL·S2 RETRY·S3 AFTER_CORRECTION·S4 AFTER_GAP로 나누고, 모델 없는 동작(N)·저장 기록·확인 필요 11건을 `파일:줄` 근거로 정리했다. 하위 에이전트 작성, 코드 에이전트가 근거 표본 5곳 대조(일치).

## 열린 것

- 축 기반 쪽은 보류로 결정(D-0174 영향 절). 폐기 여부는 학생용 전환 때.
- 문서 6절 확인 필요 11건(예: v4.6·v4.7 변경에 결정 기록 없음, 교정 질문 중 근거 힌트 표시가 D-0140·D-0144와 다름).
- 판정 모델 기본값 변경은 서버 재시작 뒤 반영(현재 서버는 환경변수로 이미 luna).
