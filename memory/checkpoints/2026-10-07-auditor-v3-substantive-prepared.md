---
date: 2026-10-07
scope: auditor-v3-substantive-min-two-prepared
base_commit: uncommitted
---

# 감사기 v3(실질 설명 기준 최소 2축) 결정과 준비

사용자의 3문단 판정(표면 장력3·정보 비대칭2는 1축 적당, 공손룡3 경계)과 D-0086 수정 승인에 따라 [D-0088](../decisions/D-0088-substantive-axis-minimum-two.md)을 기록했다.

- 원문 한 문장의 소개·연결 축은 실질 설명 수에서 빼고 흡수·삭제할 수 있다. 한 문장인지와 근거 인용은 코드로 검사한다(사용자 선택).
- `scripts/test-axis-audit-v3.mjs`를 추가하고, 계약 모듈에 `substantiveRule` 옵션을 넣었다.
- 단위 테스트 28/28 통과. 코드 리뷰 지적(MEDIUM 2·LOW 6)을 모두 반영했다: 소개 축을 남긴 채 실질 설명 둘을 합치는 경우 차단, `connective-absorption` 남용 차단, 문장 수 계산 보강, 승인 frontmatter 검사, v2 결과 해시 검증. prepare 통과(API 0회). v2 report 재생성 결과가 이전과 바이트 단위로 같았다.
- 실행(감사 25회)은 전송 승인 대기다. 계획: `docs/experiments/axis-audit-v3-substantive-min-two-2026-10-07/PLAN.md`.
