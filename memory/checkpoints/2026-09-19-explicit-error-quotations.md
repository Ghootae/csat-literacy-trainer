---
date: 2026-09-19
scope: paragraph-explicit-error-quotes
base_commit: uncommitted
---

# 오류 인용 미완성 부분 구현

- 모델 지정 errorClaims를 current 원장 및 실제 학생 인용과 대조한다. 임의 첫 근거 대체 없음.
- snapshot/2차/handoff에 출처 포함 저장, 계약 오류는 기존 1회 재시도·원출력 보존 사용.
- 1차 claims-v2/schema v8, 합성 저장 v6. 교육 정책 V4와 문제 풀이 V3는 유지.
- 관련 9파일 132테스트와 build 통과. 기존 32건 저장출력 오프라인 재생 행동 동일.
- 유료 API 0회, 공개 재시작·UI 수정·커밋 없음. 실모델 인용 선택 품질은 미검증이다.
- 다음 단계는 UI 작업이며, 실제 모델의 기록 품질 확인은 별도 승인된 표적 검증으로 남는다.

근거: `docs/experiments/dialogue-error-quotes-fix-2026-09-19/REPORT.md`,
`packages/pipeline/src/dialogue-experiment/error-recording.test.ts`,
`packages/pipeline/src/learning-session/handoff.test.ts`.
