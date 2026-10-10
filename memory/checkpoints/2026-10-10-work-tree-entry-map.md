---
date: 2026-10-10
scope: work-tree-entry-map
base_commit: f1b6131
---

# 작업 수형도 도입과 v5 실제 구성 정정

## 새로 확인된 것

- `CURRENT_STATE.md`는 200줄 상한에 닿아 있어 수형도를 넣을 자리가 없다.
- `docs/WORKSTREAM-STATE.md`는 `INDEX.md`에서 이미 역사 자료로 분류돼 있다. 2026-09-09 갱신분이 커밋되지 않은 채 남아 있으며 이번 작업에서 건드리지 않았다.
- D-0093과 `CURRENT_STATE.md`는 v5에 자동 해석본이 포함된다고 적었으나, 이후 공급자 비교·다문항 시험·개발자 경로 연결은 모두 해석본 없는 methods 조성이었다.

## 결정된 것

- [D-0113](../decisions/D-0113-work-tree-entry-map.md): 제품 기능 단위 수형도 `memory/WORK_TREE.md`를 작업 시작 때 먼저 읽고, 갈래 상태가 바뀐 작업 끝에 갱신한다.
- [D-0114](../decisions/D-0114-v5-current-composition-methods-without-gloss.md): 현재 v5는 methods다. 해석본 사용은 luna·sol의 기호 오독을 확인하기 전까지 보류한다.

## 변경한 것

- `memory/WORK_TREE.md`를 추가했다.
- `AGENTS.md`, `memory/README.md`, `memory/INDEX.md`에 읽기·갱신 절차와 링크를 추가했다.
- `memory/CURRENT_STATE.md`의 v5 구성 서술을 D-0114에 맞게 고쳤다(줄 수 변화 없음).
- `scripts/validate-memory.mjs`의 필수 파일에 `memory/WORK_TREE.md`를 추가했다.

## 미해결

- 없음.

## 다음 행동

- 해석본 갈래: 다문항 시험 결과에서 luna·sol의 기호·지칭 오독 사례를 확인한다.

## 근거

- `memory/WORK_TREE.md`
- `docs/handoffs/2026-10-10-v5-developer-path-connection.md`
- `docs/review/v5-multi-item-luna-sol-report-2026-10-08.md`
