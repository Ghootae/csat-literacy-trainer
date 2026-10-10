---
date: 2026-10-02
scope: source-axis-l2-suspicion-auto-merge-rule
base_commit: uncommitted
---

# 다음 후보 시험의 L2 의심 자동 병합 결정

## 작업 델타

- 사용자가 FA 회피를 우선하며 L2 중복 의심 그룹을 자동 병합하도록 결정했다(D-0076).
- 다음 시험에서는 L1·원문 재확인 승인/거절 단계를 제거한다. 기존 경계 일치 후보 선택 또는 병합 L1 생성 후 L2 재생성의 흐름을 유지한다.
- 규칙만 기록했다. 코드 변경·API 호출·기존 자산/UI 변경 없음. 기존 5지문 실행과 점수는 그대로 보존한다.

## 근거

- `memory/decisions/D-0076-l2-suspected-duplicate-auto-merge.md`
