---
id: D-0111
status: accepted
date: 2026-10-10
scope: thought-tracker-diagnosis-v0-experiment
supersedes: none
---

# 사고 진단 v0: 풀이 분류와 사람 판정의 일치 시험

## 결정

사용자 목표(2026-10-10): 선택 비율 예측이 아니라 학생이 **어느 유형의 함정에 걸렸는지, 어느 논리 단계에서
성공·실패했는지** 파악한다([JEV 결과 체크포인트](../checkpoints/2026-10-10-trap-map-jev-choice-results.md)).
이에 따라 AI 분류기의 풀이 진단이 사람 판정과 일치하는지 시험한다.

- 재료: 기존 가상 풀이 30개(`docs/experiments/v5-multi-item-luna-sol-2026-10-08/cases.json`).
- 정답 라벨: Claude와 Codex가 서로 보지 않고 [라벨 가이드](../../docs/experiments/thought-diagnosis-v0-2026-10-10/LABEL-GUIDE.md)로
  독립 라벨링하고, 불일치 항목만 사용자가 판정한다(사용자 선택).
- 분류기: `gpt-6.1-sol`, `gpt-6-luna`(medium) 각 3회, 180요청, 상한 sol 4달러·luna 0.5달러. 원문·정답·해설·그림·풀이의
  OpenAI 전송 승인(사용자 선택). 분류기는 `basis`와 라벨을 보지 않는다.
- 실행은 Codex([인계](../../docs/handoffs/2026-10-10-thought-diagnosis-v0.md)).

## 한계

- 가상 풀이는 실제 학생 풀이보다 깔끔하다. 통과해도 "깔끔한 풀이에서 진단 가능"까지만 확인된다.
- 정답 라벨러 둘은 LLM이고, 사람은 불일치만 판정한다. 라벨러 간 일치도를 함께 보고한다.
