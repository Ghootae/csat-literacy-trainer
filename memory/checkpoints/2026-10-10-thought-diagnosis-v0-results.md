---
date: 2026-10-10
scope: thought-tracker-diagnosis-v0
base_commit: f1b6131
---

# 사고 진단 v0 결과: 깔끔한 풀이에서는 진단이 사람 판정과 대체로 일치

## 새로 확인된 것

- [D-0111](../decisions/D-0111-thought-diagnosis-v0-experiment.md) 실행. 가상 풀이 30개, sol·luna 각 3회(180요청, $1.04, 형식 오류 0).
- 라벨러 간(Claude·Codex 독립): 결과 유형 30/30(κ=1), 첫 실패 단계 29/30. 불일치 16건은 대부분 가이드의 모호한 규칙 2개에서 나왔다.
- 사용자 판정(2026-10-10): 규칙 ① 앞 단계가 틀려도 S5는 그 전제에서의 연결로 판정한다. 규칙 ② 필요한 근거를 맞게 말하면 S3·S4 PASS, 필요 없는 참인 사실만이면 둘 다 NOT_OBSERVED. I1 MAPPING, C1 CONDITION, C6 S3 NOT_OBSERVED. 정답지: `docs/experiments/thought-diagnosis-v0-2026-10-10/gold-labels.json`.
- 분류기(3회 다수결) 대 정답지
  - sol: 결과 유형 0.97(κ 0.95), 첫 실패 단계 0.93, 함정 태그 Jaccard 0.96, 오류 개수 1.00, 안정 28/30.
  - luna: 결과 유형 1.00, 첫 실패 단계 0.90, 함정 태그 0.81, 오류 개수 0.97, 안정 27/30.
- 두 모델 모두 S5 FAIL 정밀도가 0.36~0.42다. 앞 단계 오류를 S5 실패로도 세는데, 규칙 ①이 가이드 v0에 없었기 때문이다.
- sol이 틀린 사례(I3, S5, C1, C6)는 사람 라벨러끼리도 갈렸던 경계 사례다.

## 결정된 것

- 위 규칙 ①·② (사용자 판정).

## 미해결

- 가이드 v0.1(규칙 ①·② 반영)에서 S5 정밀도가 회복되는지는 미검증이다.
- 실제 학생 풀이(짧고 모호함)에서의 진단 성능은 미검증이다.
- 정답 라벨러가 LLM 둘이고, 사람은 불일치만 판정했다.

## 다음 행동

- 가이드 v0.1 반영 후 재실행할지, 실제 학생 풀이 확보로 갈지를 사용자와 정한다.

## 근거

- `docs/experiments/thought-diagnosis-v0-2026-10-10/RESULTS.json`, `REVIEW.md`, `DISAGREEMENTS.md`, `gold-labels.json`
