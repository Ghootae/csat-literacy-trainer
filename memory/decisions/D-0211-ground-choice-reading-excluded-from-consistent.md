---
id: D-0211
status: accepted
date: 2026-11-08
scope: problem-feedback-conclusion
supersedes: none
---

# 서버 충족 검사에서 근거 인용 안의 선지 읽기(CHOICE_READING)는 원문 대조 요구에서 뺀다

## 결정

사용자 결정(2026-11-08): "서버 검사는 A로 하고".

- `readingJudgment`(`packages/pipeline/src/problem-solving/feedback-claims.ts`)의 정답 충족 조건 중 "근거 인용(ground)과 겹치는 학생 주장이 모두 CONSISTENT"를 다음으로 바꾼다.
  - 겹치는 주장 중 CHOICE_READING이 아닌 주장(사실 주장)이 1개 이상 있어야 한다.
  - 그 사실 주장은 모두 CONSISTENT여야 한다.
- 다른 조건(ground.kind=FACT, 선지 주장 relation, judgment.holds)과 D-0189(서버는 INSUFFICIENT를 올리지 않음)는 그대로다.
- [D-0182](./D-0182-problem-feedback-v53-three-cell-adopted.md)의 서버 세 칸 확정 규칙 중 이 조건 하나만 바꾼다.

## 근거

- [실험 보고](../../docs/experiments/judge-model-explanation-2026-11-08/REPORT-human.md):
  - 판정기 SUPPORTED → 서버 INSUFFICIENT가 14칸이다.
  - 원인은 지시문 164–167행(근거 인용을 결론 단계까지 잡음)과 330행 끝(선지 해석은 CHOICE_READING), 옛 294행 조건이 겹친 것이다.
  - 그래서 선지 사례를 해석해 잇는 정답 근거(경마 6)가 구조상 통과할 수 없었다.
- 저장 응답 재생(`scripts/replay-judge-model-explanation-server-a.mjs`, `replay-server-a.json`, 외부 호출 없음):
  - 183칸 중 9칸이 부족 → 충분으로 바뀌었다. 모두 판정기 자신이 SUPPORTED였던 칸이다.
  - 반대 방향 변화와 C 반례 변화는 0이다.
- 단위 시험 3개 추가(`feedback.test.ts` "relation by stem polarity"): 선지 읽기 동반 통과, 선지 읽기만 있으면 부족, 사실 주장이 UNDETERMINED면 부족.

## 다시 볼 조건

- 결론을 되풀이하거나 선지만 다시 말한 근거가 이 변경으로 SUPPORTED가 되는 사례가 나오면 다시 본다.
- 근거 인용 범위를 판정기가 선지 해석 부분에만 잡아 사실 주장이 빠지는 경우가 반복되면, 인용 밖 사실 주장을 인정할지 다시 본다. 이번 경마 6 luna 2칸이 이 경우다.
