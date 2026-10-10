---
id: D-0113
status: accepted
date: 2026-10-10
scope: memory-work-tree-entry-map
supersedes: none
---

# 작업 수형도를 메모리 진입점으로 둔다

## 결정

사용자 결정(2026-10-10)에 따라 병렬 작업의 갈래·상태·다음 한 단계를 수형도로 보여 주는
[`WORK_TREE.md`](../WORK_TREE.md)를 `memory/`에 두고, 작업 시작 때 `CURRENT_STATE.md`보다 먼저 읽는다.

- 최상위 갈래는 제품 기능 단위다(문단 골드 생성, 문단 요약 응답 판정, 문항 기호 해석본 생성,
  문제 풀이 응답 판정, 학습자 생각 진단, 문항 골드). 피드백·코칭은 문제 풀이 응답 판정의 하위
  갈래로 두고, UI 연결은 별도 갈래 없이 해당 기능 노드에 상태로 붙인다.
- 형식은 마크다운 안의 텍스트 트리다. 노드는 상태 기호·한 줄 요약·다음 한 단계·근거 번호만 담고,
  근거 링크는 같은 파일의 표에 둔다.
- 갈래 상태나 다음 한 단계를 바꾼 작업은 끝날 때 수형도를 갱신한다(`AGENTS.md`, `memory/README.md`).
- `scripts/validate-memory.mjs`는 이 파일을 필수 파일로 검사하고, 근거 표의 링크도 기존 링크 검사로 확인한다.

## 근거

- 사용자 요청: 병렬 작업 중 작업 상태를 직관적으로 파악하기 어렵다(2026-10-10).
- `CURRENT_STATE.md`의 문제 풀이 대화 항목은 한 문단에 여러 결정이 이어져 갈래 구분이 어렵다.
- `CURRENT_STATE.md`는 200줄 상한(`memory/README.md`, `scripts/validate-memory.mjs`)에 이미 닿아 있어 수형도를 넣을 자리가 없다.

## 폐기한 대안

- `docs/WORKSTREAM-STATE.md`를 수형도로 교체: 이 문서는 `INDEX.md`에서 2026-09-09까지의 역사 자료로 분류돼 있다. 되살리면 정본이 둘이 되고 역사 기록을 덮어쓴다.
- `CURRENT_STATE.md` 맨 위에 삽입: 200줄 상한과 충돌한다. 본문을 줄이는 일은 별도 작업이다.
- Mermaid 다이어그램: 터미널에서 보이지 않고 diff 검토가 어렵다.
- 최상위를 병렬 세션 단위로 나눔: 사용자가 제품 기능 단위를 택했다.

## 재검토 조건

수형도가 두 번 이상 연속으로 실제 상태와 어긋난 채 발견되거나, 갈래가 많아져 한 화면에 들어오지 않으면 형식·단위를 다시 정한다.

## 근거 자료

- `memory/WORK_TREE.md`
- `memory/README.md`
- `scripts/validate-memory.mjs`
- `memory/INDEX.md`의 "이전 상태 문서" 절
