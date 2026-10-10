---
date: 2026-10-02
scope: problem-v3-based-v4-candidate-review
base_commit: uncommitted
---

# v3 기반 후보 초안 작성

- 사용자 선택과 범위는 D-0070에 기록했다. 실제 적용 전 초안 검토 단계다.
- `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md`를 새 파일로 작성했다. v3의 언어적 복원·명시적 오류 경계·충분성·질문 의미 보존을 유지하고, 극성/학생 결론 분리·UNKNOWN 우선·오류별 수정·서버 행동 결정·현행 출력 계약으로 연결했다.
- `docs/review/problem-v3-based-v4-candidate-review-2026-10-02.md`에 검토할 세 문구와 원본 v3 전체 구간의 보존/변경/이유 대조표를 남겼다. 정답 관련 기존 발화 되짚기는 v3 복원, 질문 정답/실제 수정 구분과 최초 타당 근거 누적은 명료화 제안으로 표시했다.
- 공손룡 문항 전용 통과 규칙이나 잘못된 최초 오류 판정을 취소하는 새 동작은 추가하지 않았다.

## 검증

- v3 원본 SHA-256 `3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff`, 현행 v4 `37fc8745860245c875cf838a878a32c9fad027113d44655a802462cb5bfbd76c` 유지 확인.
- 핵심 v3 문구 6개의 후보 내 보존을 문자열 대조로 확인했다. 전체 구간 대응표와 현재 입력/스키마/전이 코드를 정적으로 검토했다. 이는 모델 성능 검증이 아니다.
- 후보 SHA-256 `98d36119a84d612fbb0b1a20553a49df2170633e1a78470f632b0b24ee7ec2b2`.
- 평가기 코드가 후보를 읽도록 연결되지 않았음을 확인했다. 실제 v3/v4 프롬프트·실행 코드·세션은 미변경, 모델 호출0.

## 다음 단계

사용자 검토 후 후보 변경 또는 적용·평가 범위를 결정한다. Q-0030은 open이며 후보 작성만으로
실사용 과잉 교정이나 수정 오인 문제가 해결됐다고 기록하지 않는다.

근거: 위 산출물, `packages/pipeline/src/problem-solving/feedback-v4.ts`,
`packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`,
`memory/decisions/D-0070-v3-based-problem-prompt-draft-review.md`.
