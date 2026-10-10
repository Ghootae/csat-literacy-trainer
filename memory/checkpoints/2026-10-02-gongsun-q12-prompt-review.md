---
date: 2026-10-02
scope: problem-feedback-v4-prompt-diagnosis
base_commit: uncommitted
---

# 공손룡12 오판과 프롬프트 문구 대조

사용자는 일반적 원인 설명 대신 실제 프롬프트의 어느 부분이 문제일 수 있는지 요청했다. 향후 해석에 따라 답변·작업 방향이 달라지는 불명확한 요청은 먼저 확인하라고 지시했다.

## 확인한 구현

- `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md` SELECTION 5는 사실/관계 오류를 ERROR 및 errors에 모두 기록하고 부족/타당을 구별한다. 오류 성립에 필요한 학생 주장과 원문의 구체적 모순, 문맥에 맞는 바꿔 말하기와 표현 차이의 구별은 명시하지 않는다.
- 같은 파일의 증거·질문·코칭은 해당 오류를 직접 묻도록 요구한다. REPAIR 2는 실제 수정과 정확한 인용을 요구하며 단순 동의를 배제한다. 따라서 이번 실패를 ‘직접 교정/실제 수정 지시가 전혀 없음’으로 설명하면 부정확하다.
- REPAIR 2의 ‘초기 발화나 교사의 설명은 실제 수정 증거가 아니다’는 수정 증거에 관한 규칙이다. REPAIR 5의 rationaleSufficient에는 원래 타당했던 최초 근거와 수정 내용을 합쳐 평가한다는 지시가 별도로 명시되지 않았다. 누적 평가 자체는 REPAIR 0/2에 지시돼 있다.
- `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts` feedbackEvaluationInput은 REPAIR에 전체 observations를 전달한다. 최초 답변이 입력에서 빠진 것은 아니다. 최초 SELECTION의 reconstructedPath는 별도 전달하지 않고 initialErrors/additionalErrors/previousRepair를 전달한다.

## 원인 후보 — 미검증 가설

1. ‘오류를 모두 기록’하라는 요구에 비해 ERROR 확정 기준이 덜 구체적이어서, 표현 차이를 의미 오류로 올렸을 가능성. 우선 후보는 학생의 실제 주장과 원문이 어떻게 충돌하는지 확인하고, 문맥상 성립하는 바꿔 말하기를 단순 표현 차이로 오류 처리하지 않도록 하는 문구다.
2. ‘해당 오류를 직접’과 ‘실제 수정’만으로는 질문에 대한 정답과 대상 오류의 수정이 분리되지 않을 가능성. 질문이 바로 그 오류의 수정을 드러내는지, 답변이 그 주장을 실제로 고쳤는지를 연결하는 문구를 검토한다. 짧은 답 자체를 금지하는 제안은 아니다.
3. 초기 발화를 수정 증거로 쓰지 말라는 규칙이 전체 충분성에도 과도 적용됐을 가능성. 원래 타당했던 내용은 전체 근거 평가에 포함하되 교정 후 철회·대체된 내용은 갱신하도록 명확화할 수 있다.

근거: 위 프롬프트·입력 코드, `.omc/logs/problem-feedback-v4/events.jsonl` 5/7행 및 `memory/checkpoints/2026-10-02-gongsun-q12-v4-user-review.md`. 한 번의 출력과 문구 대조에 따른 가설이며 인과관계·수정 효과는 대조 시험으로 확인하지 않았다. 정책·제품 프롬프트·코드 변경과 추가 모델 호출은 없다. Q-0030은 계속 open이다.
