# v5 학생 진술 모순 판정 불가·충분성 인용 하나 (2026-10-21)

## 바뀐 것

- UI 메모장 23·24번 방향 사용자 결정 → [D-0156](../decisions/D-0156-self-contradiction-unknown-via-claim-conflicts.md)·[D-0157](../decisions/D-0157-rationale-sufficient-needs-single-student-quote.md).
- 1차 구현(지시문 문단 + `sufficiencyEvidence` 필수 인용, [인계](../../docs/handoffs/2026-10-21-v5-self-contradiction-unknown-and-sufficiency-evidence.md)) 실모델 2/4: U1·V1 실패.
- 2차 구현(`claimConflicts` 출력 칸·서버 검증, 충분성 인용 정확히 하나·오류 인용 금지, [인계](../../docs/handoffs/2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote.md)) 실모델 6/6.
  executor 구현, Claude diff 검토(인계 밖 `feedback-v4-evaluator.ts` 한 줄은 새 칸을 떼는 데 필요해 수용).
- 시험: build·typecheck:client 통과, vitest 1332 통과·2 실패(기존), e2e 12/13(기존 DevPartNav 1).
- 논의 자료 `docs/review/backlog-23-…`, `backlog-24-…` 작성. 메모장의 "오류를 모두 고치면 근거 확인" 서술 정정.

## 추가: 25번 반영

- [인계](../../docs/handoffs/2026-10-21-v5-correct-unverified-judgment-method.md) 승인·executor 구현 → [D-0159](../decisions/D-0159-correct-unverified-judgment-method-note.md).
  실모델 1차(5세션): 방식 인정 제거 2/2, 까닭 빠짐, 대조 M2·L1은 첫 판정 SUPPORTED. 지시문 보강(Claude 직접) 뒤 M1 2회: 까닭 1/2 분명, 1/2 간접.
- 새 항목 UI 메모장 29번(첫 판정이 원문 밖 지식·사실만 쓴 근거를 SUPPORTED로 봄), 방향 미정.
- `scripts/` 아래 `node --test` 모의 시험 5개 실패(npm test 밖). 옛 흐름 기대 등 낡은 시험으로 보이나 이번 변경 영향 여부는 HEAD 빌드가
  다른 세션 파일로 깨져 확인 못 함.

## 추가: 29번 반영

- 다른 Claude 의견 + Claude 권고(조각별 학생 인용) 사용자 동의 → [인계](../../docs/handoffs/2026-10-21-v5-supported-key-relation-coverage.md), executor 구현,
  보강 2회(Claude 직접) → [D-0161](../decisions/D-0161-supported-needs-key-relation-coverage.md). 실모델 1차 9/12 → 2차 5/6 → 3차 6/6.
- 사용자 판정: B1("뇌에 못 들어가") 근거 부족, K1(회사법) 충분.
- 시험: npm test 1343 통과·2 실패(기존), e2e 12/13(기존), 파이프라인 409/409.

## 다음

- `scripts/` 모의 시험 정리.
- 23·24·25번은 커밋됨(2026-10-21, 코드 1edb2be + 문서 43605dc). 29번도 커밋됨. `scripts/` 모의 시험 파일 5개는 이전 변경과 섞여 제외.
