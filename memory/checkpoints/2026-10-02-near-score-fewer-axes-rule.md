---
date: 2026-10-02
scope: next-axis-test-near-score-selection
base_commit: uncommitted
---

# 다음 시험의 근소 점수 차이에서 적은 축 우선

## 새로 확인된 것

- 사용자가1/2위평균점수가근소하면축이적은후보를선택하도록다음시험규칙기록을요청했다.
- 처음임계값을미정으로기록한뒤사용자가‘0.10점이내’를선택했다.4점만점의반복평균에서1위−2위≤0.10으로확정했다.

## 결정된 것

- D-0068: 다음오프라인시험의적은축우선규칙수용. 과거실험결과소급수정없음.

## 변경한 것

- 결정·현재상태·색인·열린질문을기록했다. 코드/골드/UI변경·API호출없음.

## 미해결

- 세후보이상근접한경우의확장규칙은미결정.

## 다음 행동

- 다음시험선택기에확정기준을적용한다.

## 근거

- `memory/decisions/D-0068-near-score-fewer-axes-next-test.md`
- `docs/experiments/axis-candidate-jev-mrna-passage-2026-10-02/selection.json`
